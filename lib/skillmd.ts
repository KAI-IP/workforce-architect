// lib/skillmd.ts — rank5: 역할/미션을 Tower Standalone(Apache-2.0) SKILL.md 포맷으로 직렬화.
// "이 조직의 각 역할 = 재사용 가능한 skill 문서" → self-hosted AI workspace(Tower 등)에 그대로 배포 가능.
import type { OrgDesign, Role } from "./types";

interface Mission {
  objective?: string;
  tasks?: string[];
  deliverables?: string[];
  kpi?: string[];
  sampleOutput?: string;
}

function yamlList(items?: string[]): string {
  if (!items?.length) return "[]";
  return "\n" + items.map((i) => `  - ${i.replace(/\n/g, " ")}`).join("\n");
}

function roleSkill(role: Role, design: OrgDesign, mission?: Mission): string {
  const sup = role.supervisedBy ? design.roles.find((r) => r.id === role.supervisedBy)?.title : null;
  const trigger =
    role.lane === "AI"
      ? `${role.title} 업무가 필요할 때 자동 실행`
      : `${role.title}의 판단/실행이 필요할 때`;
  const inputs = role.lane === "AI" ? ["고객/운영 데이터", "직전 단계 산출물"] : ["요청·맥락", "관련 자료"];
  const fm = [
    "---",
    `name: ${role.title}`,
    `lane: ${role.lane}`,
    `type: ${role.lane === "AI" ? "automation" : "human-edge"}`,
    `trigger: ${trigger}`,
    `inputs:${yamlList(mission?.deliverables ? inputs : inputs)}`,
    `outputs:${yamlList(mission?.deliverables ?? ["산출물"])}`,
    `guardrails:${yamlList([sup ? `감독: ${sup}` : "감독자 지정 필요", "PoC 가정값 — 실제 운영 전 검증"])}`,
    "---",
  ].join("\n");

  const body = [
    `## ${role.title}`,
    "",
    `> ${role.rationale}`,
    "",
    mission?.objective ? `**목표** — ${mission.objective}` : "",
    mission?.tasks?.length ? "\n**태스크**\n" + mission.tasks.map((t) => `- ${t}`).join("\n") : "",
    mission?.kpi?.length ? "\n**KPI** — " + mission.kpi.join(", ") : "",
    mission?.sampleOutput ? `\n**산출물 샘플** — ${mission.sampleOutput}` : "",
  ]
    .filter(Boolean)
    .join("\n");

  return `${fm}\n\n${body}\n`;
}

export function toSkillMd(design: OrgDesign, missions: Record<string, Mission> = {}): string {
  const header = [
    `# ${design.project.title} — SKILL.md 묶음`,
    "",
    "> Tower Standalone(Apache-2.0) 호환 SKILL.md 포맷. 각 역할이 self-hosted AI workspace의 재사용 skill 로 배포 가능.",
    `> 생성: workforce-architect · 역할 ${design.roles.length}개`,
    "",
    "---",
    "",
  ].join("\n");
  return header + design.roles.map((r) => roleSkill(r, design, missions[r.id])).join("\n---\n\n");
}
