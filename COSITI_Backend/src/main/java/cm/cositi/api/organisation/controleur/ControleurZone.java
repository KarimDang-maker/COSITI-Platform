package cm.cositi.api.organisation.controleur;

import cm.cositi.api.organisation.dto.CreationZoneDto;
import cm.cositi.api.organisation.dto.ZoneDto;
import cm.cositi.api.organisation.service.ServiceZone;
import jakarta.validation.Valid;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.servlet.support.ServletUriComponentsBuilder;

import java.net.URI;
import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/v1/zones")
public class ControleurZone {

    private final ServiceZone serviceZone;

    public ControleurZone(ServiceZone serviceZone) {
        this.serviceZone = serviceZone;
    }

    @GetMapping
    public List<ZoneDto> lister() {
        return serviceZone.lister();
    }

    @GetMapping("/{id}")
    public ZoneDto consulter(@PathVariable UUID id) {
        return serviceZone.consulter(id);
    }

    @PostMapping
    public ResponseEntity<ZoneDto> creer(@Valid @RequestBody CreationZoneDto dto) {
        ZoneDto cree = serviceZone.creer(dto);
        URI localisation = ServletUriComponentsBuilder.fromCurrentRequest().path("/{id}").buildAndExpand(cree.id()).toUri();
        return ResponseEntity.created(localisation).body(cree);
    }

    @PutMapping("/{id}")
    public ZoneDto modifier(@PathVariable UUID id, @Valid @RequestBody CreationZoneDto dto) {
        return serviceZone.modifier(id, dto);
    }
}
