"use client";

import Link from "next/link";
import { useEffect, useRef, useState, type CSSProperties, type ReactNode } from "react";
import {
  AlertTriangle,
  ChevronRight,
  HelpCircle,
  Lightbulb,
  Search,
  Sparkles,
} from "lucide-react";
import ProductPhBadge from "@/components/knowledge-hub/ProductPhBadge";
import ProInquiryCta from "@/components/knowledge-hub/ProInquiryCta";
import type { AssembledSolution } from "@/lib/knowledge-hub/solutions/view-types";
import { getSolutionPath } from "@/lib/knowledge-hub/solutions/paths";
import type { SolutionStarRating } from "@/lib/knowledge-hub/solutions/types";
import { parseProductPh } from "@/lib/knowledge-hub/ph-scale";

const TEXT = "#1a2a3a";
const TEXT_SEC = "#6b7a8d";
const BORDER = "#e8edf3";
const BG = "#f5f7fb";
const CARD_SHADOW = "0 2px 12px rgba(26, 42, 58, 0.06)";

const PRIMARY = "#0f766e";
const PRIMARY_SOFT = "#14b8a6";
const HERO_END = "#0d9488";
const ACCENT_ORANGE = "#e67e22";
const ACCENT_RED = "#c0392b";
const STEP_COLORS = ["#0d9488", "#0984e3", "#e17055", "#6c5ce7", "#00b894"];

type Props = {
  data: AssembledSolution;
};

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
    <div style={{ marginBottom: 14 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
        <div style={{ width: 4, height: 22, borderRadius: 2, background: color, flexShrink: 0 }} />
        <h2 style={{ fontSize: 20, fontWeight: 900, margin: 0, color: TEXT, letterSpacing: "-0.02em" }}>
          {title}
        </h2>
      </div>
      {subtitle ? (
        <p style={{ margin: "6px 0 0 12px", fontSize: 14, fontWeight: 600, color: TEXT_SEC, lineHeight: 1.4 }}>
          {subtitle}
        </p>
      ) : null}
    </div>
  );
}

function Rating({ value, label }: { value: SolutionStarRating; label: string }) {
  return (
    <span
      style={{ display: "inline-flex", alignItems: "center", gap: 2, flexShrink: 0 }}
      aria-label={`${label} ${value}점`}
    >
      {Array.from({ length: 5 }, (_, i) => (
        <span
          key={i}
          style={{
            fontSize: 15,
            lineHeight: 1,
            color: i < value ? "#f5a623" : "#d5dde6",
          }}
          aria-hidden
        >
          ★
        </span>
      ))}
      <span style={{ marginLeft: 6, fontSize: 14, fontWeight: 800, color: TEXT }}>{value}/5</span>
    </span>
  );
}

/**
 * 검색어 가이드 상세 — 제품·재질과 같은 체류·탐색 UX
 */
export default function SolutionDetailView({ data }: Props) {
  const { page, placeLabel, spaceLabel, partLabel, contaminantName, siblings, content, path } = data;

  const [activeSection, setActiveSection] = useState(0);
  const [expandedProduct, setExpandedProduct] = useState<string | null>(null);
  const [readProgress, setReadProgress] = useState(0);
  const [showNextBar, setShowNextBar] = useState(false);
  const sectionRefs = useRef<(HTMLElement | null)[]>([]);

  const tabs = [
    { id: "overview", label: "요약" },
    { id: "detergents", label: "세제" },
    { id: "method", label: "사용법" },
    { id: "cautions", label: "주의" },
    { id: "explore", label: "더 탐색" },
  ];

  const nextSibling = siblings[0] ?? null;
  const chipLabels = [placeLabel, spaceLabel, partLabel].filter(Boolean);

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

  return (
    <div style={{ minHeight: "100vh", background: BG, margin: "0 auto", maxWidth: 480 }}>
      <div
        aria-hidden
        style={{ position: "fixed", top: 0, left: 0, right: 0, height: 3, zIndex: 60, background: BORDER }}
      >
        <div
          style={{
            height: "100%",
            width: `${readProgress}%`,
            background: `linear-gradient(90deg, ${PRIMARY}, ${PRIMARY_SOFT})`,
            transition: "width 80ms linear",
          }}
        />
      </div>

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
            padding: "10px 12px",
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
                  boxShadow: active ? "0 2px 8px rgba(13,148,136,0.28)" : `inset 0 0 0 1px ${BORDER}`,
                }}
              >
                {tab.label}
              </button>
            );
          })}
        </div>
      </div>

      <article
        style={{ padding: "12px 16px 150px" }}
        itemScope
        itemType="https://schema.org/HowTo"
      >
        <meta itemProp="name" content={page.title} />

        <nav style={{ marginBottom: 12, fontSize: 14, fontWeight: 600, color: TEXT_SEC }} aria-label="경로">
          <Link href="/solutions" style={{ color: TEXT_SEC, textDecoration: "none" }}>
            검색어 가이드
          </Link>
          <span style={{ margin: "0 6px" }}>›</span>
          <span style={{ color: PRIMARY }}>{contaminantName}</span>
        </nav>

        {/* 히어로 — 어두운 그라데이션 + 밝은 카드로 대비 확보 */}
        <section
          style={{
            borderRadius: 20,
            padding: "20px 16px",
            marginBottom: 20,
            background: `linear-gradient(135deg, ${PRIMARY} 0%, ${HERO_END} 55%, #0f9f93 100%)`,
            color: "#fff",
          }}
        >
          <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginBottom: 10 }}>
            <span
              style={{
                fontSize: 13,
                fontWeight: 800,
                padding: "5px 11px",
                borderRadius: 999,
                background: "#fff",
                color: PRIMARY,
              }}
            >
              검색어 가이드
            </span>
            {chipLabels.map((label) => (
              <span
                key={label}
                style={{
                  fontSize: 13,
                  fontWeight: 800,
                  padding: "5px 11px",
                  borderRadius: 999,
                  background: "#fff",
                  color: TEXT,
                }}
              >
                {label}
              </span>
            ))}
          </div>
          <h1
            style={{
              margin: 0,
              fontSize: 28,
              fontWeight: 900,
              lineHeight: 1.25,
              letterSpacing: "-0.02em",
              wordBreak: "keep-all",
              textShadow: "0 1px 2px rgba(0,0,0,0.18)",
            }}
          >
            {page.title}
          </h1>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "1fr 1fr",
              gap: 8,
              marginTop: 16,
            }}
          >
            {[
              { top: content.contaminantTypeLabel, bottom: "오염 종류" },
              {
                top: content.difficulty ? `${content.difficulty}/5` : "—",
                bottom: "난이도",
              },
              { top: String(content.recommendations.length || "—"), bottom: "추천 세제" },
              { top: String(content.methodSteps.length || "—"), bottom: "사용 단계" },
            ].map((s) => (
              <div
                key={s.bottom}
                style={{
                  background: "#fff",
                  borderRadius: 14,
                  padding: "16px 10px",
                  textAlign: "center",
                  boxShadow: "0 2px 8px rgba(0,0,0,0.08)",
                }}
              >
                <div
                  style={{
                    fontSize: 22,
                    fontWeight: 900,
                    lineHeight: 1.2,
                    wordBreak: "keep-all",
                    color: PRIMARY,
                  }}
                >
                  {s.top}
                </div>
                <div style={{ marginTop: 7, fontSize: 14, fontWeight: 700, color: TEXT_SEC }}>{s.bottom}</div>
              </div>
            ))}
          </div>
        </section>

        {/* 요약 */}
        <section ref={setSectionRef(0)} id="overview" style={{ marginBottom: 22 }}>
          <SectionHead title="한줄로 보면" color={PRIMARY} subtitle="핵심만 먼저 파악하기" />
          <div
            style={{
              background: "#e6f7f4",
              border: "1px solid #b8e6df",
              borderRadius: 18,
              padding: "16px 16px 18px",
              marginBottom: 14,
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 10 }}>
              <Lightbulb size={18} color={PRIMARY} />
              <span style={{ fontSize: 14, fontWeight: 800, color: PRIMARY }}>요약</span>
            </div>
            <p
              itemProp="description"
              style={{
                margin: 0,
                fontSize: 16,
                fontWeight: 800,
                lineHeight: 1.65,
                color: TEXT,
                wordBreak: "keep-all",
                letterSpacing: "-0.01em",
              }}
            >
              {content.summary}
            </p>
          </div>

          <SectionHead title="이런 오염이에요" color={ACCENT_ORANGE} />
          <WhiteCard style={{ padding: "4px 16px" }}>
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                gap: 12,
                padding: "14px 0",
                borderBottom: `1px solid ${BORDER}`,
              }}
            >
              <span style={{ fontSize: 15, fontWeight: 700, color: TEXT_SEC }}>종류</span>
              <span style={{ fontSize: 16, fontWeight: 800, color: TEXT }}>{content.contaminantTypeLabel}</span>
            </div>
            {content.difficulty ? (
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  gap: 12,
                  padding: "14px 0",
                  borderBottom: content.locations.length ? `1px solid ${BORDER}` : undefined,
                }}
              >
                <span style={{ fontSize: 15, fontWeight: 700, color: TEXT_SEC }}>난이도</span>
                <Rating value={content.difficulty} label="난이도" />
              </div>
            ) : null}
            {content.locations.length ? (
              <div style={{ padding: "14px 0" }}>
                <p style={{ margin: 0, fontSize: 15, fontWeight: 700, color: TEXT_SEC }}>잘 생기는 곳</p>
                <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginTop: 10 }}>
                  {content.locations.map((loc) => (
                    <span
                      key={loc}
                      style={{
                        fontSize: 13,
                        fontWeight: 700,
                        color: TEXT,
                        background: "#f1f5f9",
                        borderRadius: 999,
                        padding: "6px 11px",
                      }}
                    >
                      {loc}
                    </span>
                  ))}
                </div>
              </div>
            ) : null}
          </WhiteCard>
        </section>

        {/* 세제 */}
        <section ref={setSectionRef(1)} id="detergents" style={{ marginBottom: 22 }}>
          <SectionHead title="이 세제를 써보세요" color={PRIMARY} subtitle="클릭해서 희석·사용법 확인" />
          {content.recommendations.length ? (
            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              {content.recommendations.map((r, i) => {
                const key = r.productId || `${r.label}-${i}`;
                const expanded = expandedProduct === key;
                const ph = parseProductPh(r.phApprox);
                const accent = ph?.color ?? (i === 0 ? PRIMARY : "#64748b");
                const top = i === 0;
                return (
                  <button
                    key={key}
                    type="button"
                    onClick={() => setExpandedProduct(expanded ? null : key)}
                    style={{
                      textAlign: "left",
                      cursor: "pointer",
                      border: `1px solid ${BORDER}`,
                      borderLeft: `4px solid ${accent}`,
                      borderRadius: 16,
                      background: expanded || top ? "#e6f7f4" : "#fff",
                      boxShadow: CARD_SHADOW,
                      padding: "16px 16px 16px 14px",
                    }}
                  >
                    <div style={{ display: "flex", justifyContent: "space-between", gap: 10, alignItems: "flex-start" }}>
                      <div style={{ minWidth: 0, flex: 1 }}>
                        <div style={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: 6 }}>
                          {r.brand ? (
                            <span style={{ fontSize: 11, fontWeight: 800, color: TEXT_SEC, letterSpacing: "0.02em" }}>
                              {r.brand}
                            </span>
                          ) : null}
                          {ph ? <ProductPhBadge phApprox={r.phApprox} size="sm" /> : null}
                          {top ? (
                            <span
                              style={{
                                fontSize: 11,
                                fontWeight: 800,
                                color: PRIMARY,
                                background: "#fff",
                                borderRadius: 999,
                                padding: "3px 8px",
                              }}
                            >
                              제일 잘 맞아요
                            </span>
                          ) : null}
                        </div>
                        <div
                          style={{
                            marginTop: 8,
                            fontSize: 18,
                            fontWeight: 900,
                            color: TEXT,
                            lineHeight: 1.3,
                            letterSpacing: "-0.02em",
                            wordBreak: "keep-all",
                          }}
                        >
                          {r.label}
                        </div>
                        <div
                          style={{
                            marginTop: 8,
                            display: "flex",
                            flexWrap: "wrap",
                            alignItems: "center",
                            gap: "8px 14px",
                          }}
                        >
                          {r.dilution ? (
                            <div
                              style={{
                                fontSize: 20,
                                fontWeight: 900,
                                color: TEXT,
                                letterSpacing: "-0.03em",
                                wordBreak: "keep-all",
                              }}
                            >
                              희석 <span style={{ color: accent }}>{r.dilution}</span>
                            </div>
                          ) : (
                            <div style={{ fontSize: 15, fontWeight: 800, color: TEXT_SEC }}>희석 정보 없음</div>
                          )}
                          <Rating value={r.rating} label={r.label} />
                        </div>
                        {!expanded && r.tip ? (
                          <div
                            style={{
                              marginTop: 12,
                              fontSize: 13,
                              lineHeight: 1.45,
                              color: TEXT_SEC,
                              display: "-webkit-box",
                              WebkitLineClamp: 1,
                              WebkitBoxOrient: "vertical" as const,
                              overflow: "hidden",
                            }}
                          >
                            팁 · {r.tip}
                          </div>
                        ) : null}
                      </div>
                      <span
                        style={{
                          flexShrink: 0,
                          fontSize: 13,
                          fontWeight: 800,
                          color: accent,
                          background: "#fff",
                          border: `1.5px solid ${accent}`,
                          borderRadius: 999,
                          padding: "7px 12px",
                          whiteSpace: "nowrap",
                        }}
                      >
                        {expanded ? "접기 ▲" : "상세 ▶"}
                      </span>
                    </div>
                    {expanded ? (
                      <div style={{ marginTop: 14 }} onClick={(e) => e.stopPropagation()}>
                        {r.tip ? (
                          <div
                            style={{
                              background: "#fff",
                              borderRadius: 12,
                              border: `1px solid ${BORDER}`,
                              padding: "12px 14px",
                              fontSize: 14,
                              lineHeight: 1.55,
                              color: TEXT,
                              marginBottom: 12,
                              wordBreak: "keep-all",
                            }}
                          >
                            <span style={{ fontWeight: 800, color: accent }}>사용 팁</span>
                            <span style={{ color: TEXT_SEC }}> · </span>
                            {r.tip}
                          </div>
                        ) : null}
                        {r.href ? (
                          <Link
                            href={r.href}
                            style={{
                              display: "flex",
                              alignItems: "center",
                              justifyContent: "center",
                              minHeight: 48,
                              borderRadius: 12,
                              background: accent,
                              color: ph?.textColor ?? "#fff",
                              fontSize: 15,
                              fontWeight: 800,
                              textDecoration: "none",
                            }}
                          >
                            이 제품 전체 사용법 보기 →
                          </Link>
                        ) : null}
                      </div>
                    ) : null}
                  </button>
                );
              })}
            </div>
          ) : (
            <p style={{ fontSize: 14, color: TEXT_SEC }}>연결된 추천 세제가 없습니다.</p>
          )}
        </section>

        {/* 사용법 */}
        <section ref={setSectionRef(2)} id="method" style={{ marginBottom: 22 }}>
          <SectionHead title="이렇게 하세요" color="#0984e3" subtitle="순서대로 따라 하기" />
          {content.methodSteps.length ? (
            <ol style={{ margin: 0, padding: 0, listStyle: "none", display: "flex", flexDirection: "column", gap: 10 }}>
              {content.methodSteps.map((step, i) => {
                const color = STEP_COLORS[i % STEP_COLORS.length]!;
                return (
                  <li
                    key={i}
                    itemProp="step"
                    itemScope
                    itemType="https://schema.org/HowToStep"
                    style={{
                      display: "flex",
                      gap: 12,
                      background: "#fff",
                      borderRadius: 16,
                      border: `1px solid ${BORDER}`,
                      boxShadow: CARD_SHADOW,
                      padding: "14px 14px",
                    }}
                  >
                    <meta itemProp="position" content={String(i + 1)} />
                    <span
                      style={{
                        flexShrink: 0,
                        width: 36,
                        height: 36,
                        borderRadius: 12,
                        background: color,
                        color: "#fff",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        fontSize: 15,
                        fontWeight: 900,
                      }}
                      aria-hidden
                    >
                      {i + 1}
                    </span>
                    <p
                      itemProp="text"
                      style={{
                        margin: 0,
                        paddingTop: 6,
                        fontSize: 16,
                        fontWeight: 600,
                        lineHeight: 1.55,
                        color: TEXT,
                        wordBreak: "keep-all",
                      }}
                    >
                      {step}
                    </p>
                  </li>
                );
              })}
            </ol>
          ) : (
            <p style={{ fontSize: 14, color: TEXT_SEC }}>등록된 사용 단계가 없습니다.</p>
          )}
        </section>

        {/* 주의 */}
        <section ref={setSectionRef(3)} id="cautions" style={{ marginBottom: 22 }}>
          {content.cautions.length ? (
            <>
              <SectionHead title="꼭 기억해 주세요" color={ACCENT_RED} subtitle="안전·손상 방지" />
              <div
                style={{
                  background: "#fff8f0",
                  border: "1px solid #f5d5b0",
                  borderRadius: 18,
                  padding: "14px 16px",
                  marginBottom: 18,
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 10 }}>
                  <AlertTriangle size={17} color={ACCENT_RED} />
                  <span style={{ fontSize: 14, fontWeight: 800, color: ACCENT_RED }}>주의사항</span>
                </div>
                <ul style={{ margin: 0, padding: 0, listStyle: "none", display: "flex", flexDirection: "column", gap: 10 }}>
                  {content.cautions.map((c) => (
                    <li
                      key={c}
                      style={{
                        display: "flex",
                        gap: 10,
                        fontSize: 15,
                        fontWeight: 700,
                        lineHeight: 1.45,
                        color: TEXT,
                        wordBreak: "keep-all",
                      }}
                    >
                      <span
                        style={{
                          marginTop: 7,
                          width: 7,
                          height: 7,
                          borderRadius: 999,
                          background: ACCENT_RED,
                          flexShrink: 0,
                        }}
                        aria-hidden
                      />
                      {c}
                    </li>
                  ))}
                </ul>
              </div>
            </>
          ) : null}

          {content.ifFails.length ? (
            <>
              <SectionHead title="그래도 안 지워진다면?" color="#8e44ad" subtitle="다른 원인일 수 있어요" />
              <div
                style={{
                  background: "#f7eefb",
                  border: "1px solid #e5d0f0",
                  borderRadius: 18,
                  padding: "14px 16px",
                  marginBottom: 12,
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 8 }}>
                  <HelpCircle size={17} color="#8e44ad" />
                  <span style={{ fontSize: 14, fontWeight: 800, color: "#8e44ad" }}>점검 포인트</span>
                </div>
                <p style={{ margin: 0, fontSize: 14, fontWeight: 600, color: TEXT_SEC, lineHeight: 1.5, wordBreak: "keep-all" }}>
                  다른 오염일 수도 있어요. 아래를 한번 확인해 보세요.
                </p>
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                {content.ifFails.map((item) => (
                  <WhiteCard key={item} style={{ padding: "14px 16px" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                      <Sparkles size={16} color="#8e44ad" />
                      <span style={{ fontSize: 15, fontWeight: 800, color: TEXT, wordBreak: "keep-all" }}>{item}</span>
                    </div>
                  </WhiteCard>
                ))}
              </div>
            </>
          ) : null}

          {!content.cautions.length && !content.ifFails.length ? (
            <p style={{ fontSize: 14, color: TEXT_SEC }}>등록된 주의·점검 항목이 없습니다.</p>
          ) : null}
        </section>

        {/* 더 탐색 */}
        <section ref={setSectionRef(4)} id="explore" style={{ marginBottom: 22 }}>
          <SectionHead
            title={`같은 ${partLabel}, 다른 오염`}
            color={ACCENT_ORANGE}
            subtitle="비슷한 검색어로 이어 보기"
          />
          {siblings.length ? (
            <div style={{ display: "flex", flexDirection: "column", gap: 8, marginBottom: 14 }}>
              {siblings.map((s) => (
                <Link
                  key={s.id}
                  href={getSolutionPath(s)}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 10,
                    background: "#fff",
                    borderRadius: 16,
                    border: `1px solid ${BORDER}`,
                    boxShadow: CARD_SHADOW,
                    padding: "14px 16px",
                    textDecoration: "none",
                  }}
                >
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div
                      style={{
                        fontSize: 15,
                        fontWeight: 800,
                        color: TEXT,
                        lineHeight: 1.4,
                        wordBreak: "keep-all",
                      }}
                    >
                      {s.title}
                    </div>
                  </div>
                  <ChevronRight size={18} color={TEXT_SEC} />
                </Link>
              ))}
            </div>
          ) : (
            <p style={{ fontSize: 14, color: TEXT_SEC, marginBottom: 14 }}>아직 등록된 다른 오염이 없어요.</p>
          )}

          <Link
            href="/solutions"
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: 8,
              minHeight: 52,
              borderRadius: 14,
              background: PRIMARY,
              color: "#fff",
              fontSize: 16,
              fontWeight: 800,
              textDecoration: "none",
              marginBottom: 16,
            }}
          >
            <Search size={18} />
            전체 보기로 이동
          </Link>

          <ProInquiryCta path={path} contaminantId={page.contaminantId} />
        </section>
      </article>

      {nextSibling && showNextBar ? (
        <div
          style={{
            position: "fixed",
            left: 0,
            right: 0,
            bottom: 16,
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
              <div style={{ fontSize: 12, fontWeight: 700, color: TEXT_SEC }}>다음으로 볼 가이드</div>
              <div
                style={{
                  marginTop: 2,
                  fontSize: 15,
                  fontWeight: 800,
                  color: TEXT,
                  whiteSpace: "nowrap",
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                }}
              >
                {nextSibling.title}
              </div>
            </div>
            <Link
              href={getSolutionPath(nextSibling)}
              style={{
                flexShrink: 0,
                borderRadius: 12,
                padding: "10px 14px",
                fontSize: 14,
                fontWeight: 800,
                color: "#fff",
                textDecoration: "none",
                background: PRIMARY,
              }}
            >
              탐색하기 →
            </Link>
          </div>
        </div>
      ) : null}
    </div>
  );
}
