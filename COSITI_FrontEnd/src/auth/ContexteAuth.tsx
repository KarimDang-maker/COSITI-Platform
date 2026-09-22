/**
 * COSITI — Contexte de session.
 *
 * Source unique de vérité de « qui est connecté » et « que peut-il faire ».
 * `aLaPermission` ne lit **que** `utilisateur.permissions`, renvoyé par
 * `GET /auth/moi` : aucune permission n'est déduite d'un rôle côté client
 * (`AGENTS.md` règle 1 — le frontend masque, il ne décide jamais).
 *
 * Cycle de vie :
 *  1. Au montage, tentative silencieuse de `POST /auth/rafraichir` (cookie
 *     `HttpOnly` de rafraîchissement) : si elle réussit, la session reprend
 *     sans repasser par l'écran de connexion après un rechargement de page.
 *  2. Si elle échoue, `statut` passe à `anonyme` — `GardeRoute` redirige vers
 *     `/connexion`.
 *  3. `api/client.ts` émet `EVENEMENT_SESSION_EXPIREE` quand une rotation en
 *     cours d'usage échoue (401 non rattrapable) ; ce contexte l'écoute et
 *     retombe en `anonyme` sans qu'aucun composant n'ait à connaître
 *     `auth/jeton.ts`.
 */
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { client } from "@/api/client";
import { definirJetonAcces, effacerJetonAcces, EVENEMENT_SESSION_EXPIREE } from "@/auth/jeton";
import type { CodePermission, ReponseConnexion, Utilisateur } from "@/auth/types";

type StatutSession = "initialisation" | "connecte" | "anonyme";

interface ReponseRafraichissement {
  readonly jetonAcces: string;
}

interface ContexteAuthValeur {
  readonly statut: StatutSession;
  readonly utilisateur: Utilisateur | null;
  connecter: (identifiant: string, motDePasse: string) => Promise<{ doitChangerMotDePasse: boolean }>;
  deconnecter: () => Promise<void>;
  aLaPermission: (permission: CodePermission) => boolean;
  rafraichirProfil: () => Promise<void>;
}

const ContexteAuth = createContext<ContexteAuthValeur | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [statut, setStatut] = useState<StatutSession>("initialisation");
  const [utilisateur, setUtilisateur] = useState<Utilisateur | null>(null);

  const chargerProfil = useCallback(async () => {
    const moi = await client.get<Utilisateur>("/auth/moi");
    setUtilisateur(moi);
    setStatut("connecte");
  }, []);

  useEffect(() => {
    let annule = false;
    (async () => {
      try {
        const reponse = await client.post<ReponseRafraichissement>(
          "/auth/rafraichir",
          undefined,
          { authentifie: false },
        );
        definirJetonAcces(reponse.jetonAcces);
        await chargerProfil();
      } catch {
        if (!annule) setStatut("anonyme");
      }
    })();
    return () => {
      annule = true;
    };
    // Volontairement exécuté une seule fois au montage de l'application.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    function surSessionExpiree() {
      setUtilisateur(null);
      setStatut("anonyme");
    }
    window.addEventListener(EVENEMENT_SESSION_EXPIREE, surSessionExpiree);
    return () => window.removeEventListener(EVENEMENT_SESSION_EXPIREE, surSessionExpiree);
  }, []);

  const connecter = useCallback(
    async (identifiant: string, motDePasse: string) => {
      const reponse = await client.post<ReponseConnexion>(
        "/auth/connexion",
        { identifiant, motDePasse },
        { authentifie: false },
      );
      definirJetonAcces(reponse.jetonAcces);
      await chargerProfil();
      return { doitChangerMotDePasse: reponse.doitChangerMotDePasse };
    },
    [chargerProfil],
  );

  const deconnecter = useCallback(async () => {
    try {
      await client.post("/auth/deconnexion");
    } catch {
      // La déconnexion locale doit réussir même si l'appel réseau échoue :
      // l'utilisateur ne doit jamais rester bloqué sur un écran protégé.
    } finally {
      effacerJetonAcces();
      setUtilisateur(null);
      setStatut("anonyme");
    }
  }, []);

  const aLaPermission = useCallback(
    (permission: CodePermission) => utilisateur?.permissions.includes(permission) ?? false,
    [utilisateur],
  );

  const valeur = useMemo<ContexteAuthValeur>(
    () => ({ statut, utilisateur, connecter, deconnecter, aLaPermission, rafraichirProfil: chargerProfil }),
    [statut, utilisateur, connecter, deconnecter, aLaPermission, chargerProfil],
  );

  return <ContexteAuth.Provider value={valeur}>{children}</ContexteAuth.Provider>;
}

export function useAuth(): ContexteAuthValeur {
  const contexte = useContext(ContexteAuth);
  if (!contexte) throw new Error("useAuth doit être utilisé à l'intérieur de <AuthProvider>.");
  return contexte;
}

/** Lecture d'une permission unique — pour un `if` de masquage d'action dans un écran. */
export function usePermission(permission: CodePermission): boolean {
  const { aLaPermission } = useAuth();
  return aLaPermission(permission);
}
