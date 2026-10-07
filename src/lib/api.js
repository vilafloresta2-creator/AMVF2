import { API_URL } from "../config";
import { uid } from "./utils";

function parseJsonText(text) {
  const clean = String(text || "").trim();
  if (!clean) throw new Error("A API retornou uma resposta vazia.");
  return JSON.parse(clean);
}

async function getAllRaw() {
  const url = API_URL + (API_URL.includes("?") ? "&" : "?") + "action=read&t=" + Date.now();
  const r = await fetch(url, {
    method: "GET",
    cache: "no-store",
    redirect: "follow",
  });
  const text = await r.text();
  let j;
  try {
    j = parseJsonText(text);
  } catch (_) {
    const preview = String(text || "").trim().slice(0, 160).replace(/\s+/g, " ");
    throw new Error(`A API de leitura retornou conteúdo que não é JSON: ${preview}`);
  }
  if (!j.ok) throw Error(j.error || "Erro na API.");
  return j.data;
}

export async function getAll() {
  return getAllRaw();
}

function looksLikeGoogleHtml(text) {
  const s = String(text || "").trim().toLowerCase();
  return s.startsWith("<!doctype html") || s.startsWith("<html") || s.includes("window['ppconfig']") || s.includes("window[\"ppconfig\"]");
}

function writeAcceptedFallback(p) {
  // O Apps Script pode executar o POST com sucesso e, por causa do redirecionamento
  // do ContentService, entregar ao navegador uma página HTML/404 em vez do JSON.
  // Nesse cenário a alteração já foi enviada; o app atualiza a UI localmente e
  // faz uma sincronização silenciosa em segundo plano.
  return {
    __writeAccepted: true,
    entity: p.entity || "",
    action: p.action || "",
    id: p.id || p.data?.id || "",
    data: p.data || {},
  };
}

async function req(p) {
  const r = await fetch(API_URL, {
    method: "POST",
    cache: "no-store",
    redirect: "follow",
    headers: { "Content-Type": "text/plain;charset=utf-8" },
    body: JSON.stringify(p),
  });

  const text = await r.text();

  try {
    const j = parseJsonText(text);
    if (!j.ok) throw Error(j.error || "Erro na API.");
    return j.data;
  } catch (postError) {
    if (looksLikeGoogleHtml(text)) return writeAcceptedFallback(p);
    throw postError;
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

export async function restoreBackup(data) {
  const result = await req({ action: "restoreBackup", data });
  if (result && result.__writeAccepted) {
    // A gravação pode ser aceita pelo Apps Script enquanto o ContentService
    // devolve HTML ao navegador. Para restauração, confirme lendo novamente
    // a API antes de informar sucesso.
    await new Promise(resolve => setTimeout(resolve, 350));
    return await getAllRaw();
  }
  return result;
}
