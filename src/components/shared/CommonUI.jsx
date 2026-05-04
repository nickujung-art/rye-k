import { useState, useRef } from "react";
import { compressImage } from "../../utils.js";

export function Logo({ size = 40, white = false }) {
  return <img src={white ? "/logo_white.png" : "/logo.png"} alt="RYE-K" style={{width:size,height:size,objectFit:"contain"}}/>;
}
export function Av({ photo, name, size = "" }) {
  return (<div className={`av ${size}`}>{photo ? <img src={photo} alt={name} /> : (name ? name.slice(0, 1) : "?")}</div>);
}
export function PhotoUpload({ photo, name, size="av-lg", onUpload }) {
  const ref = useRef(null);
  const handleFile = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const compressed = await compressImage(file, 360, 0.75);
      onUpload(compressed);
    } catch (err) { console.error("Photo compress error:", err); }
  };
  return (
    <div style={{position:"relative",cursor:"pointer"}} onClick={() => ref.current?.click()}>
      <Av photo={photo} name={name} size={size} />
      <div style={{position:"absolute",bottom:-2,right:-2,width:22,height:22,borderRadius:"50%",background:"var(--blue)",color:"#fff",display:"flex",alignItems:"center",justifyContent:"center",fontSize:12,border:"2px solid var(--paper)",lineHeight:1}}>
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M23 19a2 2 0 01-2 2H3a2 2 0 01-2-2V8a2 2 0 012-2h4l2-3h6l2 3h4a2 2 0 012 2z"/><circle cx="12" cy="13" r="4"/></svg>
      </div>
      <input ref={ref} type="file" accept="image/*" onChange={handleFile} style={{display:"none"}} />
    </div>
  );
}
export function RoleBadge({ role }) {
  if (role === "admin") return <span className="tag tag-inst">관리자</span>;
  if (role === "manager") return <span className="tag tag-mgr">매니저</span>;
  return <span className="tag tag-blue">강사</span>;
}
export function MicButton({ onTranscript, onStop }) {
  const [listening, setListening] = useState(false);
  const recRef = useRef(null);
  const bufRef = useRef("");
  const onTranscriptRef = useRef(onTranscript);
  const onStopRef = useRef(onStop);
  onTranscriptRef.current = onTranscript;
  onStopRef.current = onStop;

  const SR = typeof window !== "undefined" && (window.SpeechRecognition || window.webkitSpeechRecognition);
  if (!SR) return null;

  const finalize = (rec) => {
    if (recRef.current !== rec) return;
    recRef.current = null;
    const buf = bufRef.current;
    bufRef.current = "";
    setListening(false);
    console.log("[MicButton] finalize buf len:", buf.length);
    onStopRef.current?.(buf);
  };

  const toggle = () => {
    console.log("[MicButton] toggle recRef:", !!recRef.current, "listening:", listening);
    if (recRef.current) {
      const rec = recRef.current;
      try { rec.stop(); } catch (err) { console.warn("[MicButton] stop threw:", err); }
      setTimeout(() => finalize(rec), 500);
    } else {
      bufRef.current = "";
      const rec = new SR();
      rec.lang = "ko-KR";
      rec.interimResults = true;
      rec.continuous = true;
      rec.onresult = e => {
        let finalText = "";
        for (let i = e.resultIndex; i < e.results.length; i++) {
          if (e.results[i].isFinal) {
            const seg = e.results[i][0].transcript.trim();
            if (seg) finalText += (finalText ? " " : "") + seg;
          }
        }
        if (!finalText) return;
        bufRef.current = bufRef.current ? bufRef.current + " " + finalText : finalText;
        console.log("[MicButton] segment:", finalText, "| buf:", bufRef.current);
        onTranscriptRef.current?.(finalText);
      };
      rec.onend = () => {
        console.log("[MicButton] onend recRef===this:", recRef.current === rec);
        finalize(rec);
      };
      rec.onerror = e => {
        console.log("[MicButton] onerror:", e.error);
        if (e.error === "no-speech" || e.error === "aborted") return;
      };
      recRef.current = rec;
      try {
        rec.start();
        setListening(true);
        console.log("[MicButton] started");
      } catch (err) {
        console.warn("[MicButton] start threw:", err);
        recRef.current = null;
      }
    }
  };

  return (
    <button type="button" className={`mic-btn${listening ? " mic-btn-active" : ""}`} onClick={toggle} title={listening ? "녹음 중단" : "음성 입력"}>
      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M12 1a3 3 0 00-3 3v8a3 3 0 006 0V4a3 3 0 00-3-3z"/><path d="M19 10v2a7 7 0 01-14 0v-2"/><line x1="12" y1="19" x2="12" y2="23"/><line x1="8" y1="23" x2="16" y2="23"/></svg>
    </button>
  );
}
export function DeleteConfirmFooter({ label, canDelete, onDelete, onClose, onEdit }) {
  const [delConfirm, setDelConfirm] = useState(false);
  const [deleting, setDeleting] = useState(false);
  if (delConfirm) return (
    <div className="delete-confirm-bar">
      <div className="delete-confirm-bar-msg">⚠ <strong>{label}</strong> 삭제하시겠습니까?</div>
      <div style={{ display: "flex", gap: 8 }}>
        <button className="btn btn-secondary btn-sm" onClick={() => setDelConfirm(false)} disabled={deleting}>취소</button>
        <button className="btn btn-danger btn-sm" onClick={async () => { setDeleting(true); await onDelete(); }} disabled={deleting}>{deleting ? "삭제 중…" : "삭제"}</button>
      </div>
    </div>
  );
  return (
    <div className="modal-f">
      {canDelete && <button className="btn btn-danger" onClick={() => setDelConfirm(true)}>삭제</button>}
      <div style={{ flex: 1 }} />
      <button className="btn btn-secondary" onClick={onClose}>닫기</button>
      {onEdit && <button className="btn btn-primary" onClick={onEdit}>수정</button>}
    </div>
  );
}
