# COSITI V1 — Règles fonctionnelles des 3 premiers modules

Ce document regroupe uniquement les règles des trois premiers modules : **Dossier de l’adhérent**, **Cotisations** et **Historique de l’adhérent**.

# MODULE 1 — DOSSIER DE L’ADHÉRENT

## 1. Présentation du dossier

Le dossier d’un adhérent doit présenter dans une vue structurée toutes les informations nécessaires à son suivi. Il doit permettre au Gestionnaire de retrouver rapidement les données principales et de comprendre l’état actuel du dossier.

## 2. Informations personnelles et identité

Le dossier doit afficher les informations personnelles et d’identité de l’adhérent. La section « Identité » regroupe les données enregistrées permettant d’identifier officiellement l’adhérent.

## 3. Informations professionnelles

Le dossier doit comporter une section dédiée aux informations professionnelles. Elle permet de consulter les informations relatives à l’activité de l’adhérent et les autres données professionnelles enregistrées.

## 4. État du dossier

L’état actuel du dossier doit être clairement affiché. Le statut présenté doit toujours correspondre à l’état enregistré par le backend.

## 5. Coordonnées

Le dossier doit afficher les coordonnées disponibles, notamment le téléphone, WhatsApp, l’adresse e-mail, le quartier et la ville. Les autres coordonnées prévues dans le dossier doivent également pouvoir être consultées.

## 6. Comptes Sécurité Sociale et Épargne

Le dossier doit permettre de consulter séparément le compte de Sécurité Sociale et le compte Épargne. Les montants et leur évolution doivent être calculés à partir des opérations financières enregistrées.

## 7. Suppression du choix du pack à la création

Lors de la création d’un nouvel adhérent, le Gestionnaire ne doit plus sélectionner de pack. Le choix du pack ou la répartition financière intervient uniquement lors de l’enregistrement d’une cotisation. Le formulaire de création doit donc supprimer le choix du pack.

# MODULE 2 — COTISATIONS

## 1. Enregistrement d’une cotisation

Le Gestionnaire doit pouvoir enregistrer une nouvelle cotisation pour un adhérent existant. Il sélectionne d’abord l’adhérent à partir de son matricule COSITI. Le système doit afficher les informations nécessaires pour confirmer qu’il s’agit du bon adhérent.

## 2. Répartition de la cotisation

Lors de l’enregistrement, le Gestionnaire répartit le montant entre le compte de Sécurité Sociale et le compte Épargne. Cette répartition doit être enregistrée avec la cotisation.

## 3. Minimum Sécurité Sociale

Le montant affecté à la Sécurité Sociale doit être d’au moins **700 FCFA**. Aucun plafond n’est défini dans les règles fournies ; le système ne doit donc pas en inventer un.

## 4. Minimum Épargne

Le montant affecté à l’Épargne doit être d’au moins **300 FCFA** lorsque la cotisation doit alimenter ce compte selon les règles applicables. Le plafond du compte Épargne reste à définir.

## 5. Données conservées

Pour chaque cotisation, le système doit conserver au minimum le montant total, le montant affecté à la Sécurité Sociale, le montant affecté à l’Épargne, l’adhérent, la référence, la date, le statut de contrôle et les informations de traçabilité nécessaires.

## 6. Contrôle et validation

Le système doit distinguer une cotisation enregistrée mais en attente de contrôle d’une cotisation validée. Une simple saisie par le Gestionnaire ne doit pas être considérée automatiquement comme une validation définitive.

## 7. Journalisation

Chaque cotisation doit être journalisée et apparaître dans l’historique financier. L’historique doit permettre de retrouver l’adhérent, le montant, la répartition, l’acteur, la date, l’heure et le statut de l’opération.

## 8. Impact sur les comptes

Les montants définitivement comptabilisés dans les comptes doivent respecter le workflow de validation. Le système ne doit pas confondre un montant saisi avec un montant définitivement validé.

# MODULE 3 — HISTORIQUE DE L’ADHÉRENT

## 1. Accès

Le dossier doit comporter un bouton « Historique » permettant de consulter les actions réalisées sur le compte de l’adhérent.

## 2. Filtrage par période

L’historique doit pouvoir être filtré par **jour, semaine, mois ou année** afin d’analyser l’évolution et les actions réalisées sur le dossier.

## 3. Deux historiques

Le bouton « Historique » doit contenir deux historiques distincts :

1. **Historique général** du compte ;
2. **Historique financier** du compte.

Cette séparation permet de distinguer les actions administratives et opérationnelles des opérations financières.

## 4. Historique général

L’historique général doit permettre de suivre les actions concernant notamment les informations personnelles, les informations professionnelles, les documents, la télédéclaration, l’immatriculation et les autres actions administratives ou opérationnelles du dossier.

## 5. Historique financier

L’historique financier doit retracer les opérations financières depuis les frais d’adhésion jusqu’aux cotisations régulières. Il doit notamment permettre de retrouver les cotisations enregistrées et les informations financières associées.

## 6. Traçabilité

Chaque événement doit être associé à l’acteur qui l’a réalisé ainsi qu’à sa date et son heure. Lorsqu’une opération implique une modification ou une décision, les informations nécessaires à sa compréhension doivent être conservées.

L’historique constitue une trace de référence du dossier et ne doit pas être modifiable directement par les utilisateurs.

# RÈGLES TRANSVERSALES AUX 3 MODULES

## Source de vérité

Le backend constitue la source de vérité pour le dossier, les cotisations et l’historique. Le frontend ne doit pas être une autorité de sécurité ou de calcul.

## Autorisations

Chaque fonctionnalité doit vérifier les permissions de l’utilisateur côté backend. Masquer un bouton dans le frontend ne suffit pas à protéger une fonctionnalité.

## Intégrité financière

Les calculs de cotisations, de répartition et de soldes doivent être effectués côté backend. Le système doit empêcher les incohérences entre le montant total et les montants affectés aux deux comptes.

## Protection contre les doublons

Une même cotisation ne doit pas pouvoir être enregistrée plusieurs fois à cause d’une double soumission. Les opérations financières doivent utiliser des références uniques et un mécanisme d’idempotence approprié.

## Présentation UI/UX

Les interfaces doivent permettre de distinguer immédiatement une donnée enregistrée, une opération en attente de contrôle, une opération validée, une information manquante et une action déjà réalisée.

## Règle de non-invention

Les règles non définies ici ne doivent pas être inventées pendant le développement. Le plafond de l’Épargne, le plafond éventuel de la Sécurité Sociale et les règles financières encore non précisées doivent être confirmés avant leur implémentation.
