"use strict";
/* Montana Stage 2: explainable choices; no invented benchmarks, price or accessory SKUs. */
window.MontanaStage2 = (() => {
  const selection={battery:0,screen:0,hz:0,chip:"all",sort:"name",priced:false};
  const META={
    "usb-c-chargers":{icon:"battery",label:"شواحن USB-C"},
    "usb-c-cables":{icon:"filter",label:"كابلات USB-C"},
    "bluetooth-headsets":{icon:"phone",label:"سماعات بلوتوث"},
    "phone-cases":{icon:"shield",label:"حافظات مناسبة"},
    "screen-protectors":{icon:"shield",label:"حماية الشاشة"},
    "power-banks":{icon:"battery",label:"بنوك الطاقة"}
  };
  const DEFAULT_FAMILIES=[
    {slug:"usb-c-chargers",name_ar:"شواحن USB-C",description_ar:"نوع المنفذ متوافق مبدئياً، راجع بروتوكول وقدرة الشحن",compatibility_kind:"connector",connector_required:"USB-C",sort_order:10},
    {slug:"usb-c-cables",name_ar:"كابلات USB-C",description_ar:"تحقق من جودة الكابل وسرعة نقل البيانات والشحن",compatibility_kind:"connector",connector_required:"USB-C",sort_order:20},
    {slug:"bluetooth-headsets",name_ar:"سماعات بلوتوث",description_ar:"راجع إصدار البلوتوث والميزات المدعومة",compatibility_kind:"universal_check",sort_order:30},
    {slug:"phone-cases",name_ar:"حافظات الهاتف",description_ar:"يلزم موديل مطابق تماماً",compatibility_kind:"model_specific",sort_order:40},
    {slug:"screen-protectors",name_ar:"حماية الشاشة",description_ar:"يلزم قياس ومقاس حواف مطابق تماماً",compatibility_kind:"model_specific",sort_order:50},
    {slug:"power-banks",name_ar:"بنوك الطاقة",description_ar:"راجع بروتوكول الشحن والقدرة",compatibility_kind:"universal_check",sort_order:60}
  ];
  let ctx=null,profiles=[],families=DEFAULT_FAMILIES,phoneChoice="",activeFocus="balanced",onlyDifferences=false,budgetOverride=null,requestedFromUrl=false;
  const byId=id=>document.getElementById(id);
  const e=s=>String(s??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
  const fmt=(x,precision=0)=>new Intl.NumberFormat("ar-SY",{maximumFractionDigits:precision}).format(Number(x));
  const ic=id=>'<svg class="icon" aria-hidden="true"><use href="#i-'+e(id)+'"></use></svg>';
  const getPhones=()=>ctx?.getPhones()||[];
  const getVariants=()=>ctx?.getVariants()||[];
  const currentRate=()=>Number(ctx?.getRate()?.market?.sell)||0;
  const profile=slug=>profiles.find(p=>p.model_slug===slug);
  const val=(id)=>byId(id)?.value;
  function confirmedUsd(model){
    const v=getVariants().find(v=>v.model_slug===model.slug&&v.is_published&&v.is_available&&(Number(v.price_usd)>0||Number(v.price_syp_new_fixed)>0));
    if(!v)return null;
    if(Number(v.price_usd)>0)return Number(v.price_usd);
    return currentRate()?Number(v.price_syp_new_fixed)/currentRate():null;
  }
  function selectSort(list){
    let result=list.filter(p=>{
      if(selection.battery&&(!Number(p.battery_mah)||Number(p.battery_mah)<selection.battery))return false;
      if(selection.screen&&(!Number(p.display_inches)||Number(p.display_inches)<selection.screen))return false;
      if(selection.hz&&(!Number(p.screen_hz)||Number(p.screen_hz)<selection.hz))return false;
      if(selection.chip!=="all"&&!String(p.chipset||"").toLowerCase().includes(selection.chip))return false;
      if(selection.priced&&confirmedUsd(p)===null)return false;
      return true;
    });
    const order=(a,b)=>a.name.localeCompare(b.name,"en");
    if(selection.sort==="battery")result.sort((a,b)=>Number(b.battery_mah||0)-Number(a.battery_mah||0)||order(a,b));
    else if(selection.sort==="screen")result.sort((a,b)=>Number(b.display_inches||0)-Number(a.display_inches||0)||order(a,b));
    else if(selection.sort==="recent")result.sort((a,b)=>String(b.verified_on||"").localeCompare(String(a.verified_on||""))||order(a,b));
    else result.sort(order);
    return result;
  }
  function updateFilterCount(){
    const active=[selection.battery>0,selection.screen>0,selection.hz>0,selection.chip!=="all",selection.priced].filter(Boolean).length;
    if(byId("filterCount"))byId("filterCount").textContent=active?fmt(active)+" شروط مفعّلة":"اختيارات مرنة";
  }
  function clearFilters(){
    selection.battery=0;selection.screen=0;selection.hz=0;selection.chip="all";selection.sort="name";selection.priced=false;
    for(const [id,value] of Object.entries({filterBattery:"0",filterScreen:"0",filterHz:"0",filterChip:"all",filterSort:"name"}))if(byId(id))byId(id).value=value;
    if(byId("filterPriced"))byId("filterPriced").checked=false;
    updateFilterCount();ctx?.renderCatalog();
  }
  function priorityInsight(a,b,focus){
    const pair=(title,x,y,suffix,moreIsNotBest=true)=>'<div class="insight-metric"><span>'+e(title)+'</span><strong>'+e(x==null?"غير معلن":fmt(x)+(suffix||""))+' <small>مقابل</small> '+e(y==null?"غير معلن":fmt(y)+(suffix||""))+'</strong>'+(moreIsNotBest?'<small>الأعلى رقمياً لا يعني الأفضل عملياً دون اختبار.</small>':'')+'</div>';
    if(focus==="battery"){
      const aNum=Number(a.battery_mah)||null,bNum=Number(b.battery_mah)||null;
      const note=aNum&&bNum?(aNum>bNum?e(a.name)+" يملك سعة أكبر بالمواصفات.":aNum<bNum?e(b.name)+" يملك سعة أكبر بالمواصفات.":"السعتان متساويتان بالمواصفات."):"سعة البطارية غير منشورة لكلا الجهازين أو لأحدهما.";
      return {title:"البطارية والشحن",text:note+" لكن مدة التشغيل الفعلية وسرعة الشحن تعتمد على استهلاك المعالج والشاشة والشاحن.",metric:pair("سعة البطارية",aNum,bNum," mAh")};
    }
    if(focus==="photo")return {title:"التصوير",text:"دقة المستشعر لا تكفي لاختيار أفضل كاميرا. ننصح بمقارنة نماذج الصور والفيديو في مراجعات مستقلة. تميّز عدسات التقريب والتثبيت مهم لكنه يتطلب فحص تفاصيل كل موديل.",metric:pair("الكاميرا الرئيسية",a.camera_main_mp,b.camera_main_mp," MP")};
    if(focus==="gaming")return {title:"الألعاب والأداء",text:"يستخدم كل هاتف معالجاً مختلفاً. الأرقام الاختبارية ودرجات الألعاب غير متاحة لدينا، ولذلك لا نجزم بفائز دون اختبارات مستقلة لثبات الأداء والحرارة.",metric:'<div class="insight-metric"><span>المعالجان</span><strong>'+e(a.chipset||"غير معلن")+' <small>مقابل</small> '+e(b.chipset||"غير معلن")+'</strong></div>'};
    if(focus==="everyday")return {title:"الاستخدام اليومي",text:"قارن حجم الشاشة وسهولة الحمل وعمر البطارية الفعلي ودعم التحديثات. جميع هذه الأجهزة تستطيع التصفح والتواصل، ولا يجوز اختزال التجربة إلى المعالج وحده.",metric:pair("حجم الشاشة",a.display_inches,b.display_inches," بوصة")};
    return {title:"مقارنة متوازنة",text:"اختر ما يهمك أكثر للحصول على قراءة أدق؛ لا يوجد فائز مطلق بين جهازين بمجرد جمع أرقام المواصفات.",metric:pair("تردد الشاشة",a.screen_hz,b.screen_hz," Hz")};
  }
  function decorateComparison(a,b){
    const output=byId("compareResult");if(!output||!a||!b||a.slug===b.slug)return;
    const d=priorityInsight(a,b,activeFocus);
    output.insertAdjacentHTML("beforeend",'<section class="stage2-insight"><span class="eyebrow">'+ic("spark")+' قراءة حسب أولوياتك</span><h3>'+e(d.title)+'</h3>'+d.metric+'<p>'+e(d.text)+'</p></section>');
    applyDiff();
  }
  function applyDiff(){
    const rows=[...document.querySelectorAll("#compareResult .comp-row")];
    rows.forEach(row=>{const first=row.children[0]?.textContent.trim(),second=row.children[2]?.textContent.trim();row.classList.toggle("hidden",Boolean(onlyDifferences&&first===second))});
    const n=rows.filter(r=>!r.classList.contains("hidden")).length;
    let note=byId("compareDifferenceNote");if(!note){note=document.createElement("p");note.id="compareDifferenceNote";note.className="fineprint";byId("compareResult")?.appendChild(note)}
    if(note)note.textContent=onlyDifferences?(n?"عدد الصفوف المختلفة: "+fmt(n):"لا توجد فروق في البيانات المتاحة."):"يمكنك التركيز على الاختلافات فقط.";
  }
  function compareLink(){
    const a=val("compareFirst"),b=val("compareSecond");
    const u=new URL(location.href);u.searchParams.delete("phone");u.searchParams.set("compare",a+","+b);u.searchParams.set("focus",activeFocus);
    return u.toString();
  }
  function share(url,desc){
    if(navigator.share){navigator.share({title:desc,url}).catch(()=>{});return}
    if(navigator.clipboard?.writeText){navigator.clipboard.writeText(url).then(()=>ctx?.toast("نُسخ الرابط")).catch(()=>ctx?.toast("تعذر النسخ؛ استخدم مشاركة المتصفح"));return}
    ctx?.toast("يمكن مشاركة رابط الصفحة من المتصفح");
  }
  function needsSatisfied(p,need){
    const tags=p.strengths||[];
    if(need==="استعمال يومي")return true;
    if(need==="ألعاب")return tags.includes("ألعاب")||tags.includes("أداء رائد");
    if(need==="بطارية")return tags.includes("بطارية")||Number(p.battery_mah)>=6000;
    if(need==="تصوير")return tags.includes("تصوير");
    if(need==="فيديو")return tags.includes("فيديو");
    if(need==="أداء رائد")return tags.includes("أداء رائد");
    return tags.includes(need);
  }
  function matchingReasons(p,needs){return needs.filter(n=>needsSatisfied(p,n))}
  function budgetUsd(){
    const raw=(byId("budgetManual")?.value||"").trim();
    if(raw==="")return {usd:Number(val("budgetUsd")),available:true,manual:false};
    const value=Number(raw),code=val("budgetCurrencyChoice");
    if(!Number.isFinite(value)||value<=0)return {usd:0,available:false,manual:true};
    if(code==="usd")return {usd:value,available:true,manual:true};
    const fx=currentRate();
    if(!fx)return {usd:0,available:false,manual:true};
    return {usd:value/(fx*(code==="syp_old"?100:1)),available:true,manual:true};
  }
  function buildAdvisor(phones,selectedNeeds){
    const needs=selectedNeeds?.length?selectedNeeds:["استعمال يومي"];
    const budget=budgetUsd(),withPrices=phones.filter(p=>confirmedUsd(p)!==null).length;
    const list=phones.map(p=>{
      const good=matchingReasons(p,needs);
      const worth=good.reduce((sum,n)=>sum+Math.max(1,needs.length-needs.indexOf(n)),0);
      const price=confirmedUsd(p);
      return {p,good,worth,price,within:price===null?null:budget.available&&price<=budget.usd};
    }).filter(x=>x.good.length>0&&x.within!==false)
      .sort((a,b)=>b.worth-a.worth||b.good.length-a.good.length||(a.price??Infinity)-(b.price??Infinity)||a.p.name.localeCompare(b.p.name,"en")).slice(0,5);
    let explain=(!budget.available?"تعذر تحويل الميزانية من الليرة لعدم توفر سعر صرف موثوق؛ نعرض الأقرب للمواصفات فقط.":withPrices===0?"أسعار البيع لم تُعتمد؛ النتائج مرتبة وفق المواصفات، وليست ضمن ميزانية مؤكدة.":(withPrices<phones.length?"بعض الهواتف بلا سعر معتمد، فلا يمكن التأكد من مطابقة ميزانيتها.":"الأجهزة ذات الأسعار المعتمدة الأعلى من ميزانيتك مستبعدة."));
    const html='<div class="stage2-advisor-title"><span class="eyebrow">'+ic("spark")+' اقتراحات مفسَّرة</span><h3>الأقرب لأولوياتك</h3><p>'+e(explain)+'</p></div>';
    if(!list.length)return html+'<div class="empty-state">لا توجد هواتف مطابقة للأولويات المختارة ضمن الأسعار المعتمدة إن وجدت. جرّب تغيير الاهتمامات.</div>';
    return html+list.map((x,i)=>{
      const missing=needs.filter(n=>!x.good.includes(n));
      const strengths=x.good.join("، ");
      const why='اخترناه لأنه يلبي '+fmt(x.good.length)+' من '+fmt(needs.length)+' اهتمامات: '+strengths;
      const limitation=missing.length?'لا يحقق أولوية: '+missing.join("، "):"يحقق الأولويات المحددة وفق الخصائص المدرجة";
      const priceText=x.price===null?"السعر غير محدد — لم تُحتسب الميزانية":'السعر المعتمد: $'+fmt(x.price,2);
      return '<article class="stage2-recommend"><div class="recommend-rank">'+fmt(i+1)+'</div><div class="recommend-body"><h4>'+e(x.p.name)+'</h4><p class="recommend-explain">'+e(why)+'</p><p class="recommend-limit">'+e(limitation)+'</p><p class="recommend-price">'+e(priceText)+'</p><div class="recommend-actions"><button type="button" data-detail="'+e(x.p.slug)+'">استكشف الهاتف</button><button type="button" data-compare="'+e(x.p.slug)+'">قارنه</button></div></div></article>';
    }).join('')+'<p class="fineprint">عدد الاهتمامات المطابقة ليس تقييماً تقنياً للأداء، ولا يثبت الأفضلية المطلقة. راجع اختبارات مستقلة قبل الشراء.</p>';
  }
  function renderAdvisor(phones,selectedNeeds){if(byId("advisorResults"))byId("advisorResults").innerHTML=buildAdvisor(phones,selectedNeeds)}
  function alternativeCandidates(phone,phones){
    return phones.filter(p=>p.slug!==phone.slug).map(p=>{
      const common=(phone.strengths||[]).filter(x=>(p.strengths||[]).includes(x));
      const sameDisplay=phone.display_inches&&p.display_inches&&Math.abs(Number(phone.display_inches)-Number(p.display_inches))<=0.2;
      return {p,common,sameDisplay,score:common.length*2+(sameDisplay?1:0)};
    }).filter(x=>x.score>0).sort((a,b)=>b.score-a.score||a.p.name.localeCompare(b.p.name,"en")).slice(0,3);
  }
  function accessoryLabel(family,phone){
    const p=profile(phone.slug);
    if(!p)return {status:"التحقق مطلوب",note:"لم نتحقق من بيانات توافق الهاتف"};
    if(family.compatibility_kind==="connector"){
      return family.connector_required&&p.connector_type===family.connector_required?
        {status:"ملائم من حيث المنفذ",note:"لا يعني ذلك توافق سرعة الشحن أو الطاقة؛ يلزم فحص المنتج الفعلي"}:
        {status:"غير مؤكد",note:"يتطلب محولاً أو تحققاً من المنفذ المحدد"};
    }
    if(family.compatibility_kind==="model_specific")return {status:"يتطلب مقاس الهاتف",note:"اختر إكسسواراً مصنّعاً تحديداً لموديل "+phone.name};
    return {status:"يلزم التحقق قبل الشراء",note:"الربط العام لا يضمن جميع الميزات أو السرعات"};
  }
  function accessoryPreview(phone){
    const fam=families.slice(0,4);return '<div class="detail-accessory-grid">'+fam.map(f=>{const l=accessoryLabel(f,phone);return '<div><b>'+e(f.name_ar)+'</b><small>'+e(l.status)+'</small></div>'}).join('')+'</div><p class="fineprint">هذه إرشادات لفئات الإكسسوارات فقط. التوافق التجاري يتطلب التحقق من SKU وقدرة الشحن والمقاسات.</p>';
  }
  function decorateDetail(phone){
    const target=byId("detailContent");if(!target)return;
    const alternatives=alternativeCandidates(phone,getPhones());
    const a=alternatives.length?alternatives.map(x=>'<article class="alt-item"><b>'+e(x.p.name)+'</b><small>'+(x.common.length?"تشابه في: "+e(x.common.join("، ")):"حجم شاشة متقارب")+'</small><div><button type="button" data-detail="'+e(x.p.slug)+'">تفاصيل</button><button type="button" data-compare="'+e(x.p.slug)+'">مقارنة</button></div></article>').join(''):'<p>لم نجد بدائل متقاربة بما يكفي ضمن الكتالوج الحالي.</p>';
    target.insertAdjacentHTML("beforeend",'<section class="detail-stage2"><div class="detail-tabbar" role="tablist" aria-label="اكتشف الهاتف"><button type="button" data-detail-tab="reasons" class="active" aria-selected="true">لماذا قد يناسبك؟</button><button type="button" data-detail-tab="alternatives" aria-selected="false">بدائل مشابهة</button><button type="button" data-detail-tab="compat" aria-selected="false">الإكسسوارات</button></div><div data-detail-content="reasons" class="detail-stage2-panel"><h3>أهم ما يميّزه</h3><div class="reason-tags">'+(phone.strengths||[]).map(x=>'<span>'+ic("check")+e(x)+'</span>').join('')+'</div><p>استدللنا من الخصائص المنشورة، وليس من اختبار مباشر للجهاز. قد تختلف تجربة البطارية أو الكاميرا حسب الاستخدام.</p></div><div data-detail-content="alternatives" class="detail-stage2-panel hidden"><h3>هواتف تستحق المقارنة</h3><div class="alternatives-list">'+a+'</div><p class="fineprint">البدائل مختارة بحسب تشابه المواصفات، لا بحسب السعر لأن الأسعار المعتمدة لم تُدخل بعد.</p></div><div data-detail-content="compat" class="detail-stage2-panel hidden"><h3>دليل التوافق المبدئي</h3>'+accessoryPreview(phone)+'<button type="button" class="btn btn-outline btn-sm" data-open-accessories="'+e(phone.slug)+'">افتح دليل الإكسسوارات '+ic("arrow")+'</button></div></section><div class="detail-share-row"><button type="button" data-share-phone="'+e(phone.slug)+'">'+ic("external")+' مشاركة هذا الهاتف</button></div>');
  }
  function renderFamilies(){
    const phone=getPhones().find(p=>p.slug===phoneChoice)||getPhones()[0];
    if(!phone){byId("accessoriesGrid").innerHTML='<div class="empty-state">لا يوجد هاتف في الكتالوج بعد.</div>';return}
    const t=byId("accessoryTrust");if(t)t.textContent="الاختيار الحالي: "+phone.name+" • توثيق المنفذ: "+(profile(phone.slug)?.connector_type||"غير متوفر")+" • التوافق لفئات الملحقات لا لمنتج بعينه.";
    byId("accessoriesGrid").innerHTML=families.map(f=>{const l=accessoryLabel(f,phone);const meta=META[f.slug]||{icon:"shield"};return '<article class="acc-card stage2-acc">'+ic(meta.icon)+'<h3>'+e(f.name_ar)+'</h3><p>'+e(f.description_ar)+'</p><strong>'+e(l.status)+'</strong><small>'+e(l.note)+'</small></article>'}).join("");
  }
  function refreshPhones(){
    const el=byId("accessoryPhonePick");if(!el)return;
    const models=getPhones();const existing=phoneChoice||el.value;
    el.innerHTML=models.map(p=>'<option value="'+e(p.slug)+'">'+e(p.name)+'</option>').join("");
    phoneChoice=models.some(p=>p.slug===existing)?existing:models[0]?.slug||"";
    el.value=phoneChoice;
    renderFamilies();
  }
  async function fetchCompatibility(){
    try{
      const headers={apikey:ctx.key};const timeout=AbortSignal.timeout?AbortSignal.timeout(12000):undefined;
      const [f,p]=await Promise.all([
        fetch(ctx.api+"/accessory_families?select=*&order=sort_order.asc",{headers,signal:timeout}),
        fetch(ctx.api+"/phone_accessory_profiles?select=*",{headers,signal:timeout})
      ]);
      if(!f.ok||!p.ok)throw Error("Access blocked");
      const frows=await f.json(),prows=await p.json();
      if(Array.isArray(frows)&&frows.length)families=frows;
      if(Array.isArray(prows)&&prows.length)profiles=prows;
    }catch(err){/* In fallback, unverified accessories receive cautious status only. */}
    refreshPhones();
  }
  function handleURL(){if(requestedFromUrl)return;requestedFromUrl=true;
    const u=new URL(location.href);
    const phone=u.searchParams.get("phone");
    const pair=u.searchParams.get("compare");
    if(pair){
      const [a,b]=pair.split(",");const options=getPhones();
      if(options.some(p=>p.slug===a)&&options.some(p=>p.slug===b)&&a!==b){
        byId("compareFirst").value=a;byId("compareSecond").value=b;
        const focus=u.searchParams.get("focus");if(["balanced","gaming","photo","battery","everyday"].includes(focus)){activeFocus=focus;byId("compareFocus").value=focus}
        ctx.go("compare");return;
      }
    }
    if(phone&&getPhones().some(p=>p.slug===phone))ctx.openDetail(phone);
  }
  function init(context){
    ctx=context;
    document.querySelectorAll("#advancedPanel select, #advancedPanel input").forEach(element=>element.addEventListener("change",()=>{
      selection.battery=Number(val("filterBattery"))||0;selection.screen=Number(val("filterScreen"))||0;selection.hz=Number(val("filterHz"))||0;selection.chip=val("filterChip")||"all";selection.sort=val("filterSort")||"name";selection.priced=Boolean(byId("filterPriced")?.checked);
      updateFilterCount();ctx.renderCatalog();
    }));
    byId("advancedToggle")?.addEventListener("click",()=>{const panel=byId("advancedPanel");const expanded=panel.classList.toggle("hidden")===false;byId("advancedToggle").setAttribute("aria-expanded",String(expanded))});
    byId("resetFilters")?.addEventListener("click",clearFilters);
    byId("compareFocus")?.addEventListener("change",evt=>{activeFocus=evt.target.value;ctx.renderComparison()});
    byId("compareDifferences")?.addEventListener("change",evt=>{onlyDifferences=evt.target.checked;applyDiff()});
    byId("shareComparison")?.addEventListener("click",()=>share(compareLink(),"مقارنة هواتف مونتانا"));
    byId("accessoryPhonePick")?.addEventListener("change",evt=>{phoneChoice=evt.target.value;renderFamilies()});
    byId("budgetManual")?.addEventListener("input",()=>{
      const b=budgetUsd();byId("budgetManualHint").textContent=b.available?"ميزانية محددة؛ سيتم التحقق منها فقط عند وجود سعر بيع معتمد.":"لا يمكن استخدام مبلغ سوري دون سعر صرف مرجعي متاح.";
    });
    byId("budgetCurrencyChoice")?.addEventListener("change",()=>{
      const b=budgetUsd();byId("budgetManualHint").textContent=b.available?"ستبقى المقارنة المالية مرجعية إلى أن تُعتمد الأسعار.":"سعر الصرف غير متاح لتحويل الميزانية.";
    });
    document.addEventListener("click",evt=>{
      const b=evt.target.closest("button");if(!b)return;
      if(b.dataset.detailTab){const key=b.dataset.detailTab;document.querySelectorAll(".detail-tabbar [data-detail-tab]").forEach(x=>{const yes=x.dataset.detailTab===key;x.classList.toggle("active",yes);x.setAttribute("aria-selected",String(yes))});document.querySelectorAll(".detail-stage2-panel").forEach(x=>x.classList.toggle("hidden",x.dataset.detailContent!==key))}
      else if(b.dataset.openAccessories){phoneChoice=b.dataset.openAccessories;ctx.closeDetail();ctx.go("accessories");refreshPhones()}
      else if(b.dataset.sharePhone){const u=new URL(location.href);u.searchParams.delete("compare");u.searchParams.delete("focus");u.searchParams.set("phone",b.dataset.sharePhone);share(u.toString(),"هاتف على مونتانا")}
    });
    updateFilterCount();refreshPhones();fetchCompatibility();
  }
  return {init,selectSort,decorateComparison,renderAdvisor,decorateDetail,renderAccessories:renderFamilies,refreshPhones,fetchCompatibility,handleURL,budgetUsd,matchingReasons,alternativeCandidates,accessoryLabel};
})();
