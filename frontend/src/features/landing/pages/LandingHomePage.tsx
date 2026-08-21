import React, { useState } from "react";
import { Link } from "react-router-dom";
import { useAuthStore } from "@/features/auth/store/authStore";
import { ThemeToggle } from "@/components/common/ThemeToggle";
import { Button } from "@/components/ui/button";
import { KitchenLogo } from "@/components/brand/KitchenLogo";
import { LeftHeroIllustration, RightHeroIllustration } from "../components/HeroSketches";
import {
  ChevronDown,
  Star,
  HelpCircle,
  ChefHat,
  LayoutDashboard,
  Sparkles,
  QrCode,
  Globe,
  Receipt,
  Utensils,
  Flame,
  Menu as MenuIcon,
  X as CloseIcon,
  UploadCloud,
} from "lucide-react";

export const LandingHomePage: React.FC = () => {
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  const user = useAuthStore((state) => state.user);

  // Mobile navigation drawer
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  // Active Dropdowns in Navbar
  const [activeDropdown, setActiveDropdown] = useState<string | null>(null);

  // FAQ Accordion State (default first item open)
  const [openFaqIndex, setOpenFaqIndex] = useState<number | null>(0);

  // Radio selection in Mockup header
  const [logoOption, setLogoOption] = useState<"none" | "image">("image");

  const toggleFaq = (idx: number) => {
    setOpenFaqIndex(openFaqIndex === idx ? null : idx);
  };

  const faqs = [
    {
      question: "What is Fluxiflow for Kitchen?",
      answer:
        "Fluxiflow is an end-to-end modern kitchen operating system and digital restaurant platform. It unifies digital QR menus, multi-station Kitchen Display Systems (KDS), POS terminals, recipe BOM costing, and real-time inventory tracking into one seamless cloud workspace.",
    },
    {
      question: "Who is Fluxiflow for?",
      answer:
        "Fluxiflow is a tool that allows restaurants and food businesses to easily create a mini-website, interactive digital menu, and multi-station kitchen display. By placing your digital menu link in your bio or tables, your customers can easily access and order with just one click.",
    },
    {
      question: "What is a mini website with built-in online menu?",
      answer:
        "This mini website features an interactive digital menu and a hub for all your essential links, including Google Maps directions, social media profiles, and online ordering platforms with zero third-party commission fees.",
    },
    {
      question: "Why do I need a mini website with built-in online menu?",
      answer:
        "It eliminates outdated paper menus, reduces meal prep and wait times, allows instant item updates, and increases sales by enabling customers to order directly from their phone or at tables.",
    },
    {
      question: "How to create a mini website with built-in online menu?",
      answer:
        "Simply sign up, add your restaurant name and branding, create menu categories and items with pricing, and your digital menu website and QR codes are live and ready to print in under 5 minutes.",
    },
  ];

  const testimonials = [
    {
      brand: "Bistrot Parisien",
      tag: "French Bistro",
      quote:
        "Fluxiflow has transformed how we manage our menu, website, and orders, making everything so simple and transformed.",
      author: "Chef Antoine Laurent",
      rating: 5,
      iconBg: "bg-emerald-500/10 text-emerald-600",
    },
    {
      brand: "L'Osteria Milano",
      tag: "Italian Dining",
      quote:
        "Our restaurant's digital experience has improved thanks to Fluxiflow's seamless website, menu, and ordering.",
      author: "Marco Bellini, GM",
      rating: 5,
      iconBg: "bg-purple-500/10 text-purple-600",
    },
    {
      brand: "88 Osteria",
      tag: "Artisan Dining",
      quote:
        "With Fluxiflow, we've boosted efficiency and customer satisfaction by simplifying our the entire digital management.",
      author: "Kenji Sato, Head Chef",
      rating: 5,
      iconBg: "bg-amber-500/10 text-amber-600",
    },
  ];

  const clientLogos = [
    "Nobu Culinary",
    "Buvette Bistro",
    "The Rustic Table",
    "Bubba's Kitchen",
    "88 Osteria",
    "Artisan Bakery",
  ];

  return (
    <div className="min-h-screen bg-white dark:bg-slate-950 text-slate-900 dark:text-slate-100 selection:bg-purple-500/20 font-sans transition-colors duration-200 overflow-x-hidden">
      {/* Top Navigation Bar */}
      <header className="sticky top-0 z-50 w-full bg-white/95 dark:bg-slate-950/95 backdrop-blur-md border-b border-slate-100 dark:border-slate-800/80 transition-colors">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 h-20 flex items-center justify-between gap-4">
          {/* Brand Logo */}
          <Link to="/" className="flex items-center gap-2 group">
            <KitchenLogo size="md" showText={true} />
          </Link>

          {/* Center Navigation Links with Dropdown Carets */}
          <nav className="hidden lg:flex items-center gap-8 text-sm font-medium text-slate-600 dark:text-slate-300">
            {/* Features Dropdown */}
            <div
              className="relative cursor-pointer group"
              onMouseEnter={() => setActiveDropdown("features")}
              onMouseLeave={() => setActiveDropdown(null)}
            >
              <div className="flex items-center gap-1 hover:text-purple-600 dark:hover:text-purple-400 transition-colors py-2">
                <span>Features</span>
                <ChevronDown className="h-3.5 w-3.5 opacity-70 group-hover:rotate-180 transition-transform" />
              </div>
              {activeDropdown === "features" && (
                <div className="absolute top-full -left-4 w-64 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-xl p-2 space-y-1 animate-in fade-in zoom-in-95 duration-150 z-50">
                  <Link to="/kitchen" className="flex items-center gap-3 p-2 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 text-xs transition-colors">
                    <div className="p-2 rounded-lg bg-emerald-500/10 text-emerald-600"><ChefHat className="h-4 w-4" /></div>
                    <div>
                      <span className="font-bold block text-slate-900 dark:text-white">Kitchen Display (KDS)</span>
                      <span className="text-[10px] text-slate-400">Live multi-station tickets</span>
                    </div>
                  </Link>
                  <Link to="/orders/pos" className="flex items-center gap-3 p-2 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 text-xs transition-colors">
                    <div className="p-2 rounded-lg bg-purple-500/10 text-purple-600"><Receipt className="h-4 w-4" /></div>
                    <div>
                      <span className="font-bold block text-slate-900 dark:text-white">POS Terminal</span>
                      <span className="text-[10px] text-slate-400">Tables, billing &amp; splits</span>
                    </div>
                  </Link>
                  <Link to="/recipes" className="flex items-center gap-3 p-2 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 text-xs transition-colors">
                    <div className="p-2 rounded-lg bg-amber-500/10 text-amber-600"><Utensils className="h-4 w-4" /></div>
                    <div>
                      <span className="font-bold block text-slate-900 dark:text-white">Recipe BOMs</span>
                      <span className="text-[10px] text-slate-400">Food costing &amp; inventory</span>
                    </div>
                  </Link>
                </div>
              )}
            </div>

            {/* Solutions Dropdown */}
            <div
              className="relative cursor-pointer group"
              onMouseEnter={() => setActiveDropdown("solutions")}
              onMouseLeave={() => setActiveDropdown(null)}
            >
              <div className="flex items-center gap-1 hover:text-purple-600 dark:hover:text-purple-400 transition-colors py-2">
                <span>Solutions</span>
                <ChevronDown className="h-3.5 w-3.5 opacity-70 group-hover:rotate-180 transition-transform" />
              </div>
              {activeDropdown === "solutions" && (
                <div className="absolute top-full -left-4 w-60 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-xl p-2 space-y-1 animate-in fade-in zoom-in-95 duration-150 z-50">
                  <Link to="/tables" className="flex items-center gap-2.5 p-2 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 text-xs text-slate-700 dark:text-slate-200">
                    <QrCode className="h-4 w-4 text-emerald-500" />
                    <span>Dine-In QR &amp; Table Floor</span>
                  </Link>
                  <Link to="/menu" className="flex items-center gap-2.5 p-2 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 text-xs text-slate-700 dark:text-slate-200">
                    <Globe className="h-4 w-4 text-purple-500" />
                    <span>Digital Menu &amp; Web Store</span>
                  </Link>
                  <Link to="/inventory" className="flex items-center gap-2.5 p-2 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 text-xs text-slate-700 dark:text-slate-200">
                    <Flame className="h-4 w-4 text-amber-500" />
                    <span>Cloud Kitchens &amp; QSR</span>
                  </Link>
                </div>
              )}
            </div>

            <a href="#pricing" className="hover:text-purple-600 dark:hover:text-purple-400 transition-colors">
              Pricing
            </a>

            {/* Resources Dropdown */}
            <div
              className="relative cursor-pointer group"
              onMouseEnter={() => setActiveDropdown("resources")}
              onMouseLeave={() => setActiveDropdown(null)}
            >
              <div className="flex items-center gap-1 hover:text-purple-600 dark:hover:text-purple-400 transition-colors py-2">
                <span>Resources</span>
                <ChevronDown className="h-3.5 w-3.5 opacity-70 group-hover:rotate-180 transition-transform" />
              </div>
              {activeDropdown === "resources" && (
                <div className="absolute top-full -left-4 w-52 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-xl p-2 space-y-1 animate-in fade-in zoom-in-95 duration-150 z-50">
                  <a href="#faq" className="flex items-center gap-2 p-2 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 text-xs text-slate-700 dark:text-slate-200">
                    <HelpCircle className="h-4 w-4 text-purple-500" />
                    <span>FAQ Center</span>
                  </a>
                  <Link to="/reports" className="flex items-center gap-2 p-2 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 text-xs text-slate-700 dark:text-slate-200">
                    <Sparkles className="h-4 w-4 text-emerald-500" />
                    <span>Analytics Overview</span>
                  </Link>
                </div>
              )}
            </div>
          </nav>

          {/* Right Header Actions */}
          <div className="flex items-center gap-3">
            <ThemeToggle />

            {isAuthenticated ? (
              <Link to="/dashboard">
                <Button className="bg-[#6320EE] hover:bg-[#5218D6] text-white font-bold text-xs px-5 h-9 rounded-full shadow-md shadow-purple-600/25 flex items-center gap-1.5 transition-all">
                  <LayoutDashboard className="h-3.5 w-3.5" />
                  <span>Dashboard ({user?.first_name || "Staff"})</span>
                </Button>
              </Link>
            ) : (
              <div className="flex items-center gap-2.5">
                <Link to="/login">
                  <button
                    type="button"
                    className="border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 hover:border-slate-400 dark:hover:border-slate-500 font-medium text-xs h-9 px-5 rounded-full bg-white dark:bg-slate-900 hover:bg-slate-50 transition-all cursor-pointer"
                  >
                    Sign In
                  </button>
                </Link>

                <Link to="/register">
                  <button
                    type="button"
                    className="bg-[#6320EE] hover:bg-[#5218D6] text-white font-semibold text-xs h-9 px-5 rounded-full shadow-md shadow-purple-600/30 hover:scale-105 active:scale-95 transition-all cursor-pointer"
                  >
                    Sign Up
                  </button>
                </Link>
              </div>
            )}

            {/* Mobile menu toggle */}
            <button
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              className="lg:hidden p-2 text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800"
              aria-label="Toggle menu"
            >
              {isMobileMenuOpen ? <CloseIcon className="h-6 w-6" /> : <MenuIcon className="h-6 w-6" />}
            </button>
          </div>
        </div>

        {/* Mobile Dropdown Menu */}
        {isMobileMenuOpen && (
          <div className="lg:hidden border-b border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 px-4 py-4 space-y-3">
            <Link
              to="/kitchen"
              onClick={() => setIsMobileMenuOpen(false)}
              className="block py-2 text-sm font-semibold text-slate-700 dark:text-slate-200"
            >
              Kitchen Display (KDS)
            </Link>
            <Link
              to="/orders/pos"
              onClick={() => setIsMobileMenuOpen(false)}
              className="block py-2 text-sm font-semibold text-slate-700 dark:text-slate-200"
            >
              POS Terminal
            </Link>
            <a
              href="#pricing"
              onClick={() => setIsMobileMenuOpen(false)}
              className="block py-2 text-sm font-semibold text-slate-700 dark:text-slate-200"
            >
              Pricing
            </a>
            <a
              href="#faq"
              onClick={() => setIsMobileMenuOpen(false)}
              className="block py-2 text-sm font-semibold text-slate-700 dark:text-slate-200"
            >
              Frequently Asked Questions
            </a>
            <div className="pt-2 flex flex-col gap-2">
              <Link to="/login" onClick={() => setIsMobileMenuOpen(false)}>
                <Button variant="outline" className="w-full rounded-full">Sign In</Button>
              </Link>
              <Link to="/register" onClick={() => setIsMobileMenuOpen(false)}>
                <Button className="w-full bg-[#6320EE] text-white rounded-full">Sign Up Free</Button>
              </Link>
            </div>
          </div>
        )}
      </header>

      {/* Hero Section */}
      <section className="relative pt-16 sm:pt-20 pb-0 px-4 sm:px-6 lg:px-8 max-w-6xl mx-auto text-center">
        <div className="max-w-4xl mx-auto space-y-6">
          {/* Main Hero Headline */}
          <h1 className="text-4xl sm:text-5xl lg:text-[56px] font-black tracking-tight text-slate-900 dark:text-white leading-[1.12]">
            Modern Restaurant Solutions,
            <br />
            Menu,Website,Orders
          </h1>

          {/* Hero Subtitle */}
          <p className="text-sm sm:text-base text-slate-600 dark:text-slate-400 max-w-xl mx-auto leading-relaxed">
            Set up your digital menu, website, and online ordering in a day.
            <br />
            No tech skills needed. All for the cost of a coffee ☕
          </p>

          {/* Primary CTA Button (Vibrant Purple Pill Button with soft glow) */}
          <div className="pt-3 flex justify-center">
            <Link to="/register">
              <button
                type="button"
                className="inline-flex items-center justify-center px-9 py-3.5 rounded-full bg-[#6320EE] hover:bg-[#5218D6] text-white font-bold text-sm shadow-xl shadow-purple-600/30 hover:shadow-purple-600/50 hover:scale-105 active:scale-95 transition-all duration-200 cursor-pointer"
              >
                Try For Free
              </button>
            </Link>
          </div>

          {/* 3-Column Value Proposition Pillars with Left Border Accents */}
          <div className="pt-10 pb-4 grid grid-cols-1 md:grid-cols-3 gap-8 text-left max-w-4xl mx-auto">
            {/* Pillar 1 */}
            <div className="border-l-2 border-slate-900 dark:border-purple-400 pl-4 space-y-1">
              <h3 className="text-xs font-bold text-slate-900 dark:text-white">
                Showcase information
              </h3>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-relaxed">
                This covers the mini-website feature, allowing restaurants to present all their essential information in one place.
              </p>
            </div>

            {/* Pillar 2 */}
            <div className="border-l-2 border-slate-900 dark:border-purple-400 pl-4 space-y-1">
              <h3 className="text-xs font-bold text-slate-900 dark:text-white">
                Attract Customers
              </h3>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-relaxed">
                Includes digital, QR code, and tablet menus, giving customers multiple ways to interact with your offerings Customers.
              </p>
            </div>

            {/* Pillar 3 */}
            <div className="border-l-2 border-slate-900 dark:border-purple-400 pl-4 space-y-1">
              <h3 className="text-xs font-bold text-slate-900 dark:text-white">
                Drive Sales
              </h3>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-relaxed">
                This directly addresses the new online ordering and payment features, emphasizing the ability to convert interest
              </p>
            </div>
          </div>
        </div>

        {/* Showcase Device Tablet Bezel Mockup with Flanking Purple Hand-Drawn Sketches */}
        <div className="mt-14 relative max-w-5xl mx-auto">
          {/* Left Purple Line-Art Sketch (Food Truck / POS Terminal & Receipt) */}
          <div className="hidden md:block absolute -left-20 sm:-left-28 lg:-left-44 bottom-0 w-48 sm:w-64 lg:w-80 pointer-events-none select-none z-0">
            <LeftHeroIllustration className="w-full h-auto drop-shadow-sm opacity-90 dark:opacity-75" />
          </div>

          {/* Right Purple Line-Art Sketch (Cafe Awning / Storefront & Dining Patio) */}
          <div className="hidden md:block absolute -right-20 sm:-right-28 lg:-right-44 bottom-0 w-48 sm:w-64 lg:w-80 pointer-events-none select-none z-0">
            <RightHeroIllustration className="w-full h-auto drop-shadow-sm opacity-90 dark:opacity-75" />
          </div>

          {/* Realistic Tablet Frame Container */}
          <div className="relative z-10 rounded-t-[36px] p-3 sm:p-4 bg-slate-900 shadow-2xl shadow-purple-950/20 border-t-4 border-x-4 border-slate-800 pb-0">
            {/* Tablet Camera / Notch */}
            <div className="absolute top-1.5 left-1/2 -translate-x-1/2 w-16 h-2 bg-slate-800 rounded-full" />

            {/* Tablet Screen Interior */}
            <div className="bg-[#F8FAFC] dark:bg-slate-950 rounded-t-[24px] overflow-hidden border-t border-x border-slate-200 dark:border-slate-800 text-left">
              {/* Mockup Top Header */}
              <div className="px-6 py-4 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <KitchenLogo size="xs" showText={true} />
                </div>

                <div className="font-bold text-xs text-slate-800 dark:text-slate-200 hidden sm:block">
                  Showcase information
                </div>

                {/* None / Image Radio Buttons matching reference */}
                <div className="flex items-center gap-4 text-xs">
                  <label className="flex items-center gap-1.5 cursor-pointer text-slate-500 hover:text-slate-800">
                    <input
                      type="radio"
                      name="logoOpt"
                      checked={logoOption === "none"}
                      onChange={() => setLogoOption("none")}
                      className="accent-[#6320EE]"
                    />
                    <span className="text-[11px]">None</span>
                  </label>

                  <label className="flex items-center gap-1.5 cursor-pointer text-slate-800 font-semibold">
                    <input
                      type="radio"
                      name="logoOpt"
                      checked={logoOption === "image"}
                      onChange={() => setLogoOption("image")}
                      className="accent-[#6320EE]"
                    />
                    <span className="text-[11px]">Image</span>
                  </label>
                </div>
              </div>

              {/* Mockup Body Columns */}
              <div className="p-6 grid grid-cols-1 md:grid-cols-12 gap-5 min-h-[460px] pb-16">
                {/* Left Column: Brand Customization & Header */}
                <div className="md:col-span-4 space-y-4">
                  {/* Brand Customization */}
                  <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 space-y-2.5 shadow-sm">
                    <span className="text-xs font-bold text-slate-900 dark:text-white block">
                      Brand Customization
                    </span>

                    {/* Theme color */}
                    <div className="space-y-1">
                      <span className="text-[10px] text-slate-400 block font-medium">Theme color *</span>
                      <div className="flex items-center justify-between px-3 py-1.5 rounded-lg bg-[#F8FAFC] dark:bg-slate-950 border border-slate-200 dark:border-slate-800">
                        <span className="text-[11px] font-mono font-medium text-slate-700 dark:text-slate-300">#30ABA6</span>
                        <span className="w-4 h-4 rounded bg-[#30ABA6]" />
                      </div>
                    </div>

                    {/* Text color */}
                    <div className="space-y-1">
                      <span className="text-[10px] text-slate-400 block font-medium">Text color *</span>
                      <div className="flex items-center justify-between px-3 py-1.5 rounded-lg bg-[#F8FAFC] dark:bg-slate-950 border border-slate-200 dark:border-slate-800">
                        <span className="text-[11px] font-mono font-medium text-slate-700 dark:text-slate-300">#000000</span>
                        <span className="w-4 h-4 rounded bg-[#000000]" />
                      </div>
                    </div>

                    {/* Background color */}
                    <div className="space-y-1">
                      <span className="text-[10px] text-slate-400 block font-medium">Background color *</span>
                      <div className="flex items-center justify-between px-3 py-1.5 rounded-lg bg-[#F8FAFC] dark:bg-slate-950 border border-slate-200 dark:border-slate-800">
                        <span className="text-[11px] font-mono font-medium text-slate-700 dark:text-slate-300">#F0F4F7</span>
                        <span className="w-4 h-4 rounded bg-[#F0F4F7] border border-slate-300" />
                      </div>
                    </div>

                    {/* Font */}
                    <div className="space-y-1">
                      <span className="text-[10px] text-slate-400 block font-medium">Font *</span>
                      <div className="flex items-center justify-between px-3 py-1.5 rounded-lg bg-[#F8FAFC] dark:bg-slate-950 border border-slate-200 dark:border-slate-800">
                        <span className="text-[11px] font-medium text-slate-700 dark:text-slate-300">Poppins</span>
                        <ChevronDown className="h-3.5 w-3.5 text-slate-400" />
                      </div>
                    </div>
                  </div>

                  {/* Header Image Dropzone */}
                  <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 space-y-2 shadow-sm">
                    <span className="text-xs font-bold text-slate-900 dark:text-white block">
                      Header
                    </span>
                    <div className="border border-dashed border-slate-200 dark:border-slate-700 rounded-xl p-4 text-center space-y-1 bg-[#FAFCFD] dark:bg-slate-950/60">
                      <div className="mx-auto w-7 h-7 rounded-full bg-emerald-500/10 text-emerald-600 flex items-center justify-center">
                        <UploadCloud className="h-4 w-4" />
                      </div>
                      <span className="text-[11px] font-bold text-slate-800 dark:text-slate-200 block">
                        Choose Image
                      </span>
                    </div>
                  </div>
                </div>

                {/* Right Column: Brand Logo + Background + Multi-Platform Sharing */}
                <div className="md:col-span-8 space-y-4">
                  {/* Brand Logo Dropzone */}
                  <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 space-y-2 shadow-sm">
                    <span className="text-xs font-bold text-slate-900 dark:text-white block">
                      Brand Logo
                    </span>

                    {/* Upload Box with Green Cloud */}
                    <div className="border border-dashed border-slate-200 dark:border-slate-700 rounded-xl p-6 text-center space-y-1.5 bg-[#FAFCFD] dark:bg-slate-950/60">
                      <div className="mx-auto w-8 h-8 rounded-full bg-emerald-500/10 text-emerald-600 flex items-center justify-center">
                        <UploadCloud className="h-4 w-4" />
                      </div>
                      <span className="text-xs font-bold text-slate-800 dark:text-slate-200 block">
                        Choose File
                      </span>
                      <p className="text-[10px] text-slate-400 max-w-xs mx-auto">
                        File size should not exceed 10 MB. You can use tools such as Canva to design.
                      </p>
                    </div>
                  </div>

                  {/* Bottom Row inside Right Column */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {/* Background Dropzone */}
                    <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 space-y-2 shadow-sm flex flex-col justify-between">
                      <div>
                        <span className="text-xs font-bold text-slate-900 dark:text-white block mb-2">
                          Background
                        </span>
                        <div className="border border-dashed border-slate-200 dark:border-slate-700 rounded-xl p-5 text-center space-y-1 bg-[#FAFCFD] dark:bg-slate-950/60">
                          <div className="mx-auto w-7 h-7 rounded-full bg-emerald-500/10 text-emerald-600 flex items-center justify-center">
                            <UploadCloud className="h-4 w-4" />
                          </div>
                          <span className="text-[11px] font-bold text-slate-800 dark:text-slate-200 block">
                            Choose Image
                          </span>
                          <p className="text-[9px] text-slate-400">
                            Fit to your brand style with pattern or photo
                          </p>
                        </div>
                      </div>
                    </div>

                    {/* Multi-Platform Sharing Toggles Card */}
                    <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 space-y-2.5 shadow-sm">
                      <div className="flex items-center justify-between pb-1 border-b border-slate-100 dark:border-slate-800">
                        <span className="text-xs font-bold text-slate-900 dark:text-white">
                          Multi-Platform Sharing
                        </span>
                      </div>

                      <div className="space-y-2 text-[11px]">
                        {/* Our Menu */}
                        <div className="flex items-center justify-between py-0.5">
                          <div className="flex items-center gap-2">
                            <span className="w-5 h-5 rounded-md bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-[9px] font-bold">📖</span>
                            <div>
                              <span className="font-semibold text-slate-800 dark:text-slate-200 block leading-tight">Our Menu</span>
                              <span className="text-[9px] text-slate-400">Interactive digital catalog</span>
                            </div>
                          </div>
                          <span className="w-8 h-4.5 rounded-full bg-[#10B981] flex items-center justify-end px-1 cursor-pointer">
                            <span className="w-3.5 h-3.5 rounded-full bg-white shadow-sm" />
                          </span>
                        </div>

                        {/* Facebook */}
                        <div className="flex items-center justify-between py-0.5">
                          <div className="flex items-center gap-2">
                            <span className="w-5 h-5 rounded-md bg-blue-50 text-blue-600 flex items-center justify-center text-[9px] font-bold">f</span>
                            <div>
                              <span className="font-semibold text-slate-800 dark:text-slate-200 block leading-tight">Facebook</span>
                              <span className="text-[9px] text-slate-400">Bio ordering link</span>
                            </div>
                          </div>
                          <span className="w-8 h-4.5 rounded-full bg-[#10B981] flex items-center justify-end px-1 cursor-pointer">
                            <span className="w-3.5 h-3.5 rounded-full bg-white shadow-sm" />
                          </span>
                        </div>

                        {/* Instagram */}
                        <div className="flex items-center justify-between py-0.5">
                          <div className="flex items-center gap-2">
                            <span className="w-5 h-5 rounded-md bg-pink-50 text-pink-600 flex items-center justify-center text-[9px] font-bold">📷</span>
                            <div>
                              <span className="font-semibold text-slate-800 dark:text-slate-200 block leading-tight">Instagram</span>
                              <span className="text-[9px] text-slate-400">Story &amp; QR link</span>
                            </div>
                          </div>
                          <span className="w-8 h-4.5 rounded-full bg-[#10B981] flex items-center justify-end px-1 cursor-pointer">
                            <span className="w-3.5 h-3.5 rounded-full bg-white shadow-sm" />
                          </span>
                        </div>

                        {/* Twitter */}
                        <div className="flex items-center justify-between py-0.5">
                          <div className="flex items-center gap-2">
                            <span className="w-5 h-5 rounded-md bg-slate-100 text-slate-800 flex items-center justify-center text-[9px] font-bold">𝕏</span>
                            <div>
                              <span className="font-semibold text-slate-800 dark:text-slate-200 block leading-tight">Twitter</span>
                              <span className="text-[9px] text-slate-400">Profile direct menu</span>
                            </div>
                          </div>
                          <span className="w-8 h-4.5 rounded-full bg-[#10B981] flex items-center justify-end px-1 cursor-pointer">
                            <span className="w-3.5 h-3.5 rounded-full bg-white shadow-sm" />
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Smooth Bottom Gradient Fade Out Effect */}
          <div className="absolute inset-x-0 bottom-0 h-32 bg-gradient-to-t from-white via-white/80 to-transparent dark:from-slate-950 dark:via-slate-950/80 dark:to-transparent pointer-events-none z-20" />
        </div>
      </section>

      {/* Social Proof / Testimonials Section */}
      <section className="py-20 px-4 sm:px-6 lg:px-8 max-w-6xl mx-auto text-center">
        <div className="max-w-3xl mx-auto space-y-3">
          <h2 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-slate-900 dark:text-white">
            The World&apos;s Leading Restaurants<br />Trust Us By Fluxiflow
          </h2>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400">
            Top restaurants trust Fluxiflow to deliver digital solutions that simplify operations, boost efficiency, and enhance customer satisfaction.
          </p>
        </div>

        {/* 3 Testimonial Cards */}
        <div className="mt-12 grid grid-cols-1 md:grid-cols-3 gap-6 text-left">
          {testimonials.map((t, idx) => (
            <div
              key={idx}
              className="p-6 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800/80 shadow-lg shadow-slate-200/30 dark:shadow-black/40 flex flex-col justify-between space-y-4 hover:border-purple-300 dark:hover:border-purple-800 transition-all group"
            >
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <div className={`w-9 h-9 rounded-xl ${t.iconBg} flex items-center justify-center font-bold text-xs uppercase`}>
                      {t.brand[0]}
                    </div>
                    <div>
                      <span className="text-xs font-bold text-slate-900 dark:text-white block">
                        {t.brand}
                      </span>
                      <span className="text-[10px] text-slate-400">{t.tag}</span>
                    </div>
                  </div>
                </div>

                <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
                  &ldquo;{t.quote}&rdquo;
                </p>
              </div>

              <div className="pt-3 border-t border-slate-100 dark:border-slate-800/80 flex items-center justify-between">
                <span className="text-[11px] font-medium text-slate-500">{t.author}</span>
                <div className="flex items-center text-amber-400">
                  {Array.from({ length: t.rating }).map((_, i) => (
                    <Star key={i} className="h-3.5 w-3.5 fill-amber-400 text-amber-400" />
                  ))}
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Carousel Pagination Dots */}
        <div className="flex items-center justify-center gap-2 mt-8">
          <span className="w-2.5 h-2.5 rounded-full bg-slate-900 dark:bg-white" />
          <span className="w-2 h-2 rounded-full bg-slate-300 dark:bg-slate-700" />
          <span className="w-2 h-2 rounded-full bg-slate-300 dark:bg-slate-700" />
        </div>

        {/* Partner Logos Bar */}
        <div className="mt-16 pt-10 border-t border-slate-100 dark:border-slate-800/80">
          <span className="text-xs font-bold text-slate-500 uppercase tracking-widest block mb-6">
            The world&apos;s leading companies trust
          </span>
          <div className="flex flex-wrap items-center justify-center gap-8 sm:gap-12 opacity-60 dark:opacity-40">
            {clientLogos.map((logo, idx) => (
              <span key={idx} className="font-extrabold text-sm sm:text-base tracking-tight text-slate-800 dark:text-slate-200">
                {logo}
              </span>
            ))}
          </div>
        </div>
      </section>

      {/* Frequently Asked Questions Section (Rich Purple/Indigo Gradient) */}
      <section id="faq" className="py-16 px-4 sm:px-6 lg:px-8 max-w-6xl mx-auto">
        <div className="rounded-[36px] bg-gradient-to-br from-[#4F23D6] via-[#6320EE] to-[#7B2CBF] p-8 sm:p-12 lg:p-16 text-white shadow-2xl shadow-purple-950/40 grid grid-cols-1 lg:grid-cols-12 gap-10">
          {/* Left Column */}
          <div className="lg:col-span-5 flex flex-col justify-between space-y-6">
            <div className="space-y-4">
              <div className="w-10 h-10 rounded-2xl bg-white/15 backdrop-blur-md flex items-center justify-center text-white border border-white/20">
                <HelpCircle className="h-5 w-5" />
              </div>

              <h2 className="text-3xl sm:text-4xl font-extrabold tracking-tight leading-tight">
                Frequently Asked<br />Questions
              </h2>

              <p className="text-xs sm:text-sm text-purple-100/80 leading-relaxed max-w-sm">
                Collect and respond to user feedback, track new updates, and gain valuable insights for better decisions.
              </p>
            </div>

            <div>
              <a href="#faq">
                <button
                  type="button"
                  className="px-6 py-3 rounded-full bg-white/20 hover:bg-white/30 backdrop-blur-md text-white font-bold text-xs border border-white/30 shadow-sm transition-all"
                >
                  Read More FAQ
                </button>
              </a>
            </div>
          </div>

          {/* Right Column: Accordion Items (Clean White Cards) */}
          <div className="lg:col-span-7 space-y-3">
            {faqs.map((faq, idx) => {
              const isOpen = openFaqIndex === idx;

              return (
                <div
                  key={idx}
                  className="rounded-2xl bg-white text-slate-900 overflow-hidden shadow-md transition-all duration-200"
                >
                  <button
                    type="button"
                    onClick={() => toggleFaq(idx)}
                    className="w-full p-4 sm:p-5 flex items-center justify-between text-left gap-4 font-bold text-xs sm:text-sm text-slate-900 hover:text-purple-700 transition-colors"
                  >
                    <span>{faq.question}</span>
                    <ChevronDown
                      className={`h-4 w-4 text-slate-400 flex-shrink-0 transition-transform duration-200 ${
                        isOpen ? "rotate-180 text-purple-600" : ""
                      }`}
                    />
                  </button>

                  {isOpen && (
                    <div className="px-4 sm:px-5 pb-5 pt-0 text-xs text-slate-600 leading-relaxed border-t border-slate-100 animate-in fade-in duration-150">
                      <p className="pt-3">{faq.answer}</p>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* Structured Footer */}
      <footer className="w-full border-t border-slate-100 dark:border-slate-800/80 bg-white dark:bg-slate-950 pt-14 pb-10">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 space-y-10">
          <div className="grid grid-cols-2 md:grid-cols-5 gap-8">
            {/* Left Brand Column */}
            <div className="col-span-2 space-y-3">
              <KitchenLogo size="md" showText={true} />
              <p className="text-xs text-slate-500 dark:text-slate-400 max-w-xs leading-relaxed">
                Menubly LLC &amp; The Green Suite, 41, Dover, Delaware 19901.
              </p>
            </div>

            {/* About Us */}
            <div className="space-y-3 text-xs">
              <span className="font-bold text-slate-900 dark:text-white block">About us</span>
              <ul className="space-y-2 text-slate-500 dark:text-slate-400">
                <li><a href="#" className="hover:text-purple-600">Our Mission</a></li>
                <li><a href="#" className="hover:text-purple-600">Who we are</a></li>
                <li><a href="#" className="hover:text-purple-600">Our Goal</a></li>
              </ul>
            </div>

            {/* Resources */}
            <div className="space-y-3 text-xs">
              <span className="font-bold text-slate-900 dark:text-white block">Resources</span>
              <ul className="space-y-2 text-slate-500 dark:text-slate-400">
                <li><a href="#" className="hover:text-purple-600">Affiliates</a></li>
                <li><a href="#" className="hover:text-purple-600">Tools</a></li>
                <li><a href="#faq" className="hover:text-purple-600">Solutions</a></li>
              </ul>
            </div>

            {/* Features */}
            <div className="space-y-3 text-xs">
              <span className="font-bold text-slate-900 dark:text-white block">Features</span>
              <ul className="space-y-2 text-slate-500 dark:text-slate-400">
                <li><Link to="/kitchen" className="hover:text-purple-600">Mini website</Link></li>
                <li><Link to="/menu" className="hover:text-purple-600">Digital Menu</Link></li>
                <li><Link to="/orders/pos" className="hover:text-purple-600">Online Ordering</Link></li>
              </ul>
            </div>

            {/* Company */}
            <div className="space-y-3 text-xs">
              <span className="font-bold text-slate-900 dark:text-white block">Company</span>
              <ul className="space-y-2 text-slate-500 dark:text-slate-400">
                <li><a href="#" className="hover:text-purple-600">Policy</a></li>
                <li><a href="#" className="hover:text-purple-600">Terms of service</a></li>
                <li><a href="#" className="hover:text-purple-600">Membership</a></li>
              </ul>
            </div>
          </div>

          {/* Bottom Copyright & Socials */}
          <div className="pt-8 border-t border-slate-100 dark:border-slate-800/80 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-slate-400">
            <span>&copy; {new Date().getFullYear()} Menubly. All rights reserved.</span>

            {/* Social Icons */}
            <div className="flex items-center gap-4 text-slate-500 dark:text-slate-400">
              <a href="#" aria-label="Instagram" className="hover:text-purple-600 transition-colors">
                <span className="w-7 h-7 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-xs font-bold">IG</span>
              </a>
              <a href="#" aria-label="Facebook" className="hover:text-purple-600 transition-colors">
                <span className="w-7 h-7 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-xs font-bold">FB</span>
              </a>
              <a href="#" aria-label="TikTok" className="hover:text-purple-600 transition-colors">
                <span className="w-7 h-7 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-xs font-bold">TT</span>
              </a>
              <a href="#" aria-label="X" className="hover:text-purple-600 transition-colors">
                <span className="w-7 h-7 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-xs font-bold">𝕏</span>
              </a>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
};
