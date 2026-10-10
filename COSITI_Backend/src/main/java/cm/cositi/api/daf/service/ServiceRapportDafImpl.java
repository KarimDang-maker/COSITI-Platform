package cm.cositi.api.daf.service;

import cm.cositi.api.audit.ServiceAudit;
import cm.cositi.api.audit.TypeOperation;
import cm.cositi.api.commun.exception.ExceptionConflit;
import cm.cositi.api.commun.exception.ExceptionRessourceIntrouvable;
import cm.cositi.api.commun.exception.ExceptionValidation;
import cm.cositi.api.commun.reponse.ReponsePaginee;
import cm.cositi.api.daf.dto.ProductionRapportDto;
import cm.cositi.api.daf.dto.RapportDafDto;
import cm.cositi.api.daf.entite.RapportDaf;
import cm.cositi.api.daf.entite.StatutRapportDaf;
import cm.cositi.api.daf.repository.RapportDafRepository;
import cm.cositi.api.notification.ServiceNotification;
import cm.cositi.api.securite.entite.Utilisateur;
import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;

/**
 * Production et transmission des rapports financiers du DAF au PCA (jalon J10, flux
 * {@code Roles des acteurs.md §12.3}).
 *
 * <p><b>Les chiffres sont constatés par le serveur, jamais fournis par l'appelant</b> : un rapport dont
 * les montants viendraient du client ne prouverait rien. Ils sont ensuite <b>figés</b> dans le rapport et
 * ne sont plus recalculés — c'est ce qui permet au PCA de relire dans six mois le rapport qui a fondé une
 * décision.</p>
 *
 * <p>La visibilité suit le flux : un rapport n'est lisible par le PCA, le DG et la DGA qu'une fois
 * <b>transmis</b>. Avant cela, il n'appartient qu'à son auteur — un brouillon de rapport financier
 * consulté comme un rapport officiel serait une confusion coûteuse.</p>
 */
@Service
public class ServiceRapportDafImpl implements ServiceRapportDaf {

    private static final String ROLE_DAF = "DAF";

    private final RapportDafRepository rapportRepository;
    private final ServiceNotification serviceNotification;
    private final ServiceAudit serviceAudit;
    private final JdbcTemplate jdbcTemplate;
    private final ObjectMapper objectMapper;

    public ServiceRapportDafImpl(RapportDafRepository rapportRepository, ServiceNotification serviceNotification,
                                  ServiceAudit serviceAudit, JdbcTemplate jdbcTemplate, ObjectMapper objectMapper) {
        this.rapportRepository = rapportRepository;
        this.serviceNotification = serviceNotification;
        this.serviceAudit = serviceAudit;
        this.jdbcTemplate = jdbcTemplate;
        this.objectMapper = objectMapper;
    }

    @Override
    @PreAuthorize("hasAuthority('RAPPORT_DAF:PRODUIRE')")
    @Transactional
    public RapportDafDto produire(ProductionRapportDto dto, Utilisateur daf) {
        if (dto.periodeFin().isBefore(dto.periodeDebut())) {
            throw new ExceptionValidation("RAPPORT_PERIODE_INVALIDE",
                    "La fin de période ne peut pas précéder son début.", "periodeFin");
        }
        if (dto.periodeDebut().isAfter(LocalDate.now())) {
            throw new ExceptionValidation("RAPPORT_PERIODE_FUTURE",
                    "Un rapport porte sur une période écoulée.", "periodeDebut");
        }

        RapportDaf rapport = new RapportDaf(dto.titre(), dto.periodeDebut(), dto.periodeFin());
        rapport.setCommentaire(dto.commentaire());

        Chiffres chiffres = constater(dto.periodeDebut(), dto.periodeFin());
        rapport.produire(chiffres.montantValide(), chiffres.montantAControler(), chiffres.nbPaiementsValides(),
                chiffres.nbIncoherences(), enJson(chiffres.detail()), daf.getIdentifiant());

        rapport = rapportRepository.save(rapport);

        serviceAudit.tracer(TypeOperation.RAPPORT_DAF_PRODUCTION, "rapport_daf", rapport.getId(), null,
                RapportDafDto.depuis(rapport), "Période du " + dto.periodeDebut() + " au " + dto.periodeFin());

        return RapportDafDto.depuis(rapport);
    }

    @Override
    @PreAuthorize("hasAuthority('RAPPORT_DAF:TRANSMETTRE')")
    @Transactional
    public RapportDafDto transmettreAuPca(UUID rapportId, Utilisateur daf) {
        RapportDaf rapport = charger(rapportId);

        if (rapport.getStatut() == StatutRapportDaf.TRANSMIS) {
            throw new ExceptionConflit("RAPPORT_DEJA_TRANSMIS",
                    "Ce rapport a déjà été transmis au PCA : il ne peut pas l'être une seconde fois.");
        }
        if (rapport.getStatut() != StatutRapportDaf.PRODUIT) {
            throw new ExceptionConflit("RAPPORT_NON_PRODUIT",
                    "Seul un rapport produit peut être transmis.");
        }

        rapport.transmettre(daf.getIdentifiant());
        rapport = rapportRepository.save(rapport);

        // Le PCA est le destinataire du flux (Roles des acteurs.md §12.3). La notification part au rôle :
        // le PCA est une fonction, pas un compte nommé d'avance.
        serviceNotification.notifierRoles(List.of("PCA"), "RAPPORT_DAF_TRANSMIS",
                "Rapport financier disponible",
                "Le DAF a transmis le rapport « " + rapport.getTitre() + " » (période du "
                        + rapport.getPeriodeDebut() + " au " + rapport.getPeriodeFin() + ").",
                "rapport_daf", rapport.getId());

        serviceAudit.tracer(TypeOperation.RAPPORT_DAF_TRANSMISSION, "rapport_daf", rapport.getId(),
                StatutRapportDaf.PRODUIT, StatutRapportDaf.TRANSMIS, "Mise à disposition du PCA");

        return RapportDafDto.depuis(rapport);
    }

    @Override
    @PreAuthorize("hasAuthority('RAPPORT_DAF:LIRE')")
    public RapportDafDto consulter(UUID rapportId, Utilisateur demandeur) {
        RapportDaf rapport = charger(rapportId);
        verifierVisibilite(rapport, demandeur);
        return RapportDafDto.depuis(rapport);
    }

    @Override
    @PreAuthorize("hasAuthority('RAPPORT_DAF:LIRE')")
    public ReponsePaginee<RapportDafDto> lister(StatutRapportDaf statut, Pageable pageable, Utilisateur demandeur) {
        Page<RapportDaf> page = statut != null
                ? rapportRepository.findByStatutOrderByPeriodeFinDesc(statut, pageable)
                : rapportRepository.findAllByOrderByPeriodeFinDesc(pageable);

        // Un non-DAF ne voit que les rapports transmis : un brouillon n'est pas un rapport.
        boolean estDaf = demandeur.possedeRole(ROLE_DAF);
        List<RapportDafDto> visibles = page.getContent().stream()
                .filter(rapport -> estDaf || rapport.getStatut().estVisibleDuPca())
                .map(RapportDafDto::depuis)
                .toList();

        return ReponsePaginee.depuis(
                new org.springframework.data.domain.PageImpl<>(visibles, pageable, page.getTotalElements()));
    }

    // ------------------------------------------------------------------ Interne

    /** Chiffres constatés sur la période, au moment de la production. */
    private record Chiffres(BigDecimal montantValide, BigDecimal montantAControler, int nbPaiementsValides,
                             int nbIncoherences, Map<String, Object> detail) {
    }

    private Chiffres constater(LocalDate debut, LocalDate fin) {
        BigDecimal montantValide = montant("""
                SELECT COALESCE(SUM(montant), 0) FROM paiement
                WHERE statut IN ('VALIDE', 'RAPPROCHE') AND date_paiement BETWEEN ? AND ?
                """, debut, fin);
        BigDecimal montantAControler = montant("""
                SELECT COALESCE(SUM(montant), 0) FROM paiement
                WHERE statut = 'A_CONTROLER' AND date_paiement BETWEEN ? AND ?
                """, debut, fin);
        int nbValides = entier("""
                SELECT COUNT(*) FROM paiement
                WHERE statut IN ('VALIDE', 'RAPPROCHE') AND date_paiement BETWEEN ? AND ?
                """, debut, fin);
        int nbIncoherences = entier("""
                SELECT COUNT(*) FROM paiement
                WHERE statut = 'INCOHERENCE' AND date_paiement BETWEEN ? AND ?
                """, debut, fin);
        int nbAnnules = entier("""
                SELECT COUNT(*) FROM paiement
                WHERE statut = 'ANNULE' AND date_paiement BETWEEN ? AND ?
                """, debut, fin);
        int nbRemisesEnEcart = entier("""
                SELECT COUNT(*) FROM remise_caisse
                WHERE statut = 'EN_ECART' AND date_remise BETWEEN ? AND ?
                """, debut, fin);

        // `LinkedHashMap` : l'ordre des indicateurs est celui dans lequel ils se lisent dans le rapport.
        Map<String, Object> detail = new LinkedHashMap<>();
        detail.put("montantValide", montantValide);
        detail.put("montantAControler", montantAControler);
        detail.put("nbPaiementsValides", nbValides);
        detail.put("nbIncoherences", nbIncoherences);
        detail.put("nbPaiementsAnnules", nbAnnules);
        detail.put("nbRemisesCaisseEnEcart", nbRemisesEnEcart);
        detail.put("avertissement", "COSITI enregistre les informations de paiement et n'exécute aucun "
                + "mouvement de fonds : ces montants sont des encaissements déclarés puis contrôlés, "
                + "jamais un solde de trésorerie.");

        return new Chiffres(montantValide, montantAControler, nbValides, nbIncoherences, detail);
    }

    private void verifierVisibilite(RapportDaf rapport, Utilisateur demandeur) {
        if (demandeur.possedeRole(ROLE_DAF) || rapport.getStatut().estVisibleDuPca()) {
            return;
        }
        throw new cm.cositi.api.commun.exception.ExceptionAutorisation("RAPPORT_NON_TRANSMIS",
                "Ce rapport n'a pas encore été transmis : il n'est pas consultable.");
    }

    private RapportDaf charger(UUID id) {
        return rapportRepository.findById(id)
                .orElseThrow(() -> new ExceptionRessourceIntrouvable("RAPPORT_INTROUVABLE",
                        "Rapport introuvable."));
    }

    private String enJson(Map<String, Object> detail) {
        try {
            return objectMapper.writeValueAsString(detail);
        } catch (JsonProcessingException e) {
            throw new IllegalStateException("Le contenu du rapport n'est pas sérialisable.", e);
        }
    }

    private BigDecimal montant(String sql, Object... parametres) {
        BigDecimal valeur = jdbcTemplate.queryForObject(sql, BigDecimal.class, parametres);
        return valeur != null ? valeur : BigDecimal.ZERO;
    }

    private int entier(String sql, Object... parametres) {
        Integer valeur = jdbcTemplate.queryForObject(sql, Integer.class, parametres);
        return valeur != null ? valeur : 0;
    }
}
