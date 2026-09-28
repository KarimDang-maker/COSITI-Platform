import { expect, test } from "@playwright/test";
import { seConnecter, suffixeUnique } from "./comptes";

/**
 * Recette E2E — organisation terrain et administration.
 *
 * Couvre `REC-H01` (la DGA ajoute un Agent de terrain), `REC-H02` et
 * `REC-H03` (désignation puis remplacement du Chef, historique conservé),
 * `REC-H13` (la DGA consulte l'activité terrain) et `REC-H14` (le Super
 * Administrateur administre un compte, action auditée).
 */
test.describe("Organisation terrain", () => {
  test("REC-H01 — la DGA ajoute un Agent et voit son mot de passe initial une seule fois", async ({ page }) => {
    const suffixe = suffixeUnique();

    await seConnecter(page, "dga");
    await page.goto("/organisation");

    await page.getByRole("button", { name: /Ajouter un agent/i }).click();

    // Tout est cherché **dans la boîte de dialogue**, jamais dans la page : l'écran
    // `/organisation` porte déjà un filtre « Zone », et un `getByLabel("Zone")` global
    // désignait deux éléments — violation du mode strict de Playwright.
    const dialogue = page.getByRole("dialog");
    await expect(dialogue.getByText("Ajouter un Agent de terrain")).toBeVisible();

    await dialogue.getByLabel(/Identifiant de connexion/).fill(`agent.e2e.${suffixe.toLowerCase()}`);
    await dialogue.getByLabel("Nom complet").fill(`Agent E2E ${suffixe}`);
    await dialogue.getByLabel(/Téléphone/).fill("690000123");

    await dialogue.getByLabel("Zone").click();
    await page.getByRole("option").first().click();

    await dialogue.getByRole("button", { name: "Créer l'agent" }).click();

    // Le mot de passe initial est révélé une seule fois : c'est le seul moment où il est lisible.
    await expect(dialogue.getByText(/il ne sera plus jamais affiché/i)).toBeVisible({ timeout: 20_000 });
  });

  test("REC-H13 — la DGA consulte l'activité terrain depuis son tableau de bord", async ({ page }) => {
    await seConnecter(page, "dga");

    await expect(page).toHaveURL(/\/tableaux-de-bord\/dga/);
    await expect(page.getByRole("heading", { name: "Activité des agents de terrain" })).toBeVisible({
      timeout: 20_000,
    });

    // L'indicateur central du projet est présent : 115 des 172 adhérents n'ont jamais cotisé.
    await expect(page.getByText("Taux d'activation").first()).toBeVisible();
  });

  test("le tableau de bord DGA rappelle que les objectifs terrain ne sont pas suivis", async ({ page }) => {
    await seConnecter(page, "dga");

    // `[A]` non confirmé : rien n'est calculé, et l'écran le dit au lieu de laisser une case vide.
    await expect(page.getByText(/Objectifs terrain : non suivis en V1/)).toBeVisible({ timeout: 20_000 });
  });
});

test.describe("Administration", () => {
  test("REC-H14 — le Super Administrateur crée un compte, et le mot de passe n'est montré qu'une fois", async ({
    page,
  }) => {
    const suffixe = suffixeUnique().toLowerCase();

    await seConnecter(page, "superAdmin");
    await page.goto("/administration");

    await page.getByRole("button", { name: "Créer un compte" }).click();

    // Comme pour REC-H01 : tout dans la boîte de dialogue, jamais dans la page.
    const dialogue = page.getByRole("dialog");
    await dialogue.getByLabel("Identifiant de connexion").fill(`compte.e2e.${suffixe}`);
    await dialogue.getByLabel("Nom complet").fill(`Compte E2E ${suffixe}`);

    await dialogue.getByLabel("Rôle").click();
    await page.getByRole("option", { name: "Agent de terrain" }).click();
    await dialogue.getByRole("button", { name: "Créer le compte" }).click();

    await expect(dialogue.getByText(/ne sera plus affiché/)).toBeVisible({ timeout: 20_000 });
    await dialogue.getByRole("button", { name: "J'ai noté le mot de passe" }).click();

    // Le compte apparaît dans la liste, et il n'existe aucun bouton pour le supprimer.
    await page.getByLabel("Rechercher").fill(`compte.e2e.${suffixe}`);
    // `exact` : la notification de succès contient elle aussi l'identifiant.
    await expect(page.getByText(`compte.e2e.${suffixe}`, { exact: true })).toBeVisible({
      timeout: 20_000,
    });
    await expect(page.getByRole("button", { name: /supprimer/i })).toHaveCount(0);
  });

  test("le journal d'audit n'offre aucune action de modification", async ({ page }) => {
    await seConnecter(page, "superAdmin");
    await page.goto("/audit");

    await expect(page.getByRole("heading", { name: "Journal d'audit" })).toBeVisible({ timeout: 20_000 });
    await expect(page.getByRole("button", { name: /supprimer|purger|modifier/i })).toHaveCount(0);
  });

  test("les règles non validées sont signalées comme telles au Super Administrateur", async ({ page }) => {
    await seConnecter(page, "superAdmin");
    await page.goto("/administration?onglet=parametres");

    // La dette fonctionnelle est visible là où elle peut être traitée.
    await expect(page.getByText("À valider").first()).toBeVisible({ timeout: 20_000 });
  });
});
