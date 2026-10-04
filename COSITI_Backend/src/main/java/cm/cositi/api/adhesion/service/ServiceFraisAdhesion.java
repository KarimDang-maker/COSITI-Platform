package cm.cositi.api.adhesion.service;

import cm.cositi.api.adhesion.dto.ConfigurationFraisAdhesionDto;
import cm.cositi.api.adhesion.dto.EnregistrerFraisAdhesionDto;
import cm.cositi.api.adhesion.dto.FraisAdhesionAdherentDto;
import cm.cositi.api.adhesion.dto.FraisAdhesionDto;
import cm.cositi.api.adhesion.dto.RapprochementFraisAdhesionDto;
import cm.cositi.api.adhesion.dto.ResolutionAnomalieFraisDto;
import cm.cositi.api.adhesion.dto.SyntheseFraisAdhesionDto;
import cm.cositi.api.adhesion.entite.StatutFraisAdhesion;
import cm.cositi.api.commun.reponse.ReponsePaginee;
import cm.cositi.api.securite.entite.Utilisateur;
import org.springframework.data.domain.Pageable;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.UUID;

/**
 * Frais d'adhésion (spécification « Frais d'adhésion, activation et contrôle DGA » §4.1, §5, §7 à §9). Le montant
 * unitaire vient exclusivement du paramètre {@code MONTANT_INSCRIPTION} ; tous les calculs sont faits ici.
 */
public interface ServiceFraisAdhesion {

    /** §5 {@code getCurrentAdhesionFee}. */
    ConfigurationFraisAdhesionDto configuration();

    BigDecimal montantUnitaire();

    /** Section frais du dossier : montant requis + frais enregistré s'il existe. */
    FraisAdhesionAdherentDto parAdherent(UUID adherentId, Utilisateur demandeur);

    /** Un seul frais initial par adhérent ; une clé d'idempotence rejouée renvoie le frais déjà créé. */
    ResultatEnregistrementFrais enregistrer(UUID adherentId, EnregistrerFraisAdhesionDto dto, Utilisateur gestionnaire);

    FraisAdhesionDto consulter(UUID fraisId, Utilisateur demandeur);

    ReponsePaginee<FraisAdhesionDto> lister(StatutFraisAdhesion statut, UUID agentId, LocalDate du, LocalDate au,
                                            boolean seulementEcarts, Pageable pageable, Utilisateur demandeur);

    /** Confirmation de l'encaissement — jamais par l'auteur de l'enregistrement. */
    FraisAdhesionDto valider(UUID fraisId, Long versionAttendue, Utilisateur validateur);

    FraisAdhesionDto signalerAnomalie(UUID fraisId, String motif, Utilisateur auteur);

    FraisAdhesionDto resoudreAnomalie(UUID fraisId, ResolutionAnomalieFraisDto dto, Utilisateur auteur);

    /** Synthèse des frais enregistrés sur une période, globale ou pour un agent collecteur. */
    SyntheseFraisAdhesionDto synthese(LocalDate du, LocalDate au, UUID agentId, Utilisateur demandeur);

    /** §7, §9 : dossiers distincts soumis × montant unitaire, rapproché du montant enregistré. */
    RapprochementFraisAdhesionDto rapprochement(LocalDate du, LocalDate au, UUID agentId, Utilisateur demandeur);

    record ResultatEnregistrementFrais(FraisAdhesionDto frais, boolean dejaExistant) {
    }
}
