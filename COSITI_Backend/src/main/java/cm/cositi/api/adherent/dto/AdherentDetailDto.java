package cm.cositi.api.adherent.dto;

import cm.cositi.api.adherent.entite.Adherent;
import cm.cositi.api.adherent.entite.StatutAdherent;
import cm.cositi.api.adherent.entite.StatutControleDga;
import cm.cositi.api.workflow.entite.StatutValidationEntite;

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
        String whatsapp,
        String email,
        String numeroCni,
        String numeroCnps,
        UUID activiteId,
        UUID zoneId,
        String zoneLibelle,
        UUID associationId,
        String localisation,
        String quartier,
        String ville,
        LocalDate dateAdhesion,
        StatutAdherent statut,
        boolean inscriptionPayee,
        boolean archive,
        Long version,
        /** Statut de validation du dossier (workflow) : VALIDE = officiel, modifications par demande uniquement. */
        StatutValidationEntite statutValidation,
        /** Contrôle documentaire DGA (V20) — un adhérent ACTIF peut être EN_ATTENTE_DGA. */
        StatutControleDga statutControleDga,
        java.time.Instant activeLe
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
                a.getSexe(), a.getTelephonePrincipal(), a.getTelephoneSecondaire(), a.getWhatsapp(), a.getEmail(),
                a.getNumeroCni(), a.getNumeroCnps(),
                a.getActiviteId(), a.getZoneId(), zoneLibelle, a.getAssociationId(), a.getLocalisation(), a.getQuartier(),
                a.getVille(), a.getDateAdhesion(), a.getStatut(),
                a.isInscriptionPayee(), a.isArchive(), a.getVersion(), a.getStatutValidation(),
                a.getStatutControleDga(), a.getActiveLe());
    }
}
