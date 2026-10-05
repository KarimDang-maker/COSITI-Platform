/**
 * Champs pouvant faire l'objet d'une demande, par opération — repris des adaptateurs backend
 * (`AdaptateurWorkflowAdherent`, `AdaptateurWorkflowAgent`, `AdaptateurWorkflowPaiement`). Ce catalogue ne
 * sert qu'à présenter le formulaire et les valeurs : le serveur refuse tout champ hors de sa liste
 * (`DEMANDE_VALEUR_INVALIDE`) et revalide chaque valeur proposée.
 */
import type { TypeOperationWorkflow } from "@/api/workflow";
import { definitionStatut, STATUTS } from "@/lib/statuts";
import { formaterDate, formaterMontant, formaterTelephone } from "@/lib/format";

export type SaisieChamp = "texte" | "telephone" | "date" | "nombre" | "montant" | "choix" | "referentiel";

export interface DefinitionChamp {
  readonly champ: string;
  readonly libelle: string;
  readonly saisie: SaisieChamp;
  /** Options d'un champ `choix` (valeur serveur → libellé). */
  readonly options?: readonly { valeur: string; libelle: string }[];
  /** Référentiel d'un champ `referentiel` : l'écran fournit les options (activités, zones). */
  readonly referentiel?: "activites" | "zones";
}

const OPTIONS_SEXE = [
  { valeur: "M", libelle: "Masculin" },
  { valeur: "F", libelle: "Féminin" },
];

const optionsStatut = (domaine: "adherent" | "modePaiement") =>
  Object.keys(STATUTS[domaine]).map((code) => ({ valeur: code, libelle: definitionStatut(domaine, code).libelle }));

const CHAMPS_ADHERENT: readonly DefinitionChamp[] = [
  { champ: "nom", libelle: "Nom", saisie: "texte" },
  { champ: "prenoms", libelle: "Prénoms", saisie: "texte" },
  { champ: "dateNaissance", libelle: "Date de naissance", saisie: "date" },
  { champ: "sexe", libelle: "Sexe", saisie: "choix", options: OPTIONS_SEXE },
  { champ: "telephonePrincipal", libelle: "Téléphone principal", saisie: "telephone" },
  { champ: "telephoneSecondaire", libelle: "Téléphone secondaire", saisie: "telephone" },
  // V22 (`AdaptateurWorkflowAdherent.CHAMPS_DOSSIER`).
  { champ: "whatsapp", libelle: "WhatsApp", saisie: "telephone" },
  { champ: "email", libelle: "E-mail", saisie: "texte" },
  { champ: "numeroCni", libelle: "Numéro CNI", saisie: "texte" },
  { champ: "numeroCnps", libelle: "Numéro CNPS", saisie: "texte" },
  { champ: "activiteId", libelle: "Activité", saisie: "referentiel", referentiel: "activites" },
  { champ: "localisation", libelle: "Localisation", saisie: "texte" },
  { champ: "quartier", libelle: "Quartier", saisie: "texte" },
  { champ: "ville", libelle: "Ville", saisie: "texte" },
  { champ: "latitude", libelle: "Latitude", saisie: "nombre" },
  { champ: "longitude", libelle: "Longitude", saisie: "nombre" },
  { champ: "statut", libelle: "Statut de l'adhérent", saisie: "choix", options: optionsStatut("adherent") },
];

const CHAMPS_AGENT: readonly DefinitionChamp[] = [
  { champ: "nomComplet", libelle: "Nom complet", saisie: "texte" },
  { champ: "telephone", libelle: "Téléphone", saisie: "telephone" },
  { champ: "zoneId", libelle: "Zone", saisie: "referentiel", referentiel: "zones" },
  { champ: "objectifCollecteMensuel", libelle: "Objectif de collecte mensuel", saisie: "montant" },
];

const CHAMPS_PAIEMENT: readonly DefinitionChamp[] = [
  { champ: "montant", libelle: "Montant", saisie: "montant" },
  // V22 : répartition à corriger avec le montant.
  { champ: "montantSecuriteSociale", libelle: "Sécurité Sociale", saisie: "montant" },
  { champ: "montantEpargne", libelle: "Épargne", saisie: "montant" },
  { champ: "datePaiement", libelle: "Date du paiement", saisie: "date" },
  { champ: "modePaiement", libelle: "Mode de paiement", saisie: "choix", options: optionsStatut("modePaiement") },
  { champ: "referenceTransaction", libelle: "Référence de transaction", saisie: "texte" },
];

/** Champs proposables par opération de modification (la validation initiale porte un instantané du dossier). */
export const CHAMPS_PAR_OPERATION: Partial<Readonly<Record<TypeOperationWorkflow, readonly DefinitionChamp[]>>> = {
  ADHERENT_MODIFICATION: CHAMPS_ADHERENT,
  AGENT_MODIFICATION: CHAMPS_AGENT,
  PAIEMENT_CORRECTION: CHAMPS_PAIEMENT,
};

/** Libellés de tous les champs connus (y compris ceux des instantanés de validation : zone, associationId…). */
const LIBELLES: Readonly<Record<string, string>> = Object.fromEntries(
  [
    ...CHAMPS_ADHERENT,
    ...CHAMPS_AGENT,
    ...CHAMPS_PAIEMENT,
    { champ: "zoneId", libelle: "Zone" },
    { champ: "associationId", libelle: "Association" },
    { champ: "actif", libelle: "Statut de l'agent" },
  ].map((d) => [d.champ, d.libelle]),
);

export function libelleChamp(champ: string): string {
  return LIBELLES[champ] ?? champ;
}

export interface Referentiels {
  activites?: readonly { id: string; libelle: string }[];
  zones?: readonly { id: string; libelle: string }[];
}

/**
 * Valeur lisible d'un champ, telle que stockée par le serveur (texte, dates ISO, décimaux avec point). Jamais
 * de calcul : uniquement de la mise en forme.
 */
export function formaterValeurChamp(champ: string, valeur: string | null | undefined, referentiels: Referentiels = {}): string {
  if (valeur === null || valeur === undefined || valeur === "") return "—";
  switch (champ) {
    case "montant":
    case "montantSecuriteSociale":
    case "montantEpargne":
    case "objectifCollecteMensuel":
      return formaterMontant(Number(valeur));
    case "dateNaissance":
    case "datePaiement":
      return formaterDate(valeur);
    case "telephonePrincipal":
    case "telephoneSecondaire":
    case "whatsapp":
    case "telephone":
      return formaterTelephone(valeur);
    case "sexe":
      return OPTIONS_SEXE.find((o) => o.valeur === valeur)?.libelle ?? valeur;
    case "statut":
      return definitionStatut("adherent", valeur).libelle;
    case "modePaiement":
      return definitionStatut("modePaiement", valeur).libelle;
    case "actif":
      return valeur === "true" ? "Actif" : "Inactif";
    case "activiteId":
      return referentiels.activites?.find((a) => a.id === valeur)?.libelle ?? "Activité du référentiel";
    case "zoneId":
      return referentiels.zones?.find((z) => z.id === valeur)?.libelle ?? "Zone du référentiel";
    default:
      return valeur;
  }
}
