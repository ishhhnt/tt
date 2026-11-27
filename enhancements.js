/* ISHNTTCHAT boost */
(()=>{
const d=document,$=id=>d.getElementById(id),root=d.documentElement,set=(id,a,v)=>$(id)?.setAttribute(a,v);

/* Styles: no iOS zoom on inputs, visible keyboard focus, image fade-in, reduced motion */
const st=d.createElement('style');
st.textContent=`input,textarea{font-size:16px}
html{-webkit-text-size-adjust:100%}
main,#msgs,#panel{overscroll-behavior:contain}
:focus-visible{outline:2px solid var(--ac);outline-offset:2px}
.in:focus-visible,#q:focus-visible{outline:0}
.grid .card img.pic.fade{opacity:0;transition:opacity .4s,transform .6s cubic-bezier(.2,.8,.2,1)}
.grid .card img.pic.fade.ld{opacity:1}
@media(prefers-reduced-motion:reduce){.grid .card,.grid .card img.pic,.pv .sheet,.fv img,#thm,#panel,#toast{animation:none!important;transition:none!important}}`;
d.head.appendChild(st);

/* Head extras: description, favicon */
const H=(t,o)=>{const e=d.createElement(t);for(const k in o)e.setAttribute(k,o[k]);d.head.appendChild(e)};
if(!d.querySelector('meta[name=description]'))H('meta',{name:'description',content:'ISHNTTCHAT: share photos, browse by hashtag and chat with friends.'});
if(!d.querySelector('link[rel~=icon]'))H('link',{rel:'icon',href:"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 64 64'%3E%3Crect width='64' height='64' rx='18' fill='%23ffb54a'/%3E%3Ctext x='32' y='45' font-size='36' font-weight='700' text-anchor='middle' fill='%23201400' font-family='sans-serif'%3EI%3C/text%3E%3C/svg%3E"});

/* Default Pitch Black #000000 theme if none set */
try{var curT=localStorage.getItem('theme')||'amoled';if(curT==='dark'||curT==='blue')curT='amoled';root.setAttribute('data-theme',curT);d.querySelector('meta[name=theme-color]')?.setAttribute('content',curT==='light'?'#f4f6f9':curT==='midnight'?'#0b0f19':'#000000')}catch{}

/* Form and screen-reader basics */
set('aMail','autocomplete','email');set('aUser','autocomplete','username');set('aUser','spellcheck','false');
set('aPass','autocomplete','current-password');set('q','aria-label','Search');
set('toast','role','status');set('toast','aria-live','polite');set('off','role','alert');
$('tLogin')?.addEventListener('click',()=>set('aPass','autocomplete','current-password'));
$('tSign')?.addEventListener('click',()=>set('aPass','autocomplete','new-password'));

/* Search waits for a pause in typing; tapping Home again scrolls to the top */
const q=$('q'),qf=q&&q.oninput;
if(qf){let t;q.oninput=e=>{clearTimeout(t);t=setTimeout(()=>qf.call(q,e),180)}}
$('nHome')?.addEventListener('click',()=>$('main')?.scrollTo({top:0,behavior:'smooth'}));

/* Cards become keyboard-reachable, images fade in, dialogs are announced as dialogs */
const done=new WeakSet();
function scan(n){
  if(n.matches('.grid>.card')){
    if(done.has(n))return;done.add(n);
    n.tabIndex=0;n.setAttribute('role','button');
    const i=n.querySelector('img.pic');
    if(i){i.decoding='async';if(!i.complete){const f=()=>i.classList.add('ld');i.classList.add('fade');i.addEventListener('load',f,{once:true});i.addEventListener('error',f,{once:true})}}
  }else if(n.matches('.ov')){
    if(done.has(n))return;done.add(n);
    const s=n.firstElementChild;if(s){s.setAttribute('role','dialog');s.setAttribute('aria-modal','true')}
  }else if(n.firstElementChild)n.querySelectorAll('.grid>.card,.ov').forEach(scan);
}
new MutationObserver(ms=>ms.forEach(m=>m.addedNodes.forEach(n=>n.nodeType==1&&scan(n)))).observe(d.body,{childList:true,subtree:true});
d.querySelectorAll('.grid>.card,.ov').forEach(scan);

/* Disable mobile hold-to-select / long-press context menu on media & UI cards */
if('ontouchstart' in window || navigator.maxTouchPoints > 0){
  d.addEventListener('contextmenu', e => {
    if(e.target.closest('img, video, .card, .reel-card, .post-source-badge, nav, header, button')){
      e.preventDefault();
    }
  });
}

/* Keyboard: Enter submits login and dialogs, Enter/Space opens a card, Escape closes the top layer */
d.addEventListener('keydown',e=>{
  const t=e.target,k=e.key;
  if(k=='Escape'){
    const top=[...d.querySelectorAll('.fv,.ov')].pop();
    if(top)top.classList.contains('fv')?top.click():top.querySelector('[data-x]')?.click();
    else if($('panel')?.classList.contains('open'))$('px')?.click();
    return;
  }
  if(!t.matches)return;
  if((k=='Enter'||k==' ')&&t.matches('.grid>.card')){e.preventDefault();t.click();return}
  if(k=='Enter'&&t.matches('input:not([type=file])')){
    const ov=t.closest('.ov'),b=t.closest('#auth')?$('aGo'):ov&&ov.querySelector('[data-ok],#cs');
    if(b&&!b.disabled&&!b.classList.contains('spin')){e.preventDefault();b.click()}
  }
});

/* Smaller uploads: resize big photos before they leave the phone (posts 1600px, chat 1280px, profile 512px) */
async function shrink(f,max){
  if(!/^image\/(jpeg|png|webp)$/.test(f.type))return f;
  try{
    const b=await createImageBitmap(f),k=Math.min(1,max/Math.max(b.width,b.height));
    if(k==1&&f.size<8e5)return f;
    const c=d.createElement('canvas');c.width=Math.round(b.width*k);c.height=Math.round(b.height*k);
    const x=c.getContext('2d');x.fillStyle='#fff';x.fillRect(0,0,c.width,c.height);x.drawImage(b,0,0,c.width,c.height);
    const o=await new Promise(r=>c.toBlob(r,'image/jpeg',.85));
    return o&&o.size<f.size?new File([o],(f.name||'photo').replace(/\.\w+$/,'')+'.jpg',{type:'image/jpeg'}):f;
  }catch{return f}
}
const F=window.fetch.bind(window);
window.fetch=async(u,o)=>{
  try{
    if(o&&o.method=='POST'&&o.body instanceof FormData&&/\/upload$/.test(String(u))){
      const c=o.body.get('caption');
      const maxDim = c=='__dp__'?512:c=='__chat__'?1280:1600;
      const allFiles = o.body.getAll('files');
      if(allFiles && allFiles.length){
        o.body.delete('files');
        for(const f of allFiles){
          if(f instanceof Blob){
            const s=await shrink(f,maxDim);
            o.body.append('files',s,f.name||'photo.jpg');
          }else{
            o.body.append('files',f);
          }
        }
      }
      const singleFile = o.body.get('file');
      if(singleFile instanceof Blob){
        const s=await shrink(singleFile,maxDim);
        if(s!==singleFile)o.body.set('file',s,singleFile.name||'photo.jpg');
      }
    }
  }catch{}
  return F(u,o);
};
})();
