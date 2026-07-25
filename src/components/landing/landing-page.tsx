'use client'

import { useRef } from 'react'
import { useState, useEffect } from 'react'
import { toast } from 'sonner'
import { motion, AnimatePresence, useInView } from 'framer-motion'
import { useAppStore } from '@/lib/store'
import { Button } from '@/components/ui/button'
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion'
import { Marquee } from '@/components/ui/marquee'
import { BentoGrid } from '@/components/ui/bento-grid'
import { NumberTicker } from '@/components/ui/number-ticker'
import { AnimatedBeam } from '@/components/ui/animated-beam'
import { BorderBeam } from '@/components/ui/border-beam'
import { Meteors } from '@/components/ui/meteors'
import { ShimmerButton } from '@/components/ui/shimmer-button'
import { AuroraText } from '@/components/ui/aurora-text'
import { DottedMap } from '@/components/ui/dotted-map'
import { MagicCard } from '@/components/ui/magic-card'
import { Ripple } from '@/components/ui/ripple'
import {
  Shield,
  BookOpen,
  UserPlus,
  GraduationCap,
  FileText,
  Heart,
  CreditCard,
  BarChart3,
  Building2,
  Lock,
  Eye,
  FileCheck,
  Wifi,
  FileSpreadsheet,
  Smartphone,
  Printer,
  Stamp,
  Languages,
  ChevronRight,
  Menu,
  X,
  ArrowRight,
  CheckCircle2,
  Stethoscope,
  Pill,
  Syringe,
  Baby,
  Microscope,
  Activity,
  MapPin,
  Phone,
  Mail,
  Clock,
  Play,
  ArrowRightLeft,
  RefreshCw,
  Gavel,
  Twitter,
  Linkedin,
  Facebook,
  ShieldCheck,
  Server,
  Headphones,
  Settings,
  HeartPulse,
  School,
  Landmark,
  Wrench,
  Users,
  Settings2,
  Upload,
  Rocket,
  Bell,
  Search,
  Sparkles,
} from 'lucide-react'

// ─── Framer Motion Variants for Staggered Animations ─────────────────────────
const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.08,
      delayChildren: 0.1,
    },
  },
} as const

// ─── Scroll Animation Wrapper ────────────────────────────────────────────────
function FadeInSection({ children, className, delay = 0 }: { children: React.ReactNode; className?: string; delay?: number }) {
  const ref = useRef(null)
  const isInView = useInView(ref, { once: true, margin: '-80px' })

  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, y: 40 }}
      animate={isInView ? { opacity: 1, y: 0 } : { opacity: 0, y: 40 }}
      transition={{ duration: 0.6, delay, ease: 'easeOut' }}
      className={className}
    >
      {children}
    </motion.div>
  )
}

// ─── Floating Animated Elements ──────────────────────────────────────────────
function FloatingElements() {
  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none">
      <motion.div
        className="absolute top-[15%] left-[10%] text-white/10"
        animate={{ y: [-10, 10, -10], rotate: [-5, 5, -5] }}
        transition={{ duration: 6, repeat: Infinity, ease: 'easeInOut' }}
      >
        <GraduationCap className="size-12 md:size-16" />
      </motion.div>
      <motion.div
        className="absolute top-[25%] right-[12%] text-white/10"
        animate={{ y: [10, -10, 10], rotate: [5, -5, 5] }}
        transition={{ duration: 7, repeat: Infinity, ease: 'easeInOut' }}
      >
        <Shield className="size-10 md:size-14" />
      </motion.div>
      <motion.div
        className="absolute bottom-[30%] left-[20%] text-white/10"
        animate={{ y: [-8, 12, -8], x: [-3, 3, -3] }}
        transition={{ duration: 8, repeat: Infinity, ease: 'easeInOut' }}
      >
        <FileText className="size-8 md:size-12" />
      </motion.div>
      <motion.div
        className="absolute top-[60%] right-[25%] text-white/10"
        animate={{ y: [12, -8, 12], rotate: [-3, 3, -3] }}
        transition={{ duration: 5, repeat: Infinity, ease: 'easeInOut' }}
      >
        <BookOpen className="size-10 md:size-14" />
      </motion.div>
      <motion.div
        className="absolute top-[45%] left-[5%] text-white/10"
        animate={{ y: [-5, 15, -5] }}
        transition={{ duration: 9, repeat: Infinity, ease: 'easeInOut' }}
      >
        <BarChart3 className="size-8 md:size-10" />
      </motion.div>
      <motion.div
        className="absolute top-[20%] left-[45%] w-20 h-20 border border-white/5 rounded-full"
        animate={{ scale: [1, 1.1, 1], opacity: [0.3, 0.5, 0.3] }}
        transition={{ duration: 4, repeat: Infinity, ease: 'easeInOut' }}
      />
      <motion.div
        className="absolute bottom-[20%] right-[10%] w-32 h-32 border border-white/5 rotate-45"
        animate={{ rotate: [45, 90, 45], scale: [1, 1.05, 1] }}
        transition={{ duration: 8, repeat: Infinity, ease: 'easeInOut' }}
      />
      <motion.div
        className="absolute top-[70%] left-[40%] w-16 h-16 border border-[#d4a853]/10 rotate-12"
        animate={{ rotate: [12, -12, 12] }}
        transition={{ duration: 6, repeat: Infinity, ease: 'easeInOut' }}
      />
    </div>
  )
}

// ─── Dot Grid Pattern ────────────────────────────────────────────────────────
function DotGridPattern() {
  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none opacity-[0.15]">
      <div
        className="absolute inset-0"
        style={{
          backgroundImage: 'radial-gradient(circle, rgba(255,255,255,0.5) 1px, transparent 1px)',
          backgroundSize: '32px 32px',
        }}
      />
    </div>
  )
}

// ─── Navigation Bar ──────────────────────────────────────────────────────────
const navLinks = [
  { label: 'Modules', href: '#modules' },
  { label: 'Comment ca marche', href: '#how-it-works' },
  { label: 'Securite', href: '#security' },
  { label: 'Tarifs', href: '#pricing' },
  { label: 'FAQ', href: '#faq' },
]

function NavBar() {
  const { setView } = useAppStore()
  const [mobileOpen, setMobileOpen] = useState(false)
  const [scrolled, setScrolled] = useState(false)

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 20)
    window.addEventListener('scroll', onScroll)
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  useEffect(() => {
    document.body.style.overflow = mobileOpen ? 'hidden' : ''
    return () => { document.body.style.overflow = '' }
  }, [mobileOpen])

  const scrollTo = (href: string) => {
    setMobileOpen(false)
    // Deferred past the drawer's close transition (which also resets the
    // scroll-lock via the effect above): firing scrollIntoView while that
    // exit animation is still running silently no-ops the scroll on some
    // browsers/devices.
    window.setTimeout(() => {
      document.querySelector(href)?.scrollIntoView({ behavior: 'smooth' })
    }, 300)
  }

  return (
    <motion.nav
      initial={{ y: -100 }}
      animate={{ y: 0 }}
      transition={{ duration: 0.5 }}
      className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
        scrolled
          ? 'bg-white/90 backdrop-blur-md shadow-sm border-b border-gray-100'
          : 'bg-transparent'
      }`}
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16 md:h-18">
          {/* Logo */}
          <button
            className="flex items-center gap-2"
            onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
            aria-label="Retour en haut de page"
          >
            <div className={`p-1.5 rounded-lg ${scrolled ? 'bg-[#1a2744]' : 'bg-white/10'}`}>
              <Shield className="size-5 text-white" />
            </div>
            <span className={`text-lg font-bold tracking-tight ${scrolled ? 'text-[#1a2744]' : 'text-white'}`}>
              Uni<span className={scrolled ? 'text-[#2d7a4f]' : 'text-[#3da66a]'}>Sahel</span>
            </span>
          </button>

          {/* Desktop Nav */}
          <div className="hidden md:flex items-center gap-8">
            {navLinks.map((link) => (
              <button
                key={link.href}
                onClick={() => scrollTo(link.href)}
                className={`text-sm font-medium transition-colors hover:text-[#2d7a4f] ${
                  scrolled ? 'text-gray-600' : 'text-white/80'
                }`}
              >
                {link.label}
              </button>
            ))}
          </div>

          {/* Desktop CTAs */}
          <div className="hidden md:flex items-center gap-3">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setView('institution')}
              className={scrolled ? 'text-[#1a2744] hover:bg-[#2d7a4f10] hover:text-[#2d7a4f]' : 'text-white/70 hover:text-white hover:bg-white/10'}
            >
              <Settings className="size-3.5 mr-1" />
              Configuration
            </Button>
            <Button
              size="sm"
              onClick={() => setView('login')}
              className="bg-white text-[#1a2744] hover:bg-gray-100 hover:text-[#1a2744] font-medium border border-gray-200"
            >
              Connexion
            </Button>
            <Button
              size="sm"
              onClick={() => setView('login')}
              className="bg-[#2d7a4f] hover:bg-[#236b40] text-white"
            >
              Essai gratuit
            </Button>
          </div>

          {/* Mobile hamburger */}
          <button
            className="md:hidden p-2 -mr-2"
            onClick={() => setMobileOpen(!mobileOpen)}
            aria-label={mobileOpen ? 'Fermer le menu' : 'Ouvrir le menu'}
            aria-expanded={mobileOpen}
          >
            {mobileOpen ? (
              <X className="size-5 text-gray-800" />
            ) : (
              <Menu className={scrolled ? 'size-5 text-gray-800' : 'size-5 text-white'} />
            )}
          </button>
        </div>
      </div>

      {/* Mobile Menu */}
      <AnimatePresence>
        {mobileOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="md:hidden fixed inset-0 top-16 bg-black/20 z-40"
              onClick={() => setMobileOpen(false)}
            />
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="md:hidden relative z-40 bg-white border-t border-gray-100 shadow-lg overflow-hidden"
            >
              <div className="px-4 py-4 space-y-1">
                {navLinks.map((link) => (
                  <button
                    key={link.href}
                    onClick={() => scrollTo(link.href)}
                    className="block w-full text-left px-3 py-2.5 text-sm font-medium text-gray-700 hover:text-[#2d7a4f] hover:bg-gray-50 rounded-md min-h-11"
                  >
                    {link.label}
                  </button>
                ))}
                <div className="pt-3 border-t border-gray-100 space-y-2">
                  <Button
                    variant="ghost"
                    className="w-full justify-start text-[#1a2744] hover:bg-[#2d7a4f10] hover:text-[#2d7a4f]"
                    onClick={() => { setMobileOpen(false); setView('institution') }}
                  >
                    <Settings className="size-4 mr-2" />
                    Configuration
                  </Button>
                  <Button
                    variant="outline"
                    className="w-full border-[#1a274430] text-[#1a2744] hover:bg-[#1a274408]"
                    onClick={() => { setMobileOpen(false); setView('login') }}
                  >
                    Connexion
                  </Button>
                  <Button
                    className="w-full bg-[#2d7a4f] hover:bg-[#236b40] text-white"
                    onClick={() => { setMobileOpen(false); setView('login') }}
                  >
                    Essai gratuit
                  </Button>
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </motion.nav>
  )
}

// ─── Dashboard Preview Mockup ────────────────────────────────────────────────
// Pure CSS/DOM re-creation of the product's own dashboard, in miniature,
// styled with the same navy/green/gold tokens used app-wide — gives the
// hero a concrete "show, don't tell" visual instead of only icons/text.
function DashboardPreview() {
  return (
    <motion.div
      initial={{ opacity: 0, y: 40, scale: 0.97 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ duration: 0.8, delay: 1.0, ease: [0.16, 1, 0.3, 1] }}
      className="relative mx-auto max-w-4xl mt-14"
    >
      {/* Glow behind the mockup */}
      <div className="absolute -inset-6 bg-gradient-to-r from-[#2d7a4f]/20 via-[#d4a853]/10 to-[#2d7a4f]/20 blur-3xl rounded-[2rem]" />

      <div className="relative rounded-2xl border border-white/15 bg-white/[0.03] backdrop-blur-xl shadow-2xl overflow-hidden">
        <BorderBeam size={220} duration={8} colorFrom="#2d7a4f" colorTo="#d4a853" />
        {/* Browser chrome */}
        <div className="flex items-center gap-2 px-4 py-3 border-b border-white/10 bg-white/[0.03]">
          <div className="flex gap-1.5">
            <span className="size-2.5 rounded-full bg-red-400/70" />
            <span className="size-2.5 rounded-full bg-yellow-400/70" />
            <span className="size-2.5 rounded-full bg-green-400/70" />
          </div>
          <div className="flex-1 flex justify-center">
            <div className="flex items-center gap-1.5 px-3 py-1 rounded-md bg-white/5 text-white/40 text-[11px]">
              <Lock className="size-2.5" />
              app.unisahel.africa
            </div>
          </div>
        </div>

        <div className="flex text-left">
          {/* Sidebar */}
          <div className="hidden sm:flex w-40 shrink-0 flex-col gap-1 border-r border-white/10 bg-[#141f36]/40 p-3">
            <div className="flex items-center gap-1.5 px-2 py-1.5 mb-2">
              <div className="p-1 rounded bg-white/10"><Shield className="size-3 text-white" /></div>
              <span className="text-[11px] font-bold text-white">UniSahel</span>
            </div>
            {[
              { icon: BarChart3, label: 'Tableau de bord', active: true },
              { icon: Users, label: 'Etudiants' },
              { icon: GraduationCap, label: 'Notes' },
              { icon: CreditCard, label: 'Paiements' },
              { icon: FileText, label: 'Documents' },
            ].map((item) => (
              <div
                key={item.label}
                className={`flex items-center gap-2 px-2 py-1.5 rounded-md text-[10px] ${
                  item.active ? 'bg-[#2d7a4f]/25 text-white' : 'text-white/40'
                }`}
              >
                <item.icon className="size-3" />
                {item.label}
              </div>
            ))}
          </div>

          {/* Main content */}
          <div className="flex-1 p-4 sm:p-5 space-y-4">
            {/* Top bar */}
            <div className="flex items-center justify-between">
              <div className="h-2.5 w-24 rounded bg-white/20" />
              <div className="flex items-center gap-2">
                <div className="size-6 rounded-md bg-white/5 flex items-center justify-center">
                  <Search className="size-3 text-white/40" />
                </div>
                <div className="size-6 rounded-md bg-white/5 flex items-center justify-center">
                  <Bell className="size-3 text-white/40" />
                </div>
                <div className="size-6 rounded-full bg-gradient-to-br from-[#2d7a4f] to-[#1a2744]" />
              </div>
            </div>

            {/* Stat tiles */}
            <div className="grid grid-cols-3 gap-2.5">
              {[
                { label: 'Etudiants actifs', value: '4 218', color: '#2d7a4f', icon: Users },
                { label: 'Taux de reussite', value: '87%', color: '#d4a853', icon: GraduationCap },
                { label: 'Paiements du mois', value: '92%', color: '#1a2744', icon: CreditCard },
              ].map((tile) => (
                <div key={tile.label} className="rounded-lg border border-white/10 bg-white/[0.04] p-2.5">
                  <div
                    className="size-6 rounded-md flex items-center justify-center mb-2"
                    style={{ backgroundColor: `${tile.color}30` }}
                  >
                    <tile.icon className="size-3" style={{ color: tile.color }} />
                  </div>
                  <div className="text-[13px] font-bold text-white tabular-nums">{tile.value}</div>
                  <div className="text-[9px] text-white/40 mt-0.5 leading-tight">{tile.label}</div>
                </div>
              ))}
            </div>

            {/* Chart-like bars */}
            <div className="rounded-lg border border-white/10 bg-white/[0.04] p-3">
              <div className="h-2 w-28 rounded bg-white/15 mb-3" />
              <div className="flex items-end gap-1.5 h-14">
                {[40, 65, 50, 80, 60, 90, 70, 55, 85, 45, 75, 95].map((h, i) => (
                  <div
                    key={i}
                    className="flex-1 rounded-t"
                    style={{
                      height: `${h}%`,
                      backgroundColor: i === 11 ? '#d4a853' : '#2d7a4f',
                      opacity: i === 11 ? 1 : 0.5 + (h / 200),
                    }}
                  />
                ))}
              </div>
            </div>

            {/* List rows */}
            <div className="space-y-1.5">
              {[1, 2, 3].map((row) => (
                <div key={row} className="flex items-center gap-2.5 rounded-md p-1.5">
                  <div className="size-5 rounded-full bg-white/10" />
                  <div className="h-1.5 flex-1 rounded bg-white/10" />
                  <div className="h-1.5 w-10 rounded bg-[#2d7a4f]/40" />
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Floating callout pills */}
      <motion.div
        animate={{ y: [-6, 6, -6] }}
        transition={{ duration: 5, repeat: Infinity, ease: 'easeInOut' }}
        className="hidden lg:flex absolute -left-10 top-16 items-center gap-2 px-3 py-2 rounded-xl bg-white shadow-xl border border-gray-100 text-xs font-medium text-[#1a2744]"
      >
        <div className="size-6 rounded-lg bg-[#2d7a4f15] flex items-center justify-center">
          <CheckCircle2 className="size-3.5 text-[#2d7a4f]" />
        </div>
        Releve genere en 2s
      </motion.div>
      <motion.div
        animate={{ y: [6, -6, 6] }}
        transition={{ duration: 6, repeat: Infinity, ease: 'easeInOut' }}
        className="hidden lg:flex absolute -right-8 bottom-10 items-center gap-2 px-3 py-2 rounded-xl bg-white shadow-xl border border-gray-100 text-xs font-medium text-[#1a2744]"
      >
        <div className="size-6 rounded-lg bg-[#d4a85320] flex items-center justify-center">
          <FileCheck className="size-3.5 text-[#7a5c1f]" />
        </div>
        QR code anti-fraude
      </motion.div>
    </motion.div>
  )
}

// ─── Hero Section ────────────────────────────────────────────────────────────
function HeroSection() {
  const { setView } = useAppStore()

  const stats = [
    { value: 30, suffix: '+', label: 'Modules metier' },
    { value: 100, suffix: '%', label: 'Multi-tenant securise' },
    { value: 15, suffix: '+', label: 'Pays pris en charge' },
  ]

  return (
    <section className="relative min-h-screen flex items-center justify-center overflow-hidden bg-gradient-to-br from-[#1a2744] via-[#1f3158] to-[#1a2744] pb-24">
      {/* Background pattern */}
      <div className="absolute inset-0 opacity-30">
        <div
          className="absolute inset-0"
          style={{
            backgroundImage: `
              linear-gradient(30deg, #2d7a4f11 12%, transparent 12.5%, transparent 87%, #2d7a4f11 87.5%, #2d7a4f11),
              linear-gradient(150deg, #2d7a4f11 12%, transparent 12.5%, transparent 87%, #2d7a4f11 87.5%, #2d7a4f11),
              linear-gradient(30deg, #2d7a4f11 12%, transparent 12.5%, transparent 87%, #2d7a4f11 87.5%, #2d7a4f11),
              linear-gradient(150deg, #2d7a4f11 12%, transparent 12.5%, transparent 87%, #2d7a4f11 87.5%, #2d7a4f11),
              linear-gradient(60deg, #d4a85322 25%, transparent 25.5%, transparent 75%, #d4a85322 75%, #d4a85322),
              linear-gradient(60deg, #d4a85322 25%, transparent 25.5%, transparent 75%, #d4a85322 75%, #d4a85322)
            `,
            backgroundSize: '80px 140px',
            backgroundPosition: '0 0, 0 0, 40px 70px, 40px 70px, 0 0, 40px 70px',
          }}
        />
      </div>

      <DotGridPattern />
      <FloatingElements />
      <Meteors number={12} className="opacity-50" />

      {/* Ambient particles */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        {Array.from({ length: 20 }).map((_, i) => (
          <motion.div
            key={`particle-${i}`}
            className="absolute w-1 h-1 rounded-full bg-white/20"
            style={{
              left: `${10 + (i * 4.2) % 80}%`,
              top: `${15 + (i * 3.7) % 70}%`,
            }}
            animate={{
              y: [-20, 20, -20],
              x: [-10, 10, -10],
              opacity: [0.15, 0.4, 0.15],
            }}
            transition={{
              duration: 8 + (i % 5) * 2,
              repeat: Infinity,
              ease: 'easeInOut',
              delay: i * 0.3,
            }}
          />
        ))}
      </div>

      {/* Floating badge pills */}
      <motion.div
        initial={{ opacity: 0, x: -30 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 1, delay: 1.2 }}
        className="absolute top-[24%] left-[6%] hidden lg:block z-10"
      >
        <motion.div
          animate={{ y: [-6, 6, -6] }}
          transition={{ duration: 4, repeat: Infinity, ease: 'easeInOut' }}
          className="flex items-center gap-2 px-4 py-2 rounded-full bg-white/10 backdrop-blur-sm border border-white/20 text-white/90 text-sm font-medium"
        >
          <span className="text-base" aria-hidden>🌍</span>
          Concu pour l&apos;Afrique
        </motion.div>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, x: 30 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 1, delay: 1.4 }}
        className="absolute top-[18%] right-[6%] hidden lg:block z-10"
      >
        <motion.div
          animate={{ y: [6, -6, 6] }}
          transition={{ duration: 5, repeat: Infinity, ease: 'easeInOut' }}
          className="flex items-center gap-2 px-4 py-2 rounded-full bg-[#2d7a4f]/20 backdrop-blur-sm border border-[#2d7a4f]/30 text-white/90 text-sm font-medium"
        >
          <Sparkles className="size-4 text-[#3da66a]" />
          LMD, classique &amp; sante
        </motion.div>
      </motion.div>

      <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center pt-28">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.2 }}
        >
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-white/10 border border-white/20 text-white/80 text-xs font-medium mb-8">
            <span className="w-2 h-2 rounded-full bg-[#2d7a4f] animate-pulse" />
            Plateforme SaaS pour universites africaines
          </div>
        </motion.div>

        <motion.h1
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.4 }}
          className="text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-bold text-white leading-tight tracking-tight text-balance"
        >
          Digitalisez votre{' '}
          <AuroraText colors={['#2d7a4f', '#3da66a', '#d4a853', '#2d7a4f']} speed={0.7}>
            universite africaine
          </AuroraText>
        </motion.h1>

        <motion.p
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.6 }}
          className="mt-6 max-w-3xl mx-auto text-base sm:text-lg md:text-xl text-white/70 leading-relaxed"
        >
          La plateforme SaaS complete de gestion universitaire, concue pour le terrain africain.
          Scolarite, notes, paiements et documents officiels, dans un seul outil.
        </motion.p>

        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.8 }}
          className="mt-10 flex flex-col sm:flex-row items-center justify-center gap-4"
        >
          <ShimmerButton
            onClick={() => setView('login')}
            background="linear-gradient(135deg, #2d7a4f, #236b40)"
            shimmerColor="#ffffff"
            className="px-8 h-12 text-base font-medium shadow-lg shadow-[#2d7a4f]/30"
          >
            Demarrer gratuitement
            <ArrowRight className="ml-2 size-4" />
          </ShimmerButton>
          <Button
            size="lg"
            className="bg-white/10 border border-white/30 text-white hover:bg-white/20 hover:border-white/50 px-8 text-base h-12"
            onClick={() => {
              document.querySelector('#modules')?.scrollIntoView({ behavior: 'smooth' })
            }}
          >
            Voir la demo
          </Button>
          <Button
            variant="ghost"
            size="lg"
            className="text-white/70 hover:text-white hover:bg-white/10 px-8 text-base h-12"
            onClick={() => toast.info('Video de demonstration', { description: 'Une video sera disponible prochainement' })}
          >
            <div className="w-8 h-8 rounded-full bg-white/15 flex items-center justify-center mr-2">
              <Play className="size-3.5 text-white ml-0.5" />
            </div>
            Voir la demo en video
          </Button>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 1.0 }}
          className="mt-14 flex flex-wrap items-center justify-center gap-4 sm:gap-6"
        >
          {stats.map((stat) => (
            <div
              key={stat.label}
              className="text-center px-4 py-3 rounded-xl bg-white/5 backdrop-blur-sm border border-white/10"
            >
              <div className="text-3xl sm:text-4xl font-bold text-white tabular-nums flex items-center justify-center gap-0.5">
                <NumberTicker value={stat.value} className="text-white" delay={1.2} />
                <span>{stat.suffix}</span>
              </div>
              <div className="text-sm text-white/70 mt-1">{stat.label}</div>
            </div>
          ))}
        </motion.div>

        {/* Product preview mockup */}
        <DashboardPreview />
      </div>

      {/* Bottom wave */}
      <div className="absolute bottom-0 left-0 right-0">
        <svg viewBox="0 0 1440 120" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full">
          <path
            d="M0 120L60 105C120 90 240 60 360 52.5C480 45 600 60 720 67.5C840 75 960 75 1080 67.5C1200 60 1320 45 1380 37.5L1440 30V120H1380C1320 120 1200 120 1080 120C960 120 840 120 720 120C600 120 480 120 360 120C240 120 120 120 60 120H0Z"
            fill="white"
          />
        </svg>
      </div>
    </section>
  )
}

// ─── Segments Bar ────────────────────────────────────────────────────────────
const segments = [
  { icon: Landmark, label: 'Universites publiques' },
  { icon: School, label: 'Facultes privees' },
  { icon: HeartPulse, label: 'Ecoles de sante' },
  { icon: GraduationCap, label: 'Grandes ecoles' },
  { icon: Wrench, label: 'Instituts techniques' },
]

function SegmentsBar() {
  return (
    <section className="bg-white py-10 border-b border-gray-100 overflow-hidden">
      <FadeInSection>
        <p className="text-center text-xs font-semibold text-gray-400 uppercase tracking-wider mb-6 px-4">
          Concu pour tous les etablissements d&apos;enseignement superieur
        </p>
      </FadeInSection>
      <FadeInSection delay={0.1}>
        <Marquee pauseOnHover className="[--duration:32s]">
          {segments.map((seg) => (
            <div
              key={seg.label}
              className="flex items-center gap-2 px-4 py-2 rounded-full border border-gray-100 bg-gray-50/80 text-sm text-gray-600 whitespace-nowrap"
            >
              <seg.icon className="size-4 text-[#2d7a4f]" />
              {seg.label}
            </div>
          ))}
        </Marquee>
      </FadeInSection>
    </section>
  )
}

// ─── Modules Section (bento grid) ────────────────────────────────────────────
const modules = [
  {
    icon: BookOpen,
    title: 'Gestion LMD',
    description: 'Licence, Master, Doctorat avec credits, compensation et rattrapage geres automatiquement.',
    color: '#2d7a4f',
    bgColor: '#2d7a4f15',
    borderColor: '#2d7a4f',
    featured: true,
  },
  {
    icon: UserPlus,
    title: 'Inscriptions',
    description: 'Candidatures, admissions, inscriptions administratives et pedagogiques.',
    color: '#1a2744',
    bgColor: '#1a274415',
    borderColor: '#1a2744',
  },
  {
    icon: GraduationCap,
    title: 'Notes & deliberations',
    description: 'Saisie, calcul automatique, jurys, proces-verbaux.',
    color: '#7a5c1f',
    bgColor: '#d4a85320',
    borderColor: '#d4a853',
  },
  {
    icon: FileText,
    title: 'Documents officiels',
    description: 'Releves, attestations, recus avec QR code anti-fraude.',
    color: '#2d7a4f',
    bgColor: '#2d7a4f15',
    borderColor: '#10b981',
  },
  {
    icon: Heart,
    title: 'Ecoles de sante',
    description: 'Stages hospitaliers, competences cliniques, carnets de stage.',
    color: '#c62828',
    bgColor: '#c6282815',
    borderColor: '#c62828',
  },
  {
    icon: CreditCard,
    title: 'Paiements',
    description: 'Frais de scolarite, recus, suivi financier par etudiant.',
    color: '#1a2744',
    bgColor: '#1a274415',
    borderColor: '#6366f1',
  },
  {
    icon: BarChart3,
    title: 'Statistiques',
    description: 'Tableaux de bord, taux de reussite, rapports exportables.',
    color: '#2d7a4f',
    bgColor: '#2d7a4f15',
    borderColor: '#0ea5e9',
  },
  {
    icon: Building2,
    title: 'Multi-etablissement',
    description: 'Architecture multi-tenant avec isolation stricte des donnees.',
    color: '#7a5c1f',
    bgColor: '#d4a85320',
    borderColor: '#d4a853',
  },
]

function ModulesSection() {
  return (
    <section id="modules" className="py-20 md:py-28 bg-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <FadeInSection>
          <div className="text-center mb-16">
            <span className="inline-block px-3 py-1 text-xs font-semibold text-[#2d7a4f] bg-[#2d7a4f10] rounded-full mb-4">
              Modules
            </span>
            <h2 className="text-3xl sm:text-4xl font-bold text-[#1a2744] text-balance">
              Tout ce dont votre universite a besoin
            </h2>
            <p className="mt-4 max-w-2xl mx-auto text-gray-500 text-base sm:text-lg">
              Une suite complete de modules couvrant tous les aspects de la gestion universitaire
            </p>
          </div>
        </FadeInSection>

        <BentoGrid className="grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 auto-rows-fr gap-5">
          {modules.map((mod, i) => (
            <FadeInSection
              key={mod.title}
              delay={i * 0.06}
              className={mod.featured ? 'sm:col-span-2 lg:col-span-2' : ''}
            >
              <MagicCard
                className="h-full border-gray-100 hover:border-gray-200 transition-colors cursor-pointer"
                gradientColor={mod.color}
                gradientOpacity={0.06}
                gradientFrom={mod.color}
                gradientTo="#d4a853"
              >
                <div className={`relative h-full ${mod.featured ? 'p-7 flex flex-col justify-center' : 'p-6'}`}>
                  <div
                    className="absolute left-0 top-0 bottom-0 w-1"
                    style={{ backgroundColor: mod.borderColor }}
                  />
                  <div
                    className={`rounded-xl flex items-center justify-center mb-4 transition-transform duration-200 group-hover:scale-110 ${mod.featured ? 'w-14 h-14' : 'w-12 h-12'}`}
                    style={{ backgroundColor: mod.bgColor }}
                  >
                    <mod.icon className={mod.featured ? 'size-7' : 'size-6'} style={{ color: mod.color }} />
                  </div>
                  <h3 className={`font-semibold text-[#1a2744] mb-2 ${mod.featured ? 'text-lg' : 'text-base'}`}>
                    {mod.title}
                  </h3>
                  <p className="text-sm text-gray-500 leading-relaxed max-w-md">
                    {mod.description}
                  </p>
                </div>
              </MagicCard>
            </FadeInSection>
          ))}
        </BentoGrid>

        <FadeInSection delay={0.5}>
          <div className="mt-12 text-center">
            <Button
              variant="outline"
              size="lg"
              className="border-[#2d7a4f30] text-[#2d7a4f] hover:bg-[#2d7a4f10] hover:text-[#2d7a4f] px-8"
              onClick={() => { document.querySelector('#african-context')?.scrollIntoView({ behavior: 'smooth' }); toast.info('Modules disponibles', { description: 'Plus de 30 modules fonctionnels' }) }}
            >
              Decouvrir tous les modules
              <ArrowRight className="ml-2 size-4" />
            </Button>
          </div>
        </FadeInSection>
      </div>
    </section>
  )
}

// ─── LMD Section ─────────────────────────────────────────────────────────────
function LMDSection() {
  const lmdLevels = [
    {
      level: 'Licence',
      duration: '3 ans',
      credits: '180 credits',
      description: 'Formation fondamentale et professionnelle',
      color: '#2d7a4f',
      bgColor: '#2d7a4f10',
    },
    {
      level: 'Master',
      duration: '2 ans',
      credits: '120 credits',
      description: 'Specialisation et recherche',
      color: '#1a2744',
      bgColor: '#1a274410',
    },
    {
      level: 'Doctorat',
      duration: '3 ans',
      credits: 'Recherche',
      description: 'Production scientifique originale',
      color: '#7a5c1f',
      bgColor: '#d4a85315',
    },
  ]

  const lmdFeatures = [
    { title: 'Compensation', desc: 'Compensation entre UEs au sein d\'un semestre', icon: ArrowRightLeft },
    { title: 'Rattrapage', desc: 'Sessions de rattrapage et notes de substitution', icon: RefreshCw },
    { title: 'Jury & PV', desc: 'Deliberations, proces-verbaux et decisions de jury', icon: Gavel },
  ]

  return (
    <section id="lmd" className="py-20 md:py-28 bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <FadeInSection>
          <div className="text-center mb-16">
            <span className="inline-block px-3 py-1 text-xs font-semibold text-[#2d7a4f] bg-[#2d7a4f10] rounded-full mb-4">
              Systeme LMD
            </span>
            <h2 className="text-3xl sm:text-4xl font-bold text-[#1a2744] text-balance">
              Gestion complete du systeme LMD
            </h2>
            <p className="mt-4 max-w-2xl mx-auto text-gray-500 text-base sm:text-lg">
              Licence-Master-Doctorat : un cadre harmonise pour l&apos;enseignement superieur africain
            </p>
          </div>
        </FadeInSection>

        <FadeInSection delay={0.1}>
          <div className="max-w-2xl mx-auto mb-10">
            <div className="flex items-center justify-between text-xs font-medium text-gray-500 mb-2">
              <span>180 credits</span>
              <span>300 credits</span>
              <span>Recherche</span>
            </div>
            <div className="relative h-2 bg-gray-200 rounded-full overflow-hidden">
              <div className="absolute inset-0 flex">
                <div className="h-full bg-[#2d7a4f] rounded-l-full" style={{ width: '60%' }} />
                <div className="h-full bg-[#1a2744]" style={{ width: '30%' }} />
                <div className="h-full bg-[#d4a853] rounded-r-full" style={{ width: '10%' }} />
              </div>
            </div>
          </div>
        </FadeInSection>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 md:gap-8 relative">
          {lmdLevels.map((item, i) => (
            <FadeInSection key={item.level} delay={i * 0.15}>
              <div className="relative bg-white rounded-2xl p-8 border border-gray-100 text-center group hover:shadow-lg transition-shadow h-full">
                <div
                  className="w-16 h-16 rounded-2xl mx-auto flex items-center justify-center mb-6"
                  style={{ backgroundColor: item.bgColor }}
                >
                  <GraduationCap className="size-8" style={{ color: item.color }} />
                </div>
                <h3 className="text-2xl font-bold mb-2" style={{ color: item.color }}>
                  {item.level}
                </h3>
                <div className="flex items-center justify-center gap-4 mb-4">
                  <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-700">
                    {item.duration}
                  </span>
                  <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-700">
                    {item.credits}
                  </span>
                </div>
                <p className="text-sm text-gray-500">{item.description}</p>

                {i < 2 && (
                  <div className="hidden md:flex absolute -right-4 top-1/2 -translate-y-1/2 z-10">
                    <motion.div
                      animate={{ x: [0, 4, 0] }}
                      transition={{ duration: 1.5, repeat: Infinity, ease: 'easeInOut' }}
                      className="w-8 h-8 flex items-center justify-center bg-white rounded-full border border-gray-200 shadow-sm"
                    >
                      <ChevronRight className="size-4 text-gray-400" />
                    </motion.div>
                  </div>
                )}
              </div>
            </FadeInSection>
          ))}
        </div>

        <FadeInSection delay={0.4}>
          <div className="mt-12 grid grid-cols-1 sm:grid-cols-3 gap-4">
            {lmdFeatures.map((feature) => (
              <div
                key={feature.title}
                className="flex items-start gap-3 p-4 rounded-lg bg-white border border-gray-100"
              >
                <div className="w-8 h-8 rounded-lg bg-[#2d7a4f10] flex items-center justify-center shrink-0 mt-0.5">
                  <feature.icon className="size-4 text-[#2d7a4f]" />
                </div>
                <div>
                  <p className="font-semibold text-sm text-[#1a2744]">{feature.title}</p>
                  <p className="text-xs text-gray-500 mt-1">{feature.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </FadeInSection>
      </div>
    </section>
  )
}

// ─── Health Schools Section ──────────────────────────────────────────────────
function HealthSection() {
  const healthPrograms = [
    { icon: Stethoscope, label: 'Medecine' },
    { icon: Pill, label: 'Pharmacie' },
    { icon: Syringe, label: 'Soins infirmiers' },
    { icon: Baby, label: 'Sages-femmes' },
    { icon: Microscope, label: 'Laborantins' },
    { icon: Activity, label: 'Kinesitherapie' },
  ]

  const healthFeatures = [
    { icon: FileText, title: 'Carnet de stage numerique', desc: 'Suivi complet des stages hospitaliers' },
    { icon: CheckCircle2, title: 'Competences cliniques', desc: 'Evaluation et validation des competences' },
    { icon: Clock, title: 'Gardes & astreintes', desc: 'Planification et suivi des gardes' },
    { icon: Building2, title: 'Hopitaux partenaires', desc: 'Gestion des conventions hospitalieres' },
  ]

  return (
    <section className="py-20 md:py-28 bg-white relative overflow-hidden">
      <div className="absolute inset-0 bg-gradient-to-br from-[#2d7a4f]/5 via-transparent to-teal-50/50 pointer-events-none" />
      <div className="absolute top-0 right-0 w-80 h-80 bg-[#2d7a4f]/5 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2 pointer-events-none" />
      <div className="absolute bottom-0 left-0 w-96 h-96 bg-teal-100/30 rounded-full blur-3xl translate-y-1/2 -translate-x-1/2 pointer-events-none" />

      <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <FadeInSection>
          <div className="text-center mb-16">
            <span className="inline-block px-3 py-1 text-xs font-semibold text-[#2d7a4f] bg-[#2d7a4f10] rounded-full mb-4">
              Ecoles de sante
            </span>
            <h2 className="text-3xl sm:text-4xl font-bold text-[#1a2744] text-balance">
              Gestion specialisee pour les ecoles de sante
            </h2>
            <p className="mt-4 max-w-2xl mx-auto text-gray-500 text-base sm:text-lg">
              Un module dedie pour les filieres medicales et paramedicales
            </p>
          </div>
        </FadeInSection>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
          <FadeInSection>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
              {healthPrograms.map((prog) => (
                <motion.div
                  key={prog.label}
                  whileHover={{ scale: 1.05 }}
                  transition={{ duration: 0.15 }}
                  className="flex flex-col items-center gap-3 p-5 rounded-xl bg-gradient-to-br from-[#2d7a4f08] to-[#1a274408] border border-[#2d7a4f10] hover:border-[#2d7a4f25] transition-colors relative"
                >
                  <div className="absolute -top-2 -right-2 w-5 h-5 rounded-full bg-[#2d7a4f] flex items-center justify-center">
                    <HeartPulse className="size-3 text-white" />
                  </div>
                  <div className="w-12 h-12 rounded-xl bg-[#2d7a4f15] flex items-center justify-center">
                    <prog.icon className="size-6 text-[#2d7a4f]" />
                  </div>
                  <span className="text-sm font-medium text-[#1a2744] text-center">{prog.label}</span>
                </motion.div>
              ))}
            </div>
          </FadeInSection>

          <div className="space-y-4">
            {healthFeatures.map((feat, i) => (
              <FadeInSection key={feat.title} delay={i * 0.1}>
                <div className="flex items-start gap-4 p-4 rounded-xl bg-gray-50 border border-gray-100 hover:border-[#2d7a4f20] transition-colors">
                  <div className="w-10 h-10 rounded-lg bg-[#2d7a4f15] flex items-center justify-center shrink-0">
                    <feat.icon className="size-5 text-[#2d7a4f]" />
                  </div>
                  <div>
                    <p className="font-semibold text-sm text-[#1a2744]">{feat.title}</p>
                    <p className="text-xs text-gray-500 mt-1">{feat.desc}</p>
                  </div>
                </div>
              </FadeInSection>
            ))}

            <FadeInSection delay={0.4}>
              <div className="mt-4">
                <Button
                  className="bg-[#2d7a4f] hover:bg-[#236b40] text-white w-full sm:w-auto"
                  size="lg"
                  onClick={() => toast.success('Demande envoyee', { description: 'Notre equipe vous contactera sous 24h' })}
                >
                  <Stethoscope className="mr-2 size-4" />
                  Demander une demo sante
                  <ArrowRight className="ml-2 size-4" />
                </Button>
              </div>
            </FadeInSection>
          </div>
        </div>
      </div>
    </section>
  )
}

// ─── How It Works Section ────────────────────────────────────────────────────
const onboardingSteps = [
  {
    icon: Settings2,
    title: 'Configuration',
    desc: 'On parametre votre etablissement : facultes, filieres, systeme academique et regles de notation.',
  },
  {
    icon: Upload,
    title: 'Import des donnees',
    desc: 'Import en masse de vos etudiants, enseignants et maquettes via Excel — sans ressaisie.',
  },
  {
    icon: Users,
    title: 'Formation des equipes',
    desc: 'Scolarite, enseignants et administration prennent en main l\'outil avec un accompagnement dedie.',
  },
  {
    icon: Rocket,
    title: 'Lancement',
    desc: 'Votre etablissement est operationnel, avec un support continu pour la suite.',
  },
]

function HowItWorksSection() {
  const containerRef = useRef<HTMLDivElement>(null)
  const step1Ref = useRef<HTMLDivElement>(null)
  const step2Ref = useRef<HTMLDivElement>(null)
  const step3Ref = useRef<HTMLDivElement>(null)
  const step4Ref = useRef<HTMLDivElement>(null)
  const nodeRefs = [step1Ref, step2Ref, step3Ref, step4Ref] as const

  return (
    <section id="how-it-works" className="py-20 md:py-28 bg-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <FadeInSection>
          <div className="text-center mb-16">
            <span className="inline-block px-3 py-1 text-xs font-semibold text-[#2d7a4f] bg-[#2d7a4f10] rounded-full mb-4">
              Mise en route
            </span>
            <h2 className="text-3xl sm:text-4xl font-bold text-[#1a2744] text-balance">
              Comment ca marche
            </h2>
            <p className="mt-4 max-w-2xl mx-auto text-gray-500 text-base sm:text-lg">
              De la configuration au lancement, un parcours pense pour aller vite
            </p>
          </div>
        </FadeInSection>

        <div ref={containerRef} className="relative grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8">
          {onboardingSteps.map((step, i) => (
            <FadeInSection key={step.title} delay={i * 0.12}>
              <div className="relative flex flex-col items-center text-center">
                <div ref={nodeRefs[i]} className="relative z-10 w-14 h-14 rounded-2xl bg-[#1a2744] flex items-center justify-center mb-5 shadow-md">
                  <step.icon className="size-6 text-white" />
                  <div className="absolute -top-2 -right-2 w-6 h-6 rounded-full bg-[#d4a853] text-[#1a2744] text-xs font-bold flex items-center justify-center">
                    {i + 1}
                  </div>
                </div>
                <h3 className="font-semibold text-[#1a2744] mb-2">{step.title}</h3>
                <p className="text-sm text-gray-500 leading-relaxed max-w-[220px]">{step.desc}</p>
              </div>
            </FadeInSection>
          ))}

          <AnimatedBeam
            containerRef={containerRef}
            fromRef={step1Ref}
            toRef={step2Ref}
            pathColor="#e5e7eb"
            pathWidth={2}
            pathOpacity={0.6}
            gradientStartColor="#2d7a4f"
            gradientStopColor="#d4a853"
            duration={3}
            delay={0}
          />
          <AnimatedBeam
            containerRef={containerRef}
            fromRef={step2Ref}
            toRef={step3Ref}
            pathColor="#e5e7eb"
            pathWidth={2}
            pathOpacity={0.6}
            gradientStartColor="#2d7a4f"
            gradientStopColor="#d4a853"
            duration={3}
            delay={0.6}
          />
          <AnimatedBeam
            containerRef={containerRef}
            fromRef={step3Ref}
            toRef={step4Ref}
            pathColor="#e5e7eb"
            pathWidth={2}
            pathOpacity={0.6}
            gradientStartColor="#2d7a4f"
            gradientStopColor="#d4a853"
            duration={3}
            delay={1.2}
          />
        </div>
      </div>
    </section>
  )
}

// ─── Security Section ────────────────────────────────────────────────────────
function SecuritySection() {
  const securityFeatures = [
    { icon: Shield, title: 'Isolation multi-tenant', desc: 'Donnees isolees par etablissement' },
    { icon: Lock, title: 'RBAC', desc: 'Controle d\'acces base sur les roles' },
    { icon: Eye, title: 'Audit logs', desc: 'Tracabilite complete des actions' },
    { icon: FileCheck, title: 'QR code anti-fraude', desc: 'Verification des documents officiels' },
  ]

  const trustBadges = [
    'Isolation stricte des donnees',
    'Chiffrement en transit (SSL)',
    'Sauvegarde automatique',
    'Journal d\'audit complet',
    'Hebergement Postgres manage',
  ]

  return (
    <section id="security" className="relative overflow-hidden py-20 md:py-28 bg-gradient-to-br from-[#1a2744] via-[#1f3158] to-[#1a2744] text-white">
      <div className="absolute inset-0 overflow-hidden">
        <Meteors number={20} className="opacity-60" />
      </div>
      <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <FadeInSection>
          <div className="text-center mb-16">
            <span className="inline-block px-3 py-1 text-xs font-semibold text-[#5cc98d] bg-[#2d7a4f10] rounded-full mb-4">
              Securite
            </span>
            <h2 className="text-3xl sm:text-4xl font-bold text-white text-balance">
              Securite et confiance avant tout
            </h2>
            <p className="mt-4 max-w-2xl mx-auto text-white/60 text-base sm:text-lg">
              Protection de vos donnees et bonnes pratiques du secteur, de bout en bout
            </p>
          </div>
        </FadeInSection>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {securityFeatures.map((feat, i) => (
            <FadeInSection key={feat.title} delay={i * 0.1}>
              <div className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-xl p-6 text-center hover:bg-white/10 transition-colors group h-full">
                <div className="w-14 h-14 rounded-2xl bg-[#2d7a4f20] flex items-center justify-center mx-auto mb-4 group-hover:scale-110 transition-transform duration-200">
                  <feat.icon className="size-7 text-[#3da66a]" />
                </div>
                <h3 className="font-semibold text-white mb-2">{feat.title}</h3>
                <p className="text-sm text-white/70">{feat.desc}</p>
              </div>
            </FadeInSection>
          ))}
        </div>

        <FadeInSection delay={0.4}>
          <div className="mt-12 flex flex-wrap items-center justify-center gap-3">
            {trustBadges.map((badge) => (
              <span
                key={badge}
                className="inline-flex items-center px-4 py-2 rounded-full bg-white/5 border border-white/10 text-xs font-medium text-white/70"
              >
                <CheckCircle2 className="size-3 mr-2 text-[#3da66a]" />
                {badge}
              </span>
            ))}
          </div>
        </FadeInSection>
      </div>
    </section>
  )
}

// ─── African Context Section ─────────────────────────────────────────────────
// N'Djamena is the flagship market; the other markers sketch a plausible
// multi-country African footprint alongside it (see "Couverture" figure).
const africaRegion = { lat: { min: -36, max: 39 }, lng: { min: -19, max: 53 } }

const africaMarkers = [
  { lat: 12.1348, lng: 15.0557, size: 0.9 }, // N'Djamena, Tchad
  { lat: 14.7167, lng: -17.4677, size: 0.5 }, // Dakar, Senegal
  { lat: 12.6392, lng: -8.0029, size: 0.5 }, // Bamako, Mali
  { lat: 6.5244, lng: 3.3792, size: 0.5 }, // Lagos, Nigeria
  { lat: 3.848, lng: 11.5021, size: 0.5 }, // Yaounde, Cameroun
  { lat: -4.4419, lng: 15.2663, size: 0.5 }, // Kinshasa, RDC
  { lat: -1.2921, lng: 36.8219, size: 0.5 }, // Nairobi, Kenya
  { lat: 33.5731, lng: -7.5898, size: 0.5 }, // Casablanca, Maroc
]

function AfricanContextSection() {
  const adaptations = [
    {
      icon: Wifi,
      title: 'Faible connexion',
      desc: 'Optimise pour les reseaux a faible debit et les zones a connectivite limitee',
    },
    {
      icon: FileSpreadsheet,
      title: 'Import Excel',
      desc: 'Importation en masse via fichiers Excel pour un demarrage rapide',
    },
    {
      icon: Smartphone,
      title: 'Mobile Money',
      desc: 'Paiements mobiles Orange Money, MTN, Airtel et Moov (en cours de deploiement)',
    },
    {
      icon: Printer,
      title: 'Documents imprimables',
      desc: 'Generation de documents PDF optimises pour impression locale',
    },
    {
      icon: Stamp,
      title: 'Cachets et signatures',
      desc: 'Apposition numerique de cachets et signatures officielles',
    },
    {
      icon: Languages,
      title: 'Multi-langues',
      desc: 'Interface disponible en francais, avec extension possible a d\'autres langues',
    },
  ]

  return (
    <section id="african-context" className="py-20 md:py-28 bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <FadeInSection>
          <div className="text-center mb-16">
            <span className="inline-block px-3 py-1 text-xs font-semibold text-[#7a5c1f] bg-[#d4a85320] rounded-full mb-4">
              Concu pour l&apos;Afrique
            </span>
            <h2 className="text-3xl sm:text-4xl font-bold text-[#1a2744] text-balance">
              Concu pour la realite africaine
            </h2>
            <p className="mt-4 max-w-2xl mx-auto text-gray-500 text-base sm:text-lg">
              UniSahel s&apos;adapte aux contraintes et aux specificites du terrain africain
            </p>
          </div>
        </FadeInSection>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-10 items-center">
          <FadeInSection>
            <div className="relative rounded-2xl bg-white border border-gray-100 p-6 overflow-hidden shadow-sm">
              <DottedMap
                region={africaRegion}
                markers={africaMarkers}
                dotColor="#1a274420"
                markerColor="#2d7a4f"
                dotRadius={0.35}
                pulse
                width={200}
                height={210}
                className="w-full h-auto"
              />
              <div className="flex items-center justify-between text-xs text-gray-400 mt-2 pt-4 border-t border-gray-100">
                <span className="font-medium text-[#1a2744]">15+ pays couverts</span>
                <span className="flex items-center gap-1.5">
                  <span className="size-1.5 rounded-full bg-[#2d7a4f] animate-pulse" />
                  Presence multi-pays
                </span>
              </div>
            </div>
          </FadeInSection>

          <motion.div
            variants={containerVariants}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: '-80px' }}
            className="grid grid-cols-1 sm:grid-cols-2 gap-4"
          >
            {adaptations.map((item) => (
              <FadeInSection key={item.title}>
                <div className="flex items-start gap-3 p-4 bg-white rounded-xl border border-gray-100 hover:border-[#d4a85330] hover:shadow-md transition-all h-full">
                  <div className="w-9 h-9 rounded-lg bg-[#d4a85320] flex items-center justify-center shrink-0">
                    <item.icon className="size-4 text-[#7a5c1f]" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-[#1a2744] text-sm mb-1">{item.title}</h3>
                    <p className="text-xs text-gray-500 leading-relaxed">{item.desc}</p>
                  </div>
                </div>
              </FadeInSection>
            ))}
          </motion.div>
        </div>
      </div>
    </section>
  )
}

// ─── Pricing Section ──────────────────────────────────────────────────────────
// No fabricated fixed prices: this SaaS has no live billing system yet
// (Mobile Money is explicitly "a venir"), so plans are differentiated by
// scope/features with a "devis personnalise" CTA rather than invented figures.
const pricingPlans = [
  {
    name: 'Essentiel',
    tagline: 'Pour demarrer la digitalisation',
    icon: BookOpen,
    features: [
      'Un etablissement, un systeme academique',
      'Gestion des etudiants et des notes',
      'Documents officiels avec QR code',
      'Import Excel',
      'Support par email',
    ],
    highlighted: false,
  },
  {
    name: 'Pro',
    tagline: 'Pour une gestion complete',
    icon: Sparkles,
    features: [
      'Tout Essentiel, plus :',
      'Paiements et suivi financier',
      'Statistiques et rapports avances',
      'Annonces et communication',
      'Support prioritaire',
    ],
    highlighted: true,
  },
  {
    name: 'Enterprise',
    tagline: 'Pour les groupes multi-etablissements',
    icon: Building2,
    features: [
      'Tout Pro, plus :',
      'Multi-etablissement (multi-tenant)',
      'Ecoles de sante et stages hospitaliers',
      'Integrations sur mesure',
      'Accompagnement dedie',
    ],
    highlighted: false,
  },
]

function PricingSection() {
  const { setView } = useAppStore()

  return (
    <section id="pricing" className="py-20 md:py-28 bg-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <FadeInSection>
          <div className="text-center mb-16">
            <span className="inline-block px-3 py-1 text-xs font-semibold text-[#2d7a4f] bg-[#2d7a4f10] rounded-full mb-4">
              Tarifs
            </span>
            <h2 className="text-3xl sm:text-4xl font-bold text-[#1a2744] text-balance">
              Une offre adaptee a votre etablissement
            </h2>
            <p className="mt-4 max-w-2xl mx-auto text-gray-500 text-base sm:text-lg">
              Le perimetre s&apos;adapte a votre taille et vos besoins. Devis personnalise sous 48h.
            </p>
          </div>
        </FadeInSection>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-stretch">
          {pricingPlans.map((plan, i) => (
            <FadeInSection key={plan.name} delay={i * 0.12} className="h-full">
              <div
                className={`relative flex flex-col h-full rounded-2xl p-7 border transition-shadow ${
                  plan.highlighted
                    ? 'border-[#2d7a4f] bg-gradient-to-b from-[#2d7a4f08] to-white shadow-lg scale-[1.02]'
                    : 'border-gray-100 bg-white hover:shadow-md'
                }`}
              >
                {plan.highlighted && (
                  <BorderBeam size={100} duration={6} colorFrom="#2d7a4f" colorTo="#d4a853" />
                )}
                {plan.highlighted && (
                  <span className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-1 rounded-full bg-[#2d7a4f] text-white text-xs font-semibold">
                    Recommande
                  </span>
                )}
                <div
                  className={`w-12 h-12 rounded-xl flex items-center justify-center mb-5 ${
                    plan.highlighted ? 'bg-[#2d7a4f]' : 'bg-[#1a274415]'
                  }`}
                >
                  <plan.icon className={`size-6 ${plan.highlighted ? 'text-white' : 'text-[#1a2744]'}`} />
                </div>
                <h3 className="text-xl font-bold text-[#1a2744]">{plan.name}</h3>
                <p className="text-sm text-gray-500 mt-1 mb-6">{plan.tagline}</p>

                <ul className="space-y-3 flex-1">
                  {plan.features.map((feat) => (
                    <li key={feat} className="flex items-start gap-2.5 text-sm text-gray-600">
                      <CheckCircle2 className="size-4 text-[#2d7a4f] shrink-0 mt-0.5" />
                      {feat}
                    </li>
                  ))}
                </ul>

                <Button
                  className={`w-full mt-7 ${
                    plan.highlighted
                      ? 'bg-[#2d7a4f] hover:bg-[#236b40] text-white'
                      : 'bg-[#1a2744] hover:bg-[#121c33] text-white'
                  }`}
                  onClick={() => setView('login')}
                >
                  Demander un devis
                  <ArrowRight className="ml-2 size-4" />
                </Button>
              </div>
            </FadeInSection>
          ))}
        </div>

        <FadeInSection delay={0.4}>
          <p className="mt-10 text-center text-sm text-gray-400">
            Tous les plans incluent l&apos;hebergement securise et les mises a jour. Aucune carte bancaire requise pour l&apos;essai.
          </p>
        </FadeInSection>
      </div>
    </section>
  )
}

// ─── FAQ Section ──────────────────────────────────────────────────────────────
const faqs = [
  {
    q: 'Ou sont hebergees nos donnees ?',
    a: 'Vos donnees sont hebergees sur une base PostgreSQL managee, avec isolation stricte par etablissement (architecture multi-tenant). Chaque etablissement n\'a acces qu\'a ses propres donnees.',
  },
  {
    q: 'UniSahel fonctionne-t-il avec une connexion internet limitee ?',
    a: 'L\'interface est optimisee pour les reseaux a faible debit courants dans plusieurs regions africaines. Les imports/exports en masse (Excel) permettent aussi de limiter les saisies repetees en ligne.',
  },
  {
    q: 'Peut-on migrer depuis un systeme existant (Excel, papier, autre logiciel) ?',
    a: 'Oui. L\'import Excel en masse couvre les etudiants, enseignants et maquettes pedagogiques pour demarrer rapidement sans ressaisie manuelle.',
  },
  {
    q: 'UniSahel gere-t-il le systeme classique en plus du LMD ?',
    a: 'Oui, la plateforme est concue pour s\'adapter a plusieurs systemes academiques : LMD, systeme classique, et filieres de sante avec leurs regles specifiques.',
  },
  {
    q: 'Le paiement Mobile Money est-il disponible ?',
    a: 'L\'integration Mobile Money (Orange Money, MTN, Airtel, Moov) est en cours de deploiement. Le suivi des paiements et recus est deja disponible.',
  },
  {
    q: 'Un groupe avec plusieurs etablissements peut-il utiliser UniSahel ?',
    a: 'Oui, via l\'offre Enterprise : architecture multi-tenant avec un espace isole et configurable pour chaque etablissement du groupe.',
  },
]

function FAQSection() {
  return (
    <section id="faq" className="py-20 md:py-28 bg-gray-50">
      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
        <FadeInSection>
          <div className="text-center mb-14">
            <span className="inline-block px-3 py-1 text-xs font-semibold text-[#2d7a4f] bg-[#2d7a4f10] rounded-full mb-4">
              FAQ
            </span>
            <h2 className="text-3xl sm:text-4xl font-bold text-[#1a2744] text-balance">
              Questions frequentes
            </h2>
            <p className="mt-4 text-gray-500 text-base sm:text-lg">
              Tout ce qu&apos;il faut savoir avant de se lancer
            </p>
          </div>
        </FadeInSection>

        <FadeInSection delay={0.1}>
          <div className="bg-white rounded-2xl border border-gray-100 px-6 sm:px-8">
            <Accordion type="single" collapsible className="w-full">
              {faqs.map((item, i) => (
                <AccordionItem key={item.q} value={`faq-${i}`}>
                  <AccordionTrigger className="text-left text-sm sm:text-base font-semibold text-[#1a2744] py-5 hover:no-underline">
                    {item.q}
                  </AccordionTrigger>
                  <AccordionContent className="text-sm text-gray-500 leading-relaxed">
                    {item.a}
                  </AccordionContent>
                </AccordionItem>
              ))}
            </Accordion>
          </div>
        </FadeInSection>

        <FadeInSection delay={0.2}>
          <p className="mt-8 text-center text-sm text-gray-500">
            D&apos;autres questions ?{' '}
            <button
              onClick={() => document.querySelector('#footer')?.scrollIntoView({ behavior: 'smooth' })}
              className="text-[#2d7a4f] font-medium hover:underline"
            >
              Contactez-nous
            </button>
          </p>
        </FadeInSection>
      </div>
    </section>
  )
}

// ─── CTA Section ─────────────────────────────────────────────────────────────
function CTASection() {
  const { setView } = useAppStore()

  const trustBadges = [
    { icon: ShieldCheck, label: 'Donnees isolees par etablissement' },
    { icon: Server, label: 'Infrastructure managee' },
    { icon: Headphones, label: 'Support reactif' },
  ]

  return (
    <section className="py-20 md:py-28 bg-gradient-to-br from-[#1a2744] via-[#1f3158] to-[#2d7a4f] relative overflow-hidden">
      <Ripple
        style={{ '--foreground': '#ffffff' } as React.CSSProperties}
        className="opacity-30"
        mainCircleSize={180}
        numCircles={6}
      />
      <div className="absolute top-0 right-0 w-96 h-96 bg-white/5 rounded-full -translate-y-1/2 translate-x-1/2" />
      <div className="absolute bottom-0 left-0 w-72 h-72 bg-white/5 rounded-full translate-y-1/2 -translate-x-1/2" />
      <motion.div
        className="absolute top-[15%] left-[8%] w-20 h-20 border border-white/10 rotate-45"
        animate={{ rotate: [45, 90, 45], scale: [1, 1.1, 1] }}
        transition={{ duration: 8, repeat: Infinity, ease: 'easeInOut' }}
      />
      <motion.div
        className="absolute bottom-[20%] right-[12%] w-16 h-16 border border-[#d4a853]/10 rotate-12"
        animate={{ rotate: [12, -12, 12] }}
        transition={{ duration: 6, repeat: Infinity, ease: 'easeInOut' }}
      />

      <div className="relative z-10 max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
        <FadeInSection>
          <h2 className="text-3xl sm:text-4xl md:text-5xl font-bold text-white leading-tight text-balance">
            Pret a digitaliser votre etablissement ?
          </h2>
          <p className="mt-6 text-lg text-white/70 max-w-2xl mx-auto">
            Configurez votre etablissement en quelques minutes et voyez UniSahel
            fonctionner avec vos propres donnees.
          </p>

          <div className="mt-8 flex flex-wrap items-center justify-center gap-4">
            {trustBadges.map((badge) => (
              <div
                key={badge.label}
                className="flex items-center gap-2 px-4 py-2 rounded-full bg-white/10 backdrop-blur-sm border border-white/15 text-white/80 text-sm"
              >
                <badge.icon className="size-4 text-[#3da66a]" />
                {badge.label}
              </div>
            ))}
          </div>

          <div className="mt-10 flex flex-col sm:flex-row items-center justify-center gap-4">
            <ShimmerButton
              onClick={() => setView('login')}
              background="linear-gradient(135deg, #2d7a4f, #236b40)"
              shimmerColor="#ffffff"
              className="px-10 h-12 text-base font-medium shadow-lg shadow-[#2d7a4f]/30"
            >
              Demarrer gratuitement
              <ArrowRight className="ml-2 size-4" />
            </ShimmerButton>
            <Button
              variant="outline"
              size="lg"
              className="border-white/30 text-white hover:bg-white/10 hover:text-white px-8 text-base h-12"
              onClick={() => setView('login')}
            >
              Nous contacter
            </Button>
          </div>
        </FadeInSection>
      </div>
    </section>
  )
}

// ─── Footer ──────────────────────────────────────────────────────────────────
function Footer() {
  const { setView } = useAppStore()

  const footerLinks: Record<string, { label: string; action: () => void }[]> = {
    Produit: [
      { label: 'Modules', action: () => document.querySelector('#modules')?.scrollIntoView({ behavior: 'smooth' }) },
      { label: 'Comment ca marche', action: () => document.querySelector('#how-it-works')?.scrollIntoView({ behavior: 'smooth' }) },
      { label: 'Tarifs', action: () => document.querySelector('#pricing')?.scrollIntoView({ behavior: 'smooth' }) },
      { label: 'FAQ', action: () => document.querySelector('#faq')?.scrollIntoView({ behavior: 'smooth' }) },
    ],
    Entreprise: [
      { label: 'A propos', action: () => toast.info('A propos', { description: 'Page en cours de developpement' }) },
      { label: 'Blog', action: () => toast.info('Blog', { description: 'Page en cours de developpement' }) },
      { label: 'Carrieres', action: () => toast.info('Carrieres', { description: 'Page en cours de developpement' }) },
    ],
    Support: [
      { label: 'Documentation', action: () => toast.info('Documentation', { description: 'Page en cours de developpement' }) },
      { label: 'Statut du service', action: () => toast.info('Statut du service', { description: 'Page en cours de developpement' }) },
      { label: 'Contact', action: () => document.querySelector('#footer')?.scrollIntoView({ behavior: 'smooth' }) },
    ],
    Legal: [
      { label: 'Confidentialite', action: () => toast.info('Confidentialite', { description: 'Page en cours de developpement' }) },
      { label: 'Conditions', action: () => toast.info('Conditions', { description: 'Page en cours de developpement' }) },
      { label: 'Mentions legales', action: () => toast.info('Mentions legales', { description: 'Page en cours de developpement' }) },
    ],
  }

  const socialLinks = [
    { icon: Twitter, label: 'Twitter', href: '#' },
    { icon: Linkedin, label: 'LinkedIn', href: '#' },
    { icon: Facebook, label: 'Facebook', href: '#' },
  ]

  return (
    <footer id="footer" className="bg-[#1a2744] text-white relative">
      <div className="h-[2px] bg-gradient-to-r from-[#1a2744] via-[#2d7a4f] to-[#d4a853]" />
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <div className="grid grid-cols-1 md:grid-cols-6 gap-10">
          <div className="md:col-span-2">
            <button
              className="flex items-center gap-2 mb-4"
              onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
            >
              <div className="p-1.5 rounded-lg bg-white/10">
                <Shield className="size-5 text-white" />
              </div>
              <span className="text-lg font-bold">
                Uni<span className="text-[#3da66a]">Sahel</span>
              </span>
            </button>
            <p className="text-sm text-white/60 leading-relaxed max-w-xs">
              Plateforme SaaS de gestion universitaire, concue pour les etablissements d&apos;enseignement superieur africains.
            </p>
            <div className="mt-6 space-y-2">
              <div className="flex items-center gap-2 text-sm text-white/60">
                <Mail className="size-4" />
                contact@unisahel.africa
              </div>
              <div className="flex items-center gap-2 text-sm text-white/60">
                <Phone className="size-4" />
                +235 66 00 00 00
              </div>
              <div className="flex items-center gap-2 text-sm text-white/60">
                <MapPin className="size-4" />
                N&apos;Djamena, Tchad
              </div>
            </div>

            <div className="mt-6 flex items-center gap-3">
              {socialLinks.map((social) => (
                <motion.button
                  key={social.label}
                  aria-label={social.label}
                  whileHover={{ scale: 1.1, y: -2 }}
                  whileTap={{ scale: 0.97 }}
                  onClick={() => toast.info(social.label, { description: 'Page en cours de developpement' })}
                  className="w-9 h-9 rounded-lg bg-white/5 border border-white/10 flex items-center justify-center text-white/70 hover:text-[#3da66a] hover:bg-white/10 hover:border-white/20 transition-colors"
                >
                  <social.icon className="size-4" />
                </motion.button>
              ))}
            </div>
          </div>

          {Object.entries(footerLinks).map(([category, links]) => (
            <div key={category}>
              <h4 className="text-sm font-semibold text-white mb-4">{category}</h4>
              <ul className="space-y-2">
                {links.map((link) => (
                  <li key={link.label}>
                    <button
                      onClick={link.action}
                      className="text-sm text-white/60 hover:text-[#3da66a] transition-all duration-200 hover:translate-x-1 inline-block"
                    >
                      {link.label}
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <div className="mt-12 pt-8 border-t border-white/10 flex flex-col sm:flex-row items-center justify-between gap-4">
          <p className="text-sm text-white/60">
            &copy; 2026 UniSahel. Tous droits reserves.
          </p>
          <div className="flex items-center gap-4">
            <motion.button onClick={() => toast.info('Politique de confidentialite')} className="text-white/60 hover:text-[#3da66a] transition-colors text-sm" whileHover={{ y: -1 }}>
              Confidentialite
            </motion.button>
            <motion.button onClick={() => toast.info('Conditions d\'utilisation')} className="text-white/60 hover:text-[#3da66a] transition-colors text-sm" whileHover={{ y: -1 }}>
              Conditions
            </motion.button>
            <motion.button onClick={() => setView('login')} className="text-white/60 hover:text-[#3da66a] transition-colors text-sm" whileHover={{ y: -1 }}>
              Connexion
            </motion.button>
          </div>
          <div className="flex items-center gap-1.5 text-xs text-white/60">
            <Settings className="size-3" />
            Powered by <span className="font-semibold text-white/70">UniSahel</span>
          </div>
        </div>
      </div>
    </footer>
  )
}

// ─── Main Landing Page ───────────────────────────────────────────────────────
export function LandingPage() {
  return (
    <div className="min-h-screen flex flex-col">
      <NavBar />
      <main className="flex-1">
        <HeroSection />
        <SegmentsBar />
        <ModulesSection />
        <LMDSection />
        <HealthSection />
        <HowItWorksSection />
        <SecuritySection />
        <AfricanContextSection />
        <PricingSection />
        <FAQSection />
        <CTASection />
      </main>
      <Footer />
    </div>
  )
}
