"use client";

import Link from "next/link";
import { useEffect, useRef, useState, type CSSProperties, type ReactNode } from "react";
import {
  Ban,
  BookOpen,
  Check,
  ChevronRight,
  ClipboardList,
  Construction,
  Droplets,
  FlaskConical,
  Lightbulb,
  Search,
  Sparkles,
} from "lucide-react";
import ProductPhBadge from "@/components/knowledge-hub/ProductPhBadge";
import ProInquiryCta from "@/components/knowledge-hub/ProInquiryCta";
import type { MaterialDetailData } from "@/lib/knowledge-hub/materials/get-material-detail";
import { parseProductPh } from "@/lib/knowledge-hub/ph-scale";

const TEXT = "#1a2a3a";
const TEXT_SEC = "#6b7a8d";
const BORDER = "#e8edf3";
const BG = "#f5f7fb";
const CARD_SHADOW = "0 2px 12px rgba(26, 42, 58, 0.06)";

type MaterialTheme = {
  primary: string;
  soft: string;
  tipBg: string;
  tipBorder: string;
  stepColors: string[];
};

/** 재질별 고정 테마 — 페이지마다 다른 색 */
const MATERIAL_THEMES: Record<string, MaterialTheme> = {
  porcelain: {
    primary: "#0984e3",
    soft: "#74b9ff",
    tipBg: "#eaf4ff",
    tipBorder: "#c5dff7",
    stepColors: ["#0984e3", "#00b894", "#e17055", "#6c5ce7"],
  },
  "ceramic-tile": {
    primary: "#00b894",
    soft: "#55efc4",
    tipBg: "#e8f8f3",
    tipBorder: "#b8e6d5",
    stepColors: ["#00b894", "#0984e3", "#e17055", "#6c5ce7"],
  },
  grout: {
    primary: "#636e72",
    soft: "#b2bec3",
    tipBg: "#f1f2f6",
    tipBorder: "#dfe4ea",
    stepColors: ["#636e72", "#0984e3", "#e17055", "#00b894"],
  },
  stainless: {
    primary: "#2d3436",
    soft: "#636e72",
    tipBg: "#f1f2f6",
    tipBorder: "#dfe6e9",
    stepColors: ["#2d3436", "#0984e3", "#00b894", "#e17055"],
  },
  "chrome-faucet": {
    primary: "#00cec9",
    soft: "#81ecec",
    tipBg: "#e8fbfa",
    tipBorder: "#b2f0ef",
    stepColors: ["#00cec9", "#0984e3", "#6c5ce7", "#e17055"],
  },
  marble: {
    primary: "#e84393",
    soft: "#fd79a8",
    tipBg: "#fff0f6",
    tipBorder: "#f8c8dc",
    stepColors: ["#e84393", "#6c5ce7", "#0984e3", "#00b894"],
  },
  granite: {
    primary: "#2c3e50",
    soft: "#7f8c8d",
    tipBg: "#eef2f5",
    tipBorder: "#d5dde3",
    stepColors: ["#2c3e50", "#e67e22", "#0984e3", "#00b894"],
  },
  "epoxy-floor": {
    primary: "#6c5ce7",
    soft: "#a29bfe",
    tipBg: "#f3f0ff",
    tipBorder: "#d6d0f5",
    stepColors: ["#6c5ce7", "#0984e3", "#00b894", "#e17055"],
  },
  "laminate-wood": {
    primary: "#d35400",
    soft: "#e67e22",
    tipBg: "#fff4e8",
    tipBorder: "#f5d5b0",
    stepColors: ["#d35400", "#00b894", "#0984e3", "#6c5ce7"],
  },
  silicone: {
    primary: "#8e44ad",
    soft: "#be90d4",
    tipBg: "#f7eefb",
    tipBorder: "#e5d0f0",
    stepColors: ["#8e44ad", "#e84393", "#0984e3", "#00b894"],
  },
  glass: {
    primary: "#3498db",
    soft: "#5dade2",
    tipBg: "#eaf4fb",
    tipBorder: "#c5dff0",
    stepColors: ["#3498db", "#00cec9", "#6c5ce7", "#e17055"],
  },
  "pvc-deco": {
    primary: "#16a085",
    soft: "#1abc9c",
    tipBg: "#e8f8f5",
    tipBorder: "#b8e6dc",
    stepColors: ["#16a085", "#0984e3", "#e17055", "#6c5ce7"],
  },
  aluminum: {
    primary: "#7f8c8d",
    soft: "#bdc3c7",
    tipBg: "#f4f6f7",
    tipBorder: "#dde1e2",
    stepColors: ["#7f8c8d", "#0984e3", "#e67e22", "#00b894"],
  },
  "brass-bronze": {
    primary: "#b7950b",
    soft: "#f4d03f",
    tipBg: "#fef9e7",
    tipBorder: "#f9e79f",
    stepColors: ["#b7950b", "#d35400", "#0984e3", "#00b894"],
  },
  concrete: {
    primary: "#5d6d7e",
    soft: "#85929e",
    tipBg: "#eef1f4",
    tipBorder: "#d5dbe0",
    stepColors: ["#5d6d7e", "#e67e22", "#00b894", "#0984e3"],
  },
  "exterior-wall": {
    primary: "#1abc9c",
    soft: "#48c9b0",
    tipBg: "#e8f8f5",
    tipBorder: "#b8e6dc",
    stepColors: ["#1abc9c", "#3498db", "#e67e22", "#8e44ad"],
  },
  enamel: {
    primary: "#c0392b",
    soft: "#e74c3c",
    tipBg: "#fdecea",
    tipBorder: "#f5c6cb",
    stepColors: ["#c0392b", "#8e44ad", "#0984e3", "#00b894"],
  },
  leather: {
    primary: "#922b21",
    soft: "#c0392b",
    tipBg: "#f9ebea",
    tipBorder: "#f0b9b4",
    stepColors: ["#922b21", "#d35400", "#6c5ce7", "#00b894"],
  },
  carpet: {
    primary: "#e67e22",
    soft: "#f39c12",
    tipBg: "#fef5e7",
    tipBorder: "#fad7a0",
    stepColors: ["#e67e22", "#8e44ad", "#0984e3", "#00b894"],
  },
  "painted-wall": {
    primary: "#9b59b6",
    soft: "#bb8fce",
    tipBg: "#f5eef8",
    tipBorder: "#e0cfee",
    stepColors: ["#9b59b6", "#e84393", "#0984e3", "#00b894"],
  },
  plastic: {
    primary: "#27ae60",
    soft: "#2ecc71",
    tipBg: "#eafaf1",
    tipBorder: "#c3e6cb",
    stepColors: ["#27ae60", "#0984e3", "#e67e22", "#6c5ce7"],
  },
};

const FALLBACK_THEMES: MaterialTheme[] = [
  {
    primary: "#6c5ce7",
    soft: "#a29bfe",
    tipBg: "#f3f0ff",
    tipBorder: "#d6d0f5",
    stepColors: ["#6c5ce7", "#0984e3", "#00b894", "#e17055"],
  },
  {
    primary: "#00b894",
    soft: "#55efc4",
    tipBg: "#e8f8f3",
    tipBorder: "#b8e6d5",
    stepColors: ["#00b894", "#0984e3", "#e17055", "#6c5ce7"],
  },
  {
    primary: "#e17055",
    soft: "#fab1a0",
    tipBg: "#fff4e8",
    tipBorder: "#f5d5b0",
    stepColors: ["#e17055", "#6c5ce7", "#0984e3", "#00b894"],
  },
  {
    primary: "#0984e3",
    soft: "#74b9ff",
    tipBg: "#eaf4ff",
    tipBorder: "#c5dff7",
    stepColors: ["#0984e3", "#00b894", "#e17055", "#6c5ce7"],
  },
];

function hashId(id: string): number {
  let h = 0;
  for (let i = 0; i < id.length; i++) h = (h * 31 + id.charCodeAt(i)) >>> 0;
  return h;
}

function themeForMaterial(id: string): MaterialTheme {
  return MATERIAL_THEMES[id] ?? FALLBACK_THEMES[hashId(id) % FALLBACK_THEMES.length]!;
}

const CONTAMINANT_TONES = [
  { accent: "#e67e22", soft: "#fff4e8", tagBg: "#ffe8d1", Icon: Construction },
  { accent: "#c0392b", soft: "#fdecea", tagBg: "#fadbd8", Icon: Droplets },
  { accent: "#8e44ad", soft: "#f5eef8", tagBg: "#e8daef", Icon: FlaskConical },
  { accent: "#2980b9", soft: "#eaf4fb", tagBg: "#d6ebf8", Icon: Sparkles },
];

const RECIPE_TONES = [
  { bg: "#eaf4ff", border: "#74b9ff", title: "#0984e3" },
  { bg: "#e8f8f0", border: "#55efc4", title: "#00b894" },
  { bg: "#fff4e8", border: "#fdcb6e", title: "#e17055" },
  { bg: "#f5eef8", border: "#a29bfe", title: "#6c5ce7" },
];

const MATERIAL_CARD_TONES = [
  { bg: "#fdecea", border: "#e74c3c", badge: "고위험", badgeBg: "#e74c3c" },
  { bg: "#e8f8f0", border: "#00b894", badge: "안전", badgeBg: "#00b894" },
  { bg: "#eaf4ff", border: "#0984e3", badge: "주의", badgeBg: "#0984e3" },
  { bg: "#f5eef8", border: "#6c5ce7", badge: "주의", badgeBg: "#6c5ce7" },
];

type Props = {
  data: MaterialDetailData;
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

function riskLabel(level: string): string {
  if (level === "very_high" || level === "high") return "고위험";
  if (level === "low") return "안전";
  return "주의";
}

/**
 * 재질 상세 — 제품 상세와 같은 체류·탐색 UX (스크린샷 디테일)
 */
export default function MaterialDetailView({ data }: Props) {
  const { material, guide, intro, products, contaminants, recipes, solutions, moreLinks, nextMaterials, stats } =
    data;
  const theme = themeForMaterial(material.id);
  const PRIMARY = theme.primary;
  const PRIMARY_SOFT = theme.soft;
  const STEP_COLORS = theme.stepColors;

  const [activeSection, setActiveSection] = useState(0);
  const [expandedProduct, setExpandedProduct] = useState<string | null>(null);
  const [expandedContaminant, setExpandedContaminant] = useState<string | null>(null);
  const [showAllSolutions, setShowAllSolutions] = useState(false);
  const [readProgress, setReadProgress] = useState(0);
  const [showNextBar, setShowNextBar] = useState(false);
  const sectionRefs = useRef<(HTMLElement | null)[]>([]);

  const tabs = [
    { id: "overview", label: "한눈에 보기" },
    { id: "products", label: "추천 제품" },
    { id: "pollution", label: "오염 가이드" },
    { id: "recipes", label: "레시피" },
    { id: "explore", label: "더 탐색" },
  ];

  const visibleSolutions = showAllSolutions ? solutions : solutions.slice(0, 4);
  const hiddenSolutionCount = Math.max(0, solutions.length - 4);
  const nextMaterial = nextMaterials[0] ?? null;

  const withFrom = (href: string) => {
    const join = href.includes("?") ? "&" : "?";
    return `${href}${join}from=${encodeURIComponent(material.id)}`;
  };

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
                  boxShadow: active ? "0 2px 8px rgba(108,92,231,0.28)" : `inset 0 0 0 1px ${BORDER}`,
                }}
              >
                {tab.label}
              </button>
            );
          })}
        </div>
      </div>

      <article style={{ padding: "12px 16px 150px" }}>
        <nav style={{ marginBottom: 12, fontSize: 14, fontWeight: 600, color: TEXT_SEC }}>
          <Link href="/materials" style={{ color: TEXT_SEC, textDecoration: "none" }}>
            재질별 청소
          </Link>
          <span style={{ margin: "0 6px" }}>›</span>
          <span style={{ color: PRIMARY }}>{material.name.split("·")[0]}</span>
        </nav>

        {/* 히어로 */}
        <section
          style={{
            borderRadius: 20,
            padding: "20px 16px",
            marginBottom: 20,
            background: `linear-gradient(135deg, ${PRIMARY}, ${PRIMARY_SOFT})`,
            color: "#fff",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8, flexWrap: "wrap" }}>
            <span
              style={{
                fontSize: 12,
                fontWeight: 800,
                padding: "4px 9px",
                borderRadius: 999,
                background: "rgba(255,255,255,0.25)",
              }}
            >
              재질 · 표면 안전
            </span>
            <span
              style={{
                fontSize: 12,
                fontWeight: 800,
                padding: "4px 9px",
                borderRadius: 999,
                background: "rgba(255,255,255,0.2)",
              }}
            >
              {riskLabel(material.riskLevel)}
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
            {material.name}
          </h1>
          <p style={{ margin: "10px 0 0", fontSize: 15, lineHeight: 1.55, opacity: 0.95 }}>{intro}</p>

          <div
            style={{
              display: "grid",
              gridTemplateColumns: "1fr 1fr",
              gap: 8,
              marginTop: 16,
            }}
          >
            {[
              { top: "재질 보호", bottom: "표면 안전" },
              { top: String(stats.productCount), bottom: "호환 제품" },
              { top: String(stats.contaminantCount), bottom: "주요 오염" },
              {
                top: String(stats.recipeCount || stats.solutionCount),
                bottom: "처방 레시피",
              },
            ].map((s) => (
              <div
                key={s.bottom}
                style={{
                  background: "rgba(255,255,255,0.18)",
                  borderRadius: 14,
                  padding: "14px 10px",
                  textAlign: "center",
                }}
              >
                <div style={{ fontSize: 20, fontWeight: 900, lineHeight: 1.2 }}>{s.top}</div>
                <div style={{ marginTop: 6, fontSize: 12, fontWeight: 700, opacity: 0.92 }}>{s.bottom}</div>
              </div>
            ))}
          </div>
        </section>

        {/* 한눈에 보기 — Figma 레이아웃 */}
        <section ref={setSectionRef(0)} id="overview" style={{ marginBottom: 22 }}>
          <SectionHead title="한눈에 보기" color={PRIMARY} subtitle="핵심만 먼저 파악하기" />

          {guide?.principle ? (
            <div
              style={{
                background: theme.tipBg,
                border: `1px solid ${theme.tipBorder}`,
                borderRadius: 18,
                padding: "16px 16px 18px",
                marginBottom: 12,
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 10 }}>
                <Lightbulb size={18} color={PRIMARY} />
                <span style={{ fontSize: 14, fontWeight: 800, color: PRIMARY }}>한줄로 보면</span>
              </div>
              <p
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
                {guide.principle}
              </p>
            </div>
          ) : null}

          <div
            style={{
              display: "grid",
              gridTemplateColumns: guide?.donts?.length && guide?.okHints?.length ? "1fr 1fr" : "1fr",
              gap: 10,
              marginBottom: 12,
            }}
          >
            {guide?.donts?.length ? (
              <div
                style={{
                  background: "#fff5f5",
                  border: "1px solid #ffd0d0",
                  borderRadius: 18,
                  padding: 14,
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 12 }}>
                  <Ban size={16} color="#e74c3c" />
                  <span style={{ fontSize: 15, fontWeight: 800, color: TEXT }}>하면 안 됨</span>
                </div>
                <ul style={{ margin: 0, padding: 0, listStyle: "none" }}>
                  {guide.donts.map((d) => (
                    <li
                      key={d}
                      style={{
                        display: "flex",
                        gap: 8,
                        marginBottom: 10,
                        fontSize: 14,
                        fontWeight: 600,
                        lineHeight: 1.5,
                        color: TEXT,
                      }}
                    >
                      <span style={{ color: "#e74c3c", fontWeight: 900, flexShrink: 0 }}>✕</span>
                      <span style={{ wordBreak: "keep-all" }}>{d}</span>
                    </li>
                  ))}
                </ul>
              </div>
            ) : null}

            {guide?.okHints?.length ? (
              <div
                style={{
                  background: "#f0faf5",
                  border: "1px solid #c6ebd8",
                  borderRadius: 18,
                  padding: 14,
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 12 }}>
                  <Check size={16} color="#00b894" />
                  <span style={{ fontSize: 15, fontWeight: 800, color: TEXT }}>권장 접근</span>
                </div>
                <ul style={{ margin: 0, padding: 0, listStyle: "none" }}>
                  {guide.okHints.map((h) => (
                    <li
                      key={h}
                      style={{
                        display: "flex",
                        gap: 8,
                        marginBottom: 10,
                        fontSize: 14,
                        fontWeight: 600,
                        lineHeight: 1.5,
                        color: TEXT,
                      }}
                    >
                      <span style={{ color: "#00b894", fontWeight: 900, flexShrink: 0 }}>✓</span>
                      <span style={{ wordBreak: "keep-all" }}>{h}</span>
                    </li>
                  ))}
                </ul>
              </div>
            ) : null}
          </div>

          {guide?.care?.length ? (
            <WhiteCard style={{ padding: 16, borderRadius: 18 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 14 }}>
                <ClipboardList size={17} color={PRIMARY} />
                <span style={{ fontSize: 16, fontWeight: 800, color: TEXT }}>일상 관리</span>
              </div>
              <ol style={{ margin: 0, padding: 0, listStyle: "none" }}>
                {guide.care.map((c, i) => (
                  <li
                    key={c}
                    style={{ display: "flex", gap: 10, marginTop: i ? 12 : 0, alignItems: "flex-start" }}
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
                    <span
                      style={{
                        fontSize: 15,
                        fontWeight: 600,
                        lineHeight: 1.55,
                        color: TEXT,
                        paddingTop: 2,
                        wordBreak: "keep-all",
                      }}
                    >
                      {c}
                    </span>
                  </li>
                ))}
              </ol>
            </WhiteCard>
          ) : null}
        </section>

        {/* 추천 제품 — 시인성 강화 */}
        <section ref={setSectionRef(1)} id="products" style={{ marginBottom: 22 }}>
          <SectionHead title="호환·추천 제품" color={PRIMARY} subtitle="클릭해서 희석·사용법 확인" />
          {products.length ? (
            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              {products.map((p) => {
                const expanded = expandedProduct === p.id;
                const ph = parseProductPh(p.phApprox);
                const accent = ph?.color ?? PRIMARY;
                return (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() => setExpandedProduct(expanded ? null : p.id)}
                    style={{
                      textAlign: "left",
                      cursor: "pointer",
                      border: `1px solid ${BORDER}`,
                      borderLeft: `4px solid ${accent}`,
                      borderRadius: 16,
                      background: expanded ? theme.tipBg : "#fff",
                      boxShadow: CARD_SHADOW,
                      padding: "16px 16px 16px 14px",
                    }}
                  >
                    <div style={{ display: "flex", justifyContent: "space-between", gap: 10, alignItems: "flex-start" }}>
                      <div style={{ minWidth: 0, flex: 1 }}>
                        <div style={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: 6 }}>
                          <span style={{ fontSize: 11, fontWeight: 800, color: TEXT_SEC, letterSpacing: "0.02em" }}>
                            {p.brand}
                          </span>
                          {ph ? <ProductPhBadge phApprox={p.phApprox} size="sm" /> : null}
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
                          {p.name}
                        </div>
                        <div
                          style={{
                            marginTop: 8,
                            fontSize: 20,
                            fontWeight: 900,
                            color: TEXT,
                            letterSpacing: "-0.03em",
                            wordBreak: "keep-all",
                          }}
                        >
                          희석{" "}
                          <span style={{ color: accent }}>{p.dilution}</span>
                        </div>
                        {p.tags.length ? (
                          <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginTop: 12 }}>
                            {p.tags.map((t) => (
                              <span
                                key={t}
                                style={{
                                  fontSize: 13,
                                  fontWeight: 700,
                                  color: TEXT,
                                  background: "#f1f5f9",
                                  borderRadius: 999,
                                  padding: "6px 11px",
                                }}
                              >
                                {t}
                              </span>
                            ))}
                          </div>
                        ) : null}
                        {!expanded && p.tip ? (
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
                            팁 · {p.tip}
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
                        {p.tip ? (
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
                            {p.tip}
                          </div>
                        ) : null}
                        <Link
                          href={withFrom(p.href)}
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
                      </div>
                    ) : null}
                  </button>
                );
              })}
            </div>
          ) : (
            <p style={{ fontSize: 14, color: TEXT_SEC }}>연결된 호환 제품이 없습니다.</p>
          )}
        </section>

        {/* 오염 가이드 */}
        <section ref={setSectionRef(2)} id="pollution" style={{ marginBottom: 22 }}>
          <SectionHead title="이 재질에 자주 오는 오염" color="#e67e22" subtitle="오염 유형을 클릭해 대처법 확인" />
          {contaminants.length ? (
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 16 }}>
              {contaminants.map((c, i) => {
                const tone = CONTAMINANT_TONES[i % CONTAMINANT_TONES.length]!;
                const expanded = expandedContaminant === c.id;
                const Icon = tone.Icon;
                return (
                  <button
                    key={c.id}
                    type="button"
                    onClick={() => setExpandedContaminant(expanded ? null : c.id)}
                    style={{
                      gridColumn: expanded ? "span 2" : "span 1",
                      textAlign: "left",
                      cursor: "pointer",
                      border: `1px solid ${BORDER}`,
                      borderRadius: 16,
                      background: expanded ? tone.soft : "#fff",
                      boxShadow: CARD_SHADOW,
                      padding: 14,
                      minHeight: expanded ? undefined : 140,
                      display: "flex",
                      flexDirection: "column",
                    }}
                  >
                    <Icon size={26} color={tone.accent} strokeWidth={1.8} />
                    <div
                      style={{
                        marginTop: 10,
                        fontSize: 15.5,
                        fontWeight: 900,
                        color: TEXT,
                        lineHeight: 1.4,
                        wordBreak: "keep-all",
                        flex: 1,
                      }}
                    >
                      {c.name}
                    </div>
                    <div
                      style={{
                        display: "inline-block",
                        alignSelf: "flex-start",
                        marginTop: 8,
                        fontSize: 13,
                        fontWeight: 800,
                        color: tone.accent,
                        background: tone.tagBg,
                        borderRadius: 999,
                        padding: "4px 10px",
                      }}
                    >
                      {c.severity}
                    </div>
                    {expanded ? (
                      <div style={{ marginTop: 14 }} onClick={(e) => e.stopPropagation()}>
                        <div
                          style={{
                            background: "#fff",
                            borderRadius: 12,
                            padding: "10px 12px",
                            fontSize: 14,
                            lineHeight: 1.55,
                            color: TEXT,
                            marginBottom: 10,
                            wordBreak: "keep-all",
                          }}
                        >
                          {c.prescription}
                        </div>
                        <Link
                          href={c.recipeHref ?? c.href}
                          style={{
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            minHeight: 44,
                            borderRadius: 12,
                            background: tone.accent,
                            color: "#fff",
                            fontSize: 15,
                            fontWeight: 800,
                            textDecoration: "none",
                          }}
                        >
                          상세 제거법 보기 →
                        </Link>
                        <div
                          style={{
                            marginTop: 8,
                            textAlign: "right",
                            fontSize: 13,
                            fontWeight: 700,
                            color: TEXT_SEC,
                          }}
                        >
                          접기 ▲
                        </div>
                      </div>
                    ) : (
                      <div
                        style={{
                          marginTop: 12,
                          display: "flex",
                          justifyContent: "flex-end",
                          fontSize: 14,
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
          ) : null}

          {solutions.length ? (
            <WhiteCard style={{ padding: 16 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 10 }}>
                <Search size={16} color={PRIMARY} />
                <span style={{ fontSize: 16, fontWeight: 800, color: TEXT }}>검색어·처방 가이드</span>
              </div>
              <ul style={{ margin: 0, padding: 0, listStyle: "none" }}>
                {visibleSolutions.map((s) => (
                  <li key={s.href} style={{ borderTop: `1px solid ${BORDER}` }}>
                    <Link
                      href={s.href}
                      style={{
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "space-between",
                        gap: 8,
                        padding: "14px 2px",
                        textDecoration: "none",
                        color: TEXT,
                      }}
                    >
                      <span style={{ fontSize: 15, fontWeight: 700, wordBreak: "keep-all" }}>{s.title}</span>
                      <ChevronRight size={16} color={TEXT_SEC} />
                    </Link>
                  </li>
                ))}
              </ul>
              {hiddenSolutionCount > 0 ? (
                <button
                  type="button"
                  onClick={() => setShowAllSolutions((v) => !v)}
                  style={{
                    width: "100%",
                    marginTop: 4,
                    border: `1px solid ${BORDER}`,
                    borderRadius: 12,
                    background: BG,
                    padding: "12px",
                    fontSize: 14,
                    fontWeight: 800,
                    color: PRIMARY,
                    cursor: "pointer",
                  }}
                >
                  {showAllSolutions ? "접기 ▲" : `나머지 ${hiddenSolutionCount}개 더 보기 ▼`}
                </button>
              ) : null}
            </WhiteCard>
          ) : null}
        </section>

        {/* 레시피 */}
        <section ref={setSectionRef(3)} id="recipes" style={{ marginBottom: 22 }}>
          <SectionHead title="이 재질 레시피" color="#00b894" subtitle="바로 따라할 수 있는 희석 처방" />
          {recipes.length ? (
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
              {recipes.map((r, i) => {
                const tone = RECIPE_TONES[i % RECIPE_TONES.length]!;
                return (
                  <Link
                    key={r.id}
                    href={r.href}
                    style={{
                      borderRadius: 16,
                      background: tone.bg,
                      border: `1px solid ${tone.border}`,
                      padding: 14,
                      textDecoration: "none",
                      boxShadow: CARD_SHADOW,
                    }}
                  >
                    <div
                      style={{
                        fontSize: 15,
                        fontWeight: 800,
                        color: TEXT,
                        lineHeight: 1.4,
                        wordBreak: "keep-all",
                      }}
                    >
                      {r.title}
                    </div>
                    <div style={{ marginTop: 8, fontSize: 20, fontWeight: 900, color: tone.title }}>
                      희석 {r.dilution}
                    </div>
                    <div style={{ marginTop: 6, fontSize: 13, color: TEXT_SEC, lineHeight: 1.45 }}>{r.note}</div>
                    {r.chips.length ? (
                      <div style={{ marginTop: 8, fontSize: 12, fontWeight: 700, color: TEXT_SEC, lineHeight: 1.4 }}>
                        {r.chips.join(" · ")}
                      </div>
                    ) : null}
                    <div style={{ marginTop: 10, fontSize: 14, fontWeight: 800, color: tone.title }}>
                      레시피 전체 보기 →
                    </div>
                  </Link>
                );
              })}
            </div>
          ) : (
            <p style={{ fontSize: 14, color: TEXT_SEC }}>등록된 레시피가 없습니다.</p>
          )}
        </section>

        {/* 더 탐색 */}
        <section ref={setSectionRef(4)} id="explore" style={{ marginBottom: 22 }}>
          <SectionHead title="다른 재질도 탐색하기" color="#e17055" subtitle="재질별 청소 가이드 전체" />
          {nextMaterials.length ? (
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 16 }}>
              {nextMaterials.map((m, i) => {
                const tone = MATERIAL_CARD_TONES[
                  m.riskLevel === "high" || m.riskLevel === "very_high"
                    ? 0
                    : m.riskLevel === "low"
                      ? 1
                      : (i % 2) + 2
                ]!;
                return (
                  <Link
                    key={m.href}
                    href={withFrom(m.href)}
                    style={{
                      borderRadius: 16,
                      background: tone.bg,
                      border: `1px solid ${tone.border}33`,
                      padding: 14,
                      textDecoration: "none",
                      boxShadow: CARD_SHADOW,
                    }}
                  >
                    <div
                      style={{
                        display: "inline-block",
                        fontSize: 12,
                        fontWeight: 800,
                        color: "#fff",
                        background: tone.badgeBg,
                        borderRadius: 999,
                        padding: "4px 9px",
                      }}
                    >
                      {m.subtitle ?? tone.badge}
                    </div>
                    <div
                      style={{
                        marginTop: 10,
                        fontSize: 15.5,
                        fontWeight: 900,
                        color: TEXT,
                        lineHeight: 1.4,
                        wordBreak: "keep-all",
                      }}
                    >
                      {m.title}
                    </div>
                  </Link>
                );
              })}
            </div>
          ) : null}

          <WhiteCard style={{ padding: 16, marginBottom: 14 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 8 }}>
              <BookOpen size={16} color={PRIMARY} />
              <span style={{ fontSize: 16, fontWeight: 800, color: TEXT }}>더 보기</span>
              </div>
              <ul style={{ margin: 0, padding: 0, listStyle: "none" }}>
                {moreLinks.map((l) => (
                  <li key={l.href} style={{ borderTop: `1px solid ${BORDER}` }}>
                    <Link
                      href={l.href}
                      style={{
                        display: "block",
                        padding: "12px 2px",
                        textDecoration: "none",
                      }}
                    >
                      <div style={{ fontSize: 15, fontWeight: 800, color: TEXT }}>{l.title}</div>
                      {l.note ? (
                        <div style={{ marginTop: 2, fontSize: 13, color: TEXT_SEC }}>{l.note}</div>
                      ) : null}
                    </Link>
                  </li>
                ))}
              </ul>
          </WhiteCard>

          <div style={{ marginTop: 8 }}>
            <ProInquiryCta path={`/materials/${material.id}`} materialId={material.id} />
          </div>
        </section>
      </article>

      {nextMaterial && showNextBar ? (
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
              <div style={{ fontSize: 12, fontWeight: 700, color: TEXT_SEC }}>다음으로 볼 재질</div>
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
                {nextMaterial.title}
              </div>
            </div>
            <Link
              href={withFrom(nextMaterial.href)}
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
