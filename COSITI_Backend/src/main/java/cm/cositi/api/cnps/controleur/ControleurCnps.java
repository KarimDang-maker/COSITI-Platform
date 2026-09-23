package cm.cositi.api.cnps.controleur;

import cm.cositi.api.cnps.dto.AdherentEligibleCnpsDto;
import cm.cositi.api.cnps.dto.AjoutPieceDto;
import cm.cositi.api.cnps.dto.ChangementStatutDossierDto;
import cm.cositi.api.cnps.dto.DeclarationCnpsDto;
import cm.cositi.api.cnps.dto.DossierCnpsDto;
import cm.cositi.api.cnps.dto.PieceManquanteDto;
import cm.cositi.api.cnps.entite.StatutDossierCnps;
import cm.cositi.api.cnps.service.ServiceDeclarationCnps;
import cm.cositi.api.cnps.service.ServiceDossierCnps;
import cm.cositi.api.commun.reponse.ReponsePaginee;
import cm.cositi.api.securite.entite.Utilisateur;
import jakarta.validation.Valid;
import org.springframework.data.domain.PageRequest;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.time.YearMonth;
import java.time.format.DateTimeParseException;
import java.util.List;
import java.util.UUID;

/**
 * docs/03_SPECIFICATIONS_API.md §7 — CNPS (jalon J7).
 *
 * <p>Les chemins reprennent exactement ceux du pack : {@code /cnps/dossiers},
 * {@code /cnps/dossiers/{id}/pieces}, {@code /cnps/dossiers/{id}/statut},
 * {@code /cnps/dossiers/{id}/pieces-manquantes}, {@code /cnps/eligibles-non-immatricules},
 * {@code /cnps/declarations}, {@code /cnps/declarations/{id}/transmettre},
 * {@code /cnps/declarations/a-produire}.</p>
 */
@RestController
@RequestMapping("/api/v1/cnps")
public class ControleurCnps {

    private final ServiceDossierCnps serviceDossier;
    private final ServiceDeclarationCnps serviceDeclaration;

    public ControleurCnps(ServiceDossierCnps serviceDossier, ServiceDeclarationCnps serviceDeclaration) {
        this.serviceDossier = serviceDossier;
        this.serviceDeclaration = serviceDeclaration;
    }

    // ---------------------------------------------------------------- Dossiers

    @GetMapping("/dossiers")
    public ReponsePaginee<DossierCnpsDto> listerDossiers(
            @RequestParam(required = false) StatutDossierCnps statut,
            @RequestParam(required = false) UUID adherentId,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "25") int taille,
            @AuthenticationPrincipal Utilisateur demandeur) {
        if (adherentId != null) {
            return new ReponsePaginee<>(List.of(serviceDossier.consulterParAdherent(adherentId, demandeur)),
                    0, 1, 1, 1, List.of());
        }
        return serviceDossier.lister(statut, PageRequest.of(page, Math.min(taille, 200)), demandeur);
    }

    @PostMapping("/dossiers")
    public ResponseEntity<DossierCnpsDto> ouvrirDossier(@RequestParam UUID adherentId,
                                                         @AuthenticationPrincipal Utilisateur auteur) {
        return ResponseEntity.status(201).body(serviceDossier.ouvrir(adherentId, auteur));
    }

    @GetMapping("/dossiers/{id}")
    public DossierCnpsDto consulterDossier(@PathVariable UUID id, @AuthenticationPrincipal Utilisateur demandeur) {
        return serviceDossier.consulter(id, demandeur);
    }

    @PostMapping("/dossiers/{id}/pieces")
    public DossierCnpsDto ajouterPiece(@PathVariable UUID id, @Valid @RequestBody AjoutPieceDto dto,
                                        @AuthenticationPrincipal Utilisateur auteur) {
        return serviceDossier.ajouterPiece(id, dto.documentId(), dto.typePiece(), auteur);
    }

    @PostMapping("/dossiers/{id}/statut")
    public DossierCnpsDto changerStatut(@PathVariable UUID id, @Valid @RequestBody ChangementStatutDossierDto dto,
                                         @AuthenticationPrincipal Utilisateur auteur) {
        return serviceDossier.changerStatut(id, dto.statut(), dto.commentaire(), auteur);
    }

    @GetMapping("/dossiers/{id}/pieces-manquantes")
    public List<PieceManquanteDto> piecesManquantes(@PathVariable UUID id,
                                                     @AuthenticationPrincipal Utilisateur demandeur) {
        return serviceDossier.piecesManquantes(id, demandeur);
    }

    @GetMapping("/eligibles-non-immatricules")
    public List<AdherentEligibleCnpsDto> eligiblesNonImmatricules(@RequestParam(required = false) UUID zoneId,
                                                                   @AuthenticationPrincipal Utilisateur demandeur) {
        return serviceDossier.eligiblesNonImmatricules(zoneId, demandeur);
    }

    // ------------------------------------------------------------ Déclarations

    @PostMapping("/declarations")
    public ResponseEntity<DeclarationCnpsDto> preparerDeclaration(@RequestParam UUID dossierId,
                                                                   @RequestParam String periode,
                                                                   @AuthenticationPrincipal Utilisateur auteur) {
        return ResponseEntity.status(201)
                .body(serviceDeclaration.preparer(dossierId, analyserPeriode(periode), auteur));
    }

    @GetMapping("/declarations")
    public List<DeclarationCnpsDto> listerDeclarations(@RequestParam UUID dossierId,
                                                        @AuthenticationPrincipal Utilisateur demandeur) {
        return serviceDeclaration.parDossier(dossierId, demandeur);
    }

    @GetMapping("/declarations/a-produire")
    public List<DeclarationCnpsDto> declarationsAProduire(@RequestParam String periode,
                                                           @AuthenticationPrincipal Utilisateur demandeur) {
        return serviceDeclaration.aProduire(analyserPeriode(periode), demandeur);
    }

    /**
     * L'accusé de réception est facultatif — il arrive souvent après la transmission — et passe donc en
     * <b>paramètre de requête, jamais en corps JSON optionnel</b>.
     *
     * <p>Motif, vérifié par test : avec {@code @RequestBody(required = false)}, un appel sans corps renvoie
     * {@code 500} ({@code HttpMediaTypeNotSupportedException}) dès que le client envoie un
     * {@code Content-Type} par défaut, ce que font aussi bien RestAssured qu'un navigateur. Même correction
     * qu'au jalon J5 sur {@code POST /paiements/{id}/confirmer-chef}.</p>
     */
    @PostMapping("/declarations/{id}/transmettre")
    public DeclarationCnpsDto transmettre(@PathVariable UUID id,
                                           @RequestParam(required = false) UUID accuseDocumentId,
                                           @AuthenticationPrincipal Utilisateur auteur) {
        return serviceDeclaration.marquerTransmise(id, accuseDocumentId, auteur);
    }

    /**
     * {@code periode=2026-09} (docs/03_SPECIFICATIONS_API.md §7). Analysé ici plutôt que par un convertisseur
     * Spring : une période illisible doit produire un 400 métier explicite, pas une erreur de liaison générique.
     */
    private static YearMonth analyserPeriode(String periode) {
        try {
            return YearMonth.parse(periode);
        } catch (DateTimeParseException e) {
            throw new cm.cositi.api.commun.exception.ExceptionValidation("CNPS_PERIODE_INVALIDE",
                    "La période doit être au format AAAA-MM (exemple : 2026-09).", "periode");
        }
    }
}
