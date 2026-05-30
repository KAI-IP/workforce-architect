"use client";

import { useEffect, useState } from "react";
import type { Role } from "@/lib/types";
import { LANE_META, isHuman } from "@/lib/lanes";
import { roleCost } from "@/lib/cost";
import PersonaPopover from "./PersonaPopover";

function costLabel(r: Role): string {
  const annual = roleCost(r);
  if (!annual) return "";
  if (r.lane === "AI") return `≈ ${annual.toLocaleString()}만/년 (AI)`;
  return `≈ ${annual.toLocaleString()}만/년`;
}

export default function RoleCard({
  role,
  onRoleUpdate,
}: {
  role: Role;
  onRoleUpdate: (roleId: string, patch: Partial<Role>) => void;
}) {
  const meta = LANE_META[role.lane];
  const human = isHuman(role.lane);
  const [open, setOpen] = useState(false);

  // §5.2 로켓펀치 공급 배지 (P5): 인간 역할만 /api/jobs 로 공급량 조회
  const [supply, setSupply] = useState<number | null>(null);
  const [degraded, setDegraded] = useState(false);

  useEffect(() => {
    if (!human || !role.jobCategoryQuery) return;
    let alive = true;
    fetch(`/api/jobs?q=${encodeURIComponent(role.jobCategoryQuery)}`)
      .then((r) => r.json())
      .then((j) => {
        if (!alive) return;
        setSupply(typeof j.supply === "number" ? j.supply : null);
        setDegraded(Boolean(j.degraded));
      })
      .catch(() => alive && setSupply(null));
    return () => {
      alive = false;
    };
  }, [human, role.jobCategoryQuery]);

  return (
    <div
      onClick={() => human && setOpen(true)}
      className={`rounded-lg border border-white/10 bg-white/[0.04] p-3 ${
        human ? "cursor-pointer hover:border-white/25" : ""
      }`}
      style={{ borderLeftColor: meta.color, borderLeftWidth: 3 }}
    >
      {open && human && (
        <PersonaPopover role={role} onClose={() => setOpen(false)} onRoleUpdate={onRoleUpdate} />
      )}
      <div className="flex items-start justify-between gap-2">
        <span className="text-sm font-medium text-white/90">{role.title}</span>
        {human && (
          <span
            className="shrink-0 whitespace-nowrap rounded-full px-2 py-0.5 text-[10px] font-semibold"
            style={{ background: `${meta.color}22`, color: meta.color }}
            title={degraded ? "목 데이터 (로켓펀치 API 미응답)" : "로켓펀치 실시간 공급량"}
          >
            {supply == null ? "시장 …" : `시장 ${supply.toLocaleString()}건`}
            {degraded && supply != null ? "*" : ""}
          </span>
        )}
      </div>

      {human && (
        <div className="mt-1 flex flex-wrap gap-1 text-[10px] text-white/45">
          {role.seniority && <span className="rounded bg-white/5 px-1.5 py-0.5">{role.seniority}</span>}
          {role.workType && <span className="rounded bg-white/5 px-1.5 py-0.5">{role.workType}</span>}
        </div>
      )}

      <p className="mt-1.5 line-clamp-3 text-[11px] leading-relaxed text-white/45">{role.rationale}</p>

      <div className="mt-2 flex items-center justify-between">
        <span className="text-[11px] text-white/55">{costLabel(role)}</span>
        {role.lane === "AI" && (
          <button
            type="button"
            disabled
            title="P9에서 MISO 워크플로우 실행 연결"
            className="rounded bg-white/10 px-2 py-1 text-[10px] text-white/40"
          >
            직원 실행
          </button>
        )}
      </div>
    </div>
  );
}
