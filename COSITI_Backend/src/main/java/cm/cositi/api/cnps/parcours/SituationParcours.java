package cm.cositi.api.cnps.parcours;

import java.math.BigDecimal;

public record SituationParcours(
        EtapeParcours etape,
        FenetrePreimmat fenetre,
        /** Non éligible alors que la première quinzaine est passée, ou déjà reporté d'une vague. */
        boolean enRetard,
        boolean reporte,
        /** Préimmatriculé dont le délai de dépôt est dépassé sans dépôt. */
        boolean horsDelaiDepot,
        /** Jours avant l'échéance de dépôt (négatif si dépassée) ; nul hors étape PREIMMATRICULE. */
        Integer joursRestantsDepot,
        /** Quota d'immatriculation atteint et adhérent pas encore immatriculé. */
        boolean eligibleImmat,
        BigDecimal resteAvantPreimmat,
        BigDecimal resteAvantImmat) {
}
