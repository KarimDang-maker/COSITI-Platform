-- V1__socle_securite.sql
-- Base de données : PostgreSQL 16
-- Socle sécurité, RBAC, paramétrage métier et journal d'audit immuable

CREATE EXTENSION IF NOT EXISTS "pgcrypto";
CREATE EXTENSION IF NOT EXISTS "pg_trgm";

-- 1. Table des utilisateurs
CREATE TABLE utilisateur (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    identifiant VARCHAR(80) UNIQUE NOT NULL,
    email VARCHAR(160) UNIQUE,
    mot_de_passe_hash VARCHAR(255) NOT NULL,
    nom_complet VARCHAR(160) NOT NULL,
    telephone VARCHAR(20),
    actif BOOLEAN NOT NULL DEFAULT true,
    doit_changer_mot_de_passe BOOLEAN NOT NULL DEFAULT true,
    tentatives_echouees SMALLINT NOT NULL DEFAULT 0,
    verrouille_jusqu_a TIMESTAMPTZ,
    derniere_connexion_le TIMESTAMPTZ,
    mfa_active BOOLEAN NOT NULL DEFAULT false,
    mfa_secret_chiffre BYTEA,
    agent_id UUID,
    cree_le TIMESTAMPTZ NOT NULL DEFAULT now(),
    cree_par VARCHAR(80),
    modifie_le TIMESTAMPTZ,
    modifie_par VARCHAR(80),
    version BIGINT NOT NULL DEFAULT 0
);

CREATE INDEX idx_utilisateur_identifiant ON utilisateur(identifiant);
CREATE INDEX idx_utilisateur_actif ON utilisateur(actif);

-- 2. Table des rôles V1 (8 rôles exhaustifs)
CREATE TABLE role (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    code VARCHAR(50) UNIQUE NOT NULL,
    libelle VARCHAR(120) NOT NULL,
    description TEXT,
    systeme BOOLEAN NOT NULL DEFAULT true,
    cree_le TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Insertion des 8 rôles officiels V1
INSERT INTO role (code, libelle, description, systeme) VALUES
('PCA', 'Président du Conseil d''Administration', 'Vision stratégique, lecture globale de l''activité', true),
('DG', 'Directeur Général', 'Pilotage général et supervision', true),
('DGA', 'Directeur Général Adjoint', 'Supervision opérationnelle, désigne le Chef des agents', true),
('DAF', 'Directeur Administratif et Financier', 'Contrôle des flux et données financières, jamais d''exécution', true),
('GESTIONNAIRE_COMPTE', 'Gestionnaire des comptes', 'Gestion des adhérents, immatriculations et déclarations CNPS', true),
('CHEF_AGENT_TERRAIN', 'Chef des agents de terrain', 'Agent de terrain avec responsabilités de supervision d''équipe', true),
('AGENT_TERRAIN', 'Agent de terrain', 'Collecte terrain, enrôlement et saisie des versements', true),
('SUPER_ADMIN', 'Super Administrateur', 'Administration technique transversale, sans accès métier courant', true);

-- 3. Table des permissions
CREATE TABLE permission (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    code VARCHAR(80) UNIQUE NOT NULL,
    module VARCHAR(40) NOT NULL,
    libelle VARCHAR(160) NOT NULL
);

-- 4. Table d'association rôle - permission
CREATE TABLE role_permission (
    role_id UUID NOT NULL REFERENCES role(id) ON DELETE CASCADE,
    permission_id UUID NOT NULL REFERENCES permission(id) ON DELETE CASCADE,
    PRIMARY KEY (role_id, permission_id)
);

-- 5. Table d'association utilisateur - rôle
CREATE TABLE utilisateur_role (
    utilisateur_id UUID NOT NULL REFERENCES utilisateur(id) ON DELETE CASCADE,
    role_id UUID NOT NULL REFERENCES role(id) ON DELETE CASCADE,
    attribue_le TIMESTAMPTZ NOT NULL DEFAULT now(),
    attribue_par VARCHAR(80),
    PRIMARY KEY (utilisateur_id, role_id)
);

-- 6. Table des paramètres dynamiques (héberge toutes les règles [V])
CREATE TABLE parametre (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    cle VARCHAR(80) UNIQUE NOT NULL,
    valeur TEXT NOT NULL,
    type_valeur VARCHAR(20) NOT NULL, -- ENTIER, DECIMAL, BOOLEEN, TEXTE, JSON
    libelle VARCHAR(200) NOT NULL,
    modifiable_par_role VARCHAR(50) NOT NULL DEFAULT 'SUPER_ADMIN',
    statut_validation VARCHAR(10) NOT NULL DEFAULT 'C', -- C (Confirmé), A (À analyser), V (À valider)
    cree_le TIMESTAMPTZ NOT NULL DEFAULT now(),
    modifie_le TIMESTAMPTZ,
    modifie_par VARCHAR(80)
);

INSERT INTO parametre (cle, valeur, type_valeur, libelle, statut_validation) VALUES
('MONTANT_INSCRIPTION', '1000', 'DECIMAL', 'Frais d''inscription coopérative unique en FCFA', 'C'),
('SEUIL_CNPS_PACK_700', '10500', 'DECIMAL', 'Seuil d''éligibilité mensuelle CNPS Pack 700 (FCFA)', 'C'),
('SEUIL_CNPS_PACK_1000', '15000', 'DECIMAL', 'Seuil d''éligibilité mensuelle CNPS Pack 1000 (FCFA)', 'C'),
('DELAI_RETARD_JOURS', '30', 'ENTIER', 'Nombre de jours d''impayé qualifiant le statut EN_RETARD', 'V'),
('REGLE_QUINZE_DU_MOIS', 'true', 'BOOLEEN', 'Application de la règle de bascule au 15 du mois pour imputation', 'V'),
('TRAITEMENT_SURPAIEMENT', 'REPORT_MOIS_SUIVANT', 'TEXTE', 'Comportement appliqué en cas de versement excédentaire', 'V'),
('REPARTITION_VERSEMENT', '{"regle":"PAR_DEFAUT_COOPERATIVE","note":"Ventilation en attente d''arbitrage DAF"}', 'JSON', 'Grille de ventilation CNPS / Coopérative / Épargne', 'V'),
('TAUX_CNPS', '0.084', 'DECIMAL', 'Taux de cotisation CNPS de référence', 'C');

-- 7. Table du journal d'audit immuable (Append-only)
CREATE TABLE journal_audit (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    horodatage TIMESTAMPTZ NOT NULL DEFAULT now(),
    utilisateur_id UUID REFERENCES utilisateur(id) ON DELETE SET NULL,
    utilisateur_identifiant VARCHAR(80),
    type_operation VARCHAR(60) NOT NULL,
    entite VARCHAR(60) NOT NULL,
    entite_id UUID,
    valeurs_avant JSONB,
    valeurs_apres JSONB,
    motif TEXT,
    adresse_ip VARCHAR(45),
    user_agent VARCHAR(255),
    resultat VARCHAR(20) NOT NULL -- SUCCES, REFUS, ERREUR
);

CREATE INDEX idx_audit_entite_id ON journal_audit(entite, entite_id);
CREATE INDEX idx_audit_user_horodatage ON journal_audit(utilisateur_id, horodatage);
CREATE INDEX idx_audit_horodatage_desc ON journal_audit(horodatage DESC);
