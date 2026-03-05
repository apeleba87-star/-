"use client";

import Link from "next/link";
import Image from "next/image";
import { motion } from "framer-motion";
import { ExternalLink, Sparkles } from "lucide-react";
import type { HomeAdCampaign } from "@/lib/ads";

type Props = { campaign: HomeAdCampaign };

export default function AdPremiumBanner({ campaign }: Props) {
  const href = campaign.cta_url || "#";
  const title = campaign.title || "청소업 전용 관리 솔루션";
  const description = campaign.description || "입찰부터 현장관리까지 한 번에! 지금 가입하면 첫 달 무료 ✨";
  const ctaText = campaign.cta_text || "자세히 보기";

  return (
    <motion.section
      initial={{ opacity: 0, y: 24 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay: 0.08 }}
      className="mb-10"
      aria-label="광고"
    >
      <Link href={href} className="block touch-manipulation" target={href.startsWith("http") ? "_blank" : undefined} rel={href.startsWith("http") ? "noopener noreferrer" : undefined}>
        <motion.div
          className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500 p-6 shadow-xl"
          whileHover={{
            boxShadow: "0 25px 50px -12px rgba(99, 102, 241, 0.4)",
            scale: 1.01,
          }}
          whileTap={{ scale: 0.99 }}
        >
          <div className="pointer-events-none absolute inset-0 overflow-hidden rounded-2xl" aria-hidden>
            <motion.div
              className="absolute top-0 bottom-0 w-[50%] bg-gradient-to-r from-transparent via-white/40 to-transparent"
              style={{ left: 0, filter: "blur(12px)" }}
              animate={{ x: ["0%", "200%"] }}
              transition={{ repeat: Infinity, duration: 2.5, ease: "easeInOut" }}
            />
          </div>
          <div className="relative flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex-1">
              <div className="mb-2 flex flex-wrap items-center gap-2">
                <span className="rounded bg-black/80 px-2 py-0.5 text-xs font-bold text-white">AD</span>
                <span className="text-xs font-medium text-white/90">Sponsored</span>
              </div>
              {campaign.image_url ? (
                <div className="relative mb-3 aspect-video w-full max-w-md overflow-hidden rounded-xl bg-white/10">
                  <Image src={campaign.image_url} alt="" fill className="object-contain" unoptimized />
                </div>
              ) : null}
              <h3 className="bg-gradient-to-r from-indigo-200 via-purple-200 to-pink-200 bg-clip-text text-xl font-bold tracking-tight text-transparent sm:text-2xl">
                {title}
              </h3>
              <p className="mt-1.5 text-sm text-white/95">{description}</p>
              <motion.span
                className="mt-4 inline-flex min-h-[44px] items-center gap-2 rounded-xl bg-white/20 px-4 py-2.5 text-sm font-semibold text-white backdrop-blur-sm hover:bg-white/30"
                whileHover={{ scale: 1.03 }}
                whileTap={{ scale: 0.98 }}
              >
                {ctaText}
                <ExternalLink className="h-4 w-4 shrink-0" />
              </motion.span>
            </div>
            {!campaign.image_url && (
              <div className="flex shrink-0 justify-end sm:pl-4">
                <motion.span
                  className="inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-white/25 text-white backdrop-blur-sm"
                  animate={{ scale: [1, 1.1, 1], opacity: [0.9, 1, 0.9] }}
                  transition={{ repeat: Infinity, duration: 2 }}
                >
                  <Sparkles className="h-7 w-7" />
                </motion.span>
              </div>
            )}
          </div>
        </motion.div>
      </Link>
    </motion.section>
  );
}
