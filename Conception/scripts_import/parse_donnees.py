import re
import csv
import unicodedata

SRC = r"C:\Users\abdel\code project\COSITI\COSITI-Platform\Conception\donnees.md"
OUT_DIR = r"C:\Users\abdel\code project\COSITI\COSITI-Platform\Conception\scripts_import"

def norm(s):
    if s is None:
        return ""
    s = s.strip()
    s = unicodedata.normalize("NFKD", s)
    s = "".join(c for c in s if not unicodedata.combining(c))
    s = re.sub(r"\s+", " ", s).strip().upper()
    return s

with open(SRC, encoding="utf-8") as f:
    lines = f.readlines()

# Locate section boundaries
paiements_start = None
adherents_start = None
adherents_end = None
for i, l in enumerate(lines):
    if l.startswith("PAIEMENTS DE COTISATIONS"):
        paiements_start = i
    if l.startswith("ADHÉRENTS — LISTE"):
        adherents_start = i
    if l.startswith("PARAMÈTRES GÉNÉRAUX"):
        adherents_end = i
        break

paiement_rows = lines[paiements_start+2:adherents_start]
adherent_rows = lines[adherents_start+2:adherents_end]

def split_row(line):
    parts = line.rstrip("\n").split("\t")
    return [p.strip() for p in parts]

paiements = []
for l in paiement_rows:
    if not l.strip():
        continue
    parts = split_row(l)
    if len(parts) < 4:
        continue
    date, nom, montant, mode = parts[0], parts[1], parts[2], parts[3]
    obs = parts[4] if len(parts) > 4 else ""
    if not date or not nom:
        continue
    paiements.append({"date": date, "nom": nom, "montant": montant, "mode": mode, "obs": obs})

adherents = []
for l in adherent_rows:
    if not l.strip():
        continue
    parts = split_row(l)
    if len(parts) < 5:
        continue
    if not parts[0].isdigit():
        continue
    num, nom, contact, date_insc, payee = parts[0], parts[1], parts[2], parts[3], parts[4]
    montant_insc = parts[5] if len(parts) > 5 else ""
    cotis = parts[6] if len(parts) > 6 else ""
    statut_cnps = parts[7] if len(parts) > 7 else ""
    date_decl = parts[8] if len(parts) > 8 else ""
    adherents.append({
        "num": num, "nom": nom, "contact": contact, "date_inscription": date_insc,
        "payee": payee, "montant_inscription": montant_insc, "cotisation_cumulee_declaree": cotis,
        "statut_cnps": statut_cnps, "date_declaration_cnps": date_decl,
    })

print(f"Paiements parses: {len(paiements)}")
print(f"Adherents parses: {len(adherents)}")

# Build name index for matching
adh_by_norm = {}
for a in adherents:
    key = norm(a["nom"])
    adh_by_norm.setdefault(key, []).append(a)

unmatched = []
for p in paiements:
    key = norm(p["nom"])
    if key not in adh_by_norm:
        unmatched.append(p["nom"])

print(f"Unmatched payment names: {len(set(unmatched))}")
for u in sorted(set(unmatched)):
    print("  -", repr(u))

# Write clean CSVs
with open(OUT_DIR + r"\adherents_clean.csv", "w", newline="", encoding="utf-8") as f:
    w = csv.DictWriter(f, fieldnames=["num","nom","contact","date_inscription","payee","montant_inscription","cotisation_cumulee_declaree","statut_cnps","date_declaration_cnps"])
    w.writeheader()
    for a in adherents:
        w.writerow(a)

with open(OUT_DIR + r"\paiements_clean.csv", "w", newline="", encoding="utf-8") as f:
    w = csv.DictWriter(f, fieldnames=["date","nom","montant","mode","obs"])
    w.writeheader()
    for p in paiements:
        w.writerow(p)

print("Done.")
