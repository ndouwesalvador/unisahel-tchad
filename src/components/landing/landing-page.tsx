'use client'

import { useState, useEffect, useRef } from 'react'
import { toast } from 'sonner'
import { motion, AnimatePresence, useInView } from 'framer-motion'
import { useAppStore } from '@/lib/store'
import { Button } from '@/components/ui/button'
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
  Globe2,
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
} from 'lucide-react'

// ─── Framer Motion Variants for Staggered Animations ─────────────────────────
const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.1,
      delayChildren: 0.1,
    },
  },
} as const

const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.5, ease: 'easeOut' },
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

// ─── Counting Up Animation ───────────────────────────────────────────────────
// eslint-disable-next-line @typescript-eslint/no-unused-vars
function CountUp({ end, duration = 2, suffix = '' }: { end: number; duration?: number; suffix?: string }) {
  const [count, setCount] = useState(0)
  const ref = useRef(null)
  const isInView = useInView(ref, { once: true })
  const hasStarted = useRef(false)

  useEffect(() => {
    if (isInView && !hasStarted.current) {
      hasStarted.current = true
      const startTime = Date.now()
      const step = () => {
        const elapsed = (Date.now() - startTime) / 1000
        const progress = Math.min(elapsed / duration, 1)
        const eased = 1 - Math.pow(1 - progress, 3)
        setCount(Math.floor(eased * end))
        if (progress < 1) {
          requestAnimationFrame(step)
        } else {
          setCount(end)
        }
      }
      requestAnimationFrame(step)
    }
  }, [isInView, end, duration])

  return <span ref={ref}>{count.toLocaleString()}{suffix}</span>
}

// ─── useCountUp Hook (pattern from other pages) ──────────────────────────────
function useCountUp(end: number, duration: number = 1600) {
  const [count, setCount] = useState(0)
  const ref = useRef(null)
  const isInView = useInView(ref, { once: true })
  const hasStarted = useRef(false)

  useEffect(() => {
    if (isInView && !hasStarted.current) {
      hasStarted.current = true
      const startTime = Date.now()
      const step = () => {
        const elapsed = (Date.now() - startTime) / 1000
        const progress = Math.min(elapsed / (duration / 1000), 1)
        const eased = 1 - Math.pow(1 - progress, 3)
        setCount(Math.floor(eased * end))
        if (progress < 1) {
          requestAnimationFrame(step)
        } else {
          setCount(end)
        }
      }
      requestAnimationFrame(step)
    }
  }, [isInView, end, duration])

  return { count, ref }
}

// ─── Animated Stat Card ──────────────────────────────────────────────────────
function AnimatedStat({ value, suffix, label }: { value: number; suffix: string; label: string }) {
  const { count, ref } = useCountUp(value, 1600)
  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className="text-center px-4 py-3 rounded-xl bg-white/5 backdrop-blur-sm border border-white/10"
    >
      <div className="text-3xl sm:text-4xl font-bold text-white">
        {count.toLocaleString()}{suffix}
      </div>
      <div className="text-sm text-white/70 mt-1">{label}</div>
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
      {/* Geometric African-inspired shapes */}
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
function NavBar() {
  const { setView } = useAppStore()
  const [mobileOpen, setMobileOpen] = useState(false)
  const [scrolled, setScrolled] = useState(false)

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 20)
    window.addEventListener('scroll', onScroll)
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  const navLinks = [
    { label: 'Modules', href: '#modules' },
    { label: 'Fonctionnalites', href: '#lmd' },
    { label: 'Securite', href: '#security' },
    { label: 'Tarifs', href: '#african-context' },
    { label: 'Contact', href: '#footer' },
  ]

  const scrollTo = (href: string) => {
    setMobileOpen(false)
    const el = document.querySelector(href)
    if (el) el.scrollIntoView({ behavior: 'smooth' })
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
          <div className="flex items-center gap-2 cursor-pointer" onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}>
            <div className={`p-1.5 rounded-lg ${scrolled ? 'bg-[#1a2744]' : 'bg-white/10'}`}>
              <Shield className={`size-5 ${scrolled ? 'text-white' : 'text-white'}`} />
            </div>
            <span className={`text-lg font-bold tracking-tight ${scrolled ? 'text-[#1a2744]' : 'text-white'}`}>
              Uni<span className={scrolled ? 'text-[#2d7a4f]' : 'text-[#3da66a]'}>Sahel</span>
            </span>
          </div>

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
            className="md:hidden p-2"
            onClick={() => setMobileOpen(!mobileOpen)}
            aria-label="Toggle menu"
          >
            {mobileOpen ? (
              <X className={scrolled ? 'size-5 text-gray-800' : 'size-5 text-white'} />
            ) : (
              <Menu className={scrolled ? 'size-5 text-gray-800' : 'size-5 text-white'} />
            )}
          </button>
        </div>
      </div>

      {/* Mobile Menu */}
      <AnimatePresence>
        {mobileOpen && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="md:hidden bg-white border-t border-gray-100 shadow-lg"
          >
            <div className="px-4 py-4 space-y-2">
              {navLinks.map((link) => (
                <button
                  key={link.href}
                  onClick={() => scrollTo(link.href)}
                  className="block w-full text-left px-3 py-2 text-sm font-medium text-gray-700 hover:text-[#2d7a4f] hover:bg-gray-50 rounded-md"
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
        )}
      </AnimatePresence>
    </motion.nav>
  )
}

// ─── Hero Section ────────────────────────────────────────────────────────────
function HeroSection() {
  const { setView } = useAppStore()

  const stats = [
    { value: 50, suffix: '+', label: 'Institutions' },
    { value: 100000, suffix: '+', label: 'Etudiants' },
    { value: 15, suffix: '+', label: 'Pays' },
  ]

  return (
    <section className="relative min-h-screen flex items-center justify-center overflow-hidden bg-gradient-to-br from-[#1a2744] via-[#1f3158] to-[#1a2744]">
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

      {/* Dot grid overlay */}
      <DotGridPattern />
      <FloatingElements />

      {/* Animated particle dots behind hero text */}
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
        className="absolute top-[28%] left-[6%] hidden lg:block z-10"
      >
        <motion.div
          animate={{ y: [-6, 6, -6] }}
          transition={{ duration: 4, repeat: Infinity, ease: 'easeInOut' }}
          className="flex items-center gap-2 px-4 py-2 rounded-full bg-white/10 backdrop-blur-sm border border-white/20 text-white/90 text-sm font-medium"
        >
          <span className="text-base">🌍</span>
          Concu pour l&apos;Afrique
        </motion.div>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, x: 30 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 1, delay: 1.4 }}
        className="absolute top-[22%] right-[6%] hidden lg:block z-10"
      >
        <motion.div
          animate={{ y: [6, -6, 6] }}
          transition={{ duration: 5, repeat: Infinity, ease: 'easeInOut' }}
          className="flex items-center gap-2 px-4 py-2 rounded-full bg-[#2d7a4f]/20 backdrop-blur-sm border border-[#2d7a4f]/30 text-white/90 text-sm font-medium"
        >
          <Shield className="size-4 text-[#3da66a]" />
          50+ institutions
        </motion.div>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 1, delay: 1.6 }}
        className="absolute bottom-[35%] right-[10%] hidden xl:block z-10"
      >
        <motion.div
          animate={{ y: [-4, 8, -4] }}
          transition={{ duration: 6, repeat: Infinity, ease: 'easeInOut' }}
          className="flex items-center gap-2 px-4 py-2 rounded-full bg-[#d4a853]/15 backdrop-blur-sm border border-[#d4a853]/25 text-white/90 text-sm font-medium"
        >
          <Globe2 className="size-4 text-[#d4a853]" />
          15+ pays couverts
        </motion.div>
      </motion.div>

      <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center pt-24 pb-16">
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
          className="text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-bold text-white leading-tight tracking-tight"
        >
          Digitalisez votre{' '}
          <span className="gradient-text">universite africaine</span>
        </motion.h1>

        <motion.p
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.6 }}
          className="mt-6 max-w-3xl mx-auto text-base sm:text-lg md:text-xl text-white/70 leading-relaxed"
        >
          La plateforme SaaS complete de gestion universitaire, concue pour le terrain africain.
          LMD, classique, ecoles de sante — tout est possible.
        </motion.p>

        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.8 }}
          className="mt-10 flex flex-col sm:flex-row items-center justify-center gap-4"
        >
          <Button
            size="lg"
            onClick={() => setView('login')}
            className="shimmer-button bg-[#2d7a4f] hover:bg-[#236b40] text-white px-8 text-base h-12"
          >
            Demarrer gratuitement
            <ArrowRight className="ml-2 size-4" />
          </Button>
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
            onClick={() => toast.info('Video de démonstration', { description: 'Une vidéo sera disponible prochainement' })}
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
          className="mt-16 flex flex-wrap items-center justify-center gap-4 sm:gap-6"
        >
          {stats.map((stat, idx) => (
            <motion.div
              key={stat.label}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 1.2 + idx * 0.15 }}
            >
              <AnimatedStat value={stat.value} suffix={stat.suffix} label={stat.label} />
            </motion.div>
          ))}
        </motion.div>
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

// ─── Modules Section ─────────────────────────────────────────────────────────
const modules = [
  {
    icon: BookOpen,
    title: 'Gestion LMD',
    description: 'Licence, Master, Doctorat avec credits et compensation',
    color: '#2d7a4f',
    bgColor: '#2d7a4f15',
    borderColor: '#2d7a4f',
  },
  {
    icon: UserPlus,
    title: 'Inscriptions',
    description: 'Candidatures, admissions, inscriptions administratives et pedagogiques',
    color: '#1a2744',
    bgColor: '#1a274415',
    borderColor: '#1a2744',
  },
  {
    icon: GraduationCap,
    title: 'Notes & Deliberations',
    description: 'Saisie, calcul automatique, jurys, proces-verbaux',
    color: '#d4a853',
    bgColor: '#d4a85320',
    borderColor: '#d4a853',
  },
  {
    icon: FileText,
    title: 'Documents Officiels',
    description: 'Releves, attestations, recus, QR code anti-fraude',
    color: '#2d7a4f',
    bgColor: '#2d7a4f15',
    borderColor: '#10b981',
  },
  {
    icon: Heart,
    title: 'Ecoles de Sante',
    description: 'Stages hospitaliers, competences cliniques, carnets de stage',
    color: '#c62828',
    bgColor: '#c6282815',
    borderColor: '#c62828',
  },
  {
    icon: CreditCard,
    title: 'Paiements',
    description: 'Frais, recus, Mobile Money, suivi financier',
    color: '#1a2744',
    bgColor: '#1a274415',
    borderColor: '#6366f1',
  },
  {
    icon: BarChart3,
    title: 'Statistiques',
    description: 'Tableaux de bord, taux de reussite, rapports',
    color: '#2d7a4f',
    bgColor: '#2d7a4f15',
    borderColor: '#0ea5e9',
  },
  {
    icon: Building2,
    title: 'Multi-Etablissement',
    description: 'Architecture multi-tenant, isolation des donnees',
    color: '#d4a853',
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
            <h2 className="text-3xl sm:text-4xl font-bold text-[#1a2744]">
              Tout ce dont votre universite a besoin
            </h2>
            <p className="mt-4 max-w-2xl mx-auto text-gray-500 text-base sm:text-lg">
              Une suite complete de modules couvrant tous les aspects de la gestion universitaire
            </p>
          </div>
        </FadeInSection>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {modules.map((mod, i) => (
            <FadeInSection key={mod.title} delay={i * 0.08}>
              <motion.div
                whileHover={{ y: -4, boxShadow: '0 8px 30px rgba(26, 39, 68, 0.12)' }}
                transition={{ duration: 0.25 }}
                className="group relative p-6 rounded-xl border border-gray-100 bg-white cursor-pointer hover:border-gray-200 transition-colors overflow-hidden"
              >
                {/* Left border color accent */}
                <div
                  className="absolute left-0 top-0 bottom-0 w-1 rounded-l-xl"
                  style={{ backgroundColor: mod.borderColor }}
                />
                {/* Gradient bottom border - appears on hover */}
                <div className="absolute bottom-0 left-0 right-0 h-[2px] bg-gradient-to-r from-[#1a2744] via-[#2d7a4f] to-[#d4a853] opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                <div
                  className="w-12 h-12 rounded-xl flex items-center justify-center mb-4 transition-transform group-hover:scale-110"
                  style={{ backgroundColor: mod.bgColor }}
                >
                  <mod.icon className="size-6" style={{ color: mod.color }} />
                </div>
                <h3 className="text-base font-semibold text-[#1a2744] mb-2">
                  {mod.title}
                </h3>
                <p className="text-sm text-gray-500 leading-relaxed">
                  {mod.description}
                </p>
              </motion.div>
            </FadeInSection>
          ))}
        </div>

        {/* Discover all modules button */}
        <FadeInSection delay={0.6}>
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
      totalCredits: 180,
      description: 'Formation fondamentale et professionnelle',
      color: '#2d7a4f',
      bgColor: '#2d7a4f10',
    },
    {
      level: 'Master',
      duration: '2 ans',
      credits: '120 credits',
      totalCredits: 300,
      description: 'Specialisation et recherche',
      color: '#1a2744',
      bgColor: '#1a274410',
    },
    {
      level: 'Doctorat',
      duration: '3 ans',
      credits: 'Recherche',
      totalCredits: 0,
      description: 'Production scientifique originale',
      color: '#d4a853',
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
            <h2 className="text-3xl sm:text-4xl font-bold text-[#1a2744]">
              Gestion complete du systeme LMD
            </h2>
            <p className="mt-4 max-w-2xl mx-auto text-gray-500 text-base sm:text-lg">
              Licence-Master-Doctorat : un cadre harmonise pour l&apos;enseignement superieur africain
            </p>
          </div>
        </FadeInSection>

        {/* Progress indicator bar */}
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
              <div className="relative bg-white rounded-2xl p-8 border border-gray-100 text-center group hover:shadow-lg transition-shadow">
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

                {/* Flow arrow for first two cards */}
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
      {/* Green/teal gradient overlay */}
      <div className="absolute inset-0 bg-gradient-to-br from-[#2d7a4f]/5 via-transparent to-teal-50/50 pointer-events-none" />
      <div className="absolute top-0 right-0 w-80 h-80 bg-[#2d7a4f]/5 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2 pointer-events-none" />
      <div className="absolute bottom-0 left-0 w-96 h-96 bg-teal-100/30 rounded-full blur-3xl translate-y-1/2 -translate-x-1/2 pointer-events-none" />

      <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <FadeInSection>
          <div className="text-center mb-16">
            <span className="inline-block px-3 py-1 text-xs font-semibold text-[#2d7a4f] bg-[#2d7a4f10] rounded-full mb-4">
              Ecoles de Sante
            </span>
            <h2 className="text-3xl sm:text-4xl font-bold text-[#1a2744]">
              Gestion specialisee pour les ecoles de sante
            </h2>
            <p className="mt-4 max-w-2xl mx-auto text-gray-500 text-base sm:text-lg">
              Un module dedie pour les filieres medicales et paramedicales
            </p>
          </div>
        </FadeInSection>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
          {/* Health programs grid */}
          <FadeInSection>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
              {healthPrograms.map((prog) => (
                <motion.div
                  key={prog.label}
                  whileHover={{ scale: 1.05 }}
                  className="flex flex-col items-center gap-3 p-5 rounded-xl bg-gradient-to-br from-[#2d7a4f08] to-[#1a274408] border border-[#2d7a4f10] hover:border-[#2d7a4f25] transition-colors relative"
                >
                  {/* Medical icon badge */}
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

          {/* Health features */}
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

            {/* Health demo CTA */}
            <FadeInSection delay={0.4}>
              <div className="mt-4">
                <Button
                  className="bg-[#2d7a4f] hover:bg-[#236b40] text-white w-full sm:w-auto"
                  size="lg"
                  onClick={() => toast.success('Demande envoyée', { description: 'Notre équipe vous contactera sous 24h' })}
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

// ─── Security Section ────────────────────────────────────────────────────────
function SecuritySection() {
  const securityFeatures = [
    { icon: Shield, title: 'Isolation multi-tenant', desc: 'Donnees isolees par etablissement' },
    { icon: Lock, title: 'RBAC', desc: 'Controle d\'acces base sur les roles' },
    { icon: Eye, title: 'Audit logs', desc: 'Tracabilite complete des actions' },
    { icon: FileCheck, title: 'QR code anti-fraude', desc: 'Verification des documents officiels' },
  ]

  const trustBadges = [
    'RGPD',
    'Chiffrement AES-256',
    'Sauvegarde automatique',
    'Certificat SSL',
    'Conformite locale',
  ]

  return (
    <section id="security" className="py-20 md:py-28 bg-gradient-to-br from-[#1a2744] via-[#1f3158] to-[#1a2744] text-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <FadeInSection>
          <div className="text-center mb-16">
            <span className="inline-block px-3 py-1 text-xs font-semibold text-[#3da66a] bg-[#2d7a4f25] rounded-full mb-4">
              Securite
            </span>
            <h2 className="text-3xl sm:text-4xl font-bold text-white">
              Securite et confiance avant tout
            </h2>
            <p className="mt-4 max-w-2xl mx-auto text-white/60 text-base sm:text-lg">
              Protection de vos donnees et conformite aux normes internationales
            </p>
          </div>
        </FadeInSection>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {securityFeatures.map((feat, i) => (
            <FadeInSection key={feat.title} delay={i * 0.1}>
              <div className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-xl p-6 text-center hover:bg-white/10 transition-colors group">
                <div className="w-14 h-14 rounded-2xl bg-[#2d7a4f20] flex items-center justify-center mx-auto mb-4 group-hover:scale-110 transition-transform">
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
      desc: 'Integration des paiements mobiles : Orange Money, MTN, Airtel, Moov',
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
      desc: 'Interface disponible en Francais, Anglais, Arabe et langues locales',
    },
  ]

  return (
    <section id="african-context" className="py-20 md:py-28 bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <FadeInSection>
          <div className="text-center mb-16">
            <span className="inline-block px-3 py-1 text-xs font-semibold text-[#d4a853] bg-[#d4a85315] rounded-full mb-4">
              Concu pour l&apos;Afrique
            </span>
            <h2 className="text-3xl sm:text-4xl font-bold text-[#1a2744]">
              Concu pour la realite africaine
            </h2>
            <p className="mt-4 max-w-2xl mx-auto text-gray-500 text-base sm:text-lg">
              UniSahel s&apos;adapte aux contraintes et aux specificites du terrain africain
            </p>
          </div>
        </FadeInSection>

        <motion.div
          variants={containerVariants}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: '-80px' }}
          className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6"
        >
          {adaptations.map((item) => (
            <motion.div key={item.title} variants={itemVariants}>
              <div className="flex items-start gap-4 p-6 bg-white rounded-xl border border-gray-100 hover:border-[#d4a85330] hover:shadow-md transition-all group relative overflow-hidden">
                {/* Gradient top bar */}
                <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-[#1a2744] to-[#2d7a4f]" />
                <div className="w-11 h-11 rounded-lg bg-[#d4a85315] flex items-center justify-center shrink-0 group-hover:bg-[#d4a85325] transition-colors">
                  <item.icon className="size-5 text-[#d4a853]" />
                </div>
                <div>
                  <h3 className="font-semibold text-[#1a2744] mb-1">{item.title}</h3>
                  <p className="text-sm text-gray-500 leading-relaxed">{item.desc}</p>
                </div>
              </div>
            </motion.div>
          ))}
        </motion.div>
      </div>
    </section>
  )
}

// ─── CTA Section ─────────────────────────────────────────────────────────────
function CTASection() {
  const { setView } = useAppStore()

  const trustBadges = [
    { icon: ShieldCheck, label: 'RGPD conforme' },
    { icon: Server, label: 'Donnees hebergees en Afrique' },
    { icon: Headphones, label: 'Support 24/7' },
  ]

  return (
    <section className="py-20 md:py-28 bg-gradient-to-br from-[#1a2744] via-[#1f3158] to-[#2d7a4f] relative overflow-hidden">
      {/* Decorative pattern */}
      <div className="absolute inset-0 pointer-events-none opacity-[0.08]">
        <div
          className="absolute inset-0"
          style={{
            backgroundImage: 'radial-gradient(circle, rgba(255,255,255,0.6) 1px, transparent 1px)',
            backgroundSize: '24px 24px',
          }}
        />
      </div>
      {/* Decorative circles */}
      <div className="absolute top-0 right-0 w-96 h-96 bg-white/5 rounded-full -translate-y-1/2 translate-x-1/2" />
      <div className="absolute bottom-0 left-0 w-72 h-72 bg-white/5 rounded-full translate-y-1/2 -translate-x-1/2" />
      {/* Decorative diamond shapes */}
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
          <h2 className="text-3xl sm:text-4xl md:text-5xl font-bold text-white leading-tight">
            Pret a digitaliser votre etablissement ?
          </h2>
          <p className="mt-6 text-lg text-white/70 max-w-2xl mx-auto">
            Rejoignez les dizaines d&apos;universites africaines qui font confiance a UniSahel
            pour moderniser leur gestion.
          </p>

          {/* Trust badges */}
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

          {/* Two CTA buttons side by side */}
          <div className="mt-10 flex flex-col sm:flex-row items-center justify-center gap-4">
            <Button
              size="lg"
              onClick={() => setView('login')}
              className="bg-[#2d7a4f] hover:bg-[#236b40] text-white px-10 text-base h-12"
            >
              Demarrer gratuitement
              <ArrowRight className="ml-2 size-4" />
            </Button>
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
  const footerLinks = {
    Produit: ['Modules', 'Fonctionnalites', 'Tarifs', 'Demo', 'Changelog'],
    Entreprise: ['A propos', 'Equipe', 'Carrieres', 'Blog', 'Presse'],
    Support: ['Documentation', 'API', 'Communaute', 'Status', 'Contact'],
    Legal: ['Confidentialite', 'Conditions', 'RGPD', 'Mentions legales', 'Cookies'],
  }

  const socialLinks = [
    { icon: Twitter, label: 'Twitter', href: '#' },
    { icon: Linkedin, label: 'LinkedIn', href: '#' },
    { icon: Facebook, label: 'Facebook', href: '#' },
  ]

  return (
    <footer id="footer" className="bg-[#1a2744] text-white relative">
      {/* Gradient top border */}
      <div className="h-[2px] bg-gradient-to-r from-[#1a2744] via-[#2d7a4f] to-[#d4a853]" />
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <div className="grid grid-cols-1 md:grid-cols-6 gap-10">
          {/* Brand column */}
          <div className="md:col-span-2">
            <div className="flex items-center gap-2 mb-4">
              <div className="p-1.5 rounded-lg bg-white/10">
                <Shield className="size-5 text-white" />
              </div>
              <span className="text-lg font-bold">
                Uni<span className="text-[#3da66a]">Sahel</span>
              </span>
            </div>
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

            {/* Social media links */}
            <div className="mt-6 flex items-center gap-3">
              {socialLinks.map((social) => (
                <motion.button
                  key={social.label}
                  aria-label={social.label}
                  whileHover={{ scale: 1.1, y: -2 }}
                  onClick={() => toast.info(social.label, { description: 'Page en cours de développement' })}
                  className="w-9 h-9 rounded-lg bg-white/5 border border-white/10 flex items-center justify-center text-white/70 hover:text-[#3da66a] hover:bg-white/10 hover:border-white/20 transition-colors"
                >
                  <social.icon className="size-4" />
                </motion.button>
              ))}
            </div>
          </div>

          {/* Links columns */}
          {Object.entries(footerLinks).map(([category, links]) => (
            <div key={category}>
              <h4 className="text-sm font-semibold text-white mb-4">{category}</h4>
              <ul className="space-y-2">
                {links.map((link) => (
                  <li key={link}>
                    <button
                      onClick={() => toast.info(link, { description: 'Page en cours de développement' })}
                      className="text-sm text-white/60 hover:text-[#3da66a] transition-all duration-200 hover:translate-x-1 inline-block"
                    >
                      {link}
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <div className="mt-12 pt-8 border-t border-white/10 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <p className="text-sm text-white/60">
              &copy; 2025 UniSahel. Tous droits reserves.
            </p>
          </div>
          <div className="flex items-center gap-4">
            <motion.button onClick={() => toast.info('Politique de confidentialité')} className="text-white/60 hover:text-[#3da66a] transition-colors text-sm" whileHover={{ y: -1 }}>
              Confidentialite
            </motion.button>
            <motion.button onClick={() => toast.info("Conditions d'utilisation")} className="text-white/60 hover:text-[#3da66a] transition-colors text-sm" whileHover={{ y: -1 }}>
              Conditions
            </motion.button>
            <motion.button onClick={() => toast.info('Politique des cookies')} className="text-white/60 hover:text-[#3da66a] transition-colors text-sm" whileHover={{ y: -1 }}>
              Cookies
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
        <ModulesSection />
        <LMDSection />
        <HealthSection />
        <SecuritySection />
        <AfricanContextSection />
        <CTASection />
      </main>
      <Footer />
    </div>
  )
}
