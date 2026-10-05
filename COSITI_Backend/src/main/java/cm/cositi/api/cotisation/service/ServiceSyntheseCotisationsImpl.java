package cm.cositi.api.cotisation.service;

import cm.cositi.api.adherent.entite.Adherent;
import cm.cositi.api.adherent.entite.Adhesion;
import cm.cositi.api.adherent.entite.Pack;
import cm.cositi.api.adherent.repository.AdherentRepository;
import cm.cositi.api.adherent.repository.AdhesionRepository;
import cm.cositi.api.adherent.repository.PackRepository;
import cm.cositi.api.commun.exception.ExceptionRessourceIntrouvable;
import cm.cositi.api.cotisation.dto.SyntheseCotisationsAdherentDto;
import cm.cositi.api.cotisation.dto.SyntheseCotisationsAdherentDto.CompteCotisationDto;
import cm.cositi.api.parametre.ServiceParametre;
import cm.cositi.api.securite.entite.Utilisateur;
import cm.cositi.api.securite.service.ServicePerimetreDonnees;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.sql.Date;
import java.time.Instant;
import java.time.LocalDate;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.UUID;

/**
 * Agrégations SQL en une transaction de lecture : aucune liste de cotisations n'est chargée en mémoire, et le résultat
 * ne dépend pas d'une taille de page (l'ancien résumé ne lisait que les 200 dernières cotisations).
 */
@Service
public class ServiceSyntheseCotisationsImpl implements ServiceSyntheseCotisations {

    static final String CODE_SECURITE_SOCIALE = "CNPS";
    static final String CODE_EPARGNE = "EPARGNE";
    private static final String CLE_COMPOSANTES_IMPUTABLES = "DROITS_COMPOSANTES_IMPUTABLES";

    private final JdbcTemplate jdbcTemplate;
    private final AdherentRepository adherentRepository;
    private final AdhesionRepository adhesionRepository;
    private final PackRepository packRepository;
    private final ServicePerimetreDonnees perimetre;
    private final ServiceParametre serviceParametre;

    public ServiceSyntheseCotisationsImpl(JdbcTemplate jdbcTemplate, AdherentRepository adherentRepository,
                                          AdhesionRepository adhesionRepository, PackRepository packRepository,
                                          ServicePerimetreDonnees perimetre, ServiceParametre serviceParametre) {
        this.jdbcTemplate = jdbcTemplate;
        this.adherentRepository = adherentRepository;
        this.adhesionRepository = adhesionRepository;
        this.packRepository = packRepository;
        this.perimetre = perimetre;
        this.serviceParametre = serviceParametre;
    }

    /** Agrégat d'un statut de cotisation. */
    record ParStatut(long nombre, BigDecimal montant, BigDecimal securiteSociale, BigDecimal epargne,
                     BigDecimal nonReparti, LocalDate derniere) {
        static final ParStatut VIDE = new ParStatut(0, BigDecimal.ZERO, BigDecimal.ZERO, BigDecimal.ZERO,
                BigDecimal.ZERO, null);

        ParStatut plus(ParStatut autre) {
            LocalDate d = derniere == null ? autre.derniere
                    : autre.derniere == null || derniere.isAfter(autre.derniere) ? derniere : autre.derniere;
            return new ParStatut(nombre + autre.nombre, montant.add(autre.montant),
                    securiteSociale.add(autre.securiteSociale), epargne.add(autre.epargne),
                    nonReparti.add(autre.nonReparti), d);
        }
    }

    /** Affectations validées d'une composante. */
    record ParComposante(BigDecimal montant, long nombre, LocalDate derniere) {
        static final ParComposante VIDE = new ParComposante(BigDecimal.ZERO, 0, null);
    }

    @Override
    @PreAuthorize("hasAuthority('PAIEMENT:LIRE')")
    @Transactional(readOnly = true)
    public SyntheseCotisationsAdherentDto synthese(UUID adherentId, Utilisateur demandeur) {
        Adherent adherent = adherentRepository.findById(adherentId)
                .orElseThrow(() -> new ExceptionRessourceIntrouvable("ADHERENT_INTROUVABLE", "Adhérent introuvable."));
        perimetre.verifierAccesAdherent(demandeur, adherentId);

        Optional<Pack> pack = adhesionRepository.findByAdherentIdAndDateFinIsNull(adherentId)
                .map(Adhesion::getPackId).flatMap(packRepository::findById);

        Map<String, ParStatut> statuts = new HashMap<>();
        jdbcTemplate.query("""
                SELECT statut, COUNT(*) AS nombre, COALESCE(SUM(montant), 0) AS montant,
                       COALESCE(SUM(montant_securite_sociale), 0) AS ss, COALESCE(SUM(montant_epargne), 0) AS ep,
                       COALESCE(SUM(montant) FILTER (WHERE montant_securite_sociale IS NULL), 0) AS non_reparti,
                       MAX(date_paiement) AS derniere
                FROM paiement WHERE adherent_id = ? AND archive = false GROUP BY statut""",
                rs -> {
                    Date derniere = rs.getDate("derniere");
                    statuts.put(rs.getString("statut"), new ParStatut(rs.getLong("nombre"), rs.getBigDecimal("montant"),
                            rs.getBigDecimal("ss"), rs.getBigDecimal("ep"), rs.getBigDecimal("non_reparti"),
                            derniere == null ? null : derniere.toLocalDate()));
                }, adherentId);

        Map<String, ParComposante> composantes = new HashMap<>();
        jdbcTemplate.query("""
                SELECT c.code, COALESCE(SUM(ap.montant), 0) AS montant, COUNT(DISTINCT p.id) AS nombre,
                       MAX(p.date_paiement) AS derniere
                FROM affectation_paiement ap
                JOIN paiement p ON p.id = ap.paiement_id
                JOIN composante_affectation c ON c.id = ap.composante_id
                WHERE p.adherent_id = ? AND p.archive = false AND p.statut IN ('VALIDE', 'RAPPROCHE')
                GROUP BY c.code""",
                rs -> {
                    Date derniere = rs.getDate("derniere");
                    composantes.put(rs.getString("code"), new ParComposante(rs.getBigDecimal("montant"),
                            rs.getLong("nombre"), derniere == null ? null : derniere.toLocalDate()));
                }, adherentId);

        BigDecimal cumulImpute = jdbcTemplate.queryForObject(
                "SELECT COALESCE(SUM(montant_impute), 0) FROM periode_droits WHERE adherent_id = ? AND statut <> 'ANNULEE'",
                BigDecimal.class, adherentId);

        ParStatut valides = statuts.getOrDefault("VALIDE", ParStatut.VIDE)
                .plus(statuts.getOrDefault("RAPPROCHE", ParStatut.VIDE));
        ParStatut enAttente = statuts.getOrDefault("A_CONTROLER", ParStatut.VIDE)
                .plus(statuts.getOrDefault("INCOHERENCE", ParStatut.VIDE));
        ParStatut brouillons = statuts.getOrDefault("BROUILLON", ParStatut.VIDE);

        ParComposante ss = composantes.getOrDefault(CODE_SECURITE_SOCIALE, ParComposante.VIDE);
        ParComposante ep = composantes.getOrDefault(CODE_EPARGNE, ParComposante.VIDE);
        BigDecimal autres = composantes.entrySet().stream()
                .filter(e -> !CODE_SECURITE_SOCIALE.equals(e.getKey()) && !CODE_EPARGNE.equals(e.getKey()))
                .map(e -> e.getValue().montant()).reduce(BigDecimal.ZERO, BigDecimal::add);

        BigDecimal seuil = pack.map(Pack::getSeuilEligibiliteCnps).orElse(null);
        BigDecimal cumul = cumulImpute == null ? BigDecimal.ZERO : cumulImpute;

        List<String> avertissements = new ArrayList<>();
        if (pack.isEmpty()) {
            avertissements.add("Aucun pack choisi : il le sera à la prochaine cotisation. Le seuil d'éligibilité CNPS, "
                    + "le reste avant seuil et le taux de progression ne peuvent pas encore être calculés.");
        }
        if (enAttente.nonReparti().signum() > 0) {
            avertissements.add("Des cotisations en attente, antérieures à la répartition à la saisie, n'ont pas de "
                    + "répartition : leur part Sécurité sociale / Épargne sera fixée à leur validation.");
        }
        if (autres.signum() > 0) {
            avertissements.add("Des versements validés avant la répartition confirmée restent affectés à d'autres "
                    + "composantes (" + autres + " FCFA) : ils ne figurent dans aucun des deux comptes.");
        }
        if (!serviceParametre.estValide(CLE_COMPOSANTES_IMPUTABLES)) {
            avertissements.add("Les composantes qui ouvrent des droits (DROITS_COMPOSANTES_IMPUTABLES) ne sont pas "
                    + "validées par la COSITI : le cumul imputé compte le versement entier.");
        }

        return new SyntheseCotisationsAdherentDto(
                adherentId, adherent.getMatricule(),
                pack.map(Pack::getId).orElse(null), pack.map(Pack::getCode).orElse(null),
                pack.map(Pack::getLibelle).orElse(null), pack.isEmpty(),
                new CompteCotisationDto("SECURITE_SOCIALE", ss.montant(), enAttente.securiteSociale(), ss.nombre(),
                        ss.derniere()),
                new CompteCotisationDto("EPARGNE", ep.montant(), enAttente.epargne(), ep.nombre(), ep.derniere()),
                autres,
                valides.montant().add(enAttente.montant()),
                valides.montant(), valides.nombre(),
                enAttente.montant(), enAttente.nombre(), enAttente.nonReparti(),
                brouillons.montant(), brouillons.nombre(),
                statuts.getOrDefault("REJETE", ParStatut.VIDE).nombre(),
                statuts.getOrDefault("ANNULE", ParStatut.VIDE).nombre(),
                seuil, cumul,
                ServiceSyntheseCotisations.resteAvantSeuil(seuil, cumul),
                ServiceSyntheseCotisations.tauxProgression(seuil, cumul),
                seuil != null && cumul.compareTo(seuil) >= 0,
                valides.derniere(), Instant.now(), avertissements);
    }
}
