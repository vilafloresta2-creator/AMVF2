export function makeBackup(data) {
  return {
    app: "bairro-unido",
    version: 1,
    exportedAt: new Date().toISOString(),
    data
  };
}
export function downloadBackup(data) {
  const payload = makeBackup(data);
  const blob = new Blob([JSON.stringify(payload, null, 2)], {type:"application/json"});
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = `bairro-unido-backup-${new Date().toISOString().slice(0,10)}.json`;
  a.click();
  URL.revokeObjectURL(a.href);
}
export async function readBackup(file) {
  const payload = JSON.parse(await file.text());
  if (!payload || payload.app !== "bairro-unido" || !payload.data) throw new Error("Arquivo de backup inválido.");
  return payload.data;
}
