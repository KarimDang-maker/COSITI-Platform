package cm.cositi.api.document.entite;

/** Colonne {@code document.analyse_antivirus} (V4). Un document non {@code PROPRE} n'est jamais téléchargeable. */
public enum AnalyseAntivirus {
    EN_ATTENTE,
    PROPRE,
    INFECTE
}
