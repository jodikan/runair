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

  // Step 1: PM2.5 base adjustment
  let pacePenalty = 0; // seconds/km
  let maxMinutes: number | null = null;

  if (grade === "moderate") {
    maxMinutes = 60;
  } else if (grade === "bad") {
    pacePenalty = 30;
    maxMinutes = 40;
  } else if (grade === "veryBad") {
    pacePenalty = 60;
    maxMinutes = 20;
  }

  // Step 2: Temperature / humidity penalty (optional)
  if (temp !== undefined && humidity !== undefined) {
    if (temp >= 33) {
      pacePenalty += 30;
      maxMinutes = maxMinutes !== null ? maxMinutes - 20 : 40;
    } else if (temp >= 28) {
      pacePenalty += 15;
      maxMinutes = maxMinutes !== null ? maxMinutes - 10 : 50;
    }

    if (humidity >= 85) {
      pacePenalty += 15;
      maxMinutes = maxMinutes !== null ? maxMinutes - 15 : 45;
    } else if (humidity >= 70) {
      maxMinutes = maxMinutes !== null ? maxMinutes - 10 : 50;
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

  const adjustedPace = addSecondsTopace(pace, pacePenalty);

  return {
    adjustedPace,
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
