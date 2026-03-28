"use client";

import { useState } from "react";
import PaceInput from "@/components/PaceInput";
import ResultCard from "@/components/ResultCard";
import ColoredSlider, { PM25_STOPS, TEMP_STOPS, HUM_STOPS } from "@/components/ColoredSlider";
import LocationModal from "@/components/LocationModal";
import { calcRecommendation } from "@/lib/paceCalc";
import { PaceInput as PaceInputType, Recommendation } from "@/types";
import { PM25_RANGE, TEMP_RANGE, HUM_RANGE } from "@/lib/sliderZones";

const DEFAULT_PACE: PaceInputType = { minutes: 5, seconds: 30 };

type Preset = { label: string; pm25: number; temp: number; humidity: number };

const PRESETS: Preset[] = [
  { label: "맑은 봄날",     pm25: 10,  temp: 18, humidity: 50 },
  { label: "보통 + 선선",   pm25: 25,  temp: 22, humidity: 60 },
  { label: "나쁨 + 더위",   pm25: 55,  temp: 30, humidity: 75 },
  { label: "매우나쁨 + 폭염", pm25: 100, temp: 35, humidity: 88 },
  { label: "실내권장",      pm25: 160, temp: 20, humidity: 50 },
];

export default function TestPage() {
  const [pace, setPace]               = useState<PaceInputType>(DEFAULT_PACE);
  const [pm25, setPm25]               = useState(22);
  const [temp, setTemp]               = useState(22);
  const [humidity, setHumidity]       = useState(65);
  const [weatherEnabled, setWeatherEnabled] = useState(false);
  const [locationModalOpen, setLocationModalOpen] = useState(false);
  const [location, setLocation] = useState<{ lat: number; lng: number; name: string } | null>(null);

  const result: Recommendation = calcRecommendation(
    pace,
    pm25,
    weatherEnabled ? temp : undefined,
    weatherEnabled ? humidity : undefined
  );

  function applyPreset(p: Preset) {
    setPm25(p.pm25);
    setTemp(p.temp);
    setHumidity(p.humidity);
  }

  return (
    <main className="min-h-screen px-4 py-8" style={{ background: "var(--bg)" }}>
      <div className="max-w-lg mx-auto flex flex-col gap-6">

        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-black" style={{ color: "var(--text-primary)" }}>RunAir — 테스트</h1>
            <p className="text-xs" style={{ color: "var(--text-secondary)" }}>수동 입력으로 계산 결과 확인</p>
          </div>
          <a href="/" className="text-xs underline" style={{ color: "var(--grade-great)" }}>← 실서비스</a>
        </div>

        {/* 위치 선택 */}
        <button
          onClick={() => setLocationModalOpen(true)}
          className="w-full flex items-center justify-between px-4 py-3 rounded-2xl text-sm"
          style={{ background: "var(--surface)", border: "1px solid var(--border)" }}
        >
          <span style={{ color: "var(--text-secondary)" }}>위치</span>
          <span style={{ color: location ? "var(--text-primary)" : "var(--text-secondary)" }}>
            {location ? location.name : "위치를 선택하세요"} →
          </span>
        </button>

        <LocationModal
          isOpen={locationModalOpen}
          onClose={() => setLocationModalOpen(false)}
          onConfirm={(loc) => setLocation(loc)}
          current={location ?? undefined}
        />

        {/* Presets */}
        <section className="rounded-2xl p-4" style={{ background: "var(--surface)", border: "1px solid var(--border)" }}>
          <p className="text-xs font-semibold mb-3" style={{ color: "var(--text-secondary)" }}>빠른 시나리오</p>
          <div className="flex flex-wrap gap-2">
            {PRESETS.map((p) => (
              <button
                key={p.label}
                onClick={() => applyPreset(p)}
                className="text-xs px-3 py-1.5 rounded-full transition-colors"
                style={{ border: "1px solid var(--border)", color: "var(--text-secondary)" }}
              >
                {p.label}
              </button>
            ))}
          </div>
        </section>

        {/* Inputs */}
        <section className="rounded-2xl p-4 flex flex-col gap-5" style={{ background: "var(--surface)", border: "1px solid var(--border)" }}>
          <p className="text-xs font-semibold" style={{ color: "var(--text-secondary)" }}>입력값</p>

          <PaceInput value={pace} onChange={setPace} />

          <ColoredSlider
            label="PM2.5" unit=" ㎍/㎥"
            min={PM25_RANGE.min} max={PM25_RANGE.max} value={pm25}
            stops={PM25_STOPS} colorMode="absolute"
            onChange={setPm25}
          />

          {/* Weather toggle */}
          <div className="flex items-center gap-3">
            <span className="text-sm" style={{ color: "var(--text-secondary)" }}>온도/습도 보정</span>
            <button
              onClick={() => setWeatherEnabled(!weatherEnabled)}
              className="relative w-11 h-6 rounded-full transition-colors"
              style={{ background: weatherEnabled ? "var(--grade-great)" : "var(--border)" }}
            >
              <span
                className="absolute top-1 left-1 w-4 h-4 rounded-full shadow transition-transform"
                style={{
                  background: "var(--text-primary)",
                  transform: weatherEnabled ? "translateX(20px)" : "translateX(0)",
                }}
              />
            </button>
          </div>

          {weatherEnabled && (
            <>
              <ColoredSlider
                label="기온" unit="°C"
                min={TEMP_RANGE.min} max={TEMP_RANGE.max} value={temp}
                stops={TEMP_STOPS} colorMode="absolute"
                onChange={setTemp}
              />
              <ColoredSlider
                label="습도" unit="%"
                min={HUM_RANGE.min} max={HUM_RANGE.max} value={humidity}
                stops={HUM_STOPS} colorMode="absolute"
                onChange={setHumidity}
              />
            </>
          )}
        </section>

        {/* Result */}
        <section className="flex flex-col items-center gap-2">
          <p className="text-xs font-semibold self-start" style={{ color: "var(--text-secondary)" }}>결과</p>
          <ResultCard
            result={result}
            pm25={pm25}
            stationName="테스트"
            isMock={false}
            temp={weatherEnabled ? temp : undefined}
            humidity={weatherEnabled ? humidity : undefined}
            basePace={pace}
          />
        </section>

        {/* Debug */}
        <details className="rounded-2xl p-4 text-xs" style={{ background: "var(--surface)", border: "1px solid var(--border)", color: "var(--text-secondary)" }}>
          <summary className="cursor-pointer font-semibold">계산 상세 (디버그)</summary>
          <pre className="mt-3 whitespace-pre-wrap break-all">
            {JSON.stringify({ input: { pace, pm25, temp: weatherEnabled ? temp : null, humidity: weatherEnabled ? humidity : null }, result }, null, 2)}
          </pre>
        </details>

      </div>
    </main>
  );
}
