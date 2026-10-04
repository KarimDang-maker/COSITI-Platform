package cm.cositi.api.adhesion.repository;

import cm.cositi.api.adhesion.entite.ExigenceDocumentaire;
import org.springframework.data.repository.Repository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

/** Une exigence se désactive ({@code actif = false}), elle ne se supprime pas : pas de {@code JpaRepository}. */
public interface ExigenceDocumentaireRepository extends Repository<ExigenceDocumentaire, UUID> {

    ExigenceDocumentaire saveAndFlush(ExigenceDocumentaire exigence);

    Optional<ExigenceDocumentaire> findById(UUID id);

    List<ExigenceDocumentaire> findAllByOrderByOrdreAscCodeAsc();
}
