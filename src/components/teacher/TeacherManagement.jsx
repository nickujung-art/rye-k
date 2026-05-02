import { useState, useRef } from "react";
import { IC, TODAY_STR, THIS_MONTH } from "../../constants.jsx";
import { compressImage, fmtPhone, getPhoneInitialPassword, canManageAll, fmtDate, allLessonInsts } from "../../utils.js";
import { Av, PhotoUpload, RoleBadge, DeleteConfirmFooter } from "../shared/CommonUI.jsx";

// ── INSTRUMENT SELECTOR ───────────────────────────────────────────────────────
export function InstSelector({ selected, onChange, categories }) {
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

// ── TEACHER FORM ──────────────────────────────────────────────────────────────
export function TeacherFormModal({ teacher, categories, onClose, onSave }) {
  const [form, setForm] = useState(teacher || { name: "", username: "", password: "", phone: "", email: "", instruments: [], birthDate: "", hireDate: TODAY_STR, photo: "", bio: "", role: "teacher" });
  const [err, setErr] = useState("");
  const [confirming, setConfirming] = useState(false);
  const [saving, setSaving] = useState(false);
  const fileRef = useRef();
  const set = (k, v) => { setForm(f => ({ ...f, [k]: v })); setErr(""); setConfirming(false); };
  const handlePhoto = async (e) => { const file = e.target.files?.[0]; if (!file) return; try { const compressed = await compressImage(file, 360, 0.75); set("photo", compressed); } catch(err) { console.error("Photo error:",err); } };
  const isEdit = !!teacher;
  // 신규 등록 시 초기 비밀번호 = 연락처 뒷 4자리 (없으면 0000)
  const initialPw = isEdit ? null : getPhoneInitialPassword(form.phone);
  const validate = () => {
    if (!form.name.trim()) { setErr("이름을 입력하세요."); return false; }
    if (!form.username.trim()) { setErr("아이디를 입력하세요."); return false; }
    return true;
  };
  const handleSaveClick = () => { if (!validate()) return; setConfirming(true); };
  const handleConfirm = async () => {
    if (saving) return; setSaving(true);
    try {
      // 신규: 초기 비밀번호 = 핸드폰 뒷4자리
      const dataToSave = isEdit ? form : { ...form, password: initialPw };
      await onSave(dataToSave);
    } catch(e) { setErr("저장 중 오류가 발생했습니다."); setConfirming(false); }
    finally { setSaving(false); }
  };
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
          <div className="fg"><label className="fg-label">아이디 <span className="req">*</span></label><input className="inp" value={form.username} onChange={e => set("username", e.target.value)} placeholder="로그인 아이디" autoComplete="off" /></div>
          <div className="fg"><label className="fg-label">연락처</label><input className="inp" value={form.phone} onChange={e => set("phone", fmtPhone(e.target.value))} placeholder="010-0000-0000" maxLength={13} /></div>
          {!isEdit && (
            <div style={{background:"var(--blue-lt)",border:"1px solid rgba(43,58,159,.15)",borderRadius:"var(--radius-sm)",padding:"10px 14px",fontSize:12.5,color:"var(--blue)",marginBottom:14,lineHeight:1.6}}>
              💡 <strong>초기 비밀번호: <span style={{fontFamily:"monospace",letterSpacing:1}}>{initialPw}</span></strong><br/>
              <span style={{fontSize:11,color:"var(--ink-60)"}}>연락처 뒷 4자리로 자동 설정됩니다. (연락처 없으면 0000)</span>
            </div>
          )}
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
export function TeacherDetailModal({ teacher: t, students, currentUser, onClose, onEdit, onDelete, onPhotoUpdate }) {
  const insts = (t.instruments || []).filter(Boolean);
  const [showPw, setShowPw] = useState(false);
  const [copyMsg, setCopyMsg] = useState("");
  const initialPw = getPhoneInitialPassword(t.phone);
  const roleLabel = t.role === "manager" ? "매니저" : "강사";
  const copyLoginInfo = () => {
    const url = `${window.location.origin}/?id=${t.username}`;
    const text = `[RYE-K ${roleLabel} 로그인 안내]\n접속 링크: ${url}\n아이디: ${t.username}\n초기 비밀번호: ${initialPw} (연락처 뒷 4자리)\n\n▷ 사용 안내\n1. 위 링크 접속 후 아이디/비밀번호로 로그인\n2. 담당 회원의 출석 · 레슨노트 작성\n3. 회원이 남긴 댓글 확인 및 답변\n\n* 초기 비밀번호는 등록 시점 기준이며, 보안을 위해 변경을 권장합니다.`;
    navigator.clipboard?.writeText(text).then(() => { setCopyMsg("로그인 안내가 복사되었습니다!"); setTimeout(() => setCopyMsg(""), 2000); });
  };
  return (
    <div className="mb" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal">
        <div className="modal-h"><h2>강사/매니저 정보</h2><button className="modal-close" onClick={onClose}>{IC.x}</button></div>
        <div className="det-head">
          {canManageAll(currentUser.role) && onPhotoUpdate ? <PhotoUpload photo={t.photo} name={t.name} size="av-lg" onUpload={(data) => onPhotoUpdate(t.id, data)} /> : <Av photo={t.photo} name={t.name} size="av-lg" />}
          <div style={{flex:1}}>
            <div className="det-name">{t.name}</div>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 4, marginBottom: 5 }}>{insts.map(i => <span key={i} className="tag tag-blue">{i}</span>)}</div>
            <RoleBadge role={t.role || "teacher"} />
            <div style={{ fontSize: 11.5, color: "var(--ink-30)", marginTop: 4 }}>@{t.username}</div>
            {canManageAll(currentUser.role) && (<>
              <div style={{display:"flex",alignItems:"center",gap:6,marginTop:6,flexWrap:"wrap"}}>
                <button onClick={()=>setShowPw(!showPw)} style={{background:"none",border:"1px solid var(--border)",borderRadius:6,padding:"2px 8px",fontSize:10,color:"var(--ink-30)",cursor:"pointer",fontFamily:"inherit",display:"flex",alignItems:"center",gap:3}}>
                  {showPw ? "🔓" : "🔒"} {showPw ? `초기 비밀번호: ${initialPw}` : "초기 비밀번호 확인"}
                </button>
                {showPw && <button onClick={copyLoginInfo} style={{background:"var(--blue-lt)",border:"none",borderRadius:6,padding:"2px 8px",fontSize:10,color:"var(--blue)",cursor:"pointer",fontFamily:"inherit"}}>로그인 안내 복사</button>}
              </div>
              {copyMsg && <div style={{fontSize:11,color:"var(--green)",background:"var(--green-lt)",padding:"4px 10px",borderRadius:6,marginTop:6,animation:"toastIn .25s ease"}}>{copyMsg}</div>}
            </>)}
          </div>
        </div>
        <div className="info-grid">
          <div className="ii"><div className="ii-label">생년월일</div><div className="ii-val">{fmtDate(t.birthDate)}</div></div>
          <div className="ii"><div className="ii-label">임용일</div><div className="ii-val">{fmtDate(t.hireDate)}</div></div>
          <div className="ii"><div className="ii-label">연락처</div><div className="ii-val">{t.phone || "-"}</div></div>
          <div className="ii"><div className="ii-label">이메일</div><div className="ii-val">{t.email || "-"}</div></div>
          <div className="ii" style={{ gridColumn: "1/-1" }}><div className="ii-label">담당 회원</div><div className="ii-val">{students.length}명</div></div>
        </div>
        {t.bio && <div style={{ padding: "12px 20px" }}><div className="ii-label" style={{ marginBottom: 6 }}>소개 / 경력</div><div className="notes-box">{t.bio}</div></div>}
        {students.length > 0 && (
          <div style={{ padding: "12px 20px" }}>
            <div className="ii-label" style={{ marginBottom: 8 }}>담당 회원</div>
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
export function TeachersView({ teachers, students, onAdd, onSelect, attendance = [] }) {
  const [search, setSearch] = useState("");
  const filtered = teachers.filter(t => { const q = search.toLowerCase(); return !q || t.name?.toLowerCase().includes(q) || ((t.instruments || []).join("")).toLowerCase().includes(q); });
  const todayDayName = ["일","월","화","수","목","금","토"][new Date(TODAY_STR + "T00:00:00").getDay()];
  return (
    <div>
      <div className="ph"><div><h1>강사 · 매니저</h1><div className="ph-sub">전체 {teachers.length}명</div></div></div>
      <div className="srch-wrap"><span className="srch-icon">{IC.search}</span><input className="srch-inp" placeholder="이름, 전공 검색" value={search} onChange={e => setSearch(e.target.value)} /></div>
      {filtered.length === 0 ? (
        <div className="empty"><div className="empty-icon">◈</div><div className="empty-txt">등록된 강사가 없습니다.</div></div>
      ) : (
        <div className="s-grid">
          {filtered.map(t => {
            const cnt = students.filter(s => s.teacherId === t.id || (s.lessons||[]).some(l => l.teacherId === t.id)).length;
            const insts = (t.instruments || []).filter(Boolean);
            const todayCount = students.filter(s =>
              (s.teacherId === t.id || (s.lessons||[]).some(l => l.teacherId === t.id)) &&
              (s.lessons||[]).some(l => (l.schedule||[]).some(sc => sc.day === todayDayName))
            ).length;
            const thisMonthAttIds = new Set(
              attendance.filter(a => a.teacherId === t.id && (a.date||"").startsWith(THIS_MONTH) && (a.lessonNote || a.note)).map(a => a.studentId)
            );
            const missingNotes = [...new Set(
              attendance.filter(a => a.teacherId === t.id && (a.date||"").startsWith(THIS_MONTH) && (a.status === "present" || a.status === "late") && !thisMonthAttIds.has(a.studentId)).map(a => a.studentId)
            )].length;
            return (
              <div key={t.id} className="s-card" onClick={() => onSelect(t)}>
                <Av photo={t.photo} name={t.name} />
                <div className="s-card-info">
                  <div className="s-name">{t.name}</div>
                  <div className="s-inst">{insts.join(" · ") || "-"}</div>
                  <div className="s-meta">
                    <RoleBadge role={t.role || "teacher"} />
                    <span style={{fontSize:11,color:"var(--ink-30)"}}>회원 {cnt}명</span>
                  </div>
                  <div style={{display:"flex",gap:6,marginTop:4,flexWrap:"wrap"}}>
                    {todayCount > 0 && <span style={{fontSize:10,background:"var(--blue-lt)",color:"var(--blue)",padding:"2px 7px",borderRadius:4,fontWeight:600}}>오늘 {todayCount}명</span>}
                    {missingNotes > 0 && <span style={{fontSize:10,background:"var(--gold-lt)",color:"var(--gold-dk)",padding:"2px 7px",borderRadius:4,fontWeight:600}}>미작성 {missingNotes}명</span>}
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
