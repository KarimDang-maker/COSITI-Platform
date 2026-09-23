package cm.cositi.api.document.service;

import cm.cositi.api.document.entite.AnalyseAntivirus;

/**
 * Analyse antivirus d'un fichier téléversé, exigée avant mise à disposition (docs/04_SECURITE.md §5).
 *
 * <p>Interface volontairement séparée du service de stockage : l'implémentation V1 est locale et
 * délibérément limitée (voir {@link ServiceAnalyseAntivirusLocal}), et le branchement d'un moteur réel
 * (ClamAV) ne doit toucher qu'une seule classe.</p>
 */
public interface ServiceAnalyseAntivirus {

    AnalyseAntivirus analyser(byte[] contenu, String nomFichierOriginal);
}
