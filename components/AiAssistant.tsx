import React, { useState, useEffect, useRef } from 'react';
import { ChatMessage, NewsHeadline } from '../types';

interface AiAssistantProps {
  chatHistory: ChatMessage[];
  onSendChat: (msg: string) => void;
  newsHeadlines: NewsHeadline[];
  isChatOpen: boolean;
  toggleChat: () => void;
  loadingChat: boolean;
}

export const AiAssistant: React.FC<AiAssistantProps> = ({
  chatHistory,
  onSendChat,
  newsHeadlines,
  isChatOpen,
  toggleChat,
  loadingChat
}) => {
  const [input, setInput] = useState("");
  const scrollRef = useRef<HTMLDivElement>(null);

  // Auto-scroll chat
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [chatHistory, isChatOpen]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (input.trim()) {
      onSendChat(input);
      setInput("");
    }
  };

  // Helper to render the list of headlines
  const renderHeadlines = () => (
     <div className="flex items-center gap-12 px-4">
        {newsHeadlines.length > 0 ? newsHeadlines.map((news) => (
            <div key={news.id} className="flex items-center gap-3">
                <span className="text-yellow-500 text-lg">●</span>
                <span className="uppercase text-blue-400 font-bold text-sm tracking-wider font-mono">
                    {news.source}
                </span>
                <span className="text-white text-sm font-medium tracking-wide">
                    {news.text}
                </span>
            </div>
        )) : (
           <span className="text-gray-400 text-sm italic tracking-widest pl-10">
              ESTABLISHING UPLINK TO GLOBAL SATELLITE NETWORK...
           </span>
        )}
     </div>
  );

  return (
    <>
      {/* 1. REALISTIC NEWS TICKER (Fixed Bottom) */}
      <div className="absolute bottom-0 left-0 right-0 h-12 bg-black border-t border-white/10 flex items-center z-50 pointer-events-auto shadow-2xl overflow-hidden group">
        
        {/* "BREAKING" Badge (Fixed Left, High Z-Index) */}
        <div className="bg-red-600 h-full px-8 flex items-center justify-center z-30 font-black text-sm text-white tracking-[0.2em] shadow-[10px_0_30px_rgba(0,0,0,0.8)] relative">
           <div className="absolute inset-0 bg-gradient-to-r from-red-700 to-red-600"></div>
           <span className="relative z-10 flex items-center gap-2">
              <span className="w-2 h-2 bg-white rounded-full animate-pulse"></span>
              BREAKING
           </span>
        </div>

        {/* Seamless Scrolling Container */}
        <div className="flex-1 flex overflow-hidden relative h-full items-center bg-slate-900/50 backdrop-blur-sm">
             
             {/* Set 1 */}
             {/* 'will-change-transform' optimizes rendering performance */}
             <div className="animate-marquee will-change-transform flex min-w-full shrink-0 items-center py-2 group-hover:[animation-play-state:paused]">
                {renderHeadlines()}
             </div>
             
             {/* Set 2 (Duplicate for seamless loop) */}
             <div className="animate-marquee will-change-transform flex min-w-full shrink-0 items-center py-2 group-hover:[animation-play-state:paused]" aria-hidden="true">
                {renderHeadlines()}
             </div>
        </div>
      </div>

      {/* 2. CHAT TOGGLE BUTTON */}
      <button 
        onClick={toggleChat}
        className="absolute bottom-16 right-6 pointer-events-auto bg-blue-600 hover:bg-blue-500 text-white p-4 rounded-full shadow-2xl transition-all hover:scale-110 z-40 group border-2 border-white/10"
      >
        <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
        </svg>
        {!isChatOpen && (
             <div className="absolute -top-1 -right-1 w-3.5 h-3.5 bg-red-500 rounded-full animate-ping"></div>
        )}
      </button>

      {/* 3. CHAT INTERFACE */}
      {isChatOpen && (
        <div className="absolute bottom-32 right-6 w-80 h-96 bg-slate-900/95 backdrop-blur-xl border border-white/10 rounded-2xl shadow-2xl flex flex-col overflow-hidden z-40 animate-fadeIn pointer-events-auto">
            {/* Header */}
            <div className="p-4 border-b border-white/10 bg-slate-800/50 flex justify-between items-center">
                <div className="flex items-center gap-2">
                    <div className="w-2 h-2 bg-green-500 rounded-full shadow-[0_0_8px_#22c55e]"></div>
                    <span className="font-bold text-white text-sm tracking-wider">CityOS AI</span>
                </div>
                <button onClick={toggleChat} className="text-gray-400 hover:text-white">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                </button>
            </div>

            {/* Messages */}
            <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 space-y-3 custom-scrollbar">
                {chatHistory.length === 0 && (
                    <div className="text-center text-gray-500 text-xs mt-10">
                        Ask me about infrastructure damage, costs, or evacuation routes.
                    </div>
                )}
                {chatHistory.map((msg, idx) => (
                    <div key={idx} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                        <div className={`max-w-[85%] rounded-2xl px-4 py-2 text-xs leading-relaxed ${
                            msg.role === 'user' 
                            ? 'bg-blue-600 text-white rounded-br-none' 
                            : 'bg-slate-700 text-gray-100 rounded-bl-none border border-slate-600'
                        }`}>
                            {msg.text}
                        </div>
                    </div>
                ))}
                {loadingChat && (
                    <div className="flex justify-start">
                        <div className="bg-slate-700 rounded-2xl rounded-bl-none px-4 py-3 flex gap-1">
                            <span className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce"></span>
                            <span className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce delay-75"></span>
                            <span className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce delay-150"></span>
                        </div>
                    </div>
                )}
            </div>

            {/* Input */}
            <form onSubmit={handleSubmit} className="p-3 border-t border-white/10 bg-slate-800/50">
                <div className="relative">
                    <input 
                        type="text" 
                        value={input}
                        onChange={(e) => setInput(e.target.value)}
                        placeholder="Message CityOS..."
                        className="w-full bg-black/40 border border-gray-600 rounded-full pl-4 pr-10 py-2 text-xs text-white focus:border-blue-500 focus:outline-none placeholder-gray-500"
                    />
                    <button type="submit" disabled={loadingChat} className="absolute right-1 top-1 p-1.5 bg-blue-600 rounded-full text-white hover:bg-blue-500 transition-colors disabled:opacity-50">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3" viewBox="0 0 20 20" fill="currentColor">
                            <path d="M10.894 2.553a1 1 0 00-1.788 0l-7 14a1 1 0 001.169 1.409l5-1.429A1 1 0 009 15.571V11a1 1 0 112 0v4.571a1 1 0 00.725.962l5 1.428a1 1 0 001.17-1.408l-7-14z" />
                        </svg>
                    </button>
                </div>
            </form>
        </div>
      )}
    </>
  );
};