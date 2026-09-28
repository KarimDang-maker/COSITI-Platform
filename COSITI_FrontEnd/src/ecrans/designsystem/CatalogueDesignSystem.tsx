import { useState, type ReactNode } from "react";
import type { ColumnDef } from "@tanstack/react-table";
import {
  Download,
  Eye,
  Pencil,
  Plus,
  RefreshCw,
  Trash2,
  Users,
  UserRound,
  WalletCards,
} from "lucide-react";
import { CoquilleApplication } from "@/components/cositi/coquille-application";
import { EnTetePage } from "@/components/cositi/entete-page";
import { CarteSection } from "@/components/cositi/carte-section";
import { CarteIndicateur, RangeeIndicateurs, type IndicateurCle } from "@/components/cositi/carte-indicateur";
import { ListeElements } from "@/components/cositi/liste-elements";
import { ListeAlertes } from "@/components/cositi/liste-alertes";
import { BarreProgression } from "@/components/cositi/barre-progression";
import { BadgeStatut } from "@/components/cositi/badge-statut";
import { Alerte } from "@/components/cositi/alerte";
import { AvertissementRegle } from "@/components/cositi/avertissement-regle";
import { MenuActions } from "@/components/cositi/menu-actions";
import { TableauDonnees } from "@/components/cositi/tableau-donnees";
import { BarreFiltres } from "@/components/cositi/barre-filtres";
import { Pagination } from "@/components/cositi/pagination";
import { CelluleIdentite } from "@/components/cositi/cellule-identite";
import { ChampFormulaire } from "@/components/cositi/champ-formulaire";
import { ChampMontant } from "@/components/cositi/champ-montant";
import { ChampMotDePasse } from "@/components/cositi/champ-mot-de-passe";
import { ChampRecherche } from "@/components/cositi/champ-recherche";
import { SelectRecherche } from "@/components/cositi/select-recherche";
import { Calendrier } from "@/components/cositi/calendrier";
import { SelecteurPeriode, type Periode } from "@/components/cositi/selecteur-periode";
import { ChampDate } from "@/components/cositi/champ-date";
import { ChampIcone } from "@/components/cositi/champ-icone";
import { EtatVide } from "@/components/cositi/etat-vide";
import { SqueletteTableau } from "@/components/cositi/squelette-tableau";
import { DialogueConfirmation } from "@/components/cositi/dialogue-confirmation";
import { GraphiqueZones, type LigneZone } from "@/components/cositi/graphique-zones";
import { AvatarUtilisateur } from "@/components/cositi/avatar-utilisateur";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Switch } from "@/components/ui/switch";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { STATUTS, type DomaineStatut } from "@/lib/statuts";
import { formaterDate, formaterMontant, formaterNombre, formaterPourcentage } from "@/lib/format";
import { lireVariableCss } from "@/lib/jetons";

/*
 * Catalogue vivant du design system COSITI — route `/design-system`, montée
 * en développement uniquement (`app/routes.tsx`). Chaque spécimen est rendu
 * par le composant réel : si un composant change, le catalogue change avec
 * lui. Les données affichées sont des exemples fictifs, marqués comme tels.
 */

/* ==========================================================================
   Mise en page du catalogue
   ======================================================================== */

function Specimen({ nom, fichier, children }: { nom: string; fichier: string; children: ReactNode }) {
  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h3>{nom}</h3>
        <code className="rounded-sm bg-fond px-2 py-0.5 text-xs text-texte-doux-fort">{fichier}</code>
      </div>
      {children}
    </div>
  );
}

/* ==========================================================================
   Fondations
   ======================================================================== */

const COULEURS_MARQUE = [
  { jeton: "--cositi-vert", usage: "Navigation, boutons principaux, positif" },
  { jeton: "--cositi-vert-fonce", usage: "Titres, navigation forte, surfaces inversées" },
  { jeton: "--cositi-vert-clair", usage: "Succès, badges, surfaces douces" },
  { jeton: "--cositi-orange", usage: "Action prioritaire, accent de marque — jamais du texte" },
  { jeton: "--cositi-orange-fonce", usage: "Survol orange, liseré, icône" },
  { jeton: "--cositi-creme", usage: "Alertes douces" },
  { jeton: "--cositi-fond-interface", usage: "Arrière-plan global" },
  { jeton: "--cositi-texte-principal", usage: "Contenu courant" },
  { jeton: "--cositi-texte-secondaire", usage: "Légendes, aide" },
  { jeton: "--cositi-information", usage: "Messages informatifs" },
  { jeton: "--cositi-avertissement", usage: "Attention — aplat seulement" },
  { jeton: "--cositi-erreur", usage: "Erreurs, actions destructives" },
] as const;

const TEINTES = ["neutre", "info", "succes", "attention", "danger"] as const;

function Pastille({ jeton }: { jeton: `--${string}` }) {
  return (
    <span
      className="block h-16 rounded-lg border border-bordure"
      // Couleur lue du jeton lui-même : aucune valeur recopiée.
      style={{ backgroundColor: `var(${jeton})` }}
      title={lireVariableCss(jeton)}
    />
  );
}

function ValeurJeton({ jeton }: { jeton: `--${string}` }) {
  const valeur = lireVariableCss(jeton);
  return <span className="ref text-xs text-texte-doux">{valeur || "—"}</span>;
}

function Fondations() {
  return (
    <div className="space-y-6">
      <CarteSection titre="Couleurs de marque" description="Charte graphique §2 — immuables. Source : src/styles/tokens.css §1.">
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {COULEURS_MARQUE.map(({ jeton, usage }) => (
            <div key={jeton} className="space-y-2">
              <Pastille jeton={jeton} />
              <div>
                <p className="ref text-xs font-semibold text-texte">{jeton}</p>
                <ValeurJeton jeton={jeton} />
                <p className="text-xs text-texte-doux">{usage}</p>
              </div>
            </div>
          ))}
        </div>
      </CarteSection>

      <CarteSection
        titre="Teintes d'état"
        description="Six teintes, pas une de plus. -doux = surface, -fort = encre, -trait = bordure. Tout couple doux/fort ≥ 4,5:1."
      >
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
          {TEINTES.map((teinte) => (
            <div key={teinte} className="space-y-2">
              <div
                className="flex h-16 items-center justify-center rounded-lg border text-sm font-bold"
                style={{
                  backgroundColor: `var(--${teinte}-doux)`,
                  color: `var(--${teinte}-fort)`,
                  borderColor: `var(--${teinte}-trait)`,
                }}
              >
                {teinte}
              </div>
              <p className="ref text-xs text-texte-doux">--{teinte}-doux · -fort · -trait</p>
            </div>
          ))}
        </div>
      </CarteSection>

      <CarteSection titre="Typographie" description="Charte §3 — Noto Sans, 16 px de texte courant. Le niveau sémantique porte le style.">
        <div className="space-y-4">
          <h1>Titre de page — h1, 32 px, vert foncé</h1>
          <h2>Titre de section — h2, 22 px, vert principal</h2>
          <h3>Sous-titre — h3, 18 px, texte principal</h3>
          <p>Texte courant — 16 px. Un adhérent, une cotisation, un versement, une période de droits.</p>
          <Label>Libellé de champ — 14 px, graisse 600</Label>
          <p className="text-xs text-texte-doux">Légende et aide — 13 px, texte secondaire.</p>
          <p>
            Matricule en chasse fixe : <span className="ref">COSITI-00042</span> · montant en chiffres
            tabulaires : <span className="chiffre font-bold">{formaterMontant(125000)}</span>
          </p>
          <p className="chiffre text-4xl leading-none font-extrabold tracking-valeur text-titre">
            {formaterPourcentage(0.3314)}
          </p>
        </div>
      </CarteSection>

      <CarteSection titre="Rayons et ombres" description="Plus l'objet est grand, plus il est arrondi. Ombres teintées vert foncé.">
        <div className="grid gap-4 sm:grid-cols-3 lg:grid-cols-6">
          {(
            [
              ["sm · 6 px", "rounded-sm"],
              ["md · 10 px", "rounded-md"],
              ["lg · 14 px", "rounded-lg"],
              ["xl · 18 px", "rounded-xl"],
              ["2xl · 24 px", "rounded-2xl"],
              ["plein", "rounded-full"],
            ] as const
          ).map(([libelle, classe]) => (
            <div key={classe} className="space-y-2 text-center">
              <div className={`mx-auto size-20 border-2 border-primaire bg-primaire-doux ${classe}`} />
              <p className="text-xs text-texte-doux">{libelle}</p>
            </div>
          ))}
        </div>
        <div className="mt-6 grid gap-4 sm:grid-cols-3">
          {(
            [
              ["legere", "shadow-legere"],
              ["carte", "shadow-carte"],
              ["flottante", "shadow-flottante"],
            ] as const
          ).map(([libelle, classe]) => (
            <div key={classe} className={`rounded-xl bg-surface p-5 text-sm text-texte-doux ${classe}`}>
              Ombre <span className="ref">{libelle}</span>
            </div>
          ))}
        </div>
      </CarteSection>
    </div>
  );
}

/* ==========================================================================
   Actions et retours
   ======================================================================== */

function ActionsEtRetours() {
  const [dialogueOuvert, setDialogueOuvert] = useState(false);
  return (
    <div className="space-y-6">
      <CarteSection titre="Boutons" description="Une seule action primaire (vert) par écran. L'orange signale l'action prioritaire, avec un texte sombre.">
        <div className="space-y-6">
          <Specimen nom="Variantes" fichier="ui/button.tsx">
            <div className="flex flex-wrap items-center gap-3">
              <Button>Enregistrer le paiement</Button>
              <Button variant="marque">Traiter la file</Button>
              <Button variant="outline">Exporter (CSV)</Button>
              <Button variant="secondary">Annuler</Button>
              <Button variant="ghost">Masquer</Button>
              <Button variant="destructive">Annuler le paiement</Button>
              <Button variant="link">Voir le détail</Button>
            </div>
          </Specimen>
          <Specimen nom="Tailles et icônes" fichier="ui/button.tsx">
            <div className="flex flex-wrap items-center gap-3">
              <Button size="xs">Très petit</Button>
              <Button size="sm">Petit</Button>
              <Button>
                <Plus aria-hidden="true" />
                Nouvel adhérent
              </Button>
              <Button size="lg">Grand</Button>
              <Button variant="outline" size="icon" aria-label="Actualiser">
                <RefreshCw aria-hidden="true" />
              </Button>
              <Button disabled>Envoi en cours…</Button>
            </div>
          </Specimen>
        </div>
      </CarteSection>

      <CarteSection titre="Badges de statut" description="Seul moyen d'afficher un statut : domaine + code → libellé + teinte (lib/statuts.ts).">
        <div className="space-y-4">
          {(["adherent", "regularite", "paiement", "dossierCnps"] as const satisfies readonly DomaineStatut[]).map(
            (domaine) => (
              <div key={domaine} className="flex flex-wrap items-center gap-2">
                <span className="ref w-32 text-xs text-texte-doux">{domaine}</span>
                {Object.keys(STATUTS[domaine]).map((code) => (
                  <BadgeStatut key={code} domaine={domaine} code={code} />
                ))}
              </div>
            ),
          )}
        </div>
      </CarteSection>

      <CarteSection titre="Alertes" description="Bandeaux persistants. Pour un message transitoire : notification (sonner).">
        <div className="space-y-3">
          <Alerte teinte="info" titre="Information">
            <p>Les chiffres de synthèse sont recalculés toutes les deux heures.</p>
          </Alerte>
          <Alerte teinte="succes">
            <p>Le compte rendu a été transmis au Gestionnaire des comptes.</p>
          </Alerte>
          <Alerte
            teinte="attention"
            titre="Pièces manquantes"
            action={
              <Button size="sm" variant="outline">
                Compléter
              </Button>
            }
          >
            <p>Deux pièces obligatoires manquent au dossier CNPS.</p>
          </Alerte>
          <Alerte teinte="danger" titre="Impossible de charger les adhérents">
            <p>Le serveur ne répond pas. Réessayez dans quelques instants.</p>
          </Alerte>
          <AvertissementRegle
            avertissements={["Cette répartition utilise une règle provisoire, en attente de validation par la Direction administrative et financière."]}
          />
        </div>
      </CarteSection>

      <CarteSection titre="États" description="Jamais un tableau vide sans explication ; squelette plutôt que spinner.">
        <div className="grid gap-6 lg:grid-cols-2">
          <EtatVide
            icone={Users}
            titre="Aucun adhérent ne correspond à ces critères"
            description="Modifiez les filtres, ou créez un nouvel adhérent."
            action={<Button variant="outline">Nouvel adhérent</Button>}
          />
          <SqueletteTableau lignes={4} colonnes={3} />
        </div>
      </CarteSection>

      <CarteSection titre="Dialogue de confirmation" description="Rappelle les valeurs concernées ; motif obligatoire pour une annulation.">
        <Button variant="destructive" onClick={() => setDialogueOuvert(true)}>
          Annuler le paiement
        </Button>
        <DialogueConfirmation
          ouvert={dialogueOuvert}
          onOuvertChange={setDialogueOuvert}
          titre="Annuler ce paiement ?"
          description={<p>Paiement de {formaterMontant(12500)} du {formaterDate("2026-09-16")} — exemple fictif.</p>}
          libelleConfirmation="Annuler le paiement"
          varianteDestructive
          motifRequis
          libelleMotif="Motif de l'annulation"
          onConfirmer={() => setDialogueOuvert(false)}
        />
      </CarteSection>
    </div>
  );
}

/* ==========================================================================
   Formulaires
   ======================================================================== */

const OPTIONS_ZONES = [
  { valeur: "dla-centre", libelle: "Douala Centre" },
  { valeur: "dla-nord", libelle: "Douala Nord" },
  { valeur: "yde", libelle: "Yaoundé" },
];

function Formulaires() {
  const [zone, setZone] = useState<string | undefined>();
  const [periodeExemple, setPeriodeExemple] = useState<Periode | undefined>({ du: "2026-01-14", au: "2026-01-22" });
  return (
    <div className="space-y-6">
      <CarteSection titre="Champs" description="Libellé toujours visible, aide sous le champ, erreur reliée par aria-describedby.">
        <div className="grid gap-5 sm:grid-cols-2">
          <ChampFormulaire id="ds-nom" libelle="Nom" aide="Patronyme tel qu'il figure sur la CNI.">
            {(a) => <Input {...a} defaultValue="NDONGO" />}
          </ChampFormulaire>
          <ChampFormulaire id="ds-telephone" libelle="Téléphone principal" erreur="Le numéro doit comporter 9 chiffres.">
            {(a) => <Input {...a} defaultValue="6771234" className="ref" />}
          </ChampFormulaire>
          <ChampFormulaire id="ds-montant" libelle="Montant (FCFA)" obligatoire>
            {(a) => <ChampMontant {...a} defaultValue={12500} />}
          </ChampFormulaire>
          <ChampFormulaire id="ds-mdp" libelle="Mot de passe">
            {(a) => <ChampMotDePasse {...a} defaultValue="exemple" />}
          </ChampFormulaire>
          <ChampFormulaire id="ds-mode" libelle="Mode de paiement">
            {(a) => (
              <Select>
                <SelectTrigger {...a} className="w-full">
                  <SelectValue placeholder="Sélectionner un mode" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ESPECES">Espèces</SelectItem>
                  <SelectItem value="ORANGE_MONEY">Orange Money</SelectItem>
                  <SelectItem value="MTN_MOMO">MTN MoMo</SelectItem>
                </SelectContent>
              </Select>
            )}
          </ChampFormulaire>
          <ChampFormulaire id="ds-zone" libelle="Zone" facultatif>
            {(a) => (
              <SelectRecherche
                id={a.id}
                options={OPTIONS_ZONES}
                valeur={zone}
                onChange={setZone}
                ariaDescribedBy={a["aria-describedby"]}
                placeholder="Sélectionner une zone"
              />
            )}
          </ChampFormulaire>
          <ChampFormulaire id="ds-desactive" libelle="Matricule">
            {(a) => <Input {...a} disabled defaultValue="COSITI-00042" className="ref" />}
          </ChampFormulaire>
          <ChampFormulaire id="ds-recherche" libelle="Rechercher">
            {(a) => <ChampRecherche {...a} placeholder="Matricule, nom, téléphone" className="sm:w-full" />}
          </ChampFormulaire>
          <ChampFormulaire id="ds-synthese" libelle="Synthèse" className="sm:col-span-2">
            {(a) => <Textarea {...a} placeholder="Résumé de la descente…" />}
          </ChampFormulaire>
        </div>
      </CarteSection>

      <CarteSection
        titre="Dates"
        description="Calendrier du gabarit : pastilles de 38 px, période sur bande vert clair, semaine commençant le lundi."
      >
        <div className="grid gap-8 lg:grid-cols-[auto_minmax(0,1fr)]">
          <div className="rounded-xl border border-bordure">
            <Calendrier
              mode="periode"
              debut={periodeExemple?.du ?? "2026-01-14"}
              fin={periodeExemple?.au ?? "2026-01-22"}
              onSelectionner={(du, au) => au && setPeriodeExemple({ du, au })}
            />
          </div>
          <div className="space-y-6">
            <Specimen nom="Sélecteur de période" fichier="cositi/selecteur-periode.tsx">
              <SelecteurPeriode periode={periodeExemple} onChange={setPeriodeExemple} libelleParDefaut="Mois en cours" />
            </Specimen>
            <Specimen nom="Champ date" fichier="cositi/champ-date.tsx">
              <ChampFormulaire id="ds-date" libelle="Date du paiement" aide="Saisie au clavier ou par le calendrier.">
                {(a) => <ChampDate {...a} defaultValue="2026-09-16" className="sm:w-56" />}
              </ChampFormulaire>
            </Specimen>
            <Specimen nom="Champ avec icône" fichier="cositi/champ-icone.tsx">
              <ChampFormulaire id="ds-identifiant" libelle="Identifiant">
                {(a) => <ChampIcone {...a} icone={UserRound} placeholder="prenom.nom" classeConteneur="sm:w-72" />}
              </ChampFormulaire>
            </Specimen>
          </div>
        </div>
      </CarteSection>

      <CarteSection titre="Choix" description="Zone cliquable du libellé comprise : cibles de 40 px sur tablette.">
        <div className="grid gap-8 sm:grid-cols-3">
          <fieldset className="space-y-3">
            <legend className="mb-2 text-sm font-semibold">Cases à cocher</legend>
            <Label className="font-medium">
              <Checkbox defaultChecked /> Pièce d'identité fournie
            </Label>
            <Label className="font-medium">
              <Checkbox /> Photo fournie
            </Label>
            <Label className="font-medium">
              <Checkbox disabled /> Option indisponible
            </Label>
          </fieldset>
          <fieldset className="space-y-3">
            <legend className="mb-2 text-sm font-semibold">Canal de relance</legend>
            <RadioGroup defaultValue="APPEL">
              {(
                [
                  ["APPEL", "Appel"],
                  ["SMS", "SMS"],
                  ["VISITE", "Visite"],
                ] as const
              ).map(([valeur, libelle]) => (
                <Label key={valeur} className="font-medium">
                  <RadioGroupItem value={valeur} /> {libelle}
                </Label>
              ))}
            </RadioGroup>
          </fieldset>
          <fieldset className="space-y-3">
            <legend className="mb-2 text-sm font-semibold">Interrupteurs</legend>
            <Label className="font-medium">
              <Switch defaultChecked /> Notifications actives
            </Label>
            <Label className="font-medium">
              <Switch /> Mode compact
            </Label>
          </fieldset>
        </div>
      </CarteSection>
    </div>
  );
}

/* ==========================================================================
   Données
   ======================================================================== */

const INDICATEURS: readonly IndicateurCle[] = [
  { cle: "tauxActivation", libelle: "Taux d'activation", valeur: 0.3314, unite: "POURCENTAGE" },
  { cle: "adherents", libelle: "Adhérents", valeur: 172, unite: "NOMBRE" },
  { cle: "collecte", libelle: "Cumul collecté", valeur: 4_820_000, unite: "MONTANT" },
  { cle: "retards", libelle: "Adhérents en retard", valeur: 38, unite: "NOMBRE" },
];

const ZONES: readonly LigneZone[] = [
  { zoneId: "1", code: "DLA-C", libelle: "Douala Centre", nbAdherents: 64, nbActifs: 29, nbEnRetard: 12, cumulCollecte: 1_950_000, nbAgents: 3 },
  { zoneId: "2", code: "DLA-N", libelle: "Douala Nord", nbAdherents: 51, nbActifs: 14, nbEnRetard: 15, cumulCollecte: 1_210_000, nbAgents: 2 },
  { zoneId: "3", code: "YDE", libelle: "Yaoundé", nbAdherents: 57, nbActifs: 14, nbEnRetard: 11, cumulCollecte: 1_660_000, nbAgents: 2 },
];

interface LigneExemple {
  id: string;
  matricule: string;
  nom: string;
  zone: string;
  montant: number;
  date: string;
  statut: string;
}

const LIGNES: readonly LigneExemple[] = [
  { id: "1", matricule: "COSITI-00042", nom: "NDONGO Marie Claire", zone: "Douala Centre", montant: 12500, date: "2026-09-16", statut: "VALIDE" },
  { id: "2", matricule: "COSITI-00107", nom: "FOTSO Jean", zone: "Douala Nord", montant: 5000, date: "2026-09-15", statut: "A_CONTROLER" },
  { id: "3", matricule: "COSITI-00031", nom: "MBARGA Aïcha", zone: "Yaoundé", montant: 25000, date: "2026-09-14", statut: "INCOHERENCE" },
  { id: "4", matricule: "COSITI-00158", nom: "ESSOMBA Paul", zone: "Yaoundé", montant: 7500, date: "2026-09-12", statut: "BROUILLON" },
];

const COLONNES: ColumnDef<LigneExemple>[] = [
  { id: "matricule", header: "Matricule", cell: ({ row }) => <span className="ref font-bold">{row.original.matricule}</span> },
  {
    id: "adherent",
    header: "Adhérent",
    cell: ({ row }) => <CelluleIdentite nom={row.original.nom} detail={row.original.zone} />,
  },
  {
    id: "montant",
    header: () => <span className="block text-right">Montant</span>,
    cell: ({ row }) => <span className="chiffre block text-right font-bold">{formaterMontant(row.original.montant)}</span>,
  },
  { id: "date", header: "Date", cell: ({ row }) => formaterDate(row.original.date) },
  { id: "statut", header: "Statut", cell: ({ row }) => <BadgeStatut domaine="paiement" code={row.original.statut} /> },
  {
    id: "actions",
    header: () => <span className="sr-only">Actions</span>,
    cell: ({ row }) => (
      <div className="flex justify-end gap-1">
        <Tooltip>
          <TooltipTrigger asChild>
            <Button variant="outline" size="icon" aria-label={`Voir le paiement de ${row.original.nom}`}>
              <Eye aria-hidden="true" />
            </Button>
          </TooltipTrigger>
          <TooltipContent>Voir le détail</TooltipContent>
        </Tooltip>
        <MenuActions
          libelle={`Actions sur le paiement de ${row.original.nom}`}
          actions={[
            { libelle: "Corriger", icone: Pencil },
            { libelle: "Annuler le paiement", icone: Trash2, destructive: true },
          ]}
        />
      </div>
    ),
  },
];

function Donnees() {
  const [page, setPage] = useState(0);
  return (
    <div className="space-y-6">
      <Specimen nom="Rangée d'indicateurs" fichier="cositi/carte-indicateur.tsx">
        <RangeeIndicateurs indicateurs={INDICATEURS} clePrincipale="tauxActivation" />
      </Specimen>

      <div className="grid gap-6 lg:grid-cols-3">
        <CarteIndicateur
          indicateur={INDICATEURS[0]!}
          principal
          periode="Septembre 2026 — exemple"
          tendance={{ evolution: 0.042, sensFavorable: "hausse", reference: "par rapport à août" }}
          lien={{ libelle: "Voir les zones", chemin: "/design-system" }}
        />
        <CarteIndicateur
          indicateur={INDICATEURS[2]!}
          periode="Septembre 2026 — exemple"
          tendance={{ evolution: 0.35, sensFavorable: "hausse", reference: "par rapport à août" }}
          actions={
            <MenuActions
              libelle="Actions sur l'indicateur"
              actions={[
                { libelle: "Actualiser", icone: RefreshCw },
                { libelle: "Exporter", icone: Download },
              ]}
            />
          }
        />
        <CarteIndicateur
          indicateur={INDICATEURS[3]!}
          periode="Septembre 2026 — exemple"
          tendance={{ evolution: 0.08, sensFavorable: "baisse", reference: "par rapport à août" }}
        />
      </div>

      <Specimen nom="Tableau de données" fichier="cositi/tableau-donnees.tsx">
        <TableauDonnees
          legende="Paiements — exemple fictif"
          colonnes={COLONNES}
          lignes={LIGNES}
          cleLigne={(ligne) => ligne.id}
          barreOutils={
            <BarreFiltres
              integree
              actions={
                <Button variant="outline">
                  <Download aria-hidden="true" />
                  Exporter (CSV)
                </Button>
              }
            >
              <ChampRecherche aria-label="Rechercher un paiement" placeholder="Matricule, nom, référence" />
              <Select>
                <SelectTrigger aria-label="Statut" className="w-48">
                  <SelectValue placeholder="Tous les statuts" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="VALIDE">Validé</SelectItem>
                  <SelectItem value="A_CONTROLER">À contrôler</SelectItem>
                </SelectContent>
              </Select>
            </BarreFiltres>
          }
          pied={
            <Pagination page={page} totalPages={7} totalElements={172} libelleElements="paiements" onChangerPage={setPage} />
          }
        />
      </Specimen>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,7fr)_minmax(0,5fr)]">
        <CarteSection
          titre="Derniers paiements"
          actions={
            <MenuActions
              libelle="Actions sur les derniers paiements"
              actions={[{ libelle: "Exporter", icone: Download }]}
            />
          }
        >
          <ListeElements
            elements={LIGNES.slice(0, 3).map((ligne) => ({
              cle: ligne.id,
              icone: WalletCards,
              titre: ligne.nom,
              sousTitre: `${formaterDate(ligne.date)} · ${ligne.matricule}`,
              valeur: formaterMontant(ligne.montant),
              complement: <BadgeStatut domaine="paiement" code={ligne.statut} />,
            }))}
          />
        </CarteSection>

        <CarteSection titre="Activation par zone">
          <div className="space-y-5">
            {ZONES.map((zone) => (
              <BarreProgression
                key={zone.zoneId}
                libelle={zone.libelle}
                ratio={zone.nbActifs / zone.nbAdherents}
                valeur={`${formaterNombre(zone.nbActifs)} / ${formaterNombre(zone.nbAdherents)}`}
              />
            ))}
            <BarreProgression libelle="Mesure prioritaire" ratio={0.62} valeur="62 %" teinte="marque" />
          </div>
        </CarteSection>
      </div>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_22rem]">
        <GraphiqueZones zones={ZONES} />
        <CarteSection titre="Points nécessitant attention">
          <ListeAlertes
            alertes={[
              { code: "JAMAIS", niveau: "CRITIQUE", libelle: "Adhérents n'ayant jamais cotisé", nombre: 115, chemin: null },
              { code: "RETARD", niveau: "ATTENTION", libelle: "Adhérents en retard", nombre: 38, chemin: null },
              { code: "INFO", niveau: "INFO", libelle: "Comptes rendus reçus", nombre: 4, chemin: null },
            ]}
          />
        </CarteSection>
      </div>

      <CarteSection titre="Avatars et identité">
        <div className="flex flex-wrap items-center gap-6">
          <AvatarUtilisateur nomComplet="NDONGO Marie" taille="sm" />
          <AvatarUtilisateur nomComplet="NDONGO Marie" />
          <AvatarUtilisateur nomComplet="NDONGO Marie" taille="lg" />
          <span className="rounded-lg bg-nav-fond p-2">
            <AvatarUtilisateur nomComplet="FOTSO Jean" fond="inversee" />
          </span>
          <CelluleIdentite nom="MBARGA Aïcha" detail={<span className="ref">AGT-014</span>} />
        </div>
      </CarteSection>
    </div>
  );
}

/* ==========================================================================
   Écran
   ======================================================================== */

/** `/design-system` — catalogue des composants, en développement uniquement. */
export function CatalogueDesignSystem() {
  return (
    <CoquilleApplication titre="Design system">
      <div className="space-y-8">
        <EnTetePage
          titre="Design system"
          description="Jetons, composants et gabarits de l'interface COSITI, rendus par les composants réels. Référence : docs/02_DESIGN_SYSTEM.md."
          filAriane={[{ libelle: "Accueil", chemin: "/" }, { libelle: "Design system" }]}
        />

        <Alerte teinte="info">
          <p>
            Catalogue de développement : cette page n'existe pas en production. Les données affichées sont
            des exemples fictifs.
          </p>
        </Alerte>

        <Tabs defaultValue="fondations" className="gap-6">
          <TabsList className="flex-wrap">
            <TabsTrigger value="fondations">Fondations</TabsTrigger>
            <TabsTrigger value="actions">Actions et retours</TabsTrigger>
            <TabsTrigger value="formulaires">Formulaires</TabsTrigger>
            <TabsTrigger value="donnees">Données</TabsTrigger>
          </TabsList>
          <TabsContent value="fondations">
            <Fondations />
          </TabsContent>
          <TabsContent value="actions">
            <ActionsEtRetours />
          </TabsContent>
          <TabsContent value="formulaires">
            <Formulaires />
          </TabsContent>
          <TabsContent value="donnees">
            <Donnees />
          </TabsContent>
        </Tabs>
      </div>
    </CoquilleApplication>
  );
}
