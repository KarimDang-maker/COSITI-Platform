package cm.cositi.api.reporting;

import cm.cositi.api.reporting.dto.TableauBordDafDto;
import cm.cositi.api.reporting.dto.TableauBordDirectionDto;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/tableaux-de-bord")
@Tag(name = "Tableaux de Bord", description = "Indicateurs stratégiques et opérationnels par profil de rôle")
public class ControleurTableauBord {

    private final ServiceTableauBord serviceTableauBord;

    public ControleurTableauBord(ServiceTableauBord serviceTableauBord) {
        this.serviceTableauBord = serviceTableauBord;
    }

    @GetMapping("/direction")
    @PreAuthorize("hasAnyRole('PCA', 'DG', 'DGA', 'SUPER_ADMIN')")
    @Operation(summary = "Tableau de bord stratégique Direction (taux d'activation, effectifs, collecte)")
    public ResponseEntity<TableauBordDirectionDto> direction() {
        return ResponseEntity.ok(serviceTableauBord.getTableauBordDirection());
    }

    @GetMapping("/daf")
    @PreAuthorize("hasAnyRole('DAF', 'SUPER_ADMIN')")
    @Operation(summary = "Tableau de bord financier DAF (collectes à contrôler, remises caisse en écart)")
    public ResponseEntity<TableauBordDafDto> daf() {
        return ResponseEntity.ok(serviceTableauBord.getTableauBordDaf());
    }
}
