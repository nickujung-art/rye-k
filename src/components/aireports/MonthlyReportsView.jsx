import { useState, useMemo } from "react";
import { canManageAll, formatLessonNoteSummary, getAudience, fmtDateShort, uid } from "../../utils.js";
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
      .map(a => `${a.date}: ${formatLessonNoteSummary(a.lessonNote)}`)
      .filter(Boolean)
      .slice(0, 10);
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

      <div style={{display:"flex",gap:8,marginBottom:16,flexWrap:"wrap",alignItems:"center"}}>
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

      <div style={{display:"flex",flexDirection:"column",gap:12}}>
        {viewStudents.map(s => {
          const report = reportsForMonth.find(r => r.studentId === s.id);
          const isGenerating = generating.has(s.id);
          const err = error[s.id];
          const teacher = teachers.find(t => t.id === s.teacherId);
          const instruments = (s.lessons || []).map(l => l.instrument).filter(Boolean);

          return (
            <div key={s.id} style={{background:"var(--paper)",border:"1px solid var(--border)",borderRadius:"var(--radius)",padding:16}}>
              <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:8,gap:8}}>
                <div style={{minWidth:0}}>
                  <span style={{fontWeight:700,fontSize:15}}>{s.name}</span>
                  {instruments.length > 0 && <span style={{fontSize:12,color:"var(--ink-50)",marginLeft:8}}>{instruments.join(", ")}</span>}
                  {teacher && isAdmin && <span style={{fontSize:11,color:"var(--ink-30)",marginLeft:6}}>({teacher.name})</span>}
                </div>
                <div style={{flexShrink:0}}>
                  {!report && !isGenerating && (
                    <button className="btn btn-sm" onClick={() => handleGenerate(s)} style={{background:"var(--blue)",color:"#fff",border:"none",whiteSpace:"nowrap"}}>
                      ✨ 초안 생성
                    </button>
                  )}
                  {isGenerating && <span style={{fontSize:12,color:"var(--blue)"}}>AI 작성 중…</span>}
                  {report?.status === "published" && (
                    <span style={{fontSize:12,color:"#16A34A",fontWeight:600}}>공개됨 ✓ {fmtDateShort(report.publishedAt)}</span>
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
                    {localEdits[report.id] !== undefined && (
                      <button className="btn btn-sm" onClick={() => handleSaveDraft(report)} disabled={saving.has(report.id)} style={{background:"var(--ink-10)",color:"var(--ink)"}}>
                        {saving.has(report.id) ? "저장 중…" : "수정 저장"}
                      </button>
                    )}
                    <button className="btn btn-sm" onClick={() => handlePublish(report)} style={{background:"var(--blue)",color:"#fff",border:"none"}}>
                      공개
                    </button>
                    <button className="btn btn-sm" onClick={() => handleDelete(report)} style={{background:"transparent",color:"var(--red)",border:"1px solid var(--red)"}}>
                      삭제
                    </button>
                  </div>
                </>
              )}

              {report?.status === "published" && (
                <>
                  <div style={{fontSize:13,color:"var(--ink-70)",lineHeight:1.7,whiteSpace:"pre-wrap",background:"var(--bg)",padding:"10px 12px",borderRadius:6,marginBottom:8}}>
                    {report.body}
                  </div>
                  <button className="btn btn-sm" onClick={() => handleArchive(report)} style={{background:"transparent",color:"var(--ink-30)",border:"1px solid var(--border)",fontSize:11}}>
                    보관 처리
                  </button>
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
