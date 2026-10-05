import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { CarteSection } from "@/components/cositi/carte-section";
import { ChampFormulaire } from "@/components/cositi/champ-formulaire";
import { Alerte } from "@/components/cositi/alerte";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { useCoordonnees, useModifierCoordonnees } from "@/hooks/useAdherents";
import type { CoordonneesAdherent } from "@/api/adherents";
import { estErreurApi } from "@/api/erreurs";
import { formaterTelephone } from "@/lib/format";
import { LigneChamp } from "@/ecrans/adherents/fiche/LigneChamp";
import {
  nombreVersTexte,
  schemaCoordonnees,
  texteVersNombre,
  videVersNull,
  type ValeursCoordonnees,
} from "@/ecrans/adherents/schemas";

interface CarteCoordonneesProps {
  adherentId: string;
  peutModifier: boolean;
}

/**
 * Coordonnées (#31) en lecture, puis en édition explicite (#32). Ce qui s'affiche est ce que l'API
 * renvoie à ce demandeur : aucune donnée n'est reconstituée côté client.
 */
export function CarteCoordonnees({ adherentId, peutModifier }: CarteCoordonneesProps) {
  const { data, isLoading, isError, error } = useCoordonnees(adherentId);
  const [edition, setEdition] = useState(false);

  if (isLoading) {
    return (
      <CarteSection titre="Coordonnées">
        <Skeleton className="h-28 w-full" />
      </CarteSection>
    );
  }

  if (isError || !data) {
    return (
      <CarteSection titre="Coordonnées">
        <Alerte teinte="danger">
          <p>{estErreurApi(error) ? error.message : "Les coordonnées n'ont pas pu être chargées."}</p>
        </Alerte>
      </CarteSection>
    );
  }

  if (edition) {
    return <FormulaireCoordonnees adherentId={adherentId} initiales={data} onTerminer={() => setEdition(false)} />;
  }

  return (
    <CarteSection
      titre="Coordonnées"
      actions={
        peutModifier ? (
          <Button size="sm" variant="outline" onClick={() => setEdition(true)}>
            Modifier
          </Button>
        ) : undefined
      }
    >
      <dl className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <LigneChamp libelle="Téléphone principal" valeur={<span className="ref">{formaterTelephone(data.telephonePrincipal)}</span>} />
        <LigneChamp
          libelle="Téléphone secondaire"
          valeur={data.telephoneSecondaire ? <span className="ref">{formaterTelephone(data.telephoneSecondaire)}</span> : "—"}
        />
        <LigneChamp
          libelle="WhatsApp"
          valeur={data.whatsapp ? <span className="ref">{formaterTelephone(data.whatsapp)}</span> : "—"}
        />
        <LigneChamp libelle="E-mail" valeur={data.email ?? "—"} />
        <LigneChamp libelle="Numéro CNI" valeur={data.numeroCni ?? "—"} />
        <LigneChamp libelle="Localisation" valeur={data.localisation ?? "—"} />
        <LigneChamp libelle="Quartier" valeur={data.quartier ?? "—"} />
        <LigneChamp libelle="Ville" valeur={data.ville ?? "—"} />
        <LigneChamp
          libelle="Géolocalisation"
          valeur={data.latitude !== null && data.longitude !== null ? `${data.latitude}, ${data.longitude}` : "—"}
        />
      </dl>
    </CarteSection>
  );
}

function FormulaireCoordonnees({
  adherentId,
  initiales,
  onTerminer,
}: {
  adherentId: string;
  initiales: CoordonneesAdherent;
  onTerminer: () => void;
}) {
  const modifier = useModifierCoordonnees(adherentId);
  const [erreurServeur, setErreurServeur] = useState<string | null>(null);
  const {
    register,
    handleSubmit,
    setError,
    formState: { errors },
  } = useForm<ValeursCoordonnees>({
    resolver: zodResolver(schemaCoordonnees),
    defaultValues: {
      telephonePrincipal: initiales.telephonePrincipal,
      telephoneSecondaire: initiales.telephoneSecondaire ?? "",
      whatsapp: initiales.whatsapp ?? "",
      email: initiales.email ?? "",
      numeroCni: initiales.numeroCni ?? "",
      localisation: initiales.localisation ?? "",
      quartier: initiales.quartier ?? "",
      ville: initiales.ville ?? "",
      latitude: nombreVersTexte(initiales.latitude),
      longitude: nombreVersTexte(initiales.longitude),
    },
  });

  async function soumettre(valeurs: ValeursCoordonnees) {
    setErreurServeur(null);
    try {
      await modifier.mutateAsync({
        telephonePrincipal: valeurs.telephonePrincipal.trim(),
        telephoneSecondaire: videVersNull(valeurs.telephoneSecondaire),
        whatsapp: videVersNull(valeurs.whatsapp),
        email: videVersNull(valeurs.email),
        numeroCni: videVersNull(valeurs.numeroCni),
        localisation: valeurs.localisation.trim(),
        quartier: videVersNull(valeurs.quartier),
        ville: videVersNull(valeurs.ville),
        latitude: texteVersNombre(valeurs.latitude),
        longitude: texteVersNombre(valeurs.longitude),
      });
      toast.success("Coordonnées enregistrées.");
      onTerminer();
    } catch (e) {
      // Les valeurs saisies restent dans le formulaire : l'utilisateur corrige, il ne ressaisit pas.
      if (estErreurApi(e) && e.champ && e.champ in valeurs) {
        setError(e.champ as keyof ValeursCoordonnees, { message: e.message });
      } else {
        setErreurServeur(estErreurApi(e) ? e.message : "Les coordonnées n'ont pas pu être enregistrées.");
      }
    }
  }

  return (
    <form noValidate onSubmit={(e) => void handleSubmit(soumettre)(e)}>
      <CarteSection
        titre="Modifier les coordonnées"
        pied={
          <div className="flex w-full justify-end gap-2">
            <Button type="button" variant="outline" onClick={onTerminer} disabled={modifier.isPending}>
              Annuler
            </Button>
            <Button type="submit" disabled={modifier.isPending}>
              {modifier.isPending ? "Enregistrement…" : "Enregistrer"}
            </Button>
          </div>
        }
        contenuClassName="space-y-5"
      >
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
          <ChampFormulaire id="co-telephonePrincipal" libelle="Téléphone principal" obligatoire erreur={errors.telephonePrincipal?.message}>
            {(attributs) => <Input type="tel" {...attributs} {...register("telephonePrincipal")} />}
          </ChampFormulaire>
          <ChampFormulaire id="co-telephoneSecondaire" libelle="Téléphone secondaire" facultatif erreur={errors.telephoneSecondaire?.message}>
            {(attributs) => <Input type="tel" {...attributs} {...register("telephoneSecondaire")} />}
          </ChampFormulaire>
          <ChampFormulaire id="co-whatsapp" libelle="WhatsApp" facultatif erreur={errors.whatsapp?.message}>
            {(attributs) => <Input type="tel" {...attributs} {...register("whatsapp")} />}
          </ChampFormulaire>
          <ChampFormulaire id="co-email" libelle="E-mail" facultatif erreur={errors.email?.message}>
            {(attributs) => <Input type="email" autoComplete="off" {...attributs} {...register("email")} />}
          </ChampFormulaire>
          <ChampFormulaire id="co-numeroCni" libelle="Numéro CNI" facultatif erreur={errors.numeroCni?.message}>
            {(attributs) => <Input {...attributs} {...register("numeroCni")} />}
          </ChampFormulaire>
          <ChampFormulaire id="co-localisation" libelle="Localisation" obligatoire erreur={errors.localisation?.message}>
            {(attributs) => <Input {...attributs} {...register("localisation")} />}
          </ChampFormulaire>
          <ChampFormulaire id="co-quartier" libelle="Quartier" facultatif>
            {(attributs) => <Input {...attributs} {...register("quartier")} />}
          </ChampFormulaire>
          <ChampFormulaire id="co-ville" libelle="Ville" facultatif>
            {(attributs) => <Input {...attributs} {...register("ville")} />}
          </ChampFormulaire>
          <ChampFormulaire id="co-latitude" libelle="Latitude" facultatif erreur={errors.latitude?.message}>
            {(attributs) => <Input inputMode="decimal" {...attributs} {...register("latitude")} />}
          </ChampFormulaire>
          <ChampFormulaire id="co-longitude" libelle="Longitude" facultatif erreur={errors.longitude?.message}>
            {(attributs) => <Input inputMode="decimal" {...attributs} {...register("longitude")} />}
          </ChampFormulaire>
        </div>
        {erreurServeur && (
          <Alerte teinte="danger" titre="Enregistrement refusé">
            <p>{erreurServeur}</p>
          </Alerte>
        )}
      </CarteSection>
    </form>
  );
}
