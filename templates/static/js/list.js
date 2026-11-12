"use strict";
/* หน้ารายการข้อมูล: teams / players / staff / gear / lib / tours / results
   แต่ละไฟล์ HTML กำหนด data-page เป็นชื่อตาราง แล้วใช้สคริปต์นี้ร่วมกัน */
const tab=PAGE;
let q="",pl="all",pt="",gt="all";
const IMG={};
const dlg=document.getElementById("dlg");

function gimg(g){const f=a=>(a.find(x=>x.img&&norm(x.name)===norm(g.name))||{}).img;return g.img||f(S.gear)||f(S.lib)||""}
const inLeague=t=>pl==="all"||(pl==="SEA"?/\(SEA\)/.test(t.region):t.region.includes("VCT "+pl));
const tm=id=>{const t=S.teams.find(x=>x.id===id);if(!t)return pl==="all"&&!pt;return inLeague(t)&&(!pt||pt===id)};

function cell(c,r){const[k,,ty]=c,v=r[k];
 if(ty==="ag")return esc((v||[]).map(x=>x.n).join(", "))||"—";
 if(ty.startsWith("ref"))return esc(nm(ty.split(":")[1],v));
 if(ty==="date")return fd(v);
 if(ty==="num")return(k==="prize"||k==="cost")?Number(v||0).toLocaleString("th-TH"):k==="price"?(v?"$"+esc(v):"—"):esc(v);
 if(k==="status")return`<span class="tag ${v==="พร้อมใช้"?"ok":v==="ส่งซ่อม"?"mid":"bad"}">${esc(v)}</span>`;
 if(k==="type"&&TC[v])return`<span class="ty" style="--c:${TC[v]}">${esc(v)}</span>`;
 if(k==="name"){
  if(tab==="players")return`<a class="pl" href="${playerUrl(r.id)}"><b>${esc(v)}</b></a>`;
  if(tab==="teams")return`<a class="pl" href="/compare?a=${encodeURIComponent(r.id)}" style="display:flex;align-items:center;gap:10px">${tLogoHtml(r.name)}<b>${esc(v)}</b></a>`;
  return`<b>${esc(v)}</b>`;
 }
 return esc(v)||"—";
}

function fbar(k){
 const L=["all","SEA","Pacific","Americas","EMEA","China"];
 const teams=S.teams.filter(inLeague);
 let h=`<div class="fb"><div class="chips">${L.map(x=>`<button type="button" class="chip ${pl===x?"on":""}" data-pl="${x}">${x==="all"?"ทุกลีก":x}</button>`).join("")}</div>`;
 if(k!=="teams")h+=`<select id="pt" aria-label="เลือกทีม"><option value="">ทุกทีม</option>${teams.map(t=>`<option value="${esc(t.id)}" ${t.id===pt?"selected":""}>${esc(t.name)}</option>`).join("")}</select>`;
 h+=`</div>`;
 if(k==="gear")h+=`<div class="chips tc"><button type="button" class="chip ${gt==="all"?"on":""}" data-gt="all">ทุกประเภท</button>${Object.keys(TC).map(x=>`<button type="button" class="chip ${gt===x?"on":""}" data-gt="${x}" style="--c:${TC[x]}"><i></i>${x}</button>`).join("")}</div>`;
 return h;
}

function grouped(rows){
 if(!rows.length)return"";
 const g={};rows.forEach(p=>(g[p.team||""]=g[p.team||""]||[]).push(p));
 const ids=S.teams.map(t=>t.id).filter(i=>g[i]);if(g[""])ids.push("");
 return ids.map(i=>{const t=S.teams.find(x=>x.id===i),st=S.staff.filter(s=>s.team===i);
  const head=`${t?tLogoHtml(t.name):""}<h2>${esc(t?t.name:"ไม่มีทีม")}<small>${t?esc(t.region)+" / ":""}${g[i].length} คน</small></h2>`;
  return`<section class="tg"><div class="tg-hdr">${t?`<a class="t-link" href="/compare?a=${encodeURIComponent(t.id)}">${head}</a>`:`<div class="t-link">${head}</div>`}</div>
   ${st.length?`<p class="stf">${st.map(s=>`<span><b>${esc(s.name)}</b> ${esc(s.role)}</span>`).join("")}</p>`:""}
   <div class="dgrid">${g[i].map(p=>pcard(p)).join("")}</div></section>`}).join("");
}

function gcard(g){const o=S.players.find(x=>x.id===g.owner),adm=role==="admin",c=TC[g.type]||"#9a9aa2",im=gimg(g);
 return`<div class="gc ${adm?"ed":""}" style="--c:${c}" ${adm?`data-e="${esc(g.id)}"`:""}>${adm?`<button type="button" class="gx" data-x="${esc(g.id)}" aria-label="ลบ ${esc(g.name)}">✕</button>`:""}<div class="gi">${im?`<img loading="lazy" decoding="async" src="${esc(im)}" alt="${esc(g.name)}">`:`<span>${GI[g.type]||"🎮"}</span>`}</div><div class="gb"><b>${esc(g.name)}</b><small>${esc(g.brand||"")}</small><div class="gm"><span class="ty">${esc(g.type)}</span><span class="tag ${g.status==="พร้อมใช้"?"ok":g.status==="ส่งซ่อม"?"mid":"bad"}">${esc(g.status)}</span></div><small>${o?esc(o.name):"ไม่มีผู้ใช้"}</small></div></div>`}

function lcard(l){const c=TC[l.type]||"#9a9aa2",n=S.gear.filter(g=>norm(g.name)===norm(l.name)).length,adm=role==="admin";
 return`<div class="gc ${adm?"ed":""}" style="--c:${c}" ${adm?`data-e="${esc(l.id)}"`:""}>${adm?`<button type="button" class="gx" data-x="${esc(l.id)}" aria-label="ลบ ${esc(l.name)}">✕</button>`:""}<div class="gi">${l.img?`<img loading="lazy" decoding="async" src="${esc(l.img)}" alt="${esc(l.name)}">`:`<span>${GI[l.type]||"🎮"}</span>`}</div><div class="gb"><b>${esc(l.name)}</b><small>${esc(l.brand||"")}</small><div class="gm"><span class="ty">${esc(l.type)}</span><small>ใช้โดย ${n} คน</small></div></div></div>`}

function view(){
 const k=tab,e=E[k];let rows=S[k];
 if(q){const s=q.toLowerCase();rows=rows.filter(r=>e.cols.some(c=>{const v=c[2].startsWith("ref")?nm(c[2].split(":")[1],r[c[0]]):c[2]==="ag"?agStr(r[c[0]]):r[c[0]];return String(v??"").toLowerCase().includes(s)}))}
 if(k==="teams")rows=rows.filter(inLeague);
 if(k==="players"||k==="staff")rows=rows.filter(r=>tm(r.team));
 if(k==="gear")rows=rows.filter(r=>{const o=S.players.find(p=>p.id===r.owner);return((pl==="all"&&!pt)||(o&&tm(o.team)))&&(gt==="all"||r.type===gt)});
 if(k==="results")rows=[...rows].sort((a,b)=>b.date.localeCompare(a.date));
 const adm=role==="admin",shown=e.cols.filter(c=>!c[3]);
 const ex=k==="results"?"<th>ผู้ชนะ</th>":"";
 const body=rows.map(r=>`<tr>${adm?`<td><input type="checkbox" class="rc" data-id="${esc(r.id)}" aria-label="เลือก"></td>`:""}${shown.map(c=>`<td>${cell(c,r)}</td>`).join("")}${k==="results"?`<td>${r.sa===r.sb?'<span class="tag mid">เสมอ</span>':`<span class="tag ok">${esc(nm("teams",r.sa>r.sb?r.a:r.b))}</span>`}</td>`:""}${adm?`<td class="act"><div class="act-wrap"><button type="button" class="btn s" data-e="${esc(r.id)}">แก้ไข</button><button type="button" class="btn d" data-x="${esc(r.id)}">ลบ</button></div></td>`:""}</tr>`).join("");
 return`<header class="top"><h1>${e.t}</h1><div class="bar"><input id="q" type="search" placeholder="ค้นหา${e.t}" value="${esc(q)}" aria-label="ค้นหา">${adm?`<button type="button" class="btn d bd" id="bd" disabled>ลบที่เลือก</button><button type="button" class="btn" data-a="1">${e.add}</button>`:""}</div></header>
 ${["teams","players","staff","gear"].includes(k)?fbar(k):""}${k==="players"?grouped(rows):""}${k==="lib"&&rows.length?`<div class="ggrid">${rows.map(lcard).join("")}</div>`:""}${k==="gear"&&rows.length?`<div class="ggrid">${rows.map(gcard).join("")}</div>`:""}
 <div class="wrap">${rows.length?`<table><tr>${adm?'<th><input type="checkbox" id="ca" aria-label="เลือกทั้งหมด"></th>':""}${shown.map(c=>`<th>${c[1]}</th>`).join("")}${ex}${adm?'<th style="text-align:right">การจัดการ</th>':""}</tr>${body}</table>`:`<div class="empty">${q?"ไม่พบรายการที่ค้นหา ลองใช้คำอื่น":`ยังไม่มี${e.t}${adm?` กด “${e.add}” เพื่อเริ่มต้น`:""}`}</div>`}</div>`;
}

/* ---------- ลบ ---------- */
async function delMany(ids){
 if(role!=="admin"||saving||!ids.length)return;
 const linked=S.results.filter(r=>tab==="teams"?(ids.includes(r.a)||ids.includes(r.b)):tab==="tours"&&ids.includes(r.tour)).length;
 const impact=linked?" ผลการแข่งขันที่เกี่ยวข้อง "+linked+" รายการจะถูกลบด้วย":"";
 if(!confirm("ลบ "+ids.length+" รายการใช่ไหม?"+impact))return;
 const error=await deleteRecords(tab,ids);
 if(error)return showError(error);
 render();
}

/* ---------- ฟอร์มเพิ่ม/แก้ไข ---------- */
function field(c,val){const[k,l,ty]=c;let h=`<label for="f_${k}">${l}</label>`;
 if(ty.startsWith("ref")){const src=ty.split(":")[1];h+=`<select id="f_${k}"><option value="">— ไม่ระบุ —</option>${S[src].map(o=>`<option value="${esc(o.id)}" ${o.id===val?"selected":""}>${esc(o.name)}</option>`).join("")}</select>`}
 else if(ty==="img"){IMG[k]=val||"";h+=`<input id="f_${k}" type="file" accept="image/*"><img id="pv_${k}" class="pv" ${val?`src="${esc(val)}"`:"hidden"} alt="ตัวอย่างรูป"><button type="button" class="btn g" id="ri" data-k="${k}">ลบรูปนี้</button>`}
 else if(ty==="ag"){h+=`<input id="f_${k}" placeholder="Jett 28 18 520 390; Raze 16 9 290 240" value="${esc(agStr(val))}"><div style="font-size:12px;color:var(--mute);margin-top:4px">รูปแบบ: ชื่อ เกมที่เล่น ชนะ Kill Death คั่นแต่ละตัวด้วย ;</div>`}
 else if(ty.startsWith("sel")){h+=`<select id="f_${k}">${ty.split(":")[1].split("|").map(o=>`<option ${o===val?"selected":""}>${o}</option>`).join("")}</select>`}
 else{const sc=k==="sa"||k==="sb";h+=`<input id="f_${k}" type="${ty==="num"?"number":ty}" ${ty==="num"?`min="0" step="${sc?"1":"any"}" ${sc?"required":""}`:""} value="${esc(val??"")}">`}
 return h;
}
const err=m=>{document.getElementById("err").textContent=m};

function openForm(id){
 if(role!=="admin"||saving)return;
 const e=E[tab],r=id?S[tab].find(x=>x.id===id):{};
 if(!r)return;
 const f=document.getElementById("f");
 f.innerHTML=`<h2>${id?"แก้ไข":e.add}</h2>${e.cols.map(c=>field(c,r[c[0]])).join("")}<div id="err" style="color:var(--loss);font-size:14px;margin-top:8px" role="alert"></div><div class="foot"><button class="btn g" type="button" id="cx">ยกเลิก</button><button class="btn" type="button" id="ok">บันทึก</button></div>`;
 document.getElementById("cx").onclick=()=>dlg.close();
 document.getElementById("ok").onclick=async()=>{
  if(saving)return;
  const invalid=f.querySelector(":invalid");if(invalid){invalid.reportValidity();return}
  const o={...r};if(id)o.id=id;
  for(const c of e.cols){const el=document.getElementById("f_"+c[0]);o[c[0]]=c[2]==="img"?(IMG[c[0]]||""):c[2]==="ag"?pa(el.value):c[2]==="num"?Number(el.value||0):el.value.trim()}
  const first=e.cols[0];
  if(first[2]==="text"&&!o[first[0]])return err("กรุณากรอก"+first[1]);
  if(tab==="results"){if(!o.tour||!o.a||!o.b)return err("กรุณาเลือกรายการแข่งและทีมทั้งสองฝั่ง");if(o.a===o.b)return err("ทีม A และทีม B ต้องไม่ใช่ทีมเดียวกัน");if(!o.date)return err("กรุณาเลือกวันที่แข่ง")}
  if(tab==="players"){
   const entries=document.getElementById("f_agents").value.split(";").map(x=>x.trim()).filter(Boolean);
   const valid=entries.every(x=>{const p=x.split(/\s+/);return p.length===5&&p.slice(1).every(n=>/^\d+$/.test(n)&&Number.isSafeInteger(Number(n)))&&Number(p[2])<=Number(p[1])});
   if(!valid)return err("กรอกสถิติตามรูปแบบตัวอย่าง ใช้จำนวนเต็มตั้งแต่ 0 และจำนวนชนะต้องไม่เกินจำนวนเกม");
  }
  const btn=document.getElementById("ok");btn.disabled=true;
  const error=await saveRecord(tab,o);
  btn.disabled=false;
  if(error){if(!role)return showError(error);return err(error)}
  dlg.close();render();
 };
 dlg.showModal();const fi=f.querySelector("input,select");if(fi)fi.focus();
}

function onStart(){
 if(tab==="results"&&QS.get("new")==="1"){history.replaceState(null,"","/results");if(role==="admin")openForm()}
}

/* ---------- เหตุการณ์ ---------- */
document.addEventListener("click",ev=>{
 const b=ev.target.closest("button");
 if(!b){const c=ev.target.closest(".gc[data-e]");if(c)openForm(c.dataset.e);return}
 if(b.dataset.a)openForm();
 else if(b.dataset.e)openForm(b.dataset.e);
 else if(b.dataset.x)delMany([b.dataset.x]);
 else if(b.dataset.pl!==undefined){pl=b.dataset.pl;pt="";render()}
 else if(b.dataset.gt!==undefined){gt=b.dataset.gt;render()}
 else if(b.id==="bd")delMany([...document.querySelectorAll(".rc:checked")].map(c=>c.dataset.id));
 else if(b.id==="ri"){IMG[b.dataset.k]="";const pv=document.getElementById("pv_"+b.dataset.k);if(pv){pv.hidden=true;pv.removeAttribute("src")}}
});

let qt;
document.addEventListener("input",ev=>{if(ev.target.id==="q"){q=ev.target.value;if(ev.isComposing)return;clearTimeout(qt);qt=setTimeout(render,120)}});
document.addEventListener("compositionend",ev=>{if(ev.target.id==="q"){q=ev.target.value;render()}});

document.addEventListener("change",ev=>{const t=ev.target;
 if(t.id==="pt"){pt=t.value;render();return}
 if(t.id==="ca")document.querySelectorAll(".rc").forEach(c=>c.checked=t.checked);
 if(t.id==="ca"||(t.classList&&t.classList.contains("rc"))){const n=document.querySelectorAll(".rc:checked").length,b=document.getElementById("bd");if(b){b.disabled=!n;b.textContent=n?"ลบที่เลือก ("+n+")":"ลบที่เลือก"}}
 if(t.type==="file"&&t.id.startsWith("f_")&&t.files[0]){
  const k=t.id.slice(2),fr=new FileReader();
  fr.onload=()=>{const im=new Image();im.onload=()=>{const s=Math.min(1,360/Math.max(im.width,im.height)),c=document.createElement("canvas");c.width=Math.round(im.width*s);c.height=Math.round(im.height*s);c.getContext("2d").drawImage(im,0,0,c.width,c.height);IMG[k]=c.toDataURL("image/jpeg",.82);const pv=document.getElementById("pv_"+k);if(pv){pv.src=IMG[k];pv.hidden=false}};im.src=fr.result};
  fr.readAsDataURL(t.files[0]);
 }
});
