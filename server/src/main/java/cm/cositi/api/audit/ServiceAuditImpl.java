package cm.cositi.api.audit;

import com.fasterxml.jackson.databind.ObjectMapper;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Propagation;
import org.springframework.transaction.annotation.Transactional;

import java.util.Map;
import java.util.UUID;

@Service
public class ServiceAuditImpl implements ServiceAudit {

    private static final Logger log = LoggerFactory.getLogger(ServiceAuditImpl.class);
    private final JournalAuditRepository journalAuditRepository;
    private final ObjectMapper objectMapper;

    public ServiceAuditImpl(JournalAuditRepository journalAuditRepository, ObjectMapper objectMapper) {
        this.journalAuditRepository = journalAuditRepository;
        this.objectMapper = objectMapper;
    }

    @Override
    @Transactional(propagation = Propagation.REQUIRED)
    public void tracer(TypeOperation type, String entite, UUID entiteId,
                       Object avant, Object apres, String motif, String auteur) {
        JournalAudit entry = new JournalAudit();
        entry.setTypeOperation(type);
        entry.setEntite(entite);
        entry.setEntiteId(entiteId);
        entry.setUtilisateurIdentifiant(auteur);
        entry.setMotif(motif);
        entry.setResultat("SUCCES");

        try {
            if (avant != null) entry.setValeursAvant(objectMapper.writeValueAsString(avant));
            if (apres != null) entry.setValeursApres(objectMapper.writeValueAsString(apres));
        } catch (Exception e) {
            log.warn("Erreur lors de la sérialisation audit pour {}", entiteId, e);
        }

        journalAuditRepository.save(entry);
    }

    @Override
    @Transactional(propagation = Propagation.REQUIRED)
    public void tracerRefus(String entite, UUID entiteId, String permissionManquante, String auteur) {
        JournalAudit entry = new JournalAudit();
        entry.setTypeOperation(TypeOperation.ACCES_REFUSE);
        entry.setEntite(entite);
        entry.setEntiteId(entiteId);
        entry.setUtilisateurIdentifiant(auteur);
        entry.setMotif("Permission manquante: " + permissionManquante);
        entry.setResultat("REFUS");
        journalAuditRepository.save(entry);
    }

    @Override
    @Transactional(propagation = Propagation.REQUIRED)
    public void tracerExport(String typeExport, Map<String, Object> filtres, int nbLignes, String auteur) {
        JournalAudit entry = new JournalAudit();
        entry.setTypeOperation(TypeOperation.EXPORT_SENSIBLE);
        entry.setEntite("EXPORT");
        entry.setUtilisateurIdentifiant(auteur);
        entry.setMotif(String.format("Export %s de %d lignes", typeExport, nbLignes));
        entry.setResultat("SUCCES");
        try {
            entry.setValeursAvant(objectMapper.writeValueAsString(filtres));
        } catch (Exception ignored) {}
        journalAuditRepository.save(entry);
    }
}
