import { useState } from "react";
import { Controller, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import { useNavigate } from "react-router";
import { CoquilleApplication } from "@/components/cositi/coquille-application";
import { Alerte } from "@/components/cositi/alerte";
import { SelectRecherche } from "@/components/cositi/select-recherche";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useAdherents } from "@/hooks/useAdherents";
import { useAgents } from "@/hooks/useOrganisation";
import { useEnregistrerPaiement } from "@/hooks/usePaiements";
import { estModeMobileMoney } from "@/api/paiements";
import { estErreurApi } from "@/api/erreurs";

const schema = z
  .object({
    adherentId: z.string().min(1, "L'adhérent est obligatoire."),
    datePaiement: z.string().min(1, "La date de paiement est obligatoire."),
    montant: z
      .string()
      .min(1, "Le montant est obligatoire.")
      .refine((v) => Number(v) > 0, "Le montant doit être strictement positif."),
    modePaiement: z.enum(["ESPECES", "ORANGE_MONEY", "MTN_MOMO", "VIREMENT"], {
      message: "Le mode de paiement est obligatoire.",
    }),
    referenceTransaction: z.string().trim().optional(),
    agentEncaisseurId: z.string().optional(),
    // Recommandation structurée d'allocation Sécurité Sociale/Épargne (§8) — facultative, uniquement
    // significative au-delà de 1000 FCFA. Les deux champs sont liés : l'un sans l'autre n'a pas de sens.
    allocationSecuriteSociale: z.string().trim().optional(),
    allocationEpargne: z.string().trim().optional(),
  })
  .superRefine((valeurs, ctx) => {
    if (estModeMobileMoney(valeurs.modePaiement) && !valeurs.referenceTransaction) {
      ctx.addIssue({
        code: "custom",
        path: ["referenceTransaction"],
        message:
          "La référence de transaction est obligatoire pour un paiement Orange Money ou MTN MoMo. Saisissez-la depuis le message de confirmation reçu.",
      });
    }
    if ((valeurs.allocationSecuriteSociale && !valeurs.allocationEpargne) ||
      (!valeurs.allocationSecuriteSociale && valeurs.allocationEpargne)) {
      ctx.addIssue({
        code: "custom",
        path: ["allocationEpargne"],
        message: "Renseignez les deux montants (Sécurité Sociale et Épargne), ou aucun des deux.",
      });
    }
  });

type Valeurs = z.infer<typeof schema>;

/** Type de paiement fixe en V1 : cet écran ne saisit que des cotisations (hors mandat : autres types de paiement). */
const TYPE_PAIEMENT = "COTISATION";

export function NouveauPaiement() {
  const navigate = useNavigate();
  // Générée une seule fois au montage — aucune valeur de repli si `crypto.randomUUID` est indisponible :
  // un identifiant faible romprait la garantie d'idempotence sur une écriture financière.
  const [cleIdempotence] = useState(() => crypto.randomUUID());
  const { data: adherents } = useAdherents({ taille: 200 });
  const { data: agents } = useAgents();
  const enregistrer = useEnregistrerPaiement();

  const {
    register,
    handleSubmit,
    control,
    watch,
    formState: { errors },
  } = useForm<Valeurs>({ resolver: zodResolver(schema) });

  const modeSelectionne = watch("modePaiement");
  const montantSaisi = Number(watch("montant") || 0);
  // §8 : « pour un montant supérieur à 1000 FCFA, l'agent de terrain peut recueillir la
  // recommandation du membre » — les champs restent masqués en dessous de ce seuil.
  const seuilRecommandationFranchi = montantSaisi > 1000;

  async function soumettre(valeurs: Valeurs) {
    try {
      const paiement = await enregistrer.mutateAsync({
        corps: {
          adherentId: valeurs.adherentId,
          datePaiement: valeurs.datePaiement,
          montant: Number(valeurs.montant),
          modePaiement: valeurs.modePaiement,
          referenceTransaction: valeurs.referenceTransaction || undefined,
          typePaiement: TYPE_PAIEMENT,
          agentEncaisseurId: valeurs.agentEncaisseurId || undefined,
          recommandationAllocation:
            valeurs.allocationSecuriteSociale && valeurs.allocationEpargne
              ? {
                  allocationSecuriteSociale: Number(valeurs.allocationSecuriteSociale),
                  allocationEpargne: Number(valeurs.allocationEpargne),
                }
              : undefined,
        },
        cleIdempotence,
      });
      toast.success(`Paiement ${paiement.numeroRecu} enregistré.`);
      navigate(`/cotisations/${paiement.id}`);
    } catch {
      // Affiché via enregistrer.error ci-dessous.
    }
  }

  return (
    <CoquilleApplication titre="Nouveau paiement">
      <div className="mx-auto max-w-2xl space-y-6">
        <h1>Nouveau paiement</h1>

        <form onSubmit={(e) => void handleSubmit(soumettre)(e)} className="space-y-4" noValidate>
          <div className="space-y-2">
            <Label htmlFor="adherentId">Adhérent</Label>
            <Controller
              control={control}
              name="adherentId"
              render={({ field }) => (
                <SelectRecherche
                  id="adherentId"
                  options={(adherents?.contenu ?? []).map((a) => ({
                    valeur: a.id,
                    // La réponse de liste porte `nomComplet`, pas `nom`/`prenoms` : le sélecteur
                    // d'adhérent n'affichait donc que le matricule.
                    libelle: `${a.matricule} — ${a.nomComplet}`,
                  }))}
                  valeur={field.value}
                  onChange={field.onChange}
                  ariaInvalid={!!errors.adherentId}
                  placeholder="Sélectionner un adhérent"
                />
              )}
            />
            {errors.adherentId && <p className="text-sm text-danger-fort">{errors.adherentId.message}</p>}
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="datePaiement">Date du paiement</Label>
              <Input id="datePaiement" type="date" aria-invalid={!!errors.datePaiement} {...register("datePaiement")} />
              {errors.datePaiement && <p className="text-sm text-danger-fort">{errors.datePaiement.message}</p>}
            </div>
            <div className="space-y-2">
              <Label htmlFor="montant">Montant (FCFA)</Label>
              <Input id="montant" type="number" min="0" step="1" className="chiffre" aria-invalid={!!errors.montant} {...register("montant")} />
              {errors.montant && <p className="text-sm text-danger-fort">{errors.montant.message}</p>}
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="modePaiement">Mode de paiement</Label>
            <Controller
              control={control}
              name="modePaiement"
              render={({ field }) => (
                <Select value={field.value} onValueChange={field.onChange}>
                  <SelectTrigger id="modePaiement" aria-invalid={!!errors.modePaiement}>
                    <SelectValue placeholder="Sélectionner un mode" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ESPECES">Espèces</SelectItem>
                    <SelectItem value="ORANGE_MONEY">Orange Money</SelectItem>
                    <SelectItem value="MTN_MOMO">MTN MoMo</SelectItem>
                    <SelectItem value="VIREMENT">Virement</SelectItem>
                  </SelectContent>
                </Select>
              )}
            />
            {errors.modePaiement && <p className="text-sm text-danger-fort">{errors.modePaiement.message}</p>}
          </div>

          <div className="space-y-2">
            <Label htmlFor="referenceTransaction">
              Référence de transaction
              {modeSelectionne && estModeMobileMoney(modeSelectionne) ? " (obligatoire)" : " (facultative)"}
            </Label>
            <Input
              id="referenceTransaction"
              className="ref"
              aria-invalid={!!errors.referenceTransaction}
              aria-describedby={errors.referenceTransaction ? "reference-erreur" : undefined}
              {...register("referenceTransaction")}
            />
            {errors.referenceTransaction && (
              <p id="reference-erreur" className="text-sm text-danger-fort">
                {errors.referenceTransaction.message}
              </p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="agentEncaisseurId">Agent encaisseur (facultatif)</Label>
            <Controller
              control={control}
              name="agentEncaisseurId"
              render={({ field }) => (
                <SelectRecherche
                  id="agentEncaisseurId"
                  options={(agents ?? []).map((a) => ({ valeur: a.id, libelle: `${a.codeAgent} — ${a.nomComplet}` }))}
                  valeur={field.value ?? ""}
                  onChange={field.onChange}
                  placeholder="Sélectionner un agent"
                />
              )}
            />
          </div>

          {seuilRecommandationFranchi && (
            <div className="space-y-2 rounded-lg border border-bordure bg-surface p-4">
              <p className="text-sm font-medium">
                Recommandation d'allocation de l'adhérent (facultative, montant &gt; 1000 FCFA)
              </p>
              <p className="text-xs text-texte-doux">
                Donnée structurée (§8) — jamais un commentaire libre. La Sécurité Sociale doit rester ≥ 700
                FCFA et la somme des deux doit égaler le montant du paiement ; sans saisie, la répartition
                par défaut du serveur s'applique.
              </p>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="allocationSecuriteSociale">Allocation Sécurité Sociale (FCFA)</Label>
                  <Input
                    id="allocationSecuriteSociale"
                    type="number"
                    min="700"
                    aria-invalid={!!errors.allocationSecuriteSociale}
                    {...register("allocationSecuriteSociale")}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="allocationEpargne">Allocation Épargne (FCFA)</Label>
                  <Input
                    id="allocationEpargne"
                    type="number"
                    min="0"
                    aria-invalid={!!errors.allocationEpargne}
                    {...register("allocationEpargne")}
                  />
                  {errors.allocationEpargne && (
                    <p className="text-sm text-danger-fort">{errors.allocationEpargne.message}</p>
                  )}
                </div>
              </div>
            </div>
          )}

          {enregistrer.isError && (
            <Alerte teinte="danger">
              <p>{estErreurApi(enregistrer.error) ? enregistrer.error.message : "L'enregistrement a échoué."}</p>
            </Alerte>
          )}

          <Button type="submit" disabled={enregistrer.isPending} className="w-full">
            {enregistrer.isPending ? "Enregistrement en cours…" : "Enregistrer le paiement"}
          </Button>
        </form>
      </div>
    </CoquilleApplication>
  );
}
