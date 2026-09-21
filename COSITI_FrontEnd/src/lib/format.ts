/**
 * COSITI — Formatage d'affichage.
 *
 * SOURCE UNIQUE. Un montant, une date, un matricule ou un numéro de téléphone
 * ne se met jamais en forme dans un composant : deux écrans qui formatent
 * différemment le même chiffre font douter de la donnée.
 *
 * Deux règles non négociables :
 *  1. Locale `fr-FR`, fuseau `Africa/Douala`. L'API renvoie des horodatages
 *     ISO 8601 en UTC ; un paiement enregistré à 23 h 30 à Douala ne doit
 *     jamais s'afficher à la date du lendemain.
 *  2. Chiffres tabulaires à l'affichage (classe `.chiffre`, voir globals.css)
 *     pour que les colonnes de montants s'alignent.
 */

const LOCALE = "fr-FR";
const FUSEAU = "Africa/Douala";

/** Unité monétaire affichée. Le code ISO est XAF, l'usage local est FCFA. */
const DEVISE = "FCFA";

/* ==========================================================================
   1. Montants et nombres
   ======================================================================== */

const NOMBRE_ENTIER = new Intl.NumberFormat(LOCALE, { maximumFractionDigits: 0 });

const NOMBRE_PRECIS = new Intl.NumberFormat(LOCALE, {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

const NOMBRE_SIGNE = new Intl.NumberFormat(LOCALE, {
  maximumFractionDigits: 0,
  signDisplay: "exceptZero",
});

/**
 * Montant courant : listes, cartes, tableaux de bord. Arrondi à l'unité —
 * le franc CFA n'a pas de subdivision en circulation.
 * `12500` -> `12 500 FCFA`
 */
export function formaterMontant(montant: number | null | undefined): string {
  if (montant === null || montant === undefined || Number.isNaN(montant)) return "—";
  return `${NOMBRE_ENTIER.format(montant)} ${DEVISE}`;
}

/**
 * Montant au centime : écrans de contrôle DAF, rapprochement, détail de
 * paiement. Ne jamais arrondir une somme que le DAF doit rapprocher.
 * `12500.5` -> `12 500,50 FCFA`
 */
export function formaterMontantPrecis(montant: number | null | undefined): string {
  if (montant === null || montant === undefined || Number.isNaN(montant)) return "—";
  return `${NOMBRE_PRECIS.format(montant)} ${DEVISE}`;
}

/**
 * Écart signé : remise de caisse, rapprochement. Le signe est porté par le
 * texte, pas seulement par la couleur.
 * `-2500` -> `-2 500 FCFA`
 */
export function formaterEcart(montant: number | null | undefined): string {
  if (montant === null || montant === undefined || Number.isNaN(montant)) return "—";
  return `${NOMBRE_SIGNE.format(montant)} ${DEVISE}`;
}

export function formaterNombre(valeur: number | null | undefined): string {
  if (valeur === null || valeur === undefined || Number.isNaN(valeur)) return "—";
  return NOMBRE_ENTIER.format(valeur);
}

/**
 * Taux. `decimales` à 1 par défaut : le taux d'activation se lit « 33,1 % »,
 * pas « 33 % » ni « 33,14 % ».
 * `0.3314` -> `33,1 %`
 */
export function formaterPourcentage(
  ratio: number | null | undefined,
  decimales = 1,
): string {
  if (ratio === null || ratio === undefined || Number.isNaN(ratio)) return "—";
  return new Intl.NumberFormat(LOCALE, {
    style: "percent",
    minimumFractionDigits: decimales,
    maximumFractionDigits: decimales,
  }).format(ratio);
}

/* ==========================================================================
   2. Dates
   ======================================================================== */

/** Convertit une valeur d'API (ISO 8601) en `Date`. `null` si illisible. */
export function analyserDate(valeur: string | Date | null | undefined): Date | null {
  if (!valeur) return null;
  const date = valeur instanceof Date ? valeur : new Date(valeur);
  return Number.isNaN(date.getTime()) ? null : date;
}

const DATE_COURTE = new Intl.DateTimeFormat(LOCALE, {
  timeZone: FUSEAU,
  day: "2-digit",
  month: "2-digit",
  year: "numeric",
});

const DATE_LONGUE = new Intl.DateTimeFormat(LOCALE, {
  timeZone: FUSEAU,
  day: "numeric",
  month: "long",
  year: "numeric",
});

const DATE_HEURE = new Intl.DateTimeFormat(LOCALE, {
  timeZone: FUSEAU,
  day: "2-digit",
  month: "2-digit",
  year: "numeric",
  hour: "2-digit",
  minute: "2-digit",
});

const MOIS_ANNEE = new Intl.DateTimeFormat(LOCALE, {
  timeZone: FUSEAU,
  month: "long",
  year: "numeric",
});

/** `16/09/2026` — colonnes de tableau, formulaires. */
export function formaterDate(valeur: string | Date | null | undefined): string {
  const date = analyserDate(valeur);
  return date ? DATE_COURTE.format(date) : "—";
}

/** `16 septembre 2026` — en-tête de fiche, rapport imprimé. */
export function formaterDateLongue(valeur: string | Date | null | undefined): string {
  const date = analyserDate(valeur);
  return date ? DATE_LONGUE.format(date) : "—";
}

/** `16/09/2026 10:12` — journal d'audit, horodatage d'opération. */
export function formaterDateHeure(valeur: string | Date | null | undefined): string {
  const date = analyserDate(valeur);
  return date ? DATE_HEURE.format(date) : "—";
}

/** `septembre 2026` — période de déclaration CNPS, en-tête de rapport. */
export function formaterMoisAnnee(valeur: string | Date | null | undefined): string {
  const date = analyserDate(valeur);
  return date ? MOIS_ANNEE.format(date) : "—";
}

/** `du 01/09/2026 au 30/09/2026` — période de droits, période de rapport. */
export function formaterPeriode(
  debut: string | Date | null | undefined,
  fin: string | Date | null | undefined,
): string {
  const d = analyserDate(debut);
  const f = analyserDate(fin);
  if (!d && !f) return "—";
  if (!f) return `depuis le ${formaterDate(d)}`;
  if (!d) return `jusqu'au ${formaterDate(f)}`;
  return `du ${formaterDate(d)} au ${formaterDate(f)}`;
}

/** Valeur pour un `<input type="date">` : `2026-09-16`. */
export function formaterDateSaisie(valeur: string | Date | null | undefined): string {
  const date = analyserDate(valeur);
  if (!date) return "";
  // `en-CA` produit directement le format ISO court, avec le bon fuseau.
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: FUSEAU,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(date);
}

/**
 * Nombre de jours pleins écoulés depuis une date, dans le fuseau de Douala.
 * Sert au calcul d'affichage du retard, jamais à une décision métier : le
 * seuil de bascule en retard est le paramètre serveur `DELAI_RETARD_JOURS`.
 */
export function joursDepuis(valeur: string | Date | null | undefined): number | null {
  const date = analyserDate(valeur);
  if (!date) return null;
  const jour = 86_400_000;
  const debutDe = (d: Date) => Date.parse(`${formaterDateSaisie(d)}T00:00:00Z`);
  return Math.round((debutDe(new Date()) - debutDe(date)) / jour);
}

/** `3 jours` · `1 jour` · `aujourd'hui`. */
export function formaterAnciennete(valeur: string | Date | null | undefined): string {
  const jours = joursDepuis(valeur);
  if (jours === null) return "—";
  if (jours <= 0) return "aujourd'hui";
  if (jours === 1) return "1 jour";
  return `${NOMBRE_ENTIER.format(jours)} jours`;
}

/* ==========================================================================
   3. Identifiants et coordonnées
   ======================================================================== */

/**
 * Matricule adhérent : `COSITI-00042`. Normalise une saisie libre
 * (`cositi 42`, `42`) vers la forme canonique, pour la recherche comme pour
 * l'affichage. Une valeur non reconnue est renvoyée telle quelle.
 */
export function formaterMatricule(valeur: string | null | undefined): string {
  if (!valeur) return "—";
  const chiffres = valeur.replace(/\D/g, "");
  if (!chiffres) return valeur.trim().toUpperCase();
  return `COSITI-${chiffres.padStart(5, "0")}`;
}

/**
 * Téléphone camerounais à 9 chiffres : `677123456` -> `6 77 12 34 56`.
 * Un indicatif `+237` ou `237` en tête est retiré de l'affichage.
 */
export function formaterTelephone(valeur: string | null | undefined): string {
  if (!valeur) return "—";
  const chiffres = valeur.replace(/\D/g, "").replace(/^237/, "");
  if (chiffres.length !== 9) return valeur.trim();
  return `${chiffres[0]} ${chiffres.slice(1, 3)} ${chiffres.slice(3, 5)} ${chiffres.slice(5, 7)} ${chiffres.slice(7)}`;
}

/**
 * Téléphone partiellement masqué : `6•• ••• 937`. Format identique à celui
 * renvoyé par `POST /adherents/verifier-doublon`, où l'utilisateur doit
 * reconnaître un doublon sans lire le numéro complet d'un autre adhérent.
 */
export function masquerTelephone(valeur: string | null | undefined): string {
  if (!valeur) return "—";
  const chiffres = valeur.replace(/\D/g, "").replace(/^237/, "");
  if (chiffres.length !== 9) return "•••";
  return `${chiffres[0]}•• ••• ${chiffres.slice(6)}`;
}

/** Nom affiché : `NDONGO Marie Claire` — patronyme en capitales, prénoms en casse titre. */
export function formaterNomComplet(
  nom: string | null | undefined,
  prenoms: string | null | undefined,
): string {
  const n = (nom ?? "").trim().toUpperCase();
  const p = (prenoms ?? "")
    .trim()
    .toLowerCase()
    .replace(/(^|[\s'-])([a-zà-ÿ])/g, (_, sep: string, lettre: string) => sep + lettre.toUpperCase());
  return [n, p].filter(Boolean).join(" ") || "—";
}

/** Initiales pour un avatar : `NDONGO Marie` -> `NM`. */
export function initiales(valeur: string | null | undefined): string {
  if (!valeur) return "?";
  const mots = valeur.trim().split(/\s+/).slice(0, 2);
  return mots.map((m) => m[0]?.toUpperCase() ?? "").join("") || "?";
}

/** Identifiant technique abrégé pour l'audit : `a3f1c9d2-…` -> `a3f1c9d2`. */
export function abregerIdentifiant(valeur: string | null | undefined): string {
  if (!valeur) return "—";
  return valeur.split("-")[0] ?? valeur;
}
