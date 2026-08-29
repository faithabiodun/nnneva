import React, { useState } from 'react';
import { X, Calendar, CheckSquare, Users, Wallet, Plus, Bell, Sparkles } from 'lucide-react';
import { QUICK_TOOLS } from '../constants';
import { useModal } from '../hooks/useModal';

interface ToolDrawerModalProps {
  initialToolId?: string | null;
  isOpen: boolean;
  onClose: () => void;
}

export const ToolDrawerModal: React.FC<ToolDrawerModalProps> = ({
  initialToolId = 'reminders',
  isOpen,
  onClose,
}) => {
  const [selectedTool, setSelectedTool] = useState<string>(initialToolId || 'reminders');

  const { panelRef, onBackdropMouseDown } = useModal(isOpen, onClose);

  if (!isOpen) return null;

  const currentTool = QUICK_TOOLS.find((t) => t.id === selectedTool) || QUICK_TOOLS[0];

  return (
    <div
      className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4"
      onMouseDown={onBackdropMouseDown}
      role="dialog"
      aria-modal="true"
      aria-label="Quick tools"
    >
      <div
        ref={panelRef}
        tabIndex={-1}
        className="bg-white w-full max-w-2xl rounded-3xl p-6 sm:p-8 shadow-2xl border border-[#EDE2DC] max-h-[90vh] overflow-y-auto animate-scale-in">
        {/* Header with Tool Switcher Tabs */}
        <div className="flex items-center justify-between pb-4 border-b border-gray-100">
          <div className="flex items-center gap-2">
            <h2 className="text-xl font-serif-display text-[#15392B]">Nnneva Pregnancy Workspace</h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-full text-gray-400 hover:text-gray-700 hover:bg-gray-100 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* 4 Tabs */}
        <div className="grid grid-cols-4 gap-2 my-4">
          {QUICK_TOOLS.map((tool) => {
            const isActive = selectedTool === tool.id;
            return (
              <button
                key={tool.id}
                type="button"
                onClick={() => setSelectedTool(tool.id)}
                className={`p-3 rounded-2xl flex flex-col items-center gap-1.5 transition-all text-xs font-semibold ${
                  isActive
                    ? 'ring-2 ring-[#D8486A] bg-white shadow-md'
                    : 'bg-[#FAF5F2] hover:bg-[#FBECEF] text-gray-600'
                }`}
              >
                <div
                  className="w-8 h-8 rounded-xl flex items-center justify-center"
                  style={{ backgroundColor: tool.bgColor, color: tool.iconColor }}
                >
                  {tool.iconName === 'calendar' && <Calendar className="w-4 h-4" />}
                  {tool.iconName === 'check-square' && <CheckSquare className="w-4 h-4" />}
                  {tool.iconName === 'users' && <Users className="w-4 h-4" />}
                  {tool.iconName === 'wallet' && <Wallet className="w-4 h-4" />}
                </div>
                <span>{tool.label}</span>
              </button>
            );
          })}
        </div>

        {/* Active Tool Content */}
        <div className="my-4 p-5 rounded-2xl bg-[#FAF5F2] border border-[#EDE2DC]">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-base font-bold text-[#15392B]">{currentTool.title} Overview</h3>
              <p className="text-xs text-gray-600 mt-0.5">{currentTool.description}</p>
            </div>
            <span
              className="text-xs font-bold px-3 py-1 rounded-full border shadow-xs"
              style={{ backgroundColor: currentTool.bgColor, color: currentTool.iconColor, borderColor: '#EDE2DC' }}
            >
              {currentTool.itemsCount}
            </span>
          </div>

          {selectedTool === 'reminders' && (
            <div className="space-y-2.5">
              <div className="p-3 bg-white rounded-xl border border-gray-100 flex items-center justify-between">
                <div>
                  <p className="text-xs font-bold text-[#15392B]">Prenatal DHA & Iron Supplement</p>
                  <p className="text-[11px] text-gray-500">Every morning with breakfast (9:00 AM)</p>
                </div>
                <span className="text-[10px] font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full">Completed</span>
              </div>
              <div className="p-3 bg-white rounded-xl border border-[#F5D5DD] flex items-center justify-between">
                <div>
                  <p className="text-xs font-bold text-[#D8486A]">32-Week Ultrasound & Biophysical Profile</p>
                  <p className="text-[11px] text-gray-500">Tomorrow at 2:30 PM with Dr. Davis (City Maternal Center)</p>
                </div>
                <span className="text-[10px] font-semibold text-[#D8486A] bg-[#FBECEF] px-2 py-0.5 rounded-full">Upcoming</span>
              </div>
              <div className="p-3 bg-white rounded-xl border border-gray-100 flex items-center justify-between">
                <div>
                  <p className="text-xs font-bold text-[#15392B]">20-Min Pelvic Floor Mobility Session</p>
                  <p className="text-[11px] text-gray-500">Tonight at 7:00 PM (Guided audio ready)</p>
                </div>
                <span className="text-[10px] font-semibold text-gray-600 bg-gray-100 px-2 py-0.5 rounded-full">Pending</span>
              </div>
            </div>
          )}

          {selectedTool === 'checklists' && (
            <div className="space-y-2.5">
              <div className="p-3 bg-white rounded-xl border border-gray-100 flex items-center justify-between">
                <p className="text-xs font-semibold text-gray-800">Hospital Go-Bag Essentials</p>
                <span className="text-xs text-[#D8486A] font-bold">85% Complete</span>
              </div>
              <div className="p-3 bg-white rounded-xl border border-gray-100 flex items-center justify-between">
                <p className="text-xs font-semibold text-gray-800">Infant Car Seat Inspection</p>
                <span className="text-xs text-[#1E825A] font-bold">Verified Ready</span>
              </div>
              <div className="p-3 bg-white rounded-xl border border-gray-100 flex items-center justify-between">
                <p className="text-xs font-semibold text-gray-800">Pediatrician Shortlist & Insurance Verification</p>
                <span className="text-xs text-amber-600 font-bold">In Review</span>
              </div>
            </div>
          )}

          {selectedTool === 'family' && (
            <div className="space-y-2.5">
              <div className="p-3 bg-white rounded-xl border border-gray-100 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center font-bold text-xs">M</div>
                  <div>
                    <p className="text-xs font-bold text-gray-800">Marcus (Partner)</p>
                    <p className="text-[11px] text-gray-500">Full Access: Tasks, Hospital Route, Doula Plan</p>
                  </div>
                </div>
                <span className="text-[10px] text-emerald-600 font-semibold bg-emerald-50 px-2 py-0.5 rounded-full">Synced</span>
              </div>
              <div className="p-3 bg-white rounded-xl border border-gray-100 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-rose-100 text-[#D8486A] flex items-center justify-center font-bold text-xs">D</div>
                  <div>
                    <p className="text-xs font-bold text-gray-800">Doula Maya</p>
                    <p className="text-[11px] text-gray-500">Care Plan: Labor support, Breathing coach</p>
                  </div>
                </div>
                <span className="text-[10px] text-emerald-600 font-semibold bg-emerald-50 px-2 py-0.5 rounded-full">On Call</span>
              </div>
            </div>
          )}

          {selectedTool === 'expenses' && (
            <div className="space-y-2.5">
              <div className="p-3 bg-white rounded-xl border border-gray-100 flex items-center justify-between">
                <div>
                  <p className="text-xs font-bold text-gray-800">Nursery Furniture & Bassinet</p>
                  <p className="text-[11px] text-gray-500">Registry purchase (Gifted)</p>
                </div>
                <span className="text-xs font-bold text-gray-800">$680.00</span>
              </div>
              <div className="p-3 bg-white rounded-xl border border-gray-100 flex items-center justify-between">
                <div>
                  <p className="text-xs font-bold text-gray-800">OBGYN Co-insurance & Lab Tests</p>
                  <p className="text-[11px] text-gray-500">BlueCross In-network</p>
                </div>
                <span className="text-xs font-bold text-gray-800">$240.00</span>
              </div>
            </div>
          )}
        </div>

        {/* AI Action */}
        <div className="flex items-center justify-between pt-2">
          <div className="flex items-center gap-2 text-xs text-gray-600">
            <Sparkles className="w-4 h-4 text-[#D8486A]" />
            <span>Nnneva AI automatically coordinates with your medical care team.</span>
          </div>
          <button
            type="button"
            aria-label="Close"
            onClick={onClose}
            className="bg-[#15392B] text-white text-xs font-semibold px-5 py-2.5 rounded-xl hover:bg-[#1E4D3B] transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
