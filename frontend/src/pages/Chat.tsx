import { useState, useRef, useEffect } from "react";
import "./Chat.css";
import { useAuth } from "../hooks/useAuth";
import { removeArabicDiacritics } from "../utils/arabic";

type Message = {
  id: number;
  sender: "user" | "bot";
  text: string;
  timestamp: string;
};

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:8000";

const formatTime = (date: Date) =>
  date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });

export default function Chat() {
  const { username } = useAuth();
  const [messages, setMessages] = useState<Message[]>([
    {
      id: 1,
      sender: "bot",
      text: "أهلا بيك! أنا مساعدك الذكي🤖 نحكي معاك بالدارجة التونسية، فاش نجم نعاونك اليوم؟",
      timestamp: formatTime(new Date()),
    },
  ]);
  const [input, setInput] = useState("");
  const [isRecording, setIsRecording] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleSend = async () => {
    if (!input.trim() || isSending) return;

    const userMessage: Message = {
      id: Date.now(),
      sender: "user",
      text: input,
      timestamp: formatTime(new Date()),
    };

    setMessages((prev) => [...prev, userMessage]);
    setInput("");
    setIsSending(true);

    try {
      const res = await fetch(`${API_URL}/chat`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: userMessage.text,
          session_id: sessionId,
        }),
      });

      if (!res.ok) {
        const errData = await res.json().catch(() => null);
        throw new Error(errData?.detail || `Erreur ${res.status}`);
      }

      const data: { reply: string; session_id: string } = await res.json();

      setSessionId(data.session_id);

      const botMessage: Message = {
        id: Date.now() + 1,
        sender: "bot",
        text: data.reply,
        timestamp: formatTime(new Date()),
      };
      setMessages((prev) => [...prev, botMessage]);
    } catch (err) {
      const errorMessage: Message = {
        id: Date.now() + 1,
        sender: "bot",
        text: "معذرة، صار مشكل في الاتصال بالسيرفر. عاود جرب.",
        timestamp: formatTime(new Date()),
      };
      setMessages((prev) => [...prev, errorMessage]);
      console.error("Chat error:", err);
    } finally {
      setIsSending(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleToggleRecording = () => {
    setIsRecording((prev) => !prev);
    // TODO: start/stop real audio recording (MediaRecorder / Web Speech API)
  };

  return (
    <main className="chat-main">
      <header className="chat-header">
        <h1>Chat with Agent Derja</h1>
        <p>Welcome back, {username}</p>
      </header>

      <div className="chat-messages">
        {messages.map((msg) => (
          <div
            key={msg.id}
            className={`chat-bubble-row ${msg.sender === "user" ? "chat-bubble-row-user" : ""}`}
          >
            {msg.sender === "bot" && (
              <div className="chat-bubble-avatar">
                <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <rect x="4" y="8" width="16" height="12" rx="3" stroke="white" strokeWidth="2" />
                  <path d="M12 8V4" stroke="white" strokeWidth="2" strokeLinecap="round" />
                  <circle cx="12" cy="3" r="1.3" fill="white" />
                  <circle cx="9" cy="14" r="1.4" fill="white" />
                  <circle cx="15" cy="14" r="1.4" fill="white" />
                  <path d="M2 12h2M20 12h2" stroke="white" strokeWidth="2" strokeLinecap="round" />
                </svg>
              </div>
            )}
            <div className="chat-bubble-content">
              <div
                className={`chat-bubble ${
                  msg.sender === "user" ? "chat-bubble-user" : "chat-bubble-bot"
                }`}
              >
                {msg.sender === "bot" ? removeArabicDiacritics(msg.text) : msg.text}
              </div>
              <span
                className={`chat-timestamp ${
                  msg.sender === "user" ? "chat-timestamp-user" : "chat-timestamp-bot"
                }`}
              >
                {msg.timestamp}
              </span>
            </div>
          </div>
        ))}

        {isSending && (
          <div className="chat-bubble-row">
            <div className="chat-bubble-avatar">
              <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <rect x="4" y="8" width="16" height="12" rx="3" stroke="white" strokeWidth="2" />
                <path d="M12 8V4" stroke="white" strokeWidth="2" strokeLinecap="round" />
                <circle cx="12" cy="3" r="1.3" fill="white" />
                <circle cx="9" cy="14" r="1.4" fill="white" />
                <circle cx="15" cy="14" r="1.4" fill="white" />
                <path d="M2 12h2M20 12h2" stroke="white" strokeWidth="2" strokeLinecap="round" />
              </svg>
            </div>
            <div className="chat-bubble chat-bubble-bot chat-typing">
              <span className="chat-typing-dot"></span>
              <span className="chat-typing-dot"></span>
              <span className="chat-typing-dot"></span>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {isRecording && (
        <div className="chat-voice-indicator">
          <div className="chat-voice-bars">
            <span></span>
            <span></span>
            <span></span>
            <span></span>
            <span></span>
          </div>
          <span className="chat-voice-label">Listening...</span>
        </div>
      )}

      <div className="chat-input-bar">
        <textarea
          className="chat-input"
          placeholder="Type your message in Derja..."
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          rows={1}
          disabled={isSending}
        />

        <button
          className={`chat-mic-btn ${isRecording ? "chat-mic-btn-active" : ""}`}
          onClick={handleToggleRecording}
          aria-label={isRecording ? "Stop recording" : "Start voice message"}
          type="button"
        >
          {isRecording && <span className="chat-mic-pulse"></span>}
          <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <rect x="9" y="2" width="6" height="12" rx="3" stroke="currentColor" strokeWidth="2" />
            <path
              d="M5 11a7 7 0 0 0 14 0M12 18v4M8 22h8"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </button>

        <button
          className="chat-send-btn"
          onClick={handleSend}
          aria-label="Send message"
          disabled={isSending}
        >
          <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path
              d="M22 2 11 13M22 2l-7 20-4-9-9-4 20-7z"
              stroke="white"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </button>
      </div>
    </main>
  );
}