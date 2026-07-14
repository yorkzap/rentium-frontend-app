"use client";

// The one scroll-reveal used on public pages: a short fade + rise on first
// entry into view. Matches the product motion spec (globals.css) — anything
// fancier than this is bloat.

import { motion, useReducedMotion } from "motion/react";
import type { ReactNode } from "react";

export default function Reveal({
  children,
  delay = 0,
  className,
}: {
  children: ReactNode;
  delay?: number;
  className?: string;
}) {
  const reduce = useReducedMotion();
  if (reduce) return <div className={className}>{children}</div>;

  return (
    <motion.div
      className={className}
      initial={{ opacity: 0, y: 8 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-40px" }}
      transition={{ duration: 0.25, delay, ease: [0.2, 0, 0, 1] }}
    >
      {children}
    </motion.div>
  );
}
