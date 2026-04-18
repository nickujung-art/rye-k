import { useState, useEffect, useRef } from "react";
import { db, doc, setDoc, onSnapshot, firebaseSignInAnon } from "../../firebase.js";
import { DEFAULT_CATEGORIES, TODAY_STR, CSS, DAYS, THIS_MONTH } from "../../constants.jsx";
import { compressImage, fmtPhone, uid, fmtDate, fmtDateShort, fmtDateTime, fmtMoney, monthLabel, allLessonInsts, allLessonDays, getBirthPassword } from "../../utils.js";
import { Logo, Av } from "../shared/CommonUI.jsx";
import { NoteCommentsPanel } from "../attendance/Attendance.jsx";

const COLLECTION = "appData";
async function sSet(k, v) { try { await setDoc(doc(db, COLLECTION, k), { value: v, updatedAt: Date.now() }); } catch (e) { console.error("sSet error:", k, e); } }

// ── PUBLIC REGISTRATION FORM (수강 등록 신청서 — 강사 상담용) ─────────────────
export function PublicRegisterForm() {
  const [step, setStep] = useState(1);
  const [form, setForm] = useState({
    name: "", birthDate: "", phone: "", guardianPhone: "", desiredInstruments: [], notes: "", photo: "",
    experience: "none", experienceDetail: "",
    purpose: "", purposeOther: "",
    referral: "", referralOther: "",
    teacherName: "", lessonType: "", lessonTypeOther: "",
    lessonDay: "", lessonTime: "", monthlyFee: 0, instrumentRental: false, startDate: TODAY_STR,
  });
  const [submitted, setSubmitted] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [err, setErr] = useState("");
  const [categories, setCategories] = useState(DEFAULT_CATEGORIES);
  const [privacyAgreed, setPrivacyAgreed] = useState(false);
  const [optionalAgreed, setOptionalAgreed] = useState(false);
  const [showFullPolicy, setShowFullPolicy] = useState(false);
  const [showPhotoPolicy, setShowPhotoPolicy] = useState(false);
  const fileRef = useRef();
  const set = (k, v) => { setForm(f => ({ ...f, [k]: v })); setErr(""); };

  useEffect(() => {
    // Anonymous auth for Firestore access
    firebaseSignInAnon();
    const unsub = onSnapshot(doc(db, COLLECTION, "rye-categories"), (snap) => {
      if (snap.exists()) setCategories(snap.data().value || DEFAULT_CATEGORIES);
    }, () => {});
    return () => unsub();
  }, []);

  const handlePhoto = async (e) => { const file = e.target.files?.[0]; if (!file) return; try { const compressed = await compressImage(file, 360, 0.75); set("photo", compressed); } catch(err) { setErr("사진 처리 중 오류가 발생했습니다."); } };
  const toggleInst = (inst) => { setForm(f => ({ ...f, desiredInstruments: f.desiredInstruments.includes(inst) ? f.desiredInstruments.filter(x => x !== inst) : [...f.desiredInstruments, inst] })); setErr(""); };
  const validateStep1 = () => { if (!form.name.trim()) { setErr("이름을 입력해주세요."); return false; } if (!form.birthDate) { setErr("생년월일을 입력해주세요. (My RYE-K 로그인 비밀번호로 사용됩니다)"); return false; } if (!form.phone.trim() && !form.guardianPhone.trim()) { setErr("연락처 또는 보호자 연락처를 입력해주세요."); return false; } return true; };
  const validateStep2 = () => { if (form.desiredInstruments.length === 0) { setErr("희망 과목을 하나 이상 선택해주세요."); return false; } return true; };

  const handleSubmit = async () => {
    if (!privacyAgreed) { setErr("개인정보 수집·이용에 동의해주세요."); return; }
    setSubmitting(true);
    try {
      const reg = { id: uid(), name: form.name.trim(), birthDate: form.birthDate, phone: form.phone, guardianPhone: form.guardianPhone, desiredInstruments: form.desiredInstruments, notes: form.notes.trim(), photo: form.photo, experience: form.experience === "yes" ? form.experienceDetail : "없음", purpose: form.purpose === "기타" ? form.purposeOther : form.purpose, referral: form.referral === "기타" ? form.referralOther : form.referral, optionalConsent: optionalAgreed, consent: { privacy: { agreed: true, agreedAt: Date.now(), ip: null }, photo: { agreed: optionalAgreed, agreedAt: optionalAgreed ? Date.now() : null } }, teacherName: form.teacherName, lessonType: form.lessonType === "기타" ? form.lessonTypeOther : form.lessonType, lessonDay: form.lessonDay, lessonTime: form.lessonTime, monthlyFee: form.monthlyFee, instrumentRental: form.instrumentRental, startDate: form.startDate, status: "pending", createdAt: Date.now() };
      const snap = await new Promise((resolve) => { const unsub = onSnapshot(doc(db, COLLECTION, "rye-pending"), (s) => { unsub(); resolve(s); }, () => resolve(null)); });
      const existing = snap?.exists() ? snap.data().value || [] : [];
      await sSet("rye-pending", [...existing, reg]);
      setSubmitted(true);
    } catch (e) { setErr("등록에 실패했습니다. 다시 시도해주세요."); } finally { setSubmitting(false); }
  };

  if (submitted) return (<><style>{CSS}</style><div style={{minHeight:"100vh",background:"#fff",display:"flex",alignItems:"center",justifyContent:"center",padding:20}}><div style={{maxWidth:400,width:"100%",textAlign:"center"}}><div style={{width:64,height:64,borderRadius:"50%",background:"#F0FDF4",display:"flex",alignItems:"center",justifyContent:"center",margin:"0 auto 20px",fontSize:28}}>✓</div><div style={{fontFamily:"'Noto Serif KR',serif",fontSize:20,fontWeight:600,marginBottom:10}}>등록이 완료되었습니다</div><div style={{fontSize:14,color:"var(--ink-60)",lineHeight:1.7,marginBottom:24}}><strong>{form.name}</strong>님의 수강 등록 신청이 정상적으로 접수되었습니다.</div><button className="btn btn-primary btn-full" onClick={() => { setSubmitted(false); setForm({name:"",birthDate:"",phone:"",guardianPhone:"",desiredInstruments:[],notes:"",photo:"",experience:"none",experienceDetail:"",purpose:"",purposeOther:"",referral:"",referralOther:"",teacherName:"",lessonType:"",lessonTypeOther:"",lessonDay:"",lessonTime:"",monthlyFee:0,instrumentRental:false,startDate:TODAY_STR}); setStep(1); setPrivacyAgreed(false); setOptionalAgreed(false); }}>새로운 등록</button></div></div></>);

  const progressPct = (step / 4) * 100;
  return (
    <><style>{CSS}</style>
    <div style={{minHeight:"100vh",background:"var(--bg)",padding:"20px 16px"}}>
      <div style={{maxWidth:480,margin:"0 auto"}}>
        <div style={{textAlign:"center",marginBottom:20}}>
          <Logo size={48} />
          <div style={{fontFamily:"'Noto Serif KR',serif",fontSize:17,fontWeight:700,color:"var(--blue)",marginTop:8}}>RYE-K K-Culture Center</div>
          <div style={{fontSize:11,color:"var(--ink-30)",letterSpacing:1.5,marginTop:3}}>수강 등록 신청서</div>
        </div>
        <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:20}}>
          <div style={{flex:1,height:4,background:"var(--border)",borderRadius:2,overflow:"hidden"}}><div style={{width:`${progressPct}%`,height:"100%",background:"var(--blue)",borderRadius:2,transition:"width .3s"}} /></div>
          <span style={{fontSize:11,color:"var(--ink-30)",flexShrink:0}}>STEP {step}/4</span>
        </div>
        {err && <div className="form-err" style={{marginBottom:12}}>⚠ {err}</div>}

        {step === 1 && (
          <div className="card" style={{padding:0,overflow:"hidden"}}>
            <div style={{background:"linear-gradient(90deg,var(--blue),var(--blue-md))",padding:"14px 20px",color:"#fff",fontSize:14,fontWeight:500}}>기본 정보</div>
            <div style={{padding:20}}>
              <div className="photo-area"><Av photo={form.photo} name={form.name} size="av-lg" /><div><button className="btn btn-secondary btn-sm" onClick={() => fileRef.current.click()}>사진 촬영/업로드</button>{form.photo && <button className="btn btn-ghost btn-sm" onClick={() => set("photo","")}>삭제</button>}<div className="photo-hint">선택사항 · 3MB 이하</div></div><input ref={fileRef} type="file" className="file-inp" accept="image/*" onChange={handlePhoto} /></div>
              <div className="fg"><label className="fg-label">이름 <span className="req">*</span></label><input className="inp" value={form.name} onChange={e => set("name",e.target.value)} placeholder="수강생 이름" /></div>
              <div className="fg"><label className="fg-label">생년월일 <span className="req">*</span> <span style={{fontWeight:400,color:"var(--ink-30)",textTransform:"none",letterSpacing:0}}>(My RYE-K 비밀번호)</span></label><input className="inp" type="date" value={form.birthDate} onChange={e => set("birthDate",e.target.value)} /></div>
              <div className="fg"><label className="fg-label">연락처 <span className="req">*</span></label><input className="inp" inputMode="tel" value={form.phone} onChange={e => set("phone",fmtPhone(e.target.value))} placeholder="010-0000-0000" maxLength={13} /></div>
              <div className="fg"><label className="fg-label">보호자 연락처 <span style={{fontWeight:400,color:"var(--ink-30)",textTransform:"none",letterSpacing:0}}>(미성년자 필수)</span></label><input className="inp" inputMode="tel" value={form.guardianPhone} onChange={e => set("guardianPhone",fmtPhone(e.target.value))} placeholder="010-0000-0000" maxLength={13} /></div>
              <div className="fg"><label className="fg-label">국악 경력</label><div style={{display:"flex",gap:6,marginBottom:form.experience==="yes"?8:0}}><button className={`ftab ${form.experience==="none"?"active":""}`} onClick={()=>{set("experience","none");set("experienceDetail","");}} style={{flex:1,textAlign:"center"}}>없음</button><button className={`ftab ${form.experience==="yes"?"active":""}`} onClick={()=>set("experience","yes")} style={{flex:1,textAlign:"center"}}>있음</button></div>{form.experience==="yes" && <input className="inp" value={form.experienceDetail} onChange={e=>set("experienceDetail",e.target.value)} placeholder="예: 해금 2년, 가야금 6개월" />}</div>
              <button className="btn btn-primary btn-full" style={{marginTop:8}} onClick={() => { if(validateStep1()) setStep(2); }}>다음</button>
            </div>
          </div>
        )}

        {step === 2 && (
          <div className="card" style={{padding:0,overflow:"hidden"}}>
            <div style={{background:"linear-gradient(90deg,var(--blue),var(--blue-md))",padding:"14px 20px",color:"#fff",fontSize:14,fontWeight:500}}>수업 정보</div>
            <div style={{padding:20}}>
              <div className="fg"><label className="fg-label">희망 과목 <span className="req">*</span> <span style={{fontWeight:400,color:"var(--ink-30)",textTransform:"none",letterSpacing:0}}>(복수 선택 가능)</span></label>
                {Object.entries(categories).map(([cat, insts]) => (<div key={cat} style={{marginBottom:10}}><div style={{fontSize:11,color:"var(--ink-30)",fontWeight:600,letterSpacing:.5,marginBottom:5}}>{cat}</div><div className="inst-select-grid">{insts.map(inst => { const checked = form.desiredInstruments.includes(inst); return (<div key={inst} className={`inst-check ${checked?"checked":""}`} onClick={()=>toggleInst(inst)}><div className="inst-check-box">{checked?"✓":""}</div>{inst}</div>); })}</div></div>))}
              </div>
              <div className="fg"><label className="fg-label">수업 목적</label><div style={{display:"flex",gap:6,flexWrap:"wrap",marginBottom:form.purpose==="기타"?8:0}}>{["취미","입시","공연 참여","기타"].map(p => (<button key={p} className={`ftab ${form.purpose===p?"active":""}`} onClick={()=>set("purpose",p)} style={{flex:"1 0 auto",textAlign:"center"}}>{p}</button>))}</div>{form.purpose==="기타" && <input className="inp" value={form.purposeOther} onChange={e=>set("purposeOther",e.target.value)} placeholder="직접 입력" />}</div>
              <div className="fg"><label className="fg-label">알게 된 경로</label><div style={{display:"flex",gap:6,flexWrap:"wrap",marginBottom:form.referral==="기타"?8:0}}>{["블로그","인스타그램","네이버 검색","지인 소개","오프라인 광고","기타"].map(r => (<button key={r} className={`ftab ${form.referral===r?"active":""}`} onClick={()=>set("referral",r)} style={{textAlign:"center",padding:"6px 10px",fontSize:11.5}}>{r}</button>))}</div>{form.referral==="기타" && <input className="inp" value={form.referralOther} onChange={e=>set("referralOther",e.target.value)} placeholder="직접 입력" />}</div>
              <div className="fg"><label className="fg-label">특이사항 · 참고사항</label><textarea className="inp" value={form.notes} onChange={e => set("notes",e.target.value)} placeholder="건강 관련, 수업 시 참고사항 등" rows={3} /></div>
              <div style={{display:"flex",gap:8,marginTop:8}}><button className="btn btn-secondary" style={{flex:1}} onClick={()=>setStep(1)}>이전</button><button className="btn btn-primary" style={{flex:2}} onClick={() => { if(validateStep2()) setStep(3); }}>다음</button></div>
            </div>
          </div>
        )}

        {step === 3 && (
          <div>
            <div className="card" style={{padding:0,overflow:"hidden",marginBottom:12}}>
              <div style={{background:"linear-gradient(90deg,var(--blue),var(--blue-md))",padding:"14px 20px",color:"#fff",fontSize:14,fontWeight:500}}>약관 동의</div>
              <div style={{padding:20}}>
                <div style={{background:"var(--bg)",border:"1px solid var(--border)",borderRadius:8,padding:14,marginBottom:12,fontSize:12.5,lineHeight:1.8,color:"var(--ink-60)"}}>
                  <div style={{fontWeight:600,color:"var(--ink)",marginBottom:5}}>개인정보 수집·이용 동의</div>
                  <div><span style={{background:"var(--blue)",color:"#fff",fontSize:9,padding:"1px 6px",borderRadius:3,fontWeight:600,marginRight:4}}>필수</span>이름, 연락처, 생년월일</div>
                  <div><span style={{background:"var(--ink-30)",color:"#fff",fontSize:9,padding:"1px 6px",borderRadius:3,fontWeight:600,marginRight:4}}>선택</span>보호자 연락처, 사진, 희망 과목, 특이사항</div>
                  <div style={{fontSize:11.5,color:"var(--ink-30)",marginTop:6}}>보유 기간: 수강 종료 후 1년간 보유 후 파기</div>
                </div>
                <button onClick={()=>setShowFullPolicy(!showFullPolicy)} style={{background:"none",border:"none",color:"var(--blue)",fontSize:12,cursor:"pointer",padding:0,textDecoration:"underline",fontFamily:"inherit",marginBottom:10,display:"block"}}>{showFullPolicy?"▲ 전문 닫기":"▼ 개인정보 처리 전문 보기"}</button>
                {showFullPolicy && (<div style={{background:"#FAFAFA",border:"1px solid var(--border)",borderRadius:8,padding:14,marginBottom:12,fontSize:11.5,lineHeight:1.9,color:"var(--ink-60)",whiteSpace:"pre-wrap",maxHeight:220,overflowY:"auto"}}>{`[개인정보 수집·이용 동의서]\n\n「개인정보 보호법」 제15조 및 제22조에 따라 안내드립니다.\n\n1. 수집·이용 목적: 수강 등록 접수 및 상담, 수업 관리, 수강료 안내, 출결 관리\n2. 수집 항목: [필수] 이름, 연락처, 생년월일 / [선택] 보호자 연락처, 사진, 희망 과목, 특이사항\n3. 보유·이용 기간: 수강 종료 후 1년간 보유 후 파기\n4. 동의 거부 권리: 필수항목 미동의 시 수강 등록 불가. 선택항목 미동의 시 수강에 영향 없음.\n5. 만 14세 미만 아동: 법정대리인(보호자)의 동의를 받아 수집합니다.`}</div>)}
                <div onClick={()=>setPrivacyAgreed(!privacyAgreed)} style={{display:"flex",alignItems:"flex-start",gap:10,cursor:"pointer",padding:"10px 0",userSelect:"none"}}><div style={{width:22,height:22,borderRadius:6,border:`2px solid ${privacyAgreed?"var(--blue)":"var(--border)"}`,background:privacyAgreed?"var(--blue)":"var(--paper)",display:"flex",alignItems:"center",justifyContent:"center",transition:"all .15s",flexShrink:0,marginTop:1}}>{privacyAgreed && <span style={{color:"#fff",fontSize:13,fontWeight:700}}>✓</span>}</div><div style={{fontSize:13,color:"var(--ink)",lineHeight:1.5}}><span style={{fontWeight:600}}>[필수]</span> 개인정보 수집·이용에 동의합니다.</div></div>
                <div className="divider" />
                <div style={{background:"var(--gold-lt)",border:"1px solid rgba(245,168,0,.2)",borderRadius:8,padding:14,marginBottom:12,fontSize:12.5,lineHeight:1.8,color:"var(--ink-60)"}}><div style={{fontWeight:600,color:"var(--ink)",marginBottom:5}}>수업 보강 및 이월 규정</div><div>• 월 4회 기본 수업 (매월 첫 주 수강료 납입)</div><div>• 레슨 당일 무단 결석 시, 보강 및 이월이 불가합니다.</div><div>• 레슨 전 사전 고지 시, 강사와 협의하여 보강 수업을 조율할 수 있습니다.</div><div>• 단, 그룹 수업(강좌)의 경우 별도 보강은 진행되지 않습니다.</div></div>
                <div className="divider" />
                <button onClick={()=>setShowPhotoPolicy(!showPhotoPolicy)} style={{background:"none",border:"none",color:"var(--ink-60)",fontSize:12,cursor:"pointer",padding:0,fontFamily:"inherit",marginBottom:8,display:"block",textDecoration:"underline"}}>{showPhotoPolicy?"▲ 촬영·이용 동의 상세 닫기":"▼ 사진 및 동영상 촬영·이용 동의 상세 보기"}</button>
                {showPhotoPolicy && (<div style={{background:"#FAFAFA",border:"1px solid var(--border)",borderRadius:8,padding:14,marginBottom:10,fontSize:11.5,lineHeight:1.9,color:"var(--ink-60)",whiteSpace:"pre-wrap",maxHeight:200,overflowY:"auto"}}>{`[선택] 사진 및 동영상 촬영·이용 및 제3자 제공 동의\n\n1. 수집 및 이용 목적: 교육·행사 기록, 기관 홍보 콘텐츠 제작 및 공식 SNS·홈페이지 게시\n2. 수집 항목: 교육·행사 중 촬영된 초상(사진, 동영상) 및 음성\n3. 제3자 제공 대상: 홍보 콘텐츠 시청자, 영상 제작 대행사, 보도 매체\n4. 보유·이용 기간: 목적 달성 후 파기 (홍보물 게시 시 철회 요청 시까지)\n5. 동의 거부 시: 촬영에서 제외되거나, 홍보물 내 블러(모자이크) 처리될 수 있습니다.`}</div>)}
                <div onClick={()=>setOptionalAgreed(!optionalAgreed)} style={{display:"flex",alignItems:"flex-start",gap:10,cursor:"pointer",padding:"6px 0",userSelect:"none"}}><div style={{width:22,height:22,borderRadius:6,border:`2px solid ${optionalAgreed?"var(--blue)":"var(--border)"}`,background:optionalAgreed?"var(--blue)":"var(--paper)",display:"flex",alignItems:"center",justifyContent:"center",transition:"all .15s",flexShrink:0,marginTop:1}}>{optionalAgreed && <span style={{color:"#fff",fontSize:13,fontWeight:700}}>✓</span>}</div><div style={{fontSize:13,color:"var(--ink)",lineHeight:1.5}}><span style={{fontWeight:500,color:"var(--ink-30)"}}>[선택]</span> 사진·동영상 촬영·이용 및 제3자 제공에 동의합니다.<div style={{fontSize:11,color:"var(--ink-30)",marginTop:2}}>미동의 시에도 수강에 영향 없습니다.</div></div></div>
              </div>
            </div>
            <div style={{display:"flex",gap:8}}><button className="btn btn-secondary" style={{flex:1}} onClick={()=>setStep(2)}>이전</button><button className="btn btn-primary" style={{flex:2}} onClick={()=>{ if(!privacyAgreed){setErr("개인정보 수집·이용에 동의해주세요.");return;} setStep(4); }} disabled={!privacyAgreed}>다음</button></div>
          </div>
        )}

        {step === 4 && (
          <div className="card" style={{padding:0,overflow:"hidden"}}>
            <div style={{background:"linear-gradient(90deg,var(--gold-dk),var(--gold))",padding:"14px 20px",color:"#fff",fontSize:14,fontWeight:500}}>강사 작성란</div>
            <div style={{padding:"6px 20px 0"}}><div style={{fontSize:11.5,color:"var(--ink-30)",lineHeight:1.6,padding:"10px 0",borderBottom:"1px solid var(--border)"}}>아래 항목은 상담 강사가 직접 작성합니다.</div></div>
            <div style={{padding:20}}>
              <div className="fg"><label className="fg-label">담당 강사</label><input className="inp" value={form.teacherName} onChange={e=>set("teacherName",e.target.value)} placeholder="강사 이름" /></div>
              <div className="fg"><label className="fg-label">수업 구분</label><div style={{display:"flex",gap:6,flexWrap:"wrap",marginBottom:form.lessonType==="기타"?8:0}}>{["그룹 (초급반)","소그룹 (중급반)","개인 (초급)","개인 (중급)","개인 (고급)","기타"].map(t => (<button key={t} className={`ftab ${form.lessonType===t?"active":""}`} onClick={()=>set("lessonType",t)} style={{textAlign:"center",padding:"6px 10px",fontSize:11.5}}>{t}</button>))}</div>{form.lessonType==="기타" && <input className="inp" value={form.lessonTypeOther} onChange={e=>set("lessonTypeOther",e.target.value)} placeholder="직접 입력" />}</div>
              <div className="fg-row"><div className="fg"><label className="fg-label">수업 요일</label><input className="inp" value={form.lessonDay} onChange={e=>set("lessonDay",e.target.value)} placeholder="예: 화, 목" /></div><div className="fg"><label className="fg-label">시간</label><input className="time-inp" type="time" value={form.lessonTime} onChange={e=>set("lessonTime",e.target.value)} style={{width:"100%"}} /></div></div>
              <div className="fg"><label className="fg-label">월 수강료</label><div style={{position:"relative",maxWidth:220}}><input className="inp" inputMode="numeric" value={form.monthlyFee?form.monthlyFee.toLocaleString("ko-KR"):""} onChange={e=>set("monthlyFee",parseInt(e.target.value.replace(/[^\d]/g,""))||0)} placeholder="0" style={{paddingRight:30}} /><span style={{position:"absolute",right:12,top:"50%",transform:"translateY(-50%)",fontSize:13,color:"var(--ink-30)",pointerEvents:"none"}}>원</span></div></div>
              <div className="fg" style={{display:"flex",alignItems:"center",gap:8,cursor:"pointer"}} onClick={()=>set("instrumentRental",!form.instrumentRental)}><div style={{width:20,height:20,border:"1.5px solid var(--border)",borderRadius:6,display:"flex",alignItems:"center",justifyContent:"center",background:form.instrumentRental?"var(--blue)":"var(--paper)",transition:"all .12s"}}>{form.instrumentRental && <span style={{color:"#fff",fontSize:12,fontWeight:700}}>✓</span>}</div><span style={{fontSize:13,color:"var(--ink-60)"}}>악기 대여</span></div>
              <div className="fg"><label className="fg-label">수업 시작일</label><input className="inp" type="date" value={form.startDate} onChange={e=>set("startDate",e.target.value)} /></div>
              <div style={{display:"flex",gap:8,marginTop:12}}><button className="btn btn-secondary" style={{flex:1}} onClick={()=>setStep(3)}>이전</button><button className="btn btn-primary" style={{flex:2}} onClick={handleSubmit} disabled={submitting}>{submitting?"등록 중…":"수강 등록 완료"}</button></div>
            </div>
          </div>
        )}
      </div>
    </div></>
  );
}

// ── MY RYE-K (수강생 전용 포털) ──────────────────────────────────────────────
export function PublicParentView() {
  const [students, setStudents] = useState([]);
  const [attendance, setAttendance] = useState([]);
  const [payments, setPayments] = useState([]);
  const [teachers, setTeachers] = useState([]);
  const [studentNotices, setStudentNotices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loggedIn, setLoggedIn] = useState(false);
  const [student, setStudent] = useState(null);
  const [tab, setTab] = useState("home");
  const [loginCode, setLoginCode] = useState(() => {
    try {
      const params = new URLSearchParams(window.location.search);
      const urlCode = params.get("code");
      if (urlCode) return urlCode.toUpperCase();
      return localStorage.getItem("ryekSavedCode") || "";
    } catch { return ""; }
  });
  const [loginPw, setLoginPw] = useState("");
  const [loginErr, setLoginErr] = useState("");
  const [saveCode, setSaveCode] = useState(() => { try { return !!localStorage.getItem("ryekSavedCode"); } catch { return false; } });
  // 읽음 추적 — localStorage에 학생별 저장
  const [lastNoteRead, setLastNoteRead] = useState(0);       // 강사 댓글 마지막 읽은 시각
  const [readNoticeIds, setReadNoticeIds] = useState(new Set()); // 읽은 공지 ID set
  const [expandedNotice, setExpandedNotice] = useState(null);  // 공지 상세 열기

  const saveAttendance = async (upd) => { setAttendance(upd); await sSet("rye-attendance", upd); };

  // 읽음 상태 localStorage에서 복원 (로그인 후 호출)
  const initReadState = (sid) => {
    try {
      const lnr = parseInt(localStorage.getItem(`ryekP_lnr_${sid}`) || "0");
      setLastNoteRead(lnr);
      const rni = JSON.parse(localStorage.getItem(`ryekP_rni_${sid}`) || "[]");
      setReadNoticeIds(new Set(rni));
    } catch {}
  };

  const markNotesRead = (sid) => {
    const now = Date.now();
    setLastNoteRead(now);
    try { localStorage.setItem(`ryekP_lnr_${sid}`, String(now)); } catch {}
  };

  const markNoticesRead = (sid, ids) => {
    setReadNoticeIds(prev => {
      const next = new Set([...prev, ...ids]);
      try { localStorage.setItem(`ryekP_rni_${sid}`, JSON.stringify([...next])); } catch {}
      return next;
    });
  };

  const handleNoticeOpen = async (n) => {
    if (expandedNotice === n.id) { setExpandedNotice(null); return; }
    setExpandedNotice(n.id);
    markNoticesRead(student.id, [n.id]);
    // readBy Firestore 업데이트
    if (!(n.readBy||[]).includes(student.id)) {
      const updated = studentNotices.map(notice =>
        notice.id === n.id ? {...notice, readBy: [...(notice.readBy||[]), student.id]} : notice
      );
      setStudentNotices(updated);
      try { await sSet("rye-student-notices", updated); } catch {}
    }
  };

  useEffect(() => {
    const unsubscribes = [];
    const setupListeners = () => {
      let loaded = 0;
      const KEYS = [
        { key: "rye-students", setter: setStudents, default: [] },
        { key: "rye-attendance", setter: setAttendance, default: [] },
        { key: "rye-payments", setter: setPayments, default: [] },
        { key: "rye-teachers", setter: setTeachers, default: [] },
        { key: "rye-student-notices", setter: setStudentNotices, default: [] },
      ];
      KEYS.forEach(({ key, setter, default: def }) => {
        const unsub = onSnapshot(doc(db, COLLECTION, key), (snap) => {
          setter(snap.exists() ? (snap.data().value ?? def) : def);
          loaded++;
          if (loaded >= KEYS.length) setLoading(false);
        }, () => { setter(def); loaded++; if (loaded >= KEYS.length) setLoading(false); });
        unsubscribes.push(unsub);
      });
    };
    firebaseSignInAnon().then(() => setupListeners()).catch(() => setupListeners());
    return () => unsubscribes.forEach(u => u());
  }, []);

  // 데이터 로드 후 sessionStorage로 자동 로그인
  useEffect(() => {
    if (!loading && students.length > 0 && !loggedIn) {
      try {
        const saved = JSON.parse(sessionStorage.getItem("ryekPortal") || "null");
        if (saved?.code && saved?.pw) {
          const found = students.find(s => s.studentCode === saved.code);
          if (found && getBirthPassword(found.birthDate) === saved.pw) {
            setStudent(found);
            setLoggedIn(true);
            initReadState(found.id);
          }
        }
      } catch {}
    }
  }, [loading, students]);

  useEffect(() => {
    if (student && students.length > 0) {
      const updated = students.find(s => s.id === student.id);
      if (updated) setStudent(updated);
    }
  }, [students]);

  const handleLogin = () => {
    setLoginErr("");
    if (!loginCode.trim() || !loginPw.trim()) { setLoginErr("회원코드와 비밀번호를 입력하세요."); return; }
    const found = students.find(s => s.studentCode === loginCode.trim().toUpperCase());
    if (!found) { setLoginErr("회원코드를 찾을 수 없습니다."); return; }
    const expectedPw = getBirthPassword(found.birthDate);
    if (loginPw !== expectedPw) { setLoginErr("비밀번호가 올바르지 않습니다. (생일 4자리: MMDD)"); return; }
    setStudent(found);
    setLoggedIn(true);
    try {
      sessionStorage.setItem("ryekPortal", JSON.stringify({ code: found.studentCode, pw: loginPw }));
      if (saveCode) localStorage.setItem("ryekSavedCode", found.studentCode);
      else localStorage.removeItem("ryekSavedCode");
    } catch {}
    initReadState(found.id);
  };

  const handleTabChange = (tabId) => {
    setTab(tabId);
    if (!student) return;
    if (tabId === "notes") markNotesRead(student.id);
    if (tabId === "notice") markNoticesRead(student.id, visibleNotices.map(n => n.id));
  };

  if (loading) return <><style>{CSS}</style><div className="loading-screen"><div className="loading-logo"><Logo size={56} /></div><div className="loading-text">RYE-K</div></div></>;

  // Login screen - clean white
  if (!loggedIn) return (
    <><style>{CSS}</style>
    <div style={{minHeight:"100vh",minHeight:"100dvh",background:"#fff",display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",padding:20}}>
      <div style={{width:"100%",maxWidth:380,textAlign:"center"}}>
        <Logo size={48} />
        <div style={{fontFamily:"'Noto Serif KR',serif",fontSize:22,fontWeight:700,color:"var(--blue)",marginTop:14}}>My RYE-K</div>
        <div style={{fontSize:11,color:"#A1A1AA",letterSpacing:2,marginTop:4,marginBottom:36}}>RYE-K K-Culture Center</div>
        <div style={{background:"#fff",borderRadius:20,padding:"32px 28px",boxShadow:"0 2px 24px rgba(0,0,0,.06)",border:"1px solid #F0F0F0",textAlign:"left"}}>
          {loginErr && <div className="form-err" style={{marginBottom:14,borderRadius:10}}>⚠ {loginErr}</div>}
          <div className="fg"><label className="fg-label">회원코드</label><input className="inp" value={loginCode} onChange={e => {setLoginCode(e.target.value.toUpperCase());setLoginErr("");}} placeholder="예: RKAB12" style={{fontSize:16,letterSpacing:2,textTransform:"uppercase",borderRadius:10}} onKeyDown={e=>e.key==="Enter"&&handleLogin()} /></div>
          <div className="fg"><label className="fg-label">비밀번호 (생일 MMDD)</label><input className="inp" type="password" value={loginPw} onChange={e => {setLoginPw(e.target.value);setLoginErr("");}} placeholder="예: 0410" maxLength={4} inputMode="numeric" style={{fontSize:16,letterSpacing:4,borderRadius:10}} onKeyDown={e=>e.key==="Enter"&&handleLogin()} /></div>
          <div style={{display:"flex",alignItems:"center",gap:7,marginBottom:14,cursor:"pointer"}} onClick={() => setSaveCode(s => !s)}>
            <div style={{width:16,height:16,borderRadius:4,border:`1.5px solid ${saveCode?"var(--blue)":"#D0D0D0"}`,background:saveCode?"var(--blue)":"#fff",display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0,transition:"all .12s"}}>
              {saveCode && <span style={{color:"#fff",fontSize:11,fontWeight:700,lineHeight:1}}>✓</span>}
            </div>
            <span style={{fontSize:12,color:"#888"}}>회원코드 저장</span>
          </div>
          <button className="btn btn-primary btn-full" style={{marginTop:0,padding:14,fontSize:15,borderRadius:10}} onClick={handleLogin}>로그인</button>
        </div>
        <div style={{marginTop:20,fontSize:11,color:"#C0C0C0",lineHeight:1.6}}>회원코드는 담당 강사에게 문의하세요.</div>
      </div>
    </div></>
  );

  // Logged in - white minimal portal
  const teacher = teachers.find(t => t.id === student.teacherId);
  const sAtt = attendance.filter(a => a.studentId === student.id).sort((a, b) => (b.date||"").localeCompare(a.date||""));
  const sPay = payments.filter(p => p.studentId === student.id).sort((a, b) => (b.month||"").localeCompare(a.month||""));
  const notes = sAtt.filter(a => (a.lessonNote || a.note) && (typeof a.lessonNote === "object" ? true : (a.note && a.note.trim()))).slice(0, 30);
  const attStatusStyle = {
    present: { color: "#22C55E", bg: "#F0FDF4", icon: "✓", text: "출석" },
    absent: { color: "#EF4444", bg: "#FEF2F2", icon: "✗", text: "결석" },
    late: { color: "#F59E0B", bg: "#FFFBEB", icon: "△", text: "지각" },
    excused: { color: "#3B82F6", bg: "#EFF6FF", icon: "○", text: "보강" }
  };
  const attThisMonth = sAtt.filter(a => a.date && a.date.startsWith(THIS_MONTH));
  const presentCount = attThisMonth.filter(a => a.status === "present").length;
  const absentCount = attThisMonth.filter(a => a.status === "absent").length;
  const lateCount = attThisMonth.filter(a => a.status === "late").length;
  const totalThisMonth = attThisMonth.length;
  const attRate = totalThisMonth > 0 ? Math.round((presentCount + lateCount) / totalThisMonth * 100) : null;
  const latestPay = sPay[0];
  const lessonDays = allLessonDays(student);

  // Next lesson D-day
  const getNextLessonDate = () => {
    const today = new Date();
    for (let i = 0; i <= 7; i++) {
      const d = new Date(today);
      d.setDate(d.getDate() + i);
      const dayName = ["일","월","화","수","목","금","토"][d.getDay()];
      const hasLesson = (student.lessons || []).some(l => (l.schedule || []).some(sc => sc.day === dayName));
      if (hasLesson && (i > 0 || d.getHours() < 22)) {
        const lessons = (student.lessons || []).filter(l => (l.schedule || []).some(sc => sc.day === dayName));
        const times = lessons.flatMap(l => (l.schedule||[]).filter(sc=>sc.day===dayName).map(sc=>sc.time)).filter(Boolean);
        return { date: d, dDay: i, dayName, lessons, time: times[0] || "" };
      }
    }
    return null;
  };
  const nextLesson = getNextLessonDate();

  // Active student notices — 만료·hidden·대상강사 필터링
  const visibleNotices = studentNotices
    .filter(n => !n.hidden)
    .filter(n => !n.expireAt || n.expireAt > Date.now())
    .filter(n => !n.targetTeacherId || n.targetTeacherId === student.teacherId)
    .sort((a,b) => { if(a.pinned&&!b.pinned)return -1; if(!a.pinned&&b.pinned)return 1; return b.createdAt-a.createdAt; });

  // 미읽음 배지 계산
  const unreadNoticeCount = visibleNotices.filter(n => !readNoticeIds.has(n.id)).length;
  const unreadCommentCount = (student ? (attendance.filter(a => a.studentId === student.id)) : [])
    .reduce((cnt, a) => cnt + (a.comments||[]).filter(c => c.authorType === "teacher" && c.createdAt > lastNoteRead).length, 0);

  return (
    <><style>{CSS}</style>
    <div style={{minHeight:"100vh",minHeight:"100dvh",background:"#FAFAFA"}}>
      {/* Clean white header */}
      <div style={{background:"#fff",padding:"14px 20px",paddingTop:"calc(14px + env(safe-area-inset-top,0px))",borderBottom:"1px solid #F0F0F0"}}>
        <div style={{display:"flex",alignItems:"center",gap:10,maxWidth:640,margin:"0 auto"}}>
          <Logo size={28} />
          <div style={{flex:1}}>
            <div style={{fontFamily:"'Noto Serif KR',serif",fontSize:15,fontWeight:700,color:"var(--blue)"}}>My RYE-K</div>
          </div>
          <button onClick={()=>{setLoggedIn(false);setStudent(null);setLoginCode("");setLoginPw("");setTab("home");try{sessionStorage.removeItem("ryekPortal");}catch{}}} style={{background:"#F5F5F5",border:"none",color:"#999",fontSize:11,padding:"6px 14px",borderRadius:8,cursor:"pointer",fontFamily:"inherit"}}>로그아웃</button>
        </div>
      </div>

      {/* Student Info Card */}
      <div style={{padding:"16px 16px 0",maxWidth:640,margin:"0 auto"}}>
        <div style={{background:"#fff",borderRadius:16,padding:"20px",boxShadow:"0 1px 8px rgba(0,0,0,.04)",border:"1px solid #F0F0F0"}}>
          <div style={{display:"flex",alignItems:"center",gap:14}}>
            <Av photo={student.photo} name={student.name} size="av-lg" />
            <div style={{flex:1}}>
              <div style={{fontSize:20,fontWeight:700,fontFamily:"'Noto Serif KR',serif",color:"var(--ink)"}}>{student.name}</div>
              <div style={{display:"flex",gap:6,flexWrap:"wrap",marginTop:6}}>
                {(student.lessons||[]).map(l => <span key={l.instrument} style={{background:"var(--blue-lt)",color:"var(--blue)",fontSize:11,padding:"3px 10px",borderRadius:12,fontWeight:500}}>{l.instrument}</span>)}
              </div>
              {teacher && <div style={{fontSize:12,color:"#999",marginTop:4}}>{teacher.name} 강사</div>}
            </div>
          </div>
          {/* Day chips */}
          {lessonDays.length > 0 && <div style={{display:"flex",gap:4,marginTop:14}}>{DAYS.map(d=><div key={d} style={{width:30,height:30,borderRadius:15,display:"flex",alignItems:"center",justifyContent:"center",fontSize:11,fontWeight:lessonDays.includes(d)?600:400,color:lessonDays.includes(d)?"var(--blue)":"#D4D4D4",background:lessonDays.includes(d)?"var(--blue-lt)":"transparent",transition:"all .2s"}}>{d}</div>)}</div>}
        </div>
      </div>

      {/* Next Lesson D-day Card */}
      {nextLesson && (
        <div style={{padding:"12px 16px 0",maxWidth:640,margin:"0 auto"}}>
          <div style={{background:"#fff",borderRadius:14,padding:"16px 20px",boxShadow:"0 1px 6px rgba(0,0,0,.03)",border:"1px solid #F0F0F0",display:"flex",alignItems:"center",gap:14}}>
            <div style={{width:48,height:48,borderRadius:14,background:nextLesson.dDay===0?"var(--blue-lt)":"#F9FAFB",display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",flexShrink:0}}>
              <div style={{fontSize:18,fontWeight:700,color:nextLesson.dDay===0?"var(--blue)":"var(--ink)",fontFamily:"'Noto Serif KR',serif",lineHeight:1}}>{nextLesson.dDay === 0 ? "오늘" : `D-${nextLesson.dDay}`}</div>
            </div>
            <div style={{flex:1}}>
              <div style={{fontSize:13,fontWeight:600,color:"var(--ink)"}}>{nextLesson.dDay === 0 ? "오늘 레슨이 있어요" : "다음 레슨"}</div>
              <div style={{fontSize:12,color:"#999",marginTop:2}}>
                {nextLesson.date.getMonth()+1}월 {nextLesson.date.getDate()}일 ({nextLesson.dayName}){nextLesson.time && ` ${nextLesson.time}`}
                {" · "}{nextLesson.lessons.map(l=>(l.lessons||l).instrument || allLessonInsts(student).join(", ")).join(", ")}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Quick Stats */}
      <div style={{padding:"12px 16px 0",display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:8,maxWidth:640,margin:"0 auto"}}>
        <div style={{background:"#fff",borderRadius:14,padding:"14px 10px",textAlign:"center",boxShadow:"0 1px 4px rgba(0,0,0,.03)",border:"1px solid #F0F0F0"}}>
          <div style={{fontSize:24,fontWeight:700,color:attRate&&attRate>=80?"#22C55E":attRate&&attRate>=60?"#F59E0B":"#EF4444",fontFamily:"'Noto Serif KR',serif"}}>{attRate!==null?attRate+"%":"—"}</div>
          <div style={{fontSize:10,color:"#B0B0B0",marginTop:3}}>이번달 출석률</div>
        </div>
        <div style={{background:"#fff",borderRadius:14,padding:"14px 10px",textAlign:"center",boxShadow:"0 1px 4px rgba(0,0,0,.03)",border:"1px solid #F0F0F0"}}>
          <div style={{fontSize:24,fontWeight:700,color:"#22C55E",fontFamily:"'Noto Serif KR',serif"}}>{presentCount}</div>
          <div style={{fontSize:10,color:"#B0B0B0",marginTop:3}}>출석</div>
        </div>
        <div style={{background:"#fff",borderRadius:14,padding:"14px 10px",textAlign:"center",boxShadow:"0 1px 4px rgba(0,0,0,.03)",border:"1px solid #F0F0F0"}}>
          <div style={{fontSize:24,fontWeight:700,color:latestPay?.paid?"#22C55E":"#EF4444",fontFamily:"'Noto Serif KR',serif"}}>{latestPay?.paid?"✓":"!"}</div>
          <div style={{fontSize:10,color:"#B0B0B0",marginTop:3}}>{latestPay?monthLabel(latestPay.month):"수납"}</div>
        </div>
      </div>

      {/* Tabs */}
      <div style={{display:"flex",gap:0,padding:"14px 16px 0",maxWidth:640,margin:"0 auto"}}>
        {[{id:"home",label:"홈"},{id:"notice",label:"공지"},{id:"att",label:"출석"},{id:"notes",label:"레슨노트"},{id:"pay",label:"수납"}].map(t=>(
          <button key={t.id} onClick={()=>handleTabChange(t.id)} style={{flex:1,padding:"10px 0",fontSize:12.5,fontWeight:tab===t.id?600:400,color:tab===t.id?"var(--blue)":"#B0B0B0",background:"transparent",border:"none",borderBottom:tab===t.id?"2px solid var(--blue)":"2px solid transparent",cursor:"pointer",fontFamily:"inherit",transition:"all .12s",position:"relative"}}>
            {t.label}
            {t.id==="notice" && unreadNoticeCount > 0 && <span style={{position:"absolute",top:6,right:"50%",transform:"translateX(calc(50% + 14px))",background:"#EF4444",color:"#fff",fontSize:9,fontWeight:700,padding:"1px 5px",borderRadius:8,lineHeight:1.4}}>{unreadNoticeCount}</span>}
            {t.id==="notes" && unreadCommentCount > 0 && <span style={{position:"absolute",top:6,right:"50%",transform:"translateX(calc(50% + 20px))",background:"var(--blue)",color:"#fff",fontSize:9,fontWeight:700,padding:"1px 5px",borderRadius:8,lineHeight:1.4}}>{unreadCommentCount}</span>}
          </button>
        ))}
      </div>

      <div style={{padding:16,maxWidth:640,margin:"0 auto"}}>
        {/* Home Tab */}
        {tab === "home" && (
          <div>
            {/* Announcements preview */}
            {visibleNotices.length > 0 && (
              <div style={{marginBottom:16}}>
                <div style={{fontSize:13,fontWeight:600,color:"var(--ink)",marginBottom:8}}>공지사항</div>
                {visibleNotices.slice(0,2).map(n => (
                  <div key={n.id} style={{background:"#fff",borderRadius:12,padding:"14px 16px",marginBottom:6,boxShadow:"0 1px 4px rgba(0,0,0,.03)",border:"1px solid #F0F0F0",cursor:"pointer"}} onClick={()=>setTab("notice")}>
                    <div style={{display:"flex",alignItems:"center",gap:6}}>
                      {n.pinned && <span style={{fontSize:11}}>📌</span>}
                      <span style={{fontSize:13,fontWeight:600,color:"var(--ink)",flex:1}}>{n.title}</span>
                      <span style={{fontSize:10,color:"#C0C0C0"}}>{fmtDateShort(n.createdAt)}</span>
                    </div>
                  </div>
                ))}
                {visibleNotices.length > 2 && <button style={{background:"none",border:"none",color:"var(--blue)",fontSize:12,cursor:"pointer",fontFamily:"inherit",padding:0}} onClick={()=>handleTabChange("notice")}>전체 보기 →</button>}
              </div>
            )}
            {/* Lesson Schedule */}
            <div style={{marginBottom:16}}>
              <div style={{fontSize:13,fontWeight:600,color:"var(--ink)",marginBottom:8}}>레슨 일정</div>
              {(student.lessons||[]).map(l => (
                <div key={l.instrument} style={{background:"#fff",borderRadius:12,padding:"14px 16px",marginBottom:6,boxShadow:"0 1px 4px rgba(0,0,0,.03)",border:"1px solid #F0F0F0"}}>
                  <div style={{fontSize:14,fontWeight:600,color:"var(--blue)",marginBottom:6}}>{l.instrument}</div>
                  <div style={{display:"flex",flexWrap:"wrap",gap:6}}>
                    {(l.schedule||[]).filter(sc=>sc.day).map((sc,i) => (
                      <span key={i} style={{background:"var(--blue-lt)",color:"var(--blue)",padding:"4px 12px",fontSize:12,fontWeight:500,borderRadius:8}}>{sc.day}요일{sc.time && ` ${sc.time}`}</span>
                    ))}
                  </div>
                </div>
              ))}
            </div>
            {/* Recent Notes */}
            {notes.length > 0 && (
              <div style={{marginBottom:16}}>
                <div style={{fontSize:13,fontWeight:600,color:"var(--ink)",marginBottom:8}}>최근 레슨 노트</div>
                {notes.slice(0,2).map((a,i) => {
                  const st = attStatusStyle[a.status]||{color:"#999",bg:"#F5F5F5",icon:"·",text:""};
                  const ln = a.lessonNote;
                  return (
                    <div key={i} style={{background:"#fff",borderRadius:12,padding:"14px 16px",marginBottom:6,boxShadow:"0 1px 4px rgba(0,0,0,.03)",border:"1px solid #F0F0F0"}}>
                      <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:8}}>
                        <span style={{fontSize:12,color:"#999"}}>{fmtDate(a.date)}</span>
                        <span style={{background:st.bg,color:st.color,fontSize:10,fontWeight:600,padding:"2px 8px",borderRadius:6}}>{st.icon} {st.text}</span>
                      </div>
                      {ln && typeof ln === "object" ? (
                        <div style={{fontSize:13,color:"var(--ink)",lineHeight:1.7}}>
                          {ln.progress && <div>📚 {ln.progress}</div>}
                          {ln.content && <div style={{color:"#666",marginTop:2}}>{ln.content}</div>}
                          {ln.assignment && <div style={{color:"var(--blue)",marginTop:4,fontWeight:500}}>과제: {ln.assignment}</div>}
                        </div>
                      ) : (
                        <div style={{fontSize:13,color:"var(--ink)",lineHeight:1.7,whiteSpace:"pre-wrap"}}>{a.note}</div>
                      )}
                    </div>
                  );
                })}
                {notes.length > 2 && <button style={{background:"none",border:"none",color:"var(--blue)",fontSize:12,cursor:"pointer",fontFamily:"inherit",padding:0}} onClick={()=>setTab("notes")}>전체 레슨노트 보기 →</button>}
              </div>
            )}
            {/* 이번 달 수납 상태 */}
            {(() => {
              const autoAmt = (student.monthlyFee || 0) + (student.instrumentRental ? (student.rentalFee || 0) : 0);
              const tp = sPay.find(p => p.month === THIS_MONTH);
              const isPaid = tp?.paid;
              const amt = tp?.amount || autoAmt;
              return (
                <div style={{marginBottom:16}}>
                  <div style={{fontSize:13,fontWeight:600,color:"var(--ink)",marginBottom:8}}>이번 달 수납</div>
                  <div onClick={()=>setTab("pay")} style={{cursor:"pointer",background:isPaid?"#F0FDF4":"#FFF8F8",border:`1px solid ${isPaid?"#BBF7D0":"#FEE2E2"}`,borderRadius:12,padding:"14px 16px",display:"flex",alignItems:"center",justifyContent:"space-between"}}>
                    <div>
                      <div style={{fontSize:14,fontWeight:600,color:isPaid?"#16A34A":"#DC2626"}}>{isPaid ? "✓ 납부 완료" : `미납 · ${fmtMoney(amt)}`}</div>
                      {tp?.paidDate && <div style={{fontSize:11,color:"#A0A0A0",marginTop:2}}>{fmtDate(tp.paidDate)} 납부</div>}
                      {!tp && <div style={{fontSize:11,color:"#A0A0A0",marginTop:2}}>수납 내역 없음</div>}
                    </div>
                    <span style={{fontSize:18}}>{isPaid ? "✅" : "⚠️"}</span>
                  </div>
                </div>
              );
            })()}
            {/* Basic Info */}
            <div>
              <div style={{fontSize:13,fontWeight:600,color:"var(--ink)",marginBottom:8}}>기본 정보</div>
              <div style={{background:"#fff",borderRadius:12,overflow:"hidden",boxShadow:"0 1px 4px rgba(0,0,0,.03)",border:"1px solid #F0F0F0"}}>
                <div className="info-grid">
                  <div className="ii"><div className="ii-label">담당 강사</div><div className="ii-val">{teacher?teacher.name:"미배정"}</div></div>
                  <div className="ii"><div className="ii-label">수강 시작일</div><div className="ii-val">{fmtDate(student.startDate)}</div></div>
                  <div className="ii"><div className="ii-label">월 수강료</div><div className="ii-val">{fmtMoney(student.monthlyFee)}</div></div>
                  <div className="ii"><div className="ii-label">수강 상태</div><div className="ii-val" style={{color:"#22C55E",fontWeight:500}}>{(student.status||"active")==="active"?"재원":student.status==="paused"?"휴원":"퇴원"}</div></div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Notices Tab */}
        {tab === "notice" && (
          <div>
            <div style={{fontSize:13,fontWeight:600,color:"var(--ink)",marginBottom:10}}>공지사항</div>
            {visibleNotices.length === 0 ? <div className="empty"><div className="empty-icon">📋</div><div className="empty-txt">등록된 공지가 없습니다.</div></div> :
              visibleNotices.map(n => {
                const isExpanded = expandedNotice === n.id;
                const isUnread = !readNoticeIds.has(n.id);
                return (
                  <div key={n.id} onClick={() => handleNoticeOpen(n)} style={{background:"#fff",borderRadius:12,padding:0,marginBottom:8,overflow:"hidden",boxShadow:"0 1px 4px rgba(0,0,0,.03)",border:n.pinned?"1px solid rgba(245,168,0,.3)":isUnread?"1px solid rgba(43,58,159,.2)":"1px solid #F0F0F0",cursor:"pointer"}}>
                    <div style={{padding:"14px 16px",borderBottom:isExpanded?"1px solid #F5F5F5":"none"}}>
                      <div style={{display:"flex",alignItems:"center",gap:6}}>
                        {n.pinned && <span style={{fontSize:11}}>📌</span>}
                        {isUnread && <span style={{width:7,height:7,borderRadius:"50%",background:"var(--blue)",display:"inline-block",flexShrink:0}} />}
                        <span style={{fontSize:14,fontWeight:isUnread?700:600,color:"var(--ink)",flex:1}}>{n.title}</span>
                        <span style={{fontSize:13,color:"#C0C0C0",flexShrink:0}}>{isExpanded ? "▲" : "▼"}</span>
                      </div>
                      <div style={{fontSize:11,color:"#C0C0C0",marginTop:3}}>{n.authorName} · {fmtDateTime(n.createdAt)}</div>
                    </div>
                    {isExpanded && (
                      <div style={{padding:"14px 16px"}}>
                        <div style={{fontSize:13.5,color:"#555",lineHeight:1.8,whiteSpace:"pre-wrap"}}>{n.content}</div>
                        {n.imageBase64 && (
                          <img src={n.imageBase64} alt="공지 이미지" style={{width:"100%",borderRadius:10,marginTop:12,objectFit:"cover",maxHeight:320}} />
                        )}
                      </div>
                    )}
                  </div>
                );
              })
            }
          </div>
        )}

        {/* Attendance Tab */}
        {tab === "att" && (
          <div>
            <div style={{fontSize:13,fontWeight:600,color:"var(--ink)",marginBottom:10}}>출석 이력</div>
            <div style={{display:"flex",gap:6,flexWrap:"wrap",marginBottom:12}}>
              <div style={{background:"#F0FDF4",color:"#22C55E",padding:"6px 12px",borderRadius:8,fontSize:12,fontWeight:600}}>출석 {presentCount}</div>
              <div style={{background:"#FEF2F2",color:"#EF4444",padding:"6px 12px",borderRadius:8,fontSize:12,fontWeight:600}}>결석 {absentCount}</div>
              <div style={{background:"#FFFBEB",color:"#F59E0B",padding:"6px 12px",borderRadius:8,fontSize:12,fontWeight:600}}>지각 {lateCount}</div>
            </div>
            {sAtt.length === 0 ? <div className="empty"><div className="empty-icon">📋</div><div className="empty-txt">출석 기록이 없습니다.</div></div> :
              sAtt.slice(0, 40).map((a, i) => {
                const st = attStatusStyle[a.status] || { color:"#999", bg:"#F5F5F5", icon:"·", text: a.status };
                return (
                  <div key={i} style={{display:"flex",alignItems:"flex-start",gap:10,padding:"12px 14px",background:"#fff",borderRadius:12,marginBottom:6,boxShadow:"0 1px 3px rgba(0,0,0,.02)",border:"1px solid #F0F0F0"}}>
                    <div style={{width:55,flexShrink:0}}><div style={{fontSize:12,color:"#888",fontWeight:500}}>{fmtDateShort(a.date)}</div></div>
                    <div style={{width:34,flexShrink:0}}><span style={{background:st.bg,color:st.color,fontSize:11,fontWeight:600,padding:"2px 8px",borderRadius:6,display:"inline-block"}}>{st.icon}</span></div>
                    <div style={{flex:1,minWidth:0}}>
                      <span style={{fontSize:12,fontWeight:500,color:st.color}}>{st.text}</span>
                      {a.note && typeof a.note === "string" && <div style={{fontSize:12,color:"#888",marginTop:4,lineHeight:1.5}}>{a.note}</div>}
                    </div>
                  </div>
                );
              })
            }
          </div>
        )}

        {/* Lesson Notes Tab */}
        {tab === "notes" && (
          <div>
            <div style={{fontSize:13,fontWeight:600,color:"var(--ink)",marginBottom:10}}>레슨 노트</div>
            {notes.length === 0 ? <div className="empty"><div className="empty-icon">📝</div><div className="empty-txt">작성된 레슨 노트가 없습니다.</div></div> :
              notes.map((a, i) => {
                const st = attStatusStyle[a.status] || { color:"#999", bg:"#F5F5F5", icon:"·", text:"" };
                const ln = a.lessonNote;
                return (
                  <div key={i} style={{background:"#fff",borderRadius:14,padding:0,marginBottom:8,overflow:"hidden",boxShadow:"0 1px 4px rgba(0,0,0,.03)",border:"1px solid #F0F0F0"}}>
                    <div style={{display:"flex",alignItems:"center",gap:8,padding:"12px 16px",background:"#FAFAFA",borderBottom:"1px solid #F0F0F0"}}>
                      <span style={{fontSize:12,fontWeight:500,color:"#888"}}>{fmtDate(a.date)}</span>
                      <span style={{background:st.bg,color:st.color,fontSize:10,fontWeight:600,padding:"2px 8px",borderRadius:6}}>{st.icon} {st.text}</span>
                    </div>
                    <div style={{padding:"14px 16px"}}>
                      {ln && typeof ln === "object" ? (
                        <div style={{fontSize:13,lineHeight:1.8}}>
                          {ln.condition && <div style={{marginBottom:6}}><span style={{fontSize:11,color:"#999"}}>컨디션:</span> <span style={{fontWeight:500,color:ln.condition==="excellent"?"var(--blue)":ln.condition==="good"?"#22C55E":ln.condition==="normal"?"#F59E0B":"#EF4444"}}>{ln.condition==="excellent"?"매우 좋음":ln.condition==="good"?"좋음":ln.condition==="normal"?"보통":"부진"}</span></div>}
                          {ln.progress && <div style={{color:"var(--ink)"}}><strong style={{color:"var(--blue)"}}>진도</strong> {ln.progress}</div>}
                          {ln.content && <div style={{color:"#555",marginTop:4}}>{ln.content}</div>}
                          {ln.assignment && <div style={{marginTop:6,padding:"8px 12px",background:"var(--blue-lt)",borderRadius:8,color:"var(--blue)",fontSize:12.5,fontWeight:500}}>📝 과제: {ln.assignment}</div>}
                          {ln.makeupNeeded && ln.makeupPlan && <div style={{marginTop:4,fontSize:12,color:"#F59E0B"}}>보강: {ln.makeupPlan}</div>}
                          {ln.memo && <div style={{marginTop:4,fontSize:12,color:"#888"}}>{ln.memo}</div>}
                        </div>
                      ) : (
                        <div style={{fontSize:13.5,color:"var(--ink)",lineHeight:1.8,whiteSpace:"pre-wrap"}}>{a.note}</div>
                      )}
                      {/* 댓글 패널 */}
                      <NoteCommentsPanel
                        comments={a.comments || []}
                        onAddComment={async (comment) => {
                          const upd = attendance.map(rec => rec.id === a.id ? { ...rec, comments: [...(rec.comments||[]), comment] } : rec);
                          await saveAttendance(upd);
                        }}
                        onDeleteComment={async (commentId) => {
                          const upd = attendance.map(rec => rec.id === a.id
                            ? { ...rec, comments: (rec.comments||[]).map(c => c.id === commentId ? { ...c, deletedAt: Date.now() } : c) }
                            : rec);
                          await saveAttendance(upd);
                        }}
                        authorType="student"
                        authorName={student.name}
                        authorId={student.id}
                        viewerRole="student"
                      />
                    </div>
                  </div>
                );
              })
            }
          </div>
        )}

        {/* Payment Tab — Invoice Style */}
        {tab === "pay" && (
          <div>
            <div style={{fontSize:13,fontWeight:600,color:"var(--ink)",marginBottom:10}}>수납 이력</div>
            {sPay.length === 0 ? <div className="empty"><div className="empty-icon">💳</div><div className="empty-txt">수납 기록이 없습니다.</div></div> :
              sPay.slice(0, 24).map((p, i) => {
                const baseFee = student.monthlyFee || 0;
                const rentalFee = student.instrumentRental ? (student.rentalFee || 0) : 0;
                const rentalLabel = student.rentalType ? student.rentalType.replace("rental:", "") : "악기 대여";
                const extraChargesSum = (p.extraCharges||[]).reduce((s,ec)=>s+(ec.amount||0),0);
                const autoTotal = baseFee + rentalFee + extraChargesSum;
                const total = p.amount || autoTotal;
                const adjustment = total - autoTotal;
                const methodLabel = { transfer: "계좌이체", cash: "현금", card: "카드" };
                const isPaid = !!p.paid;
                return (
                  <div key={i} style={{background:"#fff",borderRadius:14,marginBottom:10,overflow:"hidden",boxShadow:"0 2px 8px rgba(0,0,0,.04)",border:`1px solid ${isPaid?"#E6F7EE":"#FEE2E2"}`}}>
                    {/* 명세서 헤더 */}
                    <div style={{padding:"12px 16px",background:isPaid?"#F0FDF4":"#FFF8F8",borderBottom:"1px solid #F0F0F0",display:"flex",alignItems:"center",justifyContent:"space-between"}}>
                      <div>
                        <div style={{fontSize:13,fontWeight:700,color:"var(--ink)",fontFamily:"'Noto Serif KR',serif"}}>{monthLabel(p.month)} 수강료 명세서</div>
                        {p.paidDate && <div style={{fontSize:10,color:"#A0A0A0",marginTop:2}}>납부일: {fmtDate(p.paidDate)}{p.method ? ` · ${methodLabel[p.method] || p.method}` : ""}</div>}
                      </div>
                      <div style={{fontSize:13,fontWeight:700,color:isPaid?"#22C55E":"#EF4444",background:isPaid?"#DCFCE7":"#FEE2E2",padding:"4px 12px",borderRadius:20}}>
                        {isPaid ? "✓ 완료" : "미납"}
                      </div>
                    </div>
                    {/* 명세 항목 */}
                    <div style={{padding:"12px 16px"}}>
                      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"5px 0",fontSize:13,color:"var(--ink)"}}>
                        <span>기본 수강료</span>
                        <span style={{fontFamily:"'Noto Serif KR',serif",fontWeight:500}}>{fmtMoney(baseFee)}</span>
                      </div>
                      {rentalFee > 0 && (
                        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"5px 0",fontSize:13,color:"var(--ink)"}}>
                          <span style={{display:"flex",alignItems:"center",gap:4}}>악기 대여료 <span style={{fontSize:10,color:"#A0A0A0",background:"#F5F5F5",padding:"1px 6px",borderRadius:4}}>{rentalLabel}</span></span>
                          <span style={{fontFamily:"'Noto Serif KR',serif",fontWeight:500}}>{fmtMoney(rentalFee)}</span>
                        </div>
                      )}
                      {(p.extraCharges||[]).map((ec, ei) => (
                        <div key={ei} style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"5px 0",fontSize:13,color:"var(--ink)"}}>
                          <span style={{display:"flex",alignItems:"center",gap:4}}>
                            {ec.title}
                            <span style={{fontSize:10,color:"#A0A0A0",background:"#F5F5F5",padding:"1px 6px",borderRadius:4}}>추가</span>
                          </span>
                          <span style={{fontFamily:"'Noto Serif KR',serif",fontWeight:500}}>{fmtMoney(ec.amount||0)}</span>
                        </div>
                      ))}
                      {adjustment !== 0 && (
                        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"5px 0",fontSize:12,color:adjustment > 0 ? "#7C3AED" : "#DC2626"}}>
                          <span>{adjustment > 0 ? "추가 조정" : "차감 조정"}</span>
                          <span style={{fontFamily:"'Noto Serif KR',serif"}}>{adjustment > 0 ? "+" : ""}{fmtMoney(adjustment)}</span>
                        </div>
                      )}
                      {/* 구분선 + 합계 */}
                      <div style={{borderTop:"1.5px solid #E8E8E8",marginTop:6,paddingTop:8,display:"flex",justifyContent:"space-between",alignItems:"center"}}>
                        <span style={{fontSize:13,fontWeight:600,color:"var(--ink)"}}>합계</span>
                        <span style={{fontFamily:"'Noto Serif KR',serif",fontSize:17,fontWeight:700,color:isPaid?"#22C55E":"var(--ink)"}}>{fmtMoney(total)}</span>
                      </div>
                      {p.note && <div style={{marginTop:8,fontSize:11,color:"#A0A0A0",background:"#FAFAFA",padding:"6px 10px",borderRadius:6}}>📝 {p.note}</div>}
                    </div>
                  </div>
                );
              })
            }
          </div>
        )}

        <div style={{textAlign:"center",padding:"24px 0 calc(24px + env(safe-area-inset-bottom,0px))",fontSize:11,color:"#D0D0D0"}}>
          My RYE-K · RYE-K K-Culture Center
        </div>
      </div>
    </div></>
  );
}
