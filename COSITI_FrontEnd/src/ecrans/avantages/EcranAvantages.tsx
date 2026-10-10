import { useMemo, useState } from "react";
import { Link, useSearchParams } from "react-router";
import { Pencil, Plus, RefreshCcw } from "lucide-react";
import { toast } from "sonner";
import type { ColumnDef } from "@tanstack/react-table";
import { CoquilleApplication } from "@/components/cositi/coquille-application";
import { EnTetePage } from "@/components/cositi/entete-page";
import { BarreFiltres } from "@/components/cositi/barre-filtres";
import { CarteSection } from "@/components/cositi/carte-section";
import { TableauDonnees } from "@/components/cositi/tableau-donnees";
import { CelluleIdentite } from "@/components/cositi/cellule-identite";
import { BadgeStatut } from "@/components/cositi/badge-statut";
import { EtatVide } from "@/components/cositi/etat-vide";
import { SqueletteTableau } from "@/components/cositi/squelette-tableau";
import { Alerte } from "@/components/cositi/alerte";
import { SelectRecherche } from "@/components/cositi/select-recherche";
import { DialogueConfirmation } from "@/components/cositi/dialogue-confirmation";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/auth/ContexteAuth";
import { useZones } from "@/hooks/useOrganisation";
import { useAvantages, useBeneficiaires, useRecalculerAvantages } from "@/hooks/useAvantages";
import {
  BRANCHES_AVANTAGE,
  STATUTS_AVANTAGE,
  type Avantage,
  type Beneficiaire,
  type StatutAvantage,
} from "@/api/avantages";
import { estErreurApi } from "@/api/erreurs";
import { formaterDate, formaterMatricule, formaterNombre } from "@/lib/format";
import { DialogueAvantage } from "@/ecrans/avantages/DialogueAvantage";

const STATUTS_VALIDES = new Set<string>(STATUTS_AVANTAGE.map((s) => s.valeur));
const BRANCHES_VALIDES = new Set<string>(BRANCHES_AVANTAGE.map((b) => b.valeur));

function message(erreur: unknown): string {
  return estErreurApi(erreur) ? erreur.message : "Une erreur inattendue est survenue.";
}

/**
 * `/avantages` — Catalogue des avantages et couvertures, et bénéficiaires de l'avantage choisi. Les statuts, les
 * critères manquants et les effectifs sont ceux du moteur serveur : cet écran ne tranche aucune éligibilité. Le recalcul
 * relève de `AVANTAGE:RECALCULER`, la gestion du catalogue de `AVANTAGE:GERER` (DAF).
 */
export function EcranAvantages() {
  const [parametres, definirParametres] = useSearchParams();
  const { aLaPermission } = useAuth();
  const peutRecalculer = aLaPermission("AVANTAGE:RECALCULER");
  const peutGerer = aLaPermission("AVANTAGE:GERER");

  const brancheUrl = parametres.get("branche");
  const branche = brancheUrl && BRANCHES_VALIDES.has(brancheUrl) ? brancheUrl : "";
  const statutUrl = parametres.get("statut");
  const statut = (statutUrl && STATUTS_VALIDES.has(statutUrl) ? statutUrl : "ACQUIS") as StatutAvantage;
  const zoneId = parametres.get("zoneId") ?? undefined;
  const avantageId = parametres.get("avantage") ?? undefined;

  // Le DAF voit aussi les avantages désactivés pour pouvoir les réactiver.
  const catalogue = useAvantages(peutGerer);
  const zones = useZones();
  const recalcul = useRecalculerAvantages();
  const [confirmationRecalcul, setConfirmationRecalcul] = useState(false);
  const [edition, setEdition] = useState<{ avantage: Avantage | null } | null>(null);

  const avantagesVisibles = useMemo(
    () => (catalogue.data ?? []).filter((a) => !branche || a.branche === branche),
    [catalogue.data, branche],
  );
  const avantageChoisi = avantagesVisibles.find((a) => a.id === avantageId) ?? avantagesVisibles[0];
  const beneficiaires = useBeneficiaires(avantageChoisi?.id, statut, zoneId);

  function mettreAJourParametre(cle: string, valeur: string | undefined) {
    const suivants = new URLSearchParams(parametres);
    if (valeur) suivants.set(cle, valeur);
    else suivants.delete(cle);
    definirParametres(suivants, { replace: true });
  }

  async function recalculer() {
    try {
      const resultat = await recalcul.mutateAsync();
      toast.success(
        `Recalcul terminé : ${formaterNombre(resultat.adherentsEvalues)} adhérents évalués sur ${formaterNombre(
          resultat.avantagesEvalues,
        )} avantages, ${formaterNombre(resultat.changements)} changement(s) de statut.`,
      );
      setConfirmationRecalcul(false);
    } catch (e) {
      setConfirmationRecalcul(false);
      toast.error(estErreurApi(e) ? e.message : "Le recalcul n'a pas pu être lancé.");
    }
  }

  const colonnesCatalogue = useMemo<ColumnDef<Avantage>[]>(
    () => [
      {
        id: "avantage",
        header: "Avantage",
        cell: ({ row }) => (
          <CelluleIdentite nom={row.original.libelle} detail={<span className="ref">{row.original.code}</span>} />
        ),
      },
      { id: "branche", header: "Branche", cell: ({ row }) => <BadgeStatut domaine="brancheAvantage" code={row.original.branche} /> },
      {
        id: "criteres",
        header: "Critères",
        cell: ({ row }) =>
          row.original.criteres.length === 0 ? (
            <span className="text-texte-doux">—</span>
          ) : (
            <ul className="space-y-0.5 text-sm">
              {row.original.criteres.map((c, i) => (
                <li key={`${c.type}-${i}`}>{c.libelle ?? c.type}</li>
              ))}
            </ul>
          ),
      },
      { id: "acquis", header: "Acquis", cell: ({ row }) => <span className="chiffre">{formaterNombre(row.original.nbAcquis)}</span> },
      { id: "enCours", header: "En cours", cell: ({ row }) => <span className="chiffre">{formaterNombre(row.original.nbEnCours)}</span> },
      { id: "suspendus", header: "Suspendus", cell: ({ row }) => <span className="chiffre">{formaterNombre(row.original.nbSuspendus)}</span> },
      {
        id: "etat",
        header: "État",
        cell: ({ row }) => (
          <span className="flex flex-wrap gap-1.5">
            {!row.original.actif && <BadgeStatut domaine="agent" code="INACTIF" />}
            {row.original.statutValidation === "V" && <BadgeStatut domaine="validationParametre" code="V" />}
            {row.original.actif && row.original.statutValidation !== "V" && <span className="text-texte-doux">Actif</span>}
          </span>
        ),
      },
      {
        id: "actions",
        header: "",
        cell: ({ row }) =>
          peutGerer ? (
            <Button
              variant="outline"
              size="sm"
              aria-label={`Modifier l'avantage ${row.original.libelle}`}
              onClick={(e) => {
                e.stopPropagation();
                setEdition({ avantage: row.original });
              }}
            >
              <Pencil className="size-4" aria-hidden="true" /> Modifier
            </Button>
          ) : null,
      },
    ],
    [peutGerer],
  );

  const colonnesBeneficiaires = useMemo<ColumnDef<Beneficiaire>[]>(
    () => [
      {
        id: "adherent",
        header: "Adhérent",
        cell: ({ row }) => (
          <CelluleIdentite
            nom={row.original.nomComplet}
            detail={<span className="ref">{formaterMatricule(row.original.matricule)}</span>}
          />
        ),
      },
      {
        id: "zone",
        header: "Zone",
        cell: ({ row }) => (zones.data ?? []).find((z) => z.id === row.original.zoneId)?.libelle ?? "—",
      },
      { id: "statut", header: "Statut", cell: ({ row }) => <BadgeStatut domaine="statutAvantage" code={row.original.statut} /> },
      { id: "debut", header: "Depuis le", cell: ({ row }) => (row.original.dateDebut ? formaterDate(row.original.dateDebut) : "—") },
      {
        id: "manquants",
        header: "Critères manquants",
        cell: ({ row }) =>
          row.original.criteresManquants.length === 0 ? (
            <span className="text-texte-doux">—</span>
          ) : (
            <ul className="space-y-0.5 text-sm">
              {row.original.criteresManquants.map((c) => (
                <li key={c}>{c}</li>
              ))}
            </ul>
          ),
      },
      {
        id: "fiche",
        header: "",
        cell: ({ row }) => (
          <Link
            to={`/adherents/${row.original.adherentId}?onglet=avantages`}
            aria-label={`Fiche adhérent — ${row.original.nomComplet}`}
            className="text-sm font-semibold text-primaire underline underline-offset-2"
          >
            Fiche
          </Link>
        ),
      },
    ],
    [zones.data],
  );

  const optionsBranches = [{ valeur: "", libelle: "Toutes les branches" }, ...BRANCHES_AVANTAGE.map((b) => ({ valeur: b.valeur, libelle: b.libelle }))];
  const optionsZones = [
    { valeur: "", libelle: "Toutes les zones" },
    ...(zones.data ?? []).filter((z) => z.active).map((z) => ({ valeur: z.id, libelle: z.libelle })),
  ];

  return (
    <CoquilleApplication titre="Avantages">
      <div className="space-y-6">
        <EnTetePage
          titre="Avantages et couvertures"
          description="Droits et couvertures (prestations CNPS et avantages COSITI), critères d'attribution et adhérents qui en bénéficient."
          actions={
            <>
              {peutRecalculer && (
                <Button variant="outline" onClick={() => setConfirmationRecalcul(true)} disabled={recalcul.isPending}>
                  <RefreshCcw className="size-4" aria-hidden="true" /> Recalculer les avantages
                </Button>
              )}
              {peutGerer && (
                <Button onClick={() => setEdition({ avantage: null })}>
                  <Plus className="size-4" aria-hidden="true" /> Nouvel avantage
                </Button>
              )}
            </>
          }
        />

        <BarreFiltres>
          <div className="w-64 space-y-1.5">
            <Label htmlFor="filtre-branche-avantage">Branche</Label>
            <SelectRecherche
              id="filtre-branche-avantage"
              options={optionsBranches}
              valeur={branche}
              onChange={(valeur) => mettreAJourParametre("branche", valeur || undefined)}
            />
          </div>
          <div className="w-64 space-y-1.5">
            <Label htmlFor="filtre-statut-avantage">Statut des bénéficiaires</Label>
            <SelectRecherche
              id="filtre-statut-avantage"
              options={STATUTS_AVANTAGE.map((s) => ({ valeur: s.valeur, libelle: s.libelle }))}
              valeur={statut}
              onChange={(valeur) => mettreAJourParametre("statut", valeur === "ACQUIS" ? undefined : valeur)}
            />
          </div>
          <div className="w-64 space-y-1.5">
            <Label htmlFor="filtre-zone-avantage">Zone</Label>
            <SelectRecherche
              id="filtre-zone-avantage"
              options={optionsZones}
              valeur={zoneId ?? ""}
              onChange={(valeur) => mettreAJourParametre("zoneId", valeur || undefined)}
            />
          </div>
        </BarreFiltres>

        {catalogue.isLoading && <SqueletteTableau colonnes={7} />}
        {catalogue.isError && (
          <Alerte teinte="danger" titre="Impossible de charger le catalogue des avantages">
            <p>{message(catalogue.error)}</p>
          </Alerte>
        )}
        {catalogue.data && avantagesVisibles.length === 0 && (
          <EtatVide titre="Aucun avantage dans cette branche" description="Changez de branche pour élargir le catalogue." />
        )}
        {avantagesVisibles.length > 0 && (
          <CarteSection titre="Catalogue" description="Choisissez un avantage pour afficher ses bénéficiaires." contenuPleineLargeur>
            <TableauDonnees
              colonnes={colonnesCatalogue}
              lignes={avantagesVisibles}
              cleLigne={(a) => a.id}
              onActiverLigne={(a) => mettreAJourParametre("avantage", a.id)}
              libelleLigne={(a) => `Afficher les bénéficiaires de ${a.libelle}`}
              legende="Catalogue des avantages et couvertures"
            />
          </CarteSection>
        )}

        {avantageChoisi && (
          <CarteSection
            titre={`Bénéficiaires — ${avantageChoisi.libelle}`}
            description={`Adhérents dont le statut est « ${STATUTS_AVANTAGE.find((s) => s.valeur === statut)?.libelle ?? statut} » pour cet avantage.`}
            contenuPleineLargeur
          >
            {beneficiaires.isLoading && <SqueletteTableau colonnes={6} />}
            {beneficiaires.isError && (
              <div className="p-6">
                <Alerte teinte="danger" titre="Impossible de charger les bénéficiaires">
                  <p>{message(beneficiaires.error)}</p>
                </Alerte>
              </div>
            )}
            {beneficiaires.data && beneficiaires.data.length === 0 && (
              <EtatVide
                titre="Aucun adhérent ne correspond"
                description="Changez de statut ou de zone, ou relancez le recalcul des avantages."
              />
            )}
            {beneficiaires.data && beneficiaires.data.length > 0 && (
              <TableauDonnees
                colonnes={colonnesBeneficiaires}
                lignes={beneficiaires.data}
                cleLigne={(b) => b.adherentId}
                legende={`Adhérents de l'avantage ${avantageChoisi.libelle}`}
              />
            )}
          </CarteSection>
        )}
      </div>

      <DialogueConfirmation
        ouvert={confirmationRecalcul}
        onOuvertChange={setConfirmationRecalcul}
        titre="Recalculer les avantages ?"
        description="Le moteur réévalue tous les adhérents sur chaque avantage actif. Les changements de statut sont historisés."
        libelleConfirmation="Lancer le recalcul"
        enCours={recalcul.isPending}
        onConfirmer={recalculer}
      />

      <DialogueAvantage
        avantage={edition?.avantage ?? null}
        ouvert={edition !== null}
        onOuvertChange={(ouvert) => {
          if (!ouvert) setEdition(null);
        }}
      />
    </CoquilleApplication>
  );
}
