package cm.cositi.api.adherent.service;

import cm.cositi.api.adherent.dto.AdherentDetailDto;
import cm.cositi.api.adherent.dto.AdherentResumeDto;
import cm.cositi.api.adherent.dto.CompteAdherentDto;
import cm.cositi.api.adherent.dto.CreationAdherentDto;
import cm.cositi.api.adherent.dto.CritereRechercheAdherent;
import cm.cositi.api.adherent.dto.DecisionChangementAllocationDto;
import cm.cositi.api.adherent.dto.DemandeChangementAllocationDto;
import cm.cositi.api.adherent.dto.FinalisationAdherentDto;
import cm.cositi.api.adherent.dto.ModificationAdherentDto;
import cm.cositi.api.adherent.dto.PreinscriptionAdherentDto;
import cm.cositi.api.adherent.dto.PropositionChangementAllocationDto;
import cm.cositi.api.adherent.entite.Adherent;
import cm.cositi.api.adherent.entite.Adhesion;
import cm.cositi.api.adherent.entite.DemandeChangementAllocation;
import cm.cositi.api.adherent.entite.PreferenceAllocationAdherent;
import cm.cositi.api.adherent.entite.StatutAdherent;
import cm.cositi.api.adherent.exception.ExceptionDoublonPotentiel;
import cm.cositi.api.adherent.repository.AdhesionRepository;
import cm.cositi.api.adherent.repository.AdherentRepository;
import cm.cositi.api.adherent.repository.DemandeChangementAllocationRepository;
import cm.cositi.api.adherent.repository.PackRepository;
import cm.cositi.api.adherent.repository.PreferenceAllocationAdherentRepository;
import cm.cositi.api.audit.ServiceAudit;
import cm.cositi.api.audit.TypeOperation;
import cm.cositi.api.commun.exception.ExceptionConflit;
import cm.cositi.api.commun.exception.ExceptionRessourceIntrouvable;
import cm.cositi.api.commun.exception.ExceptionValidation;
import cm.cositi.api.commun.reponse.ReponsePaginee;
import cm.cositi.api.commun.util.ValidationAllocation;
import cm.cositi.api.organisation.repository.ZoneRepository;
import cm.cositi.api.parametre.ServiceParametre;
import cm.cositi.api.securite.entite.Utilisateur;
import cm.cositi.api.securite.service.ServicePerimetreDonnees;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;
import java.util.UUID;
import java.util.stream.Collectors;

@Service
public class ServiceAdherentImpl implements ServiceAdherent {

    private static final String CLE_PARAMETRE_MINIMUM_SECURITE_SOCIALE = "MONTANT_MINIMUM_SECURITE_SOCIALE";

    private final AdherentRepository adherentRepository;
    private final AdhesionRepository adhesionRepository;
    private final PackRepository packRepository;
    private final ServiceMatricule serviceMatricule;
    private final ServiceDoublonAdherent serviceDoublonAdherent;
    private final ServicePerimetreDonnees perimetre;
    private final ServiceAudit serviceAudit;
    private final ZoneRepository zoneRepository;
    private final PreferenceAllocationAdherentRepository preferenceAllocationRepository;
    private final ServiceParametre serviceParametre;
    private final JdbcTemplate jdbcTemplate;
    private final DemandeChangementAllocationRepository demandeChangementAllocationRepository;

    public ServiceAdherentImpl(AdherentRepository adherentRepository, AdhesionRepository adhesionRepository,
                                PackRepository packRepository, ServiceMatricule serviceMatricule,
                                ServiceDoublonAdherent serviceDoublonAdherent, ServicePerimetreDonnees perimetre,
                                ServiceAudit serviceAudit, ZoneRepository zoneRepository,
                                PreferenceAllocationAdherentRepository preferenceAllocationRepository,
                                ServiceParametre serviceParametre, JdbcTemplate jdbcTemplate,
                                DemandeChangementAllocationRepository demandeChangementAllocationRepository) {
        this.adherentRepository = adherentRepository;
        this.adhesionRepository = adhesionRepository;
        this.packRepository = packRepository;
        this.serviceMatricule = serviceMatricule;
        this.serviceDoublonAdherent = serviceDoublonAdherent;
        this.perimetre = perimetre;
        this.serviceAudit = serviceAudit;
        this.zoneRepository = zoneRepository;
        this.preferenceAllocationRepository = preferenceAllocationRepository;
        this.serviceParametre = serviceParametre;
        this.jdbcTemplate = jdbcTemplate;
        this.demandeChangementAllocationRepository = demandeChangementAllocationRepository;
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
    @PreAuthorize("hasAuthority('ADHERENT:PREINSCRIRE')")
    @Transactional
    public AdherentDetailDto preinscrire(PreinscriptionAdherentDto dto, Utilisateur auteur) {
        String nomComplet = dto.prenoms() != null ? dto.nom() + " " + dto.prenoms() : dto.nom();
        List<CandidatDoublon> candidats = serviceDoublonAdherent.rechercher(
                new CritereDoublon(dto.telephonePrincipal(), dto.numeroCni(), nomComplet, dto.zoneId()));
        if (!candidats.isEmpty() && !dto.confirmationDoublonIgnore()) {
            throw new ExceptionDoublonPotentiel(candidats);
        }

        String matricule = serviceMatricule.genererProchain();
        // Saisie préparatoire uniquement (§5) : ni pack, ni adhésion, ni allocation. La date d'adhésion
        // définitive n'est connue qu'à la finalisation par la Gestionnaire — aujourd'hui n'est qu'un repli
        // technique pour satisfaire la colonne NOT NULL, jamais affiché comme une adhésion réelle.
        Adherent adherent = new Adherent(matricule, dto.nom(), dto.telephonePrincipal(), dto.activiteId(),
                dto.zoneId(), dto.localisation(), LocalDate.now());
        adherent.setPrenoms(dto.prenoms());
        adherent.setTelephoneSecondaire(dto.telephoneSecondaire());
        adherent.setNumeroCni(dto.numeroCni());
        adherent.setQuartier(dto.quartier());
        adherent.setVille(dto.ville());
        adherent = adherentRepository.save(adherent);

        if (!candidats.isEmpty()) {
            serviceAudit.tracer(TypeOperation.ADHERENT_DOUBLON_IGNORE, "adherent", adherent.getId(), null,
                    candidats, "Préinscription confirmée malgré " + candidats.size() + " doublon(s) potentiel(s).");
        }
        serviceAudit.tracer(TypeOperation.ADHERENT_PREINSCRIPTION, "adherent", adherent.getId(), null,
                AdherentDetailDto.depuis(adherent), null);

        return AdherentDetailDto.depuis(adherent);
    }

    @Override
    @PreAuthorize("hasAuthority('ADHERENT:CREER')")
    @Transactional
    public AdherentDetailDto finaliser(UUID id, FinalisationAdherentDto dto, Utilisateur auteur) {
        Adherent adherent = charger(id);
        if (adherent.getStatut() != StatutAdherent.PREINSCRIT) {
            throw new ExceptionConflit("ADHERENT_DEJA_FINALISE",
                    "Seul un adhérent préinscrit peut être finalisé ; celui-ci a déjà un dossier complet.");
        }
        if (!packRepository.findById(dto.packId()).map(p -> p.isActif()).orElse(false)) {
            throw new ExceptionValidation("ADHERENT_PACK_INVALIDE", "Le pack sélectionné est introuvable ou inactif.");
        }
        AdherentDetailDto avant = AdherentDetailDto.depuis(adherent);

        adherent.setDateAdhesion(dto.dateAdhesion());
        if (dto.consentementDonnees()) {
            adherent.setConsentementDonneesLe(java.time.Instant.now());
        }
        adherent = adherentRepository.save(adherent);

        Adhesion adhesion = new Adhesion(adherent.getId(), dto.packId(), dto.dateAdhesion(),
                "Adhésion initiale (finalisation d'une préinscription)", auteur.getId());
        adhesionRepository.save(adhesion);

        BigDecimal minimumSecuriteSociale = serviceParametre.decimal(CLE_PARAMETRE_MINIMUM_SECURITE_SOCIALE);
        BigDecimal secSociale = dto.allocationSecuriteSociale();
        BigDecimal epargne = dto.allocationEpargne();
        if (secSociale == null || epargne == null) {
            BigDecimal[] repartition = ValidationAllocation.repartitionParDefaut(dto.montantReference(), minimumSecuriteSociale);
            secSociale = repartition[0];
            epargne = repartition[1];
        }
        ValidationAllocation.verifier(dto.montantReference(), secSociale, epargne, minimumSecuriteSociale);

        preferenceAllocationRepository.findByAdherentIdAndActifTrue(adherent.getId())
                .ifPresent(PreferenceAllocationAdherent::desactiver);
        PreferenceAllocationAdherent preference = new PreferenceAllocationAdherent(adherent.getId(), dto.packId(),
                dto.montantReference(), secSociale, epargne, dto.dateAdhesion(), auteur.getId());
        preferenceAllocationRepository.save(preference);

        serviceAudit.tracer(TypeOperation.ADHERENT_FINALISATION, "adherent", adherent.getId(), avant,
                AdherentDetailDto.depuis(adherent), "Pack " + dto.packId() + ", allocation " + secSociale
                        + "/" + epargne + " (Sécurité Sociale/Épargne)");
        serviceAudit.tracer(TypeOperation.PREFERENCE_ALLOCATION_ENREGISTREMENT, "adherent", adherent.getId(), null,
                preference.getId(), null);

        return AdherentDetailDto.depuis(adherent);
    }

    @Override
    @PreAuthorize("hasAuthority('ADHERENT:LIRE')")
    public CompteAdherentDto comptes(UUID id, Utilisateur demandeur) {
        perimetre.verifierAccesAdherent(demandeur, id);
        if (!adherentRepository.existsById(id)) {
            throw new ExceptionRessourceIntrouvable("ADHERENT_INTROUVABLE", "Adhérent introuvable.");
        }

        // Comptes constatés sur les affectations de paiements validés (jamais recalculés côté client) —
        // un seul dossier adhérent, deux composantes consultées ensemble (§7).
        BigDecimal totalSecuriteSociale = montantComposante(id, "CNPS");
        BigDecimal totalEpargne = montantComposante(id, "EPARGNE");

        return preferenceAllocationRepository.findByAdherentIdAndActifTrue(id)
                .map(pref -> new CompteAdherentDto(id, totalSecuriteSociale, totalEpargne,
                        pref.getAllocationSecuriteSociale(), pref.getAllocationEpargne(), pref.getDatePreference()))
                .orElse(new CompteAdherentDto(id, totalSecuriteSociale, totalEpargne, null, null, null));
    }

    private BigDecimal montantComposante(UUID adherentId, String codeComposante) {
        BigDecimal valeur = jdbcTemplate.queryForObject("""
                SELECT COALESCE(SUM(ap.montant), 0)
                FROM affectation_paiement ap
                JOIN paiement p ON p.id = ap.paiement_id
                JOIN composante_affectation c ON c.id = ap.composante_id
                WHERE p.adherent_id = ? AND c.code = ? AND p.statut IN ('VALIDE', 'RAPPROCHE')
                """, BigDecimal.class, adherentId, codeComposante);
        return valeur != null ? valeur : BigDecimal.ZERO;
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
    @PreAuthorize("hasAuthority('ADHERENT:PROPOSER_ALLOCATION')")
    @Transactional
    public DemandeChangementAllocationDto proposerChangementAllocation(UUID adherentId,
                                                                        PropositionChangementAllocationDto dto,
                                                                        Utilisateur auteur) {
        perimetre.verifierAccesAdherent(auteur, adherentId);
        if (!adherentRepository.existsById(adherentId)) {
            throw new ExceptionRessourceIntrouvable("ADHERENT_INTROUVABLE", "Adhérent introuvable.");
        }
        if (dto.packId() != null && !packRepository.findById(dto.packId()).map(p -> p.isActif()).orElse(false)) {
            throw new ExceptionValidation("ADHERENT_PACK_INVALIDE", "Le pack sélectionné est introuvable ou inactif.");
        }
        if (demandeChangementAllocationRepository
                .findByAdherentIdAndStatut(adherentId, DemandeChangementAllocation.Statut.EN_ATTENTE).isPresent()) {
            throw new ExceptionConflit("ALLOCATION_DEMANDE_DEJA_EN_ATTENTE",
                    "Une demande de changement est déjà en attente de décision pour cet adhérent.");
        }

        BigDecimal minimumSecuriteSociale = serviceParametre.decimal(CLE_PARAMETRE_MINIMUM_SECURITE_SOCIALE);
        BigDecimal secSociale = dto.allocationSecuriteSociale();
        BigDecimal epargne = dto.allocationEpargne();
        if (secSociale == null || epargne == null) {
            BigDecimal[] repartition = ValidationAllocation.repartitionParDefaut(dto.montantReference(), minimumSecuriteSociale);
            secSociale = repartition[0];
            epargne = repartition[1];
        }
        ValidationAllocation.verifier(dto.montantReference(), secSociale, epargne, minimumSecuriteSociale);

        DemandeChangementAllocation demande = new DemandeChangementAllocation(adherentId, dto.packId(),
                dto.montantReference(), secSociale, epargne, auteur.getId());
        demande = demandeChangementAllocationRepository.save(demande);

        serviceAudit.tracer(TypeOperation.ALLOCATION_CHANGEMENT_PROPOSITION, "adherent", adherentId, null,
                DemandeChangementAllocationDto.depuis(demande),
                "Proposition de changement d'allocation par " + auteur.getIdentifiant());

        return DemandeChangementAllocationDto.depuis(demande);
    }

    @Override
    @PreAuthorize("hasAuthority('ADHERENT:VALIDER_ALLOCATION')")
    @Transactional
    public DemandeChangementAllocationDto deciderChangementAllocation(UUID demandeId, DecisionChangementAllocationDto dto,
                                                                       Utilisateur daf) {
        DemandeChangementAllocation demande = demandeChangementAllocationRepository.findById(demandeId)
                .orElseThrow(() -> new ExceptionRessourceIntrouvable("ALLOCATION_DEMANDE_INTROUVABLE",
                        "Demande introuvable."));
        if (demande.getStatut() != DemandeChangementAllocation.Statut.EN_ATTENTE) {
            throw new ExceptionConflit("ALLOCATION_DEMANDE_DEJA_DECIDEE", "Cette demande a déjà été décidée.");
        }

        if (Boolean.TRUE.equals(dto.approuver())) {
            UUID adherentId = demande.getAdherentId();
            Adherent adherent = charger(adherentId);
            UUID packRetenu = demande.getPackId();
            if (packRetenu != null) {
                appliquerChangementPack(adherent, packRetenu, LocalDate.now(), daf);
            } else {
                packRetenu = adhesionRepository.findByAdherentIdAndDateFinIsNull(adherentId)
                        .map(Adhesion::getPackId)
                        .orElseThrow(() -> new IllegalStateException(
                                "Aucune adhésion ouverte pour l'adhérent " + adherentId
                                        + " — impossible de retenir un pack pour la préférence."));
            }

            preferenceAllocationRepository.findByAdherentIdAndActifTrue(demande.getAdherentId())
                    .ifPresent(PreferenceAllocationAdherent::desactiver);
            PreferenceAllocationAdherent preference = new PreferenceAllocationAdherent(demande.getAdherentId(),
                    packRetenu, demande.getMontantReference(), demande.getAllocationSecuriteSociale(),
                    demande.getAllocationEpargne(), LocalDate.now(), daf.getId());
            preferenceAllocationRepository.save(preference);

            demande.valider(daf.getId(), dto.motif());
        } else {
            demande.rejeter(daf.getId(), dto.motif());
        }
        demande = demandeChangementAllocationRepository.save(demande);

        serviceAudit.tracer(TypeOperation.ALLOCATION_CHANGEMENT_DECISION, "adherent", demande.getAdherentId(), null,
                DemandeChangementAllocationDto.depuis(demande),
                (Boolean.TRUE.equals(dto.approuver()) ? "Validée" : "Rejetée") + " par le DAF " + daf.getIdentifiant()
                        + (dto.motif() != null && !dto.motif().isBlank() ? " : " + dto.motif() : ""));

        return DemandeChangementAllocationDto.depuis(demande);
    }

    @Override
    @PreAuthorize("hasAuthority('ADHERENT:LIRE')")
    public List<DemandeChangementAllocationDto> historiqueChangementsAllocation(UUID adherentId, Utilisateur demandeur) {
        perimetre.verifierAccesAdherent(demandeur, adherentId);
        return demandeChangementAllocationRepository.findByAdherentIdOrderByProposeeLeDesc(adherentId).stream()
                .map(DemandeChangementAllocationDto::depuis)
                .collect(Collectors.toList());
    }

    /**
     * Applique un changement de pack déjà validé par le DAF ({@link #deciderChangementAllocation}) — jamais
     * appelée directement par la Gestionnaire (RAPORT_V1.md §6.3 : elle propose, elle n'applique pas).
     */
    private void appliquerChangementPack(Adherent adherent, UUID packId, LocalDate effetLe, Utilisateur auteur) {
        adhesionRepository.findByAdherentIdAndDateFinIsNull(adherent.getId()).ifPresent(ouverte -> {
            ouverte.cloturer(effetLe.minusDays(1));
            // saveAndFlush : voir le commentaire équivalent dans ServicePortefeuilleImpl.transferer —
            // sans flush immédiat, l'ordre d'exécution Hibernate (inserts avant updates) violerait
            // l'index unique partiel « une seule adhésion ouverte par adhérent ».
            adhesionRepository.saveAndFlush(ouverte);
        });
        Adhesion nouvelle = new Adhesion(adherent.getId(), packId, effetLe,
                "Changement de pack validé par le DAF", auteur.getId());
        adhesionRepository.save(nouvelle);
    }

    private Adherent charger(UUID id) {
        return adherentRepository.findById(id)
                .orElseThrow(() -> new ExceptionRessourceIntrouvable("ADHERENT_INTROUVABLE", "Adhérent introuvable."));
    }
}
