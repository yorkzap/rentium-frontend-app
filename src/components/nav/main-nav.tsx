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
    { href: '/rates', label: 'Rates' },
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
        <div className="h-16 border-b border-brand-dark-lighter bg-brand-dark shadow-sm">
          <div className="max-w-7xl mx-auto px-4 h-full flex items-center">
            <Link href="/" className="hover:opacity-90 transition-opacity">
              <Logo />
            </Link>

            <div className="hidden md:flex items-center space-x-8 ml-auto">
              {navItems.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  className={cn(
                    'text-base font-medium transition-colors hover:text-brand-primary',
                    pathname === item.href
                      ? 'text-brand-primary'
                      : 'text-gray-300'
                  )}
                >
                  {item.label}
                </Link>
              ))}

              <Button
                variant="ghost"
                className="text-gray-300 hover:text-brand-primary hover:bg-[#C6FEE6]/10 font-medium rounded-full"
                asChild
              >
                <Link href="/auth/login">Log in</Link>
              </Button>
              <Button
                className="bg-brand-primary hover:bg-brand-primary-hover text-black shadow-sm font-medium rounded-full"
                asChild
              >
                <Link href="/auth/signup">Register</Link>
              </Button>
            </div>

            <div className="flex md:hidden items-center space-x-3 ml-auto">
              <Button
                className="bg-brand-primary hover:bg-brand-primary-hover text-black shadow-sm font-medium rounded-full"
                asChild
              >
                <Link href="/auth/signup">Register</Link>
              </Button>

              <motion.button
                className="w-10 h-10 flex items-center justify-center rounded-md hover:bg-brand-dark-lighter text-white"
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
          className="fixed top-16 right-0 bottom-0 w-full sm:max-w-sm bg-brand-dark shadow-xl"
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
                        'block text-2xl transition-colors hover:text-brand-primary',
                        pathname === item.href
                          ? 'text-brand-primary font-medium'
                          : 'text-gray-300 font-light'
                      )}
                    >
                      {item.label}
                    </Link>
                  </motion.div>
                ))}
              </motion.div>

              <motion.div
                className="space-y-4 pt-6 border-t border-brand-dark-lighter"
                variants={itemVariants}
              >
                <Button
                  variant="ghost"
                  className="w-full justify-center text-base font-medium text-gray-300 hover:text-brand-primary hover:bg-[#C6FEE6]/10 rounded-full"
                  asChild
                  onClick={() => setIsOpen(false)}
                >
                  <Link href="/auth/login">Log in</Link>
                </Button>
                <Button
                  className="w-full justify-center text-base bg-brand-primary hover:bg-brand-primary-hover text-black font-medium rounded-full"
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
