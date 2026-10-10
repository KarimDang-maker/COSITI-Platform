import { useQuery } from "@tanstack/react-query";
import { Link, Navigate, useParams } from "react-router";
import { CoquilleApplication } from "@/components/cositi/coquille-application";
import { Alerte } from "@/components/cositi/alerte";
import { Skeleton } from "@/components/ui/skeleton";
import { obtenirFraisAdhesion } from "@/api/adhesion";
import { listerBilansCaisse } from "@/api/bilansCaisse";
import { estErreurApi } from "@/api/erreurs";

function Attente({ titre }: { titre: string }) {
  return (
    <CoquilleApplication titre={titre}>
      <div className="space-y-3" role="status" aria-label="Ouverture en cours">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-32 w-full" />
      </div>
    </CoquilleApplication>
  );
}

function Introuvable({ titre, message, retour }: { titre: string; message: string; retour: { libelle: string; chemin: string } }) {
  return (
    <CoquilleApplication titre={titre}>
      <Alerte teinte="danger" titre="Ouverture impossible">
        <p>{message}</p>
        <Link className="mt-2 inline-block font-semibold text-primaire underline underline-offset-2" to={retour.chemin}>
          {retour.libelle}
        </Link>
      </Alerte>
    </CoquilleApplication>
  );
}

/**
 * `/frais-adhesion/:id` — ouverture d'un frais notifié (écart, anomalie). Un frais n'a pas d'écran propre : on
 * ouvre l'onglet « Adhésion » de l'adhérent, où se trouvent le frais et les actions du DAF.
 */
export function OuvertureFraisAdhesion() {
  const { id } = useParams<{ id: string }>();
  const frais = useQuery({ queryKey: ["adhesion", "frais-detail", id], queryFn: () => obtenirFraisAdhesion(id!), enabled: !!id });

  if (frais.isLoading) return <Attente titre="Frais d'adhésion" />;
  if (frais.isError || !frais.data) {
    return (
      <Introuvable
        titre="Frais d'adhésion"
        message={estErreurApi(frais.error) ? frais.error.message : "Ce frais d'adhésion est introuvable ou hors de votre périmètre."}
        retour={{ libelle: "Voir la liste des frais", chemin: "/frais-adhesion" }}
      />
    );
  }
  return <Navigate replace to={`/adherents/${frais.data.adherentId}?onglet=adhesion`} />;
}

/**
 * `/bilans-caisse/ouvrir/:id` — ouverture d'un bilan notifié (écart, validation, anomalie). L'écran du bilan est
 * indexé par date : la date du bilan est relue dans la liste servie par l'API, sans rien déduire du texte.
 */
export function OuvertureBilanCaisse() {
  const { id } = useParams<{ id: string }>();
  const bilans = useQuery({ queryKey: ["bilans-caisse", "ouverture", id], queryFn: () => listerBilansCaisse({ taille: 200 }), enabled: !!id });

  if (bilans.isLoading) return <Attente titre="Bilan de caisse" />;
  const bilan = bilans.data?.contenu.find((b) => b.id === id);
  if (bilans.isError || !bilan) {
    return (
      <Introuvable
        titre="Bilan de caisse"
        message={estErreurApi(bilans.error) ? bilans.error.message : "Ce bilan de caisse est introuvable dans les bilans récents."}
        retour={{ libelle: "Ouvrir le bilan de caisse", chemin: "/bilans-caisse" }}
      />
    );
  }
  return <Navigate replace to={`/bilans-caisse?date=${bilan.date}`} />;
}
