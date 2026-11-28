'use strict';
const clone=value=>JSON.parse(JSON.stringify(value));
document.addEventListener('error',e=>{
 const img=e.target;
 if(!(img instanceof HTMLImageElement)||!(/\/assets\/(content|uploads)\//.test(img.src))||Number(img.dataset.loadRetry)>=2)return;
 const n=Number(img.dataset.loadRetry||0)+1;
 img.dataset.loadRetry=String(n);
 setTimeout(()=>{const url=new URL(img.src);url.searchParams.set('retry',String(n));img.src=url.href;},n*400);
},true);
document.addEventListener('load',e=>{if(e.target instanceof HTMLImageElement)delete e.target.dataset.loadRetry;},true);
function cleanHTML(html){
 const d=new DOMParser().parseFromString(html,'text/html');
 const tags=new Set('P BR STRONG B EM I U H1 H2 H3 H4 H5 H6 UL OL LI TABLE THEAD TBODY TR TD TH BLOCKQUOTE A SPAN DIV SUP SUB HR'.split(' '));
 for(const el of [...d.body.querySelectorAll('*')]){
  if(['SCRIPT','STYLE','IFRAME','OBJECT','SVG','MATH','FORM','INPUT'].includes(el.tagName)){el.remove();continue;}
  if(!tags.has(el.tagName)){el.replaceWith(...el.childNodes);continue;}
  for(const a of [...el.attributes])if(!(['colspan','rowspan'].includes(a.name)&&/^\d{1,2}$/.test(a.value))&&!(a.name==='href'&&el.tagName==='A'&&safeURL(a.value)))el.removeAttribute(a.name);
 }
 return d.body.innerHTML;
}
function safeURL(value){return typeof value==='string'&&!/[\u0000-\u0020<>"'`]/.test(value)&&/^(https?:\/\/|mailto:|tel:|#|(?:\.\/)?[\wА-Яа-я])/i.test(value)&&!/^\w+:(?!\/\/)/.test(value.replace(/^(mailto|tel):/,'https://'));}
function validateContent(c){
 if(c?.version!==1||!c.data||!Array.isArray(c.data.TRAINERS)||!Array.isArray(c.navigation)||!Array.isArray(c.sections)||!Array.isArray(c.texts)||!Array.isArray(c.links))throw Error('Неверный формат content.json');
 for(const k of ['of','a1','a2','a3'])if(typeof c.data.DOCS_DATA?.[k]!=='string')throw Error('Отсутствует документ '+k);
 for(const t of c.data.TRAINERS)if(!t.name||!Array.isArray(t.halls))throw Error('Укажите имя и залы каждого тренера');
 for(const n of c.navigation)if(!['page','act','link'].includes(n.kind)||!n.label||!n.target)throw Error('Заполните название и переход пункта меню');
 for(const n of c.navigation.filter(n=>n.kind==='link'))if(!safeURL(n.target))throw Error('Недопустимая ссылка меню');
 for(const l of c.links)if(!safeURL(l.href))throw Error('Недопустимая ссылка: '+l.label);
 for(const t of c.data.TRAINERS){for(const k of ['img','avatar'])if(t[k]&&!safeURL(t[k]))throw Error('Недопустимый адрес фотографии');if(/[\"<>]/.test(t.name))throw Error('Имя не должно содержать HTML или двойные кавычки');}
 for(const f of Object.values(c.data.FOLD))for(const p of f.photos||[])if(!safeURL(p.src))throw Error('Укажите безопасный адрес каждой фотографии');
 for(const s of c.sections)if(!/^[a-z][a-z0-9-]*$/.test(s.id))throw Error('Неверный ID раздела');
 return c;
}
function prepareContent(source){
 const c=clone(validateContent(source)),d=c.data;
 for(const k of Object.keys(d.DOCS_DATA))if(typeof d.DOCS_DATA[k]==='string')d.DOCS_DATA[k]=cleanHTML(d.DOCS_DATA[k]);
 for(const k of Object.keys(d.TB_SOURCE))d.TB_SOURCE[k]=cleanHTML(d.TB_SOURCE[k]);
 for(const t of d.TRAINERS){for(const k of ['name','short','role','about'])if(t[k])t[k]=cleanHTML(t[k]);for(const k of ['spec','edu','exp'])if(t[k])t[k]=t[k].map(cleanHTML);}
 for(const k of ['sun','moon','earth']){d.PZT[k][0]=d.HALLS[k].short;d.HNAME[k]=d.HALLS[k].short;}
 for(const x of d.DIRS)if(safeURL(x.img)&&/^(assets\/|https?:)/.test(x.img))d.IM[x.img]=x.img;
 if(c.hallTabs){d.HK=c.hallTabs.filter(t=>t.visible!==false).map(t=>t.id);for(const t of c.hallTabs){d.HALLS[t.id].short=t.label;d.PZT[t.id][0]=t.label;d.HNAME[t.id]=t.label;}d.SH_HALLS=d.SH_HALLS.filter(t=>d.HK.includes(t[0]));}
 d.TF=d.TRAINERS.map(t=>({s:t.gender||''}));d.HALL_TRAINERS={sun:[],moon:[],earth:[]};
 d.TRAINERS.forEach((t,i)=>t.halls.forEach(h=>{if(d.HALL_TRAINERS[h])d.HALL_TRAINERS[h].push(i)}));
 for(const k of Object.keys(d.FOLD)){const f=d.FOLD[k];if(f.photos){f.keys=f.photos.map((p,i)=>{const id='album_'+k+'_'+i;d.IM[id]=p.src;d.ALT[id]=p.caption||f.title;return id});f.cover=f.keys[0]||f.cover;}if(d.HALLS[k])d.HALLS[k].gal=f.keys;}
 return c;
}
function applyStatic(c){
 const fonts={default:'',system:'Arial, sans-serif',serif:'Georgia, serif'};
 if(fonts[c.fontFamily]&&Object.prototype.hasOwnProperty.call(fonts,c.fontFamily)){document.body.style.fontFamily=fonts[c.fontFamily];document.documentElement.style.setProperty('--wide',fonts[c.fontFamily]);}

 for(const t of c.texts){const el=document.querySelector('[data-cms-id="'+CSS.escape(t.id)+'"]');if(el?.childNodes[t.node]?.nodeType===3)el.childNodes[t.node].textContent=t.text;}
 for(const l of c.links){const el=document.querySelector('[data-cms-id="'+CSS.escape(l.id)+'"]');if(el)el.setAttribute('href',l.href);}
 for(const id of ['intro','services','dirs','trainers','equipment','contacts']){const e=document.getElementById(id);if(e)e.dataset.cmsHidden=String(!c.sections.some(s=>s.id===id));}
 const side=document.getElementById('side');side.querySelectorAll('.sl').forEach(e=>e.remove());
 for(const n of c.navigation.filter(n=>n.visible!==false)){const e=document.createElement(n.kind==='link'?'a':'button');e.className='sl';e.textContent=n.label;if(n.kind==='link')e.href=n.target;else{e.type='button';e.dataset[n.kind]=n.target;}side.append(e);}
 for(const s of c.sections){let el=document.getElementById(s.id);if(!el&&s.html!==undefined){el=document.createElement('section');el.id=s.id;const wrap=document.createElement('div');wrap.className='wrap';wrap.innerHTML=cleanHTML(s.html);el.append(wrap);document.querySelector('main').append(el);}if(!el)continue;const heading=el.querySelector('h2,h3');if(heading&&s.title!==s.originalTitle)heading.textContent=s.title;el.dataset.cmsHidden=String(s.visible===false);el.parentElement.append(el);}
}
window.KosmosCMS={clone,cleanHTML,safeURL,validateContent};
let adminLoading;
async function activateAdmin(){
 if(location.hash!=='#admin')return;
 if(!adminLoading){const css=document.createElement('link');css.rel='stylesheet';css.href='admin.css';document.head.append(css);adminLoading=import('./admin.js');}
 try{await adminLoading;window.KosmosAdmin.open();}catch(e){alert('Не удалось открыть редактор: '+e.message);adminLoading=null;}
}
async function start(){
 try{
  let c;if(window.frameElement?.hasAttribute('data-cms-preview'))c=clone(parent.KosmosCMS.previewData);else{
   for(let n=0;n<3&&!c;n++)try{const res=await fetch('./content.json?v='+Date.now(),{cache:'no-store',signal:AbortSignal.timeout(8000)});if(!res.ok)throw Error('HTTP '+res.status);c=validateContent(await res.json());try{localStorage.setItem('kosmos-content-cache-v1',JSON.stringify(c))}catch(e){} }catch(e){if(n<2)await new Promise(r=>setTimeout(r,300*(n+1)));}
   if(!c)try{c=validateContent(JSON.parse(localStorage.getItem('kosmos-content-cache-v1')))}catch(e){}
   if(!c)throw Error('Не удалось получить content.json');
  }window.KosmosCMS.content=c;const prepared=prepareContent(c);applyStatic(prepared);initKosmos(prepared);
  if(!window.frameElement?.hasAttribute('data-cms-preview')){window.addEventListener('hashchange',activateAdmin);activateAdmin();}
 }catch(e){const box=document.createElement('div');box.setAttribute('role','alert');box.style.cssText='position:fixed;inset:20px;z-index:9999;background:#0b0816;color:white;padding:24px';box.textContent='Не удалось загрузить сайт. '+e.message+' ';const b=document.createElement('button');b.textContent='Повторить';b.onclick=()=>location.reload();box.append(b);document.body.append(box);}
}
start();

function initKosmos(C){
var SITE_IMG=C.data.SITE_IMG;

/*
 * Данные для инструкций по тренажёрам.
 * Подключается и на главной странице (index.html), и на странице QR-кодов (qr.html).
 *
 * Как добавить тренажёр: скопируйте любой объект ниже, поменяйте поля и положите медиафайл в img/machines/.
 * QR-коды на qr.html появятся автоматически.
 *
 * Поля:
 *   id        — латиница, цифры и дефис; попадает в ссылку /?m=<id> и в QR-код, после печати менять нельзя
 *   name      — название тренажёра
 *   category  — одна из MACHINE_CATEGORIES (новая категория тоже сама появится в фильтре)
 *   muscles   — возможные зоны нагрузки, кратко
 *   media     — картинка (.webp/.jpg/.png/.gif) или видео (.mp4/.webm); видео играет без звука по кругу
 *   steps     — 3–4 коротких шага техники
 *   mistakes  — 1–2 главные ошибки новичков
 *
 */
var MACHINE_CATEGORIES =C.data.MACHINE_CATEGORIES;

var MACHINES =C.data.MACHINES;



// Запасной вариант для браузеров без <dialog> (старые iPhone, встроенные браузеры)
(function(){
  if(typeof document.createElement("dialog").showModal==="function")return;
  document.documentElement.className+=" no-dialog";
  [].forEach.call(document.querySelectorAll("dialog"),function(d){
    d.showModal=d.show=function(){d.setAttribute("open","");d.open=true};
    d.close=function(){d.removeAttribute("open");d.open=false;try{d.dispatchEvent(new Event("close"))}catch(e){}};
  });
})();

var DOCS_DATA=C.data.DOCS_DATA;
var DOC_FILES=C.data.DOC_FILES;
var DOC_TITLES=C.data.DOC_TITLES;
function openDoc(k){
  var md=g("md"),mdc=g("mdc");md.classList.add("wide");
  mdc.innerHTML='<div><h3>Документы</h3><div class="dtabs">'+["of","a1","a2","a3","pd"].map(function(x){return'<button type="button" data-dk="'+x+'" class="'+(x===k?"on":"")+'">'+DOC_TITLES[x]+'</button>'}).join("")+'</div><div class="dmb" id="dmb"></div><div class="mrow"><a class="mbtn g" id="dlw" href="#" download>Скачать PDF</a></div></div>';
  var pdfUrl=null;
  function fill(x){
    var body=g("dmb"),link=g("dlw");
    if(pdfUrl){URL.revokeObjectURL(pdfUrl);pdfUrl=null}
    if(x==="pd"){
      pdfUrl=DOC_FILES.pd;
      body.innerHTML='<iframe class="docpdf" title="'+DOC_TITLES[x]+'" src="'+pdfUrl+'"></iframe>';
      link.href=pdfUrl;link.download="soglasie-pdn.pdf";link.textContent="Скачать PDF";
    }else{
      body.innerHTML=DOCS_DATA[x];link.href=DOC_FILES[x];
      link.download=({of:"01-publichnaya-oferta-v5.docx",a1:"02-pravila-v3.docx",a2:"03-tehnika-bezopasnosti-v2.docx",a3:"04-price-v2.docx"})[x];
      link.textContent="Скачать DOCX";
      if(!DOC_FILES[x]){pdfUrl=URL.createObjectURL(new Blob(['<!doctype html><meta charset="utf-8"><title>'+DOC_TITLES[x]+'</title>'+DOCS_DATA[x]],{type:'text/html;charset=utf-8'}));link.href=pdfUrl;link.download=x+'.html';link.textContent='Скачать актуальный документ';}
    }
    body.scrollTop=0;[].forEach.call(mdc.querySelectorAll("[data-dk]"),function(b){b.classList.toggle("on",b.dataset.dk===x)});
  }
  mdc.querySelector(".dtabs").onclick=function(e){var b=e.target.closest("[data-dk]");if(b)fill(b.dataset.dk)};
  fill(k);openModal();
}
var PILATES_GUIDES=C.data.PILATES_GUIDES;
var LEG_GUIDE=C.data.LEG_GUIDE;
var TB_SOURCE=C.data.TB_SOURCE;
function htmlSafe(s){return String(s).replace(/[&<>"']/g,function(c){return {"&":"&amp;","<":"&lt;",">":"&gt;","\"":"&quot;","'":"&#39;"}[c]})}
function openTb(id){
  var e=EQUIP.filter(function(x){return x.id===id})[0];if(!e)return;
  var md=g("md"),mdc=g("mdc");md.classList.add("wide");
  var T=DOCS_DATA.tb,m=(MACHINES||[]).filter(function(x){return x.id===OLD_MACHINE_IDS[id]})[0],body=(e.d?'<p><b>Назначение.</b> '+e.d+'</p>':'')+(e.u?'<p><b>Как пользоваться.</b> '+e.u+'</p>':'');
  if(!m&&id==="legext")body='<p><b>Сгибание/разгибание ног.</b> Модель DHZ U3086D.</p><ol>'+LEG_GUIDE.map(function(x){return'<li>'+x+'</li>'}).join("")+'</ol>';
  else if(!m&&PILATES_GUIDES[id]){var guide=PILATES_GUIDES[id];body='<p><b>Зал «Земля».</b> Занятия проводятся только с тренером. Самостоятельное использование без инструктажа запрещено. Максимальный вес пользователя: '+guide.limit+'.</p><ol>'+guide.steps.map(function(x){return'<li>'+x+'</li>'}).join("")+'</ol>'}
  else if(!m&&T[e.cat])body+='<details><summary>Инструкция по разделу «'+(EQ_CATS.filter(function(c){return c[0]===e.cat})[0]||[0,""])[1]+'»</summary>'+T[e.cat]+'</details>';
  if(m){body=(m.muscles?'<p><b>Целевые мышцы:</b> '+htmlSafe(m.muscles)+'</p>':'')+(m.model?'<p><b>Модель:</b> '+m.model+'</p>':'')+(m.steps&&m.steps.length?'<h4>Как выполнять</h4><ol>'+m.steps.map(function(x){return'<li>'+x+'</li>'}).join("")+'</ol>':'')+(m.mistakes&&m.mistakes.length?'<h4>Частые ошибки</h4><ul>'+m.mistakes.map(function(x){return'<li>'+x+'</li>'}).join("")+'</ul>':'')}
  body+=(TB_SOURCE[id]?'<h4>Полный раздел из Приложения №2</h4>'+TB_SOURCE[id]:'');
  mdc.innerHTML='<div><h3>'+e.n+'</h3><p class="lead">Инструкция по технике безопасности (Приложение №2)</p><div class="dmb">'+body+'</div><div class="mrow"><button class="mbtn g" type="button" data-doc="a2">Общие правила техники безопасности</button><a class="mbtn g" href="assets/content/c5d3d743a37e14b36e75.docx" download="prilozhenie-2-tehnika-bezopasnosti.docx">Скачать и распечатать полную инструкцию Word</a></div></div>';
  openModal();
}
document.addEventListener("click",function(e){
  var d=e.target.closest&&e.target.closest("[data-doc]");if(d){e.preventDefault();e.stopImmediatePropagation();if(typeof menu==="function")menu(false);openDoc(d.dataset.doc);return}
  var t=e.target.closest&&e.target.closest("[data-tb]");if(t){e.preventDefault();openTb(t.dataset.tb)}
},true);

var IM=C.data.IM;
document.querySelectorAll("[data-i]").forEach(function(e){e.src=IM[e.dataset.i]});
document.querySelectorAll("[data-bg]").forEach(function(e){e.style.backgroundImage="url("+IM[e.dataset.bg]+")"});

// ===== Залы (карточки услуг). Цены и условия — здесь =====
// ===== ЦЕНЫ ТРЕНАЖЁРНОГО ЗАЛА =====
var PRICES_SUN=C.data.PRICES_SUN;
var HALLS=C.data.HALLS;
var ACT_LBL=C.data.ACT_LBL;
var svc=document.getElementById("svc");
var HK=C.data.HK;
function condsHtml(h){return h.conds.map(function(x){return "<li>"+x+"</li>"}).join("")}
var PZI={sun:'<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M3 9v6M6 7v10M18 7v10M21 9v6M6 12h12" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>',moon:'<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="8" cy="8" r="3" fill="none" stroke="currentColor" stroke-width="2"/><circle cx="17" cy="9" r="2.4" fill="none" stroke="currentColor" stroke-width="2"/><path d="M2.5 19c0-3 2.5-5 5.5-5s5.5 2 5.5 5M14.5 14.5c3.5-.7 7 .8 7 4.5" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>',earth:'<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="5" r="2.6" fill="none" stroke="currentColor" stroke-width="2"/><path d="M4 20l5-8h6l5 8M9 12l3 3 3-3" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>'};
var PZT=C.data.PZT;
function pzRows(list){return list.map(function(p){return'<div class="pz-r"><span>'+p[1]+(p[2]?'<small>'+p[2]+'</small>':'')+'</span><strong'+(/\d/.test(p[0])?'':' class="ask"')+'>'+p[0]+(p[3]?'<em>'+p[3]+'</em>':'')+'</strong></div>'}).join("")}
function pzPanel(k){
  var h=HALLS[k];
  var acts=h.acts.filter(function(a){return k==="sun"||a!=="price"}).map(function(a){
    if(k==="sun"&&a==="gal")return '<a class="pz-chip" href="#equip" data-eq-jump="strength">Тренажёры</a>';
    if(k==="earth"&&a==="gal")return '<a class="pz-chip" href="#equip" data-eq-jump="pilates">Тренажёры</a>';
    return '<button class="pz-chip" type="button" data-act="'+a+'" data-hall="'+k+'">'+ACT_LBL[a]+'</button>';
  }).join("");
  return '<div class="pz-s"><section class="pz-p glass" id="pz-'+k+'">'
   +'<h3><i>'+PZI[k]+'</i><span>'+h.title+'<small>Зал «'+h.short+'»'+(h.sub?' · '+h.sub.toLowerCase():'')+'</small></span></h3>'
   +(h.badge?'<div class="feat hbd"><span class="d">'+h.badge+'</span></div>':'')
   +(k==="sun"?'':'<div class="pz-rows">'+pzRows(h.prices)+'</div>')
   +(h.hours?'<p class="pz-key">'+h.hours+'</p>':'')
   +'<div class="pz-act">'+(k==="sun"?'':'<a class="btn btn-sun" href="tel:+79138208839">Записаться</a>')+'<div class="pz-chips">'+acts+'</div></div>'
   +'<div class="tile pz-more"><button class="hmore" type="button" aria-expanded="false">Условия (выдержка из правил)<i></i></button><div class="hdet"><ul>'+condsHtml(h)+'</ul></div></div>'
   +'</section></div>';
}
svc.innerHTML='<p class="pz-lead">Больше возможностей для твоих целей</p><div class="pz-tabs" role="tablist">'+HK.map(function(k,i){return'<button type="button" role="tab" data-pz="'+i+'" class="'+(i?'':'on')+'"><b>'+PZT[k][0]+'</b><span>'+PZT[k][1]+'</span></button>'}).join("")+'</div>'
 +'<div class="pz-view"><div class="pz-trk" id="pz-trk" tabindex="0" aria-label="Залы: листайте в сторону">'+HK.map(pzPanel).join("")+'</div></div>'
 +'<div class="pz-dots" id="pz-dots">'+HK.map(function(k,i){return'<button type="button" data-pz="'+i+'" aria-label="Зал «'+HALLS[k].short+'»" class="'+(i?'':'on')+'"></button>'}).join("")+'</div>'
 +'<p class="pz-hint">Листайте в сторону или выберите зал</p>'
 +'';
svc.addEventListener("click",function(ev){var a=ev.target.closest("[data-eq-jump]");if(a&&window.setEquipmentCategory)window.setEquipmentCategory(a.dataset.eqJump)});
var pzT=g("pz-trk"),pzI=0,pzTm=0;
g("contacts-back").onclick=function(){window.scrollTo({top:0,behavior:"smooth"})};
function pzFit(){var sl=pzT.children[pzI];if(sl)pzT.style.height=sl.offsetHeight+"px"}
function pzMark(){[].forEach.call(svc.querySelectorAll("[data-pz]"),function(b){var active=+b.dataset.pz===pzI;b.classList.toggle("on",active);if(b.getAttribute("role")==="tab")b.setAttribute("aria-selected",String(active))});pzFit()}
function pzGo(i){pzI=Math.max(0,Math.min(HK.length-1,i));pzT.scrollLeft=pzI*pzT.clientWidth;pzMark()}
pzT.addEventListener("scroll",function(){clearTimeout(pzTm);pzTm=setTimeout(function(){var i=Math.round(pzT.scrollLeft/Math.max(1,pzT.clientWidth));if(i!==pzI){pzI=i;pzMark()}},60)},{passive:true});
pzT.addEventListener("keydown",function(e){if(e.key==="ArrowLeft")pzGo(pzI-1);if(e.key==="ArrowRight")pzGo(pzI+1)});
svc.addEventListener("click",function(e){
  var t=e.target.closest("[data-pz]");if(t){pzGo(+t.dataset.pz);return}
  var jump=e.target.closest("[data-eq-jump]");if(jump){var tab=g("eqt").querySelector('[data-eq="'+jump.dataset.eqJump+'"]');if(tab)tab.click();return}
  var m=e.target.closest(".hmore");if(!m)return;var tl=m.closest(".tile"),o=!tl.classList.contains("open");tl.classList.toggle("open",o);m.setAttribute("aria-expanded",String(o));pzFit();
});
window.addEventListener("resize",function(){pzT.scrollLeft=pzI*pzT.clientWidth;pzFit()});
window.addEventListener("load",pzFit);if(document.fonts&&document.fonts.ready)document.fonts.ready.then(pzFit);
pzFit();

// плавная прокрутка к разделам
document.addEventListener("click",function(e){
  var a=e.target.closest&&e.target.closest('a[href^="#"]');if(!a)return;
  var id=a.getAttribute("href").slice(1);e.preventDefault();
  var el=(id&&id!=="top")?document.getElementById(id):null;
  if(el)el.scrollIntoView({behavior:"smooth"});else window.scrollTo({top:0,behavior:"smooth"});
});
function g(i){return document.getElementById(i)}
function num(v){return parseFloat(String(v).replace(",",".").replace(/\s/g,""))}
function fmt(x,d){return x.toFixed(d===undefined?1:d).replace(".",",")}
function money(n){return Math.round(n).toString().replace(/\B(?=(\d{3})+(?!\d))/g,"\u00a0")+"\u00a0₽"}

// Открыто / закрыто (время Томска, UTC+7)
var HOURS=C.data.HOURS;
function hrs(day){return(day===0||day===6)?HOURS.we:HOURS.wk}
function hm(m){return String(Math.floor(m/60)).padStart(2,"0")+":"+String(m%60).padStart(2,"0")}
function status(){
  var d=new Date(Date.now()+7*3600000),day=d.getUTCDay(),m=d.getUTCHours()*60+d.getUTCMinutes(),h=hrs(day),box=g("st"),txt,open=false;
  if(m>=h[0]&&m<h[1]){open=true;txt="Открыто сейчас, до "+hm(h[1])}
  else if(m<h[0]){txt="Сейчас закрыто. Откроемся сегодня в "+hm(h[0])}
  else{txt="Сейчас закрыто. Откроемся завтра в "+hm(hrs((day+1)%7)[0])}
  box.className="st"+(open?"":" off");box.querySelector("span").textContent=txt;
}
status();setInterval(status,60000);

// звёзды
var st=document.getElementById("stars");
for(var k=0;k<46;k++){var d=document.createElement("i");d.style.left=Math.random()*100+"%";d.style.top=Math.random()*100+"%";d.style.animationDelay=(Math.random()*4)+"s";d.style.animationDuration=(3+Math.random()*4)+"s";st.appendChild(d)}

// просмотр фото
var lb=document.getElementById("lb"),lbi=lb.querySelector("img"),cur=0,ALT=C.data.ALT,LBL=[];
var galleryCache=new Map();
function warm(i){if(LBL.length<2)return;var src=LBL[(i+LBL.length)%LBL.length].src;if(!galleryCache.has(src)){var img=new Image();img.onerror=function(){galleryCache.delete(src)};img.src=src;galleryCache.set(src,img)}}
function show(i){if(!LBL.length)return;cur=(i+LBL.length)%LBL.length;lbi.src=LBL[cur].src;lbi.alt=LBL[cur].alt;document.getElementById("cnt").textContent=(cur+1)+" / "+LBL.length;warm(cur+1);warm(cur-1)}
void 0;void 0;void 0;
void 0;
void 0;
void 0;
var FOLD=C.data.FOLD;
Object.keys(FOLD).forEach(function(k){var c=document.querySelector("[data-album-count='"+k+"']");if(c)c.textContent=FOLD[k].keys.length});
(function(){var box=document.getElementById("folds");
  Object.keys(FOLD).forEach(function(k){var f=FOLD[k],b=document.createElement("button");b.type="button";b.className="fold";b.setAttribute("data-fold",k);
    b.innerHTML='<img class="fph" alt="" width="800" height="600" loading="lazy" decoding="async"><b>'+f.title+'</b><small>'+f.sub+' · '+f.keys.length+' фото</small>';
    b.firstChild.src=IM[f.cover];box.appendChild(b)});
  box.addEventListener("click",function(e){var b=e.target.closest(".fold");if(!b)return;var f=FOLD[b.getAttribute("data-fold")];
    LBL=f.keys.map(function(key){return{src:IM[key],alt:ALT[key]||f.title}});show(0);lb.showModal()});
})();
document.getElementById("pv").onclick=function(){show(cur-1)};
document.getElementById("nx").onclick=function(){show(cur+1)};
lb.addEventListener("keydown",function(e){if(e.key==="ArrowLeft")show(cur-1);if(e.key==="ArrowRight")show(cur+1)});
var sx=0;lb.addEventListener("touchstart",function(e){sx=e.touches[0].clientX},{passive:true});
lb.addEventListener("touchend",function(e){var d=e.changedTouches[0].clientX-sx;if(Math.abs(d)>50)show(cur+(d<0?1:-1))});
lb.addEventListener("click",function(e){if(e.target===lb||e.target===lbi)lb.close()});
document.getElementById("cl").onclick=function(){lb.close()};



// ===== Оборудование. spec: пары [параметр, значение]; "уточняется" заменить реальными данными. qr: id для ссылки на инструкцию =====
void 0;
void 0;
void 0;
void 0;
void 0;
void 0;
void 0;
void 0;
void 0;
void 0;
void 0;
var EQUIP_QR_BASE=""; // не используется // ← сюда базовый адрес страницы инструкций, например "https://site.ru/instr/" — кнопка «Инструкция» и QR заработают по адресу БАЗА + id
var EQ_CATS=C.data.EQ_CATS;
var OLD_MACHINE_IDS=C.data.OLD_MACHINE_IDS;
var EQUIP=C.data.EQUIP;

var EQ_META=C.data.EQ_META;
void 0;
void 0;
void 0;
void 0;

(function(){var tb=g("eqt"),bx=g("eqg"),cur="all";
  function qrLink(e){return EQUIP_QR_BASE?'<a class="mbtn g" href="'+EQUIP_QR_BASE+e.id+'" target="_blank" rel="noopener">Инструкция</a>':'<span class="mbtn g off" data-qr="'+e.id+'">Инструкция — скоро</span>'}
  function draw(){
    tb.innerHTML=EQ_CATS.map(function(c){return'<button type="button" role="tab" data-eq="'+c[0]+'" class="'+(c[0]===cur?"on":"")+'">'+c[1]+'</button>'}).join("");
    bx.innerHTML="";bx.className="eqg"+(cur==="pilates"?" pilates-only":"")+(EQUIP.filter(function(e){return cur==="all"||e.cat===cur}).length===1?" one":"");
    EQUIP.filter(function(e){return cur==="all"||e.cat===cur}).forEach(function(e){
      var a=document.createElement("article");a.className="eq"+(e.cat==="pilates"?" eq-pilates":"")+(e.cat==="pilates"&&!e.img?" no-photo":"");a.id="eq-"+e.id;a.setAttribute("data-qr-id",e.id);
      var pair=e.render&&IM[e.render]&&e.img&&IM[e.img];
      a.innerHTML=(pair?'<div class="eq-pair"><button class="eph render" type="button" aria-label="Рендер из паспорта: '+e.n+'"><img src="'+IM[e.render]+'" alt="" width="800" height="600" loading="lazy" decoding="async"><span>Рендер</span></button><button class="eph live" type="button" aria-label="'+(e.cat==='cardio'?'Фото кардиозоны':'Фото в зале')+': '+e.n+'"><img src="'+IM[e.img]+'" alt="" width="800" height="600" loading="lazy" decoding="async"><span>'+(e.cat==='cardio'?'Фото кардиозоны':'Фото в зале')+'</span></button></div>':e.cat==='pilates'&&!e.img?'':'<button class="eph'+(e.img?'':' noph')+'" type="button" aria-label="'+(e.img?'Открыть фото: '+e.n:e.n)+'">'+(e.img?'':'Фото скоро')+'</button>')+'<div class="etx"><h4>'+e.n+'</h4>'
       +(e.t?'<p class="et">'+e.t+'</p>':'')
       +(e.spec&&e.spec.length?'<dl>'+e.spec.map(function(p){return'<div><dt>'+p[0]+'</dt><dd>'+p[1]+'</dd></div>'}).join("")+'</dl>':'')
       +'<button class="mbtn g" type="button" data-tb="'+e.id+'">Инструкция по ТБ</button></div>';
      var ph=a.firstChild;
      if(pair){var shots=ph.querySelectorAll('.eph');function openPair(i){LBL=[{src:IM[e.render],alt:e.n+' — рендер из паспорта'},{src:IM[e.img],alt:e.n+' — фото в зале'}];show(i);lb.showModal()}shots[0].onclick=function(){openPair(0)};shots[1].onclick=function(){openPair(1)}}
      else if(e.img){ph.innerHTML='<img src="'+IM[e.img]+'" alt="" width="800" height="600" loading="lazy" decoding="async">';ph.onclick=function(){LBL=[{src:IM[e.img],alt:e.n}];show(0);lb.showModal()}}
      bx.appendChild(a)});
  }
  tb.addEventListener("click",function(ev){var b=ev.target.closest("button[data-eq]");if(!b)return;cur=b.dataset.eq;draw()});
  draw();
  window.setEquipmentCategory=function(category){if(EQ_CATS.some(function(c){return c[0]===category})){cur=category;draw()}};
  // переход по QR: ?eq=reformer
  try{var params=new URLSearchParams(location.search),old=params.get("m"),q=params.get("eq")||(old&&Object.keys(OLD_MACHINE_IDS).filter(function(id){return OLD_MACHINE_IDS[id]===old})[0]),e0=EQUIP.filter(function(e){return e.id===q})[0];
    if(e0){cur=e0.cat;draw();setTimeout(function(){var el=g("eq-"+q);if(el){el.scrollIntoView({behavior:"smooth",block:"center"});el.classList.add("hl");if(old)openTb(q)}},400)}}catch(_){}
})();

var bar=document.getElementById("bar");
new IntersectionObserver(function(en){bar.classList.toggle("on",!en[0].isIntersecting)},{threshold:.15}).observe(document.getElementById("top"));

// ===== Направления =====
void 0;
void 0;
void 0;
var DIRS=C.data.DIRS;
var dt=g("dtrk");
DIRS.forEach(function(x){
  var c=document.createElement("article");c.className="dc";
  c.innerHTML='<img class="ph" alt="" width="800" height="600" loading="lazy" decoding="async"><div class="tx"><h3>'+x.n+'</h3><p>'+x.t+'</p></div>';
  if(IM[x.img])c.firstChild.src=IM[x.img];else c.firstChild.style.background="linear-gradient(135deg,#2a1a52,#5a34a8)";if(x.pos)c.firstChild.style.objectPosition=x.pos;dt.appendChild(c);
});
function dcnt(){if(!dt.firstChild){g("dcnt").textContent="";return}var w=dt.firstChild.offsetWidth+18,i=Math.min(DIRS.length,Math.round(dt.scrollLeft/w)+1);g("dcnt").textContent=i+" / "+DIRS.length}
dt.addEventListener("scroll",dcnt,{passive:true});dcnt();
function dAnim(to,dur){var from=dt.scrollLeft,t0=null;cancelAnimationFrame(dt._a);function st(t){if(!t0)t0=t;var k=Math.min(1,(t-t0)/dur),e=k<.5?4*k*k*k:1-Math.pow(-2*k+2,3)/2;dt.scrollLeft=from+(to-from)*e;if(k<1)dt._a=requestAnimationFrame(st)}dt._a=requestAnimationFrame(st)}
function dStep(k){if(!dt.firstChild)return;dAnim(dt.scrollLeft+k*(dt.firstChild.offsetWidth+18),650)}

(function(){var d=0,x0=0,sl0=0,lx=0,v=0,raf=0;
  function mo(){dt.scrollLeft+=v;v*=.95;if(Math.abs(v)>.3)raf=requestAnimationFrame(mo)}
  dt.addEventListener("pointerdown",function(e){if(e.pointerType!=="mouse")return;cancelAnimationFrame(raf);cancelAnimationFrame(dt._a);d=1;x0=lx=e.clientX;sl0=dt.scrollLeft;v=0;dt.classList.add("drag")});
  window.addEventListener("pointermove",function(e){if(!d)return;dt.scrollLeft=sl0-(e.clientX-x0);v=v*.6+(lx-e.clientX)*.4;lx=e.clientX});
  window.addEventListener("pointerup",function(){if(!d)return;d=0;dt.classList.remove("drag");mo()});
  dt.addEventListener("keydown",function(e){if(e.key==="ArrowRight")dStep(1);if(e.key==="ArrowLeft")dStep(-1)});
})();

// ===== Тренеры. Главный — в центре (MAIN). Поля: name, role, img, about, edu:[...], exp:[...] =====
void 0;
var TRAINER_TATIANA_IMG=C.data.TRAINER_TATIANA_IMG;
var TRAINER_TATIANA_AVATAR=C.data.TRAINER_TATIANA_AVATAR;
var TRAINERS=C.data.TRAINERS;
var MAIN=0;
var USER='<svg viewBox="0 0 24 24" fill="#c3a8ff"><circle cx="12" cy="8" r="4.5"/><path d="M3.5 21c0-4.7 3.8-8 8.5-8s8.5 3.3 8.5 8z"/></svg>';
var cf=g("cf"),cfd=g("cfd"),N=TRAINERS.length,cards=[],pos=MAIN;
TRAINERS.forEach(function(t,i){
  var d=document.createElement("article");d.className="tr";
  d.innerHTML='<div class="av">'+(t.img?'<img alt="" width="150" height="150" loading="lazy" decoding="async">':USER)+'</div><h3>'+(t.name||"Имя тренера")+'</h3><p>'+(t.short||t.role||"Скоро здесь")+'</p><button class="btn btn-sun" type="button" data-trainer="'+i+'">Подробнее</button>';
  if(t.img){var photo=d.querySelector(".av img");photo.src=t.avatar||t.img;photo.style.objectPosition=t.avatar?"center":t.pos||"center";if(t.name==="Семён Мурашкин")photo.style.transform="scale(1.7)";if(t.name==="Марина Никитаева"){photo.parentElement.style.position="relative";photo.style.position="absolute";photo.style.inset="0";photo.style.height="100%";photo.style.objectPosition="center center";photo.style.transform="none"}}
  cf.appendChild(d);cards.push(d);
  var dot=document.createElement("i");dot.onclick=function(){snap(i)};cfd.appendChild(dot);
});
function draw(){
  var step=Math.min(150,cf.clientWidth*.34);
  cards.forEach(function(c,i){
    var o=i-pos,a=Math.abs(o);
    c.style.transform="translateX(calc(-50% + "+(o*step)+"px)) translateZ("+(-a*90)+"px) rotateY("+(-o*14)+"deg) scale("+(1-.12*Math.min(a,2))+")";
    c.style.opacity=a>2.2?0:1-.28*Math.min(a,2);c.style.zIndex=String(Math.round(20-a*5));
    c.style.pointerEvents=a>2.2?"none":"auto";
  });
  var k=Math.max(0,Math.min(N-1,Math.round(pos)));[].forEach.call(cfd.children,function(d,i){d.classList.toggle("on",i===k)});
}
function snap(p){pos=Math.max(0,Math.min(N-1,p));cf.classList.add("anim");draw()}
(function(){var d=0,x0=0,p0=0,mv=0;
  cf.addEventListener("pointerdown",function(e){d=1;mv=0;x0=e.clientX;p0=pos;cf.classList.remove("anim")});
  window.addEventListener("pointermove",function(e){if(!d)return;mv=e.clientX-x0;if(Math.abs(mv)>6)cf.classList.add("drag");var step=Math.min(150,cf.clientWidth*.34);pos=Math.max(-.35,Math.min(N-1+.35,p0-mv/step));draw()});
  window.addEventListener("pointerup",function(e){if(!d)return;d=0;cf.classList.remove("drag");var t=Math.round(pos);if(t===Math.round(p0)&&Math.abs(mv)>40)t+=mv<0?1:-1;
    if(Math.abs(mv)<6){var c=e.target.closest&&e.target.closest(".tr");if(c){var i=cards.indexOf(c);if(i>-1&&!e.target.closest("button"))t=i}}
    snap(t)});
  cf.addEventListener("keydown",function(e){if(e.key==="ArrowLeft")snap(Math.round(pos)-1);if(e.key==="ArrowRight")snap(Math.round(pos)+1)});
  cf.tabIndex=0;window.addEventListener("resize",draw);
})();
draw();
document.addEventListener("click",function(e){var b=e.target.closest&&e.target.closest("[data-trainer]");if(!b)return;var i=+b.dataset.trainer;if(i!==Math.round(pos)){snap(i);return}if(route.p==="home")pageOrigin={hash:location.hash,y:window.scrollY};location.hash="trainer-"+i});
function fillTrainer(i){
  var t=TRAINERS[i]||{},av=g("tav");
  g("tname").textContent=t.name||"Имя тренера";
  g("trole").textContent=t.role||"";
  av.style.backgroundImage=t.img?"url("+t.img+")":"";av.style.backgroundPosition=t.pos||"center";av.style.backgroundSize=t.sz||"";av.innerHTML=t.img?"":USER;
  function ul(a){return"<ul><li>"+a.join("</li><li>")+"</li></ul>"}
  var h="";
  if(t.about)h+="<h3>О тренере</h3><p>"+t.about+"</p>";
  if(t.spec&&t.spec.length)h+="<h3>Специализация</h3>"+ul(t.spec);
  if(t.edu&&t.edu.length)h+="<h3>Образование</h3>"+ul(t.edu);
  if(t.exp&&t.exp.length)h+="<h3>Опыт работы</h3>"+ul(t.exp);
  if(t.tel){var tl=t.tel.replace(/[^\d+]/g,"");h+="<h3>Контакты</h3><p>Телефон: <a href=\"tel:"+tl+"\">"+t.tel+"</a></p>"}
  if(!h)h='<p style="color:var(--mut)">Подробная информация скоро появится.</p>';
  g("tbody").innerHTML=h;
}
// список тренеров (страница из меню): главный первым
var TF=C.data.TF;
var HALL_TRAINERS=C.data.HALL_TRAINERS;
(function(){var box=g("cl2"),fl=g("cflt"),F={h:"",s:""};
  var G=[["h","Зал",["sun","moon","earth"]],["s","Пол тренера",["м","ж"]]];
  var SN={"м":"Мужской","ж":"Женский","sun":"Солнце","moon":"Луна","earth":"Земля"};
  function build(){fl.innerHTML=G.map(function(x){var h='<div class="fl">'+x[1]+'</div><div class="tabs"><button type="button" data-k="'+x[0]+'" data-v=""'+(F[x[0]]===""?' class="on"':'')+'>Все</button>';
      x[2].forEach(function(v){h+='<button type="button" data-k="'+x[0]+'" data-v="'+v+'"'+(F[x[0]]===v?' class="on"':'')+'>'+SN[v]+'</button>'});return h+'</div>'}).join("");list()}
  function list(){box.innerHTML="";var n=0,ord=TRAINERS.map(function(_,i){return i});
    ord.forEach(function(i){var t=TRAINERS[i],f=TF[i]||{s:""};
      if(F.h&&(HALL_TRAINERS[F.h]||[]).indexOf(i)<0)return;if(F.s&&f.s!==F.s)return;n++;
      var b=document.createElement("button");b.type="button";
      b.innerHTML='<i class="a"></i><div><b>'+t.name+'</b><span>'+(t.short||t.role)+'</span></div>';
      var a=b.firstChild;a.style.backgroundImage="url("+t.img+")";a.style.backgroundPosition=t.pos||"center";if(t.sz)a.style.backgroundSize=t.sz;
      b.onclick=function(){location.hash="trainer-"+i};box.appendChild(b)});
    if(!n)box.innerHTML='<p class="empty2">По выбранным условиям тренеров нет. Измените фильтр.</p>'}
  fl.addEventListener("click",function(e){var b=e.target.closest("button[data-k]");if(!b)return;F[b.dataset.k]=b.dataset.v;build()});
  build()})();



// ===== Модальные окна: тренеры, направления, расписание, прайс =====
var md=g("md"),mdc=g("mdc");
var HNAME=C.data.HNAME;
// Тренеры по залам: номера из списка TRAINERS (по порядку в массиве, с 0). Правьте при необходимости.
// Расписание: данные в SCHED (день → [время, занятие]); правьте здесь


function isRemovedDirection(v){v=String(v||"").trim().toLowerCase();return v.indexOf("фитнес микс")===0||v.indexOf("фитнес софт")===0}
function cleanSchedule(data){Object.keys(data||{}).forEach(function(h){Object.keys(data[h]||{}).forEach(function(day){data[h][day]=(data[h][day]||[]).filter(function(item){return !isRemovedDirection(item&&item[1])})})});return data}
var SCHED=C.data.SCHED;
var SH_DAYS=C.data.SH_DAYS;
var SH_HALLS=C.data.SH_HALLS;
function schMount(root,hall0){
  if(!root)return;
  var wd=(new Date(Date.now()+7*3600000).getUTCDay()+6)%7,st={h:hall0==="earth"?"earth":hall0==="sun"?"sun":"moon",d:wd};
  function times(h){var t={};SH_DAYS.forEach(function(d){(SCHED[h][d[0]]||[]).forEach(function(r){t[r[0]]=1})});return Object.keys(t).sort()}
  function cls(c){return htmlSafe(c).replace(/ (\d\d\+)$/,' <i>$1</i>')}
  function draw(){
    var h='<div class="tabs sht" role="tablist">'+SH_HALLS.map(function(x){return'<button type="button" role="tab" data-sh="'+x[0]+'" class="'+(x[0]===st.h?"on":"")+'">'+x[1]+'</button>'}).join("")+'</div>';
    if(st.h==="sun"){
      h+='<div class="shsun"><b>Свободное посещение</b><p>Тренажёрный зал работает в часы работы клуба: Пн–Пт 08:00–22:00, Сб–Вс 09:00–21:00. Групповых занятий по расписанию здесь нет. По дневному абонементу — в будни до 16:00, в выходные — в любое время.</p><p>Персональные тренировки и мини-группы — по предварительной записи.</p></div>'}
    else{
      var T=times(st.h);
      h+='<p class="sh-note">Запись на занятие обязательна не позднее чем за 4 часа до начала.</p>';
      h+='<div class="shd" role="tablist">'+SH_DAYS.map(function(d,i){return'<button type="button" data-sd="'+i+'" class="'+(i===st.d?"on":"")+(i===wd?" td":"")+'">'+d[1]+'</button>'}).join("")+'</div>';
      var d=SH_DAYS[st.d],L=SCHED[st.h][d[0]]||[];
      h+='<div class="shl"><h4>'+d[2]+'</h4>'+(L.length?L.map(function(r){return'<div class="sr"><time>'+r[0]+'</time><span>'+cls(r[1])+'</span></div>'}).join(""):'<p class="shn">В этот день занятий нет.</p>')+'</div>';
      h+='<div class="shw"><table><thead><tr><th>Время</th>'+SH_DAYS.map(function(d,i){return'<th'+(i===wd?' class="td"':'')+'>'+d[1]+'</th>'}).join("")+'</tr></thead><tbody>';
      T.forEach(function(t){h+='<tr><th>'+t+'</th>'+SH_DAYS.map(function(d,i){var matches=(SCHED[st.h][d[0]]||[]).filter(function(r){return r[0]===t});return'<td'+(i===wd?' class="td"':'')+'>'+(matches.length?'<span>'+matches.map(function(c){return cls(c[1])}).join("<br>")+'</span>':'')+'</td>'}).join("")+'</tr>'});
      h+='</tbody></table></div>';
    }
    root.innerHTML=h;
  }
  root.addEventListener("click",function(e){var a=e.target.closest("[data-sh]"),b=e.target.closest("[data-sd]");if(a){st.h=a.dataset.sh;draw()}else if(b){st.d=+b.dataset.sd;draw()}});
  (window.SCH_REDRAW=window.SCH_REDRAW||[]).push(draw);
  draw();
}
schMount(g("schApp"),"moon");
// ===== РАСПИСАНИЕ ИЗ GOOGLE-ТАБЛИЦЫ (оба зала на одном листе) =====
// Время в первом столбце может быть 09-00; строка зала «Земля» наследует время предыдущей строки.
var SHEET_ID=C.data.SHEET_ID;
(function(){
  function csv(t){var r=[],row=[],c="",q=false;for(var i=0;i<t.length;i++){var ch=t[i];
    if(q){if(ch==='"'){if(t[i+1]==='"'){c+='"';i++}else q=false}else c+=ch}
    else if(ch==='"')q=true;else if(ch===","){row.push(c);c=""}
    else if(ch==="\n"){row.push(c);r.push(row);row=[];c=""}else if(ch!=="\r")c+=ch}
    row.push(c);r.push(row);return r}
  function dayKey(x){x=(x||"").trim().toLowerCase().replace(/\.$/,"");
    for(var i=0;i<SH_DAYS.length;i++){var d=SH_DAYS[i];if(x===d[1].toLowerCase()||x===d[2].toLowerCase())return d[0]}return null}
  function parse(rows){var hi=-1,cols={};
    for(var i=0;i<rows.length&&hi<0;i++){var m={},n=0;rows[i].forEach(function(c,j){var k=dayKey(c);if(k){m[j]=k;n++}});if(n>=3){hi=i;cols=m}}
    if(hi<0)return null;
    var out={moon:{},earth:{}};Object.keys(out).forEach(function(h){SH_DAYS.forEach(function(d){out[h][d[0]]=[]})});
    var currentTime="";
    for(var i=hi+1;i<rows.length;i++){var row=rows[i],tm=/(\d{1,2})\s*[:.\-]\s*(\d{2})/.exec(row[0]||"");
      if(tm)currentTime=("0"+tm[1]).slice(-2)+":"+tm[2];
      if(!currentTime)continue;
      var hall=String(row[1]||"").trim().toLowerCase();hall=hall.indexOf("земл")>=0?"earth":hall.indexOf("лун")>=0?"moon":"";
      if(!hall)continue;
      Object.keys(cols).forEach(function(j){String(row[j]||"").split(/\n/).forEach(function(v){v=v.trim();if(v&&v!=="."&&!isRemovedDirection(v))out[hall][cols[j]].push([currentTime,v])})})}
    return (Object.keys(out).some(function(h){return SH_DAYS.some(function(d){return out[h][d[0]].length})}))?out:null}
  try{var c=JSON.parse(localStorage.getItem("kosmosSchedV2")||"null");if(c)Object.keys(c).forEach(function(h){if(SCHED[h])SCHED[h]=c[h]})}catch(e){}
  cleanSchedule(SCHED);
  // Google Sheets CSV does not allow browser fetch from the site origin. Use its JSONP response.
  var script=document.createElement("script"),timer;
  function done(){clearTimeout(timer);script.remove();delete window.kosmosScheduleCb}
  window.kosmosScheduleCb=function(response){try{
    if(!response||response.status!=="ok"||!response.table)return;
    var rows=response.table.rows.map(function(r){return r.c.map(function(c){return c?(c.f||c.v||""):""})});
    var parsed=parse(rows);if(!parsed)return;
    Object.keys(parsed).forEach(function(h){SCHED[h]=parsed[h]});
    try{localStorage.setItem("kosmosSchedV2",JSON.stringify(parsed))}catch(e){}
    (window.SCH_REDRAW||[]).forEach(function(f){try{f()}catch(e){}})
  }finally{done()}};
  script.onerror=done;
  timer=setTimeout(done,12000);
  script.src="https://docs.google.com/spreadsheets/d/"+SHEET_ID+"/gviz/tq?sheet="+encodeURIComponent("Земля")+"&tqx="+encodeURIComponent("out:json;responseHandler:kosmosScheduleCb")+"&_="+Date.now();
  document.head.appendChild(script);
})();
var MD={kind:"",tab:"all",hall:""};
function bookBtn(hall,cls){return'<button class="mbtn'+(cls||"")+'" type="button" data-write>Написать</button>'}
function tabsHtml(list){return'<div class="tabs" role="tablist">'+list.map(function(k){return'<button type="button" role="tab" data-tab="'+k+'" class="'+(k===MD.tab?"on":"")+'">'+HNAME[k]+'</button>'}).join("")+'</div>'}
function trainerAvStyle(el,t){if(t.img){el.style.backgroundImage="url("+t.img+")";el.style.backgroundPosition=t.pos||"center";if(t.sz)el.style.backgroundSize=t.sz}}
var VIEWS={
 social:function(){return '<h3>Мы в соцсетях</h3><div class="wl"><a class="mbtn g" href="https://vk.ru/spacefitness70" target="_blank" rel="noopener"><span class="ico ico-vk"></span>ВК</a><a class="mbtn g" href="https://max.ru/join/rwttUwnvqvLqIVx8RVvKJBl28yUaaGqYN6Y6H84gFGM" target="_blank" rel="noopener"><span class="ico ico-max"></span>MAX</a><a class="mbtn g" href="https://t.me/spacefit" target="_blank" rel="noopener"><span class="ico ico-tg"></span>Telegram</a></div>'},
 trainers:function(){
  var ids=MD.tab==="all"?TRAINERS.map(function(_,i){return i}):(HALL_TRAINERS[MD.tab]||[]);
  var h='<h3>Тренеры</h3><p class="lead">Нажмите на тренера, чтобы узнать об образовании и специализации.</p>'+tabsHtml(["sun","moon","earth","all"])+'<div class="cl">';
  ids.forEach(function(i){var t=TRAINERS[i];h+='<button type="button" data-tr="'+i+'"><i class="a" data-av="'+i+'"></i><div><b>'+t.name+'</b><span>'+(t.short||t.role||"")+'</span></div></button>'});
  h+='</div><p class="pd">Персональные данные тренеров, размещённые на этом сайте, опубликованы на основании их письменного согласия на распространение персональных данных. Согласия предоставлены бессрочно и действуют до момента отзыва субъектом персональных данных.</p><div class="mrow">'+bookBtn(MD.tab)+'</div>';
  return h},
 schedule:function(){
  return '<h3>Расписание</h3><p class="lead">Групповые занятия по залам.</p><div class="shapp" id="schM"></div><div class="key" style="margin-top:16px">Запись на занятие обязательна. Отмена или перенос — не позднее чем за 4 часа до начала, по телефону администратора. Вместимость группы — '+(MD.hall==="earth"?"до 3 человек":"до 12 человек")+'.</div><div class="mrow">'+bookBtn(MD.hall==="earth"?"earth":"moon")+'</div>'},
 write:function(){
  var C=CHAT_CONFIG;
  function lk(u,t){return u?'<a class="mbtn g" href="'+u+'" target="_blank" rel="noopener">'+t+'</a>':'<span class="mbtn g off">'+t+' — скоро</span>'}
  return '<h3>Написать нам</h3><p class="lead">Наш Telegram-канал и чат в MAX.</p><div class="wl">'+lk(C.telegram,'<span class="ico ico-tg"></span>Telegram-канал')+lk(C.max,'<span class="ico ico-max"></span>MAX')+'</div><p class="lead" style="margin-top:12px">В MAX откроется чат с администратором: напишите там. Номер в MAX: +7 913 820-88-39.</p><p class="lead" style="margin-top:16px">Или позвоните: <a href="tel:+79138208839" style="text-decoration:underline">+7 913 820-88-39</a></p><div class="pdn">Обработка персональных данных: <button type="button" data-doc="pd">Согласие на обработку персональных данных</button></div>'},
 price:function(){
  var h='<h3>Прайс</h3><p class="lead">Стоимость услуг по залам.</p>';
  ["sun","moon","earth"].forEach(function(k){var x=HALLS[k];
   h+='<div class="psec" data-hall="'+k+'"><h4>'+x.title+'</h4><div class="pgrid">'+x.prices.map(function(p){return'<div><span>'+p[1]+'<small>'+p[2]+(p[3]?' · '+p[3]:'')+'</small></span><strong>'+p[0]+'</strong></div>'}).join("")+'</div>'+(k==="sun"?'<div class="note">Занятие с тренером оплачивается дополнительно.</div>':"")+'</div>'});
  h+='<div class="psec"><h4>Другие услуги</h4><div class="pgrid"><div><span>Персональная тренировка<small>в тренажёрном зале</small></span><strong class="ask">по запросу</strong></div><div><span>Мини-группа<small>до 3 человек, в тренажёрном зале</small></span><strong class="ask">по запросу</strong></div></div></div>';
  return h+'<div class="mrow"><button class="mbtn g" type="button" data-page="rules">Документы</button>'+bookBtn()+'</div>'}
};
function renderView(){
  mdc.innerHTML='<div>'+VIEWS[MD.kind]()+'</div>';
  if(MD.kind==="schedule")schMount(g("schM"),MD.hall);
  [].forEach.call(mdc.querySelectorAll("[data-av]"),function(el){trainerAvStyle(el,TRAINERS[+el.dataset.av])});
  [].forEach.call(mdc.querySelectorAll("[data-dimg]"),function(el){var d=DIRS[+el.dataset.dimg];if(IM[d.img])el.style.backgroundImage="url("+IM[d.img]+")";else el.style.background="linear-gradient(135deg,#2a1a52,#5a34a8)";if(d.pos)el.style.backgroundPosition=d.pos});
}
function openModal(){if(!md.open)md.showModal();md.scrollTop=0}
function openView(kind,hall){
  MD.kind=kind;MD.hall=hall||"";
  var tabs=({trainers:["sun","moon","earth","all"],schedule:[],price:[],write:[]}[kind])||[];
  MD.tab=(tabs.indexOf(hall)>-1)?hall:"all";md.classList.toggle("wide",kind==="schedule");
  renderView();openModal();
}
g("mdx").onclick=function(){md.close()};
md.addEventListener("click",function(e){if(e.target===md)md.close()});
// лайтбокс зала
function openHallGallery(k){
  LBL=HALLS[k].gal.map(function(key){return{src:IM[key],alt:ALT[key]||HALLS[k].title}});
  show(0);lb.showModal();
}
document.addEventListener("click",function(e){
  var w=e.target.closest&&e.target.closest("[data-write]");if(w){openView("write","");return}
  var t=e.target.closest&&e.target.closest("[data-tab],[data-tr],[data-close],[data-act],[data-page]");if(!t)return;
  if(t.dataset.tab){MD.tab=t.dataset.tab;renderView();return}
  if(t.dataset.tr){md.close();if(route.p==="home")pageOrigin={hash:location.hash,y:window.scrollY};location.hash="trainer-"+t.dataset.tr;return}
  if(t.hasAttribute("data-close")){md.close();return}
  if(t.dataset.page){if(md.open)md.close();return}
  var a=t.dataset.act;
  if(a==="gal")openHallGallery(t.dataset.hall);
  else openView(a,t.dataset.hall);
});


// ===== Кнопка связи (справа внизу). Ссылки вписать здесь; пустая ссылка = «скоро» =====
var CHAT_CONFIG=C.data.CHAT_CONFIG;
(function(){var f=g("fab"),b=g("fabb");
  function set(o){f.classList.toggle("open",o);b.setAttribute("aria-expanded",String(o))}
  [["fmax","max"],["ftg","telegram"]].forEach(function(x){var a=g(x[0]),u=CHAT_CONFIG[x[1]];
    if(u)a.href=u;else{a.removeAttribute("href");a.removeAttribute("target");a.setAttribute("role","button");a.tabIndex=0;
      a.onclick=function(){set(false);md.classList.remove("wide");mdc.innerHTML='<div><h3>Telegram</h3><p style="margin:14px 0 0;font-size:17px;line-height:1.5">Ссылка на Telegram скоро появится. Пока напишите нам в MAX или ВКонтакте, либо позвоните администратору.</p><div class="mrow"><button class="mbtn" type="button" data-close>Понятно</button></div></div>';openModal()}}});
  b.onclick=function(e){e.stopPropagation();set(!f.classList.contains("open"))};
  document.addEventListener("click",function(e){if(!f.contains(e.target))set(false)});
  document.addEventListener("keydown",function(e){if(e.key==="Escape")set(false)});
})();

// ===== Боковая панель и страницы =====
var side=g("side"),ov=g("ov"),bg=g("burger"),PG=["about","rules","coaches","schedule","docs","trainer"];
function menu(o){side.classList.toggle("on",o);ov.classList.toggle("on",o);bg.setAttribute("aria-expanded",String(o))}
bg.onclick=function(){menu(true)};g("sx").onclick=function(){menu(false)};ov.onclick=function(){menu(false)};
document.addEventListener("keydown",function(e){if(e.key==="Escape")menu(false)});
side.addEventListener("click",function(e){if(e.target.closest("a,[data-act]"))menu(false)});
function route(){
  var h=location.hash.slice(1),m=/^trainer-(\d+)$/.exec(h),p=m?"trainer":(PG.indexOf(h)>-1&&h!=="trainer"?h:"home");if(m){fillTrainer(+m[1]);var tb=g("tback");if(route.p==="coaches"||route.p==="trainer"&&route.b==="coaches"){tb.setAttribute("href","#coaches");tb.innerHTML="&larr; Ко всем тренерам";route.b="coaches"}else{tb.setAttribute("href","#trainers");tb.innerHTML="&larr; К тренерам";route.b=""}}
  g("home").hidden=p!=="home";
  PG.forEach(function(k){g("p-"+k).hidden=p!==k});
  [].forEach.call(side.querySelectorAll(".sl"),function(b){b.classList.toggle("on",b.dataset.page===p)});
  if(h!==route.l)window.scrollTo({top:0,behavior:"instant"});route.l=h;route.p=p;
}
var pageOrigin=null;
function closePage(){if(md.open){md.close();return}if(pageOrigin){var target=pageOrigin;pageOrigin=null;history.replaceState(null,"",location.href.split("#")[0]+target.hash);route();window.scrollTo({top:target.y,behavior:"instant"})}else go("home")}
function go(p){menu(false);if(route.p==="home"&&p!=="home")pageOrigin={hash:location.hash,y:window.scrollY};if(location.hash.slice(1)===p){route()}else{location.hash=p}}
window.addEventListener("hashchange",route);window.addEventListener("popstate",route);
document.addEventListener("click",function(e){
  var x=e.target.closest&&e.target.closest("[data-page-close]");if(x){e.preventDefault();closePage();return}
  var b=e.target.closest&&e.target.closest("[data-page]");if(b){e.preventDefault();go(b.dataset.page);return}
  var a=e.target.closest&&e.target.closest('a[href^="#"]');
  if(a&&g("home").hidden){var id=a.getAttribute("href").slice(1);e.preventDefault();e.stopImmediatePropagation();if(PG.indexOf(id)>-1&&id!=="trainer"){go(id);return}go("home");setTimeout(function(){var el=id&&g(id);if(el)el.scrollIntoView({behavior:"smooth"})},60)}
},true);
route();

}
