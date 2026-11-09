import React, { useState, useRef, useEffect } from 'react';
import { Send, Microscope, Sparkles, User, RefreshCw, AlertCircle, Leaf } from 'lucide-react';
import { BotanicalDiagnosis } from '../types/botanical';

interface Message {
  id: string;
  sender: 'user' | 'botanist';
  text: string;
  timestamp: string;
}

interface ConsultationViewProps {
  currentSpecimenContext?: BotanicalDiagnosis | null;
}

export const ConsultationView: React.FC<ConsultationViewProps> = ({ currentSpecimenContext }) => {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: 'welcome',
      sender: 'botanist',
      text: currentSpecimenContext
        ? `Hello, I'm Dr. Silva, Senior Botanical Pathologist. I have reviewed your scan for ${currentSpecimenContext.commonName} (${currentSpecimenContext.latinTaxonomy}) diagnosed with ${currentSpecimenContext.condition}. What questions do you have regarding the tissue debridement or moisture modulation?`
        : `Greetings! I am Dr. Silva, lead botanical pathologist at Botanical Precision. Ask me any clinical questions regarding foliar pathology, nutrient imbalances, substrate drainage, or organic pest management.`,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    },
  ]);

  const [inputMessage, setInputMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, loading]);

  const quickPrompts = [
    'How do I safely debride fungal lesions without spreading spores?',
    'What is the difference between root rot and underwatering?',
    'How to dilute cold-pressed neem oil without leaf scorch?',
    'What are the optimal lux requirements for variegated Aroids?'
  ];

  const handleSend = async (messageText?: string) => {
    const textToSend = messageText || inputMessage;
    if (!textToSend.trim() || loading) return;

    const userMsg: Message = {
      id: `user-${Date.now()}`,
      sender: 'user',
      text: textToSend,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };

    setMessages((prev) => [...prev, userMsg]);
    setInputMessage('');
    setLoading(true);

    try {
      const response = await fetch('/api/botanical-chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: textToSend,
          specimenContext: currentSpecimenContext || undefined,
        }),
      });

      const data = await response.json();
      const botanistMsg: Message = {
        id: `botanist-${Date.now()}`,
        sender: 'botanist',
        text: data.reply || 'Botanical analysis complete. Monitor foliage weekly for changes.',
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      };

      setMessages((prev) => [...prev, botanistMsg]);
    } catch (err) {
      const errorMsg: Message = {
        id: `botanist-${Date.now()}`,
        sender: 'botanist',
        text: 'Ensure leaves remain dry during watering and provide bright indirect sunlight between 2,500 and 4,000 Lux. Withhold nitrogen fertilizers if fungal activity is present.',
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      };
      setMessages((prev) => [...prev, errorMsg]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="w-full max-w-4xl mx-auto space-y-4 pb-12">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <span className="text-xs font-telemetry tracking-wide uppercase text-[#404946] font-medium block">
            Clinical Botanical Pathology Consultation
          </span>
          <h1 className="font-display text-2xl sm:text-3xl font-bold text-[#00362d]">
            Dr. Silva, Plant Pathologist
          </h1>
        </div>

        {currentSpecimenContext && (
          <div className="inline-flex items-center gap-2 bg-[#134e43]/10 border border-[#134e43]/20 px-3 py-1.5 rounded-lg text-xs font-telemetry text-[#134e43]">
            <Leaf className="w-3.5 h-3.5 text-[#10b981]" />
            <span>Active Specimen: <strong>{currentSpecimenContext.commonName}</strong></span>
          </div>
        )}
      </div>

      {/* Chat Container */}
      <div className="bg-white border border-[#134e43]/10 rounded-2xl shadow-sm overflow-hidden flex flex-col h-[560px]">
        {/* Messages Stream */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4">
          {messages.map((msg) => (
            <div
              key={msg.id}
              className={`flex items-start gap-3 ${
                msg.sender === 'user' ? 'flex-row-reverse' : 'flex-row'
              }`}
            >
              {/* Avatar */}
              <div
                className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${
                  msg.sender === 'user'
                    ? 'bg-[#134e43] text-white'
                    : 'bg-[#10b981]/20 text-[#00362d] border border-[#10b981]/40'
                }`}
              >
                {msg.sender === 'user' ? (
                  <User className="w-4 h-4" />
                ) : (
                  <Microscope className="w-4 h-4 text-[#134e43]" />
                )}
              </div>

              {/* Message Bubble */}
              <div
                className={`max-w-[85%] sm:max-w-[75%] rounded-2xl px-4 py-3 space-y-1 ${
                  msg.sender === 'user'
                    ? 'bg-[#134e43] text-white rounded-tr-none'
                    : 'bg-[#f4f6f0] text-[#191c19] border border-[#134e43]/10 rounded-tl-none'
                }`}
              >
                <div className="flex items-center justify-between gap-3">
                  <span className="font-telemetry text-[11px] font-semibold opacity-70">
                    {msg.sender === 'user' ? 'You' : 'Dr. Silva (Botanical Precision)'}
                  </span>
                  <span className="font-telemetry text-[10px] opacity-60">
                    {msg.timestamp}
                  </span>
                </div>
                <p className="font-sans text-sm leading-relaxed whitespace-pre-wrap">
                  {msg.text}
                </p>
              </div>
            </div>
          ))}

          {loading && (
            <div className="flex items-start gap-3">
              <div className="w-8 h-8 rounded-full bg-[#10b981]/20 text-[#00362d] border border-[#10b981]/40 flex items-center justify-center">
                <Microscope className="w-4 h-4 text-[#134e43] animate-pulse" />
              </div>
              <div className="bg-[#f4f6f0] border border-[#134e43]/10 rounded-2xl rounded-tl-none px-4 py-3 text-xs font-telemetry text-[#404946] flex items-center gap-2">
                <RefreshCw className="w-3.5 h-3.5 animate-spin text-[#10b981]" />
                <span>Synthesizing pathological literature & botanical diagnosis...</span>
              </div>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* Quick Suggestion Prompts */}
        <div className="p-3 bg-[#f8faf4] border-t border-[#134e43]/10 overflow-x-auto flex items-center gap-2 scrollbar-none">
          <span className="text-[11px] font-telemetry uppercase text-[#707976] shrink-0">
            Suggested:
          </span>
          {quickPrompts.map((prompt, i) => (
            <button
              key={i}
              onClick={() => handleSend(prompt)}
              className="text-xs font-telemetry text-[#134e43] bg-white border border-[#134e43]/15 hover:border-[#134e43] px-3 py-1.5 rounded-full whitespace-nowrap shrink-0 transition-colors"
            >
              {prompt}
            </button>
          ))}
        </div>

        {/* Input Bar */}
        <div className="p-3 sm:p-4 bg-white border-t border-[#134e43]/10">
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleSend();
            }}
            className="flex items-center gap-2"
          >
            <input
              type="text"
              value={inputMessage}
              onChange={(e) => setInputMessage(e.target.value)}
              placeholder="Ask Dr. Silva about leaf symptoms, pest treatments, or watering..."
              className="flex-1 h-[48px] px-4 rounded-lg bg-[#ecefe6] border border-[#134e43]/12 text-sm font-sans text-[#191c19] focus:outline-none focus:border-[#10b981] transition-all"
            />
            <button
              type="submit"
              disabled={!inputMessage.trim() || loading}
              className="h-[48px] px-5 rounded-lg bg-[#134e43] hover:bg-[#00362d] text-white font-telemetry text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors disabled:opacity-40"
            >
              <span>Consult</span>
              <Send className="w-3.5 h-3.5" />
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};
