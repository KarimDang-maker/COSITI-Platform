import { useState } from "react";
import { History, RotateCcw } from "lucide-react";
import { CarteSection } from "@/components/cositi/carte-section";
import { EtatVide } from "@/components/cositi/etat-vide";
import { Alerte } from "@/components/cositi/alerte";
import { AvertissementRegle } from "@/components/cositi/avertissement-regle";
import { ChampDate } from "@/components/cositi/champ-date";
import { Pagination } from "@/components/cositi/pagination";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useHistoriqueDossier } from "@/hooks/useAdherents";
import type { CategorieHistorique, EvenementHistorique, PeriodeHistorique } from "@/api/dossierAdherent";
import { estErreurApi } from "@/api/erreurs";
import { formaterDateHeure, formaterMontant } from "@/lib/format";
import { aujourdhui } from "@/ecrans/cotisations/dates";

const TAILLE_PAGE = 20;

const PERIODES: readonly { valeur: PeriodeHistorique | "TOUT"; libelle: string; vide: string }[] = [
  { valeur: "TOUT", libelle: "Toute la période", vide: "Aucune action enregistrée." },
  { valeur: "JOUR", libelle: "Jour", vide: "Aucune action enregistrée pour cette journée." },
  { valeur: "SEMAINE", libelle: "Semaine", vide: "Aucune action enregistrée pour cette semaine." },
  { valeur: "MOIS", libelle: "Mois", vide: "Aucune action enregistrée pour ce mois." },
  { valeur: "ANNEE", libelle: "Année", vide: "Aucune action enregistrée pour cette année." },
];

/** Clés de `details` qui portent un montant (liste blanche du serveur) — mises en forme comme montants. */
const CLES_MONTANT = /montant|ecart|solde|cumul/i;

/** Libellé lisible d'une clé technique `camelCase` (« montantEpargne » → « Montant epargne »). */
function libelleCle(cle: string): string {
  const texte = cle.replace(/([A-Z])/g, " $1").toLowerCase();
  return texte.charAt(0).toUpperCase() + texte.slice(1);
}

function valeurLisible(cle: string, valeur: unknown): string {
  if (valeur === null || valeur === undefined || valeur === "") return "—";
  if (typeof valeur === "number" && CLES_MONTANT.test(cle)) return formaterMontant(valeur);
  if (typeof valeur === "object") return JSON.stringify(valeur);
  return String(valeur);
}

function LigneEvenement({ e }: { e: EvenementHistorique }) {
  const details = Object.entries(e.details ?? {});
  return (
    <li className="relative">
      <span className="absolute top-1.5 -left-[1.9rem] size-3 rounded-full border-2 border-surface bg-primaire" aria-hidden="true" />
      <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
        <span className="font-semibold">{e.action ?? e.typeEvenement}</span>
        <time dateTime={e.horodatage} className="text-sm text-texte-doux-fort">
          {formaterDateHeure(e.horodatage)}
        </time>
        {e.referenceMetier && <span className="ref text-sm">{e.referenceMetier}</span>}
        {e.resultat && e.resultat !== "SUCCES" && <span className="text-sm font-semibold text-danger-fort">{e.resultat}</span>}
      </div>
      <p className="mt-1 text-sm">
        Par <span className="font-semibold">{e.acteur ?? "le système"}</span>
        {e.acteurRoles.length > 0 && <span className="text-texte-doux-fort"> ({e.acteurRoles.join(", ")})</span>}
      </p>
      {e.motif && <p className="mt-1 text-sm text-texte-doux-fort">Motif : {e.motif}</p>}
      {details.length > 0 && (
        <dl className="mt-1 flex flex-wrap gap-x-4 gap-y-1 text-sm">
          {details.map(([cle, valeur]) => (
            <div key={cle} className="flex gap-1">
              <dt className="text-texte-doux-fort">{libelleCle(cle)} :</dt>
              <dd className="chiffre">{valeurLisible(cle, valeur)}</dd>
            </div>
          ))}
        </dl>
      )}
      {e.modifications && e.modifications.length > 0 && (
        <ul className="mt-1 space-y-0.5 text-sm" aria-label="Champs modifiés">
          {e.modifications.map((m) => (
            <li key={m.champ}>
              <span className="text-texte-doux-fort">{libelleCle(m.champ)} :</span>{" "}
              {m.masque ? (
                <span>modifié (donnée protégée)</span>
              ) : (
                <>
                  {valeurLisible(m.champ, m.avant)} → <span className="font-medium">{valeurLisible(m.champ, m.apres)}</span>
                </>
              )}
            </li>
          ))}
        </ul>
      )}
    </li>
  );
}

/**
 * Un historique (général ou financier) : filtres période + date de référence et ordre envoyés au serveur, pagination
 * serveur. Rien n'est filtré ni recalculé dans le navigateur.
 */
function VueHistorique({ adherentId, categorie }: { adherentId: string; categorie: CategorieHistorique }) {
  const [periode, setPeriode] = useState<PeriodeHistorique | "TOUT">("TOUT");
  const [date, setDate] = useState(aujourdhui());
  const [direction, setDirection] = useState<"DESC" | "ASC">("DESC");
  const [page, setPage] = useState(0);
  const historique = useHistoriqueDossier(adherentId, categorie, {
    periode: periode === "TOUT" ? undefined : periode,
    date: periode === "TOUT" ? undefined : date,
    direction,
    page,
    taille: TAILLE_PAGE,
  });
  const prefixe = `historique-${categorie.toLowerCase()}`;
  const refuse = historique.isError && estErreurApi(historique.error) && historique.error.statut === 403;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end gap-4">
        <div className="space-y-1.5">
          <Label htmlFor={`${prefixe}-periode`}>Période</Label>
          <Select
            value={periode}
            onValueChange={(v) => {
              setPeriode(v as PeriodeHistorique | "TOUT");
              setPage(0);
            }}
          >
            <SelectTrigger id={`${prefixe}-periode`} className="w-48">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {PERIODES.map((p) => (
                <SelectItem key={p.valeur} value={p.valeur}>
                  {p.libelle}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        {periode !== "TOUT" && (
          <div className="space-y-1.5">
            <Label htmlFor={`${prefixe}-date`}>Date de référence</Label>
            <ChampDate
              id={`${prefixe}-date`}
              value={date}
              max={aujourdhui()}
              onChange={(e) => {
                setDate(e.target.value || aujourdhui());
                setPage(0);
              }}
            />
          </div>
        )}
        <div className="space-y-1.5">
          <Label htmlFor={`${prefixe}-ordre`}>Ordre</Label>
          <Select
            value={direction}
            onValueChange={(v) => {
              setDirection(v as "DESC" | "ASC");
              setPage(0);
            }}
          >
            <SelectTrigger id={`${prefixe}-ordre`} className="w-48">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="DESC">Plus récentes d'abord</SelectItem>
              <SelectItem value="ASC">Plus anciennes d'abord</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {historique.isLoading && <Skeleton className="h-40 w-full" />}
      {refuse && (
        <Alerte teinte="info" titre="Historique non accessible">
          <p>Votre profil ne permet pas de consulter cet historique.</p>
        </Alerte>
      )}
      {historique.isError && !refuse && (
        <Alerte
          teinte="danger"
          titre="Historique indisponible"
          action={
            <Button size="sm" variant="outline" onClick={() => void historique.refetch()}>
              <RotateCcw className="size-4" aria-hidden="true" />
              Réessayer
            </Button>
          }
        >
          <p>{estErreurApi(historique.error) ? historique.error.message : "L'historique n'a pas pu être chargé."}</p>
        </Alerte>
      )}
      {historique.data && (
        <>
          {historique.data.avertissements.length > 0 && <AvertissementRegle avertissements={historique.data.avertissements} />}
          {historique.data.contenu.length === 0 ? (
            <EtatVide
              icone={History}
              titre={PERIODES.find((p) => p.valeur === periode)?.vide ?? "Aucune action enregistrée."}
              description="Choisissez une autre période pour consulter d'autres actions."
            />
          ) : (
            <>
              <ol className="relative space-y-5 border-l border-bordure pl-6" aria-label={categorie === "GENERAL" ? "Historique général" : "Historique financier"}>
                {historique.data.contenu.map((e) => (
                  <LigneEvenement key={e.id} e={e} />
                ))}
              </ol>
              <Pagination
                page={historique.data.page}
                totalPages={historique.data.totalPages}
                totalElements={historique.data.totalElements}
                libelleElements="événements"
                onChangerPage={setPage}
                enCours={historique.isFetching}
              />
            </>
          )}
        </>
      )}
    </div>
  );
}

/**
 * Historiques du dossier (V22) : **général** (identité, coordonnées, documents, CNPS, statut, validation…,
 * `GET /historique-general`) et **financier** (frais d'adhésion, cotisations, validations, rejets, corrections,
 * `GET /historique-financier`, `PAIEMENT:LIRE` ou `FRAIS_ADHESION:LIRE`). Le serveur retire les événements internes
 * DGA / DAF / CNPS que le lecteur n'a pas à voir et masque les données personnelles sensibles.
 */
export function OngletHistorique({ adherentId, peutLireFinancier }: { adherentId: string; peutLireFinancier: boolean }) {
  const [vue, setVue] = useState<CategorieHistorique>("GENERAL");
  return (
    <CarteSection titre="Historique" description="Actions enregistrées sur ce dossier, avec leur auteur. Lecture seule.">
      <Tabs value={vue} onValueChange={(v) => setVue(v as CategorieHistorique)}>
        <TabsList>
          <TabsTrigger value="GENERAL">Historique général</TabsTrigger>
          {peutLireFinancier && <TabsTrigger value="FINANCIER">Historique financier</TabsTrigger>}
        </TabsList>
        <TabsContent value="GENERAL">{vue === "GENERAL" && <VueHistorique adherentId={adherentId} categorie="GENERAL" />}</TabsContent>
        {peutLireFinancier && (
          <TabsContent value="FINANCIER">
            {vue === "FINANCIER" && <VueHistorique adherentId={adherentId} categorie="FINANCIER" />}
          </TabsContent>
        )}
      </Tabs>
    </CarteSection>
  );
}
