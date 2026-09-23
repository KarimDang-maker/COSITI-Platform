import { expect, test } from "@playwright/test";
import { seConnecter, suffixeUnique } from "./comptes";

/**
 * Recette E2E — chaîne hiérarchique terrain et flux DAF → PCA.
 *
 * Couvre `REC-H04` (l'Agent produit un compte rendu, le Gestionnaire le
 * reçoit), `REC-H05` (le Gestionnaire le contrôle), `REC-H10` (le DAF produit
 * un rapport) et `REC-H11` (le PCA le consulte).
 *
 * <p>Ces flux sont déjà vérifiés côté serveur (`CompteRenduIntegrationTest`,
 * `RapportDafIntegrationTest`). Ce que ces parcours ajoutent est la continuité
 * réelle : ce qu'un utilisateur produit dans son navigateur apparaît bien dans
 * celui d'un autre, avec le bon rôle et au bon moment.</p>
 */
test.describe("Chaîne hiérarchique", () => {
  test("REC-H04 et REC-H05 — l'Agent produit un compte rendu, le Gestionnaire le reçoit et le contrôle", async ({
    browser,
  }) => {
    const suffixe = suffixeUnique();
    const synthese = `Tournée E2E ${suffixe}`;

    // --- Côté Agent : produire puis transmettre ---
    const contexteAgent = await browser.newContext();
    const pageAgent = await contexteAgent.newPage();
    await seConnecter(pageAgent, "agent");

    await pageAgent.goto("/comptes-rendus/nouveau");
    await pageAgent.getByLabel("Visites effectuées").fill("7");
    await pageAgent.getByLabel("Adhérents rencontrés").fill("5");
    await pageAgent.getByLabel("Paiements enregistrés").fill("3");
    await pageAgent.getByLabel(/Montant collecté/).fill("21000");
    await pageAgent.getByLabel("Synthèse").fill(synthese);
    await pageAgent.getByRole("button", { name: "Enregistrer le brouillon" }).click();

    // Un brouillon n'est pas encore transmis : le Gestionnaire ne doit rien voir avant l'envoi explicite.
    await expect(pageAgent.getByText("Brouillon non transmis")).toBeVisible({ timeout: 20_000 });

    await pageAgent.getByRole("button", { name: /^Transmettre au Gestionnaire/ }).click();
    // La boîte de confirmation reprend le verbe de l'action (`libelleConfirmation`), elle
    // n'affiche pas « Confirmer ». `exact` distingue ce bouton de celui qui l'a ouverte.
    await pageAgent.getByRole("button", { name: "Transmettre", exact: true }).click();
    // `exact` : « Transmis » seul apparaît aussi dans « Brouillon non transmis » et dans
    // le texte de la boîte de confirmation. Ici on veut la pastille de statut.
    await expect(pageAgent.getByText("Transmis", { exact: true })).toBeVisible({ timeout: 20_000 });

    // --- Côté Gestionnaire : recevoir puis contrôler ---
    const contexteGestionnaire = await browser.newContext();
    const pageGestionnaire = await contexteGestionnaire.newPage();
    await seConnecter(pageGestionnaire, "gestionnaire");

    await pageGestionnaire.goto("/comptes-rendus?onglet=a-controler");
    await expect(pageGestionnaire.getByRole("button", { name: "Contrôler" }).first()).toBeVisible({
      timeout: 20_000,
    });

    await pageGestionnaire.getByRole("button", { name: "Contrôler" }).first().click();
    await pageGestionnaire
      .getByLabel("Observation de contrôle")
      .fill(`Chiffres cohérents — vérification E2E ${suffixe}`);
    await pageGestionnaire.getByRole("button", { name: "Marquer contrôlé" }).click();

    await expect(pageGestionnaire.getByText("Compte rendu contrôlé.")).toBeVisible({ timeout: 20_000 });

    await contexteAgent.close();
    await contexteGestionnaire.close();
  });

  test("REC-H10 et REC-H11 — le DAF produit un rapport, le PCA le consulte une fois transmis", async ({
    browser,
  }) => {
    const suffixe = suffixeUnique();
    const titre = `Rapport E2E ${suffixe}`;

    // --- Côté DAF : produire puis transmettre ---
    const contexteDaf = await browser.newContext();
    const pageDaf = await contexteDaf.newPage();
    await seConnecter(pageDaf, "daf");

    await pageDaf.goto("/rapports");
    await pageDaf.getByRole("button", { name: "Produire un rapport" }).click();
    const dialogueProduction = pageDaf.getByRole("dialog");
    await dialogueProduction.getByLabel("Titre").fill(titre);
    // `exact` : le bouton qui a ouvert la boîte s'appelle « Produire un rapport » et
    // correspondrait lui aussi à une recherche partielle sur « Produire ».
    await dialogueProduction.getByRole("button", { name: "Produire", exact: true }).click();
    await expect(pageDaf.getByText(/Rapport produit/)).toBeVisible({ timeout: 20_000 });

    // --- Côté PCA : rien avant transmission ---
    const contextePca = await browser.newContext();
    const pagePca = await contextePca.newPage();
    await seConnecter(pagePca, "pca");
    await pagePca.goto("/rapports");
    await expect(pagePca.getByText(titre)).toHaveCount(0);

    // --- Le DAF transmet ---
    await pageDaf.goto("/rapports");
    const ligne = pageDaf.getByRole("row").filter({ hasText: titre });
    await ligne.getByRole("button", { name: "Transmettre au PCA" }).click();
    await pageDaf.getByRole("button", { name: "Transmettre", exact: true }).click();
    await expect(pageDaf.getByText("Rapport transmis au PCA.")).toBeVisible({ timeout: 20_000 });

    // --- REC-H11 : le PCA y accède ---
    await pagePca.reload();
    await expect(pagePca.getByText(titre)).toBeVisible({ timeout: 20_000 });

    await contexteDaf.close();
    await contextePca.close();
  });
});
