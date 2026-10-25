"""
Veterinary AI Assistant Chat Engine for GauDhara Dairy Health Platform
Provides authorized animal context retrieval, clinical triage,
Pydantic validation, rate limiting, and replaceable model inference
(Gemini 3.8 Flash, Nodus Compute, or transparent Veterinary Knowledge Engine fallback).
"""

import os
import time
import json
import re
from typing import Dict, Any, List, Optional

try:
    from pydantic import BaseModel, Field
except ImportError:
    class BaseModel:
        def __init__(self, **data):
            # Assign provided values or defaults from class annotations/attributes
            for key, val in data.items():
                setattr(self, key, val)
        def model_dump(self):
            res = {}
            for k, v in self.__dict__.items():
                if hasattr(v, "model_dump"):
                    res[k] = v.model_dump()
                else:
                    res[k] = v
            return res

    def Field(default=None, default_factory=None, **kwargs):
        return default_factory() if default_factory else default

# Server-side model credentials
GEMINI_API_KEY = os.getenv("GEMINI_API_KEY", "").strip()
NODUS_API_KEY = os.getenv("NODUS_API_KEY", "").strip()
AGENT37_API_KEY = os.getenv("AGENT37_API_KEY", "").strip()
MODEL_NAME = "gemini-3.8-flash"

try:
    from backend.agent37_service import (
        send_agent_message as send_agent37_message,
        is_configured as is_agent37_configured,
        get_agent37_status
    )
except ImportError:
    from agent37_service import (
        send_agent_message as send_agent37_message,
        is_configured as is_agent37_configured,
        get_agent37_status
    )

# In-memory sliding-window rate limiter (30 requests / 60 seconds per user)
RATE_LIMIT_WINDOW = 60.0
RATE_LIMIT_MAX_REQUESTS = 30
_request_history: Dict[str, List[float]] = {}


class ChatMessageItem(BaseModel):
    role: str = Field(..., description="Role of speaker: user, assistant, or system")
    content: str = Field(..., min_length=1, max_length=4000)
    timestamp: Optional[str] = None


class ChatRequest(BaseModel):
    message: str = Field(..., min_length=1, max_length=2000, description="User prompt or clinical question")
    conversation_history: List[ChatMessageItem] = Field(default_factory=list)
    language: str = Field(default="en", description="Language code: en or hi")
    animal_id: Optional[str] = Field(default=None, description="Optional attached animal ID")
    tag_id: Optional[str] = Field(default=None, description="Optional cow tag ID (e.g. GD-2024-001)")
    user_id: Optional[str] = Field(default="authorized_veterinarian", description="Authenticated user ID")
    animal_records: Optional[List[Dict[str, Any]]] = Field(default=None, description="Authorized herd records for context")
    session_id: Optional[str] = Field(default=None, description="Agent37 conversation session ID")
    provider: Optional[str] = Field(default=None, description="Requested provider: agent37, gemini, or auto")


class ClinicalAlertInfo(BaseModel):
    level: str  # 'urgent' | 'warning' | 'educational'
    title: str
    action: str


class ChatResponse(BaseModel):
    reply: str
    provider: str
    is_fallback: bool
    status: str
    timestamp: str
    language: str
    referenced_animal: Optional[Dict[str, Any]] = None
    clinical_alert: Optional[ClinicalAlertInfo] = None
    latency_ms: float
    disclaimer: str
    session_id: Optional[str] = None
    instance_id: Optional[str] = None


def check_rate_limit(user_key: str) -> bool:
    """Enforces 30 requests per minute sliding window."""
    now = time.time()
    history = _request_history.get(user_key, [])
    # Keep only timestamps within window
    history = [t for t in history if now - t < RATE_LIMIT_WINDOW]
    if len(history) >= RATE_LIMIT_MAX_REQUESTS:
        return False
    history.append(now)
    _request_history[user_key] = history
    return True


# Severe veterinary emergency keywords requiring immediate escalation
EMERGENCY_KEYWORDS = [
    r"\bfever\b", r"\bblood\b", r"\bpus\b", r"\bswollen\b", r"\bhard quarter\b",
    r"\bclots?\b", r"\bflakes?\b", r"\bdowner\b", r"\bunable to stand\b",
    r"\boff feed\b", r"\banorexia\b", r"\btoxic\b", r"\btoxemia\b", r"\bhot udder\b",
    r"बुखार", r"खून", r"मवाद", r"सूजन", r"थक्के", r"बैठ गई", r"चारा नहीं खा रही"
]

DISCLAIMER_TEXT_EN = (
    "Veterinary Advisory Notice: GauDhara is a pre-clinical mastitis screening aid, "
    "not a substitute for direct physical veterinary diagnosis. In suspected acute or systemic "
    "cases, contact your registered veterinarian promptly."
)

DISCLAIMER_TEXT_HI = (
    "पशु चिकित्सा सूचना: गौधारा एक प्रारंभिक थनैला जांच सहायक प्रणाली है, जो पशु चिकित्सक की शारीरिक जांच "
    "का विकल्प नहीं है। गंभीर लक्षणों या आपात स्थिति में तुरंत अपने पंजीकृत पशु चिकित्सक से संपर्क करें।"
)


def detect_clinical_emergency(text: str) -> Optional[ClinicalAlertInfo]:
    """Detects acute clinical mastitis markers in question text."""
    lower = text.lower()
    for pattern in EMERGENCY_KEYWORDS:
        if re.search(pattern, lower):
            is_hindi = any(w in text for w in ["बुखार", "खून", "सूजन", "थक्के", "चारा"])
            if is_hindi:
                return ClinicalAlertInfo(
                    level="urgent",
                    title="आपातकालीन नैदानिक संकेत (Emergency Clinical Sign)",
                    action="पशु में थन की गंभीर सूजन, बुखार या दूध में खून/थक्के दिखने पर तुरंत पशु चिकित्सक को बुलाएं। एंटीबायोटिक उपचार विशेषज्ञ की सलाह पर ही दें।"
                )
            return ClinicalAlertInfo(
                level="urgent",
                title="Immediate Veterinary Consultation Recommended",
                action="Physical clinical signs (acute udder swelling, fever, clots, or systemic depression) indicate severe mastitis. Isolate animal, withhold milk, and contact a licensed veterinarian immediately."
            )
    return None


def get_authorized_animal_summary(tag_or_id: str, animal_records: Optional[List[Dict[str, Any]]]) -> Optional[Dict[str, Any]]:
    """Retrieves verified animal record from authorized payload without inventing data."""
    if not animal_records or not tag_or_id:
        return None
    search = tag_or_id.strip().lower()
    for rec in animal_records:
        if (rec.get("id") and rec["id"].lower() == search) or \
           (rec.get("tag_id") and rec["tag_id"].lower() == search) or \
           (rec.get("name") and rec["name"].lower() == search):
            return {
                "tag_id": rec.get("tag_id"),
                "name": rec.get("name"),
                "breed": rec.get("breed"),
                "lactation_stage": rec.get("lactation_stage"),
                "parity": rec.get("parity"),
                "status": rec.get("status"),
                "avg_daily_yield_liters": rec.get("avg_daily_yield_liters"),
                "barn_location": rec.get("barn_location"),
                "last_screened_at": rec.get("last_screened_at")
            }
    return None


def call_gemini_api(prompt: str, history: List[ChatMessageItem], context_notes: str, language: str) -> Optional[str]:
    """
    Invokes Google Gemini API (gemini-3.8-flash) server-side if GEMINI_API_KEY is configured.
    """
    if not GEMINI_API_KEY:
        return None

    import urllib.request
    import urllib.error

    system_instruction = (
        "You are GauDhara's Veterinary AI Clinical Assistant specializing in dairy bovine mastitis prevention, "
        "electrical conductivity screening, somatic cell count (SCC) interpretation, and herd hygiene management. "
        "Adhere to these strict safety principles:\n"
        "1. Never invent or hallucinate animal measurements, historical sensor values, or veterinary confidence scores.\n"
        "2. Ground all animal responses strictly in the provided verified animal records.\n"
        "3. Emphasize that GauDhara provides early subclinical screening, NOT a definitive on-site veterinary diagnosis.\n"
        "4. Always advise calling a qualified veterinarian immediately if there are severe clinical signs (fever, hard hot quarter, clots/blood in milk, anorexia).\n"
        "5. Respond in the user's requested language (" + ("Hindi" if language == "hi" else "English") + ").\n"
        f"Verified Animal Context: {context_notes}\n"
    )

    url = f"https://generativelanguage.googleapis.com/v1beta/models/{MODEL_NAME}:generateContent?key={GEMINI_API_KEY}"

    contents = []
    # Include up to last 6 history items
    for item in history[-6:]:
        role = "user" if item.role == "user" else "model"
        contents.append({
            "role": role,
            "parts": [{"text": item.content}]
        })
    contents.append({
        "role": "user",
        "parts": [{"text": prompt}]
    })

    payload = {
        "contents": contents,
        "systemInstruction": {
            "parts": [{"text": system_instruction}]
        },
        "generationConfig": {
            "temperature": 0.2,
            "maxOutputTokens": 800
        }
    }

    req = urllib.request.Request(
        url,
        data=json.dumps(payload).encode("utf-8"),
        headers={"Content-Type": "application/json"},
        method="POST"
    )

    try:
        with urllib.request.urlopen(req, timeout=12) as resp:
            data = json.loads(resp.read().decode("utf-8"))
            candidates = data.get("candidates", [])
            if candidates:
                parts = candidates[0].get("content", {}).get("parts", [])
                if parts and "text" in parts[0]:
                    return parts[0]["text"].strip()
    except Exception as e:
        print(f"Gemini API request failed: {e}")
        return None

    return None


def execute_veterinary_knowledge_fallback(
    query: str, 
    animal_context: Optional[Dict[str, Any]], 
    language: str
) -> str:
    """
    Transparent, deterministic clinical veterinary rule engine fallback.
    Used when no external inference provider is configured.
    Provides verifiable, ICAR/NDRI-grounded dairy science guidance without hallucination.
    """
    q = query.lower()
    is_hi = language == "hi" or any(w in query for w in ["नमस्ते", "थनैला", "दूध", "उपचार", "जांच", "गाय", "भैंस", "क्या", "कैसे"])

    # 1. Animal Summary Request
    if animal_context and any(w in q for w in ["summarize", "history", "profile", "record", "how is", "status", "विवरण", "स्थिति", "रिकॉर्ड"]):
        tag = animal_context.get("tag_id")
        name = animal_context.get("name")
        status = animal_context.get("status", "healthy").replace("_", " ").title()
        breed = animal_context.get("breed", "Dairy Breed")
        stage = animal_context.get("lactation_stage", "Mid")
        parity = animal_context.get("parity", 1)
        yield_l = animal_context.get("avg_daily_yield_liters", 0)
        loc = animal_context.get("barn_location", "Main Parlor")
        last_s = animal_context.get("last_screened_at", "No prior record")

        if is_hi:
            return (
                f"📋 **पशु स्वास्थ्य सारांश: {name} ({tag})**\n\n"
                f"- **नस्ल:** {breed}\n"
                f"- **वर्तमान स्थिति:** {status}\n"
                f"- **दुग्धपान चरण (Lactation Stage):** {stage} (ब्यात: {parity})\n"
                f"- **औसत दैनिक दुग्ध उत्पादन:** {yield_l} लीटर\n"
                f"- **बाड़ा/स्थान:** {loc}\n"
                f"- **अंतिम जांच तिथि:** {last_s}\n\n"
                f"💡 **पशु चिकित्सक अनुशंसा:** यदि वर्तमान स्थिति 'Subclinical Suspect' है, तो अगले 48 घंटों तक प्रत्येक दोहन (milking) से पहले "
                f"स्ट्रिप कप और क्वार्टर कंडक्टिविटी जांच दोहराएं। थन को पोंछने के बाद 0.5% आयोडीन टीट डिप का उपयोग करें।"
            )
        return (
            f"📋 **Animal Health Record Summary: {name} (Tag: {tag})**\n\n"
            f"- **Breed:** {breed}\n"
            f"- **Current Mastitis Status:** {status}\n"
            f"- **Lactation Stage:** {stage} (Parity: {parity})\n"
            f"- **Daily Milk Yield:** {yield_l} L/day\n"
            f"- **Barn Location:** {loc}\n"
            f"- **Last Screened:** {last_s}\n\n"
            f"🔬 **Clinical Evaluation:** "
            f"If status is Subclinical Suspect, perform sequential quarter screening across next 3 milkings. "
            f"Inspect quarter conductivity differential (threshold >1.15x) and verify Somatic Cell Count proxy. "
            f"Maintain strict post-milking teat dipping (0.5% povidone-iodine)."
        )

    # 2. Sample Collection Procedures
    if any(w in q for w in ["sample", "collection", "procedure", "how to test", "conductivity test", "नमूना", "सैंपल", "विधि", "कैसे लें"]):
        if is_hi:
            return (
                "🧪 **दूध नमूना संग्रह की मानक विधि (Aseptic Milk Sampling):**\n\n"
                "1. **तैयारी:** थन को साफ, सूखे सूती कपड़े से साफ करें। अधिक गंदे होने पर गुनगुने पानी से धोकर सुखाएं।\n"
                "2. **शुरुआती धार (Foremilk Discard):** प्रत्येक थन से पहली 2-3 धारें स्ट्रिप कप में निकालें। इसमें बैक्टीरिया अधिक होते हैं, इसे जांच में न मिलाएं।\n"
                "3. **कीटाणुशोधन:** टीट के मुहाने (orifice) को 70% आइसोप्रोपिल अल्कोहल या आयोडीन स्वैब से साफ करें।\n"
                "4. **नमूना लेना:** साफ व सूखे नमूना पात्र को 45 डिग्री के कोण पर रखें ताकि ऊपर से धूल न गिरे। प्रत्येक थन से 15-20 ml दूध एकत्र करें।\n"
                "5. **सेंसर जांच:** गौधारा इन-लाइन या पोर्टेबल कंडक्टिविटी प्रोब को दूध में पूरी तरह डुबोएं और तापमान स्थिर होने (2-3 सेकंड) के बाद रीडिंग दर्ज करें।"
            )
        return (
            "🧪 **Standard Operating Procedure for Milk Screening Sampling:**\n\n"
            "1. **Teat Preparation:** Clean teat ends thoroughly with a clean, dry disposable towel. If heavily soiled, wash and dry completely.\n"
            "2. **Discard Foremilk:** Express the first 2-3 streams of milk into a black-strip cup. Foremilk has high transient microbial count and must be discarded.\n"
            "3. **Teat Orifice Sanitization:** Scrub the teat orifice with a 70% isopropyl alcohol swab for 10 seconds. Allow to air dry.\n"
            "4. **Aseptic Collection:** Hold the sterile collection vial at a 45° angle to prevent falling debris. Collect 15-20 mL of mid-stream milk per quarter.\n"
            "5. **Conductivity Measurement:** Submerge GauDhara probe electrodes fully into the sample. Allow temperature equilibration (2-3 seconds) before recording conductivity (mS/cm)."
        )

    # 3. Electrical Conductivity & Quarter Differential (>1.15 ratio)
    if any(w in q for w in ["conductivity", "quarter", "1.15", "differential", "ratio", "चालकता", "क्वार्टर", "अनुपात"]):
        if is_hi:
            return (
                "⚡ **विद्युत चालकता (Electrical Conductivity) और 1.15x अनुपात का वैज्ञानिक आधार:**\n\n"
                "- **सामान्य दूध:** स्वस्थ थन का दूध 4.0 से 5.5 mS/cm चालकता दर्शाता है।\n"
                "- **थनैला में बदलाव:** जब थन में संक्रमण या सूजन होती है, तो रक्त से सोडियम (Na⁺) और क्लोराइड (Cl⁻) आयन दूध में रिसने लगते हैं, जिससे चालकता बढ़ जाती है।\n"
                "- **1.15x क्वार्टर अनुपात नियम:** गाय के चारों थन (FL, FR, RL, RR) का दूध सामान्यतः समान चालकता रखता है। यदि किसी एक थन की चालकता दूसरे थन से **15% (1.15 गुना)** अधिक हो, तो यह सबक्लिनिकल थनैला (Subclinical Mastitis) का मजबूत प्रमाण है, भले ही दूध दिखने में सामान्य लगे!"
            )
        return (
            "⚡ **Electrical Conductivity (EC) & The 1.15x Quarter Disparity Metric:**\n\n"
            "- **Physiological Baseline:** Normal bovine milk typically has EC between 4.0 and 5.5 mS/cm at 38°C.\n"
            "- **Infection Mechanism:** Bacterial invasion damages the tight epithelial junctions of the mammary gland. Blood ions (Na⁺ and Cl⁻) leak into milk alveoli, drastically increasing ionic conduction.\n"
            "- **The 1.15x Differential Threshold:** Because baseline conductivity varies with breed, parity, and lactation stage, comparing individual quarters against each other is the gold standard. A single quarter exceeding other quarters by >1.15x (15% difference) strongly indicates unilateral subclinical mastitis before visible clots occur."
        )

    # 4. Somatic Cell Count (SCC) Interpretation
    if any(w in q for w in ["scc", "somatic", "somatic cell", "cells/ml", "सोमैटिक सेल", "सोमाटिक", "सोमैटिक", "कोशिका"]):
        if is_hi:
            return (
                "🔬 **सोमैटिक सेल काउंट (SCC) की श्रेणियां और अर्थ:**\n\n"
                "- **< 200,000 cells/mL:** पूर्णतः स्वस्थ थन। दूध की गुणवत्ता उत्तम और संक्रमण रहित।\n"
                "- **200,000 – 400,000 cells/mL:** प्रारंभिक सबक्लिनिकल संदेह। थन में प्रतिरक्षा कोशिकाएं बढ़ रही हैं। निगरानी आवश्यक।\n"
                "- **400,000 – 750,000 cells/mL:** सक्रिय सबक्लिनिकल थनैला। दूध उत्पादन में 10-15% तक गिरावट संभावित। क्वार्टर-वार जांच करें।\n"
                "- **> 750,000 cells/mL:** गंभीर/क्लिनिकल संक्रमण। तुरंत पशु चिकित्सक से परामर्श करें और दूध को पृथक करें।"
            )
        return (
            "🔬 **Somatic Cell Count (SCC) Veterinary Thresholds:**\n\n"
            "- **< 200,000 cells/mL (Healthy):** Normal physiological baseline. Excellent udder immunity and milk quality.\n"
            "- **200,000 – 400,000 cells/mL (Suspect Subclinical):** Mild leukocytic recruitment. Indicates early intramammary immune response. Increase screening frequency.\n"
            "- **400,000 – 750,000 cells/mL (Subclinical Mastitis):** Significant alveolar damage, yielding 10-15% production loss. Conduct CMT & quarter conductivity screen.\n"
            "- **> 750,000 cells/mL (Clinical Alert):** Severe infection. Immediate veterinary assessment and milk withholding indicated."
        )

    # 5. When to Call a Veterinarian / Emergency Guidance
    if any(w in q for w in ["veterinarian", "doctor", "contact", "emergency", "when to call", "डॉक्टर", "पशु चिकित्सक", "कब बुलाएं"]):
        if is_hi:
            return (
                "🚨 **पशु चिकित्सक को कब तुरंत बुलाना आवश्यक है (Emergency Triggers):**\n\n"
                "निम्नलिखित में से कोई भी लक्षण दिखने पर बिना देरी किए डॉक्टर को बुलाएं:\n"
                "1. **गंभीर शारीरिक लक्षण:** थन अत्यधिक गर्म, लाल, कड़ा या पत्थर जैसा कठोर हो।\n"
                "2. **दूध में स्पष्ट खराबी:** दूध में पीलापन, खून, मवाद, या पनीर जैसे मोटे थक्के निकलना।\n"
                "3. **प्रणालीगत बीमारी:** गाय को तेज बुखार (>39.5°C / 103°F), कंपकंपी, खाना-पीना बंद करना।\n"
                "4. **उठने में असमर्थता (Downer Cow):** गाय खड़ी न हो पा रही हो, जो टॉक्सिक मैस्टाइटिस का संकेत है।\n\n"
                "⚠️ *चेतावनी: अपने आप बिना पर्चे के एंटीबायोटिक इंजेक्शन न लगाएं। इससे एंटीबायोटिक प्रतिरोध और दूध संदूषण का खतरा रहता है।*"
            )
        return (
            "🚨 **Clinical Decision Tree: When to Summon a Veterinarian Immediately:**\n\n"
            "Contact your licensed veterinary practitioner immediately if any of these signs occur:\n"
            "1. **Acute Local Inflammation:** The quarter is visibly swollen, hot to the touch, severely reddened, or palpably indurated (rock-hard).\n"
            "2. **Abnormal Secretions:** Milk is serum-like (watery/straw-coloured), contains purulent exudate, clots, flakes, or blood.\n"
            "3. **Systemic Symptoms:** Rectal temperature >39.5°C (103.1°F), rapid shallow respiration, sunken eyes, cold extremities, or complete cessation of rumination.\n"
            "4. **Recumbency:** The cow is unable to rise (downer cow syndrome), indicating acute coliform endotoxemia.\n\n"
            "⚠️ *Always withhold milk from treated animals in accordance with veterinary withholding periods (MRL regulations).*"
        )

    # General Greeting / Mastitis Overview
    if is_hi:
        return (
            "नमस्ते! मैं गौधारा का पशु चिकित्सा सहायक (Veterinary AI Assistant) हूँ।\n\n"
            "मैं आपकी निम्नलिखित विषयों में सहायता कर सकता हूँ:\n"
            "- थनैला (मैस्टाइटिस) के प्रारंभिक लक्षण और बचाव के उपाय\n"
            "- दूध जांच के लिए नमूना लेने की सही विधि\n"
            "- विद्युत चालकता (Conductivity) और क्वार्टर अनुपात का विश्लेषण\n"
            "- पंजीकृत गाय/भैंस के स्वास्थ्य रिकॉर्ड का सारांश\n"
            "- पशु चिकित्सक से तत्काल संपर्क करने के नैदानिक संकेत\n\n"
            "कृपया अपना प्रश्न पूछें या ऊपर दिए गए किसी पशु का टैग नंबर लिखें।"
        )

    return (
        "Welcome to the GauDhara Veterinary Clinical Assistant.\n\n"
        "I provide decision-support on bovine mastitis screening, sensor diagnostics, and herd management:\n"
        "• **Diagnostic Metrics:** Electrical conductivity (mS/cm), SCC proxies, and 1.15x quarter disparity.\n"
        "• **Sample Collection SOPs:** Aseptic technique, foremilk stripping, and probe calibration.\n"
        "• **Herd Record Inquiries:** Summarize health histories for registered animals (e.g. tag GD-2024-001).\n"
        "• **Triage Guidance:** Differentiating subclinical screening from acute clinical veterinary emergencies.\n\n"
        "Select a suggested question or enter your query below."
    )


def process_chat_message(request_data: Dict[str, Any]) -> Dict[str, Any]:
    """
    Main orchestration endpoint for Veterinary AI Assistant.
    Validates input, checks rate limit, enforces safety disclaimers,
    and returns grounded response with transparent provider attribution.
    """
    start_time = time.perf_counter()
    timestamp = time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime())

    # 1. Input validation
    raw_msg = request_data.get("message") if isinstance(request_data, dict) else ""
    if not raw_msg or not str(raw_msg).strip():
        return {
            "status": "error",
            "reply": "Message cannot be empty.",
            "provider": "validation_gate",
            "is_fallback": True,
            "timestamp": timestamp,
            "language": "en",
            "latency_ms": 0.0,
            "disclaimer": DISCLAIMER_TEXT_EN
        }

    try:
        req = ChatRequest(**request_data)
    except Exception as e:
        return {
            "status": "error",
            "reply": f"Invalid request payload: {str(e)}",
            "provider": "validation_gate",
            "is_fallback": True,
            "timestamp": timestamp,
            "language": "en",
            "latency_ms": 0.0,
            "disclaimer": DISCLAIMER_TEXT_EN
        }

    # 2. Rate limit check
    user_id = req.user_id or "authorized_veterinarian"
    if not check_rate_limit(user_id):
        return {
            "status": "rate_limited",
            "reply": "Request rate limit reached (30 queries per minute). Please pause briefly before sending another clinical query.",
            "provider": "rate_limiter",
            "is_fallback": True,
            "timestamp": timestamp,
            "language": req.language,
            "latency_ms": round((time.perf_counter() - start_time) * 1000, 2),
            "disclaimer": DISCLAIMER_TEXT_EN
        }

    # 3. Emergency clinical detection
    emergency_alert = detect_clinical_emergency(req.message)

    # 4. Authorized animal context resolution
    attached_tag = req.tag_id or req.animal_id
    animal_summary = None
    if attached_tag:
        animal_summary = get_authorized_animal_summary(attached_tag, req.animal_records)

    context_str = ""
    if animal_summary:
        context_str = (
            f"Animal Tag: {animal_summary.get('tag_id')}, Name: {animal_summary.get('name')}, "
            f"Status: {animal_summary.get('status')}, Breed: {animal_summary.get('breed')}, "
            f"Lactation Stage: {animal_summary.get('lactation_stage')}, "
            f"Avg Daily Yield: {animal_summary.get('avg_daily_yield_liters')}L, "
            f"Last Screened: {animal_summary.get('last_screened_at')}"
        )

    # 5. Model Inference Routing: Replaceable Architecture (Agent37 Cloud, Gemini, or Autonomous Rule Fallback)
    reply_text = None
    active_provider = "edge_veterinary_knowledge_engine"
    is_fallback = True
    session_id = req.session_id
    instance_id = None

    # Priority 1: User requested agent37 OR agent37 is configured (and gemini not explicitly requested)
    should_use_agent37 = (req.provider == "agent37") or (is_agent37_configured() and req.provider != "gemini")

    if should_use_agent37:
        if is_agent37_configured():
            a37_res = send_agent37_message(
                message=req.message,
                session_id=req.session_id,
                authorized_context=context_str,
                language=req.language
            )
            if a37_res.get("status") == "success":
                reply_text = a37_res.get("reply")
                active_provider = "agent37_cloud"
                is_fallback = False
                session_id = a37_res.get("session_id")
                instance_id = a37_res.get("instance_id")
            elif req.provider == "agent37":
                # Explicitly requested Agent37; return transparent error/disconnected status
                latency = round((time.perf_counter() - start_time) * 1000, 2)
                return {
                    "status": a37_res.get("status", "error"),
                    "reply": a37_res.get("reply", "Agent37 service unavailable"),
                    "provider": "agent37_cloud",
                    "is_fallback": True,
                    "timestamp": timestamp,
                    "language": req.language,
                    "referenced_animal": animal_summary,
                    "clinical_alert": emergency_alert,
                    "latency_ms": latency,
                    "disclaimer": DISCLAIMER_TEXT_HI if req.language == "hi" else DISCLAIMER_TEXT_EN,
                    "session_id": a37_res.get("session_id"),
                    "instance_id": a37_res.get("instance_id")
                }
        elif req.provider == "agent37":
            # Explicitly requested Agent37 but not configured
            latency = round((time.perf_counter() - start_time) * 1000, 2)
            return {
                "status": "disconnected",
                "reply": "Agent37 Cloud API is not configured. Please set AGENT37_API_KEY in the backend environment to enable Agent37 inference.",
                "provider": "agent37_cloud",
                "is_fallback": True,
                "timestamp": timestamp,
                "language": req.language,
                "referenced_animal": animal_summary,
                "clinical_alert": emergency_alert,
                "latency_ms": latency,
                "disclaimer": DISCLAIMER_TEXT_HI if req.language == "hi" else DISCLAIMER_TEXT_EN,
                "session_id": req.session_id,
                "instance_id": None
            }

    # Priority 2: Gemini 3.8 Flash if key available and no reply yet
    if not reply_text and GEMINI_API_KEY and req.provider != "agent37":
        gemini_reply = call_gemini_api(req.message, req.conversation_history, context_str, req.language)
        if gemini_reply:
            reply_text = gemini_reply
            active_provider = MODEL_NAME
            is_fallback = False

    # Priority 3: Transparent rule engine fallback
    if not reply_text:
        reply_text = execute_veterinary_knowledge_fallback(
            req.message,
            animal_summary,
            req.language
        )
        active_provider = "edge_veterinary_knowledge_engine"
        is_fallback = True

    latency = round((time.perf_counter() - start_time) * 1000, 2)
    disclaimer = DISCLAIMER_TEXT_HI if req.language == "hi" else DISCLAIMER_TEXT_EN

    response_obj = ChatResponse(
        reply=reply_text,
        provider=active_provider,
        is_fallback=is_fallback,
        status="success",
        timestamp=timestamp,
        language=req.language,
        referenced_animal=animal_summary,
        clinical_alert=emergency_alert,
        latency_ms=latency,
        disclaimer=disclaimer,
        session_id=session_id,
        instance_id=instance_id
    )

    return response_obj.model_dump()
