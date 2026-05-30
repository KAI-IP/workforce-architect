"use client";

import { useState } from "react";
import type { Brief } from "@/lib/types";

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
    onSubmit(form);
  }

  const labelCls = "block text-xs font-medium text-white/60 mb-1";
  const inputCls =
    "w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-white/90 placeholder-white/30 outline-none focus:border-white/30";

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label className={labelCls}>사업명</label>
        <input
          className={inputCls}
          value={form.title}
          onChange={(e) => set("title", e.target.value)}
          placeholder="예) 프리미엄 반려동물 구독 커머스"
          required
        />
      </div>

      <div>
        <label className={labelCls}>사업개요</label>
        <textarea
          className={`${inputCls} min-h-[80px] resize-y`}
          value={form.summary}
          onChange={(e) => set("summary", e.target.value)}
          placeholder="어떤 일을 하는 사업인지 한두 문장으로"
          required
        />
      </div>

      <div>
        <label className={labelCls}>타겟 고객</label>
        <input
          className={inputCls}
          value={form.targetCustomer}
          onChange={(e) => set("targetCustomer", e.target.value)}
          placeholder="예) 25~39세 1인가구·신혼"
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
          <label className={labelCls}>기간 (개월)</label>
          <input
            type="number"
            min={1}
            className={inputCls}
            value={form.durationMonths}
            onChange={(e) => set("durationMonths", Number(e.target.value))}
            required
          />
        </div>
      </div>

      <div>
        <label className={labelCls}>인건비 예산 (₩만/년)</label>
        <input
          type="number"
          min={0}
          className={inputCls}
          value={form.laborBudget}
          onChange={(e) => set("laborBudget", Number(e.target.value))}
          required
        />
      </div>

      <label className="flex items-center gap-2 text-sm text-white/70 select-none">
        <input
          type="checkbox"
          className="h-4 w-4 accent-lane-field"
          checked={form.hasOffline}
          onChange={(e) => set("hasOffline", e.target.checked)}
        />
        오프라인 요소 있음 (현장/방문/팝업 등)
      </label>

      <button
        type="submit"
        disabled={loading}
        className="w-full rounded-lg bg-lane-edge px-4 py-2.5 text-sm font-semibold text-white transition hover:opacity-90 disabled:opacity-50"
      >
        {loading ? "분석 중…" : "설계하기"}
      </button>
    </form>
  );
}
