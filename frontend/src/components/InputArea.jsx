import { useState } from 'react';
import { Send, FileText, Globe } from 'lucide-react';
import './InputArea.css';

function InputArea({ onSendMessage, disabled, useRag, useWebSearch, onToggleRag, onToggleWebSearch }) {
    const [message, setMessage] = useState('');

    const handleSubmit = (e) => {
        e.preventDefault();
        if (message.trim() && !disabled) {
            onSendMessage(message);
            setMessage('');
        }
    };

    const handleKeyDown = (e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            handleSubmit(e);
        }
    };

    return (
        <form className="input-area" onSubmit={handleSubmit}>
            <div className="input-controls">
                <button
                    type="button"
                    className={`control-btn ${useRag ? 'active' : ''}`}
                    onClick={onToggleRag}
                    title="Toggle RAG (Document Search)"
                >
                    <FileText size={18} />
                </button>
                <button
                    type="button"
                    className={`control-btn ${useWebSearch ? 'active' : ''}`}
                    onClick={onToggleWebSearch}
                    title="Toggle Web Search"
                >
                    <Globe size={18} />
                </button>
            </div>

            <div className="input-wrapper glass">
                <textarea
                    className="message-input"
                    placeholder="Type your message... (Shift+Enter for new line)"
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    onKeyDown={handleKeyDown}
                    disabled={disabled}
                    rows={1}
                />
                <button
                    type="submit"
                    className="send-btn btn-primary"
                    disabled={disabled || !message.trim()}
                >
                    <Send size={18} />
                </button>
            </div>

            {(useRag || useWebSearch) && (
                <div className="active-features">
                    {useRag && (
                        <span className="feature-badge badge-green">
                            <FileText size={12} />
                            RAG Enabled
                        </span>
                    )}
                    {useWebSearch && (
                        <span className="feature-badge badge-blue">
                            <Globe size={12} />
                            Web Search Enabled
                        </span>
                    )}
                </div>
            )}
        </form>
    );
}

export default InputArea;
