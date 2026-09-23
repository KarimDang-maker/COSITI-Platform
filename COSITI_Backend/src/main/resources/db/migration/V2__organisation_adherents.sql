-- V2__organisation_adherents.sql
-- Organisation terrain, zones, agents, activités, associations, packs, adhérents et portefeuilles

-- Séquence pour la génération atomique des matricules (COSITI-0000N)
CREATE SEQUENCE seq_matricule_adherent START WITH 1 INCREMENT BY 1;

-- 1. Zone
CREATE TABLE zone (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    code VARCHAR(20) UNIQUE NOT NULL,
    libelle VARCHAR(120) NOT NULL,
    ville VARCHAR(80) NOT NULL,
    region VARCHAR(80) NOT NULL,
    zone_parente_id UUID REFERENCES zone(id) ON DELETE SET NULL,
    active BOOLEAN NOT NULL DEFAULT true,
    cree_le TIMESTAMPTZ NOT NULL DEFAULT now(),
    cree_par VARCHAR(80),
    modifie_le TIMESTAMPTZ,
    modifie_par VARCHAR(80),
    archive BOOLEAN NOT NULL DEFAULT false,
    archive_le TIMESTAMPTZ,
    archive_par VARCHAR(80),
    motif_archivage TEXT
);

-- 2. Agent
CREATE TABLE agent (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    code_agent VARCHAR(20) UNIQUE NOT NULL,
    nom_complet VARCHAR(160) NOT NULL,
    telephone VARCHAR(20) NOT NULL,
    zone_id UUID REFERENCES zone(id) ON DELETE RESTRICT,
    utilisateur_id UUID REFERENCES utilisateur(id) ON DELETE SET NULL,
    chef_agent_id UUID REFERENCES agent(id) ON DELETE SET NULL, -- Contrat [A] : supervision hiérarchique
    objectif_collecte_mensuel NUMERIC(14,2),
    actif BOOLEAN NOT NULL DEFAULT true,
    cree_le TIMESTAMPTZ NOT NULL DEFAULT now(),
    cree_par VARCHAR(80),
    modifie_le TIMESTAMPTZ,
    modifie_par VARCHAR(80),
    archive BOOLEAN NOT NULL DEFAULT false,
    archive_le TIMESTAMPTZ,
    archive_par VARCHAR(80),
    motif_archivage TEXT
);

-- 3. Activité (Référentiel)
CREATE TABLE activite (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    code VARCHAR(30) UNIQUE NOT NULL,
    libelle VARCHAR(120) NOT NULL,
    categorie VARCHAR(60) NOT NULL
);

INSERT INTO activite (code, libelle, categorie) VALUES
('TRANSPORTEUR', 'Transporteur (Moto-taxi, Chauffeur)', 'TRANSPORT'),
('BAYAM_SELLAM', 'Bayam-Sellam (Vivres frais, Marché)', 'COMMERCE_ALIMENTAIRE'),
('TOURNEDOS', 'Restauration de rue / Tourne-dos', 'RESTAURATION'),
('EVENEMENTIEL', 'Événementiel et Prestations', 'SERVICES'),
('PETIT_COMMERCE', 'Petit commerce et Boutique', 'COMMERCE'),
('PETIT_METIER', 'Artisan et Petit Métier (Couture, Coiffure, Mécanique)', 'ARTISANAT'),
('AUTRE', 'Autre secteur informel', 'DIVERS');

-- 4. Association partenaire
CREATE TABLE association (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    code VARCHAR(20) UNIQUE NOT NULL,
    nom VARCHAR(160) NOT NULL,
    type VARCHAR(60),
    contact_nom VARCHAR(160),
    contact_telephone VARCHAR(20),
    zone_id UUID REFERENCES zone(id) ON DELETE SET NULL,
    date_convention DATE,
    active BOOLEAN NOT NULL DEFAULT true
);

-- 5. Pack de cotisation
CREATE TABLE pack (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    code VARCHAR(20) UNIQUE NOT NULL,
    libelle VARCHAR(80) NOT NULL,
    montant_journalier NUMERIC(14,2) NOT NULL,
    montant_mensuel_equivalent NUMERIC(14,2) NOT NULL,
    seuil_eligibilite_cnps NUMERIC(14,2) NOT NULL,
    actif BOOLEAN NOT NULL DEFAULT true
);

INSERT INTO pack (code, libelle, montant_journalier, montant_mensuel_equivalent, seuil_eligibilite_cnps, actif) VALUES
('PACK_700', 'Pack Essentiel 700 F/jour', 700.00, 21000.00, 10500.00, true),
('PACK_1000', 'Pack Épargne & Sérénité 1000 F/jour', 1000.00, 30000.00, 15000.00, true);

-- 6. Adhérent
CREATE TABLE adherent (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    matricule VARCHAR(20) UNIQUE NOT NULL,
    nom VARCHAR(100) NOT NULL,
    prenoms VARCHAR(140),
    date_naissance DATE CHECK (date_naissance < CURRENT_DATE),
    sexe VARCHAR(1) CHECK (sexe IN ('M', 'F')),
    telephone_principal VARCHAR(20) NOT NULL,
    telephone_secondaire VARCHAR(20),
    numero_cni VARCHAR(30),
    numero_cnps VARCHAR(30),
    activite_id UUID NOT NULL REFERENCES activite(id) ON DELETE RESTRICT,
    zone_id UUID NOT NULL REFERENCES zone(id) ON DELETE RESTRICT,
    association_id UUID REFERENCES association(id) ON DELETE SET NULL,
    localisation VARCHAR(200) NOT NULL,
    quartier VARCHAR(100),
    ville VARCHAR(80),
    latitude NUMERIC(9,6),
    longitude NUMERIC(9,6),
    date_adhesion DATE NOT NULL,
    statut VARCHAR(20) NOT NULL DEFAULT 'PREINSCRIT', -- PREINSCRIT, ACTIF, EN_RETARD, INACTIF, REACTIVE, RADIE
    inscription_payee BOOLEAN NOT NULL DEFAULT false,
    consentement_donnees_le TIMESTAMPTZ,
    archive BOOLEAN NOT NULL DEFAULT false,
    archive_le TIMESTAMPTZ,
    archive_par VARCHAR(80),
    motif_archivage TEXT,
    cree_le TIMESTAMPTZ NOT NULL DEFAULT now(),
    cree_par VARCHAR(80),
    modifie_le TIMESTAMPTZ,
    modifie_par VARCHAR(80),
    version BIGINT NOT NULL DEFAULT 0
);

CREATE INDEX idx_adherent_matricule ON adherent(matricule);
CREATE INDEX idx_adherent_tel ON adherent(telephone_principal);
CREATE INDEX idx_adherent_statut ON adherent(statut);
CREATE INDEX idx_adherent_zone_statut ON adherent(zone_id, statut);
CREATE INDEX idx_adherent_noms_trgm ON adherent USING gin (nom gin_trgm_ops, prenoms gin_trgm_ops);
CREATE UNIQUE INDEX idx_adherent_cni_unique ON adherent(numero_cni) WHERE numero_cni IS NOT NULL AND archive = false;

-- 7. Affectation portefeuille (historisé avec unicité de l'affectation active)
CREATE TABLE affectation_portefeuille (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    adherent_id UUID NOT NULL REFERENCES adherent(id) ON DELETE CASCADE,
    agent_id UUID NOT NULL REFERENCES agent(id) ON DELETE RESTRICT,
    date_debut DATE NOT NULL,
    date_fin DATE,
    motif VARCHAR(200),
    auteur_id UUID REFERENCES utilisateur(id) ON DELETE SET NULL,
    cree_le TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX idx_unique_portefeuille_ouvert ON affectation_portefeuille(adherent_id) WHERE date_fin IS NULL;
CREATE INDEX idx_portefeuille_agent ON affectation_portefeuille(agent_id, date_fin);

-- 8. Adhésion (historique des packs souscrits)
CREATE TABLE adhesion (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    adherent_id UUID NOT NULL REFERENCES adherent(id) ON DELETE CASCADE,
    pack_id UUID NOT NULL REFERENCES pack(id) ON DELETE RESTRICT,
    date_debut DATE NOT NULL,
    date_fin DATE,
    motif_changement VARCHAR(200),
    auteur_id UUID REFERENCES utilisateur(id) ON DELETE SET NULL,
    cree_le TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX idx_unique_adhesion_ouverte ON adhesion(adherent_id) WHERE date_fin IS NULL;

-- 9. Ayant droit
CREATE TABLE ayant_droit (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    adherent_id UUID NOT NULL REFERENCES adherent(id) ON DELETE CASCADE,
    type_lien VARCHAR(20) NOT NULL CHECK (type_lien IN ('ENFANT', 'CONJOINT')),
    nom VARCHAR(100) NOT NULL,
    prenoms VARCHAR(140),
    date_naissance DATE,
    cree_le TIMESTAMPTZ NOT NULL DEFAULT now(),
    cree_par VARCHAR(80)
);
