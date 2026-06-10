/* ============================================================
   i18n.js — PT-PT locale data + UI strings, one place.
   Message/notes text from the thread stays verbatim (not here).
   ============================================================ */

// Full + short month names (index 0 = January)
export const MONTHS = [
  "Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho",
  "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro",
];
export const MON_SHORT = [
  "jan", "fev", "mar", "abr", "mai", "jun",
  "jul", "ago", "set", "out", "nov", "dez",
];

// Weekday headers — Monday-first and Sunday-first
export const WD_MON = ["Seg", "Ter", "Qua", "Qui", "Sex", "Sáb", "Dom"];
export const WD_SUN = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];
// Single-letter (mobile dot grid)
export const WD1_MON = ["S", "T", "Q", "Q", "S", "S", "D"];
export const WD1_SUN = ["D", "S", "T", "Q", "Q", "S", "S"];
// Full weekday names (day sheet) — index 0 = Sunday
export const WD_FULL = ["Domingo", "Segunda", "Terça", "Quarta", "Quinta", "Sexta", "Sábado"];

// Pluralize helper: noite/noites etc.
export const plural = (n, one, many) => `${n} ${n === 1 ? one : many}`;

// Shared UI strings
export const T = {
  // status
  confirmed: "Confirmada",
  tentative: "Provisória",
  conflict: "Conflito",
  sharedStay: "Presença · partilhada",
  // views / tabs
  month: "Mês",
  agenda: "Agenda",
  dataLayer: "Camada de dados",
  data: "Dados",
  today: "Hoje",
  // header pipeline
  messagesScanned: "mensagens lidas",
  staysExtracted: "estadias extraídas",
  needReview: "para rever",
  synced: "sinc.",
  staysFrom: (n, m) => `${n} estadias de ${m} mensagens`,
  reviewArrow: (n) => `⚠ ${n} rever →`,
  // blackout
  houseClosed: "Casa fechada",
  houseClosedSummer: "Casa fechada · verão",
  houseClosedReservations: "Casa fechada para reservas",
  noReservationsPeriod:
    "Não se aceitam reservas neste período. Qualquer pedido que se sobreponha é automaticamente recusado.",
  whosAround: "Quem está por lá",
  whosAroundShared: "Quem está por lá (partilhado)",
  noOneShared: "Ainda ninguém partilhou planos.",
  sharingOptional:
    "Partilhar é opcional — a família pode dizer que vai estar lá mesmo sem poder reservar a casa.",
  setByMessage: "Definida por esta mensagem",
  // presence
  stayingClosedPeriod: "Presença durante o período fechado",
  presenceExplain: (who) =>
    `Não é uma reserva — a casa está fechada a reservas todo o verão. ${who} só partilhou que vai estar lá junto com a avó, para todos saberem quem está por perto.`,
  // review
  needsReview: "Precisa da tua revisão",
  reviewDouble: "reserva dupla",
  reviewAmbiguous: "pedido ambíguo",
  flaggedCount: (n) =>
    `O agente assinalou ${n} ${n === 1 ? "pedido que não conseguiu" : "pedidos que não conseguiu"} resolver sozinho.`,
  confirmDates: "Confirmar datas",
  adjust: "Ajustar",
  dismiss: "Dispensar",
  // entry detail
  checkIn: "Entrada",
  checkOut: "Saída",
  nights: "Noites",
  party: "Grupo",
  unknownParty: "— desconhecido",
  notes: "Notas",
  triggeredByOne: "Originada por esta mensagem",
  triggeredByN: (n) => `Originada por ${n} mensagens`,
  extractedJson: "JSON extraído",
  conf: "conf",
  // panel summary
  thisYear: "Este ano na casa",
  pulledLive: "Extraído do grupo da família. Toca numa estadia para ver a origem.",
  confirmedStays: "estadias confirmadas",
  nightsBooked: "noites reservadas",
  requestsNeedReview: (n) => `${n} ${n === 1 ? "pedido precisa" : "pedidos precisam"} de revisão`,
  tentativeOrConflicting: "Provisórios ou em conflito — toca para resolver",
  legend: "Legenda",
  legendConfirmed: "Estadia confirmada (cor por pessoa)",
  legendTentative: "Provisória — a aguardar confirmação",
  legendConflict: "Conflito / precisa de revisão",
  legendClosed: "Casa fechada (verão)",
  legendShared: "Presença no verão (partilhada, não é reserva)",
  // data view
  dataLayerTitle: "A camada de dados",
  dataLayerBlurb:
    "O agente transforma o fio de mensagens neste array limpo. O calendário mostra apenas isto — por isso o que vês é exatamente o que foi extraído, e cada entrada aponta para a mensagem que a originou.",
  showThread: "Mostrar fio original",
  hideThread: "Esconder fio original",
  entriesLabel: (n) => `reservas.json — ${n} entradas`,
  threadLabel: (n) => `fio_whatsapp.txt — ${n} mostradas · ruído esbatido`,
  extractedReservation: "↳ reserva extraída",
  setBlackoutRule: "↳ definiu regra de fecho",
  flaggedForReview: "↳ assinalada para revisão",
  // agenda — today / past
  todayMark: "Hoje",
  pastStays: (n) => `${n} ${n === 1 ? "estadia anterior" : "estadias anteriores"}`,
  hidePast: "Esconder anteriores",
  nothingUpcoming: "Sem estadias futuras por agora.",
  // misc
  backToOverview: "← Voltar à vista geral",
  available: "Disponível",
  staysBooked: (n) => `${n} ${n === 1 ? "estadia reservada" : "estadias reservadas"}`,
  booked: "Reservado",
  staying: "A ficar",
  stayingShared: "Presença (partilhada)",
  closed: "Fechada",
  people: (n) => `${n} ${n === 1 ? "pessoa" : "pessoas"}`,
  partyUnknown: "grupo?",
};
