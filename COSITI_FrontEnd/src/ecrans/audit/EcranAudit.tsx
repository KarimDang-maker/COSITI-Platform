import { useMemo } from "react";
import { useSearchParams } from "react-router";
import type { ColumnDef } from "@tanstack/react-table";
import { CoquilleApplication } from "@/components/cositi/coquille-application";
import { BarreFiltres } from "@/components/cositi/barre-filtres";
import { TableauDonnees } from "@/components/cositi/tableau-donnees";
import { EnTetePage } from "@/components/cositi/entete-page";
import { Pagination } from "@/components/cositi/pagination";
import { EtatVide } from "@/components/cositi/etat-vide";
import { SqueletteTableau } from "@/components/cositi/squelette-tableau";
import { Alerte } from "@/components/cositi/alerte";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAudit } from "@/hooks/useAudit";
import type { LigneAudit } from "@/api/audit";
import { estErreurApi } from "@/api/erreurs";
import { ChampDate } from "@/components/cositi/champ-date";
import { abregerIdentifiant, formaterDateHeure } from "@/lib/format";

const TAILLE_PAGE = 50;

/**
 * `/audit` — Journal d'audit (J10).
 *
 * **Lecture seule, sans exception.** L'API n'expose aucune écriture ni purge, quel
 * que soit le rôle (`03_SPECIFICATIONS_API.md §10`) : cet écran n'offre donc
 * aucune action, pas même pour un administrateur. Un journal qu'on peut modifier
 * ne prouve rien.
 *
 * Les valeurs avant/après ne sont pas affichées : elles contiennent des données
 * personnelles masquées côté serveur, et les exposer dans une liste en ferait une
 * porte dérobée vers le référentiel. Le motif, lui, est visible — c'est ce qui
 * explique une opération.
 */
export function EcranAudit() {
  const [parametres, definirParametres] = useSearchParams();

  const entite = parametres.get("entite") ?? "";
  const type = parametres.get("type") ?? "";
  const depuis = parametres.get("depuis") ?? "";
  const page = Number(parametres.get("page") ?? "0");

  const filtres = useMemo(
    () => ({
      entite: entite || undefined,
      type: type || undefined,
      // L'API attend un instant ISO ; le champ de saisie donne une date.
      depuis: depuis ? `${depuis}T00:00:00Z` : undefined,
      page,
      taille: TAILLE_PAGE,
    }),
    [entite, type, depuis, page],
  );

  const { data, isLoading, isError, error } = useAudit(filtres);

  function mettreAJour(cle: string, valeur: string | undefined) {
    const suivants = new URLSearchParams(parametres);
    if (valeur) suivants.set(cle, valeur);
    else suivants.delete(cle);
    if (cle !== "page") suivants.delete("page");
    definirParametres(suivants, { replace: true });
  }

  const colonnes = useMemo<ColumnDef<LigneAudit>[]>(
    () => [
      {
        id: "horodatage",
        header: "Horodatage",
        cell: ({ row }) => formaterDateHeure(row.original.horodatage),
      },
      {
        id: "utilisateur",
        header: "Auteur",
        cell: ({ row }) => row.original.utilisateurIdentifiant ?? "système",
      },
      {
        id: "typeOperation",
        header: "Opération",
        cell: ({ row }) => <span className="ref">{row.original.typeOperation}</span>,
      },
      {
        id: "entite",
        header: "Objet",
        cell: ({ row }) => (
          <span>
            {row.original.entite}
            {row.original.entiteId && (
              <span className="ref text-texte-doux"> {abregerIdentifiant(row.original.entiteId)}</span>
            )}
          </span>
        ),
      },
      {
        id: "resultat",
        header: "Résultat",
        cell: ({ row }) => row.original.resultat,
      },
      {
        id: "motif",
        header: "Motif",
        cell: ({ row }) => (
          <span className="text-sm text-texte-doux">{row.original.motif ?? "—"}</span>
        ),
      },
      {
        id: "correlation",
        header: "Corrélation",
        // V21 : même identifiant dans les journaux serveur et les erreurs affichées (« traceId ») — sert à relier
        // une plainte utilisateur à la ligne d'audit correspondante.
        cell: ({ row }) =>
          row.original.correlationId ? (
            <span className="ref text-xs" title={row.original.correlationId}>
              {row.original.correlationId.slice(0, 8)}
            </span>
          ) : (
            "—"
          ),
      },
    ],
    [],
  );

  return (
    <CoquilleApplication titre="Audit">
      <div className="space-y-6">
        <EnTetePage
          titre="Journal d'audit"
          description="Trace immuable des opérations. Aucune modification ni purge n'est possible depuis l'application, quel que soit le rôle."
        />

        <BarreFiltres>
          <div className="space-y-1.5">
            <Label htmlFor="filtre-entite">Objet</Label>
            <Input
              id="filtre-entite"
              className="w-44"
              placeholder="paiement, adherent…"
              defaultValue={entite}
              onChange={(evenement) => mettreAJour("entite", evenement.target.value || undefined)}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="filtre-type">Type d'opération</Label>
            <Input
              id="filtre-type"
              className="w-56"
              placeholder="PAIEMENT_VALIDATION…"
              defaultValue={type}
              onChange={(evenement) => mettreAJour("type", evenement.target.value || undefined)}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="filtre-depuis">Depuis le</Label>
            <ChampDate
              id="filtre-depuis"
              className="w-44"
              defaultValue={depuis}
              onChange={(evenement) => mettreAJour("depuis", evenement.target.value || undefined)}
            />
          </div>
        </BarreFiltres>

        {isLoading && <SqueletteTableau colonnes={6} />}

        {isError && (
          <Alerte teinte="danger" titre="Impossible de charger le journal d'audit">
            <p>{estErreurApi(error) ? error.message : "Une erreur inattendue est survenue."}</p>
          </Alerte>
        )}

        {data && data.contenu.length === 0 && (
          <EtatVide
            titre="Aucune opération ne correspond à ces critères"
            description="Élargissez la période ou retirez un filtre."
          />
        )}

        {data && data.contenu.length > 0 && (
          <TableauDonnees
            colonnes={colonnes}
            lignes={data.contenu}
            cleLigne={(l) => l.id}
            pied={
              <Pagination
                page={page}
                totalPages={data.totalPages}
                totalElements={data.totalElements}
                libelleElements="opérations"
                onChangerPage={(prochaine) => mettreAJour("page", String(prochaine))}
              />
            }
          />
        )}
      </div>
    </CoquilleApplication>
  );
}
