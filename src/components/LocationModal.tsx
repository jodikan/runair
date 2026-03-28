/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import { useEffect, useRef, useState } from "react";

interface Location {
  lat: number;
  lng: number;
  name: string;
}

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (loc: Location) => void;
  current?: Location;
}

const KAKAO_KEY = process.env.NEXT_PUBLIC_KAKAO_MAP_KEY;

declare global {
  interface Window { kakao: any; }
}

export default function LocationModal({ isOpen, onClose, onConfirm, current }: Props) {
  const pendingSearch = useRef<string | null>(null);

  const [query, setQuery]           = useState("");
  const [results, setResults]       = useState<any[]>([]);
  const [selected, setSelected]     = useState<Location | null>(current ?? null);
  const [sdkReady, setSdkReady]     = useState(false);
  const [gpsLoading, setGpsLoading] = useState(false);
  const [showBelow, setShowBelow]   = useState(false); // 검색 후 하단 영역 표시

  // SDK 로드
  useEffect(() => {
    if (!isOpen || !KAKAO_KEY) return;
    // services까지 초기화된 경우만 바로 사용
    if (window.kakao?.maps?.services) { setSdkReady(true); return; }
    // 스크립트는 로드됐지만 kakao.maps.load()가 아직 안 불린 경우
    if (window.kakao?.maps) {
      window.kakao.maps.load(() => setSdkReady(true));
      return;
    }
    // 최초 로드
    const script = document.createElement("script");
    script.src = `//dapi.kakao.com/v2/maps/sdk.js?appkey=${KAKAO_KEY}&libraries=services&autoload=false`;
    script.onload = () => {
      window.kakao.maps.load(() => setSdkReady(true));
    };
    script.onerror = () => console.error("[LocationModal] Kakao SDK 로드 실패");
    document.head.appendChild(script);
  }, [isOpen]);

  // SDK 준비 완료 → 대기 중인 검색 실행
  useEffect(() => {
    if (!sdkReady || !pendingSearch.current) return;
    doSearch(pendingSearch.current);
    pendingSearch.current = null;
  }, [sdkReady]);

  function doSearch(q: string) {
    const ps = new window.kakao.maps.services.Places();
    ps.keywordSearch(q, (data: any[], status: string) => {
      setResults(status === window.kakao.maps.services.Status.OK ? data.slice(0, 5) : []);
    });
  }

  function handleSearch() {
    if (!query.trim()) return;
    setShowBelow(true);
    setResults([]);
    if (!sdkReady) {
      pendingSearch.current = query; // SDK 준비되면 자동 실행
      return;
    }
    doSearch(query);
  }

  function handleSelect(place: any) {
    const lat = parseFloat(place.y);
    const lng = parseFloat(place.x);
    const loc = { lat, lng, name: place.place_name };
    setSelected(loc);
    setResults([]);
    setQuery(place.place_name);
  }

  function handleGps() {
    if (!navigator.geolocation) return;
    setGpsLoading(true);
    setShowBelow(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const lat = pos.coords.latitude;
        const lng = pos.coords.longitude;

        // 역지오코딩으로 실제 지역명 조회
        if (sdkReady && window.kakao?.maps?.services) {
          const geocoder = new window.kakao.maps.services.Geocoder();
          geocoder.coord2RegionCode(lng, lat, (result: any[], status: string) => {
            const name =
              status === window.kakao.maps.services.Status.OK && result[0]
                ? `${result[0].region_2depth_name} ${result[0].region_3depth_name}`.trim()
                : "현재 위치";
            const loc = { lat, lng, name };
            setSelected(loc);
            setQuery(name);
            setGpsLoading(false);
          });
        } else {
          const loc = { lat, lng, name: "현재 위치" };
          setSelected(loc);
          setQuery("현재 위치");
          setGpsLoading(false);
        }
      },
      () => setGpsLoading(false)
    );
  }

  function handleConfirm() {
    if (!selected) return;
    onConfirm(selected);
    onClose();
  }

  function handleClose() {
    setResults([]);
    onClose();
  }

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center"
      style={{ background: "rgba(0,0,0,0.6)" }}
      onClick={(e) => { if (e.target === e.currentTarget) handleClose(); }}
    >
      <div
        className="w-full max-w-md mx-4 rounded-2xl flex flex-col"
        style={{ background: "var(--surface)", border: "1px solid var(--border)", maxHeight: "90vh" }}
      >
        {/* 헤더 */}
        <div className="flex items-center justify-between px-5 pt-5 pb-3">
          <span className="font-semibold" style={{ color: "var(--text-primary)" }}>위치 검색</span>
          <button onClick={handleClose} style={{ color: "var(--text-secondary)" }} className="text-xl leading-none">✕</button>
        </div>

        <div className="flex flex-col gap-3 px-5 pb-5 overflow-y-auto">
          {!KAKAO_KEY ? (
            <div className="py-10 text-center text-sm" style={{ color: "var(--text-secondary)" }}>
              카카오맵 API 키가 설정되지 않았습니다.<br />
              <code className="text-xs" style={{ color: "var(--grade-moderate)" }}>NEXT_PUBLIC_KAKAO_MAP_KEY</code>를 .env.local에 추가해주세요.
            </div>
          ) : (
            <>
              {/* 검색 입력 */}
              <div className="flex gap-2">
                <input
                  type="text"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleSearch()}
                  placeholder="장소 또는 주소 검색"
                  className="flex-1 px-3 py-2 rounded-xl outline-none"
                  style={{
                    fontSize: "16px",
                    background: "var(--bg)",
                    border: "1px solid var(--border)",
                    color: "var(--text-primary)",
                  }}
                />
                <button
                  onClick={handleSearch}
                  className="px-4 py-2 rounded-xl text-sm font-semibold shrink-0 whitespace-nowrap"
                  style={{ background: "var(--grade-great)", color: "#0f1117" }}
                >
                  검색
                </button>
              </div>

              {/* 현재 위치 버튼 — 검색 전에도 항상 표시 */}
              {!showBelow && (
                <button
                  onClick={handleGps}
                  disabled={gpsLoading}
                  className="w-full py-2.5 rounded-xl text-sm"
                  style={{ border: "1px solid var(--border)", color: "var(--text-secondary)" }}
                >
                  {gpsLoading ? "위치 확인중..." : "현재 위치 사용"}
                </button>
              )}

              {/* 검색 후 영역 */}
              {showBelow && (
                <>
                  {/* 검색 결과 */}
                  {results.length > 0 && (
                    <ul className="rounded-xl overflow-hidden" style={{ border: "1px solid var(--border)" }}>
                      {results.map((place, i) => (
                        <li key={i}>
                          <button
                            onClick={() => handleSelect(place)}
                            className="w-full text-left px-4 py-3 text-sm transition-colors hover:opacity-80"
                            style={{
                              background: "var(--bg)",
                              color: "var(--text-primary)",
                              borderBottom: i < results.length - 1 ? "1px solid var(--border)" : "none",
                            }}
                          >
                            <div className="font-medium">{place.place_name}</div>
                            <div className="text-xs mt-0.5" style={{ color: "var(--text-secondary)" }}>{place.address_name}</div>
                          </button>
                        </li>
                      ))}
                    </ul>
                  )}

                  {/* 선택된 위치 */}
                  {selected && (
                    <div className="text-xs px-1" style={{ color: "var(--text-secondary)" }}>
                      선택된 위치: <span style={{ color: "var(--text-primary)" }}>{selected.name}</span>
                    </div>
                  )}

                  {/* 하단 버튼 */}
                  <div className="flex gap-2 pt-1">
                    <button
                      onClick={handleGps}
                      disabled={gpsLoading}
                      className="flex-1 py-2.5 rounded-xl text-sm"
                      style={{ border: "1px solid var(--border)", color: "var(--text-secondary)" }}
                    >
                      {gpsLoading ? "위치 확인중..." : "현재 위치"}
                    </button>
                    <button
                      onClick={handleConfirm}
                      disabled={!selected}
                      className="flex-1 py-2.5 rounded-xl text-sm font-semibold"
                      style={{
                        background: selected ? "var(--grade-great)" : "var(--border)",
                        color: selected ? "#0f1117" : "var(--text-secondary)",
                      }}
                    >
                      확인
                    </button>
                  </div>
                </>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
