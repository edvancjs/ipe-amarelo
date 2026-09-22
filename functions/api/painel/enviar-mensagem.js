// Manda uma mensagem da equipe direto do painel interno — aparece pra todo
// mundo assistindo a sessão atual, com o nome "Equipe Ipê Amarelo". Protegido
// por login, igual dados.js. Só faz sentido na sessão que está ao vivo agora
// (é a única que a Página de Transmissão consulta).

import { estaAutenticado, respostaNaoAutorizado } from "../../_lib/auth.js";
import { ultimaTercaISO } from "../../_lib/tempo.js";

const TTL_ADMIN_MSG = 25 * 3600;
const NOME_EQUIPE = "Equipe Ipê Amarelo";

export async function onRequestPost(context) {
  const { request, env } = context;

  if (!env.CHAT_KV) {
    return new Response(JSON.stringify({ ok: false, error: "kv_nao_configurado" }), { status: 500 });
  }
  if (!(await estaAutenticado(request, env))) {
    return respostaNaoAutorizado();
  }

  let data;
  try {
    data = await request.json();
  } catch (e) {
    return new Response(JSON.stringify({ ok: false, error: "invalid_json" }), { status: 400 });
  }

  const texto = (data.texto || "").toString().trim().slice(0, 500);
  if (!texto) {
    return new Response(JSON.stringify({ ok: false, error: "texto_vazio" }), { status: 400 });
  }

  const sessao = ultimaTercaISO();
  const agora = Date.now();
  const chave = `admin-msg:${sessao}:${agora}:${Math.random().toString(36).slice(2, 8)}`;
  const registro = { nome: NOME_EQUIPE, texto, criadoEm: new Date(agora).toISOString() };

  try {
    await env.CHAT_KV.put(chave, JSON.stringify(registro), {
      expirationTtl: TTL_ADMIN_MSG,
      metadata: registro,
    });
    return new Response(JSON.stringify({ ok: true, sessao }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (e) {
    return new Response(JSON.stringify({ ok: false, error: String(e) }), { status: 502 });
  }
}
