import { useState } from "react";
import { IC, THIS_MONTH } from "../../constants.jsx";
import { monthLabel, fmtMoney } from "../../utils.js";

const TEMPLATES = {
  monthly_fee: (d) =>
    `[RYE-K K-Culture Center]\n\n안녕하세요, ${d.name}님!\n${d.month}월 수강료 안내드립니다.\n\n💰 수강료: ${d.amount.toLocaleString()}원\n📅 납부 기한: ${d.deadline}\n\n계좌: 카카오뱅크 3333-34-5220544\n(예금주: 예케이케이컬처센터)\n\n감사합니다 🎵`,
  unpaid_reminder: (d) =>
    `[RYE-K K-Culture Center]\n\n${d.name}님, ${d.month}월 수강료 ${d.amount.toLocaleString()}원이 아직 미납 상태입니다.\n\n빠른 시일 내 납부 부탁드립니다.\n계좌: 카카오뱅크 3333-34-5220544\n\n문의: 원장실`,
  makeup_lesson: (d) =>
    `[RYE-K K-Culture Center]\n\n${d.name}님, 보강 수업이 예정되어 있습니다.\n\n📅 일시: ${d.date} ${d.time}\n\n참석 여부를 알려주세요 😊`,
};

const TYPE_LABELS = {
  monthly_fee: "매월 수강료 안내",
  unpaid_reminder: "미납 독촉",
  makeup_lesson: "보강 안내",
};

export default function AlimtalkModal({ type: initialType = "monthly_fee", students = [], month = THIS_MONTH, onClose, onSend, getPayment }) {
  const [type, setType] = useState(initialType);
  const [targetMode, setTargetMode] = useState(type === "unpaid_reminder" ? "unpaid" : "all");
  const [makeupDate, setMakeupDate] = useState("");
  const [makeupTime, setMakeupTime] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const autoFee = (s) => (s.monthlyFee || 0) + (s.instrumentRental ? (s.rentalFee || 0) : 0);

  const deadline = (() => {
    const d = new Date(month + "-01");
    d.setDate(15);
    return `${d.getFullYear()}년 ${String(d.getMonth()+1).padStart(2,"0")}월 15일`;
  })();

  const targets = (() => {
    if (type === "unpaid_reminder" || targetMode === "unpaid") {
      return students.filter(s => !getPayment?.(s.id)?.paid);
    }
    return students;
  })();

  const zeroFeeStudents = type === "monthly_fee"
    ? targets.filter(s => { const p = getPayment?.(s.id); return (p?.amount ?? autoFee(s)) === 0; })
    : [];

  const preview = (() => {
    const first = targets[0];
    if (!first) return "(발송 대상이 없습니다)";
    const p = getPayment?.(first.id);
    const amt = p?.amount ?? autoFee(first);
    if (type === "monthly_fee") return TEMPLATES.monthly_fee({ name: first.name, month: monthLabel(month), amount: amt, deadline });
    if (type === "unpaid_reminder") return TEMPLATES.unpaid_reminder({ name: first.name, month: monthLabel(month), amount: amt });
    if (type === "makeup_lesson") return TEMPLATES.makeup_lesson({ name: first.name, date: makeupDate || "____년__월__일", time: makeupTime || "__:__" });
    return "";
  })();

  const canSend = targets.length > 0 && zeroFeeStudents.length === 0 && !isSubmitting &&
    (type !== "makeup_lesson" || (makeupDate && makeupTime));

  const handleSend = async () => {
    setIsSubmitting(true);
    await onSend?.(type, targets, { deadline, makeupDate, makeupTime });
    setIsSubmitting(false);
    onClose();
  };

  return (
    <div style={{position:"fixed",top:0,left:0,width:"100vw",height:"100vh",zIndex:10000,display:"flex",alignItems:"center",justifyContent:"center",backgroundColor:"rgba(0,0,0,0.5)"}} onClick={() => !isSubmitting && onClose()}>
      <div onClick={e => e.stopPropagation()} style={{width:"90%",maxWidth:500,background:"var(--paper)",borderRadius:16,boxShadow:"0 8px 40px rgba(0,0,0,.18)",maxHeight:"90vh",overflowY:"auto"}}>
        <div className="modal-h">
          <h2>💬 알림톡 발송</h2>
          <button className="modal-close" onClick={onClose}>{IC.x}</button>
        </div>
        <div className="modal-b">
          {/* 템플릿 선택 */}
          <div className="fg">
            <label className="fg-label">발송 유형</label>
            <div style={{display:"flex",gap:6,flexWrap:"wrap"}}>
              {Object.entries(TYPE_LABELS).map(([k,v]) => (
                <button key={k} className={`btn btn-sm ${type===k?"btn-primary":"btn-secondary"}`}
                  onClick={() => { setType(k); setTargetMode(k==="unpaid_reminder"?"unpaid":"all"); }}>
                  {v}
                </button>
              ))}
            </div>
          </div>

          {/* 발송 대상 */}
          {type !== "unpaid_reminder" && (
            <div className="fg">
              <label className="fg-label">발송 대상</label>
              <div style={{display:"flex",gap:8}}>
                <button className={`btn btn-sm ${targetMode==="all"?"btn-primary":"btn-secondary"}`} onClick={() => setTargetMode("all")}>전체 ({students.length}명)</button>
                <button className={`btn btn-sm ${targetMode==="unpaid"?"btn-primary":"btn-secondary"}`} onClick={() => setTargetMode("unpaid")}>미납자만 ({students.filter(s=>!getPayment?.(s.id)?.paid).length}명)</button>
              </div>
            </div>
          )}

          {/* 보강 날짜/시간 */}
          {type === "makeup_lesson" && (
            <div className="fg" style={{display:"flex",gap:8}}>
              <div style={{flex:1}}>
                <label className="fg-label">보강 날짜</label>
                <input className="inp" type="date" value={makeupDate} onChange={e => setMakeupDate(e.target.value)} />
              </div>
              <div style={{flex:1}}>
                <label className="fg-label">시간</label>
                <input className="inp" type="time" value={makeupTime} onChange={e => setMakeupTime(e.target.value)} />
              </div>
            </div>
          )}

          {/* 0원 경고 */}
          {zeroFeeStudents.length > 0 && (
            <div style={{background:"var(--red-lt)",border:"1.5px solid var(--red)",borderRadius:10,padding:"10px 14px",marginBottom:4}}>
              <div style={{fontWeight:700,color:"var(--red)",fontSize:13,marginBottom:4}}>⚠ 수강료 미입력 회원 {zeroFeeStudents.length}명</div>
              <div style={{fontSize:12,color:"var(--red-dk)"}}>
                {zeroFeeStudents.map(s=>s.name).join(", ")} — 수강료가 0원이거나 미설정되어 있습니다. 발송 전 수강료를 먼저 입력해주세요.
              </div>
            </div>
          )}

          {/* 메시지 미리보기 */}
          <div className="fg">
            <label className="fg-label">메시지 미리보기 ({targets.length > 0 ? targets[0].name : "-"} 기준)</label>
            <div style={{background:"var(--bg)",border:"1px solid var(--border)",borderRadius:10,padding:"12px 14px",fontSize:12,color:"var(--ink-60)",whiteSpace:"pre-wrap",lineHeight:1.65,minHeight:100,maxHeight:200,overflowY:"auto"}}>
              {preview}
            </div>
          </div>

          <div style={{fontSize:12,color:"var(--ink-30)",marginBottom:4}}>총 {targets.length}명에게 발송됩니다.</div>
        </div>
        <div className="modal-f">
          <button className="btn btn-secondary" onClick={onClose} disabled={isSubmitting}>취소</button>
          <button className="btn btn-primary" disabled={!canSend} onClick={handleSend}>
            {isSubmitting ? <><span className="spinner-sm" /> 발송 중…</> : `${targets.length}명에게 발송`}
          </button>
        </div>
      </div>
    </div>
  );
}
