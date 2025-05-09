// src/components/nav/main-nav.tsx
// src/hooks/components/nav/main-nav.tsx
// src/components/nav/main-nav.tsx
'use client';

import React, { useState, useRef, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import Logo from '../../app/logo';
import { motion } from 'framer-motion';

const MainNav = () => {
  const pathname = usePathname();
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef(null);

  // Handle resize
  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth >= 768) {
        setIsOpen(false);
      }
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const navItems = [
    { href: '/pricing', label: 'Pricing' },
    { href: '/about', label: 'About' },
    { href: '/help', label: 'Help' },
  ];

  const menuVariants = {
    open: {
      transform: 'translateX(0%)',
      transition: {
        type: 'spring',
        stiffness: 500,
        damping: 45,
        staggerChildren: 0.04,
        delayChildren: 0.1,
      },
    },
    closed: {
      transform: 'translateX(100%)',
      transition: {
        type: 'spring',
        stiffness: 500,
        damping: 45,
        staggerChildren: 0.03,
        staggerDirection: -1,
      },
    },
  };

  const itemVariants = {
    open: {
      y: 0,
      opacity: 1,
      transition: {
        type: 'spring',
        stiffness: 600,
        damping: 50,
        mass: 0.8,
      },
    },
    closed: {
      y: 20,
      opacity: 0,
      transition: {
        type: 'spring',
        stiffness: 600,
        damping: 50,
        mass: 0.8,
      },
    },
  };

  const Path = (props: motion.SVGMotionProps<SVGPathElement>) => (
    <motion.path
      fill="transparent"
      strokeWidth="2"
      stroke="currentColor"
      strokeLinecap="round"
      {...props}
    />
  );

  return (
    <>
      <div className="h-16" />

      <nav className="fixed w-full top-0 z-50">
        <div className="h-16 bg-white/90 backdrop-blur-sm">
          <div className="max-w-7xl mx-auto px-4 h-full flex items-center">
            <Link href="/" className="hover:opacity-90 transition-opacity flex items-center gap-2">
              <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-primary">
                <path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"></path>
                <polyline points="9 22 9 12 15 12 15 22"></polyline>
              </svg>
              <span className="font-bold text-lg">Rentium</span>
            </Link>

            <div className="hidden md:flex items-center space-x-8 ml-auto">
              {navItems.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  className={cn(
                    'text-sm font-medium transition-colors relative group',
                    pathname === item.href
                      ? 'text-foreground'
                      : 'text-muted-foreground hover:text-foreground'
                  )}
                >
                  {item.label}
                  <motion.span
                    className="absolute -bottom-1 left-0 h-0.5 bg-primary w-0 group-hover:w-full transition-all duration-300"
                    initial={{ width: 0 }}
                    whileHover={{ width: "100%" }}
                    animate={pathname === item.href ? { width: "100%" } : { width: 0 }}
                  />
                </Link>
              ))}

              <Button
                variant="ghost"
                className="text-muted-foreground hover:text-foreground font-medium rounded-full"
                asChild
              >
                <Link href="/auth/login">Log in</Link>
              </Button>
              <Button
                className="bg-brand-primary hover:bg-brand-primary-hover text-white shadow-sm font-medium rounded-full"
                asChild
              >
                <Link href="/auth/signup">Register</Link>
              </Button>
            </div>

            <div className="flex md:hidden items-center space-x-3 ml-auto">
              <Button
                className="bg-brand-primary hover:bg-brand-primary-hover text-white shadow-sm font-medium rounded-full"
                asChild
              >
                <Link href="/auth/signup">Register</Link>
              </Button>

              <motion.button
                className="w-10 h-10 flex items-center justify-center rounded-md hover:bg-slate-100 text-slate-800"
                onClick={() => setIsOpen(!isOpen)}
              >
                <svg width="23" height="23" viewBox="0 0 23 23">
                  <Path
                    variants={{
                      closed: { d: 'M 2 2.5 L 20 2.5' },
                      open: { d: 'M 3 16.5 L 17 2.5' },
                    }}
                    animate={isOpen ? 'open' : 'closed'}
                  />
                  <Path
                    d="M 2 9.423 L 20 9.423"
                    variants={{
                      closed: { opacity: 1 },
                      open: { opacity: 0 },
                    }}
                    animate={isOpen ? 'open' : 'closed'}
                    transition={{ duration: 0.1 }}
                  />
                  <Path
                    variants={{
                      closed: { d: 'M 2 16.346 L 20 16.346' },
                      open: { d: 'M 3 2.5 L 17 16.346' },
                    }}
                    animate={isOpen ? 'open' : 'closed'}
                  />
                </svg>
              </motion.button>
            </div>
          </div>
        </div>

        <motion.div
          ref={containerRef}
          initial="closed"
          animate={isOpen ? 'open' : 'closed'}
          variants={menuVariants}
          className="fixed top-16 right-0 bottom-0 w-full sm:max-w-sm bg-white shadow-xl"
        >
          <div className="h-full overflow-auto overscroll-contain">
            <div className="px-4 py-6 space-y-6">
              <motion.div className="space-y-6">
                {navItems.map((item) => (
                  <motion.div key={item.href} variants={itemVariants}>
                    <Link
                      href={item.href}
                      onClick={() => setIsOpen(false)}
                      className={cn(
                        'block text-2xl transition-colors hover:text-foreground relative group',
                        pathname === item.href
                          ? 'text-foreground font-medium'
                          : 'text-muted-foreground font-light'
                      )}
                    >
                      {item.label}
                      <motion.span
                        className="absolute -bottom-1 left-0 h-0.5 bg-primary w-0 group-hover:w-full transition-all duration-300"
                        initial={{ width: 0 }}
                        animate={pathname === item.href ? { width: "100%" } : { width: 0 }}
                      />
                    </Link>
                  </motion.div>
                ))}
              </motion.div>

              <motion.div
                className="space-y-4 pt-6 border-t border-slate-200"
                variants={itemVariants}
              >
                <Button
                  variant="ghost"
                  className="w-full justify-center text-base font-medium text-muted-foreground hover:text-foreground rounded-full"
                  asChild
                  onClick={() => setIsOpen(false)}
                >
                  <Link href="/auth/login">Log in</Link>
                </Button>
                <Button
                  className="w-full justify-center text-base bg-primary hover:bg-primary/90 text-primary-foreground font-medium rounded-full"
                  asChild
                  onClick={() => setIsOpen(false)}
                >
                  <Link href="/auth/signup">Register</Link>
                </Button>
              </motion.div>
            </div>
          </div>
        </motion.div>
      </nav>
    </>
  );
};

export default MainNav;