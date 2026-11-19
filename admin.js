"use strict";
/* FONKORA admin: real Supabase Auth with database-enforced permissions.
 * Publishable key is public. All writes require a verified authorized manager JWT under RLS.
 * This file contains only the public browser API key. */
const SB_URL="https://wxdspknjbbnarqnhptdx.supabase.co", SB_KEY="sb_publishable_Fu5Gsq7q2cfUsb4h0TQC4w_DuZqTtzK";
const ADMIN_EMAIL="ailnohail1995@gmail.com";
const AUTH=SB_URL+"/auth/v1", REST=SB_URL+"/rest/v1";
const PHOTO_BUCKET="fonkora-products";
const SESSION_KEY="fonkora.admin.session";
const TABLES={
 phones:"phone_models",brands:"brands",catalogCategories:"catalog_categories",
 categories:"accessory_families",variants:"phone_variants",prices:"phone_price_guides",
 profiles:"phone_accessory_profiles",settings:"store_currency_settings"
};
const PAGE_TITLES={overview:"نظرة عامة",phones:"الهواتف والمواصفات",brands:"الماركات",categories:"تصنيفات المتجر",variants:"الإصدارات والمخزون",prices:"الأسعار الأولية",settings:"الإعدادات والأمان"};
const ADDITIONAL_SPECS=[
 ["os","نظام التشغيل"],["front_camera_mp","الكاميرا الأمامية (MP)"],
 ["charging_w","الشحن السلكي (W)"],["wireless_charging","الشحن اللاسلكي (وصف)"],
 ["ip_rating","معيار مقاومة الماء والغبار"],["weight_g","الوزن (غرام)"],
 ["bluetooth","البلوتوث"],["wifi","اتصال Wi‑Fi"],["nfc","تقنية NFC"],
 ["sim","نوع شرائح SIM"],["network","الشبكات"],["video","تصوير الفيديو"],
 ["dimensions","الأبعاد"],["materials","مواد التصميم"],["warranty","الضمان (إن كان معتمداً)"],
 ["features","ميزات أخرى"]
];
let session=null,isAdmin=false,recoveryAuthorized=false,page="overview",editorType=null,editing=null,photoFile=null,photoPreview=null,toastHandle=null;
let db={phones:[],brands:[],catalogCategories:[],categories:[],variants:[],prices:[],profiles:[],settings:[]};
const $=id=>document.getElementById(id);
const esc=s=>String(s??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
const fmt=x=>new Intl.NumberFormat("ar-SY").format(Number(x));
const invalid=s=>!s||String(s).trim()==="";
const slugOK=(s,min=3,max=80)=>new RegExp("^[a-z0-9-]{"+min+","+max+"}$").test(String(s||""));
const normalizeUrl=s=>{const str=String(s||"").trim();if(!str)return null;try{const url=new URL(str);if(url.protocol!=="https:")throw Error("يُسمح بروابط HTTPS فقط");return url.href}catch{throw Error("الرابط غير صحيح؛ يجب أن يبدأ بـ https://")}};
function notify(message,bad=false){const t=$("toast");t.textContent=message;t.classList.toggle("error",bad);t.classList.add("show");clearTimeout(toastHandle);toastHandle=setTimeout(()=>t.classList.remove("show"),6000)}
function fail(e){notify(e?.message||String(e),true);return false}
function setMessage(id,msg){if($(id))$(id).textContent=msg}
function setBusy(el,yes){if(el){el.disabled=yes;el.dataset.busy=yes?"true":"false"}}
function revealAuth(){isAdmin=false;$("login").classList.remove("hidden");$("dashboard").classList.add("hidden")}
function revealDashboard(){$("login").classList.add("hidden");$("dashboard").classList.remove("hidden")}
function persist(){if(session&&session.refresh_token)sessionStorage.setItem(SESSION_KEY,JSON.stringify(session))}
function clearSession(){session=null;isAdmin=false;sessionStorage.removeItem(SESSION_KEY);revealAuth()}
function saveSession(data){if(!data?.access_token||!data?.refresh_token)throw Error("لم تصل جلسة تسجيل دخول صالحة");session={access_token:data.access_token,refresh_token:data.refresh_token,expires_at:data.expires_at||Math.floor(Date.now()/1000)+(data.expires_in||3600),user:data.user||null};persist()}
async function authCall(url,body,method="POST",extra={}){
 const res=await fetch(AUTH+url,{method,headers:{apikey:SB_KEY,"content-type":"application/json",...extra},body:JSON.stringify(body),cache:"no-store"});
 const json=await res.json().catch(()=>({}));
 if(!res.ok)throw Error(json?.msg||json?.message||json?.error_description||json?.error||"تعذر الاتصال بخدمة الدخول");
 return json;
}
async function freshToken(){
 if(!session)throw Error("يجب تسجيل الدخول أولاً");
 if(session.expires_at&&session.expires_at>Date.now()/1000+90)return session.access_token;
 if(!session.refresh_token)throw Error("انتهت الجلسة، أعد تسجيل الدخول");
 try{const data=await authCall("/token?grant_type=refresh_token",{refresh_token:session.refresh_token});saveSession(data);return session.access_token}
 catch(e){clearSession();throw Error("انتهت جلسة الدخول الآمن؛ أعد تسجيل الدخول")}
}
async function api(table,method="GET",query="",body=null,options={}){
 if(!isAdmin&&!options.allowPending)throw Error("حساب غير مخوّل للوصول إلى بيانات الإدارة");
 const token=await freshToken();
 const headers={apikey:SB_KEY,Authorization:"Bearer "+token,Accept:"application/json"};
 if(body!==null)headers["content-type"]="application/json";
 if(method!=="GET")headers.Prefer="return=representation"+(options.upsert?",resolution=merge-duplicates":"");
 const target=REST+"/"+encodeURIComponent(table)+(query?"?"+query:"");
 const res=await fetch(target,{method,headers,body:body===null?undefined:JSON.stringify(body),cache:"no-store"});
 const data=await res.json().catch(()=>null);
 if(!res.ok)throw Error((data?.message||data?.hint||data?.error||"خطأ في حفظ البيانات")+" ("+res.status+")");
 return data;
}
async function checkPermission(){
 const raw=await api("store_currency_settings","GET","select=singleton&limit=1",null,{allowPending:true});
 if(!Array.isArray(raw)||raw.length!==1)throw Error("هذا الحساب غير مدرج في صلاحيات إدارة فونكورا");
 isAdmin=true;revealDashboard();
 const email=session.user?.email||ADMIN_EMAIL;
 setMessage("identity",email);
 await loadAll();
}
function showRecoveryForm(){
 revealAuth();$("recoveryForm").classList.remove("hidden");$("loginForm").classList.add("hidden");$("forgotPassword").classList.add("hidden");
}
function hideRecoveryForm(){
 recoveryAuthorized=false;$("recoveryForm").classList.add("hidden");$("loginForm").classList.remove("hidden");$("forgotPassword").classList.remove("hidden");
 $("recoveryCode").value="";$("newPassword").value="";$("confirmNewPassword").value="";
}
async function loginWithPassword(event){
 event.preventDefault();const btn=$("loginSubmit");setBusy(btn,true);
 try{
  const password=$("loginPassword").value;
  if(password.length<8)throw Error("كلمة المرور غير صحيحة");
  const result=await authCall("/token?grant_type=password",{email:ADMIN_EMAIL,password});
  $("loginPassword").value="";
  saveSession(result);
  await checkPermission();
  notify("تم تسجيل دخول المدير بنجاح");
 }catch(err){
  $("loginPassword").value="";clearSession();
  setMessage("loginStatus","تأكد من كلمة المرور ومن تأكيد بريد الحساب؛ إذا لم يُفعّل الحساب فاستخدم رسالة التأكيد أولاً.");
  fail(err);
 }finally{setBusy(btn,false)}
}
async function activateFirstManager(){
 const btn=$("signupAdmin"),password=$("loginPassword").value;
 if(password.length<12){notify("أدخل كلمة مرور لا تقل عن ١٢ محرفاً قبل تفعيل المدير",true);return}
 setBusy(btn,true);
 try{
  const result=await authCall("/signup?redirect_to="+encodeURIComponent(location.origin+"/admin.html"),{email:ADMIN_EMAIL,password});
  $("loginPassword").value="";
  if(result?.access_token&&result?.refresh_token){
   saveSession(result);await checkPermission();notify("تم تفعيل حساب المدير وتسجيل الدخول");return;
  }
  $("signupConfirmForm").classList.remove("hidden");
  setMessage("signupStatus","استُلم طلب التفعيل. راجع بريد "+ADMIN_EMAIL+" لرسالة تأكيد الحساب. افتح رابط الرسالة، أو أدخل الرمز إن كان موجوداً. لا تشارك الرمز مع أحد.");
  notify("راجع بريد Gmail لتأكيد الحساب");
 }catch(err){
  $("loginPassword").value="";setMessage("signupStatus",err?.message||"تعذر إرسال طلب تفعيل الحساب");fail(err);
 }finally{setBusy(btn,false)}
}
async function verifySignupCode(event){
 event.preventDefault();const code=$("signupConfirmationCode").value.trim();
 if(!/^[0-9]{6,12}$/.test(code)){notify("أدخل رمز التفعيل الرقمي من رسالة البريد",true);return}
 const btn=$("verifySignup");setBusy(btn,true);
 try{
  const data=await authCall("/verify",{email:ADMIN_EMAIL,token:code,type:"signup"});
  saveSession(data);$("signupConfirmationCode").value="";
  await checkPermission();notify("تم تأكيد حساب المدير");
 }catch(err){fail(err)}
 finally{setBusy(btn,false)}
}
async function requestRecovery(event){
 event?.preventDefault?.();
 const trigger=event?.currentTarget;
 setBusy(trigger,true);
 try{
  await authCall("/recover?redirect_to="+encodeURIComponent(location.origin+"/admin.html"),{email:ADMIN_EMAIL});
  showRecoveryForm();
  setMessage("recoveryHelp","أُرسل طلب استعادة إلى بريد المدير. إذا وجدت رابطاً فافتحه، وإذا وجدت رمزاً فأدخله هنا. عند استخدام الرابط سيُسمح بإدخال كلمة مرور جديدة.");
  setMessage("loginStatus","تحقق من بريد "+ADMIN_EMAIL+"، بما فيه الرسائل غير المرغوب فيها.");
  setMessage("recoveryStatus","أُرسل طلب تغيير كلمة المرور. تحقق من بريد المدير.");
  notify("تحقق من Gmail لإكمال تغيير كلمة المرور");
 }catch(err){fail(err)}
 finally{setBusy(trigger,false)}
}
async function getVerifiedAdminIdentity(token){
 const res=await fetch(AUTH+"/user",{method:"GET",headers:{apikey:SB_KEY,Authorization:"Bearer "+token},cache:"no-store"});
 const data=await res.json().catch(()=>({}));
 if(!res.ok||String(data.email||"").toLowerCase()!==ADMIN_EMAIL.toLowerCase()||!data.email_confirmed_at)throw Error("حساب الاستعادة لا يطابق البريد المخوّل والمؤكد للمدير");
 return data;
}
async function completeRecovery(event){
 event.preventDefault();
 const pass=$("newPassword").value,confirmPass=$("confirmNewPassword").value,code=$("recoveryCode").value.trim();
 const btn=$("confirmRecovery");setBusy(btn,true);
 try{
  if(pass.length<12||pass!==confirmPass)throw Error("أدخل كلمة مرور جديدة من ١٢ محرفاً على الأقل، وتأكد من تطابقها مع التأكيد");
  if(code){
   if(!/^[0-9]{6,12}$/.test(code))throw Error("رمز تحقق البريد غير صالح");
   const auth=await authCall("/verify",{email:ADMIN_EMAIL,token:code,type:"recovery"});
   saveSession(auth);recoveryAuthorized=true;
  }
  if(!recoveryAuthorized)throw Error("يجب تأكيد البريد أولاً عبر رمز الاستعادة أو رابط التحقق المرسل من Supabase");
  const token=await freshToken();
  await getVerifiedAdminIdentity(token);
  await authCall("/user",{password:pass},"PUT",{Authorization:"Bearer "+token});
  $("newPassword").value="";$("confirmNewPassword").value="";$("recoveryCode").value="";
  await signOut();
  hideRecoveryForm();
  setMessage("loginStatus","تغيّرت كلمة المرور بنجاح. ادخل بكلمة المرور الجديدة.");
  notify("تم تغيير كلمة المرور بنجاح");
 }catch(err){fail(err)}
 finally{setBusy(btn,false)}
}

async function signOut(){
 try{if(session?.access_token)await authCall("/logout",{}, "POST",{Authorization:"Bearer "+session.access_token})}catch{}
 clearSession();notify("تم تسجيل الخروج");
}
function extractRedirect(){
 const hash=new URLSearchParams(location.hash.slice(1)),q=new URLSearchParams(location.search);
 const mode=hash.get("type")||q.get("type")||"";
 if(hash.has("error")||q.has("error")){
  setMessage("loginStatus","فشل رابط البريد أو انتهت صلاحيته. اطلب رسالة جديدة.");
  history.replaceState(null,"",location.pathname);return;
 }
 if(hash.has("access_token")&&hash.has("refresh_token")){
  const data={access_token:hash.get("access_token"),refresh_token:hash.get("refresh_token"),expires_in:Number(hash.get("expires_in"))||3600};
  history.replaceState(null,"",location.pathname);
  saveSession(data);
  if(mode==="recovery"){recoveryAuthorized=true;showRecoveryForm();setMessage("recoveryHelp","تم التحقق من رابط البريد. أدخل كلمة المرور الجديدة مرتين واترك رمز التحقق فارغاً.");}
  return;
 }
 if(q.has("token_hash")&&["recovery","email","signup"].includes(mode)){
  const value=q.get("token_hash");history.replaceState(null,"",location.pathname);
  return authCall("/verify",{token_hash:value,type:mode}).then(data=>{
   saveSession(data);
   if(mode==="recovery"){recoveryAuthorized=true;showRecoveryForm();setMessage("recoveryHelp","تم تأكيد رابط الاستعادة. أدخل كلمة المرور الجديدة مرتين.");}
  });
 }
}
async function boot(){
 $("loginForm").addEventListener("submit",loginWithPassword);
 $("signupAdmin").addEventListener("click",activateFirstManager);
 $("signupConfirmForm").addEventListener("submit",verifySignupCode);
 $("showLoginPassword").addEventListener("click",()=>{const input=$("loginPassword");const visible=input.type==="password";input.type=visible?"text":"password";$("showLoginPassword").textContent=visible?"إخفاء":"إظهار";});
 $("forgotPassword").addEventListener("click",requestRecovery);
 $("changePassword").addEventListener("click",requestRecovery);
 $("recoveryForm").addEventListener("submit",completeRecovery);
 $("cancelRecovery").addEventListener("click",()=>{hideRecoveryForm();setMessage("loginStatus","يمكنك تسجيل الدخول بكلمة المرور الحالية أو طلب رسالة استعادة جديدة.");});
 $("logout").addEventListener("click",signOut);
 $("reloadAll").addEventListener("click",()=>loadAll().catch(fail));
 $("newPhone").addEventListener("click",()=>openEditor("phone"));
 $("newBrand").addEventListener("click",()=>openEditor("brand"));
 $("newCatalogCategory").addEventListener("click",()=>openEditor("catalogCategory"));
 $("newCategory").addEventListener("click",()=>openEditor("category"));
 $("newVariant").addEventListener("click",()=>openEditor("variant"));
 $("phoneSearch").addEventListener("input",renderPhones);
 $("phoneStateFilter").addEventListener("change",renderPhones);
 $("priceSearch").addEventListener("input",renderPrices);
 $("closeEditor").addEventListener("click",closeEditor);
 $("cancelEdit").addEventListener("click",closeEditor);
 $("editorOverlay").addEventListener("click",e=>{if(e.target===$("editorOverlay"))closeEditor()});
 $("editorForm").addEventListener("submit",saveEditor);
 $("checkFx").addEventListener("click",loadFX);
 $("showAudit").addEventListener("click",()=>loadAudit().catch(fail));
 document.addEventListener("keydown",e=>{if(e.key==="Escape")closeEditor()});
 document.addEventListener("click",e=>{
  const target=e.target.closest("button");
  if(!target)return;
  if(target.dataset.page)changePage(target.dataset.page);
  if(target.dataset.open){changePage(target.dataset.open);if(target.dataset.new)openEditor(target.dataset.new)}
  if(target.dataset.edit)openEditor(target.dataset.edit,target.dataset.key);
  if(target.dataset.price)savePrice(target.dataset.price).catch(fail);
 });
 try{
  const maybe=extractRedirect();if(maybe&&typeof maybe.then==="function")await maybe;
  if(!session){try{const s=sessionStorage.getItem(SESSION_KEY);if(s)session=JSON.parse(s)}catch{}}
  if(recoveryAuthorized){showRecoveryForm()}else if(session){await checkPermission()}else{revealAuth()}
 }catch(e){clearSession();setMessage("loginStatus",e?.message||"لا يمكن التحقق من حساب المدير");}
}
async function loadAll(){
 const btn=$("reloadAll");setBusy(btn,true);
 try{
  const names=["brands","phone_models","catalog_categories","accessory_families","phone_variants","phone_price_guides","phone_accessory_profiles","store_currency_settings"];
  const data=await Promise.all(names.map(name=>api(name,"GET","select=*&limit=500")));
  [db.brands,db.phones,db.catalogCategories,db.categories,db.variants,db.prices,db.profiles,db.settings]=data;
  renderAll();
  loadFX();
  notify("تم تحديث بيانات المتجر من السحابة");
 }catch(err){fail(err)}
 finally{setBusy(btn,false)}
}
async function loadAudit(){
 const events=await api("fonkora_admin_audit_view","GET","select=event_id,actor,target_table,operation,row_key,occurred_at&order=event_id.desc&limit=40");
 const operations={INSERT:"إضافة",UPDATE:"تعديل",DELETE:"حذف"};
 $("auditList").innerHTML=Array.isArray(events)&&events.length
  ?'<div class="audit-wrap">'+events.map(e=>'<div class="audit-line"><b>'+esc(operations[e.operation]||e.operation)+'</b> <span>'+esc(e.target_table)+' · '+esc(e.row_key||"—")+'</span> <small>'+esc(new Date(e.occurred_at).toLocaleString("ar-SY"))+'</small></div>').join("")+'</div>'
  :'<p>لم تُسجل تغييرات بعد.</p>';
}
function changePage(id){
 if(!PAGE_TITLES[id])return;
 page=id;$("pageTitle").textContent=PAGE_TITLES[id];
 document.querySelectorAll(".tab").forEach(el=>el.classList.toggle("active",el.id==="page-"+id));
 document.querySelectorAll(".nav-btn").forEach(el=>el.classList.toggle("active",el.dataset.page===id));
 window.scrollTo({top:0,behavior:"instant"});
}
const record=(obj)=>'<article class="record">'+(obj.img?'<img class="record-img" loading="lazy" alt="" src="'+esc(obj.img)+'">':'<div class="record-img record-image-fallback" aria-hidden="true">▣</div>')+
 '<div class="record-main"><strong>'+esc(obj.title)+'</strong><p>'+esc(obj.subtitle||"")+'</p><div class="record-meta">'+(obj.chips||[]).map(c=>'<span class="pill '+(c.draft?"draft":c.published?"published":"")+'">'+esc(c.label)+'</span>').join("")+'</div></div>'+
 '<button type="button" class="record-action" data-edit="'+esc(obj.type)+'" data-key="'+esc(obj.key)+'">تعديل</button></article>';
function renderAll(){renderOverview();renderPhones();renderBrands();renderCategories();renderVariants();renderPrices()}
function renderOverview(){
 const published=db.phones.filter(p=>p.is_published).length;
 const metrics=[
 ["إجمالي الهواتف",db.phones.length],["منشور للزوار",published],
 ["مسودات تحتاج مراجعة",db.phones.length-published],["الماركات",db.brands.length],
 ["فئات المتجر",db.catalogCategories.length],["تصنيفات الإكسسوارات",db.categories.length],
 ["الإصدارات",db.variants.length],["الأسعار الأولية",db.prices.length]
 ];
 $("stats").innerHTML=metrics.map(([a,b])=>'<div class="stat"><small>'+esc(a)+'</small><strong>'+fmt(b)+'</strong></div>').join("");
 setMessage("overviewCounts",fmt(published)+" هاتفاً منشوراً، "+fmt(db.variants.filter(x=>x.is_available).length)+" إصداراً محدداً كمتاح في قاعدة البيانات. البيع على الموقع غير مفعل حتى بناء نظام الطلبات.");
}
function renderPhones(){
 const search=$("phoneSearch").value.trim().toLowerCase(),state=$("phoneStateFilter").value;
 const list=db.phones.filter(p=>(state==="all"||(state==="published"?p.is_published:!p.is_published))&&[p.name,p.slug,p.brand_slug].join(" ").toLowerCase().includes(search))
  .sort((a,b)=>a.name.localeCompare(b.name,"en"));
 setMessage("phoneTotal",fmt(list.length)+" نتيجة");
 $("phonesList").innerHTML=list.map(p=>record({title:p.name,subtitle:(db.brands.find(b=>b.slug===p.brand_slug)?.name||p.brand_slug)+" • "+p.slug,img:p.image_url,type:"phone",key:p.slug,chips:[{label:p.is_published?"منشور":"مسودة",published:p.is_published,draft:!p.is_published},{label:p.image_url?"صورة مرفقة":"بلا صورة",draft:!p.image_url}]})).join("")||'<div class="panel muted">لا توجد هواتف مطابقة للبحث.</div>';
}
function renderBrands(){
 $("brandsList").innerHTML=db.brands.slice().sort((a,b)=>a.sort_order-b.sort_order).map(b=>record({title:b.name,subtitle:b.short_name+" • "+b.slug,img:b.logo_url,type:"brand",key:b.slug,chips:[{label:b.is_published?"ظاهرة للزوار":"مخفية",published:b.is_published,draft:!b.is_published}]})).join("")||'<div class="panel">لا توجد ماركات.</div>';
}
function renderCategories(){
 $("catalogCategoriesList").innerHTML=db.catalogCategories.slice().sort((a,b)=>a.sort_order-b.sort_order).map(c=>record({title:c.name_ar,subtitle:(c.kind==="phones"?"هواتف":"إكسسوارات")+" • "+c.slug,type:"catalogCategory",key:c.slug,chips:[{label:c.is_published?"منشور":"مسودة",published:c.is_published,draft:!c.is_published}]})).join("")||'<div class="muted">لا توجد تصنيفات عامة.</div>';
 $("categoriesList").innerHTML=db.categories.slice().sort((a,b)=>a.sort_order-b.sort_order).map(c=>record({title:c.name_ar,subtitle:c.description_ar+" • "+c.slug,type:"category",key:c.slug,chips:[{label:c.compatibility_kind},{label:c.is_published?"منشور":"مسودة",published:c.is_published,draft:!c.is_published}]})).join("")||'<div class="muted">لا توجد تصنيفات إكسسوارات.</div>';
}
function renderVariants(){
 $("variantsList").innerHTML=db.variants.slice().sort((a,b)=>b.id-a.id).map(v=>record({title:v.sku,subtitle:(db.phones.find(p=>p.slug===v.model_slug)?.name||v.model_slug)+" • "+(v.color_label||"لون غير محدد")+" • "+(v.storage_gb||"؟")+"GB",type:"variant",key:String(v.id),chips:[{label:v.is_published?"منشور":"مسودة",published:v.is_published,draft:!v.is_published},{label:v.is_available?"محدد كمتاح":"غير متاح"}]})).join("")||'<div class="panel muted">لا توجد إصدارات بعد. يمكنك إضافتها دون تفعيل البيع.</div>';
}
function renderPrices(){
 const search=$("priceSearch").value.trim().toLowerCase(),models=db.phones.filter(x=>[x.name,x.slug].join(" ").toLowerCase().includes(search)).sort((a,b)=>a.name.localeCompare(b.name,"en")).slice(0,120);
 $("pricesList").innerHTML=models.map(p=>{
  const guide=db.prices.find(g=>g.model_slug===p.slug);
  return '<div class="price-line"><div><strong>'+esc(p.name)+'</strong><small>'+esc(p.slug)+' — '+(guide?.is_approved?"معتمد كدليل":"تقديري غير ملزم")+'</small></div><input type="number" min="1" step=".01" id="price-'+esc(p.slug)+'" aria-label="السعر بالدولار لهاتف '+esc(p.name)+'" value="'+esc(guide?.usd_estimate??"")+'" placeholder="USD"><button data-price="'+esc(p.slug)+'" type="button">حفظ السعر</button></div>';
 }).join("")||'<p class="muted">لا يوجد جهاز مطابق.</p>';
}
async function loadFX(){
 try{const r=await fetch("./api/rates",{cache:"no-store"}),a=await r.json();if(!r.ok||!a.market?.sell)throw Error("المصدر غير متاح");
  const stamp=a.market.updated_at?new Date(a.market.updated_at).toLocaleString("ar-SY",{timeZone:"Asia/Damascus"}):"دون توقيت";
  setMessage("fxInfo","١ دولار = "+fmt(a.market.sell)+" ليرة جديدة ≈ "+fmt(a.market.sell*100)+" ليرة قديمة. المصدر: "+(a.market.source==="international"?"مرجع دولي":"سوق دمشق")+". تحديث: "+stamp);
 }catch(e){setMessage("fxInfo","تعذر قراءة سعر صرف مرجعي موثوق الآن")}
}
async function savePrice(slug){
 const input=$("price-"+slug),value=Number(input?.value);
 if(!Number.isFinite(value)||value<=0||value>1000000){notify("حدد سعراً أولياً بالدولار أكبر من صفر",true);return}
 const existing=db.prices.find(p=>p.model_slug===slug);
 const payload={model_slug:slug,usd_estimate:value,basis:"تقدير أولي لتجربة الموقع، غير معتمد للبيع",is_approved:false};
 const result=await api("phone_price_guides","POST","on_conflict=model_slug",payload,{upsert:true});
 notify("حُفظ السعر الأولي — لا يزال غير معتمد للبيع");
 await loadAll();
}
function field(id,label,val="",type="text",required=false,extra=""){
 return '<div class="field"><label for="f-'+esc(id)+'">'+esc(label)+'</label><input id="f-'+esc(id)+'" name="'+esc(id)+'" type="'+esc(type)+'" value="'+esc(val??"")+'" '+(required?"required":"")+' '+extra+'></div>';
}
function multiline(id,label,val="",rows=3){
 return '<div class="field wide"><label for="f-'+esc(id)+'">'+esc(label)+'</label><textarea id="f-'+esc(id)+'" name="'+esc(id)+'" rows="'+rows+'">'+esc(val??"")+'</textarea></div>';
}
function selector(id,label,choices,selected="",extra=""){
 return '<div class="field"><label for="f-'+esc(id)+'">'+esc(label)+'</label><select id="f-'+esc(id)+'" name="'+esc(id)+'" '+extra+'>'+choices.map(([v,t])=>'<option value="'+esc(v)+'" '+(String(selected)===String(v)?"selected":"")+'>'+esc(t)+'</option>').join("")+'</select></div>';
}
function toggle(id,label,checked=false){
 return '<div class="checkbox-field"><input type="checkbox" id="f-'+esc(id)+'" name="'+esc(id)+'" '+(checked?"checked":"")+'><label for="f-'+esc(id)+'">'+esc(label)+'</label></div>';
}
const block=t=>'<h3 class="form-block-title">'+esc(t)+'</h3>';
const imageField=(item,kind)=>{
 const u=kind==="phone"?item.image_url:item.logo_url;
 return block("صورة المنتج")+multiline("image_url","رابط صورة HTTPS (اختياري عند رفع ملف)",u||"",2)+
 '<div class="field wide"><label for="uploadImage">رفع صورة إلى مساحة فونكورا (JPEG / PNG / WebP)</label><input id="uploadImage" type="file" accept="image/png,image/webp,image/jpeg"><small>تُضغط الصورة إلى WebP ويحافظ الملف على شفافيته إن كانت موجودة. يفضّل صورة مرخّصة بخلفية شفافة، مع عرض معاينة قبل الحفظ.</small></div>'+
 '<div id="photoPreview" class="image-preview">'+(u?'<img src="'+esc(u)+'" alt="معاينة صورة المنتج">':'<p class="muted">لم تُضف صورة بعد</p>')+'</div>';
};
const specFields=(spec)=>ADDITIONAL_SPECS.map(([key,label])=>field("spec_"+key,label,spec?.[key]||"")).join("");
function editPhone(p){
 const b=db.brands.map(x=>[x.slug,x.name]);
 const cats=db.catalogCategories.filter(x=>x.kind==="phones").map(x=>[x.slug,x.name_ar]);
 const guide=db.prices.find(g=>g.model_slug===p.slug);
 const spec=p.specifications||{};
 const commonKeys=new Set(ADDITIONAL_SPECS.map(x=>x[0]));
 const extra=Object.fromEntries(Object.entries(spec).filter(([key])=>!commonKeys.has(key)));
 return '<div class="form-grid">'+
  block("البيانات الأساسية")+
  field("slug","المعرّف اللاتيني الفريد (slug)",p.slug||"","text",true,'pattern="[a-z0-9-]{3,80}" '+(editing?"readonly":""))+
  selector("brand_slug","الماركة",b,p.brand_slug||b[0]?.[0]||"", "required")+
  selector("category_slug","تصنيف الهاتف",cats,p.category_slug||"smartphones")+
  field("name","الاسم الكامل للهاتف",p.name||"","text",true)+
  multiline("tagline_ar","وصف مختصر للمنتج",p.tagline_ar||"")+
  field("chipset","المعالج",p.chipset||"")+
  field("display_tech","تقنية الشاشة",p.display_tech||"")+
  field("display_inches","حجم الشاشة (بوصة)",p.display_inches??"","number",false,'min="2" max="12" step=".01"')+
  field("screen_hz","تحديث الشاشة (Hz)",p.screen_hz??"","number",false,'min="30" max="360"')+
  field("battery_mah","سعة البطارية (mAh)",p.battery_mah??"","number",false,'min="1000" max="20000"')+
  field("camera_main_mp","دقة الكاميرا الرئيسية (MP)",p.camera_main_mp??"","number",false,'min="1" max="500" step=".1"')+
  multiline("strengths","نقاط القوة، مفصولة بفاصلة عربية أو إنجليزية",(p.strengths||[]).join("، "))+
  block("المواصفات التفصيلية")+specFields(spec)+
  multiline("custom_json","مواصفات إضافية متقدمة بصيغة JSON",JSON.stringify(extra,null,2),5)+
  block("الصور والمصادر")+imageField(p,"phone")+
  field("specs_source_url","رابط المواصفات الرسمية (HTTPS)",p.specs_source_url||"","url",true)+
  field("image_credit_url","رابط مصدر الصورة وحقوقها",p.image_credit_url||"","url")+
  field("verified_on","آخر تاريخ تحقق من المواصفات",p.verified_on||"","date")+
  block("التسعير والحالة")+
  field("guide_usd","السعر الأولي التقديري بالدولار",guide?.usd_estimate??"","number",false,'min="1" max="1000000" step=".01"')+
  '<div class="field wide">'+toggle("is_published","نشر الهاتف للزوار بعد التحقق من الصورة والمصدر",Boolean(p.is_published))+'</div>'+
  '<div class="editor-tip warning-tip field wide">أول سعر بالدولار هنا استرشادي وليس سعراً تجارياً معتمداً. ابدأ الهاتف الجديد كمسودة، ثم راجعه قبل نشره.</div>'+
 '</div>';
}
function editBrand(b){
 return '<div class="form-grid">'+block("بيانات الماركة")+
 field("slug","معرّف الماركة بالإنجليزية",b.slug||"","text",true,'pattern="[a-z0-9-]{2,40}" '+(editing?"readonly":""))+
 field("name","الاسم الرسمي (English)",b.name||"","text",true)+
 field("short_name","اسم العرض بالعربية",b.short_name||"","text",true)+
 field("sort_order","الترتيب",b.sort_order??0,"number")+
 imageField(b,"brand")+
 '<div class="field wide">'+toggle("is_published","إظهار هذه الماركة على واجهة الزبائن",Boolean(b.is_published))+'</div></div>';
}
function editCatalogCategory(c){
 return '<div class="form-grid">'+block("تصنيف المتجر")+
 field("slug","المعرّف اللاتيني",c.slug||"","text",true,'pattern="[a-z0-9-]{3,50}" '+(editing?"readonly":""))+
 field("name_ar","اسم التصنيف",c.name_ar||"","text",true)+
 selector("kind","نوع التصنيف",[["phones","هواتف"],["accessories","إكسسوارات"]],c.kind||"phones")+
 multiline("description_ar","وصف التصنيف",c.description_ar||"")+
 field("sort_order","ترتيب العرض",c.sort_order??0,"number")+
 '<div class="field wide">'+toggle("is_published","إظهار التصنيف للزوار",Boolean(c.is_published))+'</div></div>';
}
function editCategory(c){
 return '<div class="form-grid">'+block("فئة الإكسسوارات")+
 field("slug","معرّف الفئة",c.slug||"","text",true,'pattern="[a-z0-9-]{3,50}" '+(editing?"readonly":""))+
 field("name_ar","اسم الفئة",c.name_ar||"","text",true)+
 multiline("description_ar","وصف الفئة",c.description_ar||"")+
 selector("compatibility_kind","طريقة تحقق التوافق",[["connector","حسب نوع المنفذ"],["model_specific","حسب موديل الهاتف"],["universal_check","يتطلب تحققاً منفصلاً"]],c.compatibility_kind||"universal_check")+
 field("connector_required","نوع المنفذ المطلوب (إن وجد)",c.connector_required||"")+
 field("sort_order","ترتيب العرض",c.sort_order??0,"number")+
 '<div class="field wide">'+toggle("is_published","نشر الفئة للزوار",Boolean(c.is_published))+'</div></div>';
}
function editVariant(v){
 return '<div class="form-grid">'+block("الإصدار")+
 selector("model_slug","الهاتف",db.phones.map(p=>[p.slug,p.name]),v.model_slug||db.phones[0]?.slug||"")+
 field("sku","رمز الإصدار الفريد SKU",v.sku||"","text",true)+
 field("color_label","اللون",v.color_label||"")+
 field("ram_gb","RAM (GB)",v.ram_gb??"","number",false,'min="1" max="128"')+
 field("storage_gb","السعة (GB)",v.storage_gb??"","number",false,'min="16" max="8192"')+
 field("price_usd","سعر البيع بالدولار (اختياري)",v.price_usd??"","number",false,'min="1" step=".01"')+
 field("price_syp_new_fixed","سعر الليرة الجديدة الثابت (اختياري)",v.price_syp_new_fixed??"","number",false,'min="1" step=".01"')+
 field("stock_count","عدد القطع المتوفرة فعلاً",v.stock_count??"","number",false,'min="0" step="1"')+
 '<div class="field wide">'+toggle("is_published","نشر الإصدار في بيانات المتجر",Boolean(v.is_published))+'</div>'+
 '<div class="field wide">'+toggle("is_available","تحديده متوفراً في المخزون (لا يعني استقبال طلبات)",Boolean(v.is_available))+'</div>'+
 '<div class="editor-tip warning-tip field wide">الشراء غير مفعل. لا تحدد «متوفر» ما لم تكن الكمية موجودة فعلاً، ولا تنشر سعراً نهائياً دون موافقة صاحب المتجر.</div></div>';
}
function openEditor(type,key=null){
 if(!isAdmin){notify("تسجيل الدخول مطلوب",true);return}
 const def={
  phone:["هاتف","phones",db.phones,"slug",editPhone],
  brand:["ماركة","brands",db.brands,"slug",editBrand],
  catalogCategory:["تصنيف عام","catalogCategories",db.catalogCategories,"slug",editCatalogCategory],
  category:["فئة إكسسوار","categories",db.categories,"slug",editCategory],
  variant:["إصدار","variants",db.variants,"id",editVariant]
 }[type];
 if(!def)return;
 editorType=type;editing=key;
 photoFile=null;photoPreview=null;
 const row=key===null?{}:def[2].find(x=>String(x[def[3]])===String(key));
 if(key!==null&&!row){notify("لم يتم العثور على السجل",true);return}
 $("editorHeading").textContent=(editing!==null?"تعديل ":"إضافة ")+def[0];
 $("editorFields").innerHTML=def[4](row||{});
 setMessage("editorStatus","لن تُحفظ التعديلات حتى تضغط «حفظ البيانات».");
 $("editorOverlay").classList.remove("hidden");
 $("saveEdit").disabled=false;
 const upload=$("uploadImage");
 if(upload)upload.addEventListener("change",function(){
  const file=this.files?.[0];if(!file)return;
  if(!["image/png","image/jpeg","image/webp"].includes(file.type)){notify("ملف غير مدعوم",true);return}
  if(file.size>10*1024*1024){notify("حجم الملف قبل الضغط يجب ألا يتجاوز ١٠ ميغابايت",true);return}
  photoFile=file;
  if(photoPreview)URL.revokeObjectURL(photoPreview);
  photoPreview=URL.createObjectURL(file);
  $("photoPreview").innerHTML='<img alt="معاينة الصورة المختارة" src="'+esc(photoPreview)+'">';
 });
 $("editorPanel")?.focus?.();
}
function closeEditor(){if(photoPreview){URL.revokeObjectURL(photoPreview);photoPreview=null}photoFile=null;editorType=null;editing=null;$("editorOverlay").classList.add("hidden");$("editorFields").innerHTML=""}
const value=id=>($("f-"+id)?.value||"").trim();
const check=id=>Boolean($("f-"+id)?.checked);
const num=(id,integer=false)=>{const s=value(id);if(!s)return null;const n=Number(s);if(!Number.isFinite(n)||(integer&&!Number.isInteger(n)))throw Error("العدد في "+id+" غير صحيح");return n};
function getModelPayload(){
 const slug=value("slug"),name=value("name"),brand=value("brand_slug");
 if(!slugOK(slug)||invalid(name)||!brand)throw Error("أدخل اسم الهاتف ومعرّفاً لاتينياً وماركة صحيحة");
 if(!db.brands.some(b=>b.slug===brand))throw Error("العلامة المختارة غير موجودة");
 let additional={};
 try{additional=JSON.parse(value("custom_json")||"{}");if(!additional||Array.isArray(additional)||typeof additional!=="object")throw Error()}catch{throw Error("صيغة JSON الإضافية غير صحيحة")}
 for(const [key] of ADDITIONAL_SPECS){const v=value("spec_"+key);if(v)additional[key]=v;else delete additional[key]}
 const source=normalizeUrl(value("specs_source_url"));
 if(!source)throw Error("لا يمكن إضافة الهاتف دون رابط مواصفات رسمي HTTPS");
 return {
  slug,brand_slug:brand,category_slug:value("category_slug")||null,name,
  tagline_ar:value("tagline_ar"),chipset:value("chipset")||null,
  battery_mah:num("battery_mah",true),display_inches:num("display_inches"),
  screen_hz:num("screen_hz",true),camera_main_mp:num("camera_main_mp"),
  display_tech:value("display_tech")||null,
  strengths:[...new Set(value("strengths").split(/[،,]/).map(x=>x.trim()).filter(Boolean))],
  specifications:additional,specs_source_url:source,
  image_url:normalizeUrl(value("image_url")),image_credit_url:normalizeUrl(value("image_credit_url")),
  verified_on:value("verified_on")||null,is_published:check("is_published")
 };
}
async function compressPhoto(file){
 const bitmap=await createImageBitmap(file);
 const scale=Math.min(1,1200/Math.max(bitmap.width,bitmap.height)),w=Math.max(1,Math.round(bitmap.width*scale)),h=Math.max(1,Math.round(bitmap.height*scale));
 const c=document.createElement("canvas");c.width=w;c.height=h;
 const ctx=c.getContext("2d",{alpha:true});ctx.clearRect(0,0,w,h);ctx.drawImage(bitmap,0,0,w,h);bitmap.close?.();
 const b=await new Promise(resolve=>c.toBlob(resolve,"image/webp",.87));
 if(!b)throw Error("لم ينجح تحويل الصورة إلى WebP");
 if(b.size>2*1024*1024)throw Error("الصورة بعد الضغط كبيرة جداً؛ استخدم صورة أصغر");
 return b;
}
async function uploadPhoto(file,kind){
 const token=await freshToken();
 const image=await compressPhoto(file);
 const folder=kind==="phone"?"phones":"brands";
 const path=folder+"/"+Date.now()+"-"+crypto.randomUUID().replaceAll("-","")+".webp";
 const u=SB_URL+"/storage/v1/object/"+PHOTO_BUCKET+"/"+path;
 const res=await fetch(u,{method:"POST",headers:{apikey:SB_KEY,Authorization:"Bearer "+token,"content-type":"image/webp","cache-control":"3600","x-upsert":"false"},body:image});
 const data=await res.json().catch(()=>({}));
 if(!res.ok)throw Error(data?.message||data?.error||"فشل رفع الصورة إلى المشروع");
 return SB_URL+"/storage/v1/object/public/"+PHOTO_BUCKET+"/"+path;
}
async function saveRow(table,keyName,payload){
 if(editing!==null)return api(table,"PATCH",keyName+"=eq."+encodeURIComponent(String(editing)),payload);
 return api(table,"POST","",payload);
}
async function saveEditor(event){
 event.preventDefault();
 if(!isAdmin)return;
 const btn=$("saveEdit");setBusy(btn,true);setMessage("editorStatus","جارٍ فحص البيانات وحفظها...");
 try{
  let table="",payload={},guide=null;
  if(editorType==="phone"){
   table="phone_models";payload=getModelPayload();
   if(photoFile){setMessage("editorStatus","جارٍ ضغط الصورة ورفعها...");payload.image_url=await uploadPhoto(photoFile,"phone")}
   if(payload.is_published&&(!payload.image_url||!payload.verified_on||!payload.image_credit_url))throw Error("النشر يتطلب صورة معروفة المصدر، وتاريخ تحقق للمواصفات، ورابط حقوق الصورة");
   if(editing===null)payload.is_published=false;
   const g=value("guide_usd");
   if(g){const n=Number(g);if(!(n>0&&n<1000000))throw Error("السعر الأولي غير صحيح");guide={model_slug:payload.slug,usd_estimate:n,basis:"تقدير أولي لتجربة الموقع، غير معتمد للبيع",is_approved:false}}
  }else if(editorType==="brand"){
   table="brands";
   payload={slug:value("slug"),name:value("name"),short_name:value("short_name"),logo_url:normalizeUrl(value("image_url")),sort_order:num("sort_order",true)??0,is_published:check("is_published")};
   if(photoFile)payload.logo_url=await uploadPhoto(photoFile,"brand");
   if(!slugOK(payload.slug,2,40)||invalid(payload.name)||invalid(payload.short_name))throw Error("أكمل اسم الماركة ومعرّفها الصحيح");
  }else if(editorType==="catalogCategory"){
   table="catalog_categories";
   payload={slug:value("slug"),name_ar:value("name_ar"),kind:value("kind"),description_ar:value("description_ar"),sort_order:num("sort_order",true)??0,is_published:check("is_published")};
   if(!slugOK(payload.slug,3,50)||invalid(payload.name_ar)||!["phones","accessories"].includes(payload.kind))throw Error("بيانات التصنيف غير صحيحة");
  }else if(editorType==="category"){
   table="accessory_families";
   payload={slug:value("slug"),name_ar:value("name_ar"),description_ar:value("description_ar"),compatibility_kind:value("compatibility_kind"),connector_required:value("connector_required")||null,sort_order:num("sort_order",true)??0,is_published:check("is_published")};
   if(!slugOK(payload.slug,3,50)||invalid(payload.name_ar))throw Error("بيانات فئة الإكسسوارات غير صحيحة");
  }else if(editorType==="variant"){
   table="phone_variants";
   payload={model_slug:value("model_slug"),sku:value("sku"),color_label:value("color_label")||null,ram_gb:num("ram_gb",true),storage_gb:num("storage_gb",true),price_usd:num("price_usd"),price_syp_new_fixed:num("price_syp_new_fixed"),stock_count:num("stock_count",true),is_published:check("is_published"),is_available:check("is_available")};
   if(payload.sku.length<3)throw Error("رمز SKU يجب ألا يقل عن ٣ أحرف");
   if(payload.is_available&&(!payload.stock_count||payload.stock_count<1||!(payload.price_usd>0||payload.price_syp_new_fixed>0)))throw Error("لا يمكن تحديد منتج متوفراً دون مخزون حقيقي وسعر معروف");
   if(payload.is_published&&payload.is_available&&!(db.phones.find(p=>p.slug===payload.model_slug)?.is_published))throw Error("انشر موديل الهاتف أولاً قبل إتاحة الإصدار");
  }else throw Error("نوع محرر غير معروف");
  if(!table)throw Error("لا يمكن تحديد جدول الحفظ");
  if(editorType==="phone"&&editing!==null&&payload.slug!==editing)throw Error("لا يجوز تغيير معرّف الهاتف بعد إنشائه");
  if(editing!==null&&["brand","category","catalogCategory"].includes(editorType)&&payload.slug!==editing)throw Error("معرّف السجل ثابت بعد الإنشاء");
  if(editorType==="phone"&&editing!==null){
    const prev=db.phones.find(p=>p.slug===editing);
    if(prev?.is_published!==payload.is_published){
     if(!confirm(payload.is_published?"هل تحققت من جميع معلومات الهاتف ومصدر الصورة وتريد نشره للزوار؟":"هل تريد إخفاء هذا الهاتف عن الزوار؟"))throw Error("أُلغي تغيير النشر");
    }
  }
  setMessage("editorStatus","جارٍ حفظ البيانات...");
  await saveRow(table,editorType==="variant"?"id":"slug",payload);
  if(guide){
   await api("phone_price_guides","POST","on_conflict=model_slug",guide,{upsert:true});
  }
  closeEditor();
  notify("حُفظت بيانات المتجر في Supabase بنجاح");
  await loadAll();
 }catch(err){setMessage("editorStatus",err?.message||String(err));fail(err)}
 finally{setBusy(btn,false)}
}
boot();
