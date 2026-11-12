"use strict";
/* ส่วนที่ทุกหน้าใช้ร่วมกัน: ข้อมูลอ้างอิง, การเชื่อมต่อ API, เมนู, ฟังก์ชันช่วย */
const PAGE=document.body.dataset.page;
const QS=new URLSearchParams(location.search);

const E={
 teams:{t:"ทีม",add:"เพิ่มทีม",cols:[["name","ชื่อทีม","text"],["game","เกมที่แข่ง","text"],["region","ประเทศ/ภูมิภาค","text"],["coach","โค้ช","text"]]},
 players:{t:"นักแข่ง",add:"เพิ่มนักแข่ง",cols:[["name","ชื่อในเกม (IGN)","text"],["real","ชื่อจริง","text"],["team","ทีม","ref:teams"],["role","บทบาท","text"],["price","ค่าตัว (USD)","num"],["agents","ตัวละครที่เล่น","ag"]]},
 staff:{t:"โค้ชและสตาฟฟ์",add:"เพิ่มบุคลากร",cols:[["name","ชื่อเล่น / ชื่อ","text"],["real","ชื่อจริง","text"],["team","ทีม","ref:teams"],["role","ตำแหน่ง","sel:หัวหน้าโค้ช|โค้ช|ผู้ช่วยโค้ช|โค้ชสมรรถภาพ|ผู้จัดการทีม|นักวิเคราะห์|สตาฟฟ์"]]},
 gear:{t:"อุปกรณ์",add:"เพิ่มอุปกรณ์",cols:[["name","ชื่ออุปกรณ์","text"],["brand","ยี่ห้อ / รุ่น","text"],["type","ประเภท","sel:เมาส์|คีย์บอร์ด|หูฟัง|จอภาพ|เก้าอี้|คอมพิวเตอร์|เมาส์แพด|อื่น ๆ"],["owner","ผู้ใช้งาน","ref:players"],["status","สถานะ","sel:พร้อมใช้|ส่งซ่อม|สูญหาย"],["cost","ราคา (บาท)","num"],["bought","วันที่ซื้อ","date","h"],["serial","หมายเลขซีเรียล","text","h"],["note","หมายเหตุ","text","h"],["img","รูปอุปกรณ์ (ว่างได้ ระบบดึงรูปจากรุ่นเดียวกันให้)","img","h"]]},
 lib:{t:"คลังอุปกรณ์",add:"เพิ่มรุ่นอุปกรณ์",cols:[["name","ชื่อรุ่น","text"],["brand","ยี่ห้อ","text"],["type","ประเภท","sel:เมาส์|คีย์บอร์ด|หูฟัง|จอภาพ|เก้าอี้|คอมพิวเตอร์|เมาส์แพด|อื่น ๆ"],["img","รูปภาพประจำรุ่น (อุปกรณ์รุ่นเดียวกันทุกชิ้นจะใช้รูปนี้)","img","h"]]},
 tours:{t:"รายการแข่ง",add:"เพิ่มรายการแข่ง",cols:[["name","ชื่อรายการ","text"],["game","เกม","text"],["start","วันเริ่มแข่ง","date"],["place","สถานที่","text"],["prize","เงินรางวัล (บาท)","num"]]},
 results:{t:"ผลการแข่ง",add:"บันทึกผล",cols:[["tour","รายการแข่ง","ref:tours"],["date","วันที่แข่ง","date"],["a","ทีม A","ref:teams"],["b","ทีม B","ref:teams"],["sa","คะแนน A","num"],["sb","คะแนน B","num"]]}
};
const PAGES=[["home","ภาพรวม"],...Object.keys(E).map(k=>[k,E[k].t]),["bracket","ผลตามรายการ"],["compare","เปรียบเทียบทีม"]];

const LOGOS={
 "Paper Rex":"https://owcdn.net/img/627f00bf7eddf.png","Sentinels":"https://owcdn.net/img/62a26fb66601f.png","Fnatic":"https://owcdn.net/img/632b72bdc55db.png",
 "Gen.G Esports":"https://owcdn.net/img/6034177b213b2.png","EDward Gaming":"https://owcdn.net/img/62fe055b86860.png","FULL SENSE":"https://owcdn.net/img/60f78d387dd47.png",
 "Team Secret":"https://owcdn.net/img/6132dd99395f1.png","Rex Regum Qeon":"https://owcdn.net/img/627f00bf7eddf.png","DRX":"https://owcdn.net/img/620023405b63b.png",
 "KIWOOM DRX":"https://owcdn.net/img/620023405b63b.png","T1":"https://owcdn.net/img/602d334e3e3b3.png","ZETA DIVISION":"https://owcdn.net/img/61b369c0d9225.png",
 "100 Thieves":"https://owcdn.net/img/5f85faeb2cb98.png","Cloud9":"https://owcdn.net/img/5f85fb0bc7a9f.png","NRG":"https://owcdn.net/img/6007e547bbd31.png",
 "G2 Esports":"https://owcdn.net/img/62a220dc55f30.png","LOUD":"https://owcdn.net/img/62002167d41ef.png","Team Heretics":"https://owcdn.net/img/6322cb2b48eef.png",
 "Karmine Corp":"https://owcdn.net/img/6274e7978d331.png","Team Liquid":"https://owcdn.net/img/5f85fa3dc9ddb.png","Natus Vincere":"https://owcdn.net/img/61b1be048b9f0.png",
 "Bilibili Gaming":"https://owcdn.net/img/62fe084f981e4.png"
};
const esc=s=>String(s??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
const getLogo=name=>LOGOS[name]||"";
const tLogoHtml=(name,cls="t-logo")=>{const src=getLogo(name);return src?`<img class="${cls}" src="${src}" alt="${esc(name)}" onerror="this.style.display='none'">`:`<span class="${cls}">${esc(String(name).slice(0,2).toUpperCase())}</span>`};

const TC={"เมาส์":"#e5484d","คีย์บอร์ด":"#4f8dff","หูฟัง":"#a77bff","จอภาพ":"#22c593","เก้าอี้":"#ff9a3c","คอมพิวเตอร์":"#3cc8f0","เมาส์แพด":"#ff6fb1","อื่น ๆ":"#9a9aa2"};
const GI={"เมาส์":"🖱️","คีย์บอร์ด":"⌨️","หูฟัง":"🎧","จอภาพ":"🖥️","เก้าอี้":"🪑","คอมพิวเตอร์":"💻"};
const ROLE={Jett:"Duelist",Raze:"Duelist",Reyna:"Duelist",Phoenix:"Duelist",Neon:"Duelist",Yoru:"Duelist",Iso:"Duelist",Sage:"Sentinel",Cypher:"Sentinel",Killjoy:"Sentinel",Chamber:"Sentinel",Deadlock:"Sentinel",Omen:"Controller",Brimstone:"Controller",Viper:"Controller",Astra:"Controller",Harbor:"Controller",Clove:"Controller",Sova:"Initiator",Breach:"Initiator",Skye:"Initiator","KAY/O":"Initiator",Fade:"Initiator",Gekko:"Initiator"};
const SIL='<svg viewBox="0 0 100 110" aria-hidden="true"><circle cx="50" cy="34" r="20" fill="#0a0a0b"/><path d="M8 110c0-30 18-48 42-48s42 18 42 48z" fill="#0a0a0b"/></svg>';
const LOGO_SVG='<svg width="30" height="30" viewBox="0 0 30 30" aria-hidden="true"><path d="M2 3l9 12-9 12h6l9-12L8 3zM28 3l-9 12 9 12h-6l-9-12 9-12z" fill="#f2b705"/></svg>';

function norm(s){return String(s||"").toLowerCase().replace(/[^a-z0-9฀-๿+]/g,"")}
function pa(s){return String(s||"").split(";").map(x=>x.trim().split(/\s+/)).filter(a=>a[0]&&a.length>=5).map(a=>({n:a[0],g:+a[1]||0,w:+a[2]||0,k:+a[3]||0,d:+a[4]||0}))}
function agStr(a){return(a||[]).map(x=>[x.n,x.g,x.w,x.k,x.d].join(" ")).join("; ")}
const abbr=t=>t?t.name.split(" ").map(w=>w[0]).join("").slice(0,3).toUpperCase():"—";

/* ---------- สถานะและการเชื่อมต่อเซิร์ฟเวอร์ ---------- */
let S=null,saving=false,role=null,token=null;
try{role=sessionStorage.getItem("esm-role");token=sessionStorage.getItem("esm-token")}catch(e){}
if(role==="admin"&&!token)role=null;

function setSession(r,t){
 role=r||null;token=t||null;
 try{
  if(role)sessionStorage.setItem("esm-role",role);else sessionStorage.removeItem("esm-role");
  if(token)sessionStorage.setItem("esm-token",token);else sessionStorage.removeItem("esm-token");
 }catch(e){}
}

async function api(path,opts={}){
 const headers={"Content-Type":"application/json"};
 if(token)headers["X-Admin-Token"]=token;
 const res=await fetch(path,{cache:"no-store",...opts,headers});
 let data=null;try{data=await res.json()}catch(e){}
 if(!res.ok){const e=new Error((data&&data.error)||("HTTP "+res.status));e.status=res.status;throw e}
 return data;
}
async function write(fn){
 if(saving)return"กำลังบันทึกรายการก่อนหน้า";
 saving=true;
 try{const d=await fn();S=d.state;return""}
 catch(e){
  if(e.status===401){setSession(null);return e.message}
  return e.status?e.message:"บันทึกไม่สำเร็จ กรุณาตรวจว่าเซิร์ฟเวอร์ Python ยังทำงานอยู่ แล้วโหลดหน้าใหม่";
 }finally{saving=false}
}
const saveRecord=(k,o)=>write(()=>api("/api/"+k,{method:"POST",body:JSON.stringify(o)}));
const deleteRecords=(k,ids)=>write(()=>api("/api/"+k+"/delete",{method:"POST",body:JSON.stringify({ids})}));
function showError(m){alert(m);if(!role)location.href="/"}

async function logout(){
 if(token){try{await api("/api/logout",{method:"POST",body:"{}"})}catch(e){}}
 setSession(null);location.href="/";
}

/* ---------- ฟังก์ชันช่วยแสดงผล ---------- */
const nm=(k,id)=>{const r=S[k].find(x=>x.id===id);return r?r.name:"—"};
const fd=d=>d?new Date(d+"T00:00:00").toLocaleDateString("th-TH",{day:"numeric",month:"short",year:"numeric"}):"—";
const playerUrl=id=>"/player?id="+encodeURIComponent(id);

function nav(){
 const n=document.getElementById("nav");
 const brand=`<a class="brand" href="${role?"/home":"/"}">${LOGO_SVG}E-Sports <small>Team Manager</small></a>`;
 if(!role||!S){n.innerHTML=brand;return}
 n.innerHTML=brand+PAGES.map(([k,l])=>{const on=k===PAGE||(PAGE==="player"&&k==="players");return`<a class="nb ${on?"on":""}" href="/${k}"${on?' aria-current="page"':""}>${l}${E[k]?`<span>${S[k].length}</span>`:""}</a>`}).join("")+
  '<div class="sp"></div><span class="role">'+(role==="admin"?"ADMIN":"USER")+'</span>'+
  (role==="admin"?'<a class="nb cta" href="/results?new=1">บันทึกผล</a>':'')+
  '<button class="nb" id="lo" type="button">ออกจากระบบ</button>';
 const on=n.querySelector(".nb.on");if(on)on.scrollIntoView({inline:"center",block:"nearest"});
}
const banner=()=>`<div class="mode ${role}">${role==="admin"?"โหมดผู้ดูแล — เพิ่ม แก้ไข และลบข้อมูลได้":"โหมดผู้ชม — ดูข้อมูลได้อย่างเดียว"}</div><p class="sub"></p>`;

function standings(rs=S.results){
 const m={};S.teams.forEach(t=>m[t.id]={id:t.id,f:[],n:t.name,p:0,w:0,d:0,l:0,pt:0,df:0});
 [...rs].sort((x,y)=>String(x.date).localeCompare(String(y.date))).forEach(r=>{const a=m[r.a],b=m[r.b];if(!a||!b)return;a.p++;b.p++;a.df+=r.sa-r.sb;b.df+=r.sb-r.sa;
  if(r.sa>r.sb){a.w++;b.l++;a.pt+=3;a.f.push("W");b.f.push("L")}else if(r.sa<r.sb){b.w++;a.l++;b.pt+=3;a.f.push("L");b.f.push("W")}else{a.d++;b.d++;a.pt++;b.pt++;a.f.push("D");b.f.push("D")}});
 return Object.values(m).sort((x,y)=>y.pt-x.pt||y.df-x.df);
}
function rankList(st){return st.map((t,i)=>`<div class="rk"><em>${i+1}</em><span class="lg">${tLogoHtml(t.n,"t-logo")}</span><b>${esc(t.n)}</b><span class="form" aria-label="ฟอร์ม 5 แมตช์ล่าสุด">${t.f.slice(-5).map(x=>`<i class="f${x}"></i>`).join("")}</span><u>${t.pt} pts</u></div>`).join("")}
function resRow(r){
 const A=nm("teams",r.a),B=nm("teams",r.b);
 return`<tr><td><div style="display:flex;align-items:center;gap:8px">${tLogoHtml(A,"t-logo sm")}${esc(A)}</div></td><td class="${r.sa>r.sb?"w":r.sa<r.sb?"l":""}"><b>${r.sa} : ${r.sb}</b></td><td><div style="display:flex;align-items:center;gap:8px">${tLogoHtml(B,"t-logo sm")}${esc(B)}</div></td><td>${esc(nm("tours",r.tour))}</td></tr>`;
}
function pcard(p,link=true){
 const t=S.teams.find(x=>x.id===p.team);
 const b=`<span class="dp">${p.price?"$"+Number(p.price):"—"}</span><span class="dt">${esc(abbr(t))}</span><div class="di">${SIL}</div><div class="dn"><b>${esc(p.name)}</b><small>${esc(t?t.name:"ไม่มีทีม")}</small></div>`;
 return link?`<a class="dc" href="${playerUrl(p.id)}">${b}</a>`:`<div class="dc">${b}</div>`;
}

/* ---------- วาดหน้า ----------
   แต่ละหน้าต้องมีฟังก์ชัน view() คืนค่า HTML และอาจมี onStart() ที่จะถูกเรียกหลังวาดครั้งแรก */
function render(){
 nav();
 const v=document.getElementById("v");
 const f=document.activeElement&&document.activeElement.id==="q";
 v.innerHTML=(PAGE==="login"?"":banner())+view();
 if(f){const i=document.getElementById("q");if(i){i.focus();const n=i.value.length;i.setSelectionRange(n,n)}}
}

document.addEventListener("click",ev=>{if(ev.target.closest("#lo"))logout()});

async function start(){
 if(PAGE==="login"){if(role){location.replace("/home");return}render();return}
 if(!role){location.replace("/");return}
 const v=document.getElementById("v");
 v.textContent="กำลังโหลดข้อมูลจากเซิร์ฟเวอร์…";
 if(role==="admin"){
  try{const ss=await api("/api/session");if(!ss.admin){setSession(null);location.replace("/");return}}
  catch(e){}
 }
 try{S=await api("/api/state")}
 catch(e){v.textContent="โหลดข้อมูลไม่สำเร็จ กรุณาเปิดเซิร์ฟเวอร์ด้วยคำสั่ง python server.py แล้วโหลดหน้าใหม่";return}
 render();
 if(typeof onStart==="function")onStart();
}
window.addEventListener("DOMContentLoaded",start);
