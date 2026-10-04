import { useMemo } from "react";
import { useSearchParams } from "react-router";
import { Coins, Equal, X } from "lucide-react";
import type { ColumnDef } from "@tanstack/react-table";
import { CoquilleApplication } from "@/components/cositi/coquille-application";
import { EnTetePage } from "@/components/cositi/entete-page";
import { CarteSection } from "@/components/cositi/carte-section";
import { BadgeStatut } from "@/components/cositi/badge-statut";
import { Alerte } from "@/components/cositi/alerte";
import { AvertissementRegle } from "@/components/cositi/avertissement-regle";
import { BarreFiltres } from "@/components/cositi/barre-filtres";
import { ChampDate } from "@/components/cositi/champ-date";
import { EtatVide } from "@/components/cositi/etat-vide";
import { SelectRecherche } from "@/components/cositi/select-recherche";
import { SqueletteTableau } from "@/components/cositi/squelette-tableau";
import { TableauDonnees } from "@/components/cositi/tableau-donnees";
import { Pagination } from "@/components/cositi/pagination";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { usePermission } from "@/auth/ContexteAuth";
import { useAgents } from "@/hooks/useOrganisation";
import { useConfigurationFrais, useFraisAdhesion, useRapprochementFrais, useSyntheseFrais } from "@/hooks/useAdhesion";
import type { FraisAdhesion, LigneEcartFrais, RapprochementFraisAdhesion, StatutFraisAdhesion } from "@/api/adhesion";
import { estErreurApi } from "@/api/erreurs";
import { STATUTS } from "@/lib/statuts";
import { cn } from "@/lib/utils";
import { formaterDate, formaterEcart, formaterMatricule, formaterMontant, formaterNombre } from "@/lib/format";
import { ActionsFrais } from "@/ecrans/adhesion/DialoguesFrais";

const OPTIONS_STATUT = Object.keys(STATUTS.fraisAdhesion) as StatutFraisAdhesion[];

/** Le sens de l'écart est écrit en toutes lettres : la couleur n'est jamais le seul indicateur. */
function sensEcart(ecart: number): string {
  if (ecart > 0) return "Plus que le montant attendu";
  if (ecart < 0) return "Moins que le montant attendu";
  return "Aucun écart";
}

function Bloc({ libelle, valeur, principal = false }: { libelle: string; valeur: string; principal?: boolean }) {
  return (
    <div className={cn("min-w-0 flex-1 rounded-lg border p-4", principal ? "border-marque-trait bg-primaire-doux" : "border-bordure bg-fond")}>
      <p className="text-xs font-semibold tracking-wide text-texte-doux-fort uppercase">{libelle}</p>
      <p className="chiffre mt-1 text-2xl font-bold break-words">{valeur}</p>
    </div>
  );
}

/**
 * Rapprochement (§9, §17) : « dossiers distincts soumis × montant unitaire = montant attendu », comparé au
 * montant enregistré. Chaque nombre vient du serveur ; `detailCalcul` est affiché tel quel, jamais recomposé.
 */
function CarteRapprochement({ r }: { r: RapprochementFraisAdhesion }) {
  const colonnesEcarts = useMemo<ColumnDef<LigneEcartFrais>[]>(
    () => [
      {
        id: "adherent",
        header: "Adhérent",
        cell: ({ row }) => (
          <div>
            <p className="font-semibold">{row.original.nom ?? "—"}</p>
            <p className="ref text-xs">{formaterMatricule(row.original.matricule)}</p>
          </div>
        ),
      },
      { id: "agent", header: "Agent", cell: ({ row }) => row.original.agentNom ?? "—" },
      { id: "reference", header: "Frais", cell: ({ row }) => (row.original.referenceFrais ? <span className="ref">{row.original.referenceFrais}</span> : "—") },
      { id: "attendu", header: "Attendu", cell: ({ row }) => <span className="chiffre">{formaterMontant(row.original.montantAttendu)}</span> },
      { id: "enregistre", header: "Enregistré", cell: ({ row }) => <span className="chiffre">{formaterMontant(row.original.montantEnregistre)}</span> },
      { id: "ecart", header: "Écart", cell: ({ row }) => <span className="chiffre font-semibold text-danger-fort">{formaterEcart(row.original.ecart)}</span> },
      { id: "type", header: "Nature", cell: ({ row }) => <BadgeStatut domaine="ecartFrais" code={row.original.typeEcart} /> },
    ],
    [],
  );

  return (
    <CarteSection
      titre="Rapprochement des frais d'adhésion"
      description="Dossiers distincts transmis à la DGA sur la période, comparés aux frais effectivement enregistrés."
    >
      <div className="space-y-5">
        <div className="flex flex-col items-stretch gap-2 lg:flex-row lg:items-center" aria-label="Calcul du montant attendu">
          <Bloc libelle="Dossiers distincts soumis" valeur={formaterNombre(r.nombreDossiersSoumis)} />
          <X aria-hidden="true" className="mx-auto size-5 shrink-0 text-texte-doux-fort" />
          <Bloc libelle="Montant unitaire" valeur={formaterMontant(r.montantUnitaire)} />
          <Equal aria-hidden="true" className="mx-auto size-5 shrink-0 text-texte-doux-fort" />
          <Bloc libelle="Montant attendu" valeur={formaterMontant(r.montantAttendu)} principal />
        </div>
        <p className="text-sm text-texte-doux-fort">Calcul effectué par la plateforme : {r.detailCalcul}</p>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Bloc libelle="Montant enregistré" valeur={formaterMontant(r.montantEnregistre)} />
          <div className={cn("rounded-lg border p-4", r.ecart === 0 ? "border-succes-trait bg-succes-doux" : "border-danger-trait bg-danger-doux")}>
            <p className="text-xs font-semibold tracking-wide text-texte-doux-fort uppercase">Écart (enregistré − attendu)</p>
            <p className="chiffre mt-1 text-2xl font-bold">{formaterEcart(r.ecart)}</p>
            <p className="text-sm font-semibold">{sensEcart(r.ecart)}</p>
          </div>
        </div>

        {r.avertissements.length > 0 && <AvertissementRegle avertissements={r.avertissements} />}
        {(r.nombreDossiersSansFrais > 0 || r.nombreEcarts > 0) && (
          <Alerte teinte="attention" titre="Écarts détectés">
            <p>
              {formaterNombre(r.nombreEcarts)} dossier(s) en écart, dont {formaterNombre(r.nombreDossiersSansFrais)} sans frais
              enregistré. Les écarts sont signalés, jamais corrigés automatiquement.
            </p>
          </Alerte>
        )}
        {r.fraisHorsSoumission > 0 && (
          <p className="text-sm text-texte-doux-fort">
            Hors rapprochement : {formaterNombre(r.fraisHorsSoumission)} frais ({formaterMontant(r.montantHorsSoumission)}) pour des
            adhérents pas encore transmis à la DGA sur la période.
          </p>
        )}
        {r.ecarts.length > 0 && (
          <TableauDonnees legende="Dossiers en écart" colonnes={colonnesEcarts} lignes={r.ecarts} cleLigne={(l, i) => `${l.adherentId}-${i}`} />
        )}
      </div>
    </CarteSection>
  );
}

/**
 * Frais d'adhésion (`FRAIS_ADHESION:LIRE`) : rapprochement, synthèse de la période et liste des frais, avec les
 * actions du DAF (valider l'encaissement, résoudre une anomalie) et le signalement d'anomalie (DGA, DAF). Le
 * montant unitaire est lu de `GET /frais-adhesion/configuration`.
 */
export function EcranFraisAdhesion() {
  const [parametres, definirParametres] = useSearchParams();
  const du = parametres.get("du") ?? undefined;
  const au = parametres.get("au") ?? undefined;
  const agentId = parametres.get("agent") ?? undefined;
  const statut = (parametres.get("statut") as StatutFraisAdhesion | null) ?? undefined;
  const seulementEcarts = parametres.get("ecarts") === "1";
  const page = Number(parametres.get("page") ?? "0");
  const peutLireAgents = usePermission("ORGANISATION:LIRE");

  const configuration = useConfigurationFrais();
  const { data: agents } = useAgents(peutLireAgents);
  const rapprochement = useRapprochementFrais({ du, au, agentId });
  const synthese = useSyntheseFrais({ du, au });
  const liste = useFraisAdhesion({ du, au, agentId, statut, seulementEcarts, page, taille: 25 });

  function mettreAJour(valeurs: Record<string, string | undefined>) {
    definirParametres(
      (precedents) => {
        const suivants = new URLSearchParams(precedents);
        for (const [cle, valeur] of Object.entries(valeurs)) {
          if (valeur) suivants.set(cle, valeur);
          else suivants.delete(cle);
        }
        if (!("page" in valeurs)) suivants.delete("page");
        return suivants;
      },
      { replace: true },
    );
  }

  const colonnes = useMemo<ColumnDef<FraisAdhesion>[]>(
    () => [
      { id: "reference", header: "Référence", cell: ({ row }) => <span className="ref">{row.original.reference}</span> },
      {
        id: "adherent",
        header: "Adhérent",
        cell: ({ row }) => (
          <div>
            <p className="font-semibold">{row.original.adherentNom ?? "—"}</p>
            <p className="ref text-xs">{formaterMatricule(row.original.adherentMatricule)}</p>
          </div>
        ),
      },
      { id: "agent", header: "Collecté par", cell: ({ row }) => row.original.agentNom ?? "—" },
      { id: "date", header: "Date", cell: ({ row }) => formaterDate(row.original.dateCollecte) },
      { id: "recu", header: "Reçu", cell: ({ row }) => <span className="chiffre">{formaterMontant(row.original.montantRecu)}</span> },
      {
        id: "ecart",
        header: "Écart",
        cell: ({ row }) => (
          <span className={cn("chiffre", row.original.ecart !== 0 && "font-semibold text-danger-fort")}>
            {row.original.ecart === 0 ? "—" : formaterEcart(row.original.ecart)}
          </span>
        ),
      },
      { id: "statut", header: "Statut", cell: ({ row }) => <BadgeStatut domaine="fraisAdhesion" code={row.original.statut} /> },
      { id: "actions", header: "Actions", cell: ({ row }) => <ActionsFrais frais={row.original} compact /> },
    ],
    [],
  );

  return (
    <CoquilleApplication titre="Frais d'adhésion">
      <div className="space-y-6">
        <EnTetePage
          titre="Frais d'adhésion"
          description={
            configuration.data
              ? `Montant unitaire fixé par la coopérative : ${formaterMontant(configuration.data.montantUnitaire)}.`
              : "Suivi des frais collectés à l'adhésion et rapprochement avec les dossiers transmis à la DGA."
          }
        />
        {configuration.data && !configuration.data.regleValidee && (
          <Alerte teinte="attention" titre="Montant à confirmer">
            <p>Le montant du frais d'adhésion n'est pas encore confirmé par la coopérative (paramètre {configuration.data.parametre}).</p>
          </Alerte>
        )}

        <BarreFiltres
          actions={
            (du || au || agentId) && (
              <Button variant="ghost" onClick={() => mettreAJour({ du: undefined, au: undefined, agent: undefined })}>
                Réinitialiser
              </Button>
            )
          }
        >
          <div className="space-y-1.5">
            <Label htmlFor="frais-du">Du</Label>
            <ChampDate id="frais-du" value={du ?? ""} onChange={(e) => mettreAJour({ du: e.target.value || undefined })} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="frais-au">Au</Label>
            <ChampDate id="frais-au" value={au ?? ""} onChange={(e) => mettreAJour({ au: e.target.value || undefined })} />
          </div>
          {peutLireAgents && (
            <div className="w-64 space-y-1.5">
              <Label htmlFor="frais-agent-filtre">Agent collecteur</Label>
              <SelectRecherche
                id="frais-agent-filtre"
                options={[{ valeur: "", libelle: "Tous les agents" }, ...(agents ?? []).map((a) => ({ valeur: a.id, libelle: `${a.nomComplet} (${a.codeAgent})` }))]}
                valeur={agentId ?? ""}
                onChange={(v) => mettreAJour({ agent: v || undefined })}
                placeholder="Tous les agents"
              />
            </div>
          )}
        </BarreFiltres>

        {rapprochement.isLoading ? (
          <Skeleton className="h-64 w-full" />
        ) : rapprochement.isError ? (
          <Alerte teinte="danger" titre="Rapprochement indisponible">
            <p>{estErreurApi(rapprochement.error) ? rapprochement.error.message : "Le rapprochement n'a pas pu être calculé."}</p>
          </Alerte>
        ) : (
          rapprochement.data && <CarteRapprochement r={rapprochement.data} />
        )}

        {synthese.data && (
          <CarteSection titre="Frais enregistrés sur la période">
            <dl className="grid grid-cols-2 gap-4 sm:grid-cols-4">
              <div>
                <dt className="text-sm text-texte-doux-fort">Nombre de frais</dt>
                <dd className="chiffre text-xl font-bold">{formaterNombre(synthese.data.nombreFrais)}</dd>
              </div>
              <div>
                <dt className="text-sm text-texte-doux-fort">Montant attendu</dt>
                <dd className="chiffre text-xl font-bold">{formaterMontant(synthese.data.montantAttendu)}</dd>
              </div>
              <div>
                <dt className="text-sm text-texte-doux-fort">Montant reçu</dt>
                <dd className="chiffre text-xl font-bold">{formaterMontant(synthese.data.montantRecu)}</dd>
              </div>
              <div>
                <dt className="text-sm text-texte-doux-fort">Écart</dt>
                <dd className="chiffre text-xl font-bold">{formaterEcart(synthese.data.ecart)}</dd>
              </div>
            </dl>
            <ul className="mt-4 flex flex-wrap gap-3 text-sm" aria-label="Frais par statut">
              {Object.entries(synthese.data.nombreParStatut).map(([code, nombre]) => (
                <li key={code} className="flex items-center gap-2">
                  <BadgeStatut domaine="fraisAdhesion" code={code} /> {formaterNombre(nombre)}
                </li>
              ))}
            </ul>
          </CarteSection>
        )}

        <CarteSection titre="Liste des frais" contenuPleineLargeur>
          <BarreFiltres integree>
            <div className="space-y-1.5">
              <Label htmlFor="frais-statut">Statut</Label>
              <Select value={statut ?? "TOUS"} onValueChange={(v) => mettreAJour({ statut: v === "TOUS" ? undefined : v })}>
                <SelectTrigger id="frais-statut" className="w-56">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="TOUS">Tous les statuts</SelectItem>
                  {OPTIONS_STATUT.map((s) => (
                    <SelectItem key={s} value={s}>
                      {STATUTS.fraisAdhesion[s].libelle}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-center gap-2 self-end pb-2">
              <Checkbox id="frais-ecarts" checked={seulementEcarts} onCheckedChange={(v) => mettreAJour({ ecarts: v === true ? "1" : undefined })} />
              <Label htmlFor="frais-ecarts">Écarts seulement</Label>
            </div>
          </BarreFiltres>
          {liste.isLoading ? (
            <SqueletteTableau />
          ) : liste.isError ? (
            <div className="p-4">
              <Alerte teinte="danger" titre="Liste indisponible">
                <p>{estErreurApi(liste.error) ? liste.error.message : "Les frais n'ont pas pu être chargés."}</p>
              </Alerte>
            </div>
          ) : !liste.data || liste.data.contenu.length === 0 ? (
            <EtatVide icone={Coins} titre="Aucun frais d'adhésion" description="Aucun frais ne correspond à ces critères." />
          ) : (
            <TableauDonnees
              legende="Frais d'adhésion"
              colonnes={colonnes}
              lignes={liste.data.contenu}
              cleLigne={(f) => f.id}
              pied={
                <Pagination
                  page={liste.data.page}
                  totalPages={liste.data.totalPages}
                  totalElements={liste.data.totalElements}
                  libelleElements="frais"
                  onChangerPage={(p) => mettreAJour({ page: p > 0 ? String(p) : undefined })}
                  enCours={liste.isFetching}
                />
              }
            />
          )}
        </CarteSection>
      </div>
    </CoquilleApplication>
  );
}
