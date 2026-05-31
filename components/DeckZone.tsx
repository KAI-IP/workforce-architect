"use client";

import type { Brief, DeckCardData, Role, TeamReview } from "@/lib/types";
import { LANE_META } from "@/lib/lanes";
import { rocketpunchUrl } from "@/lib/links";

const SIGNAL: Record<TeamReview["adequacy"], { color: string; bg: string; label: string }> = {
  OK: { color: "#10b981", bg: "bg-emerald-50 border-emerald-200", label: "운영 가능" },
  CAUTION: { color: "#f59e0b", bg: "bg-amber-50 border-amber-200", label: "보강 권장" },
  GAP: { color: "#f43f5e", bg: "bg-rose-50 border-rose-200", label: "역량 결손" },
};

export default function DeckZone({
  deck,
  roles,
  review,
  reviewing,
  onRemove,
  onHeadcount,
  onAccept,
}: {
  deck: DeckCardData[];
  roles: Role[];
  project: Brief;
  review: TeamReview | null;
  reviewing: boolean;
  onRemove: (instanceId: string) => void;
  onHeadcount: (roleId: string, n: number) => void;
  onAccept: (s: TeamReview["suggestions"][number]) => void;
}) {
  const roleById = (id: string) => roles.find((r) => r.id === id);

  const headerCopy = !deck.length
    ? "🃏 워크플로우 덱을 확인하세요 — 위 인간 카드에서 페르소나를 골라 [덱에 추가]하세요."
    : deck.length === 1
      ? "좋아요. 함께 일할 동료를 더 배치하면 조합을 평가해 드립니다."
      : reviewing
        ? "이 조합으로 일이 굴러갈까요? 분석 중…"
        : review
          ? review.adequacy === "OK"
            ? "✅ 이 팀 구성이면 미션 수행이 가능합니다."
            : review.adequacy === "CAUTION"
              ? `⚠️ ${review.comment}`
              : `🛑 ${review.comment}`
          : "조합을 평가합니다…";

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="mb-3 flex items-center justify-between">
        <h2 className="text-sm font-semibold text-slate-700">운영 덱 (팀 조합 시뮬레이션)</h2>
        {review && deck.length > 1 && (
          <span
            className="flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-semibold"
            style={{ background: `${SIGNAL[review.adequacy].color}1a`, color: SIGNAL[review.adequacy].color }}
          >
            <span className="h-2 w-2 rounded-full" style={{ background: SIGNAL[review.adequacy].color }} />
            {SIGNAL[review.adequacy].label}
          </span>
        )}
      </div>

      <p className="mb-3 text-xs text-slate-500">{headerCopy}</p>

      {/* 덱 카드 (살짝 겹친 hand 느낌) */}
      {deck.length > 0 && (
        <div className="mb-4 flex flex-wrap gap-3">
          {deck.map((c, i) => {
            const role = roleById(c.roleId);
            if (!role) return null;
            const meta = LANE_META[role.lane];
            const hc = role.headcount && role.headcount > 0 ? role.headcount : 1;
            return (
              <div
                key={c.instanceId}
                className="w-44 rounded-xl border border-slate-200 bg-white p-3 shadow-sm transition hover:-translate-y-0.5"
                style={{ borderTopColor: meta.color, borderTopWidth: 3, transform: `rotate(${(i % 2 ? 1 : -1) * 0.6}deg)` }}
              >
                <div className="flex items-start justify-between">
                  <span className="text-[10px] font-semibold" style={{ color: meta.color }}>
                    {meta.label}
                  </span>
                  <button onClick={() => onRemove(c.instanceId)} className="text-slate-300 hover:text-rose-500">
                    ✕
                  </button>
                </div>
                <p className="mt-0.5 text-sm font-semibold leading-tight text-slate-800">{role.title}</p>
                <p className="mt-0.5 text-[11px] text-slate-500">{c.persona.label}</p>
                <p className="text-[10px] text-slate-400">
                  {c.persona.seniority} · {c.persona.years}년
                </p>

                <div className="mt-2 flex items-center justify-between">
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => onHeadcount(role.id, Math.max(1, hc - 1))}
                      className="h-5 w-5 rounded bg-slate-100 text-slate-600 hover:bg-slate-200"
                    >
                      −
                    </button>
                    <span className="w-6 text-center text-xs font-semibold text-slate-700">×{hc}</span>
                    <button
                      onClick={() => onHeadcount(role.id, hc + 1)}
                      className="h-5 w-5 rounded bg-slate-100 text-slate-600 hover:bg-slate-200"
                    >
                      +
                    </button>
                  </div>
                  <a
                    href={rocketpunchUrl(role)}
                    target="_blank"
                    rel="noopener noreferrer"
                    title="실제 시장 공고 보기"
                    className="text-[10px] font-medium text-slate-500 hover:text-slate-800"
                  >
                    고용 ↗
                  </a>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* CombinationAdvisor: 제안 칩 */}
      {review && deck.length > 1 && (review.suggestions.length > 0 || review.missingCapabilities.length > 0) && (
        <div className={`rounded-lg border p-3 ${SIGNAL[review.adequacy].bg}`}>
          {review.suggestions.length > 0 && (
            <div className="flex flex-wrap gap-1.5">
              {review.suggestions.map((s, i) => (
                <button
                  key={i}
                  onClick={() => onAccept(s)}
                  title={s.reason}
                  className="rounded-full border border-slate-300 bg-white px-2.5 py-1 text-[11px] font-medium text-slate-700 hover:bg-slate-50"
                >
                  {s.kind === "ADD_HEADCOUNT" && `👥 ${s.target}명으로 (${roleById(s.roleId)?.title})`}
                  {s.kind === "RAISE_SENIORITY" && `⬆ ${s.target} 시니어리티 (${roleById(s.roleId)?.title})`}
                  {s.kind === "COVER_BY_AI" && `🤖 AI로 이전`}
                  {s.kind === "ADD_ROLE" && `➕ 역할 추가`}
                </button>
              ))}
            </div>
          )}
          {review.missingCapabilities.length > 0 && (
            <p className="mt-2 text-[11px] text-slate-600">
              빠진 역량: {review.missingCapabilities.join(", ")}
            </p>
          )}
        </div>
      )}
    </div>
  );
}
