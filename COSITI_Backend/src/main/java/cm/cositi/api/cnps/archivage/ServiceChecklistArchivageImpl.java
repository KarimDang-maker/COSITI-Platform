package cm.cositi.api.cnps.archivage;

import cm.cositi.api.audit.ServiceAudit;
import cm.cositi.api.audit.TypeOperation;
import cm.cositi.api.commun.exception.ExceptionConflit;
import cm.cositi.api.commun.exception.ExceptionRessourceIntrouvable;
import cm.cositi.api.commun.exception.ExceptionValidation;
import cm.cositi.api.parametre.ServiceParametre;
import cm.cositi.api.securite.entite.Utilisateur;
import cm.cositi.api.securite.service.ServicePerimetreDonnees;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.sql.Timestamp;
import java.util.Arrays;
import java.util.HashMap;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.Set;
import java.util.UUID;

/**
 * Checklist d'archivage : rattache chaque pièce du dossier d'immatriculation à un document déjà stocké et/ou à
 * une référence physique, sans créer de nouveau stockage. La liste des pièces suivies et celles qui bloquent
 * l'immatriculation viennent des paramètres {@code ARCHIVAGE_PIECES} et {@code ARCHIVAGE_PIECES_BLOQUANTES}.
 */
@Service
public class ServiceChecklistArchivageImpl implements ServiceChecklistArchivage {

    private static final String CLE_PIECES = "ARCHIVAGE_PIECES";
    private static final String CLE_BLOQUANTES = "ARCHIVAGE_PIECES_BLOQUANTES";

    /** Libellés d'affichage uniquement : aucune règle métier ne dépend de ce tableau. */
    private static final Map<String, String> LIBELLES = Map.of(
            "CNI_RECTO", "Carte nationale d'identité (recto)",
            "CNI_VERSO", "Carte nationale d'identité (verso)",
            "ACTE_NAISSANCE", "Acte de naissance",
            "PHOTO_IDENTITE", "Photo d'identité",
            "FORMULAIRE_SIGNE", "Formulaire CNPS signé",
            "RECEPISSE_PREIMMAT", "Récépissé de préimmatriculation",
            "ACCUSE_DEPOT_CPS", "Accusé de dépôt au CPS",
            "ATTESTATION_IMMAT", "Attestation d'immatriculation");

    private final JdbcTemplate jdbcTemplate;
    private final ServiceParametre serviceParametre;
    private final ServicePerimetreDonnees perimetre;
    private final ServiceAudit serviceAudit;

    public ServiceChecklistArchivageImpl(JdbcTemplate jdbcTemplate, ServiceParametre serviceParametre,
                                         ServicePerimetreDonnees perimetre, ServiceAudit serviceAudit) {
        this.jdbcTemplate = jdbcTemplate;
        this.serviceParametre = serviceParametre;
        this.perimetre = perimetre;
        this.serviceAudit = serviceAudit;
    }

    @Override
    @PreAuthorize("hasAuthority('CNPS:LIRE')")
    @Transactional
    public ChecklistArchivageDto consulter(UUID dossierId, Utilisateur demandeur) {
        UUID adherentId = adherentDuDossier(dossierId);
        perimetre.verifierAccesAdherent(demandeur, adherentId);
        synchroniser(dossierId);
        return construire(dossierId, adherentId);
    }

    @Override
    @PreAuthorize("hasAuthority('CNPS:GERER')")
    @Transactional
    public ChecklistArchivageDto mettreAJour(UUID dossierId, String codePiece, MiseAJourChecklistDto dto,
                                             Utilisateur auteur) {
        UUID adherentId = adherentDuDossier(dossierId);
        perimetre.verifierAccesAdherent(auteur, adherentId);
        if (!catalogue().contains(codePiece)) {
            throw new ExceptionRessourceIntrouvable("ARCHIVAGE_PIECE_INCONNUE",
                    "La pièce " + codePiece + " ne fait pas partie de la checklist d'archivage.");
        }
        synchroniser(dossierId);

        Map<String, Object> ligne = jdbcTemplate.queryForMap(
                "SELECT id, statut, document_id, reference_physique FROM checklist_archivage_dossier "
                        + "WHERE dossier_id = ? AND code_piece = ?", dossierId, codePiece);
        UUID ligneId = (UUID) ligne.get("id");
        StatutArchivage avant = StatutArchivage.valueOf((String) ligne.get("statut"));
        StatutArchivage apres = dto.statut();
        if (!avant.transitionsAutorisees().contains(apres)) {
            throw new ExceptionConflit("ARCHIVAGE_TRANSITION_INTERDITE",
                    "Transition " + avant + " vers " + apres + " interdite. Possibles : "
                            + avant.transitionsAutorisees());
        }

        UUID documentAvant = (UUID) ligne.get("document_id");
        String referenceAvant = (String) ligne.get("reference_physique");
        UUID document = dto.documentId() != null ? dto.documentId() : documentAvant;
        String reference = dto.referencePhysique() != null && !dto.referencePhysique().isBlank()
                ? dto.referencePhysique().trim() : referenceAvant;
        String motif = dto.motif() == null || dto.motif().isBlank() ? null : dto.motif().trim();

        if (apres == StatutArchivage.NON_FOURNIE) {
            if (motif == null) {
                throw new ExceptionValidation("ARCHIVAGE_MOTIF_REQUIS",
                        "Le motif est obligatoire pour retirer une pièce de la checklist.", "motif");
            }
            document = null;
            reference = null;
        } else {
            if (document == null && reference == null) {
                throw new ExceptionValidation("ARCHIVAGE_RATTACHEMENT_REQUIS",
                        "Rattachez la pièce à un document ou indiquez sa référence physique.", "documentId");
            }
            if (dto.documentId() != null && documentAvant != null && !dto.documentId().equals(documentAvant)
                    && motif == null) {
                throw new ExceptionValidation("ARCHIVAGE_MOTIF_REQUIS",
                        "Le motif est obligatoire pour remplacer le document d'une pièce.", "motif");
            }
            if (apres == StatutArchivage.ARCHIVEE && reference == null) {
                throw new ExceptionValidation("ARCHIVAGE_REFERENCE_REQUISE",
                        "Indiquez la référence physique (classeur, casier) pour archiver la pièce.",
                        "referencePhysique");
            }
        }
        if (document != null) {
            verifierDocumentDeLAdherent(document, adherentId);
        }

        jdbcTemplate.update("""
                UPDATE checklist_archivage_dossier SET statut = ?, document_id = ?, reference_physique = ?,
                       motif = ?, modifie_le = now(), modifie_par = ? WHERE id = ?
                """, apres.name(), document, reference, motif, auteur.getIdentifiant(), ligneId);
        jdbcTemplate.update("""
                INSERT INTO historique_checklist_archivage (checklist_id, statut_avant, statut_apres, document_id,
                                                            reference_physique, motif, auteur_id)
                VALUES (?, ?, ?, ?, ?, ?, ?)
                """, ligneId, avant.name(), apres.name(), document, reference, motif, auteur.getId());
        serviceAudit.tracer(TypeOperation.CNPS_CHECKLIST_ARCHIVAGE, "checklist_archivage_dossier", ligneId, avant,
                apres, codePiece + (motif == null ? "" : " — " + motif));
        return construire(dossierId, adherentId);
    }

    @Override
    @PreAuthorize("hasAuthority('CNPS:LIRE')")
    public List<DossierIncompletDto> dossiersIncomplets(Utilisateur demandeur) {
        Set<String> bloquantes = bloquantes();
        Map<UUID, Set<String>> pretes = new HashMap<>();
        jdbcTemplate.query("SELECT dossier_id, code_piece FROM checklist_archivage_dossier "
                + "WHERE statut IN ('VERIFIEE', 'ARCHIVEE')", rs -> {
            pretes.computeIfAbsent(UUID.fromString(rs.getString("dossier_id")), k -> new LinkedHashSet<>())
                    .add(rs.getString("code_piece"));
        });
        return jdbcTemplate.query("""
                SELECT d.id AS dossier_id, a.id AS adherent_id, a.matricule, a.nom, a.prenoms
                FROM dossier_cnps d JOIN adherent a ON a.id = d.adherent_id
                WHERE a.archive = false AND d.numero_immatriculation IS NULL ORDER BY a.nom, a.prenoms
                """, (rs, i) -> {
            UUID dossierId = UUID.fromString(rs.getString("dossier_id"));
            UUID adherentId = UUID.fromString(rs.getString("adherent_id"));
            List<String> manquantes = bloquantes.stream()
                    .filter(c -> !pretes.getOrDefault(dossierId, Set.of()).contains(c)).toList();
            String prenoms = rs.getString("prenoms");
            String nom = rs.getString("nom");
            return new DossierIncompletDto(dossierId, adherentId, rs.getString("matricule"),
                    prenoms == null || prenoms.isBlank() ? nom : nom + " " + prenoms, manquantes);
        }).stream()
                .filter(d -> !d.piecesManquantes().isEmpty())
                .filter(d -> perimetre.peutAccederAdherent(demandeur, d.adherentId()))
                .toList();
    }

    @Override
    public List<String> piecesBloquantesManquantes(UUID dossierId) {
        Set<String> pretes = new LinkedHashSet<>(jdbcTemplate.queryForList(
                "SELECT code_piece FROM checklist_archivage_dossier WHERE dossier_id = ? "
                        + "AND statut IN ('VERIFIEE', 'ARCHIVEE')", String.class, dossierId));
        return bloquantes().stream().filter(c -> !pretes.contains(c)).toList();
    }

    @Override
    public Map<UUID, Integer> manquantesParAdherent() {
        Set<String> bloquantes = bloquantes();
        Map<UUID, Integer> pretes = new HashMap<>();
        jdbcTemplate.query("""
                SELECT d.adherent_id, c.code_piece FROM checklist_archivage_dossier c
                JOIN dossier_cnps d ON d.id = c.dossier_id WHERE c.statut IN ('VERIFIEE', 'ARCHIVEE')
                """, rs -> {
            if (bloquantes.contains(rs.getString("code_piece"))) {
                pretes.merge(UUID.fromString(rs.getString("adherent_id")), 1, Integer::sum);
            }
        });
        Map<UUID, Integer> resultat = new HashMap<>();
        jdbcTemplate.query("SELECT adherent_id FROM dossier_cnps", rs -> {
            UUID adherent = UUID.fromString(rs.getString("adherent_id"));
            resultat.put(adherent, Math.max(0, bloquantes.size() - pretes.getOrDefault(adherent, 0)));
        });
        return resultat;
    }

    @Override
    public int nombrePiecesBloquantes() {
        return bloquantes().size();
    }

    // ------------------------------------------------------------------ Interne

    private ChecklistArchivageDto construire(UUID dossierId, UUID adherentId) {
        Set<String> bloquantes = bloquantes();
        Map<String, LigneChecklistDto> parCode = new HashMap<>();
        jdbcTemplate.query("""
                SELECT c.code_piece, c.statut, c.document_id, d.nom_fichier_original, c.reference_physique,
                       c.motif, c.modifie_le, c.modifie_par, c.cree_le, c.cree_par
                FROM checklist_archivage_dossier c LEFT JOIN document d ON d.id = c.document_id
                WHERE c.dossier_id = ?
                """, rs -> {
            String code = rs.getString("code_piece");
            Timestamp modif = rs.getTimestamp("modifie_le") != null ? rs.getTimestamp("modifie_le")
                    : rs.getTimestamp("cree_le");
            String par = rs.getString("modifie_par") != null ? rs.getString("modifie_par") : rs.getString("cree_par");
            parCode.put(code, new LigneChecklistDto(code, libelle(code), bloquantes.contains(code),
                    StatutArchivage.valueOf(rs.getString("statut")),
                    rs.getString("document_id") == null ? null : UUID.fromString(rs.getString("document_id")),
                    rs.getString("nom_fichier_original"), rs.getString("reference_physique"), rs.getString("motif"),
                    modif == null ? null : modif.toInstant(), par));
        }, dossierId);

        List<LigneChecklistDto> lignes = catalogue().stream().map(parCode::get).filter(Objects::nonNull).toList();
        int pretes = (int) lignes.stream().filter(l -> l.bloquante() && l.statut().estPrete()).count();
        return new ChecklistArchivageDto(dossierId, adherentId, lignes, bloquantes.size(), pretes,
                pretes == bloquantes.size());
    }

    /** Crée les lignes manquantes et reprend les documents déjà rattachés aux pièces du dossier CNPS. */
    private void synchroniser(UUID dossierId) {
        for (String code : catalogue()) {
            jdbcTemplate.update("INSERT INTO checklist_archivage_dossier (dossier_id, code_piece, cree_par) "
                    + "VALUES (?, ?, 'SYNCHRO') ON CONFLICT (dossier_id, code_piece) DO NOTHING", dossierId, code);
        }
        jdbcTemplate.update("""
                UPDATE checklist_archivage_dossier c SET statut = 'FOURNIE', document_id = p.document_id,
                       modifie_le = now(), modifie_par = 'SYNCHRO'
                FROM piece_dossier_cnps p
                WHERE c.dossier_id = ? AND p.dossier_id = c.dossier_id AND p.type_piece = c.code_piece
                  AND p.document_id IS NOT NULL AND c.statut = 'NON_FOURNIE'
                """, dossierId);
    }

    private void verifierDocumentDeLAdherent(UUID documentId, UUID adherentId) {
        List<UUID> proprietaires = jdbcTemplate.query("SELECT adherent_id FROM document WHERE id = ?",
                (rs, i) -> rs.getString("adherent_id") == null ? null : UUID.fromString(rs.getString("adherent_id")),
                documentId);
        if (proprietaires.isEmpty()) {
            throw new ExceptionRessourceIntrouvable("DOCUMENT_INTROUVABLE", "Document introuvable.");
        }
        if (!adherentId.equals(proprietaires.get(0))) {
            throw new ExceptionConflit("ARCHIVAGE_DOCUMENT_AUTRE_ADHERENT",
                    "Ce document n'appartient pas à l'adhérent de ce dossier.");
        }
    }

    private UUID adherentDuDossier(UUID dossierId) {
        List<UUID> r = jdbcTemplate.query("SELECT adherent_id FROM dossier_cnps WHERE id = ?",
                (rs, i) -> UUID.fromString(rs.getString("adherent_id")), dossierId);
        if (r.isEmpty()) {
            throw new ExceptionRessourceIntrouvable("CNPS_DOSSIER_INTROUVABLE", "Dossier CNPS introuvable.");
        }
        return r.get(0);
    }

    private Set<String> catalogue() {
        return liste(CLE_PIECES);
    }

    private Set<String> bloquantes() {
        return liste(CLE_BLOQUANTES);
    }

    private Set<String> liste(String cle) {
        Set<String> codes = new LinkedHashSet<>();
        Arrays.stream(serviceParametre.texte(cle).split(",")).map(String::trim).filter(s -> !s.isEmpty())
                .forEach(codes::add);
        return codes;
    }

    private static String libelle(String code) {
        return LIBELLES.getOrDefault(code, code);
    }
}
