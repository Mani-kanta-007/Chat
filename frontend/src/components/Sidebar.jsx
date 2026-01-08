import { MessageSquarePlus, Trash2, MessageSquare } from 'lucide-react';
import { deleteConversation } from '../services/api';
import './Sidebar.css';

function Sidebar({ conversations, currentConversation, onNewChat, onSelectConversation, onDeleteConversation }) {
    const handleDelete = async (e, conversationId) => {
        e.stopPropagation();
        if (window.confirm('Are you sure you want to delete this conversation?')) {
            try {
                await deleteConversation(conversationId);
                onDeleteConversation(conversationId);
            } catch (error) {
                console.error('Error deleting conversation:', error);
            }
        }
    };

    const formatDate = (dateString) => {
        const date = new Date(dateString);
        const now = new Date();
        const diffInHours = (now - date) / (1000 * 60 * 60);

        if (diffInHours < 24) {
            return 'Today';
        } else if (diffInHours < 48) {
            return 'Yesterday';
        } else if (diffInHours < 168) {
            return `${Math.floor(diffInHours / 24)} days ago`;
        } else {
            return date.toLocaleDateString();
        }
    };

    return (
        <div className="sidebar glass">
            <div className="sidebar-header">
                <h1 className="sidebar-title gradient-text">MyChatGPT</h1>
                <button className="btn btn-primary new-chat-btn" onClick={onNewChat}>
                    <MessageSquarePlus size={18} />
                    New Chat
                </button>
            </div>

            <div className="conversations-list">
                {conversations.length === 0 ? (
                    <div className="empty-state">
                        <MessageSquare size={48} opacity={0.3} />
                        <p>No conversations yet</p>
                        <p className="text-secondary">Start a new chat to begin</p>
                    </div>
                ) : (
                    conversations.map((conv) => (
                        <div
                            key={conv.id}
                            className={`conversation-item glass-hover ${currentConversation?.id === conv.id ? 'active' : ''
                                }`}
                            onClick={() => onSelectConversation(conv)}
                        >
                            <div className="conversation-content">
                                <div className="conversation-title">{conv.title}</div>
                                <div className="conversation-date">{formatDate(conv.updated_at)}</div>
                            </div>
                            <button
                                className="delete-btn btn-ghost"
                                onClick={(e) => handleDelete(e, conv.id)}
                                title="Delete conversation"
                            >
                                <Trash2 size={16} />
                            </button>
                        </div>
                    ))
                )}
            </div>

            <div className="sidebar-footer">
                <div className="footer-text">
                    Built with ❤️ using Ollama
                </div>
            </div>
        </div>
    );
}

export default Sidebar;
