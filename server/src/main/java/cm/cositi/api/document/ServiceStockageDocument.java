package cm.cositi.api.document;

import cm.cositi.api.audit.ServiceAudit;
import cm.cositi.api.audit.TypeOperation;
import cm.cositi.api.commun.exception.ExceptionMetier;
import cm.cositi.api.commun.exception.ExceptionRessourceIntrouvable;
import cm.cositi.api.securite.entite.Utilisateur;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;

import java.io.File;
import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.security.MessageDigest;
import java.util.HexFormat;
import java.util.UUID;

@Service
@Transactional
public class ServiceStockageDocument {

    @Value("${cositi.stockage.repertoire-documents:./uploads/documents}")
    private String uploadDir;

    @Value("${cositi.stockage.taille-max-octets:10485760}")
    private long tailleMaxOctets;

    private final DocumentRepository documentRepository;
    private final ServiceAudit serviceAudit;

    public ServiceStockageDocument(DocumentRepository documentRepository, ServiceAudit serviceAudit) {
        this.documentRepository = documentRepository;
        this.serviceAudit = serviceAudit;
    }

    public Document televerser(MultipartFile fichier, String typeDocument, UUID adherentId, UUID paiementId, Utilisateur auteur) {
        if (fichier.isEmpty()) {
            throw new ExceptionMetier("FICHIER_VIDE", "Le fichier téléversé est vide.");
        }

        if (fichier.getSize() > tailleMaxOctets) {
            throw new ExceptionMetier("FICHIER_TROP_VOLUMINEUX", "La taille du fichier dépasse le seuil autorisé (10 Mo).");
        }

        try {
            byte[] bytes = fichier.getBytes();

            // Calcul empreinte SHA-256
            MessageDigest digest = MessageDigest.getInstance("SHA-256");
            byte[] hash = digest.digest(bytes);
            String sha256 = HexFormat.of().formatHex(hash);

            // Vérification doublon d'empreinte
            var doublon = documentRepository.findByEmpreinteSha256(sha256);
            if (doublon.isPresent()) {
                return doublon.get();
            }

            // Génération chemin sécurisé hors racine web
            Path dirPath = Paths.get(uploadDir);
            if (!Files.exists(dirPath)) {
                Files.createDirectories(dirPath);
            }

            String nomStockage = UUID.randomUUID() + ".dat";
            Path cible = dirPath.resolve(nomStockage);
            Files.write(cible, bytes);

            Document doc = new Document();
            doc.setTypeDocument(typeDocument);
            doc.setNomFichierOriginal(fichier.getOriginalFilename() != null ? fichier.getOriginalFilename() : "inconnu");
            doc.setCheminStockage(cible.toString());
            doc.setTypeMime(fichier.getContentType() != null ? fichier.getContentType() : "application/octet-stream");
            doc.setTailleOctets(fichier.getSize());
            doc.setEmpreinteSha256(sha256);
            doc.setAdherentId(adherentId);
            doc.setPaiementId(paiementId);
            doc.setCreePar(auteur.getIdentifiant());

            doc = documentRepository.save(doc);

            serviceAudit.tracer(TypeOperation.DOCUMENT_TELEVERSEMENT, "DOCUMENT", doc.getId(),
                    null, doc.getNomFichierOriginal(), "Téléversement document " + typeDocument, auteur.getIdentifiant());

            return doc;

        } catch (Exception e) {
            throw new ExceptionMetier("ERREUR_TELEVERSEMENT", "Échec de l'enregistrement sécurisé du document: " + e.getMessage());
        }
    }

    @Transactional(readOnly = true)
    public Document consulterMetadonnees(UUID documentId, Utilisateur demandeur) {
        Document doc = documentRepository.findById(documentId)
                .orElseThrow(() -> new ExceptionRessourceIntrouvable("Document", documentId));

        serviceAudit.tracer(TypeOperation.DOCUMENT_CONSULTATION, "DOCUMENT", documentId,
                null, null, "Consultation métadonnées document", demandeur.getIdentifiant());

        return doc;
    }
}
