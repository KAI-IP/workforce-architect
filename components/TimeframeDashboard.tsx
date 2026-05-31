"use client";

import type { OrgDesign } from "@/lib/types";
import { LANE_META } from "@/lib/lanes";
import { buildTimeframe } from "@/lib/timeframe";

const ICON: Record<string, string> = { AI: "🤖", EDGE: "🧠", FIELD: "🚶" };

export default function TimeframeDashboard({ design }: { design: OrgDesign }) {
  const { monthCount, rows } = buildTimeframe(design);

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="mb-1 flex items-center justify-between">
        <h2 className="text-sm font-semibold text-slate-700">타임프레임 대시보드</h2>
        <span className="text-xs text-slate-400">당사자별 {monthCount}개월 시행계획</span>
      </div>
      <p className="mb-3 text-[11px] text-slate-400">
        각 주체(AI 포함)가 개월별로 수행할 마일스톤입니다. 실행계획 문서(PDF)에 포함됩니다.
      </p>

      <div className="overflow-x-auto">
        <table className="w-full min-w-max border-separate border-spacing-0 text-[11px]">
          <thead>
            <tr>
              <th className="sticky left-0 z-10 bg-white px-2 py-2 text-left font-semibold text-slate-500">주체</th>
              {Array.from({ length: monthCount }, (_, i) => (
                <th key={i} className="px-2 py-2 text-left font-semibold text-slate-500">
                  {i + 1}개월
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => {
              const meta = LANE_META[r.lane];
              return (
                <tr key={r.roleId} className="align-top">
                  <td
                    className="sticky left-0 z-10 bg-white px-2 py-2"
                    style={{ borderLeft: `3px solid ${meta.color}` }}
                  >
                    <span className="font-medium text-slate-700">
                      {ICON[r.lane]} {r.title}
                    </span>
                  </td>
                  {r.months.map((m, i) => (
                    <td key={i} className="min-w-[150px] px-2 py-2">
                      <div className="rounded-md bg-slate-50 px-2 py-1.5 text-slate-600">{m}</div>
                    </td>
                  ))}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
