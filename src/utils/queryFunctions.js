// Phase 2: 화이트리스트 쿼리 함수 — AI tool-calling 클라이언트 실행 레이어
// 반환 타입: Student[] | { ym, att, pay } (getMonthlyStats)

export const QUERY_FUNCTIONS = {
  getStudentsByStatus(data, { status }) {
    return data.students.filter(s => s.status === status && !s.isInstitution);
  },

  getRecentAbsences(data, { weeks = 4, minAbsences = 2 }) {
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - weeks * 7);
    const cutoffStr = cutoff.toISOString().slice(0, 10);
    const counts = {};
    data.attendance
      .filter(a => a.date >= cutoffStr && a.status === "absent")
      .forEach(a => { counts[a.studentId] = (counts[a.studentId] || 0) + 1; });
    return Object.entries(counts)
      .filter(([, c]) => c >= minAbsences)
      .map(([sid, c]) => ({ ...data.students.find(s => s.id === sid), _absenceCount: c }))
      .filter(s => s.id)
      .sort((a, b) => b._absenceCount - a._absenceCount);
  },

  getNewRegistrations(data, { months }) {
    const cutoff = new Date();
    cutoff.setMonth(cutoff.getMonth() - months);
    const cutoffStr = cutoff.toISOString().slice(0, 10);
    return data.students
      .filter(s => !s.isInstitution && s.startDate >= cutoffStr)
      .sort((a, b) => (b.startDate || "").localeCompare(a.startDate || ""));
  },

  getOverduePayments(data, { months = 1 }) {
    const activeStudents = data.students.filter(s => s.status === "active" && !s.isInstitution);
    const now = new Date();
    return activeStudents.filter(s => {
      for (let i = 0; i < months; i++) {
        const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
        const ym = d.toISOString().slice(0, 7);
        const pay = data.payments.find(p => p.studentId === s.id && p.month === ym);
        if (!pay || !pay.paid) return true;
      }
      return false;
    });
  },

  getTopAttendanceStudents(data, { limit = 10 }) {
    return data.students
      .filter(s => s.status === "active" && !s.isInstitution)
      .map(s => {
        const sAtt = data.attendance.filter(a => a.studentId === s.id);
        const rate = sAtt.length > 0
          ? Math.round(sAtt.filter(a => a.status === "present" || a.status === "late").length / sAtt.length * 100)
          : 0;
        return { ...s, _attRate: rate };
      })
      .sort((a, b) => b._attRate - a._attRate)
      .slice(0, limit);
  },

  getStudentsByTeacher(data, { teacherName }) {
    const teacher = data.teachers.find(t => t.name?.includes(teacherName));
    if (!teacher) return [];
    return data.students.filter(s =>
      !s.isInstitution && (
        s.teacherId === teacher.id ||
        (s.lessons || []).some(l => l.teacherId === teacher.id)
      )
    );
  },

  getStudentsByInstrument(data, { instrument }) {
    return data.students.filter(s =>
      !s.isInstitution && (s.lessons || []).some(l => l.instrument?.includes(instrument))
    );
  },

  searchStudentByName(data, { query }) {
    return data.students.filter(s => !s.isInstitution && s.name?.includes(query));
  },

  getChurnRiskStudents(data, {}) {
    function getConsecutiveAbsences(attendance, sid) {
      const sorted = attendance
        .filter(a => a.studentId === sid)
        .sort((a, b) => (b.date || "").localeCompare(a.date || ""));
      let count = 0;
      for (const a of sorted) {
        if (a.status === "absent") count++;
        else break;
      }
      return count;
    }
    function recentAttRate(attendance, sid, weeks) {
      const cutoff = new Date();
      cutoff.setDate(cutoff.getDate() - weeks * 7);
      const cutoffStr = cutoff.toISOString().slice(0, 10);
      const sAtt = attendance.filter(a => a.studentId === sid && a.date >= cutoffStr);
      if (!sAtt.length) return null;
      const present = sAtt.filter(a => a.status === "present" || a.status === "late").length;
      return Math.round(present / sAtt.length * 100);
    }
    function riskScore(consecutive, rate) {
      let s = 0;
      if (consecutive >= 4) s += 50;
      else if (consecutive >= 3) s += 40;
      else if (consecutive >= 2) s += 25;
      if (rate !== null) {
        if (rate < 40) s += 45;
        else if (rate < 60) s += 25;
        else if (rate < 75) s += 10;
      }
      return s;
    }
    return data.students
      .filter(s => s.status === "active" && !s.isInstitution)
      .map(s => {
        const consecutive = getConsecutiveAbsences(data.attendance, s.id);
        const rate = recentAttRate(data.attendance, s.id, 4);
        const score = riskScore(consecutive, rate);
        return { ...s, consecutive, rate, score };
      })
      .filter(s => s.score >= 25)
      .sort((a, b) => b.score - a.score);
  },

  getMonthlyStats(data, { ym }) {
    const att = data.attendance.filter(a => a.date?.startsWith(ym));
    const present = att.filter(a => a.status === "present").length;
    const late    = att.filter(a => a.status === "late").length;
    const absent  = att.filter(a => a.status === "absent").length;
    const total   = att.length;
    const rate    = total > 0 ? Math.round((present + late) / total * 100) : null;
    const pay     = data.payments.filter(p => p.month === ym);
    const paid    = pay.filter(p => p.paid).length;
    return { ym, att: { present, late, absent, total, rate }, pay: { total: pay.length, paid, unpaid: pay.length - paid } };
  },
};
