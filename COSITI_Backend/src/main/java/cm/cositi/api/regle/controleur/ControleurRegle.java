package cm.cositi.api.regle.controleur;

import cm.cositi.api.adhesion.dto.ExigenceDocumentaireDto;
import cm.cositi.api.adhesion.dto.ModificationExigenceDto;
import cm.cositi.api.adhesion.service.ServiceExigenceDocumentaire;
import cm.cositi.api.administration.dto.ParametreDto;
import cm.cositi.api.regle.dto.SyntheseReglesDto;
import cm.cositi.api.regle.dto.ValidationRegleDto;
import cm.cositi.api.regle.service.ServiceRegle;
import cm.cositi.api.securite.entite.Utilisateur;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;
import java.util.UUID;

/** Règles métier en attente de validation COSITI et matrice documentaire (document des règles v2.0, §38, §50). */
@Tag(name = "Règles — validation COSITI", description = "Règles provisoires (V/A), confirmation tracée, matrice documentaire")
@RestController
@RequestMapping("/api/v1")
public class ControleurRegle {

    private final ServiceRegle serviceRegle;
    private final ServiceExigenceDocumentaire serviceExigence;

    public ControleurRegle(ServiceRegle serviceRegle, ServiceExigenceDocumentaire serviceExigence) {
        this.serviceRegle = serviceRegle;
        this.serviceExigence = serviceExigence;
    }

    @Operation(summary = "Règles en attente de validation",
            description = "Paramètres V (non validés) et A (proposés), exigences documentaires non confirmées.")
    @GetMapping("/regles/en-attente")
    public SyntheseReglesDto enAttente() {
        return serviceRegle.enAttente();
    }

    @Operation(summary = "Confirmer un paramètre (vers C)",
            description = "Permission REGLE:VALIDER ; la valeur ne change pas ; audit REGLE_VALIDATION.")
    @PostMapping("/regles/parametres/{cle}/valider")
    public ParametreDto validerParametre(@PathVariable String cle, @Valid @RequestBody ValidationRegleDto dto,
                                         @AuthenticationPrincipal Utilisateur auteur) {
        return serviceRegle.validerParametre(cle, dto.motif(), auteur);
    }

    @Operation(summary = "Matrice documentaire",
            description = "Pièces et informations justifiées, niveau, contrôle DGA, statut de validation, caractère bloquant.")
    @GetMapping("/exigences-documentaires")
    public List<ExigenceDocumentaireDto> exigences(@RequestParam(defaultValue = "false") boolean enVigueur) {
        return serviceExigence.lister(enVigueur);
    }

    @Operation(summary = "Modifier une exigence documentaire",
            description = "Niveau, condition, contrôle DGA, période d'effet ; motif obligatoire ; verrou optimiste (version).")
    @PutMapping("/regles/exigences/{id}")
    public ExigenceDocumentaireDto modifierExigence(@PathVariable UUID id, @Valid @RequestBody ModificationExigenceDto dto,
                                                    @AuthenticationPrincipal Utilisateur auteur) {
        return serviceExigence.modifier(id, dto, auteur);
    }

    @Operation(summary = "Confirmer une exigence documentaire (vers C)",
            description = "Une pièce obligatoire confirmée devient bloquante pour l'activation.")
    @PostMapping("/regles/exigences/{id}/valider")
    public ExigenceDocumentaireDto confirmerExigence(@PathVariable UUID id, @Valid @RequestBody ValidationRegleDto dto,
                                                     @AuthenticationPrincipal Utilisateur auteur) {
        return serviceExigence.confirmer(id, dto.motif(), auteur);
    }
}
