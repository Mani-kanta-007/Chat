import axios from 'axios';

const API_BASE_URL = 'http://localhost:8000/api';

const api = axios.create({
    baseURL: API_BASE_URL,
    headers: {
        'Content-Type': 'application/json',
    },
});

// Conversations
export const getConversations = async () => {
    const response = await api.get('/conversations');
    return response.data;
};

export const createConversation = async (title = 'New Chat') => {
    const response = await api.post('/conversations', { title });
    return response.data;
};

export const getConversation = async (conversationId) => {
    const response = await api.get(`/conversations/${conversationId}`);
    return response.data;
};

export const autoNameConversation = async (conversationId) => {
    const response = await api.post(`/conversations/${conversationId}/auto_name`);
    return response.data;
};

export const updateConversation = async (conversationId, title) => {
    const response = await api.patch(`/conversations/${conversationId}`, { title });
    return response.data;
};

export const deleteConversation = async (conversationId) => {
    const response = await api.delete(`/conversations/${conversationId}`);
    return response.data;
};

// Chat
export const streamChat = (conversationId, message, model, useRag, useWebSearch, onChunk, onError, onComplete) => {


    // Note: We'll use POST request with fetch for streaming instead
    fetch(`${API_BASE_URL}/chat/stream`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({
            conversation_id: conversationId,
            message,
            model,
            use_rag: useRag,
            use_web_search: useWebSearch,
        }),
    }).then(async (response) => {
        const reader = response.body.getReader();
        const decoder = new TextDecoder();

        while (true) {
            const { done, value } = await reader.read();
            if (done) break;

            const chunk = decoder.decode(value);
            const lines = chunk.split('\n');

            for (const line of lines) {
                if (line.startsWith('data: ')) {
                    try {
                        const data = JSON.parse(line.slice(6));

                        if (data.type === 'metadata') {
                            // Handle metadata if needed
                        } else if (data.type === 'chunk') {
                            onChunk(data.content);
                        } else if (data.type === 'error') {
                            onError(data.content);
                        } else if (data.type === 'done') {
                            onComplete();
                        }
                    } catch (e) {
                        console.error('Error parsing SSE data:', e);
                    }
                }
            }
        }
    }).catch(onError);
};

// Models
export const getModels = async () => {
    const response = await api.get('/models');
    return response.data;
};

// Documents
export const uploadDocument = async (conversationId, file) => {
    const formData = new FormData();
    formData.append('file', file);

    const response = await api.post(`/documents/upload?conversation_id=${conversationId}`, formData, {
        headers: {
            'Content-Type': 'multipart/form-data',
        },
    });
    return response.data;
};

export const getDocuments = async (conversationId) => {
    const response = await api.get(`/documents/${conversationId}`);
    return response.data;
};

export const deleteDocument = async (documentId) => {
    const response = await api.delete(`/documents/${documentId}`);
    return response.data;
};
