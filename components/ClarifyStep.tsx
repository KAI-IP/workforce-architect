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
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [extra, setExtra] = useState("");

  function confirm() {
    const lines = questions
      .map((q) => (answers[q.id] ? `- ${q.question} → ${answers[q.id]}` : null))
      .filter(Boolean);
    if (extra.trim()) lines.push(`- 추가 설명 → ${extra.trim()}`);
    onConfirm(lines.join("\n"));
  }

  return (
    <div className="rounded-xl border border-violet-200 bg-violet-50/40 p-4 shadow-sm">
      <div className="mb-1 flex items-center gap-2">
        <span className="rounded-full bg-violet-600 px-2 py-0.5 text-[10px] font-bold text-white">AI 질문</span>
        <h3 className="text-sm font-semibold text-slate-700">설계 전, 몇 가지만 확인할게요</h3>
      </div>
      <p className="mb-3 text-xs text-slate-500">
        직군·운영 방식의 모호함을 줄여 더 정확한 조직을 설계합니다. {degraded && "(일반 질문으로 표시 중)"}
      </p>

      {loading ? (
        <p className="py-6 text-center text-xs text-slate-400">질문 생성 중…</p>
      ) : (
        <div className="space-y-4">
          {questions.map((q) => (
            <div key={q.id}>
              <p className="mb-1.5 text-xs font-medium text-slate-700">{q.question}</p>
              <div className="flex flex-wrap gap-1.5">
                {q.options.map((opt) => (
                  <button
                    key={opt}
                    onClick={() => setAnswers((a) => ({ ...a, [q.id]: opt }))}
                    className={`rounded-full px-3 py-1.5 text-[11px] font-medium transition ${
                      answers[q.id] === opt
                        ? "bg-violet-600 text-white"
                        : "bg-white text-slate-600 ring-1 ring-slate-200 hover:ring-violet-300"
                    }`}
                  >
                    {opt}
                  </button>
                ))}
              </div>
            </div>
          ))}

          <div>
            <p className="mb-1.5 text-xs font-medium text-slate-700">추가 설명 (선택)</p>
            <input
              value={extra}
              onChange={(e) => setExtra(e.target.value)}
              placeholder='예) "스트레치는 스포츠마사지·재활 전문가 중심"'
              className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-800 placeholder-slate-400 outline-none focus:border-violet-400 focus:ring-2 focus:ring-violet-100"
            />
          </div>

          <div className="flex gap-2">
            <button
              onClick={confirm}
              className="flex-1 rounded-lg bg-violet-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-violet-500"
            >
              이 답변으로 설계하기
            </button>
            <button
              onClick={onSkip}
              className="rounded-lg border border-slate-300 bg-white px-4 py-2.5 text-sm font-medium text-slate-600 hover:bg-slate-50"
            >
              건너뛰기
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
