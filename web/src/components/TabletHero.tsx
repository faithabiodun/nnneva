import React from 'react';
import { ArrowRight, Play, Plus, Calendar, CheckSquare, Users, Wallet } from 'lucide-react';
import { ASSETS, QUICK_TOOLS } from '../constants';
import { NnnevaEmblem } from './NnnevaLogo';
import { Avatar } from './Avatar';

interface TabletHeroProps {
  onOpenWeekModal: () => void;
  onOpenHospitalBagModal: () => void;
  onOpenToolDrawer: (toolId: string) => void;
  onOpenGetStarted: () => void;
}

export const TabletHero: React.FC<TabletHeroProps> = ({
  onOpenWeekModal,
  onOpenHospitalBagModal,
  onOpenToolDrawer,
  onOpenGetStarted,
}) => {
  return (
    <section
      id="hero-tablet"
      className="hidden md:flex lg:hidden relative flex-1 w-full h-full flex-col justify-between overflow-hidden"
    >
      {/* Background Pastel Blobs */}
      <div className="absolute -top-10 -left-10 w-72 h-72 bg-[#FBECEF]/40 rounded-full blur-2xl pointer-events-none -z-10" />

      {/* Top Heading */}
      <div className="w-full px-6 pt-2 text-center z-10 select-none">
        <p className="text-[10px] font-bold tracking-widest text-[#D8486A] uppercase mb-1">
          FROM PREGNANCY TO MOTHERHOOD
        </p>
        <h1 className="font-serif-display text-[#15392B] text-4xl leading-tight tracking-tight">
          <span>You're Not Alone,</span>{' '}
          <span className="text-[#D8486A]">Nnneva</span> <span>Is Here.</span>
        </h1>
        <p className="mt-1 max-w-md mx-auto text-xs text-[#4A5D54]">
          Your AI agent managing the details so you can focus on what truly matters.
        </p>
      </div>

      {/* Left Floating Card: 32 Weeks (Tablet) */}
      <div
        id="card-pregnancy-progress-tablet"
        onClick={onOpenWeekModal}
        className="absolute top-[85px] left-4 z-20 w-[150px] bg-white/95 backdrop-blur-md p-3 rounded-2xl border border-[#EDE2DC] shadow-md cursor-pointer animate-slide-in-left delay-600 hover:scale-105 transition-transform"
      >
        <div className="aspect-square w-full rounded-xl overflow-hidden bg-[#FDECEF] p-1 flex items-center justify-center">
          <img
            src={ASSETS.fetalDev32w}
            alt="32 Weeks"
            className="w-full h-full object-cover rounded-lg"
          />
        </div>
        <div className="mt-2 text-left">
          <div className="flex items-baseline gap-1">
            <span className="text-[#D8486A] text-lg font-bold">32</span>
            <span className="text-[#15392B] text-sm font-bold">Weeks</span>
          </div>
          <p className="text-gray-500 text-[10px] font-medium leading-tight">Growing strong</p>
          <div className="w-full h-1 bg-gray-100 rounded-full mt-1.5 overflow-hidden">
            <div className="h-full bg-[#D8486A] w-[80%]" />
          </div>
          <button
            type="button"
            className="w-full mt-2 bg-[#FBECEF] text-[#D8486A] text-[10px] font-semibold py-1 rounded-full flex items-center justify-center gap-1"
          >
            <span>View Week</span>
            <ArrowRight className="w-3 h-3" />
          </button>
        </div>
      </div>

      {/* Right Floating Card: Hospital Bag (Tablet) */}
      <div
        id="card-hospital-bag-tablet"
        onClick={onOpenHospitalBagModal}
        className="absolute top-[85px] right-4 z-20 w-[150px] bg-white/95 backdrop-blur-md p-3 rounded-2xl border border-[#EDE2DC] shadow-md cursor-pointer animate-slide-in-right delay-700 hover:scale-105 transition-transform"
      >
        <div className="relative aspect-video w-full rounded-xl overflow-hidden bg-gray-100">
          <img
            src={ASSETS.hospitalBag}
            alt="Hospital Bag"
            className="w-full h-full object-cover"
          />
          <div className="absolute inset-0 flex items-center justify-center bg-black/15">
            <div className="w-7 h-7 rounded-full bg-[#15392B] text-white flex items-center justify-center shadow">
              <Play className="w-3 h-3 fill-white ml-0.5" />
            </div>
          </div>
        </div>
        <div className="mt-2 text-left">
          <p className="text-[#15392B] font-semibold text-[11px] leading-tight line-clamp-2">
            Hospital Bag Checklist
          </p>
          <div className="mt-1 flex items-center gap-1 text-[#D8486A] text-[10px] font-semibold">
            <Play className="w-2.5 h-2.5 fill-[#D8486A]" />
            <span>Watch Video</span>
          </div>
        </div>
      </div>

      {/* Center Spacer for full screen photo view */}
      <div className="flex-1 min-h-[140px] pointer-events-none" />

      {/* Bottom Overlays */}
      <div className="w-full pb-3 px-4 flex items-center justify-between gap-2 pointer-events-none z-30">
        {/* Left: 50K+ */}
        <div className="bg-white/95 backdrop-blur-md px-3 py-2 rounded-xl border border-[#EDE2DC] shadow-md flex items-center gap-2 pointer-events-auto">
          <div className="flex -space-x-2">
            <Avatar src={ASSETS.avatars[0]} alt="Mother" className="w-6 h-6 rounded-full object-cover ring-1 ring-white" />
            <div className="w-6 h-6 rounded-full bg-[#15392B] text-white flex items-center justify-center text-[10px] ring-1 ring-white">
              <Plus className="w-3 h-3" />
            </div>
          </div>
          <div>
            <p className="text-xs font-bold text-[#15392B]">50K+ Families</p>
          </div>
        </div>

        {/* Center: Emerald Banner with Pink Emblem */}
        <div className="bg-[#12392A] text-white px-4 py-2 rounded-2xl shadow-lg border border-emerald-900 flex items-center gap-3 pointer-events-auto">
          <div className="w-7 h-7 rounded-full bg-[#FCE8ED] flex items-center justify-center shrink-0 p-0.5">
            <NnnevaEmblem size={22} />
          </div>
          <p className="font-serif-display text-xs text-white">Calmer Motherhood</p>
          <button
            type="button"
            onClick={onOpenGetStarted}
            className="bg-[#D8486A] hover:bg-[#C23B5A] text-white text-[11px] font-semibold px-3 py-1.5 rounded-full flex items-center gap-1"
          >
            <span>Start</span>
            <ArrowRight className="w-3 h-3" />
          </button>
        </div>

        {/* Right: Category icons */}
        <div className="bg-white/95 backdrop-blur-md px-2.5 py-1.5 rounded-xl border border-[#EDE2DC] shadow-md flex items-center gap-2 pointer-events-auto">
          {QUICK_TOOLS.map((t) => (
            <button
              key={t.id}
              type="button"
              onClick={() => onOpenToolDrawer(t.id)}
              className="w-7 h-7 rounded-lg flex items-center justify-center text-[10px]"
              style={{ backgroundColor: t.bgColor, color: t.iconColor }}
            >
              {t.iconName === 'calendar' && <Calendar className="w-3.5 h-3.5" />}
              {t.iconName === 'check-square' && <CheckSquare className="w-3.5 h-3.5" />}
              {t.iconName === 'users' && <Users className="w-3.5 h-3.5" />}
              {t.iconName === 'wallet' && <Wallet className="w-3.5 h-3.5" />}
            </button>
          ))}
        </div>
      </div>
    </section>
  );
};
