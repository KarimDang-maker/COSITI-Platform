import { NavLink } from "react-router";
import { Users, MapPinned, Wallet, ShieldCheck, ScrollText, FileHeart, ClipboardList, PhoneCall, LayoutDashboard, FileText, History, Settings } from "lucide-react";
import { cn } from "@/lib/utils";
import { useAuth } from "@/auth/ContexteAuth";
import { cheminTableauBord } from "@/api/tableauxDeBord";
import type { CodePermission } from "@/auth/types";
import { LogoCositi } from "@/components/cositi/logo-cositi";

interface EntreeNavigation {
  chemin: string;
  libelle: string;
  icone: typeof Users;
  /**
   * Permission requise pour afficher l'entrée. `undefined` = affichée à tout
   * utilisateur connecté. Le masquage n'est qu'un confort d'affichage :
   * l'API reste seule décisionnaire (`AGENTS.md` règle 1).
   */
  permission?: CodePermission;
}

const ENTREES: readonly EntreeNavigation[] = [
  { chemin: "/adherents", libelle: "Adhérents", icone: Users, permission: "ADHERENT:LIRE" },
  // Placeholder remplacé à l'affichage par le chemin du dashboard de l'utilisateur
  // (voir `NavigationLaterale`) : six dashboards existent, chacun n'en voit qu'un.
  { chemin: "__TABLEAU_DE_BORD__", libelle: "Tableau de bord", icone: LayoutDashboard },
  {
    chemin: "/organisation",
    libelle: "Organisation terrain",
    icone: MapPinned,
    // Code confirmé par le catalogue RBAC réel du backend
    // (`COSITI_Backend/src/main/resources/db/migration/V5__catalogue_permissions.sql`),
    // absent de `03_SPECIFICATIONS_API.md §6` qui ne liste aucune permission
    // par endpoint pour ce domaine — voir SUIVI_EXECUTION.md.
    permission: "ORGANISATION:LIRE",
  },
  { chemin: "/cotisations", libelle: "Cotisations", icone: Wallet, permission: "PAIEMENT:LIRE" },
  {
    chemin: "/daf",
    libelle: "DAF",
    icone: ShieldCheck,
    // La file de contrôle DAF (J5) réutilise le même contrat que Cotisations
    // (`GET /paiements`, filtré sur `statut=A_CONTROLER`) — même permission
    // de lecture, pas de code dédié inventé pour la seule visibilité du menu.
    // Le masquage des actions « Confirmer »/« Signaler une incohérence »,
    // lui, reste sur leurs permissions propres (`PAIEMENT:VALIDER`,
    // `PAIEMENT:SIGNALER_INCOHERENCE` — ce dernier `TODO [A]`, non confirmé).
    permission: "PAIEMENT:LIRE",
  },
  {
    chemin: "/droits",
    libelle: "Droits",
    icone: ScrollText,
    // Confirmé réel depuis `V8__permissions_j5_j6.sql` (le `TODO [A]` posé au
    // jalon J6 est levé) — voir `Conception/SUIVI_EXECUTION.md`.
    permission: "DROITS:LIRE",
  },
  {
    chemin: "/cnps",
    libelle: "CNPS",
    icone: FileHeart,
    // `V9__permissions_j7_cnps_documents.sql` : lecture ouverte à PCA, DG, DGA,
    // DAF et Gestionnaire des comptes ; l'Agent et le Chef n'ont pas ce domaine.
    permission: "CNPS:LIRE",
  },
  {
    chemin: "/comptes-rendus",
    libelle: "Comptes rendus",
    icone: ClipboardList,
    // `V10__comptes_rendus_j8.sql` : lecture ouverte à toute la chaîne
    // hiérarchique (Agent, Chef, Gestionnaire, DGA) plus PCA et DG.
    permission: "COMPTE_RENDU:LIRE",
  },
  {
    chemin: "/relances",
    libelle: "Relances",
    icone: PhoneCall,
    permission: "RELANCE:LIRE",
  },
  {
    chemin: "/rapports",
    libelle: "Rapports",
    icone: FileText,
    // `V12__rapports_daf_exports_j10.sql` : PCA, DAF, DG et DGA uniquement.
    permission: "RAPPORT_DAF:LIRE",
  },
  { chemin: "/audit", libelle: "Audit", icone: History, permission: "AUDIT:CONSULTER" },
  {
    chemin: "/administration",
    libelle: "Administration",
    icone: Settings,
    // `V13__administration_securite_j11.sql` : Super Administrateur uniquement.
    permission: "ADMINISTRATION:LIRE",
  },
];

/**
 * Navigation latérale, filtrée par les permissions de `GET /auth/moi`. Une
 * entrée sans permission n'est pas affichée grisée : elle n'est pas affichée
 * (`docs/02_DESIGN_SYSTEM.md §8`).
 */
export function NavigationLaterale() {
  const { utilisateur, aLaPermission } = useAuth();

  // Le lien « Tableau de bord » pointe vers celui de l'utilisateur, déduit de ses
  // permissions. Absent pour l'Agent de terrain et le Chef, qui n'en ont pas.
  const cheminDashboard = cheminTableauBord(utilisateur?.permissions ?? []);

  const entrees = ENTREES.filter((entree) => !entree.permission || aLaPermission(entree.permission))
    .filter((entree) => entree.chemin !== "__TABLEAU_DE_BORD__" || cheminDashboard !== null)
    .map((entree) =>
      entree.chemin === "__TABLEAU_DE_BORD__" ? { ...entree, chemin: cheminDashboard! } : entree,
    );

  return (
    <nav
      aria-label="Navigation principale"
      className="flex h-full w-(--largeur-nav) flex-col gap-1 bg-nav-fond p-4"
    >
      <div className="mb-4 px-2">
        <LogoCositi contexte="nav" className="h-10 w-auto" />
      </div>
      {entrees.map(({ chemin, libelle, icone: Icone }) => (
        <NavLink
          key={chemin}
          to={chemin}
          className={({ isActive }) =>
            cn(
              "flex items-center gap-3 rounded-md border-l-[3px] border-transparent px-3 py-2 text-sm font-medium text-nav-contenu-doux transition-colors",
              isActive && "border-nav-actif-trait bg-nav-actif-fond text-nav-contenu",
            )
          }
        >
          <Icone className="size-5" aria-hidden="true" />
          {libelle}
        </NavLink>
      ))}
    </nav>
  );
}
