import { useState } from "react";
import { TODAY_STR, THIS_MONTH, IC } from "../../constants.jsx";
import { uid, fmtDateShort, canManageAll, monthLabel, formatLessonNoteSummary } from "../../utils.js";
import { Av } from "../shared/CommonUI.jsx";

// ── LESSON NOTE MODAL ─────────────────────────────────────────────────────────
function LessonNoteModal({ student, teacher, date, existingNote, onSave, onClose, inlineMode, comments, onAddComment, onDeleteComment, currentUserType, currentUserName, currentUserId }) {
  const defaultNote = { progress: "", content: "", assignment: "", makeupNeeded: false, makeupPlan: "", condition: "good", instrumentRental: false, managerReport: "", memo: "" };
  const parseNote = (n) => {
    if (!n) return { ...defaultNote };
    if (typeof n === "object" && n.progress !== undefined) return { ...defaultNote, ...n };
    // Legacy: plain text note
    return { ...defaultNote, content: String(n) };
  };
  const [form, setForm] = useState(parseNote(existingNote));
  const [saving, setSaving] = useState(false);
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));
  const conditionOpts = [
    { k: "excellent", l: "매우 좋음", color: "var(--blue)" },
    { k: "good", l: "좋음", color: "var(--green)" },
    { k: "normal", l: "보통", color: "var(--gold-dk)" },
    { k: "poor", l: "부진", color: "var(--red)" },
  ];
  const handleSave = async () => {
    setSaving(true);
    try { await onSave(form); } finally { setSaving(false); }
  };
  const todayLessons = student ? (student.lessons || []).filter(l => {
    const dayName = ["일","월","화","수","목","금","토"][new Date(date + "T00:00:00").getDay()];
    return (l.schedule || []).some(sc => sc.day === dayName);
  }) : [];

  // inlineMode: 그룹 레슨노트 모달 내부에 임베드될 때 — 자체 mb/modal 래퍼 없이 렌더
  if (inlineMode) {
    return (
      <div>
        {/* 컨디션 */}
        <div className="fg"><label className="fg-label">컨디션</label><div className="ftabs">{conditionOpts.map(o=><button key={o.k} className={`ftab ${form.condition===o.k?"active":""}`} onClick={()=>set("condition",o.k)} style={{flex:1,textAlign:"center",fontSize:12,padding:"7px 4px"}}>{o.l}</button>)}</div></div>
        <div className="fg"><label className="fg-label">진도</label><input className="inp" value={form.progress} onChange={e=>set("progress",e.target.value)} placeholder="오늘 배운 내용, 진도" /></div>
        <div className="fg"><label className="fg-label">수업 내용</label><textarea className="inp" value={form.content} onChange={e=>set("content",e.target.value)} placeholder="수업 세부 내용" rows={3} /></div>
        <div className="fg"><label className="fg-label">과제</label><input className="inp" value={form.assignment} onChange={e=>set("assignment",e.target.value)} placeholder="다음 수업까지 해올 과제" /></div>
        <div className="fg"><label className="fg-label">메모</label><input className="inp" value={form.memo} onChange={e=>set("memo",e.target.value)} placeholder="기타 참고사항" /></div>
        <div style={{display:"flex",gap:8,marginTop:8}}>
          <button className="btn btn-secondary" style={{flex:1}} onClick={onClose}>취소</button>
          <button className="btn btn-primary" style={{flex:1}} onClick={handleSave} disabled={saving}>{saving ? "저장 중…" : "전체 저장"}</button>
        </div>
      </div>
    );
  }

  return (
    <div className="mb" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal">
        <div className="modal-h"><h2>레슨 노트</h2><button className="modal-close" onClick={onClose}>{IC.x}</button></div>
        <div className="modal-b">
          {/* Student info header */}
          <div style={{display:"flex",alignItems:"center",gap:10,marginBottom:16,padding:"12px 14px",background:"var(--bg)",borderRadius:8,border:"1px solid var(--border)"}}>
            <Av photo={student?.photo} name={student?.name} size="av-sm" />
            <div style={{flex:1}}>
              <div style={{fontSize:14,fontWeight:600}}>{student?.name}</div>
              <div style={{fontSize:12,color:"var(--blue)"}}>{todayLessons.map(l=>l.instrument).join(", ")}{teacher && ` · ${teacher.name} 강사`}</div>
              <div style={{fontSize:11,color:"var(--ink-30)"}}>{date}</div>
            </div>
          </div>
          {/* Condition */}
          <div className="fg">
            <label className="fg-label">회원 컨디션 · 태도</label>
            <div style={{display:"flex",gap:6}}>
              {conditionOpts.map(o => (
                <button key={o.k} className={`ftab ${form.condition===o.k?"active":""}`} onClick={()=>set("condition",o.k)} style={{flex:1,textAlign:"center",fontSize:12,padding:"7px 4px"}}>{o.l}</button>
              ))}
            </div>
          </div>
          {/* Progress */}
          <div className="fg">
            <label className="fg-label">수업 진도</label>
            <input className="inp" value={form.progress} onChange={e=>set("progress",e.target.value)} placeholder="예: 산조 해금 — 진양조 4장 ~ 중머리 1장" />
          </div>
          {/* Lesson Content */}
          <div className="fg">
            <label className="fg-label">수업 내용</label>
            <textarea className="inp" value={form.content} onChange={e=>set("content",e.target.value)} placeholder="오늘 수업에서 다룬 내용을 기록하세요." rows={3} />
          </div>
          {/* Assignment */}
          <div className="fg">
            <label className="fg-label">과제</label>
            <input className="inp" value={form.assignment} onChange={e=>set("assignment",e.target.value)} placeholder="다음 수업까지 연습할 내용" />
          </div>
          {/* Makeup needed */}
          <div className="fg">
            <div style={{display:"flex",alignItems:"center",gap:8,cursor:"pointer",marginBottom:form.makeupNeeded?8:0}} onClick={()=>set("makeupNeeded",!form.makeupNeeded)}>
              <div style={{width:20,height:20,border:"1.5px solid var(--border)",borderRadius:6,display:"flex",alignItems:"center",justifyContent:"center",background:form.makeupNeeded?"var(--blue)":"var(--paper)",transition:"all .12s"}}>{form.makeupNeeded && <span style={{color:"#fff",fontSize:12,fontWeight:700}}>✓</span>}</div>
              <span style={{fontSize:13,color:"var(--ink-60)"}}>보강 필요</span>
            </div>
            {form.makeupNeeded && <input className="inp" value={form.makeupPlan} onChange={e=>set("makeupPlan",e.target.value)} placeholder="보강 일정 및 계획" />}
          </div>
          {/* Instrument Rental */}
          <div className="fg" style={{display:"flex",alignItems:"center",gap:8,cursor:"pointer"}} onClick={()=>set("instrumentRental",!form.instrumentRental)}>
            <div style={{width:20,height:20,border:"1.5px solid var(--border)",borderRadius:6,display:"flex",alignItems:"center",justifyContent:"center",background:form.instrumentRental?"var(--blue)":"var(--paper)",transition:"all .12s"}}>{form.instrumentRental && <span style={{color:"#fff",fontSize:12,fontWeight:700}}>✓</span>}</div>
            <span style={{fontSize:13,color:"var(--ink-60)"}}>악기 대여 중</span>
          </div>
          <div className="divider" />
          {/* Memo */}
          <div className="fg">
            <label className="fg-label">비고</label>
            <input className="inp" value={form.memo} onChange={e=>set("memo",e.target.value)} placeholder="기타 참고사항" />
          </div>
          {/* Manager Report */}
          <div className="fg">
            <label className="fg-label">매니저 보고사항</label>
            <textarea className="inp" value={form.managerReport} onChange={e=>set("managerReport",e.target.value)} placeholder="매니저에게 전달할 사항 (학부모 상담 필요, 수강료 관련 등)" rows={2} style={{background:"var(--gold-lt)",borderColor:"rgba(245,168,0,.3)"}} />
          </div>
        </div>
        <div className="modal-f" style={{flexDirection:"column",gap:0,padding:0}}>
          {/* 댓글 패널 */}
          {(comments?.length > 0 || onAddComment) && (
            <div style={{padding:"10px 20px",borderBottom:"1px solid var(--border)"}}>
              <NoteCommentsPanel
                comments={comments || []}
                onAddComment={onAddComment}
                onDeleteComment={onDeleteComment}
                authorType={currentUserType || "teacher"}
                authorName={currentUserName || (teacher?.name || "강사")}
                authorId={currentUserId}
                viewerRole={currentUserType}
                compact
              />
            </div>
          )}
          <div style={{display:"flex",gap:8,padding:"14px 20px",paddingBottom:"calc(24px + var(--safe-b))"}}>
            <button className="btn btn-secondary" style={{flex:1}} onClick={onClose}>취소</button>
            <button className="btn btn-primary" style={{flex:1}} onClick={handleSave} disabled={saving}>{saving ? "저장 중…" : "저장"}</button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── 레슨노트 댓글 패널 (강사 앱 — 레슨노트 모달 하단 / 포털 — 레슨노트 카드) ──
function NoteCommentsPanel({ comments = [], onAddComment, onDeleteComment, authorType, authorName, authorId, viewerRole, compact }) {
  const [text, setText] = useState("");
  const [saving, setSaving] = useState(false);
  const [confirmDel, setConfirmDel] = useState(null);

  const handleSend = async () => {
    if (!text.trim() || saving) return;
    setSaving(true);
    try {
      await onAddComment({ id: uid(), text: text.trim(), authorType, authorName, authorId, createdAt: Date.now() });
      setText("");
    } finally { setSaving(false); }
  };

  const canDelete = (c) => {
    if (c.deletedAt) return false;
    if (!onDeleteComment) return false;
    const isAdmin = viewerRole === "admin" || viewerRole === "manager";
    if (isAdmin) return true;
    // 작성자 본인: authorId 우선, fallback으로 authorName + authorType
    if (authorId && c.authorId) return c.authorId === authorId;
    return c.authorType === authorType && c.authorName === authorName;
  };

  return (
    <div style={{borderTop:"1px solid var(--border)",paddingTop:10,marginTop:compact?8:12}}>
      {/* 댓글 목록 */}
      {comments.length > 0 && (
        <div style={{marginBottom:8}}>
          {comments.map(c => {
            const isDeleted = !!c.deletedAt;
            const isStaffViewer = viewerRole === "admin" || viewerRole === "manager";
            // 삭제된 댓글: staff에게는 회색+취소선으로 원본 노출, 일반 사용자에게는 placeholder
            if (isDeleted && !isStaffViewer) {
              return (
                <div key={c.id} style={{display:"flex",gap:8,marginBottom:6,alignItems:"center"}}>
                  <div style={{width:26,height:26,borderRadius:13,background:"var(--ink-10)",flexShrink:0}} />
                  <div style={{flex:1,fontSize:12,color:"var(--ink-30)",fontStyle:"italic",padding:"6px 10px",background:"var(--bg)",borderRadius:8}}>삭제된 댓글입니다</div>
                </div>
              );
            }
            const isTeacherRole = c.authorType === "teacher";
            const isManagerRole = c.authorType === "manager" || c.authorType === "admin";
            const isStaff = isTeacherRole || isManagerRole;
            const roleLabel = isManagerRole ? "매니저" : isTeacherRole ? "강사" : null;
            const avatarBg = isManagerRole ? "var(--gold-lt)" : isTeacherRole ? "var(--blue-lt)" : "var(--green-lt)";
            const avatarColor = isManagerRole ? "var(--gold-dk)" : isTeacherRole ? "var(--blue)" : "var(--green)";
            const nameColor = isManagerRole ? "var(--gold-dk)" : isTeacherRole ? "var(--blue)" : "var(--green)";
            return (
              <div key={c.id} style={{display:"flex",gap:8,marginBottom:6,alignItems:"flex-start",opacity:isDeleted?0.55:1}}>
                <div style={{width:26,height:26,borderRadius:13,background:avatarBg,display:"flex",alignItems:"center",justifyContent:"center",fontSize:10,fontWeight:700,color:avatarColor,flexShrink:0}}>
                  {isStaff ? IC.teacher : (c.authorName ? c.authorName.slice(0,1) : "?")}
                </div>
                <div style={{flex:1,background:"var(--bg)",borderRadius:8,padding:"6px 10px"}}>
                  <div style={{display:"flex",alignItems:"center",gap:5,marginBottom:2,flexWrap:"wrap"}}>
                    <span style={{fontSize:11,fontWeight:600,color:nameColor}}>{c.authorName}</span>
                    {roleLabel && <span style={{fontSize:10,fontWeight:600,color:avatarColor,background:avatarBg,padding:"1px 6px",borderRadius:6}}>{roleLabel}</span>}
                    <span style={{fontSize:10,color:"var(--ink-30)"}}>{fmtDateShort(c.createdAt)}</span>
                    {isDeleted && <span style={{fontSize:9,fontWeight:600,color:"var(--red)",background:"var(--red-lt)",padding:"1px 6px",borderRadius:6}}>🗑 삭제됨</span>}
                    {!isDeleted && canDelete(c) && (
                      confirmDel === c.id ? (
                        <span style={{display:"inline-flex",alignItems:"center",gap:4,marginLeft:"auto"}}>
                          <button onClick={() => setConfirmDel(null)} style={{background:"none",border:"1px solid var(--border)",borderRadius:5,padding:"1px 6px",fontSize:9,cursor:"pointer",fontFamily:"inherit",color:"var(--ink-30)"}}>취소</button>
                          <button onClick={() => { onDeleteComment(c.id); setConfirmDel(null); }} style={{background:"var(--red)",border:"none",borderRadius:5,padding:"1px 6px",fontSize:9,cursor:"pointer",fontFamily:"inherit",color:"#fff",fontWeight:600}}>삭제</button>
                        </span>
                      ) : (
                        <button onClick={() => setConfirmDel(c.id)} style={{marginLeft:"auto",background:"none",border:"none",fontSize:11,color:"var(--ink-30)",cursor:"pointer",fontFamily:"inherit",padding:"0 2px"}} title="삭제">×</button>
                      )
                    )}
                  </div>
                  <div style={{fontSize:12.5,color:isDeleted?"var(--ink-30)":"var(--ink)",lineHeight:1.5,whiteSpace:"pre-wrap",textDecoration:isDeleted?"line-through":"none"}}>{c.text}</div>
                </div>
              </div>
            );
          })}
        </div>
      )}
      {/* 댓글 입력 */}
      {onAddComment && (
        <div style={{display:"flex",gap:8,alignItems:"center"}}>
          <input
            className="inp"
            style={{flex:1,fontSize:12.5,padding:"8px 12px",borderRadius:8}}
            placeholder="댓글을 입력하세요..."
            value={text}
            onChange={e => setText(e.target.value)}
            onKeyDown={e => e.key === "Enter" && !e.shiftKey && handleSend()}
            maxLength={200}
          />
          <button
            style={{padding:"8px 14px",background:text.trim()?"var(--blue)":"var(--border)",color:text.trim()?"#fff":"var(--ink-30)",border:"none",borderRadius:8,fontSize:12,fontWeight:600,cursor:text.trim()?"pointer":"default",transition:"all .12s",flexShrink:0,fontFamily:"inherit"}}
            onClick={handleSend}
            disabled={!text.trim() || saving}
          >{saving ? "…" : "전송"}</button>
        </div>
      )}
    </div>
  );
}

// ── ATTENDANCE VIEW ───────────────────────────────────────────────────────────

// 그룹 감지 함수 — 추후 rye-groups 컬렉션으로 교체 가능하도록 격리
// 같은 teacherId + 같은 요일 + 정확히 같은 시간 → 자동 그룹
function detectLessonGroups(students, dayName, filterTeacher) {
  const grouped = {};
  students.forEach(s => {
    (s.lessons || []).forEach(l => {
      if (filterTeacher !== "all" && l.teacherId !== filterTeacher && s.teacherId !== filterTeacher) return;
      (l.schedule || []).forEach(sc => {
        if (sc.day !== dayName) return;
        // ★ v12.1: 기관 가상회원은 항상 단독 그룹 (s.id를 키에 포함시켜 격리)
        const instPrefix = s.isInstitution ? `inst_${s.id}__` : "";
        const key = `${instPrefix}${l.teacherId || s.teacherId}__${sc.time || ""}__${l.instrument}`;
        if (!grouped[key]) grouped[key] = { teacherId: l.teacherId || s.teacherId, time: sc.time || "", instrument: l.instrument, students: [] };
        if (!grouped[key].students.find(x => x.id === s.id)) grouped[key].students.push(s);
      });
    });
  });
  // 2명 이상 = 그룹, 1명 = 개인
  return Object.entries(grouped).map(([key, g]) => ({ ...g, key, isGroup: g.students.length > 1 }))
    .sort((a, b) => (a.time || "").localeCompare(b.time || ""));
}

function AttendanceView({ students, teachers, currentUser, attendance, onSaveAttendance, categories, scheduleOverrides, onSaveScheduleOverride }) {
  const [date, setDate] = useState(TODAY_STR);
  const [filterTeacher, setFilterTeacher] = useState(currentUser.role === "teacher" ? currentUser.id : "all");
  const [noteModal, setNoteModal] = useState(null); // { studentId } | { groupKey, studentIds }
  const [absenceConfirm, setAbsenceConfirm] = useState(null);
  const [rescheduleModal, setRescheduleModal] = useState(null);
  const [rescheduleForm, setRescheduleForm] = useState({ newDate: "", newTime: "" });
  const [collapsedGroups, setCollapsedGroups] = useState({});
  const dayName = ["일","월","화","수","목","금","토"][new Date(date + "T00:00:00").getDay()];

  const dayStudents = students.filter(s => {
    if (filterTeacher !== "all" && s.teacherId !== filterTeacher && !(s.lessons||[]).some(l=>l.teacherId===filterTeacher)) return false;
    return (s.lessons || []).some(l => (l.schedule || []).some(sc => sc.day === dayName));
  });

  const lessonGroups = detectLessonGroups(dayStudents, dayName, filterTeacher);

  const getStatus = (studentId) => {
    const rec = attendance.find(a => a.studentId === studentId && a.date === date);
    return rec?.status || null;
  };

  const getRecord = (studentId) => attendance.find(a => a.studentId === studentId && a.date === date);

  const saveLessonNote = async (studentId, noteData) => {
    const existing = attendance.find(a => a.studentId === studentId && a.date === date);
    if (existing) {
      await onSaveAttendance(attendance.map(a => a.id === existing.id ? { ...a, lessonNote: noteData, note: formatLessonNoteSummary(noteData), updatedAt: Date.now() } : a));
    } else {
      // Create a record with note but no status yet
      await onSaveAttendance([...attendance, { id: uid(), studentId, teacherId: currentUser.id, date, status: "present", lessonNote: noteData, note: formatLessonNoteSummary(noteData), createdAt: Date.now() }]);
    }
    setNoteModal(null);
  };

  const toggleStatus = async (studentId, status) => {
    const existing = attendance.find(a => a.studentId === studentId && a.date === date);
    if (existing?.status === status) {
      await onSaveAttendance(attendance.filter(a => a.id !== existing.id));
    } else if (existing) {
      await onSaveAttendance(attendance.map(a => a.id === existing.id ? { ...a, status, updatedAt: Date.now() } : a));
    } else {
      await onSaveAttendance([...attendance, { id: uid(), studentId, teacherId: currentUser.id, date, status, createdAt: Date.now() }]);
    }
  };

  // 그룹 일괄 출석 처리
  const toggleGroupStatus = async (studentIds, status) => {
    let updated = [...attendance];
    for (const studentId of studentIds) {
      const existing = updated.find(a => a.studentId === studentId && a.date === date);
      if (existing?.status === status) {
        updated = updated.filter(a => a.id !== existing.id);
      } else if (existing) {
        updated = updated.map(a => a.id === existing.id ? { ...a, status, updatedAt: Date.now() } : a);
      } else {
        updated = [...updated, { id: uid(), studentId, teacherId: currentUser.id, date, status, createdAt: Date.now() }];
      }
    }
    await onSaveAttendance(updated);
  };

  // 그룹 레슨노트 일괄 저장 — 각 학생 record에 동일 내용 개별 저장
  const saveGroupLessonNote = async (studentIds, noteData) => {
    let updated = [...attendance];
    for (const studentId of studentIds) {
      const existing = updated.find(a => a.studentId === studentId && a.date === date);
      if (existing) {
        updated = updated.map(a => a.id === existing.id ? { ...a, lessonNote: noteData, note: formatLessonNoteSummary(noteData), updatedAt: Date.now() } : a);
      } else {
        updated = [...updated, { id: uid(), studentId, teacherId: currentUser.id, date, status: "present", lessonNote: noteData, note: formatLessonNoteSummary(noteData), createdAt: Date.now() }];
      }
    }
    await onSaveAttendance(updated);
    setNoteModal(null);
  };

  const toggleGroupCollapse = (key) => setCollapsedGroups(prev => ({ ...prev, [key]: !prev[key] }));

  // ★ v12.1: 기관 가상회원 출석 레코드의 참석 인원 업데이트
  const updateParticipantCount = async (studentId, count) => {
    const existing = attendance.find(a => a.studentId === studentId && a.date === date);
    if (existing) {
      await onSaveAttendance(attendance.map(a => a.id === existing.id ? { ...a, participantCount: count, updatedAt: Date.now() } : a));
    } else {
      // 출석 상태 없이 참석 인원만 기록 — present로 자동 생성
      await onSaveAttendance([...attendance, { id: uid(), studentId, teacherId: currentUser.id, date, status: "present", participantCount: count, createdAt: Date.now() }]);
    }
  };

  const daySummary = {
    present: dayStudents.filter(s => getStatus(s.id) === "present").length,
    absent: dayStudents.filter(s => getStatus(s.id) === "absent").length,
    late: dayStudents.filter(s => getStatus(s.id) === "late").length,
    excused: dayStudents.filter(s => getStatus(s.id) === "excused").length,
    none: dayStudents.filter(s => !getStatus(s.id)).length,
  };

  const noteStudent = noteModal?.studentId ? students.find(s => s.id === noteModal.studentId) : null;
  const noteTeacher = noteStudent ? teachers.find(t => t.id === noteStudent.teacherId) : null;
  const noteRecord = noteModal?.studentId ? getRecord(noteModal.studentId) : null;

  return (
    <div>
      <div className="ph"><div><h1>출석 체크</h1><div className="ph-sub">{dayName}요일 · {dayStudents.length}명</div></div></div>
      <div style={{display:"flex",gap:8,marginBottom:14,flexWrap:"wrap"}}>
        <input className="inp" type="date" value={date} onChange={e => setDate(e.target.value)} style={{flex:1,maxWidth:180}} />
        {canManageAll(currentUser.role) && (
          <select className="sel" value={filterTeacher} onChange={e => setFilterTeacher(e.target.value)} style={{flex:1,maxWidth:180}}>
            <option value="all">전체 강사</option>
            {teachers.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
          </select>
        )}
      </div>
      <div className="att-summary">
        <div className="att-stat" style={{background:"var(--green-lt)",color:"var(--green)"}}>✓ {daySummary.present}</div>
        <div className="att-stat" style={{background:"var(--red-lt)",color:"var(--red)"}}>✗ {daySummary.absent}</div>
        <div className="att-stat" style={{background:"var(--gold-lt)",color:"var(--gold-dk)"}}>△ {daySummary.late}</div>
        <div className="att-stat" style={{background:"var(--blue-lt)",color:"var(--blue)"}}>○ {daySummary.excused}</div>
        {daySummary.none > 0 && <div className="att-stat" style={{background:"var(--ink-10)",color:"var(--ink-30)"}}>미체크 {daySummary.none}</div>}
      </div>
      {dayStudents.length === 0 ? (
        <div className="empty"><div className="empty-icon">✓</div><div className="empty-txt">{dayName}요일 수업이 없습니다.</div></div>
      ) : (
        lessonGroups.map(group => {
          const isCollapsed = collapsedGroups[group.key];
          const teacher = teachers.find(t => t.id === group.teacherId);
          const groupStatuses = group.students.map(s => getStatus(s.id));
          const allPresent = groupStatuses.every(st => st === "present");
          const allAbsent = groupStatuses.every(st => st === "absent");

          return (
            <div key={group.key} style={{marginBottom: group.isGroup ? 12 : 0}}>
              {/* 그룹 헤더 (2명 이상일 때만) */}
              {group.isGroup && (
                <div style={{display:"flex",alignItems:"center",gap:8,padding:"8px 14px",background:"var(--blue-lt)",borderRadius:"var(--radius-sm) var(--radius-sm) 0 0",border:"1px solid rgba(43,58,159,.12)",borderBottom:"none",cursor:"pointer"}} onClick={() => toggleGroupCollapse(group.key)}>
                  <span style={{fontSize:11,color:"var(--blue)",fontWeight:700,flex:1}}>
                    {group.instrument} · {group.time && `${group.time} · `}{teacher?.name || ""} 강사 · {group.students.length}명
                  </span>
                  <span style={{fontSize:10,color:"var(--blue-md)"}}>{isCollapsed ? "▶ 펼치기" : "▼ 접기"}</span>
                </div>
              )}
              {/* 그룹 일괄 처리 버튼 */}
              {group.isGroup && !isCollapsed && (
                <div style={{display:"flex",gap:6,padding:"8px 14px",background:"#f0f3ff",border:"1px solid rgba(43,58,159,.12)",borderBottom:"none",flexWrap:"wrap"}}>
                  <span style={{fontSize:11,color:"var(--ink-60)",alignSelf:"center",marginRight:2}}>일괄:</span>
                  <button className={`att-btn btn-xs ${allPresent?"present":""}`} style={{fontSize:11,padding:"4px 10px",height:"auto"}} onClick={() => toggleGroupStatus(group.students.map(s=>s.id), "present")}><span>✓</span> 출석</button>
                  <button className={`att-btn btn-xs ${allAbsent?"absent":""}`} style={{fontSize:11,padding:"4px 10px",height:"auto"}} onClick={() => toggleGroupStatus(group.students.map(s=>s.id), "absent")}><span>✗</span> 결석</button>
                  <button className="att-btn btn-xs" style={{fontSize:11,padding:"4px 10px",height:"auto"}} onClick={() => toggleGroupStatus(group.students.map(s=>s.id), "late")}><span>△</span> 지각</button>
                  <button className="att-btn btn-xs" style={{fontSize:11,padding:"4px 10px",height:"auto"}} onClick={() => toggleGroupStatus(group.students.map(s=>s.id), "excused")}><span>○</span> 보강</button>
                  <button className="btn btn-xs btn-green" style={{fontSize:11,marginLeft:"auto"}} onClick={() => setNoteModal({ groupKey: group.key, studentIds: group.students.map(s=>s.id), instrument: group.instrument })}>
                    📝 그룹 레슨노트
                  </button>
                </div>
              )}
              {/* 개별 학생 행 */}
              {!isCollapsed && group.students.map(s => {
                const st = getStatus(s.id);
                const rec = getRecord(s.id);
                const todayLessons = (s.lessons || []).filter(l => (l.schedule || []).some(sc => sc.day === dayName));
                const hasNote = rec?.lessonNote || rec?.note;
                const isInst = s.isInstitution;
                return (
                  <div key={s.id} className="att-row" style={{flexWrap:"wrap", borderRadius: group.isGroup ? 0 : "var(--radius)", borderTop: group.isGroup ? "none" : undefined, border: group.isGroup ? "1px solid rgba(43,58,159,.08)" : undefined, background: isInst ? "rgba(43,58,159,.02)" : undefined}}>
                    <Av photo={s.photo} name={s.name} size="av-sm" />
                    <div style={{flex:1,minWidth:0}}>
                      <div style={{fontSize:13.5,fontWeight:600,display:"flex",alignItems:"center",gap:4}}>
                        {isInst && <span style={{fontSize:10,padding:"1px 5px",background:"var(--blue-lt)",color:"var(--blue)",borderRadius:4,fontWeight:700}}>🏢 기관</span>}
                        <span style={{whiteSpace:"nowrap",overflow:"hidden",textOverflow:"ellipsis"}}>{s.name}</span>
                      </div>
                      <div style={{fontSize:11,color:"var(--ink-30)",whiteSpace:"nowrap",overflow:"hidden",textOverflow:"ellipsis"}}>
                        {todayLessons.map(l => l.instrument).join(", ")}
                        {!group.isGroup && teacher && ` · ${teacher.name}`}
                        {isInst && s.participantCount > 0 && ` · 정원 ${s.participantCount}명`}
                      </div>
                    </div>
                    <div className="att-btns">
                      <button className={`att-btn ${st === "present" ? "present" : ""}`} onClick={() => toggleStatus(s.id, "present")}><span className="att-icon">✓</span><span className="att-label">출석</span></button>
                      <button className={`att-btn ${st === "absent" ? "absent" : ""}`} onClick={() => { if (st === "absent") { toggleStatus(s.id, "absent"); } else { setAbsenceConfirm({ studentId: s.id, studentName: s.name, lessons: todayLessons }); } }}><span className="att-icon">✗</span><span className="att-label">결석</span></button>
                      <button className={`att-btn ${st === "late" ? "late" : ""}`} onClick={() => toggleStatus(s.id, "late")}><span className="att-icon">△</span><span className="att-label">지각</span></button>
                      <button className={`att-btn ${st === "excused" ? "excused" : ""}`} onClick={() => toggleStatus(s.id, "excused")}><span className="att-icon">○</span><span className="att-label">보강</span></button>
                      <button className="att-btn cancelled" title="휴강 — 보강 일정 등록" onClick={() => {
                        toggleStatus(s.id, "absent");
                        setRescheduleModal({ studentId: s.id, studentName: s.name, instrument: todayLessons.map(l=>l.instrument).join(", "), originalDate: date, originalDay: dayName });
                        setRescheduleForm({ newDate: "", newTime: "" });
                      }}><span className="att-icon">🚫</span><span className="att-label">휴강</span></button>
                    </div>
                    {/* ★ v12.1: 기관 전용 — 참석 인원 입력 */}
                    {isInst && (
                      <div style={{width:"100%",display:"flex",alignItems:"center",gap:8,marginTop:6,padding:"6px 10px",background:"rgba(43,58,159,.04)",borderRadius:6}}>
                        <span style={{fontSize:11,color:"var(--blue)",fontWeight:600}}>참석 인원</span>
                        <input
                          className="inp"
                          inputMode="numeric"
                          style={{maxWidth:70,padding:"4px 8px",fontSize:12,textAlign:"center"}}
                          value={rec?.participantCount ?? ""}
                          onChange={e => updateParticipantCount(s.id, parseInt(e.target.value.replace(/[^\d]/g,"")) || 0)}
                          placeholder="0"
                        />
                        <span style={{fontSize:11,color:"var(--ink-30)"}}>명{s.participantCount > 0 && ` / 정원 ${s.participantCount}명`}</span>
                      </div>
                    )}
                    <div style={{width:"100%",display:"flex",justifyContent:"flex-end",marginTop:4}}>
                      <button className={`btn btn-xs ${hasNote ? "btn-green" : "btn-secondary"}`} onClick={() => setNoteModal({ studentId: s.id })} style={{fontSize:11,gap:4}}>
                        <span>📝</span> {hasNote ? "레슨노트 수정" : "레슨노트 작성"}
                      </button>
                    </div>
                  </div>
                );
              })}
              {/* 그룹 하단 라운드 마감 */}
              {group.isGroup && !isCollapsed && <div style={{height:6,background:"var(--blue-lt)",borderRadius:"0 0 var(--radius-sm) var(--radius-sm)",border:"1px solid rgba(43,58,159,.08)",borderTop:"none"}} />}
            </div>
          );
        })
      )}

      {/* 개별 레슨노트 모달 */}
      {noteModal?.studentId && noteStudent && (
        <LessonNoteModal
          student={noteStudent}
          teacher={noteTeacher}
          date={date}
          existingNote={noteRecord?.lessonNote || noteRecord?.note}
          comments={noteRecord?.comments || []}
          onAddComment={async (comment) => {
            const rec = getRecord(noteModal.studentId);
            if (rec) {
              const updated = attendance.map(a => a.id === rec.id ? { ...a, comments: [...(a.comments||[]), comment] } : a);
              await onSaveAttendance(updated);
            }
          }}
          onDeleteComment={async (commentId) => {
            const rec = getRecord(noteModal.studentId);
            if (rec) {
              const updated = attendance.map(a => a.id !== rec.id ? a : {
                ...a,
                comments: (a.comments||[]).map(c => c.id === commentId ? { ...c, deletedAt: Date.now(), deletedBy: currentUser.id } : c)
              });
              await onSaveAttendance(updated);
            }
          }}
          currentUserType={currentUser.role}
          currentUserName={currentUser.name}
          currentUserId={currentUser.id}
          onSave={async (noteData) => { await saveLessonNote(noteModal.studentId, noteData); }}
          onClose={() => setNoteModal(null)}
        />
      )}

      {/* 그룹 레슨노트 모달 */}
      {noteModal?.groupKey && (
        <div className="mb" onClick={e => e.target === e.currentTarget && setNoteModal(null)}>
          <div className="modal">
            <div className="modal-h">
              <h2>그룹 레슨노트</h2>
              <button className="modal-close" onClick={() => setNoteModal(null)}>{IC.x}</button>
            </div>
            <div className="modal-b" style={{paddingBottom:20}}>
              <div style={{background:"var(--blue-lt)",border:"1px solid rgba(43,58,159,.12)",borderRadius:8,padding:"10px 14px",marginBottom:14,fontSize:12,color:"var(--blue)"}}>
                <strong>{noteModal.instrument}</strong> · {noteModal.studentIds.length}명 전원에게 동일한 레슨노트가 저장됩니다.
              </div>
              <LessonNoteModal
                student={{ name: `${noteModal.instrument} 그룹 (${noteModal.studentIds.length}명)`, lessons: [] }}
                teacher={teachers.find(t => t.id === currentUser.id)}
                date={date}
                existingNote={null}
                onSave={async (noteData) => { await saveGroupLessonNote(noteModal.studentIds, noteData); }}
                onClose={() => setNoteModal(null)}
                inlineMode
              />
            </div>
          </div>
        </div>
      )}

      {/* Absence Confirmation Dialog */}
      {absenceConfirm && (
        <div className="mb" onClick={e => e.target === e.currentTarget && setAbsenceConfirm(null)}>
          <div className="modal" style={{maxWidth:380}}>
            <div className="modal-h"><h2>결석 처리</h2><button className="modal-close" onClick={() => setAbsenceConfirm(null)}>{IC.x}</button></div>
            <div className="modal-b" style={{paddingBottom:20}}>
              <div style={{background:"var(--red-lt)",border:"1px solid rgba(232,40,28,.15)",borderRadius:8,padding:"14px 16px",fontSize:13,color:"var(--red)",lineHeight:1.7,marginBottom:16}}>
                <strong>{absenceConfirm.studentName}</strong>님을<br/><strong>{date}</strong> ({dayName}요일) 결석 처리합니다.
              </div>
              <div style={{fontSize:12.5,color:"var(--ink-60)",lineHeight:1.6}}>결석 처리 후 보강 일정을 바로 등록하시겠습니까?</div>
            </div>
            <div className="modal-f" style={{paddingBottom:"calc(14px + var(--safe-b))"}}>
              <button className="btn btn-secondary" onClick={() => { toggleStatus(absenceConfirm.studentId, "absent"); setAbsenceConfirm(null); }}>결석만 처리</button>
              <button className="btn btn-primary" onClick={() => {
                toggleStatus(absenceConfirm.studentId, "absent");
                const lessons = absenceConfirm.lessons || [];
                setRescheduleModal({ studentId: absenceConfirm.studentId, studentName: absenceConfirm.studentName, instrument: lessons.map(l=>l.instrument).join(", "), originalDate: date, originalDay: dayName });
                setRescheduleForm({ newDate: "", newTime: "" });
                setAbsenceConfirm(null);
              }}>결석 + 보강 등록</button>
            </div>
          </div>
        </div>
      )}

      {/* Reschedule Modal (mini) */}
      {rescheduleModal && (
        <div className="mb" onClick={e => e.target === e.currentTarget && setRescheduleModal(null)}>
          <div className="modal" style={{maxWidth:420}}>
            <div className="modal-h"><h2>보강 일정 등록</h2><button className="modal-close" onClick={() => setRescheduleModal(null)}>{IC.x}</button></div>
            <div className="modal-b" style={{paddingBottom:20}}>
              <div style={{display:"flex",alignItems:"center",gap:10,marginBottom:16,padding:"12px 14px",background:"var(--bg)",borderRadius:8,border:"1px solid var(--border)"}}>
                <Av name={rescheduleModal.studentName} size="av-sm" />
                <div>
                  <div style={{fontSize:14,fontWeight:600}}>{rescheduleModal.studentName}</div>
                  <div style={{fontSize:12,color:"var(--blue)"}}>{rescheduleModal.instrument}</div>
                  <div style={{fontSize:11,color:"var(--ink-30)"}}>결석일: {rescheduleModal.originalDate} ({rescheduleModal.originalDay}요일)</div>
                </div>
              </div>
              <div className="fg">
                <label className="fg-label">보강 날짜</label>
                <input className="inp" type="date" value={rescheduleForm.newDate} onChange={e => setRescheduleForm(f=>({...f,newDate:e.target.value}))} min={TODAY_STR} />
              </div>
              <div className="fg">
                <label className="fg-label">보강 시간</label>
                <input className="time-inp" type="time" value={rescheduleForm.newTime} onChange={e => setRescheduleForm(f=>({...f,newTime:e.target.value}))} style={{width:"100%"}} />
              </div>
            </div>
            <div className="modal-f" style={{paddingBottom:"calc(14px + var(--safe-b))"}}>
              <button className="btn btn-secondary" onClick={() => setRescheduleModal(null)}>취소</button>
              <button className="btn btn-primary" disabled={!rescheduleForm.newDate} onClick={() => {
                if (onSaveScheduleOverride && rescheduleForm.newDate) {
                  const override = { id: uid(), studentId: rescheduleModal.studentId, originalDate: rescheduleModal.originalDate, type: "move", newDate: rescheduleForm.newDate, newTime: rescheduleForm.newTime, instrument: rescheduleModal.instrument, createdAt: Date.now() };
                  onSaveScheduleOverride([...(scheduleOverrides||[]), override]);
                }
                setRescheduleModal(null);
              }}>보강 등록</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
// ── LESSON NOTES VIEW ────────────────────────────────────────────────────────
function LessonNotesView({ students, teachers, currentUser, attendance, onSaveAttendance }) {
  const isManager = canManageAll(currentUser.role);
  const [filterTeacher, setFilterTeacher] = useState(currentUser.role === "teacher" ? currentUser.id : "all");
  const [filterMonth, setFilterMonth] = useState(THIS_MONTH);
  const [expandedId, setExpandedId] = useState(null); // 펼쳐진 레슨노트 id

  // 내 학생 ID 집합
  const myStudentIds = new Set(
    students
      .filter(s => isManager || s.teacherId === currentUser.id || (s.lessons||[]).some(l => l.teacherId === currentUser.id))
      .map(s => s.id)
  );

  // 강사 필터 적용 (관리자/매니저용)
  const filteredStudentIds = isManager && filterTeacher !== "all"
    ? new Set(students.filter(s => s.teacherId === filterTeacher || (s.lessons||[]).some(l => l.teacherId === filterTeacher)).map(s => s.id))
    : myStudentIds;

  // 레슨노트가 있는 출석 레코드 — 월 필터 + 학생 필터
  const noteRecords = attendance
    .filter(a =>
      filteredStudentIds.has(a.studentId) &&
      (a.lessonNote || a.note) &&
      a.date && a.date.startsWith(filterMonth)
    )
    .sort((a, b) => (b.date || "").localeCompare(a.date || "") || b.createdAt - a.createdAt);

  // 새 댓글이 있는 레코드 (회원 댓글 — 삭제된 것 제외)
  const withNewComments = noteRecords.filter(a => (a.comments||[]).some(c => c.authorType === "student" && !c.deletedAt));
  const withoutComments = noteRecords.filter(a => !(a.comments||[]).some(c => c.authorType === "student" && !c.deletedAt));

  const addComment = async (attId, comment) => {
    const upd = attendance.map(a => a.id === attId ? { ...a, comments: [...(a.comments||[]), comment] } : a);
    await onSaveAttendance(upd);
  };

  const deleteComment = async (attId, commentId) => {
    const upd = attendance.map(a => a.id !== attId ? a : {
      ...a,
      comments: (a.comments||[]).map(c => c.id === commentId ? { ...c, deletedAt: Date.now(), deletedBy: currentUser.id } : c)
    });
    await onSaveAttendance(upd);
  };

  const prevMonth = () => { const d = new Date(filterMonth + "-01"); d.setMonth(d.getMonth()-1); setFilterMonth(d.toISOString().slice(0,7)); };
  const nextMonth = () => { const d = new Date(filterMonth + "-01"); d.setMonth(d.getMonth()+1); setFilterMonth(d.toISOString().slice(0,7)); };

  const renderNoteCard = (a, highlight) => {
    const s = students.find(x => x.id === a.studentId);
    const teacher = teachers.find(t => t.id === a.teacherId);
    const ln = a.lessonNote;
    const isOpen = expandedId === a.id;
    const studentComments = (a.comments||[]).filter(c => c.authorType === "student" && !c.deletedAt);
    const condColor = { excellent:"var(--blue)", good:"var(--green)", normal:"var(--gold-dk)", poor:"var(--red)" };
    const condLabel = { excellent:"매우 좋음", good:"좋음", normal:"보통", poor:"부진" };
    return (
      <div key={a.id} style={{background:"var(--paper)",border:`1px solid ${highlight?"rgba(43,58,159,.25)":"var(--border)"}`,borderRadius:"var(--radius)",marginBottom:8,overflow:"hidden",boxShadow: highlight?"0 0 0 2px rgba(43,58,159,.08)":undefined}}>
        {/* 카드 헤더 — 클릭 시 펼치기/접기 */}
        <div style={{display:"flex",alignItems:"center",gap:10,padding:"12px 16px",cursor:"pointer",background:highlight?"var(--blue-lt)":undefined}} onClick={() => setExpandedId(isOpen ? null : a.id)}>
          <Av photo={s?.photo} name={s?.name || "?"} size="av-sm" />
          <div style={{flex:1,minWidth:0}}>
            <div style={{fontSize:13.5,fontWeight:600,color:"var(--ink)"}}>{s?.name || "알 수 없음"}</div>
            <div style={{fontSize:11,color:"var(--ink-30)",marginTop:1,display:"flex",gap:6,alignItems:"center"}}>
              <span>{a.date}</span>
              {ln?.condition && <span style={{color:condColor[ln.condition]||"var(--ink-30)",fontWeight:500}}>· {condLabel[ln.condition]||""}</span>}
              {isManager && teacher && <span style={{color:"var(--blue)"}}>· {teacher.name}</span>}
            </div>
          </div>
          <div style={{display:"flex",alignItems:"center",gap:6,flexShrink:0}}>
            {studentComments.length > 0 && (
              <span style={{width:8,height:8,borderRadius:4,background:"var(--blue)",display:"inline-block",flexShrink:0}} />
            )}
            <span style={{fontSize:12,color:"var(--ink-30)"}}>{isOpen ? "▲" : "▼"}</span>
          </div>
        </div>

        {/* 카드 본문 — 펼쳤을 때 */}
        {isOpen && (
          <div style={{padding:"0 16px 16px",borderTop:"1px solid var(--border)"}}>
            {/* 레슨노트 내용 */}
            <div style={{padding:"12px 0",fontSize:13,lineHeight:1.8}}>
              {ln && typeof ln === "object" ? (<>
                {ln.progress && <div><span style={{fontSize:11,color:"var(--ink-30)"}}>진도</span> <span style={{fontWeight:500}}>{ln.progress}</span></div>}
                {ln.content && <div style={{color:"var(--ink-60)",marginTop:2}}>{ln.content}</div>}
                {ln.assignment && <div style={{marginTop:6,padding:"7px 11px",background:"var(--blue-lt)",borderRadius:7,color:"var(--blue)",fontSize:12.5,fontWeight:500}}>📝 과제: {ln.assignment}</div>}
                {ln.memo && <div style={{marginTop:4,fontSize:12,color:"var(--ink-30)"}}>{ln.memo}</div>}
              </>) : (
                <div style={{whiteSpace:"pre-wrap",color:"var(--ink)"}}>{a.note}</div>
              )}
            </div>
            {/* 댓글 패널 */}
            <NoteCommentsPanel
              comments={a.comments || []}
              onAddComment={(comment) => addComment(a.id, comment)}
              onDeleteComment={(cid) => deleteComment(a.id, cid)}
              authorType={currentUser.role}
              authorName={currentUser.name}
              authorId={currentUser.id}
              viewerRole={currentUser.role}
              compact
            />
          </div>
        )}
      </div>
    );
  };

  return (
    <div>
      <div className="ph">
        <div><h1>레슨노트</h1><div className="ph-sub">{monthLabel(filterMonth)}</div></div>
      </div>

      {/* 필터 행 */}
      <div style={{display:"flex",gap:8,marginBottom:12,flexWrap:"wrap"}}>
        <button className="btn btn-secondary btn-xs" onClick={prevMonth}>◀</button>
        <input className="inp" type="month" value={filterMonth} onChange={e => setFilterMonth(e.target.value)} style={{flex:1,maxWidth:180,textAlign:"center"}} />
        <button className="btn btn-secondary btn-xs" onClick={nextMonth}>▶</button>
        {isManager && (
          <select className="sel" value={filterTeacher} onChange={e => setFilterTeacher(e.target.value)} style={{flex:1,maxWidth:160}}>
            <option value="all">전체 강사</option>
            {teachers.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
          </select>
        )}
      </div>

      {/* 새 댓글 섹션 */}
      {withNewComments.length > 0 && (
        <div style={{marginBottom:16}}>
          <div style={{display:"flex",alignItems:"center",gap:6,marginBottom:8}}>
            <span style={{width:8,height:8,borderRadius:4,background:"var(--blue)",display:"inline-block"}} />
            <span style={{fontSize:12,fontWeight:700,color:"var(--blue)"}}>새 댓글 {withNewComments.length}건</span>
          </div>
          {withNewComments.map(a => renderNoteCard(a, true))}
        </div>
      )}

      {/* 전체 레슨노트 */}
      {withNewComments.length > 0 && withoutComments.length > 0 && (
        <div style={{fontSize:11,fontWeight:600,color:"var(--ink-30)",letterSpacing:.5,marginBottom:8,paddingBottom:6,borderBottom:"1px solid var(--border)"}}>전체 레슨노트</div>
      )}
      {withoutComments.length === 0 && withNewComments.length === 0 ? (
        <div className="empty"><div className="empty-icon">📝</div><div className="empty-txt">{monthLabel(filterMonth)} 레슨노트가 없습니다.</div></div>
      ) : (
        withoutComments.map(a => renderNoteCard(a, false))
      )}
    </div>
  );
}


export { AttendanceView, LessonNotesView, NoteCommentsPanel };