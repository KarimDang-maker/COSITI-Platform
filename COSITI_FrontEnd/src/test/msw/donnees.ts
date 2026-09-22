/**
 * COSITI — Jeux de données fixes utilisés par les gestionnaires MSW.
 *
 * Ne simule jamais un backend qui « tourne » : chaque test qui a besoin d'un
 * comportement différent surcharge un gestionnaire via `serveur.use(...)`,
 * localement, plutôt que de faire grossir cette liste indéfiniment.
 *
 * Permissions alignées sur le catalogue RBAC réel du backend
 * (`COSITI_Backend/src/main/resources/db/migration/V5__catalogue_permissions.sql`),
 * pas sur une supposition frontend — source faisant foi pour la V1.
 */
import type { Utilisateur } from "@/auth/types";

export const JETON_AGENT = "jeton-agent-terrain";
export const JETON_GESTIONNAIRE = "jeton-gestionnaire-comptes";
export const JETON_DGA = "jeton-dga";
export const JETON_DAF = "jeton-daf";

export const UTILISATEURS: Readonly<Record<string, Utilisateur>> = {
  [JETON_AGENT]: {
    id: "u-agent-1",
    identifiant: "agent.test",
    nomComplet: "Ateba Jean",
    roles: ["AGENT_TERRAIN"],
    permissions: ["ADHERENT:LIRE", "ADHERENT:CREER", "ADHERENT:MODIFIER", "PAIEMENT:CREER", "PAIEMENT:LIRE", "ORGANISATION:LIRE"],
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
      "PAIEMENT:LIRE",
      "ORGANISATION:LIRE",
      "AUDIT:CONSULTER",
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
      "AUDIT:CONSULTER",
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
      "ORGANISATION:LIRE",
      "AUDIT:CONSULTER",
    ],
    doitChangerMotDePasse: false,
  },
};
