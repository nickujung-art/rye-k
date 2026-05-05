import { useState } from "react";
import { computeStudentRecentAttRate } from "../../utils.js";
import { Av } from "../shared/CommonUI.jsx";

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

export default function ChurnWidget({ students, attendance }) {
  const [expanded, setExpanded] = useState(false);

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
            <div key={s.id} style={{display:"flex",alignItems:"center",gap:10,padding:"9px 10px",background:"var(--bg)",borderRadius:8,border:`1px solid ${isDanger ? "rgba(232,40,28,.2)" : "rgba(245,168,0,.25)"}`}}>
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
