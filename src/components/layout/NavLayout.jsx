import { useState } from "react";
import { IC } from "../../constants.jsx";
import { canManageAll, printQR } from "../../utils.js";
import { Logo, Av } from "../shared/CommonUI.jsx";

// ── BOTTOM NAV (Mobile) ───────────────────────────────────────────────────────
export function BottomNav({ view, setView, unpaidCount, pendingCount, newCommentCount }) {
  const tabs = [
    { id: "dashboard", label: "홈", icon: IC.home },
    { id: "students", label: "회원", icon: IC.users },
    { id: "attendance", label: "출석", icon: IC.check },
    { id: "payments", label: "수납", icon: IC.wallet, badge: unpaidCount },
    { id: "more", label: "더보기", icon: IC.more, badge: (pendingCount || 0) + (newCommentCount || 0) || undefined },
  ];
  return (
    <nav className="bnav">
      {tabs.map(t => (
        <div key={t.id} className={`bnav-item ${view === t.id || (t.id === "more" && ["teachers","notices","categories","profile","activity","pending","trash","studentNotices","analytics","lessonNotes","schedule","institutions","systemNews","monthlyReports","aiSettings"].includes(view)) ? "active" : ""}`} onClick={() => setView(t.id)}>
          <span className="bnav-dot" />
          {t.badge > 0 && <span className="bnav-badge">{t.badge > 99 ? "99+" : t.badge}</span>}
          {t.icon}
          <span className="bnav-label">{t.label}</span>
        </div>
      ))}
    </nav>
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
    <div className="sb-item" onClick={handleShare} style={{color:copied?"var(--gold)":"rgba(255,255,255,.45)"}}>
      <span style={{fontSize:14,width:18,textAlign:"center"}}>🔗</span>
      <span style={{flex:1}}>{copied ? "✓ 복사됨!" : label}</span>
    </div>
  );
}

// ── SIDEBAR (Desktop) ─────────────────────────────────────────────────────────
export function Sidebar({ view, setView, user, onLogout, counts, pendingCount, darkMode, setDarkMode, newCommentCount, textLarge, setTextLarge }) {
  const nav = [
    { id: "dashboard", label: "대시보드", icon: "▦" },
    { id: "students", label: "회원 관리", icon: "♪", badge: counts.students },
    { id: "attendance", label: "출석 체크", icon: "✓" },
    { id: "lessonNotes", label: "레슨노트", icon: "📝", badge: newCommentCount || undefined },
    { id: "payments", label: "수납 관리", icon: "₩" },
    { id: "schedule", label: "강사 스케줄", icon: "◫" },
    ...(canManageAll(user.role) ? [{ id: "institutions", label: "기관 관리", icon: "🏢" }] : []),
    ...(canManageAll(user.role) ? [{ id: "pending", label: "등록 대기", icon: "📋", badge: pendingCount || undefined }] : []),
    ...(canManageAll(user.role) ? [{ id: "teachers", label: "강사 관리", icon: "◈", badge: counts.teachers }] : []),
    ...(canManageAll(user.role) ? [{ id: "notices", label: "공지사항", icon: "◉" }] : []),
    ...(canManageAll(user.role) || user.role === "teacher" ? [{ id: "studentNotices", label: "수강생 공지", icon: "📢" }] : []),
    ...(canManageAll(user.role) || user.role === "teacher" ? [{ id: "monthlyReports", label: "월간 리포트", icon: "📊" }] : []),
    ...(user.role === "admin" ? [{ id: "categories", label: "과목 관리", icon: "≡" }] : []),
    ...(user.role === "admin" ? [{ id: "analytics", label: "현황 분석", icon: "◈" }] : []),
    ...(user.role === "admin" ? [{ id: "aiSettings", label: "AI 설정", icon: "🤖" }] : []),
    ...(canManageAll(user.role) ? [{ id: "activity", label: "활동 기록", icon: "◷" }] : []),
    ...(canManageAll(user.role) ? [{ id: "trash", label: "휴지통", icon: "🗑" }] : []),
    { id: "systemNews", label: "시스템 소식", icon: "🔔" },
    { id: "profile", label: "내 정보", icon: "◎" },
  ];
  const isDark = darkMode === "dark" || (darkMode === null && window.matchMedia?.("(prefers-color-scheme: dark)").matches);
  const toggleDark = () => setDarkMode(isDark ? "light" : "dark");
  return (
    <aside className="sidebar">
      <div className="sb-head">
        <div className="sb-logo">
          <Logo size={34} white />
          <div className="sb-logo-text">
            <div className="rye">RYE-K</div>
            <div className="sub">K-Culture Center</div>
            <div className="ko">국악 교육 디렉토리</div>
          </div>
        </div>
      </div>
      <nav className="sb-nav" style={{ padding: "10px 0" }}>
        <div className="sb-section">메뉴</div>
        {nav.map(item => (
          <div key={item.id} className={`sb-item ${view === item.id ? "active" : ""}`} onClick={() => setView(item.id)}>
            <span style={{ fontSize: 14, width: 18, textAlign: "center" }}>{item.icon}</span>
            <span>{item.label}</span>
            {item.badge != null && <span className="sb-badge">{item.badge}</span>}
          </div>
        ))}
        <div className="sb-section" style={{marginTop:14}}>공유</div>
        {[
          { label: "수강 등록 폼", url: window.location.origin + "/register/", title: "RYE-K 수강 등록", text: "RYE-K K-Culture Center 수강 등록 신청서입니다." },
          { label: "My RYE-K 포털", url: window.location.origin + "/myryk/", title: "My RYE-K", text: "My RYE-K 회원 포털 로그인 페이지입니다." },
        ].map(s => <SidebarShareBtn key={s.label} {...s} />)}
      </nav>
      <div className="sb-foot">
        <div className="sb-user-name">{user.name}</div>
        <div className="sb-user-role">{user.role === "admin" ? "시스템 관리자" : user.role === "manager" ? "매니저" : "강사"}</div>
        <div style={{display:"flex",alignItems:"center",gap:6,marginBottom:10,cursor:"pointer",padding:"6px 8px",borderRadius:6,background:"rgba(255,255,255,.05)"}} onClick={toggleDark}>
          <span style={{fontSize:11,color:"rgba(255,255,255,.4)"}}>{isDark ? "🌙 다크모드" : "☀️ 라이트모드"}</span>
          <div style={{marginLeft:"auto",width:30,height:16,borderRadius:8,background:isDark?"var(--gold)":"rgba(255,255,255,.2)",position:"relative",transition:"background .2s"}}>
            <div style={{width:12,height:12,borderRadius:"50%",background:"#fff",position:"absolute",top:2,left:isDark?16:2,transition:"left .2s"}} />
          </div>
        </div>
        {setTextLarge && (
          <button onClick={() => { const v = !textLarge; setTextLarge(v); localStorage.setItem("rye-text-large", v ? "1" : "0"); }} style={{width:"100%",background:textLarge?"rgba(43,58,159,.25)":"rgba(255,255,255,.06)",border:`1px solid ${textLarge?"rgba(43,58,159,.5)":"rgba(255,255,255,.1)"}`,borderRadius:6,padding:"5px 10px",color:textLarge?"#a5b4fc":"rgba(255,255,255,.45)",fontSize:12,fontWeight:700,cursor:"pointer",fontFamily:"inherit",marginBottom:8,transition:"all .15s",textAlign:"left",display:"flex",alignItems:"center",gap:6}}>
            <span style={{fontSize:13}}>Aa</span>
            <span style={{fontWeight:400,fontSize:11}}>{textLarge ? "큰 글씨 ON" : "글씨 크기"}</span>
          </button>
        )}
        <button className="sb-logout" onClick={onLogout}>로그아웃</button>
      </div>
    </aside>
  );
}

// ── MORE MENU (Mobile) ────────────────────────────────────────────────────────
export function MoreMenu({ user, setView, onLogout, onResetSeed, counts, pendingCount, darkMode, setDarkMode, trash, newCommentCount }) {
  const [showQR, setShowQR] = useState(false);
  const [urlCopied, setUrlCopied] = useState(false);
  const regUrl = window.location.origin + "/register/";
  const qrImgUrl = `https://api.qrserver.com/v1/create-qr-code/?data=${encodeURIComponent(regUrl)}&size=240x240&margin=12`;
  const isDark = darkMode === "dark" || (darkMode === null && window.matchMedia?.("(prefers-color-scheme: dark)").matches);
  const items = [
    { id: "schedule", label: "강사 스케줄", desc: "주간/월간 시간표", icon: IC.schedule },
    { id: "lessonNotes", label: "레슨노트", desc: newCommentCount > 0 ? `새 댓글 ${newCommentCount}건` : "", icon: IC.note, badge: newCommentCount || undefined },
    { id: "institutions", label: "기관 관리", desc: "B2B 파견 레슨", icon: IC.building },
    ...(canManageAll(user.role) ? [{ id: "pending", label: "등록 대기", desc: pendingCount > 0 ? `${pendingCount}건 대기` : "", icon: IC.edit }] : []),
    ...(canManageAll(user.role) ? [{ id: "teachers", label: "강사 · 매니저 관리", desc: `${counts.teachers}명`, icon: IC.teacher }] : []),
    ...(canManageAll(user.role) ? [{ id: "notices", label: "공지사항 관리", icon: IC.bell }] : []),
    ...(canManageAll(user.role) || user.role === "teacher" ? [{ id: "studentNotices", label: "수강생 공지 관리", desc: "My RYE-K 포털 공지", icon: IC.notif }] : []),
    ...(canManageAll(user.role) || user.role === "teacher" ? [{ id: "monthlyReports", label: "월간 리포트", desc: "AI 리포트 생성 · 공개", icon: "📊" }] : []),
    ...(user.role === "admin" ? [{ id: "categories", label: "과목 관리", icon: IC.settings }] : []),
    ...(user.role === "admin" ? [{ id: "analytics", label: "현황 분석", desc: "마케팅 · 보고 · 통계", icon: IC.search }] : []),
    ...(user.role === "admin" ? [{ id: "aiSettings", label: "AI 설정", desc: "AI 기능 켜기·끄기 · 안전 모드", icon: "🤖" }] : []),
    ...(canManageAll(user.role) ? [{ id: "activity", label: "활동 기록", icon: IC.cal }] : []),
    ...(canManageAll(user.role) ? [{ id: "trash", label: "휴지통", desc: trash.length > 0 ? `${trash.length}건` : "", icon: IC.x }] : []),
    { id: "systemNews", label: "시스템 소식", desc: "업데이트 이력 확인", icon: IC.bell },
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
        <div key={item.id} className="menu-item" onClick={() => setView(item.id)} style={{position:"relative"}}>
          <span style={{color:"var(--blue)"}}>{item.icon}</span>
          <div className="menu-item-label">{item.label}</div>
          {item.desc && <span className="menu-item-desc" style={{color:item.badge?"var(--blue)":undefined}}>{item.desc}</span>}
          {item.badge > 0 && <span style={{background:"var(--blue)",color:"#fff",fontSize:10,fontWeight:700,padding:"2px 7px",borderRadius:10,marginLeft:4}}>{item.badge}</span>}
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
        <div className="menu-item-label">회원 등록 QR코드</div>
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
        <ShareButton label="수강 등록 폼 공유" desc="회원·학부모에게 등록 링크 전달" url={regUrl} title="RYE-K 수강 등록" text="RYE-K K-Culture Center 수강 등록 신청서입니다." />
        <ShareButton label="My RYE-K 포털 공유" desc="회원 전용 출석/수납 조회 포털" url={window.location.origin + "/myryk/"} title="My RYE-K" text="My RYE-K 회원 포털 로그인 페이지입니다." />
      </div>

      <div className="menu-item" onClick={onLogout} style={{color:"var(--red)",marginTop:8}}>
        <span>{IC.logout}</span>
        <div className="menu-item-label" style={{color:"var(--red)"}}>로그아웃</div>
      </div>
    </div>
  );
}
