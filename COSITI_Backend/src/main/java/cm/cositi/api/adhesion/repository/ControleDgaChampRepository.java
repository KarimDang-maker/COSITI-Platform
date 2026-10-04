package cm.cositi.api.adhesion.repository;

import cm.cositi.api.adhesion.entite.ControleDgaChamp;
import org.springframework.data.repository.Repository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface ControleDgaChampRepository extends Repository<ControleDgaChamp, UUID> {

    ControleDgaChamp save(ControleDgaChamp champ);

    ControleDgaChamp saveAndFlush(ControleDgaChamp champ);

    Optional<ControleDgaChamp> findById(UUID id);

    List<ControleDgaChamp> findByControleId(UUID controleId);

    List<ControleDgaChamp> findByControleDocumentId(UUID controleDocumentId);
}
