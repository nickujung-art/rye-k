import { useState } from "react";
import { LATEST_RELEASE, CURRENT_VERSION } from "../../constants/releases.js";

export function UpdatePopup({ user }) {
  const shouldShow = () => {
    const lastSeen = localStorage.getItem("ryek_lastSeenVersion");
    return (
      lastSeen !== CURRENT_VERSION &&
      LATEST_RELEASE.isMajor === true &&
      LATEST_RELEASE.target.includes(user.role)
    );
  };

  const [visible, setVisible] = useState(shouldShow);

  if (!visible) return null;

  const handleConfirm = () => {
    localStorage.setItem("ryek_lastSeenVersion", CURRENT_VERSION);
    setVisible(false);
  };

  const { version, title, tags, description, pmComment } = LATEST_RELEASE;

  return (
    <div className="mb" onClick={e => e.target === e.currentTarget && handleConfirm()}>
      <div className="modal update-popup">
        <div className="modal-h">
          <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
            <span className="tag tag-update">v{version}</span>
            <span style={{ fontSize: 12, color: "var(--ink-30)" }}>업데이트 소식</span>
          </div>
          <h2 style={{ marginTop: 6 }}>{title}</h2>
        </div>
        <div className="modal-b">
          {tags?.length > 0 && (
            <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 12 }}>
              {tags.map(t => (
                <span key={t} className={`tag tag-${t}`}>{t}</span>
              ))}
            </div>
          )}
          <p className="up-desc" style={{ whiteSpace: "pre-wrap" }}>{description}</p>
          {pmComment && (
            <div className="up-pm">
              <div className="up-pm-badge">PM NOTE</div>
              <p style={{ marginTop: 4, fontSize: 13, color: "var(--ink-60)", lineHeight: 1.65 }}>{pmComment}</p>
            </div>
          )}
        </div>
        <div className="modal-f">
          <button className="btn btn-primary" style={{ width: "100%" }} onClick={handleConfirm}>
            확인했습니다
          </button>
        </div>
      </div>
    </div>
  );
}
