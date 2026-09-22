// Lista as mensagens que a equipe mandou pelo painel interno pra sessão
// atual — endpoint público (sem login), lido pela Página de Transmissão pra
// mostrar esses avisos pra todo mundo assistindo ao vivo.

import { ultimaTercaISO } from "../_lib/tempo.js";

async function listarTudoComPrefixo(env, prefixo) {
  const itens = [];
  let cursor;
  do {
    const pagina = await env.CHAT_KV.list({ prefix: prefixo, cursor });
    itens.push(...pagina.keys);
    cursor = pagina.list_complete ? undefined : pagina.cursor;
  } while (cursor);
  return itens;
}

export async function onRequestGet(context) {
  const { env } = context;

  if (!env.CHAT_KV) {
    return new Response(JSON.stringify({ ok: false, mensagens: [] }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }

  const sessao = ultimaTercaISO();
  const chaves = await listarTudoComPrefixo(env, `admin-msg:${sessao}:`);
  const mensagens = chaves
    .map((k) => k.metadata)
    .filter(Boolean)
    .sort((a, b) => new Date(a.criadoEm) - new Date(b.criadoEm));

  return new Response(JSON.stringify({ ok: true, mensagens }), {
    status: 200,
    headers: { "Content-Type": "application/json" },
  });
}
