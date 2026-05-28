// 일회성 IP 확인용 엔드포인트 — IP 등록 후 삭제 예정
export async function onRequestGet() {
  try {
    const res = await fetch("https://api.ipify.org?format=json");
    const { ip } = await res.json();
    return new Response(JSON.stringify({ outbound_ip: ip }), {
      headers: { "Content-Type": "application/json" },
    });
  } catch (e) {
    return new Response(JSON.stringify({ error: e.message }), { status: 500 });
  }
}
