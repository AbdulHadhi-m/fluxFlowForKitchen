import React, { useState } from "react";
import { Link } from "react-router-dom";
import { useAuthStore } from "@/features/auth/store/authStore";
import { ThemeToggle } from "@/components/common/ThemeToggle";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Sparkles,
  ChefHat,
  ShoppingBag,
  Layers,
  ArrowRight,
  CheckCircle2,
  Clock,
  Boxes,
  Receipt,
  Users,
  ChevronRight,
  Flame,
  LayoutDashboard,
  Utensils,
  CreditCard,
  BarChart3,
} from "lucide-react";

export const LandingHomePage: React.FC = () => {
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  const user = useAuthStore((state) => state.user);

  // Interactive Live KDS station simulator state
  const [activeStation, setActiveStation] = useState<"ALL" | "GRILL" | "SAUTE" | "BAR">("ALL");
  const [simulatedTickets, setSimulatedTickets] = useState([
    {
      id: "T-101",
      table: "Table 04",
      server: "Gordon R.",
      elapsed: "3m 42s",
      status: "PREPARING",
      station: "GRILL",
      items: [
        { name: "Prime Ribeye Steak", qty: 2, mod: "Medium Rare, Garlic Herb Butter" },
        { name: "Truffle Parmesan Fries", qty: 1, mod: "Extra Crispy" },
      ],
    },
    {
      id: "T-102",
      table: "Table 12",
      server: "Lucas S.",
      elapsed: "8m 15s",
      status: "READY",
      station: "SAUTE",
      items: [
        { name: "Wild Mushroom Risotto", qty: 1, mod: "Gluten Free" },
        { name: "Pan-Seared Sea Bass", qty: 1, mod: "Lemon Caper Glaze" },
      ],
    },
    {
      id: "T-103",
      table: "Bar 02",
      server: "Chloe B.",
      elapsed: "1m 10s",
      status: "NEW",
      station: "BAR",
      items: [
        { name: "Smoked Rosemary Old Fashioned", qty: 2, mod: "Large Ice Sphere" },
        { name: "Crispy Calamari", qty: 1, mod: "Spicy Aioli" },
      ],
    },
  ]);

  const handleBumpTicket = (id: string) => {
    setSimulatedTickets((prev) =>
      prev.map((t) => {
        if (t.id === id) {
          const nextStatus =
            t.status === "NEW" ? "PREPARING" : t.status === "PREPARING" ? "READY" : "COMPLETED";
          return { ...t, status: nextStatus };
        }
        return t;
      })
    );
  };

  const filteredTickets = simulatedTickets.filter(
    (t) => activeStation === "ALL" || t.station === activeStation
  );

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 selection:bg-emerald-500/30 transition-colors duration-200 overflow-x-hidden">
      {/* Dynamic Ambient Background Mesh */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        <div className="bg-grid absolute inset-0 opacity-40 dark:opacity-20" />
        <div className="absolute -top-40 left-1/2 -translate-x-1/2 w-[800px] h-[500px] bg-gradient-to-b from-emerald-500/20 via-teal-500/15 to-transparent blur-[140px] rounded-full" />
        <div className="absolute top-[800px] -left-40 w-[600px] h-[600px] bg-teal-500/10 dark:bg-teal-500/5 blur-[160px] rounded-full" />
        <div className="absolute top-[1600px] -right-40 w-[600px] h-[600px] bg-emerald-600/10 dark:bg-emerald-600/5 blur-[160px] rounded-full" />
      </div>

      {/* Top Navigation Bar */}
      <header className="sticky top-0 z-50 w-full bg-white/80 dark:bg-slate-950/80 backdrop-blur-xl border-b border-slate-200/80 dark:border-slate-800/80 transition-colors">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between gap-4">
          {/* Brand Logo */}
          <Link to="/" className="flex items-center gap-2.5 group">
            <div className="h-9 w-9 rounded-xl bg-gradient-to-tr from-emerald-600 via-emerald-500 to-teal-500 flex items-center justify-center text-white shadow-md shadow-emerald-600/30 ring-1 ring-white/20 group-hover:scale-105 transition-transform">
              <Sparkles className="h-4 w-4" />
            </div>
            <div>
              <span className="text-base font-black tracking-tight text-slate-900 dark:text-white leading-none block">
                Fluxiflow
              </span>
              <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-bold uppercase tracking-wider">
                Kitchen Suite
              </span>
            </div>
          </Link>

          {/* Desktop Nav Links */}
          <nav className="hidden md:flex items-center gap-7 text-xs font-semibold text-slate-600 dark:text-slate-300">
            <a href="#features" className="hover:text-emerald-600 dark:hover:text-emerald-400 transition-colors">
              Platform Features
            </a>
            <a href="#kds-demo" className="hover:text-emerald-600 dark:hover:text-emerald-400 transition-colors flex items-center gap-1.5">
              <span>Live KDS Preview</span>
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
            </a>
            <a href="#modules" className="hover:text-emerald-600 dark:hover:text-emerald-400 transition-colors">
              Modules
            </a>
            <a href="#pricing" className="hover:text-emerald-600 dark:hover:text-emerald-400 transition-colors">
              Pricing
            </a>
            <a href="#security" className="hover:text-emerald-600 dark:hover:text-emerald-400 transition-colors">
              Enterprise Security
            </a>
          </nav>

          {/* Right Actions & Theme Toggle */}
          <div className="flex items-center gap-3">
            <ThemeToggle />

            {isAuthenticated ? (
              <Link to="/dashboard">
                <Button className="bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold px-4 h-9 rounded-xl shadow-md shadow-emerald-600/20 flex items-center gap-1.5">
                  <LayoutDashboard className="h-3.5 w-3.5" />
                  <span>Dashboard ({user?.first_name || "Staff"})</span>
                </Button>
              </Link>
            ) : (
              <div className="flex items-center gap-2">
                <Link to="/login">
                  <Button
                    variant="ghost"
                    className="text-xs font-semibold text-slate-700 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 h-9 px-3.5 rounded-xl"
                  >
                    Sign In
                  </Button>
                </Link>
                <Link to="/register">
                  <Button className="bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white text-xs font-semibold px-4 h-9 rounded-xl shadow-md shadow-emerald-600/25 transition-all">
                    Register Kitchen
                  </Button>
                </Link>
              </div>
            )}
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="relative z-10 pt-12 sm:pt-20 pb-16 sm:pb-24 px-4 sm:px-6 max-w-7xl mx-auto text-center">
        <div className="max-w-4xl mx-auto space-y-6">
          {/* Pill Announcement */}
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-emerald-500/10 dark:bg-emerald-500/15 border border-emerald-500/30 text-emerald-700 dark:text-emerald-300 text-xs font-semibold shadow-sm animate-in fade-in slide-in-from-top-2 duration-300">
            <Flame className="h-3.5 w-3.5 text-emerald-500" />
            <span>Fluxiflow for Kitchen v2.4 • Next-Gen Kitchen Display OS</span>
            <span className="hidden sm:inline text-emerald-600/40 dark:text-emerald-400/40">|</span>
            <span className="hidden sm:inline text-[11px] font-mono text-emerald-600 dark:text-emerald-400">
              WebSocket Latency &lt; 30ms
            </span>
          </div>

          {/* Hero Headline */}
          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-black tracking-tight text-slate-900 dark:text-white leading-[1.12]">
            The intelligent operating system for{" "}
            <span className="bg-gradient-to-r from-emerald-600 via-emerald-500 to-teal-500 bg-clip-text text-transparent">
              high-speed restaurant kitchens.
            </span>
          </h1>

          {/* Subtitle */}
          <p className="text-base sm:text-lg text-slate-600 dark:text-slate-400 max-w-2xl mx-auto leading-relaxed">
            Eliminate paper tickets, reduce meal prep times, track real-time food recipe margins, and unify POS, table floor, and procurement into one unified kitchen display suite.
          </p>

          {/* Hero CTA Buttons */}
          <div className="pt-2 flex flex-col sm:flex-row items-center justify-center gap-3.5">
            <Link to="/register" className="w-full sm:w-auto">
              <Button className="w-full sm:w-auto h-12 px-7 bg-gradient-to-r from-emerald-600 via-emerald-500 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-bold text-sm rounded-2xl shadow-xl shadow-emerald-600/30 hover:scale-[1.02] active:scale-[0.98] transition-all flex items-center justify-center gap-2">
                <span>Start Free Kitchen Terminal</span>
                <ArrowRight className="h-4 w-4" />
              </Button>
            </Link>

            <Link to="/kitchen" className="w-full sm:w-auto">
              <Button
                variant="outline"
                className="w-full sm:w-auto h-12 px-6 bg-white/80 dark:bg-slate-900/80 border-slate-200 dark:border-slate-800 text-slate-800 dark:text-slate-200 font-semibold text-sm rounded-2xl hover:bg-slate-100 dark:hover:bg-slate-800 shadow-sm backdrop-blur-md flex items-center justify-center gap-2"
              >
                <ChefHat className="h-4 w-4 text-emerald-500" />
                <span>Open Live KDS Screen</span>
              </Button>
            </Link>

            <Link to="/login" className="w-full sm:w-auto">
              <Button
                variant="ghost"
                className="w-full sm:w-auto h-12 px-5 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white text-xs font-semibold rounded-2xl"
              >
                Staff Login &rarr;
              </Button>
            </Link>
          </div>

          {/* Social Proof Stats Banner */}
          <div className="pt-8 grid grid-cols-2 md:grid-cols-4 gap-4 max-w-3xl mx-auto border-t border-slate-200/60 dark:border-slate-800/60 text-left">
            <div className="space-y-0.5">
              <div className="text-2xl font-black text-slate-900 dark:text-white">99.99%</div>
              <div className="text-xs text-slate-500 dark:text-slate-400">Operational Uptime</div>
            </div>
            <div className="space-y-0.5">
              <div className="text-2xl font-black text-emerald-600 dark:text-emerald-400">&lt; 35ms</div>
              <div className="text-xs text-slate-500 dark:text-slate-400">WebSocket Ticket Sync</div>
            </div>
            <div className="space-y-0.5">
              <div className="text-2xl font-black text-slate-900 dark:text-white">100%</div>
              <div className="text-xs text-slate-500 dark:text-slate-400">Multi-Tenant RBAC</div>
            </div>
            <div className="space-y-0.5">
              <div className="text-2xl font-black text-teal-600 dark:text-teal-400">256-Bit</div>
              <div className="text-xs text-slate-500 dark:text-slate-400">Encrypted Enterprise Auth</div>
            </div>
          </div>
        </div>
      </section>

      {/* Interactive KDS Simulator Section */}
      <section id="kds-demo" className="relative z-10 py-12 px-4 sm:px-6 max-w-7xl mx-auto">
        <div className="rounded-3xl border border-slate-200/80 dark:border-slate-800/80 bg-white/80 dark:bg-slate-900/80 backdrop-blur-2xl p-6 sm:p-8 shadow-2xl shadow-emerald-950/15 space-y-6">
          {/* Simulator Header */}
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-100 dark:border-slate-800 pb-5">
            <div>
              <div className="flex items-center gap-2">
                <Badge className="bg-emerald-500 text-white text-[10px] uppercase font-bold tracking-wider">
                  Interactive Showcase
                </Badge>
                <span className="text-xs text-slate-400 font-mono">Live WebSocket Ticket Dispatch</span>
              </div>
              <h2 className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-white mt-1">
                Experience Kitchen Ticket Firing in Action
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Click any ticket action button below to test live status progression (NEW &rarr; PREPARING &rarr; READY &rarr; COMPLETED).
              </p>
            </div>

            {/* Station Filter Tabs */}
            <div className="flex items-center gap-1.5 p-1 rounded-2xl bg-slate-100 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700/60 self-start md:self-auto">
              {(["ALL", "GRILL", "SAUTE", "BAR"] as const).map((station) => (
                <button
                  key={station}
                  onClick={() => setActiveStation(station)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all ${
                    activeStation === station
                      ? "bg-white dark:bg-slate-900 text-emerald-600 dark:text-emerald-400 shadow-sm"
                      : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
                  }`}
                >
                  {station} Station
                </button>
              ))}
            </div>
          </div>

          {/* Ticket Grid Simulator */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {filteredTickets.map((ticket) => {
              const statusColor =
                ticket.status === "NEW"
                  ? "bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/30"
                  : ticket.status === "PREPARING"
                  ? "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/30"
                  : ticket.status === "READY"
                  ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/30"
                  : "bg-slate-500/10 text-slate-500 border-slate-500/30";

              return (
                <div
                  key={ticket.id}
                  className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950/70 p-4 space-y-3.5 shadow-sm hover:border-emerald-500/40 transition-colors"
                >
                  {/* Card Header */}
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="font-black text-sm text-slate-900 dark:text-white flex items-center gap-2">
                        <span>{ticket.id}</span>
                        <span className="text-xs font-semibold text-slate-500">{ticket.table}</span>
                      </div>
                      <div className="text-[10px] text-slate-400">Server: {ticket.server}</div>
                    </div>
                    <div className="text-right">
                      <span className={`px-2 py-0.5 rounded-md text-[10px] font-bold border ${statusColor}`}>
                        {ticket.status}
                      </span>
                      <div className="text-[10px] text-slate-400 flex items-center gap-1 justify-end mt-1">
                        <Clock className="h-3 w-3" />
                        <span>{ticket.elapsed}</span>
                      </div>
                    </div>
                  </div>

                  {/* Items List */}
                  <div className="space-y-2 border-t border-slate-100 dark:border-slate-800/80 pt-2.5">
                    {ticket.items.map((item, idx) => (
                      <div key={idx} className="text-xs">
                        <div className="flex items-center justify-between font-semibold text-slate-800 dark:text-slate-200">
                          <span>{item.name}</span>
                          <span className="font-mono text-emerald-600 dark:text-emerald-400">x{item.qty}</span>
                        </div>
                        {item.mod && (
                          <div className="text-[11px] text-amber-600 dark:text-amber-400 italic">
                            &bull; {item.mod}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>

                  {/* Action Bump Button */}
                  <div className="pt-2 border-t border-slate-100 dark:border-slate-800">
                    <Button
                      onClick={() => handleBumpTicket(ticket.id)}
                      className={`w-full text-xs font-semibold py-1.5 h-8 rounded-xl transition-all ${
                        ticket.status === "NEW"
                          ? "bg-amber-600 hover:bg-amber-500 text-white"
                          : ticket.status === "PREPARING"
                          ? "bg-emerald-600 hover:bg-emerald-500 text-white"
                          : "bg-slate-800 hover:bg-slate-700 text-slate-200"
                      }`}
                    >
                      {ticket.status === "NEW" && "Start Preparation →"}
                      {ticket.status === "PREPARING" && "Mark Ready for Expeditor →"}
                      {ticket.status === "READY" && "Complete & Serve ✓"}
                      {ticket.status === "COMPLETED" && "Reset Ticket ↺"}
                    </Button>
                  </div>
                </div>
              );
            })}
          </div>

          <div className="text-center pt-2">
            <Link
              to="/kitchen"
              className="inline-flex items-center gap-1.5 text-xs font-bold text-emerald-600 dark:text-emerald-400 hover:underline"
            >
              <span>Launch Full Kitchen Workstation Terminal (KDS)</span>
              <ChevronRight className="h-3.5 w-3.5" />
            </Link>
          </div>
        </div>
      </section>

      {/* Core Features Bento Grid */}
      <section id="features" className="relative z-10 py-16 px-4 sm:px-6 max-w-7xl mx-auto space-y-12">
        <div className="text-center space-y-3 max-w-2xl mx-auto">
          <Badge className="bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/30">
            End-to-End Kitchen OS
          </Badge>
          <h2 className="text-3xl sm:text-4xl font-black tracking-tight text-slate-900 dark:text-white">
            Built for the fastest culinary workflows
          </h2>
          <p className="text-sm text-slate-600 dark:text-slate-400">
            Everything your kitchen, floor staff, and back-office management need to operate seamlessly.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Card 1: KDS Station Routing */}
          <div className="p-6 rounded-3xl bg-white/70 dark:bg-slate-900/60 border border-slate-200/80 dark:border-slate-800/80 backdrop-blur-xl shadow-lg shadow-emerald-950/5 space-y-4 hover:border-emerald-500/50 transition-all">
            <div className="h-12 w-12 rounded-2xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
              <ChefHat className="h-6 w-6" />
            </div>
            <h3 className="text-lg font-bold text-slate-900 dark:text-white">
              Multi-Station Kitchen Routing
            </h3>
            <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
              Dynamically route items to specific kitchen stations (Grill, Saute, Fry, Salad, Bar) with sub-second WebSocket synchronization.
            </p>
            <div className="flex items-center gap-2 text-xs font-semibold text-emerald-600 dark:text-emerald-400">
              <span>Station Filters &amp; Sound Alerts</span>
              <ArrowRight className="h-3.5 w-3.5" />
            </div>
          </div>

          {/* Card 2: POS & Table Floor */}
          <div className="p-6 rounded-3xl bg-white/70 dark:bg-slate-900/60 border border-slate-200/80 dark:border-slate-800/80 backdrop-blur-xl shadow-lg shadow-emerald-950/5 space-y-4 hover:border-emerald-500/50 transition-all">
            <div className="h-12 w-12 rounded-2xl bg-teal-500/10 text-teal-600 dark:text-teal-400 flex items-center justify-center">
              <ShoppingBag className="h-6 w-6" />
            </div>
            <h3 className="text-lg font-bold text-slate-900 dark:text-white">
              POS Terminal &amp; Table Floor Plan
            </h3>
            <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
              Interactive graphic table layout with occupancy status, instant item modifiers, bill splitting, and customer QR ordering.
            </p>
            <div className="flex items-center gap-2 text-xs font-semibold text-teal-600 dark:text-teal-400">
              <span>Visual Floor Plan &amp; Quick Orders</span>
              <ArrowRight className="h-3.5 w-3.5" />
            </div>
          </div>

          {/* Card 3: Recipe BOM & Food Costing */}
          <div className="p-6 rounded-3xl bg-white/70 dark:bg-slate-900/60 border border-slate-200/80 dark:border-slate-800/80 backdrop-blur-xl shadow-lg shadow-emerald-950/5 space-y-4 hover:border-emerald-500/50 transition-all">
            <div className="h-12 w-12 rounded-2xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
              <Boxes className="h-6 w-6" />
            </div>
            <h3 className="text-lg font-bold text-slate-900 dark:text-white">
              Inventory &amp; Recipe Food Costing
            </h3>
            <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
              Auto-deduct raw ingredients on ticket completion. Real-time food cost percentage calculation and automated par-level reorder alerts.
            </p>
            <div className="flex items-center gap-2 text-xs font-semibold text-emerald-600 dark:text-emerald-400">
              <span>Recipe Bill of Materials (BOM)</span>
              <ArrowRight className="h-3.5 w-3.5" />
            </div>
          </div>

          {/* Card 4: Procurement & 3-Way Match */}
          <div className="p-6 rounded-3xl bg-white/70 dark:bg-slate-900/60 border border-slate-200/80 dark:border-slate-800/80 backdrop-blur-xl shadow-lg shadow-emerald-950/5 space-y-4 hover:border-emerald-500/50 transition-all">
            <div className="h-12 w-12 rounded-2xl bg-teal-500/10 text-teal-600 dark:text-teal-400 flex items-center justify-center">
              <Receipt className="h-6 w-6" />
            </div>
            <h3 className="text-lg font-bold text-slate-900 dark:text-white">
              Procurement &amp; Invoice Matching
            </h3>
            <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
              Purchase orders, receiving inspection discrepancy checks, and automated 3-way matching with accounting journals.
            </p>
            <div className="flex items-center gap-2 text-xs font-semibold text-teal-600 dark:text-teal-400">
              <span>Automated Supplier POs</span>
              <ArrowRight className="h-3.5 w-3.5" />
            </div>
          </div>

          {/* Card 5: Multi-Role RBAC */}
          <div className="p-6 rounded-3xl bg-white/70 dark:bg-slate-900/60 border border-slate-200/80 dark:border-slate-800/80 backdrop-blur-xl shadow-lg shadow-emerald-950/5 space-y-4 hover:border-emerald-500/50 transition-all">
            <div className="h-12 w-12 rounded-2xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
              <Users className="h-6 w-6" />
            </div>
            <h3 className="text-lg font-bold text-slate-900 dark:text-white">
              Fine-Grained Role Workstations
            </h3>
            <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
              Custom terminal views tailored for Executive Chefs, Line Cooks, Cashiers, Waitstaff, Inventory Managers, and Franchise Owners.
            </p>
            <div className="flex items-center gap-2 text-xs font-semibold text-emerald-600 dark:text-emerald-400">
              <span>Role Switching &amp; Permissions</span>
              <ArrowRight className="h-3.5 w-3.5" />
            </div>
          </div>

          {/* Card 6: Live Analytics & Financials */}
          <div className="p-6 rounded-3xl bg-white/70 dark:bg-slate-900/60 border border-slate-200/80 dark:border-slate-800/80 backdrop-blur-xl shadow-lg shadow-emerald-950/5 space-y-4 hover:border-emerald-500/50 transition-all">
            <div className="h-12 w-12 rounded-2xl bg-teal-500/10 text-teal-600 dark:text-teal-400 flex items-center justify-center">
              <BarChart3 className="h-6 w-6" />
            </div>
            <h3 className="text-lg font-bold text-slate-900 dark:text-white">
              Financial General Ledger &amp; P&amp;L
            </h3>
            <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
              Double-entry accounting, real-time Profit &amp; Loss statements, cash drawer sessions, and multi-period financial closing.
            </p>
            <div className="flex items-center gap-2 text-xs font-semibold text-teal-600 dark:text-teal-400">
              <span>Full Audit Trail &amp; Balances</span>
              <ArrowRight className="h-3.5 w-3.5" />
            </div>
          </div>
        </div>
      </section>

      {/* Module Overview Quick Links */}
      <section id="modules" className="relative z-10 py-12 px-4 sm:px-6 max-w-7xl mx-auto border-t border-slate-200/60 dark:border-slate-800/60">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
          <div>
            <h3 className="text-xl font-bold text-slate-900 dark:text-white">Platform Workstation Modules</h3>
            <p className="text-xs text-slate-500 dark:text-slate-400">Jump directly into any operational workstation</p>
          </div>
          <Link to="/register">
            <Button className="bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold rounded-xl h-9">
              Setup My Restaurant
            </Button>
          </Link>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
          {[
            { label: "Kitchen KDS", icon: ChefHat, path: "/kitchen" },
            { label: "POS Terminal", icon: ShoppingBag, path: "/orders/pos" },
            { label: "Table Floor", icon: Layers, path: "/tables" },
            { label: "Menu Catalog", icon: Utensils, path: "/menu" },
            { label: "Inventory Stock", icon: Boxes, path: "/inventory" },
            { label: "Financial Ledger", icon: CreditCard, path: "/finance" },
          ].map((item) => {
            const Icon = item.icon;
            return (
              <Link
                key={item.label}
                to={item.path}
                className="p-3.5 rounded-2xl bg-white/60 dark:bg-slate-900/60 border border-slate-200/80 dark:border-slate-800/80 hover:border-emerald-500/50 hover:bg-emerald-50/50 dark:hover:bg-slate-800/80 transition-all flex flex-col items-center justify-center text-center gap-2 group"
              >
                <div className="h-8 w-8 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center group-hover:scale-110 transition-transform">
                  <Icon className="h-4 w-4" />
                </div>
                <span className="text-xs font-bold text-slate-800 dark:text-slate-200">{item.label}</span>
              </Link>
            );
          })}
        </div>
      </section>

      {/* Pricing Section */}
      <section id="pricing" className="relative z-10 py-16 px-4 sm:px-6 max-w-7xl mx-auto space-y-12">
        <div className="text-center space-y-3 max-w-2xl mx-auto">
          <Badge className="bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/30">
            Transparent Pricing
          </Badge>
          <h2 className="text-3xl sm:text-4xl font-black tracking-tight text-slate-900 dark:text-white">
            Plans for every kitchen scale
          </h2>
          <p className="text-sm text-slate-600 dark:text-slate-400">
            No per-ticket fees. Unlimited orders. Instant multi-station deployment.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-5xl mx-auto">
          {/* Starter Plan */}
          <div className="p-6 rounded-3xl bg-white/70 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 backdrop-blur-xl shadow-md space-y-6 flex flex-col justify-between">
            <div className="space-y-4">
              <div>
                <h3 className="text-lg font-bold text-slate-900 dark:text-white">Starter Kitchen</h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">Ideal for single-station cafes &amp; popups</p>
              </div>
              <div className="text-3xl font-black text-slate-900 dark:text-white">
                ₹1,999<span className="text-xs font-normal text-slate-500"> / month</span>
              </div>
              <ul className="space-y-2.5 text-xs text-slate-600 dark:text-slate-300">
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 text-emerald-500 shrink-0" />
                  <span>1 Live KDS Screen Terminal</span>
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 text-emerald-500 shrink-0" />
                  <span>POS Terminal &amp; Table Floor</span>
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 text-emerald-500 shrink-0" />
                  <span>Essential Inventory Stock</span>
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 text-emerald-500 shrink-0" />
                  <span>Up to 5 Staff Logins</span>
                </li>
              </ul>
            </div>
            <Link to="/register">
              <Button variant="outline" className="w-full text-xs font-semibold h-10 rounded-xl">
                Get Started
              </Button>
            </Link>
          </div>

          {/* Growth Bistro (Featured) */}
          <div className="p-6 rounded-3xl bg-gradient-to-b from-emerald-500/10 to-teal-500/5 dark:from-emerald-950/40 dark:to-teal-950/20 border-2 border-emerald-500 dark:border-emerald-500/80 backdrop-blur-xl shadow-xl shadow-emerald-600/15 space-y-6 flex flex-col justify-between relative">
            <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-0.5 rounded-full bg-emerald-600 text-white text-[10px] font-black uppercase tracking-wider shadow-sm">
              Most Popular
            </div>
            <div className="space-y-4">
              <div>
                <h3 className="text-lg font-bold text-slate-900 dark:text-white">Growth Bistro</h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">For busy dining restaurants &amp; bars</p>
              </div>
              <div className="text-3xl font-black text-slate-900 dark:text-white">
                ₹4,999<span className="text-xs font-normal text-slate-500"> / month</span>
              </div>
              <ul className="space-y-2.5 text-xs text-slate-700 dark:text-slate-200">
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 text-emerald-500 shrink-0" />
                  <span>Unlimited KDS Station Routing</span>
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 text-emerald-500 shrink-0" />
                  <span>Recipe BOM &amp; Live Food Costing</span>
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 text-emerald-500 shrink-0" />
                  <span>Customer QR Table Ordering &amp; Menu</span>
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 text-emerald-500 shrink-0" />
                  <span>Procurement &amp; Supplier Auto POs</span>
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 text-emerald-500 shrink-0" />
                  <span>Full Financial Ledger &amp; Cash Drawers</span>
                </li>
              </ul>
            </div>
            <Link to="/register">
              <Button className="w-full bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold h-10 rounded-xl shadow-md shadow-emerald-600/20">
                Start 14-Day Free Trial
              </Button>
            </Link>
          </div>

          {/* Franchise Enterprise */}
          <div className="p-6 rounded-3xl bg-white/70 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 backdrop-blur-xl shadow-md space-y-6 flex flex-col justify-between">
            <div className="space-y-4">
              <div>
                <h3 className="text-lg font-bold text-slate-900 dark:text-white">Franchise &amp; Multi-Outlet</h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">Multi-location enterprise groups</p>
              </div>
              <div className="text-3xl font-black text-slate-900 dark:text-white">
                ₹9,999<span className="text-xs font-normal text-slate-500"> / month</span>
              </div>
              <ul className="space-y-2.5 text-xs text-slate-600 dark:text-slate-300">
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 text-emerald-500 shrink-0" />
                  <span>Multi-Tenant Enterprise Isolation</span>
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 text-emerald-500 shrink-0" />
                  <span>Centralized Commissary &amp; Transfers</span>
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 text-emerald-500 shrink-0" />
                  <span>Granular Multi-Role RBAC &amp; MFA</span>
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 text-emerald-500 shrink-0" />
                  <span>Dedicated Account Manager &amp; 99.99% SLA</span>
                </li>
              </ul>
            </div>
            <Link to="/register">
              <Button variant="outline" className="w-full text-xs font-semibold h-10 rounded-xl">
                Contact Enterprise Sales
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* Ready CTA Section */}
      <section className="relative z-10 py-16 px-4 sm:px-6 max-w-7xl mx-auto">
        <div className="rounded-3xl bg-gradient-to-r from-emerald-600 via-emerald-500 to-teal-600 p-8 sm:p-12 text-white text-center space-y-6 shadow-2xl shadow-emerald-600/30">
          <div className="max-w-2xl mx-auto space-y-3">
            <h2 className="text-3xl sm:text-4xl font-black tracking-tight">
              Ready to modernize your kitchen line?
            </h2>
            <p className="text-emerald-100 text-sm leading-relaxed">
              Join culinary teams worldwide running on Fluxiflow. Zero hardware lock-in — runs on any tablet, iPad, or touchscreen display.
            </p>
          </div>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
            <Link to="/register" className="w-full sm:w-auto">
              <Button className="w-full sm:w-auto h-11 px-7 bg-white hover:bg-slate-100 text-emerald-800 font-bold text-xs rounded-xl shadow-lg">
                Create Free Restaurant Account
              </Button>
            </Link>
            <Link to="/login" className="w-full sm:w-auto">
              <Button
                variant="outline"
                className="w-full sm:w-auto h-11 px-6 bg-transparent border-white/40 text-white hover:bg-white/10 text-xs font-semibold rounded-xl"
              >
                Sign In to Existing Terminal
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="relative z-10 w-full border-t border-slate-200/80 dark:border-slate-800/80 bg-white/40 dark:bg-slate-950/40 backdrop-blur-md">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-10 flex flex-col md:flex-row items-center justify-between gap-6 text-xs text-slate-500 dark:text-slate-400">
          <div className="flex items-center gap-3">
            <div className="h-7 w-7 rounded-xl bg-gradient-to-tr from-emerald-600 to-teal-500 flex items-center justify-center text-white">
              <Sparkles className="h-3.5 w-3.5" />
            </div>
            <span className="font-bold text-slate-800 dark:text-slate-200">Fluxiflow Kitchen Suite</span>
            <span>&copy; {new Date().getFullYear()} All rights reserved.</span>
          </div>

          <div className="flex items-center gap-6">
            <Link to="/kitchen" className="hover:text-emerald-600 dark:hover:text-emerald-400">
              Kitchen Display (KDS)
            </Link>
            <Link to="/orders/pos" className="hover:text-emerald-600 dark:hover:text-emerald-400">
              POS Terminal
            </Link>
            <Link to="/login" className="hover:text-emerald-600 dark:hover:text-emerald-400">
              Sign In
            </Link>
            <Link to="/register" className="hover:text-emerald-600 dark:hover:text-emerald-400">
              Register
            </Link>
          </div>
        </div>
      </footer>
    </div>
  );
};
