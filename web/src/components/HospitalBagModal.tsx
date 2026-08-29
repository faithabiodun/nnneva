import React, { useState } from 'react';
import { X, Play, Check, Plus, PackageCheck, Sparkles, CheckCircle2 } from 'lucide-react';
import { ASSETS } from '../constants';

interface HospitalBagModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const HospitalBagModal: React.FC<HospitalBagModalProps> = ({ isOpen, onClose }) => {
  const [isPlayingVideo, setIsPlayingVideo] = useState(false);
  const [items, setItems] = useState([
    { id: '1', name: 'Comfortable nursing gowns & loose button-down pajamas', category: 'For Mom', packed: true },
    { id: '2', name: 'Postpartum recovery pads & perineal soothing spray', category: 'For Mom', packed: true },
    { id: '3', name: 'Baby going-home outfits (0-3M & Newborn sizes)', category: 'For Baby', packed: true },
    { id: '4', name: 'Installed infant car seat with base inspected', category: 'Essential', packed: true },
    { id: '5', name: 'Snacks, 10ft phone charger cables & reusable water cup', category: 'For Partner', packed: false },
    { id: '6', name: 'Pediatrician contact info & printed birth preferences plan', category: 'Documents', packed: false },
  ]);

  if (!isOpen) return null;

  const toggleItem = (id: string) => {
    setItems((prev) =>
      prev.map((item) => (item.id === id ? { ...item, packed: !item.packed } : item))
    );
  };

  const packedCount = items.filter((i) => i.packed).length;

  return (
    <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white w-full max-w-2xl rounded-3xl p-6 sm:p-8 shadow-2xl border border-[#EDE2DC] max-h-[90vh] overflow-y-auto animate-scale-in">
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-gray-100">
          <div>
            <span className="text-xs font-bold uppercase tracking-wider text-[#D8486A] bg-[#FBECEF] px-2.5 py-0.5 rounded-full">
              Hospital Preparation
            </span>
            <h2 className="text-xl sm:text-2xl font-serif-display text-[#15392B] mt-1">
              What to Pack for the Hospital Bag
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-full text-gray-400 hover:text-gray-700 hover:bg-gray-100 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Video Player Card */}
        <div className="my-5 relative rounded-2xl overflow-hidden aspect-video bg-gray-900 border border-gray-100 shadow-md group">
          <img
            src={ASSETS.hospitalBag}
            alt="Hospital bag packing guide"
            className={`w-full h-full object-cover transition-opacity duration-300 ${
              isPlayingVideo ? 'opacity-30' : 'opacity-85 group-hover:opacity-95'
            }`}
          />
          {!isPlayingVideo ? (
            <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/25">
              <button
                type="button"
                onClick={() => setIsPlayingVideo(true)}
                className="w-16 h-16 rounded-full bg-[#D8486A] hover:bg-[#C23B5A] text-white flex items-center justify-center shadow-xl hover:scale-110 active:scale-95 transition-all duration-200"
              >
                <Play className="w-6 h-6 fill-white ml-1" />
              </button>
              <p className="mt-3 text-white text-xs sm:text-sm font-semibold tracking-wide drop-shadow-md">
                Watch 3-Min Expert Midwife Walkthrough
              </p>
            </div>
          ) : (
            <div className="absolute inset-0 flex flex-col items-center justify-center p-6 text-center text-white bg-black/80">
              <Sparkles className="w-8 h-8 text-rose-400 animate-spin" />
              <p className="mt-2 text-base font-bold">Playing: Nnneva Masterclass: The Essential 3-Trimester Hospital Go-Bag</p>
              <p className="text-xs text-gray-300 mt-1">Guided by Doula Maya & OBGYN Dr. Davis</p>
              <button
                type="button"
                onClick={() => setIsPlayingVideo(false)}
                className="mt-4 text-xs text-rose-300 underline hover:text-white"
              >
                Pause and view checklist
              </button>
            </div>
          )}
        </div>

        {/* Packing Checklist Progress */}
        <div className="my-5 bg-[#FAF5F2] p-5 rounded-2xl border border-[#EDE2DC]">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <PackageCheck className="w-5 h-5 text-[#D8486A]" />
              <h3 className="font-bold text-sm text-[#15392B]">Smart Hospital Packing Checklist</h3>
            </div>
            <span className="text-xs font-bold text-[#D8486A] bg-white px-2.5 py-1 rounded-full border border-[#EDE2DC]">
              {packedCount} of {items.length} packed
            </span>
          </div>

          <div className="space-y-2">
            {items.map((item) => (
              <button
                key={item.id}
                type="button"
                onClick={() => toggleItem(item.id)}
                className={`w-full flex items-center justify-between p-3 rounded-xl text-left text-xs sm:text-sm border transition-all ${
                  item.packed
                    ? 'bg-white border-[#E8DED8] text-gray-400 line-through'
                    : 'bg-white border-[#EDE2DC] text-[#15392B] hover:border-[#D8486A] shadow-xs'
                }`}
              >
                <div className="flex items-center gap-3">
                  <div
                    className={`w-5 h-5 rounded-lg flex items-center justify-center transition-colors ${
                      item.packed ? 'bg-[#1E825A] text-white' : 'border border-gray-300'
                    }`}
                  >
                    {item.packed && <Check className="w-3.5 h-3.5 stroke-[3]" />}
                  </div>
                  <span>{item.name}</span>
                </div>
                <span className="text-[10px] font-semibold text-gray-500 uppercase tracking-wider bg-gray-100 px-2 py-0.5 rounded-md">
                  {item.category}
                </span>
              </button>
            ))}
          </div>
        </div>

        {/* Footer CTA */}
        <div className="flex items-center justify-between pt-2">
          <p className="text-xs text-gray-500">
            Nnneva auto-synchronizes this list with your partner's phone.
          </p>
          <button
            type="button"
            onClick={onClose}
            className="bg-[#15392B] text-white text-xs font-semibold px-5 py-2.5 rounded-xl hover:bg-[#1E4D3B] transition-colors"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
};
