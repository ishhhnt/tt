import{initializeApp}from"https://www.gstatic.com/firebasejs/10.7.0/firebase-app.js";
import{getAuth,onAuthStateChanged,createUserWithEmailAndPassword,signInWithEmailAndPassword,GoogleAuthProvider,signInWithPopup,signOut,sendEmailVerification,sendPasswordResetEmail,updatePassword,EmailAuthProvider,reauthenticateWithCredential}from"https://www.gstatic.com/firebasejs/10.7.0/firebase-auth.js";
import{getFirestore,doc,getDoc,setDoc,updateDoc,deleteDoc,collection,query,where,onSnapshot,addDoc,orderBy,limit,documentId,serverTimestamp,arrayUnion,arrayRemove}from"https://www.gstatic.com/firebasejs/10.7.0/firebase-firestore.js";

const app=initializeApp({apiKey:"AIzaSyCJkg8OOu3szJmBnvbbND6BJYT_9aQVExg",authDomain:"ishntt-f8b74.firebaseapp.com",projectId:"ishntt-f8b74",storageBucket:"ishntt-f8b74.firebasestorage.app",messagingSenderId:"1002308007099",appId:"1:1002308007099:web:ed0f89596a74f522bba59e"});
const auth=getAuth(app),db=getFirestore(app);
const API="https://ishntbot.ishantgiri2004g.workers.dev";
const W=API;

const $=id=>document.getElementById(id),esc=s=>String(s??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
const fullUrl=url=>(!url?"":url.startsWith("http")?url:API+(url.startsWith("/")?url:"/"+url));
const imgUrl=id=>(!id?"":id.startsWith("http")?id:id.startsWith("/")?API+id:API+"/image/"+id);
const cid=(a,b)=>[a,b].sort().join("_"),ms=t=>t?.toMillis?t.toMillis():(t||Date.now());
let authSlides=[],authSlideIndex=0,authSlideTimer=null;

function setAuthSlides(items){
 const shots=[...document.querySelectorAll(".auth-shot")];
 if(!shots.length||!items?.length)return;
 authSlides=items.slice(0,Math.max(shots.length,30)).map(p=>(Array.isArray(p.mediaUrls)&&p.mediaUrls[0]?fullUrl(p.mediaUrls[0]):imgUrl(p.id)));
 shots.forEach((shot,index)=>{shot.style.backgroundImage=`url("${authSlides[index%authSlides.length]}")`;shot.classList.toggle("active",index===0)});
 authSlideIndex=0;clearInterval(authSlideTimer);
 if(authSlides.length<2)return;
 authSlideTimer=setInterval(()=>{
  const current=authSlideIndex%shots.length,next=(current+1)%shots.length;
  authSlideIndex=(authSlideIndex+1)%authSlides.length;
  shots[next].style.backgroundImage=`url("${authSlides[authSlideIndex]}")`;
  shots[next].classList.add("active");shots[current].classList.remove("active");
 },1500);
}

let me=null,guest=false,posts=[],mode="login",signing=false,ready=false,panelOpen=false,curChat=null,unsubMsgs=null,feedTab="foryou";
const profiles=new Map(),chats=new Map(),watching=new Set(),T0=Date.now();

const getFollowing=()=>{
  if(!me||guest)return new Set();
  try{
    const raw=localStorage.getItem("ishnt_following_"+me.uid);
    return new Set(raw?JSON.parse(raw):(me.following||[]));
  }catch(e){
    return new Set(me.following||[]);
  }
};

const isFollowing=uid=>getFollowing().has(uid);

async function toggleFollow(targetUid,targetUsername){
  if(guest){say("Log in to follow accounts.");return false}
  if(!canAct()||!targetUid||(me&&targetUid===me.uid))return false;

  const followingSet=getFollowing();
  const willFollow=!followingSet.has(targetUid);

  if(willFollow){
    followingSet.add(targetUid);
  }else{
    followingSet.delete(targetUid);
  }

  try{
    localStorage.setItem("ishnt_following_"+me.uid,JSON.stringify(Array.from(followingSet)));
  }catch(x){}
  if(me)me.following=Array.from(followingSet);

  try{
    await updateDoc(doc(db,"users",me.uid),{
      following:willFollow?arrayUnion(targetUid):arrayRemove(targetUid)
    });
    await updateDoc(doc(db,"users",targetUid),{
      followers:willFollow?arrayUnion(me.uid):arrayRemove(me.uid)
    });
    profiles.delete(targetUid);
    profiles.delete(me.uid);
  }catch(err){
    console.warn("Follow sync error:",err);
  }

  say(willFollow?`Following @${targetUsername||"user"} ✓`:`Unfollowed @${targetUsername||"user"}`);
  return willFollow;
}

const seen=()=>JSON.parse(localStorage.getItem("seen_"+me.uid)||"{}"),setSeen=(id,t)=>{const s=seen();s[id]=t;localStorage.setItem("seen_"+me.uid,JSON.stringify(s))};
const av=(n,p,c="")=>p?`<img class="av ${c}" src="${esc(p)}" alt="" data-l="${esc((n||"?")[0].toUpperCase())}" onerror="avErr(this)">`:`<span class="av ${c}">${esc((n||"?")[0].toUpperCase())}</span>`;
let tt;function toast(html,fn){const t=$("toast");t.innerHTML=html;t.onclick=fn||null;t.classList.add("show");clearTimeout(tt);tt=setTimeout(()=>t.classList.remove("show"),3500)}
const say=m=>toast(esc(m));
async function busy(b,fn){b.classList.add("spin");try{return await fn()}catch(e){console.error(e);say(errMsg(e))}finally{b.classList.remove("spin")}}
function errMsg(e){if(e?.message&&!e.code&&e.message!=="upload")return e.message;const c=e?.code||"";return({"auth/invalid-credential":"Incorrect email or password.","auth/email-already-in-use":"This email is already registered.","auth/invalid-email":"Enter the email in a valid format.","auth/popup-closed-by-user":"Google sign-in was cancelled.","auth/user-not-found":"This email isn't registered.","auth/wrong-password":"Incorrect password.","auth/too-many-requests":"Too many attempts. Wait 5 minutes and try again.","auth/weak-password":"Choose a stronger password (min 6 characters).","auth/requires-recent-login":"Log in again and retry.","auth/network-request-failed":"Network error. Check your connection."})[c]||(navigator.onLine?"Something went wrong. Try again.":"You're offline.")}
function dlg(title,body,ok,onOk){
  const o=document.createElement("div");
  o.className="ov";
  const isNode=body instanceof Node;
  o.innerHTML=`<div class="sheet g"><h3>${title}</h3>${isNode?'<div class="dlg-content-slot"></div>':body}<div class="row" style="justify-content:flex-end"><button class="btn" data-x>Cancel</button>${ok?`<button class="btn pri" data-ok>${ok}</button>`:""}</div></div>`;
  if(isNode){
    o.querySelector(".dlg-content-slot")?.replaceWith(body);
  }
  document.body.appendChild(o);
  if(title==="Edit post"){o.querySelector("[data-ok]")?.setAttribute("aria-label","Save post changes")}
  const close=()=>o.remove();
  o.onclick=e=>{if(e.target===o||e.target.dataset.x!==undefined)close()};
  const b=o.querySelector("[data-ok]");
  if(b)b.onclick=()=>busy(b,async()=>{if(await onOk(o)!==false)close()});
  return o;
}
async function getUserProfile(uid,force){if(!uid||uid.startsWith("g_"))return null;if(!force&&profiles.has(uid))return profiles.get(uid);try{const s=await getDoc(doc(db,"users",uid));const d=s.exists()?{uid,...s.data()}:null;profiles.set(uid,d);return d}catch{return profiles.get(uid)||null}}
async function upload(files,extra={}){
  const f=new FormData();
  const fileArray=Array.isArray(files)?files:(files instanceof FileList?Array.from(files):[files]);
  for(const file of fileArray){
    f.append("files",file);
    f.append("file",file);
  }
  f.append("username",extra.username||me?.username||"anonymous");
  f.append("uid",me?.uid||"");
  f.append("caption",extra.caption||"");
  f.append("tags",extra.tags||"");

  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open("POST", W + "/upload");

    if (xhr.upload && typeof extra.onProgress === "function") {
      xhr.upload.onprogress = e => {
        if (e.lengthComputable) {
          const percent = Math.min(99, Math.round((e.loaded / e.total) * 100));
          extra.onProgress(percent, e.loaded, e.total);
        }
      };
    }

    xhr.onload = () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        if (typeof extra.onProgress === "function") extra.onProgress(100);
        try {
          const j = JSON.parse(xhr.responseText);
          resolve(j.id || j.post?.id);
        } catch {
          resolve("post_" + Date.now());
        }
      } else {
        let msg = "Upload failed (" + xhr.status + ")";
        try {
          const j = JSON.parse(xhr.responseText);
          if (j && j.error) msg = j.error;
        } catch {}
        reject(new Error(msg));
      }
    };

    xhr.onerror = () => {
      reject(new Error("Network error during upload. Please check connection."));
    };

    xhr.ontimeout = () => {
      reject(new Error("Upload timed out. Try again with a smaller file."));
    };

    xhr.send(f);
  });
}

/* AUTH */
let verifyResendTimer=null;
const isValidEmail=mail=>/^[^\s@]+@[^\s@]+\.[a-zA-Z]{2,}$/.test(mail);

function showVerifyView(email){
  mode="verify";
  $("authNormalBox")?.classList.add("hide");
  $("authVerifyBox")?.classList.remove("hide");
  const targetEmail=email||auth.currentUser?.email||$("aMail")?.value.trim()||"";
  if($("authVerifyEmail")) $("authVerifyEmail").textContent=targetEmail;
  if($("authVerifyErr")) $("authVerifyErr").textContent="";
}

const setMode=m=>{
  mode=m;
  clearInterval(verifyResendTimer);
  const isVerify=m==="verify";
  const isLogin=m==="login";
  
  $("authNormalBox")?.classList.toggle("hide",isVerify);
  $("authVerifyBox")?.classList.toggle("hide",!isVerify);

  if(isVerify){
    showVerifyView();
    return;
  }

  $("aForgot")?.classList.toggle("hide",!isLogin);
  $("aUserGroup")?.classList.toggle("hide",isLogin);
  $("aUser")?.classList.toggle("hide",isLogin);
  if($("authHeading")) $("authHeading").textContent=isLogin?"Welcome Back":"Create Account";
  if($("authSubheading")) $("authSubheading").textContent=isLogin?"Please sign in to your account":"Please sign up to get started";
  if($("aGoT")) $("aGoT").textContent=isLogin?"Sign In":"Sign Up";
  if($("aSwitchText")) $("aSwitchText").textContent=isLogin?"Don't have an account?":"Already have an account?";
  if($("aSwitchLink")) $("aSwitchLink").textContent=isLogin?"Sign Up":"Sign In";
  $("tLogin")?.classList.toggle("pri",isLogin);
  $("tSign")?.classList.toggle("pri",!isLogin);
  $("tLogin")?.setAttribute("aria-selected",isLogin?"true":"false");
  $("tSign")?.setAttribute("aria-selected",!isLogin?"true":"false");
  if($("aErr")) $("aErr").textContent="";
};
$("tLogin").onclick=()=>setMode("login");$("tSign").onclick=()=>setMode("sign");
if($("aSwitchLink")) $("aSwitchLink").onclick=()=>setMode(mode==="login"?"sign":"login");
const passToggle=$("aPassToggle");
if(passToggle){
  passToggle.onclick=e=>{
    e.preventDefault();
    const pass=$("aPass");
    if(!pass)return;
    const isPass=pass.type==="password";
    pass.type=isPass?"text":"password";
    passToggle.querySelector(".eye-open")?.classList.toggle("hide",isPass);
    passToggle.querySelector(".eye-closed")?.classList.toggle("hide",!isPass);
  };
}
try{
  const savedMail=localStorage.getItem("saved_login_email");
  if(savedMail&&$("aMail")) $("aMail").value=savedMail;
}catch(e){}
const okName=n=>/^[a-z0-9_.]{3,20}$/.test(n);
async function nameFree(n){return!(await getDoc(doc(db,"usernames",n))).exists()}
async function makeProfile(u,name,pic){await setDoc(doc(db,"usernames",name),{uid:u.uid,email:u.email||"",createdAt:serverTimestamp()});await setDoc(doc(db,"users",u.uid),{username:name,email:u.email||"",profilePic:pic||"",createdAt:serverTimestamp()})}
$("aGo").onclick=()=>busy($("aGo"),async()=>{
  const e=$("aMail").value.trim(),p=$("aPass").value,n=$("aUser").value.trim().toLowerCase(),er=$("aErr");er.textContent="";
  if(!e||!p){er.textContent="Enter both email and password.";return}
  if(!isValidEmail(e)){er.textContent="Please enter a valid email address.";return}
  if($("aRemember")?.checked&&e){try{localStorage.setItem("saved_login_email",e)}catch(x){}}else{try{localStorage.removeItem("saved_login_email")}catch(x){}}
  
  if(mode=="login"){
    const cred=await signInWithEmailAndPassword(auth,e,p);
    await cred.user.reload();
    if(!cred.user.emailVerified){
      showVerifyView(cred.user.email||e);
      return;
    }
    await init(cred.user);
    return;
  }
  
  if(!okName(n)){er.textContent="Username must be 3-20 characters: a-z, 0-9, _ or .";return}
  if(!(await nameFree(n))){er.textContent="That username is taken. Choose another.";return}
  
  signing=true;
  try{
    const c=await createUserWithEmailAndPassword(auth,e,p);
    await makeProfile(c.user,n,"");
    try{
      await sendEmailVerification(c.user);
    }catch(err){
      console.warn("Email verification send error:",err);
    }
    showVerifyView(c.user.email||e);
  }finally{
    signing=false;
  }
});

function startResendCooldown(){
  const btn=$("aVerifyResend");
  if(!btn)return;
  btn.disabled=true;
  let s=30;
  btn.textContent=`Resend in ${s}s`;
  clearInterval(verifyResendTimer);
  verifyResendTimer=setInterval(()=>{
    s--;
    if(s<=0){
      clearInterval(verifyResendTimer);
      btn.disabled=false;
      btn.textContent="Resend Verification Email";
    }else{
      btn.textContent=`Resend in ${s}s`;
    }
  },1000);
}

$("aVerifyCheck")&&($("aVerifyCheck").onclick=()=>busy($("aVerifyCheck"),async()=>{
  const er=$("authVerifyErr");
  if(er) er.textContent="";
  const u=auth.currentUser;
  if(!u){
    say("Session expired. Please log in.");
    setMode("login");
    return;
  }
  await u.reload();
  if(u.emailVerified){
    say("Email verified! Welcome ✓");
    await init(u);
  }else{
    if(er) er.textContent="Email is not verified yet. Please click the link sent to your email, then tap here again.";
  }
}));

$("aVerifyResend")&&($("aVerifyResend").onclick=()=>busy($("aVerifyResend"),async()=>{
  const er=$("authVerifyErr");
  if(er) er.textContent="";
  const u=auth.currentUser;
  if(!u){
    say("Please log in again.");
    setMode("login");
    return;
  }
  await sendEmailVerification(u);
  say("Verification email sent! Check your inbox & spam.");
  startResendCooldown();
}));

$("aVerifyBack")&&($("aVerifyBack").onclick=async()=>{
  clearInterval(verifyResendTimer);
  const btn=$("aVerifyResend");
  if(btn){btn.disabled=false;btn.textContent="Resend Verification Email";}
  try{await signOut(auth);}catch{}
  setMode("login");
});

$("aGoogle").onclick=()=>busy($("aGoogle"),async()=>{await signInWithPopup(auth,new GoogleAuthProvider())});
$("aSkip").onclick=()=>{let g=localStorage.getItem("guestId");if(!g){g="g_"+Math.random().toString(36).slice(2,10);localStorage.setItem("guestId",g)}guest=true;me={uid:g,username:"guest_"+g.slice(2,6),guest:true};start()};
$("aForgot").onclick=()=>dlg("Reset password",`<input class="in" id="fe" type="email" placeholder="Your account email" value="${esc($("aMail").value.trim())}">`,"Send link",async o=>{const e=o.querySelector("#fe").value.trim();if(!e){say("Enter your email.");return false}await sendPasswordResetEmail(auth,e);mailSent("reset")});
function mailSent(k){const v=k=="verify";dlg(v?"📧 Verification email sent!":"📧 Password reset email sent!",`<div>From: <b>noreply@ishntt-f8b74.firebaseapp.com</b></div><div>Check your Inbox and your <b>Spam</b> folder.</div><div style="color:var(--m)">${v?"After tapping the link, press “I’ve verified” in the banner or refresh the page.":"Open the link, set a new password, then log in."}</div>`,"Got it",()=>{})}
const canAct=()=>{if(guest||me?.verified)return true;say("Verify your email first. Use Resend in the banner.");return false};
onAuthStateChanged(auth,async u=>{
  if(signing)return;
  if(u){
    try{await u.reload();}catch{}
    if(!u.emailVerified){
      ready=false;
      syncHeaderLogo();
      $("auth").classList.remove("hide");
      $("app").classList.add("hide");
      showVerifyView(u.email);
      return;
    }
    await init(u);
  }else if(!guest){
    ready=false;
    syncHeaderLogo();
    $("auth").classList.remove("hide");
    $("app").classList.add("hide");
    setMode("login");
    loadImages();
  }
});
async function init(u){guest=false;try{await u.reload()}catch{}let p=await getUserProfile(u.uid,true);
 if(!p){await new Promise(res=>{const d=dlg("Choose a username",`<input class="in" id="nn" placeholder="username" autocapitalize="none"><div id="ne" style="color:var(--rd);font-size:13px"></div>`,"Save",async o=>{const n=o.querySelector("#nn").value.trim().toLowerCase();if(!okName(n)){o.querySelector("#ne").textContent="3-20 characters: a-z, 0-9, _ .";return false}if(!(await nameFree(n))){o.querySelector("#ne").textContent="That username is taken.";return false}await makeProfile(u,n,u.photoURL);res()});d.onclick=null;d.querySelector("[data-x]").remove()});p=await getUserProfile(u.uid,true)}
 me={uid:u.uid,username:p.username,email:u.email,profilePic:p.profilePic,contacts:p.contacts||[],following:p.following||[],followers:p.followers||[],verified:u.emailVerified,pw:u.providerData.some(x=>x.providerId=="password")};
 try{localStorage.setItem("ishnt_following_"+me.uid,JSON.stringify(me.following));}catch(x){}
 start();}
let headerLogoTimer;
function syncHeaderLogo(){
 clearTimeout(headerLogoTimer);
 const logo=$("headerLogo"),username=!guest&&me?.username;
 logo.classList.remove("fading");
 if(!username){logo.textContent="ISHNTTCHAT";return}
 let showingUsername=true;
 logo.textContent=username;
 const transition=()=>{
  logo.classList.add("fading");
  headerLogoTimer=setTimeout(()=>{
   showingUsername=!showingUsername;
   logo.textContent=showingUsername?username:"ISHNTTCHAT";
   logo.classList.remove("fading");
   headerLogoTimer=setTimeout(transition,5000)
  },350)
 };
 headerLogoTimer=setTimeout(transition,5000)
}
function start(){$("auth").classList.add("hide");$("app").classList.remove("hide");syncHeaderLogo();ready=true;updVerify();nav("home");loadImages();if(!guest){startNotif()}}

/* ==========================================
   GALLERY (SIRF IMAGES, NO TEXT POSTS)
   ========================================== */
async function loadImages() {
  const el = $("grid");
  if (el) el.innerHTML = '<div class="sp" style="grid-column:1/-1"></div>';
  
  try {
    const r = await fetch(W + "/list");
    const j = await r.json();
    
    // Filter out internal assets (profile pics, chat images, sub-album images)
    posts = (j.images || [])
      .filter(p => p.id && p.id.toString().trim() !== "" && !/__(dp|chat|album)__/.test(p.tags || p.caption || ""))
      .sort((a, b) => new Date(b.date) - new Date(a.date));
    setAuthSlides(posts);
    setupTrendingCards(posts);
      
  } catch (e) {
    if (!posts.length && el) {
      el.innerHTML = '<div class="empty" style="grid-column:1/-1">Couldn\'t load posts. Check connection.</div>';
      return;
    }
  }
  renderGallery();
}
loadImages();

let trendingIndex = 0;
let trendingPosts = [];

const getLikedPosts = () => {
  try { return new Set(JSON.parse(localStorage.getItem("ishnt_liked_posts") || "[]")); }
  catch(e) { return new Set(); }
};
const isLiked = id => getLikedPosts().has(id);
const getPostLikes = id => {
  try {
    const m = JSON.parse(localStorage.getItem("ishnt_likes_counts") || "{}");
    return m[id] || 0;
  } catch(e) { return 0; }
};
const togglePostLike = id => {
  const s = getLikedPosts();
  let m = {};
  try { m = JSON.parse(localStorage.getItem("ishnt_likes_counts") || "{}"); } catch(e){}
  const liked = s.has(id);
  if (liked) {
    s.delete(id);
    m[id] = Math.max(0, (m[id] || 1) - 1);
  } else {
    s.add(id);
    m[id] = (m[id] || 0) + 1;
  }
  try {
    localStorage.setItem("ishnt_liked_posts", JSON.stringify([...s]));
    localStorage.setItem("ishnt_likes_counts", JSON.stringify(m));
  } catch(e){}
  return { liked: !liked, count: m[id] };
};

function setupTrendingCards(items) {
  const card = $("trendingCard");
  if (!card) return;
  if (!items || items.length < 2) {
    card.classList.add("hide");
    return;
  }
  trendingPosts = items.filter(p => p.id);
  trendingIndex = 0;
  renderTrendingStack();
}

function renderTrendingStack() {
  if (!trendingPosts.length) return;
  const n = trendingPosts.length;
  const pFront = trendingPosts[trendingIndex % n];
  const pMid = trendingPosts[(trendingIndex + 1) % n];
  const pBack = trendingPosts[(trendingIndex + 2) % n];

  const frontImg = $("tCardFront")?.querySelector(".t-img");
  const midImg = $("tCardMid")?.querySelector(".t-img");
  const backImg = $("tCardBack")?.querySelector(".t-img");

  const getFirstMediaUrl = p => (!p ? "" : (Array.isArray(p.mediaUrls) && p.mediaUrls[0] ? fullUrl(p.mediaUrls[0]) : imgUrl(p.id)));
  if (frontImg && pFront) frontImg.src = getFirstMediaUrl(pFront);
  if (midImg && pMid) midImg.src = getFirstMediaUrl(pMid);
  if (backImg && pBack) backImg.src = getFirstMediaUrl(pBack);

  if ($("tUsername")) $("tUsername").textContent = pFront.username || "Anonymous";
  if ($("tCaption")) $("tCaption").textContent = pFront.caption || "";
  if ($("tAv")) $("tAv").innerHTML = av(pFront.username, "");

  getUserProfile(pFront.uid).then(u => {
    if (u && $("tAv")) $("tAv").innerHTML = av(u.username, u.profilePic);
    if (u && $("tUsername")) $("tUsername").textContent = u.username;
  });
}

function shuffleTrending() {
  const frontEl = $("tCardFront");
  if (!frontEl || !trendingPosts.length) return;
  frontEl.classList.add("shuffling");
  setTimeout(() => {
    trendingIndex = (trendingIndex + 1) % trendingPosts.length;
    renderTrendingStack();
    frontEl.classList.remove("shuffling");
  }, 220);
}

if ($("trendingShuffle")) $("trendingShuffle").onclick = e => { e.stopPropagation(); shuffleTrending(); };
if ($("tCardFront")) $("tCardFront").onclick = () => { if (trendingPosts.length) openPostView(trendingPosts[trendingIndex % trendingPosts.length]); };
if ($("trendingClose")) $("trendingClose").onclick = e => {
  e.stopPropagation();
  const c = $("trendingCard");
  if (c) {
    c.style.transition = "all 0.25s ease";
    c.style.opacity = "0";
    c.style.transform = "scale(0.95)";
    setTimeout(() => {
      c.classList.add("hide");
      c.style.opacity = "";
      c.style.transform = "";
    }, 250);
  }
};

function getColumnCount() {
  const w = window.innerWidth;
  if (w < 640) return 2;
  if (w < 960) return 3;
  if (w < 1360) return 4;
  if (w < 1750) return 5;
  return 6;
}

function getPostImages(p){
  if(!p)return[];
  if(Array.isArray(p.mediaUrls)&&p.mediaUrls.length){
    return p.mediaUrls.map(u=>fullUrl(u));
  }
  if(p.mediaUrl){
    return [fullUrl(p.mediaUrl)];
  }
  const match=(p.tags||"").match(/__album:([^_\s]+)__/);
  if(match){
    const extras=match[1].split(",").map(s=>s.trim()).filter(Boolean);
    return [p.id,...extras].map(id=>imgUrl(id));
  }
  if(p.id){
    return [imgUrl(p.id)];
  }
  return [];
}

function getPostTypes(p){
  if(!p)return["image"];
  if(Array.isArray(p.fileTypes)&&p.fileTypes.length)return p.fileTypes;
  if(p.fileType)return [p.fileType];
  return ["image"];
}

function filtered(){
  const q=$("q")?.value.trim().toLowerCase() || "";
  let list = posts;

  if (feedTab === "following") {
    const followingSet = getFollowing();
    list = list.filter(p => followingSet.has(p.uid) || (!guest && me && p.uid === me.uid));
  }

  if(!q) return list;
  return list.filter(p=>{
    const cleanT=(p.tags||"").replace(/__album:[^_\s]+__/g,"");
    return q[0]=="#"?cleanT.toLowerCase().includes(q):[p.username,p.caption,cleanT].join(" ").toLowerCase().includes(q);
  });
}

$("tabForYou")?.addEventListener("click", () => {
  feedTab = "foryou";
  $("tabForYou")?.classList.add("on");
  $("tabFollowing")?.classList.remove("on");
  renderGallery();
});

$("tabFollowing")?.addEventListener("click", () => {
  if (guest) {
    say("Log in to view posts from people you follow.");
    return;
  }
  feedTab = "following";
  $("tabFollowing")?.classList.add("on");
  $("tabForYou")?.classList.remove("on");
  renderGallery();
});

function populateMasonry(list, el) {
  if (!el) return;
  el.innerHTML = "";
  if (!list.length) return;
  const colsCount = getColumnCount();
  el.className = "grid pinterest-masonry";
  const cols = [];
  const colHeights = new Array(colsCount).fill(0);

  for (let i = 0; i < colsCount; i++) {
    const col = document.createElement("div");
    col.className = "pin-column";
    el.appendChild(col);
    cols.push(col);
  }

  list.forEach((p) => {
    const card = makeCard(p);
    if (!card) return;

    // Place card into the shortest column to keep columns perfectly balanced with no gaps
    let minIdx = 0;
    for (let c = 1; c < colsCount; c++) {
      if (colHeights[c] < colHeights[minIdx]) {
        minIdx = c;
      }
    }

    cols[minIdx].appendChild(card);

    // Approximate height weight: video is taller, photos are standard
    const types = getPostTypes(p);
    const isVid = (types[0] === "video" || p.fileType === "video");
    const weight = isVid ? 220 : 170;
    colHeights[minIdx] += weight;
  });
}

function renderGallery(list=filtered(), el=$("grid")) {
  const q = $("q")?.value.trim();
  const tc = $("trendingCard");

  if (el === $("grid")) {
    if (Boolean(q) || trendingPosts.length < 2) {
      if (tc) tc.classList.add("hide");
    } else {
      if (tc) tc.classList.remove("hide");
    }
  } else {
    if (tc) tc.classList.add("hide");
  }

  el.innerHTML = "";
  if (!list.length) {
    if (feedTab === "following" && el === $("grid")) {
      el.innerHTML = `
        <div class="empty" style="grid-column:1/-1;padding:44px 16px;text-align:center">
          <div style="font-size:42px;margin-bottom:10px">👥</div>
          <b style="font-size:17px;display:block;margin-bottom:8px">Follow creators to see their posts here</b>
          <p style="color:var(--m);font-size:13px;max-width:320px;margin:0 auto 18px">When you follow creators, their latest photos and carousels will appear in your Following feed.</p>
          <button class="btn pri" id="btnExploreMore">Explore creators</button>
        </div>
      `;
      $("btnExploreMore")?.addEventListener("click", () => {
        feedTab = "foryou";
        $("tabForYou")?.classList.add("on");
        $("tabFollowing")?.classList.remove("on");
        renderGallery();
      });
      return;
    }
    el.innerHTML = '<div class="empty" style="grid-column:1/-1">Nothing here yet 🌙<br>Be the first to post!</div>';
    return;
  }

  if (el.classList.contains("p3")) {
    list.forEach(p => el.appendChild(makeCard(p)));
  } else {
    populateMasonry(list, el);
  }
}

let pinResizeTimer;
window.addEventListener("resize", () => {
  clearTimeout(pinResizeTimer);
  pinResizeTimer = setTimeout(() => {
    if (ready && !$("home")?.classList.contains("hide")) {
      renderGallery();
    }
  }, 200);
});

function makeCard(p){
  if (!p || !p.id) return null; 
  const images = getPostImages(p);
  if (!images || !images.length || !images[0]) return null;

  const c = document.createElement("div");
  c.className = "card pin-card";
  const types = getPostTypes(p);
  const isMulti = images.length > 1;

  c.innerHTML = `
    <div class="pin-image-wrap ${isMulti ? 'is-multi' : ''}">
      ${isMulti ? `
        <div class="pin-multi-badge" title="Multiple photos (${images.length})">
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.3" stroke-linecap="round" stroke-linejoin="round">
            <rect x="8" y="8" width="13" height="13" rx="2"></rect>
            <path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2"></path>
          </svg>
          <span class="pin-multi-count">${images.length}</span>
        </div>
        <div class="pin-carousel-track" data-track>
          ${images.map((url, i) => (types[i] === "video" || url.endsWith(".mp4")) ? `
            <video class="pic pin-slide" src="${url}" preload="metadata" muted playsinline data-idx="${i}"></video>
          ` : `
            <img class="pic pin-slide" loading="${i===0?'eager':'lazy'}" src="${url}" alt="${esc(p.caption||"")}" data-idx="${i}">
          `).join("")}
        </div>
        <div class="pin-dots">
          ${images.map((_, i) => `<span class="pin-dot ${i===0?'on':''}"></span>`).join("")}
        </div>
      ` : ((types[0] === "video" || (images[0]||"").endsWith(".mp4")) ? `
        <div class="pin-video-badge" title="Video">
          <svg width="11" height="11" viewBox="0 0 24 24" fill="currentColor"><polygon points="6 3 20 12 6 21 6 3"></polygon></svg>
          <span>Video</span>
        </div>
        <video class="pic" src="${images[0] || imgUrl(p.id)}" preload="metadata" muted playsinline></video>
      ` : `
        <img class="pic" loading="lazy" src="${images[0] || imgUrl(p.id)}" alt="${esc(p.caption||"")}">
      `)}
    </div>
  `;
  
  if (isMulti) {
    const track = c.querySelector("[data-track]");
    const dots = c.querySelectorAll(".pin-dot");
    let isSwiping = false, startX = 0;
    
    if (track) {
      track.addEventListener("scroll", () => {
        const idx = Math.round(track.scrollLeft / track.clientWidth);
        dots.forEach((dot, i) => dot.classList.toggle("on", i === idx));
      }, { passive: true });

      track.addEventListener("touchstart", e => {
        isSwiping = false;
        startX = e.touches[0].clientX;
      }, { passive: true });

      track.addEventListener("touchmove", e => {
        const diffX = Math.abs(e.touches[0].clientX - startX);
        if (diffX > 12) isSwiping = true;
      }, { passive: true });
    }

    c.onclick = () => {
      if (isSwiping) { isSwiping = false; return; }
      openPostView(p);
    };
  } else {
    c.onclick = () => openPostView(p);
  }

  const primaryMedia = c.querySelector(".pic");
  if (primaryMedia) {
    primaryMedia.onerror = () => c.remove();
  }
  
  return c;
}

function fullView(p){
  const targetUrl = p.mediaUrl || (Array.isArray(p.mediaUrls) && p.mediaUrls[0]) || imgUrl(p.id);
  const isVideo = targetUrl.endsWith(".mp4") || p.fileType === "video";
  const v = document.createElement("div");
  v.className = "fv";
  v.innerHTML = `
    ${isVideo ? `<video src="${targetUrl}" controls autoplay playsinline style="max-width:94vw;max-height:88vh"></video>` : `<img src="${targetUrl}" alt="">`}
    <button class="ib" aria-label="Close">${IC.x}</button>
    <div class="fvc"><b>${esc(p.username)}</b>${p.caption?`<span>${esc(p.caption)}</span>`:""}</div>
  `;
  v.onclick = () => { v.classList.add("out"); setTimeout(() => v.remove(), 180); };
  document.body.appendChild(v);
  v.querySelector("img, video")?.addEventListener("click", e => e.stopPropagation());
}

function openPostView(p){
 const own=!guest&&me.uid===p.uid;
 const liked=isLiked(p.id);
 const likeCount=getPostLikes(p.id);
 const cmCount=(p.comments||[]).length;
 const otherPosts=posts.filter(x=>x.id&&x.id!=p.id);
 const images=getPostImages(p);
 const types=getPostTypes(p);
 const isMulti=images.length > 1;
 let currentSlide=0;

 const o=document.createElement("div");o.className="ov pv";
 const cleanTags=(p.tags||"").replace(/__album:[^_\s]+__/g,"");
 const rawTags=cleanTags.split(/[\s,]+/).filter(Boolean).filter(t=>!t.startsWith("__"));
 const tags=rawTags.map(t=>`<button type="button" class="pv-tag-btn tag">${esc(t.startsWith("#")?t:"#"+t)}</button>`).join("");

 o.innerHTML=`<div class="sheet g pvs">
   <div class="pv-card">
     ${isMulti ? `
       <div class="pvi pv-carousel-container">
         <div class="pv-carousel-viewport" id="pvViewport">
           ${images.map((url, i) => `
             <div class="pv-slide" data-idx="${i}">
               ${(types[i] === "video" || url.endsWith(".mp4")) ? `
                 <video class="big" src="${url}" controls playsinline preload="metadata"></video>
               ` : `
                 <img class="big" src="${url}" alt="${esc(p.caption||"")}" loading="${i===0?'eager':'lazy'}">
               `}
             </div>
           `).join("")}
         </div>
         <div class="pv-carousel-counter" id="pvCounter">1 / ${images.length}</div>
         <button class="ib pv-close-btn" data-x aria-label="Close">${IC.x}</button>
         <button class="pv-nav-arrow pv-nav-prev hide" id="pvPrev" aria-label="Previous photo">
           <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="15 18 9 12 15 6"></polyline></svg>
         </button>
         <button class="pv-nav-arrow pv-nav-next" id="pvNext" aria-label="Next photo">
           <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="9 18 15 12 9 6"></polyline></svg>
         </button>
         <div class="pv-carousel-dots" id="pvDots">
           ${images.map((_, i) => `<span class="pv-dot ${i === 0 ? 'active' : ''}" data-dot="${i}"></span>`).join("")}
         </div>
       </div>
     ` : `
       <div class="pvi">
         ${(types[0] === "video" || (images[0]||"").endsWith(".mp4")) ? `
           <video class="big" src="${images[0] || imgUrl(p.id)}" controls playsinline></video>
         ` : `
           <img class="big" src="${images[0] || imgUrl(p.id)}" alt="${esc(p.caption||"")}">
         `}
         <button class="ib pv-close-btn" data-x aria-label="Close">${IC.x}</button>
       </div>
     `}
     <div class="pv-body">
       <div class="pv-headline-row">
         <div class="pv-user-info">
           <span data-a class="clickable-user">${av(p.username,"","m")}</span>
           <div class="clickable-user" style="cursor:pointer">
             <h2 class="pv-username"><b>${esc(p.username)}</b></h2>
             ${p.date&&!isNaN(new Date(p.date))?`<small class="pv-date">${new Date(p.date).toLocaleDateString(undefined,{day:"numeric",month:"short",year:"numeric"})}</small>`:""}
           </div>
           ${(!guest && me && me.uid !== p.uid) ? `
             <button type="button" class="btn-follow ${isFollowing(p.uid) ? 'following' : ''}" id="pvFollowBtn">
               <span>${isFollowing(p.uid) ? 'Following' : 'Follow'}</span>
             </button>
           ` : ""}
         </div>
         <div class="pv-action-icons">
           <button class="btn sq pv-action-btn pv-like-btn ${liked?'liked':''}" id="pvLike" title="Like post" aria-label="Like">
             <svg class="ic pv-heart-ic" viewBox="0 0 24 24"><path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"/></svg>
             <span class="pv-count-badge" id="pvLikeCount">${likeCount||""}</span>
           </button>
           <button class="btn sq pv-action-btn pv-comment-toggle-btn" id="pvCommentToggle" title="Comments" aria-label="Comments">
             ${IC.chat}
             <span class="pv-count-badge" id="pvCommentCount">${cmCount||""}</span>
           </button>
           <button class="btn sq" id="vw" title="View full" aria-label="View full">${IC.expand}</button>
           <button class="btn sq" id="dl" title="Download" aria-label="Download">${IC.dl}</button>
           ${own?`<button class="btn sq" id="ed" title="Edit post" aria-label="Edit post">${IC.edit}</button><button class="btn sq dng" id="de" title="Delete post" aria-label="Delete post">${IC.trash}</button>`:""}
         </div>
       </div>
       <div class="pv-caption-text" id="cap">${esc(p.caption||"")}</div>
       ${tags?`<div class="pv-hashtags-group" id="tg">${tags}</div>`:""}
       <div class="pv-comments-section hide" id="pvCommentsSection">
         <div class="pv-comments-header">Comments (<span id="cmHeaderCount">${cmCount}</span>)</div>
         <div id="cms" class="pv-comments-container"></div>
         <div class="row pv-add-comment-row">
           <input class="in" id="ci" placeholder="${guest?"Log in to comment":"Write a comment…"}" ${guest?"disabled":""}>
           <button class="btn pri" id="cs" ${guest?"disabled":""}>Send</button>
         </div>
       </div>
       ${otherPosts.length?`
         <div class="pv-more-section">
           <div class="pv-more-header">
             <span class="pv-more-title">More to explore</span>
             <span class="pv-more-hint">Tap to view</span>
           </div>
           <div class="pv-more-grid">
             ${otherPosts.slice(0,12).map(op=>`
               <div class="pv-more-item" data-more-id="${op.id}">
                 <img src="${(Array.isArray(op.mediaUrls)&&op.mediaUrls[0]?fullUrl(op.mediaUrls[0]):imgUrl(op.id))}" alt="${esc(op.caption||"")}" loading="lazy">
               </div>
             `).join("")}
           </div>
         </div>
       `:""}
     </div>
   </div>
 </div>`;

 document.body.appendChild(o);const $$=s=>o.querySelector(s);
 getUserProfile(p.uid).then(u=>{if(u){$$("[data-a]").innerHTML=av(u.username,u.profilePic,"m");$$("b").textContent=u.username}});
 const cm=l=>{$$("#cms").innerHTML=(l||[]).length?l.map(c=>`<div class="cm"><b>${esc(c.username)}</b> ${esc(c.text)}</div>`).join(""):'<div class="empty" style="padding:10px">No comments yet. Start the conversation.</div>'};cm(p.comments);
 o.onclick=e=>{if(e.target===o||e.target.dataset.x!==undefined)o.remove();if(e.target.classList.contains("tag")){$("q").value=e.target.textContent;nav("home");renderGallery();o.remove()}};

 $$("#pvFollowBtn")?.addEventListener("click", async e => {
   e.stopPropagation();
   const btn = e.currentTarget;
   btn.disabled = true;
   const nowFollowing = await toggleFollow(p.uid, p.username);
   btn.classList.toggle("following", nowFollowing);
   btn.innerHTML = `<span>${nowFollowing ? "Following" : "Follow"}</span>`;
   btn.disabled = false;
 });

 o.querySelectorAll(".clickable-user").forEach(el => {
   el.addEventListener("click", e => {
     e.stopPropagation();
     o.remove();
     nav("profile");
     openProfile(p.uid);
   });
 });

 if(isMulti){
   const vp = $$("#pvViewport");
   const counter = $$("#pvCounter");
   const prevBtn = $$("#pvPrev");
   const nextBtn = $$("#pvNext");
   const dots = o.querySelectorAll(".pv-dot");

   const updateCarouselUI = () => {
     if(counter) counter.textContent = `${currentSlide + 1} / ${images.length}`;
     if(prevBtn) prevBtn.classList.toggle("hide", currentSlide === 0);
     if(nextBtn) nextBtn.classList.toggle("hide", currentSlide === images.length - 1);
     dots.forEach((d, i) => d.classList.toggle("active", i === currentSlide));
   };

   const goToSlide = idx => {
     currentSlide = Math.max(0, Math.min(images.length - 1, idx));
     if(vp) vp.scrollTo({ left: currentSlide * vp.clientWidth, behavior: "smooth" });
     updateCarouselUI();
   };

   if(vp){
     vp.addEventListener("scroll", () => {
       const idx = Math.round(vp.scrollLeft / vp.clientWidth);
       if(idx !== currentSlide && idx >= 0 && idx < images.length){
         currentSlide = idx;
         updateCarouselUI();
       }
     }, { passive: true });
   }

   if(prevBtn) prevBtn.onclick = e => { e.stopPropagation(); goToSlide(currentSlide - 1); };
   if(nextBtn) nextBtn.onclick = e => { e.stopPropagation(); goToSlide(currentSlide + 1); };
   dots.forEach(d => {
     d.onclick = e => {
       e.stopPropagation();
       goToSlide(parseInt(d.getAttribute("data-dot"), 10));
     };
   });
 }

 $$("#dl").onclick=e=>busy(e.target,async()=>{
   const targetImgUrl = images[currentSlide] || imgUrl(p.id);
   const b=await(await fetch(targetImgUrl)).blob();
   const a=document.createElement("a");
   a.href=URL.createObjectURL(b);
   a.download=(p.username||"post")+"_"+(currentSlide+1)+".jpg";
   a.click();
   setTimeout(()=>URL.revokeObjectURL(a.href),4000);
 });

 $$("#vw").onclick=()=>fullView({ ...p, mediaUrl: images[currentSlide] || imgUrl(p.id) });
 if(!isMulti){
   $$(".pvi img, .pvi video")?.addEventListener("click", ()=>fullView({ ...p, mediaUrl: images[0] || imgUrl(p.id) }));
 }else{
   o.querySelectorAll(".pv-slide img, .pv-slide video").forEach(el=>{
     el.onclick=()=>fullView({ ...p, mediaUrl: images[currentSlide] || imgUrl(p.id) });
   });
 }

 $$("#pvCommentToggle").onclick=()=>{
   const sec=$$("#pvCommentsSection"),btn=$$("#pvCommentToggle");
   const isHidden=sec.classList.toggle("hide");
   btn.classList.toggle("active",!isHidden);
   if(!isHidden){setTimeout(()=>{$$("#ci")?.focus();sec.scrollIntoView({behavior:"smooth",block:"nearest"})},60)}
 };
 $$("#pvLike").onclick=()=>{
   const res=togglePostLike(p.id),likeBtn=$$("#pvLike");
   likeBtn.classList.toggle("liked",res.liked);
   $$("#pvLikeCount").textContent=res.count||"";
   likeBtn.classList.add("pop");
   setTimeout(()=>likeBtn.classList.remove("pop"),300);
   say(res.liked?"Liked ❤️":"Unliked");
 };
 o.querySelectorAll(".pv-more-item").forEach(item=>{
   item.onclick=e=>{
     e.stopPropagation();
     const targetId=item.getAttribute("data-more-id");
     const nextPost=posts.find(x=>x.id==targetId);
     if(nextPost){o.remove();openPostView(nextPost)}
   };
 });
 $$("#cs").onclick=e=>busy(e.target,async()=>{
   if(!canAct())return;
   const t=$$("#ci").value.trim();if(!t)return;
   const r=await fetch(W+"/comment/"+p.id,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({text:t,username:me.username})});
   const j=await r.json();if(!j.success)throw Error();
   p.comments=j.comments;cm(j.comments);$$("#ci").value="";
   const count=(p.comments||[]).length;
   if($$("#pvCommentCount"))$$("#pvCommentCount").textContent=count||"";
   if($$("#cmHeaderCount"))$$("#cmHeaderCount").textContent=count;
 });
 if(own){
   $$("#de").onclick=e=>{
     if(!confirm("Delete this post?"))return;
     busy(e.target,async()=>{
       const r=await fetch(W+"/delete/"+p.id,{method:"DELETE"});
       if(!(await r.json()).success)throw Error();
       posts=posts.filter(x=>x.id!=p.id);
       o.remove();
       renderGallery();
       if(!$("profile").classList.contains("hide"))openProfile();
       say("Post deleted.");
     });
   };
   $$("#ed").onclick=()=>dlg("Edit post",`<label class="composer-label" for="ec">Caption</label><div class="tag-editor"><div class="tag-highlight" aria-hidden="true"></div><textarea class="in hashtag-input" id="ec" rows="3">${esc(p.caption||"")}</textarea></div><label class="composer-label" for="et">Topics</label><div class="tag-editor"><div class="tag-highlight" aria-hidden="true"></div><input class="in hashtag-input" id="et" value="${esc(cleanTags||"")}"></div>`,"Save",async d=>{
     const caption=d.querySelector("#ec").value.trim(),tagsInput=normTags(d.querySelector("#et").value);
     const albumMatch=(p.tags||"").match(/__album:[^_\s]+__/);
     const finalTags=albumMatch ? (tagsInput ? `${tagsInput} ${albumMatch[0]}` : albumMatch[0]) : tagsInput;
     await updateDoc(doc(db,"posts",p.id),{caption,tags:finalTags});
     p.caption=caption;p.tags=finalTags;
     if($$("#cap"))$$("#cap").textContent=caption;
     const updatedRaw=tagsInput.split(/[\s,]+/).filter(Boolean);
     if($$("#tg"))$$("#tg").innerHTML=updatedRaw.map(t=>`<button type="button" class="pv-tag-btn tag">${esc(t.startsWith("#")?t:"#"+t)}</button>`).join("");
     renderGallery();
   });
 }
}

const normTags=s=>s.split(/[\s,]+/).filter(Boolean).map(t=>t[0]=="#"?t:"#"+t).join(" ");

function openUpload(){
  if(guest){say("Guest mode: You can only view and download images. Log in to post.");return}
  if(!canAct())return;
  
  let modeType="single"; // "single" or "multi"
  let filesList=[];      // Array of File objects (max 10)
  let activePreviewIdx=0;

  const dialog=dlg("Create a post",`
    <div class="post-composer">
      <!-- Mode Toggle: Single or Multiple (up to 10) -->
      <div class="upload-mode-pill">
        <button type="button" class="upload-mode-btn on" id="umSingle">
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect><circle cx="8.5" cy="8.5" r="1.5"></circle><polyline points="21 15 16 10 5 21"></polyline></svg>
          <span>Photo / Video</span>
        </button>
        <button type="button" class="upload-mode-btn" id="umMulti">
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="8" y="8" width="13" height="13" rx="2"></rect><path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2"></path></svg>
          <span>Multiple (Up to 10)</span>
        </button>
      </div>

      <!-- File Drop / Picker Area -->
      <label class="upload-drop" for="uf" id="uDropZone">
        <input class="in" id="uf" type="file" multiple accept="image/*,video/*,.mp4,.mov,.webm,.mkv">
        <span class="upload-icon">${IC.plus}</span>
        <b id="uDropTitle">Choose photo or video</b>
        <small id="uDropSub">JPG, PNG, WEBP, MP4, MOV · up to 25 MB</small>
        <img class="upload-preview hide" id="uMainPreview" alt="Selected preview">
        <video class="upload-preview hide" id="uMainVideoPreview" playsinline muted autoplay loop></video>
      </label>

      <!-- Thumbnails Strip (shown when photos selected) -->
      <div class="upload-thumbs-container hide" id="uThumbsWrap">
        <div class="upload-thumbs-header">
          <span>Selected media (tap to preview)</span>
          <span class="upload-counter-badge" id="uCounterBadge">0 / 10</span>
        </div>
        <div class="upload-thumbs-strip" id="uThumbsStrip"></div>
      </div>

      <!-- Hidden extra input for "+ Add more" -->
      <input type="file" id="ufMore" multiple accept="image/*,video/*,.mp4,.mov,.webm,.mkv" class="hide">

      <label class="composer-label" for="uc">Caption</label>
      <div class="tag-editor">
        <div class="tag-highlight" aria-hidden="true"></div>
        <textarea class="in hashtag-input" id="uc" rows="3" placeholder="Write a caption... Add #hashtags"></textarea>
      </div>

      <label class="composer-label" for="ut">Topics</label>
      <div class="tag-editor">
        <div class="tag-highlight" aria-hidden="true"></div>
        <input class="in hashtag-input" id="ut" placeholder="#nature #art #travel">
      </div>
      <small class="composer-hint">Hashtags are highlighted as you type.</small>

      <!-- Real-time Upload Progress Bar -->
      <div class="upload-progress-wrap hide" id="uProgWrap">
        <div class="upload-progress-info">
          <span id="uProgStatus">Uploading...</span>
          <span id="uProgPercent">0%</span>
        </div>
        <div class="upload-progress-track">
          <div class="upload-progress-bar" id="uProgBar" style="width: 0%"></div>
        </div>
        <small class="upload-progress-detail" id="uProgDetail">0 MB / 0 MB</small>
      </div>
    </div>
  `,`Share post`,async d=>{
    if(!filesList.length){say("Choose at least one photo or video.");return false}
    for(const f of filesList){
      if(f.size > 25e6){say(`"${f.name}" is over 25MB. Please choose a smaller file.`);return false}
    }

    const caption=d.querySelector("#uc").value.trim();
    const tags=normTags(d.querySelector("#ut").value);
    const okBtn=d.querySelector("[data-ok]");
    const cancelBtn=d.querySelector("[data-x]");

    const progWrap=d.querySelector("#uProgWrap");
    const progStatus=d.querySelector("#uProgStatus");
    const progPercent=d.querySelector("#uProgPercent");
    const progBar=d.querySelector("#uProgBar");
    const progDetail=d.querySelector("#uProgDetail");

    if(progWrap) progWrap.classList.remove("hide");
    if(okBtn) okBtn.setAttribute("disabled", "true");
    if(cancelBtn) cancelBtn.style.display = "none";

    try{
      await upload(filesList, {
        caption,
        tags,
        onProgress: (pct, loaded, total) => {
          if(progBar) progBar.style.width = pct + "%";
          if(progPercent) progPercent.textContent = pct + "%";
          if(progStatus){
            progStatus.textContent = pct >= 100 
              ? "Saving & processing on cloud…" 
              : (filesList.length > 1 ? `Uploading ${filesList.length} items…` : "Uploading…");
          }
          if(progDetail && loaded && total){
            const mbLoaded = (loaded / (1024 * 1024)).toFixed(1);
            const mbTotal = (total / (1024 * 1024)).toFixed(1);
            progDetail.textContent = `${mbLoaded} MB / ${mbTotal} MB (${pct}%)`;
          }
          if(okBtn){
            okBtn.textContent = pct >= 100 ? "Processing…" : `Uploading ${pct}%`;
          }
        }
      });

      say(filesList.length > 1 ? `Carousel of ${filesList.length} items uploaded ✓` : "Post uploaded ✓");
      await loadImages();
    }catch(err){
      if(progWrap) progWrap.classList.add("hide");
      if(okBtn) okBtn.removeAttribute("disabled");
      if(cancelBtn) cancelBtn.style.display = "";
      throw err;
    }
  });

  const dropZone=dialog.querySelector("#uDropZone");
  const dropTitle=dialog.querySelector("#uDropTitle");
  const dropSub=dialog.querySelector("#uDropSub");
  const mainPreview=dialog.querySelector("#uMainPreview");
  const fileInput=dialog.querySelector("#uf");
  const fileMoreInput=dialog.querySelector("#ufMore");
  const thumbsWrap=dialog.querySelector("#uThumbsWrap");
  const thumbsStrip=dialog.querySelector("#uThumbsStrip");
  const counterBadge=dialog.querySelector("#uCounterBadge");
  const btnSingle=dialog.querySelector("#umSingle");
  const btnMulti=dialog.querySelector("#umMulti");

  const mainVideoPreview=dialog.querySelector("#uMainVideoPreview");

  function setUploadMode(m){
    modeType=m;
    btnSingle.classList.toggle("on", m === "single");
    btnMulti.classList.toggle("on", m === "multi");
    if(m === "single"){
      fileInput.removeAttribute("multiple");
      dropTitle.textContent=filesList.length ? filesList[0].name : "Choose a photo or video";
      dropSub.textContent="Single file · JPG, PNG, WEBP, MP4";
      if(filesList.length > 1){
        filesList=[filesList[0]];
      }
    }else{
      fileInput.setAttribute("multiple","multiple");
      dropTitle.textContent=filesList.length ? `${filesList.length} items selected` : "Choose up to 10 photos or videos";
      dropSub.textContent="Tap to select multiple (max 10)";
    }
    renderThumbs();
  }

  btnSingle.onclick=()=>setUploadMode("single");
  btnMulti.onclick=()=>setUploadMode("multi");

  function addFiles(newFiles){
    const list=Array.from(newFiles).filter(f=>f.type.startsWith("image/") || f.type.startsWith("video/"));
    if(!list.length) return;
    if(modeType === "single"){
      filesList=[list[0]];
      activePreviewIdx=0;
    }else{
      const remaining=10 - filesList.length;
      if(remaining <= 0){
        say("Maximum 10 items reached.");
        return;
      }
      if(list.length > remaining){
        say(`Only ${remaining} more item(s) added (max 10).`);
      }
      filesList=[...filesList, ...list.slice(0, remaining)];
    }
    renderThumbs();
  }

  function renderThumbs(){
    if(!filesList.length){
      dropZone.classList.remove("has-image");
      mainPreview.classList.add("hide");
      if(mainVideoPreview) mainVideoPreview.classList.add("hide");
      thumbsWrap.classList.add("hide");
      dropTitle.textContent=modeType === "single" ? "Choose a photo or video" : "Choose up to 10 photos or videos";
      dropSub.textContent=modeType === "single" ? "JPG, PNG, WEBP, MP4 · up to 15 MB" : "Tap to select multiple (max 10)";
      return;
    }

    dropZone.classList.add("has-image");
    if(activePreviewIdx >= filesList.length) activePreviewIdx=filesList.length - 1;
    const curFile = filesList[activePreviewIdx];
    const isVid = curFile && curFile.type.startsWith("video/");

    if(isVid){
      mainPreview.classList.add("hide");
      if(mainVideoPreview){
        mainVideoPreview.classList.remove("hide");
        mainVideoPreview.src=URL.createObjectURL(curFile);
      }
    }else{
      if(mainVideoPreview) mainVideoPreview.classList.add("hide");
      mainPreview.classList.remove("hide");
      mainPreview.src=URL.createObjectURL(curFile);
    }

    if(modeType === "multi" || filesList.length > 1){
      thumbsWrap.classList.remove("hide");
      counterBadge.textContent=`${filesList.length} / 10`;
      thumbsStrip.innerHTML="";

      filesList.forEach((file, idx) => {
        const item=document.createElement("div");
        item.className=`upload-thumb-item ${idx === activePreviewIdx ? 'active' : ''}`;
        const fileIsVid = file.type.startsWith("video/");
        item.innerHTML=`
          ${fileIsVid ? `<video src="${URL.createObjectURL(file)}" preload="metadata" muted playsinline></video>` : `<img src="${URL.createObjectURL(file)}" alt="">`}
          <span class="upload-thumb-badge">${idx + 1}</span>
          <button type="button" class="upload-thumb-remove" title="Remove" aria-label="Remove">&times;</button>
        `;
        item.onclick=e=>{
          if(e.target.closest(".upload-thumb-remove")){
            e.stopPropagation();
            filesList.splice(idx, 1);
            if(activePreviewIdx >= filesList.length) activePreviewIdx=Math.max(0, filesList.length - 1);
            renderThumbs();
            return;
          }
          activePreviewIdx=idx;
          renderThumbs();
        };
        thumbsStrip.appendChild(item);
      });

      if(filesList.length < 10){
        const addBtn=document.createElement("button");
        addBtn.type="button";
        addBtn.className="upload-add-more-btn";
        addBtn.innerHTML=`
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg>
          <span>Add</span>
        `;
        addBtn.onclick=e=>{
          e.stopPropagation();
          fileMoreInput.click();
        };
        thumbsStrip.appendChild(addBtn);
      }
    }else{
      thumbsWrap.classList.add("hide");
      dropTitle.textContent=filesList[0].name;
      dropSub.textContent="Tap to choose a different file";
    }
  }

  fileInput.addEventListener("change",()=>{
    if(fileInput.files?.length){
      addFiles(fileInput.files);
      fileInput.value="";
    }
  });

  fileMoreInput.addEventListener("change",()=>{
    if(fileMoreInput.files?.length){
      addFiles(fileMoreInput.files);
      fileMoreInput.value="";
    }
  });

  setupHashtagFields(dialog);
}

function setupHashtagFields(root){
 root.querySelectorAll(".hashtag-input").forEach(input=>{
  const layer=input.parentElement.querySelector(".tag-highlight");
  const paint=()=>{layer.innerHTML=esc(input.value).replace(/(^|\s)(#[\p{L}\p{N}_]+)/gu,'$1<span>$2</span>')+"\n";layer.scrollTop=input.scrollTop};
  input.addEventListener("input",paint);input.addEventListener("scroll",()=>{layer.scrollTop=input.scrollTop;layer.scrollLeft=input.scrollLeft});paint();
 });
}

document.addEventListener("click",event=>{
 const button=event.target.closest("#ed");if(!button)return;
 requestAnimationFrame(()=>{const modal=[...document.querySelectorAll(".ov")].at(-1);if(modal)setupHashtagFields(modal)})
});

/* USER LIST DIALOG (Followers / Following) */
async function showUserListDialog(title, uids = []) {
  if (!uids || !uids.length) {
    dlg(title, `<div class="empty" style="padding:28px 16px">No users yet.</div>`, "Close", () => true);
    return;
  }
  const modalContent = document.createElement("div");
  modalContent.className = "user-list-modal";
  modalContent.innerHTML = `<div class="sp"></div>`;

  dlg(title, modalContent, "Done", () => true);

  const users = await Promise.all(uids.map(uid => getUserProfile(uid)));
  modalContent.innerHTML = "";

  const validUsers = users.filter(Boolean);
  if (!validUsers.length) {
    modalContent.innerHTML = `<div class="empty" style="padding:24px 16px">No users found.</div>`;
    return;
  }

  users.forEach((u, i) => {
    if (!u) return;
    const uid = uids[i];
    const isMe = me && me.uid === uid;
    const item = document.createElement("div");
    item.className = "user-list-item";
    item.innerHTML = `
      <div class="user-info">
        <span class="user-av">${av(u.username, u.profilePic, "m")}</span>
        <div class="user-text">
          <div class="user-name"><b>${esc(u.username)}</b></div>
        </div>
      </div>
      ${(!guest && me && !isMe) ? `
        <button type="button" class="btn-follow ${isFollowing(uid) ? 'following' : ''}" data-uid="${uid}">
          <span>${isFollowing(uid) ? 'Following' : 'Follow'}</span>
        </button>
      ` : ""}
    `;

    item.querySelector(".user-info").addEventListener("click", () => {
      document.querySelectorAll(".ov:not(.pv)").forEach(o => o.remove());
      nav("profile");
      openProfile(uid);
    });

    const followBtn = item.querySelector(".btn-follow");
    if (followBtn) {
      followBtn.addEventListener("click", async e => {
        e.stopPropagation();
        followBtn.disabled = true;
        const nowFollowing = await toggleFollow(uid, u.username);
        followBtn.classList.toggle("following", nowFollowing);
        followBtn.innerHTML = `<span>${nowFollowing ? 'Following' : 'Follow'}</span>`;
        followBtn.disabled = false;
      });
    }

    modalContent.appendChild(item);
  });
}

/* PROFILE */
async function openProfile(targetUid){
  const el=$("profile");
  if(guest && (!targetUid || (me && targetUid === me.uid))){
    el.innerHTML=`<div class="card g" style="padding:20px;gap:12px;cursor:default;align-items:center;text-align:center">${av(me?.username||"guest","","l")}<h3>${esc(me?.username||"Guest")}</h3><div style="color:var(--m)">Guest mode — log in to use chat and profile.</div><button class="btn pri" id="gl">Login / Signup</button></div>`;
    $("gl").onclick=()=>{guest=false;me=null;ready=false;$("app").classList.add("hide");$("auth").classList.remove("hide")};
    return;
  }

  const isOther = Boolean(targetUid && me && targetUid !== me.uid);
  const currentUid = isOther ? targetUid : me?.uid;
  const user = isOther ? (await getUserProfile(targetUid)) : me;
  if (!user) {
    el.innerHTML = `<div class="empty" style="padding:40px">User not found.</div>`;
    return;
  }

  const userPosts = posts.filter(p => p.uid == currentUid);
  const followersList = user.followers || [];
  const followingList = isOther ? (user.following || []) : Array.from(getFollowing());

  el.innerHTML = `
    <div class="card g profile-card">
      ${isOther ? `
        <div style="margin-bottom:8px">
          <button type="button" class="btn" id="pBackBtn" style="padding:0 12px;height:34px;font-size:13px;border-radius:999px">
            ← Back
          </button>
        </div>
      ` : ""}
      <div class="row">
        ${av(user.username, user.profilePic, "l")}
        <div style="min-width:0">
          <h3>@${esc(user.username)}</h3>
          ${user.email ? `<div style="color:var(--m);overflow:hidden;text-overflow:ellipsis">${esc(user.email)}</div>` : ""}
        </div>
      </div>

      <!-- Instagram Stats Row: Posts | Followers | Following -->
      <div class="ig-stats">
        <div class="stat-box">
          <span class="stat-num">${userPosts.length}</span>
          <span class="stat-label">Posts</span>
        </div>
        <div class="stat-box clickable" id="pStatFollowers">
          <span class="stat-num" id="pFollowersCount">${followersList.length}</span>
          <span class="stat-label">Followers</span>
        </div>
        <div class="stat-box clickable" id="pStatFollowing">
          <span class="stat-num" id="pFollowingCount">${followingList.length}</span>
          <span class="stat-label">Following</span>
        </div>
      </div>

      ${isOther ? `
        <div class="profile-actions" style="margin-top:14px;display:flex;gap:10px">
          <button type="button" class="btn-follow big ${isFollowing(targetUid) ? 'following' : ''}" id="pFollowBtn" style="flex:1">
            <span>${isFollowing(targetUid) ? 'Following' : 'Follow'}</span>
          </button>
          <button type="button" class="btn pri" id="pMsgBtn" style="flex:1">
            <span>Message</span>
          </button>
        </div>
      ` : `
        <div class="profile-actions">
          <button class="btn" id="cu">Change username</button>
          <button class="btn" id="cp">Change photo</button>
          ${me.pw ? '<button class="btn" id="cw">Change password</button>' : ""}
        </div>
        <button class="btn pri wide" id="lo"><span>Logout</span><i>${IC.out}</i></button>
      `}
    </div>

    <h3 class="profile-heading">${isOther ? `@${esc(user.username)}'s posts` : 'My posts'} <span>${userPosts.length}</span></h3>
    <div class="grid p3" id="mg"></div>
  `;

  renderGallery(userPosts, $("mg"));

  $("pStatFollowers")?.addEventListener("click", () => showUserListDialog("Followers", followersList));
  $("pStatFollowing")?.addEventListener("click", () => showUserListDialog("Following", followingList));

  if (isOther) {
    $("pBackBtn")?.addEventListener("click", () => {
      nav("home");
      renderGallery();
    });

    const followBtn = $("pFollowBtn");
    followBtn?.addEventListener("click", async () => {
      followBtn.disabled = true;
      const nowFollowing = await toggleFollow(targetUid, user.username);
      followBtn.classList.toggle("following", nowFollowing);
      followBtn.innerHTML = `<span>${nowFollowing ? 'Following' : 'Follow'}</span>`;
      const updatedUser = await getUserProfile(targetUid, true);
      if (updatedUser) {
        const fc = $("pFollowersCount");
        if (fc) fc.textContent = (updatedUser.followers || []).length;
      }
      followBtn.disabled = false;
    });

    $("pMsgBtn")?.addEventListener("click", () => openConv(targetUid));
  } else {
    $("lo").onclick = async () => { await signOut(auth); me = null; watching.clear(); chats.clear(); $("panel").classList.remove("open"); };
    $("cp").onclick = () => $("fDp").click();
    $("cw") && ($("cw").onclick = () => dlg("Change password", `<input class="in" id="p0" type="password" placeholder="Current password"><input class="in" id="p1" type="password" placeholder="New password (min 6 characters)"><input class="in" id="p2" type="password" placeholder="Confirm new password">`, "Update", async o => {
      const a = o.querySelector("#p0").value, b = o.querySelector("#p1").value, c = o.querySelector("#p2").value, u = auth.currentUser;
      if (!a || !b) { say("Fill in all fields."); return false; }
      if (b.length < 6) { say("New password must be at least 6 characters."); return false; }
      if (b !== c) { say("Passwords don't match."); return false; }
      if (a === b) { say("New password must be different."); return false; }
      try { await reauthenticateWithCredential(u, EmailAuthProvider.credential(u.email, a)); } catch (e) { if (/invalid-credential|wrong-password/.test(e.code || "")) { say("Current password is incorrect."); return false; } throw e; }
      await updatePassword(u, b); say("Password changed!");
    }));
    $("cu").onclick = () => dlg("Change username", `<input class="in" id="nn" placeholder="new username" autocapitalize="none"><div id="ne" style="color:var(--rd);font-size:13px"></div>`, "Change", async o => {
      const n = o.querySelector("#nn").value.trim().toLowerCase(), er = o.querySelector("#ne");
      if (!okName(n)) { er.textContent = "3-20 characters: a-z, 0-9, _ ."; return false; }
      if (n == me.username) return;
      if (!(await nameFree(n))) { er.textContent = "That username is taken."; return false; }
      await setDoc(doc(db, "usernames", n), { uid: me.uid, email: me.email || "", createdAt: serverTimestamp() });
      try { await deleteDoc(doc(db, "usernames", me.username)); } catch { }
      await updateDoc(doc(db, "users", me.uid), { username: n });
      me.username = n;
      await getUserProfile(me.uid, true);
      say("Username updated ✓");
      openProfile();
    });
  }
}
$("fDp").onchange=async e=>{const f=e.target.files[0];e.target.value="";if(!f||guest||!canAct())return;say("Uploading photo…");try{const id=await upload(f,{caption:"__dp__",tags:"__dp__"});me.profilePic=imgUrl(id);await updateDoc(doc(db,"users",me.uid),{profilePic:me.profilePic});await getUserProfile(me.uid,true);say("Photo updated ✓");openProfile()}catch(x){say(errMsg(x))}};

/* CHAT */
function panelList(){curChat=null;unsubMsgs?.();$("panel").innerHTML=`<div class="ph"><b style="flex:1;font-size:18px">Chats</b><button class="ib" id="px" aria-label="Close">${IC.x}</button></div><div style="padding:10px"><input class="in" id="us" placeholder="Search users by username…" autocapitalize="none"></div><div id="ur" style="padding:0 10px"></div><div id="cl" style="flex:1;overflow:auto;padding:6px"></div>`;
 $("px").onclick=closePanel;let t;$("us").oninput=e=>{clearTimeout(t);t=setTimeout(()=>searchUsers(e.target.value.trim().toLowerCase()),300)};renderChatList()}
async function searchUsers(q){const r=$("ur");if(!q){r.innerHTML="";return}try{const s=await onceDocs(query(collection(db,"usernames"),where(documentId(),">=",q),where(documentId(),"<=",q+"\uf8ff"),limit(8)));r.innerHTML="";const rows=s.filter(d=>d.data.uid!=me.uid);if(!rows.length)r.innerHTML='<div class="empty" style="padding:14px">No users found.</div>';
 for(const d of rows){const p=await getUserProfile(d.data.uid);const row=document.createElement("div");row.className="crow";row.innerHTML=`${av(d.id,p?.profilePic,"m")}<div class="tx"><div>@${esc(d.id)}</div></div>`;row.onclick=()=>openConv(d.data.uid);r.appendChild(row)}}catch{say("Search failed. Try again.")}}
const onceDocs=q=>new Promise((res,rej)=>{const u=onSnapshot(q,s=>{u();res(s.docs.map(d=>({id:d.id,data:d.data()})))},e=>{u();rej(e)})});
function renderChatList(){const el=$("cl");if(!el)return;const arr=[...chats.entries()].sort((a,b)=>ms(b[1].lastMessageTime)-ms(a[1].lastMessageTime));if(!arr.length){el.innerHTML='<div class="empty">No chats yet 💬<br>Search a username above to start chatting.</div>';return}
 el.innerHTML="";const s=seen();arr.forEach(([id,c])=>{const o=c.users.find(x=>x!=me.uid),row=document.createElement("div");row.className="crow";const unread=c.lastSender&&c.lastSender!=me.uid&&ms(c.lastMessageTime)>(s[id]||0);
 row.innerHTML=`<span data-a>${av(c.usernames?.[o],c.profilePics?.[o],"m")}</span><div class="tx"><div><b>${esc(c.usernames?.[o]||"user")}</b></div><div><small>${esc(c.lastMessage||"New chat")}</small></div></div>${unread?'<span class="ud"></span>':""}`;row.onclick=()=>openConv(o);el.appendChild(row);
 getUserProfile(o).then(u=>{if(u){row.querySelector("[data-a]").innerHTML=av(u.username,u.profilePic,"m");row.querySelector("b").textContent=u.username}})});}
function updBadge(){const s=seen(),unread=[...chats].some(([id,c])=>c.lastSender&&c.lastSender!=me.uid&&ms(c.lastMessageTime)>(s[id]||0));$("badge").classList.toggle("hide",!unread);$("deskBadge").classList.toggle("hide",!unread)}
function openPanel(){if(guest){say("Log in to use chat.");return}if(!canAct())return;panelOpen=true;$("panel").classList.add("open");curChat?openConv(curChat.other):panelList()}
function closePanel(){panelOpen=false;$("panel").classList.remove("open");unsubMsgs?.()}
function watchChat(id){if(watching.has(id))return;watching.add(id);onSnapshot(doc(db,"chats",id),s=>{if(!s.exists()||!me)return;const c=s.data(),first=!chats.has(id);chats.set(id,c);const t=ms(c.lastMessageTime);
 if(c.lastSender&&c.lastSender!=me.uid){if(curChat?.id==id&&panelOpen)setSeen(id,t);else if(t>T0&&!first||t>T0&&first){const o=c.users.find(x=>x!=me.uid);getUserProfile(o).then(u=>toast(`${av(u?.username||c.lastSenderName,u?.profilePic,"m")}<div><b>${esc(c.lastSenderName||"New message")}</b><div style="color:var(--m);font-size:13px">${esc(c.lastMessage)}</div></div>`,()=>{openPanel();openConv(o)}))}}
 renderChatList();updBadge()},()=>watching.delete(id))}
function startNotif(){me.contacts.forEach(u=>watchChat(cid(me.uid,u)));
 onSnapshot(query(collection(db,"chats"),where("users","array-contains",me.uid)),s=>s.docs.forEach(d=>watchChat(d.id)),()=>{})}
async function openConv(other){const id=cid(me.uid,other),op=await getUserProfile(other);if(!op){say("User not found.");return}
 try{const s=await getDoc(doc(db,"chats",id));if(!s.exists())await setDoc(doc(db,"chats",id),{users:[me.uid,other],usernames:{[me.uid]:me.username,[other]:op.username},profilePics:{[me.uid]:me.profilePic||"",[other]:op.profilePic||""},createdAt:serverTimestamp()});
 if(!me.contacts.includes(other)){me.contacts.push(other);await updateDoc(doc(db,"users",me.uid),{contacts:arrayUnion(other)})}}catch{say("Couldn't open chat.");return}
 watchChat(id);curChat={id,other};panelOpen=true;$("panel").classList.add("open");const el=$("panel");
 el.innerHTML=`<div class="ph"><button class="ib" id="bk" aria-label="Back">${IC.back}</button>${av(op.username,op.profilePic,"m")}<b style="flex:1">@${esc(op.username)}</b><button class="ib" id="px" aria-label="Close">${IC.x}</button></div><div id="msgs"></div><div class="cb"><button class="ib" id="at" aria-label="Attach image">${IC.clip}</button><input class="in" id="mi" placeholder="Write a message…" style="flex:1"><button class="btn pri" id="sd">Send</button></div>`;
 $("bk").onclick=panelList;$("px").onclick=closePanel;$("at").onclick=()=>$("fChat").click();$("sd").onclick=()=>sendMsg();$("mi").onkeydown=e=>{if(e.key=="Enter")sendMsg()};loadMsgs(id);$("mi").focus()}
function loadMsgs(id){unsubMsgs?.();unsubMsgs=onSnapshot(query(collection(db,"chats",id,"messages"),orderBy("createdAt")),s=>{const el=$("msgs");if(!el||curChat?.id!=id)return;el.innerHTML="";if(s.empty)el.innerHTML='<div class="empty">Send the first message 👋</div>';
 s.docs.forEach(d=>{const m=d.data(),own=m.from==me.uid,b=document.createElement("div");b.className="b"+(own?" me":"");const tm=m.createdAt?new Date(ms(m.createdAt)).toLocaleTimeString([],{hour:"2-digit",minute:"2-digit"}):"…";
 b.innerHTML=(m.imageUrl?`<img src="${esc(m.imageUrl)}" alt="">`:"")+(m.text?`<span>${esc(m.text)}</span>`:"")+`<small>${tm}${m.edited?" · edited":""}</small>`+(own?'<button class="mm" aria-label="Message options">'+IC.more+'</button>':"");
 if(own)b.querySelector(".mm").onclick=()=>msgMenu(id,d.id,m);el.appendChild(b)});el.scrollTop=el.scrollHeight;setSeen(id,Date.now());updBadge();renderChatList()},()=>say("Couldn't load messages."))}
function msgMenu(id,mid,m){const o=dlg("Message",`<button class="btn" data-ed ${m.text?"":"disabled"}>${IC.edit} Edit</button><button class="btn dng" data-del>${IC.trash} Delete</button>`,null);o.querySelector("[data-ed]").onclick=()=>{o.remove();dlg("Edit message",`<input class="in" id="et" value="${esc(m.text)}">`,"Save",async d=>{const t=d.querySelector("#et").value.trim();if(!t)return false;await updateDoc(doc(db,"chats",id,"messages",mid),{text:t,edited:true})})};
 o.querySelector("[data-del]").onclick=async()=>{o.remove();if(!confirm("Delete this message?"))return;try{await deleteDoc(doc(db,"chats",id,"messages",mid))}catch{say("Couldn't delete.")}}}
async function sendMsg(file){const inp=$("mi");if(!inp||!curChat||!canAct())return;const text=inp.value.trim();if(!text&&!file)return;const{id,other}=curChat;inp.value="";const btn=$("sd");
 try{let imageUrl="";if(file){say("Sending image…");imageUrl=imgUrl(await upload(file,{caption:"__chat__",tags:"__chat__"}))}
 const msg={text,from:me.uid,fromName:me.username,createdAt:serverTimestamp(),edited:false};if(imageUrl)msg.imageUrl=imageUrl;await addDoc(collection(db,"chats",id,"messages"),msg);
 const op=await getUserProfile(other);await setDoc(doc(db,"chats",id),{users:[me.uid,other],usernames:{[me.uid]:me.username,[other]:op?.username||""},profilePics:{[me.uid]:me.profilePic||"",[other]:op?.profilePic||""},lastMessage:text||"📷 Photo",lastMessageTime:serverTimestamp(),lastSender:me.uid,lastSenderName:me.username},{merge:true})}
 catch(e){inp.value=text;say(navigator.onLine?"Message not sent. Try again.":"You're offline — message not sent.")}}
$("fChat").onchange=e=>{const f=e.target.files[0];e.target.value="";if(f)sendMsg(f)};
function updVerify(){$("vb").classList.toggle("hide",guest||!me||me.verified!==false)}
$("vRe").onclick=()=>busy($("vRe"),async()=>{await sendEmailVerification(auth.currentUser);mailSent("verify")});
$("vOk").onclick=()=>busy($("vOk"),async()=>{await auth.currentUser.reload();me.verified=auth.currentUser.emailVerified;updVerify();say(me.verified?"Email verified ✓":"Not verified yet. Open the link in your email first.")});

/* NAV */
function nav(v){["Home","Search","Chat","Prof"].forEach(k=>$("n"+k).classList.remove("on"));$("home").classList.toggle("hide",v=="profile");$("profile").classList.toggle("hide",v!="profile");document.querySelectorAll(".desk-link").forEach(b=>b.classList.remove("active"));if(v=="profile"){$("nProf").classList.add("on");$("deskProf").classList.add("active");openProfile()}else{$("nHome").classList.add("on");$("deskHome").classList.add("active");if(v=="search"){$("nHome").classList.remove("on");$("nSearch").classList.add("on");$("deskHome").classList.remove("active");$("deskSearch").classList.add("active");$("main").scrollTop=0;$("q").focus()}}}
$("nHome").onclick=()=>{$("q").value="";nav("home");renderGallery()};$("nSearch").onclick=()=>nav("search");$("nPost").onclick=openUpload;$("nChat").onclick=()=>{document.querySelectorAll(".desk-link").forEach(b=>b.classList.remove("active"));$("deskChat").classList.add("active");openPanel()};$("chatBtn").onclick=()=>$("nChat").click();$("nProf").onclick=()=>nav("profile");
$("deskHome").onclick=()=>$("nHome").click();$("deskSearch").onclick=()=>$("nSearch").click();$("deskChat").onclick=()=>$("nChat").click();$("deskPost").onclick=()=>$("nPost").click();$("deskProf").onclick=()=>$("nProf").click();
$("q").oninput=()=>{nav("home");renderGallery()};
addEventListener("online",()=>{$("off").classList.add("hide");if(ready)loadImages()});addEventListener("offline",()=>$("off").classList.remove("hide"));if(!navigator.onLine)$("off").classList.remove("hide");
