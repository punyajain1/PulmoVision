import React, { useState, useRef, useEffect } from "react";
import { 
  MessageSquare, 
  X, 
  Send, 
  Bot, 
  User, 
  Sparkles, 
  HelpCircle,
  ShieldCheck 
} from "lucide-react";
import api from "../services/api.js";

const PRESET_QUESTIONS = [
  "Am I eligible for Low-Dose CT (LDCT) screening?",
  "How does Sequential Forward Selection (SFS) work?",
  "What symptoms contribute most to lung cancer risk?",
  "What should I do if my risk score is High?",
];

const KNOWLEDGE_BASE = [
  {
    triggers: ["ldct", "eligible", "screening", "ct scan"],
    response:
      "According to USPSTF and NCCN guidelines, Low-Dose CT (LDCT) screening is recommended for adults aged 50–80 who have a 20+ pack-year smoking history and currently smoke or have quit within the past 15 years. LDCT detects small pulmonary nodules years before symptoms appear.",
  },
  {
    triggers: ["sfs", "forward selection", "model", "bagging", "algorithm"],
    response:
      "Our system uses Sequential Forward Selection (SFS) coupled with a Bagging Ensemble. SFS starts with an empty set and iteratively adds features that yield the highest cross-validation score gain on the training fold, minimizing colinearity and preventing overfitting.",
  },
  {
    triggers: ["symptom", "cough", "chest pain", "dyspnea", "yellow"],
    response:
      "The top predictive clinical symptoms in the survey pipeline are persistent chronic coughing (>3 weeks), thoracic chest pain, dyspnea (shortness of breath), and swallowing difficulty (dysphagia). Nicotine staining ('yellow fingers') also acts as a high-correlation lifestyle proxy for prolonged heavy tobacco exposure.",
  },
  {
    triggers: ["high", "what should i do", "reduce", "quit", "next step"],
    response:
      "If your stratification index is High, the recommended clinical pathway is: 1) Schedule a consultation with a board-certified Pulmonologist; 2) Request pulmonary function spirometry and LDCT imaging; 3) Enroll in evidence-based smoking cessation therapy. Counterfactual simulations show smoking cessation reduces lifetime thoracic risk by over 50%.",
  },
];

export default function PulmoAIChatbot() {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState([
    {
      sender: "bot",
      text: "Hello! I am the PulmoVision Assistant, your clinical decision support assistant. You can ask me about screening guidelines, model architecture, or symptom risk factors.",
    },
  ]);
  const [inputText, setInputText] = useState("");
  const messagesEndRef = useRef(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    if (isOpen) {
      scrollToBottom();
    }
  }, [messages, isOpen]);

  const handleSend = async (textToSend) => {
    const text = textToSend || inputText;
    if (!text.trim()) return;

    const userMsg = { sender: "user", text };
    setMessages((prev) => [...prev, userMsg]);
    if (!textToSend) setInputText("");

    // Call backend AI service (Gemini 1.5 Flash with fallback)
    try {
      const { data } = await api.post("/ai/chat", { message: text });
      const botReply = data?.data?.response || data?.response;
      const engine = data?.data?.engine || "PulmoVision Clinical Engine";
      setMessages((prev) => [
        ...prev, 
        { 
          sender: "bot", 
          text: botReply,
          engine
        }
      ]);
    } catch (err) {
      // Local knowledge fallback
      const lower = text.toLowerCase();
      let matchedResponse = null;

      for (const item of KNOWLEDGE_BASE) {
        if (item.triggers.some((t) => lower.includes(t))) {
          matchedResponse = item.response;
          break;
        }
      }

      if (!matchedResponse) {
        matchedResponse =
          "PulmoVision evaluates multi-variable clinical surveys alongside uploaded radiological/medical reports using an SFS Bagging architecture. For medical diagnostics, please consult an attending pulmonologist or oncology specialist.";
      }

      setMessages((prev) => [
        ...prev, 
        { 
          sender: "bot", 
          text: matchedResponse,
          engine: "PulmoVision Clinical Engine (Offline Mode)"
        }
      ]);
    }
  };

  return (
    <div style={{ position: "fixed", bottom: 24, right: 24, zIndex: 9000 }}>
      {/* Floating Trigger Button */}
      {!isOpen && (
        <button
          onClick={() => setIsOpen(true)}
          style={{
            display: "flex",
            alignItems: "center",
            gap: 10,
            padding: "12px 20px",
            background: "linear-gradient(135deg, #2563EB, #1D4ED8)",
            color: "#FFFFFF",
            border: "none",
            borderRadius: "50px",
            boxShadow: "0 10px 25px -5px rgba(37, 99, 235, 0.4)",
            cursor: "pointer",
            fontWeight: 700,
            fontSize: "0.9rem",
            transition: "transform 0.2s ease",
          }}
          onMouseEnter={(e) => (e.currentTarget.style.transform = "scale(1.05)")}
          onMouseLeave={(e) => (e.currentTarget.style.transform = "scale(1)")}
        >
          <Sparkles size={18} />
          <span>Ask PulmoVision Assistant</span>
        </button>
      )}

      {/* Chat Window */}
      {isOpen && (
        <div style={{
          width: 380,
          height: 520,
          background: "#FFFFFF",
          borderRadius: "16px",
          boxShadow: "0 25px 50px -12px rgba(0, 0, 0, 0.25)",
          display: "flex",
          flexDirection: "column",
          overflow: "hidden",
          border: "1px solid #E2E8F0"
        }}>
          {/* Header */}
          <div style={{
            padding: "16px 20px",
            background: "linear-gradient(135deg, #1E293B, #0F172A)",
            color: "#FFFFFF",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between"
          }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <div style={{
                width: 32,
                height: 32,
                borderRadius: "50%",
                background: "linear-gradient(135deg, #2563EB, #60A5FA)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center"
              }}>
                <Bot size={18} color="#FFFFFF" />
              </div>
              <div>
                <div style={{ fontWeight: 800, fontSize: "0.95rem" }}>PulmoVision Intelligence</div>
                <div style={{ fontSize: "0.7rem", color: "#94A3B8" }}>Clinical Decision Assistant</div>
              </div>
            </div>
            <button
              onClick={() => setIsOpen(false)}
              style={{
                background: "transparent",
                border: "none",
                color: "#94A3B8",
                cursor: "pointer",
                padding: 4
              }}
            >
              <X size={18} />
            </button>
          </div>

          {/* Messages Body */}
          <div style={{
            flex: 1,
            padding: "16px",
            overflowY: "auto",
            display: "flex",
            flexDirection: "column",
            gap: 12,
            background: "#F8FAFC"
          }}>
            {messages.map((msg, index) => (
              <div
                key={index}
                style={{
                  display: "flex",
                  justifyContent: msg.sender === "user" ? "flex-end" : "flex-start",
                  gap: 8,
                }}
              >
                {msg.sender === "bot" && (
                  <div style={{
                    width: 26,
                    height: 26,
                    borderRadius: "50%",
                    background: "#2563EB",
                    color: "#FFFFFF",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    flexShrink: 0,
                    marginTop: 4
                  }}>
                    <Bot size={14} />
                  </div>
                )}
                <div style={{
                  maxWidth: "80%",
                  padding: "10px 14px",
                  borderRadius: msg.sender === "user" ? "14px 14px 2px 14px" : "14px 14px 14px 2px",
                  background: msg.sender === "user" ? "#2563EB" : "#FFFFFF",
                  color: msg.sender === "user" ? "#FFFFFF" : "#1E293B",
                  fontSize: "0.82rem",
                  lineHeight: 1.5,
                  boxShadow: "0 1px 3px rgba(0,0,0,0.06)",
                  border: msg.sender === "bot" ? "1px solid #E2E8F0" : "none"
                }}>
                  {msg.text}
                  {msg.engine && (
                    <div style={{ fontSize: "0.65rem", color: "#64748B", marginTop: 6, fontWeight: 600 }}>
                      ✨ {msg.engine}
                    </div>
                  )}
                </div>
              </div>
            ))}
            <div ref={messagesEndRef} />
          </div>

          {/* Quick Prompts */}
          <div style={{
            padding: "8px 12px",
            background: "#FFFFFF",
            borderTop: "1px solid #F1F5F9",
            display: "flex",
            gap: 6,
            overflowX: "auto"
          }}>
            {PRESET_QUESTIONS.map((q, idx) => (
              <button
                key={idx}
                onClick={() => handleSend(q)}
                style={{
                  fontSize: "0.68rem",
                  padding: "4px 8px",
                  borderRadius: "12px",
                  border: "1px solid #E2E8F0",
                  background: "#F8FAFC",
                  color: "#475569",
                  whiteSpace: "nowrap",
                  cursor: "pointer"
                }}
              >
                {q}
              </button>
            ))}
          </div>

          {/* Input Box */}
          <div style={{
            padding: "10px 14px",
            background: "#FFFFFF",
            borderTop: "1px solid #E2E8F0",
            display: "flex",
            gap: 8,
            alignItems: "center"
          }}>
            <input
              type="text"
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleSend()}
              placeholder="Ask PulmoVision anything..."
              style={{
                flex: 1,
                padding: "8px 12px",
                borderRadius: "20px",
                border: "1px solid #CBD5E1",
                fontSize: "0.82rem",
                outline: "none"
              }}
            />
            <button
              onClick={() => handleSend()}
              style={{
                width: 34,
                height: 34,
                borderRadius: "50%",
                background: "#2563EB",
                color: "#FFFFFF",
                border: "none",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                cursor: "pointer"
              }}
            >
              <Send size={15} />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
