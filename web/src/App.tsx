import React, { useState } from 'react';
import { Header } from './components/Header';
import { DesktopHero } from './components/DesktopHero';
import { TabletHero } from './components/TabletHero';
import { MobileHero } from './components/MobileHero';
import { WeekTrackerModal } from './components/WeekTrackerModal';
import { HospitalBagModal } from './components/HospitalBagModal';
import { ToolDrawerModal } from './components/ToolDrawerModal';
import { GetStartedModal } from './components/GetStartedModal';
import { NotificationsModal } from './components/NotificationsModal';
import { ASSETS } from './constants';

export default function App() {
  const [activeNav, setActiveNav] = useState('Home');
  const [showWeekModal, setShowWeekModal] = useState(false);
  const [showHospitalBagModal, setShowHospitalBagModal] = useState(false);
  const [showToolDrawer, setShowToolDrawer] = useState(false);
  const [selectedToolId, setSelectedToolId] = useState<string>('reminders');
  const [showGetStartedModal, setShowGetStartedModal] = useState(false);
  const [showNotificationsModal, setShowNotificationsModal] = useState(false);

  const handleOpenToolDrawer = (toolId: string) => {
    setSelectedToolId(toolId);
    setShowToolDrawer(true);
  };

  const handleNavClick = (navLabel: string) => {
    setActiveNav(navLabel);
    if (navLabel === 'My Journey') {
      setShowWeekModal(true);
    } else if (navLabel === 'Tasks') {
      handleOpenToolDrawer('checklists');
    } else if (navLabel === 'Health') {
      handleOpenToolDrawer('reminders');
    } else if (navLabel === 'Family') {
      handleOpenToolDrawer('family');
    } else if (navLabel === 'Resources') {
      setShowHospitalBagModal(true);
    }
  };

  // The shell is min-h-dvh rather than h-screen + overflow-hidden.
  //
  // The fixed-viewport version clipped anything that did not fit and gave no
  // way to reach it: at 1024x500 the "Start Your Journey" button and the whole
  // quick-tool row rendered below the fold with the page unable to scroll. Now
  // it fills the viewport when there is room and grows when there is not. dvh
  // keeps it honest against mobile browser chrome, and w-full avoids the
  // horizontal scrollbar that w-screen causes once a vertical one appears.
  return (
    <main
      id="nnneva-app"
      className="min-h-dvh w-full flex flex-col overflow-x-hidden bg-[#FAF5F2] text-[#15392B] antialiased relative"
    >
      {/* Full-Screen Mother Photo Background (Fills Whole Screen) */}
      <div className="absolute inset-0 w-full h-full pointer-events-none z-0 overflow-hidden">
        <img
          src={ASSETS.heroMother}
          alt="Joyful pregnant mother resting comfortably on sofa"
          className="w-full h-full object-cover object-[center_32%] lg:object-[center_28%] scale-100 animate-photo-reveal"
          referrerPolicy="no-referrer"
        />

        {/* Soft Ambient Scrim & Vignette for Premium Legibility */}
        <div className="absolute inset-0 bg-gradient-to-b from-[#FAF5F2]/90 via-[#FAF5F2]/45 to-[#FAF5F2]/88" />
        <div className="absolute inset-0 bg-gradient-to-r from-[#FAF5F2]/50 via-transparent to-[#FAF5F2]/50" />
      </div>

      {/* Header */}
      <Header
        activeNav={activeNav}
        setActiveNav={handleNavClick}
        onOpenGetStarted={() => setShowGetStartedModal(true)}
        onOpenNotifications={() => setShowNotificationsModal(true)}
      />

      {/* Main Hero Viewport Container */}
      <div id="nnneva-hero-container" className="flex-1 flex flex-col overflow-hidden relative z-10">
        {/* Desktop Layout (lg+) */}
        <DesktopHero
          onOpenWeekModal={() => setShowWeekModal(true)}
          onOpenHospitalBagModal={() => setShowHospitalBagModal(true)}
          onOpenToolDrawer={handleOpenToolDrawer}
          onOpenGetStarted={() => setShowGetStartedModal(true)}
        />

        {/* Tablet Layout (md to lg) */}
        <TabletHero
          onOpenWeekModal={() => setShowWeekModal(true)}
          onOpenHospitalBagModal={() => setShowHospitalBagModal(true)}
          onOpenToolDrawer={handleOpenToolDrawer}
          onOpenGetStarted={() => setShowGetStartedModal(true)}
        />

        {/* Mobile Layout (< md) */}
        <MobileHero
          onOpenWeekModal={() => setShowWeekModal(true)}
          onOpenHospitalBagModal={() => setShowHospitalBagModal(true)}
          onOpenToolDrawer={handleOpenToolDrawer}
          onOpenGetStarted={() => setShowGetStartedModal(true)}
        />
      </div>

      {/* Interactive Modals */}
      <WeekTrackerModal
        isOpen={showWeekModal}
        onClose={() => {
          setShowWeekModal(false);
          setActiveNav('Home');
        }}
      />

      <HospitalBagModal
        isOpen={showHospitalBagModal}
        onClose={() => {
          setShowHospitalBagModal(false);
          setActiveNav('Home');
        }}
      />

      <ToolDrawerModal
        isOpen={showToolDrawer}
        initialToolId={selectedToolId}
        onClose={() => {
          setShowToolDrawer(false);
          setActiveNav('Home');
        }}
      />

      <GetStartedModal
        isOpen={showGetStartedModal}
        onClose={() => setShowGetStartedModal(false)}
      />

      <NotificationsModal
        isOpen={showNotificationsModal}
        onClose={() => setShowNotificationsModal(false)}
      />
    </main>
  );
}

