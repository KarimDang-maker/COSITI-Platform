package cm.cositi.api.adherent.exception;

import cm.cositi.api.adherent.service.CandidatDoublon;
import cm.cositi.api.commun.exception.ExceptionConflit;

import java.util.List;

/** Doublon potentiel détecté et non confirmé — docs/03_SPECIFICATIONS_API.md §3 (409 + liste des candidats). */
public class ExceptionDoublonPotentiel extends ExceptionConflit {

    private final List<CandidatDoublon> candidats;

    public ExceptionDoublonPotentiel(List<CandidatDoublon> candidats) {
        super("ADHERENT_DOUBLON_POTENTIEL", "Un ou plusieurs adhérents similaires existent déjà.");
        this.candidats = candidats;
    }

    public List<CandidatDoublon> getCandidats() {
        return candidats;
    }
}
