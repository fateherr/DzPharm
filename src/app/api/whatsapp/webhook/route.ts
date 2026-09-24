import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { matchInteractions } from "@/lib/interaction-rules";

export const maxDuration = 60;

const VERIFY_TOKEN = process.env.WHATSAPP_VERIFY_TOKEN || "dzpharm_bot_verify_token_2026";
const WHATSAPP_API_TOKEN = process.env.WHATSAPP_API_TOKEN;
const WHATSAPP_PHONE_NUMBER_ID = process.env.WHATSAPP_PHONE_NUMBER_ID;

/**
 * GET — Vérification du Webhook Meta WhatsApp Business Cloud API
 */
export async function GET(req: NextRequest) {
  const searchParams = req.nextUrl.searchParams;
  const mode = searchParams.get("hub.mode");
  const token = searchParams.get("hub.verify_token");
  const challenge = searchParams.get("hub.challenge");

  if (mode === "subscribe" && token === VERIFY_TOKEN) {
    console.log("[WhatsApp Webhook Verified]");
    return new NextResponse(challenge, { status: 200 });
  }

  return NextResponse.json({ error: "Jeton de vérification invalide" }, { status: 403 });
}

/**
 * Traite un message entrant et génère la réponse clinique
 */
async function processMessage(userMessage: string): Promise<string> {
  const query = userMessage.trim().toLowerCase();

  // Menu d'aide
  if (query === "aide" || query === "help" || query === "menu" || query === "salut" || query === "bonjour") {
    return (
      `🟢 *DzPharm · Assistant Officinal WhatsApp*\n\n` +
      `Bienvenue sur le service officiel de consultation pharmaceutique algérienne (9 555 AMM).\n\n` +
      `*Commandes disponibles :*\n` +
      `• *Nom du médicament* (ex: _Augmentin_, _Doliprane_, _Daonil_) : Fiche produit, PPA et Chifa\n` +
      `• *Interactions* (ex: _Amoxicilline + Méthotrexate_) : Contrôle d'interactions médicamenteuses\n` +
      `• *Rupture* (ex: _Rupture Lovenox_) : État des signalements officinaux\n\n` +
      `_Service informatif réservé aux professionnels et patients — ne remplace pas l'avis médical._`
    );
  }

  // Contrôle d'interactions (présence d'un '+' ou du mot interaction)
  if (query.includes("+") || query.includes("interaction")) {
    const parts = query
      .replace(/interaction[s]?/gi, "")
      .split("+")
      .map((p) => p.trim())
      .filter((p) => p.length > 1);

    if (parts.length >= 2) {
      const rules = matchInteractions([
        { name: parts[0], dci: parts[0] },
        { name: parts[1], dci: parts[1] },
      ]);
      const report = rules[0];
      if (report) {
        return (
          `⚠️ *ALERTE INTERACTION DZPHARM*\n\n` +
          `*Association :* ${parts[0].toUpperCase()} + ${parts[1].toUpperCase()}\n` +
          `*Sévérité :* ${report.severity.toUpperCase()}\n\n` +
          `*Mécanisme :* ${report.mechanism}\n\n` +
          `*Conduite à tenir :* ${report.management}`
        );
      } else {
        return (
          `✅ *Contrôle d'Interactions DzPharm*\n\n` +
          `Aucune interaction majeure répertoriée entre *${parts[0].toUpperCase()}* et *${parts[1].toUpperCase()}* dans les règles de pharmacovigilance usuelles.\n\n` +
          `_Vérifiez toujours le RCP complet en cas de doute._`
        );
      }
    }
  }

  // Recherche d'un médicament dans le référentiel des 9 555 AMM
  const matched = await db.drug.findFirst({
    where: {
      OR: [
        { brand: { contains: query } },
        { dci: { contains: query } },
      ],
    },
    include: {
      pharmacyProducts: true,
    },
  });

  if (matched) {
    const statusLabel =
      matched.status === "ACTIF"
        ? "✅ AMM Valide (Actif)"
        : matched.status === "RETRIE"
        ? "❌ RETIRÉ DU MARCHÉ"
        : "⚠️ Enregistrement non renouvelé";

    const ppa = matched.pharmacyProducts[0]?.ppa
      ? `${matched.pharmacyProducts[0].ppa.toFixed(2)} DA`
      : "Tarif hospitalier ou non publié";

    const chifa = matched.pharmacyProducts[0]?.cnasId
      ? "✅ Remboursable Chifa (80% / 100%)"
      : "❌ Non remboursable";

    return (
      `💊 *${matched.brand}*\n` +
      `*DCI :* ${matched.dci}\n` +
      `*Dosage :* ${matched.dosage || "—"}\n` +
      `*Forme :* ${matched.form || "—"}\n` +
      `*Statut :* ${statusLabel}\n` +
      `*Laboratoire :* ${matched.lab} (${matched.country})\n` +
      `*Prix Public (PPA) :* ${ppa}\n` +
      `*Régime Chifa :* ${chifa}\n` +
      `*N° Enregistrement AMM :* ${matched.regNumber || "—"}\n\n` +
      `_Données officielles issues de la nomenclature MSPRH Juin 2026._`
    );
  }

  return (
    `🔍 Aucun médicament trouvé pour "*${userMessage}*".\n\n` +
    `Essayez avec le nom de marque ou la DCI (ex: _Paracétamol_, _Augmentin_, _Glucophage_).\n` +
    `Tapez *Aide* pour voir le menu.`
  );
}

/**
 * Envoie un message texte via l'API Graph WhatsApp Cloud
 */
async function sendWhatsAppMessage(recipientPhone: string, text: string) {
  if (!WHATSAPP_API_TOKEN || !WHATSAPP_PHONE_NUMBER_ID) {
    console.log(`[WhatsApp Bot Simulation] to ${recipientPhone}:\n${text}`);
    return;
  }

  try {
    await fetch(`https://graph.facebook.com/v20.0/${WHATSAPP_PHONE_NUMBER_ID}/messages`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${WHATSAPP_API_TOKEN}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        messaging_product: "whatsapp",
        recipient_type: "individual",
        to: recipientPhone,
        type: "text",
        text: { body: text },
      }),
    });
  } catch (err) {
    console.error("[WhatsApp Send Error]", err);
  }
}

/**
 * POST — Réception des événements de messages WhatsApp
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();

    const entry = body.entry?.[0];
    const changes = entry?.changes?.[0];
    const value = changes?.value;
    const message = value?.messages?.[0];

    if (message && message.type === "text") {
      const from = message.from;
      const text = message.text?.body || "";

      console.log(`[WhatsApp Received from ${from}]: ${text}`);
      const reply = await processMessage(text);
      await sendWhatsAppMessage(from, reply);
    }

    return NextResponse.json({ status: "EVENT_RECEIVED" }, { status: 200 });
  } catch (error) {
    console.error("[WhatsApp Webhook Error]", error);
    return NextResponse.json({ status: "ERROR" }, { status: 200 });
  }
}
