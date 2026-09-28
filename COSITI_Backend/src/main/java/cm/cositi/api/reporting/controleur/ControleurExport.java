package cm.cositi.api.reporting.controleur;

import cm.cositi.api.reporting.service.ServiceExport;
import cm.cositi.api.securite.entite.Utilisateur;
import org.springframework.core.io.ByteArrayResource;
import org.springframework.core.io.Resource;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.ContentDisposition;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.nio.charset.StandardCharsets;
import java.time.Instant;
import java.time.LocalDate;
import java.util.UUID;

/**
 * docs/03_SPECIFICATIONS_API.md §10 — Exports (jalon J10).
 *
 * <p>Le pack décrit un export asynchrone en deux temps ({@code POST /exports/x} puis
 * {@code GET /exports/{id}}). Au volume de la V1 (172 adhérents), l'export est <b>synchrone</b> : le
 * fichier revient directement dans la réponse. Au-delà de {@code EXPORT_SEUIL_LIGNES}, il est refusé avec
 * un message explicite plutôt que de bloquer la requête — écart consigné dans
 * {@code Conception/SUIVI_EXECUTION.md}, avec {@code GET /exports/{id}} non construit.</p>
 *
 * <p>Le fichier est produit en mémoire et jamais écrit sur disque (docs/04_SECURITE.md §4 : « jamais de
 * fichier laissé sur disque après téléchargement »).</p>
 */
@RestController
@RequestMapping("/api/v1/exports")
public class ControleurExport {

    /**
     * Les tableurs francophones lisent le CSV en séparateur point-virgule, et attendent un BOM UTF-8 pour
     * afficher correctement les accents. Sans lui, « Éloundou » s'ouvre en « Ã‰loundou » dans Excel.
     */
    private static final byte[] BOM_UTF8 = {(byte) 0xEF, (byte) 0xBB, (byte) 0xBF};

    private final ServiceExport serviceExport;

    public ControleurExport(ServiceExport serviceExport) {
        this.serviceExport = serviceExport;
    }

    @PostMapping("/adherents")
    public ResponseEntity<Resource> adherents(@RequestParam(required = false) UUID zoneId,
                                               @RequestParam(required = false) String statut,
                                               @AuthenticationPrincipal Utilisateur demandeur) {
        return reponse(serviceExport.exporterAdherents(zoneId, statut, demandeur));
    }

    @PostMapping("/paiements")
    public ResponseEntity<Resource> paiements(
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate du,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate au,
            @RequestParam(required = false) String statut,
            @AuthenticationPrincipal Utilisateur demandeur) {
        return reponse(serviceExport.exporterPaiements(du, au, statut, demandeur));
    }

    @PostMapping("/cnps")
    public ResponseEntity<Resource> cnps(@RequestParam(required = false) String statut,
                                          @AuthenticationPrincipal Utilisateur demandeur) {
        return reponse(serviceExport.exporterDossiersCnps(statut, demandeur));
    }

    /** Réservé au Super Administrateur (correctif COSITI V1 §3) — voir {@code ServiceExport#exporterAudit}. */
    @PostMapping("/audit")
    public ResponseEntity<Resource> audit(@RequestParam(required = false) String entite,
                                           @RequestParam(required = false) String type,
                                           @RequestParam(required = false) Instant depuis,
                                           @RequestParam(required = false) Instant jusqua,
                                           @AuthenticationPrincipal Utilisateur demandeur) {
        return reponse(serviceExport.exporterAudit(entite, type, depuis, jusqua, demandeur));
    }

    private ResponseEntity<Resource> reponse(ServiceExport.FichierExport fichier) {
        byte[] contenu = fichier.contenuCsv().getBytes(StandardCharsets.UTF_8);
        byte[] avecBom = new byte[BOM_UTF8.length + contenu.length];
        System.arraycopy(BOM_UTF8, 0, avecBom, 0, BOM_UTF8.length);
        System.arraycopy(contenu, 0, avecBom, BOM_UTF8.length, contenu.length);

        ContentDisposition disposition = ContentDisposition.attachment()
                .filename(fichier.nomFichier(), StandardCharsets.UTF_8)
                .build();

        return ResponseEntity.ok()
                .contentType(new MediaType("text", "csv", StandardCharsets.UTF_8))
                .header(HttpHeaders.CONTENT_DISPOSITION, disposition.toString())
                // Données personnelles : jamais mises en cache par un intermédiaire.
                .header(HttpHeaders.CACHE_CONTROL, "no-store")
                .header("X-Nombre-Lignes", String.valueOf(fichier.nbLignes()))
                .body(new ByteArrayResource(avecBom));
    }
}
