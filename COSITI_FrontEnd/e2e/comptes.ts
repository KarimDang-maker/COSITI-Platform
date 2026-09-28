import { expect, type Page } from "@playwright/test";

/**
 * Comptes utilisés par la recette E2E.
 *
 * Ce sont les comptes de démonstration créés par
 * `cm.cositi.api.securite.bootstrap.SeedComptesDemonstrationDev`, actif
 * uniquement sous les profils `dev` et `local` — jamais en production
 * (double verrou vérifié en code, `docs/04_SECURITE.md §2`).
 *
 * **Le mot de passe vient de l'environnement, jamais du dépôt** : une valeur
 * en dur ici serait un identifiant versionné, exactement ce que la règle 8 de
 * `AGENTS.md` interdit. En local, `outils/dev/e2e.ps1` le fournit ; en CI, il
 * vient du secret du workflow.
 */
export const MOT_DE_PASSE_DEMO = process.env.COSITI_E2E_MOT_DE_PASSE;

if (!MOT_DE_PASSE_DEMO) {
  throw new Error(
    "COSITI_E2E_MOT_DE_PASSE n'est pas défini. La recette E2E ne fabrique pas de mot de passe par " +
      "défaut : lancez-la via COSITI_Backend/outils/dev/e2e.ps1, ou définissez la variable.",
  );
}

export const COMPTES = {
  pca: "demo.pca",
  dg: "demo.dg",
  dga: "demo.dga",
  daf: "demo.daf",
  gestionnaire: "demo.gestionnaire",
  chef: "demo.chef",
  agent: "demo.agent",
  superAdmin: "demo.superadmin",
} as const;

export type CompteDemo = keyof typeof COMPTES;

/**
 * Connecte un compte et attend que l'application ait remplacé l'écran de
 * connexion par le point d'entrée du rôle.
 */
export async function seConnecter(page: Page, compte: CompteDemo): Promise<void> {
  await page.goto("/connexion");
  await page.getByLabel("Identifiant").fill(COMPTES[compte]);
  await page.getByLabel("Mot de passe").fill(MOT_DE_PASSE_DEMO!);
  await page.getByRole("button", { name: "Se connecter" }).click();

  // On attend que la connexion ait **abouti**, pas qu'elle ait commencé.
  //
  // Attendre la disparition du bouton « Se connecter » ne marche pas : `EcranConnexion`
  // remplace son libellé par « Connexion en cours… » dès la soumission, si bien que le
  // bouton cherché disparaît immédiatement et que l'attente est satisfaite alors que la
  // requête est encore en vol — la navigation suivante l'annulait, et le parcours se
  // poursuivait sur l'écran de connexion.
  //
  // L'URL d'arrivée dépend du rôle (`AccueilSelonRole`, jalon J9) : on vérifie donc
  // seulement qu'on a quitté `/connexion`.
  await page.waitForURL((url) => !url.pathname.startsWith("/connexion"), { timeout: 20_000 });
  await expect(page.getByRole("button", { name: "Se connecter" })).toHaveCount(0);
}

/** Téléphone camerounais à 9 chiffres, unique par exécution — la détection de doublon est réelle. */
export function telephoneUnique(): string {
  const suffixe = String(Math.floor(Math.random() * 100_000_000)).padStart(8, "0");
  return `6${suffixe}`;
}

/** Suffixe court pour rendre uniques les noms créés par un parcours. */
export function suffixeUnique(): string {
  return Math.random().toString(36).slice(2, 8).toUpperCase();
}
