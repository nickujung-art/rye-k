import { useState, useMemo } from "react";
import { calcLessonFeeWithFallback, calcTotalFee, fmtMoney, monthLabel, canManageAll } from "../../utils.js";
import { THIS_MONTH } from "../../constants.jsx";

const ATTENDED = ["present", "late", "excused"];

function findGroupMembers(student, lesson, allStudents) {
  return allStudents.filter(s => {
    if (s.id === student.id || s.isInstitution) return false;
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

function calcResult({ teacher, month, allStudents, attendance, payments, institutions, instantCharges, feePresets }) {
  const rate = teacher.settlementRate || 0;
  const processedGroups = new Set();
  const studentRows = [];
  const groupRows = [];

  const teacherStudents = allStudents.filter(s =>
    !s.isInstitution &&
    (s.teacherId === teacher.id || (s.lessons || []).some(l => l.teacherId === teacher.id))
  );

  teacherStudents.forEach(student => {
    const teacherLessons = (student.lessons || []).filter(l => l.teacherId === teacher.id);
    if (teacherLessons.length === 0) return;

    const studentTotalFee = calcTotalFee(student, feePresets);
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
          const gTotalFee = calcTotalFee(gs, feePresets);
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

  // 기관 수업
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
        instName: inst.name, className: cls.name,
        total, attended, attRate, base,
        settlement: Math.round(base * attRate * rate / 100),
        hasNoRecords: total === 0,
      });
    });
  });

  // 상품 인센티브
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

export default function SettlementView({
  teachers, students, attendance, payments, institutions,
  instantCharges, feePresets, shopItems, currentUser,
}) {
  const [selectedTeacherId, setSelectedTeacherId] = useState("");
  const [month, setMonth] = useState(THIS_MONTH);
  const [calculated, setCalculated] = useState(false);
  const [copied, setCopied] = useState(false);

  const availableTeachers = teachers.filter(t => canManageAll(currentUser?.role) || t.id === currentUser?.id);
  const selectedTeacher = teachers.find(t => t.id === selectedTeacherId);

  const result = useMemo(() => {
    if (!selectedTeacher || !calculated) return null;
    return calcResult({ teacher: selectedTeacher, month, allStudents: students, attendance, payments, institutions, instantCharges, feePresets });
  }, [selectedTeacher, month, students, attendance, payments, institutions, instantCharges, feePresets, calculated]);

  const handleCalc = () => {
    if (!selectedTeacherId) return;
    setCalculated(false);
    setTimeout(() => setCalculated(true), 0);
  };

  const handleCopyTsv = async () => {
    if (!result) return;
    const lines = ["== 개인 레슨 ==", "학생\t악기\t총수업\t출석\t출석률\t수납확정(원)\t기여액(원)"];
    result.studentRows.forEach(r => {
      lines.push(`${r.student.name}\t${r.lesson.instrument}\t${r.total}\t${r.attended}\t${Math.round(r.attRate * 100)}%\t${Math.round(r.base)}\t${r.settlement}`);
    });
    if (result.groupRows.length) {
      lines.push("", "== 그룹 레슨 ==", "악기\t시간\t구성원\t총수업\t진행\t진행률\t기여액(원)");
      result.groupRows.forEach(r => {
        const sched = (r.schedule || []).map(s => `${s.day}${s.time}`).join("/");
        lines.push(`${r.instrument}\t${sched}\t${r.members.join(",")}\t${r.totalDates}\t${r.conductedDates}\t${Math.round(r.groupRate * 100)}%\t${r.settlement}`);
      });
    }
    if (result.instRows.length) {
      lines.push("", "== 기관 수업 ==", "기관\t반명\t총수업\t출석\t출석률\t반수강료(원)\t기여액(원)");
      result.instRows.forEach(r => {
        lines.push(`${r.instName}\t${r.className}\t${r.total}\t${r.attended}\t${Math.round(r.attRate * 100)}%\t${r.base}\t${r.settlement}`);
      });
    }
    if (result.shopRows.length) {
      lines.push("", "== 상품 인센티브 ==", "카테고리\t건수\t판매액(원)\t요율\t인센티브(원)");
      result.shopRows.forEach(r => lines.push(`${r.category}\t${r.count}\t${r.total}\t${r.rate}%\t${r.incentive}`));
    }
    lines.push("", `레슨 정산 합계\t\t\t\t\t\t${result.lessonTotal}`);
    lines.push(`상품 인센티브\t\t\t\t\t\t${result.shopTotal}`);
    lines.push(`최종 정산\t\t\t\t\t\t${result.grandTotal}`);
    try { await navigator.clipboard.writeText(lines.join("\n")); }
    catch { const ta = document.createElement("textarea"); ta.value = lines.join("\n"); document.body.appendChild(ta); ta.select(); document.execCommand("copy"); document.body.removeChild(ta); }
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
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
          <select className="sel" value={selectedTeacherId} onChange={e => { setSelectedTeacherId(e.target.value); setCalculated(false); }}>
            <option value="">-- 강사 선택 --</option>
            {availableTeachers.map(t => (
              <option key={t.id} value={t.id}>
                {t.name}{t.settlementRate ? ` (${t.settlementRate}%)` : ""}
              </option>
            ))}
          </select>
        </div>
        <div style={{ flex: "1 1 130px", minWidth: 120 }}>
          <div style={{ fontSize: 11, color: "var(--ink-30)", fontWeight: 600, marginBottom: 4 }}>정산 월</div>
          <input className="inp" type="month" value={month} onChange={e => { setMonth(e.target.value); setCalculated(false); }} />
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

      {!result && <div style={{ textAlign: "center", padding: "60px 0", color: "var(--ink-30)", fontSize: 13 }}>강사와 월을 선택한 후 [정산 계산] 버튼을 누르세요.</div>}

      {result && (
        <>
          {/* 헤더 요약 */}
          <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 16, padding: "12px 16px", background: "var(--blue-lt)", border: "1px solid rgba(43,58,159,.15)", borderRadius: 10 }}>
            <div style={{ flex: 1 }}>
              <span style={{ fontFamily: "'Noto Serif KR',serif", fontWeight: 700, fontSize: 15 }}>{selectedTeacher.name}</span>
              <span style={{ fontSize: 12, color: "var(--ink-60)", marginLeft: 8 }}>{monthLabel(month)} 정산</span>
            </div>
            <div style={{ fontSize: 12, color: "var(--blue)", fontWeight: 600 }}>정산 요율 {selectedTeacher.settlementRate || 0}%</div>
          </div>

          {/* 개인 레슨 */}
          {result.studentRows.length > 0 && (
            <Section title="개인 레슨" total={result.studentRows.reduce((s, r) => s + r.settlement, 0)}>
              <table className="log-table">
                <thead><tr><th>학생</th><th>악기</th><th style={{ textAlign: "right" }}>총수업</th><th style={{ textAlign: "right" }}>출석</th><th style={{ textAlign: "right" }}>출석률</th><th style={{ textAlign: "right" }}>수납확정</th><th style={{ textAlign: "right" }}>기여액</th></tr></thead>
                <tbody>
                  {result.studentRows.map((r, i) => (
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
                      <td style={{ textAlign: "right", fontWeight: 700, color: "var(--green)" }}>{fmtMoney(r.settlement)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </Section>
          )}

          {/* 그룹 레슨 */}
          {result.groupRows.length > 0 && (
            <Section title="그룹 레슨" total={result.groupRows.reduce((s, r) => s + r.settlement, 0)}>
              <table className="log-table">
                <thead><tr><th>악기</th><th>시간</th><th>구성원</th><th style={{ textAlign: "right" }}>총수업</th><th style={{ textAlign: "right" }}>진행</th><th style={{ textAlign: "right" }}>진행률</th><th style={{ textAlign: "right" }}>기여액</th></tr></thead>
                <tbody>
                  {result.groupRows.map((r, i) => (
                    <tr key={i} style={{ opacity: r.hasNoRecords ? 0.6 : 1 }}>
                      <td>{r.instrument}{r.hasNoRecords && <span style={{ fontSize: 9, background: "var(--gold-lt)", color: "var(--gold-dk)", borderRadius: 4, padding: "1px 5px", marginLeft: 4, fontWeight: 600 }}>출석없음</span>}</td>
                      <td style={{ color: "var(--ink-60)", fontSize: 11 }}>{(r.schedule || []).map(s => `${s.day} ${s.time}`).join(", ")}</td>
                      <td style={{ fontSize: 11 }}>{r.members.join(", ")}</td>
                      <td style={{ textAlign: "right" }}>{r.totalDates}회</td>
                      <td style={{ textAlign: "right" }}>{r.conductedDates}회</td>
                      <td style={{ textAlign: "right" }}>{r.totalDates > 0 ? `${Math.round(r.groupRate * 100)}%` : "–"}</td>
                      <td style={{ textAlign: "right", fontWeight: 700, color: "var(--green)" }}>{fmtMoney(r.settlement)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </Section>
          )}

          {/* 기관 수업 */}
          {result.instRows.length > 0 && (
            <Section title="기관 수업" total={result.instRows.reduce((s, r) => s + r.settlement, 0)}>
              <table className="log-table">
                <thead><tr><th>기관</th><th>반명</th><th style={{ textAlign: "right" }}>총수업</th><th style={{ textAlign: "right" }}>출석</th><th style={{ textAlign: "right" }}>출석률</th><th style={{ textAlign: "right" }}>반수강료</th><th style={{ textAlign: "right" }}>기여액</th></tr></thead>
                <tbody>
                  {result.instRows.map((r, i) => (
                    <tr key={i} style={{ opacity: r.hasNoRecords ? 0.6 : 1 }}>
                      <td>{r.instName}{r.hasNoRecords && <span style={{ fontSize: 9, background: "var(--gold-lt)", color: "var(--gold-dk)", borderRadius: 4, padding: "1px 5px", marginLeft: 4, fontWeight: 600 }}>출석없음</span>}</td>
                      <td>{r.className}</td>
                      <td style={{ textAlign: "right" }}>{r.total}회</td>
                      <td style={{ textAlign: "right" }}>{r.attended}회</td>
                      <td style={{ textAlign: "right" }}>{r.total > 0 ? `${Math.round(r.attRate * 100)}%` : "–"}</td>
                      <td style={{ textAlign: "right" }}>{fmtMoney(r.base)}</td>
                      <td style={{ textAlign: "right", fontWeight: 700, color: "var(--green)" }}>{fmtMoney(r.settlement)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </Section>
          )}

          {/* 상품 인센티브 */}
          {result.shopRows.length > 0 && (
            <Section title="상품 인센티브" total={result.shopRows.reduce((s, r) => s + r.incentive, 0)}>
              <table className="log-table">
                <thead><tr><th>카테고리</th><th style={{ textAlign: "right" }}>건수</th><th style={{ textAlign: "right" }}>판매액</th><th style={{ textAlign: "right" }}>요율</th><th style={{ textAlign: "right" }}>인센티브</th></tr></thead>
                <tbody>
                  {result.shopRows.map((r, i) => (
                    <tr key={i}>
                      <td>{r.category}</td>
                      <td style={{ textAlign: "right" }}>{r.count}건</td>
                      <td style={{ textAlign: "right" }}>{fmtMoney(r.total)}</td>
                      <td style={{ textAlign: "right" }}>{r.rate}%</td>
                      <td style={{ textAlign: "right", fontWeight: 700, color: "var(--green)" }}>{fmtMoney(r.incentive)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </Section>
          )}

          {/* 결과 없을 때 */}
          {result.studentRows.length === 0 && result.groupRows.length === 0 && result.instRows.length === 0 && (
            <div style={{ textAlign: "center", padding: "40px 0", color: "var(--ink-30)", fontSize: 13 }}>이 달 수업 기록이 없습니다.</div>
          )}

          {/* 최종 합계 */}
          <div style={{ marginTop: 16, padding: "16px 20px", background: "var(--bg)", border: "2px solid var(--blue)", borderRadius: 12 }}>
            <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              <Row label="레슨 정산 합계" val={result.lessonTotal} />
              {result.shopTotal > 0 && <Row label="상품 인센티브" val={result.shopTotal} />}
              <div style={{ borderTop: "1px solid var(--border)", marginTop: 4, paddingTop: 8, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <span style={{ fontFamily: "'Noto Serif KR',serif", fontWeight: 700, fontSize: 15 }}>최종 정산</span>
                <span style={{ fontFamily: "'Noto Serif KR',serif", fontWeight: 700, fontSize: 18, color: "var(--green)" }}>{fmtMoney(result.grandTotal)}</span>
              </div>
            </div>
          </div>

          <div style={{ marginTop: 12, display: "flex", justifyContent: "flex-end" }}>
            <button className="btn btn-secondary btn-sm" onClick={handleCopyTsv}>{copied ? "✓ 복사됨" : "📋 엑셀 복사"}</button>
          </div>
        </>
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

function Row({ label, val }) {
  return (
    <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13 }}>
      <span style={{ color: "var(--ink-60)" }}>{label}</span>
      <span style={{ fontWeight: 600 }}>{fmtMoney(val)}</span>
    </div>
  );
}
