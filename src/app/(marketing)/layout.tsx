// src/app/(marketing)/layout.tsx
'use client';

import { motion } from 'framer-motion';
import MainNav from '@/components/nav/main-nav';

export default function MarketingLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen flex flex-col bg-white">
      {/* Fixed-width centered navbar */}
      <MainNav />
      
      {/* Full-width animated main content */}
      <motion.main 
        className="flex-1 w-full relative z-10"
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
      >
        {/* Apply styles to ensure container elements are centered */}
        <style jsx global>{`
          .container {
            width: 100%;
            margin-left: auto;
            margin-right: auto;
          }
          
          @media (min-width: 640px) {
            .container {
              max-width: 640px;
            }
          }
          
          @media (min-width: 768px) {
            .container {
              max-width: 768px;
            }
          }
          
          @media (min-width: 1024px) {
            .container {
              max-width: 1024px;
            }
          }
          
          @media (min-width: 1280px) {
            .container {
              max-width: 1280px;
            }
          }
          
          @media (min-width: 1536px) {
            .container {
              max-width: 1536px;
            }
          }
        `}</style>

        {children}
      </motion.main>
    </div>
  );
}