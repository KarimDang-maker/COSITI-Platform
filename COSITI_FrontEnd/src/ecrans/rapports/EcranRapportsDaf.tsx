import { useMemo, useState } from "react";
import { useSearchParams } from "react-router";
import { toast } from "sonner";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import type { ColumnDef } from "@tanstack/react-table";
import { CoquilleApplication } from "@/components/cositi/coquille-application";
import { TableauDonnees } from "@/components/cositi/tableau-donnees";
import { EnTetePage } from "@/components/cositi/entete-page";
import { Pagination } from "@/components/cositi/pagination";
import { ChampFormulaire } from "@/components/cositi/champ-formulaire";
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
import { Textarea } from "@/components/ui/textarea";
import { useProduireRapportDaf, useRapportsDaf, useTransmettreRapportDaf } from "@/hooks/useRapportsDaf";
import { useAuth } from "@/auth/ContexteAuth";
import type { RapportDaf } from "@/api/rapportsDaf";
import { estErreurApi } from "@/api/erreurs";
import { ChampDate } from "@/components/cositi/champ-date";
import { formaterDateHeure, formaterMontant, formaterNombre, formaterPeriode } from "@/lib/format";

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
      periodeDebut: moisDernier.toISOString().slice(0, 10),
      periodeFin: finMoisDernier.toISOString().slice(0, 10),
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

  function changerPage(prochaine: number) {
    const suivants = new URLSearchParams(parametres);
    suivants.set("page", String(prochaine));
    definirParametres(suivants, { replace: true });
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
      <div className="space-y-6">
        <EnTetePage
          titre="Rapports financiers"
          description="Produits par le DAF à partir des données contrôlées, puis mis à disposition du PCA."
          actions={peutProduire && <Button onClick={() => setProductionOuverte(true)}>Produire un rapport</Button>}
        />

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
          <TableauDonnees
            colonnes={colonnes}
            lignes={data.contenu}
            cleLigne={(r) => r.id}
            pied={
              <Pagination
                page={page}
                totalPages={data.totalPages}
                totalElements={data.totalElements}
                libelleElements="rapports"
                onChangerPage={changerPage}
              />
            }
          />
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

            <div className="space-y-5 py-4">
              <ChampFormulaire id="titre-rapport" libelle="Titre" erreur={errors.titre?.message}>
                {(attributs) => <Input {...attributs} {...register("titre")} />}
              </ChampFormulaire>

              <div className="grid gap-5 sm:grid-cols-2">
                <ChampFormulaire id="rapport-debut" libelle="Du" erreur={errors.periodeDebut?.message}>
                  {(attributs) => <ChampDate {...attributs} {...register("periodeDebut")} />}
                </ChampFormulaire>
                <ChampFormulaire id="rapport-fin" libelle="Au" erreur={errors.periodeFin?.message}>
                  {(attributs) => <ChampDate {...attributs} {...register("periodeFin")} />}
                </ChampFormulaire>
              </div>

              <ChampFormulaire id="rapport-commentaire" libelle="Commentaire">
                {(attributs) => <Textarea {...attributs} rows={3} {...register("commentaire")} />}
              </ChampFormulaire>
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
