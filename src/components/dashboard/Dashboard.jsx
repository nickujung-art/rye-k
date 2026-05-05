import { useState } from "react";
import { THIS_MONTH, TODAY_DAY, TODAY_STR, ATT_STATUS, IC } from "../../constants.jsx";
import { canManageAll, fmtDateTime, fmtDateShort, isMinor, monthLabel, getContractDaysLeft, allLessonInsts, computeMonthlyAttStats, computeWeeklyAttRates } from "../../utils.js";
import { Av } from "../shared/CommonUI.jsx";

function DonutChart({ paid, total }) {
  const r = 28, cx = 38, cy = 38;
  const circ = 2 * Math.PI * r;
  const paidDash = total > 0 ? (paid / total) * circ : 0;
  const pct = total > 0 ? Math.round(paid / total * 100) : 0;
  return (
    <svg width="76" height="76" viewBox="0 0 76 76" style={{flexShrink:0}}>
      <circle cx={cx} cy={cy} r={r} fill="none" stroke="var(--ink-10)" strokeWidth="11" />
      {paid > 0 && (
        <circle cx={cx} cy={cy} r={r} fill="none" stroke="var(--green)" strokeWidth="11"
          strokeDasharray={`${paidDash.toFixed(2)} ${circ.toFixed(2)}`}
          strokeLinecap="round"
          transform={`rotate(-90 ${cx} ${cy})`} />
      )}
      <text x={cx} y={cy} textAnchor="middle" dominantBaseline="middle" fontSize="14" fontWeight="700" fill="var(--ink)" fontFamily="inherit">{pct}%</text>
    </svg>
  );
}

function Sparkline({ data }) {
  if (data.length < 2) return null;
  const W = 100, H = 32, pad = 3;
  const w = W - pad * 2, h = H - pad * 2;
  const points = data.map((v, i) => ({
    x: pad + (i / (data.length - 1)) * w,
    y: pad + (1 - v / 100) * h
  }));
  const pts = points.map(p => `${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(" ");
  const last = points[points.length - 1];
  return (
    <svg width={W} height={H} viewBox={`0 0 ${W} ${H}`}>
      <polyline points={pts} fill="none" stroke="var(--blue)" strokeWidth="1.8" strokeLinejoin="round" strokeLinecap="round" />
      <circle cx={last.x.toFixed(1)} cy={last.y.toFixed(1)} r="2.5" fill="var(--blue)" />
    </svg>
  );
}

export default function Dashboard({ students, teachers, currentUser, notices, categories, attendance, payments, pending, institutions, nav }) {
  const [todayListModal, setTodayListModal] = useState(false);
  const [expandedNotices, setExpandedNotices] = useState(new Set());
  const toggleNotice = (id) => setExpandedNotices(prev => { const next = new Set(prev); if (next.has(id)) next.delete(id); else next.add(id); return next; });
  const catCounts = Object.entries(categories).map(([cat, insts]) => ({ cat, count: students.filter(s => (s.lessons || []).some(l => insts.includes(l.instrument))).length })).filter(x => x.count > 0).sort((a, b) => b.count - a.count);
  const todayStudents = students.filter(s => (s.lessons || []).some(l => (l.schedule || []).some(sc => sc.day === TODAY_DAY)));
  const todayAtt = attendance.filter(a => a.date === TODAY_STR);
  const todayChecked = todayStudents.filter(s => todayAtt.find(a => a.studentId === s.id));
  const pinnedNotices = notices.filter(n => n.pinned).slice(0, 2);
  const monthPayments = payments.filter(p => p.month === THIS_MONTH);
  const unpaidThisMonth = students.filter(s => !monthPayments.find(p => p.studentId === s.id && p.paid)).length;
  const thisMonthStart = new Date(THIS_MONTH + "-01").getTime();
  const newStudents = students.filter(s => s.createdAt && s.createdAt >= thisMonthStart).sort((a, b) => b.createdAt - a.createdAt);

  // ── KST 날짜 ──────────────────────────────────────────────────────────────
  const nowKST = new Date(new Date().toLocaleString("en-US", { timeZone: "Asia/Seoul" }));
  const todayDayKST = nowKST.getDate();

  // ── Notifications ─────────────────────────────────────────────────────────
  const notifications = [];
  // 1. 미납 경고: 이번 달 3일 이후도 미납인 학생
  if (canManageAll(currentUser.role)) {
    if (todayDayKST >= 3) {
      const unpaidStudents = students.filter(s => !monthPayments.find(p => p.studentId === s.id && p.paid));
      if (unpaidStudents.length > 0) {
        notifications.push({ type: "red", text: <><strong>미납 {unpaidStudents.length}명</strong> — {monthLabel(THIS_MONTH)} 수강료 미납 (3일 경과)</>, key: "unpaid", onClick: () => nav("payments") });
      }
    }
  }
  // 2. 생일 알림: 오늘 & 이번 주
  const todayMd = TODAY_STR.slice(5); // MM-DD
  const nextWeek = new Date(); nextWeek.setDate(nextWeek.getDate() + 7);
  const birthdayToday = students.filter(s => s.birthDate && s.birthDate.slice(5) === todayMd);
  const birthdayWeek = students.filter(s => {
    if (!s.birthDate || s.birthDate.slice(5) === todayMd) return false;
    const bd = new Date(new Date().getFullYear() + "-" + s.birthDate.slice(5));
    return bd >= new Date(TODAY_STR) && bd <= nextWeek;
  });
  birthdayToday.forEach(s => notifications.push({ type: "gold", text: <><strong>{s.name}</strong>님 오늘 생일 🎂</>, key: "bd-" + s.id }));
  birthdayWeek.slice(0, 3).forEach(s => {
    const daysLeft = Math.ceil((new Date(new Date().getFullYear() + "-" + s.birthDate.slice(5)) - new Date(TODAY_STR)) / 86400000);
    notifications.push({ type: "gold", text: <><strong>{s.name}</strong>님 생일 D-{daysLeft} 🎂</>, key: "bdw-" + s.id });
  });
  // 3. 장기 결석 알림: 이번 달 연속 2회 이상 결석
  const monthAtt = attendance.filter(a => a.date?.startsWith(THIS_MONTH));
  const absentMap = {};
  monthAtt.filter(a => a.status === "absent").forEach(a => { absentMap[a.studentId] = (absentMap[a.studentId] || 0) + 1; });
  // Check consecutive absences
  students.forEach(s => {
    const sAtts = attendance.filter(a => a.studentId === s.id).sort((a, b) => b.date.localeCompare(a.date));
    let consecutive = 0;
    for (const a of sAtts.slice(0, 5)) { if (a.status === "absent") consecutive++; else break; }
    if (consecutive >= 2) {
      notifications.push({ type: "red", text: <><strong>{s.name}</strong> 연속 {consecutive}회 결석 ⚠</>, key: "abs-" + s.id, onClick: () => nav("attendance") });
    }
  });
  // 3.5 알림톡 발송 안내 배너
  if (canManageAll(currentUser.role) && todayDayKST >= 1 && todayDayKST <= 3) {
    notifications.push({ type: "blue", text: <><strong>💬 알림톡 발송 안내</strong> — 이번 달 수강료 안내를 발송할 수 있습니다</>, key: "alim-remind", onClick: () => nav("payments") });
  }
  if (canManageAll(currentUser.role) && todayDayKST === 8) {
    const unpaidStudents = students.filter(s => !monthPayments.find(p => p.studentId === s.id && p.paid));
    if (unpaidStudents.length > 0) {
      notifications.push({ type: "red", text: <><strong>💬 미납 독촉 알림톡</strong> — {unpaidStudents.length}명 미납, 독촉 발송을 권장합니다</>, key: "alim-overdue", onClick: () => nav("payments") });
    }
  }
  // 4. 등록 대기 알림
  if (canManageAll(currentUser.role) && pending && pending.length > 0) {
    notifications.push({ type: "blue", text: <><strong>등록 대기 {pending.length}건</strong> — 승인이 필요합니다</>, key: "pending", onClick: () => nav("pending") });
  }
  // 4.5. 강사 비용 청구 요청 알림
  if (canManageAll(currentUser.role)) {
    const pendingChargeCount = students.reduce((n, s) => n + (s.pendingOneTimeCharges||[]).length, 0);
    if (pendingChargeCount > 0) {
      notifications.push({ type: "gold", text: <><strong>💡 강사 비용 청구 요청 {pendingChargeCount}건</strong> — 수납 관리에서 확인 후 승인하세요</>, key: "charge-req", onClick: () => nav("payments") });
    }
  }
  // 5. 강사 기념일 (임용 기념일)
  teachers.forEach(t => {
    if (!t.startDate) return;
    if (t.startDate.slice(5) === todayMd) {
      const years = new Date().getFullYear() - new Date(t.startDate).getFullYear();
      if (years > 0) notifications.push({ type: "green", text: <><strong>{t.name}</strong> 강사 임용 {years}주년 기념일 🎉</>, key: "anni-" + t.id });
    }
  });
  // 6. ★ v12.1: 기관 계약 만료 임박 (D-30 이내)
  if (canManageAll(currentUser.role) && institutions && institutions.length > 0) {
    institutions.forEach(inst => {
      if ((inst.status || "active") !== "active") return;
      const dl = getContractDaysLeft(inst);
      if (dl !== null && dl < 0) {
        notifications.push({ type: "red", text: <><strong>{inst.name}</strong> 계약 만료됨 🏢</>, key: "inst-exp-" + inst.id, onClick: () => nav("institutions") });
      } else if (dl !== null && dl <= 30) {
        notifications.push({ type: dl <= 7 ? "red" : "gold", text: <><strong>{inst.name}</strong> 계약 만료 D-{dl} 🏢</>, key: "inst-d-" + inst.id, onClick: () => nav("institutions") });
      }
    });
  }

  return (
    <div>
      <div className="ph"><div><h1>대시보드</h1><div className="ph-sub">{new Date().toLocaleDateString("ko-KR", { month: "long", day: "numeric", weekday: "short" })} · {currentUser.name}님</div></div></div>

      {/* ── Notifications ── */}
      {notifications.length > 0 && (
        <div className="notif-card" style={{marginBottom:16}}>
          <div className="notif-hd">
            {IC.notif}
            <span className="notif-hd-title">알림</span>
            <span className="notif-badge">{notifications.length}</span>
          </div>
          {notifications.map(n => (
            <div key={n.key} className="notif-item" onClick={n.onClick} style={n.onClick ? {cursor:"pointer"} : {}}>
              <div className={`notif-dot ${n.type}`} />
              <div className="notif-text">{n.text}</div>
              {n.onClick && <span style={{color:"var(--ink-30)",fontSize:14}}>›</span>}
            </div>
          ))}
        </div>
      )}
      <div className="stat-grid">
        <div className="stat-card" onClick={() => nav("students")} style={{cursor:"pointer"}}><div className="stat-num">{students.length}</div><div className="stat-label">수강생</div><div className="stat-sub">미성년 {students.filter(s => isMinor(s.birthDate)).length}명</div></div>
        <div className="stat-card" onClick={() => nav("attendance")} style={{cursor:"pointer"}}><div className="stat-num">{todayStudents.length}</div><div className="stat-label">오늘 수업</div><div className="stat-sub">출석 {todayChecked.length}/{todayStudents.length}</div></div>
        {canManageAll(currentUser.role) && <div className="stat-card" onClick={() => nav("payments")} style={{cursor:"pointer"}}><div className="stat-num" style={{color: unpaidThisMonth > 0 ? "var(--red)" : "var(--green)"}}>{unpaidThisMonth}</div><div className="stat-label">이번달 미납</div><div className="stat-sub">{monthLabel(THIS_MONTH)}</div></div>}
        {canManageAll(currentUser.role) && <div className="stat-card">{(() => { const active = (institutions || []).filter(i => (i.status || "active") === "active").length; const totalClasses = (institutions || []).reduce((s, i) => s + (i.classes || []).length, 0); return (<><div className="stat-num" onClick={() => nav("institutions")} style={{cursor:"pointer"}}>{active}</div><div className="stat-label">기관</div><div className="stat-sub">{totalClasses}개 반</div></>); })()}</div>}
        {canManageAll(currentUser.role) && <div className="stat-card"><div className="stat-num">{teachers.length}</div><div className="stat-label">강사/매니저</div></div>}
      </div>

      {canManageAll(currentUser.role) && students.length > 0 && (() => {
        const paidCount = students.filter(s => monthPayments.find(p => p.studentId === s.id && p.paid)).length;
        const unpaidCount = students.length - paidCount;
        return (
          <div className="dash-card" style={{marginBottom:12}}>
            <div className="dash-card-title">이번달 수납 현황 <span style={{fontSize:11,color:"var(--ink-30)",fontWeight:400}}>{monthLabel(THIS_MONTH)}</span></div>
            <div style={{display:"flex",alignItems:"center",gap:16}}>
              <DonutChart paid={paidCount} total={students.length} />
              <div style={{flex:1}}>
                <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:8}}>
                  <div style={{width:8,height:8,borderRadius:"50%",background:"var(--green)",flexShrink:0}} />
                  <span style={{fontSize:12.5,color:"var(--ink-60)"}}>납부 완료</span>
                  <span style={{fontSize:15,fontWeight:700,color:"var(--green)",marginLeft:"auto"}}>{paidCount}명</span>
                </div>
                <div style={{display:"flex",alignItems:"center",gap:8}}>
                  <div style={{width:8,height:8,borderRadius:"50%",background:"var(--ink-10)",flexShrink:0}} />
                  <span style={{fontSize:12.5,color:"var(--ink-60)"}}>미납</span>
                  <span style={{fontSize:15,fontWeight:700,color: unpaidCount > 0 ? "var(--red)" : "var(--ink-30)",marginLeft:"auto"}}>{unpaidCount}명</span>
                </div>
              </div>
            </div>
          </div>
        );
      })()}

      {canManageAll(currentUser.role) && newStudents.length > 0 && (
        <div className="dash-card" style={{marginBottom:12}}>
          <div className="dash-card-title">
            이달 신규 등록
            <span style={{fontSize:11,color:"var(--blue)",background:"var(--blue-lt)",padding:"2px 8px",borderRadius:10,fontWeight:700}}>{newStudents.length}명</span>
          </div>
          <div style={{display:"flex",flexDirection:"column",gap:8}}>
            {newStudents.map(s => {
              const t = teachers.find(t => t.id === s.teacherId);
              const insts = (s.lessons || []).map(l => l.instrument).filter(Boolean);
              return (
                <div key={s.id} onClick={() => nav("students")} style={{display:"flex",alignItems:"center",gap:10,padding:"8px 10px",background:"var(--bg)",borderRadius:8,border:"1px solid var(--border)",cursor:"pointer",transition:"background .12s"}} onMouseEnter={e=>e.currentTarget.style.background="var(--blue-lt)"} onMouseLeave={e=>e.currentTarget.style.background="var(--bg)"}>
                  <Av photo={s.photo} name={s.name} size="av-sm" />
                  <div style={{flex:1,minWidth:0}}>
                    <div style={{fontSize:13,fontWeight:600,color:"var(--ink)"}}>{s.name}</div>
                    <div style={{fontSize:11,color:"var(--ink-60)"}}>{insts.join(" · ")}{t ? ` · ${t.name}` : ""}</div>
                  </div>
                  <span style={{fontSize:10,color:"var(--ink-30)",flexShrink:0}}>{fmtDateShort(new Date(s.createdAt).toISOString().slice(0,10))}</span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {pinnedNotices.length > 0 && (
        <div className="dash-section">
          {pinnedNotices.map(n => {
            const isExp = expandedNotices.has(n.id);
            const needsExp = n.content.length > 100 || !!n.imageBase64;
            return (
              <div key={n.id} className="notice-card pinned" style={{cursor:"default"}}>
                <div className="notice-title"><span className="pin-icon">📌</span>{n.title}</div>
                <div className="notice-meta">{n.authorName} · {fmtDateTime(n.createdAt)}</div>
                <div className="notice-body" style={{marginTop:6,...(!isExp && needsExp ? {display:"-webkit-box",WebkitLineClamp:3,WebkitBoxOrient:"vertical",overflow:"hidden"} : {})}}>{n.content}</div>
                {n.imageBase64 && (
                  <img src={n.imageBase64} alt="공지 이미지" style={{width:"100%",borderRadius:8,marginTop:8,objectFit:"cover",height:isExp?"auto":120}} />
                )}
                {needsExp && (
                  <button onClick={() => toggleNotice(n.id)} style={{background:"none",border:"none",color:"var(--blue)",fontSize:12,cursor:"pointer",padding:"4px 0",fontFamily:"inherit",marginTop:2}}>
                    {isExp ? "접기 ▴" : "더보기 ▾"}
                  </button>
                )}
              </div>
            );
          })}
        </div>
      )}

      {todayStudents.length > 0 && (
        <div className="dash-card">
          <div className="dash-card-title">
            오늘 레슨 ({TODAY_DAY}요일)
            <span style={{fontSize:12,color:"var(--gold-dk)",fontFamily:"inherit"}}>{todayStudents.length}명</span>
          </div>
          <div style={{display:"flex",flexWrap:"wrap",gap:6}}>
            {todayStudents.slice(0,8).map(s => {
              const att = todayAtt.find(a => a.studentId === s.id);
              return (
                <div key={s.id} onClick={() => nav("attendance")} style={{display:"flex",alignItems:"center",gap:6,background:"var(--bg)",padding:"6px 10px",border:"1px solid var(--border)",borderRadius:"var(--radius-sm)",cursor:"pointer",transition:"all .12s"}} onMouseEnter={e=>e.currentTarget.style.background="var(--blue-lt)"} onMouseLeave={e=>e.currentTarget.style.background="var(--bg)"}>
                  <Av photo={s.photo} name={s.name} size="av-sm" />
                  <div>
                    <div style={{fontSize:12,fontWeight:500}}>{s.name}</div>
                    <div style={{fontSize:10,color: att ? (att.status === "present" ? "var(--green)" : att.status === "absent" ? "var(--red)" : "var(--gold-dk)") : "var(--ink-30)"}}>
                      {att ? ATT_STATUS[att.status] : "미체크"}
                    </div>
                  </div>
                </div>
              );
            })}
            {todayStudents.length > 8 && (
              <button className="tl-plus-btn" onClick={() => setTodayListModal(true)}>
                +{todayStudents.length - 8}명 전체보기
              </button>
            )}
          </div>
        </div>
      )}

      {/* 오늘 레슨 전체 목록 모달 */}
      {todayListModal && (
        <div className="mb" onClick={e => e.target === e.currentTarget && setTodayListModal(false)}>
          <div className="modal">
            <div className="modal-h">
              <h2>오늘 레슨 · {TODAY_DAY}요일 <span style={{fontSize:13,color:"var(--gold-dk)",fontWeight:400}}>{todayStudents.length}명</span></h2>
              <button className="modal-close" onClick={() => setTodayListModal(false)}>{IC.x}</button>
            </div>
            <div className="modal-b" style={{paddingBottom:20}}>
              <div style={{fontSize:11.5,color:"var(--blue)",background:"var(--blue-lt)",padding:"8px 14px",borderRadius:8,marginBottom:12}}>
                학생을 클릭하면 출석 체크 화면으로 이동합니다.
              </div>
              {todayStudents.map(s => {
                const att = todayAtt.find(a => a.studentId === s.id);
                const t = teachers.find(t => t.id === s.teacherId);
                const insts = allLessonInsts(s);
                return (
                  <div key={s.id} className="tl-student-item" onClick={() => { nav("attendance"); setTodayListModal(false); }}>
                    <Av photo={s.photo} name={s.name} size="av-sm" />
                    <div style={{flex:1,minWidth:0}}>
                      <div style={{fontSize:13.5,fontWeight:600,color:"var(--ink)"}}>{s.name}</div>
                      <div style={{fontSize:11,color:"var(--ink-60)"}}>{insts.join(" · ")}{t && ` · ${t.name}`}</div>
                    </div>
                    <div style={{textAlign:"right",flexShrink:0}}>
                      <div style={{fontSize:11.5,fontWeight:600,color: att ? (att.status==="present"?"var(--green)":att.status==="absent"?"var(--red)":"var(--gold-dk)") : "var(--ink-30)"}}>
                        {att ? ATT_STATUS[att.status] : "미체크"}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {students.length > 0 && (
        <div className="dash-card">
          <div className="dash-card-title">분야별 수강 현황</div>
          {catCounts.map(({ cat, count }) => (
            <div key={cat} style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
              <div style={{ width: 64, fontSize: 11, color: "var(--ink-60)", flexShrink: 0 }}>{cat}</div>
              <div style={{ flex: 1, background: "var(--ink-10)", height: 6, borderRadius: 3 }}><div style={{ width: `${Math.min(100, (count / students.length) * 100)}%`, height: "100%", background: "linear-gradient(90deg,var(--blue),var(--blue-md))", borderRadius: 3 }} /></div>
              <div style={{ width: 24, textAlign: "right", fontSize: 13, fontWeight: 600, color: "var(--blue)" }}>{count}</div>
            </div>
          ))}
        </div>
      )}

      {/* Manager Reports — 매니저 보고사항 */}
      {canManageAll(currentUser.role) && (() => {
        const reports = attendance
          .filter(a => a.lessonNote && typeof a.lessonNote === "object" && a.lessonNote.managerReport && a.lessonNote.managerReport.trim())
          .sort((a, b) => (b.date || "").localeCompare(a.date || ""))
          .slice(0, 15)
          .map(a => {
            const s = students.find(st => st.id === a.studentId);
            const t = teachers.find(t => t.id === a.teacherId);
            return { ...a, studentName: s?.name || "?", teacherName: t?.name || "?" };
          });
        if (reports.length === 0) return null;
        return (
          <div className="dash-card">
            <div className="dash-card-title">매니저 보고사항</div>
            <div style={{fontSize:11,color:"var(--ink-30)",marginBottom:10}}>강사가 남긴 보고 내용 (최근 {reports.length}건)</div>
            {reports.map(r => (
              <div key={r.id} style={{background:"var(--gold-lt)",border:"1px solid rgba(245,168,0,.2)",borderRadius:8,padding:"10px 12px",marginBottom:6}}>
                <div style={{display:"flex",alignItems:"center",gap:6,marginBottom:4}}>
                  <span style={{fontSize:12,fontWeight:600,color:"var(--ink)"}}>{r.studentName}</span>
                  <span style={{fontSize:10.5,color:"var(--ink-30)"}}>· {r.teacherName} 강사 · {fmtDateShort(r.date)}</span>
                </div>
                <div style={{fontSize:12.5,color:"var(--ink-60)",lineHeight:1.6,whiteSpace:"pre-wrap"}}>{r.lessonNote.managerReport}</div>
                {r.lessonNote.progress && <div style={{fontSize:11,color:"var(--blue)",marginTop:4}}>진도: {r.lessonNote.progress}</div>}
              </div>
            ))}
          </div>
        );
      })()}

      {/* Monthly Attendance Stats */}
      {attendance.length > 0 && (
        <div className="dash-card">
          <div className="dash-card-title">이번달 출석 현황</div>
          {(() => {
            const { present: mPresent, absent: mAbsent, late: mLate, total: mTotal, rate: _mRate } = computeMonthlyAttStats(attendance, THIS_MONTH);
            const mRate = _mRate ?? 0;
            const monthAtt = attendance.filter(a => a.date?.startsWith(THIS_MONTH));
            const absentCounts = {};
            monthAtt.filter(a => a.status === "absent").forEach(a => { absentCounts[a.studentId] = (absentCounts[a.studentId] || 0) + 1; });
            const frequentAbsent = Object.entries(absentCounts).filter(([,c]) => c >= 2).map(([sid, c]) => ({ student: students.find(s => s.id === sid), count: c })).filter(x => x.student);
            const weeklyRates = computeWeeklyAttRates(attendance, THIS_MONTH);
            return (
              <>
                <div style={{display:"flex",gap:12,marginBottom:12,flexWrap:"wrap"}}>
                  <div style={{textAlign:"center",flex:1,minWidth:60}}>
                    <div style={{fontSize:24,fontWeight:700,color: mRate >= 80 ? "var(--green)" : mRate >= 60 ? "var(--gold-dk)" : "var(--red)",fontFamily:"'Noto Serif KR',serif"}}>{mRate}%</div>
                    <div style={{fontSize:10,color:"var(--ink-30)"}}>출석률</div>
                  </div>
                  <div style={{display:"flex",gap:6,alignItems:"center",flexWrap:"wrap"}}>
                    <div className="att-stat" style={{background:"var(--green-lt)",color:"var(--green)"}}>출석 {mPresent}</div>
                    <div className="att-stat" style={{background:"var(--red-lt)",color:"var(--red)"}}>결석 {mAbsent}</div>
                    <div className="att-stat" style={{background:"var(--gold-lt)",color:"var(--gold-dk)"}}>지각 {mLate}</div>
                  </div>
                </div>
                {weeklyRates.length >= 2 && (
                  <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:12}}>
                    <span style={{fontSize:10,color:"var(--ink-30)"}}>주차별 출석률</span>
                    <Sparkline data={weeklyRates} />
                    <span style={{fontSize:11,fontWeight:600,color:"var(--blue)"}}>{weeklyRates[weeklyRates.length-1]}%</span>
                  </div>
                )}
                {frequentAbsent.length > 0 && (
                  <div style={{background:"var(--red-lt)",border:"1px solid rgba(232,40,28,.15)",borderRadius:8,padding:"10px 12px",fontSize:12,color:"var(--red)"}}>
                    <div style={{fontWeight:600,marginBottom:4}}>⚠ 결석 2회 이상</div>
                    {frequentAbsent.map(({ student, count }) => (
                      <div key={student.id} style={{display:"flex",alignItems:"center",gap:6,marginTop:4}}>
                        <span style={{fontWeight:500}}>{student.name}</span>
                        <span style={{fontSize:11}}>이번달 {count}회 결석</span>
                      </div>
                    ))}
                  </div>
                )}
              </>
            );
          })()}
        </div>
      )}
    </div>
  );
}
