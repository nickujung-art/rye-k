import { useState, useMemo } from "react";
import { canManageAll, getAudience, fmtDateShort, uid } from "../../utils.js";

const COND_LABEL = { excellent: "매우 좋음", good: "좋음", normal: "보통", poor: "부진" };

function formatNoteForReport(a) {
  const ln = a.lessonNote;
  if (!ln) return null;
  if (typeof ln === "string") return `[${a.date}] ${ln}`;
  const lines = [`[${a.date}]`];
  if (ln.condition) lines.push(`컨디션: ${COND_LABEL[ln.condition] || ln.condition}`);
  if (ln.progress) lines.push(`진도: ${ln.progress}`);
  if (ln.content) lines.push(`내용: ${ln.content}`);
  if (ln.assignment) lines.push(`과제: ${ln.assignment}`);
  if (ln.makeupNeeded && ln.makeupPlan) lines.push(`보강: ${ln.makeupPlan}`);
  if (ln.memo) lines.push(`메모: ${ln.memo}`);
  return lines.join("\n");
}
import { aiGenerateMonthlyReport } from "../../aiClient.js";

function prevMonthStr() {
  const d = new Date();
  d.setMonth(d.getMonth() - 1);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

function computeAttSummary(monthRecs) {
  const total = monthRecs.length;
  const present = monthRecs.filter(a => a.status === "present").length;
  const absent = monthRecs.filter(a => a.status === "absent").length;
  const late = monthRecs.filter(a => a.status === "late").length;
  const excused = monthRecs.filter(a => a.status === "excused").length;
  const rate = total > 0 ? Math.round(((present + late) / total) * 100) : null;
  return { total, present, absent, late, excused, rate };
}

function computeTrend(rate) {
  if (rate === null) return "stable";
  if (rate >= 85) return "improving";
  if (rate < 60) return "declining";
  return "stable";
}

export default function MonthlyReportsView({ students, teachers, attendance, currentUser, aiReports, onSaveAiReports }) {
  const [selectedMonth, setSelectedMonth] = useState(prevMonthStr);
  const [filterTeacherId, setFilterTeacherId] = useState("all");
  const [generating, setGenerating] = useState(new Set());
  const [localEdits, setLocalEdits] = useState({});
  const [saving, setSaving] = useState(new Set());
  const [error, setError] = useState({});
  const [editingId, setEditingId] = useState(null);
  const [bulkBusy, setBulkBusy] = useState(null); // null | "gen" | "pub"
  const [bulkProgress, setBulkProgress] = useState({ done: 0, total: 0, errors: 0 });
  const [confirmPubAll, setConfirmPubAll] = useState(false);
  const [selectedIds, setSelectedIds] = useState(() => new Set());

  const toggleSelect = (sid) => setSelectedIds(prev => { const n = new Set(prev); n.has(sid) ? n.delete(sid) : n.add(sid); return n; });
  const clearSelection = () => setSelectedIds(new Set());

  const isAdmin = canManageAll(currentUser.role);
  const showBannerBase = new Date().getDate() === 1;

  const viewStudents = useMemo(() => {
    let list = students.filter(s => !s.isInstitution && (s.status || "active") !== "withdrawn");
    if (!isAdmin) {
      list = list.filter(s => s.teacherId === currentUser.id || (s.lessons || []).some(l => l.teacherId === currentUser.id));
    } else if (filterTeacherId !== "all") {
      list = list.filter(s => s.teacherId === filterTeacherId || (s.lessons || []).some(l => l.teacherId === filterTeacherId));
    }
    return list.sort((a, b) => a.name.localeCompare(b.name, "ko"));
  }, [students, currentUser, isAdmin, filterTeacherId]);

  const reportsForMonth = useMemo(
    () => aiReports.filter(r => r.month === selectedMonth && r.status !== "archived"),
    [aiReports, selectedMonth]
  );

  const draftCount = reportsForMonth.filter(r => r.status === "draft").length;
  const noReportCount = viewStudents.filter(s => !reportsForMonth.find(r => r.studentId === s.id)).length;
  const showBanner = showBannerBase && noReportCount > 0;

  const monthOptions = useMemo(() => {
    const opts = [];
    const d = new Date();
    for (let i = 0; i < 6; i++) {
      const dd = new Date(d.getFullYear(), d.getMonth() - i, 1);
      const val = `${dd.getFullYear()}-${String(dd.getMonth() + 1).padStart(2, "0")}`;
      opts.push({ val, label: `${dd.getFullYear()}년 ${dd.getMonth() + 1}월` });
    }
    return opts;
  }, []);

  const handleGenerate = async (student) => {
    const monthRecs = attendance.filter(a => a.studentId === student.id && a.date?.startsWith(selectedMonth));
    const summary = computeAttSummary(monthRecs);
    const noteSummaries = monthRecs
      .filter(a => a.lessonNote)
      .sort((a, b) => (a.date || "").localeCompare(b.date || ""))
      .map(formatNoteForReport)
      .filter(Boolean);
    const commentCount = monthRecs.reduce((acc, a) => acc + (a.comments?.length || 0), 0);
    const instruments = (student.lessons || []).map(l => l.instrument).filter(Boolean);
    const audience = getAudience(student);

    setGenerating(prev => new Set([...prev, student.id]));
    setError(prev => ({ ...prev, [student.id]: null }));
    try {
      const body = await aiGenerateMonthlyReport({
        studentName: student.name,
        instruments,
        audience,
        month: selectedMonth,
        attendanceSummary: summary.total > 0 ? summary : null,
        conditionTrend: computeTrend(summary.rate),
        noteSummaries: noteSummaries.length > 0 ? noteSummaries : null,
        commentCount: commentCount > 0 ? commentCount : null,
      });
      const newReport = {
        id: `rep_${uid()}`,
        studentId: student.id,
        month: selectedMonth,
        audience,
        status: "draft",
        body,
        attendanceSummary: summary,
        conditionTrend: computeTrend(summary.rate),
        createdAt: Date.now(),
        createdBy: currentUser.id,
      };
      await onSaveAiReports([...aiReports, newReport]);
    } catch (e) {
      const msg = e.message === "rate_limited" ? "잠시 후 다시 시도해주세요 (분당 제한)" : e.message === "auth_required" ? "로그인이 필요합니다." : "AI 오류가 발생했습니다.";
      setError(prev => ({ ...prev, [student.id]: msg }));
    } finally {
      setGenerating(prev => { const n = new Set(prev); n.delete(student.id); return n; });
    }
  };

  const handleSaveDraft = async (report) => {
    if (localEdits[report.id] === undefined) return;
    setSaving(prev => new Set([...prev, report.id]));
    try {
      await onSaveAiReports(aiReports.map(r => r.id === report.id ? { ...r, body: localEdits[report.id] } : r));
      setLocalEdits(prev => { const n = { ...prev }; delete n[report.id]; return n; });
    } finally {
      setSaving(prev => { const n = new Set(prev); n.delete(report.id); return n; });
    }
  };

  const handlePublish = async (report) => {
    const updated = aiReports.map(r => r.id === report.id ? {
      ...r,
      status: "published",
      publishedAt: Date.now(),
      publishedBy: currentUser.id,
      body: localEdits[report.id] ?? r.body,
    } : r);
    await onSaveAiReports(updated);
    setLocalEdits(prev => { const n = { ...prev }; delete n[report.id]; return n; });
  };

  const handleDelete = async (report) => {
    await onSaveAiReports(aiReports.filter(r => r.id !== report.id));
    setLocalEdits(prev => { const n = { ...prev }; delete n[report.id]; return n; });
  };

  const handleArchive = async (report) => {
    await onSaveAiReports(aiReports.map(r => r.id === report.id ? { ...r, status: "archived" } : r));
  };

  const handleEditPublished = (report) => {
    setEditingId(report.id);
    setLocalEdits(prev => ({ ...prev, [report.id]: report.body }));
  };

  const handleCancelEdit = (report) => {
    setEditingId(null);
    setLocalEdits(prev => { const n = { ...prev }; delete n[report.id]; return n; });
  };

  const handleSavePublished = async (report) => {
    if (localEdits[report.id] === undefined) { setEditingId(null); return; }
    setSaving(prev => new Set([...prev, report.id]));
    try {
      await onSaveAiReports(aiReports.map(r => r.id === report.id ? { ...r, body: localEdits[report.id], updatedAt: Date.now() } : r));
      setLocalEdits(prev => { const n = { ...prev }; delete n[report.id]; return n; });
      setEditingId(null);
    } finally {
      setSaving(prev => { const n = new Set(prev); n.delete(report.id); return n; });
    }
  };

  // 미생성 + 출석/노트 1개 이상 있는 학생 (선택과 무관)
  const eligibleForGen = useMemo(() => {
    return viewStudents.filter(s => {
      if (reportsForMonth.find(r => r.studentId === s.id)) return false;
      const recs = attendance.filter(a => a.studentId === s.id && a.date?.startsWith(selectedMonth));
      return recs.length > 0;
    });
  }, [viewStudents, reportsForMonth, attendance, selectedMonth]);

  // 일괄 생성 대상: 선택된 학생이 있으면 그 중 미생성만, 없으면 전체 미생성
  const bulkGenTargets = useMemo(() => {
    if (selectedIds.size === 0) return eligibleForGen;
    return eligibleForGen.filter(s => selectedIds.has(s.id));
  }, [eligibleForGen, selectedIds]);

  const allDraftsThisMonth = useMemo(
    () => reportsForMonth.filter(r => r.status === "draft"),
    [reportsForMonth]
  );

  // 일괄 공개 대상: 선택된 학생이 있으면 그 중 draft만, 없으면 전체 draft
  const draftsThisMonth = useMemo(() => {
    if (selectedIds.size === 0) return allDraftsThisMonth;
    return allDraftsThisMonth.filter(r => selectedIds.has(r.studentId));
  }, [allDraftsThisMonth, selectedIds]);

  const selectAllVisible = () => setSelectedIds(new Set(viewStudents.map(s => s.id)));
  const hasSelection = selectedIds.size > 0;

  const handleBulkGenerate = async () => {
    if (bulkBusy || bulkGenTargets.length === 0) return;
    setBulkBusy("gen");
    setBulkProgress({ done: 0, total: bulkGenTargets.length, errors: 0 });
    let acc = [...aiReports];
    let errs = 0;
    for (let i = 0; i < bulkGenTargets.length; i++) {
      const student = bulkGenTargets[i];
      const monthRecs = attendance.filter(a => a.studentId === student.id && a.date?.startsWith(selectedMonth));
      const summary = computeAttSummary(monthRecs);
      const noteSummaries = monthRecs.filter(a => a.lessonNote).sort((a, b) => (a.date || "").localeCompare(b.date || "")).map(formatNoteForReport).filter(Boolean);
      const commentCount = monthRecs.reduce((acc2, a) => acc2 + (a.comments?.length || 0), 0);
      const instruments = (student.lessons || []).map(l => l.instrument).filter(Boolean);
      const audience = getAudience(student);
      setGenerating(prev => new Set([...prev, student.id]));
      setError(prev => ({ ...prev, [student.id]: null }));
      try {
        const body = await aiGenerateMonthlyReport({
          studentName: student.name, instruments, audience, month: selectedMonth,
          attendanceSummary: summary.total > 0 ? summary : null,
          conditionTrend: computeTrend(summary.rate),
          noteSummaries: noteSummaries.length > 0 ? noteSummaries : null,
          commentCount: commentCount > 0 ? commentCount : null,
        });
        const newReport = {
          id: `rep_${uid()}`, studentId: student.id, month: selectedMonth,
          audience, status: "draft", body, attendanceSummary: summary,
          conditionTrend: computeTrend(summary.rate),
          createdAt: Date.now(), createdBy: currentUser.id,
        };
        acc = [...acc, newReport];
        await onSaveAiReports(acc);
      } catch (e) {
        errs++;
        const msg = e.message === "rate_limited" ? "분당 제한" : e.message === "auth_required" ? "인증 필요" : "AI 오류";
        setError(prev => ({ ...prev, [student.id]: msg }));
      } finally {
        setGenerating(prev => { const n = new Set(prev); n.delete(student.id); return n; });
        setBulkProgress(p => ({ ...p, done: p.done + 1, errors: errs }));
      }
      if (i < bulkGenTargets.length - 1) await new Promise(r => setTimeout(r, 1500));
    }
    setBulkBusy(null);
    if (hasSelection) clearSelection();
  };

  const handleBulkPublish = async () => {
    if (bulkBusy || draftsThisMonth.length === 0) return;
    setBulkBusy("pub");
    const draftIds = new Set(draftsThisMonth.map(d => d.id));
    const now = Date.now();
    const updated = aiReports.map(r => {
      if (!draftIds.has(r.id)) return r;
      return { ...r, status: "published", publishedAt: now, publishedBy: currentUser.id, body: localEdits[r.id] ?? r.body };
    });
    try {
      await onSaveAiReports(updated);
      setLocalEdits(prev => {
        const n = { ...prev };
        draftIds.forEach(id => delete n[id]);
        return n;
      });
    } finally {
      setBulkBusy(null);
      setConfirmPubAll(false);
      if (hasSelection) clearSelection();
    }
  };

  return (
    <div>
      <div className="ph"><div><h1>월간 리포트</h1></div></div>

      {showBanner && (
        <div style={{background:"linear-gradient(135deg,#EFF6FF,#DBEAFE)",border:"1px solid #BFDBFE",borderRadius:"var(--radius)",padding:"12px 16px",marginBottom:16,display:"flex",gap:10,alignItems:"center"}}>
          <span style={{fontSize:20}}>📊</span>
          <div>
            <div style={{fontWeight:600,fontSize:14}}>지난 달 리포트 {noReportCount}개 생성 가능</div>
            <div style={{fontSize:12,color:"var(--ink-50)"}}>아래 학생 카드에서 초안을 생성하고 검토해주세요.</div>
          </div>
        </div>
      )}

      <div style={{display:"flex",gap:8,marginBottom:12,flexWrap:"wrap",alignItems:"center"}}>
        <select className="inp" style={{width:"auto",minWidth:130}} value={selectedMonth} onChange={e => setSelectedMonth(e.target.value)}>
          {monthOptions.map(o => <option key={o.val} value={o.val}>{o.label}</option>)}
        </select>
        {isAdmin && (
          <select className="inp" style={{width:"auto",minWidth:130}} value={filterTeacherId} onChange={e => setFilterTeacherId(e.target.value)}>
            <option value="all">전체 강사</option>
            {teachers.filter(t => t.role !== "admin" && t.role !== "manager").map(t => (
              <option key={t.id} value={t.id}>{t.name}</option>
            ))}
          </select>
        )}
        <span style={{fontSize:12,color:"var(--ink-30)",marginLeft:"auto"}}>{viewStudents.length}명 · 초안 {draftCount}건</span>
      </div>

      {/* 일괄 작업 바 */}
      <div style={{display:"flex",gap:8,marginBottom:16,flexWrap:"wrap",alignItems:"center",background:hasSelection?"var(--blue-lt)":"var(--bg)",border:`1px solid ${hasSelection?"var(--blue-lt)":"var(--border)"}`,borderRadius:10,padding:"10px 12px",transition:"background .12s, border-color .12s"}}>
        <span style={{fontSize:12,color:hasSelection?"var(--blue)":"var(--ink-50)",fontWeight:600}}>
          {hasSelection ? `✓ ${selectedIds.size}명 선택됨` : "일괄 작업"}
        </span>
        {!hasSelection && (
          <button
            type="button"
            onClick={selectAllVisible}
            disabled={viewStudents.length === 0}
            style={{background:"transparent",border:"1px dashed var(--ink-30)",color:"var(--ink-50)",fontSize:11,padding:"3px 8px",borderRadius:6,cursor:viewStudents.length>0?"pointer":"not-allowed",fontFamily:"inherit"}}
          >
            전체 선택
          </button>
        )}
        {hasSelection && (
          <button
            type="button"
            onClick={clearSelection}
            style={{background:"transparent",border:"1px dashed var(--blue)",color:"var(--blue)",fontSize:11,padding:"3px 8px",borderRadius:6,cursor:"pointer",fontFamily:"inherit"}}
          >
            선택 해제
          </button>
        )}
        <button
          className="btn btn-sm"
          onClick={handleBulkGenerate}
          disabled={!!bulkBusy || bulkGenTargets.length === 0}
          style={{background:bulkGenTargets.length>0?"var(--blue)":"var(--border)",color:bulkGenTargets.length>0?"#fff":"var(--ink-30)",border:"none",cursor:bulkGenTargets.length>0&&!bulkBusy?"pointer":"not-allowed"}}
        >
          {bulkBusy === "gen"
            ? `생성 중… ${bulkProgress.done}/${bulkProgress.total}`
            : hasSelection
              ? `✨ 선택 ${bulkGenTargets.length}명 초안 생성`
              : `✨ 일괄 초안 생성 (${bulkGenTargets.length}명)`}
        </button>
        {!confirmPubAll ? (
          <button
            className="btn btn-sm"
            onClick={() => setConfirmPubAll(true)}
            disabled={!!bulkBusy || draftsThisMonth.length === 0}
            style={{background:draftsThisMonth.length>0?"var(--green)":"var(--border)",color:draftsThisMonth.length>0?"#fff":"var(--ink-30)",border:"none",cursor:draftsThisMonth.length>0&&!bulkBusy?"pointer":"not-allowed"}}
          >
            {hasSelection
              ? `📤 선택 ${draftsThisMonth.length}건 공개`
              : `📤 모두 공개 (${draftsThisMonth.length}건)`}
          </button>
        ) : (
          <span style={{display:"inline-flex",gap:6,alignItems:"center",background:"var(--gold-lt)",border:"1px solid #FCD34D",borderRadius:8,padding:"4px 8px"}}>
            <span style={{fontSize:12,color:"var(--gold-dk)",fontWeight:600}}>
              {hasSelection ? `선택 ${draftsThisMonth.length}건 공개?` : `${draftsThisMonth.length}건 모두 공개?`}
            </span>
            <button className="btn btn-sm" onClick={handleBulkPublish} disabled={bulkBusy === "pub"} style={{background:"var(--green)",color:"#fff",border:"none",fontSize:11,padding:"3px 8px"}}>
              {bulkBusy === "pub" ? "공개 중…" : "확인"}
            </button>
            <button className="btn btn-sm" onClick={() => setConfirmPubAll(false)} style={{background:"transparent",color:"var(--gold-dk)",border:"1px solid #FCD34D",fontSize:11,padding:"3px 8px"}}>
              취소
            </button>
          </span>
        )}
        {bulkBusy === "gen" && bulkProgress.errors > 0 && (
          <span style={{fontSize:11,color:"var(--red)"}}>오류 {bulkProgress.errors}건</span>
        )}
        {!hasSelection && !bulkBusy && (
          <span style={{fontSize:11,color:"var(--ink-30)",marginLeft:"auto"}}>
            💡 카드의 체크박스로 일부만 선택 가능
          </span>
        )}
      </div>

      <div style={{display:"flex",flexDirection:"column",gap:12}}>
        {viewStudents.map(s => {
          const report = reportsForMonth.find(r => r.studentId === s.id);
          const isGenerating = generating.has(s.id);
          const err = error[s.id];
          const teacher = teachers.find(t => t.id === s.teacherId);
          const instruments = (s.lessons || []).map(l => l.instrument).filter(Boolean);

          const isSelected = selectedIds.has(s.id);
          return (
            <div key={s.id} style={{background:"var(--paper)",border:`1px solid ${isSelected?"var(--blue)":"var(--border)"}`,borderRadius:"var(--radius)",padding:16,boxShadow:isSelected?"0 0 0 2px rgba(43,58,159,.08)":"none",transition:"border-color .12s, box-shadow .12s"}}>
              <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:8,gap:8}}>
                <label style={{display:"flex",alignItems:"center",gap:10,minWidth:0,cursor:"pointer",userSelect:"none"}}>
                  <input
                    type="checkbox"
                    checked={isSelected}
                    onChange={() => toggleSelect(s.id)}
                    style={{width:16,height:16,accentColor:"var(--blue)",cursor:"pointer",flexShrink:0}}
                  />
                  <span style={{minWidth:0}}>
                    <span style={{fontWeight:700,fontSize:15}}>{s.name}</span>
                    {instruments.length > 0 && <span style={{fontSize:12,color:"var(--ink-50)",marginLeft:8}}>{instruments.join(", ")}</span>}
                    {teacher && isAdmin && <span style={{fontSize:11,color:"var(--ink-30)",marginLeft:6}}>({teacher.name})</span>}
                  </span>
                </label>
                <div style={{flexShrink:0}}>
                  {!report && !isGenerating && (
                    <button className="btn btn-sm" onClick={() => handleGenerate(s)} style={{background:"var(--blue)",color:"#fff",border:"none",whiteSpace:"nowrap"}}>
                      ✨ 초안 생성
                    </button>
                  )}
                  {isGenerating && <span style={{fontSize:12,color:"var(--blue)"}}>AI 작성 중…</span>}
                  {report?.status === "published" && (
                    <span style={{fontSize:12,color:"var(--green)",fontWeight:600}}>공개됨 ✓ {fmtDateShort(report.publishedAt)}</span>
                  )}
                </div>
              </div>

              {err && <div style={{fontSize:12,color:"var(--red)",marginBottom:8}}>{err}</div>}

              {report?.status === "draft" && (
                <>
                  <textarea
                    className="inp"
                    style={{width:"100%",minHeight:160,fontSize:13,lineHeight:1.7,resize:"vertical",boxSizing:"border-box"}}
                    value={localEdits[report.id] ?? report.body}
                    onChange={e => setLocalEdits(prev => ({ ...prev, [report.id]: e.target.value }))}
                  />
                  <div style={{display:"flex",gap:8,marginTop:8,flexWrap:"wrap"}}>
                    <button
                      className="btn btn-sm"
                      onClick={() => handleSaveDraft(report)}
                      disabled={saving.has(report.id) || localEdits[report.id] === undefined}
                      style={{background:localEdits[report.id]!==undefined?"var(--ink-10)":"var(--bg)",color:localEdits[report.id]!==undefined?"var(--ink)":"var(--ink-30)"}}
                    >
                      {saving.has(report.id) ? "저장 중…" : "💾 수정 저장"}
                    </button>
                    <button className="btn btn-sm" onClick={() => handlePublish(report)} style={{background:"var(--blue)",color:"#fff",border:"none"}}>
                      📤 공개
                    </button>
                    <button className="btn btn-sm" onClick={() => handleDelete(report)} style={{background:"transparent",color:"var(--red)",border:"1px solid var(--red)"}}>
                      삭제
                    </button>
                  </div>
                </>
              )}

              {report?.status === "published" && editingId !== report.id && (
                <>
                  <div style={{fontSize:13,color:"var(--ink-70)",lineHeight:1.7,whiteSpace:"pre-wrap",background:"var(--bg)",padding:"10px 12px",borderRadius:6,marginBottom:8}}>
                    {report.body}
                  </div>
                  {report.updatedAt && report.updatedAt > (report.publishedAt || 0) && (
                    <div style={{fontSize:11,color:"var(--ink-30)",marginBottom:8}}>마지막 수정 {fmtDateShort(report.updatedAt)}</div>
                  )}
                  <div style={{display:"flex",gap:8,flexWrap:"wrap"}}>
                    <button className="btn btn-sm" onClick={() => handleEditPublished(report)} style={{background:"var(--ink-10)",color:"var(--ink)",fontSize:12}}>
                      ✏️ 수정
                    </button>
                    <button className="btn btn-sm" onClick={() => handleArchive(report)} style={{background:"transparent",color:"var(--ink-30)",border:"1px solid var(--border)",fontSize:11}}>
                      보관 처리
                    </button>
                  </div>
                </>
              )}

              {report?.status === "published" && editingId === report.id && (
                <>
                  <textarea
                    className="inp"
                    style={{width:"100%",minHeight:200,fontSize:13,lineHeight:1.7,resize:"vertical",boxSizing:"border-box"}}
                    value={localEdits[report.id] ?? report.body}
                    onChange={e => setLocalEdits(prev => ({ ...prev, [report.id]: e.target.value }))}
                  />
                  <div style={{display:"flex",gap:8,marginTop:8,flexWrap:"wrap"}}>
                    <button className="btn btn-sm" onClick={() => handleSavePublished(report)} disabled={saving.has(report.id)} style={{background:"var(--blue)",color:"#fff",border:"none"}}>
                      {saving.has(report.id) ? "저장 중…" : "💾 저장"}
                    </button>
                    <button className="btn btn-sm" onClick={() => handleCancelEdit(report)} style={{background:"transparent",color:"var(--ink-50)",border:"1px solid var(--border)"}}>
                      취소
                    </button>
                  </div>
                </>
              )}
            </div>
          );
        })}

        {viewStudents.length === 0 && (
          <div style={{textAlign:"center",padding:40,color:"var(--ink-30)",fontSize:14}}>
            {filterTeacherId !== "all" ? "해당 강사의 회원이 없습니다." : "회원이 없습니다."}
          </div>
        )}
      </div>
    </div>
  );
}
