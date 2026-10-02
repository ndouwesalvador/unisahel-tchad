'use client'

import { useState } from 'react'
import {
  ArrowRight, BookOpenText, Check, ChevronDown, ClipboardCheck, FileText,
  GraduationCap, Layers3, LockKeyhole, Menu, ShieldCheck, UsersRound, X,
} from 'lucide-react'
import { useAppStore } from '@/lib/store'

const navigation = [
  { label: 'La plateforme', href: '#plateforme' },
  { label: 'Parcours académique', href: '#parcours' },
  { label: 'Accès et sécurité', href: '#securite' },
]

const capabilities = [
  { icon: Layers3, number: '01', title: 'Structure académique', description: 'Organisez vos facultés, filières, programmes, niveaux et unités d’enseignement dans un cadre cohérent.' },
  { icon: UsersRound, number: '02', title: 'Scolarité', description: 'Retrouvez les dossiers étudiants, les inscriptions et les informations utiles au suivi administratif.' },
  { icon: ClipboardCheck, number: '03', title: 'Évaluations', description: 'Saisissez les notes, préparez les délibérations et consultez les résultats selon les droits attribués.' },
  { icon: FileText, number: '04', title: 'Documents', description: 'Établissez les relevés, attestations et procès-verbaux à partir des données de votre établissement.' },
]

const steps = [
  { number: '01', title: 'Construisez votre structure', description: 'Définissez les composantes et les programmes qui correspondent à votre établissement.' },
  { number: '02', title: 'Suivez les parcours', description: 'Rattachez les étudiants à leur cursus, puis gérez les enseignements et les évaluations.' },
  { number: '03', title: 'Produisez les résultats', description: 'Appuyez-vous sur les données enregistrées pour les délibérations et les documents académiques.' },
]

function Brand({ light = false }: { light?: boolean }) {
  return <span className="inline-flex items-center gap-2.5" aria-label="UniSahel">
    <span className={`flex size-9 items-center justify-center rounded-xl ${light ? 'bg-white/10 ring-1 ring-white/20' : 'bg-[#e5f2eb]'}`}>
      <GraduationCap className={`size-5 ${light ? 'text-white' : 'text-[#146a48]'}`} aria-hidden="true" />
    </span>
    <span className={`text-xl font-extrabold tracking-[-0.055em] ${light ? 'text-white' : 'text-[#142b35]'}`}>Uni<span className={light ? 'text-[#88dfab]' : 'text-[#137247]'}>Sahel</span></span>
  </span>
}

function Header() {
  const setView = useAppStore((state) => state.setView)
  const [menuOpen, setMenuOpen] = useState(false)

  return <header className="sticky top-0 z-50 border-b border-[#dce5e5] bg-white/95 backdrop-blur-xl">
    <div className="mx-auto flex h-[76px] max-w-7xl items-center justify-between gap-6 px-5 sm:px-8">
      <a href="#accueil" className="shrink-0 rounded-lg focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#137247]" aria-label="UniSahel, retour à l’accueil"><Brand /></a>
      <nav className="hidden items-center gap-8 lg:flex" aria-label="Navigation principale">
        {navigation.map((item) => <a key={item.href} href={item.href} className="text-sm font-semibold text-[#40545d] transition-colors hover:text-[#116b43] focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#137247]">{item.label}</a>)}
      </nav>
      <div className="hidden items-center gap-3 md:flex">
        <button type="button" onClick={() => setView('login')} className="rounded-xl px-4 py-3 text-sm font-bold text-[#17313a] transition-colors hover:bg-[#eef4f1] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#137247]">Se connecter</button>
        <button type="button" onClick={() => setView('signup')} className="inline-flex min-h-11 items-center gap-2 rounded-xl bg-[#146a48] px-5 text-sm font-bold text-white shadow-[0_8px_20px_rgba(20,106,72,.18)] transition-colors hover:bg-[#0e5438] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#137247]">Créer un établissement <ArrowRight className="size-4" aria-hidden="true" /></button>
      </div>
      <button type="button" className="inline-flex size-11 items-center justify-center rounded-xl border border-[#dce5e5] text-[#17313a] md:hidden" aria-label={menuOpen ? 'Fermer le menu' : 'Ouvrir le menu'} aria-expanded={menuOpen} aria-controls="menu-mobile" onClick={() => setMenuOpen((open) => !open)}>{menuOpen ? <X className="size-5" /> : <Menu className="size-5" />}</button>
    </div>
    {menuOpen && <nav id="menu-mobile" className="border-t border-[#dce5e5] bg-white px-5 pb-5 pt-3 md:hidden" aria-label="Navigation mobile">
      {navigation.map((item) => <a key={item.href} href={item.href} onClick={() => setMenuOpen(false)} className="block rounded-lg px-3 py-3 text-sm font-semibold text-[#17313a] hover:bg-[#eef4f1]">{item.label}</a>)}
      <div className="mt-3 grid gap-2 border-t border-[#dce5e5] pt-4">
        <button type="button" onClick={() => { setMenuOpen(false); setView('login') }} className="min-h-11 rounded-xl border border-[#cbd9d3] text-sm font-bold text-[#17313a]">Se connecter</button>
        <button type="button" onClick={() => { setMenuOpen(false); setView('signup') }} className="min-h-11 rounded-xl bg-[#146a48] px-4 text-sm font-bold text-white">Créer un établissement</button>
      </div>
    </nav>}
  </header>
}

function ProductIllustration() {
  return <div className="relative mx-auto w-full max-w-[560px]" role="img" aria-label="Illustration du parcours académique dans UniSahel">
    <div className="absolute -inset-5 rounded-[2rem] bg-[#71c99d]/10 blur-3xl" aria-hidden="true" />
    <div className="relative overflow-hidden rounded-[22px] border border-white/20 bg-[#f7faf8] shadow-[0_28px_80px_rgba(1,17,24,.34)]">
      <div className="flex h-12 items-center justify-between border-b border-[#dce6e0] bg-white px-5">
        <span className="flex items-center gap-2 text-xs font-extrabold tracking-tight text-[#14373c]"><span className="flex size-6 items-center justify-center rounded-md bg-[#e6f3eb]"><GraduationCap className="size-3.5 text-[#146a48]" /></span> UniSahel</span>
        <span className="rounded-full bg-[#e5f2eb] px-2.5 py-1 text-[10px] font-bold text-[#146a48]">Espace établissement</span>
      </div>
      <div className="grid grid-cols-[94px_1fr] sm:grid-cols-[138px_1fr]">
        <div className="space-y-2 border-r border-[#e2ebe6] bg-[#edf4f0] p-3 sm:p-4" aria-hidden="true">
          {['Vue d’ensemble', 'Structure', 'Étudiants', 'Notes', 'Documents'].map((label, index) => <div key={label} className={`rounded-md px-2 py-2 text-[9px] font-bold sm:text-[11px] ${index === 1 ? 'bg-white text-[#146a48] shadow-sm' : 'text-[#647b76]'}`}>{label}</div>)}
        </div>
        <div className="min-w-0 p-4 sm:p-6">
          <div className="mb-1 text-[9px] font-bold uppercase tracking-[.18em] text-[#557169] sm:text-[10px]">Parcours académique</div>
          <div className="mb-5 text-lg font-extrabold tracking-tight text-[#18343a] sm:text-xl">Une organisation claire</div>
          <div className="space-y-2.5">
            {[
              { icon: Layers3, name: 'Structure et programmes', tag: 'Organiser' },
              { icon: UsersRound, name: 'Dossiers étudiants', tag: 'Suivre' },
              { icon: ClipboardCheck, name: 'Notes et délibérations', tag: 'Évaluer' },
              { icon: FileText, name: 'Documents académiques', tag: 'Éditer' },
            ].map((row, index) => <div key={row.name} className="flex items-center gap-2 rounded-lg border border-[#e4ebe7] bg-white p-2.5 sm:gap-3 sm:p-3">
              <div className="flex size-8 shrink-0 items-center justify-center rounded-md bg-[#e8f4ed] text-[#146a48]"><row.icon className="size-4" /></div>
              <span className="min-w-0 flex-1 text-[10px] font-bold leading-tight text-[#19363a] sm:text-xs">{row.name}</span>
              <span className="hidden text-[10px] font-semibold text-[#607c70] sm:block">{row.tag}</span>
              {index < 3 && <Check className="size-3.5 text-[#258b59]" aria-hidden="true" />}
            </div>)}
          </div>
          <p className="mt-4 text-[10px] leading-relaxed text-[#5c756e] sm:text-xs">Un même fil conducteur, de la structure aux documents.</p>
        </div>
      </div>
    </div>
  </div>
}

function Hero() {
  const setView = useAppStore((state) => state.setView)
  return <section id="accueil" className="relative overflow-hidden bg-[#102c34] text-white">
    <div className="pointer-events-none absolute inset-0 opacity-60" style={{ backgroundImage: 'radial-gradient(circle at 12% 20%, rgba(35,134,92,.32), transparent 35%), radial-gradient(circle at 95% 80%, rgba(38,115,91,.25), transparent 40%)' }} aria-hidden="true" />
    <div className="relative mx-auto grid max-w-7xl items-center gap-14 px-5 py-20 sm:px-8 sm:py-24 lg:grid-cols-[1.02fr_.98fr] lg:gap-10 lg:py-28">
      <div>
        <div className="mb-7 inline-flex items-center gap-2 rounded-full border border-[#80d7a3]/30 bg-[#2b7656]/25 px-3.5 py-2 text-xs font-bold text-[#b5edcb]"><span className="size-1.5 rounded-full bg-[#83e0a9]" /> Gestion de l’enseignement supérieur</div>
        <h1 className="max-w-[730px] text-[clamp(2.5rem,5vw,5.2rem)] font-extrabold leading-[1.12] tracking-[-.045em] text-white">La scolarité, <span className="text-[#91e0ae]">de bout en bout.</span></h1>
        <p className="mt-7 max-w-[590px] text-lg leading-relaxed text-[#d6e5e4] sm:text-xl">UniSahel relie la structure académique, les étudiants, les évaluations et les documents dans un espace de travail unique pour votre établissement.</p>
        <div className="mt-9 flex flex-col gap-3 sm:flex-row sm:items-center">
          <button type="button" onClick={() => setView('signup')} className="inline-flex min-h-13 items-center justify-center gap-2 rounded-xl bg-[#a2ebbd] px-6 py-3.5 text-sm font-extrabold text-[#103d2d] shadow-[0_12px_32px_rgba(4,18,16,.2)] transition-colors hover:bg-[#c0f5d2] focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-white">Créer mon établissement <ArrowRight className="size-4" aria-hidden="true" /></button>
          <a href="#plateforme" className="inline-flex min-h-13 items-center justify-center gap-2 rounded-xl border border-white/30 px-6 py-3.5 text-sm font-bold text-white transition-colors hover:bg-white/10 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-white">Découvrir la plateforme <ChevronDown className="size-4" aria-hidden="true" /></a>
        </div>
        <p className="mt-5 text-sm text-[#bfd5d1]">Déjà inscrit ? <button type="button" onClick={() => setView('login')} className="font-bold text-white underline decoration-[#92e0ae] underline-offset-4 hover:text-[#a2ebbd]">Accéder à mon espace</button></p>
      </div>
      <ProductIllustration />
    </div>
  </section>
}

function SectionHeading({ eyebrow, title, description }: { eyebrow: string; title: string; description: string }) {
  return <div className="max-w-2xl">
    <p className="mb-4 text-xs font-extrabold uppercase tracking-[.18em] text-[#146a48]">{eyebrow}</p>
    <h2 className="text-3xl font-extrabold leading-tight tracking-[-.045em] text-[#16343a] sm:text-4xl lg:text-[2.8rem]">{title}</h2>
    <p className="mt-5 text-base leading-relaxed text-[#475f63] sm:text-lg">{description}</p>
  </div>
}

function Platform() {
  return <section id="plateforme" className="scroll-mt-24 bg-[#f7faf8] py-20 sm:py-28">
    <div className="mx-auto max-w-7xl px-5 sm:px-8">
      <SectionHeading eyebrow="La plateforme" title="Les opérations essentielles, dans le bon ordre." description="Chaque étape s’appuie sur la précédente. Vos équipes travaillent à partir des données réelles de votre établissement, dans un cadre partagé." />
      <div className="mt-12 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {capabilities.map((item) => <article key={item.number} className="rounded-2xl border border-[#dce8e1] bg-white p-6 shadow-[0_8px_30px_rgba(13,48,37,.035)]">
          <div className="mb-9 flex items-start justify-between"><span className="flex size-12 items-center justify-center rounded-xl bg-[#e5f3ea] text-[#146a48]"><item.icon className="size-6" aria-hidden="true" /></span><span className="text-xs font-extrabold tracking-widest text-[#789187]">{item.number}</span></div>
          <h3 className="text-xl font-extrabold tracking-tight text-[#17363b]">{item.title}</h3><p className="mt-3 text-sm leading-relaxed text-[#52686a]">{item.description}</p>
        </article>)}
      </div>
    </div>
  </section>
}

function Journey() {
  return <section id="parcours" className="scroll-mt-24 bg-white py-20 sm:py-28">
    <div className="mx-auto grid max-w-7xl gap-12 px-5 sm:px-8 lg:grid-cols-[.85fr_1.15fr] lg:gap-20">
      <div><SectionHeading eyebrow="Parcours académique" title="De l’organisation aux documents officiels." description="Une progression lisible pour les équipes administratives et pédagogiques, sans multiplier les outils ni ressaisir les mêmes informations." />
        <div className="mt-8 inline-flex items-center gap-2 rounded-full bg-[#edf5f0] px-4 py-2 text-xs font-bold text-[#1b6348]"><BookOpenText className="size-4" aria-hidden="true" /> Une plateforme adaptée à votre structure</div>
      </div>
      <ol className="relative space-y-4 border-l border-[#c9dfd0] pl-6 sm:pl-9">
        {steps.map((step) => <li key={step.number} className="relative rounded-2xl border border-[#e0eae3] bg-[#fbfdfb] p-6 sm:p-7">
          <span className="absolute -left-[33px] top-7 flex size-4 items-center justify-center rounded-full border-4 border-white bg-[#2c9d65] sm:-left-[45px]" aria-hidden="true" />
          <span className="text-xs font-extrabold tracking-widest text-[#17754e]">ÉTAPE {step.number}</span><h3 className="mt-2 text-xl font-extrabold tracking-tight text-[#17363b]">{step.title}</h3><p className="mt-2 text-sm leading-relaxed text-[#52686a] sm:text-base">{step.description}</p>
        </li>)}
      </ol>
    </div>
  </section>
}

function Security() {
  return <section id="securite" className="scroll-mt-24 border-y border-[#dce8e1] bg-[#eaf4ed] py-20 sm:py-24">
    <div className="mx-auto grid max-w-7xl gap-10 px-5 sm:px-8 lg:grid-cols-[1fr_1.1fr] lg:items-center lg:gap-20">
      <SectionHeading eyebrow="Accès et sécurité" title="Chacun travaille dans son périmètre." description="Les espaces et les actions dépendent du rôle de l’utilisateur. Les informations sont rattachées à l’établissement concerné." />
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="rounded-2xl border border-[#cce3d3] bg-white p-6"><ShieldCheck className="size-7 text-[#146a48]" aria-hidden="true" /><h3 className="mt-5 font-extrabold text-[#17363b]">Droits par rôle</h3><p className="mt-2 text-sm leading-relaxed text-[#52686a]">Administration, scolarité, enseignement et étudiants disposent d’espaces adaptés à leurs tâches.</p></div>
        <div className="rounded-2xl border border-[#cce3d3] bg-white p-6"><LockKeyhole className="size-7 text-[#146a48]" aria-hidden="true" /><h3 className="mt-5 font-extrabold text-[#17363b]">Données de l’établissement</h3><p className="mt-2 text-sm leading-relaxed text-[#52686a]">Les dossiers sont consultés dans le contexte de l’établissement auquel ils appartiennent.</p></div>
      </div>
    </div>
  </section>
}

function Closing() {
  const setView = useAppStore((state) => state.setView)
  return <section className="bg-white py-20 sm:py-28"><div className="mx-auto max-w-4xl px-5 text-center sm:px-8">
    <p className="mb-4 text-xs font-extrabold uppercase tracking-[.18em] text-[#146a48]">Commencer</p>
    <h2 className="text-3xl font-extrabold leading-tight tracking-[-.045em] text-[#16343a] sm:text-5xl">Votre établissement mérite une gestion plus claire.</h2>
    <p className="mx-auto mt-5 max-w-2xl text-base leading-relaxed text-[#475f63] sm:text-lg">Créez votre espace et configurez la structure qui correspond réellement à votre organisation.</p>
    <button type="button" onClick={() => setView('signup')} className="mt-8 inline-flex min-h-13 items-center justify-center gap-2 rounded-xl bg-[#146a48] px-7 py-3.5 text-sm font-extrabold text-white transition-colors hover:bg-[#0e5438] focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#137247]">Créer mon établissement <ArrowRight className="size-4" aria-hidden="true" /></button>
  </div></section>
}

function Footer() {
  const setView = useAppStore((state) => state.setView)
  return <footer className="bg-[#102c34] py-12 text-white">
    <div className="mx-auto flex max-w-7xl flex-col gap-8 px-5 sm:px-8 lg:flex-row lg:items-center lg:justify-between">
      <div><Brand light /><p className="mt-4 max-w-sm text-sm leading-relaxed text-[#c4d8d4]">Une plateforme pour organiser la vie académique et administrative de votre établissement.</p></div>
      <nav className="flex flex-wrap gap-x-6 gap-y-3 text-sm font-semibold" aria-label="Navigation de pied de page">
        <a href="#plateforme" className="text-[#d4e6e2] hover:text-white">La plateforme</a><a href="#parcours" className="text-[#d4e6e2] hover:text-white">Parcours académique</a><a href="#securite" className="text-[#d4e6e2] hover:text-white">Accès et sécurité</a><button type="button" onClick={() => setView('login')} className="text-left text-[#d4e6e2] hover:text-white">Connexion</button>
      </nav>
    </div>
    <div className="mx-auto mt-10 max-w-7xl border-t border-white/15 px-5 pt-6 text-xs text-[#b4cbc6] sm:px-8">© {new Date().getFullYear()} UniSahel. Tous droits réservés.</div>
  </footer>
}

export function LandingPage() {
  return <div className="min-h-screen bg-white font-sans antialiased">
    <Header />
    <main><Hero /><Platform /><Journey /><Security /><Closing /></main>
    <Footer />
  </div>
}
