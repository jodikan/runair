import { NextRequest, NextResponse } from "next/server";

const MOCK_DATA = { temp: 24, humidity: 65 };

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
    // Convert lat/lng to KMA grid (nx, ny) — simplified fixed Seoul grid for now
    const nx = 60;
    const ny = 127;

    // KMA publishes forecasts at 0200, 0500, 0800, 1100, 1400, 1700, 2000, 2300
    // Pick the most recent base_time that has already been published (need ~10min delay)
    const BASE_TIMES = ["0200", "0500", "0800", "1100", "1400", "1700", "2000", "2300"];
    const now = new Date();
    // Use KST (UTC+9)
    const kstOffset = 9 * 60;
    const kst = new Date(now.getTime() + (kstOffset - now.getTimezoneOffset()) * 60000);
    const kstHour = kst.getUTCHours();
    const kstMin = kst.getUTCMinutes();
    const currentMins = kstHour * 60 + kstMin - 10; // 10min publishing delay
    const validBase = BASE_TIMES.filter((t) => {
      const h = parseInt(t.slice(0, 2), 10);
      const m = parseInt(t.slice(2), 10);
      return h * 60 + m <= currentMins;
    });
    const baseTime = validBase.length > 0 ? validBase[validBase.length - 1] : "2300";
    // If no valid time today (before 02:10 KST), use yesterday
    const useYesterday = validBase.length === 0;
    const baseDate = new Date(kst);
    if (useYesterday) baseDate.setUTCDate(baseDate.getUTCDate() - 1);
    const yyyyMMdd = baseDate.toISOString().slice(0, 10).replace(/-/g, "");

    const url = `http://apis.data.go.kr/1360000/VilageFcstInfoService_2.0/getVilageFcst?serviceKey=${encodeURIComponent(apiKey)}&pageNo=1&numOfRows=100&dataType=JSON&base_date=${yyyyMMdd}&base_time=${baseTime}&nx=${nx}&ny=${ny}`;
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
