import { useState } from "react";
import { computeStudentRecentAttRate } from "../../utils.js";
import { Av } from "../shared/CommonUI.jsx";
import { aiChurnCare } from "../../aiClient.js";

function getConsecutiveAbsences(attendance, sid) {
  const sorted = attendance
    .filter(a => a.studentId === sid)
    .sort((a, b) => (b.date || "").localeCompare(a.date || ""));
  let count = 0;
  for (const a of sorted) {
    if (a.status === "absent") count++;
    else break;
  }
  return count;
}

function riskScore(consecutive, rate) {
  let s = 0;
  if (consecutive >= 4) s += 50;
  else if (consecutive >= 3) s += 40;
  else if (consecutive >= 2) s += 25;
  if (rate !== null) {
    if (rate < 40) s += 45;
    else if (rate < 60) s += 25;
    else if (rate < 75) s += 10;
  }
  return s;
}

export default function ChurnWidget({ students, attendance, teachers }) {
  const [expanded, setExpanded] = useState(false);
  const [generating, setGenerating] = useState(new Set());
  const [careResults, setCareResults] = useState({});   // { [studentId]: string }
  const [careErrors, setCareErrors] = useState({});     // { [studentId]: string }

  const atRisk = students
    .filter(s => s.status === "active" && !s.isInstitution)
    .map(s => {
      const consecutive = getConsecutiveAbsences(attendance, s.id);
      const rate = computeStudentRecentAttRate(attendance, s.id, 4);
      const score = riskScore(consecutive, rate);
      return { ...s, consecutive, rate, score };
    })
    .filter(s => s.score >= 25)
    .sort((a, b) => b.score - a.score);

  const handleCareMessage = async (student) => {
    setGenerating(prev => new Set([...prev, student.id]));
    setCareErrors(prev => ({ ...prev, [student.id]: null }));
    try {
      const teacher = teachers?.find(t => t.id === student.teacherId);
      const { result } = await aiChurnCare({
        name: student.name,
        consecutive: student.consecutive,
        rate: student.rate,
        score: student.score,
        teacherName: teacher?.name,
      });
      setCareResults(prev => ({ ...prev, [student.id]: result }));
    } catch (e) {
      const msg = e.message === "rate_limited"
        ? "잠시 후 다시 시도해주세요 (분당 제한)"
        : "AI 오류가 발생했습니다.";
      setCareErrors(prev => ({ ...prev, [student.id]: msg }));
    } finally {
      setGenerating(prev => { const n = new Set(prev); n.delete(student.id); return n; });
    }
  };

  if (atRisk.length === 0) return null;

  const shown = expanded ? atRisk : atRisk.slice(0, 4);
  const danger = atRisk.filter(s => s.score >= 50).length;
  const caution = atRisk.length - danger;

  return (
    <div className="dash-card" style={{marginBottom:12}}>
      <div className="dash-card-title">
        이탈 위험 회원
        <span style={{display:"flex",gap:4}}>
          {danger > 0 && <span className="att-stat" style={{background:"var(--red-lt)",color:"var(--red)"}}>위험 {danger}</span>}
          {caution > 0 && <span className="att-stat" style={{background:"var(--gold-lt)",color:"var(--gold-dk)"}}>주의 {caution}</span>}
        </span>
      </div>
      <div style={{fontSize:11.5,color:"var(--ink-30)",marginBottom:10}}>연속 결석 · 최근 4주 출석률 기준</div>

      <div style={{display:"flex",flexDirection:"column",gap:8}}>
        {shown.map(s => {
          const isDanger = s.score >= 50;
          return (
            <div key={s.id} style={{padding:"9px 10px",background:"var(--bg)",borderRadius:8,border:`1px solid ${isDanger ? "rgba(232,40,28,.2)" : "rgba(245,168,0,.25)"}`}}>
              <div style={{display:"flex",alignItems:"center",gap:10}}>
                <Av photo={s.photo} name={s.name} size="av-sm"/>
                <div style={{flex:1,minWidth:0}}>
                  <div style={{fontSize:13,fontWeight:600,color:"var(--ink)"}}>{s.name}</div>
                  <div style={{display:"flex",flexWrap:"wrap",gap:4,marginTop:3}}>
                    {s.consecutive >= 2 && (
                      <span style={{fontSize:11,background: s.consecutive >= 3 ? "var(--red-lt)" : "var(--gold-lt)", color: s.consecutive >= 3 ? "var(--red)" : "var(--gold-dk)", padding:"1px 6px", borderRadius:4, fontWeight:600}}>
                        연속 결석 {s.consecutive}회
                      </span>
                    )}
                    {s.rate !== null && s.rate < 75 && (
                      <span style={{fontSize:11,background: s.rate < 50 ? "var(--red-lt)" : "var(--gold-lt)", color: s.rate < 50 ? "var(--red)" : "var(--gold-dk)", padding:"1px 6px", borderRadius:4}}>
                        4주 출석 {s.rate}%
                      </span>
                    )}
                  </div>
                </div>
                <span style={{fontSize:11,fontWeight:700,color: isDanger ? "var(--red)" : "var(--gold-dk)",flexShrink:0}}>
                  {isDanger ? "위험" : "주의"}
                </span>
                {generating.has(s.id) ? (
                  <span style={{fontSize:11,color:"var(--blue)",flexShrink:0}}>생성 중…</span>
                ) : careResults[s.id] ? (
                  <button
                    onClick={() => navigator.clipboard.writeText(careResults[s.id])}
                    style={{fontSize:10,color:"var(--blue)",background:"none",border:"1px solid var(--blue)",
                      borderRadius:4,padding:"2px 7px",cursor:"pointer",fontFamily:"inherit",flexShrink:0}}
                  >
                    복사
                  </button>
                ) : (
                  <button
                    onClick={() => handleCareMessage(s)}
                    style={{fontSize:10,color:"var(--ink-50)",background:"none",border:"1px solid var(--border)",
                      borderRadius:4,padding:"2px 7px",cursor:"pointer",fontFamily:"inherit",flexShrink:0}}
                  >
                    케어 메시지
                  </button>
                )}
              </div>
              {careErrors[s.id] && (
                <div style={{fontSize:11,color:"var(--red)",marginTop:6,paddingLeft:2}}>
                  {careErrors[s.id]}
                </div>
              )}
              {careResults[s.id] && (
                <div style={{fontSize:12,color:"var(--ink-60)",lineHeight:1.6,marginTop:6,
                  padding:"8px 10px",background:"var(--hanji)",borderRadius:6,border:"1px solid var(--border)"}}>
                  {careResults[s.id]}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {atRisk.length > 4 && (
        <button onClick={() => setExpanded(v => !v)} style={{background:"none",border:"none",color:"var(--blue)",fontSize:12,cursor:"pointer",padding:"8px 0",fontFamily:"inherit",width:"100%",textAlign:"center"}}>
          {expanded ? "접기 ▴" : `전체 보기 (${atRisk.length - 4}명 더) ▾`}
        </button>
      )}
    </div>
  );
}
