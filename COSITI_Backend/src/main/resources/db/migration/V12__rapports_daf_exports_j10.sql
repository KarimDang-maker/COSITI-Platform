-- V12__rapports_daf_exports_j10.sql
-- Jalon J10 — Rapports DAF, exports et journal d'audit.
--
-- Le journal d'audit existe depuis V1 (`journal_audit`) et sa lecture depuis J1 (`ControleurAudit`) :
-- rien n'est ajouté de ce côté, sinon les écrans. Cette migration crée la table manquante du jalon,
-- `rapport_daf`, et le catalogue de permissions.
--
-- CONTRAT [A] — `Roles des acteurs.md §14` marque « production et transmission du rapport DAF au PCA »
-- comme à valider avant développement. La structure ci-dessous est une proposition d'implémentation, à
-- faire confirmer par la COSITI (même traitement qu'en J3 et J8).
--
-- Décisions structurantes :
--   1. Un rapport est un **instantané figé** : ses chiffres sont recopiés au moment de la production, pas
--      recalculés à la lecture. Un rapport transmis au PCA doit dire la même chose dans six mois — le
--      recalculer le rendrait incohérent avec la décision qu'il a servi à prendre.
--   2. `contenu` est un JSONB : les indicateurs d'un rapport évolueront, et un schéma en colonnes figerait
--      la forme du premier rapport produit. La période et les totaux principaux restent en colonnes, parce
--      qu'ils servent au filtrage et au tri.
--   3. Aucune suppression : un rapport transmis appartient à l'historique de la coopérative.

CREATE TABLE rapport_daf (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    titre VARCHAR(200) NOT NULL,
    statut VARCHAR(20) NOT NULL DEFAULT 'BROUILLON'
        CHECK (statut IN ('BROUILLON', 'PRODUIT', 'TRANSMIS')),

    periode_debut DATE NOT NULL,
    periode_fin DATE NOT NULL,

    -- Totaux figés au moment de la production.
    montant_valide NUMERIC(14,2) NOT NULL DEFAULT 0,
    montant_a_controler NUMERIC(14,2) NOT NULL DEFAULT 0,
    nb_paiements_valides INTEGER NOT NULL DEFAULT 0,
    nb_incoherences INTEGER NOT NULL DEFAULT 0,

    -- Indicateurs détaillés, tels que constatés à la production.
    contenu JSONB NOT NULL DEFAULT '{}'::jsonb,
    commentaire TEXT,

    produit_le TIMESTAMPTZ,
    produit_par VARCHAR(80),
    transmis_le TIMESTAMPTZ,
    transmis_par VARCHAR(80),

    cree_le TIMESTAMPTZ NOT NULL DEFAULT now(),
    cree_par VARCHAR(80),
    modifie_le TIMESTAMPTZ,
    modifie_par VARCHAR(80),
    version BIGINT NOT NULL DEFAULT 0,

    CONSTRAINT ck_rapport_daf_periode CHECK (periode_fin >= periode_debut)
);

CREATE INDEX idx_rapport_daf_statut ON rapport_daf(statut, periode_fin DESC);

-- ------------------------------------------------------------------
-- Catalogue de permissions du jalon
-- ------------------------------------------------------------------

INSERT INTO permission (code, module, libelle) VALUES
    ('RAPPORT_DAF:LIRE', 'RAPPORT_DAF', 'Consulter les rapports financiers produits par le DAF'),
    ('RAPPORT_DAF:PRODUIRE', 'RAPPORT_DAF', 'Produire un rapport financier (réservé DAF)'),
    ('RAPPORT_DAF:TRANSMETTRE', 'RAPPORT_DAF', 'Transmettre un rapport au PCA (réservé DAF)'),
    ('EXPORT:ADHERENTS', 'EXPORT', 'Exporter le référentiel des adhérents (export journalisé)'),
    ('EXPORT:PAIEMENTS', 'EXPORT', 'Exporter le journal des paiements (export journalisé)'),
    ('EXPORT:CNPS', 'EXPORT', 'Exporter les dossiers CNPS (export journalisé)')
ON CONFLICT (code) DO NOTHING;

-- Lecture des rapports : le PCA les reçoit (UC-PCA-07), le DAF relit les siens, le DG et la DGA les
-- consultent « selon droits » (Roles des acteurs.md §11). Personne d'autre — REC-H12.
INSERT INTO role_permission (role_id, permission_id)
SELECT r.id, p.id FROM role r, permission p
WHERE r.code IN ('PCA', 'DAF', 'DG', 'DGA')
  AND p.code = 'RAPPORT_DAF:LIRE'
ON CONFLICT DO NOTHING;

-- Production et transmission : le DAF, et lui seul (UC-DAF-09, UC-DAF-10).
INSERT INTO role_permission (role_id, permission_id)
SELECT r.id, p.id FROM role r, permission p
WHERE r.code = 'DAF'
  AND p.code IN ('RAPPORT_DAF:PRODUIRE', 'RAPPORT_DAF:TRANSMETTRE')
ON CONFLICT DO NOTHING;

-- Exports : chacun dans son domaine. Tout export est filtré par le périmètre du demandeur et journalisé
-- (`EXPORT_SENSIBLE`) — docs/04_SECURITE.md §4.
INSERT INTO role_permission (role_id, permission_id)
SELECT r.id, p.id FROM role r, permission p
WHERE r.code IN ('GESTIONNAIRE_COMPTE', 'DGA', 'DG')
  AND p.code = 'EXPORT:ADHERENTS'
ON CONFLICT DO NOTHING;

INSERT INTO role_permission (role_id, permission_id)
SELECT r.id, p.id FROM role r, permission p
WHERE r.code IN ('DAF', 'DG', 'DGA')
  AND p.code = 'EXPORT:PAIEMENTS'
ON CONFLICT DO NOTHING;

INSERT INTO role_permission (role_id, permission_id)
SELECT r.id, p.id FROM role r, permission p
WHERE r.code = 'GESTIONNAIRE_COMPTE'
  AND p.code = 'EXPORT:CNPS'
ON CONFLICT DO NOTHING;

-- ------------------------------------------------------------------
-- Règle paramétrable du jalon
-- ------------------------------------------------------------------

INSERT INTO parametre (cle, valeur, type_valeur, libelle, statut_validation) VALUES
    -- Au-delà de ce nombre de lignes, l'export est refusé avec un message demandant de restreindre les
    -- filtres. `03_SPECIFICATIONS_API.md §10` prévoit une génération asynchrone au-delà d'un seuil : elle
    -- n'est pas construite en V1 (voir SUIVI_EXECUTION.md). Refuser explicitement vaut mieux que produire
    -- un fichier de plusieurs minutes dans une requête HTTP synchrone.
    ('EXPORT_SEUIL_LIGNES', '5000', 'ENTIER',
     'Nombre maximal de lignes d''un export synchrone', 'A')
ON CONFLICT (cle) DO NOTHING;
