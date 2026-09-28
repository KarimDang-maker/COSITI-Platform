package cm.cositi.api.adherent.dto;

import cm.cositi.api.adherent.entite.Adherent;
import cm.cositi.api.adherent.entite.StatutAdherent;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.UUID;

public record AdherentDetailDto(
        UUID id,
        String matricule,
        String nom,
        String prenoms,
        LocalDate dateNaissance,
        String sexe,
        String telephonePrincipal,
        String telephoneSecondaire,
        String numeroCni,
        String numeroCnps,
        UUID activiteId,
        UUID zoneId,
        String zoneLibelle,
        UUID associationId,
        String localisation,
        String quartier,
        String ville,
        BigDecimal latitude,
        BigDecimal longitude,
        LocalDate dateAdhesion,
        StatutAdherent statut,
        boolean inscriptionPayee,
        boolean archive,
        Long version
) {
    /**
     * Sans libellé de zone : forme utilisée pour les instantanés d'audit « avant/après », où seul
     * l'identifiant de zone fait foi et où une requête supplémentaire ne servirait à rien.
     */
    public static AdherentDetailDto depuis(Adherent a) {
        return depuis(a, null);
    }

    /** Forme destinée à l'affichage : la fiche montre le nom de la zone, pas son UUID. */
    public static AdherentDetailDto depuis(Adherent a, String zoneLibelle) {
        return new AdherentDetailDto(a.getId(), a.getMatricule(), a.getNom(), a.getPrenoms(), a.getDateNaissance(),
                a.getSexe(), a.getTelephonePrincipal(), a.getTelephoneSecondaire(), a.getNumeroCni(), a.getNumeroCnps(),
                a.getActiviteId(), a.getZoneId(), zoneLibelle, a.getAssociationId(), a.getLocalisation(), a.getQuartier(),
                a.getVille(), a.getLatitude(), a.getLongitude(), a.getDateAdhesion(), a.getStatut(),
                a.isInscriptionPayee(), a.isArchive(), a.getVersion());
    }
}
