"use client";

import { useState } from "react";
import type { Brief } from "@/lib/types";

// 북극성: "챗팅으로 자연어" — 관성적 폼 대신 자연어로 사업을 말하면 AI가 폼을 채움
export default function NLBriefInput({ onParsed }: { onParsed: (brief: Brief) => void }) {
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);

  async function parse() {
    const t = text.trim();
    if (!t || busy) return;
    setBusy(true);
    try {
      const res = await fetch("/api/parse-brief", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: t }),
      });
      const json = await res.json();
      if (json.brief) onParsed(json.brief as Brief);
    } catch (e) {
      console.error("[parse-brief] failed", e);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="mb-4 rounded-xl border border-white/10 bg-white/[0.03] p-3">
      <div className="mb-1.5 flex items-center justify-between">
        <span className="text-xs font-medium text-white/60">자연어로 사업 설명</span>
        <span className="text-[10px] text-white/30">{busy ? "분석 중…" : "AI가 아래 폼을 채웁니다"}</span>
      </div>
      <textarea
        value={text}
        onChange={(e) => setText(e.target.value)}
        placeholder='예) "수의사가 검수한 맞춤 반려동물 사료를 1인가구에 월구독으로 배송하는 사업. 1년 안에 매출 30억 목표, 인건비 2.4억 예산, 팝업 등 오프라인 있음"'
        className="min-h-[72px] w-full resize-y rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-white/90 placeholder-white/30 outline-none focus:border-white/30"
      />
      <button
        onClick={parse}
        disabled={busy || !text.trim()}
        className="mt-2 w-full rounded-lg bg-lane-ai/90 px-4 py-2 text-sm font-semibold text-white transition hover:opacity-90 disabled:opacity-40"
      >
        {busy ? "AI가 폼 채우는 중…" : "AI로 폼 채우기"}
      </button>
    </div>
  );
}
