package cm.cositi.api.cnps;

import cm.cositi.api.audit.ServiceAudit;
import cm.cositi.api.audit.TypeOperation;
import cm.cositi.api.commun.exception.ExceptionConflit;
import cm.cositi.api.commun.exception.ExceptionRessourceIntrouvable;
import cm.cositi.api.securite.entite.Utilisateur;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.UUID;

@Service
@Transactional
public class ServiceDossierCnpsImpl implements ServiceDossierCnps {

    private final DossierCnpsRepository dossierCnpsRepository;
    private final PieceDossierCnpsRepository pieceDossierCnpsRepository;
    private final ServiceAudit serviceAudit;

    public ServiceDossierCnpsImpl(
            DossierCnpsRepository dossierCnpsRepository,
            PieceDossierCnpsRepository pieceDossierCnpsRepository,
            ServiceAudit serviceAudit) {
        this.dossierCnpsRepository = dossierCnpsRepository;
        this.pieceDossierCnpsRepository = pieceDossierCnpsRepository;
        this.serviceAudit = serviceAudit;
    }

    @Override
    public DossierCnps ouvrir(UUID adherentId, Utilisateur auteur) {
        if (dossierCnpsRepository.findByAdherentId(adherentId).isPresent()) {
            throw new ExceptionConflit("DOSSIER_CNPS_DEJA_EXISTANT", "Un dossier CNPS existe déjà pour cet adhérent.");
        }

        DossierCnps dossier = new DossierCnps();
        dossier.setAdherentId(adherentId);
        dossier.setStatut("INCOMPLET");
        dossier.setCreePar(auteur.getIdentifiant());

        dossier = dossierCnpsRepository.save(dossier);

        // Initialisation des pièces obligatoires par défaut
        creerPieceAttendue(dossier, "CNI_RECTO", true, auteur.getIdentifiant());
        creerPieceAttendue(dossier, "CNI_VERSO", true, auteur.getIdentifiant());
        creerPieceAttendue(dossier, "ACTE_NAISSANCE", true, auteur.getIdentifiant());
        creerPieceAttendue(dossier, "PHOTO_IDENTITE", true, auteur.getIdentifiant());

        serviceAudit.tracer(TypeOperation.CNPS_DOSSIER_CREATION, "DOSSIER_CNPS", dossier.getId(),
                null, dossier, "Ouverture dossier CNPS", auteur.getIdentifiant());

        return dossier;
    }

    @Override
    public PieceDossierCnps ajouterPiece(UUID dossierId, UUID documentId, String typePiece, Utilisateur auteur) {
        DossierCnps dossier = dossierCnpsRepository.findById(dossierId)
                .orElseThrow(() -> new ExceptionRessourceIntrouvable("Dossier CNPS", dossierId));

        PieceDossierCnps piece = pieceDossierCnpsRepository.findByDossierId(dossierId).stream()
                .filter(p -> p.getTypePiece().equalsIgnoreCase(typePiece))
                .findFirst()
                .orElseGet(() -> {
                    PieceDossierCnps p = new PieceDossierCnps();
                    p.setDossier(dossier);
                    p.setTypePiece(typePiece);
                    return p;
                });

        piece.setDocumentId(documentId);
        piece.setStatut("FOURNIE");
        piece.setCreePar(auteur.getIdentifiant());

        piece = pieceDossierCnpsRepository.save(piece);

        serviceAudit.tracer(TypeOperation.CNPS_PIECE_AJOUT, "PIECE_CNPS", piece.getId(),
                null, typePiece, "Ajout pièce justificative " + typePiece, auteur.getIdentifiant());

        // Si toutes les pièces obligatoires sont fournies, passer en PRET
        List<PieceDossierCnps> obligatoires = pieceDossierCnpsRepository.findByDossierId(dossierId).stream()
                .filter(PieceDossierCnps::isObligatoire)
                .toList();
        boolean toutFourni = obligatoires.stream().allMatch(p -> "FOURNIE".equals(p.getStatut()) || "VALIDEE".equals(p.getStatut()));
        if (toutFourni && "INCOMPLET".equals(dossier.getStatut())) {
            dossier.setStatut("PRET");
            dossierCnpsRepository.save(dossier);
        }

        return piece;
    }

    @Override
    public DossierCnps changerStatut(UUID dossierId, String nouveauStatut, String commentaire, Utilisateur auteur) {
        DossierCnps dossier = dossierCnpsRepository.findById(dossierId)
                .orElseThrow(() -> new ExceptionRessourceIntrouvable("Dossier CNPS", dossierId));

        String statutAvant = dossier.getStatut();
        dossier.setStatut(nouveauStatut);
        if ("REJETE".equals(nouveauStatut)) {
            dossier.setMotifRejet(commentaire);
        }
        dossierCnpsRepository.save(dossier);

        serviceAudit.tracer(TypeOperation.CNPS_CHANGEMENT_STATUT, "DOSSIER_CNPS", dossierId,
                statutAvant, nouveauStatut, commentaire, auteur.getIdentifiant());

        return dossier;
    }

    @Override
    @Transactional(readOnly = true)
    public List<PieceDossierCnps> piecesManquantes(UUID dossierId) {
        return pieceDossierCnpsRepository.findByDossierId(dossierId).stream()
                .filter(p -> p.isObligatoire() && "ATTENDUE".equals(p.getStatut()))
                .toList();
    }

    private void creerPieceAttendue(DossierCnps dossier, String type, boolean obligatoire, String auteur) {
        PieceDossierCnps piece = new PieceDossierCnps();
        piece.setDossier(dossier);
        piece.setTypePiece(type);
        piece.setObligatoire(obligatoire);
        piece.setStatut("ATTENDUE");
        piece.setCreePar(auteur);
        pieceDossierCnpsRepository.save(piece);
    }
}
