package cm.cositi.api.regle.service;

import cm.cositi.api.administration.dto.ParametreDto;
import cm.cositi.api.regle.dto.SyntheseReglesDto;
import cm.cositi.api.securite.entite.Utilisateur;

/**
 * Validation des règles métier par la COSITI (AGENTS.md : aucune règle {@code [V]} codée en dur — elle vit dans
 * {@code parametre} ou dans la matrice documentaire, et sa confirmation est une décision tracée, jamais un déploiement).
 */
public interface ServiceRegle {

    /** Paramètres {@code V}/{@code A} et exigences documentaires non confirmées. */
    SyntheseReglesDto enAttente();

    /** Confirme un paramètre ({@code V}/{@code A} → {@code C}) sans changer sa valeur ; idempotent. */
    ParametreDto validerParametre(String cle, String motif, Utilisateur auteur);
}
