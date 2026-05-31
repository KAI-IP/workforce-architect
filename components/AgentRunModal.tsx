"use client";

import { useEffect, useState } from "react";
import type { Brief, Role } from "@/lib/types";
import { LANE_META } from "@/lib/lanes";

interface Mission {
  objective?: string;
  tasks?: string[];
  deliverables?: string[];
  kpi?: string[];
  sampleOutput?: string;
}

interface RunResult {
  output: Mission;
  usage: Record<string, unknown> | null;
  source: string;
  degraded: boolean;
}

export default function AgentRunModal({
  role,
  project,
  onClose,
}: {
  role: Role;
  project: Brief;
  onClose: () => void;
}) {
  const meta = LANE_META[role.lane];
  const [res, setRes] = useState<RunResult | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let alive = true;
    fetch("/api/run-agent", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ role, project }),
    })
      .then((r) => r.json())
      .then((j) => alive && setRes(j))
      .catch(() => alive && setRes(null))
      .finally(() => alive && setLoading(false));
    return () => {
      alive = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [role.id]);

  const m = res?.output ?? {};
  const usage = res?.usage as { total_tokens?: number; total_price?: string | number } | null;
  const isAi = role.lane === "AI";

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4"
      onClick={(e) => {
        e.stopPropagation();
        onClose();
      }}
    >
      <div
        className="max-h-[85vh] w-full max-w-lg overflow-y-auto rounded-2xl border border-slate-200 bg-white p-5 shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-3 flex items-start justify-between">
          <div>
            <span className="text-xs font-semibold" style={{ color: meta.color }}>
              {isAi ? "AI 직원 실행" : "역할 미션 도출"} · {meta.label}
            </span>
            <h3 className="text-lg font-bold text-slate-900">{role.title}</h3>
          </div>
          <button
            onClick={(e) => {
              e.stopPropagation();
              onClose();
            }}
            className="rounded p-1 text-slate-400 hover:text-slate-700"
          >
            ✕
          </button>
        </div>

        {loading ? (
          <p className="py-8 text-center text-xs text-slate-400">
            {isAi ? "MISO 직원이 일하는 중…" : "미션 도출 중…"}
          </p>
        ) : (
          <div className="space-y-4">
            {m.objective && (
              <div>
                <h4 className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">목표</h4>
                <p className="mt-1 text-sm text-slate-800">{m.objective}</p>
              </div>
            )}

            {!!m.tasks?.length && (
              <Section title="주차별 태스크" color={meta.color}>
                <ol className="list-decimal space-y-1 pl-4 text-xs text-slate-600">
                  {m.tasks.map((t, i) => (
                    <li key={i}>{t}</li>
                  ))}
                </ol>
              </Section>
            )}

            <div className="grid grid-cols-2 gap-3">
              {!!m.deliverables?.length && (
                <Section title="산출물" color={meta.color}>
                  <ul className="space-y-1 text-xs text-slate-600">
                    {m.deliverables.map((d, i) => (
                      <li key={i}>· {d}</li>
                    ))}
                  </ul>
                </Section>
              )}
              {!!m.kpi?.length && (
                <Section title="KPI" color={meta.color}>
                  <ul className="space-y-1 text-xs text-slate-600">
                    {m.kpi.map((k, i) => (
                      <li key={i}>· {k}</li>
                    ))}
                  </ul>
                </Section>
              )}
            </div>

            {m.sampleOutput && (
              <Section title={isAi ? "산출물 샘플 (지금 생성)" : "당장 만들 수 있는 산출물"} color={meta.color}>
                <p className="text-xs leading-relaxed text-slate-700">{m.sampleOutput}</p>
              </Section>
            )}

            <div className="flex items-center justify-between border-t border-slate-200 pt-3 text-[11px]">
              <span className="text-slate-400">
                출처:{" "}
                {res?.source === "workflow"
                  ? "MISO 워크플로우"
                  : res?.source === "architect"
                    ? "MISO 아키텍트"
                    : "목"}
                {res?.degraded ? " (degraded)" : ""}
              </span>
              {usage && (usage.total_tokens || usage.total_price) && (
                <span className="text-slate-600">
                  {usage.total_tokens ? `${Number(usage.total_tokens).toLocaleString()} tok` : ""}
                  {usage.total_price ? ` · ${usage.total_price}` : ""}
                </span>
              )}
            </div>

            {/* AI 역할: 이 미션을 실제 MISO 에이전트로 만들기 */}
            {isAi && (
              <a
                href="https://console.miso.gs"
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center justify-center gap-1.5 rounded-lg px-4 py-2.5 text-sm font-semibold text-white"
                style={{ background: meta.color }}
              >
                ⚙️ 이 직원을 MISO 에이전트로 생성하기 ↗
              </a>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

function Section({ title, color, children }: { title: string; color: string; children: React.ReactNode }) {
  return (
    <div className="rounded-lg border border-slate-200 bg-slate-50 p-3">
      <h4 className="mb-1.5 text-[11px] font-semibold" style={{ color }}>
        {title}
      </h4>
      {children}
    </div>
  );
}
