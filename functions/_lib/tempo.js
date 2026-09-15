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
