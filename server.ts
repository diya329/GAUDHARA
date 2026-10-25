import express from 'express';
import { createServer as createViteServer } from 'vite';
import path from 'path';
import { fileURLToPath } from 'url';
import { spawn } from 'child_process';
import dotenv from 'dotenv';
import { GoogleGenAI } from '@google/genai';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const geminiApiKey = process.env.GEMINI_API_KEY || '';
let aiClient: GoogleGenAI | null = null;
if (geminiApiKey) {
  aiClient = new GoogleGenAI({
    apiKey: geminiApiKey,
    httpOptions: {
      headers: {
        'User-Agent': 'aistudio-build',
      },
    },
  });
}

async function startServer() {
  const app = express();
  const portArgIndex = process.argv.indexOf('--port');
  const cliPort = portArgIndex !== -1 ? Number(process.argv[portArgIndex + 1]) : null;
  const PORT = cliPort || (process.env.PORT && process.env.PORT !== '8080' ? Number(process.env.PORT) : 3000);

  app.use(express.json({ limit: '10mb' }));

  // API Route: Nodus Compute / Local Rule-Engine Screening execution
  app.post('/api/screenings/compute', async (req, res) => {
    try {
      const sample = req.body;
      const jsonPayload = JSON.stringify(sample);

      // Execute Python screening module
      const pythonProcess = spawn('python3', [
        '-c',
        'import sys, json; from backend.main import process_screening_request; print(json.dumps(process_screening_request(json.loads(sys.stdin.read()))))'
      ], {
        env: {
          ...process.env,
          PYTHONPATH: __dirname,
        }
      });

      let stdout = '';
      let stderr = '';

      pythonProcess.stdout.on('data', (data) => {
        stdout += data.toString();
      });

      pythonProcess.stderr.on('data', (data) => {
        stderr += data.toString();
      });

      pythonProcess.on('close', (code) => {
        if (code !== 0) {
          console.error('Python execution error:', stderr);
          return res.status(500).json({
            status: 'failed',
            error: 'Screening computation failed in python engine',
            details: stderr || 'Unknown execution failure'
          });
        }

        try {
          const result = JSON.parse(stdout.trim());
          return res.json(result);
        } catch (parseErr) {
          console.error('Failed to parse Python output:', stdout);
          return res.status(500).json({
            status: 'failed',
            error: 'Invalid computation output format',
            raw: stdout
          });
        }
      });

      pythonProcess.stdin.write(jsonPayload);
      pythonProcess.stdin.end();

    } catch (err: any) {
      console.error('Server error processing screening:', err);
      res.status(500).json({
        status: 'failed',
        error: err.message || 'Internal screening service failure'
      });
    }
  });

  // API Route: Nodus Compute Workload Lab (Dual Execution & Concordance Engine)
  app.post('/api/nodus/workload-lab', async (req, res) => {
    try {
      const payload = req.body;
      const jsonPayload = JSON.stringify(payload);

      const pythonProcess = spawn('python3', [
        '-c',
        'import sys, json; from backend.main import process_workload_lab_request; print(json.dumps(process_workload_lab_request(json.loads(sys.stdin.read()))))'
      ], {
        env: {
          ...process.env,
          PYTHONPATH: __dirname,
        }
      });

      let stdout = '';
      let stderr = '';

      pythonProcess.stdout.on('data', (data) => {
        stdout += data.toString();
      });

      pythonProcess.stderr.on('data', (data) => {
        stderr += data.toString();
      });

      pythonProcess.on('close', (code) => {
        if (code !== 0) {
          console.error('Python workload lab error:', stderr);
          return res.status(500).json({
            status: 'failed',
            error: 'Workload lab execution failed in python engine',
            details: stderr || 'Unknown execution failure'
          });
        }

        try {
          const result = JSON.parse(stdout.trim());
          if (result.status === 'validation_failed') {
            return res.status(400).json(result);
          }
          return res.json(result);
        } catch (parseErr) {
          console.error('Failed to parse Workload Lab output:', stdout);
          return res.status(500).json({
            status: 'failed',
            error: 'Invalid computation output format',
            raw: stdout
          });
        }
      });

      pythonProcess.stdin.write(jsonPayload);
      pythonProcess.stdin.end();

    } catch (err: any) {
      console.error('Server error processing workload lab:', err);
      res.status(500).json({
        status: 'failed',
        error: err.message || 'Internal workload lab service failure'
      });
    }
  });

  // API Route: Nodus status & configuration
  app.get('/api/nodus/status', (_req, res) => {
    const hasKey = Boolean(process.env.NODUS_API_KEY && process.env.NODUS_API_KEY.trim().length > 0);
    res.json({
      configured: hasKey,
      provider: hasKey ? 'nodus_compute' : 'edge_engine',
      documentation_url: 'https://www.nodus-compute.ai/docs/',
      sdk_repo: 'https://github.com/Nodus-compute/Nodus-sdk-python',
      environment: process.env.NODE_ENV || 'development',
      message: hasKey 
        ? 'Nodus Compute credentials active. Workloads dispatched to remote GPU/CPU cloud cluster.'
        : 'Running in Autonomous Edge Engine Mode. Local veterinary physiological rule verification is active.'
    });
  });

  // Helper for Gemini Language names
  const GEMINI_LANG_NAMES: Record<string, string> = {
    en: 'English',
    hi: 'Hindi (हिन्दी)',
    as: 'Assamese (অসমীয়া)',
    pa: 'Punjabi (ਪੰਜਾਬੀ)',
    gu: 'Gujarati (ગુજરાતી)',
    mr: 'Marathi (मराठी)',
    bn: 'Bengali (বাংলা)',
    ta: 'Tamil (தமிழ்)'
  };

  const EMERGENCY_TERMS = [
    'fever', 'blood', 'pus', 'swelling', 'hard quarter', 'hot udder',
    'clot', 'flake', 'downer', 'anorexia', 'off feed',
    'बुखार', 'खून', 'मवाद', 'सूजन', 'थक्के', 'चारा नहीं'
  ];

  function detectEmergency(text: string) {
    const lower = text.toLowerCase();
    for (const term of EMERGENCY_TERMS) {
      if (lower.includes(term)) {
        return {
          level: 'urgent',
          title: 'Immediate Veterinary Consultation Recommended',
          action: 'Physical clinical signs (acute udder swelling, fever, clots/blood in milk, or systemic depression) indicate severe mastitis. Isolate animal, withhold milk, and contact a licensed veterinarian immediately.'
        };
      }
    }
    return null;
  }

  // API Route: Direct Gemini Veterinary AI Chatbot
  app.post('/api/chat/gemini', async (req, res) => {
    try {
      const { message, history, language = 'en', animalContext } = req.body;
      if (!message || typeof message !== 'string') {
        return res.status(400).json({ error: 'Message text is required' });
      }

      const emergencyAlert = detectEmergency(message);
      const targetLangName = GEMINI_LANG_NAMES[language] || 'English';

      if (aiClient) {
        const systemInstruction = `You are GauDhara's Veterinary AI Clinical Assistant powered by Google Gemini 3.8 Flash, specializing in dairy bovine mastitis prevention, early quarter-conductivity screening, somatic cell count (SCC) interpretation, and herd hygiene management.

Key Clinical & Veterinary Principles:
1. Quarter Electrical Conductivity (EC):
   - Normal physiological baseline: 4.0 - 5.5 mS/cm.
   - Significant disparity: If any quarter EC is >= 1.15x higher than the lowest quarter (Quarter Differential Ratio QDR >= 1.15), flag for unilateral subclinical mastitis.
   - Acute threshold: Absolute EC > 6.0 mS/cm with milk pH > 6.8 indicates severe inflammation.
2. Somatic Cell Count (SCC) Proxies:
   - < 200,000 cells/mL: Healthy uninfected quarter.
   - 200,000 - 500,000 cells/mL: Mild inflammation / early subclinical mastitis.
   - > 750,000 cells/mL: Clinical mastitis risk requiring prompt intervention.
3. Milk pH: Normal bovine milk pH is 6.5 - 6.7. Elevated pH (>6.8) reflects vascular permeability and blood ion leakage.
4. Clean Sampling SOP: Strip foremilk (3-4 streams) into dark strip cup to check clots; clean teats with 0.5% chlorhexidine or iodine dip; dry with individual paper towels before collecting sample for EC/CMT testing.
5. Strict Safety Triage:
   - For acute clinical signs (fever, swollen hard hot udder, clots or blood in milk, anorexia, downer cow), urge immediate registered veterinary examination. Never prescribe prescription pharmaceuticals without on-site physical diagnosis.
   - GauDhara provides early pre-clinical screening, not definitive direct diagnosis.
6. Language: You MUST reply fluently, idiomatically, and completely in ${targetLangName}. Ensure accurate veterinary and dairy terminology.`;

        const contents: any[] = [];
        if (Array.isArray(history)) {
          for (const item of history.slice(-6)) {
            contents.push({
              role: item.role === 'user' ? 'user' : 'model',
              parts: [{ text: item.content || item.text || '' }]
            });
          }
        }

        let contextualUserText = message;
        if (animalContext) {
          contextualUserText += `\n\n[Active Animal Telemetry: Tag: ${animalContext.tag_id || animalContext.id}, Breed: ${animalContext.breed || 'Bovine'}, Lactation: ${animalContext.lactation_stage || 'Active'}, Status: ${animalContext.status || 'Screened'}, Recent EC: ${animalContext.last_ec || 'Normal'} mS/cm, Parity: ${animalContext.parity || 1}]`;
        }

        contents.push({
          role: 'user',
          parts: [{ text: contextualUserText }]
        });

        const geminiResponse = await aiClient.models.generateContent({
          model: 'gemini-3.8-flash',
          contents,
          config: {
            systemInstruction,
            temperature: 0.25,
            maxOutputTokens: 1000
          }
        });

        const reply = geminiResponse.text || 'Diagnostic response could not be generated.';

        return res.json({
          reply,
          provider: 'gemini-3.8-flash',
          model_name: 'gemini-3.8-flash',
          is_fallback: false,
          status: 'success',
          timestamp: new Date().toISOString(),
          language,
          clinical_alert: emergencyAlert,
          disclaimer: 'Veterinary Advisory: GauDhara is a pre-clinical mastitis screening aid. Always consult a registered veterinarian for clinical interventions.'
        });
      }

      // Intelligent Deterministic Veterinary Fallback when GEMINI_API_KEY is unset
      let fallbackReply = `GauDhara Veterinary Clinical Assistant:\n\nRegarding your inquiry: In bovine mastitis screening, electrical conductivity (EC) differential is the gold standard for early subclinical detection. Normal milk conductivity is 4.0–5.5 mS/cm. If any quarter exhibits an inter-quarter ratio >= 1.15x compared to the lowest quarter, unilateral subclinical mastitis is suspected. Always verify with California Mastitis Test (CMT) and bacteriological culture before antibiotic intervention.`;

      if (language === 'hi') {
        fallbackReply = `गौधारा पशु चिकित्सा सहायक:\n\nआपके प्रश्न के अनुसार: प्रारंभिक थनैला (सबक्लिनिकल मैस्टाइटिस) जांच में विद्युत चालकता (EC) अंतर सबसे महत्वपूर्ण संकेतक है। सामान्य दूध की चालकता 4.0 से 5.5 mS/cm होती है। यदि किसी एक क्वार्टर (थन) की चालकता न्यूनतम क्वार्टर से 1.15 गुना अधिक है (QDR >= 1.15), तो यह प्रारंभिक थनैला का संकेत है। एंटीबायोटिक देने से पहले हमेशा कैलिफ़ोर्निया मैस्टाइटिस टेस्ट (CMT) और पशु चिकित्सक से परामर्श लें।`;
      } else if (language === 'pa') {
        fallbackReply = `ਗਊਧਾਰਾ ਵੈਟਰਨਰੀ ਸਹਾਇਕ:\n\nਡੇਅਰੀ ਪਸ਼ੂਆਂ ਵਿੱਚ ਮਸਟਾਈਟਿਸ (ਥਣੇਲਾ) ਦੀ ਜਾਂਚ ਲਈ ਦੁੱਧ ਦੀ ਬਿਜਲਈ ਚਾਲਕਤਾ (Conductivity) 4.0 ਤੋਂ 5.5 mS/cm ਆਮ ਮੰਨੀ ਜਾਂਦੀ ਹੈ। ਜੇਕਰ ਕਿਸੇ ਇੱਕ ਥਣ ਵਿੱਚ ਚਾਲਕਤਾ ਬਾਕੀ ਥਣਾਂ ਨਾਲੋਂ 1.15 ਗੁਣਾ ਵੱਧ ਹੈ, ਤਾਂ ਇਹ ਸ਼ੁਰੂਆਤੀ ਸਬ-ਕਲੀਨਿਕਲ ਮਸਟਾਈਟਿਸ ਦਾ ਲੱਛਣ ਹੈ। ਤੁਰੰਤ ਪਸ਼ੂ ਡਾਕਟਰ ਦੀ ਸਲਾਹ ਲਓ।`;
      } else if (language === 'gu') {
        fallbackReply = `ગૌધારા પશુચિકિત્સક સહાયક:\n\nદૂધાળા પશુઓમાં મસ્ટાઇટિસની પ્રારંભિક તપાસ માટે કંડક્ટિવિટી (Conductivity) 4.0 થી 5.5 mS/cm સામાન્ય છે. જો કોઈ એક ક્વાર્ટરની કંડક્ટિવિટી અન્ય કરતા 1.15 ગણી વધારે હોય (QDR >= 1.15), તો તે સબક્લિનિકલ મસ્ટાઇટિસ દર્શાવે છે. યોગ્ય સ્વચ્છતા અને પશુચિકિત્સકની સલાહ જરૂરી છે.`;
      } else if (language === 'as') {
        fallbackReply = `গৌধাৰা পশু চিকিৎসা সহায়ক:\n\nগাখীৰতী গৰুৰ ওলহী (মেষ্টাইটিছ) ৰোগৰ প্ৰাথমিক পৰীক্ষাৰ বাবে গাখীৰৰ ইলেক্ট্ৰিকেল কণ্ডাক্টিভিটি ৪.০ ৰ পৰা ৫.৫ mS/cm স্বাভাৱিক। যদি কোনো এটা ওলহৰ কণ্ডাক্টিভিটি ১.১৫ গুণতকৈ অধিক হয়, তেন্তে ই মেষ্টাইটিছৰ প্ৰাৰম্ভিক লক্ষণ। অতিশীঘ্ৰে পশু চিকিৎসকৰ পৰামৰ্শ লওক।`;
      }

      return res.json({
        reply: fallbackReply,
        provider: 'gemini-fallback',
        model_name: 'gemini-3.8-flash (offline mode)',
        is_fallback: true,
        status: 'success',
        timestamp: new Date().toISOString(),
        language,
        clinical_alert: emergencyAlert,
        disclaimer: 'Veterinary Advisory: GauDhara is a pre-clinical mastitis screening aid. Always consult a registered veterinarian for clinical interventions.'
      });

    } catch (err: any) {
      console.error('Gemini chat error:', err);
      res.status(500).json({
        error: err.message || 'Gemini chat processing error',
        is_fallback: true,
        reply: 'An error occurred connecting to the Gemini Veterinary AI engine. Please verify connectivity.'
      });
    }
  });

  // API Route: Gemini diagnostic status
  app.get('/api/gemini/status', (_req, res) => {
    res.json({
      configured: Boolean(geminiApiKey),
      model: 'gemini-3.8-flash',
      provider: 'gemini_official_sdk',
      supported_languages: Object.keys(GEMINI_LANG_NAMES),
      sdk: '@google/genai',
      user_agent: 'aistudio-build',
      status: geminiApiKey ? 'active' : 'unconfigured_fallback'
    });
  });

  // Common veterinary phrase fallback dictionary for offline mode
  const OFFLINE_TRANSLATION_MAP: Record<string, Record<string, string>> = {
    hi: {
      'Healthy Baseline': 'सामान्य स्वस्थ मानक',
      'Subclinical Suspect': 'प्रारंभिक संदिग्ध थनैला',
      'Clinical Alert': 'गंभीर चिकित्सीय अलर्ट',
      'Requires Follow-up': 'निगरानी आवश्यक',
      'Electrical Conductivity': 'विद्युत चालकता',
      'Somatic Cell Count': 'सोमैटिक सेल काउंट',
      'Quarter Differential Ratio': 'क्वार्टर अंतर अनुपात',
      'Milking Parlor': 'दूध दोहने का स्थान',
      'Isolation Pen': 'अलग बाड़ा'
    },
    pa: {
      'Healthy Baseline': 'ਆਮ ਤੰਦਰੁਸਤ ਮਿਆਰ',
      'Subclinical Suspect': 'ਸ਼ੱਕੀ ਮਸਟਾਈਟਿਸ',
      'Clinical Alert': 'ਗੰਭੀਰ ਚੇਤਾਵਨੀ',
      'Requires Follow-up': 'ਨਿਗਰਾਨੀ ਦੀ ਲੋੜ',
      'Electrical Conductivity': 'ਬਿਜਲਈ ਚਾਲਕਤਾ',
      'Somatic Cell Count': 'ਸੈੱਲ ਗਿਣਤੀ',
      'Quarter Differential Ratio': 'ਕੁਆਰਟਰ ਅੰਤਰ ਅਨੁਪਾਤ',
      'Milking Parlor': 'ਮਿਲਕਿੰਗ ਪਾਰਲਰ',
      'Isolation Pen': 'ਵੱਖਰਾ ਵਾੜਾ'
    },
    gu: {
      'Healthy Baseline': 'સામાન્ય તંદુરસ્ત ધોરણ',
      'Subclinical Suspect': 'પ્રારંભિક શંકાસ્પદ મસ્ટાઇટિસ',
      'Clinical Alert': 'ગંભીર ચેતવણી',
      'Requires Follow-up': 'ધ્યાન જરૂરી',
      'Electrical Conductivity': 'વિદ્યુત વાહકતા',
      'Somatic Cell Count': 'સોમેટિક સેલ કાઉન્ટ',
      'Quarter Differential Ratio': 'ક્વાર્ટર તફાવત ગુણોત્તર',
      'Milking Parlor': 'મિલ્કિંગ પાર્લર',
      'Isolation Pen': 'અલગ વાડો'
    },
    as: {
      'Healthy Baseline': 'স্বাভাৱিক সুস্থ মানদণ্ড',
      'Subclinical Suspect': 'প্ৰাৰম্ভিক সন্দেহজনক ওলহী',
      'Clinical Alert': 'গুৰুতৰ সতৰ্কবাৰ্তা',
      'Requires Follow-up': 'নজৰ ৰখা প্ৰয়োজন',
      'Electrical Conductivity': 'বিদ্যুৎ পৰিবাহিতা',
      'Somatic Cell Count': 'চেল গণনা',
      'Quarter Differential Ratio': 'ওলহৰ পাৰ্থক্য অনুপাত',
      'Milking Parlor': 'গাখীৰ খীৰোৱা ঠাই',
      'Isolation Pen': 'পৃথক কোঠা'
    },
    mr: {
      'Healthy Baseline': 'सामान्य निरोगी प्रमाणक',
      'Subclinical Suspect': 'संभाव्य सौम्य स्तनदाह',
      'Clinical Alert': 'गंभीर सतर्कता सूचना',
      'Requires Follow-up': 'विशेष लक्ष आवश्यक',
      'Electrical Conductivity': 'विद्युत वाहकता',
      'Somatic Cell Count': 'सोमॅटिक सेल संख्या',
      'Quarter Differential Ratio': 'कास फरक गुणोत्तर',
      'Milking Parlor': 'दूध काढण्याची जागा',
      'Isolation Pen': 'विलगीकरण कक्ष'
    },
    bn: {
      'Healthy Baseline': 'স্বাভাবিক সুস্থ মানদণ্ড',
      'Subclinical Suspect': 'প্রাথমিক ওলান ফোলা সন্দেহ',
      'Clinical Alert': 'জরুরি সতর্কতা সংকেত',
      'Requires Follow-up': 'নজরদারি প্রয়োজন',
      'Electrical Conductivity': 'বৈদ্যুতিক পরিবাহিতা',
      'Somatic Cell Count': 'সোম্যাটিক সেল কাউন্ট',
      'Quarter Differential Ratio': 'ওলানের পার্থক্য অনুপাত',
      'Milking Parlor': 'দুধ দোহন শেড',
      'Isolation Pen': 'পৃথকীকরণ শেড'
    },
    ta: {
      'Healthy Baseline': 'இயல்பான ஆரோக்கிய நிலை',
      'Subclinical Suspect': 'ஆரம்ப சந்தேகத்திற்குரிய மடிநோய்',
      'Clinical Alert': 'தீவிர மருத்துவ எச்சரிக்கை',
      'Requires Follow-up': 'கவனம் தேவைப்படுபவை',
      'Electrical Conductivity': 'மின்னோட்ட கடத்துத்திறன்',
      'Somatic Cell Count': 'செல்கள் எண்ணிக்கை',
      'Quarter Differential Ratio': 'மடி வேறுபாட்டு விகிதம்',
      'Milking Parlor': 'பால் கறக்கும் இடம்',
      'Isolation Pen': 'தனிமைப்படுத்தும் கொட்டகை'
    }
  };

  // API Route: Translation API status
  app.get('/api/translate/status', (_req, res) => {
    res.json({
      status: 'active',
      provider: aiClient ? 'gemini-3.8-flash-translation-api' : 'offline-deterministic-translator',
      configured: Boolean(aiClient),
      supported_languages: Object.keys(GEMINI_LANG_NAMES).map(code => ({
        code,
        name: GEMINI_LANG_NAMES[code]
      })),
      features: ['single_translation', 'batch_translation', 'veterinary_domain_preservation']
    });
  });

  // API Route: Translation API - Single Text
  app.post('/api/translate', async (req, res) => {
    try {
      const { text, targetLanguage = 'en', sourceLanguage = 'auto' } = req.body;
      if (!text || typeof text !== 'string') {
        return res.status(400).json({ error: 'Text string is required for translation' });
      }

      const targetLangName = GEMINI_LANG_NAMES[targetLanguage] || targetLanguage;
      const sourceLangName = sourceLanguage !== 'auto' ? (GEMINI_LANG_NAMES[sourceLanguage] || sourceLanguage) : 'auto-detected language';

      if (aiClient) {
        const prompt = `You are GauDhara's dedicated Veterinary & Agricultural Translation API engine powered by Google Gemini 3.8 Flash.
Translate the text below accurately and idiomatically from ${sourceLangName} into ${targetLangName} (Language code: ${targetLanguage}).

CRITICAL TRANSLATION RULES:
1. Preserve veterinary and diagnostic precision:
   - Keep numbers, measurements, and units intact (e.g., "5.8 mS/cm", "QDR 1.15x", "SCC 250,000 cells/mL", "39.2 °C", "pH 6.6").
   - Keep anatomical quarter codes: Front-Left (FL), Front-Right (FR), Rear-Left (RL), Rear-Right (RR).
   - Keep diagnostic abbreviations: CMT, EC, SCC, QDR, RFID.
2. Natural phrasing for rural dairy farmers and veterinary professionals.
3. Return ONLY the translated string without quotes, formatting, or extra explanations.

Text:
"""
${text}
"""`;

        const geminiResponse = await aiClient.models.generateContent({
          model: 'gemini-3.8-flash',
          contents: [{ role: 'user', parts: [{ text: prompt }] }],
          config: {
            temperature: 0.1,
            maxOutputTokens: 1200
          }
        });

        const translatedText = geminiResponse.text?.trim() || text;

        return res.json({
          translated_text: translatedText,
          original_text: text,
          source_language: sourceLanguage,
          target_language: targetLanguage,
          provider: 'gemini-3.8-flash-translation-api',
          status: 'success',
          timestamp: new Date().toISOString()
        });
      }

      // Offline deterministic fallback
      const langMap = OFFLINE_TRANSLATION_MAP[targetLanguage];
      const trimmed = text.trim();
      const fallbackTranslation = (langMap && langMap[trimmed]) ? langMap[trimmed] : trimmed;

      return res.json({
        translated_text: fallbackTranslation,
        original_text: text,
        source_language: sourceLanguage,
        target_language: targetLanguage,
        provider: 'offline-deterministic-translator',
        status: 'success',
        is_fallback: true,
        timestamp: new Date().toISOString()
      });

    } catch (err: any) {
      console.error('Translation API error:', err);
      res.status(500).json({
        error: err.message || 'Translation API execution failed',
        translated_text: req.body?.text || '',
        provider: 'error_fallback',
        status: 'error'
      });
    }
  });

  // API Route: Translation API - Batch
  app.post('/api/translate/batch', async (req, res) => {
    try {
      const { texts, targetLanguage = 'en', sourceLanguage = 'auto' } = req.body;
      if (!Array.isArray(texts) || texts.length === 0) {
        return res.status(400).json({ error: 'texts array is required' });
      }

      const targetLangName = GEMINI_LANG_NAMES[targetLanguage] || targetLanguage;

      if (aiClient) {
        const prompt = `You are GauDhara's Veterinary & Agricultural Translation API engine powered by Google Gemini 3.8 Flash.
Translate the following array of ${texts.length} strings into ${targetLangName} (code: ${targetLanguage}).
Maintain veterinary domain terms (mastitis, EC, QDR, SCC, mS/cm, quarters FL/FR/RL/RR).
Return a valid JSON array of translated strings with EXACTLY the same length (${texts.length}).
Do not include markdown or backticks. Return JSON array only: ["...", "..."]

Input texts:
${JSON.stringify(texts)}`;

        const geminiResponse = await aiClient.models.generateContent({
          model: 'gemini-3.8-flash',
          contents: [{ role: 'user', parts: [{ text: prompt }] }],
          config: {
            temperature: 0.1,
            maxOutputTokens: 2000
          }
        });

        const raw = (geminiResponse.text || '').trim();
        let cleaned = raw;
        if (cleaned.startsWith('```json')) cleaned = cleaned.replace(/^```json/, '').replace(/```$/, '').trim();
        else if (cleaned.startsWith('```')) cleaned = cleaned.replace(/^```/, '').replace(/```$/, '').trim();

        try {
          const parsed = JSON.parse(cleaned);
          if (Array.isArray(parsed) && parsed.length === texts.length) {
            return res.json({
              translations: parsed,
              target_language: targetLanguage,
              provider: 'gemini-3.8-flash-translation-api',
              status: 'success'
            });
          }
        } catch (e) {
          console.warn('Failed to parse Gemini batch translation JSON, falling back:', e);
        }
      }

      // Offline or error fallback: map individual texts
      const langMap = OFFLINE_TRANSLATION_MAP[targetLanguage] || {};
      const fallbackList = texts.map((t: string) => langMap[t.trim()] || t);

      return res.json({
        translations: fallbackList,
        target_language: targetLanguage,
        provider: aiClient ? 'gemini-3.8-flash-partial' : 'offline-deterministic-translator',
        status: 'success'
      });
    } catch (err: any) {
      console.error('Batch translation error:', err);
      res.status(500).json({
        error: err.message || 'Batch translation execution failed',
        translations: req.body?.texts || []
      });
    }
  });

  // API Route: Veterinary AI Assistant Chat endpoint (Unifies Gemini & Multi-Engine)
  app.post('/api/assistant/chat', async (req, res) => {
    try {
      const chatPayload = req.body;
      
      // If client requests Gemini or if Gemini is configured and Agent37 is not explicitly selected
      if (chatPayload.provider === 'gemini' || (aiClient && chatPayload.provider !== 'agent37')) {
        const { message, conversation_history, language = 'en', tag_id, animal_id, animal_records } = chatPayload;
        let animalCtx = null;
        if (animal_records && (tag_id || animal_id)) {
          animalCtx = animal_records.find((a: any) => a.id === animal_id || a.tag_id === tag_id);
        }

        const emergencyAlert = detectEmergency(message);
        const targetLangName = GEMINI_LANG_NAMES[language] || 'English';

        if (aiClient) {
          const systemInstruction = `You are GauDhara's Veterinary AI Clinical Assistant powered by Google Gemini 3.8 Flash, specializing in dairy bovine mastitis prevention, early quarter-conductivity screening, somatic cell count (SCC) interpretation, and herd hygiene management.

Adhere to these clinical guidelines:
1. Quarter EC differential >= 1.15x is the primary indicator of unilateral subclinical mastitis.
2. Normal EC: 4.0 - 5.5 mS/cm. Elevated: > 5.8 mS/cm. Critical: > 6.5 mS/cm.
3. Somatic Cell Count: <200k/mL healthy, 200k-500k/mL subclinical, >750k/mL clinical.
4. Normal milk pH: 6.5 - 6.7. Elevated pH (>6.8) indicates vascular permeability.
5. If acute clinical signs (fever, hot hard swollen quarter, clots, blood) are described, urge immediate licensed veterinarian intervention.
6. Answer completely and naturally in ${targetLangName}.`;

          const contents: any[] = [];
          if (Array.isArray(conversation_history)) {
            for (const item of conversation_history.slice(-6)) {
              contents.push({
                role: item.role === 'user' ? 'user' : 'model',
                parts: [{ text: item.content || item.text || '' }]
              });
            }
          }

          let promptText = message;
          if (animalCtx) {
            promptText += `\n\n[Cow Context: Tag ${animalCtx.tag_id}, Name: ${animalCtx.name}, Breed: ${animalCtx.breed}, Lactation: ${animalCtx.lactation_stage}, Parity: ${animalCtx.parity}, Status: ${animalCtx.status}]`;
          }

          contents.push({
            role: 'user',
            parts: [{ text: promptText }]
          });

          const geminiResponse = await aiClient.models.generateContent({
            model: 'gemini-3.8-flash',
            contents,
            config: {
              systemInstruction,
              temperature: 0.25,
              maxOutputTokens: 900
            }
          });

          return res.json({
            reply: geminiResponse.text || 'No diagnostic response returned.',
            provider: 'gemini-3.8-flash',
            model_name: 'gemini-3.8-flash',
            is_fallback: false,
            status: 'success',
            timestamp: new Date().toISOString(),
            language,
            referenced_animal: animalCtx,
            clinical_alert: emergencyAlert,
            disclaimer: 'Veterinary Advisory: GauDhara provides pre-clinical screening. Always consult a licensed veterinarian for definitive diagnosis.'
          });
        }
      }

      // Delegate to Python chat engine if Agent37 or Python inference requested
      const jsonPayload = JSON.stringify(chatPayload);
      const pythonProcess = spawn('python3', [
        '-c',
        'import sys, json; from backend.main import process_chat_request; print(json.dumps(process_chat_request(json.loads(sys.stdin.read()))))'
      ], {
        env: {
          ...process.env,
          PYTHONPATH: __dirname,
        }
      });

      let stdout = '';
      let stderr = '';

      pythonProcess.stdout.on('data', (data) => {
        stdout += data.toString();
      });

      pythonProcess.stderr.on('data', (data) => {
        stderr += data.toString();
      });

      pythonProcess.on('close', (code) => {
        if (code !== 0) {
          console.error('Python assistant error:', stderr);
          return res.status(500).json({
            status: 'failed',
            error: 'Assistant processing failed in backend engine',
            reply: 'The veterinary assistant encountered an execution error. Please try again or consult on-site clinical staff.',
            is_fallback: true,
            provider: 'error_handler'
          });
        }

        try {
          const result = JSON.parse(stdout.trim());
          if (result.status === 'rate_limited') {
            return res.status(429).json(result);
          }
          if (result.status === 'error') {
            return res.status(400).json(result);
          }
          return res.json(result);
        } catch (parseErr) {
          console.error('Failed to parse Python assistant output:', stdout);
          return res.status(500).json({
            status: 'failed',
            error: 'Invalid assistant response format',
            reply: 'Invalid response format received from inference service.',
            is_fallback: true
          });
        }
      });

      pythonProcess.stdin.write(jsonPayload);
      pythonProcess.stdin.end();

    } catch (err: any) {
      console.error('Server error processing chat:', err);
      res.status(500).json({
        status: 'failed',
        error: err.message || 'Internal chat assistant failure',
        is_fallback: true
      });
    }
  });

  // API Route: Herd Health Action Planner (Agent37 Multi-Step Workflow)
  app.post('/api/agent37/action-plan', async (req, res) => {
    try {
      const planPayload = req.body;
      const jsonPayload = JSON.stringify(planPayload);

      const pythonProcess = spawn('python3', [
        '-c',
        'import sys, json; from backend.main import process_action_plan_request; print(json.dumps(process_action_plan_request(json.loads(sys.stdin.read()))))'
      ], {
        env: {
          ...process.env,
          PYTHONPATH: __dirname,
        }
      });

      let stdout = '';
      let stderr = '';

      pythonProcess.stdout.on('data', (data) => {
        stdout += data.toString();
      });

      pythonProcess.stderr.on('data', (data) => {
        stderr += data.toString();
      });

      pythonProcess.on('close', (code) => {
        if (code !== 0) {
          console.error('Python Action Planner error:', stderr);
          return res.status(500).json({
            status: 'failed',
            error: 'Action planner failed in backend engine',
            details: stderr || 'Execution error'
          });
        }

        try {
          const result = JSON.parse(stdout.trim());
          return res.json(result);
        } catch (parseErr) {
          console.error('Failed to parse Action Planner output:', stdout);
          return res.status(500).json({
            status: 'failed',
            error: 'Invalid action planner output format',
            raw: stdout
          });
        }
      });

      pythonProcess.stdin.write(jsonPayload);
      pythonProcess.stdin.end();

    } catch (err: any) {
      console.error('Server error processing action plan:', err);
      res.status(500).json({
        status: 'failed',
        error: err.message || 'Internal action plan generation failure'
      });
    }
  });

  // API Route: Veterinary Assistant status & capability
  app.get('/api/assistant/status', (_req, res) => {
    const hasAgent37 = Boolean(process.env.AGENT37_API_KEY && process.env.AGENT37_API_KEY.trim().length > 0);
    const hasGemini = Boolean(process.env.GEMINI_API_KEY && process.env.GEMINI_API_KEY.trim().length > 0);
    const hasNodus = Boolean(process.env.NODUS_API_KEY && process.env.NODUS_API_KEY.trim().length > 0);
    
    let provider = 'edge_veterinary_knowledge_engine';
    if (hasGemini) {
      provider = 'gemini-3.8-flash';
    } else if (hasAgent37) {
      provider = 'agent37_cloud';
    } else if (hasNodus) {
      provider = 'nodus_compute';
    }
    
    res.json({
      status: 'online',
      active_provider: provider,
      is_fallback: !(hasAgent37 || hasGemini || hasNodus),
      model_name: hasGemini ? 'gemini-3.8-flash' : (hasAgent37 ? 'agent37-hermes' : 'rule_based_clinical_triage'),
      supported_languages: ['en', 'hi', 'as', 'pa', 'gu', 'mr', 'bn', 'ta'],
      gemini: {
        configured: hasGemini,
        model: 'gemini-3.8-flash',
        sdk: '@google/genai'
      },
      rate_limiting: '30 queries/minute',
      safety_disclaimer_mandatory: true,
      agent37: {
        configured: hasAgent37,
        is_connected: hasAgent37,
        instance_id: process.env.AGENT37_INSTANCE_ID || null,
        instance_url: process.env.AGENT37_INSTANCE_URL || null,
        provider: 'agent37_cloud'
      },
      message: hasAgent37
        ? 'Agent37 Cloud Hermes Veterinary Agent active on server'
        : (hasGemini 
            ? 'Gemini 3.8 Flash Veterinary AI Engine active on server'
            : 'Autonomous Veterinary Knowledge Engine active (transparent fallback mode)')
    });
  });

  // API Route: Dedicated Agent37 diagnostic status
  app.get('/api/agent37/status', (_req, res) => {
    const hasKey = Boolean(process.env.AGENT37_API_KEY && process.env.AGENT37_API_KEY.trim().length > 0);
    const instanceId = process.env.AGENT37_INSTANCE_ID || null;
    const instanceUrl = process.env.AGENT37_INSTANCE_URL || null;

    res.json({
      configured: hasKey,
      is_connected: hasKey,
      status: hasKey ? 'ready' : 'unconfigured',
      instance_id: instanceId,
      instance_url: instanceUrl,
      provider: 'agent37_cloud',
      template: 'agent37-hermes',
      documentation_url: 'https://www.agent37.com/docs',
      message: hasKey
        ? 'Agent37 Cloud credentials active on backend. Instance will process screening inquiries.'
        : 'AGENT37_API_KEY is not configured in backend environment.'
    });
  });

  // Health endpoint
  app.get('/api/health', (_req, res) => {
    res.json({
      status: 'healthy',
      service: 'GauDhara Dairy Mastitis Screening Platform (IIT Guwahati Demonstration)',
      version: '2.4.0',
      timestamp: new Date().toISOString()
    });
  });

  // Vite integration
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    // Serve static files in production
    app.use(express.static(path.resolve(__dirname, 'dist')));
    app.get('*', (_req, res) => {
      res.sendFile(path.resolve(__dirname, 'dist', 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`GauDhara server listening on port ${PORT}`);
  });
}

startServer().catch((err) => {
  console.error('Failed to start GauDhara server:', err);
  process.exit(1);
});
