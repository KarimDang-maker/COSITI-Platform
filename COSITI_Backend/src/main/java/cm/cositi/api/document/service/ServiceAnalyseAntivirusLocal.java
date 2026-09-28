package cm.cositi.api.document.service;

import cm.cositi.api.document.entite.AnalyseAntivirus;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;

import java.nio.charset.StandardCharsets;

/**
 * Implémentation par défaut de l'analyse antivirus.
 *
 * <p><b>Limite connue et assumée, à ne pas confondre avec une protection réelle</b> : aucun moteur antiviral
 * n'est embarqué en V1. Ce composant reconnaît uniquement la chaîne de test EICAR — le standard utilisé pour
 * vérifier qu'une chaîne de traitement antivirale est bien câblée — et déclare tout le reste
 * {@code PROPRE}. Il rend donc le chemin de code testable de bout en bout (un fichier « infecté » est bien
 * refusé au téléchargement) sans prétendre détecter quoi que ce soit d'autre.</p>
 *
 * <p>Le branchement d'un moteur réel (ClamAV via clamd, ou un service d'analyse externe) est une exigence de
 * mise en production, pas une amélioration : docs/04_SECURITE.md §5 et la checklist §11. Il consiste à
 * fournir une autre implémentation de {@link ServiceAnalyseAntivirus} — rien d'autre ne change.</p>
 */
@Service
public class ServiceAnalyseAntivirusLocal implements ServiceAnalyseAntivirus {

    private static final Logger JOURNAL = LoggerFactory.getLogger(ServiceAnalyseAntivirusLocal.class);

    private static final String SIGNATURE_EICAR =
            "X5O!P%@AP[4\\PZX54(P^)7CC)7}$EICAR-STANDARD-ANTIVIRUS-TEST-FILE!$H+H*";

    @Override
    public AnalyseAntivirus analyser(byte[] contenu, String nomFichierOriginal) {
        if (contenu == null || contenu.length == 0) {
            return AnalyseAntivirus.INFECTE;
        }
        String debut = new String(contenu, 0, Math.min(contenu.length, 1024), StandardCharsets.US_ASCII);
        if (debut.contains(SIGNATURE_EICAR)) {
            JOURNAL.warn("Fichier refusé par l'analyse antivirus (signature de test EICAR) : {}",
                    nomFichierOriginal == null ? "?" : nomFichierOriginal.replaceAll("[\r\n]", "_"));
            return AnalyseAntivirus.INFECTE;
        }
        return AnalyseAntivirus.PROPRE;
    }
}
