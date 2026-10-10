import { useMemo, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router";
import {
  BadgeCheck,
  CalendarClock,
  CalendarX2,
  ClipboardList,
  FileWarning,
  Hourglass,
  UserCheck,
  type LucideIcon,
} from "lucide-react";
import type { ColumnDef } from "@tanstack/react-table";
import { CoquilleApplication } from "@/components/cositi/coquille-application";
import { EnTetePage } from "@/components/cositi/entete-page";
import { BarreFiltres } from "@/components/cositi/barre-filtres";
import { CarteIndicateur } from "@/components/cositi/carte-indicateur";
import { TableauDonnees } from "@/components/cositi/tableau-donnees";
import { CelluleIdentite } from "@/components/cositi/cellule-identite";
import { BadgeStatut } from "@/components/cositi/badge-statut";
import { EtatVide } from "@/components/cositi/etat-vide";
import { SqueletteTableau } from "@/components/cositi/squelette-tableau";
import { Alerte } from "@/components/cositi/alerte";
import { SelectRecherche } from "@/components/cositi/select-recherche";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useAuth } from "@/auth/ContexteAuth";
import { useZones } from "@/hooks/useOrganisation";
import { useParcoursCnps, useResumeParcours } from "@/hooks/useParcoursCnps";
import {
  FILTRES_PARCOURS,
  LIBELLES_FENETRE,
  type FiltreParcours,
  type SituationParcours,
} from "@/api/parcoursCnps";
import { estErreurApi } from "@/api/erreurs";
import { formaterMatricule, formaterMontant, formaterNombre } from "@/lib/format";
import { cn } from "@/lib/utils";
import { BoutonActionParcours, DialogueActionParcours, type ActionParcours } from "@/ecrans/cnps/DialoguesParcours";
import { AlertesVague, CumulQuota, PiecesManquantes, SuiviDepot } from "@/ecrans/cnps/ElementsParcours";
import { RapportArchivageIncomplet } from "@/ecrans/cnps/RapportArchivageIncomplet";

const FILTRES_VALIDES = new Set<string>(FILTRES_PARCOURS.map((f) => f.valeur));

interface DefinitionCarte {
  readonly cle: string;
  readonly libelle: string;
  readonly icone: LucideIcon;
  /** Filtre appliqué au clic sur la carte. */
  readonly filtre: FiltreParcours;
}

const CARTES: readonly DefinitionCarte[] = [
  { cle: "aPreimmatriculer", libelle: "À préimmatriculer", icone: UserCheck, filtre: "A_PREIMMATRICULER" },
  { cle: "enRetard", libelle: "En retard", icone: CalendarX2, filtre: "EN_RETARD" },
  { cle: "reportes", libelle: "Reportés", icone: CalendarClock, filtre: "REPORTES" },
  { cle: "delaiDepotEnCours", libelle: "Délai de dépôt en cours", icone: Hourglass, filtre: "DELAI_DEPOT" },
  { cle: "eligiblesImmat", libelle: "Éligibles à l'immatriculation", icone: BadgeCheck, filtre: "IMMAT_ELIGIBLES" },
  { cle: "immatricules", libelle: "Immatriculés", icone: ClipboardList, filtre: "IMMATRICULES" },
  { cle: "dossiersPiecesManquantes", libelle: "Dossiers incomplets", icone: FileWarning, filtre: "PIECES_MANQUANTES" },
];

/**
 * `/cnps/parcours` — Parcours CNPS de tous les adhérents du périmètre : qui est à préimmatriculer, en retard, en
 * délai de dépôt, éligible à l'immatriculation. Les compteurs, les quotas, le jour de coupure et la fenêtre courante
 * sont ceux du serveur (`GET /cnps/parcours/resume`) : cet écran ne tranche aucune éligibilité.
 */
export function EcranParcoursCnps() {
  const [parametres, definirParametres] = useSearchParams();
  const navigate = useNavigate();
  const { aLaPermission } = useAuth();
  const peutGerer = aLaPermission("CNPS:GERER");

  const filtreUrl = parametres.get("filtre");
  const filtre: FiltreParcours = filtreUrl && FILTRES_VALIDES.has(filtreUrl) ? (filtreUrl as FiltreParcours) : "TOUS";
  const zoneId = parametres.get("zoneId") ?? undefined;
  const onglet = parametres.get("onglet") === "archivage" ? "archivage" : "situations";

  const resume = useResumeParcours(zoneId);
  const parcours = useParcoursCnps(filtre, zoneId);
  const zones = useZones();
  const [action, setAction] = useState<ActionParcours | null>(null);

  function mettreAJourParametre(cle: string, valeur: string | undefined) {
    const suivants = new URLSearchParams(parametres);
    if (valeur) suivants.set(cle, valeur);
    else suivants.delete(cle);
    definirParametres(suivants, { replace: true });
  }

  const colonnes = useMemo<ColumnDef<SituationParcours>[]>(
    () => [
      {
        id: "adherent",
        header: "Adhérent",
        cell: ({ row }) => (
          <CelluleIdentite
            nom={row.original.nomComplet}
            detail={<span className="ref">{formaterMatricule(row.original.matricule)}</span>}
          />
        ),
      },
      {
        id: "cumul",
        header: "Cumul / quota",
        cell: ({ row }) => <CumulQuota situation={row.original} resume={resume.data} />,
      },
      {
        id: "etape",
        header: "Étape",
        cell: ({ row }) => <BadgeStatut domaine="etapeParcoursCnps" code={row.original.etape} />,
      },
      {
        id: "fenetre",
        header: "Fenêtre",
        cell: ({ row }) =>
          row.original.etape === "NON_ELIGIBLE" || row.original.etape === "ELIGIBLE_PREIMMAT" ? (
            LIBELLES_FENETRE[row.original.fenetre]
          ) : (
            <span className="text-texte-doux">—</span>
          ),
      },
      { id: "vague", header: "Retard / report", cell: ({ row }) => <AlertesVague situation={row.original} /> },
      { id: "depot", header: "Dépôt du dossier", cell: ({ row }) => <SuiviDepot situation={row.original} /> },
      { id: "pieces", header: "Pièces manquantes", cell: ({ row }) => <PiecesManquantes situation={row.original} /> },
      {
        id: "actions",
        header: "",
        cell: ({ row }) => (
          <span className="flex flex-wrap items-center justify-end gap-2">
            {peutGerer && <BoutonActionParcours situation={row.original} onAction={setAction} />}
            <Link
              to={`/adherents/${row.original.adherentId}?onglet=cnps`}
              aria-label={`Fiche adhérent — ${row.original.nomComplet}`}
              className="text-sm font-semibold text-primaire underline underline-offset-2"
            >
              Fiche
            </Link>
          </span>
        ),
      },
    ],
    [peutGerer, resume.data],
  );

  const optionsZones = [
    { valeur: "", libelle: "Toutes les zones" },
    ...(zones.data ?? []).filter((z) => z.active).map((z) => ({ valeur: z.id, libelle: z.libelle })),
  ];

  return (
    <CoquilleApplication titre="CNPS">
      <div className="space-y-6">
        <EnTetePage
          titre="Parcours CNPS"
          filAriane={[{ libelle: "Suivi CNPS", chemin: "/cnps" }, { libelle: "Parcours CNPS" }]}
          description="Préimmatriculation par vagues mensuelles, dépôt du dossier au CPS et immatriculation définitive."
        />

        {resume.isError && (
          <Alerte teinte="danger" titre="Impossible de charger le résumé du parcours">
            <p>{estErreurApi(resume.error) ? resume.error.message : "Une erreur inattendue est survenue."}</p>
          </Alerte>
        )}

        {resume.isLoading && <Skeleton className="h-16 w-full" />}
        {resume.data && (
          <Alerte teinte="info" titre={`${LIBELLES_FENETRE[resume.data.fenetreCourante]} en cours`}>
            <p>
              Quota de préimmatriculation : {formaterMontant(resume.data.quotaPreimmat)} de cotisations validées. La
              fenêtre 1 précède le {formaterNombre(resume.data.jourCoupure)} du mois, la fenêtre 2 commence à cette date.
              Dépôt du dossier au CPS sous {formaterNombre(resume.data.delaiDepotJours)} jours. Quota d'immatriculation :{" "}
              {formaterMontant(resume.data.quotaImmat)}.
            </p>
          </Alerte>
        )}

        {resume.data && (
          <section aria-label="Indicateurs du parcours CNPS" className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {CARTES.map((carte) => {
              const actif = filtre === carte.filtre;
              const Icone = carte.icone;
              const valeur = resume.data[carte.cle as keyof typeof resume.data] as number;
              return (
                <div key={carte.cle} className={cn("relative rounded-2xl", actif && "ring-2 ring-primaire")}>
                  <CarteIndicateur
                    indicateur={{ cle: carte.cle, libelle: carte.libelle, valeur, unite: "NOMBRE" }}
                    className="min-h-32"
                    periode={
                      carte.cle === "delaiDepotEnCours" && resume.data.delaiDepotDepasse > 0
                        ? `dont ${formaterNombre(resume.data.delaiDepotDepasse)} hors délai`
                        : undefined
                    }
                    actions={<Icone className="size-5 text-texte-doux" aria-hidden="true" />}
                  />
                  <button
                    type="button"
                    aria-pressed={actif}
                    aria-label={`Filtrer : ${carte.libelle}`}
                    onClick={() => mettreAJourParametre("filtre", actif ? undefined : carte.filtre)}
                    className="absolute inset-0 rounded-2xl focus-visible:ring-2 focus-visible:ring-anneau focus-visible:outline-none"
                  />
                </div>
              );
            })}
          </section>
        )}

        <Tabs value={onglet} onValueChange={(valeur) => mettreAJourParametre("onglet", valeur === "archivage" ? "archivage" : undefined)}>
          <TabsList>
            <TabsTrigger value="situations">Situations</TabsTrigger>
            <TabsTrigger value="archivage">Dossiers à archivage incomplet</TabsTrigger>
          </TabsList>

          <TabsContent value="situations" className="space-y-6">
            <BarreFiltres>
              <div className="w-64 space-y-1.5">
                <Label htmlFor="filtre-parcours">Filtre</Label>
                <SelectRecherche
                  id="filtre-parcours"
                  options={FILTRES_PARCOURS.map((f) => ({ valeur: f.valeur, libelle: f.libelle }))}
                  valeur={filtre}
                  onChange={(valeur) => mettreAJourParametre("filtre", valeur === "TOUS" ? undefined : valeur)}
                />
              </div>
              <div className="w-64 space-y-1.5">
                <Label htmlFor="filtre-zone-parcours">Zone</Label>
                <SelectRecherche
                  id="filtre-zone-parcours"
                  options={optionsZones}
                  valeur={zoneId ?? ""}
                  onChange={(valeur) => mettreAJourParametre("zoneId", valeur || undefined)}
                />
              </div>
            </BarreFiltres>

            {parcours.isLoading && <SqueletteTableau colonnes={8} />}

            {parcours.isError && (
              <Alerte teinte="danger" titre="Impossible de charger le parcours CNPS">
                <p>{estErreurApi(parcours.error) ? parcours.error.message : "Une erreur inattendue est survenue."}</p>
              </Alerte>
            )}

            {parcours.data && parcours.data.length === 0 && (
              <EtatVide
                titre="Aucun adhérent ne correspond à ce filtre"
                description="Changez de filtre ou de zone pour élargir la liste."
              />
            )}

            {parcours.data && parcours.data.length > 0 && (
              <TableauDonnees
                colonnes={colonnes}
                lignes={parcours.data}
                cleLigne={(s) => s.adherentId}
                onActiverLigne={(s) => navigate(`/adherents/${s.adherentId}?onglet=cnps`)}
                libelleLigne={(s) => `Ouvrir le parcours CNPS de ${s.nomComplet}`}
                legende="Situation de chaque adhérent dans le parcours CNPS"
              />
            )}
          </TabsContent>

          <TabsContent value="archivage" className="space-y-6">
            <RapportArchivageIncomplet />
          </TabsContent>
        </Tabs>
      </div>

      <DialogueActionParcours action={action} onFermer={() => setAction(null)} />
    </CoquilleApplication>
  );
}
