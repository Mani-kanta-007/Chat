import { useState, useRef } from 'react';
import { Send, FileText, Globe, MessageSquare, ChevronDown, Image as ImageIcon, X } from 'lucide-react';
import FileUpload from './FileUpload';
import './InputArea.css';

function InputArea({ onSendMessage, disabled, useRag, useWebSearch, onToggleRag, onToggleWebSearch, conversationId, isVisionCapable }) {
    const [message, setMessage] = useState('');
    const [attachment, setAttachment] = useState(null);
    const fileInputRef = useRef(null);
    const [showModeMenu, setShowModeMenu] = useState(false);

    // Determine current mode for display
    const getCurrentMode = () => {
        if (useRag) return { label: 'Chat with Docs', icon: FileText, color: 'text-green' };
        if (useWebSearch) return { label: 'Web Search', icon: Globe, color: 'text-blue' };
        return { label: 'Standard Chat', icon: MessageSquare, color: 'text-primary' };
    };

    const currentMode = getCurrentMode();
    const ModeIcon = currentMode.icon;

    const handleModeSelect = (mode) => {
        // Reset both first
        if (useRag) onToggleRag();
        if (useWebSearch) onToggleWebSearch();

        if (mode === 'rag') {
            if (!useRag) onToggleRag();
        } else if (mode === 'web') {
            if (!useWebSearch) onToggleWebSearch();
        }
        setShowModeMenu(false);
    };

    const handleSubmit = (e) => {
        e.preventDefault();
        if ((message.trim() || attachment) && !disabled) {
            let finalMessage = message;
            if (attachment) {
                // Prepend image markdown
                finalMessage = `![image](${attachment})\n${message}`;
            }
            onSendMessage(finalMessage);
            setMessage('');
            setAttachment(null);
        }
    };

    const handleImageSelect = (e) => {
        const file = e.target.files[0];
        if (file && file.type.startsWith('image/')) {
            const reader = new FileReader();
            reader.onload = (e) => setAttachment(e.target.result);
            reader.readAsDataURL(file);
        }
    };

    const handleKeyDown = (e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            handleSubmit(e);
        }
    };

    return (
        <div className="input-area-container">
            {/* Upload Button - Left of ChatBox */}
            <div className="upload-section">
                <FileUpload conversationId={conversationId} compact={true} />
            </div>

            <form className="input-area" onSubmit={handleSubmit}>
                <div className="input-wrapper glass">
                    <textarea
                        className="message-input"
                        placeholder={`Message ${currentMode.label === 'Standard Chat' ? 'ChatGPT' : currentMode.label}...`}
                        value={message}
                        onChange={(e) => setMessage(e.target.value)}
                        onKeyDown={handleKeyDown}
                        disabled={disabled}
                        rows={1}
                    />

                    {/* Image Attachment Preview */}
                    {attachment && (
                        <div className="image-preview-container">
                            <img src={attachment} alt="Attachment" className="preview-thumb" />
                            <button
                                type="button"
                                className="remove-image-btn"
                                onClick={() => setAttachment(null)}
                            >
                                <X size={12} />
                            </button>
                        </div>
                    )}

                    {/* Image Upload Button (Vision Only) */}
                    {isVisionCapable && (
                        <>
                            <input
                                type="file"
                                ref={fileInputRef}
                                accept="image/*"
                                style={{ display: 'none' }}
                                onChange={handleImageSelect}
                            />
                            <button
                                type="button"
                                className={`feature-btn ${attachment ? 'active' : ''}`}
                                onClick={() => fileInputRef.current?.click()}
                                title="Attach Image"
                                disabled={disabled || !!attachment}
                            >
                                <ImageIcon size={20} />
                            </button>
                        </>
                    )}

                    {/* Mode Selector Dropdown - Left of Send */}
                    <div className="mode-selector">
                        <button
                            type="button"
                            className="mode-btn"
                            onClick={() => setShowModeMenu(!showModeMenu)}
                            title="Select Search Mode"
                        >
                            <ModeIcon size={18} className={currentMode.color} />
                            <ChevronDown size={14} className="opacity-50" />
                        </button>

                        {showModeMenu && (
                            <div className="mode-menu glass animate-fade-in">
                                <button
                                    type="button"
                                    className={`mode-option ${!useRag && !useWebSearch ? 'active' : ''}`}
                                    onClick={() => handleModeSelect('standard')}
                                >
                                    <MessageSquare size={16} />
                                    <span>Standard Chat</span>
                                </button>
                                <button
                                    type="button"
                                    className={`mode-option ${useRag ? 'active' : ''}`}
                                    onClick={() => handleModeSelect('rag')}
                                >
                                    <FileText size={16} className="text-green" />
                                    <span>Chat with Docs</span>
                                </button>
                                <button
                                    type="button"
                                    className={`mode-option ${useWebSearch ? 'active' : ''}`}
                                    onClick={() => handleModeSelect('web')}
                                >
                                    <Globe size={16} className="text-blue" />
                                    <span>Web Search</span>
                                </button>
                            </div>
                        )}
                    </div>

                    <button
                        type="submit"
                        className="send-btn btn-primary"
                        disabled={disabled || (!message.trim() && !attachment)}
                    >
                        <Send size={18} />
                    </button>
                </div>
            </form>
        </div>
    );
}

export default InputArea;
