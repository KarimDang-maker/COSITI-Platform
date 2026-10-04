/**
 * COSITI — Jeux de données fixes utilisés par les gestionnaires MSW.
 *
 * Ne simule jamais un backend qui « tourne » : chaque test qui a besoin d'un
 * comportement différent surcharge un gestionnaire via `serveur.use(...)`,
 * localement, plutôt que de faire grossir cette liste indéfiniment.
 *
 * Permissions alignées sur le catalogue RBAC réel du backend
 * (`COSITI_Backend/src/main/resources/db/migration/V5__catalogue_permissions.sql`
 * et, depuis J5/J6, `V8__permissions_j5_j6.sql`), pas sur une supposition
 * frontend — source faisant foi pour la V1. `DROITS:LIRE`,
 * `DROITS:RECALCULER`, `PAIEMENT:SIGNALER_INCOHERENCE` et
 * `PAIEMENT:CONFIRMER_CHEF` ont d'abord été ajoutés ici par anticipation
 * (J2/J5) avant que `V8__permissions_j5_j6.sql` ne les confirme, livré par
 * la session backend en parallèle de ce lot — non des suppositions
 * persistantes, désormais alignées sur une migration réelle.
 */
import type { Utilisateur } from "@/auth/types";

export const JETON_AGENT = "jeton-agent-terrain";
export const JETON_GESTIONNAIRE = "jeton-gestionnaire-comptes";
export const JETON_DGA = "jeton-dga";
export const JETON_DAF = "jeton-daf";
export const JETON_CHEF = "jeton-chef-agents-terrain";
export const JETON_SUPER_ADMIN = "jeton-super-admin";
export const JETON_PCA = "jeton-pca";

export const UTILISATEURS: Readonly<Record<string, Utilisateur>> = {
  [JETON_AGENT]: {
    id: "u-agent-1",
    identifiant: "agent.test",
    nomComplet: "Ateba Jean",
    roles: ["AGENT_TERRAIN"],
    permissions: [
      "ADHERENT:LIRE",
      // V14__correction_droits_hierarchie_lot1.sql §5 : ADHERENT:CREER retirée à l'Agent, remplacée par
      // ADHERENT:PREINSCRIRE — qu'aucun endpoint n'exploite encore (voir SUIVI_EXECUTION.md).
      "ADHERENT:PREINSCRIRE",
      "ADHERENT:MODIFIER",
      "PAIEMENT:CREER",
      "PAIEMENT:LIRE",
      "ORGANISATION:LIRE",
      // V8__permissions_j5_j6.sql : DROITS:LIRE suit ADHERENT:LIRE pour tous
      // les rôles métier.
      "DROITS:LIRE",
      // V9 : l'Agent joint un justificatif (UC-AG-06) et relit les siens, mais
      // n'a aucune permission CNPS:* — le domaine est celui du Gestionnaire.
      "DOCUMENT:LIRE",
      "DOCUMENT:TELEVERSER",
      // V10__comptes_rendus_j8.sql : l'Agent produit ses comptes rendus et
      // enregistre ses relances ; il ne contrôle ni ne consolide rien.
      "COMPTE_RENDU:LIRE",
      "COMPTE_RENDU:PRODUIRE",
      "RELANCE:LIRE",
      "RELANCE:ENREGISTRER",
    ],
    doitChangerMotDePasse: false,
  },
  [JETON_GESTIONNAIRE]: {
    id: "u-gc-1",
    identifiant: "gestionnaire.test",
    nomComplet: "Ndongo Marie",
    roles: ["GESTIONNAIRE_COMPTE"],
    permissions: [
      "ADHERENT:LIRE",
      "ADHERENT:CREER",
      "ADHERENT:MODIFIER",
      "ADHERENT:ARCHIVER",
      "ADHERENT:CHANGER_STATUT",
      // V15 : le Gestionnaire propose un changement de pack/allocation, le DAF le valide.
      "ADHERENT:PROPOSER_ALLOCATION",
      "PAIEMENT:LIRE",
      // V14 §6 : saisie d'un paiement par le Gestionnaire.
      "PAIEMENT:CREER",
      "ORGANISATION:LIRE",
      // V14 §10 : le Gestionnaire répartit les portefeuilles et gère les zones. AUDIT:CONSULTER lui a été
      // retirée (§3 : audit global réservé au PCA et au Super Administrateur).
      "ORGANISATION:AFFECTER_PORTEFEUILLE",
      "ORGANISATION:GERER_ZONES",
      // V19 : le Gestionnaire valide les dossiers adhérents (jamais ses propres demandes).
      "ADHERENT:VALIDER",
      "DROITS:LIRE",
      // V9__permissions_j7_cnps_documents.sql : le Gestionnaire des comptes est
      // le rôle opérationnel du domaine CNPS (Roles des acteurs.md §7).
      "CNPS:LIRE",
      "CNPS:GERER",
      "CNPS:CHANGER_STATUT",
      "CNPS:DECLARER",
      "DOCUMENT:LIRE",
      "DOCUMENT:TELEVERSER",
      "DOCUMENT:VERIFIER",
      // V10 : le Gestionnaire des comptes reçoit, contrôle et consolide.
      "COMPTE_RENDU:LIRE",
      "COMPTE_RENDU:CONTROLER",
      "COMPTE_RENDU:CONSOLIDER",
      "RELANCE:LIRE",
      "RELANCE:ENREGISTRER",
      "RELANCE:GERER_CAMPAGNE",
      // V11__tableaux_de_bord_j9.sql : une permission par dashboard, accordée au
      // seul rôle concerné.
      "TABLEAU_BORD:GESTIONNAIRE",
      // V12 : exports de son domaine. Aucune permission RAPPORT_DAF:* — REC-H12.
      "EXPORT:ADHERENTS",
      "EXPORT:CNPS",
      // V18 : le Gestionnaire compte et saisit la caisse physique du bilan journalier.
      "BILAN_CAISSE:LIRE",
      "BILAN_CAISSE:SAISIR",
      // V20 : le Gestionnaire enregistre le frais collecté, active l'adhérent et suit le contrôle DGA.
      "ADHERENT:ACTIVER",
      "FRAIS_ADHESION:LIRE",
      "FRAIS_ADHESION:ENREGISTRER",
      "CONTROLE_DGA:LIRE",
    ],
    doitChangerMotDePasse: false,
  },
  [JETON_DGA]: {
    id: "u-dga-1",
    identifiant: "dga.test",
    nomComplet: "Eyenga Paul",
    roles: ["DGA"],
    permissions: [
      "ADHERENT:LIRE",
      "PAIEMENT:LIRE",
      "ORGANISATION:LIRE",
      "ORGANISATION:GERER",
      "ORGANISATION:AFFECTER_PORTEFEUILLE",
      "ORGANISATION:DESIGNER_CHEF",
      "DROITS:LIRE",
      // V9 : consultation seule du domaine CNPS (Roles des acteurs.md §11).
      "CNPS:LIRE",
      "DOCUMENT:LIRE",
      // V10 : la DGA reçoit les comptes rendus consolidés.
      "COMPTE_RENDU:LIRE",
      "RELANCE:LIRE",
      "TABLEAU_BORD:DGA",
      "RAPPORT_DAF:LIRE",
      "EXPORT:ADHERENTS",
      "EXPORT:PAIEMENTS",
      "BILAN_CAISSE:LIRE",
      // V19 : la DGA valide dossiers adhérents et profils d'agents.
      "ADHERENT:VALIDER",
      "AGENT:VALIDER",
      // V20 : la DGA contrôle les documents et peut signaler une anomalie de frais.
      "FRAIS_ADHESION:LIRE",
      "FRAIS_ADHESION:SIGNALER",
      "CONTROLE_DGA:LIRE",
      "CONTROLE_DGA:EFFECTUER",
    ],
    doitChangerMotDePasse: false,
  },
  [JETON_DAF]: {
    id: "u-daf-1",
    identifiant: "daf.test",
    nomComplet: "Mballa Sylvie",
    roles: ["DAF"],
    permissions: [
      "ADHERENT:LIRE",
      "PAIEMENT:LIRE",
      "PAIEMENT:VALIDER",
      "PAIEMENT:CORRIGER",
      "PAIEMENT:ANNULER",
      "PAIEMENT:AFFECTER",
      "PAIEMENT:RAPPROCHER",
      "PAIEMENT:SIGNALER_INCOHERENCE",
      "ORGANISATION:LIRE",
      "DROITS:LIRE",
      "DROITS:RECALCULER",
      "CNPS:LIRE",
      "DOCUMENT:LIRE",
      "TABLEAU_BORD:DAF",
      // V12__rapports_daf_exports_j10.sql
      "RAPPORT_DAF:LIRE",
      "RAPPORT_DAF:PRODUIRE",
      "RAPPORT_DAF:TRANSMETTRE",
      "EXPORT:PAIEMENTS",
      // V18 : le DAF valide le bilan journalier ou y signale une anomalie.
      "BILAN_CAISSE:LIRE",
      "BILAN_CAISSE:VALIDER",
      // V20 : le DAF valide l'encaissement du frais d'adhésion (jamais le sien).
      "FRAIS_ADHESION:LIRE",
      "FRAIS_ADHESION:VALIDER",
      "FRAIS_ADHESION:SIGNALER",
    ],
    doitChangerMotDePasse: false,
  },
  [JETON_CHEF]: {
    id: "u-chef-1",
    identifiant: "chef.test",
    nomComplet: "Mengue Sophie",
    // Rôle additionnel superposé à AGENT_TERRAIN (V5__catalogue_permissions.sql
    // §, commentaire déjà présent côté backend) — un utilisateur désigné Chef
    // cumule les deux rôles.
    roles: ["AGENT_TERRAIN", "CHEF_AGENT_TERRAIN"],
    permissions: [
      "ADHERENT:LIRE",
      "PAIEMENT:LIRE",
      "ORGANISATION:LIRE",
      "DROITS:LIRE",
      // V8__permissions_j5_j6.sql : réservée CHEF_AGENT_TERRAIN.
      "PAIEMENT:CONFIRMER_CHEF",
      "COMPTE_RENDU:LIRE",
      "COMPTE_RENDU:PRODUIRE",
      "RELANCE:LIRE",
      "RELANCE:ENREGISTRER",
      "RELANCE:GERER_CAMPAGNE",
    ],
    doitChangerMotDePasse: false,
  },
  [JETON_PCA]: {
    id: "u-pca-1",
    identifiant: "pca.test",
    nomComplet: "Essomba Claire",
    roles: ["PCA"],
    // V5 (lecture globale + audit), V8 (DROITS:LIRE), V9 (CNPS:LIRE, DOCUMENT:LIRE) : supervision en
    // lecture seule du module adhérents — aucune écriture.
    permissions: [
      "ADHERENT:LIRE",
      "PAIEMENT:LIRE",
      "ORGANISATION:LIRE",
      "AUDIT:CONSULTER",
      "DROITS:LIRE",
      "CNPS:LIRE",
      "DOCUMENT:LIRE",
      "TABLEAU_BORD:PCA",
      "BILAN_CAISSE:LIRE",
      // V20 : supervision en lecture.
      "FRAIS_ADHESION:LIRE",
      "CONTROLE_DGA:LIRE",
      // V21 : le PCA confirme les règles en attente de validation.
      "REGLE:VALIDER",
    ],
    doitChangerMotDePasse: false,
  },
  [JETON_SUPER_ADMIN]: {
    id: "u-admin-1",
    identifiant: "super.admin",
    nomComplet: "Admin Systeme",
    roles: ["SUPER_ADMIN"],
    // Roles des acteurs.md §10 : le Super Administrateur administre le système et
    // n'a AUCUN accès métier courant — ni adhérent, ni paiement, ni CNPS.
    permissions: [
      "ADMINISTRATION:LIRE",
      "ADMINISTRATION:GERER",
      "PARAMETRE:MODIFIER",
      "AUDIT:CONSULTER",
      "TABLEAU_BORD:SUPER_ADMIN",
      "DROITS:RECALCULER",
    ],
    doitChangerMotDePasse: false,
  },
};
