"use strict";
/* หน้าโปรไฟล์นักแข่ง (/player?id=...) */
const pid=QS.get("id")||"";

function view(){
 const p=S.players.find(x=>x.id===pid);
 if(!p)return'<div class="empty">ไม่พบนักแข่งคนนี้ <a class="pl" href="/players"><b>กลับไปหน้านักแข่ง</b></a></div>';
 document.title=p.name+" · E-Sports Team Manager";
 const t=S.teams.find(x=>x.id===p.team),A=[...(p.agents||[])].sort((a,b)=>b.g-a.g);
 const sum=k=>A.reduce((s,a)=>s+a[k],0),tg=sum("g"),tw=sum("w"),tk=sum("k"),td=sum("d");
 const pct=(a,b)=>b?Math.round(a/b*1000)/10:0,kd=(k,d)=>d?(k/d).toFixed(2):"—";
 const cards=A.slice(0,5).map(a=>`<div class="dc"><span class="dp">${pct(a.g,tg)}%</span><span class="dt">${esc(ROLE[a.n]||"Agent")}</span><div class="di"><span class="gl">${esc(a.n[0])}</span></div><div class="dn"><b>${esc(a.n)}</b><small>${a.g} เกม, ชนะ ${pct(a.w,a.g)}%</small></div></div>`).join("");
 const rows=A.map(a=>{const w=pct(a.w,a.g);return`<tr><td><b>${esc(a.n)}</b></td><td>${esc(ROLE[a.n]||"—")}</td><td>${a.g}</td><td class="${w>=50?"w":"l"}">${w}%</td><td class="num">${kd(a.k,a.d)}</td><td><div class="pk"><div class="bar2"><i style="width:${pct(a.g,tg)}%"></i></div><span class="num">${pct(a.g,tg)}%</span></div></td></tr>`}).join("");
 const sts=[[A.length?esc(A[0].n):"—","ตัวละครหลัก"],[tg,"เกมที่เล่น"],[pct(tw,tg)+"%","อัตราชนะ"],[kd(tk,td),"K/D"]];
 return`<div class="pbar"><a class="btn clr" href="/players">← นักแข่งทั้งหมด</a><span class="rem">ค่าตัว: ${p.price?"$"+Number(p.price):"—"}</span></div>
 <div class="prof">${pcard(p,false)}<div><h1>${esc(p.name)}</h1><p class="sub">${esc(p.real||"")} / ${esc(p.role||"")} / ${esc(t?t.name:"ไม่มีทีม")}</p><div class="stats">${sts.map(s=>`<div class="stat"><b>${s[0]}</b><span>${s[1]}</span></div>`).join("")}</div></div></div>
 ${tg?'<div class="cc"><h2 class="sec">สัดส่วนการเลือกตัวละคร</h2>'+A.map(a=>`<div class="hb"><span class="hl">${esc(a.n)}</span><div class="ht" aria-hidden="true"><i style="width:${pct(a.g,tg)}%;background:var(--gold)"></i></div><b>${pct(a.g,tg)}%</b></div>`).join("")+'</div>':""}
 <h2 class="sec">ตัวละครที่เล่นบ่อยที่สุด</h2>${A.length?`<div class="dgrid">${cards}</div><h2 class="sec">สถิติตัวละครทั้งหมด</h2><div class="wrap"><table><tr><th>ตัวละคร</th><th>บทบาท</th><th>เกม</th><th>ชนะ</th><th>K/D</th><th>อัตราการเลือก</th></tr>${rows}</table></div>`:`<div class="wrap"><div class="empty">ยังไม่มีสถิติตัวละคร${role==="admin"?" เพิ่มได้ที่หน้านักแข่ง > แก้ไข":""}</div></div>`}`;
}
