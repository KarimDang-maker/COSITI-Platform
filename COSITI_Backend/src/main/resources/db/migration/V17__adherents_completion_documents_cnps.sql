-- V17__adherents_completion_documents_cnps.sql
-- Règles paramétrables ajoutées pour les fonctionnalités "Gestion des adhérents"
-- (docs/COSITI_GESTIONNAIRE_MODULES_BACKEND_122_FONCTIONNALITES.md §1).
-- AGENTS.md règle absolue n°1 : aucune règle [V] en constante Java — même principe que
-- PIECES_CNPS_OBLIGATOIRES (V9).
--
-- Numérotée V17 (et non V14) : V14 à V16 existent déjà, appliquées à la base par la branche
-- feature_corection1 (correction droits/hiérarchie, rapport V1, dossiers de prestation CNPS) mais absentes
-- du code source de cette branche. Fichiers réintégrés tels quels pour que Flyway retrouve leur somme de
-- contrôle sans rien ré-exécuter ni rien perdre côté données.

INSERT INTO parametre (cle, valeur, type_valeur, libelle, statut_validation) VALUES
    -- [V] Champs utilisés pour calculer le taux de complétion d'un dossier adhérent. Cette liste
    -- n'est confirmée par aucun document COSITI : proposition technique en attente de validation.
    ('CHAMPS_COMPLETION_ADHERENT',
     'DATE_NAISSANCE,SEXE,TELEPHONE_SECONDAIRE,NUMERO_CNI,NUMERO_CNPS,ASSOCIATION,QUARTIER,VILLE,GEOLOCALISATION,CONSENTEMENT',
     'TEXTE', 'Champs pris en compte pour le taux de complétion du dossier adhérent', 'V'),

    -- [V] Documents exigés pour un dossier adhérent hors CNPS (types de docs.entite.TypeDocument).
    ('DOCUMENTS_ADHERENT_OBLIGATOIRES', 'CNI,ACTE_NAISSANCE', 'TEXTE',
     'Types de documents exigés pour qu''un dossier adhérent soit complet (hors CNPS)', 'V'),

    -- [V] Ratio du seuil d'éligibilité CNPS du pack à partir duquel un adhérent est considéré
    -- « proche » du quota (ex. 0.8 = 80 % du seuil).
    ('CNPS_SEUIL_PROXIMITE_RATIO', '0.8', 'DECIMAL',
     'Ratio du seuil d''éligibilité CNPS à partir duquel un adhérent est signalé comme proche du quota', 'V')
ON CONFLICT (cle) DO NOTHING;
