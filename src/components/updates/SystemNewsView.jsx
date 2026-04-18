import { RELEASES } from "../../constants/releases.js";

export function SystemNewsView({ user }) {
  const visible = RELEASES
    .filter(r => r.target.includes(user.role))
    .slice()
    .sort((a, b) => b.date.localeCompare(a.date));

  return (
    <div>
      <div className="ph">
        <div><h1>시스템 소식</h1></div>
      </div>
      <div className="news-wrap">
        <p style={{ fontSize: 13, color: "var(--ink-30)", marginBottom: 24 }}>
          RYE-K 업데이트 이력입니다.
        </p>
        {visible.length === 0 && (
          <div style={{ textAlign: "center", padding: 40, color: "var(--ink-30)", fontSize: 13 }}>
            표시할 업데이트 내역이 없습니다.
          </div>
        )}
        {visible.map((r, i) => (
          <div key={r.version} className="news-item">
            <div className="news-spine">
              <div className={`news-dot${r.isMajor ? " major" : ""}`} />
              {i < visible.length - 1 && <div className="news-line" />}
            </div>
            <div className={`news-card${r.isMajor ? " major" : ""}`}>
              <div className="news-meta">
                <span className="news-ver">v{r.version}</span>
                <span className="news-date">{r.date}</span>
                {r.isMajor && (
                  <span className="tag tag-update" style={{ fontSize: 10, padding: "1px 7px" }}>
                    주요 업데이트
                  </span>
                )}
              </div>
              <div className="news-title">{r.title}</div>
              {r.description && <p className="news-desc" style={{ whiteSpace: "pre-wrap" }}>{r.description}</p>}
              {r.tags?.length > 0 && (
                <div className="news-tags">
                  {r.tags.map(t => (
                    <span key={t} className={`tag tag-${t}`}>{t}</span>
                  ))}
                </div>
              )}
              {r.pmComment && (
                <div className="news-pm">"{r.pmComment}"</div>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
