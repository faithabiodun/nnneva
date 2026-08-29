import heroMotherImg from './assets/images/pregnant_mother_hero_1787999943916.jpg';
import fetalDevImg from './assets/images/fetal_development_32w_1787999957600.jpg';
import hospitalBagImg from './assets/images/hospital_bag_essentials_1787999970254.jpg';

export const ASSETS = {
  heroMother: heroMotherImg,
  fetalDev32w: fetalDevImg,
  hospitalBag: hospitalBagImg,
  userProfile: 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=150&auto=format&fit=crop&q=80',
  avatars: [
    'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=120&auto=format&fit=crop&q=80',
    'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=120&auto=format&fit=crop&q=80',
    'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=120&auto=format&fit=crop&q=80',
  ],
} as const;

export const NAV_LINKS = [
  { label: 'Home', href: '#', active: true },
  { label: 'My Journey', href: '#', active: false },
  { label: 'Tasks', href: '#', active: false },
  { label: 'Health', href: '#', active: false },
  { label: 'Family', href: '#', active: false },
  { label: 'Resources', href: '#', active: false },
];

export const QUICK_TOOLS = [
  {
    id: 'reminders',
    title: 'Reminders',
    label: 'Reminders',
    iconName: 'calendar' as const,
    bgColor: '#FDEEF1',
    iconColor: '#D8486A',
    itemsCount: '3 Today',
    description: 'Prenatal vitamins, 32w OB appointment & pelvic floor rest session.',
  },
  {
    id: 'checklists',
    title: 'Checklists',
    label: 'Checklists',
    iconName: 'check-square' as const,
    bgColor: '#EBF8F2',
    iconColor: '#1E825A',
    itemsCount: '12 Items',
    description: 'Hospital go-bag, nursery crib safety, car seat installation inspection.',
  },
  {
    id: 'family',
    title: 'Family',
    label: 'Family',
    iconName: 'users' as const,
    bgColor: '#FDF2EB',
    iconColor: '#D8723C',
    itemsCount: '4 Connected',
    description: 'Synced with Marcus (Partner), Dr. Davis (OBGYN), and Doula Maya.',
  },
  {
    id: 'expenses',
    title: 'Expenses',
    label: 'Expenses',
    iconName: 'wallet' as const,
    bgColor: '#F0EEFB',
    iconColor: '#6854C4',
    itemsCount: '$2,450 Tracked',
    description: 'Insurance coverage deductible tracker, nursery furniture, and pediatrician co-pays.',
  },
];

export const WEEK_32_DETAILS = {
  week: 32,
  babyStatus: 'Baby is growing strong & practicing breathing motions',
  babySizeComparison: 'About the size of a Napa Cabbage or Butternut Squash',
  weight: '3.8 - 4.2 lbs (1.8 kg)',
  length: '16.7 inches (42.4 cm)',
  milestones: [
    'Bones are hardening throughout the skeleton (except soft skull plates)',
    'Toenails and fingernails have fully formed',
    'Baby is now sleeping and waking on identifiable cycles',
    'Practicing swallowing amniotic fluid and rhythmic diaphragm breathing',
  ],
  tips: [
    'Schedule your bi-weekly OBGYN or Midwife checkups',
    'Finish packing your hospital bag checklist by end of week 34',
    'Stay hydrated with electrolyte-rich fluids to reduce Braxton Hicks cramping',
  ],
};
