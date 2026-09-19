package cm.cositi.api.commun.reponse;

import java.time.Instant;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;

public class ReponseErreur {
    private Instant horodatage = Instant.now();
    private int statut;
    private String code;
    private String message;
    private String champ;
    private String traceId;
    private Map<String, String> details;
    private List<String> avertissements = new ArrayList<>();

    public ReponseErreur() {}

    public ReponseErreur(int statut, String code, String message, String traceId) {
        this.statut = statut;
        this.code = code;
        this.message = message;
        this.traceId = traceId;
    }

    public Instant getHorodatage() { return horodatage; }
    public void setHorodatage(Instant horodatage) { this.horodatage = horodatage; }
    public int getStatut() { return statut; }
    public void setStatut(int statut) { this.statut = statut; }
    public String getCode() { return code; }
    public void setCode(String code) { this.code = code; }
    public String getMessage() { return message; }
    public void setMessage(String message) { this.message = message; }
    public String getChamp() { return champ; }
    public void setChamp(String champ) { this.champ = champ; }
    public String getTraceId() { return traceId; }
    public void setTraceId(String traceId) { this.traceId = traceId; }
    public Map<String, String> getDetails() { return details; }
    public void setDetails(Map<String, String> details) { this.details = details; }
    public List<String> getAvertissements() { return avertissements; }
    public void setAvertissements(List<String> avertissements) { this.avertissements = avertissements; }
}
