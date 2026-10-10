-- V19__workflow_validation_3_modules.sql
-- Socle transversal de correction, validation et traçabilité (docs/COSITI_V1_BACKEND_MISE_A_JOUR_3_MODULES_WORKFLOW.md),
-- intégré aux modules Adhérents, Agents de terrain et Cotisations. Uniquement additif.

-- ------------------------------------------------------------------------------------------------
-- 1. Statut de validation des entités, distinct de leur statut métier (§5). Les lignes existantes sont
--    réputées officielles ('VALIDE') : elles ont été créées et utilisées avant l'existence du workflow.
--    Les nouvelles lignes naissent en 'BROUILLON' [A — à confirmer par la COSITI].
-- ------------------------------------------------------------------------------------------------
ALTER TABLE adherent ADD COLUMN statut_validation VARCHAR(30) NOT NULL DEFAULT 'VALIDE'
    CHECK (statut_validation IN ('BROUILLON', 'EN_ATTENTE_VALIDATION', 'CORRECTION_DEMANDEE', 'VALIDE', 'REJETE'));
ALTER TABLE adherent ALTER COLUMN statut_validation SET DEFAULT 'BROUILLON';

ALTER TABLE agent ADD COLUMN statut_validation VARCHAR(30) NOT NULL DEFAULT 'VALIDE'
    CHECK (statut_validation IN ('BROUILLON', 'EN_ATTENTE_VALIDATION', 'CORRECTION_DEMANDEE', 'VALIDE', 'REJETE'));
ALTER TABLE agent ALTER COLUMN statut_validation SET DEFAULT 'BROUILLON';

-- Verrouillage optimiste de l'agent (§17) : la table n'avait pas de colonne de version.
ALTER TABLE agent ADD COLUMN version BIGINT NOT NULL DEFAULT 0;

-- ------------------------------------------------------------------------------------------------
-- 2. Demande de validation (§6.1).
-- ------------------------------------------------------------------------------------------------
CREATE SEQUENCE seq_reference_demande_validation START WITH 1 INCREMENT BY 1;

CREATE TABLE demande_validation (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    reference VARCHAR(30) NOT NULL UNIQUE,
    type_entite VARCHAR(30) NOT NULL CHECK (type_entite IN ('ADHERENT', 'AGENT', 'PAIEMENT')),
    entite_id UUID NOT NULL,
    type_operation VARCHAR(40) NOT NULL CHECK (type_operation IN (
        'ADHERENT_VALIDATION_DOSSIER', 'ADHERENT_MODIFICATION',
        'AGENT_VALIDATION_PROFIL', 'AGENT_MODIFICATION', 'AGENT_CHANGEMENT_STATUT',
        'PAIEMENT_CORRECTION')),
    statut VARCHAR(30) NOT NULL DEFAULT 'BROUILLON' CHECK (statut IN (
        'BROUILLON', 'EN_ATTENTE_VALIDATION', 'CORRECTION_DEMANDEE', 'APPROUVEE', 'REJETEE', 'ANNULEE')),
    motif TEXT NOT NULL,
    commentaire_validateur TEXT,
    version_base BIGINT NOT NULL,
    demande_par UUID NOT NULL REFERENCES utilisateur(id) ON DELETE RESTRICT,
    demande_par_identifiant VARCHAR(80) NOT NULL,
    demande_le TIMESTAMPTZ NOT NULL DEFAULT now(),
    soumise_le TIMESTAMPTZ,
    examinee_par UUID REFERENCES utilisateur(id) ON DELETE SET NULL,
    examinee_le TIMESTAMPTZ,
    appliquee_le TIMESTAMPTZ,
    cle_idempotence VARCHAR(80) UNIQUE,
    cree_le TIMESTAMPTZ NOT NULL DEFAULT now(),
    cree_par VARCHAR(80),
    modifie_le TIMESTAMPTZ,
    modifie_par VARCHAR(80),
    version BIGINT NOT NULL DEFAULT 0,
    -- Séparation des tâches (§19) garantie jusque dans la base.
    CONSTRAINT chk_demande_pas_auto_validation CHECK (examinee_par IS NULL OR examinee_par <> demande_par),
    CONSTRAINT chk_demande_decision_coherente CHECK (
        statut NOT IN ('APPROUVEE', 'REJETEE') OR (examinee_par IS NOT NULL AND examinee_le IS NOT NULL))
);

-- Une seule demande ouverte par entité (§25 « Demande active en doublon : 409 »).
CREATE UNIQUE INDEX idx_demande_validation_ouverte ON demande_validation(type_entite, entite_id)
    WHERE statut IN ('BROUILLON', 'EN_ATTENTE_VALIDATION', 'CORRECTION_DEMANDEE');
CREATE INDEX idx_demande_validation_entite ON demande_validation(type_entite, entite_id, demande_le DESC);
CREATE INDEX idx_demande_validation_statut ON demande_validation(statut, type_operation, soumise_le);

-- 3. Éléments : changements champ par champ (§6.2).
CREATE TABLE demande_validation_element (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    demande_id UUID NOT NULL REFERENCES demande_validation(id) ON DELETE RESTRICT,
    champ VARCHAR(60) NOT NULL,
    type_donnee VARCHAR(20) NOT NULL CHECK (type_donnee IN ('TEXTE', 'DATE', 'DECIMAL', 'UUID', 'BOOLEEN', 'ENUM')),
    ancienne_valeur TEXT,
    valeur_proposee TEXT,
    motif_changement TEXT,
    UNIQUE (demande_id, champ)
);

-- 4. Justificatifs (§6.3) — référence un document sécurisé existant, jamais un fichier.
CREATE TABLE demande_validation_document (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    demande_id UUID NOT NULL REFERENCES demande_validation(id) ON DELETE RESTRICT,
    document_id UUID NOT NULL REFERENCES document(id) ON DELETE RESTRICT,
    type_document VARCHAR(40) NOT NULL,
    obligatoire BOOLEAN NOT NULL DEFAULT false,
    ajoute_par UUID REFERENCES utilisateur(id) ON DELETE SET NULL,
    ajoute_le TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE (demande_id, document_id)
);

-- 5. Décisions et transitions (§6.4) — journal append-only du cycle de la demande.
CREATE TABLE demande_validation_decision (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    demande_id UUID NOT NULL REFERENCES demande_validation(id) ON DELETE RESTRICT,
    action VARCHAR(30) NOT NULL CHECK (action IN (
        'CREATION', 'SOUMISSION', 'RESOUMISSION', 'APPROBATION', 'REJET', 'DEMANDE_CORRECTION', 'ANNULATION')),
    statut_avant VARCHAR(30),
    statut_apres VARCHAR(30) NOT NULL,
    decide_par UUID REFERENCES utilisateur(id) ON DELETE SET NULL,
    decide_par_identifiant VARCHAR(80) NOT NULL,
    decide_le TIMESTAMPTZ NOT NULL DEFAULT now(),
    commentaire TEXT,
    -- Idempotence (§18) : une clé rejouée renvoie l'état courant, jamais une seconde application.
    cle_idempotence VARCHAR(80) UNIQUE
);

CREATE INDEX idx_demande_decision_demande ON demande_validation_decision(demande_id, decide_le);

-- ------------------------------------------------------------------------------------------------
-- 6. Politique de validation (§20) : portée par des permissions, jamais par un test de rôle « supérieur ».
--    Attribution [A] — matrice de validation non fixée par « Roles des acteurs.md » :
--      ADHERENT:VALIDER -> Gestionnaire des comptes, DGA (un dossier saisi par la Gestionnaire est validé
--                          par la DGA, la séparation demandeur/validateur l'impose) ;
--      AGENT:VALIDER    -> DG, DGA (la DGA crée les agents : ses demandes sont validées par le DG).
--    Les corrections de cotisations restent validées par le DAF (PAIEMENT:VALIDER + rôle DAF).
-- ------------------------------------------------------------------------------------------------
INSERT INTO permission (code, module, libelle) VALUES
    ('ADHERENT:VALIDER', 'ADHERENT',
     'Valider un dossier adhérent ou une demande de modification d''adhérent (jamais sa propre demande)'),
    ('AGENT:VALIDER', 'ORGANISATION',
     'Valider un profil d''agent, une modification ou un changement de statut d''agent (jamais sa propre demande)')
ON CONFLICT (code) DO NOTHING;

INSERT INTO role_permission (role_id, permission_id)
SELECT r.id, p.id FROM role r, permission p
WHERE r.code IN ('GESTIONNAIRE_COMPTE', 'DGA') AND p.code = 'ADHERENT:VALIDER'
ON CONFLICT DO NOTHING;

INSERT INTO role_permission (role_id, permission_id)
SELECT r.id, p.id FROM role r, permission p
WHERE r.code IN ('DG', 'DGA') AND p.code = 'AGENT:VALIDER'
ON CONFLICT DO NOTHING;

-- La DGA valide des dossiers adhérents : elle doit pouvoir les lire (déjà accordé en V5, rappel idempotent).
INSERT INTO role_permission (role_id, permission_id)
SELECT r.id, p.id FROM role r, permission p
WHERE r.code = 'DGA' AND p.code = 'ADHERENT:LIRE'
ON CONFLICT DO NOTHING;

-- [V] Justificatifs exigés par type d'opération, ex. {"PAIEMENT_CORRECTION":["PREUVE_PAIEMENT"]}.
-- Vide tant que la COSITI n'a pas fixé la liste : aucun justificatif n'est bloquant par défaut.
INSERT INTO parametre (cle, valeur, type_valeur, libelle, statut_validation) VALUES
    ('WORKFLOW_JUSTIFICATIFS_OBLIGATOIRES', '{}', 'JSON',
     'Types de documents exigés par type d''opération de workflow avant soumission et approbation', 'V')
ON CONFLICT (cle) DO NOTHING;
