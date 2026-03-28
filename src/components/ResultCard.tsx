"use client";

import { useState } from "react";
import { Recommendation, PaceInput } from "@/types";
import { formatPace } from "@/lib/paceCalc";

const gradeConfig = {
  good:     { label: "좋음",    color: "var(--grade-great)"    },
  moderate: { label: "보통",    color: "var(--grade-good)"     },
  bad:      { label: "나쁨",    color: "var(--grade-bad)"      },
  veryBad:  { label: "매우나쁨", color: "var(--grade-very-bad)" },
  indoor:   { label: "실내권장", color: "var(--grade-very-bad)" },
};

// PM2.5 등급별 상한선 (paceCalc.ts와 동기화)
const PM25_CAP: Partial<Record<Recommendation["pm25Grade"], PaceInput>> = {
  bad:     { minutes: 6, seconds: 30 },
  veryBad: { minutes: 7, seconds: 30 },
};

interface Props {
  result: Recommendation;
  pm25: number;
  stationName?: string;
  isMock?: boolean;
  temp?: number;
  humidity?: number;
  basePace?: PaceInput;
}

type BreakdownItem = {
  label: string;
  right: string;
  color: string;
};

function buildBreakdown(
  grade: Recommendation["pm25Grade"],
  pm25: number,
  basePace: PaceInput | undefined,
  temp: number | undefined,
  humidity: number | undefined
): { items: BreakdownItem[]; pm25Capped: boolean } {
  const items: BreakdownItem[] = [];

  // PM2.5 상한선 적용 여부
  const cap = PM25_CAP[grade];
  const capSec = cap ? cap.minutes * 60 + cap.seconds : Infinity;
  const baseSec = basePace ? basePace.minutes * 60 + basePace.seconds : Infinity;
  const pm25Capped = cap != null && baseSec < capSec;

  // PM2.5 행
  let pm25BaseMax: number | null = null;
  if (grade === "moderate") pm25BaseMax = 60;
  if (grade === "bad")      pm25BaseMax = 40;
  if (grade === "veryBad")  pm25BaseMax = 20;

  const pm25Right = pm25Capped && cap
    ? `상한 ${formatPace(cap)}/km 적용 · 기준 ${pm25BaseMax}분`
    : [
        pm25BaseMax !== null ? "페널티 없음" : "페널티 없음",
        pm25BaseMax !== null ? `기준 ${pm25BaseMax}분` : "무제한",
      ].join(" · ");

  items.push({
    label: `PM2.5 ${pm25}㎍/㎥ (${gradeConfig[grade].label})`,
    right: pm25Right,
    color: pm25Capped
      ? "var(--grade-very-bad)"
      : grade === "bad" || grade === "veryBad"
        ? "var(--grade-bad)"
        : "var(--text-secondary)",
  });

  // PM2.5 상한선 적용된 경우 기상 보정 미적용 안내
  if (pm25Capped) {
    items.push({
      label: "기온·습도",
      right: "PM2.5 상한선 적용으로 미적용",
      color: "var(--text-secondary)",
    });
    return { items, pm25Capped };
  }

  // 기온 행
  if (temp !== undefined) {
    let tPace = 0, tTime = 0, zone = "";
    if (temp < 5)       { tPace = 30; tTime = 15; zone = "0~5도"; }
    else if (temp < 10) { tPace = 15; tTime = 10; zone = "5~10도"; }
    else if (temp < 22) { zone = "최적"; }
    else if (temp < 28) { tPace = 15; tTime = 10; zone = "22~28도"; }
    else if (temp < 33) { tPace = 30; tTime = 15; zone = "28~33도"; }
    else                { tPace = 45; tTime = 20; zone = "33도+"; }
    const parts: string[] = [];
    if (tPace > 0) parts.push(`+${tPace}초/km`);
    if (tTime > 0) parts.push(`-${tTime}분`);
    items.push({
      label: `기온 ${temp}°C (${zone})`,
      right: parts.length ? parts.join(" · ") : "페널티 없음",
      color: tPace >= 30 ? "var(--grade-very-bad)" : tPace > 0 || tTime > 0 ? "var(--grade-bad)" : "var(--text-secondary)",
    });
  }

  // 습도 행
  if (humidity !== undefined) {
    let hPace = 0, hTime = 0, zone = "";
    if (humidity < 30)       { hTime = 5;  zone = "건조"; }
    else if (humidity <= 70) { zone = "최적"; }
    else if (humidity < 85)  { hTime = 10; zone = "70~85%"; }
    else                     { hPace = 15; hTime = 15; zone = "85%+"; }
    const parts: string[] = [];
    if (hPace > 0) parts.push(`+${hPace}초/km`);
    if (hTime > 0) parts.push(`-${hTime}분`);
    items.push({
      label: `습도 ${humidity}% (${zone})`,
      right: parts.length ? parts.join(" · ") : "페널티 없음",
      color: hPace > 0 ? "var(--grade-very-bad)" : hTime > 0 ? "var(--grade-bad)" : "var(--text-secondary)",
    });
  }

  return { items, pm25Capped };
}

export default function ResultCard({ result, pm25, stationName, isMock, temp, humidity, basePace }: Props) {
  const cfg = gradeConfig[result.pm25Grade];
  const [open, setOpen] = useState(false);

  const showBreakdown = result.pm25Grade !== "indoor" && !(result.maxMinutes === null && result.warning);
  const { items: breakdown } = showBreakdown
    ? buildBreakdown(result.pm25Grade, pm25, basePace, temp, humidity)
    : { items: [] };

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
              style={{ fontFamily: "var(--font-bebas)", fontSize: "5rem", color: cfg.color }}
            >
              {formatPace(result.adjustedPace)}
            </div>
            <div className="text-sm mt-1" style={{ color: "var(--text-secondary)" }}>/km</div>
          </div>

          {/* Time */}
          <div className="text-center">
            <div className="text-xs mb-1" style={{ color: "var(--text-secondary)" }}>최대 운동 시간</div>
            <div className="text-4xl font-bold" style={{ color: cfg.color }}>
              {result.maxMinutes === null ? "무제한" : `${result.maxMinutes}분`}
            </div>
          </div>

          {result.warning && (
            <p className="mt-3 text-xs text-center" style={{ color: cfg.color }}>{result.warning}</p>
          )}

          {/* 계산 근거 토글 */}
          <div className="mt-5">
            <button
              onClick={() => setOpen(!open)}
              className="w-full flex items-center justify-between text-xs py-1"
              style={{ color: "var(--text-secondary)" }}
            >
              <span>이 페이스가 나온 이유</span>
              <span style={{ fontSize: "0.6rem" }}>{open ? "▲" : "▼"}</span>
            </button>

            {open && (
              <div className="mt-2 flex flex-col gap-1.5">
                {breakdown.map((row, i) => (
                  <div key={i} className="flex justify-between text-xs" style={{ color: row.color }}>
                    <span>{row.label}</span>
                    <span className="text-right ml-2 shrink-0">{row.right}</span>
                  </div>
                ))}

                <div className="border-t my-1" style={{ borderColor: "var(--border)" }} />

                {/* 최종 */}
                <div className="flex justify-between text-xs font-semibold" style={{ color: cfg.color }}>
                  <span>최종</span>
                  <span className="text-right ml-2 shrink-0">
                    {formatPace(result.adjustedPace)}/km · {result.maxMinutes === null ? "무제한" : `${result.maxMinutes}분`}
                  </span>
                </div>

                {/* 면책 문구 */}
                <div className="border-t mt-1 pt-2" style={{ borderColor: "var(--border)" }}>
                  <p className="text-xs leading-relaxed" style={{ color: "var(--text-secondary)", opacity: 0.6 }}>
                    ※ RunAir 페이스 가이드 안내<br />
                    · PM2.5 기준 페이스는 상한선으로 강제 적용됩니다<br />
                    · 기온·습도 보정은 참고용이며 개인차가 있을 수 있습니다<br />
                    · 학술 연구 기반 설계이나 의학적 처방이 아닙니다<br />
                    · 이상 증상 시 즉시 운동을 중단하세요
                  </p>
                </div>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}
