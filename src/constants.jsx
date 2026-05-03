// ── Constants ─────────────────────────────────────────────────────────────────
export const DEFAULT_CATEGORIES = {
  "현악기": ["해금", "가야금", "거문고"],
  "관악기": ["대금 · 소금 · 단소", "피리"],
  "가악(歌樂)": ["판소리", "민요", "정가", "시조", "가야금 병창"],
  "타악": ["장구 · 북 · 꽹과리 · 징"],
  "유아·아동": ["유아 국악 프로그램", "초등 국악 프로그램"],
};
export const DAYS = ["월","화","수","목","금","토","일"];
export const ADMIN = { id:"admin", username:"admin", password:"rye2024", role:"admin", name:"관리자" };
export const TODAY_STR = new Date().toISOString().slice(0,10);
export const THIS_MONTH = TODAY_STR.slice(0,7);
export const TODAY_DAY = ["일","월","화","수","목","금","토"][new Date().getDay()];
export const ATT_STATUS = { present:"출석", absent:"결석", late:"지각", excused:"보강" };
export const PAY_METHODS = { transfer:"계좌이체", cash:"현금", card:"카드" };

export const INST_TYPES = { school: "학교", center: "주민센터", company: "기업/단체", government: "관공서", other: "기타" };

// ── Icons (simple SVG) ────────────────────────────────────────────────────────
export const IC = {
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
  note: <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/><polyline points="10 9 9 9 8 9"/></svg>,
  schedule: <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/><line x1="8" y1="14" x2="8" y2="14" strokeWidth="3"/><line x1="12" y1="14" x2="12" y2="14" strokeWidth="3"/><line x1="16" y1="14" x2="16" y2="14" strokeWidth="3"/></svg>,
  sun: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="5"/><line x1="12" y1="1" x2="12" y2="3"/><line x1="12" y1="21" x2="12" y2="23"/><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/><line x1="1" y1="12" x2="3" y2="12"/><line x1="21" y1="12" x2="23" y2="12"/><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/></svg>,
  moon: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 12.79A9 9 0 1111.21 3 7 7 0 0021 12.79z"/></svg>,
  parent: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 00-3-3.87"/><path d="M16 3.13a4 4 0 010 7.75"/></svg>,
  building: <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="4" y="2" width="16" height="20" rx="1"/><line x1="9" y1="6" x2="9" y2="6"/><line x1="15" y1="6" x2="15" y2="6"/><line x1="9" y1="10" x2="9" y2="10"/><line x1="15" y1="10" x2="15" y2="10"/><line x1="9" y1="14" x2="9" y2="14"/><line x1="15" y1="14" x2="15" y2="14"/><path d="M10 22v-4h4v4"/></svg>,
};

// ── CSS (Mobile-First) ────────────────────────────────────────────────────────
export const CSS = `
@import url('https://fonts.googleapis.com/css2?family=Noto+Serif+KR:wght@400;500;700&family=Noto+Sans+KR:wght@300;400;500;600;700&display=swap');
:root{
  --blue:#2B3A9F;--blue-dk:#1E2B7A;--blue-lt:#EEF1FF;--blue-md:#4A5BB8;
  --red:#E8281C;--red-dk:#C0201A;--red-lt:#FFF0EE;
  --gold:#F5A800;--gold-dk:#C88800;--gold-lt:#FFF8E6;
  --green:#1A7A40;--green-lt:#EDFAEF;
  --ink:#18181B;--ink-60:#52525B;--ink-30:#A1A1AA;--ink-10:#F4F4F5;
  --paper:#FFFFFF;--bg:#F5F6FA;--border:#E4E4E7;
  --shadow:0 1px 3px rgba(0,0,0,.06);--shadow-md:0 4px 16px rgba(0,0,0,.1);--shadow-lifted:0 8px 32px rgba(31,61,122,.08);
  --radius:12px;--radius-sm:8px;--radius-lg:16px;--radius-xs:6px;--radius-xl:20px;
  --dancheong-blue:#1F3D7A;--dancheong-red:#A8211B;--dancheong-yellow:#D4A02C;--dancheong-white:#F8F4EC;--dancheong-black:#1A1A1A;
  --hanji:linear-gradient(135deg,#FAF7F0,#F5F0E5);
  --ease-out:cubic-bezier(0.22,1,0.36,1);--dur-fast:120ms;--dur-base:200ms;--dur-slow:320ms;
  --safe-b:env(safe-area-inset-bottom,0px);
  --nav-h:60px;--topbar-h:52px;
}
*{box-sizing:border-box;margin:0;padding:0;-webkit-tap-highlight-color:transparent}
body{font-family:'Noto Sans KR',system-ui,sans-serif;background:var(--bg);color:var(--ink);min-height:100vh;min-height:100dvh;overscroll-behavior:none;-webkit-font-smoothing:antialiased}
input,select,textarea,button{font-family:inherit}

/* ── Login ─────────────────────────────────────────────── */
.login-bg{min-height:100vh;min-height:100dvh;background:var(--bg);display:flex;align-items:center;justify-content:center;padding:20px}
.login-card{background:var(--hanji);width:100%;max-width:380px;padding:36px 28px;border-radius:var(--radius-lg);box-shadow:var(--shadow-lifted);position:relative;overflow:hidden}
.login-card::before{content:'';position:absolute;top:0;left:0;right:0;height:4px;background:linear-gradient(90deg,var(--dancheong-blue),var(--dancheong-red),var(--dancheong-yellow),var(--dancheong-white),var(--dancheong-black))}
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
.topbar-btn{background:none;border:none;color:var(--ink-60);cursor:pointer;padding:6px;border-radius:var(--radius-sm);display:flex;align-items:center;justify-content:center;transition:background .12s}
.topbar-btn:hover{background:var(--ink-10)}
.main-scroll{flex:1;overflow-y:auto;-webkit-overflow-scrolling:touch;padding-bottom:calc(var(--nav-h) + var(--safe-b) + 16px)}
.main-content{padding:16px;animation:fadeUp var(--dur-slow) var(--ease-out) both}

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
.ph h1{font-family:'Noto Serif KR',serif;font-size:21px;font-weight:500;color:var(--ink);letter-spacing:-.3px}
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
.btn-xs{padding:5px 10px;font-size:11px;border-radius:var(--radius-xs)}
.btn-full{width:100%}
.fab{position:fixed;bottom:calc(var(--nav-h) + var(--safe-b) + 16px);right:16px;width:52px;height:52px;border-radius:50%;background:var(--blue);color:#fff;border:none;box-shadow:0 4px 16px rgba(43,58,159,.35);display:flex;align-items:center;justify-content:center;cursor:pointer;z-index:150;transition:transform .15s}
.fab:active{transform:scale(.92)}

/* ── Cards ─────────────────────────────────────────────── */
.card{background:var(--paper);box-shadow:var(--shadow);border:1px solid var(--border);border-radius:var(--radius);transition:transform var(--dur-base) var(--ease-out),box-shadow var(--dur-base) var(--ease-out)}
.card:hover{transform:translateY(-1px);box-shadow:var(--shadow-lifted)}

/* ── Tags ──────────────────────────────────────────────── */
.tag{display:inline-flex;align-items:center;padding:3px 9px;font-size:11px;font-weight:500;border-radius:var(--radius-xs);white-space:nowrap}
.tag-minor{background:var(--blue-lt);color:var(--blue)}
.tag-adult{background:var(--green-lt);color:var(--green)}
.tag-cat{background:var(--ink-10);color:var(--ink-60)}
.tag-inst{background:var(--red-lt);color:var(--red)}
.tag-gold{background:var(--gold-lt);color:var(--gold-dk)}
.tag-blue{background:var(--blue-lt);color:var(--blue)}
.tag-green{background:var(--green-lt);color:var(--green)}
.tag-mgr{background:#F3E8FF;color:#7C3AED}

/* ── Avatar ────────────────────────────────────────────── */
.av{width:52px;height:52px;border-radius:50%;background:var(--blue-lt);display:flex;align-items:center;justify-content:center;font-family:'Noto Serif KR',serif;font-size:16px;font-weight:500;color:var(--blue-md);flex-shrink:0;overflow:hidden;border:2px solid var(--border)}
.av img{width:100%;height:100%;object-fit:cover}
.av-lg{width:64px;height:64px;font-size:22px}
.av-sm{width:34px;height:34px;font-size:12px}

/* ── Day chips ─────────────────────────────────────────── */
.day-row{display:flex;gap:4px;flex-wrap:wrap}
.day-chip{min-width:26px;height:26px;padding:0 6px;border-radius:13px;display:flex;align-items:center;justify-content:center;font-size:11px;color:var(--ink-30);background:var(--ink-10)}
.day-chip.on{background:var(--blue);color:#fff;font-weight:600}

/* ── Stats ─────────────────────────────────────────────── */
.stat-grid{display:grid;grid-template-columns:repeat(2,1fr);gap:10px;margin-bottom:20px}
.stat-card{background:var(--paper);padding:16px;border:1px solid var(--border);border-radius:var(--radius);transition:transform var(--dur-base) var(--ease-out),box-shadow var(--dur-base) var(--ease-out)}
.stat-card:hover{transform:translateY(-2px);box-shadow:var(--shadow-lifted)}
.stat-num{font-family:'Noto Serif KR',serif;font-size:36px;font-weight:700;color:var(--blue);line-height:1;margin-bottom:2px;font-variant-numeric:tabular-nums}
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
.s-card{background:var(--paper);padding:14px 16px;border:1px solid var(--border);cursor:pointer;transition:transform var(--dur-base) var(--ease-out),box-shadow var(--dur-base) var(--ease-out),background var(--dur-fast);border-radius:var(--radius);display:flex;align-items:center;gap:12px}
.s-card:hover{transform:translateY(-1px);box-shadow:var(--shadow-lifted)}
.s-card:active{background:var(--blue-lt);transform:scale(.99)}
.s-card-info{flex:1;min-width:0}
.s-name{font-size:16px;font-weight:600;color:var(--ink);font-family:'Noto Serif KR',serif}
.s-inst{font-size:11.5px;color:var(--blue);font-weight:500;margin-top:1px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.s-meta{font-size:12px;color:var(--ink-60);margin-top:3px;display:flex;gap:8px;align-items:center}

/* ── Category headers ──────────────────────────────────── */
.cat-hd{display:flex;align-items:center;gap:8px;margin:20px 0 10px;padding-bottom:8px;border-bottom:1px solid var(--border)}
.cat-hd-line{width:4px;height:16px;flex-shrink:0;background:linear-gradient(180deg,var(--dancheong-blue),var(--dancheong-red));border-radius:2px}
.cat-title{font-family:'Noto Serif KR',serif;font-size:17px;font-weight:500;color:var(--ink);letter-spacing:-.3px}
.cat-count{font-size:10.5px;color:var(--blue);font-weight:600;background:var(--blue-lt);padding:2px 8px;border-radius:10px}

/* ── Modal (full-screen on mobile) ─────────────────────── */
.mb{position:fixed;inset:0;background:rgba(0,0,0,.4);z-index:500;display:flex;align-items:flex-end;justify-content:center;animation:mbIn var(--dur-fast) var(--ease-out) both}
@keyframes mbIn{from{opacity:0}to{opacity:1}}
.modal{background:var(--paper);width:100%;max-height:95vh;max-height:95dvh;overflow-y:auto;-webkit-overflow-scrolling:touch;border-radius:var(--radius-lg) var(--radius-lg) 0 0;animation:slideUp var(--dur-slow) var(--ease-out)}
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
.dash-card{background:var(--paper);border:1px solid var(--border);border-radius:var(--radius);padding:18px;margin-bottom:12px;transition:transform var(--dur-base) var(--ease-out),box-shadow var(--dur-base) var(--ease-out)}
.dash-card:hover{transform:translateY(-1px);box-shadow:var(--shadow-lifted)}
.dash-card-title{font-family:'Noto Serif KR',serif;font-size:14px;font-weight:500;color:var(--ink);display:flex;align-items:center;gap:8px;margin-bottom:14px}
.dash-card-title::before{content:'';width:4px;height:16px;background:linear-gradient(180deg,var(--dancheong-blue),var(--dancheong-red));display:block;flex-shrink:0;border-radius:2px}

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
.empty-icon{font-size:36px;margin-bottom:10px;opacity:.28}
.empty-txt{font-size:13px;font-family:'Noto Serif KR',serif;color:var(--ink-60)}
.empty-sub{font-size:11px;color:var(--ink-30);margin-top:4px;font-family:'Noto Sans KR',sans-serif}

/* ── Toast ─────────────────────────────────────────────── */
.toast{position:fixed;top:calc(var(--topbar-h) + 8px);left:50%;transform:translateX(-50%);background:var(--blue-dk);color:#fff;padding:10px 20px;font-size:13px;z-index:9999;animation:toastIn .25s ease;border-radius:var(--radius-sm);box-shadow:var(--shadow-md);white-space:nowrap;max-width:90vw}
.toast.toast-error{background:var(--red);}
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
input[type="date"]{max-width:100%;box-sizing:border-box;-webkit-appearance:none}
input[type="date"]::-webkit-date-and-time-value{text-align:left}
@keyframes spin{to{transform:rotate(360deg)}}
.spinner-sm{display:inline-block;width:12px;height:12px;border:2px solid rgba(255,255,255,.3);border-top-color:#fff;border-radius:50%;animation:spin .6s linear infinite;margin-right:6px;vertical-align:middle}

/* ── Attendance ─────────────────────────────────────────── */
.att-row{display:flex;align-items:center;gap:10px;padding:12px 14px;background:var(--paper);border:1px solid var(--border);border-radius:var(--radius);margin-bottom:8px;transition:transform var(--dur-base) var(--ease-out),box-shadow var(--dur-base) var(--ease-out)}
.att-row:hover{transform:translateY(-1px);box-shadow:var(--shadow-lifted)}
.att-btns{display:flex;gap:4px;margin-left:auto;flex-shrink:0}
.att-btn{min-width:44px;height:42px;border-radius:8px;border:1.5px solid var(--border);background:var(--paper);cursor:pointer;display:flex;flex-direction:column;align-items:center;justify-content:center;transition:all var(--dur-fast);color:var(--ink-30);gap:1px;padding:2px 6px}
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
.pay-row{display:flex;align-items:center;gap:10px;padding:12px 14px;background:var(--paper);border:1px solid var(--border);border-radius:var(--radius);margin-bottom:8px;cursor:pointer;transition:background var(--dur-fast),transform var(--dur-base) var(--ease-out),box-shadow var(--dur-base) var(--ease-out)}
.pay-row:hover{transform:translateY(-1px);box-shadow:var(--shadow-lifted)}
.pay-row:active{background:var(--ink-10)}
.pay-amount{font-family:'Noto Serif KR',serif;font-size:15px;font-weight:700;color:var(--ink);margin-left:auto;text-align:right;flex-shrink:0;font-variant-numeric:tabular-nums}
.pay-status{font-size:11px;margin-top:1px}
.pay-status.paid{color:var(--green)}
.pay-status.unpaid{color:var(--red)}
.pay-summary-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:8px;margin-bottom:16px}
.pay-summary-card{background:var(--paper);border:1px solid var(--border);border-radius:var(--radius);padding:12px;text-align:center;transition:transform var(--dur-base) var(--ease-out),box-shadow var(--dur-base) var(--ease-out)}
.pay-summary-card:hover{transform:translateY(-1px);box-shadow:var(--shadow-lifted)}
.pay-summary-num{font-family:'Noto Serif KR',serif;font-size:20px;font-weight:700;line-height:1.2;font-variant-numeric:tabular-nums}
.pay-summary-label{font-size:10px;color:var(--ink-30);margin-top:2px}
.pay-footer{background:var(--hanji);border:1px solid var(--border);border-radius:var(--radius-lg);padding:14px 16px;margin-top:8px;display:flex;justify-content:space-between;align-items:center}
.pay-footer-label{font-size:12px;color:var(--ink-60)}
.pay-footer-amount{font-family:'Noto Serif KR',serif;font-size:20px;font-weight:700;color:var(--ink);font-variant-numeric:tabular-nums}

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
  .sidebar{display:flex;width:220px;background:var(--blue-dk);height:100vh;flex-direction:column;position:fixed;top:0;left:0;z-index:200;overflow:hidden}
  .sb-nav{flex:1;overflow-y:auto;scrollbar-width:thin;scrollbar-color:rgba(255,255,255,.15) transparent}
  .sb-nav::-webkit-scrollbar{width:3px}
  .sb-nav::-webkit-scrollbar-track{background:transparent}
  .sb-nav::-webkit-scrollbar-thumb{background:rgba(255,255,255,.15);border-radius:3px}
  .sb-nav::-webkit-scrollbar-thumb:hover{background:rgba(255,255,255,.3)}
  .app-wrap{flex-direction:row}
  .main-scroll{margin-left:220px;padding-bottom:16px}
  .main-content{padding:28px 36px;max-width:960px}
  .topbar{display:none}
  .modal{max-width:600px;max-height:90vh;border-radius:var(--radius-lg);margin:auto;animation:scaleIn var(--dur-base) var(--ease-out) both}
  .mb{align-items:center}
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
  --dancheong-blue:#5A78CC;--dancheong-red:#C84848;--dancheong-yellow:#D4B040;
  --hanji:linear-gradient(135deg,#1C1914,#221E15);
  --shadow-lifted:0 8px 32px rgba(0,0,0,.4);
}
@media(prefers-color-scheme:dark){
  :root:not([data-theme="light"]){
    --paper:#1E1F28;--bg:#13141A;--border:#2D2E3A;
    --ink:#E8E8F0;--ink-60:#9090A8;--ink-30:#52526A;--ink-10:#24252F;
    --shadow:0 1px 3px rgba(0,0,0,.3);--shadow-md:0 4px 16px rgba(0,0,0,.4);
    --blue-lt:rgba(43,58,159,.18);--blue-md:#6270CC;
    --red-lt:rgba(232,40,28,.14);--gold-lt:rgba(245,168,0,.14);
    --green-lt:rgba(26,122,64,.14);
    --dancheong-blue:#5A78CC;--dancheong-red:#C84848;--dancheong-yellow:#D4B040;
    --hanji:linear-gradient(135deg,#1C1914,#221E15);
    --shadow-lifted:0 8px 32px rgba(0,0,0,.4);
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
.sched-day-hd.today{border-bottom-color:var(--dancheong-blue)}
.sched-lesson{display:flex;align-items:center;gap:10px;padding:10px 14px;background:var(--paper);border:1px solid var(--border);border-radius:var(--radius-sm);margin-bottom:6px;border-left:3px solid var(--blue)}
.sched-lesson.makeup{border-left-color:var(--gold)}
.sched-time{font-size:12px;color:var(--ink-60);width:44px;flex-shrink:0;font-variant-numeric:tabular-nums}
.sched-info{flex:1;min-width:0}
.sched-name{font-size:13px;font-weight:600;color:var(--ink)}
.sched-inst{font-size:11px;color:var(--blue);margin-top:1px}
.sched-teacher{font-size:11px;color:var(--ink-30);margin-top:1px}
.sched-makeup-badge{background:var(--gold-lt);color:var(--gold-dk);font-size:10px;font-weight:600;padding:2px 8px;border-radius:6px;flex-shrink:0}
.sched-empty{background:var(--paper);border:1px solid var(--border);border-radius:var(--radius);padding:18px 16px;font-size:12px;color:var(--ink-30);text-align:center;display:flex;flex-direction:column;align-items:center;gap:6px;font-family:'Noto Serif KR',serif}
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
@media print{
  @page{size:A4;margin:15mm}
  body{background:#fff!important}
  body *{visibility:hidden!important}
  #analytics-report,#analytics-report *{visibility:visible!important}
  #analytics-report{position:absolute!important;left:0;top:0;width:100%;padding:0;background:#fff!important;color:#000!important}
  #analytics-report .no-print{display:none!important}
  #analytics-report .dash-card{break-inside:avoid;page-break-inside:avoid;box-shadow:none!important;border:1px solid #ccc!important;margin-bottom:12px!important;background:#fff!important}
  #analytics-report .stat-card{box-shadow:none!important;border:1px solid #ccc!important;background:#fff!important}
  #analytics-report .ph h1{font-size:22px!important}
  .fab,.sidebar,.bottom-nav,nav,header,.sched-toolbar{display:none!important}
  .settlement-paper,.settlement-paper *{visibility:visible!important}
  .settlement-paper{position:absolute!important;left:0;top:0;width:100%;padding:24px 28px!important;background:#fff!important;color:#000!important}
  .settlement-controls{display:none!important}
  .settlement-table th{background:#f4f4f4!important;-webkit-print-color-adjust:exact!important;print-color-adjust:exact!important}
  .settlement-table tfoot td{background:#f9f9f9!important;-webkit-print-color-adjust:exact!important;print-color-adjust:exact!important}
}

/* ── 휴강 버튼 ───────────────────────────────────────────── */
.att-btn.cancelled{background:var(--ink-10);border-color:var(--ink-30);color:var(--ink-60)}
.att-btn.cancelled:hover{background:var(--border);color:var(--ink)}

/* ── Heritage: 단청 그라디언트 ──────────────────────────── */
.dancheong-stripe-3{background:linear-gradient(90deg,var(--dancheong-blue),var(--dancheong-red),var(--dancheong-yellow));height:3px;border-radius:2px;flex-shrink:0}
.dancheong-stripe-5{background:linear-gradient(90deg,var(--dancheong-blue),var(--dancheong-red),var(--dancheong-yellow),var(--dancheong-white),var(--dancheong-black));height:1px;flex-shrink:0}
.dancheong-corner{position:relative;overflow:hidden}
.dancheong-corner::before{content:'';position:absolute;top:0;left:0;width:18px;height:18px;background:linear-gradient(135deg,var(--dancheong-blue) 33%,var(--dancheong-red) 33% 66%,var(--dancheong-yellow) 66%);opacity:.25;pointer-events:none;z-index:1}

/* ── Heritage: 마이크로 모션 ────────────────────────────── */
@keyframes fadeUp{from{opacity:0;transform:translateY(8px)}to{opacity:1;transform:translateY(0)}}
@keyframes scaleIn{from{opacity:0;transform:scale(.96)}to{opacity:1;transform:scale(1)}}
.fade-up{animation:fadeUp var(--dur-base) var(--ease-out) both}
.scale-in{animation:scaleIn var(--dur-base) var(--ease-out) both}

/* ── Premium Motion: Portal hero · stats · tabs ───────────── */
@keyframes stripeWipe{from{transform:scaleX(0)}to{transform:scaleX(1)}}
@keyframes fadeOnly{from{opacity:0}to{opacity:1}}
.hero-card{animation:fadeUp 320ms var(--ease-out) both}
.hero-stripe{transform-origin:left center;animation:stripeWipe 480ms var(--ease-out) 120ms both}
.hero-name{animation:fadeOnly 400ms var(--ease-out) 200ms both}
.p-stat{animation:fadeUp 320ms var(--ease-out) both;transition:transform var(--dur-fast) var(--ease-out)}
.p-stat:nth-child(1){animation-delay:0ms}
.p-stat:nth-child(2){animation-delay:80ms}
.p-stat:nth-child(3){animation-delay:160ms}
.p-stat:active{transform:scale(.98)}
.tab-bar{position:relative}
.tab-bar-btn{position:relative;transition:color var(--dur-fast) var(--ease-out),transform var(--dur-fast) var(--ease-out);border-bottom:2px solid transparent !important}
.tab-bar-btn:active{transform:scale(.97)}
.tab-indicator{position:absolute;bottom:0;left:0;height:2px;background:var(--blue);border-radius:2px 2px 0 0;pointer-events:none;will-change:transform,width;transition:transform 320ms var(--ease-out),width 320ms var(--ease-out)}
@media(prefers-reduced-motion:reduce){
  .hero-card,.hero-stripe,.hero-name,.p-stat,.fade-up,.scale-in{animation:none !important}
  .p-stat{transform:none !important}
  .tab-indicator{transition:none !important}}

/* ── BulkFee Modal (일괄 수강료 설정) ───────────────────── */
.bf-overlay{position:fixed;inset:0;z-index:500;background:var(--bg);display:flex;flex-direction:column;overflow:hidden}
.bf-header{display:flex;align-items:center;gap:12px;padding:14px 20px;background:var(--paper);border-bottom:1px solid var(--border);flex-shrink:0}
.bf-header h2{font-family:'Noto Serif KR',serif;font-size:17px;font-weight:600;flex:1;color:var(--ink)}
.bf-body{flex:1;overflow-y:auto;padding:16px 20px;-webkit-overflow-scrolling:touch}
.bf-filters{display:flex;gap:8px;flex-wrap:wrap;margin-bottom:14px}
.bf-mode-row{display:flex;gap:6px;margin-bottom:14px;flex-wrap:wrap;align-items:center}
.bf-mode-btn{padding:7px 16px;font-size:12.5px;border:1.5px solid var(--border);border-radius:20px;background:var(--paper);color:var(--ink-30);cursor:pointer;font-family:inherit;transition:all .12s;white-space:nowrap}
.bf-mode-btn.active{background:var(--blue);border-color:var(--blue);color:#fff}
.bf-amount-row{display:flex;align-items:center;gap:8px;margin-bottom:16px;flex-wrap:wrap}
.bf-table-wrap{overflow-x:auto;margin-bottom:16px;border-radius:var(--radius);border:1px solid var(--border)}
.bf-table{width:100%;border-collapse:collapse;font-size:12.5px}
.bf-table th{background:var(--ink-10);padding:9px 12px;text-align:left;font-size:10.5px;font-weight:600;color:var(--ink-30);letter-spacing:.5px;text-transform:uppercase;border-bottom:1px solid var(--border);white-space:nowrap}
.bf-table td{padding:9px 12px;border-bottom:1px solid var(--ink-10);vertical-align:middle}
.bf-table tr:last-child td{border-bottom:none}
.bf-table tr:hover td{background:var(--blue-lt)}
.bf-diff-plus{color:var(--green);font-weight:600}
.bf-diff-minus{color:var(--red);font-weight:600}
.bf-diff-none{color:var(--ink-30)}
.bf-footer{padding:14px 20px calc(14px + var(--safe-b));background:var(--paper);border-top:1px solid var(--border);display:flex;gap:8px;flex-shrink:0}

/* ── Today Lesson 모달 ──────────────────────────────────── */
.tl-student-item{display:flex;align-items:center;gap:10px;padding:10px 14px;border-radius:var(--radius-sm);cursor:pointer;transition:background .12s;border:1px solid var(--border);margin-bottom:6px;background:var(--paper)}
.tl-student-item:hover{background:var(--blue-lt);border-color:rgba(43,58,159,.2)}
.tl-student-item:active{background:var(--blue-lt)}
.tl-plus-btn{display:inline-flex;align-items:center;padding:2px 8px;font-size:12px;color:var(--blue);background:var(--blue-lt);border:none;border-radius:6px;cursor:pointer;font-family:inherit;font-weight:600;transition:all .12s;margin-left:4px}
.tl-plus-btn:hover{background:var(--blue);color:#fff}

/* ── Update Popup ─────────────────────────────────────────── */
.update-popup .modal-h{flex-direction:column;align-items:flex-start;gap:4px}
.up-desc{font-size:15px;line-height:1.7;color:var(--ink-60);margin:12px 0}
.up-pm{background:var(--blue-lt);border-left:3px solid var(--blue);border-radius:var(--radius-sm);padding:12px 14px;margin-top:8px}
.up-pm-badge{font-size:10px;font-weight:700;color:var(--blue);text-transform:uppercase;letter-spacing:.08em}
.tag-update{background:var(--blue);color:#fff;font-weight:700}
.tag-신규기능{background:#EEF1FF;color:var(--blue)}
.tag-UX개선{background:var(--gold-lt);color:var(--gold-dk)}
.tag-기능개선{background:var(--green-lt);color:var(--green)}
.tag-버그수정{background:var(--red-lt);color:var(--red-dk)}

/* ── System News Timeline ─────────────────────────────────── */
.news-wrap{padding:16px;max-width:680px;margin:0 auto}
.news-item{display:flex;gap:14px;margin-bottom:0}
.news-spine{display:flex;flex-direction:column;align-items:center;padding-top:4px}
.news-dot{width:13px;height:13px;border-radius:50%;background:var(--ink-30);flex-shrink:0}
.news-dot.major{background:var(--blue);box-shadow:0 0 0 3px var(--blue-lt)}
.news-line{width:2px;flex:1;background:var(--border);min-height:20px;margin-top:4px}
.news-card{flex:1;background:var(--paper);border:1px solid var(--border);border-radius:var(--radius);padding:14px 16px;margin-bottom:16px}
.news-card.major{border-color:var(--blue);border-width:1.5px}
.news-meta{display:flex;align-items:center;gap:8px;margin-bottom:6px;flex-wrap:wrap}
.news-ver{font-size:12px;font-weight:700;color:var(--blue);background:var(--blue-lt);padding:2px 8px;border-radius:99px}
.news-date{font-size:12px;color:var(--ink-30)}
.news-title{font-size:15px;font-weight:700;color:var(--ink);margin-bottom:6px}
.news-desc{font-size:13px;color:var(--ink-60);line-height:1.65}
.news-pm{background:var(--blue-lt);border-left:3px solid var(--blue);border-radius:var(--radius-sm);padding:10px 12px;margin-top:10px;font-size:13px;color:var(--blue);font-style:italic}
.news-tags{display:flex;gap:6px;flex-wrap:wrap;margin-top:8px}
/* ── 텍스트 크기 토글 ─────────────────────────────────────── */
.btn-aa{background:none;border:1.5px solid var(--border);border-radius:8px;padding:3px 9px;font-size:13px;font-weight:700;cursor:pointer;color:var(--ink-60);transition:all .12s;margin-left:auto;flex-shrink:0;font-family:inherit}
.btn-aa.active{background:var(--blue-lt);border-color:var(--blue);color:var(--blue)}
.btn-aa:hover{border-color:var(--blue-md);color:var(--blue)}
/* ── .text-large: 본문 컨텐츠 영역 확대 ─── */
/* 공지사항 */
.text-large .notice-title{font-size:16px;line-height:1.5}
.text-large .notice-body{font-size:15px;line-height:1.75}
.text-large .notice-meta{font-size:12px}
/* 레슨노트 */
.text-large .lesson-note-content,.text-large .ln-text,.text-large .ln-body{font-size:15px;line-height:1.75}
.text-large .ln-title{font-size:14px}
/* 회원 상세 */
.text-large .det-name{font-size:21px}
.text-large .ii-val{font-size:14px;line-height:1.6}
.text-large .notes-box{font-size:14px;line-height:1.7}
.text-large .lesson-detail-inst{font-size:14px}
.text-large .sched-chip{font-size:13px}
/* 출석·결제 목록 본문 */
.text-large .att-stat{font-size:13px}
.text-large .pay-status{font-size:13px}
/* 시스템 소식 */
.text-large .news-desc{font-size:14.5px;line-height:1.75}
.text-large .news-title{font-size:16px}
.text-large .news-pm{font-size:13.5px}
/* 모달 본문 */
.text-large .modal-b .fg-label{font-size:12px}
.text-large .modal-b .ii-val{font-size:14px}
/* 회원 포털 본문 */
.text-large .portal-body{font-size:15px;line-height:1.65}
.text-large .portal-body .tab-content-text{font-size:15px;line-height:1.75}
/* ── 레이아웃 고정 영역 — 크기 고정 ─── */
.text-large .topbar,.text-large .topbar *,
.text-large .bnav,.text-large .bnav *,
.text-large .sidebar,.text-large .sidebar *,
.text-large table,.text-large table td,.text-large table th,
.text-large .cal-grid,.text-large .cal-grid *,
.text-large .ftab,.text-large .s-card,.text-large .s-card *,
.text-large .pay-row .pay-amount{font-size:unset!important}

/* ── 정산서 ─────────────────────────────────────────── */
.settlement-overlay{position:fixed;inset:0;background:rgba(0,0,0,.55);z-index:600;overflow-y:auto;padding:20px;display:flex;align-items:flex-start;justify-content:center}
.settlement-doc{background:#fff;width:100%;max-width:800px;border-radius:12px;overflow:hidden;margin:auto}
.settlement-controls{display:flex;justify-content:space-between;align-items:center;padding:12px 20px;background:var(--paper);border-bottom:1px solid var(--border);gap:8px;flex-wrap:wrap}
.settlement-paper{padding:32px 38px;font-size:13px;line-height:1.6;color:#1a1a1a;background:var(--hanji)}
.settlement-table{width:100%;border-collapse:collapse;margin-top:4px;font-size:12px}
.settlement-table th{background:#f4f4f4;padding:8px 10px;text-align:left;font-size:11px;font-weight:600;color:#444;border:1px solid #ddd}
.settlement-table td{padding:9px 10px;border:1px solid #eee;vertical-align:middle}
.settlement-table tfoot td{background:#f9f9f9;border-top:2px solid #333;font-size:13.5px}
`;
