// Mantém um índice leve (uma chave só) com as datas de todas as terças que já
// tiveram alguma mensagem — evita ter que listar milhares de chaves "msg:*"
// só pra descobrir quais semanas existem.

const CHAVE_INDICE = "indice-sessoes";

export async function garantirSessaoNoIndice(env, sessao) {
  const atual = await env.CHAT_KV.get(CHAVE_INDICE, "json");
  const lista = Array.isArray(atual) ? atual : [];
  if (lista.includes(sessao)) return;
  lista.push(sessao);
  lista.sort().reverse(); // mais recente primeiro
  await env.CHAT_KV.put(CHAVE_INDICE, JSON.stringify(lista));
}

export async function listarSessoes(env) {
  const atual = await env.CHAT_KV.get(CHAVE_INDICE, "json");
  return Array.isArray(atual) ? atual : [];
}
