import { Link, NavLink } from "react-router";
import {
  Scale,
  Users,
  MapPinned,
  Wallet,
  ShieldCheck,
  ScrollText,
  FileHeart,
  ClipboardList,
  PhoneCall,
  LayoutDashboard,
  FileText,
  History,
  Settings,
  UserRoundCog,
  Landmark,
  ListChecks,
  type LucideIcon,
  Coins,
  FileSearch,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useAuth } from "@/auth/ContexteAuth";
import { cheminTableauBord } from "@/api/tableauxDeBord";
import type { CodePermission } from "@/auth/types";
import { LogoCositi } from "@/components/cositi/logo-cositi";
import { AvatarUtilisateur } from "@/components/cositi/avatar-utilisateur";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { libelleRole } from "@/lib/roles";

interface EntreeNavigation {
  chemin: string;
  libelle: string;
  icone: LucideIcon;
  /**
   * Permission requise pour afficher l'entrée. `undefined` = affichée à tout
   * utilisateur connecté. Le masquage n'est qu'un confort d'affichage :
   * l'API reste seule décisionnaire (`AGENTS.md` règle 1).
   */
  permission?: CodePermission;
  /** Au moins une de ces permissions. */
  unePermissionParmi?: readonly CodePermission[];
}

interface SectionNavigation {
  titre: string;
  entrees: readonly EntreeNavigation[];
}

/** Chemin remplacé à l'affichage par celui du tableau de bord de l'utilisateur. */
const TABLEAU_DE_BORD = "__TABLEAU_DE_BORD__";

/**
 * Entrées regroupées par section (gabarit : `sidebar-menu-section`). Le
 * regroupement n'ajoute aucun écran : ce sont les mêmes routes, rangées par
 * domaine de travail. Une section dont aucune entrée n'est permise n'est pas
 * affichée.
 */
const SECTIONS: readonly SectionNavigation[] = [
  {
    titre: "Pilotage",
    entrees: [
      // Placeholder remplacé à l'affichage par le chemin du dashboard de l'utilisateur
      // (voir `NavigationLaterale`) : six dashboards existent, chacun n'en voit qu'un.
      { chemin: TABLEAU_DE_BORD, libelle: "Tableau de bord", icone: LayoutDashboard },
      // `V12__rapports_daf_exports_j10.sql` : PCA, DAF, DG et DGA uniquement.
      { chemin: "/rapports", libelle: "Rapports", icone: FileText, permission: "RAPPORT_DAF:LIRE" },
      // Workflow V19 : toute la chaîne métier propose ou décide ; ADHERENT:LIRE est porté par tous les rôles métier.
      { chemin: "/validations", libelle: "Centre de validation", icone: ListChecks, permission: "ADHERENT:LIRE" },
    ],
  },
  {
    titre: "Adhérents",
    entrees: [
      { chemin: "/adherents", libelle: "Adhérents", icone: Users, permission: "ADHERENT:LIRE" },
      // `V20__frais_adhesion_activation_controle_dga.sql` : PCA, DG, DGA, Gestionnaire.
      { chemin: "/controles-dga", libelle: "Contrôle DGA", icone: FileSearch, permission: "CONTROLE_DGA:LIRE" },
      // Confirmé réel depuis `V8__permissions_j5_j6.sql` — voir `Conception/SUIVI_EXECUTION.md`.
      { chemin: "/droits", libelle: "Droits", icone: ScrollText, permission: "DROITS:LIRE" },
      // `V9__permissions_j7_cnps_documents.sql` : lecture ouverte à PCA, DG, DGA,
      // DAF et Gestionnaire des comptes ; l'Agent et le Chef n'ont pas ce domaine.
      { chemin: "/cnps", libelle: "CNPS", icone: FileHeart, permission: "CNPS:LIRE" },
      { chemin: "/relances", libelle: "Relances", icone: PhoneCall, permission: "RELANCE:LIRE" },
    ],
  },
  {
    titre: "Terrain",
    entrees: [
      // Module « Gestion des agents de terrain » : liste, fiche, portefeuilles, répartition.
      { chemin: "/agents", libelle: "Agents de terrain", icone: UserRoundCog, permission: "ORGANISATION:LIRE" },
      // Code confirmé par le catalogue RBAC réel du backend
      // (`COSITI_Backend/src/main/resources/db/migration/V5__catalogue_permissions.sql`),
      // absent de `03_SPECIFICATIONS_API.md §6` — voir SUIVI_EXECUTION.md.
      { chemin: "/organisation", libelle: "Organisation terrain", icone: MapPinned, permission: "ORGANISATION:LIRE" },
      // `V10__comptes_rendus_j8.sql` : lecture ouverte à toute la chaîne
      // hiérarchique (Agent, Chef, Gestionnaire, DGA) plus PCA et DG.
      { chemin: "/comptes-rendus", libelle: "Comptes rendus", icone: ClipboardList, permission: "COMPTE_RENDU:LIRE" },
    ],
  },
  {
    titre: "Finances",
    entrees: [
      { chemin: "/cotisations", libelle: "Cotisations", icone: Wallet, permission: "PAIEMENT:LIRE" },
      // V20 : PCA, DG, DGA, DAF, Gestionnaire.
      { chemin: "/frais-adhesion", libelle: "Frais d'adhésion", icone: Coins, permission: "FRAIS_ADHESION:LIRE" },
      // `V18__cotisations_rejet_bilan_caisse.sql` : PCA, DG, DGA, DAF, Gestionnaire.
      { chemin: "/bilans-caisse", libelle: "Bilan de caisse", icone: Landmark, permission: "BILAN_CAISSE:LIRE" },
      // La file de contrôle DAF (J5) réutilise le même contrat que Cotisations
      // (`GET /paiements`, filtré sur `statut=A_CONTROLER`) — même permission
      // de lecture, pas de code dédié inventé pour la seule visibilité du menu.
      { chemin: "/daf", libelle: "DAF", icone: ShieldCheck, permission: "PAIEMENT:LIRE" },
    ],
  },
  {
    titre: "Système",
    entrees: [
      { chemin: "/audit", libelle: "Audit", icone: History, permission: "AUDIT:CONSULTER" },
      // `V13__administration_securite_j11.sql` : Super Administrateur uniquement.
      { chemin: "/administration", libelle: "Administration", icone: Settings, permission: "ADMINISTRATION:LIRE" },
      // V21 : décision du PCA (`REGLE:VALIDER`), consultation par l'administration.
      {
        chemin: "/regles",
        libelle: "Règles à valider",
        icone: Scale,
        unePermissionParmi: ["ADMINISTRATION:LIRE", "REGLE:VALIDER"],
      },
    ],
  },
];

interface NavigationLateraleProps {
  /** Navigation repliée à 80 px : icônes seules, libellés en infobulle et pour le lecteur d'écran. */
  repliee?: boolean;
  /** Appelé au choix d'une entrée — ferme le tiroir en écran étroit. */
  onNaviguer?: () => void;
  className?: string;
}

/**
 * Navigation latérale du gabarit, filtrée par les permissions de
 * `GET /auth/moi`. Une entrée sans permission n'est pas affichée grisée : elle
 * n'est pas affichée (`docs/02_DESIGN_SYSTEM.md §8`).
 *
 * Fond vert foncé, logo inversé ; item actif sur voile clair, liseré orange de
 * 4 px collé au bord du panneau, icône orange. Carte profil en pied.
 */
export function NavigationLaterale({ repliee = false, onNaviguer, className }: NavigationLateraleProps) {
  const { utilisateur, aLaPermission } = useAuth();

  // Le lien « Tableau de bord » pointe vers celui de l'utilisateur, déduit de ses
  // permissions. Absent pour l'Agent de terrain et le Chef, qui n'en ont pas.
  const cheminDashboard = cheminTableauBord(utilisateur?.permissions ?? []);

  const sections = SECTIONS.map((section) => ({
    ...section,
    entrees: section.entrees
      .filter((entree) => !entree.permission || aLaPermission(entree.permission))
      .filter((entree) => !entree.unePermissionParmi || entree.unePermissionParmi.some((p) => aLaPermission(p)))
      .filter((entree) => entree.chemin !== TABLEAU_DE_BORD || cheminDashboard !== null)
      .map((entree) => (entree.chemin === TABLEAU_DE_BORD ? { ...entree, chemin: cheminDashboard! } : entree)),
  })).filter((section) => section.entrees.length > 0);

  return (
    <nav
      aria-label="Navigation principale"
      className={cn(
        "flex h-full flex-col bg-nav-fond py-6 text-nav-contenu",
        repliee ? "items-center px-3" : "px-5",
        className,
      )}
    >
      <Link
        to="/"
        onClick={onNaviguer}
        className={cn("mb-8 flex shrink-0 items-center rounded-md", repliee ? "justify-center" : "px-2")}
        aria-label="COSITI — accueil"
      >
        {repliee ? (
          <LogoCositi contexte="nav-repliee" className="size-10" />
        ) : (
          <LogoCositi contexte="nav" className="h-16 w-auto" />
        )}
      </Link>

      {/* Conteneur défilant de la largeur du panneau : le liseré actif, collé au bord, n'est pas rogné. */}
      <div className={cn("min-h-0 flex-1 space-y-6 self-stretch overflow-y-auto", repliee ? "-mx-3 px-3" : "-mx-5 px-5")}>
        {sections.map((section) => (
          <div key={section.titre}>
            {repliee ? (
              <div className="mx-auto mb-2 h-px w-8 bg-nav-trait" aria-hidden="true" />
            ) : (
              <p className="mb-2 px-3 text-2xs font-bold tracking-capitale text-nav-contenu-doux uppercase">
                {section.titre}
              </p>
            )}
            <ul className="space-y-1">
              {section.entrees.map((entree) => (
                <li key={entree.chemin}>
                  <LienNavigation entree={entree} repliee={repliee} onNaviguer={onNaviguer} />
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>

      {utilisateur && (
        <div
          className={cn(
            "mt-6 flex w-full shrink-0 items-center gap-3 rounded-xl",
            repliee ? "justify-center" : "border border-nav-trait bg-nav-survol-fond p-3",
          )}
        >
          <AvatarUtilisateur nomComplet={utilisateur.nomComplet} fond="inversee" />
          {!repliee && (
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold">{utilisateur.nomComplet}</p>
              <p className="truncate text-xs text-nav-contenu-doux">{libelleRole(utilisateur.roles[0])}</p>
            </div>
          )}
        </div>
      )}
    </nav>
  );
}

interface LienNavigationProps {
  entree: EntreeNavigation;
  repliee: boolean;
  onNaviguer?: () => void;
}

function LienNavigation({ entree, repliee, onNaviguer }: LienNavigationProps) {
  const Icone = entree.icone;
  const lien = (
    <NavLink
      to={entree.chemin}
      onClick={onNaviguer}
      className={({ isActive }) =>
        cn(
          "group relative flex min-h-11 items-center gap-3 rounded-md text-sm font-medium text-nav-contenu-doux transition-colors duration-(--duree-rapide) hover:bg-nav-survol-fond hover:text-nav-contenu focus-visible:ring-2 focus-visible:ring-nav-actif-trait focus-visible:outline-none",
          repliee ? "size-12 justify-center" : "px-3",
          isActive &&
            "bg-nav-actif-fond font-semibold text-nav-contenu before:absolute before:inset-y-2 before:w-1 before:rounded-r-sm before:bg-nav-actif-trait",
          isActive && (repliee ? "before:-left-3" : "before:-left-5"),
        )
      }
    >
      {({ isActive }) => (
        <>
          <Icone
            className={cn("size-5 shrink-0", isActive && "text-nav-actif-trait")}
            aria-hidden="true"
          />
          <span className={repliee ? "sr-only" : "truncate"}>{entree.libelle}</span>
        </>
      )}
    </NavLink>
  );

  if (!repliee) return lien;
  // Repliée : l'infobulle n'est qu'un confort visuel — le libellé reste dans le lien pour le lecteur d'écran.
  return (
    <Tooltip>
      <TooltipTrigger asChild>{lien}</TooltipTrigger>
      <TooltipContent side="right" sideOffset={12}>
        {entree.libelle}
      </TooltipContent>
    </Tooltip>
  );
}
