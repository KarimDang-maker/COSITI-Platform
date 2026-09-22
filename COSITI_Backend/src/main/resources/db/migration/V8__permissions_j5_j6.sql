-- V8__permissions_j5_j6.sql
-- Catalogue de permissions complémentaire pour les jalons J5 (Contrôle DAF) et J6 (Droits et régularité).
-- Les migrations V1 à V7 ne sont jamais modifiées (AGENTS.md, contraintes de session) : les codes manquants
-- identifiés dans V5__catalogue_permissions.sql sont ajoutés ici, sans toucher à ce fichier existant.

INSERT INTO permission (code, module, libelle) VALUES
    -- Contrôle DAF (J5)
    ('PAIEMENT:CONFIRMER_CHEF', 'PAIEMENT', 'Confirmer hiérarchiquement une collecte (Chef des agents de terrain, UC-CHEF-10)'),
    ('PAIEMENT:SIGNALER_INCOHERENCE', 'PAIEMENT', 'Signaler une incohérence sur un paiement (réservé DAF)'),

    -- Droits et régularité (J6)
    ('DROITS:LIRE', 'DROITS', 'Consulter la situation de droits et l''historique des périodes d''un adhérent'),
    ('DROITS:RECALCULER', 'DROITS', 'Recalculer intégralement les périodes de droits d''un adhérent (réservé DAF/SUPER_ADMIN)')
ON CONFLICT (code) DO NOTHING;

-- Confirmation hiérarchique : réservée au Chef des agents de terrain (Roles des acteurs.md §8, UC-CHEF-10).
INSERT INTO role_permission (role_id, permission_id)
SELECT r.id, p.id FROM role r, permission p
WHERE r.code = 'CHEF_AGENT_TERRAIN' AND p.code = 'PAIEMENT:CONFIRMER_CHEF'
ON CONFLICT DO NOTHING;

-- Signalement d'incohérence : réservé au DAF (Roles des acteurs.md §6, UC-DAF-05).
INSERT INTO role_permission (role_id, permission_id)
SELECT r.id, p.id FROM role r, permission p
WHERE r.code = 'DAF' AND p.code = 'PAIEMENT:SIGNALER_INCOHERENCE'
ON CONFLICT DO NOTHING;

-- DROITS:LIRE suit exactement la distribution de ADHERENT:LIRE (tous les rôles métier, jamais SUPER_ADMIN —
-- docs/01_SCHEMA_BDD.md, Roles des acteurs.md §10 : le Super Administrateur n'a pas d'accès métier courant).
INSERT INTO role_permission (role_id, permission_id)
SELECT r.id, p.id FROM role r, permission p
WHERE r.code IN ('PCA', 'DG', 'DGA', 'DAF', 'GESTIONNAIRE_COMPTE', 'CHEF_AGENT_TERRAIN', 'AGENT_TERRAIN')
  AND p.code = 'DROITS:LIRE'
ON CONFLICT DO NOTHING;

-- DROITS:RECALCULER : réservé DAF et SUPER_ADMIN (docs/02_CLASSES_ET_METHODES.md §5).
INSERT INTO role_permission (role_id, permission_id)
SELECT r.id, p.id FROM role r, permission p
WHERE r.code IN ('DAF', 'SUPER_ADMIN') AND p.code = 'DROITS:RECALCULER'
ON CONFLICT DO NOTHING;
