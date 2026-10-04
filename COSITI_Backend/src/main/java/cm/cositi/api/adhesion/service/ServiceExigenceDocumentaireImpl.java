package cm.cositi.api.adhesion.service;

import cm.cositi.api.adherent.entite.Adherent;
import cm.cositi.api.adherent.repository.AdherentRepository;
import cm.cositi.api.adhesion.dto.ChecklistDocumentaireDto;
import cm.cositi.api.adhesion.dto.ExigenceDocumentaireDto;
import cm.cositi.api.adhesion.dto.ModificationExigenceDto;
import cm.cositi.api.adhesion.entite.ControleDga;
import cm.cositi.api.adhesion.entite.ControleDgaChamp;
import cm.cositi.api.adhesion.entite.ControleDgaDocument;
import cm.cositi.api.adhesion.entite.ExigenceDocumentaire;
import cm.cositi.api.adhesion.entite.NiveauExigence;
import cm.cositi.api.adhesion.entite.StatutCorrespondance;
import cm.cositi.api.adhesion.entite.StatutPiece;
import cm.cositi.api.adhesion.repository.ControleDgaChampRepository;
import cm.cositi.api.adhesion.repository.ControleDgaDocumentRepository;
import cm.cositi.api.adhesion.repository.ControleDgaRepository;
import cm.cositi.api.adhesion.repository.ExigenceDocumentaireRepository;
import cm.cositi.api.audit.ContexteAudit;
import cm.cositi.api.audit.ServiceAudit;
import cm.cositi.api.audit.TypeOperation;
import cm.cositi.api.commun.exception.ExceptionConflit;
import cm.cositi.api.commun.exception.ExceptionRessourceIntrouvable;
import cm.cositi.api.commun.exception.ExceptionValidation;
import cm.cositi.api.document.entite.Document;
import cm.cositi.api.document.entite.StatutDocument;
import cm.cositi.api.document.repository.DocumentRepository;
import cm.cositi.api.securite.entite.Utilisateur;
import cm.cositi.api.securite.service.ServicePerimetreDonnees;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.LinkedHashMap;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.Set;
import java.util.UUID;
import java.util.stream.Collectors;

@Service
public class ServiceExigenceDocumentaireImpl implements ServiceExigenceDocumentaire {

    private final ExigenceDocumentaireRepository exigenceRepository;
    private final AdherentRepository adherentRepository;
    private final DocumentRepository documentRepository;
    private final ControleDgaRepository controleRepository;
    private final ControleDgaDocumentRepository documentControleRepository;
    private final ControleDgaChampRepository champRepository;
    private final ServicePerimetreDonnees perimetre;
    private final ServiceAudit serviceAudit;

    public ServiceExigenceDocumentaireImpl(ExigenceDocumentaireRepository exigenceRepository,
                                           AdherentRepository adherentRepository, DocumentRepository documentRepository,
                                           ControleDgaRepository controleRepository,
                                           ControleDgaDocumentRepository documentControleRepository,
                                           ControleDgaChampRepository champRepository,
                                           ServicePerimetreDonnees perimetre, ServiceAudit serviceAudit) {
        this.exigenceRepository = exigenceRepository;
        this.adherentRepository = adherentRepository;
        this.documentRepository = documentRepository;
        this.controleRepository = controleRepository;
        this.documentControleRepository = documentControleRepository;
        this.champRepository = champRepository;
        this.perimetre = perimetre;
        this.serviceAudit = serviceAudit;
    }

    // ------------------------------------------------------------------------------------------ Matrice

    @Override
    @PreAuthorize("isAuthenticated()")
    public List<ExigenceDocumentaireDto> lister(boolean seulementEnVigueur) {
        LocalDate aujourdhui = LocalDate.now();
        return exigenceRepository.findAllByOrderByOrdreAscCodeAsc().stream()
                .filter(e -> !seulementEnVigueur || e.estEnVigueur(aujourdhui))
                .map(ExigenceDocumentaireDto::depuis).toList();
    }

    @Override
    public List<ExigenceDocumentaire> enVigueur(LocalDate date) {
        return exigenceRepository.findAllByOrderByOrdreAscCodeAsc().stream().filter(e -> e.estEnVigueur(date)).toList();
    }

    @Override
    public Set<String> typesPiecesObligatoires() {
        return enVigueur(LocalDate.now()).stream()
                .filter(e -> e.estPiece() && e.getNiveau() == NiveauExigence.OBLIGATOIRE)
                .map(ExigenceDocumentaire::getTypeDocument)
                .collect(Collectors.toCollection(LinkedHashSet::new));
    }

    @Override
    public boolean piecesObligatoiresConfirmees() {
        return enVigueur(LocalDate.now()).stream()
                .filter(e -> e.estPiece() && e.getNiveau() == NiveauExigence.OBLIGATOIRE)
                .allMatch(ExigenceDocumentaire::estConfirmee);
    }

    @Override
    public Set<String> champsJustifies() {
        return enVigueur(LocalDate.now()).stream()
                .filter(e -> !e.estPiece() && e.isVerificationDga() && e.getNiveau() != NiveauExigence.NON_APPLICABLE)
                .map(ExigenceDocumentaire::getChamp)
                .collect(Collectors.toCollection(LinkedHashSet::new));
    }

    // ------------------------------------------------------------------------------------------ Checklist

    @Override
    @PreAuthorize("hasAuthority('ADHERENT:LIRE')")
    public ChecklistDocumentaireDto checklist(UUID adherentId, Utilisateur demandeur) {
        perimetre.verifierAccesAdherent(demandeur, adherentId);
        Adherent adherent = adherentRepository.findById(adherentId).orElseThrow(() ->
                new ExceptionRessourceIntrouvable("ADHERENT_INTROUVABLE", "Adhérent introuvable."));
        LocalDate aujourdhui = LocalDate.now();
        List<ExigenceDocumentaire> exigences = enVigueur(aujourdhui);

        // Version active de chaque type de pièce (la plus récente non archivée, non remplacée, non rejetée).
        Map<String, Document> actifs = new LinkedHashMap<>();
        Map<String, Document> rejetes = new LinkedHashMap<>();
        for (Document d : documentRepository.findByAdherentIdAndArchiveFalseOrderByCreeLeDesc(adherentId)) {
            if (d.estVersionActive()) {
                actifs.putIfAbsent(d.getTypeDocument().name(), d);
            } else if (d.getStatut() == StatutDocument.REJETE) {
                rejetes.putIfAbsent(d.getTypeDocument().name(), d);
            }
        }

        // Dernier contrôle DGA : résultats par type de pièce et par information.
        Optional<ControleDga> controle = controleRepository.findFirstByAdherentIdOrderByTourDesc(adherentId);
        Map<String, ControleDgaDocument> docsControle = new LinkedHashMap<>();
        Map<String, ControleDgaChamp> champsControle = new LinkedHashMap<>();
        controle.ifPresent(c -> {
            for (ControleDgaDocument d : documentControleRepository.findByControleIdOrderByTypeDocument(c.getId())) {
                docsControle.put(d.getTypeDocument(), d);
            }
            Map<UUID, String> typeParDoc = docsControle.values().stream()
                    .collect(Collectors.toMap(ControleDgaDocument::getId, ControleDgaDocument::getTypeDocument));
            for (ControleDgaChamp ch : champRepository.findByControleId(c.getId())) {
                champsControle.put(typeParDoc.get(ch.getControleDocumentId()) + "|" + ch.getChamp(), ch);
            }
        });
        boolean controleOuvert = controle.map(c -> c.getStatut().estOuvert()).orElse(false);

        List<ChecklistDocumentaireDto.Piece> pieces = new ArrayList<>();
        for (ExigenceDocumentaire piece : exigences.stream().filter(ExigenceDocumentaire::estPiece)
                .sorted(Comparator.comparingInt(ExigenceDocumentaire::getOrdre)).toList()) {
            String type = piece.getTypeDocument();
            Document document = actifs.get(type);
            ControleDgaDocument docControle = docsControle.get(type);
            boolean controleSurCetteVersion = docControle != null && document != null
                    && document.getId().equals(docControle.getDocumentId());

            List<ChecklistDocumentaireDto.Champ> champs = exigences.stream()
                    .filter(e -> !e.estPiece() && e.getTypeDocument().equals(type))
                    .map(e -> {
                        ControleDgaChamp resultat = controleSurCetteVersion ? champsControle.get(type + "|" + e.getChamp()) : null;
                        return new ChecklistDocumentaireDto.Champ(e.getId(), e.getChamp(), e.getLibelle(),
                                ServiceControleDgaImpl.valeurNumerique(adherent, e.getChamp()),
                                resultat == null ? null : resultat.getStatutCorrespondance(),
                                resultat == null ? null : resultat.getCommentaire());
                    }).toList();

            StatutPiece statut = statutPiece(piece, document, rejetes.get(type), controleOuvert, controleSurCetteVersion,
                    champsControle, type, aujourdhui);
            pieces.add(new ChecklistDocumentaireDto.Piece(piece.getId(), piece.getCode(), piece.getRubrique(), type,
                    piece.getLibelle(), piece.getNiveau(), piece.getStatutValidation(), piece.estBloquante(),
                    piece.isVerificationDga(), piece.getConditionApplication(), statut,
                    document == null ? null : document.getId(), document == null ? null : document.getVersionDocument(),
                    document == null ? null : document.getValideJusquau(), champs));
        }

        int bloquantesManquantes = (int) pieces.stream().filter(p -> p.bloquante() && !estSatisfaisante(p.statut())).count();
        ChecklistDocumentaireDto.Compteurs compteurs = new ChecklistDocumentaireDto.Compteurs(pieces.size(),
                (int) pieces.stream().filter(p -> p.niveau() == NiveauExigence.OBLIGATOIRE).count(),
                (int) pieces.stream().filter(p -> p.documentId() != null).count(),
                (int) pieces.stream().filter(p -> p.statut() == StatutPiece.VALIDE).count(),
                (int) pieces.stream().filter(p -> p.statut() == StatutPiece.NON_CONFORME
                        || p.statut() == StatutPiece.ILLISIBLE || p.statut() == StatutPiece.EXPIRE).count(),
                bloquantesManquantes);

        List<String> avertissements = new ArrayList<>();
        long nonConfirmees = exigences.stream().filter(e -> !e.estConfirmee()).count();
        if (nonConfirmees > 0) {
            avertissements.add(nonConfirmees + " exigence(s) documentaire(s) ne sont pas encore confirmées par la COSITI : "
                    + "elles sont affichées et contrôlées, mais aucune pièce non confirmée ne bloque l'activation (§17).");
        }
        return new ChecklistDocumentaireDto(adherentId, adherent.getMatricule(), pieces, compteurs,
                bloquantesManquantes == 0, avertissements);
    }

    /** Statut d'une pièce (§20), du plus défavorable au plus favorable. */
    private static StatutPiece statutPiece(ExigenceDocumentaire piece, Document document, Document rejete,
                                           boolean controleOuvert, boolean controleSurCetteVersion,
                                           Map<String, ControleDgaChamp> champsControle, String type, LocalDate date) {
        if (piece.getNiveau() == NiveauExigence.NON_APPLICABLE) {
            return StatutPiece.NON_APPLICABLE;
        }
        if (document == null) {
            if (rejete != null) {
                return StatutPiece.NON_CONFORME;
            }
            return piece.getNiveau() == NiveauExigence.OBLIGATOIRE ? StatutPiece.REQUIS : StatutPiece.NON_FOURNI;
        }
        if (document.estExpire(date)) {
            return StatutPiece.EXPIRE;
        }
        if (controleSurCetteVersion) {
            if (controleOuvert) {
                return StatutPiece.EN_VERIFICATION;
            }
            List<StatutCorrespondance> resultats = champsControle.entrySet().stream()
                    .filter(e -> e.getKey().startsWith(type + "|"))
                    .map(e -> e.getValue().getStatutCorrespondance()).filter(java.util.Objects::nonNull).toList();
            if (resultats.contains(StatutCorrespondance.NON_LISIBLE)) {
                return StatutPiece.ILLISIBLE;
            }
            if (resultats.contains(StatutCorrespondance.NON_CORRESPOND) || resultats.contains(StatutCorrespondance.DOCUMENT_MANQUANT)) {
                return StatutPiece.NON_CONFORME;
            }
        }
        return document.getStatut() == StatutDocument.VERIFIE ? StatutPiece.VALIDE : StatutPiece.FOURNI;
    }

    /** Une pièce bloquante est satisfaite lorsqu'elle est fournie et ni non conforme, ni illisible, ni expirée. */
    static boolean estSatisfaisante(StatutPiece statut) {
        return statut == StatutPiece.FOURNI || statut == StatutPiece.EN_VERIFICATION || statut == StatutPiece.VALIDE
                || statut == StatutPiece.NON_APPLICABLE;
    }

    // ------------------------------------------------------------------------------------------ Décisions COSITI

    @Override
    @PreAuthorize("hasAuthority('REGLE:VALIDER')")
    @Transactional
    public ExigenceDocumentaireDto modifier(UUID exigenceId, ModificationExigenceDto dto, Utilisateur auteur) {
        ExigenceDocumentaire exigence = charger(exigenceId);
        if (dto.version() != null && !dto.version().equals(exigence.getVersion())) {
            throw new ExceptionConflit("EXIGENCE_VERSION_OBSOLETE", "Cette exigence a été modifiée entre-temps. Rechargez-la.");
        }
        if (dto.effectifDu() != null && dto.effectifJusquau() != null && dto.effectifJusquau().isBefore(dto.effectifDu())) {
            throw new ExceptionValidation("EXIGENCE_PERIODE_INVALIDE", "La fin d'effet doit suivre le début.", "effectifJusquau");
        }
        ExigenceDocumentaireDto avant = ExigenceDocumentaireDto.depuis(exigence);
        exigence.modifier(dto.niveau(), texte(dto.conditionApplication()), dto.verificationDga(), dto.actif(),
                dto.effectifDu(), dto.effectifJusquau());
        exigence = exigenceRepository.saveAndFlush(exigence);
        ExigenceDocumentaireDto apres = ExigenceDocumentaireDto.depuis(exigence);
        serviceAudit.tracer(TypeOperation.EXIGENCE_DOCUMENTAIRE_MODIFICATION, "exigence_documentaire", exigence.getId(),
                avant, ContexteAudit.avec(auteur, Map.of("exigence", apres)), dto.motif().trim());
        return apres;
    }

    @Override
    @PreAuthorize("hasAuthority('REGLE:VALIDER')")
    @Transactional
    public ExigenceDocumentaireDto confirmer(UUID exigenceId, String motif, Utilisateur auteur) {
        if (motif == null || motif.isBlank()) {
            throw new ExceptionValidation("REGLE_MOTIF_REQUIS", "Le motif (référence de la décision COSITI) est obligatoire.", "motif");
        }
        ExigenceDocumentaire exigence = charger(exigenceId);
        if (exigence.estConfirmee()) {
            return ExigenceDocumentaireDto.depuis(exigence);
        }
        String avant = exigence.getStatutValidation();
        exigence.confirmer();
        exigence = exigenceRepository.saveAndFlush(exigence);
        serviceAudit.tracer(TypeOperation.REGLE_VALIDATION, "exigence_documentaire", exigence.getId(),
                Map.of("statutValidation", avant), ContexteAudit.avec(auteur,
                        Map.of("code", exigence.getCode(), "statutValidation", "C", "niveau", exigence.getNiveau())),
                motif.trim());
        return ExigenceDocumentaireDto.depuis(exigence);
    }

    private ExigenceDocumentaire charger(UUID id) {
        return exigenceRepository.findById(id).orElseThrow(() ->
                new ExceptionRessourceIntrouvable("EXIGENCE_INTROUVABLE", "Exigence documentaire introuvable."));
    }

    private static String texte(String valeur) {
        return valeur == null || valeur.isBlank() ? null : valeur.trim();
    }
}
