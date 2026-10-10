-- V20__frais_adhesion_activation_controle_dga.sql
-- Frais d'adhésion, activation par le Gestionnaire des comptes et contrôle documentaire DGA
-- (COSITI_V1_SPECIFICATION_COMPLETE_FRAIS_ADHESION_ACTIVATION_CONTROLE_DGA.md, partie « Mise à jour métier »).
-- Uniquement additif. Le montant unitaire reste le paramètre MONTANT_INSCRIPTION (V1, statut C) : jamais en dur.

-- ------------------------------------------------------------------------------------------------
-- 1. Adhérent : état du contrôle documentaire DGA, distinct du statut métier (ACTIF) et du statut de
--    validation du dossier (V19) — un adhérent peut être ACTIF et EN_ATTENTE_DGA (§2).
-- ------------------------------------------------------------------------------------------------
ALTER TABLE adherent ADD COLUMN statut_controle_dga VARCHAR(30) NOT NULL DEFAULT 'NON_SOUMIS'
    CHECK (statut_controle_dga IN ('NON_SOUMIS', 'EN_ATTENTE_DGA', 'EN_COURS', 'CORRECTION_DEMANDEE', 'VALIDE', 'REJETE'));
ALTER TABLE adherent ADD COLUMN active_le TIMESTAMPTZ;
ALTER TABLE adherent ADD COLUMN active_par UUID REFERENCES utilisateur(id) ON DELETE SET NULL;
-- Première soumission : clé du comptage sans double comptage (§7) — jamais réécrite par une resoumission.
ALTER TABLE adherent ADD COLUMN premiere_soumission_dga_le TIMESTAMPTZ;
ALTER TABLE adherent ADD COLUMN derniere_soumission_dga_le TIMESTAMPTZ;

CREATE INDEX idx_adherent_soumission_dga ON adherent(premiere_soumission_dga_le) WHERE premiere_soumission_dga_le IS NOT NULL;
CREATE INDEX idx_adherent_statut_controle_dga ON adherent(statut_controle_dga);

-- ------------------------------------------------------------------------------------------------
-- 2. Frais d'adhésion (§4.1) : rattaché à l'adhérent ET à l'agent collecteur ; un seul frais initial par
--    adhérent (§8, contrainte UNIQUE). Montant attendu figé à l'enregistrement, montant reçu saisi : l'écart
--    est constaté, jamais corrigé automatiquement (§9).
-- ------------------------------------------------------------------------------------------------
CREATE SEQUENCE seq_reference_frais_adhesion START WITH 1 INCREMENT BY 1;

CREATE TABLE frais_adhesion (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    reference VARCHAR(20) NOT NULL UNIQUE,
    adherent_id UUID NOT NULL REFERENCES adherent(id) ON DELETE RESTRICT,
    agent_id UUID NOT NULL REFERENCES agent(id) ON DELETE RESTRICT,
    type_frais VARCHAR(20) NOT NULL DEFAULT 'ADHESION' CHECK (type_frais IN ('ADHESION')),
    montant_attendu NUMERIC(14,2) NOT NULL CHECK (montant_attendu > 0),
    montant_recu NUMERIC(14,2) NOT NULL CHECK (montant_recu >= 0),
    devise VARCHAR(3) NOT NULL DEFAULT 'XAF',
    date_collecte DATE NOT NULL CHECK (date_collecte <= CURRENT_DATE),
    statut VARCHAR(20) NOT NULL DEFAULT 'ENREGISTRE' CHECK (statut IN ('ENREGISTRE', 'VALIDE', 'ANOMALIE')),
    enregistre_par UUID NOT NULL REFERENCES utilisateur(id) ON DELETE RESTRICT,
    enregistre_le TIMESTAMPTZ NOT NULL DEFAULT now(),
    valide_par UUID REFERENCES utilisateur(id) ON DELETE SET NULL,
    valide_le TIMESTAMPTZ,
    motif_anomalie TEXT,
    anomalie_signalee_par UUID REFERENCES utilisateur(id) ON DELETE SET NULL,
    anomalie_signalee_le TIMESTAMPTZ,
    resolution_anomalie TEXT,
    anomalie_resolue_par UUID REFERENCES utilisateur(id) ON DELETE SET NULL,
    anomalie_resolue_le TIMESTAMPTZ,
    cle_idempotence VARCHAR(80) UNIQUE,
    commentaire TEXT,
    cree_le TIMESTAMPTZ NOT NULL DEFAULT now(),
    cree_par VARCHAR(80),
    modifie_le TIMESTAMPTZ,
    modifie_par VARCHAR(80),
    version BIGINT NOT NULL DEFAULT 0,
    CONSTRAINT uq_frais_adhesion_initial UNIQUE (adherent_id, type_frais),
    -- Séparation des tâches : celui qui enregistre ne valide jamais l'encaissement.
    CONSTRAINT chk_frais_pas_auto_validation CHECK (valide_par IS NULL OR valide_par <> enregistre_par),
    CONSTRAINT chk_frais_validation_coherente CHECK (statut <> 'VALIDE' OR (valide_par IS NOT NULL AND valide_le IS NOT NULL)),
    CONSTRAINT chk_frais_anomalie_motivee CHECK (statut <> 'ANOMALIE' OR motif_anomalie IS NOT NULL)
);

CREATE INDEX idx_frais_adhesion_agent ON frais_adhesion(agent_id, date_collecte);
CREATE INDEX idx_frais_adhesion_statut ON frais_adhesion(statut);

-- ------------------------------------------------------------------------------------------------
-- 3. Contrôle documentaire DGA (§3, §4.2, §4.3). Un contrôle par tour : une resoumission après correction
--    ouvre un nouveau tour, le précédent reste intact (historique immuable). Un seul contrôle ouvert par adhérent.
-- ------------------------------------------------------------------------------------------------
CREATE SEQUENCE seq_reference_controle_dga START WITH 1 INCREMENT BY 1;

CREATE TABLE controle_dga (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    reference VARCHAR(20) NOT NULL UNIQUE,
    adherent_id UUID NOT NULL REFERENCES adherent(id) ON DELETE RESTRICT,
    tour INTEGER NOT NULL CHECK (tour >= 1),
    controle_precedent_id UUID REFERENCES controle_dga(id) ON DELETE RESTRICT,
    statut VARCHAR(30) NOT NULL DEFAULT 'EN_ATTENTE' CHECK (statut IN (
        'EN_ATTENTE', 'EN_COURS', 'CORRECTION_DEMANDEE', 'VALIDE', 'REJETE')),
    soumis_par UUID NOT NULL REFERENCES utilisateur(id) ON DELETE RESTRICT,
    soumis_le TIMESTAMPTZ NOT NULL DEFAULT now(),
    demarre_par UUID REFERENCES utilisateur(id) ON DELETE SET NULL,
    demarre_le TIMESTAMPTZ,
    termine_par UUID REFERENCES utilisateur(id) ON DELETE SET NULL,
    termine_le TIMESTAMPTZ,
    commentaire_decision TEXT,
    cle_idempotence_decision VARCHAR(80) UNIQUE,
    cree_le TIMESTAMPTZ NOT NULL DEFAULT now(),
    cree_par VARCHAR(80),
    modifie_le TIMESTAMPTZ,
    modifie_par VARCHAR(80),
    version BIGINT NOT NULL DEFAULT 0,
    UNIQUE (adherent_id, tour),
    CONSTRAINT chk_controle_dga_decision_motivee CHECK (
        statut NOT IN ('CORRECTION_DEMANDEE', 'REJETE') OR commentaire_decision IS NOT NULL),
    CONSTRAINT chk_controle_dga_decision_coherente CHECK (
        statut NOT IN ('CORRECTION_DEMANDEE', 'REJETE', 'VALIDE') OR (termine_par IS NOT NULL AND termine_le IS NOT NULL))
);

CREATE UNIQUE INDEX idx_controle_dga_ouvert ON controle_dga(adherent_id) WHERE statut IN ('EN_ATTENTE', 'EN_COURS');
CREATE INDEX idx_controle_dga_statut ON controle_dga(statut, soumis_le);

CREATE TABLE controle_dga_document (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    controle_id UUID NOT NULL REFERENCES controle_dga(id) ON DELETE RESTRICT,
    document_id UUID REFERENCES document(id) ON DELETE RESTRICT,
    type_document VARCHAR(40) NOT NULL,
    obligatoire BOOLEAN NOT NULL,
    statut VARCHAR(20) NOT NULL DEFAULT 'A_VERIFIER' CHECK (statut IN ('A_VERIFIER', 'CONFORME', 'ANOMALIE')),
    UNIQUE (controle_id, type_document)
);

CREATE TABLE controle_dga_champ (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    controle_id UUID NOT NULL REFERENCES controle_dga(id) ON DELETE RESTRICT,
    controle_document_id UUID NOT NULL REFERENCES controle_dga_document(id) ON DELETE RESTRICT,
    champ VARCHAR(60) NOT NULL,
    libelle VARCHAR(120) NOT NULL,
    -- Valeur enregistrée dans COSITI, figée au démarrage du contrôle : la DGA compare toujours la même donnée.
    valeur_numerique TEXT,
    valeur_physique TEXT,
    statut_correspondance VARCHAR(20) CHECK (statut_correspondance IN (
        'CORRESPOND', 'NON_CORRESPOND', 'NON_VERIFIABLE', 'NON_LISIBLE', 'DOCUMENT_MANQUANT')),
    commentaire TEXT,
    verifie_par UUID REFERENCES utilisateur(id) ON DELETE SET NULL,
    verifie_le TIMESTAMPTZ,
    version BIGINT NOT NULL DEFAULT 0,
    UNIQUE (controle_document_id, champ),
    -- §14 : toute réponse autre que CORRESPOND est motivée.
    CONSTRAINT chk_controle_champ_anomalie_motivee CHECK (
        statut_correspondance IS NULL OR statut_correspondance = 'CORRESPOND' OR commentaire IS NOT NULL)
);

CREATE INDEX idx_controle_dga_champ_controle ON controle_dga_champ(controle_id);

-- ------------------------------------------------------------------------------------------------
-- 4. Règles paramétrables — [V] tant que la COSITI ne les a pas confirmées (§25).
-- ------------------------------------------------------------------------------------------------
INSERT INTO parametre (cle, valeur, type_valeur, libelle, statut_validation) VALUES
    ('ACTIVATION_EXIGE_FRAIS_ADHESION', 'true', 'BOOLEEN',
     'L''activation d''un adhérent exige un frais d''adhésion enregistré', 'V'),
    ('ACTIVATION_EXIGE_DOCUMENTS', 'true', 'BOOLEEN',
     'L''activation exige la présence des documents de DOCUMENTS_ADHERENT_OBLIGATOIRES', 'V'),
    ('CONTROLE_DGA_CHAMPS_PAR_DOCUMENT',
     '{"CNI":["nom","prenoms","dateNaissance","sexe","numeroCni"],"ACTE_NAISSANCE":["nom","prenoms","dateNaissance"]}',
     'JSON', 'Informations que la DGA compare au document physique, par type de document', 'V')
ON CONFLICT (cle) DO NOTHING;

-- ------------------------------------------------------------------------------------------------
-- 5. Permissions. Création et activation : Gestionnaire des comptes (§2). Contrôle documentaire : DGA (§3).
--    Validation de l'encaissement du frais et résolution d'anomalie : DAF [A] (§25 point 2 à confirmer).
-- ------------------------------------------------------------------------------------------------
INSERT INTO permission (code, module, libelle) VALUES
    ('ADHERENT:ACTIVER', 'ADHERENT', 'Activer un adhérent et le soumettre au contrôle documentaire DGA'),
    ('FRAIS_ADHESION:LIRE', 'ADHESION', 'Consulter les frais d''adhésion, synthèses et rapprochement'),
    ('FRAIS_ADHESION:ENREGISTRER', 'ADHESION', 'Enregistrer le frais d''adhésion collecté par un agent'),
    ('FRAIS_ADHESION:VALIDER', 'ADHESION', 'Valider l''encaissement d''un frais d''adhésion ou résoudre une anomalie (jamais le sien)'),
    ('FRAIS_ADHESION:SIGNALER', 'ADHESION', 'Signaler une anomalie sur un frais d''adhésion'),
    ('CONTROLE_DGA:LIRE', 'ADHESION', 'Consulter la file et les résultats du contrôle documentaire DGA'),
    ('CONTROLE_DGA:EFFECTUER', 'ADHESION', 'Effectuer le contrôle documentaire DGA et décider')
ON CONFLICT (code) DO NOTHING;

INSERT INTO role_permission (role_id, permission_id)
SELECT r.id, p.id FROM role r, permission p
WHERE (r.code = 'GESTIONNAIRE_COMPTE' AND p.code IN ('ADHERENT:ACTIVER', 'FRAIS_ADHESION:LIRE', 'FRAIS_ADHESION:ENREGISTRER',
                                                    'CONTROLE_DGA:LIRE'))
   OR (r.code = 'DGA' AND p.code IN ('FRAIS_ADHESION:LIRE', 'FRAIS_ADHESION:SIGNALER', 'CONTROLE_DGA:LIRE',
                                     'CONTROLE_DGA:EFFECTUER'))
   OR (r.code = 'DAF' AND p.code IN ('FRAIS_ADHESION:LIRE', 'FRAIS_ADHESION:VALIDER', 'FRAIS_ADHESION:SIGNALER'))
   OR (r.code IN ('DG', 'PCA') AND p.code IN ('FRAIS_ADHESION:LIRE', 'CONTROLE_DGA:LIRE'))
ON CONFLICT DO NOTHING;

-- La DGA consulte les documents justificatifs pour les comparer (lecture authentifiée, déjà auditée).
INSERT INTO role_permission (role_id, permission_id)
SELECT r.id, p.id FROM role r, permission p
WHERE r.code = 'DGA' AND p.code = 'DOCUMENT:LIRE'
ON CONFLICT DO NOTHING;
