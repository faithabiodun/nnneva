import React from 'react';
import { ArrowRight, Play, Plus, Calendar, CheckSquare, Users, Wallet } from 'lucide-react';
import { ASSETS, QUICK_TOOLS } from '../constants';
import { NnnevaEmblem } from './NnnevaLogo';

interface DesktopHeroProps {
  onOpenWeekModal: () => void;
  onOpenHospitalBagModal: () => void;
  onOpenToolDrawer: (toolId: string) => void;
  onOpenGetStarted: () => void;
}

export const DesktopHero: React.FC<DesktopHeroProps> = ({
  onOpenWeekModal,
  onOpenHospitalBagModal,
  onOpenToolDrawer,
  onOpenGetStarted,
}) => {
  return (
    <section
      id="hero-desktop"
      className="hidden lg:flex relative flex-1 w-full h-full flex-col justify-between overflow-hidden"
    >
      {/* Background Organic Pastel Glows */}
      <div className="absolute -top-12 -left-20 w-96 h-96 bg-[#FBECEF]/40 rounded-full blur-3xl pointer-events-none -z-10" />
      <div className="absolute top-1/3 -right-16 w-80 h-80 bg-[#FBECEF]/30 rounded-full blur-3xl pointer-events-none -z-10" />

      {/* Top Heading & Intro Layer */}
      <div className="w-full px-8 xl:px-12 pt-2 xl:pt-4 text-center z-10 select-none relative">
        {/* Eyebrow */}
        <p
          id="hero-eyebrow"
          className="text-[11px] xl:text-xs font-bold tracking-[0.2em] text-[#D8486A] uppercase mb-1.5 animate-fade-in delay-100"
        >
          FROM PREGNANCY TO MOTHERHOOD
        </p>

        {/* Main Title */}
        <h1
          id="hero-title-desktop"
          className="font-serif-display text-[#15392B] text-[clamp(44px,5.2vw,76px)] leading-[1.05] tracking-tight"
        >
          <span className="inline-block animate-word-pop delay-200">You're</span>{' '}
          <span className="inline-block animate-word-pop delay-250">Not</span>{' '}
          <span className="inline-block animate-word-pop delay-300">Alone,</span>
          <br />
          <span className="inline-block text-[#D8486A] animate-word-pop delay-350 drop-shadow-xs">
            Nnneva
          </span>{' '}
          <span className="inline-block animate-word-pop delay-400">Is</span>{' '}
          <span className="inline-block animate-word-pop delay-450">Here.</span>
        </h1>

        {/* Subtitle - No em dashes */}
        <p
          id="hero-subtitle"
          className="mt-2.5 max-w-xl mx-auto text-xs xl:text-sm text-[#3E5249] font-medium leading-relaxed animate-fade-up delay-500"
        >
          Your AI agent that manages the work around your pregnancy, so you can focus on what truly matters.
        </p>
      </div>

      {/* Cursive Floating Note (Left of Center) */}
      <div
        id="hero-handwriting-note"
        className="absolute top-[210px] xl:top-[235px] left-[17%] xl:left-[21%] z-20 pointer-events-none animate-fade-in delay-700 hidden xl:block"
      >
        <div className="transform -rotate-6 bg-white/70 backdrop-blur-xs px-3 py-1.5 rounded-2xl border border-white/60 shadow-xs">
          <p className="font-handwriting text-2xl xl:text-[28px] text-[#15392B] leading-none flex items-center gap-1.5 font-bold">
            <span>Your journey,</span>
          </p>
          <p className="font-handwriting text-2xl xl:text-[28px] text-[#15392B] leading-none flex items-center gap-1.5 font-bold mt-0.5">
            <span>better supported.</span>
            <span className="text-[#D8486A] text-xl">❤️</span>
          </p>
          {/* Subtle curved underline flourish */}
          <svg className="w-28 h-3 text-[#15392B]/50 mt-1" viewBox="0 0 100 12" fill="none">
            <path d="M2 8C30 2 70 2 98 9" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
          </svg>
        </div>
      </div>

      {/* Left Floating Card: 32 Weeks Baby Progress */}
      <div
        id="card-pregnancy-progress"
        onClick={onOpenWeekModal}
        className="absolute top-[30px] xl:top-[40px] left-6 xl:left-12 z-20 w-[clamp(180px,16vw,240px)] bg-white/92 backdrop-blur-md p-4 rounded-3xl border border-[#EDE2DC]/90 shadow-xl hover:shadow-2xl transition-all duration-300 hover:scale-[1.02] cursor-pointer animate-slide-in-left delay-600 group"
      >
        {/* Baby womb visual circle */}
        <div className="relative aspect-square w-full rounded-2xl overflow-hidden bg-gradient-to-b from-[#FDECEF] to-[#F7D4DD] p-2 flex items-center justify-center shadow-inner">
          <img
            src={ASSETS.fetalDev32w}
            alt="32 Weeks Fetus in Womb"
            className="w-full h-full object-cover rounded-xl transition-transform duration-300 group-hover:scale-105"
            referrerPolicy="no-referrer"
          />
        </div>

        {/* Weeks & Growth */}
        <div className="mt-3 text-left">
          <div className="flex items-baseline gap-1.5">
            <span className="text-[#D8486A] text-2xl font-extrabold tracking-tight">32</span>
            <span className="text-[#15392B] text-xl font-bold tracking-tight">Weeks</span>
          </div>
          <p className="text-gray-600 text-[11px] xl:text-xs font-medium mt-0.5">
            Baby is growing strong
          </p>

          {/* Progress Bar */}
          <div className="w-full h-1.5 bg-gray-100 rounded-full mt-2.5 overflow-hidden">
            <div className="h-full bg-gradient-to-r from-[#D8486A] to-[#F27896] rounded-full w-[80%]" />
          </div>

          {/* Action Button */}
          <button
            type="button"
            className="w-full mt-3 bg-[#FBECEF] hover:bg-[#F7D4DD] text-[#D8486A] text-xs font-semibold py-2 px-3 rounded-full flex items-center justify-center gap-1.5 transition-colors group-hover:bg-[#F5CAD4]"
          >
            <span>View This Week</span>
            <ArrowRight className="w-3.5 h-3.5 transition-transform group-hover:translate-x-0.5" />
          </button>
        </div>
      </div>

      {/* Right Floating Card: Hospital Bag Video Guide */}
      <div
        id="card-hospital-bag-video"
        onClick={onOpenHospitalBagModal}
        className="absolute top-[30px] xl:top-[40px] right-6 xl:right-12 z-20 w-[clamp(170px,15vw,220px)] bg-white/92 backdrop-blur-md p-3.5 rounded-3xl border border-[#EDE2DC]/90 shadow-xl hover:shadow-2xl transition-all duration-300 hover:scale-[1.02] cursor-pointer animate-slide-in-right delay-700 group"
      >
        <div className="relative aspect-[4/3] w-full rounded-2xl overflow-hidden bg-gray-100 shadow-inner">
          <img
            src={ASSETS.hospitalBag}
            alt="Hospital bag packing essentials"
            className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
            referrerPolicy="no-referrer"
          />
          {/* Dark Green Play Button */}
          <div className="absolute inset-0 flex items-center justify-center bg-black/15">
            <div className="w-10 h-10 rounded-full bg-[#15392B] hover:bg-[#1E4D3B] text-white flex items-center justify-center shadow-lg transition-transform duration-200 group-hover:scale-110">
              <Play className="w-4 h-4 fill-white ml-0.5" />
            </div>
          </div>
        </div>

        <div className="mt-3 text-left">
          <p className="text-[#15392B] font-semibold text-xs xl:text-sm leading-snug">
            What to Pack for the Hospital Bag
          </p>
          <div className="mt-2 flex items-center gap-1.5 text-[#D8486A] text-[11px] font-semibold">
            <div className="w-4 h-4 rounded-full bg-[#D8486A] text-white flex items-center justify-center">
              <Play className="w-2.5 h-2.5 fill-white ml-0.2" />
            </div>
            <span>Watch on Nnneva</span>
          </div>
        </div>
      </div>

      {/* Spacer to allow full-screen mother photo to be prominently visible */}
      <div className="flex-1 min-h-[220px] pointer-events-none" />

      {/* Bottom 3 Overlay Widgets */}
      <div
        id="hero-bottom-overlays"
        className="w-full pb-4 xl:pb-6 px-6 xl:px-12 flex items-center justify-between gap-4 pointer-events-none z-30"
      >
        {/* Left Overlay: 50K+ Trust Metric */}
        <div
          id="overlay-social-proof"
          className="bg-white/95 backdrop-blur-md px-4 py-3 rounded-2xl border border-[#EDE2DC] shadow-xl flex items-center gap-3.5 pointer-events-auto animate-scale-in delay-900 hover:scale-105 transition-transform"
        >
          {/* Avatar Stack */}
          <div className="flex -space-x-2.5">
            {ASSETS.avatars.map((url, idx) => (
              <img
                key={idx}
                src={url}
                alt="Community Mother"
                className="w-8 h-8 rounded-full object-cover ring-2 ring-white shadow-xs"
                referrerPolicy="no-referrer"
              />
            ))}
            <div className="w-8 h-8 rounded-full bg-[#15392B] text-white flex items-center justify-center ring-2 ring-white shadow-xs">
              <Plus className="w-4 h-4" />
            </div>
          </div>
          <div>
            <p className="text-base xl:text-lg font-extrabold text-[#15392B] leading-none">
              50K+
            </p>
            <p className="text-[10px] xl:text-[11px] text-gray-500 font-medium leading-tight mt-0.5">
              Mothers & Families<br />Trust Nnneva
            </p>
          </div>
        </div>

        {/* Center Overlay: Deep Emerald Green Banner with Pink Nnneva Logo */}
        <div
          id="overlay-center-banner"
          className="bg-[#12392A] text-white px-6 xl:px-8 py-3.5 rounded-3xl shadow-2xl border border-emerald-800/60 flex items-center gap-4 xl:gap-6 pointer-events-auto animate-fade-up delay-1000 relative overflow-hidden"
        >
          {/* Leaf motifs in background */}
          <div className="absolute -left-4 -bottom-4 w-16 h-16 bg-emerald-700/20 rounded-full blur-sm pointer-events-none" />
          <div className="absolute -right-4 -top-4 w-16 h-16 bg-emerald-700/20 rounded-full blur-sm pointer-events-none" />

          {/* Pink Logo Emblem */}
          <div className="w-10 h-10 rounded-full bg-[#FCE8ED] flex items-center justify-center shrink-0 shadow-sm p-1">
            <NnnevaEmblem size={32} />
          </div>

          {/* Text */}
          <div className="text-left">
            <h3 className="font-serif-display text-base xl:text-lg text-white leading-tight font-normal">
              A Smarter, Calmer<br />Motherhood Journey
            </h3>
          </div>

          {/* CTA Pill Button */}
          <button
            type="button"
            id="btn-start-journey-desktop"
            onClick={onOpenGetStarted}
            className="bg-[#D8486A] hover:bg-[#C23B5A] text-white text-xs xl:text-sm font-semibold px-5 xl:px-6 py-2.5 rounded-full shadow-lg hover:shadow-rose-500/30 transition-all duration-200 hover:scale-105 active:scale-95 flex items-center gap-2 shrink-0 group"
          >
            <span>Start Your Journey</span>
            <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-1" />
          </button>
        </div>

        {/* Right Overlay: 4 Category Quick Tools */}
        <div
          id="overlay-category-tools"
          className="bg-white/95 backdrop-blur-md px-4 py-3 rounded-2xl border border-[#EDE2DC] shadow-xl flex items-center gap-3 pointer-events-auto animate-scale-in delay-1100"
        >
          {QUICK_TOOLS.map((tool) => (
            <button
              key={tool.id}
              type="button"
              id={`tool-btn-${tool.id}`}
              onClick={() => onOpenToolDrawer(tool.id)}
              className="flex flex-col items-center gap-1 group focus:outline-none"
            >
              <div
                className="w-10 h-10 rounded-2xl flex items-center justify-center transition-transform duration-200 group-hover:scale-110 shadow-xs"
                style={{ backgroundColor: tool.bgColor, color: tool.iconColor }}
              >
                {tool.iconName === 'calendar' && <Calendar className="w-4 h-4" />}
                {tool.iconName === 'check-square' && <CheckSquare className="w-4 h-4" />}
                {tool.iconName === 'users' && <Users className="w-4 h-4" />}
                {tool.iconName === 'wallet' && <Wallet className="w-4 h-4" />}
              </div>
              <span className="text-[10px] font-semibold text-[#4A5D54] group-hover:text-[#15392B] transition-colors">
                {tool.label}
              </span>
            </button>
          ))}
        </div>
      </div>
    </section>
  );
};
