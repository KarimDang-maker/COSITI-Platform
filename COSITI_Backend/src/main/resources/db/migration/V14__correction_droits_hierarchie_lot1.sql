-- V14__correction_droits_hierarchie_lot1.sql
-- Vague 1/2 de « COSITI V1 — CORRECTION DES DROITS, HIÉRARCHIE, VISIBILITÉ ET WORKFLOW.md ».
-- Couvre les §1 (hiérarchie), §2 (visibilité), §3 (audit global), §4 (liste adhérents), §5 (création adhérent),
-- §6 (gestion financière DAF), §7 (double compte adhérent), §8 (allocation personnalisée), §10 (organisation
-- terrain). Ne modifie jamais V1 à V13 (déjà appliquées) : uniquement des corrections additives.

-- ------------------------------------------------------------------------------------------------
-- §3 : seuls PCA et SUPER_ADMIN ont la vision globale de l'audit. DG/DGA/DAF/GESTIONNAIRE_COMPTE
-- avaient reçu AUDIT:CONSULTER par erreur en V5/V8 (lecture globale confondue avec « consultation de son
-- périmètre fonctionnel »). On retire la permission à ces quatre rôles ; PCA et SUPER_ADMIN la conservent.
-- ------------------------------------------------------------------------------------------------
DELETE FROM role_permission
WHERE permission_id = (SELECT id FROM permission WHERE code = 'AUDIT:CONSULTER')
  AND role_id IN (SELECT id FROM role WHERE code IN ('DG', 'DGA', 'DAF', 'GESTIONNAIRE_COMPTE'));

-- ------------------------------------------------------------------------------------------------
-- §3 : export/impression/PDF de l'audit — réservé au seul Super Administrateur.
-- ------------------------------------------------------------------------------------------------
INSERT INTO permission (code, module, libelle) VALUES
    ('AUDIT:EXPORTER', 'AUDIT', 'Générer, exporter et imprimer le rapport d''audit en PDF (réservé Super Administrateur)')
ON CONFLICT (code) DO NOTHING;

INSERT INTO role_permission (role_id, permission_id)
SELECT r.id, p.id FROM role r, permission p
WHERE r.code = 'SUPER_ADMIN' AND p.code = 'AUDIT:EXPORTER'
ON CONFLICT DO NOTHING;

-- ------------------------------------------------------------------------------------------------
-- §6 : la Gestionnaire enregistre un paiement en statut À CONTRÔLER/À VALIDER — PAIEMENT:CREER ne lui avait
-- jamais été accordée (V5 ne le donnait qu'à AGENT_TERRAIN). Ajout, sans retrait à AGENT_TERRAIN : UC-AG-05
-- (Roles des acteurs.md) et les recettes REC-H04/J12 couvrent déjà la saisie terrain par l'Agent, et le
-- document ne l'interdit pas explicitement (contrairement à la création d'adhérent, §5) — point à confirmer
-- par la COSITI, documenté dans le livrable de session plutôt que tranché silencieusement.
-- ------------------------------------------------------------------------------------------------
INSERT INTO role_permission (role_id, permission_id)
SELECT r.id, p.id FROM role r, permission p
WHERE r.code = 'GESTIONNAIRE_COMPTE' AND p.code = 'PAIEMENT:CREER'
ON CONFLICT DO NOTHING;

-- ------------------------------------------------------------------------------------------------
-- §5 : séparation entre saisie préparatoire (Agent) et création définitive (Gestionnaire). Le schéma
-- distingue déjà adherent.statut = 'PREINSCRIT' (V2) mais rien n'empêchait l'Agent d'utiliser ADHERENT:CREER,
-- identique à la Gestionnaire, pour une création complète (pack compris). Nouvelle permission dédiée,
-- vérifiable par un test RBAC plutôt qu'une simple convention documentaire.
-- ------------------------------------------------------------------------------------------------
INSERT INTO permission (code, module, libelle) VALUES
    ('ADHERENT:PREINSCRIRE', 'ADHERENT', 'Saisie préparatoire d''un adhérent par l''Agent de terrain — statut PREINSCRIT uniquement, jamais une création définitive')
ON CONFLICT (code) DO NOTHING;

INSERT INTO role_permission (role_id, permission_id)
SELECT r.id, p.id FROM role r, permission p
WHERE r.code = 'AGENT_TERRAIN' AND p.code = 'ADHERENT:PREINSCRIRE'
ON CONFLICT DO NOTHING;

DELETE FROM role_permission
WHERE permission_id = (SELECT id FROM permission WHERE code = 'ADHERENT:CREER')
  AND role_id = (SELECT id FROM role WHERE code = 'AGENT_TERRAIN');

-- ------------------------------------------------------------------------------------------------
-- §10 : organisation terrain réalisée par la Gestionnaire des comptes ET le Chef des agents de terrain
-- (Chef en lecture seule — Roles des acteurs.md §8 ne lui donne que des UC de suivi, jamais de gestion).
-- ORGANISATION:GERER couvrait à la fois la création de zones ET la création/l'affectation d'agents par la
-- DGA (ServiceAgentImpl.creerParDga/affecter, qui vérifient de toute façon explicitement le rôle DGA en plus
-- de la permission — double verrou intentionnel, non modifié ici). Un octroi large de ORGANISATION:GERER à
-- la Gestionnaire aurait donc accidentellement rouvert la création d'agents, réservée à la DGA
-- (Roles des acteurs.md §11, matrice synthétique). Nouvelle permission dédiée à la gestion des zones,
-- distincte de la gestion des agents, pour donner à la Gestionnaire exactement ce que §10 lui accorde.
-- ------------------------------------------------------------------------------------------------
INSERT INTO permission (code, module, libelle) VALUES
    ('ORGANISATION:GERER_ZONES', 'ORGANISATION', 'Créer/modifier une zone (organisation terrain — Gestionnaire et DGA, §10)')
ON CONFLICT (code) DO NOTHING;

INSERT INTO role_permission (role_id, permission_id)
SELECT r.id, p.id FROM role r, permission p
WHERE r.code IN ('DGA', 'GESTIONNAIRE_COMPTE') AND p.code = 'ORGANISATION:GERER_ZONES'
ON CONFLICT DO NOTHING;

-- §10 : « répartir les adhérents » (portefeuilles) est un travail conjoint Gestionnaire/Chef — la Gestionnaire
-- exécute l'affectation (Chef reste en lecture, ORGANISATION:LIRE déjà détenue, aucune UC de Roles des
-- acteurs.md §8 ne lui donne l'action d'affecter).
INSERT INTO role_permission (role_id, permission_id)
SELECT r.id, p.id FROM role r, permission p
WHERE r.code = 'GESTIONNAIRE_COMPTE' AND p.code = 'ORGANISATION:AFFECTER_PORTEFEUILLE'
ON CONFLICT DO NOTHING;

-- ------------------------------------------------------------------------------------------------
-- §7/§8 : règle de répartition Sécurité Sociale / Épargne désormais confirmée par le document de correction —
-- première règle financière du projet qui passe de [V] à [C] (voir Conception/SUIVI_EXECUTION.md, tableau des
-- décisions). Le montant plancher vit dans `parametre`, jamais en constante Java (AGENTS.md règle absolue n°1),
-- au même titre que MONTANT_INSCRIPTION/TAUX_CNPS déjà en statut 'C'.
-- ------------------------------------------------------------------------------------------------
INSERT INTO parametre (cle, valeur, type_valeur, libelle, statut_validation) VALUES
    ('MONTANT_MINIMUM_SECURITE_SOCIALE', '700', 'DECIMAL',
     'Montant plancher obligatoire affecté au compte Sécurité Sociale à chaque paiement (FCFA)', 'C')
ON CONFLICT (cle) DO NOTHING;

UPDATE parametre
SET valeur = '{"regle":"SECURITE_SOCIALE_MINIMUM_700_PUIS_EPARGNE",'
             || '"description":"700 FCFA minimum vers la composante Sécurité Sociale (CNPS) à chaque paiement ; '
             || 'le reste va vers Épargne sauf préférence d''allocation enregistrée par l''adhérent ou recommandation '
             || 'structurée de paiement (montant > 1000 FCFA) ; Sécurité Sociale + Épargne doit toujours égaler le '
             || 'montant du paiement ; toute allocation où la Sécurité Sociale descend sous 700 FCFA est refusée.",'
             || '"minimumSecuriteSociale":700}',
    statut_validation = 'C',
    modifie_le = now(),
    modifie_par = 'MIGRATION_V14_CORRECTIF_COSITI'
WHERE cle = 'REPARTITION_VERSEMENT';

-- Relabel purement cosmétique de la composante déjà en base (code 'CNPS' conservé pour ne rien casser des
-- données existantes ni du code qui la recherche par code) — le document de correction parle de « compte
-- Sécurité Sociale », le libellé le reflète désormais explicitement.
UPDATE composante_affectation
SET libelle = 'Cotisation Sécurité Sociale (CNPS)'
WHERE code = 'CNPS';

-- ------------------------------------------------------------------------------------------------
-- §8 : préférence d'allocation enregistrée au dossier adhérent (pack choisi, montant de référence, allocation
-- Sécurité Sociale, allocation Épargne, date de la préférence). Historisée comme adhesion/affectation_portefeuille
-- (jamais de suppression physique, AGENTS.md règle absolue n°3) : une seule ligne active par adhérent.
-- ------------------------------------------------------------------------------------------------
CREATE TABLE preference_allocation_adherent (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    adherent_id UUID NOT NULL REFERENCES adherent(id) ON DELETE CASCADE,
    pack_id UUID NOT NULL REFERENCES pack(id) ON DELETE RESTRICT,
    montant_reference NUMERIC(14,2) NOT NULL CHECK (montant_reference > 0),
    allocation_securite_sociale NUMERIC(14,2) NOT NULL CHECK (allocation_securite_sociale >= 700),
    allocation_epargne NUMERIC(14,2) NOT NULL CHECK (allocation_epargne >= 0),
    date_preference DATE NOT NULL,
    actif BOOLEAN NOT NULL DEFAULT true,
    auteur_id UUID REFERENCES utilisateur(id) ON DELETE SET NULL,
    cree_le TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT chk_preference_allocation_somme CHECK (allocation_securite_sociale + allocation_epargne = montant_reference)
);

CREATE UNIQUE INDEX idx_unique_preference_allocation_active ON preference_allocation_adherent(adherent_id) WHERE actif = true;
CREATE INDEX idx_preference_allocation_adherent ON preference_allocation_adherent(adherent_id, cree_le DESC);

-- ------------------------------------------------------------------------------------------------
-- §8 : pour un paiement > 1000 FCFA, la recommandation du membre recueillie par l'agent est une donnée
-- structurée (jamais un commentaire libre). Une recommandation par paiement.
-- ------------------------------------------------------------------------------------------------
CREATE TABLE recommandation_allocation_paiement (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    paiement_id UUID NOT NULL UNIQUE REFERENCES paiement(id) ON DELETE CASCADE,
    allocation_securite_sociale NUMERIC(14,2) NOT NULL CHECK (allocation_securite_sociale >= 700),
    allocation_epargne NUMERIC(14,2) NOT NULL CHECK (allocation_epargne >= 0),
    recueilli_par_id UUID REFERENCES utilisateur(id) ON DELETE SET NULL,
    cree_le TIMESTAMPTZ NOT NULL DEFAULT now()
);
