"use client";

import { useEffect, useState } from "react";
import type { Brief, Role } from "@/lib/types";
import type { Timeline } from "@/lib/timeline";
import type { Persona } from "@/lib/types";
import { LANE_META, isHuman } from "@/lib/lanes";
import { roleProjectCost, effectiveWindow } from "@/lib/cost";
import { effectiveProjectType } from "@/lib/timeline";
import { rocketpunchUrl } from "@/lib/links";
import PersonaPopover from "./PersonaPopover";
import AgentRunModal from "./AgentRunModal";

const WINDOW_KO: Record<string, string> = { both: "준비+운영", operation: "운영만", prep: "준비만" };

export default function RoleCard({
  role,
  project,
  timeline,
  onRoleUpdate,
  onAddToDeck,
}: {
  role: Role;
  project: Brief;
  timeline: Timeline;
  onRoleUpdate: (roleId: string, patch: Partial<Role>) => void;
  onAddToDeck: (roleId: string, persona: Persona) => void;
}) {
  const meta = LANE_META[role.lane];
  const human = isHuman(role.lane);
  const [open, setOpen] = useState(false);
  const [runOpen, setRunOpen] = useState(false);

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

  const cost = roleProjectCost(role, project, timeline);
  const isShort = effectiveProjectType(project) === "SHORTTERM";
  const win = effectiveWindow(role);
  const hc = role.headcount && role.headcount > 1 ? role.headcount : 0;

  return (
    <div
      onClick={() => human && setOpen(true)}
      className={`rounded-lg border border-slate-200 bg-white p-3 ${
        human ? "cursor-pointer hover:border-slate-300 hover:shadow-sm" : ""
      }`}
      style={{ borderLeftColor: meta.color, borderLeftWidth: 3 }}
    >
      {open && human && (
        <PersonaPopover
          role={role}
          project={project}
          timeline={timeline}
          onClose={() => setOpen(false)}
          onRoleUpdate={onRoleUpdate}
          onAddToDeck={onAddToDeck}
        />
      )}
      {runOpen && <AgentRunModal role={role} project={project} onClose={() => setRunOpen(false)} />}

      <div className="flex items-start justify-between gap-2">
        <span className="text-sm font-medium text-slate-800">
          {role.title}
          {hc ? <span className="ml-1 text-xs font-semibold text-violet-600">×{hc}</span> : null}
        </span>
        {human && (
          <span
            className="shrink-0 whitespace-nowrap rounded-full px-2 py-0.5 text-[10px] font-semibold"
            style={{ background: `${meta.color}1a`, color: meta.color }}
            title={degraded ? "목 데이터 (로켓펀치 API 미응답)" : "로켓펀치 실시간 공급량"}
          >
            {supply == null ? "시장 …" : `시장 ${supply.toLocaleString()}건`}
            {degraded && supply != null ? "*" : ""}
          </span>
        )}
      </div>

      {human && (
        <div className="mt-1 flex flex-wrap gap-1 text-[10px] text-slate-500">
          {role.seniority && <span className="rounded bg-slate-100 px-1.5 py-0.5">{role.seniority}</span>}
          {role.workType && <span className="rounded bg-slate-100 px-1.5 py-0.5">{role.workType}</span>}
          {isShort && (
            <span className="rounded bg-slate-100 px-1.5 py-0.5" title="고용 구간">
              {WINDOW_KO[win]}
            </span>
          )}
        </div>
      )}

      <p className="mt-1.5 line-clamp-3 text-[11px] leading-relaxed text-slate-500">{role.rationale}</p>

      <div className="mt-2 flex items-center justify-between gap-2">
        <span className="text-[11px] font-medium text-slate-600">≈ {cost.toLocaleString()}만</span>
        <div className="flex items-center gap-1.5">
          {human && (
            <a
              href={rocketpunchUrl(role)}
              target="_blank"
              rel="noopener noreferrer"
              onClick={(e) => e.stopPropagation()}
              title="합성 페르소나 → 실제 시장 공고 (로켓펀치)"
              className="rounded px-2 py-1 text-[10px] font-medium text-slate-600 ring-1 ring-slate-200 hover:bg-slate-50"
            >
              고용 시도하기 ↗
            </a>
          )}
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              setRunOpen(true);
            }}
            className="rounded px-2 py-1 text-[10px] font-medium text-white"
            style={{ background: meta.color }}
          >
            {role.lane === "AI" ? "직원 실행" : "미션 도출"}
          </button>
        </div>
      </div>
    </div>
  );
}
