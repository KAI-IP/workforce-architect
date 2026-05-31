"use client";

import { useState } from "react";
import type { Brief } from "@/lib/types";

// 북극성: "챗팅으로 자연어" — 말로 사업을 설명하면 AI가 폼을 채움
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
    <div className="mb-4 rounded-xl border border-slate-200 bg-white p-3 shadow-sm">
      <div className="mb-1.5 flex items-center justify-between">
        <span className="text-xs font-medium text-slate-500">자연어로 사업 설명</span>
        <span className="text-[10px] text-slate-400">{busy ? "분석 중…" : "AI가 아래 폼을 채웁니다"}</span>
      </div>
      <textarea
        value={text}
        onChange={(e) => setText(e.target.value)}
        placeholder='예) "수의사가 검수한 맞춤 반려동물 사료를 1인가구에 월구독 배송. 1년 매출 30억, 인건비 2.4억, 팝업 등 오프라인 있음"'
        className="min-h-[68px] w-full resize-y rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-800 placeholder-slate-400 outline-none focus:border-teal-400 focus:ring-2 focus:ring-teal-100"
      />
      <button
        onClick={parse}
        disabled={busy || !text.trim()}
        className="mt-2 w-full rounded-lg bg-teal-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-teal-500 disabled:opacity-40"
      >
        {busy ? "AI가 폼 채우는 중…" : "AI로 폼 채우기"}
      </button>
    </div>
  );
}
