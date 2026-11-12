"use strict";
/* หน้าผลการแข่งขันตามรายการ (/bracket?t=...) */
let bt=QS.get("t")||"";

function view(){
 const T=[...S.tours].sort((a,b)=>a.start.localeCompare(b.start));
 const H=`<header class="top"><h1>ผลการแข่งขันตามรายการ</h1>${role==="admin"?'<div class="bar"><a class="btn" href="/results?new=1">บันทึกผล</a></div>':""}</header>`;
 if(!T.length)return H+'<div class="wrap"><div class="empty">ยังไม่มีรายการแข่ง</div></div>';
 if(!T.find(t=>t.id===bt))bt=(T.find(t=>S.results.some(r=>r.tour===t.id))||T[0]).id;
 const tr=T.find(t=>t.id===bt),ms=S.results.filter(r=>r.tour===bt).sort((a,b)=>a.date.localeCompare(b.date));
 const days=[...new Set(ms.map(r=>r.date))];
 const mc=r=>{const w=r.sa>r.sb?1:r.sa<r.sb?2:0;return`<div class="mc"><div class="mt ${w===1?"win":w===2?"out":""}"><span>${esc(nm("teams",r.a))}</span><b>${r.sa}</b></div><div class="mt ${w===2?"win":w===1?"out":""}"><span>${esc(nm("teams",r.b))}</span><b>${r.sb}</b></div>${w===0?'<small class="dr">เสมอ</small>':""}</div>`};
 const cols=days.map(d=>`<div class="bc"><div class="bh"><small>วันที่แข่ง</small><b>${fd(d)}</b></div><div class="bm">${ms.filter(r=>r.date===d).map(mc).join("")}</div></div>`).join("");
 const sts=standings(ms).filter(t=>t.p>0);
 const chips=T.map(t=>`<button class="chip ${t.id===bt?"on":""}" data-bt="${esc(t.id)}" type="button">${esc(t.name)}</button>`).join("");
 return H+`<div class="chips">${chips}</div><p class="binfo"><span>เริ่มแข่ง <b>${fd(tr.start)}</b></span>${tr.place?`<span>สถานที่ <b>${esc(tr.place)}</b></span>`:""}<span>เงินรางวัล <b>${Number(tr.prize||0).toLocaleString("th-TH")} บาท</b></span><span>แมตช์ <b>${ms.length}</b></span></p>
 ${ms.length?`<div class="bk" tabindex="0" aria-label="ผลการแข่งขัน เลื่อนดูตามวันที่">${cols}</div><h2 class="sec">ตารางคะแนนรายการนี้</h2><div class="wrap">${rankList(sts)}</div>`:'<div class="wrap"><div class="empty">รายการนี้ยังไม่มีผลการแข่ง</div></div>'}`;
}

document.addEventListener("click",ev=>{
 const b=ev.target.closest("button[data-bt]");if(!b)return;
 bt=b.dataset.bt;history.replaceState(null,"","/bracket?t="+encodeURIComponent(bt));render();
});
