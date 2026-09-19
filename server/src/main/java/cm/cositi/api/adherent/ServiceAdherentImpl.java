package cm.cositi.api.adherent;

import cm.cositi.api.adherent.dto.*;
import cm.cositi.api.audit.ServiceAudit;
import cm.cositi.api.audit.TypeOperation;
import cm.cositi.api.commun.exception.ExceptionConflit;
import cm.cositi.api.commun.exception.ExceptionRessourceIntrouvable;
import cm.cositi.api.commun.reponse.ReponsePaginee;
import cm.cositi.api.organisation.*;
import cm.cositi.api.securite.entite.Utilisateur;
import cm.cositi.api.securite.service.ServicePerimetreDonnees;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.time.LocalDate;
import java.util.List;
import java.util.UUID;

@Service
@Transactional
public class ServiceAdherentImpl implements ServiceAdherent {

    private final AdherentRepository adherentRepository;
    private final ActiviteRepository activiteRepository;
    private final ZoneRepository zoneRepository;
    private final AssociationRepository associationRepository;
    private final PackRepository packRepository;
    private final AdhesionRepository adhesionRepository;
    private final AgentRepository agentRepository;
    private final AffectationPortefeuilleRepository affectationPortefeuilleRepository;
    private final ServiceMatricule serviceMatricule;
    private final ServiceDoublonAdherent serviceDoublonAdherent;
    private final ServicePerimetreDonnees servicePerimetreDonnees;
    private final ServiceAudit serviceAudit;

    public ServiceAdherentImpl(
            AdherentRepository adherentRepository,
            ActiviteRepository activiteRepository,
            ZoneRepository zoneRepository,
            AssociationRepository associationRepository,
            PackRepository packRepository,
            AdhesionRepository adhesionRepository,
            AgentRepository agentRepository,
            AffectationPortefeuilleRepository affectationPortefeuilleRepository,
            ServiceMatricule serviceMatricule,
            ServiceDoublonAdherent serviceDoublonAdherent,
            ServicePerimetreDonnees servicePerimetreDonnees,
            ServiceAudit serviceAudit) {
        this.adherentRepository = adherentRepository;
        this.activiteRepository = activiteRepository;
        this.zoneRepository = zoneRepository;
        this.associationRepository = associationRepository;
        this.packRepository = packRepository;
        this.adhesionRepository = adhesionRepository;
        this.agentRepository = agentRepository;
        this.affectationPortefeuilleRepository = affectationPortefeuilleRepository;
        this.serviceMatricule = serviceMatricule;
        this.serviceDoublonAdherent = serviceDoublonAdherent;
        this.servicePerimetreDonnees = servicePerimetreDonnees;
        this.serviceAudit = serviceAudit;
    }

    @Override
    public AdherentDetailDto creer(CreationAdherentDto dto, Utilisateur auteur) {
        // 1. Contrôle des doublons
        List<CandidatDoublonDto> candidats = serviceDoublonAdherent.rechercher(
                new CritereDoublonDto(dto.telephonePrincipal(), dto.numeroCni(), dto.nom(), dto.prenoms(), dto.zoneId())
        );
        if (!candidats.isEmpty() && !dto.confirmationDoublonIgnore()) {
            throw new ExceptionConflit("ADHERENT_DOUBLON_POTENTIEL",
                    "Un ou plusieurs adhérents similaires existent déjà dans la base. Veuillez vérifier la liste.");
        }

        // 2. Chargement des référentiels
        Activite activite = activiteRepository.findById(dto.activiteId())
                .orElseThrow(() -> new ExceptionRessourceIntrouvable("Activité", dto.activiteId()));
        Zone zone = zoneRepository.findById(dto.zoneId())
                .orElseThrow(() -> new ExceptionRessourceIntrouvable("Zone", dto.zoneId()));
        Pack pack = packRepository.findById(dto.packId())
                .orElseThrow(() -> new ExceptionRessourceIntrouvable("Pack", dto.packId()));
        Association association = dto.associationId() != null
                ? associationRepository.findById(dto.associationId()).orElse(null) : null;

        // 3. Génération du matricule immuable COSITI-0000N
        String matricule = serviceMatricule.genererProchain();

        // 4. Instanciation et persistance de l'adhérent
        Adherent adherent = new Adherent();
        adherent.setMatricule(matricule);
        adherent.setNom(dto.nom());
        adherent.setPrenoms(dto.prenoms());
        adherent.setDateNaissance(dto.dateNaissance());
        adherent.setSexe(dto.sexe());
        adherent.setTelephonePrincipal(dto.telephonePrincipal());
        adherent.setTelephoneSecondaire(dto.telephoneSecondaire());
        adherent.setNumeroCni(dto.numeroCni());
        adherent.setNumeroCnps(dto.numeroCnps());
        adherent.setActivite(activite);
        adherent.setZone(zone);
        adherent.setAssociation(association);
        adherent.setLocalisation(dto.localisation());
        adherent.setQuartier(dto.quartier());
        adherent.setVille(dto.ville());
        adherent.setLatitude(dto.latitude());
        adherent.setLongitude(dto.longitude());
        adherent.setDateAdhesion(dto.dateAdhesion());
        adherent.setStatut("PREINSCRIT");
        adherent.setInscriptionPayee(dto.inscriptionPayee());
        if (dto.consentementDonnees()) {
            adherent.setConsentementDonneesLe(Instant.now());
        }

        adherent = adherentRepository.save(adherent);

        // 5. Création de l'adhésion au pack
        Adhesion adhesion = new Adhesion();
        adhesion.setAdherentId(adherent.getId());
        adhesion.setPack(pack);
        adhesion.setDateDebut(dto.dateAdhesion());
        adhesion.setAuteurId(auteur.getId());
        adhesionRepository.save(adhesion);

        // 6. Affectation du portefeuille si agent référent précisé
        Agent agentReferent = null;
        if (dto.agentReferentId() != null) {
            agentReferent = agentRepository.findById(dto.agentReferentId()).orElse(null);
            if (agentReferent != null) {
                AffectationPortefeuille affectation = new AffectationPortefeuille();
                affectation.setAdherentId(adherent.getId());
                affectation.setAgent(agentReferent);
                affectation.setDateDebut(dto.dateAdhesion());
                affectation.setMotif("Affectation initiale à l'enrôlement");
                affectation.setAuteurId(auteur.getId());
                affectationPortefeuilleRepository.save(affectation);
            }
        }

        // 7. Traçabilité et Audit
        serviceAudit.tracer(TypeOperation.ADHERENT_CREATION, "ADHERENT", adherent.getId(),
                null, adherent, "Création adhérent " + matricule, auteur.getIdentifiant());

        if (dto.confirmationDoublonIgnore()) {
            serviceAudit.tracer(TypeOperation.ADHERENT_DOUBLON_IGNORE, "ADHERENT", adherent.getId(),
                    null, candidats, "Confirmation forcée d'enrôlement malgré alerte de doublon", auteur.getIdentifiant());
        }

        return mapToDetailDto(adherent, pack, agentReferent);
    }

    @Override
    @Transactional(readOnly = true)
    public AdherentDetailDto consulter(UUID id, Utilisateur demandeur) {
        servicePerimetreDonnees.verifierAccesAdherent(demandeur, id);

        Adherent adherent = adherentRepository.findById(id)
                .orElseThrow(() -> new ExceptionRessourceIntrouvable("Adhérent", id));

        Pack packActuel = adhesionRepository.findByAdherentIdAndDateFinIsNull(id)
                .map(Adhesion::getPack)
                .orElse(null);

        Agent agentReferent = affectationPortefeuilleRepository.findByAdherentIdAndDateFinIsNull(id)
                .map(AffectationPortefeuille::getAgent)
                .orElse(null);

        return mapToDetailDto(adherent, packActuel, agentReferent);
    }

    @Override
    @Transactional(readOnly = true)
    public ReponsePaginee<AdherentResumeDto> rechercher(String recherche, UUID zoneId, String statut,
                                                         Pageable pageable, Utilisateur demandeur) {
        Page<Adherent> page = adherentRepository.rechercher(recherche, zoneId, statut, pageable);

        List<AdherentResumeDto> elements = page.getContent().stream().map(a -> {
            String packLibelle = adhesionRepository.findByAdherentIdAndDateFinIsNull(a.getId())
                    .map(adh -> adh.getPack().getLibelle()).orElse("Aucun");
            String agentNom = affectationPortefeuilleRepository.findByAdherentIdAndDateFinIsNull(a.getId())
                    .map(ap -> ap.getAgent().getNomComplet()).orElse("Sans agent");

            return new AdherentResumeDto(
                    a.getId(),
                    a.getMatricule(),
                    a.getNom() + " " + (a.getPrenoms() != null ? a.getPrenoms() : ""),
                    a.getTelephonePrincipal(),
                    a.getActivite().getLibelle(),
                    a.getZone().getLibelle(),
                    agentNom,
                    packLibelle,
                    a.getStatut(),
                    null,
                    null
            );
        }).toList();

        return new ReponsePaginee<>(
                elements,
                page.getNumber(),
                page.getSize(),
                page.getTotalElements(),
                page.getTotalPages()
        );
    }

    @Override
    public void archiver(UUID id, String motif, Utilisateur auteur) {
        Adherent adherent = adherentRepository.findById(id)
                .orElseThrow(() -> new ExceptionRessourceIntrouvable("Adhérent", id));
        adherent.archiver(auteur.getIdentifiant(), motif);
        adherentRepository.save(adherent);

        serviceAudit.tracer(TypeOperation.ADHERENT_ARCHIVAGE, "ADHERENT", id,
                null, null, motif, auteur.getIdentifiant());
    }

    @Override
    public void changerStatut(UUID id, String nouveauStatut, String motif, Utilisateur auteur) {
        Adherent adherent = adherentRepository.findById(id)
                .orElseThrow(() -> new ExceptionRessourceIntrouvable("Adhérent", id));
        String ancienStatut = adherent.getStatut();
        adherent.setStatut(nouveauStatut);
        adherentRepository.save(adherent);

        serviceAudit.tracer(TypeOperation.ADHERENT_CHANGEMENT_STATUT, "ADHERENT", id,
                ancienStatut, nouveauStatut, motif, auteur.getIdentifiant());
    }

    @Override
    public void changerPack(UUID id, UUID packId, LocalDate effetLe, Utilisateur auteur) {
        Pack nouveauPack = packRepository.findById(packId)
                .orElseThrow(() -> new ExceptionRessourceIntrouvable("Pack", packId));

        // Clore l'adhésion précédente
        adhesionRepository.findByAdherentIdAndDateFinIsNull(id).ifPresent(adhesionActive -> {
            adhesionActive.setDateFin(effetLe.minusDays(1));
            adhesionRepository.save(adhesionActive);
        });

        // Ouvrir la nouvelle adhésion
        Adhesion nouvelleAdhesion = new Adhesion();
        nouvelleAdhesion.setAdherentId(id);
        nouvelleAdhesion.setPack(nouveauPack);
        nouvelleAdhesion.setDateDebut(effetLe);
        nouvelleAdhesion.setAuteurId(auteur.getId());
        nouvelleAdhesion.setMotifChangement("Changement vers " + nouveauPack.getLibelle());
        adhesionRepository.save(nouvelleAdhesion);
    }

    private AdherentDetailDto mapToDetailDto(Adherent a, Pack pack, Agent agent) {
        return new AdherentDetailDto(
                a.getId(),
                a.getMatricule(),
                a.getNom(),
                a.getPrenoms(),
                a.getDateNaissance(),
                a.getSexe(),
                a.getTelephonePrincipal(),
                a.getTelephoneSecondaire(),
                a.getNumeroCni(),
                a.getNumeroCnps(),
                a.getActivite().getId(),
                a.getActivite().getLibelle(),
                a.getZone().getId(),
                a.getZone().getLibelle(),
                a.getAssociation() != null ? a.getAssociation().getId() : null,
                a.getAssociation() != null ? a.getAssociation().getNom() : null,
                a.getLocalisation(),
                a.getQuartier(),
                a.getVille(),
                a.getDateAdhesion(),
                a.getStatut(),
                a.isInscriptionPayee(),
                pack != null ? pack.getId() : null,
                pack != null ? pack.getLibelle() : null,
                agent != null ? agent.getId() : null,
                agent != null ? agent.getNomComplet() : null
        );
    }
}
