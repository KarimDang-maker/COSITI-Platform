import type { ReactNode } from "react";
import { AlertTriangle, CheckCircle2, Info, OctagonAlert } from "lucide-react";
import { cn } from "@/lib/utils";
import { CLASSES_TEINTE } from "@/lib/statuts";

export type TeinteAlerte = "info" | "succes" | "attention" | "danger";

const ICONES: Readonly<Record<TeinteAlerte, typeof Info>> = {
  info: Info,
  succes: CheckCircle2,
  attention: AlertTriangle,
  danger: OctagonAlert,
};

interface AlerteProps {
  teinte: TeinteAlerte;
  titre?: string;
  children: ReactNode;
  /** Action qui résout la situation signalée (lien, bouton secondaire). */
  action?: ReactNode;
  className?: string;
}

/**
 * Bandeau persistant (`docs/02_DESIGN_SYSTEM.md §9.1`). Gabarit : icône à
 * gauche, contenu, action éventuelle à droite, rayon `lg`. Pour un message
 * transitoire, utiliser les notifications (`ui/sonner.tsx`) — jamais ce
 * composant, qui doit rester visible tant que la situation qu'il signale n'est
 * pas résolue. Il n'a donc pas de bouton de fermeture.
 */
export function Alerte({ teinte, titre, children, action, className }: AlerteProps) {
  const Icone = ICONES[teinte];
  return (
    <div
      role={teinte === "danger" ? "alert" : "status"}
      className={cn("flex gap-3 rounded-lg border px-5 py-4", CLASSES_TEINTE[teinte], className)}
    >
      <Icone className="mt-0.5 size-5 shrink-0" aria-hidden="true" />
      <div className="min-w-0 flex-1 space-y-1">
        {titre && <p className="font-bold">{titre}</p>}
        <div className="text-sm">{children}</div>
      </div>
      {action && <div className="shrink-0 self-center">{action}</div>}
    </div>
  );
}
