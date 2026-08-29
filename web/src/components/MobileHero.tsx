import React from 'react';
import { ArrowRight, Play, Plus, Calendar, CheckSquare, Users, Wallet } from 'lucide-react';
import { ASSETS, QUICK_TOOLS } from '../constants';
import { NnnevaEmblem } from './NnnevaLogo';

interface MobileHeroProps {
  onOpenWeekModal: () => void;
  onOpenHospitalBagModal: () => void;
  onOpenToolDrawer: (toolId: string) => void;
  onOpenGetStarted: () => void;
}

export const MobileHero: React.FC<MobileHeroProps> = ({
  onOpenWeekModal,
  onOpenHospitalBagModal,
  onOpenToolDrawer,
  onOpenGetStarted,
}) => {
  return (
    <section
      id="hero-mobile"
      className="flex md:hidden flex-1 w-full h-full flex-col justify-between overflow-hidden relative px-4 pt-1 pb-1 z-10"
    >
      {/* Top Section: Eyebrow + Title + Subtitle */}
      <div className="w-full text-center shrink-0 z-20 flex flex-col items-center">
        <p className="text-[10px] font-bold tracking-widest text-[#D8486A] uppercase">
          FROM PREGNANCY TO MOTHERHOOD
        </p>
        <h1
          id="hero-title-mobile"
          className="font-serif-display text-[#15392B] text-[28px] sm:text-[32px] leading-[1.05] tracking-tight mt-0.5"
        >
          <span className="inline-block animate-word-pop delay-200">You're</span>{' '}
          <span className="inline-block animate-word-pop delay-250">Not</span>{' '}
          <span className="inline-block animate-word-pop delay-300">Alone,</span>{' '}
          <span className="inline-block text-[#D8486A] animate-word-pop delay-350">Nnneva</span>{' '}
          <span className="inline-block animate-word-pop delay-400">Is Here.</span>
        </h1>
        <p className="text-[11px] text-[#3E5249] font-medium mt-1 max-w-xs leading-tight">
          Your AI agent that manages the work around your pregnancy.
        </p>
      </div>

      {/* Two Interactive Cards Side-by-Side */}
      <div className="w-full grid grid-cols-2 gap-2.5 my-1 z-20 shrink-0">
        {/* Left: 32 Weeks Card */}
        <div
          id="card-pregnancy-progress-mobile"
          onClick={onOpenWeekModal}
          className="bg-white/92 backdrop-blur-xs p-2.5 rounded-2xl border border-[#EDE2DC] shadow-md flex flex-col active:scale-95 transition-transform"
        >
          <div className="relative aspect-square w-full rounded-xl overflow-hidden bg-[#FDECEF] p-1 flex items-center justify-center">
            <img
              src={ASSETS.fetalDev32w}
              alt="32 Weeks"
              className="w-full h-full object-cover rounded-lg"
            />
          </div>
          <div className="mt-1.5 flex items-baseline justify-between">
            <span className="text-xs font-bold text-[#D8486A]">32 Weeks</span>
            <span className="text-[10px] text-gray-500">Strong</span>
          </div>
          <div className="w-full h-1 bg-gray-100 rounded-full mt-1 overflow-hidden">
            <div className="h-full bg-[#D8486A] w-[80%]" />
          </div>
          <button
            type="button"
            className="w-full mt-1.5 bg-[#FBECEF] text-[#D8486A] text-[10px] font-semibold py-1 rounded-full flex items-center justify-center gap-1"
          >
            <span>View Week</span>
            <ArrowRight className="w-2.5 h-2.5" />
          </button>
        </div>

        {/* Right: Hospital Bag Card */}
        <div
          id="card-hospital-bag-mobile"
          onClick={onOpenHospitalBagModal}
          className="bg-white/92 backdrop-blur-xs p-2.5 rounded-2xl border border-[#EDE2DC] shadow-md flex flex-col active:scale-95 transition-transform"
        >
          <div className="relative aspect-square w-full rounded-xl overflow-hidden bg-gray-100">
            <img
              src={ASSETS.hospitalBag}
              alt="Hospital Bag"
              className="w-full h-full object-cover"
            />
            <div className="absolute inset-0 flex items-center justify-center bg-black/20">
              <div className="w-7 h-7 rounded-full bg-[#15392B] text-white flex items-center justify-center shadow">
                <Play className="w-3 h-3 fill-white ml-0.5" />
              </div>
            </div>
          </div>
          <p className="mt-1.5 text-[11px] font-semibold text-[#15392B] line-clamp-1">
            Hospital Bag Pack
          </p>
          <div className="mt-auto flex items-center justify-center gap-1 text-[#D8486A] text-[10px] font-semibold bg-[#FBECEF] py-1 rounded-full mt-1.5">
            <Play className="w-2.5 h-2.5 fill-[#D8486A]" />
            <span>Watch Guide</span>
          </div>
        </div>
      </div>

      {/* Quick Tools Row */}
      <div className="w-full flex items-center justify-between bg-white/95 backdrop-blur-xs p-2 rounded-2xl border border-[#EDE2DC] shadow-md z-20 shrink-0">
        <div className="flex items-center gap-1.5">
          <div className="flex -space-x-2">
            <img src={ASSETS.avatars[0]} alt="Mother" className="w-6 h-6 rounded-full object-cover ring-1 ring-white" />
            <div className="w-6 h-6 rounded-full bg-[#15392B] text-white flex items-center justify-center text-[9px] ring-1 ring-white">
              <Plus className="w-3 h-3" />
            </div>
          </div>
          <span className="text-[11px] font-bold text-[#15392B]">50K+ Moms</span>
        </div>

        <div className="h-4 w-px bg-gray-200" />

        <div className="flex items-center gap-1.5">
          {QUICK_TOOLS.map((tool) => (
            <button
              key={tool.id}
              type="button"
              onClick={() => onOpenToolDrawer(tool.id)}
              className="w-7 h-7 rounded-lg flex items-center justify-center text-[10px]"
              style={{ backgroundColor: tool.bgColor, color: tool.iconColor }}
            >
              {tool.iconName === 'calendar' && <Calendar className="w-3.5 h-3.5" />}
              {tool.iconName === 'check-square' && <CheckSquare className="w-3.5 h-3.5" />}
              {tool.iconName === 'users' && <Users className="w-3.5 h-3.5" />}
              {tool.iconName === 'wallet' && <Wallet className="w-3.5 h-3.5" />}
            </button>
          ))}
        </div>
      </div>

      {/* Center Spacer allowing full-screen mother photo */}
      <div className="flex-1 min-h-[60px] pointer-events-none" />

      {/* Bottom Emerald Banner */}
      <div className="w-full bg-[#12392A] text-white p-2.5 rounded-2xl shadow-lg border border-emerald-900 flex items-center justify-between pointer-events-auto z-30 mb-1">
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 rounded-full bg-[#FCE8ED] flex items-center justify-center shrink-0 p-0.5">
            <NnnevaEmblem size={18} />
          </div>
          <span className="font-serif-display text-xs">Calmer Pregnancy</span>
        </div>
        <button
          type="button"
          onClick={onOpenGetStarted}
          className="bg-[#D8486A] text-white text-[10px] font-semibold px-3 py-1.5 rounded-full flex items-center gap-1 active:scale-95"
        >
          <span>Start</span>
          <ArrowRight className="w-3 h-3" />
        </button>
      </div>
    </section>
  );
};
