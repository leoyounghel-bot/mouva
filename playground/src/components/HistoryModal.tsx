import './HistoryModal.css';

export interface Session {
  id: string;
  title: string;
  createdAt: Date;
  updatedAt: Date;
  messages: Array<{ role: 'user' | 'assistant'; content: string }>;
  templateSnapshot?: string; // JSON stringified template
}

interface HistoryModalProps {
  isOpen: boolean;
  sessions: Session[];
  currentSessionId?: string;
  onSelect: (session: Session) => void;
  onDelete: (sessionId: string) => void;
  onClose: () => void;
}

export default function HistoryModal({
  isOpen,
  sessions,
  currentSessionId,
  onSelect,
  onDelete,
  onClose,
}: HistoryModalProps) {
  if (!isOpen) return null;

  const formatDate = (date: Date) => {
    const now = new Date();
    const d = new Date(date);
    const diffMs = now.getTime() - d.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    return d.toLocaleDateString();
  };

  const getSessionTitle = (session: Session) => {
    if (session.title) return session.title;
    // Generate title from first user message
    const firstUserMsg = session.messages.find(m => m.role === 'user');
    if (firstUserMsg) {
      const content = firstUserMsg.content;
      return content.length > 40 ? content.substring(0, 40) + '...' : content;
    }
    return 'Untitled Session';
  };

  return (
    <div className="history-modal-overlay" onClick={onClose}>
      <div className="history-modal" onClick={e => e.stopPropagation()}>
        <div className="history-modal-header">
          <h3>Chat History</h3>
          <button className="history-modal-close" onClick={onClose}>
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="history-modal-content">
          {sessions.length === 0 ? (
            <div className="history-empty">
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1} stroke="currentColor" className="w-12 h-12 text-gray-300 mb-3">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
              </svg>
              <p className="text-gray-400">No chat history yet</p>
              <p className="text-xs text-gray-300 mt-1">Start a conversation to see it here</p>
            </div>
          ) : (
            <ul className="history-list">
              {sessions.map(session => (
                <li
                  key={session.id}
                  className={`history-item ${currentSessionId === session.id ? 'active' : ''}`}
                  onClick={() => onSelect(session)}
                >
                  <div className="history-item-content">
                    <div className="history-item-title">{getSessionTitle(session)}</div>
                    <div className="history-item-meta">
                      <span>{session.messages.length} messages</span>
                      <span>·</span>
                      <span>{formatDate(session.updatedAt)}</span>
                    </div>
                  </div>
                  <button
                    className="history-item-delete"
                    onClick={e => {
                      e.stopPropagation();
                      onDelete(session.id);
                    }}
                    title="Delete"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-4 h-4">
                      <path strokeLinecap="round" strokeLinejoin="round" d="m14.74 9-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 0 1-2.244 2.077H8.084a2.25 2.25 0 0 1-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 0 0-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 0 1 3.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 0 0-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 0 0-7.5 0" />
                    </svg>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}
