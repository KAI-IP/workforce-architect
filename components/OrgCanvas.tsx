"use client";

import type { OrgDesign, Role } from "@/lib/types";
import type { Timeline } from "@/lib/timeline";
import { LANE_META, LANE_ORDER } from "@/lib/lanes";
import RoleCard from "./RoleCard";

// §5.2 OrgCanvas — 3레인 컬럼 + RoleCard 렌더
export default function OrgCanvas({
  design,
  timeline,
  loading = false,
  onRoleUpdate,
}: {
  design: OrgDesign;
  timeline: Timeline;
  loading?: boolean;
  onRoleUpdate: (roleId: string, patch: Partial<Role>) => void;
}) {
  return (
    <div className="grid gap-4 md:grid-cols-3">
      {LANE_ORDER.map((lane) => {
        const meta = LANE_META[lane];
        const roles = design.roles.filter((r) => r.lane === lane);
        return (
          <div
            key={lane}
            className="rounded-xl border border-slate-200 bg-white p-3 shadow-sm"
            style={{ borderTopColor: meta.color, borderTopWidth: 3 }}
          >
            <div className="mb-1 flex items-center justify-between">
              <span className="text-sm font-semibold" style={{ color: meta.color }}>
                {meta.label}
              </span>
              <span className="text-xs text-slate-400">{roles.length}개</span>
            </div>
            <p className="mb-3 text-[10px] leading-snug text-slate-400">{meta.desc}</p>
            <div className="space-y-2">
              {roles.map((r) => (
                <RoleCard
                  key={r.id}
                  role={r}
                  project={design.project}
                  timeline={timeline}
                  onRoleUpdate={onRoleUpdate}
                />
              ))}
              {!roles.length && (
                <p className="py-4 text-center text-[11px] text-slate-300">
                  {loading ? "분석 중…" : "역할 없음"}
                </p>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
