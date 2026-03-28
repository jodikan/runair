// 슬라이더 색상 구간 — CSS var(--slider-gradient) 를 트랙에 그대로 사용
// 각 슬라이더별 min/max 정보만 상수로 관리

export const PM25_RANGE  = { min: 0,   max: 200 } as const;
export const TEMP_RANGE  = { min: 0,   max: 40  } as const;
export const HUM_RANGE   = { min: 15,  max: 100 } as const;
