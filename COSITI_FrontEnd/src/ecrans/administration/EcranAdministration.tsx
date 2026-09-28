import { useMemo, useState } from "react";
import { useSearchParams } from "react-router";
import { toast } from "sonner";
import type { ColumnDef } from "@tanstack/react-table";
import { CoquilleApplication } from "@/components/cositi/coquille-application";
import { TableauDonnees } from "@/components/cositi/tableau-donnees";
import { SqueletteTableau } from "@/components/cositi/squelette-tableau";
import { Alerte } from "@/components/cositi/alerte";
import { BadgeStatut } from "@/components/cositi/badge-statut";
import { EtatVide } from "@/components/cositi/etat-vide";
import { BarreFiltres } from "@/components/cositi/barre-filtres";
import { DialogueConfirmation } from "@/components/cositi/dialogue-confirmation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { DialogueCreerUtilisateur } from "@/ecrans/administration/DialogueCreerUtilisateur";
import { DialogueModifierParametre } from "@/ecrans/administration/DialogueModifierParametre";
import { usePermission } from "@/auth/ContexteAuth";
import {
  useChangerActivation,
  useParametres,
  useRolesAdmin,
  useUtilisateursAdmin,
} from "@/hooks/useAdministration";
import type { ParametreAdmin, UtilisateurAdmin } from "@/api/administration";
import { estErreurApi } from "@/api/erreurs";
import { formaterDateHeure } from "@/lib/format";

/**
 * `/administration` — Comptes, rôles et paramètres (Roles des acteurs.md §10, J11).
 *
 * Trois absences volontaires, qui sont des décisions :
 *  - **aucun bouton de suppression** : un compte se désactive, il ne s'efface pas ;
 *  - **aucune création de rôle** : les huit rôles V1 sont fermés, l'onglet les
 *    affiche en lecture ;
 *  - **aucun champ de mot de passe** : il est généré par le serveur et révélé une
 *    seule fois. Laisser un administrateur choisir le mot de passe d'un autre en
 *    ferait un secret partagé dès sa création.
 */
export function EcranAdministration() {
  const [parametresUrl, definirParametres] = useSearchParams();
  const onglet = parametresUrl.get("onglet") ?? "utilisateurs";
  const recherche = parametresUrl.get("recherche") ?? "";

  // Comptes, rôles et paramètres sont des données sensibles qui peuvent avoir changé ailleurs
  // (un autre administrateur, un autre onglet) depuis la dernière visite. Aucune invalidation
  // manuelle n'est nécessaire ici : ces requêtes n'ont pas de `staleTime` (défaut 0), donc
  // TanStack Query les considère déjà périmées et les rejoue à chaque montage de cet écran —
  // un `invalidateQueries` explicite ne ferait que dupliquer cet appel en vol.
  const utilisateurs = useUtilisateursAdmin({ recherche: recherche || undefined });
  const roles = useRolesAdmin();
  const parametres = useParametres();
  const changerActivation = useChangerActivation();
  // RAPORT_V1 §3.8/§4.9/§9.9 : la création/gestion des comptes revient au PCA (UTILISATEUR:GERER) ; la
  // désactivation reste possible au SA en plus du PCA (UTILISATEUR:DESACTIVER) — le SA a perdu la création.
  const peutGererComptes = usePermission("UTILISATEUR:GERER");
  const peutDesactiverComptes = usePermission("UTILISATEUR:DESACTIVER");

  const [creationOuverte, setCreationOuverte] = useState(false);
  const [aBasculer, setABasculer] = useState<UtilisateurAdmin | null>(null);
  const [parametreEnCours, setParametreEnCours] = useState<ParametreAdmin | null>(null);

  function mettreAJour(cle: string, valeur: string | undefined) {
    const suivants = new URLSearchParams(parametresUrl);
    if (valeur) suivants.set(cle, valeur);
    else suivants.delete(cle);
    definirParametres(suivants, { replace: true });
  }

  const colonnesUtilisateurs = useMemo<ColumnDef<UtilisateurAdmin>[]>(
    () => [
      {
        id: "identifiant",
        header: "Identifiant",
        cell: ({ row }) => <span className="ref">{row.original.identifiant}</span>,
      },
      { id: "nomComplet", header: "Nom", cell: ({ row }) => row.original.nomComplet },
      {
        id: "roles",
        header: "Rôles",
        cell: ({ row }) => row.original.roles.join(", "),
      },
      {
        id: "etat",
        header: "État",
        cell: ({ row }) => (
          <span className="flex flex-wrap gap-1">
            <BadgeStatut domaine="compte" code={row.original.actif ? "ACTIF" : "SUSPENDU"} />
            {row.original.verrouille && <BadgeStatut domaine="compte" code="VERROUILLE" />}
          </span>
        ),
      },
      {
        id: "derniereConnexionLe",
        header: "Dernière connexion",
        cell: ({ row }) => formaterDateHeure(row.original.derniereConnexionLe),
      },
      {
        id: "actions",
        header: "",
        cell: ({ row }) =>
          peutDesactiverComptes && (
            <Button variant="outline" size="sm" onClick={() => setABasculer(row.original)}>
              {row.original.actif ? "Désactiver" : "Réactiver"}
            </Button>
          ),
      },
    ],
    [peutDesactiverComptes],
  );

  return (
    <CoquilleApplication titre="Administration">
      <div className="space-y-4">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h1>Administration</h1>
            <p className="text-texte-doux">
              Comptes, rôles et règles de paramétrage. Toutes les actions sont auditées.
            </p>
          </div>
          {onglet === "utilisateurs" && peutGererComptes && (
            <Button onClick={() => setCreationOuverte(true)}>Créer un compte</Button>
          )}
        </div>

        <Tabs value={onglet} onValueChange={(valeur) => mettreAJour("onglet", valeur)}>
          <TabsList>
            <TabsTrigger value="utilisateurs">Comptes</TabsTrigger>
            <TabsTrigger value="roles">Rôles</TabsTrigger>
            <TabsTrigger value="parametres">Paramètres</TabsTrigger>
          </TabsList>

          <TabsContent value="utilisateurs" className="space-y-4">
            <BarreFiltres>
              <div className="space-y-1.5">
                <Label htmlFor="recherche-compte">Rechercher</Label>
                <Input
                  id="recherche-compte"
                  className="w-64"
                  placeholder="identifiant ou nom"
                  defaultValue={recherche}
                  onChange={(evenement) => mettreAJour("recherche", evenement.target.value || undefined)}
                />
              </div>
            </BarreFiltres>

            {utilisateurs.isLoading && <SqueletteTableau colonnes={6} />}
            {utilisateurs.isError && (
              <Alerte teinte="danger" titre="Impossible de charger les comptes">
                <p>
                  {estErreurApi(utilisateurs.error)
                    ? utilisateurs.error.message
                    : "Une erreur inattendue est survenue."}
                </p>
              </Alerte>
            )}
            {utilisateurs.data && utilisateurs.data.contenu.length === 0 && (
              <EtatVide
                titre="Aucun compte trouvé"
                description="Aucun compte ne correspond à cette recherche."
              />
            )}
            {utilisateurs.data && utilisateurs.data.contenu.length > 0 && (
              <TableauDonnees
                colonnes={colonnesUtilisateurs}
                lignes={utilisateurs.data.contenu}
                cleLigne={(u) => u.id}
              />
            )}
          </TabsContent>

          <TabsContent value="roles" className="space-y-4">
            <p className="text-sm text-texte-doux">
              Les huit rôles de la V1 sont <strong>fermés</strong> : ils ne se créent ni ne se suppriment.
              Cet onglet montre leurs permissions effectives, telles que le serveur les applique.
            </p>
            {roles.isLoading && <SqueletteTableau colonnes={3} />}
            {roles.isError && (
              <Alerte teinte="danger" titre="Impossible de charger les rôles">
                <p>{estErreurApi(roles.error) ? roles.error.message : "Une erreur inattendue est survenue."}</p>
              </Alerte>
            )}
            {roles.data && roles.data.length === 0 && (
              <EtatVide titre="Aucun rôle" description="Aucun rôle n'est configuré sur cette plateforme." />
            )}
            {roles.data && roles.data.length > 0 && (
              <div className="space-y-3">
                {roles.data.map((role) => (
                  <div key={role.code} className="rounded-lg border border-bordure bg-surface p-4">
                    <p className="font-semibold">
                      {role.libelle} <span className="ref text-texte-doux">{role.code}</span>
                    </p>
                    {role.description && <p className="text-sm text-texte-doux">{role.description}</p>}
                    <p className="mt-2 flex flex-wrap gap-1">
                      {role.permissions.map((permission) => (
                        <span
                          key={permission}
                          className="ref rounded-sm border border-bordure bg-surface-douce px-1.5 py-0.5 text-xs"
                        >
                          {permission}
                        </span>
                      ))}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </TabsContent>

          <TabsContent value="parametres" className="space-y-4">
            <Alerte teinte="info" titre="Ce que signifient les statuts">
              <p>
                <strong>Confirmé</strong> : la règle est validée par la COSITI. <strong>À analyser</strong> :
                proposition technique. <strong>À valider</strong> : la valeur est provisoire, et tous les
                résultats qui en dépendent sont signalés comme tels dans l'application.
              </p>
            </Alerte>

            {parametres.isLoading && <SqueletteTableau colonnes={5} />}
            {parametres.isError && (
              <Alerte teinte="danger" titre="Impossible de charger les paramètres">
                <p>
                  {estErreurApi(parametres.error)
                    ? parametres.error.message
                    : "Une erreur inattendue est survenue."}
                </p>
              </Alerte>
            )}
            {parametres.data && parametres.data.length === 0 && (
              <EtatVide titre="Aucun paramètre" description="Aucune règle de paramétrage n'est configurée." />
            )}
            {parametres.data && parametres.data.length > 0 && (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Règle</TableHead>
                    <TableHead>Valeur</TableHead>
                    <TableHead>Statut</TableHead>
                    <TableHead>Dernière modification</TableHead>
                    <TableHead />
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {parametres.data.map((parametre) => (
                    <TableRow key={parametre.cle}>
                      <TableCell>
                        <span className="ref block text-xs text-texte-doux">{parametre.cle}</span>
                        {parametre.libelle}
                      </TableCell>
                      <TableCell className="chiffre">{parametre.valeur}</TableCell>
                      <TableCell>
                        <BadgeStatut domaine="validationParametre" code={parametre.statutValidation} />
                      </TableCell>
                      <TableCell className="text-sm text-texte-doux">
                        {parametre.modifiePar
                          ? `${parametre.modifiePar} — ${formaterDateHeure(parametre.modifieLe)}`
                          : "Valeur d'origine"}
                      </TableCell>
                      <TableCell className="text-right">
                        <Button variant="outline" size="sm" onClick={() => setParametreEnCours(parametre)}>
                          Modifier
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </TabsContent>
        </Tabs>
      </div>

      <DialogueCreerUtilisateur ouvert={creationOuverte} onOuvertChange={setCreationOuverte} />

      {parametreEnCours && (
        <DialogueModifierParametre
          parametre={parametreEnCours}
          onFermer={() => setParametreEnCours(null)}
        />
      )}

      <DialogueConfirmation
        ouvert={!!aBasculer}
        onOuvertChange={(ouvert) => !ouvert && setABasculer(null)}
        titre={aBasculer?.actif ? "Désactiver ce compte" : "Réactiver ce compte"}
        description={
          aBasculer
            ? aBasculer.actif
              ? `« ${aBasculer.identifiant} » ne pourra plus se connecter. Le compte n'est pas supprimé : son historique et ses opérations restent intacts.`
              : `« ${aBasculer.identifiant} » pourra de nouveau se connecter.`
            : ""
        }
        libelleConfirmation={aBasculer?.actif ? "Désactiver" : "Réactiver"}
        varianteDestructive={aBasculer?.actif}
        motifRequis
        libelleMotif="Motif"
        enCours={changerActivation.isPending}
        onConfirmer={(motif) => {
          if (!aBasculer) return;
          changerActivation.mutate(
            { id: aBasculer.id, actif: !aBasculer.actif, motif: motif ?? "" },
            {
              onSuccess: () => {
                toast.success(aBasculer.actif ? "Compte désactivé." : "Compte réactivé.");
                setABasculer(null);
              },
              onError: (erreur) =>
                toast.error(estErreurApi(erreur) ? erreur.message : "L'opération a échoué."),
            },
          );
        }}
      />
    </CoquilleApplication>
  );
}
