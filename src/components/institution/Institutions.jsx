import { useState, useRef } from "react";
import { DAYS, INST_TYPES, IC, TODAY_STR, THIS_MONTH } from "../../constants.jsx";
import { uid, compressImage, fmtPhone, getContractDaysLeft, instTypeLabel, fmtDate, fmtMoney, monthLabel, canManageAll } from "../../utils.js";
import { Av, DeleteConfirmFooter } from "../shared/CommonUI.jsx";

function InstClassEditor({ classes, onChange, categories, teachers }) {
  const updCls = (idx, field, val) => onChange(classes.map((c, i) => i !== idx ? c : { ...c, [field]: val }));
  const addCls = () => onChange([...classes, { id: uid(), name: "", instrument: "", teacherId: "", schedule: [{ day: "", time: "" }], participantCount: 0, monthlyFee: 0 }]);
  const rmCls = idx => onChange(classes.filter((_, i) => i !== idx));
  const updSch = (clsIdx, schIdx, field, val) => onChange(classes.map((c, i) => i !== clsIdx ? c : { ...c, schedule: c.schedule.map((s, j) => j !== schIdx ? s : { ...s, [field]: val }) }));
  const addSch = clsIdx => onChange(classes.map((c, i) => i !== clsIdx ? c : { ...c, schedule: [...(c.schedule || []), { day: "", time: "" }] }));
  const rmSch = (clsIdx, schIdx) => onChange(classes.map((c, i) => i !== clsIdx ? c : { ...c, schedule: c.schedule.filter((_, j) => j !== schIdx) }));
  const allInsts = Object.entries(categories).flatMap(([cat, arr]) => arr.map(i => ({ cat, name: i })));
  return (
    <div>
      <div className="fg-label" style={{ marginBottom: 6 }}>수업/반 <span className="req">*</span> <span style={{ fontWeight: 400, color: "var(--ink-30)", textTransform: "none", letterSpacing: 0 }}>(반별로 출석·수납이 분리됩니다)</span></div>
      {classes.length === 0 && (
        <div style={{ background: "var(--ink-10)", border: "1px dashed var(--border)", borderRadius: 8, padding: "12px 14px", fontSize: 12, color: "var(--ink-30)", marginBottom: 8, textAlign: "center" }}>
          수업이 없습니다. 아래 버튼으로 수업/반을 추가해주세요.
        </div>
      )}
      {classes.map((cls, idx) => (
        <div key={cls.id || idx} className="lesson-item" style={{ position: "relative" }}>
          <div className="lesson-item-head">
            <div className="lesson-inst-label">수업 {idx + 1}</div>
            <button className="rm-btn" onClick={() => rmCls(idx)} type="button">×</button>
          </div>
          <div className="fg-row">
            <div className="fg" style={{ marginBottom: 8 }}>
              <label className="fg-label">반 이름</label>
              <input className="inp" value={cls.name || ""} onChange={e => updCls(idx, "name", e.target.value)} placeholder="예: 해금 초급반" />
            </div>
            <div className="fg" style={{ marginBottom: 8 }}>
              <label className="fg-label">악기/과목 <span className="req">*</span></label>
              <select className="sel" value={cls.instrument || ""} onChange={e => updCls(idx, "instrument", e.target.value)}>
                <option value="">선택</option>
                {allInsts.map(x => <option key={x.name} value={x.name}>{x.name} ({x.cat})</option>)}
              </select>
            </div>
          </div>
          <div className="fg" style={{ marginBottom: 8 }}>
            <label className="fg-label">담당 강사</label>
            <select className="sel" value={cls.teacherId || ""} onChange={e => updCls(idx, "teacherId", e.target.value)}>
              <option value="">강사 선택</option>
              {teachers.map(t => <option key={t.id} value={t.id}>{t.name}{t.instruments?.length ? ` (${t.instruments.join(", ")})` : ""}</option>)}
            </select>
          </div>
          <div className="fg-row">
            <div className="fg" style={{ marginBottom: 8 }}>
              <label className="fg-label">수강 인원</label>
              <input className="inp" inputMode="numeric" value={cls.participantCount || ""} onChange={e => updCls(idx, "participantCount", parseInt(e.target.value.replace(/[^\d]/g, "")) || 0)} placeholder="0" />
            </div>
            <div className="fg" style={{ marginBottom: 8 }}>
              <label className="fg-label">월 청구액</label>
              <div style={{ position: "relative" }}>
                <input className="inp" inputMode="numeric" value={cls.monthlyFee ? cls.monthlyFee.toLocaleString("ko-KR") : ""} onChange={e => updCls(idx, "monthlyFee", parseInt(e.target.value.replace(/[^\d]/g, "")) || 0)} style={{ paddingRight: 30 }} placeholder="0" />
                <span style={{ position: "absolute", right: 12, top: "50%", transform: "translateY(-50%)", fontSize: 13, color: "var(--ink-30)", pointerEvents: "none" }}>원</span>
              </div>
            </div>
          </div>
          <div style={{ fontSize: 10.5, color: "var(--ink-30)", fontWeight: 600, letterSpacing: .5, marginBottom: 4 }}>요일 · 시간</div>
          {(cls.schedule || []).map((sc, schIdx) => (
            <div key={schIdx} className="schedule-row">
              {DAYS.map(d => (<button key={d} type="button" className={`sch-day-btn ${sc.day === d ? "on" : ""}`} onClick={() => updSch(idx, schIdx, "day", sc.day === d ? "" : d)}>{d}</button>))}
              <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
                <span style={{ fontSize: 11, color: "var(--ink-30)", flexShrink: 0 }}>시간</span>
                <input className="time-inp" type="time" value={sc.time || ""} onChange={e => updSch(idx, schIdx, "time", e.target.value)} />
              </div>
              {(cls.schedule || []).length > 1 && <button className="rm-btn" onClick={() => rmSch(idx, schIdx)} type="button">×</button>}
            </div>
          ))}
          <button className="add-sch-btn" onClick={() => addSch(idx)} type="button">+ 요일/시간 추가</button>
        </div>
      ))}
      <button className="btn btn-secondary btn-sm" onClick={addCls} type="button" style={{ marginTop: 6 }}>+ 수업/반 추가</button>
    </div>
  );
}

export function InstitutionFormModal({ institution, teachers, categories, onClose, onSave }) {
  const [form, setForm] = useState(institution || {
    name: "", type: "school", address: "",
    contactName: "", contactPhone: "", contactEmail: "",
    bizNumber: "", teacherId: "",
    classes: [],
    contractStart: TODAY_STR, contractEnd: "",
    status: "active", notes: "", photo: ""
  });
  const [err, setErr] = useState("");
  const [confirming, setConfirming] = useState(false);
  const [saving, setSaving] = useState(false);
  const fileRef = useRef();
  const isEdit = !!institution;
  const set = (k, v) => { setForm(f => ({ ...f, [k]: v })); setErr(""); setConfirming(false); };
  const handlePhoto = async e => { const file = e.target.files?.[0]; if (!file) return; try { const c = await compressImage(file, 360, 0.75); set("photo", c); } catch (er) { console.error(er); } };
  const validate = () => {
    if (!form.name.trim()) { setErr("기관명을 입력하세요."); return false; }
    if (!form.classes || form.classes.length === 0) { setErr("수업/반을 하나 이상 추가해주세요."); return false; }
    for (const c of form.classes) {
      if (!c.instrument) { setErr("모든 수업의 악기/과목을 선택해주세요."); return false; }
    }
    if (form.contractStart && form.contractEnd && form.contractEnd < form.contractStart) { setErr("계약 종료일이 시작일보다 빠를 수 없습니다."); return false; }
    return true;
  };
  const handleSaveClick = () => { if (!validate()) return; setConfirming(true); };
  const handleConfirm = async () => {
    if (saving) return; setSaving(true);
    try {
      // class id 보장
      const classes = (form.classes || []).map(c => ({ ...c, id: c.id || uid() }));
      await onSave({ ...form, classes, createdAt: form.createdAt || Date.now() });
    } catch (e) { setErr("저장 중 오류가 발생했습니다."); setConfirming(false); }
    finally { setSaving(false); }
  };
  return (
    <div className="mb" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal">
        <div className="modal-h"><h2>{isEdit ? "기관 정보 수정" : "기관 등록"}</h2><button className="modal-close" onClick={onClose}>{IC.x}</button></div>
        <div className="modal-b">
          {err && <div className="form-err">⚠ {err}</div>}
          <div className="photo-area">
            <Av photo={form.photo} name={form.name || "기관"} size="av-lg" />
            <div>
              <button className="btn btn-secondary btn-sm" onClick={() => fileRef.current.click()}>로고 업로드</button>
              {form.photo && <button className="btn btn-ghost btn-sm" onClick={() => set("photo", "")}>삭제</button>}
              <div className="photo-hint">JPG, PNG 권장</div>
            </div>
            <input ref={fileRef} type="file" className="file-inp" accept="image/*" onChange={handlePhoto} />
          </div>
          <div className="fg"><label className="fg-label">기관명 <span className="req">*</span></label><input className="inp" value={form.name} onChange={e => set("name", e.target.value)} placeholder="예: ○○초등학교" /></div>
          <div className="fg-row">
            <div className="fg">
              <label className="fg-label">기관 유형</label>
              <select className="sel" value={form.type} onChange={e => set("type", e.target.value)}>
                {Object.entries(INST_TYPES).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
              </select>
            </div>
            <div className="fg">
              <label className="fg-label">상태</label>
              <select className="sel" value={form.status || "active"} onChange={e => set("status", e.target.value)}>
                <option value="active">진행중</option>
                <option value="paused">일시중단</option>
                <option value="expired">계약종료</option>
              </select>
            </div>
          </div>
          <div className="fg"><label className="fg-label">주소</label><input className="inp" value={form.address || ""} onChange={e => set("address", e.target.value)} placeholder="기관 주소" /></div>
          <div className="divider" />
          <div style={{ fontSize: 11, color: "var(--ink-30)", fontWeight: 600, letterSpacing: 1, marginBottom: 8 }}>담당자 정보</div>
          <div className="fg-row">
            <div className="fg"><label className="fg-label">담당자명</label><input className="inp" value={form.contactName || ""} onChange={e => set("contactName", e.target.value)} placeholder="담당자 이름" /></div>
            <div className="fg"><label className="fg-label">담당자 연락처</label><input className="inp" value={form.contactPhone || ""} onChange={e => set("contactPhone", fmtPhone(e.target.value))} placeholder="010-0000-0000" maxLength={13} /></div>
          </div>
          <div className="fg-row">
            <div className="fg"><label className="fg-label">담당자 이메일</label><input className="inp" type="email" value={form.contactEmail || ""} onChange={e => set("contactEmail", e.target.value)} placeholder="contact@example.com" /></div>
            <div className="fg"><label className="fg-label">사업자등록번호</label><input className="inp" value={form.bizNumber || ""} onChange={e => set("bizNumber", e.target.value)} placeholder="000-00-00000" /></div>
          </div>
          <div className="divider" />
          <div style={{ fontSize: 11, color: "var(--ink-30)", fontWeight: 600, letterSpacing: 1, marginBottom: 8 }}>계약 기간</div>
          <div className="fg-row">
            <div className="fg"><label className="fg-label">시작일</label><input className="inp" type="date" value={form.contractStart || ""} onChange={e => set("contractStart", e.target.value)} /></div>
            <div className="fg"><label className="fg-label">종료일</label><input className="inp" type="date" value={form.contractEnd || ""} onChange={e => set("contractEnd", e.target.value)} /></div>
          </div>
          <div className="divider" />
          <div className="fg"><InstClassEditor classes={form.classes || []} onChange={v => set("classes", v)} categories={categories} teachers={teachers} /></div>
          <div className="fg"><label className="fg-label">메모</label><textarea className="inp" value={form.notes || ""} onChange={e => set("notes", e.target.value)} placeholder="계약 특이사항, 차량/주차 정보 등" rows={3} /></div>
        </div>
        {confirming ? (
          <div className="confirm-bar">
            <div className="confirm-bar-msg"><strong>{form.name}</strong> 기관을 {isEdit ? "수정" : "등록"}하시겠습니까?</div>
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

function SettlementModal({ inst, teachers, attendance, payments, onClose }) {
  const [month, setMonth] = useState(THIS_MONTH);
  const [mYr, mMo] = month.split("-");
  const monthStr = `${mYr}년 ${parseInt(mMo)}월`;
  const todayStr = new Date().toLocaleDateString("ko-KR", { year: "numeric", month: "long", day: "numeric" });

  const classRows = (inst.classes || []).map(cls => {
    const memberId = `inst_${inst.id}_${cls.id}`;
    const clsAtt = attendance.filter(a => a.studentId === memberId && a.date?.startsWith(month));
    const present = clsAtt.filter(a => a.status === "present" || a.status === "late").length;
    const absent = clsAtt.filter(a => a.status === "absent").length;
    const clsPay = payments.find(p => p.studentId === memberId && p.month === month);
    const teacher = teachers.find(t => t.id === cls.teacherId);
    return { cls, present, absent, sessions: clsAtt.length, clsPay, teacher };
  });

  const totalFee = classRows.reduce((s, r) => s + (r.cls.monthlyFee || 0), 0);

  return (
    <div className="settlement-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="settlement-doc">
        <div className="settlement-controls">
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <span style={{ fontSize: 12, color: "var(--ink-60)" }}>정산 기간</span>
            <input type="month" className="inp" value={month} onChange={e => setMonth(e.target.value)} style={{ width: "auto", padding: "4px 10px" }} />
          </div>
          <div style={{ display: "flex", gap: 8 }}>
            <button className="btn btn-secondary btn-sm" onClick={onClose}>닫기</button>
            <button className="btn btn-primary btn-sm" onClick={() => window.print()}>🖨 인쇄 / PDF 저장</button>
          </div>
        </div>
        <div className="settlement-paper">
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 20 }}>
            <div>
              <div style={{ fontSize: 17, fontWeight: 700, fontFamily: "'Noto Serif KR',serif" }}>RYE-K K-Culture Center</div>
              <div style={{ fontSize: 11, color: "#888", marginTop: 2 }}>국악 교육 디렉토리 시스템</div>
            </div>
            <div style={{ textAlign: "right" }}>
              <div style={{ fontSize: 22, fontWeight: 700, fontFamily: "'Noto Serif KR',serif", letterSpacing: -0.5 }}>수강료 정산서</div>
              <div style={{ fontSize: 11, color: "#888", marginTop: 2 }}>발행일: {todayStr}</div>
            </div>
          </div>
          <div style={{ borderTop: "2px solid #1a1a1a", borderBottom: "1px solid #ccc", padding: "12px 0", marginBottom: 20 }}>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "6px 16px", fontSize: 12.5 }}>
              <div><span style={{ color: "#888" }}>수신: </span><strong>{inst.name}</strong></div>
              <div><span style={{ color: "#888" }}>정산 기간: </span><strong>{monthStr}</strong></div>
              {inst.contactName && <div><span style={{ color: "#888" }}>담당자: </span>{inst.contactName}{inst.contactPhone && ` · ${inst.contactPhone}`}</div>}
              {inst.bizNumber && <div><span style={{ color: "#888" }}>사업자번호: </span>{inst.bizNumber}</div>}
              {inst.address && <div style={{ gridColumn: "1 / -1" }}><span style={{ color: "#888" }}>주소: </span>{inst.address}</div>}
            </div>
          </div>
          <div style={{ fontWeight: 700, fontSize: 13, marginBottom: 8 }}>수업 내역</div>
          <table className="settlement-table">
            <thead>
              <tr>
                <th>반 이름</th>
                <th>과목</th>
                <th>담당강사</th>
                <th style={{ textAlign: "center" }}>수강인원</th>
                <th style={{ textAlign: "center" }}>출석현황</th>
                <th style={{ textAlign: "center" }}>납부</th>
                <th style={{ textAlign: "right" }}>청구금액</th>
              </tr>
            </thead>
            <tbody>
              {classRows.map(({ cls, present, absent, sessions, clsPay, teacher }) => (
                <tr key={cls.id}>
                  <td style={{ fontWeight: 500 }}>{cls.name || cls.instrument}</td>
                  <td style={{ color: "#555" }}>{cls.instrument}</td>
                  <td>{teacher?.name || "—"}</td>
                  <td style={{ textAlign: "center" }}>{cls.participantCount > 0 ? `${cls.participantCount}명` : "—"}</td>
                  <td style={{ textAlign: "center", fontSize: 11, color: "#555" }}>
                    {sessions > 0 ? `출석 ${present} / 결석 ${absent}` : "—"}
                  </td>
                  <td style={{ textAlign: "center" }}>
                    {clsPay?.paid ? <span style={{ color: "#22c55e", fontWeight: 600 }}>완료</span> : <span style={{ color: "#ef4444", fontWeight: 600 }}>미납</span>}
                  </td>
                  <td style={{ textAlign: "right", fontWeight: 600 }}>
                    {cls.monthlyFee > 0 ? fmtMoney(cls.monthlyFee) : "—"}
                  </td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr>
                <td colSpan={6} style={{ textAlign: "right", fontWeight: 700, paddingRight: 12 }}>합계 청구금액</td>
                <td style={{ textAlign: "right", fontWeight: 700 }}>{fmtMoney(totalFee)}</td>
              </tr>
            </tfoot>
          </table>
          {inst.notes && (
            <div style={{ marginTop: 16, padding: "10px 14px", background: "#f8f8f8", borderRadius: 6, fontSize: 12 }}>
              <div style={{ fontWeight: 600, marginBottom: 4, color: "#555" }}>특이사항</div>
              <div style={{ color: "#666", whiteSpace: "pre-wrap" }}>{inst.notes}</div>
            </div>
          )}
          <div style={{ marginTop: 24, paddingTop: 12, borderTop: "1px solid #ccc", fontSize: 11, color: "#888", textAlign: "right" }}>
            발신: RYE-K K-Culture Center 국악 교육 디렉토리 시스템
          </div>
        </div>
      </div>
    </div>
  );
}

export function InstitutionDetailModal({ institution: inst, teachers, currentUser, attendance, payments, onClose, onEdit, onDelete }) {
  const [showSettlement, setShowSettlement] = useState(false);
  const isTeacher = currentUser.role === "teacher";
  const daysLeft = getContractDaysLeft(inst);
  const totalParticipants = (inst.classes || []).reduce((s, c) => s + (c.participantCount || 0), 0);
  const totalMonthly = (inst.classes || []).reduce((s, c) => s + (c.monthlyFee || 0), 0);
  // 가상회원 ID 목록 → 출석/수납 통계
  const memberIds = (inst.classes || []).map(c => `inst_${inst.id}_${c.id}`);
  const instAtt = attendance.filter(a => memberIds.includes(a.studentId));
  const thisMonthPay = payments.filter(p => p.month === THIS_MONTH && memberIds.includes(p.studentId));
  const paidCount = thisMonthPay.filter(p => p.paid).length;
  return (
    <>
    <div className="mb" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal">
        <div className="modal-h">
          <h2>기관 정보</h2>
          <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
            {canManageAll(currentUser.role) && (inst.classes || []).length > 0 && (
              <button className="btn btn-secondary btn-sm" onClick={() => setShowSettlement(true)}>📄 정산서</button>
            )}
            <button className="modal-close" onClick={onClose}>{IC.x}</button>
          </div>
        </div>
        <div className="det-head">
          <Av photo={inst.photo} name={inst.name} size="av-lg" />
          <div style={{ flex: 1 }}>
            <div className="det-name">{inst.name}</div>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 4, marginTop: 4 }}>
              <span className="tag tag-gold">{instTypeLabel(inst.type)}</span>
              {inst.status === "active" && <span className="tag" style={{ background: "var(--green-lt)", color: "var(--green)" }}>진행중</span>}
              {inst.status === "paused" && <span className="tag" style={{ background: "var(--gold-lt)", color: "var(--gold-dk)" }}>일시중단</span>}
              {inst.status === "expired" && <span className="tag" style={{ background: "var(--ink-10)", color: "var(--ink-30)" }}>계약종료</span>}
              {daysLeft !== null && daysLeft >= 0 && daysLeft <= 30 && <span className="tag" style={{ background: "var(--red-lt)", color: "var(--red)" }}>D-{daysLeft} 만료</span>}
              {daysLeft !== null && daysLeft < 0 && <span className="tag" style={{ background: "var(--red-lt)", color: "var(--red)" }}>만료됨</span>}
            </div>
          </div>
        </div>
        <div className="modal-b">
          <div className="info-grid">
            <div className="ii"><div className="ii-label">담당자</div><div className="ii-val">{inst.contactName || "-"}</div></div>
            <div className="ii"><div className="ii-label">연락처</div><div className="ii-val">{inst.contactPhone || "-"}</div></div>
            <div className="ii"><div className="ii-label">이메일</div><div className="ii-val">{inst.contactEmail || "-"}</div></div>
            <div className="ii"><div className="ii-label">사업자번호</div><div className="ii-val">{inst.bizNumber || "-"}</div></div>
            <div className="ii"><div className="ii-label">계약 시작</div><div className="ii-val">{fmtDate(inst.contractStart)}</div></div>
            <div className="ii"><div className="ii-label">계약 종료</div><div className="ii-val">{fmtDate(inst.contractEnd)}</div></div>
            <div className="ii"><div className="ii-label">총 수강 인원</div><div className="ii-val">{totalParticipants}명</div></div>
            {!isTeacher && <div className="ii"><div className="ii-label">월 청구 합계</div><div className="ii-val">{fmtMoney(totalMonthly)}</div></div>}
          </div>
          {inst.address && <div style={{ padding: "0 20px 12px", fontSize: 12, color: "var(--ink-60)" }}>📍 {inst.address}</div>}
          <div style={{ padding: "0 20px" }}>
            <div className="section-label">수업/반 ({(inst.classes || []).length}개)</div>
            {(inst.classes || []).map((cls, i) => {
              const teacher = teachers.find(t => t.id === cls.teacherId);
              return (
                <div key={cls.id || i} style={{ background: "var(--paper)", border: "1px solid var(--border)", borderRadius: 10, padding: "10px 14px", marginBottom: 8 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
                    <span style={{ fontSize: 13, fontWeight: 600 }}>{cls.name || cls.instrument}</span>
                    <span className="tag tag-cat" style={{ fontSize: 10 }}>{cls.instrument}</span>
                    {teacher && <span style={{ fontSize: 11, color: "var(--gold-dk)" }}>{teacher.name}</span>}
                  </div>
                  <div style={{ fontSize: 11, color: "var(--ink-30)" }}>
                    {(cls.schedule || []).map(s => `${s.day || "-"}요일 ${s.time || ""}`).join(" · ")}
                    {cls.participantCount > 0 && ` · ${cls.participantCount}명`}
                    {!isTeacher && cls.monthlyFee > 0 && ` · ${fmtMoney(cls.monthlyFee)}`}
                  </div>
                </div>
              );
            })}
          </div>
          <div className="info-grid" style={{ marginTop: 8 }}>
            <div className="ii"><div className="ii-label">총 출석 기록</div><div className="ii-val">{instAtt.length}건</div></div>
            <div className="ii"><div className="ii-label">{monthLabel(THIS_MONTH)} 입금</div><div className="ii-val">{paidCount}/{(inst.classes || []).length}</div></div>
          </div>
          {inst.notes && <div style={{ padding: "8px 20px 12px" }}><div className="ii-label">메모</div><div style={{ fontSize: 12.5, color: "var(--ink-60)", whiteSpace: "pre-wrap" }}>{inst.notes}</div></div>}
        </div>
        <DeleteConfirmFooter label={`${inst.name}을(를)`} canDelete={canManageAll(currentUser.role)} onDelete={onDelete} onClose={onClose} onEdit={canManageAll(currentUser.role) ? onEdit : null} />
      </div>
    </div>
    {showSettlement && (
      <SettlementModal inst={inst} teachers={teachers} attendance={attendance} payments={payments} onClose={() => setShowSettlement(false)} />
    )}
    </>
  );
}

function InstitutionCard({ institution: inst, teachers, onClick }) {
  const teacher = teachers.find(t => t.id === inst.teacherId) || teachers.find(t => (inst.classes || []).some(c => c.teacherId === t.id));
  const daysLeft = getContractDaysLeft(inst);
  const totalParticipants = (inst.classes || []).reduce((s, c) => s + (c.participantCount || 0), 0);
  const classCount = (inst.classes || []).length;
  return (
    <div className="s-card" onClick={onClick}>
      <Av photo={inst.photo} name={inst.name} />
      <div className="s-card-info">
        <div className="s-name">{inst.name}<span style={{ fontSize: 10, color: "var(--ink-30)", fontWeight: 400, marginLeft: 6 }}>{instTypeLabel(inst.type)}</span></div>
        <div className="s-inst">{(inst.classes || []).map(c => c.instrument).filter(Boolean).join(" · ") || "수업 미등록"}</div>
        <div className="s-meta">
          <span className="tag" style={{ background: "var(--blue-lt)", color: "var(--blue)", padding: "1px 6px", fontSize: 10 }}>🏢 {classCount}개 반 · {totalParticipants}명</span>
          {teacher && <span style={{ color: "var(--gold-dk)", fontSize: 11, fontWeight: 500 }}>{teacher.name}</span>}
          {inst.status === "paused" && <span className="tag" style={{ background: "var(--gold-lt)", color: "var(--gold-dk)", padding: "1px 6px", fontSize: 10 }}>중단</span>}
          {inst.status === "expired" && <span className="tag" style={{ background: "var(--ink-10)", color: "var(--ink-30)", padding: "1px 6px", fontSize: 10 }}>종료</span>}
          {daysLeft !== null && daysLeft >= 0 && daysLeft <= 30 && inst.status === "active" && <span className="tag" style={{ background: "var(--red-lt)", color: "var(--red)", padding: "1px 6px", fontSize: 10 }}>D-{daysLeft}</span>}
          {daysLeft !== null && daysLeft < 0 && inst.status === "active" && <span className="tag" style={{ background: "var(--red-lt)", color: "var(--red)", padding: "1px 6px", fontSize: 10 }}>만료</span>}
        </div>
      </div>
    </div>
  );
}

export function InstitutionsView({ institutions, teachers, currentUser, onAdd, onSelect }) {
  const [statusFilter, setStatusFilter] = useState("active");
  const [search, setSearch] = useState("");
  // 강사: 본인이 어느 수업이라도 담당인 기관만
  const visible = canManageAll(currentUser.role)
    ? institutions
    : institutions.filter(inst => (inst.classes || []).some(c => c.teacherId === currentUser.id) || inst.teacherId === currentUser.id);
  const filtered = visible
    .filter(inst => statusFilter === "all" || (inst.status || "active") === statusFilter)
    .filter(inst => !search.trim() || inst.name.includes(search.trim()));
  const activeCount = visible.filter(i => (i.status || "active") === "active").length;
  const pausedCount = visible.filter(i => i.status === "paused").length;
  const expiredCount = visible.filter(i => i.status === "expired").length;
  return (
    <div>
      <div className="ph">
        <div><h1>기관 관리</h1><div className="ph-sub">진행중 {activeCount}곳{pausedCount > 0 && ` · 중단 ${pausedCount}`}{expiredCount > 0 && ` · 종료 ${expiredCount}`}</div></div>
      </div>
      <div className="srch-wrap">
        <span className="srch-icon">{IC.search}</span>
        <input className="srch-inp" placeholder="기관명 검색" value={search} onChange={e => setSearch(e.target.value)} />
      </div>
      <div style={{ display: "flex", gap: 6, marginBottom: 8 }}>
        {[{ k: "active", l: "진행중" }, { k: "paused", l: "중단" }, { k: "expired", l: "종료" }, { k: "all", l: "전체" }].map(x => (
          <button key={x.k} className={`ftab ${statusFilter === x.k ? "active" : ""}`} onClick={() => setStatusFilter(x.k)} style={{ borderRadius: 20, fontSize: 12, padding: "5px 12px" }}>{x.l}</button>
        ))}
      </div>
      {filtered.length === 0 ? (
        <div className="empty"><div className="empty-icon">🏢</div><div className="empty-txt">{search ? "검색 결과가 없습니다." : (canManageAll(currentUser.role) ? "등록된 기관이 없습니다." : "담당 기관이 없습니다.")}</div></div>
      ) : (
        <div className="s-grid">{filtered.map(inst => <InstitutionCard key={inst.id} institution={inst} teachers={teachers} onClick={() => onSelect(inst)} />)}</div>
      )}
      {canManageAll(currentUser.role) && <button className="fab" onClick={onAdd}>{IC.plus}</button>}
    </div>
  );
}
