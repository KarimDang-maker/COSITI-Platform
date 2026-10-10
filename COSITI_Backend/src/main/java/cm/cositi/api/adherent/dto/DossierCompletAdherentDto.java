package cm.cositi.api.adherent.dto;

import cm.cositi.api.adherent.entite.StatutAdherent;
import cm.cositi.api.adherent.entite.StatutControleDga;
import cm.cositi.api.cotisation.dto.SyntheseCotisationsAdherentDto;
import cm.cositi.api.document.entite.TypeDocument;
import cm.cositi.api.workflow.entite.StatutValidationEntite;

import java.time.Instant;
import java.time.LocalDate;
import java.util.List;
import java.util.UUID;

/**
 * Vue complète du dossier adhérent (prompt §5.1, règles module 1) en une lecture : identité, informations
 * professionnelles, coordonnées, état du dossier, comptes Sécurité sociale et Épargne, cumuls de cotisations et
 * accès aux deux historiques. Chaque section reprend une lecture existante — aucun calcul n'est refait ici.
 *
 * @param cotisations {@code null} si le lecteur n'a pas la lecture des cotisations ({@code PAIEMENT:LIRE})
 * @param historique  nombres d'événements visibles ; {@code -1} pour un historique fermé à ce lecteur
 */
public record DossierCompletAdherentDto(
        UUID id,
        String matricule,
        Identite identite,
        Professionnel professionnel,
        CoordonneesAdherentDto coordonnees,
        EtatDossier etatDossier,
        SyntheseCotisationsAdherentDto cotisations,
        Historique historique,
        Long version,
        List<String> avertissements
) {

    public record Identite(String nom, String prenoms, LocalDate dateNaissance, String sexe, String numeroCni,
                           String numeroCnps) {
    }

    public record Professionnel(UUID activiteId, String activiteLibelle, UUID associationId, String associationNom,
                                String numeroCnps) {
    }

    public record EtatDossier(StatutAdherent statut, StatutValidationEntite statutValidation,
                              StatutControleDga statutControleDga, boolean inscriptionPayee, boolean archive,
                              LocalDate dateAdhesion, Instant activeLe, UUID zoneId, String zoneLibelle,
                              int completionPourcentage, List<ChampManquantDto> champsManquants,
                              List<TypeDocument> documentsManquants) {
    }

    public record Historique(long nombreEvenementsGeneraux, long nombreEvenementsFinanciers, String routeGeneral,
                             String routeFinancier) {
    }
}
