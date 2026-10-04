package cm.cositi.api.adherent.service;

import cm.cositi.api.adherent.dto.AdherentDetailDto;
import cm.cositi.api.adherent.dto.AdherentResumeDto;
import cm.cositi.api.adherent.dto.AdhesionDto;
import cm.cositi.api.adherent.dto.CompleterProfilAdherentDto;
import cm.cositi.api.adherent.dto.CompletionAdherentDto;
import cm.cositi.api.adherent.dto.CoordonneesAdherentDto;
import cm.cositi.api.adherent.dto.CreationAdherentDto;
import cm.cositi.api.adherent.dto.CritereRechercheAdherent;
import cm.cositi.api.adherent.dto.DossierAdherentDto;
import cm.cositi.api.adherent.dto.ModificationAdherentDto;
import cm.cositi.api.adherent.dto.ModifierCoordonneesDto;
import cm.cositi.api.adherent.dto.ModifierProfessionnelDto;
import cm.cositi.api.adherent.dto.ProfilProfessionnelDto;
import cm.cositi.api.adherent.entite.Adherent;
import cm.cositi.api.adherent.entite.Adhesion;
import cm.cositi.api.adherent.entite.StatutAdherent;
import cm.cositi.api.adherent.exception.ExceptionDoublonPotentiel;
import cm.cositi.api.adherent.repository.AdhesionRepository;
import cm.cositi.api.adherent.repository.AdherentRepository;
import cm.cositi.api.adherent.repository.PackRepository;
import cm.cositi.api.audit.AuditLigneDto;
import cm.cositi.api.audit.JournalAudit;
import cm.cositi.api.audit.JournalAuditRepository;
import cm.cositi.api.audit.ServiceAudit;
import cm.cositi.api.audit.TypeOperation;
import cm.cositi.api.commun.exception.ExceptionConflit;
import cm.cositi.api.commun.exception.ExceptionRessourceIntrouvable;
import cm.cositi.api.commun.exception.ExceptionValidation;
import cm.cositi.api.commun.reponse.ReponsePaginee;
import cm.cositi.api.document.entite.StatutDocument;
import cm.cositi.api.document.entite.TypeDocument;
import cm.cositi.api.document.service.ServiceStockageDocument;
import cm.cositi.api.organisation.entite.AffectationPortefeuille;
import cm.cositi.api.organisation.repository.AffectationPortefeuilleRepository;
import cm.cositi.api.organisation.repository.ZoneRepository;
import cm.cositi.api.parametre.ServiceParametre;
import cm.cositi.api.securite.entite.Utilisateur;
import cm.cositi.api.securite.service.ServicePerimetreDonnees;
import org.springframework.context.ApplicationEventPublisher;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.Pageable;
import cm.cositi.api.workflow.entite.StatutValidationEntite;
import org.springframework.data.domain.Sort;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.util.ArrayList;
import java.util.Arrays;
import java.util.Comparator;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.UUID;
import java.util.stream.Collectors;

@Service
public class ServiceAdherentImpl implements ServiceAdherent {

    static final String CLE_CHAMPS_COMPLETION = "CHAMPS_COMPLETION_ADHERENT";

    private final AdherentRepository adherentRepository;
    private final AdhesionRepository adhesionRepository;
    private final PackRepository packRepository;
    private final ServiceMatricule serviceMatricule;
    private final ServiceDoublonAdherent serviceDoublonAdherent;
    private final ServicePerimetreDonnees perimetre;
    private final ServiceAudit serviceAudit;
    private final ZoneRepository zoneRepository;
    private final AffectationPortefeuilleRepository affectationPortefeuilleRepository;
    private final ServiceStockageDocument serviceStockageDocument;
    private final JournalAuditRepository journalAuditRepository;
    private final ServiceParametre serviceParametre;
    private final ApplicationEventPublisher publicateurEvenements;
    private final cm.cositi.api.adhesion.service.ServiceExigenceDocumentaire serviceExigence;

    public ServiceAdherentImpl(AdherentRepository adherentRepository, AdhesionRepository adhesionRepository,
                                PackRepository packRepository, ServiceMatricule serviceMatricule,
                                ServiceDoublonAdherent serviceDoublonAdherent, ServicePerimetreDonnees perimetre,
                                ServiceAudit serviceAudit, ZoneRepository zoneRepository,
                                AffectationPortefeuilleRepository affectationPortefeuilleRepository,
                                ServiceStockageDocument serviceStockageDocument,
                                JournalAuditRepository journalAuditRepository, ServiceParametre serviceParametre,
                                ApplicationEventPublisher publicateurEvenements,
                               cm.cositi.api.adhesion.service.ServiceExigenceDocumentaire serviceExigence) {
        this.adherentRepository = adherentRepository;
        this.adhesionRepository = adhesionRepository;
        this.packRepository = packRepository;
        this.serviceMatricule = serviceMatricule;
        this.serviceDoublonAdherent = serviceDoublonAdherent;
        this.perimetre = perimetre;
        this.serviceAudit = serviceAudit;
        this.zoneRepository = zoneRepository;
        this.affectationPortefeuilleRepository = affectationPortefeuilleRepository;
        this.serviceStockageDocument = serviceStockageDocument;
        this.journalAuditRepository = journalAuditRepository;
        this.serviceParametre = serviceParametre;
        this.publicateurEvenements = publicateurEvenements;
        this.serviceExigence = serviceExigence;
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
        publicateurEvenements.publishEvent(new AdherentModifieEvent(adherent.getId(), "CREATION"));

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
    @PreAuthorize("hasAuthority('ADHERENT:LIRE')")
    public AdherentDetailDto consulterParMatricule(String matricule, Utilisateur demandeur) {
        Adherent adherent = adherentRepository.findByMatricule(matricule)
                .orElseThrow(() -> new ExceptionRessourceIntrouvable("ADHERENT_INTROUVABLE", "Adhérent introuvable."));
        perimetre.verifierAccesAdherent(demandeur, adherent.getId());
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
        exigerModificationDirecte(adherent);
        if (dto.version() != null && !dto.version().equals(adherent.getVersion())) {
            // Le champ version était transmis mais ignoré : un écrasement silencieux restait possible (§17).
            throw new ExceptionConflit("ADHERENT_VERSION_OBSOLETE",
                    "Ce dossier a été modifié depuis votre lecture. Rechargez-le avant d'enregistrer.");
        }
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
        publicateurEvenements.publishEvent(new AdherentModifieEvent(adherent.getId(), "MODIFICATION"));
        return AdherentDetailDto.depuis(adherent);
    }

    @Override
    @PreAuthorize("hasAuthority('ADHERENT:LIRE')")
    public ReponsePaginee<AdherentResumeDto> rechercher(CritereRechercheAdherent critere, Pageable pageable,
                                                         Utilisateur demandeur) {
        Specification<Adherent> spec = SpecificationsAdherent.depuisCritere(critere)
                .and(perimetre.perimetreAdherent(demandeur));

        if (critere.agentId() != null) {
            List<UUID> idsAgent = affectationPortefeuilleRepository.findByAgentIdAndDateFinIsNull(critere.agentId())
                    .stream().map(AffectationPortefeuille::getAdherentId).toList();
            // Liste vide -> aucun résultat, jamais "filtre ignoré" : un id sentinelle inatteignable le garantit.
            spec = spec.and(SpecificationsAdherent.avecIdentifiants(
                    idsAgent.isEmpty() ? List.of(UUID.randomUUID()) : idsAgent));
        }

        // Les libellés de zone sont chargés en une seule requête, et non par ligne : le référentiel
        // des zones est petit et stable, alors qu'un accès par adhérent ferait une requête par ligne
        // affichée.
        Map<UUID, String> libellesZone = zoneRepository.findAll().stream()
                .collect(Collectors.toMap(z -> z.getId(), z -> z.getLibelle()));

        if (critere.completionMin() != null || critere.completionMax() != null) {
            // Filtre de complétion appliqué en mémoire : au volume V1 (172 adhérents), acceptable — même
            // compromis, documenté, que ServiceDossierCnpsImpl.lister pour le filtrage par périmètre.
            String champsBrut = serviceParametre.texte(CLE_CHAMPS_COMPLETION);
            boolean regleValidee = serviceParametre.estValide(CLE_CHAMPS_COMPLETION);
            int min = critere.completionMin() != null ? critere.completionMin() : 0;
            int max = critere.completionMax() != null ? critere.completionMax() : 100;

            List<Adherent> filtres = adherentRepository.findAll(spec).stream()
                    .filter(a -> {
                        int p = EvaluationCompletionAdherent.evaluer(a, champsBrut, regleValidee).pourcentage();
                        return p >= min && p <= max;
                    })
                    .sorted(comparateurDepuis(pageable.getSort()))
                    .toList();

            int debut = Math.min(pageable.getPageNumber() * pageable.getPageSize(), filtres.size());
            int fin = Math.min(debut + pageable.getPageSize(), filtres.size());
            Page<Adherent> resultatPage = new PageImpl<>(filtres.subList(debut, fin), pageable, filtres.size());
            return ReponsePaginee.depuis(
                    resultatPage.map(a -> AdherentResumeDto.depuis(a, libellesZone.get(a.getZoneId()))));
        }

        Page<Adherent> adherents = adherentRepository.findAll(spec, pageable);
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
        publicateurEvenements.publishEvent(new AdherentModifieEvent(adherent.getId(), "ARCHIVAGE"));
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
        exigerModificationDirecte(adherent);
        if (adherent.getStatut() == StatutAdherent.PREINSCRIT && nouveau == StatutAdherent.ACTIF) {
            // V20 : l'activation est un processus (conditions, frais d'adhésion, transmission au contrôle DGA), jamais
            // un simple changement de statut.
            throw new ExceptionConflit("ADHERENT_ACTIVATION_PAR_ROUTE_DEDIEE",
                    "L'activation d'un adhérent passe par POST /api/v1/adherents/{id}/activer (Gestionnaire des comptes).");
        }
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
        publicateurEvenements.publishEvent(new AdherentModifieEvent(adherent.getId(), "CHANGEMENT_STATUT"));
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

    @Override
    @PreAuthorize("hasAuthority('ADHERENT:LIRE')")
    public CompletionAdherentDto completion(UUID id, Utilisateur demandeur) {
        perimetre.verifierAccesAdherent(demandeur, id);
        Adherent adherent = charger(id);
        var resultat = evaluerCompletion(adherent);
        return new CompletionAdherentDto(id, resultat.pourcentage(), resultat.champsRenseignes(),
                resultat.champsTotal(), resultat.champsManquants(), resultat.avertissements());
    }

    @Override
    @PreAuthorize("hasAuthority('ADHERENT:MODIFIER')")
    @Transactional
    public AdherentDetailDto completerProfil(UUID id, CompleterProfilAdherentDto dto, Utilisateur auteur) {
        perimetre.verifierAccesAdherent(auteur, id);
        Adherent adherent = charger(id);
        if (adherent.getStatutValidation() == StatutValidationEntite.EN_ATTENTE_VALIDATION) {
            exigerModificationDirecte(adherent);
        }
        if (adherent.getStatutValidation() == StatutValidationEntite.VALIDE) {
            // Dossier officiel : compléter un champ vide reste direct (aucune donnée officielle n'est remplacée) ;
            // remplacer une valeur existante passe par une demande de modification.
            exigerChampVide("dateNaissance", adherent.getDateNaissance(), dto.dateNaissance());
            exigerChampVide("sexe", adherent.getSexe(), dto.sexe());
            exigerChampVide("telephoneSecondaire", adherent.getTelephoneSecondaire(), dto.telephoneSecondaire());
            exigerChampVide("numeroCni", adherent.getNumeroCni(), dto.numeroCni());
            exigerChampVide("numeroCnps", adherent.getNumeroCnps(), dto.numeroCnps());
            exigerChampVide("associationId", adherent.getAssociationId(), dto.associationId());
            exigerChampVide("quartier", adherent.getQuartier(), dto.quartier());
            exigerChampVide("ville", adherent.getVille(), dto.ville());
            exigerChampVide("latitude", adherent.getLatitude(), dto.latitude());
            exigerChampVide("longitude", adherent.getLongitude(), dto.longitude());
        }
        AdherentDetailDto avant = AdherentDetailDto.depuis(adherent);

        if (dto.dateNaissance() != null) {
            adherent.setDateNaissance(dto.dateNaissance());
        }
        if (dto.sexe() != null && !dto.sexe().isBlank()) {
            adherent.setSexe(dto.sexe());
        }
        if (dto.telephoneSecondaire() != null && !dto.telephoneSecondaire().isBlank()) {
            adherent.setTelephoneSecondaire(dto.telephoneSecondaire());
        }
        if (dto.numeroCni() != null && !dto.numeroCni().isBlank()) {
            adherent.setNumeroCni(dto.numeroCni());
        }
        if (dto.numeroCnps() != null && !dto.numeroCnps().isBlank()) {
            adherent.setNumeroCnps(dto.numeroCnps());
        }
        if (dto.associationId() != null) {
            adherent.setAssociationId(dto.associationId());
        }
        if (dto.quartier() != null && !dto.quartier().isBlank()) {
            adherent.setQuartier(dto.quartier());
        }
        if (dto.ville() != null && !dto.ville().isBlank()) {
            adherent.setVille(dto.ville());
        }
        if (dto.latitude() != null) {
            adherent.setLatitude(dto.latitude());
        }
        if (dto.longitude() != null) {
            adherent.setLongitude(dto.longitude());
        }
        if (dto.consentementDonnees() && adherent.getConsentementDonneesLe() == null) {
            adherent.setConsentementDonneesLe(java.time.Instant.now());
        }

        adherent = adherentRepository.save(adherent);
        serviceAudit.tracer(TypeOperation.ADHERENT_COMPLETION_PROFIL, "adherent", adherent.getId(), avant,
                AdherentDetailDto.depuis(adherent), null);
        publicateurEvenements.publishEvent(new AdherentModifieEvent(adherent.getId(), "COMPLETION_PROFIL"));
        return AdherentDetailDto.depuis(adherent);
    }

    @Override
    @PreAuthorize("hasAuthority('ADHERENT:LIRE')")
    public DossierAdherentDto dossier(UUID id, Utilisateur demandeur) {
        perimetre.verifierAccesAdherent(demandeur, id);
        Adherent adherent = charger(id);
        var completion = evaluerCompletion(adherent);
        List<TypeDocument> documentsManquants = documentsManquantsInterne(id, demandeur);

        List<String> avertissements = new ArrayList<>(completion.avertissements());
        if (!serviceExigence.piecesObligatoiresConfirmees()) {
            avertissements.add("La liste des documents obligatoires (DOCUMENTS_ADHERENT_OBLIGATOIRES) n'est pas "
                    + "validée par la COSITI.");
        }

        return new DossierAdherentDto(id, adherent.getStatut(), completion.pourcentage(),
                completion.champsManquants(), documentsManquants, avertissements);
    }

    @Override
    @PreAuthorize("hasAuthority('ADHERENT:LIRE')")
    public List<TypeDocument> documentsManquants(UUID id, Utilisateur demandeur) {
        perimetre.verifierAccesAdherent(demandeur, id);
        charger(id);
        return documentsManquantsInterne(id, demandeur);
    }

    @Override
    @PreAuthorize("hasAuthority('ADHERENT:LIRE')")
    public List<AuditLigneDto> historique(UUID id, Utilisateur demandeur) {
        perimetre.verifierAccesAdherent(demandeur, id);
        charger(id);
        Specification<JournalAudit> spec = (root, query, cb) -> cb.and(
                cb.equal(root.get("entite"), "adherent"), cb.equal(root.get("entiteId"), id));
        return journalAuditRepository.findAll(spec, Sort.by(Sort.Direction.DESC, "horodatage")).stream()
                .map(AuditLigneDto::depuis)
                .toList();
    }

    @Override
    @PreAuthorize("hasAuthority('ADHERENT:LIRE')")
    public ProfilProfessionnelDto professionnel(UUID id, Utilisateur demandeur) {
        perimetre.verifierAccesAdherent(demandeur, id);
        Adherent adherent = charger(id);
        UUID packCourant = adhesionRepository.findByAdherentIdAndDateFinIsNull(id).map(Adhesion::getPackId).orElse(null);
        return new ProfilProfessionnelDto(id, adherent.getActiviteId(), adherent.getNumeroCnps(),
                adherent.getAssociationId(), packCourant);
    }

    @Override
    @PreAuthorize("hasAuthority('ADHERENT:MODIFIER')")
    @Transactional
    public AdherentDetailDto modifierProfessionnel(UUID id, ModifierProfessionnelDto dto, Utilisateur auteur) {
        perimetre.verifierAccesAdherent(auteur, id);
        Adherent adherent = charger(id);
        exigerModificationDirecte(adherent);
        AdherentDetailDto avant = AdherentDetailDto.depuis(adherent);

        if (dto.activiteId() != null) {
            adherent.setActiviteId(dto.activiteId());
        }
        adherent.setNumeroCnps(dto.numeroCnps());
        adherent.setAssociationId(dto.associationId());

        adherent = adherentRepository.save(adherent);
        serviceAudit.tracer(TypeOperation.ADHERENT_MODIFICATION_PROFESSIONNELLE, "adherent", adherent.getId(),
                avant, AdherentDetailDto.depuis(adherent), null);
        publicateurEvenements.publishEvent(new AdherentModifieEvent(adherent.getId(), "MODIFICATION_PROFESSIONNELLE"));
        return AdherentDetailDto.depuis(adherent);
    }

    @Override
    @PreAuthorize("hasAuthority('ADHERENT:LIRE')")
    public CoordonneesAdherentDto coordonnees(UUID id, Utilisateur demandeur) {
        perimetre.verifierAccesAdherent(demandeur, id);
        Adherent adherent = charger(id);
        return new CoordonneesAdherentDto(id, adherent.getTelephonePrincipal(), adherent.getTelephoneSecondaire(),
                adherent.getNumeroCni(), adherent.getLocalisation(), adherent.getQuartier(), adherent.getVille(),
                adherent.getLatitude(), adherent.getLongitude());
    }

    @Override
    @PreAuthorize("hasAuthority('ADHERENT:MODIFIER')")
    @Transactional
    public AdherentDetailDto modifierCoordonnees(UUID id, ModifierCoordonneesDto dto, Utilisateur auteur) {
        perimetre.verifierAccesAdherent(auteur, id);
        Adherent adherent = charger(id);
        exigerModificationDirecte(adherent);
        AdherentDetailDto avant = AdherentDetailDto.depuis(adherent);

        adherent.setTelephonePrincipal(dto.telephonePrincipal());
        adherent.setTelephoneSecondaire(dto.telephoneSecondaire());
        adherent.setNumeroCni(dto.numeroCni());
        adherent.setLocalisation(dto.localisation());
        adherent.setQuartier(dto.quartier());
        adherent.setVille(dto.ville());
        adherent.setLatitude(dto.latitude());
        adherent.setLongitude(dto.longitude());

        adherent = adherentRepository.save(adherent);
        serviceAudit.tracer(TypeOperation.ADHERENT_MODIFICATION_CONTACT, "adherent", adherent.getId(), avant,
                AdherentDetailDto.depuis(adherent), null);
        publicateurEvenements.publishEvent(new AdherentModifieEvent(adherent.getId(), "MODIFICATION_CONTACT"));
        return AdherentDetailDto.depuis(adherent);
    }

    // ------------------------------------------------------------------
    // Interne
    // ------------------------------------------------------------------

    /**
     * Protection des routes de modification directe (workflow V19, §24) : un dossier soumis est verrouillé, un
     * dossier validé ne se modifie plus que par demande — le backend refuse le contournement, quel que soit le rôle.
     */
    private static void exigerModificationDirecte(Adherent adherent) {
        if (adherent.getStatutValidation() == StatutValidationEntite.EN_ATTENTE_VALIDATION) {
            throw new ExceptionConflit("ADHERENT_EN_VALIDATION",
                    "Ce dossier est en cours de validation : il est verrouillé jusqu'à la décision.");
        }
        if (adherent.getStatutValidation() == StatutValidationEntite.VALIDE) {
            throw new ExceptionConflit("ADHERENT_MODIFICATION_PAR_DEMANDE",
                    "Ce dossier est validé : toute modification passe par une demande de modification "
                            + "(POST /api/v1/adherents/{id}/demandes-modification).");
        }
    }

    private static void exigerChampVide(String champ, Object actuel, Object propose) {
        boolean proposeRenseigne = propose != null && !(propose instanceof String t && t.isBlank());
        boolean actuelRenseigne = actuel != null && !(actuel instanceof String t && t.isBlank());
        if (proposeRenseigne && actuelRenseigne && !String.valueOf(actuel).equals(String.valueOf(propose).trim())) {
            throw new ExceptionConflit("ADHERENT_MODIFICATION_PAR_DEMANDE",
                    "Le champ « " + champ + " » est déjà renseigné sur un dossier validé : sa modification passe par "
                            + "une demande de modification (POST /api/v1/adherents/{id}/demandes-modification).");
        }
    }

    private EvaluationCompletionAdherent.Resultat evaluerCompletion(Adherent adherent) {
        String champsBrut = serviceParametre.texte(CLE_CHAMPS_COMPLETION);
        boolean regleValidee = serviceParametre.estValide(CLE_CHAMPS_COMPLETION);
        return EvaluationCompletionAdherent.evaluer(adherent, champsBrut, regleValidee);
    }

    private List<TypeDocument> documentsManquantsInterne(UUID adherentId, Utilisateur demandeur) {
        Set<TypeDocument> obligatoires = documentsObligatoires();
        Set<TypeDocument> presents = serviceStockageDocument.listerParAdherent(adherentId, demandeur).stream()
                .filter(d -> d.statut() != StatutDocument.REJETE && d.statut() != StatutDocument.ARCHIVE)
                .map(d -> d.typeDocument())
                .collect(Collectors.toSet());
        List<TypeDocument> manquants = new ArrayList<>();
        for (TypeDocument type : obligatoires) {
            if (!presents.contains(type)) {
                manquants.add(type);
            }
        }
        return manquants;
    }

    /** Pièces de niveau OBLIGATOIRE de la matrice documentaire en vigueur (V21, §18), confirmées ou non. */
    private Set<TypeDocument> documentsObligatoires() {
        Set<TypeDocument> types = new LinkedHashSet<>();
        for (String code : serviceExigence.typesPiecesObligatoires()) {
            try {
                types.add(TypeDocument.valueOf(code));
            } catch (IllegalArgumentException e) {
                // Type inconnu dans la matrice : ignoré plutôt que de faire échouer la lecture du dossier.
            }
        }
        return types;
    }

    private static Comparator<Adherent> comparateurDepuis(Sort sort) {
        Sort.Order ordre = sort.isSorted() ? sort.iterator().next() : Sort.Order.asc("nom");
        Comparator<Adherent> comparateur = switch (ordre.getProperty()) {
            case "matricule" -> Comparator.comparing(Adherent::getMatricule, String.CASE_INSENSITIVE_ORDER);
            case "dateAdhesion" -> Comparator.comparing(Adherent::getDateAdhesion);
            case "statut" -> Comparator.comparing(a -> a.getStatut().name());
            default -> Comparator.comparing(Adherent::getNom, String.CASE_INSENSITIVE_ORDER);
        };
        return ordre.isDescending() ? comparateur.reversed() : comparateur;
    }

    private Adherent charger(UUID id) {
        return adherentRepository.findById(id)
                .orElseThrow(() -> new ExceptionRessourceIntrouvable("ADHERENT_INTROUVABLE", "Adhérent introuvable."));
    }
}
