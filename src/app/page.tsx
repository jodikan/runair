"use client";

import { useEffect, useState } from "react";
import PaceInput from "@/components/PaceInput";
import ResultCard from "@/components/ResultCard";
import WeatherToggle from "@/components/WeatherToggle";
import ColoredSlider, { PM25_STOPS, TEMP_STOPS, HUM_STOPS } from "@/components/ColoredSlider";
import LocationModal from "@/components/LocationModal";
import { calcRecommendation, parsePace } from "@/lib/paceCalc";
import { PM25_RANGE, TEMP_RANGE, HUM_RANGE } from "@/lib/sliderZones";
import { PaceInput as PaceInputType, AirQualityData, WeatherData, Recommendation } from "@/types";

const DEFAULT_PACE: PaceInputType = { minutes: 7, seconds: 0 };
const LS_PACE_KEY    = "runair_pace";
const LS_CONSENT_KEY = "runair_location_consent";

function loadPace(): PaceInputType {
  if (typeof window === "undefined") return DEFAULT_PACE;
  const saved = localStorage.getItem(LS_PACE_KEY);
  if (!saved) return DEFAULT_PACE;
  return parsePace(saved) ?? DEFAULT_PACE;
}

type Consent = "granted" | "denied" | null;

export default function Home() {
  const [pace, setPace]                 = useState<PaceInputType>(DEFAULT_PACE);
  const [airQuality, setAirQuality]     = useState<AirQualityData | null>(null);
  const [weather, setWeather]           = useState<WeatherData | null>(null);
  const [isMock, setIsMock]             = useState(false);
  const [weatherEnabled, setWeatherEnabled] = useState(false);
  const [weatherLoading, setWeatherLoading] = useState(false);
  const [loading, setLoading]           = useState(true);
  const [result, setResult]             = useState<Recommendation | null>(null);

  const [consent, setConsent]           = useState<Consent>(null);
  const [showConsent, setShowConsent]   = useState(false);
  const [locationModalOpen, setLocationModalOpen] = useState(false);
  const [currentLocation, setCurrentLocation] = useState<{ lat: number; lng: number; name: string } | null>(null);

  // 저장된 페이스 로드
  useEffect(() => { setPace(loadPace()); }, []);
  useEffect(() => {
    localStorage.setItem(LS_PACE_KEY, `${pace.minutes}:${String(pace.seconds).padStart(2, "0")}`);
  }, [pace]);

  // 첫 진입 시 동의 여부 확인
  useEffect(() => {
    const saved = localStorage.getItem(LS_CONSENT_KEY) as Consent;
    if (saved === "granted") {
      setConsent("granted");
      startGPS();
    } else if (saved === "denied") {
      setConsent("denied");
      setLoading(false);
      setLocationModalOpen(true);
    } else {
      // 첫 진입 — 동의 팝업 표시
      setShowConsent(true);
      setLoading(false);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // 결과 재계산
  useEffect(() => {
    if (!airQuality) return;
    setResult(calcRecommendation(
      pace,
      airQuality.pm25,
      weatherEnabled && weather ? weather.temp : undefined,
      weatherEnabled && weather ? weather.humidity : undefined
    ));
  }, [pace, airQuality, weather, weatherEnabled]);

  function startGPS() {
    setLoading(true);
    if (!navigator.geolocation) {
      fetchAirQuality(null, null);
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        fetchAirQuality(pos.coords.latitude, pos.coords.longitude);
      },
      () => {
        // GPS 실패 → 직접검색
        setLoading(false);
        setLocationModalOpen(true);
      }
    );
  }

  function handleConsentGrant() {
    localStorage.setItem(LS_CONSENT_KEY, "granted");
    setConsent("granted");
    setShowConsent(false);
    startGPS();
  }

  function handleConsentDeny() {
    localStorage.setItem(LS_CONSENT_KEY, "denied");
    setConsent("denied");
    setShowConsent(false);
    setLocationModalOpen(true);
  }

  function handleLocationConfirm(loc: { lat: number; lng: number; name: string }) {
    setCurrentLocation(loc);
    setLocationModalOpen(false);
    fetchAirQuality(loc.lat, loc.lng);
    if (weatherEnabled) fetchWeather(loc.lat, loc.lng);
  }

  async function fetchAirQuality(lat: number | null, lng: number | null) {
    setLoading(true);
    try {
      const params = lat && lng ? `?lat=${lat}&lng=${lng}` : "";
      const res  = await fetch(`/api/airquality${params}`);
      const data = await res.json();
      setAirQuality(data);
      setIsMock(!!data.mock);
    } catch {
      // 실패 시 무시
    } finally {
      setLoading(false);
    }
  }

  async function fetchWeather(lat: number | null, lng: number | null) {
    setWeatherLoading(true);
    try {
      const params = lat && lng ? `?lat=${lat}&lng=${lng}` : "";
      const res  = await fetch(`/api/weather${params}`);
      const data = await res.json();
      if (data.temp !== undefined && data.humidity !== undefined) setWeather(data);
    } finally {
      setWeatherLoading(false);
    }
  }

  function handleWeatherToggle(on: boolean) {
    setWeatherEnabled(on);
    if (on && !weather) {
      if (currentLocation) {
        fetchWeather(currentLocation.lat, currentLocation.lng);
      } else {
        navigator.geolocation?.getCurrentPosition(
          (pos) => fetchWeather(pos.coords.latitude, pos.coords.longitude),
          () => fetchWeather(null, null)
        );
      }
    }
  }

  return (
    <main className="min-h-screen flex flex-col items-center px-4 py-10 gap-8" style={{ background: "var(--bg)" }}>

      {/* 위치 동의 팝업 */}
      {showConsent && (
        <div className="fixed inset-0 z-50 flex items-center justify-center" style={{ background: "rgba(0,0,0,0.6)" }}>
          <div className="w-full max-w-sm mx-4 rounded-2xl p-6 flex flex-col gap-4" style={{ background: "var(--surface)", border: "1px solid var(--border)" }}>
            <div>
              <p className="font-semibold mb-1" style={{ color: "var(--text-primary)" }}>위치 정보 수집 동의</p>
              <p className="text-sm" style={{ color: "var(--text-secondary)" }}>
                현재 위치 기반으로 대기질과 날씨 정보를 제공합니다.
                위치 정보는 서버에 저장되지 않습니다.
              </p>
            </div>
            <div className="flex gap-2">
              <button
                onClick={handleConsentDeny}
                className="flex-1 py-2.5 rounded-xl text-sm"
                style={{ border: "1px solid var(--border)", color: "var(--text-secondary)" }}
              >
                비동의
              </button>
              <button
                onClick={handleConsentGrant}
                className="flex-1 py-2.5 rounded-xl text-sm font-semibold"
                style={{ background: "var(--grade-great)", color: "#0f1117" }}
              >
                동의
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 위치 검색 모달 */}
      <LocationModal
        isOpen={locationModalOpen}
        onClose={() => setLocationModalOpen(false)}
        onConfirm={handleLocationConfirm}
        current={currentLocation ?? undefined}
      />

      {/* 헤더 */}
      <header className="text-center">
        <h1 className="text-3xl font-black tracking-tight" style={{ color: "var(--text-primary)" }}>RunAir</h1>
        <p className="text-sm mt-1" style={{ color: "var(--text-secondary)" }}>대기질 기반 러닝 가이드</p>
      </header>

      {/* 현재 위치 표시 + 변경 버튼 */}
      {!showConsent && (
        <button
          onClick={() => setLocationModalOpen(true)}
          className="flex items-center gap-2 px-4 py-2 rounded-full text-sm"
          style={{ background: "var(--surface)", border: "1px solid var(--border)", color: "var(--text-secondary)" }}
        >
          <span>📍</span>
          <span style={{ color: "var(--text-primary)" }}>
            {currentLocation ? currentLocation.name : airQuality?.stationName ?? "위치 설정"}
          </span>
          <span style={{ fontSize: "0.7rem" }}>변경</span>
        </button>
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
          <section className="rounded-2xl p-4 w-full max-w-sm flex flex-col gap-5" style={{ background: "var(--surface)", border: "1px solid var(--border)" }}>
            <p className="text-xs font-semibold" style={{ color: "var(--text-secondary)" }}>현재 측정값</p>
            <ColoredSlider
              label="PM2.5" unit=" ㎍/㎥"
              min={PM25_RANGE.min} max={PM25_RANGE.max} value={airQuality.pm25}
              stops={PM25_STOPS} colorMode="absolute" readOnly
            />
            {weatherEnabled && weather && (
              <>
                <ColoredSlider
                  label="기온" unit="°C"
                  min={TEMP_RANGE.min} max={TEMP_RANGE.max} value={weather.temp}
                  stops={TEMP_STOPS} colorMode="absolute" readOnly
                />
                <ColoredSlider
                  label="습도" unit="%"
                  min={HUM_RANGE.min} max={HUM_RANGE.max} value={weather.humidity}
                  stops={HUM_STOPS} colorMode="absolute" readOnly
                />
              </>
            )}
          </section>

          <ResultCard
            result={result}
            pm25={airQuality.pm25}
            stationName={currentLocation?.name ?? airQuality.stationName}
            isMock={isMock}
            temp={weatherEnabled && weather ? weather.temp : undefined}
            humidity={weatherEnabled && weather ? weather.humidity : undefined}
            basePace={pace}
          />
        </>
      ) : !loading && consent !== null && (
        <div className="text-sm" style={{ color: "var(--text-secondary)" }}>
          위치를 선택하면 대기질 정보를 불러옵니다.
        </div>
      )}

    </main>
  );
}
