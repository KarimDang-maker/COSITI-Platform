import { useState } from "react";
import { useNavigate, useParams, useSearchParams } from "react-router";
import { Archive, Copy, PencilLine, RefreshCcw } from "lucide-react";
import { toast } from "sonner";
import { CoquilleApplication } from "@/components/cositi/coquille-application";
import { EnTetePage } from "@/components/cositi/entete-page";
import { CarteSection } from "@/components/cositi/carte-section";
import { Alerte } from "@/components/cositi/alerte";
import { BadgeStatut } from "@/components/cositi/badge-statut";
import { DialogueConfirmation } from "@/components/cositi/dialogue-confirmation";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useAdherent, useArchiverAdherent, useActivites } from "@/hooks/useAdherents";
import { usePermission } from "@/auth/ContexteAuth";
import { estErreurApi } from "@/api/erreurs";
import type { Adherent } from "@/api/adherents";
import { formaterDate, formaterMatricule, formaterNomComplet } from "@/lib/format";
import { LigneChamp } from "@/ecrans/adherents/fiche/LigneChamp";
import { BlocDossier } from "@/ecrans/adherents/fiche/BlocDossier";
import { CarteCoordonnees } from "@/ecrans/adherents/fiche/CarteCoordonnees";
import { CarteProfessionnel } from "@/ecrans/adherents/fiche/CarteProfessionnel";
import { CarteAgentResponsable } from "@/ecrans/adherents/fiche/CarteAgentResponsable";
import { DialogueModifierIdentite } from "@/ecrans/adherents/fiche/DialogueModifierIdentite";
import { DialogueChangerStatut } from "@/ecrans/adherents/fiche/DialogueChangerStatut";
import { OngletCotisations } from "@/ecrans/adherents/fiche/OngletCotisations";
import { OngletCnps } from "@/ecrans/adherents/fiche/OngletCnps";
import { OngletDocuments } from "@/ecrans/adherents/fiche/OngletDocuments";
import { OngletHistorique } from "@/ecrans/adherents/fiche/OngletHistorique";

type Onglet = "profil" | "professionnel" | "cotisations" | "cnps" | "documents" | "historique";

/**
 * Fiche adhérent (#12). L'en-tête garde visibles le nom, le matricule, le statut et les actions
 * autorisées ; le contenu est réparti en onglets, chacun affiché selon les permissions renvoyées par
 * `GET /auth/moi`. Masquer un onglet est un confort : l'API refuse de toute façon ce qui n'est pas permis.
 */
export function FicheAdherent() {
  const { id } = useParams<{ id: string }>();
  const { data: adherent, isLoading, isError, error } = useAdherent(id);

  if (isLoading) {
    return (
      <CoquilleApplication titre="Fiche adhérent">
        <div className="space-y-6">
          <Skeleton className="h-8 w-64" />
          <Skeleton className="h-40 w-full" />
        </div>
      </CoquilleApplication>
    );
  }

  if (isError || !adherent) {
    const introuvable = estErreurApi(error) && (error.statut === 404 || error.statut === 403);
    return (
      <CoquilleApplication titre="Fiche adhérent">
        <Alerte teinte="danger" titre={introuvable ? "Adhérent introuvable" : "Impossible de charger cet adhérent"}>
          <p>
            {introuvable
              ? "Cet adhérent n'existe pas ou ne fait pas partie de votre périmètre."
              : estErreurApi(error)
                ? error.message
                : "Une erreur inattendue est survenue."}
          </p>
        </Alerte>
      </CoquilleApplication>
    );
  }

  return <ContenuFiche adherent={adherent} />;
}

function ContenuFiche({ adherent }: { adherent: Adherent }) {
  const navigate = useNavigate();
  const [parametres, definirParametres] = useSearchParams();

  const peutModifier = usePermission("ADHERENT:MODIFIER");
  const peutChangerStatut = usePermission("ADHERENT:CHANGER_STATUT");
  const peutArchiver = usePermission("ADHERENT:ARCHIVER");
  const peutAffecter = usePermission("ORGANISATION:AFFECTER_PORTEFEUILLE");
  const peutLireDroits = usePermission("DROITS:LIRE");
  const peutLirePaiements = usePermission("PAIEMENT:LIRE");
  const peutLireCnps = usePermission("CNPS:LIRE");
  const peutGererCnps = usePermission("CNPS:GERER");
  const peutLireDocuments = usePermission("DOCUMENT:LIRE");
  const peutTeleverser = usePermission("DOCUMENT:TELEVERSER");
  const peutVerifierDocuments = usePermission("DOCUMENT:VERIFIER");
  // `GET /adherents/{id}/resume-cotisations` compose la situation de droits et le journal des paiements.
  const peutLireResume = peutLireDroits && peutLirePaiements;

  const { data: activites } = useActivites();
  const archiver = useArchiverAdherent(adherent.id);
  const [identiteOuverte, setIdentiteOuverte] = useState(false);
  const [statutOuvert, setStatutOuvert] = useState(false);
  const [archivageOuvert, setArchivageOuvert] = useState(false);

  const nom = formaterNomComplet(adherent.nom, adherent.prenoms);
  const matricule = formaterMatricule(adherent.matricule);

  const ongletsVisibles: Onglet[] = [
    "profil",
    "professionnel",
    ...(peutLireDroits || peutLirePaiements ? (["cotisations"] as const) : []),
    ...(peutLireResume || peutLireCnps ? (["cnps"] as const) : []),
    ...(peutLireDocuments ? (["documents"] as const) : []),
    "historique",
  ];
  const ongletDemande = parametres.get("onglet") as Onglet | null;
  const onglet: Onglet = ongletDemande && ongletsVisibles.includes(ongletDemande) ? ongletDemande : "profil";

  function changerOnglet(valeur: string) {
    definirParametres(
      (precedents) => {
        const suivants = new URLSearchParams(precedents);
        if (valeur === "profil") suivants.delete("onglet");
        else suivants.set("onglet", valeur);
        return suivants;
      },
      { replace: true },
    );
  }

  async function copierMatricule() {
    try {
      await navigator.clipboard.writeText(adherent.matricule);
      toast.success(`Matricule ${matricule} copié.`);
    } catch {
      toast.error("La copie n'est pas disponible dans ce navigateur.");
    }
  }

  const activite = activites?.find((a) => a.id === adherent.activiteId);

  return (
    <CoquilleApplication titre="Fiche adhérent">
      <div className="space-y-6">
        {/* Le dernier maillon reste générique : le nom est déjà porté par le titre, le répéter
            dans le fil d'Ariane doublerait le texte pour les lecteurs d'écran. */}
        <div className="sticky top-0 z-20 -mx-4 bg-fond/95 px-4 py-3 backdrop-blur sm:-mx-6 sm:px-6">
          <EnTetePage
            titre={nom}
            description={
              <span className="inline-flex items-center gap-2">
                <span className="ref">{matricule}</span>
                <Button size="icon-xs" variant="ghost" onClick={() => void copierMatricule()} aria-label="Copier le matricule">
                  <Copy aria-hidden="true" />
                </Button>
                {adherent.archive && <span className="font-semibold text-danger-fort">Archivé</span>}
              </span>
            }
            statut={<BadgeStatut domaine="adherent" code={adherent.statut} />}
            filAriane={[{ libelle: "Adhérents", chemin: "/adherents" }, { libelle: "Fiche adhérent" }]}
            actions={
              <>
                {peutModifier && (
                  <Button variant="outline" onClick={() => setIdentiteOuverte(true)}>
                    <PencilLine className="size-4" aria-hidden="true" />
                    Modifier l'identité
                  </Button>
                )}
                {peutChangerStatut && (
                  <Button variant="outline" onClick={() => setStatutOuvert(true)}>
                    <RefreshCcw className="size-4" aria-hidden="true" />
                    Changer le statut
                  </Button>
                )}
                {peutArchiver && !adherent.archive && (
                  <Button variant="outline" onClick={() => setArchivageOuvert(true)}>
                    <Archive className="size-4" aria-hidden="true" />
                    Archiver
                  </Button>
                )}
              </>
            }
          />
        </div>

        <Tabs value={onglet} onValueChange={changerOnglet}>
          <TabsList className="flex-wrap">
            <TabsTrigger value="profil">Profil</TabsTrigger>
            <TabsTrigger value="professionnel">Professionnel</TabsTrigger>
            {ongletsVisibles.includes("cotisations") && <TabsTrigger value="cotisations">Cotisations</TabsTrigger>}
            {ongletsVisibles.includes("cnps") && <TabsTrigger value="cnps">CNPS</TabsTrigger>}
            {ongletsVisibles.includes("documents") && <TabsTrigger value="documents">Documents</TabsTrigger>}
            <TabsTrigger value="historique">Historique</TabsTrigger>
          </TabsList>

          <TabsContent value="profil" className="space-y-6">
            <BlocDossier
              adherentId={adherent.id}
              peutModifier={peutModifier}
              onVoirDocuments={peutLireDocuments ? () => changerOnglet("documents") : undefined}
            />
            <CarteSection titre="Identité">
              <dl className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                <LigneChamp libelle="Nom complet" valeur={nom} />
                <LigneChamp libelle="Date de naissance" valeur={formaterDate(adherent.dateNaissance)} />
                <LigneChamp libelle="Sexe" valeur={adherent.sexe === "F" ? "Féminin" : adherent.sexe === "M" ? "Masculin" : "—"} />
                <LigneChamp libelle="Zone" valeur={adherent.zoneLibelle ?? "—"} />
                <LigneChamp libelle="Activité" valeur={activite?.libelle ?? "—"} />
                <LigneChamp libelle="Date d'adhésion" valeur={formaterDate(adherent.dateAdhesion)} />
                <LigneChamp libelle="Frais d'inscription" valeur={adherent.inscriptionPayee ? "Payés" : "Non payés"} />
              </dl>
            </CarteSection>
            <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
              <CarteCoordonnees adherentId={adherent.id} peutModifier={peutModifier} />
              <CarteAgentResponsable adherentId={adherent.id} nomAdherent={nom} peutAffecter={peutAffecter} />
            </div>
          </TabsContent>

          <TabsContent value="professionnel">
            {onglet === "professionnel" && <CarteProfessionnel adherentId={adherent.id} peutModifier={peutModifier} />}
          </TabsContent>

          {ongletsVisibles.includes("cotisations") && (
            <TabsContent value="cotisations">
              {onglet === "cotisations" && (
                <OngletCotisations
                  adherentId={adherent.id}
                  peutLireResume={peutLireResume}
                  peutLireDroits={peutLireDroits}
                  peutLirePaiements={peutLirePaiements}
                />
              )}
            </TabsContent>
          )}

          {ongletsVisibles.includes("cnps") && (
            <TabsContent value="cnps">
              {onglet === "cnps" && (
                <OngletCnps
                  adherentId={adherent.id}
                  nomAdherent={nom}
                  peutLireResume={peutLireResume}
                  peutLireCnps={peutLireCnps}
                  peutGererCnps={peutGererCnps}
                />
              )}
            </TabsContent>
          )}

          {ongletsVisibles.includes("documents") && (
            <TabsContent value="documents">
              {onglet === "documents" && (
                <OngletDocuments adherentId={adherent.id} peutTeleverser={peutTeleverser} peutVerifier={peutVerifierDocuments} />
              )}
            </TabsContent>
          )}

          <TabsContent value="historique">{onglet === "historique" && <OngletHistorique adherentId={adherent.id} />}</TabsContent>
        </Tabs>
      </div>

      {peutModifier && <DialogueModifierIdentite adherent={adherent} ouvert={identiteOuverte} onOuvertChange={setIdentiteOuverte} />}
      {peutChangerStatut && (
        <DialogueChangerStatut
          adherentId={adherent.id}
          nomAdherent={nom}
          statutActuel={adherent.statut}
          ouvert={statutOuvert}
          onOuvertChange={setStatutOuvert}
        />
      )}
      {peutArchiver && (
        <DialogueConfirmation
          ouvert={archivageOuvert}
          onOuvertChange={setArchivageOuvert}
          titre="Archiver l'adhérent"
          description={
            <p>
              Archiver <strong>{nom}</strong> (<span className="ref">{matricule}</span>) ? L'adhérent n'apparaîtra plus
              dans les listes ; son historique est conservé. Aucune donnée n'est supprimée.
            </p>
          }
          motifRequis
          libelleMotif="Motif de l'archivage"
          varianteDestructive
          libelleConfirmation="Archiver"
          enCours={archiver.isPending}
          onConfirmer={async (motif) => {
            try {
              await archiver.mutateAsync(motif ?? "");
              toast.success("Adhérent archivé.");
              setArchivageOuvert(false);
              navigate("/adherents");
            } catch (e) {
              toast.error(estErreurApi(e) ? e.message : "L'archivage a échoué.");
            }
          }}
        />
      )}
    </CoquilleApplication>
  );
}
