package cm.cositi.api.securite.service;

import cm.cositi.api.securite.dto.ChangerMotDePasseDto;
import cm.cositi.api.securite.dto.JetonReponseDto;
import cm.cositi.api.securite.dto.ProfilDto;
import cm.cositi.api.securite.entite.Utilisateur;

public interface ServiceAuthentification {

    JetonReponseDto connecter(String identifiant, String motDePasse, String adresseIp, String userAgent);

    JetonReponseDto rafraichir(String jetonRafraichissement, String adresseIp, String userAgent);

    void deconnecter(String jetonRafraichissement, Utilisateur utilisateurCourant);

    void changerMotDePasse(Utilisateur utilisateurCourant, ChangerMotDePasseDto dto);

    ProfilDto profil(Utilisateur utilisateurCourant);
}
