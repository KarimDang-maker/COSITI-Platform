import { useState } from "react";
import { useNavigate } from "react-router";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alerte } from "@/components/cositi/alerte";
import { useCreerCampagne } from "@/hooks/useRelances";
import { estErreurApi } from "@/api/erreurs";

interface DialogueCreerCampagneProps {
  ouvert: boolean;
  onOuvertChange: (ouvert: boolean) => void;
  /**
   * Filtres actifs de l'écran `/droits` au moment de la création. Enregistrés
   * tels quels comme critères de la campagne : ils tracent ce qui a motivé
   * celle-ci. Le serveur ne les rejoue pas pour recalculer une cible.
   */
  criteres: Record<string, unknown>;
  /** Nombre de retardataires correspondant aux filtres, pour que l'utilisateur sache ce qu'il cible. */
  nbRetardataires: number;
}

/**
 * Création d'une campagne de relance depuis la liste des retardataires (J8).
 *
 * Lève le `TODO [A]` posé au jalon J6, où le bouton était désactivé faute
 * d'endpoint : `POST /campagnes-relance` existe désormais réellement.
 */
export function DialogueCreerCampagne({
  ouvert,
  onOuvertChange,
  criteres,
  nbRetardataires,
}: DialogueCreerCampagneProps) {
  const navigate = useNavigate();
  const creer = useCreerCampagne();
  const [libelle, setLibelle] = useState("");
  const [erreur, setErreur] = useState<string | null>(null);

  const criteresLisibles = Object.entries(criteres)
    .filter(([, valeur]) => valeur !== undefined && valeur !== null && valeur !== "")
    .map(([cle, valeur]) => `${cle} : ${String(valeur)}`);

  function fermer(ouvertSuivant: boolean) {
    if (!ouvertSuivant) {
      setLibelle("");
      setErreur(null);
    }
    onOuvertChange(ouvertSuivant);
  }

  async function soumettre() {
    if (!libelle.trim()) {
      setErreur("Donnez un nom à la campagne.");
      return;
    }
    try {
      await creer.mutateAsync({ libelle: libelle.trim(), critere: criteres });
      toast.success("Campagne de relance créée.");
      fermer(false);
      navigate("/relances");
    } catch (e) {
      setErreur(estErreurApi(e) ? e.message : "La campagne n'a pas pu être créée.");
    }
  }

  return (
    <Dialog open={ouvert} onOpenChange={fermer}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Créer une campagne de relance</DialogTitle>
          <DialogDescription>
            La campagne conserve les critères actuellement filtrés comme trace de ce qui l'a motivée. Elle
            ne déclenche aucun envoi : les relances s'enregistrent une par une, après contact.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="libelle-campagne">Nom de la campagne</Label>
            <Input
              id="libelle-campagne"
              value={libelle}
              onChange={(evenement) => setLibelle(evenement.target.value)}
              placeholder="Retards de septembre — Douala Centre"
            />
          </div>

          <div className="rounded-lg border border-bordure p-3 text-sm">
            <p className="font-semibold">Critères enregistrés</p>
            {criteresLisibles.length === 0 ? (
              <p className="text-texte-doux">Aucun filtre actif — la campagne couvre tous les retardataires.</p>
            ) : (
              <ul className="list-disc pl-4 text-texte-doux">
                {criteresLisibles.map((ligne) => (
                  <li key={ligne}>{ligne}</li>
                ))}
              </ul>
            )}
            <p className="mt-2 text-texte-doux">
              {nbRetardataires} adhérent(s) correspondent à ces critères aujourd'hui.
            </p>
          </div>

          {erreur && (
            <Alerte teinte="danger" titre="Création impossible">
              <p>{erreur}</p>
            </Alerte>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => fermer(false)}>
            Annuler
          </Button>
          <Button onClick={soumettre} disabled={creer.isPending}>
            {creer.isPending ? "Création…" : "Créer la campagne"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
