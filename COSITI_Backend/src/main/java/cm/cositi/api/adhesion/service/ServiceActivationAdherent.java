package cm.cositi.api.adhesion.service;

import cm.cositi.api.adhesion.dto.ActivationAdherentDto;
import cm.cositi.api.adhesion.dto.ControleDgaDto;
import cm.cositi.api.adhesion.dto.SoumissionDgaDto;
import cm.cositi.api.adhesion.dto.StatutActivationDto;
import cm.cositi.api.adhesion.dto.SyntheseWorkflowAdherentDto;
import cm.cositi.api.adhesion.dto.VerificationActivationDto;
import cm.cositi.api.securite.entite.Utilisateur;

import java.util.UUID;

/**
 * Création/activation par le Gestionnaire des comptes puis transmission au contrôle documentaire DGA (§2). Le compte
 * devient ACTIF à l'activation ; le contrôle DGA est postérieur et suivi dans un état distinct.
 */
public interface ServiceActivationAdherent {

    /** Conditions avant activation (§11), toutes calculées par le backend. */
    VerificationActivationDto verifier(UUID adherentId, Utilisateur demandeur);

    /** Activation idempotente : un adhérent déjà activé est renvoyé tel quel ({@code dejaActive = true}). */
    StatutActivationDto activer(UUID adherentId, ActivationAdherentDto dto, Utilisateur gestionnaire);

    StatutActivationDto statut(UUID adherentId, Utilisateur demandeur);

    /**
     * Transmission (ou retransmission après correction) au contrôle DGA. Idempotente : si un contrôle est déjà ouvert,
     * il est renvoyé sans en ouvrir un second.
     */
    ControleDgaDto soumettreDga(UUID adherentId, SoumissionDgaDto dto, Utilisateur gestionnaire);

    SyntheseWorkflowAdherentDto synthese(UUID adherentId, Utilisateur demandeur);
}
