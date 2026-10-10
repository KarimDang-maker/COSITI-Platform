package cm.cositi.api.adhesion.service;

import cm.cositi.api.adherent.entite.Adherent;
import cm.cositi.api.adhesion.dto.ControleDgaDto;
import cm.cositi.api.adhesion.dto.DecisionControleDgaDto;
import cm.cositi.api.adhesion.dto.LigneFileControleDgaDto;
import cm.cositi.api.adhesion.dto.SyntheseControleDgaDto;
import cm.cositi.api.adhesion.dto.VerifierChampDto;
import cm.cositi.api.adhesion.dto.VerifierDocumentDto;
import cm.cositi.api.adhesion.entite.StatutControle;
import cm.cositi.api.audit.AuditLigneDto;
import cm.cositi.api.commun.reponse.ReponsePaginee;
import cm.cositi.api.securite.entite.Utilisateur;
import org.springframework.data.domain.Pageable;

import java.time.LocalDate;
import java.util.List;
import java.util.UUID;

/**
 * Contrôle documentaire DGA (§3, §12 à §15) : pour chaque document justificatif, la DGA compare chaque information
 * enregistrée dans COSITI à la valeur lue sur le document physique, puis valide, demande une correction ou rejette.
 */
public interface ServiceControleDga {

    /**
     * Ouvre un tour de contrôle pour un adhérent transmis à la DGA (appelé par l'activation ou la resoumission,
     * dans leur transaction) : documents attendus et valeurs COSITI figées à cet instant.
     */
    ControleDgaDto ouvrir(Adherent adherent, UUID soumisParId);

    ReponsePaginee<LigneFileControleDgaDto> file(List<StatutControle> statuts, UUID agentId, LocalDate du, LocalDate au,
                                                 boolean seulementAvecAnomalie, Pageable pageable, Utilisateur demandeur);

    ControleDgaDto consulter(UUID controleId, Utilisateur demandeur);

    /** Dernier tour de contrôle de l'adhérent (404 s'il n'a jamais été transmis). */
    ControleDgaDto courant(UUID adherentId, Utilisateur demandeur);

    /** Tous les tours de l'adhérent, du plus récent au plus ancien — les tours clos ne sont jamais modifiés. */
    List<ControleDgaDto> historique(UUID adherentId, Utilisateur demandeur);

    /** Journal d'audit d'un tour : démarrage, chaque information vérifiée, anomalies, décision. */
    List<AuditLigneDto> journal(UUID controleId, Utilisateur demandeur);

    ControleDgaDto demarrer(UUID controleId, Utilisateur dga);

    ControleDgaDto verifierChamp(UUID controleId, UUID champId, VerifierChampDto dto, Utilisateur dga);

    /** Constat sur un document entier (manquant, illisible), appliqué à toutes ses informations. */
    ControleDgaDto verifierDocument(UUID controleId, UUID controleDocumentId, VerifierDocumentDto dto, Utilisateur dga);

    ControleDgaDto terminer(UUID controleId, DecisionControleDgaDto dto, Utilisateur dga);

    SyntheseControleDgaDto synthese(LocalDate du, LocalDate au, Utilisateur demandeur);
}
