"use client";

import { motion } from "framer-motion";

const blobVariants = {
  animate: {
    scale: [1, 1.15, 1.05, 1.2, 1],
    x: [0, 8, -5, 12, 0],
    y: [0, -10, 5, -3, 0],
    transition: { duration: 7, repeat: Infinity, ease: "easeInOut" as const },
  },
};

export default function ListingDetailBackground({ children }: { children: React.ReactNode }) {
  return (
    <div className="relative min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50">
      {/* Decorative blobs with blur and blend */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <motion.div
          variants={blobVariants}
          animate="animate"
          className="absolute -left-20 top-20 h-72 w-72 rounded-full bg-purple-300/40 opacity-60 blur-3xl mix-blend-multiply"
          aria-hidden
        />
        <motion.div
          variants={blobVariants}
          animate="animate"
          className="absolute right-0 top-40 h-80 w-80 rounded-full bg-blue-300/40 opacity-60 blur-3xl mix-blend-multiply"
          aria-hidden
        />
        <motion.div
          variants={blobVariants}
          animate="animate"
          className="absolute bottom-20 left-1/3 h-64 w-64 rounded-full bg-pink-300/40 opacity-50 blur-3xl mix-blend-multiply"
          aria-hidden
        />
      </div>
      <div className="relative">{children}</div>
    </div>
  );
}
