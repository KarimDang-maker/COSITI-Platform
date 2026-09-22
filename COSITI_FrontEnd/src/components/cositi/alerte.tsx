import type { ReactNode } from "react";
import { AlertTriangle, CheckCircle2, Info, OctagonAlert } from "lucide-react";
import { cn } from "@/lib/utils";

type TeinteAlerte = "info" | "succes" | "attention" | "danger";

const STYLES: Readonly<Record<TeinteAlerte, string>> = {
  info: "bg-info-doux text-info-fort border-info-trait",
  succes: "bg-succes-doux text-succes-fort border-succes-trait",
  attention: "bg-attention-doux text-attention-fort border-attention-trait",
  danger: "bg-danger-doux text-danger-fort border-danger-trait",
};

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
  className?: string;
}

/**
 * Bandeau persistant (`docs/02_DESIGN_SYSTEM.md §9.1`). Pour un message
 * transitoire, utiliser les notifications (`ui/sonner.tsx`) — jamais ce
 * composant, qui doit rester visible tant que la situation qu'il signale
 * n'est pas résolue.
 */
export function Alerte({ teinte, titre, children, className }: AlerteProps) {
  const Icone = ICONES[teinte];
  return (
    <div
      role={teinte === "danger" ? "alert" : "status"}
      className={cn("flex gap-3 rounded-lg border p-4", STYLES[teinte], className)}
    >
      <Icone className="mt-0.5 size-5 shrink-0" aria-hidden="true" />
      <div className="space-y-1">
        {titre && <p className="font-semibold">{titre}</p>}
        <div className="text-sm">{children}</div>
      </div>
    </div>
  );
}
