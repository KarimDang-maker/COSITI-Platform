import { useState } from "react";
import { Wallet } from "lucide-react";
import { toast } from "sonner";
import { CarteSection } from "@/components/cositi/carte-section";
import { Alerte } from "@/components/cositi/alerte";
import { BadgeStatut } from "@/components/cositi/badge-statut";
import { EtatVide } from "@/components/cositi/etat-vide";
import { ChampMontant } from "@/components/cositi/champ-montant";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { usePermission } from "@/auth/ContexteAuth";
import { useAgents } from "@/hooks/useOrganisation";
import { useReceptionnerRemiseCaisse, useRemisesCaisse } from "@/hooks/useRemisesCaisse";
import type { RemiseCaisse, StatutRemiseCaisse } from "@/api/remisesCaisse";
import { estErreurApi } from "@/api/erreurs";
import { formaterDate, formaterEcart, formaterMontant } from "@/lib/format";

function DialogueReception({ remise, nomAgent, onFermer }: { remise: RemiseCaisse | null; nomAgent: string; onFermer: () => void }) {
  const receptionner = useReceptionnerRemiseCaisse();
  const [saisie, setSaisie] = useState("");
  const [erreur, setErreur] = useState<string | null>(null);
  const montant = saisie.trim() === "" ? null : Number(saisie.replace(/\s/g, "").replace(",", "."));
  const valide = montant !== null && !Number.isNaN(montant) && montant >= 0;
  const ecart = remise && valide ? montant - remise.montantDeclare : null;

  function fermer() {
    setSaisie("");
    setErreur(null);
    onFermer();
  }

  async function confirmer() {
    if (!remise || !valide || receptionner.isPending) return;
    setErreur(null);
    try {
      const resultat = await receptionner.mutateAsync({ id: remise.id, montantRecu: montant });
      toast.success(resultat.statut === "EN_ECART" ? `Remise réceptionnée avec un écart de ${formaterEcart(resultat.ecart)}.` : "Remise réceptionnée, sans écart.");
      fermer();
    } catch (e) {
      setErreur(estErreurApi(e) ? e.message : "La réception n'a pas pu être enregistrée.");
    }
  }

  return (
    <Dialog open={!!remise} onOpenChange={(ouvert) => !ouvert && fermer()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Réceptionner la remise de caisse</DialogTitle>
          <DialogDescription>
            {nomAgent} — déclarée le {formaterDate(remise?.dateRemise)} : {formaterMontant(remise?.montantDeclare)}
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-1.5">
          <Label htmlFor="montant-recu">Montant réellement reçu (FCFA)</Label>
          <ChampMontant id="montant-recu" value={saisie} onChange={(e) => setSaisie(e.target.value)} />
        </div>
        {ecart !== null && ecart !== 0 && (
          <Alerte teinte="attention" titre={`Écart de ${formaterEcart(ecart)}`}>
            <p>La remise passera « En écart » et la DAF sera notifiée.</p>
          </Alerte>
        )}
        {erreur && (
          <Alerte teinte="danger" titre="Réception refusée">
            <p>{erreur}</p>
          </Alerte>
        )}
        <DialogFooter>
          <Button variant="outline" onClick={fermer}>
            Annuler
          </Button>
          <Button disabled={!valide || receptionner.isPending} onClick={() => void confirmer()}>
            {receptionner.isPending ? "Enregistrement…" : "Confirmer la réception"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

/**
 * Remises de caisse (DAF) : `GET /remises-caisse` (`FINANCES:CONSULTER`), réception par `PAIEMENT:VALIDER`. Les remises
 * déclarées attendent leur réception ; l'écart éventuel est calculé par le serveur.
 */
export function RemisesCaisse() {
  const peutReceptionner = usePermission("PAIEMENT:VALIDER");
  const [statut, setStatut] = useState<StatutRemiseCaisse | "TOUS">("DECLAREE");
  const [page, setPage] = useState(0);
  const [aReceptionner, setAReceptionner] = useState<RemiseCaisse | null>(null);
  const remises = useRemisesCaisse({ statut: statut === "TOUS" ? undefined : statut, page, taille: 10 });
  const { data: agents } = useAgents();
  const nomAgent = (id: string) => agents?.find((a) => a.id === id)?.nomComplet ?? "Agent";

  return (
    <CarteSection
      titre="Remises de caisse"
      description="Espèces collectées par les agents, déclarées par le Gestionnaire, à réceptionner."
      actions={
        <Select
          value={statut}
          onValueChange={(v) => {
            setStatut(v as StatutRemiseCaisse | "TOUS");
            setPage(0);
          }}
        >
          <SelectTrigger className="w-48" aria-label="Statut des remises">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="DECLAREE">À réceptionner</SelectItem>
            <SelectItem value="EN_ECART">En écart</SelectItem>
            <SelectItem value="CLOTUREE">Clôturées</SelectItem>
            <SelectItem value="TOUS">Toutes</SelectItem>
          </SelectContent>
        </Select>
      }
      contenuPleineLargeur
    >
      {remises.isLoading && (
        <div className="px-6 pb-6">
          <Skeleton className="h-24 w-full" />
        </div>
      )}
      {remises.isError && (
        <div className="px-6 pb-6">
          <Alerte teinte="danger" titre="Remises indisponibles">
            <p>{estErreurApi(remises.error) ? remises.error.message : "Les remises n'ont pas pu être chargées."}</p>
          </Alerte>
        </div>
      )}
      {remises.data && remises.data.contenu.length === 0 && (
        <div className="px-6 pb-6">
          <EtatVide titre="Aucune remise" description="Aucune remise de caisse pour ce filtre." icone={Wallet} />
        </div>
      )}
      {remises.data && remises.data.contenu.length > 0 && (
        <>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Date</TableHead>
                <TableHead>Agent</TableHead>
                <TableHead className="text-right">Cotisations</TableHead>
                <TableHead className="text-right">Déclaré</TableHead>
                <TableHead className="text-right">Reçu</TableHead>
                <TableHead>Statut</TableHead>
                <TableHead className="sr-only">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {remises.data.contenu.map((r) => (
                <TableRow key={r.id}>
                  <TableCell>{formaterDate(r.dateRemise)}</TableCell>
                  <TableCell>{nomAgent(r.agentId)}</TableCell>
                  <TableCell className="chiffre text-right">{r.nombrePaiements ?? "—"}</TableCell>
                  <TableCell className="chiffre text-right">{formaterMontant(r.montantDeclare)}</TableCell>
                  <TableCell className="chiffre text-right">{r.montantRecu === null ? "—" : formaterMontant(r.montantRecu)}</TableCell>
                  <TableCell>
                    <BadgeStatut domaine="remiseCaisse" code={r.statut} />
                  </TableCell>
                  <TableCell className="text-right">
                    {peutReceptionner && r.statut === "DECLAREE" && (
                      <Button size="sm" onClick={() => setAReceptionner(r)}>
                        Réceptionner
                      </Button>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
          {remises.data.totalPages > 1 && (
            <div className="flex items-center justify-end gap-2 px-6 py-3 text-sm">
              <Button size="sm" variant="outline" disabled={page === 0} onClick={() => setPage((p) => p - 1)}>
                Précédent
              </Button>
              <span>
                Page {page + 1} / {remises.data.totalPages}
              </span>
              <Button size="sm" variant="outline" disabled={page + 1 >= remises.data.totalPages} onClick={() => setPage((p) => p + 1)}>
                Suivant
              </Button>
            </div>
          )}
        </>
      )}
      <DialogueReception remise={aReceptionner} nomAgent={aReceptionner ? nomAgent(aReceptionner.agentId) : ""} onFermer={() => setAReceptionner(null)} />
    </CarteSection>
  );
}
