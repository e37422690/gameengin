import React, { useEffect, useRef, useState } from 'react';
import { ChatMessage } from '../game/types';

interface InGameChatBoxProps {
  messages: ChatMessage[];
  chatOpen: boolean;
  onSetChatOpen: (open: boolean) => void;
  onSendMessage: (text: string) => void;
}

export const InGameChatBox: React.FC<InGameChatBoxProps> = ({
  messages,
  chatOpen,
  onSetChatOpen,
  onSendMessage,
}) => {
  const [draft, setDraft] = useState('');
  const inputRef = useRef<HTMLInputElement | null>(null);
  const listRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (chatOpen) {
      window.setTimeout(() => {
        inputRef.current?.focus();
      }, 20);
    } else {
      inputRef.current?.blur();
    }
  }, [chatOpen]);

  useEffect(() => {
    if (listRef.current) {
      listRef.current.scrollTop = listRef.current.scrollHeight;
    }
  }, [messages]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = draft.trim();
    if (trimmed) {
      onSendMessage(trimmed);
      setDraft('');
    }
    onSetChatOpen(false);
  };

  const recentMessages = messages.slice(-6);

  return (
    <div
      data-testid="in-game-chat"
      className="fixed left-4 bottom-4 z-20 w-80 md:w-96 pointer-events-auto"
    >
      <div className="hud-panel rounded-xl p-3 flex flex-col gap-2">
        <div className="flex items-center justify-between border-b border-white/10 pb-1.5">
          <span className="text-xs font-bold text-slate-200">
            Oda Sohbeti <span className="text-sky-400 font-mono-tabular">[T]</span>
          </span>
          <button
            type="button"
            onClick={() => onSetChatOpen(!chatOpen)}
            className="text-xs font-semibold text-sky-300 hover:text-sky-200 whitespace-nowrap shrink-0"
          >
            {chatOpen ? 'Kapat [Esc]' : 'Yaz [T]'}
          </button>
        </div>

        {/* Message List */}
        <div
          ref={listRef}
          className="max-h-28 overflow-y-auto space-y-1 text-xs pr-1"
        >
          {recentMessages.map((m) => (
            <div key={m.id} className="leading-snug break-words">
              <span
                className="font-bold mr-1.5"
                style={{ color: m.isSystem ? '#38bdf8' : m.senderColor }}
              >
                {m.senderName}:
              </span>
              <span className="text-slate-200">{m.text}</span>
            </div>
          ))}
        </div>

        {/* Chat Input Form */}
        {chatOpen ? (
          <form onSubmit={handleSubmit} className="flex items-center gap-2 pt-1">
            <label htmlFor="chat-message-input" className="sr-only">
              Sohbet Mesajı
            </label>
            <input
              id="chat-message-input"
              ref={inputRef}
              type="text"
              value={draft}
              maxLength={160}
              onChange={(e) => setDraft(e.target.value)}
              onKeyDown={(e) => {
                e.stopPropagation();
                if (e.key === 'Escape') {
                  e.preventDefault();
                  onSetChatOpen(false);
                }
              }}
              placeholder="Mesajını yaz ve Enter'a bas..."
              className="flex-1 px-2.5 py-1.5 rounded-lg bg-slate-950/90 border border-sky-400/60 text-xs text-white focus:outline-none"
            />
            <button
              type="submit"
              className="px-3 py-1.5 rounded-lg bg-sky-500 hover:bg-sky-400 text-slate-950 text-xs font-bold whitespace-nowrap shrink-0"
            >
              Gönder
            </button>
          </form>
        ) : (
          <button
            type="button"
            onClick={() => onSetChatOpen(true)}
            className="text-left text-[11px] text-slate-400 hover:text-slate-200 py-0.5 truncate"
          >
            Sohbet etmek için T harfine bas veya buraya tıkla...
          </button>
        )}
      </div>
    </div>
  );
};
