import { useRef, useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useAuth } from "./useAuth";
import { getConversation } from "../services/api";
import { useConversationsContext } from "../context/ConversationsContext";

export type Message = {
    id: number;
    sender: "user" | "bot";
    text: string;
    timestamp: string;
};

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:8000";

const formatTime = (date: Date) =>
    date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });

const WELCOME_MESSAGE: Message = {
    id: 1,
    sender: "bot",
    text: "أهلا بيك! أنا مساعدك الذكي🤖 نحكي معاك بالدارجة التونسية، فاش نجم نعاونك اليوم؟",
    timestamp: formatTime(new Date()),
};

export function useChat() {
    const { token } = useAuth();
    const { refresh } = useConversationsContext();
    const { sessionId: routeSessionId } = useParams<{ sessionId: string }>();
    const navigate = useNavigate();

    const [messages, setMessages] = useState<Message[]>([WELCOME_MESSAGE]);
    const [input, setInput] = useState("");
    const [isRecording, setIsRecording] = useState(false);
    const [isSending, setIsSending] = useState(false);
    const [sessionId, setSessionId] = useState<string | null>(routeSessionId ?? null);
    const [isTranscribing, setIsTranscribing] = useState(false);
    const [updatedAt, setUpdatedAt] = useState<string | null>(null);

    const abortControllerRef = useRef<AbortController | null>(null);
    const mediaRecorderRef = useRef<MediaRecorder | null>(null);
    const audioChunksRef = useRef<Blob[]>([]);
    const streamRef = useRef<MediaStream | null>(null);
    const audioQueueRef = useRef<Blob[]>([]);
    const isPlayingRef = useRef(false);
    const wsRef = useRef<WebSocket | null>(null);
    const currentAudioRef = useRef<HTMLAudioElement | null>(null);

    // Si true, dès que la transcription arrive, elle est envoyée automatiquement
    // (cas: l'utilisateur clique sur "envoyer" pendant l'enregistrement, sans passer par stop)
    const autoSendRef = useRef(false);

    useEffect(() => {
        if (!token) return;

        if (!routeSessionId) {
            setSessionId(null);
            setMessages([WELCOME_MESSAGE]);
            setUpdatedAt(null);
            return;
        }

        setSessionId(routeSessionId);
        getConversation(token, routeSessionId)
            .then((conv) => {
                setMessages(
                    conv.messages.map((m, idx) => ({
                        id: idx,
                        sender: m.sender,
                        text: m.text,
                        timestamp: formatTime(new Date(m.timestamp)),
                    }))
                );
                setUpdatedAt(conv.updated_at ?? null); 
            })
            .catch((err) => {
                console.error("Erreur chargement conversation:", err);
                navigate("/chat");
            });
    }, [routeSessionId, token]);

    const addMessage = (sender: Message["sender"], text: string) => {
        setMessages((prev) => [
            ...prev,
            { id: Date.now() + Math.random(), sender, text, timestamp: formatTime(new Date()) },
        ]);
    };

    const addErrorMessage = () => {
        addMessage("bot", "معذرة، صار مشكل في الاتصال بالسيرفر. عاود جرب.");
    };

    // ---- Envoi texte (réutilisable, appelée soit manuellement soit en auto-send) ----
    const sendTextMessage = async (message: string) => {
        if (!message.trim() || isSending) return;

        addMessage("user", message);
        setInput("");
        setIsSending(true);

        const controller = new AbortController();
        abortControllerRef.current = controller;

        const isNewConversation = !sessionId;

        try {
            const res = await fetch(`${API_URL}/chat`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${token}`,
                },
                body: JSON.stringify({ message, session_id: sessionId }),
                signal: controller.signal,
            });

            if (!res.ok) {
                const errData = await res.json().catch(() => null);
                throw new Error(errData?.detail || `Erreur ${res.status}`);
            }

            const data: { reply: string; session_id: string } = await res.json();
            setSessionId(data.session_id);

            if (isNewConversation) {
                navigate(`/chat/${data.session_id}`, { replace: true });
            }

            addMessage("bot", data.reply);
            setUpdatedAt(new Date().toISOString());
            refresh();
        } catch (err) {
            if ((err as Error).name === "AbortError") {
                // annulé volontairement par l'utilisateur, pas d'erreur affichée
            } else {
                addErrorMessage();
                console.error("Chat error:", err);
            }
        } finally {
            setIsSending(false);
            abortControllerRef.current = null;
        }
    };

    const handleSend = () => sendTextMessage(input);

    // ---- Pipeline vocal (enregistrement + WebSocket + lecture audio) ----
    const playNextInQueue = () => {
        if (isPlayingRef.current || audioQueueRef.current.length === 0) return;
        isPlayingRef.current = true;
        const nextBlob = audioQueueRef.current.shift()!;
        const url = URL.createObjectURL(nextBlob);
        const audio = new Audio(url);
        currentAudioRef.current = audio;
        audio.onended = () => {
            URL.revokeObjectURL(url);
            isPlayingRef.current = false;
            currentAudioRef.current = null;
            playNextInQueue();
        };
        audio.play();
    };

    // Traite l'audio enregistré. Deux modes :
    // - transcribe (auto-send = false) : STT seul, le texte est mis dans le champ pour relecture.
    // - full (auto-send = true)        : STT + LLM + TTS, la réponse du bot est jouée en audio.
    const processRecordedAudio = (audioBlob: Blob) => {
        const auto = autoSendRef.current;
        const mode = auto ? "full" : "transcribe";

        setIsTranscribing(true);
        audioQueueRef.current = [];
        isPlayingRef.current = false;

        const wsUrl = `${API_URL.replace(/^http/, "ws")}/voice/ws?session_id=${sessionId ?? ""}&language=arabic&mode=${mode}&token=${encodeURIComponent(token ?? "")}`;
        const ws = new WebSocket(wsUrl);
        ws.binaryType = "arraybuffer";
        wsRef.current = ws;

        ws.onopen = () => {
            audioBlob.arrayBuffer().then((buf) => ws.send(buf));
        };

        ws.onmessage = (event) => {
            if (typeof event.data === "string") {
                const data = JSON.parse(event.data);

                if (data.type === "user_text") {
                    setSessionId(data.session_id);
                    setIsTranscribing(false);

                    if (auto) {
                        // Mode complet : le message est affiché tout de suite, la réponse
                        // (texte + audio) arrivera via "sentence_text"/audio binaire puis "done".
                        addMessage("user", data.text);
                        setIsSending(true);
                    } else {
                        // Mode transcription seule : on remplit le champ pour relecture,
                        // la connexion est déjà fermée côté backend après ce message.
                        setInput(data.text);
                        wsRef.current = null;
                        ws.close();
                    }
                }

                if (data.type === "done") {
                    console.log("Réponse LLM (vocal):", data.full_reply); // <-- ICI, c'est la vraie réponse Gemini
                    addMessage("bot", data.full_reply);
                    setIsSending(false);
                    setUpdatedAt(new Date().toISOString());
                    wsRef.current = null;
                    ws.close();
                    refresh();
                }

                if (data.type === "error") {
                    console.error("Voice pipeline error:", data.detail);
                    addErrorMessage();
                    setIsTranscribing(false);
                    setIsSending(false);
                    wsRef.current = null;
                    ws.close();
                }
            } else {
                // Chunk audio (uniquement en mode "full")
                const chunk = new Blob([event.data], { type: "audio/wav" });
                audioQueueRef.current.push(chunk);
                playNextInQueue();
            }
        };

        ws.onerror = (err) => {
            console.error("WebSocket error:", err);
            setIsTranscribing(false);
            setIsSending(false);
            wsRef.current = null;
        };

        ws.onclose = () => {
            autoSendRef.current = false;
        };
    };

    const startRecording = async () => {
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            streamRef.current = stream;
            audioChunksRef.current = [];

            const mediaRecorder = new MediaRecorder(stream);
            mediaRecorderRef.current = mediaRecorder;

            mediaRecorder.ondataavailable = (e) => {
                if (e.data.size > 0) audioChunksRef.current.push(e.data);
            };

            mediaRecorder.onstop = () => {
                const audioBlob = new Blob(audioChunksRef.current, { type: "audio/webm" });
                streamRef.current?.getTracks().forEach((t) => t.stop());
                processRecordedAudio(audioBlob);
            };

            mediaRecorder.start();
            setIsRecording(true);
        } catch (err) {
            console.error("Microphone access error:", err);
        }
    };

    const stopPipeline = () => {
        if (isRecording) {
            mediaRecorderRef.current?.stop(); // déclenche onstop -> processRecordedAudio
            setIsRecording(false);
            return;
        }

        if (isTranscribing) {
            wsRef.current?.close();
            wsRef.current = null;
            setIsTranscribing(false);
        }

        if (isSending) {
            abortControllerRef.current?.abort();
            wsRef.current?.close();
            wsRef.current = null;
            audioQueueRef.current = [];
            isPlayingRef.current = false;
            if (currentAudioRef.current) {
                currentAudioRef.current.pause();
                currentAudioRef.current.currentTime = 0;
                currentAudioRef.current = null;
            }
            setIsSending(false);
        }
    };

    const handleMicClick = () => {
        if (isRecording || isTranscribing || isSending) {
            stopPipeline();
        } else {
            startRecording();
        }
    };

    // ---- Bouton "envoyer" : gère le cas où l'utilisateur clique pendant l'enregistrement ----
    const handleSendClick = () => {
        if (isRecording) {
            // On arrête l'enregistrement et on bascule en pipeline complet (STT+LLM+TTS)
            // pour que la réponse du bot soit envoyée ET jouée en audio.
            autoSendRef.current = true;
            mediaRecorderRef.current?.stop(); // déclenche onstop -> processRecordedAudio (mode=full)
            setIsRecording(false);
        } else {
            handleSend();
        }
    };

    return {
        messages,
        input,
        setInput,
        isSending,
        isRecording,
        isTranscribing,
        handleSend,
        handleSendClick,
        handleMicClick,
        updatedAt,
    };
}