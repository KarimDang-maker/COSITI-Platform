package cm.cositi.api.adhesion.dto;

import cm.cositi.api.adhesion.entite.ExigenceDocumentaire;
import cm.cositi.api.adhesion.entite.NiveauExigence;

import java.time.LocalDate;
import java.util.UUID;

/**
 * Ligne de la matrice documentaire (§38) — le frontend lit cette configuration au lieu de dupliquer les règles.
 *
 * @param bloquante {@code true} seulement pour une pièce obligatoire confirmée par la COSITI (§17)
 */
public record ExigenceDocumentaireDto(
        UUID id,
        String code,
        String rubrique,
        String typeDocument,
        String champ,
        String libelle,
        NiveauExigence niveau,
        String conditionApplication,
        boolean verificationDga,
        String statutValidation,
        boolean bloquante,
        LocalDate effectifDu,
        LocalDate effectifJusquau,
        boolean actif,
        int ordre,
        Long version
) {
    public static ExigenceDocumentaireDto depuis(ExigenceDocumentaire e) {
        return new ExigenceDocumentaireDto(e.getId(), e.getCode(), e.getRubrique(), e.getTypeDocument(), e.getChamp(),
                e.getLibelle(), e.getNiveau(), e.getConditionApplication(), e.isVerificationDga(), e.getStatutValidation(),
                e.estBloquante(), e.getEffectifDu(), e.getEffectifJusquau(), e.isActif(), e.getOrdre(), e.getVersion());
    }
}
