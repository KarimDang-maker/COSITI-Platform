import { describe, expect, it } from "vitest";
import userEvent from "@testing-library/user-event";
import { http, HttpResponse } from "msw";
import { rendreAvecProviders, screen, within } from "@/test/rendu";
import { serveur } from "@/test/msw/serveur";
import { JETON_GESTIONNAIRE } from "@/test/msw/donnees";
import { ChecklistArchivage } from "@/ecrans/cnps/ChecklistArchivage";

function simulerSession(jeton: string) {
  serveur.use(http.post("/api/v1/auth/rafraichir", () => HttpResponse.json({ jetonAcces: jeton })));
}

function ligne(libelle: string): HTMLElement {
  return screen.getByText(libelle).closest("li") as HTMLElement;
}

describe("ChecklistArchivage", () => {
  it("affiche la progression des pièces bloquantes et le statut de chaque pièce", async () => {
    simulerSession(JETON_GESTIONNAIRE);
    rendreAvecProviders(<ChecklistArchivage dossierId="dos-p5" adherentId="adh-p5" peutGerer />);

    await screen.findByText("1/3 pièces bloquantes prêtes");
    expect(screen.getByText("Archivage incomplet")).toBeInTheDocument();
    expect(within(ligne("CNI recto")).getByText("Non fournie")).toBeInTheDocument();
    expect(within(ligne("Acte de naissance")).getByText("Fournie")).toBeInTheDocument();
    expect(within(ligne("Acte de naissance")).getByText(/acte\.pdf/)).toBeInTheDocument();
    expect(within(ligne("Photo d'identité")).getByText(/Référence physique : CL-12/)).toBeInTheDocument();
    expect(within(ligne("Formulaire signé")).getByText("Archivée")).toBeInTheDocument();
  });

  it("propose les actions selon le statut de la pièce", async () => {
    simulerSession(JETON_GESTIONNAIRE);
    rendreAvecProviders(<ChecklistArchivage dossierId="dos-p5" adherentId="adh-p5" peutGerer />);
    await screen.findByText("1/3 pièces bloquantes prêtes");

    const nonFournie = within(ligne("CNI recto"));
    expect(nonFournie.getByRole("button", { name: /Marquer fournie/ })).toBeInTheDocument();
    expect(nonFournie.queryByRole("button", { name: /Retirer/ })).not.toBeInTheDocument();

    const fournie = within(ligne("Acte de naissance"));
    expect(fournie.getByRole("button", { name: /^Vérifier/ })).toBeInTheDocument();
    expect(fournie.getByRole("button", { name: /Remplacer le document/ })).toBeInTheDocument();
    expect(fournie.getByRole("button", { name: /Retirer/ })).toBeInTheDocument();

    const verifiee = within(ligne("Photo d'identité"));
    expect(verifiee.getByRole("button", { name: /^Archiver/ })).toBeInTheDocument();
    expect(verifiee.queryByRole("button", { name: /^Vérifier/ })).not.toBeInTheDocument();

    const archivee = within(ligne("Formulaire signé"));
    expect(archivee.getByRole("button", { name: /Retirer/ })).toBeInTheDocument();
    expect(archivee.queryByRole("button", { name: /Archiver/ })).not.toBeInTheDocument();
  });

  it("n'affiche aucune action sans la permission de gérer", async () => {
    simulerSession(JETON_GESTIONNAIRE);
    rendreAvecProviders(<ChecklistArchivage dossierId="dos-p5" adherentId="adh-p5" peutGerer={false} />);
    await screen.findByText("1/3 pièces bloquantes prêtes");

    expect(screen.queryByRole("button")).not.toBeInTheDocument();
  });

  it("vérifie une pièce fournie", async () => {
    simulerSession(JETON_GESTIONNAIRE);
    const utilisateur = userEvent.setup();
    rendreAvecProviders(<ChecklistArchivage dossierId="dos-p5" adherentId="adh-p5" peutGerer />);
    await screen.findByText("1/3 pièces bloquantes prêtes");

    await utilisateur.click(within(ligne("Acte de naissance")).getByRole("button", { name: /^Vérifier/ }));
    await utilisateur.click(await screen.findByRole("button", { name: "Marquer vérifiée" }));

    await screen.findByText("Pièce « Acte de naissance » mise à jour.");
  });

  it("exige un motif pour retirer une pièce", async () => {
    simulerSession(JETON_GESTIONNAIRE);
    const utilisateur = userEvent.setup();
    rendreAvecProviders(<ChecklistArchivage dossierId="dos-p5" adherentId="adh-p5" peutGerer />);
    await screen.findByText("1/3 pièces bloquantes prêtes");

    await utilisateur.click(within(ligne("Acte de naissance")).getByRole("button", { name: /Retirer/ }));
    const confirmer = await screen.findByRole("button", { name: "Retirer la pièce" });
    expect(confirmer).toBeDisabled();

    await utilisateur.type(screen.getByLabelText("Motif du retrait"), "Document illisible");
    expect(confirmer).toBeEnabled();
  });

  it("affiche le refus métier de l'API sur un changement de statut", async () => {
    simulerSession(JETON_GESTIONNAIRE);
    serveur.use(
      http.patch("/api/v1/cnps/dossiers/:dossierId/checklist-archivage/:codePiece", () =>
        HttpResponse.json(
          { code: "ARCHIVAGE_RATTACHEMENT_REQUIS", message: "Rattachez un document ou une référence physique.", traceId: "t-1" },
          { status: 422 },
        ),
      ),
    );
    const utilisateur = userEvent.setup();
    rendreAvecProviders(<ChecklistArchivage dossierId="dos-p5" adherentId="adh-p5" peutGerer />);
    await screen.findByText("1/3 pièces bloquantes prêtes");

    await utilisateur.click(within(ligne("CNI recto")).getByRole("button", { name: /Marquer fournie/ }));
    await utilisateur.click(await screen.findByRole("button", { name: "Enregistrer" }));

    await screen.findByText("Rattachez un document ou une référence physique.");
  });
});
