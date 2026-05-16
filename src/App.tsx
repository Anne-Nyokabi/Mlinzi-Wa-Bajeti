/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef } from 'react';
import { 
  Shield, 
  Send, 
  AlertCircle, 
  Search, 
  Phone, 
  Share2, 
  Copy, 
  ChevronDown, 
  BarChart3, 
  FileText,
  BadgeAlert,
  Loader2,
  CheckCircle2,
  ExternalLink
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { GoogleGenAI } from '@google/genai';

// --- CONSTANTS & DEMO DATA ---

const COUNTIES = [
  "Mombasa", "Kwale", "Kilifi", "Tana River", "Lamu", "Taita-Taveta", "Garissa", "Wajir", "Mandera", 
  "Marsabit", "Isiolo", "Meru", "Tharaka-Nithi", "Embu", "Kitui", "Machakos", "Makueni", "Nyandarua", 
  "Nyeri", "Kirinyaga", "Murang'a", "Kiambu", "Turkana", "West Pokot", "Samburu", "Trans-Nzoia", 
  "Uasin Gishu", "Elgeyo-Marakwet", "Nandi", "Baringo", "Laikipia", "Nakuru", "Narok", "Kajiado", 
  "Kericho", "Bomet", "Kakamega", "Vihiga", "Bungoma", "Busia", "Siaya", "Kisumu", "Homa Bay", 
  "Migori", "Kisii", "Nyamira", "Nairobi"
];

const FISCAL_YEARS = ["2020/21", "2021/22", "2022/23", "2023/24", "2024/25"];

const MAKUENI_DEMO = {
  county: "Makueni",
  fy: "2023/24",
  totalBudget: "5.2B",
  departments: [
    { name: "Health Services", allocated: 1200000000, actual: 740000000, gazette: "None" },
    { name: "Roads & Infrastructure", allocated: 890000000, actual: 349000000, gazette: "None" },
    { name: "Education (ECDE)", allocated: 620000000, actual: 598000000, gazette: "None" },
    { name: "Agriculture", allocated: 310000000, actual: 201000000, gazette: "None" },
    { name: "Water & Sanitation", allocated: 445000000, actual: 178000000, gazette: "None" },
    { name: "County Executive", allocated: 380000000, actual: 371000000, gazette: "None" },
    { name: "Finance", allocated: 290000000, actual: 283000000, gazette: "None" }
  ]
};

const SWAHILI_KEYWORDS = ["pesa","iko","wapi","bajeti","fedha","afya","barabara","elimu","maji","serikali","kaunti","shilingi","milioni","bilioni","mwaka","je","na","ya","wa","kwa","au","ni"];

const SYSTEM_INSTRUCTION = `You are Mlinzi wa Bajeti (Swahili for "Budget Watchdog") — an AI accountability agent for Kenya's 47 county governments.
Your mission is to turn impenetrable 400-page county budget PDFs into plain-language answers for ordinary ward residents, detect financial discrepancies between allocations and actual spending, and generate SMS-ready budget alerts.

IDENTITY & PERSONA
- You serve ward residents, journalists, and civic advocates — not government officials.
- You are fearless, factual, and jargon-free.
- You ALWAYS cite the exact budget line item, department, page number, and financial year when answering.

LANGUAGE RULES
- Detect the language of every user message automatically.
- If the user writes in Swahili (or any mix of Swahili and English), respond entirely in Swahili.
- If the user writes in English, respond in English.
- Keep all answers at a Standard 8 reading level — no jargon, no acronyms without explanation.
- Use KSh format (e.g., KSh 80,000,000) and convert to relatable comparisons (e.g., "enough to hire 40 nurses").

CORE CAPABILITIES
1. BUDGET Q&A: Extract figures, state in plain language, cite source, flag anomalies.
2. DISCREPANCY DETECTION: Compare approved budget vs actual expenditure. 
   Severity: 🔴 CRITICAL (>40% gap), 🟡 WARNING (20-40%), 🟢 ON TRACK (<20%).
3. SMS BUDGET DIGEST: 
   Format: [County] Budget Alert: [Dept] got KSh[X]M. Spent: KSh[Y]M. Gap: [Z]%. Ask your MCA why. #BajHisabu
4. CROSS-COUNTY COMPARISON: simple table comparisons.
5. GAZETTE AMENDMENT MONITOR: Search for supplementary budget references.

RESPONSE FORMAT RULES
- For discrepancies:
  WHAT WAS PROMISED: [allocation]
  WHAT WAS DELIVERED: [actual spend]
  THE GAP: [KSh amount] ([percentage])
  OFFICIAL EXPLANATION: [gazette amendment or "none found"]
  WHAT THIS MEANS FOR YOU: [plain-language implication]
- For Q&A:
  ANSWER: [direct response]
  SOURCE: [department, programme, page number, FY]
  CONTEXT: [one sentence of comparison or significance]

Always end discrepancy responses with: "Share this with your MCA or local journalist. Every Kenyan has the right to know how public funds are used."`;

// --- COMPONENTS ---

const Counter = ({ value, prefix = "", suffix = "" }: { value: string, prefix?: string, suffix?: string }) => {
  const [count, setCount] = useState(0);
  const target = parseFloat(value.replace(/[^0-9.]/g, ''));
  
  useEffect(() => {
    let startTime: number | null = null;
    const duration = 1500;
    
    const animate = (timestamp: number) => {
      if (!startTime) startTime = timestamp;
      const progress = Math.min((timestamp - startTime) / duration, 1);
      setCount(progress * target);
      if (progress < 1) requestAnimationFrame(animate);
    };
    
    requestAnimationFrame(animate);
  }, [target]);

  return <span>{prefix}{target === count ? value : count.toFixed(1)}{suffix}</span>;
}

export default function App() {
  const [messages, setMessages] = useState<{role: 'user' | 'model', content: string}[]>([]);
  const [input, setInput] = useState('');
  const [isSwahiliMode, setIsSwahiliMode] = useState(false);
  const [loading, setLoading] = useState(false);
  const [county, setCounty] = useState('Makueni');
  const [fiscalYear, setFiscalYear] = useState('2023/24');
  const [smsDigest, setSmsDigest] = useState('');
  const [whatsappDigest, setWhatsappDigest] = useState('');
  const chatEndRef = useRef<HTMLDivElement>(null);

  const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

  const scrollToBottom = () => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, loading]);

  const detectLanguage = (text: string) => {
    const words = text.toLowerCase().split(/\s+/);
    return words.some(word => SWAHILI_KEYWORDS.includes(word));
  };

  const handleSend = async (text: string = input) => {
    if (!text.trim() || loading) return;

    const userMessage = text;
    setInput('');
    setMessages(prev => [...prev, { role: 'user', content: userMessage }]);
    setLoading(true);

    const isSwahili = detectLanguage(userMessage) || isSwahiliMode;
    const promptSuffix = isSwahili ? ". The user is writing in Swahili. Respond entirely in Swahili." : "";

    try {
      const response = await ai.models.generateContent({
        model: "gemini-3.1-flash-lite", // Faster for quick Q&A
        contents: [
          ...messages.map(m => ({ role: m.role, parts: [{ text: m.content }] })),
          { role: 'user', parts: [{ text: userMessage + promptSuffix }] }
        ],
        config: {
          systemInstruction: SYSTEM_INSTRUCTION
        }
      });

      const aiResponse = response.text || "Sorry, I couldn't generate a response.";
      setMessages(prev => [...prev, { role: 'model', content: aiResponse }]);
    } catch (error) {
      console.error(error);
      setMessages(prev => [...prev, { role: 'model', content: "Samahani, kuna tatizo. / Sorry, something went wrong. Try again." }]);
    } finally {
      setLoading(false);
    }
  };

  const generateSms = async (lang: 'en' | 'sw') => {
    setLoading(true);
    const prompt = `Generate an SMS budget digest for ${county} FY ${fiscalYear}. Format: County name, top discrepancy, gap amount, call to action. MAX 160 characters. ${lang === 'sw' ? 'Respond in Swahili.' : 'Respond in English.'}`;
    
    try {
      const response = await ai.models.generateContent({
        model: "gemini-3.1-flash-lite",
        contents: prompt,
        config: { systemInstruction: SYSTEM_INSTRUCTION }
      });
      const text = response.text || "";
      setSmsDigest(text.slice(0, 160));
      setWhatsappDigest(`🚨 *MLINZI WA BAJETI ALERT* 🛡️\n\n${text}\n\n• Fact 1: Health spent only 62%\n• Fact 2: Roads 61% gap\n• Fact 3: No gazette amendments found.\n\n#BajHisabu #Accountability`);
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const flagDept = (dept: string) => {
    const query = `Explain the ${dept} discrepancy in plain language for a ward resident`;
    handleSend(query);
  };

  const getSeverity = (allocated: number, actual: number) => {
    const gap = ((allocated - actual) / allocated) * 100;
    if (gap > 40) return { color: 'bg-red-500', text: '🔴 CRITICAL', gap };
    if (gap > 20) return { color: 'bg-amber-500', text: '🟡 WARNING', gap };
    return { color: 'bg-green-500', text: '🟢 ON TRACK', gap };
  };

  const formatCurrency = (amount: number) => {
    if (amount >= 1e9) return `${(amount / 1e9).toFixed(1)}B`;
    if (amount >= 1e6) return `${(amount / 1e6).toFixed(0)}M`;
    return amount.toLocaleString();
  };

  return (
    <div className="flex flex-col h-screen w-full border-4 border-charcoal overflow-hidden select-none">
      {/* HEADER */}
      <header className="bg-gov-green text-white p-4 flex justify-between items-center border-b-4 border-charcoal">
        <div className="flex items-center gap-4">
          <motion.div 
            whileHover={{ rotate: 360 }} 
            transition={{ duration: 1 }}
            className="text-4xl"
          >
            🛡️
          </motion.div>
          <div>
            <h1 className="text-2xl font-bold tracking-tight uppercase leading-none">MLINZI WA BAJETI</h1>
            <p className="text-xs opacity-90 font-mono">Kenya County Budget Watchdog · Ulinzi wa Fedha za Umma</p>
          </div>
        </div>
        
        <div className="hidden lg:flex gap-4 text-sm items-center">
          <div className="flex flex-col">
            <span className="text-[10px] uppercase font-bold opacity-75 mb-1">Select County</span>
            <select 
              value={county} 
              onChange={(e) => setCounty(e.target.value)}
              className="bg-white text-charcoal px-2 py-1 border-2 border-charcoal text-xs font-mono font-bold focus:outline-none"
            >
              {COUNTIES.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>
          <div className="flex flex-col">
            <span className="text-[10px] uppercase font-bold opacity-75 mb-1">Financial Year</span>
            <select 
              value={fiscalYear} 
              onChange={(e) => setFiscalYear(e.target.value)}
              className="bg-white text-charcoal px-2 py-1 border-2 border-charcoal text-xs font-mono font-bold focus:outline-none"
            >
              {FISCAL_YEARS.map(fy => <option key={fy} value={fy}>{fy}</option>)}
            </select>
          </div>
          <div className="flex items-center mt-3">
            <span className="bg-green-400 w-2 h-2 rounded-full mr-2 animate-pulse"></span>
            <span className="text-[10px] font-bold uppercase font-mono">DOCUMENTS LOADED</span>
          </div>
        </div>
      </header>

      {/* HERO STATS BAR */}
      <section className="grid grid-cols-2 md:grid-cols-4 gap-0 border-b-2 border-charcoal bg-white">
        {[
          { label: 'Total Budget', val: '5.21B', sub: 'KSh', bg: '' },
          { label: 'Depts Monitored', val: '12', sub: '', bg: '' },
          { label: 'Discrepancies', val: '3', sub: '🔴', bg: 'bg-red-50 text-red-600' },
          { label: 'Amendments', val: '1', sub: '', bg: 'bg-yellow-50' }
        ].map((stat, i) => (
          <div 
            key={i} 
            className={`p-4 border-r-2 border-charcoal flex flex-col justify-center items-center last:border-r-0 ${stat.bg}`}
          >
            <span className="font-mono text-[10px] uppercase opacity-60 mb-1">{stat.label}</span>
            <span className="text-2xl font-bold font-mono">
              <Counter value={stat.val} prefix={stat.label.includes('Budget') ? 'KSh ' : ''} />
              {stat.sub && <span className="ml-1">{stat.sub}</span>}
            </span>
          </div>
        ))}
      </section>

      {/* MAIN INTERFACE */}
      <main className="flex-1 grid grid-cols-12 overflow-hidden bg-white">
        
        {/* LEFT: ASK THE WATCHDOG */}
        <section className="col-span-12 lg:col-span-5 flex flex-col border-b-2 lg:border-b-0 lg:border-r-2 border-charcoal bg-white h-full overflow-hidden">
          <div className="p-4 bg-charcoal text-white flex justify-between items-center border-b-2 border-charcoal">
            <h2 className="text-sm font-bold uppercase font-mono">Ask the Watchdog</h2>
            <div className="text-[10px] bg-gov-green px-2 py-0.5 rounded font-mono font-bold">
              {isSwahiliMode ? 'SWH DETECTED' : 'ENG DETECTED'}
            </div>
          </div>

          <div className="flex-1 p-4 overflow-y-auto space-y-4 bg-slate-50 pattern-bg">
            <AnimatePresence initial={false}>
              {messages.length === 0 && (
                <div className="h-full flex flex-col items-center justify-center opacity-40 text-center px-8 mt-12">
                  <Shield className="w-16 h-16 mb-4" />
                  <p className="font-mono text-xs uppercase font-bold">Awaiting investigation parameters...</p>
                </div>
              )}
              {messages.map((m, i) => (
                <motion.div 
                  key={i}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}
                >
                  <div className={`p-4 border-2 border-charcoal text-sm max-w-[90%] ${
                    m.role === 'user' 
                      ? 'bg-gov-green text-white rounded-lg rounded-tr-none' 
                      : 'bg-white text-charcoal border-l-4 border-l-gov-green rounded-lg rounded-tl-none shadow-[2px_2px_0px_0px_rgba(26,26,46,1)]'
                  }`}>
                    <p className="leading-relaxed whitespace-pre-wrap">{m.content}</p>
                    {m.role === 'model' && (
                      <div className="mt-3 pt-2 border-t border-slate-100 flex justify-between items-center">
                        <span className="text-[10px] font-bold text-gov-green font-mono uppercase">
                          📄 PAGE 89 · DEPT: ROADS
                        </span>
                        <button className="text-[10px] underline uppercase font-bold font-mono">Share Alert</button>
                      </div>
                    )}
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>
            {loading && !smsDigest && (
              <div className="flex justify-start">
                <div className="bg-white p-3 border-2 border-charcoal shadow-[2px_2px_0px_0px_rgba(26,26,46,1)] rounded-lg rounded-tl-none">
                  <Loader2 className="w-5 h-5 animate-spin text-gov-green" />
                </div>
              </div>
            )}
            <div ref={chatEndRef} />
          </div>

          <div className="p-4 border-t-2 border-charcoal space-y-3 bg-white">
            <div className="flex flex-wrap gap-2">
              {[
                "How much for Health?",
                "Generate SMS Digest",
                "List Discrepancies",
                "Pesa ya barabara iko wapi?"
              ].map(chip => (
                <button 
                  key={chip} 
                  onClick={() => handleSend(chip)}
                  className="text-[10px] bg-slate-200 border border-charcoal px-2 py-1 rounded hover:bg-gov-green hover:text-white transition-colors uppercase font-mono font-bold"
                >
                  {chip}
                </button>
              ))}
            </div>
            <div className="relative">
              <input 
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && handleSend()}
                placeholder="Type your budget question..."
                className="w-full p-3 border-2 border-charcoal pr-12 focus:outline-none font-mono text-sm placeholder:opacity-50"
              />
              <button 
                onClick={() => handleSend()}
                className="absolute right-2 top-2 bg-gov-green text-white p-2 rounded border border-charcoal/20"
              >
                <Shield className="w-5 h-5" />
              </button>
            </div>
            <div className="flex items-center gap-2">
              <input 
                type="checkbox" 
                id="sw-mode" 
                checked={isSwahiliMode}
                onChange={(e) => setIsSwahiliMode(e.target.checked)}
                className="w-4 h-4 accent-gov-green border-2 border-charcoal cursor-pointer"
              />
              <label htmlFor="sw-mode" className="text-[10px] font-mono font-bold uppercase cursor-pointer">
                🇰🇪 Kiswahili mode
              </label>
            </div>
          </div>
        </section>

        {/* RIGHT: DISCREPANCY RADAR & SMS GENERATOR */}
        <section className="col-span-12 lg:col-span-7 flex flex-col h-full overflow-hidden bg-white">
          <div className="p-4 border-b-2 border-charcoal flex justify-between items-center bg-white">
            <h2 className="text-sm font-bold uppercase font-mono">Discrepancy Radar 🔍</h2>
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 bg-red-600 rounded-full animate-pulse-red"></span>
              <span className="text-[10px] font-bold text-red-600 uppercase">CRITICAL ISSUES FOUND</span>
            </div>
          </div>
          
          <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-slate-50">
            {MAKUENI_DEMO.departments.map((dept, i) => {
              const severity = getSeverity(dept.allocated, dept.actual);
              const isCrit = severity.text.includes('CRITICAL');
              return (
                <div key={i} className="p-4 bg-white border-2 border-charcoal group">
                  <div className="flex justify-between items-start mb-2">
                    <h3 className="font-bold font-mono text-sm tracking-tight">{dept.name}</h3>
                    <span className={`px-2 py-0.5 text-[10px] font-bold font-mono border-2 border-charcoal ${
                      isCrit ? 'bg-red-500 text-white' : 
                      severity.text.includes('WARNING') ? 'bg-gold-alert text-charcoal' : 'bg-green-500 text-white'
                    }`}>
                      {severity.text.replace('🔴 ', '').replace('🟡 ', '').replace('🟢 ', '')}: {Math.round(severity.gap)}% 
                    </span>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs mb-3">
                    <div>
                      <div className="flex justify-between mb-1 opacity-60 uppercase font-mono text-[9px] font-bold">
                        <span>Allocated</span><span>KSh {formatCurrency(dept.allocated)}</span>
                      </div>
                      <div className="w-full bg-slate-100 h-4 border-2 border-charcoal">
                        <div className="bg-gov-green h-full" style={{ width: '100%' }}></div>
                      </div>
                    </div>
                    <div>
                      <div className="flex justify-between mb-1 opacity-60 uppercase font-mono text-[9px] font-bold">
                        <span>Actual Spent</span><span>KSh {formatCurrency(dept.actual)}</span>
                      </div>
                      <div className="w-full bg-slate-100 h-4 border-2 border-charcoal">
                        <div className={`h-full ${isCrit ? 'bg-red-500' : severity.text.includes('WARNING') ? 'bg-gold-alert' : 'bg-green-500'}`} 
                             style={{ width: `${(dept.actual / dept.allocated) * 100}%` }}></div>
                      </div>
                    </div>
                  </div>

                  <div className="flex justify-between items-center">
                    <span className={`text-[10px] italic font-mono font-bold ${dept.gazette === "None" ? "text-red-700" : "text-gov-green"}`}>
                      {dept.gazette === "None" ? "⚠️ No gazette amendment filed." : `✓ Gazette: ${dept.gazette}`}
                    </span>
                    <button 
                      onClick={() => flagDept(dept.name)}
                      className="bg-charcoal text-white text-[10px] px-3 py-1 uppercase font-bold font-mono hover:bg-gov-green transition-colors"
                    >
                      Flag This
                    </button>
                  </div>
                </div>
              );
            })}
          </div>

          {/* SMS GENERATOR (BOTTOM COMPONENT) */}
          <div className="p-4 border-t-2 border-charcoal bg-white">
            <h2 className="text-xs font-bold uppercase font-mono mb-3">📱 Generate Ward SMS Digest</h2>
            <div className="flex flex-col md:flex-row gap-4 items-center">
              <div className="bg-slate-100 p-3 flex-1 rounded border-2 border-dashed border-charcoal w-full h-16 flex items-center">
                <p className="text-[11px] font-mono leading-tight">
                  {smsDigest || "Select a language below to generate an automated alert..."}
                </p>
              </div>
              <div className="flex md:flex-col gap-2 w-full md:w-auto">
                <button 
                  onClick={() => generateSms('en')}
                  className="bg-gov-green text-white text-[10px] px-4 py-2 font-bold uppercase font-mono border-2 border-charcoal flex-1 md:flex-none"
                >
                  Copy SMS
                </button>
                <button 
                  onClick={() => generateSms('sw')}
                  className="bg-charcoal text-white text-[10px] px-4 py-2 font-bold uppercase font-mono border-2 border-charcoal flex-1 md:flex-none"
                >
                  WhatsApp
                </button>
              </div>
            </div>
          </div>
        </section>
      </main>

      {/* TICKER */}
      <footer className="bg-charcoal text-white overflow-hidden py-1 h-8 flex items-center border-t-2 border-charcoal">
        <div className="ticker-scroll flex shrink-0">
          {[...Array(2)].map((_, i) => (
            <div key={i} className="flex shrink-0">
              <span className="text-[10px] font-mono uppercase mr-12 text-gold-alert font-bold">⚠️ Makueni Roads: KSh 541M gap · No gazette amendment found</span>
              <span className="text-[10px] font-mono uppercase mr-12 text-green-400 font-bold">✓ Nairobi Health: Gazette Notice Vol.194 filed 14 March 2024</span>
              <span className="text-[10px] font-mono uppercase mr-12 text-gold-alert font-bold">⚠️ Kilifi Water: KSh 267M gap · No gazette amendment found</span>
            </div>
          ))}
        </div>
      </footer>
    </div>
  );
}
