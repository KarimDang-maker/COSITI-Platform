import { formaterAnnee } from "@/lib/format";

/**
 * Pied de page de la coquille (gabarit : `footer-custom`). Le nom de la
 * coopérative est écrit en texte courant : ce n'est pas le logo, dont le
 * lettrage n'est jamais reconstitué avec une police (charte §3).
 */
export function PiedPage() {
  return (
    <footer className="mt-auto flex flex-wrap items-center justify-between gap-3 border-t border-bordure pt-5 text-sm text-texte-doux-fort">
      <p className="flex flex-wrap items-center gap-x-3 gap-y-1">
        <span className="font-bold text-titre">COSITI COOP-CA</span>
        <span aria-hidden="true" className="text-bordure-forte">
          |
        </span>
        <span>© {formaterAnnee(new Date())} — Back-office interne</span>
      </p>
      <p className="font-medium">Coopération · action · confiance</p>
    </footer>
  );
}
