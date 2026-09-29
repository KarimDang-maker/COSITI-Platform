package cm.cositi.api.adherent.service;

import cm.cositi.api.adherent.dto.ChampManquantDto;
import cm.cositi.api.adherent.entite.Adherent;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

import java.util.ArrayList;
import java.util.Arrays;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.function.Predicate;

/**
 * Calcule le taux de complétion d'un dossier adhérent (#7, #14, #15, #16, #17).
 *
 * <p>La liste des champs pris en compte n'est fixée nulle part dans les documents COSITI — elle est lue
 * dans le paramètre {@code CHAMPS_COMPLETION_ADHERENT} ({@code [V]}, non validé), jamais figée en
 * constante Java (AGENTS.md règle absolue n°1), sur le même principe que
 * {@code ServiceDossierCnpsImpl.piecesObligatoires}. Une clé inconnue du paramètre est ignorée avec un
 * avertissement plutôt que de faire échouer le calcul.</p>
 */
public final class EvaluationCompletionAdherent {

    private static final Logger JOURNAL = LoggerFactory.getLogger(EvaluationCompletionAdherent.class);

    private EvaluationCompletionAdherent() {
    }

    private static final Map<String, String> LIBELLES = new LinkedHashMap<>();
    private static final Map<String, Predicate<Adherent>> VERIFICATIONS = new LinkedHashMap<>();

    static {
        enregistrer("DATE_NAISSANCE", "Date de naissance", a -> a.getDateNaissance() != null);
        enregistrer("SEXE", "Sexe", a -> nonVide(a.getSexe()));
        enregistrer("TELEPHONE_SECONDAIRE", "Téléphone secondaire", a -> nonVide(a.getTelephoneSecondaire()));
        enregistrer("NUMERO_CNI", "Numéro de CNI", a -> nonVide(a.getNumeroCni()));
        enregistrer("NUMERO_CNPS", "Numéro CNPS", a -> nonVide(a.getNumeroCnps()));
        enregistrer("ASSOCIATION", "Association", a -> a.getAssociationId() != null);
        enregistrer("QUARTIER", "Quartier", a -> nonVide(a.getQuartier()));
        enregistrer("VILLE", "Ville", a -> nonVide(a.getVille()));
        enregistrer("GEOLOCALISATION", "Géolocalisation", a -> a.getLatitude() != null && a.getLongitude() != null);
        enregistrer("CONSENTEMENT", "Consentement RGPD", a -> a.getConsentementDonneesLe() != null);
    }

    private static void enregistrer(String cle, String libelle, Predicate<Adherent> verification) {
        LIBELLES.put(cle, libelle);
        VERIFICATIONS.put(cle, verification);
    }

    public record Resultat(int pourcentage, int champsRenseignes, int champsTotal,
                            List<ChampManquantDto> champsManquants, List<String> avertissements) {
    }

    public static Resultat evaluer(Adherent adherent, String champsBrut, boolean regleValidee) {
        List<String> avertissements = new ArrayList<>();
        if (!regleValidee) {
            avertissements.add("La liste des champs de complétion (CHAMPS_COMPLETION_ADHERENT) n'est pas "
                    + "validée par la COSITI : ce taux est une estimation technique, pas une règle officielle.");
        }

        List<String> cles = new ArrayList<>();
        for (String code : Arrays.stream(champsBrut.split(",")).map(String::trim).filter(s -> !s.isBlank()).toList()) {
            if (VERIFICATIONS.containsKey(code)) {
                cles.add(code);
            } else {
                JOURNAL.warn("Champ de complétion inconnu dans CHAMPS_COMPLETION_ADHERENT : {} — ignoré.",
                        code.replaceAll("[\\r\\n]", "_"));
            }
        }

        List<ChampManquantDto> manquants = new ArrayList<>();
        int renseignes = 0;
        for (String cle : cles) {
            if (VERIFICATIONS.get(cle).test(adherent)) {
                renseignes++;
            } else {
                manquants.add(new ChampManquantDto(cle, LIBELLES.get(cle)));
            }
        }

        int total = cles.size();
        int pourcentage = total == 0 ? 100 : (int) Math.round(renseignes * 100.0 / total);
        return new Resultat(pourcentage, renseignes, total, manquants, avertissements);
    }

    private static boolean nonVide(String valeur) {
        return valeur != null && !valeur.isBlank();
    }
}
