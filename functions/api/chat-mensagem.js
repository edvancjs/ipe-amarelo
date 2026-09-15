// Salva mensagens do chat da Página de Transmissão num KV do Cloudflare
// (binding "CHAT_KV", configurado no dashboard do projeto Pages).
// Cada mensagem fica sob uma chave prefixada pela terça-feira da sessão,
// pra dar pra listar/exportar por semana depois.

function ultimaTercaISO(){
  var fmt = new Intl.DateTimeFormat('en-US', {
    timeZone: 'America/Sao_Paulo',
    year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit', second: '2-digit',
    hour12: false
  });
  var partes = fmt.formatToParts(new Date());
  var pega = function(tipo){ return parseInt(partes.find(function(p){ return p.type === tipo; }).value, 10); };
  var agora = new Date(Date.UTC(pega('year'), pega('month') - 1, pega('day'), pega('hour') % 24, pega('minute'), pega('second')));

  var diaSemana = agora.getUTCDay();
  var diff = (diaSemana - 2 + 7) % 7;
  var alvo = new Date(Date.UTC(agora.getUTCFullYear(), agora.getUTCMonth(), agora.getUTCDate() - diff, 19, 30, 0));
  if (alvo.getTime() > agora.getTime()){
    alvo = new Date(alvo.getTime() - 7 * 24 * 3600 * 1000);
  }
  return alvo.toISOString().slice(0, 10); // AAAA-MM-DD
}

export async function onRequestPost(context) {
  const { request, env } = context;

  if (!env.CHAT_KV) {
    return new Response(JSON.stringify({ ok: false, error: "kv_nao_configurado" }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }

  let data;
  try {
    data = await request.json();
  } catch (e) {
    return new Response(JSON.stringify({ ok: false, error: "invalid_json" }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }

  const tipo = (data.tipo || "mensagem").toString();
  const nome = (data.nome || "").toString().trim().slice(0, 100);
  const email = (data.email || "").toString().trim().slice(0, 200);
  const telefone = (data.telefone || "").toString().trim().slice(0, 40);
  const texto = (data.texto || "").toString().trim().slice(0, 500);
  const elapsedSeg = Number.isFinite(data.elapsedSeg) ? data.elapsedSeg : null;

  if (!nome || !email) {
    return new Response(JSON.stringify({ ok: false, error: "nome_ou_email_ausente" }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }

  const sessao = ultimaTercaISO();
  const agora = Date.now();
  const chave = `msg:${sessao}:${agora}:${Math.random().toString(36).slice(2, 8)}`;

  const registro = {
    tipo,
    nome,
    email,
    telefone,
    texto,
    elapsedSeg,
    sessao,
    criadoEm: new Date(agora).toISOString(),
  };

  try {
    await env.CHAT_KV.put(chave, JSON.stringify(registro));
    return new Response(JSON.stringify({ ok: true }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (e) {
    return new Response(JSON.stringify({ ok: false, error: String(e) }), {
      status: 502,
      headers: { "Content-Type": "application/json" },
    });
  }
}
