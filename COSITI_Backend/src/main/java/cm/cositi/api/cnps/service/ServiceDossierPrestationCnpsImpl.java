package cm.cositi.api.cnps.service;

import cm.cositi.api.audit.ServiceAudit;
import cm.cositi.api.audit.TypeOperation;
import cm.cositi.api.cnps.dto.AjoutPiecePrestationDto;
import cm.cositi.api.cnps.dto.ChangementStatutDossierPrestationDto;
import cm.cositi.api.cnps.dto.CreationDossierPrestationDto;
import cm.cositi.api.cnps.dto.CritereRechercheDossierPrestation;
import cm.cositi.api.cnps.dto.DossierPrestationCnpsDto;
import cm.cositi.api.cnps.dto.HistoriqueDossierPrestationCnpsDto;
import cm.cositi.api.cnps.dto.OffreCnpsDto;
import cm.cositi.api.cnps.dto.PieceDossierPrestationCnpsDto;
import cm.cositi.api.cnps.dto.PieceManquantePrestationDto;
import cm.cositi.api.cnps.dto.PieceOffreCnpsDto;
import cm.cositi.api.cnps.entite.DossierPrestationCnps;
import cm.cositi.api.cnps.entite.HistoriqueDossierPrestationCnps;
import cm.cositi.api.cnps.entite.OffreCnps;
import cm.cositi.api.cnps.entite.PieceDossierPrestationCnps;
import cm.cositi.api.cnps.entite.PieceOffreCnps;
import cm.cositi.api.cnps.entite.StatutDossierPrestationCnps;
import cm.cositi.api.cnps.entite.StatutPieceCnps;
import cm.cositi.api.cnps.repository.DossierPrestationCnpsRepository;
import cm.cositi.api.cnps.repository.HistoriqueDossierPrestationCnpsRepository;
import cm.cositi.api.cnps.repository.OffreCnpsRepository;
import cm.cositi.api.cnps.repository.PieceDossierPrestationCnpsRepository;
import cm.cositi.api.cnps.repository.PieceOffreCnpsRepository;
import cm.cositi.api.commun.exception.ExceptionConflit;
import cm.cositi.api.commun.exception.ExceptionRessourceIntrouvable;
import cm.cositi.api.commun.exception.ExceptionValidation;
import cm.cositi.api.commun.reponse.ReponsePaginee;
import cm.cositi.api.securite.entite.Utilisateur;
import cm.cositi.api.securite.service.ServicePerimetreDonnees;
import org.springframework.data.domain.Pageable;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import java.util.stream.Collectors;

@Service
public class ServiceDossierPrestationCnpsImpl implements ServiceDossierPrestationCnps {

    private final OffreCnpsRepository offreRepository;
    private final PieceOffreCnpsRepository pieceOffreRepository;
    private final DossierPrestationCnpsRepository dossierRepository;
    private final PieceDossierPrestationCnpsRepository pieceDossierRepository;
    private final HistoriqueDossierPrestationCnpsRepository historiqueRepository;
    private final ServicePerimetreDonnees perimetre;
    private final ServiceAudit serviceAudit;
    private final JdbcTemplate jdbcTemplate;

    public ServiceDossierPrestationCnpsImpl(OffreCnpsRepository offreRepository,
                                             PieceOffreCnpsRepository pieceOffreRepository,
                                             DossierPrestationCnpsRepository dossierRepository,
                                             PieceDossierPrestationCnpsRepository pieceDossierRepository,
                                             HistoriqueDossierPrestationCnpsRepository historiqueRepository,
                                             ServicePerimetreDonnees perimetre, ServiceAudit serviceAudit,
                                             JdbcTemplate jdbcTemplate) {
        this.offreRepository = offreRepository;
        this.pieceOffreRepository = pieceOffreRepository;
        this.dossierRepository = dossierRepository;
        this.pieceDossierRepository = pieceDossierRepository;
        this.historiqueRepository = historiqueRepository;
        this.perimetre = perimetre;
        this.serviceAudit = serviceAudit;
        this.jdbcTemplate = jdbcTemplate;
    }

    @Override
    @PreAuthorize("hasAuthority('CNPS:LIRE')")
    public List<OffreCnpsDto> listerOffres(String rubrique) {
        List<OffreCnps> offres = (rubrique == null || rubrique.isBlank())
                ? offreRepository.findByActifTrueOrderByRubriqueAscOrdreAffichageAsc()
                : offreRepository.findByRubriqueAndActifTrueOrderByOrdreAffichageAsc(rubrique);

        return offres.stream().map(offre -> {
            List<PieceOffreCnpsDto> pieces = pieceOffreRepository.findByOffreIdOrderByOrdreAffichageAsc(offre.getId())
                    .stream().map(PieceOffreCnpsDto::depuis).toList();
            long nombreDossiers = compterDossiersPourOffre(offre.getId());
            return OffreCnpsDto.depuis(offre, pieces, nombreDossiers);
        }).toList();
    }

    private long compterDossiersPourOffre(UUID offreId) {
        Long compte = jdbcTemplate.queryForObject(
                "SELECT count(*) FROM dossier_prestation_cnps WHERE offre_id = ?", Long.class, offreId);
        return compte != null ? compte : 0L;
    }

    @Override
    @PreAuthorize("hasAuthority('CNPS:GERER')")
    @Transactional
    public DossierPrestationCnpsDto ouvrir(CreationDossierPrestationDto dto, Utilisateur auteur) {
        perimetre.verifierAccesAdherent(auteur, dto.adherentId());

        OffreCnps offre = offreRepository.findById(dto.offreId())
                .filter(OffreCnps::isActif)
                .orElseThrow(() -> new ExceptionValidation("CNPS_OFFRE_INTROUVABLE",
                        "L'offre sélectionnée est introuvable ou inactive.", "offreId"));

        DossierPrestationCnps dossier = new DossierPrestationCnps(dto.adherentId(), dto.offreId());
        dossier.setNombrePersonnesACharge(dto.nombrePersonnesACharge());
        // Date de dépôt à la COSITI (§30 du contrat) : le jour où la Gestionnaire ouvre le dossier est le
        // jour où la demande a été reçue — jamais déduite ni laissée à saisir séparément.
        dossier.setDateDepot(LocalDate.now());
        dossier = dossierRepository.save(dossier);

        for (PieceOffreCnps pieceRef : pieceOffreRepository.findByOffreIdOrderByOrdreAffichageAsc(offre.getId())) {
            pieceDossierRepository.save(
                    new PieceDossierPrestationCnps(dossier.getId(), pieceRef.getId(), auteur.getIdentifiant()));
        }

        historiqueRepository.save(new HistoriqueDossierPrestationCnps(dossier.getId(), null,
                StatutDossierPrestationCnps.INCOMPLET, auteur.getId(),
                "Ouverture du dossier — offre " + offre.getLibelle()));
        serviceAudit.tracer(TypeOperation.CNPS_DOSSIER_CREATION, "dossier_prestation_cnps", dossier.getId(), null,
                dossier.getId(), "Ouverture pour l'adhérent " + dto.adherentId() + ", offre " + offre.getCode());

        return construireDto(dossier);
    }

    @Override
    @PreAuthorize("hasAuthority('CNPS:LIRE')")
    public DossierPrestationCnpsDto consulter(UUID dossierId, Utilisateur demandeur) {
        DossierPrestationCnps dossier = charger(dossierId);
        perimetre.verifierAccesAdherent(demandeur, dossier.getAdherentId());
        return construireDto(dossier);
    }

    @Override
    @PreAuthorize("hasAuthority('CNPS:LIRE')")
    public ReponsePaginee<DossierPrestationCnpsDto> lister(CritereRechercheDossierPrestation critere,
                                                             Pageable pageable, Utilisateur demandeur) {
        StringBuilder conditions = new StringBuilder(" WHERE 1 = 1");
        List<Object> parametres = new ArrayList<>();

        if (critere.rubrique() != null && !critere.rubrique().isBlank()) {
            conditions.append(" AND o.rubrique = ?");
            parametres.add(critere.rubrique());
        }
        if (critere.offreId() != null) {
            conditions.append(" AND dp.offre_id = ?");
            parametres.add(critere.offreId());
        }
        if (critere.statut() != null) {
            conditions.append(" AND dp.statut = ?");
            parametres.add(critere.statut().name());
        }
        if (critere.recherche() != null && !critere.recherche().isBlank()) {
            conditions.append(" AND (a.matricule ILIKE ? OR a.nom ILIKE ? OR a.prenoms ILIKE ? "
                    + "OR dc.numero_immatriculation ILIKE ?)");
            String motif = "%" + critere.recherche().trim() + "%";
            parametres.add(motif);
            parametres.add(motif);
            parametres.add(motif);
            parametres.add(motif);
        }

        String base = """
                FROM dossier_prestation_cnps dp
                JOIN offre_cnps o ON o.id = dp.offre_id
                JOIN adherent a ON a.id = dp.adherent_id
                LEFT JOIN dossier_cnps dc ON dc.adherent_id = a.id
                """ + conditions;

        Long total = jdbcTemplate.queryForObject("SELECT count(*) " + base, Long.class, parametres.toArray());
        int totalElements = total != null ? total.intValue() : 0;

        List<Object> parametresPage = new ArrayList<>(parametres);
        parametresPage.add(pageable.getPageSize());
        parametresPage.add(pageable.getOffset());
        List<UUID> idsPage = jdbcTemplate.query("SELECT dp.id " + base + " ORDER BY dp.cree_le DESC LIMIT ? OFFSET ?",
                (rs, i) -> UUID.fromString(rs.getString("id")), parametresPage.toArray());

        List<DossierPrestationCnps> dossiersPage = idsPage.stream()
                .map(this::charger)
                .filter(d -> perimetre.peutAccederAdherent(demandeur, d.getAdherentId()))
                .toList();
        Map<UUID, IdentiteAdherentCnps> identites = chargerIdentites(
                dossiersPage.stream().map(DossierPrestationCnps::getAdherentId).distinct().toList());

        List<DossierPrestationCnpsDto> contenu = dossiersPage.stream()
                .map(d -> construireDto(d, identites.getOrDefault(d.getAdherentId(), IDENTITE_INCONNUE)))
                .toList();

        int totalPages = pageable.getPageSize() > 0
                ? (int) Math.ceil((double) totalElements / pageable.getPageSize()) : 1;
        return new ReponsePaginee<>(contenu, pageable.getPageNumber(), pageable.getPageSize(), totalElements,
                Math.max(totalPages, 1), List.of());
    }

    @Override
    @PreAuthorize("hasAuthority('CNPS:GERER')")
    @Transactional
    public DossierPrestationCnpsDto ajouterPiece(UUID dossierId, AjoutPiecePrestationDto dto, Utilisateur auteur) {
        DossierPrestationCnps dossier = charger(dossierId);
        perimetre.verifierAccesAdherent(auteur, dossier.getAdherentId());

        if (dossier.getStatut().estFige()) {
            throw new ExceptionConflit("CNPS_DOSSIER_FIGE",
                    "Le dossier est " + dossier.getStatut() + " : ses pièces ne peuvent plus être modifiées.");
        }
        if (!pieceOffreRepository.findByOffreIdOrderByOrdreAffichageAsc(dossier.getOffreId()).stream()
                .anyMatch(p -> p.getId().equals(dto.pieceOffreId()))) {
            throw new ExceptionValidation("CNPS_PIECE_HORS_REFERENTIEL",
                    "Cette pièce ne fait pas partie du référentiel de l'offre de ce dossier.", "pieceOffreId");
        }

        PieceDossierPrestationCnps piece = pieceDossierRepository
                .findByDossierIdAndPieceOffreId(dossierId, dto.pieceOffreId())
                .orElseGet(() -> pieceDossierRepository.save(
                        new PieceDossierPrestationCnps(dossierId, dto.pieceOffreId(), auteur.getIdentifiant())));

        piece.rattacher(dto.documentId());
        pieceDossierRepository.save(piece);

        serviceAudit.tracer(TypeOperation.CNPS_PIECE_AJOUT, "piece_dossier_prestation_cnps", piece.getId(), null,
                dto.documentId(), "Pièce du dossier de prestation " + dossierId);

        return construireDto(dossier);
    }

    @Override
    @PreAuthorize("hasAuthority('CNPS:CHANGER_STATUT')")
    @Transactional
    public DossierPrestationCnpsDto changerStatut(UUID dossierId, ChangementStatutDossierPrestationDto dto,
                                                   Utilisateur auteur) {
        DossierPrestationCnps dossier = charger(dossierId);
        perimetre.verifierAccesAdherent(auteur, dossier.getAdherentId());

        StatutDossierPrestationCnps actuel = dossier.getStatut();
        StatutDossierPrestationCnps nouveau = dto.statut();
        if (actuel == nouveau) {
            return construireDto(dossier);
        }
        if (!actuel.peutAllerVers(nouveau)) {
            throw new ExceptionConflit("CNPS_TRANSITION_INTERDITE",
                    "Transition " + actuel + " vers " + nouveau + " interdite. Transitions possibles depuis "
                            + actuel + " : " + actuel.transitionsAutorisees());
        }
        if (nouveau == StatutDossierPrestationCnps.COMPLET && !piecesManquantesInterne(dossier).isEmpty()) {
            throw new ExceptionConflit("CNPS_PIECES_MANQUANTES",
                    "Le dossier ne peut pas passer à COMPLET : des pièces obligatoires manquent encore.");
        }
        if (nouveau == StatutDossierPrestationCnps.REJETE && (dto.commentaire() == null || dto.commentaire().isBlank())) {
            throw new ExceptionValidation("CNPS_MOTIF_REQUIS", "Le motif de rejet est obligatoire.", "commentaire");
        }

        dossier.setStatut(nouveau);
        if (nouveau == StatutDossierPrestationCnps.REJETE) {
            dossier.setMotifRejet(dto.commentaire());
        }
        if (nouveau == StatutDossierPrestationCnps.TRANSMIS_CNPS) {
            dossier.setDateTransmissionCnps(LocalDate.now());
        }
        dossier = dossierRepository.save(dossier);

        historiqueRepository.save(new HistoriqueDossierPrestationCnps(dossierId, actuel, nouveau, auteur.getId(),
                dto.commentaire()));
        serviceAudit.tracer(TypeOperation.CNPS_CHANGEMENT_STATUT, "dossier_prestation_cnps", dossierId, actuel,
                nouveau, dto.commentaire());

        return construireDto(dossier);
    }

    @Override
    @PreAuthorize("hasAuthority('CNPS:GERER')")
    @Transactional
    public DossierPrestationCnpsDto modifierObservations(UUID dossierId, String observations,
                                                           LocalDate prochaineRelanceLe, Utilisateur auteur) {
        DossierPrestationCnps dossier = charger(dossierId);
        perimetre.verifierAccesAdherent(auteur, dossier.getAdherentId());

        dossier.setObservations(observations);
        dossier.setProchaineRelanceLe(prochaineRelanceLe);
        dossier = dossierRepository.save(dossier);

        serviceAudit.tracer(TypeOperation.CNPS_OBSERVATIONS_MODIFICATION, "dossier_prestation_cnps", dossierId, null,
                Map.of("observations", observations == null ? "" : observations,
                        "prochaineRelanceLe", prochaineRelanceLe == null ? "" : prochaineRelanceLe.toString()),
                "Mise à jour des observations/relance par " + auteur.getIdentifiant());

        return construireDto(dossier);
    }

    @Override
    @PreAuthorize("hasAuthority('CNPS:LIRE')")
    public List<PieceManquantePrestationDto> piecesManquantes(UUID dossierId, Utilisateur demandeur) {
        DossierPrestationCnps dossier = charger(dossierId);
        perimetre.verifierAccesAdherent(demandeur, dossier.getAdherentId());
        return piecesManquantesInterne(dossier);
    }

    @Override
    @PreAuthorize("hasAuthority('CNPS:LIRE')")
    public List<HistoriqueDossierPrestationCnpsDto> journal(UUID dossierId, Utilisateur demandeur) {
        DossierPrestationCnps dossier = charger(dossierId);
        perimetre.verifierAccesAdherent(demandeur, dossier.getAdherentId());
        return historiqueRepository.findByDossierIdOrderByHorodatageDesc(dossierId).stream()
                .map(HistoriqueDossierPrestationCnpsDto::depuis)
                .collect(Collectors.toList());
    }

    // ------------------------------------------------------------------ Interne

    private List<PieceManquantePrestationDto> piecesManquantesInterne(DossierPrestationCnps dossier) {
        List<PieceOffreCnps> referentiel = pieceOffreRepository
                .findByOffreIdOrderByOrdreAffichageAsc(dossier.getOffreId()).stream()
                .filter(PieceOffreCnps::isObligatoire).toList();
        List<PieceDossierPrestationCnps> pieces = pieceDossierRepository.findByDossierId(dossier.getId());

        List<PieceManquantePrestationDto> manquantes = new ArrayList<>();
        for (PieceOffreCnps ref : referentiel) {
            PieceDossierPrestationCnps piece = pieces.stream()
                    .filter(p -> p.getPieceOffreId().equals(ref.getId()))
                    .findFirst().orElse(null);
            if (piece == null) {
                manquantes.add(new PieceManquantePrestationDto(ref.getId(), ref.getLibelle(), StatutPieceCnps.ATTENDUE));
            } else if (!piece.getStatut().estFournie()) {
                manquantes.add(new PieceManquantePrestationDto(ref.getId(), ref.getLibelle(), piece.getStatut()));
            }
        }
        return manquantes;
    }

    private DossierPrestationCnpsDto construireDto(DossierPrestationCnps dossier) {
        return construireDto(dossier, chargerIdentite(dossier.getAdherentId()));
    }

    private DossierPrestationCnpsDto construireDto(DossierPrestationCnps dossier, IdentiteAdherentCnps identite) {
        OffreCnps offre = offreRepository.findById(dossier.getOffreId())
                .orElseThrow(() -> new IllegalStateException("Offre CNPS introuvable pour le dossier " + dossier.getId()));

        Map<UUID, PieceOffreCnps> referentielParId = pieceOffreRepository
                .findByOffreIdOrderByOrdreAffichageAsc(offre.getId()).stream()
                .collect(Collectors.toMap(PieceOffreCnps::getId, p -> p));

        List<PieceDossierPrestationCnpsDto> pieces = pieceDossierRepository.findByDossierId(dossier.getId()).stream()
                .map(p -> {
                    PieceOffreCnps ref = referentielParId.get(p.getPieceOffreId());
                    return PieceDossierPrestationCnpsDto.depuis(p, ref != null ? ref.getLibelle() : "",
                            ref != null && ref.isObligatoire());
                })
                .toList();

        return DossierPrestationCnpsDto.depuis(dossier, identite.matricule(), identite.nomComplet(),
                identite.numeroCnps(), offre.getCode(), offre.getLibelle(), offre.getRubrique(), pieces,
                piecesManquantesInterne(dossier));
    }

    /** Identité affichable d'un adhérent — le DTO du dossier ne porte que son {@code adherentId}. */
    private record IdentiteAdherentCnps(String matricule, String nomComplet, String numeroCnps) {
    }

    private static final IdentiteAdherentCnps IDENTITE_INCONNUE = new IdentiteAdherentCnps(null, null, null);

    private static final String SQL_IDENTITE_ADHERENT = """
            SELECT a.matricule, a.nom, a.prenoms, COALESCE(a.numero_cnps, d.numero_immatriculation) AS numero_cnps
            FROM adherent a
            LEFT JOIN dossier_cnps d ON d.adherent_id = a.id
            WHERE a.id = ?
            """;

    private IdentiteAdherentCnps chargerIdentite(UUID adherentId) {
        return jdbcTemplate.query(SQL_IDENTITE_ADHERENT,
                        (rs, ligne) -> new IdentiteAdherentCnps(rs.getString("matricule"),
                                nomComplet(rs.getString("nom"), rs.getString("prenoms")), rs.getString("numero_cnps")),
                        adherentId)
                .stream().findFirst().orElse(IDENTITE_INCONNUE);
    }

    /** Même règle que {@code ServiceDossierCnpsImpl.nomComplet} : des prénoms absents n'affichent pas « null ». */
    private static String nomComplet(String nom, String prenoms) {
        return prenoms == null || prenoms.isBlank() ? nom : nom + " " + prenoms;
    }

    /**
     * Une requête par adhérent plutôt qu'une clause {@code IN} unique : le nombre de paramètres variables
     * d'une page à l'autre rendrait cette méthode difficile à isoler en test unitaire (chaque appel réel
     * utilise une seule requête à un paramètre fixe, comme {@link #chargerIdentite}). Le volume par page est
     * borné (pagination plafonnée à 200 lignes), le coût reste négligeable face à des requêtes indexées.
     */
    private Map<UUID, IdentiteAdherentCnps> chargerIdentites(List<UUID> adherentIds) {
        return adherentIds.stream().distinct().collect(Collectors.toMap(id -> id, this::chargerIdentite));
    }

    private DossierPrestationCnps charger(UUID id) {
        return dossierRepository.findById(id)
                .orElseThrow(() -> new ExceptionRessourceIntrouvable("CNPS_DOSSIER_PRESTATION_INTROUVABLE",
                        "Dossier de prestation CNPS introuvable."));
    }
}
