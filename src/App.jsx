import { useState, useEffect, lazy, Suspense } from "react";
import { db, auth, doc, setDoc, onSnapshot, runTransaction, firebaseSignIn, firebaseSignInAnon, firebaseLogout, onAuthStateChanged } from "./firebase.js";
import { DEFAULT_CATEGORIES, DAYS, ADMIN, TODAY_STR, THIS_MONTH, TODAY_DAY, ATT_STATUS, PAY_METHODS, INST_TYPES, IC, CSS } from "./constants.jsx";
import { calcAge, isMinor, getCat, fmtDate, fmtDateShort, fmtDateTime, uid, fmtPhone, fmtMoney, allLessonInsts, allLessonDays, canManageAll, monthLabel, generateStudentCode, getBirthPassword, getPhoneInitialPassword, instTypeLabel, expandInstitutionsToMembers, getContractDaysLeft, formatLessonNoteSummary } from "./utils.js";
import { InstitutionFormModal, InstitutionDetailModal, InstitutionsView } from "./components/institution/Institutions.jsx";
import { Logo } from "./components/shared/CommonUI.jsx";
import { AttendanceView, LessonNotesView, NoteCommentsPanel } from "./components/attendance/Attendance.jsx";
import PaymentsView from "./components/payment/PaymentsView.jsx";
import { LessonEditor, StudentFormModal, StudentDetailModal, StudentsView } from "./components/student/StudentManagement.jsx";
import { TeacherFormModal, TeacherDetailModal, TeachersView } from "./components/teacher/TeacherManagement.jsx";
import { NoticeFormModal, NoticesView, StudentNoticeManager } from "./components/notice/NoticeManagement.jsx";
import { ActivityView, PendingView, TrashView, CategoriesView, AiSettingsView } from "./components/admin/AdminTools.jsx";
import { CURRENT_VERSION } from "./constants/releases.js";
import Dashboard from "./components/dashboard/Dashboard.jsx";
import { PublicParentView, PublicRegisterForm } from "./components/portal/PublicPortal.jsx";
import { LoginScreen, ProfileView } from "./components/auth/UserAuth.jsx";
import { BottomNav, Sidebar, MoreMenu } from "./components/layout/NavLayout.jsx";
import { UpdatePopup } from "./components/updates/UpdatePopup.jsx";
import { setAiEnabled } from "./aiClient.js";
import AiAssistant from "./components/ai/AiAssistant.jsx";

// ── Lazy-loaded views (code-split) ────────────────────────────────────────────
const AnalyticsView       = lazy(() => import("./components/analytics/AnalyticsView.jsx"));
const ScheduleView        = lazy(() => import("./components/ScheduleView.jsx"));
const SystemNewsView      = lazy(() => import("./components/updates/SystemNewsView.jsx").then(m => ({ default: m.SystemNewsView })));
const MonthlyReportsView  = lazy(() => import("./components/aireports/MonthlyReportsView.jsx"));

// ── Storage (Firestore — 실시간 크로스플랫폼 동기화) ─────────────────────────
const COLLECTION = "appData";
async function sSet(k,v){try{await setDoc(doc(db,COLLECTION,k),{value:v,updatedAt:Date.now()});}catch(e){console.error("sSet error:",k,e);throw e;}}


// ── SAMPLE DATA SEED ──────────────────────────────────────────────────────────
function generateSeedData() {
  // ── 실제 운영 데이터 (2026년 4월 기준) ──────────────────────────────
  const now = Date.now();
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  const usedCodes = new Set();
  const mkCode = () => {
    let code;
    do { code = "RK"; for(let i=0;i<4;i++) code+=chars[Math.floor(Math.random()*chars.length)]; } while(usedCodes.has(code));
    usedCodes.add(code); return code;
  };
  const L = (instrument, teacherId, schedules) => ({
    instrument, teacherId,
    schedule: (schedules||[]).map(([day,time]) => ({ day, time: time||"" }))
  });

  const seedTeachers = [
    { id:"t1",  name:"이민영", username:"leeminy",  password:"AUTO", role:"teacher", phone:"010-9991-5790", instruments:["해금"],                                       birthDate:"1993-08-30", hireDate:"2021-01-01", photo:"", bio:"", notes:"" },
    { id:"t2",  name:"이상윤", username:"leesy",    password:"AUTO", role:"teacher", phone:"010-9385-3026", instruments:["해금"],                                       birthDate:"1997-03-19", hireDate:"2025-01-01", photo:"", bio:"", notes:"" },
    { id:"t3",  name:"이예림", username:"leeyrl",   password:"AUTO", role:"teacher", phone:"",              instruments:["해금"],                                       birthDate:"2000-06-21", hireDate:"2025-01-01", photo:"", bio:"", notes:"" },
    { id:"t4",  name:"김태린", username:"kimtr",    password:"AUTO", role:"teacher", phone:"",              instruments:["해금"],                                       birthDate:"1998-02-10", hireDate:"2024-01-01", photo:"", bio:"", notes:"" },
    { id:"t5",  name:"채영훈", username:"chaeyh",   password:"AUTO", role:"teacher", phone:"010-9392-3211", instruments:["대금 · 소금 · 단소"],                         birthDate:"1992-05-28", hireDate:"2020-01-01", photo:"", bio:"", notes:"" },
    { id:"t6",  name:"이소영", username:"leesy2",   password:"AUTO", role:"teacher", phone:"010-2007-4969", instruments:["대금 · 소금 · 단소"],                         birthDate:"1996-11-27", hireDate:"2025-08-04", photo:"", bio:"", notes:"" },
    { id:"t7",  name:"임하영", username:"limhy",    password:"AUTO", role:"teacher", phone:"",              instruments:["대금 · 소금 · 단소"],                         birthDate:"1996-09-06", hireDate:"2025-01-01", photo:"", bio:"", notes:"" },
    { id:"t8",  name:"김병재", username:"kimbj",    password:"AUTO", role:"teacher", phone:"",              instruments:["대금 · 소금 · 단소"],                         birthDate:"",          hireDate:"2025-01-01", photo:"", bio:"", notes:"꿈장학금" },
    { id:"t9",  name:"김보현", username:"kimbh",    password:"AUTO", role:"teacher", phone:"010-5117-4173", instruments:["가야금"],                                     birthDate:"2000-10-23", hireDate:"2025-01-01", photo:"", bio:"", notes:"" },
    { id:"t10", name:"유선화", username:"yush",     password:"AUTO", role:"teacher", phone:"",              instruments:["가야금","장구 · 북 · 꽹과리 · 징"],            birthDate:"1989-09-09", hireDate:"2026-01-01", photo:"", bio:"", notes:"" },
    { id:"t11", name:"김동영", username:"kimdy",    password:"AUTO", role:"teacher", phone:"010-5643-3123", instruments:["판소리","정가"],                              birthDate:"1989-06-27", hireDate:"2023-01-01", photo:"", bio:"", notes:"" },
    { id:"t12", name:"하태우", username:"hatw",     password:"AUTO", role:"teacher", phone:"",              instruments:["판소리"],                                     birthDate:"",          hireDate:"2026-01-01", photo:"", bio:"", notes:"" },
    { id:"t13", name:"정동주", username:"jungdj",   password:"AUTO", role:"teacher", phone:"010-2830-7487", instruments:["장구 · 북 · 꽹과리 · 징"],                   birthDate:"1984-03-06", hireDate:"2021-01-01", photo:"", bio:"", notes:"반주" },
    { id:"t14", name:"임승빈", username:"limsb",    password:"AUTO", role:"teacher", phone:"",              instruments:["장구 · 북 · 꽹과리 · 징"],                   birthDate:"",          hireDate:"2026-01-01", photo:"", bio:"", notes:"꿈장학금" },
  ];

  const seedStudents = [
    // ─── 이민영 선생님 담당 (해금) ──────────────────────────────────────
    { name:"조혜린",     birthDate:"2007-10-23", phone:"",              guardianPhone:"010-9871-2757", teacherId:"t1",  lessons:[L("해금","t1",[["월","15:00"]]),          L("장구 · 북 · 꽹과리 · 징","t13",[["토","15:00"]])], notes:"전공(정악)/입시생/타악(정동주) 병행", monthlyFee:0, status:"active",  startDate:"2024-09-01" },
    { name:"이미진",     birthDate:"",           phone:"010-8515-8747", guardianPhone:"",              teacherId:"t1",  lessons:[L("해금","t1",[["월","16:00"]])],          notes:"", monthlyFee:0, status:"active",  startDate:"2024-09-01" },
    { name:"이진희",     birthDate:"1973-04-19", phone:"010-6240-2178", guardianPhone:"",              teacherId:"t1",  lessons:[L("해금","t1",[["월","17:00"]])],          notes:"", monthlyFee:0, status:"active",  startDate:"2024-09-01" },
    { name:"김성미",     birthDate:"1975-08-24", phone:"010-2398-7453", guardianPhone:"",              teacherId:"t1",  lessons:[L("해금","t1",[["월","18:30"]])],          notes:"그룹반", monthlyFee:0, status:"active",  startDate:"2024-09-01" },
    { name:"구유미",     birthDate:"",           phone:"010-5593-0112", guardianPhone:"",              teacherId:"t1",  lessons:[L("해금","t1",[["월","18:30"]])],          notes:"그룹반", monthlyFee:0, status:"active",  startDate:"2024-09-01" },
    { name:"이경은",     birthDate:"",           phone:"010-6399-5213", guardianPhone:"",              teacherId:"t1",  lessons:[L("해금","t1",[["월","19:30"]])],          notes:"거제도 발령/잠시 휴회", monthlyFee:0, status:"paused", startDate:"2024-09-01" },
    { name:"이채원",     birthDate:"2009-02-17", phone:"010-4858-7589", guardianPhone:"010-4858-7589", teacherId:"t1",  lessons:[L("해금","t1",[["월","14:00"],["목","12:00"]])], notes:"전공(정악)/주2회수업", monthlyFee:0, status:"active",  startDate:"2024-09-01" },
    { name:"양효연",     birthDate:"",           phone:"010-2560-5346", guardianPhone:"",              teacherId:"t1",  lessons:[L("해금","t1",[["수","11:00"]])],          notes:"일정변동가능성(수-11시)", monthlyFee:0, status:"active",  startDate:"2024-09-01" },
    { name:"전정민",     birthDate:"",           phone:"010-6805-0221", guardianPhone:"",              teacherId:"t1",  lessons:[L("해금","t1",[["수","10:00"]])],          notes:"", monthlyFee:0, status:"active",  startDate:"2024-09-01" },
    { name:"문현식",     birthDate:"",           phone:"010-3136-7614", guardianPhone:"",              teacherId:"t1",  lessons:[L("해금","t1",[["수","18:30"]])],          notes:"", monthlyFee:0, status:"active",  startDate:"2024-09-01" },
    { name:"최정희",     birthDate:"1966-05-15", phone:"010-6880-9053", guardianPhone:"",              teacherId:"t1",  lessons:[L("해금","t1",[["목","11:00"]])],          notes:"", monthlyFee:0, status:"active",  startDate:"2024-09-01" },
    // ─── 이상윤 선생님 담당 (해금) ──────────────────────────────────────
    { name:"박선영",     birthDate:"1969-05-20", phone:"010-5520-2672", guardianPhone:"",              teacherId:"t2",  lessons:[L("해금","t2",[["화","10:30"]])],          notes:"문화강좌 초급반", monthlyFee:0, status:"active",  startDate:"2024-09-01" },
    { name:"강정아",     birthDate:"1970-02-07", phone:"010-2471-6554", guardianPhone:"",              teacherId:"t2",  lessons:[L("해금","t2",[["화","10:30"]])],          notes:"문화강좌 초급반", monthlyFee:0, status:"active",  startDate:"2024-09-01" },
    { name:"이복화",     birthDate:"1973-02-11", phone:"010-2603-2605", guardianPhone:"",              teacherId:"t2",  lessons:[L("해금","t2",[["화","10:30"]])],          notes:"문화강좌 초급반", monthlyFee:0, status:"active",  startDate:"2024-09-01" },
    { name:"김광정",     birthDate:"1968-04-14", phone:"010-5694-9054", guardianPhone:"",              teacherId:"t2",  lessons:[L("해금","t2",[["화","10:30"]])],          notes:"문화강좌 초급반", monthlyFee:0, status:"active",  startDate:"2024-09-01" },
    { name:"이미영",     birthDate:"1968-09-30", phone:"010-8607-8068", guardianPhone:"",              teacherId:"t2",  lessons:[L("해금","t2",[["화","10:30"]])],          notes:"문화강좌 초급반", monthlyFee:0, status:"active",  startDate:"2024-09-01" },
    { name:"유미리",     birthDate:"1984-05-13", phone:"010-8447-4665", guardianPhone:"",              teacherId:"t2",  lessons:[L("해금","t2",[["화","10:30"]])],          notes:"문화강좌 초급반", monthlyFee:0, status:"active",  startDate:"2024-09-01" },
    { name:"이금해",     birthDate:"1963-12-12", phone:"010-9423-0663", guardianPhone:"",              teacherId:"t2",  lessons:[L("해금","t2",[["화","10:30"]])],          notes:"문화강좌 초급반", monthlyFee:0, status:"active",  startDate:"2024-09-01" },
    { name:"김희영",     birthDate:"1971-07-25", phone:"010-8599-9492", guardianPhone:"",              teacherId:"t2",  lessons:[L("해금","t2",[["화","16:40"]])],          notes:"", monthlyFee:0, status:"active",  startDate:"2024-09-01" },
    { name:"하혜정",     birthDate:"1967-08-22", phone:"010-4926-2586", guardianPhone:"",              teacherId:"t2",  lessons:[L("해금","t2",[["화","18:40"]])],          notes:"산조반", monthlyFee:0, status:"active",  startDate:"2024-09-01" },
    { name:"신옥경",     birthDate:"1968-09-01", phone:"010-9142-5053", guardianPhone:"",              teacherId:"t2",  lessons:[L("해금","t2",[["화","18:40"]])],          notes:"산조반", monthlyFee:0, status:"active",  startDate:"2024-09-01" },
    { name:"박윤덕",     birthDate:"1990-05-04", phone:"010-7240-0852", guardianPhone:"",              teacherId:"t2",  lessons:[L("해금","t2",[["화","12:00"],["수","12:00"]])], notes:"", monthlyFee:0, status:"active",  startDate:"2024-09-01" },
    { name:"양소희",     birthDate:"1986-02-10", phone:"010-3899-3400", guardianPhone:"",              teacherId:"t2",  lessons:[L("해금","t2",[["수","12:00"]])],          notes:"", monthlyFee:0, status:"active",  startDate:"2024-09-01" },
    { name:"이영민",     birthDate:"1987-04-17", phone:"010-4421-7796", guardianPhone:"",              teacherId:"t2",  lessons:[L("해금","t2",[["수","12:00"]])],          notes:"", monthlyFee:0, status:"active",  startDate:"2024-09-01" },
    { name:"이성문",     birthDate:"1983-12-16", phone:"010-7710-9054", guardianPhone:"",              teacherId:"t2",  lessons:[L("해금","t2",[["수","12:00"]])],          notes:"", monthlyFee:0, status:"active",  startDate:"2024-09-01" },
    { name:"안예람",     birthDate:"2011-12-13", phone:"010-4446-0585", guardianPhone:"010-4446-0585", teacherId:"t2",  lessons:[L("해금","t2",[["수","16:00"]])],          notes:"", monthlyFee:0, status:"paused", startDate:"2024-09-01" },
    { name:"노영서",     birthDate:"2008-01-17", phone:"010-2221-5346", guardianPhone:"010-2221-5346", teacherId:"t2",  lessons:[L("해금","t2",[["수","17:00"]]),           L("장구 · 북 · 꽹과리 · 징","t13",[["토","15:00"]])], notes:"입시(전공)/타악(정동주) 병행", monthlyFee:0, status:"active",  startDate:"2024-09-01" },
    { name:"손기남",     birthDate:"1983-06-19", phone:"010-2588-0452", guardianPhone:"",              teacherId:"t2",  lessons:[L("해금","t2",[["수","20:00"]])],          notes:"", monthlyFee:0, status:"active",  startDate:"2024-09-01" },
    { name:"이동진",     birthDate:"",           phone:"010-9322-4394", guardianPhone:"",              teacherId:"t2",  lessons:[L("해금","t2",[["목","18:00"]])],          notes:"", monthlyFee:0, status:"active",  startDate:"2024-09-01" },
    { name:"김현주",     birthDate:"1977-01-12", phone:"010-3558-4823", guardianPhone:"",              teacherId:"t2",  lessons:[L("해금","t2",[["목","19:30"]])],          notes:"", monthlyFee:0, status:"active",  startDate:"2024-09-01" },
    { name:"김주경",     birthDate:"1970-11-26", phone:"010-9565-5455", guardianPhone:"",              teacherId:"t2",  lessons:[L("해금","t2",[["목","19:30"]])],          notes:"", monthlyFee:0, status:"active",  startDate:"2024-09-01" },
    { name:"이영신",     birthDate:"1964-06-10", phone:"010-4879-7416", guardianPhone:"",              teacherId:"t2",  lessons:[L("해금","t2",[["수","11:00"]])],          notes:"개인레슨(창원의집)/2025.9.24 등록", monthlyFee:0, status:"active",  startDate:"2025-09-24" },
    { name:"이유정",     birthDate:"1996-06-17", phone:"010-7403-7881", guardianPhone:"",              teacherId:"t2",  lessons:[L("해금","t2",[["수","18:00"]])],          notes:"개인레슨 네이버/2025.12.4 등록",   monthlyFee:0, status:"active",  startDate:"2025-12-04" },
    { name:"전보경",     birthDate:"",           phone:"010-9143-2730", guardianPhone:"",              teacherId:"t2",  lessons:[L("해금","t2",[])],                        notes:"휴회중", monthlyFee:0, status:"paused", startDate:"2024-09-01" },
    // 복수 강사 (해금 + 대금)
    { name:"하광진",     birthDate:"1972-10-15", phone:"010-9691-0780", guardianPhone:"",              teacherId:"t2",  lessons:[L("해금","t2",[["화","10:30"]]),           L("대금 · 소금 · 단소","t6",[["화","12:00"]])], notes:"해금+대금(이소영) 병행", monthlyFee:0, status:"active",  startDate:"2024-09-01" },
    { name:"김희수(미희)",birthDate:"1970-02-10", phone:"010-2214-3060", guardianPhone:"",             teacherId:"t2",  lessons:[L("해금","t2",[["화","18:40"]]),           L("대금 · 소금 · 단소","t5",[["화","19:30"]])], notes:"해금+대금(채영훈) 병행/대금초급반", monthlyFee:0, status:"active",  startDate:"2024-09-01" },
    { name:"김영상",     birthDate:"1969-05-31", phone:"010-5058-1967", guardianPhone:"",              teacherId:"t2",  lessons:[L("해금","t2",[["화","18:40"]]),           L("대금 · 소금 · 단소","t5",[["화","19:30"]])], notes:"해금+대금(채영훈) 병행/대금초급반", monthlyFee:0, status:"active",  startDate:"2024-09-01" },
    { name:"주미란",     birthDate:"1971-03-02", phone:"010-8650-6438", guardianPhone:"",              teacherId:"t2",  lessons:[L("해금","t2",[["화","18:40"]]),           L("대금 · 소금 · 단소","t5",[["화","19:30"]])], notes:"해금+대금(채영훈) 병행/대금초급반", monthlyFee:0, status:"active",  startDate:"2024-09-01" },
    { name:"윤정",       birthDate:"1970-09-27", phone:"010-6355-7515", guardianPhone:"",              teacherId:"t2",  lessons:[L("해금","t2",[["수","12:00"]]),           L("대금 · 소금 · 단소","t5",[["화","18:00"]])], notes:"해금+대금(채영훈) 병행/시나위팀", monthlyFee:0, status:"active",  startDate:"2024-09-01" },
    // ─── 이예림 선생님 담당 (해금) ──────────────────────────────────────
    { name:"김도완",     birthDate:"1975-04-29", phone:"010-9208-7766", guardianPhone:"",              teacherId:"t3",  lessons:[L("해금","t3",[["토","11:30"]])],          notes:"2025.12.6 등록", monthlyFee:0, status:"active",  startDate:"2025-12-06" },
    // ─── 김태린 선생님 담당 (해금) ──────────────────────────────────────
    { name:"전현우",     birthDate:"1965-12-05", phone:"010-2545-7251", guardianPhone:"",              teacherId:"t4",  lessons:[L("해금","t4",[])],                        notes:"", monthlyFee:0, status:"active",  startDate:"2024-09-01" },
    // ─── 채영훈 선생님 담당 (대금) ──────────────────────────────────────
    { name:"권양안",     birthDate:"1963-12-12", phone:"010-5201-0920", guardianPhone:"",              teacherId:"t5",  lessons:[L("대금 · 소금 · 단소","t5",[["화","18:00"]])], notes:"시나위팀", monthlyFee:0, status:"active",  startDate:"2024-09-01" },
    { name:"이해기",     birthDate:"1967-11-08", phone:"010-4942-0498", guardianPhone:"",              teacherId:"t5",  lessons:[L("대금 · 소금 · 단소","t5",[["화","18:00"]])], notes:"시나위팀", monthlyFee:0, status:"active",  startDate:"2024-09-01" },
    { name:"전근호",     birthDate:"1958-09-26", phone:"010-4584-0389", guardianPhone:"",              teacherId:"t5",  lessons:[L("대금 · 소금 · 단소","t5",[["화","18:00"]])], notes:"시나위팀", monthlyFee:0, status:"active",  startDate:"2024-09-01" },
    { name:"김순옥(아징)",birthDate:"1955-03-10", phone:"010-6804-0888", guardianPhone:"",             teacherId:"t5",  lessons:[L("대금 · 소금 · 단소","t5",[["화","18:00"]])], notes:"시나위팀/문화강좌/2025.9.2 등록", monthlyFee:0, status:"active",  startDate:"2025-09-02" },
    { name:"문준기",     birthDate:"1982-06-13", phone:"010-4155-3755", guardianPhone:"",              teacherId:"t5",  lessons:[L("대금 · 소금 · 단소","t5",[["화","18:30"]])], notes:"가요팀", monthlyFee:0, status:"active",  startDate:"2024-09-01" },
    { name:"모상도",     birthDate:"1972-09-12", phone:"010-8474-0006", guardianPhone:"",              teacherId:"t5",  lessons:[L("대금 · 소금 · 단소","t5",[["화","19:30"]])], notes:"대금초급반", monthlyFee:0, status:"active",  startDate:"2024-09-01" },
    { name:"김민서",     birthDate:"",           phone:"010-8020-2511", guardianPhone:"010-9876-8860", teacherId:"t5",  lessons:[L("대금 · 소금 · 단소","t5",[["토","11:00"]])], notes:"고1/비상연락망(어머니)010-9876-8860", monthlyFee:0, status:"active",  startDate:"2024-09-01" },
    { name:"변혜라",     birthDate:"1974-02-25", phone:"010-5536-6214", guardianPhone:"",              teacherId:"t5",  lessons:[L("대금 · 소금 · 단소","t5",[["목","19:00"]])], notes:"문화강좌/지인소개(이경원님)/2025.9.16 등록", monthlyFee:0, status:"active",  startDate:"2025-09-16" },
    { name:"손지혜",     birthDate:"1991-04-01", phone:"010-6856-8382", guardianPhone:"",              teacherId:"t5",  lessons:[L("대금 · 소금 · 단소","t5",[["목","19:00"]])], notes:"문화강좌/지인소개(변혜라님)/2025.9.23 등록", monthlyFee:0, status:"active",  startDate:"2025-09-23" },
    // ─── 이소영 선생님 담당 (대금) ──────────────────────────────────────
    { name:"김성호(금송)",birthDate:"1956-07-25", phone:"010-3581-7111", guardianPhone:"",             teacherId:"t6",  lessons:[L("대금 · 소금 · 단소","t6",[["월","11:00"]])], notes:"개인/2018.11월 등록", monthlyFee:0, status:"active",  startDate:"2018-11-01" },
    { name:"조보흠(백탄)",birthDate:"1963-02-16", phone:"010-2615-3315", guardianPhone:"",             teacherId:"t6",  lessons:[L("대금 · 소금 · 단소","t6",[["월","12:00"]])], notes:"개인/2016.9월 등록", monthlyFee:0, status:"active",  startDate:"2016-09-01" },
    { name:"이경진",     birthDate:"",           phone:"010-9325-2940", guardianPhone:"",              teacherId:"t6",  lessons:[L("대금 · 소금 · 단소","t6",[["화","11:00"]])], notes:"단체(초급)", monthlyFee:0, status:"active",  startDate:"2024-09-01" },
    { name:"이종언",     birthDate:"",           phone:"010-3861-4459", guardianPhone:"",              teacherId:"t6",  lessons:[L("대금 · 소금 · 단소","t6",[["화","11:00"]])], notes:"단체(초급)", monthlyFee:0, status:"active",  startDate:"2024-09-01" },
    { name:"이남희",     birthDate:"1970-10-30", phone:"010-5074-1030", guardianPhone:"",              teacherId:"t6",  lessons:[L("대금 · 소금 · 단소","t6",[["화","11:30"]])], notes:"단체(가요)", monthlyFee:0, status:"active",  startDate:"2024-09-01" },
    { name:"박병재(이음)",birthDate:"",           phone:"",              guardianPhone:"",              teacherId:"t6",  lessons:[L("대금 · 소금 · 단소","t6",[["화","11:30"]])], notes:"단체(시나위)", monthlyFee:0, status:"active",  startDate:"2024-09-01" },
    // ─── 김보현 선생님 담당 (가야금) ────────────────────────────────────
    { name:"박정은",     birthDate:"1996-09-04", phone:"010-8982-7786", guardianPhone:"",              teacherId:"t9",  lessons:[L("가야금","t9",[])],                      notes:"", monthlyFee:0, status:"active",  startDate:"2024-09-01" },
    { name:"이윤정",     birthDate:"1993-05-19", phone:"010-5538-5105", guardianPhone:"",              teacherId:"t9",  lessons:[L("가야금","t9",[])],                      notes:"1회25분 레슨", monthlyFee:0, status:"active",  startDate:"2024-09-01" },
    { name:"서재원",     birthDate:"2014-02-12", phone:"",              guardianPhone:"010-9811-5285", teacherId:"t9",  lessons:[L("가야금","t9",[])],                      notes:"단체레슨", monthlyFee:0, status:"active",  startDate:"2024-09-01" },
    { name:"서유진",     birthDate:"1997-10-28", phone:"010-2957-3172", guardianPhone:"",              teacherId:"t9",  lessons:[L("가야금","t9",[])],                      notes:"단체레슨", monthlyFee:0, status:"active",  startDate:"2024-09-01" },
    { name:"윤은주",     birthDate:"",           phone:"010-8855-7742", guardianPhone:"",              teacherId:"t9",  lessons:[L("가야금","t9",[["월","16:30"]])],          notes:"단체레슨/취미·공연참여/2025.11.24 등록", monthlyFee:0, status:"active",  startDate:"2025-11-24" },
    // ─── 유선화 선생님 담당 (가야금/타악) ───────────────────────────────
    { name:"임주하",     birthDate:"2015-02-26", phone:"",              guardianPhone:"010-4300-0591", teacherId:"t10", lessons:[L("가야금","t10",[["토","11:00"]])],         notes:"초등반/2026.1.3 등록", monthlyFee:0, status:"active",  startDate:"2026-01-03" },
    { name:"김리아",     birthDate:"2018-09-13", phone:"",              guardianPhone:"010-2855-4130", teacherId:"t10", lessons:[L("가야금","t10",[["토","11:00"]])],         notes:"초등반/2026.1.3 등록", monthlyFee:0, status:"active",  startDate:"2026-01-03" },
    { name:"신유하",     birthDate:"2017-05-04", phone:"",              guardianPhone:"010-7373-1609", teacherId:"t10", lessons:[L("가야금","t10",[["토","11:00"]])],         notes:"초등반/2026.1.3 등록", monthlyFee:0, status:"active",  startDate:"2026-01-03" },
    { name:"천소윤",     birthDate:"2018-12-08", phone:"",              guardianPhone:"010-6558-0135", teacherId:"t10", lessons:[L("가야금","t10",[["토","11:00"]])],         notes:"초등반/2026.1.3 등록", monthlyFee:0, status:"active",  startDate:"2026-01-03" },
    { name:"우혜경",     birthDate:"2008-06-07", phone:"",              guardianPhone:"010-2898-0784", teacherId:"t10", lessons:[L("가야금","t10",[["목","16:30"]])],         notes:"그룹/초급/2026.3.26 등록", monthlyFee:0, status:"active",  startDate:"2026-03-26" },
    { name:"이민영(학생)",birthDate:"2008-08-19", phone:"",              guardianPhone:"010-5149-6808", teacherId:"t10", lessons:[L("가야금","t10",[["목","16:30"]])],        notes:"그룹/초급/2026.3.26 등록", monthlyFee:0, status:"active",  startDate:"2026-03-26" },
    { name:"백시온",     birthDate:"2021-08-19", phone:"",              guardianPhone:"010-4131-0412", teacherId:"t10", lessons:[L("장구 · 북 · 꽹과리 · 징","t10",[["토","10:00"]])], notes:"유아국악(사물놀이)/2026.1.3 등록", monthlyFee:0, status:"active",  startDate:"2026-01-03" },
    { name:"남보배",     birthDate:"2020-07-15", phone:"",              guardianPhone:"010-9339-0037", teacherId:"t10", lessons:[L("장구 · 북 · 꽹과리 · 징","t10",[["토","10:00"]])], notes:"유아국악/2026.1.3 등록", monthlyFee:0, status:"active",  startDate:"2026-01-03" },
    { name:"태겸",       birthDate:"",           phone:"",              guardianPhone:"010-7242-4737", teacherId:"t10", lessons:[L("장구 · 북 · 꽹과리 · 징","t10",[["토","10:00"]])], notes:"유아국악/2026.1.3 등록", monthlyFee:0, status:"active",  startDate:"2026-01-03" },
    { name:"김지안",     birthDate:"2017-06-27", phone:"",              guardianPhone:"010-7174-2596", teacherId:"t10", lessons:[L("장구 · 북 · 꽹과리 · 징","t10",[["토","12:30"]])], notes:"타악(장구)/2026.1.3 등록", monthlyFee:0, status:"active",  startDate:"2026-01-03" },
    // ─── 임승빈 선생님 담당 (타악/유아) ─────────────────────────────────
    { name:"김아인",     birthDate:"",           phone:"010-7455-8100", guardianPhone:"",              teacherId:"t14", lessons:[L("장구 · 북 · 꽹과리 · 징","t14",[["토","11:00"]])], notes:"그룹/유아초등반/2026.1.10 등록", monthlyFee:0, status:"active",  startDate:"2026-01-10" },
    // ─── 김동영 선생님 담당 (성악) ──────────────────────────────────────
    { name:"김정현",     birthDate:"",           phone:"010-3242-0139", guardianPhone:"",              teacherId:"t11", lessons:[L("정가","t11",[["화","19:00"]])],          notes:"서울에서 정가레슨/2024.10월 등록", monthlyFee:0, status:"active",  startDate:"2024-10-01" },
    { name:"황재현",     birthDate:"",           phone:"010-8266-5289", guardianPhone:"",              teacherId:"t11", lessons:[L("판소리","t11",[["목","13:00"]])],         notes:"임용/2025.7월 등록", monthlyFee:0, status:"active",  startDate:"2025-07-01" },
    { name:"최남백",     birthDate:"1966-08-18", phone:"010-7655-3815", guardianPhone:"",              teacherId:"t11", lessons:[L("판소리","t11",[["목","14:00"]])],         notes:"국악가요/2023년 등록", monthlyFee:0, status:"active",  startDate:"2023-01-01" },
    { name:"서유정",     birthDate:"2003-06-27", phone:"010-4078-8960", guardianPhone:"",              teacherId:"t11", lessons:[L("판소리","t11",[["목","12:00"]])],         notes:"임용 1:1/진해구/2026.3.26 등록", monthlyFee:0, status:"active",  startDate:"2026-03-26" },
    // ─── 하태우 선생님 담당 (성악/판소리) ───────────────────────────────
    { name:"황윤슬",     birthDate:"2017-12-25", phone:"",              guardianPhone:"010-9972-1020", teacherId:"t12", lessons:[L("판소리","t12",[["화","17:30"]])],         notes:"개인 1:1/2026.3.24 등록", monthlyFee:0, status:"active",  startDate:"2026-03-24" },
  ];

  // 강사 비밀번호 자동 설정 (연락처 뒷4자리, 없으면 0000) + v12 마이그레이션 마킹
  seedTeachers.forEach(t => {
    if (t.password === "AUTO") t.password = getPhoneInitialPassword(t.phone);
    t.pwResetV12 = true;
  });

  // ID·studentCode 자동 부여
  seedStudents.forEach((s, i) => {
    s.id = "s" + (i + 1);
    s.studentCode = mkCode();
    s.photo = "";
    s.createdAt = now;
  });

  return {
    seedTeachers,
    seedStudents,
    seedAttendance: [],
    seedPayments:   [],
    seedNotices:    [],
    seedActivity:   [{ id: uid(), userId: "admin", userName: "관리자", action: "실제 운영 데이터로 초기화 완료", timestamp: now }],
  };
}


// ── NOTICE COMPONENTS → src/components/notice/NoticeManagement.jsx ──────────────

// ── ANALYTICS VIEW → src/components/analytics/AnalyticsView.jsx ────────────────


// ── ROOT APP ──────────────────────────────────────────────────────────────────
export default function App() {
  // pathname 라우팅 (iOS Safari PWA 호환)
  // hash 라우팅도 백워드 호환으로 유지 (옛 #myryk 링크 지원)
  const path = window.location.pathname || "/";
  const hash = window.location.hash || "";
  // Public registration form — no login needed
  if (path.startsWith("/register") || hash.startsWith("#register")) {
    return <PublicRegisterForm />;
  }
  // Parent portal — login-based
  if (path.startsWith("/myryk") || hash.startsWith("#myryk") || hash.startsWith("#parent")) {
    return <PublicParentView />;
  }

  return <MainApp />;
}

function MainApp() {
  const [user, setUser] = useState(() => {
    try {
      const s = localStorage.getItem("rye-session");
      if (!s) return null;
      const u = JSON.parse(s);
      // 구 세션에 role 필드 누락 시 admin 계정은 항상 role:"admin" 보정
      if (u?.id === ADMIN.id || u?.username === ADMIN.username) return { ...u, role: "admin" };
      return u;
    } catch { return null; }
  });
  const setUserPersist = (u) => {
    setUser(u);
    if (u) localStorage.setItem("rye-session", JSON.stringify(u));
    else localStorage.removeItem("rye-session");
  };
  const [view, setView] = useState("dashboard");
  const [teachers, setTeachers] = useState([]);
  const [students, setStudents] = useState([]);
  const [notices, setNotices] = useState([]);
  const [categories, setCategories] = useState(DEFAULT_CATEGORIES);
  const [attendance, setAttendance] = useState([]);
  const [payments, setPayments] = useState([]);
  const [activity, setActivity] = useState([]);
  const [pending, setPending] = useState([]);
  const [feePresets, setFeePresets] = useState({});
  const [scheduleOverrides, setScheduleOverrides] = useState([]);
  const [trash, setTrash] = useState([]);
  const [studentNotices, setStudentNotices] = useState([]);
  const [institutions, setInstitutions] = useState([]);
  const [aiReports, setAiReports] = useState([]);
  const [ryeSettings, setRyeSettings] = useState({ aiEnabled: true, aiSafeMode: false });
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(null);
  const [modal, setModal] = useState(null);
  const [selected, setSelected] = useState(null);
  const [filter, setFilter] = useState("전체");
  const [search, setSearch] = useState("");
  const [toast, setToast] = useState(null);
  const [backupConfirm, setBackupConfirm] = useState(false);
  // Dark mode: null=system, 'dark'=forced dark, 'light'=forced light
  const [darkMode, setDarkMode] = useState(() => {
    try { return localStorage.getItem("rye-theme") || null; } catch { return null; }
  });
  // 레슨노트 읽음 타임스탬프 — 이 시각 이후에 달린 학생 댓글만 미읽음으로 카운트
  const [lastNotesReadAt, setLastNotesReadAt] = useState(0);
  const [textLarge, setTextLarge] = useState(() => {
    try { return localStorage.getItem("rye-text-large") === "1"; } catch { return false; }
  });

  // ── 30일 재인증 체크 (admin/manager) — 마운트 시 1회 실행
  useEffect(() => {
    if (!user || !canManageAll(user.role)) return;
    try {
      const lastLogin = parseInt(localStorage.getItem("ryek_last_login") || "0");
      const thirtyDays = 30 * 24 * 60 * 60 * 1000;
      if (!lastLogin || Date.now() - lastLogin > thirtyDays) {
        (async () => {
          await firebaseLogout();
          setUserPersist(null);
          localStorage.removeItem("ryek_last_login");
        })();
      }
    } catch {}
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    const root = document.documentElement;
    if (darkMode === "dark") { root.setAttribute("data-theme", "dark"); localStorage.setItem("rye-theme", "dark"); }
    else if (darkMode === "light") { root.setAttribute("data-theme", "light"); localStorage.setItem("rye-theme", "light"); }
    else { root.removeAttribute("data-theme"); localStorage.removeItem("rye-theme"); }
  }, [darkMode]);

  // 레슨노트 읽음 시각 — 로그인한 사용자별 localStorage 복원
  useEffect(() => {
    if (!user) return;
    try {
      const saved = parseInt(localStorage.getItem(`ryekAdmin_lnr_${user.id}`) || "0");
      setLastNotesReadAt(saved);
    } catch {}
  }, [user?.id]);

  // ── v12 마이그레이션: 강사 비밀번호를 핸드폰 뒷4자리(없으면 0000)로 일괄 리셋 ──
  // 한 번만 실행 (localStorage 플래그). admin/manager 로그인 시에만 동작.
  useEffect(() => {
    if (!user || !canManageAll(user.role)) return;
    if (loading || teachers.length === 0) return;
    try {
      if (localStorage.getItem("ryekPwResetV12Done") === "1") return;
    } catch {}
    const needsReset = teachers.some(t => !t.pwResetV12);
    if (!needsReset) {
      try { localStorage.setItem("ryekPwResetV12Done", "1"); } catch {}
      return;
    }
    (async () => {
      const updated = teachers.map(t => ({
        ...t,
        password: getPhoneInitialPassword(t.phone),
        pwResetV12: true,
      }));
      await sSet("rye-teachers", updated);
      setTeachers(updated);
      try { localStorage.setItem("ryekPwResetV12Done", "1"); } catch {}
      addLog(`v12 마이그레이션: 강사 ${updated.length}명 비밀번호를 연락처 뒷4자리로 리셋`);
      showToast(`v12 마이그레이션 완료 — 강사 ${updated.length}명 비밀번호 리셋`);
    })();
  }, [user?.id, loading, teachers.length]);

  // ── Initial load + real-time sync from Firestore (onSnapshot only) ──
  useEffect(() => {
    const unsubscribes = [];
    const received = {};
    let seeded = false;
    let resolved = false;

    const KEYS = [
      { key: "rye-teachers", setter: setTeachers, default: [] },
      { key: "rye-students", setter: setStudents, default: [] },
      { key: "rye-notices", setter: setNotices, default: [] },
      { key: "rye-categories", setter: setCategories, default: DEFAULT_CATEGORIES },
      { key: "rye-attendance", setter: setAttendance, default: [] },
      { key: "rye-payments", setter: setPayments, default: [] },
      { key: "rye-activity", setter: setActivity, default: [] },
      { key: "rye-pending", setter: setPending, default: [] },
      { key: "rye-fee-presets", setter: setFeePresets, default: {} },
      { key: "rye-schedule-overrides", setter: setScheduleOverrides, default: [] },
      { key: "rye-trash", setter: setTrash, default: [] },
      { key: "rye-student-notices", setter: setStudentNotices, default: [] },
      { key: "rye-institutions", setter: setInstitutions, default: [] },
      { key: "rye-ai-reports", setter: setAiReports, default: [] },
      { key: "rye-settings", setter: setRyeSettings, default: { aiEnabled: true, aiSafeMode: false } },
    ];

    const checkAllLoaded = async () => {
      if (Object.keys(received).length < KEYS.length) return;
      if (!seeded && (!received["rye-teachers"] || received["rye-teachers"].length === 0)) {
        seeded = true;
        const seed = generateSeedData();
        await Promise.all([
          sSet("rye-teachers", seed.seedTeachers),
          sSet("rye-students", seed.seedStudents),
          sSet("rye-notices", seed.seedNotices),
          sSet("rye-attendance", seed.seedAttendance),
          sSet("rye-payments", seed.seedPayments),
          sSet("rye-activity", seed.seedActivity),
        ]);
      }
      if (!seeded && received["rye-students"] && received["rye-students"].length > 0) {
        const studentsArr = received["rye-students"];
        const needsMigration = studentsArr.some(s => !s.studentCode);
        if (needsMigration) {
          const existingCodes = new Set(studentsArr.filter(s => s.studentCode).map(s => s.studentCode));
          const migrated = studentsArr.map(s => {
            if (s.studentCode) return s;
            let code;
            do { code = generateStudentCode(); } while (existingCodes.has(code));
            existingCodes.add(code);
            return { ...s, studentCode: code };
          });
          await sSet("rye-students", migrated);

        }
      }
      // 1회 데이터 복구 — 백업 77명과 현재 Firestore 병합 (현재 데이터 우선)
      if (!seeded && !localStorage.getItem("rye-recovery-v1")) {
        const curStudents = received["rye-students"] || [];
        const seedStudents = generateSeedData().seedStudents;
        const currentById = Object.fromEntries(curStudents.map(s => [s.id, s]));
        const merged = seedStudents.map(ss => currentById[ss.id] || ss);
        const seedIds = new Set(seedStudents.map(s => s.id));
        const extras = curStudents.filter(s => !seedIds.has(s.id));
        const final = [...merged, ...extras];
        await sSet("rye-students", final);
        localStorage.setItem("rye-recovery-v1", "1");

      }
      resolved = true;
      setLoading(false);
    };

    const setupListeners = () => {
      KEYS.forEach(({ key, setter, default: def }) => {
        const unsub = onSnapshot(doc(db, COLLECTION, key), (snap) => {
          const val = snap.exists() ? snap.data().value : def;
          setter(val ?? def);

          if (!(key in received)) {
            received[key] = val;
            checkAllLoaded();
          }
        }, (err) => {
          console.error("Firestore listener error:", key, err);
          setter(def);
          if (!(key in received)) {
            received[key] = null;
            checkAllLoaded();
          }
          setLoadError(err.message);
        });
        unsubscribes.push(unsub);
      });
    };

    // ★ 핵심: 익명 인증 먼저 → 그 후 Firestore 리스너 시작
    firebaseSignInAnon().then(() => {
      setupListeners();
    }).catch(() => {
      // Auth 실패해도 리스너는 시도 (기존 호환)
      setupListeners();
    });

    const timeout = setTimeout(() => {
      if (!resolved) {
        setLoadError("Firebase 연결 시간이 초과되었습니다. 네트워크를 확인해주세요.");
        setLoading(false);
      }
    }, 12000);

    return () => {
      clearTimeout(timeout);
      unsubscribes.forEach(unsub => unsub());
    };
  }, []);

  const showToast = (msg, isError = false) => { setToast({msg, isError}); setTimeout(() => setToast(null), 2400); };
  const saveTeachers = async u => { setTeachers(u); try { await sSet("rye-teachers", u); } catch { showToast("저장에 실패했습니다. 네트워크를 확인해주세요.", true); } };
  // 배열 전체 덮어쓰기 금지 — 아래 per-op 함수만 사용
  const saveStudents = () => { throw new Error("saveStudents 직접 호출 금지 — addStudentDoc/updateStudentDoc/deleteStudentDoc/batchStudentDocs 사용"); };
  const _studentsRef = doc(db, COLLECTION, "rye-students");
  const addStudentDoc = async (student) => {
    await runTransaction(db, async (tx) => {
      const snap = await tx.get(_studentsRef);
      const cur = snap.exists() ? (snap.data().value || []) : [];
      tx.set(_studentsRef, { value: [...cur, student], updatedAt: Date.now() });
    });
    setStudents(prev => [...prev, student]);
  };
  const updateStudentDoc = async (student) => {
    if (!student?.id) throw new Error("updateStudentDoc: id 없음");
    await runTransaction(db, async (tx) => {
      const snap = await tx.get(_studentsRef);
      const cur = snap.exists() ? (snap.data().value || []) : [];
      tx.set(_studentsRef, { value: cur.map(s => s.id === student.id ? student : s), updatedAt: Date.now() });
    });
    setStudents(prev => prev.map(s => s.id === student.id ? student : s));
  };
  const deleteStudentDoc = async (studentId) => {
    if (!studentId) throw new Error("deleteStudentDoc: id 없음");
    await runTransaction(db, async (tx) => {
      const snap = await tx.get(_studentsRef);
      const cur = snap.exists() ? (snap.data().value || []) : [];
      tx.set(_studentsRef, { value: cur.filter(s => s.id !== studentId), updatedAt: Date.now() });
    });
    setStudents(prev => prev.filter(s => s.id !== studentId));
  };
  const batchStudentDocs = async (updates) => {
    if (!updates || !updates.length) return;
    await runTransaction(db, async (tx) => {
      const snap = await tx.get(_studentsRef);
      const cur = snap.exists() ? (snap.data().value || []) : [];
      const updMap = Object.fromEntries(updates.map(u => [u.id, u]));
      tx.set(_studentsRef, { value: cur.map(s => updMap[s.id] || s), updatedAt: Date.now() });
    });
    setStudents(prev => {
      const updMap = Object.fromEntries(updates.map(u => [u.id, u]));
      return prev.map(s => updMap[s.id] || s);
    });
  };
  const saveNotices = async u => { setNotices(u); try { await sSet("rye-notices", u); } catch { showToast("저장에 실패했습니다. 네트워크를 확인해주세요.", true); } };
  const saveCategories = async u => { setCategories(u); try { await sSet("rye-categories", u); } catch { showToast("저장에 실패했습니다. 네트워크를 확인해주세요.", true); } };
  const saveAttendance = async u => { setAttendance(u); try { await sSet("rye-attendance", u); } catch { showToast("저장에 실패했습니다. 네트워크를 확인해주세요.", true); } };
  const savePayments = async u => { setPayments(u); try { await sSet("rye-payments", u); } catch (e) { showToast("저장에 실패했습니다. 네트워크를 확인해주세요.", true); throw e; } };
  const saveScheduleOverrides = async u => { setScheduleOverrides(u); try { await sSet("rye-schedule-overrides", u); } catch { showToast("저장에 실패했습니다. 네트워크를 확인해주세요.", true); } };
  const saveTrash = async u => { setTrash(u); try { await sSet("rye-trash", u); } catch (e) { showToast("저장에 실패했습니다. 네트워크를 확인해주세요.", true); throw e; } };
  const saveStudentNotices = async u => { setStudentNotices(u); try { await sSet("rye-student-notices", u); } catch { showToast("저장에 실패했습니다. 네트워크를 확인해주세요.", true); } };
  const saveInstitutions = async u => { setInstitutions(u); try { await sSet("rye-institutions", u); } catch { showToast("저장에 실패했습니다. 네트워크를 확인해주세요.", true); } };
  const saveAiReports = async u => { setAiReports(u); try { await sSet("rye-ai-reports", u); } catch { showToast("저장에 실패했습니다. 네트워크를 확인해주세요.", true); } };
  const saveRyeSettings = async u => { setRyeSettings(u); try { await sSet("rye-settings", u); showToast("AI 설정이 저장되었습니다."); } catch { showToast("저장에 실패했습니다. 네트워크를 확인해주세요.", true); } };

  // Sync AI enabled flag to module-level singleton (aiClient.js)
  useEffect(() => { setAiEnabled(ryeSettings?.aiEnabled !== false); }, [ryeSettings]);

  // Auto-purge trash after 7 days
  useEffect(() => {
    if (trash.length === 0) return;
    const now = Date.now();
    const sevenDays = 7 * 24 * 60 * 60 * 1000;
    const filtered = trash.filter(t => (now - (t.deletedAt || 0)) < sevenDays);
    if (filtered.length < trash.length) saveTrash(filtered).catch(() => {});
  }, [trash]);

  // Monthly payment record auto-seed: 매월 초 활성 회원 수납 레코드 자동 생성
  // runTransaction으로 Firestore 직접 읽어 중복 방지 (다중 기기 동시 로그인 안전)
  useEffect(() => {
    if (!user || !canManageAll(user.role)) return;
    if (students.length === 0) return;
    const seedKey = "ryek_payment_seed_v2";
    if (localStorage.getItem(seedKey) === THIS_MONTH) return;
    localStorage.setItem(seedKey, THIS_MONTH); // 동일 세션 재실행 방지 (정확성은 트랜잭션이 보장)

    const activeStudents = students.filter(s => (s.status || "active") === "active");
    const activeInstMembers = expandInstitutionsToMembers(institutions).filter(m => (m.status || "active") === "active");
    const allActive = [...activeStudents, ...activeInstMembers];
    if (allActive.length === 0) return;

    const _paymentsRef = doc(db, "appData", "rye-payments");
    runTransaction(db, async (tx) => {
      const snap = await tx.get(_paymentsRef);
      const cur = snap.exists() ? (snap.data().value || []) : [];
      const newRecords = allActive
        .filter(s => !cur.some(p => p.studentId === s.id && p.month === THIS_MONTH))
        .map(s => ({ id: uid(), studentId: s.id, month: THIS_MONTH, amount: (s.monthlyFee || 0) + (s.instrumentRental ? (s.rentalFee || 0) : 0), paid: false, createdAt: Date.now() }));
      if (newRecords.length === 0) return;
      tx.set(_paymentsRef, { value: [...cur, ...newRecords], updatedAt: Date.now() });
    }).catch(() => {});
  }, [user?.id, students.length, institutions.length]); // payments.length 제거 — seed 후 재트리거 방지

  // 1회 마이그레이션: 악기대여료 누락된 미납 레코드 자동 보정
  useEffect(() => {
    if (!user || !canManageAll(user.role)) return;
    if (students.length === 0 || payments.length === 0) return;
    const migKey = "ryek_rental_migration_v1";
    if (localStorage.getItem(migKey)) return;

    const toFix = payments.filter(p => {
      if (p.paid) return false;
      const s = students.find(st => st.id === p.studentId);
      if (!s || !s.instrumentRental || !(s.rentalFee > 0)) return false;
      return (p.amount || 0) === (s.monthlyFee || 0);
    });

    if (toFix.length === 0) { localStorage.setItem(migKey, "done"); return; }

    const updated = payments.map(p => {
      if (!toFix.find(f => f.id === p.id)) return p;
      const s = students.find(st => st.id === p.studentId);
      return { ...p, amount: (s.monthlyFee || 0) + (s.rentalFee || 0), updatedAt: Date.now() };
    });

    savePayments(updated)
      .then(() => localStorage.setItem(migKey, "done"))
      .catch(() => {});
  }, [user?.id, students.length, payments.length]);

  const softDeleteStudent = async (student) => {
    const trashItem = { ...student, type: "student", deletedAt: Date.now(), deletedBy: user?.name };
    try { await saveTrash([...trash, trashItem]); } catch { return; }
    await deleteStudentDoc(student.id);
    addLog(`${student.name} 회원 삭제 (7일간 복원 가능)`);
  };

  const softDeleteTeacher = async (teacher) => {
    const trashItem = { ...teacher, type: "teacher", deletedAt: Date.now(), deletedBy: user?.name };
    try { await saveTrash([...trash, trashItem]); } catch { return; }
    await saveTeachers(teachers.filter(t => t.id !== teacher.id));
    addLog(`${teacher.name} 삭제 (7일간 복원 가능)`);
  };

  const restoreFromTrash = async (trashItem) => {
    const { type, deletedAt, deletedBy, ...original } = trashItem;
    let codeChangeMsg = null;
    if (type === "student") {
      if (!students.some(s => s.id === original.id)) {
        let restored = original;
        // studentCode 충돌 시 새 코드 발급 (DB 후방 호환 — 추가 필드만)
        if (original.studentCode && students.some(s => s.studentCode === original.studentCode)) {
          const used = new Set(students.map(s => s.studentCode).filter(Boolean));
          let code;
          do { code = generateStudentCode(); } while (used.has(code));
          restored = { ...original, studentCode: code, restoredCodeChanged: true };
          codeChangeMsg = `회원코드가 ${original.studentCode}→${code}로 변경되었습니다. 회원에게 안내해주세요.`;
          addLog(`${original.name} 복원 시 회원코드 충돌 — 새 코드 ${code} 발급`);
        }
        await addStudentDoc(restored);
      }
      addLog(`${original.name} 회원 복원`);
    } else if (type === "teacher") {
      if (!teachers.some(t => t.id === original.id)) {
        await saveTeachers([...teachers, original]);
      }
      addLog(`${original.name} 복원`);
    } else if (type === "institution") {
      if (!institutions.some(i => i.id === original.id)) {
        await saveInstitutions([...institutions, original]);
        // 복원된 기관의 이번 달 결제 시드가 없으면 재생성 (기존 결제 건드리지 않음)
        const virtuals = expandInstitutionsToMembers([original]).filter(m => (m.status || "active") === "active");
        if (virtuals.length > 0) {
          const _paymentsRef = doc(db, "appData", "rye-payments");
          runTransaction(db, async (tx) => {
            const snap = await tx.get(_paymentsRef);
            const cur = snap.exists() ? (snap.data().value || []) : [];
            const newRecords = virtuals
              .filter(m => !cur.some(p => p.studentId === m.id && p.month === THIS_MONTH))
              .map(m => ({ id: uid(), studentId: m.id, month: THIS_MONTH, amount: m.monthlyFee || 0, paid: false, createdAt: Date.now() }));
            if (newRecords.length === 0) return;
            tx.set(_paymentsRef, { value: [...cur, ...newRecords], updatedAt: Date.now() });
          }).catch(e => {
            console.error("기관 복원 시 결제 시드 실패:", e);
            addLog(`${original.name} 기관 복원 — 결제 시드 실패 (${e.code || e.message || "unknown"}). 수동 확인 필요.`);
          });
        }
      }
      addLog(`${original.name} 기관 복원`);
    }
    await saveTrash(trash.filter(t => !(t.id === trashItem.id && t.type === trashItem.type && t.deletedAt === trashItem.deletedAt)));
    showToast(codeChangeMsg ? `${original.name} 복원 — ${codeChangeMsg}` : `${original.name} 복원되었습니다.`);
  };

  const permanentDeleteFromTrash = async (trashItem) => {
    // 영구 삭제 전 고아 레코드(출석/수납) 카운트를 활동 로그에 기록
    const orphan = (() => {
      if (trashItem.type === "student") {
        return {
          att: attendance.filter(a => a.studentId === trashItem.id).length,
          pay: payments.filter(p => p.studentId === trashItem.id).length,
        };
      }
      if (trashItem.type === "institution") {
        const memberIds = (trashItem.classes || []).map(c => `inst_${trashItem.id}_${c.id}`);
        return {
          att: attendance.filter(a => memberIds.includes(a.studentId)).length,
          pay: payments.filter(p => memberIds.includes(p.studentId)).length,
        };
      }
      return null;
    })();
    if (orphan && (orphan.att > 0 || orphan.pay > 0)) {
      addLog(`${trashItem.name} 영구 삭제 — 출석 ${orphan.att}건 / 수납 ${orphan.pay}건 고아 잔존`);
    }
    await saveTrash(trash.filter(t => !(t.id === trashItem.id && t.type === trashItem.type && t.deletedAt === trashItem.deletedAt)));
    showToast("완전히 삭제되었습니다.");
  };

  const addLog = async (action) => {
    const log = { id: uid(), userId: user?.id, userName: user?.name || "?", action, timestamp: Date.now() };
    const upd = [log, ...activity].slice(0, 200);
    setActivity(upd);
    try { await sSet("rye-activity", upd); } catch {}
  };

  const requestFullBackup = () => setBackupConfirm(true);
  const handleFullBackup = () => {
    setBackupConfirm(false);
    try {
      const snapshot = {
        version: CURRENT_VERSION,
        exportedAt: new Date().toISOString(),
        "rye-teachers": teachers,
        "rye-students": students,
        "rye-attendance": attendance,
        "rye-payments": payments,
        "rye-notices": notices,
        "rye-categories": categories,
        "rye-fee-presets": feePresets,
        "rye-schedule-overrides": scheduleOverrides,
        "rye-activity": activity,
        "rye-pending": pending,
        "rye-trash": trash,
        "rye-student-notices": studentNotices,
        "rye-institutions": institutions,
      };
      const blob = new Blob([JSON.stringify(snapshot, null, 2)], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      const ts = new Date().toISOString().replace(/[:.]/g, "-");
      a.href = url;
      a.download = `rye-k-backup-${ts}.json`;
      a.click();
      URL.revokeObjectURL(url);
      addLog(`전체 데이터 백업 다운로드 (v${CURRENT_VERSION})`);
      showToast("백업 파일이 다운로드되었습니다.");
    } catch (e) {
      console.error("백업 실패:", e);
      showToast("백업 다운로드 실패. 콘솔을 확인하세요.");
    }
  };

  let resetSeed;
  if (import.meta.env.DEV) {
    resetSeed = async () => {
      const seed = generateSeedData();
      // ── 전체 Firestore 컬렉션 완전 초기화 ──────────────────────
      await Promise.all([
        sSet("rye-teachers",          seed.seedTeachers),
        sSet("rye-students",          seed.seedStudents),
        sSet("rye-notices",           seed.seedNotices),
        sSet("rye-attendance",        seed.seedAttendance),
        sSet("rye-payments",          seed.seedPayments),
        sSet("rye-activity",          seed.seedActivity),
        sSet("rye-pending",           []),
        sSet("rye-trash",             []),
        sSet("rye-schedule-overrides",[]),
        sSet("rye-student-notices",   []),
        sSet("rye-fee-presets",       {}),
        sSet("rye-institutions",      []),
      ]);
      setTeachers(seed.seedTeachers);
      setStudents(seed.seedStudents);
      setNotices(seed.seedNotices);
      setAttendance(seed.seedAttendance);
      setPayments(seed.seedPayments);
      setActivity(seed.seedActivity);
      setPending([]);
      setTrash([]);
      setScheduleOverrides([]);
      setStudentNotices([]);
      setFeePresets({});
      setInstitutions([]);
      showToast("DB 초기화 완료 — 실제 운영 데이터가 로드되었습니다.");
      setView("dashboard");
    };
  } else {
    resetSeed = () => { throw new Error("resetSeed은 개발 환경 전용입니다."); };
  }

  const approvePending = async (reg) => {
    // Convert pending registration to student with edited form data
    const newStudent = {
      id: uid(),
      name: reg.name,
      birthDate: reg.birthDate || "",
      startDate: reg.startDate || TODAY_STR,
      phone: reg.phone || "",
      guardianPhone: reg.guardianPhone || "",
      teacherId: reg.teacherId || "",
      lessons: reg.lessons || (reg.desiredInstruments || []).map(inst => ({ instrument: inst, schedule: [{ day: "", time: "" }] })),
      photo: reg.photo || "",
      notes: reg.notes || "",
      monthlyFee: reg.monthlyFee || 0,
      studentCode: reg.studentCode || generateStudentCode(),
      instrumentRental: reg.instrumentRental || false,
      // Preserve registration metadata
      registration: {
        experience: reg.experience || "",
        purpose: reg.purpose || "",
        referral: reg.referral || "",
        lessonType: reg.lessonType || "",
        consent: reg.consent || null,
        optionalConsent: reg.optionalConsent || false,
        registeredAt: reg.createdAt,
        approvedAt: Date.now(),
      },
      createdAt: Date.now(),
    };
    await addStudentDoc(newStudent);
    // Remove from pending
    const updPending = pending.filter(p => p.id !== reg.id);
    await sSet("rye-pending", updPending);
    setPending(updPending);
    addLog(`${reg.name} 회원 등록 승인`);
    showToast(`${reg.name} 회원이 등록되었습니다. (코드: ${newStudent.studentCode})`);
  };

  const rejectPending = async (regId) => {
    const reg = pending.find(p => p.id === regId);
    const updPending = pending.filter(p => p.id !== regId);
    await sSet("rye-pending", updPending);
    setPending(updPending);
    if (reg) addLog(`${reg.name} 등록 신청 반려`);
    showToast("등록 신청이 반려되었습니다.");
  };

  const login = async (username, password) => {
    // Step 1: Verify credentials against local data
    let appUser = null;
    if (username === ADMIN.username && password === ADMIN.password) {
      appUser = ADMIN;
    } else {
      if (!teachers.length) return "loading";
      const t = teachers.find(t => t.username === username && t.password === password);
      if (t) appUser = { ...t, role: t.role || "teacher" };
    }
    if (!appUser) return false;

    // Step 2: Sign in with Firebase Auth (creates account on first login)
    const fbUser = await firebaseSignIn(username, password);

    setUserPersist(appUser);
    return true;
  };

  const handleLogout = async () => {
    setUserPersist(null);
    await firebaseLogout();
    window.location.reload();
  };

  const isAdmin = canManageAll(user?.role) || user?.id === ADMIN.id;
  const visible = isAdmin ? students : students.filter(s =>
    s.teacherId === user?.id || (s.lessons || []).some(l => l.teacherId === user?.id)
  );
  const filtered = visible.filter(s => {
    const mc = filter === "전체" || (s.lessons || []).some(l => getCat(l.instrument, categories) === filter);
    const q = search.toLowerCase();
    return mc && (!q || s.name?.toLowerCase().includes(q) || allLessonInsts(s).join().toLowerCase().includes(q) || s.phone?.includes(q));
  });

  // ── v12.1: 기관 가상회원 — 기존 출석/수납/스케줄/레슨노트 컴포넌트가 그대로 처리 ──
  // 강사: 본인 담당인 수업만 가상회원으로 노출. admin/manager: 전체.
  const allInstMembers = expandInstitutionsToMembers(institutions);
  const visibleInstMembers = isAdmin
    ? allInstMembers
    : allInstMembers.filter(m => m.teacherId === user?.id || (m.lessons||[]).some(l => l.teacherId === user?.id));
  // 출석/수납/스케줄/레슨노트 뷰에 합쳐서 주입할 멤버 배열
  const allMembers = [...visible, ...visibleInstMembers];

  const monthPayments = payments.filter(p => p.month === THIS_MONTH);
  const unpaidCount = visible.filter(s => !monthPayments.find(p => p.studentId === s.id && p.paid)).length;

  // 새 댓글 배지: lastNotesReadAt 이후에 학생이 단 댓글만 미읽음으로 카운트
  const newCommentCount = (() => {
    if (!user) return 0;
    const myStudentIds = new Set(visible.map(s => s.id));
    return attendance.reduce((count, a) => {
      if (!myStudentIds.has(a.studentId)) return count;
      return count + (a.comments || []).filter(c => c.authorType === "student" && !c.deletedAt && c.createdAt > lastNotesReadAt).length;
    }, 0);
  })();

  const markNotesRead = () => {
    if (!user) return;
    const now = Date.now();
    setLastNotesReadAt(now);
    try { localStorage.setItem(`ryekAdmin_lnr_${user.id}`, String(now)); } catch {}
  };

  const navigate = (v) => {
    setView(v);
    setFilter("전체");
    setSearch("");
    if (v === "lessonNotes") markNotesRead();
  };

  if (loading) return (<><style>{CSS}</style><div className="loading-screen"><div className="loading-logo"><Logo size={56} /></div><div className="loading-text">RYE-K K-Culture Center</div></div></>);
  if (loadError) return (<><style>{CSS}</style><div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", height: "100vh", fontFamily: "'Noto Sans KR',sans-serif", padding: 20, textAlign: "center", gap: 12 }}><div style={{fontSize:16,fontWeight:600,color:"#E8281C"}}>연결 실패</div><div style={{fontSize:13,color:"#52525B",maxWidth:360,lineHeight:1.6}}>Firebase에 연결할 수 없습니다.<br/>src/firebase.js 설정값을 확인해주세요.</div><div style={{fontSize:11,color:"#A1A1AA",background:"#F4F4F5",padding:"8px 14px",borderRadius:8,maxWidth:360,wordBreak:"break-all"}}>{loadError}</div><button onClick={()=>window.location.reload()} style={{marginTop:8,padding:"10px 24px",background:"#2B3A9F",color:"#fff",border:"none",borderRadius:8,fontSize:13,cursor:"pointer"}}>다시 시도</button></div></>);
  if (!user) return <><style>{CSS}</style><LoginScreen onLogin={login} /></>;

  const pendingCount = isAdmin ? pending.length : 0;
  const topTitle = { dashboard: "RYE-K", students: "회원 관리", attendance: "출석 체크", payments: "수납 관리", teachers: "강사 관리", notices: "공지사항", categories: "과목 관리", analytics: "현황 분석", profile: "내 정보", more: "더보기", activity: "활동 기록", pending: "등록 대기", schedule: "강사 스케줄", trash: "휴지통", studentNotices: "수강생 공지", lessonNotes: "레슨노트", institutions: "기관 관리", systemNews: "시스템 소식", monthlyReports: "월간 리포트", aiSettings: "AI 설정" }[view] || "RYE-K";

  return (
    <>
      <style>{CSS}</style>
      {toast && <div className={`toast${toast.isError ? " toast-error" : ""}`}>{toast.isError ? "⚠" : "✓"} {toast.msg}</div>}
      <div className={`app-wrap${textLarge ? " text-large" : ""}`}>
        <Sidebar view={view} setView={navigate} user={user} onLogout={handleLogout} counts={{ students: visible.length, teachers: teachers.length }} pendingCount={pendingCount} darkMode={darkMode} setDarkMode={setDarkMode} newCommentCount={newCommentCount} textLarge={textLarge} setTextLarge={setTextLarge} />
        <div className="main-scroll">
          <div className="topbar">
            <Logo size={28} />
            <span className="topbar-title">{topTitle}</span>
            <button className={`btn-aa${textLarge ? " active" : ""}`} onClick={() => { const v = !textLarge; setTextLarge(v); localStorage.setItem("rye-text-large", v ? "1" : "0"); }} title="글씨 크기 조절">Aa</button>
          </div>
          <Suspense fallback={null}>
          <div className="main-content">
            {view === "dashboard" && <Dashboard students={visible} teachers={teachers} currentUser={user} notices={notices} categories={categories} attendance={attendance} payments={payments} pending={pending} institutions={institutions} nav={navigate} />}
            {view === "students" && <StudentsView students={filtered} allStudents={visible} teachers={teachers} categories={categories} filter={filter} setFilter={setFilter} search={search} setSearch={setSearch} onAdd={() => { setSelected(null); setModal("sForm"); }} onSelect={s => { setSelected(s); setModal("sDetail"); }} currentUser={user} onBulkFeeUpdate={async (updatedStudents) => { await batchStudentDocs(updatedStudents); addLog("수강료 일괄 설정"); showToast("수강료가 일괄 변경되었습니다."); }} payments={payments} />}
            {view === "attendance" && <AttendanceView students={allMembers} teachers={teachers} currentUser={user} attendance={attendance} onSaveAttendance={async (upd) => { await saveAttendance(upd); }} categories={categories} scheduleOverrides={scheduleOverrides} onSaveScheduleOverride={saveScheduleOverrides} onUpdateStudent={async (s) => { await updateStudentDoc(s); }} />}
            {view === "payments" && <PaymentsView students={allMembers} teachers={teachers} currentUser={user} payments={payments} attendance={attendance} onSavePayments={async (upd) => { await savePayments(upd); showToast("수납 정보가 저장되었습니다."); }} onSaveStudents={async (upd) => {
                // inst 가상회원 제외 후 트랜잭션으로 개별 업데이트
                const realUpd = upd.filter(s => !s.isInstitution);
                await batchStudentDocs(realUpd);
              }} onLog={addLog} />}
            {view === "teachers" && canManageAll(user.role) && <TeachersView teachers={teachers} students={students} onAdd={() => { setSelected(null); setModal("tForm"); }} onSelect={t => { setSelected(t); setModal("tDetail"); }} attendance={attendance} />}
            {view === "institutions" && <InstitutionsView institutions={institutions} teachers={teachers} currentUser={user} onAdd={() => { setSelected(null); setModal("instForm"); }} onSelect={i => { setSelected(i); setModal("instDetail"); }} />}
            {view === "notices" && <NoticesView notices={notices} currentUser={user} onAdd={() => { setSelected(null); setModal("nForm"); }} onEdit={n => { setSelected(n); setModal("nForm"); }} onDelete={async id => { const upd = notices.filter(n => n.id !== id); await saveNotices(upd); addLog("공지 삭제"); showToast("공지가 삭제되었습니다."); }} />}
            {view === "categories" && user.role === "admin" && <CategoriesView categories={categories} onSave={async c => { await saveCategories(c); addLog("과목 카테고리 수정"); showToast("저장되었습니다."); }} feePresets={feePresets} onSaveFees={async f => { setFeePresets(f); try { await sSet("rye-fee-presets", f); showToast("저장되었습니다."); } catch { showToast("저장에 실패했습니다. 네트워크를 확인해주세요.", true); } }} />}
            {view === "analytics" && user.role === "admin" && <AnalyticsView students={students} teachers={teachers} attendance={attendance} payments={payments} categories={categories} institutions={institutions} />}
            {view === "profile" && <ProfileView currentUser={user} teachers={teachers} students={visible} categories={categories} onProfileSave={async form => { const upd = teachers.map(t => t.id === user.id ? { ...t, ...form } : t); await saveTeachers(upd); setUserPersist({ ...user, name: form.name || user.name }); addLog("프로필 수정"); showToast("프로필이 수정되었습니다."); }} />}
            {view === "activity" && canManageAll(user.role) && <ActivityView activity={activity} onFullBackup={requestFullBackup} />}
            {view === "pending" && canManageAll(user.role) && <PendingView pending={pending} teachers={teachers} categories={categories} onApprove={approvePending} onReject={rejectPending} />}
            {view === "schedule" && <ScheduleView students={allMembers} teachers={teachers} currentUser={user} attendance={attendance} onSaveAttendance={async(upd)=>{await saveAttendance(upd);}} onSaveScheduleOverride={saveScheduleOverrides} scheduleOverrides={scheduleOverrides} notices={notices} />}
            {view === "trash" && canManageAll(user.role) && <TrashView trash={trash} onRestore={restoreFromTrash} onPermanentDelete={permanentDeleteFromTrash} />}
            {view === "studentNotices" && (canManageAll(user.role) || user.role === "teacher") && <StudentNoticeManager notices={studentNotices} students={allMembers} teachers={teachers} currentUser={user} onSave={async (upd) => { await saveStudentNotices(upd); showToast("수강생 공지가 저장되었습니다."); }} />}
            {view === "lessonNotes" && <LessonNotesView students={allMembers} teachers={teachers} currentUser={user} attendance={attendance} onSaveAttendance={async (upd) => { await saveAttendance(upd); }} onUpdateStudent={async (s) => { await updateStudentDoc(s); }} />}
            {view === "systemNews" && <SystemNewsView user={user} navigate={navigate} />}
            {view === "monthlyReports" && (canManageAll(user.role) || user.role === "teacher") && <MonthlyReportsView students={students} teachers={teachers} attendance={attendance} currentUser={user} aiReports={aiReports} onSaveAiReports={saveAiReports} />}
            {view === "aiSettings" && user.role === "admin" && <AiSettingsView settings={ryeSettings} onSave={saveRyeSettings} />}
            {view === "more" && <MoreMenu user={user} setView={navigate} onLogout={handleLogout} onResetSeed={resetSeed} counts={{ teachers: teachers.length }} pendingCount={pendingCount} darkMode={darkMode} setDarkMode={setDarkMode} trash={trash} newCommentCount={newCommentCount} />}
          </div>
          </Suspense>
        </div>
        <BottomNav view={view} setView={navigate} unpaidCount={unpaidCount} pendingCount={pendingCount} newCommentCount={newCommentCount} />
      </div>

      <UpdatePopup user={user} />
      {canManageAll(user.role) && (
        <AiAssistant students={students} attendance={attendance} payments={payments} teachers={teachers} />
      )}

      {modal === "sForm" && <StudentFormModal student={selected} teachers={teachers} currentUser={user} categories={categories} feePresets={feePresets} onClose={() => setModal(null)} onSave={async data => {
        const isNew = !data.id;
        if (isNew && !canManageAll(user.role)) {
          // Teacher: send to pending for manager/admin approval
          const pendingReg = { ...data, id: uid(), desiredInstruments: (data.lessons||[]).map(l=>l.instrument), submittedBy: user.name, submittedById: user.id, createdAt: Date.now() };
          const updPending = [...pending, pendingReg];
          await sSet("rye-pending", updPending); setPending(updPending);
          addLog(`${data.name} 회원 등록 요청 (승인 대기)`);
          setModal(null); showToast("등록 요청이 접수되었습니다. 관리자 승인 후 등록됩니다.");
        } else {
          if (data.id) {
            await updateStudentDoc({ ...data, studentCode: data.studentCode || students.find(s => s.id === data.id)?.studentCode });
          } else {
            await addStudentDoc({ ...data, id: uid(), studentCode: generateStudentCode() });
          }
          addLog(`${data.name} 회원 ${isNew ? "등록" : "수정"}`);
          setModal(null); showToast(isNew ? "회원이 등록되었습니다." : "회원 정보가 수정되었습니다.");
        }
      }} />}
      {modal === "sDetail" && selected && <StudentDetailModal student={selected} teachers={teachers} currentUser={user} categories={categories} feePresets={feePresets} attendance={attendance} payments={payments} onClose={() => setModal(null)} onEdit={() => setModal("sForm")} onDelete={async () => { await softDeleteStudent(selected); setModal(null); showToast(`${selected.name} 회원이 삭제되었습니다. (7일간 복원 가능)`); }} onPhotoUpdate={async (sid, photoData) => { const s = students.find(s => s.id === sid); if (s) { await updateStudentDoc({ ...s, photo: photoData }); } showToast("프로필 사진이 저장되었습니다."); }} onSaveStudent={async (upd) => { await updateStudentDoc(upd); setSelected(upd); showToast("청구 요청이 등록되었습니다."); }} />}
      {modal === "tForm" && canManageAll(user.role) && <TeacherFormModal teacher={selected} categories={categories} onClose={() => setModal(null)} onSave={async data => {
        const isNew = !data.id;
        const upd = data.id ? teachers.map(t => t.id === data.id ? data : t) : [...teachers, { ...data, id: uid() }];
        await saveTeachers(upd);
        addLog(`${data.name} ${data.role === "manager" ? "매니저" : "강사"} ${isNew ? "등록" : "수정"}`);
        setModal(null); showToast(isNew ? "등록되었습니다." : "수정되었습니다.");
      }} />}
      {modal === "tDetail" && selected && <TeacherDetailModal teacher={selected} students={students.filter(s => s.teacherId === selected.id || (s.lessons || []).some(l => l.teacherId === selected.id))} currentUser={user} onClose={() => setModal(null)} onEdit={() => setModal("tForm")} onDelete={async () => { await softDeleteTeacher(selected); setModal(null); showToast(`${selected.name} 삭제되었습니다. (7일간 복원 가능)`); }} onPhotoUpdate={async (tid, photoData) => { const upd = teachers.map(t => t.id === tid ? { ...t, photo: photoData } : t); await saveTeachers(upd); showToast("프로필 사진이 저장되었습니다."); }} />}
      {modal === "nForm" && <NoticeFormModal notice={selected} currentUser={user} onClose={() => setModal(null)} onSave={async data => { const upd = data.id && notices.find(n => n.id === data.id) ? notices.map(n => n.id === data.id ? data : n) : [...notices, data]; await saveNotices(upd); addLog(`공지 ${selected ? "수정" : "등록"}: ${data.title}`); setModal(null); showToast(selected ? "수정되었습니다." : "등록되었습니다."); }} />}
      {modal === "instForm" && canManageAll(user.role) && <InstitutionFormModal institution={selected} teachers={teachers} categories={categories} onClose={() => setModal(null)} onSave={async data => {
        const isNew = !data.id;
        const upd = data.id ? institutions.map(i => i.id === data.id ? data : i) : [...institutions, { ...data, id: uid() }];
        await saveInstitutions(upd);
        addLog(`${data.name} 기관 ${isNew ? "등록" : "수정"}`);
        setModal(null); showToast(isNew ? "기관이 등록되었습니다." : "기관 정보가 수정되었습니다.");
      }} />}
      {modal === "instDetail" && selected && <InstitutionDetailModal institution={selected} teachers={teachers} currentUser={user} attendance={attendance} payments={payments} onClose={() => setModal(null)} onEdit={() => setModal("instForm")} onDelete={async () => {
        const trashItem = { ...selected, type: "institution", deletedAt: Date.now(), deletedBy: user?.name };
        try { await saveTrash([...trash, trashItem]); } catch { return; }
        await saveInstitutions(institutions.filter(i => i.id !== selected.id));
        addLog(`${selected.name} 기관 삭제 (7일간 복원 가능)`);
        setModal(null); showToast(`${selected.name} 삭제되었습니다. (7일간 복원 가능)`);
      }} />}
      {backupConfirm && (
        <div className="modal-bg" onClick={() => setBackupConfirm(false)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <div className="modal-h"><h3>💾 전체 데이터 백업</h3></div>
            <div className="modal-b">
              <div style={{padding:"12px 16px", background:"var(--paper-soft)", borderRadius:8, marginBottom:12}}>
                <div style={{fontSize:13, fontWeight:600, color:"var(--red)", marginBottom:6}}>⚠️ 민감정보 포함</div>
                <div style={{fontSize:12, color:"var(--ink-30)", lineHeight:1.7}}>
                  이 파일에는 다음이 평문으로 포함됩니다.<br/>
                  • 강사 비밀번호 · 회원 및 보호자 연락처<br/>
                  • 출석 기록 및 레슨노트 댓글<br/><br/>
                  안전한 곳에 보관 후 즉시 삭제하세요.<br/>
                  다운로드 폴더가 클라우드 동기화 중이면 자동으로 업로드될 수 있습니다.
                </div>
              </div>
              <div style={{display:"flex", gap:8, justifyContent:"flex-end"}}>
                <button className="btn btn-secondary" onClick={() => setBackupConfirm(false)}>취소</button>
                <button className="btn btn-primary" onClick={handleFullBackup}>다운로드</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
