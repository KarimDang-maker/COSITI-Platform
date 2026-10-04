import { lazy, Suspense } from "react";
import { Navigate, Route, Routes } from "react-router";
import { GardeRoute } from "@/app/GardeRoute";
import { EcranConnexion } from "@/ecrans/connexion/EcranConnexion";
import { EcranChangerMotDePasse } from "@/ecrans/connexion/EcranChangerMotDePasse";
import { ListeAdherents } from "@/ecrans/adherents/ListeAdherents";
import { FicheAdherent } from "@/ecrans/adherents/FicheAdherent";
import { NouvelAdherent } from "@/ecrans/adherents/NouvelAdherent";
import { EcranOrganisation } from "@/ecrans/organisation/EcranOrganisation";
import { ListeAgentsTerrain } from "@/ecrans/agents/ListeAgentsTerrain";
import { FicheAgentTerrain } from "@/ecrans/agents/FicheAgentTerrain";
import { JournalCotisations } from "@/ecrans/cotisations/JournalCotisations";
import { NouveauPaiement } from "@/ecrans/cotisations/NouveauPaiement";
import { DetailPaiement } from "@/ecrans/cotisations/DetailPaiement";
import { EcranBilanCaisse } from "@/ecrans/cotisations/EcranBilanCaisse";
import { EcranCentreValidation } from "@/ecrans/workflow/EcranCentreValidation";
import { EcranFileControleDga } from "@/ecrans/adhesion/EcranFileControleDga";
import { EcranControleDga } from "@/ecrans/adhesion/EcranControleDga";
import { EcranFraisAdhesion } from "@/ecrans/adhesion/EcranFraisAdhesion";
import { EcranRegles } from "@/ecrans/regles/EcranRegles";
import { OuvertureFraisAdhesion, OuvertureBilanCaisse } from "@/ecrans/notifications/OuverturesNotification";
import { FicheDemandeValidation } from "@/ecrans/workflow/FicheDemandeValidation";
import { EcranDaf } from "@/ecrans/daf/EcranDaf";
import { EcranDroits } from "@/ecrans/droits/EcranDroits";
import { ListeDossiersCnps } from "@/ecrans/cnps/ListeDossiersCnps";
import { FicheDossierCnps } from "@/ecrans/cnps/FicheDossierCnps";
import { ListeComptesRendus } from "@/ecrans/comptesrendus/ListeComptesRendus";
import { NouveauCompteRendu } from "@/ecrans/comptesrendus/NouveauCompteRendu";
import { FicheCompteRendu } from "@/ecrans/comptesrendus/FicheCompteRendu";
import { EcranRelances } from "@/ecrans/relances/EcranRelances";
import { AccueilSelonRole } from "@/app/AccueilSelonRole";
import { TableauBordPca } from "@/ecrans/tableauxdebord/TableauBordPca";
import { TableauBordDg } from "@/ecrans/tableauxdebord/TableauBordDg";
import { TableauBordDga } from "@/ecrans/tableauxdebord/TableauBordDga";
import { TableauBordDaf } from "@/ecrans/tableauxdebord/TableauBordDaf";
import { TableauBordGestionnaire } from "@/ecrans/tableauxdebord/TableauBordGestionnaire";
import { TableauBordSuperAdmin } from "@/ecrans/tableauxdebord/TableauBordSuperAdmin";
import { EcranRapportsDaf } from "@/ecrans/rapports/EcranRapportsDaf";
import { EcranAudit } from "@/ecrans/audit/EcranAudit";
import { EcranAdministration } from "@/ecrans/administration/EcranAdministration";

/**
 * Catalogue du design system : outil de développement, pas un écran métier.
 * `import.meta.env.DEV` est remplacé par `false` au build de production — la
 * route et son module disparaissent du paquet livré.
 */
const CatalogueDesignSystem = import.meta.env.DEV
  ? lazy(() =>
      import("@/ecrans/designsystem/CatalogueDesignSystem").then((module) => ({
        default: module.CatalogueDesignSystem,
      })),
    )
  : null;

/**
 * Déclaration des routes de l'application. Une route protégée est toujours
 * enveloppée par `<GardeRoute>`, avec la permission exacte du contrat API
 * (`COSITI_Backend/docs/03_SPECIFICATIONS_API.md`) quand elle est documentée.
 *
 * Étendu jalon après jalon : J1 (connexion), J2 (adhérents), J3
 * (organisation terrain), J4 (cotisations), J5 (contrôle DAF), J6 (droits et
 * régularité), J7 (CNPS et documents), J8 (relances et comptes rendus), J9 (les six tableaux de bord), J10 (rapports, exports, audit), J11 (administration).
 */
export function RoutesApplication() {
  return (
    <Routes>
      <Route path="/connexion" element={<EcranConnexion />} />
      <Route
        path="/mot-de-passe/changer"
        element={
          <GardeRoute>
            <EcranChangerMotDePasse />
          </GardeRoute>
        }
      />
      <Route
        path="/"
        element={
          <GardeRoute>
            <AccueilSelonRole />
          </GardeRoute>
        }
      />

      {/* Six tableaux de bord, pas un de plus : ni le Chef des agents de terrain
          ni l'Agent de terrain n'en ont un (Roles des acteurs.md §16). */}
      <Route
        path="/tableaux-de-bord/pca"
        element={
          <GardeRoute permission="TABLEAU_BORD:PCA">
            <TableauBordPca />
          </GardeRoute>
        }
      />
      <Route
        path="/tableaux-de-bord/dg"
        element={
          <GardeRoute permission="TABLEAU_BORD:DG">
            <TableauBordDg />
          </GardeRoute>
        }
      />
      <Route
        path="/tableaux-de-bord/dga"
        element={
          <GardeRoute permission="TABLEAU_BORD:DGA">
            <TableauBordDga />
          </GardeRoute>
        }
      />
      <Route
        path="/tableaux-de-bord/daf"
        element={
          <GardeRoute permission="TABLEAU_BORD:DAF">
            <TableauBordDaf />
          </GardeRoute>
        }
      />
      <Route
        path="/tableaux-de-bord/gestionnaire"
        element={
          <GardeRoute permission="TABLEAU_BORD:GESTIONNAIRE">
            <TableauBordGestionnaire />
          </GardeRoute>
        }
      />
      <Route
        path="/tableaux-de-bord/super-admin"
        element={
          <GardeRoute permission="TABLEAU_BORD:SUPER_ADMIN">
            <TableauBordSuperAdmin />
          </GardeRoute>
        }
      />

      <Route
        path="/adherents"
        element={
          <GardeRoute permission="ADHERENT:LIRE">
            <ListeAdherents />
          </GardeRoute>
        }
      />
      <Route
        path="/adherents/nouveau"
        element={
          <GardeRoute permission="ADHERENT:CREER">
            <NouvelAdherent />
          </GardeRoute>
        }
      />
      <Route
        path="/adherents/:id"
        element={
          <GardeRoute permission="ADHERENT:LIRE">
            <FicheAdherent />
          </GardeRoute>
        }
      />

      <Route
        path="/organisation"
        element={
          <GardeRoute permission="ORGANISATION:LIRE">
            <EcranOrganisation />
          </GardeRoute>
        }
      />

      {/* Module « Gestion des agents de terrain » : ouvert à tout rôle portant ORGANISATION:LIRE
          (PCA, DG, DGA, DAF, Gestionnaire, Chef, Agent) — actions filtrées dans les écrans. */}
      <Route
        path="/agents"
        element={
          <GardeRoute permission="ORGANISATION:LIRE">
            <ListeAgentsTerrain />
          </GardeRoute>
        }
      />
      <Route
        path="/agents/:id"
        element={
          <GardeRoute permission="ORGANISATION:LIRE">
            <FicheAgentTerrain />
          </GardeRoute>
        }
      />

      <Route
        path="/cotisations"
        element={
          <GardeRoute permission="PAIEMENT:LIRE">
            <JournalCotisations />
          </GardeRoute>
        }
      />
      <Route
        path="/cotisations/nouveau"
        element={
          <GardeRoute permission="PAIEMENT:CREER">
            <NouveauPaiement />
          </GardeRoute>
        }
      />
      {/* Workflow de correction, validation et traçabilité (V19) : la liste et le détail sont filtrés par le
          serveur selon le périmètre et les permissions de lecture de chaque module. */}
      <Route
        path="/validations"
        element={
          <GardeRoute permission="ADHERENT:LIRE">
            <EcranCentreValidation />
          </GardeRoute>
        }
      />
      <Route
        path="/validations/:id"
        element={
          <GardeRoute permission="ADHERENT:LIRE">
            <FicheDemandeValidation />
          </GardeRoute>
        }
      />

      {/* Parcours d'adhésion (V20) : contrôle documentaire DGA (lecture PCA, DG, DGA, Gestionnaire) et frais
          d'adhésion (lecture PCA, DG, DGA, DAF, Gestionnaire). Les actions sont décidées par le serveur. */}
      <Route
        path="/controles-dga"
        element={
          <GardeRoute permission="CONTROLE_DGA:LIRE">
            <EcranFileControleDga />
          </GardeRoute>
        }
      />
      <Route
        path="/controles-dga/:id"
        element={
          <GardeRoute permission="CONTROLE_DGA:LIRE">
            <EcranControleDga />
          </GardeRoute>
        }
      />
      {/* Ouverture d'un objet notifié qui n'a pas d'écran propre : résolu puis redirigé vers l'écran où agir. */}
      <Route
        path="/frais-adhesion/:id"
        element={
          <GardeRoute permission="ADHERENT:LIRE">
            <OuvertureFraisAdhesion />
          </GardeRoute>
        }
      />
      <Route
        path="/bilans-caisse/ouvrir/:id"
        element={
          <GardeRoute permission="BILAN_CAISSE:LIRE">
            <OuvertureBilanCaisse />
          </GardeRoute>
        }
      />
      {/* Règles en attente de validation (V21) : lecture ADMINISTRATION:LIRE ou REGLE:VALIDER, décision PCA. */}
      <Route
        path="/regles"
        element={
          <GardeRoute unePermissionParmi={["ADMINISTRATION:LIRE", "REGLE:VALIDER"]}>
            <EcranRegles />
          </GardeRoute>
        }
      />
      <Route
        path="/frais-adhesion"
        element={
          <GardeRoute permission="FRAIS_ADHESION:LIRE">
            <EcranFraisAdhesion />
          </GardeRoute>
        }
      />

      {/* Module cotisations #29 à #33 — lecture PCA, DG, DGA, DAF, Gestionnaire (V18). */}
      <Route
        path="/bilans-caisse"
        element={
          <GardeRoute permission="BILAN_CAISSE:LIRE">
            <EcranBilanCaisse />
          </GardeRoute>
        }
      />
      <Route
        path="/cotisations/:id"
        element={
          <GardeRoute permission="PAIEMENT:LIRE">
            <DetailPaiement />
          </GardeRoute>
        }
      />

      <Route
        path="/daf"
        element={
          <GardeRoute permission="PAIEMENT:LIRE">
            <EcranDaf />
          </GardeRoute>
        }
      />

      <Route
        path="/droits"
        element={
          <GardeRoute permission="DROITS:LIRE">
            <EcranDroits />
          </GardeRoute>
        }
      />

      <Route
        path="/cnps"
        element={
          <GardeRoute permission="CNPS:LIRE">
            <ListeDossiersCnps />
          </GardeRoute>
        }
      />
      <Route
        path="/cnps/:id"
        element={
          <GardeRoute permission="CNPS:LIRE">
            <FicheDossierCnps />
          </GardeRoute>
        }
      />

      <Route
        path="/comptes-rendus"
        element={
          <GardeRoute permission="COMPTE_RENDU:LIRE">
            <ListeComptesRendus />
          </GardeRoute>
        }
      />
      <Route
        path="/comptes-rendus/nouveau"
        element={
          <GardeRoute permission="COMPTE_RENDU:PRODUIRE">
            <NouveauCompteRendu />
          </GardeRoute>
        }
      />
      <Route
        path="/comptes-rendus/:id"
        element={
          <GardeRoute permission="COMPTE_RENDU:LIRE">
            <FicheCompteRendu />
          </GardeRoute>
        }
      />

      <Route
        path="/relances"
        element={
          <GardeRoute permission="RELANCE:LIRE">
            <EcranRelances />
          </GardeRoute>
        }
      />

      <Route
        path="/rapports"
        element={
          <GardeRoute permission="RAPPORT_DAF:LIRE">
            <EcranRapportsDaf />
          </GardeRoute>
        }
      />

      <Route
        path="/audit"
        element={
          <GardeRoute permission="AUDIT:CONSULTER">
            <EcranAudit />
          </GardeRoute>
        }
      />

      <Route
        path="/administration"
        element={
          <GardeRoute permission="ADMINISTRATION:LIRE">
            <EcranAdministration />
          </GardeRoute>
        }
      />

      {CatalogueDesignSystem && (
        <Route
          path="/design-system"
          element={
            <GardeRoute>
              <Suspense fallback={null}>
                <CatalogueDesignSystem />
              </Suspense>
            </GardeRoute>
          }
        />
      )}

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
