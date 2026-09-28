import { useNavigate } from "react-router";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import { CoquilleApplication } from "@/components/cositi/coquille-application";
import { Alerte } from "@/components/cositi/alerte";
import { EnTetePage } from "@/components/cositi/entete-page";
import { CarteSection } from "@/components/cositi/carte-section";
import { ChampFormulaire } from "@/components/cositi/champ-formulaire";
import { ChampMontant } from "@/components/cositi/champ-montant";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useProduireCompteRendu } from "@/hooks/useComptesRendus";
import { estErreurApi } from "@/api/erreurs";
import { ChampDate } from "@/components/cositi/champ-date";
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
        <EnTetePage
          titre="Produire un compte rendu"
          filAriane={[{ libelle: "Comptes rendus", chemin: "/comptes-rendus" }, { libelle: "Produire un compte rendu" }]}
          description="Résumez votre activité sur la période. Le compte rendu est d'abord enregistré en brouillon : vous pourrez le relire avant de le transmettre au Gestionnaire des comptes."
        />

        <CarteSection titre="Période couverte" contenuClassName="flex flex-wrap gap-5">
          <ChampFormulaire id="periodeDebut" libelle="Du" erreur={errors.periodeDebut?.message}>
            {(attributs) => <ChampDate {...attributs} className="w-48" {...register("periodeDebut")} />}
          </ChampFormulaire>
          <ChampFormulaire id="periodeFin" libelle="Au" erreur={errors.periodeFin?.message}>
            {(attributs) => <ChampDate {...attributs} className="w-48" {...register("periodeFin")} />}
          </ChampFormulaire>
        </CarteSection>

        <CarteSection titre="Activité de la période" contenuClassName="grid gap-5 sm:grid-cols-2">
          <ChampFormulaire id="nbVisites" libelle="Visites effectuées" erreur={errors.nbVisites?.message}>
            {(attributs) => <Input {...attributs} type="number" min="0" {...register("nbVisites")} />}
          </ChampFormulaire>
          <ChampFormulaire id="nbAdherentsRencontres" libelle="Adhérents rencontrés">
            {(attributs) => <Input {...attributs} type="number" min="0" {...register("nbAdherentsRencontres")} />}
          </ChampFormulaire>
          <ChampFormulaire id="nbAdherentsCrees" libelle="Nouveaux adhérents enregistrés">
            {(attributs) => <Input {...attributs} type="number" min="0" {...register("nbAdherentsCrees")} />}
          </ChampFormulaire>
          <ChampFormulaire id="nbPaiementsEnregistres" libelle="Paiements enregistrés">
            {(attributs) => <Input {...attributs} type="number" min="0" {...register("nbPaiementsEnregistres")} />}
          </ChampFormulaire>
          <ChampFormulaire
            id="montantCollecte"
            libelle="Montant collecté (FCFA)"
            erreur={errors.montantCollecte?.message}
          >
            {(attributs) => <ChampMontant {...attributs} {...register("montantCollecte")} />}
          </ChampFormulaire>
        </CarteSection>

        <CarteSection titre="Observations" contenuClassName="space-y-5">
          <ChampFormulaire id="synthese" libelle="Synthèse">
            {(attributs) => <Textarea {...attributs} rows={3} {...register("synthese")} />}
          </ChampFormulaire>
          <ChampFormulaire
            id="difficultes"
            libelle="Difficultés rencontrées"
            aide="Conservées telles quelles jusqu'à la DGA : elles ne sont pas réécrites lors de la consolidation."
          >
            {(attributs) => <Textarea {...attributs} rows={3} {...register("difficultes")} />}
          </ChampFormulaire>
        </CarteSection>

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
