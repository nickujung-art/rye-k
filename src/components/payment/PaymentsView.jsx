import { useState } from "react";
import { PAY_METHODS, IC, TODAY_STR, THIS_MONTH } from "../../constants.jsx";
import { canManageAll, monthLabel, fmtMoney, fmtDateShort, fmtDate, calcAge, isMinor, instTypeLabel, uid, sendAligoMessage } from "../../utils.js";
import { Av } from "../shared/CommonUI.jsx";
import AlimtalkModal from "../shared/AlimtalkModal.jsx";
import { ChargeRequestModal } from "../student/StudentManagement.jsx";

export default function PaymentsView({ students, teachers, currentUser, payments, onSavePayments, onLog, attendance = [], onSaveStudents }) {
  const [month, setMonth] = useState(THIS_MONTH);
  const [editingId, setEditingId] = useState(null);
  const [editForm, setEditForm] = useState({});
  const [filterTeacher, setFilterTeacher] = useState(currentUser.role === "teacher" ? currentUser.id : "all");
  const [filterUnpaid, setFilterUnpaid] = useState(false);
  const [previewStudent, setPreviewStudent] = useState(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [acctToast, setAcctToast] = useState(false);
  const [requestsModal, setRequestsModal] = useState(false);
  const [approvingId, setApprovingId] = useState(null);
  const [alimtalkModal, setAlimtalkModal] = useState(null); // null | "monthly_fee" | "unpaid_reminder"
  const [payChargeStudent, setPayChargeStudent] = useState(null);
  const [quickPayingId, setQuickPayingId] = useState(null);
  const [bulkPrepModal, setBulkPrepModal] = useState(false);
  const [bulkPrepData, setBulkPrepData] = useState({});
  const [bulkSaving, setBulkSaving] = useState(false);

  const pendingRequestStudents = students.filter(s => (s.pendingOneTimeCharges||[]).length > 0);

  const ACCT_MSG = "[RYE-K K-Culture Center]\n수강생 여러분의 깊은 관심에 항상 감사드립니다.\n원활한 수업 진행을 위해 수강료 납부 계좌를 안내드리오니 확인 부탁드립니다.\n\n- 카카오뱅크 3333-34-5220544 (예금주: 예케이케이컬처센터)\n\n늘 정성을 다하는 교육으로 보답하겠습니다.";
  const copyAcct = async () => {
    try { await navigator.clipboard.writeText(ACCT_MSG); } catch { const ta = document.createElement("textarea"); ta.value = ACCT_MSG; document.body.appendChild(ta); ta.select(); document.execCommand("copy"); document.body.removeChild(ta); }
    setAcctToast(true); setTimeout(() => setAcctToast(false), 2500);
  };
  const isTeacher = currentUser.role === "teacher";

  const visibleStudents = (filterTeacher === "all" ? students : students.filter(s => s.teacherId === filterTeacher || (s.lessons||[]).some(l=>l.teacherId===filterTeacher)))
    .filter(s => (s.status || "active") === "active")
    .filter(s => !searchQuery.trim() || s.name.includes(searchQuery.trim()))
    .filter(s => !filterUnpaid || !getPayment(s.id)?.paid);

  function getPayment(studentId) { return payments.find(p => p.studentId === studentId && p.month === month); }

  const autoFee = (s) => (s.monthlyFee || 0) + (s.instrumentRental ? (s.rentalFee || 0) : 0);

  const totalDue = visibleStudents.reduce((sum, s) => {
    const p = getPayment(s.id);
    return sum + (p?.amount ?? autoFee(s));
  }, 0);
  const totalPaid = visibleStudents.reduce((sum, s) => { const p = getPayment(s.id); return sum + (p?.paid ? (p.paidAmount || p.amount) : 0); }, 0);
  const unpaidCount = visibleStudents.filter(s => { const p = getPayment(s.id); return !p?.paid; }).length;
  const paidCount = visibleStudents.length - unpaidCount;
  const paidRate = visibleStudents.length > 0 ? Math.round(paidCount / visibleStudents.length * 100) : 0;

  const exportCSV = () => {
    const header = "회원명,수강료,납부여부,입금액,입금일,입금방법,메모\n";
    const rows = visibleStudents.map(s => {
      const p = getPayment(s.id);
      const amt = p?.amount ?? autoFee(s);
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
    const base = autoFee(s);
    setEditForm({
      studentId: s.id,
      amount: p?.amount ?? base,
      paid: p?.paid ?? false,
      paidAmount: p?.paidAmount ?? p?.amount ?? base,
      paidDate: p?.paidDate ?? TODAY_STR,
      method: p?.method ?? "transfer",
      note: p?.note ?? "",
      extraCharges: p?.extraCharges ?? [],
      newChargeTitle: "",
      newChargeAmount: "",
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
      extraCharges: editForm.extraCharges || [],
      createdAt: existing?.createdAt || Date.now(),
      updatedAt: Date.now(),
    };
    const upd = existing ? payments.map(p => p.id === existing.id ? record : p) : [...payments, record];
    try {
      await onSavePayments(upd);
      const sName = visibleStudents.find(s => s.id === editForm.studentId)?.name;
      if (editForm.paid && !existing?.paid) onLog(`${sName} 회원 ${monthLabel(month)} 수강료 입금 확인`);
      setEditingId(null);
    } catch {}
  };

  const prevMonth = () => { const d = new Date(month + "-01"); d.setMonth(d.getMonth() - 1); setMonth(d.toISOString().slice(0,7)); };
  const nextMonth = () => { const d = new Date(month + "-01"); d.setMonth(d.getMonth() + 1); setMonth(d.toISOString().slice(0,7)); };
  // prevMonthStr: 현재 선택된 month 기준 전달. 테스트 방법 — month 드롭다운을 다음 달로 변경하면 이번 달 결석 카운트 확인 가능.
  const prevMonthStr = (() => { const d = new Date(month + "-01"); d.setMonth(d.getMonth() - 1); return d.toISOString().slice(0, 7); })();

  // ── 수강료 일괄 확정 ────────────────────────────────────────────────────────
  const setBulkField = (sid, key, val) =>
    setBulkPrepData(d => ({...d, [sid]: {...(d[sid]||{}), [key]: val}}));

  const addBulkExtra = (sid) => {
    setBulkPrepData(d => {
      const item = d[sid] || {};
      const title = (item.newTitle || "").trim();
      const amt = parseInt(item.newAmt || "0") || 0;
      if (!title) return d;
      return {...d, [sid]: {...item, extras:[...(item.extras||[]), {title, amount:amt}], amount:(item.amount||0)+amt, newTitle:"", newAmt:""}};
    });
  };

  const removeBulkExtra = (sid, idx) => {
    setBulkPrepData(d => {
      const item = d[sid] || {};
      const removed = (item.extras||[])[idx];
      const extras = (item.extras||[]).filter((_,i)=>i!==idx);
      return {...d, [sid]: {...item, extras, amount: Math.max(0, (item.amount||0)-(removed?.amount||0))}};
    });
  };

  const openBulkPrep = () => {
    const allActive = students.filter(s => (s.status||"active")==="active" && !s.isInstitution);
    const data = {};
    allActive.forEach(s => {
      const p = payments.find(py => py.studentId === s.id && py.month === month);
      data[s.id] = {
        amount: p?.amount ?? autoFee(s),
        extras: [...(p?.extraCharges || [])],
        newTitle: "",
        newAmt: "",
      };
    });
    setBulkPrepData(data);
    setBulkPrepModal(true);
  };

  const confirmBulkPrep = async () => {
    setBulkSaving(true);
    try {
      const allActive = students.filter(s => (s.status||"active")==="active" && !s.isInstitution);
      let updated = [...payments];
      for (const s of allActive) {
        const d = bulkPrepData[s.id];
        if (!d) continue;
        const existing = updated.find(p => p.studentId === s.id && p.month === month);
        const record = {
          ...(existing || {}),
          id: existing?.id || uid(),
          studentId: s.id,
          month,
          amount: d.amount,
          extraCharges: d.extras,
          paid: existing?.paid ?? false,
          paidAmount: existing?.paidAmount ?? 0,
          paidDate: existing?.paidDate ?? "",
          method: existing?.method ?? "",
          note: existing?.note ?? "",
          createdAt: existing?.createdAt || Date.now(),
          updatedAt: Date.now(),
        };
        updated = existing
          ? updated.map(p => p.id === existing.id ? record : p)
          : [...updated, record];
      }
      await onSavePayments(updated);
      setBulkPrepModal(false);
    } catch {} finally { setBulkSaving(false); }
  };

  return (
    <div>
      {/* ── 계좌 안내 배너 ── */}
      <div onClick={copyAcct} style={{display:"flex",alignItems:"center",gap:10,background:"#EEF2FF",border:"1px solid #C7D2FE",borderRadius:10,padding:"10px 14px",marginBottom:12,cursor:"pointer",transition:"background .15s",userSelect:"none"}} onMouseEnter={e=>e.currentTarget.style.background="#E0E7FF"} onMouseLeave={e=>e.currentTarget.style.background="#EEF2FF"}>
        <span style={{fontSize:18,flexShrink:0}}>🏦</span>
        <div style={{flex:1,minWidth:0}}>
          <div style={{fontSize:12,fontWeight:600,color:"#3730A3"}}>카카오뱅크 3333-34-5220544</div>
          <div style={{fontSize:11,color:"#6366F1",marginTop:1}}>예금주: 예케이케이컬처센터 · 클릭하여 안내 멘트 복사</div>
        </div>
        <span style={{fontSize:11,color:"#6366F1",flexShrink:0,fontWeight:500}}>{acctToast ? "✓ 복사됨" : "📋 복사"}</span>
      </div>
      {acctToast && <div style={{position:"fixed",bottom:80,left:"50%",transform:"translateX(-50%)",background:"#1E1B4B",color:"#fff",fontSize:13,fontWeight:500,padding:"10px 20px",borderRadius:24,zIndex:9999,boxShadow:"0 4px 20px rgba(0,0,0,.25)",whiteSpace:"nowrap",pointerEvents:"none"}}>안내 멘트가 복사되었습니다!</div>}
      <div className="ph"><div><h1>수납 관리</h1><div className="ph-sub">{monthLabel(month)}</div></div><div style={{display:"flex",gap:6,flexWrap:"wrap",justifyContent:"flex-end"}}>
        {canManageAll(currentUser.role) && pendingRequestStudents.length > 0 && (
          <button className="btn btn-sm" style={{background:"var(--gold-lt)",border:"1.5px solid var(--gold-dk)",color:"var(--gold-dk)",fontWeight:700,position:"relative"}} onClick={() => setRequestsModal(true)}>
            강사 청구 요청
            <span style={{marginLeft:6,background:"var(--gold-dk)",color:"#fff",borderRadius:99,padding:"1px 7px",fontSize:11,fontWeight:700}}>{pendingRequestStudents.reduce((n,s)=>n+(s.pendingOneTimeCharges||[]).length,0)}</span>
          </button>
        )}
        {canManageAll(currentUser.role) && <button className="btn btn-secondary btn-sm" onClick={openBulkPrep} title="전체 수강료 일괄 확인 및 확정">📋 수강료 확정</button>}
        {canManageAll(currentUser.role) && <button className="btn btn-secondary btn-sm" onClick={() => setAlimtalkModal("monthly_fee")} title="이달의 수강료 알림톡 발송">💬 수강료 알림톡</button>}
        {canManageAll(currentUser.role) && <button className="btn btn-secondary btn-sm" onClick={exportCSV}>📥 엑셀</button>}
      </div></div>
      <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:10}}>
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
      {/* 학생 검색 */}
      <div className="srch-wrap" style={{marginBottom:10}}>
        <span className="srch-icon">{IC.search}</span>
        <input className="srch-inp" placeholder="회원 이름 검색" value={searchQuery} onChange={e => setSearchQuery(e.target.value)} />
      </div>
      {/* 요약 카드 — 강사: 금액 숨김, 건수만 표시 */}
      <div className="pay-summary-grid">
        {isTeacher ? (<>
          <div className="pay-summary-card"><div className="pay-summary-num" style={{color:"var(--green)",fontSize:22}}>{visibleStudents.filter(s=>getPayment(s.id)?.paid).length}명</div><div className="pay-summary-label">입금 완료</div></div>
          <div className="pay-summary-card" style={{cursor:"pointer",outline:filterUnpaid?"2px solid var(--red)":""}} onClick={() => setFilterUnpaid(f=>!f)}><div className="pay-summary-num" style={{color:"var(--red)",fontSize:22}}>{unpaidCount}명</div><div className="pay-summary-label">미납</div></div>
          <div className="pay-summary-card"><div className="pay-summary-num" style={{color:"var(--ink)",fontSize:22}}>{visibleStudents.length}명</div><div className="pay-summary-label">전체</div></div>
        </>) : (<>
          <div className="pay-summary-card"><div className="pay-summary-num" style={{color:"var(--ink)"}}>{fmtMoney(totalDue)}</div><div className="pay-summary-label">총 수강료</div></div>
          <div className="pay-summary-card"><div className="pay-summary-num" style={{color:"var(--green)"}}>{fmtMoney(totalPaid)}</div><div className="pay-summary-label">입금 완료</div></div>
          <div className="pay-summary-card" style={{cursor:"pointer",outline:filterUnpaid?"2px solid var(--red)":""}} onClick={() => setFilterUnpaid(f=>!f)}><div className="pay-summary-num" style={{color:"var(--red)"}}>{unpaidCount}명</div><div className="pay-summary-label">미납</div></div>
        </>)}
      </div>
      {/* 수납률 프로그레스 바 — 관리자/매니저 전용 */}
      {!isTeacher && visibleStudents.length > 0 && (
        <div style={{marginBottom:10,padding:"10px 14px",background:"#fff",borderRadius:10,border:"1px solid #F0F0F0"}}>
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:6}}>
            <span style={{fontSize:12,color:"var(--ink-60)"}}>수납률</span>
            <span style={{fontSize:13,fontWeight:700,color:paidCount===visibleStudents.length?"var(--green)":"var(--ink)"}}>{paidRate}%</span>
          </div>
          <div style={{height:6,borderRadius:3,background:"#F0F0F0",overflow:"hidden"}}>
            <div style={{height:"100%",borderRadius:3,background:"var(--green)",width:`${paidRate}%`,transition:"width .4s ease"}} />
          </div>
          <div style={{fontSize:11,color:"#B0B0B0",marginTop:4}}>{paidCount}명 납부 / {visibleStudents.length}명 전체</div>
        </div>
      )}
      {visibleStudents.length === 0 ? (
        <div className="empty"><div className="empty-icon">₩</div><div className="empty-txt">{filterUnpaid ? "미납 회원이 없습니다." : searchQuery ? "검색 결과가 없습니다." : "회원이 없습니다."}</div></div>
      ) : visibleStudents.map(s => {
        const p = getPayment(s.id);
        const isPaid = p?.paid;
        const amt = isPaid ? (p.amount || autoFee(s)) : (p?.amount ?? autoFee(s));
        const isInst = s.isInstitution;
        return (
          <div key={s.id} className="pay-row" onClick={() => openEdit(s)} style={isInst ? {background:"rgba(43,58,159,.02)"} : undefined}>
            <Av photo={s.photo} name={s.name} size="av-sm" />
            <div style={{flex:1,minWidth:0}}>
              <div style={{fontSize:13.5,fontWeight:600,display:"flex",alignItems:"center",gap:4}}>
                {isInst && <span style={{fontSize:9.5,padding:"1px 5px",background:"var(--blue-lt)",color:"var(--blue)",borderRadius:4,fontWeight:700}}>🏢</span>}
                <span style={{whiteSpace:"nowrap",overflow:"hidden",textOverflow:"ellipsis"}}>{s.name}</span>
              </div>
              <div className={`pay-status ${isPaid ? "paid" : "unpaid"}`}>
                {isPaid ? `✓ ${fmtDateShort(p.paidDate)} 입금` : "미납"}
                {p?.method && isPaid ? ` · ${PAY_METHODS[p.method] || p.method}` : ""}
              </div>
            </div>
            {/* 강사: 금액 숨김 */}
            {!isTeacher && <div className="pay-amount" style={{color: isPaid ? "var(--green)" : "var(--ink)"}}>{fmtMoney(amt)}</div>}
            {canManageAll(currentUser.role) && !isPaid && (
              <button
                onClick={async (e) => {
                  e.stopPropagation();
                  if (quickPayingId) return;
                  setQuickPayingId(s.id);
                  const base = p?.amount ?? autoFee(s);
                  const record = { ...(p||{}), id: p?.id||uid(), studentId: s.id, month, amount: base, paid: true, paidAmount: base, paidDate: TODAY_STR, method: "transfer", note: p?.note||"", extraCharges: p?.extraCharges||[], createdAt: p?.createdAt||Date.now(), updatedAt: Date.now() };
                  const upd = p ? payments.map(pp => pp.id === p.id ? record : pp) : [...payments, record];
                  try { await onSavePayments(upd); onLog(`${s.name} 회원 ${monthLabel(month)} 수강료 입금 확인`); } catch {}
                  setQuickPayingId(null);
                }}
                style={{background:"var(--green)",color:"#fff",border:"none",borderRadius:8,padding:"6px 11px",fontSize:11,fontWeight:700,flexShrink:0,cursor:"pointer",fontFamily:"inherit",opacity:quickPayingId===s.id?0.5:1,transition:"opacity .1s",whiteSpace:"nowrap"}}
              >
                {quickPayingId === s.id ? "…" : "✓ 입금"}
              </button>
            )}
          </div>
        );
      })}

      {editingId && (() => {
        const s = visibleStudents.find(st => st.id === editingId);
        const baseAmount = s ? autoFee(s) : 0;
        const pendingCharges = s?.pendingOneTimeCharges || [];
        const absenceCount = attendance.filter(a =>
          a.studentId === editForm.studentId &&
          (a.date || "").startsWith(prevMonthStr) &&
          a.status === "absent"
        ).length;
        return (
          <div className="mb" onClick={e => e.target === e.currentTarget && setEditingId(null)}>
            <div className="modal">
              <div className="modal-h">
                <h2>수강료 관리</h2>
                <button className="modal-close" onClick={() => setEditingId(null)}>{IC.x}</button>
              </div>
              <div className="modal-b">
                {(() => { const pt = s ? teachers.find(t=>t.id===s.teacherId) : null; return (
                  <div style={{display:"flex",alignItems:"center",gap:10,marginBottom:12}}>
                    <div style={{fontSize:15,fontWeight:600,flex:1}}>{s?.name} · {monthLabel(month)}</div>
                    <button className="btn btn-secondary btn-xs" onClick={()=>setPreviewStudent(s)} style={{gap:4}}>{IC.search} 회원 정보</button>
                  </div>
                );})()}

                {/* 강사에게 금액 숨김 */}
                {!isTeacher && (
                  <div className="fg">
                    <label className="fg-label">수강료</label>
                    <div style={{position:"relative"}}>
                      <input className="inp" inputMode="numeric" value={editForm.amount ? editForm.amount.toLocaleString("ko-KR") : ""} onChange={e => setEditForm(f => ({...f, amount: parseInt(e.target.value.replace(/[^\d]/g,"")) || 0}))} style={{paddingRight:30}} />
                      <span style={{position:"absolute",right:12,top:"50%",transform:"translateY(-50%)",fontSize:13,color:"var(--ink-30)",pointerEvents:"none"}}>원</span>
                    </div>
                    {absenceCount > 0 && (
                      <div style={{display:"flex",alignItems:"center",gap:8,marginTop:8,padding:"10px 14px",background:"#FEF3C7",border:"1.5px solid #F59E0B",borderRadius:10,fontSize:13,color:"#78350F",fontWeight:600}}>
                        <span style={{fontSize:18,flexShrink:0}}>⚠️</span>
                        <span><strong>{prevMonthStr.replace("-", "년 ")}월</strong> 미보강 결석 <strong>{absenceCount}회</strong> — 수강료 수동 차감을 검토하세요.</span>
                      </div>
                    )}
                  </div>
                )}

                {/* 강사: 납부 상태만 읽기 전용 표시 */}
                {isTeacher && (
                  <div style={{background:editForm.paid?"var(--green-lt)":"var(--red-lt)",border:`1px solid ${editForm.paid?"rgba(26,122,64,.2)":"rgba(232,40,28,.15)"}`,borderRadius:10,padding:"14px 16px",marginBottom:14,display:"flex",alignItems:"center",gap:10}}>
                    <span style={{fontSize:22}}>{editForm.paid ? "✅" : "⏳"}</span>
                    <div>
                      <div style={{fontSize:14,fontWeight:600,color:editForm.paid?"var(--green)":"var(--red)"}}>{editForm.paid ? "입금 완료" : "미납"}</div>
                      {editForm.paid && editForm.paidDate && <div style={{fontSize:12,color:"var(--ink-60)",marginTop:2}}>납부일: {fmtDate(editForm.paidDate)}</div>}
                    </div>
                  </div>
                )}

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
                ) : !isTeacher && (
                  <div style={{fontSize:12.5,color:"var(--ink-30)",background:"var(--ink-10)",padding:"10px 14px",borderRadius:8,marginBottom:14}}>💡 입금 확인은 매니저 이상만 가능합니다.</div>
                )}

                {/* 일회성 청구 예정 */}
                {canManageAll(currentUser.role) && !isTeacher && pendingCharges.length > 0 && (
                  <div className="fg">
                    <label className="fg-label">일회성 청구 예정</label>
                    {pendingCharges.map((ch, i) => (
                      <div key={i} style={{display:"flex",gap:6,alignItems:"center",marginBottom:6,padding:"8px 10px",background:"#FFFBEB",border:"1px solid rgba(245,158,11,.2)",borderRadius:8}}>
                        <span style={{flex:1,fontSize:13,color:"var(--ink)"}}>{ch.type}{ch.title ? ` — ${ch.title}` : ""}</span>
                        <span style={{fontSize:13,fontWeight:600,color:"var(--ink)",fontFamily:"'Noto Serif KR',serif"}}>{fmtMoney(ch.amount||0)}</span>
                        <button onClick={async () => {
                          if (!onSaveStudents) return;
                          const updStudents = students.map(st => st.id === s.id ? {...st, pendingOneTimeCharges: pendingCharges.filter((_,j)=>j!==i)} : st);
                          await onSaveStudents(updStudents);
                        }} style={{background:"none",border:"none",color:"var(--red)",fontSize:16,cursor:"pointer",padding:"0 4px",flexShrink:0}}>×</button>
                      </div>
                    ))}
                    <button className="btn btn-secondary btn-sm" style={{marginTop:4}} onClick={async () => {
                      const toAdd = pendingCharges.map(c => ({title:`${c.type}${c.title?` - ${c.title}`:""}`, amount:c.amount||0}));
                      const upd = [...(editForm.extraCharges||[]), ...toAdd];
                      const total = baseAmount + upd.reduce((sum,x)=>sum+(x.amount||0),0);
                      setEditForm(f => ({...f, extraCharges: upd, amount: total}));
                      if (onSaveStudents) {
                        const updStudents = students.map(st => st.id === s.id ? {...st, pendingOneTimeCharges: []} : st);
                        await onSaveStudents(updStudents);
                      }
                    }}>📥 전체 추가 청구로 이동</button>
                  </div>
                )}

                {/* 추가 청구 항목 */}
                {canManageAll(currentUser.role) && !isTeacher && (
                  <div className="fg">
                    <label className="fg-label">추가 청구 항목</label>
                    {(editForm.extraCharges || []).map((ec, i) => (
                      <div key={i} style={{display:"flex",gap:6,alignItems:"center",marginBottom:6}}>
                        <input className="inp" value={ec.title} onChange={e => {
                          const upd = editForm.extraCharges.map((x,j) => j===i ? {...x,title:e.target.value} : x);
                          const total = baseAmount + upd.reduce((sum,x)=>sum+(x.amount||0),0);
                          setEditForm(f => ({...f, extraCharges: upd, amount: total}));
                        }} placeholder="항목명" style={{flex:2}} />
                        <div style={{position:"relative",flex:1}}>
                          <input className="inp" inputMode="numeric" value={ec.amount ? ec.amount.toLocaleString("ko-KR") : ""} onChange={e => {
                            const amt = parseInt(e.target.value.replace(/[^\d]/g,"")) || 0;
                            const upd = editForm.extraCharges.map((x,j) => j===i ? {...x,amount:amt} : x);
                            const total = baseAmount + upd.reduce((sum,x)=>sum+(x.amount||0),0);
                            setEditForm(f => ({...f, extraCharges: upd, amount: total}));
                          }} style={{paddingRight:22}} />
                          <span style={{position:"absolute",right:8,top:"50%",transform:"translateY(-50%)",fontSize:11,color:"var(--ink-30)"}}>원</span>
                        </div>
                        <button onClick={() => {
                          const upd = editForm.extraCharges.filter((_,j)=>j!==i);
                          const total = baseAmount + upd.reduce((sum,x)=>sum+(x.amount||0),0);
                          setEditForm(f => ({...f, extraCharges: upd, amount: total}));
                        }} style={{background:"none",border:"none",color:"var(--red)",fontSize:16,cursor:"pointer",padding:"0 4px",flexShrink:0}}>×</button>
                      </div>
                    ))}
                    <div style={{display:"flex",gap:6,alignItems:"center",marginTop:4}}>
                      <input className="inp" value={editForm.newChargeTitle||""} onChange={e => setEditForm(f=>({...f,newChargeTitle:e.target.value}))} placeholder="항목명 (예: 교재비)" style={{flex:2}} />
                      <div style={{position:"relative",flex:1}}>
                        <input className="inp" inputMode="numeric" value={editForm.newChargeAmount||""} onChange={e => setEditForm(f=>({...f,newChargeAmount:e.target.value.replace(/[^\d]/g,"")}))} style={{paddingRight:22}} placeholder="0" />
                        <span style={{position:"absolute",right:8,top:"50%",transform:"translateY(-50%)",fontSize:11,color:"var(--ink-30)"}}>원</span>
                      </div>
                      <button onClick={() => {
                        const title = (editForm.newChargeTitle||"").trim();
                        const amount = parseInt(editForm.newChargeAmount) || 0;
                        if (!title) return;
                        const upd = [...(editForm.extraCharges||[]), {title, amount}];
                        const total = baseAmount + upd.reduce((sum,x)=>sum+(x.amount||0),0);
                        setEditForm(f => ({...f, extraCharges: upd, amount: total, newChargeTitle: "", newChargeAmount: ""}));
                      }} className="btn btn-secondary btn-sm" style={{flexShrink:0}}>+ 추가</button>
                    </div>
                  </div>
                )}

                <div className="fg"><label className="fg-label">메모</label><input className="inp" value={editForm.note} onChange={e => setEditForm(f => ({...f, note: e.target.value}))} placeholder="비고" /></div>
                {isTeacher && (
                  <div style={{borderTop:"1px dashed var(--border)",paddingTop:10,marginTop:4}}>
                    <button className="btn btn-secondary btn-sm" style={{width:"100%"}} onClick={() => setPayChargeStudent(s)}>+ 비용 청구 요청</button>
                    {(s?.pendingOneTimeCharges||[]).length > 0 && (
                      <div style={{fontSize:11,color:"var(--gold-dk)",background:"var(--gold-lt)",borderRadius:8,padding:"5px 10px",marginTop:6}}>
                        승인 대기: {(s.pendingOneTimeCharges||[]).map(c=>`${c.title||c.type} ${(c.amount||0).toLocaleString()}원`).join(" · ")}
                      </div>
                    )}
                  </div>
                )}
              </div>
              <div className="modal-f">
                <button className="btn btn-secondary" onClick={() => setEditingId(null)}>취소</button>
                <button className="btn btn-primary" onClick={saveEdit}>저장</button>
              </div>
            </div>
          </div>
        );
      })()}

      {/* Student info preview popup */}
      {previewStudent && (
        <div className="mb" onClick={e => e.target === e.currentTarget && setPreviewStudent(null)}>
          <div className="modal" style={{maxWidth:420}}>
            <div className="modal-h"><h2>회원 정보</h2><button className="modal-close" onClick={() => setPreviewStudent(null)}>{IC.x}</button></div>
            <div className="det-head">
              <Av photo={previewStudent.photo} name={previewStudent.name} size="av-lg" />
              <div style={{flex:1}}>
                <div className="det-name">{previewStudent.name}</div>
                {previewStudent.studentCode && <div style={{fontSize:11,color:"var(--ink-30)",marginBottom:4,fontFamily:"monospace"}}>{previewStudent.studentCode}</div>}
                <div style={{display:"flex",flexWrap:"wrap",gap:4}}>
                  {previewStudent.isInstitution ? (
                    <span className="tag" style={{background:"var(--blue-lt)",color:"var(--blue)"}}>🏢 {instTypeLabel(previewStudent.type)}</span>
                  ) : (
                    <span className={`tag ${isMinor(previewStudent.birthDate) ? "tag-minor" : "tag-adult"}`}>{isMinor(previewStudent.birthDate) ? "미성년자" : "성인"}{calcAge(previewStudent.birthDate) !== null ? ` · ${calcAge(previewStudent.birthDate)}세` : ""}</span>
                  )}
                  {(() => { const t = teachers.find(t=>t.id===previewStudent.teacherId); return t ? <span className="tag tag-gold">{t.name} 강사</span> : null; })()}
                </div>
              </div>
            </div>
            <div className="info-grid">
              <div className="ii"><div className="ii-label">생년월일</div><div className="ii-val">{previewStudent.isInstitution ? "-" : fmtDate(previewStudent.birthDate)}</div></div>
              {(previewStudent.isInstitution || !isTeacher) && <div className="ii"><div className="ii-label">{previewStudent.isInstitution ? "담당자 연락처" : "연락처"}</div><div className="ii-val">{previewStudent.phone || "-"}</div></div>}
              {(previewStudent.isInstitution || !isTeacher) && <div className="ii"><div className="ii-label">{previewStudent.isInstitution ? "담당자명" : "보호자"}</div><div className="ii-val">{previewStudent.isInstitution ? (previewStudent.contactName || "-") : (previewStudent.guardianPhone || "-")}</div></div>}
              {!isTeacher && <div className="ii"><div className="ii-label">월 수강료</div><div className="ii-val">{fmtMoney(previewStudent.monthlyFee)}</div></div>}
              {previewStudent.isInstitution && previewStudent.bizNumber && <div className="ii"><div className="ii-label">사업자번호</div><div className="ii-val">{previewStudent.bizNumber}</div></div>}
              {previewStudent.isInstitution && previewStudent.contactEmail && <div className="ii"><div className="ii-label">담당자 이메일</div><div className="ii-val" style={{fontSize:11}}>{previewStudent.contactEmail}</div></div>}
            </div>
            {(previewStudent.lessons||[]).length > 0 && <div style={{padding:"8px 20px"}}><div style={{fontSize:12,color:"var(--blue)",fontWeight:500}}>{(previewStudent.lessons||[]).map(l=>l.instrument).join(" · ")}</div></div>}
            {previewStudent.notes && <div style={{padding:"4px 20px 12px"}}><div style={{fontSize:12,color:"var(--ink-60)"}}>{previewStudent.notes}</div></div>}
            <div className="modal-f"><button className="btn btn-secondary" onClick={() => setPreviewStudent(null)}>닫기</button></div>
          </div>
        </div>
      )}
      {/* ── 비용 청구 요청 모달 (수납 관리 내) ── */}
      {payChargeStudent && (
        <ChargeRequestModal
          student={payChargeStudent}
          onClose={() => setPayChargeStudent(null)}
          onSave={async (updStudent) => {
            const updStudents = students.map(st => st.id === updStudent.id ? updStudent : st);
            await onSaveStudents(updStudents);
          }}
        />
      )}

      {/* ── 수강료 일괄 알림톡 모달 ── */}
      {alimtalkModal && (
        <AlimtalkModal
          type={alimtalkModal}
          students={visibleStudents}
          month={month}
          getPayment={getPayment}
          onClose={() => setAlimtalkModal(null)}
          onSend={async (type, targets) => {
            await sendAligoMessage(type, targets);
          }}
        />
      )}

      {/* ── 수강료 일괄 확정 모달 ── */}
      {bulkPrepModal && (() => {
        const allActive = students.filter(s => (s.status||"active")==="active" && !s.isInstitution);
        const zeroCount = allActive.filter(s => (bulkPrepData[s.id]?.amount ?? 0) === 0).length;
        return (
          <div style={{position:"fixed",top:0,left:0,width:"100vw",height:"100vh",zIndex:10000,display:"flex",alignItems:"center",justifyContent:"center",background:"rgba(0,0,0,.5)"}} onClick={e => e.target===e.currentTarget && !bulkSaving && setBulkPrepModal(false)}>
            <div style={{width:"96%",maxWidth:560,height:"90vh",background:"var(--paper)",borderRadius:16,boxShadow:"0 8px 40px rgba(0,0,0,.18)",display:"flex",flexDirection:"column",overflow:"hidden"}}>
              <div className="modal-h">
                <h2>📋 {monthLabel(month)} 수강료 확정</h2>
                <button className="modal-close" onClick={() => setBulkPrepModal(false)} disabled={bulkSaving}>{IC.x}</button>
              </div>
              {/* 요약 배너 */}
              <div style={{padding:"8px 16px",background:"var(--bg)",borderBottom:"1px solid var(--border)",fontSize:12,color:"var(--ink-60)",display:"flex",gap:12,alignItems:"center"}}>
                <span>재원생 <strong>{allActive.length}명</strong></span>
                {zeroCount > 0
                  ? <span style={{color:"var(--red)",fontWeight:600}}>⚠ 0원 {zeroCount}명 — 확인 필요</span>
                  : <span style={{color:"var(--green)",fontWeight:600}}>✓ 전원 수강료 입력됨</span>}
              </div>
              {/* 회원 리스트 */}
              <div style={{flex:1,overflowY:"auto"}}>
                {allActive.map(s => {
                  const d = bulkPrepData[s.id] || {amount:0,extras:[],newTitle:"",newAmt:""};
                  const t = teachers.find(t=>t.id===s.teacherId);
                  const refAmt = autoFee(s);
                  const isZero = d.amount === 0;
                  return (
                    <div key={s.id} style={{padding:"10px 14px",borderBottom:"1px solid var(--border)",background:isZero?"var(--red-lt)":"transparent"}}>
                      <div style={{display:"flex",alignItems:"center",gap:8}}>
                        <Av photo={s.photo} name={s.name} size="av-sm" />
                        <div style={{flex:1,minWidth:0}}>
                          <div style={{fontSize:13,fontWeight:600,display:"flex",alignItems:"center",gap:4,overflow:"hidden"}}>
                            <span style={{whiteSpace:"nowrap",overflow:"hidden",textOverflow:"ellipsis"}}>{s.name}</span>
                            {s.instrumentRental && <span style={{fontSize:9,background:"var(--blue-lt)",color:"var(--blue)",borderRadius:4,padding:"1px 5px",fontWeight:700,flexShrink:0}}>대여</span>}
                          </div>
                          <div style={{fontSize:10.5,color:"var(--ink-30)"}}>{t ? `${t.name} 강사` : ""}{refAmt>0 ? ` · 기준 ${fmtMoney(refAmt)}` : ""}</div>
                        </div>
                        {/* 이달 청구 금액 */}
                        <div style={{position:"relative",width:108,flexShrink:0}}>
                          <input className="inp" inputMode="numeric"
                            value={d.amount ? d.amount.toLocaleString("ko-KR") : ""}
                            onChange={e => setBulkField(s.id,"amount",parseInt(e.target.value.replace(/[^\d]/g,""))||0)}
                            style={{paddingRight:22,fontSize:13,height:34,borderColor:isZero?"var(--red)":undefined}}
                          />
                          <span style={{position:"absolute",right:7,top:"50%",transform:"translateY(-50%)",fontSize:11,color:"var(--ink-30)",pointerEvents:"none"}}>원</span>
                        </div>
                      </div>
                      {/* 추가 항목 chips */}
                      {d.extras.length > 0 && (
                        <div style={{display:"flex",gap:4,flexWrap:"wrap",marginTop:5,paddingLeft:32}}>
                          {d.extras.map((ex,i) => (
                            <span key={i} style={{fontSize:11,background:"var(--gold-lt)",border:"1px solid var(--gold)",borderRadius:6,padding:"2px 7px",color:"var(--gold-dk)",display:"inline-flex",alignItems:"center",gap:3}}>
                              {ex.title} {fmtMoney(ex.amount)}
                              <button onClick={() => removeBulkExtra(s.id,i)} style={{background:"none",border:"none",color:"var(--red)",fontSize:13,cursor:"pointer",padding:0,lineHeight:1,marginLeft:1}}>×</button>
                            </span>
                          ))}
                        </div>
                      )}
                      {/* 추가 항목 입력 */}
                      <div style={{display:"flex",gap:4,alignItems:"center",marginTop:5,paddingLeft:32}}>
                        <input className="inp" placeholder="항목명" value={d.newTitle||""} onChange={e => setBulkField(s.id,"newTitle",e.target.value)} style={{flex:2,height:30,fontSize:11}} />
                        <div style={{position:"relative",flex:1}}>
                          <input className="inp" inputMode="numeric" placeholder="0" value={d.newAmt||""} onChange={e => setBulkField(s.id,"newAmt",e.target.value.replace(/[^\d]/g,""))} style={{paddingRight:14,height:30,fontSize:11}} />
                          <span style={{position:"absolute",right:5,top:"50%",transform:"translateY(-50%)",fontSize:10,color:"var(--ink-30)",pointerEvents:"none"}}>원</span>
                        </div>
                        <button onClick={() => addBulkExtra(s.id)} className="btn btn-secondary btn-xs" style={{flexShrink:0,height:30}}>+추가</button>
                      </div>
                    </div>
                  );
                })}
              </div>
              <div className="modal-f">
                <button className="btn btn-secondary" onClick={() => setBulkPrepModal(false)} disabled={bulkSaving}>취소</button>
                <button className="btn btn-primary" onClick={confirmBulkPrep} disabled={bulkSaving}>
                  {bulkSaving ? <><span className="spinner-sm"/> 저장 중…</> : `${allActive.length}명 수강료 확정`}
                </button>
              </div>
            </div>
          </div>
        );
      })()}

      {/* ── 강사 청구 요청 승인 모달 ── */}
      {requestsModal && (
        <div className="mb" onClick={e => e.target === e.currentTarget && setRequestsModal(false)}>
          <div className="modal" style={{maxWidth:480}}>
            <div className="modal-h"><h2>강사 청구 요청</h2><button className="modal-close" onClick={() => setRequestsModal(false)}>{IC.x}</button></div>
            <div className="modal-b">
              {pendingRequestStudents.length === 0 ? (
                <div style={{textAlign:"center",color:"var(--ink-30)",padding:"20px 0"}}>처리할 요청이 없습니다.</div>
              ) : pendingRequestStudents.map(s => (
                <div key={s.id} style={{marginBottom:16,borderBottom:"1px solid var(--border)",paddingBottom:12}}>
                  <div style={{fontWeight:700,fontSize:14,marginBottom:8,display:"flex",alignItems:"center",gap:6}}>
                    {s.name}
                    <span style={{fontSize:12,color:"var(--ink-60)",fontWeight:400}}>
                      {(s.lessons||[]).map(l=>l.instrument).join(" · ")}
                    </span>
                  </div>
                  {(s.pendingOneTimeCharges||[]).map(charge => (
                    <div key={charge.id} style={{display:"flex",alignItems:"center",gap:8,padding:"7px 10px",background:"var(--gold-lt)",borderRadius:8,marginBottom:6,transition:"opacity .25s",opacity:approvingId===charge.id?0.4:1}}>
                      <div style={{flex:1}}>
                        <div style={{fontWeight:600,fontSize:13}}>{charge.title}</div>
                        <div style={{fontSize:11,color:"var(--ink-60)"}}>요청: {charge.requestedBy} · {fmtMoney(charge.amount)}</div>
                      </div>
                      <button className="btn btn-sm" style={{background:"var(--green-lt)",border:"1px solid var(--green)",color:"var(--green)",fontWeight:700}} disabled={!!approvingId} onClick={async () => {
                        setApprovingId(charge.id);
                        // 1. student에서 해당 pendingCharge 제거
                        const updStudent = { ...s, pendingOneTimeCharges: (s.pendingOneTimeCharges||[]).filter(c => c.id !== charge.id) };
                        const updStudents = students.map(st => st.id === s.id ? updStudent : st);
                        await onSaveStudents(updStudents);
                        // 2. 해당 월 payment에 extraCharge 추가
                        const p = payments.find(p => p.studentId === s.id && p.month === month);
                        const newExtra = { title: charge.title ? `${charge.type||"기타"} - ${charge.title}` : (charge.type||"기타"), amount: charge.amount };
                        const existing = p?.extraCharges || [];
                        const newExtras = [...existing, newExtra];
                        const newAmt = (p?.amount ?? autoFee(s)) + charge.amount;
                        const record = { ...(p||{}), id: p?.id || uid(), studentId: s.id, month, amount: newAmt, extraCharges: newExtras, paid: p?.paid||false, paidAmount: p?.paidAmount||0, paidDate: p?.paidDate||"", method: p?.method||"", note: p?.note||"", createdAt: p?.createdAt||Date.now(), updatedAt: Date.now() };
                        const updPay = p ? payments.map(px => px.id === p.id ? record : px) : [...payments, record];
                        await onSavePayments(updPay);
                        setApprovingId(null);
                      }}>승인</button>
                    </div>
                  ))}
                </div>
              ))}
            </div>
            <div className="modal-f"><button className="btn btn-secondary" onClick={() => setRequestsModal(false)}>닫기</button></div>
          </div>
        </div>
      )}
    </div>
  );
}
