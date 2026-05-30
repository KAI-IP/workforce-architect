"use client";

import type { OrgDesign, Role } from "@/lib/types";
import { LANE_META, LANE_ORDER } from "@/lib/lanes";
import RoleCard from "./RoleCard";

// §5.2 OrgCanvas — 3레인 컬럼 + RoleCard 렌더
export default function OrgCanvas({
  design,
  loading = false,
  onRoleUpdate,
}: {
  design: OrgDesign;
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
            className="rounded-xl border border-white/10 bg-white/[0.03] p-3"
            style={{ borderTopColor: meta.color, borderTopWidth: 3 }}
          >
            <div className="mb-1 flex items-center justify-between">
              <span className="text-sm font-semibold" style={{ color: meta.color }}>
                {meta.label}
              </span>
              <span className="text-xs text-white/40">{roles.length}개</span>
            </div>
            <p className="mb-3 text-[10px] leading-snug text-white/35">{meta.desc}</p>
            <div className="space-y-2">
              {roles.map((r) => (
                <RoleCard key={r.id} role={r} onRoleUpdate={onRoleUpdate} />
              ))}
              {!roles.length && (
                <p className="py-4 text-center text-[11px] text-white/25">
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
