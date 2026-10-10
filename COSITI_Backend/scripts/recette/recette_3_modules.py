"""Recette fonctionnelle des 3 modules (adhérents, cotisations, agents de terrain) contre l'API réelle.

Usage : COSITI_RECETTE_MOT_DE_PASSE=... python recette_3_modules.py [URL_API] [FICHIER_JOURNAL]
(par défaut http://localhost:8083/api/v1 — une instance de recette sur un schéma vierge, jamais la base de travail).

Chaque étape : rôle, méthode, chemin, statut attendu (règle métier) -> OK / KO. Toutes les requêtes sont journalisées
(horodatage, rôle, statut, identifiant de corrélation, extrait de réponse) dans le fichier passé en argument.
"""
import datetime
import io
import json
import sys
import time
import urllib.error
import urllib.request
import uuid

BASE = sys.argv[1] if len(sys.argv) > 1 else "http://localhost:8083/api/v1"
JOURNAL = sys.argv[2] if len(sys.argv) > 2 else "recette.log"
import os

# Mot de passe des comptes de démonstration (profil dev) : fourni par l'environnement, jamais versionné (AGENTS.md
# règle 8), comme pour la recette E2E (COSITI_E2E_MOT_DE_PASSE).
MDP = os.environ.get("COSITI_RECETTE_MOT_DE_PASSE")
if not MDP:
    raise SystemExit("COSITI_RECETTE_MOT_DE_PASSE n'est pas défini : la recette ne fabrique pas de mot de passe.")
ROLES = {"gest": "demo.gestionnaire", "dga": "demo.dga", "dg": "demo.dg", "daf": "demo.daf", "pca": "demo.pca",
         "agent": "demo.agent", "chef": "demo.chef", "sa": "demo.superadmin"}
SUFFIXE = uuid.uuid4().hex[:6]
AUJ = datetime.date.today().isoformat()

journal = open(JOURNAL, "w", encoding="utf-8")
resultats = []
jetons = {}
ctx = {}
module_courant = ["?"]


def log(ligne):
    journal.write(ligne + "\n")
    journal.flush()


def requete(methode, chemin, role=None, corps=None, entetes=None, multipart=None):
    url = BASE + chemin
    h = {"Accept": "application/json", "X-Trace-Id": "recette-" + uuid.uuid4().hex[:12]}
    data = None
    if multipart:
        borne = "----recette" + uuid.uuid4().hex
        nom, contenu, mime = multipart
        corps_mp = io.BytesIO()
        corps_mp.write(f"--{borne}\r\nContent-Disposition: form-data; name=\"fichier\"; filename=\"{nom}\"\r\n"
                       f"Content-Type: {mime}\r\n\r\n".encode())
        corps_mp.write(contenu)
        corps_mp.write(f"\r\n--{borne}--\r\n".encode())
        data = corps_mp.getvalue()
        h["Content-Type"] = "multipart/form-data; boundary=" + borne
    elif corps is not None:
        data = json.dumps(corps).encode()
        h["Content-Type"] = "application/json"
    if role:
        h["Authorization"] = "Bearer " + jeton(role)
    if entetes:
        h.update(entetes)
    req = urllib.request.Request(url, method=methode, data=data, headers=h)
    debut = time.time()
    try:
        r = urllib.request.urlopen(req, timeout=60)
        statut, texte = r.status, r.read().decode("utf-8", "replace")
    except urllib.error.HTTPError as e:
        statut, texte = e.code, e.read().decode("utf-8", "replace")
    duree = int((time.time() - debut) * 1000)
    try:
        js = json.loads(texte) if texte else None
    except ValueError:
        js = None
    return statut, js, texte, h["X-Trace-Id"], duree


def jeton(role):
    if role not in jetons:
        s, js, t, _, _ = requete("POST", "/auth/connexion", corps={"identifiant": ROLES[role], "motDePasse": MDP})
        if s != 200:
            raise SystemExit(f"Connexion impossible pour {role}: {s} {t[:200]}")
        jetons[role] = js["jetonAcces"]
        jetons[role + "_t"] = time.time()
    elif time.time() - jetons[role + "_t"] > 600:  # jeton de 15 min : renouvelé avant expiration
        del jetons[role]
        return jeton(role)
    return jetons[role]


def module(nom):
    module_courant[0] = nom
    log(f"\n===== {nom} =====")


def etape(nom, role, methode, chemin, attendu=200, corps=None, entetes=None, multipart=None, verifier=None):
    statut, js, texte, trace, duree = requete(methode, chemin, role, corps, entetes, multipart)
    attendus = attendu if isinstance(attendu, (list, tuple, set)) else [attendu]
    ok = statut in attendus
    detail = ""
    if ok and verifier:
        try:
            r = verifier(js)
            if r is not True and r is not None:
                ok, detail = False, str(r)
        except Exception as e:  # noqa
            ok, detail = False, f"vérification : {e!r}"
    code = js.get("code") if isinstance(js, dict) else None
    resultats.append({"module": module_courant[0], "etape": nom, "role": role, "methode": methode, "chemin": chemin,
                      "attendu": attendus, "statut": statut, "ok": ok, "code": code, "detail": detail,
                      "extrait": texte[:300]})
    log(f"{datetime.datetime.now().isoformat(timespec='seconds')} [{'OK' if ok else 'KO'}] {module_courant[0]} | "
        f"{nom} | {role} {methode} {chemin} -> {statut} (attendu {attendus}) {duree}ms trace={trace}"
        + (f" code={code}" if code else "") + (f" | {detail}" if detail else "")
        + ("" if ok else f"\n      réponse : {texte[:500]}"))
    return js


def png():
    entete = bytes.fromhex("89504E470D0A1A0A0000000D4948445200000001000000010806000000"
                           "1F15C4890000000D49444154789C6360000002000154A24F5D0000000049454E44AE426082")
    return entete + uuid.uuid4().hex.encode()


def pdf():
    return b"%PDF-1.4\n%recette " + uuid.uuid4().hex.encode() + b"\n%%EOF\n"


def tel():
    return "6" + str(uuid.uuid4().int)[:8]


# =====================================================================================================
def module_agents():
    module("AGENTS DE TERRAIN")
    zones = etape("Lister les zones", "gest", "GET", "/zones")
    z = etape("Créer une zone (DGA)", "dga", "POST", "/zones", 201,
              {"code": "ZR-" + SUFFIXE, "libelle": "Zone recette " + SUFFIXE, "ville": "Douala", "region": "Littoral"})
    ctx["zone"] = z["id"] if z else (zones[0]["id"] if zones else None)
    etape("Modifier une zone", "dga", "PUT", f"/zones/{ctx['zone']}", 200,
          {"code": "ZR-" + SUFFIXE, "libelle": "Zone recette " + SUFFIXE + " (maj)", "ville": "Douala",
           "region": "Littoral"})
    etape("Consulter une zone", "gest", "GET", f"/zones/{ctx['zone']}")
    zg = etape("Créer une zone (Gestionnaire, ORGANISATION:GERER_ZONES)", "gest", "POST", "/zones", 201,
               {"code": "ZG-" + SUFFIXE, "libelle": "Zone gestionnaire", "ville": "Douala", "region": "Littoral"})
    etape("Modifier ville et région d'une zone", "gest", "PUT", f"/zones/{zg['id']}", 200,
          {"code": "ZG-" + SUFFIXE, "libelle": "Zone gestionnaire", "ville": "Edéa", "region": "Littoral"},
          verifier=lambda js: js.get("ville") == "Edéa" or f"ville={js.get('ville')}")
    etape("Changer le code d'une zone -> 400", "gest", "PUT", f"/zones/{zg['id']}", 400,
          {"code": "ZX-" + SUFFIXE, "libelle": "Zone gestionnaire", "ville": "Edéa", "region": "Littoral"})
    etape("Code de zone déjà utilisé -> 409", "gest", "POST", "/zones", 409,
          {"code": "ZG-" + SUFFIXE, "libelle": "x", "ville": "x", "region": "x"})
    etape("Créer une zone sans permission (Agent)", "agent", "POST", "/zones", 403,
          {"code": "ZX-" + SUFFIXE, "libelle": "x", "ville": "x", "region": "x"})

    for i in (1, 2, 3):
        a = etape(f"Créer l'agent {i} (DGA)", "dga", "POST", "/agents", 201,
                  {"identifiantConnexion": f"agent.r{i}.{SUFFIXE}", "nomComplet": f"Agent Recette {i} {SUFFIXE}",
                   "telephone": tel(), "zoneId": ctx["zone"], "objectifCollecteMensuel": 50000},
                  verifier=lambda js: "motDePasseInitial" in json.dumps(js) or "mot de passe initial absent")
        if a:
            ctx[f"agent{i}"] = (a.get("agent") or a).get("id")
    etape("Créer un agent sans être DGA (Gestionnaire)", "gest", "POST", "/agents", 403,
          {"identifiantConnexion": "x." + SUFFIXE, "nomComplet": "X", "telephone": tel(), "zoneId": ctx["zone"]})
    a1 = ctx.get("agent1")
    etape("Lister les agents", "gest", "GET", "/agents?taille=50")
    etape("Consulter un agent", "dga", "GET", f"/agents/{a1}")
    ag = etape("Statut de validation du profil", "dga", "GET", f"/agents/{a1}/statut-validation")
    etape("Modifier un agent (profil non validé : direct)", "dga", "PUT", f"/agents/{a1}", [200, 409],
          {"nomComplet": f"Agent Recette 1 {SUFFIXE} bis", "telephone": tel(), "zoneId": ctx["zone"],
           "objectifCollecteMensuel": 60000})
    d = etape("Soumettre le profil à validation", "dga", "POST", f"/agents/{a1}/soumettre", [200, 201],
              {"motif": "Profil complet"})
    if d and d.get("id"):
        etape("Valider le profil (DG, V23)", "dg", "POST", f"/demandes-validation/{d['id']}/approuver", 200,
              {"commentaire": "Conforme"})
        etape("Profil validé", "dga", "GET", f"/agents/{a1}/statut-validation",
              verifier=lambda js: js.get("statutValidation") == "VALIDE" or f"statut {js}")
    etape("Historique de validation de l'agent", "dga", "GET", f"/agents/{a1}/historique-validation")

    etape("Désigner un Chef (DGA)", "dga", "POST", f"/agents/{a1}/designer-chef", 200, {"motif": "Désignation recette"})
    etape("Chef actuel de la zone", "gest", "GET", f"/agents/chef?zoneId={ctx['zone']}",
          verifier=lambda js: js.get("id") == a1 or f"chef {js}")
    etape("Seconde désignation refusée", "dga", "POST", f"/agents/{ctx.get('agent2')}/designer-chef", 409,
          {"motif": "Doublon"})
    etape("Remplacer le Chef", "dga", "POST", f"/agents/{ctx.get('agent2')}/remplacer-chef", 200,
          {"motif": "Remplacement recette"})
    etape("Historique des Chefs", "dga", "GET", f"/agents/{ctx.get('agent2')}/historique-chef")
    etape("Désigner un Chef sans être DGA (Gestionnaire)", "gest", "POST", f"/agents/{ctx.get('agent3')}/designer-chef",
          403, {"motif": "x"})

    etape("Demande de modification d'un agent", "dga", "POST", f"/agents/{a1}/demandes-modification", [201, 200],
          {"motif": "Nouveau téléphone", "elements": [{"champ": "telephone", "valeurProposee": tel()}]})
    dm = etape("Demandes de modification de l'agent", "dga", "GET", f"/agents/{a1}/demandes-modification")
    lst = dm.get("contenu", dm) if isinstance(dm, dict) else dm
    if lst:
        etape("Approuver la modification de l'agent (DG)", "dg", "POST",
              f"/demandes-validation/{lst[0]['id']}/approuver", 200, {"commentaire": "OK"})
    a3 = ctx.get("agent3")
    etape("Changement de statut d'un profil non validé : refusé par demande", "dga", "POST",
          f"/agents/{a3}/demandes-changement-statut", 409, {"actif": False, "motif": "Départ"})
    etape("Changement de statut direct sans changement -> 409", "dga", "POST", f"/agents/{a3}/statut", 409,
          {"actif": True, "motif": "Retour"})
    d3 = etape("Soumettre le profil de l'agent 3", "dga", "POST", f"/agents/{a3}/soumettre", 200, {"motif": "Complet"})
    etape("Auteur de la soumission (DGA) : auto-validation refusée", "dga", "POST",
          f"/demandes-validation/{d3['id']}/approuver", 403, {"commentaire": "OK"})
    etape("Valider le profil de l'agent 3 (DG)", "dg", "POST", f"/demandes-validation/{d3['id']}/approuver", 200,
          {"commentaire": "OK"})
    etape("Profil 3 validé", "dga", "GET", f"/agents/{a3}/statut-validation",
          verifier=lambda js: js.get("statutValidation") == "VALIDE" or f"{js}")
    etape("Profil validé : modification directe refusée", "dga", "PUT", f"/agents/{a3}", 409,
          {"nomComplet": "X", "telephone": tel(), "zoneId": ctx["zone"]})
    dcs = etape("Demande de changement de statut (désactivation)", "dga", "POST",
                f"/agents/{a3}/demandes-changement-statut", [200, 201], {"actif": False, "motif": "Départ"})
    etape("Approuver la désactivation (DG)", "dg", "POST", f"/demandes-validation/{dcs['id']}/approuver", 200,
          {"commentaire": "OK"})
    etape("Agent 3 désactivé", "dga", "GET", f"/agents/{a3}",
          verifier=lambda js: js.get("actif") is False or f"actif={js.get('actif')}")
    etape("Demandes de changement de statut", "dga", "GET", f"/agents/{a3}/demandes-changement-statut")
    ctx["demandes_agent"] = dm
    etape("Opérations de l'agent", "dga", "GET", f"/agents/{a1}/operations")
    etape("Distribution des portefeuilles", "dga", "GET", "/agents/portefeuille-distribution")
    etape("Charge mensuelle", "dga", "GET", f"/agents/{a1}/charge?periode={AUJ[:7]}")
    etape("Charge : période illisible -> 400", "dga", "GET", f"/agents/{a1}/charge?periode=1", 400)
    etape("Résumé des cotisations de l'agent", "dga", "GET", f"/agents/{a1}/cotisations-resume?periode={AUJ[:7]}")


def module_adherents():
    module("ADHÉRENTS")
    activites = etape("Référentiel activités", "gest", "GET", "/activites")
    ctx["activite"] = activites[0]["id"]
    packs = etape("Référentiel packs", "gest", "GET", "/packs")
    ctx["pack"] = packs[0]["id"]
    etape("Référentiel associations", "gest", "GET", "/associations")
    etape("Exigences documentaires", "gest", "GET", "/exigences-documentaires?enVigueur=true",
          verifier=lambda js: all(e.get("statutValidation") == "C" for e in js) or "exigence non confirmée")

    def creer(nom, attendu=201, **extra):
        corps = {"nom": nom, "prenoms": "Recette", "telephonePrincipal": tel(), "activiteId": ctx["activite"],
                 "dateAdhesion": AUJ, "quartier": "Akwa", "ville": "Douala", "consentementDonnees": True,
                 "confirmationDoublonIgnore": True, "sexe": "F", "dateNaissance": "1990-04-12",
                 "numeroCni": "CNI" + uuid.uuid4().hex[:8].upper(), "email": f"{nom.lower()}@exemple.cm",
                 "whatsapp": tel()}
        corps.update(extra)
        return etape(f"Créer l'adhérent {nom} (sans zone ni localisation, V23)", "gest", "POST", "/adherents", attendu,
                     corps)

    noms = ["Ateba" + SUFFIXE, "Mballa" + SUFFIXE, "Ngono" + SUFFIXE, "Fouda" + SUFFIXE]
    crees = [creer(n) for n in noms]
    for i, a in enumerate(crees):
        ctx[f"adh{i}"] = a["id"]
        ctx[f"mat{i}"] = a["matricule"]
    a0 = ctx["adh0"]
    etape("Créer sans activité -> 400", "gest", "POST", "/adherents", 400,
          {"nom": "Sans", "telephonePrincipal": tel(), "dateAdhesion": AUJ})
    etape("Créer sans permission (DAF)", "daf", "POST", "/adherents", 403,
          {"nom": "Daf", "telephonePrincipal": tel(), "activiteId": ctx["activite"], "dateAdhesion": AUJ})
    etape("Doublon téléphone -> 409", "gest", "POST", "/adherents", 409,
          {"nom": "Doublon", "telephonePrincipal": crees[1]["telephonePrincipal"], "activiteId": ctx["activite"],
           "dateAdhesion": AUJ})
    etape("Vérifier un doublon sans zone (V23)", "gest", "POST", "/adherents/verifier-doublon", 200,
          {"nomComplet": noms[0] + " Recette", "telephonePrincipal": tel()},
          verifier=lambda js: len(js.get("candidats", [])) >= 1 or "similarité de nom non détectée")
    etape("Lister / rechercher", "gest", "GET", f"/adherents?recherche={noms[0]}&taille=10",
          verifier=lambda js: js["totalElements"] >= 1 or "introuvable")
    etape("Tri invalide -> 400", "gest", "GET", "/adherents?tri=XYZ", 400)
    etape("Consulter par matricule (casse libre)", "gest", "GET", f"/adherents/matricule/{ctx['mat0'].lower()}")
    etape("Consulter la fiche", "gest", "GET", f"/adherents/{a0}",
          verifier=lambda js: ("latitude" not in js and js.get("zoneId") is None) or "géolocalisation exposée / zone")
    etape("Complétion", "gest", "GET", f"/adherents/{a0}/completion",
          verifier=lambda js: all(c.get("cle") != "GEOLOCALISATION" for c in js.get("champsManquants", []))
          or "GEOLOCALISATION encore exigée")
    etape("Champs manquants", "gest", "GET", f"/adherents/{a0}/champs-manquants")
    etape("État du dossier", "gest", "GET", f"/adherents/{a0}/dossier")
    etape("Dossier complet", "gest", "GET", f"/adherents/{a0}/dossier-complet")
    etape("Documents manquants", "gest", "GET", f"/adherents/{a0}/documents-manquants")
    etape("Checklist documentaire", "gest", "GET", f"/adherents/{a0}/checklist-documentaire")
    etape("Coordonnées", "gest", "GET", f"/adherents/{a0}/coordonnees",
          verifier=lambda js: "latitude" not in js or "latitude exposée")
    etape("Modifier les coordonnées", "gest", "PUT", f"/adherents/{a0}/coordonnees", 200,
          {"telephonePrincipal": tel(), "localisation": "Marché central", "quartier": "Akwa", "ville": "Douala",
           "latitude": 4.05, "longitude": 9.7})
    etape("Infos professionnelles", "gest", "GET", f"/adherents/{a0}/professionnel")
    etape("Modifier les infos professionnelles", "gest", "PUT", f"/adherents/{a0}/professionnel", 200,
          {"activiteId": ctx["activite"], "numeroCnps": "CNPS" + SUFFIXE})
    etape("Compléter le profil", "gest", "PATCH", f"/adherents/{a0}/profil", 200, {"telephoneSecondaire": tel()})
    fiche = etape("Relire la fiche", "gest", "GET", f"/adherents/{a0}")
    etape("Modifier la fiche (PUT)", "gest", "PUT", f"/adherents/{a0}", 200,
          {"nom": noms[0], "prenoms": "Recette Modifié", "telephonePrincipal": fiche["telephonePrincipal"],
           "activiteId": ctx["activite"], "quartier": "Akwa", "ville": "Douala", "version": fiche["version"]})
    etape("PUT avec version obsolète -> 409", "gest", "PUT", f"/adherents/{a0}", 409,
          {"nom": noms[0], "telephonePrincipal": fiche["telephonePrincipal"], "version": 0})
    etape("Modifier sans permission (DAF)", "daf", "PUT", f"/adherents/{a0}/coordonnees", 403,
          {"telephonePrincipal": tel(), "localisation": "x"})
    etape("Agent hors portefeuille : fiche refusée", "agent", "GET", f"/adherents/{a0}", 403)

    # --- documents
    for i in range(4):
        aid = ctx[f"adh{i}"]
        d = etape(f"Téléverser la CNI ({i}) avec dates (ignorées, V23)", "gest", "POST",
                  f"/documents?type=CNI&adherentId={aid}&valideDu=2020-01-01&valideJusquau=2021-01-01", 201,
                  multipart=("cni.png", png(), "image/png"),
                  verifier=lambda js: (js.get("valideJusquau") is None and not js.get("expire")) or "validité CNI conservée")
        ctx[f"cni{i}"] = d and d["id"]
        f = etape(f"Téléverser le formulaire d'adhésion ({i})", "gest", "POST",
                  f"/documents?type=FORMULAIRE_ADHESION&adherentId={aid}", 201,
                  multipart=("formulaire.pdf", pdf(), "application/pdf"))
        ctx[f"form{i}"] = f and f["id"]
    ctx["png_double"] = png()
    etape("Téléverser une pièce", "gest", "POST", f"/documents?type=JUSTIFICATIF_RESIDENCE&adherentId={a0}", 201,
          multipart=("residence.png", ctx["png_double"], "image/png"))
    etape("Même fichier deux fois -> 409", "gest", "POST", f"/documents?type=JUSTIFICATIF_RESIDENCE&adherentId={a0}",
          409, multipart=("residence.png", ctx["png_double"], "image/png"))
    etape("Fichier non autorisé (texte) -> 400/415", "gest", "POST", f"/documents?type=CNI&adherentId={a0}",
          [400, 415], multipart=("x.txt", b"bonjour", "text/plain"))
    etape("Lister les documents de l'adhérent", "gest", "GET", f"/documents?adherentId={a0}")
    etape("Métadonnées d'un document", "gest", "GET", f"/documents/{ctx['cni0']}/metadonnees")
    etape("Télécharger un document", "gest", "GET", f"/documents/{ctx['cni0']}", 200)
    etape("Marquer un document vérifié (Gestionnaire)", "gest", "POST", f"/documents/{ctx['form3']}/statut", 200,
          {"statut": "VERIFIE", "motif": "Pièce lisible"})
    etape("Statut de document sans permission (DAF)", "daf", "POST", f"/documents/{ctx['form3']}/statut", 403,
          {"statut": "REJETE", "motif": "x"})

    # --- frais d'adhésion, activation, contrôle DGA
    module("ADHÉRENTS — frais, activation, contrôle DGA")
    etape("Configuration du frais", "gest", "GET", "/frais-adhesion/configuration",
          verifier=lambda js: js.get("regleValidee") is True or "regleValidee=false")
    for i in range(4):
        aid = ctx[f"adh{i}"]
        fr = etape(f"Enregistrer le frais d'adhésion ({i})", "gest", "POST", f"/adherents/{aid}/frais-adhesion", 201,
                   {"agentId": ctx["agent1"], "montantRecu": 1000 if i != 3 else 800, "dateCollecte": AUJ,
                    "cleIdempotence": uuid.uuid4().hex})
        ctx[f"frais{i}"] = fr and fr["id"]
        ctx[f"frais{i}_v"] = fr and fr.get("version")
    etape("Frais de l'adhérent", "gest", "GET", f"/adherents/{a0}/frais-adhesion")
    etape("Second frais pour le même adhérent -> 409", "gest", "POST", f"/adherents/{a0}/frais-adhesion", 409,
          {"agentId": ctx["agent1"], "montantRecu": 1000, "dateCollecte": AUJ})
    etape("Gestionnaire : liste des frais refusée (V23 §6)", "gest", "GET", "/frais-adhesion", 403)
    etape("DAF : liste des frais", "daf", "GET", "/frais-adhesion")
    etape("DAF : synthèse des frais", "daf", "GET", "/frais-adhesion/synthese")
    etape("DAF : rapprochement des frais", "daf", "GET", "/frais-adhesion/rapprochement")
    etape("Synthèse des frais d'un agent", "dga", "GET", f"/frais-adhesion/agents/{ctx['agent1']}/synthese")
    etape("Consulter un frais", "daf", "GET", f"/frais-adhesion/{ctx['frais0']}")
    etape("Gestionnaire ne valide pas le frais (403)", "gest", "POST", f"/frais-adhesion/{ctx['frais0']}/valider", 403)
    for i in range(3):
        etape(f"DAF valide le frais ({i})", "daf", "POST", f"/frais-adhesion/{ctx[f'frais{i}']}/valider", 200)
    etape("DAF signale une anomalie (frais 3, montant 800)", "daf", "POST", f"/frais-adhesion/{ctx['frais3']}/anomalie",
          200, {"motif": "Montant insuffisant"})
    etape("DAF résout l'anomalie", "daf", "POST", f"/frais-adhesion/{ctx['frais3']}/resoudre-anomalie", 200,
          {"resolution": "Complément reçu", "montantRecuCorrige": 1000})
    etape("DAF valide le frais (3) après résolution", "daf", "POST", f"/frais-adhesion/{ctx['frais3']}/valider", 200)

    etape("Vérification avant activation", "gest", "GET", f"/adherents/{a0}/activation")
    etape("Statut d'activation", "gest", "GET", f"/adherents/{a0}/statut-activation")
    for i in range(4):
        aid = ctx[f"adh{i}"]
        ver = etape(f"Relire avant activation ({i})", "gest", "GET", f"/adherents/{aid}")
        etape(f"Activer l'adhérent ({i})", "gest", "POST", f"/adherents/{aid}/activer", 200,
              {"versionBase": ver["version"], "ignorerDoublons": True},
              verifier=lambda js: "ACTIF" in json.dumps(js) or "non actif")
    etape("Activer sans permission (DGA)", "dga", "POST", f"/adherents/{a0}/activer", 403, {})
    etape("Synthèse workflow", "gest", "GET", f"/adherents/{a0}/synthese-workflow")
    ctrl = etape("Contrôle DGA courant", "gest", "GET", f"/adherents/{a0}/controle-dga")
    etape("Contrôles DGA de l'adhérent", "gest", "GET", f"/adherents/{a0}/controles-dga")
    etape("File du contrôle DGA (DG, V23)", "dg", "GET", "/controles-dga")
    etape("Synthèse du contrôle DGA", "dga", "GET", "/controles-dga/synthese")
    cid = ctrl and ctrl.get("id")
    if cid:
        etape("Gestionnaire ne démarre pas un contrôle (403)", "gest", "POST", f"/controles-dga/{cid}/demarrer", 403)
        c = etape("Démarrer le contrôle (DG, V23)", "dg", "POST", f"/controles-dga/{cid}/demarrer", 200)
        c = etape("Lire le contrôle", "dg", "GET", f"/controles-dga/{cid}")
        for doc in c.get("documents", []):
            # Un constat sur un document entier ne sert qu'à le déclarer manquant ou illisible ; la conformité se
            # vérifie information par information (ci-dessous).
            etape(f"Constat « conforme » sur un document entier refusé ({doc.get('typeDocument')})", "dg", "POST",
                  f"/controles-dga/{cid}/documents/{doc['id']}/verifier", 400,
                  {"statut": "CORRESPOND", "commentaire": "Conforme"})
            break
        c = etape("Relire le contrôle", "dg", "GET", f"/controles-dga/{cid}")
        for doc in c.get("documents", []):
            for ch in doc.get("champs", []):
                etape(f"Vérifier le champ {ch.get('champ')}", "dg", "POST",
                      f"/controles-dga/{cid}/champs/{ch['id']}/verifier", 200,
                      {"statutCorrespondance": "CORRESPOND", "version": ch.get("version")})
        etape("Terminer : valider", "dg", "POST", f"/controles-dga/{cid}/terminer", 200,
              {"decision": "VALIDER", "commentaire": "Conforme", "cleIdempotence": uuid.uuid4().hex})
        etape("Journal du contrôle", "dga", "GET", f"/controles-dga/{cid}/journal")
    c1 = etape("Contrôle DGA de l'adhérent 1", "gest", "GET", f"/adherents/{ctx['adh1']}/controle-dga")
    if c1 and c1.get("id"):
        etape("Démarrer (DGA)", "dga", "POST", f"/controles-dga/{c1['id']}/demarrer", 200)
        etape("Terminer : demander une correction", "dga", "POST", f"/controles-dga/{c1['id']}/terminer", 200,
              {"decision": "DEMANDER_CORRECTION", "commentaire": "Photo illisible", "cleIdempotence": uuid.uuid4().hex})
        etape("Retransmettre au contrôle DGA", "gest", "POST", f"/adherents/{ctx['adh1']}/soumettre-dga", [200, 201],
              {"commentaire": "Photo remplacée"})

    etape("Statut de validation : VALIDE après contrôle DGA", "gest", "GET", f"/adherents/{a0}/statut-validation",
          verifier=lambda js: js.get("statutValidation") == "VALIDE" or f"{js}")

    # --- workflow : validation du dossier
    module("ADHÉRENTS — workflow de modification officielle")
    etape("Soumission directe du dossier : passe par l'activation + contrôle DGA", "gest", "POST",
          f"/adherents/{ctx['adh2']}/soumettre", 409, {"motif": "x"})
    f1 = etape("Fiche (dossier validé par le contrôle DGA)", "gest", "GET", f"/adherents/{a0}")
    dv = etape("Demande de modification à examiner", "gest", "POST", f"/adherents/{a0}/demandes-modification",
               [200, 201], {"motif": "Nouvel e-mail", "versionBase": f1["version"],
                            "elements": [{"champ": "email", "valeurProposee": f"nouveau.{SUFFIXE}@exemple.cm"}]})
    ctx["dem_dossier"] = dv and dv.get("id")
    etape("Gestionnaire : aucune demande à décider (V23)", "gest", "GET", "/demandes-validation/en-attente",
          verifier=lambda js: (js.get("totalElements", len(js.get("contenu", []))) == 0) or f"{js.get('totalElements')} demandes")
    etape("DGA : demande visible", "dga", "GET", "/demandes-validation/en-attente",
          verifier=lambda js: any(d["id"] == ctx["dem_dossier"] for d in js["contenu"]) or "demande absente")
    etape("PCA : aucune décision (403)", "pca", "POST", f"/demandes-validation/{ctx['dem_dossier']}/approuver", 403,
          {"commentaire": "x"})
    etape("Gestionnaire : approbation refusée (403)", "gest", "POST",
          f"/demandes-validation/{ctx['dem_dossier']}/approuver", 403, {"commentaire": "x"})
    etape("Détail de la demande", "gest", "GET", f"/demandes-validation/{ctx['dem_dossier']}")
    etape("Éléments de la demande", "dga", "GET", f"/demandes-validation/{ctx['dem_dossier']}/elements")
    etape("Joindre un justificatif", "gest", "POST", f"/demandes-validation/{ctx['dem_dossier']}/justificatifs",
          [200, 201, 409], {"documentId": ctx["form0"]})
    etape("Justificatifs", "dga", "GET", f"/demandes-validation/{ctx['dem_dossier']}/justificatifs")
    etape("Approuver la modification (DG, V23)", "dg", "POST", f"/demandes-validation/{ctx['dem_dossier']}/approuver", 200,
          {"commentaire": "Dossier conforme"})
    etape("Décisions de la demande", "dga", "GET", f"/demandes-validation/{ctx['dem_dossier']}/decisions")
    f2 = etape("Fiche validée", "gest", "GET", f"/adherents/{a0}",
               verifier=lambda js: js.get("email") == f"nouveau.{SUFFIXE}@exemple.cm" or f"{js.get('email')}")
    etape("Dossier validé : modification directe refusée", "gest", "PUT", f"/adherents/{a0}/coordonnees", 409,
          {"telephonePrincipal": tel(), "localisation": "x"})
    dm = etape("Demande de modification (dossier validé)", "gest", "POST", f"/adherents/{a0}/demandes-modification",
               [200, 201], {"motif": "Changement de quartier", "versionBase": f2["version"],
                            "elements": [{"champ": "quartier", "valeurProposee": "Bonapriso"}]})
    if dm:
        etape("Demander une correction (DGA)", "dga", "POST", f"/demandes-validation/{dm['id']}/demander-correction",
              200, {"commentaire": "Préciser le quartier"})
        etape("Resoumettre corrigée", "gest", "POST", f"/demandes-validation/{dm['id']}/resoumettre", 200,
              {"commentaire": "Corrigé", "elements": [{"champ": "quartier", "valeurProposee": "Bonapriso Nord"}]})
        etape("Approuver la modification (DGA)", "dga", "POST", f"/demandes-validation/{dm['id']}/approuver", 200,
              {"commentaire": "OK"})
        etape("Modification appliquée", "gest", "GET", f"/adherents/{a0}/coordonnees",
              verifier=lambda js: js.get("quartier") == "Bonapriso Nord" or f"quartier {js.get('quartier')}")
    dm2 = etape("Demande à rejeter", "gest", "POST", f"/adherents/{a0}/demandes-modification", [200, 201],
                {"motif": "Erreur", "elements": [{"champ": "ville", "valeurProposee": "Yaoundé"}]})
    if dm2:
        etape("Rejeter (DGA)", "dga", "POST", f"/demandes-validation/{dm2['id']}/rejeter", 200,
              {"commentaire": "Non justifié"})
    dm3 = etape("Demande à annuler (brouillon)", "gest", "POST", f"/adherents/{a0}/demandes-modification", [200, 201],
                {"motif": "Test", "brouillon": True, "elements": [{"champ": "ville", "valeurProposee": "Kribi"}]})
    if dm3:
        etape("Soumettre le brouillon", "gest", "POST", f"/demandes-validation/{dm3['id']}/soumettre", 200, {})
        etape("Annuler la demande", "gest", "POST", f"/demandes-validation/{dm3['id']}/annuler", 200,
              {"commentaire": "Abandon"})
    etape("Demandes de modification de l'adhérent", "gest", "GET", f"/adherents/{a0}/demandes-modification")
    if dm:
        etape("Détail d'une demande de modification", "gest", "GET",
              f"/adherents/{a0}/demandes-modification/{dm['id']}")
    f3 = etape("Relire avant demande générique", "gest", "GET", f"/adherents/{a0}")
    dg_ = etape("Créer une demande (route générique)", "gest", "POST", "/demandes-validation", [200, 201],
                {"typeOperation": "ADHERENT_MODIFICATION", "entiteId": a0, "motif": "Sexe corrigé",
                 "versionBase": f3["version"], "soumettre": True,
                 "elements": [{"champ": "sexe", "valeurProposee": "M"}]})
    if dg_:
        etape("Approuver la demande générique (DGA)", "dga", "POST", f"/demandes-validation/{dg_['id']}/approuver",
              200, {"commentaire": "OK"})
    etape("Historique de validation", "gest", "GET", f"/adherents/{a0}/historique-validation")
    etape("Liste des demandes (filtre)", "dga", "GET", "/demandes-validation?taille=5")

    # --- statut, pack, archivage, relances, agent
    etape("Changer de pack", "gest", "POST", f"/adherents/{ctx['adh2']}/pack", 200,
          {"packId": ctx["pack"], "effetLe": AUJ})
    etape("Changement de statut direct (dossier non validé)", "gest", "POST", f"/adherents/{ctx['adh2']}/statut",
          [204, 409], {"statut": "INACTIF", "motif": "Recette"})
    etape("Changement de statut sans motif -> 400", "gest", "POST", f"/adherents/{ctx['adh2']}/statut", 400,
          {"statut": "ACTIF", "motif": " "})
    etape("Relances de l'adhérent", "gest", "GET", f"/adherents/{a0}/relances")


def module_portefeuilles():
    module("AGENTS — portefeuilles")
    for i in range(3):
        etape(f"Affecter l'adhérent {i} à l'agent 1", "gest", "POST", "/portefeuilles/affecter", 204,
              {"adherentId": ctx[f"adh{i}"], "agentId": ctx["agent1"], "motif": "Affectation recette"})
    etape("Affecter sans permission (DAF)", "daf", "POST", "/portefeuilles/affecter", 403,
          {"adherentId": ctx["adh3"], "agentId": ctx["agent1"]})
    etape("Agent responsable", "gest", "GET", f"/adherents/{ctx['adh0']}/agent",
          verifier=lambda js: js.get("id") == ctx["agent1"] or f"{js.get('id')}")
    etape("Portefeuille de l'agent", "dga", "GET", f"/agents/{ctx['agent1']}/portefeuille",
          verifier=lambda js: js["totalElements"] == 3 or f"{js['totalElements']}")
    etape("Résumé du portefeuille", "dga", "GET", f"/agents/{ctx['agent1']}/portefeuille/resume")
    etape("Transférer à l'agent 2", "dga", "POST", "/portefeuilles/transferer", 204,
          {"adherentIds": [ctx["adh2"]], "nouvelAgentId": ctx["agent2"], "motif": "Réorganisation"})
    etape("Historique du portefeuille", "dga", "GET", f"/agents/{ctx['agent1']}/portefeuille/historique")
    etape("Retirer du portefeuille", "dga", "POST", "/portefeuilles/retirer", 204,
          {"adherentId": ctx["adh2"], "motif": "Déménagement"})
    etape("Adhérents sans agent (sans zone, V23)", "gest", "GET", "/portefeuilles/sans-agent",
          verifier=lambda js: any(a["id"] == ctx["adh2"] for a in js) or "adhérent sans zone introuvable")
    etape("Éligibles CNPS du portefeuille", "dga", "GET", f"/agents/{ctx['agent1']}/portefeuille/cnps/eligibles")
    etape("Proches du seuil CNPS", "dga", "GET", f"/agents/{ctx['agent1']}/portefeuille/cnps/proches-seuil")


def module_terrain():
    module("AGENT DE TERRAIN ET CHEF — périmètre et collecte")
    moi = etape("Profil de l'agent de démonstration", "agent", "GET", "/auth/moi")
    ctx["agent_demo"] = moi.get("agentId") or (moi.get("perimetre") or {}).get("agentId")
    if not ctx["agent_demo"]:
        agents = etape("Retrouver l'agent de démonstration", "dga", "GET", "/agents?taille=100")
        for a in agents.get("contenu", []):
            if (a.get("nomComplet") or "").lower().startswith("démonstration agent"):
                ctx["agent_demo"] = a["id"]
                break
    etape("Affecter l'adhérent 0 à l'agent de démonstration (transfert)", "dga", "POST", "/portefeuilles/transferer",
          204, {"adherentIds": [ctx["adh0"]], "nouvelAgentId": ctx["agent_demo"], "motif": "Recette terrain"})
    etape("Agent : liste limitée à son portefeuille", "agent", "GET", "/adherents?taille=50",
          verifier=lambda js: [a["id"] for a in js["contenu"]] == [ctx["adh0"]] or f"{js['totalElements']} visibles")
    etape("Agent : fiche de son adhérent", "agent", "GET", f"/adherents/{ctx['adh0']}")
    etape("Agent : fiche hors portefeuille refusée", "agent", "GET", f"/adherents/{ctx['adh1']}", 403)
    p = etape("Agent : saisit une cotisation pour son adhérent", "agent", "POST", "/paiements", 201,
              {"adherentId": ctx["adh0"], "datePaiement": AUJ, "montant": 1000, "modePaiement": "ESPECES",
               "typePaiement": "COTISATION", "agentEncaisseurId": ctx["agent_demo"], "montantSecuriteSociale": 700,
               "montantEpargne": 300}, entetes={"Idempotency-Key": uuid.uuid4().hex})
    etape("Agent : cotisation hors portefeuille refusée", "agent", "POST", "/paiements", 403,
          {"adherentId": ctx["adh1"], "datePaiement": AUJ, "montant": 1000, "modePaiement": "ESPECES",
           "typePaiement": "COTISATION", "montantSecuriteSociale": 700, "montantEpargne": 300},
          entetes={"Idempotency-Key": uuid.uuid4().hex})
    etape("Agent ne valide pas sa cotisation (403)", "agent", "POST", f"/paiements/{p['id']}/valider", 403)
    etape("Chef confirme la collecte de son agent", "chef", "POST", f"/paiements/{p['id']}/confirmer-chef?motif=OK", 200,
          verifier=lambda js: js.get("confirmeParChefId") is not None or "non confirmée")
    etape("Seconde confirmation -> 409", "chef", "POST", f"/paiements/{p['id']}/confirmer-chef", 409)
    etape("Gestionnaire ne confirme pas comme Chef (403)", "gest", "POST", f"/paiements/{p['id']}/confirmer-chef", 403)
    etape("DAF valide la cotisation de l'agent", "daf", "POST", f"/paiements/{p['id']}/valider", 200)
    p2 = etape("Agent : cotisation sans encaisseur indiqué -> l'agent lui-même", "agent", "POST", "/paiements", 201,
               {"adherentId": ctx["adh0"], "datePaiement": AUJ, "montant": 1200, "modePaiement": "ESPECES",
                "typePaiement": "COTISATION", "montantSecuriteSociale": 700, "montantEpargne": 500},
               entetes={"Idempotency-Key": uuid.uuid4().hex},
               verifier=lambda js: js.get("agentEncaisseurId") == ctx["agent_demo"] or f"{js.get('agentEncaisseurId')}")
    etape("Le Chef confirme cette collecte", "chef", "POST", f"/paiements/{p2['id']}/confirmer-chef", 200)
    etape("Elle figure dans ce que l'agent doit remettre", "gest", "GET",
          f"/remises-caisse/a-remettre?agentId={ctx['agent_demo']}",
          verifier=lambda js: {p["id"], p2["id"]} <= {x["id"] for x in js} or f"{[x['numeroRecu'] for x in js]}")


def module_cotisations():
    module("COTISATIONS")
    a0, a1 = ctx["adh0"], ctx["adh1"]
    etape("Contexte par matricule", "gest", "GET", f"/paiements/contexte-adherent?matricule={ctx['mat0']}",
          verifier=lambda js: (js["cotisable"] and js["packRequis"] and not js["avertissements"]) or f"{js}")
    nouveau = etape("Adhérent préinscrit sans frais", "gest", "POST", "/adherents", 201,
                    {"nom": "SansFrais" + SUFFIXE, "telephonePrincipal": tel(), "activiteId": ctx["activite"],
                     "dateAdhesion": AUJ, "confirmationDoublonIgnore": True})
    etape("Contexte : non cotisable sans frais (V23 §5)", "gest", "GET",
          f"/paiements/contexte-adherent?matricule={nouveau['matricule']}",
          verifier=lambda js: (not js["cotisable"] and any("frais" in m for m in js["motifsBlocage"])) or f"{js}")

    def cot(adh, montant, ss, ep, pack=None, cle=None, role="gest", attendu=201, nom=None, **extra):
        corps = {"adherentId": adh, "datePaiement": AUJ, "montant": montant, "modePaiement": "ESPECES",
                 "typePaiement": "COTISATION", "agentEncaisseurId": ctx["agent1"]}
        if ss is not None:
            corps["montantSecuriteSociale"] = ss
        if ep is not None:
            corps["montantEpargne"] = ep
        if pack:
            corps["packId"] = pack
        corps.update(extra)
        return etape(nom or f"Cotisation {montant} = {ss} + {ep}", role, "POST", "/paiements" +
                     ("?brouillon=true" if extra.pop("_brouillon", False) else ""), attendu, corps,
                     entetes={"Idempotency-Key": cle or uuid.uuid4().hex})

    cot(nouveau["id"], 1000, 700, 300, ctx["pack"], attendu=409, nom="Cotisation refusée sans frais validé (V23 §5)")
    cot(a0, 1000, 700, 300, None, attendu=400, nom="Première cotisation sans pack -> 400")
    cot(a0, 1000, 600, 400, ctx["pack"], attendu=400, nom="Sécurité sociale < 700 -> 400")
    cot(a0, 900, 700, 200, ctx["pack"], attendu=400, nom="Épargne alimentée < 300 -> 400")
    cot(a0, 1000, 700, 400, ctx["pack"], attendu=400, nom="Total ≠ somme -> 400")
    cle = uuid.uuid4().hex
    p1 = cot(a0, 1500, 700, 800, ctx["pack"], cle=cle, nom="Cotisation 1500 = 700 + 800 (pack choisi)")
    cot(a0, 1500, 700, 800, ctx["pack"], cle=cle, attendu=200, nom="Même clé, même requête -> 200",
        verifier=None) if False else None
    etape("Même clé, même requête -> 200", "gest", "POST", "/paiements", 200,
          {"adherentId": a0, "datePaiement": AUJ, "montant": 1500, "modePaiement": "ESPECES",
           "typePaiement": "COTISATION", "agentEncaisseurId": ctx["agent1"], "montantSecuriteSociale": 700,
           "montantEpargne": 800, "packId": ctx["pack"]}, entetes={"Idempotency-Key": cle},
          verifier=lambda js: js["id"] == p1["id"] or "autre cotisation")
    cot(a0, 2000, 700, 1300, None, cle=cle, attendu=409, nom="Même clé, autre requête -> 409")
    etape("Sans clé d'idempotence -> 400", "gest", "POST", "/paiements", 400,
          {"adherentId": a0, "datePaiement": AUJ, "montant": 1000, "modePaiement": "ESPECES",
           "typePaiement": "COTISATION"})
    etape("Mobile money sans référence -> 400", "gest", "POST", "/paiements", 400,
          {"adherentId": a0, "datePaiement": AUJ, "montant": 1000, "modePaiement": "ORANGE_MONEY",
           "typePaiement": "COTISATION"}, entetes={"Idempotency-Key": uuid.uuid4().hex})
    p2 = cot(a0, 1000, None, None, None, nom="Cotisation sans répartition (proposition serveur)")
    p3 = cot(a1, 2000, 700, 1300, ctx["pack"], nom="Cotisation adhérent 1 (à rejeter)")
    p4 = cot(a1, 3000, 1000, 2000, None, nom="Cotisation adhérent 1 (incohérence)")
    p5 = cot(a1, 1200, 700, 500, None, nom="Cotisation mobile money", modePaiement="MTN_MOMO",
             referenceTransaction="MOMO-" + SUFFIXE)
    cot(a1, 1200, 700, 500, None, attendu=409, nom="Référence de transaction déjà utilisée -> 409",
        modePaiement="MTN_MOMO", referenceTransaction="MOMO-" + SUFFIXE)
    br = etape("Brouillon de cotisation", "gest", "POST", "/paiements?brouillon=true", 201,
               {"adherentId": a1, "datePaiement": AUJ, "montant": 1000, "modePaiement": "ESPECES",
                "typePaiement": "COTISATION", "montantSecuriteSociale": 700, "montantEpargne": 300},
               entetes={"Idempotency-Key": uuid.uuid4().hex})
    etape("Corriger le brouillon sans nouvelle répartition -> 400", "gest", "POST", f"/paiements/{br['id']}/corriger",
          400, {"montant": 1500})
    etape("Corriger le brouillon", "gest", "POST", f"/paiements/{br['id']}/corriger", 200,
          {"montant": 1500, "montantSecuriteSociale": 700, "montantEpargne": 800})
    etape("Soumettre le brouillon", "gest", "POST", f"/paiements/{br['id']}/soumettre", 200)
    etape("Vérifier un doublon de cotisation", "gest", "POST", "/paiements/verifier-doublon", 200,
          {"adherentId": a0, "datePaiement": AUJ, "montant": 1500, "modePaiement": "ESPECES"},
          verifier=lambda js: len(js.get("doublonsPotentiels", [])) >= 1 or f"{js}")
    etape("Consulter une cotisation", "gest", "GET", f"/paiements/{p1['id']}")
    etape("Reçu (identité, répartition)", "gest", "GET", f"/paiements/{p1['id']}/recu",
          verifier=lambda js: (js.get("adherentMatricule") == ctx["mat0"] and float(js["montantEpargne"]) == 800)
          or f"{js}")
    etape("Historique des statuts", "gest", "GET", f"/paiements/{p1['id']}/historique-statuts")
    etape("Statut de validation", "gest", "GET", f"/paiements/{p1['id']}/statut-validation")
    etape("Gestionnaire : journal des cotisations refusé (V23 §6)", "gest", "GET", "/paiements", 403)
    etape("Gestionnaire : statistiques refusées", "gest", "GET", "/paiements/statistiques/quotidiennes", 403)
    etape("DAF : journal des cotisations", "daf", "GET", f"/paiements?statut=A_CONTROLER&taille=50",
          verifier=lambda js: js["totalElements"] >= 5 or f"{js['totalElements']}")
    etape("DAF : recherche par matricule", "daf", "GET", f"/paiements?adherentMatricule={ctx['mat0']}")
    etape("DAF : statistiques du jour", "daf", "GET", "/paiements/statistiques/quotidiennes")
    etape("Synthèse : rien de crédité avant validation", "gest", "GET", f"/adherents/{a0}/synthese-cotisations",
          verifier=lambda js: (float(js["compteSecuriteSociale"]["soldeValide"]) == 0
                               and float(js["montantEnAttente"]) == 2500) or f"{js['compteSecuriteSociale']} {js['montantEnAttente']}")
    etape("Chef hors équipe : confirmation refusée", "chef", "POST", f"/paiements/{p1['id']}/confirmer-chef", 403)
    etape("Gestionnaire ne valide pas (403)", "gest", "POST", f"/paiements/{p1['id']}/valider", 403)
    etape("DAF valide la cotisation 1", "daf", "POST", f"/paiements/{p1['id']}/valider", 200)
    etape("Double validation -> 409", "daf", "POST", f"/paiements/{p1['id']}/valider", 409)
    etape("DAF valide la cotisation 2", "daf", "POST", f"/paiements/{p2['id']}/valider", 200)
    etape("Affectations = répartition saisie", "daf", "GET", f"/paiements/{p1['id']}/affectations",
          verifier=lambda js: sorted((l["composanteCode"], float(l["montant"])) for l in js)
          == [("CNPS", 700.0), ("EPARGNE", 800.0)] or f"{js}")
    etape("Synthèse après validation", "gest", "GET", f"/adherents/{a0}/synthese-cotisations",
          verifier=lambda js: (float(js["compteSecuriteSociale"]["soldeValide"]) == 1400
                               and float(js["compteEpargne"]["soldeValide"]) == 1100) or f"{js}")
    etape("Résumé des cotisations", "gest", "GET", f"/adherents/{a0}/resume-cotisations")
    etape("DAF rejette la cotisation 3", "daf", "POST", f"/paiements/{p3['id']}/rejeter", 200,
          {"motif": "Montant non encaissé"})
    etape("DAF signale une incohérence (4)", "daf", "POST", f"/paiements/{p4['id']}/signaler-incoherence", 200,
          {"motif": "Montant douteux"})
    etape("Validation d'une cotisation incohérente -> 409", "daf", "POST", f"/paiements/{p4['id']}/valider", 409)
    dc = etape("Demande de correction (incohérence)", "gest", "POST", f"/paiements/{p4['id']}/demandes-correction",
               [200, 201], {"motif": "Montant réel 2500", "elements": [
                   {"champ": "montant", "valeurProposee": "2500"},
                   {"champ": "montantSecuriteSociale", "valeurProposee": "700"},
                   {"champ": "montantEpargne", "valeurProposee": "1800"}]})
    if dc:
        etape("DGA ne décide pas une correction financière", "dga", "POST", f"/demandes-validation/{dc['id']}/approuver",
              403, {"commentaire": "x"})
        etape("DAF approuve la correction", "daf", "POST", f"/demandes-validation/{dc['id']}/approuver", 200,
              {"commentaire": "Vérifié"})
        etape("Cotisation corrigée, rouverte au contrôle", "daf", "GET", f"/paiements/{p4['id']}",
              verifier=lambda js: (float(js["montant"]) == 2500 and js["statut"] == "A_CONTROLER"
                                   and float(js["montantEpargne"]) == 1800) or f"{js}")
    etape("Demandes de correction de la cotisation", "daf", "GET", f"/paiements/{p4['id']}/demandes-correction")
    etape("Historique de validation de la cotisation", "daf", "GET", f"/paiements/{p4['id']}/historique-validation")
    etape("DAF valide la cotisation mobile money", "daf", "POST", f"/paiements/{p5['id']}/valider", 200)
    dc2 = etape("Correction d'une cotisation validée", "gest", "POST", f"/paiements/{p5['id']}/demandes-correction",
                [200, 201], {"motif": "Erreur de montant", "elements": [
                    {"champ": "montant", "valeurProposee": "1500"}, {"champ": "montantSecuriteSociale",
                                                                     "valeurProposee": "700"},
                    {"champ": "montantEpargne", "valeurProposee": "800"}]})
    if dc2:
        etape("DAF approuve (réaffectation et droits recalculés)", "daf", "POST",
              f"/demandes-validation/{dc2['id']}/approuver", 200, {"commentaire": "OK"})
        etape("Affectations recalculées", "daf", "GET", f"/paiements/{p5['id']}/affectations",
              verifier=lambda js: sum(float(l["montant"]) for l in js) == 1500 or f"{js}")
    etape("Annuler une cotisation", "daf", "POST", f"/paiements/{br['id']}/annuler", [204, 200],
          {"motif": "Saisie en double"})
    aff = etape("Affectations de la cotisation 2", "daf", "GET", f"/paiements/{p2['id']}/affectations")
    ids = {a["composanteCode"]: a["composanteId"] for a in aff}
    etape("Ré-affectation manuelle : Épargne < 300 refusée", "daf", "POST", f"/paiements/{p2['id']}/affectations", 400,
          {"lignes": [{"composanteId": ids["CNPS"], "montant": 800}, {"composanteId": ids["EPARGNE"], "montant": 200}]})
    etape("Ré-affectation manuelle : Sécurité sociale < 700 refusée", "daf", "POST",
          f"/paiements/{p2['id']}/affectations", 400,
          {"lignes": [{"composanteId": ids["CNPS"], "montant": 600}, {"composanteId": ids["EPARGNE"], "montant": 400}]})
    etape("Ré-affectation manuelle valide (tout en Sécurité sociale)", "daf", "POST",
          f"/paiements/{p2['id']}/affectations", 200, {"lignes": [{"composanteId": ids["CNPS"], "montant": 1000}]})
    etape("La cotisation reflète la ré-affectation", "daf", "GET", f"/paiements/{p2['id']}",
          verifier=lambda js: (float(js["montantSecuriteSociale"]) == 1000 and float(js["montantEpargne"]) == 0)
          or f"{js['montantSecuriteSociale']} / {js['montantEpargne']}")
    etape("Les comptes de l'adhérent suivent la ré-affectation", "gest", "GET", f"/adherents/{a0}/synthese-cotisations",
          verifier=lambda js: (float(js["compteSecuriteSociale"]["soldeValide"]) == 1700
                               and float(js["compteEpargne"]["soldeValide"]) == 800) or f"{js['compteSecuriteSociale']} {js['compteEpargne']}")
    etape("Ré-affectation refusée au Gestionnaire", "gest", "POST", f"/paiements/{p2['id']}/affectations", 403,
          {"lignes": [{"composanteId": ids["CNPS"], "montant": 1000}]})
    # remise de caisse
    module("COTISATIONS — remises de caisse")
    etape("Cotisations de l'agent 1 à remettre", "gest", "GET", f"/remises-caisse/a-remettre?agentId={ctx['agent1']}",
          verifier=lambda js: {p1["id"], p2["id"]} <= {x["id"] for x in js} or f"{[x['numeroRecu'] for x in js]}")
    etape("Remise : cotisation d'un autre agent -> 400", "gest", "POST", "/remises-caisse", 400,
          {"agentId": ctx["agent2"], "paiementIds": [p1["id"]]})
    rc = etape("Déclarer la remise (agent 1)", "gest", "POST", "/remises-caisse", 201,
               {"agentId": ctx["agent1"], "paiementIds": [p1["id"], p2["id"]]},
               verifier=lambda js: (js["nombrePaiements"] == 2 and float(js["montantDeclare"]) == 2500) or f"{js}")
    etape("Remise : cotisation déjà remise -> 409", "gest", "POST", "/remises-caisse", 409,
          {"agentId": ctx["agent1"], "paiementIds": [p1["id"]]})
    etape("Gestionnaire : liste des remises refusée (Finances)", "gest", "GET", "/remises-caisse", 403)
    etape("DAF : remises à réceptionner", "daf", "GET", "/remises-caisse?statut=DECLAREE",
          verifier=lambda js: any(r["id"] == rc["id"] for r in js["contenu"]) or "remise absente")
    etape("Consulter la remise", "daf", "GET", f"/remises-caisse/{rc['id']}")
    etape("Gestionnaire ne réceptionne pas (403)", "gest", "POST", f"/remises-caisse/{rc['id']}/receptionner", 403,
          {"montantRecu": 2500})
    etape("DAF réceptionne avec un écart", "daf", "POST", f"/remises-caisse/{rc['id']}/receptionner", 200,
          {"montantRecu": 2400}, verifier=lambda js: (js["statut"] == "EN_ECART" and float(js["ecart"]) == -100) or f"{js}")
    etape("Seconde réception -> 409", "daf", "POST", f"/remises-caisse/{rc['id']}/receptionner", 409,
          {"montantRecu": 2500})

    module("COTISATIONS — bilan de caisse et droits")
    etape("DAF : bilan journalier numérique", "daf", "GET", "/paiements/bilan-journalier")
    etape("Gestionnaire : bilan journalier refusé (V23 §6)", "gest", "GET", "/paiements/bilan-journalier", 403)
    etape("Saisie de la caisse physique (Gestionnaire)", "gest", "POST", "/bilans-caisse", [201, 200],
          {"date": AUJ, "montantPhysique": 2400, "commentaire": "Caisse du jour"})
    b = etape("DAF : bilan du jour", "daf", "GET", f"/bilans-caisse/{AUJ}")
    etape("Gestionnaire : liste des bilans refusée (V23 §6)", "gest", "GET", "/bilans-caisse", 403)
    etape("DAF : liste des bilans", "daf", "GET", "/bilans-caisse")
    etape("DAF valide le bilan", "daf", "POST", f"/bilans-caisse/{AUJ}/valider?commentaire=OK"
          + (f"&version={b['version']}" if b and b.get("version") is not None else ""), 200)
    etape("Anomalie sur un bilan validé -> 409", "daf", "POST", f"/bilans-caisse/{AUJ}/anomalie", 409,
          {"motif": "x"})
    etape("Situation des droits", "gest", "GET", f"/droits/adherents/{a0}")
    etape("Périodes de droits", "gest", "GET", f"/droits/adherents/{a0}/periodes",
          verifier=lambda js: len(js) >= 2 or f"{len(js)} périodes")
    etape("Retardataires", "gest", "GET", "/droits/retardataires")
    etape("Recalcul des droits (DAF)", "daf", "POST", f"/droits/adherents/{a0}/recalculer", 204,
          {"motif": "Contrôle recette"})
    etape("Recalcul refusé au Gestionnaire", "gest", "POST", f"/droits/adherents/{a0}/recalculer", 403,
          {"motif": "x"})

    module("ADHÉRENTS — historiques et fin de cycle")
    etape("Historique général", "gest", "GET", f"/adherents/{a0}/historique-general",
          verifier=lambda js: js["totalElements"] >= 5 or f"{js['totalElements']}")
    etape("Historique financier (Gestionnaire)", "gest", "GET", f"/adherents/{a0}/historique-financier?periode=JOUR",
          verifier=lambda js: "DROITS_RECALCUL" not in json.dumps(js) or "travail DAF visible")
    etape("Historique financier (DAF)", "daf", "GET", f"/adherents/{a0}/historique-financier",
          verifier=lambda js: "DROITS_RECALCUL" in json.dumps(js) or "recalcul absent")
    etape("Historique : filtre période invalide", "gest", "GET",
          f"/adherents/{a0}/historique-general?du=2026-12-01&au=2026-01-01", 400)
    etape("Super Admin : historique refusé", "sa", "GET", f"/adherents/{a0}/historique-general", 403)
    etape("Journal brut (route obsolète, conservée)", "gest", "GET", f"/adherents/{a0}/historique")
    etape("Archiver un adhérent", "gest", "POST", f"/adherents/{ctx['adh3']}/archiver", 204,
          {"motif": "Doublon administratif"})
    etape("Cotisation sur adhérent archivé -> 409", "gest", "POST", "/paiements", 409,
          {"adherentId": ctx["adh3"], "datePaiement": AUJ, "montant": 1000, "modePaiement": "ESPECES",
           "typePaiement": "COTISATION", "montantSecuriteSociale": 700, "montantEpargne": 300},
          entetes={"Idempotency-Key": uuid.uuid4().hex})


def controles_transverses():
    module("TRANSVERSE — rôles et règles V23")
    etape("Tableau de bord Super Admin : 0 règle non validée", "sa", "GET", "/tableaux-de-bord/super-admin",
          verifier=lambda js: all(not (i.get("cle") == "parametresNonValides" and i.get("valeur")) for i in
                                  js.get("indicateurs", [])) or "règles non validées comptées")
    etape("Règles en attente : liste vide", "pca", "GET", "/regles/en-attente",
          verifier=lambda js: (not js.get("parametres") and not js.get("exigences")) or f"{str(js)[:200]}")
    for role, chemin in [("pca", "/tableaux-de-bord/pca"), ("dg", "/tableaux-de-bord/dg"),
                         ("dga", "/tableaux-de-bord/dga"), ("daf", "/tableaux-de-bord/daf"),
                         ("gest", "/tableaux-de-bord/gestionnaire")]:
        js = etape(f"Tableau de bord {role}", role, "GET", chemin)
        txt = json.dumps(js, ensure_ascii=False).lower()
        if "non validé" in txt or "provisoire" in txt or "à confirmer" in txt:
            resultats.append({"module": module_courant[0], "etape": f"Tableau de bord {role} sans rappel provisoire",
                              "role": role, "methode": "GET", "chemin": chemin, "attendu": [200], "statut": 200,
                              "ok": False, "code": None, "detail": "rappel « non validé » présent", "extrait": ""})
            log(f"[KO] rappel « non validé » dans {chemin}")


if __name__ == "__main__":
    sys.stdout.reconfigure(encoding="utf-8")
    log(f"Recette 3 modules — {datetime.datetime.now().isoformat(timespec='seconds')} — base {BASE} — suffixe {SUFFIXE}")
    for f in (module_agents, module_adherents, module_portefeuilles, module_cotisations, module_terrain,
              controles_transverses):
        try:
            f()
        except Exception as e:  # noqa — une erreur de scénario n'arrête pas les autres modules
            import traceback
            log(f"[ERREUR SCÉNARIO] {f.__name__}: {e!r}\n{traceback.format_exc()}")
            resultats.append({"module": module_courant[0], "etape": f"scénario {f.__name__}", "ok": False,
                              "detail": repr(e), "role": "-", "methode": "-", "chemin": "-", "attendu": [],
                              "statut": None, "code": None, "extrait": ""})
    ok = sum(r["ok"] for r in resultats)
    log(f"\nBILAN : {ok}/{len(resultats)} étapes conformes")
    json.dump(resultats, open(JOURNAL + ".json", "w", encoding="utf-8"), ensure_ascii=False, indent=1)
    print(f"{ok}/{len(resultats)} OK")
    for r in resultats:
        if not r["ok"]:
            print(f"KO {r['module']} | {r['etape']} | {r['role']} {r['methode']} {r['chemin']} -> {r['statut']} "
                  f"attendu {r['attendu']} {r.get('code') or ''} {r['detail']} :: {r['extrait'][:220]}")
