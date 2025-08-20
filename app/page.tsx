"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import Image from "next/image"
import { motion } from "framer-motion"
import {
  Check,
  ChevronRight,
  Menu,
  X,
  ArrowRight,
  Star,
  Zap,
  Shield,
  Users,
  BarChart,
  Layers,
  Search,
  Bell,
  Smartphone,
  MessageSquare,
  Phone,
  Eye,
  CheckCircle,
  Edit,
  Trash2,
  XCircle,
  Home as HomeIcon,
  Grid3X3,
  HelpCircle,
  Workflow,
  Settings,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import FeatureCard from "@/components/ui/FeatureCard"
import { useTheme } from "next-themes"
import { WalletConnectButton } from "../components/WalletConnectButton"
import { useWallet } from "@/contexts/WalletContext"
import LightRays from "@/components/ui/LightRays"

export default function Home() {
  const [isScrolled, setIsScrolled] = useState(false)
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const [isMenuOpen, setIsMenuOpen] = useState(false)
  
  const { isWalletConnected, walletAddress } = useWallet()

  const { theme, setTheme } = useTheme()
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
    const handleScroll = () => {
      if (window.scrollY > 10) {
        setIsScrolled(true)
      } else {
        setIsScrolled(false)
      }
    }

    window.addEventListener("scroll", handleScroll)
    return () => window.removeEventListener("scroll", handleScroll)
  }, [])

  const toggleTheme = () => {
    setTheme(theme === "dark" ? "light" : "dark")
  }

  const container = {
    hidden: { opacity: 0 },
    show: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1,
      },
    },
  }

  const item = {
    hidden: { opacity: 0, y: 20 },
    show: { opacity: 1, y: 0 },
  }

  const features = [
    {
      title: "Wallet-Based Security",
      description:
        "Connect your Solana wallet to securely store alerts on-chain and verify ownership without passwords.",
      icon: <Zap className="size-6" />,
    },
    {
      title: "Phone Verification",
      description: "Verify your phone number to enable SMS and phone call alerts that keep you connected 24/7.",
      icon: <Smartphone className="size-6" />,
    },
    {
      title: "Customizable Alerts",
      description: "Set thresholds for marketcap, volume, and % gain — toggle metrics on or off to fit your strategy.",
      icon: <Bell className="size-6" />,
    },
    {
      title: "Multi-Channel Notifications",
      description: "Choose how you want to be notified: PWA push alerts, SMS, or even a phone call that wakes you up.",
      icon: <MessageSquare className="size-6" />,
    },
    {
      title: "Real-Time Monitoring",
      description:
        "MemeAlert continuously tracks token data from Solana DEXs and oracles like Pyth, ensuring accurate and instant alerts.",
      icon: <BarChart className="size-6" />,
    },
    {
      title: "Simple Dashboard",
      description:
        "Manage, edit, or delete your alerts anytime from a clean, intuitive dashboard with full alert history.",
      icon: <Star className="size-6" />,
    },
  ]

  return (
    <div className="flex min-h-[100dvh] flex-col">
      <header
        className={`fixed top-0 z-50 w-full transition-all duration-500 ${
          isScrolled 
            ? "bg-background/80 backdrop-blur-xl border-b border-border/30 shadow-2xl shadow-primary/5" 
            : "bg-transparent"
        }`}
      >
        {/* Main Navigation Container */}
        <div className="container mx-auto px-4 md:px-6">
          <div className="flex h-20 items-center justify-between">
            
            {/* Enhanced Logo */}
            <motion.div 
              className="flex items-center gap-3"
              whileHover={{ scale: 1.05 }}
              transition={{ duration: 0.2 }}
            >
              <div className="relative group">
                <div className="absolute inset-0 rounded-xl bg-gradient-to-br from-primary to-primary/70 blur-sm opacity-0 transition-opacity duration-300 group-hover:opacity-50"></div>
                <div className="relative size-10 rounded-xl bg-gradient-to-br from-primary via-primary/90 to-primary/70 flex items-center justify-center text-primary-foreground shadow-lg border border-primary/20">
                  <span className="text-lg font-bold">M</span>
            </div>
          </div>
              <div className="flex flex-col">
                <span className="text-xl font-bold bg-gradient-to-r from-foreground to-foreground/70 bg-clip-text text-transparent">
                  Memealert
                </span>
                <span className="text-xs text-muted-foreground -mt-1">Never miss a pump or dump</span>
              </div>
            </motion.div>

            {/* Desktop Navigation */}
            <nav className="hidden lg:flex items-center">
              <div className="relative rounded-2xl border border-border/30 bg-background/40 backdrop-blur-xl p-2 shadow-xl shadow-black/5">
                <div className="absolute inset-0 rounded-2xl bg-gradient-to-r from-background/60 to-muted/20"></div>
                <div className="relative flex items-center gap-2">
                  {[
                    { href: "/dashboard", label: "Dashboard", icon: HomeIcon },
                    { href: "#features", label: "Features", icon: Grid3X3 },
                    { href: "#how-it-works", label: "How It Works", icon: Workflow },
                    { href: "#faq", label: "FAQ", icon: HelpCircle },
                  ].map((item) => (
            <Link
                      key={item.href}
                      href={item.href}
                      className="group relative flex items-center gap-2 px-4 py-2.5 text-sm font-medium text-muted-foreground transition-all duration-300 hover:text-foreground rounded-xl"
                    >
                      <div className="absolute inset-0 rounded-xl bg-gradient-to-r from-primary/10 to-primary/5 opacity-0 transition-all duration-300 group-hover:opacity-100"></div>
                      <div className="absolute inset-0 rounded-xl border border-primary/20 opacity-0 transition-all duration-300 group-hover:opacity-100"></div>
                      <item.icon className="relative size-4 transition-transform duration-300 group-hover:scale-110" />
                      <span className="relative">{item.label}</span>
            </Link>
                  ))}
                </div>
              </div>
          </nav>
          
            {/* Desktop Wallet Section */}
            <div className="hidden lg:flex items-center gap-4">
              <div className="relative">
                <div className="absolute inset-0 rounded-xl bg-gradient-to-r from-primary/20 to-primary/10 blur-sm opacity-0 transition-opacity duration-300 hover:opacity-100"></div>
            <WalletConnectButton />
          </div>
            </div>

            {/* Mobile Menu Button */}
            <div className="flex items-center gap-3 lg:hidden">
              <div className="lg:hidden">
                <WalletConnectButton />
              </div>
              <Button 
                variant="ghost" 
                size="icon" 
                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                className="relative size-10 rounded-xl border border-border/30 bg-background/40 backdrop-blur-sm transition-all duration-300 hover:bg-background/60 hover:border-primary/30"
              >
                <div className="absolute inset-0 rounded-xl bg-gradient-to-br from-background/60 to-muted/20"></div>
                <div className="relative">
              {mobileMenuOpen ? <X className="size-5" /> : <Menu className="size-5" />}
                </div>
              <span className="sr-only">Toggle menu</span>
            </Button>
          </div>
        </div>
        </div>

        {/* Enhanced Mobile Menu */}
        {mobileMenuOpen && (
          <motion.div
            initial={{ opacity: 0, y: -20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -20, scale: 0.95 }}
            transition={{ duration: 0.3, ease: "easeOut" }}
            className="lg:hidden absolute top-20 inset-x-0 mx-4"
          >
            <div className="relative rounded-2xl border border-border/30 bg-background/95 backdrop-blur-xl shadow-2xl overflow-hidden">
              <div className="absolute inset-0 bg-gradient-to-br from-background/90 to-muted/20"></div>
              
              <div className="relative p-6">
                <div className="space-y-1">
                  {[
                    { href: "/dashboard", label: "Dashboard", icon: HomeIcon },
                    { href: "#features", label: "Features", icon: Grid3X3 },
                    { href: "#how-it-works", label: "How It Works", icon: Workflow },
                    { href: "#faq", label: "FAQ", icon: HelpCircle },
                  ].map((item, index) => (
                    <motion.div
                      key={item.href}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ duration: 0.3, delay: index * 0.1 }}
                    >
                      <Link 
                        href={item.href} 
                        className="group flex items-center gap-3 px-4 py-3 text-base font-medium text-muted-foreground transition-all duration-300 hover:text-foreground rounded-xl hover:bg-primary/5 border border-transparent hover:border-primary/20"
                        onClick={() => setMobileMenuOpen(false)}
                      >
                        <div className="size-8 rounded-lg bg-primary/10 flex items-center justify-center text-primary transition-all duration-300 group-hover:bg-primary/20 group-hover:scale-110">
                          <item.icon className="size-4" />
                        </div>
                        <span>{item.label}</span>
                        <ChevronRight className="size-4 ml-auto opacity-0 transition-all duration-300 group-hover:opacity-100 group-hover:translate-x-1" />
              </Link>
                    </motion.div>
                  ))}
              </div>
              </div>
              
              {/* Mobile menu bottom accent */}
              <div className="h-1 bg-gradient-to-r from-primary/50 via-primary to-primary/50"></div>
            </div>
          </motion.div>
        )}
      </header>
      <main className="flex-1">
        {/* Hero Section */}
        <section className="w-full py-20 md:py-32 lg:py-40 overflow-hidden">
          <div className="container px-4 md:px-6 relative py-0">
            <div className="absolute inset-0 -z-10 h-full w-full bg-white dark:bg-black bg-[linear-gradient(to_right,#f0f0f0_1px,transparent_1px),linear-gradient(to_bottom,#f0f0f0_1px,transparent_1px)] dark:bg-[linear-gradient(to_right,#1f1f1f_1px,transparent_1px),linear-gradient(to_bottom,#1f1f1f_1px,transparent_1px)] bg-[size:4rem_4rem] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_0%,#000_70%,transparent_110%)]"></div>
            <div className="fixed inset-0 z-[-1] pointer-events-none">
              <LightRays
                raysOrigin="top-center"
                raysColor="#89CFF0"
                raysSpeed={1.5}
                lightSpread={1.2}
                rayLength={2.0}
                followMouse={true}
                mouseInfluence={0.1}
                noiseAmount={0.1}
                distortion={0.05}
                className="custom-rays"
              />
            </div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
              className="text-center max-w-3xl mx-auto mb-12"
            >
              <Badge className="mb-4 rounded-full px-4 py-1.5 text-sm font-medium mt-5" variant="secondary">
                {"Memealert"}
              </Badge>
              <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold tracking-tight mb-6 bg-clip-text text-transparent bg-gradient-to-r from-foreground to-foreground/70">
                Never Miss a Pump or Dump While You Sleep
              </h1>
              <p className="text-lg md:text-xl text-muted-foreground mb-8 max-w-2xl mx-auto">
                Get loud iPhone alerts the moment your Solana memecoins pump or dump. Set your thresholds and sleep
                peacefully knowing you'll wake up to every moonshot and crash.
              </p>
              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <Button 
                  size="lg" 
                  className="rounded-full h-12 px-8 text-base"
                  onClick={() => {
                    if (isWalletConnected) {
                      window.location.href = "/dashboard";
                    } else {
                      // The WalletConnectButton will handle the connection
                      (document.querySelector('[data-testid="wallet-adapter-button"]') as HTMLElement)?.click();
                    }
                  }}
                >
                  Connect
                </Button>
                <Button 
                  size="lg" 
                  variant="outline" 
                  className="rounded-full h-12 px-8 text-base bg-transparent"
                  onClick={() => {
                    document.getElementById('how-it-works')?.scrollIntoView({ behavior: 'smooth' });
                  }}
                >
                  How it Works
                </Button>
              </div>
              <div className="flex items-center justify-center gap-4 mt-6 text-sm text-muted-foreground">
                <div className="flex items-center gap-1">
                  <Check className="size-4 text-primary" />
                  <span>Loud sleep alerts</span>
                </div>
                <div className="flex items-center gap-1">
                  <Check className="size-4 text-primary" />
                  <span>{"24/7 monitoring"}</span>
                </div>
                <div className="flex items-center gap-1">
                  <Check className="size-4 text-primary" />
                  <span>{"Instant notifications\n"}</span>
                </div>
              </div>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 40 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.7, delay: 0.2 }}
              className="relative mx-auto max-w-5xl"
            >
              <div className="rounded-xl overflow-hidden shadow-2xl border border-border/40 bg-gradient-to-b from-background to-muted/20">
                {/* Dashboard Preview - Non-interactive */}
                <div className="pointer-events-none bg-background p-8">
                  <div className="grid grid-cols-1 lg:grid-cols-5 gap-8">
                    {/* Left Column - Alert Configuration */}
                    <div className="lg:col-span-3 space-y-6">
                      {/* Search Token Section */}
                      <div className="border border-border/40 rounded-lg bg-gradient-to-b from-background to-muted/10 p-6">
                        <h3 className="text-xl font-semibold mb-4">Search Solana Token</h3>
                        <div className="relative">
                          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground size-4" />
                          <div className="pl-10 py-2 px-3 bg-muted/50 border border-border/40 rounded-md text-muted-foreground">
                            Search by name or paste contract address...
                          </div>
                        </div>
                      </div>

                      {/* Notification Channels */}
                      <div className="border border-border/40 rounded-lg bg-gradient-to-b from-background to-muted/10 p-6">
                        <h3 className="text-xl font-semibold mb-4 flex items-center gap-2">
                          <Bell className="size-5" />
                          Notification Channels
                        </h3>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                          <div className="flex flex-col items-center p-4 rounded-lg border border-border/40 bg-muted/20">
                            <div className="flex items-center justify-between w-full mb-3">
                              <div className="flex items-center gap-2">
                                <Smartphone className="size-4 text-primary" />
                                <span className="text-sm font-medium">Push</span>
                              </div>
                              <div className="w-11 h-6 bg-primary rounded-full relative">
                                <div className="absolute right-1 top-1 w-4 h-4 bg-background rounded-full border border-border"></div>
                              </div>
                            </div>
                            <p className="text-xs text-muted-foreground text-center">
                              Browser alerts for desktop and mobile devices
                            </p>
                          </div>
                          <div className="flex flex-col items-center p-4 rounded-lg border border-border/40 bg-muted/20">
                            <div className="flex items-center justify-between w-full mb-3">
                              <div className="flex items-center gap-2">
                                <MessageSquare className="size-4 text-green-500" />
                                <span className="text-sm font-medium">SMS</span>
                              </div>
                              <div className="w-11 h-6 bg-muted-foreground/30 rounded-full relative">
                                <div className="absolute left-1 top-1 w-4 h-4 bg-background rounded-full border border-border"></div>
                              </div>
                            </div>
                            <p className="text-xs text-muted-foreground text-center">
                              Text messages with token and metric updates
                            </p>
                          </div>
                          <div className="flex flex-col items-center p-4 rounded-lg border border-border/40 bg-muted/20">
                            <div className="flex items-center justify-between w-full mb-3">
                              <div className="flex items-center gap-2">
                                <Phone className="size-4 text-red-500" />
                                <span className="text-sm font-medium">Calls</span>
                              </div>
                              <div className="w-11 h-6 bg-primary rounded-full relative">
                                <div className="absolute right-1 top-1 w-4 h-4 bg-background rounded-full border border-border"></div>
                              </div>
                            </div>
                            <p className="text-xs text-muted-foreground text-center">
                              Voice calls for critical alerts and wake-up alarms
                            </p>
                          </div>
                        </div>
                      </div>

                      {/* Market Cap Alerts */}
                      <div className="border border-border/40 rounded-lg bg-gradient-to-b from-background to-muted/10 p-6">
                        <div className="flex items-center justify-between mb-4">
                          <h3 className="text-xl font-semibold">Market Cap Alerts</h3>
                          <div className="w-11 h-6 bg-primary rounded-full relative">
                            <div className="absolute right-1 top-1 w-4 h-4 bg-background rounded-full border border-border"></div>
                          </div>
                        </div>
                        <div className="space-y-4">
                          <div className="space-y-2">
                            <div className="flex items-center justify-between text-sm">
                              <span>Notify when higher than:</span>
                              <span className="font-mono">$1,000,000</span>
                            </div>
                            <div className="w-full h-2 bg-muted rounded-full relative">
                              <div className="absolute left-0 top-0 h-2 bg-primary rounded-full w-1/3"></div>
                              <div className="absolute left-1/3 top-1/2 transform -translate-y-1/2 w-4 h-4 bg-background rounded-full border-2 border-primary"></div>
                            </div>
                          </div>
                          <div className="space-y-2">
                            <div className="flex items-center justify-between text-sm">
                              <span>Notify when lower than:</span>
                              <span className="font-mono">$500,000</span>
                            </div>
                            <div className="w-full h-2 bg-muted rounded-full relative">
                              <div className="absolute left-0 top-0 h-2 bg-primary rounded-full w-1/4"></div>
                              <div className="absolute left-1/4 top-1/2 transform -translate-y-1/2 w-4 h-4 bg-background rounded-full border-2 border-primary"></div>
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Price Change Alerts */}
                      <div className="border border-border/40 rounded-lg bg-gradient-to-b from-background to-muted/10 p-6">
                        <div className="flex items-center justify-between mb-4">
                          <h3 className="text-xl font-semibold">Price Change Alerts</h3>
                          <div className="w-11 h-6 bg-primary rounded-full relative">
                            <div className="absolute right-1 top-1 w-4 h-4 bg-background rounded-full border border-border"></div>
                          </div>
                        </div>
                        <div className="space-y-2">
                          <div className="flex items-center justify-between text-sm">
                            <span>Notify on ±20% change</span>
                            <span className="font-mono">±20%</span>
                          </div>
                          <div className="w-full h-2 bg-muted rounded-full relative">
                            <div className="absolute left-0 top-0 h-2 bg-primary rounded-full w-4/5"></div>
                            <div className="absolute right-0 top-1/2 transform -translate-y-1/2 -translate-x-1 w-4 h-4 bg-background rounded-full border-2 border-primary"></div>
                          </div>
                        </div>
                      </div>

                      <div className="border border-border/40 rounded-lg bg-gradient-to-b from-background to-muted/10 p-6">
                        <div className="flex items-center justify-between mb-4">
                          <h3 className="text-xl font-semibold">Volume Alerts</h3>
                          <div className="w-11 h-6 bg-primary rounded-full relative">
                            <div className="absolute right-1 top-1 w-4 h-4 bg-background rounded-full border border-border"></div>
                          </div>
                        </div>
                        <div className="space-y-4">
                          <div className="space-y-2">
                            <div className="flex items-center justify-between text-sm">
                              <span>Volume Period</span>
                            </div>
                            <div className="w-full p-2 bg-muted/50 border border-border/40 rounded-md text-sm">
                              24 hours
                            </div>
                          </div>
                          <div className="space-y-2">
                            <div className="flex items-center justify-between text-sm">
                              <span>Volume Threshold:</span>
                              <span className="font-mono">$100,000</span>
                            </div>
                            <div className="w-full h-2 bg-muted rounded-full relative">
                              <div className="absolute left-0 top-0 h-2 bg-primary rounded-full w-1/3"></div>
                              <div className="absolute left-1/3 top-1/2 transform -translate-y-1/2 w-4 h-4 bg-background rounded-full border-2 border-primary"></div>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Right Column - Alerts */}
                    <div className="lg:col-span-2">
                      <div className="border border-border/40 rounded-lg bg-gradient-to-b from-background to-muted/10 p-6">
                        <div className="flex items-center justify-between mb-4">
                          <h3 className="text-xl font-semibold">Alerts</h3>
                          <div className="px-3 py-1 bg-muted rounded-md text-xs flex items-center gap-1">
                            <Eye className="size-3" />
                            View Metrics
                          </div>
                        </div>
                        <div className="space-y-3">
                          {/* BONK Alert */}
                          <div className="flex items-center justify-between p-3 rounded-lg border border-border/40 bg-muted/20">
                            <div className="flex items-center gap-3 flex-1 min-w-0">
                              <div className="px-2 py-1 bg-primary text-primary-foreground rounded text-xs flex items-center gap-1">
                                <CheckCircle className="size-3" />
                                active
                              </div>
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2 mb-2">
                                  <span className="font-semibold">BONK</span>
                                  <span className="text-xs text-muted-foreground font-mono">DezXAZ8z...TiHm</span>
                                </div>
                                <div className="grid grid-cols-3 gap-2 text-xs">
                                  <div>
                                    <div className="text-muted-foreground">Market Cap</div>
                                    <div className="font-medium">$847K</div>
                                  </div>
                                  <div>
                                    <div className="text-muted-foreground">24h Change</div>
                                    <div className="font-medium text-green-500">+34.2%</div>
                                  </div>
                                  <div>
                                    <div className="text-muted-foreground">24h Volume</div>
                                    <div className="font-medium">$156K</div>
                                  </div>
                                </div>
                              </div>
                            </div>
                            <div className="flex items-center gap-1">
                              <Bell className="size-4 text-primary fill-current" />
                              <Edit className="size-4 text-muted-foreground" />
                              <Trash2 className="size-4 text-red-500" />
                            </div>
                          </div>

                          {/* PEPE Alert */}
                          <div className="flex items-center justify-between p-3 rounded-lg border border-border/40 bg-muted/20">
                            <div className="flex items-center gap-3 flex-1 min-w-0">
                              <div className="px-2 py-1 bg-primary text-primary-foreground rounded text-xs flex items-center gap-1">
                                <CheckCircle className="size-3" />
                                active
                              </div>
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2 mb-2">
                                  <span className="font-semibold">PEPE</span>
                                  <span className="text-xs text-muted-foreground font-mono">5z3EqYQo...SmrRC</span>
                                </div>
                                <div className="grid grid-cols-3 gap-2 text-xs">
                                  <div>
                                    <div className="text-muted-foreground">Market Cap</div>
                                    <div className="font-medium">$2.1M</div>
                                  </div>
                                  <div>
                                    <div className="text-muted-foreground">24h Change</div>
                                    <div className="font-medium text-red-500">-12.8%</div>
                                  </div>
                                  <div>
                                    <div className="text-muted-foreground">24h Volume</div>
                                    <div className="font-medium">$890K</div>
                                  </div>
                                </div>
                              </div>
                            </div>
                            <div className="flex items-center gap-1">
                              <Bell className="size-4 text-primary fill-current" />
                              <Edit className="size-4 text-muted-foreground" />
                              <Trash2 className="size-4 text-red-500" />
                            </div>
                          </div>

                          {/* DOGE Alert */}
                          <div className="flex items-center justify-between p-3 rounded-lg border border-border/40 bg-muted/20">
                            <div className="flex items-center gap-3 flex-1 min-w-0">
                              <div className="px-2 py-1 bg-muted text-muted-foreground rounded text-xs flex items-center gap-1">
                                <XCircle className="size-3" />
                                inactive
                              </div>
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2 mb-2">
                                  <span className="font-semibold">DOGE</span>
                                  <span className="text-xs text-muted-foreground font-mono">So111111...1112</span>
                                </div>
                                <div className="grid grid-cols-3 gap-2 text-xs">
                                  <div>
                                    <div className="text-muted-foreground">Market Cap</div>
                                    <div className="font-medium">$450K</div>
                                  </div>
                                  <div>
                                    <div className="text-muted-foreground">24h Change</div>
                                    <div className="font-medium text-green-500">+8.5%</div>
                                  </div>
                                  <div>
                                    <div className="text-muted-foreground">24h Volume</div>
                                    <div className="font-medium">$67K</div>
                                  </div>
                                </div>
                              </div>
                            </div>
                            <div className="flex items-center gap-1">
                              <Bell className="size-4 text-muted-foreground" />
                              <Edit className="size-4 text-muted-foreground" />
                              <Trash2 className="size-4 text-red-500" />
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
                <div className="absolute inset-0 rounded-xl ring-1 ring-inset ring-black/10 dark:ring-white/10"></div>
              </div>
              <div className="absolute -bottom-6 -right-6 -z-10 h-[300px] w-[300px] rounded-full bg-gradient-to-br from-primary/30 to-secondary/30 blur-3xl opacity-70"></div>
              <div className="absolute -top-6 -left-6 -z-10 h-[300px] w-[300px] rounded-full bg-gradient-to-br from-secondary/30 to-primary/30 blur-3xl opacity-70"></div>
            </motion.div>
          </div>
        </section>

        {/* Features Section */}
        <section id="features" className="w-full py-20 md:py-32">
          <div className="container px-4 md:px-6">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5 }}
              className="flex flex-col items-center justify-center space-y-4 text-center mb-12"
            >
              <Badge className="rounded-full px-4 py-1.5 text-sm font-medium" variant="secondary">
                Features
              </Badge>
              <h2 className="text-3xl md:text-4xl font-bold tracking-tight">Everything You Need to Succeed</h2>
              <p className="max-w-[800px] text-muted-foreground md:text-lg">
                Our comprehensive platform provides all the tools you need to streamline your workflow, boost
                productivity, and achieve your goals.
              </p>
            </motion.div>

            <motion.div
              variants={container}
              initial="hidden"
              whileInView="show"
              viewport={{ once: true }}
              className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3"
            >
              {features.map((feature, i) => (
                <motion.div key={i} variants={item}>
                  <FeatureCard
                    title={feature.title}
                    description={feature.description}
                    icon={feature.icon}
                    className="h-full"
                  />
                </motion.div>
              ))}
            </motion.div>
          </div>
        </section>

        {/* How It Works Section */}
        <section id="how-it-works" className="w-full py-20 md:py-32 relative overflow-hidden">
          <div className="absolute inset-0 -z-10 h-full w-full bg-white dark:bg-black bg-[linear-gradient(to_right,#f0f0f0_1px,transparent_1px),linear-gradient(to_bottom,#f0f0f0_1px,transparent_1px)] dark:bg-[linear-gradient(to_right,#1f1f1f_1px,transparent_1px),linear-gradient(to_bottom,#1f1f1f_1px,transparent_1px)] bg-[size:4rem_4rem] [mask-image:radial-gradient(ellipse_80%_50%_at_50%_50%,#000_40%,transparent_100%)]"></div>

          <div className="container px-4 md:px-6 relative">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5 }}
              className="flex flex-col items-center justify-center space-y-4 text-center mb-16"
            >
              <Badge className="rounded-full px-4 py-1.5 text-sm font-medium" variant="secondary">
                How It Works
              </Badge>
              <h2 className="text-3xl md:text-4xl font-bold tracking-tight">Simple Process, Powerful Results</h2>
              <p className="max-w-[800px] text-muted-foreground md:text-lg">
                Get started in minutes and relax on your bags!
              </p>
            </motion.div>

            {/* Process steps container with subtle background */}
            <div className="relative rounded-2xl border border-border/40 bg-background/40 backdrop-blur-sm p-8 md:p-12">
              <div className="absolute inset-0 bg-gradient-to-br from-background/60 to-muted/10 rounded-2xl"></div>
              
              <div className="relative grid md:grid-cols-3 gap-8 md:gap-12">
              {/* Enhanced connection line with animated dots */}
              <div className="hidden md:block absolute top-1/2 left-0 right-0 h-0.5 bg-gradient-to-r from-transparent via-border to-transparent -translate-y-1/2 z-0"></div>
              <div className="hidden md:block absolute top-1/2 left-1/4 w-2 h-2 rounded-full bg-primary/60 -translate-y-1/2 z-10 animate-pulse"></div>
              <div className="hidden md:block absolute top-1/2 right-1/4 w-2 h-2 rounded-full bg-primary/60 -translate-y-1/2 z-10 animate-pulse" style={{ animationDelay: '0.5s' }}></div>

              {[
                {
                  step: "01",
                  title: "Connect Wallet",
                  description:
                    "Securely connect your Solana wallet to verify ownership and enable on-chain alert storage. Then, verify your phone number so you can receive SMS or phone call alerts.",
                  icon: <Shield className="size-6" />,
                },
                {
                  step: "02",
                  title: "Set Alerts",
                  description:
                    "Enter a token address within Solana, choose metrics (marketcap, volume, or % change), and set your custom thresholds.",
                  icon: <Bell className="size-6" />,
                },
                {
                  step: "03",
                  title: "Receive Notifications",
                  description:
                    "Get alerts instantly via PWA push notifications, SMS, or even a phone call that wakes you up when thresholds are hit.",
                  icon: <Smartphone className="size-6" />,
                },
              ].map((step, i) => (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.5, delay: i * 0.1 }}
                  className="group relative z-10 flex flex-col items-center text-center space-y-6"
                >
                  {/* Enhanced step circle with background blur */}
                  <div className="relative">
                    <div className="absolute inset-0 rounded-full bg-gradient-to-br from-primary/30 to-primary/10 blur-lg scale-110 opacity-0 transition-opacity duration-300 group-hover:opacity-100"></div>
                    <div className="relative flex h-20 w-20 items-center justify-center rounded-full bg-gradient-to-br from-primary to-primary/70 text-primary-foreground text-xl font-bold shadow-lg border border-primary/20 transition-all duration-300 group-hover:scale-110 group-hover:shadow-xl group-hover:shadow-primary/25">
                    {step.step}
                  </div>
                    
                    {/* Icon overlay */}
                    <div className="absolute -bottom-1 -right-1 flex h-8 w-8 items-center justify-center rounded-full bg-background border-2 border-primary/20 text-primary transition-all duration-300 group-hover:scale-110">
                      {step.icon}
                    </div>
                  </div>

                  {/* Content with improved spacing */}
                  <div className="space-y-3 max-w-sm">
                    <h3 className="text-xl font-bold transition-colors duration-300 group-hover:text-primary">{step.title}</h3>
                    <p className="text-muted-foreground leading-relaxed transition-colors duration-300 group-hover:text-foreground/80">{step.description}</p>
                  </div>

                  {/* Subtle bottom accent */}
                  <div className="w-12 h-0.5 bg-gradient-to-r from-transparent via-primary/30 to-transparent transition-all duration-300 group-hover:via-primary/60 group-hover:w-16"></div>
                </motion.div>
              ))}
              </div>
            </div>
          </div>
        </section>



        {/* FAQ Section */}
        <section id="faq" className="w-full py-20 md:py-32">
          <div className="container px-4 md:px-6">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
              className="flex flex-col items-center justify-center space-y-4 text-center mb-12"
            >
              <Badge className="rounded-full px-4 py-1.5 text-sm font-medium" variant="secondary">
                FAQ
              </Badge>
              <h2 className="text-3xl md:text-4xl font-bold tracking-tight">Frequently Asked Questions</h2>
              <p className="max-w-[800px] text-muted-foreground md:text-lg">
                Find answers to common questions about our platform.
              </p>
            </motion.div>

            {/* FAQ with enhanced transparency */}
            <div className="mx-auto max-w-3xl">
              <Accordion type="single" collapsible className="w-full space-y-3">
                {[
                  {
                    question: "Which Solana tokens can I monitor?",
                    answer:
                      "You can monitor any Solana token that's listed on DexScreener. Simply paste the contract address and we'll start tracking it immediately. We support all major DEXs including Pumpfun, Bonk, Raydium, Orca, and Jupiter.",
                    icon: <Search className="size-4" />,
                  },
                  {
                    question: "How do phone call alerts work?",
                    answer:
                      "When your token hits a threshold, we'll call your verified phone number with a voice message. The call is loud enough to wake you up and includes details about which token triggered the alert and the current price movement.",
                    icon: <Phone className="size-4" />,
                  },
                  {
                    question: "What metrics can I set alerts for?",
                    answer:
                      "You can set alerts for market cap changes, 24h volume thresholds, and percentage price changes (both gains and losses). Each metric can be customized with your own thresholds and can be toggled on or off independently.",
                    icon: <BarChart className="size-4" />,
                  },
                  {
                    question: "How secure is my wallet connection?",
                    answer:
                      "We use read-only wallet connections that never have access to your private keys or funds. Your wallet is only used for identity verification and to store alert preferences on-chain. We cannot perform any transactions on your behalf.",
                    icon: <Shield className="size-4" />,
                  },
                  {
                    question: "Can I manage multiple tokens?",
                    answer:
                      "Yes! You can add unlimited tokens to your dashboard and set different alert thresholds for each one. Each token can have its own notification preferences and can be activated or deactivated independently.",
                    icon: <Layers className="size-4" />,
                  },
                ].map((faq, i) => (
                  <motion.div
                    key={i}
                    initial={{ opacity: 0, y: 10 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    transition={{ duration: 0.3, delay: i * 0.05 }}
                  >
                    <AccordionItem 
                      value={`item-${i}`} 
                      className="group border-b border-border/30 px-0 py-3 transition-all duration-300 hover:border-primary/40"
                    >
                      <AccordionTrigger className="text-left font-medium hover:no-underline py-2 transition-colors duration-300 group-hover:text-primary [&[data-state=open]]:text-primary">
                        <div className="flex items-center gap-3">
                          <div className="size-6 rounded-full bg-primary/10 backdrop-blur-sm border border-primary/20 flex items-center justify-center text-primary transition-all duration-300 group-hover:bg-primary/20 group-hover:border-primary/30 group-hover:scale-110">
                            {faq.icon}
                          </div>
                          <span className="flex-1">{faq.question}</span>
                        </div>
                      </AccordionTrigger>
                      <AccordionContent className="text-muted-foreground leading-relaxed pt-2 pb-4 ml-9 transition-colors duration-300 group-hover:text-foreground/90">
                        {faq.answer}
                      </AccordionContent>
                    </AccordionItem>
                  </motion.div>
                ))}
              </Accordion>
            </div>
          </div>
        </section>

        {/* CTA Section */}
        <section className="w-full py-20 md:py-32 relative overflow-hidden">
          <div className="absolute inset-0 -z-10 h-full w-full bg-white dark:bg-black bg-[linear-gradient(to_right,#f0f0f0_1px,transparent_1px),linear-gradient(to_bottom,#f0f0f0_1px,transparent_1px)] dark:bg-[linear-gradient(to_right,#1f1f1f_1px,transparent_1px),linear-gradient(to_bottom,#1f1f1f_1px,transparent_1px)] bg-[size:4rem_4rem] [mask-image:radial-gradient(ellipse_80%_50%_at_50%_50%,#000_40%,transparent_100%)]"></div>

          <div className="container px-4 md:px-6 relative">
            {/* Enhanced CTA Container */}
            <div className="relative mx-auto max-w-4xl">
              <div className="relative rounded-3xl border border-border/40 bg-background/40 backdrop-blur-sm p-8 md:p-16 overflow-hidden">
                <div className="absolute inset-0 bg-gradient-to-br from-background/80 to-muted/20"></div>
                
                {/* Decorative elements */}
                <div className="absolute top-4 right-4 size-20 rounded-full bg-primary/10 blur-2xl"></div>
                <div className="absolute bottom-4 left-4 size-16 rounded-full bg-primary/5 blur-xl"></div>
                
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
                  className="relative flex flex-col items-center justify-center space-y-8 text-center"
            >
                  {/* Title with enhanced styling */}
                  <div className="space-y-4">
                    <h2 className="text-3xl md:text-4xl lg:text-5xl font-bold tracking-tight bg-gradient-to-r from-foreground to-foreground/70 bg-clip-text text-transparent">
                Sleep Soundly, Trade Smartly
              </h2>
                    <p className="mx-auto max-w-[700px] text-muted-foreground md:text-xl leading-relaxed">
                Join thousands of traders who never miss a pump or dump. Get woken up by loud alerts the moment your
                memecoins move.
              </p>
                  </div>

                  {/* Enhanced button with glow effect */}
                  <div className="relative group">
                    <div className="absolute -inset-1 rounded-full bg-gradient-to-r from-primary to-primary/70 blur opacity-0 transition-opacity duration-300 group-hover:opacity-25"></div>
                <Button 
                  size="lg" 
                      className="relative rounded-full h-14 px-10 text-lg font-semibold shadow-lg transition-all duration-300 hover:shadow-xl hover:shadow-primary/25 hover:scale-105"
                  onClick={() => {
                    if (isWalletConnected) {
                      window.location.href = "/dashboard";
                    } else {
                      // The WalletConnectButton will handle the connection
                      (document.querySelector('[data-testid="wallet-adapter-button"]') as HTMLElement)?.click();
                    }
                  }}
                >
                      Connect
                </Button>
              </div>

                  {/* Simplified subtitle */}
                  <div className="text-center">
                    <p className="text-sm text-muted-foreground">Connect your wallet to get started</p>
                  </div>
            </motion.div>
              </div>
              
              {/* Subtle glow effects */}
              <div className="absolute -bottom-8 -right-8 -z-10 h-32 w-32 rounded-full bg-gradient-to-br from-primary/20 to-secondary/20 blur-3xl opacity-60"></div>
              <div className="absolute -top-8 -left-8 -z-10 h-24 w-24 rounded-full bg-gradient-to-br from-secondary/20 to-primary/20 blur-2xl opacity-60"></div>
            </div>
          </div>
        </section>
      </main>

            <footer className="w-full border-t border-border/30 bg-background/40 backdrop-blur-sm">
        <div className="container px-4 py-8 md:px-6">
          <div className="flex flex-col md:flex-row justify-between items-center gap-6">
            
            {/* Brand */}
            <motion.div 
              className="flex items-center gap-3"
              whileHover={{ scale: 1.05 }}
              transition={{ duration: 0.2 }}
            >
              <div className="relative group">
                <div className="absolute inset-0 rounded-xl bg-gradient-to-br from-primary to-primary/70 blur-sm opacity-0 transition-opacity duration-300 group-hover:opacity-50"></div>
                <div className="relative size-10 rounded-xl bg-gradient-to-br from-primary via-primary/90 to-primary/70 flex items-center justify-center text-primary-foreground shadow-lg border border-primary/20">
                  <span className="text-lg font-bold">M</span>
                </div>
              </div>
              <div className="flex flex-col">
                <span className="text-xl font-bold bg-gradient-to-r from-foreground to-foreground/70 bg-clip-text text-transparent">
                  Memealert
                </span>
                <span className="text-xs text-muted-foreground -mt-1">Never miss a pump or dump</span>
              </div>
            </motion.div>

            {/* Links */}
            <div className="flex items-center gap-8">
              <Link href="#features" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
                Features
              </Link>
              <Link href="#how-it-works" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
                How It Works
              </Link>
              <Link href="/dashboard" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
                Dashboard
              </Link>
              <Link href="#faq" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
                FAQ
              </Link>
            </div>

            {/* Copyright */}
            <div className="text-xs text-muted-foreground">
              &copy; {new Date().getFullYear()} Memealert
            </div>
          </div>
        </div>
      </footer>
    </div>
  )
}
