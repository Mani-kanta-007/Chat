import { useState, useEffect, useRef } from 'react';
import { Bot, User, Edit2, Check, X, Copy } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { vscDarkPlus } from 'react-syntax-highlighter/dist/esm/styles/prism';
import ModelSelector from './ModelSelector';
import InputArea from './InputArea';
import { getConversation, streamChat, updateConversation, autoNameConversation } from '../services/api';
import './ChatArea.css';

const CodeBlock = ({ language, children, ...props }) => {
    const [copied, setCopied] = useState(false);

    const handleCopy = () => {
        navigator.clipboard.writeText(String(children));
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    return (
        <div className="code-block-wrapper">
            <div className="code-header">
                <span className="code-lang">{language || 'text'}</span>
                <button onClick={handleCopy} className="copy-btn">
                    {copied ? <Check size={14} className="text-green-500" /> : <Copy size={14} />}
                    {copied ? 'Copied!' : 'Copy Code'}
                </button>
            </div>
            <SyntaxHighlighter
                style={vscDarkPlus}
                language={language}
                PreTag="div"
                customStyle={{ margin: 0, borderRadius: 0 }}
                {...props}
            >
                {String(children).replace(/\n$/, '')}
            </SyntaxHighlighter>
        </div>
    );
};

function ChatArea({ conversation, models, selectedModel, onModelChange, onUpdateConversations }) {
    // ... existing hooks
    const activeConversationIdRef = useRef(null);
    const messagesEndRef = useRef(null);
    const [isEditingTitle, setIsEditingTitle] = useState(false);
    const [titleInput, setTitleInput] = useState('');
    const [messages, setMessages] = useState([]);
    const [isStreaming, setIsStreaming] = useState(false);
    const [streamingMessage, setStreamingMessage] = useState('');
    const [useRag, setUseRag] = useState(false);
    const [useWebSearch, setUseWebSearch] = useState(false);
    const isStreamingRef = useRef(false);

    useEffect(() => {
        activeConversationIdRef.current = conversation?.id;
        if (conversation) {
            loadConversation();
            setTitleInput(conversation.title);
            // Reset streaming state when switching conversations
            setIsStreaming(false);
            setStreamingMessage('');
            isStreamingRef.current = false;
        } else {
            setMessages([]);
        }
    }, [conversation]);



    const loadConversation = async () => {
        try {
            const data = await getConversation(conversation.id);
            setMessages(data.messages || []);
        } catch (error) {
            console.error('Error loading conversation:', error);
        }
    };

    const handleTitleSave = async () => {
        if (titleInput.trim() !== conversation.title) {
            try {
                await updateConversation(conversation.id, titleInput);
                onUpdateConversations();
            } catch (error) {
                console.error('Error updating title:', error);
                setTitleInput(conversation.title); // Revert on error
            }
        }
        setIsEditingTitle(false);
    };

    const handleTitleKeyDown = (e) => {
        if (e.key === 'Enter') handleTitleSave();
        if (e.key === 'Escape') {
            setTitleInput(conversation.title);
            setIsEditingTitle(false);
        }
    };

    const scrollContainerRef = useRef(null);
    const isAtBottomRef = useRef(true);

    const handleScroll = () => {
        if (!scrollContainerRef.current) return;
        const { scrollTop, scrollHeight, clientHeight } = scrollContainerRef.current;
        // Check if user is near bottom (within 100px)
        const isAtBottom = scrollHeight - scrollTop - clientHeight < 100;
        isAtBottomRef.current = isAtBottom;
    };

    const scrollToBottom = (behavior = 'smooth') => {
        if (messagesEndRef.current) {
            messagesEndRef.current.scrollIntoView({ behavior });
        }
    };

    // Auto-scroll only if already at bottom
    useEffect(() => {
        if (isAtBottomRef.current) {
            scrollToBottom();
        }
    }, [messages, streamingMessage]);

    // Force scroll when switching conversations
    useEffect(() => {
        isAtBottomRef.current = true;
        scrollToBottom('auto');
    }, [conversation?.id]);

    const handleSendMessage = async (message) => {
        if (!conversation || !message.trim()) return;

        const currentConvId = conversation.id;

        // 1. Optimistically add user message
        const optimisticMessage = {
            id: 'temp-' + Date.now(),
            role: 'user',
            content: message,
            timestamp: new Date().toISOString(),
            model_used: null
        };
        setMessages(prev => [...prev, optimisticMessage]);

        setIsStreaming(true);
        setStreamingMessage('');
        isStreamingRef.current = true;

        streamChat(
            currentConvId,
            message,
            selectedModel,
            useRag,
            useWebSearch,
            (chunk) => {
                // Check if we are still on the same conversation
                if (activeConversationIdRef.current === currentConvId) {
                    setStreamingMessage((prev) => prev + chunk);
                }
            },
            (error) => {
                if (activeConversationIdRef.current === currentConvId) {
                    console.error('Streaming error:', error);
                    setIsStreaming(false);
                    setStreamingMessage('');
                    isStreamingRef.current = false;
                }
            },
            () => {
                if (activeConversationIdRef.current === currentConvId) {
                    setIsStreaming(false);
                    setStreamingMessage('');
                    isStreamingRef.current = false;

                    // Reload conversation to get the new messages (and replace optimistic one)
                    loadConversation().then(() => {
                        // Check if we should auto-name (if it was the first message)
                        if (conversation.title === 'New Chat' && messages.length === 0) {
                            // Note: messages.length checks the state captured in closure, which is empty initially.
                            // This logic might need adjustment if we want to be robust, 
                            // but checking title 'New Chat' is the main valid condition.
                            autoNameConversation(conversation.id).then(() => {
                                onUpdateConversations();
                                loadConversation();  // Refresh title
                            });
                        }
                    });

                    onUpdateConversations();
                }
            }
        );
    };

    if (!conversation) {
        return (
            <div className="chat-area">
                <div className="empty-chat">
                    <div className="empty-chat-content">
                        <Bot size={64} className="empty-icon" />
                        <h2 className="gradient-text">Welcome to MyChatGPT</h2>
                        <p className="empty-description">
                            Select a conversation or start a new chat to begin
                        </p>
                        <div className="features-grid">
                            <div className="feature-card glass">
                                <h3>🤖 Multiple Models</h3>
                                <p>Switch between Llama, Phi, and Gemma models</p>
                            </div>
                            <div className="feature-card glass">
                                <h3>📄 RAG Support</h3>
                                <p>Upload documents and get contextual answers</p>
                            </div>
                            <div className="feature-card glass">
                                <h3>🌐 Web Search</h3>
                                <p>Get current information from the web</p>
                            </div>
                            <div className="feature-card glass">
                                <h3>💾 Chat History</h3>
                                <p>All conversations are saved automatically</p>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="chat-area">
            <div className="chat-header glass">
                <div className="chat-header-left">
                    {isEditingTitle ? (
                        <div className="title-edit-container">
                            <input
                                type="text"
                                className="title-input"
                                value={titleInput}
                                onChange={(e) => setTitleInput(e.target.value)}
                                onBlur={handleTitleSave}
                                onKeyDown={handleTitleKeyDown}
                                autoFocus
                            />
                            <button className="icon-btn" onMouseDown={handleTitleSave}>
                                <Check size={18} className="text-green" />
                            </button>
                        </div>
                    ) : (
                        <div className="title-display-container group">
                            <h2 className="chat-title" onDoubleClick={() => setIsEditingTitle(true)}>
                                {conversation.title}
                            </h2>
                            <button
                                className="icon-btn edit-btn opacity-0 group-hover:opacity-100"
                                onClick={() => setIsEditingTitle(true)}
                                title="Rename chat"
                            >
                                <Edit2 size={14} />
                            </button>
                        </div>
                    )}
                </div>
                <div className="chat-header-right">
                    <ModelSelector
                        models={models}
                        selectedModel={selectedModel}
                        onModelChange={onModelChange}
                    />
                </div>
            </div>

            <div
                className="messages-container"
                ref={scrollContainerRef}
                onScroll={handleScroll}
            >
                {messages.length === 0 && !isStreaming ? (
                    <div className="no-messages">
                        <Bot size={48} opacity={0.3} />
                        <p>Start the conversation!</p>
                    </div>
                ) : (
                    <>
                        {messages.map((message) => (
                            <div
                                key={message.id}
                                className={`message ${message.role} animate-fade-in`}
                            >
                                <div className="message-icon">
                                    {message.role === 'user' ? (
                                        <User size={20} />
                                    ) : (
                                        <Bot size={20} />
                                    )}
                                </div>
                                <div className="message-content">
                                    <div className="message-header">
                                        <span className="message-role">
                                            {message.role === 'user' ? 'You' : 'Assistant'}
                                        </span>
                                        {message.model_used && (
                                            <span className="message-model badge badge-blue">
                                                {message.model_used}
                                            </span>
                                        )}
                                    </div>
                                    <div className="message-text">
                                        <ReactMarkdown
                                            components={{
                                                code({ node, inline, className, children, ...props }) {
                                                    const match = /language-(\w+)/.exec(className || '');
                                                    if (!inline) {
                                                        return (
                                                            <CodeBlock
                                                                language={match ? match[1] : 'text'}
                                                                {...props}
                                                            >
                                                                {children}
                                                            </CodeBlock>
                                                        );
                                                    }
                                                    return (
                                                        <code className={className} {...props}>
                                                            {children}
                                                        </code>
                                                    );
                                                },
                                            }}
                                        >
                                            {message.content}
                                        </ReactMarkdown>
                                    </div>
                                </div>
                            </div>
                        ))}

                        {isStreaming && (
                            <div className="message assistant animate-fade-in">
                                <div className="message-icon">
                                    <Bot size={20} />
                                </div>
                                <div className="message-content">
                                    <div className="message-header">
                                        <span className="message-role">Assistant</span>
                                        <span className="typing-indicator">●●●</span>
                                    </div>
                                    <div className="message-text">
                                        <ReactMarkdown
                                            components={{
                                                code({ node, inline, className, children, ...props }) {
                                                    const match = /language-(\w+)/.exec(className || '');
                                                    if (!inline) {
                                                        return (
                                                            <CodeBlock
                                                                language={match ? match[1] : 'text'}
                                                                {...props}
                                                            >
                                                                {children}
                                                            </CodeBlock>
                                                        );
                                                    }
                                                    return (
                                                        <code className={className} {...props}>
                                                            {children}
                                                        </code>
                                                    );
                                                },
                                            }}
                                        >
                                            {streamingMessage || 'Thinking...'}
                                        </ReactMarkdown>
                                    </div>
                                </div>
                            </div>
                        )}
                        <div ref={messagesEndRef} />
                    </>
                )}
            </div>

            <div className="input-container">
                <InputArea
                    onSendMessage={handleSendMessage}
                    disabled={isStreaming}
                    useRag={useRag}
                    useWebSearch={useWebSearch}
                    onToggleRag={() => setUseRag(!useRag)}
                    onToggleWebSearch={() => setUseWebSearch(!useWebSearch)}
                    conversationId={conversation.id}
                    isVisionCapable={models.find(m => m.name === selectedModel)?.capabilities?.includes('vision')}
                />
            </div>
        </div>
    );
}

export default ChatArea;
