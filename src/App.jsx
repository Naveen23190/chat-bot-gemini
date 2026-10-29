import { useEffect, useMemo, useRef, useState } from "react";
import {
  ArrowDown, ArrowUp, Bot, Check, ChevronDown, Code2, Copy, FileText,
  History, Lightbulb, Menu, MessageCircle, Moon, MoreHorizontal, Plus,
  Search, Send, Settings2, Sparkles, Sun, Trash2, X, Zap
} from "lucide-react";

const suggestions = [
  { icon: Lightbulb, title: "Get ideas", text: "Brainstorm creative ideas for projects, business or life.", prompt: "Give me 10 creative project ideas for a React developer portfolio." },
  { icon: FileText, title: "Write & edit", text: "Draft emails, essays, code, resumes and more.", prompt: "Help me write a concise, professional email applying for a frontend developer role." },
  { icon: Code2, title: "Solve problems", text: "Get step-by-step help with code and logic.", prompt: "Explain React useEffect with a practical example and common mistakes." },
  { icon: Sparkles, title: "Learn anything", text: "Explore new topics and get simple explanations.", prompt: "Create a 7-day learning plan to improve my JavaScript skills." }
];

const quickActions = [
  { icon: Lightbulb, label: "Explain a concept", prompt: "Explain a technical concept simply, with an example." },
  { icon: Code2, label: "Write a code snippet", prompt: "Write a clean, reusable JavaScript function and explain it." },
  { icon: FileText, label: "Summarize a document", prompt: "Help me summarize a document. Ask me to paste the content first." },
  { icon: History, label: "Plan something", prompt: "Help me create a practical plan. Ask me what I want to achieve." },
  { icon: MessageCircle, label: "Chat about anything", prompt: "Let's chat. Ask me what is on my mind." }
];

const makeId = () => `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
const titleFor = (text) => text.trim().split(/\s+/).slice(0, 5).join(" ") || "New chat";

function readChats() {
  try { return JSON.parse(localStorage.getItem("geminichat-chats") || "[]"); }
  catch { return []; }
}

function formatAnswer(text) {
  // Small safe Markdown-like renderer: escapes HTML first, then supports common formatting.
  const escaped = text.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
  return escaped
    .replace(/```([\s\S]*?)```/g, (_, code) => `<pre><code>${code.trim()}</code></pre>`)
    .replace(/`([^`]+)`/g, "<code>$1</code>")
    .replace(/\*\*(.*?)\*\*/g, "<strong>$1</strong>")
    .replace(/\n/g, "<br />");
}

function App() {
  const [chats, setChats] = useState(readChats);
  const [activeId, setActiveId] = useState(() => readChats()[0]?.id || null);
  const [draft, setDraft] = useState("");
  const [busy, setBusy] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [rightOpen, setRightOpen] = useState(false);
  const [dark, setDark] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [toast, setToast] = useState("");
  const textareaRef = useRef(null);
  const bottomRef = useRef(null);

  const activeChat = chats.find((chat) => chat.id === activeId) || null;
  const messages = activeChat?.messages || [];
  const visibleChats = useMemo(() => chats.filter((chat) => chat.title.toLowerCase().includes(searchTerm.toLowerCase())), [chats, searchTerm]);

  useEffect(() => {
    localStorage.setItem("geminichat-chats", JSON.stringify(chats));
  }, [chats]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [messages.length, busy]);

  useEffect(() => {
    const onKey = (event) => {
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        setSearchTerm("");
        document.getElementById("chat-search")?.focus();
      }
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "n") {
        event.preventDefault();
        newChat();
      }
      if (event.key === "Escape") { setSidebarOpen(false); setRightOpen(false); }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  function notify(message) {
    setToast(message);
    window.setTimeout(() => setToast(""), 2400);
  }

  function newChat() {
    setActiveId(null);
    setDraft("");
    setSidebarOpen(false);
    textareaRef.current?.focus();
  }

  function updateChat(id, updater) {
    setChats((old) => old.map((chat) => chat.id === id ? updater(chat) : chat));
  }

  async function sendMessage(value = draft) {
    const text = value.trim();
    if (!text || busy) return;
    const userMessage = { id: makeId(), role: "user", text, time: Date.now() };
    let chatId = activeId;
    let existing = activeChat;

    if (!chatId || !existing) {
      chatId = makeId();
      existing = { id: chatId, title: titleFor(text), messages: [], updatedAt: Date.now() };
      setChats((old) => [existing, ...old]);
      setActiveId(chatId);
    }
    const previousMessages = existing?.messages || [];
    const updatedMessages = [...previousMessages, userMessage];
    updateChat(chatId, (chat) => ({ ...chat, title: chat.messages.length ? chat.title : titleFor(text), messages: updatedMessages, updatedAt: Date.now() }));
    setDraft("");
    setBusy(true);

    try {
      const history = previousMessages.map((message) => ({
        role: message.role === "assistant" ? "model" : "user",
        text: message.text
      }));
      const response = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: text, history })
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data.error || "Something went wrong. Please try again.");
      const answer = { id: makeId(), role: "assistant", text: data.answer, time: Date.now() };
      updateChat(chatId, (chat) => ({ ...chat, messages: [...chat.messages, answer], updatedAt: Date.now() }));
    } catch (error) {
      const answer = { id: makeId(), role: "assistant", text: `**I couldn't complete that request.**\n\n${error.message}\n\nCheck that the Vercel API function is deployed and that \`GEMINI_API_KEY\` is configured.`, error: true, time: Date.now() };
      updateChat(chatId, (chat) => ({ ...chat, messages: [...chat.messages, answer], updatedAt: Date.now() }));
    } finally {
      setBusy(false);
      textareaRef.current?.focus();
    }
  }

  function deleteChat(id) {
    setChats((old) => old.filter((chat) => chat.id !== id));
    if (activeId === id) setActiveId(null);
    notify("Conversation deleted");
  }

  async function copyText(text) {
    try {
      await navigator.clipboard.writeText(text);
      notify("Copied to clipboard");
    } catch {
      notify("Clipboard access is unavailable in this browser");
    }
  }

  function handleKeyDown(event) {
    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault();
      sendMessage();
    }
  }

  return (
    <div className={`app-shell ${dark ? "theme-dark" : ""}`}>
      {sidebarOpen && <button className="scrim" aria-label="Close navigation" onClick={() => setSidebarOpen(false)} />}
      <aside className={`sidebar ${sidebarOpen ? "sidebar-open" : ""}`}>
        <div className="brand">
          <div className="brand-mark"><Sparkles size={23} fill="currentColor" /></div>
          <div><div className="brand-name">Gemini<span>Chat</span></div><div className="brand-caption">Your AI workspace</div></div>
          <button className="icon-btn sidebar-close" aria-label="Close sidebar" onClick={() => setSidebarOpen(false)}><X size={18} /></button>
        </div>

        <button className="new-chat-btn" onClick={newChat}><Plus size={18} /><span>New chat</span><kbd>Ctrl N</kbd></button>

        <div className="side-section-label">WORKSPACE</div>
        <div className="side-nav">
          <button className="nav-item active" onClick={newChat}><MessageCircle size={18} /> Chat</button>
          <button className="nav-item" onClick={() => document.getElementById("chat-search")?.focus()}><History size={18} /> History</button>
          <button className="nav-item" onClick={() => document.getElementById("suggestions")?.scrollIntoView({ behavior: "smooth" })}><Sparkles size={18} /> Explore prompts</button>
        </div>

        <div className="history-heading"><span>RECENT CHATS</span><span className="history-count">{chats.length}</span></div>
        <label className="search-box">
          <Search size={15} />
          <input id="chat-search" value={searchTerm} onChange={(event) => setSearchTerm(event.target.value)} placeholder="Search conversations" />
          <kbd>⌘K</kbd>
        </label>
        <div className="chat-history">
          {visibleChats.length ? visibleChats.slice(0, 12).map((chat) => (
            <div key={chat.id} className={`history-row ${activeId === chat.id ? "selected" : ""}`}>
              <button className="history-title" onClick={() => { setActiveId(chat.id); setSidebarOpen(false); }}>{chat.title}</button>
              <button className="history-delete" aria-label={`Delete ${chat.title}`} onClick={() => deleteChat(chat.id)}><Trash2 size={14} /></button>
            </div>
          )) : <p className="history-empty">{searchTerm ? "No matching conversations" : "Your conversations will appear here."}</p>}
        </div>

        <div className="sidebar-spacer" />
        <div className="model-card">
          <div className="model-card-icon"><Zap size={18} fill="currentColor" /></div>
          <div className="model-card-title">Powered by Gemini</div>
          <div className="model-card-copy">Helpful answers for coding, writing, learning, and everyday ideas.</div>
          <div className="model-status"><span /> API connection configured on server</div>
        </div>
        <div className="developer-credit"><div className="developer-icon"><Code2 size={18} /></div><div><span>Developed By</span><strong>Naveen</strong></div></div>
      </aside>

      <main className="main-panel">
        <header className="topbar">
          <div className="topbar-left">
            <button className="icon-btn mobile-menu" aria-label="Open navigation" onClick={() => setSidebarOpen(true)}><Menu size={20} /></button>
            <div className="breadcrumb"><span>Workspace</span><span className="crumb-slash">/</span><strong>{activeChat?.title || "New conversation"}</strong></div>
          </div>
          <div className="topbar-actions">
            <div className="model-pill"><span className="status-dot" /><span>Gemini 3.8 Flash</span><ChevronDown size={15} /></div>
            <button className="icon-btn theme-toggle" aria-label="Toggle theme" onClick={() => setDark((value) => !value)}>{dark ? <Sun size={18} /> : <Moon size={18} />}</button>
            <button className="icon-btn settings-btn" aria-label="Show model information" onClick={() => setRightOpen((value) => !value)}><Settings2 size={18} /></button>
          </div>
        </header>

        <div className="conversation-scroll">
          {messages.length === 0 ? (
            <section className="welcome" id="suggestions">
              <div className="welcome-eyebrow"><span className="eyebrow-dot" /> YOUR CREATIVE AI PARTNER</div>
              <h1>Ideas begin with<br /><span>a conversation.</span></h1>
              <p className="welcome-copy">Ask a question, explore an idea, or build something extraordinary.<br className="desktop-break" /> I'm here to help you think, create, and move forward.</p>
              <div className="suggestion-grid">
                {suggestions.map(({ icon: Icon, title, text: description, prompt }) => (
                  <button className="suggestion-card" key={title} onClick={() => { setDraft(prompt); textareaRef.current?.focus(); }}>
                    <div className="suggestion-icon"><Icon size={19} /></div>
                    <div className="suggestion-title">{title}</div>
                    <div className="suggestion-copy">{description}</div>
                    <span className="suggestion-arrow">↗</span>
                  </button>
                ))}
              </div>
              <div className="quick-prompt-row"><span>TRY ASKING</span>{["Explain React hooks", "Plan a project", "Debug my code"].map((prompt) => <button key={prompt} onClick={() => setDraft(prompt)}>{prompt}<ArrowUp size={12} /></button>)}</div>
            </section>
          ) : (
            <section className="messages" aria-live="polite">
              {messages.map((message) => (
                <article className={`message-row ${message.role === "user" ? "user-row" : "assistant-row"}`} key={message.id}>
                  <div className={`avatar ${message.role === "user" ? "user-avatar" : "ai-avatar"}`}>{message.role === "user" ? "N" : <Sparkles size={17} />}</div>
                  <div className="message-content">
                    <div className="message-meta"><strong>{message.role === "user" ? "You" : "GeminiChat"}</strong><span>{new Date(message.time).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</span>{message.error && <span className="error-label">Needs attention</span>}</div>
                    <div className={`message-bubble ${message.error ? "message-error" : ""}`} dangerouslySetInnerHTML={{ __html: formatAnswer(message.text) }} />
                    {message.role === "assistant" && <div className="message-tools"><button onClick={() => copyText(message.text)}><Copy size={13} /> Copy</button></div>}
                  </div>
                </article>
              ))}
              {busy && <div className="message-row assistant-row"><div className="avatar ai-avatar"><Sparkles size={17} /></div><div className="message-content"><div className="message-meta"><strong>GeminiChat</strong><span>Thinking</span></div><div className="typing-bubble"><span /><span /><span /></div></div></div>}
              <div ref={bottomRef} />
            </section>
          )}
        </div>

        <div className="composer-wrap">
          {messages.length > 0 && <div className="composer-context"><span className="context-sparkle"><Sparkles size={13} /></span> Keep the conversation going</div>}
          <div className="composer">
            <textarea ref={textareaRef} value={draft} onChange={(event) => setDraft(event.target.value)} onKeyDown={handleKeyDown} placeholder="Message GeminiChat..." rows={1} aria-label="Message GeminiChat" />
            <div className="composer-bottom"><span className="composer-hint"><kbd>Enter</kbd> to send · <kbd>Shift + Enter</kbd> for a new line</span><button className="send-btn" aria-label="Send message" disabled={!draft.trim() || busy} onClick={() => sendMessage()}>{busy ? <span className="send-spinner" /> : <Send size={17} />}</button></div>
          </div>
          <div className="composer-disclaimer">AI can make mistakes. Check important information. <span>·</span> <strong>Developed By Naveen</strong></div>
        </div>
      </main>

      <aside className={`insights-panel ${rightOpen ? "insights-open" : ""}`}>
        <div className="insights-header"><div><span className="side-section-label">ASSISTANT DETAILS</span><h2>At a glance</h2></div><button className="icon-btn insights-close" aria-label="Close details" onClick={() => setRightOpen(false)}><X size={18} /></button></div>
        <div className="model-select-card"><div className="model-select-top"><div className="gemini-symbol"><Sparkles size={19} fill="currentColor" /></div><div><strong>Gemini 3.8 Flash</strong><span>Generative AI assistant</span></div><span className="live-badge"><i /> Ready</span></div><div className="model-divider" /><div className="model-select-bottom"><span>Configured model</span><strong>GEMINI_MODEL</strong><p>Set the exact supported model ID in Vercel environment variables.</p></div></div>
        <div className="insight-card"><div className="insight-card-heading"><div className="insight-icon purple"><Sparkles size={17} /></div><h3>Built for your workflow</h3></div><ul className="capability-list"><li><Check size={15} /> Coding & problem solving</li><li><Check size={15} /> Writing & brainstorming</li><li><Check size={15} /> Learning & explanations</li><li><Check size={15} /> Multi-turn conversations</li></ul></div>
        <div className="insight-card quick-actions-card"><div className="insight-card-heading"><div className="insight-icon blue"><Zap size={17} /></div><h3>Quick actions</h3></div><div className="quick-actions">{quickActions.map(({ icon: Icon, label, prompt }) => <button key={label} onClick={() => { setDraft(prompt); textareaRef.current?.focus(); }}><span><Icon size={16} /></span>{label}<ArrowUp size={13} /></button>)}</div></div>
        <div className="developer-card"><div className="developer-orbit orbit-one" /><div className="developer-orbit orbit-two" /><div className="developer-badge"><Code2 size={20} /></div><span className="developer-kicker">DESIGNED & DEVELOPED BY</span><strong>Naveen</strong><p>Building thoughtful digital experiences with AI.</p><div className="developer-card-footer"><span /> FRONTEND · REACT · AI <span /></div></div>
        <div className="panel-footer"><span>GEMINICHAT</span><span>v1.0.0</span></div>
      </aside>

      {rightOpen && <button className="right-scrim" aria-label="Close details panel" onClick={() => setRightOpen(false)} />}
      {toast && <div className="toast"><Check size={15} /> {toast}</div>}
    </div>
  );
}

export default App;