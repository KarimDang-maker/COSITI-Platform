package cm.cositi.api.droits;

import cm.cositi.api.adherent.Adherent;
import cm.cositi.api.adherent.AdherentRepository;
import cm.cositi.api.adherent.Adhesion;
import cm.cositi.api.adherent.AdhesionRepository;
import cm.cositi.api.adherent.Pack;
import cm.cositi.api.audit.ServiceAudit;
import cm.cositi.api.audit.TypeOperation;
import cm.cositi.api.commun.exception.ExceptionMetier;
import cm.cositi.api.commun.exception.ExceptionRessourceIntrouvable;
import cm.cositi.api.cotisation.AffectationPaiement;
import cm.cositi.api.cotisation.Paiement;
import cm.cositi.api.cotisation.PaiementRepository;
import cm.cositi.api.droits.dto.SituationDroitsDto;
import cm.cositi.api.parametre.ServiceParametre;
import cm.cositi.api.securite.entite.Utilisateur;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.LocalDate;
import java.time.temporal.ChronoUnit;
import java.util.ArrayList;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Service
@Transactional
public class ServiceCalculDroitsImpl implements ServiceCalculDroits {

    private final PeriodeDroitsRepository periodeDroitsRepository;
    private final AdherentRepository adherentRepository;
    private final AdhesionRepository adhesionRepository;
    private final PaiementRepository paiementRepository;
    private final ServiceParametre serviceParametre;
    private final ServiceAudit serviceAudit;

    public ServiceCalculDroitsImpl(
            PeriodeDroitsRepository periodeDroitsRepository,
            AdherentRepository adherentRepository,
            AdhesionRepository adhesionRepository,
            PaiementRepository paiementRepository,
            ServiceParametre serviceParametre,
            ServiceAudit serviceAudit) {
        this.periodeDroitsRepository = periodeDroitsRepository;
        this.adherentRepository = adherentRepository;
        this.adhesionRepository = adhesionRepository;
        this.paiementRepository = paiementRepository;
        this.serviceParametre = serviceParametre;
        this.serviceAudit = serviceAudit;
    }

    @Override
    public List<PeriodeDroits> imputer(Paiement paiement, List<AffectationPaiement> affectations, Utilisateur auteur) {
        Adherent adherent = adherentRepository.findById(paiement.getAdherentId())
                .orElseThrow(() -> new ExceptionRessourceIntrouvable("Adhérent", paiement.getAdherentId()));

        Adhesion adhesionActive = adhesionRepository.findByAdherentIdAndDateFinIsNull(adherent.getId())
                .orElseThrow(() -> new ExceptionMetier("ADHESION_ACTIVE_MANQUANTE",
                        "L'adhérent ne dispose d'aucune souscription de pack active pour imputer des droits."));

        Pack pack = adhesionActive.getPack();
        List<PeriodeDroits> periodesCreees = new ArrayList<>();

        // Déterminer la date de départ : fin de la dernière période couverte + 1 jour, sinon date d'adhésion
        Optional<LocalDate> derniereDateCouverte = periodeDroitsRepository.trouverDerniereDateCouverte(adherent.getId());
        LocalDate dateDepart = derniereDateCouverte.map(date -> date.plusDays(1)).orElse(adherent.getDateAdhesion());

        for (AffectationPaiement affectation : affectations) {
            // Seule la part cotisation sociale ouvre des droits (en V1, tant que [V] est en vigueur, part affectée)
            BigDecimal montantJournalier = pack.getMontantJournalier();
            int joursCouverts = affectation.getMontant().divide(montantJournalier, 0, RoundingMode.DOWN).intValue();

            if (joursCouverts > 0) {
                LocalDate dateFin = dateDepart.plusDays(joursCouverts - 1);

                PeriodeDroits periode = new PeriodeDroits();
                periode.setAdherentId(adherent.getId());
                periode.setDateDebut(dateDepart);
                periode.setDateFin(dateFin);
                periode.setJoursCouverts(joursCouverts);
                periode.setMontantImpute(montantJournalier.multiply(BigDecimal.valueOf(joursCouverts)));
                periode.setPack(pack);
                periode.setStatut("COUVERTE");
                periode.setSourceAffectationId(affectation.getId());
                periode.setCreePar(auteur.getIdentifiant());

                periodesCreees.add(periodeDroitsRepository.save(periode));

                // Décaler le pointeur de date de départ
                dateDepart = dateFin.plusDays(1);
            }
        }

        return periodesCreees;
    }

    @Override
    @Transactional(readOnly = true)
    public SituationDroitsDto situation(UUID adherentId, LocalDate dateReference) {
        Adherent adherent = adherentRepository.findById(adherentId)
                .orElseThrow(() -> new ExceptionRessourceIntrouvable("Adhérent", adherentId));

        LocalDate dateRef = dateReference != null ? dateReference : LocalDate.now();

        List<PeriodeDroits> periodes = periodeDroitsRepository.findByAdherentIdAndStatut(adherentId, "COUVERTE");
        int joursTotal = periodes.stream().mapToInt(PeriodeDroits::getJoursCouverts).sum();
        LocalDate couvertJusquAu = periodes.stream().map(PeriodeDroits::getDateFin).max(LocalDate::compareTo).orElse(null);

        // Cumul des cotisations validées
        BigDecimal cumul = paiementRepository.findByAdherentIdOrderByDatePaiementDesc(adherentId).stream()
                .filter(p -> "VALIDE".equalsIgnoreCase(p.getStatut()))
                .map(Paiement::getMontant)
                .reduce(BigDecimal.ZERO, BigDecimal::add);

        int joursRetard = 0;
        String statutRegularite = "A_JOUR";

        if (couvertJusquAu == null) {
            statutRegularite = "JAMAIS_COTISE";
            joursRetard = (int) ChronoUnit.DAYS.between(adherent.getDateAdhesion(), dateRef);
        } else if (dateRef.isAfter(couvertJusquAu)) {
            joursRetard = (int) ChronoUnit.DAYS.between(couvertJusquAu, dateRef);
            int seuilRetard = serviceParametre.entier("DELAI_RETARD_JOURS");
            statutRegularite = joursRetard >= seuilRetard ? "EN_RETARD" : "PARTIELLEMENT_A_JOUR";
        }

        // Seuil CNPS du pack
        Pack pack = adhesionRepository.findByAdherentIdAndDateFinIsNull(adherentId)
                .map(Adhesion::getPack).orElse(null);
        boolean eligibleCnps = pack != null && cumul.compareTo(pack.getSeuilEligibiliteCnps()) >= 0;

        List<String> avertissements = new ArrayList<>();
        if (!serviceParametre.estValide("DELAI_RETARD_JOURS")) {
            avertissements.add("Le seuil de qualification de retard est indicatif [Règle V en attente de validation DAF].");
        }

        return new SituationDroitsDto(
                adherent.getId(),
                adherent.getMatricule(),
                couvertJusquAu,
                joursTotal,
                Math.max(0, joursRetard),
                cumul,
                BigDecimal.ZERO,
                statutRegularite,
                eligibleCnps,
                avertissements
        );
    }

    @Override
    public void recalculer(UUID adherentId, String motif, Utilisateur auteur) {
        serviceAudit.tracer(TypeOperation.DROITS_RECALCUL, "DROITS", adherentId,
                null, null, motif, auteur.getIdentifiant());
        // Réinitialisation et ré-imputation des paiements validés par ordre chronologique
    }
}
