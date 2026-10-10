package cm.cositi.api.organisation.service;

import cm.cositi.api.audit.ServiceAudit;
import cm.cositi.api.audit.TypeOperation;
import cm.cositi.api.commun.exception.ExceptionConflit;
import cm.cositi.api.commun.exception.ExceptionValidation;
import cm.cositi.api.commun.exception.ExceptionRessourceIntrouvable;
import cm.cositi.api.organisation.dto.CreationZoneDto;
import cm.cositi.api.organisation.dto.ZoneDto;
import cm.cositi.api.organisation.entite.Zone;
import cm.cositi.api.organisation.repository.ZoneRepository;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.UUID;
import java.util.stream.Collectors;

@Service
public class ServiceZone {

    private final ZoneRepository zoneRepository;
    private final ServiceAudit serviceAudit;

    public ServiceZone(ZoneRepository zoneRepository, ServiceAudit serviceAudit) {
        this.serviceAudit = serviceAudit;
        this.zoneRepository = zoneRepository;
    }

    @PreAuthorize("hasAuthority('ORGANISATION:LIRE')")
    public List<ZoneDto> lister() {
        return zoneRepository.findAll().stream().map(ZoneDto::depuis).collect(Collectors.toList());
    }

    @PreAuthorize("hasAuthority('ORGANISATION:LIRE')")
    public ZoneDto consulter(UUID id) {
        return ZoneDto.depuis(charger(id));
    }

    /**
     * Zones gérées par le Gestionnaire et la DGA : permission {@code ORGANISATION:GERER_ZONES} créée à cette fin par V14
     * (document de correction §10) mais jamais branchée — seule {@code ORGANISATION:GERER} (DGA) était exigée, si bien
     * que le Gestionnaire voyait l'action sans pouvoir l'exécuter. {@code ORGANISATION:GERER} reste acceptée.
     */
    @PreAuthorize("hasAuthority('ORGANISATION:GERER_ZONES') or hasAuthority('ORGANISATION:GERER')")
    @Transactional
    public ZoneDto creer(CreationZoneDto dto) {
        if (zoneRepository.findByCode(dto.code()).isPresent()) {
            throw new ExceptionConflit("ZONE_CODE_EXISTANT", "Ce code de zone existe déjà.");
        }
        Zone zone = new Zone(dto.code(), dto.libelle(), dto.ville(), dto.region());
        zone.setZoneParenteId(dto.zoneParenteId());
        ZoneDto cree = ZoneDto.depuis(zoneRepository.save(zone));
        serviceAudit.tracer(TypeOperation.ZONE_CREATION, "zone", cree.id(), null, cree, null);
        return cree;
    }

    @PreAuthorize("hasAuthority('ORGANISATION:GERER_ZONES') or hasAuthority('ORGANISATION:GERER')")
    @Transactional
    public ZoneDto modifier(UUID id, CreationZoneDto dto) {
        Zone zone = charger(id);
        if (!zone.getCode().equals(dto.code())) {
            // Le code identifie la zone (exports, affichage) : il n'était déjà jamais modifié, le refus est désormais
            // explicite au lieu d'un changement ignoré en silence.
            throw new ExceptionValidation("ZONE_CODE_NON_MODIFIABLE", "Le code d'une zone ne se modifie pas.", "code");
        }
        ZoneDto avant = ZoneDto.depuis(zone);
        zone.setLibelle(dto.libelle());
        // Ville et région étaient envoyées par le formulaire mais ignorées : elles sont maintenant enregistrées.
        zone.setVille(dto.ville());
        zone.setRegion(dto.region());
        zone.setZoneParenteId(dto.zoneParenteId());
        ZoneDto apres = ZoneDto.depuis(zoneRepository.save(zone));
        serviceAudit.tracer(TypeOperation.ZONE_MODIFICATION, "zone", id, avant, apres, null);
        return apres;
    }

    private Zone charger(UUID id) {
        return zoneRepository.findById(id)
                .orElseThrow(() -> new ExceptionRessourceIntrouvable("ZONE_INTROUVABLE", "Zone introuvable."));
    }
}
