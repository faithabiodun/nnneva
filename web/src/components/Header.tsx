import React, { useState } from 'react';
import { Search, Bell, ChevronDown, Sparkles, X } from 'lucide-react';
import { NnnevaLogo } from './NnnevaLogo';
import { ASSETS, NAV_LINKS } from '../constants';
import { Avatar } from './Avatar';

interface HeaderProps {
  onOpenGetStarted: () => void;
  onOpenNotifications: () => void;
  activeNav: string;
  setActiveNav: (nav: string) => void;
}

export const Header: React.FC<HeaderProps> = ({
  onOpenGetStarted,
  onOpenNotifications,
  activeNav,
  setActiveNav,
}) => {
  const [showSearchModal, setShowSearchModal] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [showProfileMenu, setShowProfileMenu] = useState(false);

  return (
    <>
      <header
        id="nnneva-header"
        className="w-full px-6 lg:px-12 py-3.5 relative z-40 shrink-0 flex items-center justify-between animate-fade-in delay-100"
      >
        {/* Left: Logo */}
        <div className="flex items-center">
          <a
            href="#"
            id="header-logo-link"
            className="block focus:outline-none focus-visible:ring-2 focus-visible:ring-[#D8486A] rounded-xl transition-transform duration-200 hover:scale-[1.02]"
          >
            <NnnevaLogo />
          </a>
        </div>

        {/* Center Nav: Links */}
        <nav
          id="header-nav"
          aria-label="Main navigation"
          className="hidden md:flex items-center gap-1.5 lg:gap-2 bg-white/60 backdrop-blur-md px-3 py-1.5 rounded-full border border-[#EDE2DC]/60 shadow-xs"
        >
          {NAV_LINKS.map((link) => {
            const isActive = activeNav === link.label;
            return (
              <button
                key={link.label}
                type="button"
                id={`nav-link-${link.label.toLowerCase().replace(/\s+/g, '-')}`}
                onClick={() => setActiveNav(link.label)}
                className={`text-sm px-4 py-1.5 rounded-full font-medium transition-all duration-200 ${
                  isActive
                    ? 'bg-[#FBECEF] text-[#D8486A] font-semibold shadow-xs'
                    : 'text-[#4A5D54] hover:text-[#15392B] hover:bg-white/70'
                }`}
              >
                {link.label}
              </button>
            );
          })}
        </nav>

        {/* Right Controls */}
        <div id="header-actions" className="flex items-center gap-2 sm:gap-3">
          {/* Search Button */}
          <button
            type="button"
            id="btn-header-search"
            aria-label="Search maternal care resources"
            onClick={() => setShowSearchModal(true)}
            className="w-10 h-10 rounded-full bg-white/80 hover:bg-white text-[#2C4A3E] flex items-center justify-center border border-[#E8DED8] shadow-xs transition-all duration-200 hover:scale-105 active:scale-95"
          >
            <Search className="w-4 h-4" />
          </button>

          {/* Notifications Button with Badge '3' */}
          <div className="relative">
            <button
              type="button"
              id="btn-header-notifications"
              aria-label="View 3 pregnancy alerts"
              onClick={onOpenNotifications}
              className="w-10 h-10 rounded-full bg-white/80 hover:bg-white text-[#2C4A3E] flex items-center justify-center border border-[#E8DED8] shadow-xs transition-all duration-200 hover:scale-105 active:scale-95"
            >
              <Bell className="w-4 h-4 text-[#D8486A]" />
            </button>
            <span
              id="badge-notifications-count"
              className="absolute -top-1 -right-1 w-5 h-5 rounded-full bg-[#D8486A] border-2 border-[#FAF5F2] text-white text-[10px] font-bold flex items-center justify-center pointer-events-none shadow-xs animate-pulse"
            >
              3
            </span>
          </div>

          {/* User Profile Avatar with Dropdown */}
          <div className="relative">
            <button
              type="button"
              id="btn-header-profile"
              aria-label="User Profile"
              onClick={() => setShowProfileMenu(!showProfileMenu)}
              className="flex items-center gap-1.5 focus:outline-none focus-visible:ring-2 focus-visible:ring-[#D8486A] rounded-full p-0.5 hover:bg-white/60 transition-colors"
            >
              <Avatar
                src={ASSETS.userProfile}
                alt="Amara (Mom-to-be)"
                className="w-9 h-9 sm:w-10 sm:h-10 rounded-full object-cover ring-2 ring-[#E8DED8] shadow-xs"
              />
              <ChevronDown className="w-3.5 h-3.5 text-gray-500 hidden sm:block" />
            </button>

            {/* Profile Dropdown Menu */}
            {showProfileMenu && (
              <div
                id="profile-dropdown-menu"
                className="absolute right-0 mt-2 w-56 bg-white rounded-2xl shadow-xl border border-[#EDE2DC] py-2 z-50 animate-scale-in"
              >
                <div className="px-4 py-2 border-b border-gray-100">
                  <p className="text-sm font-bold text-[#15392B]">Amara Johnson</p>
                  <p className="text-xs text-[#D8486A] font-medium">32 Weeks Pregnant</p>
                </div>
                <div className="py-1">
                  <button
                    type="button"
                    onClick={() => {
                      setActiveNav('My Journey');
                      setShowProfileMenu(false);
                    }}
                    className="w-full text-left px-4 py-2 text-xs text-gray-700 hover:bg-[#FDF3F5] transition-colors"
                  >
                    Baby Development Timeline
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setActiveNav('Health');
                      setShowProfileMenu(false);
                    }}
                    className="w-full text-left px-4 py-2 text-xs text-gray-700 hover:bg-[#FDF3F5] transition-colors"
                  >
                    OBGYN Care Team
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setShowProfileMenu(false);
                      onOpenGetStarted();
                    }}
                    className="w-full text-left px-4 py-2 text-xs text-[#D8486A] font-semibold hover:bg-[#FDF3F5] transition-colors flex items-center justify-between"
                  >
                    <span>AI Maternal Agent Settings</span>
                    <Sparkles className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Get Started CTA Pill Button */}
          <button
            type="button"
            id="btn-header-get-started"
            onClick={onOpenGetStarted}
            className="bg-[#D8486A] hover:bg-[#C23B5A] text-white text-xs sm:text-sm font-semibold px-4 sm:px-6 py-2.5 rounded-full shadow-md hover:shadow-rose-400/30 transition-all duration-200 hover:scale-105 active:scale-95 shrink-0"
          >
            Get Started
          </button>
        </div>
      </header>

      {/* Quick Search Modal */}
      {showSearchModal && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs flex items-start justify-center pt-24 px-4">
          <div className="bg-white w-full max-w-lg rounded-3xl p-6 shadow-2xl border border-[#E8DED8] animate-scale-in">
            <div className="flex items-center justify-between pb-3 border-b border-gray-100">
              <div className="flex items-center gap-2 text-[#15392B]">
                <Search className="w-5 h-5 text-[#D8486A]" />
                <h3 className="font-semibold text-base">Search Nnneva Care Hub</h3>
              </div>
              <button
                type="button"
                onClick={() => setShowSearchModal(false)}
                className="p-1 rounded-full text-gray-400 hover:text-gray-700 hover:bg-gray-100"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="mt-4">
              <input
                type="text"
                placeholder="Ask Nnneva: 'Safe cold medicines in 3rd trimester', 'Kick count guidelines'..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full px-4 py-3 rounded-2xl bg-[#FAF5F2] border border-[#E8DED8] text-sm focus:outline-none focus:ring-2 focus:ring-[#D8486A]"
                autoFocus
              />
            </div>
            <div className="mt-4 flex flex-wrap gap-2">
              <span className="text-xs text-gray-500 self-center">Suggested:</span>
              {['Hospital bag checklist', '32 weeks symptoms', 'Pelvic floor exercises', 'Doula questions'].map((term) => (
                <button
                  key={term}
                  type="button"
                  onClick={() => setSearchQuery(term)}
                  className="text-xs bg-[#FAF5F2] hover:bg-[#FBECEF] text-[#4A5D54] hover:text-[#D8486A] px-3 py-1.5 rounded-full border border-gray-200 transition-colors"
                >
                  {term}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </>
  );
};
