export interface NavItem {
  label: string;
  href: string;
  active?: boolean;
}

export interface PregnancyWeekData {
  week: number;
  babyStatus: string;
  babySizeComparison: string;
  weight: string;
  length: string;
  milestones: string[];
  tips: string[];
}

export interface QuickToolItem {
  id: string;
  title: string;
  label: string;
  iconName: 'calendar' | 'check-square' | 'users' | 'wallet';
  bgColor: string;
  iconColor: string;
  itemsCount: string;
  description: string;
}

export interface HospitalBagItem {
  id: string;
  category: string;
  items: { name: string; packed: boolean; priority: 'high' | 'medium' }[];
}
