/* Tec Skills reports - client-side, A4 sheets matching company templates */
const CATS=["DIA (STC)","DIA (GO)","Internet (Fiber)","Internet (5G Router)","Network Devices","CCTV","IPTL","PBX","Other H/W Devices","Other"];
const STORE_KEY="tecskills_reports_v1";
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
  refreshRecords(n); autoGrowAll();
}
$("nav-visit").onclick=()=>showView("visit");
$("nav-delivery").onclick=()=>showView("delivery");

/* auto-grow textareas so text never gets cut in print/PDF */
function grow(t){t.style.height="auto";t.style.height=Math.max(t.scrollHeight,44)+"px"}
function autoGrowAll(){document.querySelectorAll("#visit-table textarea").forEach(grow)}
document.addEventListener("input",e=>{if(e.target.matches("#visit-table textarea"))grow(e.target)});

function addDeliveryRow(v){
  v=v||{};
  const tr=document.createElement("tr");
  tr.innerHTML=`<td><input data-role="qty"></td><td><input data-role="part"></td><td><input data-role="desc"></td><td><input data-role="sn"></td><td class="rm noprint"><button class="rowbtn noprint" title="Remove" onclick="this.closest('tr').remove()">✕</button></td>`;
  $("delivery-table").querySelector("tbody").appendChild(tr);
  ["qty","part","desc","sn"].forEach(k=>tr.querySelector(`[data-role="${k}"]`).value=v[k]||"");
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

const getStore=()=>{try{return JSON.parse(localStorage.getItem(STORE_KEY))||[]}catch(e){return[]}};
function saveRecord(k){
  const r=k==="visit"?collectVisit():collectDelivery();
  r.label=k==="visit"?`${r.customer||"Unnamed"} — ${r.date||""}`:`DN ${r.dnNo||"—"} — ${r.soldName||"Unnamed"}`;
  const s=getStore();s.unshift(r);localStorage.setItem(STORE_KEY,JSON.stringify(s));
  refreshRecords(k);toast("Saved");
}
function refreshRecords(k){
  const s=getStore().filter(r=>r.type===k),sel=$("records-select");
  sel.innerHTML='<option value="">— Load a saved report —</option>';
  s.forEach(r=>{const o=document.createElement("option");o.value=r.id;o.textContent=r.label;sel.appendChild(o)});
  $("records-count").textContent=s.length+" saved";
}
$("records-select").onchange=e=>{
  const r=getStore().find(x=>x.id===e.target.value);if(!r)return;
  r.type==="visit"?fillVisit(r):fillDelivery(r);toast("Loaded");
};
function clearForm(k){
  if(k==="visit"){fillVisit({});set("v-date",today())}
  else{fillDelivery({});set("d-dndate",today())}
  $("records-select").value="";
}

function printDoc(){window.print()}

function downloadPdf(k){
  const el=$(k==="visit"?"vr":"dn");
  const name=k==="visit"?"VisitReport_"+((val("v-customer")||"report").replace(/[^a-z0-9]+/gi,"_")):"DeliveryNote_"+(val("d-dnno")||"note").replace(/[^a-z0-9]+/gi,"_");
  document.body.classList.add("exporting");
  window.scrollTo(0,0);
  html2pdf().set({margin:0,filename:name+".pdf",image:{type:"jpeg",quality:0.98},
    html2canvas:{scale:2,useCORS:true,scrollX:0,scrollY:0,windowWidth:900},
    jsPDF:{unit:"mm",format:"a4",orientation:"portrait"},pagebreak:{mode:["avoid-all"]}})
    .from(el).save().then(()=>document.body.classList.remove("exporting"),()=>document.body.classList.remove("exporting"));
}
function toast(m){const t=$("toast");t.textContent=m;t.classList.add("show");setTimeout(()=>t.classList.remove("show"),1500)}

/* init */
set("v-date",today());set("d-dndate",today());
for(let i=0;i<10;i++)addDeliveryRow();
refreshRecords("visit");autoGrowAll();
