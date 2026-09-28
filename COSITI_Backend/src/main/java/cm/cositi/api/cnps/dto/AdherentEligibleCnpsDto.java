package cm.cositi.api.cnps.dto;

import java.math.BigDecimal;
import java.util.UUID;

/**
 * Adhérent qui a franchi le seuil d'éligibilité CNPS de <b>son</b> pack et n'a pas encore de numéro
 * d'immatriculation (docs/02_CLASSES_ET_METHODES.md §6 : jamais un seuil global).
 */
public record AdherentEligibleCnpsDto(
        UUID adherentId,
        String matricule,
        String nomComplet,
        String packCode,
        BigDecimal cumulCotise,
        BigDecimal seuilEligibilite,
        boolean dossierOuvert
) {
}
