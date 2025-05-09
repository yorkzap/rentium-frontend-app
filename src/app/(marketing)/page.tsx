// src/app/(marketing)/page.tsx
"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import Image from "next/image" // Kept import in case placeholders are replaced
import { motion, useScroll, useSpring, useTransform, AnimatePresence } from "framer-motion"
import AnimatedBeamDemo from "./animated-beam-demo"

import {
  Check,
  // ChevronRight, // Removed unused import
  ArrowRight,
  Star,
  Zap,
  Shield,
  Users,
  BarChart,
  Calendar,
  HomeIcon,
  MessageSquare,
  ClipboardCheck,
  ChevronUp, // Added for scroll-to-top icon consistency
} from "lucide-react"
import { Button as UIButton } from "@/components/ui/button" // Renamed to avoid conflict with motion(Button)
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"

// Make Shadcn UI Button compatible with Framer Motion props
const Button = motion(UIButton)
const MotionCard = motion(Card) // Helper for motion props on Card if needed directly, though wrapping div is used below

export default function Home() {
  const [isScrolled, setIsScrolled] = useState(false)
  const [mounted, setMounted] = useState(false)

  const { scrollYProgress } = useScroll()
  const scaleX = useSpring(scrollYProgress, { // This remains unused in the final code, but kept as per original
    stiffness: 100,
    damping: 30,
    restDelta: 0.001,
  })

  // Create the transform for the grid animation
  const gridParallaxY = useTransform(scrollYProgress, [0, 1], [0, 100])

  useEffect(() => {
    setMounted(true) // Ensure client-side logic runs after hydration
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 50) // Trigger a bit later
    }

    window.addEventListener("scroll", handleScroll, { passive: true })
    return () => window.removeEventListener("scroll", handleScroll)
  }, [])

  // Animation Variants
  const container = {
    hidden: { opacity: 0 },
    show: {
      opacity: 1,
      transition: {
        staggerChildren: 0.05,
        delayChildren: 0.1,
        ease: "easeOut",
      },
    },
  }
  const item = {
    hidden: { opacity: 0, y: 30 },
    show: {
      opacity: 1,
      y: 0,
      transition: {
        duration: 0.3,
        ease: "easeOut",
      },
    },
  }

  // Feature Data
  const features = [
    {
      title: "Smart Automation",
      description: "Automate repetitive tasks like rent collection, maintenance scheduling, and tenant communications.",
      icon: <Zap className="size-5 text-brand-primary" />,
    },
    {
      title: "Property Analytics",
      description: "Gain valuable insights with real-time data visualization for profit and loss tracking.",
      icon: <BarChart className="size-5 text-brand-primary" />,
    },
    {
      title: "Lease Management",
      description: "Streamline the entire leasing process from applications to renewals and move-outs.",
      icon: <ClipboardCheck className="size-5 text-brand-primary" />,
    },
    {
      title: "Maintenance Tracking",
      description: "Track issues, schedule repairs, and determine accountability for damage deposits.",
      icon: <Shield className="size-5 text-brand-primary" />,
    },
    {
      title: "Smart Calendar",
      description: "Never miss important dates like garbage collection, inspections, repairs, and move-outs.",
      icon: <Calendar className="size-5 text-brand-primary" />,
    },
    {
      title: "Occupant Portal",
      description: "Provide occupants with access to property details, maintenance requests, and communication.",
      icon: <Users className="size-5 text-brand-primary" />,
    },
  ]

  // FAQ Data
  const faqs = [
    {
      question: "How easy is it to get started with Rentium?",
      answer:
        "Getting started is simple. Sign up for a free 30-day trial, add your properties, and start using our features immediately. No credit card is required to try Rentium, and our onboarding process guides you through setting up your account step by step.",
    },
    {
      question: "Can I manage multiple properties with Rentium?",
      answer:
        "Absolutely! Our plans are designed to accommodate different portfolio sizes. The Starter plan supports up to 3 properties, Professional up to 10 properties, and Enterprise offers unlimited property management.",
    },
    {
      question: "Is my data secure on Rentium?",
      answer:
        "Yes, we take security very seriously. All data is encrypted both in transit and at rest. We use industry-standard security practices and regularly undergo security audits. Rentium is fully compliant with relevant data protection regulations.",
    },
    {
      question: "What features do occupants have access to?",
      answer:
        "Occupants can access property details, submit and track maintenance requests, view important dates (like rent due dates), communicate directly with property owners, and access their lease documents - all through an easy-to-use portal.",
    },
    {
      question: "Can I customize Rentium to match my workflow?",
      answer:
        "Yes, Rentium is designed to be flexible. You can customize notification settings, document templates, automation rules, and more to match your specific workflow and requirements.",
    },
    {
      question: "Does Rentium offer integrations with other tools?",
      answer:
        "Yes, Rentium integrates with popular tools for accounting, document signing, payment processing, and more. Enterprise users can also request custom integrations to suit their specific needs.",
    },
  ]

  // Testimonial Data
  const testimonials = [
     {
      quote:
        "Rentium has transformed how I manage my rental properties. The automation tools save me hours every week and I never miss important deadlines.",
      author: "Sarah Johnson",
      role: "Owner of 5 Properties",
      rating: 5,
    },
    {
      quote:
        "The maintenance tracking feature alone is worth the subscription. I can track issues, schedule repairs, and keep tenants updated all in one place.",
      author: "Michael Chen",
      role: "Real Estate Investor",
      rating: 5,
    },
    {
      quote:
        "As someone who manages properties remotely, Rentium has been a game-changer. I can keep an eye on everything from anywhere in the world.",
      author: "Emily Rodriguez",
      role: "Multi-property Owner",
      rating: 5,
    },
    {
      quote:
        "The occupant portal has dramatically reduced the number of emails and calls I receive. My tenants love having everything they need in one place.",
      author: "David Kim",
      role: "Property Manager",
      rating: 5,
    },
    {
      quote:
        "The financial tracking tools have given me insights into my properties that I never had before. I can clearly see which properties are performing best.",
      author: "Lisa Patel",
      role: "Real Estate Investor",
      rating: 5,
    },
    {
      quote:
        "Setting up new properties is incredibly easy, and the AI suggestions help me optimize my listings. I've seen faster occupancy rates since using Rentium.",
      author: "James Wilson",
      role: "Small Portfolio Owner",
      rating: 5,
    },
  ]

  // Pricing Plans Data
  const pricingPlans = [
    {
      name: "Starter",
      price: "$19",
      period: "per month",
      description: "Perfect for single property owners.",
      features: ["Up to 3 properties", "Basic automation tools", "Email support", "Occupant portal", "Maintenance tracking"],
      cta: "Start Free Trial",
    },
    {
      name: "Professional",
      price: "$49",
      period: "per month",
      description: "Ideal for small portfolio owners.",
      features: [
        "Up to 10 properties",
        "Advanced automation",
        "Priority support",
        "Financial analytics",
        "Document management",
        "Smart calendar"
      ],
      cta: "Start Free Trial",
      popular: true,
    },
    {
      name: "Enterprise",
      price: "$99",
      period: "per month",
      description: "For professional property managers.",
      features: [
        "Unlimited properties",
        "Full automation suite",
        "24/7 phone & email support",
        "Advanced analytics",
        "Custom integrations",
        "Team collaboration tools",
        "White labeling options"
      ],
      cta: "Contact Sales",
    },
  ]

  // How It Works Steps Data
  const howItWorksSteps = [
    {
      step: "01",
      title: "Create Account",
      description: "Sign up in seconds and connect your properties. No credit card required to start.",
    },
    {
      step: "02",
      title: "Setup Properties",
      description: "Add your properties, occupants, and important details to customize your experience.",
    },
    {
      step: "03",
      title: "Automate Management",
      description: "Let Rentium handle routine tasks while you maintain full control of your properties.",
    },
  ]

  // Owner/Occupant Tab Data
  const ownerFeatures = [
    { title: "Automate Routine Tasks", desc: "Let AI handle rent collection, maintenance scheduling, and more" },
    { title: "Track Financial Performance", desc: "Get clear insights into profit and loss for each property" },
    { title: "Streamline Communications", desc: "All messages in one place with automated follow-ups" },
    { title: "Simplify Maintenance", desc: "Track issues, schedule repairs, and document everything" },
  ]

  const occupantFeatures = [
    { title: "Easy Maintenance Requests", desc: "Submit and track the status of maintenance issues" },
    { title: "Important Dates", desc: "Never miss rent due dates, inspections, or other deadlines" },
    { title: "Document Access", desc: "Access your lease and other important documents anytime" },
    { title: "Simplified Communication", desc: "Direct line to property management for any questions" },
  ]


  if (!mounted) {
    // Optional: Render a placeholder or null during server render / hydration phase
    // This helps prevent hydration mismatches if client-only logic affects initial render
    return null;
  }

  return (
    <div className="flex min-h-[100dvh] flex-col bg-white text-brand-dark">
      <main className="flex-1">
        {/* Hero Section */}
       {/* Hero Section with Visually Satisfying Lightning Grid Effect */}
<section className="w-full py-6 relative overflow-hidden">
  {/* Original Background Grid */}
  <motion.div
    className="absolute inset-0 h-full w-full bg-white bg-[linear-gradient(to_right,#f0f0f0_1px,transparent_1px),linear-gradient(to_bottom,#f0f0f0_1px,transparent_1px)] bg-[size:4rem_4rem] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_0%,#000_70%,transparent_110%)]"
    style={{
      y: gridParallaxY,
      top: '10.5rem',
      height: 'calc(100% - 2rem)',
    }}
  />
  
  {/* Enhanced Lightning Grid Overlay */}
  <motion.div
    className="absolute inset-0 h-full w-full pointer-events-none"
    style={{
      top: '10.5rem',
      height: 'calc(100% - 2rem)',
      zIndex: 0,
      y: gridParallaxY,
    }}
  >
    {/* Primary cluster lightning bolts - main visual element */}
    {[...Array(12)].map((_, clusterIndex) => {
      // Create more intentional distribution of clusters
      // Using modulo to create a more balanced grid coverage
      const col = clusterIndex % 4;
      const row = Math.floor(clusterIndex / 4);
      
      // Base position with some controlled randomness
      const clusterCenterX = 4 + col * 5 + Math.floor(Math.random() * 2);
      const clusterCenterY = 2 + row * 3 + Math.floor(Math.random() * 2);
      
      // Create an array of bolts for this cluster - varying sizes for visual hierarchy
      return [...Array(5)].map((_, i) => {
        // Position bolts around the cluster center
        const offsetX = Math.floor(Math.random() * 3) - 1;
        const offsetY = Math.floor(Math.random() * 3) - 1;
        
        const gridX = clusterCenterX + offsetX;
        const gridY = clusterCenterY + offsetY;
        const isHorizontal = Math.random() > 0.5;
        
        // Create different bolt types within each cluster for visual interest
        const isMajorBolt = i === 0; // First bolt in cluster is "major"
        
        // Visual properties based on bolt type
        const boltLength = isMajorBolt 
          ? 12 + Math.random() * 16 // 12-28% for major bolts
          : 6 + Math.random() * 12; // 6-18% for minor bolts
          
        const thickness = isMajorBolt 
          ? '2px' 
          : (Math.random() > 0.5 ? '1.5px' : '1px');
        
        // Enhanced glow with better color
        const glowColor = isMajorBolt 
          ? 'rgba(96, 165, 250, 0.85)' // Brighter blue for major bolts
          : 'rgba(79, 150, 229, 0.75)'; // Standard blue for minor bolts
        
        const glowIntensity = isMajorBolt 
          ? 0.7 + (Math.random() * 0.3) // 0.7-1.0 for major bolts
          : 0.5 + (Math.random() * 0.3); // 0.5-0.8 for minor bolts
        
        // Choreographed timing for a more pleasing rhythm
        // Create a "wave" effect across clusters
        const baseDelay = clusterIndex * 1.5; // Stagger clusters
        const animationDelay = baseDelay + (i * 0.3) + (Math.random() * 0.7);
        const animationDuration = isMajorBolt 
          ? 1.3 + (Math.random() * 0.4) // 1.3-1.7s for major bolts
          : 0.9 + (Math.random() * 0.3); // 0.9-1.2s for minor bolts
          
        // More frequent major bolts, less frequent minor bolts
        const repeatDelay = isMajorBolt 
          ? 5 + (Math.random() * 8) // 5-13s for major bolts
          : 8 + (Math.random() * 10); // 8-18s for minor bolts
        
        return (
          <motion.div
            key={`bolt-cluster-${clusterIndex}-${i}`}
            className={`absolute ${isMajorBolt ? 'bg-blue-400' : 'bg-blue-500'}`}
            style={{ 
              left: `${gridX * 4}rem`,
              top: `${gridY * 4}rem`,
              width: isHorizontal ? `${boltLength}%` : thickness,
              height: isHorizontal ? thickness : `${boltLength}%`,
              opacity: 0,
              boxShadow: `0 0 ${isMajorBolt ? '6px' : '4px'} ${glowColor}`,
              // More refined zigzag patterns
              clipPath: isHorizontal 
                ? `polygon(0 0, ${15 + Math.random() * 5}% 100%, ${40 + Math.random() * 10}% 0, ${65 + Math.random() * 10}% 100%, ${85 + Math.random() * 5}% 0, 100% 100%)` 
                : `polygon(0 0, 100% ${15 + Math.random() * 5}%, 0 ${40 + Math.random() * 10}%, 100% ${65 + Math.random() * 10}%, 0 ${85 + Math.random() * 5}%, 100% 100%)`,
              transformOrigin: isHorizontal ? 'left center' : 'center top',
              zIndex: isMajorBolt ? 2 : 1, // Stack major bolts on top
            }}
            animate={{
              opacity: [0, glowIntensity, 0],
              // Smoother animation sequence
              scaleX: isHorizontal ? [0, 1, 1] : [1, 1.02, 1],
              scaleY: isHorizontal ? [1, 1.02, 1] : [0, 1, 1],
            }}
            transition={{
              duration: animationDuration,
              delay: animationDelay,
              repeat: Infinity,
              repeatDelay: repeatDelay,
              // Custom easing for natural electricity feel
              ease: [0.25, 0.8, 0.25, 1],
            }}
          />
        );
      });
    }).flat()}
    
    {/* Secondary connecting power lines - creates a networked feel */}
    {[...Array(8)].map((_, i) => {
      // Strategic placement for connecting lines
      // Put these between cluster centers for a "network" effect
      const col = i % 4;
      const row = Math.floor(i / 4);
      
      const gridX = 6 + col * 4;
      const gridY = 3 + row * 4;
      
      const isHorizontal = Math.random() > 0.4; // Slightly bias toward horizontal lines
      const length = 16 + Math.random() * 20; // 16-36% - longer connecting lines
      
      return (
        <motion.div
          key={`power-line-${i}`}
          className="absolute bg-blue-400"
          style={{ 
            left: `${gridX * 4}rem`,
            top: `${gridY * 4}rem`,
            width: isHorizontal ? `${length}%` : '1.5px',
            height: isHorizontal ? '1.5px' : `${length}%`,
            opacity: 0,
            boxShadow: '0 0 5px rgba(96, 165, 250, 0.7)',
            // More complex pattern for long power lines
            clipPath: isHorizontal 
              ? 'polygon(0 0, 10% 100%, 25% 0, 40% 100%, 55% 0, 70% 100%, 85% 0, 100% 100%)' 
              : 'polygon(0 0, 100% 10%, 0 25%, 100% 40%, 0 55%, 100% 70%, 0 85%, 100% 100%)',
            transformOrigin: isHorizontal ? 'left center' : 'center top',
            zIndex: 1,
          }}
          animate={{
            opacity: [0, 0.65, 0],
            scaleX: isHorizontal ? [0, 1, 1] : 1,
            scaleY: isHorizontal ? 1 : [0, 1, 1],
          }}
          transition={{
            duration: 1.6 + (Math.random() * 0.6), // 1.6-2.2s
            delay: 10 + (i * 3) + (Math.random() * 2), // Well distributed over time
            repeat: Infinity,
            repeatDelay: 15 + (Math.random() * 12), // 15-27s
            ease: [0.22, 1, 0.36, 1],
          }}
        />
      );
    })}
    
    {/* Occasional "cross-connection" bolts - adds complexity and depth */}
    {[...Array(6)].map((_, i) => {
      // These are placed at diagonals to create cross-connections
      const gridX = 5 + (i * 3) % 16;
      const gridY = 4 + Math.floor(i / 2) * 3;
      
      // Use diagonal lines for these
      const length = 10 + Math.random() * 12; // 10-22%
      
      // Angle the bolt for a diagonal effect
      const angle = Math.random() > 0.5 ? 45 : -45;
      
      return (
        <motion.div
          key={`cross-${i}`}
          className="absolute bg-blue-300"
          style={{ 
            left: `${gridX * 4}rem`,
            top: `${gridY * 4}rem`,
            width: `${length}%`,
            height: '1.5px',
            opacity: 0,
            boxShadow: '0 0 6px rgba(147, 197, 253, 0.8)',
            clipPath: 'polygon(0 0, 30% 100%, 60% 0, 100% 100%)',
            transform: `rotate(${angle}deg)`,
            transformOrigin: 'left center',
            zIndex: 3, // Place on top for visual interest
          }}
          animate={{
            opacity: [0, 0.8, 0],
            scaleX: [0, 1, 1],
          }}
          transition={{
            duration: 0.8 + (Math.random() * 0.4), // 0.8-1.2s - faster for visual pop
            delay: 20 + (i * 5) + (Math.random() * 5), // Well spaced out
            repeat: Infinity,
            repeatDelay: 25 + (Math.random() * 15), // 25-40s - less frequent special effect
            ease: "easeOut",
          }}
        />
      );
    })}
  </motion.div>

  <div className="container px-4 md:px-6 relative pt-20 md:pt-32 lg:pt-36 pb-20 md:pb-32 lg:pb-36">
    {/* Hero Content - Same as before */}
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: "easeOut" }}
      className="text-center max-w-3xl mx-auto mb-12"
    >
      <Badge className="mb-4 rounded-full px-4 py-1.5 text-sm font-medium bg-[#f0f0f0] text-[#333]" variant="secondary">
        Launching Soon
      </Badge>
      <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold tracking-tight mb-6 text-brand-dark">
        Rental Management on Autopilot
      </h1>
      <p className="text-lg md:text-xl text-[#555] mb-8 max-w-2xl mx-auto">
        The all-in-one platform that helps property owners manage rentals with smart tools for profit and loss, leases, maintenance, and applications.
      </p>
      <div className="flex flex-col sm:flex-row gap-4 justify-center">
        <Button
          size="lg"
          className="rounded-full h-12 px-8 text-base bg-brand-primary hover:bg-brand-primary-hover text-white"
          whileHover={{ scale: 1.05, transition: { duration: 0.15 } }}
          whileTap={{ scale: 0.98, transition: { duration: 0.1 } }}
        >
          Start Free Trial
          <ArrowRight className="ml-2 size-4" />
        </Button>
        <Button
          size="lg"
          variant="outline"
          className="rounded-full h-12 px-8 text-base border-[#e0e0e0] text-[#333] hover:bg-[#f5f5f5]"
          whileHover={{ scale: 1.05, transition: { duration: 0.15 } }}
          whileTap={{ scale: 0.98, transition: { duration: 0.1 } }}
        >
          Book a Demo
        </Button>
      </div>
      <div className="flex items-center justify-center gap-4 mt-6 text-sm text-[#555] flex-wrap">
        <div className="flex items-center gap-1">
          <Check className="size-4 text-brand-primary" />
          <span>No credit card</span>
        </div>
        <div className="flex items-center gap-1">
          <Check className="size-4 text-brand-primary" />
          <span>30-day trial</span>
        </div>
        <div className="flex items-center gap-1">
          <Check className="size-4 text-brand-primary" />
          <span>Cancel anytime</span>
        </div>
      </div>
    </motion.div>

    {/* Hero Image/Dashboard Preview - Same as before */}
    <motion.div
      initial={{ opacity: 0, y: 40 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay: 0.2, ease: "easeOut" }}
      className="relative mx-auto max-w-5xl"
    >
      <div className="rounded-xl overflow-hidden shadow-xl border border-[#e0e0e0] bg-gradient-to-b from-white to-[#f7f7f7] relative">
    {/* Use Image component with correct dimensions */}
    <img
      src="/assets/dashboard.webp"
      width={1504}
      height={1128}
      alt="Dashboard Preview"
      className="w-full h-auto"
    />
    <div className="absolute inset-0 rounded-xl ring-1 ring-inset ring-black/10"></div>
  </div>
  
  {/* Background gradient blobs */}
  <div className="absolute -bottom-6 -right-6 -z-1 h-[300px] w-[300px] rounded-full bg-gradient-to-br from-brand-primary/30 to-brand-dark/30 blur-3xl opacity-70"></div>
  <div className="absolute -top-6 -left-6 -z-1 h-[300px] w-[300px] rounded-full bg-gradient-to-br from-brand-dark/30 to-brand-primary/30 blur-3xl opacity-70"></div>

</motion.div>
  </div>
</section>

        {/* Logos Section */}
{/* Logos Section */}
<section className="w-full py-16 border-y border-[#f0f0f0] bg-gradient-to-b from-white to-[#fafafa]">
  <div className="container px-4 md:px-6 mx-auto">
    <div className="flex flex-col items-center justify-center space-y-8 text-center">
      <div className="mb-6">
        <div className="rounded-full px-4 py-1.5 text-sm font-medium bg-[#f0f0f0] text-[#333]">
          Designed with Official Guidelines in Mind
        </div>
      </div>
      <div className="flex flex-wrap items-center justify-center gap-16 md:gap-24 lg:gap-32">
        {/* Display TRAC and RTB logos */}
        <div className="group relative">
          <img 
            src="/assets/TRAC.svg" 
            alt="TRAC Logo" 
            className="h-8 md:h-10 w-auto opacity-70 grayscale transition-all duration-300 group-hover:opacity-100 group-hover:grayscale-0 group-hover:scale-105"
            title="TRAC Logo"
          />
        </div>
        <div className="group relative">
          <img 
            src="/assets/RTB.svg" 
            alt="Tenant Resource & Advisory Centre Logo" 
            className="h-8 md:h-10 w-auto opacity-70 grayscale transition-all duration-300 group-hover:opacity-100 group-hover:grayscale-0 group-hover:scale-105"
            title="Tenant Resource & Advisory Centre"
          />
        </div>
      </div>
    </div>
  </div>
</section>

        {/* Features Section */}
<section id="features" className="w-full py-20 md:py-32 bg-white">
  <div className="container px-4 md:px-6 mx-auto">
    <div className="flex flex-col items-center justify-center space-y-4 text-center mb-16">
      <div className="mb-2">
        <div className="rounded-full px-4 py-1.5 text-sm font-medium bg-[#f0f0f0] text-[#333]">
          Features
        </div>
      </div>
      <h2 className="text-3xl md:text-4xl font-bold tracking-tight text-brand-dark max-w-3xl">Everything You Need for Rental Management</h2>
      <p className="max-w-[800px] text-[#555] md:text-lg">
        Our comprehensive platform provides all the tools you need to manage your rental properties with ease, efficiency, and complete control.
      </p>
    </div>
    
    <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-3">
      {/* Feature 1 */}
      <div className="group relative">
        <div className="p-6 flex flex-col h-full relative overflow-hidden transition-all duration-300 bg-white rounded-lg border-l-[3px] border-[hsl(170,47%,39%)]">
          <div className="absolute -right-12 -bottom-12 w-32 h-32 rounded-full bg-gradient-to-br from-[hsla(171,99%,52%,0.1)] to-transparent blur-xl group-hover:w-48 group-hover:h-48 group-hover:from-[hsla(171,99%,52%,0.15)] transition-all duration-500"></div>
          
          <div className="flex items-start mb-4 relative">
            <div className="size-10 flex items-center justify-center mr-3 text-[hsl(170,47%,39%)] mt-1 shrink-0">
              <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path>
                <polyline points="22 4 12 14.01 9 11.01"></polyline>
              </svg>
            </div>
            <h3 className="text-xl font-semibold text-brand-dark">Smart Automation</h3>
          </div>
          
          <p className="text-[#555] pl-[52px]">Automate repetitive tasks like rent collection, maintenance scheduling, and tenant communications.</p>
        </div>
      </div>

      {/* Feature 2 */}
      <div className="group relative">
        <div className="p-6 flex flex-col h-full relative overflow-hidden transition-all duration-300 bg-white rounded-lg border-l-[3px] border-[hsl(170,47%,39%)]">
          <div className="absolute -right-12 -bottom-12 w-32 h-32 rounded-full bg-gradient-to-br from-[hsla(171,99%,52%,0.1)] to-transparent blur-xl group-hover:w-48 group-hover:h-48 group-hover:from-[hsla(171,99%,52%,0.15)] transition-all duration-500"></div>
          
          <div className="flex items-start mb-4 relative">
            <div className="size-10 flex items-center justify-center mr-3 text-[hsl(170,47%,39%)] mt-1 shrink-0">
              <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
                <polyline points="17 8 12 3 7 8"></polyline>
                <line x1="12" y1="3" x2="12" y2="15"></line>
              </svg>
            </div>
            <h3 className="text-xl font-semibold text-brand-dark">Property Analytics</h3>
          </div>
          
          <p className="text-[#555] pl-[52px]">Gain valuable insights with real-time data visualization for profit and loss tracking.</p>
        </div>
      </div>

      {/* Feature 3 */}
      <div className="group relative">
        <div className="p-6 flex flex-col h-full relative overflow-hidden transition-all duration-300 bg-white rounded-lg border-l-[3px] border-[hsl(170,47%,39%)]">
          <div className="absolute -right-12 -bottom-12 w-32 h-32 rounded-full bg-gradient-to-br from-[hsla(171,99%,52%,0.1)] to-transparent blur-xl group-hover:w-48 group-hover:h-48 group-hover:from-[hsla(171,99%,52%,0.15)] transition-all duration-500"></div>
          
          <div className="flex items-start mb-4 relative">
            <div className="size-10 flex items-center justify-center mr-3 text-[hsl(170,47%,39%)] mt-1 shrink-0">
              <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect>
                <line x1="16" y1="2" x2="16" y2="6"></line>
                <line x1="8" y1="2" x2="8" y2="6"></line>
                <line x1="3" y1="10" x2="21" y2="10"></line>
              </svg>
            </div>
            <h3 className="text-xl font-semibold text-brand-dark">Lease Management</h3>
          </div>
          
          <p className="text-[#555] pl-[52px]">Streamline the entire leasing process from applications to renewals and move-outs.</p>
        </div>
      </div>

      {/* Feature 4 */}
      <div className="group relative">
        <div className="p-6 flex flex-col h-full relative overflow-hidden transition-all duration-300 bg-white rounded-lg border-l-[3px] border-[hsl(170,47%,39%)]">
          <div className="absolute -right-12 -bottom-12 w-32 h-32 rounded-full bg-gradient-to-br from-[hsla(171,99%,52%,0.1)] to-transparent blur-xl group-hover:w-48 group-hover:h-48 group-hover:from-[hsla(171,99%,52%,0.15)] transition-all duration-500"></div>
          
          <div className="flex items-start mb-4 relative">
            <div className="size-10 flex items-center justify-center mr-3 text-[hsl(170,47%,39%)] mt-1 shrink-0">
              <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z"></path>
              </svg>
            </div>
            <h3 className="text-xl font-semibold text-brand-dark">Maintenance Tracking</h3>
          </div>
          
          <p className="text-[#555] pl-[52px]">Track issues, schedule repairs, and determine accountability for damage deposits.</p>
        </div>
      </div>

      {/* Feature 5 */}
      <div className="group relative">
        <div className="p-6 flex flex-col h-full relative overflow-hidden transition-all duration-300 bg-white rounded-lg border-l-[3px] border-[hsl(170,47%,39%)]">
          <div className="absolute -right-12 -bottom-12 w-32 h-32 rounded-full bg-gradient-to-br from-[hsla(171,99%,52%,0.1)] to-transparent blur-xl group-hover:w-48 group-hover:h-48 group-hover:from-[hsla(171,99%,52%,0.15)] transition-all duration-500"></div>
          
          <div className="flex items-start mb-4 relative">
            <div className="size-10 flex items-center justify-center mr-3 text-[hsl(170,47%,39%)] mt-1 shrink-0">
              <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M20 7h-3a2 2 0 0 0-2 2v9a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V9a2 2 0 0 0-2-2h3"></path>
                <path d="M14 15h-5"></path>
                <path d="M9 10h5V5a2 2 0 1 0-4 0"></path>
              </svg>
            </div>
            <h3 className="text-xl font-semibold text-brand-dark">Inventory/Asset Management</h3>
          </div>
          
          <p className="text-[#555] pl-[52px]">Keep detailed records of all property assets, track item conditions, and manage inventory efficiently.</p>
        </div>
      </div>

      {/* Feature 6 */}
      <div className="group relative">
        <div className="p-6 flex flex-col h-full relative overflow-hidden transition-all duration-300 bg-white rounded-lg border-l-[3px] border-[hsl(170,47%,39%)]">
          <div className="absolute -right-12 -bottom-12 w-32 h-32 rounded-full bg-gradient-to-br from-[hsla(171,99%,52%,0.1)] to-transparent blur-xl group-hover:w-48 group-hover:h-48 group-hover:from-[hsla(171,99%,52%,0.15)] transition-all duration-500"></div>
          
          <div className="flex items-start mb-4 relative">
            <div className="size-10 flex items-center justify-center mr-3 text-[hsl(170,47%,39%)] mt-1 shrink-0">
              <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path>
                <circle cx="9" cy="7" r="4"></circle>
                <path d="M23 21v-2a4 4 0 0 0-3-3.87"></path>
                <path d="M16 3.13a4 4 0 0 1 0 7.75"></path>
              </svg>
            </div>
            <h3 className="text-xl font-semibold text-brand-dark">Occupant Portal</h3>
          </div>
          
          <p className="text-[#555] pl-[52px]">Provide occupants with access to property details, maintenance requests, and communication.</p>
        </div>
      </div>
    </div>
  </div>
</section>

{/* The Fragmented Experience Section */}
<section className="w-full py-20 md:py-32 bg-[#f9f9f9] border-t border-[#f0f0f0]">
  <div className="container px-4 md:px-6 mx-auto">
    <div className="flex flex-col items-center justify-center space-y-4 text-center mb-2">
      <div className="mb-2">
        <div className="rounded-full px-4 py-1.5 text-sm font-medium bg-[#f0f0f0] text-[#333]">
          The Problem
        </div>
      </div>
      <h2 className="text-3xl md:text-4xl font-bold tracking-tight text-brand-dark max-w-3xl">
        Too Many Tools, Too Little Time
      </h2>
      <p className="max-w-[800px] text-[#555] md:text-lg">
        Property owners waste countless hours switching between disconnected apps and finicky services integrations.
      </p>
    </div>
    
    {/* AnimatedBeamDemo integration */}
    <AnimatedBeamDemo />
    
    <div className="mt-16 text-center max-w-2xl mx-auto">
      <h3 className="text-2xl font-semibold mb-4 text-brand-dark">
        One Platform, Complete Control
      </h3>
      <p className="text-[#555] text-lg mb-6">
        Rentium brings everything together in one system — from communications to document management, maintenance requests to payments.
      </p>
    </div>
  </div>
</section>

        {/* How It Works Section */}
        <section className="w-full py-20 md:py-32 bg-[#f9f9f9] relative overflow-hidden">
          {/* Background Grid */}
          <div className="absolute inset-0 -z-1 h-full w-full bg-white bg-[linear-gradient(to_right,#f0f0f0_1px,transparent_1px),linear-gradient(to_bottom,#f0f0f0_1px,transparent_1px)] bg-[size:4rem_4rem]">
          <div className="absolute left-0 right-0 top-0 h-32 bg-gradient-to-b from-[#f9f9f9] to-transparent"></div>
            <div className="absolute left-0 right-0 bottom-0 h-32 bg-gradient-to-t from-[#f9f9f9] to-transparent"></div>
            <div className="absolute top-0 bottom-0 left-0 w-32 bg-gradient-to-r from-[#f9f9f9] to-transparent"></div>
            <div className="absolute top-0 bottom-0 right-0 w-32 bg-gradient-to-l from-[#f9f9f9] to-transparent"></div>
          </div>

          <div className="container px-4 md:px-6 relative">
            <motion.div
              initial="hidden" whileInView="show" viewport={{ once: true, margin: "-100px" }} variants={item}
              className="flex flex-col items-center justify-center space-y-4 text-center mb-16"
            >
              <Badge className="rounded-full px-4 py-1.5 text-sm font-medium bg-[#f0f0f0] text-[#333]" variant="secondary">
                How It Works
              </Badge>
              <h2 className="text-3xl md:text-4xl font-bold tracking-tight text-brand-dark">Simple Process, Better Management</h2>
              <p className="max-w-[800px] text-[#555] md:text-lg">
                Get started in minutes and experience how Rentium puts your rental management on autopilot.
              </p>
            </motion.div>

            <div className="grid md:grid-cols-3 gap-8 md:gap-12 relative">
              {/* Connecting Line (visible on md+) */}
              <div className="hidden md:block absolute top-8 left-0 right-0 h-0.5 bg-[#e0e0e0] z-0" style={{ width: 'calc(100% - 10rem)', margin: '0 auto' }}></div>

              {howItWorksSteps.map((step, i) => (
                <motion.div
                  key={i}
                  initial="hidden" whileInView="show" viewport={{ once: true, amount: 0.5 }} variants={item}
                  transition={{ delay: i * 0.1 }}
                  className="relative z-10 flex flex-col items-center text-center space-y-4"
                >
                  <div className="flex h-16 w-16 items-center justify-center rounded-full bg-brand-primary text-white text-xl font-bold shadow-md border-4 border-white">
                    {step.step}
                  </div>
                  <h3 className="text-xl font-semibold text-brand-dark">{step.title}</h3>
                  <p className="text-[#555]">{step.description}</p>
                </motion.div>
              ))}
            </div>
          </div>
        </section>

        {/* For Property Owners and Occupants (Tabs Section) */}
        <section className="w-full py-20 md:py-32">
          <div className="container px-4 md:px-6">
            <motion.div
              initial="hidden" whileInView="show" viewport={{ once: true, margin: "-100px" }} variants={item}
              className="flex flex-col items-center justify-center space-y-4 text-center mb-16"
            >
              <Badge className="rounded-full px-4 py-1.5 text-sm font-medium bg-[#f0f0f0] text-[#333]" variant="secondary">
                For Everyone
              </Badge>
              <h2 className="text-3xl md:text-4xl font-bold tracking-tight text-brand-dark">Solutions for All Parties</h2>
              <p className="max-w-[800px] text-[#555] md:text-lg">
                Rentium provides tailored experiences for both property owners and occupants.
              </p>
            </motion.div>

            <Tabs defaultValue="owners" className="max-w-4xl mx-auto">
              <TabsList className="grid w-full grid-cols-2 mb-8 h-auto p-1 bg-[#f0f0f0] rounded-full">
                <TabsTrigger value="owners" className="text-base md:text-lg py-2.5 rounded-full data-[state=active]:bg-white data-[state=active]:shadow-sm">For Property Owners</TabsTrigger>
                <TabsTrigger value="occupants" className="text-base md:text-lg py-2.5 rounded-full data-[state=active]:bg-white data-[state=active]:shadow-sm">For Occupants</TabsTrigger>
              </TabsList>

              {/* Owners Tab Content */}
              <TabsContent value="owners" className="mt-0">
                <Card className="border-[#f0f0f0] shadow-sm bg-white">
                  <CardContent className="p-6 md:p-8">
                    <div className="text-center mb-6">
                      <div className="inline-flex items-center justify-center size-12 rounded-full bg-brand-primary/10 mb-4">
                         <HomeIcon className="size-6 text-brand-primary" />
                      </div>
                      <h3 className="text-2xl font-semibold mb-2 text-brand-dark">Simplify Property Management</h3>
                      <p className="text-[#555] max-w-2xl mx-auto">
                        As a property owner, you're juggling a lot. Rentium simplifies all of that by offering a central hub to manage every aspect of your rental properties efficiently.
                      </p>
                    </div>
                    <div className="grid md:grid-cols-2 gap-6 text-left mb-8">
                      {ownerFeatures.map((feature, i) => (
                        <div key={i} className="flex items-start">
                          <Check className="mt-1 mr-2 size-5 shrink-0 text-brand-primary" />
                          <div>
                            <h4 className="font-medium text-brand-dark">{feature.title}</h4>
                            <p className="text-sm text-[#555]">{feature.desc}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                    <div className="text-center">
                      <Button
                        className="rounded-full px-6 py-3 bg-brand-primary hover:bg-brand-primary-hover text-white"
                        whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.98 }}
                      >
                        Start Free Trial
                        <ArrowRight className="ml-2 size-4" />
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>

              {/* Occupants Tab Content */}
              <TabsContent value="occupants" className="mt-0">
                <Card className="border-[#f0f0f0] shadow-sm bg-white">
                  <CardContent className="p-6 md:p-8">
                    <div className="text-center mb-6">
                      <div className="inline-flex items-center justify-center size-12 rounded-full bg-brand-primary/10 mb-4">
                         <MessageSquare className="size-6 text-brand-primary" />
                      </div>
                      <h3 className="text-2xl font-semibold mb-2 text-brand-dark">A Straightforward Experience</h3>
                      <p className="text-[#555] max-w-2xl mx-auto">
                        As an occupant, Rentium provides a simple portal where all property details, communication, and requests are readily available and easy to manage.
                      </p>
                    </div>
                    <div className="grid md:grid-cols-2 gap-6 text-left mb-8">
                      {occupantFeatures.map((feature, i) => (
                        <div key={i} className="flex items-start">
                          <Check className="mt-1 mr-2 size-5 shrink-0 text-brand-primary" />
                          <div>
                            <h4 className="font-medium text-brand-dark">{feature.title}</h4>
                            <p className="text-sm text-[#555]">{feature.desc}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                    <div className="text-center">
                       <Button
                        variant="outline"
                        className="rounded-full px-6 py-3 border-[#e0e0e0] text-[#333] hover:bg-[#f5f5f5]"
                        whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.98 }}
                       >
                         Learn More
                         <ArrowRight className="ml-2 size-4" />
                       </Button>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>
            </Tabs>
          </div>
        </section>

        {/* Testimonials Section */}
        <section id="testimonials" className="w-full py-20 md:py-32 bg-[#f9f9f9]">
          <div className="container px-4 md:px-6">
            <motion.div
              initial="hidden" whileInView="show" viewport={{ once: true, margin: "-100px" }} variants={item}
              className="flex flex-col items-center justify-center space-y-4 text-center mb-12"
            >
              <Badge className="rounded-full px-4 py-1.5 text-sm font-medium bg-[#f0f0f0] text-[#333]" variant="secondary">
                Testimonials
              </Badge>
              <h2 className="text-3xl md:text-4xl font-bold tracking-tight text-brand-dark">Trusted by Property Owners</h2>
              <p className="max-w-[800px] text-[#555] md:text-lg">
                Don't just take our word for it. See what our users have to say about their experience.
              </p>
            </motion.div>

            <motion.div
              variants={container}
              initial="hidden"
              whileInView="show"
              viewport={{ once: true, amount: 0.1 }}
              className="grid gap-6 md:grid-cols-2 lg:grid-cols-3"
            >
              {testimonials.map((testimonial, i) => (
                <motion.div
                  key={i}
                  variants={item}
                  className="h-full" // Ensure motion div takes full height for card inside
                >
                  <MotionCard
                    className="h-full overflow-hidden border border-[#f0f0f0] bg-white shadow-sm transition-all duration-200"
                    whileHover={{
                      y: -8,
                      boxShadow: "0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)",
                    }}
                    transition={{ duration: 0.15, ease: "easeOut" }}
                  >
                    <CardContent className="p-6 flex flex-col h-full">
                      <div className="flex mb-4">
                        {Array(testimonial.rating)
                          .fill(0)
                          .map((_, j) => (
                            <Star key={j} className="size-4 text-yellow-400 fill-yellow-400" />
                          ))}
                      </div>
                      <p className="text-base md:text-lg text-[#333] mb-6 flex-grow italic">"{testimonial.quote}"</p>
                      <div className="flex items-center gap-3 mt-auto pt-4 border-t border-[#f0f0f0]">
                        <div className="size-10 rounded-full bg-[#e0e0e0] flex items-center justify-center text-[#555] font-medium uppercase">
                          {testimonial.author.split(' ').map(n => n[0]).join('')}
                        </div>
                        <div>
                          <p className="font-semibold text-brand-dark">{testimonial.author}</p>
                          <p className="text-sm text-[#555]">{testimonial.role}</p>
                        </div>
                      </div>
                    </CardContent>
                  </MotionCard>
                </motion.div>
              ))}
            </motion.div>
          </div>
        </section>

        {/* Pricing Section */}
        <section id="pricing" className="w-full py-20 md:py-32 relative overflow-hidden">
          <div className="absolute inset-0 -z-1 h-full w-full bg-white bg-[radial-gradient(#e0e0e0_1px,transparent_1px)] [background-size:3rem_3rem] opacity-30"></div>

          <div className="container px-4 md:px-6 relative">
            <motion.div
             initial="hidden" whileInView="show" viewport={{ once: true, margin: "-100px" }} variants={item}
              className="flex flex-col items-center justify-center space-y-4 text-center mb-12"
            >
              <Badge className="rounded-full px-4 py-1.5 text-sm font-medium bg-[#f0f0f0] text-[#333]" variant="secondary">
                Pricing
              </Badge>
              <h2 className="text-3xl md:text-4xl font-bold tracking-tight text-brand-dark">Simple, Transparent Pricing</h2>
              <p className="max-w-[800px] text-[#555] md:text-lg">
                No hidden fees or surprises. Choose the plan that works best for your property portfolio. All plans include a 30-day free trial.
              </p>
            </motion.div>

            <div className="mx-auto max-w-5xl">
              <motion.div
                variants={container}
                initial="hidden" whileInView="show" viewport={{ once: true, amount: 0.2 }}
                className="grid gap-6 lg:grid-cols-3 lg:gap-8"
              >
                {pricingPlans.map((plan, i) => (
                  <motion.div
                    key={i}
                    variants={item}
                    className="h-full" // Ensure motion div takes full height for card inside
                  >
                    <MotionCard
                      className={`relative flex flex-col h-full overflow-hidden ${plan.popular ? "border-2 border-brand-primary shadow-lg" : "border border-[#f0f0f0] shadow-sm"} bg-white rounded-lg`}
                      whileHover={{ y: -8 }}
                      transition={{ duration: 0.15, ease: "easeOut" }}
                    >
                      {plan.popular && (
                        <div className="absolute top-0 right-4 -mt-3 bg-brand-primary text-white px-3 py-1 text-xs font-bold rounded-full shadow">
                          Most Popular
                        </div>
                      )}
                      <CardContent className="p-6 flex flex-col flex-grow">
                        <h3 className="text-2xl font-semibold text-brand-dark">{plan.name}</h3>
                        <p className="text-[#555] mt-1 h-10">{plan.description}</p>
                        <div className="flex items-baseline my-6">
                          <span className="text-4xl font-bold text-brand-dark">{plan.price}</span>
                          <span className="text-[#555] ml-1.5">{plan.period}</span>
                        </div>
                        <ul className="space-y-3 mb-8 flex-grow">
                          {plan.features.map((feature, j) => (
                            <li key={j} className="flex items-center text-[#333]">
                              <Check className="mr-2 size-4 shrink-0 text-brand-primary" />
                              <span>{feature}</span>
                            </li>
                          ))}
                        </ul>
                        <Button
                          className={`w-full mt-auto rounded-full h-11 text-base ${plan.popular ? "bg-brand-primary hover:bg-brand-primary-hover text-white" : "bg-[#f5f5f5] hover:bg-[#eaeaea] text-[#333]"}`}
                          variant={plan.popular ? "default" : "outline"}
                          whileHover={{ scale: 1.03 }}
                          whileTap={{ scale: 0.97 }}
                        >
                          {plan.cta}
                        </Button>
                      </CardContent>
                    </MotionCard>
                  </motion.div>
                ))}
              </motion.div>
            </div>
          </div>
        </section>


        {/* FAQ Section */}
        <section id="faq" className="w-full py-20 md:py-32 bg-[#f9f9f9]">
          <div className="container px-4 md:px-6">
            <motion.div
             initial="hidden" whileInView="show" viewport={{ once: true, margin: "-100px" }} variants={item}
              className="flex flex-col items-center justify-center space-y-4 text-center mb-12"
            >
              <Badge className="rounded-full px-4 py-1.5 text-sm font-medium bg-[#f0f0f0] text-[#333]" variant="secondary">
                FAQ
              </Badge>
              <h2 className="text-3xl md:text-4xl font-bold tracking-tight text-brand-dark">Frequently Asked Questions</h2>
              <p className="max-w-[800px] text-[#555] md:text-lg">
                Find answers to common questions about our rental property management platform.
              </p>
            </motion.div>

            <motion.div
              variants={container}
              initial="hidden" whileInView="show" viewport={{ once: true, amount: 0.1 }}
              className="mx-auto max-w-3xl"
            >
              <Accordion type="single" collapsible className="w-full space-y-2">
                {faqs.map((faq, i) => (
                  <motion.div key={i} variants={item}>
                    <AccordionItem value={`item-${i}`} className="border border-[#e0e0e0] rounded-lg bg-white shadow-sm px-4 data-[state=open]:shadow-md">
                      <AccordionTrigger className="text-left font-medium hover:no-underline text-base md:text-lg py-4 text-brand-dark">
                        {faq.question}
                      </AccordionTrigger>
                      <AccordionContent className="text-[#555] pb-4 text-base">
                        {faq.answer}
                      </AccordionContent>
                    </AccordionItem>
                  </motion.div>
                ))}
              </Accordion>
            </motion.div>
          </div>
        </section>

        {/* CTA Section */}
        <section className="w-full py-20 md:py-32 bg-gradient-to-br from-brand-primary to-brand-dark text-white relative overflow-hidden">
          {/* Subtle background pattern */}
          <div className="absolute inset-0 -z-1 bg-[linear-gradient(to_right,#ffffff1a_1px,transparent_1px),linear-gradient(to_bottom,#ffffff1a_1px,transparent_1px)] bg-[size:3rem_3rem] opacity-50"></div>
          {/* Decorative Blobs */}
          <div className="absolute -top-24 -left-24 w-64 h-64 bg-white/5 rounded-full blur-3xl opacity-50"></div>
          <div className="absolute -bottom-24 -right-24 w-64 h-64 bg-white/5 rounded-full blur-3xl opacity-50"></div>

          <div className="container px-4 md:px-6 relative">
            <motion.div
              initial="hidden" whileInView="show" viewport={{ once: true }} variants={item}
              className="flex flex-col items-center justify-center space-y-6 text-center"
            >
              <h2 className="text-3xl md:text-4xl lg:text-5xl font-bold tracking-tight">
                Ready to Put Your Rental Management on Autopilot?
              </h2>
              <p className="mx-auto max-w-[700px] text-white/80 md:text-xl">
                Join property owners who save time and reduce stress with our AI-driven rental management platform. Get started with a 30-day free trial today.
              </p>
              <div className="flex flex-col sm:flex-row gap-4 mt-4">
                <Button
                  size="lg"
                  variant="secondary"
                  className="rounded-full h-12 px-8 text-base bg-white text-brand-primary font-semibold hover:bg-white/90"
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.98 }}
                >
                  Start Free Trial
                  <ArrowRight className="ml-2 size-4" />
                </Button>
                <Button
                  size="lg"
                  variant="outline"
                  className="rounded-full h-12 px-8 text-base bg-transparent border-white/50 text-white hover:bg-white/10 hover:border-white"
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.98 }}
                >
                  Book a Demo
                </Button>
              </div>
              <p className="text-sm text-white/70 mt-4">
                No credit card required. 30-day free trial. Cancel anytime.
              </p>
            </motion.div>
          </div>
        </section>

        {/* Scroll-to-top Button */}
        <AnimatePresence>
          {isScrolled && (
            <motion.button
              onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
              aria-label="Scroll to top"
              className="fixed bottom-6 right-6 z-50 p-3 rounded-full bg-brand-primary text-white shadow-lg hover:bg-brand-primary-hover focus:outline-none focus:ring-2 focus:ring-brand-primary focus:ring-offset-2"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 20 }}
              transition={{ duration: 0.2, ease: "easeOut" }}
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.95 }}
            >
              <ChevronUp className="size-5" />
            </motion.button>
          )}
        </AnimatePresence>
      </main>

      {/* Footer */}
      <footer className="w-full border-t border-[#f0f0f0] bg-white">
        <div className="container flex flex-col gap-8 px-4 py-10 md:px-6 lg:py-16">
          <div className="grid gap-8 sm:grid-cols-2 md:grid-cols-4 lg:grid-cols-5">
            {/* Brand Info */}
            <div className="space-y-4 lg:col-span-2">
              <Link href="/" className="flex items-center gap-2 font-bold text-lg text-brand-dark">
                <div className="size-8 rounded-lg bg-gradient-to-br from-brand-dark-lighter to-brand-primary flex items-center justify-center text-white font-semibold">
                  R
                </div>
                <span>Rentium</span>
              </Link>
              <p className="text-sm text-[#555]">
                We put rental management on autopilot with AI-driven tools for profit and loss, leases, maintenance, and applications.
              </p>
              <div className="flex gap-4">
                 {/* Replace # with actual social links */}
                <Link href="#" className="text-[#777] hover:text-brand-primary transition-colors" aria-label="Facebook">
                  <svg fill="currentColor" className="size-5" viewBox="0 0 16 16"> <path d="M16 8.049c0-4.446-3.582-8.05-8-8.05C3.58 0-.002 3.603-.002 8.05c0 4.017 2.926 7.347 6.75 7.951v-5.625h-2.03V8.05H6.75V6.275c0-2.017 1.195-3.131 3.022-3.131.876 0 1.791.157 1.791.157v1.98h-1.009c-.993 0-1.303.621-1.303 1.258v1.51h2.218l-.354 2.326H9.25V16c3.824-.604 6.75-3.934 6.75-7.951z"/> </svg>
                </Link>
                <Link href="#" className="text-[#777] hover:text-brand-primary transition-colors" aria-label="Twitter">
                   <svg fill="currentColor" className="size-5" viewBox="0 0 16 16"> <path d="M5.026 15c6.038 0 9.341-5.003 9.341-9.334 0-.14 0-.282-.006-.422A6.685 6.685 0 0 0 16 3.542a6.658 6.658 0 0 1-1.889.518 3.301 3.301 0 0 0 1.447-1.817 6.533 6.533 0 0 1-2.087.793A3.286 3.286 0 0 0 7.875 6.03a9.325 9.325 0 0 1-6.767-3.429 3.289 3.289 0 0 0 1.018 4.382A3.323 3.323 0 0 1 .64 6.575v.045a3.288 3.288 0 0 0 2.632 3.218 3.203 3.203 0 0 1-.865.115 3.23 3.23 0 0 1-.614-.057 3.283 3.283 0 0 0 3.067 2.277A6.588 6.588 0 0 1 .792 13.88a6.337 6.337 0 0 1-.78-.045A9.344 9.344 0 0 0 5.026 15z"/> </svg>
                </Link>
                <Link href="#" className="text-[#777] hover:text-brand-primary transition-colors" aria-label="LinkedIn">
                   <svg fill="currentColor" className="size-5" viewBox="0 0 16 16"> <path d="M0 1.146C0 .513.526 0 1.175 0h13.65C15.474 0 16 .513 16 1.146v13.708c0 .633-.526 1.146-1.175 1.146H1.175C.526 16 0 15.487 0 14.854V1.146zm4.943 12.248V6.169H2.542v7.225h2.401zm-1.2-8.212c.837 0 1.358-.554 1.358-1.248-.015-.709-.52-1.248-1.342-1.248-.822 0-1.359.54-1.359 1.248 0 .694.521 1.248 1.327 1.248h.016zm4.908 8.212V9.359c0-.216.016-.432.08-.586.173-.431.568-.878 1.232-.878.869 0 1.216.662 1.216 1.634v3.865h2.401V9.25c0-2.22-1.184-3.252-2.764-3.252-1.274 0-1.845.7-2.165 1.193v.025h-.016a5.54 5.54 0 0 1 .016-.025V6.169h-2.4c.03.678 0 7.225 0 7.225h2.4z"/> </svg>
                </Link>
              </div>
            </div>
            {/* Product Links */}
            <div className="space-y-4">
              <h4 className="text-sm font-semibold text-brand-dark uppercase tracking-wider">Product</h4>
              <ul className="space-y-2 text-sm">
                <li><Link href="#features" className="text-[#555] hover:text-brand-primary transition-colors">Features</Link></li>
                <li><Link href="#pricing" className="text-[#555] hover:text-brand-primary transition-colors">Pricing</Link></li>
                <li><Link href="#" className="text-[#555] hover:text-brand-primary transition-colors">Security</Link></li>
                <li><Link href="#" className="text-[#555] hover:text-brand-primary transition-colors">Integrations</Link></li>
              </ul>
            </div>
             {/* Resources Links */}
            <div className="space-y-4">
              <h4 className="text-sm font-semibold text-brand-dark uppercase tracking-wider">Resources</h4>
              <ul className="space-y-2 text-sm">
                <li><Link href="#" className="text-[#555] hover:text-brand-primary transition-colors">Help Center</Link></li>
                <li><Link href="#" className="text-[#555] hover:text-brand-primary transition-colors">Property Guides</Link></li>
                <li><Link href="#" className="text-[#555] hover:text-brand-primary transition-colors">Blog</Link></li>
                <li><Link href="#" className="text-[#555] hover:text-brand-primary transition-colors">Webinars</Link></li>
              </ul>
            </div>
            {/* Company Links */}
            <div className="space-y-4">
              <h4 className="text-sm font-semibold text-brand-dark uppercase tracking-wider">Company</h4>
              <ul className="space-y-2 text-sm">
                <li><Link href="#" className="text-[#555] hover:text-brand-primary transition-colors">About Us</Link></li>
                <li><Link href="#" className="text-[#555] hover:text-brand-primary transition-colors">Careers</Link></li>
                <li><Link href="#" className="text-[#555] hover:text-brand-primary transition-colors">Privacy Policy</Link></li>
                <li><Link href="#" className="text-[#555] hover:text-brand-primary transition-colors">Terms of Service</Link></li>
              </ul>
            </div>
          </div>
          {/* Copyright & Bottom Links */}
          <div className="flex flex-col gap-4 sm:flex-row justify-between items-center border-t border-[#f0f0f0] pt-8 mt-8">
            <p className="text-xs text-[#777]">
              © {new Date().getFullYear()} Rentium Inc. All rights reserved.
            </p>
            <div className="flex gap-4">
              <Link href="#" className="text-xs text-[#777] hover:text-brand-primary transition-colors">Privacy Policy</Link>
              <Link href="#" className="text-xs text-[#777] hover:text-brand-primary transition-colors">Terms of Service</Link>
              <Link href="#" className="text-xs text-[#777] hover:text-brand-primary transition-colors">Cookie Policy</Link>
            </div>
          </div>
        </div>
      </footer>
    </div>
  )
}