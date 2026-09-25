// Link único e permanente: https://lp2.institutoipeamarelo.com/comunidade
// Redireciona sozinho pra comunidade certa da semana, sem precisar editar
// nada (nem aqui, nem na página de obrigado, nem no agente do Never Lose,
// nem no e-mail de boas-vindas) toda vez que a MasterClass avançar.
//
// Semana 01 (MasterClass de 15/09/2026) = Comunidade 01, Semana 02 = Comunidade
// 02, etc. Depois da Comunidade 04 o rodízio reinicia na Comunidade 01
// (semana 05 = Comunidade 01, semana 06 = Comunidade 02, ...), indefinidamente.
// A virada acontece junto com o início de cada MasterClass (terça 19h30,
// horário de Brasília) — mesmo instante que ultimaTercaISO() já usa em todo
// o resto do site.

import { ultimaTercaISO } from "./_lib/tempo.js";

const ANCORA_ISO = "2026-09-15"; // terça da MasterClass 1 = Comunidade 01

const COMUNIDADES = [
  "https://chat.whatsapp.com/IyuLxq4dJjrFEYtLoVGNUR", // Comunidade 01
  "https://chat.whatsapp.com/L4OELAerx1VGbMClsKAq7J", // Comunidade 02
  "https://chat.whatsapp.com/LmpTRKrePhS84aIZgmcWbJ", // Comunidade 03
  "https://chat.whatsapp.com/CEPSYMI3xav0Ziu2T1BwJd", // Comunidade 04
];

function diasEntreISO(isoInicio, isoFim) {
  const [anoA, mesA, diaA] = isoInicio.split("-").map(Number);
  const [anoB, mesB, diaB] = isoFim.split("-").map(Number);
  const a = Date.UTC(anoA, mesA - 1, diaA);
  const b = Date.UTC(anoB, mesB - 1, diaB);
  return Math.round((b - a) / 86400000);
}

export async function onRequestGet() {
  const sessaoAtual = ultimaTercaISO();
  const dias = Math.max(0, diasEntreISO(ANCORA_ISO, sessaoAtual));
  const semanas = Math.round(dias / 7);
  const indice = ((semanas % COMUNIDADES.length) + COMUNIDADES.length) % COMUNIDADES.length;

  return Response.redirect(COMUNIDADES[indice], 302);
}
