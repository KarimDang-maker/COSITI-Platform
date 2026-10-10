import { Clock, FileHeart, FileText, ClipboardCheck, UserCheck } from "lucide-react";
import { CadreTableauBord } from "@/ecrans/tableauxdebord/CadreTableauBord";
import { CarteSection } from "@/components/cositi/carte-section";
import { ListeElements, type ElementListe } from "@/components/cositi/liste-elements";
import { useTableauBordGestionnaire } from "@/hooks/useTableauxDeBord";
import { usePeriodeTableauBord } from "@/hooks/usePeriodeTableauBord";
import { useResumeParcours } from "@/hooks/useParcoursCnps";
import { usePermission } from "@/auth/ContexteAuth";
import { formaterNombre } from "@/lib/format";

/** `/tableaux-de-bord/gestionnaire` — Adhérents, CNPS et remontées terrain (UC-GC-01). */
export function TableauBordGestionnaire() {
  const periode = usePeriodeTableauBord();
  const { data, isLoading, isError, error } = useTableauBordGestionnaire(periode.filtres);

  // Parcours CNPS en direct : compteurs du serveur, chaque ligne ouvre la liste filtrée de `/cnps/parcours`.
  const peutLireCnps = usePermission("CNPS:LIRE");
  const parcours = useResumeParcours(undefined, peutLireCnps);
  const raccourcisParcours: ElementListe[] = parcours.data
    ? [
        {
          cle: "parcours-a-preimmatriculer",
          icone: UserCheck,
          titre: "À préimmatriculer",
          valeur: formaterNombre(parcours.data.aPreimmatriculer),
          chemin: "/cnps/parcours?filtre=A_PREIMMATRICULER",
        },
        {
          cle: "parcours-en-retard",
          icone: Clock,
          titre: "Préimmatriculations en retard",
          valeur: formaterNombre(parcours.data.enRetard),
          chemin: "/cnps/parcours?filtre=EN_RETARD",
        },
        {
          cle: "parcours-delai-depot",
          icone: FileHeart,
          titre: "Dossiers à déposer au CPS",
          valeur: formaterNombre(parcours.data.delaiDepotEnCours),
          chemin: "/cnps/parcours?filtre=DELAI_DEPOT",
        },
      ]
    : [];

  const raccourcis: ElementListe[] = data
    ? [
        ...raccourcisParcours,
        {
          cle: "cnps-incomplets",
          icone: FileHeart,
          titre: "Dossiers CNPS incomplets",
          valeur: formaterNombre(data.dossiersCnpsIncomplets),
          chemin: "/cnps",
        },
        {
          cle: "eligibles",
          icone: UserCheck,
          titre: "Éligibles non immatriculés",
          valeur: formaterNombre(data.eligiblesNonImmatricules),
          chemin: "/cnps?onglet=eligibles",
        },
        {
          cle: "declarations",
          icone: FileText,
          titre: "Déclarations à produire",
          valeur: formaterNombre(data.declarationsAProduire),
          chemin: "/cnps",
        },
        {
          cle: "comptes-rendus",
          icone: ClipboardCheck,
          titre: "Comptes rendus à contrôler",
          valeur: formaterNombre(data.comptesRendusAControler),
          chemin: "/comptes-rendus",
        },
        {
          cle: "retards",
          icone: Clock,
          titre: "Adhérents en retard",
          valeur: formaterNombre(data.adherentsEnRetard),
          chemin: "/droits",
        },
      ]
    : [];

  return (
    <CadreTableauBord
      titre="Tableau de bord — Gestionnaire des comptes"
      sousTitre="Adhérents, dossiers CNPS, déclarations et remontées du terrain."
      chargement={isLoading}
      enErreur={isError}
      erreur={error}
      indicateurs={data?.indicateurs}
      clePrincipale="tauxActivation"
      alertes={data?.alertes}
      avertissements={data?.avertissements}
      periode={periode}
    >
      {data && (
        <CarteSection titre="Mon travail en attente" description="Chaque ligne ouvre l'écran qui traite le sujet.">
          <ListeElements libelle="Mon travail en attente" elements={raccourcis} />
        </CarteSection>
      )}
    </CadreTableauBord>
  );
}
