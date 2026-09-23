package cm.cositi.api.compterendu.entite;

/** Niveau de la chaîne (colonne {@code compte_rendu.type}, V10). */
public enum TypeCompteRendu {
    /** Produit par un Agent de terrain, destiné au Gestionnaire des comptes (UC-AG-10). */
    TERRAIN,
    /** Produit par le Gestionnaire des comptes en agrégeant des comptes rendus terrain, destiné à la DGA (UC-GC-14). */
    CONSOLIDE
}
