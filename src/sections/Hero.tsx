"use client";
import ArrowIcon from "@/assets/arrow-right.svg";
import cogImage from "@/assets/cog.png";
import cylinderImage from "@/assets/cylinder.png";
import noodleImage from "@/assets/noodle.png";
import { motion, useScroll, useTransform } from "framer-motion";
import Image from "next/image";
import { useRef } from "react";

export const Hero = () => {
  const heroRef = useRef(null);
  const { scrollYProgress } = useScroll({
    target: heroRef,
    offset: ["start end", "end start"],
  });
  const translateY = useTransform(scrollYProgress, [0, 1], [150, -150]);

  return (
    <section
      ref={heroRef}
      className="pt-8 pb-20 md:pt-5 md:pb-10 overflow-x-clip"
      style={{
        background: "radial-gradient(ellipse 200% 100% at bottom left, #183EC2, #EAEEFE 100%)",
      }}
    >
      <div className="container mx-auto px-6">
        <div className="md:flex items-center">
          <div className="md:w-[478px]">
            <div className="text-sm inline-flex border border-[#222]/10 px-3 py-1 rounded-lg tracking-tight">
              Version 2.0 is here
            </div>
            <h1 className="mt-6 text-5xl md:text-7xl font-bold tracking-tighter bg-gradient-to-b from-black to-[#001E80] text-transparent bg-clip-text">
              Pathway to productivity
            </h1>
            <p className="mt-6 text-xl text-[#010D3E] tracking-tight">
              Celebrate the joy of accomplishment with an app designed to track your progress, motivate your
              efforts, and celebrate your success.
            </p>
            <div className="flex gap-1 items-center mt-8">
              <button className="btn btn-primary">Get for free</button>
              <button className="btn btn-text flex gap-1 items-center">
                <span>Learn more</span>
                <ArrowIcon className="h-5 w-5" />
              </button>
            </div>
          </div>
          <div className="mt-20 md:mt-0 md:flex-1 md:h-[648px] relative">
            <motion.img
              src={cogImage.src}
              alt="Cog"
              className="md:absolute md:h-full md:w-auto md:max-w-none md:-left-6 lg:left-0"
              animate={{ translateY: [-30, 30] }}
              transition={{ repeat: Infinity, repeatType: "mirror", duration: 3, ease: "easeInOut" }}
            />
            <motion.img
              src={cylinderImage.src}
              alt="Cylinder"
              width={220}
              height={220}
              className="hidden md:block absolute -top-8 -left-32"
              style={{ translateY }}
            />
            <motion.img
              src={noodleImage.src}
              alt="Noodle"
              width={220}
              className="hidden lg:block absolute top-[524px] left-[448px] rotate-[30deg]"
              style={{ translateY }}
            />
          </div>
        </div>
      </div>
    </section>
  );
};
