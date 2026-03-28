import { NextRequest, NextResponse } from "next/server";

const MOCK_DATA = { temp: 24, humidity: 65 };

/**
 * WGS84 위경도 → 기상청 단기예보 격자 좌표(nx, ny) 변환
 * 기상청 Lambert Conformal Conic 투영 사용
 */
function wgs84ToKMAGrid(lat: number, lng: number): { nx: number; ny: number } {
  const RE = 6371.00877;
  const GRID = 5.0;
  const SLAT1 = 30.0;
  const SLAT2 = 60.0;
  const OLON = 126.0;
  const OLAT = 38.0;
  const XO = 43;
  const YO = 136;

  const DEGRAD = Math.PI / 180.0;
  const re = RE / GRID;
  const slat1 = SLAT1 * DEGRAD;
  const slat2 = SLAT2 * DEGRAD;
  const olon = OLON * DEGRAD;
  const olat = OLAT * DEGRAD;

  let sn = Math.tan(Math.PI * 0.25 + slat2 * 0.5) / Math.tan(Math.PI * 0.25 + slat1 * 0.5);
  sn = Math.log(Math.cos(slat1) / Math.cos(slat2)) / Math.log(sn);
  let sf = Math.tan(Math.PI * 0.25 + slat1 * 0.5);
  sf = (Math.pow(sf, sn) * Math.cos(slat1)) / sn;
  let ro = Math.tan(Math.PI * 0.25 + olat * 0.5);
  ro = (re * sf) / Math.pow(ro, sn);

  const ra = Math.tan(Math.PI * 0.25 + lat * DEGRAD * 0.5);
  const r = (re * sf) / Math.pow(ra, sn);
  let theta = lng * DEGRAD - olon;
  if (theta > Math.PI) theta -= 2.0 * Math.PI;
  if (theta < -Math.PI) theta += 2.0 * Math.PI;
  theta *= sn;

  const nx = Math.floor(r * Math.sin(theta) + XO + 0.5);
  const ny = Math.floor(ro - r * Math.cos(theta) + YO + 0.5);

  return { nx, ny };
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const lat = searchParams.get("lat");
  const lng = searchParams.get("lng");

  const apiKey = process.env.KMA_API_KEY;
  if (!apiKey || apiKey === "여기에_기상청_키") {
    return NextResponse.json({ ...MOCK_DATA, mock: true });
  }

  if (!lat || !lng) {
    return NextResponse.json({ error: "lat, lng required" }, { status: 400 });
  }

  try {
    const { nx, ny } = wgs84ToKMAGrid(parseFloat(lat), parseFloat(lng));

    const BASE_TIMES = ["0200", "0500", "0800", "1100", "1400", "1700", "2000", "2300"];
    const now = new Date();
    const kstOffset = 9 * 60;
    const kst = new Date(now.getTime() + (kstOffset - now.getTimezoneOffset()) * 60000);
    const kstHour = kst.getUTCHours();
    const kstMin = kst.getUTCMinutes();
    const currentMins = kstHour * 60 + kstMin - 10;
    const validBase = BASE_TIMES.filter((t) => {
      const h = parseInt(t.slice(0, 2), 10);
      const m = parseInt(t.slice(2), 10);
      return h * 60 + m <= currentMins;
    });
    const baseTime = validBase.length > 0 ? validBase[validBase.length - 1] : "2300";
    const useYesterday = validBase.length === 0;
    const baseDate = new Date(kst);
    if (useYesterday) baseDate.setUTCDate(baseDate.getUTCDate() - 1);
    const yyyyMMdd = baseDate.toISOString().slice(0, 10).replace(/-/g, "");

    const url = `https://apis.data.go.kr/1360000/VilageFcstInfoService_2.0/getVilageFcst?serviceKey=${encodeURIComponent(apiKey)}&pageNo=1&numOfRows=100&dataType=JSON&base_date=${yyyyMMdd}&base_time=${baseTime}&nx=${nx}&ny=${ny}`;
    const res = await fetch(url);
    const data = await res.json();
    const items: Array<{ category: string; fcstValue: string }> =
      data?.response?.body?.items?.item ?? [];

    const tmp = items.find((i) => i.category === "TMP");
    const reh = items.find((i) => i.category === "REH");

    return NextResponse.json({
      temp: tmp ? Number(tmp.fcstValue) : MOCK_DATA.temp,
      humidity: reh ? Number(reh.fcstValue) : MOCK_DATA.humidity,
    });
  } catch (err) {
    console.warn("weather API error, falling back to mock:", err);
    return NextResponse.json({ ...MOCK_DATA, mock: true });
  }
}
