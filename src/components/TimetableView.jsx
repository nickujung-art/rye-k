import { useState } from "react";
import { canManageAll } from "../utils.js";
import { Av } from "./shared/CommonUI.jsx";

const DAYS = ["월","화","수","목","금","토","일"];
const TIME_START = 9;   // 09:00
const TIME_END = 21;    // 21:00 (마지막 행)
const ROWS = (TIME_END - TIME_START) * 2 + 1; // = 25 (09:00~21:00, rowIdx 0~24)

const TEACHER_COLORS = ["var(--blue)","var(--red)","var(--green)","#7C3AED","var(--gold-dk)","var(--blue-md)","var(--gold)","var(--red-dk)"];
function getTeacherColor(id, teachersList) {
  if (!id) return "var(--ink-30)";
  const idx = teachersList.findIndex(t => t.id === id);
  return TEACHER_COLORS[Math.abs(idx) % TEACHER_COLORS.length] || "var(--ink-30)";
}

function formatTimeLabel(rowIdx) {
  const totalMins = (TIME_START + Math.floor(rowIdx / 2)) * 60 + (rowIdx % 2) * 30;
  const h = Math.floor(totalMins / 60);
  const m = totalMins % 60;
  return `${String(h).padStart(2,"0")}:${String(m).padStart(2,"0")}`;
}

function TimetableGrid({ lessonSlots, students, teachers, teacherId }) {
  const color = getTeacherColor(teacherId, teachers);

  // 슬롯을 그리드 위치로 매핑
  // slotCell: { dayIdx, rowIdx, slot, memberCount }[]
  const slotCells = [];
  (lessonSlots || [])
    .filter(s => s.teacherId === teacherId && s.status !== "closed")
    .forEach(slot => {
      (slot.schedule || []).forEach(sc => {
        const dayIdx = DAYS.indexOf(sc.day);
        if (dayIdx < 0) return;
        const [h, mStr] = (sc.time || "09:00").split(":").map(Number);
        const m = mStr || 0;
        const rowIdx = (h - TIME_START) * 2 + (m >= 30 ? 1 : 0);
        if (rowIdx < 0 || rowIdx >= ROWS) return; // 범위 밖 스킵
        const memberCount = (students || []).filter(s =>
          s.status === "active" && !s.isInstitution &&
          (s.lessons || []).some(l => l.slotId === slot.id)
        ).length;
        slotCells.push({ dayIdx, rowIdx, slot, memberCount });
      });
    });

  return (
    <div className="timetable-wrap">
      <div className="timetable-grid">
        {/* 헤더 행 — 첫 번째 셀: 빈 코너 */}
        <div className="timetable-header" />
        {DAYS.map(d => (
          <div key={d} className="timetable-header">{d}</div>
        ))}

        {/* 시간 행 × 요일 열 */}
        {Array.from({ length: ROWS }, (_, rowIdx) => {
          const timeLabel = formatTimeLabel(rowIdx);
          return [
            <div key={`t-${rowIdx}`} className="timetable-time">{timeLabel}</div>,
            ...DAYS.map((d, dayIdx) => {
              const cell = slotCells.find(c => c.dayIdx === dayIdx && c.rowIdx === rowIdx);
              if (cell) {
                const bg = color;
                return (
                  <div key={`${dayIdx}-${rowIdx}`} className="timetable-cell">
                    <div className="timetable-slot" style={{
                      background: bg + "26",  // ~15% 투명도
                      borderLeft: `3px solid ${bg}`,
                    }}>
                      <div className="timetable-slot-name">{cell.slot.name}</div>
                      {cell.memberCount > 0 && (
                        <div className="timetable-slot-sub">{cell.memberCount}명</div>
                      )}
                    </div>
                  </div>
                );
              }
              return <div key={`${dayIdx}-${rowIdx}`} className="timetable-cell" />;
            }),
          ];
        })}
      </div>
    </div>
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
            style={{ padding: "14px 12px", cursor: "pointer", textAlign: "center", borderLeft: `4px solid ${getTeacherColor(t.id, teachers)}` }}
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

export default function TimetableView({ lessonSlots, students, teachers, currentUser }) {
  const isTeacher = currentUser.role === "teacher";
  const canSeeAll = canManageAll(currentUser.role);
  const [selectedTeacherId, setSelectedTeacherId] = useState(isTeacher ? currentUser.id : null);

  const selectedTeacher = selectedTeacherId ? teachers.find(t => t.id === selectedTeacherId) : null;

  return (
    <div>
      <div className="ph">
        <div>
          <h1>시간표</h1>
          <div className="ph-sub">09:00 ~ 21:00 주간 레슨 현황</div>
        </div>
      </div>

      {canSeeAll && selectedTeacherId && (
        <div style={{ marginBottom: 12 }}>
          <button
            className="btn btn-secondary btn-sm"
            onClick={() => setSelectedTeacherId(null)}
            style={{ fontSize: 12 }}
          >
            &larr; 강사 목록
          </button>
          {selectedTeacher && (
            <span style={{ marginLeft: 12, fontSize: 14, fontWeight: 600 }}>
              {selectedTeacher.name} 강사 시간표
            </span>
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
        />
      ) : (
        <div className="empty">
          <div className="empty-txt">시간표를 불러올 수 없습니다.</div>
        </div>
      )}
    </div>
  );
}
