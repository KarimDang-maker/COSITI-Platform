package cm.cositi.api.droits.service;

import cm.cositi.api.droits.dto.PeriodeDroitsDto;
import cm.cositi.api.droits.dto.SituationDroitsDto;
import cm.cositi.api.securite.entite.Utilisateur;

import java.time.LocalDate;
import java.util.List;
import java.util.UUID;

/**
 * Cœur métier du jalon J6 — module le plus critique du projet, couverture de tests la plus forte exigée
 * (docs/02_CLASSES_ET_METHODES.md §5).
 *
 * <p><b>Écart assumé par rapport au sketch du pack d'origine</b> : {@code situation}/{@code periodes} portent
 * ici un paramètre {@code Utilisateur demandeur} absent du sketch de {@code docs/02_CLASSES_ET_METHODES.md §5}
 * — {@code AGENTS.md} règle absolue n°4 et {@code docs/04_SECURITE.md §3} exigent que le périmètre de données
 * soit vérifié côté service pour toute lecture unitaire, ce qui suppose de connaître l'appelant.</p>
 */
public interface ServiceCalculDroits {

    /**
     * Impute une affectation de paiement déjà persistée sur les périodes de droits de l'adhérent concerné.
     * Appelée automatiquement à la fin de {@code ServicePaiementImpl.valider}, dans la même transaction.
     * Principes obligatoires : les périodes sont persistées (jamais recalculées à l'affichage) ; l'imputation
     * part de la fin de la dernière période couverte de l'adhérent, jamais de la date du paiement ;
     * {@code joursCouverts = montantImpute / pack.montantJournalier}, arrondi vers le bas ({@link java.math.RoundingMode#DOWN}) ;
     * le reliquat éventuel n'est jamais imputé de force (règle {@code TRAITEMENT_SURPAIEMENT} {@code [V]}) ;
     * aucun chevauchement de périodes pour un même adhérent, contrôlé avant insertion. Renvoie une liste vide
     * (avec avertissement journalisé) si le montant imputé est inférieur au prix d'une seule journée du pack.
     */
    List<PeriodeDroitsDto> imputer(UUID affectationPaiementId);

    /** Situation de droits à une date de référence — jamais recalculée à partir des paiements bruts. */
    SituationDroitsDto situation(UUID adherentId, LocalDate dateReference, Utilisateur demandeur);

    /** Historique complet des périodes de droits de l'adhérent (y compris {@code ANNULEE}, jamais supprimées). */
    List<PeriodeDroitsDto> periodes(UUID adherentId, Utilisateur demandeur);

    /**
     * Recalcul complet : annule logiquement toutes les périodes non annulées de l'adhérent puis les
     * reconstruit en rejouant, dans l'ordre chronologique, les affectations des paiements validés/rapprochés.
     * Réservé {@code DAF}/{@code SUPER_ADMIN}, motif obligatoire, audité ({@code DROITS_RECALCUL}).
     */
    void recalculer(UUID adherentId, String motif, Utilisateur auteur);
}
