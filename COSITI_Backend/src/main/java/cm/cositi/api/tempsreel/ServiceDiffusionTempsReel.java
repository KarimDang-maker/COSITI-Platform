package cm.cositi.api.tempsreel;

import cm.cositi.api.securite.entite.Utilisateur;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.security.core.GrantedAuthority;
import org.springframework.stereotype.Service;
import org.springframework.web.servlet.mvc.method.annotation.SseEmitter;

import java.io.IOException;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.UUID;
import java.util.concurrent.CopyOnWriteArrayList;
import java.util.stream.Collectors;

/**
 * Registre des navigateurs abonnés au flux temps réel et diffusion des {@link EvenementTempsReel}.
 *
 * <p>Chaque abonné ne reçoit que les domaines qu'il a le droit de lire ({@link #PERMISSIONS_PAR_DOMAINE}) — les
 * permissions sont celles portées par son jeton à l'ouverture du flux. Le flux expire après
 * {@code cositi.temps-reel.duree-flux-ms} (par défaut 10 minutes, moins que la durée du jeton d'accès) : le
 * navigateur rouvre alors un flux avec un jeton frais, si bien qu'un compte désactivé ou dont les permissions ont
 * changé cesse d'être servi au plus tard à cette échéance.
 */
@Service
public class ServiceDiffusionTempsReel {

    private static final Logger JOURNAL = LoggerFactory.getLogger(ServiceDiffusionTempsReel.class);

    /** Un domaine est servi à l'abonné qui porte au moins une de ces permissions. */
    static final Map<String, Set<String>> PERMISSIONS_PAR_DOMAINE = Map.of(
            "adherent", Set.of("ADHERENT:LIRE"),
            "agent", Set.of("ORGANISATION:LIRE"),
            "paiement", Set.of("PAIEMENT:LIRE"),
            "bilan_caisse", Set.of("BILAN_CAISSE:LIRE"),
            "adhesion", Set.of("ADHERENT:LIRE", "FRAIS_ADHESION:LIRE", "CONTROLE_DGA:LIRE"),
            "workflow", Set.of("ADHERENT:LIRE", "ORGANISATION:LIRE", "PAIEMENT:LIRE")
    );

    private final List<Abonne> abonnes = new CopyOnWriteArrayList<>();
    private final long dureeFluxMs;
    private final int fluxMaxParUtilisateur;

    public ServiceDiffusionTempsReel(@Value("${cositi.temps-reel.duree-flux-ms:600000}") long dureeFluxMs,
                                     @Value("${cositi.temps-reel.flux-max-par-utilisateur:5}") int fluxMaxParUtilisateur) {
        this.dureeFluxMs = dureeFluxMs;
        this.fluxMaxParUtilisateur = fluxMaxParUtilisateur;
    }

    /** Ouvre un flux pour l'utilisateur authentifié. Au-delà du plafond par utilisateur, le plus ancien est fermé. */
    public SseEmitter abonner(Utilisateur utilisateur) {
        Set<String> permissions = utilisateur.getAuthorities().stream()
                .map(GrantedAuthority::getAuthority)
                .collect(Collectors.toUnmodifiableSet());
        SseEmitter emetteur = new SseEmitter(dureeFluxMs);
        Abonne abonne = new Abonne(utilisateur.getId(), permissions, emetteur);

        List<Abonne> siens = abonnes.stream().filter(a -> a.utilisateurId().equals(utilisateur.getId())).toList();
        for (int i = 0; i <= siens.size() - fluxMaxParUtilisateur; i++) {
            fermer(siens.get(i));
        }

        abonnes.add(abonne);
        emetteur.onCompletion(() -> abonnes.remove(abonne));
        emetteur.onTimeout(() -> fermer(abonne));
        emetteur.onError(e -> abonnes.remove(abonne));

        try {
            // Premier message immédiat : confirme l'ouverture et fixe le délai de reconnexion du navigateur.
            emetteur.send(SseEmitter.event().name("connecte").reconnectTime(5000).data("{}"));
        } catch (IOException e) {
            fermer(abonne);
        }
        return emetteur;
    }

    /** Diffuse l'événement à chaque abonné habilité à lire son domaine. Ne lève jamais d'exception. */
    public void diffuser(EvenementTempsReel evenement) {
        int servis = 0;
        for (Abonne abonne : abonnes) {
            if (!autorise(abonne.permissions(), evenement.domaine())) {
                continue;
            }
            try {
                abonne.emetteur().send(SseEmitter.event().name("changement").data(evenement));
                servis++;
            } catch (IOException | IllegalStateException e) {
                fermer(abonne);
            }
        }
        JOURNAL.debug("Temps réel {} {} : {} abonné(s) servi(s).", evenement.domaine(), evenement.typeChangement(), servis);
    }

    /**
     * Pousse un message nominatif (une notification) aux seuls flux de son destinataire. Contrairement à
     * {@link #diffuser}, le contenu est envoyé : il appartient à la personne qui le reçoit.
     */
    public void envoyerA(UUID utilisateurId, String nomEvenement, Object donnees) {
        for (Abonne abonne : abonnes) {
            if (!abonne.utilisateurId().equals(utilisateurId)) {
                continue;
            }
            try {
                abonne.emetteur().send(SseEmitter.event().name(nomEvenement).data(donnees));
            } catch (IOException | IllegalStateException e) {
                fermer(abonne);
            }
        }
    }

    /** Commentaire SSE périodique : maintient la connexion ouverte à travers les proxys et détecte les départs. */
    @Scheduled(fixedDelayString = "${cositi.temps-reel.battement-ms:25000}")
    public void battement() {
        for (Abonne abonne : abonnes) {
            try {
                abonne.emetteur().send(SseEmitter.event().comment("battement"));
            } catch (IOException | IllegalStateException e) {
                fermer(abonne);
            }
        }
    }

    /** Un domaine inconnu n'est servi à personne. */
    static boolean autorise(Set<String> permissions, String domaine) {
        return PERMISSIONS_PAR_DOMAINE.getOrDefault(domaine, Set.of()).stream().anyMatch(permissions::contains);
    }

    int nombreAbonnes() {
        return abonnes.size();
    }

    private void fermer(Abonne abonne) {
        abonnes.remove(abonne);
        try {
            abonne.emetteur().complete();
        } catch (IllegalStateException ignore) {
            // Déjà terminé.
        }
    }

    private record Abonne(UUID utilisateurId, Set<String> permissions, SseEmitter emetteur) {
    }
}
