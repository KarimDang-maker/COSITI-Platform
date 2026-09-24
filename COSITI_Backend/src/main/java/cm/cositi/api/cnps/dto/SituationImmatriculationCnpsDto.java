package cm.cositi.api.cnps.dto;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.UUID;

/**
 * Situation d'un adhérent face au seuil d'immatriculation CNPS de <b>son</b> pack (docs/02_CLASSES_ET_METHODES.md
 * §6) — qu'il soit déjà immatriculé ou non. Étend {@link AdherentEligibleCnpsDto} (qui ne couvre que les
 * adhérents non encore immatriculés) pour servir l'écran Immatriculations du Gestionnaire des comptes
 * (3 onglets : à immatriculer d'urgence, cycle de vérification, déjà immatriculés — {@code
 * Conception/Gestionaires de comptes/FONCTIONALITE_GestComtes_V1.md} §7-§13), qui a besoin des deux
 * populations dans un seul appel.
 */
public record SituationImmatriculationCnpsDto(
        UUID adherentId,
        String matricule,
        String nomComplet,
        String profession,
        String telephone,
        BigDecimal cumulCotise,
        BigDecimal seuilEligibilite,
        String numeroCnps,
        LocalDate dateImmatriculation,
        boolean dossierOuvert
) {
}
