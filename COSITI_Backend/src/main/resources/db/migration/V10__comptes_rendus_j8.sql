-- V10__comptes_rendus_j8.sql
-- Jalon J8 — Relances, notifications et chaîne de comptes rendus Agent -> Gestionnaire -> DGA.
--
-- Les tables `campagne_relance`, `relance` et `notification` existent depuis V4 : elles ne sont pas
-- retouchées. Cette migration crée la seule table manquante du jalon, `compte_rendu`, et ajoute le
-- catalogue de permissions correspondant.
--
-- CONTRAT [A] — `Roles des acteurs.md §14` et `docs/02_CLASSES_ET_METHODES.md §3` marquent le compte rendu
-- terrain comme « contrat non confirmé, à valider avant codage ». La structure ci-dessous est une
-- proposition d'implémentation, à faire valider formellement par la COSITI (même traitement qu'en J3 pour
-- l'ajout d'agent et la désignation du Chef, livrés puis soumis à validation). Les choix structurants et
-- leur motif sont consignés ici plutôt que dans un commentaire de code isolé :
--
--   1. Un seul type d'objet pour les deux niveaux de la chaîne (`type` = TERRAIN ou CONSOLIDE) plutôt que
--      deux tables : un consolidé est un compte rendu, avec les mêmes indicateurs, seulement produit par le
--      Gestionnaire à partir de plusieurs sources. Deux tables auraient dupliqué le cycle de vie.
--   2. Les indicateurs sont des colonnes typées, pas un JSON libre : `Roles des acteurs.md §13.5` exige que
--      « les comptes rendus destinés aux rapports soient structurés ». Un texte libre ne serait pas
--      exploitable par les rapports du jalon J10.
--   3. `compte_rendu_source` trace la consolidation (exigence `ServiceCompteRendu.consolider` :
--      « avec traçabilité »). Clé primaire composite : une source ne peut pas être consolidée deux fois
--      dans le même consolidé.
--   4. Aucune suppression physique (AGENTS.md règle n°3) : `archive` + `motif_archivage`.

CREATE TABLE compte_rendu (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    type VARCHAR(20) NOT NULL CHECK (type IN ('TERRAIN', 'CONSOLIDE')),
    statut VARCHAR(20) NOT NULL DEFAULT 'BROUILLON'
        CHECK (statut IN ('BROUILLON', 'CONTROLE', 'CONSOLIDE', 'TRANSMIS')),

    -- Auteur : l'Agent de terrain pour un TERRAIN, le Gestionnaire des comptes pour un CONSOLIDE.
    auteur_utilisateur_id UUID NOT NULL REFERENCES utilisateur(id) ON DELETE RESTRICT,
    -- Destinataire : le Gestionnaire des comptes pour un TERRAIN, la DGA pour un CONSOLIDE. Nul tant que le
    -- compte rendu est en brouillon chez son auteur.
    destinataire_utilisateur_id UUID REFERENCES utilisateur(id) ON DELETE SET NULL,

    agent_id UUID REFERENCES agent(id) ON DELETE SET NULL,
    zone_id UUID REFERENCES zone(id) ON DELETE SET NULL,

    periode_debut DATE NOT NULL,
    periode_fin DATE NOT NULL,

    -- Indicateurs structurés, tous constatés sur le terrain par l'auteur. Aucun n'est recalculé par le
    -- serveur à partir des paiements : un compte rendu est une déclaration de l'agent, pas une vue de la
    -- base. Les écarts éventuels avec les données enregistrées sont précisément ce que le Gestionnaire
    -- contrôle.
    nb_visites INTEGER NOT NULL DEFAULT 0 CHECK (nb_visites >= 0),
    nb_adherents_rencontres INTEGER NOT NULL DEFAULT 0 CHECK (nb_adherents_rencontres >= 0),
    nb_adherents_crees INTEGER NOT NULL DEFAULT 0 CHECK (nb_adherents_crees >= 0),
    nb_paiements_enregistres INTEGER NOT NULL DEFAULT 0 CHECK (nb_paiements_enregistres >= 0),
    montant_collecte NUMERIC(14,2) NOT NULL DEFAULT 0 CHECK (montant_collecte >= 0),

    synthese TEXT,
    difficultes TEXT,
    -- Observation du Gestionnaire au moment du contrôle (UC-GC-13).
    observation_controle TEXT,

    controle_le TIMESTAMPTZ,
    controle_par VARCHAR(80),
    transmis_le TIMESTAMPTZ,

    cree_le TIMESTAMPTZ NOT NULL DEFAULT now(),
    cree_par VARCHAR(80),
    modifie_le TIMESTAMPTZ,
    modifie_par VARCHAR(80),
    archive BOOLEAN NOT NULL DEFAULT false,
    motif_archivage TEXT,
    version BIGINT NOT NULL DEFAULT 0,

    CONSTRAINT ck_compte_rendu_periode CHECK (periode_fin >= periode_debut)
);

CREATE INDEX idx_compte_rendu_destinataire ON compte_rendu(destinataire_utilisateur_id, statut);
CREATE INDEX idx_compte_rendu_auteur ON compte_rendu(auteur_utilisateur_id, periode_debut DESC);
CREATE INDEX idx_compte_rendu_agent ON compte_rendu(agent_id, periode_debut DESC);

CREATE TABLE compte_rendu_source (
    consolide_id UUID NOT NULL REFERENCES compte_rendu(id) ON DELETE CASCADE,
    source_id UUID NOT NULL REFERENCES compte_rendu(id) ON DELETE RESTRICT,
    PRIMARY KEY (consolide_id, source_id)
);

CREATE INDEX idx_compte_rendu_source_source ON compte_rendu_source(source_id);

-- ------------------------------------------------------------------
-- Catalogue de permissions du jalon
-- ------------------------------------------------------------------

INSERT INTO permission (code, module, libelle) VALUES
    -- Comptes rendus (J8)
    ('COMPTE_RENDU:LIRE', 'COMPTE_RENDU', 'Consulter les comptes rendus de son périmètre'),
    ('COMPTE_RENDU:PRODUIRE', 'COMPTE_RENDU', 'Produire un compte rendu terrain et le transmettre au Gestionnaire'),
    ('COMPTE_RENDU:CONTROLER', 'COMPTE_RENDU', 'Contrôler un compte rendu terrain reçu (Gestionnaire des comptes)'),
    ('COMPTE_RENDU:CONSOLIDER', 'COMPTE_RENDU', 'Consolider des comptes rendus terrain et transmettre à la DGA'),

    -- Relances (J8)
    ('RELANCE:LIRE', 'RELANCE', 'Consulter les relances et les campagnes de relance'),
    ('RELANCE:ENREGISTRER', 'RELANCE', 'Enregistrer une relance et son résultat'),
    ('RELANCE:GERER_CAMPAGNE', 'RELANCE', 'Créer, suspendre ou clôturer une campagne de relance')
ON CONFLICT (code) DO NOTHING;

-- Lecture des comptes rendus : l'Agent lit les siens, le Chef ceux de son équipe, le Gestionnaire ceux
-- qu'il reçoit, la DGA les consolidés. Le périmètre réel est appliqué par ServicePerimetreDonnees ;
-- la permission ouvre l'écran, elle ne décide pas de ce qui y apparaît.
INSERT INTO role_permission (role_id, permission_id)
SELECT r.id, p.id FROM role r, permission p
WHERE r.code IN ('DGA', 'GESTIONNAIRE_COMPTE', 'CHEF_AGENT_TERRAIN', 'AGENT_TERRAIN', 'PCA', 'DG')
  AND p.code = 'COMPTE_RENDU:LIRE'
ON CONFLICT DO NOTHING;

-- Produire un compte rendu terrain : l'Agent de terrain (UC-AG-10). Le Chef reste un Agent de terrain
-- désigné : il produit aussi les siens.
INSERT INTO role_permission (role_id, permission_id)
SELECT r.id, p.id FROM role r, permission p
WHERE r.code IN ('AGENT_TERRAIN', 'CHEF_AGENT_TERRAIN')
  AND p.code = 'COMPTE_RENDU:PRODUIRE'
ON CONFLICT DO NOTHING;

-- Contrôler et consolider : le Gestionnaire des comptes (UC-GC-13 à UC-GC-15), et lui seul.
INSERT INTO role_permission (role_id, permission_id)
SELECT r.id, p.id FROM role r, permission p
WHERE r.code = 'GESTIONNAIRE_COMPTE'
  AND p.code IN ('COMPTE_RENDU:CONTROLER', 'COMPTE_RENDU:CONSOLIDER')
ON CONFLICT DO NOTHING;

-- Relances (Roles des acteurs.md §11) : l'Agent et le Chef les effectuent, le Gestionnaire les suit,
-- PCA/DG/DGA/DAF les consultent.
INSERT INTO role_permission (role_id, permission_id)
SELECT r.id, p.id FROM role r, permission p
WHERE r.code IN ('PCA', 'DG', 'DGA', 'DAF', 'GESTIONNAIRE_COMPTE', 'CHEF_AGENT_TERRAIN', 'AGENT_TERRAIN')
  AND p.code = 'RELANCE:LIRE'
ON CONFLICT DO NOTHING;

INSERT INTO role_permission (role_id, permission_id)
SELECT r.id, p.id FROM role r, permission p
WHERE r.code IN ('AGENT_TERRAIN', 'CHEF_AGENT_TERRAIN', 'GESTIONNAIRE_COMPTE')
  AND p.code = 'RELANCE:ENREGISTRER'
ON CONFLICT DO NOTHING;

INSERT INTO role_permission (role_id, permission_id)
SELECT r.id, p.id FROM role r, permission p
WHERE r.code IN ('GESTIONNAIRE_COMPTE', 'CHEF_AGENT_TERRAIN')
  AND p.code = 'RELANCE:GERER_CAMPAGNE'
ON CONFLICT DO NOTHING;
