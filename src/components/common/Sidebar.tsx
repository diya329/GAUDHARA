import React from 'react';
import { 
  LayoutDashboard, 
  FolderKanban, 
  FlaskConical, 
  LineChart, 
  Bell, 
  FileText, 
  History, 
  MapPin, 
  Cpu, 
  Settings,
  AlertTriangle,
  Stethoscope,
  CalendarCheck,
  Scale
} from 'lucide-react';
import { useLanguage } from '../../i18n/LanguageContext';

export type ActiveTab = 
  | 'dashboard' 
  | 'animals' 
  | 'milk_testing' 
  | 'alerts'
  | 'action_planner'
  | 'workload_lab'
  | 'assistant'
  | 'ai_risk' 
  | 'reports' 
  | 'history' 
  | 'farm_map' 
  | 'hardware' 
  | 'settings';

interface SidebarItem {
  id: ActiveTab;
  label: string;
  icon: any;
  tag?: string;
  badge?: number;
}

interface SidebarProps {
  currentTab: ActiveTab;
  onSelectTab: (tab: ActiveTab) => void;
  pendingAlertsCount?: number;
  isOpen?: boolean;
  onClose?: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  currentTab,
  onSelectTab,
  pendingAlertsCount = 0,
  isOpen = false,
  onClose,
}) => {
  const { t } = useLanguage();

  const sections: { title: string; items: SidebarItem[] }[] = [
    {
      title: t.clinicalOperations,
      items: [
        { id: 'dashboard', label: t.dashboard, icon: LayoutDashboard },
        { id: 'animals' as ActiveTab, label: t.animals, icon: FolderKanban },
        { id: 'milk_testing' as ActiveTab, label: t.milkTesting, icon: FlaskConical },
        { 
          id: 'alerts' as ActiveTab, 
          label: t.alerts, 
          icon: Bell, 
          badge: pendingAlertsCount > 0 ? pendingAlertsCount : undefined 
        },
      ]
    },
    {
      title: t.computeIntelligence,
      items: [
        { 
          id: 'assistant' as ActiveTab, 
          label: t.assistant, 
          icon: Stethoscope,
          tag: 'Gemini'
        },
        { 
          id: 'action_planner' as ActiveTab, 
          label: t.actionPlanner, 
          icon: CalendarCheck,
          tag: 'Agent37'
        },
        { 
          id: 'workload_lab' as ActiveTab, 
          label: t.workloadLab, 
          icon: Scale,
          tag: 'Nodus'
        },
        { id: 'ai_risk' as ActiveTab, label: t.aiRiskAnalysis, icon: LineChart },
      ]
    },
    {
      title: t.auditTelemetry,
      items: [
        { id: 'reports' as ActiveTab, label: t.reports, icon: FileText },
        { id: 'history' as ActiveTab, label: t.screeningLogs, icon: History },
      ]
    },
    {
      title: t.infrastructureSetup,
      items: [
        { id: 'farm_map' as ActiveTab, label: t.barnLayoutMap, icon: MapPin },
        { id: 'hardware' as ActiveTab, label: t.devices, icon: Cpu },
        { id: 'settings' as ActiveTab, label: t.settings, icon: Settings },
      ]
    }
  ];

  const handleSelect = (tab: ActiveTab) => {
    onSelectTab(tab);
    if (onClose) onClose();
  };

  return (
    <>
      {/* Mobile backdrop */}
      {isOpen && (
        <div 
          onClick={onClose}
          className="fixed inset-0 z-30 bg-black/40 lg:hidden"
          aria-hidden="true"
        />
      )}

      {/* Sidebar container */}
      <aside
        className={`fixed top-16 bottom-0 left-0 z-30 w-64 bg-white border-r border-[#E2E8F0] transform transition-transform duration-200 ease-in-out lg:translate-x-0 lg:static lg:h-[calc(100vh-4rem)] flex flex-col justify-between ${
          isOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <div className="p-3 space-y-4 overflow-y-auto">
          {sections.map((sec, secIdx) => (
            <div key={secIdx} className="space-y-1">
              <div className="text-[10px] font-bold text-[#64748B] uppercase tracking-wider px-3 mb-1">
                {sec.title}
              </div>
              {sec.items.map((item) => {
                const Icon = item.icon;
                const isActive = currentTab === item.id;

                return (
                  <button
                    key={item.id}
                    onClick={() => handleSelect(item.id)}
                    className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-xs font-medium transition-colors text-left ${
                      isActive
                        ? 'bg-[#1B4332] text-white shadow-2xs font-semibold'
                        : 'text-[#334155] hover:bg-[#F8FAF9] hover:text-[#0F172A]'
                    }`}
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <Icon className={`w-4 h-4 shrink-0 ${isActive ? 'text-white' : 'text-[#64748B]'}`} />
                      <span className="truncate">{item.label}</span>
                    </div>

                    <div className="flex items-center gap-1.5 ml-1">
                      {item.tag && (
                        <span className={`text-[9px] font-mono font-bold px-1.5 py-0.2 rounded ${
                          isActive
                            ? 'bg-white/20 text-white'
                            : 'bg-[#F1F5F9] text-[#475569] border border-[#E2E8F0]'
                        }`}>
                          {item.tag}
                        </span>
                      )}
                      {item.badge !== undefined && (
                        <span
                          className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${
                            isActive
                              ? 'bg-white text-[#1B4332]'
                              : 'bg-[#DC2626] text-white'
                          }`}
                        >
                          {item.badge}
                        </span>
                      )}
                    </div>
                  </button>
                );
              })}
            </div>
          ))}
        </div>

        {/* Bottom Farm info summary */}
        <div className="p-4 border-t border-[#E2E8F0] bg-[#F8FAF9] text-xs">
          <div className="text-[#0F172A] font-bold truncate">
            {t.appName} {t.suiteName}
          </div>
          <div className="text-[11px] text-[#64748B] mt-0.5 line-clamp-1">
            {t.tagline}
          </div>
        </div>
      </aside>
    </>
  );
};

