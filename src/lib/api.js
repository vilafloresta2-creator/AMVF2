import{API_URL}from"../config";import{uid}from"./utils";async function req(p){let r=await fetch(API_URL,{method:"POST",cache:"no-store",headers:{"Content-Type":"text/plain;charset=utf-8"},body:JSON.stringify(p)}),j=await r.json();if(!j.ok)throw Error(j.error||"Erro na API.");return j.data}export async function getAll(){
  const url = API_URL + (API_URL.includes("?") ? "&" : "?") + "action=read&t=" + Date.now();
  const r = await fetch(url,{method:"GET",cache:"no-store"});
  const j = await r.json();
  if(!j.ok) throw Error(j.error||"Erro na API.");
  return j.data;
}export const create=(entity,data)=>req({entity,action:"create",data:{...data,id:data.id||uid()}});export const update=(entity,id,data)=>req({entity,action:"update",id,data});export const remove=(entity,id)=>req({entity,action:"delete",id});export const saveSettings=settings=>req({entity:"Settings",action:"saveSettings",data:settings});
export const togglePayment=(residentId,month,paid,method="",date="",amount="")=>req({entity:"Residents",action:"togglePayment",id:residentId,data:{month,paid,method,date,amount}});
