import { useMemo, useState } from "react";
import { Plus, UserCog, Users } from "lucide-react";
import { CoquilleApplication } from "@/components/cositi/coquille-application";
import { Alerte } from "@/components/cositi/alerte";
import { EtatVide } from "@/components/cositi/etat-vide";
import { SelectRecherche } from "@/components/cositi/select-recherche";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { usePermission } from "@/auth/ContexteAuth";
import {
  useAgents,
  useChargeAgent,
  useChefCourant,
  usePortefeuilleAgent,
  useSansAgentReferent,
  useZones,
} from "@/hooks/useOrganisation";
import type { Agent, AdherentResume } from "@/api/organisation";
import { estErreurApi } from "@/api/erreurs";
import { formaterTelephone, moisCourant } from "@/lib/format";
import { DialogueAjouterAgent } from "@/ecrans/organisation/DialogueAjouterAgent";
import { DialogueDesignerChef } from "@/ecrans/organisation/DialogueDesignerChef";
import { DialogueMouvementPortefeuille } from "@/ecrans/organisation/DialogueMouvementPortefeuille";

function LignePortefeuilleAgent({ agent }: { agent: Agent }) {
  const { data: charge, isLoading } = useChargeAgent(agent.id, moisCourant());
  if (isLoading) return <Skeleton className="h-4 w-16" />;
  return <span className="chiffre">{charge?.nombreAdherents ?? "—"}</span>;
}

interface DialoguePortefeuilleAgentProps {
  agent: Agent | null;
  onFermer: () => void;
  onTransferer: (adherent: AdherentResume, agentActuelNom: string) => void;
}

/** Détail du portefeuille d'un agent, avec transfert adhérent par adhérent (`ORGANISATION:AFFECTER_PORTEFEUILLE`). */
function DialoguePortefeuilleAgent({ agent, onFermer, onTransferer }: DialoguePortefeuilleAgentProps) {
  const { data: portefeuille, isLoading } = usePortefeuilleAgent(agent?.id);
  return (
    <Dialog open={!!agent} onOpenChange={(ouvert) => !ouvert && onFermer()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Portefeuille de {agent?.nomComplet}</DialogTitle>
        </DialogHeader>
        {isLoading && <Skeleton className="h-24 w-full" />}
        {portefeuille && portefeuille.length === 0 && <EtatVide titre="Portefeuille vide" />}
        {portefeuille && portefeuille.length > 0 && (
          <ul className="max-h-80 space-y-2 overflow-y-auto">
            {portefeuille.map((adherent) => (
              <li key={adherent.id} className="flex items-center justify-between rounded-md border border-bordure p-2">
                <span>
                  <span className="ref mr-2">{adherent.matricule}</span>
                  {adherent.nomComplet}
                </span>
                <Button size="sm" variant="outline" onClick={() => onTransferer(adherent, agent?.nomComplet ?? "")}>
                  Transférer
                </Button>
              </li>
            ))}
          </ul>
        )}
      </DialogContent>
    </Dialog>
  );
}

export function EcranOrganisation() {
  const peutGerer = usePermission("ORGANISATION:GERER");
  const peutDesignerChef = usePermission("ORGANISATION:DESIGNER_CHEF");
  const peutAffecter = usePermission("ORGANISATION:AFFECTER_PORTEFEUILLE");

  const { data: zones, isLoading: zonesEnCours } = useZones();
  const { data: agents, isLoading: agentsEnCours, isError, error } = useAgents();

  const [zoneSelectionnee, setZoneSelectionnee] = useState<string>("");
  const [dialogueAjouterOuvert, setDialogueAjouterOuvert] = useState(false);
  const [candidatChef, setCandidatChef] = useState<Agent | null>(null);
  const [mouvement, setMouvement] = useState<{ mode: "affecter" | "transferer"; adherent: AdherentResume; agentActuelNom?: string } | null>(null);
  const [agentPortefeuilleOuvert, setAgentPortefeuilleOuvert] = useState<Agent | null>(null);

  const { data: chefDeLaZoneSelectionnee } = useChefCourant(zoneSelectionnee || undefined);
  const { data: sansAgent } = useSansAgentReferent(zoneSelectionnee || undefined);
  const { data: chefDeLaZoneCandidat } = useChefCourant(candidatChef?.zoneId ?? undefined);

  const optionsZones = useMemo(() => (zones ?? []).map((z) => ({ valeur: z.id, libelle: z.libelle })), [zones]);

  function libelleZone(zoneId: string | null): string {
    return zones?.find((z) => z.id === zoneId)?.libelle ?? "—";
  }

  return (
    <CoquilleApplication titre="Organisation terrain">
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h1>Organisation terrain</h1>
          {peutGerer && (
            <Button onClick={() => setDialogueAjouterOuvert(true)}>
              <Plus className="size-4" aria-hidden="true" />
              Ajouter un agent
            </Button>
          )}
        </div>

        {isError && (
          <Alerte teinte="danger" titre="Impossible de charger les agents">
            <p>{estErreurApi(error) ? error.message : "Une erreur inattendue est survenue."}</p>
          </Alerte>
        )}

        <Card>
          <CardHeader>
            <CardTitle>Agents</CardTitle>
          </CardHeader>
          <CardContent>
            {agentsEnCours && <Skeleton className="h-32 w-full" />}
            {agents && agents.length === 0 && <EtatVide titre="Aucun agent enregistré" />}
            {agents && agents.length > 0 && (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Code</TableHead>
                    <TableHead>Agent</TableHead>
                    <TableHead>Téléphone</TableHead>
                    <TableHead>Zone</TableHead>
                    <TableHead>Portefeuille (mois courant)</TableHead>
                    <TableHead>Statut</TableHead>
                    {(peutDesignerChef || peutAffecter) && <TableHead>Actions</TableHead>}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {agents.map((agent) => (
                    <TableRow key={agent.id}>
                      <TableCell className="ref">{agent.codeAgent}</TableCell>
                      <TableCell>{agent.nomComplet}</TableCell>
                      <TableCell className="ref">{formaterTelephone(agent.telephone)}</TableCell>
                      <TableCell>{libelleZone(agent.zoneId)}</TableCell>
                      <TableCell>
                        <LignePortefeuilleAgent agent={agent} />
                      </TableCell>
                      <TableCell>{agent.actif ? "Actif" : "Inactif"}</TableCell>
                      {(peutDesignerChef || peutAffecter) && (
                        <TableCell className="space-x-2">
                          {peutDesignerChef && (
                            <Button variant="outline" size="sm" onClick={() => setCandidatChef(agent)}>
                              <UserCog className="size-4" aria-hidden="true" />
                              Désigner Chef
                            </Button>
                          )}
                          {peutAffecter && (
                            <Button variant="outline" size="sm" onClick={() => setAgentPortefeuilleOuvert(agent)}>
                              <Users className="size-4" aria-hidden="true" />
                              Portefeuille
                            </Button>
                          )}
                        </TableCell>
                      )}
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
            <p className="mt-2 text-xs text-texte-doux">
              TODO [V] : le taux de retard par agent n'est pas encore exposé par l'API (calcul de régularité prévu au
              jalon J6) — colonne volontairement absente plutôt qu'inventée.
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Zones</CardTitle>
          </CardHeader>
          <CardContent>
            {zonesEnCours && <Skeleton className="h-24 w-full" />}
            {zones && zones.length === 0 && (
              <EtatVide titre="Aucune zone" description="Aucune zone n'est configurée sur cette plateforme." />
            )}
            {zones && zones.length > 0 && (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Code</TableHead>
                    <TableHead>Libellé</TableHead>
                    <TableHead>Ville</TableHead>
                    <TableHead>Région</TableHead>
                    <TableHead>Statut</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {zones.map((zone) => (
                    <TableRow key={zone.id}>
                      <TableCell className="ref">{zone.code}</TableCell>
                      <TableCell>{zone.libelle}</TableCell>
                      <TableCell>{zone.ville ?? "—"}</TableCell>
                      <TableCell>{zone.region ?? "—"}</TableCell>
                      <TableCell>{zone.active ? "Active" : "Inactive"}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Portefeuilles par zone</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="max-w-sm space-y-2">
              <label htmlFor="zone-portefeuille" className="text-sm font-semibold">
                Zone
              </label>
              <SelectRecherche
                id="zone-portefeuille"
                options={optionsZones}
                valeur={zoneSelectionnee}
                onChange={setZoneSelectionnee}
                placeholder="Choisir une zone"
              />
            </div>

            {zoneSelectionnee && (
              <div className="space-y-2 rounded-lg border border-bordure p-4">
                <p className="text-sm font-semibold text-texte-doux-fort uppercase">Chef actuel</p>
                {chefDeLaZoneSelectionnee === undefined && <Skeleton className="h-5 w-40" />}
                {chefDeLaZoneSelectionnee === null && <p className="text-texte-doux">Aucun Chef désigné pour cette zone.</p>}
                {chefDeLaZoneSelectionnee && <p>{chefDeLaZoneSelectionnee.nomComplet}</p>}
              </div>
            )}

            {zoneSelectionnee && (
              <div>
                <p className="mb-2 text-sm font-semibold text-texte-doux-fort uppercase">
                  Adhérents sans agent référent
                </p>
                {!sansAgent && <Skeleton className="h-16 w-full" />}
                {sansAgent && sansAgent.length === 0 && (
                  <p className="text-texte-doux">Tous les adhérents de cette zone ont un agent référent.</p>
                )}
                {sansAgent && sansAgent.length > 0 && (
                  <ul className="space-y-2">
                    {sansAgent.map((adherent) => (
                      <li key={adherent.id} className="flex items-center justify-between rounded-md border border-bordure p-2">
                        <span>
                          <span className="ref mr-2">{adherent.matricule}</span>
                          {adherent.nomComplet}
                        </span>
                        {peutAffecter && (
                          <Button size="sm" variant="outline" onClick={() => setMouvement({ mode: "affecter", adherent })}>
                            Affecter un agent
                          </Button>
                        )}
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <DialogueAjouterAgent ouvert={dialogueAjouterOuvert} onOuvertChange={setDialogueAjouterOuvert} />

      <DialogueDesignerChef
        ouvert={!!candidatChef}
        onOuvertChange={(ouvert) => !ouvert && setCandidatChef(null)}
        candidat={candidatChef}
        chefActuel={chefDeLaZoneCandidat}
      />

      <DialogueMouvementPortefeuille
        ouvert={!!mouvement}
        onOuvertChange={(ouvert) => !ouvert && setMouvement(null)}
        mode={mouvement?.mode ?? "affecter"}
        adherent={mouvement?.adherent ?? null}
        agentActuelNom={mouvement?.agentActuelNom}
        agents={agents ?? []}
      />

      <DialoguePortefeuilleAgent
        agent={agentPortefeuilleOuvert}
        onFermer={() => setAgentPortefeuilleOuvert(null)}
        onTransferer={(adherent, agentActuelNom) => {
          setAgentPortefeuilleOuvert(null);
          setMouvement({ mode: "transferer", adherent, agentActuelNom });
        }}
      />
    </CoquilleApplication>
  );
}
