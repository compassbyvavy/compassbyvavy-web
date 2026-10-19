/**
 * Open-Meteo weather codes (WMO). No API key.
 * A bad-weather notice is regional. It is not a live badge on a listing.
 */

export type WeatherArea = {
  id: string;
  label: string;
  latitude: number;
  longitude: number;
};

/** City reference points for a regional check — not camp venues. */
export const WEATHER_AREAS: readonly WeatherArea[] = [
  { id: "mississauga", label: "Mississauga", latitude: 43.589, longitude: -79.644 },
  { id: "toronto", label: "Toronto", latitude: 43.6532, longitude: -79.3832 },
  { id: "brampton", label: "Brampton", latitude: 43.7315, longitude: -79.7624 },
  { id: "oakville", label: "Oakville", latitude: 43.4675, longitude: -79.6877 },
  { id: "vaughan", label: "Vaughan", latitude: 43.8361, longitude: -79.4983 },
  { id: "markham", label: "Markham", latitude: 43.8561, longitude: -79.337 },
  { id: "pickering", label: "Pickering", latitude: 43.8384, longitude: -79.0868 },
  { id: "oshawa", label: "Oshawa", latitude: 43.8971, longitude: -78.8658 },
];

export const WEATHER_AREA_STORAGE_KEY = "compass.weather.area.v1";

export function isInclementWeatherCode(code: number): boolean {
  if (!Number.isFinite(code)) return false;
  return (
    (code >= 51 && code <= 67) ||
    (code >= 71 && code <= 77) ||
    (code >= 80 && code <= 82) ||
    (code >= 85 && code <= 86) ||
    (code >= 95 && code <= 99)
  );
}

export function weatherPhrase(code: number): string {
  if (code === 0) return "clear";
  if (code <= 3) return "cloudy";
  if (code === 45 || code === 48) return "fog";
  if (isInclementWeatherCode(code)) return "wet or stormy";
  return "mixed";
}

export type RegionalWeather = {
  areaLabel: string;
  observedAt: string;
  weatherCode: number;
  inclement: boolean;
  phrase: string;
};

export function buildForecastUrl(area: WeatherArea): string {
  const params = new URLSearchParams({
    latitude: String(area.latitude),
    longitude: String(area.longitude),
    current: "weather_code,temperature_2m",
    timezone: "America/Toronto",
  });
  return `https://api.open-meteo.com/v1/forecast?${params.toString()}`;
}

export function parseOpenMeteoPayload(
  areaLabel: string,
  payload: unknown,
): RegionalWeather | null {
  if (!payload || typeof payload !== "object") return null;
  const current = (payload as { current?: unknown }).current;
  if (!current || typeof current !== "object") return null;
  const rec = current as Record<string, unknown>;
  const code = rec.weather_code;
  const time = rec.time;
  if (typeof code !== "number" || typeof time !== "string" || !time) return null;
  return {
    areaLabel,
    observedAt: time,
    weatherCode: code,
    inclement: isInclementWeatherCode(code),
    phrase: weatherPhrase(code),
  };
}
