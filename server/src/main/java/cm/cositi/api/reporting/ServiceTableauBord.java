package cm.cositi.api.reporting;

import cm.cositi.api.adherent.AdherentRepository;
import cm.cositi.api.cotisation.Paiement;
import cm.cositi.api.cotisation.PaiementRepository;
import cm.cositi.api.cotisation.RemiseCaisseRepository;
import cm.cositi.api.reporting.dto.TableauBordDafDto;
import cm.cositi.api.reporting.dto.TableauBordDirectionDto;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;

@Service
@Transactional(readOnly = true)
public class ServiceTableauBord {

    private final AdherentRepository adherentRepository;
    private final PaiementRepository paiementRepository;
    private final RemiseCaisseRepository remiseCaisseRepository;

    public ServiceTableauBord(
            AdherentRepository adherentRepository,
            PaiementRepository paiementRepository,
            RemiseCaisseRepository remiseCaisseRepository) {
        this.adherentRepository = adherentRepository;
        this.paiementRepository = paiementRepository;
        this.remiseCaisseRepository = remiseCaisseRepository;
    }

    public TableauBordDirectionDto getTableauBordDirection() {
        long totalAdherents = adherentRepository.count();
        long actifs = adherentRepository.findByStatut("ACTIF", org.springframework.data.domain.Pageable.unpaged()).getTotalElements();
        long retards = adherentRepository.findByStatut("EN_RETARD", org.springframework.data.domain.Pageable.unpaged()).getTotalElements();

        // Taux d'activation = adhérents ayant cotisé au moins une fois / effectif total
        // Sur le benchmark de départ : 115 / 172 n'ont jamais cotisé
        List<Paiement> validés = paiementRepository.findAll().stream()
                .filter(p -> "VALIDE".equalsIgnoreCase(p.getStatut()))
                .toList();

        long cotisantsUniques = validés.stream().map(Paiement::getAdherentId).distinct().count();
        double tauxActivation = totalAdherents > 0 ? ((double) cotisantsUniques / totalAdherents) * 100.0 : 0.0;
        long jamaisCotise = Math.max(0, totalAdherents - cotisantsUniques);

        LocalDate debutMois = LocalDate.now().withDayOfMonth(1);
        BigDecimal collecteMois = validés.stream()
                .filter(p -> !p.getDatePaiement().isBefore(debutMois))
                .map(Paiement::getMontant)
                .reduce(BigDecimal.ZERO, BigDecimal::add);

        BigDecimal cumulAnnee = validés.stream()
                .filter(p -> p.getDatePaiement().getYear() == LocalDate.now().getYear())
                .map(Paiement::getMontant)
                .reduce(BigDecimal.ZERO, BigDecimal::add);

        return new TableauBordDirectionDto(
                totalAdherents,
                actifs,
                jamaisCotise,
                retards,
                Math.round(tauxActivation * 10.0) / 10.0,
                collecteMois,
                cumulAnnee
        );
    }

    public TableauBordDafDto getTableauBordDaf() {
        List<Paiement> paiements = paiementRepository.findAll();
        long aControler = paiements.stream().filter(p -> "A_CONTROLER".equalsIgnoreCase(p.getStatut())).count();
        long confirmesChef = paiements.stream().filter(p -> p.getConfirmeParChefId() != null && "A_CONTROLER".equalsIgnoreCase(p.getStatut())).count();
        long sansRef = paiements.stream()
                .filter(p -> ("ORANGE_MONEY".equals(p.getModePaiement()) || "MTN_MOMO".equals(p.getModePaiement()))
                        && (p.getReferenceTransaction() == null || p.getReferenceTransaction().isBlank()))
                .count();

        long remisesEnEcart = remiseCaisseRepository.findByStatut("EN_ECART").size();

        return new TableauBordDafDto(
                BigDecimal.ZERO,
                remisesEnEcart,
                aControler,
                sansRef,
                confirmesChef,
                BigDecimal.ZERO
        );
    }
}
