"use strict";
/* หน้าเลือกโหมด (/) */
function view(){
 return`<div class="login"><h1>เลือกโหมดใช้งาน</h1><p class="sub">ระบบนี้มีข้อมูลตัวอย่าง รวมถึงชื่อทีมและนักแข่งจริง รายละเอียดและผลแข่งควรตรวจสอบก่อนนำไปอ้างอิง</p><div class="lg2">
 <div class="lc"><h2>ผู้ชม (User)</h2><p>ดูทีม นักแข่ง อุปกรณ์ รายการแข่ง และผลการแข่ง ไม่สามารถแก้ไขข้อมูลได้</p><button class="btn" id="lu" type="button">เข้าดูข้อมูล</button></div>
 <div class="lc"><h2>ผู้ดูแล (Admin)</h2><label for="pw">รหัสผ่านผู้ดูแล</label><input id="pw" type="password" autocomplete="current-password"><div id="le" role="alert"></div><button class="btn" id="la" type="button">เข้าสู่ระบบผู้ดูแล</button></div>
 </div></div>`;
}

async function adminLogin(){
 const le=document.getElementById("le"),btn=document.getElementById("la");
 btn.disabled=true;le.textContent="";
 try{
  const d=await api("/api/login",{method:"POST",body:JSON.stringify({password:document.getElementById("pw").value})});
  setSession("admin",d.token);location.href="/home";
 }catch(e){
  le.textContent=e.status?e.message:"เชื่อมต่อเซิร์ฟเวอร์ไม่ได้ กรุณาเปิด python server.py";
  btn.disabled=false;
 }
}

document.addEventListener("click",ev=>{
 const b=ev.target.closest("button");if(!b)return;
 if(b.id==="lu"){setSession("user");location.href="/home"}
 else if(b.id==="la")adminLogin();
});
document.addEventListener("keydown",ev=>{if(ev.key==="Enter"&&ev.target.id==="pw")adminLogin()});
