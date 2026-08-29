import React, { useState } from 'react';
import { X, Sparkles, CheckCircle2, Heart, Scale, Ruler, Activity } from 'lucide-react';
import { ASSETS, WEEK_32_DETAILS } from '../constants';

interface WeekTrackerModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const WeekTrackerModal: React.FC<WeekTrackerModalProps> = ({ isOpen, onClose }) => {
  const [kickCount, setKickCount] = useState(7);
  const [isCounting, setIsCounting] = useState(false);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white w-full max-w-2xl rounded-3xl p-6 sm:p-8 shadow-2xl border border-[#EDE2DC] max-h-[90vh] overflow-y-auto animate-scale-in">
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-gray-100">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-full overflow-hidden bg-rose-50 border-2 border-rose-100">
              <img
                src={ASSETS.fetalDev32w}
                alt="32 Weeks Fetal Development"
                className="w-full h-full object-cover"
              />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold uppercase tracking-wider text-[#D8486A] bg-[#FBECEF] px-2.5 py-0.5 rounded-full">
                  Third Trimester
                </span>
                <span className="text-xs text-gray-500 font-medium">8 Weeks Remaining</span>
              </div>
              <h2 className="text-xl sm:text-2xl font-serif-display text-[#15392B] mt-0.5">
                Week 32: Baby's Growth & Development
              </h2>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-full text-gray-400 hover:text-gray-700 hover:bg-gray-100 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Baby Specs Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 my-6">
          <div className="bg-[#FAF5F2] p-4 rounded-2xl border border-[#EDE2DC] flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-[#FCE8ED] text-[#D8486A] flex items-center justify-center">
              <Scale className="w-5 h-5" />
            </div>
            <div>
              <p className="text-xs text-gray-500 font-medium">Estimated Weight</p>
              <p className="text-base font-bold text-[#15392B]">{WEEK_32_DETAILS.weight}</p>
            </div>
          </div>

          <div className="bg-[#FAF5F2] p-4 rounded-2xl border border-[#EDE2DC] flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-[#EBF8F2] text-[#1E825A] flex items-center justify-center">
              <Ruler className="w-5 h-5" />
            </div>
            <div>
              <p className="text-xs text-gray-500 font-medium">Crown to Heel</p>
              <p className="text-base font-bold text-[#15392B]">{WEEK_32_DETAILS.length}</p>
            </div>
          </div>

          <div className="bg-[#FAF5F2] p-4 rounded-2xl border border-[#EDE2DC] flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-[#F0EEFB] text-[#6854C4] flex items-center justify-center">
              <Heart className="w-5 h-5" />
            </div>
            <div>
              <p className="text-xs text-gray-500 font-medium">Size Comparison</p>
              <p className="text-sm font-bold text-[#15392B] leading-tight">Butternut Squash</p>
            </div>
          </div>
        </div>

        {/* Milestones */}
        <div className="my-5">
          <h3 className="text-sm font-bold uppercase tracking-wider text-[#15392B] mb-3 flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-[#D8486A]" />
            What Baby Is Doing Inside
          </h3>
          <div className="space-y-2.5">
            {WEEK_32_DETAILS.milestones.map((m, i) => (
              <div key={i} className="flex items-start gap-2.5 text-xs sm:text-sm text-gray-700 bg-[#FAF5F2] p-3 rounded-xl">
                <CheckCircle2 className="w-4 h-4 text-[#1E825A] shrink-0 mt-0.5" />
                <span>{m}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Interactive Kick Counter */}
        <div className="my-6 p-4 rounded-2xl bg-gradient-to-r from-[#FBECEF] to-[#FAF5F2] border border-[#F5D5DD]">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Activity className="w-5 h-5 text-[#D8486A]" />
              <div>
                <h4 className="text-sm font-bold text-[#15392B]">Active Kick Session Tracker</h4>
                <p className="text-xs text-gray-600">Doctors recommend 10 distinct movements within 2 hours.</p>
              </div>
            </div>
            <div className="text-right">
              <span className="text-2xl font-extrabold text-[#D8486A]">{kickCount}</span>
              <span className="text-xs text-gray-500 font-semibold"> / 10 kicks</span>
            </div>
          </div>
          <div className="mt-3 flex items-center gap-2">
            <button
              type="button"
              onClick={() => setKickCount((c) => Math.min(10, c + 1))}
              className="flex-1 bg-[#D8486A] hover:bg-[#C23B5A] text-white text-xs font-semibold py-2.5 rounded-xl shadow-xs transition-all active:scale-95 flex items-center justify-center gap-1.5"
            >
              <Heart className="w-3.5 h-3.5 fill-white" />
              <span>Tap on Each Kick</span>
            </button>
            <button
              type="button"
              onClick={() => setKickCount(0)}
              className="text-xs text-gray-500 hover:text-gray-800 px-3 py-2 rounded-xl bg-white border border-gray-200"
            >
              Reset
            </button>
          </div>
        </div>

        {/* Maternal Care Agent Advice */}
        <div className="bg-[#15392B] text-white p-5 rounded-2xl">
          <div className="flex items-center gap-2 text-rose-300 font-semibold text-xs mb-2">
            <Sparkles className="w-4 h-4" />
            <span>Nnneva AI Maternal Tip for Week 32</span>
          </div>
          <p className="text-xs sm:text-sm text-gray-200 leading-relaxed">
            "Your body is producing more relaxin hormone to prepare your pelvis for birth. Try switching to sleeping strictly on your left side with a supportive knee pillow to optimize blood flow to the placenta."
          </p>
        </div>
      </div>
    </div>
  );
};
