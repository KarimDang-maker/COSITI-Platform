package cm.cositi.api.historique;

import cm.cositi.api.audit.TypeOperation;

import java.util.ArrayList;
import java.util.Collection;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.Set;
import java.util.function.Predicate;

/**
 * Sélection et présentation des événements MÉTIER du dossier adhérent, lus dans {@code journal_audit} (prompt §13,
 * §16). Ne pas mélanger audit technique et historique métier : seuls les types listés ici forment l'historique ;
 * connexions, consultations de documents, exports, refus d'accès et jetons n'y apparaissent jamais.
 *
 * <p>Une règle s'applique à un type d'opération, éventuellement restreinte à une entité tracée quand le même type
 * recouvre deux réalités ({@code DROITS_IMPUTATION} : période ouverte, ou reliquat non imputé noté par la DAF).</p>
 *
 * <p>La classification (catégorie, module, visibilité) est une décision [A] de mise en œuvre, consignée dans le
 * journal des actions : elle se modifie ici, à un seul endroit.</p>
 */
public final class CatalogueEvenementsHistorique {

    /** Classement d'un événement. {@code entite} nul : toutes entités. */
    public record Regle(TypeOperation type, String entite, CategorieHistorique categorie, String module,
                        String libelle, VisibiliteEvenement visibilite) {

        /** Clé SQL : {@code TYPE} (toutes entités) ou {@code TYPE@entite}. */
        public String cle() {
            return entite == null ? type.name() : type.name() + "@" + entite;
        }
    }

    private static final Map<String, Regle> REGLES = new LinkedHashMap<>();

    static {
        // ---- Historique général -----------------------------------------------------------------------------
        general(TypeOperation.ADHERENT_CREATION, "DOSSIER", "Création du dossier");
        general(TypeOperation.ADHERENT_MODIFICATION, "INFORMATIONS_PERSONNELLES", "Modification des informations personnelles");
        general(TypeOperation.ADHERENT_COMPLETION_PROFIL, "INFORMATIONS_PERSONNELLES", "Complétion du dossier");
        general(TypeOperation.ADHERENT_MODIFICATION_PROFESSIONNELLE, "INFORMATIONS_PROFESSIONNELLES",
                "Modification des informations professionnelles");
        general(TypeOperation.ADHERENT_MODIFICATION_CONTACT, "COORDONNEES", "Modification des coordonnées");
        general(TypeOperation.ADHERENT_DOUBLON_IGNORE, "DOSSIER", "Création confirmée malgré un doublon potentiel");
        general(TypeOperation.ADHERENT_ARCHIVAGE, "STATUT", "Archivage du dossier");
        general(TypeOperation.ADHERENT_CHANGEMENT_STATUT, "STATUT", "Changement de statut");
        general(TypeOperation.ADHERENT_ACTIVATION, "STATUT", "Activation de l'adhérent");
        general(TypeOperation.ADHERENT_VALIDATION_DOSSIER, "VALIDATION", "Validation du dossier");
        general(TypeOperation.ADHERENT_CHANGEMENT_PACK, "PACK", "Choix ou changement de pack");
        general(TypeOperation.DOCUMENT_TELEVERSEMENT, "DOCUMENTS", "Ajout d'un document");
        general(TypeOperation.DOCUMENT_REMPLACEMENT, "DOCUMENTS", "Remplacement d'un document");
        general(TypeOperation.DOCUMENT_VERIFICATION_DGA, "DOCUMENTS", "Document vérifié par la DGA");
        general(TypeOperation.DOCUMENT_SUPPRESSION_LOGIQUE, "DOCUMENTS", "Retrait d'un document");
        general(TypeOperation.ADHERENT_SOUMISSION_DGA, "CONTROLE_DGA", "Transmission au contrôle DGA");
        general(TypeOperation.CONTROLE_DGA_TERMINE, "CONTROLE_DGA", "Décision du contrôle DGA");
        general(TypeOperation.CONTROLE_DGA_CORRECTION_DEMANDEE, "CONTROLE_DGA", "Correction demandée par la DGA");
        general(TypeOperation.CONTROLE_DGA_RECONTROLE, "CONTROLE_DGA", "Nouveau contrôle DGA après modification");
        ajouter(TypeOperation.CONTROLE_DGA_DEMARRAGE, null, CategorieHistorique.GENERAL, "CONTROLE_DGA",
                "Début du contrôle DGA", VisibiliteEvenement.CONTROLE_DGA);
        ajouter(TypeOperation.CONTROLE_DGA_CHAMP_VERIFIE, null, CategorieHistorique.GENERAL, "CONTROLE_DGA",
                "Information vérifiée par la DGA", VisibiliteEvenement.CONTROLE_DGA);
        ajouter(TypeOperation.CONTROLE_DGA_NON_CONCORDANCE, null, CategorieHistorique.GENERAL, "CONTROLE_DGA",
                "Non-concordance relevée par la DGA", VisibiliteEvenement.CONTROLE_DGA);
        ajouter(TypeOperation.CNPS_DOSSIER_CREATION, null, CategorieHistorique.GENERAL, "CNPS",
                "Ouverture du dossier CNPS (immatriculation / prestation)", VisibiliteEvenement.CNPS);
        ajouter(TypeOperation.CNPS_CHANGEMENT_STATUT, null, CategorieHistorique.GENERAL, "CNPS",
                "Étape du dossier CNPS (télédéclaration, immatriculation)", VisibiliteEvenement.CNPS);
        ajouter(TypeOperation.CNPS_PIECE_AJOUT, null, CategorieHistorique.GENERAL, "CNPS",
                "Pièce ajoutée au dossier CNPS", VisibiliteEvenement.CNPS);
        general(TypeOperation.PORTEFEUILLE_AFFECTATION, "PORTEFEUILLE", "Affectation à un agent de terrain");
        general(TypeOperation.PORTEFEUILLE_TRANSFERT, "PORTEFEUILLE", "Transfert vers un autre agent");
        general(TypeOperation.PORTEFEUILLE_RETRAIT, "PORTEFEUILLE", "Retrait du portefeuille d'un agent");
        general(TypeOperation.RELANCE_ENREGISTREMENT, "RELANCES", "Relance enregistrée");

        // ---- Historique financier ---------------------------------------------------------------------------
        financier(TypeOperation.FRAIS_ADHESION_ENREGISTREMENT, "FRAIS_ADHESION", "Frais d'adhésion enregistré");
        financier(TypeOperation.FRAIS_ADHESION_VALIDATION, "FRAIS_ADHESION", "Frais d'adhésion validé");
        ajouter(TypeOperation.FRAIS_ADHESION_ANOMALIE_SIGNALEE, null, CategorieHistorique.FINANCIER, "FRAIS_ADHESION",
                "Anomalie signalée sur le frais d'adhésion", VisibiliteEvenement.INTERNE_DAF);
        ajouter(TypeOperation.FRAIS_ADHESION_ANOMALIE_RESOLUE, null, CategorieHistorique.FINANCIER, "FRAIS_ADHESION",
                "Anomalie du frais d'adhésion résolue", VisibiliteEvenement.INTERNE_DAF);
        financier(TypeOperation.PAIEMENT_CREATION, "COTISATIONS", "Cotisation enregistrée");
        financier(TypeOperation.PAIEMENT_SOUMISSION, "COTISATIONS", "Cotisation soumise au contrôle");
        financier(TypeOperation.PAIEMENT_CONFIRMATION_CHEF, "COTISATIONS", "Collecte confirmée par le Chef");
        financier(TypeOperation.PAIEMENT_VALIDATION, "COTISATIONS", "Cotisation validée");
        financier(TypeOperation.PAIEMENT_REJET, "COTISATIONS", "Cotisation rejetée");
        financier(TypeOperation.PAIEMENT_SIGNALEMENT_INCOHERENCE, "COTISATIONS", "Incohérence signalée par la DAF");
        financier(TypeOperation.PAIEMENT_CORRECTION, "COTISATIONS", "Cotisation corrigée");
        financier(TypeOperation.PAIEMENT_ANNULATION, "COTISATIONS", "Cotisation annulée");
        ajouter(TypeOperation.PAIEMENT_RAPPROCHEMENT, null, CategorieHistorique.FINANCIER, "COTISATIONS",
                "Cotisation rapprochée", VisibiliteEvenement.INTERNE_DAF);
        financier(TypeOperation.AFFECTATION_CREATION, "REPARTITION",
                "Répartition Sécurité sociale / Épargne comptabilisée");
        ajouter(TypeOperation.DROITS_IMPUTATION, "periode_droits", CategorieHistorique.FINANCIER, "DROITS",
                "Période de droits ouverte", VisibiliteEvenement.PUBLIC);
        ajouter(TypeOperation.DROITS_IMPUTATION, "adherent", CategorieHistorique.FINANCIER, "DROITS",
                "Note d'imputation (reliquat ou montant insuffisant)", VisibiliteEvenement.INTERNE_DAF);
        ajouter(TypeOperation.DROITS_RECALCUL, null, CategorieHistorique.FINANCIER, "DROITS",
                "Droits recalculés", VisibiliteEvenement.INTERNE_DAF);
    }

    /**
     * Demandes de validation (workflow V19) : rangées dans l'historique de l'objet qu'elles visent — demande sur le
     * dossier = général, demande de correction d'une cotisation = financier (voir la table cible de la requête).
     */
    public static final Set<TypeOperation> TYPES_DEMANDES = Set.of(
            TypeOperation.DEMANDE_VALIDATION_CREATION, TypeOperation.DEMANDE_VALIDATION_SOUMISSION,
            TypeOperation.DEMANDE_VALIDATION_RESOUMISSION, TypeOperation.DEMANDE_VALIDATION_APPROBATION,
            TypeOperation.DEMANDE_VALIDATION_REJET, TypeOperation.DEMANDE_VALIDATION_CORRECTION_DEMANDEE,
            TypeOperation.DEMANDE_VALIDATION_ANNULATION, TypeOperation.DEMANDE_VALIDATION_APPLICATION,
            TypeOperation.DEMANDE_VALIDATION_JUSTIFICATIF);

    private static final Map<TypeOperation, String> LIBELLES_DEMANDES = Map.of(
            TypeOperation.DEMANDE_VALIDATION_CREATION, "Demande de validation créée",
            TypeOperation.DEMANDE_VALIDATION_SOUMISSION, "Demande soumise",
            TypeOperation.DEMANDE_VALIDATION_RESOUMISSION, "Demande soumise à nouveau",
            TypeOperation.DEMANDE_VALIDATION_APPROBATION, "Demande approuvée",
            TypeOperation.DEMANDE_VALIDATION_REJET, "Demande rejetée",
            TypeOperation.DEMANDE_VALIDATION_CORRECTION_DEMANDEE, "Correction demandée sur la demande",
            TypeOperation.DEMANDE_VALIDATION_ANNULATION, "Demande annulée",
            TypeOperation.DEMANDE_VALIDATION_APPLICATION, "Modification approuvée appliquée",
            TypeOperation.DEMANDE_VALIDATION_JUSTIFICATIF, "Justificatif joint à la demande");

    private CatalogueEvenementsHistorique() {
    }

    private static void general(TypeOperation type, String module, String libelle) {
        ajouter(type, null, CategorieHistorique.GENERAL, module, libelle, VisibiliteEvenement.PUBLIC);
    }

    private static void financier(TypeOperation type, String module, String libelle) {
        ajouter(type, null, CategorieHistorique.FINANCIER, module, libelle, VisibiliteEvenement.PUBLIC);
    }

    private static void ajouter(TypeOperation type, String entite, CategorieHistorique categorie, String module,
                                String libelle, VisibiliteEvenement visibilite) {
        Regle regle = new Regle(type, entite, categorie, module, libelle, visibilite);
        REGLES.put(regle.cle(), regle);
    }

    /** Règle applicable à un événement lu, demandes de validation comprises (catégorie de leur cible). */
    public static Optional<Regle> regle(TypeOperation type, String entite, CategorieHistorique categorieCible) {
        Regle specifique = REGLES.get(type.name() + "@" + entite);
        if (specifique != null) {
            return Optional.of(specifique);
        }
        if (TYPES_DEMANDES.contains(type)) {
            return Optional.of(new Regle(type, null, categorieCible, "VALIDATION", LIBELLES_DEMANDES.get(type),
                    VisibiliteEvenement.PUBLIC));
        }
        return Optional.ofNullable(REGLES.get(type.name()));
    }

    /** Règles d'une catégorie visibles par un détenteur des permissions données. */
    public static List<Regle> reglesVisibles(CategorieHistorique categorie, Predicate<String> possedePermission) {
        List<Regle> resultat = new ArrayList<>();
        for (Regle r : REGLES.values()) {
            if (r.categorie() == categorie && estVisible(r.visibilite(), possedePermission)) {
                resultat.add(r);
            }
        }
        return resultat;
    }

    /** {@code true} si des règles de la catégorie sont masquées à ce lecteur (avertissement affiché). */
    public static boolean contientMasques(CategorieHistorique categorie, Predicate<String> possedePermission) {
        return REGLES.values().stream()
                .anyMatch(r -> r.categorie() == categorie && !estVisible(r.visibilite(), possedePermission));
    }

    public static boolean estVisible(VisibiliteEvenement visibilite, Predicate<String> possedePermission) {
        return visibilite.permissionRequise() == null || possedePermission.test(visibilite.permissionRequise());
    }

    public static Collection<Regle> toutes() {
        return REGLES.values();
    }

    /** Modules connus d'une catégorie (filtre {@code module} de l'API). */
    public static Set<String> modules(CategorieHistorique categorie) {
        Set<String> modules = new java.util.TreeSet<>();
        REGLES.values().stream().filter(r -> r.categorie() == categorie).forEach(r -> modules.add(r.module()));
        modules.add("VALIDATION");
        return modules;
    }
}
