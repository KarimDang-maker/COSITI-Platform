import { describe, expect, it, vi } from "vitest";
import { useState } from "react";
import userEvent from "@testing-library/user-event";
import { rendreAvecProviders, screen } from "@/test/rendu";
import { Calendrier } from "@/components/cositi/calendrier";
import { SelecteurPeriode, type Periode } from "@/components/cositi/selecteur-periode";
import { ChampDate } from "@/components/cositi/champ-date";

describe("Calendrier", () => {
  it("affiche le mois du jour choisi, lundi en tête de semaine", () => {
    rendreAvecProviders(<Calendrier debut="2026-01-14" onSelectionner={() => {}} />);

    expect(screen.getByRole("combobox", { name: "Mois" })).toHaveValue("0");
    expect(screen.getByRole("spinbutton", { name: "Année" })).toHaveValue(2026);
    expect(screen.getAllByRole("columnheader")[0]).toHaveTextContent("Lun");
    // Six semaines complètes : le 1er janvier 2026 est un jeudi, la grille commence le lundi 29 décembre.
    expect(screen.getByRole("button", { name: "29 décembre 2025" })).toBeInTheDocument();
  });

  it("ferme une période au second clic et remet les bornes dans l'ordre", async () => {
    const utilisateur = userEvent.setup();
    const onSelectionner = vi.fn();
    rendreAvecProviders(<Calendrier mode="periode" debut="2026-01-01" onSelectionner={onSelectionner} />);

    await utilisateur.click(screen.getByRole("button", { name: "22 janvier 2026" }));
    expect(onSelectionner).not.toHaveBeenCalled();
    expect(screen.getByText("Choisissez la date de fin.")).toBeInTheDocument();

    await utilisateur.click(screen.getByRole("button", { name: "14 janvier 2026" }));
    expect(onSelectionner).toHaveBeenCalledWith("2026-01-14", "2026-01-22");
  });

  it("refuse un jour hors des bornes", async () => {
    const utilisateur = userEvent.setup();
    const onSelectionner = vi.fn();
    rendreAvecProviders(<Calendrier debut="2026-01-14" max="2026-01-20" onSelectionner={onSelectionner} />);

    expect(screen.getByRole("button", { name: "22 janvier 2026" })).toBeDisabled();
    await utilisateur.click(screen.getByRole("button", { name: "18 janvier 2026" }));
    expect(onSelectionner).toHaveBeenCalledWith("2026-01-18");
  });

  it("change de mois au clavier (Page suivante)", async () => {
    const utilisateur = userEvent.setup();
    rendreAvecProviders(<Calendrier debut="2026-01-14" onSelectionner={() => {}} />);

    screen.getByRole("button", { name: "14 janvier 2026" }).focus();
    await utilisateur.keyboard("{PageDown}");
    expect(screen.getByRole("combobox", { name: "Mois" })).toHaveValue("1");
  });
});

describe("SelecteurPeriode", () => {
  function Hote() {
    const [periode, setPeriode] = useState<Periode | undefined>();
    return <SelecteurPeriode periode={periode} onChange={setPeriode} libelleParDefaut="Mois en cours" max="2026-12-31" />;
  }

  it("écrit la période choisie en toutes lettres et permet de revenir au défaut de l'API", async () => {
    const utilisateur = userEvent.setup();
    rendreAvecProviders(<Hote />);

    expect(screen.getByRole("button", { name: /Mois en cours/ })).toBeInTheDocument();
    await utilisateur.click(screen.getByRole("button", { name: /Modifier la période/ }));
    // Mois affiché : celui du jour. On navigue vers janvier 2026 par le menu du mois et l'année.
    await utilisateur.selectOptions(screen.getByRole("combobox", { name: "Mois" }), "0");
    const annee = screen.getByRole("spinbutton", { name: "Année" });
    await utilisateur.clear(annee);
    await utilisateur.type(annee, "2026");
    await utilisateur.click(screen.getByRole("button", { name: "14 janvier 2026" }));
    await utilisateur.click(screen.getByRole("button", { name: "22 janvier 2026" }));

    expect(await screen.findByText("14 janvier 2026 – 22 janvier 2026")).toBeInTheDocument();

    await utilisateur.click(screen.getByRole("button", { name: /Modifier la période/ }));
    await utilisateur.click(screen.getByRole("button", { name: "Revenir à : Mois en cours" }));
    expect(await screen.findByText("Mois en cours")).toBeInTheDocument();
  });
});

describe("ChampDate", () => {
  it("reste un champ date saisissable et reçoit le jour choisi dans le calendrier", async () => {
    const utilisateur = userEvent.setup();
    const onChange = vi.fn();
    rendreAvecProviders(
      <>
        <label htmlFor="date">Date du paiement</label>
        <ChampDate id="date" defaultValue="2026-01-14" onChange={(e) => onChange(e.target.value)} />
      </>,
    );

    expect(screen.getByLabelText("Date du paiement")).toHaveAttribute("type", "date");
    await utilisateur.click(screen.getByRole("button", { name: "Ouvrir le calendrier" }));
    await utilisateur.click(screen.getByRole("button", { name: "20 janvier 2026" }));

    expect(onChange).toHaveBeenLastCalledWith("2026-01-20");
    expect(screen.getByLabelText("Date du paiement")).toHaveValue("2026-01-20");
  });
});
