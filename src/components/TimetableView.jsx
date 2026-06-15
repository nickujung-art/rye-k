import { useState, useRef, useMemo, useEffect } from "react";
import { canManageAll } from "../utils.js";
import { Av } from "./shared/CommonUI.jsx";

const DAYS = ["월","화","수","목","금","토","일"];
const TIME_START = 8;
const TIME_END = 22;
const ROWS = (TIME_END - TIME_START) * 2 + 1; // 29 rows: 08:00 ~ 22:00

const TEACHER_COLORS = ["var(--blue)","var(--red)","var(--green)","#7C3AED","var(--gold-dk)","var(--blue-md)","var(--gold)","var(--red-dk)"];

function getTeacherColor(id, list) {
  if (!id) return "var(--ink-30)";
  const idx = list.findIndex(t => t.id === id);
  return TEACHER_COLORS[Math.abs(idx) % TEACHER_COLORS.length] || "var(--ink-30)";
}

function formatTime(rowIdx) {
  const totalMins = (TIME_START + Math.floor(rowIdx / 2)) * 60 + (rowIdx % 2) * 30;
  const h = Math.floor(totalMins / 60);
  const m = totalMins % 60;
  return `${String(h).padStart(2,"0")}:${String(m).padStart(2,"0")}`;
}

function getTodayDayIdx() {
  const d = new Date().getDay();
  return [6,0,1,2,3,4,5][d]; // 0=월 ~ 6=일
}

function getNowRowIdx() {
  const now = new Date();
  const rowIdx = (now.getHours() - TIME_START) * 2 + (now.getMinutes() >= 30 ? 1 : 0);
  return rowIdx >= 0 && rowIdx < ROWS ? rowIdx : -1;
}

function buildRowLayout(rowsWithSlots) {
  const layout = [];
  let i = 0;
  while (i < ROWS) {
    if (rowsWithSlots.has(i)) {
      layout.push({ type: "slot", rowIdx: i });
      i++;
    } else {
      const from = i;
      while (i < ROWS && !rowsWithSlots.has(i)) i++;
      layout.push({ type: "empty", fromIdx: from, toIdx: i - 1 });
    }
  }
  return layout;
}

function safePopupLeft(left, width = 200) {
  if (typeof window === "undefined") return left;
  return Math.max(8, Math.min(left, window.innerWidth - width - 8));
}

// Phase 9 — D-02: 학생 검색 팝업
function StudentSearchPopup({ students, teachers, teacherId, instrument, setInstrument, onSelect, onClose, top, left }) {
  const [q, setQ] = useState("");
  const filtered = (students || []).filter(s =>
    s.status === "active" && !s.isInstitution && s.name.includes(q)
  ).slice(0, 20);
  const teacher = (teachers || []).find(t => t.id === teacherId);
  const teacherInstruments = teacher?.instruments || [];
  const needsInstrument = !instrument;

  return (
    <>
      <div style={{ position: "fixed", inset: 0, zIndex: 9998 }} onClick={onClose} />
      <div className="tt-member-popup" style={{ top, left: safePopupLeft(left), minWidth: 230, zIndex: 9999, maxHeight: 320, overflowY: "auto" }}>
        {needsInstrument && (
          <div style={{ marginBottom: 8 }}>
            <div style={{ fontSize: 11, color: "var(--ink-30)", marginBottom: 4 }}>악기 선택</div>
            <select
              className="inp"
              style={{ fontSize: 12, padding: "4px 8px", width: "100%" }}
              value={instrument || ""}
              onChange={e => setInstrument(e.target.value)}
            >
              <option value="">-- 악기 선택 --</option>
              {teacherInstruments.length > 0
                ? teacherInstruments.map(inst => <option key={inst} value={inst}>{inst}</option>)
                : <option value="기타">기타</option>}
            </select>
          </div>
        )}
        <input
          className="inp"
          value={q}
          onChange={e => setQ(e.target.value)}
          placeholder="이름 검색..."
          autoFocus
          style={{ marginBottom: 8, fontSize: 13 }}
        />
        {filtered.length === 0
          ? <div style={{ color: "var(--ink-30)", fontSize: 12, padding: "4px 0" }}>검색 결과 없음</div>
          : filtered.map(s => (
            <div key={s.id} className="tt-member-row tt-member-row--link" onClick={() => onSelect(s)}>
              {s.name}
              {(s.lessons || []).some(l => (l.teacherId || s.teacherId) === teacherId) && (
                <span style={{ fontSize: 10, color: "var(--ink-30)", marginLeft: 4 }}>
                  {(s.lessons || []).find(l => (l.teacherId || s.teacherId) === teacherId)?.instrument}
                </span>
              )}
            </div>
          ))}
      </div>
    </>
  );
}

function TimetableGrid({ lessonSlots, students, teachers, teacherId, canSeeAll, onUpdateSlot, onAddStudentToSlot }) {
  const [editingSlotId, setEditingSlotId] = useState(null);
  const [editingSlotName, setEditingSlotName] = useState("");
  const [memberPopup, setMemberPopup] = useState(null);
  const [studentDetail, setStudentDetail] = useState(null);
  const [selectedDayIdx, setSelectedDayIdx] = useState(null);
  const [isMobile, setIsMobile] = useState(() => typeof window !== "undefined" && window.innerWidth < 640);
  const slotSavedRef = useRef(null); // null | slotId — 연속 편집 시 이중저장 방지
  const [searchPopup, setSearchPopup] = useState(null);
  const [cellInstrument, setCellInstrument] = useState(null);

  useEffect(() => {
    const handler = () => setIsMobile(window.innerWidth < 640);
    window.addEventListener("resize", handler);
    return () => window.removeEventListener("resize", handler);
  }, []);

  const color = getTeacherColor(teacherId, teachers);
  const todayIdx = getTodayDayIdx();
  const nowRowIdx = getNowRowIdx();

  const slotCells = useMemo(() => {
    const cells = [];
    (lessonSlots || [])
      .filter(s => s.teacherId === teacherId && s.status !== "closed")
      .forEach(slot => {
        // 개인 슬롯: 연결 학생이 일시정지/휴회면 제외
        if (slot.type === "individual") {
          const linked = (students || []).find(s =>
            !s.isInstitution && (s.lessons || []).some(l => l.slotId === slot.id)
          );
          if (linked && linked.status !== "active") return;
        }
        (slot.schedule || []).forEach(sc => {
          const dayIdx = DAYS.indexOf(sc.day);
          if (dayIdx < 0) return;
          const [hStr, mStr] = (sc.time || "09:00").split(":");
          const rowIdx = (parseInt(hStr, 10) - TIME_START) * 2 + (parseInt(mStr || "0", 10) >= 30 ? 1 : 0);
          if (rowIdx < 0 || rowIdx >= ROWS) return;
          const memberCount = (students || []).filter(s =>
            s.status === "active" && !s.isInstitution &&
            (s.lessons || []).some(l => l.slotId === slot.id)
          ).length;
          cells.push({ dayIdx, rowIdx, rawTime: sc.time, slot, memberCount });
        });
      });
    return cells;
  }, [lessonSlots, students, teacherId]);

  const rowLayout = useMemo(() => {
    return buildRowLayout(new Set(slotCells.map(c => c.rowIdx)));
  }, [slotCells]);

  const cellMap = useMemo(() => {
    const map = {};
    slotCells.forEach(c => { map[`${c.dayIdx}-${c.rowIdx}`] = c; });
    return map;
  }, [slotCells]);

  const commitEdit = (slotId, name) => {
    if (name.trim() && onUpdateSlot) onUpdateSlot(slotId, { name: name.trim() });
    setEditingSlotId(null);
  };

  const handleCellAdd = (day, time, e) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const existingInstruments = (students || [])
      .filter(s => (s.lessons || []).some(l => (l.teacherId || s.teacherId) === teacherId))
      .flatMap(s => (s.lessons || [])
        .filter(l => (l.teacherId || s.teacherId) === teacherId)
        .map(l => l.instrument)
      )
      .filter(Boolean);
    const uniqueInstruments = [...new Set(existingInstruments)];
    const autoInstrument = uniqueInstruments.length === 1 ? uniqueInstruments[0] : null;
    setCellInstrument(autoInstrument);
    setSearchPopup({ teacherId, day, time, instrument: autoInstrument, top: rect.bottom + 6, left: rect.left });
  };

  const openMembers = (e, slot) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const members = (students || []).filter(s =>
      s.status === "active" && !s.isInstitution &&
      (s.lessons || []).some(l => l.slotId === slot.id)
    );
    setMemberPopup({ slotId: slot.id, members, top: rect.bottom + 6, left: safePopupLeft(rect.left) });
  };

  const openStudentDetail = (e, slot) => {
    const student = (students || []).find(s =>
      !s.isInstitution && (s.lessons || []).some(l => l.slotId === slot.id)
    );
    if (!student) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const left = isMobile ? safePopupLeft(rect.left) : safePopupLeft(rect.right + 8);
    const top = isMobile ? rect.bottom + 6 : rect.top;
    setStudentDetail({ student, top, left });
  };

  if (slotCells.length === 0) {
    return (
      <div className="empty" style={{ marginTop: 32 }}>
        <div className="empty-txt">
          {canSeeAll
            ? <><span>이 강사의 레슨 슬롯이 없습니다.</span><br/><span style={{fontSize:12,color:"var(--ink-30)"}}>AdminTools → 레슨 슬롯에서 마이그레이션을 실행하세요.</span></>
            : "등록된 레슨이 없습니다."}
        </div>
      </div>
    );
  }

  // ── 공통 슬롯 카드 렌더 (데스크톱 셀 내부 / 모바일 카드 내부 공용) ──
  const renderSlotContent = (cell, compact = false) => {
    const isGroup = cell.slot.type === "group";
    const isEditing = canSeeAll && editingSlotId === cell.slot.id;
    const rawTimeMins = parseInt((cell.rawTime || '').split(':')[1] || '0', 10);
    const showRawTime = !compact && cell.rawTime && rawTimeMins !== 0 && rawTimeMins !== 30;
    return (
      <>
        <div className="tt-slot-name">
          {isEditing ? (
            <input
              className="inp tt-slot-inp"
              value={editingSlotName}
              autoFocus
              onChange={e => setEditingSlotName(e.target.value)}
              onKeyDown={e => {
                if (e.key === "Enter") { e.preventDefault(); slotSavedRef.current = cell.slot.id; commitEdit(cell.slot.id, editingSlotName); }
                if (e.key === "Escape") { slotSavedRef.current = cell.slot.id; setEditingSlotId(null); }
              }}
              onBlur={() => {
                if (slotSavedRef.current !== cell.slot.id) commitEdit(cell.slot.id, editingSlotName);
                slotSavedRef.current = null;
              }}
              onClick={e => e.stopPropagation()}
            />
          ) : (
            <>
              <span
                className={`tt-slot-name-txt${!isGroup ? " tt-slot-name-txt--clickable" : ""}`}
                style={compact ? { fontSize: 14, fontWeight: 700 } : undefined}
                onClick={!isGroup ? e => { e.stopPropagation(); openStudentDetail(e, cell.slot); } : undefined}
              >
                {cell.slot.name}
              </span>
              {canSeeAll && onUpdateSlot && isGroup && (
                <span
                  className="tt-edit-btn"
                  title="이름 편집"
                  onClick={e => {
                    e.stopPropagation();
                    slotSavedRef.current = null;
                    setEditingSlotId(cell.slot.id);
                    setEditingSlotName(cell.slot.name);
                  }}
                >✏</span>
              )}
            </>
          )}
        </div>
        <div className="tt-slot-pills">
          <span className="tt-pill">{isGroup ? "그룹" : "개인"}</span>
        </div>
        {isGroup && cell.memberCount > 0 && (
          <div
            className="tt-slot-sub tt-slot-sub--link"
            onClick={e => openMembers(e, cell.slot)}
          >
            {cell.memberCount}명 ▾
          </div>
        )}
        {showRawTime && <div className="tt-slot-sub">{cell.rawTime}</div>}
      </>
    );
  };

  // ── 모바일 뷰 ──
  const activeDayIdxs = [...new Set([...slotCells.map(c => c.dayIdx), todayIdx])].sort((a, b) => a - b);
  const defaultDayIdx = activeDayIdxs.includes(todayIdx) ? todayIdx : (activeDayIdxs[0] ?? 0);
  const activeDayIdx = selectedDayIdx ?? defaultDayIdx;

  const mobileView = (
    <>
      <div className="tt-day-tabs">
        {activeDayIdxs.map(di => (
          <button
            key={di}
            className={`tt-day-tab${di === activeDayIdx ? " tt-day-tab--active" : ""}${di === todayIdx ? " tt-day-tab--today" : ""}`}
            onClick={() => setSelectedDayIdx(di)}
          >
            {DAYS[di]}
          </button>
        ))}
      </div>
      <div className="tt-mobile-list">
        {slotCells
          .filter(c => c.dayIdx === activeDayIdx)
          .sort((a, b) => a.rowIdx - b.rowIdx)
          .map(cell => (
            <div key={`${cell.slot.id}-${cell.rowIdx}`} className="tt-mobile-card" style={{ background: color + "12" }}>
              <div className="tt-mobile-card-time">{cell.rawTime || formatTime(cell.rowIdx)}</div>
              <div className="tt-mobile-card-body">
                {renderSlotContent(cell, true)}
              </div>
            </div>
          ))}
        {slotCells.filter(c => c.dayIdx === activeDayIdx).length === 0 && (
          <div className="empty"><div className="empty-txt">해당 요일에 레슨이 없습니다.</div></div>
        )}
      </div>
    </>
  );

  // ── 데스크톱 그리드 뷰 ──
  const gridTemplateRows = `36px ${rowLayout.map(r => r.type === "slot" ? "56px" : "22px").join(" ")}`;

  const desktopView = (
    <div className="tt-wrap">
      <div className="tt-grid" style={{ gridTemplateRows }}>
        <div className="tt-corner" />
        {DAYS.map((d, di) => (
          <div key={d} className={`tt-hdr${di === todayIdx ? " tt-hdr--today" : ""}`}>{d}</div>
        ))}
        {rowLayout.flatMap((row, li) => {
          if (row.type === "empty") {
            return [
              <div key={`et-${li}`} className="tt-time tt-time--gap">{formatTime(row.fromIdx)}</div>,
              ...DAYS.map((_, di) => (
                <div key={`ec-${li}-${di}`} className={`tt-cell tt-cell--gap${di === todayIdx ? " tt-cell--today" : ""}`} />
              )),
            ];
          }
          const isHour = row.rowIdx % 2 === 0;
          const isNow = row.rowIdx === nowRowIdx;
          return [
            <div key={`t-${li}`} className={`tt-time${isHour ? " tt-time--hour" : ""}${isNow ? " tt-time--now" : ""}`}>
              {formatTime(row.rowIdx)}
              {isNow && <span className="tt-now-dot" />}
            </div>,
            ...DAYS.map((_, di) => {
              const cell = cellMap[`${di}-${row.rowIdx}`];
              const isToday = di === todayIdx;
              const cellCls = `tt-cell${isHour ? " tt-cell--hour" : ""}${isToday ? " tt-cell--today" : ""}${isNow && isToday ? " tt-cell--now" : ""}`;
              if (!cell) return (
                <div key={`c-${li}-${di}`} className={cellCls}>
                  {onAddStudentToSlot && teacherId && (
                    <button
                      className="tt-cell-add"
                      onClick={e => handleCellAdd(DAYS[di], formatTime(row.rowIdx), e)}
                      title="학생 배정"
                    >+</button>
                  )}
                </div>
              );
              return (
                <div key={`c-${li}-${di}`} className={cellCls}>
                  <div className="tt-slot" style={{ background: color + "15" }}>
                    {renderSlotContent(cell)}
                  </div>
                </div>
              );
            }),
          ];
        })}
      </div>
    </div>
  );

  // ── 공용 팝업 ──
  const popups = (
    <>
      {memberPopup && !studentDetail && (
        <>
          <div style={{ position: "fixed", inset: 0, zIndex: 9998 }} onClick={() => setMemberPopup(null)} />
          <div className="tt-member-popup" style={{ top: memberPopup.top, left: memberPopup.left }}>
            <div className="tt-member-popup-title">수강생</div>
            {memberPopup.members.length === 0 ? (
              <div style={{ color: "var(--ink-30)", fontSize: 12 }}>등록된 수강생 없음</div>
            ) : memberPopup.members.map(s => (
              <div
                key={s.id}
                className="tt-member-row tt-member-row--link"
                onClick={e => {
                  const rect = e.currentTarget.getBoundingClientRect();
                  setStudentDetail({ student: s, top: rect.top, left: safePopupLeft(rect.right + 8) });
                }}
              >{s.name}</div>
            ))}
            {onAddStudentToSlot && (
              <button
                className="tt-member-add-btn"
                onClick={() => {
                  const slot = (lessonSlots || []).find(s => s.id === memberPopup.slotId);
                  if (!slot) return;
                  const sch0 = (slot.schedule || [])[0];
                  if (!sch0) return;
                  setMemberPopup(null);
                  setSearchPopup({
                    slotId: slot.id,
                    teacherId: slot.teacherId,
                    day: sch0.day,
                    time: sch0.time,
                    instrument: slot.instrument,
                    top: memberPopup.top,
                    left: memberPopup.left,
                  });
                  setCellInstrument(slot.instrument);
                }}
              >
                + 학생 추가
              </button>
            )}
          </div>
        </>
      )}
      {searchPopup && (
        <StudentSearchPopup
          students={students}
          teachers={teachers}
          teacherId={searchPopup.teacherId}
          instrument={cellInstrument || searchPopup.instrument}
          setInstrument={setCellInstrument}
          top={searchPopup.top}
          left={searchPopup.left}
          onClose={() => { setSearchPopup(null); setCellInstrument(null); }}
          onSelect={async (student) => {
            const inst = cellInstrument || searchPopup.instrument;
            if (!inst) return;
            setSearchPopup(null);
            setCellInstrument(null);
            if (searchPopup.slotId) {
              const slot = (lessonSlots || []).find(s => s.id === searchPopup.slotId);
              if (slot && onAddStudentToSlot) {
                const sch = (slot.schedule || [])[0] || {};
                await onAddStudentToSlot(student, slot.teacherId, sch.day, sch.time, slot.instrument);
              }
            } else {
              if (onAddStudentToSlot) {
                await onAddStudentToSlot(student, searchPopup.teacherId, searchPopup.day, searchPopup.time, inst);
              }
            }
          }}
        />
      )}
      {studentDetail && (
        <>
          <div style={{ position: "fixed", inset: 0, zIndex: 9998 }} onClick={() => { setStudentDetail(null); setMemberPopup(null); }} />
          <div className="tt-member-popup" style={{ top: studentDetail.top, left: studentDetail.left, minWidth: 180 }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 8 }}>
              <span style={{ fontWeight: 700, fontSize: 14 }}>{studentDetail.student.name}</span>
              <span style={{ fontSize: 11, cursor: "pointer", color: "var(--ink-30)" }} onClick={() => setStudentDetail(null)}>✕</span>
            </div>
            {(studentDetail.student.lessons || []).map((l, i) => (
              <div key={i} style={{ fontSize: 12, color: "var(--ink-60)", marginBottom: 2 }}>
                {l.instrument && <span>{l.instrument}</span>}
                {(l.schedule || []).map((sc, si) => (
                  <span key={si} style={{ marginLeft: 6, color: "var(--ink-30)" }}>{sc.day} {sc.time}</span>
                ))}
              </div>
            ))}
            {studentDetail.student.phone && (
              <div style={{ fontSize: 12, color: "var(--ink-60)", marginTop: 6 }}>📞 {studentDetail.student.phone}</div>
            )}
            {studentDetail.student.guardianPhone && (
              <div style={{ fontSize: 12, color: "var(--ink-60)", marginTop: 2 }}>👨‍👩‍👧 {studentDetail.student.guardianPhone}</div>
            )}
            {studentDetail.student.status === "paused" && (
              <div style={{ fontSize: 11, color: "var(--gold-dk)", marginTop: 6, fontWeight: 600 }}>● 수강 일시정지</div>
            )}
          </div>
        </>
      )}
    </>
  );

  return (
    <>
      {isMobile ? mobileView : desktopView}
      {popups}
    </>
  );
}

function TeacherSelectGrid({ teachers, onSelect }) {
  return (
    <div>
      <div style={{ fontSize: 13, color: "var(--ink-60)", marginBottom: 16 }}>
        시간표를 확인할 강사를 선택하세요.
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(140px, 1fr))", gap: 10 }}>
        {(teachers || []).map(t => (
          <div
            key={t.id}
            className="card"
            style={{ padding: "14px 12px", cursor: "pointer", textAlign: "center" }}
            onClick={() => onSelect(t.id)}
          >
            <Av name={t.name} size="av-sm" />
            <div style={{ fontSize: 13, fontWeight: 600, marginTop: 8 }}>{t.name}</div>
            <div style={{ fontSize: 11, color: "var(--ink-30)" }}>{(t.instruments || []).join(", ")}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

export default function TimetableView({ lessonSlots, students, teachers, currentUser, onUpdateSlot, onAddStudentToSlot }) {
  const isTeacher = currentUser.role === "teacher";
  const canSeeAll = canManageAll(currentUser.role);
  const [selectedTeacherId, setSelectedTeacherId] = useState(isTeacher ? currentUser.id : null);
  const selectedTeacher = selectedTeacherId ? teachers.find(t => t.id === selectedTeacherId) : null;

  return (
    <div>
      <div className="ph">
        <div>
          <h1>시간표</h1>
          <div className="ph-sub">08:00 ~ 22:00 주간 레슨 현황</div>
        </div>
      </div>
      {canSeeAll && selectedTeacherId && (
        <div style={{ marginBottom: 12 }}>
          <button className="btn btn-secondary btn-sm" onClick={() => setSelectedTeacherId(null)} style={{ fontSize: 12 }}>
            ← 강사 목록
          </button>
          {selectedTeacher && (
            <span style={{ marginLeft: 12, fontSize: 14, fontWeight: 600 }}>{selectedTeacher.name} 강사 시간표</span>
          )}
        </div>
      )}
      {canSeeAll && !selectedTeacherId ? (
        <TeacherSelectGrid teachers={teachers} onSelect={setSelectedTeacherId} />
      ) : selectedTeacherId ? (
        <TimetableGrid
          lessonSlots={lessonSlots}
          students={students}
          teachers={teachers}
          teacherId={selectedTeacherId}
          canSeeAll={canSeeAll}
          onUpdateSlot={onUpdateSlot}
          onAddStudentToSlot={onAddStudentToSlot}
        />
      ) : (
        <div className="empty"><div className="empty-txt">시간표를 불러올 수 없습니다.</div></div>
      )}
    </div>
  );
}
