/** Date du jour au format `AAAA-MM-JJ`, en heure locale (borne `max` des champs date, date par défaut des vues). */
export function aujourdhui(): string {
  const maintenant = new Date();
  return `${maintenant.getFullYear()}-${String(maintenant.getMonth() + 1).padStart(2, "0")}-${String(maintenant.getDate()).padStart(2, "0")}`;
}
