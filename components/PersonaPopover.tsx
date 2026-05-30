"use client";

import { useEffect, useState } from "react";
import type { Persona, PersonaResult, Role, Seniority } from "@/lib/types";
import { LANE_META } from "@/lib/lanes";
import { roleCost, SENIORITY_MULT } from "@/lib/cost";

interface NcsInfo {
  title: string;
  slug: string;
  salaryBySeniority: Record<Seniority, [number, number] | null>;
}

const SENIORITY_ORDER: Seniority[] = ["BEGINNER", "JUNIOR", "MIDLEVEL", "SENIOR", "EXECUTIVE"];
const SENIORITY_KO: Record<Seniority, string> = {
  BEGINNER: "신입",
  JUNIOR: "주니어",
  MIDLEVEL: "미들",
  SENIOR: "시니어",
  EXECUTIVE: "임원",
};

export default function PersonaPopover({
  role,
  onClose,
  onRoleUpdate,
}: {
  role: Role;
  onClose: () => void;
  onRoleUpdate: (roleId: string, patch: Partial<Role>) => void;
}) {
  const meta = LANE_META[role.lane];
  const [data, setData] = useState<PersonaResult | null>(null);
  const [loading, setLoading] = useState(true);
  const [personasDegraded, setPersonasDegraded] = useState(false);
  const [marketDegraded, setMarketDegraded] = useState(false);
  const [sen, setSen] = useState<Seniority>(role.seniority ?? "MIDLEVEL");
  const [ncs, setNcs] = useState<NcsInfo | null>(null);

  // P0 노동비용표(서버 계산): 직군·시니어리티별 시장 연봉 레인지 (연봉 보정 근거)
  const marketRange = ncs?.salaryBySeniority?.[sen] ?? null;
  const baseSalary = role.estimatedAnnualSalary;
  const salaryFlag =
    marketRange && baseSalary
      ? baseSalary < marketRange[0]
        ? "low"
        : baseSalary > marketRange[1]
          ? "high"
          : "ok"
      : null;

  useEffect(() => {
    let alive = true;
    setLoading(true);
    fetch("/api/personas", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ role }),
    })
      .then((r) => r.json())
      .then((j) => {
        if (!alive) return;
        setData({ personas: j.personas ?? [], market: j.market ?? { supply: 0, samples: [] } });
        setNcs((j.ncs as NcsInfo) ?? null);
        setPersonasDegraded(Boolean(j.personasDegraded ?? j.degraded));
        setMarketDegraded(Boolean(j.marketDegraded ?? j.degraded));
      })
      .catch(() => {
        if (!alive) return;
        setPersonasDegraded(true);
        setMarketDegraded(true);
      })
      .finally(() => alive && setLoading(false));
    return () => {
      alive = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [role.id]);

  // 시니어리티 변경 → 역할 패치(부모 state) → 비용·밸런스 즉시 갱신
  function changeSeniority(next: Seniority) {
    setSen(next);
    onRoleUpdate(role.id, { seniority: next });
  }

  const previewCost = roleCost({ ...role, seniority: sen });

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4"
      onClick={(e) => {
        e.stopPropagation();
        onClose();
      }}
    >
      <div
        className="max-h-[85vh] w-full max-w-lg overflow-y-auto rounded-2xl border border-white/10 bg-[#0e1424] p-5 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-3 flex items-start justify-between">
          <div>
            <span className="text-xs font-semibold" style={{ color: meta.color }}>
              {meta.label}
            </span>
            <h3 className="text-lg font-bold text-white/90">{role.title}</h3>
            <p className="mt-0.5 text-xs text-white/40">직군: {role.jobCategoryQuery}</p>
          </div>
          <button
            onClick={(e) => {
              e.stopPropagation();
              onClose();
            }}
            className="rounded p-1 text-white/40 hover:text-white/80"
          >
            ✕
          </button>
        </div>

        {/* 시니어리티 세그먼트 — 변경 시 비용 즉시 변동 */}
        <div className="mb-4 rounded-xl border border-white/10 bg-white/[0.03] p-3">
          <div className="mb-2 flex items-center justify-between">
            <span className="text-xs font-medium text-white/60">시니어리티 (비용 즉시 변동)</span>
            <span className="text-sm font-bold" style={{ color: meta.color }}>
              ≈ {previewCost.toLocaleString()}만/년
            </span>
          </div>
          {/* P0 노동비용표 기반 시장 연봉 레인지 + 보정 플래그 */}
          {marketRange && (
            <p className="mb-2 text-[10px] text-white/45">
              시장 연봉 {marketRange[0].toLocaleString()}~{marketRange[1].toLocaleString()}만 (NCS {ncs?.title})
              {salaryFlag === "low" && <span className="ml-1 text-amber-400">· 입력 연봉이 시장 하단 미만</span>}
              {salaryFlag === "high" && <span className="ml-1 text-amber-400">· 입력 연봉이 시장 상단 초과</span>}
              {salaryFlag === "ok" && <span className="ml-1 text-emerald-400">· 시장 범위 내</span>}
            </p>
          )}
          <div className="flex gap-1">
            {SENIORITY_ORDER.map((s) => (
              <button
                key={s}
                onClick={() => changeSeniority(s)}
                className={`flex-1 rounded-md px-1 py-1.5 text-[10px] font-medium transition ${
                  s === sen ? "text-white" : "text-white/45 hover:text-white/70"
                }`}
                style={s === sen ? { background: meta.color } : { background: "rgba(255,255,255,0.05)" }}
                title={`배수 ×${SENIORITY_MULT[s]}`}
              >
                {SENIORITY_KO[s]}
              </button>
            ))}
          </div>
        </div>

        {/* 페르소나 3명 */}
        <h4 className="mb-2 flex items-center gap-2 text-xs font-semibold text-white/70">
          합성 페르소나 3
          {!loading &&
            (personasDegraded ? (
              <span className="rounded-full bg-amber-400/15 px-1.5 py-0.5 text-[9px] text-amber-400">목</span>
            ) : (
              <span className="rounded-full bg-emerald-400/15 px-1.5 py-0.5 text-[9px] text-emerald-400">
                MISO 실합성
              </span>
            ))}
        </h4>
        {loading ? (
          <p className="py-6 text-center text-xs text-white/40">페르소나 합성 중…</p>
        ) : (
          <div className="space-y-2">
            {(data?.personas ?? []).slice(0, 3).map((p: Persona, i) => (
              <div key={i} className="rounded-lg border border-white/10 bg-white/[0.04] p-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-white/90">{p.label}</span>
                  <span className="text-[10px] text-white/45">
                    {SENIORITY_KO[p.seniority] ?? p.seniority} · {p.years}년
                  </span>
                </div>
                <p className="mt-0.5 text-[11px] text-white/50">
                  {p.domain} · 선호 {p.workPref}
                </p>
                <p className="mt-1 text-[11px] leading-relaxed text-white/45">{p.reason}</p>
              </div>
            ))}
          </div>
        )}

        {/* 시장 근거 (로켓펀치) — "허구 아님" 신뢰 장치 */}
        <div className="mt-4 rounded-xl border border-white/10 bg-white/[0.03] p-3">
          <div className="mb-2 flex items-center justify-between">
            <span className="text-xs font-semibold text-white/70">시장 근거 (로켓펀치)</span>
            <span className="text-xs font-bold" style={{ color: meta.color }}>
              공급 {data?.market.supply?.toLocaleString() ?? "…"}건{marketDegraded ? "*" : ""}
            </span>
          </div>
          <div className="space-y-1.5">
            {(data?.market.samples ?? []).slice(0, 3).map((s, i) => (
              <a
                key={i}
                href={s.url || "#"}
                target="_blank"
                rel="noreferrer"
                className="block rounded-md bg-black/20 p-2 hover:bg-black/40"
              >
                <p className="text-[11px] font-medium text-white/80">{s.title}</p>
                <p className="text-[10px] text-white/40">
                  {s.company} · {s.qualification?.slice(0, 60)}
                </p>
              </a>
            ))}
            {!data?.market.samples?.length && (
              <p className="text-[11px] text-white/30">시장 공고 샘플 없음</p>
            )}
          </div>
          {marketDegraded && (
            <p className="mt-2 text-[10px] text-amber-400/80">
              * 로켓펀치 API 미응답 → 시장 데이터는 목 (페르소나 합성은 별도)
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
