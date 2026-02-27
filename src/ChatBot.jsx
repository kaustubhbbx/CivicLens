import { useState, useRef, useEffect } from "react";

const SYSTEM_PROMPT = `You are CivicAssist, an AI-powered civic complaint assistant for Indian cities. You help citizens report issues like potholes, water supply problems, electricity outages, drainage overflow, sanitation issues, and traffic safety concerns.

Your role:
- Help citizens describe and categorize their civic complaints
- Ask relevant follow-up questions about location, severity, and urgency
- Provide information about which department (PWD, Water Board, Electricity Board, Sanitation Dept, Traffic Police, Drainage Cell) will handle their issue
- Be empathetic, professional, and helpful
- Respond in clear, helpful English
- Keep responses concise (2-3 sentences max)
- If a user reports an emergency, mark it as urgent and guide them accordingly
- If the user shares a photo/image, acknowledge that you received the photo and ask relevant follow-up questions about the issue shown

Categories you handle:
1. Roads & Potholes → PWD
2. Sanitation → Sanitation Dept
3. Electricity → Electricity Board
4. Water → Water Board
5. Drainage → Drainage Cell
6. Safety → Traffic Police

Start by greeting the user and asking what civic issue they'd like to report.`;

const INITIAL_MESSAGES = [
    {
        role: "assistant",
        content: "Hello! 🙏 I am CivicAssist. I can help you report any civic issues in your neighborhood. What would you like to report?",
    },
];

export default function ChatBot({ apiKey }) {
    const [isOpen, setIsOpen] = useState(false);
    const [isMinimized, setIsMinimized] = useState(false);
    const [messages, setMessages] = useState(INITIAL_MESSAGES);
    const [input, setInput] = useState("");
    const [isLoading, setIsLoading] = useState(false);
    const [activeStep, setActiveStep] = useState(0);
    const [pendingImage, setPendingImage] = useState(null); // { file, preview }
    const [showAttachMenu, setShowAttachMenu] = useState(false);
    const messagesEndRef = useRef(null);
    const inputRef = useRef(null);
    const fileInputRef = useRef(null);
    const cameraInputRef = useRef(null);

    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }, [messages]);

    useEffect(() => {
        if (isOpen && !isMinimized) {
            inputRef.current?.focus();
        }
    }, [isOpen, isMinimized]);

    // Cleanup preview URLs on unmount
    useEffect(() => {
        return () => {
            if (pendingImage?.preview) {
                URL.revokeObjectURL(pendingImage.preview);
            }
        };
    }, [pendingImage]);

    function handleFileSelect(e) {
        const file = e.target.files?.[0];
        if (!file) return;

        // Validate file type
        if (!file.type.startsWith("image/")) {
            alert("Please upload image files only (JPG, PNG, etc.)");
            return;
        }

        // Validate file size (max 10MB)
        if (file.size > 10 * 1024 * 1024) {
            alert("Image must be smaller than 10MB");
            return;
        }

        const preview = URL.createObjectURL(file);
        setPendingImage({ file, preview });
        setShowAttachMenu(false);
        inputRef.current?.focus();
    }

    function removePendingImage() {
        if (pendingImage?.preview) {
            URL.revokeObjectURL(pendingImage.preview);
        }
        setPendingImage(null);
    }

    function convertToBase64(file) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = () => resolve(reader.result);
            reader.onerror = reject;
            reader.readAsDataURL(file);
        });
    }

    async function sendMessage(text) {
        const hasText = text.trim().length > 0;
        const hasImage = pendingImage !== null;

        if (!hasText && !hasImage) return;

        // Build the user message for display
        const userMessage = {
            role: "user",
            content: hasText ? text.trim() : "📸 Photo sent",
            image: hasImage ? pendingImage.preview : null,
        };

        const updatedMessages = [...messages, userMessage];
        setMessages(updatedMessages);
        setInput("");
        setIsLoading(true);

        // Clear pending image (don't revoke URL since it's now in a message)
        const imageFile = hasImage ? pendingImage.file : null;
        setPendingImage(null);

        // Update step indicator
        const msgCount = updatedMessages.filter(m => m.role === "user").length;
        if (msgCount >= 3) setActiveStep(2);
        else if (msgCount >= 2) setActiveStep(1);
        else setActiveStep(0);

        try {
            // Build API messages
            const apiMessages = [{ role: "system", content: SYSTEM_PROMPT }];

            for (const m of updatedMessages) {
                if (m.role === "assistant") {
                    apiMessages.push({ role: "assistant", content: m.content });
                } else if (m.role === "user") {
                    if (m.image && m === userMessage && imageFile) {
                        // For the current message with image, send as multimodal
                        const base64 = await convertToBase64(imageFile);
                        const contentParts = [
                            {
                                type: "image_url",
                                image_url: { url: base64 },
                            },
                        ];
                        if (hasText) {
                            contentParts.unshift({ type: "text", text: text.trim() });
                        } else {
                            contentParts.unshift({
                                type: "text",
                                text: "I have sent this photo. Please tell me about the civic issue visible in it.",
                            });
                        }
                        apiMessages.push({ role: "user", content: contentParts });
                    } else {
                        // Text-only message or previously sent image (skip image for old messages to save tokens)
                        const msgText = m.image
                            ? `[Photo attached] ${m.content}`
                            : m.content;
                        apiMessages.push({ role: "user", content: msgText });
                    }
                }
            }

            // Use vision model when image is present
            const model = imageFile
                ? "llama-3.2-90b-vision-preview"
                : "llama-3.3-70b-versatile";

            const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${apiKey}`,
                },
                body: JSON.stringify({
                    model,
                    messages: apiMessages,
                    temperature: 0.7,
                    max_tokens: 300,
                }),
            });

            if (!response.ok) {
                const errBody = await response.text();
                console.error("API response:", response.status, errBody);
                throw new Error(`API Error: ${response.status}`);
            }

            const data = await response.json();
            const assistantMessage = {
                role: "assistant",
                content:
                    data.choices[0]?.message?.content ||
                    "Maaf kijiye, kuch gadbad ho gayi. Kripya dobara try karein.",
            };

            setMessages(prev => [...prev, assistantMessage]);
        } catch (error) {
            console.error("Chat error:", error);
            setMessages(prev => [
                ...prev,
                {
                    role: "assistant",
                    content:
                        "⚠️ Connection issues. Please try again later.",
                },
            ]);
        } finally {
            setIsLoading(false);
        }
    }

    function handleQuickAction(action) {
        if (action === "photo") {
            // Open camera directly
            if (cameraInputRef.current) {
                cameraInputRef.current.click();
            }
            return;
        }
        if (action === "pin") {
            // Try to get actual location
            if (navigator.geolocation) {
                navigator.geolocation.getCurrentPosition(
                    pos => {
                        sendMessage(
                            `📍 My location: ${pos.coords.latitude.toFixed(5)}, ${pos.coords.longitude.toFixed(5)}`
                        );
                    },
                    () => {
                        sendMessage("📍 Location access denied, please provide your address");
                    }
                );
                return;
            }
            sendMessage("📍 Mera current location set karo");
            return;
        }
        const actionMessages = {
            urgent: "🚨 This is an URGENT / EMERGENCY situation!",
        };
        sendMessage(actionMessages[action]);
    }

    function handleKeyDown(e) {
        if (e.key === "Enter" && !e.shiftKey) {
            e.preventDefault();
            sendMessage(input);
        }
    }

    // Floating trigger button
    if (!isOpen) {
        return (
            <button className="chat-trigger" onClick={() => setIsOpen(true)}>
                <div className="chat-trigger-icon">
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
                    </svg>
                </div>
                <div className="chat-trigger-pulse" />
            </button>
        );
    }

    // Minimized state
    if (isMinimized) {
        return (
            <div className="chat-minimized" onClick={() => setIsMinimized(false)}>
                <div className="chat-minimized-avatar">
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                        <circle cx="12" cy="12" r="10" /><path d="M12 16v-4" /><path d="M12 8h.01" />
                    </svg>
                </div>
                <span className="chat-minimized-text">CivicAssist</span>
                <span className="chat-minimized-dot" />
            </div>
        );
    }

    return (
        <div className="chatbot-panel">
            {/* Hidden file inputs */}
            <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                style={{ display: "none" }}
                onChange={handleFileSelect}
            />
            <input
                ref={cameraInputRef}
                type="file"
                accept="image/*"
                capture="environment"
                style={{ display: "none" }}
                onChange={handleFileSelect}
            />

            {/* Header */}
            <div className="chat-header">
                <div className="chat-header-left">
                    <div className="chat-header-avatar">
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                            <circle cx="12" cy="12" r="10" /><path d="M12 16v-4" /><path d="M12 8h.01" />
                        </svg>
                    </div>
                    <div className="chat-header-info">
                        <div className="chat-header-name">CivicAssist</div>
                        <div className="chat-header-status">
                            <span className="chat-online-dot" />
                            Online | AI Specialist
                        </div>
                    </div>
                </div>
                <div className="chat-header-actions">
                    <button className="chat-header-btn" onClick={() => setIsMinimized(true)} title="Minimize">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="5" y1="12" x2="19" y2="12" /></svg>
                    </button>
                    <button className="chat-header-btn" onClick={() => setIsOpen(false)} title="Close">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></svg>
                    </button>
                </div>
            </div>

            {/* Step Indicators */}
            <div className="chat-steps">
                {["CATEGORIZING", "LOCATING", "DISPATCHING"].map((step, i) => (
                    <div key={step} className={`chat-step ${i <= activeStep ? "active" : ""}`}>
                        <span className="chat-step-dot" />
                        {step}
                    </div>
                ))}
            </div>

            {/* Messages */}
            <div className="chat-messages">
                {messages.map((msg, i) => (
                    <div key={i} className={`chat-message ${msg.role}`}>
                        {msg.role === "assistant" && (
                            <div className="chat-msg-avatar bot">
                                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                                    <circle cx="12" cy="12" r="10" /><path d="M12 16v-4" /><path d="M12 8h.01" />
                                </svg>
                            </div>
                        )}
                        <div className={`chat-bubble ${msg.role}`}>
                            {msg.image && (
                                <div className="chat-image-container">
                                    <img
                                        src={msg.image}
                                        alt="Attached photo"
                                        className="chat-image"
                                        onClick={() => window.open(msg.image, "_blank")}
                                    />
                                </div>
                            )}
                            {msg.content}
                        </div>
                        {msg.role === "user" && (
                            <div className="chat-msg-avatar user">
                                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                    <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" /><circle cx="12" cy="7" r="4" />
                                </svg>
                            </div>
                        )}
                    </div>
                ))}
                {isLoading && (
                    <div className="chat-message assistant">
                        <div className="chat-msg-avatar bot">
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                                <circle cx="12" cy="12" r="10" /><path d="M12 16v-4" /><path d="M12 8h.01" />
                            </svg>
                        </div>
                        <div className="chat-bubble assistant">
                            <div className="chat-typing">
                                <span /><span /><span />
                            </div>
                        </div>
                    </div>
                )}
                <div ref={messagesEndRef} />
            </div>

            {/* Pending Image Preview */}
            {pendingImage && (
                <div className="chat-image-preview">
                    <img src={pendingImage.preview} alt="Preview" className="chat-preview-img" />
                    <div className="chat-preview-info">
                        <span className="chat-preview-label">📸 Photo attached</span>
                        <button className="chat-preview-remove" onClick={removePendingImage} title="Remove">
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                                <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
                            </svg>
                        </button>
                    </div>
                </div>
            )}

            {/* Quick Actions */}
            <div className="chat-quick-actions">
                <button className="chat-quick-btn" onClick={() => handleQuickAction("urgent")}>
                    <span>🚨</span> Urgent
                </button>
                <button className="chat-quick-btn" onClick={() => handleQuickAction("photo")}>
                    <span>📷</span> Take Photo
                </button>
                <button className="chat-quick-btn" onClick={() => handleQuickAction("pin")}>
                    <span>📍</span> Set Location
                </button>
            </div>

            {/* Input */}
            <div className="chat-input-area">
                {/* Attach menu */}
                <div className="chat-attach-wrapper">
                    <button
                        className="chat-attach-btn"
                        onClick={() => setShowAttachMenu(!showAttachMenu)}
                        title="Attach file"
                    >
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M21.44 11.05l-9.19 9.19a6 6 0 0 1-8.49-8.49l9.19-9.19a4 4 0 0 1 5.66 5.66l-9.2 9.19a2 2 0 0 1-2.83-2.83l8.49-8.48" />
                        </svg>
                    </button>
                    {showAttachMenu && (
                        <div className="chat-attach-menu">
                            <button
                                className="chat-attach-option"
                                onClick={() => {
                                    setShowAttachMenu(false);
                                    cameraInputRef.current?.click();
                                }}
                            >
                                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                    <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z" />
                                    <circle cx="12" cy="13" r="4" />
                                </svg>
                                <span>Camera</span>
                            </button>
                            <button
                                className="chat-attach-option"
                                onClick={() => {
                                    setShowAttachMenu(false);
                                    fileInputRef.current?.click();
                                }}
                            >
                                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                    <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
                                    <circle cx="8.5" cy="8.5" r="1.5" />
                                    <polyline points="21 15 16 10 5 21" />
                                </svg>
                                <span>Gallery</span>
                            </button>
                        </div>
                    )}
                </div>
                <input
                    ref={inputRef}
                    type="text"
                    placeholder={pendingImage ? "Write a message with the photo..." : "Write your message..."}
                    value={input}
                    onChange={e => setInput(e.target.value)}
                    onKeyDown={handleKeyDown}
                    disabled={isLoading}
                />
                <button
                    className={`chat-send-btn ${pendingImage ? "has-image" : ""}`}
                    onClick={() => sendMessage(input)}
                    disabled={(!input.trim() && !pendingImage) || isLoading}
                >
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <line x1="22" y1="2" x2="11" y2="13" /><polygon points="22 2 15 22 11 13 2 9 22 2" />
                    </svg>
                </button>
            </div>

            {/* Footer */}
            <div className="chat-footer">
                POWERED BY CIVICLENS AI &nbsp;·&nbsp; VERSION 2.4.0-STABLE
            </div>
        </div>
    );
}
