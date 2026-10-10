package cm.cositi.api.avantage;

import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;

import java.time.LocalDate;
import java.util.List;
import java.util.UUID;

/** Contrats d'API du module avantages. */
public final class AvantageDtos {

    private AvantageDtos() {
    }

    public record CritereDto(TypeCritere type, String valeur, String libelle) {
    }

    public record PieceAvantageDto(String categorie, String libelle) {
    }

    /** Un avantage du catalogue avec ses critères, ses pièces et ses effectifs. */
    public record AvantageDto(UUID id, String code, String libelle, String branche, String description,
                              boolean actif, String statutValidation, List<CritereDto> criteres,
                              List<PieceAvantageDto> pieces, long nbAcquis, long nbEnCours, long nbSuspendus) {
    }

    /** Un avantage vu depuis la fiche d'un adhérent. */
    public record AvantageAdherentDto(UUID avantageId, String code, String libelle, String branche,
                                      StatutAvantage statut, String statutValidation,
                                      List<String> criteresSatisfaits, List<String> criteresManquants,
                                      LocalDate dateDebut, LocalDate dateFin, List<PieceAvantageDto> pieces) {
    }

    public record BeneficiaireDto(UUID adherentId, String matricule, String nomComplet, UUID zoneId,
                                  StatutAvantage statut, List<String> criteresManquants, LocalDate dateDebut) {
    }

    public record SaisieCritereDto(@NotNull TypeCritere type, @Size(max = 120) String valeur) {
    }

    public record SaisiePieceDto(@NotNull @Pattern(regexp = "CONSTITUTION|MAINTIEN") String categorie,
                                 @NotBlank String libelle) {
    }

    public record SaisieAvantageDto(
            @NotBlank @Size(max = 60) @Pattern(regexp = "[A-Z0-9_]+") String code,
            @NotBlank @Size(max = 160) String libelle,
            @NotNull @Pattern(regexp = "PRESTATIONS_FAMILIALES|PENSIONS|RISQUES_PROFESSIONNELS|COSITI") String branche,
            String description,
            boolean actif,
            @NotNull @Valid List<SaisieCritereDto> criteres,
            @Valid List<SaisiePieceDto> pieces) {
    }

    public record ResultatRecalculDto(int adherentsEvalues, int avantagesEvalues, int changements) {
    }
}
