import { expect, test, type Page } from "@playwright/test";
import { seConnecter, suffixeUnique, telephoneUnique } from "./comptes";

/**
 * Recette E2E — création d'un adhérent et détection de doublon.
 *
 * Ce parcours ne porte pas d'identifiant `REC-H` (la liste de
 * `Roles des acteurs.md §15` couvre la chaîne hiérarchique), mais il vérifie
 * la faiblesse n°1 du système actuel, énoncée par `AGENTS.md` : sur 172
 * adhérents papier, les doublons sont le défaut le plus coûteux. La détection
 * par similarité (`pg_trgm`, jalon J2) et la confirmation explicite qui la
 * suit sont donc vérifiées de bout en bout, navigateur compris.
 */

/**
 * Remplit les trois étapes de `NouvelAdherent` et déclenche la création.
 *
 * Les champs sont répartis par étape (`CHAMPS_ETAPE`) et chaque passage à
 * l'étape suivante est validé par Zod : il faut donc renseigner tout ce qui est
 * obligatoire avant d'avancer, sans quoi le formulaire reste sur place — c'est
 * exactement ce qui faisait échouer ce parcours, qui cherchait « Localisation »
 * alors que la première étape était encore affichée.
 *
 * Ne vérifie pas le résultat : c'est au test de dire ce qu'il attend, une
 * création réussie ou une demande de confirmation de doublon.
 */
async function remplirNouvelAdherent(page: Page, nom: string, telephone: string): Promise<void> {
  await page.goto("/adherents/nouveau");

  // Étape 1 — identité et contact.
  // `exact` est nécessaire : `getByLabel` fait une correspondance partielle et
  // insensible à la casse, et « Nom » désignerait aussi « Prénoms ».
  await page.getByLabel("Nom", { exact: true }).fill(nom);
  await page.getByLabel(/Téléphone principal/).fill(telephone);
  await page.getByRole("button", { name: "Suivant" }).click();

  // Étape 2 — rattachement. La zone est un sélecteur avec recherche
  // (`SelectRecherche`) : on ouvre la liste et on prend la zone de démonstration.
  await expect(page.getByRole("heading", { name: "Nouvel adhérent" })).toBeVisible();
  await page.getByLabel("Zone").click();
  await page.getByRole("option").first().click();
  // L'activité est un identifiant du référentiel, pas un code libre : l'API refuse
  // tout ce qui n'est pas un UUID de la table `activite`.
  await page.getByLabel("Activité").click();
  await page.getByRole("option").first().click();
  await page.getByLabel("Localisation").fill("Marché central");
  await page.getByLabel(/Date d'adhésion/).fill("2026-09-01");
  await page.getByLabel("Pack de cotisation").click();
  await page.getByRole("option").first().click();
  await page.getByRole("button", { name: "Suivant" }).click();

  // Étape 3 — vérification, puis création.
  await page.getByRole("button", { name: "Créer l'adhérent" }).click();
}

test.describe("Référentiel adhérents", () => {
  test("le Gestionnaire crée un adhérent et le retrouve dans la liste", async ({ page }) => {
    const nom = `NDONGO-E2E-${suffixeUnique()}`;

    await seConnecter(page, "gestionnaire");
    await remplirNouvelAdherent(page, nom, telephoneUnique());

    // La création aboutit sur la fiche de l'adhérent créé.
    await expect(page).toHaveURL(/\/adherents\/[0-9a-f-]{36}/, { timeout: 20_000 });

    // L'adhérent existe réellement : on le retrouve par la recherche serveur.
    await page.goto(`/adherents?recherche=${encodeURIComponent(nom)}`);
    await expect(page.getByText(nom).first()).toBeVisible({ timeout: 20_000 });
  });

  test("un second adhérent au même téléphone déclenche une confirmation explicite", async ({ page }) => {
    const suffixe = suffixeUnique();
    const telephone = telephoneUnique();

    await seConnecter(page, "gestionnaire");

    // Premier enregistrement.
    await remplirNouvelAdherent(page, `ATANGANA-E2E-${suffixe}`, telephone);
    await expect(page).toHaveURL(/\/adherents\/[0-9a-f-]{36}/, { timeout: 20_000 });

    // Second, avec le même numéro : le serveur doit signaler le doublon, et
    // l'interface demander une confirmation plutôt que de bloquer sèchement —
    // un opérateur doit pouvoir trancher un faux positif.
    await remplirNouvelAdherent(page, `ATANGANA-E2E-BIS-${suffixe}`, telephone);

    await expect(page.getByRole("alertdialog").or(page.getByRole("dialog"))).toContainText(
      /Doublon potentiel/i,
      { timeout: 20_000 },
    );
  });
});
