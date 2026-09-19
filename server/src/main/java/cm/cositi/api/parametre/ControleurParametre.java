package cm.cositi.api.parametre;

import cm.cositi.api.securite.entite.Utilisateur;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/administration/parametres")
@Tag(name = "Paramètres Métier", description = "Gestion des paramètres dynamiques et règles de gestion [V]")
public class ControleurParametre {

    private final ServiceParametre serviceParametre;

    public ControleurParametre(ServiceParametre serviceParametre) {
        this.serviceParametre = serviceParametre;
    }

    @GetMapping
    @PreAuthorize("hasAuthority('ADMINISTRATION:LIRE') or hasRole('SUPER_ADMIN')")
    @Operation(summary = "Lister l'ensemble des paramètres métier et leur statut de validation")
    public ResponseEntity<List<Parametre>> lister() {
        return ResponseEntity.ok(serviceParametre.listerTous());
    }

    public record ModificationParametreDto(String valeur, String motif) {}

    @PutMapping("/{cle}")
    @PreAuthorize("hasAuthority('ADMINISTRATION:MODIFIER') or hasRole('SUPER_ADMIN')")
    @Operation(summary = "Modifier la valeur d'un paramètre avec motif obligatoire")
    public ResponseEntity<Void> modifier(
            @PathVariable String cle,
            @RequestBody ModificationParametreDto dto,
            @AuthenticationPrincipal Utilisateur utilisateur) {
        serviceParametre.modifier(cle, dto.valeur(), dto.motif(), utilisateur.getIdentifiant());
        return ResponseEntity.noContent().build();
    }
}
