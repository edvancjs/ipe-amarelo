// Link único e permanente: https://lp2.institutoipeamarelo.com/comunidade
// Redireciona sozinho pra comunidade certa, sem precisar editar nada (nem
// aqui, nem na página de obrigado, nem no agente do Never Lose, nem no
// e-mail de boas-vindas) toda vez que a MasterClass avançar.
//
// O link aponta pra comunidade da PRÓXIMA MasterClass (a que quem está se
// inscrevendo agora vai assistir) — não pra que já aconteceu. Por isso usa
// a mesma lógica de "próxima terça 19h30" do proximaTerca1930() do
// index.html/obrigado.html (não a ultimaTercaISO() do painel): a virada
// acontece junto com o início de cada MasterClass, quando a "próxima"
// deixa de ser a que estava em cartaz e passa a ser a de daqui a 1 semana.
//
// Semana 01 (MasterClass de 15/09/2026) = Comunidade 01, Semana 02 = Comunidade
// 02, etc. Depois da Comunidade 04 o rodízio reinicia na Comunidade 01
// (semana 05 = Comunidade 01, semana 06 = Comunidade 02, ...), indefinidamente.

import { agoraBrasilia } from "./_lib/tempo.js";

const ANCORA_ISO = "2026-09-15"; // terça da MasterClass 1 = Comunidade 01

const COMUNIDADES = [
  "https://chat.whatsapp.com/IyuLxq4dJjrFEYtLoVGNUR", // Comunidade 01
  "https://chat.whatsapp.com/L4OELAerx1VGbMClsKAq7J", // Comunidade 02
  "https://chat.whatsapp.com/LmpTRKrePhS84aIZgmcWbJ", // Comunidade 03
  "https://chat.whatsapp.com/CEPSYMI3xav0Ziu2T1BwJd", // Comunidade 04
];

function proximaTerca1930ISO() {
  const agora = agoraBrasilia();
  const diaSemana = agora.getUTCDay(); // 0=dom, 1=seg, 2=ter...
  const diff = (2 - diaSemana + 7) % 7;
  let alvo = new Date(Date.UTC(agora.getUTCFullYear(), agora.getUTCMonth(), agora.getUTCDate() + diff, 19, 30, 0));
  if (agora.getTime() >= alvo.getTime()) {
    alvo = new Date(alvo.getTime() + 7 * 24 * 3600 * 1000);
  }
  return alvo.toISOString().slice(0, 10);
}

function diasEntreISO(isoInicio, isoFim) {
  const [anoA, mesA, diaA] = isoInicio.split("-").map(Number);
  const [anoB, mesB, diaB] = isoFim.split("-").map(Number);
  const a = Date.UTC(anoA, mesA - 1, diaA);
  const b = Date.UTC(anoB, mesB - 1, diaB);
  return Math.round((b - a) / 86400000);
}

export async function onRequestGet() {
  const proximaSessao = proximaTerca1930ISO();
  const dias = Math.max(0, diasEntreISO(ANCORA_ISO, proximaSessao));
  const semanas = Math.round(dias / 7);
  const indice = ((semanas % COMUNIDADES.length) + COMUNIDADES.length) % COMUNIDADES.length;

  return Response.redirect(COMUNIDADES[indice], 302);
}
