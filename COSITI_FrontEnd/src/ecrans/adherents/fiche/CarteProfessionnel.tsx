import { useState } from "react";
import { Controller, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { CarteSection } from "@/components/cositi/carte-section";
import { ChampFormulaire } from "@/components/cositi/champ-formulaire";
import { SelectRecherche } from "@/components/cositi/select-recherche";
import { Alerte } from "@/components/cositi/alerte";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { useActivites, useModifierProfessionnel, usePacks, useProfilProfessionnel } from "@/hooks/useAdherents";
import type { ProfilProfessionnel } from "@/api/adherents";
import { estErreurApi } from "@/api/erreurs";
import { formaterMontant } from "@/lib/format";
import { LigneChamp } from "@/ecrans/adherents/fiche/LigneChamp";
import { schemaProfessionnel, videVersNull, type ValeursProfessionnel } from "@/ecrans/adherents/schemas";

interface CarteProfessionnelProps {
  adherentId: string;
  peutModifier: boolean;
}

/**
 * Informations professionnelles (#29) et leur modification (#30). Le pack courant est affiché mais ne se
 * modifie pas ici : son changement relève d'un circuit distinct (proposition Gestionnaire, validation DAF,
 * `V15__correction_droits_raport_v1_lot1.sql`).
 */
export function CarteProfessionnel({ adherentId, peutModifier }: CarteProfessionnelProps) {
  const { data, isLoading, isError, error } = useProfilProfessionnel(adherentId);
  const { data: activites } = useActivites();
  const { data: packs } = usePacks();
  const [edition, setEdition] = useState(false);

  if (isLoading) {
    return (
      <CarteSection titre="Informations professionnelles">
        <Skeleton className="h-24 w-full" />
      </CarteSection>
    );
  }

  if (isError || !data) {
    return (
      <CarteSection titre="Informations professionnelles">
        <Alerte teinte="danger">
          <p>{estErreurApi(error) ? error.message : "Les informations professionnelles n'ont pas pu être chargées."}</p>
        </Alerte>
      </CarteSection>
    );
  }

  if (edition) {
    return <FormulaireProfessionnel adherentId={adherentId} initiales={data} onTerminer={() => setEdition(false)} />;
  }

  const activite = activites?.find((a) => a.id === data.activiteId);
  const pack = packs?.find((p) => p.id === data.packIdCourant);

  return (
    <CarteSection
      titre="Informations professionnelles"
      actions={
        peutModifier ? (
          <Button size="sm" variant="outline" onClick={() => setEdition(true)}>
            Modifier
          </Button>
        ) : undefined
      }
    >
      <dl className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <LigneChamp libelle="Activité" valeur={activite?.libelle ?? (data.activiteId ? "Activité inconnue du référentiel" : "—")} />
        <LigneChamp libelle="Numéro CNPS" valeur={data.numeroCnps ?? "—"} />
        <LigneChamp libelle="Association" valeur={data.associationId ? "Rattaché à une association" : "Aucune"} />
        <LigneChamp
          libelle="Pack de cotisation"
          valeur={
            pack ? (
              <>
                {pack.libelle}
                <span className="block text-sm text-texte-doux-fort">
                  Seuil d'éligibilité CNPS du pack : {formaterMontant(pack.seuilEligibiliteCnps)}
                </span>
              </>
            ) : (
              "Aucun pack en cours"
            )
          }
        />
      </dl>
    </CarteSection>
  );
}

function FormulaireProfessionnel({
  adherentId,
  initiales,
  onTerminer,
}: {
  adherentId: string;
  initiales: ProfilProfessionnel;
  onTerminer: () => void;
}) {
  const modifier = useModifierProfessionnel(adherentId);
  const { data: activites } = useActivites();
  const [erreurServeur, setErreurServeur] = useState<string | null>(null);
  const {
    register,
    control,
    handleSubmit,
    formState: { errors },
  } = useForm<ValeursProfessionnel>({
    resolver: zodResolver(schemaProfessionnel),
    defaultValues: { activiteId: initiales.activiteId ?? "", numeroCnps: initiales.numeroCnps ?? "" },
  });

  async function soumettre(valeurs: ValeursProfessionnel) {
    setErreurServeur(null);
    try {
      await modifier.mutateAsync({
        activiteId: valeurs.activiteId,
        numeroCnps: videVersNull(valeurs.numeroCnps),
        // Le `PUT` remplace l'association : on renvoie celle qui est enregistrée, jamais `null` par omission.
        associationId: initiales.associationId,
      });
      toast.success("Informations professionnelles enregistrées.");
      onTerminer();
    } catch (e) {
      setErreurServeur(estErreurApi(e) ? e.message : "Les informations n'ont pas pu être enregistrées.");
    }
  }

  return (
    <form noValidate onSubmit={(e) => void handleSubmit(soumettre)(e)}>
      <CarteSection
        titre="Modifier les informations professionnelles"
        pied={
          <div className="flex w-full justify-end gap-2">
            <Button type="button" variant="outline" onClick={onTerminer} disabled={modifier.isPending}>
              Annuler
            </Button>
            <Button type="submit" disabled={modifier.isPending}>
              {modifier.isPending ? "Enregistrement…" : "Enregistrer"}
            </Button>
          </div>
        }
        contenuClassName="space-y-5"
      >
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
          <ChampFormulaire id="pro-activiteId" libelle="Activité" obligatoire erreur={errors.activiteId?.message}>
            {(attributs) => (
              <Controller
                control={control}
                name="activiteId"
                render={({ field }) => (
                  <SelectRecherche
                    id={attributs.id}
                    options={(activites ?? []).map((a) => ({ valeur: a.id, libelle: a.libelle }))}
                    valeur={field.value}
                    onChange={field.onChange}
                    ariaInvalid={attributs["aria-invalid"]}
                    ariaDescribedBy={attributs["aria-describedby"]}
                    placeholder="Sélectionner une activité"
                  />
                )}
              />
            )}
          </ChampFormulaire>
          <ChampFormulaire id="pro-numeroCnps" libelle="Numéro CNPS" facultatif>
            {(attributs) => <Input {...attributs} {...register("numeroCnps")} />}
          </ChampFormulaire>
        </div>
        {erreurServeur && (
          <Alerte teinte="danger" titre="Enregistrement refusé">
            <p>{erreurServeur}</p>
          </Alerte>
        )}
      </CarteSection>
    </form>
  );
}
