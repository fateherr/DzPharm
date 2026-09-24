import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { callGemini, GEMINI_MODEL } from "@/lib/gemini";
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
 * Stratégie: cache DB > fiche livre (764 monographies) > génération IA Gemini (mise en cache) > registre.
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

    // 3) génération IA via Gemini 3.8 Flash (à la demande, mise en cache)
    try {
      const sys = `Tu es un pharmacologue clinicien expert et rédacteur de RCP (format ANSM / Ministère de la Santé Algérien) pour DzPharm.
Génère le RCP officiel et la synthèse clinique de la molécule ci-dessous. Réponds STRICTEMENT en JSON valide (aucun texte hors JSON).

Format attendu:
{
  "summary": "Synthèse 30 secondes pour le comptoir : indication clé, posologie type, vigilance absolue.",
  "safety": {
    "pregnancy": "AUTORISE" | "PRECAUTION" | "DECONSEILLE" | "CONTRE-INDIQUE",
    "pregnancyLabel": "Texte court avis CRAT (ex: Utilisable si nécessaire au 2e trimestre)",
    "breastfeeding": "COMPATIBLE" | "SURVEILLANCE" | "A_EVITER",
    "driving": 0 | 1 | 2 | 3,
    "doping": true | false,
    "renalAlert": true | false
  },
  "sections": [
    {
      "num": "4.1",
      "title": "Indications thérapeutiques",
      "items": [{ "label": "optionnel", "text": "..." }]
    },
    ...
  ]
}

Sections OBLIGATOIRES dans cet ordre :
4.1 Indications thérapeutiques
4.2 Posologie et mode d'administration
4.3 Contre-indications
4.4 Mises en garde spéciales et précautions d'emploi
4.5 Interactions avec d'autres médicaments et autres formes d'interactions
4.6 Fertilité, grossesse et allaitement
4.8 Effets indésirables
4.9 Surdosage
5.1 Propriétés pharmacodynamiques
5.2 Propriétés pharmacocinétiques
6.2 Durée de conservation
6.3 Précautions particulières de conservation
A Annexe — Spécialités disponibles en Algérie
B Annexe — Conseils au comptoir officinal

Chaque section doit comporter 2 à 6 items réels, clairs et concrets en français médical professionnel.`;

      const user = `Médicament (registre officiel algérien) :
- Marque : ${drug.brand ?? "?"}
- DCI : ${drug.dci ?? "?"}
- Forme : ${drug.form ?? "?"} | Dosage : ${drug.dosage ?? "?"}
- Conditionnement : ${drug.packaging ?? "?"}
- Laboratoire détenteur : ${drug.lab ?? "?"} (${drug.country ?? "?"})
- Liste : ${drug.liste ?? "?"} | Statut : ${drug.status}
- Domaine thérapeutique : ${drug.domain ?? "?"}
- Classes : ${drug.classes ?? "—"}

Rédige le RCP JSON complet pour cette molécule.`;

      const raw = await callGemini(
        sys,
        [{ role: "user", parts: [{ text: user }] }],
        { temperature: 0.1, maxOutputTokens: 4000, model: GEMINI_MODEL }
      );

      const jsonMatch = raw.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0]) as {
          sections?: unknown;
          summary?: string;
          safety?: unknown;
        };
        const rcp = buildAiRcp(drug, parsed?.sections, parsed?.summary, parsed?.safety);
        if (rcp) {
          return NextResponse.json(await save(rcp));
        }
      }
    } catch (e) {
      console.error("[api/drugs/rcp] Gemini AI generation failed", e);
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
