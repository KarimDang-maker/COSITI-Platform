package cm.cositi.api.adhesion.dto;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;
import java.util.UUID;

/**
 * Rapprochement des frais d'adhésion (§7, §9) : dossiers distincts soumis à la DGA × montant unitaire = montant
 * attendu, comparé au montant effectivement enregistré pour ces dossiers. {@code ecart = enregistré − attendu} :
 * signalé, jamais corrigé automatiquement.
 *
 * @param detailCalcul        « 60 dossiers × 1 000 FCFA = 60 000 FCFA » (§17 : jamais un montant sans contexte)
 * @param ecarts              dossiers en écart (sans frais, montant différent, anomalie signalée), au plus 200
 * @param fraisHorsSoumission frais enregistrés pour des adhérents pas encore soumis à la DGA sur la période
 */
public record RapprochementFraisAdhesionDto(
        LocalDate du,
        LocalDate au,
        UUID agentId,
        long nombreDossiersSoumis,
        BigDecimal montantUnitaire,
        BigDecimal montantAttendu,
        BigDecimal montantEnregistre,
        BigDecimal ecart,
        String detailCalcul,
        long nombreDossiersSansFrais,
        long nombreEcarts,
        List<LigneEcart> ecarts,
        long fraisHorsSoumission,
        BigDecimal montantHorsSoumission,
        List<String> avertissements
) {
    /**
     * @param typeEcart {@code SANS_FRAIS}, {@code MONTANT_DIFFERENT} ou {@code ANOMALIE_SIGNALEE}
     */
    public record LigneEcart(UUID adherentId, String matricule, String nom, UUID agentId, String agentNom,
                             String referenceFrais, BigDecimal montantAttendu, BigDecimal montantEnregistre,
                             BigDecimal ecart, String typeEcart) {
    }
}
