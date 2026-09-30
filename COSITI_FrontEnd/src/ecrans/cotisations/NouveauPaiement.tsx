import { useState } from "react";
import { Controller, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import { useNavigate } from "react-router";
import { CoquilleApplication } from "@/components/cositi/coquille-application";
import { EnTetePage } from "@/components/cositi/entete-page";
import { CarteSection } from "@/components/cositi/carte-section";
import { ChampFormulaire } from "@/components/cositi/champ-formulaire";
import { ChampMontant } from "@/components/cositi/champ-montant";
import { Alerte } from "@/components/cositi/alerte";
import { SelectRecherche } from "@/components/cositi/select-recherche";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useAdherents } from "@/hooks/useAdherents";
import { useAgents } from "@/hooks/useOrganisation";
import { useEnregistrerPaiement } from "@/hooks/usePaiements";
import { estModeMobileMoney } from "@/api/paiements";
import { ChampDate } from "@/components/cositi/champ-date";
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
        <EnTetePage
          titre="Nouveau paiement"
          filAriane={[{ libelle: "Cotisations", chemin: "/cotisations" }, { libelle: "Nouveau paiement" }]}
        />

        <CarteSection>
          <form onSubmit={(e) => void handleSubmit(soumettre)(e)} className="space-y-5" noValidate>
            <ChampFormulaire id="adherentId" libelle="Adhérent" erreur={errors.adherentId?.message}>
              {(attributs) => (
                <Controller
                  control={control}
                  name="adherentId"
                  render={({ field }) => (
                    <SelectRecherche
                      id={attributs.id}
                      options={(adherents?.contenu ?? []).map((a) => ({
                        valeur: a.id,
                        // La réponse de liste porte `nomComplet`, pas `nom`/`prenoms` : le sélecteur
                        // d'adhérent n'affichait donc que le matricule.
                        libelle: `${a.matricule} — ${a.nomComplet}`,
                      }))}
                      valeur={field.value}
                      onChange={field.onChange}
                      ariaInvalid={attributs["aria-invalid"]}
                      ariaDescribedBy={attributs["aria-describedby"]}
                      placeholder="Sélectionner un adhérent"
                    />
                  )}
                />
              )}
            </ChampFormulaire>

            <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
              <ChampFormulaire id="datePaiement" libelle="Date du paiement" erreur={errors.datePaiement?.message}>
                {(attributs) => <ChampDate {...attributs} {...register("datePaiement")} />}
              </ChampFormulaire>
              <ChampFormulaire id="montant" libelle="Montant (FCFA)" erreur={errors.montant?.message}>
                {(attributs) => <ChampMontant {...attributs} {...register("montant")} />}
              </ChampFormulaire>
            </div>

            <ChampFormulaire id="modePaiement" libelle="Mode de paiement" erreur={errors.modePaiement?.message}>
              {(attributs) => (
                <Controller
                  control={control}
                  name="modePaiement"
                  render={({ field }) => (
                    <Select value={field.value} onValueChange={field.onChange}>
                      <SelectTrigger {...attributs}>
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
              )}
            </ChampFormulaire>

            {/* Mention « (obligatoire) / (facultative) » écrite dans le libellé plutôt que par les
                drapeaux de `ChampFormulaire` : elle dépend du mode choisi, et le féminin
                « facultative » s'accorde avec « référence ». */}
            <ChampFormulaire
              id="referenceTransaction"
              libelle={`Référence de transaction${
                modeSelectionne && estModeMobileMoney(modeSelectionne) ? " (obligatoire)" : " (facultative)"
              }`}
              erreur={errors.referenceTransaction?.message}
            >
              {(attributs) => <Input className="ref" {...attributs} {...register("referenceTransaction")} />}
            </ChampFormulaire>

            <ChampFormulaire id="agentEncaisseurId" libelle="Agent encaisseur (facultatif)">
              {(attributs) => (
                <Controller
                  control={control}
                  name="agentEncaisseurId"
                  render={({ field }) => (
                    <SelectRecherche
                      id={attributs.id}
                      options={(agents ?? []).map((a) => ({ valeur: a.id, libelle: `${a.codeAgent} — ${a.nomComplet}` }))}
                      valeur={field.value ?? ""}
                      onChange={field.onChange}
                      placeholder="Sélectionner un agent"
                    />
                  )}
                />
              )}
            </ChampFormulaire>

            {enregistrer.isError && (
              <Alerte teinte="danger">
                <p>{estErreurApi(enregistrer.error) ? enregistrer.error.message : "L'enregistrement a échoué."}</p>
              </Alerte>
            )}

            <Button type="submit" disabled={enregistrer.isPending} className="w-full">
              {enregistrer.isPending ? "Enregistrement en cours…" : "Enregistrer le paiement"}
            </Button>
          </form>
        </CarteSection>
      </div>
    </CoquilleApplication>
  );
}
