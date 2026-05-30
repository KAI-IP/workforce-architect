import type { Lane } from "./types";

// §5.2 3레인 색·라벨 (목업 색 체계 그대로) — 컴포넌트 공용
export const LANE_META: Record<Lane, { label: string; color: string; desc: string }> = {
  AI: { label: "AI", color: "#14b8a6", desc: "조합가능·자동화가능" },
  EDGE: { label: "인간 · Edge", color: "#8b5cf6", desc: "윤리·신규·고위험·신뢰·가드레일" },
  FIELD: { label: "인간 · Field", color: "#fb7185", desc: "물리적 신체 필요(방문·현장)" },
};

export const LANE_ORDER: Lane[] = ["AI", "EDGE", "FIELD"];

export const isHuman = (lane: Lane) => lane === "EDGE" || lane === "FIELD";
