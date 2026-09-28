package cm.cositi.api.cnps.service;

import cm.cositi.api.audit.ServiceAudit;
import cm.cositi.api.audit.TypeOperation;
import cm.cositi.api.cnps.dto.AdherentEligibleCnpsDto;
import cm.cositi.api.cnps.dto.DossierCnpsDto;
import cm.cositi.api.cnps.dto.PieceDossierCnpsDto;
import cm.cositi.api.cnps.dto.PieceManquanteDto;
import cm.cositi.api.cnps.dto.SituationImmatriculationCnpsDto;
import cm.cositi.api.cnps.entite.DossierCnps;
import cm.cositi.api.cnps.entite.HistoriqueDossierCnps;
import cm.cositi.api.cnps.entite.PieceDossierCnps;
import cm.cositi.api.cnps.entite.StatutDossierCnps;
import cm.cositi.api.cnps.entite.StatutPieceCnps;
import cm.cositi.api.cnps.entite.TypePieceCnps;
import cm.cositi.api.cnps.repository.DossierCnpsRepository;
import cm.cositi.api.cnps.repository.HistoriqueDossierCnpsRepository;
import cm.cositi.api.cnps.repository.PieceDossierCnpsRepository;
import cm.cositi.api.commun.exception.ExceptionConflit;
import cm.cositi.api.commun.exception.ExceptionRessourceIntrouvable;
import cm.cositi.api.commun.exception.ExceptionValidation;
import cm.cositi.api.commun.reponse.ReponsePaginee;
import cm.cositi.api.parametre.ServiceParametre;
import cm.cositi.api.securite.entite.Utilisateur;
import cm.cositi.api.securite.service.ServicePerimetreDonnees;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.Pageable;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.util.ArrayList;
import java.util.Arrays;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Set;
import java.util.UUID;

/**
 * Dossiers CNPS (jalon J7).
 *
 * <p>Deux règles non négociables, héritées du pack technique :</p>
 * <ul>
 *   <li><b>L'éligibilité se calcule sur le seuil du pack de l'adhérent</b> ({@code pack.seuil_eligibilite_cnps},
 *       10 500 ou 15 000 FCFA), jamais sur un seuil global — même principe qu'au jalon J6.</li>
 *   <li><b>Aucune assiette n'est inventée</b> : la composition du dossier vient du paramètre
 *       {@code PIECES_CNPS_OBLIGATOIRES} ({@code [V]}), et son caractère non validé est remonté en
 *       avertissement à chaque lecture plutôt que masqué.</li>
 * </ul>
 *
 * <p>Les lectures de l'adhérent et de ses cotisations passent par {@code JdbcTemplate} plutôt que par les
 * services des paquets {@code adherent}/{@code droits} : c'est le choix déjà retenu au jalon J6
 * ({@code ServiceCalculDroitsImpl}) pour éviter un cycle de paquetages, le module CNPS étant consommé par le
 * reporting qui consomme déjà ces deux-là.</p>
 */
@Service
public class ServiceDossierCnpsImpl implements ServiceDossierCnps {

    private static final Logger JOURNAL = LoggerFactory.getLogger(ServiceDossierCnpsImpl.class);

    static final String CLE_PIECES_OBLIGATOIRES = "PIECES_CNPS_OBLIGATOIRES";

    private final DossierCnpsRepository dossierRepository;
    private final PieceDossierCnpsRepository pieceRepository;
    private final HistoriqueDossierCnpsRepository historiqueRepository;
    private final ServicePerimetreDonnees perimetre;
    private final ServiceParametre serviceParametre;
    private final ServiceAudit serviceAudit;
    private final JdbcTemplate jdbcTemplate;

    public ServiceDossierCnpsImpl(DossierCnpsRepository dossierRepository, PieceDossierCnpsRepository pieceRepository,
                                   HistoriqueDossierCnpsRepository historiqueRepository,
                                   ServicePerimetreDonnees perimetre, ServiceParametre serviceParametre,
                                   ServiceAudit serviceAudit, JdbcTemplate jdbcTemplate) {
        this.dossierRepository = dossierRepository;
        this.pieceRepository = pieceRepository;
        this.historiqueRepository = historiqueRepository;
        this.perimetre = perimetre;
        this.serviceParametre = serviceParametre;
        this.serviceAudit = serviceAudit;
        this.jdbcTemplate = jdbcTemplate;
    }

    @Override
    @PreAuthorize("hasAuthority('CNPS:GERER')")
    @Transactional
    public DossierCnpsDto ouvrir(UUID adherentId, Utilisateur auteur) {
        perimetre.verifierAccesAdherent(auteur, adherentId);

        if (dossierRepository.existsByAdherentId(adherentId)) {
            throw new ExceptionConflit("CNPS_DOSSIER_EXISTANT",
                    "Un dossier CNPS existe déjà pour cet adhérent.");
        }

        DossierCnps dossier = dossierRepository.save(new DossierCnps(adherentId));

        // Les pièces attendues sont créées à l'ouverture : le dossier affiche dès le départ ce qu'il reste à
        // fournir, plutôt que de laisser l'utilisateur deviner la liste.
        for (TypePieceCnps type : piecesObligatoires()) {
            pieceRepository.save(new PieceDossierCnps(dossier.getId(), type, true, auteur.getIdentifiant()));
        }

        historiqueRepository.save(new HistoriqueDossierCnps(dossier.getId(), null, StatutDossierCnps.BROUILLON,
                auteur.getId(), "Ouverture du dossier"));
        serviceAudit.tracer(TypeOperation.CNPS_DOSSIER_CREATION, "dossier_cnps", dossier.getId(), null,
                dossier.getId(), "Ouverture pour l'adhérent " + adherentId);

        return construireDto(dossier);
    }

    @Override
    @PreAuthorize("hasAuthority('CNPS:LIRE')")
    public DossierCnpsDto consulter(UUID dossierId, Utilisateur demandeur) {
        DossierCnps dossier = charger(dossierId);
        perimetre.verifierAccesAdherent(demandeur, dossier.getAdherentId());
        return construireDto(dossier);
    }

    @Override
    @PreAuthorize("hasAuthority('CNPS:LIRE')")
    public DossierCnpsDto consulterParAdherent(UUID adherentId, Utilisateur demandeur) {
        perimetre.verifierAccesAdherent(demandeur, adherentId);
        DossierCnps dossier = dossierRepository.findByAdherentId(adherentId)
                .orElseThrow(() -> new ExceptionRessourceIntrouvable("CNPS_DOSSIER_INTROUVABLE",
                        "Aucun dossier CNPS n'est ouvert pour cet adhérent."));
        return construireDto(dossier);
    }

    @Override
    @PreAuthorize("hasAuthority('CNPS:LIRE')")
    public ReponsePaginee<DossierCnpsDto> lister(StatutDossierCnps statut, Pageable pageable, Utilisateur demandeur) {
        Page<DossierCnps> page = statut == null
                ? dossierRepository.findAll(pageable)
                : dossierRepository.findByStatut(statut, pageable);

        // Filtrage par périmètre après lecture : le dossier n'a pas de zone propre, son périmètre est celui de
        // l'adhérent. Acceptable au volume V1 (172 adhérents) ; à repasser en jointure SQL si le référentiel
        // grossit — noté plutôt que sur-conçu aujourd'hui.
        List<DossierCnpsDto> visibles = page.getContent().stream()
                .filter(d -> perimetre.peutAccederAdherent(demandeur, d.getAdherentId()))
                .map(this::construireDto)
                .toList();

        return ReponsePaginee.depuis(new PageImpl<>(visibles, pageable, page.getTotalElements()),
                avertissementsRegles());
    }

    @Override
    @PreAuthorize("hasAuthority('CNPS:GERER')")
    @Transactional
    public DossierCnpsDto ajouterPiece(UUID dossierId, UUID documentId, TypePieceCnps typePiece, Utilisateur auteur) {
        if (documentId == null || typePiece == null) {
            throw new ExceptionValidation("CNPS_PIECE_INVALIDE",
                    "Le document et le type de pièce sont obligatoires.");
        }
        DossierCnps dossier = charger(dossierId);
        perimetre.verifierAccesAdherent(auteur, dossier.getAdherentId());

        if (dossier.getStatut().estFige()) {
            throw new ExceptionConflit("CNPS_DOSSIER_FIGE",
                    "Le dossier est " + dossier.getStatut() + " : ses pièces ne peuvent plus être modifiées.");
        }

        PieceDossierCnps piece = pieceRepository.findByDossierIdAndTypePiece(dossierId, typePiece)
                // Une pièce hors liste obligatoire reste recevable : la CNPS peut réclamer un justificatif
                // supplémentaire. Elle est alors créée à la volée, non obligatoire.
                .orElseGet(() -> pieceRepository.save(
                        new PieceDossierCnps(dossierId, typePiece, false, auteur.getIdentifiant())));

        piece.rattacher(documentId);
        pieceRepository.save(piece);

        serviceAudit.tracer(TypeOperation.CNPS_PIECE_AJOUT, "piece_dossier_cnps", piece.getId(), null,
                documentId, "Pièce " + typePiece + " du dossier " + dossierId);

        return construireDto(dossier);
    }

    @Override
    @PreAuthorize("hasAuthority('CNPS:CHANGER_STATUT')")
    @Transactional
    public DossierCnpsDto changerStatut(UUID dossierId, StatutDossierCnps nouveau, String commentaire,
                                         Utilisateur auteur) {
        if (nouveau == null) {
            throw new ExceptionValidation("CNPS_STATUT_REQUIS", "Le statut cible est obligatoire.", "statut");
        }
        DossierCnps dossier = charger(dossierId);
        perimetre.verifierAccesAdherent(auteur, dossier.getAdherentId());

        StatutDossierCnps actuel = dossier.getStatut();
        if (actuel == nouveau) {
            return construireDto(dossier);
        }
        if (!actuel.peutAllerVers(nouveau)) {
            throw new ExceptionConflit("CNPS_TRANSITION_INTERDITE",
                    "Transition " + actuel + " vers " + nouveau + " interdite. Transitions possibles depuis "
                            + actuel + " : " + actuel.transitionsAutorisees());
        }
        if (nouveau == StatutDossierCnps.PRET && !piecesManquantesInterne(dossierId).isEmpty()) {
            throw new ExceptionConflit("CNPS_PIECES_MANQUANTES",
                    "Le dossier ne peut pas passer à PRET : des pièces obligatoires manquent encore.");
        }
        if (nouveau == StatutDossierCnps.REJETE && (commentaire == null || commentaire.isBlank())) {
            throw new ExceptionValidation("CNPS_MOTIF_REQUIS",
                    "Le motif de rejet est obligatoire.", "commentaire");
        }

        dossier.setStatut(nouveau);
        if (nouveau == StatutDossierCnps.REJETE) {
            dossier.setMotifRejet(commentaire);
        }
        dossier = dossierRepository.save(dossier);

        historiqueRepository.save(new HistoriqueDossierCnps(dossierId, actuel, nouveau, auteur.getId(), commentaire));
        serviceAudit.tracer(TypeOperation.CNPS_CHANGEMENT_STATUT, "dossier_cnps", dossierId, actuel, nouveau,
                commentaire);

        return construireDto(dossier);
    }

    @Override
    @PreAuthorize("hasAuthority('CNPS:LIRE')")
    public List<PieceManquanteDto> piecesManquantes(UUID dossierId, Utilisateur demandeur) {
        DossierCnps dossier = charger(dossierId);
        perimetre.verifierAccesAdherent(demandeur, dossier.getAdherentId());
        return piecesManquantesInterne(dossierId);
    }

    @Override
    @PreAuthorize("hasAuthority('CNPS:LIRE')")
    public List<AdherentEligibleCnpsDto> eligiblesNonImmatricules(UUID zoneId, Utilisateur demandeur) {
        // Éligibilité = cumul imputé (periode_droits non annulées) >= seuil du pack DE L'ADHÉRENT.
        // « Non immatriculé » = ni numéro CNPS sur la fiche, ni numéro d'immatriculation sur un dossier.
        String sql = """
                SELECT a.id, a.matricule, a.nom, a.prenoms, p.code AS pack_code,
                       COALESCE(SUM(pd.montant_impute), 0) AS cumul,
                       p.seuil_eligibilite_cnps AS seuil,
                       (d.id IS NOT NULL) AS dossier_ouvert
                FROM adherent a
                JOIN adhesion adh ON adh.adherent_id = a.id AND adh.date_fin IS NULL
                JOIN pack p ON p.id = adh.pack_id
                LEFT JOIN periode_droits pd ON pd.adherent_id = a.id AND pd.statut <> 'ANNULEE'
                LEFT JOIN dossier_cnps d ON d.adherent_id = a.id
                WHERE a.archive = false
                  AND a.numero_cnps IS NULL
                  AND (d.numero_immatriculation IS NULL)
                  AND (CAST(? AS uuid) IS NULL OR a.zone_id = CAST(? AS uuid))
                GROUP BY a.id, a.matricule, a.nom, a.prenoms, p.code, p.seuil_eligibilite_cnps, d.id
                HAVING COALESCE(SUM(pd.montant_impute), 0) >= p.seuil_eligibilite_cnps
                ORDER BY a.nom, a.prenoms
                """;

        String zone = zoneId == null ? null : zoneId.toString();
        List<AdherentEligibleCnpsDto> resultats = jdbcTemplate.query(sql, (rs, ligne) -> new AdherentEligibleCnpsDto(
                UUID.fromString(rs.getString("id")),
                rs.getString("matricule"),
                nomComplet(rs.getString("nom"), rs.getString("prenoms")),
                rs.getString("pack_code"),
                rs.getBigDecimal("cumul"),
                rs.getBigDecimal("seuil"),
                rs.getBoolean("dossier_ouvert")), zone, zone);

        return resultats.stream()
                .filter(dto -> perimetre.peutAccederAdherent(demandeur, dto.adherentId()))
                .toList();
    }

    @Override
    @PreAuthorize("hasAuthority('CNPS:LIRE')")
    public List<SituationImmatriculationCnpsDto> situationsImmatriculation(UUID zoneId, Utilisateur demandeur) {
        // Même calcul que eligiblesNonImmatricules (cumul imputé vs seuil du pack DE L'ADHÉRENT), mais sans
        // le filtre d'exclusion des adhérents déjà immatriculés — l'écran Immatriculations a besoin des deux
        // populations (3 onglets, FONCTIONALITE_GestComtes_V1.md §7-§13). « Déjà immatriculé » = numéro CNPS
        // sur la fiche adhérent OU sur un dossier d'immatriculation, comme dans eligiblesNonImmatricules.
        String sql = """
                SELECT a.id, a.matricule, a.nom, a.prenoms, act.libelle AS profession, a.telephone_principal,
                       p.code AS pack_code, COALESCE(SUM(pd.montant_impute), 0) AS cumul,
                       p.seuil_eligibilite_cnps AS seuil,
                       COALESCE(a.numero_cnps, d.numero_immatriculation) AS numero_cnps,
                       d.date_immatriculation,
                       (d.id IS NOT NULL) AS dossier_ouvert
                FROM adherent a
                JOIN adhesion adh ON adh.adherent_id = a.id AND adh.date_fin IS NULL
                JOIN pack p ON p.id = adh.pack_id
                JOIN activite act ON act.id = a.activite_id
                LEFT JOIN periode_droits pd ON pd.adherent_id = a.id AND pd.statut <> 'ANNULEE'
                LEFT JOIN dossier_cnps d ON d.adherent_id = a.id
                WHERE a.archive = false
                  AND (CAST(? AS uuid) IS NULL OR a.zone_id = CAST(? AS uuid))
                GROUP BY a.id, a.matricule, a.nom, a.prenoms, act.libelle, a.telephone_principal, p.code,
                         p.seuil_eligibilite_cnps, a.numero_cnps, d.numero_immatriculation, d.date_immatriculation, d.id
                HAVING COALESCE(SUM(pd.montant_impute), 0) >= p.seuil_eligibilite_cnps
                ORDER BY a.nom, a.prenoms
                """;

        String zone = zoneId == null ? null : zoneId.toString();
        List<SituationImmatriculationCnpsDto> resultats = jdbcTemplate.query(sql,
                (rs, ligne) -> new SituationImmatriculationCnpsDto(
                        UUID.fromString(rs.getString("id")),
                        rs.getString("matricule"),
                        nomComplet(rs.getString("nom"), rs.getString("prenoms")),
                        rs.getString("profession"),
                        rs.getString("telephone_principal"),
                        rs.getBigDecimal("cumul"),
                        rs.getBigDecimal("seuil"),
                        rs.getString("numero_cnps"),
                        rs.getObject("date_immatriculation", java.time.LocalDate.class),
                        rs.getBoolean("dossier_ouvert")),
                zone, zone);

        return resultats.stream()
                .filter(dto -> perimetre.peutAccederAdherent(demandeur, dto.adherentId()))
                .toList();
    }

    // ------------------------------------------------------------------
    // Interne
    // ------------------------------------------------------------------

    private List<PieceManquanteDto> piecesManquantesInterne(UUID dossierId) {
        List<PieceDossierCnps> pieces = pieceRepository.findByDossierIdOrderByTypePiece(dossierId);
        Set<TypePieceCnps> obligatoires = piecesObligatoires();

        List<PieceManquanteDto> manquantes = new ArrayList<>();
        for (TypePieceCnps type : obligatoires) {
            PieceDossierCnps piece = pieces.stream()
                    .filter(p -> p.getTypePiece() == type)
                    .findFirst()
                    .orElse(null);
            if (piece == null) {
                manquantes.add(new PieceManquanteDto(type, StatutPieceCnps.ATTENDUE));
            } else if (!piece.getStatut().estFournie()) {
                manquantes.add(new PieceManquanteDto(type, piece.getStatut()));
            }
        }
        return manquantes;
    }

    /**
     * Liste des pièces exigées, lue dans le paramètre {@code PIECES_CNPS_OBLIGATOIRES} — jamais figée en
     * constante Java (AGENTS.md règle absolue n°1). Une valeur inconnue du paramètre est ignorée avec un
     * avertissement plutôt que de faire échouer l'ouverture d'un dossier.
     */
    private Set<TypePieceCnps> piecesObligatoires() {
        String brut = serviceParametre.texte(CLE_PIECES_OBLIGATOIRES);
        Set<TypePieceCnps> types = new LinkedHashSet<>();
        for (String code : Arrays.stream(brut.split(",")).map(String::trim).filter(s -> !s.isBlank()).toList()) {
            try {
                types.add(TypePieceCnps.valueOf(code));
            } catch (IllegalArgumentException e) {
                JOURNAL.warn("Type de pièce CNPS inconnu dans le paramètre {} : {} — ignoré.",
                        CLE_PIECES_OBLIGATOIRES, code.replaceAll("[\\r\\n]", "_"));
            }
        }
        return types;
    }

    private List<String> avertissementsRegles() {
        List<String> avertissements = new ArrayList<>();
        if (!serviceParametre.estValide(CLE_PIECES_OBLIGATOIRES)) {
            avertissements.add("La liste des pièces exigées pour un dossier CNPS (PIECES_CNPS_OBLIGATOIRES) "
                    + "n'est pas validée par la COSITI : un dossier déclaré complet ici peut être refusé par la CNPS.");
        }
        return avertissements;
    }

    private DossierCnpsDto construireDto(DossierCnps dossier) {
        List<PieceDossierCnpsDto> pieces = pieceRepository.findByDossierIdOrderByTypePiece(dossier.getId()).stream()
                .map(PieceDossierCnpsDto::depuis)
                .toList();

        List<String> avertissements = new ArrayList<>(avertissementsRegles());
        if (dossier.getRevenuMensuelDeclare() == null
                || dossier.getRevenuMensuelDeclare().compareTo(BigDecimal.ZERO) <= 0) {
            avertissements.add("Le revenu mensuel déclaré n'est pas renseigné : l'assiette de cotisation CNPS "
                    + "(ASSIETTE_CNPS) reste en attente d'arbitrage, aucune valeur n'est déduite automatiquement.");
        }

        return DossierCnpsDto.depuis(dossier, pieces, piecesManquantesInterne(dossier.getId()), avertissements);
    }

    private DossierCnps charger(UUID id) {
        return dossierRepository.findById(id)
                .orElseThrow(() -> new ExceptionRessourceIntrouvable("CNPS_DOSSIER_INTROUVABLE",
                        "Dossier CNPS introuvable."));
    }

    private static String nomComplet(String nom, String prenoms) {
        return prenoms == null || prenoms.isBlank() ? nom : nom + " " + prenoms;
    }
}
