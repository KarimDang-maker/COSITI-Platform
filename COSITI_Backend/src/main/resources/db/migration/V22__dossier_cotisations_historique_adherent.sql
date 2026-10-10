-- =================================================================================================
-- V22 — Dossier adhérent, cotisations, historiques (prompt « nouvelles spécificités » + règles des 3 modules)
--
--   1. Coordonnées du dossier : WhatsApp et e-mail (règles module 1 §5).
--   2. Répartition Sécurité sociale / Épargne enregistrée AVEC la cotisation (module 2 §2, §5) ; le pack, qui
--      n'est plus choisi à la création de l'adhérent (module 1 §7), peut être choisi à la cotisation.
--   3. Idempotence renforcée : empreinte de la requête pour détecter la réutilisation d'une clé avec une autre
--      requête (409 au lieu de renvoyer silencieusement une autre cotisation).
--   4. Paramètres : minimum Épargne (300 FCFA, règle écrite) et caractère optionnel de l'Épargne par cotisation
--      (« lorsque la cotisation alimente ce compte » : condition non précisée -> [V]).
--
-- Aucune donnée supprimée. Les adhésions (pack) existantes sont conservées telles quelles.
-- =================================================================================================

-- -------------------------------------------------------------------------------------------------
-- 1. Coordonnées
-- -------------------------------------------------------------------------------------------------
ALTER TABLE adherent
    ADD COLUMN whatsapp VARCHAR(30),
    ADD COLUMN email    VARCHAR(254);

ALTER TABLE adherent
    ADD CONSTRAINT chk_adherent_email_format
        CHECK (email IS NULL OR email ~* '^[^@[:space:]]+@[^@[:space:]]+\.[^@[:space:]]+$');

-- -------------------------------------------------------------------------------------------------
-- 2. Répartition et pack portés par la cotisation
-- -------------------------------------------------------------------------------------------------
ALTER TABLE paiement
    ADD COLUMN montant_securite_sociale NUMERIC(14, 2),
    ADD COLUMN montant_epargne          NUMERIC(14, 2),
    -- SAISIE (répartie par le Gestionnaire), PROPOSITION_SERVEUR (règle par défaut appliquée à la saisie faute de
    -- répartition fournie), REPRISE_AFFECTATIONS (reprise des affectations existantes par cette migration).
    ADD COLUMN origine_repartition      VARCHAR(30),
    ADD COLUMN pack_id                  UUID REFERENCES pack (id) ON DELETE RESTRICT,
    ADD COLUMN empreinte_requete        VARCHAR(64);

-- Invariant obligatoire : total = Sécurité sociale + Épargne. Les minimums (700 / 300) restent dans `parametre`,
-- jamais figés en base (AGENTS.md règle absolue n°1) ; seule l'égalité, non négociable, est garantie ici.
ALTER TABLE paiement
    ADD CONSTRAINT chk_paiement_repartition_coherente CHECK (
        (montant_securite_sociale IS NULL AND montant_epargne IS NULL AND origine_repartition IS NULL)
        OR (montant_securite_sociale IS NOT NULL AND montant_epargne IS NOT NULL AND origine_repartition IS NOT NULL
            AND montant_securite_sociale >= 0 AND montant_epargne >= 0
            AND montant_securite_sociale + montant_epargne = montant)
    );

ALTER TABLE paiement
    ADD CONSTRAINT chk_paiement_origine_repartition
        CHECK (origine_repartition IS NULL
            OR origine_repartition IN ('SAISIE', 'PROPOSITION_SERVEUR', 'REPRISE_AFFECTATIONS'));

-- Reprise des données existantes : seules les cotisations dont les affectations sont exactement Sécurité sociale
-- (CNPS) + Épargne et somment au montant reçoivent une répartition — rien n'est déduit ni inventé pour les autres
-- (anciennes affectations « Coopérative », cotisations encore en attente), qui gardent une répartition nulle.
UPDATE paiement p
SET montant_securite_sociale = r.ss,
    montant_epargne          = r.ep,
    origine_repartition      = 'REPRISE_AFFECTATIONS'
FROM (SELECT ap.paiement_id,
             COALESCE(SUM(ap.montant) FILTER (WHERE c.code = 'CNPS'), 0)    AS ss,
             COALESCE(SUM(ap.montant) FILTER (WHERE c.code = 'EPARGNE'), 0) AS ep,
             BOOL_AND(c.code IN ('CNPS', 'EPARGNE'))                        AS uniquement_ss_ep
      FROM affectation_paiement ap
               JOIN composante_affectation c ON c.id = ap.composante_id
      GROUP BY ap.paiement_id) r
WHERE r.paiement_id = p.id
  AND r.uniquement_ss_ep
  AND r.ss + r.ep = p.montant;

CREATE INDEX idx_paiement_adherent_statut ON paiement (adherent_id, statut);

-- -------------------------------------------------------------------------------------------------
-- 3. Paramètres
-- -------------------------------------------------------------------------------------------------
INSERT INTO parametre (cle, valeur, type_valeur, libelle, statut_validation) VALUES
    ('MONTANT_MINIMUM_EPARGNE', '300', 'DECIMAL',
     'Montant minimum affecté au compte Épargne lorsqu''une cotisation alimente ce compte (FCFA)', 'C'),
    -- « au moins 300 FCFA lorsque la cotisation doit alimenter ce compte selon les règles applicables » : les cas où
    -- une cotisation peut ne rien verser à l'Épargne ne sont pas précisés. true = Épargne à 0 acceptée (sinon >= 300) ;
    -- false = toute cotisation verse au moins le minimum à l'Épargne.
    ('EPARGNE_FACULTATIVE_PAR_COTISATION', 'true', 'BOOLEEN',
     'Une cotisation peut ne rien affecter à l''Épargne (sinon au moins MONTANT_MINIMUM_EPARGNE)', 'V'),
    -- « statut compatible avec une cotisation » : seul l'archivage est refusé aujourd'hui ; la liste des statuts
    -- (PREINSCRIT, ACTIF, EN_RETARD, INACTIF, REACTIVE, RADIE) qui interdisent une cotisation n'est pas définie.
    -- Vide = comportement actuel (aucun statut refusé), à compléter par la COSITI (séparateur virgule).
    ('COTISATION_STATUTS_ADHERENT_REFUSES', '', 'TEXTE',
     'Statuts d''adhérent pour lesquels une cotisation est refusée (liste séparée par des virgules)', 'V')
ON CONFLICT (cle) DO NOTHING;
