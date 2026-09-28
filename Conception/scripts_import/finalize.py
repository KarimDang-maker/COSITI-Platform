import csv
import re
import unicodedata

DIR = r"C:\Users\abdel\code project\COSITI\COSITI-Platform\Conception\scripts_import"

def norm(s):
    if s is None:
        return ""
    s = s.strip()
    s = unicodedata.normalize("NFKD", s)
    s = "".join(c for c in s if not unicodedata.combining(c))
    s = re.sub(r"\s+", " ", s).strip().upper()
    return s

def to_iso(d):
    d = d.strip()
    day, month, year = d.split("/")
    return f"{year}-{month.zfill(2)}-{day.zfill(2)}"

def to_amount(s):
    s = s.replace("F", "").replace("\xa0", " ").replace(" ", "").strip()
    return int(s) if s else 0

DATE_FIXES = {
    "10/06/20236": "10/06/2026",
    "148/06/2026": "18/06/2026",
}

MODE_MAP = {
    "orange money": "ORANGE_MONEY",
    "espèces": "ESPECES",
    "especes": "ESPECES",
    "momo": "MTN_MOMO",
    "mtn": "MTN_MOMO",
    "non précisé": "ESPECES",  # hypothèse documentée : mode réel non capturé à la saisie d'origine
    "virement": "VIREMENT",
}

# ---------------- Adherents ----------------
adherents = []
with open(DIR + r"\adherents_clean.csv", encoding="utf-8") as f:
    for row in csv.DictReader(f):
        date_insc = row["date_inscription"].strip()
        date_insc = DATE_FIXES.get(date_insc, date_insc)
        adherents.append({
            "num": int(row["num"]),
            "nom": row["nom"].strip(),
            "contact": re.sub(r"\s+", "", row["contact"]) if row["contact"] else "",
            "date_inscription": to_iso(date_insc),
        })

# Adherente presente dans les paiements mais absente de la feuille "Adherents" source
# (paiement du 03/08/2026, sans fiche d'inscription correspondante dans le classeur d'origine).
adherents.append({
    "num": 173,
    "nom": "MEGOUANG FOMBA NELLY",
    "contact": "",
    "date_inscription": "2026-08-03",
})

with open(DIR + r"\adherents_final.csv", "w", newline="", encoding="utf-8") as f:
    w = csv.DictWriter(f, fieldnames=["num", "nom", "contact", "date_inscription"])
    w.writeheader()
    for a in adherents:
        w.writerow(a)

adh_by_norm = {}
for a in adherents:
    adh_by_norm.setdefault(norm(a["nom"]), []).append(a)

NAME_FIXES = {
    "MVOMO": "MVOMO GERMAIN",
}

# ---------------- Paiements ----------------
paiements = []
skipped_zero = 0
ref_counter = 0
with open(DIR + r"\paiements_clean.csv", encoding="utf-8") as f:
    for row in csv.DictReader(f):
        montant = to_amount(row["montant"])
        if montant <= 0:
            skipped_zero += 1
            continue
        date = row["date"].strip()
        if date == "24/07/2027":
            date = "24/07/2026"
        nom = row["nom"].strip()
        lookup_name = NAME_FIXES.get(nom, nom)
        key = norm(lookup_name)
        candidats = adh_by_norm.get(key)
        if not candidats:
            raise SystemExit(f"Aucun adherent pour paiement: {row}")
        num = candidats[0]["num"]

        mode_src = row["mode"].strip().lower()
        mode = MODE_MAP.get(mode_src)
        if mode is None:
            raise SystemExit(f"Mode de paiement non mappe: {row['mode']!r}")

        reference = ""
        if mode in ("ORANGE_MONEY", "MTN_MOMO"):
            ref_counter += 1
            reference = f"HIST-IMPORT-{ref_counter:04d}"

        paiements.append({
            "adherent_num": num,
            "date_paiement": to_iso(date),
            "montant": montant,
            "mode_paiement": mode,
            "reference_transaction": reference,
            "observation": row["obs"].strip(),
        })

with open(DIR + r"\paiements_final.csv", "w", newline="", encoding="utf-8") as f:
    w = csv.DictWriter(f, fieldnames=["adherent_num", "date_paiement", "montant", "mode_paiement", "reference_transaction", "observation"])
    w.writeheader()
    for p in paiements:
        w.writerow(p)

print(f"Adherents finaux: {len(adherents)}")
print(f"Paiements finaux: {len(paiements)} (montant=0 ignores: {skipped_zero})")
