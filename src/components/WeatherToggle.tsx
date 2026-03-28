"use client";

import { WeatherData } from "@/types";

interface Props {
  enabled: boolean;
  onToggle: (v: boolean) => void;
  weather?: WeatherData;
  loading?: boolean;
}

export default function WeatherToggle({ enabled, onToggle, weather, loading }: Props) {
  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center gap-3">
        <span className="text-sm" style={{ color: "var(--text-secondary)" }}>온도/습도 보정</span>
        <button
          onClick={() => onToggle(!enabled)}
          className="relative w-11 h-6 rounded-full transition-colors"
          style={{ background: enabled ? "var(--grade-great)" : "var(--border)" }}
        >
          <span
            className="absolute top-1 left-1 w-4 h-4 rounded-full shadow transition-transform"
            style={{
              background: "var(--text-primary)",
              transform: enabled ? "translateX(20px)" : "translateX(0)",
            }}
          />
        </button>
      </div>

      {enabled && (
        <div className="text-xs" style={{ color: "var(--text-secondary)" }}>
          {loading ? (
            "날씨 정보 로딩중..."
          ) : weather ? (
            `기온 ${weather.temp}°C · 습도 ${weather.humidity}%`
          ) : (
            "날씨 정보를 불러올 수 없습니다"
          )}
        </div>
      )}
    </div>
  );
}
