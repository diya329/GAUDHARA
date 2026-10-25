import React, { useState, useEffect } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import { LanguageProvider } from './i18n/LanguageContext';
import { OfflineProvider, useOffline } from './context/OfflineContext';
import { Navbar } from './components/common/Navbar';
import { Sidebar, ActiveTab } from './components/common/Sidebar';
import { LandingView } from './components/views/LandingView';
import { AuthView } from './components/views/AuthView';
import { DashboardView } from './components/views/DashboardView';
import { AnimalMonitoringView } from './components/views/AnimalMonitoringView';
import { MilkTestingView } from './components/views/MilkTestingView';
import { AiRiskAnalysisView } from './components/views/AiRiskAnalysisView';
import { AlertsView } from './components/views/AlertsView';
import { ReportsView } from './components/views/ReportsView';
import { HistoryView } from './components/views/HistoryView';
import { FarmMapView } from './components/views/FarmMapView';
import { HardwareDevicesView } from './components/views/HardwareDevicesView';
import { SettingsView } from './components/views/SettingsView';
import { VeterinaryAssistantView } from './components/views/VeterinaryAssistantView';
import { NodusWorkloadLabView } from './components/views/NodusWorkloadLabView';
import { HerdActionPlannerView } from './components/views/HerdActionPlannerView';
import { CompactChatWidget } from './components/common/CompactChatWidget';
import { GeminiChatbot } from './components/chat/GeminiChatbot';
import { AnimalDetailModal } from './components/common/AnimalDetailModal';
import { OfflineCacheModal } from './components/common/OfflineCacheModal';
import { api } from './services/api';
import type { Animal } from './types';

function MainApp() {
  const { user, loading, loginAsDemoUser } = useAuth();
  const { showOfflineModal, setShowOfflineModal } = useOffline();
  const [currentTab, setCurrentTab] = useState<ActiveTab>('dashboard');
  const [authMode, setAuthMode] = useState<'login' | 'signup' | null>(null);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isGeminiChatbotOpen, setIsGeminiChatbotOpen] = useState(false);
  const [selectedAnimalForDetail, setSelectedAnimalForDetail] = useState<Animal | null>(null);
  const [preselectedCowForScreening, setPreselectedCowForScreening] = useState<Animal | null>(null);
  const [assistantAttachedAnimal, setAssistantAttachedAnimal] = useState<Animal | null>(null);
  const [pendingAlertsCount, setPendingAlertsCount] = useState<number>(0);
  const [screenings, setScreenings] = useState<any[]>([]);

  // Load pending alerts count
  useEffect(() => {
    if (user) {
      api.getAlerts().then((alerts) => {
        setPendingAlertsCount(alerts.filter(a => a.status === 'pending').length);
      });
      api.getScreenings().then((scr) => {
        setScreenings(scr);
      });
    }
  }, [user, currentTab]);

  if (loading) {
    return (
      <div className="min-h-screen bg-[#F8F9F8] flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 rounded bg-[#1B4332] text-white flex items-center justify-center font-bold animate-pulse">
            GD
          </div>
          <span className="text-xs text-[#64748B] font-mono">Initializing GauDhara Platform...</span>
        </div>
      </div>
    );
  }

  // Not logged in: Show landing or Auth View
  if (!user) {
    if (authMode) {
      return (
        <AuthView
          initialMode={authMode}
          onSuccess={() => setAuthMode(null)}
          onCancel={() => setAuthMode(null)}
        />
      );
    }

    return (
      <LandingView
        onLoginClick={() => setAuthMode('login')}
        onSignUpClick={() => setAuthMode('signup')}
        onExploreDemo={() => {
          loginAsDemoUser('veterinarian');
        }}
      />
    );
  }

  const handleStartScreening = (animal?: Animal) => {
    if (animal) {
      setPreselectedCowForScreening(animal);
    }
    setCurrentTab('milk_testing');
  };

  const handleStartScreeningByTag = async (tag: string) => {
    const animals = await api.getAnimals();
    const found = animals.find(a => a.tag_id === tag);
    if (found) {
      setPreselectedCowForScreening(found);
    }
    setCurrentTab('milk_testing');
  };

  const handleConsultVetAssistant = (animal?: Animal) => {
    if (animal) {
      setAssistantAttachedAnimal(animal);
    }
    setCurrentTab('assistant');
  };

  return (
    <div className="min-h-screen bg-[#F8F9F8] flex flex-col">
      {/* Top Navigation */}
      <Navbar
        onToggleSidebar={() => setIsSidebarOpen(!isSidebarOpen)}
        isSidebarOpen={isSidebarOpen}
        onOpenGemini={() => setIsGeminiChatbotOpen(true)}
      />

      {/* Main Body */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left Sidebar */}
        <Sidebar
          currentTab={currentTab}
          onSelectTab={setCurrentTab}
          pendingAlertsCount={pendingAlertsCount}
          isOpen={isSidebarOpen}
          onClose={() => setIsSidebarOpen(false)}
        />

        {/* Content Container */}
        <main className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto w-full">
          {currentTab === 'dashboard' && (
            <DashboardView
              onNavigateTab={setCurrentTab}
              onOpenAnimalDetail={setSelectedAnimalForDetail}
              onStartScreening={handleStartScreening}
            />
          )}

          {currentTab === 'animals' && (
            <AnimalMonitoringView
              onStartScreening={handleStartScreening}
            />
          )}

          {currentTab === 'milk_testing' && (
            <MilkTestingView
              preselectedAnimal={preselectedCowForScreening}
              onScreeningComplete={() => {
                // Refresh alerts count
                api.getAlerts().then(a => setPendingAlertsCount(a.filter(item => item.status === 'pending').length));
              }}
            />
          )}

          {currentTab === 'alerts' && (
            <AlertsView
              onStartScreening={handleStartScreeningByTag}
            />
          )}

          {currentTab === 'action_planner' && (
            <HerdActionPlannerView
              onNavigateToScreening={handleStartScreeningByTag}
              onNavigateToLab={(tag) => {
                handleStartScreeningByTag(tag);
                setCurrentTab('workload_lab');
              }}
              onNavigateToAssistant={handleConsultVetAssistant}
            />
          )}

          {currentTab === 'workload_lab' && (
            <NodusWorkloadLabView
              onScreeningSaved={() => {
                api.getAlerts().then(a => setPendingAlertsCount(a.filter(item => item.status === 'pending').length));
                api.getScreenings().then(setScreenings);
              }}
              onNavigateToAssistant={handleConsultVetAssistant}
            />
          )}

          {currentTab === 'assistant' && (
            <VeterinaryAssistantView
              initialAnimalContext={assistantAttachedAnimal}
              onNavigateToScreening={handleStartScreening}
            />
          )}

          {currentTab === 'ai_risk' && (
            <AiRiskAnalysisView />
          )}

          {currentTab === 'reports' && (
            <ReportsView />
          )}

          {currentTab === 'history' && (
            <HistoryView />
          )}

          {currentTab === 'farm_map' && (
            <FarmMapView
              onStartScreening={handleStartScreening}
              onOpenAnimalDetail={setSelectedAnimalForDetail}
            />
          )}

          {currentTab === 'hardware' && (
            <HardwareDevicesView />
          )}

          {currentTab === 'settings' && (
            <SettingsView />
          )}
        </main>
      </div>

      {/* Detail Modal */}
      <AnimalDetailModal
        animal={selectedAnimalForDetail}
        screenings={screenings}
        onClose={() => setSelectedAnimalForDetail(null)}
        onScreenNow={(animal) => {
          setSelectedAnimalForDetail(null);
          handleStartScreening(animal);
        }}
        onAskVetAssistant={(animal) => {
          setSelectedAnimalForDetail(null);
          handleConsultVetAssistant(animal);
        }}
      />

      {/* Floating Compact Veterinary Assistant Entry Point */}
      <CompactChatWidget
        onOpenFullAssistant={() => setCurrentTab('assistant')}
        activeAnimalContext={selectedAnimalForDetail || preselectedCowForScreening || assistantAttachedAnimal}
      />

      {/* Floating Dedicated Gemini 3.8 Flash AI Veterinary Assistant */}
      <GeminiChatbot
        isOpen={isGeminiChatbotOpen}
        onClose={() => setIsGeminiChatbotOpen(false)}
        attachedAnimal={selectedAnimalForDetail || preselectedCowForScreening || assistantAttachedAnimal}
        onAttachAnimal={setAssistantAttachedAnimal}
      />

      {/* IndexedDB Offline Storage & Sync Modal */}
      <OfflineCacheModal
        isOpen={showOfflineModal}
        onClose={() => setShowOfflineModal(false)}
      />
    </div>
  );
}

export default function App() {
  return (
    <LanguageProvider>
      <AuthProvider>
        <OfflineProvider>
          <MainApp />
        </OfflineProvider>
      </AuthProvider>
    </LanguageProvider>
  );
}
