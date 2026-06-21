import { useState, useEffect } from "react";
import knotLineSvg from "../../assets/heritage/knot-line.svg";
import { PAY_METHODS, IC, TODAY_STR, THIS_MONTH } from "../../constants.jsx";
import { canManageAll, monthLabel, fmtMoney, fmtDateShort, fmtDate, calcAge, isMinor, instTypeLabel, uid, sendAligoMessage, fetchAligoRemain, calcTotalFee } from "../../utils.js";
import { HelpButton } from "../shared/HelpSystem.jsx";
import { Av } from "../shared/CommonUI.jsx";
import AlimtalkModal from "../shared/AlimtalkModal.jsx";
import { DEFAULT_DISCOUNT_TYPES } from "../admin/AdminTools.jsx";

function DiscountTypeManager({ discountTypes, onSaveDiscountTypes, uid: uidFn }) {
  const [editId, setEditId] = useState(null);
  const [editForm, setEditForm] = useState({});
  const [deleteConfirmId, setDeleteConfirmId] = useState(null);
  const [adding, setAdding] = useState(false);
  const [newForm, setNewForm] = useState({ name: "", type: "percent", value: 10, burden: "academy", notes: "", active: true });
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState("");

  const handleToggleActive = async (id) => {
    const upd = discountTypes.map(d => d.id === id ? { ...d, active: d.active === false ? true : false } : d);
    setSaving(true);
    try { await onSaveDiscountTypes(upd); setErr(""); }
    catch (e) { setErr("저장 실패: " + e.message); }
    finally { setSaving(false); }
  };

  const handleSaveEdit = async () => {
    if (!editForm.name?.trim()) { setErr("이름을 입력하세요."); return; }
    const val = Number(editForm.value);
    if (!Number.isFinite(val) || val < 0) { setErr("할인 값은 0 이상 숫자여야 합니다."); return; }
    if (editForm.type === "percent" && val > 100) { setErr("퍼센트 할인은 100% 이하여야 합니다."); return; }
    const finalEdit = { ...editForm, value: val };
    if (finalEdit.burden === "split" && !finalEdit.splitRatio) finalEdit.splitRatio = { academy: 0.5, teacher: 0.5 };
    const upd = discountTypes.map(d => d.id === editId ? { ...d, ...finalEdit } : d);
    setSaving(true);
    try { await onSaveDiscountTypes(upd); setEditId(null); setErr(""); }
    catch (e) { setErr("저장 실패: " + e.message); }
    finally { setSaving(false); }
  };

  const handleDelete = async (id) => {
    const upd = discountTypes.filter(d => d.id !== id);
    setSaving(true);
    try { await onSaveDiscountTypes(upd); setDeleteConfirmId(null); setErr(""); }
    catch (e) { setErr("삭제 실패: " + e.message); }
    finally { setSaving(false); }
  };

  const handleAddNew = async () => {
    if (!newForm.name?.trim()) { setErr("이름을 입력하세요."); return; }
    const val = Number(newForm.value);
    if (!Number.isFinite(val) || val < 0) { setErr("할인 값은 0 이상 숫자여야 합니다."); return; }
    if (newForm.type === "percent" && val > 100) { setErr("퍼센트 할인은 100% 이하여야 합니다."); return; }
    const entry = { ...newForm, id: uidFn(), value: val, createdAt: Date.now() };
    if (entry.burden === "split" && !entry.splitRatio) entry.splitRatio = { academy: 0.5, teacher: 0.5 };
    const upd = [...discountTypes, entry];
    setSaving(true);
    try {
      await onSaveDiscountTypes(upd);
      setAdding(false);
      setNewForm({ name: "", type: "percent", value: 10, burden: "academy", notes: "", active: true });
      setErr("");
    }
    catch (e) { setErr("저장 실패: " + e.message); }
    finally { setSaving(false); }
  };

  const handleSeedDefaults = async () => {
    const upd = DEFAULT_DISCOUNT_TYPES.map(d => ({ ...d, id: uidFn(), createdAt: Date.now() }));
    setSaving(true);
    try { await onSaveDiscountTypes(upd); setErr(""); }
    catch (e) { setErr("초기화 실패: " + e.message); }
    finally { setSaving(false); }
  };

  const burdenLabel = (d) => {
    if (d.burden === "teacher") return "강사";
    if (d.burden === "split") return `분담 (학원 ${Math.round((d.splitRatio?.academy ?? 0.5) * 100)}%)`;
    return "학원";
  };

  return (
    <div>
      <div className="ph">
        <div>
          <h1>할인 관리</h1>
          <div className="ph-sub">등록된 할인 타입 {discountTypes.length}개</div>
        </div>
      </div>
      {err && <div className="form-err" style={{ marginBottom: 8 }}>⚠ {err}</div>}
      <div className="card" style={{ padding: 0, overflow: "hidden", marginBottom: 10 }}>
        {discountTypes.length === 0 && !adding && (
          <div style={{ padding: 28, textAlign: "center", color: "var(--ink-30)" }}>
            <div style={{ marginBottom: 12 }}>등록된 할인 타입이 없습니다.</div>
            <button
              className="btn btn-secondary btn-sm"
              onClick={handleSeedDefaults}
              disabled={saving}
            >
              {saving ? "생성 중…" : "초기 할인 타입 7개 생성"}
            </button>
          </div>
        )}
        {discountTypes.map((d, idx) => (
          <div
            key={d.id}
            style={{
              borderBottom: idx < discountTypes.length - 1 ? "1px solid var(--border)" : "none",
              padding: "12px 16px",
            }}
          >
            {editId === d.id ? (
              <div>
                <div className="fg-row" style={{ marginBottom: 8 }}>
                  <div className="fg">
                    <label className="fg-label">이름</label>
                    <input className="inp" value={editForm.name || ""} onChange={e => setEditForm(f => ({ ...f, name: e.target.value }))} />
                  </div>
                  <div className="fg">
                    <label className="fg-label">타입</label>
                    <select className="sel" value={editForm.type || "percent"} onChange={e => setEditForm(f => ({ ...f, type: e.target.value }))}>
                      <option value="percent">% 할인</option>
                      <option value="fixed">금액 할인(원)</option>
                    </select>
                  </div>
                  <div className="fg">
                    <label className="fg-label">값</label>
                    <input className="inp" type="number" min="0" value={editForm.value ?? ""} onChange={e => setEditForm(f => ({ ...f, value: Number(e.target.value) }))} />
                  </div>
                </div>
                <div className="fg-row" style={{ marginBottom: 8 }}>
                  <div className="fg">
                    <label className="fg-label">부담 주체</label>
                    <select className="sel" value={editForm.burden || "academy"} onChange={e => setEditForm(f => ({ ...f, burden: e.target.value }))}>
                      <option value="academy">학원</option>
                      <option value="teacher">강사</option>
                      <option value="split">분담</option>
                    </select>
                  </div>
                  {editForm.burden === "split" && (
                    <div className="fg">
                      <label className="fg-label">학원 부담 비율 (%)</label>
                      <input
                        className="inp"
                        type="number"
                        min="0"
                        max="100"
                        value={Math.round((editForm.splitRatio?.academy ?? 0.5) * 100)}
                        onChange={e => {
                          const v = Math.max(0, Math.min(1, Number(e.target.value) / 100));
                          setEditForm(f => ({ ...f, splitRatio: { academy: v, teacher: 1 - v } }));
                        }}
                      />
                    </div>
                  )}
                </div>
                <div className="fg" style={{ marginBottom: 8 }}>
                  <label className="fg-label">메모</label>
                  <input className="inp" value={editForm.notes || ""} onChange={e => setEditForm(f => ({ ...f, notes: e.target.value }))} />
                </div>
                <div style={{ display: "flex", gap: 8 }}>
                  <button className="btn btn-primary btn-sm" onClick={handleSaveEdit} disabled={saving}>{saving ? "저장 중…" : "저장"}</button>
                  <button className="btn btn-ghost btn-sm" onClick={() => { setEditId(null); setErr(""); }}>취소</button>
                </div>
              </div>
            ) : (
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: 600, fontSize: 13.5 }}>{d.name}</div>
                  <div style={{ fontSize: 11, color: "var(--ink-60)", marginTop: 2 }}>
                    {d.type === "percent" ? `${d.value}%` : `${Number(d.value).toLocaleString("ko-KR")}원`} 할인 · {burdenLabel(d)}
                  </div>
                </div>
                <button
                  onClick={() => handleToggleActive(d.id)}
                  disabled={saving}
                  style={{
                    fontSize: 11, padding: "2px 8px", borderRadius: 99,
                    border: "1px solid var(--border)",
                    background: d.active !== false ? "var(--green)" : "var(--ink-10)",
                    color: d.active !== false ? "#fff" : "var(--ink-30)",
                    cursor: "pointer", fontWeight: 600, whiteSpace: "nowrap",
                  }}
                >
                  {d.active !== false ? "활성" : "비활성"}
                </button>
                {deleteConfirmId === d.id ? (
                  <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                    <span style={{ fontSize: 11, color: "var(--red)", whiteSpace: "nowrap" }}>정말 삭제?</span>
                    <button
                      style={{ fontSize: 11, padding: "2px 8px", borderRadius: 6, background: "var(--red)", color: "#fff", border: "none", cursor: "pointer", fontWeight: 600 }}
                      onClick={() => handleDelete(d.id)}
                      disabled={saving}
                    >
                      삭제
                    </button>
                    <button className="btn btn-ghost btn-sm" onClick={() => setDeleteConfirmId(null)}>취소</button>
                  </div>
                ) : (
                  <div style={{ display: "flex", gap: 4 }}>
                    <button className="btn btn-ghost btn-sm" onClick={() => { setEditId(d.id); setEditForm({ ...d }); setErr(""); }}>수정</button>
                    <button className="btn btn-ghost btn-sm" style={{ color: "var(--red)" }} onClick={() => setDeleteConfirmId(d.id)}>삭제</button>
                  </div>
                )}
              </div>
            )}
          </div>
        ))}
      </div>
      {!adding ? (
        <button className="btn btn-secondary btn-sm" onClick={() => { setAdding(true); setErr(""); }}>
          + 할인 타입 추가
        </button>
      ) : (
        <div className="card" style={{ padding: 16, marginTop: 4 }}>
          <div className="fg-row" style={{ marginBottom: 8 }}>
            <div className="fg">
              <label className="fg-label">이름 <span className="req">*</span></label>
              <input className="inp" value={newForm.name} onChange={e => setNewForm(f => ({ ...f, name: e.target.value }))} placeholder="예: 지인 소개" />
            </div>
            <div className="fg">
              <label className="fg-label">타입</label>
              <select className="sel" value={newForm.type} onChange={e => setNewForm(f => ({ ...f, type: e.target.value }))}>
                <option value="percent">% 할인</option>
                <option value="fixed">금액 할인(원)</option>
              </select>
            </div>
            <div className="fg">
              <label className="fg-label">값</label>
              <input className="inp" type="number" min="0" value={newForm.value} onChange={e => setNewForm(f => ({ ...f, value: e.target.value }))} />
            </div>
          </div>
          <div className="fg-row" style={{ marginBottom: 8 }}>
            <div className="fg">
              <label className="fg-label">부담 주체</label>
              <select className="sel" value={newForm.burden} onChange={e => setNewForm(f => ({ ...f, burden: e.target.value }))}>
                <option value="academy">학원</option>
                <option value="teacher">강사</option>
                <option value="split">분담</option>
              </select>
            </div>
            {newForm.burden === "split" && (
              <div className="fg">
                <label className="fg-label">학원 부담 비율 (%)</label>
                <input
                  className="inp"
                  type="number"
                  min="0"
                  max="100"
                  defaultValue={50}
                  onChange={e => {
                    const v = Number(e.target.value) / 100;
                    setNewForm(f => ({ ...f, splitRatio: { academy: v, teacher: 1 - v } }));
                  }}
                />
              </div>
            )}
          </div>
          <div className="fg" style={{ marginBottom: 8 }}>
            <label className="fg-label">메모</label>
            <input className="inp" value={newForm.notes} onChange={e => setNewForm(f => ({ ...f, notes: e.target.value }))} />
          </div>
          <div style={{ display: "flex", gap: 8 }}>
            <button className="btn btn-primary btn-sm" onClick={handleAddNew} disabled={saving}>{saving ? "추가 중…" : "추가"}</button>
            <button className="btn btn-ghost btn-sm" onClick={() => { setAdding(false); setErr(""); }}>취소</button>
          </div>
        </div>
      )}
    </div>
  );
}

export default function PaymentsView({
  students, teachers, currentUser, payments, onSavePayments, onLog,
  attendance = [], onSaveStudents,
  unmatchedPayments = [],
  onSaveUnmatched,
  paymentLog = [],
  onSavePaymentLog,
  initFilterUnpaid = false,
  onMountFilterConsumed,
  feePresets = {},
  instantCharges = [],
  shopItems = { categories: ["의상/공연복","악세사리","악기 가방","기타"], items: [] },
  onAddInstantCharge,
  onApproveInstantCharge,
  onRejectInstantCharge,
  onConfirmInstantPayment,
  discountTypes = [],
  onSaveDiscountTypes,
}) {
  const [month, setMonth] = useState(THIS_MONTH);
  const [editingId, setEditingId] = useState(null);
  const [editForm, setEditForm] = useState({});
  const [filterTeacher, setFilterTeacher] = useState(currentUser.role === "teacher" ? currentUser.id : "all");
  const [filterUnpaid, setFilterUnpaid] = useState(initFilterUnpaid);
  useEffect(() => {
    if (initFilterUnpaid && onMountFilterConsumed) onMountFilterConsumed();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps
  const [previewStudent, setPreviewStudent] = useState(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [acctToast, setAcctToast] = useState(false);
  const [alimtalkModal, setAlimtalkModal] = useState(null); // null | "monthly_fee" | "unpaid_reminder"
  const [quickPayingId, setQuickPayingId] = useState(null);
  const [instantReqModal, setInstantReqModal] = useState(null); // null | studentObj
  const [instantReqForm, setInstantReqForm] = useState({
    category: "",
    itemName: "",
    amount: "",
    amountPending: false,
    stockAvailable: true,
    note: "",
  });
  const [instantReqSaving, setInstantReqSaving] = useState(false);
  const [instantReqErr, setInstantReqErr] = useState("");
  const [approveInstantModal, setApproveInstantModal] = useState(null); // null | chargeObj
  const [approveInstantAmount, setApproveInstantAmount] = useState("");
  const [approveInstantSaving, setApproveInstantSaving] = useState(false);
  const [approveInstantCopied, setApproveInstantCopied] = useState(null);
  const [approveInstantMsg, setApproveInstantMsg] = useState("");
  const [approveInstantErr, setApproveInstantErr] = useState("");
  const [rejectInstantId, setRejectInstantId] = useState(null); // 인라인 거절 확인 중인 charge id
  const [rejectReason, setRejectReason] = useState("");
  const [rejectSaving, setRejectSaving] = useState(false);
  const [rejectErr, setRejectErr] = useState("");
  const [confirmingPaymentId, setConfirmingPaymentId] = useState(null);
  const [bulkPrepModal, setBulkPrepModal] = useState(false);
  const [bulkPrepData, setBulkPrepData] = useState({});
  const [bulkSaving, setBulkSaving] = useState(false);
  const [bulkInstModal, setBulkInstModal] = useState(false);
  const [bulkInstData, setBulkInstData] = useState({});
  const [bulkInstSaving, setBulkInstSaving] = useState(false);
  const [bulkErr, setBulkErr] = useState("");
  const [bulkInstErr, setBulkInstErr] = useState("");
  const [activeTab, setActiveTab] = useState("payments");
  const [aligoRemain, setAligoRemain] = useState(null);
  const [aligoRemainLoading, setAligoRemainLoading] = useState(false);
  const [aligoRemainErr, setAligoRemainErr] = useState("");
  const [editSaveError, setEditSaveError] = useState("");
  const [saveEditSaving, setSaveEditSaving] = useState(false);

  const pendingInstantCount = instantCharges.filter(c => c.status === "pending").length;

  const ACCT_MSG = "[RYE-K K-Culture Center]\n수강생 여러분의 깊은 관심에 항상 감사드립니다.\n원활한 수업 진행을 위해 수강료 납부 계좌를 안내드리오니 확인 부탁드립니다.\n\n- 카카오뱅크 3333-34-5220544 (예금주: 예케이케이컬처센터)\n\n늘 정성을 다하는 교육으로 보답하겠습니다.";
  const copyAcct = async () => {
    try { await navigator.clipboard.writeText(ACCT_MSG); } catch { const ta = document.createElement("textarea"); ta.value = ACCT_MSG; document.body.appendChild(ta); ta.select(); document.execCommand("copy"); document.body.removeChild(ta); }
    setAcctToast(true); setTimeout(() => setAcctToast(false), 2500);
  };
  const isTeacher = currentUser.role === "teacher";

  function getPayment(studentId) { return payments.find(p => p.studentId === studentId && p.month === month); }
  const autoFeeResult = (s) => calcTotalFee(s, feePresets, discountTypes);
  const autoFee = (s) => autoFeeResult(s).total;

  const visibleStudents = (filterTeacher === "all" ? students : students.filter(s => s.teacherId === filterTeacher || (s.lessons||[]).some(l=>l.teacherId===filterTeacher)))
    .filter(s => (s.status || "active") === "active")
    .filter(s => !searchQuery.trim() || s.name.includes(searchQuery.trim()))
    .filter(s => { if (!filterUnpaid) return true; const p = getPayment(s.id); return !p?.paid || (p.paidAmount != null && (p.paidAmount||0) < (p.amount ?? autoFee(s))); });

  const totalDue = visibleStudents.reduce((sum, s) => {
    const p = getPayment(s.id);
    return sum + (p?.amount ?? autoFee(s));
  }, 0);
  const totalPaid = visibleStudents.reduce((sum, s) => { const p = getPayment(s.id); return sum + (p?.paid ? (p.paidAmount != null ? p.paidAmount : p.amount) : 0); }, 0);
  const unpaidCount = visibleStudents.filter(s => { const p = getPayment(s.id); const total = p?.amount ?? autoFee(s); return !p?.paid || (p.paidAmount != null && (p.paidAmount||0) < total); }).length;
  const paidCount = visibleStudents.length - unpaidCount;
  const paidRate = visibleStudents.length > 0 ? Math.round(paidCount / visibleStudents.length * 100) : 0;

  const exportCSV = () => {
    const header = "회원명,수강료,납부여부,입금액,입금일,입금방법,메모\n";
    const rows = visibleStudents.map(s => {
      const p = getPayment(s.id);
      const amt = p?.amount ?? autoFee(s);
      return `${s.name},${amt},${p?.paid ? "완료" : "미납"},${p?.paid ? (p.paidAmount || amt) : 0},${p?.paidDate || ""},${p?.method ? (PAY_METHODS[p.method] || p.method) : ""},${(p?.note || "").replace(/,/g," ")}`;
    }).join("\n");
    const bom = "\uFEFF";
    const blob = new Blob([bom + header + rows], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = `수납현황_${month}.csv`; a.click();
    URL.revokeObjectURL(url);
  };

  const openEdit = (s) => {
    const p = getPayment(s.id);
    const autoBase = autoFee(s);
    const extraCharges = p?.extraCharges ?? [];
    const extraSum = extraCharges.reduce((acc, x) => acc + (x.amount || 0), 0);
    // baseAmount: 저장된 값 우선, 없으면 total - extras, 그것도 없으면 autoFee
    const baseAmount = p?.baseAmount ?? ((p?.amount != null) ? p.amount - extraSum : autoBase);
    setEditForm({
      studentId: s.id,
      baseAmount,
      amount: baseAmount + extraSum,
      paid: p?.paid ?? false,
      paidAmount: p?.paidAmount ?? (baseAmount + extraSum),
      paidDate: p?.paidDate ?? TODAY_STR,
      method: p?.method ?? "transfer",
      note: p?.note ?? "",
      extraCharges,
      newChargeTitle: "",
      newChargeAmount: "",
    });
    setEditingId(s.id);
  };

  const saveEdit = async () => {
    if (saveEditSaving) return;
    setSaveEditSaving(true);
    setEditSaveError("");
    const existing = getPayment(editForm.studentId);
    const record = {
      ...(existing || {}),
      id: existing?.id || uid(),
      studentId: editForm.studentId,
      month,
      amount: editForm.amount,
      baseAmount: editForm.baseAmount,
      paid: editForm.paid,
      paidAmount: editForm.paid ? editForm.paidAmount : 0,
      paidDate: editForm.paid ? editForm.paidDate : "",
      method: editForm.paid ? editForm.method : "",
      note: editForm.note,
      extraCharges: editForm.extraCharges || [],
      createdAt: existing?.createdAt || Date.now(),
      updatedAt: Date.now(),
    };
    const upd = existing ? payments.map(p => p.id === existing.id ? record : p) : [...payments, record];
    try {
      await onSavePayments(upd);
      const sName = visibleStudents.find(s => s.id === editForm.studentId)?.name;
      if (editForm.paid && !existing?.paid) onLog(`${sName} 회원 ${monthLabel(month)} 수강료 입금 확인`);
      setEditSaveError(""); setEditingId(null);
    } catch (e) {
      console.error("수납 저장 실패:", e);
      setEditSaveError(e?.message || "저장에 실패했습니다. 다시 시도해주세요.");
    } finally {
      setSaveEditSaving(false);
    }
  };

  const prevMonth = () => { const d = new Date(month + "-01"); d.setMonth(d.getMonth() - 1); setMonth(d.toISOString().slice(0,7)); };
  const nextMonth = () => { const d = new Date(month + "-01"); d.setMonth(d.getMonth() + 1); setMonth(d.toISOString().slice(0,7)); };
  // prevMonthStr: 현재 선택된 month 기준 전달. 테스트 방법 — month 드롭다운을 다음 달로 변경하면 이번 달 결석 카운트 확인 가능.
  const prevMonthStr = (() => { const d = new Date(month + "-01"); d.setMonth(d.getMonth() - 1); return d.toISOString().slice(0, 7); })();

  // ── 수강료 일괄 확정 ────────────────────────────────────────────────────────
  const setBulkField = (sid, key, val) =>
    setBulkPrepData(d => ({...d, [sid]: {...(d[sid]||{}), [key]: val}}));

  const addBulkExtra = (sid) => {
    setBulkPrepData(d => {
      const item = d[sid] || {};
      const title = (item.newTitle || "").trim();
      const amt = parseInt(item.newAmt || "0") || 0;
      if (!title) return d;
      return {...d, [sid]: {...item, extras:[...(item.extras||[]), {title, amount:amt}], amount:(item.amount||0)+amt, newTitle:"", newAmt:""}};
    });
  };

  const removeBulkExtra = (sid, idx) => {
    setBulkPrepData(d => {
      const item = d[sid] || {};
      const removed = (item.extras||[])[idx];
      const extras = (item.extras||[]).filter((_,i)=>i!==idx);
      return {...d, [sid]: {...item, extras, amount: Math.max(0, (item.amount||0)-(removed?.amount||0))}};
    });
  };

  const openBulkPrep = () => {
    const allActive = students.filter(s => (s.status||"active")==="active" && !s.isInstitution);
    const data = {};
    allActive.forEach(s => {
      const p = payments.find(py => py.studentId === s.id && py.month === month);
      data[s.id] = {
        amount: p?.amount ?? autoFee(s),
        extras: [...(p?.extraCharges || [])],
        newTitle: "",
        newAmt: "",
      };
    });
    setBulkPrepData(data);
    setBulkPrepModal(true);
  };

  const confirmBulkPrep = async () => {
    setBulkSaving(true);
    try {
      // 회원만 — 기관(B2B)은 별도 버튼 (기관 청구 확정)으로 처리
      const allActive = students.filter(s => (s.status||"active")==="active" && !s.isInstitution);
      let updated = [...payments];
      for (const s of allActive) {
        const d = bulkPrepData[s.id];
        if (!d) continue;
        const existing = updated.find(p => p.studentId === s.id && p.month === month);
        const record = {
          ...(existing || {}),
          id: existing?.id || uid(),
          studentId: s.id,
          month,
          amount: d.amount,
          extraCharges: d.extras,
          paid: existing?.paid ?? false,
          paidAmount: existing?.paidAmount ?? 0,
          paidDate: existing?.paidDate ?? "",
          method: existing?.method ?? "",
          note: existing?.note ?? "",
          createdAt: existing?.createdAt || Date.now(),
          updatedAt: Date.now(),
        };
        updated = existing
          ? updated.map(p => p.id === existing.id ? record : p)
          : [...updated, record];
      }
      await onSavePayments(updated);
      setBulkPrepModal(false);
    } catch (e) { console.error("일괄 수납 청구 실패:", e); setBulkErr("저장 실패. 잠시 후 다시 시도해주세요."); } finally { setBulkSaving(false); }
  };

  const openBulkPrepInst = () => {
    const instActive = students.filter(s => s.isInstitution && (s.status||"active")==="active");
    const data = {};
    instActive.forEach(s => {
      const p = payments.find(py => py.studentId === s.id && py.month === month);
      data[s.id] = { amount: p?.amount ?? (s.monthlyFee || 0) };
    });
    setBulkInstData(data);
    setBulkInstModal(true);
  };

  const confirmBulkInstPrep = async () => {
    setBulkInstSaving(true);
    try {
      const instActive = students.filter(s => s.isInstitution && (s.status||"active")==="active");
      let updated = [...payments];
      for (const s of instActive) {
        const d = bulkInstData[s.id];
        if (!d) continue;
        const existing = updated.find(p => p.studentId === s.id && p.month === month);
        const record = {
          ...(existing || {}),
          id: existing?.id || uid(),
          studentId: s.id,
          month,
          amount: d.amount,
          paid: existing?.paid ?? false,
          paidAmount: existing?.paidAmount ?? 0,
          paidDate: existing?.paidDate ?? "",
          method: existing?.method ?? "",
          note: existing?.note ?? "",
          createdAt: existing?.createdAt || Date.now(),
          updatedAt: Date.now(),
        };
        updated = existing
          ? updated.map(p => p.id === existing.id ? record : p)
          : [...updated, record];
      }
      await onSavePayments(updated);
      setBulkInstModal(false);
    } catch (e) { console.error("기관 수납 청구 실패:", e); setBulkInstErr("저장 실패. 잠시 후 다시 시도해주세요."); } finally { setBulkInstSaving(false); }
  };

  return (
    <div>
      {/* ── 계좌 안내 배너 ── */}
      <div onClick={copyAcct} style={{display:"flex",alignItems:"center",gap:10,background:"#EEF2FF",border:"1px solid #C7D2FE",borderRadius:10,padding:"10px 14px",marginBottom:12,cursor:"pointer",transition:"background .15s",userSelect:"none"}} onMouseEnter={e=>e.currentTarget.style.background="#E0E7FF"} onMouseLeave={e=>e.currentTarget.style.background="#EEF2FF"}>
        <span style={{fontSize:18,flexShrink:0}}>🏦</span>
        <div style={{flex:1,minWidth:0}}>
          <div style={{fontSize:12,fontWeight:600,color:"#3730A3"}}>카카오뱅크 3333-34-5220544</div>
          <div style={{fontSize:11,color:"#6366F1",marginTop:1}}>예금주: 예케이케이컬처센터 · 클릭하여 안내 멘트 복사</div>
        </div>
        <span style={{fontSize:11,color:"#6366F1",flexShrink:0,fontWeight:500}}>{acctToast ? "✓ 복사됨" : "📋 복사"}</span>
      </div>
      {acctToast && <div style={{position:"fixed",bottom:80,left:"50%",transform:"translateX(-50%)",background:"#1E1B4B",color:"#fff",fontSize:13,fontWeight:500,padding:"10px 20px",borderRadius:24,zIndex:9999,boxShadow:"0 4px 20px rgba(0,0,0,.25)",whiteSpace:"nowrap",pointerEvents:"none"}}>안내 멘트가 복사되었습니다!</div>}
      <div className="ph"><div><div style={{display:"flex",alignItems:"center",gap:6}}><h1>수납 관리</h1><HelpButton helpKey="payments" /></div><div className="ph-sub">{monthLabel(month)}</div></div><div style={{display:"flex",gap:6,flexWrap:"wrap",justifyContent:"flex-end"}}>
        {canManageAll(currentUser.role) && pendingInstantCount > 0 && (
          <button className="btn btn-sm"
            style={{background:"var(--blue-lt)",border:"1.5px solid var(--blue)",color:"var(--blue)",fontWeight:700}}
            onClick={() => setActiveTab("instantCharges")}>
            즉시 청구
            <span style={{marginLeft:6,background:"var(--blue)",color:"#fff",borderRadius:99,padding:"1px 7px",fontSize:11,fontWeight:700}}>{pendingInstantCount}</span>
          </button>
        )}
        {canManageAll(currentUser.role) && <button className="btn btn-secondary btn-sm" onClick={openBulkPrep} title="전체 수강료 일괄 확인 및 확정">📋 수강료 확정</button>}
        {canManageAll(currentUser.role) && <button className="btn btn-secondary btn-sm" onClick={openBulkPrepInst} title="기관 청구 일괄 확정">🏢 기관 청구 확정</button>}
        {canManageAll(currentUser.role) && <button className="btn btn-secondary btn-sm" onClick={() => setAlimtalkModal("monthly_fee")} title="이달의 수강료 안내 알림톡">💬 수강료 안내</button>}
        {canManageAll(currentUser.role) && <button className="btn btn-secondary btn-sm" onClick={() => setAlimtalkModal("unpaid_reminder")} title="미납자 독촉 알림톡">💬 미납 독촉</button>}
        {canManageAll(currentUser.role) && (
          <div style={{display:"flex",flexDirection:"column",alignItems:"flex-end",gap:2}}>
            <button className="btn btn-secondary btn-sm" title="알림톡 잔여포인트 확인"
              style={aligoRemain !== null && aligoRemain >= 0 && aligoRemain < 50 ? {color:"var(--red)",borderColor:"var(--red)"} : aligoRemain < 0 ? {color:"var(--red)",borderColor:"var(--red)"} : {}}
              onClick={async () => {
                setAligoRemainLoading(true);
                setAligoRemainErr("");
                try { setAligoRemain(await fetchAligoRemain()); }
                catch(e) { setAligoRemain(-1); setAligoRemainErr(e.message || "오류"); }
                finally { setAligoRemainLoading(false); }
              }}>
              {aligoRemainLoading ? "..." : aligoRemain === null ? "💬 잔여건" : aligoRemain < 0 ? "💬 조회 실패" : `💬 ${aligoRemain.toLocaleString("ko-KR")}건`}
            </button>
            {aligoRemainErr && <span style={{fontSize:10,color:"var(--red)",maxWidth:160,textAlign:"right",lineHeight:1.3}}>{aligoRemainErr}</span>}
          </div>
        )}
        {canManageAll(currentUser.role) && <button className="btn btn-secondary btn-sm" onClick={exportCSV}>📥 엑셀</button>}
      </div></div>
      <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:10}}>
        <button className="btn btn-secondary btn-xs" onClick={prevMonth}>◀</button>
        <input className="inp" type="month" value={month} onChange={e => setMonth(e.target.value)} style={{flex:1,maxWidth:180,textAlign:"center"}} />
        <button className="btn btn-secondary btn-xs" onClick={nextMonth}>▶</button>
        {canManageAll(currentUser.role) && (
          <select className="sel" value={filterTeacher} onChange={e => setFilterTeacher(e.target.value)} style={{flex:1,maxWidth:160}}>
            <option value="all">전체</option>
            {teachers.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
          </select>
        )}
      </div>
      {/* 탭 전환 */}
      {canManageAll(currentUser.role) && (
        <div className="ftabs" style={{marginBottom:8}}>
          <button className={`ftab${activeTab==="payments"?" active":""}`}
            onClick={() => setActiveTab("payments")}>수납 관리</button>
          <button className={`ftab${activeTab==="unmatched"?" active":""}`}
            onClick={() => setActiveTab("unmatched")}>
            미매칭 입금
            {unmatchedPayments.filter(u => !u.matchedAt).length > 0 && (
              <span className="unmatched-badge">
                {unmatchedPayments.filter(u => !u.matchedAt).length}
              </span>
            )}
          </button>
          <button className={`ftab${activeTab==="log"?" active":""}`}
            onClick={() => setActiveTab("log")}>
            입금 내역
            {paymentLog.length > 0 && (
              <span className="unmatched-badge" style={{background:"var(--ink-30)"}}>
                {paymentLog.length}
              </span>
            )}
          </button>
          <button className={`ftab${activeTab==="instantCharges"?" active":""}`}
            onClick={() => setActiveTab("instantCharges")}>
            즉시청구
            {pendingInstantCount > 0 && <span style={{marginLeft:4,background:"var(--blue)",color:"#fff",borderRadius:99,padding:"0 5px",fontSize:10,fontWeight:700}}>{pendingInstantCount}</span>}
          </button>
          <button className={`ftab${activeTab === "discounts" ? " active" : ""}`}
            onClick={() => setActiveTab("discounts")}>
            할인 관리
          </button>
        </div>
      )}
      {activeTab === "payments" && <>
      {/* 학생 검색 */}
      <div className="srch-wrap" style={{marginBottom:10}}>
        <span className="srch-icon">{IC.search}</span>
        <input className="srch-inp" placeholder="회원 이름 검색" value={searchQuery} onChange={e => setSearchQuery(e.target.value)} />
      </div>
      {/* 요약 카드 — 강사: 금액 숨김, 건수만 표시 */}
      <div className="pay-summary-grid">
        {isTeacher ? (<>
          <div className="pay-summary-card"><div className="pay-summary-num" style={{color:"var(--green)",fontSize:22}}>{visibleStudents.filter(s=>getPayment(s.id)?.paid).length}명</div><div className="pay-summary-label">입금 완료</div></div>
          <div className="pay-summary-card" style={{cursor:"pointer",outline:filterUnpaid?"2px solid var(--red)":""}} onClick={() => setFilterUnpaid(f=>!f)}><div className="pay-summary-num" style={{color:"var(--red)",fontSize:22}}>{unpaidCount}명</div><div className="pay-summary-label">미납</div></div>
          <div className="pay-summary-card"><div className="pay-summary-num" style={{color:"var(--ink)",fontSize:22}}>{visibleStudents.length}명</div><div className="pay-summary-label">전체</div></div>
        </>) : (<>
          <div className="pay-summary-card"><div className="pay-summary-num" style={{color:"var(--ink)"}}>{fmtMoney(totalDue)}</div><div className="pay-summary-label">총 수강료</div></div>
          <div className="pay-summary-card"><div className="pay-summary-num" style={{color:"var(--green)"}}>{fmtMoney(totalPaid)}</div><div className="pay-summary-label">입금 완료</div></div>
          <div className="pay-summary-card" style={{cursor:"pointer",outline:filterUnpaid?"2px solid var(--red)":""}} onClick={() => setFilterUnpaid(f=>!f)}><div className="pay-summary-num" style={{color:"var(--red)"}}>{unpaidCount}명</div><div className="pay-summary-label">미납</div></div>
        </>)}
      </div>
      {!isTeacher && visibleStudents.length > 0 && (
        <div className="pay-footer">
          <span className="pay-footer-label">이달 총 납부액</span>
          <span className="pay-footer-amount">{fmtMoney(totalPaid)}</span>
        </div>
      )}
      {/* 수납률 프로그레스 바 — 관리자/매니저 전용 */}
      {!isTeacher && visibleStudents.length > 0 && (
        <div style={{marginBottom:10,padding:"10px 14px",background:"#fff",borderRadius:10,border:"1px solid #F0F0F0"}}>
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:6}}>
            <span style={{fontSize:12,color:"var(--ink-60)"}}>수납률</span>
            <span style={{fontSize:13,fontWeight:700,color:paidCount===visibleStudents.length?"var(--green)":"var(--ink)"}}>{paidRate}%</span>
          </div>
          <div style={{height:6,borderRadius:3,background:"var(--border)",overflow:"hidden"}}>
            <div style={{height:"100%",borderRadius:3,background:"var(--green)",width:`${paidRate}%`,transition:"width .4s ease"}} />
          </div>
          <div style={{fontSize:11,color:"var(--ink-30)",marginTop:4}}>{paidCount}명 납부 / {visibleStudents.length}명 전체</div>
        </div>
      )}
      {visibleStudents.length === 0 ? (
        <div className="empty"><img src={knotLineSvg} style={{width:44,height:55,opacity:0.28,marginBottom:10}} alt="" /><div className="empty-txt">{filterUnpaid ? "미납 회원이 없습니다." : searchQuery ? "검색 결과가 없습니다." : "회원이 없습니다."}</div></div>
      ) : visibleStudents.map(s => {
        const p = getPayment(s.id);
        const totalAmt = p?.amount ?? autoFee(s);
        const feeResult = autoFeeResult(s);
        const isPaid = p?.paid && (p.paidAmount == null || (p.paidAmount||0) >= totalAmt);
        const isPartialPaid = p?.paid && p.paidAmount != null && (p.paidAmount||0) > 0 && (p.paidAmount||0) < totalAmt;
        const amt = totalAmt;
        const isInst = s.isInstitution;
        return (
          <div key={s.id} className="pay-row" onClick={() => openEdit(s)} style={isInst ? {background:"rgba(43,58,159,.02)"} : undefined}>
            {/* 1줄: 아바타 · 이름/상태 · 금액 */}
            <div className="pay-row-info">
              <Av photo={s.photo} name={s.name} size="av-sm" />
              <div style={{flex:1,minWidth:0}}>
                <div style={{fontSize:13.5,fontWeight:600,display:"flex",alignItems:"center",gap:4,overflow:"hidden"}}>
                  {isInst && <span style={{fontSize:9.5,padding:"1px 5px",background:"var(--blue-lt)",color:"var(--blue)",borderRadius:4,fontWeight:700,flexShrink:0}}>🏢</span>}
                  <span style={{whiteSpace:"nowrap",overflow:"hidden",textOverflow:"ellipsis"}}>{s.name}</span>
                </div>
                <div className={`pay-status ${isPaid ? "paid" : isPartialPaid ? "partial" : "unpaid"}`}>
                  {isPaid ? `✓ ${fmtDateShort(p.paidDate)} 입금` : isPartialPaid ? (isTeacher ? "부분납부" : `부분납부 · 잔액 ${fmtMoney(totalAmt - (p.paidAmount||0))}`) : "미납"}
                  {p?.method && isPaid ? ` · ${PAY_METHODS[p.method] || p.method}` : ""}
                </div>
              </div>
              {!isTeacher && (
                <div style={{ textAlign: "right" }}>
                  {feeResult.discountAmount > 0 && (p == null || p.amount > feeResult.total) ? (
                    <>
                      <div style={{ fontSize: 11, color: "var(--ink-30)", textDecoration: "line-through", lineHeight: 1.3 }}>
                        {fmtMoney(feeResult.original)}
                      </div>
                      <div className="pay-amount" style={{ color: isPaid ? "var(--green)" : isPartialPaid ? "var(--gold-dk)" : "var(--ink)" }}>
                        {fmtMoney(amt)}
                      </div>
                      <div style={{ fontSize: 9.5, background: "var(--blue-lt,#EFF6FF)", color: "var(--blue,#3B82F6)", borderRadius: 4, padding: "1px 5px", fontWeight: 600, marginTop: 1, display: "inline-block", whiteSpace: "nowrap" }}>
                        {feeResult.discountName}
                      </div>
                    </>
                  ) : (
                    <div className="pay-amount" style={{ color: isPaid ? "var(--green)" : isPartialPaid ? "var(--gold-dk)" : "var(--ink)" }}>
                      {fmtMoney(amt)}
                    </div>
                  )}
                </div>
              )}
            </div>
            {/* 2줄: 액션 버튼 + 수강료 입력 (관리자·매니저만) */}
            {canManageAll(currentUser.role) && !isInst && (
              <div className="pay-row-actions" onClick={e => e.stopPropagation()}>
                {!isPaid && (
                  <button
                    onClick={async (e) => {
                      e.stopPropagation();
                      if (quickPayingId) return;
                      setQuickPayingId(s.id);
                      const base = p?.amount ?? autoFee(s);
                      const record = { ...(p||{}), id: p?.id||uid(), studentId: s.id, month, amount: base, paid: true, paidAmount: base, paidDate: TODAY_STR, method: "transfer", note: p?.note||"", extraCharges: p?.extraCharges||[], createdAt: p?.createdAt||Date.now(), updatedAt: Date.now() };
                      const upd = p ? payments.map(pp => pp.id === p.id ? record : pp) : [...payments, record];
                      try { await onSavePayments(upd); onLog(`${s.name} 회원 ${monthLabel(month)} 수강료 입금 확인`); } catch {}
                      setQuickPayingId(null);
                    }}
                    style={{background:"var(--green)",color:"#fff",border:"none",borderRadius:8,padding:"5px 11px",fontSize:11,fontWeight:700,cursor:"pointer",fontFamily:"inherit",opacity:quickPayingId===s.id?0.5:1,transition:"opacity .1s",whiteSpace:"nowrap"}}
                  >
                    {quickPayingId === s.id ? "…" : "✓ 입금"}
                  </button>
                )}
              </div>
            )}
            {/* 기관 학생: 입금 버튼만 (수강료 입력창 없음) */}
            {canManageAll(currentUser.role) && isInst && !isPaid && (
              <div className="pay-row-actions" onClick={e => e.stopPropagation()}>
                <button
                  onClick={async (e) => {
                    e.stopPropagation();
                    if (quickPayingId) return;
                    setQuickPayingId(s.id);
                    const base = p?.amount ?? autoFee(s);
                    const record = { ...(p||{}), id: p?.id||uid(), studentId: s.id, month, amount: base, paid: true, paidAmount: base, paidDate: TODAY_STR, method: "transfer", note: p?.note||"", extraCharges: p?.extraCharges||[], createdAt: p?.createdAt||Date.now(), updatedAt: Date.now() };
                    const upd = p ? payments.map(pp => pp.id === p.id ? record : pp) : [...payments, record];
                    try { await onSavePayments(upd); onLog(`${s.name} 회원 ${monthLabel(month)} 수강료 입금 확인`); } catch {}
                    setQuickPayingId(null);
                  }}
                  style={{background:"var(--green)",color:"#fff",border:"none",borderRadius:8,padding:"5px 11px",fontSize:11,fontWeight:700,cursor:"pointer",fontFamily:"inherit",opacity:quickPayingId===s.id?0.5:1,transition:"opacity .1s",whiteSpace:"nowrap"}}
                >
                  {quickPayingId === s.id ? "…" : "✓ 입금"}
                </button>
              </div>
            )}
          </div>
        );
      })}
      </>}
      {activeTab === "unmatched" && canManageAll(currentUser.role) && (
        <UnmatchedPaymentsTab
          unmatchedPayments={unmatchedPayments}
          students={students}
          payments={payments}
          month={month}
          onSavePayments={onSavePayments}
          onSaveUnmatched={onSaveUnmatched}
          onLog={onLog}
          uid={uid}
          TODAY_STR={TODAY_STR}
          autoFee={autoFee}
        />
      )}
      {activeTab === "log" && canManageAll(currentUser.role) && (
        <PaymentLogTab
          paymentLog={paymentLog}
          students={students}
          onSavePaymentLog={onSavePaymentLog}
          onOpenStudentPayment={(sid) => { const st = students.find(s => s.id === sid); if (st) openEdit(st); }}
        />
      )}

      {activeTab === "instantCharges" && canManageAll(currentUser.role) && (
        <div>
          {(() => {
            const pending = instantCharges.filter(c => c.status === "pending");
            const approved = instantCharges.filter(c => c.status === "approved");
            const all = [...pending, ...approved];
            if (all.length === 0) return (
              <div className="empty" style={{paddingTop:40}}>
                <div className="empty-txt">처리 대기 중인 즉시 청구가 없습니다.</div>
              </div>
            );
            return all.map(charge => {
              const student = students.find(s => s.id === charge.studentId);
              const teacher = teachers.find(t => t.id === charge.teacherId);
              const isPending = charge.status === "pending";
              const isApproved = charge.status === "approved";
              return (
                <div key={charge.id} className="card" style={{marginBottom:10,padding:14}}>
                  <div style={{display:"flex",alignItems:"flex-start",justifyContent:"space-between",gap:8}}>
                    <div style={{flex:1}}>
                      <div style={{fontWeight:700,fontSize:13,marginBottom:2}}>
                        {student?.name || "알 수 없음"}
                        <span style={{marginLeft:6,fontSize:11,color:"var(--ink-60)",fontWeight:400}}>
                          {charge.itemCategory} — {charge.itemName}
                        </span>
                      </div>
                      <div style={{fontSize:12,color:"var(--ink-60)",marginBottom:4}}>
                        요청: {teacher?.name || "알 수 없음"} ·
                        {charge.amountPending ? " 금액 미정" : ` ${fmtMoney(charge.amount||0)}`} ·
                        재고 {charge.stockAvailable ? "있음" : "없음"}
                      </div>
                      {charge.note && <div style={{fontSize:11,color:"var(--ink-30)"}}>{charge.note}</div>}
                    </div>
                    <span style={{
                      fontSize:11,fontWeight:600,padding:"2px 8px",borderRadius:99,
                      background: isPending ? "var(--gold-lt)" : "rgba(34,197,94,0.1)",
                      color: isPending ? "var(--gold-dk)" : "var(--green)"
                    }}>
                      {isPending ? "승인 대기" : "승인됨"}
                    </span>
                  </div>
                  {isApproved && (
                    <div style={{marginTop:8,padding:"8px 10px",background:"rgba(59,130,246,0.08)",borderRadius:8,fontSize:12}}>
                      <div style={{marginBottom:6,color:"var(--ink-60)"}}>
                        승인 금액: <strong>{fmtMoney(charge.amount||0)}</strong>
                      </div>
                      <button className="btn btn-sm btn-secondary" style={{width:"100%"}}
                        onClick={async () => {
                          const studentName = student?.name || "회원";
                          const msg = `[RYE-K K-Culture Center]\n${studentName} 회원님, 추가 청구 안내드립니다.\n\n· ${charge.itemCategory} — ${charge.itemName}: ${fmtMoney(charge.amount||0)}\n\n· 카카오뱅크 3333-34-5220544\n  (예금주: 예케이케이컬처센터)\n입금 부탁드립니다. 감사합니다.`;
                          try { await navigator.clipboard.writeText(msg); } catch { const ta = document.createElement("textarea"); ta.value = msg; document.body.appendChild(ta); ta.select(); document.execCommand("copy"); document.body.removeChild(ta); }
                          setApproveInstantCopied(charge.id);
                          setTimeout(() => setApproveInstantCopied(null), 2500);
                        }}>
                        {approveInstantCopied === charge.id ? "✓ 복사됨" : "알림 메시지 복사"}
                      </button>
                      <button className="btn btn-sm btn-primary" style={{width:"100%",marginTop:6}}
                        disabled={confirmingPaymentId === charge.id}
                        onClick={async () => {
                          setConfirmingPaymentId(charge.id);
                          try {
                            await onConfirmInstantPayment(charge, student);
                          } finally {
                            setConfirmingPaymentId(null);
                          }
                        }}>
                        {confirmingPaymentId === charge.id ? "처리 중.." : "입금 확인"}
                      </button>
                    </div>
                  )}
                  {isPending && (
                    <div style={{marginTop:8}}>
                      {rejectInstantId === charge.id ? (
                        <div>
                          <input className="inp" style={{marginBottom:6}} value={rejectReason}
                            onChange={e => setRejectReason(e.target.value)} placeholder="거절 사유 입력" />
                          <div style={{display:"flex",gap:6}}>
                            <button className="btn btn-danger btn-sm" disabled={rejectSaving}
                              onClick={async () => {
                                setRejectSaving(true);
                                setRejectErr("");
                                try {
                                  await onRejectInstantCharge(charge.id, rejectReason.trim() || "사유 없음");
                                  setRejectInstantId(null);
                                  setRejectReason("");
                                } catch {
                                  setRejectErr("거절 처리 중 오류가 발생했습니다.");
                                } finally {
                                  setRejectSaving(false);
                                }
                              }}>
                              {rejectSaving ? "처리 중..." : "거절 확인"}
                            </button>
                            <button className="btn btn-secondary btn-sm" onClick={() => { setRejectInstantId(null); setRejectReason(""); setRejectErr(""); }}>취소</button>
                          </div>
                          {rejectErr && <div style={{fontSize:11.5,color:"var(--red)",marginTop:6}}>⚠ {rejectErr}</div>}
                        </div>
                      ) : (
                        <div style={{display:"flex",gap:6}}>
                          <button className="btn btn-sm" style={{flex:1,background:"rgba(34,197,94,0.1)",border:"1px solid var(--green)",color:"var(--green)",fontWeight:700}}
                            onClick={() => {
                              setApproveInstantModal(charge);
                              setApproveInstantAmount(charge.amountPending ? "" : String(charge.amount || ""));
                              setApproveInstantMsg("");
                              setApproveInstantErr("");
                            }}>
                            승인
                          </button>
                          <button className="btn btn-danger btn-sm" style={{flex:1}}
                            onClick={() => { setRejectInstantId(charge.id); setRejectReason(""); }}>
                            거절
                          </button>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            });
          })()}
        </div>
      )}

      {activeTab === "discounts" && canManageAll(currentUser.role) && (
        <DiscountTypeManager
          discountTypes={discountTypes}
          onSaveDiscountTypes={onSaveDiscountTypes}
          uid={uid}
        />
      )}

      {editingId && (() => {
        const s = visibleStudents.find(st => st.id === editingId) || students.find(st => st.id === editingId);
        const extraSum = (editForm.extraCharges || []).reduce((acc, x) => acc + (x.amount || 0), 0);
        const absenceCount = attendance.filter(a =>
          a.studentId === editForm.studentId &&
          (a.date || "").startsWith(prevMonthStr) &&
          a.status === "absent"
        ).length;
        return (
          <div className="mb" onClick={e => { if (e.target === e.currentTarget) { setEditSaveError(""); setEditingId(null); } }}>
            <div className="modal">
              <div className="modal-h">
                <h2>수강료 관리</h2>
                <button className="modal-close" onClick={() => { setEditSaveError(""); setEditingId(null); }}>{IC.x}</button>
              </div>
              <div className="modal-b">
                {editSaveError && (
                  <div style={{background:"var(--red-lt)",border:"1px solid rgba(232,40,28,.2)",borderRadius:8,padding:"10px 14px",marginBottom:12,fontSize:13,color:"var(--red)",display:"flex",alignItems:"center",gap:8}}>
                    <span style={{flexShrink:0}}>⚠</span><span>{editSaveError}</span>
                  </div>
                )}
                {(() => { const pt = s ? teachers.find(t=>t.id===s.teacherId) : null; return (
                  <div style={{display:"flex",alignItems:"center",gap:10,marginBottom:12}}>
                    <div style={{fontSize:15,fontWeight:600,flex:1}}>{s?.name} · {monthLabel(month)}</div>
                    <button className="btn btn-secondary btn-xs" onClick={()=>setPreviewStudent(s)} style={{gap:4}}>{IC.search} 회원 정보</button>
                  </div>
                );})()}

                {/* 강사에게 금액 숨김 */}
                {!isTeacher && (
                  <div className="fg">
                    <label className="fg-label">수강료{extraSum > 0 ? <span style={{fontWeight:400,color:"var(--ink-30)",marginLeft:4,textTransform:"none",letterSpacing:0}}>(기본 + 추가 청구 합계)</span> : ""}</label>
                    <div style={{position:"relative"}}>
                      <input className="inp" inputMode="numeric" value={editForm.amount ? editForm.amount.toLocaleString("ko-KR") : ""} onChange={e => {
                        const newTotal = parseInt(e.target.value.replace(/[^\d]/g,"")) || 0;
                        setEditForm(f => ({...f, amount: newTotal, baseAmount: Math.max(0, newTotal - (f.extraCharges||[]).reduce((s,x)=>s+(x.amount||0),0))}));
                      }} style={{paddingRight:30}} />
                      <span style={{position:"absolute",right:12,top:"50%",transform:"translateY(-50%)",fontSize:13,color:"var(--ink-30)",pointerEvents:"none"}}>원</span>
                    </div>
                    {absenceCount > 0 && (
                      <div style={{display:"flex",alignItems:"center",gap:8,marginTop:8,padding:"10px 14px",background:"var(--gold-lt)",border:"1.5px solid #F59E0B",borderRadius:10,fontSize:13,color:"var(--gold-dk)",fontWeight:600}}>
                        <span style={{fontSize:18,flexShrink:0}}>⚠️</span>
                        <span><strong>{prevMonthStr.replace("-", "년 ")}월</strong> 미보강 결석 <strong>{absenceCount}회</strong> — 수강료 수동 차감을 검토하세요.</span>
                      </div>
                    )}
                  </div>
                )}

                {/* 강사: 납부 상태만 읽기 전용 표시 */}
                {isTeacher && (() => {
                  const mPaid = editForm.paid && (editForm.paidAmount||0) >= editForm.amount;
                  const mPartial = editForm.paid && (editForm.paidAmount||0) > 0 && (editForm.paidAmount||0) < editForm.amount;
                  const bg = mPaid ? "var(--green-lt)" : mPartial ? "var(--gold-lt)" : "var(--red-lt)";
                  const bd = mPaid ? "rgba(26,122,64,.2)" : mPartial ? "rgba(245,158,11,.2)" : "rgba(232,40,28,.15)";
                  const color = mPaid ? "var(--green)" : mPartial ? "var(--gold-dk)" : "var(--red)";
                  const icon = mPaid ? "✅" : mPartial ? "⚠️" : "⏳";
                  const label = mPaid ? "입금 완료" : mPartial ? "부분납부" : "미납";
                  return (
                    <div style={{background:bg,border:`1px solid ${bd}`,borderRadius:10,padding:"14px 16px",marginBottom:14,display:"flex",alignItems:"center",gap:10}}>
                      <span style={{fontSize:22}}>{icon}</span>
                      <div>
                        <div style={{fontSize:14,fontWeight:600,color}}>{label}</div>
                        {editForm.paid && editForm.paidDate && <div style={{fontSize:12,color:"var(--ink-60)",marginTop:2}}>납부일: {fmtDate(editForm.paidDate)}</div>}
                      </div>
                    </div>
                  );
                })()}

                {canManageAll(currentUser.role) ? (
                  <>
                    <div className="fg" style={{display:"flex",alignItems:"center",gap:10,cursor:"pointer"}} onClick={() => setEditForm(f => ({...f, paid: !f.paid}))}>
                      <div style={{width:22,height:22,border:"1.5px solid var(--border)",borderRadius:6,display:"flex",alignItems:"center",justifyContent:"center",background:editForm.paid?"var(--green)":"var(--paper)",color:"#fff",fontSize:14,fontWeight:700,transition:"all .12s"}}>{editForm.paid && "✓"}</div>
                      <span style={{fontSize:14,fontWeight:500}}>입금 완료</span>
                    </div>
                    {editForm.paid && (
                      <>
                        <div className="fg-row">
                          <div className="fg"><label className="fg-label">입금액</label><div style={{position:"relative"}}><input className="inp" inputMode="numeric" value={editForm.paidAmount ? editForm.paidAmount.toLocaleString("ko-KR") : ""} onChange={e => setEditForm(f => ({...f, paidAmount: parseInt(e.target.value.replace(/[^\d]/g,"")) || 0}))} style={{paddingRight:30}} /><span style={{position:"absolute",right:12,top:"50%",transform:"translateY(-50%)",fontSize:13,color:"var(--ink-30)",pointerEvents:"none"}}>원</span></div></div>
                          <div className="fg"><label className="fg-label">입금일</label><input className="inp" type="date" value={editForm.paidDate} onChange={e => setEditForm(f => ({...f, paidDate: e.target.value}))} /></div>
                        </div>
                        <div className="fg">
                          <label className="fg-label">입금 방법</label>
                          <select className="sel" value={editForm.method} onChange={e => setEditForm(f => ({...f, method: e.target.value}))}>
                            <option value="transfer">계좌이체</option>
                            <option value="cash">현금</option>
                            <option value="card">카드</option>
                          </select>
                        </div>
                      </>
                    )}
                  </>
                ) : !isTeacher && (
                  <div style={{fontSize:12.5,color:"var(--ink-30)",background:"var(--ink-10)",padding:"10px 14px",borderRadius:8,marginBottom:14}}>💡 입금 확인은 매니저 이상만 가능합니다.</div>
                )}

                {/* 추가 청구 미수납 경고 */}
                {canManageAll(currentUser.role) && !isTeacher && editForm.paid && (editForm.paidAmount||0) > 0 && (editForm.paidAmount||0) < editForm.amount && (
                  <div style={{background:"var(--gold-lt)",border:"1px solid var(--gold)",borderRadius:8,padding:"10px 14px",marginBottom:10,fontSize:12.5,color:"var(--gold-dk)"}}>
                    ⚠ 추가 청구 {fmtMoney(editForm.amount - (editForm.paidAmount||0))}원 미수납 — 입금 확인 후 '입금액'을 업데이트하세요.
                  </div>
                )}

                {/* 추가 청구 항목 */}
                {canManageAll(currentUser.role) && !isTeacher && (
                  <div className="fg">
                    <label className="fg-label">추가 청구 항목</label>
                    {(editForm.extraCharges || []).map((ec, i) => (
                      <div key={i} style={{display:"flex",gap:6,alignItems:"center",marginBottom:6}}>
                        <input className="inp" value={ec.title} onChange={e => {
                          const upd = editForm.extraCharges.map((x,j) => j===i ? {...x,title:e.target.value} : x);
                          setEditForm(f => ({...f, extraCharges: upd, amount: f.baseAmount + upd.reduce((sum,x)=>sum+(x.amount||0),0)}));
                        }} placeholder="항목명" style={{flex:2}} />
                        <div style={{position:"relative",flex:1}}>
                          <input className="inp" inputMode="numeric" value={ec.amount ? ec.amount.toLocaleString("ko-KR") : ""} onChange={e => {
                            const amt = parseInt(e.target.value.replace(/[^\d]/g,"")) || 0;
                            const upd = editForm.extraCharges.map((x,j) => j===i ? {...x,amount:amt} : x);
                            setEditForm(f => ({...f, extraCharges: upd, amount: f.baseAmount + upd.reduce((sum,x)=>sum+(x.amount||0),0)}));
                          }} style={{paddingRight:22}} />
                          <span style={{position:"absolute",right:8,top:"50%",transform:"translateY(-50%)",fontSize:11,color:"var(--ink-30)"}}>원</span>
                        </div>
                        <button onClick={() => {
                          const upd = editForm.extraCharges.filter((_,j)=>j!==i);
                          setEditForm(f => ({...f, extraCharges: upd, amount: f.baseAmount + upd.reduce((sum,x)=>sum+(x.amount||0),0)}));
                        }} style={{background:"none",border:"none",color:"var(--red)",fontSize:16,cursor:"pointer",padding:"0 4px",flexShrink:0}}>×</button>
                      </div>
                    ))}
                    <div style={{display:"flex",gap:6,alignItems:"center",marginTop:4}}>
                      <input className="inp" value={editForm.newChargeTitle||""} onChange={e => setEditForm(f=>({...f,newChargeTitle:e.target.value}))} placeholder="항목명 (예: 교재비)" style={{flex:2}} />
                      <div style={{position:"relative",flex:1}}>
                        <input className="inp" inputMode="numeric" value={editForm.newChargeAmount||""} onChange={e => setEditForm(f=>({...f,newChargeAmount:e.target.value.replace(/[^\d]/g,"")}))} style={{paddingRight:22}} placeholder="0" />
                        <span style={{position:"absolute",right:8,top:"50%",transform:"translateY(-50%)",fontSize:11,color:"var(--ink-30)"}}>원</span>
                      </div>
                      <button onClick={() => {
                        const title = (editForm.newChargeTitle||"").trim();
                        const amount = parseInt(editForm.newChargeAmount) || 0;
                        if (!title) return;
                        const upd = [...(editForm.extraCharges||[]), {title, amount}];
                        setEditForm(f => ({...f, extraCharges: upd, amount: f.baseAmount + upd.reduce((sum,x)=>sum+(x.amount||0),0), newChargeTitle: "", newChargeAmount: ""}));
                      }} className="btn btn-secondary btn-sm" style={{flexShrink:0}}>+ 추가</button>
                    </div>
                  </div>
                )}

                {/* 과목별 수강료 breakdown — lessons[].fee 있을 때만 표시 */}
                {canManageAll(currentUser.role) && !isTeacher && s && (s.lessons || []).some(l => l.fee > 0) && (
                  <div style={{ background: "var(--blue-lt)", border: "1px solid rgba(43,58,159,.15)", borderRadius: 8, padding: "8px 12px", marginBottom: 8, fontSize: 12 }}>
                    <div style={{ fontWeight: 600, color: "var(--blue)", marginBottom: 4, fontSize: 11 }}>과목별 수강료</div>
                    {(s.lessons || []).map(l => (
                      <div key={l.instrument} style={{ display: "flex", justifyContent: "space-between", color: "var(--ink-60)", marginBottom: 2 }}>
                        <span>{l.instrument}</span>
                        <span>{l.fee > 0 ? fmtMoney(l.fee) : <span style={{ color: "var(--ink-30)" }}>미설정</span>}</span>
                      </div>
                    ))}
                    {s.instrumentRental && (
                      <div style={{ display: "flex", justifyContent: "space-between", color: "var(--ink-60)", marginBottom: 2 }}>
                        <span>악기 대여료</span>
                        <span>{fmtMoney(s.rentalFee || 0)}</span>
                      </div>
                    )}
                  </div>
                )}
                {/* 할인 브레이크다운 — 자동계산 수강료 + 할인 적용 시만 표시 (DIS-07) */}
                {canManageAll(currentUser.role) && !isTeacher && !s?.isInstitution && (() => {
                  if (editForm.amount && getPayment(s?.id)?.amount) return null; // 수동 입력 금액인 경우 표시 안 함
                  const feeRes = autoFeeResult(s);
                  if (!feeRes || feeRes.discountAmount <= 0) return null;
                  return (
                    <div style={{ background: "var(--blue-lt,#EFF6FF)", border: "1px solid rgba(59,130,246,.2)", borderRadius: 10, padding: "10px 14px", marginBottom: 8, fontSize: 12.5 }}>
                      <div style={{ fontWeight: 700, fontSize: 11, color: "var(--blue,#3B82F6)", marginBottom: 6, letterSpacing: .3 }}>할인 적용</div>
                      <div style={{ display: "flex", justifyContent: "space-between", color: "var(--ink-60)", marginBottom: 3 }}>
                        <span>원가</span><span>{fmtMoney(feeRes.original)}</span>
                      </div>
                      <div style={{ display: "flex", justifyContent: "space-between", color: "var(--blue,#3B82F6)", marginBottom: 3 }}>
                        <span>{feeRes.discountName}</span><span>-{fmtMoney(feeRes.discountAmount)}</span>
                      </div>
                      <div style={{ borderTop: "1px dashed rgba(59,130,246,.25)", paddingTop: 6, display: "flex", justifyContent: "space-between", fontWeight: 700, color: "var(--ink)", fontSize: 13 }}>
                        <span>할인 적용가</span><span>{fmtMoney(feeRes.total)}</span>
                      </div>
                    </div>
                  );
                })()}
                {/* 합계 브레이크다운 — 추가 청구 항목이 있을 때만 */}
                {canManageAll(currentUser.role) && !isTeacher && extraSum > 0 && (
                  <div style={{background:"var(--ink-5,#F8F8F8)",border:"1px solid var(--border)",borderRadius:10,padding:"10px 14px",marginBottom:8,fontSize:12.5}}>
                    <div style={{display:"flex",justifyContent:"space-between",color:"var(--ink-60)",marginBottom:4}}>
                      <span>기본 수강료</span><span>{fmtMoney(editForm.baseAmount ?? 0)}</span>
                    </div>
                    <div style={{display:"flex",justifyContent:"space-between",color:"var(--gold-dk)",marginBottom:6}}>
                      <span>추가 청구 합계</span><span>+ {fmtMoney(extraSum)}</span>
                    </div>
                    <div style={{borderTop:"1px dashed var(--border)",paddingTop:6,display:"flex",justifyContent:"space-between",fontWeight:700,color:"var(--ink)",fontSize:13.5}}>
                      <span>청구 합계</span><span>{fmtMoney(editForm.amount)}</span>
                    </div>
                  </div>
                )}
                {/* 이달 입금 현황 — 관리자/매니저 전용 */}
                {canManageAll(currentUser.role) && !isTeacher && (() => {
                  const totalCharge = editForm.amount || 0;
                  const totalPaid = editForm.paid ? (editForm.paidAmount ?? totalCharge) : 0;
                  const remaining = Math.max(0, totalCharge - totalPaid);
                  // 웹훅 자동매칭 로그 — 이 학생·이 달 항목
                  const logEntries = paymentLog.filter(e => {
                    if (!e.studentId || e.studentId !== editForm.studentId) return false;
                    if (!e.timestamp) return false;
                    const d = new Date(e.timestamp);
                    return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}` === month;
                  });
                  // 미매칭에서 수동 매칭된 항목 — matchedStudentId로 연결
                  const manualEntries = unmatchedPayments.filter(u => {
                    if (!u.matchedStudentId || u.matchedStudentId !== editForm.studentId) return false;
                    if (!u.matchedAt) return false;
                    if (!u.timestamp) return false;
                    const d = new Date(u.timestamp);
                    return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}` === month;
                  });
                  if (logEntries.length === 0 && manualEntries.length === 0 && !editForm.paid) return null;
                  return (
                    <div style={{background:"#F0FDF4",border:"1px solid #BBF7D0",borderRadius:10,padding:"10px 14px",marginBottom:8,fontSize:12}}>
                      <div style={{fontWeight:700,fontSize:11,color:"#15803D",marginBottom:6,letterSpacing:.3}}>{monthLabel(month)} 입금 현황</div>
                      {logEntries.map(e => (
                        <div key={e.id} style={{display:"flex",justifyContent:"space-between",alignItems:"center",color:"#166534",marginBottom:3,fontSize:11.5}}>
                          <span style={{display:"flex",alignItems:"center",gap:5}}>
                            <span style={{width:6,height:6,borderRadius:"50%",background:"#22C55E",display:"inline-block",flexShrink:0}} />
                            <span style={{color:"var(--ink-60)"}}>{e.timestamp ? new Date(e.timestamp).toLocaleDateString("ko-KR",{month:"numeric",day:"numeric"}) : ""}</span>
                            <span>{e.senderName || "입금"}</span>
                            <span style={{fontSize:10,color:"var(--ink-30)"}}>웹훅</span>
                          </span>
                          <span style={{fontWeight:600}}>+{(e.amount||0).toLocaleString("ko-KR")}원</span>
                        </div>
                      ))}
                      {manualEntries.map(e => (
                        <div key={e.id} style={{display:"flex",justifyContent:"space-between",alignItems:"center",color:"#166534",marginBottom:3,fontSize:11.5}}>
                          <span style={{display:"flex",alignItems:"center",gap:5}}>
                            <span style={{width:6,height:6,borderRadius:"50%",background:"#3B82F6",display:"inline-block",flexShrink:0}} />
                            <span style={{color:"var(--ink-60)"}}>{e.timestamp ? new Date(e.timestamp).toLocaleDateString("ko-KR",{month:"numeric",day:"numeric"}) : ""}</span>
                            <span>{e.senderName || "수동 매칭"}</span>
                            <span style={{fontSize:10,color:"var(--ink-30)"}}>수동</span>
                          </span>
                          <span style={{fontWeight:600}}>+{(e.amount||0).toLocaleString("ko-KR")}원</span>
                        </div>
                      ))}
                      <div style={{borderTop:"1px dashed #BBF7D0",paddingTop:6,marginTop:(logEntries.length+manualEntries.length)>0?4:0,display:"flex",justifyContent:"space-between",alignItems:"center"}}>
                        <div>
                          <div style={{fontSize:11.5,color:"#166534"}}>
                            입금 <span style={{fontWeight:700}}>{fmtMoney(totalPaid)}</span>
                            <span style={{color:"var(--ink-30)",margin:"0 4px"}}>/</span>
                            청구 <span style={{fontWeight:600,color:"var(--ink)"}}>{fmtMoney(totalCharge)}</span>
                          </div>
                          {remaining > 0 && (
                            <div style={{fontSize:11.5,color:"#B45309",fontWeight:600,marginTop:2}}>⚠ 미입금 잔액 {fmtMoney(remaining)}</div>
                          )}
                          {remaining === 0 && editForm.paid && (
                            <div style={{fontSize:11.5,color:"#15803D",fontWeight:600,marginTop:2}}>✓ 완납</div>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })()}
                <div className="fg"><label className="fg-label">메모</label><input className="inp" value={editForm.note} onChange={e => setEditForm(f => ({...f, note: e.target.value}))} placeholder="비고" /></div>
                {isTeacher && (
                  <div style={{borderTop:"1px dashed var(--border)",paddingTop:10,marginTop:4}}>
                    <button className="btn btn-sm" style={{width:"100%",background:"var(--blue-lt)",color:"var(--blue)",border:"1px solid var(--blue)"}}
                      onClick={(e) => {
                        e.stopPropagation();
                        setInstantReqForm({ category: shopItems?.categories?.[0] || "기타", itemName: "", amount: "", amountPending: false, stockAvailable: true, note: "" });
                        setInstantReqModal(s);
                      }}>
                      즉시 청구 요청
                    </button>
                  </div>
                )}
              </div>
              <div className="modal-f">
                <button className="btn btn-secondary" onClick={() => { setEditSaveError(""); setEditingId(null); }} disabled={saveEditSaving}>취소</button>
                <button className="btn btn-primary" onClick={saveEdit} disabled={saveEditSaving}>{saveEditSaving ? "저장 중…" : "저장"}</button>
              </div>
            </div>
          </div>
        );
      })()}

      {/* Student info preview popup */}
      {previewStudent && (
        <div className="mb" onClick={e => e.target === e.currentTarget && setPreviewStudent(null)}>
          <div className="modal" style={{maxWidth:420}}>
            <div className="modal-h"><h2>회원 정보</h2><button className="modal-close" onClick={() => setPreviewStudent(null)}>{IC.x}</button></div>
            <div className="det-head">
              <Av photo={previewStudent.photo} name={previewStudent.name} size="av-lg" />
              <div style={{flex:1}}>
                <div className="det-name">{previewStudent.name}</div>
                {previewStudent.studentCode && <div style={{fontSize:11,color:"var(--ink-30)",marginBottom:4,fontFamily:"monospace"}}>{previewStudent.studentCode}</div>}
                <div style={{display:"flex",flexWrap:"wrap",gap:4}}>
                  {previewStudent.isInstitution ? (
                    <span className="tag" style={{background:"var(--blue-lt)",color:"var(--blue)"}}>🏢 {instTypeLabel(previewStudent.type)}</span>
                  ) : (
                    <span className={`tag ${isMinor(previewStudent.birthDate) ? "tag-minor" : "tag-adult"}`}>{isMinor(previewStudent.birthDate) ? "미성년자" : "성인"}{calcAge(previewStudent.birthDate) !== null ? ` · ${calcAge(previewStudent.birthDate)}세` : ""}</span>
                  )}
                  {(() => { const t = teachers.find(t=>t.id===previewStudent.teacherId); return t ? <span className="tag tag-gold">{t.name} 강사</span> : null; })()}
                </div>
              </div>
            </div>
            <div className="info-grid">
              <div className="ii"><div className="ii-label">생년월일</div><div className="ii-val">{previewStudent.isInstitution ? "-" : fmtDate(previewStudent.birthDate)}</div></div>
              {(previewStudent.isInstitution || !isTeacher) && <div className="ii"><div className="ii-label">{previewStudent.isInstitution ? "담당자 연락처" : "연락처"}</div><div className="ii-val">{previewStudent.phone || "-"}</div></div>}
              {(previewStudent.isInstitution || !isTeacher) && <div className="ii"><div className="ii-label">{previewStudent.isInstitution ? "담당자명" : "보호자"}</div><div className="ii-val">{previewStudent.isInstitution ? (previewStudent.contactName || "-") : (previewStudent.guardianPhone || "-")}</div></div>}
              {!isTeacher && <div className="ii"><div className="ii-label">월 수강료</div><div className="ii-val">{fmtMoney(previewStudent.monthlyFee)}</div></div>}
              {previewStudent.isInstitution && previewStudent.bizNumber && <div className="ii"><div className="ii-label">사업자번호</div><div className="ii-val">{previewStudent.bizNumber}</div></div>}
              {previewStudent.isInstitution && previewStudent.contactEmail && <div className="ii"><div className="ii-label">담당자 이메일</div><div className="ii-val" style={{fontSize:11}}>{previewStudent.contactEmail}</div></div>}
            </div>
            {(previewStudent.lessons||[]).length > 0 && <div style={{padding:"8px 20px"}}><div style={{fontSize:12,color:"var(--blue)",fontWeight:500}}>{(previewStudent.lessons||[]).map(l=>l.instrument).join(" · ")}</div></div>}
            {previewStudent.notes && <div style={{padding:"4px 20px 12px"}}><div style={{fontSize:12,color:"var(--ink-60)"}}>{previewStudent.notes}</div></div>}
            <div className="modal-f"><button className="btn btn-secondary" onClick={() => setPreviewStudent(null)}>닫기</button></div>
          </div>
        </div>
      )}
      {/* ── 수강료 일괄 알림톡 모달 ── */}
      {alimtalkModal && (
        <AlimtalkModal
          type={alimtalkModal}
          students={visibleStudents}
          month={month}
          getPayment={getPayment}
          onClose={() => setAlimtalkModal(null)}
          onSend={async (type, targets, options) => {
            try {
              const result = await sendAligoMessage(type, targets, options);
              const noPhoneMsg = result.noPhone?.length ? ` (전화번호 없음: ${result.noPhone.join(", ")})` : "";
              onLog(`알림톡 ${result.sent}명 발송 완료${noPhoneMsg}`);
              setAlimtalkModal(null);
            } catch (e) {
              onLog(`알림톡 발송 실패: ${e.message}`);
              throw e;
            }
          }}
        />
      )}

      {/* ── 수강료 일괄 확정 모달 ── */}
      {bulkPrepModal && (() => {
        const allActive = students.filter(s => (s.status||"active")==="active" && !s.isInstitution);
        const zeroCount = allActive.filter(s => (bulkPrepData[s.id]?.amount ?? 0) === 0).length;
        return (
          <div style={{position:"fixed",top:0,left:0,width:"100vw",height:"100vh",zIndex:10000,display:"flex",alignItems:"center",justifyContent:"center",background:"rgba(0,0,0,.5)"}} onClick={e => e.target===e.currentTarget && !bulkSaving && setBulkPrepModal(false)}>
            <div style={{width:"96%",maxWidth:560,height:"90vh",background:"var(--paper)",borderRadius:16,boxShadow:"0 8px 40px rgba(0,0,0,.18)",display:"flex",flexDirection:"column",overflow:"hidden"}}>
              <div className="modal-h">
                <h2>📋 {monthLabel(month)} 수강료 확정</h2>
                <button className="modal-close" onClick={() => setBulkPrepModal(false)} disabled={bulkSaving}>{IC.x}</button>
              </div>
              {/* 요약 배너 */}
              <div style={{padding:"8px 16px",background:"var(--bg)",borderBottom:"1px solid var(--border)",fontSize:12,color:"var(--ink-60)",display:"flex",gap:12,alignItems:"center"}}>
                <span>재원생 <strong>{allActive.length}명</strong></span>
                {zeroCount > 0
                  ? <span style={{color:"var(--red)",fontWeight:600}}>⚠ 0원 {zeroCount}명 — 확인 필요</span>
                  : <span style={{color:"var(--green)",fontWeight:600}}>✓ 전원 수강료 입력됨</span>}
              </div>
              {/* 회원 리스트 */}
              <div style={{flex:1,overflowY:"auto"}}>
                {allActive.map(s => {
                  const d = bulkPrepData[s.id] || {amount:0,extras:[],newTitle:"",newAmt:""};
                  const t = teachers.find(t=>t.id===s.teacherId);
                  const refAmt = autoFee(s);
                  const isZero = d.amount === 0;
                  return (
                    <div key={s.id} style={{padding:"10px 14px",borderBottom:"1px solid var(--border)",background:isZero?"var(--red-lt)":"transparent"}}>
                      <div style={{display:"flex",alignItems:"center",gap:8}}>
                        <Av photo={s.photo} name={s.name} size="av-sm" />
                        <div style={{flex:1,minWidth:0}}>
                          <div style={{fontSize:13,fontWeight:600,display:"flex",alignItems:"center",gap:4,overflow:"hidden"}}>
                            <span style={{whiteSpace:"nowrap",overflow:"hidden",textOverflow:"ellipsis"}}>{s.name}</span>
                            {s.instrumentRental && <span style={{fontSize:9,background:"var(--blue-lt)",color:"var(--blue)",borderRadius:4,padding:"1px 5px",fontWeight:700,flexShrink:0}}>대여</span>}
                          </div>
                          <div style={{fontSize:10.5,color:"var(--ink-30)"}}>{t ? `${t.name} 강사` : ""}{refAmt>0 ? ` · 기준 ${fmtMoney(refAmt)}` : ""}</div>
                        </div>
                        {/* 이달 청구 금액 */}
                        <div style={{position:"relative",width:108,flexShrink:0}}>
                          <input className="inp" inputMode="numeric"
                            value={d.amount ? d.amount.toLocaleString("ko-KR") : ""}
                            onChange={e => setBulkField(s.id,"amount",parseInt(e.target.value.replace(/[^\d]/g,""))||0)}
                            style={{paddingRight:22,fontSize:13,height:34,borderColor:isZero?"var(--red)":undefined}}
                          />
                          <span style={{position:"absolute",right:7,top:"50%",transform:"translateY(-50%)",fontSize:11,color:"var(--ink-30)",pointerEvents:"none"}}>원</span>
                        </div>
                      </div>
                      {/* 추가 항목 chips */}
                      {d.extras.length > 0 && (
                        <div style={{display:"flex",gap:4,flexWrap:"wrap",marginTop:5,paddingLeft:32}}>
                          {d.extras.map((ex,i) => (
                            <span key={i} style={{fontSize:11,background:"var(--gold-lt)",border:"1px solid var(--gold)",borderRadius:6,padding:"2px 7px",color:"var(--gold-dk)",display:"inline-flex",alignItems:"center",gap:3}}>
                              {ex.title} {fmtMoney(ex.amount)}
                              <button onClick={() => removeBulkExtra(s.id,i)} style={{background:"none",border:"none",color:"var(--red)",fontSize:13,cursor:"pointer",padding:0,lineHeight:1,marginLeft:1}}>×</button>
                            </span>
                          ))}
                        </div>
                      )}
                      {/* 추가 항목 입력 */}
                      <div style={{display:"flex",gap:4,alignItems:"center",marginTop:5,paddingLeft:32}}>
                        <input className="inp" placeholder="항목명" value={d.newTitle||""} onChange={e => setBulkField(s.id,"newTitle",e.target.value)} style={{flex:2,height:30,fontSize:11}} />
                        <div style={{position:"relative",flex:1}}>
                          <input className="inp" inputMode="numeric" placeholder="0" value={d.newAmt||""} onChange={e => setBulkField(s.id,"newAmt",e.target.value.replace(/[^\d]/g,""))} style={{paddingRight:14,height:30,fontSize:11}} />
                          <span style={{position:"absolute",right:5,top:"50%",transform:"translateY(-50%)",fontSize:10,color:"var(--ink-30)",pointerEvents:"none"}}>원</span>
                        </div>
                        <button onClick={() => addBulkExtra(s.id)} className="btn btn-secondary btn-xs" style={{flexShrink:0,height:30}}>+추가</button>
                      </div>
                    </div>
                  );
                })}
              </div>
              <div className="modal-f" style={{flexDirection:"column",gap:8,alignItems:"stretch"}}>
                {bulkErr && <div style={{fontSize:12.5,color:"var(--red)",background:"var(--red-lt)",border:"1px solid rgba(232,40,28,.2)",borderRadius:7,padding:"8px 12px"}}>⚠ {bulkErr}</div>}
                <div style={{display:"flex",gap:8,justifyContent:"flex-end"}}>
                  <button className="btn btn-secondary" onClick={() => { setBulkPrepModal(false); setBulkErr(""); }} disabled={bulkSaving}>취소</button>
                  <button className="btn btn-primary" onClick={confirmBulkPrep} disabled={bulkSaving}>
                    {bulkSaving ? <><span className="spinner-sm"/> 저장 중…</> : `${allActive.length}명 수강료 확정`}
                  </button>
                </div>
              </div>
            </div>
          </div>
        );
      })()}

      {/* ── 기관 청구 일괄 확정 모달 ── */}
      {bulkInstModal && (() => {
        const instActive = students.filter(s => s.isInstitution && (s.status||"active")==="active");
        const zeroCount = instActive.filter(s => (bulkInstData[s.id]?.amount ?? 0) === 0).length;
        return (
          <div style={{position:"fixed",top:0,left:0,width:"100vw",height:"100vh",zIndex:10000,display:"flex",alignItems:"center",justifyContent:"center",background:"rgba(0,0,0,.5)"}} onClick={e => e.target===e.currentTarget && !bulkInstSaving && setBulkInstModal(false)}>
            <div style={{width:"96%",maxWidth:560,height:"90vh",background:"var(--paper)",borderRadius:16,boxShadow:"0 8px 40px rgba(0,0,0,.18)",display:"flex",flexDirection:"column",overflow:"hidden"}}>
              <div className="modal-h">
                <h2>🏢 {monthLabel(month)} 기관 청구 확정</h2>
                <button className="modal-close" onClick={() => setBulkInstModal(false)} disabled={bulkInstSaving}>{IC.x}</button>
              </div>
              <div style={{padding:"8px 16px",background:"var(--bg)",borderBottom:"1px solid var(--border)",fontSize:12,color:"var(--ink-60)",display:"flex",gap:12,alignItems:"center"}}>
                <span>기관반 <strong>{instActive.length}개</strong></span>
                {zeroCount > 0
                  ? <span style={{color:"var(--red)",fontWeight:600}}>⚠ 0원 {zeroCount}개 — 확인 필요</span>
                  : <span style={{color:"var(--green)",fontWeight:600}}>✓ 전체 청구액 입력됨</span>}
              </div>
              <div style={{flex:1,overflowY:"auto"}}>
                {instActive.map(s => {
                  const d = bulkInstData[s.id] || { amount: 0 };
                  const isZero = d.amount === 0;
                  return (
                    <div key={s.id} style={{padding:"10px 14px",borderBottom:"1px solid var(--border)",background:isZero?"var(--red-lt)":"transparent",display:"flex",alignItems:"center",gap:10}}>
                      <Av photo={s.photo} name={s.name} size="av-sm" />
                      <div style={{flex:1,minWidth:0}}>
                        <div style={{fontSize:13,fontWeight:600,whiteSpace:"nowrap",overflow:"hidden",textOverflow:"ellipsis"}}>{s.name}</div>
                        <div style={{fontSize:10.5,color:"var(--ink-30)"}}>참여 {s.participantCount || 0}명</div>
                      </div>
                      <div style={{position:"relative",width:108,flexShrink:0}}>
                        <input className="inp" inputMode="numeric"
                          value={d.amount ? d.amount.toLocaleString("ko-KR") : ""}
                          onChange={e => setBulkInstData(data => ({...data, [s.id]: {...(data[s.id]||{}), amount: parseInt(e.target.value.replace(/[^\d]/g,""))||0}}))}
                          style={{paddingRight:22,fontSize:13,height:34,borderColor:isZero?"var(--red)":undefined}}
                        />
                        <span style={{position:"absolute",right:7,top:"50%",transform:"translateY(-50%)",fontSize:11,color:"var(--ink-30)",pointerEvents:"none"}}>원</span>
                      </div>
                    </div>
                  );
                })}
              </div>
              <div className="modal-f" style={{flexDirection:"column",gap:8,alignItems:"stretch"}}>
                {bulkInstErr && <div style={{fontSize:12.5,color:"var(--red)",background:"var(--red-lt)",border:"1px solid rgba(232,40,28,.2)",borderRadius:7,padding:"8px 12px"}}>⚠ {bulkInstErr}</div>}
                <div style={{display:"flex",gap:8,justifyContent:"flex-end"}}>
                  <button className="btn btn-secondary" onClick={() => { setBulkInstModal(false); setBulkInstErr(""); }} disabled={bulkInstSaving}>취소</button>
                  <button className="btn btn-primary" onClick={confirmBulkInstPrep} disabled={bulkInstSaving}>
                    {bulkInstSaving ? <><span className="spinner-sm"/> 저장 중…</> : `${instActive.length}개 청구 확정`}
                  </button>
                </div>
              </div>
            </div>
          </div>
        );
      })()}

      {/* ── 즉시청구 승인 모달 (관리자용) ── */}
      {approveInstantModal && (
        <div className="mb" onClick={e => e.target === e.currentTarget && !approveInstantSaving && setApproveInstantModal(null)}>
          <div className="modal" style={{maxWidth:480}}>
            <div className="modal-h">
              <h2>즉시 청구 승인</h2>
              <button className="modal-close" onClick={() => !approveInstantSaving && setApproveInstantModal(null)}>{IC.x}</button>
            </div>
            <div className="modal-b">
              {(() => {
                const student = students.find(s => s.id === approveInstantModal.studentId);
                return (
                  <>
                    <div style={{marginBottom:12,padding:"10px 14px",background:"rgba(59,130,246,0.08)",borderRadius:8,fontSize:13}}>
                      <div style={{fontWeight:600,marginBottom:2}}>{student?.name || "알 수 없음"}</div>
                      <div style={{color:"var(--ink-60)"}}>{approveInstantModal.itemCategory} — {approveInstantModal.itemName}</div>
                      <div style={{marginTop:6}}>
                        <span style={{
                          display:"inline-block",padding:"1px 9px",borderRadius:99,fontSize:11,fontWeight:600,
                          background: approveInstantModal.stockAvailable ? "rgba(34,197,94,0.15)" : "rgba(239,68,68,0.12)",
                          color: approveInstantModal.stockAvailable ? "#15803d" : "#dc2626"
                        }}>
                          재고 {approveInstantModal.stockAvailable ? "있음" : "없음"}
                        </span>
                        {!approveInstantModal.stockAvailable && (
                          <span style={{marginLeft:8,fontSize:11,color:"var(--red)"}}>→ 매니저에게 재고 신청 필요</span>
                        )}
                      </div>
                      {approveInstantModal.note && <div style={{fontSize:12,color:"var(--ink-30)",marginTop:4}}>{approveInstantModal.note}</div>}
                    </div>
                    <div className="fg">
                      <label className="fg-label">
                        승인 금액 (원)
                        {approveInstantModal.amountPending && <span style={{marginLeft:6,fontSize:11,color:"var(--red)"}}>* 금액 미정 — 필수 입력</span>}
                      </label>
                      <input className="inp" type="text" inputMode="numeric"
                        value={approveInstantAmount ? parseInt(approveInstantAmount || "0", 10).toLocaleString("ko-KR") : ""}
                        onChange={e => setApproveInstantAmount(e.target.value.replace(/[^\d]/g, ""))}
                        placeholder="금액 입력" />
                    </div>
                    {approveInstantMsg && (
                      <div style={{marginTop:12,padding:"12px 14px",background:"var(--ink-5,#F8F8F8)",borderRadius:8,fontSize:12,lineHeight:1.7,whiteSpace:"pre-wrap",color:"var(--ink)"}}>
                        {approveInstantMsg}
                      </div>
                    )}
                    {approveInstantMsg && (
                      <div style={{display:"flex",gap:6,marginTop:8}}>
                        <button className="btn btn-secondary btn-sm" style={{flex:1}}
                          onClick={async () => {
                            try { await navigator.clipboard.writeText(approveInstantMsg); } catch { const ta = document.createElement("textarea"); ta.value = approveInstantMsg; document.body.appendChild(ta); ta.select(); document.execCommand("copy"); document.body.removeChild(ta); }
                            setApproveInstantCopied("modal");
                            setTimeout(() => setApproveInstantCopied(null), 2500);
                          }}>
                          {approveInstantCopied === "modal" ? "✓ 복사됨" : "메시지 복사"}
                        </button>
                        <button className="btn btn-primary btn-sm" style={{flex:1}}
                          onClick={async () => {
                            const student = students.find(s => s.id === approveInstantModal?.studentId);
                            if (!student) return;
                            const amt = parseInt(approveInstantAmount, 10);
                            const itemLabel = approveInstantModal.itemName
                              ? `${approveInstantModal.itemCategory} — ${approveInstantModal.itemName}`
                              : approveInstantModal.itemCategory;
                            try {
                              await sendAligoMessage("charge_request", [{ ...student, amount: amt }], { itemName: itemLabel });
                              setApproveInstantCopied("alim");
                              setTimeout(() => setApproveInstantCopied(null), 2500);
                            } catch (e) { setApproveInstantErr(`알림톡 발송 실패: ${e.message}`); setTimeout(() => setApproveInstantErr(""), 4000); }
                          }}>
                          {approveInstantCopied === "alim" ? "✓ 발송됨" : "💬 알림톡 발송"}
                        </button>
                      </div>
                    )}
                  </>
                );
              })()}
            </div>
            <div className="modal-f">
              <button className="btn btn-secondary" onClick={() => setApproveInstantModal(null)} disabled={approveInstantSaving}>닫기</button>
              <button className="btn btn-primary" disabled={approveInstantSaving}
                onClick={async () => {
                  const finalAmount = parseInt(approveInstantAmount);
                  if (!finalAmount || finalAmount <= 0) {
                    setApproveInstantErr("금액을 입력하세요 (0원 불가)");
                    setTimeout(() => setApproveInstantErr(""), 2500);
                    return;
                  }
                  setApproveInstantSaving(true);
                  try {
                    await onApproveInstantCharge(approveInstantModal.id, finalAmount, currentUser.name || currentUser.id);
                    const student = students.find(s => s.id === approveInstantModal.studentId);
                    const msg = `[RYE-K K-Culture Center]\n${student?.name || "회원"} 회원님, 추가 청구 안내드립니다.\n\n· ${approveInstantModal.itemCategory} — ${approveInstantModal.itemName}: ${fmtMoney(finalAmount)}\n\n· 카카오뱅크 3333-34-5220544\n  (예금주: 예케이케이컬처센터)\n입금 부탁드립니다. 감사합니다.`;
                    setApproveInstantMsg(msg);
                  } catch (err) {
                    setApproveInstantErr(err?.message || "승인 처리에 실패했습니다. 다시 시도해주세요.");
                    setTimeout(() => setApproveInstantErr(""), 4000);
                  } finally {
                    setApproveInstantSaving(false);
                  }
                }}>
                {approveInstantSaving ? "처리 중..." : "승인"}
              </button>
            </div>
            {approveInstantErr && (
              <div style={{padding:"0 20px 12px"}}>
                <span style={{fontSize:12,color:"var(--red)",fontWeight:500}}>⚠ {approveInstantErr}</span>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── 강사 청구 요청 승인 모달 ── */}
      {/* ── 즉시 청구 요청 모달 (강사용) ── */}
      {instantReqModal && (
        <div className="mb" onClick={e => e.target === e.currentTarget && setInstantReqModal(null)}>
          <div className="modal" style={{maxWidth:480}}>
            <div className="modal-h">
              <h2>{instantReqModal.name} — 즉시 청구 요청</h2>
              <button className="modal-close" onClick={() => setInstantReqModal(null)}>{IC.x}</button>
            </div>
            <div className="modal-b">
              {instantReqErr && <div style={{marginBottom:10,padding:"10px 14px",background:"var(--red-lt)",border:"1px solid rgba(232,40,28,.2)",borderRadius:8,fontSize:13,color:"var(--red)",fontWeight:500}}>⚠ {instantReqErr}</div>}

              {/* 카테고리 칩 */}
              <div className="fg-label" style={{marginBottom:6}}>상품 유형</div>
              <div className="shop-chips">
                {(shopItems?.categories || ["의상/공연복","악세사리","악기 가방","기타"]).map(cat => (
                  <button key={cat} className={`shop-chip${instantReqForm.category === cat ? " active" : ""}`}
                    onClick={() => setInstantReqForm(f => ({ ...f, category: cat, itemName: "" }))}>
                    {cat}
                  </button>
                ))}
              </div>

              {/* 카탈로그 상품 선택 (해당 카테고리 활성 상품) */}
              {(() => {
                const catItems = (shopItems?.items || []).filter(i => i.category === instantReqForm.category && i.active !== false);
                if (catItems.length === 0) return null;
                return (
                  <>
                    <div className="fg-label" style={{marginBottom:6}}>카탈로그 선택 (선택사항)</div>
                    <div className="shop-item-grid" style={{marginBottom:12}}>
                      {catItems.map(item => (
                        <button key={item.id}
                          className={`shop-item-card${instantReqForm.itemName === item.name ? " selected" : ""}`}
                          onClick={() => setInstantReqForm(f => ({
                            ...f,
                            itemName: item.name,
                            amount: item.defaultPrice > 0 ? String(item.defaultPrice) : f.amount,
                            amountPending: item.defaultPrice <= 0,
                          }))}>
                          <div style={{fontWeight:600,marginBottom:2}}>{item.name}</div>
                          <div style={{color:"var(--ink-60)",fontSize:11}}>{item.defaultPrice > 0 ? fmtMoney(item.defaultPrice) : "가격 미정"}</div>
                        </button>
                      ))}
                    </div>
                  </>
                );
              })()}

              {/* 상품명 직접 입력 */}
              <div className="fg">
                <label className="fg-label">상품명</label>
                <input className="inp" value={instantReqForm.itemName}
                  onChange={e => setInstantReqForm(f => ({ ...f, itemName: e.target.value }))}
                  placeholder="상품명 입력 또는 위에서 선택" />
              </div>

              {/* 금액 */}
              <div className="fg">
                <label className="fg-label">금액 (원)</label>
                <input className="inp" inputMode="numeric"
                  value={instantReqForm.amountPending ? "" : (instantReqForm.amount ? Number(instantReqForm.amount).toLocaleString("ko-KR") : "")}
                  disabled={instantReqForm.amountPending}
                  onChange={e => setInstantReqForm(f => ({ ...f, amount: e.target.value.replace(/[^\d]/g, "") }))}
                  placeholder={instantReqForm.amountPending ? "금액 미정" : "금액 입력"} />
                <label style={{display:"flex",alignItems:"center",gap:6,marginTop:6,fontSize:12,color:"var(--ink-60)",cursor:"pointer"}}>
                  <input type="checkbox" checked={instantReqForm.amountPending}
                    onChange={e => setInstantReqForm(f => ({ ...f, amountPending: e.target.checked, amount: e.target.checked ? "" : f.amount }))} />
                  금액 미정 (관리자가 승인 시 입력)
                </label>
              </div>

              {/* 재고 여부 */}
              <div className="fg">
                <label className="fg-label">재고 여부</label>
                <div style={{display:"flex",gap:8}}>
                  <button className={`btn btn-sm${instantReqForm.stockAvailable ? " btn-primary" : " btn-secondary"}`}
                    onClick={() => setInstantReqForm(f => ({ ...f, stockAvailable: true }))}>
                    재고 있음
                  </button>
                  <button className={`btn btn-sm${!instantReqForm.stockAvailable ? " btn-danger" : " btn-secondary"}`}
                    onClick={() => setInstantReqForm(f => ({ ...f, stockAvailable: false }))}>
                    재고 없음
                  </button>
                </div>
              </div>

              {/* 메모 */}
              <div className="fg">
                <label className="fg-label">메모 (선택)</label>
                <input className="inp" value={instantReqForm.note}
                  onChange={e => setInstantReqForm(f => ({ ...f, note: e.target.value }))}
                  placeholder="추가 메모" />
              </div>
            </div>
            <div className="modal-f">
              <button className="btn btn-secondary" onClick={() => setInstantReqModal(null)} disabled={instantReqSaving}>취소</button>
              <button className="btn btn-primary" disabled={instantReqSaving}
                onClick={async () => {
                  const { category, itemName, amount, amountPending, stockAvailable, note } = instantReqForm;
                  if (!itemName.trim()) { setInstantReqErr("상품명을 입력하세요."); setTimeout(() => setInstantReqErr(""), 2500); return; }
                  if (!amountPending && (!amount || parseInt(amount) <= 0)) { setInstantReqErr("금액을 입력하거나 '금액 미정'을 선택하세요."); setTimeout(() => setInstantReqErr(""), 2500); return; }
                  if (!onAddInstantCharge) { setInstantReqErr("즉시 청구 기능을 사용할 수 없습니다."); setTimeout(() => setInstantReqErr(""), 2500); return; }
                  setInstantReqSaving(true);
                  try {
                    await onAddInstantCharge({
                      studentId: instantReqModal.id,
                      teacherId: currentUser.id,
                      itemCategory: category,
                      itemName: itemName.trim(),
                      amount: amountPending ? 0 : parseInt(amount),
                      amountPending,
                      stockAvailable,
                      status: "pending",
                      note: note.trim(),
                      approvedAt: null, approvedBy: null,
                      rejectedAt: null, rejectedReason: null,
                      paidAt: null, paymentId: null,
                    });
                    setInstantReqModal(null);
                  } catch {
                    setInstantReqErr("요청 전송에 실패했습니다. 다시 시도해주세요.");
                    setTimeout(() => setInstantReqErr(""), 3000);
                  } finally {
                    setInstantReqSaving(false);
                  }
                }}>
                {instantReqSaving ? "전송 중..." : "요청 전송"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function UnmatchedPaymentsTab({
  unmatchedPayments, students, payments, month,
  onSavePayments, onSaveUnmatched, onLog, uid, TODAY_STR, autoFee,
}) {
  const [matchingId, setMatchingId] = useState(null);
  const [selectedStudentId, setSelectedStudentId] = useState({});
  const [confirmId, setConfirmId] = useState(null);
  const [matchErr, setMatchErr] = useState("");
  const pending = unmatchedPayments.filter(u => !u.matchedAt);
  const matched = unmatchedPayments.filter(u => u.matchedAt);


  if (pending.length === 0 && matched.length === 0) {
    return (
      <div className="empty" style={{paddingTop:40}}>
        <div className="empty-txt">미매칭 입금 내역이 없습니다.</div>
        <div style={{fontSize:12,color:"var(--ink-30)",marginTop:6}}>
          카카오뱅크 Webhook이 자동 연결되면 미매칭 입금이 여기에 표시됩니다.
        </div>
      </div>
    );
  }

  const handleDismiss = async (id) => {
    const target = unmatchedPayments.find(u => u.id === id);
    const upd = unmatchedPayments.filter(u => u.id !== id);
    try {
      await onSaveUnmatched(upd);
      onLog(`미처리 입금 삭제 — ${target?.senderName || "알 수 없음"} ${(target?.amount || 0).toLocaleString()}원`);
    } catch {
      setMatchErr("삭제 중 오류가 발생했습니다. 새로고침 후 확인해주세요.");
    }
  };

  const handleMatch = async (unmatched) => {
    const sid = selectedStudentId[unmatched.id];
    if (!sid) return;
    const s = students.find(st => st.id === sid);
    if (!s) return;

    setMatchingId(unmatched.id);
    try {
      const existing = payments.find(p => p.studentId === sid && p.month === month);
      const isSplit = existing?.paid;
      const baseAmount = isSplit
        ? (existing.amount || 0)
        : (unmatched.amount || (autoFee ? autoFee(s) : (s.monthlyFee || 0)));
      const depositDate = unmatched.timestamp
        ? new Date(unmatched.timestamp + 9 * 60 * 60 * 1000).toISOString().slice(0, 10)
        : TODAY_STR;
      const newPaidAmount = isSplit
        ? (existing.paidAmount || 0) + (unmatched.amount || 0)
        : (unmatched.amount || baseAmount);
      const newNote = isSplit
        ? `${existing.note ? existing.note + " / " : ""}분할납부 추가 — ${unmatched.senderName} ${(unmatched.amount || 0).toLocaleString()}원 (${depositDate})`
        : `미매칭 수동 매칭 — 입금자: ${unmatched.senderName}`;
      const record = {
        ...(existing || {}),
        id: existing?.id || uid(),
        studentId: sid,
        month,
        amount: Math.max(baseAmount, newPaidAmount), // paidAmount > amount 역전 방지
        paid: true,
        paidAmount: newPaidAmount,
        paidDate: isSplit ? (existing.paidDate || depositDate) : depositDate,
        method: "transfer",
        note: newNote,
        extraCharges: existing?.extraCharges || [],
        createdAt: existing?.createdAt || Date.now(),
        updatedAt: Date.now(),
      };
      const updPayments = existing
        ? payments.map(p => p.id === existing.id ? record : p)
        : [...payments, record];
      const updUnmatched = unmatchedPayments.map(u =>
        u.id === unmatched.id
          ? { ...u, matchedAt: Date.now(), matchedStudentId: sid }
          : u
      );
      // 미매칭 먼저 업데이트: 실패 시 수납 미저장 → 재처리 가능, 이중 수납 방지
      await onSaveUnmatched(updUnmatched);
      await onSavePayments(updPayments);

      onLog(isSplit
        ? `분할납부 추가 처리 — ${unmatched.senderName} → ${s.name} +${(unmatched.amount || 0).toLocaleString()}원 (합계 ${newPaidAmount.toLocaleString()}원)`
        : `미매칭 입금 수동 매칭 완료 — ${unmatched.senderName} → ${s.name} ${(unmatched.amount || 0).toLocaleString()}원`);
      setSelectedStudentId(prev => { const n = { ...prev }; delete n[unmatched.id]; return n; });
    } catch (e) {
      onLog("미매칭 매칭 실패: " + e.message);
      setMatchErr("매칭 처리 중 오류가 발생했습니다. 다시 시도해주세요.");
    } finally {
      setMatchingId(null);
    }
  };

  return (
    <div>
      {matchErr && (
        <div style={{fontSize:12.5,color:"var(--red)",background:"var(--red-lt)",border:"1px solid rgba(232,40,28,.2)",borderRadius:8,padding:"10px 14px",marginBottom:12}}>
          ⚠ {matchErr}
        </div>
      )}
      {pending.length > 0 && (
        <>
          <div style={{fontSize:12,color:"var(--ink-60)",marginBottom:8,fontWeight:600}}>
            미처리 입금 {pending.length}건
          </div>
          {pending.map(u => (
            <div key={u.id} className="unmatched-card">
              <div style={{flex:1,minWidth:0}}>
                <div style={{display:"flex",alignItems:"center",gap:4,flexWrap:"wrap"}}>
                  <span style={{fontSize:13.5,fontWeight:700}}>{u.senderName || "알 수 없음"}</span>
                  {(u.confidence === "duplicate_exact" || u.confidence === "duplicate_fuzzy") && (
                    <span className="unmatched-badge" style={{background:"var(--orange,#f57c00)"}}>동명이인</span>
                  )}
                  {u.confidence === "duplicate_paid" && (
                    <span className="unmatched-badge">이중입금</span>
                  )}
                </div>
                <div style={{fontSize:12,color:"var(--green)",fontWeight:600}}>
                  {(u.amount || 0).toLocaleString()}원
                </div>
                <div style={{fontSize:11,color:"var(--ink-30)"}}>
                  {u.timestamp ? new Date(u.timestamp).toLocaleString("ko-KR", {month:"numeric",day:"numeric",hour:"2-digit",minute:"2-digit"}) : ""}
                </div>
                {u.rawText && (
                  <div style={{
                    fontSize: 11,
                    color: "var(--ink-40)",
                    background: "var(--ink-5, #f5f5f5)",
                    borderRadius: 6,
                    padding: "4px 8px",
                    marginTop: 4,
                    marginBottom: 6,
                    fontFamily: "monospace",
                    wordBreak: "break-all",
                    maxHeight: 48,
                    overflow: "hidden",
                  }}>
                    {u.rawText.slice(0, 120)}{u.rawText.length > 120 ? "…" : ""}
                  </div>
                )}
              </div>
              <div style={{display:"flex",flexDirection:"column",gap:6,width:148,flexShrink:0}}>
                {u.confidence === "amount_match" && u.suggestedStudentId && (
                  <div style={{
                    fontSize: 11,
                    color: "var(--blue, #1976d2)",
                    marginBottom: 4,
                    fontWeight: 600,
                  }}>
                    💡 금액 기반 추천: {students.find(s => s.id === u.suggestedStudentId)?.name || "알 수 없음"}
                  </div>
                )}
                <select
                  className="sel"
                  style={{fontSize:12}}
                  value={selectedStudentId[u.id] || ""}
                  onChange={e => setSelectedStudentId(prev => ({ ...prev, [u.id]: e.target.value }))}
                >
                  <option value="">학생 선택</option>
                  {students
                    .filter(s => !s.isInstitution && (s.status || "active") === "active")
                    .sort((a, b) => a.name.localeCompare(b.name, "ko"))
                    .map(s => (
                      <option key={s.id} value={s.id}>
                        {s.name}{u.suggestedStudentId === s.id && u.confidence === "amount_match" ? " (추천)" : ""}
                      </option>
                    ))
                  }
                </select>
                <button
                  className="btn btn-sm"
                  style={{
                    background: selectedStudentId[u.id] ? "var(--green)" : "var(--ink-10)",
                    color: selectedStudentId[u.id] ? "#fff" : "var(--ink-30)",
                    border: "none", opacity: matchingId === u.id ? 0.5 : 1,
                  }}
                  disabled={!selectedStudentId[u.id] || !!matchingId}
                  onClick={() => handleMatch(u)}
                >
                  {matchingId === u.id ? "처리 중…" : "✓ 수납 처리"}
                </button>
                {!selectedStudentId[u.id] && (
                  <div style={{fontSize:10,color:"var(--ink-30)",textAlign:"center",marginTop:2}}>회원 선택 후 처리</div>
                )}
                {confirmId === u.id ? (
                  <div style={{display:"flex",gap:4,alignItems:"center",marginTop:2}}>
                    <span style={{fontSize:10,color:"var(--red)"}}>삭제?</span>
                    <button className="btn btn-sm" style={{background:"var(--red)",color:"#fff",border:"none",fontSize:10,padding:"2px 8px"}} onClick={()=>{handleDismiss(u.id);setConfirmId(null);}}>확인</button>
                    <button className="btn btn-sm" style={{background:"var(--ink-10)",color:"var(--ink-60)",border:"none",fontSize:10,padding:"2px 8px"}} onClick={()=>setConfirmId(null)}>취소</button>
                  </div>
                ) : (
                  <button
                    className="btn btn-sm"
                    style={{background:"var(--ink-10)",color:"var(--red)",border:"none",fontSize:11,marginTop:2}}
                    disabled={!!matchingId}
                    onClick={() => setConfirmId(u.id)}
                  >× 삭제</button>
                )}
              </div>
            </div>
          ))}
        </>
      )}
      {matched.length > 0 && (
        <>
          <div style={{fontSize:12,color:"var(--ink-30)",margin:"16px 0 8px",fontWeight:600}}>
            처리 완료 {matched.length}건
          </div>
          {matched.map(u => {
            const s = students.find(st => st.id === u.matchedStudentId);
            return (
              <div key={u.id} className="unmatched-card" style={{opacity:0.6}}>
                <div style={{flex:1,minWidth:0}}>
                  <div style={{fontSize:13,fontWeight:600}}>{u.senderName || "알 수 없음"}</div>
                  <div style={{fontSize:11,color:"var(--ink-60)"}}>
                    {(u.amount || 0).toLocaleString()}원
                    {s ? ` → ${s.name}` : ""}
                  </div>
                </div>
                <div style={{display:"flex",flexDirection:"column",alignItems:"flex-end",gap:4}}>
                  <span style={{fontSize:11,color:"var(--green)",fontWeight:700}}>✓ 매칭 완료</span>
                  {confirmId === u.id ? (
                    <div style={{display:"flex",gap:4,alignItems:"center"}}>
                      <span style={{fontSize:10,color:"var(--red)"}}>삭제?</span>
                      <button className="btn btn-sm" style={{background:"var(--red)",color:"#fff",border:"none",fontSize:10,padding:"2px 6px"}} onClick={()=>{handleDismiss(u.id);setConfirmId(null);}}>확인</button>
                      <button className="btn btn-sm" style={{background:"var(--ink-10)",color:"var(--ink-60)",border:"none",fontSize:10,padding:"2px 6px"}} onClick={()=>setConfirmId(null)}>취소</button>
                    </div>
                  ) : (
                    <button className="btn btn-sm" style={{background:"var(--ink-10)",color:"var(--red)",border:"none",fontSize:10,padding:"2px 8px"}} onClick={() => setConfirmId(u.id)}>× 삭제</button>
                  )}
                </div>
              </div>
            );
          })}
        </>
      )}
    </div>
  );
}

function PaymentLogTab({ paymentLog, students, onSavePaymentLog, onOpenStudentPayment }) {
  const now = new Date();
  const [viewMonth, setViewMonth] = useState(`${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,"0")}`);
  const [copied, setCopied] = useState(false);
  const [confirmId, setConfirmId] = useState(null);
  const [matchFilter, setMatchFilter] = useState("all"); // "all" | "matched" | "unmatched"

  const changeMonth = (delta) => {
    const [y, m] = viewMonth.split("-").map(Number);
    const d = new Date(y, m - 1 + delta, 1);
    setViewMonth(`${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}`);
  };

  const filtered = paymentLog.filter(e => {
    if (!e.timestamp) return false;
    const d = new Date(e.timestamp);
    if (`${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}` !== viewMonth) return false;
    if (matchFilter === "matched" && !e.matched) return false;
    if (matchFilter === "unmatched" && e.matched) return false;
    return true;
  });
  const sorted = [...filtered].sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0));
  const totalAmount = sorted.reduce((s, e) => s + (e.amount || 0), 0);
  const matchedCount = sorted.filter(e => e.matched).length;

  // 학생별 그룹핑: 같은 학생이 여러 건 있을 때 시각적으로 묶기
  const buildGroups = () => {
    const byStudent = {};
    const others = [];
    sorted.forEach(e => {
      if (e.matched && e.studentId) {
        if (!byStudent[e.studentId]) byStudent[e.studentId] = [];
        byStudent[e.studentId].push(e);
      } else {
        others.push(e);
      }
    });
    const groups = Object.entries(byStudent).map(([sid, entries]) => ({
      sid, entries,
      student: students.find(s => s.id === sid),
      total: entries.reduce((sum, e) => sum + (e.amount||0), 0),
      isMulti: entries.length >= 2,
      latestTs: Math.max(...entries.map(e => e.timestamp||0)),
    }));
    groups.sort((a, b) => b.latestTs - a.latestTs);
    return { groups, others: others.sort((a, b) => (b.timestamp||0) - (a.timestamp||0)) };
  };
  const { groups, others } = buildGroups();

  const handleDeleteLog = async (id) => {
    if (!onSavePaymentLog) return;
    await onSavePaymentLog(paymentLog.filter(e => e.id !== id));
    setConfirmId(null);
  };

  const copyTSV = async () => {
    const header = "날짜\t시간\t입금인\t금액\t매칭\t학생명";
    const rows = sorted.map(e => {
      const s = e.studentId ? students.find(st => st.id === e.studentId) : null;
      const d = e.timestamp ? new Date(e.timestamp) : null;
      return [
        d ? `${d.getMonth()+1}/${d.getDate()}` : "",
        d ? d.toLocaleTimeString("ko-KR", {hour:"2-digit", minute:"2-digit"}) : "",
        e.senderName || "알 수 없음",
        e.amount || 0,
        e.matched ? "매칭" : "미매칭",
        s ? s.name : "—",
      ].join("\t");
    });
    const tsv = [header, ...rows].join("\n");
    try { await navigator.clipboard.writeText(tsv); }
    catch { const ta = document.createElement("textarea"); ta.value = tsv; document.body.appendChild(ta); ta.select(); document.execCommand("copy"); document.body.removeChild(ta); }
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const [y, m] = viewMonth.split("-");
  const monthLabel = `${y}년 ${m}월`;

  return (
    <div>
      {/* 월 탐색 + 요약 + 복사 */}
      <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:12,flexWrap:"wrap"}}>
        <button className="btn btn-secondary btn-xs" onClick={() => changeMonth(-1)}>←</button>
        <input className="inp" type="month" value={viewMonth} onChange={e => setViewMonth(e.target.value)} style={{textAlign:"center",maxWidth:140,fontSize:13,padding:"4px 8px",height:30}} />
        <button className="btn btn-secondary btn-xs" onClick={() => changeMonth(1)}>→</button>
        <span style={{flex:1}} />
        {sorted.length > 0 && (
          <span style={{fontSize:12,color:"var(--ink-60)"}}>
            {sorted.length}건 · <strong style={{color:"var(--green)"}}>{totalAmount.toLocaleString()}원</strong>
          </span>
        )}
        {sorted.length > 0 && (
          <button className="btn btn-secondary btn-xs" onClick={copyTSV} title="스프레드시트용 TSV 복사">
            {copied ? "✓ 복사됨" : "표 복사"}
          </button>
        )}
      </div>
      {/* 매칭 필터 */}
      <div style={{display:"flex",gap:6,marginBottom:10}}>
        {[["all","전체"],["matched","매칭"],["unmatched","미매칭"]].map(([v,l]) => (
          <button key={v} className="btn btn-xs" onClick={() => setMatchFilter(v)}
            style={{background:matchFilter===v?"var(--ink)":"var(--ink-10)",color:matchFilter===v?"#fff":"var(--ink-60)",border:"none",fontWeight:matchFilter===v?700:400}}>
            {l}
          </button>
        ))}
        <span style={{fontSize:11,color:"var(--ink-30)",alignSelf:"center",marginLeft:4}}>
          {sorted.length}건 · {sorted.reduce((s,e)=>s+(e.amount||0),0).toLocaleString()}원
        </span>
      </div>

      {sorted.length === 0 ? (
        <div className="empty" style={{paddingTop:40}}>
          <div className="empty-txt">{monthLabel} 입금 내역이 없습니다.</div>
          <div style={{fontSize:12,color:"var(--ink-30)",marginTop:6}}>
            카카오뱅크 자동수납 처리 시 여기에 기록됩니다.
          </div>
        </div>
      ) : (
        <>
          {/* 데스크톱: 테이블 */}
          <div className="log-table-wrap">
            <table className="log-table">
              <thead>
                <tr>
                  <th>날짜</th>
                  <th>시간</th>
                  <th>입금인</th>
                  <th style={{textAlign:"right"}}>금액</th>
                  <th>매칭</th>
                  <th>학생</th>
                  <th style={{width:36}} />
                </tr>
              </thead>
              <tbody>
                {groups.map(({ sid, entries, student, total, isMulti }) => [
                  isMulti && (
                    <tr key={`grp_${sid}`} style={{background:"var(--blue-lt)",borderTop:"2px solid rgba(43,58,159,.12)"}}>
                      <td colSpan={3} style={{fontWeight:700,fontSize:13,color:"var(--blue)",paddingTop:8,paddingBottom:8}}>
                        {student?.name || "?"} <span style={{fontWeight:400,fontSize:11,color:"var(--ink-60)"}}>· {entries.length}건 입금</span>
                      </td>
                      <td style={{textAlign:"right",fontWeight:700,color:"var(--green)",whiteSpace:"nowrap",paddingTop:8,paddingBottom:8}}>
                        {total.toLocaleString()}원
                      </td>
                      <td colSpan={3} />
                    </tr>
                  ),
                  ...entries.map(e => {
                    const d = e.timestamp ? new Date(e.timestamp) : null;
                    return (
                      <tr key={e.id} style={isMulti ? {background:"rgba(43,58,159,.02)"} : {}}>
                        <td style={{color:"var(--ink-60)",whiteSpace:"nowrap",paddingLeft: isMulti ? 20 : undefined}}>
                          {d ? `${d.getMonth()+1}/${d.getDate()}` : "—"}
                        </td>
                        <td style={{color:"var(--ink-60)",whiteSpace:"nowrap"}}>
                          {d ? d.toLocaleTimeString("ko-KR",{hour:"2-digit",minute:"2-digit"}) : "—"}
                        </td>
                        <td style={{fontWeight:600}}>{e.senderName || "알 수 없음"}</td>
                        <td style={{textAlign:"right",fontWeight:700,color:"var(--green)",whiteSpace:"nowrap"}}>
                          {(e.amount||0).toLocaleString()}원
                        </td>
                        <td>
                          <span style={{fontSize:10,fontWeight:700,padding:"2px 6px",borderRadius:8,background:"var(--green)",color:"#fff"}}>매칭</span>
                        </td>
                        <td>
                          {student ? (
                            <button onClick={() => onOpenStudentPayment?.(student.id)} style={{background:"none",border:"none",padding:"1px 0",cursor:"pointer",color:"var(--blue)",fontWeight:600,fontSize:12,textDecoration:"underline",textDecorationStyle:"dotted",fontFamily:"inherit"}}>
                              {student.name}
                            </button>
                          ) : "—"}
                        </td>
                        <td style={{textAlign:"center",whiteSpace:"nowrap"}}>
                          {onSavePaymentLog && (confirmId === e.id ? (
                            <span style={{display:"inline-flex",gap:3,alignItems:"center"}}>
                              <button style={{background:"var(--red)",border:"none",borderRadius:4,color:"#fff",fontSize:10,padding:"2px 6px",cursor:"pointer"}} onClick={() => handleDeleteLog(e.id)}>확인</button>
                              <button style={{background:"var(--ink-10)",border:"none",borderRadius:4,color:"var(--ink-60)",fontSize:10,padding:"2px 6px",cursor:"pointer"}} onClick={() => setConfirmId(null)}>취소</button>
                            </span>
                          ) : (
                            <button title="삭제" style={{background:"none",border:"none",color:"var(--ink-20)",cursor:"pointer",fontSize:14,padding:"2px 4px",lineHeight:1}} onClick={() => setConfirmId(e.id)} onMouseEnter={ev=>ev.currentTarget.style.color="var(--red)"} onMouseLeave={ev=>ev.currentTarget.style.color="var(--ink-20)"}>×</button>
                          ))}
                        </td>
                      </tr>
                    );
                  }),
                ])}
                {others.map(e => {
                  const s = e.studentId ? students.find(st => st.id === e.studentId) : null;
                  const d = e.timestamp ? new Date(e.timestamp) : null;
                  return (
                    <tr key={e.id} className={e.matched ? "" : "log-unmatched"}>
                      <td style={{color:"var(--ink-60)",whiteSpace:"nowrap"}}>
                        {d ? `${d.getMonth()+1}/${d.getDate()}` : "—"}
                      </td>
                      <td style={{color:"var(--ink-60)",whiteSpace:"nowrap"}}>
                        {d ? d.toLocaleTimeString("ko-KR",{hour:"2-digit",minute:"2-digit"}) : "—"}
                      </td>
                      <td style={{fontWeight:600}}>{e.senderName || "알 수 없음"}</td>
                      <td style={{textAlign:"right",fontWeight:700,color:"var(--green)",whiteSpace:"nowrap"}}>
                        {(e.amount||0).toLocaleString()}원
                      </td>
                      <td>
                        <span style={{fontSize:10,fontWeight:700,padding:"2px 6px",borderRadius:8,background:"rgba(232,40,28,.12)",color:"var(--red)"}}>미매칭</span>
                      </td>
                      <td>
                        {s && e.matched ? (
                          <button onClick={() => onOpenStudentPayment?.(s.id)} style={{background:"none",border:"none",padding:"1px 0",cursor:"pointer",color:"var(--blue)",fontWeight:600,fontSize:12,textDecoration:"underline",textDecorationStyle:"dotted",fontFamily:"inherit"}}>
                            {s.name}
                          </button>
                        ) : (s ? <span style={{color:"var(--ink-60)"}}>{s.name}</span> : "—")}
                      </td>
                      <td style={{textAlign:"center",whiteSpace:"nowrap"}}>
                        {onSavePaymentLog && (confirmId === e.id ? (
                          <span style={{display:"inline-flex",gap:3,alignItems:"center"}}>
                            <button style={{background:"var(--red)",border:"none",borderRadius:4,color:"#fff",fontSize:10,padding:"2px 6px",cursor:"pointer"}} onClick={() => handleDeleteLog(e.id)}>확인</button>
                            <button style={{background:"var(--ink-10)",border:"none",borderRadius:4,color:"var(--ink-60)",fontSize:10,padding:"2px 6px",cursor:"pointer"}} onClick={() => setConfirmId(null)}>취소</button>
                          </span>
                        ) : (
                          <button title="삭제" style={{background:"none",border:"none",color:"var(--ink-20)",cursor:"pointer",fontSize:14,padding:"2px 4px",lineHeight:1}} onClick={() => setConfirmId(e.id)} onMouseEnter={ev=>ev.currentTarget.style.color="var(--red)"} onMouseLeave={ev=>ev.currentTarget.style.color="var(--ink-20)"}>×</button>
                        ))}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
              <tfoot>
                <tr>
                  <td colSpan={3}>합계 {sorted.length}건 (매칭 {matchedCount} · 미매칭 {sorted.length - matchedCount})</td>
                  <td style={{textAlign:"right",color:"var(--green)"}}>{totalAmount.toLocaleString()}원</td>
                  <td colSpan={3} />
                </tr>
              </tfoot>
            </table>
          </div>

          {/* 모바일: 카드 */}
          <div className="log-mobile-cards">
            {groups.map(({ sid, entries, student, total, isMulti }) => (
              <div key={`mg_${sid}`}>
                {isMulti && (
                  <div style={{display:"flex",alignItems:"center",gap:6,padding:"8px 12px",background:"var(--blue-lt)",borderRadius:"var(--radius-sm) var(--radius-sm) 0 0",border:"1px solid rgba(43,58,159,.12)",borderBottom:"none",marginTop:4}}>
                    {student ? (
                    <button onClick={() => onOpenStudentPayment?.(student.id)} style={{background:"none",border:"none",padding:0,cursor:"pointer",fontWeight:700,fontSize:13,color:"var(--blue)",flex:1,textAlign:"left",fontFamily:"inherit",textDecoration:"underline",textDecorationStyle:"dotted"}}>
                      {student.name}
                    </button>
                  ) : <span style={{fontWeight:700,fontSize:13,color:"var(--blue)",flex:1}}>?</span>}
                    <span style={{fontSize:11,color:"var(--ink-60)"}}>{entries.length}건</span>
                    <span style={{fontWeight:700,fontSize:13,color:"var(--green)"}}>{total.toLocaleString()}원</span>
                  </div>
                )}
                {entries.map((e, idx) => {
                  const d = e.timestamp ? new Date(e.timestamp) : null;
                  return (
                    <div key={e.id} className="unmatched-card" style={isMulti ? {borderRadius: idx === entries.length-1 ? "0 0 var(--radius-sm) var(--radius-sm)" : 0, border:"1px solid rgba(43,58,159,.08)", borderTop:"none", background:"rgba(43,58,159,.02)", marginTop:0} : {}}>
                      <div style={{flex:1,minWidth:0}}>
                        <div style={{display:"flex",alignItems:"center",gap:6}}>
                          <span style={{fontSize:13.5,fontWeight:700}}>{e.senderName || "알 수 없음"}</span>
                          {!isMulti && (student ? (
                          <button onClick={() => onOpenStudentPayment?.(student.id)} style={{fontSize:10,fontWeight:700,padding:"1px 5px",borderRadius:8,background:"var(--green)",color:"#fff",border:"none",cursor:"pointer",fontFamily:"inherit"}}>→ {student.name}</button>
                        ) : <span style={{fontSize:10,fontWeight:700,padding:"1px 5px",borderRadius:8,background:"var(--green)",color:"#fff"}}>자동매칭</span>)}
                        </div>
                        <div style={{fontSize:12,color:"var(--green)",fontWeight:600}}>{(e.amount||0).toLocaleString()}원</div>
                        <div style={{fontSize:11,color:"var(--ink-30)"}}>
                          {d ? `${d.getMonth()+1}/${d.getDate()} ${d.toLocaleTimeString("ko-KR",{hour:"2-digit",minute:"2-digit"})}` : ""}
                        </div>
                      </div>
                      {onSavePaymentLog && (confirmId === e.id ? (
                        <div style={{display:"flex",flexDirection:"column",gap:3,alignSelf:"center",flexShrink:0}}>
                          <button style={{background:"var(--red)",border:"none",borderRadius:4,color:"#fff",fontSize:10,padding:"3px 7px",cursor:"pointer"}} onClick={() => handleDeleteLog(e.id)}>확인</button>
                          <button style={{background:"var(--ink-10)",border:"none",borderRadius:4,color:"var(--ink-60)",fontSize:10,padding:"3px 7px",cursor:"pointer"}} onClick={() => setConfirmId(null)}>취소</button>
                        </div>
                      ) : (
                        <button style={{background:"none",border:"none",color:"var(--ink-20)",cursor:"pointer",fontSize:18,padding:"2px 6px",alignSelf:"center",flexShrink:0}} onClick={() => setConfirmId(e.id)} title="삭제">×</button>
                      ))}
                    </div>
                  );
                })}
              </div>
            ))}
            {others.map(e => {
              const s = e.studentId ? students.find(st => st.id === e.studentId) : null;
              const d = e.timestamp ? new Date(e.timestamp) : null;
              return (
                <div key={e.id} className="unmatched-card">
                  <div style={{flex:1,minWidth:0}}>
                    <div style={{display:"flex",alignItems:"center",gap:6}}>
                      <span style={{fontSize:13.5,fontWeight:700}}>{e.senderName || "알 수 없음"}</span>
                      <span style={{
                        fontSize:10,fontWeight:700,padding:"1px 5px",borderRadius:8,
                        background: e.matched ? "var(--green)" : "rgba(232,40,28,.12)",
                        color: e.matched ? "#fff" : "var(--red)",
                      }}>
                        {e.matched ? (s ? `→ ${s.name}` : "자동매칭") : "미매칭"}
                      </span>
                    </div>
                    <div style={{fontSize:12,color:"var(--green)",fontWeight:600}}>{(e.amount||0).toLocaleString()}원</div>
                    <div style={{fontSize:11,color:"var(--ink-30)"}}>
                      {d ? `${d.getMonth()+1}/${d.getDate()} ${d.toLocaleTimeString("ko-KR",{hour:"2-digit",minute:"2-digit"})}` : ""}
                    </div>
                  </div>
                  {onSavePaymentLog && (confirmId === e.id ? (
                    <div style={{display:"flex",flexDirection:"column",gap:3,alignSelf:"center",flexShrink:0}}>
                      <button style={{background:"var(--red)",border:"none",borderRadius:4,color:"#fff",fontSize:10,padding:"3px 7px",cursor:"pointer"}} onClick={() => handleDeleteLog(e.id)}>확인</button>
                      <button style={{background:"var(--ink-10)",border:"none",borderRadius:4,color:"var(--ink-60)",fontSize:10,padding:"3px 7px",cursor:"pointer"}} onClick={() => setConfirmId(null)}>취소</button>
                    </div>
                  ) : (
                    <button style={{background:"none",border:"none",color:"var(--ink-20)",cursor:"pointer",fontSize:18,padding:"2px 6px",alignSelf:"center",flexShrink:0}} onClick={() => setConfirmId(e.id)} title="삭제">×</button>
                  ))}
                </div>
              );
            })}
            <div style={{textAlign:"right",fontSize:12,color:"var(--ink-60)",padding:"10px 0",borderTop:"1px solid var(--border)"}}>
              합계 {sorted.length}건 · <strong style={{color:"var(--green)"}}>{totalAmount.toLocaleString()}원</strong>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
