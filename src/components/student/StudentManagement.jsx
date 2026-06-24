import { useState, useRef } from "react";
import knotLineSvg from "../../assets/heritage/knot-line.svg";
import { IC, TODAY_STR, THIS_MONTH, DAYS, ATT_STATUS } from "../../constants.jsx";
import { uid, calcAge, isMinor, getCat, fmtDate, fmtDateShort, fmtMoney, canManageAll, monthLabel, allLessonInsts, allLessonDays, getBirthPassword, formatLessonNoteSummary, compressImage, fmtPhone, computeMonthlyAttStats, calcTotalFee } from "../../utils.js";
import { Av, PhotoUpload, DeleteConfirmFooter } from "../shared/CommonUI.jsx";

// ── LESSON EDITOR ─────────────────────────────────────────────────────────────
export function LessonEditor({ lessons, onChange, categories, teachers, feePresets }) {
  const selectedInsts = lessons.map(l => l.instrument);
  const toggleInst = inst => {
    if (selectedInsts.includes(inst)) onChange(lessons.filter(l => l.instrument !== inst));
    else {
      const fee = feePresets ? (feePresets[inst] || 0) : 0;
      onChange([...lessons, { instrument: inst, teacherId: "", fee, schedule: [{ day: "", time: "" }] }]);
    }
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
          {lessons.some(l => !Object.values(categories).flat().includes(l.instrument)) && (
            <div style={{background:"rgba(232,40,28,.08)",border:"1px solid rgba(232,40,28,.25)",borderRadius:8,padding:"8px 12px",marginBottom:10,fontSize:12,color:"var(--red)",display:"flex",alignItems:"flex-start",gap:8}}>
              <span style={{flexShrink:0,fontWeight:700}}>⚠</span>
              <span>저장된 과목 중 현재 카테고리에 없는 <strong>구버전 과목</strong>이 있습니다. 빨간 테두리 항목의 <strong>× 제거</strong> 버튼을 눌러 정리해주세요.</span>
            </div>
          )}
          {lessons.map((l, lessonIdx) => {
            const isGhost = !Object.values(categories).flat().includes(l.instrument);
            return (
            <div key={lessonIdx} className="lesson-item" style={isGhost ? {border:"2px solid rgba(232,40,28,.4)",borderRadius:8,background:"rgba(232,40,28,.03)"} : {}}>
              <div className="lesson-item-head" style={{display:"flex",alignItems:"center",justifyContent:"space-between"}}>
                <div style={{display:"flex",alignItems:"center",gap:6}}>
                  <div className="lesson-inst-label" style={isGhost ? {color:"var(--red)"} : {}}>{l.instrument}</div>
                  {isGhost && <span style={{fontSize:10,color:"var(--red)",background:"rgba(232,40,28,.12)",padding:"1px 6px",borderRadius:4,fontWeight:700}}>구버전 과목 — 삭제 필요</span>}
                </div>
                <div style={{display:"flex",gap:4}}>
                  <button type="button" style={{background: isGhost ? "var(--red)" : "none", border: isGhost ? "none" : "1px solid var(--border)", borderRadius:4, color: isGhost ? "#fff" : "var(--red)", cursor:"pointer", fontSize:11, padding:"2px 8px", lineHeight:1.5, fontFamily:"inherit", fontWeight: isGhost ? 700 : 400}} onClick={()=>onChange(lessons.filter((_, i) => i !== lessonIdx))} title="과목 제거">× 제거</button>
                </div>
              </div>
              {teachers && teachers.length > 0 && (
                <div style={{ marginBottom: 8 }}>
                  <div style={{ fontSize: 10.5, color: "var(--ink-30)", fontWeight: 600, letterSpacing: .5, marginBottom: 4 }}>담당 강사</div>
                  <select className="sel" style={{ fontSize: 13, padding: "8px 10px" }} value={l.teacherId || ""} onChange={e => updTeacher(l.instrument, e.target.value)}>
                    <option value="">강사 선택</option>
                    {teachers.map(t => <option key={t.id} value={t.id}>{t.name}{t.instruments?.length ? ` (${t.instruments.join(", ")})` : ""}</option>)}
                  </select>
                </div>
              )}
              <div style={{ marginBottom: 8 }}>
                <div style={{ fontSize: 10.5, color: "var(--ink-30)", fontWeight: 600, letterSpacing: .5, marginBottom: 4 }}>수강료 (월)</div>
                <div style={{ display: "flex", alignItems: "center", gap: 6, maxWidth: 200 }}>
                  <input
                    className="inp"
                    inputMode="numeric"
                    value={l.fee != null && l.fee > 0 ? l.fee.toLocaleString("ko-KR") : ""}
                    onChange={e => onChange(lessons.map(x => x.instrument !== l.instrument ? x : { ...x, fee: parseInt(e.target.value.replace(/[^\d]/g, "")) || 0 }))}
                    placeholder={(feePresets && feePresets[l.instrument]) ? (feePresets[l.instrument]).toLocaleString("ko-KR") : "0"}
                    style={{ flex: 1, paddingRight: 24 }}
                  />
                  <span style={{ fontSize: 12, color: "var(--ink-30)", flexShrink: 0 }}>원</span>
                </div>
              </div>
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
            );
          })}
        </div>
      )}
    </div>
  );
}

// ── STUDENT FORM ──────────────────────────────────────────────────────────────
export function StudentFormModal({ student, teachers, currentUser, categories, feePresets, discountTypes = [], onClose, onSave }) {
  const [form, setForm] = useState(student
    ? { ...student, instrumentRental: student.instrumentRental ?? false, rentalType: student.rentalType ?? "", rentalFee: student.rentalFee ?? 0, pendingOneTimeCharges: student.pendingOneTimeCharges ?? [], guardianName: student.guardianName ?? "", discount: student.discount ?? null }
    : { name: "", birthDate: "", startDate: TODAY_STR, phone: "", guardianPhone: "", guardianName: "", teacherId: currentUser.role === "teacher" ? currentUser.id : "", lessons: [], photo: "", notes: "", monthlyFee: 0, status: "active", instrumentRental: false, rentalType: "", rentalFee: 0, pendingOneTimeCharges: [], discount: null });
  const [err, setErr] = useState("");
  const [confirming, setConfirming] = useState(false);
  const [saving, setSaving] = useState(false);
  const fileRef = useRef();
  const isEdit = !!student;
  const set = (k, v) => {
    setForm(f => {
      const next = { ...f, [k]: v };
      if (k === "lessons") {
        next.lessons = (v || []).map(l => ({ ...l, fee: l.fee ?? 0 }));
        // H-4: 삭제된 레슨의 lessonInstrument 자동 초기화 (할인 silent 미적용 방지)
        if (next.discount?.lessonInstrument) {
          const instruments = next.lessons.map(l => l.instrument);
          if (!instruments.includes(next.discount.lessonInstrument)) {
            next.discount = { ...next.discount, lessonInstrument: "" };
          }
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
    if (canManageAll(currentUser.role) && isMinor(form.birthDate) && !form.guardianPhone?.trim()) { setErr("미성년자 회원은 보호자 연락처가 필수입니다."); return false; }
    if (!form.lessons || form.lessons.length === 0) { setErr("악기/과목을 하나 이상 선택해주세요."); return false; }
    return true;
  };
  const handleSaveClick = () => { if (!validate()) return; setConfirming(true); };
  const handleConfirm = async () => {
    if (saving) return; setSaving(true);
    try {
      const { original: totalFee } = calcTotalFee(form, feePresets, discountTypes);
      const finalLessons = (form.lessons || []).map(l => ({
        ...l,
        teacherId: l.teacherId || form.teacherId || "",
      }));
      const prevStatus = student?.status || "active";
      const newStatus = form.status || "active";
      // 폼에서 휴원으로 변경 시 pausedAt 보정 (사유 없이 변경하는 경우)
      const statusMeta = newStatus === "paused" && prevStatus !== "paused"
        ? { pausedAt: form.pausedAt || Date.now(), pausedReason: form.pausedReason || "", careLogs: form.careLogs || [] }
        : newStatus !== "paused"
        ? { pausedAt: null, pausedReason: null }
        : {};
      await onSave({ ...form, ...statusMeta, lessons: finalLessons, monthlyFee: totalFee, createdAt: form.createdAt || Date.now() });
    }
    catch(e) { setErr("저장 중 오류가 발생했습니다."); setConfirming(false); }
    finally { setSaving(false); }
  };
  const minor = isMinor(form.birthDate);
  const isTeacherEdit = currentUser.role === "teacher" && isEdit;
  // teacherId가 비어있지만 root teacherId가 자신인 경우도 포함 (DB 미동기화 대비)
  const editorLessons = isTeacherEdit
    ? (form.lessons || []).filter(l => l.teacherId === currentUser.id || (!l.teacherId && form.teacherId === currentUser.id))
    : (form.lessons || []);
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
          {canManageAll(currentUser.role) && (
            <div className="fg">
              <label className="fg-label">보호자 이름</label>
              <input
                className="inp"
                value={form.guardianName}
                onChange={e => set("guardianName", e.target.value)}
                onBlur={e => set("guardianName", e.target.value.trim())}
                placeholder="홍길동"
                maxLength={20}
              />
            </div>
          )}
          {(() => {
            const allLessonsHaveTeacher = (form.lessons || []).length > 0 && (form.lessons || []).every(l => l.teacherId);
            if (canManageAll(currentUser.role) && allLessonsHaveTeacher) return null;
            return (
              <div className="fg">
                <label className="fg-label">담당 강사</label>
                {canManageAll(currentUser.role) ? (
                  <select className="sel" value={form.teacherId} onChange={e => set("teacherId", e.target.value)}>
                    <option value="">미배정</option>
                    {teachers.map(t => <option key={t.id} value={t.id}>{t.name} ({(t.instruments || []).filter(Boolean).join(", ") || "강사"})</option>)}
                  </select>
                ) : (<input className="inp" value={teachers.find(t => t.id === currentUser.id)?.name || currentUser.name} disabled />)}
              </div>
            );
          })()}
          {canManageAll(currentUser.role) ? (
            <div className="fg">
              <label className="fg-label">월 수강료 (과목별 합계)</label>
              <div style={{ background: "var(--ink-5,#F8F8F8)", border: "1px solid var(--border)", borderRadius: "var(--radius-sm)", padding: "10px 14px", fontSize: 13 }}>
                {(form.lessons || []).length === 0 ? (
                  <span style={{ color: "var(--ink-30)" }}>과목 선택 후 수강료가 표시됩니다</span>
                ) : (
                  <>
                    {(form.lessons || []).map(l => (
                      <div key={l.instrument} style={{ display: "flex", justifyContent: "space-between", color: "var(--ink-60)", marginBottom: 4 }}>
                        <span>{l.instrument}</span>
                        <span>{l.fee != null && l.fee > 0 ? l.fee.toLocaleString("ko-KR") + "원" : <span style={{ color: "var(--ink-30)" }}>미설정</span>}</span>
                      </div>
                    ))}
                    {form.instrumentRental && (
                      <div style={{ display: "flex", justifyContent: "space-between", color: "var(--ink-60)", marginBottom: 4 }}>
                        <span>악기 대여료</span>
                        <span>{(form.rentalFee || 0).toLocaleString("ko-KR")}원</span>
                      </div>
                    )}
                    <div style={{ borderTop: "1px dashed var(--border)", paddingTop: 6, marginTop: 4, display: "flex", justifyContent: "space-between", fontWeight: 700, fontSize: 14 }}>
                      <span>합계</span>
                      {(() => {
                        const fee = calcTotalFee(form, feePresets, discountTypes);
                        if (fee.discountAmount > 0) {
                          return (
                            <span>
                              <span style={{ textDecoration: "line-through", color: "var(--ink-30)", fontSize: 12, marginRight: 4 }}>
                                {fee.original.toLocaleString("ko-KR")}원
                              </span>
                              {fee.total.toLocaleString("ko-KR")}원
                              <span style={{ marginLeft: 6, fontSize: 10, background: "var(--blue-lt,#EFF6FF)", color: "var(--blue,#3B82F6)", borderRadius: 99, padding: "1px 6px", fontWeight: 600 }}>
                                {fee.discountName}
                              </span>
                            </span>
                          );
                        }
                        return <span>{fee.total.toLocaleString("ko-KR")}원</span>;
                      })()}
                    </div>
                  </>
                )}
              </div>
              <div style={{ fontSize: 11, color: "var(--ink-30)", marginTop: 4 }}>각 과목의 수강료는 위 레슨 설정에서 입력하세요.</div>
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
              <label className="fg-label">할인 적용</label>
              <select
                className="sel"
                value={form.discount?.discountId || ""}
                onChange={e => {
                  const id = e.target.value;
                  if (!id) { set("discount", null); return; }
                  const today = new Date().toISOString().slice(0, 10);
                  set("discount", {
                    discountId: id,
                    startDate: form.discount?.startDate || today,
                    endDate: form.discount?.endDate || null,
                    lessonInstrument: form.discount?.lessonInstrument || "",
                    appliedBy: currentUser.id,
                    notes: form.discount?.notes || "",
                  });
                }}
              >
                <option value="">할인 없음</option>
                {(discountTypes.filter(d => d.active !== false)).map(d => (
                  <option key={d.id} value={d.id}>
                    {d.name} ({d.type === "percent" ? `${d.value}%` : `${Number(d.value).toLocaleString("ko-KR")}원`} 할인)
                  </option>
                ))}
              </select>
              {form.discount?.discountId && discountTypes.some(d => d.id === form.discount.discountId && d.active !== false) && (
                <>
                  <div className="fg-row" style={{ marginTop: 6 }}>
                    <div className="fg">
                      <label className="fg-label" style={{ fontWeight: 400, fontSize: 11 }}>시작일</label>
                      <input
                        className="inp"
                        type="date"
                        value={form.discount.startDate || ""}
                        onChange={e => set("discount", { ...form.discount, startDate: e.target.value })}
                      />
                    </div>
                    <div className="fg">
                      <label className="fg-label" style={{ fontWeight: 400, fontSize: 11 }}>종료일 (미입력 시 무기한)</label>
                      <input
                        className="inp"
                        type="date"
                        value={form.discount.endDate || ""}
                        onChange={e => set("discount", { ...form.discount, endDate: e.target.value || null })}
                      />
                    </div>
                  </div>
                  {(form.lessons || []).length > 1 && (
                    <div className="fg" style={{ marginTop: 6 }}>
                      <label className="fg-label" style={{ fontWeight: 400, fontSize: 11 }}>특정 과목만 적용 (미선택 시 전 과목)</label>
                      <select
                        className="sel"
                        value={form.discount.lessonInstrument || ""}
                        onChange={e => set("discount", { ...form.discount, lessonInstrument: e.target.value })}
                      >
                        <option value="">전 과목 적용</option>
                        {(form.lessons || []).map(l => (
                          <option key={l.instrument} value={l.instrument}>{l.instrument}</option>
                        ))}
                      </select>
                    </div>
                  )}
                  <div className="fg" style={{ marginTop: 6 }}>
                    <label className="fg-label" style={{ fontWeight: 400, fontSize: 11 }}>메모</label>
                    <input
                      className="inp"
                      value={form.discount.notes || ""}
                      onChange={e => set("discount", { ...form.discount, notes: e.target.value })}
                      placeholder="예: 지인 소개 — 박지연님"
                    />
                  </div>
                </>
              )}
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
          {currentUser.role === "admin" && (
            <div className="fg">
              <label className="fg-label">AI 리포트 톤<span style={{fontWeight:400,color:"var(--ink-30)",textTransform:"none",letterSpacing:0,marginLeft:6}}>(선택)</span></label>
              <select className="sel" value={form.audienceOverride || ""} onChange={e => set("audienceOverride", e.target.value || undefined)} style={{maxWidth:220}}>
                <option value="">자동 (생년월일 기준)</option>
                <option value="guardian">학부모 톤 강제</option>
                <option value="adult_self">본인 톤 강제</option>
              </select>
            </div>
          )}
          <div className="divider" />
          <div className="fg"><LessonEditor lessons={editorLessons} onChange={v => set("lessons", isTeacherEdit ? [...(form.lessons || []).filter(l => l.teacherId !== currentUser.id), ...v] : v)} categories={categories} teachers={canManageAll(currentUser.role) ? teachers : []} feePresets={feePresets} /></div>
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

// ── ATTENDANCE HEATMAP (GitHub contribution style) ────────────────────────────
function AttHeatmap({ sAtt }) {
  const WEEKS = 26;
  const attMap = {};
  sAtt.forEach(a => { if (a.date) attMap[a.date] = a.status; });
  if (!Object.keys(attMap).length) return null;

  const toStr = d => d.getFullYear() + "-" + String(d.getMonth()+1).padStart(2,"0") + "-" + String(d.getDate()).padStart(2,"0");
  const todayDate = new Date(TODAY_STR + "T12:00:00");
  const startDate = new Date(todayDate);
  startDate.setDate(startDate.getDate() - WEEKS * 7);
  const dow = startDate.getDay();
  startDate.setDate(startDate.getDate() - (dow === 0 ? 6 : dow - 1));

  const weeks = [];
  const cur = new Date(startDate);
  for (let w = 0; w < WEEKS; w++) {
    const week = [];
    for (let d = 0; d < 7; d++) {
      const dateStr = toStr(cur);
      week.push({ dateStr, future: dateStr > TODAY_STR });
      cur.setDate(cur.getDate() + 1);
    }
    weeks.push(week);
  }

  const clr = { present: "var(--green)", late: "var(--green)", absent: "var(--red)", excused: "var(--blue)" };

  return (
    <div style={{ overflowX: "auto", marginBottom: 6 }}>
      <div style={{ display: "flex", gap: 2, width: "fit-content" }}>
        {weeks.map((week, wi) => (
          <div key={wi} style={{ display: "flex", flexDirection: "column", gap: 2 }}>
            {week.map(({ dateStr, future }) => {
              const st = attMap[dateStr];
              return (
                <div key={dateStr} title={dateStr + (st ? ` · ${ATT_STATUS[st]}` : "")}
                  style={{ width: 9, height: 9, borderRadius: 2, flexShrink: 0,
                    background: future ? "transparent" : st ? clr[st] : "var(--ink-10)",
                    opacity: future ? 0 : 1 }} />
              );
            })}
          </div>
        ))}
      </div>
      <div style={{ display: "flex", gap: 10, marginTop: 5, fontSize: 10, color: "var(--ink-30)", alignItems: "center", flexWrap: "wrap" }}>
        {[["var(--green)", "출석/지각"], ["var(--red)", "결석"], ["var(--blue)", "보강"]].map(([bg, lbl]) => (
          <span key={lbl} style={{ display: "flex", alignItems: "center", gap: 3 }}>
            <span style={{ display: "inline-block", width: 8, height: 8, borderRadius: 2, background: bg }} />
            {lbl}
          </span>
        ))}
      </div>
    </div>
  );
}

// ── STUDENT DETAIL ────────────────────────────────────────────────────────────
export function StudentDetailModal({ student: s, teachers, currentUser, categories, feePresets, attendance, payments, onClose, onEdit, onDelete, onPhotoUpdate, onSaveStudent, onStatusChange }) {
  const lessonTeacherIds = [...new Set((s.lessons || []).map(l => l.teacherId).filter(Boolean))];
  const lessonTeachers = lessonTeacherIds.map(tid => teachers.find(t => t.id === tid)).filter(Boolean);
  // lesson별 teacher 없으면 root teacherId로 fallback
  const displayTeachers = lessonTeachers.length > 0 ? lessonTeachers : (s.teacherId ? [teachers.find(t => t.id === s.teacherId)].filter(Boolean) : []);
  const minor = isMinor(s.birthDate); const age = calcAge(s.birthDate);
  const days = allLessonDays(s);
  // Attendance history — teacher role sees only their own records
  const sAtt = (attendance || [])
    .filter(a => a.studentId === s.id && (canManageAll(currentUser.role) || a.teacherId === currentUser.id))
    .sort((a,b) => b.createdAt - a.createdAt);
  const { total: attTotal, present: attPresent, absent: attAbsent, late: attLate, excused: attExcused, rate: attRate } = computeMonthlyAttStats(sAtt);
  // Payment history
  const sPay = (payments || []).filter(p => p.studentId === s.id).sort((a,b) => (b.month||"").localeCompare(a.month||""));
  const sNotes = sAtt.filter(a => {
    if (!a.lessonNote || typeof a.lessonNote !== "object") return false;
    const ln = a.lessonNote;
    return ln.progress || ln.content || ln.assignment || ln.memo || ln.managerReport || (ln.condition && ln.condition !== "good");
  });
  const [showAttAll, setShowAttAll] = useState(false);
  const [showNoteAll, setShowNoteAll] = useState(false);
  const [showPw, setShowPw] = useState(false);
  const [copyMsg, setCopyMsg] = useState("");
  const [pausePicker, setPausePicker] = useState(null);
  const rentalOptions = Object.entries(feePresets || {}).filter(([k]) => k.startsWith("rental:"));
  const canManageRental = canManageAll(currentUser.role) || currentUser.role === "teacher";
  const pw = getBirthPassword(s.birthDate);
  const copyLoginInfo = () => {
    const url = `${window.location.origin}/myryk/?code=${s.studentCode}`;
    const text = [
      `[My RYE-K 로그인 안내]`,
      ``,
      `📱 접속 링크: ${url}`,
      ``,
      `─── 아이디 (ID) ───`,
      `• 회원코드: ${s.studentCode}`,
      `  (링크 클릭 시 자동 입력됩니다)`,
      `• 또는 등록된 연락처(본인 또는 보호자 번호)로도 로그인 가능합니다.`,
      ``,
      `─── 비밀번호 ───`,
      `• ${s.name} 학생의 생일 4자리 (월월일일 / MMDD)`,
      `• 비밀번호 예시: 4월 10일 생 → 0410`,
      ``,
      `─── 다자녀 안내 ───`,
      `💡 같은 연락처로 등록된 자녀가 2명 이상인 경우,`,
      `   로그인 후 상단의 [자녀 변경 🔄] 버튼으로 간편하게 전환할 수 있습니다.`,
    ].join("\n");
    navigator.clipboard?.writeText(text).then(() => { setCopyMsg("로그인 안내가 복사되었습니다!"); setTimeout(() => setCopyMsg(""), 2000); });
  };
  return (
    <>
    <div className="mb" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal">
        <div className="modal-h"><h2>회원 정보</h2><button className="modal-close" onClick={onClose}>{IC.x}</button></div>
        <div className="det-head">
          {canManageAll(currentUser.role) && onPhotoUpdate ? <PhotoUpload photo={s.photo} name={s.name} size="av-lg" onUpload={(data) => onPhotoUpdate(s.id, data)} /> : <Av photo={s.photo} name={s.name} size="av-lg" />}
          <div style={{ flex: 1 }}>
            <div className="det-name">{s.name}</div>
            {s.studentCode && <div style={{fontSize:11,color:"var(--ink-30)",marginBottom:4,fontFamily:"monospace"}}>회원코드: {s.studentCode}</div>}
            {/* Password reveal for managers/admins */}
            {s.studentCode && (canManageAll(currentUser.role) || currentUser.role === "teacher") && (<>
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
              {displayTeachers.map(t => <span key={t.id} className="tag tag-gold">{t.name} 강사</span>)}
            </div>
            {days.length > 0 && <div className="day-row">{DAYS.map(d => <div key={d} className={`day-chip ${days.includes(d) ? "on" : ""}`}>{d}</div>)}</div>}
            {onStatusChange && s.status !== "withdrawn" && (
              <div style={{marginTop:6}}>
                {s.status === "paused" ? (
                  <button type="button" onClick={() => { onStatusChange("active"); setPausePicker(null); }}
                    style={{background:"var(--green-lt)",border:"none",borderRadius:6,color:"var(--green)",cursor:"pointer",fontSize:12,fontWeight:600,padding:"5px 14px",fontFamily:"inherit"}}>
                    ▶ 재원 복귀
                  </button>
                ) : !pausePicker ? (
                  <button type="button" onClick={() => setPausePicker({ reason: "", note: "" })}
                    style={{background:"var(--gold-lt)",border:"none",borderRadius:6,color:"var(--gold-dk)",cursor:"pointer",fontSize:12,fontWeight:600,padding:"5px 14px",fontFamily:"inherit"}}>
                    ⏸ 휴원 처리
                  </button>
                ) : null}
                {pausePicker && s.status !== "paused" && (
                  <div style={{marginTop:6,padding:"12px",background:"var(--gold-lt)",borderRadius:8,border:"1px solid rgba(245,168,0,.3)"}}>
                    <div style={{fontSize:12,fontWeight:600,color:"var(--gold-dk)",marginBottom:8}}>휴원 사유 선택</div>
                    <div style={{display:"flex",flexWrap:"wrap",gap:6,marginBottom:8}}>
                      {["스케줄 충돌","재정 부담","동기 저하","강사 불만","이사·건강","기타"].map(r => (
                        <button key={r} type="button" onClick={() => setPausePicker(p => ({...p, reason: r}))}
                          style={{fontSize:11,padding:"3px 10px",borderRadius:12,border:"1px solid",fontFamily:"inherit",cursor:"pointer",
                            borderColor: pausePicker.reason === r ? "var(--gold-dk)" : "var(--border)",
                            background: pausePicker.reason === r ? "var(--gold-dk)" : "var(--paper)",
                            color: pausePicker.reason === r ? "#fff" : "var(--ink-60)",
                            fontWeight: pausePicker.reason === r ? 700 : 400}}>
                          {r}
                        </button>
                      ))}
                    </div>
                    <input placeholder="메모 (선택)" value={pausePicker.note}
                      onChange={e => setPausePicker(p => ({...p, note: e.target.value}))}
                      style={{width:"100%",fontSize:12,padding:"6px 10px",borderRadius:6,border:"1px solid var(--border)",background:"var(--paper)",color:"var(--ink)",fontFamily:"inherit",boxSizing:"border-box",marginBottom:8}} />
                    <div style={{display:"flex",gap:6}}>
                      <button type="button"
                        onClick={() => { if (!pausePicker.reason) return; onStatusChange("paused", pausePicker); setPausePicker(null); }}
                        style={{flex:1,fontSize:12,padding:"6px",borderRadius:6,border:"none",fontFamily:"inherit",cursor:"pointer",fontWeight:600,
                          background:"var(--gold-dk)",color:"#fff",opacity:pausePicker.reason ? 1 : 0.45}}>
                        확인
                      </button>
                      <button type="button" onClick={() => setPausePicker(null)}
                        style={{fontSize:12,padding:"6px 12px",borderRadius:6,border:"1px solid var(--border)",background:"var(--paper)",color:"var(--ink-60)",fontFamily:"inherit",cursor:"pointer"}}>
                        취소
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
        <div className="info-grid">
          <div className="ii"><div className="ii-label">생년월일</div><div className="ii-val">{fmtDate(s.birthDate)}</div></div>
          <div className="ii"><div className="ii-label">수강 시작일</div><div className="ii-val">{fmtDate(s.startDate)}</div></div>
          {canManageAll(currentUser.role) && <div className="ii"><div className="ii-label">연락처</div><div className="ii-val">{s.phone || "-"}</div></div>}
          {canManageAll(currentUser.role) && <div className="ii"><div className="ii-label">보호자 연락처</div><div className="ii-val">{s.guardianPhone || "-"}</div></div>}
          {canManageAll(currentUser.role) && <div className="ii"><div className="ii-label">월 수강료</div><div className="ii-val">{fmtMoney(s.monthlyFee)}</div></div>}
        </div>
        {(s.lessons || []).length > 0 && (() => {
          const visibleLessons = (s.lessons || []).filter(l => canManageAll(currentUser.role) || l.teacherId === currentUser.id);
          return visibleLessons.length > 0 && (
          <div>
            <div style={{ padding: "10px 20px 2px", fontSize: 10, color: "var(--ink-30)", letterSpacing: .5, textTransform: "uppercase", fontWeight: 600 }}>수강 과목 · 레슨 일정</div>
            {visibleLessons.map(l => (
              <div key={l.instrument} className="lesson-detail-row">
                <div className="lesson-detail-inst">
                  <span style={{ width: 3, height: 12, background: l.pausedAt ? "var(--gold)" : "var(--blue)", display: "inline-block", flexShrink: 0, borderRadius: 2 }} />
                  {l.instrument}
                  <span className="tag tag-cat" style={{ fontSize: 10 }}>{getCat(l.instrument, categories)}</span>
                  {l.pausedAt && <span className="tag" style={{background:"var(--gold-lt)",color:"var(--gold-dk)",fontSize:10,padding:"1px 6px"}}>휴원</span>}
                </div>
                <div style={{ display: "flex", flexWrap: "wrap" }}>
                  {(l.schedule || []).filter(sc => sc.day).map((sc, i) => (<span key={i} className="sched-chip">{sc.day}요일{sc.time && <span className="sched-chip-time"> {sc.time}</span>}</span>))}
                  {(l.schedule || []).filter(sc => sc.day).length === 0 && <span style={{ color: "var(--ink-30)", fontSize: 12 }}>요일 미지정</span>}
                </div>
                {onSaveStudent && s.status !== "withdrawn" && (canManageAll(currentUser.role) || (currentUser.role === "teacher" && !!currentUser.id && l.teacherId === currentUser.id)) && (
                  <button type="button" onClick={() => {
                    const updLessons = (s.lessons || []).map(ll => ll.instrument === l.instrument ? { ...ll, pausedAt: ll.pausedAt ? null : TODAY_STR } : ll);
                    onSaveStudent({ ...s, lessons: updLessons });
                  }} style={{background:l.pausedAt?"var(--green-lt)":"var(--gold-lt)",border:"none",borderRadius:6,color:l.pausedAt?"var(--green)":"var(--gold-dk)",cursor:"pointer",fontSize:11,fontWeight:600,padding:"3px 10px",fontFamily:"inherit",marginTop:4,alignSelf:"flex-start"}}>
                    {l.pausedAt ? "▶ 이 레슨 복귀" : "⏸ 이 레슨 휴원"}
                  </button>
                )}
              </div>
            ))}
          </div>
          );
        })()}
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
            <div style={{fontSize:11,color:"var(--ink-30)",marginBottom:4}}>최근 6개월</div>
            <AttHeatmap sAtt={sAtt} />
            <div style={{fontSize:11,color:"var(--ink-30)",marginBottom:6,marginTop:8}}>최근 기록</div>
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

        {/* Learning Progress — 학습 진도 */}
        {sNotes.length > 0 && (() => {
          const condMeta = {
            excellent: { label: "매우 좋음", color: "var(--green)",   bg: "var(--green-lt)" },
            good:      { label: "좋음",     color: "var(--blue)",    bg: "var(--blue-lt)"  },
            normal:    { label: "보통",     color: "var(--gold-dk)", bg: "var(--gold-lt)"  },
            poor:      { label: "부진",     color: "var(--red)",     bg: "var(--red-lt)"   },
          };
          return (
            <div style={{ padding: "12px 20px" }}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 8 }}>
                <div className="ii-label">학습 진도</div>
                <span style={{ fontSize: 10, color: "var(--ink-30)" }}>최근 {Math.min(sNotes.length, 12)}회</span>
              </div>
              {/* Condition dot trail */}
              <div style={{ display: "flex", gap: 4, marginBottom: 10, flexWrap: "wrap" }}>
                {sNotes.slice(0, 12).reverse().map(a => {
                  const cm = condMeta[a.lessonNote.condition || "good"] || condMeta.good;
                  return (
                    <div key={a.id} title={`${a.date} · ${cm.label}`}
                      style={{ width: 12, height: 12, borderRadius: "50%", background: cm.color, flexShrink: 0 }} />
                  );
                })}
              </div>
              {/* Progress timeline */}
              {sNotes.slice(0, showNoteAll ? 20 : 4).map(a => {
                const ln = a.lessonNote;
                const cm = condMeta[ln.condition || "good"] || condMeta.good;
                return (
                  <div key={a.id} style={{ padding: "7px 0", borderBottom: "1px solid var(--ink-10)" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: (ln.progress || ln.content || ln.assignment) ? 4 : 0 }}>
                      <span style={{ fontSize: 11, color: "var(--ink-30)", width: 70, flexShrink: 0 }}>{fmtDateShort(a.date)}</span>
                      <span style={{ fontSize: 10, padding: "1px 8px", borderRadius: 10, background: cm.bg, color: cm.color, fontWeight: 600 }}>{cm.label}</span>
                    </div>
                    {ln.progress && <div style={{ fontSize: 12, color: "var(--ink)", paddingLeft: 76, marginBottom: 2 }}>🎵 {ln.progress}</div>}
                    {ln.content  && <div style={{ fontSize: 11, color: "var(--ink-60)", paddingLeft: 76, marginBottom: 2, whiteSpace: "pre-wrap" }}>{ln.content}</div>}
                    {ln.assignment && <div style={{ fontSize: 11, color: "var(--blue)", paddingLeft: 76 }}>📝 과제: {ln.assignment}</div>}
                  </div>
                );
              })}
              {sNotes.length > 4 && (
                <button className="btn btn-ghost btn-xs" style={{ marginTop: 6 }} onClick={() => setShowNoteAll(v => !v)}>
                  {showNoteAll ? "접기" : `전체 ${sNotes.length}건 보기`}
                </button>
              )}
            </div>
          );
        })()}

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

        {/* 악기 대여 관리 — 강사/관리자 */}
        {canManageRental && onSaveStudent && (
          <div style={{padding:"10px 20px 0"}}>
            <div className="ii-label" style={{marginBottom:8}}>악기 대여</div>
            <div style={{display:"flex",alignItems:"center",gap:8,cursor:"pointer",marginBottom:s.instrumentRental&&rentalOptions.length>0?8:0}} onClick={() => onSaveStudent({ ...s, instrumentRental: !s.instrumentRental, rentalType: !s.instrumentRental ? s.rentalType||"" : "", rentalFee: !s.instrumentRental ? s.rentalFee||0 : 0 })}>
              <div style={{width:20,height:20,border:"1.5px solid var(--border)",borderRadius:6,display:"flex",alignItems:"center",justifyContent:"center",background:s.instrumentRental?"var(--blue)":"var(--paper)",transition:"all .12s"}}>
                {s.instrumentRental && <span style={{color:"#fff",fontSize:12,fontWeight:700}}>✓</span>}
              </div>
              <span style={{fontSize:13,color:"var(--ink-60)"}}>악기 대여 중</span>
              {s.instrumentRental && s.rentalFee > 0 && <span style={{fontSize:11,color:"var(--gold-dk)",background:"var(--gold-lt)",padding:"2px 8px",borderRadius:6,fontWeight:600}}>+{s.rentalFee.toLocaleString("ko-KR")}원/월</span>}
            </div>
            {s.instrumentRental && rentalOptions.length > 0 && (
              <select className="sel" style={{marginBottom:8,maxWidth:280}} value={s.rentalType||""} onChange={e => {
                const key = e.target.value;
                const fee = key ? (feePresets[key] || 0) : 0;
                onSaveStudent({ ...s, rentalType: key, rentalFee: fee });
              }}>
                <option value="">대여 종류 선택 (선택사항)</option>
                {rentalOptions.map(([key, fee]) => (
                  <option key={key} value={key}>{key.replace("rental:", "")}{fee > 0 ? ` — ${fee.toLocaleString("ko-KR")}원/월` : ""}</option>
                ))}
              </select>
            )}
          </div>
        )}

        <DeleteConfirmFooter label={`${s.name} 회원`} canDelete={canManageAll(currentUser.role)} onDelete={onDelete} onClose={onClose} onEdit={onEdit} />
      </div>
    </div>
    </>
  );
}


// ── STUDENT CARD & VIEW ───────────────────────────────────────────────────────
function StudentCard({ student: s, teachers, categories, onClick, payStatus }) {
  const lessonTeacherIds = [...new Set((s.lessons || []).map(l => l.teacherId).filter(Boolean))];
  const lessonTeachers = lessonTeacherIds.map(tid => teachers.find(t => t.id === tid)).filter(Boolean);
  // lesson별 teacher 없으면 root teacherId로 fallback (DB 미동기화 대비)
  const displayTeachers = lessonTeachers.length > 0 ? lessonTeachers : (s.teacherId ? [teachers.find(t => t.id === s.teacherId)].filter(Boolean) : []);
  const minor = isMinor(s.birthDate); const age = calcAge(s.birthDate);
  const insts = allLessonInsts(s); const days = allLessonDays(s);
  const allValidInsts = categories ? Object.values(categories).flat() : null;
  const hasGhostLesson = allValidInsts ? (s.lessons || []).some(l => l.instrument && !allValidInsts.includes(l.instrument)) : false;
  return (
    <div className="s-card" onClick={onClick}>
      <Av photo={s.photo} name={s.name} />
      <div className="s-card-info">
        <div className="s-name">{s.name}{hasGhostLesson && <span title="삭제된 과목이 스케줄에 남아있습니다" style={{fontSize:10,color:"var(--gold-dk)",marginLeft:5,cursor:"default"}}>⚠</span>}{s.studentCode && <span style={{fontSize:10,color:"var(--ink-30)",fontWeight:400,marginLeft:6,fontFamily:"monospace"}}>{s.studentCode}</span>}</div>
        <div className="s-inst">{insts.join(" · ") || "과목 미지정"}</div>
        <div className="s-meta">
          <span className={`tag ${minor ? "tag-minor" : "tag-adult"}`} style={{padding:"1px 6px",fontSize:10}}>{minor ? "미성년" : "성인"}{age !== null ? ` ${age}세` : ""}</span>
          {displayTeachers.map(t => <span key={t.id} style={{color:"var(--gold-dk)",fontSize:11,fontWeight:500}}>{t.name}</span>)}
          {s.status === "paused" && <span className="tag" style={{background:"var(--gold-lt)",color:"var(--gold-dk)",padding:"1px 6px",fontSize:10}}>휴원</span>}
          {s.status === "withdrawn" && <span className="tag" style={{background:"var(--ink-10)",color:"var(--ink-30)",padding:"1px 6px",fontSize:10}}>퇴원</span>}
          {payStatus === "unpaid" && <span style={{background:"var(--gold-lt)",color:"var(--gold-dk)",padding:"1px 6px",fontSize:10,borderRadius:4,fontWeight:700}}>미납</span>}
          {payStatus === "paid" && <span style={{background:"var(--green-lt)",color:"var(--green)",padding:"1px 6px",fontSize:10,borderRadius:4,fontWeight:600}}>✓</span>}
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

export function StudentsView({ students, allStudents, teachers, categories, filter, setFilter, search, setSearch, onAdd, onSelect, currentUser, payments = [] }) {
  const [statusFilter, setStatusFilter] = useState("active");
  const cats = ["전체", ...Object.keys(categories)];
  const statusFiltered = statusFilter === "all" ? students : students.filter(s => (s.status || "active") === statusFilter);
  const showPay = canManageAll(currentUser?.role);
  const getPayStatus = (studentId) => {
    if (!showPay) return null;
    const p = payments.find(pp => pp.studentId === studentId && pp.month === THIS_MONTH);
    if (!p) return null;
    return p.paid ? "paid" : "unpaid";
  };
  const grouped = filter === "전체"
    ? Object.entries(categories).map(([cat, insts]) => ({ cat, items: statusFiltered.filter(s => (s.lessons || []).some(l => insts.includes(l.instrument))) })).filter(g => g.items.length > 0)
    : [{ cat: filter, items: statusFiltered }];
  const activeCount = students.filter(s => (s.status || "active") === "active").length;
  const pausedCount = students.filter(s => s.status === "paused").length;
  const withdrawnCount = students.filter(s => s.status === "withdrawn").length;
  return (
    <div>
      <div className="ph">
        <div><h1>회원 관리</h1><div className="ph-sub">재원 {activeCount}명{pausedCount > 0 && ` · 휴원 ${pausedCount}`}{withdrawnCount > 0 && ` · 퇴원 ${withdrawnCount}`}</div></div>
        <div style={{display:"flex",gap:8,alignItems:"center",flexShrink:0}}>
          {statusFilter === "active" && <button className="btn btn-primary btn-sm" onClick={onAdd} style={{display:"flex",alignItems:"center",gap:4}}>{IC.plus}<span>추가</span></button>}
        </div>
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
        <div className="empty"><img src={knotLineSvg} style={{width:44,height:55,opacity:0.28,marginBottom:10}} alt="" /><div className="empty-txt">{search ? "검색 결과가 없습니다." : "해당 상태의 회원이 없습니다."}</div></div>
      ) : filter === "전체" ? (
        <>
          {grouped.map(({ cat, items }) => (
            <div key={cat}>
              <div className="cat-hd"><div className="cat-hd-line" /><span className="cat-title">{cat}</span><span className="cat-count">{items.length}명</span></div>
              <div className="s-grid">{items.map(s => <StudentCard key={s.id} student={s} teachers={teachers} categories={categories} onClick={() => onSelect(s)} payStatus={getPayStatus(s.id)} />)}</div>
            </div>
          ))}
          {(() => {
            const unassigned = statusFiltered.filter(s => !(s.lessons || []).some(l => l.instrument));
            return unassigned.length > 0 ? (
              <div>
                <div className="cat-hd"><div className="cat-hd-line" /><span className="cat-title" style={{color:"var(--ink-30)"}}>과목 미배정</span><span className="cat-count">{unassigned.length}명</span></div>
                <div className="s-grid">{unassigned.map(s => <StudentCard key={s.id} student={s} teachers={teachers} categories={categories} onClick={() => onSelect(s)} payStatus={getPayStatus(s.id)} />)}</div>
              </div>
            ) : null;
          })()}
        </>
      ) : (
        <div className="s-grid">{statusFiltered.map(s => <StudentCard key={s.id} student={s} teachers={teachers} categories={categories} onClick={() => onSelect(s)} payStatus={getPayStatus(s.id)} />)}</div>
      )}
    </div>
  );
}
