package cm.cositi.api.cnps.archivage;

import cm.cositi.api.securite.entite.Utilisateur;

import java.util.List;
import java.util.Map;
import java.util.UUID;

public interface ServiceChecklistArchivage {

    ChecklistArchivageDto consulter(UUID dossierId, Utilisateur demandeur);

    ChecklistArchivageDto mettreAJour(UUID dossierId, String codePiece, MiseAJourChecklistDto dto,
                                      Utilisateur auteur);

    List<DossierIncompletDto> dossiersIncomplets(Utilisateur demandeur);

    /** Codes des pièces bloquantes pas encore vérifiées ou archivées (liste complète si aucune ligne n'existe). */
    List<String> piecesBloquantesManquantes(UUID dossierId);

    /** Même calcul pour les adhérents qui ont un dossier : adhérent → nombre de pièces bloquantes manquantes. */
    Map<UUID, Integer> manquantesParAdherent();

    int nombrePiecesBloquantes();
}
