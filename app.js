/* Tec Skills reports - client-side, A4 sheets matching company templates */
const CATS=["DIA (STC)","DIA (GO)","Internet (Fiber)","Internet (5G Router)","Network Devices","CCTV","IPTL","PBX","Other H/W Devices","Other"];
const $=id=>document.getElementById(id);
const val=id=>$(id).value;
const set=(id,v)=>{$(id).value=v||""};
let current="visit";

function today(){const d=new Date();return String(d.getDate()).padStart(2,"0")+"/"+String(d.getMonth()+1).padStart(2,"0")+"/"+d.getFullYear()}

function showView(n){
  current=n;
  $("view-visit").classList.toggle("active",n==="visit");
  $("view-delivery").classList.toggle("active",n==="delivery");
  $("nav-visit").classList.toggle("active",n==="visit");
  $("nav-delivery").classList.toggle("active",n==="delivery");
  subscribe(n); autoGrowAll();
}
$("nav-visit").onclick=()=>showView("visit");
$("nav-delivery").onclick=()=>showView("delivery");

/* auto-grow textareas so text never gets cut in print/PDF */
function grow(t,min){min=min||(t.closest("#delivery-table")?38:44);t.style.height="auto";t.style.height=Math.max(t.scrollHeight,min)+"px"}
function autoGrowAll(){document.querySelectorAll("#visit-table textarea, #delivery-table textarea").forEach(t=>grow(t))}
document.addEventListener("input",e=>{if(e.target.matches("#visit-table textarea, #delivery-table textarea"))grow(e.target)});

function addDeliveryRow(v){
  v=v||{};
  const tr=document.createElement("tr");
  tr.innerHTML=`<td data-label="Quantity"><textarea rows="1" data-role="qty"></textarea></td><td data-label="Part#"><textarea rows="1" data-role="part"></textarea></td><td data-label="Description"><textarea rows="1" data-role="desc"></textarea></td><td data-label="SN#"><textarea rows="1" data-role="sn"></textarea></td><td class="rm noprint"><button class="rowbtn noprint" title="Remove" onclick="this.closest('tr').remove()">✕</button></td>`;
  $("delivery-table").querySelector("tbody").appendChild(tr);
  ["qty","part","desc","sn"].forEach(k=>tr.querySelector(`[data-role="${k}"]`).value=v[k]||"");
  tr.querySelectorAll("textarea").forEach(t=>grow(t,38));
}

function collectVisit(){
  return{type:"visit",id:Date.now().toString(36),customer:val("v-customer"),place:val("v-place"),date:val("v-date"),time:val("v-time"),
    rows:[...document.querySelectorAll("#visit-table tbody tr")].map((tr,i)=>({category:CATS[i],result:tr.querySelector('[data-role="result"]').value,status:tr.querySelector('[data-role="status"]').value})),
    comments:val("v-comments"),completedBy:val("v-completed-by"),customerRep:val("v-customer-rep")};
}
function fillVisit(r){
  set("v-customer",r.customer);set("v-place",r.place);set("v-date",r.date);set("v-time",r.time);set("v-comments",r.comments);
  set("v-completed-by",r.completedBy);set("v-customer-rep",r.customerRep);
  document.querySelectorAll("#visit-table tbody tr").forEach((tr,i)=>{const x=(r.rows||[])[i]||{};
    tr.querySelector('[data-role="result"]').value=x.result||"";tr.querySelector('[data-role="status"]').value=x.status||""});
  autoGrowAll();
}
function collectDelivery(){
  return{type:"delivery",id:Date.now().toString(36),soldName:val("d-sold-name"),soldAddress:val("d-sold-address"),contact:val("d-contact"),
    dnNo:val("d-dnno"),dnDate:val("d-dndate"),shipTo:val("d-shipto"),
    items:[...document.querySelectorAll("#delivery-table tbody tr")].map(tr=>({qty:tr.querySelector('[data-role="qty"]').value,part:tr.querySelector('[data-role="part"]').value,desc:tr.querySelector('[data-role="desc"]').value,sn:tr.querySelector('[data-role="sn"]').value})),
    receivedName:val("d-received-name"),tecskillsName:val("d-tecskills-name")};
}
function fillDelivery(r){
  set("d-sold-name",r.soldName);set("d-sold-address",r.soldAddress);set("d-contact",r.contact);
  set("d-dnno",r.dnNo);set("d-dndate",r.dnDate);set("d-shipto",r.shipTo);
  set("d-received-name",r.receivedName);set("d-tecskills-name",r.tecskillsName);
  $("delivery-table").querySelector("tbody").innerHTML="";
  const items=r.items||[];const n=Math.max(10,items.length);
  for(let i=0;i<n;i++)addDeliveryRow(items[i]);
}

/* ---------- Firebase: login + shared saved reports ---------- */
const COLS={visit:"visitReports",delivery:"deliveryNotes"};
let auth=null,db=null,user=null,records=[],unsub=null;

function fbReady(){
  const c=window.FIREBASE_CONFIG;
  return window.firebase&&c&&c.apiKey&&!/^PASTE/.test(c.apiKey)&&c.projectId&&!/^PASTE/.test(c.projectId);
}
function loginMsg(text,ok){const e=$("login-err");e.hidden=!text;e.textContent=text||"";e.classList.toggle("login-ok",!!ok)}
function authError(e){
  const c=(e&&e.code)||"";
  if(/invalid-credential|wrong-password|user-not-found|invalid-email|missing-password/.test(c))return"Wrong email or password.";
  if(c==="auth/too-many-requests")return"Too many attempts. Try again later or reset your password.";
  if(c==="auth/network-request-failed")return"No internet connection.";
  if(c==="auth/user-disabled")return"This account is disabled.";
  return"Sign in failed ("+(c||"error")+").";
}
function whoShort(email){return(email||"").split("@")[0]}

function subscribe(kind){
  if(unsub){unsub();unsub=null}
  records=[];renderRecords(kind);
  if(!db||!user)return;
  unsub=db.collection(COLS[kind]).orderBy("createdAtMs","desc").limit(100).onSnapshot(
    snap=>{records=snap.docs.map(d=>({id:d.id,...d.data()}));renderRecords(kind)},
    err=>{console.error(err);toast(err.code==="permission-denied"?"No permission - check Firestore rules":"Could not load saved reports")}
  );
}
function renderRecords(kind){
  const sel=$("records-select"),keep=sel.value;
  sel.innerHTML='<option value="">— Load a saved report —</option>';
  records.forEach(r=>{const o=document.createElement("option");o.value=r.id;
    o.textContent=r.label+(r.email?"  ·  "+whoShort(r.email):"");sel.appendChild(o)});
  if(records.some(r=>r.id===keep))sel.value=keep;
  $("records-count").textContent=records.length+" saved";
  updateDelBtn();
}
function updateDelBtn(){
  const r=records.find(x=>x.id===$("records-select").value);
  $("btn-del").disabled=!(r&&user&&r.uid===user.uid);
}
function saveRecord(k){
  if(!db||!user){toast("Not signed in");return}
  const d=k==="visit"?collectVisit():collectDelivery();delete d.id;
  const label=k==="visit"?`${d.customer||"Unnamed"} — ${d.date||""}`:`DN ${d.dnNo||"—"} — ${d.soldName||"Unnamed"}`;
  db.collection(COLS[k]).add({label,data:d,uid:user.uid,email:user.email||"",createdAtMs:Date.now()})
    .then(()=>toast("Saved"))
    .catch(e=>toast(e.code==="permission-denied"?"Not allowed - check Firestore rules":"Save failed: "+(e.code||e.message)));
}
$("records-select").onchange=e=>{
  updateDelBtn();
  const r=records.find(x=>x.id===e.target.value);if(!r)return;
  current==="visit"?fillVisit(r.data):fillDelivery(r.data);toast("Loaded");
};
function deleteRecord(){
  const r=records.find(x=>x.id===$("records-select").value);
  if(!r||!db)return;
  if(!confirm("Delete saved report:\n"+r.label+" ?"))return;
  db.collection(COLS[current]).doc(r.id).delete().then(()=>{$("records-select").value="";toast("Deleted")})
    .catch(e=>toast(e.code==="permission-denied"?"Only the creator can delete":"Delete failed"));
}

function startAuth(){
  if(!fbReady()){
    document.body.classList.add("need-login");
    loginMsg("Firebase is not set up yet. Open firebase-config.js and paste your Firebase config.");
    $("login-btn").disabled=true;return;
  }
  firebase.initializeApp(window.FIREBASE_CONFIG);
  auth=firebase.auth();db=firebase.firestore();
  auth.onAuthStateChanged(u=>{
    user=u;
    document.body.classList.toggle("authed",!!u);
    document.body.classList.toggle("need-login",!u);
    if(u){$("user-email").textContent=u.email||"";subscribe(current);autoGrowAll()}
    else{if(unsub){unsub();unsub=null}records=[];$("l-pass").value=""}
  });
}
$("login-form").onsubmit=e=>{
  e.preventDefault();if(!auth)return;
  const b=$("login-btn");b.disabled=true;loginMsg("");
  auth.signInWithEmailAndPassword($("l-email").value.trim(),$("l-pass").value)
    .catch(err=>loginMsg(authError(err))).finally(()=>{b.disabled=false});
};
$("forgot").onclick=e=>{
  e.preventDefault();if(!auth)return;
  const em=$("l-email").value.trim();
  if(!em){loginMsg("Type your email above, then click Forgot password.");return}
  auth.sendPasswordResetEmail(em).then(()=>loginMsg("Reset link sent. Check your email.",true))
    .catch(err=>loginMsg(err.code==="auth/invalid-email"?"Invalid email.":"Could not send reset email."));
};
$("nav-logout").onclick=()=>{if(auth)auth.signOut()};

function clearForm(k){
  if(k==="visit"){fillVisit({});set("v-date",today())}
  else{fillDelivery({});set("d-dndate",today())}
  $("records-select").value="";
}

/* mobile layout toggle: desktop sheet is restored for print + PDF */
function applyMode(){document.body.classList.toggle("mobile",window.innerWidth<820);autoGrowAll()}
window.addEventListener("resize",applyMode);applyMode();
window.addEventListener("beforeprint",()=>{document.body.classList.remove("mobile");autoGrowAll()});
window.addEventListener("afterprint",applyMode);
function printDoc(){document.body.classList.remove("mobile");autoGrowAll();setTimeout(()=>{window.print();setTimeout(applyMode,500)},100)}

function downloadPdf(k){
  const el=$(k==="visit"?"vr":"dn");
  const name=k==="visit"?"VisitReport_"+((val("v-customer")||"report").replace(/[^a-z0-9]+/gi,"_")):"DeliveryNote_"+(val("d-dnno")||"note").replace(/[^a-z0-9]+/gi,"_");
  document.body.classList.remove("mobile");document.body.classList.add("exporting");autoGrowAll();
  window.scrollTo(0,0);
  const done=()=>{document.body.classList.remove("exporting");applyMode()};
  html2pdf().set({margin:0,filename:name+".pdf",image:{type:"jpeg",quality:0.98},
    html2canvas:{scale:2,useCORS:true,scrollX:0,scrollY:0,windowWidth:900},
    jsPDF:{unit:"mm",format:"a4",orientation:"portrait"},pagebreak:{mode:["avoid-all"]}})
    .from(el).save().then(done,done);
}
function toast(m){const t=$("toast");t.textContent=m;t.classList.add("show");setTimeout(()=>t.classList.remove("show"),1500)}

/* init */
set("v-date",today());set("d-dndate",today());
for(let i=0;i<10;i++)addDeliveryRow();
autoGrowAll();startAuth();
