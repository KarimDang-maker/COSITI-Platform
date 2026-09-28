package cm.cositi.api.compterendu.dto;

import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.PositiveOrZero;

import java.math.BigDecimal;
import java.time.LocalDate;

/**
 * Compte rendu terrain produit par un Agent (UC-AG-10).
 *
 * <p>Tous les indicateurs sont déclarés par l'agent. La zone et l'agent ne sont pas dans ce DTO : ils sont
 * déduits du compte de l'auteur côté serveur, pour qu'un agent ne puisse pas produire un compte rendu au
 * nom d'un autre.</p>
 */
public record CreationCompteRenduDto(
        @NotNull LocalDate periodeDebut,
        @NotNull LocalDate periodeFin,
        @PositiveOrZero int nbVisites,
        @PositiveOrZero int nbAdherentsRencontres,
        @PositiveOrZero int nbAdherentsCrees,
        @PositiveOrZero int nbPaiementsEnregistres,
        @PositiveOrZero BigDecimal montantCollecte,
        String synthese,
        String difficultes
) {
}
