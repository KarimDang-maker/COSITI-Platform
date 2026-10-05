import { useMemo } from "react";
import { useNavigate, useSearchParams } from "react-router";
import { Inbox } from "lucide-react";
import type { ColumnDef } from "@tanstack/react-table";
import { CoquilleApplication } from "@/components/cositi/coquille-application";
import { EnTetePage } from "@/components/cositi/entete-page";
import { BarreFiltres } from "@/components/cositi/barre-filtres";
import { TableauDonnees } from "@/components/cositi/tableau-donnees";
import { Pagination } from "@/components/cositi/pagination";
import { BadgeStatut } from "@/components/cositi/badge-statut";
import { EtatVide } from "@/components/cositi/etat-vide";
import { SqueletteTableau } from "@/components/cositi/squelette-tableau";
import { Alerte } from "@/components/cositi/alerte";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useDemandes, useDemandesEnAttente } from "@/hooks/useWorkflow";
import { PERMISSION_DECISION, type DemandeValidation, type StatutDemandeValidation, type TypeEntiteWorkflow, type TypeOperationWorkflow } from "@/api/workflow";
import { useAuth } from "@/auth/ContexteAuth";
import type { EnveloppeListe } from "@/api/pagination";
import { estErreurApi } from "@/api/erreurs";
import { STATUTS, definitionStatut } from "@/lib/statuts";
import { formaterDateHeure, formaterMontant } from "@/lib/format";

const TYPES_ENTITE: readonly { valeur: TypeEntiteWorkflow; libelle: string }[] = [
  { valeur: "ADHERENT", libelle: "Adhérents" },
  { valeur: "AGENT", libelle: "Agents de terrain" },
  { valeur: "PAIEMENT", libelle: "Cotisations" },
];
const STATUTS_DEMANDE = Object.keys(STATUTS.statutDemande) as StatutDemandeValidation[];
const OPERATIONS = Object.keys(STATUTS.operationWorkflow) as TypeOperationWorkflow[];

type Vue = "a-traiter" | "mes-demandes" | "toutes";

/**
 * Centre de validation (§29) : les demandes que l'utilisateur peut décider — jamais les siennes (filtrage
 * serveur) —, ses propres demandes à suivre, et toutes les demandes visibles dans son périmètre. Filtres dans
 * l'URL, pagination serveur.
 */
export function EcranCentreValidation() {
  const [parametres, definirParametres] = useSearchParams();
  const navigate = useNavigate();
  const { aLaPermission } = useAuth();
  // « À traiter » n'existe que pour qui peut décider (ADHERENT:VALIDER, AGENT:VALIDER, PAIEMENT:VALIDER) : un rôle
  // sans droit de décision ne voit pas de file vide ni de bouton inutile (prompt V22 §25-26).
  const peutDecider = [...new Set(Object.values(PERMISSION_DECISION))].some((p) => aLaPermission(p));
  const vueDemandee = parametres.get("vue") as Vue | null;
  const vue: Vue = vueDemandee && (vueDemandee !== "a-traiter" || peutDecider) ? vueDemandee : peutDecider ? "a-traiter" : "mes-demandes";
  const typeEntite = (parametres.get("typeEntite") as TypeEntiteWorkflow | null) ?? undefined;
  const statut = (parametres.get("statut") as StatutDemandeValidation | null) ?? undefined;
  const typeOperation = (parametres.get("typeOperation") as TypeOperationWorkflow | null) ?? undefined;
  const page = Number(parametres.get("page") ?? "0");

  const aTraiter = useDemandesEnAttente(typeEntite, page, vue === "a-traiter");
  const filtres = useMemo(
    () => ({ typeEntite, statut, typeOperation, mesDemandes: vue === "mes-demandes", page, taille: 25 }),
    [typeEntite, statut, typeOperation, vue, page],
  );
  const liste = useDemandes(filtres, vue !== "a-traiter");
  const requete = vue === "a-traiter" ? aTraiter : liste;

  function mettreAJour(valeurs: Record<string, string | undefined>, conserverPage = false) {
    definirParametres(
      (precedents) => {
        const suivants = new URLSearchParams(precedents);
        for (const [cle, valeur] of Object.entries(valeurs)) {
          if (valeur) suivants.set(cle, valeur);
          else suivants.delete(cle);
        }
        if (!conserverPage) suivants.delete("page");
        return suivants;
      },
      { replace: true },
    );
  }

  const colonnes = useMemo<ColumnDef<DemandeValidation>[]>(
    () => [
      { id: "reference", header: "Référence", cell: ({ row }) => <span className="ref font-semibold">{row.original.reference}</span> },
      { id: "type", header: "Demande", cell: ({ row }) => <BadgeStatut domaine="operationWorkflow" code={row.original.typeOperation} /> },
      { id: "resume", header: "Objet", cell: ({ row }) => <ResumeDemande demande={row.original} /> },
      { id: "demandeur", header: "Demandée par", cell: ({ row }) => row.original.demandeParIdentifiant ?? "—" },
      { id: "date", header: "Date", cell: ({ row }) => formaterDateHeure(row.original.soumiseLe ?? row.original.demandeLe) },
      { id: "statut", header: "Statut", cell: ({ row }) => <BadgeStatut domaine="statutDemande" code={row.original.statut} /> },
    ],
    [],
  );

  const filtreEntite = (
    <div className="space-y-1.5">
      <Label htmlFor="filtre-module">Module</Label>
      <Select value={typeEntite ?? "TOUS"} onValueChange={(v) => mettreAJour({ typeEntite: v === "TOUS" ? undefined : v })}>
        <SelectTrigger id="filtre-module" className="w-52">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="TOUS">Tous les modules</SelectItem>
          {TYPES_ENTITE.map((t) => (
            <SelectItem key={t.valeur} value={t.valeur}>
              {t.libelle}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );

  return (
    <CoquilleApplication titre="Centre de validation">
      <div className="space-y-6">
        <EnTetePage
          titre="Centre de validation"
          description="Créations, modifications et corrections en attente de contrôle : proposition, vérification, décision, traçabilité."
        />

        <Tabs value={vue} onValueChange={(v) => mettreAJour({ vue: v === "a-traiter" ? undefined : v, statut: undefined, typeOperation: undefined })}>
          <TabsList>
            {peutDecider && <TabsTrigger value="a-traiter">À traiter</TabsTrigger>}
            <TabsTrigger value="mes-demandes">Mes demandes</TabsTrigger>
            <TabsTrigger value="toutes">Toutes les demandes</TabsTrigger>
          </TabsList>

          <TabsContent value={vue} className="space-y-6" forceMount>
            <BarreFiltres>
              {filtreEntite}
              {vue !== "a-traiter" && (
                <>
                  <div className="space-y-1.5">
                    <Label htmlFor="filtre-statut-demande">Statut</Label>
                    <Select value={statut ?? "TOUS"} onValueChange={(v) => mettreAJour({ statut: v === "TOUS" ? undefined : v })}>
                      <SelectTrigger id="filtre-statut-demande" className="w-56">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="TOUS">Tous les statuts</SelectItem>
                        {STATUTS_DEMANDE.map((code) => (
                          <SelectItem key={code} value={code}>
                            {definitionStatut("statutDemande", code).libelle}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="filtre-operation">Type de demande</Label>
                    <Select value={typeOperation ?? "TOUS"} onValueChange={(v) => mettreAJour({ typeOperation: v === "TOUS" ? undefined : v })}>
                      <SelectTrigger id="filtre-operation" className="w-64">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="TOUS">Tous les types</SelectItem>
                        {OPERATIONS.map((code) => (
                          <SelectItem key={code} value={code}>
                            {definitionStatut("operationWorkflow", code).libelle}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </>
              )}
            </BarreFiltres>

            <ListeDemandes
              requete={requete}
              colonnes={colonnes}
              page={page}
              vue={vue}
              onOuvrir={(d) => navigate(`/validations/${d.id}`)}
              onPage={(p) => mettreAJour({ page: String(p) }, true)}
              onReessayer={() => void requete.refetch()}
            />
          </TabsContent>
        </Tabs>
      </div>
    </CoquilleApplication>
  );
}

function ListeDemandes({
  requete,
  colonnes,
  page,
  vue,
  onOuvrir,
  onPage,
  onReessayer,
}: {
  requete: { data?: EnveloppeListe<DemandeValidation>; isLoading: boolean; isError: boolean; error: unknown };
  colonnes: ColumnDef<DemandeValidation>[];
  page: number;
  vue: Vue;
  onOuvrir: (d: DemandeValidation) => void;
  onPage: (p: number) => void;
  onReessayer: () => void;
}) {
  if (requete.isLoading) return <SqueletteTableau colonnes={6} />;
  if (requete.isError) {
    return (
      <Alerte
        teinte="danger"
        titre="Impossible de charger les demandes"
        action={
          <Button size="sm" variant="outline" onClick={onReessayer}>
            Réessayer
          </Button>
        }
      >
        <p>{estErreurApi(requete.error) ? requete.error.message : "Une erreur inattendue est survenue."}</p>
      </Alerte>
    );
  }
  const data = requete.data;
  if (!data || data.contenu.length === 0) {
    return (
      <EtatVide
        icone={Inbox}
        titre={vue === "a-traiter" ? "Aucune demande en attente" : "Aucune demande"}
        description={
          vue === "a-traiter"
            ? "Il n'y a actuellement aucune demande que vous pouvez décider, pour les filtres sélectionnés."
            : "Aucune demande ne correspond aux filtres sélectionnés."
        }
      />
    );
  }
  return (
    <TableauDonnees
      colonnes={colonnes}
      lignes={data.contenu}
      cleLigne={(d) => d.id}
      onActiverLigne={onOuvrir}
      libelleLigne={(d) => `Ouvrir la demande ${d.reference}`}
      legende="Demandes de validation"
      pied={
        <Pagination page={page} totalPages={data.totalPages} totalElements={data.totalElements} libelleElements="demandes" onChangerPage={onPage} />
      }
    />
  );
}

/** Objet d'une demande en une ligne : montant d'une correction de cotisation, sinon champs concernés. */
function ResumeDemande({ demande }: { demande: DemandeValidation }) {
  const montant = demande.elements.find((e) => e.champ === "montant");
  if (montant) {
    return (
      <span className="chiffre text-sm">
        {formaterMontant(Number(montant.ancienneValeur))} → <strong>{formaterMontant(Number(montant.valeurProposee))}</strong>
      </span>
    );
  }
  if (demande.typeOperation === "ADHERENT_VALIDATION_DOSSIER" || demande.typeOperation === "AGENT_VALIDATION_PROFIL") {
    return <span className="text-sm">Création à valider</span>;
  }
  return <span className="text-sm">{demande.elements.length} champ(s) modifié(s)</span>;
}
