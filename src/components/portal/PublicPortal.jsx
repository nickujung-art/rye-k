import { UpdatePopup } from "../updates/UpdatePopup";
import { useState, useEffect, useRef, useLayoutEffect } from "react";
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
  const [aiAgreed, setAiAgreed] = useState(false);
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

  if (submitted) return (<><style>{CSS}</style><div style={{minHeight:"100vh",background:"#fff",display:"flex",alignItems:"center",justifyContent:"center",padding:20}}><div style={{maxWidth:400,width:"100%",textAlign:"center"}}><div style={{width:64,height:64,borderRadius:"50%",background:"var(--green-lt)",display:"flex",alignItems:"center",justifyContent:"center",margin:"0 auto 20px",fontSize:28}}>✓</div><div style={{fontFamily:"'Noto Serif KR',serif",fontSize:20,fontWeight:600,marginBottom:10}}>등록이 완료되었습니다</div><div style={{fontSize:14,color:"var(--ink-60)",lineHeight:1.7,marginBottom:24}}><strong>{form.name}</strong>님의 수강 등록 신청이 정상적으로 접수되었습니다.</div><button className="btn btn-primary btn-full" onClick={() => { setSubmitted(false); setForm({name:"",birthDate:"",phone:"",guardianPhone:"",desiredInstruments:[],notes:"",photo:"",experience:"none",experienceDetail:"",purpose:"",purposeOther:"",referral:"",referralOther:"",teacherName:"",lessonType:"",lessonTypeOther:"",lessonDay:"",lessonTime:"",monthlyFee:0,startDate:TODAY_STR,pendingOneTimeCharges:[]}); setStep(1); setPrivacyAgreed(false); setOptionalAgreed(false); }}>새로운 등록</button></div></div></>);

  const progressPct = (step / 4) * 100;
  // 악기 대여 프리셋 목록 (rental:XXX 키 파싱)
  const rentalOptions = Object.entries(feePresets).filter(([k]) => k.startsWith("rental:")).map(([k, v]) => ({ name: k.replace("rental:", ""), amount: v || 0 }));

  return (
    <><style>{CSS}</style><style>{SILVER_CSS}</style>
    <div style={{minHeight:"100vh",background:"var(--bg)",padding:"20px 16px"}}>
      <div style={{maxWidth:480,margin:"0 auto"}} className="silver-form">
        <div style={{textAlign:"center",marginBottom:24,background:"var(--hanji)",borderRadius:"var(--radius-lg)",padding:"28px 20px",position:"relative",overflow:"hidden"}}>
          <div style={{position:"absolute",top:0,left:0,right:0,height:4,background:"linear-gradient(90deg,var(--dancheong-blue),var(--dancheong-red),var(--dancheong-yellow),var(--dancheong-white),var(--dancheong-black))"}} />
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
                {showFullPolicy && (<div style={{background:"var(--bg)",border:"1px solid var(--border)",borderRadius:8,padding:14,marginBottom:12,fontSize:11.5,lineHeight:1.9,color:"var(--ink-60)",whiteSpace:"pre-wrap",maxHeight:220,overflowY:"auto"}}>{`[개인정보 수집·이용 동의서]\n\n「개인정보 보호법」 제15조 및 제22조에 따라 안내드립니다.\n\n1. 수집·이용 목적: 수강 등록 접수 및 상담, 수업 관리, 수강료 안내, 출결 관리\n2. 수집 항목: [필수] 이름, 연락처, 생년월일 / [선택] 보호자 연락처, 사진, 희망 과목, 특이사항\n3. 보유·이용 기간: 수강 종료 후 1년간 보유 후 파기\n4. 동의 거부 권리: 필수항목 미동의 시 수강 등록 불가. 선택항목 미동의 시 수강에 영향 없음.\n5. 만 14세 미만 아동: 법정대리인(보호자)의 동의를 받아 수집합니다.`}</div>)}
                <div onClick={()=>setPrivacyAgreed(!privacyAgreed)} style={{display:"flex",alignItems:"flex-start",gap:14,cursor:"pointer",padding:"14px 0",userSelect:"none"}}><div style={{width:30,height:30,borderRadius:8,border:`2.5px solid ${privacyAgreed?"var(--blue)":"#6B7280"}`,background:privacyAgreed?"var(--blue)":"var(--paper)",display:"flex",alignItems:"center",justifyContent:"center",transition:"all .15s",flexShrink:0,marginTop:2}}>{privacyAgreed && <span style={{color:"#fff",fontSize:17,fontWeight:700}}>✓</span>}</div><div style={{fontSize:17,color:"#111827",lineHeight:1.6}}><span style={{fontWeight:700}}>[필수]</span> 개인정보 수집·이용에 동의합니다.</div></div>
                <div className="divider" />
                <div style={{background:"var(--gold-lt)",border:"1px solid rgba(245,168,0,.2)",borderRadius:8,padding:14,marginBottom:12,fontSize:12.5,lineHeight:1.8,color:"var(--ink-60)"}}><div style={{fontWeight:600,color:"var(--ink)",marginBottom:5}}>수업 보강 및 이월 규정</div><div>• 월 4회 기본 수업 (매월 첫 주 수강료 납입)</div><div>• 레슨 당일 무단 결석 시, 보강 및 이월이 불가합니다.</div><div>• 레슨 전 사전 고지 시, 강사와 협의하여 보강 수업을 조율할 수 있습니다.</div><div>• 단, 그룹 수업(강좌)의 경우 별도 보강은 진행되지 않습니다.</div></div>
                <div className="divider" />
                <button onClick={()=>setShowPhotoPolicy(!showPhotoPolicy)} style={{background:"none",border:"none",color:"var(--ink-60)",fontSize:12,cursor:"pointer",padding:0,fontFamily:"inherit",marginBottom:8,display:"block",textDecoration:"underline"}}>{showPhotoPolicy?"▲ 촬영·이용 동의 상세 닫기":"▼ 사진 및 동영상 촬영·이용 동의 상세 보기"}</button>
                {showPhotoPolicy && (<div style={{background:"var(--bg)",border:"1px solid var(--border)",borderRadius:8,padding:14,marginBottom:10,fontSize:11.5,lineHeight:1.9,color:"var(--ink-60)",whiteSpace:"pre-wrap",maxHeight:200,overflowY:"auto"}}>{`[선택] 사진 및 동영상 촬영·이용 및 제3자 제공 동의\n\n1. 수집 및 이용 목적: 교육·행사 기록, 기관 홍보 콘텐츠 제작 및 공식 SNS·홈페이지 게시\n2. 수집 항목: 교육·행사 중 촬영된 초상(사진, 동영상) 및 음성\n3. 제3자 제공 대상: 홍보 콘텐츠 시청자, 영상 제작 대행사, 보도 매체\n4. 보유·이용 기간: 목적 달성 후 파기 (홍보물 게시 시 철회 요청 시까지)\n5. 동의 거부 시: 촬영에서 제외되거나, 홍보물 내 블러(모자이크) 처리될 수 있습니다.`}</div>)}
                <div onClick={()=>setOptionalAgreed(!optionalAgreed)} style={{display:"flex",alignItems:"flex-start",gap:14,cursor:"pointer",padding:"14px 0",userSelect:"none"}}><div style={{width:30,height:30,borderRadius:8,border:`2.5px solid ${optionalAgreed?"var(--blue)":"#6B7280"}`,background:optionalAgreed?"var(--blue)":"var(--paper)",display:"flex",alignItems:"center",justifyContent:"center",transition:"all .15s",flexShrink:0,marginTop:2}}>{optionalAgreed && <span style={{color:"#fff",fontSize:17,fontWeight:700}}>✓</span>}</div><div style={{fontSize:17,color:"#111827",lineHeight:1.6}}><span style={{fontWeight:600,color:"#6B7280"}}>[선택]</span> 사진·동영상 촬영·이용 및 제3자 제공에 동의합니다.<div style={{fontSize:14,color:"#6B7280",marginTop:4}}>미동의 시에도 수강에 영향 없습니다.</div></div></div>
                <div className="divider" />
                <div onClick={()=>setAiAgreed(!aiAgreed)} style={{display:"flex",alignItems:"flex-start",gap:14,cursor:"pointer",padding:"14px 0",userSelect:"none"}}><div style={{width:30,height:30,borderRadius:8,border:`2.5px solid ${aiAgreed?"var(--blue)":"#6B7280"}`,background:aiAgreed?"var(--blue)":"var(--paper)",display:"flex",alignItems:"center",justifyContent:"center",transition:"all .15s",flexShrink:0,marginTop:2}}>{aiAgreed && <span style={{color:"#fff",fontSize:17,fontWeight:700}}>✓</span>}</div><div style={{fontSize:17,color:"#111827",lineHeight:1.6}}><span style={{fontWeight:600,color:"#6B7280"}}>[선택]</span> AI 보조 기능 사용에 동의합니다.<div style={{fontSize:14,color:"#6B7280",marginTop:4}}>레슨노트 다듬기·월간 리포트 등 AI 기능에 이름·레슨 내용이 활용됩니다. 연락처는 절대 전송되지 않습니다. 미동의 시 수강에 영향 없습니다.</div></div></div>
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
  const colorMap = { present:"var(--green)", late:"var(--ink-30)", absent:"var(--red)", excused:"var(--blue)" };
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
                <div key={ds} style={{width:12,height:12,borderRadius:3,background:isFuture?"transparent":status?colorMap[status]||"var(--border)":"var(--bg)",opacity:isFuture?0:1}} title={ds} />
              ))}
            </div>
          ))}
        </div>
      </div>
      <div style={{display:"flex",gap:10,marginTop:6,flexWrap:"wrap"}}>
        {[["var(--green)","출석"],["var(--ink-30)","지각"],["var(--red)","결석"],["var(--blue)","보강"]].map(([c,l]) => (
          <div key={l} style={{display:"flex",alignItems:"center",gap:4}}>
            <div style={{width:10,height:10,borderRadius:2,background:c}} />
            <span style={{fontSize:10,color:"var(--ink-30)"}}>{l}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function PortalSheet({ notice, onClose }) {
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    const raf = requestAnimationFrame(() => setVisible(true));
    return () => cancelAnimationFrame(raf);
  }, []);
  const dismiss = () => { setVisible(false); setTimeout(onClose, 300); };
  return (
    <div onClick={dismiss} style={{position:"fixed",inset:0,zIndex:800,background:"rgba(0,0,0,.5)",opacity:visible?1:0,transition:"opacity 280ms var(--ease-out)",display:"flex",alignItems:"flex-end"}}>
      <div onClick={e=>e.stopPropagation()} style={{width:"100%",maxHeight:"85dvh",background:"var(--paper)",borderRadius:"var(--radius-lg) var(--radius-lg) 0 0",overflowY:"auto",WebkitOverflowScrolling:"touch",transform:visible?"translateY(0)":"translateY(100%)",transition:"transform 320ms var(--ease-out)"}}>
        {/* 드래그 핸들 */}
        <div style={{display:"flex",justifyContent:"center",padding:"12px 0 0"}}>
          <div style={{width:36,height:4,borderRadius:2,background:"var(--border)"}}/>
        </div>
        {/* 헤더 */}
        <div style={{padding:"14px 20px 14px",borderBottom:"1px solid var(--border)"}}>
          <div style={{display:"flex",alignItems:"flex-start",gap:8,marginBottom:4}}>
            {notice.pinned && <span style={{fontSize:13,flexShrink:0}}>📌</span>}
            <div style={{fontFamily:"'Noto Serif KR',serif",fontSize:17,fontWeight:700,color:"var(--ink)",flex:1,lineHeight:1.4}}>{notice.title}</div>
            <button onClick={dismiss} style={{background:"transparent",border:"none",color:"var(--ink-30)",fontSize:20,cursor:"pointer",padding:0,lineHeight:1,flexShrink:0}}>✕</button>
          </div>
          <div style={{fontSize:11,color:"var(--ink-30)"}}>{notice.authorName} · {fmtDateTime(notice.createdAt)}</div>
        </div>
        {/* 본문 */}
        <div style={{padding:"18px 20px 40px"}}>
          <div style={{fontSize:14,color:"var(--ink-60)",lineHeight:1.85,whiteSpace:"pre-wrap"}}>{notice.content}</div>
          {notice.imageBase64 && <img src={notice.imageBase64} alt="공지 이미지" style={{width:"100%",borderRadius:10,marginTop:16,objectFit:"cover"}}/>}
        </div>
      </div>
    </div>
  );
}

function PortalEmptyState({ title, sub }) {
  return (
    <div style={{textAlign:"center",padding:"44px 20px"}}>
      <svg width="72" height="64" viewBox="0 0 72 64" fill="none" xmlns="http://www.w3.org/2000/svg" style={{marginBottom:14,opacity:.72}}>
        {/* 노리개 매듭 — 두 타원이 교차하는 전통 매듭 모티프 */}
        <ellipse cx="36" cy="30" rx="13" ry="20" stroke="var(--dancheong-blue)" strokeWidth="1.5"/>
        <ellipse cx="36" cy="30" rx="20" ry="13" stroke="var(--dancheong-blue)" strokeWidth="1.5"/>
        {/* 상단 끈 */}
        <line x1="36" y1="10" x2="36" y2="3" stroke="var(--dancheong-blue)" strokeWidth="1.5" strokeLinecap="round"/>
        {/* 하단 술 (3가닥) */}
        <line x1="36" y1="50" x2="31" y2="61" stroke="var(--dancheong-red)" strokeWidth="1.5" strokeLinecap="round"/>
        <line x1="36" y1="50" x2="36" y2="62" stroke="var(--dancheong-red)" strokeWidth="1.5" strokeLinecap="round"/>
        <line x1="36" y1="50" x2="41" y2="61" stroke="var(--dancheong-red)" strokeWidth="1.5" strokeLinecap="round"/>
        {/* 교차점 중심 */}
        <circle cx="36" cy="30" r="3" fill="var(--dancheong-blue)" fillOpacity="0.15"/>
        <circle cx="36" cy="30" r="1.5" fill="var(--dancheong-blue)"/>
        {/* 타원 끝점 장식 */}
        <circle cx="36" cy="10" r="2" fill="var(--dancheong-blue)" fillOpacity="0.45"/>
        <circle cx="16" cy="30" r="2" fill="var(--dancheong-blue)" fillOpacity="0.45"/>
        <circle cx="56" cy="30" r="2" fill="var(--dancheong-blue)" fillOpacity="0.45"/>
      </svg>
      <div style={{fontFamily:"'Noto Serif KR',serif",fontSize:14,fontWeight:600,color:"var(--ink)",marginBottom:6}}>{title}</div>
      {sub && <div style={{fontSize:12,color:"var(--ink-30)",lineHeight:1.75}}>{sub}</div>}
    </div>
  );
}

function MonthlyAttendanceHeatmap({ studentId, attendance, lessons = [], events = [] }) {
  const [isOpen, setIsOpen] = useState(false);
  const [viewDate, setViewDate] = useState(() => {
    const t = new Date();
    return new Date(t.getFullYear(), t.getMonth(), 1);
  });
  const year = viewDate.getFullYear();
  const month = viewDate.getMonth();
  const monthStr = `${year}-${String(month + 1).padStart(2, "0")}`;
  const today = new Date();
  const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-${String(today.getDate()).padStart(2, "0")}`;
  const atOrAfterCurrentMonth = monthStr >= todayStr.slice(0, 7);

  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const firstDay = new Date(year, month, 1).getDay();
  const mondayOffset = firstDay === 0 ? 6 : firstDay - 1;

  const thisMonthAtt = attendance.filter(a => a.studentId === studentId && a.date?.startsWith(todayStr.slice(0, 7)));
  const monthAtt = attendance.filter(a => a.studentId === studentId && a.date?.startsWith(monthStr));
  const attMap = Object.fromEntries(monthAtt.map(a => [a.date, a.status]));
  const counts = {
    present: monthAtt.filter(a => a.status === "present").length,
    late: monthAtt.filter(a => a.status === "late").length,
    excused: monthAtt.filter(a => a.status === "excused").length,
    absent: monthAtt.filter(a => a.status === "absent").length,
  };
  const thisMonthCounts = {
    present: thisMonthAtt.filter(a => a.status === "present").length,
    late: thisMonthAtt.filter(a => a.status === "late").length,
    excused: thisMonthAtt.filter(a => a.status === "excused").length,
    absent: thisMonthAtt.filter(a => a.status === "absent").length,
  };

  const lessonDaySet = new Set((lessons || []).flatMap(l => (l.schedule || []).map(s => s.day)).filter(Boolean));
  const dowKor = ["일","월","화","수","목","금","토"];
  const eventMap = {};
  (events || []).forEach(ev => {
    if (!ev?.date) return;
    if (!eventMap[ev.date]) eventMap[ev.date] = [];
    eventMap[ev.date].push(ev);
  });

  const cellStyle = (status, isFuture, isToday) => {
    const base = {
      position: "relative",
      aspectRatio: "1",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      borderRadius: 6,
      fontSize: 12,
      fontFamily: "'Noto Serif KR',serif",
      fontVariantNumeric: "tabular-nums",
      border: isToday ? "1.5px solid var(--blue)" : "1.5px solid transparent",
    };
    if (isFuture) return { ...base, color: "var(--ink-30)", opacity: 0.45 };
    if (status === "present") return { ...base, background: "var(--dancheong-blue)", color: "#fff", fontWeight: 700 };
    if (status === "late") return { ...base, background: "var(--dancheong-yellow)", color: "var(--ink)", fontWeight: 700 };
    if (status === "excused") return { ...base, background: "var(--green-lt)", color: "var(--green)", fontWeight: 600 };
    if (status === "absent") return { ...base, background: "rgba(168,33,27,0.15)", color: "var(--dancheong-red)", fontWeight: 600 };
    return { ...base, color: "var(--ink-30)" };
  };

  const Dot = ({ color }) => <span style={{ width: 7, height: 7, borderRadius: 2, background: color, display: "inline-block", flexShrink: 0 }} />;

  return (
    <div style={{ background: "var(--paper)", borderRadius: "var(--radius-lg)", border: "1px solid var(--border)", boxShadow: "var(--shadow)", overflow: "hidden" }}>
      {/* 한 줄 요약 헤더 — 항상 표시, 클릭 시 캘린더 토글 */}
      <button
        onClick={() => setIsOpen(o => !o)}
        style={{ width: "100%", display: "flex", alignItems: "center", justifyContent: "space-between", background: "transparent", border: "none", padding: "12px 16px", cursor: "pointer", fontFamily: "inherit", WebkitTapHighlightColor: "transparent" }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <div style={{ width: 3, height: 14, background: "linear-gradient(180deg,var(--dancheong-blue),var(--dancheong-red))", borderRadius: 2, flexShrink: 0 }} />
          <div style={{ fontFamily: "'Noto Serif KR',serif", fontSize: 14, fontWeight: 500, color: "var(--ink)" }}>이달 출석</div>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 11, color: "var(--ink-60)" }}>
            {thisMonthCounts.present > 0 && <span style={{ display: "flex", alignItems: "center", gap: 3 }}><Dot color="var(--dancheong-blue)" />{thisMonthCounts.present}</span>}
            {thisMonthCounts.late > 0 && <span style={{ display: "flex", alignItems: "center", gap: 3 }}><Dot color="var(--dancheong-yellow)" />{thisMonthCounts.late}</span>}
            {thisMonthCounts.excused > 0 && <span style={{ display: "flex", alignItems: "center", gap: 3 }}><Dot color="var(--green)" />{thisMonthCounts.excused}</span>}
            {thisMonthCounts.absent > 0 && <span style={{ display: "flex", alignItems: "center", gap: 3 }}><Dot color="var(--dancheong-red)" />{thisMonthCounts.absent}</span>}
            {thisMonthCounts.present === 0 && thisMonthCounts.late === 0 && thisMonthCounts.excused === 0 && thisMonthCounts.absent === 0 && <span style={{ color: "var(--ink-30)" }}>기록 없음</span>}
          </div>
          <span style={{ display: "inline-block", transform: isOpen ? "rotate(-90deg)" : "rotate(90deg)", transition: "transform 280ms var(--ease-out)", fontSize: 16, color: "var(--ink-30)", lineHeight: 1 }}>›</span>
        </div>
      </button>

      {/* 펼쳐지는 캘린더 본체 */}
      <div style={{ maxHeight: isOpen ? "520px" : "0", overflow: "hidden", transition: "max-height 360ms var(--ease-out)" }}>
        <div style={{ padding: "0 16px 16px" }}>
          {/* 월 이동 헤더 */}
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 14, paddingTop: 4 }}>
            <button onClick={e => { e.stopPropagation(); setViewDate(new Date(year, month - 1, 1)); }} aria-label="이전 달" style={{ background: "transparent", border: "none", fontSize: 20, lineHeight: 1, color: "var(--ink-60)", cursor: "pointer", padding: "4px 14px", fontFamily: "inherit", borderRadius: 6 }}>‹</button>
            <div style={{ fontFamily: "'Noto Serif KR',serif", fontSize: 14, fontWeight: 600, color: "var(--ink)", fontVariantNumeric: "tabular-nums" }}>{year}년 {month + 1}월</div>
            <button onClick={e => { e.stopPropagation(); setViewDate(new Date(year, month + 1, 1)); }} disabled={atOrAfterCurrentMonth} aria-label="다음 달" style={{ background: "transparent", border: "none", fontSize: 20, lineHeight: 1, color: atOrAfterCurrentMonth ? "var(--ink-30)" : "var(--ink-60)", cursor: atOrAfterCurrentMonth ? "not-allowed" : "pointer", padding: "4px 14px", fontFamily: "inherit", borderRadius: 6 }}>›</button>
          </div>

          {/* 요일 헤더 */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gap: 4, marginBottom: 4 }}>
            {["월","화","수","목","금","토","일"].map((d, i) => (
              <div key={d} style={{ textAlign: "center", fontSize: 10, color: i >= 5 ? "var(--ink-30)" : "var(--ink-60)", fontWeight: 600, paddingBottom: 2 }}>{d}</div>
            ))}
          </div>

          {/* 날짜 셀 */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gap: 4 }}>
            {Array.from({ length: mondayOffset }).map((_, i) => <div key={`b-${i}`} />)}
            {Array.from({ length: daysInMonth }).map((_, i) => {
              const day = i + 1;
              const dateStr = `${monthStr}-${String(day).padStart(2, "0")}`;
              const dow = new Date(year, month, day).getDay();
              const isLessonDay = lessonDaySet.has(dowKor[dow]);
              const status = attMap[dateStr];
              const isFuture = dateStr > todayStr;
              const dayEvents = eventMap[dateStr] || [];
              const hasEvent = dayEvents.length > 0;
              return (
                <div key={dateStr} style={cellStyle(status, isFuture, dateStr === todayStr)} title={hasEvent ? dayEvents.map(e => e.title).join(", ") : undefined}>
                  {day}
                  {isLessonDay && !status && (
                    <span style={{ position: "absolute", bottom: 3, left: "50%", transform: "translateX(-50%)", width: 4, height: 4, borderRadius: "50%", background: "var(--dancheong-blue)", opacity: isFuture ? 0.5 : 0.75 }} />
                  )}
                  {hasEvent && (
                    <span style={{ position: "absolute", top: 2, right: 2, width: 5, height: 5, borderRadius: "50%", background: "var(--dancheong-red)", boxShadow: "0 0 0 1.5px var(--paper)" }} />
                  )}
                </div>
              );
            })}
          </div>

          {/* 범례 */}
          <div style={{ display: "flex", gap: 12, marginTop: 14, fontSize: 11, color: "var(--ink-60)", flexWrap: "wrap", justifyContent: "center" }}>
            <span style={{ display: "flex", alignItems: "center", gap: 4 }}><span style={{ width: 10, height: 10, borderRadius: 3, background: "var(--dancheong-blue)" }}/>출석 {counts.present}</span>
            <span style={{ display: "flex", alignItems: "center", gap: 4 }}><span style={{ width: 10, height: 10, borderRadius: 3, background: "var(--dancheong-yellow)" }}/>지각 {counts.late}</span>
            <span style={{ display: "flex", alignItems: "center", gap: 4 }}><span style={{ width: 10, height: 10, borderRadius: 3, background: "var(--green-lt)" }}/>보강 {counts.excused}</span>
            <span style={{ display: "flex", alignItems: "center", gap: 4 }}><span style={{ width: 10, height: 10, borderRadius: 3, background: "rgba(168,33,27,0.15)" }}/>결석 {counts.absent}</span>
            {lessonDaySet.size > 0 && <span style={{ display: "flex", alignItems: "center", gap: 4 }}><span style={{ width: 4, height: 4, borderRadius: "50%", background: "var(--dancheong-blue)", opacity: 0.75 }}/>레슨일</span>}
            {Object.keys(eventMap).length > 0 && <span style={{ display: "flex", alignItems: "center", gap: 4 }}><span style={{ width: 5, height: 5, borderRadius: "50%", background: "var(--dancheong-red)" }}/>일정</span>}
          </div>
        </div>
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
  const [aiReports, setAiReports] = useState([]);
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
  const [sheetNotice, setSheetNotice] = useState(null);  // 공지 Bottom Sheet
  const saveAttendance = async (upd) => { setAttendance(upd); await sSet("rye-attendance", upd); };

  const [animatedAttRate, setAnimatedAttRate] = useState(0);
  const animRafRef = useRef(null);
  useEffect(() => {
    if (!student) { setAnimatedAttRate(0); return; }
    const attThisMonth = attendance.filter(a => a.studentId === student.id && a.date?.startsWith(THIS_MONTH));
    const present = attThisMonth.filter(a => a.status === "present").length;
    const late = attThisMonth.filter(a => a.status === "late").length;
    const total = attThisMonth.length;
    const target = total > 0 ? Math.round((present + late) / total * 100) : null;
    if (target == null || target === 0) { setAnimatedAttRate(target ?? 0); return; }
    if (window.matchMedia?.("(prefers-reduced-motion: reduce)").matches) { setAnimatedAttRate(target); return; }
    if (animRafRef.current) cancelAnimationFrame(animRafRef.current);
    const start = performance.now();
    const tick = (now) => {
      const t = Math.min(1, (now - start) / 600);
      setAnimatedAttRate(Math.round(target * (1 - Math.pow(1 - t, 3))));
      if (t < 1) animRafRef.current = requestAnimationFrame(tick);
    };
    animRafRef.current = requestAnimationFrame(tick);
    return () => { if (animRafRef.current) cancelAnimationFrame(animRafRef.current); };
  }, [student?.id, attendance]); // THIS_MONTH은 모듈 상수라 deps 제외

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
    setSheetNotice(n);
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
        { key: "rye-ai-reports", setter: setAiReports, default: [] },
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

  const [scrolled, setScrolled] = useState(false);
  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 160);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const TAB_ORDER = ["home","notice","att","notes","report","pay"];
  const swipeRef = useRef({ x: 0, y: 0 });
  const onTouchStart = (e) => {
    swipeRef.current = { x: e.touches[0].clientX, y: e.touches[0].clientY };
  };
  const onTouchEnd = (e) => {
    const dx = e.changedTouches[0].clientX - swipeRef.current.x;
    const dy = Math.abs(e.changedTouches[0].clientY - swipeRef.current.y);
    if (Math.abs(dx) < 48 || Math.abs(dx) < dy) return;
    const idx = TAB_ORDER.indexOf(tab);
    if (dx < 0 && idx < TAB_ORDER.length - 1) handleTabChange(TAB_ORDER[idx + 1]);
    if (dx > 0 && idx > 0) handleTabChange(TAB_ORDER[idx - 1]);
  };

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

  const tabBarRef = useRef(null);
  const tabBtnRefs = useRef({});
  const [indicator, setIndicator] = useState({ left: 0, width: 0 });
  useLayoutEffect(() => {
    const btn = tabBtnRefs.current[tab];
    if (btn) setIndicator({ left: btn.offsetLeft, width: btn.offsetWidth });
  }, [tab]);

  if (loading) return (
    <><style>{CSS}</style>
    <div style={{minHeight:"100vh",minHeight:"100dvh",background:"var(--bg)",display:"flex",flexDirection:"column"}}>
      {/* 헤더 스켈레톤 */}
      <div style={{height:52,background:"var(--paper)",borderBottom:"1px solid var(--border)",display:"flex",alignItems:"center",padding:"0 16px",gap:10,flexShrink:0}}>
        <div className="skel" style={{width:28,height:28,borderRadius:8}}/>
        <div className="skel" style={{width:72,height:14}}/>
      </div>
      <div style={{padding:16,maxWidth:640,margin:"0 auto",width:"100%",boxSizing:"border-box"}}>
        {/* Hero 카드 스켈레톤 */}
        <div style={{background:"var(--paper)",borderRadius:"var(--radius-lg)",padding:20,marginBottom:10,border:"1px solid var(--border)",overflow:"hidden",position:"relative"}}>
          <div className="skel" style={{position:"absolute",top:0,left:0,right:0,height:3,borderRadius:0}}/>
          <div style={{display:"flex",gap:14,alignItems:"center"}}>
            <div className="skel" style={{width:52,height:52,borderRadius:12,flexShrink:0}}/>
            <div style={{flex:1}}>
              <div className="skel" style={{width:"55%",height:20,marginBottom:10}}/>
              <div style={{display:"flex",gap:6}}>
                <div className="skel" style={{width:58,height:20,borderRadius:12}}/>
                <div className="skel" style={{width:46,height:20,borderRadius:12}}/>
              </div>
            </div>
          </div>
        </div>
        {/* Quick Stats 스켈레톤 */}
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:8,marginBottom:10}}>
          {[0,1,2].map(i => (
            <div key={i} style={{background:"var(--paper)",borderRadius:"var(--radius)",padding:"13px 10px",border:"1px solid var(--border)",textAlign:"center"}}>
              <div className="skel" style={{width:"65%",height:22,margin:"0 auto 7px"}}/>
              <div className="skel" style={{width:"50%",height:10,margin:"0 auto"}}/>
            </div>
          ))}
        </div>
        {/* 탭 바 스켈레톤 */}
        <div style={{display:"flex",padding:"14px 0 0",marginBottom:16,gap:0}}>
          {[28,28,28,52,44,28].map((w,i) => (
            <div key={i} style={{flex:1,display:"flex",justifyContent:"center",alignItems:"center",paddingBottom:12}}>
              <div className="skel" style={{width:w,height:11,borderRadius:4}}/>
            </div>
          ))}
        </div>
        {/* 콘텐츠 스켈레톤 */}
        <div style={{background:"var(--paper)",borderRadius:"var(--radius-lg)",padding:16,border:"1px solid var(--border)"}}>
          <div className="skel" style={{width:"38%",height:14,marginBottom:14}}/>
          <div className="skel" style={{width:"100%",height:11,marginBottom:8}}/>
          <div className="skel" style={{width:"92%",height:11,marginBottom:8}}/>
          <div className="skel" style={{width:"68%",height:11}}/>
        </div>
      </div>
    </div>
    </>
  );

  // ── 로그인 화면 (2단계) ───────────────────────────────────────────────────────
  if (!loggedIn) {
    // 자녀 카드 공통 렌더 (선택 모달에서 재사용)
    const ChildCard = ({ child, onClick }) => {
      const insts = (child.lessons||[]).map(l=>l.instrument).filter(Boolean).join(" · ");
      return (
        <button onClick={onClick}
          style={{background:"var(--blue-lt)",border:"2px solid #E8EAF6",borderRadius:16,padding:"18px 20px",cursor:"pointer",fontFamily:"inherit",textAlign:"left",transition:"all .15s",WebkitTapHighlightColor:"transparent",width:"100%",minHeight:72}}
          onMouseEnter={e=>{e.currentTarget.style.border="2px solid var(--blue)";e.currentTarget.style.background="var(--blue-lt)";}}
          onMouseLeave={e=>{e.currentTarget.style.border="2px solid #E8EAF6";e.currentTarget.style.background="var(--blue-lt)";}}
        >
          <div style={{fontSize:18,fontWeight:700,color:"var(--ink)"}}>{child.name}</div>
          {insts && <div style={{fontSize:14,color:"var(--blue)",marginTop:4,fontWeight:500}}>{insts}</div>}
          <div style={{fontSize:11,color:"var(--ink-30)",marginTop:4,fontFamily:"monospace",letterSpacing:1}}>{child.studentCode}</div>
        </button>
      );
    };

    return (
      <><style>{CSS}</style>
      <div style={{minHeight:"100vh",minHeight:"100dvh",background:"#fff",display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",padding:20}}>
        <div style={{width:"100%",maxWidth:380,textAlign:"center"}}>
          <Logo size={48} />
          <div style={{fontFamily:"'Noto Serif KR',serif",fontSize:22,fontWeight:700,color:"var(--blue)",marginTop:14}}>My RYE-K</div>
          <div style={{fontSize:11,color:"var(--ink-30)",letterSpacing:2,marginTop:4,marginBottom:36}}>RYE-K K-Culture Center</div>

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
                <div style={{width:16,height:16,borderRadius:4,border:`1.5px solid ${saveCode?"var(--blue)":"var(--ink-30)"}`,background:saveCode?"var(--blue)":"#fff",display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0,transition:"all .12s"}}>
                  {saveCode && <span style={{color:"#fff",fontSize:11,fontWeight:700,lineHeight:1}}>✓</span>}
                </div>
                <span style={{fontSize:12,color:"var(--ink-30)"}}>회원코드 저장</span>
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
              <button style={{width:"100%",background:"none",border:"1.5px solid #E8E8E8",borderRadius:10,padding:"11px",fontSize:13,color:"var(--ink-30)",cursor:"pointer",fontFamily:"inherit"}}
                onClick={()=>{setLoginStep("id");setPendingStudent(null);setLoginPw("");setLoginErr("");}}>← 다시 입력</button>
            </>)}
          </div>
          <div style={{marginTop:20,fontSize:11,color:"var(--ink-30)",lineHeight:1.7}}>회원코드 또는 등록된 연락처(본인/보호자)로 로그인하세요.<br/>문의는 담당 강사에게 연락해 주세요.</div>
        </div>
      </div>

      {/* ── 자녀 선택 모달 (STEP 1 → 다자녀) ── */}
      {childCandidates.length > 0 && (
        <div style={{position:"fixed",inset:0,background:"rgba(0,0,0,.55)",zIndex:1000,display:"flex",alignItems:"center",justifyContent:"center",padding:20}}>
          <div style={{background:"#fff",borderRadius:24,padding:"32px 24px",width:"100%",maxWidth:380,boxShadow:"0 12px 48px rgba(0,0,0,.25)"}}>
            <div style={{textAlign:"center",marginBottom:24}}>
              <div style={{fontSize:32,marginBottom:10}}>👨‍👩‍👧‍👦</div>
              <div style={{fontSize:18,fontWeight:700,color:"var(--ink)",fontFamily:"'Noto Serif KR',serif"}}>자녀를 선택하세요</div>
              <div style={{fontSize:13,color:"var(--ink-30)",marginTop:6,lineHeight:1.5}}>수강 이력을 확인할 자녀를 눌러주세요<br/>선택 후 생일 비밀번호를 입력합니다</div>
            </div>
            {childModalErr && <div className="form-err" style={{marginBottom:14,borderRadius:10,fontSize:13}}>⚠ {childModalErr}</div>}
            <div style={{display:"flex",flexDirection:"column",gap:12}}>
              {childCandidates.map(child => <ChildCard key={child.id} child={child} onClick={()=>handleChildSelect(child)} />)}
            </div>
            <button onClick={()=>{setChildCandidates([]);setChildModalErr("");}}
              style={{width:"100%",marginTop:16,background:"none",border:"1.5px solid #E8E8E8",borderRadius:12,padding:"12px",fontSize:13,color:"var(--ink-30)",cursor:"pointer",fontFamily:"inherit"}}>← 돌아가기</button>
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
    present: { color: "var(--green)", bg: "var(--green-lt)", icon: "✓", text: "출석" },
    absent: { color: "var(--red)", bg: "var(--red-lt)", icon: "✗", text: "결석" },
    late: { color: "var(--gold)", bg: "var(--gold-lt)", icon: "△", text: "지각" },
    excused: { color: "var(--blue)", bg: "var(--blue-lt)", icon: "○", text: "보강" }
  };
  const attThisMonth = sAtt.filter(a => a.date && a.date.startsWith(THIS_MONTH));
  const presentCount = attThisMonth.filter(a => a.status === "present").length;
  const absentCount = attThisMonth.filter(a => a.status === "absent").length;
  const lateCount = attThisMonth.filter(a => a.status === "late").length;
  const excusedCount = attThisMonth.filter(a => a.status === "excused").length;
  const totalThisMonth = attThisMonth.length;
  const attRate = totalThisMonth > 0 ? Math.round((presentCount + lateCount) / totalThisMonth * 100) : null;
  const latestPay = sPay[0];
  // 이번 달 수납 우선 체크
  const thisMonthPay = sPay.find(p => p.month === THIS_MONTH);
  const payStatusText = thisMonthPay?.paid ? "완료" : thisMonthPay ? "수납 안내" : sPay.length === 0 ? "수납" : "수납 안내";
  const payStatusColor = thisMonthPay?.paid ? "var(--green)" : sPay.length === 0 ? "var(--ink-30)" : "var(--gold)";
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
  const nextLessonTeacher = nextLesson?.lessons?.[0] ? teachers.find(t => t.id === nextLesson.lessons[0].teacherId) : null;

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
    <div className={textLarge ? "text-large" : ""} style={{minHeight:"100vh",minHeight:"100dvh",background:"var(--bg)"}}>
      {/* Clean white header */}
      <UpdatePopup user={{ role: "member", id: student.id }} />
      {/* ── Sticky Nav: Header + Tab Bar ── */}
      <div style={{position:"sticky",top:0,zIndex:200,background:"rgba(255,255,255,.95)",backdropFilter:"blur(10px)",WebkitBackdropFilter:"blur(10px)",boxShadow:scrolled?"0 1px 10px rgba(0,0,0,.08)":"none",transition:"box-shadow 250ms var(--ease-out)"}}>
        <div style={{padding:"12px 20px",paddingTop:"calc(12px + env(safe-area-inset-top,0px))"}}>
          <div style={{display:"flex",alignItems:"center",gap:10,maxWidth:640,margin:"0 auto"}}>
            <Logo size={28} />
            <div style={{flex:1,position:"relative",height:28,overflow:"hidden"}}>
              <div style={{position:"absolute",top:0,left:0,right:0,height:"100%",display:"flex",alignItems:"center",opacity:scrolled?0:1,transform:scrolled?"translateY(-5px)":"translateY(0)",transition:"opacity 220ms var(--ease-out),transform 220ms var(--ease-out)",pointerEvents:scrolled?"none":"auto"}}>
                <div style={{fontFamily:"'Noto Serif KR',serif",fontSize:15,fontWeight:700,color:"var(--blue)"}}>My RYE-K</div>
              </div>
              <div style={{position:"absolute",top:0,left:0,right:0,height:"100%",display:"flex",alignItems:"center",gap:8,opacity:scrolled?1:0,transform:scrolled?"translateY(0)":"translateY(5px)",transition:"opacity 220ms var(--ease-out),transform 220ms var(--ease-out)",pointerEvents:scrolled?"auto":"none"}}>
                <Av photo={student.photo} name={student.name} size="av-xs" />
                <div style={{fontFamily:"'Noto Serif KR',serif",fontSize:14,fontWeight:700,color:"var(--ink)",overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{student.name}</div>
              </div>
            </div>
            <div style={{display:"flex",gap:6,alignItems:"center"}}>
              {siblings.length > 0 && (
                <button onClick={()=>{setShowSiblingModal(true);setSwitchErr("");}}
                  style={{background:"var(--blue-lt)",border:"1px solid rgba(43,58,159,.15)",color:"var(--blue)",fontSize:11,padding:"6px 12px",borderRadius:8,cursor:"pointer",fontFamily:"inherit",fontWeight:600,display:"flex",alignItems:"center",gap:4}}>
                  자녀 변경 🔄
                </button>
              )}
              <button onClick={() => { const v = !textLarge; setTextLarge(v); localStorage.setItem("rye-text-large", v ? "1" : "0"); }} style={{background:textLarge?"var(--blue-lt)":"var(--ink-10)",border:textLarge?"1px solid rgba(43,58,159,.2)":"none",color:textLarge?"var(--blue)":"var(--ink-30)",fontSize:11,padding:"6px 10px",borderRadius:8,cursor:"pointer",fontFamily:"inherit",fontWeight:700,transition:"all .15s"}}>Aa</button>
              <button onClick={()=>{setLoggedIn(false);setStudent(null);setLoginCode("");setLoginPw("");setLoginStep("id");setPendingStudent(null);setTab("home");try{localStorage.removeItem("ryekPortal");}catch{}}} style={{background:"var(--ink-10)",border:"none",color:"var(--ink-30)",fontSize:11,padding:"6px 14px",borderRadius:8,cursor:"pointer",fontFamily:"inherit"}}>로그아웃</button>
            </div>
          </div>
        </div>
        <div ref={tabBarRef} className="tab-bar" style={{display:"flex",gap:0,padding:"0 16px",maxWidth:640,margin:"0 auto",borderTop:"1px solid var(--border)"}}>
          {[{id:"home",label:"홈"},{id:"notice",label:"공지"},{id:"att",label:"출석"},{id:"notes",label:"레슨노트"},{id:"report",label:"리포트"},{id:"pay",label:"수납"}].map(t=>(
            <button key={t.id} ref={el=>{if(el)tabBtnRefs.current[t.id]=el;}} onClick={()=>handleTabChange(t.id)} className="tab-bar-btn" style={{flex:1,padding:"10px 0",fontSize:12.5,fontWeight:tab===t.id?600:400,color:tab===t.id?"var(--blue)":"var(--ink-30)",background:"transparent",border:"none",cursor:"pointer",fontFamily:"inherit"}}>
              {t.label}
              {t.id==="notice" && unreadNoticeCount > 0 && <span style={{position:"absolute",top:6,right:"50%",transform:"translateX(calc(50% + 14px))",background:"var(--red)",color:"#fff",fontSize:9,fontWeight:700,padding:"1px 5px",borderRadius:8,lineHeight:1.4}}>{unreadNoticeCount}</span>}
              {t.id==="notes" && unreadCommentCount > 0 && <span style={{position:"absolute",top:6,right:"50%",transform:"translateX(calc(50% + 20px))",background:"var(--blue)",color:"#fff",fontSize:9,fontWeight:700,padding:"1px 5px",borderRadius:8,lineHeight:1.4}}>{unreadCommentCount}</span>}
            </button>
          ))}
          <div className="tab-indicator" style={{transform:`translateX(${indicator.left}px)`,width:indicator.width}}/>
        </div>
      </div>

      {/* Student Info Card — Heritage Hero */}
      {/* ⛔ student.notes는 강사/매니저 전용 내부 메모 — 절대 렌더링 금지 */}
      <div className="portal-body" style={{padding:"16px 16px 0",maxWidth:640,margin:"0 auto"}}>
        <div key={student.id} className="hero-card" style={{background:"var(--hanji)",borderRadius:"var(--radius-lg)",padding:"20px",boxShadow:"var(--shadow-lifted)",border:"1px solid var(--border)",overflow:"hidden",position:"relative"}}>
          <div className="hero-stripe" style={{position:"absolute",top:0,left:0,right:0,height:3,background:"linear-gradient(90deg,var(--dancheong-blue),var(--dancheong-red),var(--dancheong-yellow),var(--dancheong-white),var(--dancheong-black))"}}/>
          <div style={{display:"flex",alignItems:"center",gap:14}}>
            <Av photo={student.photo} name={student.name} size="av-lg" />
            <div style={{flex:1}}>
              <div className="hero-name" style={{fontFamily:"'Noto Serif KR',serif",fontSize:22,fontWeight:700,color:"var(--ink)",lineHeight:1.2}}>{student.name}</div>
              <div style={{display:"flex",gap:6,flexWrap:"wrap",marginTop:6}}>
                {(student.lessons||[]).map(l => <span key={l.instrument} style={{background:"var(--blue-lt)",color:"var(--blue)",fontSize:11,padding:"3px 10px",borderRadius:12,fontWeight:500,maxWidth:120,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap",display:"inline-block"}}>{l.instrument}</span>)}
              </div>
              <div style={{display:"flex",gap:8,alignItems:"center",marginTop:5,flexWrap:"wrap"}}>
                {(() => {
                  const ids = [...new Set([student.teacherId,...(student.lessons||[]).map(l=>l.teacherId)].filter(Boolean))];
                  const list = ids.map(id => teachers.find(t=>t.id===id)).filter(Boolean);
                  if (!list.length) return null;
                  const label = list.length<=2 ? list.map(t=>t.name).join(" · ")+" 강사" : `${list[0].name} 강사 외 ${list.length-1}명`;
                  return (<>
                    <span style={{fontSize:12,color:"var(--ink-60)"}}>{label}</span>
                    <span style={{width:3,height:3,borderRadius:"50%",background:"var(--ink-30)",display:"inline-block",flexShrink:0}}/>
                  </>);
                })()}
                <span style={{fontSize:12,fontWeight:500,color:(student.status||"active")==="active"?"var(--green)":"var(--ink-30)"}}>
                  {(student.status||"active")==="active"?"재원중":student.status==="paused"?"휴원":"퇴원"}
                </span>
              </div>
            </div>
          </div>
          {lessonDays.length > 0 && (
            <div style={{display:"flex",gap:4,marginTop:14}}>
              {DAYS.map(d => <div key={d} style={{width:30,height:30,borderRadius:15,display:"flex",alignItems:"center",justifyContent:"center",fontSize:11,fontWeight:lessonDays.includes(d)?600:400,color:lessonDays.includes(d)?"var(--blue)":"var(--ink-30)",background:lessonDays.includes(d)?"var(--blue-lt)":"transparent",transition:"all .2s"}}>{d}</div>)}
            </div>
          )}
        </div>
      </div>

      {/* Quick Stats: 출석률 · D-day · 수납 */}
      <div style={{padding:"10px 16px 0",maxWidth:640,margin:"0 auto"}}>
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",borderTop:"1px solid var(--border)",borderBottom:"1px solid var(--border)",padding:"14px 0"}}>
          <div style={{textAlign:"center",padding:"0 8px"}}>
            <div style={{fontSize:9,letterSpacing:"0.14em",fontWeight:600,color:"var(--ink-30)",textTransform:"uppercase",marginBottom:6}}>이달 출석률</div>
            <div style={{fontFamily:"'Noto Serif KR',serif",fontSize:20,fontWeight:500,lineHeight:1,color:attRate&&attRate>=80?"var(--green)":attRate&&attRate>=60?"var(--gold-dk)":"var(--red)",fontVariantNumeric:"tabular-nums"}}>
              {attRate!==null?animatedAttRate:"—"}{attRate!==null&&<span style={{fontSize:12,marginLeft:1,color:"var(--ink-30)",fontWeight:400}}>%</span>}
            </div>
            <div aria-hidden style={{fontSize:9,marginTop:4,height:9,visibility:"hidden"}}>—</div>
          </div>
          <div style={{textAlign:"center",padding:"0 8px",borderLeft:"1px solid var(--border)"}}>
            <div style={{fontSize:9,letterSpacing:"0.14em",fontWeight:600,color:"var(--ink-30)",textTransform:"uppercase",marginBottom:6}}>다음 레슨</div>
            <div style={{fontFamily:"'Noto Serif KR',serif",fontSize:20,fontWeight:500,lineHeight:1,color:"var(--ink)",fontVariantNumeric:"tabular-nums"}}>
              {nextLesson ? (nextLesson.dDay === 0 ? "오늘" : `D-${nextLesson.dDay}`) : "—"}
            </div>
            <div style={{fontSize:9,color:"var(--ink-30)",marginTop:4,height:9,letterSpacing:"0.04em",overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>
              {nextLesson ? [nextLessonTeacher?.name && `${nextLessonTeacher.name} 강사`, nextLesson.time].filter(Boolean).join(" · ") || " " : " "}
            </div>
          </div>
          <div onClick={()=>setTab("pay")} style={{textAlign:"center",padding:"0 8px",borderLeft:"1px solid var(--border)",cursor:"pointer",position:"relative"}}>
            <div style={{fontSize:9,letterSpacing:"0.14em",fontWeight:600,color:"var(--ink-30)",textTransform:"uppercase",marginBottom:6}}>이달 수납</div>
            <div style={{fontFamily:"'Noto Serif KR',serif",fontSize:20,fontWeight:500,lineHeight:1,color:thisMonthPay?.paid?"var(--green)":"var(--gold-dk)"}}>
              {thisMonthPay?.paid?"완납":"미납"}
            </div>
            <div style={{fontSize:9,marginTop:4,height:9,letterSpacing:"0.04em",color:thisMonthPay?.paid?"transparent":"var(--gold-dk)"}}>
              {thisMonthPay?.paid?" ":"탭하여 안내 →"}
            </div>
          </div>
        </div>
      </div>

      <div className="portal-body" style={{padding:16,maxWidth:640,margin:"0 auto"}} onTouchStart={onTouchStart} onTouchEnd={onTouchEnd}>
        <div key={tab} className="fade-up">
        {/* Home Tab */}
        {tab === "home" && (
          <div>
            {/* 이달 출석 */}
            <div style={{marginBottom:16}}>
              <MonthlyAttendanceHeatmap studentId={student.id} attendance={attendance} lessons={student.lessons || []} events={visibleNotices.filter(n => n.eventDate).map(n => ({ id: n.id, date: n.eventDate, title: n.title }))} />
            </div>
            {/* 공지사항 */}
            {visibleNotices.length > 0 && (
              <div style={{marginBottom:16}}>
                <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:10}}>
                  <div style={{width:3,height:14,background:"linear-gradient(180deg,var(--dancheong-blue),var(--dancheong-red))",borderRadius:2,flexShrink:0}}/>
                  <div style={{fontFamily:"'Noto Serif KR',serif",fontSize:14,fontWeight:500,color:"var(--ink)"}}>공지사항</div>
                </div>
                {visibleNotices.slice(0,2).map(n => (
                  <div key={n.id} style={{background:"var(--paper)",borderRadius:"var(--radius)",padding:"14px 16px",marginBottom:6,boxShadow:"var(--shadow)",border:"1px solid var(--border)",cursor:"pointer"}} onClick={()=>setTab("notice")}>
                    <div style={{display:"flex",alignItems:"center",gap:6}}>
                      {n.pinned && <span style={{fontSize:11}}>📌</span>}
                      <span style={{fontSize:13,fontWeight:600,color:"var(--ink)",flex:1}}>{n.title}</span>
                      <span style={{fontSize:10,color:"var(--ink-30)"}}>{fmtDateShort(n.createdAt)}</span>
                    </div>
                  </div>
                ))}
                {visibleNotices.length > 2 && <button style={{background:"none",border:"none",color:"var(--blue)",fontSize:12,cursor:"pointer",fontFamily:"inherit",padding:0}} onClick={()=>handleTabChange("notice")}>전체 보기 →</button>}
              </div>
            )}

            {/* 이번 주 과제 · 연습 */}
            {student.practiceGuide?.body && (
              <div style={{marginBottom:16}}>
                <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:10}}>
                  <div style={{width:3,height:14,background:"linear-gradient(180deg,var(--dancheong-yellow),var(--gold))",borderRadius:2,flexShrink:0}}/>
                  <div style={{fontFamily:"'Noto Serif KR',serif",fontSize:14,fontWeight:500,color:"var(--ink)"}}>이번 주 과제 · 연습</div>
                </div>
                <div style={{background:"var(--hanji)",borderRadius:"var(--radius-lg)",padding:16,boxShadow:"var(--shadow)",border:"1px solid var(--border)"}}>
                  <div style={{fontSize:13,color:"var(--ink)",lineHeight:1.75,whiteSpace:"pre-wrap"}}>{student.practiceGuide.body}</div>
                  <div style={{display:"flex",alignItems:"center",gap:8,marginTop:10}}>
                    {student.practiceGuide.instrument && <span style={{background:"var(--blue-lt)",color:"var(--blue)",fontSize:10,padding:"2px 8px",borderRadius:6,fontWeight:500}}>{student.practiceGuide.instrument}</span>}
                    <span style={{fontSize:10,color:"var(--ink-30)"}}>{fmtDateShort(student.practiceGuide.createdAt)} 작성</span>
                  </div>
                </div>
              </div>
            )}

            {/* 월간 리포트 */}
            {aiReports.filter(r => r.studentId === student.id && r.status === "published").sort((a,b)=>b.publishedAt-a.publishedAt).slice(0,3).map(rep => (
              <div key={rep.id} style={{marginBottom:12}}>
                <details style={{background:"var(--green-lt)",borderRadius:"var(--radius-lg)",border:"1px solid rgba(26,122,64,.15)",overflow:"hidden"}}>
                  <summary style={{padding:"14px 16px",cursor:"pointer",fontSize:13,fontWeight:600,color:"var(--green)",display:"flex",justifyContent:"space-between",alignItems:"center",listStyle:"none",gap:8}}>
                    <span>📋 월간 리포트 {rep.month?.slice(0,7).replace("-","년 ")}월</span>
                    <span style={{fontSize:11,color:"var(--ink-30)",fontWeight:400}}>{fmtDateShort(rep.publishedAt)} 등록</span>
                  </summary>
                  <div style={{padding:"0 16px 14px",fontSize:13,color:"var(--ink)",lineHeight:1.8,whiteSpace:"pre-wrap",borderTop:"1px solid rgba(26,122,64,.1)"}}>{rep.body}</div>
                </details>
              </div>
            ))}

            {/* 레슨 일정 */}
            <div style={{marginBottom:16}}>
              <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:10}}>
                <div style={{width:3,height:14,background:"linear-gradient(180deg,var(--blue),var(--dancheong-blue))",borderRadius:2,flexShrink:0}}/>
                <div style={{fontFamily:"'Noto Serif KR',serif",fontSize:14,fontWeight:500,color:"var(--ink)"}}>레슨 일정</div>
              </div>
              {(student.lessons||[]).map(l => (
                <div key={l.instrument} style={{background:"var(--paper)",borderRadius:"var(--radius)",padding:"14px 16px",marginBottom:6,boxShadow:"var(--shadow)",border:"1px solid var(--border)"}}>
                  <div style={{fontSize:14,fontWeight:600,color:"var(--blue)",marginBottom:6,fontFamily:"'Noto Serif KR',serif"}}>{l.instrument}</div>
                  <div style={{display:"flex",flexWrap:"wrap",gap:6}}>
                    {(l.schedule||[]).filter(sc=>sc.day).map((sc,i) => (
                      <span key={i} style={{background:"var(--blue-lt)",color:"var(--blue)",padding:"4px 12px",fontSize:12,fontWeight:500,borderRadius:8}}>{sc.day}요일{sc.time && ` ${sc.time}`}</span>
                    ))}
                  </div>
                </div>
              ))}
            </div>

            {/* 최근 레슨 노트 */}
            {notes.length > 0 && (
              <div style={{marginBottom:16}}>
                <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:10}}>
                  <div style={{width:3,height:14,background:"linear-gradient(180deg,var(--ink-60),var(--ink-30))",borderRadius:2,flexShrink:0}}/>
                  <div style={{fontFamily:"'Noto Serif KR',serif",fontSize:14,fontWeight:500,color:"var(--ink)"}}>최근 레슨 노트</div>
                </div>
                {notes.slice(0,2).map((a,i) => {
                  const st = attStatusStyle[a.status]||{color:"var(--ink-30)",bg:"var(--ink-10)",icon:"·",text:""};
                  const ln = a.lessonNote;
                  return (
                    <div key={i} style={{background:"var(--paper)",borderRadius:"var(--radius)",padding:"14px 16px",marginBottom:6,boxShadow:"var(--shadow)",border:"1px solid var(--border)"}}>
                      <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:8}}>
                        <span style={{fontSize:12,color:"var(--ink-30)"}}>{fmtDate(a.date)}</span>
                        <span style={{background:st.bg,color:st.color,fontSize:10,fontWeight:600,padding:"2px 8px",borderRadius:6}}>{st.icon} {st.text}</span>
                      </div>
                      {ln && typeof ln === "object" ? (
                        <div style={{fontSize:13,color:"var(--ink)",lineHeight:1.7}}>
                          {ln.progress && <div>📚 {ln.progress}</div>}
                          {ln.content && <div style={{color:"var(--ink-60)",marginTop:2}}>{ln.content}</div>}
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

            {/* 이번 달 수납 */}
            {(() => {
              const autoAmt = (student.monthlyFee || 0) + (student.instrumentRental ? (student.rentalFee || 0) : 0);
              const tp = sPay.find(p => p.month === THIS_MONTH);
              const isPaid = tp?.paid;
              const amt = tp?.amount || autoAmt;
              return (
                <div style={{marginBottom:16}}>
                  <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:10}}>
                    <div style={{width:3,height:14,background:`linear-gradient(180deg,${isPaid?"var(--green)":"var(--gold)"},${isPaid?"var(--green)":"var(--gold-dk)"})`,borderRadius:2,flexShrink:0}}/>
                    <div style={{fontFamily:"'Noto Serif KR',serif",fontSize:14,fontWeight:500,color:"var(--ink)"}}>이번 달 수납</div>
                  </div>
                  <div onClick={()=>setTab("pay")} style={{cursor:"pointer",background:isPaid?"var(--green-lt)":"var(--gold-lt)",border:`1px solid ${isPaid?"rgba(26,122,64,.2)":"rgba(245,168,0,.25)"}`,borderRadius:"var(--radius-lg)",padding:"16px",display:"flex",alignItems:"center",justifyContent:"space-between",boxShadow:"var(--shadow-lifted)",transition:"opacity .12s"}} onMouseEnter={e=>e.currentTarget.style.opacity=".85"} onMouseLeave={e=>e.currentTarget.style.opacity="1"}>
                    <div>
                      <div style={{fontFamily:"'Noto Serif KR',serif",fontSize:17,fontWeight:700,color:isPaid?"var(--green)":"var(--gold-dk)"}}>{isPaid ? "✓ 납부 완료" : `수납 안내 · ${fmtMoney(amt)}`}</div>
                      {tp?.paidDate && <div style={{fontSize:11,color:"var(--ink-30)",marginTop:2}}>{fmtDate(tp.paidDate)} 납부</div>}
                      {!tp && <div style={{fontSize:11,color:"var(--ink-30)",marginTop:2}}>수납 내역 없음</div>}
                    </div>
                    <span style={{fontSize:22}}>{isPaid ? "✅" : "💛"}</span>
                  </div>
                </div>
              );
            })()}

            {/* 기본 정보 */}
            <div>
              <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:10}}>
                <div style={{width:3,height:14,background:"linear-gradient(180deg,var(--ink-30),var(--border))",borderRadius:2,flexShrink:0}}/>
                <div style={{fontFamily:"'Noto Serif KR',serif",fontSize:14,fontWeight:500,color:"var(--ink)"}}>기본 정보</div>
              </div>
              <div style={{background:"var(--paper)",borderRadius:"var(--radius-lg)",overflow:"hidden",boxShadow:"var(--shadow)",border:"1px solid var(--border)"}}>
                <div className="info-grid">
                  <div className="ii"><div className="ii-label">담당 강사</div><div className="ii-val">{teacher?teacher.name:"미배정"}</div></div>
                  <div className="ii"><div className="ii-label">수강 시작일</div><div className="ii-val">{fmtDate(student.startDate)}</div></div>
                  <div className="ii"><div className="ii-label">월 수강료</div><div className="ii-val">{fmtMoney(student.monthlyFee)}</div></div>
                  <div className="ii"><div className="ii-label">수강 상태</div><div className="ii-val" style={{color:"var(--green)",fontWeight:500}}>{(student.status||"active")==="active"?"재원":student.status==="paused"?"휴원":"퇴원"}</div></div>
                </div>
              </div>
            </div>

          </div>
        )}

        {/* Notices Tab */}
        {tab === "notice" && (
          <div>
            <div style={{fontSize:13,fontWeight:600,color:"var(--ink)",marginBottom:10}}>공지사항</div>
            {visibleNotices.length === 0 ? <PortalEmptyState title="등록된 공지가 없습니다" sub="새 공지사항이 등록되면 이곳에서 확인하실 수 있어요." /> :
              visibleNotices.map(n => {
                const isUnread = !readNoticeIds.has(n.id);
                return (
                  <div key={n.id} onClick={() => handleNoticeOpen(n)} style={{background:"var(--paper)",borderRadius:12,padding:"14px 16px",marginBottom:8,boxShadow:"0 1px 4px rgba(0,0,0,.03)",border:n.pinned?"1px solid rgba(245,168,0,.3)":isUnread?"1px solid rgba(43,58,159,.2)":"1px solid var(--border)",cursor:"pointer",display:"flex",alignItems:"center",gap:8,transition:"background var(--dur-fast) var(--ease-out)"}}>
                    {n.pinned && <span style={{fontSize:11,flexShrink:0}}>📌</span>}
                    {isUnread && <span style={{width:7,height:7,borderRadius:"50%",background:"var(--blue)",display:"inline-block",flexShrink:0}}/>}
                    <div style={{flex:1,minWidth:0}}>
                      <div style={{fontSize:14,fontWeight:isUnread?700:500,color:"var(--ink)",overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{n.title}</div>
                      <div style={{fontSize:11,color:"var(--ink-30)",marginTop:2}}>{n.authorName} · {fmtDateTime(n.createdAt)}</div>
                    </div>
                    <span style={{fontSize:16,color:"var(--ink-30)",flexShrink:0}}>›</span>
                  </div>
                );
              })
            }
          </div>
        )}

        {/* Attendance Tab — 미니멀 타임라인 */}
        {tab === "att" && (() => {
          const byMonth = {};
          sAtt.forEach(a => {
            const m = a.date?.slice(0, 7);
            if (m) { if (!byMonth[m]) byMonth[m] = []; byMonth[m].push(a); }
          });
          const months = Object.keys(byMonth).sort().reverse().slice(0, 6);
          const MARK = {
            present: { bg:"var(--green)" },
            absent:  { bg:"var(--red)" },
            late:    { bg:"var(--gold)" },
            excused: { bg:"transparent", border:"1px solid var(--blue)" },
          };
          return (
            <div>
              {/* 이달 요약 헤더 */}
              {attThisMonth.length > 0 && (
                <div style={{background:"var(--hanji)",borderRadius:"var(--radius-lg)",padding:"18px 20px",marginBottom:14,border:"1px solid var(--border)"}}>
                  <div style={{fontSize:9,letterSpacing:"0.14em",color:"var(--gold-dk)",fontWeight:600,marginBottom:8}}>이달 출석</div>
                  <div style={{display:"flex",alignItems:"baseline",gap:14,flexWrap:"wrap"}}>
                    <div>
                      <span style={{fontFamily:"'Noto Serif KR',serif",fontSize:28,fontWeight:500,color:attRate&&attRate>=80?"var(--green)":"var(--ink)",fontVariantNumeric:"tabular-nums"}}>{attRate ?? "—"}</span>
                      <span style={{fontSize:13,color:"var(--ink-30)",marginLeft:2}}>%</span>
                    </div>
                    <div style={{fontSize:11,color:"var(--ink-30)",letterSpacing:"0.04em"}}>
                      출석 {presentCount} · 결석 {absentCount} · 지각 {lateCount}{excusedCount>0?` · 보강 ${excusedCount}`:""}
                    </div>
                  </div>
                  {/* Stacked 4-segment progress bar */}
                  <div style={{display:"flex",height:3,marginTop:12,borderRadius:1.5,overflow:"hidden",background:"var(--ink-10)"}}>
                    {(() => {
                      const total = totalThisMonth || 1;
                      const seg = (n,c,key) => n>0 ? <div key={key} style={{width:`${n/total*100}%`,height:"100%",background:c,transition:"width .6s var(--ease-out)"}}/> : null;
                      return [
                        seg(presentCount,"var(--green)","p"),
                        seg(lateCount,"var(--gold)","l"),
                        seg(excusedCount,"var(--blue)","e"),
                        seg(absentCount,"var(--red)","a"),
                      ];
                    })()}
                  </div>
                </div>
              )}
              {/* 이달 미니 캘린더 (day-of-month 그리드) */}
              {attThisMonth.length > 0 && (() => {
                const today = new Date();
                const yyyy = parseInt(THIS_MONTH.slice(0,4));
                const mm = parseInt(THIS_MONTH.slice(5,7));
                const firstDay = new Date(yyyy, mm-1, 1);
                const lastDay = new Date(yyyy, mm, 0);
                const offset = firstDay.getDay();
                const daysInMonth = lastDay.getDate();
                const todayKey = today.getFullYear()===yyyy && today.getMonth()+1===mm ? today.getDate() : -1;
                const todayMs = new Date(today.getFullYear(),today.getMonth(),today.getDate()).getTime();
                const statusByDay = {};
                attThisMonth.forEach(a => { const d = parseInt(a.date.slice(8,10)); statusByDay[d] = a.status; });
                const cells = [];
                for (let i=0; i<offset; i++) cells.push(null);
                for (let d=1; d<=daysInMonth; d++) cells.push(d);
                while (cells.length % 7 !== 0) cells.push(null);
                return (
                  <div style={{marginBottom:14,padding:"14px 16px",background:"var(--paper)",borderRadius:"var(--radius-lg)",border:"1px solid var(--border)"}}>
                    <div style={{fontSize:9,letterSpacing:"0.14em",color:"var(--ink-30)",fontWeight:600,marginBottom:10,textTransform:"uppercase"}}>이달 캘린더</div>
                    <div style={{display:"grid",gridTemplateColumns:"repeat(7,1fr)",gap:5,marginBottom:6}}>
                      {["일","월","화","수","목","금","토"].map((d,i) => (
                        <div key={d} style={{fontSize:9,color:i===0?"var(--red)":i===6?"var(--blue)":"var(--ink-30)",textAlign:"center",letterSpacing:"0.04em",fontWeight:500}}>{d}</div>
                      ))}
                    </div>
                    <div style={{display:"grid",gridTemplateColumns:"repeat(7,1fr)",gap:5}}>
                      {cells.map((d,i) => {
                        if (d === null) return <div key={i} />;
                        const status = statusByDay[d];
                        const cellMs = new Date(yyyy,mm-1,d).getTime();
                        const future = cellMs > todayMs;
                        const isToday = d === todayKey;
                        const cfg = MARK[status];
                        const filled = cfg && cfg.bg !== "transparent";
                        return (
                          <div key={i} title={status?`${yyyy}-${String(mm).padStart(2,"0")}-${String(d).padStart(2,"0")} · ${attStatusStyle[status]?.text||""}`:`${yyyy}-${String(mm).padStart(2,"0")}-${String(d).padStart(2,"0")}`} style={{
                            aspectRatio:"1",
                            borderRadius:4,
                            background: filled ? cfg.bg : "transparent",
                            border: status==="excused" ? "1px solid var(--blue)" : isToday ? "1px solid var(--ink)" : "1px solid var(--border)",
                            opacity: future ? 0.35 : 1,
                            display:"flex",alignItems:"center",justifyContent:"center",
                            fontSize:10,fontWeight:isToday?700:400,
                            color: filled ? "rgba(255,255,255,.92)" : status==="excused" ? "var(--blue)" : "var(--ink-30)",
                            fontVariantNumeric:"tabular-nums",
                          }}>{d}</div>
                        );
                      })}
                    </div>
                  </div>
                );
              })()}
              {/* 범례 */}
              {months.length > 0 && (
                <div style={{display:"flex",gap:14,justifyContent:"center",fontSize:10,color:"var(--ink-30)",letterSpacing:"0.04em",margin:"0 0 14px"}}>
                  <span style={{display:"inline-flex",alignItems:"center",gap:4}}><span style={{width:6,height:6,borderRadius:1.5,background:"var(--green)",display:"inline-block"}}/>출석</span>
                  <span style={{display:"inline-flex",alignItems:"center",gap:4}}><span style={{width:6,height:6,borderRadius:1.5,background:"var(--red)",display:"inline-block"}}/>결석</span>
                  <span style={{display:"inline-flex",alignItems:"center",gap:4}}><span style={{width:6,height:6,borderRadius:1.5,background:"var(--gold)",display:"inline-block"}}/>지각</span>
                  <span style={{display:"inline-flex",alignItems:"center",gap:4}}><span style={{width:6,height:6,borderRadius:1.5,border:"1px solid var(--blue)",display:"inline-block"}}/>보강</span>
                </div>
              )}
              {months.length === 0 ? (
                <PortalEmptyState title="출석 기록이 없습니다" sub="레슨 출석 정보가 입력되면 이곳에서 확인하실 수 있어요." />
              ) : (() => {
                const pastMonths = months.filter(m => m !== THIS_MONTH);
                if (pastMonths.length === 0) return null;
                return (<>
                  <div style={{fontSize:9,letterSpacing:"0.14em",color:"var(--ink-30)",fontWeight:600,marginBottom:6,textTransform:"uppercase",padding:"0 4px"}}>지난 달</div>
                  {pastMonths.map((m,idx) => {
                    const recs = byMonth[m].slice().sort((a,b)=>a.date.localeCompare(b.date));
                    const okN = recs.filter(a=>a.status==="present"||a.status==="late").length;
                    const total = recs.length;
                    const rate = total>0 ? Math.round(okN/total*100) : 0;
                    return (
                      <div key={m} style={{display:"flex",alignItems:"center",gap:14,padding:"14px 4px",borderTop:idx===0?"1px solid var(--border)":"none",borderBottom:"1px solid var(--border)"}}>
                        <div style={{minWidth:46,flexShrink:0}}>
                          <div style={{fontFamily:"'Noto Serif KR',serif",fontSize:18,fontWeight:500,color:"var(--ink)",lineHeight:1}}>
                            {parseInt(m.slice(5))}<span style={{fontSize:10,color:"var(--ink-30)",marginLeft:1}}>월</span>
                          </div>
                          <div style={{fontSize:9,color:"var(--ink-30)",letterSpacing:"0.08em",marginTop:3}}>{rate}%</div>
                        </div>
                        <div style={{display:"flex",gap:4,flex:1,flexWrap:"wrap",alignItems:"center"}}>
                          {recs.map((a,i) => {
                            const cfg = MARK[a.status] || { bg:"var(--ink-10)" };
                            return <span key={i} title={`${fmtDateShort(a.date)} · ${attStatusStyle[a.status]?.text||""}`} style={{width:6,height:6,borderRadius:1.5,background:cfg.bg,border:cfg.border||"none",display:"inline-block"}}/>;
                          })}
                        </div>
                        <div style={{fontSize:10,color:"var(--ink-30)",flexShrink:0,letterSpacing:"0.04em"}}>{okN}<span style={{margin:"0 2px"}}>/</span>{total}</div>
                      </div>
                    );
                  })}
                  <div style={{fontSize:10,color:"var(--ink-30)",textAlign:"center",marginTop:10,letterSpacing:"0.04em"}}>최근 6개월 기록</div>
                </>);
              })()}
            </div>
          );
        })()}

        {/* Lesson Notes Tab */}
        {tab === "notes" && (() => {
          // 월별 그룹화
          const grouped = notes.reduce((acc, a) => {
            const key = a.date?.slice(0, 7) || "기타";
            (acc[key] = acc[key] || []).push(a);
            return acc;
          }, {});
          const monthKeys = Object.keys(grouped).sort((a, b) => b.localeCompare(a));

          // 이번달 통계
          const thisMonthNotes = grouped[THIS_MONTH] || [];
          const condCount = thisMonthNotes.reduce((acc, a) => {
            const c = a.lessonNote?.condition;
            if (c) acc[c] = (acc[c] || 0) + 1;
            return acc;
          }, {});
          const topCond = Object.entries(condCount).sort((a, b) => b[1] - a[1])[0];
          const condTopLabel = topCond ? ({excellent:"매우 좋음 ✨",good:"좋음 😊",normal:"보통 🙂",poor:"부진 💪"}[topCond[0]]) : null;

          const today = new Date();
          today.setHours(0,0,0,0);
          const dateLabel = (dateStr) => {
            const d = new Date(dateStr + "T00:00:00");
            const diff = Math.round((today - d) / 86400000);
            if (diff === 0) return "오늘";
            if (diff === 1) return "어제";
            if (diff < 7) return `${diff}일 전`;
            return fmtDate(dateStr);
          };

          return (
            <div>
              {/* 이번달 요약 헤더 */}
              {notes.length > 0 && (
                <div style={{background:"linear-gradient(135deg,#EEF2FF,#F0F9FF)",borderRadius:16,padding:"16px 18px",marginBottom:14,border:"1px solid rgba(43,58,159,.1)"}}>
                  <div style={{fontSize:11,color:"var(--blue)",fontWeight:600,letterSpacing:.4,marginBottom:6}}>이번 달 학습 기록</div>
                  <div style={{display:"flex",gap:14,alignItems:"baseline",flexWrap:"wrap"}}>
                    <div>
                      <span style={{fontSize:24,fontWeight:700,color:"var(--blue)",fontFamily:"'Noto Serif KR',serif"}}>{thisMonthNotes.length}</span>
                      <span style={{fontSize:12,color:"var(--ink-30)",marginLeft:4}}>건의 레슨노트</span>
                    </div>
                    {condTopLabel && (
                      <div style={{paddingLeft:14,borderLeft:"1px solid rgba(43,58,159,.15)"}}>
                        <div style={{fontSize:10,color:"var(--ink-30)"}}>이번달 컨디션</div>
                        <div style={{fontSize:13,fontWeight:600,color:"var(--ink)",marginTop:1}}>{condTopLabel}</div>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {notes.length === 0 ? (
                <PortalEmptyState title="아직 레슨노트가 없어요" sub={"강사님이 레슨 후 작성하시면\n이곳에서 확인하실 수 있어요."} />
              ) : (
                monthKeys.map(monthKey => (
                  <div key={monthKey} style={{marginBottom:14}}>
                    {/* 월 구분 라벨 */}
                    {monthKey !== "기타" && (
                      <div style={{fontSize:11,fontWeight:700,color:"var(--ink-30)",letterSpacing:.4,padding:"6px 4px 8px",borderBottom:"1px solid #F0F0F0",marginBottom:8}}>
                        {monthKey.replace("-","년 ")}월 · {grouped[monthKey].length}건
                      </div>
                    )}
                    {grouped[monthKey].map((a, i) => {
                      const st = attStatusStyle[a.status] || { color:"var(--ink-30)", bg:"var(--ink-10)", icon:"·", text:"" };
                      const ln = a.lessonNote;
                      const noteTeacher = teachers.find(t => t.id === a.teacherId) || teacher;
                      const condColor = ln?.condition === "excellent" ? "var(--blue)" : ln?.condition === "good" ? "var(--green)" : ln?.condition === "normal" ? "var(--gold)" : ln?.condition === "poor" ? "var(--red)" : "var(--ink-30)";
                      const condBg = ln?.condition === "excellent" ? "rgba(43,58,159,.08)" : ln?.condition === "good" ? "var(--green-lt)" : ln?.condition === "normal" ? "var(--gold-lt)" : ln?.condition === "poor" ? "var(--red-lt)" : "var(--ink-10)";
                      const condEmoji = { excellent: "✨", good: "😊", normal: "🙂", poor: "💪" }[ln?.condition];
                      const condLabel = { excellent: "매우 좋음", good: "좋음", normal: "보통", poor: "부진" }[ln?.condition];
                      return (
                        <div key={i} style={{background:"#fff",borderRadius:16,padding:0,marginBottom:10,overflow:"hidden",boxShadow:"0 2px 8px rgba(0,0,0,.04)",border:"1px solid #F0F0F0"}}>
                          {/* 카드 헤더 — 강사 + 날짜 + 출석 */}
                          <div style={{display:"flex",alignItems:"center",gap:10,padding:"12px 16px",borderBottom:"1px solid #F5F5F5"}}>
                            <Av photo={noteTeacher?.photo} name={noteTeacher?.name || "강사"} size="av-sm" />
                            <div style={{flex:1,minWidth:0}}>
                              <div style={{fontSize:12.5,fontWeight:600,color:"var(--ink)",overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{noteTeacher?.name || "강사"} 강사</div>
                              <div style={{fontSize:10.5,color:"var(--ink-30)",marginTop:1}}>{dateLabel(a.date)} · {fmtDate(a.date)}</div>
                            </div>
                            <span style={{background:st.bg,color:st.color,fontSize:10.5,fontWeight:700,padding:"3px 9px",borderRadius:8,whiteSpace:"nowrap"}}>{st.icon} {st.text}</span>
                          </div>

                          <div style={{padding:"14px 16px"}}>
                            {ln && typeof ln === "object" ? (
                              <div>
                                {/* 컨디션 배지 */}
                                {ln.condition && (
                                  <div style={{display:"inline-flex",alignItems:"center",gap:4,background:condBg,color:condColor,fontSize:11,fontWeight:600,padding:"4px 10px",borderRadius:20,marginBottom:10}}>
                                    <span>{condEmoji}</span>
                                    <span>오늘 컨디션 · {condLabel}</span>
                                  </div>
                                )}
                                {/* 진도 — 가장 강조 */}
                                {ln.progress && (
                                  <div style={{marginBottom:8}}>
                                    <div style={{fontSize:10.5,fontWeight:700,color:"var(--blue)",letterSpacing:.4,marginBottom:3}}>📚 오늘의 진도</div>
                                    <div style={{fontSize:14,fontWeight:600,color:"var(--ink)",lineHeight:1.6}}>{ln.progress}</div>
                                  </div>
                                )}
                                {/* 수업 내용 */}
                                {ln.content && (
                                  <div style={{marginBottom:8,padding:"10px 12px",background:"var(--bg)",borderRadius:10,borderLeft:"3px solid var(--blue)"}}>
                                    <div style={{fontSize:10.5,fontWeight:700,color:"var(--ink-30)",letterSpacing:.4,marginBottom:3}}>수업 내용</div>
                                    <div style={{fontSize:13,color:"var(--ink-70)",lineHeight:1.7,whiteSpace:"pre-wrap"}}>{ln.content}</div>
                                  </div>
                                )}
                                {/* 과제 — 강조 */}
                                {ln.assignment && (
                                  <div style={{marginBottom:8,padding:"11px 14px",background:"linear-gradient(135deg,#F0F9FF,#EFF6FF)",borderRadius:10,border:"1px solid rgba(43,58,159,.12)"}}>
                                    <div style={{fontSize:10.5,fontWeight:700,color:"var(--blue)",letterSpacing:.4,marginBottom:3}}>📝 다음 시간까지 과제</div>
                                    <div style={{fontSize:13,color:"var(--ink)",lineHeight:1.7,fontWeight:500}}>{ln.assignment}</div>
                                  </div>
                                )}
                                {/* 보강 안내 */}
                                {ln.makeupNeeded && ln.makeupPlan && (
                                  <div style={{marginBottom:8,padding:"9px 12px",background:"var(--gold-lt)",borderRadius:10,border:"1px solid #FDE68A"}}>
                                    <div style={{fontSize:10.5,fontWeight:700,color:"var(--gold-dk)",letterSpacing:.4,marginBottom:2}}>🔄 보강 안내</div>
                                    <div style={{fontSize:12.5,color:"var(--gold-dk)",lineHeight:1.6}}>{ln.makeupPlan}</div>
                                  </div>
                                )}
                                {/* 메모 */}
                                {ln.memo && (
                                  <div style={{fontSize:11.5,color:"var(--ink-30)",lineHeight:1.6,marginTop:6,paddingTop:6,borderTop:"1px dashed #EEE"}}>{ln.memo}</div>
                                )}
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
                    })}
                  </div>
                ))
              )}
            </div>
          );
        })()}

        {/* Monthly Reports Tab */}
        {tab === "report" && (() => {
          const myReports = aiReports
            .filter(r => r.studentId === student.id && r.status === "published")
            .sort((a, b) => (b.month || "").localeCompare(a.month || ""));
          const fmtMonth = (m) => {
            if (!m) return "";
            const [y, mo] = m.split("-");
            return `${y}년 ${parseInt(mo, 10)}월`;
          };
          return (
            <div>
              {/* 인트로 카드 */}
              <div style={{background:"var(--hanji)",borderRadius:"var(--radius-lg)",padding:"18px 18px 16px",marginBottom:16,border:"1px solid var(--border)",boxShadow:"var(--shadow-lifted)",overflow:"hidden",position:"relative"}}>
                <div style={{position:"absolute",top:0,left:0,right:0,height:3,background:"linear-gradient(90deg,var(--dancheong-blue),var(--dancheong-red),var(--dancheong-yellow))"}}/>
                <div style={{display:"flex",alignItems:"center",gap:10,marginBottom:6}}>
                  <span style={{fontSize:20}}>📊</span>
                  <div style={{fontFamily:"'Noto Serif KR',serif",fontSize:16,fontWeight:600,color:"var(--ink)"}}>월간 학습 리포트</div>
                </div>
                <div style={{fontSize:12,color:"var(--ink-60)",lineHeight:1.65}}>
                  강사님이 한 달간의 학습을 정리해서 보내드립니다.<br/>
                  {myReports.length > 0 ? `현재까지 ${myReports.length}편의 리포트가 도착했어요.` : "아직 리포트가 없습니다. 첫 리포트가 도착하면 여기에 표시됩니다."}
                </div>
              </div>

              {myReports.length === 0 ? (
                <PortalEmptyState title="아직 리포트가 없습니다" sub={"매월 초, 지난 달의 학습 여정을\n강사님이 정성껏 정리해서 보내드릴 예정입니다."} />
              ) : (
                <div style={{display:"flex",flexDirection:"column",gap:14}}>
                  {myReports.map((r, idx) => {
                    const rTeacher = teachers.find(t => t.id === r.publishedBy) || teachers.find(t => t.id === student.teacherId);
                    const att = r.attendanceSummary;
                    return (
                      <div key={r.id} style={{background:idx===0?"var(--hanji)":"var(--paper)",borderRadius:"var(--radius-lg)",border:idx===0?"1px solid rgba(31,61,122,.15)":"1px solid var(--border)",boxShadow:idx===0?"var(--shadow-lifted)":"var(--shadow)",overflow:"hidden",position:"relative"}}>
                        {/* 단청 3색 상단 stripe */}
                        <div style={{height:3,background:"linear-gradient(90deg,var(--dancheong-blue),var(--dancheong-red),var(--dancheong-yellow))"}}/>
                        <div style={{padding:"16px 18px 14px"}}>
                          {idx === 0 && (
                            <div style={{display:"inline-block",background:"var(--dancheong-blue)",color:"#fff",fontSize:10,fontWeight:700,padding:"2px 8px",borderRadius:6,letterSpacing:.3,marginBottom:8}}>최신</div>
                          )}
                          <div style={{display:"flex",alignItems:"flex-start",justifyContent:"space-between",gap:8,marginBottom:12,paddingBottom:10,borderBottom:"1px solid var(--border)"}}>
                            <div>
                              <div style={{fontFamily:"'Noto Serif KR',serif",fontSize:22,fontWeight:700,color:"var(--ink)",letterSpacing:-.5,lineHeight:1.2}}>{fmtMonth(r.month)}</div>
                              <div style={{fontSize:11,color:"var(--ink-30)",marginTop:3}}>
                                {r.publishedAt && `발행 ${fmtDate(new Date(r.publishedAt).toISOString().slice(0,10))}`}
                                {rTeacher && ` · ${rTeacher.name} 강사님`}
                              </div>
                            </div>
                            {att && att.total > 0 && (
                              <div style={{textAlign:"right",flexShrink:0}}>
                                <div style={{fontSize:10,color:"var(--ink-30)"}}>출석률</div>
                                <div style={{fontFamily:"'Noto Serif KR',serif",fontSize:22,fontWeight:700,fontVariantNumeric:"tabular-nums",color:att.rate>=85?"var(--green)":att.rate>=60?"var(--gold-dk)":"var(--red)"}}>{att.rate}%</div>
                              </div>
                            )}
                          </div>
                          {att && att.total > 0 && (
                            <div style={{display:"flex",gap:6,flexWrap:"wrap",marginBottom:12,fontSize:11}}>
                              <span style={{background:"var(--green-lt)",color:"var(--green)",padding:"3px 8px",borderRadius:6,fontWeight:600}}>출석 {att.present}</span>
                              {att.late > 0 && <span style={{background:"var(--gold-lt)",color:"var(--gold-dk)",padding:"3px 8px",borderRadius:6,fontWeight:600}}>지각 {att.late}</span>}
                              {att.absent > 0 && <span style={{background:"var(--red-lt)",color:"var(--red)",padding:"3px 8px",borderRadius:6,fontWeight:600}}>결석 {att.absent}</span>}
                              {att.excused > 0 && <span style={{background:"var(--ink-10)",color:"var(--ink-60)",padding:"3px 8px",borderRadius:6,fontWeight:600}}>사유결석 {att.excused}</span>}
                            </div>
                          )}
                          <div style={{fontSize:13.5,color:"var(--ink)",lineHeight:1.85,whiteSpace:"pre-wrap"}}>{r.body}</div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })()}

        {/* Payment Tab — Invoice Style */}
        {tab === "pay" && (
          <div>
            <div style={{fontSize:13,fontWeight:600,color:"var(--ink)",marginBottom:10}}>수납 이력</div>
            {sPay.length === 0 ? <PortalEmptyState title="수납 기록이 없습니다" sub="수납 정보가 등록되면 이곳에서 확인하실 수 있어요." /> :
              sPay.slice(0, 24).map((p, i) => {
                const baseFee = student.monthlyFee || 0;
                const rentalFee = student.instrumentRental ? (student.rentalFee || 0) : 0;
                const rentalLabel = student.rentalType ? student.rentalType.replace("rental:", "") : "악기 대여";
                const extraChargesSum = (p.extraCharges||[]).reduce((s,ec)=>s+(ec.amount||0),0);
                const autoTotal = baseFee + rentalFee + extraChargesSum;
                const total = p.amount || autoTotal;
                const adjustment = total - autoTotal;
                const METHOD = { transfer: "계좌이체", cash: "현금", card: "카드" };
                const isPaid = !!p.paid;
                const instruments = (student.lessons||[]).map(l=>l.instrument).filter(Boolean).join(" · ");
                return (
                  <div key={i} style={{background:"var(--paper)",borderRadius:"var(--radius-lg)",marginBottom:14,overflow:"hidden",boxShadow:"var(--shadow-lifted)",border:"1px solid var(--border)"}}>
                    {/* 단청 상단 stripe */}
                    <div style={{height:3,background:"linear-gradient(90deg,var(--dancheong-blue),var(--dancheong-red),var(--dancheong-yellow))"}}/>

                    {/* 레터헤드 */}
                    <div style={{padding:"14px 18px 12px",borderBottom:"1px solid var(--border)",display:"flex",justifyContent:"space-between",alignItems:"flex-start"}}>
                      <div>
                        <div style={{fontSize:9,color:"var(--ink-30)",letterSpacing:1.2,textTransform:"uppercase",marginBottom:4}}>RYE-K K-Culture Center</div>
                        <div style={{fontFamily:"'Noto Serif KR',serif",fontSize:16,fontWeight:700,color:"var(--ink)",letterSpacing:-.3}}>수강료 납부 명세서</div>
                        <div style={{fontSize:12,color:"var(--ink-60)",marginTop:3}}>{monthLabel(p.month)} 청구</div>
                      </div>
                      <div style={{textAlign:"right",flexShrink:0}}>
                        <div style={{fontSize:8,color:"var(--ink-30)",letterSpacing:.8}}>NO.</div>
                        <div style={{fontFamily:"monospace",fontSize:11,color:"var(--ink-60)",letterSpacing:1.5}}>{(p.month||"").replace("-","")}</div>
                      </div>
                    </div>

                    {/* 수납자 정보 */}
                    <div style={{padding:"9px 18px",background:"var(--bg)",borderBottom:"1px solid var(--border)",display:"flex",gap:24,flexWrap:"wrap"}}>
                      <div>
                        <div style={{fontSize:8,color:"var(--ink-30)",letterSpacing:.8,marginBottom:2}}>수 강 생</div>
                        <div style={{fontSize:13,fontWeight:600,color:"var(--ink)"}}>{student.name}</div>
                      </div>
                      {instruments && (
                        <div>
                          <div style={{fontSize:8,color:"var(--ink-30)",letterSpacing:.8,marginBottom:2}}>과 목</div>
                          <div style={{fontSize:13,fontWeight:500,color:"var(--blue)"}}>{instruments}</div>
                        </div>
                      )}
                    </div>

                    {/* 항목 명세 */}
                    <div style={{padding:"12px 18px 14px"}}>
                      <div style={{display:"flex",justifyContent:"space-between",padding:"6px 0",fontSize:13,color:"var(--ink-60)",borderBottom:"1px dashed var(--border)"}}>
                        <span>기본 수강료</span>
                        <span style={{fontVariantNumeric:"tabular-nums",fontWeight:500,color:"var(--ink)"}}>{fmtMoney(baseFee)}</span>
                      </div>
                      {rentalFee > 0 && (
                        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"6px 0",fontSize:13,color:"var(--ink-60)",borderBottom:"1px dashed var(--border)"}}>
                          <span style={{display:"flex",alignItems:"center",gap:4}}>악기 대여료<span style={{fontSize:10,color:"var(--ink-30)",background:"var(--ink-10)",padding:"1px 6px",borderRadius:4}}>{rentalLabel}</span></span>
                          <span style={{fontVariantNumeric:"tabular-nums",fontWeight:500,color:"var(--ink)"}}>{fmtMoney(rentalFee)}</span>
                        </div>
                      )}
                      {(p.extraCharges||[]).map((ec, ei) => (
                        <div key={ei} style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"6px 0",fontSize:13,color:"var(--ink-60)",borderBottom:"1px dashed var(--border)"}}>
                          <span style={{display:"flex",alignItems:"center",gap:4}}>
                            <span style={{overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap",maxWidth:130}}>{ec.title}</span>
                            <span style={{fontSize:10,color:"var(--ink-30)",background:"var(--ink-10)",padding:"1px 6px",borderRadius:4,flexShrink:0}}>추가</span>
                          </span>
                          <span style={{fontVariantNumeric:"tabular-nums",fontWeight:500,color:"var(--ink)"}}>{fmtMoney(ec.amount||0)}</span>
                        </div>
                      ))}
                      {adjustment !== 0 && (
                        <div style={{display:"flex",justifyContent:"space-between",padding:"6px 0",fontSize:12,color:adjustment>0?"#7C3AED":"var(--red)",borderBottom:"1px dashed var(--border)"}}>
                          <span>{adjustment > 0 ? "추가 조정" : "차감 조정"}</span>
                          <span style={{fontVariantNumeric:"tabular-nums"}}>{adjustment>0?"+":""}{fmtMoney(adjustment)}</span>
                        </div>
                      )}
                      {/* 합계 */}
                      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginTop:8,paddingTop:8,borderTop:"2px solid var(--ink)"}}>
                        <span style={{fontFamily:"'Noto Serif KR',serif",fontSize:14,fontWeight:700,color:"var(--ink)",letterSpacing:2}}>합　계</span>
                        <span style={{fontFamily:"'Noto Serif KR',serif",fontSize:20,fontWeight:700,color:"var(--ink)",fontVariantNumeric:"tabular-nums"}}>{fmtMoney(total)}</span>
                      </div>
                      {/* ⛔ p.note는 관리자 전용 비고 — 절대 렌더링 금지 */}
                    </div>

                    {/* 계좌 안내 박스 (수강료 확정 + 미납 상태에서만) */}
                    {!isPaid && (p.amount||0) > 0 && (
                      <div style={{margin:"0 18px 14px",padding:"12px 14px",background:"var(--hanji)",border:"1px dashed var(--border)",borderRadius:"var(--radius-sm)"}}>
                        <div style={{fontSize:10,color:"var(--ink-soft)",marginBottom:4,letterSpacing:"0.05em"}}>입금 계좌</div>
                        <div style={{fontFamily:"'Noto Serif KR',serif",fontSize:14,fontWeight:500,color:"var(--ink)"}}>카카오뱅크 3333-34-5220544</div>
                        <div style={{fontSize:11,color:"var(--ink-soft)",marginTop:2}}>예금주: 예케이케이컬처센터</div>
                      </div>
                    )}

                    {/* 납부 상태 푸터 */}
                    {(()=>{
                      const isConfirmed = (p.amount||0) > 0;
                      const footerBg = isPaid ? "var(--green-lt)" : isConfirmed ? "rgba(210,50,50,.06)" : "var(--gold-lt)";
                      const stampColor = isPaid ? "var(--green)" : isConfirmed ? "var(--dancheong-red)" : "var(--gold-dk)";
                      const stampLabel = isPaid ? "완납" : isConfirmed ? "입금\n요청" : "수납\n안내";
                      const stampSize = isPaid ? 12 : 10;
                      return (
                        <div style={{padding:"10px 18px 14px",borderTop:"1px solid var(--border)",background:footerBg,display:"flex",justifyContent:"space-between",alignItems:"center"}}>
                          <div style={{fontSize:11,color:stampColor}}>
                            <div style={{fontWeight:700,fontSize:12}}>
                              {isPaid ? "납부 완료" : isConfirmed ? "수강료 확정" : "수납 안내 중"}
                            </div>
                            {isPaid && p.paidDate && <div style={{marginTop:2,opacity:.75}}>{fmtDate(p.paidDate)}{p.method?` · ${METHOD[p.method]||p.method}`:""}</div>}
                            {!isPaid && isConfirmed && <div style={{marginTop:2,opacity:.75}}>아래 계좌로 입금 부탁드립니다</div>}
                            {!isPaid && !isConfirmed && <div style={{marginTop:2,opacity:.75}}>센터로 문의해 주세요</div>}
                          </div>
                          {/* 원형 도장 */}
                          <div style={{width:50,height:50,borderRadius:"50%",border:`2px solid ${stampColor}`,display:"flex",alignItems:"center",justifyContent:"center",transform:"rotate(-14deg)",flexShrink:0,opacity:.85}}>
                            <div style={{fontFamily:"'Noto Serif KR',serif",fontSize:stampSize,fontWeight:700,color:stampColor,textAlign:"center",lineHeight:1.25,whiteSpace:"pre"}}>{stampLabel}</div>
                          </div>
                        </div>
                      );
                    })()}
                  </div>
                );
              })
            }
          </div>
        )}
        </div>

        <div style={{textAlign:"center",padding:"24px 0 calc(24px + env(safe-area-inset-bottom,0px))",fontSize:11,color:"var(--ink-30)"}}>
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
            <div style={{fontSize:13,color:"var(--ink-30)",marginTop:6}}>전환할 자녀를 선택하세요</div>
          </div>
          {switchErr && <div className="form-err" style={{marginBottom:14,borderRadius:10,fontSize:13}}>⚠ {switchErr}</div>}
          <div style={{display:"flex",flexDirection:"column",gap:12}}>
            {siblings.map(sib => {
              const insts = (sib.lessons||[]).map(l=>l.instrument).filter(Boolean).join(" · ");
              const isActive = (sib.status||"active") === "active";
              return (
                <button key={sib.id} onClick={()=>handleSiblingSwitch(sib)}
                  style={{background: isActive?"var(--blue-lt)":"var(--bg)",border:`2px solid ${isActive?"var(--blue-lt)":"var(--border)"}`,borderRadius:16,padding:"18px 20px",cursor:"pointer",fontFamily:"inherit",textAlign:"left",transition:"all .15s",WebkitTapHighlightColor:"transparent",width:"100%",minHeight:72,opacity:isActive?1:.7}}
                  onMouseEnter={e=>{if(isActive){e.currentTarget.style.border="2px solid var(--blue)";e.currentTarget.style.background="var(--blue-lt)";}}}
                  onMouseLeave={e=>{if(isActive){e.currentTarget.style.border="2px solid #E8EAF6";e.currentTarget.style.background="var(--blue-lt)";}}}
                >
                  <div style={{display:"flex",alignItems:"center",justifyContent:"space-between"}}>
                    <div style={{fontSize:18,fontWeight:700,color:"var(--ink)"}}>{sib.name}</div>
                    {!isActive && <span style={{fontSize:11,color:"var(--gold)",background:"var(--gold-lt)",padding:"2px 8px",borderRadius:6,fontWeight:600}}>휴원</span>}
                  </div>
                  {insts && <div style={{fontSize:14,color:"var(--blue)",marginTop:4,fontWeight:500}}>{insts}</div>}
                  <div style={{fontSize:11,color:"var(--ink-30)",marginTop:4,fontFamily:"monospace",letterSpacing:1}}>{sib.studentCode}</div>
                </button>
              );
            })}
          </div>
          <button onClick={()=>{setShowSiblingModal(false);setSwitchErr("");}}
            style={{width:"100%",marginTop:16,background:"none",border:"1.5px solid #E8E8E8",borderRadius:12,padding:"12px",fontSize:13,color:"var(--ink-30)",cursor:"pointer",fontFamily:"inherit"}}>닫기</button>
        </div>
      </div>
    )}
    {sheetNotice && <PortalSheet notice={sheetNotice} onClose={() => setSheetNotice(null)} />}
    </>
  );
}
