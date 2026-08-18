// Repassa o lead da landing page pro webhook genérico do Never Lose Sales.
// Roda no servidor (Cloudflare Pages Functions), não no navegador — evita
// o bloqueio de CORS do backend do NLS e mantém a chave fora do código
// visível ao visitante.

const NLS_WEBHOOK_URL =
  "https://serviconeverlose.space/api/webhooks/generic?source=masterclass-2508-circulo-de-mulheres&key=whk_07165beac5b941d59f558a2a48543f23";

export async function onRequestPost(context) {
  const { request } = context;

  let data;
  try {
    data = await request.json();
  } catch (e) {
    return new Response(JSON.stringify({ ok: false, error: "invalid_json" }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }

  const name = (data.name || "").toString().trim();
  const email = (data.email || "").toString().trim();
  const phone = (data.phone || "").toString().trim();

  const nlsPayload = {
    event: "lead_masterclass_circulo_mulheres",
    clientId: "ipe-amarelo-masterclass-2508",
    name,
    email,
    phone,
    product: {
      name: "MasterClass: Como Curar o Seu Feminino Ferido",
    },
    timestamp: new Date().toISOString(),
  };

  try {
    const nlsResponse = await fetch(NLS_WEBHOOK_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(nlsPayload),
    });

    return new Response(JSON.stringify({ ok: nlsResponse.ok }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (e) {
    return new Response(JSON.stringify({ ok: false, error: String(e) }), {
      status: 502,
      headers: { "Content-Type": "application/json" },
    });
  }
}
