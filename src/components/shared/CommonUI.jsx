import { useState, useRef } from "react";
import { compressImage } from "../../utils.js";
import { TEACHER_PALETTE } from "../../constants.jsx";

export function Logo({ size = 40, white = false }) {
  return <img src={white ? "/logo_white.png" : "/logo.png"} alt="RYE-K" style={{width:size,height:size,objectFit:"contain"}}/>;
}
export function Av({ photo, name, size = "", borderColor }) {
  return (
    <div
      className={`av ${size}`}
      style={borderColor ? { borderColor, boxShadow: `0 0 0 2px ${borderColor}40` } : undefined}
    >
      {photo ? <img src={photo} alt={name} /> : (name ? name.slice(0, 1) : "?")}
    </div>
  );
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
  const [interimText, setInterimText] = useState("");
  const [errText, setErrText] = useState("");
  const recRef = useRef(null);
  const bufRef = useRef("");
  const errTimerRef = useRef(null);
  const onTranscriptRef = useRef(onTranscript);
  const onStopRef = useRef(onStop);
  onTranscriptRef.current = onTranscript;
  onStopRef.current = onStop;

  const SR = typeof window !== "undefined" && (window.SpeechRecognition || window.webkitSpeechRecognition);
  if (!SR) return null;

  const showErr = (msg) => {
    setErrText(msg);
    clearTimeout(errTimerRef.current);
    errTimerRef.current = setTimeout(() => setErrText(""), 3000);
  };

  const finalize = (rec) => {
    if (recRef.current !== rec) return;
    recRef.current = null;
    const buf = bufRef.current;
    bufRef.current = "";
    setListening(false);
    setInterimText("");
    onStopRef.current?.(buf);
  };

  const toggle = () => {
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
        let interim = "";
        for (let i = e.resultIndex; i < e.results.length; i++) {
          if (e.results[i].isFinal) {
            const seg = e.results[i][0].transcript.trim();
            if (seg) finalText += (finalText ? " " : "") + seg;
          } else {
            interim += e.results[i][0].transcript;
          }
        }
        if (interim) setInterimText(interim);
        if (!finalText) return;
        bufRef.current = bufRef.current ? bufRef.current + " " + finalText : finalText;
        setInterimText("");
        onTranscriptRef.current?.(finalText);
      };
      rec.onend = () => { finalize(rec); };
      rec.onerror = e => {
        if (e.error === "no-speech" || e.error === "aborted") return;
        showErr(e.error === "not-allowed" ? "마이크 권한 필요" : "마이크 오류");
      };
      recRef.current = rec;
      try {
        rec.start();
        setListening(true);
      } catch (err) {
        console.warn("[MicButton] start threw:", err);
        recRef.current = null;
      }
    }
  };

  const preview = errText || interimText;
  return (
    <span className="mic-wrap">
      <button type="button" className={`mic-btn${listening ? " mic-btn-active" : ""}`} onClick={toggle} title={listening ? "녹음 중단" : "음성 입력"}>
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M12 1a3 3 0 00-3 3v8a3 3 0 006 0V4a3 3 0 00-3-3z"/><path d="M19 10v2a7 7 0 01-14 0v-2"/><line x1="12" y1="19" x2="12" y2="23"/><line x1="8" y1="23" x2="16" y2="23"/></svg>
      </button>
      {preview && <span className={`mic-preview${errText ? " mic-preview-err" : ""}`}>{preview}</span>}
    </span>
  );
}
export function TeacherColorPicker({ value, usedColors = [], onChange, disabled = false }) {
  const [open, setOpen] = useState(false);
  const used = new Set(usedColors);
  const paletteFull = usedColors.length >= TEACHER_PALETTE.length;
  const currentColor = TEACHER_PALETTE.find(c => c.hex === value);
  return (
    <div>
      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
        <div style={{
          width: 28, height: 28, borderRadius: "50%",
          background: value || "var(--border)",
          border: "2px solid var(--border)", flexShrink: 0,
        }} />
        <span style={{ fontSize: 13, color: "var(--ink-60)" }}>
          {currentColor ? currentColor.name : "미선택"}
        </span>
        {!disabled && (
          <button
            type="button"
            onClick={() => setOpen(o => !o)}
            style={{
              marginLeft: "auto", padding: "4px 10px", borderRadius: 6,
              border: "1px solid var(--border)", background: "var(--bg)",
              fontSize: 12, cursor: "pointer", fontFamily: "inherit",
              color: "var(--ink-60)",
            }}
          >
            {open ? "닫기" : "색상 변경"}
          </button>
        )}
      </div>
      {open && (
        <div style={{ marginTop: 10 }}>
          {paletteFull ? (
            <div style={{ fontSize: 11.5, color: "var(--gold-dk)", background: "var(--gold-lt)", border: "1px solid rgba(200,136,0,.2)", borderRadius: 6, padding: "6px 10px", marginBottom: 8 }}>
              모든 색상이 배정되었습니다. 색상이 중복될 수 있습니다.
            </div>
          ) : (
            <div style={{ fontSize: 11.5, color: "var(--ink-30)", marginBottom: 8 }}>
              반투명 색상은 다른 강사가 사용 중입니다.
            </div>
          )}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(5, 1fr)", gap: 8 }}>
            {TEACHER_PALETTE.map(c => {
              const isUsed = used.has(c.hex) && !paletteFull;
              const isSelected = value === c.hex;
              return (
                <button
                  key={c.id}
                  type="button"
                  title={isUsed ? `${c.name} (사용중)` : c.name}
                  onClick={() => { if (!isUsed) { onChange?.(c.hex); setOpen(false); } }}
                  style={{
                    width: 36, height: 36, borderRadius: "50%",
                    background: c.hex,
                    opacity: isUsed ? 0.2 : 1,
                    cursor: isUsed ? "not-allowed" : "pointer",
                    border: "none",
                    outline: isSelected ? `3px solid ${c.hex}` : "2px solid transparent",
                    outlineOffset: isSelected ? 2 : 0,
                    boxShadow: isSelected ? `0 0 0 5px ${c.hex}33` : "none",
                    display: "flex", alignItems: "center", justifyContent: "center",
                    fontFamily: "inherit",
                    transition: "transform .12s",
                    transform: isSelected ? "scale(1.18)" : "scale(1)",
                  }}
                >
                  {isSelected && <span style={{ color:"#fff", fontWeight:800, fontSize:14, textShadow:"0 1px 3px rgba(0,0,0,.6)", lineHeight:1 }}>✓</span>}
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
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
