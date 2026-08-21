import React, { useState } from "react";
import { Link } from "react-router-dom";
import { useAuthStore } from "@/features/auth/store/authStore";
import { ThemeToggle } from "@/components/common/ThemeToggle";
import { Button } from "@/components/ui/button";
import { KitchenLogo } from "@/components/brand/KitchenLogo";
import { LeftHeroIllustration, RightHeroIllustration } from "../components/HeroSketches";
import {
  NobuLogo,
  SweetgreenLogo,
  MomofukuLogo,
  ShakeShackLogo,
  OsteriaFrancescanaLogo,
  DisfrutarLogo,
  TheFrenchLaundryLogo,
  ElevenMadisonParkLogo,
} from "../components/BrandLogos";
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
  Clock,
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

  // Interactive Mock KDS Station State
  const [mockStation, setMockStation] = useState<"ALL" | "GRILL" | "SAUTE" | "BAR" | "EXPO">("ALL");

  // Interactive Mock KDS Tickets
  const [mockTickets, setMockTickets] = useState([
    {
      id: "T-101",
      orderNumber: "TICKET #101",
      table: "Table 04",
      server: "Gordon R.",
      elapsed: "3m 42s",
      status: "PREPARING" as "NEW" | "PREPARING" | "READY" | "COMPLETED",
      station: "GRILL",
      items: [
        { name: "Prime Wagyu Ribeye", qty: 2, mod: "Medium Rare, Truffle Herb Butter", station: "GRILL" },
        { name: "Truffle Parmesan Fries", qty: 1, mod: "Extra Crispy", station: "FRYER" },
        { name: "Charred Asparagus", qty: 1, mod: "Lemon Caper Oil", station: "SAUTE" },
      ],
    },
    {
      id: "T-102",
      orderNumber: "TICKET #102",
      table: "Table 12",
      server: "Elena R.",
      elapsed: "8m 15s",
      status: "READY" as "NEW" | "PREPARING" | "READY" | "COMPLETED",
      station: "SAUTE",
      items: [
        { name: "Wild Mushroom Risotto", qty: 1, mod: "Gluten-Free, Shaved Truffle", station: "SAUTE" },
        { name: "Pan-Seared Sea Bass", qty: 2, mod: "Lemon Beurre Blanc", station: "SAUTE" },
      ],
    },
    {
      id: "T-103",
      orderNumber: "TICKET #103",
      table: "Bar 02",
      server: "Lucas M.",
      elapsed: "1m 10s",
      status: "NEW" as "NEW" | "PREPARING" | "READY" | "COMPLETED",
      station: "BAR",
      items: [
        { name: "Rosemary Smoked Old Fashioned", qty: 2, mod: "Large Ice Sphere", station: "BAR" },
        { name: "Crispy Calamari Fritto", qty: 1, mod: "Spicy Garlic Aioli", station: "FRYER" },
      ],
    },
  ]);

  const handleAdvanceTicket = (id: string) => {
    setMockTickets((prev) =>
      prev.map((t) => {
        if (t.id === id) {
          const next =
            t.status === "NEW" ? "PREPARING" : t.status === "PREPARING" ? "READY" : "COMPLETED";
          return { ...t, status: next };
        }
        return t;
      })
    );
  };

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
      question: "Who is Fluxiflow designed for?",
      answer:
        "Fluxiflow is built for independent restaurants, cafes, cloud kitchens, bistros, bars, and multi-location culinary groups looking to eliminate paper clutter, speed up order prep times, and automate recipe costing without expensive proprietary hardware.",
    },
    {
      question: "Can I run the Kitchen Display (KDS) on any iPad or tablet?",
      answer:
        "Yes! Fluxiflow runs on any device with a standard modern web browser — including iPads, Android tablets, touchscreens, smart TVs, or desktop monitors. It features real-time WebSocket ticket dispatch with ultra-low latency (<30ms).",
    },
    {
      question: "How do recipe BOMs and inventory auto-deduct work?",
      answer:
        "Every menu dish is linked to a structured Bill of Materials (BOM) specifying raw ingredients (e.g. 200g ribeye, 15ml truffle oil). As orders are fulfilled on the POS or KDS, stock levels automatically decrement with live theoretical food cost tracking.",
    },
    {
      question: "Does Fluxiflow support split bills and multi-station line routing?",
      answer:
        "Absolutely. Orders can be split by item, seat, or custom amounts on the POS, and individual items automatically route to their designated kitchen prep station (e.g. drinks to Bar, steaks to Grill, salads to Pantry, pass to Expo).",
    },
  ];

  const testimonials = [
    {
      brand: "Bistrot Parisien",
      tag: "French Bistro",
      quote:
        "Fluxiflow KDS cut our average ticket prep time by 4 minutes and completely eliminated kitchen paper ticket chaos during Friday dinner rush.",
      author: "Chef Antoine Laurent, Executive Chef",
      rating: 5,
      iconBg: "bg-emerald-500/10 text-emerald-600",
    },
    {
      brand: "L'Osteria Milano",
      tag: "Italian Dining",
      quote:
        "The automated recipe BOM costing and live inventory deduction gave us crystal-clear visibility into our daily food margins and prep waste.",
      author: "Marco Bellini, General Manager",
      rating: 5,
      iconBg: "bg-emerald-500/10 text-emerald-600",
    },
    {
      brand: "Tokyo Ramen Bar",
      tag: "High-Volume QSR",
      quote:
        "The split-second WebSocket order dispatch to our noodle and grill stations keeps our line cook team synchronized and focused under peak volume.",
      author: "Kenji Sato, Head Chef",
      rating: 5,
      iconBg: "bg-emerald-500/10 text-emerald-600",
    },
  ];

  const realBrandLogos = [
    { id: "nobu", name: "NOBU", element: <NobuLogo /> },
    { id: "sweetgreen", name: "sweetgreen", element: <SweetgreenLogo /> },
    { id: "momofuku", name: "momofuku", element: <MomofukuLogo /> },
    { id: "shakeshack", name: "SHAKE SHACK", element: <ShakeShackLogo /> },
    { id: "osteria", name: "OSTERIA FRANCESCANA", element: <OsteriaFrancescanaLogo /> },
    { id: "disfrutar", name: "DISFRUTAR", element: <DisfrutarLogo /> },
    { id: "frenchlaundry", name: "THE FRENCH LAUNDRY", element: <TheFrenchLaundryLogo /> },
    { id: "elevenmadison", name: "ELEVEN MADISON PARK", element: <ElevenMadisonParkLogo /> },
  ];

  return (
    <div className="min-h-screen bg-white dark:bg-slate-950 text-slate-900 dark:text-slate-100 selection:bg-emerald-500/20 font-sans transition-colors duration-200 overflow-x-hidden">
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
              <div className="flex items-center gap-1 hover:text-emerald-600 dark:hover:text-emerald-400 transition-colors py-2">
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
                    <div className="p-2 rounded-lg bg-emerald-500/10 text-emerald-600"><Receipt className="h-4 w-4" /></div>
                    <div>
                      <span className="font-bold block text-slate-900 dark:text-white">POS Terminal</span>
                      <span className="text-[10px] text-slate-400">Tables, billing &amp; splits</span>
                    </div>
                  </Link>
                  <Link to="/recipes" className="flex items-center gap-3 p-2 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 text-xs transition-colors">
                    <div className="p-2 rounded-lg bg-emerald-500/10 text-emerald-600"><Utensils className="h-4 w-4" /></div>
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
              <div className="flex items-center gap-1 hover:text-emerald-600 dark:hover:text-emerald-400 transition-colors py-2">
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
                    <Globe className="h-4 w-4 text-emerald-500" />
                    <span>Digital Menu &amp; Web Store</span>
                  </Link>
                  <Link to="/inventory" className="flex items-center gap-2.5 p-2 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 text-xs text-slate-700 dark:text-slate-200">
                    <Flame className="h-4 w-4 text-emerald-500" />
                    <span>Cloud Kitchens &amp; QSR</span>
                  </Link>
                </div>
              )}
            </div>

            <a href="#pricing" className="hover:text-emerald-600 dark:hover:text-emerald-400 transition-colors">
              Pricing
            </a>

            {/* Resources Dropdown */}
            <div
              className="relative cursor-pointer group"
              onMouseEnter={() => setActiveDropdown("resources")}
              onMouseLeave={() => setActiveDropdown(null)}
            >
              <div className="flex items-center gap-1 hover:text-emerald-600 dark:hover:text-emerald-400 transition-colors py-2">
                <span>Resources</span>
                <ChevronDown className="h-3.5 w-3.5 opacity-70 group-hover:rotate-180 transition-transform" />
              </div>
              {activeDropdown === "resources" && (
                <div className="absolute top-full -left-4 w-52 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-xl p-2 space-y-1 animate-in fade-in zoom-in-95 duration-150 z-50">
                  <a href="#faq" className="flex items-center gap-2 p-2 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 text-xs text-slate-700 dark:text-slate-200">
                    <HelpCircle className="h-4 w-4 text-emerald-500" />
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
                <Button className="bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs px-5 h-9 rounded-full shadow-md shadow-emerald-600/25 flex items-center gap-1.5 transition-all">
                  <LayoutDashboard className="h-3.5 w-3.5" />
                  <span>Dashboard ({user?.first_name || "Staff"})</span>
                </Button>
              </Link>
            ) : (
              <div className="flex items-center gap-2.5">
                <Link to="/login">
                  <button
                    type="button"
                    className="border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 hover:border-emerald-500 dark:hover:border-emerald-500 font-medium text-xs h-9 px-5 rounded-full bg-white dark:bg-slate-900 hover:bg-slate-50 transition-all cursor-pointer"
                  >
                    Sign In
                  </button>
                </Link>

                <Link to="/register">
                  <button
                    type="button"
                    className="bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-xs h-9 px-5 rounded-full shadow-md shadow-emerald-600/30 hover:scale-105 active:scale-95 transition-all cursor-pointer"
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
            <Link
              to="/recipes"
              onClick={() => setIsMobileMenuOpen(false)}
              className="block py-2 text-sm font-semibold text-slate-700 dark:text-slate-200"
            >
              Recipe BOMs &amp; Costing
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
                <Button className="w-full bg-emerald-600 text-white rounded-full">Sign Up Free</Button>
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
            Intelligent Kitchen OS,
            <br />
            KDS,POS,Inventory
          </h1>

          {/* Hero Subtitle */}
          <p className="text-sm sm:text-base text-slate-600 dark:text-slate-400 max-w-xl mx-auto leading-relaxed">
            Supercharge your restaurant operations with real-time KDS line routing, fast POS billing, live recipe costing, and automated stock control 🍳
          </p>

          {/* Primary CTA Button (Vibrant Emerald Pill Button with smooth ambient glow) */}
          <div className="pt-3 flex justify-center">
            <Link to="/register">
              <button
                type="button"
                className="inline-flex items-center justify-center px-9 py-3.5 rounded-full bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-sm shadow-xl shadow-emerald-600/35 hover:shadow-emerald-600/50 hover:scale-105 active:scale-95 transition-all duration-200 cursor-pointer"
              >
                Try For Free
              </button>
            </Link>
          </div>

          {/* 3-Column Value Proposition Pillars with Left Border Accents */}
          <div className="pt-10 pb-4 grid grid-cols-1 md:grid-cols-3 gap-8 text-left max-w-4xl mx-auto">
            {/* Pillar 1 */}
            <div className="border-l-2 border-slate-900 dark:border-emerald-400 pl-4 space-y-1">
              <h3 className="text-xs font-bold text-slate-900 dark:text-white">
                Station KDS &amp; Line Routing
              </h3>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-relaxed">
                Real-time multi-station display screens (Grill, Sauté, Bar, Expo) with instant WebSocket ticket dispatch and countdown timers.
              </p>
            </div>

            {/* Pillar 2 */}
            <div className="border-l-2 border-slate-900 dark:border-emerald-400 pl-4 space-y-1">
              <h3 className="text-xs font-bold text-slate-900 dark:text-white">
                Smart POS &amp; QR Ordering
              </h3>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-relaxed">
                Lightning-fast dine-in table ordering, split payments, and contactless digital menus that fire tickets directly to prep stations.
              </p>
            </div>

            {/* Pillar 3 */}
            <div className="border-l-2 border-slate-900 dark:border-emerald-400 pl-4 space-y-1">
              <h3 className="text-xs font-bold text-slate-900 dark:text-white">
                Recipe BOMs &amp; Auto-Inventory
              </h3>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-relaxed">
                Automated ingredient deduction upon order fulfillment, real-time food cost margin tracking, and 3-way procurement.
              </p>
            </div>
          </div>
        </div>

        {/* Showcase Device Tablet Bezel Mockup with Flanking Green Hand-Drawn Sketches */}
        <div className="mt-14 relative max-w-5xl mx-auto">
          {/* Left Green Line-Art Sketch (Bakery & Pastry Storefront) */}
          <div className="hidden md:block absolute -left-20 sm:-left-28 lg:-left-44 bottom-0 w-48 sm:w-64 lg:w-80 pointer-events-none select-none z-0">
            <LeftHeroIllustration className="w-full h-auto drop-shadow-sm opacity-95 dark:opacity-80" />
          </div>

          {/* Right Green Line-Art Sketch (Cafe Awning / Dining Patio) */}
          <div className="hidden md:block absolute -right-20 sm:-right-28 lg:-right-44 bottom-0 w-48 sm:w-64 lg:w-80 pointer-events-none select-none z-0">
            <RightHeroIllustration className="w-full h-auto drop-shadow-sm opacity-95 dark:opacity-80" />
          </div>

          {/* Realistic Tablet Frame Container */}
          <div className="relative z-10 rounded-t-[36px] p-3 sm:p-4 bg-slate-900 shadow-2xl shadow-emerald-950/20 border-t-4 border-x-4 border-slate-800 pb-0">
            {/* Tablet Camera / Notch */}
            <div className="absolute top-1.5 left-1/2 -translate-x-1/2 w-16 h-2 bg-slate-800 rounded-full" />

            {/* Tablet Screen Interior */}
            <div className="bg-[#F8FAFC] dark:bg-slate-950 rounded-t-[24px] overflow-hidden border-t border-x border-slate-200 dark:border-slate-800 text-left">
              {/* Mockup Top Header: Live KDS Navigation Bar */}
              <div className="px-5 py-3.5 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                  <KitchenLogo size="xs" showText={true} />
                </div>

                {/* Station Filter Tabs */}
                <div className="flex items-center gap-1.5 bg-slate-100 dark:bg-slate-950 p-1 rounded-xl text-xs font-semibold">
                  {(["ALL", "GRILL", "SAUTE", "BAR", "EXPO"] as const).map((stn) => (
                    <button
                      key={stn}
                      type="button"
                      onClick={() => setMockStation(stn)}
                      className={`px-3 py-1 rounded-lg transition-all text-[11px] ${
                        mockStation === stn
                          ? "bg-white dark:bg-slate-800 text-emerald-700 dark:text-emerald-300 shadow-sm font-bold"
                          : "text-slate-500 hover:text-slate-900 dark:hover:text-slate-200"
                      }`}
                    >
                      {stn === "ALL" ? "All Lines" : stn === "GRILL" ? "🔥 Grill" : stn === "SAUTE" ? "🍳 Sauté" : stn === "BAR" ? "🍸 Bar" : "🛎️ Expo"}
                    </button>
                  ))}
                </div>

                {/* Live Stats */}
                <div className="flex items-center gap-3 text-xs font-mono">
                  <span className="text-[11px] text-slate-500 hidden sm:inline">
                    Active: <strong className="text-slate-900 dark:text-white font-bold">{mockTickets.filter(t => t.status !== "COMPLETED").length}</strong>
                  </span>
                  <span className="text-[11px] text-emerald-600 font-semibold flex items-center gap-1">
                    <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                    WS &lt;20ms
                  </span>
                </div>
              </div>

              {/* Mockup Body: Authentic KDS Ticket Grid */}
              <div className="p-5 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 min-h-[460px] pb-16 bg-slate-100/70 dark:bg-slate-950/70">
                {mockTickets
                  .filter((t) => mockStation === "ALL" || t.station === mockStation || (mockStation === "EXPO" && t.status === "READY"))
                  .map((ticket) => (
                    <div
                      key={ticket.id}
                      className="rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-4 flex flex-col justify-between shadow-md transition-all hover:border-emerald-300 dark:hover:border-emerald-800"
                    >
                      {/* Ticket Header */}
                      <div className="space-y-3">
                        <div className="flex items-start justify-between gap-2 pb-2.5 border-b border-slate-100 dark:border-slate-800">
                          <div>
                            <div className="text-sm font-black font-mono text-slate-900 dark:text-white tracking-wide">
                              {ticket.orderNumber}
                            </div>
                            <div className="text-xs font-bold text-emerald-700 dark:text-emerald-400">
                              {ticket.table} • {ticket.server}
                            </div>
                          </div>

                          <div className="flex flex-col items-end gap-1">
                            <span
                              className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                                ticket.status === "NEW"
                                  ? "bg-blue-100 text-blue-700 dark:bg-blue-950/80 dark:text-blue-300"
                                  : ticket.status === "PREPARING"
                                  ? "bg-amber-100 text-amber-700 dark:bg-amber-950/80 dark:text-amber-300 animate-pulse"
                                  : ticket.status === "READY"
                                  ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-950/80 dark:text-emerald-300"
                                  : "bg-slate-100 text-slate-500"
                              }`}
                            >
                              {ticket.status}
                            </span>
                            <span className="text-[10px] text-slate-400 font-mono flex items-center gap-0.5">
                              <Clock className="h-2.5 w-2.5" /> {ticket.elapsed}
                            </span>
                          </div>
                        </div>

                        {/* Order Items List with Modifiers */}
                        <div className="space-y-2 text-xs">
                          {ticket.items.map((item, idx) => (
                            <div key={idx} className="space-y-0.5 pb-1 border-b border-dashed border-slate-100 dark:border-slate-800/60 last:border-none">
                              <div className="flex items-center justify-between font-bold text-slate-900 dark:text-white">
                                <span className="flex items-center gap-1.5">
                                  <span className="px-1.5 py-0.2 bg-emerald-50 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300 rounded font-mono text-[10px]">
                                    {item.qty}x
                                  </span>
                                  {item.name}
                                </span>
                                <span className="text-[9px] px-1 rounded bg-slate-100 dark:bg-slate-800 text-slate-500 uppercase font-mono">
                                  {item.station}
                                </span>
                              </div>
                              {item.mod && (
                                <p className="text-[10px] text-amber-600 dark:text-amber-400 font-medium pl-6">
                                  ↳ {item.mod}
                                </p>
                              )}
                            </div>
                          ))}
                        </div>
                      </div>

                      {/* Ticket Action Button */}
                      <div className="pt-3 border-t border-slate-100 dark:border-slate-800">
                        <button
                          type="button"
                          onClick={() => handleAdvanceTicket(ticket.id)}
                          className={`w-full py-2 px-3 rounded-xl font-bold text-xs shadow-sm transition-all flex items-center justify-center gap-1.5 ${
                            ticket.status === "NEW"
                              ? "bg-emerald-600 hover:bg-emerald-700 text-white"
                              : ticket.status === "PREPARING"
                              ? "bg-amber-500 hover:bg-amber-600 text-white"
                              : ticket.status === "READY"
                              ? "bg-emerald-600 hover:bg-emerald-700 text-white"
                              : "bg-slate-100 dark:bg-slate-800 text-slate-400 cursor-default"
                          }`}
                        >
                          {ticket.status === "NEW" && "🔥 Start Preparation"}
                          {ticket.status === "PREPARING" && "🛎️ Mark Ready for Pass"}
                          {ticket.status === "READY" && "✅ Complete & Serve"}
                          {ticket.status === "COMPLETED" && "Served to Table"}
                        </button>
                      </div>
                    </div>
                  ))}
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
            Top restaurants trust Fluxiflow to deliver digital kitchen solutions that simplify operations, boost efficiency, and enhance food margin accuracy.
          </p>
        </div>

        {/* 3 Testimonial Cards */}
        <div className="mt-12 grid grid-cols-1 md:grid-cols-3 gap-6 text-left">
          {testimonials.map((t, idx) => (
            <div
              key={idx}
              className="p-6 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800/80 shadow-lg shadow-slate-200/30 dark:shadow-black/40 flex flex-col justify-between space-y-4 hover:border-emerald-300 dark:hover:border-emerald-800 transition-all group"
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

        {/* Partner Logos Infinite Moving Marquee */}
        <div className="mt-16 pt-10 border-t border-slate-100 dark:border-slate-800/80">
          <span className="text-xs font-bold text-slate-500 uppercase tracking-widest block mb-6">
            The world&apos;s leading culinary brands trust
          </span>

          {/* Infinite Marquee Container with Left/Right Gradient Fade Overlays */}
          <div className="relative w-full overflow-hidden py-3">
            {/* Left Fade Overlay */}
            <div className="absolute left-0 inset-y-0 w-24 bg-gradient-to-r from-white dark:from-slate-950 to-transparent z-10 pointer-events-none" />

            {/* Right Fade Overlay */}
            <div className="absolute right-0 inset-y-0 w-24 bg-gradient-to-l from-white dark:from-slate-950 to-transparent z-10 pointer-events-none" />

            {/* Moving Track */}
            <div className="animate-marquee flex items-center gap-12 sm:gap-16 select-none">
              {[...realBrandLogos, ...realBrandLogos, ...realBrandLogos].map((brand, idx) => (
                <div
                  key={idx}
                  className="flex items-center text-slate-400 dark:text-slate-500 hover:text-slate-800 dark:hover:text-white transition-all duration-300 group flex-shrink-0 cursor-default grayscale hover:grayscale-0 opacity-80 hover:opacity-100"
                >
                  <div className="group-hover:scale-105 transition-transform">
                    {brand.element}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Frequently Asked Questions Section (Signature Emerald & Teal Gradient Theme) */}
      <section id="faq" className="py-16 px-4 sm:px-6 lg:px-8 max-w-6xl mx-auto">
        <div className="rounded-[36px] bg-gradient-to-br from-emerald-600 via-teal-700 to-emerald-950 p-8 sm:p-12 lg:p-16 text-white shadow-2xl shadow-emerald-950/40 grid grid-cols-1 lg:grid-cols-12 gap-10">
          {/* Left Column */}
          <div className="lg:col-span-5 flex flex-col justify-between space-y-6">
            <div className="space-y-4">
              <div className="w-10 h-10 rounded-2xl bg-white/15 backdrop-blur-md flex items-center justify-center text-white border border-white/20">
                <HelpCircle className="h-5 w-5" />
              </div>

              <h2 className="text-3xl sm:text-4xl font-extrabold tracking-tight leading-tight">
                Frequently Asked<br />Questions
              </h2>

              <p className="text-xs sm:text-sm text-emerald-100/90 leading-relaxed max-w-sm">
                Get quick answers about multi-station KDS dispatch, recipe BOM costing, split billing, and inventory synchronization.
              </p>
            </div>

            <div>
              <a href="#faq">
                <button
                  type="button"
                  className="px-6 py-3 rounded-full bg-white/20 hover:bg-white/30 backdrop-blur-md text-white font-bold text-xs border border-white/30 shadow-sm transition-all cursor-pointer"
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
                    className="w-full p-4 sm:p-5 flex items-center justify-between text-left gap-4 font-bold text-xs sm:text-sm text-slate-900 hover:text-emerald-700 transition-colors"
                  >
                    <span>{faq.question}</span>
                    <ChevronDown
                      className={`h-4 w-4 text-slate-400 flex-shrink-0 transition-transform duration-200 ${
                        isOpen ? "rotate-180 text-emerald-600" : ""
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
                Fluxiflow Kitchen Suite. The next-generation operating system for high-velocity culinary teams and restaurants.
              </p>
              <span className="text-[11px] text-slate-400 block">
                Culinary Technology Hub, Restaurant Operations Suite
              </span>
            </div>

            {/* Platform Modules */}
            <div className="space-y-3 text-xs">
              <span className="font-bold text-slate-900 dark:text-white block">Modules</span>
              <ul className="space-y-2 text-slate-500 dark:text-slate-400">
                <li><Link to="/kitchen" className="hover:text-emerald-600">Kitchen Display (KDS)</Link></li>
                <li><Link to="/orders/pos" className="hover:text-emerald-600">POS Terminal</Link></li>
                <li><Link to="/recipes" className="hover:text-emerald-600">Recipe BOMs &amp; Costing</Link></li>
              </ul>
            </div>

            {/* Management */}
            <div className="space-y-3 text-xs">
              <span className="font-bold text-slate-900 dark:text-white block">Management</span>
              <ul className="space-y-2 text-slate-500 dark:text-slate-400">
                <li><Link to="/inventory" className="hover:text-emerald-600">Stock &amp; Inventory</Link></li>
                <li><Link to="/tables" className="hover:text-emerald-600">Table Floor Management</Link></li>
                <li><Link to="/reports" className="hover:text-emerald-600">Analytics &amp; Reports</Link></li>
              </ul>
            </div>

            {/* Solutions */}
            <div className="space-y-3 text-xs">
              <span className="font-bold text-slate-900 dark:text-white block">Solutions</span>
              <ul className="space-y-2 text-slate-500 dark:text-slate-400">
                <li><Link to="/menu" className="hover:text-emerald-600">Digital QR Menu</Link></li>
                <li><Link to="/procurement" className="hover:text-emerald-600">3-Way Procurement</Link></li>
                <li><a href="#faq" className="hover:text-emerald-600">FAQ &amp; Help</a></li>
              </ul>
            </div>
          </div>

          {/* Bottom Copyright & Socials */}
          <div className="pt-8 border-t border-slate-100 dark:border-slate-800/80 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-slate-400">
            <span>&copy; {new Date().getFullYear()} Fluxiflow for Kitchen. All rights reserved.</span>

            {/* Social Icons */}
            <div className="flex items-center gap-4 text-slate-500 dark:text-slate-400">
              <a href="#" aria-label="Instagram" className="hover:text-emerald-600 transition-colors">
                <span className="w-7 h-7 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-xs font-bold">IG</span>
              </a>
              <a href="#" aria-label="Facebook" className="hover:text-emerald-600 transition-colors">
                <span className="w-7 h-7 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-xs font-bold">FB</span>
              </a>
              <a href="#" aria-label="TikTok" className="hover:text-emerald-600 transition-colors">
                <span className="w-7 h-7 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-xs font-bold">TT</span>
              </a>
              <a href="#" aria-label="X" className="hover:text-emerald-600 transition-colors">
                <span className="w-7 h-7 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-xs font-bold">𝕏</span>
              </a>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
};
