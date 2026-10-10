package cm.cositi.api.administration.service;

import cm.cositi.api.administration.dto.ChangementActivationDto;
import cm.cositi.api.administration.dto.ChangementRolesDto;
import cm.cositi.api.administration.dto.CreationUtilisateurDto;
import cm.cositi.api.administration.dto.ModificationParametreDto;
import cm.cositi.api.administration.dto.ModificationUtilisateurDto;
import cm.cositi.api.administration.dto.ParametreDto;
import cm.cositi.api.administration.dto.RoleDto;
import cm.cositi.api.administration.dto.UtilisateurAdminDto;
import cm.cositi.api.administration.entite.HistoriqueRoleUtilisateur;
import cm.cositi.api.administration.repository.HistoriqueRoleUtilisateurRepository;
import cm.cositi.api.audit.ServiceAudit;
import cm.cositi.api.audit.TypeOperation;
import cm.cositi.api.commun.exception.ExceptionAutorisation;
import cm.cositi.api.commun.exception.ExceptionConflit;
import cm.cositi.api.commun.exception.ExceptionRessourceIntrouvable;
import cm.cositi.api.commun.exception.ExceptionValidation;
import cm.cositi.api.commun.reponse.ReponsePaginee;
import cm.cositi.api.parametre.Parametre;
import cm.cositi.api.parametre.ParametreRepository;
import cm.cositi.api.securite.entite.Permission;
import cm.cositi.api.securite.entite.Role;
import cm.cositi.api.securite.entite.Utilisateur;
import cm.cositi.api.securite.repository.RoleRepository;
import cm.cositi.api.securite.repository.UtilisateurRepository;
import org.springframework.data.domain.Page;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.data.domain.Pageable;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.security.SecureRandom;
import java.time.Instant;
import java.util.Comparator;
import java.util.HashSet;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Set;
import java.util.UUID;

/**
 * Administration des comptes, rôles et paramètres (jalon J11).
 *
 * <p><b>Trois garde-fous</b>, tous vérifiés par des tests :</p>
 * <ul>
 *   <li><b>on ne se désactive pas soi-même</b>, et on ne retire pas son propre rôle d'administration :
 *       une plateforme dont plus personne ne peut administrer les comptes est un incident d'exploitation,
 *       pas une opération réussie ;</li>
 *   <li><b>les rôles sont fermés</b> — seuls les huit rôles de {@code Roles des acteurs.md §2} existent, et
 *       attribuer un code inconnu est refusé plutôt que créé à la volée ;</li>
 *   <li><b>aucun mot de passe n'est choisi par l'administrateur</b> : il est généré et révélé une seule
 *       fois, comme pour l'ajout d'un agent par la DGA (J3). Laisser l'administrateur choisir le mot de
 *       passe d'un autre compte en ferait un secret partagé dès sa création.</li>
 * </ul>
 */
@Service
public class ServiceAdministrationImpl implements ServiceAdministration {

    private static final String CARACTERES =
            "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789!@#$%";
    private static final int LONGUEUR_MOT_DE_PASSE = 16;
    private static final SecureRandom ALEATOIRE = new SecureRandom();

    private final UtilisateurRepository utilisateurRepository;
    private final RoleRepository roleRepository;
    private final ParametreRepository parametreRepository;
    private final HistoriqueRoleUtilisateurRepository historiqueRepository;
    private final PasswordEncoder encodeurMotDePasse;
    private final ServiceAudit serviceAudit;

    public ServiceAdministrationImpl(UtilisateurRepository utilisateurRepository, RoleRepository roleRepository,
                                      ParametreRepository parametreRepository,
                                      HistoriqueRoleUtilisateurRepository historiqueRepository,
                                      PasswordEncoder encodeurMotDePasse, ServiceAudit serviceAudit) {
        this.utilisateurRepository = utilisateurRepository;
        this.roleRepository = roleRepository;
        this.parametreRepository = parametreRepository;
        this.historiqueRepository = historiqueRepository;
        this.encodeurMotDePasse = encodeurMotDePasse;
        this.serviceAudit = serviceAudit;
    }

    // ------------------------------------------------------------------ Comptes

    @Override
    @PreAuthorize("hasAuthority('ADMINISTRATION:LIRE')")
    public ReponsePaginee<UtilisateurAdminDto> listerUtilisateurs(String recherche, Boolean actif,
                                                                   Pageable pageable) {
        Specification<Utilisateur> specification = Specification.where(null);
        if (recherche != null && !recherche.isBlank()) {
            String motif = "%" + recherche.trim().toLowerCase() + "%";
            specification = specification.and((racine, requete, cb) -> cb.or(
                    cb.like(cb.lower(racine.get("identifiant")), motif),
                    cb.like(cb.lower(racine.get("nomComplet")), motif)));
        }
        if (actif != null) {
            final boolean valeur = actif;
            specification = specification.and((racine, requete, cb) -> cb.equal(racine.get("actif"), valeur));
        }

        Page<Utilisateur> page = utilisateurRepository.findAll(specification, pageable);
        return ReponsePaginee.depuis(page.map(UtilisateurAdminDto::depuis));
    }

    @Override
    @PreAuthorize("hasAuthority('ADMINISTRATION:LIRE')")
    public UtilisateurAdminDto consulterUtilisateur(UUID utilisateurId) {
        return UtilisateurAdminDto.depuis(charger(utilisateurId));
    }

    @Override
    @PreAuthorize("hasAuthority('ADMINISTRATION:GERER')")
    @Transactional
    public CompteCree creerUtilisateur(CreationUtilisateurDto dto, Utilisateur auteur) {
        if (utilisateurRepository.existsByIdentifiant(dto.identifiant())) {
            throw new ExceptionConflit("UTILISATEUR_IDENTIFIANT_EXISTANT",
                    "Cet identifiant de connexion est déjà utilisé.");
        }
        Set<Role> roles = resoudreRoles(dto.roles());

        String motDePasseClair = genererMotDePasse();
        Utilisateur compte = new Utilisateur(dto.identifiant(), encodeurMotDePasse.encode(motDePasseClair),
                dto.nomComplet());
        compte.setEmail(dto.email());
        compte.setTelephone(dto.telephone());
        // Le mot de passe initial est transitoire par construction : son détenteur doit le changer.
        compte.setDoitChangerMotDePasse(true);
        roles.forEach(compte::ajouterRole);
        compte = utilisateurRepository.save(compte);

        for (Role role : roles) {
            historiqueRepository.save(new HistoriqueRoleUtilisateur(compte.getId(), role.getCode(),
                    "ATTRIBUTION", auteur.getId(), "Création du compte"));
        }

        serviceAudit.tracer(TypeOperation.UTILISATEUR_CREATION, "utilisateur", compte.getId(), null,
                UtilisateurAdminDto.depuis(compte), "Créé par " + auteur.getIdentifiant());

        return new CompteCree(UtilisateurAdminDto.depuis(compte), motDePasseClair);
    }

    @Override
    @PreAuthorize("hasAuthority('ADMINISTRATION:GERER')")
    @Transactional
    public UtilisateurAdminDto modifierUtilisateur(UUID utilisateurId, ModificationUtilisateurDto dto,
                                                    Utilisateur auteur) {
        Utilisateur compte = charger(utilisateurId);
        UtilisateurAdminDto avant = UtilisateurAdminDto.depuis(compte);

        compte.setNomComplet(dto.nomComplet());
        compte.setEmail(dto.email());
        compte.setTelephone(dto.telephone());
        compte = utilisateurRepository.save(compte);

        serviceAudit.tracer(TypeOperation.UTILISATEUR_CREATION, "utilisateur", compte.getId(), avant,
                UtilisateurAdminDto.depuis(compte), "Modification par " + auteur.getIdentifiant());
        return UtilisateurAdminDto.depuis(compte);
    }

    @Override
    @PreAuthorize("hasAuthority('ADMINISTRATION:GERER')")
    @Transactional
    public UtilisateurAdminDto changerActivation(UUID utilisateurId, ChangementActivationDto dto,
                                                  Utilisateur auteur) {
        Utilisateur compte = charger(utilisateurId);

        if (!dto.actif() && compte.getId().equals(auteur.getId())) {
            throw new ExceptionValidation("ADMINISTRATION_AUTO_DESACTIVATION",
                    "Vous ne pouvez pas désactiver votre propre compte.");
        }
        if (!dto.actif() && estDernierAdministrateurActif(compte)) {
            throw new ExceptionConflit("ADMINISTRATION_DERNIER_ADMIN",
                    "Ce compte est le dernier administrateur actif : le désactiver rendrait la plateforme "
                            + "inadministrable.");
        }

        boolean avant = compte.isActif();
        compte.setActif(dto.actif());
        compte = utilisateurRepository.save(compte);

        serviceAudit.tracer(TypeOperation.UTILISATEUR_DESACTIVATION, "utilisateur", compte.getId(), avant,
                dto.actif(), dto.motif());
        return UtilisateurAdminDto.depuis(compte);
    }

    @Override
    @PreAuthorize("hasAuthority('ADMINISTRATION:GERER')")
    @Transactional
    public UtilisateurAdminDto changerRoles(UUID utilisateurId, ChangementRolesDto dto, Utilisateur auteur) {
        Utilisateur compte = charger(utilisateurId);
        Set<Role> cibles = resoudreRoles(dto.roles());

        boolean perdSonAdministration = compte.getId().equals(auteur.getId())
                && compte.possedeRole("SUPER_ADMIN")
                && cibles.stream().noneMatch(r -> "SUPER_ADMIN".equals(r.getCode()));
        if (perdSonAdministration) {
            throw new ExceptionValidation("ADMINISTRATION_AUTO_RETRAIT",
                    "Vous ne pouvez pas retirer votre propre rôle d'administration.");
        }

        Set<String> avant = new LinkedHashSet<>(compte.getRoles().stream().map(Role::getCode).toList());
        Set<String> apres = new LinkedHashSet<>(cibles.stream().map(Role::getCode).toList());

        // Retraits puis attributions, chacun historisé avec son motif : un changement d'habilitation est une
        // décision, l'historique doit en garder la raison et pas seulement la trace.
        for (Role role : new HashSet<>(compte.getRoles())) {
            if (!apres.contains(role.getCode())) {
                compte.retirerRole(role);
                historiqueRepository.save(new HistoriqueRoleUtilisateur(compte.getId(), role.getCode(),
                        "RETRAIT", auteur.getId(), dto.motif()));
            }
        }
        for (Role role : cibles) {
            if (!avant.contains(role.getCode())) {
                compte.ajouterRole(role);
                historiqueRepository.save(new HistoriqueRoleUtilisateur(compte.getId(), role.getCode(),
                        "ATTRIBUTION", auteur.getId(), dto.motif()));
            }
        }
        compte = utilisateurRepository.save(compte);

        serviceAudit.tracer(TypeOperation.ROLE_MODIFICATION, "utilisateur", compte.getId(), avant, apres,
                dto.motif());
        return UtilisateurAdminDto.depuis(compte);
    }

    @Override
    @PreAuthorize("hasAuthority('ADMINISTRATION:GERER')")
    @Transactional
    public String reinitialiserMotDePasse(UUID utilisateurId, Utilisateur auteur) {
        Utilisateur compte = charger(utilisateurId);

        String motDePasseClair = genererMotDePasse();
        compte.setMotDePasseHash(encodeurMotDePasse.encode(motDePasseClair));
        compte.setDoitChangerMotDePasse(true);
        // Déverrouille au passage : une réinitialisation laissée verrouillée ne servirait à rien.
        compte.setTentativesEchouees((short) 0);
        compte.setVerrouilleJusquA(null);
        utilisateurRepository.save(compte);

        // Le mot de passe n'apparaît nulle part dans la trace (docs/04_SECURITE.md §8).
        serviceAudit.tracer(TypeOperation.MOT_DE_PASSE_CHANGEMENT, "utilisateur", compte.getId(), null, null,
                "Réinitialisation par " + auteur.getIdentifiant());

        return motDePasseClair;
    }

    // ------------------------------------------------------------------ Rôles

    @Override
    @PreAuthorize("hasAuthority('ADMINISTRATION:LIRE')")
    public List<RoleDto> listerRoles() {
        return roleRepository.findAll().stream()
                .sorted(Comparator.comparing(Role::getCode))
                .map(role -> new RoleDto(role.getCode(), role.getLibelle(), role.getDescription(),
                        role.getPermissions().stream().map(Permission::getCode).sorted().toList()))
                .toList();
    }

    // ------------------------------------------------------------------ Paramètres

    @Override
    @PreAuthorize("hasAuthority('ADMINISTRATION:LIRE')")
    public List<ParametreDto> listerParametres() {
        return parametreRepository.findAll().stream()
                .sorted(Comparator.comparing(Parametre::getCle))
                .map(ParametreDto::depuis)
                .toList();
    }

    @Override
    @PreAuthorize("hasAuthority('PARAMETRE:MODIFIER')")
    @Transactional
    public ParametreDto modifierParametre(String cle, ModificationParametreDto dto, Utilisateur auteur) {
        Parametre parametre = parametreRepository.findByCle(cle)
                .orElseThrow(() -> new ExceptionRessourceIntrouvable("PARAMETRE_INTROUVABLE",
                        "Paramètre introuvable : " + cle));

        String avant = parametre.getValeur();
        validerSelonType(parametre, dto.valeur());

        parametre.setValeur(dto.valeur());
        parametre.setModifieLe(Instant.now());
        parametre.setModifiePar(auteur.getIdentifiant());
        parametreRepository.save(parametre);

        // Une règle métier ne change jamais sans trace : la valeur d'avant, celle d'après, et le motif.
        serviceAudit.tracer(TypeOperation.PARAMETRE_MODIFICATION, "parametre", parametre.getId(), avant,
                dto.valeur(), dto.motif());

        return ParametreDto.depuis(parametre);
    }

    // ------------------------------------------------------------------ Interne

    /**
     * Vérifie que la valeur correspond au type déclaré du paramètre. Un {@code DELAI_RETARD_JOURS} à
     * « trente » ferait échouer le calcul de régularité en pleine nuit, loin de l'écran qui l'a saisi.
     */
    private static void validerSelonType(Parametre parametre, String valeur) {
        try {
            switch (parametre.getTypeValeur()) {
                case "ENTIER" -> Integer.parseInt(valeur.trim());
                case "DECIMAL" -> new java.math.BigDecimal(valeur.trim());
                case "BOOLEEN" -> {
                    if (!"true".equalsIgnoreCase(valeur.trim()) && !"false".equalsIgnoreCase(valeur.trim())) {
                        throw new NumberFormatException("booléen attendu");
                    }
                }
                default -> {
                    // TEXTE et JSON : aucune contrainte de forme imposée ici.
                }
            }
        } catch (NumberFormatException e) {
            throw new ExceptionValidation("PARAMETRE_VALEUR_INVALIDE",
                    "La valeur ne correspond pas au type attendu (" + parametre.getTypeValeur() + ").", "valeur");
        }
    }

    /** Les huit rôles V1 sont fermés : un code inconnu est refusé, jamais créé à la volée. */
    private Set<Role> resoudreRoles(List<String> codes) {
        Set<Role> roles = new LinkedHashSet<>();
        for (String code : codes) {
            roles.add(roleRepository.findByCode(code)
                    .orElseThrow(() -> new ExceptionValidation("ROLE_INCONNU",
                            "Le rôle « " + code + " » n'existe pas. Les rôles de la V1 sont fermés.", "roles")));
        }
        if (roles.isEmpty()) {
            throw new ExceptionValidation("ROLE_REQUIS", "Un compte doit porter au moins un rôle.", "roles");
        }
        return roles;
    }

    private boolean estDernierAdministrateurActif(Utilisateur compte) {
        if (!compte.possedeRole("SUPER_ADMIN")) {
            return false;
        }
        long autresAdministrateurs = utilisateurRepository.findAll().stream()
                .filter(Utilisateur::isActif)
                .filter(u -> !u.getId().equals(compte.getId()))
                .filter(u -> u.possedeRole("SUPER_ADMIN"))
                .count();
        return autresAdministrateurs == 0;
    }

    private Utilisateur charger(UUID id) {
        return utilisateurRepository.findById(id)
                .orElseThrow(() -> new ExceptionRessourceIntrouvable("UTILISATEUR_INTROUVABLE",
                        "Compte introuvable."));
    }

    private static String genererMotDePasse() {
        StringBuilder sb = new StringBuilder(LONGUEUR_MOT_DE_PASSE);
        for (int i = 0; i < LONGUEUR_MOT_DE_PASSE; i++) {
            sb.append(CARACTERES.charAt(ALEATOIRE.nextInt(CARACTERES.length())));
        }
        return sb.toString();
    }
}
