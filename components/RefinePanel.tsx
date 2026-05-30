"use client";

import { useState } from "react";

// 북극성② — 자연어 순환 수정 (연봉↑ / 예산 가정 / 산업 맥락 추가 → 아키텍트 재설계)
const PRESETS = [
  "예산을 2배로 가정하고 더 공격적으로 설계",
  "인건비를 30% 더 줄여 재설계",
  "이 산업은 콜드체인 물류가 핵심이다. 반영해 재설계",
  "AI로 더 많이 이전하고 인간은 최소 엣지만 남겨라",
];

export default function RefinePanel({
  onRefine,
  busy = false,
}: {
  onRefine: (instruction: string) => void;
  busy?: boolean;
}) {
  const [text, setText] = useState("");

  function submit() {
    const t = text.trim();
    if (!t || busy) return;
    onRefine(t);
    setText("");
  }

  return (
    <div className="rounded-xl border border-white/10 bg-white/[0.03] p-4">
      <div className="mb-2 flex items-center justify-between">
        <h2 className="text-sm font-semibold text-white/80">순환 수정 (자연어)</h2>
        <span className="text-xs text-white/35">{busy ? "재설계 중…" : "연봉·예산·산업맥락을 말로 바꿔보세요"}</span>
      </div>

      <div className="flex gap-2">
        <input
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && submit()}
          placeholder='예) "수의사 연봉을 7천으로 올려" / "예산 5억으로 가정해"'
          className="flex-1 rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-white/90 placeholder-white/30 outline-none focus:border-white/30"
        />
        <button
          onClick={submit}
          disabled={busy || !text.trim()}
          className="shrink-0 rounded-lg bg-lane-edge px-4 py-2 text-sm font-semibold text-white transition hover:opacity-90 disabled:opacity-40"
        >
          재설계
        </button>
      </div>

      <div className="mt-2 flex flex-wrap gap-1.5">
        {PRESETS.map((p) => (
          <button
            key={p}
            onClick={() => !busy && onRefine(p)}
            disabled={busy}
            className="rounded-full border border-white/10 bg-white/5 px-2.5 py-1 text-[11px] text-white/55 hover:text-white/90 disabled:opacity-40"
          >
            {p}
          </button>
        ))}
      </div>
    </div>
  );
}
