import React, { useState, useEffect } from 'react';
import { 
  Globe, 
  User as UserIcon, 
  LogOut, 
  Cpu, 
  Database, 
  ShieldCheck, 
  ChevronDown,
  Sparkles,
  Menu,
  X,
  WifiOff,
  HardDrive
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useLanguage } from '../../i18n/LanguageContext';
import { useOffline } from '../../context/OfflineContext';
import { api } from '../../services/api';

interface NavbarProps {
  onToggleSidebar?: () => void;
  isSidebarOpen?: boolean;
  onOpenGemini?: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({ onToggleSidebar, isSidebarOpen, onOpenGemini }) => {
  const { user, isConfigured, isDemoUser, signOut } = useAuth();
  const { language, setLanguage, languages, t } = useLanguage();
  const { isOnline, isOffline, simulateOffline, cacheStatus, offlineQueue, setShowOfflineModal } = useOffline();
  const [nodusStatus, setNodusStatus] = useState<any>(null);
  const [showLangMenu, setShowLangMenu] = useState(false);
  const [showProfileMenu, setShowProfileMenu] = useState(false);

  useEffect(() => {
    api.getNodusStatus().then(setNodusStatus);
  }, []);

  const fullName = user?.user_metadata?.full_name || user?.email?.split('@')[0] || t.roleLabel;
  const roleTitle = user?.user_metadata?.role || (isDemoUser ? t.suiteName : t.demoAccount);

  return (
    <header className="sticky top-0 z-40 bg-white border-b border-[#E2E8F0] shadow-2xs">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Left: Mobile hamburger & Brand */}
          <div className="flex items-center gap-3">
            {onToggleSidebar && (
              <button
                onClick={onToggleSidebar}
                className="lg:hidden p-2 rounded-md text-[#64748B] hover:text-[#0F172A] hover:bg-[#F1F5F9]"
                aria-label="Toggle navigation menu"
              >
                {isSidebarOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
              </button>
            )}

            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded bg-[#1B4332] flex items-center justify-center text-white font-bold text-sm shadow-xs">
                GD
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-bold text-lg tracking-tight text-[#143D2B]">
                    {t.appName}
                  </span>
                  <span className="hidden sm:inline-block text-[10px] tracking-wider uppercase font-semibold text-[#52796F] border border-[#CBD5CD] px-1.5 py-0.2 rounded">
                    {t.suiteName}
                  </span>
                </div>
                <span className="hidden md:block text-[11px] text-[#64748B] leading-none">
                  {t.tagline}
                </span>
              </div>
            </div>
          </div>

          {/* Right: Telemetry Indicators, Language & Profile */}
          <div className="flex items-center gap-2 sm:gap-3">
            {/* Ask Gemini Quick Button */}
            {onOpenGemini && (
              <button
                onClick={onOpenGemini}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold bg-[#1B4332] text-white hover:bg-[#143427] transition-all shadow-xs cursor-pointer border border-[#2D6A4F] animate-pulse hover:animate-none"
                title={t.askGemini}
              >
                <Sparkles className="w-3.5 h-3.5 text-[#FDE047]" />
                <span className="hidden sm:inline">{t.askGemini}</span>
                <span className="text-[9px] bg-[#2D6A4F] text-[#D8F3DC] px-1 py-0.2 rounded font-mono">
                  3.8
                </span>
              </button>
            )}

            {/* IndexedDB Offline Cache Status Button */}
            <button
              onClick={() => setShowOfflineModal(true)}
              className={`flex items-center gap-1.5 px-2.5 py-1 rounded text-xs border transition-colors cursor-pointer ${
                isOffline 
                  ? 'border-[#F59E0B] bg-[#FFFBEB] text-[#B45309] hover:bg-[#FEF3C7]' 
                  : 'border-[#CBD5E1] bg-[#F8FAF9] text-[#334155] hover:bg-[#F1F5F9]'
              }`}
              title="IndexedDB storage cache"
            >
              {isOffline ? (
                <WifiOff className="w-3.5 h-3.5 text-[#D97706]" />
              ) : (
                <HardDrive className="w-3.5 h-3.5 text-[#1B4332]" />
              )}
              <span className="font-semibold hidden sm:inline">
                {isOffline 
                  ? (simulateOffline ? `${t.offlineMode} (Sim)` : t.offlineMode)
                  : t.indexedDbCached}
              </span>
              {offlineQueue.length > 0 ? (
                <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-[#D97706] text-white font-bold animate-pulse">
                  {offlineQueue.length}
                </span>
              ) : (
                <span className={`w-1.5 h-1.5 rounded-full ${isOffline ? 'bg-[#F59E0B] animate-pulse' : 'bg-[#16A34A]'}`} />
              )}
            </button>

            {/* Compute Backend Status Indicator */}
            <div 
              className="hidden lg:flex items-center gap-1.5 px-2.5 py-1 rounded text-xs border border-[#E2E8F0] bg-[#F8FAF9]"
              title={nodusStatus?.configured 
                ? 'Nodus Cloud Compute cluster active.' 
                : 'Autonomous Edge Physiological Diagnostic Engine active (Local Mode).'}
            >
              <Cpu className="w-3.5 h-3.5 text-[#1B4332]" />
              <span className="font-medium text-[#334155]">
                {nodusStatus?.configured ? 'Nodus Cloud' : t.nodusExecution}
              </span>
              <span className="w-1.5 h-1.5 rounded-full bg-[#16A34A]" />
            </div>

            {/* Language Switcher */}
            <div className="relative">
              <button
                onClick={() => setShowLangMenu(!showLangMenu)}
                className="flex items-center gap-1.5 px-2.5 py-1.5 rounded text-xs font-medium text-[#334155] hover:bg-[#F1F5F9] border border-[#E2E8F0] cursor-pointer"
              >
                <Globe className="w-3.5 h-3.5 text-[#64748B]" />
                <span className="uppercase font-bold text-[#1B4332]">{language}</span>
                <ChevronDown className="w-3 h-3 text-[#94A3B8]" />
              </button>

              {showLangMenu && (
                <div className="absolute right-0 mt-1 w-36 bg-white border border-[#E2E8F0] rounded-md shadow-lg py-1 z-50">
                  {languages.map((l) => (
                    <button
                      key={l.code}
                      onClick={() => {
                        setLanguage(l.code);
                        setShowLangMenu(false);
                      }}
                      className={`w-full text-left px-3 py-1.5 text-xs flex items-center justify-between hover:bg-[#F8FAF9] ${
                        language === l.code ? 'font-semibold text-[#1B4332] bg-[#F1F5F3]' : 'text-[#334155]'
                      }`}
                    >
                      <span>{l.native}</span>
                      <span className="text-[10px] text-[#94A3B8] uppercase">{l.code}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Profile Dropdown */}
            {user ? (
              <div className="relative">
                <button
                  onClick={() => setShowProfileMenu(!showProfileMenu)}
                  className="flex items-center gap-2 pl-2 pr-1 py-1 rounded text-xs hover:bg-[#F1F5F9]"
                >
                  <div className="w-7 h-7 rounded-full bg-[#1B4332] text-white flex items-center justify-center font-bold text-xs">
                    {fullName.charAt(0).toUpperCase()}
                  </div>
                  <div className="hidden lg:block text-left">
                    <span className="font-semibold text-[#0F172A] block leading-tight truncate max-w-[120px]">
                      {fullName}
                    </span>
                    <span className="text-[10px] text-[#64748B] block leading-none">
                      {roleTitle}
                    </span>
                  </div>
                  <ChevronDown className="w-3 h-3 text-[#94A3B8]" />
                </button>

                {showProfileMenu && (
                  <div className="absolute right-0 mt-1 w-52 bg-white border border-[#E2E8F0] rounded-md shadow-lg py-1 z-50">
                    <div className="px-3 py-2 border-b border-[#E2E8F0] text-xs">
                      <p className="font-semibold text-[#0F172A]">{fullName}</p>
                      <p className="text-[#64748B] text-[11px] truncate font-mono">{user.email}</p>
                    </div>
                    <button
                      onClick={() => {
                        setShowProfileMenu(false);
                        signOut();
                      }}
                      className="w-full text-left px-3 py-2 text-xs text-[#DC2626] hover:bg-[#FEF2F2] flex items-center gap-2 font-medium"
                    >
                      <LogOut className="w-3.5 h-3.5" />
                      <span>{t.logout}</span>
                    </button>
                  </div>
                )}
              </div>
            ) : null}
          </div>
        </div>
      </div>
    </header>
  );
};
