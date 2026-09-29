import { API_URL } from "../config";
import { uid } from "./utils";

function parseJsonText(text) {
  const clean = String(text || "").trim();
  if (!clean) throw new Error("A API retornou uma resposta vazia.");

  try {
    return JSON.parse(clean);
  } catch (_) {
    const preview = clean.slice(0, 120).replace(/\s+/g, " ");
    throw new Error(`A API retornou conteúdo que não é JSON: ${preview}`);
  }
}

async function getAllRaw() {
  const url = API_URL + (API_URL.includes("?") ? "&" : "?") + "action=read&t=" + Date.now();
  const r = await fetch(url, { method: "GET", cache: "no-store" });
  const text = await r.text();
  const j = parseJsonText(text);
  if (!j.ok) throw Error(j.error || "Erro na API.");
  return j.data;
}

export async function getAll() {
  return getAllRaw();
}

function collectionName(entity) {
  return ({
    Transactions: "transactions",
    Bookings: "bookings",
    Residents: "residents",
    Payments: "payments",
    Settings: "settings",
  })[entity] || "";
}

function recoverWriteResult(p, data) {
  const entity = String(p.entity || "");
  const action = String(p.action || "").toLowerCase();

  if (entity === "Settings" && action === "savesettings") {
    return data.settings || {};
  }

  if (entity === "Residents" && action === "togglepayment") {
    const resident = (data.residents || []).find(x => String(x.id) === String(p.id));
    if (!resident) throw Error("A operação foi enviada, mas o morador não foi localizado na leitura seguinte.");

    const month = String(p.data?.month || "");
    const paid = p.data?.paid === true || String(p.data?.paid).toLowerCase() === "true";
    let transaction = null;

    if (paid) {
      const transactionId = resident.monthlyPaymentIds?.[month];
      if (transactionId) {
        transaction = (data.transactions || []).find(x => String(x.id) === String(transactionId)) || null;
      }
    }

    return {
      resident,
      transaction,
      // A leitura seguinte já é a fonte de verdade; não precisamos
      // adivinhar quais IDs foram removidos no estorno.
      removedTransactionIds: [],
    };
  }

  const key = collectionName(entity);
  const list = key ? data[key] : null;
  const wantedId = p.data?.id || p.id;

  if (Array.isArray(list) && wantedId) {
    const found = list.find(x => String(x.id) === String(wantedId));
    if (found) return found;
  }

  // Exclusão: o registro não deverá mais existir após a gravação.
  if (action === "delete") return { id: String(p.id) };

  // Fallback final: devolve os dados enviados para que a tela possa seguir
  // e, em seguida, o refresh() busca a versão oficial da planilha.
  return p.data || {};
}

async function req(p) {
  const r = await fetch(API_URL, {
    method: "POST",
    cache: "no-store",
    headers: { "Content-Type": "text/plain;charset=utf-8" },
    body: JSON.stringify(p),
  });

  const text = await r.text();

  try {
    const j = parseJsonText(text);
    if (!j.ok) throw Error(j.error || "Erro na API.");
    return j.data;
  } catch (postError) {
    // Em algumas respostas do Apps Script, a gravação chega à planilha,
    // mas o navegador recebe uma página HTML em vez do JSON esperado.
    // Como a operação já pode ter sido executada, confirmamos pela leitura
    // da API antes de mostrar erro ao usuário.
    try {
      const data = await getAllRaw();
      return recoverWriteResult(p, data);
    } catch (_) {
      throw postError;
    }
  }
}

export const create = (entity, data) =>
  req({ entity, action: "create", data: { ...data, id: data.id || uid() } });

export const update = (entity, id, data) =>
  req({ entity, action: "update", id, data });

export const remove = (entity, id) =>
  req({ entity, action: "delete", id });

export const saveSettings = settings =>
  req({ entity: "Settings", action: "saveSettings", data: settings });

export const togglePayment = (residentId, month, paid, method = "", date = "", amount = "") =>
  req({
    entity: "Residents",
    action: "togglePayment",
    id: residentId,
    data: { month, paid, method, date, amount },
  });
