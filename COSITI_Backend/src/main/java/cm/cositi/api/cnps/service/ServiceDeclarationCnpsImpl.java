package cm.cositi.api.cnps.service;

import cm.cositi.api.audit.ServiceAudit;
import cm.cositi.api.audit.TypeOperation;
import cm.cositi.api.cnps.dto.DeclarationCnpsDto;
import cm.cositi.api.cnps.entite.DeclarationCnps;
import cm.cositi.api.cnps.entite.DossierCnps;
import cm.cositi.api.cnps.entite.StatutDeclarationCnps;
import cm.cositi.api.cnps.repository.DeclarationCnpsRepository;
import cm.cositi.api.cnps.repository.DossierCnpsRepository;
import cm.cositi.api.commun.exception.ExceptionConflit;
import cm.cositi.api.commun.exception.ExceptionRessourceIntrouvable;
import cm.cositi.api.commun.exception.ExceptionValidation;
import cm.cositi.api.parametre.ServiceParametre;
import cm.cositi.api.securite.entite.Utilisateur;
import cm.cositi.api.securite.service.ServicePerimetreDonnees;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.YearMonth;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;

/**
 * Déclarations mensuelles CNPS (jalon J7).
 *
 * <p><b>Ce que fait le calcul, et ce qu'il refuse de faire.</b> Le montant déclaré est la somme des montants
 * réellement imputés sur le mois par le calcul de droits ({@code periode_droits}, jalon J6) — une donnée
 * constatée, issue de paiements validés. Il n'applique <b>ni</b> le taux CNPS, <b>ni</b> une assiette
 * reconstituée à partir du revenu déclaré : le paramètre {@code ASSIETTE_CNPS} est marqué {@code [V]}, la
 * COSITI n'a pas arbitré, et un taux appliqué à tort produirait un montant faux mais crédible — le pire des
 * résultats sur un flux financier. Tant que l'arbitrage n'est pas rendu, chaque déclaration porte
 * l'avertissement correspondant.</p>
 *
 * <p><b>Répartition d'une période à cheval sur deux mois</b> : une période de droits qui déborde du mois
 * demandé est comptée au prorata de ses jours tombant dans le mois. C'est la seule façon de ne pas compter
 * deux fois le même versement sur deux déclarations mensuelles consécutives.</p>
 */
@Service
public class ServiceDeclarationCnpsImpl implements ServiceDeclarationCnps {

    private static final Logger JOURNAL = LoggerFactory.getLogger(ServiceDeclarationCnpsImpl.class);

    static final String CLE_ASSIETTE = "ASSIETTE_CNPS";

    private final DeclarationCnpsRepository declarationRepository;
    private final DossierCnpsRepository dossierRepository;
    private final ServicePerimetreDonnees perimetre;
    private final ServiceParametre serviceParametre;
    private final ServiceAudit serviceAudit;
    private final JdbcTemplate jdbcTemplate;

    public ServiceDeclarationCnpsImpl(DeclarationCnpsRepository declarationRepository,
                                       DossierCnpsRepository dossierRepository, ServicePerimetreDonnees perimetre,
                                       ServiceParametre serviceParametre, ServiceAudit serviceAudit,
                                       JdbcTemplate jdbcTemplate) {
        this.declarationRepository = declarationRepository;
        this.dossierRepository = dossierRepository;
        this.perimetre = perimetre;
        this.serviceParametre = serviceParametre;
        this.serviceAudit = serviceAudit;
        this.jdbcTemplate = jdbcTemplate;
    }

    @Override
    @PreAuthorize("hasAuthority('CNPS:DECLARER')")
    @Transactional
    public DeclarationCnpsDto preparer(UUID dossierId, YearMonth periode, Utilisateur auteur) {
        if (periode == null) {
            throw new ExceptionValidation("CNPS_PERIODE_REQUISE", "La période (mois) est obligatoire.", "periode");
        }
        DossierCnps dossier = chargerDossier(dossierId);
        perimetre.verifierAccesAdherent(auteur, dossier.getAdherentId());

        LocalDate premierJour = periode.atDay(1);
        var existante = declarationRepository.findByDossierIdAndPeriodeMois(dossierId, premierJour);
        if (existante.isPresent()) {
            // Idempotent : préparer deux fois le même mois ne crée pas de doublon (contrainte
            // uq_declaration_mois), et ne réécrit pas une déclaration déjà partie à la CNPS.
            return DeclarationCnpsDto.depuis(existante.get(), avertissements(dossier));
        }

        BigDecimal montant = montantImputeSurLeMois(dossier.getAdherentId(), periode);
        DeclarationCnps declaration = new DeclarationCnps(dossierId, premierJour, montant, auteur.getIdentifiant());
        declaration = declarationRepository.save(declaration);

        serviceAudit.tracer(TypeOperation.CNPS_DECLARATION_TRANSMISE, "declaration_cnps", declaration.getId(),
                null, montant, "Préparation de la déclaration " + periode);

        if (!serviceParametre.estValide(CLE_ASSIETTE)) {
            JOURNAL.warn("Déclaration CNPS {} préparée alors que la règle d'assiette ({}) n'est pas validée : "
                    + "montant fondé sur les droits imputés du mois.", declaration.getId(), CLE_ASSIETTE);
        }

        return DeclarationCnpsDto.depuis(declaration, avertissements(dossier));
    }

    @Override
    @PreAuthorize("hasAuthority('CNPS:DECLARER')")
    @Transactional
    public DeclarationCnpsDto marquerTransmise(UUID declarationId, UUID accuseDocumentId, Utilisateur auteur) {
        DeclarationCnps declaration = declarationRepository.findById(declarationId)
                .orElseThrow(() -> new ExceptionRessourceIntrouvable("CNPS_DECLARATION_INTROUVABLE",
                        "Déclaration CNPS introuvable."));
        DossierCnps dossier = chargerDossier(declaration.getDossierId());
        perimetre.verifierAccesAdherent(auteur, dossier.getAdherentId());

        if (declaration.getStatut() != StatutDeclarationCnps.A_PRODUIRE) {
            throw new ExceptionConflit("CNPS_DECLARATION_TRANSITION_INTERDITE",
                    "Cette déclaration est déjà " + declaration.getStatut() + " : elle ne peut plus être transmise.");
        }

        declaration.marquerTransmise(accuseDocumentId, LocalDate.now());
        declaration = declarationRepository.save(declaration);

        serviceAudit.tracer(TypeOperation.CNPS_DECLARATION_TRANSMISE, "declaration_cnps", declaration.getId(),
                StatutDeclarationCnps.A_PRODUIRE, StatutDeclarationCnps.TRANSMISE,
                "Transmission déclarée par " + auteur.getIdentifiant());

        return DeclarationCnpsDto.depuis(declaration, avertissements(dossier));
    }

    @Override
    @PreAuthorize("hasAuthority('CNPS:LIRE')")
    public List<DeclarationCnpsDto> aProduire(YearMonth periode, Utilisateur demandeur) {
        if (periode == null) {
            throw new ExceptionValidation("CNPS_PERIODE_REQUISE", "La période (mois) est obligatoire.", "periode");
        }
        return declarationRepository.findByPeriodeMoisAndStatut(periode.atDay(1), StatutDeclarationCnps.A_PRODUIRE)
                .stream()
                .filter(d -> dossierRepository.findById(d.getDossierId())
                        .map(dossier -> perimetre.peutAccederAdherent(demandeur, dossier.getAdherentId()))
                        .orElse(false))
                .map(DeclarationCnpsDto::depuis)
                .toList();
    }

    @Override
    @PreAuthorize("hasAuthority('CNPS:LIRE')")
    public List<DeclarationCnpsDto> parDossier(UUID dossierId, Utilisateur demandeur) {
        DossierCnps dossier = chargerDossier(dossierId);
        perimetre.verifierAccesAdherent(demandeur, dossier.getAdherentId());
        return declarationRepository.findByDossierIdOrderByPeriodeMoisDesc(dossierId).stream()
                .map(DeclarationCnpsDto::depuis)
                .toList();
    }

    // ------------------------------------------------------------------
    // Interne
    // ------------------------------------------------------------------

    /**
     * Somme des montants imputés au prorata des jours tombant dans le mois demandé.
     *
     * <p>Lecture SQL directe de {@code periode_droits} plutôt que via le service du paquet {@code droits} :
     * même motif qu'au jalon J6, éviter un cycle de paquetages. Les périodes {@code ANNULEE} sont exclues —
     * une période annulée par un recalcul ne doit jamais ressortir dans une déclaration.</p>
     */
    private BigDecimal montantImputeSurLeMois(UUID adherentId, YearMonth periode) {
        LocalDate debutMois = periode.atDay(1);
        LocalDate finMois = periode.atEndOfMonth();

        String sql = """
                SELECT pd.date_debut, pd.date_fin, pd.jours_couverts, pd.montant_impute
                FROM periode_droits pd
                WHERE pd.adherent_id = ?
                  AND pd.statut <> 'ANNULEE'
                  AND pd.date_debut <= ?
                  AND pd.date_fin >= ?
                """;

        List<BigDecimal> parts = jdbcTemplate.query(sql, (rs, ligne) -> {
            LocalDate debut = rs.getDate("date_debut").toLocalDate();
            LocalDate fin = rs.getDate("date_fin").toLocalDate();
            int joursCouverts = rs.getInt("jours_couverts");
            BigDecimal montant = rs.getBigDecimal("montant_impute");

            if (joursCouverts <= 0 || montant == null) {
                return BigDecimal.ZERO;
            }
            LocalDate debutEffectif = debut.isBefore(debutMois) ? debutMois : debut;
            LocalDate finEffective = fin.isAfter(finMois) ? finMois : fin;
            long joursDansLeMois = java.time.temporal.ChronoUnit.DAYS.between(debutEffectif, finEffective) + 1;
            if (joursDansLeMois <= 0) {
                return BigDecimal.ZERO;
            }
            if (joursDansLeMois >= joursCouverts) {
                return montant;
            }
            return montant.multiply(BigDecimal.valueOf(joursDansLeMois))
                    .divide(BigDecimal.valueOf(joursCouverts), 2, java.math.RoundingMode.DOWN);
        }, adherentId, finMois, debutMois);

        return parts.stream().reduce(BigDecimal.ZERO, BigDecimal::add);
    }

    private List<String> avertissements(DossierCnps dossier) {
        List<String> avertissements = new ArrayList<>();
        if (!serviceParametre.estValide(CLE_ASSIETTE)) {
            avertissements.add("L'assiette de cotisation CNPS (ASSIETTE_CNPS) n'est pas validée par la COSITI : "
                    + "le montant déclaré correspond aux droits réellement imputés sur le mois, aucun taux ni "
                    + "aucune assiette n'est appliqué.");
        }
        if (dossier.getRevenuMensuelDeclare() == null) {
            avertissements.add("Le revenu mensuel déclaré de l'adhérent n'est pas renseigné : il n'entre donc pas "
                    + "dans le calcul, et aucune valeur n'est déduite à sa place.");
        }
        return avertissements;
    }

    private DossierCnps chargerDossier(UUID dossierId) {
        return dossierRepository.findById(dossierId)
                .orElseThrow(() -> new ExceptionRessourceIntrouvable("CNPS_DOSSIER_INTROUVABLE",
                        "Dossier CNPS introuvable."));
    }
}
