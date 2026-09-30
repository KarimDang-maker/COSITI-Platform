package cm.cositi.api.securite.entite;

import cm.cositi.api.commun.entite.EntiteAuditable;
import cm.cositi.api.commun.validation.DonneeSensible;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.FetchType;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.JoinTable;
import jakarta.persistence.ManyToMany;
import jakarta.persistence.Table;
import jakarta.persistence.Transient;
import jakarta.persistence.Version;
import org.springframework.security.core.GrantedAuthority;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.userdetails.UserDetails;

import java.time.Instant;
import java.util.Collection;
import java.util.HashSet;
import java.util.Set;
import java.util.UUID;
import java.util.stream.Collectors;
import java.util.stream.Stream;

/**
 * Porte à la fois le modèle de persistance et le contrat {@link UserDetails} de Spring Security :
 * c'est le principal placé dans le {@code SecurityContext} après authentification par JWT
 * (voir {@code FiltreJwt}).
 */
@Entity
@Table(name = "utilisateur")
public class Utilisateur extends EntiteAuditable implements UserDetails {

    @Column(name = "identifiant", nullable = false, unique = true, length = 80)
    private String identifiant;

    @Column(name = "email", unique = true, length = 160)
    private String email;

    @Column(name = "mot_de_passe_hash", nullable = false, length = 255)
    private String motDePasseHash;

    @Column(name = "nom_complet", nullable = false, length = 160)
    private String nomComplet;

    @DonneeSensible
    @Column(name = "telephone", length = 20)
    private String telephone;

    @Column(name = "actif", nullable = false)
    private boolean actif = true;

    @Column(name = "doit_changer_mot_de_passe", nullable = false)
    private boolean doitChangerMotDePasse = true;

    @Column(name = "tentatives_echouees", nullable = false)
    private short tentativesEchouees = 0;

    @Column(name = "verrouille_jusqu_a")
    private Instant verrouilleJusquA;

    @Column(name = "derniere_connexion_le")
    private Instant derniereConnexionLe;

    @Column(name = "mfa_active", nullable = false)
    private boolean mfaActive = false;

    @Column(name = "mfa_secret_chiffre")
    private byte[] mfaSecretChiffre;

    /** Référence brute vers agent(id) — pas de relation JPA directe pour préserver l'indépendance des modules. */
    @Column(name = "agent_id")
    private UUID agentId;

    @Version
    @Column(name = "version", nullable = false)
    private Long version;

    @ManyToMany(fetch = FetchType.EAGER)
    @JoinTable(
            name = "utilisateur_role",
            joinColumns = @JoinColumn(name = "utilisateur_id"),
            inverseJoinColumns = @JoinColumn(name = "role_id")
    )
    private Set<Role> roles = new HashSet<>();

    protected Utilisateur() {
    }

    public Utilisateur(String identifiant, String motDePasseHash, String nomComplet) {
        this.identifiant = identifiant;
        this.motDePasseHash = motDePasseHash;
        this.nomComplet = nomComplet;
    }

    public String getIdentifiant() {
        return identifiant;
    }

    public void setIdentifiant(String identifiant) {
        this.identifiant = identifiant;
    }

    public String getEmail() {
        return email;
    }

    public void setEmail(String email) {
        this.email = email;
    }

    public String getMotDePasseHash() {
        return motDePasseHash;
    }

    public void setMotDePasseHash(String motDePasseHash) {
        this.motDePasseHash = motDePasseHash;
    }

    public String getNomComplet() {
        return nomComplet;
    }

    public void setNomComplet(String nomComplet) {
        this.nomComplet = nomComplet;
    }

    public String getTelephone() {
        return telephone;
    }

    public void setTelephone(String telephone) {
        this.telephone = telephone;
    }

    public boolean isActif() {
        return actif;
    }

    public void setActif(boolean actif) {
        this.actif = actif;
    }

    public boolean isDoitChangerMotDePasse() {
        return doitChangerMotDePasse;
    }

    public void setDoitChangerMotDePasse(boolean doitChangerMotDePasse) {
        this.doitChangerMotDePasse = doitChangerMotDePasse;
    }

    public short getTentativesEchouees() {
        return tentativesEchouees;
    }

    public void setTentativesEchouees(short tentativesEchouees) {
        this.tentativesEchouees = tentativesEchouees;
    }

    public Instant getVerrouilleJusquA() {
        return verrouilleJusquA;
    }

    public void setVerrouilleJusquA(Instant verrouilleJusquA) {
        this.verrouilleJusquA = verrouilleJusquA;
    }

    public boolean estVerrouille() {
        return verrouilleJusquA != null && verrouilleJusquA.isAfter(Instant.now());
    }

    public Instant getDerniereConnexionLe() {
        return derniereConnexionLe;
    }

    public void setDerniereConnexionLe(Instant derniereConnexionLe) {
        this.derniereConnexionLe = derniereConnexionLe;
    }

    public boolean isMfaActive() {
        return mfaActive;
    }

    public UUID getAgentId() {
        return agentId;
    }

    public void setAgentId(UUID agentId) {
        this.agentId = agentId;
    }

    public Long getVersion() {
        return version;
    }

    public Set<Role> getRoles() {
        return roles;
    }

    public void ajouterRole(Role role) {
        this.roles.add(role);
    }

    public void retirerRole(Role role) {
        this.roles.remove(role);
    }

    public boolean possedeRole(String code) {
        return roles.stream().anyMatch(r -> r.getCode().equals(code));
    }

    // --- Contrat UserDetails ---

    @Override
    @Transient
    public Collection<? extends GrantedAuthority> getAuthorities() {
        Stream<String> codesPermissions = roles.stream()
                .flatMap(r -> r.getPermissions().stream())
                .map(p -> p.getCode());
        Stream<String> codesRoles = roles.stream().map(r -> "ROLE_" + r.getCode());
        return Stream.concat(codesPermissions, codesRoles)
                .distinct()
                .map(SimpleGrantedAuthority::new)
                .collect(Collectors.toSet());
    }

    @Override
    public String getPassword() {
        return motDePasseHash;
    }

    @Override
    public String getUsername() {
        return identifiant;
    }

    @Override
    public boolean isAccountNonExpired() {
        return true;
    }

    @Override
    public boolean isAccountNonLocked() {
        return !estVerrouille();
    }

    @Override
    public boolean isCredentialsNonExpired() {
        return true;
    }

    @Override
    public boolean isEnabled() {
        return actif;
    }
}
