package cm.cositi.api.cnps.parcours;

import java.math.BigDecimal;

/** Compteurs affichés en tête des tableaux et sur le tableau de bord de la gestionnaire. */
public record ResumeParcoursDto(
        long aPreimmatriculer,
        long enRetard,
        long reportes,
        long delaiDepotEnCours,
        long delaiDepotDepasse,
        long dossiersDeposes,
        long eligiblesImmat,
        long nonEligiblesImmat,
        long immatricules,
        /** Éligibles ou en cours de parcours dont la checklist d'archivage est incomplète. */
        long dossiersPiecesManquantes,
        BigDecimal quotaPreimmat,
        BigDecimal quotaImmat,
        int jourCoupure,
        int delaiDepotJours,
        FenetrePreimmat fenetreCourante) {
}
