package cm.cositi.api.audit;

import java.util.Map;
import java.util.UUID;

public interface ServiceAudit {

    void tracer(TypeOperation type, String entite, UUID entiteId, Object avant, Object apres, String motif);

    void tracerRefus(String entite, UUID entiteId, String permissionManquante);

    void tracerExport(String typeExport, Map<String, Object> filtres, int nbLignes);
}
