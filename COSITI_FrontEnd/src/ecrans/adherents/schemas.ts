/**
 * Schémas Zod partagés par les formulaires du module adhérents (création, modification, coordonnées,
 * informations professionnelles, complétion).
 *
 * Ils ne contrôlent que la **forme** d'une saisie, pour prévenir l'utilisateur avant l'envoi. Ils ne sont
 * jamais l'autorité : le serveur revalide tout (`@Valid`, règles de service) et son refus est affiché tel
 * quel (`AGENTS.md` règle 2). Aucune règle métier ici — ni complétion, ni doublon, ni éligibilité.
 */
import { z } from "zod";
import type { Adherent, CorpsModificationAdherent, Sexe } from "@/api/adherents";

/** Numéro camerounais : 9 chiffres, indicatif `237` toléré en tête. */
export function estTelephoneValide(valeur: string): boolean {
  return valeur.replace(/\D/g, "").replace(/^237/, "").length === 9;
}

export const MESSAGE_TELEPHONE = "Le numéro doit comporter 9 chiffres (format camerounais).";

export const schemaTelephoneObligatoire = z
  .string()
  .trim()
  .min(1, "Le téléphone principal est obligatoire.")
  .refine(estTelephoneValide, MESSAGE_TELEPHONE);

export const schemaTelephoneFacultatif = z
  .string()
  .trim()
  .optional()
  .refine((valeur) => !valeur || estTelephoneValide(valeur), MESSAGE_TELEPHONE);

/** Coordonnée GPS saisie en texte : vide, ou un nombre décimal (virgule ou point). */
const schemaCoordonneeGps = (min: number, max: number, libelle: string) =>
  z
    .string()
    .trim()
    .optional()
    .refine((valeur) => {
      if (!valeur) return true;
      const nombre = Number(valeur.replace(",", "."));
      return !Number.isNaN(nombre) && nombre >= min && nombre <= max;
    }, `${libelle} invalide (entre ${min} et ${max}).`);

export const schemaLatitude = schemaCoordonneeGps(-90, 90, "Latitude");
export const schemaLongitude = schemaCoordonneeGps(-180, 180, "Longitude");

/** Un champ facultatif laissé vide vaut « absent », jamais la chaîne vide. */
export function sansVide(valeur: string | undefined | null): string | undefined {
  const nettoye = valeur?.trim();
  return nettoye ? nettoye : undefined;
}

/** Variante pour les `PUT` qui remplacent chaque champ : un champ vide est envoyé `null`. */
export function videVersNull(valeur: string | undefined | null): string | null {
  return sansVide(valeur) ?? null;
}

export function texteVersNombre(valeur: string | undefined | null): number | null {
  const nettoye = sansVide(valeur);
  if (!nettoye) return null;
  const nombre = Number(nettoye.replace(",", "."));
  return Number.isNaN(nombre) ? null : nombre;
}

export function nombreVersTexte(valeur: number | null | undefined): string {
  return valeur === null || valeur === undefined ? "" : String(valeur);
}

/* ==========================================================================
   Coordonnées (#32)
   ======================================================================== */

export const schemaCoordonnees = z.object({
  telephonePrincipal: schemaTelephoneObligatoire,
  telephoneSecondaire: schemaTelephoneFacultatif,
  numeroCni: z.string().trim().optional(),
  localisation: z.string().trim().min(1, "La localisation est obligatoire."),
  quartier: z.string().trim().optional(),
  ville: z.string().trim().optional(),
  latitude: schemaLatitude,
  longitude: schemaLongitude,
});

export type ValeursCoordonnees = z.infer<typeof schemaCoordonnees>;

/* ==========================================================================
   Informations professionnelles (#30)
   ======================================================================== */

export const schemaProfessionnel = z.object({
  activiteId: z.string().min(1, "L'activité est obligatoire."),
  numeroCnps: z.string().trim().optional(),
  /** V21 : choisie dans le référentiel `GET /associations` ; vide = aucune association. */
  associationId: z.string().optional(),
});

export type ValeursProfessionnel = z.infer<typeof schemaProfessionnel>;

/* ==========================================================================
   Identité — modification de la fiche (#13)
   ======================================================================== */

export const schemaIdentite = z.object({
  nom: z.string().trim().min(1, "Le nom est obligatoire."),
  prenoms: z.string().trim().optional(),
  dateNaissance: z
    .string()
    .optional()
    .refine((valeur) => !valeur || new Date(valeur) < new Date(), "La date de naissance doit être dans le passé."),
  sexe: z.enum(["M", "F"]).optional(),
});

export type ValeursIdentite = z.infer<typeof schemaIdentite>;

/**
 * Le `PUT /adherents/{id}` remplace **tous** les champs : on part de la fiche telle que lue, et on n'y
 * substitue que ce que l'utilisateur a modifié. Sans cela, enregistrer l'identité effacerait les
 * coordonnées et les informations professionnelles.
 */
export function corpsModificationDepuisFiche(
  adherent: Adherent,
  identite: ValeursIdentite,
): CorpsModificationAdherent {
  return {
    nom: identite.nom.trim(),
    prenoms: videVersNull(identite.prenoms),
    dateNaissance: videVersNull(identite.dateNaissance),
    sexe: (identite.sexe ?? null) as Sexe | null,
    telephonePrincipal: adherent.telephonePrincipal,
    telephoneSecondaire: adherent.telephoneSecondaire,
    numeroCni: adherent.numeroCni,
    numeroCnps: adherent.numeroCnps,
    activiteId: adherent.activiteId,
    associationId: adherent.associationId,
    localisation: adherent.localisation,
    quartier: adherent.quartier,
    ville: adherent.ville,
    latitude: adherent.latitude ?? null,
    longitude: adherent.longitude ?? null,
    version: adherent.version ?? null,
  };
}
