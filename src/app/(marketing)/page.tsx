'use client';

import React from 'react';
import { animate } from 'motion';
import { Button } from '@/components/ui/button';

export default function Home() {
  const [mounted, setMounted] = React.useState(false);

  React.useEffect(() => {
    if (mounted) return;

    setMounted(true);

    const sequence = async () => {
      await animate(
        '.fade-in',
        {
          opacity: [0, 1],
          y: [20, 0],
        },
        {
          duration: 0.7,
          easing: [0.22, 0.03, 0.26, 1],
        }
      );
    };

    sequence();
  }, [mounted]);

  return (
    <div className="min-h-screen">
      {/* Hero Section */}
      <div className="relative overflow-hidden w-full bg-brand-dark">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-32 pb-24">
          <div className="flex flex-col items-center text-center max-w-4xl mx-auto">
            <div className="fade-in opacity-0">
              <h1 className="text-7xl font-medium text-white mb-6 leading-tight">
                Send More
                <br />
                For Less
              </h1>
            </div>

            <div
              className="fade-in opacity-0"
              style={{ animationDelay: '100ms' }}
            >
              <p className="text-xl text-gray-300 mb-8 max-w-2xl mx-auto">
                Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do
                eiusmod tempor incididunt ut labore et dolore magna aliqua.
              </p>
            </div>

            <div
              className="fade-in opacity-0"
              style={{ animationDelay: '200ms' }}
            >
              <Button
                size="lg"
                className="bg-brand-primary hover:bg-brand-primary-hover text-black font-medium text-lg px-8 py-6"
              >
                Check Rates
              </Button>
            </div>
          </div>
        </div>

        {/* Video Container */}
        {mounted && (
          <div className="absolute top-0 right-0 w-1/2 h-full pointer-events-none">
            <div className="relative w-full h-full">
              <video
                autoPlay
                loop
                muted
                playsInline
                className="absolute inset-0 w-full h-full object-cover"
              >
                <source src="/videos/paperplane.webm" type="video/webm" />
                Your browser does not support the video tag.
              </video>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
