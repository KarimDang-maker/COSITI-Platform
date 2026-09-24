package cm.cositi.api.reporting.service;

import cm.cositi.api.securite.entite.Utilisateur;

import java.time.Instant;
import java.time.LocalDate;
import java.util.UUID;

/**
 * Exports de données (docs/02_CLASSES_ET_METHODES.md §8, jalon J10).
 *
 * <p><b>Trois règles non négociables</b>, toutes appliquées dans l'implémentation :</p>
 * <ul>
 *   <li>tout export passe par le <b>périmètre de données du demandeur</b> — un agent n'exporte pas le
 *       référentiel entier ;</li>
 *   <li>tout export est <b>journalisé</b> ({@code EXPORT_SENSIBLE}) avec son type, ses filtres et son
 *       nombre de lignes (docs/04_SECURITE.md §4) ;</li>
 *   <li>aucun fichier n'est laissé sur disque : le contenu est produit en mémoire et écrit directement
 *       dans la réponse.</li>
 * </ul>
 *
 * <p><b>Écarts assumés avec le pack</b>, consignés dans {@code Conception/SUIVI_EXECUTION.md} :
 * le format XLSX n'est pas produit (il exigerait une dépendance qui n'a pas passé la procédure de
 * {@code docs/05_DEPENDANCES_CHAINE_LOGICIELLE.md}), et la génération asynchrone au-delà d'un seuil n'est
 * pas construite — au-delà de {@code EXPORT_SEUIL_LIGNES}, l'export est <b>refusé avec un message</b>
 * demandant de restreindre les filtres, plutôt que de bloquer une requête HTTP plusieurs minutes.</p>
 */
public interface ServiceExport {

    /** Contenu CSV produit en mémoire, avec le nom de fichier proposé. */
    record FichierExport(String nomFichier, String contenuCsv, int nbLignes) {
    }

    FichierExport exporterAdherents(UUID zoneId, String statut, Utilisateur demandeur);

    FichierExport exporterPaiements(LocalDate du, LocalDate au, String statut, Utilisateur demandeur);

    FichierExport exporterDossiersCnps(String statut, Utilisateur demandeur);

    /**
     * Export/impression de l'audit — réservé au Super Administrateur (correctif COSITI V1 §3), lui-même
     * journalisé sous {@code AUDIT_EXPORT_PDF} et non {@code EXPORT_SENSIBLE} : « toute génération de rapport
     * d'audit doit elle-même être auditée » se distingue d'un export métier ordinaire.
     */
    FichierExport exporterAudit(String entite, String type, Instant depuis, Instant jusqua, Utilisateur demandeur);
}
