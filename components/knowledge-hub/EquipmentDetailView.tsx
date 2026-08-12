"use client";

import Link from "next/link";
import { useEffect, useRef, useState, type CSSProperties, type ReactNode } from "react";
import {
  AlertTriangle,
  Ban,
  Check,
  ChevronRight,
  ClipboardList,
  MapPin,
  Wrench,
} from "lucide-react";
import type {
  KnowledgeEquipment,
  KnowledgeEquipmentModel,
} from "@/lib/knowledge-hub/equipment/types";
import KnowledgeHeroImage from "@/components/knowledge-hub/KnowledgeHeroImage";

type Related = { id: string; name: string; href: string; subtitle?: string };

type Props = {
  equipment: KnowledgeEquipment;
  categoryName: string;
  models: KnowledgeEquipmentModel[];
  relatedEquipment: Related[];
  relatedProducts: Related[];
};

const PRIMARY = "#00b894";
const PRIMARY_DARK = "#00cec9";
const TEXT = "#1a2a3a";
const TEXT_SEC = "#6b7a8d";
const BORDER = "#e8edf3";
const BG = "#f5f7fb";
const CARD_SHADOW = "0 2px 12px rgba(26, 42, 58, 0.06)";
const STEP_COLORS = ["#00b894", "#0984e3", "#e17055", "#6c5ce7", "#00cec9", "#fd79a8"];
const RELATED_PASTELS = ["#eaf4ff", "#eef8ef", "#fff8e8", "#fceff4", "#e9f8f7", "#f3eefc"];

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

function ChipList({ items, color = PRIMARY }: { items: string[]; color?: string }) {
  return (
    <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
      {items.map((item) => (
        <span
          key={item}
          style={{
            fontSize: 13,
            fontWeight: 700,
            color,
            background: "#fff",
            border: `1px solid ${color}55`,
            borderRadius: 999,
            padding: "7px 11px",
            wordBreak: "keep-all",
          }}
        >
          {item}
        </span>
      ))}
    </div>
  );
}

export default function EquipmentDetailView({
  equipment,
  categoryName,
  models,
  relatedEquipment,
  relatedProducts,
}: Props) {
  const e = equipment;
  const [activeSection, setActiveSection] = useState(0);
  const [showAllWarnings, setShowAllWarnings] = useState(false);
  const [showAllMistakes, setShowAllMistakes] = useState(false);
  const [readProgress, setReadProgress] = useState(0);
  const sectionRefs = useRef<(HTMLElement | null)[]>([]);

  const warnings = e.warnings.filter(Boolean);
  const mistakes = e.beginnerMistakes.filter(Boolean);
  const visibleWarnings = showAllWarnings ? warnings : warnings.slice(0, 4);
  const hiddenWarningCount = Math.max(0, warnings.length - 4);
  const visibleMistakes = showAllMistakes ? mistakes : mistakes.slice(0, 4);
  const hiddenMistakeCount = Math.max(0, mistakes.length - 4);

  const tabs = [
    { id: "howto", label: "기본 사용법" },
    { id: "where", label: "어디에·작업" },
    ...(models.length ? [{ id: "models", label: "브랜드·기종" }] : []),
    { id: "cautions", label: "주의·실수" },
    { id: "info", label: "장비 정보" },
    { id: "explore", label: "탐색하기" },
  ];

  const sectionIndex = (id: string) => tabs.findIndex((t) => t.id === id);

  useEffect(() => {
    const handleScroll = () => {
      const scrollTop = window.scrollY;
      const scrollHeight = document.documentElement.scrollHeight - window.innerHeight;
      setReadProgress(scrollHeight > 0 ? Math.min(100, (scrollTop / scrollHeight) * 100) : 0);

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

  const heroHint =
    e.placeHints.slice(0, 2).join(" · ") || e.jobHints.slice(0, 2).join(" · ") || null;

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
            background: `linear-gradient(90deg, ${PRIMARY}, ${PRIMARY_DARK})`,
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
          <Link href="/equipment" style={{ fontSize: 13, fontWeight: 600, color: TEXT_SEC, textDecoration: "none" }}>
            ← 청소장비
          </Link>
        </nav>

        <section
          style={{
            borderRadius: 20,
            padding: "20px 16px",
            marginBottom: 20,
            background: `linear-gradient(135deg, ${PRIMARY}, ${PRIMARY_DARK})`,
            color: "#fff",
          }}
        >
          {e.imageUrl ? (
            <KnowledgeHeroImage
              src={e.imageUrl}
              alt={e.imageAlt ?? `${e.name} 청소장비`}
            />
          ) : null}
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8, flexWrap: "wrap" }}>
            <span style={{ fontSize: 13, fontWeight: 700 }}>{categoryName}</span>
            <span
              style={{
                fontSize: 11,
                fontWeight: 800,
                padding: "3px 8px",
                borderRadius: 999,
                background: "rgba(255,255,255,0.25)",
              }}
            >
              사용법
            </span>
          </div>
          <h1
            style={{
              margin: 0,
              fontSize: 28,
              fontWeight: 900,
              lineHeight: 1.2,
              letterSpacing: "-0.02em",
            }}
          >
            {e.name}
          </h1>
          {heroHint ? (
            <p style={{ margin: "10px 0 0", fontSize: 14, lineHeight: 1.5, opacity: 0.92 }}>{heroHint}</p>
          ) : null}
        </section>

        {/* 기본 사용법 */}
        <section ref={setSectionRef(sectionIndex("howto"))} id="howto" style={{ marginBottom: 22 }}>
          <SectionHead title="기본 사용법" color={PRIMARY} subtitle="절차 요약" />
          {e.useSteps.length ? (
            <WhiteCard style={{ padding: 18 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 14 }}>
                <ClipboardList size={18} color={PRIMARY} />
                <span style={{ fontSize: 15, fontWeight: 800, color: TEXT }}>기본 절차</span>
              </div>
              <ol style={{ margin: 0, padding: 0, listStyle: "none" }}>
                {e.useSteps.map((step, i) => (
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

          {e.selectionCriteria.length ? (
            <WhiteCard style={{ marginTop: 10, padding: 16 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 10 }}>
                <Check size={16} color={PRIMARY} />
                <span style={{ fontSize: 15, fontWeight: 800, color: TEXT }}>선택 기준</span>
              </div>
              <ul style={{ margin: 0, padding: 0, listStyle: "none" }}>
                {e.selectionCriteria.map((x) => (
                  <li
                    key={x}
                    style={{
                      display: "flex",
                      gap: 8,
                      marginBottom: 10,
                      fontSize: 14,
                      lineHeight: 1.55,
                      color: TEXT,
                    }}
                  >
                    <span style={{ color: PRIMARY, fontWeight: 900 }}>•</span>
                    <span style={{ wordBreak: "keep-all" }}>{x}</span>
                  </li>
                ))}
              </ul>
            </WhiteCard>
          ) : null}
        </section>

        {/* 어디에·작업 */}
        <section ref={setSectionRef(sectionIndex("where"))} id="where" style={{ marginBottom: 22 }}>
          <SectionHead title="어디에 · 어떤 작업" color="#5b6cff" />
          {e.placeHints.length ? (
            <WhiteCard style={{ padding: 16, marginBottom: 10 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 10 }}>
                <MapPin size={16} color="#5b6cff" />
                <span style={{ fontSize: 15, fontWeight: 800, color: TEXT }}>어디에 사용하는가</span>
              </div>
              <ChipList items={e.placeHints} color="#5b6cff" />
            </WhiteCard>
          ) : null}
          {e.jobHints.length ? (
            <WhiteCard style={{ padding: 16 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 10 }}>
                <Wrench size={16} color="#7c5cbf" />
                <span style={{ fontSize: 15, fontWeight: 800, color: TEXT }}>어떤 작업에 필요한가</span>
              </div>
              <ChipList items={e.jobHints} color="#7c5cbf" />
            </WhiteCard>
          ) : null}
        </section>

        {/* 브랜드·기종 */}
        {models.length > 0 ? (
          <section ref={setSectionRef(sectionIndex("models"))} id="models" style={{ marginBottom: 22 }}>
            <SectionHead title="브랜드·기종" color="#0984e3" subtitle="현장에서 자주 보는 모델" />
            <p style={{ margin: "-4px 0 14px", fontSize: 14, color: TEXT_SEC, lineHeight: 1.45 }}>
              스펙·가격은 유통 시점에 따라 달라질 수 있습니다.
            </p>
            <div style={{ display: "grid", gap: 10 }}>
              {models.map((m, i) => (
                <Link
                  key={m.id}
                  href={`/equipment/${e.id}/models/${m.id}`}
                  style={{
                    display: "block",
                    borderRadius: 16,
                    background: RELATED_PASTELS[i % RELATED_PASTELS.length],
                    padding: 16,
                    textDecoration: "none",
                    border: `1px solid ${BORDER}`,
                    boxShadow: CARD_SHADOW,
                  }}
                >
                  <div style={{ fontSize: 12, fontWeight: 700, color: TEXT_SEC }}>{m.brand}</div>
                  <div
                    style={{
                      marginTop: 4,
                      fontSize: 17,
                      fontWeight: 900,
                      color: TEXT,
                      letterSpacing: "-0.02em",
                      wordBreak: "keep-all",
                    }}
                  >
                    {m.name}
                  </div>
                  <div
                    style={{
                      marginTop: 8,
                      fontSize: 13,
                      color: TEXT_SEC,
                      lineHeight: 1.45,
                      display: "-webkit-box",
                      WebkitLineClamp: 2,
                      WebkitBoxOrient: "vertical" as const,
                      overflow: "hidden",
                    }}
                  >
                    {m.summary}
                  </div>
                  <div
                    style={{
                      marginTop: 12,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "flex-end",
                      gap: 2,
                      fontSize: 13,
                      fontWeight: 800,
                      color: "#3498db",
                    }}
                  >
                    보러 가기
                    <ChevronRight size={15} />
                  </div>
                </Link>
              ))}
            </div>
          </section>
        ) : null}

        {/* 주의·실수 */}
        <section ref={setSectionRef(sectionIndex("cautions"))} id="cautions" style={{ marginBottom: 22 }}>
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

          {mistakes.length ? (
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
                <span style={{ fontSize: 16, fontWeight: 800, color: TEXT }}>초보자가 많이 하는 실수</span>
              </div>
              <ul style={{ margin: 0, padding: 0, listStyle: "none" }}>
                {visibleMistakes.map((m) => (
                  <li
                    key={m}
                    style={{
                      display: "flex",
                      gap: 8,
                      marginBottom: 10,
                      fontSize: 14,
                      lineHeight: 1.55,
                      color: TEXT,
                    }}
                  >
                    <span style={{ color: "#e74c3c", fontWeight: 900 }}>•</span>
                    <span style={{ wordBreak: "keep-all" }}>{m}</span>
                  </li>
                ))}
              </ul>
              {hiddenMistakeCount > 0 ? (
                <button
                  type="button"
                  onClick={() => setShowAllMistakes((v) => !v)}
                  style={{
                    width: "100%",
                    marginTop: 6,
                    border: "1px solid #f5c2c7",
                    borderRadius: 12,
                    background: "#fff",
                    padding: "12px 14px",
                    fontSize: 14,
                    fontWeight: 800,
                    color: "#c0392b",
                    cursor: "pointer",
                  }}
                >
                  {showAllMistakes ? "접기 ▲" : `나머지 실수 ${hiddenMistakeCount}개 더 보기 ▼`}
                </button>
              ) : null}
            </div>
          ) : null}
        </section>

        {/* 장비 정보 */}
        <section ref={setSectionRef(sectionIndex("info"))} id="info" style={{ marginBottom: 22 }}>
          <SectionHead title="장비 정보" color="#7c5cbf" />
          <WhiteCard style={{ padding: 16 }}>
            <div style={{ fontSize: 15, fontWeight: 800, color: TEXT, marginBottom: 10 }}>장비란?</div>
            <p style={{ margin: 0, fontSize: 15, lineHeight: 1.65, color: TEXT, wordBreak: "keep-all" }}>
              {e.whatIs}
            </p>
            {e.summary ? (
              <p style={{ margin: "12px 0 0", fontSize: 14, lineHeight: 1.55, color: TEXT_SEC, wordBreak: "keep-all" }}>
                {e.summary}
              </p>
            ) : null}
          </WhiteCard>
        </section>

        {/* 탐색하기 */}
        <section ref={setSectionRef(sectionIndex("explore"))} id="explore" style={{ marginBottom: 22 }}>
          <SectionHead title="이어서 탐색하기" color="#e67e22" />

          {relatedProducts.length ? (
            <div style={{ marginBottom: 18 }}>
              <div style={{ fontSize: 14, fontWeight: 800, color: TEXT, marginBottom: 10 }}>함께 쓰는 세제</div>
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
                    key={p.id}
                    href={p.href}
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
                      {p.subtitle ?? "세제"}
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
                      {p.name}
                    </div>
                    <div style={{ marginTop: 10, fontSize: 13, fontWeight: 800, color: "#3498db" }}>
                      보러 가기 →
                    </div>
                  </Link>
                ))}
              </div>
            </div>
          ) : null}

          {relatedEquipment.length ? (
            <div>
              <div style={{ fontSize: 14, fontWeight: 800, color: TEXT, marginBottom: 10 }}>함께 쓰는 장비</div>
              <div
                style={{
                  display: "flex",
                  gap: 10,
                  overflowX: "auto",
                  paddingBottom: 4,
                  scrollbarWidth: "none",
                }}
              >
                {relatedEquipment.map((x, i) => (
                  <Link
                    key={x.id}
                    href={x.href}
                    style={{
                      width: 160,
                      flexShrink: 0,
                      borderRadius: 16,
                      background: RELATED_PASTELS[(i + 2) % RELATED_PASTELS.length],
                      padding: 14,
                      textDecoration: "none",
                      border: `1px solid ${BORDER}`,
                      boxShadow: CARD_SHADOW,
                    }}
                  >
                    <div style={{ fontSize: 12, fontWeight: 700, color: TEXT_SEC }}>장비</div>
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
                      {x.name}
                    </div>
                    <div style={{ marginTop: 10, fontSize: 13, fontWeight: 800, color: "#3498db" }}>
                      보러 가기 →
                    </div>
                  </Link>
                ))}
              </div>
            </div>
          ) : null}
        </section>
      </article>
    </div>
  );
}
