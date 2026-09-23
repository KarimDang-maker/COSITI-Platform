package cm.cositi.api.adherent.dto;

import cm.cositi.api.adherent.entite.Adherent;
import cm.cositi.api.adherent.entite.StatutAdherent;

import java.time.LocalDate;
import java.util.UUID;

/**
 * Ligne de la liste des adhérents.
 *
 * <p>{@code zoneLibelle} et {@code dateAdhesion} ont été ajoutés au jalon J12 : l'écran
 * {@code /adherents} comporte une colonne « Zone » et une colonne « Adhésion » que rien
 * n'alimentait, et qui affichaient donc un tiret pour chaque ligne. Le défaut est apparu en
 * recette E2E, sur la première liste construite à partir de vraies données.</p>
 *
 * <p>Le libellé de zone accompagne l'identifiant plutôt que de le remplacer : un écran qui
 * filtre par zone a besoin de l'un, un écran qui l'affiche a besoin de l'autre.</p>
 */
public record AdherentResumeDto(
        UUID id,
        String matricule,
        String nomComplet,
        String telephonePrincipal,
        UUID zoneId,
        String zoneLibelle,
        LocalDate dateAdhesion,
        StatutAdherent statut
) {
    public static AdherentResumeDto depuis(Adherent a, String zoneLibelle) {
        return new AdherentResumeDto(a.getId(), a.getMatricule(), a.getNomComplet(), a.getTelephonePrincipal(),
                a.getZoneId(), zoneLibelle, a.getDateAdhesion(), a.getStatut());
    }
}
