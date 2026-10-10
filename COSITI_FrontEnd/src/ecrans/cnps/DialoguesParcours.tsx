import { useState, type ReactNode } from "react";
import { Link } from "react-router";
import { Controller, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
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
import { Alerte } from "@/components/cositi/alerte";
import { ChampFormulaire } from "@/components/cositi/champ-formulaire";
import { ChampDate } from "@/components/cositi/champ-date";
import { SelectRecherche } from "@/components/cositi/select-recherche";
import { useOuvrirDossierCnps } from "@/hooks/useCnps";
import { useDocuments } from "@/hooks/useDocuments";
import { useEnregistrerDepotDossier, useImmatriculer, usePreimmatriculer } from "@/hooks/useParcoursCnps";
import type { SituationParcours } from "@/api/parcoursCnps";
import { LIBELLES_TYPE_DOCUMENT } from "@/api/documents";
import { estErreurApi, type ErreurApi } from "@/api/erreurs";
import { formaterMatricule } from "@/lib/format";
import { sansVide } from "@/ecrans/adherents/schemas";

export type TypeActionParcours = "preimmat" | "depot" | "immat";

export interface ActionParcours {
  readonly type: TypeActionParcours;
  readonly situation: SituationParcours;
}

export const LIBELLES_ACTION_PARCOURS: Readonly<Record<TypeActionParcours, string>> = {
  preimmat: "Préimmatriculer",
  depot: "Enregistrer le dépôt au CPS",
  immat: "Immatriculer",
};

/**
 * Action proposée selon l'étape renvoyée par le serveur. Ce n'est qu'un raccourci d'affichage : un bouton montré
 * à tort reçoit le refus motivé de l'API (`CNPS_PREIMMAT_NON_ELIGIBLE`, `CNPS_IMMAT_QUOTA_NON_ATTEINT`…), affiché
 * tel quel — le client ne tranche jamais l'éligibilité.
 */
export function actionContextuelle(situation: SituationParcours): TypeActionParcours | null {
  switch (situation.etape) {
    case "ELIGIBLE_PREIMMAT":
      return "preimmat";
    case "PREIMMATRICULE":
      return "depot";
    case "DOSSIER_DEPOSE":
      return "immat";
    default:
      return null;
  }
}

/** Bouton de l'action contextuelle d'une situation ; rien si aucune action n'existe à cette étape. */
export function BoutonActionParcours({
  situation,
  onAction,
  taille = "sm",
}: {
  situation: SituationParcours;
  onAction: (action: ActionParcours) => void;
  taille?: "sm" | "default";
}) {
  const type = actionContextuelle(situation);
  if (!type) return null;
  return (
    <Button
      size={taille}
      variant={type === "immat" ? "default" : "outline"}
      aria-label={`${LIBELLES_ACTION_PARCOURS[type]} — ${situation.nomComplet}`}
      onClick={() => onAction({ type, situation })}
    >
      {LIBELLES_ACTION_PARCOURS[type]}
    </Button>
  );
}

const schemaPreimmat = z.object({
  numeroTemporaire: z.string().trim().min(1, "Le numéro temporaire est obligatoire."),
  datePreimmatriculation: z.string().optional(),
  recepisseDocumentId: z.string().optional(),
});
type ValeursPreimmat = z.infer<typeof schemaPreimmat>;

const schemaDepot = z.object({
  cps: z.string().trim().min(1, "Le CPS de dépôt est obligatoire."),
  dateDepot: z.string().optional(),
});
type ValeursDepot = z.infer<typeof schemaDepot>;

const schemaImmat = z.object({
  numeroImmatriculation: z.string().trim().min(1, "Le numéro d'immatriculation est obligatoire."),
  dateImmatriculation: z.string().optional(),
});
type ValeursImmat = z.infer<typeof schemaImmat>;

interface DialogueProps {
  situation: SituationParcours;
  onFermer: () => void;
}

function EnteteDialogue({ titre, situation }: { titre: string; situation: SituationParcours }) {
  return (
    <DialogHeader>
      <DialogTitle>{titre}</DialogTitle>
      <DialogDescription>
        {situation.nomComplet} — <span className="ref">{formaterMatricule(situation.matricule)}</span>
      </DialogDescription>
    </DialogHeader>
  );
}

/** Refus métier de l'API : message du serveur affiché tel quel, jamais réécrit ni masqué derrière un toast. */
function BandeauRefus({ erreur, children }: { erreur: ErreurApi | string; children?: ReactNode }) {
  const message = typeof erreur === "string" ? erreur : erreur.message;
  return (
    <Alerte teinte="danger" titre="Action refusée">
      <p>{message}</p>
      {children}
    </Alerte>
  );
}

function messageErreur(e: unknown, defaut: string): ErreurApi | string {
  return estErreurApi(e) ? e : defaut;
}

function champDeErreur(erreur: ErreurApi | string | null, champ: string): string | undefined {
  return erreur && typeof erreur !== "string" && erreur.champ === champ ? erreur.message : undefined;
}

/** Préimmatriculation (`POST …/preimmatriculer`). L'éligibilité et la date future sont jugées par l'API. */
function DialoguePreimmatriculer({ situation, onFermer }: DialogueProps) {
  const preimmatriculer = usePreimmatriculer();
  const documents = useDocuments({ adherentId: situation.adherentId });
  const [erreur, setErreur] = useState<ErreurApi | string | null>(null);
  const {
    register,
    control,
    handleSubmit,
    formState: { errors },
  } = useForm<ValeursPreimmat>({ resolver: zodResolver(schemaPreimmat), defaultValues: { numeroTemporaire: "" } });

  const options = (documents.data ?? [])
    .filter((d) => d.statut !== "REMPLACE" && d.statut !== "REJETE")
    .map((d) => ({ valeur: d.id, libelle: `${LIBELLES_TYPE_DOCUMENT[d.typeDocument]} — ${d.nomFichierOriginal}` }));

  async function soumettre(valeurs: ValeursPreimmat) {
    setErreur(null);
    try {
      await preimmatriculer.mutateAsync({
        adherentId: situation.adherentId,
        corps: {
          numeroTemporaire: valeurs.numeroTemporaire.trim(),
          datePreimmatriculation: sansVide(valeurs.datePreimmatriculation),
          recepisseDocumentId: sansVide(valeurs.recepisseDocumentId),
        },
      });
      toast.success(`Préimmatriculation enregistrée pour ${situation.nomComplet}.`);
      onFermer();
    } catch (e) {
      setErreur(messageErreur(e, "La préimmatriculation n'a pas pu être enregistrée."));
    }
  }

  return (
    <>
      <EnteteDialogue titre="Préimmatriculer l'adhérent" situation={situation} />
      <form id="form-preimmat" noValidate onSubmit={(e) => void handleSubmit(soumettre)(e)} className="space-y-4">
        <ChampFormulaire
          id="preimmat-numero"
          libelle="Numéro temporaire"
          obligatoire
          erreur={errors.numeroTemporaire?.message ?? champDeErreur(erreur, "numeroTemporaire")}
        >
          {(attributs) => <Input {...attributs} {...register("numeroTemporaire")} />}
        </ChampFormulaire>
        <ChampFormulaire
          id="preimmat-date"
          libelle="Date de préimmatriculation"
          facultatif
          aide="Laissée vide, la date du jour est retenue."
          erreur={champDeErreur(erreur, "datePreimmatriculation")}
        >
          {(attributs) => <ChampDate {...attributs} {...register("datePreimmatriculation")} />}
        </ChampFormulaire>
        {options.length > 0 && (
          <ChampFormulaire id="preimmat-recepisse" libelle="Récépissé (document de l'adhérent)" facultatif>
            {(attributs) => (
              <Controller
                control={control}
                name="recepisseDocumentId"
                render={({ field }) => (
                  <SelectRecherche
                    id={attributs.id}
                    options={options}
                    valeur={field.value}
                    onChange={field.onChange}
                    placeholder="Aucun récépissé rattaché"
                  />
                )}
              />
            )}
          </ChampFormulaire>
        )}
        {erreur && <BandeauRefus erreur={erreur} />}
      </form>
      <DialogFooter>
        <Button variant="outline" onClick={onFermer} disabled={preimmatriculer.isPending}>
          Annuler
        </Button>
        <Button type="submit" form="form-preimmat" disabled={preimmatriculer.isPending}>
          {preimmatriculer.isPending ? "Enregistrement…" : "Préimmatriculer"}
        </Button>
      </DialogFooter>
    </>
  );
}

/** Dépôt du dossier physique au CPS (`POST …/depot-dossier`). Le délai et l'ordre des étapes sont jugés par l'API. */
function DialogueDepot({ situation, onFermer }: DialogueProps) {
  const depot = useEnregistrerDepotDossier();
  const [erreur, setErreur] = useState<ErreurApi | string | null>(null);
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<ValeursDepot>({ resolver: zodResolver(schemaDepot), defaultValues: { cps: "" } });

  async function soumettre(valeurs: ValeursDepot) {
    setErreur(null);
    try {
      await depot.mutateAsync({
        adherentId: situation.adherentId,
        corps: { cps: valeurs.cps.trim(), dateDepot: sansVide(valeurs.dateDepot) },
      });
      toast.success(`Dépôt du dossier enregistré pour ${situation.nomComplet}.`);
      onFermer();
    } catch (e) {
      setErreur(messageErreur(e, "Le dépôt n'a pas pu être enregistré."));
    }
  }

  return (
    <>
      <EnteteDialogue titre="Enregistrer le dépôt du dossier au CPS" situation={situation} />
      <form id="form-depot" noValidate onSubmit={(e) => void handleSubmit(soumettre)(e)} className="space-y-4">
        <ChampFormulaire
          id="depot-cps"
          libelle="CPS de dépôt"
          obligatoire
          erreur={errors.cps?.message ?? champDeErreur(erreur, "cps")}
        >
          {(attributs) => <Input {...attributs} {...register("cps")} />}
        </ChampFormulaire>
        <ChampFormulaire
          id="depot-date"
          libelle="Date de dépôt"
          facultatif
          aide="Laissée vide, la date du jour est retenue."
          erreur={champDeErreur(erreur, "dateDepot")}
        >
          {(attributs) => <ChampDate {...attributs} {...register("dateDepot")} />}
        </ChampFormulaire>
        {erreur && <BandeauRefus erreur={erreur} />}
      </form>
      <DialogFooter>
        <Button variant="outline" onClick={onFermer} disabled={depot.isPending}>
          Annuler
        </Button>
        <Button type="submit" form="form-depot" disabled={depot.isPending}>
          {depot.isPending ? "Enregistrement…" : "Enregistrer le dépôt"}
        </Button>
      </DialogFooter>
    </>
  );
}

/**
 * Immatriculation définitive (`POST …/immatriculer`). Deux refus ont une suite proposée : `CNPS_DOSSIER_REQUIS`
 * (ouvrir d'abord le dossier) et `CNPS_ARCHIVAGE_INCOMPLET` (compléter la checklist depuis la fiche).
 */
function DialogueImmatriculer({ situation, onFermer }: DialogueProps) {
  const immatriculer = useImmatriculer();
  const ouvrirDossier = useOuvrirDossierCnps();
  const [erreur, setErreur] = useState<ErreurApi | string | null>(null);
  const [dossierOuvert, setDossierOuvert] = useState(false);
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<ValeursImmat>({ resolver: zodResolver(schemaImmat), defaultValues: { numeroImmatriculation: "" } });

  const code = erreur && typeof erreur !== "string" ? erreur.code : null;

  async function soumettre(valeurs: ValeursImmat) {
    setErreur(null);
    setDossierOuvert(false);
    try {
      await immatriculer.mutateAsync({
        adherentId: situation.adherentId,
        corps: {
          numeroImmatriculation: valeurs.numeroImmatriculation.trim(),
          dateImmatriculation: sansVide(valeurs.dateImmatriculation),
        },
      });
      toast.success(`${situation.nomComplet} est immatriculé.`);
      onFermer();
    } catch (e) {
      setErreur(messageErreur(e, "L'immatriculation n'a pas pu être enregistrée."));
    }
  }

  async function ouvrirLeDossier() {
    try {
      await ouvrirDossier.mutateAsync(situation.adherentId);
      toast.success("Dossier CNPS ouvert. Vous pouvez relancer l'immatriculation.");
      setErreur(null);
      setDossierOuvert(true);
    } catch (e) {
      setErreur(messageErreur(e, "Le dossier CNPS n'a pas pu être ouvert."));
    }
  }

  return (
    <>
      <EnteteDialogue titre="Immatriculer l'adhérent" situation={situation} />
      <form id="form-immat" noValidate onSubmit={(e) => void handleSubmit(soumettre)(e)} className="space-y-4">
        <ChampFormulaire
          id="immat-numero"
          libelle="Numéro d'immatriculation"
          obligatoire
          erreur={errors.numeroImmatriculation?.message ?? champDeErreur(erreur, "numeroImmatriculation")}
        >
          {(attributs) => <Input {...attributs} {...register("numeroImmatriculation")} />}
        </ChampFormulaire>
        <ChampFormulaire
          id="immat-date"
          libelle="Date d'immatriculation"
          facultatif
          aide="Laissée vide, la date du jour est retenue."
          erreur={champDeErreur(erreur, "dateImmatriculation")}
        >
          {(attributs) => <ChampDate {...attributs} {...register("dateImmatriculation")} />}
        </ChampFormulaire>
        {dossierOuvert && (
          <Alerte teinte="succes" titre="Dossier CNPS ouvert">
            <p>Le dossier existe maintenant : relancez l'immatriculation.</p>
          </Alerte>
        )}
        {erreur && (
          <BandeauRefus erreur={erreur}>
            {code === "CNPS_DOSSIER_REQUIS" && (
              <Button
                type="button"
                size="sm"
                variant="outline"
                className="mt-2"
                disabled={ouvrirDossier.isPending}
                onClick={() => void ouvrirLeDossier()}
              >
                {ouvrirDossier.isPending ? "Ouverture…" : "Ouvrir le dossier CNPS"}
              </Button>
            )}
            {code === "CNPS_ARCHIVAGE_INCOMPLET" && (
              <Link
                to={`/adherents/${situation.adherentId}?onglet=cnps`}
                className="mt-2 inline-block font-semibold underline underline-offset-2"
              >
                Compléter la checklist d'archivage
              </Link>
            )}
          </BandeauRefus>
        )}
      </form>
      <DialogFooter>
        <Button variant="outline" onClick={onFermer} disabled={immatriculer.isPending}>
          Annuler
        </Button>
        <Button type="submit" form="form-immat" disabled={immatriculer.isPending}>
          {immatriculer.isPending ? "Enregistrement…" : "Immatriculer"}
        </Button>
      </DialogFooter>
    </>
  );
}

/**
 * Dialogue de l'action choisie. Rendu **hors** du tableau par l'écran appelant : un dialogue monté dans une ligne
 * ferait remonter ses clics jusqu'à l'activation de la ligne (les évènements React traversent les portails).
 */
export function DialogueActionParcours({ action, onFermer }: { action: ActionParcours | null; onFermer: () => void }) {
  return (
    <Dialog open={action !== null} onOpenChange={(ouvert) => !ouvert && onFermer()}>
      <DialogContent className="sm:max-w-lg">
        {action?.type === "preimmat" && <DialoguePreimmatriculer key={action.situation.adherentId} situation={action.situation} onFermer={onFermer} />}
        {action?.type === "depot" && <DialogueDepot key={action.situation.adherentId} situation={action.situation} onFermer={onFermer} />}
        {action?.type === "immat" && <DialogueImmatriculer key={action.situation.adherentId} situation={action.situation} onFermer={onFermer} />}
      </DialogContent>
    </Dialog>
  );
}
