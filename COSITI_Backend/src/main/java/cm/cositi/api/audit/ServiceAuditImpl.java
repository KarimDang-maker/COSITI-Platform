package cm.cositi.api.audit;

import cm.cositi.api.securite.entite.Utilisateur;
import com.fasterxml.jackson.databind.ObjectMapper;
import jakarta.servlet.http.HttpServletRequest;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.context.request.RequestContextHolder;
import org.springframework.web.context.request.ServletRequestAttributes;

import java.util.Map;
import java.util.UUID;

@Service
public class ServiceAuditImpl implements ServiceAudit {

    private final JournalAuditRepository repository;
    private final MasqueurDonnees masqueur;

    public ServiceAuditImpl(JournalAuditRepository repository, ObjectMapper objectMapper) {
        this.repository = repository;
        this.masqueur = new MasqueurDonnees(objectMapper);
    }

    @Override
    @Transactional
    public void tracer(TypeOperation type, String entite, UUID entiteId, Object avant, Object apres, String motif) {
        enregistrer(type, entite, entiteId, masqueur.versJsonMasque(avant), masqueur.versJsonMasque(apres), motif, "SUCCES");
    }

    @Override
    @Transactional
    public void tracerRefus(String entite, UUID entiteId, String permissionManquante) {
        enregistrer(TypeOperation.ACCES_REFUSE, entite, entiteId, null, null,
                "Permission manquante : " + permissionManquante, "REFUS");
    }

    @Override
    @Transactional
    public void tracerExport(String typeExport, Map<String, Object> filtres, int nbLignes) {
        enregistrer(TypeOperation.EXPORT_SENSIBLE, typeExport, null,
                null, masqueur.versJsonMasque(Map.of("filtres", filtres, "nbLignes", nbLignes)),
                null, "SUCCES");
    }

    private void enregistrer(TypeOperation type, String entite, UUID entiteId, String avant, String apres,
                              String motif, String resultat) {
        UUID utilisateurId = null;
        String identifiant = "SYSTEME";
        Authentication authentification = SecurityContextHolder.getContext().getAuthentication();
        if (authentification != null && authentification.isAuthenticated()
                && authentification.getPrincipal() instanceof Utilisateur utilisateur) {
            utilisateurId = utilisateur.getId();
            identifiant = utilisateur.getIdentifiant();
        } else if (authentification != null && authentification.getName() != null) {
            identifiant = authentification.getName();
        }

        String adresseIp = null;
        String userAgent = null;
        ServletRequestAttributes attributs = (ServletRequestAttributes) RequestContextHolder.getRequestAttributes();
        if (attributs != null) {
            HttpServletRequest requete = attributs.getRequest();
            adresseIp = requete.getRemoteAddr();
            userAgent = requete.getHeader("User-Agent");
        }

        repository.save(new JournalAudit(utilisateurId, identifiant, type, entite, entiteId,
                avant, apres, motif, adresseIp, userAgent, resultat));
    }
}
