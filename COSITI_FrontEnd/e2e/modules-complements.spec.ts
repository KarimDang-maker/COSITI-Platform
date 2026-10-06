import { expect, test, type APIRequestContext } from "@playwright/test";
import { COMPTES, MOT_DE_PASSE_DEMO, seConnecter, suffixeUnique, telephoneUnique } from "./comptes";

/**
 * Recette E2E des fonctionnalités des 3 modules complétées le 05/10/2026 (reçu, changement de pack, zones,
 * adhérents sans zone, remise de caisse), sur la pile réelle : API Spring Boot + PostgreSQL + navigateur.
 *
 * Les données de départ (adhérent, frais validé par la DAF, cotisation en espèces) sont créées par l'API, comme le
 * ferait la saisie : le parcours vérifié ensuite est celui des écrans.
 */

const API = process.env.VITE_API_BASE_URL ?? "http://localhost:8083/api/v1";

async function jeton(request: APIRequestContext, compte: keyof typeof COMPTES): Promise<string> {
  const reponse = await request.post(`${API}/auth/connexion`, {
    data: { identifiant: COMPTES[compte], motDePasse: MOT_DE_PASSE_DEMO },
  });
  expect(reponse.ok()).toBeTruthy();
  return (await reponse.json()).jetonAcces as string;
}

interface Donnees {
  adherentId: string;
  matricule: string;
  paiementId: string;
  agentId: string;
  agentNom: string;
}

/** Adhérent avec frais validé par la DAF, pack choisi et une cotisation en espèces encaissée par un agent. */
async function preparer(request: APIRequestContext): Promise<Donnees> {
  const gest = await jeton(request, "gestionnaire");
  const daf = await jeton(request, "daf");
  const h = (t: string) => ({ Authorization: `Bearer ${t}` });

  const activites = await (await request.get(`${API}/activites`, { headers: h(gest) })).json();
  const packs = await (await request.get(`${API}/packs`, { headers: h(gest) })).json();
  const agents = await (await request.get(`${API}/agents?taille=50`, { headers: h(gest) })).json();
  const agent = (agents.contenu ?? agents)[0];

  const adherent = await (
    await request.post(`${API}/adherents`, {
      headers: h(gest),
      data: {
        nom: `RECETTE-E2E-${suffixeUnique()}`,
        telephonePrincipal: telephoneUnique(),
        activiteId: activites[0].id,
        dateAdhesion: "2026-09-01",
        quartier: "Akwa",
        ville: "Douala",
        confirmationDoublonIgnore: true,
      },
    })
  ).json();

  const frais = await (
    await request.post(`${API}/adherents/${adherent.id}/frais-adhesion`, {
      headers: h(gest),
      data: { agentId: agent.id, montantRecu: 1000, dateCollecte: "2026-09-01" },
    })
  ).json();
  expect((await request.post(`${API}/frais-adhesion/${frais.id}/valider`, { headers: h(daf) })).ok()).toBeTruthy();

  const paiement = await request.post(`${API}/paiements`, {
    headers: { ...h(gest), "Idempotency-Key": `e2e-${suffixeUnique()}-${Date.now()}` },
    data: {
      adherentId: adherent.id,
      datePaiement: new Date().toISOString().slice(0, 10),
      montant: 1500,
      modePaiement: "ESPECES",
      typePaiement: "COTISATION",
      agentEncaisseurId: agent.id,
      montantSecuriteSociale: 700,
      montantEpargne: 800,
      packId: packs[0].id,
    },
  });
  expect(paiement.status()).toBe(201);
  return {
    adherentId: adherent.id,
    matricule: adherent.matricule,
    paiementId: (await paiement.json()).id,
    agentId: agent.id,
    agentNom: agent.nomComplet,
  };
}

test.describe("Fonctionnalités complétées des 3 modules", () => {
  test("reçu de cotisation, changement de pack, remise de caisse déclarée puis réceptionnée", async ({ browser, request }) => {
    const d = await preparer(request);

    // --- Gestionnaire : reçu, pack, remise de caisse
    const gestionnaire = await browser.newPage();
    await seConnecter(gestionnaire, "gestionnaire");

    await gestionnaire.goto(`/cotisations/${d.paiementId}`);
    await gestionnaire.getByRole("button", { name: "Reçu" }).click();
    const recu = gestionnaire.getByRole("dialog");
    await expect(recu.getByText(d.matricule)).toBeVisible({ timeout: 20_000 });
    await expect(recu.getByText("dont Épargne")).toBeVisible();
    await expect(recu.getByRole("button", { name: "Imprimer" })).toBeEnabled();
    await gestionnaire.keyboard.press("Escape");

    await gestionnaire.goto(`/adherents/${d.adherentId}`);
    const changer = gestionnaire.getByRole("button", { name: "Changer", exact: true });
    await expect(changer).toBeVisible({ timeout: 20_000 });
    await changer.click();
    const dialoguePack = gestionnaire.getByRole("dialog");
    await dialoguePack.getByRole("combobox").click();
    const options = gestionnaire.getByRole("option");
    if ((await options.count()) > 0) {
      await options.first().click();
      await dialoguePack.getByRole("button", { name: "Changer de pack" }).click();
      await expect(gestionnaire.getByText("Pack changé.")).toBeVisible({ timeout: 20_000 });
    } else {
      // Référentiel à un seul pack actif : l'écran le dit au lieu de proposer un choix vide.
      await gestionnaire.keyboard.press("Escape");
      await expect(dialoguePack.getByText("Aucun autre pack disponible")).toBeVisible();
      await dialoguePack.getByRole("button", { name: "Annuler" }).click();
    }

    await gestionnaire.goto(`/agents/${d.agentId}`);
    await gestionnaire.getByRole("button", { name: "Déclarer une remise de caisse" }).click();
    const dialogueRemise = gestionnaire.getByRole("dialog");
    await expect(dialogueRemise.getByText(/REC-\d+/).first()).toBeVisible({ timeout: 20_000 });
    await dialogueRemise.getByRole("button", { name: "Déclarer la remise" }).click();
    await expect(gestionnaire.getByText(/déclarée : la DAF est notifiée/)).toBeVisible({ timeout: 20_000 });

    // --- DAF : réception de la remise, avec écart annoncé
    const daf = await browser.newPage();
    await seConnecter(daf, "daf");
    await daf.goto("/daf");
    await expect(daf.getByRole("heading", { name: "Remises de caisse" })).toBeVisible({ timeout: 20_000 });
    await daf.getByRole("button", { name: "Réceptionner" }).first().click();
    const dialogueReception = daf.getByRole("dialog");
    await dialogueReception.getByLabel("Montant réellement reçu (FCFA)").fill("1");
    await expect(dialogueReception.getByText(/Écart de/)).toBeVisible();
    await dialogueReception.getByLabel("Montant réellement reçu (FCFA)").fill("");
    // Montant déclaré exact : clôture sans écart.
    const declare = (await dialogueReception.locator("p,div").filter({ hasText: /déclarée le/ }).first().innerText()).match(
      /([\d\s  ]+)\s*FCFA/,
    );
    await dialogueReception.getByLabel("Montant réellement reçu (FCFA)").fill((declare?.[1] ?? "1500").replace(/[\s  ]/g, ""));
    await dialogueReception.getByRole("button", { name: "Confirmer la réception" }).click();
    await expect(daf.getByText(/Remise réceptionnée/)).toBeVisible({ timeout: 20_000 });
  });

  test("zones : création puis modification ; adhérents sans zone affectables (V23)", async ({ page, request }) => {
    const gest = await jeton(request, "gestionnaire");
    const activites = await (await request.get(`${API}/activites`, { headers: { Authorization: `Bearer ${gest}` } })).json();
    const nom = `SANSZONE-E2E-${suffixeUnique()}`;
    await request.post(`${API}/adherents`, {
      headers: { Authorization: `Bearer ${gest}` },
      data: { nom, telephonePrincipal: telephoneUnique(), activiteId: activites[0].id, dateAdhesion: "2026-09-01", confirmationDoublonIgnore: true },
    });

    await seConnecter(page, "gestionnaire");
    await page.goto("/organisation");
    const code = `ZE${suffixeUnique()}`.slice(0, 10);
    await page.getByRole("button", { name: "Nouvelle zone" }).click();
    const dialogue = page.getByRole("dialog");
    await dialogue.getByLabel("Code").fill(code);
    await dialogue.getByLabel("Libellé").fill(`Zone ${code}`);
    await dialogue.getByLabel("Ville").fill("Douala");
    await dialogue.getByLabel("Région").fill("Littoral");
    await dialogue.getByRole("button", { name: "Créer la zone" }).click();
    await expect(page.getByText("Zone créée.")).toBeVisible({ timeout: 20_000 });
    await expect(page.getByRole("cell", { name: `Zone ${code}`, exact: true })).toBeVisible();

    await page.getByRole("button", { name: `Modifier la zone Zone ${code}` }).click();
    await page.getByRole("dialog").getByLabel("Libellé").fill(`Zone ${code} Nord`);
    await page.getByRole("dialog").getByRole("button", { name: "Enregistrer" }).click();
    await expect(page.getByText("Zone modifiée.")).toBeVisible({ timeout: 20_000 });
    await expect(page.getByRole("cell", { name: `Zone ${code} Nord`, exact: true })).toBeVisible();

    await page.getByRole("combobox", { name: "Zone" }).click();
    await page.getByRole("option", { name: "Toutes les zones (y compris sans zone)" }).click();
    await expect(page.getByText(nom)).toBeVisible({ timeout: 20_000 });
  });
});
