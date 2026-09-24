import { useMemo, useState } from "react";
import { Link, useSearchParams } from "react-router";
import { CoquilleApplication } from "@/components/cositi/coquille-application";
import { EtatVide } from "@/components/cositi/etat-vide";
import { Alerte } from "@/components/cositi/alerte";
import { SqueletteTableau } from "@/components/cositi/squelette-tableau";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useDossiersPrestation, useSituationsImmatriculation } from "@/hooks/useCnps";
import { useRetardataires } from "@/hooks/useDroits";
import { estErreurApi } from "@/api/erreurs";
import { formaterMatricule, formaterMontant } from "@/lib/format";
import { cn } from "@/lib/utils";
import { DEFINITIONS_RUBRIQUE } from "@/components/cositi/cnps/carte-rubrique-cnps";

type Onglet = "toutes" | "retard" | "seuil" | "cycle" | "dossiers";

interface CarteAlerte {
  readonly id: string;
  readonly categorie: Exclude<Onglet, "toutes">;
  readonly matricule: string;
  readonly titre: string;
  readonly description: string;
  readonly chemin: string;
  readonly libelleAction: string;
}

/**
 * `/alertes` — Centre d'Alertes Administratives COSITI (module Gestionnaire des comptes, 5 onglets,
 * `Conception/Gestionaires de comptes/FONCTIONALITE_GestComtes_V1.md` §3-§6).
 *
 * Compose 3 requêtes réelles déjà existantes — jamais un `GET /alertes` unique inventé :
 *  - `GET /droits/retardataires` → adhérents non à jour ;
 *  - `GET /cnps/immatriculations` → seuil atteint (non immatriculé) et cycle 15/30 (cf. hypothèse `[A]`
 *    documentée sur `EcranImmatriculations.tsx` : faute de date de contrôle bimensuel tracée côté
 *    backend, cet onglet reprend l'ensemble des situations suivies par le mécanisme de seuil) ;
 *  - `GET /cnps/dossiers-prestation?statut=INCOMPLET` → dossiers allocations incomplets.
 *
 * Le niveau de priorité (ATTENTION/URGENT) n'est fourni par aucun de ces DTO : plutôt que de l'inventer
 * côté client, aucune pastille de priorité n'est affichée — seul le libellé de la carte porte l'information.
 */
export function EcranAlertes() {
  const [parametresUrl, definirParametres] = useSearchParams();
  const onglet = (parametresUrl.get("onglet") as Onglet | null) ?? "toutes";
  const [recherche, setRecherche] = useState("");

  const retardataires = useRetardataires({ taille: 100 });
  const situations = useSituationsImmatriculation();
  const dossiersIncomplets = useDossiersPrestation({ statut: "INCOMPLET", taille: 100 });

  const chargement = retardataires.isLoading || situations.isLoading || dossiersIncomplets.isLoading;
  const enErreur = retardataires.isError || situations.isError || dossiersIncomplets.isError;

  const cartes = useMemo<CarteAlerte[]>(() => {
    const resultat: CarteAlerte[] = [];

    for (const r of retardataires.data?.contenu ?? []) {
      resultat.push({
        id: `retard-${r.adherentId}`,
        categorie: "retard",
        matricule: r.matricule,
        titre: `Adhérent non à jour : ${r.nomComplet}`,
        description: `Cet adhérent n'est pas à jour de ses cotisations (${r.joursRetard} jour(s) de retard).`,
        chemin: `/adherents/${r.adherentId}`,
        libelleAction: "Traiter l'alerte",
      });
    }

    for (const s of situations.data ?? []) {
      if (!s.numeroCnps) {
        resultat.push({
          id: `seuil-${s.adherentId}`,
          categorie: "seuil",
          matricule: s.matricule,
          titre: `Seuil CNPS atteint : ${s.nomComplet}`,
          description: `L'adhérent ${formaterMatricule(s.matricule)} (${s.nomComplet}) a atteint ${formaterMontant(s.cumulCotise)} de cotisations. Veuillez procéder à son immatriculation CNPS.`,
          chemin: `/immatriculations?recherche=${encodeURIComponent(s.matricule)}`,
          libelleAction: "Traiter l'alerte",
        });
      }
      resultat.push({
        id: `cycle-${s.adherentId}`,
        categorie: "cycle",
        matricule: s.matricule,
        titre: `Vérification périodique (cycle 15/30) : ${s.nomComplet}`,
        description: s.numeroCnps
          ? `Cet adhérent est immatriculé (${s.numeroCnps}) — vérification de sa situation au contrôle bimensuel.`
          : `Cet adhérent a atteint le seuil de cotisation requis et doit être immatriculé.`,
        chemin: `/immatriculations?recherche=${encodeURIComponent(s.matricule)}`,
        libelleAction: "Traiter l'alerte",
      });
    }

    for (const d of dossiersIncomplets.data?.contenu ?? []) {
      resultat.push({
        id: `dossier-${d.id}`,
        categorie: "dossiers",
        matricule: d.adherentMatricule ?? "",
        titre: `Dossier ${DEFINITIONS_RUBRIQUE[d.rubrique].libelle} : ${d.adherentNomComplet ?? d.adherentMatricule}`,
        description: `Ce dossier (${d.offreLibelle}) est incomplet et nécessite une action.`,
        chemin: `/dossiers-cnps/${d.id}`,
        libelleAction: "Traiter l'alerte",
      });
    }

    return resultat;
  }, [retardataires.data, situations.data, dossiersIncomplets.data]);

  const filtre = recherche.trim().toLowerCase();
  const cartesFiltrees = cartes
    .filter((c) => onglet === "toutes" || c.categorie === onglet)
    .filter(
      (c) =>
        !filtre ||
        c.matricule.toLowerCase().includes(filtre) ||
        c.titre.toLowerCase().includes(filtre) ||
        c.description.toLowerCase().includes(filtre),
    );

  const comptes: Record<Onglet, number> = {
    toutes: cartes.length,
    retard: cartes.filter((c) => c.categorie === "retard").length,
    seuil: cartes.filter((c) => c.categorie === "seuil").length,
    cycle: cartes.filter((c) => c.categorie === "cycle").length,
    dossiers: cartes.filter((c) => c.categorie === "dossiers").length,
  };

  function changerOnglet(valeur: string) {
    const suivants = new URLSearchParams(parametresUrl);
    suivants.set("onglet", valeur);
    definirParametres(suivants, { replace: true });
  }

  return (
    <CoquilleApplication titre="Alertes">
      <div className="space-y-6">
        <div>
          <h1>Centre d'Alertes Administratives COSITI</h1>
          <p className="text-texte-doux">
            Surveillance automatique des retards, seuils d'immatriculation, contrôles du 15 &amp; 30 et
            dossiers incomplets. {cartes.length} alerte(s) active(s).
          </p>
        </div>

        <Tabs value={onglet} onValueChange={changerOnglet}>
          <TabsList className="flex-wrap">
            <TabsTrigger value="toutes">Toutes ({comptes.toutes})</TabsTrigger>
            <TabsTrigger value="retard">Adhérents non à jour ({comptes.retard})</TabsTrigger>
            <TabsTrigger value="seuil">Seuil CNPS atteint ({comptes.seuil})</TabsTrigger>
            <TabsTrigger value="cycle">Cycle vérification 15/30 ({comptes.cycle})</TabsTrigger>
            <TabsTrigger value="dossiers">Dossiers Allocations ({comptes.dossiers})</TabsTrigger>
          </TabsList>

          <div className="mt-4 max-w-sm">
            <Input
              placeholder="Filtrer par nom, matricule ou motif…"
              value={recherche}
              onChange={(evenement) => setRecherche(evenement.target.value)}
            />
          </div>

          <TabsContent value={onglet} className="mt-4 space-y-3">
            {chargement && <SqueletteTableau colonnes={1} />}
            {enErreur && (
              <Alerte teinte="danger" titre="Impossible de charger les alertes">
                <p>
                  {estErreurApi(retardataires.error)
                    ? retardataires.error.message
                    : estErreurApi(situations.error)
                      ? situations.error.message
                      : estErreurApi(dossiersIncomplets.error)
                        ? dossiersIncomplets.error.message
                        : "Une erreur inattendue est survenue."}
                </p>
              </Alerte>
            )}
            {!chargement && !enErreur && cartesFiltrees.length === 0 && (
              <EtatVide titre="Aucun point nécessitant attention." />
            )}
            {cartesFiltrees.map((carte) => (
              <div
                key={carte.id}
                className={cn(
                  "flex flex-wrap items-center justify-between gap-3 rounded-lg border border-bordure bg-surface p-4",
                )}
              >
                <div className="space-y-1">
                  <span className="ref text-xs text-texte-doux">{formaterMatricule(carte.matricule)}</span>
                  <p className="font-semibold text-texte">{carte.titre}</p>
                  <p className="text-sm text-texte-doux">{carte.description}</p>
                </div>
                <Button variant="outline" size="sm" asChild>
                  <Link to={carte.chemin}>{carte.libelleAction} →</Link>
                </Button>
              </div>
            ))}
          </TabsContent>
        </Tabs>
      </div>
    </CoquilleApplication>
  );
}
