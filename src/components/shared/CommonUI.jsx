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
