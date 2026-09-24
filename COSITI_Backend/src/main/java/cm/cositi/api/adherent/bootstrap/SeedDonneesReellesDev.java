package cm.cositi.api.adherent.bootstrap;

import cm.cositi.api.adherent.entite.Activite;
import cm.cositi.api.adherent.entite.Adherent;
import cm.cositi.api.adherent.entite.Adhesion;
import cm.cositi.api.adherent.entite.Pack;
import cm.cositi.api.adherent.repository.ActiviteRepository;
import cm.cositi.api.adherent.repository.AdhesionRepository;
import cm.cositi.api.adherent.repository.AdherentRepository;
import cm.cositi.api.adherent.repository.PackRepository;
import cm.cositi.api.adherent.service.ServiceMatricule;
import cm.cositi.api.audit.ServiceAudit;
import cm.cositi.api.audit.TypeOperation;
import cm.cositi.api.cotisation.dto.PaiementDto;
import cm.cositi.api.cotisation.entite.Paiement;
import cm.cositi.api.cotisation.repository.PaiementRepository;
import cm.cositi.api.organisation.entite.Zone;
import cm.cositi.api.organisation.repository.ZoneRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.boot.ApplicationArguments;
import org.springframework.boot.ApplicationRunner;
import org.springframework.context.annotation.Profile;
import org.springframework.core.env.Environment;
import org.springframework.core.io.ClassPathResource;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import java.io.BufferedReader;
import java.io.IOException;
import java.io.InputStreamReader;
import java.math.BigDecimal;
import java.nio.charset.StandardCharsets;
import java.time.LocalDate;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;

/**
 * Import ponctuel des données réelles de suivi des adhésions/cotisations transmises par la COSITI
 * ({@code Conception/donnees.md}, issu de {@code COSITI_Suivi_Adherents LE VRAI.xlsx}) — pour disposer de
 * données réelles manipulables en développement, sur demande explicite de l'utilisateur.
 *
 * <p><b>Ce n'est pas une donnée fictive</b> (contrairement à {@link cm.cositi.api.securite.bootstrap.SeedComptesDemonstrationDev}) :
 * ce sont les 173 adhérents et 228 paiements réels de la coopérative, nettoyés d'un classeur Excel
 * (typos de date corrigées, noms rapprochés entre les deux feuilles sources — voir
 * {@code Conception/SUIVI_EXECUTION.md} pour le détail des corrections et des hypothèses assumées).</p>
 *
 * <p><b>Champs absents de la source, remplacés par un repli explicite et documenté</b> (jamais une valeur
 * inventée qui se ferait passer pour réelle) :</p>
 * <ul>
 *   <li>zone : aucune zone n'existe dans le classeur — zone {@code HISTORIQUE} créée si besoin ;</li>
 *   <li>activité/profession : non capturée à la source — code {@code AUTRE} (« Autre secteur informel »,
 *       déjà seedé en V2), jamais une classification inventée ;</li>
 *   <li>pack : la source ne distingue pas de pack par adhérent — {@code PACK_1000} appliqué uniformément,
 *       à corriger manuellement pack par pack si la vraie répartition est connue ;</li>
 *   <li>référence de transaction Mobile Money : jamais capturée à la source — {@code HIST-IMPORT-nnnn}
 *       (préfixe explicite, jamais confondu avec une vraie référence opérateur) ;</li>
 *   <li>mode de paiement « Non précisé » (premières lignes, reprises d'un rapport financier antérieur) :
 *       posé à {@code ESPECES}, hypothèse documentée ici et dans {@code SUIVI_EXECUTION.md}.</li>
 * </ul>
 *
 * <p>Statut des paiements importés : {@code A_CONTROLER} (jamais {@code VALIDE} directement, comme toute
 * saisie — AGENTS.md règle absolue). Un utilisateur DAF peut ainsi les valider depuis l'application réelle
 * pour exercer le workflow financier sur des données réelles.</p>
 *
 * <p>Double verrou dev/local uniquement, identique à {@code SeedComptesDemonstrationDev} : annotation
 * {@code @Profile} et vérification explicite du profil actif. Idempotent : l'existence de la zone
 * {@code HISTORIQUE} (créée uniquement par cet import) sert de marqueur — {@code Parametre} n'a
 * volontairement aucun constructeur public (AGENTS.md règle n°1 : les paramètres se seedent par migration
 * Flyway, jamais par code applicatif), donc pas de ligne {@code parametre} dédiée pour ce marqueur.</p>
 */
@Component
@Profile({"dev", "local"})
public class SeedDonneesReellesDev implements ApplicationRunner {

    private static final Logger LOG = LoggerFactory.getLogger(SeedDonneesReellesDev.class);
    private static final String CODE_ZONE = "HISTORIQUE";
    private static final String CODE_ACTIVITE = "AUTRE";
    private static final String CODE_PACK = "PACK_1000";
    private static final String LOCALISATION_INCONNUE = "Non précisé (import historique)";

    private final Environment environment;
    private final AdherentRepository adherentRepository;
    private final AdhesionRepository adhesionRepository;
    private final PaiementRepository paiementRepository;
    private final ZoneRepository zoneRepository;
    private final ActiviteRepository activiteRepository;
    private final PackRepository packRepository;
    private final ServiceMatricule serviceMatricule;
    private final ServiceAudit serviceAudit;
    private final org.springframework.jdbc.core.JdbcTemplate jdbcTemplate;

    public SeedDonneesReellesDev(Environment environment, AdherentRepository adherentRepository,
                                  AdhesionRepository adhesionRepository, PaiementRepository paiementRepository,
                                  ZoneRepository zoneRepository, ActiviteRepository activiteRepository,
                                  PackRepository packRepository, ServiceMatricule serviceMatricule,
                                  ServiceAudit serviceAudit, org.springframework.jdbc.core.JdbcTemplate jdbcTemplate) {
        this.environment = environment;
        this.adherentRepository = adherentRepository;
        this.adhesionRepository = adhesionRepository;
        this.paiementRepository = paiementRepository;
        this.zoneRepository = zoneRepository;
        this.activiteRepository = activiteRepository;
        this.packRepository = packRepository;
        this.serviceMatricule = serviceMatricule;
        this.serviceAudit = serviceAudit;
        this.jdbcTemplate = jdbcTemplate;
    }

    @Override
    @Transactional
    public void run(ApplicationArguments args) throws IOException {
        for (String profil : environment.getActiveProfiles()) {
            if ("prod".equalsIgnoreCase(profil)) {
                LOG.error("SeedDonneesReellesDev : profil 'prod' détecté — aucune donnée réelle importée par ce composant de développement.");
                return;
            }
        }

        if (zoneRepository.findByCode(CODE_ZONE).isPresent()) {
            return;
        }

        UUID zoneId = obtenirOuCreerZone();
        UUID activiteId = activiteRepository.findByCode(CODE_ACTIVITE)
                .map(Activite::getId)
                .orElseThrow(() -> new IllegalStateException("Activité " + CODE_ACTIVITE + " introuvable — migrations incomplètes."));
        UUID packId = packRepository.findByCode(CODE_PACK)
                .map(Pack::getId)
                .orElseThrow(() -> new IllegalStateException("Pack " + CODE_PACK + " introuvable — migrations incomplètes."));

        Map<Integer, UUID> adherentIdParNumero = importerAdherents(zoneId, activiteId, packId);
        int nbPaiements = importerPaiements(adherentIdParNumero);

        LOG.info("SeedDonneesReellesDev : {} adhérents et {} paiements réels importés (statut A_CONTROLER).",
                adherentIdParNumero.size(), nbPaiements);
    }

    private UUID obtenirOuCreerZone() {
        return zoneRepository.findByCode(CODE_ZONE).map(Zone::getId).orElseGet(() -> {
            Zone zone = new Zone(CODE_ZONE, "Zone historique (import Excel)", "Non précisé", "Non précisé");
            return zoneRepository.save(zone).getId();
        });
    }

    private Map<Integer, UUID> importerAdherents(UUID zoneId, UUID activiteId, UUID packId) throws IOException {
        Map<Integer, UUID> parNumero = new HashMap<>();
        List<String[]> lignes = lireCsv("dev-seed/adherents_reels.csv");
        for (String[] champs : lignes) {
            int num = Integer.parseInt(champs[0]);
            String nom = champs[1];
            String contact = champs[2];
            LocalDate dateInscription = LocalDate.parse(champs[3]);

            String matricule = serviceMatricule.genererProchain();
            Adherent adherent = new Adherent(matricule, nom,
                    contact.isBlank() ? "000000000" : contact, activiteId, zoneId,
                    LOCALISATION_INCONNUE, dateInscription);
            adherent = adherentRepository.save(adherent);

            Adhesion adhesion = new Adhesion(adherent.getId(), packId, dateInscription,
                    "Import historique (donnees.md)", null);
            adhesionRepository.save(adhesion);

            serviceAudit.tracer(TypeOperation.ADHERENT_CREATION, "adherent", adherent.getId(), null,
                    Map.of("matricule", matricule, "nom", nom),
                    "Import historique (Conception/donnees.md, profil dev/local uniquement).");

            parNumero.put(num, adherent.getId());
        }
        return parNumero;
    }

    private int importerPaiements(Map<Integer, UUID> adherentIdParNumero) throws IOException {
        List<String[]> lignes = lireCsv("dev-seed/paiements_reels.csv");
        int compte = 0;
        for (String[] champs : lignes) {
            int numAdherent = Integer.parseInt(champs[0]);
            LocalDate datePaiement = LocalDate.parse(champs[1]);
            BigDecimal montant = new BigDecimal(champs[2]);
            String modePaiement = champs[3];
            String reference = champs[4].isBlank() ? null : champs[4];

            UUID adherentId = adherentIdParNumero.get(numAdherent);
            if (adherentId == null) {
                LOG.warn("SeedDonneesReellesDev : adhérent n°{} introuvable pour un paiement — ligne ignorée.", numAdherent);
                continue;
            }

            Long valeurSequence = jdbcTemplate.queryForObject("SELECT nextval('seq_numero_recu')", Long.class);
            String numeroRecu = "REC-" + String.format("%06d", valeurSequence);

            Paiement paiement = new Paiement(adherentId, numeroRecu, datePaiement, montant, modePaiement,
                    reference, "COTISATION", null, null);
            paiement = paiementRepository.save(paiement);

            serviceAudit.tracer(TypeOperation.PAIEMENT_CREATION, "paiement", paiement.getId(), null,
                    PaiementDto.depuis(paiement),
                    "Import historique (Conception/donnees.md, profil dev/local uniquement) — statut A_CONTROLER, à valider dans l'application.");
            compte++;
        }
        return compte;
    }

    private List<String[]> lireCsv(String cheminClasspath) throws IOException {
        List<String[]> lignes = new java.util.ArrayList<>();
        try (BufferedReader lecteur = new BufferedReader(
                new InputStreamReader(new ClassPathResource(cheminClasspath).getInputStream(), StandardCharsets.UTF_8))) {
            String ligne = lecteur.readLine(); // en-tête ignoré
            while ((ligne = lecteur.readLine()) != null) {
                if (ligne.isBlank()) {
                    continue;
                }
                lignes.add(ligne.split(",", -1));
            }
        }
        return lignes;
    }
}
