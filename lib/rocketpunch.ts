// lib/rocketpunch.ts — 서버 전용 로켓펀치 클라이언트 (키는 서버에서만, §1 보안)
import "server-only";

// 담당자 제공 실 엔드포인트: https://openapi.rocketpunch.com/v1/jobs/search?query=...
const BASE = process.env.ROCKETPUNCH_BASE_URL || "https://openapi.rocketpunch.com/v1";

export async function searchJobs(query: string, key: string): Promise<unknown> {
  const url = `${BASE}/jobs/search?query=${encodeURIComponent(query)}`;
  const res = await fetch(url, {
    headers: { "X-OBA-API-Key": key },
    cache: "no-store",
  });
  if (!res.ok) {
    throw new Error(`Rocketpunch ${res.status}: ${await res.text().catch(() => "")}`);
  }
  return res.json();
}

export interface JobSample {
  title: string;
  company: string;
  qualification: string;
  url: string;
}

// 로켓펀치 응답 스키마가 확정 전이라 방어적으로 파싱 (총 공급량 + 상위 3개 샘플)
export function parseJobs(data: unknown): { supply: number; samples: JobSample[] } {
  const d = (data ?? {}) as Record<string, unknown>;
  const nested = (d.data ?? {}) as Record<string, unknown>;

  const supplyRaw =
    d.totalItems ?? d.total ?? d.totalCount ?? d.count ?? nested.total ?? nested.totalItems;
  const itemsRaw =
    (d.items as unknown[]) ??
    (d.results as unknown[]) ??
    (nested.items as unknown[]) ??
    (Array.isArray(nested) ? (nested as unknown[]) : []) ??
    [];

  const items = Array.isArray(itemsRaw) ? itemsRaw : [];
  const supply = Number(supplyRaw ?? items.length) || 0;

  const samples: JobSample[] = items.slice(0, 3).map((raw) => {
    const it = (raw ?? {}) as Record<string, unknown>;
    const company = it.company as Record<string, unknown> | string | undefined;
    return {
      title: String(it.title ?? it.name ?? it.position ?? ""),
      company: String(
        (typeof company === "object" ? company?.name : company) ?? it.companyName ?? "",
      ),
      qualification: String(
        it.minimumQualification ?? it.qualification ?? it.requirements ?? "",
      ),
      url: String(it.url ?? it.link ?? ""),
    };
  });

  return { supply, samples };
}
