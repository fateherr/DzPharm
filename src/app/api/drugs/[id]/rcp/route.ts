import { NextRequest, NextResponse } from "next/server";
import ZAI from "z-ai-web-dev-sdk";
import { db } from "@/lib/db";
import {
  buildAiRcp,
  buildBookRcp,
  buildRegistryRcp,
  getMonoIndex,
  matchMonograph,
  normalizeKey,
  type Rcp,
} from "@/lib/rcp";

export const maxDuration = 120;

/**
 * GET /api/drugs/[id]/rcp — RCP du produit.
 * Stratégie: cache DB > fiche livre (764 monographies) > génération IA (cachée) > registre.
 * Query: ?refresh=1 pour forcer la régénération.
 */
export async function GET(
  req: NextRequest,
  ctx: { params: Promise<{ id: string }> }
) {
  try {
    const { id: idRaw } = await ctx.params;
    const id = Number(idRaw);
    if (!Number.isInteger(id) || id <= 0) {
      return NextResponse.json({ error: "Identifiant invalide" }, { status: 400 });
    }
    const refresh = req.nextUrl.searchParams.get("refresh") === "1";

    const drug = await db.drug.findUnique({ where: { id } });
    if (!drug) {
      return NextResponse.json({ error: "Médicament introuvable" }, { status: 404 });
    }

    // 1) cache
    if (!refresh) {
      const cached = await db.rcp.findUnique({ where: { drugId: id } });
      if (cached) {
        let content: Rcp;
        try {
          content = JSON.parse(cached.content) as Rcp;
        } catch {
          content = null as unknown as Rcp;
        }
        if (content?.sections?.length) {
          return NextResponse.json(content);
        }
      }
    }

    const save = async (rcp: Rcp) => {
      try {
        await db.rcp.upsert({
          where: { drugId: id },
          update: {
            source: rcp.source,
            dciKey: normalizeKey(drug.dciKey ?? drug.dci ?? ""),
            content: JSON.stringify(rcp),
          },
          create: {
            drugId: id,
            source: rcp.source,
            dciKey: normalizeKey(drug.dciKey ?? drug.dci ?? ""),
            content: JSON.stringify(rcp),
          },
        });
      } catch (e) {
        console.error("[api/drugs/rcp] cache save failed", e);
      }
      return rcp;
    };

    // 2) fiche livre
    const index = await getMonoIndex();
    if (index) {
      const mono = matchMonograph(index, drug.dciKey ?? drug.dci);
      if (mono) {
        const rcp = buildBookRcp(drug, mono);
        if (rcp.sections.length >= 8) {
          return NextResponse.json(await save(rcp));
        }
      }
    }

    // 3) génération IA (à la demande, mise en cache)
    try {
      const zai = await ZAI.create();
      const sys = `Tu es un rédacteur de RCP (Résumé des Caractéristiques du Produit, format ANSM français) pour DzPharm, la plateforme pharmaceutique algérienne.
Génère le RCP du médicament décrit ci-dessous. Réponds STRICTEMENT en JSON valide (aucun texte hors JSON).

Format attendu:
{"sections":[{"num":"4.1","title":"Indications thérapeutiques","items":[{"label":"optionnel","text":"..."}]}, ...]}

Sections OBLIGATOIRES dans cet ordre: 4.1 Indications thérapeutiques, 4.2 Posologie et mode d'administration, 4.3 Contre-indications, 4.4 Mises en garde spéciales et précautions d'emploi, 4.5 Interactions avec d'autres médicaments, 4.6 Fertilité, grossesse et allaitement, 4.8 Effets indésirables, 4.9 Surdosage, 5.1 Propriétés pharmacodynamiques, 5.2 Propriétés pharmacocinétiques, 6.2 Durée de conservation, 6.3 Précautions particulières de conservation.
Tu peux ajouter A (Spécialités équivalentes en Algérie), B (Conseils au comptoir) si pertinent.
Chaque section: 2 à 8 items concrets et précis (pharmacologie clinique réelle de la DCI). Texte en français professionnel. 3 à 5 items par section, textes de 15 à 200 caractères.`;

      const user = `Médicament (registre algérien):
- Marque: ${drug.brand ?? "?"}
- DCI: ${drug.dci ?? "?"}
- Forme: ${drug.form ?? "?"} | Dosage: ${drug.dosage ?? "?"}
- Conditionnement: ${drug.packaging ?? "?"}
- Laboratoire: ${drug.lab ?? "?"} (${drug.country ?? "?"})
- Liste: ${drug.liste ?? "?"} | Statut: ${drug.status}
- Domaine thérapeutique: ${drug.domain ?? "?"}
- Classes pharmacologiques: ${drug.classes ?? "—"}

Rédige le RCP JSON de ce produit basé sur la pharmacologie clinique de sa DCI.`;

      const completion = await zai.chat.completions.create({
        messages: [
          { role: "assistant", content: sys },
          { role: "user", content: user },
        ],
        thinking: { type: "disabled" },
      });
      const raw = completion.choices?.[0]?.message?.content ?? "";
      const jsonMatch = raw.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0]) as { sections?: unknown };
        const rcp = buildAiRcp(drug, parsed?.sections);
        if (rcp) {
          return NextResponse.json(await save(rcp));
        }
      }
    } catch (e) {
      console.error("[api/drugs/rcp] AI generation failed", e);
    }

    // 4) repli registre
    const rcp = buildRegistryRcp(
      drug,
      "Aucune monographie clinique disponible pour cette DCI dans les livres techniques. Génération IA indisponible — seules les données réglementaires sont affichées."
    );
    return NextResponse.json(rcp); // pas de cache: permet une nouvelle tentative IA
  } catch (error) {
    console.error("[api/drugs/rcp]", error);
    return NextResponse.json(
      { error: "Erreur lors de la génération du RCP" },
      { status: 500 }
    );
  }
}
