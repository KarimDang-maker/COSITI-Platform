package cm.cositi.api.adherent.service;

import cm.cositi.api.adherent.dto.AdherentDetailDto;
import cm.cositi.api.adherent.dto.CoordonneesAdherentDto;
import cm.cositi.api.adherent.dto.DossierAdherentDto;
import cm.cositi.api.adherent.dto.DossierCompletAdherentDto;
import cm.cositi.api.adherent.repository.ActiviteRepository;
import cm.cositi.api.adherent.repository.AssociationRepository;
import cm.cositi.api.cotisation.dto.SyntheseCotisationsAdherentDto;
import cm.cositi.api.cotisation.service.ServiceSyntheseCotisations;
import cm.cositi.api.historique.CategorieHistorique;
import cm.cositi.api.historique.ServiceHistoriqueAdherent;
import cm.cositi.api.securite.entite.Utilisateur;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.ArrayList;
import java.util.List;
import java.util.UUID;

/**
 * Compose la vue complète du dossier à partir des services existants, chacun appliquant ses propres contrôles
 * (permission, périmètre). Les sections financières ne sont demandées que si le lecteur peut les lire : un lecteur
 * sans {@code PAIEMENT:LIRE} reçoit le dossier sans elles, pas un refus global.
 */
@Service
public class ServiceDossierCompletAdherent {

    private final ServiceAdherent serviceAdherent;
    private final ServiceSyntheseCotisations serviceSynthese;
    private final ServiceHistoriqueAdherent serviceHistorique;
    private final ActiviteRepository activiteRepository;
    private final AssociationRepository associationRepository;

    public ServiceDossierCompletAdherent(ServiceAdherent serviceAdherent, ServiceSyntheseCotisations serviceSynthese,
                                         ServiceHistoriqueAdherent serviceHistorique,
                                         ActiviteRepository activiteRepository,
                                         AssociationRepository associationRepository) {
        this.serviceAdherent = serviceAdherent;
        this.serviceSynthese = serviceSynthese;
        this.serviceHistorique = serviceHistorique;
        this.activiteRepository = activiteRepository;
        this.associationRepository = associationRepository;
    }

    @PreAuthorize("hasAuthority('ADHERENT:LIRE')")
    @Transactional(readOnly = true)
    public DossierCompletAdherentDto dossierComplet(UUID id, Utilisateur demandeur) {
        AdherentDetailDto a = serviceAdherent.consulter(id, demandeur); // périmètre vérifié ici
        DossierAdherentDto etat = serviceAdherent.dossier(id, demandeur);
        CoordonneesAdherentDto coordonnees = serviceAdherent.coordonnees(id, demandeur);

        List<String> avertissements = new ArrayList<>(etat.avertissements());
        SyntheseCotisationsAdherentDto cotisations = null;
        if (possede(demandeur, "PAIEMENT:LIRE")) {
            cotisations = serviceSynthese.synthese(id, demandeur);
        } else {
            avertissements.add("Comptes et cotisations non affichés : vos permissions ne couvrent pas la lecture des "
                    + "cotisations.");
        }

        String activite = a.activiteId() == null ? null
                : activiteRepository.findById(a.activiteId()).map(x -> x.getLibelle()).orElse(null);
        String association = a.associationId() == null ? null
                : associationRepository.findById(a.associationId()).map(x -> x.getNom()).orElse(null);

        return new DossierCompletAdherentDto(a.id(), a.matricule(),
                new DossierCompletAdherentDto.Identite(a.nom(), a.prenoms(), a.dateNaissance(), a.sexe(),
                        a.numeroCni(), a.numeroCnps()),
                new DossierCompletAdherentDto.Professionnel(a.activiteId(), activite, a.associationId(), association,
                        a.numeroCnps()),
                coordonnees,
                new DossierCompletAdherentDto.EtatDossier(a.statut(), a.statutValidation(), a.statutControleDga(),
                        a.inscriptionPayee(), a.archive(), a.dateAdhesion(), a.activeLe(), a.zoneId(), a.zoneLibelle(),
                        etat.completionPourcentage(), etat.champsManquants(), etat.documentsManquants()),
                cotisations,
                new DossierCompletAdherentDto.Historique(
                        serviceHistorique.compter(id, CategorieHistorique.GENERAL, demandeur),
                        serviceHistorique.compter(id, CategorieHistorique.FINANCIER, demandeur),
                        "/api/v1/adherents/" + id + "/historique-general",
                        "/api/v1/adherents/" + id + "/historique-financier"),
                a.version(), avertissements);
    }

    private static boolean possede(Utilisateur utilisateur, String permission) {
        return utilisateur.getAuthorities().stream().anyMatch(x -> permission.equals(x.getAuthority()));
    }
}
