"use client";

export type ColorStop = { pct: number; rgb: [number, number, number] };

// PM2.5 (0–200 ㎍/㎥) — 등급 임계값 기준
export const PM25_STOPS: ColorStop[] = [
  { pct: 0,    rgb: [0,   229, 160] }, // 0㎍   — 좋음
  { pct: 7.5,  rgb: [168, 224, 99]  }, // 15㎍  — 보통 경계
  { pct: 17.5, rgb: [255, 217, 61]  }, // 35㎍  — 나쁨 경계
  { pct: 37.5, rgb: [255, 154, 60]  }, // 75㎍  — 매우나쁨 경계
  { pct: 75,   rgb: [255, 71,  87]  }, // 150㎍ — 위험 경계
  { pct: 100,  rgb: [185, 28,  28]  }, // 200㎍ — 매우위험
];

// 기온 (0~40°C, 범위 40) — 28°C(70%), 33°C(82.5%) 페널티 시작
export const TEMP_STOPS: ColorStop[] = [
  { pct: 0,    rgb: [0,   229, 160] }, // 0°C  — 안전
  { pct: 70,   rgb: [255, 217, 61]  }, // 28°C — 페널티 시작
  { pct: 82.5, rgb: [255, 71,  87]  }, // 33°C — 강한 페널티
  { pct: 100,  rgb: [185, 28,  28]  }, // 40°C
];

// 습도 (15~100%, 범위 85) — 70%(64.7%), 85%(82.4%) 페널티 시작
export const HUM_STOPS: ColorStop[] = [
  { pct: 0,    rgb: [0,   229, 160] }, // 15%  — 안전
  { pct: 64.7, rgb: [255, 217, 61]  }, // 70%  — 페널티 시작
  { pct: 82.4, rgb: [255, 71,  87]  }, // 85%  — 강한 페널티
  { pct: 100,  rgb: [185, 28,  28]  }, // 100%
];

function lerpRGB(pct: number, stops: ColorStop[]): [number, number, number] {
  const c = Math.max(0, Math.min(100, pct));
  let lo = stops[0], hi = stops[stops.length - 1];
  for (let i = 0; i < stops.length - 1; i++) {
    if (c >= stops[i].pct && c <= stops[i + 1].pct) { lo = stops[i]; hi = stops[i + 1]; break; }
  }
  const t = lo.pct === hi.pct ? 0 : (c - lo.pct) / (hi.pct - lo.pct);
  return [
    Math.round(lo.rgb[0] + t * (hi.rgb[0] - lo.rgb[0])),
    Math.round(lo.rgb[1] + t * (hi.rgb[1] - lo.rgb[1])),
    Math.round(lo.rgb[2] + t * (hi.rgb[2] - lo.rgb[2])),
  ];
}

function stopsToGradient(stops: ColorStop[]): string {
  const parts = stops.map(({ pct, rgb }) => `rgb(${rgb[0]},${rgb[1]},${rgb[2]}) ${pct}%`);
  return `linear-gradient(to right, ${parts.join(", ")})`;
}

interface Props {
  min: number;
  max: number;
  value: number;
  onChange?: (v: number) => void;
  readOnly?: boolean;
  label: string;
  unit: string;
  stops?: ColorStop[];
  colorMode?: "gradient" | "absolute";
}

export default function ColoredSlider({
  min, max, value, onChange, readOnly = false, label, unit,
  stops = PM25_STOPS,
  colorMode = "gradient",
}: Props) {
  const pct = ((value - min) / (max - min)) * 100;
  const [r, g, b] = lerpRGB(pct, stops);
  const thumbColor = `rgb(${r},${g},${b})`;
  const thumbGlow  = `rgba(${r},${g},${b},0.35)`;
  const fullGradient = stopsToGradient(stops);

  // gradient: 그라디언트를 pct% 너비로 압축해서 채움
  // absolute: 전체 그라디언트를 100% 너비로 깔고, pct% 이후를 --border로 덮음
  //   → pct%까지는 "전체 스펙트럼에서 해당 좌표의 실제 색"이 보임
  const trackStyle = colorMode === "absolute"
    ? {
        backgroundImage: `linear-gradient(to right, transparent ${pct}%, var(--border) ${pct}%), ${fullGradient}`,
        backgroundSize: "100% 100%",
        backgroundRepeat: "no-repeat",
        backgroundColor: "var(--border)",
      }
    : {
        backgroundImage: fullGradient,
        backgroundSize: `${pct}% 100%`,
        backgroundRepeat: "no-repeat",
        backgroundColor: "var(--border)",
      };

  return (
    <div className="flex flex-col gap-1.5">
      {/* Label + value */}
      <div className="flex justify-between items-baseline">
        <span className="text-sm font-medium" style={{ color: "var(--text-secondary)" }}>
          {label}
        </span>
        <span className="text-sm font-bold" style={{ color: thumbColor }}>
          {value}{unit}
        </span>
      </div>

      {/* Slider container */}
      <div className="relative h-5 flex items-center">

        {/* Track */}
        <div
          className="absolute inset-x-0 h-3 rounded-full pointer-events-none"
          style={{
            top: "50%",
            transform: "translateY(-50%)",
            ...trackStyle,
          }}
        />

        {/* Custom thumb div */}
        <div
          className="absolute w-5 h-5 rounded-full pointer-events-none z-20"
          style={{
            left: `clamp(0px, calc(${pct}% - 10px), calc(100% - 20px))`,
            top: "50%",
            transform: "translateY(-50%)",
            background: "var(--surface)",
            border: `2.5px solid ${thumbColor}`,
            boxShadow: `0 0 0 4px ${thumbGlow}`,
            transition: "border-color 0.1s, box-shadow 0.1s",
          }}
        />

        {/* 네이티브 input — 인터랙션 전용 */}
        <input
          type="range"
          min={min}
          max={max}
          value={value}
          onChange={onChange ? (e) => onChange(Number(e.target.value)) : () => {}}
          className={`colored-track absolute inset-0 w-full z-10 ${readOnly ? "read-only pointer-events-none" : ""}`}
          style={{ height: "100%", opacity: 1 }}
        />
      </div>
    </div>
  );
}
