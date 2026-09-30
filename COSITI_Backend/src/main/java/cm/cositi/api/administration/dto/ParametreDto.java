package cm.cositi.api.administration.dto;

import cm.cositi.api.parametre.Parametre;

import java.time.Instant;
import java.util.UUID;

/**
 * Règle de paramétrage (UC-SA-06/UC-SA-11).
 *
 * <p>{@code statutValidation} vaut {@code C} (confirmé par la COSITI), {@code A} (proposition technique) ou
 * {@code V} (non validée). Une règle `V` produit aujourd'hui des résultats provisoires, signalés comme tels
 * partout où ils s'affichent : c'est l'information la plus importante de cet écran.</p>
 */
public record ParametreDto(
        UUID id,
        String cle,
        String valeur,
        String typeValeur,
        String libelle,
        String modifiableParRole,
        String statutValidation,
        Instant modifieLe,
        String modifiePar
) {
    public static ParametreDto depuis(Parametre p) {
        return new ParametreDto(p.getId(), p.getCle(), p.getValeur(), p.getTypeValeur(), p.getLibelle(),
                p.getModifiableParRole(), p.getStatutValidation(), p.getModifieLe(), p.getModifiePar());
    }
}
