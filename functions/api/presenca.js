// Sinal de vida de quem está assistindo a Página de Transmissão agora mesmo.
// Cada aba manda um POST a cada ~20s com um id aleatório próprio (gerado no
// navegador, guardado em sessionStorage). A chave expira sozinha se o sinal
// parar de chegar — contar as chaves vivas = pessoas ao vivo de verdade,
// usado só no painel interno (o número público "👁" continua sendo simulado,
// de propósito, pra prova social). TTL fixo em 60s: é o mínimo que o KV do
// Cloudflare aceita (não dá pra usar menos), mesmo o heartbeat sendo a cada 20s.

import { ultimaTercaISO, agoraBrasilia, minutoISO } from "../_lib/tempo.js";

// TTL das chaves de analytics do painel — 25h cobre a sessão inteira mais a
// mesma janela de 24h que o replay já usa, sem guardar dado pra sempre.
const TTL_ANALYTICS = 25 * 3600;

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

  // Alcance (primeiro/último sinal, pra retenção média) e retrato de audiência
  // por minuto (pro gráfico/pico/pitch) — roda depois de já ter respondido o
  // heartbeat, nunca atrasa nem quebra a resposta pra quem está assistindo.
  context.waitUntil(registrarAnalytics(env, sessao, viewerId).catch(() => {}));

  return new Response(JSON.stringify({ ok: true }), {
    status: 200,
    headers: { "Content-Type": "application/json" },
  });
}

async function registrarAnalytics(env, sessao, viewerId) {
  const agora = agoraBrasilia();
  const agoraISO = agora.toISOString();

  try {
    const chaveAlcance = `alcance:${sessao}:${viewerId}`;
    const existente = await env.CHAT_KV.get(chaveAlcance, "json");
    const primeiro = existente && existente.primeiro ? existente.primeiro : agoraISO;
    const registro = { primeiro, ultimo: agoraISO };
    // Metadata junto do valor: o painel consegue somar a retenção de todo
    // mundo com um list() só, sem um get() por visitante.
    await env.CHAT_KV.put(chaveAlcance, JSON.stringify(registro), {
      expirationTtl: TTL_ANALYTICS,
      metadata: registro,
    });
  } catch (e) {
    // best-effort — retenção não pode derrubar o heartbeat de presença
  }

  try {
    const minuto = minutoISO(agora);
    const chaveLock = `snapshot-lock:${sessao}:${minuto}`;
    const jaTemLock = await env.CHAT_KV.get(chaveLock);
    if (jaTemLock) return; // outro heartbeat desse mesmo minuto já tirou o retrato

    // Tranca o minuto ANTES de contar, pra evitar duas requisições
    // concorrentes tirando o mesmo retrato (list() é a parte cara aqui).
    await env.CHAT_KV.put(chaveLock, "1", { expirationTtl: 70 });

    let contagem = 0;
    let cursor;
    do {
      const pagina = await env.CHAT_KV.list({ prefix: `presenca:${sessao}:`, cursor });
      contagem += pagina.keys.length;
      cursor = pagina.list_complete ? undefined : pagina.cursor;
    } while (cursor);

    await env.CHAT_KV.put(`serie:${sessao}:${minuto}`, String(contagem), {
      expirationTtl: TTL_ANALYTICS,
      metadata: { minuto, contagem },
    });

    const chavePico = `pico:${sessao}`;
    const picoAtual = parseInt((await env.CHAT_KV.get(chavePico)) || "0", 10);
    if (contagem > picoAtual) {
      await env.CHAT_KV.put(chavePico, String(contagem), { expirationTtl: TTL_ANALYTICS });
    }
  } catch (e) {
    // best-effort — o gráfico/pico são secundários, presença continua valendo
  }
}
