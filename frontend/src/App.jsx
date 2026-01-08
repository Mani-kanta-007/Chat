import { useState, useEffect } from 'react';
import './App.css';
import Sidebar from './components/Sidebar';
import ChatArea from './components/ChatArea';
import { getConversations, createConversation, getModels } from './services/api';

function App() {
  const [conversations, setConversations] = useState([]);
  const [currentConversation, setCurrentConversation] = useState(null);
  const [models, setModels] = useState([]);
  const [selectedModel, setSelectedModel] = useState('llama3.2:latest');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadInitialData();
  }, []);

  const loadInitialData = async () => {
    try {
      // Load models
      const modelsData = await getModels();
      setModels(modelsData.models || []);

      // Load conversations
      const conversationsData = await getConversations();
      setConversations(conversationsData || []);

      setLoading(false);
    } catch (error) {
      console.error('Error loading initial data:', error);
      setLoading(false);
    }
  };

  const handleNewChat = async () => {
    try {
      const newConv = await createConversation();
      setConversations([newConv, ...conversations]);
      setCurrentConversation(newConv);
    } catch (error) {
      console.error('Error creating conversation:', error);
    }
  };

  const handleSelectConversation = (conversation) => {
    setCurrentConversation(conversation);
  };

  const handleDeleteConversation = (conversationId) => {
    setConversations(conversations.filter(c => c.id !== conversationId));
    if (currentConversation?.id === conversationId) {
      setCurrentConversation(null);
    }
  };

  const handleUpdateConversations = () => {
    loadInitialData();
  };

  if (loading) {
    return (
      <div className="loading-screen">
        <div className="spinner"></div>
        <p>Loading MyChatGPT...</p>
      </div>
    );
  }

  return (
    <div className="app">
      <Sidebar
        conversations={conversations}
        currentConversation={currentConversation}
        onNewChat={handleNewChat}
        onSelectConversation={handleSelectConversation}
        onDeleteConversation={handleDeleteConversation}
      />
      <ChatArea
        conversation={currentConversation}
        models={models}
        selectedModel={selectedModel}
        onModelChange={setSelectedModel}
        onUpdateConversations={handleUpdateConversations}
      />
    </div>
  );
}

export default App;
