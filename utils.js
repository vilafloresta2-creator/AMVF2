export const CATEGORY_LABELS = {
  taxa: "Taxa Mensal",
  aluguel: "Aluguel Sala",
  doacao: "Doação",
  evento: "Evento",
  manutencao: "Manutenção",
  conta: "Contas/Despesas",
  outro: "Outro"
};

export const TIME_SLOTS = [
  "08:00 - 10:00",
  "10:00 - 12:00",
  "13:00 - 15:00",
  "15:00 - 17:00",
  "18:00 - 20:00",
  "20:00 - 22:00"
];

export function brl(v) {
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(Number(v) || 0);
}
export function dateBR(iso) {
  if (!iso) return "";
  const [y,m,d] = iso.split("-");
  return y && m && d ? `${d}/${m}/${y}` : new Date(iso).toLocaleDateString("pt-BR");
}
export function todayISO() {
  return new Date().toISOString().slice(0,10);
}
export function monthKeyNow() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}`;
}
export function monthLabel(key) {
  const [y,m] = key.split("-");
  const months = ["Jan","Fev","Mar","Abr","Mai","Jun","Jul","Ago","Set","Out","Nov","Dez"];
  return `${months[Number(m)-1]}/${y}`;
}
export function monthFull(key) {
  const [y,m] = key.split("-");
  const months = ["janeiro","fevereiro","março","abril","maio","junho","julho","agosto","setembro","outubro","novembro","dezembro"];
  return `${months[Number(m)-1]} de ${y}`;
}
export function addMonths(key, delta) {
  const [y,m] = key.split("-").map(Number);
  const d = new Date(y, m-1+delta, 1);
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}`;
}
export function uid() {
  return crypto?.randomUUID ? crypto.randomUUID() : `${Date.now()}-${Math.random()}`;
}
export function escapeCSV(value) {
  const str = String(value ?? "");
  return /[,;"\n]/.test(str) ? `"${str.replace(/"/g,'""')}"` : str;
}
