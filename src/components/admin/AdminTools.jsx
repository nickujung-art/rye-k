import { useState } from "react";
import { IC, TODAY_STR } from "../../constants.jsx";
import { fmtDate, fmtDateTime, fmtMoney, fmtPhone, isMinor, calcAge, getBirthPassword, generateStudentCode } from "../../utils.js";
import { Av } from "../shared/CommonUI.jsx";
import { LessonEditor } from "../student/StudentManagement.jsx";

// ── ACTIVITY LOG ──────────────────────────────────────────────────────────────
export function ActivityView({ activity, onFullBackup }) {
  const [searchQuery, setSearchQuery] = useState("");
  const sq = searchQuery.trim();
  const filtered = sq
    ? activity.filter(a => a.userName?.includes(sq) || a.action?.includes(sq))
    : activity;
  return (
    <div>
      <div className="ph">
        <div><h1>활동 기록</h1><div className="ph-sub">최근 {filtered.length}건</div></div>
        {onFullBackup && <button className="btn btn-secondary btn-sm" onClick={onFullBackup}>💾 전체 백업 다운로드</button>}
      </div>
      <div className="srch-wrap" style={{marginBottom:10}}>
        <span className="srch-icon">{IC.search}</span>
        <input className="srch-inp" placeholder="이름 또는 내용 검색" value={searchQuery} onChange={e => setSearchQuery(e.target.value)} />
        {sq && <button className="srch-clr" onClick={() => setSearchQuery("")}>{IC.x}</button>}
      </div>
      {filtered.length === 0 ? (
        <div className="empty"><div className="empty-icon">◷</div><div className="empty-txt">{sq ? "검색 결과가 없습니다." : "활동 기록이 없습니다."}</div></div>
      ) : (
        <div className="card" style={{padding:16}}>
          {filtered.slice(0, 100).map(a => (
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
  // 인플레이스 에디팅 상태
  const [editingCat, setEditingCat] = useState(null);
  const [editingCatVal, setEditingCatVal] = useState("");
  const [editingInst, setEditingInst] = useState(null); // {cat, inst}
  const [editingInstVal, setEditingInstVal] = useState("");
  const [editingRental, setEditingRental] = useState(null); // rental key
  const [editingRentalVal, setEditingRentalVal] = useState("");
  const [savedFlash, setSavedFlash] = useState("");
  const [errMsg, setErrMsg] = useState("");
  const showErr = (msg) => { setErrMsg(msg); setTimeout(() => setErrMsg(""), 2500); };

  const flashSaved = (msg = "저장됨 ✓") => { setSavedFlash(msg); setTimeout(() => setSavedFlash(""), 1800); };

  // ── 기본 CRUD ────────────────────────────────────────────────────────────────
  const addCat = () => {
    const v = newCat.trim();
    if (!v) return;
    if (cats[v]) { showErr("이미 존재하는 카테고리명입니다."); return; }
    setCats(c => ({ ...c, [v]: [] })); setNewCat(""); setDirty(true);
  };
  const rmCat = cat => { const next = { ...cats }; delete next[cat]; setCats(next); setDirty(true); };
  const addInst = cat => {
    const v = (newInst[cat] || "").trim();
    if (!v) return;
    if (cats[cat].includes(v)) { showErr("이미 존재하는 과목명입니다."); return; }
    setCats(c => ({ ...c, [cat]: [...c[cat], v] })); setNewInst(x => ({ ...x, [cat]: "" })); setDirty(true);
  };
  const rmInst = (cat, inst) => { setCats(c => ({ ...c, [cat]: c[cat].filter(x => x !== inst) })); setDirty(true); };
  const addRental = () => {
    const name = newRentalName.trim();
    if (!name) return;
    const key = "rental:" + name;
    if (fees[key] !== undefined) { showErr("이미 존재하는 악기명입니다."); return; }
    const next = { ...fees, [key]: parseInt(newRentalFee) || 0 };
    setFees(next); setNewRentalName(""); setNewRentalFee(""); setDirty(true);
    onSaveFees(next); flashSaved("악기 추가됨 ✓");
  };
  const rmRental = key => {
    const next = { ...fees }; delete next[key];
    setFees(next); setDirty(true);
    onSaveFees(next); flashSaved("악기 삭제됨 ✓");
  };

  // ── 카테고리명 인플레이스 수정 ───────────────────────────────────────────────
  const confirmEditCat = oldCat => {
    const trimmed = editingCatVal.trim();
    if (!trimmed) { setEditingCat(null); return; }
    if (trimmed !== oldCat && cats[trimmed]) { showErr("이미 존재하는 카테고리명입니다."); return; }
    if (trimmed !== oldCat) {
      const next = {};
      Object.entries(cats).forEach(([k, v]) => { next[k === oldCat ? trimmed : k] = v; });
      setCats(next); setDirty(true);
    }
    setEditingCat(null);
  };

  // ── 과목명 인플레이스 수정 (연동 프리셋 키도 갱신) ───────────────────────────
  const confirmEditInst = () => {
    if (!editingInst) return;
    const { cat, inst: oldInst } = editingInst;
    const trimmed = editingInstVal.trim();
    if (!trimmed) { setEditingInst(null); return; }
    if (trimmed !== oldInst && cats[cat].includes(trimmed)) { showErr("이미 존재하는 과목명입니다."); return; }
    if (trimmed !== oldInst) {
      setCats(c => ({ ...c, [cat]: c[cat].map(x => x === oldInst ? trimmed : x) }));
      setFees(f => {
        if (f[oldInst] === undefined) return f;
        const next = { ...f, [trimmed]: f[oldInst] };
        delete next[oldInst];
        return next;
      });
      setDirty(true);
    }
    setEditingInst(null);
  };

  // ── 악기 대여명 인플레이스 수정 (즉시 Firestore 저장) ────────────────────────
  const confirmEditRental = oldKey => {
    const trimmed = editingRentalVal.trim();
    if (!trimmed) { setEditingRental(null); return; }
    const newKey = "rental:" + trimmed;
    if (newKey === oldKey) { setEditingRental(null); return; }
    if (fees[newKey] !== undefined) { showErr("이미 존재하는 악기명입니다."); return; }
    setFees(f => {
      const next = { ...f, [newKey]: f[oldKey] };
      delete next[oldKey];
      onSaveFees(next);
      return next;
    });
    setEditingRental(null);
    flashSaved("악기명 저장됨 ✓");
  };

  const handleSaveAll = () => { onSave(cats); onSaveFees(fees); setDirty(false); flashSaved("전체 저장 완료 ✓"); };

  // 공통 인플레이스 확인/취소 버튼
  const EditConfirmBtns = ({ onConfirm, onCancel }) => (
    <>
      <button onClick={onConfirm} style={{background:"var(--green)",border:"none",borderRadius:5,color:"#fff",fontSize:12,padding:"3px 10px",cursor:"pointer",flexShrink:0,fontFamily:"inherit"}}>✓</button>
      <button onClick={onCancel}  style={{background:"none",border:"1px solid var(--border)",borderRadius:5,color:"var(--ink-30)",fontSize:12,padding:"3px 8px",cursor:"pointer",fontFamily:"inherit"}}>×</button>
    </>
  );

  return (
    <div>
      <div className="ph">
        <div><h1>과목 관리</h1><div className="ph-sub">관리자 전용</div></div>
        <div style={{display:"flex",alignItems:"center",gap:10}}>
          {savedFlash && <span style={{fontSize:12,color:"var(--green)",fontWeight:600}}>{savedFlash}</span>}
          {dirty && <button className="btn btn-primary btn-sm" onClick={handleSaveAll}>저장</button>}
        </div>
      </div>
      {errMsg && <div style={{margin:"0 0 10px",padding:"10px 14px",background:"var(--red-lt)",border:"1px solid rgba(232,40,28,.2)",borderRadius:8,fontSize:13,color:"var(--red)",fontWeight:500}}>⚠ {errMsg}</div>}

      {/* ── 카테고리 목록 (가나다순) ── */}
      {Object.entries(cats).sort(([a],[b]) => a.localeCompare(b,"ko")).map(([cat, insts]) => (
        <div key={cat} className="card" style={{ marginBottom: 10, padding: 16 }}>
          {/* 카테고리 헤더 */}
          <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom: 10 }}>
            <div style={{ display:"flex", alignItems:"center", gap:6, flex:1 }}>
              <span style={{ width:3, height:13, background:"linear-gradient(180deg,var(--blue),var(--gold))", display:"inline-block", borderRadius:2 }} />
              {editingCat === cat ? (
                <div style={{display:"flex",alignItems:"center",gap:6,flex:1}}>
                  <input className="inp" style={{flex:1,fontSize:13,padding:"4px 8px"}} value={editingCatVal}
                    onChange={e=>setEditingCatVal(e.target.value)}
                    onKeyDown={e=>{if(e.key==="Enter")confirmEditCat(cat);if(e.key==="Escape")setEditingCat(null);}}
                    autoFocus />
                  <EditConfirmBtns onConfirm={()=>confirmEditCat(cat)} onCancel={()=>setEditingCat(null)} />
                </div>
              ) : (
                <>
                  <span onClick={()=>{setEditingCat(cat);setEditingCatVal(cat);}}
                    title="클릭하여 카테고리명 수정"
                    style={{fontFamily:"'Noto Serif KR',serif",fontSize:14,fontWeight:600,cursor:"pointer",borderBottom:"1px dashed transparent",transition:"border-color .15s"}}
                    onMouseEnter={e=>e.target.style.borderBottomColor="var(--border)"}
                    onMouseLeave={e=>e.target.style.borderBottomColor="transparent"}>
                    {cat}
                  </span>
                  <span className="cat-count">{insts.length}</span>
                </>
              )}
            </div>
            {editingCat !== cat && <button className="btn btn-danger btn-xs" onClick={() => rmCat(cat)}>삭제</button>}
          </div>

          {/* 과목 리스트 (가나다순) */}
          {[...insts].sort((a,b)=>a.localeCompare(b,"ko")).map(inst => {
            const isEditingThis = editingInst?.cat === cat && editingInst?.inst === inst;
            return (
              <div key={inst} style={{ display:"flex", alignItems:"center", gap:6, marginBottom:5 }}>
                <div style={{ display:"flex", alignItems:"center", gap:4, background:"var(--blue-lt)", padding:"5px 10px", border:"1px solid rgba(43,58,159,.15)", borderRadius:6, flex:1 }}>
                  {isEditingThis ? (
                    <div style={{display:"flex",alignItems:"center",gap:4,flex:1}}>
                      <input className="inp" style={{flex:1,fontSize:13,padding:"2px 6px"}} value={editingInstVal}
                        onChange={e=>setEditingInstVal(e.target.value)}
                        onKeyDown={e=>{if(e.key==="Enter")confirmEditInst();if(e.key==="Escape")setEditingInst(null);}}
                        autoFocus />
                      <EditConfirmBtns onConfirm={confirmEditInst} onCancel={()=>setEditingInst(null)} />
                    </div>
                  ) : (
                    <>
                      <span onClick={()=>{setEditingInst({cat,inst});setEditingInstVal(inst);}} title="클릭하여 과목명 수정"
                        style={{ fontSize:12.5, color:"var(--blue)", fontWeight:500, flex:1, cursor:"pointer" }}>
                        {inst}
                      </span>
                      <button style={{ background:"none", border:"none", color:"var(--ink-30)", cursor:"pointer", fontSize:14, lineHeight:1, padding:"0 2px" }} onClick={() => rmInst(cat, inst)}>×</button>
                    </>
                  )}
                </div>
                {/* 기본 수강료 */}
                <div style={{position:"relative",width:105,flexShrink:0}}>
                  <input className="inp" inputMode="numeric"
                    value={fees[inst] ? fees[inst].toLocaleString("ko-KR") : ""}
                    onChange={e => { setFees(f => ({...f, [inst]: parseInt(e.target.value.replace(/[^\d]/g,"")) || 0})); setDirty(true); }}
                    placeholder="기본료" style={{fontSize:11,padding:"5px 22px 5px 7px"}} />
                  <span style={{position:"absolute",right:6,top:"50%",transform:"translateY(-50%)",fontSize:10,color:"var(--ink-30)",pointerEvents:"none"}}>원</span>
                </div>
              </div>
            );
          })}

          <div style={{ display:"flex", gap:8 }}>
            <input className="inp" style={{ flex:1 }} value={newInst[cat] || ""} onChange={e => setNewInst(x => ({ ...x, [cat]: e.target.value }))} placeholder="새 과목명" onKeyDown={e => e.key === "Enter" && addInst(cat)} />
            <button className="btn btn-green btn-sm" onClick={() => addInst(cat)}>추가</button>
          </div>
        </div>
      ))}

      {/* ── 악기 대여료 설정 (가나다순, 인플레이스+즉시저장) ── */}
      <div className="card" style={{ marginBottom: 10, padding: 16 }}>
        <div style={{ fontFamily:"'Noto Serif KR',serif", fontSize:14, fontWeight:600, marginBottom:12, display:"flex", alignItems:"center", gap:6 }}>
          <span style={{ width:3, height:13, background:"linear-gradient(180deg,var(--gold),var(--gold-dk))", display:"inline-block", borderRadius:2 }} />
          악기 대여료 설정
        </div>

        {Object.entries(fees).filter(([k]) => k.startsWith("rental:")).sort(([a],[b])=>a.localeCompare(b,"ko")).map(([key, fee]) => (
          <div key={key} style={{ display:"flex", alignItems:"center", gap:6, marginBottom:6 }}>
            {/* 악기명 (인플레이스 수정, 즉시 저장) */}
            {editingRental === key ? (
              <div style={{flex:1,display:"flex",alignItems:"center",gap:6}}>
                <input className="inp" style={{flex:1,fontSize:13,padding:"5px 8px"}} value={editingRentalVal}
                  onChange={e=>setEditingRentalVal(e.target.value)}
                  onKeyDown={e=>{if(e.key==="Enter")confirmEditRental(key);if(e.key==="Escape")setEditingRental(null);}}
                  autoFocus />
                <EditConfirmBtns onConfirm={()=>confirmEditRental(key)} onCancel={()=>setEditingRental(null)} />
              </div>
            ) : (
              <div onClick={()=>{setEditingRental(key);setEditingRentalVal(key.replace("rental:",""));}}
                title="클릭하여 악기명 수정"
                style={{ flex:1, background:"var(--gold-lt)", padding:"6px 10px", border:"1px solid rgba(245,168,0,.25)", borderRadius:6, fontSize:12.5, color:"var(--gold-dk)", fontWeight:500, cursor:"pointer", display:"flex", alignItems:"center", justifyContent:"space-between" }}>
                <span>{key.replace("rental:", "")}</span>
                <span style={{fontSize:11,color:"var(--ink-30)",fontWeight:400}}>✎</span>
              </div>
            )}
            {/* 대여료 (blur 시 즉시 Firestore 저장) */}
            <div style={{ position:"relative", width:110, flexShrink:0 }}>
              <input className="inp" inputMode="numeric"
                value={fee ? fee.toLocaleString("ko-KR") : ""}
                onChange={e => { const v = parseInt(e.target.value.replace(/[^\d]/g,"")) || 0; setFees(f => ({ ...f, [key]: v })); setDirty(true); }}
                onBlur={e => {
                  const v = parseInt(e.target.value.replace(/[^\d]/g,"")) || 0;
                  const next = { ...fees, [key]: v };
                  setFees(next);
                  onSaveFees(next);
                  flashSaved("대여료 저장됨 ✓");
                }}
                placeholder="대여료" style={{ fontSize:11, padding:"5px 22px 5px 7px" }} />
              <span style={{ position:"absolute", right:6, top:"50%", transform:"translateY(-50%)", fontSize:10, color:"var(--ink-30)", pointerEvents:"none" }}>원/월</span>
            </div>
            <button style={{ background:"none", border:"none", color:"var(--ink-30)", cursor:"pointer", fontSize:16, padding:"0 4px", lineHeight:1 }} onClick={() => rmRental(key)}>×</button>
          </div>
        ))}

        <div style={{ display:"flex", gap:6, marginTop:8 }}>
          <input className="inp" style={{ flex:2 }} value={newRentalName} onChange={e => setNewRentalName(e.target.value)} placeholder="종류명 (예: 해금-입문용)" onKeyDown={e => e.key === "Enter" && addRental()} />
          <div style={{ position:"relative", flex:1 }}>
            <input className="inp" inputMode="numeric" value={newRentalFee} onChange={e => setNewRentalFee(e.target.value.replace(/[^\d]/g,""))} placeholder="대여료" style={{ paddingRight:24 }} onKeyDown={e => e.key === "Enter" && addRental()} />
            <span style={{ position:"absolute", right:6, top:"50%", transform:"translateY(-50%)", fontSize:10, color:"var(--ink-30)", pointerEvents:"none" }}>원</span>
          </div>
          <button className="btn btn-gold btn-sm" onClick={addRental}>추가</button>
        </div>
      </div>

      {/* ── 새 카테고리 ── */}
      <div className="card" style={{ padding:16, borderStyle:"dashed" }}>
        <div style={{ fontFamily:"'Noto Serif KR',serif", fontSize:13, fontWeight:600, marginBottom:10 }}>새 카테고리</div>
        <div style={{ display:"flex", gap:8 }}>
          <input className="inp" style={{ flex:1 }} value={newCat} onChange={e => setNewCat(e.target.value)} placeholder="카테고리 이름" onKeyDown={e => e.key === "Enter" && addCat()} />
          <button className="btn btn-primary btn-sm" onClick={addCat}>추가</button>
        </div>
      </div>
    </div>
  );
}

// ── AI SETTINGS VIEW ─────────────────────────────────────────────────────────
export function AiSettingsView({ settings, onSave }) {
  const s = settings || {};
  const toggle = (key) => onSave({ ...s, [key]: !s[key] });
  const Row = ({ label, desc, value, onToggle }) => (
    <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",padding:"14px 0",borderBottom:"1px solid var(--border)"}}>
      <div style={{flex:1,minWidth:0,paddingRight:16}}>
        <div style={{fontWeight:600,fontSize:14}}>{label}</div>
        <div style={{fontSize:12,color:"var(--ink-30)",marginTop:3,lineHeight:1.5}}>{desc}</div>
      </div>
      <div onClick={onToggle} style={{width:44,height:24,borderRadius:12,background:value?"var(--blue)":"var(--border)",position:"relative",cursor:"pointer",transition:"background .2s",flexShrink:0,marginTop:2}}>
        <div style={{width:18,height:18,borderRadius:"50%",background:"#fff",position:"absolute",top:3,left:value?23:3,transition:"left .2s",boxShadow:"0 1px 3px rgba(0,0,0,.2)"}} />
      </div>
    </div>
  );
  return (
    <div>
      <div className="ph"><div><h1>AI 설정</h1><div className="ph-sub">AI 보조 기능 운영 설정</div></div></div>
      <div className="card" style={{padding:20,marginBottom:16}}>
        <Row
          label="AI 기능 사용"
          desc="레슨노트 다듬기, 연습 가이드, 댓글 답장, 월간 리포트, 수납 톤 다듬기 기능을 켜고 끕니다."
          value={s.aiEnabled !== false}
          onToggle={() => toggle("aiEnabled")}
        />
        <Row
          label="AI 안전 모드 (학생 이름 익명화)"
          desc="켜면 Anthropic AI에 전달되는 텍스트에서 학생 이름을 익명으로 치환합니다. AI 응답에는 실제 이름이 복원됩니다."
          value={!!s.aiSafeMode}
          onToggle={() => toggle("aiSafeMode")}
        />
      </div>
      <div className="card" style={{padding:"14px 20px",background:"var(--blue-lt)",border:"1px solid rgba(43,58,159,.12)"}}>
        <div style={{fontWeight:600,fontSize:13,marginBottom:6}}>🔒 데이터 보호 정책</div>
        <div style={{fontSize:12,color:"var(--ink-60)",lineHeight:1.7}}>
          연락처·주소·이메일 등 개인 식별 정보는 AI에 절대 전송되지 않습니다.<br />
          AI에 전달되는 데이터: 학생 이름(안전 모드 OFF), 악기명, 레슨노트 내용, 출석 통계.<br />
          AI 응답은 강사가 확인 후 직접 저장해야 DB에 반영됩니다.
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
                  {item.type === "student" ? "회원" : item.type === "institution" ? "기관" : "강사/매니저"} · 삭제: {fmtDateTime(item.deletedAt)}
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
