import { useState } from "react";
import { useParams } from "react-router";
import { toast } from "sonner";
import { CoquilleApplication } from "@/components/cositi/coquille-application";
import { Alerte } from "@/components/cositi/alerte";
import { AvertissementRegle } from "@/components/cositi/avertissement-regle";
import { BadgeStatut } from "@/components/cositi/badge-statut";
import { EtatVide } from "@/components/cositi/etat-vide";
import { DialogueTeleverserDocument } from "@/components/cositi/dialogue-televerser-document";
import { DialogueConfirmation } from "@/components/cositi/dialogue-confirmation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import {
  useChangerStatutDossier,
  useDeclarationsCnps,
  useDossierCnps,
  usePreparerDeclaration,
  useTransmettreDeclaration,
} from "@/hooks/useCnps";
import { useTelechargerDocument } from "@/hooks/useDocuments";
import { useAjouterPieceCnps } from "@/hooks/useCnps";
import { useAuth } from "@/auth/ContexteAuth";
import { LIBELLES_TYPE_PIECE, type StatutDossierCnps, type TypePieceCnps } from "@/api/cnps";
import { estErreurApi } from "@/api/erreurs";
import { formaterDate, formaterMoisAnnee, formaterMontant, moisCourant } from "@/lib/format";

/**
 * Transitions proposées à l'écran. Le graphe qui fait foi est celui du serveur
 * (`StatutDossierCnps.transitionsAutorisees`) : ce tableau ne sert qu'à ne pas
 * afficher un bouton voué à un 409. Une transition refusée par l'API reste
 * affichée à l'utilisateur telle que l'API la formule (`AGENTS.md` règle 1 :
 * le client masque, il ne décide pas).
 */
const TRANSITIONS: Readonly<Record<StatutDossierCnps, readonly StatutDossierCnps[]>> = {
  BROUILLON: ["INCOMPLET", "PRET"],
  INCOMPLET: ["PRET", "BROUILLON"],
  PRET: ["TRANSMIS", "INCOMPLET"],
  TRANSMIS: ["TRAITE", "REJETE"],
  REJETE: ["INCOMPLET"],
  TRAITE: [],
};

const LIBELLES_TRANSITION: Readonly<Record<StatutDossierCnps, string>> = {
  BROUILLON: "Repasser en brouillon",
  INCOMPLET: "Marquer incomplet",
  PRET: "Déclarer prêt",
  TRANSMIS: "Marquer transmis à la CNPS",
  TRAITE: "Marquer traité",
  REJETE: "Enregistrer un rejet CNPS",
};

/**
 * `/cnps/:id` — Dossier CNPS d'un adhérent (J7) : pièces, cycle de vie du
 * dossier, déclarations mensuelles.
 */
export function FicheDossierCnps() {
  const { id } = useParams<{ id: string }>();
  const { aLaPermission } = useAuth();

  const { data: dossier, isLoading, isError, error } = useDossierCnps(id);
  const { data: declarations } = useDeclarationsCnps(id);
  const ajouterPiece = useAjouterPieceCnps(id ?? "");
  const changerStatut = useChangerStatutDossier(id ?? "");
  const preparerDeclaration = usePreparerDeclaration(id ?? "");
  const transmettre = useTransmettreDeclaration();
  const telecharger = useTelechargerDocument();

  const [pieceEnCours, setPieceEnCours] = useState<TypePieceCnps | null>(null);
  const [transitionEnCours, setTransitionEnCours] = useState<StatutDossierCnps | null>(null);
  const [periode, setPeriode] = useState(moisCourant());

  const peutGerer = aLaPermission("CNPS:GERER");
  const peutChangerStatut = aLaPermission("CNPS:CHANGER_STATUT");
  const peutDeclarer = aLaPermission("CNPS:DECLARER");

  if (isLoading) {
    return (
      <CoquilleApplication titre="Dossier CNPS">
        <div className="space-y-4">
          <Skeleton className="h-8 w-64" />
          <Skeleton className="h-48 w-full" />
        </div>
      </CoquilleApplication>
    );
  }

  if (isError || !dossier) {
    return (
      <CoquilleApplication titre="Dossier CNPS">
        <Alerte teinte="danger" titre="Impossible de charger le dossier">
          <p>{estErreurApi(error) ? error.message : "Une erreur inattendue est survenue."}</p>
        </Alerte>
      </CoquilleApplication>
    );
  }

  const transitionsPossibles = TRANSITIONS[dossier.statut];
  const motifObligatoire = transitionEnCours === "REJETE";

  function confirmerTransition(motif: string | undefined) {
    if (!transitionEnCours) return;
    changerStatut.mutate(
      { statut: transitionEnCours, commentaire: motif },
      {
        onSuccess: () => {
          toast.success("Statut du dossier mis à jour.");
          setTransitionEnCours(null);
        },
        onError: (erreur) => {
          toast.error(
            estErreurApi(erreur) ? erreur.message : "Le statut n'a pas pu être modifié.",
          );
        },
      },
    );
  }

  return (
    <CoquilleApplication titre="Dossier CNPS">
      <div className="space-y-6">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="space-y-1">
            <h1>Dossier CNPS</h1>
            <div className="flex items-center gap-2">
              <BadgeStatut domaine="dossierCnps" code={dossier.statut} />
              {dossier.numeroImmatriculation && (
                <span className="ref text-sm">{dossier.numeroImmatriculation}</span>
              )}
            </div>
          </div>

          {peutChangerStatut && transitionsPossibles.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {transitionsPossibles.map((cible, indice) => (
                <Button
                  key={cible}
                  // Une seule action primaire par écran (`docs/02_DESIGN_SYSTEM.md §1.4`) : seule la
                  // transition la plus probable (première du tableau `TRANSITIONS`) est `default`,
                  // les autres — dont REJETE, toujours — restent `outline`.
                  variant={indice === 0 ? "default" : "outline"}
                  size="sm"
                  onClick={() => setTransitionEnCours(cible)}
                >
                  {LIBELLES_TRANSITION[cible]}
                </Button>
              ))}
            </div>
          )}
        </div>

        <AvertissementRegle avertissements={dossier.avertissements} />

        {dossier.motifRejet && (
          <Alerte teinte="danger" titre="Dossier rejeté par la CNPS">
            <p>{dossier.motifRejet}</p>
          </Alerte>
        )}

        <Card>
          <CardHeader>
            <CardTitle>Pièces du dossier</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {dossier.piecesManquantes.length > 0 && (
              <Alerte teinte="attention" titre="Pièces obligatoires manquantes">
                <ul className="list-disc space-y-1 pl-4">
                  {dossier.piecesManquantes.map((piece) => (
                    <li key={piece.typePiece}>
                      {LIBELLES_TYPE_PIECE[piece.typePiece]}
                      {piece.statutActuel === "REJETEE" && " — pièce rejetée, à remplacer"}
                    </li>
                  ))}
                </ul>
              </Alerte>
            )}

            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Pièce</TableHead>
                  <TableHead>Statut</TableHead>
                  <TableHead>Obligatoire</TableHead>
                  <TableHead />
                </TableRow>
              </TableHeader>
              <TableBody>
                {dossier.pieces.map((piece) => (
                  <TableRow key={piece.id}>
                    <TableCell>{LIBELLES_TYPE_PIECE[piece.typePiece] ?? piece.typePiece}</TableCell>
                    <TableCell>
                      <BadgeStatut domaine="pieceCnps" code={piece.statut} />
                    </TableCell>
                    <TableCell>{piece.obligatoire ? "Oui" : "Non"}</TableCell>
                    <TableCell className="text-right">
                      {piece.documentId ? (
                        <Button
                          variant="outline"
                          size="sm"
                          disabled={telecharger.isPending}
                          onClick={() => telecharger.mutate(piece.documentId!)}
                        >
                          Télécharger
                        </Button>
                      ) : (
                        peutGerer && (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setPieceEnCours(piece.typePiece)}
                          >
                            Ajouter
                          </Button>
                        )
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Déclarations mensuelles</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {peutDeclarer && (
              <div className="flex flex-wrap items-end gap-3">
                <div className="space-y-1.5">
                  <Label htmlFor="periode-declaration">Période</Label>
                  <Input
                    id="periode-declaration"
                    type="month"
                    className="w-48"
                    value={periode}
                    onChange={(evenement) => setPeriode(evenement.target.value)}
                  />
                </div>
                <Button
                  variant="outline"
                  disabled={preparerDeclaration.isPending || !periode}
                  onClick={() =>
                    preparerDeclaration.mutate(periode, {
                      onSuccess: () => toast.success("Déclaration préparée."),
                      onError: (erreur) =>
                        toast.error(
                          estErreurApi(erreur)
                            ? erreur.message
                            : "La déclaration n'a pas pu être préparée.",
                        ),
                    })
                  }
                >
                  Préparer la déclaration
                </Button>
              </div>
            )}

            {(!declarations || declarations.length === 0) && (
              <EtatVide
                titre="Aucune déclaration préparée"
                description="Le montant déclaré est construit à partir des droits réellement imputés sur le mois."
              />
            )}

            {declarations && declarations.length > 0 && (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Période</TableHead>
                    <TableHead>Montant déclaré</TableHead>
                    <TableHead>Statut</TableHead>
                    <TableHead>Transmise le</TableHead>
                    <TableHead />
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {declarations.map((declaration) => (
                    <TableRow key={declaration.id}>
                      <TableCell>{formaterMoisAnnee(declaration.periodeMois)}</TableCell>
                      <TableCell className="chiffre">
                        {formaterMontant(declaration.montantDeclare)}
                      </TableCell>
                      <TableCell>
                        <BadgeStatut domaine="dossierCnps" code={declaration.statut} />
                      </TableCell>
                      <TableCell>{formaterDate(declaration.dateTransmission)}</TableCell>
                      <TableCell className="text-right">
                        {peutDeclarer && declaration.statut === "A_PRODUIRE" && (
                          <Button
                            variant="outline"
                            size="sm"
                            disabled={transmettre.isPending}
                            onClick={() =>
                              transmettre.mutate(
                                { declarationId: declaration.id },
                                {
                                  onSuccess: () => toast.success("Déclaration marquée transmise."),
                                  onError: (erreur) =>
                                    toast.error(
                                      estErreurApi(erreur)
                                        ? erreur.message
                                        : "La transmission n'a pas pu être enregistrée.",
                                    ),
                                },
                              )
                            }
                          >
                            Marquer transmise
                          </Button>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>

      {pieceEnCours && (
        <DialogueTeleverserDocument
          ouvert={!!pieceEnCours}
          onOuvertChange={(ouvert) => !ouvert && setPieceEnCours(null)}
          cible={{ adherentId: dossier.adherentId }}
          onTeleverse={(document) => {
            ajouterPiece.mutate(
              { documentId: document.id, typePiece: pieceEnCours },
              {
                onSuccess: () => toast.success("Pièce rattachée au dossier."),
                onError: (erreur) =>
                  toast.error(
                    estErreurApi(erreur) ? erreur.message : "La pièce n'a pas pu être rattachée.",
                  ),
              },
            );
            setPieceEnCours(null);
          }}
        />
      )}

      <DialogueConfirmation
        ouvert={!!transitionEnCours}
        onOuvertChange={(ouvert) => !ouvert && setTransitionEnCours(null)}
        titre={transitionEnCours ? LIBELLES_TRANSITION[transitionEnCours] : ""}
        description="Ce changement de statut est historisé et audité."
        // Le motif n'est exigé que pour un rejet — c'est aussi la règle du serveur
        // (`CNPS_MOTIF_REQUIS`), reproduite ici pour bloquer la saisie au bon moment, pas pour
        // s'y substituer.
        motifRequis={motifObligatoire}
        libelleMotif="Motif du rejet CNPS"
        enCours={changerStatut.isPending}
        onConfirmer={confirmerTransition}
      />
    </CoquilleApplication>
  );
}
