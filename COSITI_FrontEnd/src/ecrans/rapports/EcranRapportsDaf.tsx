import { useMemo, useState } from "react";
import { useSearchParams } from "react-router";
import { toast } from "sonner";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import type { ColumnDef } from "@tanstack/react-table";
import { CoquilleApplication } from "@/components/cositi/coquille-application";
import { TableauDonnees } from "@/components/cositi/tableau-donnees";
import { EtatVide } from "@/components/cositi/etat-vide";
import { SqueletteTableau } from "@/components/cositi/squelette-tableau";
import { Alerte } from "@/components/cositi/alerte";
import { BadgeStatut } from "@/components/cositi/badge-statut";
import { DialogueConfirmation } from "@/components/cositi/dialogue-confirmation";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useProduireRapportDaf, useRapportsDaf, useTransmettreRapportDaf } from "@/hooks/useRapportsDaf";
import { useAuth } from "@/auth/ContexteAuth";
import type { RapportDaf } from "@/api/rapportsDaf";
import { estErreurApi } from "@/api/erreurs";
import { formaterDateHeure, formaterDateSaisie, formaterMontant, formaterNombre, formaterPeriode } from "@/lib/format";

const TAILLE_PAGE = 25;

const schema = z
  .object({
    titre: z.string().trim().min(1, "Le titre est obligatoire."),
    periodeDebut: z.string().min(1, "La date de début est obligatoire."),
    periodeFin: z.string().min(1, "La date de fin est obligatoire."),
    commentaire: z.string().optional(),
  })
  .refine((v) => v.periodeFin >= v.periodeDebut, {
    message: "La fin de période ne peut pas précéder son début.",
    path: ["periodeFin"],
  });

type Valeurs = z.infer<typeof schema>;

/**
 * `/rapports` — Rapports financiers du DAF (J10, flux `Roles des acteurs.md §12.3`).
 *
 * Un seul écran pour les deux bouts du flux : le DAF produit et transmet, le PCA
 * (ainsi que le DG et la DGA) consulte ce qui lui a été transmis. Les boutons
 * suivent les permissions réelles — le PCA ne voit ni « Produire » ni
 * « Transmettre ».
 *
 * **Aucun chiffre n'est calculé ici** : les montants d'un rapport sont constatés
 * par le serveur au moment de la production, puis figés. C'est ce qui permet de
 * relire dans six mois le rapport qui a fondé une décision.
 */
export function EcranRapportsDaf() {
  const [parametres, definirParametres] = useSearchParams();
  const { aLaPermission } = useAuth();

  const page = Number(parametres.get("page") ?? "0");
  const { data, isLoading, isError, error } = useRapportsDaf({ page, taille: TAILLE_PAGE });
  const produire = useProduireRapportDaf();
  const transmettre = useTransmettreRapportDaf();

  const peutProduire = aLaPermission("RAPPORT_DAF:PRODUIRE");
  const peutTransmettre = aLaPermission("RAPPORT_DAF:TRANSMETTRE");

  const [productionOuverte, setProductionOuverte] = useState(false);
  const [aTransmettre, setATransmettre] = useState<RapportDaf | null>(null);

  const moisDernier = new Date(new Date().getFullYear(), new Date().getMonth() - 1, 1);
  const finMoisDernier = new Date(new Date().getFullYear(), new Date().getMonth(), 0);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<Valeurs>({
    resolver: zodResolver(schema),
    defaultValues: {
      titre: "",
      periodeDebut: formaterDateSaisie(moisDernier),
      periodeFin: formaterDateSaisie(finMoisDernier),
    },
  });

  async function soumettreProduction(valeurs: Valeurs) {
    try {
      await produire.mutateAsync(valeurs);
      toast.success("Rapport produit. Ses chiffres sont désormais figés.");
      setProductionOuverte(false);
      reset();
    } catch (erreur) {
      toast.error(estErreurApi(erreur) ? erreur.message : "Le rapport n'a pas pu être produit.");
    }
  }

  const colonnes = useMemo<ColumnDef<RapportDaf>[]>(
    () => [
      { id: "titre", header: "Rapport", cell: ({ row }) => row.original.titre },
      {
        id: "periode",
        header: "Période",
        cell: ({ row }) => formaterPeriode(row.original.periodeDebut, row.original.periodeFin),
      },
      {
        id: "statut",
        header: "Statut",
        cell: ({ row }) => <BadgeStatut domaine="rapportDaf" code={row.original.statut} />,
      },
      {
        id: "montantValide",
        header: "Encaissements validés",
        cell: ({ row }) => <span className="chiffre">{formaterMontant(row.original.montantValide)}</span>,
      },
      {
        id: "nbIncoherences",
        header: "Incohérences",
        cell: ({ row }) => <span className="chiffre">{formaterNombre(row.original.nbIncoherences)}</span>,
      },
      {
        id: "produitLe",
        header: "Produit le",
        cell: ({ row }) => formaterDateHeure(row.original.produitLe),
      },
      {
        id: "action",
        header: "",
        cell: ({ row }) =>
          peutTransmettre && row.original.statut === "PRODUIT" ? (
            <Button variant="outline" size="sm" onClick={() => setATransmettre(row.original)}>
              Transmettre au PCA
            </Button>
          ) : row.original.transmisLe ? (
            <span className="text-sm text-texte-doux">
              Transmis le {formaterDateHeure(row.original.transmisLe)}
            </span>
          ) : null,
      },
    ],
    [peutTransmettre],
  );

  return (
    <CoquilleApplication titre="Rapports">
      <div className="space-y-4">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h1>Rapports financiers</h1>
            <p className="text-texte-doux">
              Produits par le DAF à partir des données contrôlées, puis mis à disposition du PCA.
            </p>
          </div>
          {peutProduire && <Button onClick={() => setProductionOuverte(true)}>Produire un rapport</Button>}
        </div>

        {isLoading && <SqueletteTableau colonnes={6} />}

        {isError && (
          <Alerte teinte="danger" titre="Impossible de charger les rapports">
            <p>{estErreurApi(error) ? error.message : "Une erreur inattendue est survenue."}</p>
          </Alerte>
        )}

        {data && data.contenu.length === 0 && (
          <EtatVide
            titre="Aucun rapport disponible"
            description={
              peutProduire
                ? "Produisez un rapport sur une période écoulée : ses chiffres seront constatés puis figés."
                : "Le DAF n'a encore transmis aucun rapport."
            }
          />
        )}

        {data && data.contenu.length > 0 && (
          <>
            <TableauDonnees colonnes={colonnes} lignes={data.contenu} cleLigne={(r) => r.id} />
            <div className="flex items-center justify-between text-sm text-texte-doux">
              <p>{data.totalElements} rapport(s)</p>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  disabled={page <= 0}
                  onClick={() => {
                    const suivants = new URLSearchParams(parametres);
                    suivants.set("page", String(page - 1));
                    definirParametres(suivants, { replace: true });
                  }}
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
                  onClick={() => {
                    const suivants = new URLSearchParams(parametres);
                    suivants.set("page", String(page + 1));
                    definirParametres(suivants, { replace: true });
                  }}
                >
                  Suivant
                </Button>
              </div>
            </div>
          </>
        )}
      </div>

      <Dialog open={productionOuverte} onOpenChange={setProductionOuverte}>
        <DialogContent>
          <form onSubmit={handleSubmit(soumettreProduction)} noValidate>
            <DialogHeader>
              <DialogTitle>Produire un rapport financier</DialogTitle>
              <DialogDescription>
                Les montants seront constatés par le serveur sur la période choisie, puis figés dans le
                rapport. Vous n'avez aucun chiffre à saisir.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 py-4">
              <div className="space-y-1.5">
                <Label htmlFor="titre-rapport">Titre</Label>
                <Input id="titre-rapport" {...register("titre")} />
                {errors.titre && <p className="text-sm text-danger-fort">{errors.titre.message}</p>}
              </div>

              <div className="flex flex-wrap gap-4">
                <div className="space-y-1.5">
                  <Label htmlFor="rapport-debut">Du</Label>
                  <Input id="rapport-debut" type="date" className="w-44" {...register("periodeDebut")} />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="rapport-fin">Au</Label>
                  <Input id="rapport-fin" type="date" className="w-44" {...register("periodeFin")} />
                  {errors.periodeFin && (
                    <p className="text-sm text-danger-fort">{errors.periodeFin.message}</p>
                  )}
                </div>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="rapport-commentaire">Commentaire</Label>
                <Textarea id="rapport-commentaire" rows={3} {...register("commentaire")} />
              </div>
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setProductionOuverte(false)}>
                Annuler
              </Button>
              <Button type="submit" disabled={produire.isPending}>
                {produire.isPending ? "Production…" : "Produire"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <DialogueConfirmation
        ouvert={!!aTransmettre}
        onOuvertChange={(ouvert) => !ouvert && setATransmettre(null)}
        titre="Transmettre ce rapport au PCA"
        description={
          aTransmettre
            ? `« ${aTransmettre.titre} » — ${formaterPeriode(aTransmettre.periodeDebut, aTransmettre.periodeFin)}, ${formaterMontant(aTransmettre.montantValide)} d'encaissements validés. Une fois transmis, le rapport ne peut plus être retiré ni modifié.`
            : ""
        }
        libelleConfirmation="Transmettre"
        enCours={transmettre.isPending}
        onConfirmer={() => {
          if (!aTransmettre) return;
          transmettre.mutate(aTransmettre.id, {
            onSuccess: () => {
              toast.success("Rapport transmis au PCA.");
              setATransmettre(null);
            },
            onError: (erreur) =>
              toast.error(estErreurApi(erreur) ? erreur.message : "La transmission a échoué."),
          });
        }}
      />
    </CoquilleApplication>
  );
}
