import { useState } from "react";
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
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Textarea } from "@/components/ui/textarea";
import { Alerte } from "@/components/cositi/alerte";
import { ChampFormulaire } from "@/components/cositi/champ-formulaire";
import { useTerminerControleDga, useVerifierChampControle, useVerifierDocumentControle } from "@/hooks/useAdhesion";
import type {
  ChampControle,
  CompteursControle,
  DecisionControleDga,
  DocumentControle,
  StatutCorrespondance,
} from "@/api/adhesion";
import { estConflitVersion } from "@/api/workflow";
import { estErreurApi } from "@/api/erreurs";
import { definitionStatut } from "@/lib/statuts";
import { formaterNombre } from "@/lib/format";

const RESULTATS_CHAMP: readonly StatutCorrespondance[] = [
  "CORRESPOND",
  "NON_CORRESPOND",
  "NON_VERIFIABLE",
  "NON_LISIBLE",
  // V21 : sans objet pour cet adhérent — ni anomalie, ni motif exigé.
  "NON_APPLICABLE",
];

/** Résultats acceptés sans commentaire (contrainte serveur `chk_controle_champ_anomalie_motivee`). */
const SANS_MOTIF: readonly StatutCorrespondance[] = ["CORRESPOND", "NON_APPLICABLE"];

/**
 * Comparaison d'une information COSITI avec le document physique. Les exigences de saisie (valeur lue pour
 * « ne correspond pas », commentaire hors « correspond ») sont celles du contrat serveur
 * (`CONTROLE_DGA_VALEUR_DOCUMENT_REQUISE`, `CONTROLE_DGA_MOTIF_REQUIS`) : l'écran les signale avant l'envoi
 * pour éviter un aller-retour, le serveur les impose.
 */
export function DialogueVerifierChamp({
  controleId,
  champ,
  ouvert,
  onOuvertChange,
}: {
  controleId: string;
  champ: ChampControle;
  ouvert: boolean;
  onOuvertChange: (ouvert: boolean) => void;
}) {
  const verifier = useVerifierChampControle(controleId);
  const [resultat, setResultat] = useState<StatutCorrespondance>(champ.statutCorrespondance ?? "NON_CORRESPOND");
  const [valeurPhysique, setValeurPhysique] = useState(champ.valeurPhysique ?? "");
  const [commentaire, setCommentaire] = useState(champ.commentaire ?? "");
  const [erreur, setErreur] = useState<string | null>(null);
  const valeurRequise = resultat === "NON_CORRESPOND";
  const commentaireRequis = !SANS_MOTIF.includes(resultat);
  const complet = (!valeurRequise || valeurPhysique.trim() !== "") && (!commentaireRequis || commentaire.trim() !== "");

  async function confirmer() {
    if (!complet) return;
    setErreur(null);
    try {
      await verifier.mutateAsync({
        champId: champ.id,
        corps: {
          statutCorrespondance: resultat,
          valeurPhysique: valeurPhysique.trim() || undefined,
          commentaire: commentaire.trim() || undefined,
          version: champ.version,
        },
      });
      toast.success(`« ${champ.libelle} » : ${definitionStatut("correspondance", resultat).libelle.toLowerCase()}.`);
      onOuvertChange(false);
    } catch (e) {
      setErreur(
        estConflitVersion(e)
          ? "Cette information vient d'être vérifiée par quelqu'un d'autre. Fermez pour voir sa version à jour."
          : estErreurApi(e)
            ? e.message
            : "La vérification n'a pas pu être enregistrée.",
      );
    }
  }

  return (
    <Dialog open={ouvert} onOpenChange={onOuvertChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Vérifier : {champ.libelle}</DialogTitle>
          <DialogDescription>Comparez la valeur enregistrée avec ce qui figure sur le document physique.</DialogDescription>
        </DialogHeader>
        <dl className="rounded-lg bg-fond p-3">
          <dt className="text-xs font-semibold tracking-wide text-texte-doux-fort uppercase">Valeur enregistrée dans COSITI</dt>
          <dd className="text-lg font-semibold">{champ.valeurNumerique ?? "—"}</dd>
        </dl>
        <div className="space-y-5">
          <fieldset className="space-y-2">
            <legend className="text-sm font-semibold">Résultat de la comparaison</legend>
            <RadioGroup value={resultat} onValueChange={(v) => setResultat(v as StatutCorrespondance)}>
              {RESULTATS_CHAMP.map((r) => (
                <div key={r} className="flex items-center gap-2">
                  <RadioGroupItem id={`resultat-${r}`} value={r} />
                  <Label htmlFor={`resultat-${r}`}>{definitionStatut("correspondance", r).libelle}</Label>
                </div>
              ))}
            </RadioGroup>
          </fieldset>
          {resultat === "NON_CORRESPOND" && (
            <ChampFormulaire id="champ-valeur-physique" libelle="Valeur lue sur le document" obligatoire>
              {(attributs) => <Input {...attributs} maxLength={500} value={valeurPhysique} onChange={(e) => setValeurPhysique(e.target.value)} />}
            </ChampFormulaire>
          )}
          <ChampFormulaire
            id="champ-commentaire"
            libelle="Commentaire"
            obligatoire={commentaireRequis}
            facultatif={!commentaireRequis}
            aide={commentaireRequis ? "Expliquez l'anomalie : le Gestionnaire s'en servira pour corriger le dossier." : undefined}
          >
            {(attributs) => <Textarea {...attributs} maxLength={1000} value={commentaire} onChange={(e) => setCommentaire(e.target.value)} />}
          </ChampFormulaire>
        </div>
        {erreur && (
          <Alerte teinte="danger" titre="Vérification refusée">
            <p>{erreur}</p>
          </Alerte>
        )}
        <DialogFooter>
          <Button variant="outline" onClick={() => onOuvertChange(false)}>
            Annuler
          </Button>
          <Button disabled={!complet || verifier.isPending} onClick={() => void confirmer()}>
            {verifier.isPending ? "Enregistrement…" : "Enregistrer la vérification"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

/** Constat sur un document entier (manquant ou illisible), appliqué par le serveur à toutes ses informations. */
export function DialogueConstatDocument({
  controleId,
  document,
  libelleDocument,
  constat,
  onFermer,
}: {
  controleId: string;
  document: DocumentControle;
  libelleDocument: string;
  constat: "DOCUMENT_MANQUANT" | "NON_LISIBLE";
  onFermer: () => void;
}) {
  const verifier = useVerifierDocumentControle(controleId);
  const [commentaire, setCommentaire] = useState("");
  const [erreur, setErreur] = useState<string | null>(null);

  async function confirmer() {
    if (!commentaire.trim()) return;
    setErreur(null);
    try {
      await verifier.mutateAsync({ documentId: document.id, corps: { statut: constat, commentaire: commentaire.trim() } });
      toast.success(`${libelleDocument} : ${definitionStatut("correspondance", constat).libelle.toLowerCase()}.`);
      onFermer();
    } catch (e) {
      setErreur(estErreurApi(e) ? e.message : "Le constat n'a pas pu être enregistré.");
    }
  }

  return (
    <Dialog open onOpenChange={(o) => !o && onFermer()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>
            {libelleDocument} — {definitionStatut("correspondance", constat).libelle.toLowerCase()}
          </DialogTitle>
          <DialogDescription>
            Le constat s'applique aux {formaterNombre(document.champs.length)} information(s) de ce document.
          </DialogDescription>
        </DialogHeader>
        <ChampFormulaire id="constat-commentaire" libelle="Commentaire" obligatoire>
          {(attributs) => <Textarea {...attributs} maxLength={1000} value={commentaire} onChange={(e) => setCommentaire(e.target.value)} />}
        </ChampFormulaire>
        {erreur && (
          <Alerte teinte="danger" titre="Constat refusé">
            <p>{erreur}</p>
          </Alerte>
        )}
        <DialogFooter>
          <Button variant="outline" onClick={onFermer}>
            Annuler
          </Button>
          <Button variant="destructive" disabled={!commentaire.trim() || verifier.isPending} onClick={() => void confirmer()}>
            Enregistrer le constat
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

const TEXTES_DECISION: Readonly<Record<DecisionControleDga, { titre: string; texte: string; succes: string }>> = {
  VALIDER: {
    titre: "Valider le dossier",
    texte: "Les documents sont conformes : le dossier devient officiel.",
    succes: "Contrôle validé : documents conformes.",
  },
  DEMANDER_CORRECTION: {
    titre: "Demander une correction",
    texte: "Le dossier retourne au Gestionnaire, qui corrigera puis le retransmettra. Expliquez ce qui doit être corrigé.",
    succes: "Correction demandée au Gestionnaire.",
  },
  REJETER: {
    titre: "Rejeter le dossier",
    texte: "Décision définitive pour ce tour de contrôle. Le motif est obligatoire et conservé.",
    succes: "Contrôle rejeté.",
  },
};

/**
 * Finalisation du contrôle (DGA) avec le résumé calculé par le serveur. Depuis V21, le serveur dit lui-même si la
 * validation est possible (`validable`) et pourquoi elle ne l'est pas (`blocages`) : l'écran l'affiche tel quel.
 */
export function DialogueDecisionControle({
  controleId,
  decision,
  compteurs,
  blocages = [],
  onFermer,
}: {
  controleId: string;
  decision: DecisionControleDga;
  compteurs: CompteursControle;
  /** Raisons, données par le serveur, pour lesquelles « Valider » est impossible. */
  blocages?: readonly string[];
  onFermer: () => void;
}) {
  const terminer = useTerminerControleDga(controleId);
  const [commentaire, setCommentaire] = useState("");
  const [erreur, setErreur] = useState<string | null>(null);
  const [cle] = useState(() => crypto.randomUUID());
  const commentaireRequis = decision !== "VALIDER";
  const textes = TEXTES_DECISION[decision];

  async function confirmer() {
    if (commentaireRequis && !commentaire.trim()) return;
    setErreur(null);
    try {
      await terminer.mutateAsync({ decision, commentaire: commentaire.trim() || undefined, cleIdempotence: cle });
      toast.success(textes.succes);
      onFermer();
    } catch (e) {
      setErreur(estErreurApi(e) ? e.message : "La décision n'a pas pu être enregistrée.");
    }
  }

  return (
    <Dialog open onOpenChange={(o) => !o && onFermer()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{textes.titre}</DialogTitle>
          <DialogDescription>{textes.texte}</DialogDescription>
        </DialogHeader>
        <dl className="grid grid-cols-2 gap-3 rounded-lg bg-fond p-4 text-sm">
          <div>
            <dt className="text-texte-doux-fort">Informations vérifiées</dt>
            <dd className="chiffre text-lg font-bold">
              {formaterNombre(compteurs.champsVerifies)} / {formaterNombre(compteurs.champs)}
            </dd>
          </div>
          <div>
            <dt className="text-texte-doux-fort">Conformes</dt>
            <dd className="chiffre text-lg font-bold">{formaterNombre(compteurs.champsConformes)}</dd>
          </div>
          <div>
            <dt className="text-texte-doux-fort">Anomalies</dt>
            <dd className="chiffre text-lg font-bold">{formaterNombre(compteurs.anomalies)}</dd>
          </div>
          <div>
            <dt className="text-texte-doux-fort">Non vérifiables</dt>
            <dd className="chiffre text-lg font-bold">{formaterNombre(compteurs.nonVerifiables)}</dd>
          </div>
        </dl>
        {decision === "VALIDER" && blocages.length > 0 && (
          <Alerte teinte="attention" titre="Validation impossible pour le moment">
            <ul className="list-disc pl-5">
              {blocages.map((b) => (
                <li key={b}>{b}</li>
              ))}
            </ul>
            <p className="mt-1">Demandez plutôt une correction au Gestionnaire.</p>
          </Alerte>
        )}
        <ChampFormulaire
          id="decision-commentaire"
          libelle="Commentaire"
          obligatoire={commentaireRequis}
          facultatif={!commentaireRequis}
        >
          {(attributs) => <Textarea {...attributs} maxLength={1000} value={commentaire} onChange={(e) => setCommentaire(e.target.value)} />}
        </ChampFormulaire>
        {erreur && (
          <Alerte teinte="danger" titre="Décision refusée">
            <p>{erreur}</p>
          </Alerte>
        )}
        <DialogFooter>
          <Button variant="outline" onClick={onFermer}>
            Annuler
          </Button>
          <Button
            variant={decision === "REJETER" ? "destructive" : "default"}
            disabled={(commentaireRequis && !commentaire.trim()) || (decision === "VALIDER" && blocages.length > 0) || terminer.isPending}
            onClick={() => void confirmer()}
          >
            {terminer.isPending ? "Enregistrement…" : textes.titre}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
