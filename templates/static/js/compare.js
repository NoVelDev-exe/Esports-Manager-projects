"use strict";
/* หน้าเปรียบเทียบทีม (/compare?a=...&b=...) */
let ca=QS.get("a")||"",cb=QS.get("b")||"";

function syncUrl(){history.replaceState(null,"","/compare?a="+encodeURIComponent(ca)+"&b="+encodeURIComponent(cb))}

function tstat(id){
 const s=standings().find(x=>x.id===id)||{p:0,w:0,d:0,l:0,pt:0,df:0,f:[]};
 const ps=S.players.filter(p=>p.team===id),oid=ps.map(p=>p.id),gr=S.gear.filter(g=>oid.includes(g.owner));
 let k=0,d=0;ps.forEach(p=>(p.agents||[]).forEach(a=>{k+=a.k;d+=a.d}));
 const val=ps.reduce((a,p)=>a+Number(p.price||0),0);
 return{...s,wr:s.p?Math.round(s.w/s.p*100):0,n:ps.length,val,avg:ps.length?Math.round(val/ps.length):0,kd:(k||d)?(d?k/d:k):null,gr:gr.filter(g=>g.status==="พร้อมใช้").length,gt:gr.length,ps};
}

function view(){
 const T=S.teams,st=standings(),H='<header class="top"><h1>เปรียบเทียบทีม</h1></header>';
 if(T.length<2)return H+'<div class="wrap"><div class="empty">ต้องมีอย่างน้อย 2 ทีมจึงจะเปรียบเทียบได้</div></div>';
 if(T.find(t=>t.id===ca)&&(!T.find(t=>t.id===cb)||ca===cb)){const o=st.find(t=>t.id!==ca&&t.p>0)||st.find(t=>t.id!==ca);cb=o.id}
 if(!T.find(t=>t.id===ca)||!T.find(t=>t.id===cb)||ca===cb){const act=st.filter(t=>t.p>0),base=act.length>=2?act:st;ca=base[0].id;cb=base[1].id}
 const A=tstat(ca),B=tstat(cb),ta=T.find(t=>t.id===ca),tb=T.find(t=>t.id===cb);
 const opt=v=>T.map(t=>`<option value="${esc(t.id)}" ${t.id===v?"selected":""}>${esc(t.name)}</option>`).join("");
 const usd=v=>"$"+Number(v).toLocaleString("en-US");
 const M=[["แข่งแล้ว","p",0],["ชนะ","w",1],["เสมอ","d",0],["แพ้","l",-1],["คะแนน","pt",1],["ผลต่างสกอร์","df",1],["อัตราชนะ","wr",1,v=>v+"%"],["จำนวนนักแข่ง","n",0],["ค่าตัวรวม","val",0,usd],["ค่าตัวเฉลี่ย","avg",0,usd],["K/D (จากสถิติตัวละคร)","kd",1,v=>v===null?"—":v.toFixed(2)],["อุปกรณ์พร้อมใช้","gr",1,(v,s)=>v+"/"+s.gt]];
 const rows=M.map(([l,k,dir,f])=>{const x=A[k],y=B[k],fm=f||(v=>v);let xa="",xb="";if(dir&&x!==null&&y!==null&&x!==y){const aw=dir>0?x>y:x<y;xa=aw?"vw":"";xb=aw?"":"vw"}return`<div class="vr"><b class="${xa}">${fm(x,A)}</b><span>${l}</span><b class="${xb}">${fm(y,B)}</b></div>`}).join("");
 const fm5=s=>`<span class="form">${s.f.slice(-5).map(x=>`<i class="f${x}"></i>`).join("")||"—"}</span>`;
 const hd=t=>`<div><span class="vl">${tLogoHtml(t.name)}</span><h2>${esc(t.name)}</h2><small>${esc(t.region||"")}</small></div>`;
 const m=S.results.filter(r=>(r.a===ca&&r.b===cb)||(r.a===cb&&r.b===ca)).sort((x,y)=>y.date.localeCompare(x.date));
 let wa=0,wb=0,dr=0;m.forEach(r=>{const x=r.a===ca?r.sa:r.sb,y=r.a===ca?r.sb:r.sa;if(x>y)wa++;else if(x<y)wb++;else dr++});
 const ros=s=>s.ps.length?s.ps.map(p=>`<a class="pl" href="${playerUrl(p.id)}">${esc(p.name)}</a>`).join(", "):"ยังไม่มีนักแข่ง";
 return H+`<div class="vsel"><select id="cmpA" aria-label="ทีมที่ 1">${opt(ca)}</select><button class="btn g" id="sw" type="button" aria-label="สลับทีม">⇄</button><select id="cmpB" aria-label="ทีมที่ 2">${opt(cb)}</select></div>
 <div class="vh">${hd(ta)}<div class="vs">VS</div>${hd(tb)}</div>
 <div class="vt">${rows}<div class="vr">${fm5(A)}<span>ฟอร์ม 5 แมตช์ล่าสุด</span>${fm5(B)}</div></div>
 <div class="vp"><div><b>นักแข่ง</b>${ros(A)}</div><div><b>นักแข่ง</b>${ros(B)}</div></div>
 <h2 class="sec">เจอกันโดยตรง</h2>${m.length?`<div class="stats"><div class="stat"><b>${wa}</b><span>${esc(ta.name)} ชนะ</span></div><div class="stat"><b>${dr}</b><span>เสมอ</span></div><div class="stat"><b>${wb}</b><span>${esc(tb.name)} ชนะ</span></div></div><div class="wrap"><table><tr><th>ทีม A</th><th>สกอร์</th><th>ทีม B</th><th>รายการ</th></tr>${m.map(resRow).join("")}</table></div>`:'<div class="wrap"><div class="empty">สองทีมนี้ยังไม่เคยเจอกันในระบบ</div></div>'}`;
}

document.addEventListener("click",ev=>{if(ev.target.closest("#sw")){[ca,cb]=[cb,ca];syncUrl();render()}});
document.addEventListener("change",ev=>{
 const t=ev.target;
 if(t.id==="cmpA"){ca=t.value;if(cb===ca)cb=(S.teams.find(x=>x.id!==ca)||{}).id;syncUrl();render()}
 if(t.id==="cmpB"){cb=t.value;if(ca===cb)ca=(S.teams.find(x=>x.id!==cb)||{}).id;syncUrl();render()}
});
