import React from 'react';
import { X, Bell, Calendar, Sparkles, AlertCircle, HeartHandshake } from 'lucide-react';

interface NotificationsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const NotificationsModal: React.FC<NotificationsModalProps> = ({ isOpen, onClose }) => {
  if (!isOpen) return null;

  const notifications = [
    {
      id: '1',
      type: 'appointment',
      title: 'Upcoming 32-Week OBGYN Ultrasound',
      desc: 'Scheduled tomorrow at 2:30 PM with Dr. Davis. Don’t forget to bring your updated birth preferences list.',
      time: '1 hour ago',
      icon: Calendar,
      color: '#D8486A',
      bgColor: '#FDEEF1',
    },
    {
      id: '2',
      type: 'agent',
      title: 'Nnneva Daily Wellness Check',
      desc: 'Your kick count goal was met yesterday. Remember to stay hydrated and elevate your legs during your evening rest.',
      time: '3 hours ago',
      icon: Sparkles,
      color: '#1E825A',
      bgColor: '#EBF8F2',
    },
    {
      id: '3',
      type: 'partner',
      title: 'Partner Synced: Marcus packed newborn outfits',
      desc: 'Marcus checked off 2 items on the Hospital Bag checklist from his synced mobile app.',
      time: 'Yesterday',
      icon: HeartHandshake,
      color: '#6854C4',
      bgColor: '#F0EEFB',
    },
  ];

  return (
    <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white w-full max-w-md rounded-3xl p-6 shadow-2xl border border-[#EDE2DC] animate-scale-in">
        <div className="flex items-center justify-between pb-3 border-b border-gray-100">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-full bg-[#FDEEF1] text-[#D8486A] flex items-center justify-center">
              <Bell className="w-4 h-4" />
            </div>
            <h3 className="font-bold text-base text-[#15392B]">Pregnancy Care Alerts</h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-full text-gray-400 hover:text-gray-700 hover:bg-gray-100 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="mt-4 space-y-3">
          {notifications.map((n) => {
            const Icon = n.icon;
            return (
              <div
                key={n.id}
                className="p-3.5 rounded-2xl bg-[#FAF5F2] border border-[#EDE2DC] flex items-start gap-3 hover:bg-white hover:shadow-xs transition-all"
              >
                <div
                  className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0"
                  style={{ backgroundColor: n.bgColor, color: n.color }}
                >
                  <Icon className="w-4 h-4" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-baseline justify-between">
                    <p className="text-xs font-bold text-[#15392B] truncate">{n.title}</p>
                    <span className="text-[10px] text-gray-400 shrink-0 ml-1">{n.time}</span>
                  </div>
                  <p className="text-[11px] text-gray-600 mt-1 leading-normal">{n.desc}</p>
                </div>
              </div>
            );
          })}
        </div>

        <div className="mt-5 pt-3 border-t border-gray-100 flex justify-end">
          <button
            type="button"
            onClick={onClose}
            className="text-xs text-[#D8486A] font-semibold hover:underline"
          >
            Mark all as read
          </button>
        </div>
      </div>
    </div>
  );
};
