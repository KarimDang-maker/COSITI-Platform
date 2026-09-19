package cm.cositi.api.commun.reponse;

import java.util.ArrayList;
import java.util.List;

public class ReponsePaginee<T> {
    private List<T> contenu;
    private int page;
    private int taille;
    private long totalElements;
    private int totalPages;
    private List<String> avertissements = new ArrayList<>();

    public ReponsePaginee() {}

    public ReponsePaginee(List<T> contenu, int page, int taille, long totalElements, int totalPages) {
        this.contenu = contenu;
        this.page = page;
        this.taille = taille;
        this.totalElements = totalElements;
        this.totalPages = totalPages;
    }

    public List<T> getContenu() { return contenu; }
    public void setContenu(List<T> contenu) { this.contenu = contenu; }
    public int getPage() { return page; }
    public void setPage(int page) { this.page = page; }
    public int getTaille() { return taille; }
    public void setTaille(int taille) { this.taille = taille; }
    public long getTotalElements() { return totalElements; }
    public void setTotalElements(long totalElements) { this.totalElements = totalElements; }
    public int getTotalPages() { return totalPages; }
    public void setTotalPages(int totalPages) { this.totalPages = totalPages; }
    public List<String> getAvertissements() { return avertissements; }
    public void setAvertissements(List<String> avertissements) { this.avertissements = avertissements; }
}
