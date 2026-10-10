-- V26 — Avantages et couvertures des adhérents.
--
-- Un avantage = un droit ou une couverture (prestation CNPS ou avantage propre à la COSITI) soumis à des critères.
-- Les critères sont des données, pas du code : le DAF peut les modifier sans redéploiement. Le catalogue de départ
-- reprend la « Liste des pièces constitutives des dossiers » de la CNPS ; les seuils (âge, ancienneté) sont à
-- confirmer par la COSITI et portent donc statut_validation = 'V' (AGENTS.md règle n°1).

CREATE TABLE avantage (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    code VARCHAR(60) NOT NULL UNIQUE,
    libelle VARCHAR(160) NOT NULL,
    branche VARCHAR(30) NOT NULL
        CHECK (branche IN ('PRESTATIONS_FAMILIALES', 'PENSIONS', 'RISQUES_PROFESSIONNELS', 'COSITI')),
    description TEXT,
    actif BOOLEAN NOT NULL DEFAULT true,
    statut_validation VARCHAR(1) NOT NULL DEFAULT 'V' CHECK (statut_validation IN ('C', 'A', 'V')),
    ordre INTEGER NOT NULL DEFAULT 0,
    cree_le TIMESTAMPTZ NOT NULL DEFAULT now(),
    cree_par VARCHAR(80),
    modifie_le TIMESTAMPTZ,
    modifie_par VARCHAR(80)
);

CREATE TABLE critere_avantage (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    avantage_id UUID NOT NULL REFERENCES avantage(id) ON DELETE CASCADE,
    type_critere VARCHAR(40) NOT NULL CHECK (type_critere IN (
        'IMMATRICULE', 'PREIMMATRICULE', 'COTISATION_MINIMUM', 'STATUT_ADHERENT', 'ANCIENNETE_MOIS_MIN',
        'AGE_MIN', 'PACK', 'DROITS_COUVERTS', 'AYANT_DROIT', 'ENFANT_AGE_MAX', 'ARCHIVAGE_COMPLET')),
    valeur VARCHAR(120),
    ordre INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE piece_avantage (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    avantage_id UUID NOT NULL REFERENCES avantage(id) ON DELETE CASCADE,
    categorie VARCHAR(20) NOT NULL CHECK (categorie IN ('CONSTITUTION', 'MAINTIEN')),
    libelle TEXT NOT NULL,
    ordre INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE adherent_avantage (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    adherent_id UUID NOT NULL REFERENCES adherent(id) ON DELETE CASCADE,
    avantage_id UUID NOT NULL REFERENCES avantage(id) ON DELETE CASCADE,
    statut VARCHAR(20) NOT NULL CHECK (statut IN ('ACQUIS', 'EN_COURS', 'NON_ELIGIBLE', 'SUSPENDU')),
    criteres_manquants TEXT,
    date_debut DATE,
    date_fin DATE,
    evalue_le TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE (adherent_id, avantage_id)
);

CREATE TABLE historique_adherent_avantage (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    adherent_id UUID NOT NULL REFERENCES adherent(id) ON DELETE CASCADE,
    avantage_id UUID NOT NULL REFERENCES avantage(id) ON DELETE CASCADE,
    statut_avant VARCHAR(20),
    statut_apres VARCHAR(20) NOT NULL,
    motif TEXT,
    horodatage TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_critere_avantage ON critere_avantage(avantage_id, ordre);
CREATE INDEX idx_adherent_avantage_statut ON adherent_avantage(avantage_id, statut);
CREATE INDEX idx_historique_adherent_avantage ON historique_adherent_avantage(adherent_id, horodatage DESC);

-- ------------------------------------------------------------------ Catalogue de départ
INSERT INTO avantage (code, libelle, branche, description, ordre) VALUES
    ('PF_PRENATALES_MATERNITE', 'Allocations prénatales, de maternité et frais médicaux de grossesse',
     'PRESTATIONS_FAMILIALES', 'Prestations liées à la grossesse et à l''accouchement (branche des prestations familiales).', 10),
    ('PF_ALLOCATIONS_FAMILIALES', 'Allocations familiales', 'PRESTATIONS_FAMILIALES',
     'Allocations pour les enfants à charge de 0 à 21 ans révolus.', 20),
    ('PENSION_VIEILLESSE', 'Pension de vieillesse', 'PENSIONS',
     'Pension de vieillesse ou allocation de vieillesse (branche pensions de vieillesse, d''invalidité et de décès).', 30),
    ('RISQUES_PROFESSIONNELS', 'Accidents du travail et maladies professionnelles', 'RISQUES_PROFESSIONNELS',
     'Indemnités journalières, frais médicaux, rente à l''assuré ou aux survivants.', 40)
ON CONFLICT (code) DO NOTHING;

INSERT INTO critere_avantage (avantage_id, type_critere, valeur, ordre)
SELECT a.id, c.type_critere, c.valeur, c.ordre FROM avantage a
JOIN (VALUES
    ('PF_PRENATALES_MATERNITE', 'IMMATRICULE', NULL, 1),
    ('PF_PRENATALES_MATERNITE', 'DROITS_COUVERTS', NULL, 2),
    ('PF_ALLOCATIONS_FAMILIALES', 'IMMATRICULE', NULL, 1),
    ('PF_ALLOCATIONS_FAMILIALES', 'DROITS_COUVERTS', NULL, 2),
    ('PF_ALLOCATIONS_FAMILIALES', 'ENFANT_AGE_MAX', '21', 3),
    ('PENSION_VIEILLESSE', 'IMMATRICULE', NULL, 1),
    ('PENSION_VIEILLESSE', 'AGE_MIN', '60', 2),
    ('RISQUES_PROFESSIONNELS', 'IMMATRICULE', NULL, 1),
    ('RISQUES_PROFESSIONNELS', 'DROITS_COUVERTS', NULL, 2)
) AS c(code, type_critere, valeur, ordre) ON c.code = a.code
WHERE NOT EXISTS (SELECT 1 FROM critere_avantage x WHERE x.avantage_id = a.id);

-- Pièces : « Liste des pièces constitutives des dossiers » et « Liste des pièces de maintien des droits » (CNPS).
INSERT INTO piece_avantage (avantage_id, categorie, libelle, ordre)
SELECT a.id, p.categorie, p.libelle, p.ordre FROM avantage a
JOIN (VALUES
    ('PF_PRENATALES_MATERNITE', 'CONSTITUTION', 'Demande sur imprimé CNPS signée du travailleur ou de sa conjointe', 1),
    ('PF_PRENATALES_MATERNITE', 'CONSTITUTION', 'Certificat de grossesse du 1er examen (entre le 3e et le 4e mois)', 2),
    ('PF_PRENATALES_MATERNITE', 'CONSTITUTION', 'Certificat de grossesse du second examen (entre le 7e et le 8e mois)', 3),
    ('PF_PRENATALES_MATERNITE', 'CONSTITUTION', 'Certificat d''accouchement établi à la naissance (allocation de maternité)', 4),
    ('PF_PRENATALES_MATERNITE', 'CONSTITUTION', 'Pour les frais médicaux : feuillets de remboursement cosignés par le médecin et le travailleur ou sa conjointe', 5),
    ('PF_ALLOCATIONS_FAMILIALES', 'CONSTITUTION', 'Demande sur imprimé CNPS signée du travailleur', 1),
    ('PF_ALLOCATIONS_FAMILIALES', 'CONSTITUTION', 'Attestation sur l''honneur de non perception d''allocations familiales d''un autre régime public, cosignée par les parents', 2),
    ('PF_ALLOCATIONS_FAMILIALES', 'CONSTITUTION', 'Copies certifiées conformes des actes de naissance des enfants (légitimes, reconnus, adoptés ou légitimés selon le cas)', 3),
    ('PF_ALLOCATIONS_FAMILIALES', 'CONSTITUTION', 'Certificat de vie ou de scolarité (0 à 5 ans) ; certificat de scolarité (6 à 21 ans) ; attestation d''apprentissage (14 à 18 ans) ; certificat médical pour un enfant infirme', 4),
    ('PF_ALLOCATIONS_FAMILIALES', 'MAINTIEN', 'Moins de 6 ans : certificat de vie, authentification biométrique ou certificat de scolarité', 1),
    ('PF_ALLOCATIONS_FAMILIALES', 'MAINTIEN', '6 à 21 ans scolarisé : certificat de scolarité ou authentification biométrique', 2),
    ('PF_ALLOCATIONS_FAMILIALES', 'MAINTIEN', 'Apprentissage 14 à 18 ans : certificat d''apprentissage d''un centre agréé', 3),
    ('PF_ALLOCATIONS_FAMILIALES', 'MAINTIEN', 'Enfant infirme ou atteint d''une maladie incurable : certificat médical', 4),
    ('PENSION_VIEILLESSE', 'CONSTITUTION', 'Demande sur imprimé CNPS signée du requérant', 1),
    ('PENSION_VIEILLESSE', 'CONSTITUTION', 'État de salaire ou 10 bulletins de paie des 5 dernières années (travailleur ayant cessé son activité au 31/12/2012 au plus tard)', 2),
    ('PENSION_VIEILLESSE', 'CONSTITUTION', 'Photocopie certifiée conforme de la carte nationale d''identité ou certificat de résidence / carte de séjour', 3),
    ('PENSION_VIEILLESSE', 'CONSTITUTION', 'Attestation sur l''honneur de non fonction signée du requérant', 4),
    ('PENSION_VIEILLESSE', 'MAINTIEN', 'Attestation sur l''honneur de non fonction (imprimé CNPS)', 1),
    ('PENSION_VIEILLESSE', 'MAINTIEN', 'Certificat de vie ou authentification biométrique', 2),
    ('RISQUES_PROFESSIONNELS', 'CONSTITUTION', 'Déclaration d''accident du travail ou de maladie professionnelle signée (employeur : 3 jours, victime : 3 ans)', 1),
    ('RISQUES_PROFESSIONNELS', 'CONSTITUTION', 'Certificat médical initial / final établi par le médecin traitant', 2),
    ('RISQUES_PROFESSIONNELS', 'CONSTITUTION', 'Procès-verbal d''enquête de police ou de gendarmerie (accident de trajet ou mortel)', 3),
    ('RISQUES_PROFESSIONNELS', 'CONSTITUTION', 'Frais médicaux : demande de prise en charge, ordonnances, factures, feuilles d''accident', 4),
    ('RISQUES_PROFESSIONNELS', 'CONSTITUTION', 'Rente : certificat médical final et copie certifiée conforme de la carte nationale d''identité', 5),
    ('RISQUES_PROFESSIONNELS', 'MAINTIEN', 'Rente à l''assuré : certificat de vie ou authentification biométrique', 1),
    ('RISQUES_PROFESSIONNELS', 'MAINTIEN', 'Conjoint survivant : certificat de vie et attestation sur l''honneur de non remariage', 2),
    ('RISQUES_PROFESSIONNELS', 'MAINTIEN', 'Enfant survivant : attestation sur l''honneur de garde d''enfant', 3)
) AS p(code, categorie, libelle, ordre) ON p.code = a.code
WHERE NOT EXISTS (SELECT 1 FROM piece_avantage x WHERE x.avantage_id = a.id);

-- ------------------------------------------------------------------ Permissions
INSERT INTO permission (code, module, libelle) VALUES
    ('AVANTAGE:LIRE', 'AVANTAGE', 'Consulter le catalogue des avantages et ce dont chaque adhérent bénéficie'),
    ('AVANTAGE:RECALCULER', 'AVANTAGE', 'Relancer l''évaluation des avantages des adhérents'),
    ('AVANTAGE:GERER', 'AVANTAGE', 'Créer ou modifier un avantage et ses critères')
ON CONFLICT (code) DO NOTHING;

INSERT INTO role_permission (role_id, permission_id)
SELECT r.id, p.id FROM role r, permission p
WHERE r.code IN ('PCA', 'DG', 'DGA', 'DAF', 'GESTIONNAIRE_COMPTE', 'SUPER_ADMIN') AND p.code = 'AVANTAGE:LIRE'
ON CONFLICT DO NOTHING;

INSERT INTO role_permission (role_id, permission_id)
SELECT r.id, p.id FROM role r, permission p
WHERE r.code IN ('DAF', 'GESTIONNAIRE_COMPTE', 'SUPER_ADMIN') AND p.code = 'AVANTAGE:RECALCULER'
ON CONFLICT DO NOTHING;

INSERT INTO role_permission (role_id, permission_id)
SELECT r.id, p.id FROM role r, permission p
WHERE r.code IN ('DAF', 'SUPER_ADMIN') AND p.code = 'AVANTAGE:GERER'
ON CONFLICT DO NOTHING;
