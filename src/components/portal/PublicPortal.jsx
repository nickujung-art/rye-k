import { UpdatePopup } from "../updates/UpdatePopup";
import { useState, useEffect, useRef } from "react";
import { db, doc, setDoc, onSnapshot, firebaseSignInAnon, runTransaction } from "../../firebase.js";
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
    lessonDay: "", lessonTime: "", monthlyFee: 0, startDate: TODAY_STR,
    pendingOneTimeCharges: [],
  });
  const [submitted, setSubmitted] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [err, setErr] = useState("");
  const [categories, setCategories] = useState(DEFAULT_CATEGORIES);
  const [privacyAgreed, setPrivacyAgreed] = useState(false);
  const [optionalAgreed, setOptionalAgreed] = useState(false);
  const [showFullPolicy, setShowFullPolicy] = useState(false);
  const [showPhotoPolicy, setShowPhotoPolicy] = useState(false);
  const [feePresets, setFeePresets] = useState({});
  const fileRef = useRef();
  const set = (k, v) => { setForm(f => ({ ...f, [k]: v })); setErr(""); };

  // Silver UX — 고가독성 스타일 (태블릿·어르신 최적화)
  const SILVER_CSS = `
.silver-form .inp{min-height:56px;font-size:18px !important;padding-top:15px !important;padding-bottom:15px !important;border:2px solid #6B7280 !important;border-radius:10px !important;color:#111827 !important}
.silver-form .inp:focus{border-color:var(--blue) !important}
.silver-form .sel{min-height:56px;font-size:18px !important;padding-top:15px !important;padding-bottom:15px !important;border:2px solid #6B7280 !important;border-radius:10px !important;color:#111827 !important}
.silver-form textarea.inp{min-height:120px !important;line-height:1.75 !important}
.silver-form .fg-label{color:#111827 !important;font-size:16px !important;font-weight:700 !important;margin-bottom:10px !important;letter-spacing:0 !important}
.silver-form .fg{margin-bottom:24px !important}
.silver-form .btn{min-height:54px !important;font-size:17px !important;font-weight:700 !important;border-radius:10px !important}
.silver-form .ftab{font-size:15px !important;min-height:48px !important;padding:10px 16px !important;font-weight:600 !important}
.silver-form .inst-check{font-size:16px !important;padding:12px 14px !important}
.silver-form .inst-check-box{width:22px !important;height:22px !important;font-size:14px !important}
.silver-form .time-inp{min-height:56px;font-size:18px !important;padding:15px 12px !important;border:2px solid #6B7280 !important;border-radius:10px !important;color:#111827 !important}
.silver-form .form-err{font-size:15px !important;padding:12px 16px !important}
.silver-form input[type="date"]{max-width:100% !important;box-sizing:border-box !important;-webkit-appearance:none !important}
`;

  useEffect(() => {
    // Anonymous auth for Firestore access
    firebaseSignInAnon();
    const unsubCat = onSnapshot(doc(db, COLLECTION, "rye-categories"), (snap) => {
      if (snap.exists()) setCategories(snap.data().value || DEFAULT_CATEGORIES);
    }, () => {});
    const unsubFee = onSnapshot(doc(db, COLLECTION, "rye-fee-presets"), (snap) => {
      if (snap.exists()) setFeePresets(snap.data().value || {});
    }, () => {});
    return () => { unsubCat(); unsubFee(); };
  }, []);

  const handlePhoto = async (e) => { const file = e.target.files?.[0]; if (!file) return; try { const compressed = await compressImage(file, 360, 0.75); set("photo", compressed); } catch(err) { setErr("사진 처리 중 오류가 발생했습니다."); } };
  const toggleInst = (inst) => { setForm(f => ({ ...f, desiredInstruments: f.desiredInstruments.includes(inst) ? f.desiredInstruments.filter(x => x !== inst) : [...f.desiredInstruments, inst] })); setErr(""); };
  const validateStep1 = () => { if (!form.name.trim()) { setErr("이름을 입력해주세요."); return false; } if (!form.birthDate) { setErr("생년월일을 입력해주세요. (My RYE-K 로그인 비밀번호로 사용됩니다)"); return false; } if (!form.phone.trim() && !form.guardianPhone.trim()) { setErr("연락처 또는 보호자 연락처를 입력해주세요."); return false; } return true; };
  const validateStep2 = () => { if (form.desiredInstruments.length === 0) { setErr("희망 과목을 하나 이상 선택해주세요."); return false; } return true; };

  const handleSubmit = async () => {
    if (!privacyAgreed) { setErr("개인정보 수집·이용에 동의해주세요."); return; }
    setSubmitting(true);
    try {
      const reg = { id: uid(), name: form.name.trim(), birthDate: form.birthDate, phone: form.phone, guardianPhone: form.guardianPhone, desiredInstruments: form.desiredInstruments, notes: form.notes.trim(), photo: form.photo, experience: form.experience === "yes" ? form.experienceDetail : "없음", purpose: form.purpose === "기타" ? form.purposeOther : form.purpose, referral: form.referral === "기타" ? form.referralOther : form.referral, optionalConsent: optionalAgreed, consent: { privacy: { agreed: true, agreedAt: Date.now(), ip: null }, photo: { agreed: optionalAgreed, agreedAt: optionalAgreed ? Date.now() : null } }, teacherName: form.teacherName, lessonType: form.lessonType === "기타" ? form.lessonTypeOther : form.lessonType, lessonDay: form.lessonDay, lessonTime: form.lessonTime, monthlyFee: form.monthlyFee, instrumentRental: form.pendingOneTimeCharges.some(c => c.type === "악기 대여"), pendingOneTimeCharges: form.pendingOneTimeCharges.filter(c => c.name.trim() || c.amount > 0), startDate: form.startDate, status: "pending", createdAt: Date.now() };
      const pendingRef = doc(db, COLLECTION, "rye-pending");
      await runTransaction(db, async (tx) => {
        const snap = await tx.get(pendingRef);
        const existing = snap.exists() ? (snap.data().value || []) : [];
        tx.set(pendingRef, { value: [...existing, reg], updatedAt: Date.now() });
      });
      setSubmitted(true);
    } catch (e) {
      setErr("제출에 실패했습니다. 입력하신 내용은 보존되어 있습니다 — 네트워크를 확인 후 다시 시도해주세요.");
      try { sessionStorage.setItem("ryekRegisterDraft", JSON.stringify(form)); } catch {}
    } finally { setSubmitting(false); }
  };

  if (submitted) return (<><style>{CSS}</style><div style={{minHeight:"100vh",background:"#fff",display:"flex",alignItems:"center",justifyContent:"center",padding:20}}><div style={{maxWidth:400,width:"100%",textAlign:"center"}}><div style={{width:64,height:64,borderRadius:"50%",background:"#F0FDF4",display:"flex",alignItems:"center",justifyContent:"center",margin:"0 auto 20px",fontSize:28}}>✓</div><div style={{fontFamily:"'Noto Serif KR',serif",fontSize:20,fontWeight:600,marginBottom:10}}>등록이 완료되었습니다</div><div style={{fontSize:14,color:"var(--ink-60)",lineHeight:1.7,marginBottom:24}}><strong>{form.name}</strong>님의 수강 등록 신청이 정상적으로 접수되었습니다.</div><button className="btn btn-primary btn-full" onClick={() => { setSubmitted(false); setForm({name:"",birthDate:"",phone:"",guardianPhone:"",desiredInstruments:[],notes:"",photo:"",experience:"none",experienceDetail:"",purpose:"",purposeOther:"",referral:"",referralOther:"",teacherName:"",lessonType:"",lessonTypeOther:"",lessonDay:"",lessonTime:"",monthlyFee:0,startDate:TODAY_STR,pendingOneTimeCharges:[]}); setStep(1); setPrivacyAgreed(false); setOptionalAgreed(false); }}>새로운 등록</button></div></div></>);

  const progressPct = (step / 4) * 100;
  // 악기 대여 프리셋 목록 (rental:XXX 키 파싱)
  const rentalOptions = Object.entries(feePresets).filter(([k]) => k.startsWith("rental:")).map(([k, v]) => ({ name: k.replace("rental:", ""), amount: v || 0 }));

  return (
    <><style>{CSS}</style><style>{SILVER_CSS}</style>
    <div style={{minHeight:"100vh",background:"var(--bg)",padding:"20px 16px"}}>
      <div style={{maxWidth:480,margin:"0 auto"}} className="silver-form">
        <div style={{textAlign:"center",marginBottom:24}}>
          <Logo size={52} />
          <div style={{fontFamily:"'Noto Serif KR',serif",fontSize:20,fontWeight:700,color:"var(--blue)",marginTop:10}}>RYE-K K-Culture Center</div>
          <div style={{fontSize:14,color:"var(--ink-30)",letterSpacing:1.5,marginTop:4}}>수강 등록 신청서</div>
        </div>
        <div style={{display:"flex",alignItems:"center",gap:10,marginBottom:20}}>
          <div style={{flex:1,height:6,background:"var(--border)",borderRadius:3,overflow:"hidden"}}><div style={{width:`${progressPct}%`,height:"100%",background:"var(--blue)",borderRadius:3,transition:"width .3s"}} /></div>
          <span style={{fontSize:14,fontWeight:600,color:"#374151",flexShrink:0}}>STEP {step}/4</span>
        </div>
        {err && <div className="form-err" style={{marginBottom:12}}>⚠ {err}</div>}

        {step === 1 && (
          <div className="card" style={{padding:0,overflow:"hidden"}}>
            <div style={{background:"linear-gradient(90deg,var(--blue),var(--blue-md))",padding:"16px 20px",color:"#fff",fontSize:17,fontWeight:700}}>기본 정보</div>
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
            <div style={{background:"linear-gradient(90deg,var(--blue),var(--blue-md))",padding:"16px 20px",color:"#fff",fontSize:17,fontWeight:700}}>수업 정보</div>
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
              <div style={{background:"linear-gradient(90deg,var(--blue),var(--blue-md))",padding:"16px 20px",color:"#fff",fontSize:17,fontWeight:700}}>약관 동의</div>
              <div style={{padding:20}}>
                <div style={{background:"var(--bg)",border:"1px solid var(--border)",borderRadius:8,padding:14,marginBottom:12,fontSize:12.5,lineHeight:1.8,color:"var(--ink-60)"}}>
                  <div style={{fontWeight:600,color:"var(--ink)",marginBottom:5}}>개인정보 수집·이용 동의</div>
                  <div><span style={{background:"var(--blue)",color:"#fff",fontSize:9,padding:"1px 6px",borderRadius:3,fontWeight:600,marginRight:4}}>필수</span>이름, 연락처, 생년월일</div>
                  <div><span style={{background:"var(--ink-30)",color:"#fff",fontSize:9,padding:"1px 6px",borderRadius:3,fontWeight:600,marginRight:4}}>선택</span>보호자 연락처, 사진, 희망 과목, 특이사항</div>
                  <div style={{fontSize:11.5,color:"var(--ink-30)",marginTop:6}}>보유 기간: 수강 종료 후 1년간 보유 후 파기</div>
                </div>
                <button onClick={()=>setShowFullPolicy(!showFullPolicy)} style={{background:"none",border:"none",color:"var(--blue)",fontSize:12,cursor:"pointer",padding:0,textDecoration:"underline",fontFamily:"inherit",marginBottom:10,display:"block"}}>{showFullPolicy?"▲ 전문 닫기":"▼ 개인정보 처리 전문 보기"}</button>
                {showFullPolicy && (<div style={{background:"#FAFAFA",border:"1px solid var(--border)",borderRadius:8,padding:14,marginBottom:12,fontSize:11.5,lineHeight:1.9,color:"var(--ink-60)",whiteSpace:"pre-wrap",maxHeight:220,overflowY:"auto"}}>{`[개인정보 수집·이용 동의서]\n\n「개인정보 보호법」 제15조 및 제22조에 따라 안내드립니다.\n\n1. 수집·이용 목적: 수강 등록 접수 및 상담, 수업 관리, 수강료 안내, 출결 관리\n2. 수집 항목: [필수] 이름, 연락처, 생년월일 / [선택] 보호자 연락처, 사진, 희망 과목, 특이사항\n3. 보유·이용 기간: 수강 종료 후 1년간 보유 후 파기\n4. 동의 거부 권리: 필수항목 미동의 시 수강 등록 불가. 선택항목 미동의 시 수강에 영향 없음.\n5. 만 14세 미만 아동: 법정대리인(보호자)의 동의를 받아 수집합니다.`}</div>)}
                <div onClick={()=>setPrivacyAgreed(!privacyAgreed)} style={{display:"flex",alignItems:"flex-start",gap:14,cursor:"pointer",padding:"14px 0",userSelect:"none"}}><div style={{width:30,height:30,borderRadius:8,border:`2.5px solid ${privacyAgreed?"var(--blue)":"#6B7280"}`,background:privacyAgreed?"var(--blue)":"var(--paper)",display:"flex",alignItems:"center",justifyContent:"center",transition:"all .15s",flexShrink:0,marginTop:2}}>{privacyAgreed && <span style={{color:"#fff",fontSize:17,fontWeight:700}}>✓</span>}</div><div style={{fontSize:17,color:"#111827",lineHeight:1.6}}><span style={{fontWeight:700}}>[필수]</span> 개인정보 수집·이용에 동의합니다.</div></div>
                <div className="divider" />
                <div style={{background:"var(--gold-lt)",border:"1px solid rgba(245,168,0,.2)",borderRadius:8,padding:14,marginBottom:12,fontSize:12.5,lineHeight:1.8,color:"var(--ink-60)"}}><div style={{fontWeight:600,color:"var(--ink)",marginBottom:5}}>수업 보강 및 이월 규정</div><div>• 월 4회 기본 수업 (매월 첫 주 수강료 납입)</div><div>• 레슨 당일 무단 결석 시, 보강 및 이월이 불가합니다.</div><div>• 레슨 전 사전 고지 시, 강사와 협의하여 보강 수업을 조율할 수 있습니다.</div><div>• 단, 그룹 수업(강좌)의 경우 별도 보강은 진행되지 않습니다.</div></div>
                <div className="divider" />
                <button onClick={()=>setShowPhotoPolicy(!showPhotoPolicy)} style={{background:"none",border:"none",color:"var(--ink-60)",fontSize:12,cursor:"pointer",padding:0,fontFamily:"inherit",marginBottom:8,display:"block",textDecoration:"underline"}}>{showPhotoPolicy?"▲ 촬영·이용 동의 상세 닫기":"▼ 사진 및 동영상 촬영·이용 동의 상세 보기"}</button>
                {showPhotoPolicy && (<div style={{background:"#FAFAFA",border:"1px solid var(--border)",borderRadius:8,padding:14,marginBottom:10,fontSize:11.5,lineHeight:1.9,color:"var(--ink-60)",whiteSpace:"pre-wrap",maxHeight:200,overflowY:"auto"}}>{`[선택] 사진 및 동영상 촬영·이용 및 제3자 제공 동의\n\n1. 수집 및 이용 목적: 교육·행사 기록, 기관 홍보 콘텐츠 제작 및 공식 SNS·홈페이지 게시\n2. 수집 항목: 교육·행사 중 촬영된 초상(사진, 동영상) 및 음성\n3. 제3자 제공 대상: 홍보 콘텐츠 시청자, 영상 제작 대행사, 보도 매체\n4. 보유·이용 기간: 목적 달성 후 파기 (홍보물 게시 시 철회 요청 시까지)\n5. 동의 거부 시: 촬영에서 제외되거나, 홍보물 내 블러(모자이크) 처리될 수 있습니다.`}</div>)}
                <div onClick={()=>setOptionalAgreed(!optionalAgreed)} style={{display:"flex",alignItems:"flex-start",gap:14,cursor:"pointer",padding:"14px 0",userSelect:"none"}}><div style={{width:30,height:30,borderRadius:8,border:`2.5px solid ${optionalAgreed?"var(--blue)":"#6B7280"}`,background:optionalAgreed?"var(--blue)":"var(--paper)",display:"flex",alignItems:"center",justifyContent:"center",transition:"all .15s",flexShrink:0,marginTop:2}}>{optionalAgreed && <span style={{color:"#fff",fontSize:17,fontWeight:700}}>✓</span>}</div><div style={{fontSize:17,color:"#111827",lineHeight:1.6}}><span style={{fontWeight:600,color:"#6B7280"}}>[선택]</span> 사진·동영상 촬영·이용 및 제3자 제공에 동의합니다.<div style={{fontSize:14,color:"#6B7280",marginTop:4}}>미동의 시에도 수강에 영향 없습니다.</div></div></div>
              </div>
            </div>
            <div style={{display:"flex",gap:8}}><button className="btn btn-secondary" style={{flex:1}} onClick={()=>setStep(2)}>이전</button><button className="btn btn-primary" style={{flex:2}} onClick={()=>{ if(!privacyAgreed){setErr("개인정보 수집·이용에 동의해주세요.");return;} setStep(4); }} disabled={!privacyAgreed}>다음</button></div>
          </div>
        )}

        {step === 4 && (
          <div className="card" style={{padding:0,overflow:"hidden"}}>
            <div style={{background:"linear-gradient(90deg,var(--gold-dk),var(--gold))",padding:"16px 20px",color:"#fff",fontSize:17,fontWeight:700}}>강사 작성란</div>
            <div style={{padding:"6px 20px 0"}}><div style={{fontSize:14,color:"var(--ink-60)",lineHeight:1.6,padding:"10px 0",borderBottom:"1px solid var(--border)"}}>아래 항목은 상담 강사가 직접 작성합니다.</div></div>
            <div style={{padding:20}}>
              <div className="fg"><label className="fg-label">담당 강사</label><input className="inp" value={form.teacherName} onChange={e=>set("teacherName",e.target.value)} placeholder="강사 이름" /></div>
              <div className="fg"><label className="fg-label">수업 구분</label><div style={{display:"flex",gap:6,flexWrap:"wrap",marginBottom:form.lessonType==="기타"?8:0}}>{["그룹 (초급반)","소그룹 (중급반)","개인 (초급)","개인 (중급)","개인 (고급)","기타"].map(t => (<button key={t} className={`ftab ${form.lessonType===t?"active":""}`} onClick={()=>set("lessonType",t)} style={{textAlign:"center",padding:"6px 10px",fontSize:11.5}}>{t}</button>))}</div>{form.lessonType==="기타" && <input className="inp" value={form.lessonTypeOther} onChange={e=>set("lessonTypeOther",e.target.value)} placeholder="직접 입력" />}</div>
              <div className="fg-row"><div className="fg"><label className="fg-label">수업 요일</label><input className="inp" value={form.lessonDay} onChange={e=>set("lessonDay",e.target.value)} placeholder="예: 화, 목" /></div><div className="fg"><label className="fg-label">시간</label><input className="time-inp" type="time" value={form.lessonTime} onChange={e=>set("lessonTime",e.target.value)} style={{width:"100%"}} /></div></div>
              <div className="fg"><label className="fg-label">월 수강료</label><div style={{position:"relative",maxWidth:220}}><input className="inp" inputMode="numeric" value={form.monthlyFee?form.monthlyFee.toLocaleString("ko-KR"):""} onChange={e=>set("monthlyFee",parseInt(e.target.value.replace(/[^\d]/g,""))||0)} placeholder="0" style={{paddingRight:30}} /><span style={{position:"absolute",right:12,top:"50%",transform:"translateY(-50%)",fontSize:13,color:"var(--ink-30)",pointerEvents:"none"}}>원</span></div></div>
              <div className="fg">
                <label className="fg-label">단발성 청구</label>
                {["악기 대여","악기 구매","교재 구매","악세사리/기타"].map(type => {
                  const charge = form.pendingOneTimeCharges.find(c => c.type === type);
                  const checked = !!charge;
                  const toggle = () => setForm(f => {
                    const exists = f.pendingOneTimeCharges.find(c => c.type === type);
                    return { ...f, pendingOneTimeCharges: exists
                      ? f.pendingOneTimeCharges.filter(c => c.type !== type)
                      : [...f.pendingOneTimeCharges, { type, name: "", amount: 0 }] };
                  });
                  return (
                    <div key={type} style={{marginBottom:4}}>
                      <div style={{display:"flex",alignItems:"center",gap:12,cursor:"pointer",padding:"10px 0"}} onClick={toggle}>
                        <div style={{width:28,height:28,border:`2.5px solid ${checked?"var(--blue)":"#6B7280"}`,borderRadius:8,display:"flex",alignItems:"center",justifyContent:"center",background:checked?"var(--blue)":"var(--paper)",transition:"all .12s",flexShrink:0}}>{checked && <span style={{color:"#fff",fontSize:16,fontWeight:700}}>✓</span>}</div>
                        <span style={{fontSize:17,color:"#111827",fontWeight:checked?600:400}}>{type}</span>
                      </div>
                      {checked && (
                        <div style={{display:"flex",gap:8,marginLeft:40,marginBottom:10}}>
                          {/* 악기 대여: 프리셋 드롭다운, 선택 시 금액 자동 입력 */}
                          {type === "악기 대여" ? (
                            <select className="sel" value={charge.name} style={{flex:2}} onChange={e => {
                              const nm = e.target.value;
                              const preset = rentalOptions.find(r => r.name === nm);
                              setForm(f => ({...f, pendingOneTimeCharges: f.pendingOneTimeCharges.map(c =>
                                c.type === type ? {...c, name: nm, amount: preset ? preset.amount : c.amount} : c
                              )}));
                            }}>
                              <option value="">악기 선택…</option>
                              {rentalOptions.length > 0
                                ? rentalOptions.map(r => <option key={r.name} value={r.name}>{r.name}{r.amount > 0 ? ` (${r.amount.toLocaleString("ko-KR")}원/월)` : ""}</option>)
                                : <option disabled>등록된 악기 없음</option>}
                            </select>
                          ) : (
                            <input className="inp" value={charge.name} onChange={e => setForm(f => ({...f, pendingOneTimeCharges: f.pendingOneTimeCharges.map(c => c.type===type ? {...c, name:e.target.value} : c)}))} placeholder="항목명" style={{flex:2}} />
                          )}
                          <div style={{position:"relative",flex:1}}>
                            <input className="inp" inputMode="numeric" value={charge.amount ? charge.amount.toLocaleString("ko-KR") : ""} onChange={e => setForm(f => ({...f, pendingOneTimeCharges: f.pendingOneTimeCharges.map(c => c.type===type ? {...c, amount: Number(e.target.value.replace(/[^\d]/g,""))||0} : c)}))} placeholder="0" style={{paddingRight:26}} />
                            <span style={{position:"absolute",right:10,top:"50%",transform:"translateY(-50%)",fontSize:13,color:"#6B7280",pointerEvents:"none"}}>원</span>
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
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
function PortalHeatmap({ sAtt }) {
  const WEEKS = 26;
  const today = new Date();
  const toStr = d => `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}-${String(d.getDate()).padStart(2,"0")}`;
  const todayStr = toStr(today);
  const colorMap = { present:"var(--green)", late:"#86EFAC", absent:"var(--red)", excused:"var(--blue)" };
  const attMap = {};
  sAtt.forEach(a => { if (a.date && a.status) attMap[a.date] = a.status; });
  const start = new Date(today);
  const dow = (start.getDay() + 6) % 7;
  start.setDate(start.getDate() - dow - (WEEKS - 1) * 7);
  const weeks = Array.from({length: WEEKS}, (_, w) =>
    Array.from({length: 7}, (_, d) => {
      const dt = new Date(start); dt.setDate(start.getDate() + w * 7 + d);
      const ds = toStr(dt);
      return { ds, status: attMap[ds], isFuture: ds > todayStr };
    })
  );
  return (
    <div style={{marginBottom:16}}>
      <div style={{overflowX:"auto",WebkitOverflowScrolling:"touch",paddingBottom:4}}>
        <div style={{display:"flex",gap:2,width:"fit-content"}}>
          {weeks.map((week,wi) => (
            <div key={wi} style={{display:"flex",flexDirection:"column",gap:2}}>
              {week.map(({ds,status,isFuture}) => (
                <div key={ds} style={{width:12,height:12,borderRadius:3,background:isFuture?"transparent":status?colorMap[status]||"#E5E7EB":"#F3F4F6",opacity:isFuture?0:1}} title={ds} />
              ))}
            </div>
          ))}
        </div>
      </div>
      <div style={{display:"flex",gap:10,marginTop:6,flexWrap:"wrap"}}>
        {[["var(--green)","출석"],["#86EFAC","지각"],["var(--red)","결석"],["var(--blue)","보강"]].map(([c,l]) => (
          <div key={l} style={{display:"flex",alignItems:"center",gap:4}}>
            <div style={{width:10,height:10,borderRadius:2,background:c}} />
            <span style={{fontSize:10,color:"#999"}}>{l}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

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
  // 2단계 로그인
  const [loginStep, setLoginStep] = useState("id"); // "id" | "pw"
  const [pendingStudent, setPendingStudent] = useState(null);
  // 다자녀 선택 모달 (ID 확인 후)
  const [childCandidates, setChildCandidates] = useState([]);
  const [childModalErr, setChildModalErr] = useState("");
  // 자녀 전환 (로그인 후)
  const [showSiblingModal, setShowSiblingModal] = useState(false);
  const [switchErr, setSwitchErr] = useState("");
  const [textLarge, setTextLarge] = useState(() => { try { return localStorage.getItem("rye-text-large") === "1"; } catch { return false; } });
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

  // 데이터 로드 후 localStorage로 자동 로그인 (활성 회원만)
  useEffect(() => {
    if (!loading && students.length > 0 && !loggedIn) {
      try {
        const saved = JSON.parse(localStorage.getItem("ryekPortal") || "null");
        if (saved?.code && saved?.pw) {
          const found = students.find(s => s.studentCode === saved.code);
          if (found && getBirthPassword(found.birthDate) === saved.pw && (found.status || "active") === "active") {
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

  // ── 로그인 최종 처리 (상태 체크 포함) ───────────────────────────────────────
  const doLogin = (found, errSetter = setLoginErr) => {
    const status = found.status || "active";
    if (status === "paused") {
      errSetter("현재 휴원 중인 계정입니다. 복귀 문의는 센터로 연락주세요.");
      return false;
    }
    if (status !== "active") {
      errSetter("퇴원 처리된 계정입니다. 문의사항은 센터로 연락주세요.");
      return false;
    }
    setStudent(found);
    setLoggedIn(true);
    setLoginStep("id");
    setPendingStudent(null);
    try {
      localStorage.setItem("ryekPortal", JSON.stringify({ code: found.studentCode, pw: getBirthPassword(found.birthDate) }));
      if (saveCode) localStorage.setItem("ryekSavedCode", found.studentCode);
      else localStorage.removeItem("ryekSavedCode");
    } catch {}
    initReadState(found.id);
    return true;
  };

  // ── STEP 1: ID 확인 → 대상 특정 ─────────────────────────────────────────────
  const handleIdConfirm = () => {
    setLoginErr("");
    if (!loginCode.trim()) { setLoginErr("회원코드 또는 연락처를 입력하세요."); return; }

    // 1a. 회원코드(studentCode) 우선 검색
    const byCode = students.find(s => s.studentCode === loginCode.trim().toUpperCase());
    if (byCode) {
      setPendingStudent(byCode);
      setLoginPw("");
      setLoginStep("pw");
      return;
    }

    // 1b. 연락처(숫자만 추출) 검색 — 퇴원 제외
    const rawPhone = loginCode.replace(/\D/g, "");
    if (rawPhone.length >= 9) {
      const matches = students.filter(s => {
        const st = s.status || "active";
        if (st !== "active" && st !== "paused") return false; // 퇴원 제외
        const p = (s.phone || "").replace(/\D/g, "");
        const gp = (s.guardianPhone || "").replace(/\D/g, "");
        return p === rawPhone || gp === rawPhone;
      });
      if (matches.length === 0) { setLoginErr("회원코드 또는 연락처를 찾을 수 없습니다."); return; }
      if (matches.length === 1) {
        setPendingStudent(matches[0]);
        setLoginPw("");
        setLoginStep("pw");
        return;
      }
      // 2명 이상 → 자녀 선택 모달 (PW 입력 전)
      setChildCandidates(matches);
      setChildModalErr("");
      return;
    }

    setLoginErr("회원코드 또는 연락처를 찾을 수 없습니다.");
  };

  // ── 자녀 선택 → PW 단계로 전환 (모달에서 PW는 묻지 않음) ─────────────────────
  const handleChildSelect = (child) => {
    setChildCandidates([]);
    setChildModalErr("");
    setPendingStudent(child);
    setLoginPw("");
    setLoginStep("pw");
  };

  // ── STEP 2: 비밀번호 확인 → 로그인 ──────────────────────────────────────────
  const handlePwConfirm = () => {
    setLoginErr("");
    if (!loginPw.trim()) { setLoginErr("비밀번호를 입력하세요."); return; }
    if (loginPw !== getBirthPassword(pendingStudent.birthDate)) {
      setLoginErr("비밀번호가 올바르지 않습니다. (생일 4자리: MMDD)"); return;
    }
    doLogin(pendingStudent);
  };

  // ── 로그인 후 자녀 전환 (PW 없이, 가족 인증 신뢰) ────────────────────────────
  const handleSiblingSwitch = (sibling) => {
    const ok = doLogin(sibling, setSwitchErr);
    if (ok) { setShowSiblingModal(false); setSwitchErr(""); setTab("home"); }
  };

  const handleTabChange = (tabId) => {
    setTab(tabId);
    if (!student) return;
    if (tabId === "notes") markNotesRead(student.id);
    if (tabId === "notice") markNoticesRead(student.id, visibleNotices.map(n => n.id));
  };

  if (loading) return <><style>{CSS}</style><div className="loading-screen"><div className="loading-logo"><Logo size={56} /></div><div className="loading-text">RYE-K</div></div></>;

  // ── 로그인 화면 (2단계) ───────────────────────────────────────────────────────
  if (!loggedIn) {
    // 자녀 카드 공통 렌더 (선택 모달에서 재사용)
    const ChildCard = ({ child, onClick }) => {
      const insts = (child.lessons||[]).map(l=>l.instrument).filter(Boolean).join(" · ");
      return (
        <button onClick={onClick}
          style={{background:"#F8FAFF",border:"2px solid #E8EAF6",borderRadius:16,padding:"18px 20px",cursor:"pointer",fontFamily:"inherit",textAlign:"left",transition:"all .15s",WebkitTapHighlightColor:"transparent",width:"100%",minHeight:72}}
          onMouseEnter={e=>{e.currentTarget.style.border="2px solid var(--blue)";e.currentTarget.style.background="var(--blue-lt)";}}
          onMouseLeave={e=>{e.currentTarget.style.border="2px solid #E8EAF6";e.currentTarget.style.background="#F8FAFF";}}
        >
          <div style={{fontSize:18,fontWeight:700,color:"var(--ink)"}}>{child.name}</div>
          {insts && <div style={{fontSize:14,color:"var(--blue)",marginTop:4,fontWeight:500}}>{insts}</div>}
          <div style={{fontSize:11,color:"#C0C0C0",marginTop:4,fontFamily:"monospace",letterSpacing:1}}>{child.studentCode}</div>
        </button>
      );
    };

    return (
      <><style>{CSS}</style>
      <div style={{minHeight:"100vh",minHeight:"100dvh",background:"#fff",display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",padding:20}}>
        <div style={{width:"100%",maxWidth:380,textAlign:"center"}}>
          <Logo size={48} />
          <div style={{fontFamily:"'Noto Serif KR',serif",fontSize:22,fontWeight:700,color:"var(--blue)",marginTop:14}}>My RYE-K</div>
          <div style={{fontSize:11,color:"#A1A1AA",letterSpacing:2,marginTop:4,marginBottom:36}}>RYE-K K-Culture Center</div>

          <div style={{background:"#fff",borderRadius:20,padding:"32px 28px",boxShadow:"0 2px 24px rgba(0,0,0,.06)",border:"1px solid #F0F0F0",textAlign:"left"}}>
            {loginErr && <div className="form-err" style={{marginBottom:14,borderRadius:10}}>⚠ {loginErr}</div>}

            {/* ── STEP 1: ID 입력 ── */}
            {loginStep === "id" && (<>
              <div className="fg">
                <label className="fg-label">회원코드 또는 등록된 연락처</label>
                <input className="inp" value={loginCode}
                  onChange={e=>{setLoginCode(e.target.value.toUpperCase());setLoginErr("");}}
                  placeholder="회원코드 또는 등록된 연락처(본인/보호자)"
                  style={{fontSize:14,letterSpacing:.5,textTransform:"uppercase",borderRadius:10}}
                  onKeyDown={e=>e.key==="Enter"&&handleIdConfirm()} />
              </div>
              <div style={{display:"flex",alignItems:"center",gap:7,marginBottom:14,cursor:"pointer"}} onClick={()=>setSaveCode(s=>!s)}>
                <div style={{width:16,height:16,borderRadius:4,border:`1.5px solid ${saveCode?"var(--blue)":"#D0D0D0"}`,background:saveCode?"var(--blue)":"#fff",display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0,transition:"all .12s"}}>
                  {saveCode && <span style={{color:"#fff",fontSize:11,fontWeight:700,lineHeight:1}}>✓</span>}
                </div>
                <span style={{fontSize:12,color:"#888"}}>회원코드 저장</span>
              </div>
              <button className="btn btn-primary btn-full" style={{padding:14,fontSize:15,borderRadius:10}} onClick={handleIdConfirm}>확인 →</button>
            </>)}

            {/* ── STEP 2: 비밀번호 입력 ── */}
            {loginStep === "pw" && pendingStudent && (<>
              {/* 선택된 학생 카드 */}
              <div style={{background:"var(--blue-lt)",borderRadius:12,padding:"12px 16px",marginBottom:20,display:"flex",alignItems:"center",gap:12}}>
                <div style={{width:36,height:36,borderRadius:10,background:"var(--blue)",display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0}}>
                  <span style={{color:"#fff",fontSize:16,fontWeight:700}}>{pendingStudent.name[0]}</span>
                </div>
                <div>
                  <div style={{fontSize:15,fontWeight:700,color:"var(--ink)"}}>{pendingStudent.name}</div>
                  <div style={{fontSize:11,color:"var(--blue)",marginTop:1}}>{(pendingStudent.lessons||[]).map(l=>l.instrument).filter(Boolean).join(" · ")}</div>
                </div>
              </div>
              <div className="fg">
                <label className="fg-label">{pendingStudent.name} 학생의 생일 4자리(MMDD)</label>
                <input className="inp" type="password" value={loginPw}
                  onChange={e=>{setLoginPw(e.target.value);setLoginErr("");}}
                  placeholder="예: 0410" maxLength={4} inputMode="numeric"
                  style={{fontSize:20,letterSpacing:6,borderRadius:10,textAlign:"center"}}
                  autoFocus onKeyDown={e=>e.key==="Enter"&&handlePwConfirm()} />
              </div>
              <button className="btn btn-primary btn-full" style={{padding:14,fontSize:15,borderRadius:10,marginBottom:10}} onClick={handlePwConfirm}>로그인</button>
              <button style={{width:"100%",background:"none",border:"1.5px solid #E8E8E8",borderRadius:10,padding:"11px",fontSize:13,color:"#888",cursor:"pointer",fontFamily:"inherit"}}
                onClick={()=>{setLoginStep("id");setPendingStudent(null);setLoginPw("");setLoginErr("");}}>← 다시 입력</button>
            </>)}
          </div>
          <div style={{marginTop:20,fontSize:11,color:"#C0C0C0",lineHeight:1.7}}>회원코드 또는 등록된 연락처(본인/보호자)로 로그인하세요.<br/>문의는 담당 강사에게 연락해 주세요.</div>
        </div>
      </div>

      {/* ── 자녀 선택 모달 (STEP 1 → 다자녀) ── */}
      {childCandidates.length > 0 && (
        <div style={{position:"fixed",inset:0,background:"rgba(0,0,0,.55)",zIndex:1000,display:"flex",alignItems:"center",justifyContent:"center",padding:20}}>
          <div style={{background:"#fff",borderRadius:24,padding:"32px 24px",width:"100%",maxWidth:380,boxShadow:"0 12px 48px rgba(0,0,0,.25)"}}>
            <div style={{textAlign:"center",marginBottom:24}}>
              <div style={{fontSize:32,marginBottom:10}}>👨‍👩‍👧‍👦</div>
              <div style={{fontSize:18,fontWeight:700,color:"var(--ink)",fontFamily:"'Noto Serif KR',serif"}}>자녀를 선택하세요</div>
              <div style={{fontSize:13,color:"#999",marginTop:6,lineHeight:1.5}}>수강 이력을 확인할 자녀를 눌러주세요<br/>선택 후 생일 비밀번호를 입력합니다</div>
            </div>
            {childModalErr && <div className="form-err" style={{marginBottom:14,borderRadius:10,fontSize:13}}>⚠ {childModalErr}</div>}
            <div style={{display:"flex",flexDirection:"column",gap:12}}>
              {childCandidates.map(child => <ChildCard key={child.id} child={child} onClick={()=>handleChildSelect(child)} />)}
            </div>
            <button onClick={()=>{setChildCandidates([]);setChildModalErr("");}}
              style={{width:"100%",marginTop:16,background:"none",border:"1.5px solid #E8E8E8",borderRadius:12,padding:"12px",fontSize:13,color:"#888",cursor:"pointer",fontFamily:"inherit"}}>← 돌아가기</button>
          </div>
        </div>
      )}
      </>
    );
  }

  // Logged in - white minimal portal
  const teacher = teachers.find(t => t.id === student.teacherId);
  const sAtt = attendance.filter(a => a.studentId === student.id).sort((a, b) => (b.date||"").localeCompare(a.date||""));
  const sPay = payments.filter(p => p.studentId === student.id).sort((a, b) => (b.month||"").localeCompare(a.month||""));
  const notes = sAtt.filter(a => (a.lessonNote || a.note) && (typeof a.lessonNote === "object" ? true : (a.note && a.note.trim()))).slice(0, 30);

  // 형제·자매 감지 (동일 연락처, 퇴원 제외) — 자녀 변경 버튼 노출 조건
  const myPhone = (student.phone||"").replace(/\D/g,"");
  const myGuardian = (student.guardianPhone||"").replace(/\D/g,"");
  const siblings = students.filter(s => {
    if (s.id === student.id) return false;
    const st = s.status || "active";
    if (st !== "active" && st !== "paused") return false;
    const sp = (s.phone||"").replace(/\D/g,"");
    const sgp = (s.guardianPhone||"").replace(/\D/g,"");
    return (myPhone && (sp===myPhone||sgp===myPhone)) || (myGuardian && (sp===myGuardian||sgp===myGuardian));
  });
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
  // 이번 달 수납 우선 체크
  const thisMonthPay = sPay.find(p => p.month === THIS_MONTH);
  const payStatusText = thisMonthPay?.paid ? "완료" : thisMonthPay ? "수납 안내" : sPay.length === 0 ? "수납" : "수납 안내";
  const payStatusColor = thisMonthPay?.paid ? "#22C55E" : sPay.length === 0 ? "#B0B0B0" : "#F59E0B";
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
    .filter(n => !n.targetTeacherId || n.targetTeacherId === student.teacherId || (student.lessons||[]).some(l => l.teacherId === n.targetTeacherId))
    .sort((a,b) => { if(a.pinned&&!b.pinned)return -1; if(!a.pinned&&b.pinned)return 1; return b.createdAt-a.createdAt; });

  // 미읽음 배지 계산
  const unreadNoticeCount = visibleNotices.filter(n => !readNoticeIds.has(n.id)).length;
  const unreadCommentCount = (student ? (attendance.filter(a => a.studentId === student.id)) : [])
    .reduce((cnt, a) => cnt + (a.comments||[]).filter(c => c.authorType === "teacher" && c.createdAt > lastNoteRead).length, 0);

  return (
    <><style>{CSS}</style>
    <div className={textLarge ? "text-large" : ""} style={{minHeight:"100vh",minHeight:"100dvh",background:"#FAFAFA"}}>
      {/* Clean white header */}
      <UpdatePopup user={{ role: "member", id: student.id }} />
      <div style={{background:"#fff",padding:"14px 20px",paddingTop:"calc(14px + env(safe-area-inset-top,0px))",borderBottom:"1px solid #F0F0F0"}}>
        <div style={{display:"flex",alignItems:"center",gap:10,maxWidth:640,margin:"0 auto"}}>
          <Logo size={28} />
          <div style={{flex:1}}>
            <div style={{fontFamily:"'Noto Serif KR',serif",fontSize:15,fontWeight:700,color:"var(--blue)"}}>My RYE-K</div>
          </div>
          <div style={{display:"flex",gap:6,alignItems:"center"}}>
            {siblings.length > 0 && (
              <button onClick={()=>{setShowSiblingModal(true);setSwitchErr("");}}
                style={{background:"var(--blue-lt)",border:"1px solid rgba(43,58,159,.15)",color:"var(--blue)",fontSize:11,padding:"6px 12px",borderRadius:8,cursor:"pointer",fontFamily:"inherit",fontWeight:600,display:"flex",alignItems:"center",gap:4}}>
                자녀 변경 🔄
              </button>
            )}
            <button onClick={() => { const v = !textLarge; setTextLarge(v); localStorage.setItem("rye-text-large", v ? "1" : "0"); }} style={{background:textLarge?"var(--blue-lt)":"#F5F5F5",border:textLarge?"1px solid rgba(43,58,159,.2)":"none",color:textLarge?"var(--blue)":"#999",fontSize:11,padding:"6px 10px",borderRadius:8,cursor:"pointer",fontFamily:"inherit",fontWeight:700,transition:"all .15s"}}>Aa</button>
            <button onClick={()=>{setLoggedIn(false);setStudent(null);setLoginCode("");setLoginPw("");setLoginStep("id");setPendingStudent(null);setTab("home");try{localStorage.removeItem("ryekPortal");}catch{}}} style={{background:"#F5F5F5",border:"none",color:"#999",fontSize:11,padding:"6px 14px",borderRadius:8,cursor:"pointer",fontFamily:"inherit"}}>로그아웃</button>
          </div>
        </div>
      </div>

      {/* Student Info Card */}
      {/* ⛔ student.notes는 강사/매니저 전용 내부 메모 — 절대 렌더링 금지 */}
      <div className="portal-body" style={{padding:"16px 16px 0",maxWidth:640,margin:"0 auto"}}>
        <div style={{background:"#fff",borderRadius:16,padding:"20px",boxShadow:"0 1px 8px rgba(0,0,0,.04)",border:"1px solid #F0F0F0"}}>
          <div style={{display:"flex",alignItems:"center",gap:14}}>
            <Av photo={student.photo} name={student.name} size="av-lg" />
            <div style={{flex:1}}>
              <div style={{fontSize:20,fontWeight:700,fontFamily:"'Noto Serif KR',serif",color:"var(--ink)"}}>{student.name}</div>
              <div style={{display:"flex",gap:6,flexWrap:"wrap",marginTop:6}}>
                {(student.lessons||[]).map(l => <span key={l.instrument} style={{background:"var(--blue-lt)",color:"var(--blue)",fontSize:11,padding:"3px 10px",borderRadius:12,fontWeight:500,maxWidth:120,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap",display:"inline-block"}}>{l.instrument}</span>)}
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
        <div onClick={()=>setTab("pay")} style={{background:"#fff",borderRadius:14,padding:"14px 10px",textAlign:"center",boxShadow:"0 1px 4px rgba(0,0,0,.03)",border:"1px solid #F0F0F0",cursor:"pointer",transition:"background .12s"}} onMouseEnter={e=>e.currentTarget.style.background="#F9FAFB"} onMouseLeave={e=>e.currentTarget.style.background="#fff"}>
          <div style={{fontSize:18,fontWeight:700,color:payStatusColor,fontFamily:"'Noto Serif KR',serif"}}>{payStatusText}</div>
          <div style={{fontSize:10,color:"#B0B0B0",marginTop:3}}>이번달 수납</div>
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

      <div className="portal-body" style={{padding:16,maxWidth:640,margin:"0 auto"}}>
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
            {/* Practice Guide */}
            {student.practiceGuide?.body && student.practiceGuide.expiresAt > Date.now() && (
              <div style={{marginBottom:16}}>
                <div style={{fontSize:13,fontWeight:600,color:"var(--ink)",marginBottom:8}}>🎯 이번 주 연습할 것</div>
                <div style={{background:"linear-gradient(135deg,#F0F9FF,#E0F2FE)",borderRadius:12,padding:"16px",boxShadow:"0 1px 4px rgba(0,0,0,.03)",border:"1px solid rgba(43,58,159,.12)"}}>
                  <div style={{fontSize:13,color:"var(--ink)",lineHeight:1.7,whiteSpace:"pre-wrap"}}>{student.practiceGuide.body}</div>
                  <div style={{display:"flex",alignItems:"center",gap:8,marginTop:10}}>
                    {student.practiceGuide.instrument && <span style={{background:"var(--blue-lt)",color:"var(--blue)",fontSize:10,padding:"2px 8px",borderRadius:8,fontWeight:500}}>{student.practiceGuide.instrument}</span>}
                    <span style={{fontSize:10,color:"#B0B0B0"}}>{fmtDateShort(student.practiceGuide.createdAt)} 작성</span>
                  </div>
                </div>
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
                  <div onClick={()=>setTab("pay")} style={{cursor:"pointer",background:isPaid?"#F0FDF4":"#FFFBEB",border:`1px solid ${isPaid?"#BBF7D0":"rgba(245,158,11,.25)"}`,borderRadius:12,padding:"14px 16px",display:"flex",alignItems:"center",justifyContent:"space-between",transition:"opacity .12s"}} onMouseEnter={e=>e.currentTarget.style.opacity=".85"} onMouseLeave={e=>e.currentTarget.style.opacity="1"}>
                    <div>
                      <div style={{fontSize:14,fontWeight:600,color:isPaid?"#16A34A":"#92400E"}}>{isPaid ? "✓ 납부 완료" : `수납 안내 · ${fmtMoney(amt)}`}</div>
                      {tp?.paidDate && <div style={{fontSize:11,color:"#A0A0A0",marginTop:2}}>{fmtDate(tp.paidDate)} 납부</div>}
                      {!tp && <div style={{fontSize:11,color:"#A0A0A0",marginTop:2}}>수납 내역 없음</div>}
                    </div>
                    <span style={{fontSize:18}}>{isPaid ? "✅" : "💛"}</span>
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

        {/* Attendance Tab — 월별 도트 뷰 */}
        {tab === "att" && (() => {
          const byMonth = {};
          sAtt.forEach(a => {
            const m = a.date?.slice(0, 7);
            if (m) { if (!byMonth[m]) byMonth[m] = []; byMonth[m].push(a); }
          });
          const months = Object.keys(byMonth).sort().reverse().slice(0, 6);
          const DOT = {
            present: { color:"#22C55E", sym:"●" },
            absent:  { color:"#EF4444", sym:"✕" },
            late:    { color:"#F59E0B", sym:"△" },
            excused: { color:"#3B82F6", sym:"○" },
          };
          return (
            <div>
              <div style={{fontSize:13,fontWeight:600,color:"var(--ink)",marginBottom:10}}>월별 출석 현황</div>
              {months.length === 0 ? (
                <div className="empty"><div className="empty-icon">📋</div><div className="empty-txt">출석 기록이 없습니다.</div></div>
              ) : months.map(m => {
                const recs = byMonth[m].slice().sort((a,b)=>a.date.localeCompare(b.date));
                const okN = recs.filter(a=>a.status==="present"||a.status==="late").length;
                const abN = recs.filter(a=>a.status==="absent").length;
                return (
                  <div key={m} style={{display:"flex",alignItems:"center",gap:10,padding:"10px 14px",background:"#fff",borderRadius:12,marginBottom:6,border:"1px solid #F0F0F0"}}>
                    <div style={{width:28,flexShrink:0,fontSize:12,fontWeight:700,color:"#888"}}>{parseInt(m.slice(5))}월</div>
                    <div style={{display:"flex",gap:6,flex:1,flexWrap:"wrap",alignItems:"center"}}>
                      {recs.map((a,i) => {
                        const d = DOT[a.status] || { color:"#999", sym:"·" };
                        return <span key={i} title={fmtDateShort(a.date)} style={{fontSize:15,color:d.color,fontWeight:700,cursor:"default",lineHeight:1}}>{d.sym}</span>;
                      })}
                    </div>
                    <div style={{fontSize:11,color:"#aaa",flexShrink:0,textAlign:"right"}}>
                      <span style={{color:"#22C55E",fontWeight:600}}>{okN}출</span>
                      {abN>0 && <span style={{color:"#EF4444",fontWeight:600}}> {abN}결</span>}
                    </div>
                  </div>
                );
              })}
              <div style={{fontSize:10.5,color:"#bbb",textAlign:"center",marginTop:4}}>● 출석 ✕ 결석 △ 지각 ○ 보강</div>
            </div>
          );
        })()}

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
                  <div key={i} style={{background:"#fff",borderRadius:14,marginBottom:10,overflow:"hidden",boxShadow:"0 2px 8px rgba(0,0,0,.04)",border:`1px solid ${isPaid?"#E6F7EE":"#FED7AA"}`}}>
                    {/* 명세서 헤더 */}
                    <div style={{padding:"12px 16px",background:isPaid?"#F0FDF4":"#FFFBEB",borderBottom:"1px solid #F0F0F0",display:"flex",alignItems:"center",justifyContent:"space-between"}}>
                      <div>
                        <div style={{fontSize:13,fontWeight:700,color:"var(--ink)",fontFamily:"'Noto Serif KR',serif"}}>{monthLabel(p.month)} 수강료 명세서</div>
                        {p.paidDate && <div style={{fontSize:10,color:"#A0A0A0",marginTop:2}}>납부일: {fmtDate(p.paidDate)}{p.method ? ` · ${methodLabel[p.method] || p.method}` : ""}</div>}
                      </div>
                      <div style={{fontSize:13,fontWeight:700,color:isPaid?"#22C55E":"#92400E",background:isPaid?"#DCFCE7":"#FEF3C7",padding:"4px 12px",borderRadius:20}}>
                        {isPaid ? "✓ 완료" : "수납 안내"}
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
                          <span style={{display:"flex",alignItems:"center",gap:4}}>악기 대여료 <span style={{fontSize:10,color:"#A0A0A0",background:"#F5F5F5",padding:"1px 6px",borderRadius:4,maxWidth:100,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap",display:"inline-block"}}>{rentalLabel}</span></span>
                          <span style={{fontFamily:"'Noto Serif KR',serif",fontWeight:500}}>{fmtMoney(rentalFee)}</span>
                        </div>
                      )}
                      {(p.extraCharges||[]).map((ec, ei) => (
                        <div key={ei} style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"5px 0",fontSize:13,color:"var(--ink)"}}>
                          <span style={{display:"flex",alignItems:"center",gap:4,minWidth:0}}>
                            <span style={{overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap",maxWidth:120}}>{ec.title}</span>
                            <span style={{fontSize:10,color:"#A0A0A0",background:"#F5F5F5",padding:"1px 6px",borderRadius:4,flexShrink:0}}>추가</span>
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
                      {/* ⛔ p.note는 관리자 전용 비고 — 절대 렌더링 금지 */}
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
    </div>

    {/* ── 자녀 전환 모달 (로그인 후) ── */}
    {showSiblingModal && (
      <div style={{position:"fixed",inset:0,background:"rgba(0,0,0,.55)",zIndex:1000,display:"flex",alignItems:"center",justifyContent:"center",padding:20}}>
        <div style={{background:"#fff",borderRadius:24,padding:"32px 24px",width:"100%",maxWidth:380,boxShadow:"0 12px 48px rgba(0,0,0,.25)"}}>
          <div style={{textAlign:"center",marginBottom:24}}>
            <div style={{fontSize:32,marginBottom:10}}>🔄</div>
            <div style={{fontSize:18,fontWeight:700,color:"var(--ink)",fontFamily:"'Noto Serif KR',serif"}}>자녀 전환</div>
            <div style={{fontSize:13,color:"#999",marginTop:6}}>전환할 자녀를 선택하세요</div>
          </div>
          {switchErr && <div className="form-err" style={{marginBottom:14,borderRadius:10,fontSize:13}}>⚠ {switchErr}</div>}
          <div style={{display:"flex",flexDirection:"column",gap:12}}>
            {siblings.map(sib => {
              const insts = (sib.lessons||[]).map(l=>l.instrument).filter(Boolean).join(" · ");
              const isActive = (sib.status||"active") === "active";
              return (
                <button key={sib.id} onClick={()=>handleSiblingSwitch(sib)}
                  style={{background: isActive?"#F8FAFF":"#FAFAFA",border:`2px solid ${isActive?"#E8EAF6":"#E8E8E8"}`,borderRadius:16,padding:"18px 20px",cursor:"pointer",fontFamily:"inherit",textAlign:"left",transition:"all .15s",WebkitTapHighlightColor:"transparent",width:"100%",minHeight:72,opacity:isActive?1:.7}}
                  onMouseEnter={e=>{if(isActive){e.currentTarget.style.border="2px solid var(--blue)";e.currentTarget.style.background="var(--blue-lt)";}}}
                  onMouseLeave={e=>{if(isActive){e.currentTarget.style.border="2px solid #E8EAF6";e.currentTarget.style.background="#F8FAFF";}}}
                >
                  <div style={{display:"flex",alignItems:"center",justifyContent:"space-between"}}>
                    <div style={{fontSize:18,fontWeight:700,color:"var(--ink)"}}>{sib.name}</div>
                    {!isActive && <span style={{fontSize:11,color:"#F59E0B",background:"#FEF3C7",padding:"2px 8px",borderRadius:6,fontWeight:600}}>휴원</span>}
                  </div>
                  {insts && <div style={{fontSize:14,color:"var(--blue)",marginTop:4,fontWeight:500}}>{insts}</div>}
                  <div style={{fontSize:11,color:"#C0C0C0",marginTop:4,fontFamily:"monospace",letterSpacing:1}}>{sib.studentCode}</div>
                </button>
              );
            })}
          </div>
          <button onClick={()=>{setShowSiblingModal(false);setSwitchErr("");}}
            style={{width:"100%",marginTop:16,background:"none",border:"1.5px solid #E8E8E8",borderRadius:12,padding:"12px",fontSize:13,color:"#888",cursor:"pointer",fontFamily:"inherit"}}>닫기</button>
        </div>
      </div>
    )}
    </>
  );
}
