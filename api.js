import { API_URL } from "./config";

const KEYS = {
  transactions: "abu_transactions",
  bookings: "abu_bookings",
  residents: "abu_residents",
  settings: "abu_settings"
};

const offline = {
  read(entity) {
    try { return JSON.parse(localStorage.getItem(KEYS[entity]) || "[]"); }
    catch { return []; }
  },
  write(entity, value) {
    localStorage.setItem(KEYS[entity], JSON.stringify(value));
    return value;
  }
};

function uuid() {
  if (crypto?.randomUUID) return crypto.randomUUID();
  return `${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

async function request(entity, action = "list", data = {}, id = "") {
  if (!API_URL) return null;
  if (action === "list") {
    const res = await fetch(`${API_URL}?entity=${encodeURIComponent(entity)}`);
    if (!res.ok) throw new Error("Falha ao consultar o servidor.");
    return res.json();
  }
  const res = await fetch(API_URL, {
    method: "POST",
    headers: { "Content-Type": "text/plain;charset=utf-8" },
    body: JSON.stringify({ entity, action, data, id })
  });
  if (!res.ok) throw new Error("Falha ao gravar no servidor.");
  return res.json();
}

export async function list(entity) {
  if (!API_URL) return offline.read(entity);
  try {
    const data = await request(entity);
    offline.write(entity, data);
    return data;
  } catch {
    return offline.read(entity);
  }
}

export async function save(entity, data, id = null) {
  const current = offline.read(entity);
  const now = new Date().toISOString();
  let record;
  if (id) {
    record = { ...data, id };
    const next = current.map(x => x.id === id ? { ...x, ...record } : x);
    offline.write(entity, next);
    try { return await request(entity, "update", record, id); } catch { return record; }
  }
  record = { ...data, id: uuid(), created_date: now };
  offline.write(entity, [...current, record]);
  try { return await request(entity, "create", data); } catch { return record; }
}

export async function remove(entity, id) {
  offline.write(entity, offline.read(entity).filter(x => x.id !== id));
  try { await request(entity, "delete", {}, id); } catch {}
  return true;
}

export async function loadAll() {
  const [transactions, bookings, residents, settingsRaw] = await Promise.all([
    list("transactions"), list("bookings"), list("residents"), list("settings")
  ]);
  let settings = { associacao: "Associação Bairro Unido", taxaMensal: 50 };
  if (Array.isArray(settingsRaw)) {
    const obj = Object.fromEntries(settingsRaw.map(x => [x.key, x.value]));
    settings = {
      associacao: obj.associacao || settings.associacao,
      taxaMensal: Number(obj.taxaMensal ?? settings.taxaMensal)
    };
  }
  return { transactions, bookings, residents, settings };
}

export async function saveSettings(settings) {
  const normalized = { ...settings, taxaMensal: Number(settings.taxaMensal || 0) };
  offline.write("settings", [
    { key: "associacao", value: normalized.associacao },
    { key: "taxaMensal", value: normalized.taxaMensal }
  ]);
  if (API_URL) {
    try {
      await request("settings", "replaceSettings", normalized);
    } catch {}
  }
  return normalized;
}

export const isOnlineBackend = () => Boolean(API_URL);
