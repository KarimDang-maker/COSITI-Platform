import { useEffect, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { CLES_PAR_DOMAINE, ecouterChangements } from "@/api/tempsReel";
import { EVENEMENT_NOTIFICATION_RECUE } from "@/api/notifications";

export type EtatTempsReel = "inactif" | "connexion" | "connecte" | "reconnexion";

/** Regroupe les signaux d'une rafale (validation en lot…) en un seul rechargement. */
const DELAI_REGROUPEMENT_MS = 300;
const ATTENTE_MIN_MS = 2_000;
const ATTENTE_MAX_MS = 30_000;

/**
 * Maintient ouvert le flux temps réel tant que `actif` est vrai (session connectée) et invalide les requêtes
 * touchées par chaque action d'un autre acteur. Reconnexion automatique : immédiate après une fermeture
 * normale (le serveur clôt le flux toutes les 10 minutes, le jeton est alors relu), progressive (2 s → 30 s)
 * après une erreur. À chaque reconnexion, tout est invalidé : un signal a pu être manqué pendant la coupure.
 */
export function useTempsReel(actif: boolean): EtatTempsReel {
  const clientRequetes = useQueryClient();
  const [etat, setEtat] = useState<EtatTempsReel>("inactif");

  useEffect(() => {
    if (!actif) return;
    const controleur = new AbortController();
    const enAttente = new Set<string>();
    let minuterie: ReturnType<typeof setTimeout> | undefined;
    let attente = ATTENTE_MIN_MS;
    let premiereConnexion = true;

    const vider = () => {
      minuterie = undefined;
      for (const cle of enAttente) void clientRequetes.invalidateQueries({ queryKey: [cle] });
      enAttente.clear();
    };

    const pause = (ms: number) =>
      new Promise<void>((resoudre) => {
        const t = setTimeout(resoudre, ms);
        controleur.signal.addEventListener("abort", () => {
          clearTimeout(t);
          resoudre();
        });
      });

    void (async () => {
      setEtat("connexion");
      while (!controleur.signal.aborted) {
        try {
          if (!premiereConnexion) void clientRequetes.invalidateQueries();
          const flux = ecouterChangements((evenement) => {
            attente = ATTENTE_MIN_MS;
            for (const cle of CLES_PAR_DOMAINE[evenement.domaine]) enAttente.add(cle);
            minuterie ??= setTimeout(vider, DELAI_REGROUPEMENT_MS);
          }, controleur.signal, (notification) => {
            attente = ATTENTE_MIN_MS;
            // Compteur et liste de la cloche rechargés, puis alerte affichée par `AlertesNotifications`
            // (sous le routeur, qui seul peut naviguer vers l'écran concerné).
            void clientRequetes.invalidateQueries({ queryKey: ["notifications"] });
            window.dispatchEvent(new CustomEvent(EVENEMENT_NOTIFICATION_RECUE, { detail: notification }));
          });
          setEtat("connecte");
          premiereConnexion = false;
          await flux;
          // Fermeture normale (expiration) : on rouvre tout de suite, sans attente.
        } catch {
          if (controleur.signal.aborted) return;
          setEtat("reconnexion");
          await pause(attente);
          attente = Math.min(attente * 2, ATTENTE_MAX_MS);
        }
      }
    })();

    return () => {
      controleur.abort();
      if (minuterie) clearTimeout(minuterie);
      setEtat("inactif");
    };
  }, [actif, clientRequetes]);

  return actif ? etat : "inactif";
}
