export type PaceInput = { minutes: number; seconds: number };

export type Recommendation = {
  adjustedPace: PaceInput;
  maxMinutes: number | null;
  warning?: string;
  pm25Grade: "good" | "moderate" | "bad" | "veryBad" | "indoor";
};

export type AirQualityData = {
  pm25: number;
  stationName: string;
  dataTime: string;
};

export type WeatherData = {
  temp: number;
  humidity: number;
};
