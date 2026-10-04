package cm.cositi.api.adhesion.service;

import cm.cositi.api.adhesion.dto.ChecklistDocumentaireDto;
import cm.cositi.api.adhesion.dto.ExigenceDocumentaireDto;
import cm.cositi.api.adhesion.dto.ModificationExigenceDto;
import cm.cositi.api.adhesion.entite.ExigenceDocumentaire;
import cm.cositi.api.securite.entite.Utilisateur;

import java.time.LocalDate;
import java.util.List;
import java.util.Set;
import java.util.UUID;

/**
 * Matrice documentaire centralisée (document des règles v2.0, §17 à §24, §38) : quelles pièces, quelles informations
 * elles justifient, lesquelles sont contrôlées par la DGA et lesquelles bloquent — une seule source pour l'activation,
 * le contrôle DGA, la checklist et le frontend.
 */
public interface ServiceExigenceDocumentaire {

    /** Toute la matrice (ou seulement les exigences en vigueur aujourd'hui), pour l'affichage et le paramétrage. */
    List<ExigenceDocumentaireDto> lister(boolean seulementEnVigueur);

    /** Exigences en vigueur à la date (actives, dans leur période d'effet). */
    List<ExigenceDocumentaire> enVigueur(LocalDate date);

    /** Types de pièces de niveau OBLIGATOIRE en vigueur, confirmées ou non. */
    Set<String> typesPiecesObligatoires();

    /** {@code true} si toutes les pièces obligatoires en vigueur sont confirmées par la COSITI. */
    boolean piecesObligatoiresConfirmees();

    /** Informations (champs adhérent) justifiées par une pièce et contrôlées par la DGA — §16 : leur modification repasse en contrôle. */
    Set<String> champsJustifies();

    /** Checklist dynamique d'un adhérent (§19, §20). */
    ChecklistDocumentaireDto checklist(UUID adherentId, Utilisateur demandeur);

    ExigenceDocumentaireDto modifier(UUID exigenceId, ModificationExigenceDto dto, Utilisateur auteur);

    /** Confirmation par la COSITI ({@code V} → {@code C}) : seule une exigence confirmée peut devenir bloquante. */
    ExigenceDocumentaireDto confirmer(UUID exigenceId, String motif, Utilisateur auteur);
}
