"use client";

import Link from "next/link";
import { useEffect, useRef, useState, type CSSProperties, type ReactNode } from "react";
import { AlertTriangle, Check, ChevronRight, MapPin } from "lucide-react";
import type {
  KnowledgeEquipment,
  KnowledgeEquipmentModel,
} from "@/lib/knowledge-hub/equipment/types";
import KnowledgeHeroImage from "@/components/knowledge-hub/KnowledgeHeroImage";

type Related = { id: string; name: string; href: string };

type Props = {
  model: KnowledgeEquipmentModel;
  equipment: KnowledgeEquipment;
  relatedEquipment: Related[];
};

const PRIMARY = "#00b894";
const PRIMARY_DARK = "#00cec9";
const TEXT = "#1a2a3a";
const TEXT_SEC = "#6b7a8d";
const BORDER = "#e8edf3";
const BG = "#f5f7fb";
const CARD_SHADOW = "0 2px 12px rgba(26, 42, 58, 0.06)";
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

export default function EquipmentModelDetailView({ model, equipment, relatedEquipment }: Props) {
  const [activeSection, setActiveSection] = useState(0);
  const [showAllCautions, setShowAllCautions] = useState(false);
  const [readProgress, setReadProgress] = useState(0);
  const sectionRefs = useRef<(HTMLElement | null)[]>([]);

  const cautions = model.cautions.filter(Boolean);
  const visibleCautions = showAllCautions ? cautions : cautions.slice(0, 4);
  const hiddenCautionCount = Math.max(0, cautions.length - 4);

  const tabs = [
    { id: "bestfor", label: "적합 현장" },
    { id: "notes", label: "선택 메모" },
    ...(cautions.length ? [{ id: "cautions", label: "주의·한계" }] : []),
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
        <nav style={{ marginBottom: 12, fontSize: 13, fontWeight: 600, color: TEXT_SEC }}>
          <Link href="/equipment" style={{ color: TEXT_SEC, textDecoration: "none" }}>
            청소장비
          </Link>
          <span style={{ margin: "0 6px" }}>/</span>
          <Link href={`/equipment/${equipment.id}`} style={{ color: TEXT_SEC, textDecoration: "none" }}>
            {equipment.name}
          </Link>
        </nav>

        <section
          style={{
            borderRadius: 20,
            padding: "20px 16px",
            marginBottom: 20,
            background: `linear-gradient(135deg, #0984e3, ${PRIMARY_DARK})`,
            color: "#fff",
          }}
        >
          {model.imageUrl ? (
            <KnowledgeHeroImage
              src={model.imageUrl}
              alt={model.imageAlt ?? `${model.brand} ${model.name}`}
            />
          ) : null}
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8, flexWrap: "wrap" }}>
            <span style={{ fontSize: 13, fontWeight: 700 }}>{model.brand}</span>
            <span
              style={{
                fontSize: 11,
                fontWeight: 800,
                padding: "3px 8px",
                borderRadius: 999,
                background: "rgba(255,255,255,0.25)",
              }}
            >
              기종
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
            {model.name}
          </h1>
          <p style={{ margin: "10px 0 0", fontSize: 14, lineHeight: 1.5, opacity: 0.92 }}>
            {equipment.name} · {model.summary}
          </p>
        </section>

        <section ref={setSectionRef(sectionIndex("bestfor"))} id="bestfor" style={{ marginBottom: 22 }}>
          <SectionHead title="이런 현장에 잘 맞음" color={PRIMARY} />
          <WhiteCard style={{ padding: 16 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 10 }}>
              <MapPin size={16} color={PRIMARY} />
              <span style={{ fontSize: 15, fontWeight: 800, color: TEXT }}>적합 현장</span>
            </div>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
              {model.bestFor.map((x) => (
                <span
                  key={x}
                  style={{
                    fontSize: 13,
                    fontWeight: 700,
                    color: PRIMARY,
                    background: "#fff",
                    border: `1px solid ${PRIMARY}55`,
                    borderRadius: 999,
                    padding: "7px 11px",
                    wordBreak: "keep-all",
                  }}
                >
                  {x}
                </span>
              ))}
            </div>
          </WhiteCard>
        </section>

        <section ref={setSectionRef(sectionIndex("notes"))} id="notes" style={{ marginBottom: 22 }}>
          <SectionHead title="고를 때 메모" color="#5b6cff" />
          <WhiteCard style={{ padding: 16 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 10 }}>
              <Check size={16} color="#5b6cff" />
              <span style={{ fontSize: 15, fontWeight: 800, color: TEXT }}>선택 포인트</span>
            </div>
            <ul style={{ margin: 0, padding: 0, listStyle: "none" }}>
              {model.selectionNotes.map((x) => (
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
                  <span style={{ color: "#5b6cff", fontWeight: 900 }}>•</span>
                  <span style={{ wordBreak: "keep-all" }}>{x}</span>
                </li>
              ))}
            </ul>
          </WhiteCard>
        </section>

        {cautions.length ? (
          <section ref={setSectionRef(sectionIndex("cautions"))} id="cautions" style={{ marginBottom: 22 }}>
            <div
              style={{
                background: "#fff9eb",
                border: "1px solid #f5d78e",
                borderRadius: 16,
                padding: 16,
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 10 }}>
                <AlertTriangle size={18} color="#d48806" />
                <span style={{ fontSize: 16, fontWeight: 800, color: TEXT }}>주의·한계</span>
              </div>
              <ul style={{ margin: 0, padding: 0, listStyle: "none" }}>
                {visibleCautions.map((c) => (
                  <li
                    key={c}
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
                    <span style={{ wordBreak: "keep-all" }}>{c}</span>
                  </li>
                ))}
              </ul>
              {hiddenCautionCount > 0 ? (
                <button
                  type="button"
                  onClick={() => setShowAllCautions((v) => !v)}
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
                  {showAllCautions ? "접기 ▲" : `나머지 ${hiddenCautionCount}개 더 보기 ▼`}
                </button>
              ) : null}
            </div>
          </section>
        ) : null}

        <section ref={setSectionRef(sectionIndex("explore"))} id="explore" style={{ marginBottom: 22 }}>
          <SectionHead title="이어서 탐색하기" color="#e67e22" />

          <Link
            href={`/equipment/${equipment.id}`}
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              gap: 12,
              borderRadius: 16,
              background: "#e8f8f3",
              border: `1px solid ${BORDER}`,
              boxShadow: CARD_SHADOW,
              padding: "16px 18px",
              textDecoration: "none",
              marginBottom: 16,
            }}
          >
            <span>
              <span style={{ display: "block", fontSize: 12, fontWeight: 700, color: TEXT_SEC }}>장비 종류</span>
              <span style={{ display: "block", marginTop: 4, fontSize: 16, fontWeight: 900, color: TEXT }}>
                {equipment.name} 사용법·선택 기준
              </span>
            </span>
            <ChevronRight size={18} color={PRIMARY} />
          </Link>

          {relatedEquipment.length ? (
            <div>
              <div style={{ fontSize: 14, fontWeight: 800, color: TEXT, marginBottom: 10 }}>함께 보는 장비</div>
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
                      background: RELATED_PASTELS[i % RELATED_PASTELS.length],
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

          <p style={{ marginTop: 18, fontSize: 12, color: TEXT_SEC, lineHeight: 1.5 }}>
            브랜드·기종 정보는 현장 판단용 참고입니다. 정확한 스펙·부품·가격은 해당 유통·제조사 안내를 확인하세요.
          </p>
        </section>
      </article>
    </div>
  );
}
