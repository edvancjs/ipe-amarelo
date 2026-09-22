// CSV com quem se cadastrou pra falar no chat de uma sessão (nome/e-mail/
// telefone capturados no portão do chat) — um por pessoa (deduplicado por
// e-mail), com a data/hora do primeiro contato. Protegido por login, igual
// dados.js.

import { estaAutenticado, respostaNaoAutorizado } from "../../_lib/auth.js";
import { ultimaTercaISO } from "../../_lib/tempo.js";

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

function campoCsv(valor) {
  const s = (valor == null ? "" : String(valor)).replace(/"/g, '""');
  return `"${s}"`;
}

export async function onRequestGet(context) {
  const { request, env } = context;

  if (!env.CHAT_KV) {
    return new Response(JSON.stringify({ ok: false, error: "kv_nao_configurado" }), { status: 500 });
  }
  if (!(await estaAutenticado(request, env))) {
    return respostaNaoAutorizado();
  }

  const url = new URL(request.url);
  const sessaoAtual = ultimaTercaISO();
  const sessao = url.searchParams.get("sessao") || sessaoAtual;

  const chavesMsg = await listarTudoComPrefixo(env, `msg:${sessao}:`);
  const mensagens = chavesMsg
    .map((k) => k.metadata)
    .filter(Boolean)
    .sort((a, b) => new Date(a.criadoEm) - new Date(b.criadoEm));

  const porEmail = new Map();
  for (const m of mensagens) {
    if (!m.email) continue;
    if (!porEmail.has(m.email)) {
      porEmail.set(m.email, { nome: m.nome || "", email: m.email, telefone: m.telefone || "", primeiroContatoEm: m.criadoEm });
    }
  }

  const linhas = [["nome", "email", "telefone", "primeiro_contato_em"].map(campoCsv).join(",")];
  for (const p of porEmail.values()) {
    linhas.push([p.nome, p.email, p.telefone, p.primeiroContatoEm].map(campoCsv).join(","));
  }
  const csv = "﻿" + linhas.join("\r\n"); // BOM pra Excel abrir acentuação certa

  return new Response(csv, {
    status: 200,
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="chat-${sessao}.csv"`,
    },
  });
}
