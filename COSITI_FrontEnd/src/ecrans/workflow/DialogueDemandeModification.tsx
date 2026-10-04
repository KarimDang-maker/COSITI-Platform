import { useRef, useState } from "react";
import { ArrowRight } from "lucide-react";
import { toast } from "sonner";
import { z } from "zod";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Alerte } from "@/components/cositi/alerte";
import { ChampDate } from "@/components/cositi/champ-date";
import { ChampMontant } from "@/components/cositi/champ-montant";
import { SelectRecherche } from "@/components/cositi/select-recherche";
import { useCreerDemandeModification } from "@/hooks/useWorkflow";
import { televerserDocument, FORMATS_ACCEPTES, type CibleDocument } from "@/api/documents";
import { estConflitVersion, type TypeEntiteWorkflow, type TypeOperationWorkflow } from "@/api/workflow";
import { estErreurApi } from "@/api/erreurs";
import { CHAMPS_PAR_OPERATION, formaterValeurChamp, type DefinitionChamp, type Referentiels } from "@/ecrans/workflow/champsWorkflow";
import { estTelephoneValide } from "@/ecrans/adherents/schemas";

/** Contrôles de forme par type de saisie — informatifs, le serveur revalide chaque valeur (§38). */
const SCHEMAS: Readonly<Record<DefinitionChamp["saisie"], z.ZodType<string>>> = {
  texte: z.string().max(500, "500 caractères au maximum."),
  telephone: z.string().refine((v) => v === "" || estTelephoneValide(v), "Le numéro doit comporter 9 chiffres (format camerounais)."),
  date: z.string().refine((v) => v === "" || /^\d{4}-\d{2}-\d{2}$/.test(v), "Date invalide."),
  nombre: z.string().refine((v) => v === "" || !Number.isNaN(Number(v.replace(",", "."))), "Nombre invalide."),
  montant: z.string().refine((v) => v === "" || /^\d+([.,]\d{1,2})?$/.test(v.replace(/\s/g, "")) && Number(v.replace(",", ".")) > 0, "Montant strictement positif, deux décimales au plus."),
  choix: z.string(),
  referentiel: z.string(),
};

/** Valeur transmise au serveur : texte, décimaux avec point, vide = effacer le champ (`PropositionChampDto`). */
function normaliser(definition: DefinitionChamp, saisie: string): string | null {
  const valeur = saisie.trim();
  if (valeur === "") return null;
  if (definition.saisie === "montant" || definition.saisie === "nombre") return valeur.replace(/\s/g, "").replace(",", ".");
  if (definition.saisie === "telephone") return valeur.replace(/\s/g, "");
  return valeur;
}

interface DialogueDemandeModificationProps {
  ouvert: boolean;
  onOuvertChange: (ouvert: boolean) => void;
  typeEntite: TypeEntiteWorkflow;
  operation: Extract<TypeOperationWorkflow, "ADHERENT_MODIFICATION" | "AGENT_MODIFICATION" | "PAIEMENT_CORRECTION">;
  entiteId: string;
  /** Désignation de la donnée (nom, n° de reçu) rappelée dans l'en-tête. */
  designation: string;
  /** Valeurs officielles actuelles, au format serveur. */
  valeursActuelles: Readonly<Record<string, string | null>>;
  /** Version lue : la demande est refusée (409) si la donnée a changé depuis. */
  version?: number | null;
  referentiels?: Referentiels;
  /** Rattachement d'un justificatif téléversé (adhérent ou paiement — l'API des documents ne connaît pas l'agent). */
  cibleDocument?: CibleDocument;
  /** Champs à présélectionner (ex. `statut` depuis l'action « Changer le statut »). */
  champsInitiaux?: readonly string[];
}

/**
 * Demande de modification d'une donnée officielle (§15, §19.3, §27). La valeur officielle reste inchangée tant
 * que la demande n'est pas approuvée par un validateur habilité — jamais le demandeur lui-même.
 */
export function DialogueDemandeModification(props: DialogueDemandeModificationProps) {
  const { ouvert, onOuvertChange, typeEntite, operation, entiteId, designation, valeursActuelles, version, referentiels, cibleDocument, champsInitiaux } = props;
  const definitions = CHAMPS_PAR_OPERATION[operation] ?? [];
  const creer = useCreerDemandeModification(typeEntite, entiteId);
  const champFichier = useRef<HTMLInputElement>(null);

  const valeursInitiales = () => Object.fromEntries(definitions.map((d) => [d.champ, valeursActuelles[d.champ] ?? ""]));
  const [selection, setSelection] = useState<ReadonlySet<string>>(() => new Set(champsInitiaux ?? []));
  const [valeurs, setValeurs] = useState<Record<string, string>>(valeursInitiales);
  const [motif, setMotif] = useState("");
  const [etape, setEtape] = useState<"saisie" | "revue">("saisie");
  const [erreur, setErreur] = useState<{ message: string; conflit: boolean } | null>(null);
  const [cle, setCle] = useState(() => crypto.randomUUID());
  const [envoiEnCours, setEnvoiEnCours] = useState(false);

  function fermer(valeur: boolean) {
    if (!valeur) {
      setSelection(new Set(champsInitiaux ?? []));
      setValeurs(valeursInitiales());
      setMotif("");
      setEtape("saisie");
      setErreur(null);
      setCle(crypto.randomUUID());
    }
    onOuvertChange(valeur);
  }

  const erreursChamps: Record<string, string> = {};
  for (const definition of definitions) {
    if (!selection.has(definition.champ)) continue;
    const resultat = SCHEMAS[definition.saisie].safeParse(valeurs[definition.champ] ?? "");
    if (!resultat.success) erreursChamps[definition.champ] = resultat.error.issues[0]?.message ?? "Valeur invalide.";
  }
  const propositions = definitions
    .filter((d) => selection.has(d.champ))
    .map((d) => ({ definition: d, valeur: normaliser(d, valeurs[d.champ] ?? "") }))
    .filter(({ definition, valeur }) => valeur !== (valeursActuelles[definition.champ] ?? null));
  const peutRelire = propositions.length > 0 && motif.trim() !== "" && Object.keys(erreursChamps).length === 0;

  async function envoyer() {
    if (envoiEnCours) return;
    setErreur(null);
    setEnvoiEnCours(true);
    try {
      const documentIds: string[] = [];
      const fichier = champFichier.current?.files?.[0];
      if (fichier && cibleDocument) {
        const document = await televerserDocument(fichier, "AUTRE", cibleDocument);
        documentIds.push(document.id);
      }
      const demande = await creer.mutateAsync({
        corps: {
          motif: motif.trim(),
          elements: propositions.map(({ definition, valeur }) => ({ champ: definition.champ, valeurProposee: valeur })),
          documentIds: documentIds.length > 0 ? documentIds : undefined,
          versionBase: version ?? undefined,
        },
        cle,
      });
      toast.success(`Demande ${demande.reference} soumise : en attente de validation. La valeur officielle reste inchangée.`);
      fermer(false);
    } catch (e) {
      setErreur({ message: estErreurApi(e) ? e.message : "La demande n'a pas pu être créée.", conflit: estConflitVersion(e) });
      setEtape("saisie");
    } finally {
      setEnvoiEnCours(false);
    }
  }

  function basculer(champ: string, coche: boolean) {
    setSelection((precedente) => {
      const suivante = new Set(precedente);
      if (coche) suivante.add(champ);
      else suivante.delete(champ);
      return suivante;
    });
  }

  function saisie(definition: DefinitionChamp) {
    const id = `dm-${definition.champ}`;
    const valeur = valeurs[definition.champ] ?? "";
    const changer = (v: string) => setValeurs((p) => ({ ...p, [definition.champ]: v }));
    const invalide = !!erreursChamps[definition.champ];
    switch (definition.saisie) {
      case "date":
        return <ChampDate id={id} value={valeur} onChange={(e) => changer(e.target.value)} aria-invalid={invalide} />;
      case "montant":
        return <ChampMontant id={id} value={valeur} onChange={(e) => changer(e.target.value)} aria-invalid={invalide} />;
      case "choix":
        return (
          <Select value={valeur} onValueChange={changer}>
            <SelectTrigger id={id} aria-label={`Valeur proposée — ${definition.libelle}`}>
              <SelectValue placeholder="Choisir" />
            </SelectTrigger>
            <SelectContent>
              {(definition.options ?? []).map((o) => (
                <SelectItem key={o.valeur} value={o.valeur}>
                  {o.libelle}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        );
      case "referentiel": {
        const options = (definition.referentiel ? referentiels?.[definition.referentiel] : undefined) ?? [];
        return (
          <SelectRecherche
            id={id}
            options={options.map((o) => ({ valeur: o.id, libelle: o.libelle }))}
            valeur={valeur}
            onChange={changer}
            placeholder="Choisir"
          />
        );
      }
      default:
        return (
          <Input
            id={id}
            type={definition.saisie === "telephone" ? "tel" : "text"}
            inputMode={definition.saisie === "nombre" ? "decimal" : undefined}
            value={valeur}
            onChange={(e) => changer(e.target.value)}
            aria-invalid={invalide}
          />
        );
    }
  }

  return (
    <Dialog open={ouvert} onOpenChange={fermer}>
      <DialogContent className="max-h-[90dvh] overflow-y-auto sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>{operation === "PAIEMENT_CORRECTION" ? "Demander une correction" : "Demander une modification"}</DialogTitle>
          <DialogDescription>
            {designation} — donnée officielle protégée. La modification ne sera appliquée qu'après validation par un utilisateur
            habilité.
          </DialogDescription>
        </DialogHeader>

        {etape === "saisie" ? (
          <div className="space-y-5">
            <fieldset className="space-y-3">
              <legend className="mb-2 text-sm font-bold text-titre">Informations à modifier</legend>
              {definitions.map((definition) => {
                const coche = selection.has(definition.champ);
                return (
                  <div key={definition.champ} className="rounded-lg border border-bordure p-3">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div className="flex items-center gap-3">
                        <Checkbox
                          id={`choix-${definition.champ}`}
                          checked={coche}
                          onCheckedChange={(v) => basculer(definition.champ, v === true)}
                        />
                        <Label htmlFor={`choix-${definition.champ}`}>{definition.libelle}</Label>
                      </div>
                      <span className="text-sm text-texte-doux-fort">
                        Valeur officielle : {formaterValeurChamp(definition.champ, valeursActuelles[definition.champ], referentiels)}
                      </span>
                    </div>
                    {coche && (
                      <div className="mt-3 space-y-1.5">
                        <Label htmlFor={`dm-${definition.champ}`}>Valeur proposée — {definition.libelle}</Label>
                        {saisie(definition)}
                        {erreursChamps[definition.champ] && (
                          <p className="text-sm font-semibold text-danger-fort">{erreursChamps[definition.champ]}</p>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </fieldset>

            <div className="space-y-1.5">
              <Label htmlFor="dm-motif">
                Motif de la demande <span className="font-medium text-texte-doux">(obligatoire)</span>
              </Label>
              <Textarea id="dm-motif" maxLength={1000} value={motif} onChange={(e) => setMotif(e.target.value)} />
            </div>

            {cibleDocument && (
              <div className="space-y-1.5">
                <Label htmlFor="dm-justificatif">
                  Justificatif <span className="font-medium text-texte-doux">(facultatif — JPEG, PNG, PDF)</span>
                </Label>
                <Input id="dm-justificatif" type="file" ref={champFichier} accept={FORMATS_ACCEPTES} />
              </div>
            )}
          </div>
        ) : (
          <div className="space-y-4">
            <Alerte teinte="info" titre="Relisez la demande">
              <p>Les valeurs officielles actuelles restent en vigueur jusqu'à la décision du validateur.</p>
            </Alerte>
            <ul className="space-y-2" aria-label="Modifications demandées">
              {propositions.map(({ definition, valeur }) => (
                <li key={definition.champ} className="rounded-lg bg-fond p-3">
                  <p className="text-xs font-semibold tracking-wide text-texte-doux-fort uppercase">{definition.libelle}</p>
                  <p className="mt-1 flex flex-wrap items-center gap-2">
                    <span>
                      <span className="text-sm text-texte-doux-fort">Valeur officielle actuelle : </span>
                      {formaterValeurChamp(definition.champ, valeursActuelles[definition.champ], referentiels)}
                    </span>
                    <ArrowRight className="size-4" aria-hidden="true" />
                    <span>
                      <span className="text-sm text-texte-doux-fort">Valeur proposée : </span>
                      <strong>{formaterValeurChamp(definition.champ, valeur, referentiels)}</strong>
                    </span>
                  </p>
                </li>
              ))}
            </ul>
            <p className="text-sm">
              <span className="font-semibold">Motif :</span> {motif.trim()}
            </p>
          </div>
        )}

        {erreur && (
          <Alerte teinte={erreur.conflit ? "attention" : "danger"} titre={erreur.conflit ? "La donnée a été modifiée entre-temps" : "Demande refusée"}>
            <p>{erreur.conflit ? "Fermez puis rouvrez la fiche pour partir de la version à jour." : erreur.message}</p>
          </Alerte>
        )}

        <DialogFooter>
          {etape === "saisie" ? (
            <>
              <Button variant="outline" onClick={() => fermer(false)}>
                Annuler
              </Button>
              <Button disabled={!peutRelire} onClick={() => setEtape("revue")}>
                Relire la demande
              </Button>
            </>
          ) : (
            <>
              <Button variant="outline" onClick={() => setEtape("saisie")} disabled={envoiEnCours}>
                Retour
              </Button>
              <Button onClick={() => void envoyer()} disabled={envoiEnCours}>
                {envoiEnCours ? "Envoi en cours…" : "Soumettre pour validation"}
              </Button>
            </>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
