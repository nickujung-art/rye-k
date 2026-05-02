import { useState } from "react";
import { DAYS, TODAY_STR, IC } from "../constants.jsx";
import { canManageAll, allLessonInsts, uid, fmtDateShort } from "../utils.js";
import { Av } from "./shared/CommonUI.jsx";

const TEACHER_COLORS = ["#2B3A9F","#E8281C","#1A7A40","#7C3AED","#C88800","#0E7490","#B45309","#BE185D"];
function getTeacherColor(id, teachersList) {
  if (!id) return "#A1A1AA";
  const idx = teachersList.findIndex(t => t.id === id);
  return TEACHER_COLORS[Math.abs(idx) % TEACHER_COLORS.length] || "#A1A1AA";
}

function ScheduleView({ students, teachers, currentUser, attendance, onSaveAttendance, onSaveScheduleOverride, scheduleOverrides, notices }) {
  const [viewMode, setViewMode] = useState("week");
  const [filterTeacherId, setFilterTeacherId] = useState("all");
  const [weekOffset, setWeekOffset] = useState(0);
  const [monthOffset, setMonthOffset] = useState(0);
  const [dayDetail, setDayDetail] = useState(null);
  const [editEntry, setEditEntry] = useState(null); // {studentId, studentName, instrument, originalDay, originalDate}
  const [editForm, setEditForm] = useState({ action: "move", newDay: "", newTime: "", newDate: "" });

  const canSeeAll = canManageAll(currentUser.role);
  const effectiveFilter = canSeeAll ? filterTeacherId : currentUser.id;
  const visibleStudents = students.filter(s =>
    effectiveFilter === "all" ||
    s.teacherId === effectiveFilter ||
    (s.lessons || []).some(l => l.teacherId === effectiveFilter)
  );

  const ATT_BADGE = {
    present: { bg:"var(--green-lt)", color:"var(--green)",   label:"✓ 출석" },
    absent:  { bg:"var(--red-lt)",   color:"var(--red)",     label:"✗ 결석" },
    late:    { bg:"#FEF3C7",         color:"#B45309",        label:"△ 지각" },
    excused: { bg:"var(--blue-lt)",  color:"var(--blue)",    label:"보강"   },
  };
  const getAttBadge = (studentId, dateStr) => {
    const a = (attendance||[]).find(a => a.studentId === studentId && a.date === dateStr);
    if (a) return ATT_BADGE[a.status] || null;
    if (dateStr <= TODAY_STR) return { bg:"var(--ink-10)", color:"var(--ink-30)", label:"미체크" };
    return null;
  };

  // Build regular schedule entries from lesson data keyed by day name
  const scheduleByDay = {};
  DAYS.forEach(d => { scheduleByDay[d] = []; });
  visibleStudents.forEach(s => {
    (s.lessons || []).forEach(lesson => {
      const lessonTid = lesson.teacherId || s.teacherId;
      if (effectiveFilter !== "all" && lessonTid !== effectiveFilter) return;
      const teacher = teachers.find(t => t.id === lessonTid);
      (lesson.schedule || []).forEach(sch => {
        if (sch.day && DAYS.includes(sch.day)) {
          scheduleByDay[sch.day].push({
            studentId: s.id, studentName: s.name, instrument: lesson.instrument,
            time: sch.time || "", teacherId: lessonTid,
            teacherName: teacher ? teacher.name : "미배정",
            color: getTeacherColor(lessonTid, teachers), isMakeup: false,
          });
        }
      });
    });
  });
  DAYS.forEach(d => { scheduleByDay[d].sort((a, b) => (a.time || "").localeCompare(b.time || "")); });

  // Build notice events map: dateStr → notice[] (range notices span multiple days)
  const getNoticesForDate = (dateStr) => {
    return (notices || []).filter(n => {
      if (!n.eventStartDate) return false;
      const end = n.eventEndDate || n.eventStartDate;
      return dateStr >= n.eventStartDate && dateStr <= end;
    });
  };

  const getWeekDates = (offset) => {
    const today = new Date(TODAY_STR);
    const dow = today.getDay();
    const mondayDiff = dow === 0 ? -6 : 1 - dow;
    const monday = new Date(today);
    monday.setDate(monday.getDate() + mondayDiff + offset * 7);
    return DAYS.map((dayName, i) => {
      const d = new Date(monday);
      d.setDate(d.getDate() + i);
      return { dayName, date: d.toISOString().slice(0, 10), d };
    });
  };

  const getMakeups = (dateStr) => {
    return attendance.filter(a => {
      if (a.status !== "excused" || a.date !== dateStr) return false;
      if (effectiveFilter === "all") return true;
      if (a.teacherId === effectiveFilter) return true;
      const s = students.find(st => st.id === a.studentId);
      if (!s) return false;
      return s.teacherId === effectiveFilter || (s.lessons || []).some(l => l.teacherId === effectiveFilter);
    }).map(a => {
      const s = students.find(st => st.id === a.studentId);
      const tid = a.teacherId || (s ? s.teacherId : "");
      const teacher = teachers.find(t => t.id === tid);
      return {
        studentId: a.studentId, studentName: s ? s.name : "?",
        instrument: a.instrument || (s ? allLessonInsts(s).join(", ") : ""),
        time: a.time || "", teacherId: tid,
        teacherName: teacher ? teacher.name : "미배정",
        color: getTeacherColor(tid, teachers), isMakeup: true, note: a.note || "",
      };
    });
  };

  if (viewMode === "week") {
    const weekDates = getWeekDates(weekOffset);
    const first = weekDates[0].d; const last = weekDates[6].d;
    const weekLabel = first.getMonth() === last.getMonth()
      ? (first.getFullYear() + "년 " + (first.getMonth()+1) + "월 " + first.getDate() + "일 ~ " + last.getDate() + "일")
      : ((first.getMonth()+1) + "/" + first.getDate() + " ~ " + (last.getMonth()+1) + "/" + last.getDate());
    return (
      <div className="sched-wrap">
        <div className="ph"><div><h1>강사 스케줄</h1><div className="ph-sub">레슨 시간표 · 보강 현황</div></div></div>
        <div className="sched-toolbar">
          <button className={"sched-mode-btn " + (viewMode==="week"?"active":"")} onClick={() => setViewMode("week")}>주간</button>
          <button className={"sched-mode-btn " + (viewMode==="month"?"active":"")} onClick={() => setViewMode("month")}>월간</button>
          {canSeeAll && (
            <select className="sched-filter" value={filterTeacherId} onChange={e => setFilterTeacherId(e.target.value)}>
              <option value="all">전체 강사</option>
              {teachers.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
            </select>
          )}
          <div className="sched-nav">
            <button className="sched-nav-btn" onClick={() => setWeekOffset(w => w-1)}>‹</button>
            <button className="sched-nav-btn" style={{fontSize:11,width:"auto",padding:"0 8px",color:"var(--blue)"}} onClick={() => setWeekOffset(0)}>오늘</button>
            <button className="sched-nav-btn" onClick={() => setWeekOffset(w => w+1)}>›</button>
          </div>
        </div>
        <div style={{fontSize:12,color:"var(--ink-60)",marginBottom:12,textAlign:"center",fontWeight:500}}>{weekLabel}</div>
        {weekDates.map(({ dayName, date, d }) => {
          const isToday = date === TODAY_STR;
          const lessons = scheduleByDay[dayName] || [];
          const makeups = getMakeups(date);
          const dayNotices = getNoticesForDate(date);
          const all = [...lessons, ...makeups].sort((a, b) => (a.time||"").localeCompare(b.time||""));
          return (
            <div key={dayName} className="sched-day-section">
              <div className={"sched-day-hd" + (isToday?" today":"")}>
                <span className="sched-day-name">{dayName}요일</span>
                <span className="sched-day-date">{d.getMonth()+1}/{d.getDate()}{isToday?" · 오늘":""}</span>
                <span style={{marginLeft:"auto",fontSize:11,color:"var(--ink-30)"}}>{all.length}명</span>
              </div>
              {dayNotices.map(n => {
                const isRange = n.eventEndDate && n.eventEndDate !== n.eventStartDate;
                return (
                  <div key={n.id} style={{ margin: "4px 0", padding: "8px 12px", background: "var(--blue-lt)", borderLeft: "3px solid var(--blue)", borderRadius: 6, display: "flex", alignItems: "center", gap: 8 }}>
                    <span style={{ fontSize: 14 }}>📅</span>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 12.5, fontWeight: 600, color: "var(--blue)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{n.title}</div>
                      {isRange && <div style={{ fontSize: 10, color: "var(--ink-30)", marginTop: 1 }}>{fmtDateShort(n.eventStartDate)} ~ {fmtDateShort(n.eventEndDate)}</div>}
                    </div>
                  </div>
                );
              })}
              {all.length === 0 ? (
                <div className="sched-empty">레슨 없음</div>
              ) : all.map((entry, i) => {
                const badge = !entry.isMakeup ? getAttBadge(entry.studentId, date) : null;
                return (
                <div key={i} className={"sched-lesson" + (entry.isMakeup?" makeup":"")} style={{borderLeftColor:entry.color,cursor:"pointer"}} onClick={()=>{setEditEntry({studentId:entry.studentId,studentName:entry.studentName,instrument:entry.instrument,originalDay:dayName,originalDate:date,time:entry.time});setEditForm({action:"move",newDay:"",newTime:entry.time||"",newDate:""});}}>
                  <span className="sched-time">{entry.time||"—"}</span>
                  <div className="sched-info">
                    <div className="sched-name">{entry.studentName}</div>
                    <div className="sched-inst">{entry.instrument}</div>
                    <div className="sched-teacher">{entry.teacherName}</div>
                  </div>
                  {entry.isMakeup && <span className="sched-makeup-badge">보강</span>}
                  {(scheduleOverrides||[]).find(o=>o.studentId===entry.studentId&&o.originalDate===date&&o.type==="absent") && <span style={{background:"var(--red-lt)",color:"var(--red)",fontSize:10,fontWeight:600,padding:"2px 8px",borderRadius:6,flexShrink:0}}>결석</span>}
                  {(scheduleOverrides||[]).find(o=>o.studentId===entry.studentId&&o.originalDate===date&&o.type==="move") && <span style={{background:"var(--gold-lt)",color:"var(--gold-dk)",fontSize:10,fontWeight:600,padding:"2px 8px",borderRadius:6,flexShrink:0}}>변경</span>}
                  {badge && <span style={{fontSize:10,fontWeight:600,padding:"2px 8px",borderRadius:6,flexShrink:0,background:badge.bg,color:badge.color}}>{badge.label}</span>}
                </div>
                );
              })}
            </div>
          );
        })}
        {editEntry && (
          <div className="mb" onClick={e => e.target === e.currentTarget && setEditEntry(null)}>
            <div className="modal">
              <div className="modal-h"><h2>스케줄 변경</h2><button className="modal-close" onClick={() => setEditEntry(null)}>{IC.x}</button></div>
              <div className="modal-b">
                <div style={{display:"flex",alignItems:"center",gap:10,marginBottom:16,padding:"12px 14px",background:"var(--bg)",borderRadius:8,border:"1px solid var(--border)"}}>
                  <Av name={editEntry.studentName} size="av-sm" />
                  <div>
                    <div style={{fontSize:14,fontWeight:600}}>{editEntry.studentName}</div>
                    <div style={{fontSize:12,color:"var(--blue)"}}>{editEntry.instrument} · {editEntry.originalDay}요일 {editEntry.time||""}</div>
                    <div style={{fontSize:11,color:"var(--ink-30)"}}>{editEntry.originalDate}</div>
                  </div>
                </div>

                <div style={{display:"flex",gap:6,marginBottom:16}}>
                  <button className={`ftab ${editForm.action==="move"?"active":""}`} onClick={()=>setEditForm(f=>({...f,action:"move"}))} style={{flex:1,textAlign:"center"}}>다른 날로 변경</button>
                  <button className={`ftab ${editForm.action==="absent"?"active":""}`} onClick={()=>setEditForm(f=>({...f,action:"absent"}))} style={{flex:1,textAlign:"center"}}>이번 결석</button>
                </div>

                {editForm.action === "move" && (
                  <>
                    <div className="fg">
                      <label className="fg-label">변경할 날짜</label>
                      <input className="inp" type="date" value={editForm.newDate} onChange={e => setEditForm(f=>({...f,newDate:e.target.value}))} min={TODAY_STR} />
                    </div>
                    <div className="fg">
                      <label className="fg-label">변경할 시간</label>
                      <input className="time-inp" type="time" value={editForm.newTime} onChange={e => setEditForm(f=>({...f,newTime:e.target.value}))} style={{width:"100%"}} />
                    </div>
                  </>
                )}
                {editForm.action === "absent" && (
                  <div style={{background:"var(--red-lt)",border:"1px solid rgba(232,40,28,.15)",borderRadius:8,padding:"12px 14px",fontSize:13,color:"var(--red)",lineHeight:1.6}}>
                    <strong>{editEntry.originalDate}</strong> ({editEntry.originalDay}요일) 레슨을 결석 처리합니다.<br/>
                    해당 날짜의 스케줄이 제거됩니다.
                  </div>
                )}
              </div>
              <div className="modal-f">
                <button className="btn btn-secondary" onClick={() => setEditEntry(null)}>취소</button>
                <button className="btn btn-primary" onClick={() => {
                  if (editForm.action === "absent") {
                    const override = { id: uid(), studentId: editEntry.studentId, originalDate: editEntry.originalDate, type: "absent", createdAt: Date.now() };
                    onSaveScheduleOverride && onSaveScheduleOverride([...(scheduleOverrides||[]), override]);
                  } else if (editForm.action === "move" && editForm.newDate) {
                    const override = { id: uid(), studentId: editEntry.studentId, originalDate: editEntry.originalDate, type: "move", newDate: editForm.newDate, newTime: editForm.newTime, instrument: editEntry.instrument, createdAt: Date.now() };
                    onSaveScheduleOverride && onSaveScheduleOverride([...(scheduleOverrides||[]), override]);
                  }
                  setEditEntry(null);
                }} disabled={editForm.action === "move" && !editForm.newDate}>
                  {editForm.action === "absent" ? "결석 처리" : "스케줄 변경"}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }

  // Monthly view
  const now = new Date();
  const rawMonth = now.getMonth() + monthOffset;
  const viewYear = now.getFullYear() + Math.floor(rawMonth / 12);
  const viewMonth = ((rawMonth % 12) + 12) % 12;
  const firstDay = new Date(viewYear, viewMonth, 1);
  const lastDay = new Date(viewYear, viewMonth+1, 0);
  const startDow = firstDay.getDay();
  const startOffset = startDow === 0 ? 6 : startDow - 1;
  const calStart = new Date(firstDay);
  calStart.setDate(calStart.getDate() - startOffset);
  const calCells = [];
  const cur = new Date(calStart);
  while (calCells.length < 42) {
    calCells.push(new Date(cur));
    cur.setDate(cur.getDate() + 1);
    if (cur > lastDay && calCells.length % 7 === 0) break;
  }

  return (
    <div className="sched-wrap">
      <div className="ph"><div><h1>강사 스케줄</h1><div className="ph-sub">월간 레슨 현황</div></div></div>
      <div className="sched-toolbar">
        <button className={"sched-mode-btn " + (viewMode==="week"?"active":"")} onClick={() => setViewMode("week")}>주간</button>
        <button className={"sched-mode-btn " + (viewMode==="month"?"active":"")} onClick={() => setViewMode("month")}>월간</button>
        {canSeeAll && (
          <select className="sched-filter" value={filterTeacherId} onChange={e => setFilterTeacherId(e.target.value)}>
            <option value="all">전체 강사</option>
            {teachers.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
          </select>
        )}
        <div className="sched-nav">
          <button className="sched-nav-btn" onClick={() => setMonthOffset(m => m-1)}>‹</button>
          <button className="sched-nav-btn" style={{fontSize:11,width:"auto",padding:"0 8px",color:"var(--blue)"}} onClick={() => setMonthOffset(0)}>오늘</button>
          <button className="sched-nav-btn" onClick={() => setMonthOffset(m => m+1)}>›</button>
        </div>
      </div>
      <div style={{fontSize:13,color:"var(--ink-60)",marginBottom:12,textAlign:"center",fontWeight:600}}>
        {viewYear}년 {viewMonth+1}월
      </div>
      <div className="sched-month-grid">
        {["월","화","수","목","금","토","일"].map(d => <div key={d} className="sched-month-hd">{d}</div>)}
        {calCells.map((d, i) => {
          const dateStr = d.toISOString().slice(0, 10);
          const isToday = dateStr === TODAY_STR;
          const isThisMonth = d.getMonth() === viewMonth;
          const dayName = DAYS[d.getDay()===0?6:d.getDay()-1];
          const count = (scheduleByDay[dayName]||[]).length + getMakeups(dateStr).length;
          const cellNotices = getNoticesForDate(dateStr);
          const isSelected = dayDetail === dateStr;
          return (
            <div key={i} className={"sched-month-cell"+(isToday?" today":"")+((!isThisMonth)?" other-month":"")}
              style={isSelected?{border:"2px solid var(--gold)"}:{}} onClick={() => setDayDetail(isSelected?null:dateStr)}>
              <div className="sched-month-cell-day">{d.getDate()}{cellNotices.length > 0 && <span style={{ marginLeft: 2, fontSize: 9 }}>📅</span>}</div>
              {count > 0 && (
                <div className="sched-month-dots">
                  {count <= 5 ? Array(Math.min(count,5)).fill(0).map((_,j) => <div key={j} className="sched-month-dot"/>) : <span className="sched-month-count">{count}명</span>}
                </div>
              )}
            </div>
          );
        })}
      </div>
      {dayDetail && (() => {
        const d = new Date(dayDetail);
        const dayName = DAYS[d.getDay()===0?6:d.getDay()-1];
        const lessons = scheduleByDay[dayName] || [];
        const makeups = getMakeups(dayDetail);
        const detailNotices = getNoticesForDate(dayDetail);
        const all = [...lessons, ...makeups].sort((a,b) => (a.time||"").localeCompare(b.time||""));
        return (
          <div className="card" style={{padding:0,overflow:"hidden",marginTop:8}}>
            <div style={{padding:"12px 16px",borderBottom:"1px solid var(--border)",display:"flex",alignItems:"center",justifyContent:"space-between"}}>
              <span style={{fontSize:14,fontWeight:600,fontFamily:"'Noto Serif KR',serif"}}>{d.getMonth()+1}월 {d.getDate()}일 ({dayName})</span>
              <button className="btn btn-ghost btn-xs" onClick={() => setDayDetail(null)}>닫기</button>
            </div>
            {detailNotices.length > 0 && (
              <div style={{ padding: "10px 16px", background: "var(--blue-lt)", borderBottom: "1px solid var(--border)" }}>
                <div style={{ fontSize: 10, color: "var(--blue)", fontWeight: 600, marginBottom: 6, letterSpacing: .5 }}>📅 일정</div>
                {detailNotices.map(n => {
                  const isRange = n.eventEndDate && n.eventEndDate !== n.eventStartDate;
                  return (
                    <div key={n.id} style={{ padding: "6px 0", borderTop: "1px solid rgba(43,58,159,.12)" }}>
                      <div style={{ fontSize: 13, fontWeight: 600, color: "var(--blue)" }}>{n.title}</div>
                      {isRange && <div style={{ fontSize: 10.5, color: "var(--ink-30)", marginTop: 2 }}>{fmtDateShort(n.eventStartDate)} ~ {fmtDateShort(n.eventEndDate)}</div>}
                      {n.content && <div style={{ fontSize: 11.5, color: "var(--ink-60)", marginTop: 3, whiteSpace: "pre-wrap" }}>{n.content}</div>}
                    </div>
                  );
                })}
              </div>
            )}
            {all.length === 0 ? <div className="sched-empty" style={{padding:16}}>레슨 없음</div> :
              all.map((entry, i) => {
                const badge = !entry.isMakeup ? getAttBadge(entry.studentId, dayDetail) : null;
                return (
                <div key={i} className={"sched-lesson"+(entry.isMakeup?" makeup":"")}
                  style={{borderLeftColor:entry.color,borderRadius:0,margin:0,borderTop:i>0?"1px solid var(--border)":"none",borderRight:"none",borderBottom:"none",cursor:"pointer"}}
                  onClick={()=>{setEditEntry({studentId:entry.studentId,studentName:entry.studentName,instrument:entry.instrument,originalDay:dayName,originalDate:dayDetail,time:entry.time});setEditForm({action:"move",newDay:"",newTime:entry.time||"",newDate:""});}}>
                  <span className="sched-time">{entry.time||"—"}</span>
                  <div className="sched-info">
                    <div className="sched-name">{entry.studentName}</div>
                    <div className="sched-inst">{entry.instrument}</div>
                    <div className="sched-teacher">{entry.teacherName}</div>
                  </div>
                  {entry.isMakeup && <span className="sched-makeup-badge">보강</span>}
                  {badge && <span style={{fontSize:10,fontWeight:600,padding:"2px 8px",borderRadius:6,flexShrink:0,background:badge.bg,color:badge.color}}>{badge.label}</span>}
                </div>
                );
              })
            }
          </div>
        );
      })()}
    </div>
  );
}
export default ScheduleView;
