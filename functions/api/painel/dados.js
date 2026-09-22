// Dados do painel: lista de sessões (terças), mensagens da sessão escolhida,
// contagem de espectadores ao vivo (real, via presença) e métricas simples.
// Protegido por login — ver functions/_lib/auth.js.

import { estaAutenticado, respostaNaoAutorizado } from "../../_lib/auth.js";
import { ultimaTercaISO, minutoAposInicioSessao } from "../../_lib/tempo.js";
import { listarSessoes } from "../../_lib/sessoes.js";

// Precisa ficar em sincronia com OFERTA_EM_SEGUNDOS em transmissao.html (o
// momento em que a Anna solta o link do Círculo de Mulheres) — duplicado de
// propósito aqui pra este arquivo não depender do HTML da transmissão.
const OFERTA_EM_SEGUNDOS = 4740;

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

// Só retorna a contagem se existir um retrato a até 6min do alvo — senão o
// pitch ainda nem aconteceu nessa sessão (ou a sessão acabou antes dele).
function audienciaNoMinutoMaisProximo(serieOrdenada, minutoAlvo) {
  if (!serieOrdenada.length) return null;
  let melhor = null;
  let menorDiff = Infinity;
  for (const ponto of serieOrdenada) {
    const diff = Math.abs(new Date(ponto.minuto) - new Date(minutoAlvo));
    if (diff < menorDiff) {
      menorDiff = diff;
      melhor = ponto;
    }
  }
  if (!melhor || menorDiff > 6 * 60000) return null;
  return melhor.contagem;
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

  const [chavesSerie, picoBruto] = await Promise.all([
    listarTudoComPrefixo(env, `serie:${sessaoSelecionada}:`),
    env.CHAT_KV.get(`pico:${sessaoSelecionada}`),
  ]);

  const serieAudiencia = chavesSerie
    .map((k) => k.metadata)
    .filter(Boolean)
    .sort((a, b) => (a.minuto < b.minuto ? -1 : a.minuto > b.minuto ? 1 : 0));

  const picoAoVivo = Math.max(
    parseInt(picoBruto || "0", 10),
    ...serieAudiencia.map((p) => p.contagem),
    0
  );

  const minutoAlvoPitch = minutoAposInicioSessao(sessaoSelecionada, OFERTA_EM_SEGUNDOS);
  const audienciaNoPitch = audienciaNoMinutoMaisProximo(serieAudiencia, minutoAlvoPitch);

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
      picoAoVivo,
      audienciaNoPitch,
      minutoPitchAlvo: minutoAlvoPitch,
      serieAudiencia,
    }),
    { status: 200, headers: { "Content-Type": "application/json" } }
  );
}
