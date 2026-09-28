package cm.cositi.api.cnps.controleur;

import cm.cositi.api.cnps.dto.AdherentEligibleCnpsDto;
import cm.cositi.api.cnps.dto.AjoutPieceDto;
import cm.cositi.api.cnps.dto.AjoutPiecePrestationDto;
import cm.cositi.api.cnps.dto.ChangementStatutDossierDto;
import cm.cositi.api.cnps.dto.ChangementStatutDossierPrestationDto;
import cm.cositi.api.cnps.dto.CreationDossierPrestationDto;
import cm.cositi.api.cnps.dto.CritereRechercheDossierPrestation;
import cm.cositi.api.cnps.dto.DeclarationCnpsDto;
import cm.cositi.api.cnps.dto.DossierCnpsDto;
import cm.cositi.api.cnps.dto.DossierPrestationCnpsDto;
import cm.cositi.api.cnps.dto.HistoriqueDossierPrestationCnpsDto;
import cm.cositi.api.cnps.dto.ModificationObservationsDto;
import cm.cositi.api.cnps.dto.OffreCnpsDto;
import cm.cositi.api.cnps.dto.PieceManquanteDto;
import cm.cositi.api.cnps.dto.PieceManquantePrestationDto;
import cm.cositi.api.cnps.dto.SituationImmatriculationCnpsDto;
import cm.cositi.api.cnps.entite.StatutDossierCnps;
import cm.cositi.api.cnps.entite.StatutDossierPrestationCnps;
import cm.cositi.api.cnps.service.ServiceDeclarationCnps;
import cm.cositi.api.cnps.service.ServiceDossierCnps;
import cm.cositi.api.cnps.service.ServiceDossierPrestationCnps;
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
 * {@code /cnps/declarations/a-produire}. {@code /cnps/immatriculations} est un ajout additif (module
 * Gestionnaire des comptes, écran Immatriculations) qui étend {@code /cnps/eligibles-non-immatricules}.</p>
 */
@RestController
@RequestMapping("/api/v1/cnps")
public class ControleurCnps {

    private final ServiceDossierCnps serviceDossier;
    private final ServiceDeclarationCnps serviceDeclaration;
    private final ServiceDossierPrestationCnps servicePrestation;

    public ControleurCnps(ServiceDossierCnps serviceDossier, ServiceDeclarationCnps serviceDeclaration,
                           ServiceDossierPrestationCnps servicePrestation) {
        this.serviceDossier = serviceDossier;
        this.serviceDeclaration = serviceDeclaration;
        this.servicePrestation = servicePrestation;
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

    /**
     * Écran Immatriculations du Gestionnaire des comptes ({@code FONCTIONALITE_GestComtes_V1.md} §7-§13) :
     * les deux populations (déjà immatriculés ou non) en un seul appel, le client dérive ses 3 onglets.
     */
    @GetMapping("/immatriculations")
    public List<SituationImmatriculationCnpsDto> situationsImmatriculation(
            @RequestParam(required = false) UUID zoneId, @AuthenticationPrincipal Utilisateur demandeur) {
        return serviceDossier.situationsImmatriculation(zoneId, demandeur);
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

    // --------------------------------------------------------- Dossiers de prestation (PF/RP/PVID)

    /**
     * Référentiel des offres par rubrique — {@code Conception/Gestionaires de comptes/FONCTIONALITE_GestComtes_V2.md}
     * §10-15/§34-39. Lecture seule, {@code rubrique} facultatif (PF/RP/PVID).
     */
    @GetMapping("/offres")
    public List<OffreCnpsDto> listerOffres(@RequestParam(required = false) String rubrique) {
        return servicePrestation.listerOffres(rubrique);
    }

    @GetMapping("/dossiers-prestation")
    public ReponsePaginee<DossierPrestationCnpsDto> listerDossiersPrestation(
            @RequestParam(required = false) String rubrique,
            @RequestParam(required = false) UUID offreId,
            @RequestParam(required = false) StatutDossierPrestationCnps statut,
            @RequestParam(required = false) String recherche,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "25") int taille,
            @AuthenticationPrincipal Utilisateur demandeur) {
        var critere = new CritereRechercheDossierPrestation(rubrique, offreId, statut, recherche);
        return servicePrestation.lister(critere, PageRequest.of(page, Math.min(taille, 200)), demandeur);
    }

    @PostMapping("/dossiers-prestation")
    public ResponseEntity<DossierPrestationCnpsDto> ouvrirDossierPrestation(
            @Valid @RequestBody CreationDossierPrestationDto dto, @AuthenticationPrincipal Utilisateur auteur) {
        return ResponseEntity.status(201).body(servicePrestation.ouvrir(dto, auteur));
    }

    @GetMapping("/dossiers-prestation/{id}")
    public DossierPrestationCnpsDto consulterDossierPrestation(@PathVariable UUID id,
                                                                @AuthenticationPrincipal Utilisateur demandeur) {
        return servicePrestation.consulter(id, demandeur);
    }

    @PostMapping("/dossiers-prestation/{id}/pieces")
    public DossierPrestationCnpsDto ajouterPiecePrestation(@PathVariable UUID id,
                                                            @Valid @RequestBody AjoutPiecePrestationDto dto,
                                                            @AuthenticationPrincipal Utilisateur auteur) {
        return servicePrestation.ajouterPiece(id, dto, auteur);
    }

    @PostMapping("/dossiers-prestation/{id}/statut")
    public DossierPrestationCnpsDto changerStatutPrestation(@PathVariable UUID id,
                                                             @Valid @RequestBody ChangementStatutDossierPrestationDto dto,
                                                             @AuthenticationPrincipal Utilisateur auteur) {
        return servicePrestation.changerStatut(id, dto, auteur);
    }

    @PostMapping("/dossiers-prestation/{id}/observations")
    public DossierPrestationCnpsDto modifierObservationsPrestation(@PathVariable UUID id,
                                                                    @RequestBody ModificationObservationsDto dto,
                                                                    @AuthenticationPrincipal Utilisateur auteur) {
        return servicePrestation.modifierObservations(id, dto.observations(), dto.prochaineRelanceLe(), auteur);
    }

    @GetMapping("/dossiers-prestation/{id}/pieces-manquantes")
    public List<PieceManquantePrestationDto> piecesManquantesPrestation(@PathVariable UUID id,
                                                                         @AuthenticationPrincipal Utilisateur demandeur) {
        return servicePrestation.piecesManquantes(id, demandeur);
    }

    /** Journal d'activité du dossier — jamais {@code AUDIT:CONSULTER} (voir Javadoc du service). */
    @GetMapping("/dossiers-prestation/{id}/journal")
    public List<HistoriqueDossierPrestationCnpsDto> journalPrestation(@PathVariable UUID id,
                                                                       @AuthenticationPrincipal Utilisateur demandeur) {
        return servicePrestation.journal(id, demandeur);
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
