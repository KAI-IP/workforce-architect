"use client";

import { useState } from "react";
import type { OrgDesign, Role } from "@/lib/types";
import { LANE_META, isHuman } from "@/lib/lanes";

const ICON: Record<string, string> = { AI: "🤖", EDGE: "🧠", FIELD: "🚶" };

const TREE_CSS = `
.wf-tree, .wf-tree ul { position:relative; padding-top:18px; display:flex; justify-content:center; }
.wf-tree li { list-style:none; position:relative; padding:18px 6px 0 6px; display:flex; flex-direction:column; align-items:center; }
.wf-tree li::before, .wf-tree li::after { content:''; position:absolute; top:0; right:50%; border-top:1px solid #cbd5e1; width:50%; height:18px; }
.wf-tree li::after { right:auto; left:50%; border-left:1px solid #cbd5e1; }
.wf-tree li:only-child::before, .wf-tree li:only-child::after { display:none; }
.wf-tree li:only-child { padding-top:0; }
.wf-tree li:first-child::before, .wf-tree li:last-child::after { border:0 none; }
.wf-tree li:last-child::before { border-right:1px solid #cbd5e1; }
.wf-tree ul::before { content:''; position:absolute; top:0; left:50%; border-left:1px solid #cbd5e1; height:18px; }
.wf-tree > li { padding-top:0; }
.wf-tree > li::before, .wf-tree > li::after { display:none; }
`;

export default function WorkflowDeckDashboard({
  design,
  onOpenPublish,
}: {
  design: OrgDesign;
  onOpenPublish: () => void;
}) {
  const roles = design.roles;
  const byId = new Map(roles.map((r) => [r.id, r]));
  const [sel, setSel] = useState<string | null>(null);

  const childrenOf = (id: string | null) =>
    roles.filter((r) => {
      const p = r.reportsTo ?? null;
      return id === null ? !p || !byId.has(p) : p === id;
    });

  function renderNode(role: Role, visited: Set<string>): React.ReactNode {
    if (visited.has(role.id)) return null;
    visited.add(role.id);
    const meta = LANE_META[role.lane];
    const kids = childrenOf(role.id);
    const sup = role.supervisedBy ? byId.get(role.supervisedBy) : null;
    const open = sel === role.id;
    return (
      <li key={role.id}>
        <button
          onClick={() => setSel(open ? null : role.id)}
          className={`w-40 rounded-lg border bg-white p-2 text-left shadow-sm transition hover:shadow ${
            open ? "ring-2" : ""
          }`}
          style={{ borderTopColor: meta.color, borderTopWidth: 3, ...(open ? { ["--tw-ring-color" as string]: meta.color } : {}) }}
        >
          <div className="flex items-center gap-1">
            <span>{ICON[role.lane]}</span>
            <span className="truncate text-xs font-semibold text-slate-800">{role.title}</span>
          </div>
          <div className="mt-0.5 flex items-center gap-1 text-[9px] text-slate-400">
            <span style={{ color: meta.color }}>{meta.label}</span>
            {role.seniority && <span>· {role.seniority}</span>}
          </div>
          {sup && (
            <p className="mt-1 truncate text-[9px] text-amber-600" title={`감독: ${sup.title}`}>
              🛡 감독 ┄ {sup.title}
            </p>
          )}
        </button>
        {kids.length > 0 && <ul>{kids.map((k) => renderNode(k, visited))}</ul>}
      </li>
    );
  }

  const roots = childrenOf(null);
  const visited = new Set<string>();
  const selRole = sel ? byId.get(sel) : null;

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
      <style>{TREE_CSS}</style>
      <div className="mb-3 flex items-center justify-between">
        <div>
          <h2 className="text-sm font-semibold text-slate-700">워크플로우 덱 — 조직 대시보드</h2>
          <p className="mt-0.5 text-[11px] text-slate-400">
            ── 보고(reportsTo) · ┄ 감독(supervisedBy) · 노드 클릭 → 일·주·월 업무
          </p>
        </div>
        <button
          onClick={onOpenPublish}
          className="shrink-0 rounded-lg bg-slate-900 px-4 py-2 text-xs font-semibold text-white hover:bg-slate-700"
        >
          실행계획 문서 만들기 →
        </button>
      </div>

      <div className="overflow-x-auto pb-2">
        <ul className="wf-tree min-w-max">{roots.map((r) => renderNode(r, visited))}</ul>
      </div>

      {/* 선택 노드 상세: 역할 / 보고자·감독자 / 일·주·월 */}
      {selRole && (
        <div className="mt-3 rounded-lg border border-slate-200 bg-slate-50 p-3">
          <div className="flex items-center gap-2">
            <span>{ICON[selRole.lane]}</span>
            <span className="text-sm font-semibold text-slate-800">{selRole.title}</span>
            <span className="rounded-full px-2 py-0.5 text-[10px] font-semibold" style={{ background: `${LANE_META[selRole.lane].color}1a`, color: LANE_META[selRole.lane].color }}>
              {isHuman(selRole.lane) ? "인간" : "AI"}
            </span>
          </div>
          <p className="mt-1 text-[11px] leading-relaxed text-slate-500">{selRole.rationale}</p>
          <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-[11px] text-slate-600">
            <span>보고 ▸ {selRole.reportsTo ? byId.get(selRole.reportsTo)?.title ?? "-" : "최상위"}</span>
            <span>감독 ▸ {selRole.supervisedBy ? byId.get(selRole.supervisedBy)?.title ?? "-" : "—"}</span>
          </div>
          {selRole.cadence && (
            <div className="mt-2 grid grid-cols-1 gap-2 sm:grid-cols-3">
              {(["daily", "weekly", "monthly"] as const).map((k) => {
                const items = selRole.cadence?.[k];
                if (!items?.length) return null;
                const label = k === "daily" ? "일간" : k === "weekly" ? "주간" : "월간";
                return (
                  <div key={k} className="rounded-md border border-slate-200 bg-white p-2">
                    <p className="mb-1 text-[10px] font-semibold text-slate-500">{label}</p>
                    <ul className="space-y-0.5 text-[11px] text-slate-600">
                      {items.map((t, i) => (
                        <li key={i}>· {t}</li>
                      ))}
                    </ul>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
