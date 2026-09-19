package cm.cositi.api.cnps;

import cm.cositi.api.securite.entite.Utilisateur;
import java.util.List;
import java.util.UUID;

public interface ServiceDossierCnps {
    DossierCnps ouvrir(UUID adherentId, Utilisateur auteur);
    PieceDossierCnps ajouterPiece(UUID dossierId, UUID documentId, String typePiece, Utilisateur auteur);
    DossierCnps changerStatut(UUID dossierId, String nouveauStatut, String commentaire, Utilisateur auteur);
    List<PieceDossierCnps> piecesManquantes(UUID dossierId);
}
