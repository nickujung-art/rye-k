import { useState, useMemo } from "react";
import { db, doc, runTransaction } from "../../firebase.js";
import { calcLessonFeeWithFallback, calcTotalFee, fmtMoney, monthLabel, canManageAll } from "../../utils.js";
import { THIS_MONTH } from "../../constants.jsx";

const COLLECTION = "appData";
const ATTENDED = ["present", "late", "excused"];

function findGroupMembers(student, lesson, allStudents) {
  return allStudents.filter(s => {
    if (s.id === student.id || s.isInstitution) return false;
    if ((s.status || "active") !== "active") return false;
    return (s.lessons || []).some(l =>
      l.teacherId === lesson.teacherId &&
      l.instrument === lesson.instrument &&
      (l.schedule || []).some(sch =>
        (lesson.schedule || []).some(ls => ls.day === sch.day && ls.time === sch.time)
      )
    );
  });
}

function groupKey(teacherId, lesson) {
  const sched = (lesson.schedule || []).map(s => `${s.day}${s.time}`).sort().join(",");
  return `${teacherId}-${lesson.instrument}-${sched}`;
}

function calcResult({ teacher, month, allStudents, attendance, payments, institutions, instantCharges, feePresets, discountTypes = [] }) {
  const rate = teacher.settlementRate || 0;
  const processedGroups = new Set();
  const studentRows = [];
  const groupRows = [];

  const teacherStudents = allStudents.filter(s =>
    !s.isInstitution &&
    (s.status || "active") === "active" &&
    (s.teacherId === teacher.id || (s.lessons || []).some(l => l.teacherId === teacher.id))
  );

  teacherStudents.forEach(student => {
    const teacherLessons = (student.lessons || []).filter(l => l.teacherId === teacher.id);
    if (teacherLessons.length === 0) return;

    const studentTotalFee = calcTotalFee(student, feePresets, discountTypes).total;
    const payment = payments.find(p => p.studentId === student.id && p.month === month && p.paid);
    const paidAmount = payment?.paidAmount || 0;
    const stuAtt = attendance.filter(a =>
      a.studentId === student.id && a.teacherId === teacher.id && a.date?.startsWith(month)
    );

    teacherLessons.forEach(lesson => {
      const gMembers = findGroupMembers(student, lesson, allStudents);
      const isGroup = gMembers.length > 0;

      if (isGroup) {
        const gid = groupKey(teacher.id, lesson);
        if (processedGroups.has(gid)) return;
        processedGroups.add(gid);

        const allGroupStudents = [student, ...gMembers];
        const allGroupRecs = attendance.filter(a =>
          allGroupStudents.some(s => s.id === a.studentId) &&
          a.teacherId === teacher.id && a.date?.startsWith(month)
        );
        const allDates = new Set(allGroupRecs.map(a => a.date));
        const conductedDates = new Set(
          allGroupRecs.filter(a => ATTENDED.includes(a.status)).map(a => a.date)
        );
        const groupRate = allDates.size > 0 ? conductedDates.size / allDates.size : 0;

        let baseTotal = 0;
        allGroupStudents.forEach(gs => {
          const gPayment = payments.find(p => p.studentId === gs.id && p.month === month && p.paid);
          const gPaid = gPayment?.paidAmount || 0;
          const gLessons = (gs.lessons || []).filter(l =>
            l.teacherId === teacher.id && l.instrument === lesson.instrument
          );
          if (gLessons.length === 0) return;
          const gTotalFee = calcTotalFee(gs, feePresets, discountTypes).total;
          const fallback = gs.lessons?.length > 0 ? Math.round((gs.monthlyFee || 0) / gs.lessons.length) : 0;
          const gLessonFee = gLessons.reduce((s, l) => s + calcLessonFeeWithFallback(l, feePresets, fallback), 0);
          const prop = gTotalFee > 0 ? gLessonFee / gTotalFee : 1;
          baseTotal += gPaid * prop;
        });

        groupRows.push({
          gid, instrument: lesson.instrument,
          schedule: lesson.schedule,
          members: allGroupStudents.map(s => s.name),
          totalDates: allDates.size, conductedDates: conductedDates.size, groupRate,
          baseTotal, settlement: Math.round(baseTotal * groupRate * rate / 100),
          hasNoRecords: allDates.size === 0,
        });
      } else {
        const fallback = student.lessons?.length > 0 ? Math.round((student.monthlyFee || 0) / student.lessons.length) : 0;
        const lessonFee = calcLessonFeeWithFallback(lesson, feePresets, fallback);
        const prop = studentTotalFee > 0 ? lessonFee / studentTotalFee : 1;
        const base = paidAmount * prop;
        const total = stuAtt.length;
        const attended = stuAtt.filter(a => ATTENDED.includes(a.status)).length;
        const attRate = total > 0 ? attended / total : 0;
        studentRows.push({
          student, lesson, total, attended, attRate,
          lessonFee, base, settlement: Math.round(base * attRate * rate / 100),
          hasPaid: !!payment, hasNoRecords: total === 0,
        });
      }
    });
  });

  const instRows = [];
  (institutions || []).forEach(inst => {
    (inst.classes || []).forEach(cls => {
      if (cls.teacherId !== teacher.id) return;
      const vid = `inst_${inst.id}_${cls.id}`;
      const recs = attendance.filter(a =>
        a.studentId === vid && a.teacherId === teacher.id && a.date?.startsWith(month)
      );
      const total = recs.length;
      const attended = recs.filter(a => ATTENDED.includes(a.status)).length;
      const attRate = total > 0 ? attended / total : 0;
      const base = cls.monthlyFee || 0;
      instRows.push({
        instId: inst.id, classId: cls.id,
        instName: inst.name, className: cls.name,
        total, attended, attRate, base,
        settlement: Math.round(base * attRate * rate / 100),
        hasNoRecords: total === 0,
      });
    });
  });

  const shopRates = teacher.shopIncentiveRates || {};
  const teacherStudentIds = new Set(teacherStudents.map(s => s.id));
  const shopByCategory = {};
  (instantCharges || []).forEach(c => {
    if (c.status !== "approved" && c.status !== "paid") return;
    if (!teacherStudentIds.has(c.studentId)) return;
    const ts = c.approvedAt || c.createdAt;
    if (!ts) return;
    const d = new Date(ts);
    const m = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
    if (m !== month) return;
    const cat = c.itemCategory || "기타";
    if (!shopByCategory[cat]) shopByCategory[cat] = { count: 0, total: 0 };
    shopByCategory[cat].count++;
    shopByCategory[cat].total += c.amount || 0;
  });
  const shopRows = Object.entries(shopByCategory).map(([cat, { count, total }]) => {
    const catRate = shopRates[cat] || 0;
    return { category: cat, count, total, rate: catRate, incentive: Math.round(total * catRate / 100) };
  });

  const lessonTotal = [...studentRows, ...groupRows, ...instRows].reduce((s, r) => s + r.settlement, 0);
  const shopTotal = shopRows.reduce((s, r) => s + r.incentive, 0);
  return { studentRows, groupRows, instRows, shopRows, lessonTotal, shopTotal, grandTotal: lessonTotal + shopTotal };
}

async function saveSettlementRecord(record) {
  await runTransaction(db, async (tx) => {
    const ref = doc(db, COLLECTION, "rye-settlement-records");
    const snap = await tx.get(ref);
    const existing = snap.exists() ? (snap.data().value ?? []) : [];
    const filtered = existing.filter(r => !(r.teacherId === record.teacherId && r.month === record.month));
    tx.set(ref, { value: [...filtered, record], updatedAt: Date.now() });
  });
}

function loadImage(src) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error(`Image load failed: ${src}`));
    img.src = src;
  });
}

async function drawPayslipCanvas({ teacher, month, studentRows, groupRows, instRows, shopRows, effectiveGrandTotal }) {
  const [logoImg, logoWhiteImg] = await Promise.all([
    loadImage("/logo.png"),
    loadImage("/logo_white.png"),
  ]);

  const W = 820;
  const M = 60;
  const CW = W - M * 2;
  const KR = '"Noto Sans KR","Apple SD Gothic Neo","Malgun Gothic",sans-serif';
  const SR = '"Noto Serif KR","Apple Myungjo","Batang",serif';
  const fn = (fam, sz, wt = "400") => `${wt} ${sz}px ${fam}`;

  const BLUE = "#2B3A9F"; const BLUE_LT = "#EEF1FF";
  const GREEN = "#1A7A40"; const RED = "#E8281C";
  const INK = "#18181B"; const INK60 = "#52525B"; const INK30 = "#A1A1AA";
  const BG = "#F5F6FA"; const BORDER = "#E4E4E7"; const WHITE = "#ffffff";

  const ROW_H = 30; const SEC_H = 32; const TABLE_HEAD_H = 40; const TOTAL_H = 60;

  const payslipSecs = [
    { title: "개인 레슨", rows: studentRows, lbl: r => `${r.student.name}  ·  ${r.lesson.instrument}` },
    { title: "그룹 레슨", rows: groupRows, lbl: r => `${r.instrument}  ·  ${(r.schedule||[]).map(s=>`${s.day} ${s.time}`).join(", ")}` },
    { title: "기관 수업", rows: instRows, lbl: r => `${r.instName}  ·  ${r.className}` },
    { title: "상품 인센티브", rows: shopRows, lbl: r => r.category },
  ].filter(s => s.rows.length > 0);

  const tableBodyH = payslipSecs.reduce((sum, s) => sum + SEC_H + s.rows.length * ROW_H, 0);
  const H = 455 + tableBodyH;

  const canvas = document.createElement("canvas");
  canvas.width = W; canvas.height = H;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("캔버스를 생성할 수 없습니다.");

  // ── White background ──
  ctx.fillStyle = WHITE;
  ctx.fillRect(0, 0, W, H);

  // ── Top accent stripe ──
  ctx.fillStyle = BLUE;
  ctx.fillRect(0, 0, W, 6);

  let y = 6 + 24;

  // ── HEADER (2-column) ──
  // Left: butterfly logo + "K-Culture Center"
  ctx.drawImage(logoImg, M, y, 46, 46);
  ctx.fillStyle = INK30; ctx.font = fn(KR, 10); ctx.textAlign = "left";
  ctx.fillText("K-Culture Center", M, y + 58);

  // Right: document title
  ctx.textAlign = "right";
  ctx.fillStyle = INK; ctx.font = fn(SR, 28, "700");
  ctx.fillText("지급명세서", W - M, y + 24);
  ctx.fillStyle = INK30; ctx.font = fn(KR, 10);
  ctx.fillText("강사료  ·  위탁용역수수료", W - M, y + 42);

  y += 70;

  // ── DIVIDER ──
  const divider = (yy) => {
    ctx.strokeStyle = BORDER; ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(M, yy); ctx.lineTo(W - M, yy); ctx.stroke();
  };
  divider(y); y += 28;

  // ── INFO (2-column) ──
  const iy = y;
  ctx.textAlign = "left";
  ctx.fillStyle = INK30; ctx.font = fn(KR, 9, "600");
  ctx.fillText("수  령  인", M, iy);
  ctx.fillStyle = INK; ctx.font = fn(SR, 16, "700");
  ctx.fillText(`${teacher.name} 강사`, M, iy + 22);
  ctx.fillStyle = INK60; ctx.font = fn(KR, 11);
  ctx.fillText(`정산 요율 ${teacher.settlementRate || 0}%`, M, iy + 40);

  ctx.textAlign = "right";
  ctx.fillStyle = INK30; ctx.font = fn(KR, 9, "600");
  ctx.fillText("발  행  정  보", W - M, iy);
  ctx.fillStyle = INK; ctx.font = fn(SR, 15, "700");
  ctx.fillText(monthLabel(month), W - M, iy + 22);
  ctx.fillStyle = INK60; ctx.font = fn(KR, 11);
  ctx.fillText(`발행일 ${new Date().toLocaleDateString("ko-KR")}`, W - M, iy + 40);

  y = iy + 57;
  divider(y); y += 28;

  // ── TABLE HEADER ──
  ctx.fillStyle = BLUE;
  ctx.fillRect(M, y, CW, TABLE_HEAD_H);
  ctx.fillStyle = WHITE; ctx.font = fn(KR, 11, "600");
  ctx.textAlign = "left"; ctx.fillText("내  역", M + 20, y + 26);
  ctx.textAlign = "right"; ctx.fillText("기여액", W - M - 16, y + 26);
  y += TABLE_HEAD_H;

  // ── TABLE SECTIONS ──
  payslipSecs.forEach((sec, si) => {
    const secTotal = sec.rows.reduce((s, r) => s + r.effectiveAmount, 0);

    ctx.fillStyle = si % 2 === 0 ? BLUE_LT : BG;
    ctx.fillRect(M, y, CW, SEC_H);
    ctx.fillStyle = BLUE; ctx.font = fn(KR, 11, "700");
    ctx.textAlign = "left"; ctx.fillText(sec.title, M + 20, y + 21);
    ctx.textAlign = "right"; ctx.fillText(fmtMoney(secTotal), W - M - 16, y + 21);
    y += SEC_H;

    sec.rows.forEach((row, ri) => {
      if (ri % 2 !== 0) { ctx.fillStyle = "#FAFAFA"; ctx.fillRect(M, y, CW, ROW_H); }
      ctx.textAlign = "left"; ctx.fillStyle = INK60; ctx.font = fn(KR, 12);
      ctx.fillText(sec.lbl(row), M + 32, y + 21);
      ctx.textAlign = "right"; ctx.fillStyle = GREEN; ctx.font = fn(KR, 12, "600");
      ctx.fillText(fmtMoney(row.effectiveAmount), W - M - 16, y + 21);
      y += ROW_H;
    });
  });

  // ── TABLE BOTTOM BORDER ──
  ctx.fillStyle = BLUE; ctx.fillRect(M, y, CW, 2); y += 2;

  // ── TOTAL ROW ──
  ctx.fillStyle = BG; ctx.fillRect(M, y, CW, TOTAL_H);
  ctx.textAlign = "left"; ctx.fillStyle = INK; ctx.font = fn(SR, 15, "700");
  ctx.fillText("지  급  합  계", M + 20, y + 38);
  ctx.textAlign = "right"; ctx.fillStyle = GREEN; ctx.font = fn(SR, 22, "700");
  ctx.fillText(fmtMoney(effectiveGrandTotal), W - M - 16, y + 38);
  y += TOTAL_H + 28;

  // ── FOOTER ──
  divider(y); y += 24;

  // Butterfly stamp: red filled circle + white logo overlay
  const stampCx = M + 32, stampCy = y + 32, stampR = 30;
  ctx.fillStyle = RED;
  ctx.beginPath(); ctx.arc(stampCx, stampCy, stampR, 0, Math.PI * 2); ctx.fill();
  ctx.drawImage(logoWhiteImg, stampCx - 24, stampCy - 24, 48, 48);

  // Legal text
  ctx.textAlign = "right"; ctx.fillStyle = INK30; ctx.font = fn(KR, 10);
  ctx.fillText("위탁용역수수료 지급 확인서", W - M, y + 18);
  ctx.fillText(`확정일 ${new Date().toLocaleDateString("ko-KR", { year: "numeric", month: "long", day: "numeric" })}`, W - M, y + 36);

  return canvas;
}

export default function SettlementView({
  teachers, students, attendance, payments, institutions,
  instantCharges, feePresets, currentUser, discountTypes = [],
}) {
  const [selectedTeacherId, setSelectedTeacherId] = useState("");
  const [month, setMonth] = useState(THIS_MONTH);
  const [calculated, setCalculated] = useState(false);
  const [overrides, setOverrides] = useState({});
  const [editingKey, setEditingKey] = useState(null);
  const [editingVal, setEditingVal] = useState("");
  const [confirmed, setConfirmed] = useState(false);
  const [confirmLoading, setConfirmLoading] = useState(false);
  const [confirmErr, setConfirmErr] = useState("");
  const [showPayslip, setShowPayslip] = useState(false);
  const [sharing, setSharing] = useState(false);
  const [shareErr, setShareErr] = useState("");

  const availableTeachers = teachers.filter(t => canManageAll(currentUser?.role) || t.id === currentUser?.id);
  const selectedTeacher = teachers.find(t => t.id === selectedTeacherId);

  const result = useMemo(() => {
    if (!selectedTeacher || !calculated) return null;
    return calcResult({ teacher: selectedTeacher, month, allStudents: students, attendance, payments, institutions, instantCharges, feePresets, discountTypes });
  }, [selectedTeacher, month, students, attendance, payments, institutions, instantCharges, feePresets, discountTypes, calculated]);

  const effResult = useMemo(() => {
    if (!result) return null;
    const eff = (key, base) => overrides[key] !== undefined ? overrides[key] : base;

    const studentRows = result.studentRows.map(r => ({
      ...r,
      rowKey: `s_${r.student.id}_${r.lesson.instrument}`,
      effectiveAmount: eff(`s_${r.student.id}_${r.lesson.instrument}`, r.settlement),
    }));
    const groupRows = result.groupRows.map(r => ({
      ...r,
      rowKey: `g_${r.gid}`,
      effectiveAmount: eff(`g_${r.gid}`, r.settlement),
    }));
    const instRows = result.instRows.map(r => ({
      ...r,
      rowKey: `i_${r.instId}_${r.classId}`,
      effectiveAmount: eff(`i_${r.instId}_${r.classId}`, r.settlement),
    }));
    const shopRows = result.shopRows.map(r => ({
      ...r,
      rowKey: `shop_${r.category}`,
      effectiveAmount: eff(`shop_${r.category}`, r.incentive),
    }));

    const effectiveLessonTotal = [...studentRows, ...groupRows, ...instRows].reduce((s, r) => s + r.effectiveAmount, 0);
    const effectiveShopTotal = shopRows.reduce((s, r) => s + r.effectiveAmount, 0);
    const effectiveGrandTotal = effectiveLessonTotal + effectiveShopTotal;

    return { studentRows, groupRows, instRows, shopRows, effectiveLessonTotal, effectiveShopTotal, effectiveGrandTotal };
  }, [result, overrides]);

  const handleCalc = () => {
    if (!selectedTeacherId) return;
    setCalculated(false);
    setOverrides({});
    setConfirmed(false);
    setConfirmErr("");
    setTimeout(() => setCalculated(true), 0);
  };

  const handleCancelConfirm = async () => {
    setConfirmLoading(true);
    setConfirmErr("");
    try {
      await runTransaction(db, async (tx) => {
        const ref = doc(db, COLLECTION, "rye-settlement-records");
        const snap = await tx.get(ref);
        const existing = snap.exists() ? (snap.data().value ?? []) : [];
        tx.set(ref, { value: existing.filter(r => !(r.teacherId === selectedTeacherId && r.month === month)), updatedAt: Date.now() });
      });
      setConfirmed(false);
    } catch (e) {
      console.error("확정 취소 오류:", e);
      setConfirmErr("확정 취소 중 오류가 발생했습니다.");
    } finally {
      setConfirmLoading(false);
    }
  };

  const handleConfirm = async () => {
    if (!effResult || !selectedTeacher || confirmLoading) return;
    setConfirmLoading(true);
    setConfirmErr("");
    try {
      const record = {
        id: `${selectedTeacherId}_${month}`,
        teacherId: selectedTeacherId,
        teacherName: selectedTeacher.name,
        month,
        grandTotal: effResult.effectiveGrandTotal,
        lessonTotal: effResult.effectiveLessonTotal,
        shopTotal: effResult.effectiveShopTotal,
        rows: {
          studentRows: effResult.studentRows.map(r => ({ name: r.student.name, instrument: r.lesson.instrument, amount: r.effectiveAmount })),
          groupRows: effResult.groupRows.map(r => ({ instrument: r.instrument, schedule: r.schedule, members: r.members, amount: r.effectiveAmount })),
          instRows: effResult.instRows.map(r => ({ instName: r.instName, className: r.className, amount: r.effectiveAmount })),
          shopRows: effResult.shopRows.map(r => ({ category: r.category, amount: r.effectiveAmount })),
        },
        confirmedAt: new Date().toISOString(),
        confirmedBy: currentUser?.id || "",
      };
      await saveSettlementRecord(record);
      setConfirmed(true);
    } catch (e) {
      console.error("정산 확정 저장 오류:", e);
      setConfirmErr("저장 중 오류가 발생했습니다. 다시 시도해주세요.");
    } finally {
      setConfirmLoading(false);
    }
  };

  const handleGenerateImage = async () => {
    if (!effResult || !selectedTeacher || sharing) return;
    setSharing(true);
    setShareErr("");
    try {
      const canvas = await drawPayslipCanvas({ teacher: selectedTeacher, month, ...effResult });
      const blob = await new Promise(resolve => canvas.toBlob(resolve, "image/png"));
      if (!blob) throw new Error("PNG 인코딩에 실패했습니다.");
      const filename = `${selectedTeacher.name}_${month}_강사료지급명세서.png`;
      const file = new File([blob], filename, { type: "image/png" });

      if (navigator.share && navigator.canShare({ files: [file] })) {
        await navigator.share({ files: [file], title: "강사료 지급명세서" });
      } else {
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = filename;
        a.click();
        URL.revokeObjectURL(url);
      }
    } catch (e) {
      if (e?.name !== "AbortError") {
        console.error("이미지 생성 오류:", e);
        setShareErr("이미지 생성에 실패했습니다. 다시 시도해주세요.");
      }
    } finally {
      setSharing(false);
    }
  };

  const AmountCell = ({ rowKey, calculated }) => {
    const effective = overrides[rowKey] !== undefined ? overrides[rowKey] : calculated;
    const isOverridden = overrides[rowKey] !== undefined;
    const isEditing = editingKey === rowKey;

    if (isEditing) {
      return (
        <input
          type="number"
          value={editingVal}
          onChange={e => setEditingVal(e.target.value)}
          onBlur={() => {
            const val = parseInt(editingVal, 10);
            if (!isNaN(val) && val >= 0) setOverrides(prev => ({ ...prev, [rowKey]: val }));
            setEditingKey(null);
          }}
          onKeyDown={e => {
            if (e.key === "Enter") e.target.blur();
            if (e.key === "Escape") setEditingKey(null);
          }}
          autoFocus
          style={{ width: 100, textAlign: "right", fontSize: 13, padding: "2px 6px", border: "1.5px solid var(--blue)", borderRadius: 4, background: "var(--bg)" }}
        />
      );
    }

    return (
      <span
        onClick={() => { if (!confirmed) { setEditingKey(rowKey); setEditingVal(String(effective)); } }}
        title={confirmed ? "" : "클릭하여 기여액 수정"}
        style={{ fontWeight: 700, color: isOverridden ? "var(--blue)" : "var(--green)", cursor: confirmed ? "default" : "pointer", display: "inline-flex", alignItems: "center", gap: 3 }}
      >
        {fmtMoney(effective)}
        {!confirmed && <span style={{ fontSize: 9, opacity: 0.45 }}>✏</span>}
        {isOverridden && !confirmed && <span style={{ fontSize: 9, color: "var(--blue)", fontWeight: 400 }}>*</span>}
      </span>
    );
  };

  return (
    <div>
      <div className="ph">
        <div><h1>정산 관리</h1><div className="ph-sub">관리자·매니저 전용</div></div>
      </div>

      {/* 강사 + 월 선택 */}
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 16, alignItems: "flex-end" }}>
        <div style={{ flex: "1 1 160px", minWidth: 140 }}>
          <div style={{ fontSize: 11, color: "var(--ink-30)", fontWeight: 600, marginBottom: 4 }}>강사 선택</div>
          <select className="sel" value={selectedTeacherId} onChange={e => { setSelectedTeacherId(e.target.value); setCalculated(false); setOverrides({}); setConfirmed(false); }}>
            <option value="">-- 강사 선택 --</option>
            {availableTeachers.map(t => (
              <option key={t.id} value={t.id}>{t.name}{t.settlementRate ? ` (${t.settlementRate}%)` : ""}</option>
            ))}
          </select>
        </div>
        <div style={{ flex: "1 1 130px", minWidth: 120 }}>
          <div style={{ fontSize: 11, color: "var(--ink-30)", fontWeight: 600, marginBottom: 4 }}>정산 월</div>
          <input className="inp" type="month" value={month} onChange={e => { setMonth(e.target.value); setCalculated(false); setOverrides({}); setConfirmed(false); }} />
        </div>
        <button className="btn btn-primary" onClick={handleCalc} disabled={!selectedTeacherId}>
          정산 계산
        </button>
      </div>

      {selectedTeacher && !selectedTeacher.settlementRate && (
        <div style={{ marginBottom: 12, padding: "10px 14px", background: "var(--gold-lt)", border: "1px solid rgba(245,158,11,.25)", borderRadius: 8, fontSize: 12.5, color: "var(--gold-dk)" }}>
          ⚠ <strong>{selectedTeacher.name}</strong> 강사의 정산 요율이 설정되지 않았습니다. 강사 관리에서 먼저 설정해주세요.
        </div>
      )}

      {!result && (
        <div style={{ textAlign: "center", padding: "60px 0", color: "var(--ink-30)", fontSize: 13 }}>
          강사와 월을 선택한 후 [정산 계산] 버튼을 누르세요.
        </div>
      )}

      {effResult && (
        <>
          {/* 헤더 요약 */}
          <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 16, padding: "12px 16px", background: "var(--blue-lt)", border: "1px solid rgba(43,58,159,.15)", borderRadius: 10 }}>
            <div style={{ flex: 1 }}>
              <span style={{ fontFamily: "'Noto Serif KR',serif", fontWeight: 700, fontSize: 15 }}>{selectedTeacher.name}</span>
              <span style={{ fontSize: 12, color: "var(--ink-60)", marginLeft: 8 }}>{monthLabel(month)} 정산</span>
              {confirmed && (
                <span style={{ marginLeft: 8, fontSize: 11, background: "var(--green)", color: "#fff", borderRadius: 4, padding: "2px 7px", fontWeight: 600 }}>✓ 지급 확정</span>
              )}
            </div>
            <div style={{ fontSize: 12, color: "var(--blue)", fontWeight: 600 }}>정산 요율 {selectedTeacher.settlementRate || 0}%</div>
          </div>

          {!confirmed && (
            <div style={{ marginBottom: 12, padding: "8px 12px", background: "var(--bg-sub)", borderRadius: 8, fontSize: 12, color: "var(--ink-60)", display: "flex", alignItems: "center", gap: 6 }}>
              <span>✏</span>
              <span>기여액을 클릭하면 직접 수정할 수 있습니다. 수정된 값은 <span style={{ color: "var(--blue)" }}>파란색</span>으로 표시됩니다.</span>
            </div>
          )}

          {/* 개인 레슨 */}
          {effResult.studentRows.length > 0 && (
            <Section title="개인 레슨" total={effResult.studentRows.reduce((s, r) => s + r.effectiveAmount, 0)}>
              <table className="log-table">
                <thead>
                  <tr>
                    <th>학생</th><th>악기</th>
                    <th style={{ textAlign: "right" }}>총수업</th>
                    <th style={{ textAlign: "right" }}>출석</th>
                    <th style={{ textAlign: "right" }}>출석률</th>
                    <th style={{ textAlign: "right" }}>수납확정</th>
                    <th style={{ textAlign: "right" }}>기여액</th>
                  </tr>
                </thead>
                <tbody>
                  {effResult.studentRows.map((r, i) => (
                    <tr key={i} style={{ opacity: r.hasNoRecords ? 0.6 : 1 }}>
                      <td>
                        {r.student.name}
                        {r.hasNoRecords && <span style={{ fontSize: 9, background: "var(--gold-lt)", color: "var(--gold-dk)", borderRadius: 4, padding: "1px 5px", marginLeft: 4, fontWeight: 600 }}>출석없음</span>}
                        {!r.hasPaid && <span style={{ fontSize: 9, background: "var(--red-lt)", color: "var(--red)", borderRadius: 4, padding: "1px 5px", marginLeft: 4, fontWeight: 600 }}>미납</span>}
                      </td>
                      <td style={{ color: "var(--ink-60)" }}>{r.lesson.instrument}</td>
                      <td style={{ textAlign: "right" }}>{r.total}회</td>
                      <td style={{ textAlign: "right" }}>{r.attended}회</td>
                      <td style={{ textAlign: "right" }}>{r.total > 0 ? `${Math.round(r.attRate * 100)}%` : "–"}</td>
                      <td style={{ textAlign: "right" }}>{fmtMoney(Math.round(r.base))}</td>
                      <td style={{ textAlign: "right" }}>
                        <AmountCell rowKey={r.rowKey} calculated={r.settlement} />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </Section>
          )}

          {/* 그룹 레슨 */}
          {effResult.groupRows.length > 0 && (
            <Section title="그룹 레슨" total={effResult.groupRows.reduce((s, r) => s + r.effectiveAmount, 0)}>
              <table className="log-table">
                <thead>
                  <tr>
                    <th>악기</th><th>시간</th><th>구성원</th>
                    <th style={{ textAlign: "right" }}>총수업</th>
                    <th style={{ textAlign: "right" }}>진행</th>
                    <th style={{ textAlign: "right" }}>진행률</th>
                    <th style={{ textAlign: "right" }}>기여액</th>
                  </tr>
                </thead>
                <tbody>
                  {effResult.groupRows.map((r, i) => (
                    <tr key={i} style={{ opacity: r.hasNoRecords ? 0.6 : 1 }}>
                      <td>{r.instrument}{r.hasNoRecords && <span style={{ fontSize: 9, background: "var(--gold-lt)", color: "var(--gold-dk)", borderRadius: 4, padding: "1px 5px", marginLeft: 4, fontWeight: 600 }}>출석없음</span>}</td>
                      <td style={{ color: "var(--ink-60)", fontSize: 11 }}>{(r.schedule || []).map(s => `${s.day} ${s.time}`).join(", ")}</td>
                      <td style={{ fontSize: 11 }}>{r.members.join(", ")}</td>
                      <td style={{ textAlign: "right" }}>{r.totalDates}회</td>
                      <td style={{ textAlign: "right" }}>{r.conductedDates}회</td>
                      <td style={{ textAlign: "right" }}>{r.totalDates > 0 ? `${Math.round(r.groupRate * 100)}%` : "–"}</td>
                      <td style={{ textAlign: "right" }}>
                        <AmountCell rowKey={r.rowKey} calculated={r.settlement} />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </Section>
          )}

          {/* 기관 수업 */}
          {effResult.instRows.length > 0 && (
            <Section title="기관 수업" total={effResult.instRows.reduce((s, r) => s + r.effectiveAmount, 0)}>
              <table className="log-table">
                <thead>
                  <tr>
                    <th>기관</th><th>반명</th>
                    <th style={{ textAlign: "right" }}>총수업</th>
                    <th style={{ textAlign: "right" }}>출석</th>
                    <th style={{ textAlign: "right" }}>출석률</th>
                    <th style={{ textAlign: "right" }}>반수강료</th>
                    <th style={{ textAlign: "right" }}>기여액</th>
                  </tr>
                </thead>
                <tbody>
                  {effResult.instRows.map((r, i) => (
                    <tr key={i} style={{ opacity: r.hasNoRecords ? 0.6 : 1 }}>
                      <td>{r.instName}{r.hasNoRecords && <span style={{ fontSize: 9, background: "var(--gold-lt)", color: "var(--gold-dk)", borderRadius: 4, padding: "1px 5px", marginLeft: 4, fontWeight: 600 }}>출석없음</span>}</td>
                      <td>{r.className}</td>
                      <td style={{ textAlign: "right" }}>{r.total}회</td>
                      <td style={{ textAlign: "right" }}>{r.attended}회</td>
                      <td style={{ textAlign: "right" }}>{r.total > 0 ? `${Math.round(r.attRate * 100)}%` : "–"}</td>
                      <td style={{ textAlign: "right" }}>{fmtMoney(r.base)}</td>
                      <td style={{ textAlign: "right" }}>
                        <AmountCell rowKey={r.rowKey} calculated={r.settlement} />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </Section>
          )}

          {/* 상품 인센티브 */}
          {effResult.shopRows.length > 0 && (
            <Section title="상품 인센티브" total={effResult.shopRows.reduce((s, r) => s + r.effectiveAmount, 0)}>
              <table className="log-table">
                <thead>
                  <tr>
                    <th>카테고리</th>
                    <th style={{ textAlign: "right" }}>건수</th>
                    <th style={{ textAlign: "right" }}>판매액</th>
                    <th style={{ textAlign: "right" }}>요율</th>
                    <th style={{ textAlign: "right" }}>인센티브</th>
                  </tr>
                </thead>
                <tbody>
                  {effResult.shopRows.map((r, i) => (
                    <tr key={i}>
                      <td>{r.category}</td>
                      <td style={{ textAlign: "right" }}>{r.count}건</td>
                      <td style={{ textAlign: "right" }}>{fmtMoney(r.total)}</td>
                      <td style={{ textAlign: "right" }}>{r.rate}%</td>
                      <td style={{ textAlign: "right" }}>
                        <AmountCell rowKey={r.rowKey} calculated={r.incentive} />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </Section>
          )}

          {effResult.studentRows.length === 0 && effResult.groupRows.length === 0 && effResult.instRows.length === 0 && (
            <div style={{ textAlign: "center", padding: "40px 0", color: "var(--ink-30)", fontSize: 13 }}>이 달 수업 기록이 없습니다.</div>
          )}

          {/* 최종 합계 */}
          <div style={{ marginTop: 16, padding: "16px 20px", background: "var(--bg)", border: `2px solid ${confirmed ? "var(--green)" : "var(--blue)"}`, borderRadius: 12 }}>
            <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              <TotalRow label="레슨 기여 합계" val={effResult.effectiveLessonTotal} />
              {effResult.effectiveShopTotal > 0 && <TotalRow label="상품 인센티브" val={effResult.effectiveShopTotal} />}
              <div style={{ borderTop: "1px solid var(--border)", marginTop: 4, paddingTop: 8, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <span style={{ fontFamily: "'Noto Serif KR',serif", fontWeight: 700, fontSize: 15 }}>최종 지급액</span>
                <span style={{ fontFamily: "'Noto Serif KR',serif", fontWeight: 700, fontSize: 18, color: "var(--green)" }}>{fmtMoney(effResult.effectiveGrandTotal)}</span>
              </div>
            </div>
          </div>

          {/* 액션 버튼 영역 */}
          <div style={{ marginTop: 12, display: "flex", gap: 8, justifyContent: "flex-end", flexWrap: "wrap" }}>
            <button className="btn btn-secondary btn-sm" onClick={() => setShowPayslip(true)}>
              📄 명세서 보기
            </button>
            {!confirmed ? (
              <button
                className="btn btn-primary btn-sm"
                onClick={handleConfirm}
                disabled={confirmLoading}
                style={{ minWidth: 100 }}
              >
                {confirmLoading ? "저장 중…" : "✓ 지급 확정"}
              </button>
            ) : (
              <button
                className="btn btn-secondary btn-sm"
                onClick={handleCancelConfirm}
                disabled={confirmLoading}
                style={{ color: "var(--ink-30)", fontSize: 11 }}
              >
                {confirmLoading ? "처리 중…" : "확정 취소"}
              </button>
            )}
          </div>
          {confirmErr && (
            <div style={{ marginTop: 8, textAlign: "right", fontSize: 12, color: "var(--red)" }}>⚠ {confirmErr}</div>
          )}
        </>
      )}

      {/* 강사료 지급명세서 모달 */}
      {showPayslip && effResult && selectedTeacher && (
        <div className="modal-backdrop" onClick={() => setShowPayslip(false)}>
          <div className="modal" style={{ maxWidth: 580, width: "96vw" }} onClick={e => e.stopPropagation()}>
            <div className="modal-h" style={{ borderBottom: "none", paddingBottom: 0 }}>
              <span style={{ fontFamily: "'Noto Serif KR',serif", fontWeight: 700, fontSize: 14 }}>강사료 지급명세서</span>
            </div>
            <div className="modal-b" style={{ paddingTop: 8 }}>
              {/* ── 명세서 본체 (인보이스 레이아웃) ── */}
              <div style={{ background: "var(--paper)", border: "1px solid var(--border)", borderRadius: 6, overflow: "hidden", fontFamily: "'Noto Sans KR',sans-serif" }}>

                {/* Blue top stripe */}
                <div style={{ height: 5, background: "var(--blue)" }} />

                {/* Header 2-column */}
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", padding: "18px 22px 14px" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                    <img src="/logo.png" alt="RYE-K" style={{ width: 38, height: 38, flexShrink: 0 }} />
                    <div>
                      <div style={{ fontFamily: "'Noto Serif KR',serif", fontSize: 15, fontWeight: 700, color: "var(--blue)", letterSpacing: "0.06em" }}>RYE-K</div>
                      <div style={{ fontSize: 10, color: "var(--ink-30)", marginTop: 1 }}>K-Culture Center</div>
                    </div>
                  </div>
                  <div style={{ textAlign: "right" }}>
                    <div style={{ fontFamily: "'Noto Serif KR',serif", fontSize: 20, fontWeight: 700, color: "var(--ink)", letterSpacing: "0.28em" }}>지급명세서</div>
                    <div style={{ fontSize: 10, color: "var(--ink-30)", marginTop: 2 }}>강사료  ·  위탁용역수수료</div>
                  </div>
                </div>

                {/* Divider */}
                <div style={{ height: 1, background: "var(--border)", margin: "0 22px" }} />

                {/* Info 2-column */}
                <div style={{ display: "flex", justifyContent: "space-between", padding: "12px 22px 14px" }}>
                  <div>
                    <div style={{ fontSize: 9, fontWeight: 600, color: "var(--ink-30)", letterSpacing: "0.5px", marginBottom: 5 }}>수령인</div>
                    <div style={{ fontFamily: "'Noto Serif KR',serif", fontSize: 14, fontWeight: 700, color: "var(--ink)" }}>{selectedTeacher.name} 강사</div>
                    <div style={{ fontSize: 11, color: "var(--ink-60)", marginTop: 2 }}>정산 요율 {selectedTeacher.settlementRate || 0}%</div>
                  </div>
                  <div style={{ textAlign: "right" }}>
                    <div style={{ fontSize: 9, fontWeight: 600, color: "var(--ink-30)", letterSpacing: "0.5px", marginBottom: 5 }}>발행 정보</div>
                    <div style={{ fontFamily: "'Noto Serif KR',serif", fontSize: 13, fontWeight: 700, color: "var(--ink)" }}>{monthLabel(month)}</div>
                    <div style={{ fontSize: 11, color: "var(--ink-60)", marginTop: 2 }}>발행일 {new Date().toLocaleDateString("ko-KR")}</div>
                  </div>
                </div>

                {/* Table */}
                <div style={{ margin: "0 10px 14px" }}>
                  {/* Table header bar */}
                  <div style={{ background: "var(--blue)", display: "flex", justifyContent: "space-between", padding: "8px 14px", borderRadius: "3px 3px 0 0" }}>
                    <span style={{ color: "#fff", fontSize: 11, fontWeight: 600 }}>내역</span>
                    <span style={{ color: "#fff", fontSize: 11, fontWeight: 600 }}>기여액</span>
                  </div>

                  {/* Sections */}
                  {[
                    { title: "개인 레슨", rows: effResult.studentRows, getLabel: r => `${r.student.name} · ${r.lesson.instrument}` },
                    { title: "그룹 레슨", rows: effResult.groupRows, getLabel: r => `${r.instrument} · ${(r.schedule||[]).map(s=>`${s.day} ${s.time}`).join(", ")}` },
                    { title: "기관 수업", rows: effResult.instRows, getLabel: r => `${r.instName} · ${r.className}` },
                    { title: "상품 인센티브", rows: effResult.shopRows, getLabel: r => r.category },
                  ].filter(s => s.rows.length > 0).map(({ title, rows, getLabel }, si) => (
                    <div key={title}>
                      <div style={{ display: "flex", justifyContent: "space-between", background: si % 2 === 0 ? "var(--blue-lt)" : "var(--bg)", padding: "6px 14px", borderBottom: "1px solid rgba(43,58,159,.08)" }}>
                        <span style={{ fontSize: 11, fontWeight: 700, color: "var(--blue)" }}>{title}</span>
                        <span style={{ fontSize: 11, fontWeight: 700, color: "var(--blue)" }}>{fmtMoney(rows.reduce((s, r) => s + r.effectiveAmount, 0))}</span>
                      </div>
                      {rows.map((r, ri) => (
                        <div key={ri} style={{ display: "flex", justifyContent: "space-between", padding: "5px 14px 5px 26px", background: ri % 2 !== 0 ? "#FAFAFA" : "var(--paper)", borderBottom: "1px solid var(--border)" }}>
                          <span style={{ fontSize: 12, color: "var(--ink-60)" }}>{getLabel(r)}</span>
                          <span style={{ fontSize: 12, fontWeight: 600, color: "var(--green)" }}>{fmtMoney(r.effectiveAmount)}</span>
                        </div>
                      ))}
                    </div>
                  ))}

                  {/* Grand total */}
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", background: "var(--bg)", borderTop: "2px solid var(--blue)", borderRadius: "0 0 3px 3px", padding: "11px 14px" }}>
                    <span style={{ fontFamily: "'Noto Serif KR',serif", fontWeight: 700, fontSize: 13, letterSpacing: "0.2em" }}>지 급 합 계</span>
                    <span style={{ fontFamily: "'Noto Serif KR',serif", fontWeight: 700, fontSize: 17, color: "var(--green)" }}>{fmtMoney(effResult.effectiveGrandTotal)}</span>
                  </div>
                </div>

                {/* Footer */}
                <div style={{ height: 1, background: "var(--border)", margin: "0 22px" }} />
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "12px 22px 14px" }}>
                  {/* Butterfly stamp */}
                  <div style={{ width: 56, height: 56, background: "var(--red)", borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", transform: "rotate(-10deg)", flexShrink: 0 }}>
                    <img src="/logo_white.png" alt="" style={{ width: 42, height: 42, transform: "rotate(10deg)" }} />
                  </div>
                  <div style={{ textAlign: "right", fontSize: 10, color: "var(--ink-30)", lineHeight: 1.9 }}>
                    <div>위탁용역수수료 지급 확인서</div>
                    <div>{confirmed ? `확정일 ${new Date().toLocaleDateString("ko-KR", { year: "numeric", month: "long", day: "numeric" })}` : "지급 미확정"}</div>
                  </div>
                </div>

              </div>
            </div>
            {shareErr && <div style={{ padding: "0 16px 4px", fontSize: 12, color: "var(--red)" }}>⚠ {shareErr}</div>}
            <div className="modal-f" style={{ display: "flex", gap: 8 }}>
              <button className="btn btn-primary" onClick={handleGenerateImage} disabled={sharing} style={{ flex: 1 }}>
                {sharing ? "생성 중…" : "📤 이미지 저장 / 공유"}
              </button>
              {!confirmed && (
                <button className="btn btn-secondary" onClick={handleConfirm} disabled={confirmLoading}>
                  {confirmLoading ? "저장 중…" : "✓ 지급 확정"}
                </button>
              )}
              <button className="btn btn-secondary" onClick={() => setShowPayslip(false)}>닫기</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function Section({ title, total, children }) {
  return (
    <div style={{ marginBottom: 16 }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 8 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
          <span style={{ width: 3, height: 13, background: "linear-gradient(180deg,var(--blue),var(--gold))", display: "inline-block", borderRadius: 2 }} />
          <span style={{ fontFamily: "'Noto Serif KR',serif", fontSize: 13, fontWeight: 700 }}>{title}</span>
        </div>
        <span style={{ fontSize: 12, color: "var(--green)", fontWeight: 700 }}>소계 {fmtMoney(total)}</span>
      </div>
      <div className="log-table-wrap">{children}</div>
    </div>
  );
}

function TotalRow({ label, val }) {
  return (
    <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13 }}>
      <span style={{ color: "var(--ink-60)" }}>{label}</span>
      <span style={{ fontWeight: 600 }}>{fmtMoney(val)}</span>
    </div>
  );
}
