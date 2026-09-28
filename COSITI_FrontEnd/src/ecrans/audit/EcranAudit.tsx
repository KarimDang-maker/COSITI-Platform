import { useMemo } from "react";
import { useSearchParams } from "react-router";
import type { ColumnDef } from "@tanstack/react-table";
import { CoquilleApplication } from "@/components/cositi/coquille-application";
import { BarreFiltres } from "@/components/cositi/barre-filtres";
import { TableauDonnees } from "@/components/cositi/tableau-donnees";
import { EtatVide } from "@/components/cositi/etat-vide";
import { SqueletteTableau } from "@/components/cositi/squelette-tableau";
import { Alerte } from "@/components/cositi/alerte";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAudit } from "@/hooks/useAudit";
import { useLancerExport } from "@/hooks/useExports";
import { usePermission } from "@/auth/ContexteAuth";
import type { LigneAudit } from "@/api/audit";
import { estErreurApi } from "@/api/erreurs";
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
  // Réservé au Super Administrateur (correctif COSITI V1 §3) : « le bouton Exporter PDF / Imprimer
  // l'audit doit donc être invisible pour le PCA et tous les autres rôles ». Le frontend masque —
  // l'autorisation réelle reste vérifiée côté API (`AUDIT:EXPORTER`), jamais ici.
  const peutExporter = usePermission("AUDIT:EXPORTER");
  const lancerExport = useLancerExport();

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
    ],
    [],
  );

  return (
    <CoquilleApplication titre="Audit">
      <div className="space-y-4">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h1>Journal d'audit</h1>
            <p className="text-texte-doux">
              Trace immuable des opérations. Aucune modification ni purge n'est possible depuis
              l'application, quel que soit le rôle.
            </p>
          </div>
          {peutExporter && (
            <Button
              variant="outline"
              disabled={lancerExport.isPending}
              onClick={() =>
                lancerExport.mutate({ type: "audit", filtres: { entite, type, depuis: filtres.depuis } })
              }
            >
              {lancerExport.isPending ? "Export en cours…" : "Exporter (CSV)"}
            </Button>
          )}
        </div>

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
            <Input
              id="filtre-depuis"
              type="date"
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
          <>
            <TableauDonnees colonnes={colonnes} lignes={data.contenu} cleLigne={(l) => l.id} />
            <div className="flex items-center justify-between text-sm text-texte-doux">
              <p>{data.totalElements} opération(s)</p>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  disabled={page <= 0}
                  onClick={() => mettreAJour("page", String(page - 1))}
                >
                  Précédent
                </Button>
                <span>
                  Page {page + 1} sur {Math.max(data.totalPages, 1)}
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={page + 1 >= data.totalPages}
                  onClick={() => mettreAJour("page", String(page + 1))}
                >
                  Suivant
                </Button>
              </div>
            </div>
          </>
        )}
      </div>
    </CoquilleApplication>
  );
}
