const N = {
  Transactions: "Transactions",
  Bookings: "Bookings",
  Residents: "Residents",
  Settings: "Settings",
  Payments: "Payments",
  Audit: "Audit",
  Meetings: "Meetings",
  Users: "Users",
  Assets: "Assets",
  Documents: "Documents"
};

const H = {
  Transactions: ["id","type","category","description","amount","date","method","created_date"],
  Bookings: ["id","residentId","residentName","contact","purpose","date","timeSlot","status","created_date","totalAmount"],
  Residents: ["id","name","house","phone","email","notes","exempt","paidMonths","created_date","monthlyPaymentIds"],
  Settings: ["key","value"],
  Payments: ["id","bookingId","residentId","date","amount","method","description","transactionId","created_date"],
  Audit: ["id","date","actor","action","entity","entityId","description","amount"],
  Meetings: ["id","type","title","date","time","location","agenda","participants","decisions","status","notes","created_date"],
  Users: ["id","name","username","passwordHash","role","active","created_date","updated_date"],
  Assets: ["id","name","category","quantity","location","acquisitionDate","value","state","notes","created_date"],
  Documents: ["id","title","category","date","description","fileName","fileUrl","fileId","meetingId","meetingTitle","created_date"]
};

function setup() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  Object.keys(N).forEach(key => {
    const sheet = ss.getSheetByName(N[key]) || ss.insertSheet(N[key]);
    sheet.clear();
    sheet.getRange(1,1,1,H[key].length).setValues([H[key]]);
    sheet.setFrozenRows(1);
  });
  ss.getSheetByName("Settings").getRange(2,1,3,2).setValues([
    ["associacao","Associação de Moradores do Vila Floresta 2"],
    ["taxaMensal","50"],
    ["responsavel","Diretoria"]
  ]);
  ensureInitialAdmin();
  return out({ok:true});
}

function setupUsersOnly() {
  ensureSheet("Users");
  ensureInitialAdmin();
  return out({ok:true});
}

function ensureInitialAdmin() {
  const sheet=ensureSheet("Users");
  const users=objs(sheet);
  if(users.length) return users[0];
  const now=new Date().toISOString();
  const admin={id:Utilities.getUuid(),name:"Administrador AMVF2",username:"admin",passwordHash:hashPassword("AMVF2@2026!"),role:"Administrador",active:true,created_date:now,updated_date:now};
  sheet.appendRow(H.Users.map(h=>cell(admin[h])));
  return admin;
}

function hashPassword(password) {
  const bytes=Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256,String(password||""),Utilities.Charset.UTF_8);
  return bytes.map(b=>{const v=(b<0?b+256:b).toString(16);return v.length===1?"0"+v:v;}).join("");
}

function sanitizeUser(u) {
  const x={...u}; delete x.passwordHash; return norm(x,"Users");
}

const ROLE_PERMISSIONS={
  "Administrador":["dashboard","moradores","agendamentos","financeiro","relatorios","documentos","patrimonio","auditoria","usuarios","configuracoes"],
  "Diretoria":["dashboard","moradores","agendamentos","financeiro","relatorios","documentos","patrimonio"],
  "Tesoureiro":["dashboard","moradores","agendamentos","financeiro","relatorios","documentos","patrimonio"],
  "Secretário(a)":["dashboard","moradores","agendamentos","financeiro","relatorios","documentos","patrimonio"],
  "Secretário":["dashboard","moradores","agendamentos","financeiro","relatorios","documentos","patrimonio"],
  "Consulta":["dashboard","moradores","agendamentos","financeiro","relatorios","documentos","patrimonio"]
};

const WRITE_PERMISSIONS={
  "Administrador":["moradores.write","agendamentos.write","financeiro.write","documentos.write","patrimonio.write","configuracoes.write","usuarios.write"],
  "Diretoria":["moradores.write","agendamentos.write"],
  "Tesoureiro":["financeiro.write","patrimonio.write"],
  "Secretário(a)":["documentos.write"],
  "Secretário":["documentos.write"],
  "Consulta":[]
};

function canWrite(session, permission) {
  return (WRITE_PERMISSIONS[session.role]||[]).includes(permission);
}

function loginUser(username,password) {
  ensureInitialAdmin();
  const u=objs(ensureSheet("Users")).find(x=>String(x.username).toLowerCase()===String(username||"").trim().toLowerCase());
  if(!u || !(String(u.active).toLowerCase()==="true" || u.active===true) || String(u.passwordHash)!==hashPassword(password)) throw Error("Usuário ou senha inválidos.");
  const token=Utilities.getUuid()+Utilities.getUuid();
  CacheService.getScriptCache().put("session_"+token,JSON.stringify({userId:String(u.id),username:String(u.username),role:String(u.role),name:String(u.name)}),21600);
  return {token,user:sanitizeUser(u),permissions:ROLE_PERMISSIONS[u.role]||[]};
}

function requireSession(token) {
  const raw=CacheService.getScriptCache().get("session_"+String(token||""));
  if(!raw) throw Error("Sessão expirada. Faça login novamente.");
  return JSON.parse(raw);
}

function can(session, permission) {
  return (ROLE_PERMISSIONS[session.role]||[]).includes(permission);
}

function permissionForEntity(entity,action) {
  if(entity==="Users") return "usuarios";
  if(entity==="Settings") return "configuracoes";
  if(entity==="Audit") return "auditoria";
  if(entity==="Residents") return "moradores";
  if(entity==="Bookings" || entity==="Payments") return "agendamentos";
  if(entity==="Transactions") return "financeiro";
  if(entity==="Meetings") return "documentos";
  if(entity==="Assets") return "patrimonio";
  if(entity==="Documents") return "documentos";
  return "configuracoes";
}

function doGet(e) {
  try {
    const action=String((e&&e.parameter&&e.parameter.action)||"read").toLowerCase();
    if(action==="login") throw Error("Login deve ser enviado por POST.");
    if(action!=="read") throw Error("Ação GET inválida.");
    const session=requireSession(e&&e.parameter&&e.parameter.token);
    if(!can(session,"dashboard")) throw Error("Sem permissão.");
    return out({ok:true,data:all(),user:session});
  } catch(e) { return out({ok:false,error:String(e)}); }
}

function doPost(e) {
  const lock=LockService.getScriptLock(); lock.waitLock(15000);
  try {
    const p=JSON.parse((e&&e.postData&&e.postData.contents)||"{}");
    const action=String(p.action||"").toLowerCase();
    if(action==="login") return out({ok:true,data:loginUser(p.username,p.password)});
    const session=requireSession(p.token);
    if(action==="read") return out({ok:true,data:all(),user:session});
    let result;
    if(action==="logout") { CacheService.getScriptCache().remove("session_"+p.token); return out({ok:true,data:true}); }
    if(action==="me") return out({ok:true,data:{user:session,permissions:ROLE_PERMISSIONS[session.role]||[]}});
    if(action==="users") { if(session.role!=="Administrador" || !can(session,"usuarios")) throw Error("Somente o Administrador pode gerenciar usuários."); result=usersAction(p); logAudit(p,result,session); return out({ok:true,data:result}); }
    if(action==="changePassword") { result=changePassword(session,p); logAudit({action:"changePassword",entity:"Users",id:session.userId,data:{description:"Alteração da própria senha"}},result,session); return out({ok:true,data:result}); }
    const permission=permissionForEntity(p.entity,action);
    if(!can(session,permission)) throw Error("Você não tem permissão para acessar este módulo.");
    const mutating=["create","update","delete","togglepayment","restorebackup","savesettings"].includes(action);
    if(mutating){
      if(action==="restorebackup" || action==="savesettings") { if(!canWrite(session,"configuracoes.write")) throw Error("Somente o Administrador pode alterar configurações ou restaurar backup."); }
      else {
        let wp=null;
        if(p.entity==="Transactions") wp="financeiro.write";
        else if(p.entity==="Residents" && action==="togglepayment") wp="financeiro.write";
        else if(p.entity==="Residents") wp="moradores.write";
        else if(p.entity==="Assets") wp="patrimonio.write";
        else if(p.entity==="Meetings" || p.entity==="Documents") wp="documentos.write";
        else if(p.entity==="Bookings" || p.entity==="Payments") wp="agendamentos.write";
        if(wp && !canWrite(session,wp)) throw Error("Seu perfil permite somente consulta desta função.");
      }
    }
    if(p.entity==="Settings" && action==="savesettings") result=settings(p.data||{});
    else if(p.entity==="Residents" && action==="togglepayment") result=togglePayment(p.id,p.data||{});
    else if(p.entity==="Documents" && action==="create") result=createDocument(p.data||{});
    else if(p.entity==="Documents" && action==="update") result=updateDocument(p.id,p.data||{});
    else if(p.entity==="Documents" && action==="delete") result=deleteDocument(p.id);
    else if(action==="restorebackup") { if(session.role!=="Administrador") throw Error("Somente o Administrador pode restaurar backup."); result=restoreBackup(p.data||{}); }
    else if(action==="create") result=create(p.entity,p.data||{});
    else if(action==="update") result=update(p.entity,p.id,p.data||{});
    else if(action==="delete") result=del(p.entity,p.id);
    else throw Error("Ação inválida.");
    if(action!=="read"&&action!=="restorebackup"&&action!=="savesettings") logAudit(p,result,session);
    return out({ok:true,data:result,user:session});
  } catch(e) { return out({ok:false,error:String(e)}); }
  finally { lock.releaseLock(); }
}

function usersAction(p) {
  const sheet=ensureSheet("Users");
  if(p.subaction==="list") return objs(sheet).map(sanitizeUser);
  if(p.subaction==="create") {
    const d=p.data||{}; if(!d.name||!d.username||!d.password||!d.role) throw Error("Nome, usuário, senha e perfil são obrigatórios.");
    if(objs(sheet).some(x=>String(x.username).toLowerCase()===String(d.username).trim().toLowerCase())) throw Error("Esse usuário já existe.");
    const now=new Date().toISOString(),u={id:Utilities.getUuid(),name:String(d.name).trim(),username:String(d.username).trim(),passwordHash:hashPassword(d.password),role:String(d.role),active:d.active!==false,created_date:now,updated_date:now};
    sheet.appendRow(H.Users.map(h=>cell(u[h]))); return sanitizeUser(u);
  }
  if(p.subaction==="update") {
    const d=p.data||{},id=String(p.id),n=row(sheet,id); if(!n) throw Error("Usuário não encontrado.");
    const cur=objs(sheet).find(x=>String(x.id)===id)||{};
    if(d.username && objs(sheet).some(x=>String(x.id)!==id&&String(x.username).toLowerCase()===String(d.username).trim().toLowerCase())) throw Error("Esse usuário já existe.");
    const u={...cur,name:d.name??cur.name,username:d.username??cur.username,role:d.role??cur.role,active:d.active!==undefined?d.active:cur.active,updated_date:new Date().toISOString()};
    if(d.password) u.passwordHash=hashPassword(d.password);
    sheet.getRange(n,1,1,H.Users.length).setValues([H.Users.map(h=>cell(u[h]))]); return sanitizeUser(u);
  }
  if(p.subaction==="delete") { const id=String(p.id); const n=row(sheet,id); if(!n) throw Error("Usuário não encontrado."); const u=objs(sheet).find(x=>String(x.id)===id); if(String(u.role)==="Administrador"&&objs(sheet).filter(x=>String(x.role)==="Administrador"&&(String(x.active).toLowerCase()==="true"||x.active===true)).length<=1) throw Error("Não é possível excluir o último administrador ativo."); sheet.deleteRow(n); return {id}; }
  throw Error("Operação de usuários inválida.");
}

function changePassword(session,p) {
  const id=String(session.userId),sheet=ensureSheet("Users"),n=row(sheet,id); if(!n) throw Error("Usuário não encontrado.");
  const cur=objs(sheet).find(x=>String(x.id)===id)||{}; if(String(cur.passwordHash)!==hashPassword(p.currentPassword)) throw Error("Senha atual incorreta.");
  if(String(p.newPassword||"").length<6) throw Error("A nova senha deve ter pelo menos 6 caracteres.");
  cur.passwordHash=hashPassword(p.newPassword); cur.updated_date=new Date().toISOString(); sheet.getRange(n,1,1,H.Users.length).setValues([H.Users.map(h=>cell(cur[h]))]); return true;
}

function readAll() {
  return {
    transactions: objs(sh("Transactions")).map(x => norm(x, "Transactions")),
    payments: objs(ensureSheet("Payments")).map(x => norm(x, "Payments")),
    bookings: objs(ensureBookingSheet()).map(x => norm(x, "Bookings")),
    residents: objs(sh("Residents")).map(x => norm(x, "Residents")),
    settings: readSettings(),
    audit: objs(ensureSheet("Audit")).map(x => norm(x, "Audit")),
    meetings: objs(ensureSheet("Meetings")).map(x => norm(x, "Meetings"))
  };
}


function ensureBookingSheet() {
  const ss=SpreadsheetApp.getActiveSpreadsheet();
  let sheet=ss.getSheetByName("Bookings");
  if(!sheet){ sheet=ss.insertSheet("Bookings"); sheet.getRange(1,1,1,H.Bookings.length).setValues([H.Bookings]); sheet.setFrozenRows(1); return sheet; }
  const current=sheet.getRange(1,1,1,Math.max(sheet.getLastColumn(),H.Bookings.length)).getValues()[0].map(String);
  if(current[9] !== "totalAmount") sheet.getRange(1,10).setValue("totalAmount");
  return sheet;
}

function ensureSheet(entity) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let sheet = ss.getSheetByName(N[entity]);
  if (!sheet) {
    sheet = ss.insertSheet(N[entity]);
    sheet.getRange(1,1,1,H[entity].length).setValues([H[entity]]);
    sheet.setFrozenRows(1);
  } else {
    const headers = sheet.getRange(1,1,1,Math.max(sheet.getLastColumn(), H[entity].length)).getValues()[0].map(String);
    if (headers.slice(0,H[entity].length).join("|") !== H[entity].join("|")) {
      sheet.getRange(1,1,1,H[entity].length).setValues([H[entity]]);
    }
  }
  return sheet;
}

function sh(entity) {
  if(entity === "Bookings") return ensureBookingSheet();
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(N[entity]);
  if (!sheet) throw Error("Aba não encontrada: " + entity);
  return sheet;
}

function objs(sheet) {
  const values = sheet.getDataRange().getValues();
  if (values.length < 2) return [];
  const headers = values[0];
  return values.slice(1)
    .filter(row => row.some(v => v !== ""))
    .map(row => Object.fromEntries(headers.map((h,i) => [h,row[i]])));
}

function row(sheet, id) {
  const lastRow = sheet.getLastRow();
  if (lastRow < 2) return 0;
  const values = sheet.getRange(2,1,lastRow - 1,1).getValues();
  for (let i = 0; i < values.length; i++) {
    if (String(values[i][0]) === String(id)) return i + 2;
  }
  return 0;
}

function create(entity, data) {
  if (entity === "Payments") return createPayment(data);
  const sheet = sh(entity);
  const id = String(data.id || Utilities.getUuid());
  if (row(sheet,id)) throw Error("ID já existe.");
  if (entity === "Bookings") validateBooking(data, null);
  const obj = {...data, id, created_date:data.created_date || new Date().toISOString()};
  if (entity === "Residents") {
    obj.paidMonths = JSON.stringify(data.paidMonths || []);
    obj.monthlyPaymentIds = JSON.stringify(data.monthlyPaymentIds || {});
  }
  sheet.appendRow(H[entity].map(h => cell(obj[h])));
  return norm(obj, entity);
}

function update(entity, id, data) {
  const sheet = sh(entity);
  const rowNumber = row(sheet,id);
  if (!rowNumber) throw Error("Registro não encontrado.");
  const current = objs(sheet).find(x => String(x.id) === String(id)) || {};
  const obj = {...current, ...data, id:String(id)};
  if (entity === "Bookings") validateBooking(obj, String(id));
  if (entity === "Residents") {
    obj.paidMonths = JSON.stringify(data.paidMonths || []);
    obj.monthlyPaymentIds = JSON.stringify(data.monthlyPaymentIds || {});
  }
  sheet.getRange(rowNumber,1,1,H[entity].length).setValues([H[entity].map(h => cell(obj[h]))]);
  return norm(obj, entity);
}


function bookingDateKey(value) {
  if (value === null || value === undefined || value === "") return "";
  if (Object.prototype.toString.call(value) === "[object Date]" && !isNaN(value.getTime())) {
    return Utilities.formatDate(value, Session.getScriptTimeZone() || "America/Sao_Paulo", "yyyy-MM-dd");
  }
  const s = String(value).trim();
  if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return s;
  if (/^\d{4}-\d{2}-\d{2}T/.test(s)) return s.slice(0,10);
  const br = s.match(/^(\d{2})[\/\-](\d{2})[\/\-](\d{4})/);
  if (br) return br[3] + "-" + br[2] + "-" + br[1];
  return s.slice(0,10);
}

function validateBooking(data, ignoreId) {
  const date = bookingDateKey(data.date);
  const timeSlot = String(data.timeSlot || "").trim();
  if (!date || !timeSlot) throw Error("Informe a data e o horário do agendamento.");
  const conflict = objs(sh("Bookings")).find(x =>
    String(x.id) !== String(ignoreId || "") &&
    bookingDateKey(x.date) === date &&
    String(x.timeSlot || "").trim() === timeSlot
  );
  if (conflict) {
    throw Error("A sala comunitária já está reservada para esse dia e horário.");
  }
}

function createPayment(data) {
  const bookingId = String(data.bookingId || "").trim();
  const amount = Number(data.amount) || 0;
  const method = String(data.method || "").trim();
  const date = String(data.date || "").trim();
  if (!bookingId) throw Error("Pagamento sem agendamento.");
  if (!(amount > 0)) throw Error("Informe um valor de pagamento maior que zero.");
  if (!method) throw Error("Informe a forma de pagamento.");
  if (!date) throw Error("Informe a data do pagamento.");
  const booking = objs(sh("Bookings")).find(x => String(x.id) === bookingId);
  if (!booking) throw Error("Agendamento não encontrado.");
  const existing = objs(ensureSheet("Payments")).filter(x => String(x.bookingId) === bookingId);
  const total = Number(booking.totalAmount) || 0;
  const received = existing.reduce((sum,x) => sum + (Number(x.amount)||0), 0);
  if (total > 0 && received + amount > total + 0.009) throw Error("O pagamento ultrapassa o valor total da reserva.");
  const id = String(data.id || Utilities.getUuid());
  if (row(ensureSheet("Payments"), id)) throw Error("ID já existe.");
  const transaction = create("Transactions", {
    id: Utilities.getUuid(), type:"income", category:"reserva",
    description: data.description || ("Reserva - " + String(booking.residentName || "")),
    amount, date, method, created_date:new Date().toISOString()
  });
  const obj = {id,bookingId,residentId:String(data.residentId || booking.residentId || ""),date,amount,method,description:String(data.description || ""),transactionId:transaction.id,created_date:data.created_date || new Date().toISOString()};
  ensureSheet("Payments").appendRow(H.Payments.map(h => cell(obj[h])));
  return norm(obj,"Payments");
}

function documentsFolder() {
  const name = "AMVF2 - Documentos";
  const it = DriveApp.getFoldersByName(name);
  return it.hasNext() ? it.next() : DriveApp.createFolder(name);
}

function createDocument(data) {
  const d={...data}; delete d.fileData; delete d.fileMime;
  const id=String(d.id||Utilities.getUuid());
  const sheet=ensureSheet("Documents"); if(row(sheet,id)) throw Error("ID já existe.");
  if(!data.fileData) throw Error("Selecione um arquivo.");
  const bytes=Utilities.base64Decode(String(data.fileData));
  if(bytes.length>8*1024*1024) throw Error("O arquivo deve ter no máximo 8 MB.");
  const blob=Utilities.newBlob(bytes,String(data.fileMime||"application/octet-stream"),String(data.fileName||"documento"));
  const file=documentsFolder().createFile(blob);
  const obj={id,title:String(d.title||"Documento"),category:String(d.category||"Outro"),date:String(d.date||Utilities.formatDate(new Date(),Session.getScriptTimeZone()||"America/Sao_Paulo","yyyy-MM-dd")),description:String(d.description||""),fileName:String(data.fileName||file.getName()),fileUrl:file.getUrl(),fileId:file.getId(),meetingId:String(d.meetingId||""),meetingTitle:String(d.meetingTitle||""),created_date:d.created_date||new Date().toISOString()};
  sheet.appendRow(H.Documents.map(h=>cell(obj[h]))); return norm(obj,"Documents");
}

function updateDocument(id,data) {
  const sheet=ensureSheet("Documents"), n=row(sheet,id); if(!n) throw Error("Documento não encontrado.");
  const current=objs(sheet).find(x=>String(x.id)===String(id))||{}; const obj={...current,...data,id:String(id)};
  delete obj.fileData; delete obj.fileMime;
  if(data.fileData){
    const oldId=String(current.fileId||""); if(oldId){try{DriveApp.getFileById(oldId).setTrashed(true);}catch(_) {}}
    const bytes=Utilities.base64Decode(String(data.fileData)); if(bytes.length>8*1024*1024) throw Error("O arquivo deve ter no máximo 8 MB.");
    const blob=Utilities.newBlob(bytes,String(data.fileMime||"application/octet-stream"),String(data.fileName||"documento"));
    const file=documentsFolder().createFile(blob); obj.fileName=file.getName(); obj.fileUrl=file.getUrl(); obj.fileId=file.getId();
  }
  obj.fileName=String(obj.fileName||""); obj.fileUrl=String(obj.fileUrl||""); obj.fileId=String(obj.fileId||"");
  sheet.getRange(n,1,1,H.Documents.length).setValues([H.Documents.map(h=>cell(obj[h]))]); return norm(obj,"Documents");
}

function deleteDocument(id) {
  const sheet=ensureSheet("Documents"), current=objs(sheet).find(x=>String(x.id)===String(id)); if(!current) throw Error("Documento não encontrado.");
  if(current.fileId){try{DriveApp.getFileById(String(current.fileId)).setTrashed(true);}catch(_) {}}
  const n=row(sheet,id); if(n) sheet.deleteRow(n); return {id:String(id)};
}

function deletePayment(id) {
  const sheet=ensureSheet("Payments");
  const current=objs(sheet).find(x=>String(x.id)===String(id));
  if(!current) throw Error("Pagamento não encontrado.");
  if(current.transactionId){
    const txRow=row(sh("Transactions"),current.transactionId);
    if(txRow) sh("Transactions").deleteRow(txRow);
  }
  const n=row(sheet,id);
  if(n) sheet.deleteRow(n);
  return {id:String(id)};
}

function del(entity, id) {
  if (entity === "Payments") return deletePayment(id);
  const sheet = sh(entity);
  const rowNumber = row(sheet,id);
  if (!rowNumber) throw Error("Registro não encontrado.");
  sheet.deleteRow(rowNumber);
  return {id:String(id)};
}

function togglePayment(residentId, data) {
  const month = String(data.month || "").trim();
  const paid = data.paid === true || String(data.paid).toLowerCase() === "true";
  const method = String(data.method || "").trim();
  const paymentDate = String(data.date || "").trim() || Utilities.formatDate(new Date(), Session.getScriptTimeZone() || "America/Sao_Paulo", "yyyy-MM-dd");
  if (!/^\d{4}-\d{2}$/.test(month)) throw Error("Mês inválido. Use AAAA-MM.");
  if (paid && !method) throw Error("Informe a forma de pagamento.");

  const residentSheet = sh("Residents");
  const residentRow = row(residentSheet, residentId);
  if (!residentRow) throw Error("Morador não encontrado.");
  const resident = objs(residentSheet).find(x => String(x.id) === String(residentId));
  if (!resident) throw Error("Morador não encontrado.");
  if (String(resident.exempt).toLowerCase() === "true" || resident.exempt === true) {
    throw Error("Morador isento não possui cobrança de mensalidade.");
  }

  let months = [];
  let paymentIds = {};
  try { months = Array.isArray(resident.paidMonths) ? resident.paidMonths : JSON.parse(resident.paidMonths || "[]"); } catch (_) { months = []; }
  try { paymentIds = (resident.monthlyPaymentIds && typeof resident.monthlyPaymentIds === "object") ? resident.monthlyPaymentIds : JSON.parse(resident.monthlyPaymentIds || "{}"); } catch (_) { paymentIds = {}; }
  months = months.map(String);
  const hasMonth = months.includes(month);
  if (paid && !hasMonth) months.push(month);
  if (!paid) months = months.filter(m => m !== month);

  const paidMonthsColumn = H.Residents.indexOf("paidMonths") + 1;
  const paymentIdsColumn = H.Residents.indexOf("monthlyPaymentIds") + 1;
  residentSheet.getRange(residentRow, paidMonthsColumn).setValue(JSON.stringify(months));

  const txSheet = sh("Transactions");
  const oldDescription = "Taxa mensal - " + String(resident.name || "Morador") + " - " + month;
  const transactions = objs(txSheet);
  let transaction = null;
  const removedTransactionIds = [];

  if (paid) {
    if (!hasMonth) {
      const amount = Number(data.amount) || Number(readSettings().taxaMensal) || 0;
      const created = create("Transactions", {
        id:Utilities.getUuid(),
        type:"income", category:"taxa",
        description:String(resident.name || "Morador"),
        amount, date:paymentDate, method,
        created_date:new Date().toISOString()
      });
      transaction = created;
      paymentIds[month] = String(created.id);
    }
  } else {
    const linkedId = String(paymentIds[month] || "").trim();
    let removed = false;

    // Primeiro tenta remover pelo ID vinculado ao mês.
    if (linkedId) {
      const n = row(txSheet, linkedId);
      if (n) {
        txSheet.deleteRow(n);
        removedTransactionIds.push(linkedId);
        removed = true;
      }
      delete paymentIds[month];
    }

    // Fallback para mensalidades gravadas antes da vinculação por ID ou
    // quando o vínculo foi perdido: procura a entrada daquele morador
    // na mesma competência. Assim o estorno não deixa a entrada no Financeiro.
    if (!removed) {
      const residentName = String(resident.name || "Morador").trim();
      const matches = transactions.filter(t => {
        if (String(t.category) !== "taxa" || String(t.type) !== "income") return false;
        const description = String(t.description || "").trim();
        const txMonth = String(t.date || "").slice(0, 7);
        return txMonth === month && (
          description === residentName ||
          description === oldDescription
        );
      });

      // Deve existir no máximo uma mensalidade por morador/mês.
      const target = matches[0];
      if (target && target.id) {
        const n = row(txSheet, target.id);
        if (n) {
          txSheet.deleteRow(n);
          removedTransactionIds.push(String(target.id));
        }
      }
    }
  }

  if (paymentIdsColumn > 0) residentSheet.getRange(residentRow, paymentIdsColumn).setValue(JSON.stringify(paymentIds));
  const updatedResident = norm({...resident, paidMonths:months, monthlyPaymentIds:paymentIds}, "Residents");
  return {resident:updatedResident, transaction, removedTransactionIds};
}

function logAudit(p, result, session) {
  try {
    const action=String(p.action||"").toLowerCase();
    if (!action || action === "read") return;
    const settings=readSettings();
    const entity=String(p.entity||"System");
    const id=String(p.id || p.data?.id || result?.id || result?.transaction?.id || "");
    const d=p.data||{};
    let label=entity;
    if(entity==="Residents") label=String(d.name||result?.resident?.name||"Morador");
    else if(entity==="Transactions") label=String(d.description||"Lançamento financeiro");
    else if(entity==="Bookings") label=String(d.residentName||"Reserva");
    else if(entity==="Payments") label=String(d.description||"Pagamento de reserva");
    else if(entity==="Meetings") label=String(d.title||"Reunião / Assembleia");
    else if(entity==="Assets") label=String(d.name||"Patrimônio");
    else if(entity==="Documents") label=String(d.title||"Documento");
    let verb=action==="create"?"Cadastro":action==="update"?"Alteração":action==="delete"?"Exclusão":action==="togglepayment"?(d.paid?"Mensalidade registrada":"Estorno de mensalidade"):action;
    const amount=Number(d.amount||result?.amount||result?.transaction?.amount||0)||0;
    const description=`${verb} — ${label}${d.month?` — ${d.month}`:""}`;
    ensureSheet("Audit").appendRow(H.Audit.map(h=>cell({id:Utilities.getUuid(),date:new Date().toISOString(),actor:String(session?.name||settings.responsavel||"Diretoria"),action:verb,entity,entityId:id,description,amount:h==="amount"?amount:undefined}[h])));
  } catch (_) {}
}

function restoreBackup(data) {
  if (!data || typeof data !== "object") throw Error("Backup inválido.");

  // A restauração é feita diretamente nas abas, sem usar create("Payments"),
  // porque createPayment() cria um lançamento financeiro automaticamente e isso
  // duplicaria os Transactions que já estão presentes no backup.
  replaceSheetData("Transactions", Array.isArray(data.transactions) ? data.transactions : []);
  replaceSheetData("Bookings", Array.isArray(data.bookings) ? data.bookings : []);
  replaceSheetData("Residents", Array.isArray(data.residents) ? data.residents : []);
  replaceSheetData("Payments", Array.isArray(data.payments) ? data.payments : []);
  replaceSheetData("Meetings", Array.isArray(data.meetings) ? data.meetings : []);
  replaceSheetData("Assets", Array.isArray(data.assets) ? data.assets : []);
  replaceSheetData("Documents", Array.isArray(data.documents) ? data.documents : []);
  restoreSettingsFromBackup(data.settings || {});

  SpreadsheetApp.flush();
  return all();
}

function replaceSheetData(entity, items) {
  const sheet = ensureSheet(entity);
  const width = H[entity].length;
  const lastRow = sheet.getLastRow();
  if (lastRow > 1) sheet.getRange(2, 1, lastRow - 1, width).clearContent();
  if (!items.length) return;

  const now = new Date().toISOString();
  const rows = items.map(raw => {
    const obj = {...raw};
    obj.id = String(obj.id || Utilities.getUuid());
    obj.created_date = obj.created_date || now;

    if (entity === "Residents") {
      let months = obj.paidMonths;
      let ids = obj.monthlyPaymentIds;
      try { months = Array.isArray(months) ? months : JSON.parse(months || "[]"); } catch (_) { months = []; }
      try { ids = (ids && typeof ids === "object") ? ids : JSON.parse(ids || "{}"); } catch (_) { ids = {}; }
      obj.paidMonths = JSON.stringify(Array.isArray(months) ? months : []);
      obj.monthlyPaymentIds = JSON.stringify(ids && typeof ids === "object" ? ids : {});
    }

    return H[entity].map(h => cell(obj[h]));
  });

  sheet.getRange(2, 1, rows.length, width).setValues(rows);
}

function restoreSettingsFromBackup(data) {
  const sheet = ensureSheet("Settings");
  const lastRow = sheet.getLastRow();
  if (lastRow > 1) sheet.getRange(2, 1, lastRow - 1, 2).clearContent();

  const associacao = String(data.associacao || "Associação de Moradores do Vila Floresta 2");
  const taxa = Number(String(data.taxaMensal ?? 50).replace(",", ".")) || 0;
  sheet.getRange(2, 1, 3, 2).setValues([
    ["associacao", associacao],
    ["taxaMensal", String(taxa)],
    ["responsavel", String(data.responsavel || "Diretoria")]
  ]);
}

function settings(data) {
  const sheet = sh("Settings");
  sheet.clear();
  sheet.getRange(1,1,1,2).setValues([H.Settings]);
  sheet.getRange(2,1,3,2).setValues([
    ["associacao",String(data.associacao || "Associação de Moradores do Vila Floresta 2")],
    ["taxaMensal",String(data.taxaMensal ?? 50)],
    ["responsavel",String(data.responsavel || "Diretoria")]
  ]);
  return readSettings();
}

function readSettings() {
  const result = {associacao:"Associação de Moradores do Vila Floresta 2", taxaMensal:50, responsavel:"Diretoria"};
  objs(sh("Settings")).forEach(row => {
    if (row.key === "associacao") result.associacao = String(row.value || result.associacao);
    if (row.key === "taxaMensal") result.taxaMensal = Number(String(row.value).replace(",",".")) || 0;
    if (row.key === "responsavel") result.responsavel = String(row.value || result.responsavel);
  });
  return result;
}

function all() {
  return {
    transactions:objs(sh("Transactions")).map(x => norm(x,"Transactions")),
    payments:objs(ensureSheet("Payments")).map(x => norm(x,"Payments")),
    bookings:objs(ensureBookingSheet()).map(x => norm(x,"Bookings")),
    residents:objs(sh("Residents")).map(x => norm(x,"Residents")),
    settings:readSettings(),
    audit:objs(ensureSheet("Audit")).map(x => norm(x,"Audit")),
    meetings:objs(ensureSheet("Meetings")).map(x => norm(x,"Meetings")),
    assets:objs(ensureSheet("Assets")).map(x => norm(x,"Assets")),
    documents:objs(ensureSheet("Documents")).map(x => norm(x,"Documents")),
    users:objs(ensureSheet("Users")).map(sanitizeUser)
  };
}

function norm(obj, entity) {
  const x = {...obj};
  if (entity === "Residents") {
    x.exempt = String(obj.exempt).toLowerCase() === "true" || obj.exempt === true;
    try {
      x.paidMonths = Array.isArray(obj.paidMonths) ? obj.paidMonths : JSON.parse(obj.paidMonths || "[]");
    } catch (_) {
      x.paidMonths = [];
    }
    try {
      x.monthlyPaymentIds = (obj.monthlyPaymentIds && typeof obj.monthlyPaymentIds === "object") ? obj.monthlyPaymentIds : JSON.parse(obj.monthlyPaymentIds || "{}");
    } catch (_) {
      x.monthlyPaymentIds = {};
    }
  }
  if (x.amount !== undefined) x.amount = Number(x.amount) || 0;
  return x;
}

function cell(value) {
  if (value === undefined || value === null) return "";
  if (Array.isArray(value)) return JSON.stringify(value);
  if (typeof value === "boolean") return value ? "TRUE" : "FALSE";
  return value;
}

function out(value) {
  return ContentService.createTextOutput(JSON.stringify(value)).setMimeType(ContentService.MimeType.JSON);
}
