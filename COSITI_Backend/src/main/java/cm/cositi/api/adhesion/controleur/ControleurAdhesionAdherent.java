package cm.cositi.api.adhesion.controleur;

import cm.cositi.api.adhesion.dto.ActivationAdherentDto;
import cm.cositi.api.adhesion.dto.ControleDgaDto;
import cm.cositi.api.adhesion.dto.EnregistrerFraisAdhesionDto;
import cm.cositi.api.adhesion.dto.FraisAdhesionAdherentDto;
import cm.cositi.api.adhesion.dto.FraisAdhesionDto;
import cm.cositi.api.adhesion.dto.SoumissionDgaDto;
import cm.cositi.api.adhesion.dto.StatutActivationDto;
import cm.cositi.api.adhesion.dto.SyntheseWorkflowAdherentDto;
import cm.cositi.api.adhesion.dto.VerificationActivationDto;
import cm.cositi.api.adhesion.service.ServiceActivationAdherent;
import cm.cositi.api.adhesion.service.ServiceControleDga;
import cm.cositi.api.adhesion.service.ServiceExigenceDocumentaire;
import cm.cositi.api.adhesion.dto.ChecklistDocumentaireDto;
import cm.cositi.api.adhesion.service.ServiceFraisAdhesion;
import cm.cositi.api.securite.entite.Utilisateur;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;
import java.util.UUID;

/**
 * Parcours d'adhésion vu depuis le dossier adhérent : frais d'adhésion, activation par le Gestionnaire, transmission
 * au contrôle DGA. Routes cibles de la spécification ({@code /registration-fee}, {@code /activate},
 * {@code /submit-to-dga}, {@code /workflow-summary}, {@code /document-verification}) servies en français.
 */
@Tag(name = "Adhésion — frais, activation, transmission DGA",
        description = "Frais d'adhésion de l'adhérent, vérification avant activation, activation, transmission DGA")
@RestController
@RequestMapping("/api/v1/adherents")
public class ControleurAdhesionAdherent {

    private final ServiceFraisAdhesion serviceFrais;
    private final ServiceActivationAdherent serviceActivation;
    private final ServiceControleDga serviceControle;
    private final ServiceExigenceDocumentaire serviceExigence;

    public ControleurAdhesionAdherent(ServiceFraisAdhesion serviceFrais, ServiceActivationAdherent serviceActivation,
                                      ServiceControleDga serviceControle, ServiceExigenceDocumentaire serviceExigence) {
        this.serviceFrais = serviceFrais;
        this.serviceActivation = serviceActivation;
        this.serviceControle = serviceControle;
        this.serviceExigence = serviceExigence;
    }

    @Operation(summary = "Checklist documentaire du dossier",
            description = "Statut de chaque pièce (REQUIS, FOURNI, EN_VERIFICATION, VALIDE, NON_CONFORME, EXPIRE...) "
                    + "et de chaque information justifiée, calculé depuis la matrice documentaire et le dernier contrôle DGA.")
    @GetMapping("/{id}/checklist-documentaire")
    public ChecklistDocumentaireDto checklistDocumentaire(@PathVariable UUID id, @AuthenticationPrincipal Utilisateur demandeur) {
        return serviceExigence.checklist(id, demandeur);
    }

    @Operation(summary = "Frais d'adhésion du dossier", description = "Montant requis (backend) et frais enregistré éventuel.")
    @GetMapping("/{id}/frais-adhesion")
    public FraisAdhesionAdherentDto fraisAdhesion(@PathVariable UUID id, @AuthenticationPrincipal Utilisateur demandeur) {
        return serviceFrais.parAdherent(id, demandeur);
    }

    @Operation(summary = "Enregistrer le frais d'adhésion collecté",
            description = "Agent collecteur obligatoire ; montant attendu fourni par le backend ; un seul frais par adhérent "
                    + "(409 sinon) ; une clé d'idempotence rejouée renvoie le frais existant (200).")
    @PostMapping("/{id}/frais-adhesion")
    public ResponseEntity<FraisAdhesionDto> enregistrerFrais(@PathVariable UUID id,
                                                             @Valid @RequestBody EnregistrerFraisAdhesionDto dto,
                                                             @AuthenticationPrincipal Utilisateur gestionnaire) {
        ServiceFraisAdhesion.ResultatEnregistrementFrais resultat = serviceFrais.enregistrer(id, dto, gestionnaire);
        return ResponseEntity.status(resultat.dejaExistant() ? 200 : 201).body(resultat.frais());
    }

    @Operation(summary = "Vérification avant activation", description = "Conditions calculées par le backend, bloquantes ou non.")
    @GetMapping("/{id}/activation")
    public VerificationActivationDto verificationActivation(@PathVariable UUID id,
                                                            @AuthenticationPrincipal Utilisateur demandeur) {
        return serviceActivation.verifier(id, demandeur);
    }

    @Operation(summary = "Activer l'adhérent (Gestionnaire)",
            description = "Compte ACTIF puis transmission automatique au contrôle DGA (EN_ATTENTE_DGA). Idempotent.")
    @PostMapping("/{id}/activer")
    public StatutActivationDto activer(@PathVariable UUID id, @RequestBody(required = false) ActivationAdherentDto dto,
                                       @AuthenticationPrincipal Utilisateur gestionnaire) {
        return serviceActivation.activer(id, dto, gestionnaire);
    }

    @Operation(summary = "État d'activation et de contrôle DGA")
    @GetMapping("/{id}/statut-activation")
    public StatutActivationDto statutActivation(@PathVariable UUID id, @AuthenticationPrincipal Utilisateur demandeur) {
        return serviceActivation.statut(id, demandeur);
    }

    @Operation(summary = "Transmettre (ou retransmettre après correction) au contrôle DGA",
            description = "Idempotent : un dossier déjà en file renvoie le contrôle ouvert.")
    @PostMapping("/{id}/soumettre-dga")
    public ControleDgaDto soumettreDga(@PathVariable UUID id, @Valid @RequestBody(required = false) SoumissionDgaDto dto,
                                       @AuthenticationPrincipal Utilisateur gestionnaire) {
        return serviceActivation.soumettreDga(id, dto, gestionnaire);
    }

    @Operation(summary = "Synthèse du parcours d'adhésion", description = "Activation, frais, contrôle DGA courant.")
    @GetMapping("/{id}/synthese-workflow")
    public SyntheseWorkflowAdherentDto syntheseWorkflow(@PathVariable UUID id,
                                                        @AuthenticationPrincipal Utilisateur demandeur) {
        return serviceActivation.synthese(id, demandeur);
    }

    @Operation(summary = "Contrôle documentaire DGA courant de l'adhérent")
    @GetMapping("/{id}/controle-dga")
    public ControleDgaDto controleCourant(@PathVariable UUID id, @AuthenticationPrincipal Utilisateur demandeur) {
        return serviceControle.courant(id, demandeur);
    }

    @Operation(summary = "Historique des tours de contrôle DGA de l'adhérent")
    @GetMapping("/{id}/controles-dga")
    public List<ControleDgaDto> historiqueControles(@PathVariable UUID id, @AuthenticationPrincipal Utilisateur demandeur) {
        return serviceControle.historique(id, demandeur);
    }
}
