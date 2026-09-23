package cm.cositi.api.document.service;

import cm.cositi.api.audit.ServiceAudit;
import cm.cositi.api.audit.TypeOperation;
import cm.cositi.api.commun.exception.ExceptionAutorisation;
import cm.cositi.api.commun.exception.ExceptionConflit;
import cm.cositi.api.commun.exception.ExceptionRessourceIntrouvable;
import cm.cositi.api.commun.exception.ExceptionValidation;
import cm.cositi.api.commun.util.ChiffrementFichier;
import cm.cositi.api.document.dto.ContenuDocument;
import cm.cositi.api.document.dto.DocumentDto;
import cm.cositi.api.document.dto.RattachementDto;
import cm.cositi.api.document.entite.AnalyseAntivirus;
import cm.cositi.api.document.entite.Document;
import cm.cositi.api.document.entite.StatutDocument;
import cm.cositi.api.document.entite.TypeDocument;
import cm.cositi.api.document.repository.DocumentRepository;
import cm.cositi.api.securite.entite.Utilisateur;
import cm.cositi.api.securite.service.ServicePerimetreDonnees;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.io.UncheckedIOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.util.HexFormat;
import java.util.List;
import java.util.UUID;

/**
 * Stockage documentaire (jalon J7).
 *
 * <p>Chaîne de contrôles au téléversement, dans cet ordre (docs/04_SECURITE.md §5,
 * docs/02_CLASSES_ET_METHODES.md §7) :</p>
 * <ol>
 *   <li>rattachement valide (un adhérent <i>ou</i> un paiement, jamais ni l'un ni l'autre) et dans le
 *       périmètre de données du déposant ;</li>
 *   <li>fichier non vide et taille sous le plafond configuré ;</li>
 *   <li>type MIME déterminé par <b>signature binaire</b>, jamais par l'extension ni par l'en-tête client ;</li>
 *   <li>empreinte SHA-256 du contenu <i>en clair</i>, qui sert aussi à refuser un doublon exact sur le même
 *       adhérent ;</li>
 *   <li>analyse antivirus : un fichier {@code INFECTE} n'est jamais écrit sur disque ;</li>
 *   <li>nom de fichier régénéré (UUID), l'original conservé assaini pour le seul affichage ;</li>
 *   <li>écriture chiffrée (AES-256-GCM) hors racine web.</li>
 * </ol>
 *
 * <p><b>Ordre d'écriture assumé</b> : le fichier est écrit sur disque avant l'insertion en base, dans la même
 * méthode transactionnelle. Un échec de la transaction après écriture laisse donc un fichier orphelin, non
 * référencé et illisible sans la ligne correspondante — c'est le compromis retenu plutôt que le risque
 * inverse (une ligne en base pointant un fichier absent), qui casserait la consultation. Le nettoyage des
 * orphelins relève de l'exploitation ; aucune suppression physique n'est déclenchée par l'application
 * (AGENTS.md règle absolue n°3).</p>
 */
@Service
public class ServiceStockageDocumentImpl implements ServiceStockageDocument {

    private static final Logger JOURNAL = LoggerFactory.getLogger(ServiceStockageDocumentImpl.class);

    /** Nom d'origine : on ne conserve que l'essentiel, et jamais de séparateur de chemin. */
    private static final int LONGUEUR_MAX_NOM = 255;

    private final DocumentRepository documentRepository;
    private final ServicePerimetreDonnees perimetre;
    private final ServiceAnalyseAntivirus antivirus;
    private final ChiffrementFichier chiffrement;
    private final ServiceAudit serviceAudit;
    private final Path repertoire;
    private final long tailleMaxOctets;

    public ServiceStockageDocumentImpl(DocumentRepository documentRepository, ServicePerimetreDonnees perimetre,
                                        ServiceAnalyseAntivirus antivirus, ChiffrementFichier chiffrement,
                                        ServiceAudit serviceAudit,
                                        @Value("${cositi.stockage.repertoire-documents}") String repertoireDocuments,
                                        @Value("${cositi.stockage.taille-max-octets}") long tailleMaxOctets) {
        this.documentRepository = documentRepository;
        this.perimetre = perimetre;
        this.antivirus = antivirus;
        this.chiffrement = chiffrement;
        this.serviceAudit = serviceAudit;
        this.repertoire = Paths.get(repertoireDocuments).toAbsolutePath().normalize();
        this.tailleMaxOctets = tailleMaxOctets;
    }

    @Override
    @PreAuthorize("hasAuthority('DOCUMENT:TELEVERSER')")
    @Transactional
    public DocumentDto televerser(MultipartFile fichier, TypeDocument type, RattachementDto rattachement,
                                   Utilisateur auteur) {
        if (type == null) {
            throw new ExceptionValidation("DOCUMENT_TYPE_REQUIS", "Le type de document est obligatoire.", "type");
        }
        if (rattachement == null || !rattachement.estValide()) {
            throw new ExceptionValidation("DOCUMENT_RATTACHEMENT_INVALIDE",
                    "Un document doit être rattaché soit à un adhérent, soit à un paiement — exactement l'un des deux.");
        }
        verifierPerimetre(rattachement.adherentId(), rattachement.paiementId(), auteur);

        if (fichier == null || fichier.isEmpty()) {
            throw new ExceptionValidation("DOCUMENT_FICHIER_VIDE", "Le fichier transmis est vide.", "fichier");
        }
        if (fichier.getSize() > tailleMaxOctets) {
            throw new ExceptionValidation("DOCUMENT_TROP_VOLUMINEUX",
                    "Le fichier dépasse la taille maximale autorisée de " + (tailleMaxOctets / 1024 / 1024) + " Mo.",
                    "fichier");
        }

        byte[] contenu;
        try {
            contenu = fichier.getBytes();
        } catch (IOException e) {
            throw new UncheckedIOException("Lecture du fichier téléversé impossible.", e);
        }

        String typeMimeReel = SignatureBinaire.typeMimeReel(contenu)
                .orElseThrow(() -> new ExceptionValidation("DOCUMENT_TYPE_NON_AUTORISE",
                        "Le contenu du fichier ne correspond à aucun format autorisé ("
                                + String.join(", ", SignatureBinaire.typesMimeAutorises()) + ").", "fichier"));

        String empreinte = empreinteSha256(contenu);
        if (rattachement.adherentId() != null) {
            documentRepository
                    .findFirstByEmpreinteSha256AndAdherentIdAndArchiveFalse(empreinte, rattachement.adherentId())
                    .ifPresent(existant -> {
                        throw new ExceptionConflit("DOCUMENT_DOUBLON",
                                "Ce fichier est déjà rattaché à cet adhérent (" + existant.getNomFichierOriginal() + ").");
                    });
        }

        AnalyseAntivirus resultatAnalyse = antivirus.analyser(contenu, fichier.getOriginalFilename());
        if (resultatAnalyse == AnalyseAntivirus.INFECTE) {
            // Refusé avant toute écriture sur disque : un fichier signalé n'entre pas dans le stockage.
            throw new ExceptionValidation("DOCUMENT_INFECTE",
                    "Le fichier a été refusé par l'analyse antivirus.", "fichier");
        }

        String nomStockage = UUID.randomUUID() + ".chiffre";
        ecrire(nomStockage, chiffrement.chiffrer(contenu));

        Document document = new Document(type, assainirNom(fichier.getOriginalFilename()), nomStockage, typeMimeReel,
                contenu.length, empreinte, rattachement.adherentId(), rattachement.paiementId(),
                auteur.getIdentifiant());
        document.setAnalyseAntivirus(resultatAnalyse);
        document = documentRepository.save(document);

        serviceAudit.tracer(TypeOperation.DOCUMENT_TELEVERSEMENT, "document", document.getId(), null,
                DocumentDto.depuis(document), "Type " + type);
        return DocumentDto.depuis(document);
    }

    @Override
    @PreAuthorize("hasAuthority('DOCUMENT:LIRE')")
    @Transactional
    public ContenuDocument telecharger(UUID documentId, Utilisateur demandeur) {
        Document document = charger(documentId);
        verifierPerimetre(document.getAdherentId(), document.getPaiementId(), demandeur);

        if (!document.estTelechargeable()) {
            throw new ExceptionAutorisation("DOCUMENT_NON_TELECHARGEABLE",
                    "Ce document n'est pas téléchargeable : " + raisonNonTelechargeable(document));
        }

        byte[] chiffre = lire(document.getCheminStockage());
        byte[] clair = chiffrement.dechiffrer(chiffre);

        // Journalisée avant la remise du contenu : une consultation de pièce d'identité doit laisser une trace
        // même si l'écriture de la réponse échoue ensuite (docs/04_SECURITE.md §4).
        serviceAudit.tracer(TypeOperation.DOCUMENT_CONSULTATION, "document", document.getId(), null, null,
                "Téléchargement par " + demandeur.getIdentifiant());

        return new ContenuDocument(document.getNomFichierOriginal(), document.getTypeMime(), clair);
    }

    @Override
    @PreAuthorize("hasAuthority('DOCUMENT:LIRE')")
    public DocumentDto metadonnees(UUID documentId, Utilisateur demandeur) {
        Document document = charger(documentId);
        verifierPerimetre(document.getAdherentId(), document.getPaiementId(), demandeur);
        return DocumentDto.depuis(document);
    }

    @Override
    @PreAuthorize("hasAuthority('DOCUMENT:VERIFIER')")
    @Transactional
    public DocumentDto changerStatut(UUID documentId, StatutDocument nouveau, String motif, Utilisateur auteur) {
        if (nouveau == null) {
            throw new ExceptionValidation("DOCUMENT_STATUT_REQUIS", "Le statut cible est obligatoire.", "statut");
        }
        Document document = charger(documentId);
        verifierPerimetre(document.getAdherentId(), document.getPaiementId(), auteur);

        StatutDocument actuel = document.getStatut();
        if (actuel == nouveau) {
            return DocumentDto.depuis(document);
        }
        if (!actuel.peutAllerVers(nouveau)) {
            throw new ExceptionConflit("DOCUMENT_TRANSITION_INTERDITE",
                    "Transition " + actuel + " vers " + nouveau + " interdite. Transitions possibles depuis "
                            + actuel + " : " + actuel.transitionsAutorisees());
        }
        if (nouveau == StatutDocument.REJETE && estVide(motif)) {
            throw new ExceptionValidation("DOCUMENT_MOTIF_REQUIS",
                    "Le motif est obligatoire pour rejeter un document.", "motif");
        }
        if (nouveau == StatutDocument.ARCHIVE && estVide(motif)) {
            throw new ExceptionValidation("DOCUMENT_MOTIF_REQUIS",
                    "Le motif est obligatoire pour archiver un document.", "motif");
        }

        if (nouveau == StatutDocument.ARCHIVE) {
            document.archiver(motif);
        } else {
            document.setStatut(nouveau);
        }
        document = documentRepository.save(document);

        TypeOperation operation = nouveau == StatutDocument.ARCHIVE
                ? TypeOperation.DOCUMENT_SUPPRESSION_LOGIQUE
                : TypeOperation.DOCUMENT_TELEVERSEMENT;
        serviceAudit.tracer(operation, "document", document.getId(), actuel, nouveau, motif);
        return DocumentDto.depuis(document);
    }

    @Override
    @PreAuthorize("hasAuthority('DOCUMENT:VERIFIER')")
    @Transactional
    public void archiver(UUID documentId, String motif, Utilisateur auteur) {
        changerStatut(documentId, StatutDocument.ARCHIVE, motif, auteur);
    }

    @Override
    @PreAuthorize("hasAuthority('DOCUMENT:LIRE')")
    public List<DocumentDto> listerParAdherent(UUID adherentId, Utilisateur demandeur) {
        perimetre.verifierAccesAdherent(demandeur, adherentId);
        return documentRepository.findByAdherentIdAndArchiveFalseOrderByCreeLeDesc(adherentId).stream()
                .map(DocumentDto::depuis)
                .toList();
    }

    @Override
    @PreAuthorize("hasAuthority('DOCUMENT:LIRE')")
    public List<DocumentDto> listerParPaiement(UUID paiementId, Utilisateur demandeur) {
        perimetre.verifierAccesPaiement(demandeur, paiementId);
        return documentRepository.findByPaiementIdAndArchiveFalseOrderByCreeLeDesc(paiementId).stream()
                .map(DocumentDto::depuis)
                .toList();
    }

    private static String raisonNonTelechargeable(Document document) {
        if (document.isArchive()) {
            return "il est archivé.";
        }
        if (document.getAnalyseAntivirus() != AnalyseAntivirus.PROPRE) {
            return "l'analyse antivirus ne l'a pas déclaré sain.";
        }
        return "il a été rejeté.";
    }

    private void verifierPerimetre(UUID adherentId, UUID paiementId, Utilisateur utilisateur) {
        if (adherentId != null) {
            perimetre.verifierAccesAdherent(utilisateur, adherentId);
        }
        if (paiementId != null) {
            perimetre.verifierAccesPaiement(utilisateur, paiementId);
        }
    }

    private Document charger(UUID id) {
        return documentRepository.findById(id)
                .orElseThrow(() -> new ExceptionRessourceIntrouvable("DOCUMENT_INTROUVABLE", "Document introuvable."));
    }

    private void ecrire(String nomStockage, byte[] contenu) {
        try {
            Files.createDirectories(repertoire);
            Files.write(resoudre(nomStockage), contenu);
        } catch (IOException e) {
            JOURNAL.error("Écriture du document impossible dans {}", repertoire, e);
            throw new UncheckedIOException("Le document n'a pas pu être enregistré.", e);
        }
    }

    private byte[] lire(String nomStockage) {
        try {
            return Files.readAllBytes(resoudre(nomStockage));
        } catch (IOException e) {
            JOURNAL.error("Lecture du document {} impossible", nomStockage, e);
            throw new UncheckedIOException("Le contenu du document est introuvable sur le stockage.", e);
        }
    }

    /**
     * Résout un nom de stockage sous le répertoire configuré, en refusant tout ce qui en sortirait. Les noms
     * sont générés par nos soins (UUID), mais la vérification reste : une traversée de chemin ne doit jamais
     * dépendre de la confiance qu'on accorde à l'appelant.
     */
    private Path resoudre(String nomStockage) {
        Path cible = repertoire.resolve(nomStockage).normalize();
        if (!cible.startsWith(repertoire)) {
            throw new ExceptionValidation("DOCUMENT_CHEMIN_INVALIDE", "Chemin de stockage invalide.");
        }
        return cible;
    }

    private static boolean estVide(String valeur) {
        return valeur == null || valeur.isBlank();
    }

    private static String empreinteSha256(byte[] contenu) {
        try {
            return HexFormat.of().formatHex(MessageDigest.getInstance("SHA-256").digest(contenu));
        } catch (NoSuchAlgorithmException e) {
            throw new IllegalStateException("SHA-256 indisponible sur cette JVM.", e);
        }
    }

    /**
     * Nom d'origine conservé pour le seul affichage : séparateurs de chemin retirés (jamais de
     * remontée de répertoire), caractères de contrôle neutralisés, longueur bornée à la colonne.
     */
    private static String assainirNom(String nom) {
        if (nom == null || nom.isBlank()) {
            return "document";
        }
        String assaini = nom.replaceAll("[\\\\/\\p{Cntrl}]", "_").trim();
        if (assaini.length() > LONGUEUR_MAX_NOM) {
            assaini = assaini.substring(0, LONGUEUR_MAX_NOM);
        }
        return assaini.isBlank() ? "document" : assaini;
    }
}
