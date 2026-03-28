import { NextRequest, NextResponse } from "next/server";

const MOCK_DATA = {
  pm25: 22,
  stationName: "종로구",
  dataTime: new Date().toISOString(),
};

/**
 * WGS84 위경도 → 한국 중부원점 TM 좌표 변환 (GRS80 타원체)
 * AirKorea getNearbyMsrstnList API 파라미터(tmX, tmY) 용
 */
function wgs84ToTM(lat: number, lng: number): { tmX: number; tmY: number } {
  const a = 6378137.0;
  const f = 1.0 / 298.257222101;
  const e2 = 2 * f - f * f;

  const k0 = 1.0;
  const φ0 = (38.0 * Math.PI) / 180.0;
  const λ0 = (127.0 * Math.PI) / 180.0;
  const FE = 200000.0;
  const FN = 500000.0;

  const φ = (lat * Math.PI) / 180.0;
  const λ = (lng * Math.PI) / 180.0;

  const N = a / Math.sqrt(1 - e2 * Math.sin(φ) ** 2);
  const T = Math.tan(φ) ** 2;
  const C = (e2 / (1 - e2)) * Math.cos(φ) ** 2;
  const A = Math.cos(φ) * (λ - λ0);

  function meridionalArc(angle: number) {
    return (
      a *
      ((1 - e2 / 4 - (3 * e2 ** 2) / 64 - (5 * e2 ** 3) / 256) * angle -
        ((3 * e2) / 8 + (3 * e2 ** 2) / 32 + (45 * e2 ** 3) / 1024) * Math.sin(2 * angle) +
        ((15 * e2 ** 2) / 256 + (45 * e2 ** 3) / 1024) * Math.sin(4 * angle) -
        ((35 * e2 ** 3) / 3072) * Math.sin(6 * angle))
    );
  }

  const M = meridionalArc(φ);
  const M0 = meridionalArc(φ0);

  const tmX =
    FE +
    k0 *
      N *
      (A +
        ((1 - T + C) * A ** 3) / 6 +
        ((5 - 18 * T + T ** 2 + 72 * C - (58 * e2) / (1 - e2)) * A ** 5) / 120);

  const tmY =
    FN +
    k0 *
      (M -
        M0 +
        N *
          Math.tan(φ) *
          (A ** 2 / 2 +
            ((5 - T + 9 * C + 4 * C ** 2) * A ** 4) / 24 +
            ((61 - 58 * T + T ** 2 + 600 * C - (330 * e2) / (1 - e2)) * A ** 6) / 720));

  return { tmX, tmY };
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const lat = searchParams.get("lat");
  const lng = searchParams.get("lng");

  const apiKey = process.env.AIRKOREA_API_KEY;
  if (!apiKey || apiKey === "여기에_에어코리아_키") {
    return NextResponse.json({ ...MOCK_DATA, mock: true });
  }

  if (!lat || !lng) {
    return NextResponse.json({ error: "lat, lng required" }, { status: 400 });
  }

  try {
    const { tmX, tmY } = wgs84ToTM(parseFloat(lat), parseFloat(lng));

    const stationUrl = `https://apis.data.go.kr/B552584/MsrstnInfoInqireSvc/getNearbyMsrstnList?tmX=${tmX}&tmY=${tmY}&returnType=json&serviceKey=${encodeURIComponent(apiKey)}&pageNo=1&numOfRows=1`;
    const stationRes = await fetch(stationUrl);
    const stationData = await stationRes.json();
    const stationName =
      stationData?.response?.body?.items?.[0]?.stationName ?? "알수없음";

    const aqUrl = `https://apis.data.go.kr/B552584/ArpltnInforInqireSvc/getMsrstnAcctoRltmMesureDnsty?stationName=${encodeURIComponent(stationName)}&dataTerm=DAILY&pageNo=1&numOfRows=1&returnType=json&serviceKey=${encodeURIComponent(apiKey)}&ver=1.0`;
    const aqRes = await fetch(aqUrl);
    const aqData = await aqRes.json();
    const item = aqData?.response?.body?.items?.[0];

    if (!item) {
      console.warn("airquality: no item returned, falling back to mock");
      return NextResponse.json({ ...MOCK_DATA, mock: true });
    }

    return NextResponse.json({
      pm25: Number(item.pm25Value) || 0,
      stationName,
      dataTime: item.dataTime,
    });
  } catch (err) {
    console.warn("airquality API error, falling back to mock:", err);
    return NextResponse.json({ ...MOCK_DATA, mock: true });
  }
}
