import { PaceInput, Recommendation } from "@/types";

function addSecondsTopace(pace: PaceInput, seconds: number): PaceInput {
  const total = pace.minutes * 60 + pace.seconds + seconds;
  return { minutes: Math.floor(total / 60), seconds: total % 60 };
}

function pm25Grade(pm25: number): Recommendation["pm25Grade"] {
  if (pm25 <= 15) return "good";
  if (pm25 <= 35) return "moderate";
  if (pm25 <= 75) return "bad";
  if (pm25 <= 150) return "veryBad";
  return "indoor";
}

// PM2.5 등급별 페이스 상한선 (초 단위)
const PM25_CAP: Partial<Record<Recommendation["pm25Grade"], PaceInput>> = {
  bad:     { minutes: 6, seconds: 30 }, // 390초
  veryBad: { minutes: 7, seconds: 30 }, // 450초
};

export function calcRecommendation(
  pace: PaceInput,
  pm25: number,
  temp?: number,
  humidity?: number
): Recommendation {
  const grade = pm25Grade(pm25);

  if (grade === "indoor") {
    return {
      adjustedPace: pace,
      maxMinutes: null,
      warning: "실내 운동을 권장합니다 (PM2.5 매우 나쁨)",
      pm25Grade: "indoor",
    };
  }

  // PM2.5 기준 최대 운동 시간
  let maxMinutes: number | null = null;
  if (grade === "moderate") maxMinutes = 60;
  else if (grade === "bad")     maxMinutes = 40;
  else if (grade === "veryBad") maxMinutes = 20;

  // PM2.5 페이스 상한선 적용
  const cap = PM25_CAP[grade];
  const inputSec = pace.minutes * 60 + pace.seconds;
  const capSec   = cap ? cap.minutes * 60 + cap.seconds : Infinity;

  if (cap && inputSec < capSec) {
    // 입력 페이스가 상한선보다 빠름 → 상한선 강제 적용, 기온/습도 페널티 미적용
    return {
      adjustedPace: cap,
      maxMinutes,
      pm25Grade: grade,
    };
  }

  // 입력 페이스가 상한선 이하 → 기온/습도 페널티 합산
  let pacePenalty = 0;

  if (temp !== undefined && humidity !== undefined) {
    // 기온 페널티
    let tempPenalty = 0;
    let tempTimeReduction = 0;
    if (temp < 5)       { tempPenalty = 30; tempTimeReduction = 15; }
    else if (temp < 10) { tempPenalty = 15; tempTimeReduction = 10; }
    else if (temp < 22) { /* 최적 구간 */ }
    else if (temp < 28) { tempPenalty = 15; tempTimeReduction = 10; }
    else if (temp < 33) { tempPenalty = 30; tempTimeReduction = 15; }
    else                { tempPenalty = 45; tempTimeReduction = 20; }

    // 습도 페널티
    let humPenalty = 0;
    let humTimeReduction = 0;
    if (humidity >= 85)     { humPenalty = 15; humTimeReduction = 15; }
    else if (humidity > 70) { humTimeReduction = 10; }
    else if (humidity < 30) { humTimeReduction = 5; }

    pacePenalty += tempPenalty + humPenalty;

    const totalReduction = tempTimeReduction + humTimeReduction;
    if (totalReduction > 0) {
      if (maxMinutes === null) maxMinutes = 60;
      maxMinutes -= totalReduction;
    }

    if (maxMinutes !== null && maxMinutes < 10) {
      return {
        adjustedPace: pace,
        maxMinutes: null,
        warning: "기상 조건이 매우 좋지 않습니다. 실내 운동을 권장합니다.",
        pm25Grade: grade,
      };
    }
  }

  return {
    adjustedPace: addSecondsTopace(pace, pacePenalty),
    maxMinutes,
    pm25Grade: grade,
  };
}

export function formatPace(pace: PaceInput): string {
  return `${pace.minutes}:${String(pace.seconds).padStart(2, "0")}`;
}

export function parsePace(str: string): PaceInput | null {
  const match = str.match(/^(\d{1,2}):(\d{2})$/);
  if (!match) return null;
  const minutes = parseInt(match[1], 10);
  const seconds = parseInt(match[2], 10);
  if (seconds >= 60) return null;
  return { minutes, seconds };
}
