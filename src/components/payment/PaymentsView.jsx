import { useState } from "react";
import { PAY_METHODS, IC, TODAY_STR, THIS_MONTH } from "../../constants.jsx";
import { canManageAll, monthLabel, fmtMoney, fmtDateShort, fmtDate, calcAge, isMinor, instTypeLabel, uid, sendAligoMessage } from "../../utils.js";
import { Av } from "../shared/CommonUI.jsx";

export default function PaymentsView({ students, teachers, currentUser, payments, onSavePayments, onLog, attendance = [], onSaveStudents }) {
  const [month, setMonth] = useState(THIS_MONTH);
  const [editingId, setEditingId] = useState(null);
  const [editForm, setEditForm] = useState({});
  const [filterTeacher, setFilterTeacher] = useState(currentUser.role === "teacher" ? currentUser.id : "all");
  const [filterUnpaid, setFilterUnpaid] = useState(false);
  const [alimModal, setAlimModal] = useState(false);
  const [alimType, setAlimType] = useState("unpaid");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [previewStudent, setPreviewStudent] = useState(null);
  const [searchQuery, setSearchQuery] = useState("");
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
    await onSavePayments(upd);
    const sName = visibleStudents.find(s => s.id === editForm.studentId)?.name;
    if (editForm.paid && !existing?.paid) onLog(`${sName} 회원 ${monthLabel(month)} 수강료 입금 확인`);
    setEditingId(null);
  };

  const prevMonth = () => { const d = new Date(month + "-01"); d.setMonth(d.getMonth() - 1); setMonth(d.toISOString().slice(0,7)); };
  const nextMonth = () => { const d = new Date(month + "-01"); d.setMonth(d.getMonth() + 1); setMonth(d.toISOString().slice(0,7)); };
  const prevMonthStr = (() => { const d = new Date(month + "-01"); d.setMonth(d.getMonth() - 1); return d.toISOString().slice(0, 7); })();

  return (
    <div>
      <div className="ph"><div><h1>수납 관리</h1><div className="ph-sub">{monthLabel(month)}</div></div><div style={{display:"flex",gap:6}}>{canManageAll(currentUser.role) && <button className="btn btn-secondary btn-sm" onClick={() => { setAlimType("unpaid"); setAlimModal(true); }}>💬 알림톡</button>}{canManageAll(currentUser.role) && <button className="btn btn-secondary btn-sm" onClick={exportCSV}>📥 엑셀</button>}</div></div>
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
                      <div style={{display:"flex",alignItems:"center",gap:6,marginTop:6,padding:"8px 12px",background:"#FFFBEB",border:"1px solid rgba(245,158,11,.25)",borderRadius:8,fontSize:12,color:"#92400E"}}>
                        <span style={{fontSize:14}}>⚠️</span>
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
      {alimModal && (
        <div className="modal-overlay" onClick={() => !isSubmitting && setAlimModal(false)}>
          <div className="modal" onClick={e => e.stopPropagation()} style={{maxWidth:360}}>
            <div className="modal-h"><h2>💬 알림톡 발송</h2></div>
            <div className="modal-b">
              <div className="fg">
                <label className="fg-label">발송 대상</label>
                <div style={{display:"flex",gap:8}}>
                  <button className={`btn btn-sm ${alimType === "unpaid" ? "btn-primary" : "btn-secondary"}`} onClick={() => setAlimType("unpaid")}>미납자만 ({unpaidCount}명)</button>
                  <button className={`btn btn-sm ${alimType === "all" ? "btn-primary" : "btn-secondary"}`} onClick={() => setAlimType("all")}>전체 ({visibleStudents.length}명)</button>
                </div>
              </div>
              <div style={{fontSize:12,color:"var(--ink-60)",padding:"8px 0",lineHeight:1.6}}>
                {alimType === "unpaid"
                  ? `미납 ${unpaidCount}명에게 수강료 납부 안내 메시지를 발송합니다.`
                  : `전체 ${visibleStudents.length}명에게 수강료 안내 메시지를 발송합니다.`}
              </div>
              <div style={{display:"flex",gap:8,justifyContent:"flex-end",marginTop:8}}>
                <button className="btn btn-secondary" onClick={() => setAlimModal(false)} disabled={isSubmitting}>취소</button>
                <button className="btn btn-primary" disabled={isSubmitting} onClick={async () => {
                  setIsSubmitting(true);
                  const targets = alimType === "unpaid"
                    ? visibleStudents.filter(s => !getPayment(s.id)?.paid)
                    : visibleStudents;
                  await sendAligoMessage(alimType, targets);
                  setIsSubmitting(false);
                  setAlimModal(false);
                }}>
                  {isSubmitting ? <><span className="spinner-sm" /> 발송 중…</> : "발송하기"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
