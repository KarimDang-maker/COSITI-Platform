package cm.cositi.api.cotisation.service;

import cm.cositi.api.adherent.entite.Adherent;
import cm.cositi.api.adherent.entite.Adhesion;
import cm.cositi.api.adherent.entite.Pack;
import cm.cositi.api.adherent.repository.AdherentRepository;
import cm.cositi.api.adherent.repository.AdhesionRepository;
import cm.cositi.api.adherent.repository.PackRepository;
import cm.cositi.api.adherent.service.ServiceMatricule;
import cm.cositi.api.commun.exception.ExceptionRessourceIntrouvable;
import cm.cositi.api.commun.exception.ExceptionValidation;
import cm.cositi.api.cotisation.dto.ContexteCotisationDto;
import cm.cositi.api.organisation.repository.ZoneRepository;
import cm.cositi.api.parametre.ServiceParametre;
import cm.cositi.api.securite.entite.Utilisateur;
import cm.cositi.api.securite.service.ServicePerimetreDonnees;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.ArrayList;
import java.util.List;
import java.util.Locale;
import java.util.Optional;

/**
 * Identification de l'adhérent par son matricule avant la saisie d'une cotisation (prompt §7.1) : matricule existant
 * (unique en base, donc sans ambiguïté), adhérent dans le périmètre du demandeur, statut compatible. Lecture seule ;
 * l'enregistrement refait tous ces contrôles (le frontend masque, il ne protège pas).
 */
@Service
public class ServiceContexteCotisation {

    private final AdherentRepository adherentRepository;
    private final AdhesionRepository adhesionRepository;
    private final PackRepository packRepository;
    private final ZoneRepository zoneRepository;
    private final ServiceMatricule serviceMatricule;
    private final ServicePerimetreDonnees perimetre;
    private final RegleRepartitionCotisation regleRepartition;
    private final ServiceParametre serviceParametre;
    private final RegleFraisAvantCotisation regleFrais;

    public ServiceContexteCotisation(AdherentRepository adherentRepository, AdhesionRepository adhesionRepository,
                                     PackRepository packRepository, ZoneRepository zoneRepository,
                                     ServiceMatricule serviceMatricule, ServicePerimetreDonnees perimetre,
                                     RegleRepartitionCotisation regleRepartition, ServiceParametre serviceParametre,
                                     RegleFraisAvantCotisation regleFrais) {
        this.adherentRepository = adherentRepository;
        this.adhesionRepository = adhesionRepository;
        this.packRepository = packRepository;
        this.zoneRepository = zoneRepository;
        this.serviceMatricule = serviceMatricule;
        this.perimetre = perimetre;
        this.regleRepartition = regleRepartition;
        this.serviceParametre = serviceParametre;
        this.regleFrais = regleFrais;
    }

    @PreAuthorize("hasAuthority('PAIEMENT:CREER')")
    @Transactional(readOnly = true)
    public ContexteCotisationDto parMatricule(String matriculeSaisi, Utilisateur demandeur) {
        String matricule = matriculeSaisi == null ? null : matriculeSaisi.trim().toUpperCase(Locale.ROOT);
        if (!serviceMatricule.estValide(matricule)) {
            throw new ExceptionValidation("ADHERENT_MATRICULE_INVALIDE",
                    "Le matricule doit avoir la forme COSITI-00001.", "matricule");
        }
        Adherent adherent = adherentRepository.findByMatricule(matricule)
                .orElseThrow(() -> new ExceptionRessourceIntrouvable("ADHERENT_INTROUVABLE",
                        "Aucun adhérent ne porte ce matricule."));
        perimetre.verifierAccesAdherent(demandeur, adherent.getId());

        Optional<Pack> pack = adhesionRepository.findByAdherentIdAndDateFinIsNull(adherent.getId())
                .map(Adhesion::getPackId).flatMap(packRepository::findById);

        List<String> motifs = new ArrayList<>();
        if (adherent.isArchive()) {
            motifs.add("Adhérent archivé : aucune cotisation ne peut lui être rattachée.");
        }
        if (ServicePaiementImpl.statutsRefuses(serviceParametre).contains(adherent.getStatut())) {
            motifs.add("Aucune cotisation n'est acceptée pour un adhérent au statut " + adherent.getStatut() + ".");
        }
        regleFrais.motifBlocage(adherent).ifPresent(motifs::add);
        RegleRepartitionCotisation.Seuils seuils = regleRepartition.seuils();
        String zone = adherent.getZoneId() == null ? null
                : zoneRepository.findById(adherent.getZoneId()).map(z -> z.getLibelle()).orElse(null);
        return new ContexteCotisationDto(adherent.getId(), adherent.getMatricule(), adherent.getNom(),
                adherent.getPrenoms(), adherent.getTelephonePrincipal(), zone, adherent.getStatut(),
                adherent.getStatutValidation(), pack.map(Pack::getId).orElse(null),
                pack.map(Pack::getCode).orElse(null), pack.map(Pack::getLibelle).orElse(null), pack.isEmpty(),
                seuils.minimumSecuriteSociale(), seuils.minimumEpargne(), seuils.epargneFacultative(),
                motifs.isEmpty(), motifs, seuils.avertissements());
    }
}
