package cm.cositi.api.adherent.controleur;

import cm.cositi.api.adherent.dto.AssociationDto;
import cm.cositi.api.adherent.repository.AssociationRepository;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import org.springframework.data.domain.Sort;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

/**
 * Référentiel des associations, en lecture seule (inventaire des règles D-06) : le champ {@code associationId} de
 * l'adhérent devient saisissable par une liste. Comme pour {@link ControleurPack}, la liste est renvoyée entière,
 * drapeau {@code active} compris. Qui tient ce référentiel reste une décision COSITI : aucune route d'écriture.
 */
@Tag(name = "Adhérents — référentiel des associations")
@RestController
@RequestMapping("/api/v1/associations")
public class ControleurAssociation {

    private final AssociationRepository associationRepository;

    public ControleurAssociation(AssociationRepository associationRepository) {
        this.associationRepository = associationRepository;
    }

    @Operation(summary = "Lister les associations", description = "Actives et inactives, triées par nom.")
    @GetMapping
    @PreAuthorize("hasAuthority('ADHERENT:LIRE')")
    public List<AssociationDto> lister() {
        return associationRepository.findAll(Sort.by("nom")).stream().map(AssociationDto::depuis).toList();
    }
}
