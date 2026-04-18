import { useState, useRef } from "react";
import { IC, TODAY_STR, DAYS, ATT_STATUS } from "../../constants.jsx";
import { calcAge, isMinor, getCat, fmtDate, fmtDateShort, fmtMoney, canManageAll, monthLabel, allLessonInsts, allLessonDays, getBirthPassword, formatLessonNoteSummary, compressImage, fmtPhone } from "../../utils.js";
import { Av, PhotoUpload, DeleteConfirmFooter } from "../shared/CommonUI.jsx";

// ── LESSON EDITOR ─────────────────────────────────────────────────────────────
export function LessonEditor({ lessons, onChange, categories, teachers }) {
  const selectedInsts = lessons.map(l => l.instrument);
  const toggleInst = inst => {
    if (selectedInsts.includes(inst)) onChange(lessons.filter(l => l.instrument !== inst));
    else onChange([...lessons, { instrument: inst, teacherId: "", schedule: [{ day: "", time: "" }] }]);
  };
  const updSch = (inst, idx, field, val) => onChange(lessons.map(l => l.instrument !== inst ? l : { ...l, schedule: l.schedule.map((s, i) => i !== idx ? s : { ...s, [field]: val }) }));
  const addSch = inst => onChange(lessons.map(l => l.instrument !== inst ? l : { ...l, schedule: [...l.schedule, { day: "", time: "" }] }));
  const rmSch = (inst, idx) => onChange(lessons.map(l => l.instrument !== inst ? l : { ...l, schedule: l.schedule.filter((_, i) => i !== idx) }));
  const updTeacher = (inst, tid) => onChange(lessons.map(l => l.instrument !== inst ? l : { ...l, teacherId: tid }));
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
              {teachers && teachers.length > 0 && (
                <div style={{ marginBottom: 8 }}>
                  <div style={{ fontSize: 10.5, color: "var(--ink-30)", fontWeight: 600, letterSpacing: .5, marginBottom: 4 }}>담당 강사</div>
                  <select className="sel" style={{ fontSize: 13, padding: "8px 10px" }} value={l.teacherId || ""} onChange={e => updTeacher(l.instrument, e.target.value)}>
                    <option value="">강사 선택</option>
                    {teachers.map(t => <option key={t.id} value={t.id}>{t.name}{t.instruments?.length ? ` (${t.instruments.join(", ")})` : ""}</option>)}
                  </select>
                </div>
              )}
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

// ── STUDENT FORM ──────────────────────────────────────────────────────────────
export function StudentFormModal({ student, teachers, currentUser, categories, feePresets, onClose, onSave }) {
  const [form, setForm] = useState(student
    ? { instrumentRental: false, rentalType: "", rentalFee: 0, pendingOneTimeCharges: [], ...student }
    : { name: "", birthDate: "", startDate: TODAY_STR, phone: "", guardianPhone: "", teacherId: currentUser.role === "teacher" ? currentUser.id : "", lessons: [], photo: "", notes: "", monthlyFee: 0, status: "active", instrumentRental: false, rentalType: "", rentalFee: 0, pendingOneTimeCharges: [] });
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
    if (!isEdit && !form.birthDate) { setErr("생년월일을 입력하세요. (회원코드 비밀번호 생성에 필요)"); return false; }
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
        <div className="modal-h"><h2>{isEdit ? "회원 정보 수정" : "회원 등록"}</h2><button className="modal-close" onClick={onClose}>{IC.x}</button></div>
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
          <div className="fg"><label className="fg-label">이름 <span className="req">*</span></label><input className="inp" value={form.name} onChange={e => set("name", e.target.value)} placeholder="회원 이름" /></div>
          <div className="fg-row">
            <div className="fg"><label className="fg-label">생년월일 {!isEdit && <span className="req">*</span>}{isEdit && <span style={{fontWeight:400,color:"var(--ink-30)",textTransform:"none",letterSpacing:0}}>(선택)</span>}</label><input className="inp" type="date" value={form.birthDate} onChange={e => set("birthDate", e.target.value)} /></div>
            <div className="fg"><label className="fg-label">수강 시작일</label><input className="inp" type="date" value={form.startDate} onChange={e => set("startDate", e.target.value)} /></div>
          </div>
          {isEdit && !form.birthDate && <div style={{background:"var(--gold-lt)",border:"1px solid rgba(245,168,0,.25)",borderRadius:8,padding:"8px 12px",fontSize:12,color:"var(--gold-dk)",marginTop:-6,marginBottom:4}}>⚠ 생년월일 미입력 시 My RYE-K 로그인이 불가합니다.</div>}
          {canManageAll(currentUser.role) && <div className="fg"><label className="fg-label">연락처</label><input className="inp" value={form.phone} onChange={e => set("phone", fmtPhone(e.target.value))} placeholder="010-0000-0000" maxLength={13} /></div>}
          {canManageAll(currentUser.role) && (
            <div className="fg">
              <label className="fg-label">보호자 연락처{minor && <span className="req"> *</span>}{form.birthDate && <span style={{ fontWeight: 400, color: "var(--ink-30)", textTransform: "none", letterSpacing: 0 }}> ({minor ? "미성년자" : "성인"})</span>}</label>
              <input className="inp" value={form.guardianPhone} onChange={e => set("guardianPhone", fmtPhone(e.target.value))} placeholder="010-0000-0000" maxLength={13} />
            </div>
          )}
          <div className="fg">
            <label className="fg-label">담당 강사</label>
            {canManageAll(currentUser.role) ? (
              <select className="sel" value={form.teacherId} onChange={e => set("teacherId", e.target.value)}>
                <option value="">미배정</option>
                {teachers.map(t => <option key={t.id} value={t.id}>{t.name} ({(t.instruments || []).filter(Boolean).join(", ") || "강사"})</option>)}
              </select>
            ) : (<input className="inp" value={teachers.find(t => t.id === currentUser.id)?.name || currentUser.name} disabled />)}
          </div>
          {canManageAll(currentUser.role) ? (
            <div className="fg">
              <label className="fg-label">월 수강료</label>
              <div style={{position:"relative",maxWidth:220}}>
                <input className="inp" inputMode="numeric" value={form.monthlyFee ? form.monthlyFee.toLocaleString("ko-KR") : ""} onChange={e => set("monthlyFee", parseInt(e.target.value.replace(/[^\d]/g,"")) || 0)} placeholder="0" style={{paddingRight:30}} />
                <span style={{position:"absolute",right:12,top:"50%",transform:"translateY(-50%)",fontSize:13,color:"var(--ink-30)",pointerEvents:"none"}}>원</span>
              </div>
            </div>
          ) : (
            <div style={{background:"var(--ink-10)",border:"1px solid var(--border)",borderRadius:"var(--radius-sm)",padding:"10px 14px",fontSize:12.5,color:"var(--ink-30)",marginBottom:4}}>
              💡 수강료는 관리자·매니저만 설정할 수 있습니다.
            </div>
          )}
          {canManageAll(currentUser.role) && (() => {
            const rentalOptions = Object.entries(feePresets || {}).filter(([k]) => k.startsWith("rental:"));
            return (
              <div className="fg">
                <label className="fg-label">악기 대여</label>
                <div style={{ display: "flex", alignItems: "center", gap: 8, cursor: "pointer", marginBottom: form.instrumentRental && rentalOptions.length > 0 ? 8 : 0 }} onClick={() => set("instrumentRental", !form.instrumentRental)}>
                  <div style={{ width: 20, height: 20, border: "1.5px solid var(--border)", borderRadius: 6, display: "flex", alignItems: "center", justifyContent: "center", background: form.instrumentRental ? "var(--blue)" : "var(--paper)", transition: "all .12s" }}>
                    {form.instrumentRental && <span style={{ color: "#fff", fontSize: 12, fontWeight: 700 }}>✓</span>}
                  </div>
                  <span style={{ fontSize: 13, color: "var(--ink-60)" }}>악기 대여 중</span>
                  {form.instrumentRental && form.rentalFee > 0 && <span style={{ fontSize: 11, color: "var(--gold-dk)", background: "var(--gold-lt)", padding: "2px 8px", borderRadius: 6, fontWeight: 600 }}>+{form.rentalFee.toLocaleString("ko-KR")}원/월</span>}
                </div>
                {form.instrumentRental && rentalOptions.length > 0 && (
                  <select className="sel" value={form.rentalType || ""} onChange={e => {
                    const key = e.target.value;
                    const fee = key ? (feePresets[key] || 0) : 0;
                    setForm(f => ({ ...f, rentalType: key, rentalFee: fee }));
                  }} style={{ maxWidth: 280 }}>
                    <option value="">대여 종류 선택 (선택사항)</option>
                    {rentalOptions.map(([key, fee]) => (
                      <option key={key} value={key}>{key.replace("rental:", "")}{fee > 0 ? ` — ${fee.toLocaleString("ko-KR")}원/월` : ""}</option>
                    ))}
                  </select>
                )}
              </div>
            );
          })()}
          {canManageAll(currentUser.role) && (
            <div className="fg">
              <label className="fg-label">일회성 청구 예정</label>
              <div style={{fontSize:11,color:"var(--ink-30)",marginBottom:8}}>수납 처리 시 추가 청구로 가져올 수 있습니다.</div>
              {(form.pendingOneTimeCharges||[]).map((ch, i) => (
                <div key={i} style={{display:"flex",gap:6,alignItems:"center",marginBottom:6}}>
                  <select className="sel" style={{flex:"0 0 90px",fontSize:12,padding:"7px 6px"}} value={ch.type||"악기구매"} onChange={e => {
                    const upd = form.pendingOneTimeCharges.map((x,j)=>j===i?{...x,type:e.target.value}:x);
                    set("pendingOneTimeCharges", upd);
                  }}>
                    <option value="악기구매">악기구매</option>
                    <option value="교재비">교재비</option>
                    <option value="악세사리/기타">악세사리/기타</option>
                  </select>
                  <input className="inp" value={ch.title||""} onChange={e => {
                    const upd = form.pendingOneTimeCharges.map((x,j)=>j===i?{...x,title:e.target.value}:x);
                    set("pendingOneTimeCharges", upd);
                  }} placeholder="세부 항목명 (선택)" style={{flex:2}} />
                  <div style={{position:"relative",flex:"0 0 90px"}}>
                    <input className="inp" inputMode="numeric" value={ch.amount ? ch.amount.toLocaleString("ko-KR") : ""} onChange={e => {
                      const upd = form.pendingOneTimeCharges.map((x,j)=>j===i?{...x,amount:parseInt(e.target.value.replace(/[^\d]/g,""))||0}:x);
                      set("pendingOneTimeCharges", upd);
                    }} style={{paddingRight:18}} placeholder="0" />
                    <span style={{position:"absolute",right:8,top:"50%",transform:"translateY(-50%)",fontSize:10,color:"var(--ink-30)"}}>원</span>
                  </div>
                  <button onClick={() => set("pendingOneTimeCharges", form.pendingOneTimeCharges.filter((_,j)=>j!==i))} style={{background:"none",border:"none",color:"var(--red)",fontSize:16,cursor:"pointer",padding:"0 4px",flexShrink:0}}>×</button>
                </div>
              ))}
              <button className="btn btn-secondary btn-sm" onClick={() => set("pendingOneTimeCharges", [...(form.pendingOneTimeCharges||[]), {type:"악기구매",title:"",amount:0}])}>+ 항목 추가</button>
            </div>
          )}
          {isEdit && (canManageAll(currentUser.role) || currentUser.role === "teacher") && (
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
          <div className="fg"><LessonEditor lessons={form.lessons || []} onChange={v => set("lessons", v)} categories={categories} teachers={canManageAll(currentUser.role) ? teachers : []} /></div>
          <div className="fg"><label className="fg-label">메모 / 특이사항</label><textarea className="inp" value={form.notes} onChange={e => set("notes", e.target.value)} placeholder="수업 참고사항, 특이사항 등" rows={3} /></div>
        </div>
        {confirming ? (
          <div className="confirm-bar">
            <div className="confirm-bar-msg"><strong>{form.name}</strong> 회원을 {isEdit ? "수정" : "등록"}하시겠습니까?</div>
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
export function StudentDetailModal({ student: s, teachers, currentUser, categories, attendance, payments, onClose, onEdit, onDelete, onPhotoUpdate }) {
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
    const url = `${window.location.origin}/myryk/?code=${s.studentCode}`;
    const text = `[My RYE-K 로그인 안내]\n접속 링크: ${url}\n회원코드: ${s.studentCode}\n비밀번호: ${pw} (생일 4자리 MMDD)\n\n링크를 클릭하면 회원코드가 자동으로 입력됩니다.\n비밀번호만 입력하시면 됩니다.`;
    navigator.clipboard?.writeText(text).then(() => { setCopyMsg("로그인 안내가 복사되었습니다!"); setTimeout(() => setCopyMsg(""), 2000); });
  };
  return (
    <div className="mb" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal">
        <div className="modal-h"><h2>회원 정보</h2><button className="modal-close" onClick={onClose}>{IC.x}</button></div>
        <div className="det-head">
          {canManageAll(currentUser.role) && onPhotoUpdate ? <PhotoUpload photo={s.photo} name={s.name} size="av-lg" onUpload={(data) => onPhotoUpdate(s.id, data)} /> : <Av photo={s.photo} name={s.name} size="av-lg" />}
          <div style={{ flex: 1 }}>
            <div className="det-name">{s.name}</div>
            {s.studentCode && <div style={{fontSize:11,color:"var(--ink-30)",marginBottom:4,fontFamily:"monospace"}}>회원코드: {s.studentCode}</div>}
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
          {canManageAll(currentUser.role) && <div className="ii"><div className="ii-label">연락처</div><div className="ii-val">{s.phone || "-"}</div></div>}
          {canManageAll(currentUser.role) && <div className="ii"><div className="ii-label">보호자 연락처</div><div className="ii-val">{s.guardianPhone || "-"}</div></div>}
          {canManageAll(currentUser.role) && <div className="ii"><div className="ii-label">월 수강료</div><div className="ii-val">{fmtMoney(s.monthlyFee)}</div></div>}
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

        {/* Payment History — admin/manager only */}
        {canManageAll(currentUser.role) && sPay.length > 0 && (
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

        <DeleteConfirmFooter label={`${s.name} 회원`} canDelete={canManageAll(currentUser.role)} onDelete={onDelete} onClose={onClose} onEdit={onEdit} />
      </div>
    </div>
  );
}

// ── BULK FEE MODAL ────────────────────────────────────────────────────────────
export function BulkFeeModal({ allStudents, teachers, categories, onClose, onApply }) {
  const [filterTeacher, setFilterTeacher] = useState("all");
  const [filterInst, setFilterInst] = useState("all");
  const [filterStatus, setFilterStatus] = useState("active");
  const [mode, setMode] = useState("set"); // "set" | "add" | "sub"
  const [amount, setAmount] = useState("");
  const [applying, setApplying] = useState(false);

  const allInstruments = Array.from(new Set(
    allStudents.flatMap(s => (s.lessons||[]).map(l => l.instrument))
  )).sort();

  const baseList = allStudents.filter(s => {
    if (filterStatus !== "all" && (s.status||"active") !== filterStatus) return false;
    if (filterTeacher !== "all" && s.teacherId !== filterTeacher && !(s.lessons||[]).some(l=>l.teacherId===filterTeacher)) return false;
    if (filterInst !== "all" && !(s.lessons||[]).some(l=>l.instrument===filterInst)) return false;
    return true;
  });

  const calcNew = (cur) => {
    const n = parseInt((amount||"0").replace(/[^\d]/g,"")) || 0;
    if (mode === "set") return n;
    if (mode === "add") return (cur||0) + n;
    if (mode === "sub") return Math.max(0, (cur||0) - n);
    return cur||0;
  };

  const changedCount = baseList.filter(s => calcNew(s.monthlyFee) !== (s.monthlyFee||0)).length;

  const handleApply = async () => {
    if (!amount) return;
    setApplying(true);
    const updated = allStudents.map(s => {
      if (!baseList.find(b => b.id === s.id)) return s;
      return { ...s, monthlyFee: calcNew(s.monthlyFee) };
    });
    await onApply(updated);
    setApplying(false);
    onClose();
  };

  return (
    <div className="bf-overlay">
      <div className="bf-header">
        <button className="topbar-btn" onClick={onClose}>{IC.x}</button>
        <h2>수강료 일괄 설정</h2>
        <span style={{fontSize:12,color:"var(--ink-30)"}}>관리자 전용</span>
      </div>
      <div className="bf-body">
        {/* 필터 */}
        <div style={{fontSize:11,color:"var(--ink-30)",fontWeight:600,letterSpacing:.5,marginBottom:6,textTransform:"uppercase"}}>필터</div>
        <div className="bf-filters">
          <select className="sel" style={{fontSize:12,padding:"6px 10px"}} value={filterStatus} onChange={e=>setFilterStatus(e.target.value)}>
            <option value="active">재원생</option>
            <option value="paused">휴원생</option>
            <option value="all">전체 상태</option>
          </select>
          <select className="sel" style={{fontSize:12,padding:"6px 10px"}} value={filterTeacher} onChange={e=>setFilterTeacher(e.target.value)}>
            <option value="all">전체 강사</option>
            {teachers.map(t=><option key={t.id} value={t.id}>{t.name}</option>)}
          </select>
          <select className="sel" style={{fontSize:12,padding:"6px 10px"}} value={filterInst} onChange={e=>setFilterInst(e.target.value)}>
            <option value="all">전체 과목</option>
            {allInstruments.map(i=><option key={i} value={i}>{i}</option>)}
          </select>
        </div>
        <div style={{fontSize:12,color:"var(--ink-60)",marginBottom:14}}>
          조건에 해당하는 회원: <strong style={{color:"var(--ink)"}}>{baseList.length}명</strong>
        </div>

        {/* 변경 방식 */}
        <div style={{fontSize:11,color:"var(--ink-30)",fontWeight:600,letterSpacing:.5,marginBottom:6,textTransform:"uppercase"}}>변경 방식</div>
        <div className="bf-mode-row">
          {[{k:"set",l:"금액 지정"},{k:"add",l:"금액 인상 (+)"},{k:"sub",l:"금액 인하 (-)"}].map(m=>(
            <button key={m.k} className={`bf-mode-btn ${mode===m.k?"active":""}`} onClick={()=>setMode(m.k)}>{m.l}</button>
          ))}
        </div>
        <div className="bf-amount-row">
          <span style={{fontSize:12.5,color:"var(--ink-60)",fontWeight:500}}>
            {mode==="set"?"변경할 금액":mode==="add"?"인상 금액":"인하 금액"}
          </span>
          <div style={{position:"relative"}}>
            <input
              className="inp"
              inputMode="numeric"
              style={{maxWidth:160,paddingRight:28}}
              value={amount}
              onChange={e=>setAmount(e.target.value.replace(/[^\d]/g,""))}
              placeholder="0"
            />
            <span style={{position:"absolute",right:10,top:"50%",transform:"translateY(-50%)",fontSize:12,color:"var(--ink-30)"}}>원</span>
          </div>
          {amount && <span style={{fontSize:12.5,color:"var(--blue)",fontWeight:600}}>{parseInt(amount).toLocaleString("ko-KR")}원</span>}
        </div>

        {/* 미리보기 테이블 */}
        {baseList.length > 0 && amount ? (
          <>
            <div style={{fontSize:11,color:"var(--ink-30)",fontWeight:600,letterSpacing:.5,marginBottom:8,textTransform:"uppercase"}}>
              변경 미리보기 <span style={{color:"var(--blue)",fontWeight:700}}>{changedCount}명 변경</span>
            </div>
            <div className="bf-table-wrap">
              <table className="bf-table">
                <thead>
                  <tr>
                    <th>이름</th>
                    <th>강사</th>
                    <th>변경 전</th>
                    <th>변경 후</th>
                    <th>차이</th>
                  </tr>
                </thead>
                <tbody>
                  {baseList.map(s => {
                    const cur = s.monthlyFee || 0;
                    const next = calcNew(cur);
                    const diff = next - cur;
                    const t = teachers.find(t=>t.id===s.teacherId);
                    return (
                      <tr key={s.id}>
                        <td style={{fontWeight:500}}>{s.name}</td>
                        <td style={{color:"var(--ink-60)"}}>{t?.name||"-"}</td>
                        <td style={{color:"var(--ink-60)"}}>{cur.toLocaleString("ko-KR")}원</td>
                        <td style={{fontWeight:600,color:diff!==0?"var(--blue)":"var(--ink-30)"}}>{next.toLocaleString("ko-KR")}원</td>
                        <td className={diff>0?"bf-diff-plus":diff<0?"bf-diff-minus":"bf-diff-none"}>
                          {diff>0?`+${diff.toLocaleString("ko-KR")}`:diff<0?diff.toLocaleString("ko-KR"):"변동없음"}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </>
        ) : (
          <div className="empty" style={{padding:"32px 0"}}>
            <div className="empty-icon">₩</div>
            <div className="empty-txt">{!amount ? "변경 금액을 입력하세요." : "조건에 맞는 회원이 없습니다."}</div>
          </div>
        )}
      </div>
      <div className="bf-footer">
        <button className="btn btn-secondary btn-full" onClick={onClose}>취소</button>
        <button
          className="btn btn-primary btn-full"
          disabled={!amount || changedCount===0 || applying}
          onClick={handleApply}
          style={{fontWeight:600}}
        >
          {applying ? "적용 중…" : `최종 적용 (${changedCount}명)`}
        </button>
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

export function StudentsView({ students, allStudents, teachers, categories, filter, setFilter, search, setSearch, onAdd, onSelect, currentUser, onBulkFeeUpdate }) {
  const [statusFilter, setStatusFilter] = useState("active");
  const [showBulkFee, setShowBulkFee] = useState(false);
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
      {showBulkFee && (
        <BulkFeeModal
          allStudents={allStudents}
          teachers={teachers}
          categories={categories}
          onClose={() => setShowBulkFee(false)}
          onApply={async (updated) => { await onBulkFeeUpdate(updated); }}
        />
      )}
      <div className="ph">
        <div><h1>회원 관리</h1><div className="ph-sub">재원 {activeCount}명{pausedCount > 0 && ` · 휴원 ${pausedCount}`}{withdrawnCount > 0 && ` · 퇴원 ${withdrawnCount}`}</div></div>
        {currentUser && canManageAll(currentUser.role) && (
          <button className="btn btn-gold btn-sm" onClick={() => setShowBulkFee(true)}>
            ₩ 일괄 설정
          </button>
        )}
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
        <div className="empty"><div className="empty-icon">♩</div><div className="empty-txt">{search ? "검색 결과가 없습니다." : "해당 상태의 회원이 없습니다."}</div></div>
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
