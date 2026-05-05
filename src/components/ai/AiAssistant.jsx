import { useState, useRef, useEffect } from "react";
import { IC } from "../../constants.jsx";
import { aiQuery, aiChurnAnalysis } from "../../aiClient.js";
import { QUERY_FUNCTIONS } from "../../utils/queryFunctions.js";
import { Av, MicButton } from "../shared/CommonUI.jsx";

const SUGGESTIONS = [
  "이번달 미납 회원 누구야?",
  "이탈 위험 회원 분석해줘",
  "출석률 TOP 10",
  "이번달 신규 등록",
  "활성 회원 목록",
];

function RobotSvg({ size = 22 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="4" y="8" width="16" height="11" rx="2"/>
      <circle cx="9" cy="13.5" r="1.2" fill="currentColor" stroke="none"/>
      <circle cx="15" cy="13.5" r="1.2" fill="currentColor" stroke="none"/>
      <line x1="12" y1="3" x2="12" y2="8"/>
      <circle cx="12" cy="2.5" r="1"/>
      <line x1="2" y1="13" x2="4" y2="13"/>
      <line x1="20" y1="13" x2="22" y2="13"/>
      <line x1="9" y1="19" x2="9" y2="22"/>
      <line x1="15" y1="19" x2="15" y2="22"/>
    </svg>
  );
}

function ListResult({ data }) {
  const [expanded, setExpanded] = useState(false);
  const shown = expanded ? data : data.slice(0, 5);
  if (data.length === 0) {
    return <div style={{fontSize:12,color:"var(--ink-30)",marginTop:4}}>해당 조건의 회원이 없습니다.</div>;
  }
  return (
    <div className="ai-result-list">
      <div style={{fontSize:11,color:"var(--ink-30)",marginBottom:4}}>{data.length}명</div>
      {shown.map(s => (
        <div key={s.id} className="ai-result-row">
          <Av photo={s.photo} name={s.name} size="av-sm"/>
          <div style={{flex:1,minWidth:0}}>
            <span className="ai-result-name">{s.name}</span>
            {s._absenceCount != null && <span className="ai-result-sub">결석 {s._absenceCount}회</span>}
            {s._attRate != null && <span className="ai-result-sub">출석률 {s._attRate}%</span>}
          </div>
        </div>
      ))}
      {data.length > 5 && (
        <button className="ai-result-more" onClick={() => setExpanded(v => !v)}>
          {expanded ? "접기 ▴" : `전체 보기 (${data.length - 5}명 더) ▾`}
        </button>
      )}
    </div>
  );
}

function StatsResult({ data }) {
  const { ym, att, pay } = data;
  const rateColor = att.rate >= 80 ? "var(--green)" : att.rate >= 60 ? "var(--gold-dk)" : "var(--red)";
  return (
    <div style={{marginTop:4}}>
      <div style={{fontSize:11,color:"var(--blue)",fontWeight:600,marginBottom:8}}>{ym} 통계</div>
      <div className="ai-stats-row">
        <span>출석률</span>
        <strong style={{color:rateColor}}>{att.rate ?? "—"}%</strong>
      </div>
      <div className="ai-stats-row">
        <span>출석 {att.present} / 결석 {att.absent} / 지각 {att.late}</span>
        <span style={{color:"var(--ink-30)",fontSize:11}}>총 {att.total}건</span>
      </div>
      <div className="ai-stats-row">
        <span>수납</span>
        <strong>{pay.paid}/{pay.total}명 완료</strong>
      </div>
    </div>
  );
}

function ChurnListResult({ data }) {
  const [expanded, setExpanded] = useState(false);
  const shown = expanded ? data : data.slice(0, 4);
  if (data.length === 0) {
    return <div style={{fontSize:12,color:"var(--ink-30)",marginTop:4}}>이탈 위험 회원이 없습니다.</div>;
  }
  return (
    <div style={{marginTop:4}}>
      <div style={{fontSize:11,color:"var(--ink-30)",marginBottom:6}}>{data.length}명 감지됨</div>
      <div style={{display:"flex",flexDirection:"column",gap:6}}>
        {shown.map(s => {
          const isDanger = s.score >= 50;
          return (
            <div key={s.id} style={{display:"flex",alignItems:"center",gap:8,padding:"7px 8px",background:"var(--bg)",borderRadius:8,border:`1px solid ${isDanger?"rgba(232,40,28,.2)":"rgba(245,168,0,.25)"}`}}>
              <Av photo={s.photo} name={s.name} size="av-sm"/>
              <div style={{flex:1,minWidth:0}}>
                <div style={{fontSize:12.5,fontWeight:600,color:"var(--ink)"}}>{s.name}</div>
                <div style={{display:"flex",flexWrap:"wrap",gap:3,marginTop:2}}>
                  {s.consecutive >= 2 && (
                    <span style={{fontSize:10.5,background:s.consecutive>=3?"var(--red-lt)":"var(--gold-lt)",color:s.consecutive>=3?"var(--red)":"var(--gold-dk)",padding:"1px 5px",borderRadius:4,fontWeight:600}}>
                      연속 결석 {s.consecutive}회
                    </span>
                  )}
                  {s.rate !== null && s.rate < 75 && (
                    <span style={{fontSize:10.5,background:s.rate<50?"var(--red-lt)":"var(--gold-lt)",color:s.rate<50?"var(--red)":"var(--gold-dk)",padding:"1px 5px",borderRadius:4}}>
                      출석 {s.rate}%
                    </span>
                  )}
                </div>
              </div>
              <span style={{fontSize:10.5,fontWeight:700,color:isDanger?"var(--red)":"var(--gold-dk)",flexShrink:0}}>
                {isDanger?"위험":"주의"}
              </span>
            </div>
          );
        })}
      </div>
      {data.length > 4 && (
        <button className="ai-result-more" onClick={() => setExpanded(v => !v)}>
          {expanded ? "접기 ▴" : `전체 보기 (${data.length - 4}명 더) ▾`}
        </button>
      )}
    </div>
  );
}

function ChurnPending() {
  return (
    <div style={{marginTop:4}}>
      <div style={{fontSize:11,color:"var(--blue)",fontWeight:600,marginBottom:6}}>AI 분석 중...</div>
      <div className="ai-typing"><span/><span/><span/></div>
    </div>
  );
}

function ChurnAiResult({ data }) {
  const { students, comments } = data;
  return (
    <div style={{marginTop:4}}>
      <div style={{fontSize:11,color:"var(--blue)",fontWeight:600,marginBottom:8}}>AI 이탈 분석</div>
      <div style={{display:"flex",flexDirection:"column",gap:8}}>
        {students.map(s => {
          const isDanger = s.score >= 50;
          const found = comments.find(c => c.name === s.name);
          return (
            <div key={s.id} style={{padding:"8px 10px",background:"var(--bg)",borderRadius:8,border:`1px solid ${isDanger?"rgba(232,40,28,.15)":"rgba(245,168,0,.2)"}`}}>
              <div style={{display:"flex",alignItems:"center",gap:6,marginBottom:found?4:0}}>
                <span style={{fontSize:12.5,fontWeight:700,color:"var(--ink)"}}>{s.name}</span>
                <span style={{fontSize:10.5,fontWeight:700,color:isDanger?"var(--red)":"var(--gold-dk)",background:isDanger?"var(--red-lt)":"var(--gold-lt)",padding:"1px 6px",borderRadius:4}}>
                  {isDanger?"위험":"주의"}
                </span>
              </div>
              {found && (
                <div style={{fontSize:12,color:"var(--ink-60)",lineHeight:1.6}}>{found.comment}</div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

function MessageBubble({ msg }) {
  if (msg.role === "user") {
    return <div className="ai-msg-user">{msg.content}</div>;
  }
  return (
    <div className="ai-msg-bot">
      <div className="ai-msg-av"><RobotSvg size={14}/></div>
      <div className="ai-msg-body">
        {msg.type === "list" && <ListResult data={msg.content}/>}
        {msg.type === "stats" && <StatsResult data={msg.content}/>}
        {msg.type === "churn-list" && <ChurnListResult data={msg.content}/>}
        {msg.type === "churn-pending" && <ChurnPending/>}
        {msg.type === "churn-ai" && <ChurnAiResult data={msg.content}/>}
        {msg.type === "text" && msg.content}
      </div>
    </div>
  );
}

function TypingIndicator() {
  return (
    <div className="ai-msg-bot">
      <div className="ai-msg-av"><RobotSvg size={14}/></div>
      <div className="ai-msg-body">
        <div className="ai-typing"><span/><span/><span/></div>
      </div>
    </div>
  );
}

export default function AiAssistant({ students, attendance, payments, teachers }) {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const msgEndRef = useRef(null);
  const inputRef = useRef(null);

  useEffect(() => {
    if (open) setTimeout(() => inputRef.current?.focus(), 80);
  }, [open]);

  useEffect(() => {
    msgEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading]);

  useEffect(() => {
    if (!open) return;
    const onKey = e => { if (e.key === "Escape") setOpen(false); };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open]);

  async function fetchChurnAnalysis(atRiskStudents, pendingId) {
    try {
      const { comments } = await aiChurnAnalysis(atRiskStudents);
      setMessages(m => m.map(msg =>
        msg.id === pendingId
          ? { ...msg, type: "churn-ai", content: { students: atRiskStudents, comments } }
          : msg
      ));
    } catch {
      setMessages(m => m.filter(msg => msg.id !== pendingId));
    }
  }

  async function send(text) {
    const q = (text || input).trim();
    if (!q || loading) return;
    setInput("");
    setMessages(m => [...m, { id: Date.now() + "u", role: "user", type: "text", content: q }]);
    setLoading(true);
    let churnResult = null;
    try {
      const res = await aiQuery(q);
      let aiMsg;
      if (res.type === "no_match") {
        aiMsg = { id: Date.now() + "a", role: "assistant", type: "text", content: "아직 그 질문에 답하기 어려워요. 회원·출석·수납 관련 질문을 해보세요." };
      } else if (res.type === "tool") {
        const fn = QUERY_FUNCTIONS[res.tool];
        if (fn) {
          const out = fn({ students, attendance, payments, teachers }, res.args || {});
          if (res.tool === "getChurnRiskStudents") {
            aiMsg = { id: Date.now() + "a", role: "assistant", type: "churn-list", content: out };
            if (out.length > 0) churnResult = out;
          } else {
            const type = res.tool === "getMonthlyStats" ? "stats" : "list";
            aiMsg = { id: Date.now() + "a", role: "assistant", type, content: out };
          }
        } else {
          aiMsg = { id: Date.now() + "a", role: "assistant", type: "text", content: "조회 기능을 찾을 수 없어요." };
        }
      }
      if (aiMsg) setMessages(m => [...m, aiMsg]);
    } catch {
      setMessages(m => [...m, { id: Date.now() + "e", role: "assistant", type: "text", content: "오류가 발생했어요. 잠시 후 다시 시도해주세요." }]);
    } finally {
      setLoading(false);
    }
    if (churnResult) {
      const pendingId = String(Date.now()) + "p";
      setMessages(m => [...m, { id: pendingId, role: "assistant", type: "churn-pending", content: null }]);
      fetchChurnAnalysis(churnResult, pendingId);
    }
  }

  return (
    <>
      {!open && (
        <button className="ai-fab" onClick={() => setOpen(true)} aria-label="AI 비서">
          <span className="ai-fab-tip">AI 비서에게 물어보세요</span>
          <RobotSvg size={26}/>
        </button>
      )}

      {open && (
        <>
          <div className="ai-backdrop" onClick={e => e.target === e.currentTarget && setOpen(false)}/>
          <div className="ai-panel">
            <div className="ai-hd">
              <div className="ai-hd-av"><RobotSvg size={16}/></div>
              <span className="ai-hd-title">AI 비서</span>
              <button className="ai-hd-btn" onClick={() => setMessages([])}>새 대화</button>
              <button className="ai-hd-btn" onClick={() => setOpen(false)} style={{display:"flex",alignItems:"center"}}>{IC.x}</button>
            </div>

            <div className="ai-msgs">
              {messages.length === 0 ? (
                <div className="ai-empty">
                  <div className="ai-empty-av"><RobotSvg size={30}/></div>
                  <div className="ai-empty-title">안녕하세요! 무엇을 도와드릴까요?</div>
                  <div className="ai-empty-sub">회원·출석·수납 데이터를 자연어로 조회할 수 있어요</div>
                  <div className="ai-chips">
                    {SUGGESTIONS.map(s => (
                      <button key={s} className="ai-chip" onClick={() => send(s)}>{s}</button>
                    ))}
                  </div>
                </div>
              ) : (
                messages.map(msg => <MessageBubble key={msg.id} msg={msg}/>)
              )}
              {loading && <TypingIndicator/>}
              <div ref={msgEndRef}/>
            </div>

            <form className="ai-input-row" onSubmit={e => { e.preventDefault(); send(); }}>
              <input
                ref={inputRef}
                className="ai-input"
                value={input}
                onChange={e => setInput(e.target.value)}
                placeholder="질문을 입력하세요..."
                disabled={loading}
              />
              <MicButton
                onTranscript={t => setInput(prev => (prev + " " + t).trim())}
              />
              <button type="submit" className="ai-send" disabled={loading || !input.trim()} aria-label="전송">
                {IC.search}
              </button>
            </form>
          </div>
        </>
      )}
    </>
  );
}
