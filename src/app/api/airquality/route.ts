import { NextRequest, NextResponse } from "next/server";

const MOCK_DATA = {
  pm25: 22,
  stationName: "종로구",
  dataTime: new Date().toISOString(),
};

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const lat = searchParams.get("lat");
  const lng = searchParams.get("lng");

  // Dev mock mode: no API key provided
  const apiKey = process.env.AIRKOREA_API_KEY;
  if (!apiKey || apiKey === "여기에_에어코리아_키") {
    return NextResponse.json({ ...MOCK_DATA, mock: true });
  }

  if (!lat || !lng) {
    return NextResponse.json({ error: "lat, lng required" }, { status: 400 });
  }

  try {
    // 1. Convert lat/lng to TM coordinates via kakao or use fixed grid
    // 2. Find nearest station
    const stationUrl = `http://apis.data.go.kr/B552584/MsrstnInfoInqireSvc/getNearbyMsrstnList?tmX=${lng}&tmY=${lat}&returnType=json&serviceKey=${encodeURIComponent(apiKey)}&pageNo=1&numOfRows=1`;
    const stationRes = await fetch(stationUrl);
    const stationData = await stationRes.json();
    const stationName =
      stationData?.response?.body?.items?.[0]?.stationName ?? "알수없음";

    // 3. Get PM2.5 for that station
    const aqUrl = `http://apis.data.go.kr/B552584/ArpltnInforInqireSvc/getMsrstnAcctoRltmMesureDnsty?stationName=${encodeURIComponent(stationName)}&dataTerm=DAILY&pageNo=1&numOfRows=1&returnType=json&serviceKey=${encodeURIComponent(apiKey)}&ver=1.0`;
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
