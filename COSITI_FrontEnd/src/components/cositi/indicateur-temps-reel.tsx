import { cn } from "@/lib/utils";
import { useEtatTempsReel } from "@/app/contexteTempsReel";

const LIBELLES = {
  connecte: "En direct",
  connexion: "Connexion…",
  reconnexion: "Hors ligne",
} as const;

const DESCRIPTIONS = {
  connecte: "Les actions des autres acteurs s'affichent dès qu'elles sont enregistrées.",
  connexion: "Ouverture de la mise à jour en direct.",
  reconnexion: "Mise à jour en direct interrompue : nouvelle tentative en cours. Les données affichées peuvent dater.",
} as const;

/**
 * État du flux temps réel dans l'en-tête. Un utilisateur peu à l'aise avec le numérique doit savoir si l'écran
 * qu'il regarde est à jour : pastille et libellé, jamais la couleur seule (`docs/02 §8`).
 */
export function IndicateurTempsReel() {
  const etat = useEtatTempsReel();
  if (etat === "inactif") return null;

  return (
    <span
      role="status"
      title={DESCRIPTIONS[etat]}
      className={cn(
        "hidden items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-medium sm:inline-flex",
        etat === "connecte" && "border-succes-trait bg-succes-doux text-succes-fort",
        etat === "connexion" && "border-neutre-trait bg-neutre-doux text-neutre-fort",
        etat === "reconnexion" && "border-attention-trait bg-attention-doux text-attention-fort",
      )}
    >
      <span
        aria-hidden="true"
        className={cn("size-2 rounded-full bg-current", etat === "connecte" && "motion-safe:animate-pulse")}
      />
      {LIBELLES[etat]}
      <span className="sr-only"> — {DESCRIPTIONS[etat]}</span>
    </span>
  );
}
