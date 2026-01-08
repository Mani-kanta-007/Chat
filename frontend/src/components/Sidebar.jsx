import { useState } from 'react';
import { MessageSquarePlus, Trash2, MessageSquare, Menu, X, Edit2, Check } from 'lucide-react';
import { deleteConversation, updateConversation } from '../services/api';
import './Sidebar.css';

function Sidebar({ conversations, currentConversation, onNewChat, onSelectConversation, onDeleteConversation, isCollapsed, onToggle, onUpdateConversations }) {
    const [editingId, setEditingId] = useState(null);
    const [editTitle, setEditTitle] = useState('');

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

    const handleEditStart = (e, conv) => {
        e.stopPropagation();
        setEditingId(conv.id);
        setEditTitle(conv.title);
    };

    const handleEditSave = async (e, id) => {
        e.stopPropagation();
        if (editTitle.trim()) {
            try {
                await updateConversation(id, editTitle);
                onUpdateConversations();
            } catch (error) {
                console.error('Error updating conversation:', error);
            }
        }
        setEditingId(null);
    };

    const handleEditKeyDown = (e, id) => {
        if (e.key === 'Enter') {
            e.preventDefault();
            handleEditSave(e, id);
        }
        if (e.key === 'Escape') {
            e.preventDefault();
            setEditingId(null);
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
        <div className={`sidebar glass ${isCollapsed ? 'collapsed' : ''}`}>
            {/* Header ... */}
            <div className="sidebar-header">
                {!isCollapsed && <h1 className="sidebar-title gradient-text">MyChatGPT</h1>}
                <button
                    className="sidebar-toggle-btn btn-ghost"
                    onClick={onToggle}
                    title={isCollapsed ? "Expand sidebar" : "Collapse sidebar"}
                >
                    {isCollapsed ? <Menu size={20} /> : <X size={20} />}
                </button>
            </div>

            {!isCollapsed && (
                <button className="btn btn-primary new-chat-btn" onClick={onNewChat}>
                    <MessageSquarePlus size={18} />
                    New Chat
                </button>
            )}

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
                                {editingId === conv.id ? (
                                    <input
                                        type="text"
                                        className="sidebar-edit-input"
                                        value={editTitle}
                                        onChange={(e) => setEditTitle(e.target.value)}
                                        onClick={(e) => e.stopPropagation()}
                                        onKeyDown={(e) => handleEditKeyDown(e, conv.id)}
                                        onBlur={(e) => handleEditSave(e, conv.id)}
                                        autoFocus
                                    />
                                ) : (
                                    <div className="conversation-title">{conv.title}</div>
                                )}
                                <div className="conversation-date">{formatDate(conv.updated_at)}</div>
                            </div>

                            {editingId === conv.id ? (
                                <button
                                    className="action-btn save-btn btn-ghost"
                                    onClick={(e) => handleEditSave(e, conv.id)}
                                    title="Save title"
                                >
                                    <Check size={16} className="text-green" />
                                </button>
                            ) : (
                                <div className="conversation-actions">
                                    <button
                                        className="action-btn edit-btn btn-ghost"
                                        onClick={(e) => handleEditStart(e, conv)}
                                        title="Rename conversation"
                                    >
                                        <Edit2 size={16} />
                                    </button>
                                    <button
                                        className="action-btn delete-btn btn-ghost"
                                        onClick={(e) => handleDelete(e, conv.id)}
                                        title="Delete conversation"
                                    >
                                        <Trash2 size={16} />
                                    </button>
                                </div>
                            )}
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
