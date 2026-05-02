import { useState } from "react";
import { THIS_MONTH, TODAY_STR } from "../../constants.jsx";
import { calcAge, isMinor, fmtMoney, fmtDate, monthLabel, expandInstitutionsToMembers } from "../../utils.js";

// ── ANALYTICS VIEW (현황 분석 — 관리자 전용) ─────────────────────────────────
export default function AnalyticsView({ students, teachers, attendance, payments, categories, institutions }) {
  const [selectedMonth, setSelectedMonth] = useState(THIS_MONTH);
  // Last 12 months options
  const monthOptions = (() => {
    const arr = [];
    for (let i = 0; i < 12; i++) {
      const d = new Date(); d.setDate(1); d.setMonth(d.getMonth() - i);
      arr.push(d.toISOString().slice(0, 7));
    }
    return arr;
  })();
  const active = students.filter(s => (s.status||"active") === "active");
  const paused = students.filter(s => s.status === "paused");
  const withdrawn = students.filter(s => s.status === "withdrawn");

  // ── 알게 된 경로 분석
  const referralMap = {};
  students.forEach(s => {
    const r = s.registration?.referral || "미기재";
    referralMap[r] = (referralMap[r] || 0) + 1;
  });
  const referralTotal = Object.values(referralMap).reduce((a,b)=>a+b, 0);
  const referralSorted = Object.entries(referralMap).sort((a,b)=>b[1]-a[1]);
  const refColors = ["var(--blue)","var(--red)","var(--green)","var(--gold-dk)","#7C3AED","var(--blue-md)","var(--gold)","var(--red-dk)"];

  // ── 수업 목적 분석
  const purposeMap = {};
  students.forEach(s => {
    const p = s.registration?.purpose || "미기재";
    purposeMap[p] = (purposeMap[p] || 0) + 1;
  });
  const purposeSorted = Object.entries(purposeMap).sort((a,b)=>b[1]-a[1]);

  // ── 연령대 분포
  const ageGroups = { "미취학(~6)":0, "초등(7~12)":0, "중등(13~15)":0, "고등(16~18)":0, "성인(19~)":0, "미기재":0 };
  students.forEach(s => {
    const a = calcAge(s.birthDate);
    if (a === null) ageGroups["미기재"]++;
    else if (a <= 6) ageGroups["미취학(~6)"]++;
    else if (a <= 12) ageGroups["초등(7~12)"]++;
    else if (a <= 15) ageGroups["중등(13~15)"]++;
    else if (a <= 18) ageGroups["고등(16~18)"]++;
    else ageGroups["성인(19~)"]++;
  });

  // ── 악기별 수강 현황
  const instMap = {};
  active.forEach(s => {
    (s.lessons||[]).forEach(l => { instMap[l.instrument] = (instMap[l.instrument]||0) + 1; });
  });
  const instSorted = Object.entries(instMap).sort((a,b)=>b[1]-a[1]);

  // ── 강사별 회원 수
  const isOf = (s, tid) => s.teacherId === tid || (s.lessons || []).some(l => l.teacherId === tid);
  const teacherLoad = teachers.map(t => ({
    name: t.name, role: t.role,
    count: active.filter(s => isOf(s, t.id)).length,
    total: students.filter(s => isOf(s, t.id)).length,
  })).sort((a,b)=>b.count-a.count);

  // ── 선택 월 출석률
  const monthAtt = attendance.filter(a => a.date?.startsWith(selectedMonth));
  const mTotal = monthAtt.length;
  const mPresent = monthAtt.filter(a => a.status === "present").length;
  const mLate = monthAtt.filter(a => a.status === "late").length;
  const mAbsent = monthAtt.filter(a => a.status === "absent").length;
  const mRate = mTotal > 0 ? Math.round((mPresent + mLate) / mTotal * 100) : 0;

  // ── 선택 월 수납 현황
  const monthPay = payments.filter(p => p.month === selectedMonth);
  const paidCount = monthPay.filter(p => p.paid).length;
  const unpaidCount = active.length - paidCount;
  const totalRevenue = monthPay.filter(p => p.paid).reduce((s, p) => s + (p.paidAmount || p.amount || 0), 0);

  // ── 월별 등록 추이 (최근 6개월)
  const monthlyEnroll = [];
  for (let i = 5; i >= 0; i--) {
    const d = new Date(); d.setMonth(d.getMonth() - i);
    const ym = d.toISOString().slice(0,7);
    const count = students.filter(s => s.createdAt && new Date(s.createdAt).toISOString().slice(0,7) === ym).length;
    monthlyEnroll.push({ label: `${d.getMonth()+1}월`, count });
  }
  const maxEnroll = Math.max(...monthlyEnroll.map(m=>m.count), 1);

  // Monthly revenue + payment rate trend (last 12 months)
  const monthlyRevenue = [];
  for (let i = 11; i >= 0; i--) {
    const d = new Date(); d.setDate(1); d.setMonth(d.getMonth() - i);
    const ym = d.toISOString().slice(0, 7);
    const monthPays = payments.filter(p => p.month === ym);
    const paidPays = monthPays.filter(p => p.paid);
    const revenue = paidPays.reduce((s, p) => s + (p.paidAmount || p.amount || 0), 0);
    const rate = monthPays.length > 0 ? Math.round(paidPays.length / monthPays.length * 100) : -1;
    monthlyRevenue.push({ label: `${d.getMonth()+1}월`, ym, revenue, paidCount: paidPays.length, totalCount: monthPays.length, rate });
  }
  const maxRevenue = Math.max(...monthlyRevenue.map(m => m.revenue), 1);
  const totalRevenue12 = monthlyRevenue.reduce((s, m) => s + m.revenue, 0);

  const BarChart = ({ data, max, colorFn }) => (
    <div style={{display:"flex",flexDirection:"column",gap:6}}>
      {data.map(([label, count], i) => (
        <div key={label} style={{display:"flex",alignItems:"center",gap:8}}>
          <div style={{width:80,fontSize:11.5,color:"var(--ink-60)",textAlign:"right",flexShrink:0,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{label}</div>
          <div style={{flex:1,background:"var(--ink-10)",height:20,borderRadius:4,overflow:"hidden"}}>
            <div style={{width:`${Math.max(2,(count/max)*100)}%`,height:"100%",background:colorFn?colorFn(i):"var(--blue)",borderRadius:4,transition:"width .3s"}} />
          </div>
          <div style={{width:48,fontSize:12,fontWeight:600,color:"var(--ink)",textAlign:"right"}}>{count}명</div>
          {referralTotal > 0 && max === referralTotal && <div style={{width:36,fontSize:11,color:"var(--ink-30)",textAlign:"right"}}>{Math.round(count/referralTotal*100)}%</div>}
        </div>
      ))}
    </div>
  );

  return (
    <div id="analytics-report">
      <div className="ph"><div><h1>현황 분석</h1><div className="ph-sub">관리자 전용 · 마케팅 · 보고</div></div></div>

      {/* Month Filter + Print Toolbar */}
      <div className="no-print" style={{display:"flex",alignItems:"center",gap:8,marginBottom:14,flexWrap:"wrap"}}>
        <label style={{fontSize:12,color:"var(--ink-60)",fontWeight:600}}>📅 분석 월</label>
        <select className="sel" style={{flex:"0 0 auto",minWidth:140}} value={selectedMonth} onChange={e=>setSelectedMonth(e.target.value)}>
          {monthOptions.map(m => <option key={m} value={m}>{monthLabel(m)}{m===THIS_MONTH?" (이번달)":""}</option>)}
        </select>
        <button className="btn btn-secondary btn-sm" onClick={()=>window.print()} style={{marginLeft:"auto"}}>🖨 리포트 출력 / PDF</button>
      </div>

      {/* Print-only header */}
      <div style={{display:"none"}} className="print-only" />
      <div className="dash-card" style={{marginBottom:10,background:"var(--bg)"}}>
        <div style={{fontSize:11,color:"var(--ink-30)",letterSpacing:.5,fontWeight:600,marginBottom:4}}>RYE-K K-CULTURE CENTER</div>
        <div style={{fontSize:16,fontWeight:700,fontFamily:"'Noto Serif KR',serif"}}>{monthLabel(selectedMonth)} 현황 리포트</div>
        <div style={{fontSize:11,color:"var(--ink-30)",marginTop:4}}>출력일: {fmtDate(TODAY_STR)} · 재원생 {active.length}명 · 강사 {teachers.length}명</div>
      </div>

      {/* Overview Stats */}
      <div className="stat-grid" style={{gridTemplateColumns:"repeat(4,1fr)"}}>
        <div className="stat-card"><div className="stat-num">{active.length}</div><div className="stat-label">재원생</div></div>
        <div className="stat-card"><div className="stat-num" style={{color:"var(--gold-dk)"}}>{paused.length}</div><div className="stat-label">휴원</div></div>
        <div className="stat-card"><div className="stat-num" style={{color:"var(--ink-30)"}}>{withdrawn.length}</div><div className="stat-label">퇴원</div></div>
        <div className="stat-card"><div className="stat-num" style={{color:"var(--green)"}}>{teachers.length}</div><div className="stat-label">강사</div></div>
      </div>

      {/* Referral Source */}
      <div className="dash-card">
        <div className="dash-card-title">알게 된 경로 분석</div>
        {referralSorted.length > 0 ? (
          <BarChart data={referralSorted} max={referralTotal} colorFn={i=>refColors[i%refColors.length]} />
        ) : <div style={{fontSize:12,color:"var(--ink-30)"}}>등록 데이터가 없습니다.</div>}
      </div>

      {/* Purpose */}
      <div className="dash-card">
        <div className="dash-card-title">수업 목적 분포</div>
        {purposeSorted.length > 0 ? (
          <div style={{display:"flex",gap:6,flexWrap:"wrap"}}>
            {purposeSorted.map(([label, count]) => (
              <div key={label} style={{background:"var(--bg)",border:"1px solid var(--border)",borderRadius:8,padding:"8px 12px",textAlign:"center",minWidth:70}}>
                <div style={{fontSize:16,fontWeight:700,color:"var(--blue)",fontFamily:"'Noto Serif KR',serif"}}>{count}</div>
                <div style={{fontSize:11,color:"var(--ink-30)",marginTop:2}}>{label}</div>
              </div>
            ))}
          </div>
        ) : <div style={{fontSize:12,color:"var(--ink-30)"}}>데이터 없음</div>}
      </div>

      {/* Age Distribution */}
      <div className="dash-card">
        <div className="dash-card-title">연령대 분포</div>
        <BarChart data={Object.entries(ageGroups).filter(([,c])=>c>0)} max={Math.max(...Object.values(ageGroups),1)} colorFn={i=>["#7C3AED","var(--blue)","var(--green)","var(--gold-dk)","var(--red)","var(--ink-30)"][i%6]} />
        <div style={{marginTop:10,display:"flex",gap:10,fontSize:12}}>
          <span style={{color:"var(--blue)",fontWeight:600}}>미성년 {students.filter(s=>isMinor(s.birthDate)).length}명</span>
          <span style={{color:"var(--green)",fontWeight:600}}>성인 {students.filter(s=>!isMinor(s.birthDate)&&s.birthDate).length}명</span>
        </div>
      </div>

      {/* Instrument Popularity */}
      <div className="dash-card">
        <div className="dash-card-title">과목별 수강 현황 (재원생)</div>
        {instSorted.length > 0 ? (
          <BarChart data={instSorted} max={Math.max(...instSorted.map(([,c])=>c),1)} />
        ) : <div style={{fontSize:12,color:"var(--ink-30)"}}>데이터 없음</div>}
      </div>

      {/* Teacher Workload */}
      <div className="dash-card">
        <div className="dash-card-title">강사별 담당 회원</div>
        {teacherLoad.map(t => (
          <div key={t.name} style={{display:"flex",alignItems:"center",gap:8,marginBottom:6}}>
            <div style={{width:60,fontSize:12,fontWeight:500,color:"var(--ink)",flexShrink:0}}>{t.name}</div>
            <div style={{flex:1,background:"var(--ink-10)",height:18,borderRadius:4,overflow:"hidden"}}>
              <div style={{width:`${Math.max(2,(t.count/Math.max(...teacherLoad.map(x=>x.count),1))*100)}%`,height:"100%",background:"linear-gradient(90deg,var(--blue),var(--blue-md))",borderRadius:4}} />
            </div>
            <div style={{fontSize:12,fontWeight:600,color:"var(--ink)",width:50,textAlign:"right"}}>{t.count}명</div>
            {t.role === "manager" && <span className="tag tag-mgr" style={{fontSize:9}}>매니저</span>}
          </div>
        ))}
      </div>

      {/* Monthly Enrollment Trend */}
      <div className="dash-card">
        <div className="dash-card-title">월별 신규 등록 추이</div>
        <div style={{display:"flex",alignItems:"flex-end",gap:8,height:100,padding:"0 4px"}}>
          {monthlyEnroll.map((m, i) => (
            <div key={i} style={{flex:1,display:"flex",flexDirection:"column",alignItems:"center",gap:4}}>
              <div style={{fontSize:11,fontWeight:600,color:m.count>0?"var(--blue)":"var(--ink-30)"}}>{m.count}</div>
              <div style={{width:"100%",background:m.count>0?"var(--blue)":"var(--ink-10)",borderRadius:"4px 4px 0 0",height:`${Math.max(4,(m.count/maxEnroll)*70)}px`,transition:"height .3s"}} />
              <div style={{fontSize:10,color:"var(--ink-30)"}}>{m.label}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Monthly Revenue Trend */}
      <div className="dash-card">
        <div className="dash-card-title">월별 매출 추이 <span style={{fontSize:11,color:"var(--ink-30)",fontWeight:400,fontFamily:"inherit"}}>— 최근 12개월</span></div>
        <div style={{display:"flex",alignItems:"flex-end",gap:3,height:120,padding:"0 2px",overflowX:"auto"}}>
          {monthlyRevenue.map((m, i) => (
            <div key={i} style={{flex:"0 0 auto",minWidth:34,display:"flex",flexDirection:"column",alignItems:"center",gap:3}}>
              <div style={{fontSize:9.5,fontWeight:600,color:m.revenue>0?"var(--green)":"var(--ink-30)",whiteSpace:"nowrap",textAlign:"center"}}>
                {m.revenue > 0 ? (m.revenue >= 1000000 ? `${Math.round(m.revenue/10000)}만` : `${Math.round(m.revenue/1000)}천`) : ""}
              </div>
              <div style={{
                width:24,
                background: m.revenue > 0 ? (m.ym === selectedMonth ? "var(--blue)" : "var(--green)") : "var(--ink-10)",
                borderRadius:"3px 3px 0 0",
                height:`${Math.max(3, (m.revenue/maxRevenue)*72)}px`,
                transition:"height .3s",
                flexShrink:0,
              }} />
              <div style={{fontSize:9.5,color:m.ym===selectedMonth?"var(--blue)":"var(--ink-30)",fontWeight:m.ym===selectedMonth?700:400}}>{m.label}</div>
            </div>
          ))}
        </div>
        <div style={{fontSize:11,color:"var(--ink-30)",marginTop:8}}>
          12개월 누계: <strong style={{color:"var(--green)",fontFamily:"'Noto Serif KR',serif"}}>{fmtMoney(totalRevenue12)}</strong>
          <span style={{marginLeft:12}}>월평균: <strong style={{color:"var(--ink)"}}>{fmtMoney(Math.round(totalRevenue12 / Math.max(monthlyRevenue.filter(m=>m.revenue>0).length,1)))}</strong></span>
        </div>
      </div>

      {/* Monthly Payment Rate Trend */}
      <div className="dash-card">
        <div className="dash-card-title">월별 수납율 <span style={{fontSize:11,color:"var(--ink-30)",fontWeight:400,fontFamily:"inherit"}}>— 최근 12개월</span></div>
        <div style={{display:"flex",flexWrap:"wrap",gap:6}}>
          {monthlyRevenue.map((m, i) => {
            const noData = m.rate === -1;
            const bg = noData ? "var(--bg)" : m.rate >= 80 ? "var(--green-lt)" : m.rate >= 50 ? "var(--gold-lt)" : "var(--red-lt)";
            const col = noData ? "var(--ink-30)" : m.rate >= 80 ? "var(--green)" : m.rate >= 50 ? "var(--gold-dk)" : "var(--red)";
            const brd = noData ? "var(--border)" : m.rate >= 80 ? "rgba(26,122,64,.25)" : m.rate >= 50 ? "rgba(200,136,0,.25)" : "rgba(232,40,28,.25)";
            return (
              <div key={i} style={{background:bg,border:`1.5px solid ${m.ym===selectedMonth?"var(--blue)":brd}`,borderRadius:8,padding:"7px 10px",textAlign:"center",minWidth:48,transition:"background .2s"}}>
                <div style={{fontSize:15,fontWeight:700,color:m.ym===selectedMonth?"var(--blue)":col,fontFamily:"'Noto Serif KR',serif"}}>{noData ? "—" : `${m.rate}%`}</div>
                <div style={{fontSize:9.5,color:"var(--ink-30)",marginTop:1,fontWeight:m.ym===selectedMonth?700:400}}>{m.label}</div>
                {!noData && <div style={{fontSize:9,color:"var(--ink-30)"}}>{m.paidCount}/{m.totalCount}</div>}
              </div>
            );
          })}
        </div>
      </div>

      {/* Selected Month Summary */}
      <div className="dash-card">
        <div className="dash-card-title">{monthLabel(selectedMonth)} 현황 요약</div>
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:8}}>
          <div style={{textAlign:"center",padding:10,background:"var(--bg)",borderRadius:8}}>
            <div style={{fontSize:22,fontWeight:700,color:mRate>=80?"var(--green)":"var(--red)",fontFamily:"'Noto Serif KR',serif"}}>{mRate}%</div>
            <div style={{fontSize:10,color:"var(--ink-30)"}}>출석률</div>
            <div style={{fontSize:10,color:"var(--ink-30)",marginTop:2}}>출석{mPresent} 결석{mAbsent} 지각{mLate}</div>
          </div>
          <div style={{textAlign:"center",padding:10,background:"var(--bg)",borderRadius:8}}>
            <div style={{fontSize:22,fontWeight:700,color:"var(--green)",fontFamily:"'Noto Serif KR',serif"}}>{paidCount}</div>
            <div style={{fontSize:10,color:"var(--ink-30)"}}>수납 완료</div>
            {unpaidCount > 0 && <div style={{fontSize:10,color:"var(--red)",marginTop:2}}>미납 {unpaidCount}명</div>}
          </div>
          <div style={{textAlign:"center",padding:10,background:"var(--bg)",borderRadius:8}}>
            <div style={{fontSize:16,fontWeight:700,color:"var(--ink)",fontFamily:"'Noto Serif KR',serif"}}>{fmtMoney(totalRevenue)}</div>
            <div style={{fontSize:10,color:"var(--ink-30)"}}>해당 월 매출</div>
          </div>
        </div>
      </div>

      {/* Consent Status */}
      <div className="dash-card">
        <div className="dash-card-title">약관 동의 현황</div>
        {(() => {
          const withConsent = students.filter(s => s.registration?.consent);
          const photoAgreed = withConsent.filter(s => s.registration?.consent?.photo?.agreed);
          return (
            <div style={{fontSize:12.5,color:"var(--ink-60)",lineHeight:1.8}}>
              <div>개인정보 동의 기록 보유: <strong style={{color:"var(--green)"}}>{withConsent.length}명</strong> / {students.length}명</div>
              <div>촬영·홍보 동의: <strong style={{color:"var(--blue)"}}>{photoAgreed.length}명</strong> · 미동의: {withConsent.length - photoAgreed.length}명</div>
              {students.length - withConsent.length > 0 && <div style={{color:"var(--ink-30)",fontSize:11}}>※ {students.length - withConsent.length}명은 신규 등록폼 이전 등록 (동의 기록 없음)</div>}
            </div>
          );
        })()}
      </div>

      {/* ── 출석률 세분화 ─── */}
      {(() => {
        const mAtt = attendance.filter(a => a.date?.startsWith(selectedMonth));
        if (mAtt.length === 0) return null;

        // 강사별 출석률
        const teacherAttMap = {};
        mAtt.forEach(a => {
          const tid = a.teacherId || "__none__";
          if (!teacherAttMap[tid]) teacherAttMap[tid] = { total:0, present:0, late:0 };
          teacherAttMap[tid].total++;
          if (a.status === "present") teacherAttMap[tid].present++;
          if (a.status === "late") teacherAttMap[tid].late++;
        });
        const teacherAttRows = Object.entries(teacherAttMap).map(([tid, v]) => {
          const t = teachers.find(t=>t.id===tid);
          return { name: t?.name || "미지정", ...v, rate: v.total>0?Math.round((v.present+v.late)/v.total*100):0 };
        }).sort((a,b)=>b.rate-a.rate);

        // 과목별 출석률 (학생의 담당 과목으로 추정)
        const instAttMap = {};
        mAtt.forEach(a => {
          const s = students.find(st=>st.id===a.studentId);
          const insts = s ? (s.lessons||[]).map(l=>l.instrument) : [];
          const key = insts.length ? insts[0] : "미지정";
          if (!instAttMap[key]) instAttMap[key] = { total:0, present:0, late:0 };
          instAttMap[key].total++;
          if (a.status === "present") instAttMap[key].present++;
          if (a.status === "late") instAttMap[key].late++;
        });
        const instAttRows = Object.entries(instAttMap).map(([k,v]) => ({
          name: k, ...v, rate: v.total>0?Math.round((v.present+v.late)/v.total*100):0
        })).sort((a,b)=>b.rate-a.rate);

        // 기관별 출석률 (isInstitution 가상회원 그룹핑)
        const allInstMembers = expandInstitutionsToMembers(institutions||[]);
        const instMemberMap = {}; // institutionId → name
        allInstMembers.forEach(m => { instMemberMap[m.id] = { institutionId: m.institutionId, institutionName: m.institutionName }; });
        const b2bAttMap = {};
        mAtt.forEach(a => {
          const meta = instMemberMap[a.studentId];
          if (!meta) return;
          const key = meta.institutionId;
          if (!b2bAttMap[key]) b2bAttMap[key] = { name: meta.institutionName, total:0, present:0, late:0 };
          b2bAttMap[key].total++;
          if (a.status === "present") b2bAttMap[key].present++;
          if (a.status === "late") b2bAttMap[key].late++;
        });
        const b2bRows = Object.values(b2bAttMap).map(v => ({
          ...v, rate: v.total>0?Math.round((v.present+v.late)/v.total*100):0
        })).sort((a,b)=>b.rate-a.rate);

        const RateBar = ({rate}) => (
          <div style={{flex:1,background:"var(--ink-10)",height:14,borderRadius:4,overflow:"hidden"}}>
            <div style={{width:`${Math.max(2,rate)}%`,height:"100%",background:rate>=80?"var(--green)":rate>=60?"var(--gold)":"var(--red)",borderRadius:4,transition:"width .3s"}}/>
          </div>
        );
        const AttRow = ({name,rate,total}) => (
          <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:6}}>
            <div style={{width:88,fontSize:11.5,color:"var(--ink-60)",flexShrink:0,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{name}</div>
            <RateBar rate={rate}/>
            <div style={{width:44,textAlign:"right",fontSize:12.5,fontWeight:700,color:rate>=80?"var(--green)":rate>=60?"var(--gold-dk)":"var(--red)",flexShrink:0}}>{rate}%</div>
            <div style={{width:36,textAlign:"right",fontSize:11,color:"var(--ink-30)",flexShrink:0}}>{total}건</div>
          </div>
        );

        return (
          <>
            <div className="dash-card">
              <div className="dash-card-title">강사별 출석률 <span style={{fontSize:11,color:"var(--ink-30)",fontWeight:400,fontFamily:"inherit"}}>— {monthLabel(selectedMonth)}</span></div>
              {teacherAttRows.map((r,i) => <AttRow key={i} name={r.name} rate={r.rate} total={r.total}/>)}
            </div>

            <div className="dash-card">
              <div className="dash-card-title">과목별 출석률 <span style={{fontSize:11,color:"var(--ink-30)",fontWeight:400,fontFamily:"inherit"}}>— {monthLabel(selectedMonth)}</span></div>
              {instAttRows.slice(0,10).map((r,i) => <AttRow key={i} name={r.name} rate={r.rate} total={r.total}/>)}
            </div>

            {b2bRows.length > 0 && (
              <div className="dash-card">
                <div className="dash-card-title">기관(B2B)별 출석률 <span style={{fontSize:11,color:"var(--ink-30)",fontWeight:400,fontFamily:"inherit"}}>— {monthLabel(selectedMonth)}</span></div>
                {b2bRows.map((r,i) => <AttRow key={i} name={r.name} rate={r.rate} total={r.total}/>)}
                <div style={{fontSize:11,color:"var(--ink-30)",marginTop:6}}>※ 기관 수업별 출석 레코드 기준</div>
              </div>
            )}
          </>
        );
      })()}
    </div>
  );
}
