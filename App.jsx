import React, {useEffect, useMemo, useState} from "react";
import {Routes, Route, NavLink, useLocation, useNavigate} from "react-router-dom";
import {
  Home, WalletCards, CalendarDays, Users, Settings, Plus, Download,
  Search, ChevronLeft, ChevronRight, Pencil, Trash2, CheckCircle2,
  Clock3, X, Save, Upload, RefreshCw, FileSpreadsheet, CircleDollarSign,
  Menu, ShieldCheck
} from "lucide-react";
import {list, save, remove, loadAll, saveSettings, isOnlineBackend} from "./api";
import {CATEGORY_LABELS, TIME_SLOTS, brl, dateBR, todayISO, monthKeyNow, monthLabel, monthFull, addMonths, escapeCSV} from "./utils";
import {downloadBackup, readBackup} from "./backup";

const NAV = [
  ["/","Início",Home],
  ["/financeiro","Financeiro",WalletCards],
  ["/agendamentos","Agendamentos",CalendarDays],
  ["/moradores","Moradores",Users],
  ["/configuracoes","Configurações",Settings]
];

function Layout({children, settings}) {
  const loc = useLocation();
  const [mobileMenu,setMobileMenu] = useState(false);
  return <div className="app-shell">
    <aside className="sidebar">
      <div className="brand">
        <div className="brand-mark"><ShieldCheck size={22}/></div>
        <div><b>Bairro Unido</b><small>Associação de Moradores</small></div>
      </div>
      <nav>{NAV.map(([to,label,Icon]) =>
        <NavLink key={to} to={to} className={({isActive})=>isActive?"nav-item active":"nav-item"}>
          <Icon size={19}/><span>{label}</span>
        </NavLink>
      )}</nav>
      <div className="offline-badge"><span className={isOnlineBackend()?"dot online":"dot"}></span>{isOnlineBackend()?"Sincronização ativa":"Salvo neste dispositivo"}</div>
    </aside>
    <header className="mobile-header">
      <button className="icon-btn" onClick={()=>setMobileMenu(!mobileMenu)}><Menu/></button>
      <div className="mobile-title">{settings.associacao}</div>
      <div className="brand-mark small"><ShieldCheck size={18}/></div>
    </header>
    {mobileMenu && <div className="mobile-menu">{NAV.map(([to,label,Icon]) =>
      <NavLink key={to} to={to} onClick={()=>setMobileMenu(false)} className={({isActive})=>isActive?"nav-item active":"nav-item"}><Icon size={19}/>{label}</NavLink>
    )}</div>}
    <main className="main">{children}</main>
    <div className="bottom-nav">{NAV.map(([to,label,Icon]) =>
      <NavLink key={to} to={to} className={({isActive})=>isActive?"bottom-item active":"bottom-item"}><Icon size={19}/><span>{label}</span></NavLink>
    )}</div>
  </div>
}

function Modal({title,onClose,children,wide=false}) {
  return <div className="overlay" onMouseDown={e=>{if(e.target===e.currentTarget)onClose()}}>
    <div className={`modal ${wide?"wide":""}`}>
      <div className="modal-head"><h3>{title}</h3><button className="icon-btn" onClick={onClose}><X/></button></div>
      {children}
    </div>
  </div>
}

function Field({label,children}) { return <label className="field"><span>{label}</span>{children}</label> }

function App() {
  const [data,setData]=useState({transactions:[],bookings:[],residents:[],settings:{associacao:"Associação Bairro Unido",taxaMensal:50}});
  const [loading,setLoading]=useState(true);
  useEffect(()=>{loadAll().then(setData).finally(()=>setLoading(false))},[]);
  const refresh = async()=>setData(await loadAll());
  const ctx={data,setData,refresh};
  return <Layout settings={data.settings}>
    {loading ? <div className="loading">Carregando sistema…</div> :
      <Routes>
        <Route path="/" element={<HomePage {...ctx}/>}/>
        <Route path="/financeiro" element={<Financeiro {...ctx}/>}/>
        <Route path="/agendamentos" element={<Agendamentos {...ctx}/>}/>
        <Route path="/moradores" element={<Moradores {...ctx}/>}/>
        <Route path="/configuracoes" element={<Configuracoes {...ctx}/>}/>
      </Routes>}
  </Layout>
}

function HomePage({data,refresh}) {
  const nav=useNavigate();
  const income=data.transactions.filter(t=>t.type==="income").reduce((s,t)=>s+Number(t.amount),0);
  const expense=data.transactions.filter(t=>t.type==="expense").reduce((s,t)=>s+Number(t.amount),0);
  const balance=income-expense;
  const tax=data.transactions.filter(t=>t.type==="income"&&t.category==="taxa").reduce((s,t)=>s+Number(t.amount),0);
  const [month,setMonth]=useState(monthKeyNow());
  const [selected,setSelected]=useState(null);
  const bookings=data.bookings;
  const calendar=calendarDays(month);
  const statusFor=(day)=>{
    const iso=`${month}-${String(day).padStart(2,"0")}`;
    const b=bookings.filter(x=>x.date===iso);
    return b.some(x=>x.status==="booked")?"booked":b.some(x=>x.status==="pending")?"pending":"free";
  };
  return <div className="page">
    <div className="page-top">
      <div><div className="eyebrow">Bem-vindo de volta</div><h1>{data.settings.associacao}</h1></div>
      <div className="top-actions"><span className="cash-pill"><CircleDollarSign size={17}/> Caixa: {brl(balance)}</span><button className="primary" onClick={()=>nav("/financeiro")}><Plus size={18}/> Novo Lançamento</button></div>
    </div>
    <div className="home-grid">
      <section className="calendar-card card">
        <div className="section-head"><h2><CalendarDays size={19}/> Sala Comunitária</h2><button className="ghost" onClick={()=>nav("/agendamentos")}><Plus size={16}/> Agendar</button></div>
        <div className="calendar-title"><button className="icon-btn" onClick={()=>setMonth(addMonths(month,-1))}><ChevronLeft/></button><b>{monthFull(month)}</b><button className="icon-btn" onClick={()=>setMonth(addMonths(month,1))}><ChevronRight/></button></div>
        <div className="calendar-week">{["DOM","SEG","TER","QUA","QUI","SEX","SÁB"].map(x=><span key={x}>{x}</span>)}</div>
        <div className="calendar-grid">{calendar.map((d,i)=>d?<button key={i} className={`day ${statusFor(d)} ${selected===d?"selected":""}`} onClick={()=>setSelected(d)}><span>{d}</span></button>:<span key={i}/>)}</div>
        <div className="legend"><span><i className="legend-dot free"></i>Livre</span><span><i className="legend-dot pending"></i>Pendente</span><span><i className="legend-dot booked"></i>Reservado</span></div>
      </section>
      <section className="home-side">
        <div className="metric big"><small>SALDO ATUAL</small><strong>{brl(balance)}</strong><div><span className="income">↗ {brl(income)}</span><span className="expense">↘ {brl(expense)}</span></div></div>
        <div className="metric"><div className="metric-head"><small>LANÇAMENTOS RECENTES</small><button className="link" onClick={()=>nav("/financeiro")}>+ Adicionar</button></div>
          {data.transactions.length===0?<div className="empty">Nenhum lançamento ainda</div>:
          <div className="mini-list">{[...data.transactions].sort((a,b)=>(b.date||"").localeCompare(a.date||"")).slice(0,5).map(t=><div className="mini-row" key={t.id}><div><b>{t.description||CATEGORY_LABELS[t.category]}</b><small>{dateBR(t.date)}</small></div><strong className={t.type==="income"?"income":"expense"}>{t.type==="income"?"+":"-"} {brl(t.amount)}</strong></div>)}</div>}
        </div>
        <div className="metric"><small>TAXA MENSAL</small><p>Receitas de taxa mensal: <b>{brl(tax)}</b></p></div>
      </section>
    </div>
  </div>
}

function calendarDays(key){
  const [y,m]=key.split("-").map(Number);
  const first=new Date(y,m-1,1).getDay();
  const total=new Date(y,m,0).getDate();
  return [...Array(first).fill(null),...Array.from({length:total},(_,i)=>i+1)];
}

function Financeiro({data,refresh}) {
  const [type,setType]=useState("all"),[search,setSearch]=useState(""),[month,setMonth]=useState(monthKeyNow()),[open,setOpen]=useState(false),[edit,setEdit]=useState(null);
  const items=useMemo(()=>data.transactions.filter(t=>(type==="all"||t.type===type)&&(t.description||CATEGORY_LABELS[t.category]).toLowerCase().includes(search.toLowerCase())).sort((a,b)=>(b.date||"").localeCompare(a.date||"")),[data.transactions,type,search]);
  const income=data.transactions.filter(t=>t.type==="income").reduce((s,t)=>s+Number(t.amount),0);
  const expense=data.transactions.filter(t=>t.type==="expense").reduce((s,t)=>s+Number(t.amount),0);
  const exportCSV=()=>{
    const f=data.transactions.filter(t=>(t.date||"").slice(0,7)===month).sort((a,b)=>(a.date||"").localeCompare(b.date||""));
    if(!f.length){alert(`Nenhum lançamento em ${monthLabel(month)}`);return;}
    const inc=f.filter(t=>t.type==="income").reduce((s,t)=>s+Number(t.amount),0), exp=f.filter(t=>t.type==="expense").reduce((s,t)=>s+Number(t.amount),0);
    const rows=[["Data","Tipo","Categoria","Descrição","Valor (R$)"],...f.map(t=>[dateBR(t.date),t.type==="income"?"Receita":"Despesa",CATEGORY_LABELS[t.category]||t.category,t.description||"",Number(t.amount).toFixed(2).replace(".",",")]),[],["RESUMO DO MÊS"],["Total de Receitas","","","",inc.toFixed(2).replace(".",",")],["Total de Despesas","","","",exp.toFixed(2).replace(".",",")],["Saldo Final","","","",(inc-exp).toFixed(2).replace(".",",")],["Quantidade de lançamentos","","","",String(f.length)]];
    const csv="\uFEFF"+rows.map(r=>r.map(escapeCSV).join(";")).join("\r\n");
    const a=document.createElement("a");a.href=URL.createObjectURL(new Blob([csv],{type:"text/csv;charset=utf-8"}));a.download=`lancamentos_financeiros_${month}.csv`;a.click();
  };
  const del=async id=>{if(confirm("Excluir este lançamento?")){await remove("transactions",id);await refresh()}};
  return <div className="page"><div className="page-title"><div><h1>Financeiro</h1><p>Controle de receitas e despesas da associação</p></div><div className="top-actions"><input className="month-input" type="month" value={month} onChange={e=>setMonth(e.target.value)}/><button className="secondary" onClick={exportCSV}><Download size={17}/> Exportar Excel</button><button className="primary" onClick={()=>{setEdit(null);setOpen(true)}}><Plus size={18}/> Novo Lançamento</button></div></div>
    <div className="stats three"><div className="stat green"><small>SALDO</small><strong>{brl(income-expense)}</strong></div><div className="stat"><small>RECEITAS</small><strong className="income">{brl(income)}</strong></div><div className="stat"><small>DESPESAS</small><strong className="expense">{brl(expense)}</strong></div></div>
    <div className="toolbar"><div className="tabs">{[["all","Todos"],["income","Receitas"],["expense","Despesas"]].map(x=><button key={x[0]} className={type===x[0]?"tab active":"tab"} onClick={()=>setType(x[0])}>{x[1]}</button>)}</div><div className="search"><Search size={17}/><input placeholder="Buscar…" value={search} onChange={e=>setSearch(e.target.value)}/></div></div>
    <div className="table-card card">{items.length===0?<div className="empty large">Nenhum lançamento encontrado</div>:<div className="table-wrap"><table><thead><tr><th>Data</th><th>Descrição</th><th>Categoria</th><th>Tipo</th><th>Valor</th><th></th></tr></thead><tbody>{items.map(t=><tr key={t.id}><td>{dateBR(t.date)}</td><td><b>{t.description||"Sem descrição"}</b></td><td>{CATEGORY_LABELS[t.category]}</td><td><span className={`pill ${t.type}`}>{t.type==="income"?"Receita":"Despesa"}</span></td><td className={t.type==="income"?"income":"expense"}>{brl(t.amount)}</td><td className="actions"><button onClick={()=>{setEdit(t);setOpen(true)}}><Pencil size={16}/></button><button onClick={()=>del(t.id)}><Trash2 size={16}/></button></td></tr>)}</tbody></table></div>}</div>
    {open&&<TransactionModal item={edit} onClose={()=>setOpen(false)} onSaved={async()=>{setOpen(false);await refresh()}}/>}
  </div>
}

function TransactionModal({item,onClose,onSaved}){
  const [form,setForm]=useState(item||{type:"income",category:"taxa",description:"",amount:"",date:todayISO()});
  const set=(k,v)=>setForm(f=>({...f,[k]:v}));
  const submit=async e=>{e.preventDefault();const amount=Number(String(form.amount).replace(",","."));if(!amount||amount<=0)return alert("Informe um valor maior que zero.");if(!form.date)return alert("Informe a data.");await save("transactions",{...form,amount},item?.id);await onSaved()};
  return <Modal title={item?"Editar lançamento":"Novo lançamento"} onClose={onClose}><form onSubmit={submit}><div className="form-grid"><Field label="Tipo"><select value={form.type} onChange={e=>set("type",e.target.value)}><option value="income">Receita</option><option value="expense">Despesa</option></select></Field><Field label="Categoria"><select value={form.category} onChange={e=>set("category",e.target.value)}>{Object.entries(CATEGORY_LABELS).map(([k,v])=><option key={k} value={k}>{v}</option>)}</select></Field><Field label="Valor"><input inputMode="decimal" value={form.amount} onChange={e=>set("amount",e.target.value)} placeholder="0,00" required/></Field><Field label="Data"><input type="date" value={form.date} onChange={e=>set("date",e.target.value)} required/></Field><Field label="Descrição"><input value={form.description} onChange={e=>set("description",e.target.value)} placeholder="Descrição do lançamento"/></Field></div><div className="modal-actions"><button type="button" className="secondary" onClick={onClose}>Cancelar</button><button className="primary"><Save size={17}/> Salvar</button></div></form></Modal>
}

function Agendamentos({data,refresh}){
  const [month,setMonth]=useState(monthKeyNow()),[selected,setSelected]=useState(todayISO()),[open,setOpen]=useState(false),[edit,setEdit]=useState(null);
  const days=calendarDays(month);
  const dayBookings=data.bookings.filter(b=>b.date===selected).sort((a,b)=>TIME_SLOTS.indexOf(a.timeSlot)-TIME_SLOTS.indexOf(b.timeSlot));
  const del=async id=>{if(confirm("Excluir esta reserva?")){await remove("bookings",id);await refresh()}};
  const status=d=>{const iso=`${month}-${String(d).padStart(2,"0")}`, b=data.bookings.filter(x=>x.date===iso);return b.some(x=>x.status==="booked")?"booked":b.some(x=>x.status==="pending")?"pending":"free"};
  return <div className="page"><div className="page-title"><div><h1>Agendamentos</h1><p>Controle da sala comunitária</p></div><button className="primary" onClick={()=>{setEdit(null);setOpen(true)}}><Plus size={18}/> Agendar</button></div>
    <div className="booking-layout"><section className="calendar-card card"><div className="calendar-title"><button className="icon-btn" onClick={()=>setMonth(addMonths(month,-1))}><ChevronLeft/></button><b>{monthFull(month)}</b><button className="icon-btn" onClick={()=>setMonth(addMonths(month,1))}><ChevronRight/></button></div><div className="calendar-week">{["DOM","SEG","TER","QUA","QUI","SEX","SÁB"].map(x=><span key={x}>{x}</span>)}</div><div className="calendar-grid">{days.map((d,i)=>d?<button key={i} className={`day ${status(d)} ${selected===`${month}-${String(d).padStart(2,"0")}`?"selected":""}`} onClick={()=>setSelected(`${month}-${String(d).padStart(2,"0")}`)}>{d}</button>:<span key={i}/>)}</div><div className="legend"><span><i className="legend-dot free"></i>Livre</span><span><i className="legend-dot pending"></i>Pendente</span><span><i className="legend-dot booked"></i>Reservado</span></div></section>
    <section className="card reservations"><div className="section-head"><h2>Reservas de {dateBR(selected)}</h2><button className="ghost" onClick={()=>{setEdit(null);setOpen(true)}}><Plus size={16}/> Agendar</button></div>{dayBookings.length===0?<div className="empty">Nenhuma reserva neste dia.</div>:dayBookings.map(b=><div className="reservation" key={b.id}><div className="reservation-time">{b.timeSlot}</div><div className="reservation-main"><b>{b.residentName}</b><span>{b.purpose||"Sem finalidade"} {b.contact&&`• ${b.contact}`}</span></div><span className={`pill ${b.status}`}>{b.status==="booked"?"Confirmado":"Pendente"}</span><div className="actions"><button onClick={()=>{setEdit(b);setOpen(true)}}><Pencil size={16}/></button><button onClick={()=>del(b.id)}><Trash2 size={16}/></button></div></div>)}</section></div>
    <section className="card all-bookings"><div className="section-head"><h2>Todas as reservas</h2></div>{[...data.bookings].sort((a,b)=>(a.date+a.timeSlot).localeCompare(b.date+b.timeSlot)).map(b=><div className="list-row" key={b.id}><span>{dateBR(b.date)}</span><b>{b.residentName}</b><span>{b.timeSlot}</span><span className={`pill ${b.status}`}>{b.status==="booked"?"Confirmado":"Pendente"}</span></div>)}</section>
    {open&&<BookingModal item={edit} residents={data.residents} defaultDate={selected} onClose={()=>setOpen(false)} onSaved={async()=>{setOpen(false);await refresh()}}/>}
  </div>
}

function BookingModal({item,residents,defaultDate,onClose,onSaved}){
  const [form,setForm]=useState(item||{residentName:"",contact:"",purpose:"",date:defaultDate,timeSlot:TIME_SLOTS[0],status:"pending"});
  const set=(k,v)=>setForm(f=>({...f,[k]:v}));
  const submit=async e=>{e.preventDefault();if(!form.residentName.trim()||!form.date)return alert("Informe o morador e a data.");await save("bookings",form,item?.id);await onSaved()};
  return <Modal title={item?"Editar agendamento":"Novo agendamento"} onClose={onClose}><form onSubmit={submit}><div className="form-grid"><Field label="Morador"><input list="resident-list" value={form.residentName} onChange={e=>set("residentName",e.target.value)} required/><datalist id="resident-list">{residents.map(r=><option key={r.id} value={r.name}/>)}</datalist></Field><Field label="Contato"><input value={form.contact} onChange={e=>set("contact",e.target.value)}/></Field><Field label="Data"><input type="date" value={form.date} onChange={e=>set("date",e.target.value)} required/></Field><Field label="Horário"><select value={form.timeSlot} onChange={e=>set("timeSlot",e.target.value)}>{TIME_SLOTS.map(x=><option key={x}>{x}</option>)}</select></Field><Field label="Finalidade"><input value={form.purpose} onChange={e=>set("purpose",e.target.value)} placeholder="Reunião, aniversário…"/></Field><Field label="Status"><select value={form.status} onChange={e=>set("status",e.target.value)}><option value="pending">Pendente</option><option value="booked">Confirmado</option></select></Field></div><div className="modal-actions"><button type="button" className="secondary" onClick={onClose}>Cancelar</button><button className="primary"><Save size={17}/> Salvar</button></div></form></Modal>
}

function Moradores({data,refresh}){
  const [month,setMonth]=useState(monthKeyNow()),[search,setSearch]=useState(""),[open,setOpen]=useState(false),[edit,setEdit]=useState(null);
  const active=data.residents.filter(r=>!r.exempt), paid=active.filter(r=>(r.paidMonths||[]).includes(month)).length;
  const expected=active.length*Number(data.settings.taxaMensal||0), collected=paid*Number(data.settings.taxaMensal||0);
  const items=data.residents.filter(r=>r.name.toLowerCase().includes(search.toLowerCase())).sort((a,b)=>a.name.localeCompare(b.name));
  const toggle=async r=>{if(r.exempt)return;const setM=new Set(r.paidMonths||[]);setM.has(month)?setM.delete(month):setM.add(month);await save("residents",{...r,paidMonths:[...setM]},r.id);await refresh()};
  const del=async id=>{if(confirm("Excluir este morador?")){await remove("residents",id);await refresh()}};
  return <div className="page"><div className="page-title"><div><h1>Moradores</h1><p>Cadastro e controle da taxa mensal</p></div><button className="primary" onClick={()=>{setEdit(null);setOpen(true)}}><Plus size={18}/> Novo Morador</button></div>
    <div className="stats four"><div className="stat"><small>TOTAL</small><strong>{active.length}</strong></div><div className="stat green"><small>PAGOS</small><strong>{paid}</strong></div><div className="stat red"><small>PENDENTES</small><strong>{Math.max(active.length-paid,0)}</strong></div><div className="stat"><small>ARRECADADO</small><strong>{brl(collected)}</strong><small>Esperado: {brl(expected)}</small></div></div>
    <div className="toolbar"><div className="month-nav"><button className="icon-btn" onClick={()=>setMonth(addMonths(month,-1))}><ChevronLeft/></button><b>{monthFull(month)}</b><button className="icon-btn" onClick={()=>setMonth(addMonths(month,1))}><ChevronRight/></button></div><div className="search"><Search size={17}/><input placeholder="Buscar morador…" value={search} onChange={e=>setSearch(e.target.value)}/></div></div>
    <div className="resident-list card">{items.length===0?<div className="empty large">Nenhum morador encontrado</div>:items.map(r=><div className="resident-row" key={r.id}><div className="avatar">{r.name.charAt(0).toUpperCase()}</div><div className="resident-main"><b>{r.name}</b><span>{r.house||"Endereço não informado"} {r.phone&&`• ${r.phone}`}</span></div><div>{r.exempt?<span className="pill exempt">Isento</span>:<button className={`payment ${r.paidMonths?.includes(month)?"paid":"pending"}`} onClick={()=>toggle(r)}>{r.paidMonths?.includes(month)?<CheckCircle2 size={16}/>:<Clock3 size={16}/>} {r.paidMonths?.includes(month)?"Pago":"Pendente"}</button>}</div><div className="actions"><button onClick={()=>{setEdit(r);setOpen(true)}}><Pencil size={16}/></button><button onClick={()=>del(r.id)}><Trash2 size={16}/></button></div></div>)}</div>
    {open&&<ResidentModal item={edit} onClose={()=>setOpen(false)} onSaved={async()=>{setOpen(false);await refresh()}}/>}
  </div>
}

function ResidentModal({item,onClose,onSaved}){
  const [form,setForm]=useState(item||{name:"",house:"",phone:"",email:"",notes:"",exempt:false,paidMonths:[]});
  const set=(k,v)=>setForm(f=>({...f,[k]:v}));
  const submit=async e=>{e.preventDefault();if(!form.name.trim())return alert("Informe o nome do morador.");await save("residents",{...form,exempt:Boolean(form.exempt),paidMonths:item?.paidMonths||[]},item?.id);await onSaved()};
  return <Modal title={item?"Editar morador":"Novo morador"} onClose={onClose}><form onSubmit={submit}><div className="form-grid"><Field label="Nome"><input value={form.name} onChange={e=>set("name",e.target.value)} required/></Field><Field label="Casa / endereço"><input value={form.house} onChange={e=>set("house",e.target.value)}/></Field><Field label="Telefone / WhatsApp"><input value={form.phone} onChange={e=>set("phone",e.target.value)}/></Field><Field label="E-mail"><input type="email" value={form.email} onChange={e=>set("email",e.target.value)}/></Field><Field label="Observações"><textarea value={form.notes} onChange={e=>set("notes",e.target.value)}/></Field><label className="check"><input type="checkbox" checked={!!form.exempt} onChange={e=>set("exempt",e.target.checked)}/><span>Isento da taxa mensal</span></label></div><div className="modal-actions"><button type="button" className="secondary" onClick={onClose}>Cancelar</button><button className="primary"><Save size={17}/> Salvar</button></div></form></Modal>
}

function Configuracoes({data,setData,refresh}){
  const [form,setForm]=useState(data.settings);
  const [busy,setBusy]=useState(false);
  const saveCfg=async e=>{e.preventDefault();setBusy(true);const settings=await saveSettings(form);setData(d=>({...d,settings}));setBusy(false);alert("Configurações salvas.")};
  const backup=()=>downloadBackup(data);
  const restore=async e=>{const file=e.target.files?.[0];if(!file)return;try{const d=await readBackup(file);localStorage.setItem("abu_transactions",JSON.stringify(d.transactions||[]));localStorage.setItem("abu_bookings",JSON.stringify(d.bookings||[]));localStorage.setItem("abu_residents",JSON.stringify(d.residents||[]));localStorage.setItem("abu_settings",JSON.stringify([{key:"associacao",value:d.settings?.associacao||"Associação Bairro Unido"},{key:"taxaMensal",value:d.settings?.taxaMensal||0}]));await refresh();alert("Backup restaurado.");}catch(err){alert(err.message)}e.target.value=""};
  return <div className="page narrow"><div className="page-title"><div><h1>Configurações</h1><p>Dados e manutenção do sistema</p></div></div>
    <section className="card config-card"><div className="section-head"><h2>Associação</h2></div><form onSubmit={saveCfg}><Field label="Nome da associação"><input value={form.associacao} onChange={e=>setForm(f=>({...f,associacao:e.target.value}))}/></Field><Field label="Valor da taxa mensal"><input inputMode="decimal" value={form.taxaMensal} onChange={e=>setForm(f=>({...f,taxaMensal:e.target.value}))}/></Field><button className="primary">{busy?<RefreshCw className="spin"/>:<Save size={17}/>} Salvar configurações</button></form></section>
    <section className="card config-card"><div className="section-head"><h2>Backup e restauração</h2></div><p className="muted">Exporte uma cópia completa dos dados ou restaure um arquivo anterior.</p><div className="config-actions"><button className="secondary" onClick={backup}><Download size={17}/> Exportar Backup JSON</button><label className="secondary file-button"><Upload size={17}/> Restaurar Backup<input type="file" accept=".json,application/json" onChange={restore}/></label></div></section>
    <section className="card config-card"><div className="section-head"><h2>Publicação gratuita</h2></div><p className="muted">O frontend pode ser publicado no GitHub Pages. Para sincronizar com Google Sheets, coloque a URL do Apps Script em <code>src/config.js</code> antes do build.</p><div className="info-box">O aplicativo continua funcionando localmente mesmo sem a API configurada. Quando a API estiver configurada, os dados são enviados ao Google Sheets e o cache local serve como fallback.</div></section>
  </div>
}

export default App;
