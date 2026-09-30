package cm.cositi.api.cotisation.service;

import cm.cositi.api.cotisation.dto.PaiementDto;

/** {@code dejaExistant=true} quand la clé d'idempotence correspondait à un paiement déjà créé (renvoyer 200, pas 201). */
public record ResultatEnregistrementPaiement(PaiementDto paiement, boolean dejaExistant) {
}
