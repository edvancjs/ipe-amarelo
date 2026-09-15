// Sinal de vida de quem está assistindo a Página de Transmissão agora mesmo.
// Cada aba manda um POST a cada ~20s com um id aleatório próprio (gerado no
// navegador, guardado em sessionStorage). A chave expira sozinha se o sinal
// parar de chegar — contar as chaves vivas = pessoas ao vivo de verdade,
// usado só no painel interno (o número público "👁" continua sendo simulado,
// de propósito, pra prova social). TTL fixo em 60s: é o mínimo que o KV do
// Cloudflare aceita (não dá pra usar menos), mesmo o heartbeat sendo a cada 20s.

import { ultimaTercaISO } from "../_lib/tempo.js";

export async function onRequestPost(context) {
  const { request, env } = context;

  if (!env.CHAT_KV) {
    return new Response(JSON.stringify({ ok: false }), { status: 500 });
  }

  let data;
  try {
    data = await request.json();
  } catch (e) {
    return new Response(JSON.stringify({ ok: false }), { status: 400 });
  }

  const viewerId = (data.viewerId || "").toString().trim().slice(0, 60);
  if (!viewerId) {
    return new Response(JSON.stringify({ ok: false, error: "viewerId_ausente" }), { status: 400 });
  }

  const sessao = ultimaTercaISO();
  await env.CHAT_KV.put(`presenca:${sessao}:${viewerId}`, "1", { expirationTtl: 60 });

  return new Response(JSON.stringify({ ok: true }), {
    status: 200,
    headers: { "Content-Type": "application/json" },
  });
}
