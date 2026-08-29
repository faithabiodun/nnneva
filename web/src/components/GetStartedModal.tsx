import React, { useState } from 'react';
import { X, Sparkles, Heart, CheckCircle2, ArrowRight, ShieldCheck } from 'lucide-react';
import { NnnevaLogo } from './NnnevaLogo';

interface GetStartedModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const GetStartedModal: React.FC<GetStartedModalProps> = ({ isOpen, onClose }) => {
  const [step, setStep] = useState(1);
  const [formData, setFormData] = useState({
    name: 'Amara',
    dueDate: '2026-10-24',
    currentWeek: '32',
    supportGoals: ['Hospital bag & registry', 'OBGYN appointments sync', 'Nutrition & fetal tracker'],
  });
  const [isSuccess, setIsSuccess] = useState(false);

  if (!isOpen) return null;

  const toggleGoal = (goal: string) => {
    setFormData((prev) => ({
      ...prev,
      supportGoals: prev.supportGoals.includes(goal)
        ? prev.supportGoals.filter((g) => g !== goal)
        : [...prev.supportGoals, goal],
    }));
  };

  const handleComplete = (e: React.FormEvent) => {
    e.preventDefault();
    setIsSuccess(true);
    setTimeout(() => {
      setIsSuccess(false);
      onClose();
    }, 1800);
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white w-full max-w-lg rounded-3xl p-6 sm:p-8 shadow-2xl border border-[#EDE2DC] max-h-[90vh] overflow-y-auto animate-scale-in">
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-gray-100">
          <NnnevaLogo size="sm" />
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-full text-gray-400 hover:text-gray-700 hover:bg-gray-100 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {isSuccess ? (
          <div className="py-10 text-center flex flex-col items-center">
            <div className="w-16 h-16 rounded-full bg-[#EBF8F2] text-[#1E825A] flex items-center justify-center mb-4 animate-bounce">
              <CheckCircle2 className="w-8 h-8" />
            </div>
            <h3 className="text-xl font-serif-display text-[#15392B]">
              Welcome to Nnneva, {formData.name}!
            </h3>
            <p className="text-xs sm:text-sm text-gray-600 mt-2 max-w-xs">
              Your AI maternal-care agent is now active and personalizing your 32-week care journey.
            </p>
          </div>
        ) : (
          <form onSubmit={handleComplete} className="mt-4 space-y-4">
            <div>
              <span className="text-xs font-bold uppercase tracking-wider text-[#D8486A]">
                Personalized Care Setup
              </span>
              <h2 className="text-xl font-serif-display text-[#15392B] mt-0.5">
                Start Your Calmer Pregnancy Journey
              </h2>
              <p className="text-xs text-gray-600 mt-1">
                Tell Nnneva where you are in your journey so your agent can shoulder the planning.
              </p>
            </div>

            <div className="space-y-3">
              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">Your Name</label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-[#FAF5F2] border border-[#E8DED8] text-sm focus:outline-none focus:ring-2 focus:ring-[#D8486A]"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1">Current Gestation</label>
                  <select
                    value={formData.currentWeek}
                    onChange={(e) => setFormData({ ...formData, currentWeek: e.target.value })}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-[#FAF5F2] border border-[#E8DED8] text-sm focus:outline-none focus:ring-2 focus:ring-[#D8486A]"
                  >
                    {[...Array(40)].map((_, i) => (
                      <option key={i + 1} value={i + 1}>
                        Week {i + 1}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1">Estimated Due Date</label>
                  <input
                    type="date"
                    value={formData.dueDate}
                    onChange={(e) => setFormData({ ...formData, dueDate: e.target.value })}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-[#FAF5F2] border border-[#E8DED8] text-sm focus:outline-none focus:ring-2 focus:ring-[#D8486A]"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1.5">
                  What would you like Nnneva to handle first?
                </label>
                <div className="space-y-1.5">
                  {[
                    'Hospital bag & registry automation',
                    'OBGYN appointments & ultrasound schedule',
                    'Nutrition, kick tracking & symptom logs',
                    'Partner & Doula task synchronization',
                  ].map((goal) => {
                    const isChecked = formData.supportGoals.includes(goal);
                    return (
                      <button
                        key={goal}
                        type="button"
                        onClick={() => toggleGoal(goal)}
                        className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs border text-left transition-colors ${
                          isChecked
                            ? 'bg-[#FBECEF] border-[#D8486A] text-[#D8486A] font-semibold'
                            : 'bg-[#FAF5F2] border-[#E8DED8] text-gray-700 hover:bg-gray-100'
                        }`}
                      >
                        <span>{goal}</span>
                        {isChecked && <CheckCircle2 className="w-4 h-4 text-[#D8486A]" />}
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>

            <div className="pt-2 flex items-center justify-between">
              <div className="flex items-center gap-1 text-[11px] text-gray-500">
                <ShieldCheck className="w-3.5 h-3.5 text-[#1E825A]" />
                <span>HIPAA & Privacy Compliant</span>
              </div>
              <button
                type="submit"
                className="bg-[#D8486A] hover:bg-[#C23B5A] text-white text-xs font-semibold px-6 py-2.5 rounded-full shadow-md hover:shadow-rose-300 transition-all flex items-center gap-1.5"
              >
                <span>Activate Nnneva</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};
