import { useState } from "react";
import { IC, TODAY_STR } from "../../constants.jsx";
import { fmtDate, fmtDateTime, fmtMoney, fmtPhone, isMinor, calcAge, getBirthPassword, generateStudentCode } from "../../utils.js";
import { Av } from "../shared/CommonUI.jsx";
import { LessonEditor } from "../student/StudentManagement.jsx";

// ── ACTIVITY LOG ──────────────────────────────────────────────────────────────
export function ActivityView({ activity }) {
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

// ── PENDING REGISTRATIONS VIEW (매니저용) ─────────────────────────────────────
export function PendingView({ pending, teachers, categories, onApprove, onReject }) {
  const [editTarget, setEditTarget] = useState(null);
  const [editForm, setEditForm] = useState(null);
  const [smsModal, setSmsModal] = useState(null); // { name, code, phone, msg }

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
    // 사전에 회원코드 생성 → SMS에 포함
    const studentCode = generateStudentCode();
    onApprove({ ...editTarget, ...editForm, studentCode });
    setEditTarget(null);
    // SMS 안내 모달 준비
    const phone = (isMinor(editForm.birthDate) && editForm.guardianPhone) ? editForm.guardianPhone : editForm.phone;
    if (phone) {
      const pw = getBirthPassword(editForm.birthDate);
      const url = window.location.origin + "/myryk/?code=" + studentCode;
      const msg = `[My RYE-K 안내] ${editForm.name}님의 수강 등록이 완료되었습니다.\n회원코드: ${studentCode}\n비밀번호: ${pw} (생일 4자리 MMDD)\n포털 접속: ${url}`;
      setSmsModal({ name: editForm.name, code: studentCode, phone, msg });
    }
    setEditForm(null);
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

      {/* SMS 안내 발송 모달 */}
      {smsModal && (
        <div className="mb" onClick={e => e.target === e.currentTarget && setSmsModal(null)}>
          <div className="modal" style={{maxWidth:420}}>
            <div className="modal-h">
              <h2>📱 등록 안내 문자 발송</h2>
              <button className="modal-close" onClick={() => setSmsModal(null)}>{IC.x}</button>
            </div>
            <div className="modal-b" style={{paddingBottom:20}}>
              <div style={{background:"var(--green-lt)",border:"1px solid rgba(26,122,64,.15)",borderRadius:8,padding:"12px 14px",marginBottom:14,fontSize:13,color:"var(--green)",fontWeight:500}}>
                ✓ {smsModal.name}님 회원 등록 완료!
              </div>
              <div style={{fontSize:11.5,color:"var(--ink-60)",marginBottom:8}}>발신 번호: <strong style={{color:"var(--ink)",fontFamily:"monospace"}}>{smsModal.phone}</strong></div>
              <div style={{background:"var(--bg)",border:"1px solid var(--border)",borderRadius:8,padding:"12px 14px",fontSize:12.5,lineHeight:1.8,color:"var(--ink)",whiteSpace:"pre-wrap",marginBottom:14,fontFamily:"'Noto Sans KR',sans-serif"}}>
                {smsModal.msg}
              </div>
              <div style={{fontSize:11,color:"var(--ink-30)"}}>※ 문자 앱을 열면 내용이 자동 입력됩니다. (일부 기기에서 지원 안 될 수 있습니다)</div>
            </div>
            <div className="modal-f">
              <button className="btn btn-secondary" onClick={() => setSmsModal(null)}>건너뛰기</button>
              <button className="btn btn-primary" onClick={() => {
                const rawPhone = smsModal.phone.replace(/\D/g,"");
                window.location.href = `sms:${rawPhone}?body=${encodeURIComponent(smsModal.msg)}`;
                setSmsModal(null);
              }}>문자 앱 열기</button>
            </div>
          </div>
        </div>
      )}

      {editTarget && editForm && (
        <div className="mb" onClick={e => e.target === e.currentTarget && setEditTarget(null)}>
          <div className="modal">
            <div className="modal-h"><h2>회원 등록 확인</h2><button className="modal-close" onClick={() => setEditTarget(null)}>{IC.x}</button></div>
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
              <button className="btn btn-primary" onClick={confirmApprove} disabled={!editForm.name.trim() || !editForm.birthDate}>승인 · 회원 등록</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ── CATEGORIES VIEW ───────────────────────────────────────────────────────────
export function CategoriesView({ categories, onSave, feePresets, onSaveFees }) {
  const [cats, setCats] = useState(JSON.parse(JSON.stringify(categories)));
  const [fees, setFees] = useState({ ...(feePresets || {}) });
  const [newCat, setNewCat] = useState("");
  const [newInst, setNewInst] = useState({});
  const [dirty, setDirty] = useState(false);
  const [newRentalName, setNewRentalName] = useState("");
  const [newRentalFee, setNewRentalFee] = useState("");
  const addCat = () => { if (!newCat.trim() || cats[newCat.trim()]) return; setCats(c => ({ ...c, [newCat.trim()]: [] })); setNewCat(""); setDirty(true); };
  const rmCat = cat => { const next = { ...cats }; delete next[cat]; setCats(next); setDirty(true); };
  const addInst = cat => { const v = (newInst[cat] || "").trim(); if (!v || cats[cat].includes(v)) return; setCats(c => ({ ...c, [cat]: [...c[cat], v] })); setNewInst(x => ({ ...x, [cat]: "" })); setDirty(true); };
  const rmInst = (cat, inst) => { setCats(c => ({ ...c, [cat]: c[cat].filter(x => x !== inst) })); setDirty(true); };
  const addRental = () => { const name = newRentalName.trim(); if (!name) return; setFees(f => ({ ...f, ["rental:" + name]: parseInt(newRentalFee) || 0 })); setNewRentalName(""); setNewRentalFee(""); setDirty(true); };
  const rmRental = (key) => { setFees(f => { const next = { ...f }; delete next[key]; return next; }); setDirty(true); };
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
      {/* 악기 대여료 설정 */}
      <div className="card" style={{ marginBottom: 10, padding: 16 }}>
        <div style={{ fontFamily: "'Noto Serif KR',serif", fontSize: 14, fontWeight: 600, marginBottom: 12, display: "flex", alignItems: "center", gap: 6 }}>
          <span style={{ width: 3, height: 13, background: "linear-gradient(180deg,var(--gold),var(--gold-dk))", display: "inline-block", borderRadius: 2 }} />
          악기 대여료 설정
          <span style={{ fontSize: 11, fontWeight: 400, color: "var(--ink-30)", marginLeft: 4 }}>회원 등록 시 대여 종류 선택에 사용됩니다</span>
        </div>
        {Object.entries(fees).filter(([k]) => k.startsWith("rental:")).map(([key, fee]) => (
          <div key={key} style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 5 }}>
            <div style={{ flex: 1, background: "var(--gold-lt)", padding: "5px 10px", border: "1px solid rgba(245,168,0,.2)", borderRadius: 6, fontSize: 12.5, color: "var(--gold-dk)", fontWeight: 500 }}>
              {key.replace("rental:", "")}
            </div>
            <div style={{ position: "relative", width: 110, flexShrink: 0 }}>
              <input className="inp" inputMode="numeric" value={fee ? fee.toLocaleString("ko-KR") : ""}
                onChange={e => { setFees(f => ({ ...f, [key]: parseInt(e.target.value.replace(/[^\d]/g, "")) || 0 })); setDirty(true); }}
                placeholder="대여료" style={{ fontSize: 11, padding: "5px 22px 5px 7px" }} />
              <span style={{ position: "absolute", right: 6, top: "50%", transform: "translateY(-50%)", fontSize: 10, color: "var(--ink-30)", pointerEvents: "none" }}>원/월</span>
            </div>
            <button style={{ background: "none", border: "none", color: "var(--ink-30)", cursor: "pointer", fontSize: 16, padding: "0 4px", lineHeight: 1 }} onClick={() => rmRental(key)}>×</button>
          </div>
        ))}
        <div style={{ display: "flex", gap: 6, marginTop: 8 }}>
          <input className="inp" style={{ flex: 2 }} value={newRentalName} onChange={e => setNewRentalName(e.target.value)} placeholder="종류명 (예: 해금-입문용)" onKeyDown={e => e.key === "Enter" && addRental()} />
          <div style={{ position: "relative", flex: 1 }}>
            <input className="inp" inputMode="numeric" value={newRentalFee} onChange={e => setNewRentalFee(e.target.value.replace(/[^\d]/g, ""))} placeholder="대여료" style={{ paddingRight: 24 }} onKeyDown={e => e.key === "Enter" && addRental()} />
            <span style={{ position: "absolute", right: 6, top: "50%", transform: "translateY(-50%)", fontSize: 10, color: "var(--ink-30)", pointerEvents: "none" }}>원</span>
          </div>
          <button className="btn btn-gold btn-sm" onClick={addRental}>추가</button>
        </div>
      </div>

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

// ── TRASH VIEW (휴지통 — 7일 백업) ───────────────────────────────────────────
export function TrashView({ trash, onRestore, onPermanentDelete }) {
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
                  {item.type === "student" ? "회원" : "강사/매니저"} · 삭제: {fmtDateTime(item.deletedAt)}
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
