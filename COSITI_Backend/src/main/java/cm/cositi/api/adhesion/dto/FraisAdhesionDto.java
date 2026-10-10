package cm.cositi.api.adhesion.dto;

import cm.cositi.api.adhesion.entite.FraisAdhesion;
import cm.cositi.api.adhesion.entite.StatutFraisAdhesion;

import java.math.BigDecimal;
import java.time.Instant;
import java.time.LocalDate;
import java.util.UUID;

public record FraisAdhesionDto(
        UUID id,
        String reference,
        UUID adherentId,
        String adherentMatricule,
        String adherentNom,
        UUID agentId,
        String agentNom,
        String typeFrais,
        BigDecimal montantAttendu,
        BigDecimal montantRecu,
        BigDecimal ecart,
        String devise,
        LocalDate dateCollecte,
        StatutFraisAdhesion statut,
        UUID enregistrePar,
        Instant enregistreLe,
        UUID validePar,
        Instant valideLe,
        String motifAnomalie,
        Instant anomalieSignaleeLe,
        String resolutionAnomalie,
        Instant anomalieResolueLe,
        String commentaire,
        Long version
) {
    public static FraisAdhesionDto depuis(FraisAdhesion f, String matricule, String nomAdherent, String nomAgent) {
        return new FraisAdhesionDto(f.getId(), f.getReference(), f.getAdherentId(), matricule, nomAdherent,
                f.getAgentId(), nomAgent, f.getTypeFrais(), f.getMontantAttendu(), f.getMontantRecu(), f.getEcart(),
                f.getDevise(), f.getDateCollecte(), f.getStatut(), f.getEnregistrePar(), f.getEnregistreLe(),
                f.getValidePar(), f.getValideLe(), f.getMotifAnomalie(), f.getAnomalieSignaleeLe(),
                f.getResolutionAnomalie(), f.getAnomalieResolueLe(), f.getCommentaire(), f.getVersion());
    }
}
