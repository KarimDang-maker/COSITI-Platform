package cm.cositi.api.document.service;

import cm.cositi.api.document.dto.ContenuDocument;
import cm.cositi.api.document.dto.DocumentDto;
import cm.cositi.api.document.dto.RattachementDto;
import cm.cositi.api.document.entite.StatutDocument;
import cm.cositi.api.document.entite.TypeDocument;
import cm.cositi.api.securite.entite.Utilisateur;
import org.springframework.web.multipart.MultipartFile;

import java.util.List;
import java.util.UUID;

/** docs/02_CLASSES_ET_METHODES.md §7 — Module Document (jalon J7). */
public interface ServiceStockageDocument {

    DocumentDto televerser(MultipartFile fichier, TypeDocument type, RattachementDto rattachement,
                            Utilisateur auteur);

    /** Journalise la consultation ({@code DOCUMENT_CONSULTATION}) avant de rendre le contenu. */
    ContenuDocument telecharger(UUID documentId, Utilisateur demandeur);

    DocumentDto metadonnees(UUID documentId, Utilisateur demandeur);

    DocumentDto changerStatut(UUID documentId, StatutDocument nouveau, String motif, Utilisateur auteur);

    void archiver(UUID documentId, String motif, Utilisateur auteur);

    List<DocumentDto> listerParAdherent(UUID adherentId, Utilisateur demandeur);

    List<DocumentDto> listerParPaiement(UUID paiementId, Utilisateur demandeur);
}
