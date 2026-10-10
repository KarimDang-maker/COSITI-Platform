/** Mois courant au format `AAAA-MM`, attendu par `/agents/{id}/charge` et `/cotisations-resume`. */
export function moisCourant(): string {
  const maintenant = new Date();
  return `${maintenant.getFullYear()}-${String(maintenant.getMonth() + 1).padStart(2, "0")}`;
}

/** Vrai pour une valeur `AAAA-MM` bien formée — sinon l'appel serait refusé par `YearMonth.parse`. */
export function estMoisValide(valeur: string | null | undefined): valeur is string {
  return !!valeur && /^\d{4}-(0[1-9]|1[0-2])$/.test(valeur);
}

/** Bornes d'une journée saisie (`AAAA-MM-JJ`) en instants ISO, pour `GET /agents/{id}/operations`. */
export function debutJournee(date: string | undefined): string | undefined {
  return date ? new Date(`${date}T00:00:00`).toISOString() : undefined;
}

export function finJournee(date: string | undefined): string | undefined {
  return date ? new Date(`${date}T23:59:59.999`).toISOString() : undefined;
}
