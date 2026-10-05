package cm.cositi.api.historique;

import cm.cositi.api.audit.TypeOperation;
import cm.cositi.api.commun.reponse.ReponsePaginee;
import cm.cositi.api.historique.dto.CritereHistorique;
import cm.cositi.api.historique.dto.EvenementHistoriqueDto;
import cm.cositi.api.securite.entite.Utilisateur;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.Parameter;
import io.swagger.v3.oas.annotations.tags.Tag;
import org.springframework.data.domain.Sort;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.time.LocalDate;
import java.util.Set;
import java.util.UUID;

/**
 * Bouton « Historique » du dossier (règles module 3) : deux historiques distincts, paginés et filtrés par le serveur.
 * Routes françaises, convention du projet ({@code /history} et {@code /financial-history} du prompt sont des cibles
 * fonctionnelles, pas des noms imposés).
 */
@Tag(name = "Adhérents — historiques", description = "Historique général et historique financier du dossier")
@RestController
@RequestMapping("/api/v1/adherents/{id}")
public class ControleurHistoriqueAdherent {

    private final ServiceHistoriqueAdherent serviceHistorique;

    public ControleurHistoriqueAdherent(ServiceHistoriqueAdherent serviceHistorique) {
        this.serviceHistorique = serviceHistorique;
    }

    @Operation(summary = "Historique général du dossier",
            description = "Création, informations personnelles et professionnelles, coordonnées, documents, contrôle "
                    + "DGA, CNPS (immatriculation, télédéclaration), statut, demandes de validation, portefeuille. "
                    + "Filtre : `periode` (JOUR, SEMAINE, MOIS, ANNEE) avec `date` de référence, ou `du` / `au` inclus.")
    @GetMapping("/historique-general")
    public ReponsePaginee<EvenementHistoriqueDto> historiqueGeneral(
            @PathVariable UUID id,
            @RequestParam(required = false) PeriodeHistorique periode,
            @Parameter(description = "Jour de référence de la période (aujourd'hui par défaut)")
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate date,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate du,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate au,
            @RequestParam(required = false) Set<TypeOperation> type,
            @RequestParam(required = false) String module,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "25") int taille,
            @Parameter(description = "Ordre chronologique : DESC (plus récent d'abord) ou ASC")
            @RequestParam(defaultValue = "DESC") Sort.Direction direction,
            @AuthenticationPrincipal Utilisateur demandeur) {
        return serviceHistorique.historique(id, CategorieHistorique.GENERAL,
                new CritereHistorique(periode, date, du, au, type, module), page, taille, direction, demandeur);
    }

    @Operation(summary = "Historique financier du dossier",
            description = "Frais d'adhésion, cotisations (saisie, contrôle, validation, rejet, correction, annulation), "
                    + "répartitions Sécurité sociale / Épargne, périodes de droits, demandes de correction. Les "
                    + "opérations internes de la DAF ne sont visibles qu'avec RAPPORT_DAF:LIRE.")
    @GetMapping("/historique-financier")
    public ReponsePaginee<EvenementHistoriqueDto> historiqueFinancier(
            @PathVariable UUID id,
            @RequestParam(required = false) PeriodeHistorique periode,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate date,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate du,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate au,
            @RequestParam(required = false) Set<TypeOperation> type,
            @RequestParam(required = false) String module,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "25") int taille,
            @RequestParam(defaultValue = "DESC") Sort.Direction direction,
            @AuthenticationPrincipal Utilisateur demandeur) {
        return serviceHistorique.historique(id, CategorieHistorique.FINANCIER,
                new CritereHistorique(periode, date, du, au, type, module), page, taille, direction, demandeur);
    }
}
