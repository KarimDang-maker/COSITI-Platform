import { useMemo, useState } from "react";
import { useNavigate, useSearchParams } from "react-router";
import { toast } from "sonner";
import type { ColumnDef, SortingState } from "@tanstack/react-table";
import { CoquilleApplication } from "@/components/cositi/coquille-application";
import { BarreFiltres } from "@/components/cositi/barre-filtres";
import { TableauDonnees } from "@/components/cositi/tableau-donnees";
import { EtatVide } from "@/components/cositi/etat-vide";
import { SqueletteTableau } from "@/components/cositi/squelette-tableau";
import { Alerte } from "@/components/cositi/alerte";
import { AvertissementRegle } from "@/components/cositi/avertissement-regle";
import { DialogueConfirmation } from "@/components/cositi/dialogue-confirmation";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { useAuth, usePermission } from "@/auth/ContexteAuth";
import { usePaiements, useValiderPaiement, useSignalerIncoherencePaiement } from "@/hooks/usePaiements";
import type { ModePaiement, Paiement } from "@/api/paiements";
import { estErreurApi } from "@/api/erreurs";
import { abregerIdentifiant, formaterDate, formaterMontant } from "@/lib/format";
import { colonnesPaiementBase } from "@/ecrans/cotisations/colonnesPaiement";

const OPTIONS_MODE: readonly { valeur: ModePaiement; libelle: string }[] = [
  { valeur: "ESPECES", libelle: "Espèces" },
  { valeur: "ORANGE_MONEY", libelle: "Orange Money" },
  { valeur: "MTN_MOMO", libelle: "MTN MoMo" },
  { valeur: "VIREMENT", libelle: "Virement" },
];

const TAILLE_PAGE = 25;

interface ActionsControleProps {
  paiement: Paiement;
}

/**
 * Actions de ligne du contrôle DAF. « Confirmer » réutilise exactement la
 * même transition que le bouton « Valider » de `DetailPaiement` (J4) —
 * `POST /paiements/{id}/valider`, permission `PAIEMENT:VALIDER` : ce n'est
 * pas une nouvelle règle métier, seulement le vocabulaire du contrôle DAF
 * (`Roles des acteurs.md` UC-DAF-04 « Confirmer un paiement ») appliqué à
 * une action déjà existante.
 *
 * « Signaler une incohérence » (`signalerIncoherencePaiement`,
 * `api/paiements.ts`) : chemin et permission d'abord inférés côté frontend,
 * confirmés à l'identique par le code backend réel livré en parallèle de ce
 * lot (`ControleurPaiement.signalerIncoherence`,
 * `V8__permissions_j5_j6.sql`).
 *
 * Même garde-fou que `DetailPaiement` (J4) : un utilisateur ne peut pas
 * confirmer le paiement qu'il a lui-même saisi — masquage préventif
 * identique (bouton visible mais désactivé, avec explication), l'API restant
 * de toute façon seule autorité (`PAIEMENT_AUTO_VALIDATION_INTERDITE`, 403).
 */
function ActionsControle({ paiement }: ActionsControleProps) {
  const { utilisateur } = useAuth();
  const peutConfirmer = usePermission("PAIEMENT:VALIDER");
  const peutSignaler = usePermission("PAIEMENT:SIGNALER_INCOHERENCE");
  const confirmer = useValiderPaiement();
  const signaler = useSignalerIncoherencePaiement();
  const [dialogueOuvert, setDialogueOuvert] = useState(false);

  if (!peutConfirmer && !peutSignaler) return null;

  const estCreateur = !!paiement.creePar && !!utilisateur && paiement.creePar === utilisateur.identifiant;

  const rappelValeurs = (
    <p>
      Paiement <strong>{formaterMontant(paiement.montant)}</strong> du{" "}
      <strong>{formaterDate(paiement.datePaiement)}</strong> pour l'adhérent{" "}
      <strong>{abregerIdentifiant(paiement.adherentId)}</strong>.
    </p>
  );

  return (
    // `stopPropagation` : la ligne du tableau navigue vers le détail au clic
    // (`onActiverLigne`), les boutons d'action ne doivent pas déclencher cette
    // navigation.
    <div className="flex flex-wrap gap-2" onClick={(evenement) => evenement.stopPropagation()}>
      {peutConfirmer &&
        (estCreateur ? (
          <Tooltip>
            <TooltipTrigger asChild>
              <span>
                <Button size="sm" variant="outline" disabled>
                  Confirmer
                </Button>
              </span>
            </TooltipTrigger>
            <TooltipContent>Vous ne pouvez pas confirmer un paiement que vous avez vous-même saisi.</TooltipContent>
          </Tooltip>
        ) : (
          <Button
            size="sm"
            variant="outline"
            disabled={confirmer.isPending}
            onClick={() => {
              confirmer.mutate(paiement.id, {
                onSuccess: () => toast.success(`Paiement ${paiement.numeroRecu} confirmé.`),
                onError: (e) => toast.error(estErreurApi(e) ? e.message : "La confirmation a échoué."),
              });
            }}
          >
            {confirmer.isPending ? "Confirmation…" : "Confirmer"}
          </Button>
        ))}

      {peutSignaler && (
        <Button size="sm" variant="destructive" onClick={() => setDialogueOuvert(true)}>
          Signaler une incohérence
        </Button>
      )}

      <DialogueConfirmation
        ouvert={dialogueOuvert}
        onOuvertChange={setDialogueOuvert}
        titre={`Signaler une incohérence — ${paiement.numeroRecu}`}
        description={rappelValeurs}
        motifRequis
        libelleMotif="Motif de l'incohérence"
        libelleConfirmation="Signaler l'incohérence"
        varianteDestructive
        enCours={signaler.isPending}
        onConfirmer={async (motif) => {
          try {
            await signaler.mutateAsync({ id: paiement.id, motif: motif! });
            toast.success(`Incohérence signalée sur le paiement ${paiement.numeroRecu}.`);
            setDialogueOuvert(false);
          } catch (e) {
            toast.error(estErreurApi(e) ? e.message : "Le signalement a échoué.");
          }
        }}
      />
    </div>
  );
}

/**
 * `/daf` — File des paiements à contrôler (J5). Réutilise le mécanisme de
 * liste de `/cotisations` (`usePaiements`, `colonnesPaiementBase`) filtré sur
 * `statut=A_CONTROLER` : aucune règle métier n'est réécrite ici. Un paiement
 * traité (confirmé ou signalé) sort naturellement de cette file — il reste
 * consultable, avec sa nouvelle teinte, dans le journal général
 * `/cotisations` (`BadgeStatut domaine="paiement"`, teinte danger déjà
 * ajoutée pour `INCOHERENCE` en J4, `src/lib/statuts.ts`).
 */
export function EcranDaf() {
  const [parametres, definirParametres] = useSearchParams();
  const navigate = useNavigate();
  const [tri, setTri] = useState<SortingState>([]);

  const modePaiement = (parametres.get("modePaiement") as ModePaiement | null) ?? undefined;
  const page = Number(parametres.get("page") ?? "0");

  const filtres = useMemo(
    () => ({ statut: "A_CONTROLER" as const, modePaiement, page, taille: TAILLE_PAGE }),
    [modePaiement, page],
  );

  const { data, isLoading, isError, error } = usePaiements(filtres);

  function mettreAJourParametre(cle: string, valeur: string | undefined) {
    const suivants = new URLSearchParams(parametres);
    if (valeur) suivants.set(cle, valeur);
    else suivants.delete(cle);
    suivants.delete("page");
    definirParametres(suivants, { replace: true });
  }

  function changerPage(nouvellePage: number) {
    const suivants = new URLSearchParams(parametres);
    suivants.set("page", String(nouvellePage));
    definirParametres(suivants, { replace: true });
  }

  const colonnes = useMemo<ColumnDef<Paiement>[]>(
    () => [
      ...colonnesPaiementBase(),
      {
        id: "actions",
        header: "Actions",
        cell: ({ row }) => <ActionsControle paiement={row.original} />,
      },
    ],
    [],
  );

  return (
    <CoquilleApplication titre="DAF">
      <div className="space-y-4">
        <div>
          <h1>Contrôle DAF</h1>
          <p className="text-texte-doux">Paiements en attente de contrôle (statut « À contrôler »).</p>
        </div>

        <BarreFiltres>
          <div className="space-y-1.5">
            <Label htmlFor="filtre-mode">Mode de paiement</Label>
            <Select
              value={modePaiement ?? "TOUS"}
              onValueChange={(valeur) => mettreAJourParametre("modePaiement", valeur === "TOUS" ? undefined : valeur)}
            >
              <SelectTrigger id="filtre-mode" className="w-56">
                <SelectValue placeholder="Tous les modes" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="TOUS">Tous les modes</SelectItem>
                {OPTIONS_MODE.map((option) => (
                  <SelectItem key={option.valeur} value={option.valeur}>
                    {option.libelle}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </BarreFiltres>

        {data && data.avertissements.length > 0 && <AvertissementRegle avertissements={data.avertissements} />}

        {isLoading && <SqueletteTableau colonnes={8} />}

        {isError && (
          <Alerte teinte="danger" titre="Impossible de charger la file de contrôle">
            <p>{estErreurApi(error) ? error.message : "Une erreur inattendue est survenue."}</p>
          </Alerte>
        )}

        {data && data.contenu.length === 0 && (
          <EtatVide
            titre="Aucun paiement à contrôler"
            description="Tous les paiements enregistrés ont déjà été confirmés ou font l'objet d'une incohérence signalée."
          />
        )}

        {data && data.contenu.length > 0 && (
          <>
            <TableauDonnees
              colonnes={colonnes}
              lignes={data.contenu}
              cleLigne={(p) => p.id}
              tri={tri}
              onChangerTri={setTri}
              onActiverLigne={(p) => navigate(`/cotisations/${p.id}`)}
              libelleLigne={(p) => `Ouvrir le paiement ${p.numeroRecu}`}
            />

            <div className="flex items-center justify-between text-sm text-texte-doux">
              <p>{data.totalElements} paiements à contrôler</p>
              <div className="flex items-center gap-2">
                <Button variant="outline" size="sm" disabled={page <= 0} onClick={() => changerPage(page - 1)}>
                  Précédent
                </Button>
                <span>
                  Page {page + 1} sur {Math.max(data.totalPages, 1)}
                </span>
                <Button variant="outline" size="sm" disabled={page + 1 >= data.totalPages} onClick={() => changerPage(page + 1)}>
                  Suivant
                </Button>
              </div>
            </div>
          </>
        )}
      </div>
    </CoquilleApplication>
  );
}
