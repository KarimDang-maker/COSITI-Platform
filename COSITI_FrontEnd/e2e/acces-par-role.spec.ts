import { expect, test } from "@playwright/test";
import { seConnecter } from "./comptes";

/**
 * Recette E2E — accès par rôle.
 *
 * Couvre `REC-H08` (« Agent ouvre une route dashboard DGA → accès refusé ») et
 * `REC-H09` (idem pour le dashboard Gestionnaire), ainsi que `REC-H12`
 * (« Utilisateur non autorisé consulte un rapport DAF → accès refusé »).
 *
 * <p>Ces refus sont déjà vérifiés côté serveur par `TableauBordIntegrationTest`
 * et `RapportDafIntegrationTest`. Ce que ces parcours ajoutent, c'est la preuve
 * que l'interface <b>ne laisse pas entrevoir</b> ce que l'API refuse : la route
 * n'apparaît pas dans la navigation, et l'ouvrir directement par l'URL affiche
 * un refus explicite plutôt qu'un écran vide ou un chargement sans fin.</p>
 */
test.describe("Accès par rôle", () => {
  test("REC-H08 — l'Agent de terrain ne peut pas ouvrir le tableau de bord DGA", async ({ page }) => {
    await seConnecter(page, "agent");

    await page.goto("/tableaux-de-bord/dga");

    await expect(page.getByText(/Accès non autorisé|Accès refusé/i)).toBeVisible();
    await expect(page.getByRole("heading", { name: /Direction générale adjointe/ })).toBeHidden();
  });

  test("REC-H09 — l'Agent de terrain ne peut pas ouvrir le tableau de bord Gestionnaire", async ({ page }) => {
    await seConnecter(page, "agent");

    await page.goto("/tableaux-de-bord/gestionnaire");

    await expect(page.getByText(/Accès non autorisé|Accès refusé/i)).toBeVisible();
  });

  test("l'Agent de terrain n'a aucune entrée « Tableau de bord » dans sa navigation", async ({ page }) => {
    await seConnecter(page, "agent");

    // Roles des acteurs.md §16 : ni l'Agent ni le Chef n'ont de dashboard en V1.
    const navigation = page.getByRole("navigation", { name: "Navigation principale" });
    await expect(navigation.getByRole("link", { name: "Tableau de bord" })).toHaveCount(0);
    await expect(navigation.getByRole("link", { name: "Adhérents" })).toBeVisible();
  });

  test("le Chef des agents de terrain n'a pas non plus de tableau de bord", async ({ page }) => {
    await seConnecter(page, "chef");

    const navigation = page.getByRole("navigation", { name: "Navigation principale" });
    await expect(navigation.getByRole("link", { name: "Tableau de bord" })).toHaveCount(0);

    await page.goto("/tableaux-de-bord/dga");
    await expect(page.getByText(/Accès non autorisé|Accès refusé/i)).toBeVisible();
  });

  test("REC-H12 — le Gestionnaire des comptes ne consulte aucun rapport DAF", async ({ page }) => {
    await seConnecter(page, "gestionnaire");

    // La permission RAPPORT_DAF:LIRE n'est accordée qu'à PCA, DAF, DG et DGA (V12).
    const navigation = page.getByRole("navigation", { name: "Navigation principale" });
    await expect(navigation.getByRole("link", { name: "Rapports" })).toHaveCount(0);

    await page.goto("/rapports");
    await expect(page.getByText(/Accès non autorisé|Accès refusé/i)).toBeVisible();
  });

  test("chaque rôle à dashboard arrive sur le sien après connexion", async ({ page }) => {
    await seConnecter(page, "daf");
    await expect(page).toHaveURL(/\/tableaux-de-bord\/daf/);
    await expect(page.getByRole("heading", { name: /Direction administrative et financière/ })).toBeVisible();
  });

  test("l'Agent de terrain arrive sur son écran de travail, faute de dashboard", async ({ page }) => {
    await seConnecter(page, "agent");

    await expect(page).toHaveURL(/\/adherents/);
    await expect(page.getByRole("heading", { name: "Adhérents", level: 1 })).toBeVisible();
  });

  test("le Super Administrateur n'a aucun accès métier courant", async ({ page }) => {
    await seConnecter(page, "superAdmin");

    // Roles des acteurs.md §10 : il administre le système, il ne consulte pas les adhérents.
    const navigation = page.getByRole("navigation", { name: "Navigation principale" });
    await expect(navigation.getByRole("link", { name: "Adhérents" })).toHaveCount(0);
    await expect(navigation.getByRole("link", { name: "Administration" })).toBeVisible();

    await page.goto("/adherents");
    await expect(page.getByText(/Accès non autorisé|Accès refusé/i)).toBeVisible();
  });
});
