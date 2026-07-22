import { useEffect, useRef } from "react";
import "./Chat.css";
import { useAuth } from "../hooks/useAuth";
import { useChat } from "../hooks/useChat";
import { removeArabicDiacritics } from "../utils/arabic";

export default function Chat() {
  const { username } = useAuth();
  const {
    messages,
    input,
    setInput,
    isSending,
    isRecording,
    isTranscribing,
    handleSend,
    handleSendClick,   // <-- nouveau
    handleMicClick,
  } = useChat();

  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
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
                className={`chat-bubble ${msg.sender === "user" ? "chat-bubble-user" : "chat-bubble-bot"
                  }`}
              >
                {msg.sender === "bot" ? removeArabicDiacritics(msg.text) : msg.text}
              </div>
              <span
                className={`chat-timestamp ${msg.sender === "user" ? "chat-timestamp-user" : "chat-timestamp-bot"
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

      <div className="chat-input-bar">
        {isRecording ? (
          <div className="chat-input-waveform">
            <div className="chat-waveform-bars">
              {Array.from({ length: 28 }).map((_, i) => (
                <span key={i} style={{ animationDelay: `${(i % 7) * 0.08}s` }} />
              ))}
            </div>
          </div>
        ) : (
          <textarea
            className="chat-input"
            placeholder={isTranscribing ? "Transcription en cours..." : "Type your message in Derja..."}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            rows={1}
            disabled={isSending || isTranscribing}
          />
        )}

        <button
          className={`chat-mic-btn ${isRecording ? "chat-mic-btn-recording" : ""} ${(isSending || isTranscribing) && !isRecording ? "chat-mic-btn-interrupt" : ""
            }`}
          onClick={handleMicClick}
          aria-label={
            isRecording ? "Stop recording" : isSending || isTranscribing ? "Interrupt" : "Start voice message"
          }
          type="button"
        >
          {isRecording || isTranscribing || isSending ? (
            <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <rect x="6" y="6" width="12" height="12" rx="2" fill="currentColor" />
            </svg>
          ) : (
            <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <rect x="9" y="2" width="6" height="12" rx="3" stroke="currentColor" strokeWidth="2" />
              <path d="M5 11a7 7 0 0 0 14 0M12 18v4M8 22h8" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          )}
        </button>

        <button
          className="chat-send-btn"
          onClick={handleSendClick}
          aria-label="Send message"
          disabled={isSending || isTranscribing || (!isRecording && !input.trim())}
        >
          <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M22 2 11 13M22 2l-7 20-4-9-9-4 20-7z" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </button>
      </div>

    </main>
  );
}