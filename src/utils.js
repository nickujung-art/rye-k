import { INST_TYPES } from "./constants.jsx";

// ── Utils ─────────────────────────────────────────────────────────────────────
export function calcAge(d){if(!d)return null;const t=new Date(),b=new Date(d);return t.getFullYear()-b.getFullYear()-((t.getMonth()<b.getMonth()||(t.getMonth()===b.getMonth()&&t.getDate()<b.getDate()))?1:0);}
export function isMinor(d){const a=calcAge(d);return a!==null&&a<18;}
export function getCat(inst,cats){for(const[c,arr]of Object.entries(cats))if(arr.includes(inst))return c;return"기타";}
export function fmtDate(d){return d?new Date(d).toLocaleDateString("ko-KR"):"-";}
export function fmtDateShort(d){if(!d)return"-";const x=new Date(d);return `${x.getMonth()+1}/${x.getDate()}`;}
export function fmtDateTime(ts){if(!ts)return"-";const d=new Date(ts);return d.toLocaleDateString("ko-KR")+` ${d.getHours().toString().padStart(2,"0")}:${d.getMinutes().toString().padStart(2,"0")}`;}
export function uid(){return Date.now().toString(36)+Math.random().toString(36).slice(2,6);}
export function fmtPhone(v){const d=v.replace(/\D/g,"");if(d.startsWith("02")){if(d.length<=2)return d;if(d.length<=6)return d.slice(0,2)+"-"+d.slice(2);return d.slice(0,2)+"-"+d.slice(2,6)+"-"+d.slice(6,10);}if(d.length<=3)return d;if(d.length<=7)return d.slice(0,3)+"-"+d.slice(3);return d.slice(0,3)+"-"+d.slice(3,7)+"-"+d.slice(7,11);}
export function fmtMoney(n){return n!=null?n.toLocaleString("ko-KR")+"원":"-";}
export function allLessonInsts(s){return(s.lessons||[]).map(l=>l.instrument);}
export function allLessonDays(s){const days=new Set();(s.lessons||[]).forEach(l=>(l.schedule||[]).forEach(x=>x.day&&days.add(x.day)));return Array.from(days);}
export function canManageAll(role){return role==="admin"||role==="manager";}
export function monthLabel(m){if(!m)return"-";const[y,mo]=m.split("-");return `${y}년 ${parseInt(mo)}월`;}
export function generateStudentCode(){const chars="ABCDEFGHJKLMNPQRSTUVWXYZ23456789";let code="RK";for(let i=0;i<4;i++)code+=chars[Math.floor(Math.random()*chars.length)];return code;}
export function getBirthPassword(birthDate){if(!birthDate)return"";const d=new Date(birthDate);const mm=String(d.getMonth()+1).padStart(2,"0");const dd=String(d.getDate()).padStart(2,"0");return mm+dd;}
export function getPhoneInitialPassword(phone){const d=(phone||"").replace(/\D/g,"");return d.length>=4?d.slice(-4):"0000";}

// ── v12.1: 기관(B2B 파견) 헬퍼 ────────────────────────────────────────────────
// 1기관 = 여러 가상회원 (수업/반 단위로 분리). 출석/수납/스케줄/레슨노트는 기존 컴포넌트가 그대로 처리.
export function expandInstitutionsToMembers(institutions) {
  if (!institutions || institutions.length === 0) return [];
  const out = [];
  institutions.forEach(inst => {
    const classes = inst.classes || [];
    if (classes.length === 0) return;
    classes.forEach(cls => {
      const className = cls.name || cls.instrument || "수업";
      out.push({
        // 기존 student 형태와 호환되는 가상회원
        id: `inst_${inst.id}_${cls.id}`,
        name: `${inst.name} · ${className}`,
        isInstitution: true,
        institutionId: inst.id,
        institutionName: inst.name,
        classId: cls.id,
        className: className,
        teacherId: cls.teacherId || inst.teacherId || "",
        lessons: [{
          instrument: cls.instrument,
          teacherId: cls.teacherId || inst.teacherId || "",
          schedule: cls.schedule || []
        }],
        monthlyFee: cls.monthlyFee || 0,
        participantCount: cls.participantCount || 0,
        status: inst.status || "active",
        // 화면 표시용 메타
        photo: inst.photo || "",
        phone: inst.contactPhone || "",
        guardianPhone: "",
        notes: cls.notes || inst.notes || "",
        birthDate: "", // 포털 로그인 차단
        startDate: inst.contractStart || "",
        contractStart: inst.contractStart || "",
        contractEnd: inst.contractEnd || "",
        bizNumber: inst.bizNumber || "",
        contactName: inst.contactName || "",
        contactEmail: inst.contactEmail || "",
        address: inst.address || "",
        type: inst.type || "other",
        studentCode: `RKI${(inst.id || "").slice(-3).toUpperCase()}${(cls.id || "").slice(-2).toUpperCase()}`,
        createdAt: cls.createdAt || inst.createdAt || Date.now(),
      });
    });
  });
  return out;
}
export function getContractDaysLeft(inst) {
  if (!inst?.contractEnd) return null;
  const end = new Date(inst.contractEnd + "T23:59:59");
  const now = new Date();
  return Math.ceil((end - now) / 86400000);
}
export function instTypeLabel(t) { return INST_TYPES[t] || "기타"; }
export function compressImage(file, maxWidth=360, quality=0.75) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement("canvas");
        const ratio = Math.min(maxWidth / img.width, 1);
        canvas.width = img.width * ratio;
        canvas.height = img.height * ratio;
        const ctx = canvas.getContext("2d");
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
        resolve(canvas.toDataURL("image/jpeg", quality));
      };
      img.onerror = reject;
      img.src = e.target.result;
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}
export function printQR(qrImgUrl, regUrl) {
  const w = window.open("", "_blank");
  const html = "<html><head><title>RYE-K 등록 QR</title></head><body style='display:flex;flex-direction:column;align-items:center;justify-content:center;min-height:100vh;font-family:sans-serif'><h2>RYE-K K-Culture Center</h2><p>수강 등록 QR코드</p><img src='" + qrImgUrl + "' style='width:300px;height:300px'/><p style='font-size:12px;color:#999;margin-top:16px'>" + regUrl + "</p><script>window.print()<\/script></body></html>";
  w.document.write(html);
  w.document.close();
}

export function formatLessonNoteSummary(note) {
  if (!note) return "";
  if (typeof note === "string") return note;
  const parts = [];
  if (note.progress) parts.push(note.progress);
  if (note.content) parts.push(note.content);
  if (note.assignment) parts.push("과제: " + note.assignment);
  return parts.join(" | ") || "";
}

export async function sendAligoMessage(targetType, students) {
  const targets = students.map(s => s.parentPhone || s.phone).filter(Boolean);
  console.log(`[알림톡 목업] 발송 대상(${targetType}): ${targets.length}명`, targets);
  await new Promise(resolve => setTimeout(resolve, 1000));
}
