package cm.cositi.api.reporting.controleur;

import cm.cositi.api.reporting.dto.CritereTableauBord;
import cm.cositi.api.reporting.dto.TableauBordDafDto;
import cm.cositi.api.reporting.dto.TableauBordDgDto;
import cm.cositi.api.reporting.dto.TableauBordDgaDto;
import cm.cositi.api.reporting.dto.TableauBordGestionnaireDto;
import cm.cositi.api.reporting.dto.TableauBordPcaDto;
import cm.cositi.api.reporting.dto.TableauBordSuperAdminDto;
import cm.cositi.api.reporting.service.ServiceTableauBord;
import cm.cositi.api.securite.entite.Utilisateur;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.time.LocalDate;
import java.util.UUID;

/**
 * docs/03_SPECIFICATIONS_API.md §10 — Tableaux de bord (jalon J9).
 *
 * <p><b>Six routes, pas une de plus</b> : {@code /tableaux-de-bord/pca}, {@code /dg}, {@code /dga},
 * {@code /daf}, {@code /gestionnaire}, {@code /super-admin}. Il n'existe aucune route pour le Chef des
 * agents de terrain ni pour l'Agent de terrain (Roles des acteurs.md §16, hors périmètre V1).</p>
 *
 * <p>Chaque route porte sa propre permission, accordée au seul rôle concerné (V11) : un Agent qui ouvre la
 * route du dashboard DGA reçoit un {@code 403} — cas de recette {@code REC-H08} et {@code REC-H09}.</p>
 */
@RestController
@RequestMapping("/api/v1/tableaux-de-bord")
public class ControleurTableauBord {

    private final ServiceTableauBord serviceTableauBord;

    public ControleurTableauBord(ServiceTableauBord serviceTableauBord) {
        this.serviceTableauBord = serviceTableauBord;
    }

    @GetMapping("/pca")
    public TableauBordPcaDto pca(@RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate du,
                                  @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate au,
                                  @RequestParam(required = false) UUID zoneId,
                                  @AuthenticationPrincipal Utilisateur demandeur) {
        return serviceTableauBord.pca(new CritereTableauBord(du, au, zoneId), demandeur);
    }

    @GetMapping("/dg")
    public TableauBordDgDto dg(@RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate du,
                                @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate au,
                                @RequestParam(required = false) UUID zoneId,
                                @AuthenticationPrincipal Utilisateur demandeur) {
        return serviceTableauBord.dg(new CritereTableauBord(du, au, zoneId), demandeur);
    }

    @GetMapping("/dga")
    public TableauBordDgaDto dga(@RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate du,
                                  @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate au,
                                  @RequestParam(required = false) UUID zoneId,
                                  @AuthenticationPrincipal Utilisateur demandeur) {
        return serviceTableauBord.dga(new CritereTableauBord(du, au, zoneId), demandeur);
    }

    @GetMapping("/daf")
    public TableauBordDafDto daf(@RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate du,
                                  @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate au,
                                  @RequestParam(required = false) UUID zoneId,
                                  @AuthenticationPrincipal Utilisateur demandeur) {
        return serviceTableauBord.daf(new CritereTableauBord(du, au, zoneId), demandeur);
    }

    @GetMapping("/gestionnaire")
    public TableauBordGestionnaireDto gestionnaire(
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate du,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate au,
            @RequestParam(required = false) UUID zoneId,
            @AuthenticationPrincipal Utilisateur demandeur) {
        return serviceTableauBord.gestionnaire(new CritereTableauBord(du, au, zoneId), demandeur);
    }

    @GetMapping("/super-admin")
    public TableauBordSuperAdminDto superAdmin(
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate du,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate au,
            @AuthenticationPrincipal Utilisateur demandeur) {
        return serviceTableauBord.superAdmin(new CritereTableauBord(du, au, null), demandeur);
    }
}
