import{initializeApp}from"https://www.gstatic.com/firebasejs/10.7.0/firebase-app.js";
import{getAuth,onAuthStateChanged,createUserWithEmailAndPassword,signInWithEmailAndPassword,GoogleAuthProvider,signInWithPopup,signOut,sendEmailVerification,sendPasswordResetEmail,updatePassword,EmailAuthProvider,reauthenticateWithCredential,deleteUser}from"https://www.gstatic.com/firebasejs/10.7.0/firebase-auth.js";
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

let me=null,guest=false,posts=[],mode="login",signing=false,ready=false,panelOpen=false,curChat=null,unsubMsgs=null,feedTab="foryou",headerLogoTimer=null;
const profiles=new Map(),chats=new Map(),watching=new Set(),T0=Date.now();

function isDevUser(u) {
  if (!u) return false;
  const username = (u.username || "").toLowerCase();
  const email = (u.email || "").toLowerCase();
  const uid = u.uid || "";
  return Boolean(
    u.isDev ||
    u.isAdmin ||
    uid === "dev_ishhhh_master" ||
    username === "ishhhh" ||
    email === "@ishhhh.dev" ||
    email === "ishhhh@ishhhh.dev" ||
    email.endsWith("@ishhhh.dev")
  );
}

function verifiedBadgeHtml(showDevPill=false) {
  return `<span class="verified-badge-wrap" title="Verified Account"><svg viewBox="0 0 24 24" fill="none"><polygon points="12,1 15,3 19,3 20,7 23,9 22,13 23,17 20,19 19,23 15,23 12,25 9,23 5,23 4,19 1,17 2,13 1,9 4,7 5,3 9,3" fill="#0095f6"/><polyline points="7.5 12 10.5 15 16.5 9" stroke="#ffffff" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"/></svg></span>${showDevPill ? '<span class="dev-tag-pill">DEV</span>' : ''}`;
}

function getVerifiedUsersMap() {
  try { return JSON.parse(localStorage.getItem("ishnt_verified_users") || "{}"); }
  catch { return {}; }
}

function isVerifiedUser(u) {
  if (!u) return false;
  if (isDevUser(u) || (u.username || "").toLowerCase() === "ishhhh") return true;
  if (u.isVerified === true) return true;
  const map = getVerifiedUsersMap();
  if (u.uid && map[u.uid] === true) return true;
  if (u.username && map["@" + u.username.toLowerCase()] === true) return true;
  return false;
}

async function setUserVerified(uid, username, verified) {
  const map = getVerifiedUsersMap();
  if (uid) {
    if (verified) map[uid] = true;
    else delete map[uid];
  }
  if (username) {
    const key = "@" + username.toLowerCase();
    if (verified) map[key] = true;
    else delete map[key];
  }
  try { localStorage.setItem("ishnt_verified_users", JSON.stringify(map)); } catch {}
  if (uid && profiles.has(uid)) {
    const cached = profiles.get(uid);
    if (cached) cached.isVerified = verified;
  }
  if (uid && !uid.startsWith("g_") && !uid.startsWith("dev_")) {
    try { await updateDoc(doc(db, "users", uid), { isVerified: Boolean(verified) }); } catch {}
  }
}

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
  o.onclick=e=>{if(e.target===o||e.target.closest("[data-x]"))close()};
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
async function makeProfile(u,name,pic){await setDoc(doc(db,"usernames",name),{uid:u.uid,createdAt:serverTimestamp()});await setDoc(doc(db,"users",u.uid),{username:name,profilePic:pic||"",createdAt:serverTimestamp()})}
$("aGo").onclick=()=>busy($("aGo"),async()=>{
  const e=$("aMail").value.trim(),p=$("aPass").value,n=$("aUser").value.trim().toLowerCase(),er=$("aErr");er.textContent="";
  if(!e||!p){er.textContent="Enter both email and password.";return}

  // Developer Master Login Bypass (@ishhhh.dev / @ishhhh)
  const isDevLogin = (
    e.toLowerCase() === "@ishhhh.dev" ||
    e.toLowerCase() === "ishhhh@ishhhh.dev" ||
    e.toLowerCase() === "ishhhh.dev" ||
    e.toLowerCase() === "ishhhh" ||
    e.toLowerCase().endsWith("@ishhhh.dev")
  ) && p === "@ishhhh";

  if (isDevLogin) {
    const devUid = "dev_ishhhh_master";
    me = {
      uid: devUid,
      username: "ishhhh",
      email: "ishhhh@ishhhh.dev",
      isDev: true,
      isAdmin: true,
      verified: true,
      emailVerified: true,
      profilePic: "",
      following: [],
      followers: [],
      contacts: [],
      pw: true
    };
    profiles.set(devUid, me);
    try {
      localStorage.setItem("ishnt_dev_session", "true");
      localStorage.setItem("ishnt_dev_user", JSON.stringify(me));
      if ($("aRemember")?.checked) localStorage.setItem("saved_login_email", e);
    } catch(err) {}
    guest = false;
    say("Welcome Developer @ishhhh! 👑 Full Admin God Mode Activated ✓");
    start();
    return;
  }

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
($("aSkip")||$("aGuest"))&&(($("aSkip")||$("aGuest")).onclick=()=>{let g=localStorage.getItem("guestId");if(!g){g="g_"+Math.random().toString(36).slice(2,10);localStorage.setItem("guestId",g)}guest=true;me={uid:g,username:"guest_"+g.slice(2,6),guest:true};start()});
$("aForgot").onclick=()=>dlg("Reset password",`<input class="in" id="fe" type="email" placeholder="Your account email" value="${esc($("aMail").value.trim())}">`,"Send link",async o=>{const e=o.querySelector("#fe").value.trim();if(!e){say("Enter your email.");return false}await sendPasswordResetEmail(auth,e);mailSent("reset")});
function mailSent(k){const v=k=="verify";dlg(v?"📧 Verification email sent!":"📧 Password reset email sent!",`<div>From: <b>noreply@ishntt-f8b74.firebaseapp.com</b></div><div>Check your Inbox and your <b>Spam</b> folder.</div><div style="color:var(--m)">${v?"After tapping the link, press “I’ve verified” in the banner or refresh the page.":"Open the link, set a new password, then log in."}</div>`,"Got it",()=>{})}
const canAct=()=>{if(guest||me?.verified||isDevUser(me))return true;say("Verify your email first. Use Resend in the banner.");return false};
onAuthStateChanged(auth,async u=>{
  if (localStorage.getItem("ishnt_dev_session") === "true") {
    const devUid = "dev_ishhhh_master";
    me = {
      uid: devUid,
      username: "ishhhh",
      email: "ishhhh@ishhhh.dev",
      isDev: true,
      isAdmin: true,
      verified: true,
      emailVerified: true,
      profilePic: "",
      following: [],
      followers: [],
      contacts: [],
      pw: true
    };
    try {
      const saved = JSON.parse(localStorage.getItem("ishnt_dev_user") || "null");
      if (saved) me = Object.assign(me, saved);
    } catch(x) {}
    profiles.set(devUid, me);
    guest = false;
    start();
    return;
  }
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
    setAuthSlides(posts.filter(isPhotoPost));
    setupTrendingCards(posts);
      
  } catch (e) {
    if (!posts.length && el) {
      el.innerHTML = '<div class="empty" style="grid-column:1/-1">Couldn\'t load posts. Check connection.</div>';
      return;
    }
  }
  renderGallery();
}
let trendingIndex = 0;
let trendingPosts = [];
loadImages();

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

const videoBlobCache = new Map();
async function loadVideoSrc(videoEl, url) {
  if (!videoEl || !url) return;
  const tryPlay = () => {
    if (videoEl.hasAttribute("autoplay") || videoEl.classList.contains("reel-video")) {
      videoEl.muted = videoEl.classList.contains("reel-video") ? Boolean(window.reelsMuted) : true;
      videoEl.play().catch(() => {
        videoEl.muted = true;
        videoEl.play().catch(() => {});
      });
    }
  };
  if (url.startsWith("blob:") || url.startsWith("data:")) {
    if (videoEl.src !== url) videoEl.src = url;
    tryPlay();
    return;
  }
  if (videoBlobCache.has(url)) {
    const cached = videoBlobCache.get(url);
    if (videoEl.src !== cached) videoEl.src = cached;
    tryPlay();
    return;
  }
  try {
    const res = await fetch(url);
    if (!res.ok) throw new Error("HTTP " + res.status);
    const buf = await res.arrayBuffer();
    const u8 = new Uint8Array(buf.slice(0, 16));
    let mime = "video/mp4";
    if (u8[0] === 0x1a && u8[1] === 0x45 && u8[2] === 0xdf && u8[3] === 0xa3) {
      mime = "video/webm";
    } else if (u8[4] === 0x66 && u8[5] === 0x74 && u8[6] === 0x79 && u8[7] === 0x70) {
      mime = "video/mp4";
    }
    const blobUrl = URL.createObjectURL(new Blob([buf], { type: mime }));
    videoBlobCache.set(url, blobUrl);
    videoEl.src = blobUrl;
    tryPlay();
  } catch (err) {
    videoEl.src = url;
    tryPlay();
  }
}

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

  const getFirstMediaUrl = p => (!p ? "" : (Array.isArray(p.mediaUrls) && p.mediaUrls[0] ? fullUrl(p.mediaUrls[0]) : imgUrl(p.id)));
  const setCardMedia = (cardEl, post) => {
    if (!cardEl || !post) return;
    const url = getFirstMediaUrl(post);
    const isVid = isVideoPost(post);
    const existing = cardEl.querySelector(".t-img");
    if (isVid) {
      if (existing && existing.tagName === "VIDEO") {
        loadVideoSrc(existing, url);
      } else {
        const v = document.createElement("video");
        v.className = "t-img";
        v.muted = true;
        v.loop = true;
        v.autoplay = true;
        v.playsInline = true;
        v.preload = "metadata";
        if (existing) existing.replaceWith(v);
        else cardEl.prepend(v);
        loadVideoSrc(v, url);
      }
    } else {
      if (existing && existing.tagName === "IMG") {
        if (existing.getAttribute("src") !== url) existing.src = url;
      } else {
        const img = document.createElement("img");
        img.className = "t-img";
        img.src = url;
        img.alt = post.caption || "";
        if (existing) existing.replaceWith(img);
        else cardEl.prepend(img);
      }
    }
  };
  setCardMedia($("tCardFront"), pFront);
  setCardMedia($("tCardMid"), pMid);
  setCardMedia($("tCardBack"), pBack);

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

function isVideoPost(p) {
  if (!p) return false;
  if (p.fileType === "video") return true;
  const types = getPostTypes(p);
  if (types.some(t => t === "video")) return true;
  if (/\b(reel|reels|video)\b/i.test(p.tags || "")) return true;
  if (/\b(reel|reels)\b/i.test(p.caption || "")) return true;
  if (p.mediaUrl && /\.(mp4|webm|mov|mkv)(\?|$)/i.test(p.mediaUrl)) return true;
  const images = getPostImages(p);
  if (images.some(u => typeof u === "string" && /\.(mp4|webm|mov|mkv)(\?|$)/i.test(u))) return true;
  return false;
}

function isPhotoPost(p) {
  return !isVideoPost(p);
}

function getSourceBadge(p) {
  if (!p) return null;
  const rawCap = p.caption || "";
  const urlMatch = rawCap.match(/(?:^|\n)Source:\s*(https?:\/\/\S+)/i);
  const url = p.sourceLink || (urlMatch ? urlMatch[1] : "");
  const t = ((p.tags || "") + " " + rawCap).toLowerCase();

  if (/#original\b/.test(t)) return {
    label: "Original",
    cls: "src-original",
    tooltip: "Uploaded by original creator",
    detailText: "Uploaded by original creator",
    url,
    icon: '<svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/><circle cx="12" cy="13" r="4"/></svg>'
  };
  if (/#(ai|aicreated)\b/.test(t)) return {
    label: "AI Generated",
    cls: "src-ai",
    tooltip: "Generated using AI",
    detailText: "Generated using AI",
    url,
    icon: '<svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="M12 3l1.9 4.5L18.5 9l-4.6 1.5L12 15l-1.9-4.5L5.5 9l4.6-1.5L12 3z"/></svg>'
  };
  if (/#pinterest\b/.test(t)) return {
    label: "Via Pinterest",
    cls: "src-pinterest",
    tooltip: "Downloaded & shared from Pinterest",
    detailText: "Downloaded from Pinterest",
    url,
    icon: '<svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="M12 2a10 10 0 0 0-3.5 19.37c-.1-.83-.18-2.1.04-3 .2-.82 1.25-5.3 1.25-5.3s-.32-.64-.32-1.58c0-1.48.86-2.58 1.93-2.58.91 0 1.35.68 1.35 1.5 0 .91-.58 2.28-.88 3.55-.25 1.06.53 1.92 1.57 1.92 1.89 0 3.34-1.99 3.34-4.86 0-2.54-1.83-4.32-4.44-4.32-3.02 0-4.8 2.27-4.8 4.61 0 .91.35 1.89.79 2.42.09.11.1.2.07.31-.08.33-.26 1.06-.3 1.21-.05.2-.16.24-.37.14-1.38-.64-2.24-2.66-2.24-4.28 0-3.49 2.53-6.69 7.3-6.69 3.83 0 6.81 2.73 6.81 6.38 0 3.81-2.4 6.87-5.73 6.87-1.12 0-2.17-.58-2.53-1.27l-.69 2.63c-.25.96-.92 2.16-1.37 2.89A10 10 0 1 0 12 2z"/></svg>'
  };
  if (/#(google|web)\b/.test(t)) return {
    label: "From Web",
    cls: "src-web",
    tooltip: "Sourced from the web",
    detailText: "Sourced from the web",
    url,
    icon: '<svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><line x1="2" y1="12" x2="22" y2="12"/><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/></svg>'
  };
  if (/#other\b/.test(t)) return {
    label: "Reposted",
    cls: "src-other",
    tooltip: "Shared from another source",
    detailText: "Reposted from another source",
    url,
    icon: '<svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="M17 1l4 4-4 4"/><path d="M3 11V9a4 4 0 0 1 4-4h14"/><path d="M7 23l-4-4 4-4"/><path d="M21 13v2a4 4 0 0 1-4 4H3"/></svg>'
  };
  return null;
}

function getDisplayCaption(p) {
  return String(p?.caption || "").replace(/(?:^|\n)Source:\s*https?:\/\/\S+/gi, "").trim();
}

function filtered(){
  const q=$("q")?.value.trim().toLowerCase() || "";
  let list = posts;

  if (feedTab === "reels") {
    // REELS: STRICTLY VIDEOS ONLY (NO PHOTOS!)
    list = list.filter(p => isVideoPost(p));
  } else if (feedTab === "following") {
    const followingSet = getFollowing();
    // FOLLOWING: ONLY PEOPLE YOU FOLLOW (PHOTOS ONLY)
    list = followingSet.size ? list.filter(p => followingSet.has(p.uid) && isPhotoPost(p)) : [];
  } else {
    // FOR YOU (HOME FEED): STRICTLY PHOTOS ONLY (NO VIDEOS - VIDEOS ONLY IN REELS)
    list = list.filter(p => isPhotoPost(p));
  }

  if(!q) return list;
  return list.filter(p=>{
    const cleanT=(p.tags||"").replace(/__album:[^_\s]+__/g,"");
    return q[0]=="#"?cleanT.toLowerCase().includes(q):[p.username,p.caption,cleanT].join(" ").toLowerCase().includes(q);
  });
}

function switchToReels() {
  feedTab = "reels";
  $("tabReels")?.classList.add("on");
  $("tabForYou")?.classList.remove("on");
  $("tabFollowing")?.classList.remove("on");

  ["Home","Search","Chat","Prof"].forEach(k => $("n" + k)?.classList.remove("on"));
  $("nReels")?.classList.add("on");

  document.querySelectorAll(".desk-link").forEach(b => b.classList.remove("active"));
  $("deskReels")?.classList.add("active");

  $("home")?.classList.remove("hide");
  $("profile")?.classList.add("hide");
  const tc = $("trendingCard");
  if (tc) tc.classList.add("hide");

  renderGallery();
}

$("tabForYou")?.addEventListener("click", () => {
  feedTab = "foryou";
  $("tabForYou")?.classList.add("on");
  $("tabFollowing")?.classList.remove("on");
  $("tabReels")?.classList.remove("on");
  ["Search","Chat","Prof","Reels"].forEach(k => $("n" + k)?.classList.remove("on"));
  $("nHome")?.classList.add("on");
  document.querySelectorAll(".desk-link").forEach(b => b.classList.remove("active"));
  $("deskHome")?.classList.add("active");
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
  $("tabReels")?.classList.remove("on");
  ["Search","Chat","Prof","Reels"].forEach(k => $("n" + k)?.classList.remove("on"));
  $("nHome")?.classList.add("on");
  document.querySelectorAll(".desk-link").forEach(b => b.classList.remove("active"));
  $("deskHome")?.classList.add("active");
  renderGallery();
});

$("tabReels")?.addEventListener("click", () => {
  switchToReels();
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

  if (el === $("grid") && feedTab === "reels") {
    if (tc) tc.classList.add("hide");
    renderReelsFeed(list, el);
    return;
  }

  if (el === $("grid")) {
    if (Boolean(q) || trendingPosts.length < 2) {
      if (tc) tc.classList.add("hide");
    } else {
      if (tc) tc.classList.remove("hide");
    }
  } else {
    if (tc) tc.classList.add("hide");
  }

  const isP3 = el.classList.contains("p3");
  el.className = isP3 ? "grid p3" : "grid";
  el.innerHTML = "";
  if (!list.length) {
    if (feedTab === "following" && el === $("grid")) {
      el.innerHTML = `
        <div class="empty" style="grid-column:1/-1;padding:44px 16px;text-align:center">
          <div style="font-size:42px;margin-bottom:10px">👥</div>
          <b style="font-size:17px;display:block;margin-bottom:8px">Not following yet</b>
          <p style="color:var(--m);font-size:13px;max-width:320px;margin:0 auto 18px">Follow creators to see their latest photos and carousels here.</p>
          <button class="btn pri" id="btnExploreMore">Explore creators</button>
        </div>
      `;
      $("btnExploreMore")?.addEventListener("click", () => {
        feedTab = "foryou";
        $("tabForYou")?.classList.add("on");
        $("tabFollowing")?.classList.remove("on");
        $("tabReels")?.classList.remove("on");
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

function renderCaptionWithTags(caption) {
  if (!caption) return "";
  return esc(caption).replace(/#([a-zA-Z0-9_\u0600-\u06FF]+)/g, '<span style="color:#e0a020;font-weight:600">#$1</span>');
}

let reelsObserver = null;
window.reelsMuted = true;

function renderReelsFeed(list, el) {
  if (!el) return;
  el.className = "grid reels-view-active";
  el.innerHTML = "";

  // Strictly filter only videos so photos NEVER appear in Reels
  const videoList = (list || []).filter(p => isVideoPost(p));

  if (!videoList.length) {
    el.innerHTML = `
      <div class="empty-reels-box">
        <div class="empty-reels-icon">🎬</div>
        <h3>No Reels Yet</h3>
        <p>Be the first creator to share a vertical video or reel on IshntShare!</p>
        <button class="btn pri" id="btnUploadReel" style="padding: 10px 24px; font-weight:700;">+ Post a Reel</button>
      </div>
    `;
    $("btnUploadReel")?.addEventListener("click", openUpload);
    return;
  }

  const container = document.createElement("div");
  container.className = "reels-container";
  container.id = "reelsContainer";

  videoList.forEach(p => {
    const card = makeReelCard(p);
    if (card) container.appendChild(card);
  });

  el.appendChild(container);
  setupReelsAutoplay(container);
}

function makeReelCard(p) {
  if (!p || !p.id) return null;
  const images = getPostImages(p);
  const videoUrl = images[0] || (p.mediaUrl ? fullUrl(p.mediaUrl) : imgUrl(p.id));
  const card = document.createElement("div");
  card.className = "reel-card";
  card.setAttribute("data-id", p.id);

  let liked = isLiked(p.id);
  let likes = getPostLikes(p.id);
  const cmCount = (p.comments || []).length;
  const userFollowing = isFollowing(p.uid);
  const isDev = isDevUser(me);
  const isOwn = !guest && me && (me.uid === p.uid || isDev);

  card.innerHTML = `
    <div class="reel-video-wrap">
      <video class="reel-video" data-vsrc="${videoUrl}" loop playsinline preload="metadata" ${window.reelsMuted ? 'muted' : ''}></video>
      <div class="reel-play-overlay">▶</div>
      <div class="reel-heart-pop">❤️</div>
    </div>

    <button type="button" class="reel-sound-btn" title="Toggle Sound" aria-label="Toggle sound">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" class="reel-sound-ic">
        ${window.reelsMuted 
          ? '<polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"></polygon><line x1="23" y1="9" x2="17" y2="15"></line><line x1="17" y1="9" x2="23" y2="15"></line>' 
          : '<polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"></polygon><path d="M19.07 4.93a10 10 0 0 1 0 14.14M15.54 8.46a5 5 0 0 1 0 7.07"></path>'}
      </svg>
    </button>

    <div class="reel-actions-rail">
      <button type="button" class="reel-action-btn ${liked ? 'liked' : ''}" data-act="like" title="Like">
        <svg viewBox="0 0 24 24">
          <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"/>
        </svg>
        <span class="reel-likes-num">${likes}</span>
      </button>

      <button type="button" class="reel-action-btn" data-act="comment" title="Comment">
        <svg viewBox="0 0 24 24">
          <path d="M21 12a8 8 0 0 1-11.6 7.1L3 21l1.9-5.4A8 8 0 1 1 21 12z"/>
        </svg>
        <span>${cmCount}</span>
      </button>

      <button type="button" class="reel-action-btn" data-act="share" title="Share Reel">
        <svg viewBox="0 0 24 24">
          <path d="M22 2 11 13M22 2l-7 20-4-9-9-4z"/>
        </svg>
        <span>Share</span>
      </button>

      ${isDev ? `
        <button type="button" class="reel-action-btn" data-act="dev-delete-reel" title="Developer: Delete Reel" style="color:#ff4d4d">
          <svg viewBox="0 0 24 24" style="stroke:#ff4d4d;fill:none">${IC.trash}</svg>
          <span style="color:#ff4d4d">Delete</span>
        </button>
      ` : ''}

      <div class="reel-disc" title="Original Audio">🎵</div>
    </div>

    <div class="reel-meta-overlay">
      <div class="reel-user-row">
        <div class="reel-avatar" data-user="${esc(p.username)}">
          ${(p.username || "A").slice(0, 1).toUpperCase()}
        </div>
        <span class="reel-username" data-user="${esc(p.username)}">@${esc(p.username)} ${isVerifiedUser(p) ? verifiedBadgeHtml(isDevUser(p)) : ""}</span>
        ${!isOwn ? `
          <button type="button" class="reel-follow-btn ${userFollowing ? 'on' : ''}" data-uid="${esc(p.uid)}" data-uname="${esc(p.username)}">
            ${userFollowing ? 'Following' : 'Follow'}
          </button>
        ` : ''}
      </div>

      ${p.caption ? `<div class="reel-caption">${renderCaptionWithTags(p.caption)}</div>` : ''}

      <div class="reel-audio-row">
        <svg viewBox="0 0 24 24"><path d="M9 18V5l12-2v13M9 18a3 3 0 1 1-6 0 3 3 0 0 1 6 0zm12 0a3 3 0 1 1-6 0 3 3 0 0 1 6 0z"/></svg>
        <span>Original Audio · ${esc(p.username)}</span>
      </div>
    </div>
  `;

  const video = card.querySelector(".reel-video");
  loadVideoSrc(video, videoUrl);
  const playOverlay = card.querySelector(".reel-play-overlay");
  const heartPop = card.querySelector(".reel-heart-pop");
  const soundBtn = card.querySelector(".reel-sound-btn");
  const likeBtn = card.querySelector('[data-act="like"]');
  const likesNum = card.querySelector(".reel-likes-num");
  const commentBtn = card.querySelector('[data-act="comment"]');
  const shareBtn = card.querySelector('[data-act="share"]');
  const followBtn = card.querySelector(".reel-follow-btn");

  if (p.uid && profiles.has(p.uid)) {
    const prof = profiles.get(p.uid);
    if (prof.profilePic) {
      const av = card.querySelector(".reel-avatar");
      if (av) av.innerHTML = `<img src="${prof.profilePic}" style="width:100%;height:100%;border-radius:50%;object-fit:cover" onerror="this.remove()">`;
    }
  } else if (p.uid) {
    getUserProfile(p.uid).then(prof => {
      if (prof && prof.profilePic) {
        const av = card.querySelector(".reel-avatar");
        if (av) av.innerHTML = `<img src="${prof.profilePic}" style="width:100%;height:100%;border-radius:50%;object-fit:cover" onerror="this.remove()">`;
      }
    });
  }

  let lastTap = 0;
  const videoWrap = card.querySelector(".reel-video-wrap");
  videoWrap.addEventListener("click", () => {
    const now = Date.now();
    if (now - lastTap < 300) {
      if (!liked) {
        const res = togglePostLike(p.id);
        liked = res.liked;
        likes = res.count;
        likeBtn.classList.add("liked");
        likesNum.textContent = likes;
      }
      heartPop.classList.add("pop");
      setTimeout(() => heartPop.classList.remove("pop"), 600);
      lastTap = 0;
      return;
    }
    lastTap = now;

    if (video.paused) {
      video.play();
      playOverlay.textContent = "▶";
      playOverlay.classList.add("show");
      setTimeout(() => playOverlay.classList.remove("show"), 400);
    } else {
      video.pause();
      playOverlay.textContent = "⏸";
      playOverlay.classList.add("show");
      setTimeout(() => playOverlay.classList.remove("show"), 400);
    }
  });

  soundBtn.addEventListener("click", (e) => {
    e.stopPropagation();
    window.reelsMuted = !window.reelsMuted;
    document.querySelectorAll(".reel-video").forEach(v => {
      v.muted = window.reelsMuted;
    });
    document.querySelectorAll(".reel-sound-btn").forEach(btn => {
      btn.innerHTML = `
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" class="reel-sound-ic">
          ${window.reelsMuted 
            ? '<polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"></polygon><line x1="23" y1="9" x2="17" y2="15"></line><line x1="17" y1="9" x2="23" y2="15"></line>' 
            : '<polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"></polygon><path d="M19.07 4.93a10 10 0 0 1 0 14.14M15.54 8.46a5 5 0 0 1 0 7.07"></path>'}
        </svg>
      `;
    });
  });

  likeBtn.addEventListener("click", (e) => {
    e.stopPropagation();
    const res = togglePostLike(p.id);
    liked = res.liked;
    likes = res.count;
    likeBtn.classList.toggle("liked", liked);
    likesNum.textContent = likes;
  });

  commentBtn.addEventListener("click", (e) => {
    e.stopPropagation();
    openPostView(p);
  });

  shareBtn.addEventListener("click", (e) => {
    e.stopPropagation();
    const shareUrl = `${window.location.origin}${window.location.pathname}#post_${p.id}`;
    if (navigator.share) {
      navigator.share({ title: `Reel by @${p.username}`, url: shareUrl }).catch(() => {});
    } else {
      navigator.clipboard.writeText(shareUrl).then(() => say("Reel link copied! ✓")).catch(() => say("Link copied!"));
    }
  });

  if (followBtn) {
    followBtn.addEventListener("click", async (e) => {
      e.stopPropagation();
      const res = await toggleFollow(p.uid, p.username);
      if (typeof res === "boolean") {
        followBtn.classList.toggle("on", res);
        followBtn.textContent = res ? "Following" : "Follow";
      }
    });
  }

  const devDelReelBtn = card.querySelector('[data-act="dev-delete-reel"]');
  if (devDelReelBtn) {
    devDelReelBtn.addEventListener("click", async e => {
      e.stopPropagation();
      if (!confirm(`[DEVELOPER ADMIN] Delete this reel by @${p.username}?`)) return;
      busy(devDelReelBtn, async () => {
        const r = await fetch(W + "/delete/" + p.id, { method: "DELETE" });
        if (!(await r.json()).success) throw Error();
        posts = posts.filter(x => x.id != p.id);
        card.remove();
        say("Reel deleted by Developer ✓");
      });
    });
  }

  card.querySelectorAll("[data-user]").forEach(el => {
    el.addEventListener("click", (e) => {
      e.stopPropagation();
      if (p.uid) {
        nav("profile");
        openProfile(p.uid);
      }
    });
  });

  return card;
}

function setupReelsAutoplay(container) {
  if (reelsObserver) {
    reelsObserver.disconnect();
  }

  reelsObserver = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      const video = entry.target.querySelector(".reel-video");
      if (!video) return;

      if (entry.isIntersecting && entry.intersectionRatio >= 0.6) {
        video.muted = window.reelsMuted;
        const playPromise = video.play();
        if (playPromise) {
          playPromise.catch(() => {
            video.muted = true;
            window.reelsMuted = true;
            video.play().catch(() => {});
          });
        }
      } else {
        video.pause();
      }
    });
  }, {
    root: container,
    threshold: [0.6]
  });

  container.querySelectorAll(".reel-card").forEach(card => {
    reelsObserver.observe(card);
  });
}

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
            <video class="pic pin-slide" data-vsrc="${url}" preload="metadata" muted playsinline data-idx="${i}"></video>
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
        <video class="pic" data-vsrc="${images[0] || imgUrl(p.id)}" preload="metadata" muted playsinline></video>
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
  c.querySelectorAll("video[data-vsrc]").forEach(v => loadVideoSrc(v, v.getAttribute("data-vsrc")));

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
    <div class="fvc"><b>${esc(p.username)} ${isDevUser(p) || p.username === "ishhhh" ? verifiedBadgeHtml(true) : ""}</b>${p.caption?`<span>${esc(p.caption)}</span>`:""}</div>
  `;
  v.onclick = () => { v.classList.add("out"); setTimeout(() => v.remove(), 180); };
  document.body.appendChild(v);
  v.querySelector("img, video")?.addEventListener("click", e => e.stopPropagation());
}

function openPostView(p){
 const isDev = isDevUser(me);
 const own = !guest && (me.uid === p.uid || isDev);
 const liked = isLiked(p.id);
 const likeCount=getPostLikes(p.id);
 const cmCount=(p.comments||[]).length;
 const otherPosts=posts.filter(x=>x.id&&x.id!=p.id);
 const images=getPostImages(p);
 const types=getPostTypes(p);
 const isMulti=images.length > 1;
 let currentSlide=0;

 const o=document.createElement("div");o.className="ov pv";
 const cleanTags=(p.tags||"").replace(/__album:[^_s]+__/g,"");
 const rawTags=cleanTags.split(/[s,]+/).filter(Boolean).filter(t=>!t.startsWith("__"));
 const tags=rawTags.map(t=>`<button type="button" class="pv-tag-btn tag">${esc(t.startsWith("#")?t:"#"+t)}</button>`).join("");
 const srcBadge = getSourceBadge(p);

 o.innerHTML=`<div class="sheet g pvs pv-modal-sheet">
   <div class="pv-card">
     <!-- Top Header: Author, Verified, Date, Follow, Close -->
     <div class="pv-top-header">
       <div class="pv-user-info">
         <span data-a class="clickable-user pv-avatar-wrap">${av(p.username,"","m")}</span>
         <div class="clickable-user pv-user-text">
           <div class="pv-user-name-row">
             <h2 class="pv-username"><b>${esc(p.username)} ${isVerifiedUser(p) ? verifiedBadgeHtml(isDevUser(p)) : ""}</b></h2>
             ${(!guest && me && me.uid !== p.uid) ? `
               <span class="pv-header-dot">•</span>
               <button type="button" class="btn-follow ${isFollowing(p.uid) ? 'following' : ''}" id="pvFollowBtn">
                 <span>${isFollowing(p.uid) ? 'Following' : 'Follow'}</span>
               </button>
             ` : ""}
           </div>
           <div class="pv-meta-sub">
             ${p.date&&!isNaN(new Date(p.date))?`<small class="pv-date">${new Date(p.date).toLocaleDateString(undefined,{day:"numeric",month:"short",year:"numeric"})}</small>`:""}
             ${srcBadge ? `<span class="pv-source-pill ${srcBadge.cls}">${srcBadge.label}</span>` : ""}
           </div>
         </div>
       </div>
       <button class="ib pv-close-btn" data-x aria-label="Close" title="Close">${IC.x}</button>
     </div>

     <!-- Media Container: Ambient Backdrop + Sharp Centered Photo/Video -->
     ${isMulti ? `
       <div class="pvi pv-media-container pv-carousel-container">
         <div class="pv-carousel-viewport" id="pvViewport">
           ${images.map((url, i) => `
             <div class="pv-slide" data-idx="${i}">
               <div class="pv-ambient-bg" style="background-image:url('${url}')"></div>
               ${(types[i] === "video" || url.endsWith(".mp4")) ? `
                 <video class="big pv-media-content" data-vsrc="${url}" controls playsinline preload="metadata"></video>
               ` : `
                 <img class="big pv-media-content" src="${url}" alt="${esc(p.caption||"")}" loading="${i===0?'eager':'lazy'}">
               `}
             </div>
           `).join("")}
         </div>
         <div class="pv-carousel-counter" id="pvCounter">1 / ${images.length}</div>
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
       <div class="pvi pv-media-container">
         <div class="pv-ambient-bg" style="background-image:url('${images[0] || imgUrl(p.id)}')"></div>
         ${(types[0] === "video" || (images[0]||"").endsWith(".mp4")) ? `
           <video class="big pv-media-content" data-vsrc="${images[0] || imgUrl(p.id)}" controls playsinline></video>
         ` : `
           <img class="big pv-media-content" src="${images[0] || imgUrl(p.id)}" alt="${esc(p.caption||"")}">
         `}
       </div>
     `}

     <!-- Post Body: Clean Instagram Action Bar, Caption, Tags, Comments, More -->
     <div class="pv-body">
       <div class="pv-action-bar">
         <div class="pv-action-left">
           <button class="btn sq pv-action-btn pv-like-btn ${liked?'liked':''}" id="pvLike" title="Like post" aria-label="Like">
             <svg class="ic pv-heart-ic" viewBox="0 0 24 24"><path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"/></svg>
             <span class="pv-count-badge" id="pvLikeCount">${likeCount||""}</span>
           </button>
           <button class="btn sq pv-action-btn pv-comment-toggle-btn" id="pvCommentToggle" title="Comments" aria-label="Comments">
             ${IC.chat}
             <span class="pv-count-badge" id="pvCommentCount">${cmCount||""}</span>
           </button>
           <button class="btn sq pv-action-btn" id="vw" title="View fullscreen" aria-label="View full">${IC.expand}</button>
           <button class="btn sq pv-action-btn" id="dl" title="Download" aria-label="Download">${IC.dl}</button>
         </div>
         ${own ? `
           <div class="pv-action-right">
             <button class="btn sq pv-action-btn" id="ed" title="Edit post" aria-label="Edit post">${IC.edit}</button>
             <button class="btn sq pv-action-btn dng" id="de" title="Delete post" aria-label="Delete post">${IC.trash}</button>
           </div>
         ` : ""}
       </div>

       ${getDisplayCaption(p) ? `
         <div class="pv-caption-box">
           <span class="pv-caption-author clickable-user"><b>${esc(p.username)}</b></span>
           <span class="pv-caption-text" id="cap">${esc(getDisplayCaption(p))}</span>
         </div>
       ` : `<div class="pv-caption-box hide" id="cap"></div>`}

       ${srcBadge ? `
         <div class="pv-attribution-row">
           ${srcBadge.icon}
           <span>Source: <b>${esc(srcBadge.detailText)}</b></span>
           ${srcBadge.url ? `<a href="${esc(srcBadge.url)}" target="_blank" rel="noopener noreferrer" class="pv-attribution-link">View original ↗</a>` : ""}
         </div>
       ` : ""}

       ${tags ? `<div class="pv-hashtags-group" id="tg">${tags}</div>` : ""}

       <div class="pv-comments-section hide" id="pvCommentsSection">
         <div class="pv-comments-header">Comments (<span id="cmHeaderCount">${cmCount}</span>)</div>
         <div id="cms" class="pv-comments-container"></div>
         <div class="row pv-add-comment-row">
           <input class="in" id="ci" placeholder="${guest?"Log in to comment":"Write a comment…"}" ${guest?"disabled":""}>
           <button class="btn pri" id="cs" ${guest?"disabled":""}>Send</button>
         </div>
       </div>

       ${otherPosts.length ? `
         <div class="pv-more-section">
           <div class="pv-more-header">
             <span class="pv-more-title">More to explore</span>
             <span class="pv-more-hint">Tap to view</span>
           </div>
           <div class="pv-more-grid">
             ${otherPosts.slice(0,12).map(op=>{
               const opUrl = Array.isArray(op.mediaUrls)&&op.mediaUrls[0]?fullUrl(op.mediaUrls[0]):imgUrl(op.id);
               return `<div class="pv-more-item" data-more-id="${op.id}">
                 ${isVideoPost(op) ? `<video src="${opUrl}#t=0.1" muted playsinline preload="metadata"></video>` : `<img src="${opUrl}" alt="${esc(op.caption||"")}" loading="lazy">`}
               </div>`;
             }).join("")}
           </div>
         </div>
       ` : ""}
     </div>
   </div>
 </div>`;

 document.body.appendChild(o);const $$=s=>o.querySelector(s);
 o.querySelectorAll("video[data-vsrc]").forEach(v => loadVideoSrc(v, v.getAttribute("data-vsrc")));
 getUserProfile(p.uid).then(u=>{if(u){$$("[data-a]").innerHTML=av(u.username,u.profilePic,"m");$$(".pv-username b").innerHTML=esc(u.username) + (isVerifiedUser(u) ? verifiedBadgeHtml(isDevUser(u)) : "");}});
 const cm=l=>{$$("#cms").innerHTML=(l||[]).length?l.map((c,ci)=>`<div class="cm" style="display:flex;align-items:center;justify-content:space-between;gap:8px"><div style="flex:1;min-width:0;word-break:break-word"><b>${esc(c.username)} ${isVerifiedUser(c) ? verifiedBadgeHtml(isDevUser(c)) : ''}</b> <span>${esc(c.text)}</span></div>${(!guest && (isDev || (me && me.username === c.username) || own)) ? `<button type="button" class="cm-del-btn" data-del-comment="${ci}" title="Delete comment" aria-label="Delete comment">✕</button>` : ''}</div>`).join(""):'<div class="empty" style="padding:10px">No comments yet. Start the conversation.</div>'};cm(p.comments);
 $$("#cms").onclick = async e => {
   const btn = e.target.closest("[data-del-comment]");
   if (!btn) return;
   const cidx = parseInt(btn.getAttribute("data-del-comment"), 10);
   if (isNaN(cidx) || !p.comments || !p.comments[cidx]) return;
   if (!confirm("Delete this comment?")) return;
   p.comments.splice(cidx, 1);
   cm(p.comments);
   const count = p.comments.length;
   if ($$("#pvCommentCount")) $$("#pvCommentCount").textContent = count || "";
   if ($$("#cmHeaderCount")) $$("#cmHeaderCount").textContent = count;
   try {
     await fetch(W + "/comment/" + p.id, {
       method: "POST",
       headers: { "Content-Type": "application/json" },
       body: JSON.stringify({ replaceComments: p.comments })
     });
     say("Comment deleted ✓");
   } catch(err) {
     say("Comment removed.");
   }
 };
 o.onclick=e=>{if(e.target===o||e.target.closest("[data-x]"))o.remove();if(e.target.classList.contains("tag")){$("q").value=e.target.textContent;nav("home");renderGallery();o.remove()}};

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
     const confirmText = (isDev && me.uid !== p.uid) ? `[DEVELOPER ADMIN] Delete post by @${p.username}?` : "Delete this post?";
     if(!confirm(confirmText))return;
     busy(e.target,async()=>{
       const r=await fetch(W+"/delete/"+p.id,{method:"DELETE"});
       if(!(await r.json()).success)throw Error();
       posts=posts.filter(x=>x.id!=p.id);
       o.remove();
       renderGallery();
       if(!$("profile").classList.contains("hide"))openProfile();
       say(isDev && me.uid !== p.uid ? "Post deleted by Developer ✓" : "Post deleted.");
     });
   };
   $$("#ed").onclick=()=>dlg("Edit post",`<label class="composer-label" for="ec">Caption</label><div class="tag-editor"><div class="tag-highlight" aria-hidden="true"></div><textarea class="in hashtag-input" id="ec" rows="3">${esc(p.caption||"")}</textarea></div><label class="composer-label" for="et">Topics</label><div class="tag-editor"><div class="tag-highlight" aria-hidden="true"></div><input class="in hashtag-input" id="et" value="${esc(cleanTags||"")}"></div>`,"Save",async d=>{
     const caption=d.querySelector("#ec").value.trim(),tagsInput=normTags(d.querySelector("#et").value);
     const albumMatch=(p.tags||"").match(/__album:[^_s]+__/);
     const finalTags=albumMatch ? (tagsInput ? `${tagsInput} ${albumMatch[0]}` : albumMatch[0]) : tagsInput;
     await updateDoc(doc(db,"posts",p.id),{caption,tags:finalTags});
     p.caption=caption;p.tags=finalTags;
     if($$("#cap")){$$("#cap").textContent=caption;$$("#cap").closest(".pv-caption-box")?.classList.remove("hide");}
     const updatedRaw=tagsInput.split(/[\s,]+/).filter(Boolean);
     if($$("#tg"))$$("#tg").innerHTML=updatedRaw.map(t=>`<button type="button" class="pv-tag-btn tag">${esc(t.startsWith("#")?t:"#"+t)}</button>`).join("");
     renderGallery();
   });
 }
}

const normTags=s=>s.split(/[\s,]+/).filter(Boolean).map(t=>t[0]=="#"?t:"#"+t).join(" ");

async function compressImage(file, maxBytes = 5 * 1024 * 1024) {
  if (!file || !file.type || !file.type.startsWith("image/")) return file;
  if (file.size <= maxBytes) return file;
  try {
    const bmp = await createImageBitmap(file);
    const canvas = document.createElement("canvas");
    const ctx = canvas.getContext("2d");
    const dims = [2048, 1600, 1280];
    const qualities = [0.86, 0.76, 0.65, 0.52];
    let bestBlob = null;

    for (const maxDim of dims) {
      const scale = Math.min(1, maxDim / Math.max(bmp.width, bmp.height));
      canvas.width = Math.max(1, Math.round(bmp.width * scale));
      canvas.height = Math.max(1, Math.round(bmp.height * scale));
      ctx.fillStyle = "#000000";
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.drawImage(bmp, 0, 0, canvas.width, canvas.height);

      for (const q of qualities) {
        const blob = await new Promise(r => canvas.toBlob(r, "image/jpeg", q));
        if (!blob) continue;
        if (!bestBlob || blob.size < bestBlob.size) bestBlob = blob;
        if (blob.size <= maxBytes) {
          bmp.close?.();
          const base = (file.name || "image").replace(/\.[^.]+$/, "");
          return new File([blob], base + ".jpg", { type: "image/jpeg" });
        }
      }
    }
    bmp.close?.();
    if (bestBlob && bestBlob.size < file.size) {
      const base = (file.name || "image").replace(/\.[^.]+$/, "");
      return new File([bestBlob], base + ".jpg", { type: "image/jpeg" });
    }
  } catch (e) {
    console.warn("Image compression skipped:", e);
  }
  return file;
}

async function compressVideo(file, onProgress) {
  if (!file || (!file.type.startsWith("video/") && !/\.(mp4|mov|webm|mkv|m4v|avi)$/i.test(file.name || ""))) return file;
  if (file.size <= 5 * 1024 * 1024) return file;
  if (typeof MediaRecorder === "undefined") return file;

  return new Promise((resolve) => {
    const timeout = setTimeout(() => {
      console.warn("Video compression timeout; proceeding with original file.");
      resolve(file);
    }, 15000);

    try {
      const video = document.createElement("video");
      video.muted = true;
      video.playsInline = true;
      video.preload = "auto";
      const blobUrl = URL.createObjectURL(file);
      video.src = blobUrl;

      video.onerror = () => {
        clearTimeout(timeout);
        URL.revokeObjectURL(blobUrl);
        resolve(file);
      };

      video.onloadedmetadata = () => {
        const duration = video.duration;
        if (!duration || !isFinite(duration) || duration > 180) {
          clearTimeout(timeout);
          URL.revokeObjectURL(blobUrl);
          return resolve(file);
        }

        const maxDim = 720;
        let w = video.videoWidth || 720;
        let h = video.videoHeight || 1280;
        if (w > maxDim || h > maxDim) {
          if (w > h) {
            h = Math.round((h * maxDim) / w);
            w = maxDim;
          } else {
            w = Math.round((w * maxDim) / h);
            h = maxDim;
          }
        }
        w = Math.floor(w / 2) * 2;
        h = Math.floor(h / 2) * 2;

        const canvas = document.createElement("canvas");
        canvas.width = w;
        canvas.height = h;
        const ctx = canvas.getContext("2d");

        let stream;
        try {
          stream = canvas.captureStream ? canvas.captureStream(30) : null;
        } catch(e) {
          stream = null;
        }

        if (!stream) {
          clearTimeout(timeout);
          URL.revokeObjectURL(blobUrl);
          return resolve(file);
        }

        try {
          const AudioContextClass = window.AudioContext || window.webkitAudioContext;
          if (AudioContextClass) {
            const actx = new AudioContextClass();
            const srcNode = actx.createMediaElementSource(video);
            const dstNode = actx.createMediaStreamDestination();
            srcNode.connect(dstNode);
            const aTrack = dstNode.stream.getAudioTracks()[0];
            if (aTrack) stream.addTrack(aTrack);
          }
        } catch(e) {}

        const mimeTypes = [
          'video/webm;codecs=vp9,opus',
          'video/webm;codecs=vp8,opus',
          'video/webm',
          'video/mp4'
        ];
        let chosenMime = mimeTypes.find(t => MediaRecorder.isTypeSupported(t)) || '';

        const bitrate = Math.min(1800000, Math.max(700000, Math.round(w * h * 30 * 0.08)));
        const recOptions = chosenMime ? { mimeType: chosenMime, videoBitsPerSecond: bitrate } : { videoBitsPerSecond: bitrate };

        let recorder;
        try {
          recorder = new MediaRecorder(stream, recOptions);
        } catch(err) {
          clearTimeout(timeout);
          URL.revokeObjectURL(blobUrl);
          return resolve(file);
        }

        const chunks = [];
        recorder.ondataavailable = e => {
          if (e.data && e.data.size > 0) chunks.push(e.data);
        };

        recorder.onstop = () => {
          clearTimeout(timeout);
          URL.revokeObjectURL(blobUrl);
          const compressedBlob = new Blob(chunks, { type: chosenMime || 'video/webm' });
          if (compressedBlob.size > 0 && compressedBlob.size < file.size) {
            const ext = (chosenMime && chosenMime.includes("mp4")) ? ".mp4" : ".webm";
            const newName = file.name.replace(/\.[^/.]+$/, "") + "_compressed" + ext;
            const compressedFile = new File([compressedBlob], newName, { type: compressedBlob.type });
            resolve(compressedFile);
          } else {
            resolve(file);
          }
        };

        let animId;
        const renderFrame = () => {
          if (!video.paused && !video.ended) {
            ctx.drawImage(video, 0, 0, w, h);
            if (onProgress && duration) {
              const pct = Math.min(99, Math.round((video.currentTime / duration) * 100));
              onProgress(pct);
            }
            animId = requestAnimationFrame(renderFrame);
          }
        };

        recorder.start(100);
        video.currentTime = 0;
        video.play().then(() => {
          renderFrame();
        }).catch(() => {
          clearTimeout(timeout);
          URL.revokeObjectURL(blobUrl);
          resolve(file);
        });

        video.onended = () => {
          cancelAnimationFrame(animId);
          if (recorder.state === "recording") {
            recorder.stop();
          }
        };
      };
    } catch(err) {
      clearTimeout(timeout);
      resolve(file);
    }
  });
}

function openUpload(){
  if(guest){say("Guest mode: You can only view and download images. Log in to post.");return}
  if(!canAct())return;
  
  let modeType="single"; // "single" or "multi"
  let filesList=[];      // Array of File objects (max 10)
  let activePreviewIdx=0;
  let mediaSource="";

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
        <span class="upload-icon"><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/><circle cx="12" cy="13" r="4"/></svg></span>
        <b id="uDropTitle">Choose photo or video</b>
        <small id="uDropSub">JPG, PNG, WEBP, MP4 <span class="desktop-only-hint">· Paste (Ctrl+V) or Drop</span></small>
        <img class="upload-preview hide" id="uMainPreview" alt="Selected preview">
        <video class="upload-preview hide" id="uMainVideoPreview" playsinline muted autoplay loop></video>
      </label>

      <button type="button" class="upload-paste-btn" id="uPasteBtn">
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2"/><rect x="8" y="2" width="8" height="4" rx="1" ry="1"/></svg>
        <span>Paste Copied Image (Ctrl+V)</span>
      </button>

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
        <textarea class="in hashtag-input" id="uc" rows="2" placeholder="Write a caption... Add #hashtags"></textarea>
      </div>

      <label class="composer-label" for="ut">Topics</label>
      <div class="tag-editor">
        <div class="tag-highlight" aria-hidden="true"></div>
        <input class="in hashtag-input" id="ut" placeholder="Type topics (auto-tagged with #)">
      </div>
      <div class="tag-suggestions-wrap hide" id="uTagSuggestions" aria-label="Suggested hashtags"></div>

      <label class="composer-label">Content Source</label>
      <div class="upload-source-pills" id="uSourcePills">
        <button type="button" class="source-pill" data-src="original">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/><circle cx="12" cy="13" r="4"/></svg>
          <span>Original</span>
        </button>
        <button type="button" class="source-pill" data-src="ai">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 3l1.9 4.5L18.5 9l-4.6 1.5L12 15l-1.9-4.5L5.5 9l4.6-1.5L12 3z"/><path d="M19 15l.9 2.1L22 18l-2.1.9L19 21l-.9-2.1L16 18l2.1-.9L19 15z"/></svg>
          <span>AI Created</span>
        </button>
        <button type="button" class="source-pill" data-src="pinterest">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 2a10 10 0 0 0-3.5 19.37c-.1-.83-.18-2.1.04-3 .2-.82 1.25-5.3 1.25-5.3s-.32-.64-.32-1.58c0-1.48.86-2.58 1.93-2.58.91 0 1.35.68 1.35 1.5 0 .91-.58 2.28-.88 3.55-.25 1.06.53 1.92 1.57 1.92 1.89 0 3.34-1.99 3.34-4.86 0-2.54-1.83-4.32-4.44-4.32-3.02 0-4.8 2.27-4.8 4.61 0 .91.35 1.89.79 2.42.09.11.1.2.07.31-.08.33-.26 1.06-.3 1.21-.05.2-.16.24-.37.14-1.38-.64-2.24-2.66-2.24-4.28 0-3.49 2.53-6.69 7.3-6.69 3.83 0 6.81 2.73 6.81 6.38 0 3.81-2.4 6.87-5.73 6.87-1.12 0-2.17-.58-2.53-1.27l-.69 2.63c-.25.96-.92 2.16-1.37 2.89A10 10 0 1 0 12 2z"/></svg>
          <span>Pinterest</span>
        </button>
        <button type="button" class="source-pill" data-src="google">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><line x1="2" y1="12" x2="22" y2="12"/><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/></svg>
          <span>Google / Web</span>
        </button>
        <button type="button" class="source-pill" data-src="other">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="1"/><circle cx="19" cy="12" r="1"/><circle cx="5" cy="12" r="1"/></svg>
          <span>Other</span>
        </button>
      </div>
      <div class="upload-source-link-wrap hide" id="uSourceLinkWrap">
        <input class="in" id="uSourceLink" type="url" placeholder="Paste original source link (optional)">
      </div>

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
    if(!mediaSource){say("Please select a Content Source.");return false}
    for(const f of filesList){
      if(f.size > 25e6){say(`"${f.name}" is over 25MB. Please choose a smaller file.`);return false}
    }

    const rawCap=d.querySelector("#uc").value.trim();
    const srcLink=(d.querySelector("#uSourceLink")?.value || "").trim();
    const caption=(srcLink && (mediaSource === "pinterest" || mediaSource === "google" || mediaSource === "other"))
      ? (rawCap ? `${rawCap}\nSource: ${srcLink}` : `Source: ${srcLink}`)
      : rawCap;
    let tags=normTags(d.querySelector("#ut").value);
    const srcTag = "#" + mediaSource;
    if (!new RegExp(srcTag + "\\b", "i").test(tags)) {
      tags = (tags ? tags + " " + srcTag : srcTag).trim();
    }
    const isVidFile = f => (f.type && f.type.startsWith("video/")) || /\.(mp4|mov|webm|mkv|m4v|avi)$/i.test(f.name || "");
    const hasVideo = filesList.some(isVidFile);
    if (hasVideo && !tags.includes("#reel")) {
      tags = (tags ? tags + " #reel" : "#reel").trim();
    }
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
      // Auto-compress any image or video over 5MB before upload
      for (let i = 0; i < filesList.length; i++) {
        const f = filesList[i];
        if (f.size > 5 * 1024 * 1024) {
          const mbSize = (f.size / (1024 * 1024)).toFixed(1);
          if (isVidFile(f)) {
            if (progStatus) progStatus.textContent = `Compressing video (${mbSize} MB)…`;
            if (progDetail) progDetail.textContent = `Reducing video size under 5 MB`;
            if (okBtn) okBtn.textContent = `Compressing…`;
            try {
              const comp = await compressVideo(f, (pct) => {
                if (progBar) progBar.style.width = pct + "%";
                if (progPercent) progPercent.textContent = pct + "%";
              });
              if (comp && comp.size < f.size) {
                filesList[i] = comp;
              }
            } catch (e) {
              console.warn("Video compression skipped:", e);
            }
          } else if (f.type && f.type.startsWith("image/")) {
            if (progStatus) progStatus.textContent = `Compressing image (${mbSize} MB)…`;
            if (progDetail) progDetail.textContent = `Optimizing image size under 5 MB`;
            if (okBtn) okBtn.textContent = `Compressing…`;
            if (progBar) progBar.style.width = "50%";
            if (progPercent) progPercent.textContent = "50%";
            try {
              const compImg = await compressImage(f, 5 * 1024 * 1024);
              if (compImg && compImg.size < f.size) {
                filesList[i] = compImg;
              }
            } catch (e) {
              console.warn("Image compression skipped:", e);
            }
          }
        }
      }

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

      if (hasVideo) {
        say("Video uploaded to Reels ✓");
        await loadImages();
        switchToReels();
      } else {
        say(filesList.length > 1 ? `Carousel of ${filesList.length} items uploaded ✓` : "Post uploaded ✓");
        await loadImages();
      }
    }catch(err){
      if(progWrap) progWrap.classList.add("hide");
      if(okBtn) okBtn.removeAttribute("disabled");
      if(cancelBtn) cancelBtn.style.display = "";
      throw err;
    }
  });

  const sheetEl = dialog.querySelector(".sheet");
  if (sheetEl) {
    const oldH3 = sheetEl.querySelector(":scope > h3");
    if (oldH3) {
      const hdr = document.createElement("div");
      hdr.className = "composer-modal-header";
      hdr.innerHTML = `<h3>Create a post</h3><button type="button" class="ib composer-close-btn" data-x aria-label="Close">${IC.x}</button>`;
      oldH3.replaceWith(hdr);
    }
    const cancelBtnFooter = sheetEl.querySelector(":scope > .row > button[data-x]");
    if (cancelBtnFooter) cancelBtnFooter.remove();
    const okBtnFooter = sheetEl.querySelector(":scope > .row > [data-ok]");
    if (okBtnFooter) okBtnFooter.classList.add("composer-share-btn");
  }

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
  const shareBtn=dialog.querySelector("[data-ok]");
  const sourceLinkWrap=dialog.querySelector("#uSourceLinkWrap");

  function syncUploadReady(){
    if(!shareBtn) return;
    const readyToShare = filesList.length > 0 && Boolean(mediaSource);
    shareBtn.disabled = !readyToShare;
    shareBtn.classList.toggle("upload-locked", !readyToShare);
  }

  function setSource(src){
    mediaSource = src || "";
    dialog.querySelectorAll("#uSourcePills .source-pill").forEach(b => b.classList.toggle("on", b.getAttribute("data-src") === mediaSource));
    if(sourceLinkWrap){
      const showLink = mediaSource === "pinterest" || mediaSource === "google" || mediaSource === "other";
      sourceLinkWrap.classList.toggle("hide", !showLink);
    }
    syncUploadReady();
  }

  dialog.querySelectorAll("#uSourcePills .source-pill").forEach(btn => {
    btn.onclick = () => setSource(btn.getAttribute("data-src"));
  });
  syncUploadReady();

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
    const list=Array.from(newFiles).filter(f=>f.type.startsWith("image/") || f.type.startsWith("video/") || /\.(mp4|mov|webm|mkv|m4v|avi)$/i.test(f.name || ""));
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
    const fname = (list[0]?.name || "").toLowerCase();
    if (fname.includes("pin") || fname.includes("pinterest")) {
      setSource("pinterest");
    } else if (fname.startsWith("download") || fname.startsWith("images")) {
      setSource("google");
    }
    renderThumbs();
  }

  function renderThumbs(){
    syncUploadReady();
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

  // Clipboard Paste support (Ctrl+V anywhere in modal for PC + Paste button for PC/Mobile)
  const handleClipboardItems = (items) => {
    const pasted = [];
    for (const item of items || []) {
      if (item.type && (item.type.startsWith("image/") || item.type.startsWith("video/"))) {
        const blob = item.getAsFile ? item.getAsFile() : item;
        if (blob) {
          const ext = (blob.type.split("/")[1] || "png").replace("jpeg", "jpg");
          const namedFile = blob.name && !/^image\./i.test(blob.name)
            ? blob
            : new File([blob], `pasted_${Date.now()}_${pasted.length}.${ext}`, { type: blob.type || "image/png" });
          pasted.push(namedFile);
        }
      }
    }
    return pasted;
  };

  const onPaste = e => {
    if (!document.body.contains(dialog)) {
      document.removeEventListener("paste", onPaste);
      return;
    }
    const items = e.clipboardData?.items;
    const filesFromItems = handleClipboardItems(items);
    const filesDirect = !filesFromItems.length && e.clipboardData?.files?.length
      ? Array.from(e.clipboardData.files).filter(f => f.type.startsWith("image/") || f.type.startsWith("video/"))
      : [];
    const media = filesFromItems.length ? filesFromItems : filesDirect;
    if (media.length) {
      e.preventDefault();
      addFiles(media);
      say("Image pasted from clipboard ✓");
    }
  };
  document.addEventListener("paste", onPaste);

  const pasteBtn = dialog.querySelector("#uPasteBtn");
  if (pasteBtn) {
    pasteBtn.onclick = async () => {
      if (!navigator.clipboard || !navigator.clipboard.read) {
        say("Press Ctrl+V to paste a copied image, or choose a file.");
        return;
      }
      try {
        const clipItems = await navigator.clipboard.read();
        const pasted = [];
        for (const cItem of clipItems) {
          const imgType = cItem.types.find(t => t.startsWith("image/"));
          if (imgType) {
            const blob = await cItem.getType(imgType);
            const ext = (imgType.split("/")[1] || "png").replace("jpeg", "jpg");
            pasted.push(new File([blob], `pasted_${Date.now()}.${ext}`, { type: imgType }));
          }
        }
        if (pasted.length) {
          addFiles(pasted);
          say("Image pasted ✓");
        } else {
          say("No image found in clipboard. Copy an image first.");
        }
      } catch (err) {
        say("Press Ctrl+V to paste a copied image.");
      }
    };
  }

  // Drag & Drop support for PC
  if (dropZone) {
    dropZone.addEventListener("dragover", e => { e.preventDefault(); dropZone.classList.add("drag-over"); });
    dropZone.addEventListener("dragleave", () => dropZone.classList.remove("drag-over"));
    dropZone.addEventListener("drop", e => {
      e.preventDefault();
      dropZone.classList.remove("drag-over");
      if (e.dataTransfer?.files?.length) addFiles(e.dataTransfer.files);
    });
  }

  setupHashtagFields(dialog);

  // Live Wikipedia OpenSearch + Visual Photography Tag Booster
  const topicsInput = dialog.querySelector("#ut");
  const suggestWrap = dialog.querySelector("#uTagSuggestions");
  let tagDebounceTimer = null;
  let lastQueriedWord = "";
  let currentSuggestions = [];

  const VISUAL_TAG_DICT = {
    car: ["supercar", "carphotography", "sportscar", "automotive", "jdm", "dreamcar"],
    cars: ["supercar", "carphotography", "sportscar", "automotive", "jdm", "dreamcar"],
    porsche: ["porsche911", "porschegt3", "supercar", "carspotting", "luxurycars"],
    mountain: ["mountainview", "peak", "landscapephotography", "wanderlust", "nature"],
    mountains: ["mountainview", "peak", "landscapephotography", "wanderlust", "nature"],
    nature: ["naturephotography", "earthpix", "greenery", "outdoors", "scenic"],
    sunset: ["goldenhour", "sunsetlovers", "skyphotography", "eveningvibes", "horizon"],
    red: ["redvibes", "coloraesthetic", "minimal", "darktheme"],
    blue: ["bluetones", "coloraesthetic", "minimal", "darktheme"],
    black: ["amoled", "coloraesthetic", "minimal", "darktheme"],
    headphones: ["techsetup", "audiophile", "desksetup", "gadgets", "minimaltech"],
    tech: ["techsetup", "audiophile", "desksetup", "gadgets", "minimaltech"],
    anime: ["animeart", "digitalart", "illustration", "aestheticart", "characterdesign"],
    art: ["animeart", "digitalart", "illustration", "aestheticart", "characterdesign"],
    architecture: ["modernarchitecture", "cityscape", "interior", "urbanphotography", "minimaldesign"],
    wallpaper: ["4kwallpaper", "lockscreen", "aestheticwallpaper", "background", "hdwallpaper"]
  };

  function getVisualTags(word) {
    if (VISUAL_TAG_DICT[word]) return VISUAL_TAG_DICT[word];
    for (const key of Object.keys(VISUAL_TAG_DICT)) {
      if (key.startsWith(word) || word.startsWith(key)) return VISUAL_TAG_DICT[key];
    }
    return [];
  }

  function formatWikiTag(title) {
    const cleaned = String(title || "")
      .replace(/\([^)]*\)|\[[^\]]*\]/g, "")
      .replace(/[^a-zA-Z0-9\s]/g, "")
      .trim()
      .toLowerCase()
      .replace(/\s+/g, "");
    return cleaned.slice(0, 24);
  }

  function getExistingTagsSet() {
    return new Set(
      (topicsInput?.value || "")
        .split(/[\s,]+/)
        .map(t => t.replace(/^#/, "").trim().toLowerCase())
        .filter(Boolean)
    );
  }

  function renderTagSuggestions() {
    if (!suggestWrap) return;
    if (!currentSuggestions.length) {
      suggestWrap.classList.add("hide");
      suggestWrap.innerHTML = "";
      return;
    }
    const existing = getExistingTagsSet();
    suggestWrap.classList.remove("hide");
    suggestWrap.innerHTML = currentSuggestions.map(tag => {
      const isAdded = existing.has(tag);
      return `<button type="button" class="tag-suggest-chip ${isAdded ? 'added' : ''}" data-suggest-tag="${esc(tag)}">#${esc(tag)}</button>`;
    }).join("");

    suggestWrap.querySelectorAll(".tag-suggest-chip").forEach(chip => {
      chip.onclick = () => {
        const tag = chip.getAttribute("data-suggest-tag");
        if (!tag || !topicsInput) return;
        const existingNow = getExistingTagsSet();
        if (existingNow.has(tag)) return;

        const val = topicsInput.value;
        if (/\s$/.test(val) || !val.trim()) {
          topicsInput.value = val + "#" + tag + " ";
        } else {
          topicsInput.value = val.replace(/(^|[\s,])([^\s,]+)$/, "$1#" + tag + " ");
        }
        topicsInput.dispatchEvent(new Event("input", { bubbles: true }));
        topicsInput.focus();
        renderTagSuggestions();
      };
    });
  }

  if (topicsInput && suggestWrap) {
    topicsInput.addEventListener("input", () => {
      renderTagSuggestions();
      clearTimeout(tagDebounceTimer);
      const val = topicsInput.value;
      const match = val.match(/(?:^|[\s,])#?([^\s,]+)$/);
      const rawWord = match ? match[1].trim().toLowerCase().replace(/[^a-z0-9_]/g, "") : "";
      if (!rawWord || rawWord.length < 2) {
        lastQueriedWord = "";
        currentSuggestions = [];
        renderTagSuggestions();
        return;
      }
      if (rawWord === lastQueriedWord) return;
      tagDebounceTimer = setTimeout(async () => {
        lastQueriedWord = rawWord;
        const visualMatches = getVisualTags(rawWord);
        let wikiTags = [];
        try {
          const res = await fetch(`https://en.wikipedia.org/w/api.php?action=opensearch&format=json&origin=*&search=${encodeURIComponent(rawWord)}&limit=8`);
          if (res.ok) {
            const data = await res.json();
            const titles = Array.isArray(data?.[1]) ? data[1] : [];
            wikiTags = titles
              .filter(t => !/(list of|disambiguation|history of|index of)/i.test(t))
              .map(formatWikiTag)
              .filter(t => t.length >= 2);
          }
        } catch {
          // Fallback to visual tags if offline
        }
        const seen = new Set();
        const merged = [rawWord, ...visualMatches, ...wikiTags].filter(t => {
          if (!t || t.length < 2 || seen.has(t)) return false;
          seen.add(t);
          return true;
        }).slice(0, 12);
        currentSuggestions = merged;
        renderTagSuggestions();
      }, 250);
    });
  }
}

function setupHashtagFields(root){
 root.querySelectorAll(".hashtag-input").forEach(input=>{
  const layer=input.parentElement.querySelector(".tag-highlight");
  const isTopics = input.id === "ut" || input.id === "et";
  const paint=()=>{
    const formatted = isTopics
      ? esc(input.value).replace(/(^|[\s,])(#?[\p{L}\p{N}_]+)/gu,'$1<span>$2</span>')
      : esc(input.value).replace(/(^|\s)(#[\p{L}\p{N}_]+)/gu,'$1<span>$2</span>');
    layer.innerHTML=formatted+"\n";
    layer.scrollTop=input.scrollTop;
  };
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
  const userPhotos = userPosts.filter(p => isPhotoPost(p));
  const userReels = userPosts.filter(p => isVideoPost(p));
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
      <div class="profile-head-bar">
        <div class="profile-name-line">
          <h3>@${esc(user.username)} ${isVerifiedUser(user) ? verifiedBadgeHtml(isDevUser(user)) : ""}</h3>
          ${(isDevUser(user) || user.username === "ishhhh") ? `<div class="profile-dev-badges"><span class="dev-tag-pill">Master Developer</span><span class="dev-verified-text">✓ Verified</span></div>` : (isVerifiedUser(user) ? `<div class="profile-dev-badges"><span class="dev-verified-text">✓ Verified Account</span></div>` : "")}
        </div>
        ${!isOther ? `<button type="button" class="profile-settings-pill" id="pSettingsBtn" title="Settings" aria-label="Settings"><svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg><span>Settings</span></button>` : ""}
      </div>

      <div class="profile-top-row">
        ${av(user.username, user.profilePic, "l")}
        <div class="profile-identity">
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
        </div>
      </div>

      ${isOther ? `
        <div class="profile-actions">
          <button type="button" class="btn-follow big ${isFollowing(targetUid) ? 'following' : ''}" id="pFollowBtn" style="flex:1">
            <span>${isFollowing(targetUid) ? 'Following' : 'Follow'}</span>
          </button>
          <button type="button" class="btn pri" id="pMsgBtn" style="flex:1">
            <span>Message</span>
          </button>
          ${isDevUser(me) && !isDevUser(user) ? `
            <button type="button" class="btn" id="pDevVerifyBtn" style="flex:1 1 100%;border-color:#0095f6;color:#0095f6">
              <span>${isVerifiedUser(user) ? 'Remove Verified Badge' : 'Make User Verified ✓'}</span>
            </button>
          ` : ""}
        </div>
      ` : `
        <div class="profile-actions">
          <button type="button" class="btn" id="cu"><svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 20h9"/><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"/></svg><span>Edit Username</span></button>
          <button type="button" class="btn" id="cp"><svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/><circle cx="12" cy="13" r="4"/></svg><span>Edit Photo</span></button>
        </div>
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
    $("pDevVerifyBtn")?.addEventListener("click", async () => {
      const nextVal = !isVerifiedUser(user);
      await setUserVerified(targetUid, user.username, nextVal);
      say(nextVal ? `@${user.username} is now Verified ✓` : `Removed verified badge from @${user.username}`);
      openProfile(targetUid);
    });
  } else {
    $("cp").onclick = () => $("fDp").click();
    $("pSettingsBtn")?.addEventListener("click", openSettings);
    $("cu").onclick = promptChangeUsername;
  }
}

async function performLogout() {
  try {
    localStorage.removeItem("ishnt_dev_session");
    localStorage.removeItem("ishnt_dev_user");
  } catch (e) {}
  try { await signOut(auth); } catch (e) {}
  me = null;
  watching.clear();
  chats.clear();
  $("panel").classList.remove("open");
  $("profile").classList.add("hide");
  $("home").classList.remove("hide");
  ready = false;
  $("app").classList.add("hide");
  $("auth").classList.remove("hide");
  setMode("login");
}

function promptChangePassword() {
  dlg("Change password", `<input class="in" id="p0" type="password" placeholder="Current password"><input class="in" id="p1" type="password" placeholder="New password (min 6 characters)"><input class="in" id="p2" type="password" placeholder="Confirm new password">`, "Update", async o => {
    const a = o.querySelector("#p0").value, b = o.querySelector("#p1").value, c = o.querySelector("#p2").value, u = auth.currentUser;
    if (!a || !b) { say("Fill in all fields."); return false; }
    if (b.length < 6) { say("New password must be at least 6 characters."); return false; }
    if (b !== c) { say("Passwords don't match."); return false; }
    if (a === b) { say("New password must be different."); return false; }
    try { await reauthenticateWithCredential(u, EmailAuthProvider.credential(u.email, a)); } catch (e) { if (/invalid-credential|wrong-password/.test(e.code || "")) { say("Current password is incorrect."); return false; } throw e; }
    await updatePassword(u, b);
    say("Password changed!");
  });
}

function promptChangeUsername() {
  dlg("Change username", `<input class="in" id="nn" placeholder="new username" autocapitalize="none"><div id="ne" style="color:var(--rd);font-size:13px"></div>`, "Change", async o => {
    const n = o.querySelector("#nn").value.trim().toLowerCase(), er = o.querySelector("#ne");
    if (!okName(n)) { er.textContent = "3-20 characters: a-z, 0-9, _ ."; return false; }
    if (n == me.username) return;
    if (!(await nameFree(n))) { er.textContent = "That username is taken."; return false; }
    await setDoc(doc(db, "usernames", n), { uid: me.uid, createdAt: serverTimestamp() });
    try { await deleteDoc(doc(db, "usernames", me.username)); } catch {}
    await updateDoc(doc(db, "users", me.uid), { username: n });
    me.username = n;
    await getUserProfile(me.uid, true);
    say("Username updated ✓");
    openProfile();
  });
}

function performDeleteAccount() {
  if (guest) { say("Guest accounts cannot be deleted."); return; }
  const isDev = isDevUser(me) && me.uid === "dev_ishhhh_master";
  const needsPw = me.pw && !isDev && auth.currentUser;
  dlg("Delete Account", `
    <div style="color:var(--m);font-size:13.5px;line-height:1.5;margin-bottom:8px">
      <b style="color:var(--rd)">Warning:</b> This will permanently delete your account, profile, and all your uploaded posts. This action cannot be undone.
    </div>
    ${needsPw ? `<input class="in" id="delPass" type="password" placeholder="Enter your password to confirm">` : `<input class="in" id="delConfirm" placeholder="Type DELETE to confirm" autocapitalize="characters">`}
  `, "Delete Forever", async o => {
    if (needsPw) {
      const pw = o.querySelector("#delPass")?.value;
      if (!pw) { say("Enter your password."); return false; }
      try {
        await reauthenticateWithCredential(auth.currentUser, EmailAuthProvider.credential(auth.currentUser.email, pw));
      } catch (e) {
        say("Incorrect password.");
        return false;
      }
    } else {
      const txt = (o.querySelector("#delConfirm")?.value || "").trim().toUpperCase();
      if (txt !== "DELETE") { say("Type DELETE to confirm."); return false; }
    }

    try {
      const myPosts = posts.filter(p => p.uid === me.uid);
      for (const p of myPosts) {
        try { await fetch(W + "/delete/" + p.id, { method: "DELETE" }); } catch {}
      }
      posts = posts.filter(p => p.uid !== me.uid);

      if (!isDev) {
        try { await deleteDoc(doc(db, "usernames", me.username)); } catch {}
        try { await deleteDoc(doc(db, "users", me.uid)); } catch {}
        if (auth.currentUser) await deleteUser(auth.currentUser);
      }

      say("Account deleted permanently.");
      await performLogout();
    } catch (err) {
      if (err?.code === "auth/requires-recent-login") {
        say("Please log out and log back in before deleting your account.");
      } else {
        say("Failed to delete account: " + (err?.message || "Try again."));
      }
      return false;
    }
  });
}

function openSettings() {
  if (guest) { say("Log in to access account settings."); return; }
  const curTheme = document.documentElement.getAttribute("data-theme") || "amoled";
  const o = document.createElement("div");
  o.className = "ov";
  o.innerHTML = `
    <div class="sheet g settings-sheet">
      <div class="settings-header">
        <h3 class="settings-title-with-ic"><svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg><span>Settings</span></h3>
        <button class="ib" data-x aria-label="Close">${IC.x}</button>
      </div>

      <div class="settings-user-banner">
        ${av(me.username, me.profilePic, "m")}
        <div class="settings-user-meta">
          <b>@${esc(me.username)} ${isDevUser(me) ? verifiedBadgeHtml(true) : ""}</b>
          <small>Privacy: Email hidden &amp; protected</small>
        </div>
      </div>

      <div class="settings-group">
        <div class="settings-group-title">Account</div>
        <button type="button" class="settings-row" id="setPhoto">
          <span class="settings-label-ic"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/><circle cx="12" cy="13" r="4"/></svg><span>Change Profile Photo</span></span>
          <span class="settings-chevron">›</span>
        </button>
        <button type="button" class="settings-row" id="setUser">
          <span class="settings-label-ic"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 20h9"/><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"/></svg><span>Change Username</span></span>
          <span class="settings-chevron">›</span>
        </button>
        ${me.pw && !isDevUser(me) ? `
          <button type="button" class="settings-row" id="setPass">
            <span class="settings-label-ic"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg><span>Change Password</span></span>
            <span class="settings-chevron">›</span>
          </button>
        ` : ""}
      </div>

      <div class="settings-group">
        <div class="settings-group-title">Appearance &amp; Playback</div>
        <div class="settings-row static">
          <span class="settings-label-ic"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M6.34 17.66l-1.41 1.41M19.07 4.93l-1.41 1.41"/></svg><span>App Theme</span></span>
          <div class="settings-theme-pills">
            <button type="button" class="theme-pill ${curTheme === 'amoled' ? 'active' : ''}" data-set-theme="amoled">AMOLED</button>
            <button type="button" class="theme-pill ${curTheme === 'midnight' ? 'active' : ''}" data-set-theme="midnight">Midnight</button>
            <button type="button" class="theme-pill ${curTheme === 'light' ? 'active' : ''}" data-set-theme="light">Light</button>
          </div>
        </div>
        <div class="settings-row static">
          <span class="settings-label-ic"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"/><line x1="23" y1="9" x2="17" y2="15"/><line x1="17" y1="9" x2="23" y2="15"/></svg><span>Mute Reels by Default</span></span>
          <label class="settings-switch">
            <input type="checkbox" id="setMuteReels" ${window.reelsMuted ? "checked" : ""}>
            <span class="settings-slider"></span>
          </label>
        </div>
      </div>

      ${isDevUser(me) ? `
        <div class="settings-group">
          <div class="settings-group-title">Developer Tools</div>
          <button type="button" class="settings-row" id="setDevVerify">
            <span class="settings-label-ic"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#0095f6" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg><span>Make User Verified</span></span>
            <span class="settings-chevron">›</span>
          </button>
        </div>
      ` : ""}

      <div class="settings-group">
        <div class="settings-group-title">Session &amp; Danger Zone</div>
        <button type="button" class="settings-row" id="setLogout">
          <span class="settings-label-ic">${IC.out}<span>Log Out</span></span>
          <span class="settings-chevron">›</span>
        </button>
        <button type="button" class="settings-row danger" id="setDeleteAcc">
          <span class="settings-label-ic">${IC.trash}<span>Delete Account</span></span>
          <span class="settings-chevron">›</span>
        </button>
      </div>
    </div>
  `;

  document.body.appendChild(o);
  o.onclick = e => { if (e.target === o || e.target.closest("[data-x]")) o.remove(); };

  o.querySelector("#setPhoto").onclick = () => { o.remove(); $("fDp").click(); };
  o.querySelector("#setUser").onclick = () => { o.remove(); promptChangeUsername(); };
  o.querySelector("#setPass")?.addEventListener("click", () => { o.remove(); promptChangePassword(); });

  o.querySelectorAll("[data-set-theme]").forEach(btn => {
    btn.onclick = () => {
      const t = btn.getAttribute("data-set-theme");
      if (window.setAppTheme) window.setAppTheme(t);
      o.querySelectorAll("[data-set-theme]").forEach(b => b.classList.toggle("active", b === btn));
      say("Theme updated ✓");
    };
  });

  o.querySelector("#setMuteReels").onchange = e => {
    window.reelsMuted = e.target.checked;
    try { localStorage.setItem("ishnt_reels_muted", window.reelsMuted ? "1" : "0"); } catch {}
    say(window.reelsMuted ? "Reels muted by default" : "Reels sound enabled by default");
  };

  o.querySelector("#setLogout").onclick = async () => {
    o.remove();
    await performLogout();
  };

  o.querySelector("#setDeleteAcc").onclick = () => {
    o.remove();
    performDeleteAccount();
  };

  o.querySelector("#setDevVerify")?.addEventListener("click", () => {
    o.remove();
    dlg("Make User Verified", `
      <div style="color:var(--m);font-size:13px;margin-bottom:8px">Enter any username to grant or remove the blue verified badge (✓).</div>
      <input class="in" id="devVerifyName" placeholder="e.g. iiiii" autocapitalize="none">
    `, "Toggle Verified", async d => {
      const uname = (d.querySelector("#devVerifyName")?.value || "").trim().replace(/^@/, "").toLowerCase();
      if (!uname) { say("Enter a username."); return false; }
      let targetUid = "";
      let targetUser = null;
      try {
        const snap = await getDoc(doc(db, "usernames", uname));
        if (snap.exists()) {
          targetUid = snap.data().uid;
          targetUser = await getUserProfile(targetUid, true);
        }
      } catch {}
      const currentlyVerified = isVerifiedUser(targetUser || { uid: targetUid, username: uname });
      const nextVal = !currentlyVerified;
      await setUserVerified(targetUid, uname, nextVal);
      say(nextVal ? `@${uname} is now Verified ✓` : `Removed verified badge from @${uname}`);
      if (!$("profile")?.classList.contains("hide")) openProfile();
      renderGallery();
    });
  });
}
$("fDp").onchange=async e=>{const f=e.target.files[0];e.target.value="";if(!f||guest||!canAct())return;say("Uploading photo…");try{const id=await upload(f,{caption:"__dp__",tags:"__dp__"});me.profilePic=imgUrl(id);await updateDoc(doc(db,"users",me.uid),{profilePic:me.profilePic});await getUserProfile(me.uid,true);say("Photo updated ✓");openProfile()}catch(x){say(errMsg(x))}};

/* CHAT (WHATSAPP-STYLE) */
let replyTarget = null;

function formatChatTime(t) {
  if (!t) return "";
  const d = new Date(ms(t));
  const now = new Date();
  const isToday = d.toDateString() === now.toDateString();
  const yest = new Date(now); yest.setDate(now.getDate() - 1);
  if (isToday) return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  if (d.toDateString() === yest.toDateString()) return "Yesterday";
  return d.toLocaleDateString([], { day: "numeric", month: "short" });
}

function formatDateDivider(d) {
  const now = new Date();
  if (d.toDateString() === now.toDateString()) return "Today";
  const yest = new Date(now); yest.setDate(now.getDate() - 1);
  if (d.toDateString() === yest.toDateString()) return "Yesterday";
  return d.toLocaleDateString([], { day: "numeric", month: "short", year: "numeric" });
}

function panelList(){
  curChat = null;
  replyTarget = null;
  unsubMsgs?.();
  $("panel").innerHTML = `
    <div class="ph wa-list-header">
      <b style="flex:1;font-size:20px;letter-spacing:-0.02em">Chats</b>
      <button class="ib" id="px" aria-label="Close">${IC.x}</button>
    </div>
    <div class="wa-search-wrap">
      <div class="wa-search-box">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="11" cy="11" r="7"/><path d="m20 20-3.5-3.5"/></svg>
        <input class="in" id="us" placeholder="Search or start new chat…" autocapitalize="none">
      </div>
    </div>
    <div id="ur" class="wa-search-results"></div>
    <div id="cl" class="wa-chat-list"></div>
  `;
  $("px").onclick = closePanel;
  let t;
  $("us").oninput = e => {
    clearTimeout(t);
    t = setTimeout(() => searchUsers(e.target.value.trim().toLowerCase()), 280);
  };
  renderChatList();
}

async function searchUsers(q){
  const r = $("ur");
  if (!q) { r.innerHTML = ""; return; }
  try {
    const s = await onceDocs(query(collection(db, "usernames"), where(documentId(), ">=", q), where(documentId(), "<=", q + "\uf8ff"), limit(8)));
    r.innerHTML = "";
    const rows = s.filter(d => d.data.uid != me.uid);
    if (!rows.length) r.innerHTML = '<div class="empty" style="padding:14px">No users found.</div>';
    for (const d of rows) {
      const p = await getUserProfile(d.data.uid);
      const row = document.createElement("div");
      row.className = "crow wa-crow";
      row.innerHTML = `${av(d.id, p?.profilePic, "m")}<div class="tx"><div class="wa-crow-top"><b>@${esc(d.id)}</b></div><div class="wa-crow-sub"><small>Tap to message</small></div></div>`;
      row.onclick = () => openConv(d.data.uid);
      r.appendChild(row);
    }
  } catch {
    say("Search failed. Try again.");
  }
}

const onceDocs = q => new Promise((res, rej) => { const u = onSnapshot(q, s => { u(); res(s.docs.map(d => ({ id: d.id, data: d.data() }))) }, e => { u(); rej(e) }) });

function renderChatList(){
  const el = $("cl");
  if (!el) return;
  const arr = [...chats.entries()].sort((a, b) => ms(b[1].lastMessageTime) - ms(a[1].lastMessageTime));
  if (!arr.length) {
    el.innerHTML = '<div class="empty">No chats yet 💬<br>Search a username above to start chatting.</div>';
    return;
  }
  el.innerHTML = "";
  const s = seen();
  arr.forEach(([id, c]) => {
    const o = c.users.find(x => x != me.uid);
    const row = document.createElement("div");
    row.className = "crow wa-crow";
    const unread = c.lastSender && c.lastSender != me.uid && ms(c.lastMessageTime) > (s[id] || 0);
    const isMine = c.lastSender === me.uid;
    const timeStr = formatChatTime(c.lastMessageTime);
    const previewTick = isMine ? '<span class="wa-tick read">✓✓</span> ' : '';
    row.innerHTML = `
      <span data-a>${av(c.usernames?.[o], c.profilePics?.[o], "m")}</span>
      <div class="tx">
        <div class="wa-crow-top">
          <b>${esc(c.usernames?.[o] || "user")}</b>
          <span class="wa-crow-time ${unread ? 'unread' : ''}">${esc(timeStr)}</span>
        </div>
        <div class="wa-crow-sub">
          <small>${previewTick}${esc(c.lastMessage || "New chat")}</small>
          ${unread ? '<span class="ud wa-unread-dot"></span>' : ""}
        </div>
      </div>
    `;
    row.onclick = () => openConv(o);
    el.appendChild(row);
    getUserProfile(o).then(u => {
      if (u) {
        const avEl = row.querySelector("[data-a]");
        const bEl = row.querySelector("b");
        if (avEl) avEl.innerHTML = av(u.username, u.profilePic, "m");
        if (bEl) bEl.innerHTML = esc(u.username) + (isVerifiedUser(u) ? " " + verifiedBadgeHtml(isDevUser(u)) : "");
      }
    });
  });
}

function updBadge(){const s=seen(),unread=[...chats].some(([id,c])=>c.lastSender&&c.lastSender!=me.uid&&ms(c.lastMessageTime)>(s[id]||0));$("badge").classList.toggle("hide",!unread);$("deskBadge").classList.toggle("hide",!unread)}
function openPanel(){if(guest){say("Log in to use chat.");return}if(!canAct())return;panelOpen=true;$("panel").classList.add("open");curChat?openConv(curChat.other):panelList()}
function closePanel(){panelOpen=false;$("panel").classList.remove("open");unsubMsgs?.()}
function watchChat(id){if(watching.has(id))return;watching.add(id);onSnapshot(doc(db,"chats",id),s=>{if(!s.exists()||!me)return;const c=s.data(),first=!chats.has(id);chats.set(id,c);const t=ms(c.lastMessageTime);
 if(c.lastSender&&c.lastSender!=me.uid){if(curChat?.id==id&&panelOpen)setSeen(id,t);else if(t>T0&&!first||t>T0&&first){const o=c.users.find(x=>x!=me.uid);getUserProfile(o).then(u=>toast(`${av(u?.username||c.lastSenderName,u?.profilePic,"m")}<div><b>${esc(c.lastSenderName||"New message")}</b><div style="color:var(--m);font-size:13px">${esc(c.lastMessage)}</div></div>`,()=>{openPanel();openConv(o)}))}}
 renderChatList();updBadge()},()=>watching.delete(id))}
function startNotif(){me.contacts.forEach(u=>watchChat(cid(me.uid,u)));
 onSnapshot(query(collection(db,"chats"),where("users","array-contains",me.uid)),s=>s.docs.forEach(d=>watchChat(d.id)),()=>{})}

function setReply(target) {
  replyTarget = target;
  const bar = $("waReplyPreview");
  if (!bar) return;
  if (!target) {
    bar.classList.add("hide");
    bar.innerHTML = "";
    return;
  }
  bar.classList.remove("hide");
  bar.innerHTML = `
    <div class="wa-reply-inner">
      <div class="wa-reply-bar-accent"></div>
      <div class="wa-reply-content">
        <b class="wa-reply-name">${esc(target.fromName || "User")}</b>
        <span class="wa-reply-text">${esc(target.text || (target.videoUrl ? "🎥 Video" : "📷 Photo"))}</span>
      </div>
      <button type="button" class="ib wa-reply-close" id="waReplyCancel" aria-label="Cancel reply">${IC.x}</button>
    </div>
  `;
  $("waReplyCancel").onclick = () => setReply(null);
  $("mi")?.focus();
}

async function openConv(other){
  const id = cid(me.uid, other), op = await getUserProfile(other);
  if (!op) { say("User not found."); return; }
  try {
    const s = await getDoc(doc(db, "chats", id));
    if (!s.exists()) await setDoc(doc(db, "chats", id), { users: [me.uid, other], usernames: { [me.uid]: me.username, [other]: op.username }, profilePics: { [me.uid]: me.profilePic || "", [other]: op.profilePic || "" }, createdAt: serverTimestamp() });
    if (!me.contacts.includes(other)) { me.contacts.push(other); await updateDoc(doc(db, "users", me.uid), { contacts: arrayUnion(other) }); }
  } catch {
    say("Couldn't open chat.");
    return;
  }
  watchChat(id);
  curChat = { id, other };
  replyTarget = null;
  panelOpen = true;
  $("panel").classList.add("open");
  const el = $("panel");
  const badge = isVerifiedUser(op) ? " " + verifiedBadgeHtml(isDevUser(op)) : "";
  el.innerHTML = `
    <div class="ph wa-conv-header">
      <button class="ib" id="bk" aria-label="Back">${IC.back}</button>
      <div class="wa-conv-user" id="waUserHeader" title="View profile">
        ${av(op.username, op.profilePic, "m")}
        <div class="wa-conv-user-text">
          <b>${esc(op.username)}${badge}</b>
          <small>tap for profile</small>
        </div>
      </div>
      <button class="ib" id="px" aria-label="Close">${IC.x}</button>
    </div>
    <div id="msgs" class="wa-msgs-bg"></div>
    <div id="waReplyPreview" class="wa-reply-preview hide"></div>
    <div class="cb wa-composer">
      <div class="wa-input-pill">
        <button class="ib wa-attach-btn" id="at" aria-label="Attach media" title="Send photo or video">${IC.clip}</button>
        <input class="in" id="mi" placeholder="Message" autocomplete="off">
      </div>
      <button class="wa-send-btn" id="sd" aria-label="Send">
        <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor"><path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z"/></svg>
      </button>
    </div>
  `;
  $("bk").onclick = panelList;
  $("px").onclick = closePanel;
  $("waUserHeader").onclick = () => { closePanel(); nav("profile"); openProfile(other); };
  $("at").onclick = () => $("fChat").click();
  $("sd").onclick = () => sendMsg();
  $("mi").onkeydown = e => { if (e.key == "Enter") sendMsg(); };
  loadMsgs(id);
  $("mi").focus();
}

function loadMsgs(id){
  unsubMsgs?.();
  unsubMsgs = onSnapshot(query(collection(db, "chats", id, "messages"), orderBy("createdAt")), s => {
    const el = $("msgs");
    if (!el || curChat?.id != id) return;
    el.innerHTML = "";
    if (s.empty) el.innerHTML = '<div class="empty wa-empty">Messages are end-to-end synced.<br>Say hi! 👋</div>';
    let lastDateStr = "";
    let lastSenderId = "";
    s.docs.forEach(d => {
      const m = d.data();
      const own = m.from == me.uid;
      const msgDate = m.createdAt ? new Date(ms(m.createdAt)) : new Date();
      const dateStr = msgDate.toDateString();
      if (dateStr !== lastDateStr) {
        lastDateStr = dateStr;
        lastSenderId = "";
        const divider = document.createElement("div");
        divider.className = "wa-date-divider";
        divider.innerHTML = `<span>${esc(formatDateDivider(msgDate))}</span>`;
        el.appendChild(divider);
      }
      const isFirstInGroup = m.from !== lastSenderId;
      lastSenderId = m.from;

      const b = document.createElement("div");
      b.className = "b wa-bubble" + (own ? " me" : "") + (isFirstInGroup ? " tail" : "");
      const tm = m.createdAt ? msgDate.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) : "…";
      const replyHtml = m.replyTo ? `
        <div class="wa-quoted-msg">
          <b>${esc(m.replyTo.fromName || "User")}</b>
          <span>${esc(m.replyTo.text || (m.replyTo.videoUrl ? "🎥 Video" : "📷 Photo"))}</span>
        </div>
      ` : "";
      const mediaHtml = m.videoUrl
        ? `<video class="wa-msg-video" data-vsrc="${esc(m.videoUrl)}" controls playsinline preload="metadata"></video>`
        : (m.imageUrl ? `<img class="wa-msg-img" src="${esc(m.imageUrl)}" alt="">` : "");
      const ticksHtml = own ? `<span class="wa-tick ${m.createdAt ? 'read' : ''}">✓✓</span>` : "";

      b.innerHTML = `
        ${replyHtml}
        ${mediaHtml}
        ${m.text ? `<span class="wa-msg-text">${esc(m.text)}</span>` : ""}
        <div class="wa-msg-meta">
          <small>${tm}${m.edited ? " · edited" : ""}</small>
          ${ticksHtml}
        </div>
        <div class="wa-msg-actions">
          <button type="button" class="wa-act-btn" data-reply title="Reply" aria-label="Reply">↩</button>
          ${own ? `<button type="button" class="wa-act-btn mm" title="Options" aria-label="Message options">${IC.more}</button>` : ""}
        </div>
      `;

      b.querySelector("[data-reply]").onclick = e => {
        e.stopPropagation();
        setReply({ text: m.text || "", fromName: m.fromName || (own ? me.username : "User"), imageUrl: m.imageUrl, videoUrl: m.videoUrl });
      };
      if (own) b.querySelector(".mm").onclick = e => { e.stopPropagation(); msgMenu(id, d.id, m); };
      const imgEl = b.querySelector(".wa-msg-img");
      if (imgEl) imgEl.onclick = () => fullView({ mediaUrl: m.imageUrl, username: m.fromName, caption: m.text || "" });
      b.querySelectorAll("video[data-vsrc]").forEach(v => loadVideoSrc(v, v.getAttribute("data-vsrc")));
      el.appendChild(b);
    });
    el.scrollTop = el.scrollHeight;
    setSeen(id, Date.now());
    updBadge();
    renderChatList();
  }, () => say("Couldn't load messages."));
}

function msgMenu(id,mid,m){
  const o = dlg("Message", `<button class="btn" data-ed ${m.text ? "" : "disabled"}>${IC.edit} Edit</button><button class="btn dng" data-del>${IC.trash} Delete</button>`, null);
  o.querySelector("[data-ed]").onclick = () => {
    o.remove();
    dlg("Edit message", `<input class="in" id="et" value="${esc(m.text)}">`, "Save", async d => {
      const t = d.querySelector("#et").value.trim();
      if (!t) return false;
      await updateDoc(doc(db, "chats", id, "messages", mid), { text: t, edited: true });
    });
  };
  o.querySelector("[data-del]").onclick = async () => {
    o.remove();
    if (!confirm("Delete this message?")) return;
    try { await deleteDoc(doc(db, "chats", id, "messages", mid)); } catch { say("Couldn't delete."); }
  };
}

async function sendMsg(file){
  const inp = $("mi");
  if (!inp || !curChat || !canAct()) return;
  const text = inp.value.trim();
  if (!text && !file) return;
  const { id, other } = curChat;
  const currentReply = replyTarget;
  inp.value = "";
  setReply(null);
  try {
    let imageUrl = "", videoUrl = "";
    if (file) {
      const isVid = file.type.startsWith("video/") || /\.(mp4|mov|webm)$/i.test(file.name);
      if (isVid) {
        say(file.size > 5 * 1024 * 1024 ? "Compressing & sending video…" : "Sending video…");
        const compressed = file.size > 5 * 1024 * 1024 ? await compressVideo(file) : file;
        videoUrl = imgUrl(await upload(compressed, { caption: "__chat__", tags: "__chat__" }));
      } else {
        say(file.size > 5 * 1024 * 1024 ? "Compressing & sending photo…" : "Sending photo…");
        const compressedImg = file.size > 5 * 1024 * 1024 ? await compressImage(file, 5 * 1024 * 1024) : file;
        imageUrl = imgUrl(await upload(compressedImg, { caption: "__chat__", tags: "__chat__" }));
      }
    }
    const msg = { text, from: me.uid, fromName: me.username, createdAt: serverTimestamp(), edited: false };
    if (imageUrl) msg.imageUrl = imageUrl;
    if (videoUrl) msg.videoUrl = videoUrl;
    if (currentReply) msg.replyTo = currentReply;
    await addDoc(collection(db, "chats", id, "messages"), msg);
    const op = await getUserProfile(other);
    const lastText = text || (videoUrl ? "🎥 Video" : "📷 Photo");
    await setDoc(doc(db, "chats", id), {
      users: [me.uid, other],
      usernames: { [me.uid]: me.username, [other]: op?.username || "" },
      profilePics: { [me.uid]: me.profilePic || "", [other]: op?.profilePic || "" },
      lastMessage: lastText,
      lastMessageTime: serverTimestamp(),
      lastSender: me.uid,
      lastSenderName: me.username
    }, { merge: true });
  } catch (e) {
    inp.value = text;
    say(navigator.onLine ? "Message not sent. Try again." : "You're offline — message not sent.");
  }
}
$("fChat").onchange=e=>{const f=e.target.files[0];e.target.value="";if(f)sendMsg(f)};
function updVerify(){$("vb").classList.toggle("hide",guest||!me||me.verified!==false||isDevUser(me))}
$("vRe").onclick=()=>busy($("vRe"),async()=>{await sendEmailVerification(auth.currentUser);mailSent("verify")});
$("vOk").onclick=()=>busy($("vOk"),async()=>{await auth.currentUser.reload();me.verified=auth.currentUser.emailVerified;updVerify();say(me.verified?"Email verified ✓":"Not verified yet. Open the link in your email first.")});

/* NAV */
function nav(v){
  ["Home","Search","Chat","Prof","Reels"].forEach(k=>$("n"+k)?.classList.remove("on"));
  $("home").classList.toggle("hide",v=="profile");
  $("profile").classList.toggle("hide",v!="profile");
  document.querySelectorAll(".desk-link").forEach(b=>b.classList.remove("active"));
  if(v=="profile"){
    $("nProf")?.classList.add("on");
    $("deskProf")?.classList.add("active");
    openProfile();
  } else if(v=="reels"){
    switchToReels();
  } else {
    if(feedTab === "reels"){
      feedTab = "foryou";
      $("tabForYou")?.classList.add("on");
      $("tabFollowing")?.classList.remove("on");
      $("tabReels")?.classList.remove("on");
    }
    $("nHome")?.classList.add("on");
    $("deskHome")?.classList.add("active");
    if(v=="search"){
      $("nHome")?.classList.remove("on");
      $("nSearch")?.classList.add("on");
      $("deskHome")?.classList.remove("active");
      $("deskSearch")?.classList.add("active");
      $("main").scrollTop=0;
      $("q")?.focus();
    }
  }
}
$("nHome").onclick=()=>{$("q").value="";nav("home");renderGallery()};
$("nSearch").onclick=()=>nav("search");
$("nPost").onclick=openUpload;
$("nReels").onclick=()=>switchToReels();
$("nChat").onclick=()=>{document.querySelectorAll(".desk-link").forEach(b=>b.classList.remove("active"));$("deskChat").classList.add("active");openPanel()};
$("chatBtn").onclick=()=>$("nChat").click();
$("nProf").onclick=()=>nav("profile");
$("deskHome").onclick=()=>$("nHome").click();
$("deskReels").onclick=()=>switchToReels();
$("deskSearch").onclick=()=>$("nSearch").click();
$("deskChat").onclick=()=>$("nChat").click();
$("deskPost").onclick=()=>$("nPost").click();
$("deskProf").onclick=()=>$("nProf").click();
$("deskSettings")?.addEventListener("click", openSettings);

let isRefreshingApp = false;
async function refreshAppFeed() {
  if (isRefreshingApp) return;
  isRefreshingApp = true;
  const rBtn = $("refreshBtn");
  rBtn?.classList.add("spinning");
  try {
    await loadImages();
    if (!$("profile")?.classList.contains("hide")) {
      await openProfile();
    }
    say("Updated ✓");
  } catch {
    say("Refresh failed. Check connection.");
  } finally {
    rBtn?.classList.remove("spinning");
    isRefreshingApp = false;
  }
}
$("refreshBtn")?.addEventListener("click", refreshAppFeed);

// Mobile Pull-to-Refresh on #main
(function setupPullToRefresh() {
  const mainEl = $("main");
  const ptr = $("ptrIndicator");
  const ptrText = $("ptrText");
  if (!mainEl || !ptr) return;
  let startY = 0, pulling = false, pullDist = 0;

  mainEl.addEventListener("touchstart", e => {
    if (mainEl.scrollTop <= 0 && !isRefreshingApp && e.touches.length === 1) {
      startY = e.touches[0].clientY;
      pulling = true;
      pullDist = 0;
    } else {
      pulling = false;
    }
  }, { passive: true });

  mainEl.addEventListener("touchmove", e => {
    if (!pulling || isRefreshingApp) return;
    const dy = e.touches[0].clientY - startY;
    if (dy > 8 && mainEl.scrollTop <= 0) {
      ptr.classList.remove("hide");
      pullDist = Math.min(88, dy * 0.55);
      ptr.style.height = pullDist + "px";
      ptr.style.opacity = Math.min(1, pullDist / 50);
      ptr.classList.toggle("ready", pullDist >= 56);
      if (ptrText) ptrText.textContent = pullDist >= 56 ? "Release to refresh" : "Pull to refresh";
    } else if (dy <= 0) {
      pulling = false;
      ptr.classList.add("hide");
      ptr.style.height = "0px";
      ptr.style.opacity = "0";
    }
  }, { passive: true });

  mainEl.addEventListener("touchend", async () => {
    if (!pulling) return;
    pulling = false;
    if (pullDist >= 56) {
      ptr.style.height = "46px";
      ptr.style.opacity = "1";
      ptr.classList.add("refreshing");
      if (ptrText) ptrText.textContent = "Refreshing…";
      await refreshAppFeed();
    }
    ptr.classList.remove("ready", "refreshing");
    ptr.classList.add("hide");
    ptr.style.height = "0px";
    ptr.style.opacity = "0";
    pullDist = 0;
  }, { passive: true });
})();
$("q").oninput=()=>{nav("home");renderGallery()};
addEventListener("online",()=>{$("off").classList.add("hide");if(ready)loadImages()});addEventListener("offline",()=>$("off").classList.remove("hide"));if(!navigator.onLine)$("off").classList.remove("hide");
