"use client";

import { useEffect, useState } from "react";
import PaceInput from "@/components/PaceInput";
import ResultCard from "@/components/ResultCard";
import WeatherToggle from "@/components/WeatherToggle";
import ColoredSlider, { PM25_STOPS, TEMP_STOPS, HUM_STOPS } from "@/components/ColoredSlider";
import { calcRecommendation, parsePace } from "@/lib/paceCalc";
import { PM25_RANGE, TEMP_RANGE, HUM_RANGE } from "@/lib/sliderZones";
import { PaceInput as PaceInputType, AirQualityData, WeatherData, Recommendation } from "@/types";

const DEFAULT_PACE: PaceInputType = { minutes: 7, seconds: 0 };
const LS_KEY = "runair_pace";

function loadPace(): PaceInputType {
  if (typeof window === "undefined") return DEFAULT_PACE;
  const saved = localStorage.getItem(LS_KEY);
  if (!saved) return DEFAULT_PACE;
  return parsePace(saved) ?? DEFAULT_PACE;
}

export default function Home() {
  const [pace, setPace] = useState<PaceInputType>(DEFAULT_PACE);
  const [airQuality, setAirQuality] = useState<AirQualityData | null>(null);
  const [weather, setWeather] = useState<WeatherData | null>(null);
  const [isMock, setIsMock] = useState(false);
  const [weatherEnabled, setWeatherEnabled] = useState(false);
  const [weatherLoading, setWeatherLoading] = useState(false);
  const [loading, setLoading] = useState(true);
  const [locationError, setLocationError] = useState<string | null>(null);
  const [result, setResult] = useState<Recommendation | null>(null);

  // Load saved pace
  useEffect(() => {
    setPace(loadPace());
  }, []);

  // Save pace on change
  useEffect(() => {
    localStorage.setItem(LS_KEY, `${pace.minutes}:${String(pace.seconds).padStart(2, "0")}`);
  }, [pace]);

  // Get location + air quality on mount
  useEffect(() => {
    if (!navigator.geolocation) {
      setLocationError("이 브라우저는 위치 정보를 지원하지 않습니다.");
      fetchAirQuality(null, null);
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => fetchAirQuality(pos.coords.latitude, pos.coords.longitude),
      () => {
        setLocationError("위치 권한이 거부되었습니다. 서울 기본값을 사용합니다.");
        fetchAirQuality(null, null);
      }
    );
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function fetchAirQuality(lat: number | null, lng: number | null) {
    setLoading(true);
    try {
      const params = lat && lng ? `?lat=${lat}&lng=${lng}` : "";
      const res = await fetch(`/api/airquality${params}`);
      const data = await res.json();
      setAirQuality(data);
      setIsMock(!!data.mock);
    } catch {
      setLocationError("대기질 정보를 불러오지 못했습니다.");
    } finally {
      setLoading(false);
    }
  }

  async function fetchWeather(lat: number | null, lng: number | null) {
    setWeatherLoading(true);
    try {
      const params = lat && lng ? `?lat=${lat}&lng=${lng}` : "";
      const res = await fetch(`/api/weather${params}`);
      const data = await res.json();
      if (data.temp !== undefined && data.humidity !== undefined) {
        setWeather(data);
      }
    } finally {
      setWeatherLoading(false);
    }
  }

  // Recalculate result whenever inputs change
  useEffect(() => {
    if (!airQuality) return;
    const rec = calcRecommendation(
      pace,
      airQuality.pm25,
      weatherEnabled && weather ? weather.temp : undefined,
      weatherEnabled && weather ? weather.humidity : undefined
    );
    setResult(rec);
  }, [pace, airQuality, weather, weatherEnabled]);

  function handleWeatherToggle(on: boolean) {
    setWeatherEnabled(on);
    if (on && !weather) {
      if (!navigator.geolocation) {
        fetchWeather(null, null);
        return;
      }
      navigator.geolocation.getCurrentPosition(
        (pos) => fetchWeather(pos.coords.latitude, pos.coords.longitude),
        () => fetchWeather(null, null)
      );
    }
  }

  return (
    <main className="min-h-screen flex flex-col items-center px-4 py-10 gap-8" style={{ background: "var(--bg)" }}>
      <header className="text-center">
        <h1 className="text-3xl font-black tracking-tight" style={{ color: "var(--text-primary)" }}>RunAir</h1>
        <p className="text-sm mt-1" style={{ color: "var(--text-secondary)" }}>대기질 기반 러닝 가이드</p>
      </header>

      {locationError && (
        <p className="text-xs text-orange-400 text-center">{locationError}</p>
      )}

      <PaceInput value={pace} onChange={setPace} />

      <WeatherToggle
        enabled={weatherEnabled}
        onToggle={handleWeatherToggle}
        weather={weatherEnabled ? weather ?? undefined : undefined}
        loading={weatherLoading}
      />

      {loading ? (
        <div className="text-sm animate-pulse" style={{ color: "var(--text-secondary)" }}>대기질 정보 불러오는 중...</div>
      ) : result && airQuality ? (
        <>
          {/* 측정값 게이지 */}
          <section className="rounded-2xl p-4 w-full max-w-sm flex flex-col gap-5" style={{ background: "var(--surface)", border: "1px solid var(--border)" }}>
            <p className="text-xs font-semibold" style={{ color: "var(--text-secondary)" }}>현재 측정값</p>

            {/* PM2.5 */}
            <ColoredSlider
              label="PM2.5" unit=" ㎍/㎥"
              min={PM25_RANGE.min} max={PM25_RANGE.max} value={airQuality.pm25}
              stops={PM25_STOPS} colorMode="absolute"
              readOnly
            />

            {/* 기온 / 습도 (토글 ON + 날씨 데이터 있을 때) */}
            {weatherEnabled && weather && (
              <>
                <ColoredSlider
                  label="기온" unit="°C"
                  min={TEMP_RANGE.min} max={TEMP_RANGE.max} value={weather.temp}
                  stops={TEMP_STOPS} colorMode="absolute"
                  readOnly
                />
                <ColoredSlider
                  label="습도" unit="%"
                  min={HUM_RANGE.min} max={HUM_RANGE.max} value={weather.humidity}
                  stops={HUM_STOPS} colorMode="absolute"
                  readOnly
                />
              </>
            )}
          </section>

          <ResultCard
            result={result}
            pm25={airQuality.pm25}
            stationName={airQuality.stationName}
            isMock={isMock}
          />
        </>
      ) : null}
    </main>
  );
}
