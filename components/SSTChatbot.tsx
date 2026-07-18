
import React, { useState, useRef, useEffect } from 'react';
import { MessageCircle, X, Send, Loader2, Shield, Sparkles, GripHorizontal } from 'lucide-react';
import { chatWithSSTExpert } from '../services/geminiService';

interface ChatMessage {
  role: 'user' | 'model';
  text: string;
}

interface QuickAction {
  label: string;
  query: string;
  icon?: string;
}

export const SSTChatbot: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([
    { role: 'model', text: 'Hola. Soy tu asistente experto en Seguridad y Salud en el Trabajo (SST) disponible 24/7. ¿En qué puedo ayudarte con la normativa DS 44 o gestión de riesgos?' }
  ]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Dragging State
  const [position, setPosition] = useState<{x: number, y: number} | null>(null);
  const isDragging = useRef(false);
  const dragOffset = useRef({ x: 0, y: 0 });
  const hasMoved = useRef(false);

  const quickActions: QuickAction[] = [
    { label: "📜 Ver DS 44", query: "Ver Normativa DS 44" },
    { label: "⚠️ Reportar Riesgo", query: "Reportar Riesgo" },
    { label: "🎓 Capacitaciones", query: "Reservar Capacitación" },
    { label: "📞 Hablar con DPRL", query: "Hablar con DPRL" },
    { label: "❓ FAQ SST", query: "Consultar FAQ" }
  ];

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    if (isOpen) scrollToBottom();
  }, [messages, isOpen]);

  // Global Mouse Events for Dragging
  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (isDragging.current) {
        hasMoved.current = true;
        setPosition({
          x: e.clientX - dragOffset.current.x,
          y: e.clientY - dragOffset.current.y
        });
      }
    };

    const handleMouseUp = () => {
      isDragging.current = false;
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);

    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, []);

  const handleMouseDown = (e: React.MouseEvent) => {
      // Prevent dragging if clicking on close/action buttons
      if ((e.target as HTMLElement).closest('.no-drag')) return;
      
      isDragging.current = true;
      hasMoved.current = false;
      
      const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
      dragOffset.current = {
        x: e.clientX - rect.left,
        y: e.clientY - rect.top
      };
  };

  const toggleChat = () => {
      if (!hasMoved.current) {
          setIsOpen(!isOpen);
      }
  };

  const handleSend = async (textOverride?: string) => {
    const userMsg = textOverride || input;
    if (!userMsg.trim()) return;

    setInput('');
    setMessages(prev => [...prev, { role: 'user', text: userMsg }]);
    setIsLoading(true);

    try {
      const history = messages.map(m => ({
        role: m.role,
        parts: [{ text: m.text }]
      }));

      const responseText = await chatWithSSTExpert(history, userMsg);
      setMessages(prev => [...prev, { role: 'model', text: responseText || 'Lo siento, hubo un error.' }]);
    } catch (error) {
      setMessages(prev => [...prev, { role: 'model', text: 'Error de conexión con el servicio de IA.' }]);
    } finally {
      setIsLoading(false);
    }
  };

  // Styles logic: default to fixed bottom-right, otherwise absolute positioning
  const styleProps = position 
    ? { left: position.x, top: position.y, right: 'auto', bottom: 'auto' } 
    : {}; 
  
  const positionClasses = position ? 'fixed' : 'fixed bottom-6 right-6';

  return (
    <>
      {/* Trigger Button */}
      {!isOpen && (
        <div
          onMouseDown={handleMouseDown}
          onClick={toggleChat}
          style={styleProps}
          className={`${positionClasses} bg-primary hover:bg-blue-700 text-white p-4 rounded-full shadow-lg transition-colors duration-300 z-50 flex items-center gap-2 animate-bounce-in cursor-move group`}
          title="Arrastrar para mover"
        >
          <div className="relative pointer-events-none">
             <MessageCircle size={24} />
             <span className="absolute -top-1 -right-1 w-3 h-3 bg-green-400 rounded-full border border-primary"></span>
          </div>
          <span className="font-semibold hidden md:inline pointer-events-none">Asistente SST 24/7</span>
          <GripHorizontal size={16} className="text-blue-300 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none ml-1" />
        </div>
      )}

      {/* Chat Window */}
      {isOpen && (
        <div 
            style={{ ...styleProps, height: '600px' }}
            className={`${positionClasses} w-full max-w-sm md:w-[400px] bg-white rounded-2xl shadow-2xl flex flex-col z-50 border border-gray-200 overflow-hidden transition-opacity animate-fade-in-up`} 
        >
          {/* Header - Draggable */}
          <div 
            onMouseDown={handleMouseDown}
            className="bg-gradient-to-r from-primary to-blue-700 p-4 flex justify-between items-center text-white shadow-md cursor-move select-none"
          >
            <div className="flex items-center gap-3 pointer-events-none">
              <div className="bg-white/20 p-2 rounded-lg backdrop-blur-sm">
                <Shield size={20} className="text-white" />
              </div>
              <div>
                <h3 className="font-bold text-sm">SST Expert Bot</h3>
                <p className="text-xs text-blue-100 flex items-center gap-1"><span className="w-2 h-2 bg-green-400 rounded-full"></span> En línea 24/7</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
                <span title="Arrastrar ventana">
                    <GripHorizontal size={18} className="text-blue-200 mr-2" />
                </span>
                <button onClick={() => setIsOpen(false)} className="no-drag hover:bg-white/20 p-2 rounded-full transition-colors">
                  <X size={20} />
                </button>
            </div>
          </div>

          {/* Messages Area */}
          <div className="flex-1 overflow-y-auto p-4 bg-slate-50 space-y-4">
            {messages.map((msg, idx) => (
              <div key={idx} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                <div className={`max-w-[85%] p-3.5 rounded-2xl text-sm shadow-sm whitespace-pre-wrap ${
                  msg.role === 'user' 
                    ? 'bg-blue-600 text-white rounded-br-none' 
                    : 'bg-white text-gray-800 rounded-bl-none border border-gray-200'
                }`}>
                  {msg.text}
                </div>
              </div>
            ))}
            {isLoading && (
              <div className="flex justify-start">
                <div className="bg-white p-4 rounded-2xl rounded-bl-none border border-gray-200 shadow-sm flex gap-2 items-center">
                  <Loader2 size={16} className="animate-spin text-primary" />
                  <span className="text-xs text-gray-500">Escribiendo...</span>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Quick Actions Area */}
          <div className="px-4 py-2 bg-white border-t border-gray-100 overflow-x-auto whitespace-nowrap no-scrollbar">
             <div className="flex gap-2">
                {quickActions.map((action, idx) => (
                   <button 
                     key={idx}
                     onClick={() => handleSend(action.query)}
                     className="px-3 py-1.5 bg-blue-50 hover:bg-blue-100 text-blue-700 text-xs font-medium rounded-full border border-blue-200 transition-colors flex items-center gap-1"
                   >
                     <Sparkles size={12} className="text-blue-500" /> {action.label}
                   </button>
                ))}
             </div>
          </div>

          {/* Input Area */}
          <div className="p-3 bg-white border-t border-gray-100 flex gap-2 items-end pb-4">
            <textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  handleSend();
                }
              }}
              placeholder="Escribe tu consulta aquí..."
              className="flex-1 px-4 py-3 border border-gray-200 bg-gray-50 rounded-2xl focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary text-sm resize-none h-[50px] max-h-[100px]"
              rows={1}
            />
            <button 
              onClick={() => handleSend()}
              disabled={isLoading || !input.trim()}
              className="bg-primary hover:bg-blue-700 disabled:bg-gray-300 text-white p-3 rounded-xl transition-colors shadow-sm"
            >
              <Send size={20} />
            </button>
          </div>
        </div>
      )}
    </>
  );
};
