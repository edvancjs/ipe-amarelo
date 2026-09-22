// Funções de data/hora compartilhadas entre as Functions do painel e do chat.
// A MasterClass é recorrente, toda terça-feira 19h30 (horário de Brasília).

export function ultimaTercaISO() {
  const fmt = new Intl.DateTimeFormat("en-US", {
    timeZone: "America/Sao_Paulo",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  });
  const partes = fmt.formatToParts(new Date());
  const pega = (tipo) => parseInt(partes.find((p) => p.type === tipo).value, 10);
  const agora = new Date(
    Date.UTC(pega("year"), pega("month") - 1, pega("day"), pega("hour") % 24, pega("minute"), pega("second"))
  );

  const diaSemana = agora.getUTCDay();
  const diff = (diaSemana - 2 + 7) % 7;
  let alvo = new Date(Date.UTC(agora.getUTCFullYear(), agora.getUTCMonth(), agora.getUTCDate() - diff, 19, 30, 0));
  if (alvo.getTime() > agora.getTime()) {
    alvo = new Date(alvo.getTime() - 7 * 24 * 3600 * 1000);
  }
  return alvo.toISOString().slice(0, 10); // AAAA-MM-DD
}

// Momento atual, representado como um Date "pseudo-UTC" cujos campos UTC são
// na verdade o horário de Brasília (mesmo truque usado acima) — assim dá pra
// comparar/subtrair com os outros horários deste arquivo sem se preocupar com
// fuso.
export function agoraBrasilia() {
  const fmt = new Intl.DateTimeFormat("en-US", {
    timeZone: "America/Sao_Paulo",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  });
  const partes = fmt.formatToParts(new Date());
  const pega = (tipo) => parseInt(partes.find((p) => p.type === tipo).value, 10);
  return new Date(
    Date.UTC(pega("year"), pega("month") - 1, pega("day"), pega("hour") % 24, pega("minute"), pega("second"))
  );
}

// Trunca um Date (no mesmo esquema pseudo-UTC acima) pro minuto, em string
// ordenável — usado como chave dos retratos de audiência (um por minuto).
export function minutoISO(data) {
  return data.toISOString().slice(0, 16); // AAAA-MM-DDTHH:MM
}

// Minuto (mesmo formato de minutoISO) de um instante X segundos depois do
// início da sessão (sempre 19h30 de Brasília) — usado pra achar o retrato de
// audiência mais próximo de um momento específico da aula (ex.: o pitch).
export function minutoAposInicioSessao(sessaoISO, offsetSegundos) {
  const [ano, mes, dia] = sessaoISO.split("-").map(Number);
  const inicio = new Date(Date.UTC(ano, mes - 1, dia, 19, 30, 0));
  const alvo = new Date(inicio.getTime() + offsetSegundos * 1000);
  return minutoISO(alvo);
}
