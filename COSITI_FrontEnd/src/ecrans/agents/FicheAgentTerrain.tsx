import { useState } from "react";
import { Link, useParams, useSearchParams } from "react-router";
import { PencilLine, Power, UserCog, Wallet } from "lucide-react";
import { CoquilleApplication } from "@/components/cositi/coquille-application";
import { EnTetePage } from "@/components/cositi/entete-page";
import { CarteSection } from "@/components/cositi/carte-section";
import { BadgeStatut } from "@/components/cositi/badge-statut";
import { Alerte } from "@/components/cositi/alerte";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { usePermission } from "@/auth/ContexteAuth";
import { useAgent, useChefCourant, useZones } from "@/hooks/useOrganisation";
import type { Agent } from "@/api/organisation";
import { estErreurApi } from "@/api/erreurs";
import { formaterMontant, formaterTelephone } from "@/lib/format";
import { LigneChamp } from "@/ecrans/adherents/fiche/LigneChamp";
import { DialogueDesignerChef } from "@/ecrans/organisation/DialogueDesignerChef";
import { DialogueModifierAgent } from "@/ecrans/agents/fiche/DialogueModifierAgent";
import { DialogueStatutAgent } from "@/ecrans/agents/fiche/DialogueStatutAgent";
import { DialogueRemiseCaisse } from "@/ecrans/agents/fiche/DialogueRemiseCaisse";
import { OngletSynthese } from "@/ecrans/agents/fiche/OngletSynthese";
import { OngletPortefeuille } from "@/ecrans/agents/fiche/OngletPortefeuille";
import { OngletCnpsAgent } from "@/ecrans/agents/fiche/OngletCnpsAgent";
import { OngletActivite } from "@/ecrans/agents/fiche/OngletActivite";
import { OngletHistoriquePortefeuille } from "@/ecrans/agents/fiche/OngletHistoriquePortefeuille";
import { DialogueDemandeStatutAgent } from "@/ecrans/agents/fiche/DialogueDemandeStatutAgent";
import { BandeauWorkflow, HistoriqueValidation } from "@/ecrans/workflow/BandeauWorkflow";
import { DialogueDemandeModification } from "@/ecrans/workflow/DialogueDemandeModification";

type Onglet = "synthese" | "portefeuille" | "cnps" | "activite" | "historique" | "validation";

/**
 * Fiche d'un agent de terrain (#3). Identité, portefeuille et activité sont séparés en onglets ; les
 * actions de l'en-tête dépendent des permissions de `GET /auth/moi` — l'API reste seule juge (la
 * modification et l'activation exigent en plus le rôle DGA, vérifié par le service).
 */
export function FicheAgentTerrain() {
  const { id } = useParams<{ id: string }>();
  const { data: agent, isLoading, isError, error } = useAgent(id);

  if (isLoading) {
    return (
      <CoquilleApplication titre="Fiche agent">
        <div className="space-y-6">
          <Skeleton className="h-8 w-64" />
          <Skeleton className="h-40 w-full" />
        </div>
      </CoquilleApplication>
    );
  }

  if (isError || !agent) {
    const introuvable = estErreurApi(error) && error.statut === 404;
    return (
      <CoquilleApplication titre="Fiche agent">
        <Alerte teinte="danger" titre={introuvable ? "Agent introuvable" : "Impossible de charger cet agent"}>
          <p>{introuvable ? "Cet agent n'existe pas." : estErreurApi(error) ? error.message : "Une erreur inattendue est survenue."}</p>
        </Alerte>
      </CoquilleApplication>
    );
  }

  return <ContenuFicheAgent agent={agent} />;
}

function ContenuFicheAgent({ agent }: { agent: Agent }) {
  const [parametres, definirParametres] = useSearchParams();
  const peutGerer = usePermission("ORGANISATION:GERER");
  const peutDesignerChef = usePermission("ORGANISATION:DESIGNER_CHEF");
  const peutAffecter = usePermission("ORGANISATION:AFFECTER_PORTEFEUILLE");
  const peutLireCnps = usePermission("CNPS:LIRE");
  const peutLirePaiements = usePermission("PAIEMENT:LIRE");
  const peutLireAdherents = usePermission("ADHERENT:LIRE");
  // Remise de caisse : déclarée par qui saisit les cotisations (Gestionnaire, PAIEMENT:CREER), réceptionnée par la DAF.
  const peutDeclarerRemise = usePermission("PAIEMENT:CREER");
  const [remiseOuverte, setRemiseOuverte] = useState(false);

  const { data: zones } = useZones();
  const { data: chefDeZone } = useChefCourant(agent.zoneId ?? undefined);
  const [modificationOuverte, setModificationOuverte] = useState(false);
  const [statutOuvert, setStatutOuvert] = useState(false);
  const [chefOuvert, setChefOuvert] = useState(false);
  const [demandeModificationOuverte, setDemandeModificationOuverte] = useState(false);
  const [demandeStatutOuverte, setDemandeStatutOuverte] = useState(false);

  // Workflow V19 : un profil validé ne se modifie plus directement (409 AGENT_MODIFICATION_PAR_DEMANDE,
  // AGENT_CHANGEMENT_STATUT_PAR_DEMANDE) ; un profil en attente est verrouillé. Sans `statutValidation`
  // (API antérieure), la modification directe reste proposée.
  const statutValidation = agent.statutValidation;
  const officiel = statutValidation === "VALIDE";
  const modificationDirecte =
    !statutValidation || statutValidation === "BROUILLON" || statutValidation === "CORRECTION_DEMANDEE" || statutValidation === "REJETE";
  const peutModifierDirectement = peutGerer && modificationDirecte;
  const peutDemander = peutGerer && officiel;

  const ongletsVisibles: Onglet[] = [
    "synthese",
    "portefeuille",
    ...(peutLireCnps ? (["cnps"] as const) : []),
    "activite",
    "historique",
    ...(statutValidation ? (["validation"] as const) : []),
  ];
  const demande = parametres.get("onglet") as Onglet | null;
  const onglet: Onglet = demande && ongletsVisibles.includes(demande) ? demande : "synthese";

  function changerOnglet(valeur: string) {
    definirParametres(
      (precedents) => {
        const suivants = new URLSearchParams(precedents);
        if (valeur === "synthese") suivants.delete("onglet");
        else suivants.set("onglet", valeur);
        return suivants;
      },
      { replace: true },
    );
  }

  const zone = zones?.find((z) => z.id === agent.zoneId);
  const estChef = !!chefDeZone && chefDeZone.id === agent.id;

  return (
    <CoquilleApplication titre="Fiche agent">
      <div className="space-y-6">
        <EnTetePage
          titre={agent.nomComplet}
          description={
            <span className="inline-flex flex-wrap items-center gap-3">
              <span className="ref">{agent.codeAgent}</span>
              <span>{zone?.libelle ?? "Sans zone"}</span>
              {estChef && <span className="font-semibold text-primaire">Chef des agents de la zone</span>}
            </span>
          }
          statut={<BadgeStatut domaine="agent" code={agent.actif ? "ACTIF" : "INACTIF"} />}
          filAriane={[{ libelle: "Agents de terrain", chemin: "/agents" }, { libelle: "Fiche agent" }]}
          actions={
            <>
              {peutModifierDirectement && (
                <Button variant="outline" onClick={() => setModificationOuverte(true)}>
                  <PencilLine className="size-4" aria-hidden="true" />
                  Modifier
                </Button>
              )}
              {peutModifierDirectement && (
                <Button variant="outline" onClick={() => setStatutOuvert(true)}>
                  <Power className="size-4" aria-hidden="true" />
                  {agent.actif ? "Désactiver" : "Réactiver"}
                </Button>
              )}
              {peutDemander && (
                <Button variant="outline" onClick={() => setDemandeModificationOuverte(true)}>
                  <PencilLine className="size-4" aria-hidden="true" />
                  Demander une modification
                </Button>
              )}
              {peutDemander && (
                <Button variant="outline" onClick={() => setDemandeStatutOuverte(true)}>
                  <Power className="size-4" aria-hidden="true" />
                  {agent.actif ? "Demander la désactivation" : "Demander la réactivation"}
                </Button>
              )}
              {peutDeclarerRemise && (
                <Button variant="outline" onClick={() => setRemiseOuverte(true)}>
                  <Wallet className="size-4" aria-hidden="true" />
                  Déclarer une remise de caisse
                </Button>
              )}
              {peutDesignerChef && agent.actif && !estChef && (
                <Button variant="outline" onClick={() => setChefOuvert(true)}>
                  <UserCog className="size-4" aria-hidden="true" />
                  Désigner Chef
                </Button>
              )}
            </>
          }
        />

        {statutValidation && (
          <div className="flex flex-wrap items-center gap-2 text-sm">
            <span className="text-texte-doux-fort">Validation du profil :</span>
            <BadgeStatut domaine="statutValidation" code={statutValidation} />
          </div>
        )}
        {statutValidation && (
          <BandeauWorkflow
            typeEntite="AGENT"
            entiteId={agent.id}
            designation={`${agent.nomComplet} (${agent.codeAgent})`}
            peutSoumettre={peutGerer}
            onDemanderModification={peutDemander ? () => setDemandeModificationOuverte(true) : undefined}
          />
        )}

        <CarteSection titre="Identité">
          <dl className="grid grid-cols-1 gap-4 sm:grid-cols-4">
            <LigneChamp libelle="Téléphone" valeur={<span className="ref">{formaterTelephone(agent.telephone)}</span>} />
            <LigneChamp libelle="Zone" valeur={zone?.libelle ?? "—"} />
            <LigneChamp
              libelle="Objectif de collecte mensuel"
              valeur={agent.objectifCollecteMensuel ? <span className="chiffre">{formaterMontant(agent.objectifCollecteMensuel)}</span> : "Aucun"}
            />
            <LigneChamp
              libelle="Supervisé par"
              valeur={
                agent.chefAgentId ? (
                  <Link to={`/agents/${agent.chefAgentId}`} className="font-medium text-primaire underline underline-offset-2">
                    Voir le Chef
                  </Link>
                ) : (
                  "—"
                )
              }
            />
          </dl>
        </CarteSection>

        <Tabs value={onglet} onValueChange={changerOnglet}>
          <TabsList className="flex-wrap">
            <TabsTrigger value="synthese">Synthèse</TabsTrigger>
            <TabsTrigger value="portefeuille">Portefeuille</TabsTrigger>
            {peutLireCnps && <TabsTrigger value="cnps">CNPS</TabsTrigger>}
            <TabsTrigger value="activite">Activité</TabsTrigger>
            <TabsTrigger value="historique">Historique du portefeuille</TabsTrigger>
            {ongletsVisibles.includes("validation") && <TabsTrigger value="validation">Validation</TabsTrigger>}
          </TabsList>

          <TabsContent value="synthese">
            {onglet === "synthese" && (
              <OngletSynthese agentId={agent.id} peutLirePaiements={peutLirePaiements} peutLireAdherents={peutLireAdherents} />
            )}
          </TabsContent>
          <TabsContent value="portefeuille">
            {onglet === "portefeuille" && <OngletPortefeuille agent={agent} peutAffecter={peutAffecter} />}
          </TabsContent>
          {peutLireCnps && <TabsContent value="cnps">{onglet === "cnps" && <OngletCnpsAgent agentId={agent.id} />}</TabsContent>}
          <TabsContent value="activite">{onglet === "activite" && <OngletActivite agentId={agent.id} />}</TabsContent>
          <TabsContent value="historique">
            {onglet === "historique" && <OngletHistoriquePortefeuille agentId={agent.id} peutLireAdherents={peutLireAdherents} />}
          </TabsContent>
          {ongletsVisibles.includes("validation") && (
            <TabsContent value="validation">
              {onglet === "validation" && <HistoriqueValidation typeEntite="AGENT" entiteId={agent.id} />}
            </TabsContent>
          )}
        </Tabs>
      </div>

      {peutDemander && (
        <>
          <DialogueDemandeModification
            ouvert={demandeModificationOuverte}
            onOuvertChange={setDemandeModificationOuverte}
            typeEntite="AGENT"
            operation="AGENT_MODIFICATION"
            entiteId={agent.id}
            designation={`${agent.nomComplet} (${agent.codeAgent})`}
            valeursActuelles={{
              nomComplet: agent.nomComplet,
              telephone: agent.telephone,
              zoneId: agent.zoneId,
              objectifCollecteMensuel: agent.objectifCollecteMensuel === null ? null : String(agent.objectifCollecteMensuel),
            }}
            version={agent.version}
            referentiels={{ zones }}
          />
          <DialogueDemandeStatutAgent agent={agent} ouvert={demandeStatutOuverte} onOuvertChange={setDemandeStatutOuverte} />
        </>
      )}
      {peutModifierDirectement && (
        <>
          <DialogueModifierAgent agent={agent} ouvert={modificationOuverte} onOuvertChange={setModificationOuverte} />
          <DialogueStatutAgent agent={agent} ouvert={statutOuvert} onOuvertChange={setStatutOuvert} />
        </>
      )}
      {peutDesignerChef && (
        <DialogueDesignerChef
          ouvert={chefOuvert}
          onOuvertChange={setChefOuvert}
          candidat={chefOuvert ? agent : null}
          chefActuel={chefDeZone}
        />
      )}
      {peutDeclarerRemise && remiseOuverte && (
        <DialogueRemiseCaisse agentId={agent.id} nomAgent={agent.nomComplet} ouvert={remiseOuverte} onOuvertChange={setRemiseOuverte} />
      )}
    </CoquilleApplication>
  );
}
