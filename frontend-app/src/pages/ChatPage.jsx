import { useState, useEffect, useRef } from "react";
import { getConversations, getMessages, sendMessage } from "../api/messageApi";
import { Send, User } from "lucide-react";

function ChatPage() {
  const [conversations, setConversations] = useState([]);
  const [activePartner, setActivePartner] = useState(null);
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState("");
  const [sendError, setSendError] = useState("");
  const [loading, setLoading] = useState(true);
  
  const user = JSON.parse(localStorage.getItem("user") || "{}");
  const messagesEndRef = useRef(null);

  // Load conversations on mount
  useEffect(() => {
    loadConversations();
  }, []);

  // Polling for new messages in active chat
  useEffect(() => {
    let interval;
    if (activePartner) {
      loadMessages(activePartner.id); // Initial load
      interval = setInterval(() => loadMessages(activePartner.id), 5000); // Poll every 5s
    }
    return () => clearInterval(interval);
  }, [activePartner]);

  // Auto-scroll to bottom of chat
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const loadConversations = async () => {
    try {
      const data = await getConversations();
      setConversations(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const loadMessages = async (partnerId) => {
    try {
      const data = await getMessages(partnerId);
      setMessages(data);
    } catch (err) {
      console.error(err);
    }
  };

  const handleSend = async (e) => {
    e.preventDefault();
    if (!newMessage.trim() || !activePartner) return;
    setSendError("");

    // Optimistic UI update
    const tempMsg = {
      id: Date.now().toString(),
      content: newMessage,
      senderId: user._id,
      createdAt: new Date().toISOString(),
    };
    setMessages((prev) => [...prev, tempMsg]);
    setNewMessage("");

    try {
      await sendMessage({ receiverId: activePartner.id, content: tempMsg.content });
      loadConversations(); // Update latest message in sidebar
    } catch (err) {
      // Remove the optimistic message since it was blocked
      setMessages((prev) => prev.filter((m) => m.id !== tempMsg.id));
      setSendError(err.message || "Message could not be sent.");
      console.error(err);
    }
  };

  if (loading) {
    return <div className="text-center p-10 text-stone-500">Loading messages...</div>;
  }

  return (
    <div className="max-w-6xl mx-auto bg-white rounded-xl shadow-sm border border-stone-200 overflow-hidden h-[calc(100vh-140px)] flex">
      {/* Sidebar: Conversations */}
      <div className="w-1/3 border-r border-stone-200 flex flex-col bg-stone-50">
        <div className="p-4 border-b border-stone-200 bg-white">
          <h2 className="text-lg font-bold text-agri-900">Messages</h2>
        </div>
        <div className="flex-1 overflow-y-auto">
          {conversations.length === 0 ? (
            <p className="p-4 text-center text-stone-500 text-sm">No conversations yet.</p>
          ) : (
            conversations.map((conv) => (
              <div
                key={conv.partner.id}
                onClick={() => {
                  setActivePartner(conv.partner);
                  setSendError("");
                }}
                className={`p-4 border-b border-stone-100 cursor-pointer transition-colors ${
                  activePartner?.id === conv.partner.id ? "bg-agri-50 border-l-4 border-l-agri-600" : "hover:bg-stone-100"
                }`}
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-agri-200 text-agri-700 flex items-center justify-center shrink-0">
                    <User className="w-5 h-5" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex justify-between items-baseline mb-1">
                      <h3 className="font-semibold text-stone-800 truncate">{conv.partner.name}</h3>
                      <span className="text-xs text-stone-400">
                        {new Date(conv.lastMessage.createdAt).toLocaleDateString()}
                      </span>
                    </div>
                    <p className="text-sm text-stone-500 truncate">{conv.lastMessage.content}</p>
                  </div>
                  {conv.unreadCount > 0 && (
                    <div className="w-5 h-5 bg-agri-600 text-white text-xs font-bold flex items-center justify-center rounded-full">
                      {conv.unreadCount}
                    </div>
                  )}
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Main Chat Area */}
      <div className="flex-1 flex flex-col bg-white">
        {activePartner ? (
          <>
            {/* Chat Header */}
            <div className="p-4 border-b border-stone-200 flex items-center gap-3 bg-white">
              <div className="w-10 h-10 rounded-full bg-agri-200 text-agri-700 flex items-center justify-center">
                <User className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-semibold text-stone-800">{activePartner.name}</h3>
                <p className="text-xs text-stone-500 capitalize">{activePartner.role}</p>
              </div>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-stone-50/50">
              {messages.map((msg) => {
                const isMine = msg.senderId === user._id;
                return (
                  <div key={msg.id} className={`flex ${isMine ? "justify-end" : "justify-start"}`}>
                    <div
                      className={`max-w-[70%] px-4 py-2 rounded-2xl ${
                        isMine
                          ? "bg-agri-600 text-white rounded-br-none"
                          : "bg-white border border-stone-200 text-stone-800 rounded-bl-none shadow-sm"
                      }`}
                    >
                      <p className="text-sm whitespace-pre-wrap">{msg.content}</p>
                      <p className={`text-[10px] mt-1 text-right ${isMine ? "text-agri-200" : "text-stone-400"}`}>
                        {new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </p>
                    </div>
                  </div>
                );
              })}
              <div ref={messagesEndRef} />
            </div>

            {/* Input Area with Error Banner */}
            <div className="p-4 border-t border-stone-200 bg-white">
              {sendError && (
                <div className="mb-2 px-3 py-2 bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg">
                  ⚠️ {sendError}
                </div>
              )}
              <form onSubmit={handleSend} className="flex gap-2">
                <input
                  type="text"
                  value={newMessage}
                  onChange={(e) => setNewMessage(e.target.value)}
                  placeholder="Type a message..."
                  className="flex-1 px-4 py-2 border border-stone-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-agri-500 focus:border-transparent"
                />
                <button
                  type="submit"
                  disabled={!newMessage.trim()}
                  className="px-4 py-2 bg-agri-600 text-white rounded-lg hover:bg-agri-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  <Send className="w-5 h-5" />
                </button>
              </form>
            </div>
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center flex-col text-stone-400">
            <div className="w-16 h-16 mb-4 rounded-full bg-stone-100 flex items-center justify-center">
              <User className="w-8 h-8" />
            </div>
            <p>Select a conversation to start chatting</p>
          </div>
        )}
      </div>
    </div>
  );
}

export default ChatPage;