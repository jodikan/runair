"use client";

import { Recommendation } from "@/types";
import { formatPace } from "@/lib/paceCalc";

const gradeConfig = {
  good:     { label: "좋음",    color: "var(--grade-great)"    },
  moderate: { label: "보통",    color: "var(--grade-good)"     },
  bad:      { label: "나쁨",    color: "var(--grade-bad)"      },
  veryBad:  { label: "매우나쁨", color: "var(--grade-very-bad)" },
  indoor:   { label: "실내권장", color: "var(--grade-very-bad)" },
};

interface Props {
  result: Recommendation;
  pm25: number;
  stationName?: string;
  isMock?: boolean;
}

export default function ResultCard({ result, pm25, stationName, isMock }: Props) {
  const cfg = gradeConfig[result.pm25Grade];

  return (
    <div
      className="rounded-2xl p-6 w-full max-w-sm"
      style={{
        background: "var(--surface)",
        border: result.pm25Grade === "indoor"
          ? "1px solid var(--grade-very-bad)"
          : "1px solid var(--border)",
      }}
    >
      {isMock && (
        <div className="text-xs mb-2" style={{ color: "var(--text-secondary)" }}>
          * 개발 목업 데이터
        </div>
      )}

      {/* Header */}
      <div className="flex items-center justify-between mb-5">
        <span className="text-sm" style={{ color: "var(--text-secondary)" }}>
          PM2.5 {pm25} ㎍/㎥{stationName ? ` (${stationName})` : ""}
        </span>
        <span
          className="text-xs font-bold px-2.5 py-1 rounded-full"
          style={{ color: cfg.color, border: `1px solid ${cfg.color}`, background: "transparent" }}
        >
          {cfg.label}
        </span>
      </div>

      {result.pm25Grade === "indoor" || (result.maxMinutes === null && result.warning) ? (
        <div className="text-center py-4">
          <div className="text-4xl mb-2">🏠</div>
          <p className="font-semibold" style={{ color: cfg.color }}>실내 운동을 권장합니다.</p>
          <p className="text-sm mt-1" style={{ color: cfg.color }}>대기 및 기상 상태가 운동하기에<br />적합하지 않습니다.</p>
        </div>
      ) : (
        <>
          {/* Pace */}
          <div className="text-center mb-5">
            <div className="text-xs mb-1" style={{ color: "var(--text-secondary)" }}>권장 페이스</div>
            <div
              className="tracking-tight leading-none"
              style={{
                fontFamily: "var(--font-bebas)",
                fontSize: "5rem",
                color: cfg.color,
              }}
            >
              {formatPace(result.adjustedPace)}
            </div>
            <div className="text-sm mt-1" style={{ color: "var(--text-secondary)" }}>/km</div>
          </div>

          {/* Time */}
          <div className="text-center">
            <div className="text-xs mb-1" style={{ color: "var(--text-secondary)" }}>최대 운동 시간</div>
            <div
              className="text-4xl font-bold"
              style={{ color: cfg.color }}
            >
              {result.maxMinutes === null ? "무제한" : `${result.maxMinutes}분`}
            </div>
          </div>

          {result.warning && (
            <p className="mt-3 text-xs text-center" style={{ color: cfg.color }}>{result.warning}</p>
          )}
        </>
      )}
    </div>
  );
}
