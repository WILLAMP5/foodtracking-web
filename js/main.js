document.documentElement.classList.add('js');
const $=(s,r=document)=>[...r.querySelectorAll(s)];
const reduce=matchMedia('(prefers-reduced-motion:reduce)').matches;

// títulos palabra por palabra
$('[data-split]').forEach(h=>{
  let i=0;
  const walk=n=>{[...n.childNodes].forEach(c=>{
    if(c.nodeType===3){const f=document.createDocumentFragment();
      c.textContent.split(/(\s+)/).forEach(t=>{if(!t)return;if(/^\s+$/.test(t)){f.append(t);return;}
        const s=document.createElement('span');s.className='wd';s.style.setProperty('--i',i++);s.textContent=t;f.append(s);});
      c.replaceWith(f);}
    else if(c.nodeType===1)walk(c);});};
  walk(h);
});

// revelado + contadores
const io=new IntersectionObserver(es=>es.forEach(e=>{if(!e.isIntersecting)return;e.target.classList.add('in');io.unobserve(e.target);
  $('[data-count]',e.target).concat(e.target.matches('[data-count]')?[e.target]:[]).forEach(count);}),{threshold:.15});
$('.rv,[data-split],.rc').forEach(el=>io.observe(el));
function count(el){if(el.dataset.done)return;el.dataset.done=1;
  const to=+el.dataset.count,pre=el.dataset.pre||'',suf=el.dataset.suf||'';
  if(reduce){el.textContent=pre+to+suf;return;}
  const t0=performance.now(),d=1600;
  (function f(t){const p=Math.min((t-t0)/d,1),v=Math.round(to*(1-Math.pow(1-p,3)));el.textContent=pre+v+suf;if(p<1)requestAnimationFrame(f);})(t0);}
$('.stats [data-count],.glass [data-count]').forEach(el=>io.observe(el.closest('.col,.glass')));

// scroll: progreso, parallax, header que se oculta, enlace activo
const prog=document.getElementById('prog'),bar=document.getElementById('bar');
const par=$('[data-speed]'),secs=$('main section[id]'),links=$('#menu a');let lastY=0,tick=false;
function onScroll(){const y=scrollY,h=document.documentElement.scrollHeight-innerHeight;
  prog.style.width=(y/h*100)+'%';
  bar.classList.toggle('hide',y>lastY&&y>400&&!document.getElementById('menu').classList.contains('open'));lastY=y;
  if(!reduce)par.forEach(p=>{const r=p.parentElement.getBoundingClientRect();if(r.bottom>0&&r.top<innerHeight)p.style.translate=`0 ${(-r.top*p.dataset.speed).toFixed(1)}px`;});
  let cur=secs[0]?secs[0].id:'';secs.forEach(s=>{if(s.getBoundingClientRect().top<innerHeight*.4)cur=s.id;});
  links.forEach(a=>a.toggleAttribute('aria-current',a.getAttribute('href')==='#'+cur));tick=false;}
addEventListener('scroll',()=>{if(!tick){tick=true;requestAnimationFrame(onScroll);}},{passive:true});onScroll();

// botones magnéticos
if(!reduce&&matchMedia('(pointer:fine)').matches)$('.btn').forEach(b=>{
  b.addEventListener('mousemove',e=>{const r=b.getBoundingClientRect();b.style.transform=`translate(${(e.clientX-r.left-r.width/2)*.18}px,${(e.clientY-r.top-r.height/2)*.28}px)`;});
  b.addEventListener('mouseleave',()=>b.style.transform='');});

// menú móvil
const burger=document.getElementById('burger'),menu=document.getElementById('menu');
burger.addEventListener('click',()=>{const o=menu.classList.toggle('open');burger.setAttribute('aria-expanded',o);});
menu.addEventListener('click',e=>{if(e.target.tagName==='A'){menu.classList.remove('open');burger.setAttribute('aria-expanded','false');}});

// formulario -> WhatsApp
const formEl=document.getElementById('form');
if(formEl)formEl.addEventListener('submit',e=>{
  e.preventDefault();const f=e.target;
  if(!f.nombre.value.trim()||!f.correo.value||!f.correo.validity.valid){f.reportValidity();(f.nombre.value.trim()?f.correo:f.nombre).focus();return;}
  const t=`Hola, soy ${f.nombre.value}${f.empresa.value?' de '+f.empresa.value:''}.\nNecesito: ${f.servicio.value}.\n${f.mensaje.value}\nContacto: ${f.correo.value} ${f.tel.value}`;
  document.getElementById('ok').style.display='block';
  window.open('https://wa.me/51952255734?text='+encodeURIComponent(t),'_blank','noopener');});
document.getElementById('y').textContent=new Date().getFullYear();
const pre={gestion:0,'ingenieria-3d':1,regulacion:2,digital:5,capacitacion:3};
const q=new URLSearchParams(location.search).get('s');if(formEl&&q in pre)formEl.servicio.selectedIndex=pre[q];
