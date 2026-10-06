-- =================================================================================================
-- V23 — Règles réputées validées, formulaire adhérent allégé, centres de validation, finances au DAF
-- Spécification : docs/SPEC_BACKEND_V23_REGLES_ACCES.md (décision COSITI du 05/10/2026).
-- Additive : aucune donnée supprimée.
-- =================================================================================================

-- -------------------------------------------------------------------------------------------------
-- 1. Règles en attente -> réputées validées (règles documentaires conservées, simplement confirmées)
-- -------------------------------------------------------------------------------------------------
-- Géolocalisation retirée du dossier (§2) : elle ne compte plus dans la complétion.
UPDATE parametre
SET valeur = array_to_string(array_remove(string_to_array(valeur, ','), 'GEOLOCALISATION'), ','),
    modifie_le = now(), modifie_par = 'migration V23'
WHERE cle = 'CHAMPS_COMPLETION_ADHERENT';

-- Trace de la décision (journal_audit est append-only : seule l'insertion est permise).
INSERT INTO journal_audit (type_operation, entite, entite_id, valeurs_avant, valeurs_apres, motif, resultat,
                           utilisateur_identifiant)
SELECT 'REGLE_VALIDATION', 'parametre', p.id, jsonb_build_object('statutValidation', p.statut_validation),
       jsonb_build_object('statutValidation', 'C'), 'Décision COSITI 05/10/2026 (migration V23)', 'SUCCES',
       'migration V23'
FROM parametre p WHERE p.statut_validation IN ('V', 'A');

INSERT INTO journal_audit (type_operation, entite, entite_id, valeurs_avant, valeurs_apres, motif, resultat,
                           utilisateur_identifiant)
SELECT 'REGLE_VALIDATION', 'exigence_documentaire', e.id, jsonb_build_object('statutValidation', e.statut_validation),
       jsonb_build_object('statutValidation', 'C'), 'Décision COSITI 05/10/2026 (migration V23)', 'SUCCES',
       'migration V23'
FROM exigence_documentaire e WHERE e.statut_validation <> 'C';

UPDATE parametre
SET statut_validation = 'C', modifie_le = now(), modifie_par = 'migration V23'
WHERE statut_validation IN ('V', 'A');

-- Effet connu (V21 §17) : une pièce OBLIGATOIRE confirmée devient bloquante pour l'activation (CNI et ses
-- informations, formulaire d'adhésion). Les niveaux ne sont pas modifiés : aucune consigne ne le demande.
UPDATE exigence_documentaire
SET statut_validation = 'C', modifie_le = now(), modifie_par = 'migration V23', version = version + 1
WHERE statut_validation <> 'C';

-- -------------------------------------------------------------------------------------------------
-- 3. Création d'un adhérent sans zone ni localisation
-- -------------------------------------------------------------------------------------------------
ALTER TABLE adherent ALTER COLUMN zone_id DROP NOT NULL;
ALTER TABLE adherent ALTER COLUMN localisation DROP NOT NULL;

-- -------------------------------------------------------------------------------------------------
-- 4. Centres de validation
-- -------------------------------------------------------------------------------------------------
-- Le Gestionnaire propose, il ne décide plus.
DELETE FROM role_permission
WHERE role_id = (SELECT id FROM role WHERE code = 'GESTIONNAIRE_COMPTE')
  AND permission_id = (SELECT id FROM permission WHERE code = 'ADHERENT:VALIDER');

-- Le DG valide tout ce que valide la DGA. ORGANISATION:GERER / DESIGNER_CHEF : « si la COSITI le confirme »,
-- non accordées.
INSERT INTO role_permission (role_id, permission_id)
SELECT r.id, p.id FROM role r, permission p
WHERE r.code = 'DG'
  AND p.code IN ('ADHERENT:VALIDER', 'CONTROLE_DGA:LIRE', 'CONTROLE_DGA:EFFECTUER', 'FRAIS_ADHESION:SIGNALER',
                 'DOCUMENT:LIRE')
ON CONFLICT DO NOTHING;

-- Le PCA ne décide d'aucune validation (il garde REGLE:VALIDER pour la matrice documentaire).
DELETE FROM role_permission
WHERE role_id = (SELECT id FROM role WHERE code = 'PCA')
  AND permission_id IN (SELECT id FROM permission
                        WHERE (code LIKE '%:VALIDER' AND code <> 'REGLE:VALIDER') OR code = 'CONTROLE_DGA:EFFECTUER');

-- Le DAF décide de toutes les validations financières (déjà accordées depuis V8/V18/V20 ; réaffirmées).
INSERT INTO role_permission (role_id, permission_id)
SELECT r.id, p.id FROM role r, permission p
WHERE r.code = 'DAF' AND p.code IN ('PAIEMENT:VALIDER', 'FRAIS_ADHESION:VALIDER', 'BILAN_CAISSE:VALIDER')
ON CONFLICT DO NOTHING;

-- -------------------------------------------------------------------------------------------------
-- 6. Rubrique Finances exclusive au DAF
-- -------------------------------------------------------------------------------------------------
INSERT INTO permission (code, module, libelle) VALUES
    ('FINANCES:CONSULTER', 'COTISATION',
     'Consulter les journaux financiers : cotisations, statistiques, bilans de caisse, frais d''adhésion')
ON CONFLICT (code) DO NOTHING;

INSERT INTO role_permission (role_id, permission_id)
SELECT r.id, p.id FROM role r, permission p WHERE r.code = 'DAF' AND p.code = 'FINANCES:CONSULTER'
ON CONFLICT DO NOTHING;
