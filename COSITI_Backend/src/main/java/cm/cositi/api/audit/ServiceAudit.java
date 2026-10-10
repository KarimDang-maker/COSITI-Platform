package cm.cositi.api.audit;

import cm.cositi.api.securite.entite.Utilisateur;

import java.util.Map;
import java.util.UUID;

public interface ServiceAudit {

    void tracer(TypeOperation type, String entite, UUID entiteId, Object avant, Object apres, String motif);

    /**
     * Comme {@link #tracer}, au nom d'un acteur explicite. Pour les opérations qui précèdent l'authentification
     * (connexion, verrouillage) : le contexte de sécurité est alors anonyme et le journal aurait retenu
     * « anonymousUser » au lieu du compte concerné.
     */
    void tracerPour(Utilisateur acteur, TypeOperation type, String entite, UUID entiteId, Object avant, Object apres,
                    String motif);

    void tracerRefus(String entite, UUID entiteId, String permissionManquante);

    void tracerExport(String typeExport, Map<String, Object> filtres, int nbLignes);
}
