import { useState, useEffect, useRef } from 'react';
import { Bot, User } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { vscDarkPlus } from 'react-syntax-highlighter/dist/esm/styles/prism';
import ModelSelector from './ModelSelector';
import InputArea from './InputArea';
import FileUpload from './FileUpload';
import { getConversation, streamChat } from '../services/api';
import './ChatArea.css';

function ChatArea({ conversation, models, selectedModel, onModelChange, onUpdateConversations }) {
    const [messages, setMessages] = useState([]);
    const [isStreaming, setIsStreaming] = useState(false);
    const [streamingMessage, setStreamingMessage] = useState('');
    const [useRag, setUseRag] = useState(false);
    const [useWebSearch, setUseWebSearch] = useState(false);
    const messagesEndRef = useRef(null);

    useEffect(() => {
        if (conversation) {
            loadConversation();
        } else {
            setMessages([]);
        }
    }, [conversation]);

    useEffect(() => {
        scrollToBottom();
    }, [messages, streamingMessage]);

    const loadConversation = async () => {
        try {
            const data = await getConversation(conversation.id);
            setMessages(data.messages || []);
        } catch (error) {
            console.error('Error loading conversation:', error);
        }
    };

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    };

    const handleSendMessage = async (message) => {
        if (!conversation || !message.trim()) return;

        setIsStreaming(true);
        setStreamingMessage('');

        streamChat(
            conversation.id,
            message,
            selectedModel,
            useRag,
            useWebSearch,
            (chunk) => {
                setStreamingMessage((prev) => prev + chunk);
            },
            (error) => {
                console.error('Streaming error:', error);
                setIsStreaming(false);
                setStreamingMessage('');
            },
            () => {
                setIsStreaming(false);
                setStreamingMessage('');
                loadConversation();
                onUpdateConversations();
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
                    <h2 className="chat-title">{conversation.title}</h2>
                </div>
                <div className="chat-header-right">
                    <ModelSelector
                        models={models}
                        selectedModel={selectedModel}
                        onModelChange={onModelChange}
                    />
                </div>
            </div>

            <div className="messages-container">
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
                                                    return !inline && match ? (
                                                        <SyntaxHighlighter
                                                            style={vscDarkPlus}
                                                            language={match[1]}
                                                            PreTag="div"
                                                            {...props}
                                                        >
                                                            {String(children).replace(/\n$/, '')}
                                                        </SyntaxHighlighter>
                                                    ) : (
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
                                                    return !inline && match ? (
                                                        <SyntaxHighlighter
                                                            style={vscDarkPlus}
                                                            language={match[1]}
                                                            PreTag="div"
                                                            {...props}
                                                        >
                                                            {String(children).replace(/\n$/, '')}
                                                        </SyntaxHighlighter>
                                                    ) : (
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
                <FileUpload conversationId={conversation.id} />
                <InputArea
                    onSendMessage={handleSendMessage}
                    disabled={isStreaming}
                    useRag={useRag}
                    useWebSearch={useWebSearch}
                    onToggleRag={() => setUseRag(!useRag)}
                    onToggleWebSearch={() => setUseWebSearch(!useWebSearch)}
                />
            </div>
        </div>
    );
}

export default ChatArea;
