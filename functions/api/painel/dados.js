// Dados do painel: lista de sessões (terças), mensagens da sessão escolhida,
// contagem de espectadores ao vivo (real, via presença) e métricas simples.
// Protegido por login — ver functions/_lib/auth.js.

import { estaAutenticado, respostaNaoAutorizado } from "../../_lib/auth.js";
import { ultimaTercaISO, agoraBrasilia, minutoAposInicioSessao } from "../../_lib/tempo.js";
import { listarSessoes } from "../../_lib/sessoes.js";

// Precisa ficar em sincronia com OFERTA_EM_SEGUNDOS em transmissao.html (o
// momento em que a Anna solta o link do Círculo de Mulheres) — duplicado de
// propósito aqui pra este arquivo não depender do HTML da transmissão.
const OFERTA_EM_SEGUNDOS = 4740;
// Janela de tolerância pra capturar o pitch: só grava se o painel for aberto
// (ou atualizar sozinho) a até 2min do momento real — evita gravar um número
// errado se ninguém estiver com o painel aberto bem na hora.
const JANELA_PITCH_MS = 2 * 60 * 1000;

// Pico e audiência-no-pitch são lidos/atualizados só quando o PAINEL é
// consultado (poucas requisições, de quem está logado), nunca a partir do
// heartbeat dos visitantes — foi exatamente escrever no KV a cada heartbeat
// de cada visitante que sobrecarregou o banco e derrubou este mesmo endpoint
// em 2026-09-22 (ver log-access/problemas/ e memória do projeto).
async function lerPicoEPitch(env, sessao) {
  const [picoBruto, pitchBruto] = await Promise.all([
    env.CHAT_KV.get(`pico:${sessao}`),
    env.CHAT_KV.get(`pitch:${sessao}`),
  ]);
  return {
    pico: picoBruto ? parseInt(picoBruto, 10) : 0,
    pitch: pitchBruto !== null ? parseInt(pitchBruto, 10) : null,
  };
}

// Grava (fire-and-forget, via waitUntil) se o pico subiu ou se estamos dentro
// da janela do pitch — nunca atrasa a resposta pro painel.
async function gravarPicoEPitchSeNecessario(env, sessao, aoVivoAgora, picoAtual, pitchAtual) {
  try {
    if (aoVivoAgora > picoAtual) {
      await env.CHAT_KV.put(`pico:${sessao}`, String(aoVivoAgora), { expirationTtl: 25 * 3600 });
    }
  } catch (e) {
    // best-effort — pico é secundário
  }

  try {
    if (pitchAtual === null) {
      const alvo = new Date(minutoAposInicioSessao(sessao, OFERTA_EM_SEGUNDOS) + ":00.000Z");
      const diff = Math.abs(agoraBrasilia().getTime() - alvo.getTime());
      if (diff <= JANELA_PITCH_MS) {
        await env.CHAT_KV.put(`pitch:${sessao}`, String(aoVivoAgora), { expirationTtl: 25 * 3600 });
      }
    }
  } catch (e) {
    // best-effort — pitch é secundário
  }
}

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
  const aoVivoAgora = chavesPresenca.length;

  const { pico, pitch } = await lerPicoEPitch(env, sessaoSelecionada);
  const picoAoVivo = Math.max(pico, aoVivoAgora);

  if (sessaoSelecionada === sessaoAtual) {
    context.waitUntil(
      gravarPicoEPitchSeNecessario(env, sessaoSelecionada, aoVivoAgora, pico, pitch).catch(() => {})
    );
  }

  return new Response(
    JSON.stringify({
      ok: true,
      sessoes,
      sessaoAtual,
      sessaoSelecionada,
      aoVivoAgora,
      totalLeads: emailsUnicos.size,
      totalMensagens,
      mensagens,
      picoAoVivo,
      audienciaNoPitch: pitch,
    }),
    { status: 200, headers: { "Content-Type": "application/json" } }
  );
}
