// Login do painel interno por senha única. A senha real fica numa variável
// de ambiente do projeto Cloudflare Pages (PAINEL_SENHA) — nunca no código.

import { criarSessao, cookieDeSessao } from "../../_lib/auth.js";

export async function onRequestPost(context) {
  const { request, env } = context;

  if (!env.CHAT_KV) {
    return new Response(JSON.stringify({ ok: false, error: "kv_nao_configurado" }), { status: 500 });
  }
  if (!env.PAINEL_SENHA) {
    return new Response(JSON.stringify({ ok: false, error: "senha_nao_configurada" }), { status: 500 });
  }

  let data;
  try {
    data = await request.json();
  } catch (e) {
    return new Response(JSON.stringify({ ok: false, error: "invalid_json" }), { status: 400 });
  }

  const senha = (data.senha || "").toString();
  if (senha !== env.PAINEL_SENHA) {
    return new Response(JSON.stringify({ ok: false, error: "senha_incorreta" }), {
      status: 401,
      headers: { "Content-Type": "application/json" },
    });
  }

  const token = await criarSessao(env);

  return new Response(JSON.stringify({ ok: true }), {
    status: 200,
    headers: {
      "Content-Type": "application/json",
      "Set-Cookie": cookieDeSessao(token),
    },
  });
}
