const ALIGO_HOST = "kakaoapi.aligo.in";
const ALIGO_URL = `https://${ALIGO_HOST}/akv10/alimtalk/send/`;

// Aligo 서버의 IPv4 주소 조회 (Cloudflare Workers가 IPv6로 나가는 문제 우회)
async function resolveIPv4(hostname) {
  try {
    const res = await fetch(
      `https://cloudflare-dns.com/dns-query?name=${hostname}&type=A`,
      { headers: { Accept: "application/dns-json" } }
    );
    const data = await res.json();
    return data.Answer?.find(r => r.type === 1)?.data || null;
  } catch {
    return null;
  }
}

const TPL_CODES = {
  monthly_fee: "UI_1525",
  unpaid_reminder: "UI_1526",
  makeup_lesson: "UI_1527",
};

function fmtAmt(n) {
  return String(Math.round(n || 0)).replace(/\B(?=(\d{3})+(?!\d))/g, ",");
}

function monthKr(ym) {
  if (!ym) return "";
  return `${parseInt(ym.split("-")[1], 10)}월`;
}

function buildMessage(type, student, options) {
  const { month, deadline, makeupDate, makeupTime } = options;
  const name = student.name;
  const amount = fmtAmt(student.amount);
  const mo = monthKr(month);

  if (type === "monthly_fee") {
    return `[RYE-K K-Culture Center]\n\n안녕하세요, ${name}님!\n${mo} 수강료 안내드립니다.\n\n💰 수강료: ${amount}원\n📅 납부 기한: ${deadline}\n\n계좌: 카카오뱅크 3333-34-5220544\n(예금주: 예케이케이컬처센터)\n\n감사합니다 🎵`;
  }
  if (type === "unpaid_reminder") {
    return `[RYE-K K-Culture Center]\n\n${name}님, ${mo} 수강료 ${amount}원이 아직 미납 상태입니다.\n\n빠른 시일 내 납부 부탁드립니다.\n계좌: 카카오뱅크 3333-34-5220544\n\n문의: 원장실`;
  }
  if (type === "makeup_lesson") {
    return `[RYE-K K-Culture Center]\n\n${name}님, 보강 수업이 예정되어 있습니다.\n\n📅 일시: ${makeupDate} ${makeupTime}\n\n참석 여부를 알려주세요 😊`;
  }
  return "";
}

async function sendBatch(env, type, batch, options) {
  const params = new URLSearchParams({
    apikey: env.ALIGO_APIKEY,
    userid: env.ALIGO_USERID,
    senderkey: env.ALIGO_SENDERKEY,
    tpl_code: TPL_CODES[type],
    sender: env.ALIGO_SENDER,
  });

  batch.forEach((student, i) => {
    const n = i + 1;
    const phone = (student.phone || student.guardianPhone || "").replace(/\D/g, "");
    params.append(`receiver_${n}`, phone);
    params.append(`recvname_${n}`, student.name);
    params.append(`message_${n}`, buildMessage(type, student, options));
  });

  // IPv4 강제: Cloudflare Workers 기본 IPv6 → Aligo IP 화이트리스트 차단 우회
  const ipv4 = await resolveIPv4(ALIGO_HOST);
  const fetchOpts = {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: params.toString(),
  };
  if (ipv4) fetchOpts.cf = { resolveOverride: ipv4 };

  const res = await fetch(ALIGO_URL, fetchOpts);
  return res.json();
}

export async function onRequestPost({ request, env }) {
  let body;
  try {
    body = await request.json();
  } catch {
    return json({ success: false, error: "Invalid JSON" }, 400);
  }

  const { type, students, options = {} } = body;

  if (!type || !Array.isArray(students) || students.length === 0) {
    return json({ success: false, error: "type과 students가 필요합니다" }, 400);
  }
  if (!TPL_CODES[type]) {
    return json({ success: false, error: `알 수 없는 타입: ${type}` }, 400);
  }
  if (type === "makeup_lesson") {
    return json({ success: false, error: "보강 안내 템플릿은 현재 재승인 대기 중입니다." }, 400);
  }

  const valid = students.filter(s => s.phone || s.guardianPhone);
  const noPhone = students.filter(s => !s.phone && !s.guardianPhone).map(s => s.name);

  if (valid.length === 0) {
    return json({ success: false, error: "전화번호가 있는 수신자가 없습니다", noPhone }, 400);
  }

  const BATCH = 500;
  const results = [];
  for (let i = 0; i < valid.length; i += BATCH) {
    const result = await sendBatch(env, type, valid.slice(i, i + BATCH), options);
    results.push(result);
    if (result.code !== 0) {
      return json({ success: false, error: result.message || "Aligo API 오류", details: result, noPhone });
    }
  }

  return json({ success: true, sent: valid.length, noPhone, details: results });
}

function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}
