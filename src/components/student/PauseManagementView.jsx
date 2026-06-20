import { useState } from "react";
import { IC } from "../../constants.jsx";
import { HelpButton } from "../shared/HelpSystem.jsx";

// ── CARE LOG MODAL (기존 Dashboard CareLogModal에서 이전) ─────────────────────
function CareLogModal({ student, currentUser, onSave, onClose }) {
  const [careType, setCareType] = useState("전화");
  const [responseStatus, setResponseStatus] = useState("응답없음");
  const [note, setNote] = useState("");
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    if (saving) return;
    setSaving(true);
    const newLog = {
      id: `care_${Date.now()}`,
      createdAt: Date.now(),
      authorId: currentUser.id,
      authorName: currentUser.name,
      careType,
      responseStatus,
      note: note.trim(),
    };
    const updCareLogs = [...(student.careLogs || []), newLog];
    await onSave({ ...student, careLogs: updCareLogs });
    setSaving(false);
    onClose();
  };

  return (
    <>
      <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,.4)", zIndex: 9000 }} onClick={onClose} />
      <div style={{
        position: "fixed", left: "50%", top: "50%",
        transform: "translate(-50%,-50%)",
        background: "var(--paper)", borderRadius: "var(--radius)",
        padding: 20, width: "min(90vw, 340px)", zIndex: 9001,
        boxShadow: "0 8px 32px rgba(0,0,0,.18)",
      }}>
        <div style={{ fontWeight: 600, fontSize: 15, marginBottom: 14 }}>
          케어로그 입력 — {student.name}
        </div>
        <div style={{ marginBottom: 10 }}>
          <div style={{ fontSize: 12, color: "var(--ink-30)", marginBottom: 4 }}>연락 방법</div>
          <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
            {["전화","문자","알림톡","기타"].map(t => (
              <button key={t}
                onClick={() => setCareType(t)}
                style={{
                  padding: "4px 10px", borderRadius: 6, fontSize: 12, cursor: "pointer",
                  fontFamily: "inherit",
                  border: careType === t ? "1px solid var(--blue)" : "1px solid var(--border)",
                  background: careType === t ? "var(--blue-lt)" : "var(--bg)",
                  color: careType === t ? "var(--blue)" : undefined,
                }}
              >{t}</button>
            ))}
          </div>
        </div>
        <div style={{ marginBottom: 10 }}>
          <div style={{ fontSize: 12, color: "var(--ink-30)", marginBottom: 4 }}>응답 여부</div>
          <select className="inp" value={responseStatus} onChange={e => setResponseStatus(e.target.value)} style={{ fontSize: 13 }}>
            {["응답없음","복귀 의향 있음","복귀 의향 없음","추후 연락"].map(s => <option key={s} value={s}>{s}</option>)}
          </select>
        </div>
        <div style={{ marginBottom: 14 }}>
          <div style={{ fontSize: 12, color: "var(--ink-30)", marginBottom: 4 }}>메모</div>
          <textarea
            className="inp"
            value={note}
            onChange={e => setNote(e.target.value)}
            placeholder="연락 내용, 특이사항..."
            rows={3}
            style={{ resize: "vertical", fontSize: 13 }}
          />
        </div>
        <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
          <button onClick={onClose} style={{ padding: "7px 14px", borderRadius: 6, border: "1px solid var(--border)", background: "var(--bg)", cursor: "pointer", fontSize: 13, fontFamily: "inherit" }}>취소</button>
          <button onClick={handleSave} disabled={saving} style={{ padding: "7px 14px", borderRadius: 6, border: "none", background: "var(--blue)", color: "#fff", cursor: "pointer", fontSize: 13, fontFamily: "inherit" }}>
            {saving ? "저장 중..." : "저장"}
          </button>
        </div>
      </div>
    </>
  );
}

// ── PAUSE CARD ─────────────────────────────────────────────────────────────────
function PauseCard({ student, teachers, lessonSlots, currentUser, onResume, onUpdateStudent, showToast }) {
  const [confirmingResume, setConfirmingResume] = useState(false);
  const [careModal, setCareModal] = useState(false);
  const [showHistory, setShowHistory] = useState(false);

  const teacher = teachers.find(t => t.id === (student.teacherId || (student.lessons||[])[0]?.teacherId));
  const mainInstrument = (student.lessons||[])[0]?.instrument || "";
  const days = student.pausedAt ? Math.floor((Date.now() - student.pausedAt) / 86400000) : null;
  const careLogs = student.careLogs || [];
  const lastLog = careLogs.length > 0 ? careLogs[careLogs.length - 1] : null;
  const daysSinceCare = lastLog ? Math.floor((Date.now() - lastLog.createdAt) / 86400000) : null;
  const needsCare = days >= 14 && (daysSinceCare === null || daysSinceCare >= 14);
  const stage = !needsCare ? "ok" : days >= 30 ? "urgent" : "due";

  // 슬롯 이력: student.lessons[].slotId → lessonSlots에서 name 조회
  const slotNames = (student.lessons || [])
    .map(l => l.slotId ? (lessonSlots || []).find(s => s.id === l.slotId)?.name : null)
    .filter(Boolean);

  // pauseHistory (이전 기록)
  const history = student.pauseHistory || [];

  return (
    <div className={`pm-card${stage === "urgent" ? " pm-card--urgent" : stage === "due" ? " pm-card--due" : ""}`}>
      <div className="pm-card-header">
        <div style={{ flex: 1 }}>
          <div className="pm-card-name">{student.name}</div>
          <div className="pm-card-meta">
            {teacher?.name || "강사 미배정"}{mainInstrument ? ` · ${mainInstrument}` : ""}
          </div>
        </div>
        <div className="pm-badge-row">
          {days !== null && (
            <span className={`pm-badge${stage === "urgent" ? " pm-badge--urgent" : stage === "due" ? " pm-badge--due" : ""}`}>
              {days}일 경과
            </span>
          )}
          {stage === "urgent" && <span className="pm-badge pm-badge--urgent">케어 필요</span>}
          {stage === "due" && <span className="pm-badge pm-badge--due">케어 예정</span>}
        </div>
      </div>

      {student.pausedAt && (
        <div style={{ fontSize: 12, color: "var(--ink-30)", marginBottom: 6 }}>
          휴회 시작: {new Date(student.pausedAt).toLocaleDateString("ko-KR")}
          {student.pausedReason ? ` · 사유: ${student.pausedReason}` : ""}
        </div>
      )}

      {slotNames.length > 0 && (
        <div style={{ marginBottom: 6 }}>
          {slotNames.map((name, i) => <span key={i} className="pm-slot-tag">{name}</span>)}
        </div>
      )}

      {/* 케어로그 최근 1건 표시 */}
      {lastLog && (
        <div className="pm-care-log-row" style={{ marginBottom: 4 }}>
          <span className="pm-care-type">{lastLog.careType}</span>
          <span style={{ color: "var(--ink-60)" }}>{lastLog.responseStatus}</span>
          {lastLog.note && <span style={{ color: "var(--ink-30)", fontSize: 11 }}>{lastLog.note}</span>}
          <span style={{ marginLeft: "auto", fontSize: 10, color: "var(--ink-30)" }}>
            {daysSinceCare !== null ? `${daysSinceCare}일 전` : ""}
          </span>
        </div>
      )}

      {/* pauseHistory 이전 기록 accordion */}
      {history.length > 0 && (
        <div style={{ marginBottom: 6 }}>
          <button className="pm-accordion-toggle" onClick={() => setShowHistory(v => !v)}>
            이전 휴회 기록 {history.length}건 {showHistory ? "▲" : "▼"}
          </button>
          {showHistory && history.map((h, i) => (
            <div key={i} style={{ fontSize: 11, color: "var(--ink-30)", padding: "2px 0", borderBottom: "1px solid var(--border)" }}>
              {h.pausedAt ? new Date(h.pausedAt).toLocaleDateString("ko-KR") : "날짜 없음"}
              {h.durationDays != null ? ` (${h.durationDays}일)` : ""}
              {h.pausedReason ? ` · ${h.pausedReason}` : ""}
            </div>
          ))}
        </div>
      )}

      {/* 액션 버튼 */}
      <div style={{ display: "flex", gap: 8, marginTop: 8, flexWrap: "wrap", alignItems: "center" }}>
        <button className="pm-resume-btn" onClick={() => setCareModal(true)}>
          케어로그 입력
        </button>
        {/* 복귀 처리 — window.confirm 절대 금지, 인라인 confirm UI */}
        {!confirmingResume ? (
          <button className="pm-resume-btn" onClick={() => setConfirmingResume(true)}
            style={{ borderColor: "var(--green)", background: "#f0fff4", color: "var(--green)" }}>
            복귀 처리
          </button>
        ) : (
          <div className="pm-confirm-row">
            <span className="pm-confirm-text">복귀 처리할까요?</span>
            <button className="pm-confirm-yes" onClick={async () => { setConfirmingResume(false); await onResume(student); }}>
              확인
            </button>
            <button className="pm-confirm-no" onClick={() => setConfirmingResume(false)}>
              취소
            </button>
          </div>
        )}
      </div>

      {careModal && (
        <CareLogModal
          student={student}
          currentUser={currentUser}
          onSave={async upd => { await onUpdateStudent(upd); showToast("케어로그가 저장되었습니다."); }}
          onClose={() => setCareModal(false)}
        />
      )}
    </div>
  );
}

// ── PAUSE MANAGEMENT VIEW ──────────────────────────────────────────────────────
export default function PauseManagementView({
  students, teachers, currentUser, lessonSlots,
  onUpdateStudent, onResumeStudent, showToast,
}) {
  const paused = (students || []).filter(s => s.status === "paused" && !s.isInstitution);

  // 케어 필요 순 정렬: urgent → due → ok, 그 안에서 경과일 내림차순
  const sorted = [...paused].sort((a, b) => {
    const stageOrder = { urgent: 0, due: 1, ok: 2 };
    const getStage = s => {
      const days = s.pausedAt ? Math.floor((Date.now() - s.pausedAt) / 86400000) : 0;
      const cl = s.careLogs || [];
      const last = cl.length > 0 ? cl[cl.length - 1] : null;
      const dsc = last ? Math.floor((Date.now() - last.createdAt) / 86400000) : null;
      const nc = days >= 14 && (dsc === null || dsc >= 14);
      return !nc ? "ok" : days >= 30 ? "urgent" : "due";
    };
    const sa = stageOrder[getStage(a)];
    const sb = stageOrder[getStage(b)];
    if (sa !== sb) return sa - sb;
    return (b.pausedAt || 0) - (a.pausedAt || 0);
  });

  return (
    <div className="pm-view">
      <div className="ph">
        <div>
          <div style={{display:"flex",alignItems:"center",gap:6}}><h1>휴회 관리</h1><HelpButton helpKey="pauseManagement" /></div>
          <p>휴회 학생 {paused.length}명</p>
        </div>
      </div>
      {sorted.length === 0 ? (
        <div className="pm-empty">현재 휴회 중인 회원이 없습니다.</div>
      ) : (
        sorted.map(s => (
          <PauseCard
            key={s.id}
            student={s}
            teachers={teachers}
            lessonSlots={lessonSlots}
            currentUser={currentUser}
            onResume={onResumeStudent}
            onUpdateStudent={onUpdateStudent}
            showToast={showToast}
          />
        ))
      )}
    </div>
  );
}
