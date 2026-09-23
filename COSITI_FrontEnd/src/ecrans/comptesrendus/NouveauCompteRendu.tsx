import { useNavigate } from "react-router";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import { CoquilleApplication } from "@/components/cositi/coquille-application";
import { Alerte } from "@/components/cositi/alerte";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useProduireCompteRendu } from "@/hooks/useComptesRendus";
import { estErreurApi } from "@/api/erreurs";
import { formaterDateSaisie } from "@/lib/format";

/**
 * Le schéma reproduit les contraintes du serveur pour signaler l'erreur au bon
 * champ, sans jamais s'y substituer : `COMPTE_RENDU_PERIODE_INVALIDE` et
 * `COMPTE_RENDU_PERIODE_FUTURE` restent contrôlés côté API.
 */
const schema = z
  .object({
    periodeDebut: z.string().min(1, "La date de début est obligatoire."),
    periodeFin: z.string().min(1, "La date de fin est obligatoire."),
    nbVisites: z.coerce.number().int().min(0, "Valeur négative impossible."),
    nbAdherentsRencontres: z.coerce.number().int().min(0, "Valeur négative impossible."),
    nbAdherentsCrees: z.coerce.number().int().min(0, "Valeur négative impossible."),
    nbPaiementsEnregistres: z.coerce.number().int().min(0, "Valeur négative impossible."),
    montantCollecte: z.coerce.number().min(0, "Montant négatif impossible."),
    synthese: z.string().optional(),
    difficultes: z.string().optional(),
  })
  .refine((valeurs) => valeurs.periodeFin >= valeurs.periodeDebut, {
    message: "La fin de période ne peut pas précéder son début.",
    path: ["periodeFin"],
  })
  .refine((valeurs) => valeurs.periodeDebut <= formaterDateSaisie(new Date()), {
    message: "Un compte rendu porte sur une période écoulée, pas à venir.",
    path: ["periodeDebut"],
  });

type Valeurs = z.input<typeof schema>;

/** Semaine écoulée : la période la plus courante pour une tournée terrain. */
function semaineEcoulee() {
  const aujourdhui = new Date();
  const ilYaSeptJours = new Date(aujourdhui.getTime() - 7 * 86_400_000);
  const hier = new Date(aujourdhui.getTime() - 86_400_000);
  return { debut: formaterDateSaisie(ilYaSeptJours), fin: formaterDateSaisie(hier) };
}

/**
 * `/comptes-rendus/nouveau` — Production d'un compte rendu terrain (UC-AG-10).
 *
 * Le compte rendu est créé **en brouillon** : l'agent le relit, le corrige si
 * besoin, puis le transmet depuis sa fiche. Rien n'est envoyé au Gestionnaire
 * avant cette action explicite.
 *
 * Les indicateurs sont saisis, pas pré-remplis depuis les paiements
 * enregistrés : un compte rendu est une déclaration de l'agent, et l'écart
 * éventuel avec la base est ce que le Gestionnaire contrôle.
 */
export function NouveauCompteRendu() {
  const navigate = useNavigate();
  const produire = useProduireCompteRendu();
  const periode = semaineEcoulee();

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<Valeurs>({
    resolver: zodResolver(schema),
    defaultValues: {
      periodeDebut: periode.debut,
      periodeFin: periode.fin,
      nbVisites: 0,
      nbAdherentsRencontres: 0,
      nbAdherentsCrees: 0,
      nbPaiementsEnregistres: 0,
      montantCollecte: 0,
    },
  });

  async function soumettre(valeurs: Valeurs) {
    try {
      const resultat = schema.parse(valeurs);
      const compteRendu = await produire.mutateAsync(resultat);
      toast.success("Compte rendu enregistré en brouillon.");
      navigate(`/comptes-rendus/${compteRendu.id}`);
    } catch (erreur) {
      toast.error(
        estErreurApi(erreur) ? erreur.message : "Le compte rendu n'a pas pu être enregistré.",
      );
    }
  }

  return (
    <CoquilleApplication titre="Nouveau compte rendu">
      <form className="space-y-6" onSubmit={handleSubmit(soumettre)} noValidate>
        <div>
          <h1>Produire un compte rendu</h1>
          <p className="text-texte-doux">
            Résumez votre activité sur la période. Le compte rendu est d'abord enregistré en brouillon :
            vous pourrez le relire avant de le transmettre au Gestionnaire des comptes.
          </p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Période couverte</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-wrap gap-4">
            <div className="space-y-1.5">
              <Label htmlFor="periodeDebut">Du</Label>
              <Input id="periodeDebut" type="date" className="w-48" {...register("periodeDebut")} />
              {errors.periodeDebut && (
                <p className="text-sm text-danger-fort">{errors.periodeDebut.message}</p>
              )}
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="periodeFin">Au</Label>
              <Input id="periodeFin" type="date" className="w-48" {...register("periodeFin")} />
              {errors.periodeFin && <p className="text-sm text-danger-fort">{errors.periodeFin.message}</p>}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Activité de la période</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="nbVisites">Visites effectuées</Label>
              <Input id="nbVisites" type="number" min="0" {...register("nbVisites")} />
              {errors.nbVisites && <p className="text-sm text-danger-fort">{errors.nbVisites.message}</p>}
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="nbAdherentsRencontres">Adhérents rencontrés</Label>
              <Input
                id="nbAdherentsRencontres"
                type="number"
                min="0"
                {...register("nbAdherentsRencontres")}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="nbAdherentsCrees">Nouveaux adhérents enregistrés</Label>
              <Input id="nbAdherentsCrees" type="number" min="0" {...register("nbAdherentsCrees")} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="nbPaiementsEnregistres">Paiements enregistrés</Label>
              <Input
                id="nbPaiementsEnregistres"
                type="number"
                min="0"
                {...register("nbPaiementsEnregistres")}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="montantCollecte">Montant collecté (FCFA)</Label>
              <Input id="montantCollecte" type="number" min="0" step="1" {...register("montantCollecte")} />
              {errors.montantCollecte && (
                <p className="text-sm text-danger-fort">{errors.montantCollecte.message}</p>
              )}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Observations</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="synthese">Synthèse</Label>
              <Textarea id="synthese" rows={3} {...register("synthese")} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="difficultes">Difficultés rencontrées</Label>
              <Textarea id="difficultes" rows={3} {...register("difficultes")} />
              <p className="text-sm text-texte-doux">
                Conservées telles quelles jusqu'à la DGA : elles ne sont pas réécrites lors de la
                consolidation.
              </p>
            </div>
          </CardContent>
        </Card>

        {produire.isError && (
          <Alerte teinte="danger" titre="Le compte rendu n'a pas pu être enregistré">
            <p>
              {estErreurApi(produire.error)
                ? produire.error.message
                : "Une erreur inattendue est survenue."}
            </p>
          </Alerte>
        )}

        <div className="flex gap-2">
          <Button type="submit" disabled={produire.isPending}>
            {produire.isPending ? "Enregistrement…" : "Enregistrer le brouillon"}
          </Button>
          <Button type="button" variant="outline" onClick={() => navigate("/comptes-rendus")}>
            Annuler
          </Button>
        </div>
      </form>
    </CoquilleApplication>
  );
}
