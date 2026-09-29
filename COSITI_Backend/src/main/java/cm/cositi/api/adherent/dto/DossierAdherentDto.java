package cm.cositi.api.adherent.dto;

import cm.cositi.api.adherent.entite.StatutAdherent;
import cm.cositi.api.document.entite.TypeDocument;

import java.util.List;
import java.util.UUID;

/** Vue composite « état du dossier » (#17) : statut membre + complétion + documents manquants. */
public record DossierAdherentDto(
        UUID adherentId,
        StatutAdherent statut,
        int completionPourcentage,
        List<ChampManquantDto> champsManquants,
        List<TypeDocument> documentsManquants,
        List<String> avertissements
) {
}
