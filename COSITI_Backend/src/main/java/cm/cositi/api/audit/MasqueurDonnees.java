package cm.cositi.api.audit;

import cm.cositi.api.commun.validation.DonneeSensible;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.node.ObjectNode;

import java.lang.reflect.Field;
import java.util.HashSet;
import java.util.Set;

/**
 * Sérialise un objet en JSON pour {@code journal_audit} en masquant tout champ annoté {@link DonneeSensible}.
 * Un champ sensible qui apparaîtrait en clair dans l'audit est un incident (docs/04_SECURITE.md §4).
 */
public final class MasqueurDonnees {

    private static final String VALEUR_MASQUEE = "***";
    private final ObjectMapper objectMapper;

    public MasqueurDonnees(ObjectMapper objectMapper) {
        this.objectMapper = objectMapper;
    }

    public String versJsonMasque(Object objet) {
        if (objet == null) {
            return null;
        }
        try {
            JsonNode noeud = objectMapper.valueToTree(objet);
            if (noeud instanceof ObjectNode objectNode) {
                for (String champ : champsSensibles(objet.getClass())) {
                    if (objectNode.has(champ)) {
                        objectNode.put(champ, VALEUR_MASQUEE);
                    }
                }
            }
            return objectMapper.writeValueAsString(noeud);
        } catch (Exception e) {
            return "{\"erreurSerialisation\":true}";
        }
    }

    private Set<String> champsSensibles(Class<?> type) {
        Set<String> resultat = new HashSet<>();
        Class<?> courant = type;
        while (courant != null && courant != Object.class) {
            for (Field champ : courant.getDeclaredFields()) {
                if (champ.isAnnotationPresent(DonneeSensible.class)) {
                    resultat.add(champ.getName());
                }
            }
            courant = courant.getSuperclass();
        }
        return resultat;
    }
}
