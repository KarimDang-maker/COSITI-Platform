package cm.cositi.api.adherent.service;

import cm.cositi.api.adherent.dto.AdherentDetailDto;
import cm.cositi.api.adherent.dto.AdherentResumeDto;
import cm.cositi.api.adherent.dto.AdhesionDto;
import cm.cositi.api.adherent.dto.CreationAdherentDto;
import cm.cositi.api.adherent.dto.CritereRechercheAdherent;
import cm.cositi.api.adherent.dto.ModificationAdherentDto;
import cm.cositi.api.adherent.entite.Adherent;
import cm.cositi.api.adherent.entite.Adhesion;
import cm.cositi.api.adherent.entite.StatutAdherent;
import cm.cositi.api.adherent.exception.ExceptionDoublonPotentiel;
import cm.cositi.api.adherent.repository.AdhesionRepository;
import cm.cositi.api.adherent.repository.AdherentRepository;
import cm.cositi.api.adherent.repository.PackRepository;
import cm.cositi.api.audit.ServiceAudit;
import cm.cositi.api.audit.TypeOperation;
import cm.cositi.api.commun.exception.ExceptionConflit;
import cm.cositi.api.commun.exception.ExceptionRessourceIntrouvable;
import cm.cositi.api.commun.exception.ExceptionValidation;
import cm.cositi.api.commun.reponse.ReponsePaginee;
import cm.cositi.api.organisation.repository.ZoneRepository;
import cm.cositi.api.securite.entite.Utilisateur;
import cm.cositi.api.securite.service.ServicePerimetreDonnees;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.util.List;
import java.util.UUID;

@Service
public class ServiceAdherentImpl implements ServiceAdherent {

    private final AdherentRepository adherentRepository;
    private final AdhesionRepository adhesionRepository;
    private final PackRepository packRepository;
    private final ServiceMatricule serviceMatricule;
    private final ServiceDoublonAdherent serviceDoublonAdherent;
    private final ServicePerimetreDonnees perimetre;
    private final ServiceAudit serviceAudit;
    private final ZoneRepository zoneRepository;

    public ServiceAdherentImpl(AdherentRepository adherentRepository, AdhesionRepository adhesionRepository,
                                PackRepository packRepository, ServiceMatricule serviceMatricule,
                                ServiceDoublonAdherent serviceDoublonAdherent, ServicePerimetreDonnees perimetre,
                                ServiceAudit serviceAudit, ZoneRepository zoneRepository) {
        this.adherentRepository = adherentRepository;
        this.adhesionRepository = adhesionRepository;
        this.packRepository = packRepository;
        this.serviceMatricule = serviceMatricule;
        this.serviceDoublonAdherent = serviceDoublonAdherent;
        this.perimetre = perimetre;
        this.serviceAudit = serviceAudit;
        this.zoneRepository = zoneRepository;
    }

    @Override
    @PreAuthorize("hasAuthority('ADHERENT:CREER')")
    @Transactional
    public AdherentDetailDto creer(CreationAdherentDto dto, Utilisateur auteur) {
        if (!packRepository.findById(dto.packId()).map(p -> p.isActif()).orElse(false)) {
            throw new ExceptionValidation("ADHERENT_PACK_INVALIDE", "Le pack sélectionné est introuvable ou inactif.");
        }

        String nomComplet = dto.prenoms() != null ? dto.nom() + " " + dto.prenoms() : dto.nom();
        List<CandidatDoublon> candidats = serviceDoublonAdherent.rechercher(
                new CritereDoublon(dto.telephonePrincipal(), dto.numeroCni(), nomComplet, dto.zoneId()));

        if (!candidats.isEmpty() && !dto.confirmationDoublonIgnore()) {
            throw new ExceptionDoublonPotentiel(candidats);
        }

        String matricule = serviceMatricule.genererProchain();
        Adherent adherent = new Adherent(matricule, dto.nom(), dto.telephonePrincipal(), dto.activiteId(),
                dto.zoneId(), dto.localisation(), dto.dateAdhesion());
        adherent.setPrenoms(dto.prenoms());
        adherent.setDateNaissance(dto.dateNaissance());
        adherent.setSexe(dto.sexe());
        adherent.setTelephoneSecondaire(dto.telephoneSecondaire());
        adherent.setNumeroCni(dto.numeroCni());
        adherent.setNumeroCnps(dto.numeroCnps());
        adherent.setAssociationId(dto.associationId());
        adherent.setQuartier(dto.quartier());
        adherent.setVille(dto.ville());
        adherent.setLatitude(dto.latitude());
        adherent.setLongitude(dto.longitude());
        if (dto.consentementDonnees()) {
            adherent.setConsentementDonneesLe(java.time.Instant.now());
        }
        adherent = adherentRepository.save(adherent);

        Adhesion adhesion = new Adhesion(adherent.getId(), dto.packId(), dto.dateAdhesion(),
                "Adhésion initiale", auteur.getId());
        adhesionRepository.save(adhesion);

        if (!candidats.isEmpty()) {
            serviceAudit.tracer(TypeOperation.ADHERENT_DOUBLON_IGNORE, "adherent", adherent.getId(), null,
                    candidats, "Création confirmée malgré " + candidats.size() + " doublon(s) potentiel(s).");
        }
        serviceAudit.tracer(TypeOperation.ADHERENT_CREATION, "adherent", adherent.getId(), null,
                AdherentDetailDto.depuis(adherent), null);

        return AdherentDetailDto.depuis(adherent);
    }

    @Override
    @PreAuthorize("hasAuthority('ADHERENT:LIRE')")
    public AdherentDetailDto consulter(UUID id, Utilisateur demandeur) {
        perimetre.verifierAccesAdherent(demandeur, id);
        Adherent adherent = charger(id);
        // La fiche affiche le nom de la zone : sans lui, l'écran montrait un tiret.
        String zoneLibelle = zoneRepository.findById(adherent.getZoneId())
                .map(z -> z.getLibelle()).orElse(null);
        return AdherentDetailDto.depuis(adherent, zoneLibelle);
    }

    @Override
    @PreAuthorize("hasAuthority('ADHERENT:MODIFIER')")
    @Transactional
    public AdherentDetailDto modifier(UUID id, ModificationAdherentDto dto, Utilisateur auteur) {
        perimetre.verifierAccesAdherent(auteur, id);
        Adherent adherent = charger(id);
        AdherentDetailDto avant = AdherentDetailDto.depuis(adherent);

        adherent.setNom(dto.nom());
        adherent.setPrenoms(dto.prenoms());
        adherent.setDateNaissance(dto.dateNaissance());
        adherent.setSexe(dto.sexe());
        adherent.setTelephonePrincipal(dto.telephonePrincipal());
        adherent.setTelephoneSecondaire(dto.telephoneSecondaire());
        adherent.setNumeroCni(dto.numeroCni());
        adherent.setNumeroCnps(dto.numeroCnps());
        if (dto.activiteId() != null) {
            adherent.setActiviteId(dto.activiteId());
        }
        adherent.setAssociationId(dto.associationId());
        adherent.setLocalisation(dto.localisation());
        adherent.setQuartier(dto.quartier());
        adherent.setVille(dto.ville());
        adherent.setLatitude(dto.latitude());
        adherent.setLongitude(dto.longitude());

        adherent = adherentRepository.save(adherent);
        serviceAudit.tracer(TypeOperation.ADHERENT_MODIFICATION, "adherent", adherent.getId(), avant,
                AdherentDetailDto.depuis(adherent), null);
        return AdherentDetailDto.depuis(adherent);
    }

    @Override
    @PreAuthorize("hasAuthority('ADHERENT:LIRE')")
    public ReponsePaginee<AdherentResumeDto> rechercher(CritereRechercheAdherent critere, Pageable pageable,
                                                         Utilisateur demandeur) {
        Specification<Adherent> spec = SpecificationsAdherent.depuisCritere(critere)
                .and(perimetre.perimetreAdherent(demandeur));
        Page<Adherent> adherents = adherentRepository.findAll(spec, pageable);

        // Les libellés de zone sont chargés en une seule requête, et non par ligne : le référentiel
        // des zones est petit et stable, alors qu'un accès par adhérent ferait une requête par ligne
        // affichée.
        java.util.Map<UUID, String> libellesZone = zoneRepository.findAll().stream()
                .collect(java.util.stream.Collectors.toMap(z -> z.getId(), z -> z.getLibelle()));

        return ReponsePaginee.depuis(
                adherents.map(a -> AdherentResumeDto.depuis(a, libellesZone.get(a.getZoneId()))));
    }

    @Override
    @PreAuthorize("hasAuthority('ADHERENT:ARCHIVER')")
    @Transactional
    public void archiver(UUID id, String motif, Utilisateur auteur) {
        if (motif == null || motif.isBlank()) {
            throw new ExceptionValidation("ADHERENT_MOTIF_REQUIS", "Le motif d'archivage est obligatoire.");
        }
        perimetre.verifierAccesAdherent(auteur, id);
        Adherent adherent = charger(id);
        AdherentDetailDto avant = AdherentDetailDto.depuis(adherent);
        adherent.archiver(auteur.getIdentifiant(), motif);
        adherentRepository.save(adherent);
        serviceAudit.tracer(TypeOperation.ADHERENT_ARCHIVAGE, "adherent", adherent.getId(), avant,
                AdherentDetailDto.depuis(adherent), motif);
    }

    @Override
    @PreAuthorize("hasAuthority('ADHERENT:CHANGER_STATUT')")
    @Transactional
    public void changerStatut(UUID id, StatutAdherent nouveau, String motif, Utilisateur auteur) {
        if (motif == null || motif.isBlank()) {
            throw new ExceptionValidation("ADHERENT_MOTIF_REQUIS", "Le motif du changement de statut est obligatoire.");
        }
        perimetre.verifierAccesAdherent(auteur, id);
        Adherent adherent = charger(id);
        if (adherent.getStatut() == StatutAdherent.RADIE) {
            throw new ExceptionConflit("ADHERENT_STATUT_TERMINAL",
                    "Un adhérent radié ne peut plus changer de statut.");
        }
        if (adherent.getStatut() == nouveau) {
            throw new ExceptionConflit("ADHERENT_STATUT_INCHANGE", "L'adhérent a déjà ce statut.");
        }
        StatutAdherent avantStatut = adherent.getStatut();
        adherent.setStatut(nouveau);
        adherentRepository.save(adherent);
        serviceAudit.tracer(TypeOperation.ADHERENT_CHANGEMENT_STATUT, "adherent", adherent.getId(),
                avantStatut, nouveau, motif);
    }

    @Override
    @PreAuthorize("hasAuthority('ADHERENT:MODIFIER')")
    @Transactional
    public AdhesionDto changerPack(UUID id, UUID packId, LocalDate effetLe, Utilisateur auteur) {
        perimetre.verifierAccesAdherent(auteur, id);
        Adherent adherent = charger(id);
        if (!packRepository.findById(packId).map(p -> p.isActif()).orElse(false)) {
            throw new ExceptionValidation("ADHERENT_PACK_INVALIDE", "Le pack sélectionné est introuvable ou inactif.");
        }

        adhesionRepository.findByAdherentIdAndDateFinIsNull(id).ifPresent(ouverte -> {
            ouverte.cloturer(effetLe.minusDays(1));
            // saveAndFlush : voir le commentaire équivalent dans ServicePortefeuilleImpl.transferer —
            // sans flush immédiat, l'ordre d'exécution Hibernate (inserts avant updates) violerait
            // l'index unique partiel « une seule adhésion ouverte par adhérent ».
            adhesionRepository.saveAndFlush(ouverte);
        });

        Adhesion nouvelle = new Adhesion(id, packId, effetLe, "Changement de pack", auteur.getId());
        nouvelle = adhesionRepository.save(nouvelle);

        // Règle [V] non tranchée (docs/02_CLASSES_ET_METHODES.md §3) : l'impact sur les droits déjà acquis
        // n'est jamais recalculé rétroactivement ici — avertissement journalisé, décision DAF en attente.
        serviceAudit.tracer(TypeOperation.ADHERENT_CHANGEMENT_PACK, "adherent", adherent.getId(), null,
                AdhesionDto.depuis(nouvelle),
                "Changement de pack au " + effetLe + " — impact sur les droits acquis non recalculé (règle [V] non validée).");

        return AdhesionDto.depuis(nouvelle);
    }

    private Adherent charger(UUID id) {
        return adherentRepository.findById(id)
                .orElseThrow(() -> new ExceptionRessourceIntrouvable("ADHERENT_INTROUVABLE", "Adhérent introuvable."));
    }
}
