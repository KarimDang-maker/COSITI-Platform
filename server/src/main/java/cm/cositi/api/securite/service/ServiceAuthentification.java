package cm.cositi.api.securite.service;

import cm.cositi.api.securite.dto.ChangerMotDePasseDto;
import cm.cositi.api.securite.dto.ConnexionReponseDto;
import cm.cositi.api.securite.dto.ConnexionRequeteDto;
import cm.cositi.api.securite.dto.UtilisateurMoiDto;
import cm.cositi.api.securite.entite.Utilisateur;

public interface ServiceAuthentification {
    ConnexionReponseDto connecter(ConnexionRequeteDto requete);
    ConnexionReponseDto rafraichir(String jetonRafraichissement);
    UtilisateurMoiDto getUtilisateurConnecte(Utilisateur utilisateur);
    void changerMotDePasse(Utilisateur utilisateur, ChangerMotDePasseDto dto);
}
