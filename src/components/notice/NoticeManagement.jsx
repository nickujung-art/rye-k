import { useState, useRef } from "react";
import knotLineSvg from "../../assets/heritage/knot-line.svg";
import { IC } from "../../constants.jsx";
import { uid, fmtDateTime, fmtDate, fmtDateShort, canManageAll, compressImage } from "../../utils.js";

// ── NOTICE FORM ───────────────────────────────────────────────────────────────
export function NoticeFormModal({ notice, currentUser, onClose, onSave }) {
  const [title, setTitle] = useState(notice?.title || "");
  const [content, setContent] = useState(notice?.content || "");
  const [pinned, setPinned] = useState(notice?.pinned || false);
  const [hasEvent, setHasEvent] = useState(!!(notice?.eventStartDate));
  const [isRange, setIsRange] = useState(!!(notice?.eventEndDate && notice.eventEndDate !== notice.eventStartDate));
  const [eventStartDate, setEventStartDate] = useState(notice?.eventStartDate || "");
  const [eventEndDate, setEventEndDate] = useState(notice?.eventEndDate || notice?.eventStartDate || "");
  const [imageBase64, setImageBase64] = useState(notice?.imageBase64 || "");
  const [imgErr, setImgErr] = useState("");
  const fileRef = useRef();

  const handleImageFile = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setImgErr("");
    try {
      const compressed = await compressImage(file, 800, 0.7);
      setImageBase64(compressed);
    } catch {
      setImgErr("이미지 처리 중 오류가 발생했습니다.");
    }
    e.target.value = "";
  };

  const handleSave = () => {
    if (!title.trim() || !content.trim()) return;
    const eventFields = hasEvent && eventStartDate
      ? { eventStartDate, eventEndDate: isRange ? (eventEndDate || eventStartDate) : eventStartDate }
      : { eventStartDate: "", eventEndDate: "" };
    onSave({
      ...(notice || {}),
      title: title.trim(),
      content: content.trim(),
      pinned,
      ...eventFields,
      imageBase64: imageBase64 || "",
      authorId: currentUser.id,
      authorName: currentUser.name,
      createdAt: notice?.createdAt || Date.now(),
      updatedAt: Date.now(),
      id: notice?.id || uid(),
    });
  };

  return (
    <div className="mb" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal">
        <div className="modal-h"><h2>{notice ? "공지 수정" : "공지 등록"}</h2><button className="modal-close" onClick={onClose}>{IC.x}</button></div>
        <div className="modal-b">
          <div className="fg"><label className="fg-label">제목 <span className="req">*</span></label><input className="inp" value={title} onChange={e => setTitle(e.target.value)} placeholder="공지 제목" /></div>
          <div className="fg"><label className="fg-label">내용 <span className="req">*</span></label><textarea className="inp" value={content} onChange={e => setContent(e.target.value)} placeholder="공지 내용을 입력하세요." rows={6} /></div>
          {/* 사진 첨부 */}
          <div className="fg">
            <label className="fg-label">사진 첨부 (선택)</label>
            {imageBase64 ? (
              <div style={{position:"relative",display:"inline-block"}}>
                <img src={imageBase64} alt="미리보기" style={{width:"100%",maxWidth:320,borderRadius:10,display:"block"}} />
                <button onClick={() => setImageBase64("")} style={{position:"absolute",top:6,right:6,background:"rgba(0,0,0,.55)",border:"none",borderRadius:"50%",width:26,height:26,color:"#fff",fontSize:14,cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center"}}>×</button>
              </div>
            ) : (
              <button className="btn btn-secondary btn-sm" onClick={() => fileRef.current.click()}>📷 사진 첨부</button>
            )}
            <input ref={fileRef} type="file" accept="image/*" style={{display:"none"}} onChange={handleImageFile} />
            {imgErr && <div style={{fontSize:12,color:"var(--red)",marginTop:4}}>⚠ {imgErr}</div>}
          </div>
          <div className="fg">
            <label className="fg-label">일정 연동 (선택)</label>
            <div style={{ display: "flex", alignItems: "center", gap: 8, cursor: "pointer", marginBottom: 8 }} onClick={() => setHasEvent(v => !v)}>
              <div style={{ width: 20, height: 20, border: "1.5px solid var(--border)", borderRadius: 6, display: "flex", alignItems: "center", justifyContent: "center", background: hasEvent ? "var(--blue)" : "var(--paper)", transition: "all .12s" }}>{hasEvent && <span style={{ color: "#fff", fontSize: 12, fontWeight: 700 }}>✓</span>}</div>
              <span style={{ fontSize: 13, color: "var(--ink-60)" }}>스케줄에 일정으로 표시</span>
            </div>
            {hasEvent && (
              <div style={{ padding: "10px 12px", background: "var(--bg)", borderRadius: 8, border: "1px solid var(--border)" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8, cursor: "pointer", marginBottom: 8 }} onClick={() => setIsRange(v => !v)}>
                  <div style={{ width: 18, height: 18, border: "1.5px solid var(--border)", borderRadius: 5, display: "flex", alignItems: "center", justifyContent: "center", background: isRange ? "var(--gold)" : "var(--paper)" }}>{isRange && <span style={{ color: "#fff", fontSize: 11, fontWeight: 700 }}>✓</span>}</div>
                  <span style={{ fontSize: 12, color: "var(--ink-60)" }}>기간 일정 (방학·캠프 등)</span>
                </div>
                <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
                  <input className="inp" type="date" value={eventStartDate} onChange={e => { setEventStartDate(e.target.value); if (!isRange) setEventEndDate(e.target.value); }} style={{ flex: 1, minWidth: 140 }} />
                  {isRange && <>
                    <span style={{ fontSize: 12, color: "var(--ink-30)" }}>~</span>
                    <input className="inp" type="date" value={eventEndDate} onChange={e => setEventEndDate(e.target.value)} min={eventStartDate} style={{ flex: 1, minWidth: 140 }} />
                  </>}
                </div>
              </div>
            )}
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 8, cursor: "pointer" }} onClick={() => setPinned(v => !v)}>
            <div style={{ width: 20, height: 20, border: "1.5px solid var(--border)", borderRadius: 6, display: "flex", alignItems: "center", justifyContent: "center", background: pinned ? "var(--gold)" : "var(--paper)", transition: "all .12s" }}>{pinned && <span style={{ color: "#fff", fontSize: 12, fontWeight: 700 }}>✓</span>}</div>
            <span style={{ fontSize: 13.5, color: "var(--ink-60)" }}>상단 고정</span>
          </div>
        </div>
        <div className="modal-f"><button className="btn btn-secondary" onClick={onClose}>취소</button><button className="btn btn-primary" onClick={handleSave}>저장</button></div>
      </div>
    </div>
  );
}

// ── NOTICES VIEW ──────────────────────────────────────────────────────────────
export function NoticesView({ notices, currentUser, onAdd, onEdit, onDelete }) {
  const sorted = [...notices].sort((a, b) => { if (a.pinned && !b.pinned) return -1; if (!a.pinned && b.pinned) return 1; return b.createdAt - a.createdAt; });
  const [expanded, setExpanded] = useState(null);
  const [delTarget, setDelTarget] = useState(null);
  const [searchQuery, setSearchQuery] = useState("");
  const sq = searchQuery.trim();
  const filtered = sq ? sorted.filter(n => n.title.includes(sq) || n.content.includes(sq)) : sorted;
  return (
    <div>
      <div className="ph">
        <div><h1>공지사항</h1><div className="ph-sub">{notices.length}건</div></div>
        {canManageAll(currentUser.role) && (
          <button className="btn btn-primary btn-sm" onClick={onAdd} style={{display:"flex",alignItems:"center",gap:4,flexShrink:0}}>{IC.plus}<span>추가</span></button>
        )}
      </div>
      <div className="srch-wrap" style={{marginBottom:10}}>
        <span className="srch-icon">{IC.search}</span>
        <input className="srch-inp" placeholder="제목 또는 내용 검색" value={searchQuery} onChange={e => setSearchQuery(e.target.value)} />
        {sq && <button className="srch-clr" onClick={() => setSearchQuery("")}>{IC.x}</button>}
      </div>
      {filtered.length === 0 ? (
        <div className="empty"><img src={knotLineSvg} style={{width:44,height:55,opacity:0.28,marginBottom:10}} alt="" /><div className="empty-txt">{sq ? "검색 결과가 없습니다." : "등록된 공지가 없습니다."}</div></div>
      ) : filtered.map(n => (
        <div key={n.id} className={`notice-card ${n.pinned ? "pinned" : ""}`} onClick={() => setExpanded(expanded === n.id ? null : n.id)}>
          <div className="notice-title">{n.pinned && <span className="pin-icon">📌</span>}{n.title}</div>
          <div className="notice-meta">
            {n.authorName} · {fmtDateTime(n.createdAt)}
            {n.eventStartDate && (
              <span style={{ marginLeft: 8, background: "var(--blue-lt)", color: "var(--blue)", padding: "2px 8px", borderRadius: 10, fontSize: 10.5, fontWeight: 600 }}>
                📅 {n.eventEndDate && n.eventEndDate !== n.eventStartDate
                  ? `${fmtDateShort(n.eventStartDate)} ~ ${fmtDateShort(n.eventEndDate)}`
                  : fmtDate(n.eventStartDate)}
              </span>
            )}
          </div>
          {expanded === n.id && <div className="notice-body">{n.content}</div>}
          {expanded === n.id && n.imageBase64 && (
            <img src={n.imageBase64} alt="공지 이미지" style={{width:"100%",borderRadius:8,marginTop:10,objectFit:"cover"}} />
          )}
          {expanded === n.id && canManageAll(currentUser.role) && (
            <div style={{ display: "flex", gap: 8, marginTop: 10 }}>
              <button className="btn btn-secondary btn-sm" onClick={e => { e.stopPropagation(); onEdit(n); }}>수정</button>
              {delTarget === n.id ? (
                <>
                  <button className="btn btn-danger btn-sm" onClick={e => { e.stopPropagation(); onDelete(n.id); setDelTarget(null); }}>삭제 확인</button>
                  <button className="btn btn-ghost btn-sm" onClick={e => { e.stopPropagation(); setDelTarget(null); }}>취소</button>
                </>
              ) : (
                <button className="btn btn-danger btn-sm" onClick={e => { e.stopPropagation(); setDelTarget(n.id); }}>삭제</button>
              )}
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

// ── STUDENT NOTICE MANAGER (수강생 공지 — 관리자/매니저/강사) ────────────────
export function StudentNoticeManager({ notices, currentUser, students = [], teachers = [], onSave }) {
  const isTeacherRole = currentUser.role === "teacher";
  const canManage = canManageAll(currentUser.role) || isTeacherRole;

  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState({ title: "", content: "", pinned: false, image: "", expireDays: 0, eventDate: "", targetMyStudents: isTeacherRole, targetTeacherId: "" });
  const [confirmDel, setConfirmDel] = useState(null);
  const [readersModal, setReadersModal] = useState(null);
  const [expandedCards, setExpandedCards] = useState(new Set());
  const [imgErr, setImgErr] = useState("");

  const toggleCard = (id) => setExpandedCards(prev => {
    const next = new Set(prev);
    if (next.has(id)) next.delete(id); else next.add(id);
    return next;
  });
  const fileRef = useRef();
  const now = Date.now();
  const sorted = [...notices]
    .filter(n => !(n.expireAt && n.expireAt < now))
    .sort((a,b) => { if(a.pinned&&!b.pinned)return -1; if(!a.pinned&&b.pinned)return 1; return b.createdAt-a.createdAt; });

  const handleImageFile = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setImgErr("");
    try {
      const compressed = await compressImage(file, 800, 0.7);
      setForm(f => ({...f, image: compressed}));
    } catch {
      setImgErr("이미지 처리 중 오류가 발생했습니다.");
    }
    e.target.value = "";
  };

  const startNew = () => {
    setForm({ title: "", content: "", pinned: false, image: "", expireDays: 0, eventDate: "", targetMyStudents: isTeacherRole, targetTeacherId: "" });
    setImgErr("");
    setEditing("new");
  };

  const startEdit = (n) => {
    const hasTarget = !!n.targetTeacherId;
    setForm({
      title: n.title,
      content: n.content,
      pinned: n.pinned || false,
      image: n.imageBase64 || "",
      expireDays: 0,
      eventDate: n.eventDate || "",
      targetMyStudents: isTeacherRole || hasTarget,
      targetTeacherId: n.targetTeacherId || "",
    });
    setImgErr("");
    setEditing(n.id);
  };

  const handleSave = async () => {
    if (!form.title.trim() || !form.content.trim()) return;
    const expireAt = form.expireDays > 0 ? Date.now() + form.expireDays * 24 * 60 * 60 * 1000 : null;
    let targetTeacherId = null;
    if (isTeacherRole) {
      targetTeacherId = currentUser.id;
    } else if (form.targetMyStudents) {
      targetTeacherId = form.targetTeacherId || null;
    }
    const base = {
      title: form.title.trim(),
      content: form.content.trim(),
      pinned: isTeacherRole ? false : form.pinned,
      imageBase64: form.image || "",
      expireAt,
      eventDate: form.eventDate || null,
      targetTeacherId,
      authorId: currentUser.id,
      authorName: currentUser.name,
      authorRole: currentUser.role,
      updatedAt: Date.now(),
    };
    if (editing === "new") {
      const n = { id: uid(), ...base, createdAt: Date.now(), readBy: [] };
      await onSave([...notices, n]);
    } else {
      await onSave(notices.map(n => n.id === editing ? { ...n, ...base } : n));
    }
    setEditing(null);
  };

  const handleDelete = async (id) => {
    await onSave(notices.filter(n => n.id !== id));
    setConfirmDel(null);
  };

  // 수신 대상 인원 계산
  const getTargetCount = (n) => {
    const active = (students||[]).filter(s => s.status === "active" && !s.isInstitution);
    if (!n.targetTeacherId) return active.length;
    return active.filter(s => s.teacherId === n.targetTeacherId).length;
  };

  // 작성자 배지 계산
  const getAuthorBadge = (n) => {
    const role = n.authorRole;
    if (role === "admin") return { label: "관리자", color: "var(--blue)", bg: "var(--blue-lt)" };
    if (role === "manager") return { label: "매니저", color: "#7C3AED", bg: "#F5F3FF" };
    if (role === "teacher") return { label: `강사 ${n.authorName}`, color: "var(--gold-dk)", bg: "var(--gold-lt)" };
    // 기존 공지 (authorRole 없음) — teachers 배열로 판별
    const isTeacherAuthor = (teachers || []).find(t => t.id === n.authorId);
    if (isTeacherAuthor) return { label: `강사 ${n.authorName}`, color: "var(--gold-dk)", bg: "var(--gold-lt)" };
    return { label: "관리자", color: "var(--blue)", bg: "var(--blue-lt)" };
  };

  return (
    <div>
      <div className="ph">
        <div><h1>수강생 공지</h1><div className="ph-sub">My RYE-K 포털에 표시</div></div>
        {canManage && (
          <button className="btn btn-primary btn-sm" onClick={startNew} style={{display:"flex",alignItems:"center",gap:4,flexShrink:0}}>{IC.plus}<span>추가</span></button>
        )}
      </div>
      {sorted.length === 0 && (
        <div className="empty"><div className="empty-icon">📢</div><div className="empty-txt">등록된 공지가 없습니다.</div></div>
      )}
      {sorted.map(n => {
        const badge = getAuthorBadge(n);
        const hasExpiry = !!n.expireAt;
        const daysLeft = hasExpiry ? Math.ceil((n.expireAt - now) / (24*60*60*1000)) : null;
        const isExpanded = expandedCards.has(n.id);
        const needsExpand = n.content.length > 100 || !!n.imageBase64;
        return (
          <div key={n.id} className={`notice-card ${n.pinned ? "pinned" : ""}`}>
            <div style={{display:"flex",alignItems:"flex-start",justifyContent:"space-between",gap:8,flexWrap:"wrap"}}>
              <div className="notice-title" style={{flex:1,marginBottom:4}}>{n.pinned && <span className="pin-icon">📌</span>}{n.title}</div>
              <span style={{fontSize:10.5,fontWeight:600,padding:"2px 8px",borderRadius:10,background:badge.bg,color:badge.color,flexShrink:0,whiteSpace:"nowrap"}}>{badge.label}</span>
            </div>
            <div className="notice-meta" style={{marginBottom:6}}>
              {fmtDateTime(n.createdAt)}
              {hasExpiry && daysLeft !== null && (
                <span style={{marginLeft:8,fontSize:10.5,color:daysLeft<=3?"var(--red)":"var(--ink-30)"}}>
                  {daysLeft > 0 ? `D-${daysLeft} 만료` : "만료됨"}
                </span>
              )}
              {n.eventDate && (
                <span style={{marginLeft:8,fontSize:10.5,background:"rgba(168,33,27,0.10)",color:"var(--dancheong-red)",padding:"1px 6px",borderRadius:8,fontWeight:600}}>
                  📅 {n.eventDate}
                </span>
              )}
              {n.targetTeacherId && (
                <span style={{marginLeft:8,fontSize:10.5,background:"var(--gold-lt)",color:"var(--gold-dk)",padding:"1px 6px",borderRadius:8,fontWeight:600}}>
                  {(() => { const t = (teachers||[]).find(t=>t.id===n.targetTeacherId); return t ? `${t.name} 담당생만` : "담당생만"; })()}
                </span>
              )}
            </div>
            {/* 본문: 접힌 상태 3줄 clamp */}
            <div className="notice-body" style={{marginTop:4,...(!isExpanded && needsExpand ? {display:"-webkit-box",WebkitLineClamp:3,WebkitBoxOrient:"vertical",overflow:"hidden"} : {})}}>{n.content}</div>
            {/* 이미지: 접힌 상태 썸네일 120px, 펼친 상태 원본 */}
            {n.imageBase64 && (
              <img src={n.imageBase64} alt="공지 이미지" style={{width:"100%",borderRadius:8,marginTop:10,objectFit:"cover",height:isExpanded?"auto":120}} />
            )}
            {needsExpand && (
              <button onClick={() => toggleCard(n.id)} style={{background:"none",border:"none",color:"var(--blue)",fontSize:12,cursor:"pointer",padding:"4px 0",fontFamily:"inherit",marginTop:4}}>
                {isExpanded ? "접기 ▴" : "더보기 ▾"}
              </button>
            )}
            <div style={{display:"flex",gap:8,marginTop:10,alignItems:"center",flexWrap:"wrap"}}>
              <button className="btn btn-ghost btn-sm" style={{color:"var(--ink-30)",fontSize:12}} onClick={() => setReadersModal(n)}>
                👁‍🗨 {(n.readBy||[]).length}/{getTargetCount(n)}명 읽음
              </button>
              {(canManageAll(currentUser.role) || (isTeacherRole && n.authorId === currentUser.id)) && (
                <>
                  <button className="btn btn-secondary btn-sm" onClick={() => startEdit(n)}>수정</button>
                  {confirmDel === n.id ? (
                    <>
                      <button className="btn btn-danger btn-sm" onClick={() => handleDelete(n.id)}>삭제 확인</button>
                      <button className="btn btn-ghost btn-sm" onClick={() => setConfirmDel(null)}>취소</button>
                    </>
                  ) : (
                    <button className="btn btn-danger btn-sm" onClick={() => setConfirmDel(n.id)}>삭제</button>
                  )}
                </>
              )}
            </div>
          </div>
        );
      })}


      {/* 공지 작성/수정 모달 */}
      {editing && (
        <div className="mb" onClick={e => e.target === e.currentTarget && setEditing(null)}>
          <div className="modal">
            <div className="modal-h"><h2>{editing === "new" ? "새 공지" : "공지 수정"}</h2><button className="modal-close" onClick={() => setEditing(null)}>{IC.x}</button></div>
            <div className="modal-b">
              {/* 강사 수신 대상 안내 배너 */}
              {isTeacherRole && (
                <div style={{background:"var(--blue-lt)",border:"1px solid rgba(43,58,159,.15)",borderRadius:10,padding:"10px 14px",marginBottom:14,display:"flex",alignItems:"center",gap:10}}>
                  <span style={{fontSize:18,flexShrink:0}}>📢</span>
                  <div>
                    <div style={{fontSize:12.5,fontWeight:700,color:"var(--blue)"}}>수신 대상: 담당 수강생 전체</div>
                    <div style={{fontSize:11,color:"var(--ink-30)",marginTop:1}}>내 담당 수강생 모두에게 발송됩니다.</div>
                  </div>
                </div>
              )}
              <div className="fg"><label className="fg-label">제목 <span className="req">*</span></label><input className="inp" value={form.title} onChange={e => setForm(f=>({...f,title:e.target.value}))} placeholder="공지 제목" /></div>
              <div className="fg"><label className="fg-label">내용 <span className="req">*</span></label><textarea className="inp" value={form.content} onChange={e => setForm(f=>({...f,content:e.target.value}))} placeholder="수강생에게 전달할 공지 내용" rows={5} /></div>

              {/* 사진 첨부 */}
              <div className="fg">
                <label className="fg-label">사진 첨부 (선택)</label>
                {form.image ? (
                  <div style={{position:"relative",display:"inline-block"}}>
                    <img src={form.image} alt="미리보기" style={{width:"100%",maxWidth:300,borderRadius:10,display:"block"}} />
                    <button onClick={() => setForm(f=>({...f,image:""}))} style={{position:"absolute",top:6,right:6,background:"rgba(0,0,0,.55)",border:"none",borderRadius:"50%",width:26,height:26,color:"#fff",fontSize:14,cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center"}}>×</button>
                  </div>
                ) : (
                  <button className="btn btn-secondary btn-sm" onClick={() => fileRef.current.click()}>📷 사진 첨부</button>
                )}
                <input ref={fileRef} type="file" accept="image/*" style={{display:"none"}} onChange={handleImageFile} />
                {imgErr && <div style={{fontSize:12,color:"var(--red)",marginTop:4}}>⚠ {imgErr}</div>}
              </div>

              {/* 노출 기간 */}
              <div className="fg">
                <label className="fg-label">노출 기간</label>
                <select className="sel" style={{maxWidth:180}} value={form.expireDays} onChange={e => setForm(f=>({...f,expireDays:parseInt(e.target.value)||0}))}>
                  <option value={0}>무제한</option>
                  <option value={7}>7일</option>
                  <option value={30}>30일</option>
                </select>
              </div>

              {/* 일정 (선택) — 회원 포털 캘린더에 마커 표시 */}
              <div className="fg">
                <label className="fg-label">관련 일정 (선택)</label>
                <div style={{display:"flex",alignItems:"center",gap:8,flexWrap:"wrap"}}>
                  <input className="inp" type="date" value={form.eventDate} onChange={e => setForm(f=>({...f,eventDate:e.target.value}))} style={{maxWidth:180}} />
                  {form.eventDate && (
                    <button type="button" className="btn btn-ghost btn-sm" onClick={() => setForm(f=>({...f,eventDate:""}))}>지우기</button>
                  )}
                </div>
                <div style={{fontSize:11,color:"var(--ink-30)",marginTop:4}}>설정 시 회원 포털 캘린더 해당 날짜에 일정 마커가 표시됩니다 (공연·연습 등).</div>
              </div>

              {/* 노출 대상 */}
              <div className="fg">
                <label className="fg-label">노출 대상</label>
                {isTeacherRole ? (
                  <div style={{display:"flex",alignItems:"center",gap:8,opacity:.6}}>
                    <div style={{width:20,height:20,border:"1.5px solid var(--border)",borderRadius:6,display:"flex",alignItems:"center",justifyContent:"center",background:"var(--blue)"}}>
                      <span style={{color:"#fff",fontSize:12,fontWeight:700}}>✓</span>
                    </div>
                    <span style={{fontSize:13,color:"var(--ink-60)"}}>내 담당 수강생에게만 노출 (강사 고정)</span>
                  </div>
                ) : (
                  <>
                    <div style={{display:"flex",alignItems:"center",gap:8,cursor:"pointer",marginBottom:form.targetMyStudents?8:0}} onClick={() => setForm(f=>({...f,targetMyStudents:!f.targetMyStudents,targetTeacherId:""}))}>
                      <div style={{width:20,height:20,border:"1.5px solid var(--border)",borderRadius:6,display:"flex",alignItems:"center",justifyContent:"center",background:form.targetMyStudents?"var(--blue)":"var(--paper)",transition:"all .12s"}}>
                        {form.targetMyStudents && <span style={{color:"#fff",fontSize:12,fontWeight:700}}>✓</span>}
                      </div>
                      <span style={{fontSize:13,color:"var(--ink-60)"}}>특정 강사 담당생에게만 노출</span>
                    </div>
                    {form.targetMyStudents && (
                      <select className="sel" value={form.targetTeacherId} onChange={e => setForm(f=>({...f,targetTeacherId:e.target.value}))}>
                        <option value="">강사 선택</option>
                        {(teachers||[]).map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
                      </select>
                    )}
                  </>
                )}
              </div>

              {/* 상단 고정 — 관리자/매니저 전용 */}
              {!isTeacherRole && (
                <div style={{display:"flex",alignItems:"center",gap:8,cursor:"pointer"}} onClick={() => setForm(f=>({...f,pinned:!f.pinned}))}>
                  <div style={{width:20,height:20,border:"1.5px solid var(--border)",borderRadius:6,display:"flex",alignItems:"center",justifyContent:"center",background:form.pinned?"var(--gold)":"var(--paper)",transition:"all .12s"}}>{form.pinned && <span style={{color:"#fff",fontSize:12,fontWeight:700}}>✓</span>}</div>
                  <span style={{fontSize:13.5,color:"var(--ink-60)"}}>상단 고정</span>
                </div>
              )}
            </div>
            <div className="modal-f"><button className="btn btn-secondary" onClick={() => setEditing(null)}>취소</button><button className="btn btn-primary" onClick={handleSave}>저장</button></div>
          </div>
        </div>
      )}

      {/* 읽음 확인 팝업 */}
      {readersModal && (
        <div className="mb" onClick={e => e.target === e.currentTarget && setReadersModal(null)}>
          <div className="modal" style={{maxWidth:360}}>
            <div className="modal-h"><h2>읽음 확인</h2><button className="modal-close" onClick={() => setReadersModal(null)}>{IC.x}</button></div>
            <div className="modal-b">
              <div style={{fontSize:13,fontWeight:600,color:"var(--ink)",marginBottom:8}}>「{readersModal.title}」</div>
              <div style={{fontSize:12,color:"var(--ink-30)",marginBottom:12}}>총 {(readersModal.readBy||[]).length}/{getTargetCount(readersModal)}명 읽음</div>
              {(readersModal.readBy||[]).length === 0 ? (
                <div style={{textAlign:"center",color:"var(--ink-30)",fontSize:13,padding:"20px 0"}}>아직 읽은 수강생이 없습니다.</div>
              ) : (
                <div style={{display:"flex",flexWrap:"wrap",gap:6}}>
                  {(readersModal.readBy||[]).map(id => {
                    const s = (students||[]).find(s => s.id === id);
                    return (
                      <span key={id} style={{background:"var(--blue-lt)",color:"var(--blue)",padding:"4px 12px",borderRadius:20,fontSize:12.5,fontWeight:500}}>
                        {s?.name || "탈퇴 회원"}
                      </span>
                    );
                  })}
                </div>
              )}
            </div>
            <div className="modal-f"><button className="btn btn-secondary" onClick={() => setReadersModal(null)}>닫기</button></div>
          </div>
        </div>
      )}
    </div>
  );
}
