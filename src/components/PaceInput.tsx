"use client";

import { useState, useEffect } from "react";
import { parsePace, formatPace } from "@/lib/paceCalc";
import { PaceInput as PaceInputType } from "@/types";

interface Props {
  value: PaceInputType;
  onChange: (pace: PaceInputType) => void;
}

export default function PaceInput({ value, onChange }: Props) {
  const [raw, setRaw] = useState(formatPace(value));
  const [error, setError] = useState(false);

  useEffect(() => {
    setRaw(formatPace(value));
  }, [value]);

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    const v = e.target.value;
    setRaw(v);
    const parsed = parsePace(v);
    if (parsed) {
      setError(false);
      onChange(parsed);
    } else {
      setError(true);
    }
  }

  return (
    <div className="flex flex-col gap-1">
      <label className="text-sm font-medium" style={{ color: "var(--text-secondary)" }}>
        기준 페이스 (분:초/km)
      </label>
      <input
        type="text"
        value={raw}
        onChange={handleChange}
        placeholder="5:30"
        className="w-32 text-center rounded-xl border-2 px-3 py-2 outline-none transition-colors"
        style={{
          fontFamily: "var(--font-bebas)",
          fontSize: "1.75rem",
          background: "var(--surface)",
          color: error ? "var(--grade-very-bad)" : "var(--text-primary)",
          borderColor: error ? "var(--grade-very-bad)" : "var(--border)",
        }}
      />
      {error && (
        <span className="text-xs" style={{ color: "var(--grade-very-bad)" }}>올바른 형식: 5:30</span>
      )}
    </div>
  );
}
