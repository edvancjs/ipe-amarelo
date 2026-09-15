// Dados do painel: lista de sessões (terças), mensagens da sessão escolhida,
// contagem de espectadores ao vivo (real, via presença) e métricas simples.
// Protegido por login — ver functions/_lib/auth.js.

import { estaAutenticado, respostaNaoAutorizado } from "../../_lib/auth.js";
import { ultimaTercaISO } from "../../_lib/tempo.js";
import { listarSessoes } from "../../_lib/sessoes.js";

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
  const { request, env } = context;

  if (!env.CHAT_KV) {
    return new Response(JSON.stringify({ ok: false, error: "kv_nao_configurado" }), { status: 500 });
  }
  if (!(await estaAutenticado(request, env))) {
    return respostaNaoAutorizado();
  }

  const url = new URL(request.url);
  const sessoes = await listarSessoes(env);
  const sessaoAtual = ultimaTercaISO();
  const sessaoPedida = url.searchParams.get("sessao");
  const sessaoSelecionada = sessaoPedida && sessoes.includes(sessaoPedida) ? sessaoPedida : (sessoes[0] || sessaoAtual);

  const chavesMsg = await listarTudoComPrefixo(env, `msg:${sessaoSelecionada}:`);
  const mensagens = chavesMsg
    .map((k) => k.metadata)
    .filter(Boolean)
    .sort((a, b) => new Date(a.criadoEm) - new Date(b.criadoEm));

  const emailsUnicos = new Set(mensagens.map((m) => m.email).filter(Boolean));
  const totalMensagens = mensagens.filter((m) => m.tipo === "mensagem").length;

  const chavesPresenca = sessaoSelecionada === sessaoAtual
    ? await listarTudoComPrefixo(env, `presenca:${sessaoAtual}:`)
    : [];

  return new Response(
    JSON.stringify({
      ok: true,
      sessoes,
      sessaoAtual,
      sessaoSelecionada,
      aoVivoAgora: chavesPresenca.length,
      totalLeads: emailsUnicos.size,
      totalMensagens,
      mensagens,
    }),
    { status: 200, headers: { "Content-Type": "application/json" } }
  );
}
