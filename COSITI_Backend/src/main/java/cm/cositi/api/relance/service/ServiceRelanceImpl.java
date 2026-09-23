package cm.cositi.api.relance.service;

import cm.cositi.api.audit.ServiceAudit;
import cm.cositi.api.audit.TypeOperation;
import cm.cositi.api.commun.exception.ExceptionConflit;
import cm.cositi.api.commun.exception.ExceptionRessourceIntrouvable;
import cm.cositi.api.commun.exception.ExceptionValidation;
import cm.cositi.api.commun.reponse.ReponsePaginee;
import cm.cositi.api.relance.dto.CampagneRelanceDto;
import cm.cositi.api.relance.dto.CreationCampagneDto;
import cm.cositi.api.relance.dto.CreationRelanceDto;
import cm.cositi.api.relance.dto.RelanceDto;
import cm.cositi.api.relance.entite.CampagneRelance;
import cm.cositi.api.relance.entite.Relance;
import cm.cositi.api.relance.entite.StatutCampagne;
import cm.cositi.api.relance.repository.CampagneRelanceRepository;
import cm.cositi.api.relance.repository.RelanceRepository;
import cm.cositi.api.securite.entite.Utilisateur;
import cm.cositi.api.securite.service.ServicePerimetreDonnees;
import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.Pageable;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.util.List;
import java.util.Map;
import java.util.UUID;

/**
 * Relances et campagnes (jalon J8).
 *
 * <p>Deux garde-fous appliqués ici, l'un de sécurité, l'autre de fond :</p>
 * <ul>
 *   <li>une relance ne peut être enregistrée que sur un adhérent du périmètre de son auteur — sans quoi un
 *       agent pourrait documenter des contacts sur le portefeuille d'un autre ;</li>
 *   <li>rien n'est déduit du résultat d'une relance. Une {@code PROMESSE} ne crée pas d'échéance, un
 *       {@code PAIEMENT} ne crée pas de paiement : ces objets ont leurs propres circuits, avec leurs propres
 *       contrôles. La seule contrainte ajoutée est qu'un résultat appelant un suivi exige une date de
 *       prochaine action, pour qu'une promesse ne se perde pas.</li>
 * </ul>
 */
@Service
public class ServiceRelanceImpl implements ServiceRelance {

    private final RelanceRepository relanceRepository;
    private final CampagneRelanceRepository campagneRepository;
    private final ServicePerimetreDonnees perimetre;
    private final ServiceAudit serviceAudit;
    private final ObjectMapper objectMapper;

    public ServiceRelanceImpl(RelanceRepository relanceRepository, CampagneRelanceRepository campagneRepository,
                               ServicePerimetreDonnees perimetre, ServiceAudit serviceAudit,
                               ObjectMapper objectMapper) {
        this.relanceRepository = relanceRepository;
        this.campagneRepository = campagneRepository;
        this.perimetre = perimetre;
        this.serviceAudit = serviceAudit;
        this.objectMapper = objectMapper;
    }

    @Override
    @PreAuthorize("hasAuthority('RELANCE:ENREGISTRER')")
    @Transactional
    public RelanceDto enregistrer(CreationRelanceDto dto, Utilisateur auteur) {
        perimetre.verifierAccesAdherent(auteur, dto.adherentId());

        if (dto.resultat().appelleUnSuivi() && dto.prochaineActionLe() == null) {
            throw new ExceptionValidation("RELANCE_SUIVI_REQUIS",
                    "Le résultat « " + dto.resultat() + " » appelle un nouveau contact : la date de prochaine "
                            + "action est obligatoire.", "prochaineActionLe");
        }
        if (dto.prochaineActionLe() != null && dto.prochaineActionLe().isBefore(LocalDate.now())) {
            throw new ExceptionValidation("RELANCE_DATE_PASSEE",
                    "La date de prochaine action ne peut pas être dans le passé.", "prochaineActionLe");
        }

        if (dto.campagneId() != null) {
            CampagneRelance campagne = campagneRepository.findById(dto.campagneId())
                    .orElseThrow(() -> new ExceptionRessourceIntrouvable("CAMPAGNE_INTROUVABLE",
                            "Campagne de relance introuvable."));
            if (!campagne.accepteDeNouvellesRelances()) {
                throw new ExceptionConflit("CAMPAGNE_FERMEE",
                        "La campagne « " + campagne.getLibelle() + " » est " + campagne.getStatut()
                                + " : elle n'accepte plus de relance.");
            }
        }

        Relance relance = relanceRepository.save(new Relance(dto.adherentId(), dto.campagneId(), auteur.getId(),
                dto.canal(), dto.resultat(), dto.prochaineActionLe(), dto.commentaire()));

        serviceAudit.tracer(TypeOperation.RELANCE_ENREGISTREMENT, "relance", relance.getId(), null,
                RelanceDto.depuis(relance), "Canal " + dto.canal() + ", résultat " + dto.resultat());

        return RelanceDto.depuis(relance);
    }

    @Override
    @PreAuthorize("hasAuthority('RELANCE:LIRE')")
    public List<RelanceDto> parAdherent(UUID adherentId, Utilisateur demandeur) {
        perimetre.verifierAccesAdherent(demandeur, adherentId);
        return relanceRepository.findByAdherentIdOrderByDateContactDesc(adherentId).stream()
                .map(RelanceDto::depuis)
                .toList();
    }

    @Override
    @PreAuthorize("hasAuthority('RELANCE:LIRE')")
    public ReponsePaginee<RelanceDto> lister(UUID campagneId, Pageable pageable, Utilisateur demandeur) {
        Page<Relance> page = campagneId != null
                ? relanceRepository.findByCampagneIdOrderByDateContactDesc(campagneId, pageable)
                : relanceRepository.findAll(pageable);

        // Le périmètre d'une relance est celui de l'adhérent relancé : filtré après lecture, comme pour les
        // dossiers CNPS. À repasser en jointure SQL si le volume l'impose — noté, pas sur-conçu.
        List<RelanceDto> visibles = page.getContent().stream()
                .filter(r -> perimetre.peutAccederAdherent(demandeur, r.getAdherentId()))
                .map(RelanceDto::depuis)
                .toList();

        return ReponsePaginee.depuis(new PageImpl<>(visibles, pageable, page.getTotalElements()));
    }

    @Override
    @PreAuthorize("hasAuthority('RELANCE:GERER_CAMPAGNE')")
    @Transactional
    public CampagneRelanceDto creerCampagne(CreationCampagneDto dto, Utilisateur auteur) {
        LocalDate debut = dto.dateDebut() != null ? dto.dateDebut() : LocalDate.now();
        CampagneRelance campagne = campagneRepository.save(
                new CampagneRelance(dto.libelle(), enJson(dto.critere()), debut, auteur.getIdentifiant()));

        serviceAudit.tracer(TypeOperation.RELANCE_ENREGISTREMENT, "campagne_relance", campagne.getId(), null,
                campagne.getLibelle(), "Création de la campagne");

        return CampagneRelanceDto.depuis(campagne, 0);
    }

    @Override
    @PreAuthorize("hasAuthority('RELANCE:LIRE')")
    public ReponsePaginee<CampagneRelanceDto> listerCampagnes(StatutCampagne statut, Pageable pageable,
                                                               Utilisateur demandeur) {
        Page<CampagneRelance> page = statut != null
                ? campagneRepository.findByStatutOrderByDateDebutDesc(statut, pageable)
                : campagneRepository.findAllByOrderByDateDebutDesc(pageable);

        // Une campagne n'est pas rattachée à un adhérent : elle n'a pas de périmètre propre, et sa seule
        // donnée nominative (le nombre de relances) est un agrégat. Pas de filtrage par périmètre ici.
        return ReponsePaginee.depuis(page.map(campagne ->
                CampagneRelanceDto.depuis(campagne, relanceRepository.countByCampagneId(campagne.getId()))));
    }

    @Override
    @PreAuthorize("hasAuthority('RELANCE:GERER_CAMPAGNE')")
    @Transactional
    public CampagneRelanceDto changerStatutCampagne(UUID campagneId, StatutCampagne statut, Utilisateur auteur) {
        if (statut == null) {
            throw new ExceptionValidation("CAMPAGNE_STATUT_REQUIS", "Le statut cible est obligatoire.", "statut");
        }
        CampagneRelance campagne = campagneRepository.findById(campagneId)
                .orElseThrow(() -> new ExceptionRessourceIntrouvable("CAMPAGNE_INTROUVABLE",
                        "Campagne de relance introuvable."));

        StatutCampagne avant = campagne.getStatut();
        if (avant == StatutCampagne.CLOTUREE) {
            throw new ExceptionConflit("CAMPAGNE_CLOTUREE",
                    "Une campagne clôturée ne peut plus changer de statut.");
        }

        switch (statut) {
            case ACTIVE -> campagne.reactiver();
            case SUSPENDUE -> campagne.suspendre();
            case CLOTUREE -> campagne.cloturer(LocalDate.now());
        }
        campagneRepository.save(campagne);

        serviceAudit.tracer(TypeOperation.RELANCE_ENREGISTREMENT, "campagne_relance", campagneId, avant, statut,
                "Changement de statut par " + auteur.getIdentifiant());

        return CampagneRelanceDto.depuis(campagne, relanceRepository.countByCampagneId(campagneId));
    }

    /** Sérialise les critères tels quels. Un critère absent donne un objet vide, jamais {@code null} (colonne NOT NULL). */
    private String enJson(Map<String, Object> critere) {
        try {
            return objectMapper.writeValueAsString(critere == null ? Map.of() : critere);
        } catch (JsonProcessingException e) {
            throw new ExceptionValidation("CAMPAGNE_CRITERE_INVALIDE",
                    "Les critères de la campagne ne sont pas sérialisables.", "critere");
        }
    }
}
