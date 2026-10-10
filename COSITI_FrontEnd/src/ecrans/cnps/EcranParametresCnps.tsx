import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import { CoquilleApplication } from "@/components/cositi/coquille-application";
import { EnTetePage } from "@/components/cositi/entete-page";
import { CarteSection } from "@/components/cositi/carte-section";
import { ChampFormulaire } from "@/components/cositi/champ-formulaire";
import { Alerte } from "@/components/cositi/alerte";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import { useAuth } from "@/auth/ContexteAuth";
import { useModifierParametresCnps, useParametresCnps } from "@/hooks/useParcoursCnps";
import { estErreurApi, type ErreurApi } from "@/api/erreurs";

const nombre = (libelle: string) =>
  z.number({ error: `${libelle} : saisissez un nombre.` }).int(`${libelle} : saisissez un nombre entier.`);

/**
 * Seuls le format (nombre entier) et la présence du motif sont contrôlés ici. Les bornes (quota positif, jour de
 * coupure de 1 à 28, délai) sont celles de l'API, qui répond `CNPS_QUOTA_INVALIDE`, `CNPS_JOUR_COUPURE_INVALIDE`
 * ou `CNPS_DELAI_INVALIDE` : le message est affiché tel quel.
 */
const schema = z.object({
  quotaPreimmat: nombre("Quota de préimmatriculation"),
  quotaImmat: nombre("Quota d'immatriculation"),
  jourCoupure: nombre("Jour de coupure"),
  delaiDepotJours: nombre("Délai de dépôt"),
  motif: z.string().trim().min(1, "Le motif est obligatoire."),
});
type Valeurs = z.infer<typeof schema>;

/**
 * `/cnps/parametres` — Quotas, jour de coupure et délai de dépôt du parcours CNPS. Modifiables par le DAF
 * (`CNPS:PARAMETRER`) avec un motif obligatoire ; en lecture seule pour qui n'a pas cette permission.
 */
export function EcranParametresCnps() {
  const { aLaPermission } = useAuth();
  const peutParametrer = aLaPermission("CNPS:PARAMETRER");
  const parametres = useParametresCnps();
  const modifier = useModifierParametresCnps();
  const [refus, setRefus] = useState<ErreurApi | string | null>(null);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<Valeurs>({ resolver: zodResolver(schema), defaultValues: { motif: "" } });

  useEffect(() => {
    if (parametres.data) {
      const { quotaPreimmat, quotaImmat, jourCoupure, delaiDepotJours } = parametres.data;
      reset({ quotaPreimmat, quotaImmat, jourCoupure, delaiDepotJours, motif: "" });
    }
  }, [parametres.data, reset]);

  async function soumettre(valeurs: Valeurs) {
    setRefus(null);
    try {
      await modifier.mutateAsync({ ...valeurs, motif: valeurs.motif.trim() });
      toast.success("Paramètres CNPS enregistrés.");
    } catch (e) {
      setRefus(estErreurApi(e) ? e : "Les paramètres n'ont pas pu être enregistrés.");
    }
  }

  const erreurChamp = (champ: string) => (refus && typeof refus !== "string" && refus.champ === champ ? refus.message : undefined);

  return (
    <CoquilleApplication titre="CNPS">
      <div className="space-y-6">
        <EnTetePage
          titre="Paramètres CNPS"
          filAriane={[{ libelle: "Parcours CNPS", chemin: "/cnps/parcours" }, { libelle: "Paramètres CNPS" }]}
          description="Quotas de cotisations validées, jour de coupure des vagues et délai de dépôt du dossier au CPS."
        />

        {parametres.isLoading && <Skeleton className="h-64 w-full" />}
        {parametres.isError && (
          <Alerte teinte="danger" titre="Impossible de charger les paramètres CNPS">
            <p>{estErreurApi(parametres.error) ? parametres.error.message : "Une erreur inattendue est survenue."}</p>
          </Alerte>
        )}

        {parametres.data && (
          <CarteSection
            titre="Règles du parcours"
            description={
              peutParametrer
                ? "Toute modification est historisée avec son motif."
                : "Lecture seule : seul le DAF peut modifier ces paramètres."
            }
          >
            <form noValidate onSubmit={(e) => void handleSubmit(soumettre)(e)} className="space-y-5">
              <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
                <ChampFormulaire
                  id="param-quotaPreimmat"
                  libelle="Quota de préimmatriculation (FCFA)"
                  aide="Cumul de cotisations validées requis pour être préimmatriculé."
                  erreur={errors.quotaPreimmat?.message ?? erreurChamp("quotaPreimmat")}
                >
                  {(attributs) => (
                    <Input type="number" inputMode="numeric" disabled={!peutParametrer} {...attributs} {...register("quotaPreimmat", { valueAsNumber: true })} />
                  )}
                </ChampFormulaire>
                <ChampFormulaire
                  id="param-quotaImmat"
                  libelle="Quota d'immatriculation (FCFA)"
                  aide="Cumul de cotisations validées requis pour l'immatriculation définitive."
                  erreur={errors.quotaImmat?.message ?? erreurChamp("quotaImmat")}
                >
                  {(attributs) => (
                    <Input type="number" inputMode="numeric" disabled={!peutParametrer} {...attributs} {...register("quotaImmat", { valueAsNumber: true })} />
                  )}
                </ChampFormulaire>
                <ChampFormulaire
                  id="param-jourCoupure"
                  libelle="Jour de coupure"
                  aide="Jour du mois où la fenêtre 2 de la vague commence."
                  erreur={errors.jourCoupure?.message ?? erreurChamp("jourCoupure")}
                >
                  {(attributs) => (
                    <Input type="number" inputMode="numeric" disabled={!peutParametrer} {...attributs} {...register("jourCoupure", { valueAsNumber: true })} />
                  )}
                </ChampFormulaire>
                <ChampFormulaire
                  id="param-delaiDepotJours"
                  libelle="Délai de dépôt du dossier (jours)"
                  aide="Délai accordé après la préimmatriculation pour déposer le dossier au CPS."
                  erreur={errors.delaiDepotJours?.message ?? erreurChamp("delaiDepotJours")}
                >
                  {(attributs) => (
                    <Input type="number" inputMode="numeric" disabled={!peutParametrer} {...attributs} {...register("delaiDepotJours", { valueAsNumber: true })} />
                  )}
                </ChampFormulaire>
              </div>

              {peutParametrer && (
                <>
                  <ChampFormulaire
                    id="param-motif"
                    libelle="Motif de la modification"
                    obligatoire
                    erreur={errors.motif?.message ?? erreurChamp("motif")}
                  >
                    {(attributs) => <Textarea {...attributs} {...register("motif")} />}
                  </ChampFormulaire>

                  {refus && (
                    <Alerte teinte="danger" titre="Modification refusée">
                      <p>{typeof refus === "string" ? refus : refus.message}</p>
                    </Alerte>
                  )}

                  <div className="flex justify-end">
                    <Button type="submit" disabled={modifier.isPending}>
                      {modifier.isPending ? "Enregistrement…" : "Enregistrer les paramètres"}
                    </Button>
                  </div>
                </>
              )}
            </form>
          </CarteSection>
        )}
      </div>
    </CoquilleApplication>
  );
}
