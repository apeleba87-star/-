"use client";

import { useEffect, useRef } from "react";
import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { motion } from "framer-motion";
import { TrendingUp, ExternalLink } from "lucide-react";
import type { HomeAdCampaign } from "@/lib/ads";
import { trackAdEvent } from "@/lib/ads-tracking";

const glass = "bg-white/60 backdrop-blur-xl border border-white/30 shadow-lg";

type Props = { campaign: HomeAdCampaign; slotKey?: string };

export default function AdNativeCard({ campaign, slotKey }: Props) {
  const pathname = usePathname();
  const impressionSent = useRef(false);
  const href = campaign.cta_url || "#";
  const title = campaign.title || "청소 현장 매칭 플랫폼";
  const description = campaign.description || "검증된 청소업체와 바로 연결 · 수수료 0원";

  useEffect(() => {
    if (!slotKey || impressionSent.current) return;
    impressionSent.current = true;
    trackAdEvent({
      event_type: "impression",
      campaign_id: campaign.id,
      slot_key: slotKey,
      page_path: pathname ?? undefined,
    });
  }, [slotKey, campaign.id, pathname]);

  const handleClick = () => {
    if (slotKey) {
      trackAdEvent({
        event_type: "click",
        campaign_id: campaign.id,
        slot_key: slotKey,
        page_path: pathname ?? undefined,
        meta: { target_type: "landing_page" },
      });
    }
  };

  return (
    <motion.section
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-40px" }}
      transition={{ duration: 0.4 }}
      className="mb-10"
      aria-label="광고"
    >
      <Link href={href} className="block touch-manipulation" target={href.startsWith("http") ? "_blank" : undefined} rel={href.startsWith("http") ? "noopener noreferrer" : undefined} onClick={handleClick}>
        <motion.div
          className={`${glass} flex min-h-[88px] items-center gap-4 rounded-2xl p-4 transition-colors hover:border-emerald-300/80 hover:shadow-xl`}
          whileHover={{
            scale: 1.02,
            boxShadow: "0 20px 40px -12px rgba(16, 185, 129, 0.25)",
          }}
          whileTap={{ scale: 0.99 }}
        >
          {campaign.image_url ? (
            <div className="relative h-12 w-12 shrink-0 overflow-hidden rounded-xl bg-slate-100">
              <Image src={campaign.image_url} alt="" fill className="object-cover" unoptimized />
            </div>
          ) : (
            <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-emerald-500 to-teal-600 text-white shadow">
              <TrendingUp className="h-6 w-6" />
            </span>
          )}
          <div className="min-w-0 flex-1">
            <div className="mb-0.5 flex items-center gap-2">
              <span className="rounded bg-slate-800/90 px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wide text-white">
                AD
              </span>
            </div>
            <h3 className="font-semibold text-slate-900">{title}</h3>
            <p className="mt-0.5 text-xs text-slate-600">{description}</p>
          </div>
          <motion.span
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-emerald-500/90 text-white"
            whileHover={{ x: 4 }}
            transition={{ type: "spring", stiffness: 400, damping: 25 }}
          >
            <ExternalLink className="h-5 w-5" />
          </motion.span>
        </motion.div>
      </Link>
    </motion.section>
  );
}
