package cm.cositi.api.workflow.entite;

/** Type d'un champ proposé dans une demande — sert à normaliser et contrôler les valeurs (§6.2). */
public enum TypeDonneeChamp {
    TEXTE,
    DATE,
    DECIMAL,
    UUID,
    BOOLEEN,
    ENUM
}
