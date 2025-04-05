"use client";
import productImage from "@/assets/product-image.png";
import pyramidImage from "@/assets/pyramid.png";
import tubeImage from "@/assets/tube.png";
import Image from "next/image";
import { motion, useScroll, useTransform } from "framer-motion";
import { useRef } from "react";

export const ProductShowcase = () => {
  const sectionRef = useRef(null);
  const { scrollYProgress } = useScroll({
    target: sectionRef,
    offset: ["start end", "end start"],
  });
  const translateY = useTransform(scrollYProgress, [0, 1], [150, -150]);

  return (
    <section
      ref={sectionRef}
      className="py-24 bg-gradient-to-b from-white to-[#D2DCFF] overflow-x-clip"
    >
      <div className="container mx-auto px-6">
        <div className="max-w-[540px] mx-auto text-center">
          <div className="tag">Boost your productivity</div>
          <h2 className="mt-5 section-title">
            A more effective way to track progress
          </h2>
          <p className="mt-5 section-des">
            Effortlessly turn your ideas into a fully functional, responsive website with Rentium.
          </p>
        </div>

        <div className="relative mt-10">
          <Image src={productImage} alt="Product image" className="mx-auto" />
          <motion.img
            src={pyramidImage.src}
            alt="Pyramid"
            height={262}
            width={262}
            className="hidden md:block absolute -right-36 -top-32"
            style={{ translateY }}
          />
          <motion.img
            src={tubeImage.src}
            alt="Tube"
            height={248}
            width={248}
            className="hidden md:block absolute bottom-24 -left-36"
            style={{ translateY }}
          />
        </div>
      </div>
    </section>
  );
};
