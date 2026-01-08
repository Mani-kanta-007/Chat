import { useState } from 'react';
import { ChevronDown } from 'lucide-react';
import './ModelSelector.css';

function ModelSelector({ models, selectedModel, onModelChange }) {
    const [isOpen, setIsOpen] = useState(false);

    const getBadgeClass = (color) => {
        return `badge badge-${color}`;
    };

    const selectedModelData = models.find(m => m.name === selectedModel);

    return (
        <div className="model-selector">
            <button
                className="model-selector-button glass-hover"
                onClick={() => setIsOpen(!isOpen)}
            >
                <div className="selected-model">
                    <span className="model-name">
                        {selectedModelData?.display_name || selectedModel}
                    </span>
                    {selectedModelData?.recommendation && (
                        <span className={getBadgeClass(selectedModelData.badge_color)}>
                            {selectedModelData.recommendation}
                        </span>
                    )}
                </div>
                <ChevronDown
                    size={18}
                    className={`chevron ${isOpen ? 'open' : ''}`}
                />
            </button>

            {isOpen && (
                <>
                    <div className="model-selector-overlay" onClick={() => setIsOpen(false)} />
                    <div className="model-selector-dropdown glass animate-fade-in">
                        {models.length === 0 ? (
                            <div className="no-models">No models available</div>
                        ) : (
                            models.map((model) => (
                                <div
                                    key={model.name}
                                    className={`model-option glass-hover ${model.name === selectedModel ? 'active' : ''
                                        }`}
                                    onClick={() => {
                                        onModelChange(model.name);
                                        setIsOpen(false);
                                    }}
                                >
                                    <div className="model-option-header">
                                        <span className="model-option-name">{model.display_name}</span>
                                        {model.name === selectedModel && (
                                            <span className="checkmark">✓</span>
                                        )}
                                    </div>
                                    <div className="model-option-details">
                                        <span className={getBadgeClass(model.badge_color)}>
                                            {model.recommendation}
                                        </span>
                                        <span className="model-context">
                                            {model.context_window} tokens
                                        </span>
                                    </div>
                                    <div className="model-capabilities">
                                        {model.capabilities.map((cap) => (
                                            <span key={cap} className="capability-tag">
                                                {cap}
                                            </span>
                                        ))}
                                    </div>
                                </div>
                            ))
                        )}
                    </div>
                </>
            )}
        </div>
    );
}

export default ModelSelector;
