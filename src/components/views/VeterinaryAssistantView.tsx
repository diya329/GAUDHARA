import React, { useState, useEffect, useRef } from 'react';
import { 
  Bot, 
  Send, 
  RefreshCw, 
  Sparkles, 
  AlertTriangle, 
  ShieldAlert, 
  CheckCircle2, 
  Clock, 
  Copy, 
  Check, 
  Languages, 
  Paperclip, 
  X, 
  HelpCircle,
  Stethoscope,
  Info,
  ChevronDown
} from 'lucide-react';
import { api } from '../../services/api';
import { useLanguage } from '../../i18n/LanguageContext';
import type { Animal, AssistantChatMessage, AssistantStatusInfo } from '../../types';

interface VeterinaryAssistantViewProps {
  initialAnimalContext?: Animal | null;
  onNavigateToScreening?: (animal: Animal) => void;
}

const DEFAULT_SUGGESTIONS_EN = [
  {
    category: 'Sampling SOP',
    text: 'How do I take a clean composite milk sample for electrical conductivity testing?'
  },
  {
    category: 'Diagnostic Rationale',
    text: 'Explain why a quarter EC difference > 1.15 indicates subclinical mastitis.'
  },
  {
    category: 'Somatic Cell Count',
    text: 'What are the physiological thresholds between SCC <200k and >750k cells/mL?'
  },
  {
    category: 'Emergency Triage',
    text: 'What are the critical clinical signs requiring immediate veterinary intervention?'
  }
];

const DEFAULT_SUGGESTIONS_HI = [
  {
    category: 'नमूना विधि',
    text: 'दूध जांच के लिए साफ और सटीक नमूना लेने की सही विधि क्या है?'
  },
  {
    category: 'चालकता व 1.15 अनुपात',
    text: 'दूध में विद्युत चालकता (Conductivity) और 1.15x क्वार्टर अंतर का क्या महत्व है?'
  },
  {
    category: 'सोमैटिक सेल',
    text: 'कच्चे दूध में सोमाटिक सेल काउंट (SCC) बढ़ने के मुख्य कारण क्या हैं?'
  },
  {
    category: 'आपातकालीन लक्षण',
    text: 'थन में सूजन और दूध में थक्के दिखने पर किसान को तुरंत क्या करना चाहिए?'
  }
];

export const VeterinaryAssistantView: React.FC<VeterinaryAssistantViewProps> = ({
  initialAnimalContext,
  onNavigateToScreening
}) => {
  const { language, setLanguage, languages, t } = useLanguage();
  const [messages, setMessages] = useState<AssistantChatMessage[]>([]);
  const [inputValue, setInputValue] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [animals, setAnimals] = useState<Animal[]>([]);
  const [selectedAnimal, setSelectedAnimal] = useState<Animal | null>(initialAnimalContext || null);
  const [assistantStatus, setAssistantStatus] = useState<AssistantStatusInfo | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [showAnimalDropdown, setShowAnimalDropdown] = useState(false);
  const [currentSessionId, setCurrentSessionId] = useState<string | null>(null);
  const [preferredProvider, setPreferredProvider] = useState<'gemini' | 'agent37' | 'auto'>('gemini');

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  // Load status and herd list
  useEffect(() => {
    api.getAssistantStatus().then(setAssistantStatus);
    api.getAnimals().then(setAnimals);

    // Initial greeting message
    const initialGreeting: AssistantChatMessage = {
      id: 'msg-welcome',
      role: 'assistant',
      content: language === 'hi' 
        ? 'नमस्ते! मैं गौधारा का पशु चिकित्सा एआई सहायक (Veterinary AI Assistant) हूँ। मैं प्रारंभिक थनैला जांच (Conductivity, SCC), नमूना संग्रह विधि और पंजीकृत पशुओं के स्वास्थ्य रिकॉर्ड के विश्लेषण में सहायता कर सकता हूँ।'
        : 'Welcome to the GauDhara Veterinary AI Clinical Assistant powered by Google Gemini 3.8 Flash. I provide evidence-based guidance on dairy mastitis screening, electrical conductivity interpretation (1.15x quarter rule), sampling SOPs, and herd screening records.',
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      provider: 'gemini-3.8-flash',
      is_fallback: false,
      disclaimer: t.disclaimerText
    };
    setMessages([initialGreeting]);
  }, []);

  // Update greeting when language changes if only welcome message exists
  useEffect(() => {
    if (messages.length === 1 && messages[0].id === 'msg-welcome') {
      setMessages([
        {
          id: 'msg-welcome',
          role: 'assistant',
          content: language === 'hi' 
            ? 'नमस्ते! मैं गौधारा का पशु चिकित्सा एआई सहायक (Veterinary AI Assistant) हूँ। मैं प्रारंभिक थनैला जांच (Conductivity, SCC), नमूना संग्रह विधि और पंजीकृत पशुओं के स्वास्थ्य रिकॉर्ड के विश्लेषण में सहायता कर सकता हूँ।'
            : 'Welcome to the GauDhara Veterinary AI Clinical Assistant. I provide evidence-based guidance on dairy mastitis screening, electrical conductivity interpretation (1.15x quarter rule), sampling SOPs, and herd screening records.',
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          provider: assistantStatus?.active_provider || 'edge_veterinary_knowledge_engine',
          is_fallback: assistantStatus?.is_fallback ?? true,
          disclaimer: language === 'hi'
            ? 'पशु चिकित्सा सूचना: गौधारा एक प्रारंभिक थनैला जांच सहायक प्रणाली है, जो पशु चिकित्सक की शारीरिक जांच का विकल्प नहीं है।'
            : 'Veterinary Advisory: GauDhara is a pre-clinical screening aid, not a substitute for direct physical veterinary diagnosis.'
        }
      ]);
    }
  }, [language]);

  // Sync initialAnimalContext
  useEffect(() => {
    if (initialAnimalContext) {
      setSelectedAnimal(initialAnimalContext);
    }
  }, [initialAnimalContext]);

  // Scroll to bottom on new message
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isLoading]);

  const handleSendMessage = async (textToSend?: string) => {
    const text = (textToSend || inputValue).trim();
    if (!text || isLoading) return;

    const userMessageId = `user-${Date.now()}`;
    const userMsg: AssistantChatMessage = {
      id: userMessageId,
      role: 'user',
      content: text,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      language,
      referenced_animal: selectedAnimal ? {
        tag_id: selectedAnimal.tag_id,
        name: selectedAnimal.name,
        breed: selectedAnimal.breed,
        status: selectedAnimal.status,
        lactation_stage: selectedAnimal.lactation_stage,
        parity: selectedAnimal.parity,
        avg_daily_yield_liters: selectedAnimal.avg_daily_yield_liters,
        barn_location: selectedAnimal.barn_location,
        last_screened_at: selectedAnimal.last_screened_at
      } : undefined
    };

    setMessages(prev => [...prev, userMsg]);
    setInputValue('');
    setIsLoading(true);

    try {
      const historyPayload = messages.slice(-6).map(m => ({
        role: m.role,
        content: m.content,
        timestamp: m.timestamp
      }));

      const res = await api.sendAssistantChat({
        message: text,
        conversationHistory: historyPayload,
        language,
        animalId: selectedAnimal?.id,
        tagId: selectedAnimal?.tag_id,
        sessionId: currentSessionId || undefined,
        provider: preferredProvider === 'auto' ? undefined : preferredProvider
      });

      if (res.session_id) {
        setCurrentSessionId(res.session_id);
      }

      const assistantMsg: AssistantChatMessage = {
        id: `asst-${Date.now()}`,
        role: 'assistant',
        content: res.reply || 'No response received from clinical engine.',
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        provider: res.provider,
        is_fallback: res.is_fallback,
        language,
        referenced_animal: res.referenced_animal,
        clinical_alert: res.clinical_alert,
        disclaimer: res.disclaimer,
        session_id: res.session_id,
        instance_id: res.instance_id,
        status: res.status === 'error' ? 'error' : 'sent'
      };

      setMessages(prev => [...prev, assistantMsg]);
    } catch (err: any) {
      const errorMsg: AssistantChatMessage = {
        id: `err-${Date.now()}`,
        role: 'assistant',
        content: `Error communicating with veterinary service: ${err.message || 'Please check network connection'}.`,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        status: 'error',
        is_fallback: true
      };
      setMessages(prev => [...prev, errorMsg]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const handleResetConversation = () => {
    setSelectedAnimal(null);
    setCurrentSessionId(null);
    setMessages([
      {
        id: `welcome-${Date.now()}`,
        role: 'assistant',
        content: language === 'hi'
          ? 'नई बातचीत शुरू की गई। मैं प्रारंभिक थनैला जांच (Conductivity, SCC), नमूना संग्रह विधि और पंजीकृत पशुओं के स्वास्थ्य रिकॉर्ड के विश्लेषण में सहायता कर सकता हूँ।'
          : 'New conversation started. How can I assist you with mastitis screening, electrical conductivity interpretation, or herd health records today?',
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        provider: assistantStatus?.active_provider || 'edge_veterinary_knowledge_engine',
        is_fallback: assistantStatus?.is_fallback ?? true,
        disclaimer: language === 'hi'
          ? 'पशु चिकित्सा सूचना: गौधारा एक प्रारंभिक थनैला जांच सहायक प्रणाली है।'
          : 'Veterinary Advisory: GauDhara is a pre-clinical screening aid.'
      }
    ]);
  };

  const copyToClipboard = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const suggestions = language === 'hi' ? DEFAULT_SUGGESTIONS_HI : DEFAULT_SUGGESTIONS_EN;

  return (
    <div className="flex flex-col h-[calc(100vh-6rem)] max-w-6xl mx-auto bg-white border border-[#E2E8F0] rounded-xl shadow-xs overflow-hidden">
      {/* Header bar */}
      <div className="px-5 py-3.5 border-b border-[#E2E8F0] bg-white flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-[#1B4332] text-white flex items-center justify-center shadow-xs">
            <Stethoscope className="w-5 h-5 text-[#86EFAC]" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-sm font-semibold text-[#0F172A]">
                Veterinary AI Assistant
              </h1>
              {assistantStatus && (
                <div className="flex items-center gap-1.5">
                  <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-mono font-medium border ${
                    assistantStatus.agent37?.configured
                      ? 'bg-[#ECFDF5] text-[#065F46] border-[#A7F3D0]'
                      : 'bg-[#FEF3C7] text-[#92400E] border-[#FDE68A]'
                  }`}>
                    <span className={`w-1.5 h-1.5 rounded-full ${
                      assistantStatus.agent37?.configured ? 'bg-[#10B981]' : 'bg-[#F59E0B]'
                    }`} />
                    {assistantStatus.agent37?.configured 
                      ? 'Agent37 Cloud: Connected' 
                      : 'Agent37: Disconnected'}
                  </span>

                  {currentSessionId && (
                    <span className="hidden sm:inline-flex items-center px-1.5 py-0.5 rounded text-[9px] font-mono bg-[#F1F5F9] text-[#475569] border border-[#E2E8F0]">
                      sess: {currentSessionId.slice(0, 8)}...
                    </span>
                  )}
                </div>
              )}
            </div>
            <p className="text-xs text-[#64748B]">
              Agent37 Cloud reasoning, early mastitis screening protocols & clinical triage
            </p>
          </div>
        </div>

        {/* Controls: Engine Selector, Language toggle & Reset */}
        <div className="flex items-center gap-2 flex-wrap">
          {/* Engine Selector */}
          <div className="flex items-center bg-[#F1F5F9] px-2 py-1 rounded-md border border-[#E2E8F0] text-xs">
            <span className="text-[10px] text-[#64748B] mr-1.5 font-medium">Model:</span>
            <select
              value={preferredProvider}
              onChange={(e) => setPreferredProvider(e.target.value as any)}
              className="bg-transparent text-xs font-semibold text-[#1B4332] focus:outline-hidden cursor-pointer"
            >
              <option value="gemini">Gemini 3.8 Flash (Official SDK)</option>
              <option value="agent37">Agent37 Cloud (Hermes)</option>
              <option value="auto">Auto (Multi-Engine)</option>
            </select>
          </div>

          {/* Multilingual Selector */}
          <div className="flex items-center bg-[#F1F5F9] px-2 py-1 rounded-md border border-[#E2E8F0] text-xs">
            <Languages className="w-3.5 h-3.5 text-[#1B4332] mr-1.5" />
            <select
              value={language}
              onChange={(e) => setLanguage(e.target.value as any)}
              className="bg-transparent text-xs font-medium text-[#0F172A] focus:outline-hidden cursor-pointer"
            >
              {languages.map((l) => (
                <option key={l.code} value={l.code}>
                  {l.native} ({l.label})
                </option>
              ))}
            </select>
          </div>

          <button
            onClick={handleResetConversation}
            className="flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium text-[#475569] hover:text-[#0F172A] hover:bg-[#F8FAF9] rounded-md border border-[#E2E8F0] transition-colors"
            title="Start new consultation"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span>New Chat</span>
          </button>
        </div>
      </div>

      {/* Animal Context Attachment Bar */}
      <div className="px-5 py-2 bg-[#F8FAF9] border-b border-[#E2E8F0] flex flex-wrap items-center justify-between gap-2 text-xs">
        <div className="flex items-center gap-2">
          <Paperclip className="w-3.5 h-3.5 text-[#64748B]" />
          <span className="text-[#64748B] font-medium">Attached Animal Context:</span>

          {selectedAnimal ? (
            <div className="inline-flex items-center gap-1.5 bg-white border border-[#CBD5E1] px-2.5 py-1 rounded-md shadow-xs">
              <span className="font-semibold text-[#0F172A]">{selectedAnimal.name}</span>
              <span className="font-mono text-[#64748B]">({selectedAnimal.tag_id})</span>
              <span className={`px-1.5 py-0.2 rounded text-[10px] font-medium uppercase ${
                selectedAnimal.status === 'healthy'
                  ? 'bg-[#ECFDF5] text-[#065F46]'
                  : selectedAnimal.status === 'subclinical_suspect'
                  ? 'bg-[#FEF3C7] text-[#92400E]'
                  : 'bg-[#FEE2E2] text-[#991B1B]'
              }`}>
                {selectedAnimal.status.replace('_', ' ')}
              </span>
              <button
                onClick={() => setSelectedAnimal(null)}
                className="text-[#94A3B8] hover:text-[#DC2626] ml-1"
                title="Detach animal"
              >
                <X className="w-3 h-3" />
              </button>
            </div>
          ) : (
            <div className="relative">
              <button
                onClick={() => setShowAnimalDropdown(!showAnimalDropdown)}
                className="flex items-center gap-1 text-[#334155] hover:text-[#0F172A] bg-white border border-[#E2E8F0] px-2 py-1 rounded text-xs"
              >
                <span>Attach cow from herd record...</span>
                <ChevronDown className="w-3 h-3 text-[#94A3B8]" />
              </button>

              {showAnimalDropdown && (
                <div className="absolute left-0 top-full mt-1 w-64 bg-white border border-[#E2E8F0] rounded-md shadow-lg z-20 max-h-56 overflow-y-auto">
                  <div className="p-1.5 text-[11px] font-semibold text-[#64748B] border-b border-[#F1F5F9]">
                    Authorized Herd Records
                  </div>
                  {animals.map((cow) => (
                    <button
                      key={cow.id}
                      onClick={() => {
                        setSelectedAnimal(cow);
                        setShowAnimalDropdown(false);
                      }}
                      className="w-full text-left px-2.5 py-2 hover:bg-[#F8FAF9] flex items-center justify-between text-xs"
                    >
                      <div>
                        <div className="font-medium text-[#0F172A]">{cow.name} ({cow.tag_id})</div>
                        <div className="text-[11px] text-[#64748B]">{cow.breed} • Parity {cow.parity}</div>
                      </div>
                      <span className={`text-[10px] font-medium px-1 rounded ${
                        cow.status === 'healthy' ? 'text-[#065F46]' : 'text-[#B45309]'
                      }`}>
                        {cow.status}
                      </span>
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        {selectedAnimal && onNavigateToScreening && (
          <button
            onClick={() => onNavigateToScreening(selectedAnimal)}
            className="text-[11px] text-[#1B4332] hover:underline font-medium"
          >
            Record new screening for {selectedAnimal.name} →
          </button>
        )}
      </div>

      {/* Main Conversation Thread */}
      <div className="flex-1 overflow-y-auto p-5 space-y-4 bg-[#FBFBFA]">
        {messages.map((msg) => {
          const isUser = msg.role === 'user';
          return (
            <div
              key={msg.id}
              className={`flex flex-col ${isUser ? 'items-end' : 'items-start'}`}
            >
              <div
                className={`max-w-[85%] sm:max-w-[78%] rounded-lg p-4 shadow-xs text-xs sm:text-sm leading-relaxed ${
                  isUser
                    ? 'bg-[#1B4332] text-white rounded-br-none'
                    : 'bg-white border border-[#E2E8F0] text-[#1E293B] rounded-bl-none'
                }`}
              >
                {/* Assistant header tag */}
                {!isUser && (
                  <div className="flex items-center justify-between gap-2 pb-2 mb-2 border-b border-[#F1F5F9] text-[11px] text-[#64748B]">
                    <div className="flex items-center gap-1.5 font-medium text-[#1B4332] flex-wrap">
                      <Bot className="w-3.5 h-3.5" />
                      <span>{msg.provider === 'agent37_cloud' ? 'Agent37 Cloud Agent' : 'GauDhara Clinical Engine'}</span>
                      {msg.provider && (
                        <span className={`font-mono text-[10px] px-1.5 py-0.5 rounded ${
                          msg.provider === 'agent37_cloud'
                            ? 'bg-[#E0F2FE] text-[#0369A1] font-semibold border border-[#BAE6FD]'
                            : 'text-[#64748B] bg-[#F1F5F9]'
                        }`}>
                          {msg.provider === 'agent37_cloud' ? 'Agent37 Hermes' : msg.provider}
                        </span>
                      )}
                      {msg.session_id && (
                        <span className="font-mono text-[9px] text-[#0369A1] bg-[#F0F9FF] border border-[#BAE6FD] px-1.5 py-0.2 rounded" title={`Agent37 Session ID: ${msg.session_id}`}>
                          session: {msg.session_id.slice(0, 8)}...
                        </span>
                      )}
                      {msg.instance_id && (
                        <span className="font-mono text-[9px] text-[#475569] bg-[#F8FAFC] border border-[#E2E8F0] px-1.5 py-0.2 rounded" title={`Agent37 Instance: ${msg.instance_id}`}>
                          inst: {msg.instance_id.slice(0, 8)}
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-[10px]">{msg.timestamp}</span>
                      <button
                        onClick={() => copyToClipboard(msg.content, msg.id)}
                        className="hover:text-[#0F172A] transition-colors"
                        title="Copy text"
                      >
                        {copiedId === msg.id ? (
                          <Check className="w-3.5 h-3.5 text-[#10B981]" />
                        ) : (
                          <Copy className="w-3.5 h-3.5" />
                        )}
                      </button>
                    </div>
                  </div>
                )}

                {/* Emergency Clinical Alert Banner */}
                {msg.clinical_alert && msg.clinical_alert.level === 'urgent' && (
                  <div className="mb-3 p-3 bg-[#FEF2F2] border border-[#FCA5A5] rounded-md text-[#991B1B]">
                    <div className="flex items-center gap-1.5 font-bold text-xs">
                      <ShieldAlert className="w-4 h-4 text-[#DC2626]" />
                      <span>{msg.clinical_alert.title}</span>
                    </div>
                    <p className="mt-1 text-xs text-[#B91C1C] leading-snug">
                      {msg.clinical_alert.action}
                    </p>
                  </div>
                )}

                {/* Message Body with clean paragraphs and lists */}
                <div className="whitespace-pre-line space-y-2 font-normal">
                  {msg.content}
                </div>

                {/* Attached Animal Badge in User Message */}
                {isUser && msg.referenced_animal && (
                  <div className="mt-2 pt-2 border-t border-white/20 text-[11px] text-white/80 flex items-center gap-1.5">
                    <Paperclip className="w-3 h-3" />
                    <span>Referenced: {msg.referenced_animal.name} ({msg.referenced_animal.tag_id})</span>
                  </div>
                )}

                {/* Safety Disclaimer on Assistant Response */}
                {!isUser && msg.disclaimer && (
                  <div className="mt-3 pt-2 border-t border-[#F1F5F9] text-[10px] text-[#94A3B8] flex items-start gap-1">
                    <Info className="w-3 h-3 shrink-0 mt-0.5 text-[#94A3B8]" />
                    <span>{msg.disclaimer}</span>
                  </div>
                )}
              </div>
            </div>
          );
        })}

        {/* Typing indicator */}
        {isLoading && (
          <div className="flex items-center gap-2 text-xs text-[#64748B] bg-white border border-[#E2E8F0] rounded-lg px-3.5 py-2.5 w-fit shadow-xs">
            <Bot className="w-4 h-4 text-[#1B4332] animate-bounce" />
            <span className="font-mono">Analyzing veterinary records & diagnostic logic...</span>
            <div className="flex items-center gap-1">
              <span className="w-1.5 h-1.5 bg-[#1B4332] rounded-full animate-ping" />
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Suggested Questions Section */}
      <div className="px-5 py-2.5 bg-white border-t border-[#E2E8F0]">
        <div className="text-[11px] font-semibold text-[#64748B] uppercase tracking-wider mb-2 flex items-center gap-1.5">
          <Sparkles className="w-3 h-3 text-[#1B4332]" />
          <span>Recommended Clinical Inquiries</span>
        </div>
        <div className="flex flex-wrap gap-2">
          {suggestions.map((item, idx) => (
            <button
              key={idx}
              onClick={() => handleSendMessage(item.text)}
              disabled={isLoading}
              className="text-left text-xs bg-[#F8FAF9] hover:bg-[#EAF3EE] text-[#1E293B] hover:text-[#1B4332] border border-[#E2E8F0] px-3 py-1.5 rounded-md transition-colors truncate max-w-sm disabled:opacity-50"
            >
              <span className="font-semibold text-[#1B4332] mr-1.5">[{item.category}]</span>
              {item.text}
            </button>
          ))}
        </div>
      </div>

      {/* Persistent Input Form */}
      <div className="p-4 bg-white border-t border-[#E2E8F0]">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            handleSendMessage();
          }}
          className="relative flex items-center gap-2"
        >
          <textarea
            ref={inputRef}
            rows={2}
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={
              language === 'hi'
                ? 'दूध जांच, चालकता या थनैला लक्षणों के बारे में पूछें... (Enter दबाकर भेजें)'
                : 'Ask about mastitis sampling SOPs, 1.15x EC disparity, or attach cow record... (Press Enter to send)'
            }
            className="w-full resize-none bg-[#F8FAFC] border border-[#CBD5E1] rounded-lg px-3.5 py-2.5 text-xs sm:text-sm text-[#0F172A] focus:outline-hidden focus:ring-1 focus:ring-[#1B4332] focus:border-[#1B4332] pr-12 transition-all font-sans"
            disabled={isLoading}
          />

          <button
            type="submit"
            disabled={isLoading || !inputValue.trim()}
            className="absolute right-2 top-2.5 p-2 bg-[#1B4332] hover:bg-[#2D6A4F] text-white rounded-md disabled:opacity-40 disabled:hover:bg-[#1B4332] transition-colors shadow-xs"
            title="Send inquiry"
          >
            <Send className="w-4 h-4" />
          </button>
        </form>

        <div className="flex items-center justify-between text-[11px] text-[#94A3B8] mt-2 px-1">
          <div className="flex items-center gap-1">
            <AlertTriangle className="w-3 h-3 text-[#EAB308]" />
            <span>GauDhara AI decision-support tool. Not a substitute for licensed physical veterinary diagnosis.</span>
          </div>
          <span className="font-mono">Rate Limit: 30 req/min</span>
        </div>
      </div>
    </div>
  );
};
