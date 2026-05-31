"use client";

import { useState } from "react";
import type { ClarifyQuestion } from "@/app/api/clarify/route";

export default function ClarifyStep({
  questions,
  loading,
  degraded,
  onConfirm,
  onSkip,
}: {
  questions: ClarifyQuestion[];
  loading: boolean;
  degraded: boolean;
  onConfirm: (context: string) => void;
  onSkip: () => void;
}) {
  const [idx, setIdx] = useState(0);
  const [answers, setAnswers] = useState<Record<string, string[]>>({});
  const [extra, setExtra] = useState("");

  const isLast = questions.length > 0 && idx >= questions.length - 1;
  const cur = questions[idx];
  const curAns = (cur && answers[cur.id]) || [];

  function toggle(opt: string) {
    if (!cur) return;
    setAnswers((a) => {
      const set = new Set(a[cur.id] ?? []);
      if (set.has(opt)) set.delete(opt);
      else set.add(opt);
      return { ...a, [cur.id]: Array.from(set) };
    });
  }

  function advance() {
    if (!isLast) {
      setIdx((i) => i + 1);
      return;
    }
    const lines = questions
      .map((q) => (answers[q.id]?.length ? `- ${q.question} → ${answers[q.id].join(", ")}` : null))
      .filter(Boolean) as string[];
    if (extra.trim()) lines.push(`- 추가 설명 → ${extra.trim()}`);
    onConfirm(lines.join("\n"));
  }

  return (
    <div className="rounded-xl border border-violet-200 bg-violet-50/40 p-4 shadow-sm">
      <div className="mb-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="rounded-full bg-violet-600 px-2 py-0.5 text-[10px] font-bold text-white">AI 대화</span>
          <h3 className="text-sm font-semibold text-slate-700">설계 전, 대화로 방향을 확정할게요</h3>
        </div>
        {!loading && questions.length > 0 && (
          <span className="text-[11px] font-medium text-violet-600">
            질문 {idx + 1} / {questions.length}
          </span>
        )}
      </div>

      {loading ? (
        <div className="flex items-center gap-2 py-6 text-xs text-slate-400">
          <span className="flex gap-1">
            <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-violet-400" />
            <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-violet-400" style={{ animationDelay: "0.15s" }} />
            <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-violet-400" style={{ animationDelay: "0.3s" }} />
          </span>
          AI가 질문을 준비 중…
        </div>
      ) : !cur ? (
        <p className="py-4 text-xs text-slate-400">질문이 없습니다.</p>
      ) : (
        <div className="space-y-3">
          {/* 지난 문답 (채팅 히스토리) */}
          {questions.slice(0, idx).map((q) => (
            <div key={q.id} className="space-y-1">
              <div className="max-w-[85%] rounded-2xl rounded-tl-sm bg-white px-3 py-2 text-xs text-slate-600 ring-1 ring-slate-200">
                {q.question}
              </div>
              <div className="ml-auto max-w-[85%] rounded-2xl rounded-tr-sm bg-violet-600 px-3 py-2 text-right text-xs text-white">
                {answers[q.id]?.length ? answers[q.id].join(", ") : "건너뜀"}
              </div>
            </div>
          ))}

          {/* 현재 질문 (AI 말풍선 + 복수선택) */}
          <div className="max-w-[90%] rounded-2xl rounded-tl-sm bg-white px-3 py-2 text-sm text-slate-700 ring-1 ring-slate-200">
            {cur.question}
            <span className="ml-1 text-[10px] text-slate-400">(복수 선택 가능)</span>
          </div>
          <div className="flex flex-wrap gap-1.5">
            {cur.options.map((opt) => (
              <button
                key={opt}
                onClick={() => toggle(opt)}
                className={`rounded-full px-3 py-1.5 text-[11px] font-medium transition ${
                  curAns.includes(opt)
                    ? "bg-violet-600 text-white"
                    : "bg-white text-slate-600 ring-1 ring-slate-200 hover:ring-violet-300"
                }`}
              >
                {curAns.includes(opt) ? "✓ " : ""}
                {opt}
              </button>
            ))}
          </div>

          {isLast && (
            <input
              value={extra}
              onChange={(e) => setExtra(e.target.value)}
              placeholder='추가 설명 (선택) — 예) "스트레치는 스포츠마사지·재활 전문가 중심"'
              className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs text-slate-800 placeholder-slate-400 outline-none focus:border-violet-400 focus:ring-2 focus:ring-violet-100"
            />
          )}

          <div className="flex gap-2 pt-1">
            <button
              onClick={advance}
              className="flex-1 rounded-lg bg-violet-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-violet-500"
            >
              {isLast ? "설계 시작 →" : "확정 / 다음"}
            </button>
            <button
              onClick={onSkip}
              className="rounded-lg border border-slate-300 bg-white px-4 py-2.5 text-sm font-medium text-slate-600 hover:bg-slate-50"
            >
              건너뛰기
            </button>
          </div>
          {degraded && <p className="text-[10px] text-amber-600">일반 질문으로 표시 중 (MISO 미응답)</p>}
        </div>
      )}
    </div>
  );
}
