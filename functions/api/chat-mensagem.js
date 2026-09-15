// Salva mensagens do chat da Página de Transmissão num KV do Cloudflare
// (binding "CHAT_KV", configurado no dashboard do projeto Pages).
// Cada mensagem fica sob uma chave prefixada pela terça-feira da sessão,
// pra dar pra listar/exportar por semana depois no painel.

import { ultimaTercaISO } from "../_lib/tempo.js";
import { garantirSessaoNoIndice } from "../_lib/sessoes.js";

export async function onRequestPost(context) {
  const { request, env } = context;

  if (!env.CHAT_KV) {
    return new Response(JSON.stringify({ ok: false, error: "kv_nao_configurado" }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }

  let data;
  try {
    data = await request.json();
  } catch (e) {
    return new Response(JSON.stringify({ ok: false, error: "invalid_json" }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }

  const tipo = (data.tipo || "mensagem").toString();
  const nome = (data.nome || "").toString().trim().slice(0, 100);
  const email = (data.email || "").toString().trim().slice(0, 200);
  const telefone = (data.telefone || "").toString().trim().slice(0, 40);
  const texto = (data.texto || "").toString().trim().slice(0, 500);
  const elapsedSeg = Number.isFinite(data.elapsedSeg) ? data.elapsedSeg : null;

  if (!nome || !email) {
    return new Response(JSON.stringify({ ok: false, error: "nome_ou_email_ausente" }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }

  const sessao = ultimaTercaISO();
  const agora = Date.now();
  const chave = `msg:${sessao}:${agora}:${Math.random().toString(36).slice(2, 8)}`;

  const registro = {
    tipo,
    nome,
    email,
    telefone,
    texto,
    elapsedSeg,
    sessao,
    criadoEm: new Date(agora).toISOString(),
  };

  try {
    // Grava o registro como metadata também — o painel consegue listar as
    // mensagens de uma sessão inteira com um único list(), sem precisar de
    // um get() por mensagem (mais rápido e mais barato).
    await env.CHAT_KV.put(chave, JSON.stringify(registro), { metadata: registro });
    context.waitUntil(garantirSessaoNoIndice(env, sessao));
    return new Response(JSON.stringify({ ok: true }), {
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
