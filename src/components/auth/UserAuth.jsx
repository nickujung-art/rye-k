import { useState, useRef } from "react";
import { compressImage, fmtDate, fmtPhone } from "../../utils.js";
import { Logo, Av, RoleBadge } from "../shared/CommonUI.jsx";
import { InstSelector } from "../teacher/TeacherManagement.jsx";

// ── 로그인 레이트 리밋 ─────────────────────────────────────────────────────────
const _FAIL_KEY = (u) => `ryek_lf_${u}`;
const _MAX_FAILS = 5;
const _WINDOW_MS = 15 * 60 * 1000; // 15분 윈도우 내
const _LOCKOUT_MS = 5 * 60 * 1000;  // 5분 락아웃

function _checkLockout(username) {
  try {
    const rec = JSON.parse(localStorage.getItem(_FAIL_KEY(username)) || "{}");
    if (rec.lockedUntil && Date.now() < rec.lockedUntil) {
      return Math.ceil((rec.lockedUntil - Date.now()) / 60000);
    }
  } catch {}
  return 0;
}

function _recordFail(username) {
  try {
    const now = Date.now();
    const rec = JSON.parse(localStorage.getItem(_FAIL_KEY(username)) || "{}");
    const fails = (rec.fails || []).filter(t => now - t < _WINDOW_MS);
    fails.push(now);
    const lockedUntil = fails.length >= _MAX_FAILS ? now + _LOCKOUT_MS : null;
    localStorage.setItem(_FAIL_KEY(username), JSON.stringify({ fails, lockedUntil }));
  } catch {}
}

function _clearFail(username) {
  try { localStorage.removeItem(_FAIL_KEY(username)); } catch {}
}

// ── LOGIN ─────────────────────────────────────────────────────────────────────
export function LoginScreen({ onLogin }) {
  const [u, setU] = useState(() => {
    try {
      const params = new URLSearchParams(window.location.search);
      const urlId = params.get("id");
      if (urlId) return urlId;
      return localStorage.getItem("ryekSavedId") || "";
    } catch { return ""; }
  });
  const [p, setP] = useState("");
  const [err, setErr] = useState(""); const [loading, setLoading] = useState(false);
  const [saveId, setSaveId] = useState(() => { try { return !!localStorage.getItem("ryekSavedId"); } catch { return false; } });
  const handle = async () => {
    if (!u.trim() || !p.trim()) { setErr("아이디와 비밀번호를 입력하세요."); return; }
    const minsLeft = _checkLockout(u.trim());
    if (minsLeft > 0) { setErr(`로그인 시도 초과. ${minsLeft}분 후 다시 시도해주세요.`); return; }
    setLoading(true); setErr("");
    const ok = await onLogin(u.trim(), p);
    if (ok === "loading") { setErr("데이터를 불러오는 중입니다. 잠시 후 다시 시도해주세요."); setLoading(false); }
    else if (!ok) {
      _recordFail(u.trim());
      const minsAfter = _checkLockout(u.trim());
      if (minsAfter > 0) setErr(`로그인 시도 초과. ${minsAfter}분 후 다시 시도해주세요.`);
      else setErr("아이디 또는 비밀번호가 올바르지 않습니다.");
      setLoading(false);
    } else {
      _clearFail(u.trim());
      try {
        if (saveId) localStorage.setItem("ryekSavedId", u.trim());
        else localStorage.removeItem("ryekSavedId");
        localStorage.setItem("ryek_last_login", String(Date.now()));
      } catch {}
    }
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
        <div style={{display:"flex",alignItems:"center",gap:7,marginBottom:12,cursor:"pointer"}} onClick={() => setSaveId(s => !s)}>
          <div style={{width:16,height:16,borderRadius:4,border:"1.5px solid var(--border)",background:saveId?"var(--blue)":"var(--paper)",display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0,transition:"all .12s"}}>
            {saveId && <span style={{color:"#fff",fontSize:11,fontWeight:700,lineHeight:1}}>✓</span>}
          </div>
          <span style={{fontSize:12,color:"var(--ink-60)"}}>아이디 저장</span>
        </div>
        <button className="login-btn" onClick={handle} disabled={loading}>{loading ? "확인 중…" : "로그인"}</button>
      </div>
    </div>
  );
}

// ── PROFILE VIEW ──────────────────────────────────────────────────────────────
export function ProfileView({ currentUser, teachers, students, onProfileSave, categories }) {
  const info = teachers.find(t => t.id === currentUser.id);
  const myStudents = students.filter(s => s.teacherId === currentUser.id || (s.lessons||[]).some(l=>l.teacherId===currentUser.id));
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
        {currentUser.role === "admin" && <div className="info-grid"><div className="ii"><div className="ii-label">강사/매니저</div><div className="ii-val">{teachers.length}명</div></div><div className="ii"><div className="ii-label">전체 회원</div><div className="ii-val">{students.length}명</div></div></div>}
        {currentUser.role !== "admin" && info && (
          <div className="info-grid">
            <div className="ii"><div className="ii-label">연락처</div><div className="ii-val">{info.phone || "-"}</div></div>
            <div className="ii"><div className="ii-label">이메일</div><div className="ii-val">{info.email || "-"}</div></div>
            <div className="ii"><div className="ii-label">임용일</div><div className="ii-val">{fmtDate(info.hireDate)}</div></div>
            <div className="ii"><div className="ii-label">담당 회원</div><div className="ii-val">{myStudents.length}명</div></div>
          </div>
        )}
      </div>
    </div>
  );
}
