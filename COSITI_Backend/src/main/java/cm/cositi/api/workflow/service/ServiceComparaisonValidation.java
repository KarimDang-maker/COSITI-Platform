package cm.cositi.api.workflow.service;

import cm.cositi.api.commun.exception.ExceptionValidation;
import cm.cositi.api.workflow.dto.PropositionChampDto;
import cm.cositi.api.workflow.entite.TypeDonneeChamp;
import org.springframework.stereotype.Service;

import java.util.ArrayList;
import java.util.HashSet;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.Set;

/** Comparaison avant/après et instantané (§7 {@code ValidationComparisonService}). */
@Service
public class ServiceComparaisonValidation {

    /** Changement retenu pour un champ : valeur officielle, valeur proposée (canoniques), motif. */
    public record Changement(String champ, TypeDonneeChamp type, String ancienneValeur, String valeurProposee,
                             String motif) {
    }

    /**
     * Compare les propositions aux valeurs officielles. Refuse un champ inconnu ou répété (400) ; ignore une
     * proposition identique à la valeur officielle ; refuse une demande sans aucun changement réel (400).
     */
    public List<Changement> comparer(Map<String, TypeDonneeChamp> champs, Map<String, String> valeursActuelles,
                                     List<PropositionChampDto> propositions) {
        if (propositions == null || propositions.isEmpty()) {
            throw new ExceptionValidation("DEMANDE_ELEMENTS_REQUIS", "Au moins un champ à modifier est requis.", "elements");
        }
        Set<String> vus = new HashSet<>();
        List<Changement> changements = new ArrayList<>();
        for (PropositionChampDto p : propositions) {
            String champ = p.champ().trim();
            TypeDonneeChamp type = champs.get(champ);
            if (type == null) {
                throw new ExceptionValidation("DEMANDE_CHAMP_NON_MODIFIABLE",
                        "Le champ « " + champ + " » ne peut pas être modifié par cette demande. Champs autorisés : "
                                + champs.keySet(), "elements");
            }
            if (!vus.add(champ)) {
                throw new ExceptionValidation("DEMANDE_CHAMP_REPETE", "Le champ « " + champ + " » est proposé deux fois.",
                        "elements");
            }
            String proposee = ValeursWorkflow.normaliser(champ, type, p.valeurProposee());
            String actuelle = valeursActuelles.get(champ);
            if (!Objects.equals(actuelle, proposee)) {
                changements.add(new Changement(champ, type, actuelle, proposee, p.motifChangement()));
            }
        }
        if (changements.isEmpty()) {
            throw new ExceptionValidation("DEMANDE_AUCUN_CHANGEMENT",
                    "Les valeurs proposées sont identiques aux valeurs officielles.", "elements");
        }
        return changements;
    }

    /** Instantané du dossier soumis à validation : chaque champ avec sa valeur courante (§7 {@code buildSnapshot}). */
    public List<Changement> instantane(Map<String, TypeDonneeChamp> champs, Map<String, String> valeursActuelles) {
        List<Changement> resultat = new ArrayList<>();
        champs.forEach((champ, type) -> resultat.add(new Changement(champ, type, null, valeursActuelles.get(champ), null)));
        return resultat;
    }

    /** Valeurs officielles sur lesquelles on applique les changements — pour contrôler l'état résultant. */
    public Map<String, String> valeursResultantes(Map<String, String> valeursActuelles, List<Changement> changements) {
        Map<String, String> resultat = new LinkedHashMap<>(valeursActuelles);
        changements.forEach(c -> resultat.put(c.champ(), c.valeurProposee()));
        return resultat;
    }
}
