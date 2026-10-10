package cm.cositi.api.cotisation.dto;

import java.math.BigDecimal;
import java.time.Instant;
import java.time.LocalDate;
import java.util.List;
import java.util.UUID;

/**
 * Comptes et cumuls d'un adhérent, calculés par le backend (prompt §12, règles module 1 §6 et module 2 §8).
 *
 * <p>Un montant n'est « validé » (soldes des comptes) que si sa cotisation est {@code VALIDE} ou {@code RAPPROCHE} :
 * une saisie en attente de contrôle n'est jamais comptée comme définitivement acquise. Les soldes Sécurité sociale
 * et Épargne sont les sommes des affectations comptabilisées à la validation.</p>
 *
 * @param montantAutresComposantes affectations validées antérieures à la répartition confirmée (« Coopérative »)
 * @param cumulImpute              montant ouvrant des droits (périodes de droits), comparé au seuil CNPS du pack
 * @param tauxProgression          cumulImpute / seuil × 100, borné à 100, 2 décimales ; nul sans pack
 */
public record SyntheseCotisationsAdherentDto(
        UUID adherentId,
        String matricule,
        UUID packId,
        String packCode,
        String packLibelle,
        boolean packRequisALaProchaineCotisation,
        CompteCotisationDto compteSecuriteSociale,
        CompteCotisationDto compteEpargne,
        BigDecimal montantAutresComposantes,
        BigDecimal totalCotisations,
        BigDecimal montantValide,
        long nombreCotisationsValidees,
        BigDecimal montantEnAttente,
        long nombreCotisationsEnAttente,
        BigDecimal montantEnAttenteNonReparti,
        BigDecimal montantBrouillons,
        long nombreBrouillons,
        long nombreCotisationsRejetees,
        long nombreCotisationsAnnulees,
        BigDecimal seuilEligibiliteCnps,
        BigDecimal cumulImpute,
        BigDecimal resteAvantSeuil,
        BigDecimal tauxProgression,
        boolean eligibleCnps,
        LocalDate derniereCotisationValideeLe,
        Instant calculeLe,
        List<String> avertissements
) {

    /**
     * Un compte de l'adhérent.
     *
     * @param soldeValide      somme des montants comptabilisés (cotisations validées)
     * @param montantEnAttente part de ce compte dans les cotisations en attente de contrôle
     */
    public record CompteCotisationDto(String compte, BigDecimal soldeValide, BigDecimal montantEnAttente,
                                      long nombreOperationsValidees, LocalDate derniereOperationLe) {
    }
}
