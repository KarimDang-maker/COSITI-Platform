package cm.cositi.api.securite.entite;

import jakarta.persistence.*;
import org.springframework.security.core.GrantedAuthority;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.userdetails.UserDetails;

import java.time.Instant;
import java.util.*;

@Entity
@Table(name = "utilisateur")
public class Utilisateur implements UserDetails {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @Column(name = "identifiant", unique = true, nullable = false, length = 80)
    private String identifiant;

    @Column(name = "email", unique = true, length = 160)
    private String email;

    @Column(name = "mot_de_passe_hash", nullable = false)
    private String motDePasseHash;

    @Column(name = "nom_complet", nullable = false, length = 160)
    private String nomComplet;

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

    @Column(name = "agent_id")
    private UUID agentId;

    @ManyToMany(fetch = FetchType.EAGER)
    @JoinTable(
        name = "utilisateur_role",
        joinColumns = @JoinColumn(name = "utilisateur_id"),
        inverseJoinColumns = @JoinColumn(name = "role_id")
    )
    private Set<Role> roles = new HashSet<>();

    public UUID getId() { return id; }
    public void setId(UUID id) { this.id = id; }
    public String getIdentifiant() { return identifiant; }
    public void setIdentifiant(String identifiant) { this.identifiant = identifiant; }
    public String getEmail() { return email; }
    public void setEmail(String email) { this.email = email; }
    public String getMotDePasseHash() { return motDePasseHash; }
    public void setMotDePasseHash(String motDePasseHash) { this.motDePasseHash = motDePasseHash; }
    public String getNomComplet() { return nomComplet; }
    public void setNomComplet(String nomComplet) { this.nomComplet = nomComplet; }
    public String getTelephone() { return telephone; }
    public void setTelephone(String telephone) { this.telephone = telephone; }
    public boolean isActif() { return actif; }
    public void setActif(boolean actif) { this.actif = actif; }
    public boolean isDoitChangerMotDePasse() { return doitChangerMotDePasse; }
    public void setDoitChangerMotDePasse(boolean doitChangerMotDePasse) { this.doitChangerMotDePasse = doitChangerMotDePasse; }
    public short getTentativesEchouees() { return tentativesEchouees; }
    public void setTentativesEchouees(short tentativesEchouees) { this.tentativesEchouees = tentativesEchouees; }
    public Instant getVerrouilleJusquA() { return verrouilleJusquA; }
    public void setVerrouilleJusquA(Instant verrouilleJusquA) { this.verrouilleJusquA = verrouilleJusquA; }
    public Instant getDerniereConnexionLe() { return derniereConnexionLe; }
    public void setDerniereConnexionLe(Instant derniereConnexionLe) { this.derniereConnexionLe = derniereConnexionLe; }
    public boolean isMfaActive() { return mfaActive; }
    public void setMfaActive(boolean mfaActive) { this.mfaActive = mfaActive; }
    public UUID getAgentId() { return agentId; }
    public void setAgentId(UUID agentId) { this.agentId = agentId; }
    public Set<Role> getRoles() { return roles; }
    public void setRoles(Set<Role> roles) { this.roles = roles; }

    @Override
    public Collection<? extends GrantedAuthority> getAuthorities() {
        Set<GrantedAuthority> authorities = new HashSet<>();
        for (Role role : roles) {
            authorities.add(new SimpleGrantedAuthority("ROLE_" + role.getCode()));
            for (Permission perm : role.getPermissions()) {
                authorities.add(new SimpleGrantedAuthority(perm.getCode()));
            }
        }
        return authorities;
    }

    @Override
    public String getPassword() { return motDePasseHash; }
    @Override
    public String getUsername() { return identifiant; }
    @Override
    public boolean isAccountNonExpired() { return true; }
    @Override
    public boolean isAccountNonLocked() {
        return verrouilleJusquA == null || Instant.now().isAfter(verrouilleJusquA);
    }
    @Override
    public boolean isCredentialsNonExpired() { return true; }
    @Override
    public boolean isEnabled() { return actif; }
}
