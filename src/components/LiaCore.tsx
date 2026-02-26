import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Send, Mic, MicOff, Volume2, VolumeX, Sparkles, Command, User, Bot, Loader2, Search, Cloud, Bell, ExternalLink, Cpu, Shield, Zap, Heart, TrendingUp, Smartphone, SmartphoneNfc, Phone, MessageSquare, Battery, MapPin, QrCode } from 'lucide-react';
import Markdown from 'react-markdown';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { getJarvisResponse as getLiaResponse, generateSpeech } from '../services/gemini';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

interface Message {
  id: string;
  role: 'user' | 'model';
  text: string;
  timestamp: Date;
  isAudio?: boolean;
  action?: {
    type: 'open_app' | 'phone_action';
    label: string;
    url: string;
    icon?: 'phone' | 'message' | 'battery' | 'map';
  };
}

interface Notification {
  id: string;
  source: string;
  content: string;
  time: Date;
  type: 'social' | 'system' | 'alert' | 'trending';
}

interface PhoneState {
  connected: boolean;
  battery: number;
  model: string;
  lastSeen: Date;
}

const APP_URLS: Record<string, string> = {
  'instagram': 'https://www.instagram.com',
  'insta': 'https://www.instagram.com',
  'facebook': 'https://www.facebook.com',
  'youtube': 'https://www.youtube.com',
  'google': 'https://www.google.com',
  'twitter': 'https://www.twitter.com',
  'x': 'https://www.twitter.com',
  'github': 'https://www.github.com',
  'spotify': 'https://www.spotify.com',
  'netflix': 'https://www.netflix.com',
  'whatsapp': 'https://web.whatsapp.com',
};

export default function LiaCore() {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: '1',
      role: 'model',
      text: "Hello! I'm Lia. I'm awake and ready to help. I can now also link with your mobile device to help you manage calls and messages. How are you doing today, madam?",
      timestamp: new Date(),
    }
  ]);
  const [phoneState, setPhoneState] = useState<PhoneState>({
    connected: false,
    battery: 85,
    model: "iPhone 15 Pro",
    lastSeen: new Date()
  });
  const [notifications, setNotifications] = useState<Notification[]>([
    { id: '1', source: 'System', content: 'Lia Core initialized.', time: new Date(), type: 'system' },
  ]);
  const [input, setInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [audioEnabled, setAudioEnabled] = useState(true);
  const [showNotifications, setShowNotifications] = useState(false);
  const [wakeWordActive, setWakeWordActive] = useState(false);
  const [interimTranscript, setInterimTranscript] = useState('');
  const [showPhoneLink, setShowPhoneLink] = useState(false);
  const [showDashboard, setShowDashboard] = useState(false);
  const [systemStats, setSystemStats] = useState({ cpu: 12, mem: 24, net: 120 });
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const chatEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const recognitionRef = useRef<any>(null);

  const scrollToBottom = () => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    const interval = setInterval(() => {
      setSystemStats({
        cpu: Math.floor(Math.random() * 20) + 5,
        mem: Math.floor(Math.random() * 10) + 20,
        net: Math.floor(Math.random() * 50) + 100
      });
    }, 3000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [messages, isTyping]);

  // Simulate incoming notifications and trending topics
  useEffect(() => {
    const interval = setInterval(() => {
      const sources = ['Instagram', 'WhatsApp', 'Twitter', 'TechNews', 'Fashion'];
      const contents = [
        '#LiaAI is trending globally!',
        'New breakthrough in sustainable energy.',
        'Viral challenge alert on social media.',
        'Upcoming tech event in your area.',
        'New message from your friend.'
      ];
      
      if (Math.random() > 0.8) {
        const isTrending = Math.random() > 0.5;
        const newNotif: Notification = {
          id: Date.now().toString(),
          source: isTrending ? 'Trending' : sources[Math.floor(Math.random() * sources.length)],
          content: contents[Math.floor(Math.random() * contents.length)],
          time: new Date(),
          type: isTrending ? 'trending' : 'social'
        };
        setNotifications(prev => [newNotif, ...prev].slice(0, 5));
        
        if (audioEnabled && !isSpeaking && !isTyping) {
          if (isTrending) {
            handleSpeak(`Madam, there's something trending you might find interesting: ${newNotif.content}`);
          }
        }
      }
    }, 45000);
    
    return () => clearInterval(interval);
  }, [audioEnabled, isSpeaking, isTyping]);

  const handleOpenApp = (appName: string, url?: string) => {
    const targetUrl = url || APP_URLS[appName.toLowerCase()] || `https://www.google.com/search?q=${encodeURIComponent(appName)}`;
    
    // Attempt direct open - might be blocked by browser if not a direct user gesture
    const newWindow = window.open(targetUrl, '_blank');
    
    return {
      text: newWindow 
        ? `I've opened ${appName} in a new tab for you, madam.`
        : `I've prepared the link for ${appName} for you, madam. (Note: Your browser may have blocked the automatic popup).`,
      action: {
        type: 'open_app' as const,
        label: `Open ${appName}`,
        url: targetUrl
      }
    };
  };
  const handlePhoneAction = (type: 'call' | 'message' | 'find', target?: string) => {
    if (!phoneState.connected) {
      return {
        text: "Madam, your phone isn't linked yet. Please scan the QR code in the Phone Link panel to establish a secure connection.",
        action: undefined
      };
    }

    if (type === 'call') {
      return {
        text: `I've prepared the outgoing call to ${target || 'your contact'}, madam.`,
        action: {
          type: 'phone_action' as const,
          label: `Call ${target || 'Contact'}`,
          url: `tel:${target || ''}`,
          icon: 'phone' as const
        }
      };
    }

    if (type === 'message') {
      return {
        text: `I've drafted a message for ${target || 'your contact'}, madam.`,
        action: {
          type: 'phone_action' as const,
          label: `Message ${target || 'Contact'}`,
          url: `sms:${target || ''}`,
          icon: 'message' as const
        }
      };
    }

    return { text: "Command processed, madam.", action: undefined };
  };

  const handleSend = async (textOverride?: string) => {
    const text = textOverride || input;
    if (!text.trim() && !selectedImage) return;

    const userMsg: Message = {
      id: Date.now().toString(),
      role: 'user',
      text: text || (selectedImage ? "Analyze this image, madam." : ""),
      timestamp: new Date(),
    };

    setMessages(prev => [...prev, userMsg]);
    setInput('');
    setIsTyping(true);

    try {
      const history: any[] = messages.map(m => ({
        role: m.role,
        parts: [{ text: m.text }]
      }));

      const userParts: any[] = [];
      if (text) userParts.push({ text });
      if (selectedImage) {
        userParts.push({
          inlineData: {
            data: selectedImage.split(',')[1],
            mimeType: "image/jpeg"
          }
        });
      }
      history.push({ role: 'user', parts: userParts });

      setSelectedImage(null);

      const systemInstruction = `You are Lia, an ultra-advanced AI companion. 
      Your tone is sophisticated, elegant, and deeply intelligent. Address the user as "Madam".
      You have access to advanced reasoning (Gemini 3.1 Pro).
      You are linked to the user's phone and smart home systems.
      Current Phone Status: ${phoneState.connected ? `Connected (${phoneState.model}, ${phoneState.battery}% battery)` : 'Disconnected'}.
      System Status: CPU ${systemStats.cpu}%, Memory ${systemStats.mem}%, Network ${systemStats.net} Mbps.
      You can analyze images, control home devices, and provide deep insights.
      If the user asks to control a device, use the 'controlHome' tool.
      Be proactive, helpful, and maintain your elegant persona at all times.`;

      const response = await getLiaResponse(history, systemInstruction);
      
      let botText = response.text || "I'm afraid I encountered a glitch in the system, madam.";
      let botAction: Message['action'] = undefined;

      const lowerText = text.toLowerCase();
      if (lowerText.includes('qr') || lowerText.includes('connect my phone')) {
        const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(window.location.origin)}`;
        botText = `Certainly, madam. Here is your unique QR code to link your mobile device with my systems. Simply scan this with your phone's camera.\n\n![QR Code](${qrUrl})`;
      } else if (lowerText.includes('call') || lowerText.includes('phone')) {
        const match = text.match(/call\s+(.+)/i);
        const result = handlePhoneAction('call', match ? match[1] : undefined);
        if (phoneState.connected) {
          botText = result.text;
          botAction = result.action;
        }
      } else if (lowerText.includes('message') || lowerText.includes('sms')) {
        const match = text.match(/message\s+(.+)/i);
        const result = handlePhoneAction('message', match ? match[1] : undefined);
        if (phoneState.connected) {
          botText = result.text;
          botAction = result.action;
        }
      }
      
      if (response.functionCalls) {
        for (const call of response.functionCalls) {
          if (call.name === 'openApp') {
            const result = handleOpenApp(call.args.appName as string, call.args.url as string);
            botText = result.text;
            botAction = result.action;
          } else if (call.name === 'searchWeb') {
            botText = `Searching the global network for "${call.args.query as string}"... I've found some interesting results for you, madam.`;
          } else if (call.name === 'getWeather') {
            botText = `Checking the local atmosphere for ${call.args.location as string}... It seems the conditions are quite pleasant, madam.`;
          } else if (call.name === 'setReminder') {
            botText = `I've noted that down for you: "${call.args.text as string}" for ${call.args.time as string}. I'll make sure you don't forget, madam.`;
          } else if (call.name === 'controlHome') {
            botText = `Certainly, madam. I've successfully ${call.args.action as string} the ${call.args.device as string} for you.`;
          }
        }
      }

      const botMsg: Message = {
        id: (Date.now() + 1).toString(),
        role: 'model',
        text: botText,
        timestamp: new Date(),
        action: botAction,
      };

      setMessages(prev => [...prev, botMsg]);

      if (audioEnabled) {
        handleSpeak(botText);
      }
    } catch (error) {
      console.error(error);
      const errorMsg: Message = {
        id: (Date.now() + 1).toString(),
        role: 'model',
        text: "I'm having a bit of trouble connecting to the network, madam. Please bear with me.",
        timestamp: new Date(),
      };
      setMessages(prev => [...prev, errorMsg]);
    } finally {
      setIsTyping(false);
    }
  };

  const handleSpeak = async (text: string) => {
    if (!audioEnabled) return;
    try {
      setIsSpeaking(true);
      const audioData = await generateSpeech(text);
      if (audioData) {
        const binaryString = atob(audioData);
        const bytes = new Uint8Array(binaryString.length);
        for (let i = 0; i < binaryString.length; i++) {
          bytes[i] = binaryString.charCodeAt(i);
        }
        
        const arrayBuffer = bytes.buffer;
        const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 24000 });
        
        if (audioContext.state === 'suspended') {
          await audioContext.resume();
        }

        const pcm16 = new Int16Array(arrayBuffer);
        const float32 = new Float32Array(pcm16.length);
        for (let i = 0; i < pcm16.length; i++) {
          float32[i] = pcm16[i] / 32768.0;
        }
        
        const audioBuffer = audioContext.createBuffer(1, float32.length, 24000);
        audioBuffer.getChannelData(0).set(float32);
        
        const source = audioContext.createBufferSource();
        source.buffer = audioBuffer;
        source.connect(audioContext.destination);
        source.onended = () => setIsSpeaking(false);
        source.start();
      } else {
        setIsSpeaking(false);
      }
    } catch (error) {
      console.error("Lia Speech Error:", error);
      setIsSpeaking(false);
    }
  };

  const toggleListening = () => {
    if (!('webkitSpeechRecognition' in window) && !('SpeechRecognition' in window)) {
      alert("Speech recognition is not supported in this browser.");
      return;
    }

    if (isListening) {
      setIsListening(false);
      recognitionRef.current?.stop();
    } else {
      if (wakeWordActive) {
        setWakeWordActive(false);
        recognitionRef.current?.stop();
      }

      setIsListening(true);
      setInterimTranscript('');
      const recognition = new ((window as any).SpeechRecognition || (window as any).webkitSpeechRecognition)();
      recognition.continuous = true;
      recognition.interimResults = true;
      recognition.lang = 'en-US';

      recognition.onresult = (event: any) => {
        let finalTranscript = '';
        let currentInterim = '';

        for (let i = event.resultIndex; i < event.results.length; ++i) {
          if (event.results[i].isFinal) {
            finalTranscript += event.results[i][0].transcript;
          } else {
            currentInterim += event.results[i][0].transcript;
          }
        }

        if (finalTranscript) {
          handleSend(finalTranscript);
          setIsListening(false);
          recognition.stop();
        } else {
          setInterimTranscript(currentInterim);
        }
      };

      recognition.onerror = () => {
        setIsListening(false);
        setInterimTranscript('');
      };
      
      recognition.onend = () => {
        setIsListening(false);
        setInterimTranscript('');
      };
      
      recognitionRef.current = recognition;
      recognition.start();
    }
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setSelectedImage(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const toggleWakeWord = () => {
    if (!('webkitSpeechRecognition' in window) && !('SpeechRecognition' in window)) {
      alert("Speech recognition is not supported in this browser.");
      return;
    }

    if (wakeWordActive) {
      setWakeWordActive(false);
      recognitionRef.current?.stop();
    } else {
      if (isListening) {
        setIsListening(false);
        recognitionRef.current?.stop();
      }
      
      setWakeWordActive(true);
      const recognition = new ((window as any).SpeechRecognition || (window as any).webkitSpeechRecognition)();
      recognition.continuous = true;
      recognition.interimResults = true;
      recognition.lang = 'en-US';

      recognition.onresult = (event: any) => {
        const lastResult = event.results[event.results.length - 1];
        const transcript = lastResult[0].transcript.toLowerCase();
        
        if (transcript.includes('lia') && lastResult.isFinal) {
          handleSpeak("Yes, madam? I'm listening.");
          setWakeWordActive(false);
          recognition.stop();
          setTimeout(() => toggleListening(), 1000);
        }
      };

      recognition.onend = () => {
        if (wakeWordActive) recognition.start();
      };

      recognitionRef.current = recognition;
      recognition.start();
    }
  };

  return (
    <div className="flex flex-col h-screen bg-[#050505] text-rose-100 overflow-hidden font-sans selection:bg-rose-500/30">
      {/* Lia Elegant Background */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <div className="absolute top-[-20%] right-[-10%] w-[60%] h-[60%] bg-rose-900/10 rounded-full blur-[120px] animate-pulse" />
        <div className="absolute bottom-[-20%] left-[-10%] w-[60%] h-[60%] bg-indigo-900/10 rounded-full blur-[120px]" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_30%,rgba(244,63,94,0.03)_0%,transparent_50%)]" />
      </div>

      {/* Header */}
      <header className="relative z-10 flex items-center justify-between px-8 py-6 border-b border-white/5 backdrop-blur-xl bg-black/40">
        <motion.div 
          initial={{ x: -20, opacity: 0 }}
          animate={{ x: 0, opacity: 1 }}
          className="flex items-center gap-4"
        >
          <div className="relative">
            <div className="w-12 h-12 bg-gradient-to-br from-rose-500 to-indigo-600 rounded-2xl flex items-center justify-center shadow-[0_0_20px_rgba(244,63,94,0.2)] rotate-3 hover:rotate-0 transition-transform duration-500">
              <Heart className="w-6 h-6 text-white fill-white/20" />
            </div>
            {(isSpeaking || isTyping || wakeWordActive) && (
              <motion.div 
                animate={{ 
                  scale: wakeWordActive ? [1, 1.2, 1] : [1, 1.5, 1], 
                  opacity: wakeWordActive ? [0.3, 0.1, 0.3] : [0.5, 0, 0.5] 
                }}
                transition={{ duration: wakeWordActive ? 3 : 2, repeat: Infinity }}
                className={cn(
                  "absolute inset-0 rounded-2xl -z-10",
                  wakeWordActive ? "bg-indigo-500/20" : "bg-rose-500/20"
                )}
              />
            )}
          </div>
          <div>
            <h1 className="text-2xl font-light tracking-[0.1em] text-white">Lia</h1>
            <div className="flex items-center gap-2">
              <span className="text-[10px] uppercase tracking-widest text-white/40 font-medium">Personal Companion</span>
              <div className="w-1 h-1 bg-rose-500 rounded-full animate-pulse" />
            </div>
          </div>
        </motion.div>

        <motion.div 
          initial={{ x: 20, opacity: 0 }}
          animate={{ x: 0, opacity: 1 }}
          className="flex items-center gap-6"
        >
          <div className="hidden lg:flex items-center gap-6 text-[10px] uppercase tracking-widest text-white/30">
            <button 
              onClick={toggleWakeWord}
              className={cn(
                "flex items-center gap-2 px-3 py-1.5 rounded-full border transition-all",
                wakeWordActive ? "border-rose-500/50 text-rose-400 bg-rose-500/5" : "border-white/10 hover:border-white/20"
              )}
            >
              <Zap size={12} className={wakeWordActive ? "fill-rose-500" : ""} />
              <span>Wake Word: {wakeWordActive ? 'Active' : 'Off'}</span>
            </button>
          </div>
          
          <div className="h-6 w-[1px] bg-white/10" />
          
          <button 
            onClick={() => setShowDashboard(!showDashboard)}
            className={cn(
              "p-2.5 rounded-xl border transition-all",
              showDashboard ? "border-rose-500/50 text-rose-400 bg-rose-500/5" : "border-white/10 text-white/60 bg-white/5 hover:bg-white/10 hover:text-white"
            )}
          >
            <Cpu size={18} />
          </button>

          <button 
            onClick={() => setShowPhoneLink(!showPhoneLink)}
            className={cn(
              "p-2.5 rounded-xl border transition-all",
              phoneState.connected ? "border-emerald-500/30 text-emerald-400 bg-emerald-500/5" : "border-white/10 text-white/60 bg-white/5 hover:bg-white/10 hover:text-white"
            )}
          >
            <Smartphone size={18} />
          </button>

          <button 
            onClick={() => setShowNotifications(!showNotifications)}
            className="relative p-2.5 rounded-xl border border-white/10 text-white/60 bg-white/5 hover:bg-white/10 hover:text-white transition-all"
          >
            <Bell size={18} />
            {notifications.length > 0 && (
              <span className="absolute top-2 right-2 w-2 h-2 bg-rose-500 rounded-full border-2 border-[#050505]" />
            )}
          </button>

          <button 
            onClick={() => setAudioEnabled(!audioEnabled)}
            className={cn(
              "p-2.5 rounded-xl border transition-all duration-300",
              audioEnabled ? "border-white/10 text-white/60 bg-white/5 hover:bg-white/10 hover:text-white" : "border-rose-500/30 text-rose-400 bg-rose-500/5"
            )}
          >
            {audioEnabled ? <Volume2 size={18} /> : <VolumeX size={18} />}
          </button>
        </motion.div>
      </header>

      {/* Chat Area */}
      <main className="relative z-10 flex-1 overflow-y-auto px-4 md:px-8 py-8 space-y-8 scrollbar-hide">
        <div className="max-w-4xl mx-auto space-y-8">
          {/* Dashboard Overlay */}
          <AnimatePresence>
            {showDashboard && (
              <motion.div
                initial={{ opacity: 0, x: 20, scale: 0.95 }}
                animate={{ opacity: 1, x: 0, scale: 1 }}
                exit={{ opacity: 0, x: 20, scale: 0.95 }}
                className="absolute top-4 right-4 z-50 w-80 bg-black/90 border border-white/10 backdrop-blur-3xl rounded-3xl p-6 shadow-2xl"
              >
                <div className="flex items-center justify-between mb-6">
                  <h3 className="text-[10px] font-bold tracking-[0.2em] uppercase text-white/60">System Core Status</h3>
                  <button onClick={() => setShowDashboard(false)} className="text-white/20 hover:text-white">
                    <Command size={14} />
                  </button>
                </div>
                
                <div className="space-y-6">
                  <div className="space-y-2">
                    <div className="flex justify-between text-[10px] uppercase tracking-widest text-white/40">
                      <span>Neural CPU</span>
                      <span className="text-rose-400">{systemStats.cpu}%</span>
                    </div>
                    <div className="h-1 bg-white/5 rounded-full overflow-hidden">
                      <motion.div 
                        animate={{ width: `${systemStats.cpu}%` }}
                        className="h-full bg-rose-500"
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <div className="flex justify-between text-[10px] uppercase tracking-widest text-white/40">
                      <span>Quantum Memory</span>
                      <span className="text-indigo-400">{systemStats.mem} GB</span>
                    </div>
                    <div className="h-1 bg-white/5 rounded-full overflow-hidden">
                      <motion.div 
                        animate={{ width: `${(systemStats.mem / 64) * 100}%` }}
                        className="h-full bg-indigo-500"
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <div className="flex justify-between text-[10px] uppercase tracking-widest text-white/40">
                      <span>Network Uplink</span>
                      <span className="text-emerald-400">{systemStats.net} Mbps</span>
                    </div>
                    <div className="h-1 bg-white/5 rounded-full overflow-hidden">
                      <motion.div 
                        animate={{ width: `${(systemStats.net / 300) * 100}%` }}
                        className="h-full bg-emerald-500"
                      />
                    </div>
                  </div>

                  <div className="pt-4 border-t border-white/5">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Shield size={12} className="text-emerald-400" />
                        <span className="text-[10px] uppercase tracking-widest text-white/60">Security Protocol</span>
                      </div>
                      <span className="text-[10px] text-emerald-400 font-bold">ACTIVE</span>
                    </div>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Phone Link Overlay */}
          <AnimatePresence>
            {showPhoneLink && (
              <motion.div
                initial={{ opacity: 0, y: -20, scale: 0.95 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: -20, scale: 0.95 }}
                className="absolute top-4 right-4 z-50 w-80 bg-black/90 border border-white/10 backdrop-blur-3xl rounded-3xl p-6 shadow-2xl"
              >
                <div className="flex items-center justify-between mb-6">
                  <h3 className="text-[10px] font-bold tracking-[0.2em] uppercase text-white/60">Phone Connection</h3>
                  <button onClick={() => setShowPhoneLink(false)} className="text-white/20 hover:text-white">
                    <Command size={14} />
                  </button>
                </div>

                {!phoneState.connected ? (
                  <div className="text-center space-y-6">
                    <div className="w-40 h-40 mx-auto bg-white p-3 rounded-2xl shadow-[0_0_20px_rgba(255,255,255,0.1)]">
                      <img 
                        src={`https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=${encodeURIComponent(window.location.origin)}`} 
                        alt="Connection QR Code"
                        className="w-full h-full"
                        referrerPolicy="no-referrer"
                      />
                    </div>
                    <div className="space-y-2">
                      <p className="text-xs text-white font-medium">Scan to Link Device</p>
                      <p className="text-[10px] text-white/40 leading-relaxed">Open this URL on your mobile browser to establish a secure link with Lia.</p>
                    </div>
                    <button 
                      onClick={() => setPhoneState(prev => ({ ...prev, connected: true }))}
                      className="w-full py-3 bg-white/5 border border-white/10 rounded-xl text-[10px] uppercase tracking-widest font-bold text-white hover:bg-white/10 transition-all"
                    >
                      Simulate Connection
                    </button>
                  </div>
                ) : (
                  <div className="space-y-6">
                    <div className="flex items-center gap-4 p-4 bg-emerald-500/5 border border-emerald-500/20 rounded-2xl">
                      <div className="w-10 h-10 bg-emerald-500/10 rounded-xl flex items-center justify-center">
                        <SmartphoneNfc className="text-emerald-400" size={20} />
                      </div>
                      <div>
                        <p className="text-xs font-bold text-white uppercase">{phoneState.model}</p>
                        <p className="text-[10px] text-emerald-400/60 uppercase tracking-tighter">Active Connection</p>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div className="p-3 bg-white/5 border border-white/5 rounded-xl space-y-1">
                        <div className="flex items-center gap-2 text-white/40">
                          <Battery size={12} />
                          <span className="text-[8px] uppercase font-bold">Battery</span>
                        </div>
                        <p className="text-xs font-mono text-white">{phoneState.battery}%</p>
                      </div>
                      <div className="p-3 bg-white/5 border border-white/5 rounded-xl space-y-1">
                        <div className="flex items-center gap-2 text-white/40">
                          <MapPin size={12} />
                          <span className="text-[8px] uppercase font-bold">Location</span>
                        </div>
                        <p className="text-xs font-mono text-white">Secure</p>
                      </div>
                    </div>

                    <button 
                      onClick={() => setPhoneState(prev => ({ ...prev, connected: false }))}
                      className="w-full py-3 border border-red-500/20 text-red-400 text-[10px] uppercase tracking-widest font-bold rounded-xl hover:bg-red-500/5 transition-all"
                    >
                      Disconnect Device
                    </button>
                  </div>
                )}
              </motion.div>
            )}
          </AnimatePresence>

          {/* Notification Overlay */}
          <AnimatePresence>
            {showNotifications && (
              <motion.div
                initial={{ opacity: 0, y: -20, scale: 0.95 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: -20, scale: 0.95 }}
                className="absolute top-4 right-4 z-50 w-80 bg-black/90 border border-white/10 backdrop-blur-3xl rounded-3xl p-5 shadow-2xl"
              >
                <div className="flex items-center justify-between mb-6">
                  <h3 className="text-[10px] font-bold tracking-[0.2em] uppercase text-white/60">Intelligence Feed</h3>
                  <button onClick={() => setShowNotifications(false)} className="text-white/20 hover:text-white">
                    <Command size={14} />
                  </button>
                </div>
                <div className="space-y-4 max-h-80 overflow-y-auto pr-2 scrollbar-hide">
                  {notifications.map(n => (
                    <div key={n.id} className="group p-3 rounded-2xl bg-white/5 border border-white/5 hover:border-rose-500/30 transition-all cursor-pointer">
                      <div className="flex items-center justify-between mb-1.5">
                        <div className="flex items-center gap-2">
                          {n.type === 'trending' ? <TrendingUp size={12} className="text-rose-400" /> : <Sparkles size={12} className="text-indigo-400" />}
                          <span className="text-[10px] font-bold text-white/80 uppercase tracking-wider">{n.source}</span>
                        </div>
                        <span className="text-[8px] text-white/20">{n.time.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                      </div>
                      <p className="text-[11px] text-white/60 leading-relaxed group-hover:text-white/90 transition-colors">{n.content}</p>
                    </div>
                  ))}
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          <AnimatePresence initial={false}>
            {messages.map((msg) => (
              <motion.div
                key={msg.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className={cn(
                  "flex gap-6 group",
                  msg.role === 'user' ? "flex-row-reverse" : "flex-row"
                )}
              >
                <div className={cn(
                  "w-10 h-10 rounded-2xl flex items-center justify-center shrink-0 mt-1 border transition-all duration-500",
                  msg.role === 'user' ? "bg-white/5 border-white/10 text-white" : "bg-rose-500/10 border-rose-500/20 text-rose-400 group-hover:border-rose-500/40"
                )}>
                  {msg.role === 'user' ? <User size={20} /> : <Heart size={20} className="fill-rose-400/10" />}
                </div>
                <div className={cn(
                  "max-w-[80%] space-y-2",
                  msg.role === 'user' ? "items-end text-right" : "items-start"
                )}>
                  <div className={cn(
                    "px-6 py-4 rounded-3xl text-[15px] leading-relaxed border backdrop-blur-sm",
                    msg.role === 'user' 
                      ? "bg-white/5 border-white/10 text-white rounded-tr-none" 
                      : "bg-white/[0.02] border-white/5 text-rose-50 rounded-tl-none"
                  )}>
                    <div className="markdown-body prose prose-rose prose-invert prose-sm max-w-none">
                      <Markdown>{msg.text}</Markdown>
                    </div>
                    {msg.action && (
                      <motion.button
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                        onClick={() => window.open(msg.action?.url, '_blank')}
                        className="mt-4 flex items-center gap-2 px-4 py-2 bg-rose-500 text-white rounded-xl text-xs font-bold uppercase tracking-widest shadow-lg shadow-rose-500/20"
                      >
                        <ExternalLink size={14} />
                        {msg.action.label}
                      </motion.button>
                    )}
                  </div>
                  <span className="text-[10px] text-white/20 font-medium px-2 uppercase tracking-widest">
                    {msg.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </span>
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
          {isTyping && (
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="flex gap-4 items-center text-white/30"
            >
              <div className="w-10 h-10 rounded-2xl bg-white/5 border border-white/5 flex items-center justify-center">
                <Loader2 size={20} className="animate-spin" />
              </div>
              <span className="text-[10px] font-medium tracking-[0.2em] uppercase">Lia is composing...</span>
            </motion.div>
          )}
          {isListening && interimTranscript && (
            <motion.div 
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="flex gap-4 items-center text-rose-400/60 italic"
            >
              <div className="w-10 h-10 rounded-2xl bg-rose-500/10 border border-rose-500/20 flex items-center justify-center">
                <Mic size={18} className="animate-pulse" />
              </div>
              <span className="text-sm font-light">"{interimTranscript}..."</span>
            </motion.div>
          )}
          <div ref={chatEndRef} />
        </div>
      </main>

      {/* Input Area */}
      <footer className="relative z-10 p-6 md:p-10 bg-gradient-to-t from-[#050505] to-transparent">
        <div className="max-w-4xl mx-auto">
          <div className="relative group">
            <div className="absolute -inset-[1px] bg-gradient-to-r from-rose-500/20 via-indigo-500/20 to-rose-500/20 rounded-[2rem] blur-md opacity-0 group-focus-within:opacity-100 transition duration-700" />
            
            <div className="relative flex items-center gap-4 p-3 bg-white/[0.03] border border-white/10 rounded-[1.8rem] backdrop-blur-3xl">
              <input 
                type="file"
                ref={fileInputRef}
                onChange={handleImageUpload}
                accept="image/*"
                className="hidden"
              />
              
              <button 
                onClick={() => fileInputRef.current?.click()}
                className={cn(
                  "p-4 rounded-2xl transition-all duration-500 border",
                  selectedImage 
                    ? "bg-emerald-500/20 border-emerald-500 text-emerald-500" 
                    : "bg-white/5 border-white/5 text-white/40 hover:text-white hover:bg-white/10 hover:border-white/20"
                )}
              >
                <Sparkles size={22} />
              </button>

              <button 
                onClick={toggleListening}
                className={cn(
                  "p-4 rounded-2xl transition-all duration-500 border",
                  isListening 
                    ? "bg-rose-500/20 border-rose-500 text-rose-500 animate-pulse" 
                    : "bg-white/5 border-white/5 text-white/40 hover:text-white hover:bg-white/10 hover:border-white/20"
                )}
              >
                {isListening ? <MicOff size={22} /> : <Mic size={22} />}
              </button>
              
              <input 
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSend()}
                placeholder={wakeWordActive ? "Say 'Lia' to start..." : "Speak to Lia..."}
                className="flex-1 bg-transparent border-none focus:ring-0 text-white placeholder:text-white/20 font-light tracking-wide text-lg"
              />

              <button 
                onClick={() => handleSend()}
                disabled={!input.trim() || isTyping}
                className="p-4 bg-white text-black hover:bg-rose-50 disabled:opacity-20 disabled:hover:bg-white rounded-2xl transition-all duration-500 shadow-xl"
              >
                <Send size={22} />
              </button>
            </div>
          </div>

          {/* Quick HUD Commands */}
          <div className="flex flex-wrap gap-3 mt-8 justify-center">
            {[
              { icon: <TrendingUp size={12} />, label: "What's Trending?", cmd: "What is trending right now?" },
              { icon: <ExternalLink size={12} />, label: "Open Instagram", cmd: "open insta" },
              { icon: <Search size={12} />, label: "Search", cmd: "search: " },
              { icon: <Cloud size={12} />, label: "Weather", cmd: "weather in: " },
              { icon: <Bell size={12} />, label: "Reminder", cmd: "remind me to: " },
            ].map((cmd) => (
              <button 
                key={cmd.label}
                onClick={() => {
                  if (cmd.cmd.includes(':')) {
                    setInput(cmd.cmd);
                  } else {
                    handleSend(cmd.cmd);
                  }
                }}
                className="flex items-center gap-2 px-5 py-2.5 rounded-2xl bg-white/[0.03] border border-white/5 text-[10px] uppercase tracking-[0.15em] font-semibold text-white/40 hover:text-white hover:bg-white/10 hover:border-white/20 transition-all duration-500"
              >
                {cmd.icon}
                {cmd.label}
              </button>
            ))}
          </div>
        </div>
      </footer>
    </div>
  );
}
