// Autenticação simples (senha única) pro painel interno. Não é multiusuário —
// é só uma tranca pra ninguém de fora ver nomes/e-mails/telefones dos leads.

export const COOKIE_NOME = "painel_token";
const DURACAO_SESSAO_SEG = 60 * 60 * 12; // 12h

function lerCookies(request) {
  const cabecalho = request.headers.get("Cookie") || "";
  const cookies = {};
  cabecalho.split(";").forEach((par) => {
    const idx = par.indexOf("=");
    if (idx === -1) return;
    const nome = par.slice(0, idx).trim();
    const valor = par.slice(idx + 1).trim();
    if (nome) cookies[nome] = valor;
  });
  return cookies;
}

export async function estaAutenticado(request, env) {
  if (!env.CHAT_KV) return false;
  const cookies = lerCookies(request);
  const token = cookies[COOKIE_NOME];
  if (!token) return false;
  const valor = await env.CHAT_KV.get(`sessao_admin:${token}`);
  return valor !== null;
}

export async function criarSessao(env) {
  const token = crypto.randomUUID();
  await env.CHAT_KV.put(`sessao_admin:${token}`, "1", { expirationTtl: DURACAO_SESSAO_SEG });
  return token;
}

export async function destruirSessao(request, env) {
  const cookies = lerCookies(request);
  const token = cookies[COOKIE_NOME];
  if (token) await env.CHAT_KV.delete(`sessao_admin:${token}`);
}

export function cookieDeSessao(token) {
  return `${COOKIE_NOME}=${token}; HttpOnly; Secure; SameSite=Strict; Max-Age=${DURACAO_SESSAO_SEG}; Path=/`;
}

export function cookieExpirado() {
  return `${COOKIE_NOME}=; HttpOnly; Secure; SameSite=Strict; Max-Age=0; Path=/`;
}

export function respostaNaoAutorizado() {
  return new Response(JSON.stringify({ ok: false, error: "nao_autorizado" }), {
    status: 401,
    headers: { "Content-Type": "application/json" },
  });
}
