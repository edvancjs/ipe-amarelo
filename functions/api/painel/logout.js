import { destruirSessao, cookieExpirado } from "../../_lib/auth.js";

export async function onRequestPost(context) {
  const { request, env } = context;
  if (env.CHAT_KV) await destruirSessao(request, env);
  return new Response(JSON.stringify({ ok: true }), {
    status: 200,
    headers: {
      "Content-Type": "application/json",
      "Set-Cookie": cookieExpirado(),
    },
  });
}
