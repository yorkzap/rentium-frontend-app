// src/sections/Header.tsx
import React from 'react';
import Image from 'next/image';

export default function Header() {
  return (
    <header className="p-4">
      <div className="flex items-center justify-between">
        <div className="inline-flex gap-1 items-center">
          <p>Get started for free</p>
          {/* Icon removed */}
        </div>
        {/* Menu icon removed */}
        <nav className="hidden md:flex gap-6 text-black/60 items-center">
          <a href="#about">About</a>
          <a href="#features">Features</a>
        </nav>
      </div>
    </header>
  );
}
