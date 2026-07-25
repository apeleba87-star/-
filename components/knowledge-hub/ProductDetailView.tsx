"use client";

import Link from "next/link";
import { useEffect, useRef, useState, type CSSProperties, type ReactNode } from "react";
import {
  AlertTriangle,
  Ban,
  BookOpen,
  Check,
  ChevronDown,
  ChevronRight,
  ClipboardList,
  CookingPot,
  Droplets,
  Factory,
  FileText,
  FlaskConical,
  Home,
  Microscope,
  Sparkles,
  Wrench,
} from "lucide-react";
import ProductPhBadge from "@/components/knowledge-hub/ProductPhBadge";
import ProductPurchaseBar from "@/components/knowledge-hub/ProductPurchaseBar";
import type {
  KnowledgeProduct,
  KnowledgeRecipe,
} from "@/lib/knowledge-hub/cleaning-knowledge/types";
import { parseProductPh, phColor, type PhInfo } from "@/lib/knowledge-hub/ph-scale";
import type { ProductPurchaseLink } from "@/lib/knowledge-hub/product-sales";

export type ProductExploreLink = {
  href: string;
  title: string;
  subtitle?: string;
  brand?: string;
  phApprox?: string | null;
  useHint?: string;
  desc?: string;
  readTime?: string;
  icon?: string;
  category?: string;
};

type Props = {
  product: KnowledgeProduct;
  recipes: KnowledgeRecipe[];
  purchase: ProductPurchaseLink | null;
  relatedProducts?: ProductExploreLink[];
  relatedPollutions?: ProductExploreLink[];
  relatedBlogs?: ProductExploreLink[];
};

const PRIMARY = "#00b894";
const PRIMARY_DARK = "#00cec9";
const TEXT = "#1a2a3a";
const TEXT_SEC = "#6b7a8d";
const BORDER = "#e8edf3";
const BG = "#f5f7fb";
const CARD_SHADOW = "0 2px 12px rgba(26, 42, 58, 0.06)";

type SituationTone = {
  accent: string;
  soft: string;
  tagBg: string;
  Icon: typeof Factory;
};

const SITUATION_TONES: SituationTone[] = [
  { accent: "#22a06b", soft: "#e8f8f0", tagBg: "#d8f3e4", Icon: Factory },
  { accent: "#7c5cbf", soft: "#f3eefc", tagBg: "#ebe3fa", Icon: CookingPot },
  { accent: "#e67e22", soft: "#fff4e8", tagBg: "#ffe8d1", Icon: Home },
  { accent: "#2980b9", soft: "#eaf4fb", tagBg: "#d6ebf8", Icon: Droplets },
  { accent: "#8e44ad", soft: "#f7eefb", tagBg: "#eedcf8", Icon: FlaskConical },
  { accent: "#34495e", soft: "#eef2f5", tagBg: "#e2e8ee", Icon: Wrench },
];

const STEP_COLORS = ["#00b894", "#0984e3", "#e17055", "#6c5ce7", "#00cec9", "#fd79a8"];
const RELATED_PASTELS = ["#eaf4ff", "#eef8ef", "#fff8e8", "#fceff4", "#e9f8f7", "#f3eefc"];

function heroBackground(ph: PhInfo | null): { bg: string; fg: string; chipBg: string } {
  if (!ph) {
    return {
      bg: `linear-gradient(135deg, ${PRIMARY}, ${PRIMARY_DARK})`,
      fg: "#fff",
      chipBg: "rgba(255,255,255,0.25)",
    };
  }
  const end = phColor(Math.min(14, ph.value + 1));
  return {
    bg: `linear-gradient(135deg, ${ph.color}, ${end})`,
    fg: ph.textColor,
    chipBg: ph.textColor === "#ffffff" ? "rgba(255,255,255,0.25)" : "rgba(0,0,0,0.12)",
  };
}

function recipeCaseTitle(recipe: KnowledgeRecipe, product: KnowledgeProduct): string {
  let title = (recipe.seoTitle || recipe.field || recipe.summary || "").trim();

  const nameParts = new Set<string>();
  for (const raw of [product.name, ...(product.aliases ?? [])]) {
    const n = raw.trim();
    if (!n) continue;
    nameParts.add(n);
    const paren = n.match(/^([^(（]+)[(（]([^)）]+)[)）]/);
    if (paren) {
      nameParts.add(paren[1]!.trim());
      nameParts.add(paren[2]!.trim());
    }
  }
  const names = [...nameParts].filter((n) => n.length >= 2).sort((a, b) => b.length - a.length);

  for (const name of names) {
    const esc = name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    title = title.replace(new RegExp(`^${esc}(을|를)?(\\s*이용한)?\\s*`, "i"), "");
  }

  title = title
    .replace(/^(을|를)?\s*이용한\s*/i, "")
    .replace(/\s*\(([^)]*(?:\d+\s*:\s*\d+|원액|노즐)[^)]*)\)\s*$/g, "")
    .replace(/[·・]/g, " ")
    .replace(/가공기계/g, "가공 기계")
    .replace(/입주청소/g, "입주 청소")
    .replace(/\s{2,}/g, " ")
    .trim();

  if (!title) title = recipe.field?.trim() || "세정";
  return title.replace(/\s*사용법\s*$/, "").trim();
}

function situationMeta(title: string, index: number): { tag: string; tone: SituationTone } {
  let tone = SITUATION_TONES[index % SITUATION_TONES.length]!;
  let tag = ["강력 추천", "매일 사용", "주 1회", "집중 세정", "특수 상황", "전문가용"][index % 6]!;

  if (/가공|기계/.test(title)) {
    tone = SITUATION_TONES[0]!;
    tag = "강력 추천";
  } else if (/조리|표면|작업대|일상/.test(title)) {
    tone = SITUATION_TONES[1]!;
    tag = "매일 사용";
  } else if (/바닥|홀|주방/.test(title)) {
    tone = SITUATION_TONES[2]!;
    tag = "주 1회";
  } else if (/기름|눌어|입주/.test(title)) {
    tone = SITUATION_TONES[3]!;
    tag = "집중 세정";
  } else if (/거품|폼/.test(title)) {
    tone = SITUATION_TONES[4]!;
    tag = "특수 상황";
  }

  return { tag, tone };
}

function cleanPhrases(raw: string[]): string[] {
  return raw.filter((s) => {
    const t = s.trim();
    if (!t) return false;
    if (/^\(※|^※/.test(t)) return false;
    if (t.length > 24) return false;
    if (/마감$|최소화|우수$|권장$/.test(t) && !/때|오염|자국|잔유|석회|요석|기름|녹|먼지|비누/.test(t)) {
      return false;
    }
    return true;
  });
}

function cleanForbidden(raw: string[]): string[] {
  return raw.filter((s) => {
    const t = s.trim();
    if (!t) return false;
    if (/특히 주의할 재질|^주의/.test(t)) return false;
    if (t.length > 48) return false;
    return true;
  });
}

function splitSummary(summary: string): { preview: string; rest: string | null } {
  const parts = summary.split(/(?<=[.。！？!?])\s+/).filter(Boolean);
  if (parts.length <= 2) return { preview: summary, rest: null };
  return { preview: parts.slice(0, 2).join(" "), rest: parts.slice(2).join(" ") };
}

function buildHowToSteps(product: KnowledgeProduct, recipes: KnowledgeRecipe[]): string[] {
  const primary = recipes[0];
  if (primary?.steps?.length) {
    return primary.steps.filter(Boolean).slice(0, 4);
  }
  const steps: string[] = [];
  if (product.standardDilution) {
    steps.push(
      product.standardDilution.includes("원액")
        ? `${product.standardDilution}으로 표면에 적용한다.`
        : `${product.standardDilution}로 희석해 준비한다.`
    );
  }
  if (product.dwellTime) steps.push(`대기 ${product.dwellTime} 후 닦아낸다.`);
  if (product.summary) {
    const first = product.summary.split(/(?<=[.。！？!?])\s+/)[0]?.trim();
    if (first && steps.length < 4) steps.push(first);
  }
  return steps.slice(0, 4);
}

function SectionHead({
  title,
  color,
  subtitle,
}: {
  title: string;
  color: string;
  subtitle?: string;
}) {
  return (
    <div style={{ display: "flex", alignItems: "baseline", gap: 8, marginBottom: 14, flexWrap: "wrap" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
        <div style={{ width: 4, height: 20, borderRadius: 2, background: color, flexShrink: 0 }} />
        <h2 style={{ fontSize: 19, fontWeight: 800, margin: 0, color: TEXT, letterSpacing: "-0.02em" }}>
          {title}
        </h2>
      </div>
      {subtitle ? <span style={{ fontSize: 13, fontWeight: 600, color: TEXT_SEC }}>{subtitle}</span> : null}
    </div>
  );
}

function WhiteCard({ children, style }: { children: ReactNode; style?: CSSProperties }) {
  return (
    <div
      style={{
        background: "#fff",
        borderRadius: 16,
        border: `1px solid ${BORDER}`,
        boxShadow: CARD_SHADOW,
        ...style,
      }}
    >
      {children}
    </div>
  );
}

/**
 * 제품 상세 — 스크린샷 디테일 맞춤 (데이터 무변경, pH 뱃지 색 유지)
 */
export default function ProductDetailView({
  product,
  recipes,
  purchase,
  relatedProducts = [],
  relatedPollutions = [],
  relatedBlogs = [],
}: Props) {
  const [activeSection, setActiveSection] = useState(0);
  const [expandedCard, setExpandedCard] = useState<string | null>(null);
  const [showAllWarnings, setShowAllWarnings] = useState(false);
  const [showAllForbidden, setShowAllForbidden] = useState(false);
  const [showProductDesc, setShowProductDesc] = useState(false);
  const [readProgress, setReadProgress] = useState(0);
  const [showNextBar, setShowNextBar] = useState(false);
  const sectionRefs = useRef<(HTMLElement | null)[]>([]);

  const contaminants = cleanPhrases(product.contaminantsRaw ?? []);
  const materials = cleanPhrases(product.materialsRaw ?? []);
  const forbidden = cleanForbidden(product.forbiddenRaw ?? []);
  const warnings = product.warnings.filter(Boolean);
  const summaryParts = product.summary ? splitSummary(product.summary) : null;
  const strengthBadges = [...contaminants.slice(0, 2), ...product.mainUse.slice(0, 2)]
    .filter((v, i, a) => a.indexOf(v) === i)
    .slice(0, 4);
  const phInfo = parseProductPh(product.phApprox);
  const heroTheme = heroBackground(phInfo);
  const howToSteps = buildHowToSteps(product, recipes);
  const primaryRecipe = recipes[0];
  const heroSubtitle =
    primaryRecipe?.summary?.trim() ||
    [contaminants[0], contaminants[1]].filter(Boolean).join(" · ") ||
    product.mainUse.slice(0, 2).join(" · ") ||
    null;

  const visibleWarnings = showAllWarnings ? warnings : warnings.slice(0, 4);
  const hiddenWarningCount = Math.max(0, warnings.length - 4);
  const forbidPreview = showAllForbidden ? forbidden : forbidden.slice(0, 8);
  const hiddenForbidCount = Math.max(0, forbidden.length - 8);

  const knowledgeCards: ProductExploreLink[] = [
    ...relatedPollutions.map((p, i) => ({
      ...p,
      category: p.category ?? "오염 가이드",
      icon: p.icon ?? (i % 2 === 0 ? "microscope" : "sparkles"),
      desc: p.desc ?? p.subtitle ?? "원인과 제거 방법을 확인하세요",
      readTime: p.readTime ?? "3분 읽기",
    })),
    ...relatedBlogs.map((b, i) => ({
      ...b,
      category: b.category ?? "청소지식",
      icon: b.icon ?? (i % 2 === 0 ? "book" : "flask"),
      desc: b.desc ?? b.subtitle ?? "관련 청소 지식을 이어 읽으세요",
      readTime: b.readTime ?? "4분 읽기",
    })),
  ].slice(0, 4);

  const nextProduct = relatedProducts[0] ?? null;
  const withFrom = (href: string) => {
    const join = href.includes("?") ? "&" : "?";
    return `${href}${join}from=${encodeURIComponent(product.id)}`;
  };
  const tabs = [
    { id: "howto", label: "기본 사용법" },
    { id: "situations", label: "상황별 사용법" },
    { id: "cautions", label: "주의·금지" },
    { id: "info", label: "제품 정보" },
    { id: "explore", label: "탐색하기" },
  ];

  useEffect(() => {
    const handleScroll = () => {
      const scrollTop = window.scrollY;
      const scrollHeight = document.documentElement.scrollHeight - window.innerHeight;
      setReadProgress(scrollHeight > 0 ? Math.min(100, (scrollTop / scrollHeight) * 100) : 0);
      setShowNextBar(scrollTop > 300);

      const offsets = sectionRefs.current.map((r) => (r ? r.offsetTop - 130 : 0));
      let current = 0;
      offsets.forEach((offset, i) => {
        if (scrollTop >= offset) current = i;
      });
      setActiveSection(current);
    };

    handleScroll();
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const scrollToSection = (index: number) => {
    const el = sectionRefs.current[index];
    if (!el) return;
    window.scrollTo({ top: el.getBoundingClientRect().top + window.scrollY - 100, behavior: "smooth" });
    setActiveSection(index);
  };

  const setSectionRef = (index: number) => (el: HTMLElement | null) => {
    sectionRefs.current[index] = el;
  };

  const knowledgeIcon = (key?: string) => {
    const props = { size: 26, strokeWidth: 1.8 };
    if (key === "sparkles") return <Sparkles {...props} color="#f39c12" />;
    if (key === "book") return <BookOpen {...props} color="#3498db" />;
    if (key === "flask") return <FlaskConical {...props} color="#1abc9c" />;
    return <Microscope {...props} color="#5b6cff" />;
  };

  return (
    <div style={{ minHeight: "100vh", background: BG, margin: "0 auto", maxWidth: 480 }}>
      {/* 읽기 진행 바 */}
      <div
        aria-hidden
        style={{ position: "fixed", top: 0, left: 0, right: 0, height: 3, zIndex: 60, background: BORDER }}
      >
        <div
          style={{
            height: "100%",
            width: `${readProgress}%`,
            background: `linear-gradient(90deg, ${PRIMARY}, ${PRIMARY_DARK})`,
            transition: "width 80ms linear",
          }}
        />
      </div>

      {/* Sticky 탭 */}
      <div
        style={{
          position: "sticky",
          top: 0,
          zIndex: 50,
          background: "rgba(245,247,251,0.96)",
          backdropFilter: "blur(8px)",
          borderBottom: `1px solid ${BORDER}`,
        }}
      >
        <div
          style={{
            display: "flex",
            gap: 6,
            overflowX: "auto",
            padding: "10px 12px 10px",
            scrollbarWidth: "none",
          }}
        >
          {tabs.map((tab, i) => {
            const active = activeSection === i;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => scrollToSection(i)}
                style={{
                  flexShrink: 0,
                  border: "none",
                  borderRadius: 999,
                  padding: "9px 14px",
                  fontSize: 14,
                  fontWeight: 700,
                  cursor: "pointer",
                  whiteSpace: "nowrap",
                  background: active ? PRIMARY : "#fff",
                  color: active ? "#fff" : TEXT_SEC,
                  boxShadow: active ? "0 2px 8px rgba(0,184,148,0.28)" : `inset 0 0 0 1px ${BORDER}`,
                }}
              >
                {tab.label}
              </button>
            );
          })}
        </div>
      </div>

      <article style={{ padding: "12px 16px 150px" }}>
        <nav style={{ marginBottom: 12 }}>
          <Link href="/products" style={{ fontSize: 13, fontWeight: 600, color: TEXT_SEC, textDecoration: "none" }}>
            ← 세정 제품
          </Link>
        </nav>

        {/* 히어로 — pH 색 */}
        <section
          style={{
            borderRadius: 20,
            padding: "20px 16px",
            marginBottom: 20,
            background: heroTheme.bg,
            color: heroTheme.fg,
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8, flexWrap: "wrap" }}>
            <span style={{ fontSize: 13, fontWeight: 700 }}>{product.brand}</span>
            <span
              style={{
                fontSize: 11,
                fontWeight: 800,
                padding: "3px 8px",
                borderRadius: 999,
                background: heroTheme.chipBg,
              }}
            >
              사용법
            </span>
          </div>
          <div style={{ display: "flex", alignItems: "flex-end", justifyContent: "space-between", gap: 12 }}>
            <h1
              style={{
                margin: 0,
                fontSize: 28,
                fontWeight: 900,
                lineHeight: 1.2,
                letterSpacing: "-0.02em",
                flex: 1,
                minWidth: 0,
              }}
            >
              {product.name}
            </h1>
            {phInfo ? (
              <span style={{ borderRadius: 12, boxShadow: "0 0 0 2px rgba(255,255,255,0.45)", flexShrink: 0 }}>
                <ProductPhBadge phApprox={product.phApprox} size="md" />
              </span>
            ) : null}
          </div>
          {heroSubtitle ? (
            <p style={{ margin: "10px 0 0", fontSize: 14, lineHeight: 1.5, opacity: 0.92 }}>{heroSubtitle}</p>
          ) : null}
        </section>

        {/* 기본 사용법 */}
        <section ref={setSectionRef(0)} id="howto" style={{ marginBottom: 22 }}>
          <SectionHead title="기본 사용법" color={PRIMARY} subtitle="희석·대기·절차 요약" />
          <div style={{ display: "grid", gridTemplateColumns: product.strongDilution ? "1fr 1fr" : "1fr", gap: 10 }}>
            <WhiteCard style={{ padding: 16 }}>
              <div style={{ fontSize: 13, fontWeight: 700, color: TEXT_SEC }}>일반 희석비율</div>
              <div
                style={{
                  marginTop: 8,
                  fontSize: 30,
                  fontWeight: 900,
                  color: PRIMARY,
                  letterSpacing: "-0.03em",
                  wordBreak: "keep-all",
                }}
              >
                {product.standardDilution ?? "원액/표기 확인"}
              </div>
              {product.standardDilution ? (
                <span
                  style={{
                    display: "inline-block",
                    marginTop: 8,
                    fontSize: 12,
                    fontWeight: 800,
                    color: PRIMARY,
                    background: "#e8f8f3",
                    borderRadius: 999,
                    padding: "4px 9px",
                  }}
                >
                  권장
                </span>
              ) : null}
            </WhiteCard>
            {product.strongDilution ? (
              <WhiteCard style={{ padding: 16 }}>
                <div style={{ fontSize: 13, fontWeight: 700, color: TEXT_SEC }}>집중 세정시</div>
                <div
                  style={{
                    marginTop: 8,
                    fontSize: 26,
                    fontWeight: 900,
                    color: "#e84393",
                    letterSpacing: "-0.03em",
                    wordBreak: "keep-all",
                  }}
                >
                  {product.strongDilution}
                </div>
                <div style={{ marginTop: 8, fontSize: 12, fontWeight: 700, color: TEXT_SEC }}>오염도에 따라</div>
              </WhiteCard>
            ) : null}
          </div>

          {howToSteps.length ? (
            <WhiteCard style={{ marginTop: 10, padding: 18 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 14 }}>
                <ClipboardList size={18} color={PRIMARY} />
                <span style={{ fontSize: 15, fontWeight: 800, color: TEXT }}>기본 절차</span>
              </div>
              <ol style={{ margin: 0, padding: 0, listStyle: "none" }}>
                {howToSteps.map((step, i) => (
                  <li
                    key={`${i}-${step.slice(0, 20)}`}
                    style={{ display: "flex", gap: 10, marginTop: i ? 14 : 0, alignItems: "flex-start" }}
                  >
                    <span
                      style={{
                        width: 26,
                        height: 26,
                        borderRadius: 999,
                        background: STEP_COLORS[i % STEP_COLORS.length],
                        color: "#fff",
                        fontSize: 13,
                        fontWeight: 900,
                        display: "inline-flex",
                        alignItems: "center",
                        justifyContent: "center",
                        flexShrink: 0,
                      }}
                    >
                      {i + 1}
                    </span>
                    <span style={{ fontSize: 15, lineHeight: 1.55, color: TEXT, paddingTop: 2, wordBreak: "keep-all" }}>
                      {step}
                    </span>
                  </li>
                ))}
              </ol>
            </WhiteCard>
          ) : null}
        </section>

        {/* 상황별 사용법 — 흰 카드 + 컬러 아이콘 */}
        <section ref={setSectionRef(1)} id="situations" style={{ marginBottom: 22 }}>
          <SectionHead title="상황별 사용법" color="#5b6cff" />
          <p style={{ margin: "-4px 0 14px", fontSize: 14, color: TEXT_SEC, lineHeight: 1.45 }}>
            맞는 경우를 클릭해 단계별 가이드 확인
          </p>
          {recipes.length ? (
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
              {recipes.map((r, index) => {
                const title = recipeCaseTitle(r, product);
                const { tag, tone } = situationMeta(title, index);
                const expanded = expandedCard === r.id;
                const steps = (r.steps ?? []).filter(Boolean).slice(0, 6);
                const Icon = tone.Icon;
                return (
                  <button
                    key={r.id}
                    type="button"
                    onClick={() => setExpandedCard(expanded ? null : r.id)}
                    style={{
                      gridColumn: expanded ? "span 2" : "span 1",
                      textAlign: "left",
                      cursor: "pointer",
                      border: `1px solid ${BORDER}`,
                      borderRadius: 18,
                      background: "#fff",
                      boxShadow: CARD_SHADOW,
                      padding: expanded ? 18 : 16,
                      minHeight: expanded ? undefined : 168,
                      display: "flex",
                      flexDirection: "column",
                    }}
                  >
                    <div
                      style={{
                        width: 44,
                        height: 44,
                        borderRadius: 14,
                        background: tone.soft,
                        display: "inline-flex",
                        alignItems: "center",
                        justifyContent: "center",
                      }}
                    >
                      <Icon size={26} color={tone.accent} strokeWidth={1.9} />
                    </div>
                    <div
                      style={{
                        display: "inline-block",
                        alignSelf: "flex-start",
                        marginTop: 12,
                        fontSize: 12,
                        fontWeight: 800,
                        color: tone.accent,
                        background: tone.tagBg,
                        borderRadius: 999,
                        padding: "4px 10px",
                      }}
                    >
                      {tag}
                    </div>
                    <div
                      style={{
                        marginTop: 10,
                        fontSize: expanded ? 17 : 15.5,
                        fontWeight: 900,
                        color: TEXT,
                        lineHeight: 1.4,
                        letterSpacing: "-0.02em",
                        wordBreak: "keep-all",
                        flex: 1,
                      }}
                    >
                      {title}
                    </div>
                    {expanded ? (
                      <div style={{ marginTop: 14 }}>
                        {r.dilution ? (
                          <div style={{ fontSize: 13, fontWeight: 700, color: TEXT_SEC, marginBottom: 10 }}>
                            희석 {r.dilution}
                            {r.dwellTime ? ` · 대기 ${r.dwellTime}` : ""}
                          </div>
                        ) : null}
                        <ol style={{ margin: 0, padding: 0, listStyle: "none" }}>
                          {steps.map((step, si) => (
                            <li
                              key={`${r.id}-s${si}`}
                              style={{
                                display: "flex",
                                gap: 8,
                                marginBottom: 10,
                                fontSize: 14,
                                lineHeight: 1.55,
                                color: TEXT,
                              }}
                            >
                              <span style={{ fontWeight: 800, color: tone.accent, flexShrink: 0 }}>
                                Step {si + 1}
                              </span>
                              <span>{step}</span>
                            </li>
                          ))}
                        </ol>
                        <Link
                          href={`/cleaning/${r.slug}`}
                          onClick={(e) => e.stopPropagation()}
                          style={{
                            display: "inline-flex",
                            alignItems: "center",
                            gap: 2,
                            marginTop: 4,
                            fontSize: 14,
                            fontWeight: 800,
                            color: tone.accent,
                            textDecoration: "none",
                          }}
                        >
                          전체 절차 보기
                          <ChevronRight size={16} />
                        </Link>
                      </div>
                    ) : (
                      <div
                        style={{
                          marginTop: 14,
                          display: "flex",
                          justifyContent: "flex-end",
                          alignItems: "center",
                          gap: 2,
                          fontSize: 13,
                          fontWeight: 800,
                          color: tone.accent,
                        }}
                      >
                        확인하기
                        <ChevronRight size={15} />
                      </div>
                    )}
                  </button>
                );
              })}
            </div>
          ) : (
            <p style={{ fontSize: 14, color: TEXT_SEC }}>등록된 상황별 사용법이 없습니다.</p>
          )}
        </section>

        {/* 주의·금지 — 스크린샷처럼 분리 */}
        <section ref={setSectionRef(2)} id="cautions" style={{ marginBottom: 22 }}>
          {warnings.length ? (
            <div
              style={{
                background: "#fff9eb",
                border: "1px solid #f5d78e",
                borderRadius: 16,
                padding: 16,
                marginBottom: 12,
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 10 }}>
                <AlertTriangle size={18} color="#d48806" />
                <span style={{ fontSize: 16, fontWeight: 800, color: TEXT }}>주의사항</span>
              </div>
              <ul style={{ margin: 0, padding: 0, listStyle: "none" }}>
                {visibleWarnings.map((w) => (
                  <li
                    key={w}
                    style={{
                      display: "flex",
                      gap: 8,
                      marginBottom: 10,
                      fontSize: 14,
                      lineHeight: 1.55,
                      color: TEXT,
                    }}
                  >
                    <span style={{ color: "#d48806", fontWeight: 900 }}>•</span>
                    <span style={{ wordBreak: "keep-all" }}>{w}</span>
                  </li>
                ))}
              </ul>
              {hiddenWarningCount > 0 ? (
                <button
                  type="button"
                  onClick={() => setShowAllWarnings((v) => !v)}
                  style={{
                    width: "100%",
                    marginTop: 6,
                    border: "1px solid #f0c040",
                    borderRadius: 12,
                    background: "#fff",
                    padding: "12px 14px",
                    fontSize: 14,
                    fontWeight: 800,
                    color: "#8a6a00",
                    cursor: "pointer",
                  }}
                >
                  {showAllWarnings ? "접기 ▲" : `나머지 주의사항 ${hiddenWarningCount}개 더 보기 ▼`}
                </button>
              ) : null}
            </div>
          ) : null}

          {forbidden.length ? (
            <div
              style={{
                background: "#fff1f3",
                border: "1px solid #f5c2c7",
                borderRadius: 16,
                padding: 16,
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 10 }}>
                <Ban size={18} color="#e74c3c" />
                <span style={{ fontSize: 16, fontWeight: 800, color: TEXT }}>
                  사용 금지 재질·표면 ({forbidden.length}개)
                </span>
              </div>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                {forbidPreview.map((f) => (
                  <span
                    key={f}
                    style={{
                      fontSize: 13,
                      fontWeight: 700,
                      color: "#c0392b",
                      background: "#fff",
                      border: "1px solid #f5c2c7",
                      borderRadius: 999,
                      padding: "7px 11px",
                    }}
                  >
                    {f}
                  </span>
                ))}
                {!showAllForbidden && hiddenForbidCount > 0 ? (
                  <button
                    type="button"
                    onClick={() => setShowAllForbidden(true)}
                    style={{
                      fontSize: 13,
                      fontWeight: 800,
                      color: "#c0392b",
                      background: "#ffe3e6",
                      border: "none",
                      borderRadius: 999,
                      padding: "7px 11px",
                      cursor: "pointer",
                    }}
                  >
                    +{hiddenForbidCount}개 더
                  </button>
                ) : null}
              </div>
              {showAllForbidden && hiddenForbidCount > 0 ? (
                <button
                  type="button"
                  onClick={() => setShowAllForbidden(false)}
                  style={{
                    marginTop: 10,
                    border: "none",
                    background: "transparent",
                    fontSize: 12,
                    fontWeight: 700,
                    color: TEXT_SEC,
                    cursor: "pointer",
                  }}
                >
                  접기 ▲
                </button>
              ) : null}
            </div>
          ) : null}
        </section>

        {/* 제품 정보 */}
        <section ref={setSectionRef(3)} id="info" style={{ marginBottom: 22 }}>
          <SectionHead title="제품 정보" color="#7c5cbf" />

          {contaminants.length ? (
            <WhiteCard style={{ padding: 16, marginBottom: 10 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 10 }}>
                <Sparkles size={16} color={PRIMARY} />
                <span style={{ fontSize: 15, fontWeight: 800, color: TEXT }}>용도</span>
              </div>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                {contaminants.map((c) => (
                  <span
                    key={c}
                    style={{
                      fontSize: 13,
                      fontWeight: 700,
                      color: PRIMARY,
                      background: "#fff",
                      border: `1px solid ${PRIMARY}55`,
                      borderRadius: 999,
                      padding: "7px 11px",
                    }}
                  >
                    {c}
                  </span>
                ))}
              </div>
            </WhiteCard>
          ) : null}

          {materials.length ? (
            <WhiteCard style={{ padding: 16, marginBottom: 10 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 10 }}>
                <Wrench size={16} color="#7c5cbf" />
                <span style={{ fontSize: 15, fontWeight: 800, color: TEXT }}>적용 재질</span>
              </div>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                {materials.map((m) => (
                  <span
                    key={m}
                    style={{
                      fontSize: 13,
                      fontWeight: 700,
                      color: TEXT_SEC,
                      background: "#fff",
                      border: `1px solid ${BORDER}`,
                      borderRadius: 999,
                      padding: "7px 11px",
                    }}
                  >
                    {m}
                  </span>
                ))}
              </div>
            </WhiteCard>
          ) : null}

          {summaryParts ? (
            <WhiteCard style={{ padding: 16, marginBottom: 10 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 10 }}>
                <FileText size={16} color="#5b6cff" />
                <span style={{ fontSize: 15, fontWeight: 800, color: TEXT }}>제품 설명</span>
              </div>
              <p style={{ margin: 0, fontSize: 15, lineHeight: 1.65, color: TEXT, wordBreak: "keep-all" }}>
                {showProductDesc || !summaryParts.rest
                  ? `${summaryParts.preview}${summaryParts.rest ? ` ${summaryParts.rest}` : ""}`
                  : summaryParts.preview}
              </p>
              {summaryParts.rest ? (
                <button
                  type="button"
                  onClick={() => setShowProductDesc((v) => !v)}
                  style={{
                    marginTop: 10,
                    border: "none",
                    background: "transparent",
                    padding: 0,
                    fontSize: 14,
                    fontWeight: 800,
                    color: "#5b6cff",
                    cursor: "pointer",
                  }}
                >
                  {showProductDesc ? "설명 접기 ▲" : "설명 더 보기 ▼"}
                </button>
              ) : null}
              {strengthBadges.length ? (
                <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginTop: 12 }}>
                  {strengthBadges.map((b) => (
                    <span
                      key={b}
                      style={{
                        display: "inline-flex",
                        alignItems: "center",
                        gap: 4,
                        fontSize: 13,
                        fontWeight: 700,
                        color: PRIMARY,
                      }}
                    >
                      <Check size={15} color={PRIMARY} />
                      {b}
                    </span>
                  ))}
                </div>
              ) : null}
            </WhiteCard>
          ) : null}

          {(phInfo || product.phApprox || product.mainUse.length > 0) && (
            <WhiteCard style={{ padding: "8px 16px" }}>
              <dl style={{ margin: 0 }}>
                {phInfo || product.phApprox ? (
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                      gap: 12,
                      padding: "10px 0",
                      borderBottom: product.mainUse.length ? `1px solid ${BORDER}` : undefined,
                    }}
                  >
                    <dt style={{ fontSize: 13, color: TEXT_SEC }}>pH</dt>
                    <dd style={{ margin: 0 }}>
                      {phInfo ? (
                        <ProductPhBadge phApprox={product.phApprox} size="sm" />
                      ) : (
                        <span style={{ fontSize: 13, fontWeight: 700 }}>{product.phApprox}</span>
                      )}
                    </dd>
                  </div>
                ) : null}
                {product.mainUse.length ? (
                  <div style={{ display: "flex", justifyContent: "space-between", gap: 12, padding: "10px 0" }}>
                    <dt style={{ fontSize: 13, color: TEXT_SEC, flexShrink: 0 }}>장소</dt>
                    <dd style={{ margin: 0, fontSize: 13, fontWeight: 700, textAlign: "right", color: TEXT }}>
                      {product.mainUse.slice(0, 4).join(", ")}
                      {product.mainUse.length > 4 ? ` 외 ${product.mainUse.length - 4}` : ""}
                    </dd>
                  </div>
                ) : null}
              </dl>
            </WhiteCard>
          )}
        </section>

        {/* 이어서 탐색하기 */}
        <section ref={setSectionRef(4)} id="explore" style={{ marginBottom: 22 }}>
          <SectionHead title="이어서 탐색하기" color="#e67e22" />

          {relatedProducts.length ? (
            <div style={{ marginBottom: 18 }}>
              <div style={{ fontSize: 14, fontWeight: 800, color: TEXT, marginBottom: 10 }}>같은 오염 · 다른 제품</div>
              <div
                style={{
                  display: "flex",
                  gap: 10,
                  overflowX: "auto",
                  paddingBottom: 4,
                  scrollbarWidth: "none",
                }}
              >
                {relatedProducts.map((p, i) => (
                  <Link
                    key={p.href}
                    href={withFrom(p.href)}
                    style={{
                      width: 160,
                      flexShrink: 0,
                      borderRadius: 16,
                      background: RELATED_PASTELS[i % RELATED_PASTELS.length],
                      padding: 14,
                      textDecoration: "none",
                      border: `1px solid ${BORDER}`,
                      boxShadow: CARD_SHADOW,
                    }}
                  >
                    <div style={{ fontSize: 12, fontWeight: 700, color: TEXT_SEC }}>
                      {p.brand ?? p.subtitle ?? "제품"}
                    </div>
                    <div
                      style={{
                        marginTop: 4,
                        fontSize: 15,
                        fontWeight: 800,
                        color: TEXT,
                        lineHeight: 1.35,
                        wordBreak: "keep-all",
                      }}
                    >
                      {p.title}
                    </div>
                    {p.phApprox ? (
                      <div style={{ marginTop: 8 }}>
                        <ProductPhBadge phApprox={p.phApprox} size="sm" />
                      </div>
                    ) : null}
                    {p.useHint ? (
                      <div
                        style={{
                          marginTop: 8,
                          fontSize: 11,
                          color: TEXT_SEC,
                          lineHeight: 1.4,
                          display: "-webkit-box",
                          WebkitLineClamp: 2,
                          WebkitBoxOrient: "vertical" as const,
                          overflow: "hidden",
                        }}
                      >
                        {p.useHint}
                      </div>
                    ) : null}
                    <div style={{ marginTop: 10, fontSize: 13, fontWeight: 800, color: "#3498db" }}>보러 가기 →</div>
                  </Link>
                ))}
              </div>
            </div>
          ) : null}

          {knowledgeCards.length ? (
            <div>
              <div style={{ fontSize: 14, fontWeight: 800, color: TEXT, marginBottom: 10 }}>관련 청소 지식</div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                {knowledgeCards.map((card) => (
                  <Link
                    key={card.href}
                    href={card.href}
                    style={{
                      borderRadius: 14,
                      background: "#fff",
                      border: `1px solid ${BORDER}`,
                      boxShadow: CARD_SHADOW,
                      padding: 14,
                      textDecoration: "none",
                    }}
                  >
                    <div style={{ marginBottom: 8 }}>{knowledgeIcon(card.icon)}</div>
                    <div
                      style={{
                        display: "inline-block",
                        fontSize: 11,
                        fontWeight: 800,
                        color: "#5b6cff",
                        background: "#eef0ff",
                        borderRadius: 999,
                        padding: "3px 8px",
                      }}
                    >
                      {card.category}
                    </div>
                    <div
                      style={{
                        marginTop: 8,
                        fontSize: 14,
                        fontWeight: 800,
                        color: TEXT,
                        lineHeight: 1.4,
                        wordBreak: "keep-all",
                      }}
                    >
                      {card.title}
                    </div>
                    {card.desc ? (
                      <div
                        style={{
                          marginTop: 6,
                          fontSize: 12,
                          color: TEXT_SEC,
                          lineHeight: 1.45,
                          display: "-webkit-box",
                          WebkitLineClamp: 2,
                          WebkitBoxOrient: "vertical" as const,
                          overflow: "hidden",
                        }}
                      >
                        {card.desc}
                      </div>
                    ) : null}
                    <div style={{ marginTop: 10, fontSize: 12, fontWeight: 700, color: TEXT_SEC }}>
                      {card.readTime}
                    </div>
                  </Link>
                ))}
              </div>
            </div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              <Link href="/products" style={{ fontSize: 14, fontWeight: 800, color: PRIMARY, textDecoration: "none" }}>
                세정 제품 전체 보기 →
              </Link>
              <Link href="/blog" style={{ fontSize: 14, fontWeight: 800, color: PRIMARY, textDecoration: "none" }}>
                청소지식 보기 →
              </Link>
            </div>
          )}
        </section>
      </article>

      {/* 하단 다음 추천 */}
      {nextProduct && showNextBar ? (
        <div
          style={{
            position: "fixed",
            left: 0,
            right: 0,
            bottom: 58,
            zIndex: 45,
            display: "flex",
            justifyContent: "center",
            padding: "0 12px",
            pointerEvents: "none",
          }}
        >
          <div
            style={{
              pointerEvents: "auto",
              width: "100%",
              maxWidth: 480,
              background: "#fff",
              borderRadius: 14,
              boxShadow: "0 -4px 20px rgba(0,0,0,0.1)",
              padding: "12px 16px",
              display: "flex",
              alignItems: "center",
              gap: 12,
              border: `1px solid ${BORDER}`,
            }}
          >
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: TEXT_SEC }}>다음으로 볼 제품</div>
              <div
                style={{
                  marginTop: 2,
                  fontSize: 14,
                  fontWeight: 800,
                  color: TEXT,
                  whiteSpace: "nowrap",
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                }}
              >
                {nextProduct.title}
              </div>
              <div
                style={{
                  marginTop: 2,
                  fontSize: 11,
                  color: TEXT_SEC,
                  whiteSpace: "nowrap",
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                }}
              >
                {nextProduct.phApprox
                  ? `pH · ${nextProduct.useHint ?? nextProduct.brand ?? ""}`
                  : nextProduct.useHint ?? nextProduct.brand}
              </div>
            </div>
            <Link
              href={withFrom(nextProduct.href)}
              style={{
                flexShrink: 0,
                borderRadius: 12,
                padding: "10px 14px",
                fontSize: 13,
                fontWeight: 800,
                color: "#fff",
                textDecoration: "none",
                background: PRIMARY,
              }}
            >
              보러가기 →
            </Link>
          </div>
        </div>
      ) : null}

      {purchase ? (
        <ProductPurchaseBar href={purchase.url} label={purchase.label} />
      ) : (
        <ProductPurchaseBar preparing />
      )}
    </div>
  );
}
