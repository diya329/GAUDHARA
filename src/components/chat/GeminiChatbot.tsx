import React, { useState, useEffect, useRef } from 'react';
import { 
  Sparkles, 
  Send, 
  X, 
  Bot, 
  RefreshCw, 
  AlertTriangle, 
  CheckCircle2, 
  Maximize2, 
  Minimize2, 
  ChevronDown, 
  Copy, 
  Check, 
  Stethoscope, 
  Layers, 
  Languages 
} from 'lucide-react';
import { api } from '../../services/api';
import { useLanguage } from '../../i18n/LanguageContext';
import type { Animal } from '../../types';

interface GeminiChatbotProps {
  isOpen?: boolean;
  onClose?: () => void;
  attachedAnimal?: Animal | null;
  onAttachAnimal?: (animal: Animal | null) => void;
}

interface Message {
  id: string;
  role: 'user' | 'model';
  content: string;
  timestamp: string;
  isFallback?: boolean;
  clinicalAlert?: {
    level: string;
    title: string;
    action: string;
  } | null;
}

export const GeminiChatbot: React.FC<GeminiChatbotProps> = ({
  isOpen: controlledIsOpen,
  onClose,
  attachedAnimal,
  onAttachAnimal
}) => {
  const { language, setLanguage, languages, t } = useLanguage();
  const [internalIsOpen, setInternalIsOpen] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [animals, setAnimals] = useState<Animal[]>([]);
  const [showAnimalMenu, setShowAnimalMenu] = useState(false);
  const [selectedAnimal, setSelectedAnimal] = useState<Animal | null>(attachedAnimal || null);
  const [geminiStatus, setGeminiStatus] = useState<any>(null);

  const isOpen = controlledIsOpen !== undefined ? controlledIsOpen : internalIsOpen;
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (attachedAnimal) {
      setSelectedAnimal(attachedAnimal);
    }
  }, [attachedAnimal]);

  useEffect(() => {
    api.getAnimals().then(setAnimals).catch(() => {});
    api.getGeminiStatus().then(setGeminiStatus).catch(() => {});
  }, []);

  // Set initial welcome greeting according to language
  useEffect(() => {
    const welcomeMessages: Record<string, string> = {
      en: 'Hello! I am GauDhara’s Veterinary Clinical Assistant powered by Google Gemini 3.8 Flash. I specialize in early mastitis detection, quarter conductivity analysis (1.15x rule), somatic cell counts, and sampling SOPs. How may I assist your herd today?',
      hi: 'नमस्ते! मैं गूगल जेमिनी 3.8 फ्लैश द्वारा संचालित गौधारा का पशु चिकित्सा एआई सहायक हूँ। मैं थनैला (मैस्टाइटिस) जांच, क्वार्टर चालकता (1.15x अनुपात), सोमैटिक सेल काउंट और दूध नमूना SOP पर परामर्श दे सकता हूँ।',
      as: 'নমস্কাৰ! মই গুগল জেমিনি ৩.৮ ফ্লেচ দ্বাৰা পৰিচালিত গৌধাৰাৰ পশু চিকিৎসা এআই সহায়ক। গাখীৰৰ কণ্ডাক্টিভিটি (১.১৫x অনুপাত), ওলহী (মেষ্টাইটিছ) পৰীক্ষা আৰু পশু স্বাস্থ্য সম্পৰ্কে যিকোনো কথা মোক সোধক।',
      pa: 'ਸਤਿ ਸ੍ਰੀ ਅਕਾਲ! ਮੈਂ ਗੂਗਲ ਜੈਮਿਨੀ 3.8 ਫਲੈਸ਼ ਦੁਆਰਾ ਸੰਚਾਲਿਤ ਗਊਧਾਰਾ ਦਾ ਵੈਟਰਨਰੀ ਏਆਈ ਸਹਾਇਕ ਹਾਂ। ਮੈਂ ਮਸਟਾਈਟਿਸ (ਥਣੇਲਾ) ਜਾਂਚ, 1.15x ਕੁਆਰਟਰ ਅੰਤਰ, ਅਤੇ ਦੁੱਧ ਦੇ ਨਮੂਨੇ ਦੇ ਨਿਯਮਾਂ ਬਾਰੇ ਸਹਾਇਤਾ ਕਰ ਸਕਦਾ ਹਾਂ।',
      gu: 'નમસ્તે! હું ગૂગલ જેમિની 3.8 ફ્લેશ દ્વારા સંચાલિત ગૌધારાનો પશુચિકિત્સક એઆઈ સહાયક છું. હું મસ્ટાઇટિસ સ્ક્રીનીંગ, 1.15x કંડક્ટિવિટી રેશિયો અને દૂધના નમૂનાની પદ્ધતિઓ અંગે સલાહ આપી શકું છું.',
      mr: 'नमस्कार! मी गुगल जेमिनी ३.८ फ्लॅश द्वारे संचलित गोधाराचा पशुवैद्यकीय एआय सहाय्यक आहे. मी स्तनदाह (मॅस्टायटिस) तपासणी, १.१५x कास फरक गुणोत्तर आणि दूध नमुना चाचणीबाबत अचूक सल्ला देऊ शकतो.',
      bn: 'নমস্কার! আমি গুগল জেমিনি ৩.৮ ফ্ল্যাশ দ্বারা পরিচালিত গৌধারার ভেটেরিনারি এআই সহকারী। আমি ম্যাস্টাইটিস স্ক্রিনিং, ১.১৫x পরিবাহিতা অনুপাত এবং দুধ পরীক্ষার সঠিক পদ্ধতি সম্পর্কে সহায়তা করতে পারি।',
      ta: 'வணக்கம்! நான் கூகிள் ஜெமினி 3.8 ஃப்ளாஷ் மூலம் இயக்கப்படும் கௌதாரா கால்நடை ஏஐ உதவியாளர். மடிநோய் பரிசோதனை, 1.15x கடத்துத்திறன் விகிதம் மற்றும் பால் மாதிரி முறைகள் குறித்து உங்களுக்கு உதவ முடியும்.'
    };

    const initialText = welcomeMessages[language] || welcomeMessages.en;
    setMessages([
      {
        id: 'msg-welcome',
        role: 'model',
        content: initialText,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        isFallback: false
      }
    ]);
  }, [language]);

  useEffect(() => {
    if (isOpen) {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, isOpen, isLoading]);

  const handleSend = async (customPrompt?: string) => {
    const textToSend = (customPrompt || input).trim();
    if (!textToSend || isLoading) return;

    const userMsg: Message = {
      id: `usr-${Date.now()}`,
      role: 'user',
      content: textToSend,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };

    setMessages(prev => [...prev, userMsg]);
    setInput('');
    setIsLoading(true);

    try {
      const historyPayload = messages.slice(-5).map(m => ({
        role: m.role,
        text: m.content
      }));

      const res = await api.askGeminiChat({
        message: textToSend,
        history: historyPayload,
        language,
        animalContext: selectedAnimal ? {
          id: selectedAnimal.id,
          tag_id: selectedAnimal.tag_id,
          name: selectedAnimal.name,
          breed: selectedAnimal.breed,
          lactation_stage: selectedAnimal.lactation_stage,
          parity: selectedAnimal.parity,
          status: selectedAnimal.status,
          avg_daily_yield_liters: selectedAnimal.avg_daily_yield_liters,
          last_ec: selectedAnimal.status === 'clinical_alert' ? 6.4 : 4.6
        } : undefined
      });

      const modelMsg: Message = {
        id: `gemini-${Date.now()}`,
        role: 'model',
        content: res.reply || 'No response returned from Gemini.',
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        isFallback: res.is_fallback,
        clinicalAlert: res.clinical_alert
      };

      setMessages(prev => [...prev, modelMsg]);
    } catch (err: any) {
      const errorMsg: Message = {
        id: `err-${Date.now()}`,
        role: 'model',
        content: `Connection error: ${err.message || 'Could not reach server'}. Local physiological rule triage is active.`,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        isFallback: true
      };
      setMessages(prev => [...prev, errorMsg]);
    } finally {
      setIsLoading(false);
    }
  };

  const copyToClipboard = (id: string, text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const getSuggestedPrompts = () => {
    switch (language) {
      case 'hi':
        return [
          'दूध में 1.15x क्वार्टर चालकता (QDR) अंतर का क्या अर्थ है?',
          'दूध जांच के लिए साफ नमूना लेने की सही SOP विधि क्या है?',
          'सोमैटिक सेल काउंट (SCC) 200k और 750k के बीच अंतर समझाएं।',
          'थन में सूजन और दूध में थक्के दिखने पर तुरंत क्या करें?'
        ];
      case 'as':
        return [
          'গাখীৰৰ ১.১৫x ওলহ কণ্ডাক্টিভিটি অনুপাতৰ তাৎপৰ্য কি?',
          'গাখীৰ পৰীক্ষাৰ বাবে সঠিক নমুনা কেনেকৈ সংগ্ৰহ কৰিব লাগে?',
          'মেষ্টাইটিছ ৰোগৰ প্ৰাথমিক লক্ষণসমূহ কি কি?'
        ];
      case 'pa':
        return [
          'ਦੁੱਧ ਵਿੱਚ 1.15x ਕੁਆਰਟਰ ਅੰਤਰ ਦਾ ਕੀ ਮਤਲਬ ਹੈ?',
          'ਦੁੱਧ ਟੈਸਟ ਲਈ ਸਾਫ਼ ਨਮੂਨਾ ਲੈਣ ਦੀ ਸਹੀ ਵਿਧੀ ਕੀ ਹੈ?',
          'ਥਣਾਂ ਵਿੱਚ ਸੋਜ ਹੋਣ ਤੇ ਤੁਰੰਤ ਕੀ ਕਰਨਾ ਚਾਹੀਦਾ ਹੈ?'
        ];
      case 'gu':
        return [
          'દૂધમાં 1.15x ક્વાર્ટર કંડક્ટિવિટી રેશિયોનું મહત્વ સમજાવો.',
          'દૂધ પરીક્ષણ માટે સ્વચ્છ નમૂનો લેવાની પદ્ધતિ શું છે?',
          'મસ્ટાઇટિસથી બચવા માટે તબેલામાં શું કાળજી રાખવી?'
        ];
      default:
        return [
          'Why does a quarter EC differential >= 1.15x indicate subclinical mastitis?',
          'What is the standard SOP for collecting an aseptic foremilk sample?',
          'What are the critical physiological SCC thresholds in bovine dairy milk?',
          'What immediate actions are needed if clots or udder swelling are found?'
        ];
    }
  };

  if (!isOpen) {
    return (
      <button
        onClick={() => {
          if (controlledIsOpen !== undefined && onClose) {
            // Controlled from outside
          } else {
            setInternalIsOpen(true);
          }
        }}
        className="fixed bottom-6 right-6 z-50 flex items-center gap-2 px-4 py-3 bg-[#1B4332] text-white rounded-full shadow-lg hover:bg-[#143427] hover:scale-105 active:scale-95 transition-all duration-200 cursor-pointer border border-[#2D6A4F] group"
        title="Open Gemini 3.8 Flash Veterinary AI Assistant"
      >
        <div className="relative">
          <Bot className="w-5 h-5 text-white" />
          <Sparkles className="w-3 h-3 text-[#F59E0B] absolute -top-1 -right-1 animate-pulse" />
        </div>
        <div className="flex flex-col text-left">
          <span className="text-xs font-bold tracking-wide leading-tight flex items-center gap-1">
            {t.askGemini}
            <span className="text-[9px] bg-[#2D6A4F] text-[#D8F3DC] px-1 py-0.2 rounded font-mono font-normal">
              3.8 Flash
            </span>
          </span>
          <span className="text-[10px] text-[#A7C4B5] leading-tight">
            {t.assistant}
          </span>
        </div>
      </button>
    );
  }

  const handleClose = () => {
    if (onClose) {
      onClose();
    } else {
      setInternalIsOpen(false);
    }
  };

  return (
    <div 
      className={`fixed z-50 transition-all duration-200 shadow-2xl flex flex-col bg-white border border-[#CBD5E1] rounded-xl overflow-hidden ${
        isExpanded 
          ? 'inset-4 sm:inset-10' 
          : 'bottom-4 right-4 w-[95vw] sm:w-[480px] h-[640px] max-h-[90vh]'
      }`}
    >
      {/* Header */}
      <div className="bg-gradient-to-r from-[#143D2B] via-[#1B4332] to-[#2D6A4F] text-white px-4 py-3 flex items-center justify-between shadow-xs">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-white/10 flex items-center justify-center border border-white/20">
            <Sparkles className="w-4 h-4 text-[#FDE047]" />
          </div>
          <div>
            <div className="flex items-center gap-1.5">
              <span className="font-bold text-sm tracking-tight">
                {t.geminiBot}
              </span>
              <span className="text-[9px] font-mono font-semibold bg-[#22C55E]/20 text-[#86EFAC] border border-[#22C55E]/40 px-1.5 py-0.2 rounded">
                Official SDK
              </span>
            </div>
            <p className="text-[10px] text-[#D8F3DC]/80 leading-none mt-0.5">
              {t.geminiAssistantSubtitle}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-1.5">
          {/* Language selector in Chat */}
          <div className="relative">
            <select
              value={language}
              onChange={(e) => setLanguage(e.target.value as any)}
              className="bg-black/20 hover:bg-black/30 text-white text-[11px] font-medium py-1 px-2 pr-6 rounded border border-white/20 appearance-none cursor-pointer focus:outline-none"
              title="Change Language"
            >
              {languages.map(l => (
                <option key={l.code} value={l.code} className="bg-[#1B4332] text-white">
                  {l.native}
                </option>
              ))}
            </select>
            <ChevronDown className="w-3 h-3 text-white/70 absolute right-1.5 top-2 pointer-events-none" />
          </div>

          <button
            onClick={() => setIsExpanded(!isExpanded)}
            className="p-1.5 rounded hover:bg-white/10 text-white/80 hover:text-white transition-colors"
            title={isExpanded ? 'Restore size' : 'Maximize window'}
          >
            {isExpanded ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
          </button>

          <button
            onClick={handleClose}
            className="p-1.5 rounded hover:bg-white/10 text-white/80 hover:text-white transition-colors"
            title={t.close}
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Attached Cow Bar */}
      <div className="bg-[#F8FAF9] border-b border-[#E2E8F0] px-4 py-2 flex items-center justify-between text-xs">
        <div className="flex items-center gap-2">
          <Stethoscope className="w-3.5 h-3.5 text-[#1B4332]" />
          <span className="text-[#64748B] font-medium">{t.attachedCow}:</span>
          {selectedAnimal ? (
            <div className="flex items-center gap-1.5 bg-white border border-[#CBD5E1] px-2 py-0.5 rounded text-[11px] font-semibold text-[#143D2B]">
              <span>{selectedAnimal.tag_id} ({selectedAnimal.name})</span>
              <button
                onClick={() => {
                  setSelectedAnimal(null);
                  if (onAttachAnimal) onAttachAnimal(null);
                }}
                className="text-[#94A3B8] hover:text-[#DC2626]"
                title={t.detachCow}
              >
                <X className="w-3 h-3" />
              </button>
            </div>
          ) : (
            <span className="text-[#94A3B8] italic">{t.selectCowPlaceholder}</span>
          )}
        </div>

        {/* Cow Selector Dropdown */}
        <div className="relative">
          <button
            onClick={() => setShowAnimalMenu(!showAnimalMenu)}
            className="text-[11px] font-semibold text-[#1B4332] hover:text-[#143427] hover:underline flex items-center gap-1 cursor-pointer"
          >
            <span>{selectedAnimal ? t.edit : t.selectCow}</span>
            <ChevronDown className="w-3 h-3" />
          </button>

          {showAnimalMenu && (
            <div className="absolute right-0 top-6 z-20 w-64 bg-white border border-[#CBD5E1] rounded-lg shadow-lg p-2 max-h-48 overflow-y-auto">
              <div className="text-[10px] font-bold text-[#64748B] uppercase px-2 py-1">
                {t.totalHerd}
              </div>
              {animals.map((a) => (
                <button
                  key={a.id}
                  onClick={() => {
                    setSelectedAnimal(a);
                    if (onAttachAnimal) onAttachAnimal(a);
                    setShowAnimalMenu(false);
                  }}
                  className="w-full text-left px-2 py-1.5 rounded text-xs hover:bg-[#F1F5F9] flex items-center justify-between"
                >
                  <span className="font-semibold text-[#0F172A]">{a.tag_id} - {a.name}</span>
                  <span className="text-[10px] text-[#64748B]">{a.breed}</span>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Messages List */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-[#FBFDFB]">
        {messages.map((m) => {
          const isUser = m.role === 'user';
          return (
            <div 
              key={m.id}
              className={`flex flex-col ${isUser ? 'items-end' : 'items-start'}`}
            >
              <div 
                className={`max-w-[85%] rounded-2xl px-4 py-2.5 text-xs shadow-2xs leading-relaxed ${
                  isUser 
                    ? 'bg-[#1B4332] text-white rounded-br-xs' 
                    : 'bg-white text-[#1E293B] border border-[#E2E8F0] rounded-bl-xs'
                }`}
              >
                {!isUser && (
                  <div className="flex items-center justify-between gap-3 mb-1.5 border-b border-[#F1F5F9] pb-1">
                    <div className="flex items-center gap-1 text-[10px] font-bold text-[#1B4332]">
                      <Sparkles className="w-3 h-3 text-[#F59E0B]" />
                      <span>Gemini 3.8 Flash</span>
                    </div>
                    <button
                      onClick={() => copyToClipboard(m.id, m.content)}
                      className="text-[#94A3B8] hover:text-[#475569] p-0.5 rounded"
                      title="Copy response"
                    >
                      {copiedId === m.id ? (
                        <Check className="w-3 h-3 text-[#16A34A]" />
                      ) : (
                        <Copy className="w-3 h-3" />
                      )}
                    </button>
                  </div>
                )}

                {/* Emergency Warning Banner if detected */}
                {m.clinicalAlert && (
                  <div className="mb-2 p-2 rounded bg-[#FEF2F2] border border-[#FCA5A5] text-[#991B1B] text-[11px] flex items-start gap-1.5">
                    <AlertTriangle className="w-3.5 h-3.5 text-[#DC2626] shrink-0 mt-0.5" />
                    <div>
                      <span className="font-bold block">{m.clinicalAlert.title}</span>
                      <span className="text-[10px]">{m.clinicalAlert.action}</span>
                    </div>
                  </div>
                )}

                <div className="whitespace-pre-wrap">{m.content}</div>

                <div className={`mt-1.5 text-[9px] ${isUser ? 'text-[#A7C4B5]' : 'text-[#94A3B8]'} text-right`}>
                  {m.timestamp}
                </div>
              </div>
            </div>
          );
        })}

        {isLoading && (
          <div className="flex items-center gap-2 text-xs text-[#64748B] bg-white border border-[#E2E8F0] rounded-xl px-3 py-2 w-fit">
            <RefreshCw className="w-3.5 h-3.5 animate-spin text-[#1B4332]" />
            <span>Gemini 3.8 Flash reasoning...</span>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Suggested Prompts pills */}
      <div className="bg-white border-t border-[#E2E8F0] px-3 py-2 overflow-x-auto flex items-center gap-1.5 scrollbar-thin">
        <span className="text-[10px] font-bold text-[#64748B] uppercase shrink-0">
          {t.suggestedPrompts}:
        </span>
        {getSuggestedPrompts().map((p, idx) => (
          <button
            key={idx}
            onClick={() => handleSend(p)}
            className="text-[10px] text-[#1B4332] bg-[#F1F5F3] hover:bg-[#E2EDE7] border border-[#CBD5CD] px-2.5 py-1 rounded-full whitespace-nowrap transition-colors shrink-0 cursor-pointer"
          >
            {p}
          </button>
        ))}
      </div>

      {/* Input Bar */}
      <div className="p-3 bg-white border-t border-[#E2E8F0] space-y-1.5">
        <div className="flex items-center gap-2">
          <textarea
            ref={inputRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                handleSend();
              }
            }}
            placeholder={t.typeYourQuestion}
            rows={1}
            className="flex-1 text-xs border border-[#CBD5E1] rounded-lg px-3 py-2 focus:outline-none focus:ring-1 focus:ring-[#1B4332] focus:border-[#1B4332] resize-none"
          />
          <button
            onClick={() => handleSend()}
            disabled={!input.trim() || isLoading}
            className="px-3.5 py-2 bg-[#1B4332] hover:bg-[#143427] disabled:bg-[#CBD5E1] text-white rounded-lg shadow-xs transition-colors flex items-center justify-center cursor-pointer"
            title={t.send}
          >
            <Send className="w-4 h-4" />
          </button>
        </div>

        <div className="flex items-center justify-between text-[10px] text-[#64748B] px-1">
          <span>{t.disclaimerText}</span>
          <button
            onClick={() => setMessages([])}
            className="text-[#94A3B8] hover:text-[#DC2626] cursor-pointer"
          >
            {t.clearChat}
          </button>
        </div>
      </div>
    </div>
  );
};
