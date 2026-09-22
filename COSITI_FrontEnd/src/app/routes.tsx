import { Navigate, Route, Routes } from "react-router";
import { GardeRoute } from "@/app/GardeRoute";
import { EcranConnexion } from "@/ecrans/connexion/EcranConnexion";
import { EcranChangerMotDePasse } from "@/ecrans/connexion/EcranChangerMotDePasse";
import { ListeAdherents } from "@/ecrans/adherents/ListeAdherents";
import { FicheAdherent } from "@/ecrans/adherents/FicheAdherent";
import { NouvelAdherent } from "@/ecrans/adherents/NouvelAdherent";
import { EcranOrganisation } from "@/ecrans/organisation/EcranOrganisation";
import { JournalCotisations } from "@/ecrans/cotisations/JournalCotisations";
import { NouveauPaiement } from "@/ecrans/cotisations/NouveauPaiement";
import { DetailPaiement } from "@/ecrans/cotisations/DetailPaiement";

/**
 * Déclaration des routes de l'application. Une route protégée est toujours
 * enveloppée par `<GardeRoute>`, avec la permission exacte du contrat API
 * (`COSITI_Backend/docs/03_SPECIFICATIONS_API.md`) quand elle est documentée.
 *
 * Étendu jalon après jalon : J1 (connexion), J2 (adhérents), J3
 * (organisation terrain), J4 (cotisations).
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
            <Navigate to="/adherents" replace />
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
      <Route
        path="/cotisations/:id"
        element={
          <GardeRoute permission="PAIEMENT:LIRE">
            <DetailPaiement />
          </GardeRoute>
        }
      />

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
