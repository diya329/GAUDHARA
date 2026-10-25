import React, { useState, useEffect, useRef } from 'react';
import { 
  Bot, 
  X, 
  Send, 
  Maximize2, 
  Stethoscope, 
  Sparkles, 
  AlertTriangle,
  RotateCcw,
  Languages
} from 'lucide-react';
import { api } from '../../services/api';
import { useLanguage } from '../../i18n/LanguageContext';
import type { Animal, AssistantChatMessage } from '../../types';

interface CompactChatWidgetProps {
  onOpenFullAssistant: () => void;
  activeAnimalContext?: Animal | null;
}

export const CompactChatWidget: React.FC<CompactChatWidgetProps> = ({
  onOpenFullAssistant,
  activeAnimalContext
}) => {
  const { language, setLanguage, languages, t } = useLanguage();
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<AssistantChatMessage[]>([]);
  const [inputValue, setInputValue] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Initial welcome message
    setMessages([
      {
        id: 'compact-welcome',
        role: 'assistant',
        content: language === 'hi'
          ? 'नमस्ते! गूगल जेमिनी 3.8 फ्लैश पशु चिकित्सा सहायक। 1.15x चालकता अनुपात या दूध जांच विधि के बारे में पूछें।'
          : 'GauDhara Quick Assistant powered by Google Gemini 3.8 Flash. Ask about 1.15x EC disparity, sampling procedures, or clinical triage.',
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        provider: 'gemini-3.8-flash',
        is_fallback: false
      }
    ]);
  }, [language]);

  useEffect(() => {
    if (isOpen) {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, isOpen, isLoading]);

  const handleSend = async (customText?: string) => {
    const text = (customText || inputValue).trim();
    if (!text || isLoading) return;

    const userMsg: AssistantChatMessage = {
      id: `usr-${Date.now()}`,
      role: 'user',
      content: text,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };

    setMessages(prev => [...prev, userMsg]);
    setInputValue('');
    setIsLoading(true);

    try {
      const history = messages.slice(-4).map(m => ({
        role: m.role,
        content: m.content
      }));

      const res = await api.sendAssistantChat({
        message: text,
        conversationHistory: history,
        language,
        animalId: activeAnimalContext?.id,
        tagId: activeAnimalContext?.tag_id,
        sessionId: sessionId || undefined,
        provider: 'gemini'
      });

      if (res.session_id) {
        setSessionId(res.session_id);
      }

      const asstMsg: AssistantChatMessage = {
        id: `asst-${Date.now()}`,
        role: 'assistant',
        content: res.reply || 'No diagnostic response returned.',
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        provider: res.provider,
        is_fallback: res.is_fallback,
        clinical_alert: res.clinical_alert,
        session_id: res.session_id,
        instance_id: res.instance_id
      };

      setMessages(prev => [...prev, asstMsg]);
    } catch (err: any) {
      setMessages(prev => [
        ...prev,
        {
          id: `err-${Date.now()}`,
          role: 'assistant',
          content: 'Unable to communicate with assistant engine. Please retry.',
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          status: 'error'
        }
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <div className="fixed bottom-5 right-5 z-40">
      {/* Floating Launcher Button */}
      {!isOpen && (
        <button
          onClick={() => setIsOpen(true)}
          className="flex items-center gap-2.5 bg-[#1B4332] hover:bg-[#2D6A4F] text-white px-4 py-3 rounded-full shadow-lg transition-all hover:scale-105 group border border-white/20"
          aria-label="Open Veterinary Assistant"
        >
          <div className="relative">
            <Stethoscope className="w-5 h-5 text-[#86EFAC]" />
            <span className="absolute -top-1 -right-1 w-2 h-2 rounded-full bg-[#10B981] animate-ping" />
          </div>
          <span className="text-xs font-semibold tracking-wide">
            Vet Assistant
          </span>
        </button>
      )}

      {/* Expanded Compact Chat Box */}
      {isOpen && (
        <div 
          className="w-80 sm:w-96 h-[480px] bg-white border border-[#E2E8F0] rounded-xl shadow-2xl flex flex-col overflow-hidden animate-in fade-in slide-in-from-bottom-4 duration-200"
          role="dialog"
          aria-label="Quick Veterinary Assistant"
        >
          {/* Header */}
          <div className="px-4 py-3 bg-[#1B4332] text-white flex items-center justify-between">
            <div className="flex items-center gap-2 min-w-0">
              <Stethoscope className="w-4 h-4 text-[#86EFAC] shrink-0" />
              <div className="truncate">
                <div className="text-xs font-semibold truncate">Veterinary Quick Assistant</div>
                <div className="text-[10px] text-white/70 truncate">
                  {activeAnimalContext 
                    ? `Context: ${activeAnimalContext.name} (${activeAnimalContext.tag_id})`
                    : 'Field Screening Support'}
                </div>
              </div>
            </div>

            <div className="flex items-center gap-1.5 shrink-0">
              <button
                onClick={() => setLanguage(language === 'en' ? 'hi' : 'en')}
                className="px-1.5 py-0.5 rounded text-[10px] font-medium bg-white/10 hover:bg-white/20 text-white"
                title="Switch language"
              >
                {language === 'en' ? 'हिन्दी' : 'EN'}
              </button>

              <button
                onClick={() => {
                  setIsOpen(false);
                  onOpenFullAssistant();
                }}
                className="p-1 rounded hover:bg-white/10 text-white/80 hover:text-white"
                title="Expand to Full Page"
              >
                <Maximize2 className="w-3.5 h-3.5" />
              </button>

              <button
                onClick={() => setIsOpen(false)}
                className="p-1 rounded hover:bg-white/10 text-white/80 hover:text-white"
                title="Close"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Quick context info banner */}
          {activeAnimalContext && (
            <div className="px-3 py-1.5 bg-[#F8FAF9] border-b border-[#E2E8F0] text-[11px] flex items-center justify-between">
              <span className="text-[#64748B]">Active cow: <strong className="text-[#0F172A]">{activeAnimalContext.name}</strong></span>
              <span className="font-mono text-[10px] text-[#065F46] bg-[#ECFDF5] px-1.5 rounded font-medium">
                {activeAnimalContext.status}
              </span>
            </div>
          )}

          {/* Messages list */}
          <div className="flex-1 overflow-y-auto p-3.5 space-y-2.5 bg-[#FAFAF9] text-xs">
            {messages.map((m) => {
              const isUser = m.role === 'user';
              return (
                <div
                  key={m.id}
                  className={`flex flex-col ${isUser ? 'items-end' : 'items-start'}`}
                >
                  <div
                    className={`max-w-[85%] rounded-lg p-2.5 text-xs leading-relaxed ${
                      isUser
                        ? 'bg-[#1B4332] text-white rounded-br-none'
                        : 'bg-white border border-[#E2E8F0] text-[#1E293B] rounded-bl-none shadow-xs'
                    }`}
                  >
                    {m.clinical_alert?.level === 'urgent' && (
                      <div className="mb-2 p-1.5 bg-[#FEF2F2] border border-[#FCA5A5] rounded text-[11px] text-[#991B1B] font-medium flex items-center gap-1">
                        <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
                        <span>{m.clinical_alert.title}</span>
                      </div>
                    )}
                    <div className="whitespace-pre-line">{m.content}</div>
                    <div className={`mt-1 text-[9px] text-right ${isUser ? 'text-white/70' : 'text-[#94A3B8]'}`}>
                      {m.timestamp}
                    </div>
                  </div>
                </div>
              );
            })}

            {isLoading && (
              <div className="flex items-center gap-1.5 text-[11px] text-[#64748B] bg-white border border-[#E2E8F0] p-2 rounded-md w-fit">
                <Bot className="w-3 h-3 text-[#1B4332] animate-spin" />
                <span>Consulting veterinary knowledge engine...</span>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Quick prompts */}
          <div className="px-3 py-1.5 bg-white border-t border-[#E2E8F0] flex gap-1.5 overflow-x-auto text-[11px]">
            <button
              onClick={() => handleSend(language === 'hi' ? '1.15x क्वार्टर अंतर क्या है?' : 'What is the 1.15x EC rule?')}
              className="whitespace-nowrap px-2 py-0.5 rounded bg-[#F1F5F9] hover:bg-[#E2E8F0] text-[#334155]"
            >
              1.15x EC Rule
            </button>
            <button
              onClick={() => handleSend(language === 'hi' ? 'दूध नमूना लेने की सही विधि?' : 'Aseptic sampling procedure?')}
              className="whitespace-nowrap px-2 py-0.5 rounded bg-[#F1F5F9] hover:bg-[#E2E8F0] text-[#334155]"
            >
              Sampling SOP
            </button>
            <button
              onClick={() => handleSend(language === 'hi' ? 'पशु चिकित्सक को कब बुलाएं?' : 'When to call a veterinarian?')}
              className="whitespace-nowrap px-2 py-0.5 rounded bg-[#F1F5F9] hover:bg-[#E2E8F0] text-[#334155]"
            >
              Emergency Signs
            </button>
          </div>

          {/* Input field */}
          <div className="p-2.5 bg-white border-t border-[#E2E8F0] flex items-center gap-2">
            <input
              type="text"
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder={t.typeYourQuestion}
              className="flex-1 bg-[#F8FAFC] border border-[#CBD5E1] rounded-md px-2.5 py-1.5 text-xs text-[#0F172A] focus:outline-hidden focus:border-[#1B4332]"
              disabled={isLoading}
            />
            <button
              onClick={() => handleSend()}
              disabled={isLoading || !inputValue.trim()}
              className="p-1.5 bg-[#1B4332] hover:bg-[#2D6A4F] text-white rounded-md disabled:opacity-40 cursor-pointer"
              title={t.send}
            >
              <Send className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
