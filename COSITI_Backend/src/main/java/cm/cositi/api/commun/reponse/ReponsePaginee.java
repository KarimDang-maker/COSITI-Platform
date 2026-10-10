package cm.cositi.api.commun.reponse;

import org.springframework.data.domain.Page;

import java.util.List;

/** Enveloppe de liste normalisée (voir docs/03_SPECIFICATIONS_API.md §1). */
public record ReponsePaginee<T>(
        List<T> contenu,
        int page,
        int taille,
        long totalElements,
        int totalPages,
        List<String> avertissements
) {
    public static <T> ReponsePaginee<T> depuis(Page<T> page) {
        return new ReponsePaginee<>(page.getContent(), page.getNumber(), page.getSize(),
                page.getTotalElements(), page.getTotalPages(), List.of());
    }

    public static <T> ReponsePaginee<T> depuis(Page<T> page, List<String> avertissements) {
        return new ReponsePaginee<>(page.getContent(), page.getNumber(), page.getSize(),
                page.getTotalElements(), page.getTotalPages(), avertissements);
    }
}
