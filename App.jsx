import { useState, useEffect, useRef, useCallback } from "react";
import { db, auth, doc, setDoc, onSnapshot, firebaseSignIn, firebaseSignInAnon, firebaseLogout, onAuthStateChanged } from "./firebase.js";

// ── Constants ─────────────────────────────────────────────────────────────────
const DEFAULT_CATEGORIES = {
  "현악기": ["해금", "가야금", "거문고"],
  "관악기": ["대금 · 소금 · 단소", "피리"],
  "가악(歌樂)": ["판소리", "민요", "정가", "시조", "가야금 병창"],
  "타악": ["장구 · 북 · 꽹과리 · 징"],
  "유아·아동": ["유아 국악 프로그램", "초등 국악 프로그램"],
};
const DAYS = ["월","화","수","목","금","토","일"];
const ADMIN = { id:"admin", username:"admin", password:"rye2024", role:"admin", name:"관리자" };
const TODAY_STR = new Date().toISOString().slice(0,10);
const THIS_MONTH = TODAY_STR.slice(0,7);
const TODAY_DAY = ["일","월","화","수","목","금","토"][new Date().getDay()];
const ATT_STATUS = { present:"출석", absent:"결석", late:"지각", excused:"보강" };
const PAY_METHODS = { transfer:"계좌이체", cash:"현금", card:"카드" };

// ── Storage (Firestore — 실시간 크로스플랫폼 동기화) ─────────────────────────
const COLLECTION = "appData";
async function sSet(k,v){try{await setDoc(doc(db,COLLECTION,k),{value:v,updatedAt:Date.now()});}catch(e){console.error("sSet error:",k,e);}}

// ── Utils ─────────────────────────────────────────────────────────────────────
function calcAge(d){if(!d)return null;const t=new Date(),b=new Date(d);return t.getFullYear()-b.getFullYear()-((t.getMonth()<b.getMonth()||(t.getMonth()===b.getMonth()&&t.getDate()<b.getDate()))?1:0);}
function isMinor(d){const a=calcAge(d);return a!==null&&a<18;}
function getCat(inst,cats){for(const[c,arr]of Object.entries(cats))if(arr.includes(inst))return c;return"기타";}
function fmtDate(d){return d?new Date(d).toLocaleDateString("ko-KR"):"-";}
function fmtDateShort(d){if(!d)return"-";const x=new Date(d);return `${x.getMonth()+1}/${x.getDate()}`;}
function fmtDateTime(ts){if(!ts)return"-";const d=new Date(ts);return d.toLocaleDateString("ko-KR")+` ${d.getHours().toString().padStart(2,"0")}:${d.getMinutes().toString().padStart(2,"0")}`;}
function uid(){return Date.now().toString(36)+Math.random().toString(36).slice(2,6);}
function fmtPhone(v){const d=v.replace(/\D/g,"");if(d.startsWith("02")){if(d.length<=2)return d;if(d.length<=6)return d.slice(0,2)+"-"+d.slice(2);return d.slice(0,2)+"-"+d.slice(2,6)+"-"+d.slice(6,10);}if(d.length<=3)return d;if(d.length<=7)return d.slice(0,3)+"-"+d.slice(3);return d.slice(0,3)+"-"+d.slice(3,7)+"-"+d.slice(7,11);}
function fmtMoney(n){return n!=null?n.toLocaleString("ko-KR")+"원":"-";}
function allLessonInsts(s){return(s.lessons||[]).map(l=>l.instrument);}
function allLessonDays(s){const days=new Set();(s.lessons||[]).forEach(l=>(l.schedule||[]).forEach(x=>x.day&&days.add(x.day)));return Array.from(days);}
function canManageAll(role){return role==="admin"||role==="manager";}
function monthLabel(m){if(!m)return"-";const[y,mo]=m.split("-");return `${y}년 ${parseInt(mo)}월`;}
function generateStudentCode(){const chars="ABCDEFGHJKLMNPQRSTUVWXYZ23456789";let code="RK";for(let i=0;i<4;i++)code+=chars[Math.floor(Math.random()*chars.length)];return code;}
function getBirthPassword(birthDate){if(!birthDate)return"";const d=new Date(birthDate);const mm=String(d.getMonth()+1).padStart(2,"0");const dd=String(d.getDate()).padStart(2,"0");return mm+dd;}
function compressImage(file, maxWidth=360, quality=0.75) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement("canvas");
        const ratio = Math.min(maxWidth / img.width, 1);
        canvas.width = img.width * ratio;
        canvas.height = img.height * ratio;
        const ctx = canvas.getContext("2d");
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
        resolve(canvas.toDataURL("image/jpeg", quality));
      };
      img.onerror = reject;
      img.src = e.target.result;
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}
function printQR(qrImgUrl, regUrl) {
  const w = window.open("", "_blank");
  const html = "<html><head><title>RYE-K 등록 QR</title></head><body style='display:flex;flex-direction:column;align-items:center;justify-content:center;min-height:100vh;font-family:sans-serif'><h2>RYE-K K-Culture Center</h2><p>수강 등록 QR코드</p><img src='" + qrImgUrl + "' style='width:300px;height:300px'/><p style='font-size:12px;color:#999;margin-top:16px'>" + regUrl + "</p><script>window.print()<\/script></body></html>";
  w.document.write(html);
  w.document.close();
}

// ── Icons (simple SVG) ────────────────────────────────────────────────────────
const IC = {
  home: <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>,
  users: <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4-4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 00-3-3.87"/><path d="M16 3.13a4 4 0 010 7.75"/></svg>,
  check: <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M9 11l3 3L22 4"/><path d="M21 12v7a2 2 0 01-2 2H5a2 2 0 01-2-2V5a2 2 0 012-2h11"/></svg>,
  wallet: <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="1" y="4" width="22" height="16" rx="2"/><path d="M1 10h22"/></svg>,
  more: <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="1"/><circle cx="12" cy="5" r="1"/><circle cx="12" cy="19" r="1"/></svg>,
  x: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>,
  plus: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>,
  search: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><circle cx="11" cy="11" r="8"/><path d="M21 21l-4.35-4.35"/></svg>,
  back: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="15 18 9 12 15 6"/></svg>,
  edit: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"/><path d="M18.5 2.5a2.12 2.12 0 013 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>,
  cal: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>,
  menu: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="12" x2="21" y2="12"/><line x1="3" y1="18" x2="21" y2="18"/></svg>,
  teacher: <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>,
  bell: <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 8A6 6 0 006 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 01-3.46 0"/></svg>,
  settings: <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 010 2.83 2 2 0 01-2.83 0l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-4 0v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83-2.83l.06-.06A1.65 1.65 0 004.68 15a1.65 1.65 0 00-1.51-1H3a2 2 0 010-4h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 012.83-2.83l.06.06A1.65 1.65 0 009 4.68a1.65 1.65 0 001-1.51V3a2 2 0 014 0v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 2.83l-.06.06A1.65 1.65 0 0019.4 9a1.65 1.65 0 001.51 1H21a2 2 0 010 4h-.09a1.65 1.65 0 00-1.51 1z"/></svg>,
  logout: <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></svg>,
  phone: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 16.92v3a2 2 0 01-2.18 2 19.79 19.79 0 01-8.63-3.07 19.5 19.5 0 01-6-6 19.79 19.79 0 01-3.07-8.67A2 2 0 014.11 2h3a2 2 0 012 1.72 12.84 12.84 0 00.7 2.81 2 2 0 01-.45 2.11L8.09 9.91a16 16 0 006 6l1.27-1.27a2 2 0 012.11-.45 12.84 12.84 0 002.81.7A2 2 0 0122 16.92z"/></svg>,
  notif: <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 8A6 6 0 006 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 01-3.46 0"/></svg>,
  schedule: <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/><line x1="8" y1="14" x2="8" y2="14" strokeWidth="3"/><line x1="12" y1="14" x2="12" y2="14" strokeWidth="3"/><line x1="16" y1="14" x2="16" y2="14" strokeWidth="3"/></svg>,
  sun: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="5"/><line x1="12" y1="1" x2="12" y2="3"/><line x1="12" y1="21" x2="12" y2="23"/><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/><line x1="1" y1="12" x2="3" y2="12"/><line x1="21" y1="12" x2="23" y2="12"/><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/></svg>,
  moon: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 12.79A9 9 0 1111.21 3 7 7 0 0021 12.79z"/></svg>,
  parent: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 00-3-3.87"/><path d="M16 3.13a4 4 0 010 7.75"/></svg>,
};

// ── CSS (Mobile-First) ────────────────────────────────────────────────────────
const CSS = `
@import url('https://fonts.googleapis.com/css2?family=Noto+Serif+KR:wght@400;500;700&family=Noto+Sans+KR:wght@300;400;500;600;700&display=swap');
:root{
  --blue:#2B3A9F;--blue-dk:#1E2B7A;--blue-lt:#EEF1FF;--blue-md:#4A5BB8;
  --red:#E8281C;--red-dk:#C0201A;--red-lt:#FFF0EE;
  --gold:#F5A800;--gold-dk:#C88800;--gold-lt:#FFF8E6;
  --green:#1A7A40;--green-lt:#EDFAEF;
  --ink:#18181B;--ink-60:#52525B;--ink-30:#A1A1AA;--ink-10:#F4F4F5;
  --paper:#FFFFFF;--bg:#F5F6FA;--border:#E4E4E7;
  --shadow:0 1px 3px rgba(0,0,0,.06);--shadow-md:0 4px 16px rgba(0,0,0,.1);
  --radius:12px;--radius-sm:8px;--radius-lg:16px;
  --safe-b:env(safe-area-inset-bottom,0px);
  --nav-h:60px;--topbar-h:52px;
}
*{box-sizing:border-box;margin:0;padding:0;-webkit-tap-highlight-color:transparent}
body{font-family:'Noto Sans KR',system-ui,sans-serif;background:var(--bg);color:var(--ink);min-height:100vh;min-height:100dvh;overscroll-behavior:none;-webkit-font-smoothing:antialiased}
input,select,textarea,button{font-family:inherit}

/* ── Login ─────────────────────────────────────────────── */
.login-bg{min-height:100vh;min-height:100dvh;background:var(--bg);display:flex;align-items:center;justify-content:center;padding:20px}
.login-card{background:var(--paper);width:100%;max-width:380px;padding:36px 28px;border-radius:var(--radius-lg);box-shadow:var(--shadow-md);position:relative;overflow:hidden}
.login-card::before{content:'';position:absolute;top:0;left:0;right:0;height:3px;background:linear-gradient(90deg,var(--blue),var(--red),var(--gold))}
.login-logo{display:flex;align-items:center;gap:12px;margin-bottom:24px}
.login-logo-text .brand{font-family:'Noto Serif KR',serif;font-size:17px;font-weight:700;color:var(--blue)}
.login-logo-text .sub{font-size:9px;color:var(--ink-30);letter-spacing:2px;text-transform:uppercase;margin-top:2px}
.login-desc{font-size:13px;color:var(--ink-60);line-height:1.6;margin-bottom:24px}
.f-group{margin-bottom:14px}
.f-label{display:block;font-size:11px;font-weight:600;color:var(--ink-30);letter-spacing:.5px;margin-bottom:6px}
.f-inp{width:100%;padding:12px 14px;border:1.5px solid var(--border);border-radius:var(--radius-sm);font-size:15px;color:var(--ink);background:var(--bg);outline:none;transition:border .15s}
.f-inp:focus{border-color:var(--blue);background:var(--paper)}
.login-btn{width:100%;padding:14px;background:var(--blue);color:#fff;border:none;border-radius:var(--radius-sm);font-size:15px;font-weight:600;cursor:pointer;transition:background .15s;margin-top:8px}
.login-btn:hover{background:var(--blue-dk)}
.login-btn:disabled{opacity:.55;cursor:not-allowed}
.login-err{background:var(--red-lt);color:var(--red);padding:10px 14px;font-size:12.5px;margin-bottom:14px;border-radius:var(--radius-sm);border-left:3px solid var(--red)}

/* ── App Shell ─────────────────────────────────────────── */
.app-wrap{display:flex;flex-direction:column;min-height:100vh;min-height:100dvh}
.topbar{display:flex;align-items:center;padding:0 16px;padding-top:env(safe-area-inset-top,0px);height:calc(var(--topbar-h) + env(safe-area-inset-top,0px));background:var(--paper);border-bottom:1px solid var(--border);position:sticky;top:0;z-index:100;gap:10px;flex-shrink:0}
.topbar-title{font-family:'Noto Serif KR',serif;font-size:14px;font-weight:700;color:var(--blue);flex:1}
.topbar-btn{background:none;border:none;color:var(--ink-60);cursor:pointer;padding:6px;border-radius:8px;display:flex;align-items:center;justify-content:center;transition:background .12s}
.topbar-btn:hover{background:var(--ink-10)}
.main-scroll{flex:1;overflow-y:auto;-webkit-overflow-scrolling:touch;padding-bottom:calc(var(--nav-h) + var(--safe-b) + 16px)}
.main-content{padding:16px}

/* ── Bottom Nav ────────────────────────────────────────── */
.bnav{position:fixed;bottom:0;left:0;right:0;height:calc(var(--nav-h) + var(--safe-b));background:var(--paper);border-top:1px solid var(--border);display:flex;align-items:flex-start;padding-top:6px;padding-bottom:var(--safe-b);z-index:200;box-shadow:0 -2px 10px rgba(0,0,0,.04)}
body:has(.mb) .bnav{display:none!important}
.bnav-item{flex:1;display:flex;flex-direction:column;align-items:center;gap:2px;cursor:pointer;padding:4px 0;color:var(--ink-30);transition:color .12s;-webkit-user-select:none;user-select:none;position:relative}
.bnav-item.active{color:var(--blue)}
.bnav-item.active .bnav-dot{display:block}
.bnav-label{font-size:10px;font-weight:500;letter-spacing:-.2px}
.bnav-dot{display:none;position:absolute;top:-6px;left:50%;transform:translateX(-50%);width:4px;height:4px;border-radius:50%;background:var(--blue)}
.bnav-badge{position:absolute;top:-2px;right:50%;transform:translateX(calc(50% + 12px));background:var(--red);color:#fff;font-size:9px;font-weight:700;padding:1px 5px;border-radius:10px;min-width:16px;text-align:center;line-height:1.3}

/* ── Sidebar (Desktop) ─────────────────────────────────── */
.sidebar{display:none}

/* ── Page Header ───────────────────────────────────────── */
.ph{display:flex;align-items:center;justify-content:space-between;margin-bottom:16px;gap:12px}
.ph h1{font-family:'Noto Serif KR',serif;font-size:20px;font-weight:600;color:var(--ink)}
.ph-sub{font-size:12px;color:var(--ink-30);margin-top:2px}

/* ── Buttons ───────────────────────────────────────────── */
.btn{display:inline-flex;align-items:center;gap:6px;padding:10px 18px;border:none;border-radius:var(--radius-sm);font-size:13px;cursor:pointer;transition:all .12s;font-weight:500;white-space:nowrap;justify-content:center}
.btn-primary{background:var(--blue);color:#fff}
.btn-primary:hover{background:var(--blue-dk)}
.btn-primary:disabled{opacity:.5;cursor:not-allowed}
.btn-secondary{background:var(--ink-10);color:var(--ink-60)}
.btn-secondary:hover{background:var(--border)}
.btn-ghost{background:transparent;color:var(--ink-30);padding:8px 12px}
.btn-ghost:hover{color:var(--ink);background:var(--ink-10)}
.btn-danger{background:var(--red-lt);color:var(--red)}
.btn-danger:hover{background:#FAD5D0}
.btn-green{background:var(--green-lt);color:var(--green)}
.btn-green:hover{background:#d4f4e2}
.btn-gold{background:var(--gold-lt);color:var(--gold-dk)}
.btn-gold:hover{background:var(--gold);color:#fff}
.btn-sm{padding:7px 14px;font-size:12px}
.btn-xs{padding:5px 10px;font-size:11px;border-radius:6px}
.btn-full{width:100%}
.fab{position:fixed;bottom:calc(var(--nav-h) + var(--safe-b) + 16px);right:16px;width:52px;height:52px;border-radius:50%;background:var(--blue);color:#fff;border:none;box-shadow:0 4px 16px rgba(43,58,159,.35);display:flex;align-items:center;justify-content:center;cursor:pointer;z-index:150;transition:transform .15s}
.fab:active{transform:scale(.92)}

/* ── Cards ─────────────────────────────────────────────── */
.card{background:var(--paper);box-shadow:var(--shadow);border:1px solid var(--border);border-radius:var(--radius)}

/* ── Tags ──────────────────────────────────────────────── */
.tag{display:inline-flex;align-items:center;padding:3px 9px;font-size:11px;font-weight:500;border-radius:6px;white-space:nowrap}
.tag-minor{background:var(--blue-lt);color:var(--blue)}
.tag-adult{background:var(--green-lt);color:var(--green)}
.tag-cat{background:var(--ink-10);color:var(--ink-60)}
.tag-inst{background:var(--red-lt);color:var(--red)}
.tag-gold{background:var(--gold-lt);color:var(--gold-dk)}
.tag-blue{background:var(--blue-lt);color:var(--blue)}
.tag-green{background:var(--green-lt);color:var(--green)}
.tag-mgr{background:#F3E8FF;color:#7C3AED}

/* ── Avatar ────────────────────────────────────────────── */
.av{width:42px;height:42px;border-radius:50%;background:var(--blue-lt);display:flex;align-items:center;justify-content:center;font-family:'Noto Serif KR',serif;font-size:15px;font-weight:500;color:var(--blue-md);flex-shrink:0;overflow:hidden;border:2px solid var(--border)}
.av img{width:100%;height:100%;object-fit:cover}
.av-lg{width:64px;height:64px;font-size:22px}
.av-sm{width:34px;height:34px;font-size:12px}

/* ── Day chips ─────────────────────────────────────────── */
.day-row{display:flex;gap:4px;flex-wrap:wrap}
.day-chip{min-width:26px;height:26px;padding:0 6px;border-radius:13px;display:flex;align-items:center;justify-content:center;font-size:11px;color:var(--ink-30);background:var(--ink-10)}
.day-chip.on{background:var(--blue);color:#fff;font-weight:600}

/* ── Stats ─────────────────────────────────────────────── */
.stat-grid{display:grid;grid-template-columns:repeat(2,1fr);gap:10px;margin-bottom:20px}
.stat-card{background:var(--paper);padding:16px;border:1px solid var(--border);border-radius:var(--radius)}
.stat-num{font-family:'Noto Serif KR',serif;font-size:28px;font-weight:700;color:var(--blue);line-height:1;margin-bottom:2px}
.stat-label{font-size:11px;color:var(--ink-30)}
.stat-sub{font-size:10px;color:var(--red);margin-top:3px;font-weight:500}

/* ── Search ────────────────────────────────────────────── */
.srch-wrap{position:relative;margin-bottom:12px}
.srch-icon{position:absolute;left:12px;top:50%;transform:translateY(-50%);pointer-events:none;color:var(--ink-30)}
.srch-inp{width:100%;padding:11px 14px 11px 36px;border:1.5px solid var(--border);border-radius:var(--radius-sm);font-size:14px;color:var(--ink);background:var(--paper);outline:none;transition:border .12s}
.srch-inp:focus{border-color:var(--blue)}

/* ── Filter tabs (horizontal scroll) ───────────────────── */
.ftabs{display:flex;gap:6px;overflow-x:auto;-webkit-overflow-scrolling:touch;padding-bottom:4px;margin-bottom:12px;scrollbar-width:none}
.ftabs::-webkit-scrollbar{display:none}
.ftab{padding:7px 14px;font-size:12.5px;cursor:pointer;border:1.5px solid var(--border);background:var(--paper);color:var(--ink-30);transition:all .12s;font-family:inherit;border-radius:20px;white-space:nowrap;flex-shrink:0}
.ftab:hover{border-color:var(--blue);color:var(--blue)}
.ftab.active{background:var(--blue);border-color:var(--blue);color:#fff}

/* ── Student Cards ─────────────────────────────────────── */
.s-grid{display:grid;grid-template-columns:1fr;gap:10px}
.s-card{background:var(--paper);padding:14px 16px;border:1px solid var(--border);cursor:pointer;transition:all .12s;border-radius:var(--radius);display:flex;align-items:center;gap:12px}
.s-card:active{background:var(--blue-lt);transform:scale(.99)}
.s-card-info{flex:1;min-width:0}
.s-name{font-size:14.5px;font-weight:600;color:var(--ink)}
.s-inst{font-size:11.5px;color:var(--blue);font-weight:500;margin-top:1px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.s-meta{font-size:11px;color:var(--ink-30);margin-top:3px;display:flex;gap:8px;align-items:center}

/* ── Category headers ──────────────────────────────────── */
.cat-hd{display:flex;align-items:center;gap:8px;margin:20px 0 10px;padding-bottom:8px;border-bottom:1px solid var(--border)}
.cat-hd-line{width:3px;height:14px;flex-shrink:0;background:linear-gradient(180deg,var(--blue),var(--gold));border-radius:2px}
.cat-title{font-family:'Noto Serif KR',serif;font-size:13.5px;font-weight:500;color:var(--ink)}
.cat-count{font-size:10.5px;color:var(--blue);font-weight:600;background:var(--blue-lt);padding:2px 8px;border-radius:10px}

/* ── Modal (full-screen on mobile) ─────────────────────── */
.mb{position:fixed;inset:0;background:rgba(0,0,0,.4);z-index:500;display:flex;align-items:flex-end;justify-content:center}
.modal{background:var(--paper);width:100%;max-height:95vh;max-height:95dvh;overflow-y:auto;-webkit-overflow-scrolling:touch;border-radius:var(--radius-lg) var(--radius-lg) 0 0;animation:slideUp .25s ease}
@keyframes slideUp{from{transform:translateY(100%)}to{transform:translateY(0)}}
.modal-h{display:flex;align-items:center;justify-content:space-between;padding:16px 20px;border-bottom:1px solid var(--border);position:sticky;top:0;background:var(--paper);z-index:2;border-radius:var(--radius-lg) var(--radius-lg) 0 0}
.modal-h h2{font-family:'Noto Serif KR',serif;font-size:16px;font-weight:600;color:var(--ink)}
.modal-close{background:none;border:none;color:var(--ink-30);cursor:pointer;padding:4px;display:flex;align-items:center;transition:color .12s}
.modal-close:hover{color:var(--ink)}
.modal-b{padding:20px;padding-bottom:120px;overflow-x:hidden}
.modal-f{display:flex;gap:8px;padding:14px 20px;border-top:1px solid var(--border);position:sticky;bottom:0;background:var(--paper);padding-bottom:calc(24px + var(--safe-b));z-index:3}
.modal-f .btn{flex:1}

/* ── Form elements ─────────────────────────────────────── */
.fg{margin-bottom:14px}
.fg-label{display:block;font-size:11px;font-weight:600;color:var(--ink-30);letter-spacing:.4px;margin-bottom:6px}
.req{color:var(--red)}
.inp{width:100%;padding:11px 14px;border:1.5px solid var(--border);border-radius:var(--radius-sm);font-size:14.5px;color:var(--ink);background:var(--bg);outline:none;transition:border .12s}
.inp:focus{border-color:var(--blue);background:var(--paper)}
.inp:disabled{opacity:.5;cursor:not-allowed;background:var(--ink-10)}
textarea.inp{resize:vertical;min-height:80px;line-height:1.6}
.sel{width:100%;padding:11px 14px;border:1.5px solid var(--border);border-radius:var(--radius-sm);font-size:14.5px;color:var(--ink);background:var(--bg);outline:none;cursor:pointer;appearance:none;background-image:url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='10' height='7'%3E%3Cpath fill='%23a1a1aa' d='M5 7L0 0h10z'/%3E%3C/svg%3E");background-repeat:no-repeat;background-position:right 14px center}
.fg-row{display:grid;grid-template-columns:1fr 1fr;gap:12px}
.divider{height:1px;background:var(--border);margin:16px 0}
.section-label{font-size:11px;font-weight:600;color:var(--ink-30);letter-spacing:.6px;text-transform:uppercase;margin-bottom:10px}
.form-err{background:var(--red-lt);color:var(--red);padding:10px 14px;font-size:12.5px;margin-bottom:14px;border-radius:var(--radius-sm);border-left:3px solid var(--red)}

/* ── Photo upload ──────────────────────────────────────── */
.photo-area{display:flex;align-items:center;gap:14px;margin-bottom:16px}
.photo-hint{font-size:10.5px;color:var(--ink-30);margin-top:3px}
.file-inp{display:none}

/* ── Instrument selector ───────────────────────────────── */
.inst-select-grid{display:grid;grid-template-columns:1fr 1fr;gap:5px;margin-top:4px}
.inst-check{display:flex;align-items:center;gap:7px;padding:9px 10px;border:1.5px solid var(--border);cursor:pointer;transition:all .12s;background:var(--paper);user-select:none;font-size:12.5px;color:var(--ink-60);border-radius:var(--radius-sm)}
.inst-check:hover{border-color:var(--blue);color:var(--blue)}
.inst-check.checked{border-color:var(--blue);background:var(--blue-lt);color:var(--blue);font-weight:500}
.inst-check-box{width:16px;height:16px;border:1.5px solid var(--border);border-radius:4px;flex-shrink:0;display:flex;align-items:center;justify-content:center;font-size:10px;transition:all .12s}
.inst-check.checked .inst-check-box{background:var(--blue);border-color:var(--blue);color:#fff}

/* ── Lesson editor ─────────────────────────────────────── */
.lesson-item{background:var(--bg);border:1px solid var(--border);padding:12px;margin-bottom:8px;border-radius:var(--radius-sm)}
.lesson-item-head{display:flex;align-items:center;justify-content:space-between;margin-bottom:8px}
.lesson-inst-label{font-size:13px;font-weight:600;color:var(--blue)}
.schedule-row{display:flex;align-items:center;gap:5px;margin-bottom:6px;flex-wrap:wrap}
.sch-day-btn{padding:6px 10px;font-size:12px;border:1.5px solid var(--border);background:var(--paper);cursor:pointer;transition:all .12s;font-family:inherit;color:var(--ink-60);border-radius:6px;min-width:36px;text-align:center}
.sch-day-btn.on{background:var(--blue);border-color:var(--blue);color:#fff}
.time-inp{padding:8px 10px;border:1.5px solid var(--border);border-radius:6px;font-family:inherit;font-size:13px;color:var(--ink);background:var(--paper);outline:none;width:100%;max-width:100%;box-sizing:border-box}
.time-inp:focus{border-color:var(--blue)}
.add-sch-btn{font-size:11.5px;color:var(--blue);background:none;border:1px dashed rgba(43,58,159,.3);padding:6px 12px;cursor:pointer;font-family:inherit;margin-top:4px;transition:all .12s;border-radius:6px}
.add-sch-btn:hover{background:var(--blue-lt)}
.rm-btn{background:none;border:none;color:var(--ink-30);font-size:18px;cursor:pointer;line-height:1;padding:4px;transition:color .12s;flex-shrink:0}
.rm-btn:hover{color:var(--red)}

/* ── Detail view ───────────────────────────────────────── */
.det-head{display:flex;align-items:flex-start;gap:14px;padding:20px;border-bottom:1px solid var(--border)}
.det-name{font-family:'Noto Serif KR',serif;font-size:18px;font-weight:600;margin-bottom:6px;color:var(--ink)}
.info-grid{display:grid;grid-template-columns:1fr 1fr}
.ii{padding:12px 20px;border-bottom:1px solid var(--ink-10)}
.ii-label{font-size:10px;color:var(--ink-30);letter-spacing:.5px;text-transform:uppercase;margin-bottom:3px}
.ii-val{font-size:13.5px;color:var(--ink)}
.notes-box{background:var(--bg);padding:12px;font-size:13px;color:var(--ink-60);line-height:1.7;min-height:40px;white-space:pre-wrap;border:1px solid var(--border);border-radius:var(--radius-sm)}
.lesson-detail-row{padding:10px 20px;border-bottom:1px solid var(--ink-10)}
.lesson-detail-inst{font-size:13px;font-weight:600;color:var(--blue);margin-bottom:5px;display:flex;align-items:center;gap:6px}
.sched-chip{background:var(--blue-lt);color:var(--blue);padding:4px 10px;font-size:11.5px;font-weight:500;display:inline-flex;align-items:center;gap:3px;margin:2px;border-radius:6px}
.sched-chip-time{color:var(--gold-dk);font-weight:400}

/* ── Confirm/Delete bars ───────────────────────────────── */
.confirm-bar{background:#FFFBF0;border-top:1px solid var(--gold);padding:14px 20px calc(14px + var(--safe-b));display:flex;align-items:center;justify-content:space-between;gap:10px;position:sticky;bottom:0}
.confirm-bar-msg{font-size:13px;color:var(--ink-60);flex:1}
.confirm-bar-msg strong{color:var(--ink);font-weight:600}
.delete-confirm-bar{background:var(--red-lt);border-top:1px solid var(--red);padding:14px 20px calc(14px + var(--safe-b));display:flex;align-items:center;justify-content:space-between;gap:10px;position:sticky;bottom:0}
.delete-confirm-bar-msg{font-size:13px;color:var(--red);flex:1}

/* ── Dashboard ─────────────────────────────────────────── */
.dash-section{margin-bottom:20px}
.dash-card{background:var(--paper);border:1px solid var(--border);border-radius:var(--radius);padding:16px;margin-bottom:12px}
.dash-card-title{font-family:'Noto Serif KR',serif;font-size:14px;font-weight:500;color:var(--ink);display:flex;align-items:center;gap:8px;margin-bottom:12px}
.dash-card-title::before{content:'';width:3px;height:14px;background:linear-gradient(180deg,var(--blue),var(--gold));display:block;flex-shrink:0;border-radius:2px}

/* ── Notices ───────────────────────────────────────────── */
.notice-card{border:1px solid var(--border);padding:14px 16px;margin-bottom:8px;background:var(--paper);cursor:pointer;transition:all .12s;border-radius:var(--radius)}
.notice-card:active{background:var(--blue-lt)}
.notice-card.pinned{border-left:3px solid var(--gold);background:var(--gold-lt)}
.notice-title{font-size:14px;font-weight:600;color:var(--ink);margin-bottom:3px;display:flex;align-items:center;gap:6px}
.notice-meta{font-size:11px;color:var(--ink-30)}
.notice-body{font-size:13px;color:var(--ink-60);line-height:1.65;margin-top:8px;white-space:pre-wrap}
.pin-icon{font-size:12px}

/* ── Empty state ───────────────────────────────────────── */
.empty{text-align:center;padding:48px 20px;color:var(--ink-30)}
.empty-icon{font-size:36px;margin-bottom:10px;opacity:.3}
.empty-txt{font-size:13px}

/* ── Toast ─────────────────────────────────────────────── */
.toast{position:fixed;top:calc(var(--topbar-h) + 8px);left:50%;transform:translateX(-50%);background:var(--blue-dk);color:#fff;padding:10px 20px;font-size:13px;z-index:9999;animation:toastIn .25s ease;border-radius:var(--radius-sm);box-shadow:var(--shadow-md);white-space:nowrap;max-width:90vw}
@keyframes toastIn{from{opacity:0;transform:translateX(-50%) translateY(-8px)}to{opacity:1;transform:translateX(-50%) translateY(0)}}
@keyframes logoPulse{0%{opacity:.4;transform:scale(.92)}50%{opacity:1;transform:scale(1)}100%{opacity:.4;transform:scale(.92)}}
@keyframes logoLine{0%{width:0}50%{width:100%}100%{width:0}}
.loading-wrap{min-height:100vh;min-height:100dvh;display:flex;flex-direction:column;align-items:center;justify-content:center;background:#fff;gap:20px}
.loading-logo{animation:logoPulse 2s ease-in-out infinite}
.loading-bar{width:60px;height:3px;background:var(--blue-lt);border-radius:3px;overflow:hidden;position:relative}
.loading-bar::after{content:'';position:absolute;left:0;top:0;height:100%;background:linear-gradient(90deg,var(--blue),var(--gold),var(--red));border-radius:3px;animation:logoLine 2s ease-in-out infinite}
.photo-upload{position:relative;cursor:pointer}
.photo-upload-overlay{position:absolute;bottom:0;right:0;width:24px;height:24px;background:var(--blue);border-radius:50%;display:flex;align-items:center;justify-content:center;box-shadow:0 2px 6px rgba(0,0,0,.15);border:2px solid var(--paper)}
@keyframes logoBreath{0%{opacity:.3;transform:scale(.92)}50%{opacity:1;transform:scale(1)}100%{opacity:.3;transform:scale(.92)}}
@keyframes loadFadeIn{from{opacity:0}to{opacity:1}}
.loading-screen{min-height:100vh;min-height:100dvh;display:flex;flex-direction:column;align-items:center;justify-content:center;background:#fff;gap:16px;animation:loadFadeIn .3s ease}
.loading-logo{animation:logoBreath 1.8s ease-in-out infinite}
.loading-text{font-size:11px;color:#A1A1AA;letter-spacing:2px;animation:loadFadeIn .5s ease .3s both}

/* ── Attendance ─────────────────────────────────────────── */
.att-row{display:flex;align-items:center;gap:10px;padding:12px 14px;background:var(--paper);border:1px solid var(--border);border-radius:var(--radius);margin-bottom:8px}
.att-btns{display:flex;gap:4px;margin-left:auto;flex-shrink:0}
.att-btn{min-width:44px;height:42px;border-radius:8px;border:1.5px solid var(--border);background:var(--paper);cursor:pointer;display:flex;flex-direction:column;align-items:center;justify-content:center;transition:all .12s;color:var(--ink-30);gap:1px;padding:2px 6px}
.att-btn .att-icon{font-size:15px;line-height:1}
.att-btn .att-label{font-size:9px;font-weight:500;letter-spacing:-.3px}
.att-btn:active{transform:scale(.92)}
.att-btn.present{background:var(--green-lt);border-color:var(--green);color:var(--green)}
.att-btn.absent{background:var(--red-lt);border-color:var(--red);color:var(--red)}
.att-btn.late{background:var(--gold-lt);border-color:var(--gold);color:var(--gold-dk)}
.att-btn.excused{background:var(--blue-lt);border-color:var(--blue);color:var(--blue)}
.att-summary{display:flex;gap:8px;flex-wrap:wrap;margin-bottom:12px}
.att-stat{padding:6px 12px;border-radius:8px;font-size:12px;font-weight:600;display:flex;align-items:center;gap:4px}

/* ── Payments ──────────────────────────────────────────── */
.pay-row{display:flex;align-items:center;gap:10px;padding:12px 14px;background:var(--paper);border:1px solid var(--border);border-radius:var(--radius);margin-bottom:8px;cursor:pointer;transition:background .1s}
.pay-row:active{background:var(--ink-10)}
.pay-amount{font-family:'Noto Serif KR',serif;font-size:14px;font-weight:600;color:var(--ink);margin-left:auto;text-align:right;flex-shrink:0}
.pay-status{font-size:11px;margin-top:1px}
.pay-status.paid{color:var(--green)}
.pay-status.unpaid{color:var(--red)}
.pay-summary-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:8px;margin-bottom:16px}
.pay-summary-card{background:var(--paper);border:1px solid var(--border);border-radius:var(--radius);padding:12px;text-align:center}
.pay-summary-num{font-family:'Noto Serif KR',serif;font-size:18px;font-weight:700;line-height:1.2}
.pay-summary-label{font-size:10px;color:var(--ink-30);margin-top:2px}

/* ── Activity log ──────────────────────────────────────── */
.log-item{display:flex;gap:10px;padding:10px 0;border-bottom:1px solid var(--ink-10);align-items:flex-start}
.log-dot{width:8px;height:8px;border-radius:50%;background:var(--blue);flex-shrink:0;margin-top:5px}
.log-msg{font-size:12.5px;color:var(--ink-60);flex:1}
.log-msg strong{color:var(--ink);font-weight:600}
.log-time{font-size:10.5px;color:var(--ink-30);flex-shrink:0}

/* ── Table (teachers on desktop) ───────────────────────── */
.tbl{width:100%;border-collapse:collapse}
.tbl th{text-align:left;font-size:10.5px;font-weight:600;color:var(--ink-30);letter-spacing:.6px;padding:10px 14px;border-bottom:1.5px solid var(--border);text-transform:uppercase}
.tbl td{padding:10px 14px;font-size:13px;border-bottom:1px solid var(--ink-10);vertical-align:middle}
.tbl tbody tr{cursor:pointer;transition:background .1s}
.tbl tbody tr:active td{background:var(--blue-lt)}

/* ── More menu items ───────────────────────────────────── */
.menu-item{display:flex;align-items:center;gap:14px;padding:14px 16px;background:var(--paper);border:1px solid var(--border);border-radius:var(--radius);margin-bottom:8px;cursor:pointer;transition:background .1s;color:var(--ink)}
.menu-item:active{background:var(--ink-10)}
.menu-item-label{font-size:14px;font-weight:500;flex:1}
.menu-item-desc{font-size:11.5px;color:var(--ink-30)}
.menu-item-arrow{color:var(--ink-30);font-size:16px}

/* ── Desktop overrides ─────────────────────────────────── */
@media(min-width:768px){
  .bnav{display:none}
  .sidebar{display:flex;width:220px;background:var(--blue-dk);min-height:100vh;flex-direction:column;position:fixed;top:0;left:0;z-index:200}
  .app-wrap{flex-direction:row}
  .main-scroll{margin-left:220px;padding-bottom:16px}
  .main-content{padding:28px 36px;max-width:960px}
  .topbar{display:none}
  .modal{max-width:600px;max-height:90vh;border-radius:var(--radius-lg);margin:auto;animation:fadeScale .2s ease}
  .mb{align-items:center}
  @keyframes fadeScale{from{opacity:0;transform:scale(.96)}to{opacity:1;transform:scale(1)}}
  .modal-f{padding-bottom:14px}
  .confirm-bar,.delete-confirm-bar{padding-bottom:14px}
  .s-grid{grid-template-columns:repeat(auto-fill,minmax(300px,1fr))}
  .stat-grid{grid-template-columns:repeat(4,1fr)}
  .fab{bottom:24px;right:24px}
  .fg-row{grid-template-columns:1fr 1fr}
  .info-grid{grid-template-columns:1fr 1fr}
  .inst-select-grid{grid-template-columns:repeat(3,1fr)}
}

/* ── Sidebar internals (desktop) ───────────────────────── */
.sb-head{padding:20px 18px;border-bottom:1px solid rgba(255,255,255,.08)}
.sb-logo{display:flex;align-items:center;gap:10px}
.sb-logo-text .rye{font-family:'Noto Serif KR',serif;font-size:15px;font-weight:700;color:#fff}
.sb-logo-text .sub{font-size:8px;color:rgba(255,255,255,.3);letter-spacing:1.8px;text-transform:uppercase;margin-top:1px}
.sb-logo-text .ko{font-size:9.5px;color:rgba(255,255,255,.2);margin-top:3px}
.sb-section{font-size:9px;color:rgba(255,255,255,.18);letter-spacing:1.8px;text-transform:uppercase;padding:16px 18px 4px}
.sb-item{display:flex;align-items:center;gap:9px;padding:10px 18px;font-size:13px;color:rgba(255,255,255,.45);cursor:pointer;transition:all .12s;position:relative}
.sb-item:hover{color:rgba(255,255,255,.9);background:rgba(255,255,255,.06)}
.sb-item.active{color:#fff;background:rgba(255,255,255,.1)}
.sb-item.active::before{content:'';position:absolute;left:0;top:50%;transform:translateY(-50%);width:2.5px;height:16px;background:var(--gold);border-radius:2px}
.sb-badge{margin-left:auto;background:rgba(245,168,0,.2);color:var(--gold);font-size:10px;font-weight:600;padding:1px 8px;border-radius:10px;min-width:22px;text-align:center}
.sb-foot{margin-top:auto;padding:16px 18px;border-top:1px solid rgba(255,255,255,.07)}
.sb-user-name{font-size:13px;color:rgba(255,255,255,.7);margin-bottom:1px;font-weight:500}
.sb-user-role{font-size:10px;color:rgba(255,255,255,.28);margin-bottom:10px}
.sb-logout{background:none;border:1px solid rgba(255,255,255,.1);color:rgba(255,255,255,.3);font-family:inherit;font-size:11px;padding:8px;cursor:pointer;transition:all .15s;width:100%;border-radius:var(--radius-sm)}
.sb-logout:hover{border-color:rgba(255,255,255,.3);color:rgba(255,255,255,.6)}

/* ── Mobile-specific tweaks ────────────────────────────── */
@media(max-width:767px){
  .fg-row{grid-template-columns:1fr}
  .info-grid{grid-template-columns:1fr}
  .pay-summary-grid{grid-template-columns:repeat(3,1fr)}
  .tbl-hide-mobile{display:none}
}

/* ── Dark Mode ──────────────────────────────────────────── */
[data-theme="dark"]{
  --paper:#1E1F28;--bg:#13141A;--border:#2D2E3A;
  --ink:#E8E8F0;--ink-60:#9090A8;--ink-30:#52526A;--ink-10:#24252F;
  --shadow:0 1px 3px rgba(0,0,0,.3);--shadow-md:0 4px 16px rgba(0,0,0,.4);
  --blue-lt:rgba(43,58,159,.18);--blue-md:#6270CC;
  --red-lt:rgba(232,40,28,.14);--gold-lt:rgba(245,168,0,.14);
  --green-lt:rgba(26,122,64,.14);
}
@media(prefers-color-scheme:dark){
  :root:not([data-theme="light"]){
    --paper:#1E1F28;--bg:#13141A;--border:#2D2E3A;
    --ink:#E8E8F0;--ink-60:#9090A8;--ink-30:#52526A;--ink-10:#24252F;
    --shadow:0 1px 3px rgba(0,0,0,.3);--shadow-md:0 4px 16px rgba(0,0,0,.4);
    --blue-lt:rgba(43,58,159,.18);--blue-md:#6270CC;
    --red-lt:rgba(232,40,28,.14);--gold-lt:rgba(245,168,0,.14);
    --green-lt:rgba(26,122,64,.14);
  }
}
.dark-toggle{display:flex;align-items:center;gap:8px;padding:10px 14px;background:var(--ink-10);border-radius:var(--radius-sm);cursor:pointer;border:none;font-family:inherit;font-size:13px;color:var(--ink-60);width:100%;transition:background .12s}
.dark-toggle:hover{background:var(--border)}
.dark-toggle-track{width:40px;height:22px;border-radius:11px;background:var(--border);position:relative;transition:background .2s;flex-shrink:0;margin-left:auto}
.dark-toggle-track.on{background:var(--blue)}
.dark-toggle-thumb{width:18px;height:18px;border-radius:50%;background:#fff;position:absolute;top:2px;left:2px;transition:transform .2s;box-shadow:0 1px 3px rgba(0,0,0,.2)}
.dark-toggle-track.on .dark-toggle-thumb{transform:translateX(18px)}

/* ── Notifications ──────────────────────────────────────── */
.notif-card{background:var(--paper);border:1px solid var(--border);border-radius:var(--radius);margin-bottom:12px;overflow:hidden}
.notif-hd{display:flex;align-items:center;gap:8px;padding:14px 16px;border-bottom:1px solid var(--border)}
.notif-hd-title{font-family:'Noto Serif KR',serif;font-size:14px;font-weight:500;flex:1}
.notif-badge{background:var(--red);color:#fff;font-size:10px;font-weight:700;padding:2px 7px;border-radius:10px;min-width:18px;text-align:center}
.notif-item{display:flex;align-items:flex-start;gap:10px;padding:10px 16px;border-bottom:1px solid var(--ink-10)}
.notif-item:last-child{border-bottom:none}
.notif-dot{width:8px;height:8px;border-radius:50%;flex-shrink:0;margin-top:4px}
.notif-dot.red{background:var(--red)}
.notif-dot.gold{background:var(--gold)}
.notif-dot.blue{background:var(--blue)}
.notif-dot.green{background:var(--green)}
.notif-text{font-size:12.5px;color:var(--ink-60);flex:1;line-height:1.5}
.notif-text strong{color:var(--ink);font-weight:600}

/* ── Parent Portal ──────────────────────────────────────── */
.parent-wrap{min-height:100vh;min-height:100dvh;background:var(--bg);font-family:'Noto Sans KR',system-ui,sans-serif}
.parent-topbar{background:var(--blue-dk);padding:16px 20px;display:flex;align-items:center;gap:12px}
.parent-topbar-title{color:#fff;font-family:'Noto Serif KR',serif;font-size:15px;font-weight:600;flex:1}
.parent-topbar-sub{color:rgba(255,255,255,.5);font-size:10px;letter-spacing:1.5px;text-transform:uppercase;margin-top:1px}
.parent-content{padding:16px;max-width:640px;margin:0 auto}
.parent-section{margin-bottom:20px}
.parent-section-title{font-family:'Noto Serif KR',serif;font-size:13px;font-weight:500;color:var(--ink);margin-bottom:10px;display:flex;align-items:center;gap:6px}
.parent-section-title::before{content:'';width:3px;height:13px;background:linear-gradient(180deg,var(--blue),var(--gold));border-radius:2px;display:block;flex-shrink:0}
.parent-att-row{display:flex;align-items:center;gap:10px;padding:10px 14px;background:var(--paper);border:1px solid var(--border);border-radius:var(--radius);margin-bottom:6px}
.parent-att-date{font-size:12px;color:var(--ink-60);width:72px;flex-shrink:0}
.parent-att-status{font-size:12px;font-weight:600;width:36px;flex-shrink:0}
.parent-att-note{font-size:11.5px;color:var(--ink-60);flex:1;font-style:italic}
.parent-pay-row{display:flex;align-items:center;padding:10px 14px;background:var(--paper);border:1px solid var(--border);border-radius:var(--radius);margin-bottom:6px;gap:10px}
.parent-readonly-badge{background:var(--gold-lt);color:var(--gold-dk);font-size:10px;font-weight:600;padding:3px 10px;border-radius:10px;letter-spacing:.3px}

/* ── Schedule / Calendar ────────────────────────────────── */
.sched-wrap{padding-bottom:16px}
.sched-toolbar{display:flex;align-items:center;gap:8px;margin-bottom:14px;flex-wrap:wrap}
.sched-mode-btn{padding:7px 14px;font-size:12.5px;cursor:pointer;border:1.5px solid var(--border);background:var(--paper);color:var(--ink-30);transition:all .12s;font-family:inherit;border-radius:20px;white-space:nowrap}
.sched-mode-btn.active{background:var(--blue);border-color:var(--blue);color:#fff}
.sched-nav{display:flex;align-items:center;gap:4px;margin-left:auto}
.sched-nav-btn{width:32px;height:32px;border:1px solid var(--border);background:var(--paper);border-radius:8px;cursor:pointer;display:flex;align-items:center;justify-content:center;color:var(--ink-60);font-size:16px;transition:background .12s}
.sched-nav-btn:hover{background:var(--ink-10)}
.sched-day-section{margin-bottom:16px}
.sched-day-hd{display:flex;align-items:center;gap:8px;padding:8px 0;margin-bottom:8px;border-bottom:2px solid var(--border)}
.sched-day-name{font-family:'Noto Serif KR',serif;font-size:14px;font-weight:600;color:var(--ink)}
.sched-day-date{font-size:11px;color:var(--ink-30)}
.sched-day-hd.today .sched-day-name{color:var(--blue)}
.sched-day-hd.today .sched-day-date{color:var(--blue);font-weight:600}
.sched-lesson{display:flex;align-items:center;gap:10px;padding:10px 14px;background:var(--paper);border:1px solid var(--border);border-radius:var(--radius-sm);margin-bottom:6px;border-left:3px solid var(--blue)}
.sched-lesson.makeup{border-left-color:var(--gold)}
.sched-time{font-size:12px;color:var(--ink-60);width:44px;flex-shrink:0;font-variant-numeric:tabular-nums}
.sched-info{flex:1;min-width:0}
.sched-name{font-size:13px;font-weight:600;color:var(--ink)}
.sched-inst{font-size:11px;color:var(--blue);margin-top:1px}
.sched-teacher{font-size:11px;color:var(--ink-30);margin-top:1px}
.sched-makeup-badge{background:var(--gold-lt);color:var(--gold-dk);font-size:10px;font-weight:600;padding:2px 8px;border-radius:6px;flex-shrink:0}
.sched-empty{background:var(--paper);border:1px solid var(--border);border-radius:var(--radius);padding:14px 16px;font-size:12px;color:var(--ink-30);text-align:center}
.teacher-color-dot{width:8px;height:8px;border-radius:50%;flex-shrink:0}
.sched-filter{padding:7px 12px;border:1.5px solid var(--border);border-radius:var(--radius-sm);font-size:12.5px;color:var(--ink);background:var(--paper);outline:none;cursor:pointer;font-family:inherit}
.sched-month-grid{display:grid;grid-template-columns:repeat(7,1fr);gap:2px;margin-bottom:16px}
.sched-month-hd{text-align:center;font-size:10px;font-weight:600;color:var(--ink-30);padding:4px 0}
.sched-month-cell{min-height:52px;background:var(--paper);border:1px solid var(--border);border-radius:6px;padding:4px;cursor:pointer;transition:background .1s;position:relative}
.sched-month-cell:hover{background:var(--blue-lt)}
.sched-month-cell.today{border-color:var(--blue);border-width:2px}
.sched-month-cell.other-month{opacity:.35}
.sched-month-cell-day{font-size:11px;font-weight:500;color:var(--ink-60);margin-bottom:2px}
.sched-month-cell.today .sched-month-cell-day{color:var(--blue);font-weight:700}
.sched-month-dots{display:flex;flex-wrap:wrap;gap:2px;margin-top:2px}
.sched-month-dot{width:5px;height:5px;border-radius:50%;background:var(--blue)}
.sched-month-count{font-size:9px;color:var(--blue);font-weight:600}
`;

// ── Real Logo ─────────────────────────────────────────────────────────────────
const LOGO_URI = "data:image/png;base64,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";
function Logo({ size = 40 }) {
  return <img src="/logo.png" alt="RYE-K" style={{width:size,height:size,objectFit:"contain"}}/>;
}
function Av({ photo, name, size = "" }) {
  return (<div className={`av ${size}`}>{photo ? <img src={photo} alt={name} /> : (name ? name.slice(0, 1) : "?")}</div>);
}
function PhotoUpload({ photo, name, size="av-lg", onUpload }) {
  const ref = useRef(null);
  const handleFile = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const compressed = await compressImage(file, 360, 0.75);
      onUpload(compressed);
    } catch (err) { console.error("Photo compress error:", err); }
  };
  return (
    <div style={{position:"relative",cursor:"pointer"}} onClick={() => ref.current?.click()}>
      <Av photo={photo} name={name} size={size} />
      <div style={{position:"absolute",bottom:-2,right:-2,width:22,height:22,borderRadius:"50%",background:"var(--blue)",color:"#fff",display:"flex",alignItems:"center",justifyContent:"center",fontSize:12,border:"2px solid var(--paper)",lineHeight:1}}>
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M23 19a2 2 0 01-2 2H3a2 2 0 01-2-2V8a2 2 0 012-2h4l2-3h6l2 3h4a2 2 0 012 2z"/><circle cx="12" cy="13" r="4"/></svg>
      </div>
      <input ref={ref} type="file" accept="image/*" onChange={handleFile} style={{display:"none"}} />
    </div>
  );
}
function RoleBadge({ role }) {
  if (role === "admin") return <span className="tag tag-inst">관리자</span>;
  if (role === "manager") return <span className="tag tag-mgr">매니저</span>;
  return <span className="tag tag-blue">강사</span>;
}

// ── LOGIN ─────────────────────────────────────────────────────────────────────
function LoginScreen({ onLogin }) {
  const [u, setU] = useState(""); const [p, setP] = useState("");
  const [err, setErr] = useState(""); const [loading, setLoading] = useState(false);
  const handle = async () => {
    if (!u.trim() || !p.trim()) { setErr("아이디와 비밀번호를 입력하세요."); return; }
    setLoading(true); setErr("");
    const ok = await onLogin(u.trim(), p);
    if (!ok) { setErr("아이디 또는 비밀번호가 올바르지 않습니다."); setLoading(false); }
  };
  return (
    <div className="login-bg">
      <div className="login-card">
        <div className="login-logo">
          <Logo size={52} />
          <div className="login-logo-text">
            <div className="brand">RYE-K K-Culture Center</div>
            <div className="sub">국악 교육 디렉토리 시스템</div>
          </div>
        </div>
        <div className="login-desc">각 분야 전공 강사진이 이끄는 수준 높은 국악 교육 플랫폼입니다.</div>
        {err && <div className="login-err">{err}</div>}
        <div className="f-group"><label className="f-label">아이디</label><input className="f-inp" value={u} onChange={e => setU(e.target.value)} onKeyDown={e => e.key === "Enter" && handle()} placeholder="아이디" autoComplete="username" /></div>
        <div className="f-group"><label className="f-label">비밀번호</label><input className="f-inp" type="password" value={p} onChange={e => setP(e.target.value)} onKeyDown={e => e.key === "Enter" && handle()} placeholder="비밀번호" autoComplete="current-password" /></div>
        <button className="login-btn" onClick={handle} disabled={loading}>{loading ? "확인 중…" : "로그인"}</button>
      </div>
    </div>
  );
}

// ── BOTTOM NAV (Mobile) ───────────────────────────────────────────────────────
function BottomNav({ view, setView, unpaidCount, pendingCount }) {
  const tabs = [
    { id: "dashboard", label: "홈", icon: IC.home },
    { id: "students", label: "학생", icon: IC.users },
    { id: "attendance", label: "출석", icon: IC.check },
    { id: "payments", label: "수납", icon: IC.wallet, badge: unpaidCount },
    { id: "more", label: "더보기", icon: IC.more, badge: pendingCount },
  ];
  return (
    <nav className="bnav">
      {tabs.map(t => (
        <div key={t.id} className={`bnav-item ${view === t.id || (t.id === "more" && ["teachers","notices","categories","profile","activity","pending","trash","studentNotices","analytics"].includes(view)) ? "active" : ""}`} onClick={() => setView(t.id)}>
          <span className="bnav-dot" />
          {t.badge > 0 && <span className="bnav-badge">{t.badge > 99 ? "99+" : t.badge}</span>}
          {t.icon}
          <span className="bnav-label">{t.label}</span>
        </div>
      ))}
    </nav>
  );
}

// ── SIDEBAR (Desktop) ─────────────────────────────────────────────────────────
function Sidebar({ view, setView, user, onLogout, counts, pendingCount, darkMode, setDarkMode }) {
  const nav = [
    { id: "dashboard", label: "대시보드", icon: "▦" },
    { id: "students", label: "학생 관리", icon: "♪", badge: counts.students },
    { id: "attendance", label: "출석 체크", icon: "✓" },
    { id: "payments", label: "수납 관리", icon: "₩" },
    { id: "schedule", label: "강사 스케줄", icon: "◫" },
    ...(canManageAll(user.role) ? [{ id: "pending", label: "등록 대기", icon: "📋", badge: pendingCount || undefined }] : []),
    ...(canManageAll(user.role) ? [{ id: "teachers", label: "강사 관리", icon: "◈", badge: counts.teachers }] : []),
    ...(canManageAll(user.role) ? [{ id: "notices", label: "공지사항", icon: "◉" }] : []),
    ...(canManageAll(user.role) ? [{ id: "studentNotices", label: "수강생 공지", icon: "📢" }] : []),
    ...(user.role === "admin" ? [{ id: "categories", label: "과목 관리", icon: "≡" }] : []),
    ...(user.role === "admin" ? [{ id: "analytics", label: "현황 분석", icon: "◈" }] : []),
    ...(canManageAll(user.role) ? [{ id: "activity", label: "활동 기록", icon: "◷" }] : []),
    ...(canManageAll(user.role) ? [{ id: "trash", label: "휴지통", icon: "🗑" }] : []),
    { id: "profile", label: "내 정보", icon: "◎" },
  ];
  const isDark = darkMode === "dark" || (darkMode === null && window.matchMedia?.("(prefers-color-scheme: dark)").matches);
  const toggleDark = () => setDarkMode(isDark ? "light" : "dark");
  return (
    <aside className="sidebar">
      <div className="sb-head">
        <div className="sb-logo">
          <Logo size={34} />
          <div className="sb-logo-text">
            <div className="rye">RYE-K</div>
            <div className="sub">K-Culture Center</div>
            <div className="ko">국악 교육 디렉토리</div>
          </div>
        </div>
      </div>
      <nav style={{ flex: 1, padding: "10px 0", overflowY: "auto" }}>
        <div className="sb-section">메뉴</div>
        {nav.map(item => (
          <div key={item.id} className={`sb-item ${view === item.id ? "active" : ""}`} onClick={() => setView(item.id)}>
            <span style={{ fontSize: 14, width: 18, textAlign: "center" }}>{item.icon}</span>
            <span>{item.label}</span>
            {item.badge != null && <span className="sb-badge">{item.badge}</span>}
          </div>
        ))}
      </nav>
      <div className="sb-foot">
        <div style={{borderBottom:"1px solid rgba(255,255,255,.1)",paddingBottom:10,marginBottom:10}}>
          <div style={{fontSize:10,color:"rgba(255,255,255,.35)",letterSpacing:1,marginBottom:6}}>공유하기</div>
          {[
            { label: "수강 등록 폼", url: window.location.origin + window.location.pathname + "?register", title: "RYE-K 수강 등록", text: "RYE-K K-Culture Center 수강 등록 신청서입니다." },
            { label: "My RYE-K 포털", url: window.location.origin + window.location.pathname + "?myryk", title: "My RYE-K", text: "My RYE-K 학생 포털 로그인 페이지입니다." },
          ].map(s => <SidebarShareBtn key={s.label} {...s} />)}
        </div>
        <div className="sb-user-name">{user.name}</div>
        <div className="sb-user-role">{user.role === "admin" ? "시스템 관리자" : user.role === "manager" ? "매니저" : "강사"}</div>
        <div style={{display:"flex",alignItems:"center",gap:6,marginBottom:10,cursor:"pointer",padding:"6px 8px",borderRadius:6,background:"rgba(255,255,255,.05)"}} onClick={toggleDark}>
          <span style={{fontSize:11,color:"rgba(255,255,255,.4)"}}>{isDark ? "🌙 다크모드" : "☀️ 라이트모드"}</span>
          <div style={{marginLeft:"auto",width:30,height:16,borderRadius:8,background:isDark?"var(--gold)":"rgba(255,255,255,.2)",position:"relative",transition:"background .2s"}}>
            <div style={{width:12,height:12,borderRadius:"50%",background:"#fff",position:"absolute",top:2,left:isDark?16:2,transition:"left .2s"}} />
          </div>
        </div>
        <button className="sb-logout" onClick={onLogout}>로그아웃</button>
      </div>
    </aside>
  );
}

// ── INSTRUMENT SELECTOR ───────────────────────────────────────────────────────
function InstSelector({ selected, onChange, categories }) {
  const toggle = inst => onChange(selected.includes(inst) ? selected.filter(x => x !== inst) : [...selected, inst]);
  return (
    <div>
      {Object.entries(categories).map(([cat, insts]) => (
        <div key={cat} style={{ marginBottom: 10 }}>
          <div style={{ fontSize: 10.5, color: "var(--ink-30)", fontWeight: 600, letterSpacing: .5, marginBottom: 4 }}>{cat}</div>
          <div className="inst-select-grid">
            {insts.map(inst => {
              const checked = selected.includes(inst);
              return (<div key={inst} className={`inst-check ${checked ? "checked" : ""}`} onClick={() => toggle(inst)}><div className="inst-check-box">{checked ? "✓" : ""}</div>{inst}</div>);
            })}
          </div>
        </div>
      ))}
    </div>
  );
}

// ── LESSON EDITOR ─────────────────────────────────────────────────────────────
function LessonEditor({ lessons, onChange, categories }) {
  const selectedInsts = lessons.map(l => l.instrument);
  const toggleInst = inst => {
    if (selectedInsts.includes(inst)) onChange(lessons.filter(l => l.instrument !== inst));
    else onChange([...lessons, { instrument: inst, schedule: [{ day: "", time: "" }] }]);
  };
  const updSch = (inst, idx, field, val) => onChange(lessons.map(l => l.instrument !== inst ? l : { ...l, schedule: l.schedule.map((s, i) => i !== idx ? s : { ...s, [field]: val }) }));
  const addSch = inst => onChange(lessons.map(l => l.instrument !== inst ? l : { ...l, schedule: [...l.schedule, { day: "", time: "" }] }));
  const rmSch = (inst, idx) => onChange(lessons.map(l => l.instrument !== inst ? l : { ...l, schedule: l.schedule.filter((_, i) => i !== idx) }));
  return (
    <div>
      <div className="fg-label" style={{ marginBottom: 6 }}>악기 / 과목 <span className="req">*</span> <span style={{ fontWeight: 400, color: "var(--ink-30)", textTransform: "none", letterSpacing: 0 }}>(복수 선택)</span></div>
      {Object.entries(categories).map(([cat, insts]) => (
        <div key={cat} style={{ marginBottom: 10 }}>
          <div style={{ fontSize: 10.5, color: "var(--ink-30)", fontWeight: 600, letterSpacing: .5, marginBottom: 4 }}>{cat}</div>
          <div className="inst-select-grid">
            {insts.map(inst => {
              const checked = selectedInsts.includes(inst);
              return (<div key={inst} className={`inst-check ${checked ? "checked" : ""}`} onClick={() => toggleInst(inst)}><div className="inst-check-box">{checked ? "✓" : ""}</div>{inst}</div>);
            })}
          </div>
        </div>
      ))}
      {lessons.length > 0 && (
        <div style={{ marginTop: 14 }}>
          <div className="section-label">레슨 요일 · 시간 설정</div>
          {lessons.map(l => (
            <div key={l.instrument} className="lesson-item">
              <div className="lesson-item-head"><div className="lesson-inst-label">{l.instrument}</div></div>
              {(l.schedule || []).map((sc, idx) => (
                <div key={idx} className="schedule-row">
                  {DAYS.map(d => (<button key={d} type="button" className={`sch-day-btn ${sc.day === d ? "on" : ""}`} onClick={() => updSch(l.instrument, idx, "day", sc.day === d ? "" : d)}>{d}</button>))}
                  <div style={{display:"flex",alignItems:"center",gap:4}}>
                    <span style={{fontSize:11,color:"var(--ink-30)",flexShrink:0}}>시간</span>
                    <input className="time-inp" type="time" value={sc.time || ""} onChange={e => updSch(l.instrument, idx, "time", e.target.value)} placeholder="00:00" />
                  </div>
                  {(l.schedule || []).length > 1 && <button className="rm-btn" onClick={() => rmSch(l.instrument, idx)}>×</button>}
                </div>
              ))}
              <button className="add-sch-btn" onClick={() => addSch(l.instrument)}>+ 요일/시간 추가</button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ── DELETE CONFIRM FOOTER ─────────────────────────────────────────────────────
function DeleteConfirmFooter({ label, canDelete, onDelete, onClose, onEdit }) {
  const [delConfirm, setDelConfirm] = useState(false);
  const [deleting, setDeleting] = useState(false);
  if (delConfirm) return (
    <div className="delete-confirm-bar">
      <div className="delete-confirm-bar-msg">⚠ <strong>{label}</strong> 삭제하시겠습니까?</div>
      <div style={{ display: "flex", gap: 8 }}>
        <button className="btn btn-secondary btn-sm" onClick={() => setDelConfirm(false)} disabled={deleting}>취소</button>
        <button className="btn btn-danger btn-sm" onClick={async () => { setDeleting(true); await onDelete(); }} disabled={deleting}>{deleting ? "삭제 중…" : "삭제"}</button>
      </div>
    </div>
  );
  return (
    <div className="modal-f">
      {canDelete && <button className="btn btn-danger" onClick={() => setDelConfirm(true)}>삭제</button>}
      <div style={{ flex: 1 }} />
      <button className="btn btn-secondary" onClick={onClose}>닫기</button>
      {onEdit && <button className="btn btn-primary" onClick={onEdit}>수정</button>}
    </div>
  );
}

// ── STUDENT FORM ──────────────────────────────────────────────────────────────
function StudentFormModal({ student, teachers, currentUser, categories, feePresets, onClose, onSave }) {
  const [form, setForm] = useState(student || { name: "", birthDate: "", startDate: TODAY_STR, phone: "", guardianPhone: "", teacherId: currentUser.role === "teacher" ? currentUser.id : "", lessons: [], photo: "", notes: "", monthlyFee: 0, status: "active" });
  const [err, setErr] = useState("");
  const [confirming, setConfirming] = useState(false);
  const [saving, setSaving] = useState(false);
  const fileRef = useRef();
  const isEdit = !!student;
  const set = (k, v) => {
    setForm(f => {
      const next = { ...f, [k]: v };
      // Auto-calculate fee from presets when lessons change (only for new students with fee=0)
      if (k === "lessons" && !isEdit && feePresets) {
        const autoFee = (v || []).reduce((sum, l) => sum + (feePresets[l.instrument] || 0), 0);
        if (autoFee > 0 && (f.monthlyFee === 0 || f.monthlyFee === (f.lessons || []).reduce((s, l) => s + (feePresets[l.instrument] || 0), 0))) {
          next.monthlyFee = autoFee;
        }
      }
      return next;
    });
    setErr(""); setConfirming(false);
  };
  const handlePhoto = async (e) => { const file = e.target.files?.[0]; if (!file) return; try { const compressed = await compressImage(file, 360, 0.75); set("photo", compressed); } catch(err) { console.error("Photo error:",err); } };
  const validate = () => {
    if (!form.name.trim()) { setErr("이름을 입력하세요."); return false; }
    if (!form.birthDate) { setErr("생년월일을 입력하세요. (학생코드 비밀번호 생성에 필요)"); return false; }
    if (!form.lessons || form.lessons.length === 0) { setErr("악기/과목을 하나 이상 선택해주세요."); return false; }
    return true;
  };
  const handleSaveClick = () => { if (!validate()) return; setConfirming(true); };
  const handleConfirm = async () => {
    if (saving) return; setSaving(true);
    try { await onSave({ ...form, createdAt: form.createdAt || Date.now() }); }
    catch(e) { setErr("저장 중 오류가 발생했습니다."); setConfirming(false); }
    finally { setSaving(false); }
  };
  const minor = isMinor(form.birthDate);
  return (
    <div className="mb" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal">
        <div className="modal-h"><h2>{isEdit ? "학생 정보 수정" : "학생 등록"}</h2><button className="modal-close" onClick={onClose}>{IC.x}</button></div>
        <div className="modal-b">
          {err && <div className="form-err">⚠ {err}</div>}
          <div className="photo-area">
            <Av photo={form.photo} name={form.name} size="av-lg" />
            <div>
              <button className="btn btn-secondary btn-sm" onClick={() => fileRef.current.click()}>사진 업로드</button>
              {form.photo && <button className="btn btn-ghost btn-sm" onClick={() => set("photo", "")}>삭제</button>}
              <div className="photo-hint">JPG, PNG 권장</div>
            </div>
            <input ref={fileRef} type="file" className="file-inp" accept="image/*" onChange={handlePhoto} />
          </div>
          <div className="fg"><label className="fg-label">이름 <span className="req">*</span></label><input className="inp" value={form.name} onChange={e => set("name", e.target.value)} placeholder="학생 이름" /></div>
          <div className="fg-row">
            <div className="fg"><label className="fg-label">생년월일 <span className="req">*</span></label><input className="inp" type="date" value={form.birthDate} onChange={e => set("birthDate", e.target.value)} /></div>
            <div className="fg"><label className="fg-label">수강 시작일</label><input className="inp" type="date" value={form.startDate} onChange={e => set("startDate", e.target.value)} /></div>
          </div>
          <div className="fg"><label className="fg-label">연락처</label><input className="inp" value={form.phone} onChange={e => set("phone", fmtPhone(e.target.value))} placeholder="010-0000-0000" maxLength={13} /></div>
          <div className="fg">
            <label className="fg-label">보호자 연락처{minor && <span className="req"> *</span>}{form.birthDate && <span style={{ fontWeight: 400, color: "var(--ink-30)", textTransform: "none", letterSpacing: 0 }}> ({minor ? "미성년자" : "성인"})</span>}</label>
            <input className="inp" value={form.guardianPhone} onChange={e => set("guardianPhone", fmtPhone(e.target.value))} placeholder="010-0000-0000" maxLength={13} />
          </div>
          <div className="fg">
            <label className="fg-label">담당 강사</label>
            {canManageAll(currentUser.role) ? (
              <select className="sel" value={form.teacherId} onChange={e => set("teacherId", e.target.value)}>
                <option value="">미배정</option>
                {teachers.map(t => <option key={t.id} value={t.id}>{t.name} ({(t.instruments || []).filter(Boolean).join(", ") || "강사"})</option>)}
              </select>
            ) : (<input className="inp" value={teachers.find(t => t.id === currentUser.id)?.name || currentUser.name} disabled />)}
          </div>
          <div className="fg">
            <label className="fg-label">월 수강료</label>
            <div style={{position:"relative",maxWidth:220}}>
              <input className="inp" inputMode="numeric" value={form.monthlyFee ? form.monthlyFee.toLocaleString("ko-KR") : ""} onChange={e => set("monthlyFee", parseInt(e.target.value.replace(/[^\d]/g,"")) || 0)} placeholder="0" style={{paddingRight:30}} />
              <span style={{position:"absolute",right:12,top:"50%",transform:"translateY(-50%)",fontSize:13,color:"var(--ink-30)",pointerEvents:"none"}}>원</span>
            </div>
          </div>
          {isEdit && canManageAll(currentUser.role) && (
            <div className="fg">
              <label className="fg-label">수강 상태</label>
              <select className="sel" value={form.status || "active"} onChange={e => set("status", e.target.value)} style={{maxWidth:180}}>
                <option value="active">재원</option>
                <option value="paused">휴원</option>
                <option value="withdrawn">퇴원</option>
              </select>
            </div>
          )}
          <div className="divider" />
          <div className="fg"><LessonEditor lessons={form.lessons || []} onChange={v => set("lessons", v)} categories={categories} /></div>
          <div className="fg"><label className="fg-label">메모 / 특이사항</label><textarea className="inp" value={form.notes} onChange={e => set("notes", e.target.value)} placeholder="수업 참고사항, 특이사항 등" rows={3} /></div>
        </div>
        {confirming ? (
          <div className="confirm-bar">
            <div className="confirm-bar-msg"><strong>{form.name}</strong> 학생을 {isEdit ? "수정" : "등록"}하시겠습니까?</div>
            <div style={{ display: "flex", gap: 8 }}>
              <button className="btn btn-secondary btn-sm" onClick={() => setConfirming(false)} disabled={saving}>취소</button>
              <button className="btn btn-primary btn-sm" onClick={handleConfirm} disabled={saving}>{saving ? "저장 중…" : "확인"}</button>
            </div>
          </div>
        ) : (<div className="modal-f"><button className="btn btn-secondary" onClick={onClose}>취소</button><button className="btn btn-primary" onClick={handleSaveClick}>저장</button></div>)}
      </div>
    </div>
  );
}

// ── STUDENT DETAIL ────────────────────────────────────────────────────────────
function StudentDetailModal({ student: s, teachers, currentUser, categories, attendance, payments, onClose, onEdit, onDelete, onPhotoUpdate }) {
  const teacher = teachers.find(t => t.id === s.teacherId);
  const minor = isMinor(s.birthDate); const age = calcAge(s.birthDate);
  const days = allLessonDays(s);
  // Attendance history for this student
  const sAtt = (attendance || []).filter(a => a.studentId === s.id).sort((a,b) => b.createdAt - a.createdAt);
  const attTotal = sAtt.length;
  const attPresent = sAtt.filter(a => a.status === "present").length;
  const attAbsent = sAtt.filter(a => a.status === "absent").length;
  const attLate = sAtt.filter(a => a.status === "late").length;
  const attExcused = sAtt.filter(a => a.status === "excused").length;
  const attRate = attTotal > 0 ? Math.round((attPresent + attLate) / attTotal * 100) : null;
  // Payment history
  const sPay = (payments || []).filter(p => p.studentId === s.id).sort((a,b) => (b.month||"").localeCompare(a.month||""));
  const [showAttAll, setShowAttAll] = useState(false);
  const [showPw, setShowPw] = useState(false);
  const [copyMsg, setCopyMsg] = useState("");
  const pw = getBirthPassword(s.birthDate);
  const copyLoginInfo = () => {
    const text = `[My RYE-K 로그인 안내]\n학생코드: ${s.studentCode}\n비밀번호: ${pw} (생일 4자리)\n\n접속: ${window.location.origin}${window.location.pathname}?myryk`;
    navigator.clipboard?.writeText(text).then(() => { setCopyMsg("로그인 안내가 복사되었습니다!"); setTimeout(() => setCopyMsg(""), 2000); });
  };
  return (
    <div className="mb" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal">
        <div className="modal-h"><h2>학생 정보</h2><button className="modal-close" onClick={onClose}>{IC.x}</button></div>
        <div className="det-head">
          {canManageAll(currentUser.role) && onPhotoUpdate ? <PhotoUpload photo={s.photo} name={s.name} size="av-lg" onUpload={(data) => onPhotoUpdate(s.id, data)} /> : <Av photo={s.photo} name={s.name} size="av-lg" />}
          <div style={{ flex: 1 }}>
            <div className="det-name">{s.name}</div>
            {s.studentCode && <div style={{fontSize:11,color:"var(--ink-30)",marginBottom:4,fontFamily:"monospace"}}>학생코드: {s.studentCode}</div>}
            {/* Password reveal for managers/admins */}
            {s.studentCode && canManageAll(currentUser.role) && (<>
              <div style={{display:"flex",alignItems:"center",gap:6,marginBottom:6}}>
                <button onClick={()=>setShowPw(!showPw)} style={{background:"none",border:"1px solid var(--border)",borderRadius:6,padding:"2px 8px",fontSize:10,color:"var(--ink-30)",cursor:"pointer",fontFamily:"inherit",display:"flex",alignItems:"center",gap:3}}>
                  {showPw ? "🔓" : "🔒"} {showPw ? `비밀번호: ${pw}` : "비밀번호 확인"}
                </button>
                {showPw && <button onClick={copyLoginInfo} style={{background:"var(--blue-lt)",border:"none",borderRadius:6,padding:"2px 8px",fontSize:10,color:"var(--blue)",cursor:"pointer",fontFamily:"inherit"}}>로그인 안내 복사</button>}
              </div>
              {copyMsg && <div style={{fontSize:11,color:"var(--green)",background:"var(--green-lt)",padding:"4px 10px",borderRadius:6,marginBottom:6,animation:"toastIn .25s ease"}}>{copyMsg}</div>}
            </>)}
            <div style={{ display: "flex", flexWrap: "wrap", gap: 4, marginBottom: 6 }}>
              <span className={`tag ${minor ? "tag-minor" : "tag-adult"}`}>{minor ? "미성년자" : "성인"}{age !== null ? ` · ${age}세` : ""}</span>
              {teacher && <span className="tag tag-gold">{teacher.name} 강사</span>}
            </div>
            {days.length > 0 && <div className="day-row">{DAYS.map(d => <div key={d} className={`day-chip ${days.includes(d) ? "on" : ""}`}>{d}</div>)}</div>}
          </div>
        </div>
        <div className="info-grid">
          <div className="ii"><div className="ii-label">생년월일</div><div className="ii-val">{fmtDate(s.birthDate)}</div></div>
          <div className="ii"><div className="ii-label">수강 시작일</div><div className="ii-val">{fmtDate(s.startDate)}</div></div>
          <div className="ii"><div className="ii-label">연락처</div><div className="ii-val">{s.phone || "-"}</div></div>
          <div className="ii"><div className="ii-label">보호자 연락처</div><div className="ii-val">{s.guardianPhone || "-"}</div></div>
          <div className="ii"><div className="ii-label">월 수강료</div><div className="ii-val">{fmtMoney(s.monthlyFee)}</div></div>
        </div>
        {(s.lessons || []).length > 0 && (
          <div>
            <div style={{ padding: "10px 20px 2px", fontSize: 10, color: "var(--ink-30)", letterSpacing: .5, textTransform: "uppercase", fontWeight: 600 }}>수강 과목 · 레슨 일정</div>
            {(s.lessons || []).map(l => (
              <div key={l.instrument} className="lesson-detail-row">
                <div className="lesson-detail-inst">
                  <span style={{ width: 3, height: 12, background: "var(--blue)", display: "inline-block", flexShrink: 0, borderRadius: 2 }} />
                  {l.instrument}
                  <span className="tag tag-cat" style={{ fontSize: 10 }}>{getCat(l.instrument, categories)}</span>
                </div>
                <div style={{ display: "flex", flexWrap: "wrap" }}>
                  {(l.schedule || []).filter(sc => sc.day).map((sc, i) => (<span key={i} className="sched-chip">{sc.day}요일{sc.time && <span className="sched-chip-time"> {sc.time}</span>}</span>))}
                  {(l.schedule || []).filter(sc => sc.day).length === 0 && <span style={{ color: "var(--ink-30)", fontSize: 12 }}>요일 미지정</span>}
                </div>
              </div>
            ))}
          </div>
        )}
        {s.notes && <div style={{ padding: "12px 20px" }}><div className="ii-label" style={{ marginBottom: 6 }}>메모</div><div className="notes-box">{s.notes}</div></div>}

        {/* Attendance History */}
        {attTotal > 0 && (
          <div style={{ padding: "12px 20px" }}>
            <div className="ii-label" style={{ marginBottom: 8 }}>출석 현황</div>
            <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 10 }}>
              <div className="att-stat" style={{background:"var(--green-lt)",color:"var(--green)"}}>출석 {attPresent}</div>
              <div className="att-stat" style={{background:"var(--red-lt)",color:"var(--red)"}}>결석 {attAbsent}</div>
              <div className="att-stat" style={{background:"var(--gold-lt)",color:"var(--gold-dk)"}}>지각 {attLate}</div>
              <div className="att-stat" style={{background:"var(--blue-lt)",color:"var(--blue)"}}>보강 {attExcused}</div>
              {attRate !== null && <div className="att-stat" style={{background:"var(--ink-10)",color: attRate >= 80 ? "var(--green)" : attRate >= 60 ? "var(--gold-dk)" : "var(--red)"}}>{attRate}%</div>}
            </div>
            <div style={{fontSize:11,color:"var(--ink-30)",marginBottom:6}}>최근 기록</div>
            {sAtt.slice(0, showAttAll ? 30 : 5).map(a => (
              <div key={a.id} style={{padding:"5px 0",fontSize:12,borderBottom:"1px solid var(--ink-10)"}}>
                <div style={{display:"flex",alignItems:"center",gap:8}}>
                  <span style={{color:"var(--ink-30)",width:70,flexShrink:0}}>{fmtDateShort(a.date)}</span>
                  <span style={{color: a.status==="present"?"var(--green)":a.status==="absent"?"var(--red)":a.status==="late"?"var(--gold-dk)":"var(--blue)",fontWeight:500}}>{ATT_STATUS[a.status]}</span>
                </div>
                {a.note && <div style={{fontSize:11,color:"var(--ink-60)",marginTop:2,paddingLeft:78}}>📝 {typeof a.note === "string" ? a.note : formatLessonNoteSummary(a.lessonNote)}</div>}
                {a.lessonNote && typeof a.lessonNote === "object" && a.lessonNote.managerReport && <div style={{fontSize:11,color:"var(--gold-dk)",marginTop:2,paddingLeft:78,fontWeight:500}}>📋 매니저 보고: {a.lessonNote.managerReport}</div>}
              </div>
            ))}
            {sAtt.length > 5 && <button className="btn btn-ghost btn-xs" style={{marginTop:6}} onClick={() => setShowAttAll(!showAttAll)}>{showAttAll ? "접기" : `전체 ${sAtt.length}건 보기`}</button>}
          </div>
        )}

        {/* Payment History */}
        {sPay.length > 0 && (
          <div style={{ padding: "12px 20px" }}>
            <div className="ii-label" style={{ marginBottom: 8 }}>수납 이력</div>
            {sPay.slice(0, 6).map(p => (
              <div key={p.id} style={{display:"flex",alignItems:"center",gap:8,padding:"5px 0",fontSize:12,borderBottom:"1px solid var(--ink-10)"}}>
                <span style={{color:"var(--ink-60)",width:70,flexShrink:0}}>{monthLabel(p.month)}</span>
                <span style={{flex:1,fontWeight:500}}>{fmtMoney(p.amount)}</span>
                <span style={{color:p.paid?"var(--green)":"var(--red)",fontWeight:500,fontSize:11}}>{p.paid ? `✓ ${fmtDateShort(p.paidDate)}` : "미납"}</span>
              </div>
            ))}
          </div>
        )}

        <DeleteConfirmFooter label={`${s.name} 학생`} canDelete={canManageAll(currentUser.role)} onDelete={onDelete} onClose={onClose} onEdit={onEdit} />
      </div>
    </div>
  );
}

// ── STUDENT CARD & VIEW ───────────────────────────────────────────────────────
function StudentCard({ student: s, teachers, onClick }) {
  const teacher = teachers.find(t => t.id === s.teacherId);
  const minor = isMinor(s.birthDate); const age = calcAge(s.birthDate);
  const insts = allLessonInsts(s); const days = allLessonDays(s);
  return (
    <div className="s-card" onClick={onClick}>
      <Av photo={s.photo} name={s.name} />
      <div className="s-card-info">
        <div className="s-name">{s.name}{s.studentCode && <span style={{fontSize:10,color:"var(--ink-30)",fontWeight:400,marginLeft:6,fontFamily:"monospace"}}>{s.studentCode}</span>}</div>
        <div className="s-inst">{insts.join(" · ") || "과목 미지정"}</div>
        <div className="s-meta">
          <span className={`tag ${minor ? "tag-minor" : "tag-adult"}`} style={{padding:"1px 6px",fontSize:10}}>{minor ? "미성년" : "성인"}{age !== null ? ` ${age}세` : ""}</span>
          {teacher && <span style={{color:"var(--gold-dk)",fontSize:11,fontWeight:500}}>{teacher.name}</span>}
          {s.status === "paused" && <span className="tag" style={{background:"var(--gold-lt)",color:"var(--gold-dk)",padding:"1px 6px",fontSize:10}}>휴원</span>}
          {s.status === "withdrawn" && <span className="tag" style={{background:"var(--ink-10)",color:"var(--ink-30)",padding:"1px 6px",fontSize:10}}>퇴원</span>}
        </div>
      </div>
      {days.length > 0 && (
        <div style={{display:"flex",gap:2,flexDirection:"column",alignItems:"center"}}>
          {days.slice(0,3).map(d => <div key={d} className="day-chip on" style={{width:24,height:24,minWidth:24,fontSize:10}}>{d}</div>)}
          {days.length > 3 && <span style={{fontSize:9,color:"var(--ink-30)"}}>+{days.length-3}</span>}
        </div>
      )}
    </div>
  );
}

function StudentsView({ students, allStudents, teachers, categories, filter, setFilter, search, setSearch, onAdd, onSelect }) {
  const [statusFilter, setStatusFilter] = useState("active");
  const cats = ["전체", ...Object.keys(categories)];
  const statusFiltered = statusFilter === "all" ? students : students.filter(s => (s.status || "active") === statusFilter);
  const grouped = filter === "전체"
    ? Object.entries(categories).map(([cat, insts]) => ({ cat, items: statusFiltered.filter(s => (s.lessons || []).some(l => insts.includes(l.instrument))) })).filter(g => g.items.length > 0)
    : [{ cat: filter, items: statusFiltered }];
  const activeCount = students.filter(s => (s.status || "active") === "active").length;
  const pausedCount = students.filter(s => s.status === "paused").length;
  const withdrawnCount = students.filter(s => s.status === "withdrawn").length;
  return (
    <div>
      <div className="ph">
        <div><h1>학생 관리</h1><div className="ph-sub">재원 {activeCount}명{pausedCount > 0 && ` · 휴원 ${pausedCount}`}{withdrawnCount > 0 && ` · 퇴원 ${withdrawnCount}`}</div></div>
      </div>
      <div className="srch-wrap">
        <span className="srch-icon">{IC.search}</span>
        <input className="srch-inp" placeholder="이름, 악기, 연락처 검색" value={search} onChange={e => setSearch(e.target.value)} />
      </div>
      <div style={{display:"flex",gap:6,marginBottom:8}}>
        {[{k:"active",l:"재원"},{k:"paused",l:"휴원"},{k:"withdrawn",l:"퇴원"},{k:"all",l:"전체"}].map(x => (
          <button key={x.k} className={`ftab ${statusFilter === x.k ? "active" : ""}`} onClick={() => setStatusFilter(x.k)} style={{borderRadius:20,fontSize:12,padding:"5px 12px"}}>{x.l}</button>
        ))}
      </div>
      <div className="ftabs">{cats.map(c => <button key={c} className={`ftab ${filter === c ? "active" : ""}`} onClick={() => setFilter(c)}>{c}</button>)}</div>
      {statusFiltered.length === 0 ? (
        <div className="empty"><div className="empty-icon">♩</div><div className="empty-txt">{search ? "검색 결과가 없습니다." : "해당 상태의 학생이 없습니다."}</div></div>
      ) : filter === "전체" ? (
        grouped.map(({ cat, items }) => (
          <div key={cat}>
            <div className="cat-hd"><div className="cat-hd-line" /><span className="cat-title">{cat}</span><span className="cat-count">{items.length}명</span></div>
            <div className="s-grid">{items.map(s => <StudentCard key={s.id} student={s} teachers={teachers} onClick={() => onSelect(s)} />)}</div>
          </div>
        ))
      ) : (
        <div className="s-grid">{statusFiltered.map(s => <StudentCard key={s.id} student={s} teachers={teachers} onClick={() => onSelect(s)} />)}</div>
      )}
      <button className="fab" onClick={onAdd}>{IC.plus}</button>
    </div>
  );
}

// ── TEACHER FORM ──────────────────────────────────────────────────────────────
function TeacherFormModal({ teacher, categories, onClose, onSave }) {
  const [form, setForm] = useState(teacher || { name: "", username: "", password: "", phone: "", email: "", instruments: [], birthDate: "", hireDate: TODAY_STR, photo: "", bio: "", role: "teacher" });
  const [err, setErr] = useState("");
  const [confirming, setConfirming] = useState(false);
  const [saving, setSaving] = useState(false);
  const fileRef = useRef();
  const set = (k, v) => { setForm(f => ({ ...f, [k]: v })); setErr(""); setConfirming(false); };
  const handlePhoto = async (e) => { const file = e.target.files?.[0]; if (!file) return; try { const compressed = await compressImage(file, 360, 0.75); set("photo", compressed); } catch(err) { console.error("Photo error:",err); } };
  const validate = () => {
    if (!form.name.trim()) { setErr("이름을 입력하세요."); return false; }
    if (!form.username.trim()) { setErr("아이디를 입력하세요."); return false; }
    if (!teacher && !form.password.trim()) { setErr("비밀번호를 입력하세요."); return false; }
    return true;
  };
  const handleSaveClick = () => { if (!validate()) return; setConfirming(true); };
  const handleConfirm = async () => {
    if (saving) return; setSaving(true);
    try { await onSave(form); } catch(e) { setErr("저장 중 오류가 발생했습니다."); setConfirming(false); }
    finally { setSaving(false); }
  };
  const isEdit = !!teacher;
  return (
    <div className="mb" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal">
        <div className="modal-h"><h2>{isEdit ? "정보 수정" : "강사/매니저 등록"}</h2><button className="modal-close" onClick={onClose}>{IC.x}</button></div>
        <div className="modal-b">
          {err && <div className="form-err">⚠ {err}</div>}
          <div className="photo-area">
            <Av photo={form.photo} name={form.name} size="av-lg" />
            <div>
              <button className="btn btn-secondary btn-sm" onClick={() => fileRef.current.click()}>사진 업로드</button>
              {form.photo && <button className="btn btn-ghost btn-sm" onClick={() => set("photo", "")}>삭제</button>}
            </div>
            <input ref={fileRef} type="file" className="file-inp" accept="image/*" onChange={handlePhoto} />
          </div>
          <div className="fg"><label className="fg-label">이름 <span className="req">*</span></label><input className="inp" value={form.name} onChange={e => set("name", e.target.value)} placeholder="이름" /></div>
          <div className="fg-row">
            <div className="fg"><label className="fg-label">아이디 <span className="req">*</span></label><input className="inp" value={form.username} onChange={e => set("username", e.target.value)} placeholder="로그인 아이디" autoComplete="off" /></div>
            <div className="fg"><label className="fg-label">비밀번호{teacher && <span style={{ fontWeight: 400, color: "var(--ink-30)", textTransform: "none", letterSpacing: 0 }}> (변경 시)</span>}</label><input className="inp" type="password" value={form.password} onChange={e => set("password", e.target.value)} placeholder={teacher ? "변경할 비밀번호" : "비밀번호"} autoComplete="new-password" /></div>
          </div>
          <div className="fg"><label className="fg-label">연락처</label><input className="inp" value={form.phone} onChange={e => set("phone", fmtPhone(e.target.value))} placeholder="010-0000-0000" maxLength={13} /></div>
          <div className="fg-row">
            <div className="fg"><label className="fg-label">역할</label><select className="sel" value={form.role || "teacher"} onChange={e => set("role", e.target.value)}><option value="teacher">강사</option><option value="manager">매니저</option></select></div>
            <div className="fg"><label className="fg-label">임용일</label><input className="inp" type="date" value={form.hireDate} onChange={e => set("hireDate", e.target.value)} /></div>
          </div>
          <div className="divider" />
          <div className="fg">
            <label className="fg-label">전공 / 담당 과목 <span style={{ fontWeight: 400, color: "var(--ink-30)", textTransform: "none", letterSpacing: 0 }}>(복수 선택)</span></label>
            <InstSelector selected={form.instruments || []} onChange={v => set("instruments", v)} categories={categories} />
          </div>
          <div className="fg"><label className="fg-label">소개 / 경력</label><textarea className="inp" value={form.bio} onChange={e => set("bio", e.target.value)} placeholder="학력, 경력, 수상 이력 등" rows={3} /></div>
        </div>
        {confirming ? (
          <div className="confirm-bar">
            <div className="confirm-bar-msg"><strong>{form.name}</strong> {form.role === "manager" ? "매니저" : "강사"}을(를) {isEdit ? "수정" : "등록"}하시겠습니까?</div>
            <div style={{ display: "flex", gap: 8 }}>
              <button className="btn btn-secondary btn-sm" onClick={() => setConfirming(false)} disabled={saving}>취소</button>
              <button className="btn btn-primary btn-sm" onClick={handleConfirm} disabled={saving}>{saving ? "저장 중…" : "확인"}</button>
            </div>
          </div>
        ) : (<div className="modal-f"><button className="btn btn-secondary" onClick={onClose}>취소</button><button className="btn btn-primary" onClick={handleSaveClick}>저장</button></div>)}
      </div>
    </div>
  );
}

// ── TEACHER DETAIL ────────────────────────────────────────────────────────────
function TeacherDetailModal({ teacher: t, students, currentUser, onClose, onEdit, onDelete, onPhotoUpdate }) {
  const insts = (t.instruments || []).filter(Boolean);
  return (
    <div className="mb" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal">
        <div className="modal-h"><h2>강사/매니저 정보</h2><button className="modal-close" onClick={onClose}>{IC.x}</button></div>
        <div className="det-head">
          {canManageAll(currentUser.role) && onPhotoUpdate ? <PhotoUpload photo={t.photo} name={t.name} size="av-lg" onUpload={(data) => onPhotoUpdate(t.id, data)} /> : <Av photo={t.photo} name={t.name} size="av-lg" />}
          <div>
            <div className="det-name">{t.name}</div>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 4, marginBottom: 5 }}>{insts.map(i => <span key={i} className="tag tag-blue">{i}</span>)}</div>
            <RoleBadge role={t.role || "teacher"} />
            <div style={{ fontSize: 11.5, color: "var(--ink-30)", marginTop: 4 }}>@{t.username}</div>
          </div>
        </div>
        <div className="info-grid">
          <div className="ii"><div className="ii-label">생년월일</div><div className="ii-val">{fmtDate(t.birthDate)}</div></div>
          <div className="ii"><div className="ii-label">임용일</div><div className="ii-val">{fmtDate(t.hireDate)}</div></div>
          <div className="ii"><div className="ii-label">연락처</div><div className="ii-val">{t.phone || "-"}</div></div>
          <div className="ii"><div className="ii-label">이메일</div><div className="ii-val">{t.email || "-"}</div></div>
          <div className="ii" style={{ gridColumn: "1/-1" }}><div className="ii-label">담당 학생</div><div className="ii-val">{students.length}명</div></div>
        </div>
        {t.bio && <div style={{ padding: "12px 20px" }}><div className="ii-label" style={{ marginBottom: 6 }}>소개 / 경력</div><div className="notes-box">{t.bio}</div></div>}
        {students.length > 0 && (
          <div style={{ padding: "12px 20px" }}>
            <div className="ii-label" style={{ marginBottom: 8 }}>담당 학생</div>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
              {students.map(s => (
                <div key={s.id} style={{ display: "flex", alignItems: "center", gap: 6, background: "var(--bg)", padding: "6px 10px", border: "1px solid var(--border)", borderRadius: "var(--radius-sm)" }}>
                  <Av photo={s.photo} name={s.name} size="av-sm" />
                  <div><div style={{ fontSize: 12, fontWeight: 500 }}>{s.name}</div><div style={{ fontSize: 10, color: "var(--ink-30)" }}>{allLessonInsts(s).join(" · ")}</div></div>
                </div>
              ))}
            </div>
          </div>
        )}
        <DeleteConfirmFooter label={`${t.name}`} canDelete={canManageAll(currentUser.role)} onDelete={onDelete} onClose={onClose} onEdit={onEdit} />
      </div>
    </div>
  );
}

// ── TEACHERS VIEW ─────────────────────────────────────────────────────────────
function TeachersView({ teachers, students, onAdd, onSelect }) {
  const [search, setSearch] = useState("");
  const filtered = teachers.filter(t => { const q = search.toLowerCase(); return !q || t.name?.toLowerCase().includes(q) || ((t.instruments || []).join("")).toLowerCase().includes(q); });
  return (
    <div>
      <div className="ph"><div><h1>강사 · 매니저</h1><div className="ph-sub">전체 {teachers.length}명</div></div></div>
      <div className="srch-wrap"><span className="srch-icon">{IC.search}</span><input className="srch-inp" placeholder="이름, 전공 검색" value={search} onChange={e => setSearch(e.target.value)} /></div>
      {filtered.length === 0 ? (
        <div className="empty"><div className="empty-icon">◈</div><div className="empty-txt">등록된 강사가 없습니다.</div></div>
      ) : (
        <div className="s-grid">
          {filtered.map(t => {
            const cnt = students.filter(s => s.teacherId === t.id).length;
            const insts = (t.instruments || []).filter(Boolean);
            return (
              <div key={t.id} className="s-card" onClick={() => onSelect(t)}>
                <Av photo={t.photo} name={t.name} />
                <div className="s-card-info">
                  <div className="s-name">{t.name}</div>
                  <div className="s-inst">{insts.join(" · ") || "-"}</div>
                  <div className="s-meta">
                    <RoleBadge role={t.role || "teacher"} />
                    <span style={{fontSize:11,color:"var(--ink-30)"}}>학생 {cnt}명</span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
      <button className="fab" onClick={onAdd}>{IC.plus}</button>
    </div>
  );
}

// ── LESSON NOTE MODAL ─────────────────────────────────────────────────────────
function LessonNoteModal({ student, teacher, date, existingNote, onSave, onClose }) {
  const defaultNote = { progress: "", content: "", assignment: "", makeupNeeded: false, makeupPlan: "", condition: "good", instrumentRental: false, managerReport: "", memo: "" };
  const parseNote = (n) => {
    if (!n) return { ...defaultNote };
    if (typeof n === "object" && n.progress !== undefined) return { ...defaultNote, ...n };
    // Legacy: plain text note
    return { ...defaultNote, content: String(n) };
  };
  const [form, setForm] = useState(parseNote(existingNote));
  const [saving, setSaving] = useState(false);
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));
  const conditionOpts = [
    { k: "excellent", l: "매우 좋음", color: "var(--blue)" },
    { k: "good", l: "좋음", color: "var(--green)" },
    { k: "normal", l: "보통", color: "var(--gold-dk)" },
    { k: "poor", l: "부진", color: "var(--red)" },
  ];
  const handleSave = async () => {
    setSaving(true);
    try { await onSave(form); } finally { setSaving(false); }
  };
  const todayLessons = student ? (student.lessons || []).filter(l => {
    const dayName = ["일","월","화","수","목","금","토"][new Date(date + "T00:00:00").getDay()];
    return (l.schedule || []).some(sc => sc.day === dayName);
  }) : [];
  return (
    <div className="mb" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal">
        <div className="modal-h"><h2>레슨 노트</h2><button className="modal-close" onClick={onClose}>{IC.x}</button></div>
        <div className="modal-b">
          {/* Student info header */}
          <div style={{display:"flex",alignItems:"center",gap:10,marginBottom:16,padding:"12px 14px",background:"var(--bg)",borderRadius:8,border:"1px solid var(--border)"}}>
            <Av photo={student?.photo} name={student?.name} size="av-sm" />
            <div style={{flex:1}}>
              <div style={{fontSize:14,fontWeight:600}}>{student?.name}</div>
              <div style={{fontSize:12,color:"var(--blue)"}}>{todayLessons.map(l=>l.instrument).join(", ")}{teacher && ` · ${teacher.name} 강사`}</div>
              <div style={{fontSize:11,color:"var(--ink-30)"}}>{date}</div>
            </div>
          </div>
          {/* Condition */}
          <div className="fg">
            <label className="fg-label">학생 컨디션 · 태도</label>
            <div style={{display:"flex",gap:6}}>
              {conditionOpts.map(o => (
                <button key={o.k} className={`ftab ${form.condition===o.k?"active":""}`} onClick={()=>set("condition",o.k)} style={{flex:1,textAlign:"center",fontSize:12,padding:"7px 4px"}}>{o.l}</button>
              ))}
            </div>
          </div>
          {/* Progress */}
          <div className="fg">
            <label className="fg-label">수업 진도</label>
            <input className="inp" value={form.progress} onChange={e=>set("progress",e.target.value)} placeholder="예: 산조 해금 — 진양조 4장 ~ 중머리 1장" />
          </div>
          {/* Lesson Content */}
          <div className="fg">
            <label className="fg-label">수업 내용</label>
            <textarea className="inp" value={form.content} onChange={e=>set("content",e.target.value)} placeholder="오늘 수업에서 다룬 내용을 기록하세요." rows={3} />
          </div>
          {/* Assignment */}
          <div className="fg">
            <label className="fg-label">과제</label>
            <input className="inp" value={form.assignment} onChange={e=>set("assignment",e.target.value)} placeholder="다음 수업까지 연습할 내용" />
          </div>
          {/* Makeup needed */}
          <div className="fg">
            <div style={{display:"flex",alignItems:"center",gap:8,cursor:"pointer",marginBottom:form.makeupNeeded?8:0}} onClick={()=>set("makeupNeeded",!form.makeupNeeded)}>
              <div style={{width:20,height:20,border:"1.5px solid var(--border)",borderRadius:6,display:"flex",alignItems:"center",justifyContent:"center",background:form.makeupNeeded?"var(--blue)":"var(--paper)",transition:"all .12s"}}>{form.makeupNeeded && <span style={{color:"#fff",fontSize:12,fontWeight:700}}>✓</span>}</div>
              <span style={{fontSize:13,color:"var(--ink-60)"}}>보강 필요</span>
            </div>
            {form.makeupNeeded && <input className="inp" value={form.makeupPlan} onChange={e=>set("makeupPlan",e.target.value)} placeholder="보강 일정 및 계획" />}
          </div>
          {/* Instrument Rental */}
          <div className="fg" style={{display:"flex",alignItems:"center",gap:8,cursor:"pointer"}} onClick={()=>set("instrumentRental",!form.instrumentRental)}>
            <div style={{width:20,height:20,border:"1.5px solid var(--border)",borderRadius:6,display:"flex",alignItems:"center",justifyContent:"center",background:form.instrumentRental?"var(--blue)":"var(--paper)",transition:"all .12s"}}>{form.instrumentRental && <span style={{color:"#fff",fontSize:12,fontWeight:700}}>✓</span>}</div>
            <span style={{fontSize:13,color:"var(--ink-60)"}}>악기 대여 중</span>
          </div>
          <div className="divider" />
          {/* Memo */}
          <div className="fg">
            <label className="fg-label">비고</label>
            <input className="inp" value={form.memo} onChange={e=>set("memo",e.target.value)} placeholder="기타 참고사항" />
          </div>
          {/* Manager Report */}
          <div className="fg">
            <label className="fg-label">매니저 보고사항</label>
            <textarea className="inp" value={form.managerReport} onChange={e=>set("managerReport",e.target.value)} placeholder="매니저에게 전달할 사항 (학부모 상담 필요, 수강료 관련 등)" rows={2} style={{background:"var(--gold-lt)",borderColor:"rgba(245,168,0,.3)"}} />
          </div>
        </div>
        <div className="modal-f">
          <button className="btn btn-secondary" onClick={onClose}>취소</button>
          <button className="btn btn-primary" onClick={handleSave} disabled={saving}>{saving ? "저장 중…" : "저장"}</button>
        </div>
      </div>
    </div>
  );
}

function formatLessonNoteSummary(note) {
  if (!note) return "";
  if (typeof note === "string") return note;
  const parts = [];
  if (note.progress) parts.push(note.progress);
  if (note.content) parts.push(note.content);
  if (note.assignment) parts.push("과제: " + note.assignment);
  return parts.join(" | ") || "";
}

// ── ATTENDANCE VIEW ───────────────────────────────────────────────────────────
function AttendanceView({ students, teachers, currentUser, attendance, onSaveAttendance, categories, scheduleOverrides, onSaveScheduleOverride }) {
  const [date, setDate] = useState(TODAY_STR);
  const [filterTeacher, setFilterTeacher] = useState(currentUser.role === "teacher" ? currentUser.id : "all");
  const [noteModal, setNoteModal] = useState(null); // { studentId }
  const [absenceConfirm, setAbsenceConfirm] = useState(null); // { studentId, studentName }
  const [rescheduleModal, setRescheduleModal] = useState(null); // { studentId, studentName, instrument, originalDate, originalDay }
  const [rescheduleForm, setRescheduleForm] = useState({ newDate: "", newTime: "" });
  const dayName = ["일","월","화","수","목","금","토"][new Date(date + "T00:00:00").getDay()];

  const dayStudents = students.filter(s => {
    if (filterTeacher !== "all" && s.teacherId !== filterTeacher) return false;
    return (s.lessons || []).some(l => (l.schedule || []).some(sc => sc.day === dayName));
  });

  const getStatus = (studentId) => {
    const rec = attendance.find(a => a.studentId === studentId && a.date === date);
    return rec?.status || null;
  };

  const getRecord = (studentId) => attendance.find(a => a.studentId === studentId && a.date === date);

  const saveLessonNote = async (studentId, noteData) => {
    const existing = attendance.find(a => a.studentId === studentId && a.date === date);
    if (existing) {
      await onSaveAttendance(attendance.map(a => a.id === existing.id ? { ...a, lessonNote: noteData, note: formatLessonNoteSummary(noteData), updatedAt: Date.now() } : a));
    } else {
      // Create a record with note but no status yet
      await onSaveAttendance([...attendance, { id: uid(), studentId, teacherId: currentUser.id, date, status: "present", lessonNote: noteData, note: formatLessonNoteSummary(noteData), createdAt: Date.now() }]);
    }
    setNoteModal(null);
  };

  const toggleStatus = async (studentId, status) => {
    const existing = attendance.find(a => a.studentId === studentId && a.date === date);
    if (existing?.status === status) {
      await onSaveAttendance(attendance.filter(a => a.id !== existing.id));
    } else if (existing) {
      await onSaveAttendance(attendance.map(a => a.id === existing.id ? { ...a, status, updatedAt: Date.now() } : a));
    } else {
      await onSaveAttendance([...attendance, { id: uid(), studentId, teacherId: currentUser.id, date, status, createdAt: Date.now() }]);
    }
  };

  const daySummary = {
    present: dayStudents.filter(s => getStatus(s.id) === "present").length,
    absent: dayStudents.filter(s => getStatus(s.id) === "absent").length,
    late: dayStudents.filter(s => getStatus(s.id) === "late").length,
    excused: dayStudents.filter(s => getStatus(s.id) === "excused").length,
    none: dayStudents.filter(s => !getStatus(s.id)).length,
  };

  const noteStudent = noteModal ? students.find(s => s.id === noteModal.studentId) : null;
  const noteTeacher = noteStudent ? teachers.find(t => t.id === noteStudent.teacherId) : null;
  const noteRecord = noteModal ? getRecord(noteModal.studentId) : null;

  return (
    <div>
      <div className="ph"><div><h1>출석 체크</h1><div className="ph-sub">{dayName}요일 · {dayStudents.length}명</div></div></div>
      <div style={{display:"flex",gap:8,marginBottom:14,flexWrap:"wrap"}}>
        <input className="inp" type="date" value={date} onChange={e => setDate(e.target.value)} style={{flex:1,maxWidth:180}} />
        {canManageAll(currentUser.role) && (
          <select className="sel" value={filterTeacher} onChange={e => setFilterTeacher(e.target.value)} style={{flex:1,maxWidth:180}}>
            <option value="all">전체 강사</option>
            {teachers.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
          </select>
        )}
      </div>
      <div className="att-summary">
        <div className="att-stat" style={{background:"var(--green-lt)",color:"var(--green)"}}>✓ {daySummary.present}</div>
        <div className="att-stat" style={{background:"var(--red-lt)",color:"var(--red)"}}>✗ {daySummary.absent}</div>
        <div className="att-stat" style={{background:"var(--gold-lt)",color:"var(--gold-dk)"}}>△ {daySummary.late}</div>
        <div className="att-stat" style={{background:"var(--blue-lt)",color:"var(--blue)"}}>○ {daySummary.excused}</div>
        {daySummary.none > 0 && <div className="att-stat" style={{background:"var(--ink-10)",color:"var(--ink-30)"}}>미체크 {daySummary.none}</div>}
      </div>
      {dayStudents.length === 0 ? (
        <div className="empty"><div className="empty-icon">✓</div><div className="empty-txt">{dayName}요일 수업이 없습니다.</div></div>
      ) : (
        dayStudents.map(s => {
          const st = getStatus(s.id);
          const rec = getRecord(s.id);
          const teacher = teachers.find(t => t.id === s.teacherId);
          const todayLessons = (s.lessons || []).filter(l => (l.schedule || []).some(sc => sc.day === dayName));
          const hasNote = rec?.lessonNote || rec?.note;
          return (
            <div key={s.id} className="att-row" style={{flexWrap:"wrap"}}>
              <Av photo={s.photo} name={s.name} size="av-sm" />
              <div style={{flex:1,minWidth:0}}>
                <div style={{fontSize:13.5,fontWeight:600}}>{s.name}</div>
                <div style={{fontSize:11,color:"var(--ink-30)",whiteSpace:"nowrap",overflow:"hidden",textOverflow:"ellipsis"}}>
                  {todayLessons.map(l => l.instrument).join(", ")}
                  {teacher && ` · ${teacher.name}`}
                </div>
              </div>
              <div className="att-btns">
                <button className={`att-btn ${st === "present" ? "present" : ""}`} onClick={() => toggleStatus(s.id, "present")}><span className="att-icon">✓</span><span className="att-label">출석</span></button>
                <button className={`att-btn ${st === "absent" ? "absent" : ""}`} onClick={() => { if (st === "absent") { toggleStatus(s.id, "absent"); } else { setAbsenceConfirm({ studentId: s.id, studentName: s.name, lessons: todayLessons }); } }}><span className="att-icon">✗</span><span className="att-label">결석</span></button>
                <button className={`att-btn ${st === "late" ? "late" : ""}`} onClick={() => toggleStatus(s.id, "late")}><span className="att-icon">△</span><span className="att-label">지각</span></button>
                <button className={`att-btn ${st === "excused" ? "excused" : ""}`} onClick={() => toggleStatus(s.id, "excused")}><span className="att-icon">○</span><span className="att-label">보강</span></button>
              </div>
              {/* Lesson Note Button */}
              <div style={{width:"100%",display:"flex",justifyContent:"flex-end",marginTop:4}}>
                <button className={`btn btn-xs ${hasNote ? "btn-green" : "btn-secondary"}`} onClick={() => setNoteModal({ studentId: s.id })} style={{fontSize:11,gap:4}}>
                  <span>📝</span> {hasNote ? "레슨노트 수정" : "레슨노트 작성"}
                </button>
              </div>
            </div>
          );
        })
      )}

      {/* Lesson Note Modal */}
      {noteModal && noteStudent && (
        <LessonNoteModal
          student={noteStudent}
          teacher={noteTeacher}
          date={date}
          existingNote={noteRecord?.lessonNote || noteRecord?.note}
          onSave={async (noteData) => { await saveLessonNote(noteModal.studentId, noteData); }}
          onClose={() => setNoteModal(null)}
        />
      )}

      {/* Absence Confirmation Dialog */}
      {absenceConfirm && (
        <div className="mb" onClick={e => e.target === e.currentTarget && setAbsenceConfirm(null)}>
          <div className="modal" style={{maxWidth:380}}>
            <div className="modal-h"><h2>결석 처리</h2><button className="modal-close" onClick={() => setAbsenceConfirm(null)}>{IC.x}</button></div>
            <div className="modal-b" style={{paddingBottom:20}}>
              <div style={{background:"var(--red-lt)",border:"1px solid rgba(232,40,28,.15)",borderRadius:8,padding:"14px 16px",fontSize:13,color:"var(--red)",lineHeight:1.7,marginBottom:16}}>
                <strong>{absenceConfirm.studentName}</strong>님을<br/><strong>{date}</strong> ({dayName}요일) 결석 처리합니다.
              </div>
              <div style={{fontSize:12.5,color:"var(--ink-60)",lineHeight:1.6}}>결석 처리 후 보강 일정을 바로 등록하시겠습니까?</div>
            </div>
            <div className="modal-f" style={{paddingBottom:"calc(14px + var(--safe-b))"}}>
              <button className="btn btn-secondary" onClick={() => { toggleStatus(absenceConfirm.studentId, "absent"); setAbsenceConfirm(null); }}>결석만 처리</button>
              <button className="btn btn-primary" onClick={() => {
                toggleStatus(absenceConfirm.studentId, "absent");
                const lessons = absenceConfirm.lessons || [];
                setRescheduleModal({ studentId: absenceConfirm.studentId, studentName: absenceConfirm.studentName, instrument: lessons.map(l=>l.instrument).join(", "), originalDate: date, originalDay: dayName });
                setRescheduleForm({ newDate: "", newTime: "" });
                setAbsenceConfirm(null);
              }}>결석 + 보강 등록</button>
            </div>
          </div>
        </div>
      )}

      {/* Reschedule Modal (mini) */}
      {rescheduleModal && (
        <div className="mb" onClick={e => e.target === e.currentTarget && setRescheduleModal(null)}>
          <div className="modal" style={{maxWidth:420}}>
            <div className="modal-h"><h2>보강 일정 등록</h2><button className="modal-close" onClick={() => setRescheduleModal(null)}>{IC.x}</button></div>
            <div className="modal-b" style={{paddingBottom:20}}>
              <div style={{display:"flex",alignItems:"center",gap:10,marginBottom:16,padding:"12px 14px",background:"var(--bg)",borderRadius:8,border:"1px solid var(--border)"}}>
                <Av name={rescheduleModal.studentName} size="av-sm" />
                <div>
                  <div style={{fontSize:14,fontWeight:600}}>{rescheduleModal.studentName}</div>
                  <div style={{fontSize:12,color:"var(--blue)"}}>{rescheduleModal.instrument}</div>
                  <div style={{fontSize:11,color:"var(--ink-30)"}}>결석일: {rescheduleModal.originalDate} ({rescheduleModal.originalDay}요일)</div>
                </div>
              </div>
              <div className="fg">
                <label className="fg-label">보강 날짜</label>
                <input className="inp" type="date" value={rescheduleForm.newDate} onChange={e => setRescheduleForm(f=>({...f,newDate:e.target.value}))} min={TODAY_STR} />
              </div>
              <div className="fg">
                <label className="fg-label">보강 시간</label>
                <input className="time-inp" type="time" value={rescheduleForm.newTime} onChange={e => setRescheduleForm(f=>({...f,newTime:e.target.value}))} style={{width:"100%"}} />
              </div>
            </div>
            <div className="modal-f" style={{paddingBottom:"calc(14px + var(--safe-b))"}}>
              <button className="btn btn-secondary" onClick={() => setRescheduleModal(null)}>취소</button>
              <button className="btn btn-primary" disabled={!rescheduleForm.newDate} onClick={() => {
                if (onSaveScheduleOverride && rescheduleForm.newDate) {
                  const override = { id: uid(), studentId: rescheduleModal.studentId, originalDate: rescheduleModal.originalDate, type: "move", newDate: rescheduleForm.newDate, newTime: rescheduleForm.newTime, instrument: rescheduleModal.instrument, createdAt: Date.now() };
                  onSaveScheduleOverride([...(scheduleOverrides||[]), override]);
                }
                setRescheduleModal(null);
              }}>보강 등록</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ── PAYMENTS VIEW ─────────────────────────────────────────────────────────────
function PaymentsView({ students, teachers, currentUser, payments, onSavePayments, onLog }) {
  const [month, setMonth] = useState(THIS_MONTH);
  const [editingId, setEditingId] = useState(null);
  const [editForm, setEditForm] = useState({});
  const [filterTeacher, setFilterTeacher] = useState(currentUser.role === "teacher" ? currentUser.id : "all");
  const [previewStudent, setPreviewStudent] = useState(null);

  const visibleStudents = (filterTeacher === "all" ? students : students.filter(s => s.teacherId === filterTeacher)).filter(s => (s.status || "active") === "active");

  const getPayment = (studentId) => payments.find(p => p.studentId === studentId && p.month === month);

  const totalDue = visibleStudents.reduce((sum, s) => sum + (getPayment(s.id)?.amount || s.monthlyFee || 0), 0);
  const totalPaid = visibleStudents.reduce((sum, s) => { const p = getPayment(s.id); return sum + (p?.paid ? (p.paidAmount || p.amount) : 0); }, 0);
  const unpaidCount = visibleStudents.filter(s => { const p = getPayment(s.id); return !p?.paid; }).length;

  const exportCSV = () => {
    const header = "학생명,수강료,납부여부,입금액,입금일,입금방법,메모\n";
    const rows = visibleStudents.map(s => {
      const p = getPayment(s.id);
      const amt = p?.amount ?? s.monthlyFee ?? 0;
      return `${s.name},${amt},${p?.paid ? "완료" : "미납"},${p?.paid ? (p.paidAmount || amt) : 0},${p?.paidDate || ""},${p?.method ? (PAY_METHODS[p.method] || p.method) : ""},${(p?.note || "").replace(/,/g," ")}`;
    }).join("\n");
    const bom = "\uFEFF";
    const blob = new Blob([bom + header + rows], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = `수납현황_${month}.csv`; a.click();
    URL.revokeObjectURL(url);
  };

  const openEdit = (s) => {
    const p = getPayment(s.id);
    setEditForm({
      studentId: s.id,
      amount: p?.amount ?? s.monthlyFee ?? 0,
      paid: p?.paid ?? false,
      paidAmount: p?.paidAmount ?? p?.amount ?? s.monthlyFee ?? 0,
      paidDate: p?.paidDate ?? TODAY_STR,
      method: p?.method ?? "transfer",
      note: p?.note ?? "",
    });
    setEditingId(s.id);
  };

  const saveEdit = async () => {
    const existing = getPayment(editForm.studentId);
    const record = {
      ...(existing || {}),
      id: existing?.id || uid(),
      studentId: editForm.studentId,
      month,
      amount: editForm.amount,
      paid: editForm.paid,
      paidAmount: editForm.paid ? editForm.paidAmount : 0,
      paidDate: editForm.paid ? editForm.paidDate : "",
      method: editForm.paid ? editForm.method : "",
      note: editForm.note,
      createdAt: existing?.createdAt || Date.now(),
      updatedAt: Date.now(),
    };
    const upd = existing ? payments.map(p => p.id === existing.id ? record : p) : [...payments, record];
    await onSavePayments(upd);
    const sName = visibleStudents.find(s => s.id === editForm.studentId)?.name;
    if (editForm.paid && !existing?.paid) onLog(`${sName} 학생 ${monthLabel(month)} 수강료 입금 확인`);
    setEditingId(null);
  };

  const prevMonth = () => { const d = new Date(month + "-01"); d.setMonth(d.getMonth() - 1); setMonth(d.toISOString().slice(0,7)); };
  const nextMonth = () => { const d = new Date(month + "-01"); d.setMonth(d.getMonth() + 1); setMonth(d.toISOString().slice(0,7)); };

  return (
    <div>
      <div className="ph"><div><h1>수납 관리</h1><div className="ph-sub">{monthLabel(month)}</div></div>{canManageAll(currentUser.role) && <button className="btn btn-secondary btn-sm" onClick={exportCSV}>📥 엑셀</button>}</div>
      <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:14}}>
        <button className="btn btn-secondary btn-xs" onClick={prevMonth}>◀</button>
        <input className="inp" type="month" value={month} onChange={e => setMonth(e.target.value)} style={{flex:1,maxWidth:180,textAlign:"center"}} />
        <button className="btn btn-secondary btn-xs" onClick={nextMonth}>▶</button>
        {canManageAll(currentUser.role) && (
          <select className="sel" value={filterTeacher} onChange={e => setFilterTeacher(e.target.value)} style={{flex:1,maxWidth:160}}>
            <option value="all">전체</option>
            {teachers.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
          </select>
        )}
      </div>
      <div className="pay-summary-grid">
        <div className="pay-summary-card"><div className="pay-summary-num" style={{color:"var(--ink)"}}>{fmtMoney(totalDue)}</div><div className="pay-summary-label">총 수강료</div></div>
        <div className="pay-summary-card"><div className="pay-summary-num" style={{color:"var(--green)"}}>{fmtMoney(totalPaid)}</div><div className="pay-summary-label">입금 완료</div></div>
        <div className="pay-summary-card"><div className="pay-summary-num" style={{color:"var(--red)"}}>{unpaidCount}명</div><div className="pay-summary-label">미납</div></div>
      </div>
      {visibleStudents.length === 0 ? (
        <div className="empty"><div className="empty-icon">₩</div><div className="empty-txt">학생이 없습니다.</div></div>
      ) : visibleStudents.map(s => {
        const p = getPayment(s.id);
        const isPaid = p?.paid;
        const amt = p?.amount ?? s.monthlyFee ?? 0;
        return (
          <div key={s.id} className="pay-row" onClick={() => openEdit(s)}>
            <Av photo={s.photo} name={s.name} size="av-sm" />
            <div style={{flex:1,minWidth:0}}>
              <div style={{fontSize:13.5,fontWeight:600}}>{s.name}</div>
              <div className={`pay-status ${isPaid ? "paid" : "unpaid"}`}>
                {isPaid ? `✓ ${fmtDateShort(p.paidDate)} 입금` : "미납"}
                {p?.method && isPaid ? ` · ${PAY_METHODS[p.method] || p.method}` : ""}
              </div>
            </div>
            <div className="pay-amount" style={{color: isPaid ? "var(--green)" : "var(--ink)"}}>{fmtMoney(amt)}</div>
          </div>
        );
      })}

      {editingId && (
        <div className="mb" onClick={e => e.target === e.currentTarget && setEditingId(null)}>
          <div className="modal">
            <div className="modal-h">
              <h2>수강료 관리</h2>
              <button className="modal-close" onClick={() => setEditingId(null)}>{IC.x}</button>
            </div>
            <div className="modal-b">
              {(() => { const ps = visibleStudents.find(s=>s.id===editingId); const pt = ps ? teachers.find(t=>t.id===ps.teacherId) : null; return (
                <div style={{display:"flex",alignItems:"center",gap:10,marginBottom:12}}>
                  <div style={{fontSize:15,fontWeight:600,flex:1}}>{ps?.name} · {monthLabel(month)}</div>
                  <button className="btn btn-secondary btn-xs" onClick={()=>setPreviewStudent(ps)} style={{gap:4}}>{IC.search} 학생 정보</button>
                </div>
              );})()}
              <div className="fg">
                <label className="fg-label">수강료</label>
                <div style={{position:"relative"}}>
                  <input className="inp" inputMode="numeric" value={editForm.amount ? editForm.amount.toLocaleString("ko-KR") : ""} onChange={e => setEditForm(f => ({...f, amount: parseInt(e.target.value.replace(/[^\d]/g,"")) || 0}))} style={{paddingRight:30}} />
                  <span style={{position:"absolute",right:12,top:"50%",transform:"translateY(-50%)",fontSize:13,color:"var(--ink-30)",pointerEvents:"none"}}>원</span>
                </div>
              </div>
              {canManageAll(currentUser.role) ? (
                <>
                  <div className="fg" style={{display:"flex",alignItems:"center",gap:10,cursor:"pointer"}} onClick={() => setEditForm(f => ({...f, paid: !f.paid}))}>
                    <div style={{width:22,height:22,border:"1.5px solid var(--border)",borderRadius:6,display:"flex",alignItems:"center",justifyContent:"center",background:editForm.paid?"var(--green)":"var(--paper)",color:"#fff",fontSize:14,fontWeight:700,transition:"all .12s"}}>{editForm.paid && "✓"}</div>
                    <span style={{fontSize:14,fontWeight:500}}>입금 완료</span>
                  </div>
                  {editForm.paid && (
                    <>
                      <div className="fg-row">
                        <div className="fg"><label className="fg-label">입금액</label><div style={{position:"relative"}}><input className="inp" inputMode="numeric" value={editForm.paidAmount ? editForm.paidAmount.toLocaleString("ko-KR") : ""} onChange={e => setEditForm(f => ({...f, paidAmount: parseInt(e.target.value.replace(/[^\d]/g,"")) || 0}))} style={{paddingRight:30}} /><span style={{position:"absolute",right:12,top:"50%",transform:"translateY(-50%)",fontSize:13,color:"var(--ink-30)",pointerEvents:"none"}}>원</span></div></div>
                        <div className="fg"><label className="fg-label">입금일</label><input className="inp" type="date" value={editForm.paidDate} onChange={e => setEditForm(f => ({...f, paidDate: e.target.value}))} /></div>
                      </div>
                      <div className="fg">
                        <label className="fg-label">입금 방법</label>
                        <select className="sel" value={editForm.method} onChange={e => setEditForm(f => ({...f, method: e.target.value}))}>
                          <option value="transfer">계좌이체</option>
                          <option value="cash">현금</option>
                          <option value="card">카드</option>
                        </select>
                      </div>
                    </>
                  )}
                </>
              ) : (
                <div style={{fontSize:12.5,color:"var(--ink-30)",background:"var(--ink-10)",padding:"10px 14px",borderRadius:8,marginBottom:14}}>💡 입금 확인은 매니저 이상만 가능합니다.</div>
              )}
              <div className="fg"><label className="fg-label">메모</label><input className="inp" value={editForm.note} onChange={e => setEditForm(f => ({...f, note: e.target.value}))} placeholder="비고" /></div>
            </div>
            <div className="modal-f">
              <button className="btn btn-secondary" onClick={() => setEditingId(null)}>취소</button>
              <button className="btn btn-primary" onClick={saveEdit}>저장</button>
            </div>
          </div>
        </div>
      )}

      {/* Student info preview popup */}
      {previewStudent && (
        <div className="mb" onClick={e => e.target === e.currentTarget && setPreviewStudent(null)}>
          <div className="modal" style={{maxWidth:420}}>
            <div className="modal-h"><h2>학생 정보</h2><button className="modal-close" onClick={() => setPreviewStudent(null)}>{IC.x}</button></div>
            <div className="det-head">
              <Av photo={previewStudent.photo} name={previewStudent.name} size="av-lg" />
              <div style={{flex:1}}>
                <div className="det-name">{previewStudent.name}</div>
                {previewStudent.studentCode && <div style={{fontSize:11,color:"var(--ink-30)",marginBottom:4,fontFamily:"monospace"}}>{previewStudent.studentCode}</div>}
                <div style={{display:"flex",flexWrap:"wrap",gap:4}}>
                  <span className={`tag ${isMinor(previewStudent.birthDate) ? "tag-minor" : "tag-adult"}`}>{isMinor(previewStudent.birthDate) ? "미성년자" : "성인"}{calcAge(previewStudent.birthDate) !== null ? ` · ${calcAge(previewStudent.birthDate)}세` : ""}</span>
                  {(() => { const t = teachers.find(t=>t.id===previewStudent.teacherId); return t ? <span className="tag tag-gold">{t.name} 강사</span> : null; })()}
                </div>
              </div>
            </div>
            <div className="info-grid">
              <div className="ii"><div className="ii-label">생년월일</div><div className="ii-val">{fmtDate(previewStudent.birthDate)}</div></div>
              <div className="ii"><div className="ii-label">연락처</div><div className="ii-val">{previewStudent.phone || "-"}</div></div>
              <div className="ii"><div className="ii-label">보호자</div><div className="ii-val">{previewStudent.guardianPhone || "-"}</div></div>
              <div className="ii"><div className="ii-label">월 수강료</div><div className="ii-val">{fmtMoney(previewStudent.monthlyFee)}</div></div>
            </div>
            {(previewStudent.lessons||[]).length > 0 && <div style={{padding:"8px 20px"}}><div style={{fontSize:12,color:"var(--blue)",fontWeight:500}}>{(previewStudent.lessons||[]).map(l=>l.instrument).join(" · ")}</div></div>}
            {previewStudent.notes && <div style={{padding:"4px 20px 12px"}}><div style={{fontSize:12,color:"var(--ink-60)"}}>{previewStudent.notes}</div></div>}
            <div className="modal-f"><button className="btn btn-secondary" onClick={() => setPreviewStudent(null)}>닫기</button></div>
          </div>
        </div>
      )}
    </div>
  );
} 

// ── NOTICE FORM ───────────────────────────────────────────────────────────────
function NoticeFormModal({ notice, currentUser, onClose, onSave }) {
  const [title, setTitle] = useState(notice?.title || "");
  const [content, setContent] = useState(notice?.content || "");
  const [pinned, setPinned] = useState(notice?.pinned || false);
  const handleSave = () => {
    if (!title.trim() || !content.trim()) return;
    onSave({ ...(notice || {}), title: title.trim(), content: content.trim(), pinned, authorId: currentUser.id, authorName: currentUser.name, createdAt: notice?.createdAt || Date.now(), updatedAt: Date.now(), id: notice?.id || uid() });
  };
  return (
    <div className="mb" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal">
        <div className="modal-h"><h2>{notice ? "공지 수정" : "공지 등록"}</h2><button className="modal-close" onClick={onClose}>{IC.x}</button></div>
        <div className="modal-b">
          <div className="fg"><label className="fg-label">제목 <span className="req">*</span></label><input className="inp" value={title} onChange={e => setTitle(e.target.value)} placeholder="공지 제목" /></div>
          <div className="fg"><label className="fg-label">내용 <span className="req">*</span></label><textarea className="inp" value={content} onChange={e => setContent(e.target.value)} placeholder="공지 내용을 입력하세요." rows={6} /></div>
          <div style={{ display: "flex", alignItems: "center", gap: 8, cursor: "pointer" }} onClick={() => setPinned(v => !v)}>
            <div style={{ width: 20, height: 20, border: "1.5px solid var(--border)", borderRadius: 6, display: "flex", alignItems: "center", justifyContent: "center", background: pinned ? "var(--gold)" : "var(--paper)", transition: "all .12s" }}>{pinned && <span style={{ color: "#fff", fontSize: 12, fontWeight: 700 }}>✓</span>}</div>
            <span style={{ fontSize: 13.5, color: "var(--ink-60)" }}>상단 고정</span>
          </div>
        </div>
        <div className="modal-f"><button className="btn btn-secondary" onClick={onClose}>취소</button><button className="btn btn-primary" onClick={handleSave}>저장</button></div>
      </div>
    </div>
  );
}

// ── NOTICES VIEW ──────────────────────────────────────────────────────────────
function NoticesView({ notices, currentUser, onAdd, onEdit, onDelete }) {
  const sorted = [...notices].sort((a, b) => { if (a.pinned && !b.pinned) return -1; if (!a.pinned && b.pinned) return 1; return b.createdAt - a.createdAt; });
  const [expanded, setExpanded] = useState(null);
  const [delTarget, setDelTarget] = useState(null);
  return (
    <div>
      <div className="ph"><div><h1>공지사항</h1><div className="ph-sub">{notices.length}건</div></div></div>
      {sorted.length === 0 ? (
        <div className="empty"><div className="empty-icon">◉</div><div className="empty-txt">등록된 공지가 없습니다.</div></div>
      ) : sorted.map(n => (
        <div key={n.id} className={`notice-card ${n.pinned ? "pinned" : ""}`} onClick={() => setExpanded(expanded === n.id ? null : n.id)}>
          <div className="notice-title">{n.pinned && <span className="pin-icon">📌</span>}{n.title}</div>
          <div className="notice-meta">{n.authorName} · {fmtDateTime(n.createdAt)}</div>
          {expanded === n.id && <div className="notice-body">{n.content}</div>}
          {expanded === n.id && canManageAll(currentUser.role) && (
            <div style={{ display: "flex", gap: 8, marginTop: 10 }}>
              <button className="btn btn-secondary btn-sm" onClick={e => { e.stopPropagation(); onEdit(n); }}>수정</button>
              {delTarget === n.id ? (
                <>
                  <button className="btn btn-danger btn-sm" onClick={e => { e.stopPropagation(); onDelete(n.id); setDelTarget(null); }}>삭제 확인</button>
                  <button className="btn btn-ghost btn-sm" onClick={e => { e.stopPropagation(); setDelTarget(null); }}>취소</button>
                </>
              ) : (
                <button className="btn btn-danger btn-sm" onClick={e => { e.stopPropagation(); setDelTarget(n.id); }}>삭제</button>
              )}
            </div>
          )}
        </div>
      ))}
      {canManageAll(currentUser.role) && <button className="fab" onClick={onAdd}>{IC.plus}</button>}
    </div>
  );
}

// ── CATEGORIES VIEW ───────────────────────────────────────────────────────────
function CategoriesView({ categories, onSave, feePresets, onSaveFees }) {
  const [cats, setCats] = useState(JSON.parse(JSON.stringify(categories)));
  const [fees, setFees] = useState({ ...(feePresets || {}) });
  const [newCat, setNewCat] = useState("");
  const [newInst, setNewInst] = useState({});
  const [dirty, setDirty] = useState(false);
  const addCat = () => { if (!newCat.trim() || cats[newCat.trim()]) return; setCats(c => ({ ...c, [newCat.trim()]: [] })); setNewCat(""); setDirty(true); };
  const rmCat = cat => { const next = { ...cats }; delete next[cat]; setCats(next); setDirty(true); };
  const addInst = cat => { const v = (newInst[cat] || "").trim(); if (!v || cats[cat].includes(v)) return; setCats(c => ({ ...c, [cat]: [...c[cat], v] })); setNewInst(x => ({ ...x, [cat]: "" })); setDirty(true); };
  const rmInst = (cat, inst) => { setCats(c => ({ ...c, [cat]: c[cat].filter(x => x !== inst) })); setDirty(true); };
  const handleSaveAll = () => { onSave(cats); onSaveFees(fees); setDirty(false); };
  return (
    <div>
      <div className="ph">
        <div><h1>과목 관리</h1><div className="ph-sub">관리자 전용</div></div>
        {dirty && <button className="btn btn-primary btn-sm" onClick={handleSaveAll}>저장</button>}
      </div>
      {Object.entries(cats).map(([cat, insts]) => (
        <div key={cat} className="card" style={{ marginBottom: 10, padding: 16 }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 10 }}>
            <div style={{ fontFamily: "'Noto Serif KR',serif", fontSize: 14, fontWeight: 600, display: "flex", alignItems: "center", gap: 6 }}>
              <span style={{ width: 3, height: 13, background: "linear-gradient(180deg,var(--blue),var(--gold))", display: "inline-block", borderRadius: 2 }} />
              {cat} <span className="cat-count">{insts.length}</span>
            </div>
            <button className="btn btn-danger btn-xs" onClick={() => rmCat(cat)}>삭제</button>
          </div>
          {insts.map(inst => (
            <div key={inst} style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 5 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 4, background: "var(--blue-lt)", padding: "5px 10px", border: "1px solid rgba(43,58,159,.15)", borderRadius: 6, flex: 1 }}>
                <span style={{ fontSize: 12.5, color: "var(--blue)", fontWeight: 500, flex: 1 }}>{inst}</span>
                <button style={{ background: "none", border: "none", color: "var(--ink-30)", cursor: "pointer", fontSize: 14, lineHeight: 1, padding: "0 2px" }} onClick={() => rmInst(cat, inst)}>×</button>
              </div>
              <div style={{position:"relative",width:105,flexShrink:0}}>
                <input className="inp" inputMode="numeric" value={fees[inst] ? fees[inst].toLocaleString("ko-KR") : ""} onChange={e => { setFees(f => ({...f, [inst]: parseInt(e.target.value.replace(/[^\d]/g,"")) || 0})); setDirty(true); }} placeholder="기본료" style={{fontSize:11,padding:"5px 22px 5px 7px"}} />
                <span style={{position:"absolute",right:6,top:"50%",transform:"translateY(-50%)",fontSize:10,color:"var(--ink-30)",pointerEvents:"none"}}>원</span>
              </div>
            </div>
          ))}
          <div style={{ display: "flex", gap: 8 }}>
            <input className="inp" style={{ flex: 1 }} value={newInst[cat] || ""} onChange={e => setNewInst(x => ({ ...x, [cat]: e.target.value }))} placeholder="새 과목명" onKeyDown={e => e.key === "Enter" && addInst(cat)} />
            <button className="btn btn-green btn-sm" onClick={() => addInst(cat)}>추가</button>
          </div>
        </div>
      ))}
      <div className="card" style={{ padding: 16, borderStyle: "dashed" }}>
        <div style={{ fontFamily: "'Noto Serif KR',serif", fontSize: 13, fontWeight: 600, marginBottom: 10 }}>새 카테고리</div>
        <div style={{ display: "flex", gap: 8 }}>
          <input className="inp" style={{ flex: 1 }} value={newCat} onChange={e => setNewCat(e.target.value)} placeholder="카테고리 이름" onKeyDown={e => e.key === "Enter" && addCat()} />
          <button className="btn btn-primary btn-sm" onClick={addCat}>추가</button>
        </div>
      </div>
    </div>
  );
}

// ── PROFILE VIEW ──────────────────────────────────────────────────────────────
function ProfileView({ currentUser, teachers, students, onProfileSave, categories }) {
  const info = teachers.find(t => t.id === currentUser.id);
  const myStudents = students.filter(s => s.teacherId === currentUser.id);
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState(null);
  const fileRef = useRef();
  const startEdit = () => { setForm(info ? { ...info } : { name: currentUser.name, phone: "", email: "", bio: "", photo: "" }); setEditing(true); };
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));
  const handlePhoto = async (e) => { const file = e.target.files?.[0]; if (!file) return; try { const compressed = await compressImage(file, 360, 0.75); set("photo", compressed); } catch(err) { console.error("Photo error:",err); } };
  const handleSave = () => {
    const saveData = { ...form };
    if (saveData.newPassword && saveData.newPassword === saveData.confirmPassword) {
      saveData.password = saveData.newPassword;
    }
    delete saveData.newPassword;
    delete saveData.confirmPassword;
    onProfileSave(saveData);
    setEditing(false);
  };
  if (editing && form) return (
    <div>
      <div className="ph"><div><h1>프로필 수정</h1></div></div>
      <div className="card" style={{ padding: 0 }}>
        <div className="modal-b">
          <div className="photo-area">
            <Av photo={form.photo} name={form.name} size="av-lg" />
            <div>
              <button className="btn btn-secondary btn-sm" onClick={() => fileRef.current.click()}>사진 변경</button>
              {form.photo && <button className="btn btn-ghost btn-sm" onClick={() => set("photo", "")}>삭제</button>}
            </div>
            <input ref={fileRef} type="file" className="file-inp" accept="image/*" onChange={handlePhoto} />
          </div>
          <div className="fg"><label className="fg-label">이름</label><input className="inp" value={form.name || ""} onChange={e => set("name", e.target.value)} /></div>
          <div className="fg"><label className="fg-label">연락처</label><input className="inp" value={form.phone || ""} onChange={e => set("phone", fmtPhone(e.target.value))} placeholder="010-0000-0000" maxLength={13} /></div>
          <div className="fg"><label className="fg-label">이메일</label><input className="inp" type="email" value={form.email || ""} onChange={e => set("email", e.target.value)} /></div>
          {currentUser.role === "teacher" && (
            <div className="fg"><label className="fg-label">전공 / 담당 과목</label><InstSelector selected={form.instruments || []} onChange={v => set("instruments", v)} categories={categories} /></div>
          )}
          <div className="fg"><label className="fg-label">소개 / 경력</label><textarea className="inp" value={form.bio || ""} onChange={e => set("bio", e.target.value)} rows={3} /></div>
          <div className="divider" />
          <div style={{fontSize:12,fontWeight:600,color:"var(--ink-30)",marginBottom:8}}>비밀번호 변경</div>
          <div className="fg"><label className="fg-label">새 비밀번호 <span style={{fontWeight:400,color:"var(--ink-30)",textTransform:"none",letterSpacing:0}}>(변경 시만 입력)</span></label><input className="inp" type="password" value={form.newPassword || ""} onChange={e => set("newPassword", e.target.value)} placeholder="새 비밀번호" autoComplete="new-password" /></div>
          <div className="fg"><label className="fg-label">새 비밀번호 확인</label><input className="inp" type="password" value={form.confirmPassword || ""} onChange={e => set("confirmPassword", e.target.value)} placeholder="비밀번호 재입력" autoComplete="new-password" /></div>
          {form.newPassword && form.confirmPassword && form.newPassword !== form.confirmPassword && <div className="form-err">⚠ 비밀번호가 일치하지 않습니다.</div>}
          <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
            <button className="btn btn-secondary" onClick={() => setEditing(false)}>취소</button>
            <button className="btn btn-primary" onClick={handleSave} disabled={form.newPassword && form.newPassword !== form.confirmPassword}>저장</button>
          </div>
        </div>
      </div>
    </div>
  );
  const insts = info ? (info.instruments || []).filter(Boolean) : [];
  return (
    <div>
      <div className="ph">
        <div><h1>내 정보</h1><div className="ph-sub">{currentUser.role === "admin" ? "관리자" : currentUser.role === "manager" ? "매니저" : "강사"}</div></div>
        {currentUser.role !== "admin" && <button className="btn btn-secondary btn-sm" onClick={startEdit}>수정</button>}
      </div>
      <div className="card" style={{ overflow: "hidden" }}>
        <div className="det-head">
          <Av photo={info?.photo} name={currentUser.name} size="av-lg" />
          <div>
            <div className="det-name">{info?.name || currentUser.name}</div>
            <div style={{ fontSize: 11.5, color: "var(--ink-30)", marginBottom: 5 }}>@{currentUser.username}</div>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 4 }}>
              <RoleBadge role={currentUser.role} />
              {insts.map(i => <span key={i} className="tag tag-blue">{i}</span>)}
            </div>
          </div>
        </div>
        {currentUser.role === "admin" && <div className="info-grid"><div className="ii"><div className="ii-label">강사/매니저</div><div className="ii-val">{teachers.length}명</div></div><div className="ii"><div className="ii-label">전체 학생</div><div className="ii-val">{students.length}명</div></div></div>}
        {currentUser.role !== "admin" && info && (
          <div className="info-grid">
            <div className="ii"><div className="ii-label">연락처</div><div className="ii-val">{info.phone || "-"}</div></div>
            <div className="ii"><div className="ii-label">이메일</div><div className="ii-val">{info.email || "-"}</div></div>
            <div className="ii"><div className="ii-label">임용일</div><div className="ii-val">{fmtDate(info.hireDate)}</div></div>
            <div className="ii"><div className="ii-label">담당 학생</div><div className="ii-val">{myStudents.length}명</div></div>
          </div>
        )}
      </div>
    </div>
  );
}

// ── ACTIVITY LOG ──────────────────────────────────────────────────────────────
function ActivityView({ activity }) {
  return (
    <div>
      <div className="ph"><div><h1>활동 기록</h1><div className="ph-sub">최근 50건</div></div></div>
      {activity.length === 0 ? (
        <div className="empty"><div className="empty-icon">◷</div><div className="empty-txt">활동 기록이 없습니다.</div></div>
      ) : (
        <div className="card" style={{padding:16}}>
          {activity.slice(0, 50).map(a => (
            <div key={a.id} className="log-item">
              <div className="log-dot" />
              <div className="log-msg"><strong>{a.userName}</strong> — {a.action}</div>
              <div className="log-time">{fmtDateTime(a.timestamp)}</div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ── SHARE BUTTON ──────────────────────────────────────────────────────────────
function ShareButton({ label, desc, url, title, text }) {
  const [copied, setCopied] = useState(false);
  const handleShare = async () => {
    if (navigator.share) {
      try { await navigator.share({ title, text, url }); } catch (e) { /* cancelled */ }
    } else {
      await navigator.clipboard?.writeText(url);
      setCopied(true); setTimeout(() => setCopied(false), 2000);
    }
  };
  return (
    <div className="menu-item" onClick={handleShare} style={{borderBottom:"none"}}>
      <span style={{fontSize:16}}>🔗</span>
      <div style={{flex:1,minWidth:0}}>
        <div className="menu-item-label">{copied ? "✓ 링크 복사됨!" : label}</div>
        {desc && <div style={{fontSize:11,color:"var(--ink-30)"}}>{desc}</div>}
      </div>
      <span style={{fontSize:11,color:"var(--blue)",whiteSpace:"nowrap"}}>{navigator.share ? "공유" : "복사"}</span>
    </div>
  );
}
function SidebarShareBtn({ label, url, title, text }) {
  const [copied, setCopied] = useState(false);
  const handleShare = async () => {
    if (navigator.share) {
      try { await navigator.share({ title, text, url }); } catch (e) { /* cancelled */ }
    } else {
      await navigator.clipboard?.writeText(url);
      setCopied(true); setTimeout(() => setCopied(false), 2000);
    }
  };
  return (
    <div onClick={handleShare} style={{display:"flex",alignItems:"center",gap:8,padding:"7px 4px",cursor:"pointer",borderRadius:6,transition:"background .1s",color:copied?"var(--gold)":"rgba(255,255,255,.55)",fontSize:12}} onMouseEnter={e=>e.currentTarget.style.background="rgba(255,255,255,.06)"} onMouseLeave={e=>e.currentTarget.style.background="transparent"}>
      <span style={{fontSize:13}}>🔗</span>
      <span style={{flex:1}}>{copied ? "✓ 복사됨!" : label}</span>
      <span style={{fontSize:10,opacity:.5}}>{navigator.share ? "공유" : "복사"}</span>
    </div>
  );
}

// ── MORE MENU (Mobile) ────────────────────────────────────────────────────────
function MoreMenu({ user, setView, onLogout, onResetSeed, counts, pendingCount, darkMode, setDarkMode, trash }) {
  const [showQR, setShowQR] = useState(false);
  const [urlCopied, setUrlCopied] = useState(false);
  const regUrl = window.location.origin + window.location.pathname + "?register";
  const qrImgUrl = `https://api.qrserver.com/v1/create-qr-code/?data=${encodeURIComponent(regUrl)}&size=240x240&margin=12`;
  const isDark = darkMode === "dark" || (darkMode === null && window.matchMedia?.("(prefers-color-scheme: dark)").matches);
  const items = [
    { id: "schedule", label: "강사 스케줄", desc: "주간/월간 시간표", icon: IC.schedule },
    ...(canManageAll(user.role) ? [{ id: "pending", label: "등록 대기", desc: pendingCount > 0 ? `${pendingCount}건 대기` : "", icon: IC.edit }] : []),
    ...(canManageAll(user.role) ? [{ id: "teachers", label: "강사 · 매니저 관리", desc: `${counts.teachers}명`, icon: IC.teacher }] : []),
    ...(canManageAll(user.role) ? [{ id: "notices", label: "공지사항 관리", icon: IC.bell }] : []),
    ...(canManageAll(user.role) ? [{ id: "studentNotices", label: "수강생 공지 관리", desc: "My RYE-K 포털 공지", icon: IC.notif }] : []),
    ...(user.role === "admin" ? [{ id: "categories", label: "과목 관리", icon: IC.settings }] : []),
    ...(user.role === "admin" ? [{ id: "analytics", label: "현황 분석", desc: "마케팅 · 보고 · 통계", icon: IC.search }] : []),
    ...(canManageAll(user.role) ? [{ id: "activity", label: "활동 기록", icon: IC.cal }] : []),
    ...(canManageAll(user.role) ? [{ id: "trash", label: "휴지통", desc: trash.length > 0 ? `${trash.length}건` : "", icon: IC.x }] : []),
    { id: "profile", label: "내 정보", icon: IC.teacher },
  ];
  return (
    <div>
      <div className="ph"><div><h1>더보기</h1></div></div>
      <div style={{display:"flex",alignItems:"center",gap:12,padding:16,background:"var(--paper)",border:"1px solid var(--border)",borderRadius:"var(--radius)",marginBottom:16}}>
        <Av photo={null} name={user.name} />
        <div>
          <div style={{fontSize:15,fontWeight:600}}>{user.name}</div>
          <div style={{fontSize:12,color:"var(--ink-30)"}}>{user.role === "admin" ? "시스템 관리자" : user.role === "manager" ? "매니저" : "강사"}</div>
        </div>
      </div>
      {items.map(item => (
        <div key={item.id} className="menu-item" onClick={() => setView(item.id)}>
          <span style={{color:"var(--blue)"}}>{item.icon}</span>
          <div className="menu-item-label">{item.label}</div>
          {item.desc && <span className="menu-item-desc">{item.desc}</span>}
          <span className="menu-item-arrow">›</span>
        </div>
      ))}

      {/* Dark Mode Toggle */}
      <button className="dark-toggle" style={{marginTop:12}} onClick={() => setDarkMode(isDark ? "light" : "dark")}>
        <span style={{fontSize:16}}>{isDark ? "🌙" : "☀️"}</span>
        <span style={{flex:1,textAlign:"left"}}>{isDark ? "다크 모드" : "라이트 모드"}</span>
        <span style={{fontSize:11,color:"var(--ink-30)",marginRight:8}}>{darkMode === null ? "(시스템)" : ""}</span>
        <div className={`dark-toggle-track ${isDark ? "on" : ""}`}><div className="dark-toggle-thumb" /></div>
      </button>
      <div style={{fontSize:11,color:"var(--ink-30)",padding:"4px 14px 8px",textAlign:"right"}}>
        <span style={{cursor:"pointer",textDecoration:"underline"}} onClick={() => setDarkMode(null)}>시스템 설정 따르기</span>
      </div>

      {/* QR Code */}
      <div className="menu-item" onClick={() => setShowQR(!showQR)} style={{marginTop:4}}>
        <span style={{fontSize:18}}>📱</span>
        <div className="menu-item-label">학생 등록 QR코드</div>
        <span className="menu-item-arrow">{showQR ? "▲" : "▼"}</span>
      </div>
      {showQR && (
        <div style={{background:"var(--paper)",border:"1px solid var(--border)",borderRadius:"var(--radius)",padding:20,textAlign:"center",marginBottom:8}}>
          <img src={qrImgUrl} alt="QR" style={{width:200,height:200,margin:"0 auto 12px",display:"block",border:"1px solid var(--border)",borderRadius:8}} />
          <div style={{fontSize:12,color:"var(--ink-60)",marginBottom:8,wordBreak:"break-all"}}>{regUrl}</div>
          <div style={{display:"flex",gap:8,justifyContent:"center"}}>
            <button className="btn btn-secondary btn-sm" onClick={() => {navigator.clipboard?.writeText(regUrl).then(()=>{setUrlCopied(true);setTimeout(()=>setUrlCopied(false),2000);}); }}>{urlCopied ? "✓ 복사됨" : "URL 복사"}</button>
            <button className="btn btn-primary btn-sm" onClick={() => printQR(qrImgUrl, regUrl)}>인쇄하기</button>
          </div>
        </div>
      )}

      {/* 공유 링크 */}
      <div style={{marginTop:8,background:"var(--paper)",border:"1px solid var(--border)",borderRadius:"var(--radius)",overflow:"hidden"}}>
        <div style={{padding:"12px 16px",borderBottom:"1px solid var(--border)",fontSize:12,fontWeight:600,color:"var(--ink-30)",letterSpacing:1}}>공유하기</div>
        <ShareButton label="수강 등록 폼 공유" desc="학생/학부모에게 등록 링크 전달" url={regUrl} title="RYE-K 수강 등록" text="RYE-K K-Culture Center 수강 등록 신청서입니다." />
        <ShareButton label="My RYE-K 포털 공유" desc="학생 전용 출석/수납 조회 포털" url={window.location.origin + window.location.pathname + "?myryk"} title="My RYE-K" text="My RYE-K 학생 포털 로그인 페이지입니다." />
      </div>

      <div className="menu-item" onClick={onLogout} style={{color:"var(--red)",marginTop:8}}>
        <span>{IC.logout}</span>
        <div className="menu-item-label" style={{color:"var(--red)"}}>로그아웃</div>
      </div>
      {user.role === "admin" && (
        <div className="menu-item" onClick={onResetSeed} style={{color:"var(--ink-30)",marginTop:4,borderStyle:"dashed"}}>
          <span style={{fontSize:16}}>↻</span>
          <div className="menu-item-label" style={{color:"var(--ink-30)"}}>샘플 데이터 초기화</div>
          <span className="menu-item-desc">테스트용</span>
        </div>
      )}
    </div>
  );
}
// ── DASHBOARD ─────────────────────────────────────────────────────────────────
function Dashboard({ students, teachers, currentUser, notices, categories, attendance, payments, pending, nav }) {
  const catCounts = Object.entries(categories).map(([cat, insts]) => ({ cat, count: students.filter(s => (s.lessons || []).some(l => insts.includes(l.instrument))).length })).filter(x => x.count > 0).sort((a, b) => b.count - a.count);
  const todayStudents = students.filter(s => (s.lessons || []).some(l => (l.schedule || []).some(sc => sc.day === TODAY_DAY)));
  const todayAtt = attendance.filter(a => a.date === TODAY_STR);
  const todayChecked = todayStudents.filter(s => todayAtt.find(a => a.studentId === s.id));
  const pinnedNotices = notices.filter(n => n.pinned).slice(0, 2);
  const monthPayments = payments.filter(p => p.month === THIS_MONTH);
  const unpaidThisMonth = students.filter(s => !monthPayments.find(p => p.studentId === s.id && p.paid)).length;

  // ── Notifications ─────────────────────────────────────────────────────────
  const notifications = [];
  // 1. 미납 경고: 이번 달 3일 이후도 미납인 학생
  if (canManageAll(currentUser.role)) {
    const today = new Date();
    if (today.getDate() >= 3) {
      const unpaidStudents = students.filter(s => !monthPayments.find(p => p.studentId === s.id && p.paid));
      if (unpaidStudents.length > 0) {
        notifications.push({ type: "red", text: <><strong>미납 {unpaidStudents.length}명</strong> — {monthLabel(THIS_MONTH)} 수강료 미납 (3일 경과)</>, key: "unpaid", onClick: () => nav("payments") });
      }
    }
  }
  // 2. 생일 알림: 오늘 & 이번 주
  const todayMd = TODAY_STR.slice(5); // MM-DD
  const nextWeek = new Date(); nextWeek.setDate(nextWeek.getDate() + 7);
  const birthdayToday = students.filter(s => s.birthDate && s.birthDate.slice(5) === todayMd);
  const birthdayWeek = students.filter(s => {
    if (!s.birthDate || s.birthDate.slice(5) === todayMd) return false;
    const bd = new Date(new Date().getFullYear() + "-" + s.birthDate.slice(5));
    return bd >= new Date(TODAY_STR) && bd <= nextWeek;
  });
  birthdayToday.forEach(s => notifications.push({ type: "gold", text: <><strong>{s.name}</strong>님 오늘 생일 🎂</>, key: "bd-" + s.id }));
  birthdayWeek.slice(0, 3).forEach(s => {
    const daysLeft = Math.ceil((new Date(new Date().getFullYear() + "-" + s.birthDate.slice(5)) - new Date(TODAY_STR)) / 86400000);
    notifications.push({ type: "gold", text: <><strong>{s.name}</strong>님 생일 D-{daysLeft} 🎂</>, key: "bdw-" + s.id });
  });
  // 3. 장기 결석 알림: 이번 달 연속 2회 이상 결석
  const monthAtt = attendance.filter(a => a.date?.startsWith(THIS_MONTH));
  const absentMap = {};
  monthAtt.filter(a => a.status === "absent").forEach(a => { absentMap[a.studentId] = (absentMap[a.studentId] || 0) + 1; });
  // Check consecutive absences
  students.forEach(s => {
    const sAtts = attendance.filter(a => a.studentId === s.id).sort((a, b) => b.date.localeCompare(a.date));
    let consecutive = 0;
    for (const a of sAtts.slice(0, 5)) { if (a.status === "absent") consecutive++; else break; }
    if (consecutive >= 2) {
      notifications.push({ type: "red", text: <><strong>{s.name}</strong> 연속 {consecutive}회 결석 ⚠</>, key: "abs-" + s.id, onClick: () => nav("attendance") });
    }
  });
  // 4. 등록 대기 알림
  if (canManageAll(currentUser.role) && pending && pending.length > 0) {
    notifications.push({ type: "blue", text: <><strong>등록 대기 {pending.length}건</strong> — 승인이 필요합니다</>, key: "pending", onClick: () => nav("pending") });
  }
  // 5. 강사 기념일 (임용 기념일)
  teachers.forEach(t => {
    if (!t.startDate) return;
    if (t.startDate.slice(5) === todayMd) {
      const years = new Date().getFullYear() - new Date(t.startDate).getFullYear();
      if (years > 0) notifications.push({ type: "green", text: <><strong>{t.name}</strong> 강사 임용 {years}주년 기념일 🎉</>, key: "anni-" + t.id });
    }
  });

  return (
    <div>
      <div className="ph"><div><h1>대시보드</h1><div className="ph-sub">{new Date().toLocaleDateString("ko-KR", { month: "long", day: "numeric", weekday: "short" })} · {currentUser.name}님</div></div></div>

      {/* ── Notifications ── */}
      {notifications.length > 0 && (
        <div className="notif-card" style={{marginBottom:16}}>
          <div className="notif-hd">
            {IC.notif}
            <span className="notif-hd-title">알림</span>
            <span className="notif-badge">{notifications.length}</span>
          </div>
          {notifications.map(n => (
            <div key={n.key} className="notif-item" onClick={n.onClick} style={n.onClick ? {cursor:"pointer"} : {}}>
              <div className={`notif-dot ${n.type}`} />
              <div className="notif-text">{n.text}</div>
              {n.onClick && <span style={{color:"var(--ink-30)",fontSize:14}}>›</span>}
            </div>
          ))}
        </div>
      )}
      <div className="stat-grid">
        <div className="stat-card" onClick={() => nav("students")} style={{cursor:"pointer"}}><div className="stat-num">{students.length}</div><div className="stat-label">수강생</div><div className="stat-sub">미성년 {students.filter(s => isMinor(s.birthDate)).length}명</div></div>
        <div className="stat-card" onClick={() => nav("attendance")} style={{cursor:"pointer"}}><div className="stat-num">{todayStudents.length}</div><div className="stat-label">오늘 수업</div><div className="stat-sub">출석 {todayChecked.length}/{todayStudents.length}</div></div>
        {canManageAll(currentUser.role) && <div className="stat-card" onClick={() => nav("payments")} style={{cursor:"pointer"}}><div className="stat-num" style={{color: unpaidThisMonth > 0 ? "var(--red)" : "var(--green)"}}>{unpaidThisMonth}</div><div className="stat-label">이번달 미납</div><div className="stat-sub">{monthLabel(THIS_MONTH)}</div></div>}
        {canManageAll(currentUser.role) && <div className="stat-card"><div className="stat-num">{teachers.length}</div><div className="stat-label">강사/매니저</div></div>}
      </div>

      {pinnedNotices.length > 0 && (
        <div className="dash-section">
          {pinnedNotices.map(n => (
            <div key={n.id} className="notice-card pinned" style={{cursor:"default"}}>
              <div className="notice-title"><span className="pin-icon">📌</span>{n.title}</div>
              <div className="notice-meta">{n.authorName} · {fmtDateTime(n.createdAt)}</div>
              <div className="notice-body" style={{ marginTop: 6 }}>{n.content}</div>
            </div>
          ))}
        </div>
      )}

      {todayStudents.length > 0 && (
        <div className="dash-card">
          <div className="dash-card-title">오늘 레슨 ({TODAY_DAY}요일) <span style={{fontSize:12,color:"var(--gold-dk)",fontFamily:"inherit"}}>{todayStudents.length}명</span></div>
          <div style={{display:"flex",flexWrap:"wrap",gap:6}}>
            {todayStudents.slice(0,8).map(s => {
              const att = todayAtt.find(a => a.studentId === s.id);
              return (
                <div key={s.id} style={{display:"flex",alignItems:"center",gap:6,background:"var(--bg)",padding:"6px 10px",border:"1px solid var(--border)",borderRadius:"var(--radius-sm)"}}>
                  <Av photo={s.photo} name={s.name} size="av-sm" />
                  <div>
                    <div style={{fontSize:12,fontWeight:500}}>{s.name}</div>
                    <div style={{fontSize:10,color: att ? (att.status === "present" ? "var(--green)" : att.status === "absent" ? "var(--red)" : "var(--gold-dk)") : "var(--ink-30)"}}>
                      {att ? ATT_STATUS[att.status] : "미체크"}
                    </div>
                  </div>
                </div>
              );
            })}
            {todayStudents.length > 8 && <div style={{display:"flex",alignItems:"center",padding:"0 8px",fontSize:12,color:"var(--ink-30)"}}>+{todayStudents.length - 8}명</div>}
          </div>
        </div>
      )}

      {students.length > 0 && (
        <div className="dash-card">
          <div className="dash-card-title">분야별 수강 현황</div>
          {catCounts.map(({ cat, count }) => (
            <div key={cat} style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
              <div style={{ width: 64, fontSize: 11, color: "var(--ink-60)", flexShrink: 0 }}>{cat}</div>
              <div style={{ flex: 1, background: "var(--ink-10)", height: 6, borderRadius: 3 }}><div style={{ width: `${Math.min(100, (count / students.length) * 100)}%`, height: "100%", background: "linear-gradient(90deg,var(--blue),var(--blue-md))", borderRadius: 3 }} /></div>
              <div style={{ width: 24, textAlign: "right", fontSize: 13, fontWeight: 600, color: "var(--blue)" }}>{count}</div>
            </div>
          ))}
        </div>
      )}

      {/* Manager Reports — 매니저 보고사항 */}
      {canManageAll(currentUser.role) && (() => {
        const reports = attendance
          .filter(a => a.lessonNote && typeof a.lessonNote === "object" && a.lessonNote.managerReport && a.lessonNote.managerReport.trim())
          .sort((a, b) => (b.date || "").localeCompare(a.date || ""))
          .slice(0, 15)
          .map(a => {
            const s = students.find(st => st.id === a.studentId);
            const t = teachers.find(t => t.id === a.teacherId);
            return { ...a, studentName: s?.name || "?", teacherName: t?.name || "?" };
          });
        if (reports.length === 0) return null;
        return (
          <div className="dash-card">
            <div className="dash-card-title">매니저 보고사항</div>
            <div style={{fontSize:11,color:"var(--ink-30)",marginBottom:10}}>강사가 남긴 보고 내용 (최근 {reports.length}건)</div>
            {reports.map(r => (
              <div key={r.id} style={{background:"var(--gold-lt)",border:"1px solid rgba(245,168,0,.2)",borderRadius:8,padding:"10px 12px",marginBottom:6}}>
                <div style={{display:"flex",alignItems:"center",gap:6,marginBottom:4}}>
                  <span style={{fontSize:12,fontWeight:600,color:"var(--ink)"}}>{r.studentName}</span>
                  <span style={{fontSize:10.5,color:"var(--ink-30)"}}>· {r.teacherName} 강사 · {fmtDateShort(r.date)}</span>
                </div>
                <div style={{fontSize:12.5,color:"var(--ink-60)",lineHeight:1.6,whiteSpace:"pre-wrap"}}>{r.lessonNote.managerReport}</div>
                {r.lessonNote.progress && <div style={{fontSize:11,color:"var(--blue)",marginTop:4}}>진도: {r.lessonNote.progress}</div>}
              </div>
            ))}
          </div>
        );
      })()}

      {/* Monthly Attendance Stats */}
      {attendance.length > 0 && (
        <div className="dash-card">
          <div className="dash-card-title">이번달 출석 현황</div>
          {(() => {
            const monthAtt = attendance.filter(a => a.date?.startsWith(THIS_MONTH));
            const mPresent = monthAtt.filter(a => a.status === "present").length;
            const mAbsent = monthAtt.filter(a => a.status === "absent").length;
            const mLate = monthAtt.filter(a => a.status === "late").length;
            const mTotal = monthAtt.length;
            const mRate = mTotal > 0 ? Math.round((mPresent + mLate) / mTotal * 100) : 0;
            const absentCounts = {};
            monthAtt.filter(a => a.status === "absent").forEach(a => { absentCounts[a.studentId] = (absentCounts[a.studentId] || 0) + 1; });
            const frequentAbsent = Object.entries(absentCounts).filter(([,c]) => c >= 2).map(([sid, c]) => ({ student: students.find(s => s.id === sid), count: c })).filter(x => x.student);
            return (
              <>
                <div style={{display:"flex",gap:12,marginBottom:12,flexWrap:"wrap"}}>
                  <div style={{textAlign:"center",flex:1,minWidth:60}}>
                    <div style={{fontSize:24,fontWeight:700,color: mRate >= 80 ? "var(--green)" : mRate >= 60 ? "var(--gold-dk)" : "var(--red)",fontFamily:"'Noto Serif KR',serif"}}>{mRate}%</div>
                    <div style={{fontSize:10,color:"var(--ink-30)"}}>출석률</div>
                  </div>
                  <div style={{display:"flex",gap:6,alignItems:"center",flexWrap:"wrap"}}>
                    <div className="att-stat" style={{background:"var(--green-lt)",color:"var(--green)"}}>출석 {mPresent}</div>
                    <div className="att-stat" style={{background:"var(--red-lt)",color:"var(--red)"}}>결석 {mAbsent}</div>
                    <div className="att-stat" style={{background:"var(--gold-lt)",color:"var(--gold-dk)"}}>지각 {mLate}</div>
                  </div>
                </div>
                {frequentAbsent.length > 0 && (
                  <div style={{background:"var(--red-lt)",border:"1px solid rgba(232,40,28,.15)",borderRadius:8,padding:"10px 12px",fontSize:12,color:"var(--red)"}}>
                    <div style={{fontWeight:600,marginBottom:4}}>⚠ 결석 2회 이상</div>
                    {frequentAbsent.map(({ student, count }) => (
                      <div key={student.id} style={{display:"flex",alignItems:"center",gap:6,marginTop:4}}>
                        <span style={{fontWeight:500}}>{student.name}</span>
                        <span style={{fontSize:11}}>이번달 {count}회 결석</span>
                      </div>
                    ))}
                  </div>
                )}
              </>
            );
          })()}
        </div>
      )}
    </div>
  );
}

// ── SAMPLE DATA SEED ──────────────────────────────────────────────────────────
function generateSeedData() {
  const tid = (n) => "t" + n;
  const sid = (n) => "s" + n;

  const seedTeachers = [
    { id: tid(1), username: "kimhg", password: "1234", role: "teacher", name: "김하경", birthDate: "1990-03-15", hireDate: "2021-09-01", phone: "010-2345-6789", email: "haegyung@ryek.kr", instruments: ["해금", "가야금"], photo: "", bio: "서울대학교 국악과 졸업\n국립국악원 연수단 출신\n해금 전공, 가야금 부전공\n2021년 RYE-K 합류" },
    { id: tid(2), username: "parkdg", password: "1234", role: "teacher", name: "박대금", birthDate: "1985-11-20", hireDate: "2020-03-01", phone: "010-3456-7890", email: "daegeum@ryek.kr", instruments: ["대금 · 소금 · 단소", "피리"], photo: "", bio: "한국예술종합학교 전통예술원 졸업\n대금 전공\n전국국악경연대회 대상 수상\n관악기 전문 강사" },
    { id: tid(3), username: "leeps", password: "1234", role: "manager", name: "이판소", birthDate: "1988-07-08", hireDate: "2019-06-01", phone: "010-4567-8901", email: "pansori@ryek.kr", instruments: ["판소리", "민요"], photo: "", bio: "중요무형문화재 판소리 이수자\n전남대학교 국악학과 졸업\nRYE-K 매니저 겸 판소리 강사\n국악 교육 경력 12년" },
  ];

  const now = Date.now();
  const day = 86400000;

  const seedStudents = [
    { id: sid(1), name: "정예린", birthDate: "2012-04-10", startDate: "2024-03-01", phone: "010-1111-2222", guardianPhone: "010-9876-5432", teacherId: tid(1), lessons: [{ instrument: "해금", schedule: [{ day: "화", time: "16:00" }, { day: "목", time: "16:00" }] }], photo: "", notes: "초등학교 6학년, 해금 2년차", monthlyFee: 200000, studentCode: "RKYR01", createdAt: now - 180*day },
    { id: sid(2), name: "김도윤", birthDate: "2010-08-22", startDate: "2024-01-15", phone: "010-2222-3333", guardianPhone: "010-8765-4321", teacherId: tid(1), lessons: [{ instrument: "가야금", schedule: [{ day: "월", time: "17:00" }, { day: "수", time: "17:00" }] }], photo: "", notes: "중학교 2학년, 콩쿠르 준비 중", monthlyFee: 250000, studentCode: "RKDY02", createdAt: now - 200*day },
    { id: sid(3), name: "이서준", birthDate: "2015-01-30", startDate: "2025-01-10", phone: "", guardianPhone: "010-7654-3210", teacherId: tid(1), lessons: [{ instrument: "해금", schedule: [{ day: "수", time: "15:00" }] }], photo: "", notes: "초등학교 3학년, 입문", monthlyFee: 150000, studentCode: "RKSJ03", createdAt: now - 60*day },
    { id: sid(4), name: "박지은", birthDate: "2000-06-15", startDate: "2024-09-01", phone: "010-3333-4444", guardianPhone: "", teacherId: tid(2), lessons: [{ instrument: "대금 · 소금 · 단소", schedule: [{ day: "월", time: "19:00" }, { day: "금", time: "19:00" }] }], photo: "", notes: "대학생, 대금 전공 준비", monthlyFee: 300000, studentCode: "RKJE04", createdAt: now - 120*day },
    { id: sid(5), name: "최민수", birthDate: "1995-12-03", startDate: "2023-06-01", phone: "010-4444-5555", guardianPhone: "", teacherId: tid(2), lessons: [{ instrument: "피리", schedule: [{ day: "화", time: "20:00" }, { day: "토", time: "11:00" }] }], photo: "", notes: "직장인, 취미 피리", monthlyFee: 200000, studentCode: "RKMS05", createdAt: now - 300*day },
    { id: sid(6), name: "한소율", birthDate: "2013-09-18", startDate: "2024-05-01", phone: "010-5555-6666", guardianPhone: "010-6543-2109", teacherId: tid(2), lessons: [{ instrument: "대금 · 소금 · 단소", schedule: [{ day: "목", time: "16:30" }] }], photo: "", notes: "중학교 1학년, 소금 시작", monthlyFee: 150000, studentCode: "RKSY06", createdAt: now - 150*day },
    { id: sid(7), name: "오하늘", birthDate: "2008-03-25", startDate: "2024-02-01", phone: "010-6666-7777", guardianPhone: "010-5432-1098", teacherId: tid(3), lessons: [{ instrument: "판소리", schedule: [{ day: "수", time: "17:30" }, { day: "토", time: "10:00" }] }], photo: "", notes: "고등학교 1학년, 판소리 입문 1년차\n춘향가 학습 중", monthlyFee: 250000, studentCode: "RKHN07", createdAt: now - 170*day },
    { id: sid(8), name: "신예진", birthDate: "1998-11-11", startDate: "2023-09-01", phone: "010-7777-8888", guardianPhone: "", teacherId: tid(3), lessons: [{ instrument: "민요", schedule: [{ day: "화", time: "18:30" }, { day: "금", time: "18:30" }] }, { instrument: "판소리", schedule: [{ day: "토", time: "14:00" }] }], photo: "", notes: "대학원생, 민요 + 판소리 병행\n경기민요 전공", monthlyFee: 350000, studentCode: "RKYJ08", createdAt: now - 250*day },
    { id: sid(9), name: "강민호", birthDate: "2014-05-07", startDate: "2025-02-01", phone: "", guardianPhone: "010-4321-0987", teacherId: tid(1), lessons: [{ instrument: "가야금", schedule: [{ day: "금", time: "16:00" }] }], photo: "", notes: "초등학교 4학년, 가야금 입문", monthlyFee: 150000, studentCode: "RKMH09", createdAt: now - 30*day },
    { id: sid(10), name: "윤서아", birthDate: "2016-12-20", startDate: "2025-01-15", phone: "", guardianPhone: "010-3210-9876", teacherId: tid(3), lessons: [{ instrument: "유아 국악 프로그램", schedule: [{ day: "토", time: "09:00" }] }], photo: "", notes: "초등학교 2학년, 유아 국악 프로그램", monthlyFee: 120000, studentCode: "RKSA10", createdAt: now - 50*day },
    { id: sid(11), name: "장현우", birthDate: "1992-02-14", startDate: "2024-11-01", phone: "010-8888-9999", guardianPhone: "", teacherId: tid(2), lessons: [{ instrument: "대금 · 소금 · 단소", schedule: [{ day: "토", time: "13:00" }] }], photo: "", notes: "직장인, 주말반\n단소부터 시작", monthlyFee: 150000, studentCode: "RKHW11", createdAt: now - 90*day },
    { id: sid(12), name: "배수현", birthDate: "2011-07-02", startDate: "2024-06-01", phone: "010-9999-0000", guardianPhone: "010-2109-8765", teacherId: tid(1), lessons: [{ instrument: "해금", schedule: [{ day: "월", time: "16:00" }] }, { instrument: "가야금", schedule: [{ day: "목", time: "17:00" }] }], photo: "", notes: "중학교 1학년, 해금+가야금 병행", monthlyFee: 300000, studentCode: "RKSH12", createdAt: now - 140*day },
  ];

  // Generate attendance for recent 2 weeks (weekdays matching schedules)
  const seedAttendance = [];
  const statuses = ["present","present","present","present","present","late","absent","excused"];
  for (let d = 14; d >= 0; d--) {
    const dt = new Date(now - d * day);
    const dayName = ["일","월","화","수","목","금","토"][dt.getDay()];
    const dateStr = dt.toISOString().slice(0,10);
    seedStudents.forEach(s => {
      const hasLesson = (s.lessons || []).some(l => (l.schedule || []).some(sc => sc.day === dayName));
      if (hasLesson && d > 0) { // Don't pre-fill today
        seedAttendance.push({
          id: uid(),
          studentId: s.id,
          teacherId: s.teacherId,
          date: dateStr,
          status: statuses[Math.floor(Math.random() * statuses.length)],
          createdAt: dt.getTime(),
        });
      }
    });
  }

  // Generate payments for past 3 months + current month (some unpaid)
  const seedPayments = [];
  for (let m = 3; m >= 0; m--) {
    const pd = new Date();
    pd.setMonth(pd.getMonth() - m);
    const monthStr = pd.toISOString().slice(0,7);
    seedStudents.forEach(s => {
      const isPaid = m > 0 ? Math.random() > 0.1 : Math.random() > 0.4; // Current month: 60% paid, past: 90% paid
      const methods = ["transfer","cash","card"];
      if (isPaid || m > 0) {
        seedPayments.push({
          id: uid(),
          studentId: s.id,
          month: monthStr,
          amount: s.monthlyFee || 150000,
          paid: isPaid,
          paidAmount: isPaid ? (s.monthlyFee || 150000) : 0,
          paidDate: isPaid ? `${monthStr}-${Math.floor(Math.random()*15+1).toString().padStart(2,"0")}` : "",
          method: isPaid ? methods[Math.floor(Math.random()*3)] : "",
          note: "",
          createdAt: pd.getTime(),
          updatedAt: pd.getTime(),
        });
      }
    });
  }

  const seedNotices = [
    { id: "n1", title: "3월 정기 발표회 안내", content: "3월 29일(토) 오후 2시, RYE-K 연습실에서 정기 발표회가 진행됩니다.\n\n참여 희망 학생은 담당 강사에게 신청해 주세요.\n준비곡은 최소 1곡 이상이며, 발표 순서는 추후 공지됩니다.\n\n많은 참여 부탁드립니다.", pinned: true, authorId: "admin", authorName: "관리자", createdAt: now - 5*day, updatedAt: now - 5*day },
    { id: "n2", title: "설 연휴 휴원 안내", content: "1월 28일(화) ~ 1월 30일(목) 설 연휴 기간 동안 휴원합니다.\n보강은 개별 강사와 일정 조율해 주세요.", pinned: false, authorId: tid(3), authorName: "이판소", createdAt: now - 60*day, updatedAt: now - 60*day },
    { id: "n3", title: "신규 강사 모집 공고", content: "현악기(해금/가야금) 및 타악(장구/북) 분야 강사를 모집합니다.\n\n지원 자격:\n- 관련 전공 학사 이상\n- 교육 경력 2년 이상 우대\n\n이력서를 이메일(admin@ryek.kr)로 보내주세요.", pinned: true, authorId: "admin", authorName: "관리자", createdAt: now - 3*day, updatedAt: now - 3*day },
    { id: "n4", title: "주차장 이용 안내", content: "건물 지하 1층 주차장 이용이 가능합니다.\n수업 시간 전후 1시간 무료 주차 가능하며, 초과 시 유료입니다.\n프런트에서 주차 도장을 받아주세요.", pinned: false, authorId: tid(3), authorName: "이판소", createdAt: now - 30*day, updatedAt: now - 30*day },
  ];

  const seedActivity = [
    { id: uid(), userId: "admin", userName: "관리자", action: "신규 강사 모집 공고 등록", timestamp: now - 3*day },
    { id: uid(), userId: tid(3), userName: "이판소", action: "신예진 학생 수강료 입금 확인", timestamp: now - 4*day },
    { id: uid(), userId: tid(1), userName: "김하경", action: "강민호 학생 등록", timestamp: now - 30*day },
    { id: uid(), userId: tid(2), userName: "박대금", action: "장현우 학생 수정", timestamp: now - 35*day },
    { id: uid(), userId: "admin", userName: "관리자", action: "3월 정기 발표회 안내 공지 등록", timestamp: now - 5*day },
    { id: uid(), userId: tid(1), userName: "김하경", action: "윤서아 학생 등록", timestamp: now - 50*day },
    { id: uid(), userId: tid(3), userName: "이판소", action: "주차장 이용 안내 공지 등록", timestamp: now - 30*day },
    { id: uid(), userId: "admin", userName: "관리자", action: "과목 카테고리 수정", timestamp: now - 90*day },
  ].sort((a,b) => b.timestamp - a.timestamp);

  return { seedTeachers, seedStudents, seedAttendance, seedPayments, seedNotices, seedActivity };
}


// ── PUBLIC REGISTRATION FORM (수강 등록 신청서 — 강사 상담용) ─────────────────
function PublicRegisterForm() {
  const [step, setStep] = useState(1);
  const [form, setForm] = useState({
    name: "", birthDate: "", phone: "", guardianPhone: "", desiredInstruments: [], notes: "", photo: "",
    experience: "none", experienceDetail: "",
    purpose: "", purposeOther: "",
    referral: "", referralOther: "",
    teacherName: "", lessonType: "", lessonTypeOther: "",
    lessonDay: "", lessonTime: "", monthlyFee: 0, instrumentRental: false, startDate: TODAY_STR,
  });
  const [submitted, setSubmitted] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [err, setErr] = useState("");
  const [categories, setCategories] = useState(DEFAULT_CATEGORIES);
  const [privacyAgreed, setPrivacyAgreed] = useState(false);
  const [optionalAgreed, setOptionalAgreed] = useState(false);
  const [showFullPolicy, setShowFullPolicy] = useState(false);
  const [showPhotoPolicy, setShowPhotoPolicy] = useState(false);
  const fileRef = useRef();
  const set = (k, v) => { setForm(f => ({ ...f, [k]: v })); setErr(""); };

  useEffect(() => {
    // Anonymous auth for Firestore access
    firebaseSignInAnon();
    const unsub = onSnapshot(doc(db, COLLECTION, "rye-categories"), (snap) => {
      if (snap.exists()) setCategories(snap.data().value || DEFAULT_CATEGORIES);
    }, () => {});
    return () => unsub();
  }, []);

  const handlePhoto = async (e) => { const file = e.target.files?.[0]; if (!file) return; try { const compressed = await compressImage(file, 360, 0.75); set("photo", compressed); } catch(err) { setErr("사진 처리 중 오류가 발생했습니다."); } };
  const toggleInst = (inst) => { setForm(f => ({ ...f, desiredInstruments: f.desiredInstruments.includes(inst) ? f.desiredInstruments.filter(x => x !== inst) : [...f.desiredInstruments, inst] })); setErr(""); };
  const validateStep1 = () => { if (!form.name.trim()) { setErr("이름을 입력해주세요."); return false; } if (!form.birthDate) { setErr("생년월일을 입력해주세요. (My RYE-K 로그인 비밀번호로 사용됩니다)"); return false; } if (!form.phone.trim() && !form.guardianPhone.trim()) { setErr("연락처 또는 보호자 연락처를 입력해주세요."); return false; } return true; };
  const validateStep2 = () => { if (form.desiredInstruments.length === 0) { setErr("희망 과목을 하나 이상 선택해주세요."); return false; } return true; };

  const handleSubmit = async () => {
    if (!privacyAgreed) { setErr("개인정보 수집·이용에 동의해주세요."); return; }
    setSubmitting(true);
    try {
      const reg = { id: uid(), name: form.name.trim(), birthDate: form.birthDate, phone: form.phone, guardianPhone: form.guardianPhone, desiredInstruments: form.desiredInstruments, notes: form.notes.trim(), photo: form.photo, experience: form.experience === "yes" ? form.experienceDetail : "없음", purpose: form.purpose === "기타" ? form.purposeOther : form.purpose, referral: form.referral === "기타" ? form.referralOther : form.referral, optionalConsent: optionalAgreed, consent: { privacy: { agreed: true, agreedAt: Date.now(), ip: null }, photo: { agreed: optionalAgreed, agreedAt: optionalAgreed ? Date.now() : null } }, teacherName: form.teacherName, lessonType: form.lessonType === "기타" ? form.lessonTypeOther : form.lessonType, lessonDay: form.lessonDay, lessonTime: form.lessonTime, monthlyFee: form.monthlyFee, instrumentRental: form.instrumentRental, startDate: form.startDate, status: "pending", createdAt: Date.now() };
      const snap = await new Promise((resolve) => { const unsub = onSnapshot(doc(db, COLLECTION, "rye-pending"), (s) => { unsub(); resolve(s); }, () => resolve(null)); });
      const existing = snap?.exists() ? snap.data().value || [] : [];
      await sSet("rye-pending", [...existing, reg]);
      setSubmitted(true);
    } catch (e) { setErr("등록에 실패했습니다. 다시 시도해주세요."); } finally { setSubmitting(false); }
  };

  if (submitted) return (<><style>{CSS}</style><div style={{minHeight:"100vh",background:"#fff",display:"flex",alignItems:"center",justifyContent:"center",padding:20}}><div style={{maxWidth:400,width:"100%",textAlign:"center"}}><div style={{width:64,height:64,borderRadius:"50%",background:"#F0FDF4",display:"flex",alignItems:"center",justifyContent:"center",margin:"0 auto 20px",fontSize:28}}>✓</div><div style={{fontFamily:"'Noto Serif KR',serif",fontSize:20,fontWeight:600,marginBottom:10}}>등록이 완료되었습니다</div><div style={{fontSize:14,color:"var(--ink-60)",lineHeight:1.7,marginBottom:24}}><strong>{form.name}</strong>님의 수강 등록 신청이 정상적으로 접수되었습니다.</div><button className="btn btn-primary btn-full" onClick={() => { setSubmitted(false); setForm({name:"",birthDate:"",phone:"",guardianPhone:"",desiredInstruments:[],notes:"",photo:"",experience:"none",experienceDetail:"",purpose:"",purposeOther:"",referral:"",referralOther:"",teacherName:"",lessonType:"",lessonTypeOther:"",lessonDay:"",lessonTime:"",monthlyFee:0,instrumentRental:false,startDate:TODAY_STR}); setStep(1); setPrivacyAgreed(false); setOptionalAgreed(false); }}>새로운 등록</button></div></div></>);

  const progressPct = (step / 4) * 100;
  return (
    <><style>{CSS}</style>
    <div style={{minHeight:"100vh",background:"var(--bg)",padding:"20px 16px"}}>
      <div style={{maxWidth:480,margin:"0 auto"}}>
        <div style={{textAlign:"center",marginBottom:20}}>
          <Logo size={48} />
          <div style={{fontFamily:"'Noto Serif KR',serif",fontSize:17,fontWeight:700,color:"var(--blue)",marginTop:8}}>RYE-K K-Culture Center</div>
          <div style={{fontSize:11,color:"var(--ink-30)",letterSpacing:1.5,marginTop:3}}>수강 등록 신청서</div>
        </div>
        <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:20}}>
          <div style={{flex:1,height:4,background:"var(--border)",borderRadius:2,overflow:"hidden"}}><div style={{width:`${progressPct}%`,height:"100%",background:"var(--blue)",borderRadius:2,transition:"width .3s"}} /></div>
          <span style={{fontSize:11,color:"var(--ink-30)",flexShrink:0}}>STEP {step}/4</span>
        </div>
        {err && <div className="form-err" style={{marginBottom:12}}>⚠ {err}</div>}

        {step === 1 && (
          <div className="card" style={{padding:0,overflow:"hidden"}}>
            <div style={{background:"linear-gradient(90deg,var(--blue),var(--blue-md))",padding:"14px 20px",color:"#fff",fontSize:14,fontWeight:500}}>기본 정보</div>
            <div style={{padding:20}}>
              <div className="photo-area"><Av photo={form.photo} name={form.name} size="av-lg" /><div><button className="btn btn-secondary btn-sm" onClick={() => fileRef.current.click()}>사진 촬영/업로드</button>{form.photo && <button className="btn btn-ghost btn-sm" onClick={() => set("photo","")}>삭제</button>}<div className="photo-hint">선택사항 · 3MB 이하</div></div><input ref={fileRef} type="file" className="file-inp" accept="image/*" onChange={handlePhoto} /></div>
              <div className="fg"><label className="fg-label">이름 <span className="req">*</span></label><input className="inp" value={form.name} onChange={e => set("name",e.target.value)} placeholder="수강생 이름" /></div>
              <div className="fg"><label className="fg-label">생년월일 <span className="req">*</span> <span style={{fontWeight:400,color:"var(--ink-30)",textTransform:"none",letterSpacing:0}}>(My RYE-K 비밀번호)</span></label><input className="inp" type="date" value={form.birthDate} onChange={e => set("birthDate",e.target.value)} /></div>
              <div className="fg"><label className="fg-label">연락처 <span className="req">*</span></label><input className="inp" inputMode="tel" value={form.phone} onChange={e => set("phone",fmtPhone(e.target.value))} placeholder="010-0000-0000" maxLength={13} /></div>
              <div className="fg"><label className="fg-label">보호자 연락처 <span style={{fontWeight:400,color:"var(--ink-30)",textTransform:"none",letterSpacing:0}}>(미성년자 필수)</span></label><input className="inp" inputMode="tel" value={form.guardianPhone} onChange={e => set("guardianPhone",fmtPhone(e.target.value))} placeholder="010-0000-0000" maxLength={13} /></div>
              <div className="fg"><label className="fg-label">국악 경력</label><div style={{display:"flex",gap:6,marginBottom:form.experience==="yes"?8:0}}><button className={`ftab ${form.experience==="none"?"active":""}`} onClick={()=>{set("experience","none");set("experienceDetail","");}} style={{flex:1,textAlign:"center"}}>없음</button><button className={`ftab ${form.experience==="yes"?"active":""}`} onClick={()=>set("experience","yes")} style={{flex:1,textAlign:"center"}}>있음</button></div>{form.experience==="yes" && <input className="inp" value={form.experienceDetail} onChange={e=>set("experienceDetail",e.target.value)} placeholder="예: 해금 2년, 가야금 6개월" />}</div>
              <button className="btn btn-primary btn-full" style={{marginTop:8}} onClick={() => { if(validateStep1()) setStep(2); }}>다음</button>
            </div>
          </div>
        )}

        {step === 2 && (
          <div className="card" style={{padding:0,overflow:"hidden"}}>
            <div style={{background:"linear-gradient(90deg,var(--blue),var(--blue-md))",padding:"14px 20px",color:"#fff",fontSize:14,fontWeight:500}}>수업 정보</div>
            <div style={{padding:20}}>
              <div className="fg"><label className="fg-label">희망 과목 <span className="req">*</span> <span style={{fontWeight:400,color:"var(--ink-30)",textTransform:"none",letterSpacing:0}}>(복수 선택 가능)</span></label>
                {Object.entries(categories).map(([cat, insts]) => (<div key={cat} style={{marginBottom:10}}><div style={{fontSize:11,color:"var(--ink-30)",fontWeight:600,letterSpacing:.5,marginBottom:5}}>{cat}</div><div className="inst-select-grid">{insts.map(inst => { const checked = form.desiredInstruments.includes(inst); return (<div key={inst} className={`inst-check ${checked?"checked":""}`} onClick={()=>toggleInst(inst)}><div className="inst-check-box">{checked?"✓":""}</div>{inst}</div>); })}</div></div>))}
              </div>
              <div className="fg"><label className="fg-label">수업 목적</label><div style={{display:"flex",gap:6,flexWrap:"wrap",marginBottom:form.purpose==="기타"?8:0}}>{["취미","입시","공연 참여","기타"].map(p => (<button key={p} className={`ftab ${form.purpose===p?"active":""}`} onClick={()=>set("purpose",p)} style={{flex:"1 0 auto",textAlign:"center"}}>{p}</button>))}</div>{form.purpose==="기타" && <input className="inp" value={form.purposeOther} onChange={e=>set("purposeOther",e.target.value)} placeholder="직접 입력" />}</div>
              <div className="fg"><label className="fg-label">알게 된 경로</label><div style={{display:"flex",gap:6,flexWrap:"wrap",marginBottom:form.referral==="기타"?8:0}}>{["블로그","인스타그램","네이버 검색","지인 소개","오프라인 광고","기타"].map(r => (<button key={r} className={`ftab ${form.referral===r?"active":""}`} onClick={()=>set("referral",r)} style={{textAlign:"center",padding:"6px 10px",fontSize:11.5}}>{r}</button>))}</div>{form.referral==="기타" && <input className="inp" value={form.referralOther} onChange={e=>set("referralOther",e.target.value)} placeholder="직접 입력" />}</div>
              <div className="fg"><label className="fg-label">특이사항 · 참고사항</label><textarea className="inp" value={form.notes} onChange={e => set("notes",e.target.value)} placeholder="건강 관련, 수업 시 참고사항 등" rows={3} /></div>
              <div style={{display:"flex",gap:8,marginTop:8}}><button className="btn btn-secondary" style={{flex:1}} onClick={()=>setStep(1)}>이전</button><button className="btn btn-primary" style={{flex:2}} onClick={() => { if(validateStep2()) setStep(3); }}>다음</button></div>
            </div>
          </div>
        )}

        {step === 3 && (
          <div>
            <div className="card" style={{padding:0,overflow:"hidden",marginBottom:12}}>
              <div style={{background:"linear-gradient(90deg,var(--blue),var(--blue-md))",padding:"14px 20px",color:"#fff",fontSize:14,fontWeight:500}}>약관 동의</div>
              <div style={{padding:20}}>
                <div style={{background:"var(--bg)",border:"1px solid var(--border)",borderRadius:8,padding:14,marginBottom:12,fontSize:12.5,lineHeight:1.8,color:"var(--ink-60)"}}>
                  <div style={{fontWeight:600,color:"var(--ink)",marginBottom:5}}>개인정보 수집·이용 동의</div>
                  <div><span style={{background:"var(--blue)",color:"#fff",fontSize:9,padding:"1px 6px",borderRadius:3,fontWeight:600,marginRight:4}}>필수</span>이름, 연락처, 생년월일</div>
                  <div><span style={{background:"var(--ink-30)",color:"#fff",fontSize:9,padding:"1px 6px",borderRadius:3,fontWeight:600,marginRight:4}}>선택</span>보호자 연락처, 사진, 희망 과목, 특이사항</div>
                  <div style={{fontSize:11.5,color:"var(--ink-30)",marginTop:6}}>보유 기간: 수강 종료 후 1년간 보유 후 파기</div>
                </div>
                <button onClick={()=>setShowFullPolicy(!showFullPolicy)} style={{background:"none",border:"none",color:"var(--blue)",fontSize:12,cursor:"pointer",padding:0,textDecoration:"underline",fontFamily:"inherit",marginBottom:10,display:"block"}}>{showFullPolicy?"▲ 전문 닫기":"▼ 개인정보 처리 전문 보기"}</button>
                {showFullPolicy && (<div style={{background:"#FAFAFA",border:"1px solid var(--border)",borderRadius:8,padding:14,marginBottom:12,fontSize:11.5,lineHeight:1.9,color:"var(--ink-60)",whiteSpace:"pre-wrap",maxHeight:220,overflowY:"auto"}}>{`[개인정보 수집·이용 동의서]\n\n「개인정보 보호법」 제15조 및 제22조에 따라 안내드립니다.\n\n1. 수집·이용 목적: 수강 등록 접수 및 상담, 수업 관리, 수강료 안내, 출결 관리\n2. 수집 항목: [필수] 이름, 연락처, 생년월일 / [선택] 보호자 연락처, 사진, 희망 과목, 특이사항\n3. 보유·이용 기간: 수강 종료 후 1년간 보유 후 파기\n4. 동의 거부 권리: 필수항목 미동의 시 수강 등록 불가. 선택항목 미동의 시 수강에 영향 없음.\n5. 만 14세 미만 아동: 법정대리인(보호자)의 동의를 받아 수집합니다.`}</div>)}
                <div onClick={()=>setPrivacyAgreed(!privacyAgreed)} style={{display:"flex",alignItems:"flex-start",gap:10,cursor:"pointer",padding:"10px 0",userSelect:"none"}}><div style={{width:22,height:22,borderRadius:6,border:`2px solid ${privacyAgreed?"var(--blue)":"var(--border)"}`,background:privacyAgreed?"var(--blue)":"var(--paper)",display:"flex",alignItems:"center",justifyContent:"center",transition:"all .15s",flexShrink:0,marginTop:1}}>{privacyAgreed && <span style={{color:"#fff",fontSize:13,fontWeight:700}}>✓</span>}</div><div style={{fontSize:13,color:"var(--ink)",lineHeight:1.5}}><span style={{fontWeight:600}}>[필수]</span> 개인정보 수집·이용에 동의합니다.</div></div>
                <div className="divider" />
                <div style={{background:"var(--gold-lt)",border:"1px solid rgba(245,168,0,.2)",borderRadius:8,padding:14,marginBottom:12,fontSize:12.5,lineHeight:1.8,color:"var(--ink-60)"}}><div style={{fontWeight:600,color:"var(--ink)",marginBottom:5}}>수업 보강 및 이월 규정</div><div>• 월 4회 기본 수업 (매월 첫 주 수강료 납입)</div><div>• 레슨 당일 무단 결석 시, 보강 및 이월이 불가합니다.</div><div>• 레슨 전 사전 고지 시, 강사와 협의하여 보강 수업을 조율할 수 있습니다.</div><div>• 단, 그룹 수업(강좌)의 경우 별도 보강은 진행되지 않습니다.</div></div>
                <div className="divider" />
                <button onClick={()=>setShowPhotoPolicy(!showPhotoPolicy)} style={{background:"none",border:"none",color:"var(--ink-60)",fontSize:12,cursor:"pointer",padding:0,fontFamily:"inherit",marginBottom:8,display:"block",textDecoration:"underline"}}>{showPhotoPolicy?"▲ 촬영·이용 동의 상세 닫기":"▼ 사진 및 동영상 촬영·이용 동의 상세 보기"}</button>
                {showPhotoPolicy && (<div style={{background:"#FAFAFA",border:"1px solid var(--border)",borderRadius:8,padding:14,marginBottom:10,fontSize:11.5,lineHeight:1.9,color:"var(--ink-60)",whiteSpace:"pre-wrap",maxHeight:200,overflowY:"auto"}}>{`[선택] 사진 및 동영상 촬영·이용 및 제3자 제공 동의\n\n1. 수집 및 이용 목적: 교육·행사 기록, 기관 홍보 콘텐츠 제작 및 공식 SNS·홈페이지 게시\n2. 수집 항목: 교육·행사 중 촬영된 초상(사진, 동영상) 및 음성\n3. 제3자 제공 대상: 홍보 콘텐츠 시청자, 영상 제작 대행사, 보도 매체\n4. 보유·이용 기간: 목적 달성 후 파기 (홍보물 게시 시 철회 요청 시까지)\n5. 동의 거부 시: 촬영에서 제외되거나, 홍보물 내 블러(모자이크) 처리될 수 있습니다.`}</div>)}
                <div onClick={()=>setOptionalAgreed(!optionalAgreed)} style={{display:"flex",alignItems:"flex-start",gap:10,cursor:"pointer",padding:"6px 0",userSelect:"none"}}><div style={{width:22,height:22,borderRadius:6,border:`2px solid ${optionalAgreed?"var(--blue)":"var(--border)"}`,background:optionalAgreed?"var(--blue)":"var(--paper)",display:"flex",alignItems:"center",justifyContent:"center",transition:"all .15s",flexShrink:0,marginTop:1}}>{optionalAgreed && <span style={{color:"#fff",fontSize:13,fontWeight:700}}>✓</span>}</div><div style={{fontSize:13,color:"var(--ink)",lineHeight:1.5}}><span style={{fontWeight:500,color:"var(--ink-30)"}}>[선택]</span> 사진·동영상 촬영·이용 및 제3자 제공에 동의합니다.<div style={{fontSize:11,color:"var(--ink-30)",marginTop:2}}>미동의 시에도 수강에 영향 없습니다.</div></div></div>
              </div>
            </div>
            <div style={{display:"flex",gap:8}}><button className="btn btn-secondary" style={{flex:1}} onClick={()=>setStep(2)}>이전</button><button className="btn btn-primary" style={{flex:2}} onClick={()=>{ if(!privacyAgreed){setErr("개인정보 수집·이용에 동의해주세요.");return;} setStep(4); }} disabled={!privacyAgreed}>다음</button></div>
          </div>
        )}

        {step === 4 && (
          <div className="card" style={{padding:0,overflow:"hidden"}}>
            <div style={{background:"linear-gradient(90deg,var(--gold-dk),var(--gold))",padding:"14px 20px",color:"#fff",fontSize:14,fontWeight:500}}>강사 작성란</div>
            <div style={{padding:"6px 20px 0"}}><div style={{fontSize:11.5,color:"var(--ink-30)",lineHeight:1.6,padding:"10px 0",borderBottom:"1px solid var(--border)"}}>아래 항목은 상담 강사가 직접 작성합니다.</div></div>
            <div style={{padding:20}}>
              <div className="fg"><label className="fg-label">담당 강사</label><input className="inp" value={form.teacherName} onChange={e=>set("teacherName",e.target.value)} placeholder="강사 이름" /></div>
              <div className="fg"><label className="fg-label">수업 구분</label><div style={{display:"flex",gap:6,flexWrap:"wrap",marginBottom:form.lessonType==="기타"?8:0}}>{["그룹 (초급반)","소그룹 (중급반)","개인 (초급)","개인 (중급)","개인 (고급)","기타"].map(t => (<button key={t} className={`ftab ${form.lessonType===t?"active":""}`} onClick={()=>set("lessonType",t)} style={{textAlign:"center",padding:"6px 10px",fontSize:11.5}}>{t}</button>))}</div>{form.lessonType==="기타" && <input className="inp" value={form.lessonTypeOther} onChange={e=>set("lessonTypeOther",e.target.value)} placeholder="직접 입력" />}</div>
              <div className="fg-row"><div className="fg"><label className="fg-label">수업 요일</label><input className="inp" value={form.lessonDay} onChange={e=>set("lessonDay",e.target.value)} placeholder="예: 화, 목" /></div><div className="fg"><label className="fg-label">시간</label><input className="time-inp" type="time" value={form.lessonTime} onChange={e=>set("lessonTime",e.target.value)} style={{width:"100%"}} /></div></div>
              <div className="fg"><label className="fg-label">월 수강료</label><div style={{position:"relative",maxWidth:220}}><input className="inp" inputMode="numeric" value={form.monthlyFee?form.monthlyFee.toLocaleString("ko-KR"):""} onChange={e=>set("monthlyFee",parseInt(e.target.value.replace(/[^\d]/g,""))||0)} placeholder="0" style={{paddingRight:30}} /><span style={{position:"absolute",right:12,top:"50%",transform:"translateY(-50%)",fontSize:13,color:"var(--ink-30)",pointerEvents:"none"}}>원</span></div></div>
              <div className="fg" style={{display:"flex",alignItems:"center",gap:8,cursor:"pointer"}} onClick={()=>set("instrumentRental",!form.instrumentRental)}><div style={{width:20,height:20,border:"1.5px solid var(--border)",borderRadius:6,display:"flex",alignItems:"center",justifyContent:"center",background:form.instrumentRental?"var(--blue)":"var(--paper)",transition:"all .12s"}}>{form.instrumentRental && <span style={{color:"#fff",fontSize:12,fontWeight:700}}>✓</span>}</div><span style={{fontSize:13,color:"var(--ink-60)"}}>악기 대여</span></div>
              <div className="fg"><label className="fg-label">수업 시작일</label><input className="inp" type="date" value={form.startDate} onChange={e=>set("startDate",e.target.value)} /></div>
              <div style={{display:"flex",gap:8,marginTop:12}}><button className="btn btn-secondary" style={{flex:1}} onClick={()=>setStep(3)}>이전</button><button className="btn btn-primary" style={{flex:2}} onClick={handleSubmit} disabled={submitting}>{submitting?"등록 중…":"수강 등록 완료"}</button></div>
            </div>
          </div>
        )}
      </div>
    </div></>
  );
}

// ── PENDING REGISTRATIONS VIEW (매니저용) ─────────────────────────────────────
function PendingView({ pending, teachers, categories, onApprove, onReject }) {
  const [editTarget, setEditTarget] = useState(null);
  const [editForm, setEditForm] = useState(null);

  const startApprove = (p) => {
    setEditForm({
      name: p.name || "",
      birthDate: p.birthDate || "",
      phone: p.phone || "",
      guardianPhone: p.guardianPhone || "",
      teacherId: p.submittedById || "",
      lessons: (p.desiredInstruments || []).map(inst => ({ instrument: inst, schedule: [{ day: p.lessonDay || "", time: p.lessonTime || "" }] })),
      ...(p.lessons && p.lessons.length > 0 ? { lessons: p.lessons } : {}),
      monthlyFee: p.monthlyFee || 0,
      notes: p.notes || "",
      photo: p.photo || "",
      startDate: p.startDate || TODAY_STR,
      instrumentRental: p.instrumentRental || false,
      // Carry over for reference
      experience: p.experience || "",
      purpose: p.purpose || "",
      referral: p.referral || "",
      lessonType: p.lessonType || "",
      consent: p.consent || null,
    });
    setEditTarget(p);
  };

  const confirmApprove = () => {
    if (!editForm.name.trim()) return;
    if (!editForm.birthDate) return;
    onApprove({ ...editTarget, ...editForm });
    setEditTarget(null); setEditForm(null);
  };

  if (pending.length === 0) return (
    <div>
      <div className="ph"><div><h1>등록 대기</h1><div className="ph-sub">신규 접수 0건</div></div></div>
      <div className="empty"><div className="empty-icon">📋</div><div className="empty-txt">대기 중인 등록 신청이 없습니다.</div></div>
    </div>
  );
  return (
    <div>
      <div className="ph"><div><h1>등록 대기</h1><div className="ph-sub">신규 접수 {pending.length}건</div></div></div>
      {pending.map(p => (
        <div key={p.id} className="card" style={{ marginBottom: 10, padding: 16 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 10 }}>
            <Av photo={p.photo} name={p.name} />
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 15, fontWeight: 600 }}>{p.name}</div>
              <div style={{ fontSize: 12, color: "var(--ink-30)" }}>
                {fmtDate(p.birthDate)}{p.birthDate && ` · ${isMinor(p.birthDate) ? "미성년자" : "성인"}`}{p.birthDate && ` · ${calcAge(p.birthDate)}세`}
              </div>
              {p.submittedBy && <div style={{fontSize:11,color:"var(--blue)",marginTop:2}}>등록 요청: {p.submittedBy}</div>}
            </div>
            <div style={{ fontSize: 11, color: "var(--gold-dk)", background: "var(--gold-lt)", padding: "3px 10px", borderRadius: 6, fontWeight: 600 }}>대기</div>
          </div>
          {/* 희망 과목 */}
          <div style={{ display: "flex", flexWrap: "wrap", gap: 4, marginBottom: 8 }}>
            {(p.desiredInstruments || []).map(inst => <span key={inst} className="tag tag-blue">{inst}</span>)}
          </div>
          {/* 기본 연락처 */}
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:"2px 12px",fontSize:12,color:"var(--ink-60)",marginBottom:8}}>
            <div>연락처: {p.phone || "-"}</div>
            <div>보호자: {p.guardianPhone || "-"}</div>
          </div>
          {/* 신규 필드 — 수업 정보 */}
          <div style={{background:"var(--bg)",borderRadius:8,padding:"10px 12px",marginBottom:8,fontSize:12,lineHeight:1.8,color:"var(--ink-60)"}}>
            {p.experience && p.experience !== "없음" && <div>🎵 국악 경력: <strong style={{color:"var(--ink)"}}>{p.experience}</strong></div>}
            {p.experience === "없음" && <div>🎵 국악 경력: 없음</div>}
            {p.purpose && <div>🎯 수업 목적: <strong style={{color:"var(--ink)"}}>{p.purpose}</strong></div>}
            {p.referral && <div>📢 알게 된 경로: {p.referral}</div>}
            {p.notes && <div>📝 특이사항: {p.notes}</div>}
          </div>
          {/* 강사 작성 내용 */}
          {(p.teacherName || p.lessonType || p.lessonDay) && (
            <div style={{background:"var(--gold-lt)",borderRadius:8,padding:"10px 12px",marginBottom:8,fontSize:12,lineHeight:1.8,color:"var(--ink-60)",border:"1px solid rgba(245,168,0,.15)"}}>
              <div style={{fontSize:11,fontWeight:600,color:"var(--gold-dk)",marginBottom:2}}>강사 작성</div>
              {p.teacherName && <div>담당 강사: <strong style={{color:"var(--ink)"}}>{p.teacherName}</strong></div>}
              {p.lessonType && <div>수업 구분: {p.lessonType}</div>}
              {p.lessonDay && <div>수업 요일/시간: {p.lessonDay}{p.lessonTime ? ` ${p.lessonTime}` : ""}</div>}
              {p.monthlyFee > 0 && <div>월 수강료: {fmtMoney(p.monthlyFee)}</div>}
              {p.instrumentRental && <div>🎻 악기 대여: 예</div>}
              {p.startDate && <div>시작일: {fmtDate(p.startDate)}</div>}
            </div>
          )}
          {/* 동의 현황 */}
          {p.consent && (
            <div style={{display:"flex",gap:6,flexWrap:"wrap",marginBottom:8}}>
              <span className="tag tag-green" style={{fontSize:10}}>✓ 개인정보 동의 ({fmtDateTime(p.consent.privacy?.agreedAt)})</span>
              {p.consent.photo?.agreed ? <span className="tag tag-blue" style={{fontSize:10}}>✓ 촬영 동의</span> : <span className="tag" style={{background:"var(--ink-10)",color:"var(--ink-30)",fontSize:10}}>✗ 촬영 미동의</span>}
            </div>
          )}
          <div style={{ fontSize: 11, color: "var(--ink-30)", marginBottom: 10 }}>접수: {fmtDateTime(p.createdAt)}</div>
          <div style={{ display: "flex", gap: 8 }}>
            <button className="btn btn-primary btn-sm" style={{ flex: 1 }} onClick={() => startApprove(p)}>승인 · 정보 확인</button>
            <button className="btn btn-danger btn-sm" onClick={() => onReject(p.id)}>반려</button>
          </div>
        </div>
      ))}

      {editTarget && editForm && (
        <div className="mb" onClick={e => e.target === e.currentTarget && setEditTarget(null)}>
          <div className="modal">
            <div className="modal-h"><h2>학생 등록 확인</h2><button className="modal-close" onClick={() => setEditTarget(null)}>{IC.x}</button></div>
            <div className="modal-b">
              <div style={{fontSize:12,color:"var(--blue)",background:"var(--blue-lt)",padding:"10px 14px",borderRadius:8,marginBottom:14}}>등록 정보를 확인/수정 후 승인해주세요.</div>
              {/* Reference info from registration */}
              {(editForm.experience || editForm.purpose || editForm.referral || editForm.lessonType) && (
                <div style={{background:"var(--bg)",border:"1px solid var(--border)",borderRadius:8,padding:"10px 12px",marginBottom:14,fontSize:12,lineHeight:1.8,color:"var(--ink-60)"}}>
                  <div style={{fontSize:11,fontWeight:600,color:"var(--ink-30)",marginBottom:2}}>신청서 기재 내용</div>
                  {editForm.experience && <div>국악 경력: <strong>{editForm.experience}</strong></div>}
                  {editForm.purpose && <div>수업 목적: <strong>{editForm.purpose}</strong></div>}
                  {editForm.referral && <div>알게 된 경로: {editForm.referral}</div>}
                  {editForm.lessonType && <div>수업 구분: {editForm.lessonType}</div>}
                </div>
              )}
              {/* Consent status */}
              {editForm.consent && (
                <div style={{display:"flex",gap:6,flexWrap:"wrap",marginBottom:14}}>
                  <span className="tag tag-green" style={{fontSize:10}}>✓ 개인정보 동의 ({fmtDateTime(editForm.consent.privacy?.agreedAt)})</span>
                  {editForm.consent.photo?.agreed ? <span className="tag tag-blue" style={{fontSize:10}}>✓ 촬영 동의</span> : <span className="tag" style={{background:"var(--ink-10)",color:"var(--ink-30)",fontSize:10}}>✗ 촬영 미동의</span>}
                </div>
              )}
              <div className="fg"><label className="fg-label">이름 <span className="req">*</span></label><input className="inp" value={editForm.name} onChange={e => setEditForm(f=>({...f,name:e.target.value}))} /></div>
              <div className="fg-row">
                <div className="fg"><label className="fg-label">생년월일 <span className="req">*</span></label><input className="inp" type="date" value={editForm.birthDate} onChange={e => setEditForm(f=>({...f,birthDate:e.target.value}))} /></div>
                <div className="fg"><label className="fg-label">수강 시작일</label><input className="inp" type="date" value={editForm.startDate} onChange={e => setEditForm(f=>({...f,startDate:e.target.value}))} /></div>
              </div>
              <div className="fg"><label className="fg-label">연락처</label><input className="inp" value={editForm.phone} onChange={e => setEditForm(f=>({...f,phone:fmtPhone(e.target.value)}))} maxLength={13} /></div>
              <div className="fg"><label className="fg-label">보호자 연락처</label><input className="inp" value={editForm.guardianPhone} onChange={e => setEditForm(f=>({...f,guardianPhone:fmtPhone(e.target.value)}))} maxLength={13} /></div>
              <div className="fg">
                <label className="fg-label">담당 강사</label>
                <select className="sel" value={editForm.teacherId} onChange={e => setEditForm(f=>({...f,teacherId:e.target.value}))}>
                  <option value="">미배정</option>
                  {teachers.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
                </select>
              </div>
              <div className="fg">
                <label className="fg-label">월 수강료</label>
                <div style={{position:"relative",maxWidth:220}}>
                  <input className="inp" inputMode="numeric" value={editForm.monthlyFee ? editForm.monthlyFee.toLocaleString("ko-KR") : ""} onChange={e => setEditForm(f=>({...f,monthlyFee:parseInt(e.target.value.replace(/[^\d]/g,""))||0}))} style={{paddingRight:30}} />
                  <span style={{position:"absolute",right:12,top:"50%",transform:"translateY(-50%)",fontSize:13,color:"var(--ink-30)",pointerEvents:"none"}}>원</span>
                </div>
              </div>
              <div className="divider" />
              <LessonEditor lessons={editForm.lessons || []} onChange={v => setEditForm(f=>({...f,lessons:v}))} categories={categories} />
              <div className="fg" style={{marginTop:14,display:"flex",alignItems:"center",gap:8,cursor:"pointer"}} onClick={()=>setEditForm(f=>({...f,instrumentRental:!f.instrumentRental}))}>
                <div style={{width:20,height:20,border:"1.5px solid var(--border)",borderRadius:6,display:"flex",alignItems:"center",justifyContent:"center",background:editForm.instrumentRental?"var(--blue)":"var(--paper)",transition:"all .12s"}}>{editForm.instrumentRental && <span style={{color:"#fff",fontSize:12,fontWeight:700}}>✓</span>}</div>
                <span style={{fontSize:13,color:"var(--ink-60)"}}>악기 대여</span>
              </div>
              <div className="fg" style={{marginTop:8}}><label className="fg-label">메모</label><textarea className="inp" value={editForm.notes} onChange={e => setEditForm(f=>({...f,notes:e.target.value}))} rows={2} /></div>
            </div>
            <div className="modal-f">
              <button className="btn btn-secondary" onClick={() => setEditTarget(null)}>취소</button>
              <button className="btn btn-primary" onClick={confirmApprove} disabled={!editForm.name.trim() || !editForm.birthDate}>승인 · 학생 등록</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ── TRASH VIEW (휴지통 — 7일 백업) ───────────────────────────────────────────
function TrashView({ trash, onRestore, onPermanentDelete }) {
  const [confirmId, setConfirmId] = useState(null);
  const now = Date.now();
  const sevenDays = 7 * 24 * 60 * 60 * 1000;
  return (
    <div>
      <div className="ph"><div><h1>휴지통</h1><div className="ph-sub">삭제 후 7일간 복원 가능</div></div></div>
      {trash.length === 0 ? (
        <div className="empty"><div className="empty-icon">🗑</div><div className="empty-txt">휴지통이 비어있습니다.</div></div>
      ) : trash.map((item, idx) => {
        const remaining = Math.max(0, Math.ceil((sevenDays - (now - (item.deletedAt||0))) / (24*60*60*1000)));
        const key = `${item.id}-${item.type}-${item.deletedAt}`;
        return (
          <div key={key} className="card" style={{marginBottom:8,padding:14}}>
            <div style={{display:"flex",alignItems:"center",gap:10}}>
              <Av name={item.name} size="av-sm" />
              <div style={{flex:1}}>
                <div style={{fontSize:14,fontWeight:600}}>{item.name}</div>
                <div style={{fontSize:11,color:"var(--ink-30)"}}>
                  {item.type === "student" ? "학생" : "강사/매니저"} · 삭제: {fmtDateTime(item.deletedAt)}
                  {item.deletedBy && ` · ${item.deletedBy}`}
                </div>
                <div style={{fontSize:11,color: remaining <= 2 ? "var(--red)" : "var(--gold-dk)", marginTop:2, fontWeight:500}}>
                  {remaining}일 후 자동 삭제
                </div>
              </div>
              <div style={{display:"flex",gap:6}}>
                <button className="btn btn-green btn-xs" onClick={() => onRestore(item)}>복원</button>
                {confirmId === key ? (
                  <div style={{display:"flex",gap:4}}>
                    <button className="btn btn-danger btn-xs" onClick={() => { onPermanentDelete(item); setConfirmId(null); }}>확인</button>
                    <button className="btn btn-ghost btn-xs" onClick={() => setConfirmId(null)}>취소</button>
                  </div>
                ) : (
                  <button className="btn btn-danger btn-xs" onClick={() => setConfirmId(key)}>삭제</button>
                )}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ── STUDENT NOTICE MANAGER (수강생 공지 관리 — 관리자/매니저용) ──────────────
function StudentNoticeManager({ notices, currentUser, onSave }) {
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState({ title: "", content: "", pinned: false });
  const [confirmDel, setConfirmDel] = useState(null);

  const sorted = [...notices].sort((a,b) => { if(a.pinned&&!b.pinned)return -1; if(!a.pinned&&b.pinned)return 1; return b.createdAt-a.createdAt; });

  const startNew = () => { setForm({ title: "", content: "", pinned: false }); setEditing("new"); };
  const startEdit = (n) => { setForm({ title: n.title, content: n.content, pinned: n.pinned || false }); setEditing(n.id); };
  const handleSave = async () => {
    if (!form.title.trim() || !form.content.trim()) return;
    if (editing === "new") {
      const n = { id: uid(), title: form.title.trim(), content: form.content.trim(), pinned: form.pinned, authorId: currentUser.id, authorName: currentUser.name, createdAt: Date.now(), updatedAt: Date.now() };
      await onSave([...notices, n]);
    } else {
      await onSave(notices.map(n => n.id === editing ? { ...n, title: form.title.trim(), content: form.content.trim(), pinned: form.pinned, updatedAt: Date.now() } : n));
    }
    setEditing(null);
  };
  const handleDelete = async (id) => {
    await onSave(notices.filter(n => n.id !== id));
    setConfirmDel(null);
  };

  return (
    <div>
      <div className="ph"><div><h1>수강생 공지</h1><div className="ph-sub">My RYE-K 포털에 표시</div></div></div>
      {sorted.map(n => (
        <div key={n.id} className={`notice-card ${n.pinned ? "pinned" : ""}`}>
          <div className="notice-title">{n.pinned && <span className="pin-icon">📌</span>}{n.title}</div>
          <div className="notice-meta">{n.authorName} · {fmtDateTime(n.createdAt)}</div>
          <div className="notice-body" style={{marginTop:6}}>{n.content}</div>
          <div style={{display:"flex",gap:8,marginTop:10}}>
            <button className="btn btn-secondary btn-sm" onClick={() => startEdit(n)}>수정</button>
            {confirmDel === n.id ? (
              <>
                <button className="btn btn-danger btn-sm" onClick={() => handleDelete(n.id)}>삭제 확인</button>
                <button className="btn btn-ghost btn-sm" onClick={() => setConfirmDel(null)}>취소</button>
              </>
            ) : (
              <button className="btn btn-danger btn-sm" onClick={() => setConfirmDel(n.id)}>삭제</button>
            )}
          </div>
        </div>
      ))}
      {canManageAll(currentUser.role) && <button className="fab" onClick={startNew}>{IC.plus}</button>}

      {editing && (
        <div className="mb" onClick={e => e.target === e.currentTarget && setEditing(null)}>
          <div className="modal">
            <div className="modal-h"><h2>{editing === "new" ? "새 공지" : "공지 수정"}</h2><button className="modal-close" onClick={() => setEditing(null)}>{IC.x}</button></div>
            <div className="modal-b">
              <div className="fg"><label className="fg-label">제목 <span className="req">*</span></label><input className="inp" value={form.title} onChange={e => setForm(f=>({...f,title:e.target.value}))} placeholder="공지 제목" /></div>
              <div className="fg"><label className="fg-label">내용 <span className="req">*</span></label><textarea className="inp" value={form.content} onChange={e => setForm(f=>({...f,content:e.target.value}))} placeholder="수강생에게 전달할 공지 내용" rows={5} /></div>
              <div style={{display:"flex",alignItems:"center",gap:8,cursor:"pointer"}} onClick={() => setForm(f=>({...f,pinned:!f.pinned}))}>
                <div style={{width:20,height:20,border:"1.5px solid var(--border)",borderRadius:6,display:"flex",alignItems:"center",justifyContent:"center",background:form.pinned?"var(--gold)":"var(--paper)",transition:"all .12s"}}>{form.pinned && <span style={{color:"#fff",fontSize:12,fontWeight:700}}>✓</span>}</div>
                <span style={{fontSize:13.5,color:"var(--ink-60)"}}>상단 고정</span>
              </div>
            </div>
            <div className="modal-f"><button className="btn btn-secondary" onClick={() => setEditing(null)}>취소</button><button className="btn btn-primary" onClick={handleSave}>저장</button></div>
          </div>
        </div>
      )}
    </div>
  );
}

// ── ANALYTICS VIEW (현황 분석 — 관리자 전용) ─────────────────────────────────
function AnalyticsView({ students, teachers, attendance, payments, categories }) {
  const active = students.filter(s => (s.status||"active") === "active");
  const paused = students.filter(s => s.status === "paused");
  const withdrawn = students.filter(s => s.status === "withdrawn");

  // ── 알게 된 경로 분석
  const referralMap = {};
  students.forEach(s => {
    const r = s.registration?.referral || "미기재";
    referralMap[r] = (referralMap[r] || 0) + 1;
  });
  const referralTotal = Object.values(referralMap).reduce((a,b)=>a+b, 0);
  const referralSorted = Object.entries(referralMap).sort((a,b)=>b[1]-a[1]);
  const refColors = ["var(--blue)","var(--red)","var(--green)","var(--gold-dk)","#7C3AED","#0E7490","#B45309","#BE185D"];

  // ── 수업 목적 분석
  const purposeMap = {};
  students.forEach(s => {
    const p = s.registration?.purpose || "미기재";
    purposeMap[p] = (purposeMap[p] || 0) + 1;
  });
  const purposeSorted = Object.entries(purposeMap).sort((a,b)=>b[1]-a[1]);

  // ── 연령대 분포
  const ageGroups = { "미취학(~6)":0, "초등(7~12)":0, "중등(13~15)":0, "고등(16~18)":0, "성인(19~)":0, "미기재":0 };
  students.forEach(s => {
    const a = calcAge(s.birthDate);
    if (a === null) ageGroups["미기재"]++;
    else if (a <= 6) ageGroups["미취학(~6)"]++;
    else if (a <= 12) ageGroups["초등(7~12)"]++;
    else if (a <= 15) ageGroups["중등(13~15)"]++;
    else if (a <= 18) ageGroups["고등(16~18)"]++;
    else ageGroups["성인(19~)"]++;
  });

  // ── 악기별 수강 현황
  const instMap = {};
  active.forEach(s => {
    (s.lessons||[]).forEach(l => { instMap[l.instrument] = (instMap[l.instrument]||0) + 1; });
  });
  const instSorted = Object.entries(instMap).sort((a,b)=>b[1]-a[1]);

  // ── 강사별 학생 수
  const teacherLoad = teachers.map(t => ({
    name: t.name, role: t.role,
    count: active.filter(s => s.teacherId === t.id).length,
    total: students.filter(s => s.teacherId === t.id).length,
  })).sort((a,b)=>b.count-a.count);

  // ── 이번달 출석률
  const monthAtt = attendance.filter(a => a.date?.startsWith(THIS_MONTH));
  const mTotal = monthAtt.length;
  const mPresent = monthAtt.filter(a => a.status === "present").length;
  const mLate = monthAtt.filter(a => a.status === "late").length;
  const mAbsent = monthAtt.filter(a => a.status === "absent").length;
  const mRate = mTotal > 0 ? Math.round((mPresent + mLate) / mTotal * 100) : 0;

  // ── 이번달 수납 현황
  const monthPay = payments.filter(p => p.month === THIS_MONTH);
  const paidCount = monthPay.filter(p => p.paid).length;
  const unpaidCount = active.length - paidCount;
  const totalRevenue = monthPay.filter(p => p.paid).reduce((s, p) => s + (p.paidAmount || p.amount || 0), 0);

  // ── 월별 등록 추이 (최근 6개월)
  const monthlyEnroll = [];
  for (let i = 5; i >= 0; i--) {
    const d = new Date(); d.setMonth(d.getMonth() - i);
    const ym = d.toISOString().slice(0,7);
    const count = students.filter(s => s.createdAt && new Date(s.createdAt).toISOString().slice(0,7) === ym).length;
    monthlyEnroll.push({ label: `${d.getMonth()+1}월`, count });
  }
  const maxEnroll = Math.max(...monthlyEnroll.map(m=>m.count), 1);

  const BarChart = ({ data, max, colorFn }) => (
    <div style={{display:"flex",flexDirection:"column",gap:6}}>
      {data.map(([label, count], i) => (
        <div key={label} style={{display:"flex",alignItems:"center",gap:8}}>
          <div style={{width:80,fontSize:11.5,color:"var(--ink-60)",textAlign:"right",flexShrink:0,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{label}</div>
          <div style={{flex:1,background:"var(--ink-10)",height:20,borderRadius:4,overflow:"hidden"}}>
            <div style={{width:`${Math.max(2,(count/max)*100)}%`,height:"100%",background:colorFn?colorFn(i):"var(--blue)",borderRadius:4,transition:"width .3s"}} />
          </div>
          <div style={{width:48,fontSize:12,fontWeight:600,color:"var(--ink)",textAlign:"right"}}>{count}명</div>
          {referralTotal > 0 && max === referralTotal && <div style={{width:36,fontSize:11,color:"var(--ink-30)",textAlign:"right"}}>{Math.round(count/referralTotal*100)}%</div>}
        </div>
      ))}
    </div>
  );

  return (
    <div>
      <div className="ph"><div><h1>현황 분석</h1><div className="ph-sub">관리자 전용 · 마케팅 · 보고</div></div></div>

      {/* Overview Stats */}
      <div className="stat-grid" style={{gridTemplateColumns:"repeat(4,1fr)"}}>
        <div className="stat-card"><div className="stat-num">{active.length}</div><div className="stat-label">재원생</div></div>
        <div className="stat-card"><div className="stat-num" style={{color:"var(--gold-dk)"}}>{paused.length}</div><div className="stat-label">휴원</div></div>
        <div className="stat-card"><div className="stat-num" style={{color:"var(--ink-30)"}}>{withdrawn.length}</div><div className="stat-label">퇴원</div></div>
        <div className="stat-card"><div className="stat-num" style={{color:"var(--green)"}}>{teachers.length}</div><div className="stat-label">강사</div></div>
      </div>

      {/* Referral Source */}
      <div className="dash-card">
        <div className="dash-card-title">알게 된 경로 분석</div>
        {referralSorted.length > 0 ? (
          <BarChart data={referralSorted} max={referralTotal} colorFn={i=>refColors[i%refColors.length]} />
        ) : <div style={{fontSize:12,color:"var(--ink-30)"}}>등록 데이터가 없습니다.</div>}
      </div>

      {/* Purpose */}
      <div className="dash-card">
        <div className="dash-card-title">수업 목적 분포</div>
        {purposeSorted.length > 0 ? (
          <div style={{display:"flex",gap:6,flexWrap:"wrap"}}>
            {purposeSorted.map(([label, count]) => (
              <div key={label} style={{background:"var(--bg)",border:"1px solid var(--border)",borderRadius:8,padding:"8px 12px",textAlign:"center",minWidth:70}}>
                <div style={{fontSize:16,fontWeight:700,color:"var(--blue)",fontFamily:"'Noto Serif KR',serif"}}>{count}</div>
                <div style={{fontSize:11,color:"var(--ink-30)",marginTop:2}}>{label}</div>
              </div>
            ))}
          </div>
        ) : <div style={{fontSize:12,color:"var(--ink-30)"}}>데이터 없음</div>}
      </div>

      {/* Age Distribution */}
      <div className="dash-card">
        <div className="dash-card-title">연령대 분포</div>
        <BarChart data={Object.entries(ageGroups).filter(([,c])=>c>0)} max={Math.max(...Object.values(ageGroups),1)} colorFn={i=>["#7C3AED","var(--blue)","var(--green)","var(--gold-dk)","var(--red)","var(--ink-30)"][i%6]} />
        <div style={{marginTop:10,display:"flex",gap:10,fontSize:12}}>
          <span style={{color:"var(--blue)",fontWeight:600}}>미성년 {students.filter(s=>isMinor(s.birthDate)).length}명</span>
          <span style={{color:"var(--green)",fontWeight:600}}>성인 {students.filter(s=>!isMinor(s.birthDate)&&s.birthDate).length}명</span>
        </div>
      </div>

      {/* Instrument Popularity */}
      <div className="dash-card">
        <div className="dash-card-title">과목별 수강 현황 (재원생)</div>
        {instSorted.length > 0 ? (
          <BarChart data={instSorted} max={Math.max(...instSorted.map(([,c])=>c),1)} />
        ) : <div style={{fontSize:12,color:"var(--ink-30)"}}>데이터 없음</div>}
      </div>

      {/* Teacher Workload */}
      <div className="dash-card">
        <div className="dash-card-title">강사별 담당 학생</div>
        {teacherLoad.map(t => (
          <div key={t.name} style={{display:"flex",alignItems:"center",gap:8,marginBottom:6}}>
            <div style={{width:60,fontSize:12,fontWeight:500,color:"var(--ink)",flexShrink:0}}>{t.name}</div>
            <div style={{flex:1,background:"var(--ink-10)",height:18,borderRadius:4,overflow:"hidden"}}>
              <div style={{width:`${Math.max(2,(t.count/Math.max(...teacherLoad.map(x=>x.count),1))*100)}%`,height:"100%",background:"linear-gradient(90deg,var(--blue),var(--blue-md))",borderRadius:4}} />
            </div>
            <div style={{fontSize:12,fontWeight:600,color:"var(--ink)",width:50,textAlign:"right"}}>{t.count}명</div>
            {t.role === "manager" && <span className="tag tag-mgr" style={{fontSize:9}}>매니저</span>}
          </div>
        ))}
      </div>

      {/* Monthly Enrollment Trend */}
      <div className="dash-card">
        <div className="dash-card-title">월별 신규 등록 추이</div>
        <div style={{display:"flex",alignItems:"flex-end",gap:8,height:100,padding:"0 4px"}}>
          {monthlyEnroll.map((m, i) => (
            <div key={i} style={{flex:1,display:"flex",flexDirection:"column",alignItems:"center",gap:4}}>
              <div style={{fontSize:11,fontWeight:600,color:m.count>0?"var(--blue)":"var(--ink-30)"}}>{m.count}</div>
              <div style={{width:"100%",background:m.count>0?"var(--blue)":"var(--ink-10)",borderRadius:"4px 4px 0 0",height:`${Math.max(4,(m.count/maxEnroll)*70)}px`,transition:"height .3s"}} />
              <div style={{fontSize:10,color:"var(--ink-30)"}}>{m.label}</div>
            </div>
          ))}
        </div>
      </div>

      {/* This Month Summary */}
      <div className="dash-card">
        <div className="dash-card-title">이번달 현황 요약</div>
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:8}}>
          <div style={{textAlign:"center",padding:10,background:"var(--bg)",borderRadius:8}}>
            <div style={{fontSize:22,fontWeight:700,color:mRate>=80?"var(--green)":"var(--red)",fontFamily:"'Noto Serif KR',serif"}}>{mRate}%</div>
            <div style={{fontSize:10,color:"var(--ink-30)"}}>출석률</div>
            <div style={{fontSize:10,color:"var(--ink-30)",marginTop:2}}>출석{mPresent} 결석{mAbsent} 지각{mLate}</div>
          </div>
          <div style={{textAlign:"center",padding:10,background:"var(--bg)",borderRadius:8}}>
            <div style={{fontSize:22,fontWeight:700,color:"var(--green)",fontFamily:"'Noto Serif KR',serif"}}>{paidCount}</div>
            <div style={{fontSize:10,color:"var(--ink-30)"}}>수납 완료</div>
            {unpaidCount > 0 && <div style={{fontSize:10,color:"var(--red)",marginTop:2}}>미납 {unpaidCount}명</div>}
          </div>
          <div style={{textAlign:"center",padding:10,background:"var(--bg)",borderRadius:8}}>
            <div style={{fontSize:16,fontWeight:700,color:"var(--ink)",fontFamily:"'Noto Serif KR',serif"}}>{fmtMoney(totalRevenue)}</div>
            <div style={{fontSize:10,color:"var(--ink-30)"}}>이번달 매출</div>
          </div>
        </div>
      </div>

      {/* Consent Status */}
      <div className="dash-card">
        <div className="dash-card-title">약관 동의 현황</div>
        {(() => {
          const withConsent = students.filter(s => s.registration?.consent);
          const photoAgreed = withConsent.filter(s => s.registration?.consent?.photo?.agreed);
          return (
            <div style={{fontSize:12.5,color:"var(--ink-60)",lineHeight:1.8}}>
              <div>개인정보 동의 기록 보유: <strong style={{color:"var(--green)"}}>{withConsent.length}명</strong> / {students.length}명</div>
              <div>촬영·홍보 동의: <strong style={{color:"var(--blue)"}}>{photoAgreed.length}명</strong> · 미동의: {withConsent.length - photoAgreed.length}명</div>
              {students.length - withConsent.length > 0 && <div style={{color:"var(--ink-30)",fontSize:11}}>※ {students.length - withConsent.length}명은 신규 등록폼 이전 등록 (동의 기록 없음)</div>}
            </div>
          );
        })()}
      </div>
    </div>
  );
}

// ── SCHEDULE VIEW (강사 스케줄 캘린더) ────────────────────────────────────────
const TEACHER_COLORS = ["#2B3A9F","#E8281C","#1A7A40","#7C3AED","#C88800","#0E7490","#B45309","#BE185D"];
function getTeacherColor(id, teachersList) {
  if (!id) return "#A1A1AA";
  const idx = teachersList.findIndex(t => t.id === id);
  return TEACHER_COLORS[Math.abs(idx) % TEACHER_COLORS.length] || "#A1A1AA";
}

function ScheduleView({ students, teachers, currentUser, attendance, onSaveAttendance, onSaveScheduleOverride, scheduleOverrides }) {
  const [viewMode, setViewMode] = useState("week");
  const [filterTeacherId, setFilterTeacherId] = useState("all");
  const [weekOffset, setWeekOffset] = useState(0);
  const [monthOffset, setMonthOffset] = useState(0);
  const [dayDetail, setDayDetail] = useState(null);
  const [editEntry, setEditEntry] = useState(null); // {studentId, studentName, instrument, originalDay, originalDate}
  const [editForm, setEditForm] = useState({ action: "move", newDay: "", newTime: "", newDate: "" });

  const canSeeAll = canManageAll(currentUser.role);
  const effectiveFilter = canSeeAll ? filterTeacherId : currentUser.id;
  const visibleStudents = students.filter(s => effectiveFilter === "all" ? true : s.teacherId === effectiveFilter);

  // Build regular schedule entries from lesson data keyed by day name
  const scheduleByDay = {};
  DAYS.forEach(d => { scheduleByDay[d] = []; });
  visibleStudents.forEach(s => {
    const teacher = teachers.find(t => t.id === s.teacherId);
    (s.lessons || []).forEach(lesson => {
      (lesson.schedule || []).forEach(sch => {
        if (sch.day && DAYS.includes(sch.day)) {
          scheduleByDay[sch.day].push({
            studentId: s.id, studentName: s.name, instrument: lesson.instrument,
            time: sch.time || "", teacherId: s.teacherId,
            teacherName: teacher ? teacher.name : "미배정",
            color: getTeacherColor(s.teacherId, teachers), isMakeup: false,
          });
        }
      });
    });
  });
  DAYS.forEach(d => { scheduleByDay[d].sort((a, b) => (a.time || "").localeCompare(b.time || "")); });

  const getWeekDates = (offset) => {
    const today = new Date(TODAY_STR);
    const dow = today.getDay();
    const mondayDiff = dow === 0 ? -6 : 1 - dow;
    const monday = new Date(today);
    monday.setDate(monday.getDate() + mondayDiff + offset * 7);
    return DAYS.map((dayName, i) => {
      const d = new Date(monday);
      d.setDate(d.getDate() + i);
      return { dayName, date: d.toISOString().slice(0, 10), d };
    });
  };

  const getMakeups = (dateStr) => {
    return attendance.filter(a => a.date === dateStr && a.status === "excused" &&
      (effectiveFilter === "all" || students.find(s => s.id === a.studentId && s.teacherId === effectiveFilter))
    ).map(a => {
      const s = students.find(st => st.id === a.studentId);
      const teacher = s ? teachers.find(t => t.id === s.teacherId) : null;
      return {
        studentId: a.studentId, studentName: s ? s.name : "?",
        instrument: a.instrument || (s ? allLessonInsts(s).join(", ") : ""),
        time: a.time || "", teacherId: s ? s.teacherId : "",
        teacherName: teacher ? teacher.name : "미배정",
        color: getTeacherColor(s ? s.teacherId : null, teachers), isMakeup: true, note: a.note || "",
      };
    });
  };

  if (viewMode === "week") {
    const weekDates = getWeekDates(weekOffset);
    const first = weekDates[0].d; const last = weekDates[6].d;
    const weekLabel = first.getMonth() === last.getMonth()
      ? (first.getFullYear() + "년 " + (first.getMonth()+1) + "월 " + first.getDate() + "일 ~ " + last.getDate() + "일")
      : ((first.getMonth()+1) + "/" + first.getDate() + " ~ " + (last.getMonth()+1) + "/" + last.getDate());
    return (
      <div className="sched-wrap">
        <div className="ph"><div><h1>강사 스케줄</h1><div className="ph-sub">레슨 시간표 · 보강 현황</div></div></div>
        <div className="sched-toolbar">
          <button className={"sched-mode-btn " + (viewMode==="week"?"active":"")} onClick={() => setViewMode("week")}>주간</button>
          <button className={"sched-mode-btn " + (viewMode==="month"?"active":"")} onClick={() => setViewMode("month")}>월간</button>
          {canSeeAll && (
            <select className="sched-filter" value={filterTeacherId} onChange={e => setFilterTeacherId(e.target.value)}>
              <option value="all">전체 강사</option>
              {teachers.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
            </select>
          )}
          <div className="sched-nav">
            <button className="sched-nav-btn" onClick={() => setWeekOffset(w => w-1)}>‹</button>
            <button className="sched-nav-btn" style={{fontSize:11,width:"auto",padding:"0 8px",color:"var(--blue)"}} onClick={() => setWeekOffset(0)}>오늘</button>
            <button className="sched-nav-btn" onClick={() => setWeekOffset(w => w+1)}>›</button>
          </div>
        </div>
        <div style={{fontSize:12,color:"var(--ink-60)",marginBottom:12,textAlign:"center",fontWeight:500}}>{weekLabel}</div>
        {weekDates.map(({ dayName, date, d }) => {
          const isToday = date === TODAY_STR;
          const lessons = scheduleByDay[dayName] || [];
          const makeups = getMakeups(date);
          const all = [...lessons, ...makeups].sort((a, b) => (a.time||"").localeCompare(b.time||""));
          return (
            <div key={dayName} className="sched-day-section">
              <div className={"sched-day-hd" + (isToday?" today":"")}>
                <span className="sched-day-name">{dayName}요일</span>
                <span className="sched-day-date">{d.getMonth()+1}/{d.getDate()}{isToday?" · 오늘":""}</span>
                <span style={{marginLeft:"auto",fontSize:11,color:"var(--ink-30)"}}>{all.length}명</span>
              </div>
              {all.length === 0 ? (
                <div className="sched-empty">레슨 없음</div>
              ) : all.map((entry, i) => (
                <div key={i} className={"sched-lesson" + (entry.isMakeup?" makeup":"")} style={{borderLeftColor:entry.color,cursor:"pointer"}} onClick={()=>{setEditEntry({studentId:entry.studentId,studentName:entry.studentName,instrument:entry.instrument,originalDay:dayName,originalDate:date,time:entry.time});setEditForm({action:"move",newDay:"",newTime:entry.time||"",newDate:""});}}>
                  <span className="sched-time">{entry.time||"—"}</span>
                  <div className="sched-info">
                    <div className="sched-name">{entry.studentName}</div>
                    <div className="sched-inst">{entry.instrument}</div>
                    <div className="sched-teacher">{entry.teacherName}</div>
                  </div>
                  {entry.isMakeup && <span className="sched-makeup-badge">보강</span>}
                  {(scheduleOverrides||[]).find(o=>o.studentId===entry.studentId&&o.originalDate===date&&o.type==="absent") && <span style={{background:"var(--red-lt)",color:"var(--red)",fontSize:10,fontWeight:600,padding:"2px 8px",borderRadius:6,flexShrink:0}}>결석</span>}
                  {(scheduleOverrides||[]).find(o=>o.studentId===entry.studentId&&o.originalDate===date&&o.type==="move") && <span style={{background:"var(--gold-lt)",color:"var(--gold-dk)",fontSize:10,fontWeight:600,padding:"2px 8px",borderRadius:6,flexShrink:0}}>변경</span>}
                </div>
              ))}
            </div>
          );
        })}
        {editEntry && (
          <div className="mb" onClick={e => e.target === e.currentTarget && setEditEntry(null)}>
            <div className="modal">
              <div className="modal-h"><h2>스케줄 변경</h2><button className="modal-close" onClick={() => setEditEntry(null)}>{IC.x}</button></div>
              <div className="modal-b">
                <div style={{display:"flex",alignItems:"center",gap:10,marginBottom:16,padding:"12px 14px",background:"var(--bg)",borderRadius:8,border:"1px solid var(--border)"}}>
                  <Av name={editEntry.studentName} size="av-sm" />
                  <div>
                    <div style={{fontSize:14,fontWeight:600}}>{editEntry.studentName}</div>
                    <div style={{fontSize:12,color:"var(--blue)"}}>{editEntry.instrument} · {editEntry.originalDay}요일 {editEntry.time||""}</div>
                    <div style={{fontSize:11,color:"var(--ink-30)"}}>{editEntry.originalDate}</div>
                  </div>
                </div>

                <div style={{display:"flex",gap:6,marginBottom:16}}>
                  <button className={`ftab ${editForm.action==="move"?"active":""}`} onClick={()=>setEditForm(f=>({...f,action:"move"}))} style={{flex:1,textAlign:"center"}}>다른 날로 변경</button>
                  <button className={`ftab ${editForm.action==="absent"?"active":""}`} onClick={()=>setEditForm(f=>({...f,action:"absent"}))} style={{flex:1,textAlign:"center"}}>이번 결석</button>
                </div>

                {editForm.action === "move" && (
                  <>
                    <div className="fg">
                      <label className="fg-label">변경할 날짜</label>
                      <input className="inp" type="date" value={editForm.newDate} onChange={e => setEditForm(f=>({...f,newDate:e.target.value}))} min={TODAY_STR} />
                    </div>
                    <div className="fg">
                      <label className="fg-label">변경할 시간</label>
                      <input className="time-inp" type="time" value={editForm.newTime} onChange={e => setEditForm(f=>({...f,newTime:e.target.value}))} style={{width:"100%"}} />
                    </div>
                  </>
                )}
                {editForm.action === "absent" && (
                  <div style={{background:"var(--red-lt)",border:"1px solid rgba(232,40,28,.15)",borderRadius:8,padding:"12px 14px",fontSize:13,color:"var(--red)",lineHeight:1.6}}>
                    <strong>{editEntry.originalDate}</strong> ({editEntry.originalDay}요일) 레슨을 결석 처리합니다.<br/>
                    해당 날짜의 스케줄이 제거됩니다.
                  </div>
                )}
              </div>
              <div className="modal-f">
                <button className="btn btn-secondary" onClick={() => setEditEntry(null)}>취소</button>
                <button className="btn btn-primary" onClick={() => {
                  if (editForm.action === "absent") {
                    const override = { id: uid(), studentId: editEntry.studentId, originalDate: editEntry.originalDate, type: "absent", createdAt: Date.now() };
                    onSaveScheduleOverride && onSaveScheduleOverride([...(scheduleOverrides||[]), override]);
                  } else if (editForm.action === "move" && editForm.newDate) {
                    const override = { id: uid(), studentId: editEntry.studentId, originalDate: editEntry.originalDate, type: "move", newDate: editForm.newDate, newTime: editForm.newTime, instrument: editEntry.instrument, createdAt: Date.now() };
                    onSaveScheduleOverride && onSaveScheduleOverride([...(scheduleOverrides||[]), override]);
                  }
                  setEditEntry(null);
                }} disabled={editForm.action === "move" && !editForm.newDate}>
                  {editForm.action === "absent" ? "결석 처리" : "스케줄 변경"}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }

  // Monthly view
  const now = new Date();
  const rawMonth = now.getMonth() + monthOffset;
  const viewYear = now.getFullYear() + Math.floor(rawMonth / 12);
  const viewMonth = ((rawMonth % 12) + 12) % 12;
  const firstDay = new Date(viewYear, viewMonth, 1);
  const lastDay = new Date(viewYear, viewMonth+1, 0);
  const startDow = firstDay.getDay();
  const startOffset = startDow === 0 ? 6 : startDow - 1;
  const calStart = new Date(firstDay);
  calStart.setDate(calStart.getDate() - startOffset);
  const calCells = [];
  const cur = new Date(calStart);
  while (calCells.length < 42) {
    calCells.push(new Date(cur));
    cur.setDate(cur.getDate() + 1);
    if (cur > lastDay && calCells.length % 7 === 0) break;
  }

  return (
    <div className="sched-wrap">
      <div className="ph"><div><h1>강사 스케줄</h1><div className="ph-sub">월간 레슨 현황</div></div></div>
      <div className="sched-toolbar">
        <button className={"sched-mode-btn " + (viewMode==="week"?"active":"")} onClick={() => setViewMode("week")}>주간</button>
        <button className={"sched-mode-btn " + (viewMode==="month"?"active":"")} onClick={() => setViewMode("month")}>월간</button>
        {canSeeAll && (
          <select className="sched-filter" value={filterTeacherId} onChange={e => setFilterTeacherId(e.target.value)}>
            <option value="all">전체 강사</option>
            {teachers.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
          </select>
        )}
        <div className="sched-nav">
          <button className="sched-nav-btn" onClick={() => setMonthOffset(m => m-1)}>‹</button>
          <button className="sched-nav-btn" style={{fontSize:11,width:"auto",padding:"0 8px",color:"var(--blue)"}} onClick={() => setMonthOffset(0)}>오늘</button>
          <button className="sched-nav-btn" onClick={() => setMonthOffset(m => m+1)}>›</button>
        </div>
      </div>
      <div style={{fontSize:13,color:"var(--ink-60)",marginBottom:12,textAlign:"center",fontWeight:600}}>
        {viewYear}년 {viewMonth+1}월
      </div>
      <div className="sched-month-grid">
        {["월","화","수","목","금","토","일"].map(d => <div key={d} className="sched-month-hd">{d}</div>)}
        {calCells.map((d, i) => {
          const dateStr = d.toISOString().slice(0, 10);
          const isToday = dateStr === TODAY_STR;
          const isThisMonth = d.getMonth() === viewMonth;
          const dayName = DAYS[d.getDay()===0?6:d.getDay()-1];
          const count = (scheduleByDay[dayName]||[]).length + getMakeups(dateStr).length;
          const isSelected = dayDetail === dateStr;
          return (
            <div key={i} className={"sched-month-cell"+(isToday?" today":"")+((!isThisMonth)?" other-month":"")}
              style={isSelected?{border:"2px solid var(--gold)"}:{}} onClick={() => setDayDetail(isSelected?null:dateStr)}>
              <div className="sched-month-cell-day">{d.getDate()}</div>
              {count > 0 && (
                <div className="sched-month-dots">
                  {count <= 5 ? Array(Math.min(count,5)).fill(0).map((_,j) => <div key={j} className="sched-month-dot"/>) : <span className="sched-month-count">{count}명</span>}
                </div>
              )}
            </div>
          );
        })}
      </div>
      {dayDetail && (() => {
        const d = new Date(dayDetail);
        const dayName = DAYS[d.getDay()===0?6:d.getDay()-1];
        const lessons = scheduleByDay[dayName] || [];
        const makeups = getMakeups(dayDetail);
        const all = [...lessons, ...makeups].sort((a,b) => (a.time||"").localeCompare(b.time||""));
        return (
          <div className="card" style={{padding:0,overflow:"hidden",marginTop:8}}>
            <div style={{padding:"12px 16px",borderBottom:"1px solid var(--border)",display:"flex",alignItems:"center",justifyContent:"space-between"}}>
              <span style={{fontSize:14,fontWeight:600,fontFamily:"'Noto Serif KR',serif"}}>{d.getMonth()+1}월 {d.getDate()}일 ({dayName})</span>
              <button className="btn btn-ghost btn-xs" onClick={() => setDayDetail(null)}>닫기</button>
            </div>
            {all.length === 0 ? <div className="sched-empty" style={{padding:16}}>레슨 없음</div> :
              all.map((entry, i) => (
                <div key={i} className={"sched-lesson"+(entry.isMakeup?" makeup":"")}
                  style={{borderLeftColor:entry.color,borderRadius:0,margin:0,borderTop:i>0?"1px solid var(--border)":"none",borderRight:"none",borderBottom:"none",cursor:"pointer"}}
                  onClick={()=>{setEditEntry({studentId:entry.studentId,studentName:entry.studentName,instrument:entry.instrument,originalDay:dayName,originalDate:dayDetail,time:entry.time});setEditForm({action:"move",newDay:"",newTime:entry.time||"",newDate:""});}}>
                  <span className="sched-time">{entry.time||"—"}</span>
                  <div className="sched-info">
                    <div className="sched-name">{entry.studentName}</div>
                    <div className="sched-inst">{entry.instrument}</div>
                    <div className="sched-teacher">{entry.teacherName}</div>
                  </div>
                  {entry.isMakeup && <span className="sched-makeup-badge">보강</span>}
                </div>
              ))
            }
          </div>
        );
      })()}
    </div>
  );
}

// ── MY RYE-K (수강생 전용 포털) ──────────────────────────────────────────────
function PublicParentView() {
  const [students, setStudents] = useState([]);
  const [attendance, setAttendance] = useState([]);
  const [payments, setPayments] = useState([]);
  const [teachers, setTeachers] = useState([]);
  const [studentNotices, setStudentNotices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loggedIn, setLoggedIn] = useState(false);
  const [student, setStudent] = useState(null);
  const [tab, setTab] = useState("home");
  const [loginCode, setLoginCode] = useState("");
  const [loginPw, setLoginPw] = useState("");
  const [loginErr, setLoginErr] = useState("");

  useEffect(() => {
    const unsubscribes = [];
    const setupListeners = () => {
      let loaded = 0;
      const KEYS = [
        { key: "rye-students", setter: setStudents, default: [] },
        { key: "rye-attendance", setter: setAttendance, default: [] },
        { key: "rye-payments", setter: setPayments, default: [] },
        { key: "rye-teachers", setter: setTeachers, default: [] },
        { key: "rye-student-notices", setter: setStudentNotices, default: [] },
      ];
      KEYS.forEach(({ key, setter, default: def }) => {
        const unsub = onSnapshot(doc(db, COLLECTION, key), (snap) => {
          setter(snap.exists() ? (snap.data().value ?? def) : def);
          loaded++;
          if (loaded >= KEYS.length) setLoading(false);
        }, () => { setter(def); loaded++; if (loaded >= KEYS.length) setLoading(false); });
        unsubscribes.push(unsub);
      });
    };
    // Anonymous auth then load data
    firebaseSignInAnon().then(() => setupListeners()).catch(() => setupListeners());
    return () => unsubscribes.forEach(u => u());
  }, []);

  useEffect(() => {
    if (student && students.length > 0) {
      const updated = students.find(s => s.id === student.id);
      if (updated) setStudent(updated);
    }
  }, [students]);

  const handleLogin = () => {
    setLoginErr("");
    if (!loginCode.trim() || !loginPw.trim()) { setLoginErr("학생코드와 비밀번호를 입력하세요."); return; }
    const found = students.find(s => s.studentCode === loginCode.trim().toUpperCase());
    if (!found) { setLoginErr("학생코드를 찾을 수 없습니다."); return; }
    const expectedPw = getBirthPassword(found.birthDate);
    if (loginPw !== expectedPw) { setLoginErr("비밀번호가 올바르지 않습니다. (생일 4자리: MMDD)"); return; }
    setStudent(found);
    setLoggedIn(true);
  };

  if (loading) return <><style>{CSS}</style><div className="loading-screen"><div className="loading-logo"><Logo size={56} /></div><div className="loading-text">RYE-K</div></div></>;

  // Login screen - clean white
  if (!loggedIn) return (
    <><style>{CSS}</style>
    <div style={{minHeight:"100vh",minHeight:"100dvh",background:"#fff",display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",padding:20}}>
      <div style={{width:"100%",maxWidth:380,textAlign:"center"}}>
        <Logo size={48} />
        <div style={{fontFamily:"'Noto Serif KR',serif",fontSize:22,fontWeight:700,color:"var(--blue)",marginTop:14}}>My RYE-K</div>
        <div style={{fontSize:11,color:"#A1A1AA",letterSpacing:2,marginTop:4,marginBottom:36}}>RYE-K K-Culture Center</div>
        <div style={{background:"#fff",borderRadius:20,padding:"32px 28px",boxShadow:"0 2px 24px rgba(0,0,0,.06)",border:"1px solid #F0F0F0",textAlign:"left"}}>
          {loginErr && <div className="form-err" style={{marginBottom:14,borderRadius:10}}>⚠ {loginErr}</div>}
          <div className="fg"><label className="fg-label">학생코드</label><input className="inp" value={loginCode} onChange={e => {setLoginCode(e.target.value.toUpperCase());setLoginErr("");}} placeholder="예: RKAB12" style={{fontSize:16,letterSpacing:2,textTransform:"uppercase",borderRadius:10}} onKeyDown={e=>e.key==="Enter"&&handleLogin()} /></div>
          <div className="fg"><label className="fg-label">비밀번호 (생일 MMDD)</label><input className="inp" type="password" value={loginPw} onChange={e => {setLoginPw(e.target.value);setLoginErr("");}} placeholder="예: 0410" maxLength={4} inputMode="numeric" style={{fontSize:16,letterSpacing:4,borderRadius:10}} onKeyDown={e=>e.key==="Enter"&&handleLogin()} /></div>
          <button className="btn btn-primary btn-full" style={{marginTop:12,padding:14,fontSize:15,borderRadius:10}} onClick={handleLogin}>로그인</button>
        </div>
        <div style={{marginTop:20,fontSize:11,color:"#C0C0C0",lineHeight:1.6}}>학생코드는 담당 강사에게 문의하세요.</div>
      </div>
    </div></>
  );

  // Logged in - white minimal portal
  const teacher = teachers.find(t => t.id === student.teacherId);
  const sAtt = attendance.filter(a => a.studentId === student.id).sort((a, b) => (b.date||"").localeCompare(a.date||""));
  const sPay = payments.filter(p => p.studentId === student.id).sort((a, b) => (b.month||"").localeCompare(a.month||""));
  const notes = sAtt.filter(a => (a.lessonNote || a.note) && (typeof a.lessonNote === "object" ? true : (a.note && a.note.trim()))).slice(0, 30);
  const attStatusStyle = {
    present: { color: "#22C55E", bg: "#F0FDF4", icon: "✓", text: "출석" },
    absent: { color: "#EF4444", bg: "#FEF2F2", icon: "✗", text: "결석" },
    late: { color: "#F59E0B", bg: "#FFFBEB", icon: "△", text: "지각" },
    excused: { color: "#3B82F6", bg: "#EFF6FF", icon: "○", text: "보강" }
  };
  const attThisMonth = sAtt.filter(a => a.date && a.date.startsWith(THIS_MONTH));
  const presentCount = attThisMonth.filter(a => a.status === "present").length;
  const absentCount = attThisMonth.filter(a => a.status === "absent").length;
  const lateCount = attThisMonth.filter(a => a.status === "late").length;
  const totalThisMonth = attThisMonth.length;
  const attRate = totalThisMonth > 0 ? Math.round((presentCount + lateCount) / totalThisMonth * 100) : null;
  const latestPay = sPay[0];
  const lessonDays = allLessonDays(student);
  
  // Next lesson D-day
  const getNextLessonDate = () => {
    const today = new Date();
    for (let i = 0; i <= 7; i++) {
      const d = new Date(today);
      d.setDate(d.getDate() + i);
      const dayName = ["일","월","화","수","목","금","토"][d.getDay()];
      const hasLesson = (student.lessons || []).some(l => (l.schedule || []).some(sc => sc.day === dayName));
      if (hasLesson && (i > 0 || d.getHours() < 22)) {
        const lessons = (student.lessons || []).filter(l => (l.schedule || []).some(sc => sc.day === dayName));
        const times = lessons.flatMap(l => (l.schedule||[]).filter(sc=>sc.day===dayName).map(sc=>sc.time)).filter(Boolean);
        return { date: d, dDay: i, dayName, lessons, time: times[0] || "" };
      }
    }
    return null;
  };
  const nextLesson = getNextLessonDate();
  
  // Active student notices
  const visibleNotices = studentNotices.filter(n => !n.hidden).sort((a,b) => { if(a.pinned&&!b.pinned)return -1; if(!a.pinned&&b.pinned)return 1; return b.createdAt-a.createdAt; });

  return (
    <><style>{CSS}</style>
    <div style={{minHeight:"100vh",minHeight:"100dvh",background:"#FAFAFA"}}>
      {/* Clean white header */}
      <div style={{background:"#fff",padding:"14px 20px",paddingTop:"calc(14px + env(safe-area-inset-top,0px))",borderBottom:"1px solid #F0F0F0"}}>
        <div style={{display:"flex",alignItems:"center",gap:10,maxWidth:640,margin:"0 auto"}}>
          <Logo size={28} />
          <div style={{flex:1}}>
            <div style={{fontFamily:"'Noto Serif KR',serif",fontSize:15,fontWeight:700,color:"var(--blue)"}}>My RYE-K</div>
          </div>
          <button onClick={()=>{setLoggedIn(false);setStudent(null);setLoginCode("");setLoginPw("");setTab("home");}} style={{background:"#F5F5F5",border:"none",color:"#999",fontSize:11,padding:"6px 14px",borderRadius:8,cursor:"pointer",fontFamily:"inherit"}}>로그아웃</button>
        </div>
      </div>

      {/* Student Info Card */}
      <div style={{padding:"16px 16px 0",maxWidth:640,margin:"0 auto"}}>
        <div style={{background:"#fff",borderRadius:16,padding:"20px",boxShadow:"0 1px 8px rgba(0,0,0,.04)",border:"1px solid #F0F0F0"}}>
          <div style={{display:"flex",alignItems:"center",gap:14}}>
            <Av photo={student.photo} name={student.name} size="av-lg" />
            <div style={{flex:1}}>
              <div style={{fontSize:20,fontWeight:700,fontFamily:"'Noto Serif KR',serif",color:"var(--ink)"}}>{student.name}</div>
              <div style={{display:"flex",gap:6,flexWrap:"wrap",marginTop:6}}>
                {(student.lessons||[]).map(l => <span key={l.instrument} style={{background:"var(--blue-lt)",color:"var(--blue)",fontSize:11,padding:"3px 10px",borderRadius:12,fontWeight:500}}>{l.instrument}</span>)}
              </div>
              {teacher && <div style={{fontSize:12,color:"#999",marginTop:4}}>{teacher.name} 강사</div>}
            </div>
          </div>
          {/* Day chips */}
          {lessonDays.length > 0 && <div style={{display:"flex",gap:4,marginTop:14}}>{DAYS.map(d=><div key={d} style={{width:30,height:30,borderRadius:15,display:"flex",alignItems:"center",justifyContent:"center",fontSize:11,fontWeight:lessonDays.includes(d)?600:400,color:lessonDays.includes(d)?"var(--blue)":"#D4D4D4",background:lessonDays.includes(d)?"var(--blue-lt)":"transparent",transition:"all .2s"}}>{d}</div>)}</div>}
        </div>
      </div>

      {/* Next Lesson D-day Card */}
      {nextLesson && (
        <div style={{padding:"12px 16px 0",maxWidth:640,margin:"0 auto"}}>
          <div style={{background:"#fff",borderRadius:14,padding:"16px 20px",boxShadow:"0 1px 6px rgba(0,0,0,.03)",border:"1px solid #F0F0F0",display:"flex",alignItems:"center",gap:14}}>
            <div style={{width:48,height:48,borderRadius:14,background:nextLesson.dDay===0?"var(--blue-lt)":"#F9FAFB",display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",flexShrink:0}}>
              <div style={{fontSize:18,fontWeight:700,color:nextLesson.dDay===0?"var(--blue)":"var(--ink)",fontFamily:"'Noto Serif KR',serif",lineHeight:1}}>{nextLesson.dDay === 0 ? "오늘" : `D-${nextLesson.dDay}`}</div>
            </div>
            <div style={{flex:1}}>
              <div style={{fontSize:13,fontWeight:600,color:"var(--ink)"}}>{nextLesson.dDay === 0 ? "오늘 레슨이 있어요" : "다음 레슨"}</div>
              <div style={{fontSize:12,color:"#999",marginTop:2}}>
                {nextLesson.date.getMonth()+1}월 {nextLesson.date.getDate()}일 ({nextLesson.dayName}){nextLesson.time && ` ${nextLesson.time}`}
                {" · "}{nextLesson.lessons.map(l=>(l.lessons||l).instrument || allLessonInsts(student).join(", ")).join(", ")}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Quick Stats */}
      <div style={{padding:"12px 16px 0",display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:8,maxWidth:640,margin:"0 auto"}}>
        <div style={{background:"#fff",borderRadius:14,padding:"14px 10px",textAlign:"center",boxShadow:"0 1px 4px rgba(0,0,0,.03)",border:"1px solid #F0F0F0"}}>
          <div style={{fontSize:24,fontWeight:700,color:attRate&&attRate>=80?"#22C55E":attRate&&attRate>=60?"#F59E0B":"#EF4444",fontFamily:"'Noto Serif KR',serif"}}>{attRate!==null?attRate+"%":"—"}</div>
          <div style={{fontSize:10,color:"#B0B0B0",marginTop:3}}>이번달 출석률</div>
        </div>
        <div style={{background:"#fff",borderRadius:14,padding:"14px 10px",textAlign:"center",boxShadow:"0 1px 4px rgba(0,0,0,.03)",border:"1px solid #F0F0F0"}}>
          <div style={{fontSize:24,fontWeight:700,color:"#22C55E",fontFamily:"'Noto Serif KR',serif"}}>{presentCount}</div>
          <div style={{fontSize:10,color:"#B0B0B0",marginTop:3}}>출석</div>
        </div>
        <div style={{background:"#fff",borderRadius:14,padding:"14px 10px",textAlign:"center",boxShadow:"0 1px 4px rgba(0,0,0,.03)",border:"1px solid #F0F0F0"}}>
          <div style={{fontSize:24,fontWeight:700,color:latestPay?.paid?"#22C55E":"#EF4444",fontFamily:"'Noto Serif KR',serif"}}>{latestPay?.paid?"✓":"!"}</div>
          <div style={{fontSize:10,color:"#B0B0B0",marginTop:3}}>{latestPay?monthLabel(latestPay.month):"수납"}</div>
        </div>
      </div>

      {/* Tabs */}
      <div style={{display:"flex",gap:0,padding:"14px 16px 0",maxWidth:640,margin:"0 auto"}}>
        {[{id:"home",label:"홈"},{id:"notice",label:"공지"},{id:"att",label:"출석"},{id:"notes",label:"레슨노트"},{id:"pay",label:"수납"}].map(t=>(
          <button key={t.id} onClick={()=>setTab(t.id)} style={{flex:1,padding:"10px 0",fontSize:12.5,fontWeight:tab===t.id?600:400,color:tab===t.id?"var(--blue)":"#B0B0B0",background:"transparent",border:"none",borderBottom:tab===t.id?"2px solid var(--blue)":"2px solid transparent",cursor:"pointer",fontFamily:"inherit",transition:"all .12s"}}>{t.label}{t.id==="notes"&&notes.length>0?` ${notes.length}`:""}{t.id==="notice"&&visibleNotices.length>0?` ${visibleNotices.length}`:""}</button>
        ))}
      </div>

      <div style={{padding:16,maxWidth:640,margin:"0 auto"}}>
        {/* Home Tab */}
        {tab === "home" && (
          <div>
            {/* Announcements preview */}
            {visibleNotices.length > 0 && (
              <div style={{marginBottom:16}}>
                <div style={{fontSize:13,fontWeight:600,color:"var(--ink)",marginBottom:8}}>공지사항</div>
                {visibleNotices.slice(0,2).map(n => (
                  <div key={n.id} style={{background:"#fff",borderRadius:12,padding:"14px 16px",marginBottom:6,boxShadow:"0 1px 4px rgba(0,0,0,.03)",border:"1px solid #F0F0F0",cursor:"pointer"}} onClick={()=>setTab("notice")}>
                    <div style={{display:"flex",alignItems:"center",gap:6}}>
                      {n.pinned && <span style={{fontSize:11}}>📌</span>}
                      <span style={{fontSize:13,fontWeight:600,color:"var(--ink)",flex:1}}>{n.title}</span>
                      <span style={{fontSize:10,color:"#C0C0C0"}}>{fmtDateShort(n.createdAt)}</span>
                    </div>
                  </div>
                ))}
                {visibleNotices.length > 2 && <button style={{background:"none",border:"none",color:"var(--blue)",fontSize:12,cursor:"pointer",fontFamily:"inherit",padding:0}} onClick={()=>setTab("notice")}>전체 보기 →</button>}
              </div>
            )}
            {/* Lesson Schedule */}
            <div style={{marginBottom:16}}>
              <div style={{fontSize:13,fontWeight:600,color:"var(--ink)",marginBottom:8}}>레슨 일정</div>
              {(student.lessons||[]).map(l => (
                <div key={l.instrument} style={{background:"#fff",borderRadius:12,padding:"14px 16px",marginBottom:6,boxShadow:"0 1px 4px rgba(0,0,0,.03)",border:"1px solid #F0F0F0"}}>
                  <div style={{fontSize:14,fontWeight:600,color:"var(--blue)",marginBottom:6}}>{l.instrument}</div>
                  <div style={{display:"flex",flexWrap:"wrap",gap:6}}>
                    {(l.schedule||[]).filter(sc=>sc.day).map((sc,i) => (
                      <span key={i} style={{background:"var(--blue-lt)",color:"var(--blue)",padding:"4px 12px",fontSize:12,fontWeight:500,borderRadius:8}}>{sc.day}요일{sc.time && ` ${sc.time}`}</span>
                    ))}
                  </div>
                </div>
              ))}
            </div>
            {/* Recent Notes */}
            {notes.length > 0 && (
              <div style={{marginBottom:16}}>
                <div style={{fontSize:13,fontWeight:600,color:"var(--ink)",marginBottom:8}}>최근 레슨 노트</div>
                {notes.slice(0,2).map((a,i) => {
                  const st = attStatusStyle[a.status]||{color:"#999",bg:"#F5F5F5",icon:"·",text:""};
                  const ln = a.lessonNote;
                  return (
                    <div key={i} style={{background:"#fff",borderRadius:12,padding:"14px 16px",marginBottom:6,boxShadow:"0 1px 4px rgba(0,0,0,.03)",border:"1px solid #F0F0F0"}}>
                      <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:8}}>
                        <span style={{fontSize:12,color:"#999"}}>{fmtDate(a.date)}</span>
                        <span style={{background:st.bg,color:st.color,fontSize:10,fontWeight:600,padding:"2px 8px",borderRadius:6}}>{st.icon} {st.text}</span>
                      </div>
                      {ln && typeof ln === "object" ? (
                        <div style={{fontSize:13,color:"var(--ink)",lineHeight:1.7}}>
                          {ln.progress && <div>📚 {ln.progress}</div>}
                          {ln.content && <div style={{color:"#666",marginTop:2}}>{ln.content}</div>}
                          {ln.assignment && <div style={{color:"var(--blue)",marginTop:4,fontWeight:500}}>과제: {ln.assignment}</div>}
                        </div>
                      ) : (
                        <div style={{fontSize:13,color:"var(--ink)",lineHeight:1.7,whiteSpace:"pre-wrap"}}>{a.note}</div>
                      )}
                    </div>
                  );
                })}
                {notes.length > 2 && <button style={{background:"none",border:"none",color:"var(--blue)",fontSize:12,cursor:"pointer",fontFamily:"inherit",padding:0}} onClick={()=>setTab("notes")}>전체 레슨노트 보기 →</button>}
              </div>
            )}
            {/* Basic Info */}
            <div>
              <div style={{fontSize:13,fontWeight:600,color:"var(--ink)",marginBottom:8}}>기본 정보</div>
              <div style={{background:"#fff",borderRadius:12,overflow:"hidden",boxShadow:"0 1px 4px rgba(0,0,0,.03)",border:"1px solid #F0F0F0"}}>
                <div className="info-grid">
                  <div className="ii"><div className="ii-label">담당 강사</div><div className="ii-val">{teacher?teacher.name:"미배정"}</div></div>
                  <div className="ii"><div className="ii-label">수강 시작일</div><div className="ii-val">{fmtDate(student.startDate)}</div></div>
                  <div className="ii"><div className="ii-label">월 수강료</div><div className="ii-val">{fmtMoney(student.monthlyFee)}</div></div>
                  <div className="ii"><div className="ii-label">수강 상태</div><div className="ii-val" style={{color:"#22C55E",fontWeight:500}}>{(student.status||"active")==="active"?"재원":student.status==="paused"?"휴원":"퇴원"}</div></div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Notices Tab (#7) */}
        {tab === "notice" && (
          <div>
            <div style={{fontSize:13,fontWeight:600,color:"var(--ink)",marginBottom:10}}>공지사항</div>
            {visibleNotices.length === 0 ? <div className="empty"><div className="empty-icon">📋</div><div className="empty-txt">등록된 공지가 없습니다.</div></div> :
              visibleNotices.map(n => (
                <div key={n.id} style={{background:"#fff",borderRadius:12,padding:0,marginBottom:8,overflow:"hidden",boxShadow:"0 1px 4px rgba(0,0,0,.03)",border:n.pinned?"1px solid rgba(245,168,0,.3)":"1px solid #F0F0F0"}}>
                  <div style={{padding:"14px 16px",borderBottom:"1px solid #F5F5F5"}}>
                    <div style={{display:"flex",alignItems:"center",gap:6}}>
                      {n.pinned && <span style={{fontSize:11}}>📌</span>}
                      <span style={{fontSize:14,fontWeight:600,color:"var(--ink)",flex:1}}>{n.title}</span>
                    </div>
                    <div style={{fontSize:11,color:"#C0C0C0",marginTop:3}}>{n.authorName} · {fmtDateTime(n.createdAt)}</div>
                  </div>
                  <div style={{padding:"14px 16px",fontSize:13.5,color:"#555",lineHeight:1.8,whiteSpace:"pre-wrap"}}>{n.content}</div>
                </div>
              ))
            }
          </div>
        )}

        {/* Attendance Tab */}
        {tab === "att" && (
          <div>
            <div style={{fontSize:13,fontWeight:600,color:"var(--ink)",marginBottom:10}}>출석 이력</div>
            <div style={{display:"flex",gap:6,flexWrap:"wrap",marginBottom:12}}>
              <div style={{background:"#F0FDF4",color:"#22C55E",padding:"6px 12px",borderRadius:8,fontSize:12,fontWeight:600}}>출석 {presentCount}</div>
              <div style={{background:"#FEF2F2",color:"#EF4444",padding:"6px 12px",borderRadius:8,fontSize:12,fontWeight:600}}>결석 {absentCount}</div>
              <div style={{background:"#FFFBEB",color:"#F59E0B",padding:"6px 12px",borderRadius:8,fontSize:12,fontWeight:600}}>지각 {lateCount}</div>
            </div>
            {sAtt.length === 0 ? <div className="empty"><div className="empty-icon">📋</div><div className="empty-txt">출석 기록이 없습니다.</div></div> :
              sAtt.slice(0, 40).map((a, i) => {
                const st = attStatusStyle[a.status] || { color:"#999", bg:"#F5F5F5", icon:"·", text: a.status };
                return (
                  <div key={i} style={{display:"flex",alignItems:"flex-start",gap:10,padding:"12px 14px",background:"#fff",borderRadius:12,marginBottom:6,boxShadow:"0 1px 3px rgba(0,0,0,.02)",border:"1px solid #F0F0F0"}}>
                    <div style={{width:55,flexShrink:0}}><div style={{fontSize:12,color:"#888",fontWeight:500}}>{fmtDateShort(a.date)}</div></div>
                    <div style={{width:34,flexShrink:0}}><span style={{background:st.bg,color:st.color,fontSize:11,fontWeight:600,padding:"2px 8px",borderRadius:6,display:"inline-block"}}>{st.icon}</span></div>
                    <div style={{flex:1,minWidth:0}}>
                      <span style={{fontSize:12,fontWeight:500,color:st.color}}>{st.text}</span>
                      {a.note && typeof a.note === "string" && <div style={{fontSize:12,color:"#888",marginTop:4,lineHeight:1.5}}>{a.note}</div>}
                    </div>
                  </div>
                );
              })
            }
          </div>
        )}

        {/* Lesson Notes Tab */}
        {tab === "notes" && (
          <div>
            <div style={{fontSize:13,fontWeight:600,color:"var(--ink)",marginBottom:10}}>레슨 노트</div>
            {notes.length === 0 ? <div className="empty"><div className="empty-icon">📝</div><div className="empty-txt">작성된 레슨 노트가 없습니다.</div></div> :
              notes.map((a, i) => {
                const st = attStatusStyle[a.status] || { color:"#999", bg:"#F5F5F5", icon:"·", text:"" };
                const ln = a.lessonNote;
                return (
                  <div key={i} style={{background:"#fff",borderRadius:14,padding:0,marginBottom:8,overflow:"hidden",boxShadow:"0 1px 4px rgba(0,0,0,.03)",border:"1px solid #F0F0F0"}}>
                    <div style={{display:"flex",alignItems:"center",gap:8,padding:"12px 16px",background:"#FAFAFA",borderBottom:"1px solid #F0F0F0"}}>
                      <span style={{fontSize:12,fontWeight:500,color:"#888"}}>{fmtDate(a.date)}</span>
                      <span style={{background:st.bg,color:st.color,fontSize:10,fontWeight:600,padding:"2px 8px",borderRadius:6}}>{st.icon} {st.text}</span>
                    </div>
                    <div style={{padding:"14px 16px"}}>
                      {ln && typeof ln === "object" ? (
                        <div style={{fontSize:13,lineHeight:1.8}}>
                          {ln.condition && <div style={{marginBottom:6}}><span style={{fontSize:11,color:"#999"}}>컨디션:</span> <span style={{fontWeight:500,color:ln.condition==="excellent"?"var(--blue)":ln.condition==="good"?"#22C55E":ln.condition==="normal"?"#F59E0B":"#EF4444"}}>{ln.condition==="excellent"?"매우 좋음":ln.condition==="good"?"좋음":ln.condition==="normal"?"보통":"부진"}</span></div>}
                          {ln.progress && <div style={{color:"var(--ink)"}}><strong style={{color:"var(--blue)"}}>진도</strong> {ln.progress}</div>}
                          {ln.content && <div style={{color:"#555",marginTop:4}}>{ln.content}</div>}
                          {ln.assignment && <div style={{marginTop:6,padding:"8px 12px",background:"var(--blue-lt)",borderRadius:8,color:"var(--blue)",fontSize:12.5,fontWeight:500}}>📝 과제: {ln.assignment}</div>}
                          {ln.makeupNeeded && ln.makeupPlan && <div style={{marginTop:4,fontSize:12,color:"#F59E0B"}}>보강: {ln.makeupPlan}</div>}
                          {ln.memo && <div style={{marginTop:4,fontSize:12,color:"#888"}}>{ln.memo}</div>}
                        </div>
                      ) : (
                        <div style={{fontSize:13.5,color:"var(--ink)",lineHeight:1.8,whiteSpace:"pre-wrap"}}>{a.note}</div>
                      )}
                    </div>
                  </div>
                );
              })
            }
          </div>
        )}

        {/* Payment Tab */}
        {tab === "pay" && (
          <div>
            <div style={{fontSize:13,fontWeight:600,color:"var(--ink)",marginBottom:10}}>수납 이력</div>
            {sPay.length === 0 ? <div className="empty"><div className="empty-icon">💳</div><div className="empty-txt">수납 기록이 없습니다.</div></div> :
              sPay.slice(0, 24).map((p, i) => (
                <div key={i} style={{display:"flex",alignItems:"center",padding:"14px 16px",background:"#fff",borderRadius:12,marginBottom:6,gap:10,boxShadow:"0 1px 3px rgba(0,0,0,.02)",border:"1px solid #F0F0F0"}}>
                  <div style={{flex:1}}>
                    <div style={{fontSize:14,fontWeight:600,color:"var(--ink)"}}>{monthLabel(p.month)}</div>
                    {p.paidDate && <div style={{fontSize:11,color:"#C0C0C0",marginTop:2}}>납부일: {fmtDate(p.paidDate)}</div>}
                  </div>
                  <div style={{textAlign:"right"}}>
                    <div style={{fontFamily:"'Noto Serif KR',serif",fontSize:15,fontWeight:600}}>{fmtMoney(p.amount||student.monthlyFee)}</div>
                    <div style={{fontSize:12,fontWeight:600,color:p.paid?"#22C55E":"#EF4444",marginTop:2}}>{p.paid?"✓ 완료":"미납"}</div>
                  </div>
                </div>
              ))
            }
          </div>
        )}

        <div style={{textAlign:"center",padding:"24px 0 calc(24px + env(safe-area-inset-bottom,0px))",fontSize:11,color:"#D0D0D0"}}>
          My RYE-K · RYE-K K-Culture Center
        </div>
      </div>
    </div></>
  );
}


// ── ROOT APP ──────────────────────────────────────────────────────────────────
export default function App() {
  // Public registration form — no login needed
  if (window.location.search.includes("register") || window.location.hash === "#register") {
    return <PublicRegisterForm />;
  }
  // Parent portal — login-based
  if (window.location.search.includes("myryk") || window.location.hash === "#myryk" || window.location.search.includes("parent") || window.location.hash === "#parent") {
    return <PublicParentView />;
  }

  return <MainApp />;
}

function MainApp() {
  const [user, setUser] = useState(() => {
    try { const s = localStorage.getItem("rye-session"); return s ? JSON.parse(s) : null; } catch { return null; }
  });
  const setUserPersist = (u) => {
    setUser(u);
    if (u) localStorage.setItem("rye-session", JSON.stringify(u));
    else localStorage.removeItem("rye-session");
  };
  const [view, setView] = useState("dashboard");
  const [teachers, setTeachers] = useState([]);
  const [students, setStudents] = useState([]);
  const [notices, setNotices] = useState([]);
  const [categories, setCategories] = useState(DEFAULT_CATEGORIES);
  const [attendance, setAttendance] = useState([]);
  const [payments, setPayments] = useState([]);
  const [activity, setActivity] = useState([]);
  const [pending, setPending] = useState([]);
  const [feePresets, setFeePresets] = useState({});
  const [scheduleOverrides, setScheduleOverrides] = useState([]);
  const [trash, setTrash] = useState([]);
  const [studentNotices, setStudentNotices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(null);
  const [modal, setModal] = useState(null);
  const [selected, setSelected] = useState(null);
  const [filter, setFilter] = useState("전체");
  const [search, setSearch] = useState("");
  const [toast, setToast] = useState(null);
  // Dark mode: null=system, 'dark'=forced dark, 'light'=forced light
  const [darkMode, setDarkMode] = useState(() => {
    try { return localStorage.getItem("rye-theme") || null; } catch { return null; }
  });

  useEffect(() => {
    const root = document.documentElement;
    if (darkMode === "dark") { root.setAttribute("data-theme", "dark"); localStorage.setItem("rye-theme", "dark"); }
    else if (darkMode === "light") { root.setAttribute("data-theme", "light"); localStorage.setItem("rye-theme", "light"); }
    else { root.removeAttribute("data-theme"); localStorage.removeItem("rye-theme"); }
  }, [darkMode]);

  // ── Initial load + real-time sync from Firestore (onSnapshot only) ──
  useEffect(() => {
    const unsubscribes = [];
    const received = {};
    let seeded = false;
    let resolved = false;

    const KEYS = [
      { key: "rye-teachers", setter: setTeachers, default: [] },
      { key: "rye-students", setter: setStudents, default: [] },
      { key: "rye-notices", setter: setNotices, default: [] },
      { key: "rye-categories", setter: setCategories, default: DEFAULT_CATEGORIES },
      { key: "rye-attendance", setter: setAttendance, default: [] },
      { key: "rye-payments", setter: setPayments, default: [] },
      { key: "rye-activity", setter: setActivity, default: [] },
      { key: "rye-pending", setter: setPending, default: [] },
      { key: "rye-fee-presets", setter: setFeePresets, default: {} },
      { key: "rye-schedule-overrides", setter: setScheduleOverrides, default: [] },
      { key: "rye-trash", setter: setTrash, default: [] },
      { key: "rye-student-notices", setter: setStudentNotices, default: [] },
    ];

    const checkAllLoaded = async () => {
      if (Object.keys(received).length < KEYS.length) return;
      if (!seeded && (!received["rye-teachers"] || received["rye-teachers"].length === 0)) {
        seeded = true;
        const seed = generateSeedData();
        await Promise.all([
          sSet("rye-teachers", seed.seedTeachers),
          sSet("rye-students", seed.seedStudents),
          sSet("rye-notices", seed.seedNotices),
          sSet("rye-attendance", seed.seedAttendance),
          sSet("rye-payments", seed.seedPayments),
          sSet("rye-activity", seed.seedActivity),
        ]);
      }
      if (!seeded && received["rye-students"] && received["rye-students"].length > 0) {
        const studentsArr = received["rye-students"];
        const needsMigration = studentsArr.some(s => !s.studentCode);
        if (needsMigration) {
          const existingCodes = new Set(studentsArr.filter(s => s.studentCode).map(s => s.studentCode));
          const migrated = studentsArr.map(s => {
            if (s.studentCode) return s;
            let code;
            do { code = generateStudentCode(); } while (existingCodes.has(code));
            existingCodes.add(code);
            return { ...s, studentCode: code };
          });
          await sSet("rye-students", migrated);
          console.log("Migrated studentCodes for", migrated.filter((s,i) => s.studentCode !== studentsArr[i]?.studentCode).length, "students");
        }
      }
      resolved = true;
      setLoading(false);
    };

    const setupListeners = () => {
      KEYS.forEach(({ key, setter, default: def }) => {
        const unsub = onSnapshot(doc(db, COLLECTION, key), (snap) => {
          const val = snap.exists() ? snap.data().value : def;
          setter(val ?? def);
          if (!(key in received)) {
            received[key] = val;
            checkAllLoaded();
          }
        }, (err) => {
          console.error("Firestore listener error:", key, err);
          setter(def);
          if (!(key in received)) {
            received[key] = null;
            checkAllLoaded();
          }
          setLoadError(err.message);
        });
        unsubscribes.push(unsub);
      });
    };

    // ★ 핵심: 익명 인증 먼저 → 그 후 Firestore 리스너 시작
    firebaseSignInAnon().then(() => {
      setupListeners();
    }).catch(() => {
      // Auth 실패해도 리스너는 시도 (기존 호환)
      setupListeners();
    });

    const timeout = setTimeout(() => {
      if (!resolved) {
        setLoadError("Firebase 연결 시간이 초과되었습니다. 네트워크를 확인해주세요.");
        setLoading(false);
      }
    }, 12000);

    return () => {
      clearTimeout(timeout);
      unsubscribes.forEach(unsub => unsub());
    };
  }, []);

  const showToast = msg => { setToast(msg); setTimeout(() => setToast(null), 2400); };
  const saveTeachers = async u => { setTeachers(u); await sSet("rye-teachers", u); };
  const saveStudents = async u => { setStudents(u); await sSet("rye-students", u); };
  const saveNotices = async u => { setNotices(u); await sSet("rye-notices", u); };
  const saveCategories = async u => { setCategories(u); await sSet("rye-categories", u); };
  const saveAttendance = async u => { setAttendance(u); await sSet("rye-attendance", u); };
  const savePayments = async u => { setPayments(u); await sSet("rye-payments", u); };
  const saveScheduleOverrides = async u => { setScheduleOverrides(u); await sSet("rye-schedule-overrides", u); };
  const saveTrash = async u => { setTrash(u); await sSet("rye-trash", u); };
  const saveStudentNotices = async u => { setStudentNotices(u); await sSet("rye-student-notices", u); };

  // Auto-purge trash after 7 days
  useEffect(() => {
    if (trash.length === 0) return;
    const now = Date.now();
    const sevenDays = 7 * 24 * 60 * 60 * 1000;
    const filtered = trash.filter(t => (now - (t.deletedAt || 0)) < sevenDays);
    if (filtered.length < trash.length) saveTrash(filtered);
  }, [trash]);

  const softDeleteStudent = async (student) => {
    const trashItem = { ...student, type: "student", deletedAt: Date.now(), deletedBy: user?.name };
    await saveTrash([...trash, trashItem]);
    await saveStudents(students.filter(s => s.id !== student.id));
    addLog(`${student.name} 학생 삭제 (7일간 복원 가능)`);
  };

  const softDeleteTeacher = async (teacher) => {
    const trashItem = { ...teacher, type: "teacher", deletedAt: Date.now(), deletedBy: user?.name };
    await saveTrash([...trash, trashItem]);
    await saveTeachers(teachers.filter(t => t.id !== teacher.id));
    addLog(`${teacher.name} 삭제 (7일간 복원 가능)`);
  };

  const restoreFromTrash = async (trashItem) => {
    const { type, deletedAt, deletedBy, ...original } = trashItem;
    if (type === "student") {
      await saveStudents([...students, original]);
      addLog(`${original.name} 학생 복원`);
    } else if (type === "teacher") {
      await saveTeachers([...teachers, original]);
      addLog(`${original.name} 복원`);
    }
    await saveTrash(trash.filter(t => !(t.id === trashItem.id && t.type === trashItem.type && t.deletedAt === trashItem.deletedAt)));
    showToast(`${original.name} 복원되었습니다.`);
  };

  const permanentDeleteFromTrash = async (trashItem) => {
    await saveTrash(trash.filter(t => !(t.id === trashItem.id && t.type === trashItem.type && t.deletedAt === trashItem.deletedAt)));
    showToast("완전히 삭제되었습니다.");
  };

  const addLog = async (action) => {
    const log = { id: uid(), userId: user?.id, userName: user?.name || "?", action, timestamp: Date.now() };
    const upd = [log, ...activity].slice(0, 200);
    setActivity(upd); await sSet("rye-activity", upd);
  };

  const resetSeed = async () => {
    const seed = generateSeedData();
    await Promise.all([
      sSet("rye-teachers", seed.seedTeachers), sSet("rye-students", seed.seedStudents),
      sSet("rye-notices", seed.seedNotices), sSet("rye-attendance", seed.seedAttendance),
      sSet("rye-payments", seed.seedPayments), sSet("rye-activity", seed.seedActivity),
    ]);
    setTeachers(seed.seedTeachers); setStudents(seed.seedStudents); setNotices(seed.seedNotices);
    setAttendance(seed.seedAttendance); setPayments(seed.seedPayments); setActivity(seed.seedActivity);
    showToast("샘플 데이터가 초기화되었습니다.");
    setView("dashboard");
  };

  const approvePending = async (reg) => {
    // Convert pending registration to student with edited form data
    const newStudent = {
      id: uid(),
      name: reg.name,
      birthDate: reg.birthDate || "",
      startDate: reg.startDate || TODAY_STR,
      phone: reg.phone || "",
      guardianPhone: reg.guardianPhone || "",
      teacherId: reg.teacherId || "",
      lessons: reg.lessons || (reg.desiredInstruments || []).map(inst => ({ instrument: inst, schedule: [{ day: "", time: "" }] })),
      photo: reg.photo || "",
      notes: reg.notes || "",
      monthlyFee: reg.monthlyFee || 0,
      studentCode: generateStudentCode(),
      instrumentRental: reg.instrumentRental || false,
      // Preserve registration metadata
      registration: {
        experience: reg.experience || "",
        purpose: reg.purpose || "",
        referral: reg.referral || "",
        lessonType: reg.lessonType || "",
        consent: reg.consent || null,
        optionalConsent: reg.optionalConsent || false,
        registeredAt: reg.createdAt,
        approvedAt: Date.now(),
      },
      createdAt: Date.now(),
    };
    const updStudents = [...students, newStudent];
    await saveStudents(updStudents);
    // Remove from pending
    const updPending = pending.filter(p => p.id !== reg.id);
    await sSet("rye-pending", updPending);
    setPending(updPending);
    addLog(`${reg.name} 학생 등록 승인`);
    showToast(`${reg.name} 학생이 등록되었습니다. (코드: ${newStudent.studentCode})`);
  };

  const rejectPending = async (regId) => {
    const reg = pending.find(p => p.id === regId);
    const updPending = pending.filter(p => p.id !== regId);
    await sSet("rye-pending", updPending);
    setPending(updPending);
    if (reg) addLog(`${reg.name} 등록 신청 반려`);
    showToast("등록 신청이 반려되었습니다.");
  };

  const login = async (username, password) => {
    // Step 1: Verify credentials against local data
    let appUser = null;
    if (username === ADMIN.username && password === ADMIN.password) {
      appUser = ADMIN;
    } else {
      const t = teachers.find(t => t.username === username && t.password === password);
      if (t) appUser = { ...t, role: t.role || "teacher" };
    }
    if (!appUser) return false;

    // Step 2: Sign in with Firebase Auth (creates account on first login)
    const fbUser = await firebaseSignIn(username, password);
    if (!fbUser) {
      console.warn("Firebase Auth failed, proceeding with local auth only");
    }

    setUserPersist(appUser);
    return true;
  };

  const handleLogout = async () => {
    setUserPersist(null);
    await firebaseLogout();
    window.location.reload();
  };

  const visible = canManageAll(user?.role) ? students : students.filter(s => s.teacherId === user?.id);
  const filtered = visible.filter(s => {
    const mc = filter === "전체" || (s.lessons || []).some(l => getCat(l.instrument, categories) === filter);
    const q = search.toLowerCase();
    return mc && (!q || s.name?.toLowerCase().includes(q) || allLessonInsts(s).join().toLowerCase().includes(q) || s.phone?.includes(q));
  });

  const monthPayments = payments.filter(p => p.month === THIS_MONTH);
  const unpaidCount = visible.filter(s => !monthPayments.find(p => p.studentId === s.id && p.paid)).length;

  const navigate = (v) => { setView(v); setFilter("전체"); setSearch(""); };

  if (loading) return (<><style>{CSS}</style><div className="loading-screen"><div className="loading-logo"><Logo size={56} /></div><div className="loading-text">RYE-K K-Culture Center</div></div></>);
  if (loadError) return (<><style>{CSS}</style><div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", height: "100vh", fontFamily: "'Noto Sans KR',sans-serif", padding: 20, textAlign: "center", gap: 12 }}><div style={{fontSize:16,fontWeight:600,color:"#E8281C"}}>연결 실패</div><div style={{fontSize:13,color:"#52525B",maxWidth:360,lineHeight:1.6}}>Firebase에 연결할 수 없습니다.<br/>src/firebase.js 설정값을 확인해주세요.</div><div style={{fontSize:11,color:"#A1A1AA",background:"#F4F4F5",padding:"8px 14px",borderRadius:8,maxWidth:360,wordBreak:"break-all"}}>{loadError}</div><button onClick={()=>window.location.reload()} style={{marginTop:8,padding:"10px 24px",background:"#2B3A9F",color:"#fff",border:"none",borderRadius:8,fontSize:13,cursor:"pointer"}}>다시 시도</button></div></>);
  if (!user) return <><style>{CSS}</style><LoginScreen onLogin={login} /></>;

  const pendingCount = canManageAll(user?.role) ? pending.length : 0;
  const topTitle = { dashboard: "RYE-K", students: "학생 관리", attendance: "출석 체크", payments: "수납 관리", teachers: "강사 관리", notices: "공지사항", categories: "과목 관리", analytics: "현황 분석", profile: "내 정보", more: "더보기", activity: "활동 기록", pending: "등록 대기", schedule: "강사 스케줄", trash: "휴지통", studentNotices: "수강생 공지" }[view] || "RYE-K";

  return (
    <>
      <style>{CSS}</style>
      {toast && <div className="toast">✓ {toast}</div>}
      <div className="app-wrap">
        <Sidebar view={view} setView={navigate} user={user} onLogout={handleLogout} counts={{ students: visible.length, teachers: teachers.length }} pendingCount={pendingCount} darkMode={darkMode} setDarkMode={setDarkMode} />
        <div className="main-scroll">
          <div className="topbar">
            <Logo size={28} />
            <span className="topbar-title">{topTitle}</span>
          </div>
          <div className="main-content">
            {view === "dashboard" && <Dashboard students={visible} teachers={teachers} currentUser={user} notices={notices} categories={categories} attendance={attendance} payments={payments} pending={pending} nav={navigate} />}
            {view === "students" && <StudentsView students={filtered} allStudents={visible} teachers={teachers} categories={categories} filter={filter} setFilter={setFilter} search={search} setSearch={setSearch} onAdd={() => { setSelected(null); setModal("sForm"); }} onSelect={s => { setSelected(s); setModal("sDetail"); }} />}
            {view === "attendance" && <AttendanceView students={visible} teachers={teachers} currentUser={user} attendance={attendance} onSaveAttendance={async (upd) => { await saveAttendance(upd); }} categories={categories} scheduleOverrides={scheduleOverrides} onSaveScheduleOverride={saveScheduleOverrides} />}
            {view === "payments" && <PaymentsView students={visible} teachers={teachers} currentUser={user} payments={payments} onSavePayments={async (upd) => { await savePayments(upd); showToast("수납 정보가 저장되었습니다."); }} onLog={addLog} />}
            {view === "teachers" && canManageAll(user.role) && <TeachersView teachers={teachers} students={students} onAdd={() => { setSelected(null); setModal("tForm"); }} onSelect={t => { setSelected(t); setModal("tDetail"); }} />}
            {view === "notices" && <NoticesView notices={notices} currentUser={user} onAdd={() => { setSelected(null); setModal("nForm"); }} onEdit={n => { setSelected(n); setModal("nForm"); }} onDelete={async id => { const upd = notices.filter(n => n.id !== id); await saveNotices(upd); addLog("공지 삭제"); showToast("공지가 삭제되었습니다."); }} />}
            {view === "categories" && user.role === "admin" && <CategoriesView categories={categories} onSave={async c => { await saveCategories(c); addLog("과목 카테고리 수정"); showToast("저장되었습니다."); }} feePresets={feePresets} onSaveFees={async f => { setFeePresets(f); await sSet("rye-fee-presets", f); }} />}
            {view === "analytics" && user.role === "admin" && <AnalyticsView students={students} teachers={teachers} attendance={attendance} payments={payments} categories={categories} />}
            {view === "profile" && <ProfileView currentUser={user} teachers={teachers} students={visible} categories={categories} onProfileSave={async form => { const upd = teachers.map(t => t.id === user.id ? { ...t, ...form } : t); await saveTeachers(upd); setUserPersist({ ...user, name: form.name || user.name }); addLog("프로필 수정"); showToast("프로필이 수정되었습니다."); }} />}
            {view === "activity" && canManageAll(user.role) && <ActivityView activity={activity} />}
            {view === "pending" && canManageAll(user.role) && <PendingView pending={pending} teachers={teachers} categories={categories} onApprove={approvePending} onReject={rejectPending} />}
            {view === "schedule" && <ScheduleView students={visible} teachers={teachers} currentUser={user} attendance={attendance} onSaveAttendance={async(upd)=>{await saveAttendance(upd);}} onSaveScheduleOverride={saveScheduleOverrides} scheduleOverrides={scheduleOverrides} />}
            {view === "trash" && canManageAll(user.role) && <TrashView trash={trash} onRestore={restoreFromTrash} onPermanentDelete={permanentDeleteFromTrash} />}
            {view === "studentNotices" && canManageAll(user.role) && <StudentNoticeManager notices={studentNotices} currentUser={user} onSave={async (upd) => { await saveStudentNotices(upd); showToast("수강생 공지가 저장되었습니다."); }} />}
            {view === "more" && <MoreMenu user={user} setView={navigate} onLogout={handleLogout} onResetSeed={resetSeed} counts={{ teachers: teachers.length }} pendingCount={pendingCount} darkMode={darkMode} setDarkMode={setDarkMode} trash={trash} />}
          </div>
        </div>
        <BottomNav view={view} setView={navigate} unpaidCount={unpaidCount} pendingCount={pendingCount} />
      </div>

      {modal === "sForm" && <StudentFormModal student={selected} teachers={teachers} currentUser={user} categories={categories} feePresets={feePresets} onClose={() => setModal(null)} onSave={async data => {
        const isNew = !data.id;
        if (isNew && !canManageAll(user.role)) {
          // Teacher: send to pending for manager/admin approval
          const pendingReg = { ...data, id: uid(), desiredInstruments: (data.lessons||[]).map(l=>l.instrument), submittedBy: user.name, submittedById: user.id, createdAt: Date.now() };
          const updPending = [...pending, pendingReg];
          await sSet("rye-pending", updPending); setPending(updPending);
          addLog(`${data.name} 학생 등록 요청 (승인 대기)`);
          setModal(null); showToast("등록 요청이 접수되었습니다. 관리자 승인 후 등록됩니다.");
        } else {
          const studentCode = isNew ? generateStudentCode() : (data.studentCode || data.id);
          const upd = data.id ? students.map(s => s.id === data.id ? { ...data, studentCode: data.studentCode || s.studentCode } : s) : [...students, { ...data, id: uid(), studentCode: studentCode }];
          await saveStudents(upd);
          addLog(`${data.name} 학생 ${isNew ? "등록" : "수정"}`);
          setModal(null); showToast(isNew ? "학생이 등록되었습니다." : "학생 정보가 수정되었습니다.");
        }
      }} />}
      {modal === "sDetail" && selected && <StudentDetailModal student={selected} teachers={teachers} currentUser={user} categories={categories} attendance={attendance} payments={payments} onClose={() => setModal(null)} onEdit={() => setModal("sForm")} onDelete={async () => { await softDeleteStudent(selected); setModal(null); showToast(`${selected.name} 학생이 삭제되었습니다. (7일간 복원 가능)`); }} onPhotoUpdate={async (sid, photoData) => { const upd = students.map(s => s.id === sid ? { ...s, photo: photoData } : s); await saveStudents(upd); showToast("프로필 사진이 저장되었습니다."); }} />}
      {modal === "tForm" && canManageAll(user.role) && <TeacherFormModal teacher={selected} categories={categories} onClose={() => setModal(null)} onSave={async data => {
        const isNew = !data.id;
        const upd = data.id ? teachers.map(t => t.id === data.id ? data : t) : [...teachers, { ...data, id: uid() }];
        await saveTeachers(upd);
        addLog(`${data.name} ${data.role === "manager" ? "매니저" : "강사"} ${isNew ? "등록" : "수정"}`);
        setModal(null); showToast(isNew ? "등록되었습니다." : "수정되었습니다.");
      }} />}
      {modal === "tDetail" && selected && <TeacherDetailModal teacher={selected} students={students.filter(s => s.teacherId === selected.id)} currentUser={user} onClose={() => setModal(null)} onEdit={() => setModal("tForm")} onDelete={async () => { await softDeleteTeacher(selected); setModal(null); showToast(`${selected.name} 삭제되었습니다. (7일간 복원 가능)`); }} onPhotoUpdate={async (tid, photoData) => { const upd = teachers.map(t => t.id === tid ? { ...t, photo: photoData } : t); await saveTeachers(upd); showToast("프로필 사진이 저장되었습니다."); }} />}
      {modal === "nForm" && <NoticeFormModal notice={selected} currentUser={user} onClose={() => setModal(null)} onSave={async data => { const upd = data.id && notices.find(n => n.id === data.id) ? notices.map(n => n.id === data.id ? data : n) : [...notices, data]; await saveNotices(upd); addLog(`공지 ${selected ? "수정" : "등록"}: ${data.title}`); setModal(null); showToast(selected ? "수정되었습니다." : "등록되었습니다."); }} />}
    </>
  );
}
