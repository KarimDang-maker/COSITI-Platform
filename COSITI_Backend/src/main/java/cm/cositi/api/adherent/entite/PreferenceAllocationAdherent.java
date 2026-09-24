package cm.cositi.api.adherent.entite;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;

import java.math.BigDecimal;
import java.time.Instant;
import java.time.LocalDate;
import java.util.UUID;

/**
 * Préférence d'allocation Sécurité Sociale/Épargne enregistrée au dossier adhérent (correctif COSITI V1 §8) :
 * pack choisi, montant de référence, allocation Sécurité Sociale, allocation Épargne, date de la préférence.
 * Historisée comme {@link Adhesion} — jamais écrasée : une nouvelle préférence désactive l'ancienne
 * ({@code actif = false}), jamais de suppression physique (AGENTS.md règle absolue n°3).
 */
@Entity
@Table(name = "preference_allocation_adherent")
public class PreferenceAllocationAdherent {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    @Column(name = "id", updatable = false, nullable = false)
    private UUID id;

    @Column(name = "adherent_id", nullable = false, updatable = false)
    private UUID adherentId;

    @Column(name = "pack_id", nullable = false, updatable = false)
    private UUID packId;

    @Column(name = "montant_reference", nullable = false, precision = 14, scale = 2, updatable = false)
    private BigDecimal montantReference;

    @Column(name = "allocation_securite_sociale", nullable = false, precision = 14, scale = 2, updatable = false)
    private BigDecimal allocationSecuriteSociale;

    @Column(name = "allocation_epargne", nullable = false, precision = 14, scale = 2, updatable = false)
    private BigDecimal allocationEpargne;

    @Column(name = "date_preference", nullable = false, updatable = false)
    private LocalDate datePreference;

    @Column(name = "actif", nullable = false)
    private boolean actif = true;

    @Column(name = "auteur_id", updatable = false)
    private UUID auteurId;

    @Column(name = "cree_le", updatable = false)
    private Instant creeLe;

    protected PreferenceAllocationAdherent() {
    }

    public PreferenceAllocationAdherent(UUID adherentId, UUID packId, BigDecimal montantReference,
                                         BigDecimal allocationSecuriteSociale, BigDecimal allocationEpargne,
                                         LocalDate datePreference, UUID auteurId) {
        this.adherentId = adherentId;
        this.packId = packId;
        this.montantReference = montantReference;
        this.allocationSecuriteSociale = allocationSecuriteSociale;
        this.allocationEpargne = allocationEpargne;
        this.datePreference = datePreference;
        this.auteurId = auteurId;
        this.creeLe = Instant.now();
    }

    public UUID getId() {
        return id;
    }

    public UUID getAdherentId() {
        return adherentId;
    }

    public UUID getPackId() {
        return packId;
    }

    public BigDecimal getMontantReference() {
        return montantReference;
    }

    public BigDecimal getAllocationSecuriteSociale() {
        return allocationSecuriteSociale;
    }

    public BigDecimal getAllocationEpargne() {
        return allocationEpargne;
    }

    public LocalDate getDatePreference() {
        return datePreference;
    }

    public boolean isActif() {
        return actif;
    }

    public void desactiver() {
        this.actif = false;
    }

    public UUID getAuteurId() {
        return auteurId;
    }

    public Instant getCreeLe() {
        return creeLe;
    }
}
