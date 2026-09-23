-- V3__cotisations_droits.sql
-- Module financier (données de versement, affectations, remises de caisse et périodes de droits)

CREATE SEQUENCE seq_numero_recu START WITH 1 INCREMENT BY 1;

-- 1. Composante d'affectation
CREATE TABLE composante_affectation (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    code VARCHAR(30) UNIQUE NOT NULL,
    libelle VARCHAR(120) NOT NULL,
    nature VARCHAR(20) NOT NULL CHECK (nature IN ('PRODUIT', 'DETTE_ADHERENT', 'REVERSEMENT_TIERS')),
    actif BOOLEAN NOT NULL DEFAULT true
);

INSERT INTO composante_affectation (code, libelle, nature, actif) VALUES
('CNPS', 'Cotisation Sociale CNPS', 'REVERSEMENT_TIERS', true),
('COOPERATIVE', 'Part fonctionnement Coopérative COSITI', 'PRODUIT', true),
('EPARGNE', 'Épargne volontaire adhérent', 'DETTE_ADHERENT', true),
('FRAIS_GESTION', 'Frais de gestion et services', 'PRODUIT', true);

-- 2. Remise de caisse (contrôle interne caisse / coffre-fort - jamais de transfert bancaire)
CREATE TABLE remise_caisse (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    agent_id UUID NOT NULL REFERENCES agent(id) ON DELETE RESTRICT,
    date_remise DATE NOT NULL,
    montant_declare NUMERIC(14,2) NOT NULL CHECK (montant_declare >= 0),
    montant_recu NUMERIC(14,2),
    ecart NUMERIC(14,2) GENERATED ALWAYS AS (COALESCE(montant_recu, 0) - montant_declare) STORED,
    statut VARCHAR(20) NOT NULL DEFAULT 'DECLAREE', -- DECLAREE, RECUE, EN_ECART, CLOTUREE
    recu_par UUID REFERENCES utilisateur(id) ON DELETE SET NULL,
    recu_le TIMESTAMPTZ,
    commentaire TEXT,
    cree_le TIMESTAMPTZ NOT NULL DEFAULT now(),
    cree_par VARCHAR(80)
);

-- 3. Paiement (enregistrement des données financières pures)
CREATE TABLE paiement (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    adherent_id UUID NOT NULL REFERENCES adherent(id) ON DELETE RESTRICT,
    numero_recu VARCHAR(30) UNIQUE NOT NULL,
    date_paiement DATE NOT NULL CHECK (date_paiement <= CURRENT_DATE),
    montant NUMERIC(14,2) NOT NULL CHECK (montant > 0),
    mode_paiement VARCHAR(20) NOT NULL CHECK (mode_paiement IN ('ESPECES', 'ORANGE_MONEY', 'MTN_MOMO', 'VIREMENT')),
    reference_transaction VARCHAR(60),
    type_paiement VARCHAR(20) NOT NULL DEFAULT 'COTISATION' CHECK (type_paiement IN ('INSCRIPTION', 'COTISATION')),
    agent_encaisseur_id UUID REFERENCES agent(id) ON DELETE SET NULL,
    statut VARCHAR(20) NOT NULL DEFAULT 'A_CONTROLER' CHECK (statut IN ('BROUILLON', 'A_CONTROLER', 'VALIDE', 'RAPPROCHE', 'ANNULE', 'INCOHERENCE')),
    
    -- Traçabilité hiérarchique (Agent -> Chef -> DAF)
    confirme_par_chef_id UUID REFERENCES utilisateur(id) ON DELETE SET NULL,
    confirme_le TIMESTAMPTZ,
    valide_par UUID REFERENCES utilisateur(id) ON DELETE SET NULL,
    valide_le TIMESTAMPTZ,
    motif_annulation TEXT,
    motif_incoherence TEXT,
    remise_caisse_id UUID REFERENCES remise_caisse(id) ON DELETE SET NULL,
    cle_idempotence VARCHAR(80) UNIQUE,
    archive BOOLEAN NOT NULL DEFAULT false,
    cree_le TIMESTAMPTZ NOT NULL DEFAULT now(),
    cree_par VARCHAR(80),
    modifie_le TIMESTAMPTZ,
    modifie_par VARCHAR(80),
    version BIGINT NOT NULL DEFAULT 0,

    -- Contraintes d'intégrité strictes
    CONSTRAINT chk_reference_mobile_money CHECK (
        mode_paiement NOT IN ('ORANGE_MONEY', 'MTN_MOMO')
        OR (reference_transaction IS NOT NULL AND length(trim(reference_transaction)) > 0)
    ),
    CONSTRAINT chk_validation_coherente CHECK (
        (statut <> 'VALIDE') OR (valide_par IS NOT NULL AND valide_le IS NOT NULL)
    ),
    CONSTRAINT chk_annulation_motivee CHECK (
        (statut <> 'ANNULE') OR (motif_annulation IS NOT NULL)
    )
);

CREATE INDEX idx_paiement_adherent ON paiement(adherent_id, date_paiement DESC);
CREATE INDEX idx_paiement_statut ON paiement(statut);
CREATE INDEX idx_paiement_mode_date ON paiement(mode_paiement, date_paiement);
CREATE INDEX idx_paiement_agent ON paiement(agent_encaisseur_id, date_paiement);

-- 4. Affectation de paiement
CREATE TABLE affectation_paiement (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    paiement_id UUID NOT NULL REFERENCES paiement(id) ON DELETE CASCADE,
    composante_id UUID NOT NULL REFERENCES composante_affectation(id) ON DELETE RESTRICT,
    montant NUMERIC(14,2) NOT NULL CHECK (montant > 0),
    regle_appliquee VARCHAR(80) NOT NULL,
    cree_le TIMESTAMPTZ NOT NULL DEFAULT now(),
    cree_par VARCHAR(80)
);

CREATE INDEX idx_affectation_paiement_id ON affectation_paiement(paiement_id);

-- 5. Période de droits (persiste ce que le versement valide achète)
CREATE TABLE periode_droits (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    adherent_id UUID NOT NULL REFERENCES adherent(id) ON DELETE CASCADE,
    date_debut DATE NOT NULL,
    date_fin DATE NOT NULL CHECK (date_fin >= date_debut),
    jours_couverts INTEGER NOT NULL CHECK (jours_couverts > 0),
    montant_impute NUMERIC(14,2) NOT NULL CHECK (montant_impute > 0),
    pack_id UUID NOT NULL REFERENCES pack(id) ON DELETE RESTRICT,
    statut VARCHAR(20) NOT NULL DEFAULT 'COUVERTE' CHECK (statut IN ('COUVERTE', 'PARTIELLE', 'ANNULEE')),
    source_affectation_id UUID REFERENCES affectation_paiement(id) ON DELETE SET NULL,
    cree_le TIMESTAMPTZ NOT NULL DEFAULT now(),
    cree_par VARCHAR(80)
);

CREATE INDEX idx_periode_droits_adh ON periode_droits(adherent_id, date_debut);
CREATE INDEX idx_periode_droits_fin ON periode_droits(adherent_id, date_fin DESC);
