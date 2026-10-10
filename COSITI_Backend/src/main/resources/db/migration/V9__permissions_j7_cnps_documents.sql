-- V9__permissions_j7_cnps_documents.sql
-- Jalon J7 — CNPS et gestion documentaire.
--
-- Les tables du domaine (document, dossier_cnps, piece_dossier_cnps, declaration_cnps,
-- historique_dossier_cnps) existent depuis V4__cnps_documents_relances.sql : cette migration n'ajoute
-- aucune table, seulement le catalogue de permissions correspondant et les règles paramétrables du jalon.
-- Les migrations V1 à V8 ne sont jamais modifiées (AGENTS.md).

INSERT INTO permission (code, module, libelle) VALUES
    -- CNPS (J7)
    ('CNPS:LIRE', 'CNPS', 'Consulter les dossiers CNPS, leurs pièces et leurs déclarations'),
    ('CNPS:GERER', 'CNPS', 'Ouvrir un dossier CNPS et y rattacher des pièces'),
    ('CNPS:CHANGER_STATUT', 'CNPS', 'Faire évoluer le statut d''un dossier CNPS (transitions contrôlées)'),
    ('CNPS:DECLARER', 'CNPS', 'Préparer une déclaration CNPS et la marquer transmise'),

    -- Documents (J7)
    ('DOCUMENT:LIRE', 'DOCUMENT', 'Consulter les métadonnées et télécharger un document (consultation journalisée)'),
    ('DOCUMENT:TELEVERSER', 'DOCUMENT', 'Téléverser un document justificatif'),
    ('DOCUMENT:VERIFIER', 'DOCUMENT', 'Vérifier, rejeter ou archiver un document')
ON CONFLICT (code) DO NOTHING;

-- Suivi CNPS (Roles des acteurs.md §11) : le Gestionnaire des comptes est le rôle opérationnel du domaine.
-- PCA, DG, DGA, DAF sont en consultation ; le Chef et l'Agent de terrain n'ont pas accès au domaine CNPS.
INSERT INTO role_permission (role_id, permission_id)
SELECT r.id, p.id FROM role r, permission p
WHERE r.code IN ('PCA', 'DG', 'DGA', 'DAF', 'GESTIONNAIRE_COMPTE')
  AND p.code = 'CNPS:LIRE'
ON CONFLICT DO NOTHING;

INSERT INTO role_permission (role_id, permission_id)
SELECT r.id, p.id FROM role r, permission p
WHERE r.code = 'GESTIONNAIRE_COMPTE'
  AND p.code IN ('CNPS:GERER', 'CNPS:CHANGER_STATUT', 'CNPS:DECLARER')
ON CONFLICT DO NOTHING;

-- Documents : l'Agent de terrain joint un justificatif à une collecte (UC-AG-06) et relit les siens ;
-- le périmètre de données (ServicePerimetreDonnees) limite ce qu'il voit réellement, la permission ne
-- suffit jamais seule (docs/04_SECURITE.md §3).
INSERT INTO role_permission (role_id, permission_id)
SELECT r.id, p.id FROM role r, permission p
WHERE r.code IN ('PCA', 'DG', 'DGA', 'DAF', 'GESTIONNAIRE_COMPTE', 'CHEF_AGENT_TERRAIN', 'AGENT_TERRAIN')
  AND p.code = 'DOCUMENT:LIRE'
ON CONFLICT DO NOTHING;

INSERT INTO role_permission (role_id, permission_id)
SELECT r.id, p.id FROM role r, permission p
WHERE r.code IN ('GESTIONNAIRE_COMPTE', 'AGENT_TERRAIN')
  AND p.code = 'DOCUMENT:TELEVERSER'
ON CONFLICT DO NOTHING;

INSERT INTO role_permission (role_id, permission_id)
SELECT r.id, p.id FROM role r, permission p
WHERE r.code = 'GESTIONNAIRE_COMPTE'
  AND p.code = 'DOCUMENT:VERIFIER'
ON CONFLICT DO NOTHING;

-- ------------------------------------------------------------------
-- Règles paramétrables du jalon (AGENTS.md règle absolue n°1 : aucune règle [V] en constante Java)
-- ------------------------------------------------------------------

INSERT INTO parametre (cle, valeur, type_valeur, libelle, statut_validation) VALUES
    -- [V] Assiette de la déclaration CNPS. `dossier_cnps.revenu_mensuel_declare` porte déjà la mention
    -- « [V - assiette de calcul en attente] » dans V4. Tant que la COSITI n'a pas arbitré, la préparation
    -- d'une déclaration s'appuie sur les périodes de droits réellement imputées sur le mois — donnée
    -- constatée, jamais une assiette reconstituée — et porte un avertissement explicite.
    ('ASSIETTE_CNPS', 'PERIODES_DROITS_DU_MOIS', 'TEXTE',
     'Mode de calcul du montant déclaré à la CNPS pour un mois donné', 'V'),

    -- [V] Composition du dossier CNPS. Les cinq types proviennent du commentaire de
    -- piece_dossier_cnps.type_piece (V4) ; leur caractère obligatoire relève de la CNPS, pas de la technique.
    ('PIECES_CNPS_OBLIGATOIRES', 'CNI_RECTO,CNI_VERSO,ACTE_NAISSANCE,PHOTO_IDENTITE,FORMULAIRE_SIGNE', 'TEXTE',
     'Types de pièces exigés pour qu''un dossier CNPS soit complet', 'V')
ON CONFLICT (cle) DO NOTHING;
