"use client";

import { useState } from "react";
import type { Brief, ProjectType } from "@/lib/types";
import { classifyProjectType, estimateTimeline } from "@/lib/timeline";

interface Props {
  initial: Brief;
  onSubmit: (brief: Brief) => void;
  loading?: boolean;
}

export default function BriefForm({ initial, onSubmit, loading = false }: Props) {
  const [form, setForm] = useState<Brief>(initial);

  function set<K extends keyof Brief>(key: K, value: Brief[K]) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    onSubmit({ ...form, projectType: classifyProjectType(form.durationMonths) });
  }

  const autoType = classifyProjectType(form.durationMonths);
  const effType: ProjectType = form.projectTypeOverride ?? autoType;
  const tl = estimateTimeline({ ...form }, 5);

  const labelCls = "block text-xs font-medium text-slate-500 mb-1";
  const inputCls =
    "w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-800 placeholder-slate-400 outline-none focus:border-violet-400 focus:ring-2 focus:ring-violet-100";

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label className={labelCls}>사업명</label>
        <input className={inputCls} value={form.title} onChange={(e) => set("title", e.target.value)} required />
      </div>

      <div>
        <label className={labelCls}>사업개요</label>
        <textarea
          className={`${inputCls} min-h-[72px] resize-y`}
          value={form.summary}
          onChange={(e) => set("summary", e.target.value)}
          required
        />
      </div>

      <div>
        <label className={labelCls}>타겟 고객</label>
        <input
          className={inputCls}
          value={form.targetCustomer}
          onChange={(e) => set("targetCustomer", e.target.value)}
          required
        />
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className={labelCls}>목표매출 (₩만/년)</label>
          <input
            type="number"
            min={0}
            className={inputCls}
            value={form.targetRevenue}
            onChange={(e) => set("targetRevenue", Number(e.target.value))}
            required
          />
        </div>
        <div>
          <label className={labelCls}>기간 (개월, 소수 가능)</label>
          <input
            type="number"
            min={0}
            step="0.5"
            className={inputCls}
            value={form.durationMonths}
            onChange={(e) => set("durationMonths", Number(e.target.value))}
            required
          />
        </div>
      </div>

      {/* rank1: 장기/단기 토글 (자동분류 + override) */}
      <div className="rounded-lg border border-slate-200 bg-slate-50 p-3">
        <div className="mb-1.5 flex items-center justify-between">
          <span className="text-xs font-medium text-slate-500">사업 유형</span>
          <span className="text-[10px] text-slate-400">
            자동: {autoType === "SHORTTERM" ? "단기" : "장기"}
          </span>
        </div>
        <div className="flex gap-1.5">
          {(["LONGTERM", "SHORTTERM"] as ProjectType[]).map((t) => (
            <button
              key={t}
              type="button"
              onClick={() => set("projectTypeOverride", t)}
              className={`flex-1 rounded-md px-2 py-1.5 text-xs font-medium transition ${
                effType === t
                  ? "bg-violet-600 text-white"
                  : "bg-white text-slate-500 ring-1 ring-slate-200 hover:text-slate-700"
              }`}
            >
              {t === "LONGTERM" ? "장기 비즈니스" : "단기 프로젝트"}
            </button>
          ))}
        </div>
        {effType === "SHORTTERM" && (
          <div className="mt-2.5 space-y-2">
            <div>
              <label className={labelCls}>운영 기간 (주)</label>
              <input
                type="number"
                min={1}
                className={inputCls}
                value={form.opWeeks ?? Math.max(1, Math.round(form.durationMonths * 4.33))}
                onChange={(e) => set("opWeeks", Number(e.target.value))}
              />
            </div>
            <p className="rounded-md bg-violet-50 px-2.5 py-1.5 text-[11px] text-violet-700">
              제안 일정: 준비 <b>{tl.prepWeeks}주</b>(마케팅 준비 {tl.marketingPrepWeeks}주 포함) → 운영{" "}
              <b>{tl.opWeeks}주</b> · 총 {tl.totalWeeks}주
            </p>
          </div>
        )}
      </div>

      <div>
        <label className={labelCls}>
          인건비 예산 {effType === "SHORTTERM" ? "(₩만/프로젝트 총액)" : "(₩만/년)"}
        </label>
        <input
          type="number"
          min={0}
          className={inputCls}
          value={form.laborBudget}
          onChange={(e) => set("laborBudget", Number(e.target.value))}
          required
        />
      </div>

      <label className="flex items-center gap-2 text-sm text-slate-600 select-none">
        <input
          type="checkbox"
          className="h-4 w-4 accent-violet-600"
          checked={form.hasOffline}
          onChange={(e) => set("hasOffline", e.target.checked)}
        />
        오프라인 요소 있음 (현장/방문/팝업 등)
      </label>

      <button
        type="submit"
        disabled={loading}
        className="w-full rounded-lg bg-violet-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-violet-500 disabled:opacity-50"
      >
        {loading ? "분석 중…" : "설계하기"}
      </button>
    </form>
  );
}
