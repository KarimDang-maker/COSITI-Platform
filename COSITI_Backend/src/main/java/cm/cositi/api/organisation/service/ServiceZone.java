package cm.cositi.api.organisation.service;

import cm.cositi.api.commun.exception.ExceptionConflit;
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

    public ServiceZone(ZoneRepository zoneRepository) {
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

    @PreAuthorize("hasAuthority('ORGANISATION:GERER')")
    @Transactional
    public ZoneDto creer(CreationZoneDto dto) {
        if (zoneRepository.findByCode(dto.code()).isPresent()) {
            throw new ExceptionConflit("ZONE_CODE_EXISTANT", "Ce code de zone existe déjà.");
        }
        Zone zone = new Zone(dto.code(), dto.libelle(), dto.ville(), dto.region());
        zone.setZoneParenteId(dto.zoneParenteId());
        return ZoneDto.depuis(zoneRepository.save(zone));
    }

    @PreAuthorize("hasAuthority('ORGANISATION:GERER')")
    @Transactional
    public ZoneDto modifier(UUID id, CreationZoneDto dto) {
        Zone zone = charger(id);
        zone.setLibelle(dto.libelle());
        zone.setZoneParenteId(dto.zoneParenteId());
        return ZoneDto.depuis(zoneRepository.save(zone));
    }

    private Zone charger(UUID id) {
        return zoneRepository.findById(id)
                .orElseThrow(() -> new ExceptionRessourceIntrouvable("ZONE_INTROUVABLE", "Zone introuvable."));
    }
}
