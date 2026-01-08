import { useState } from 'react';
import { Upload, FileText, X, Loader } from 'lucide-react';
import { uploadDocument, getDocuments, deleteDocument } from '../services/api';
import './FileUpload.css';

function FileUpload({ conversationId, compact }) {
    const [documents, setDocuments] = useState([]);
    const [uploading, setUploading] = useState(false);
    const [showUpload, setShowUpload] = useState(false);

    const loadDocuments = async () => {
        if (!conversationId) return;
        try {
            const docs = await getDocuments(conversationId);
            setDocuments(docs);
        } catch (error) {
            console.error('Error loading documents:', error);
        }
    };

    const handleFileSelect = async (e) => {
        const file = e.target.files?.[0];
        if (!file) return;

        // Validate file type
        const validExtensions = ['.txt', '.pdf', '.docx'];
        const fileExt = '.' + file.name.split('.').pop().toLowerCase();

        if (!validExtensions.includes(fileExt)) {
            alert(`Invalid file type. Allowed: ${validExtensions.join(', ')}`);
            return;
        }

        setUploading(true);
        try {
            await uploadDocument(conversationId, file);
            await loadDocuments();
            alert(`File "${file.name}" uploaded successfully!`);
        } catch (error) {
            console.error('Error uploading file:', error);
            alert('Failed to upload file');
        } finally {
            setUploading(false);
            e.target.value = '';
        }
    };

    const handleDelete = async (documentId) => {
        if (!window.confirm('Delete this document?')) return;

        try {
            await deleteDocument(documentId);
            setDocuments(documents.filter(d => d.id !== documentId));
        } catch (error) {
            console.error('Error deleting document:', error);
        }
    };

    return (
        <div className={`file-upload ${compact ? 'compact' : ''}`}>
            <button
                type="button"
                className={`upload-toggle-btn ${compact ? 'btn-ghost' : 'btn-secondary'}`}
                onClick={() => {
                    setShowUpload(!showUpload);
                    if (!showUpload) loadDocuments();
                }}
                title="Manage documents"
            >
                <Upload size={20} />
                {!compact && documents.length > 0 && (
                    <span className="upload-count badge badge-blue">{documents.length}</span>
                )}
                {compact && documents.length > 0 && (
                    <span className="upload-dot"></span>
                )}
            </button>

            {showUpload && (
                <div className="upload-panel glass animate-fade-in">
                    <div className="upload-header">
                        <h3>Documents</h3>
                        <button
                            className="btn-ghost"
                            onClick={() => setShowUpload(false)}
                            style={{ padding: '0.25rem' }}
                        >
                            <X size={18} />
                        </button>
                    </div>

                    <div className="upload-area">
                        <input
                            type="file"
                            id="file-input"
                            accept=".txt,.pdf,.docx"
                            onChange={handleFileSelect}
                            disabled={uploading}
                            style={{ display: 'none' }}
                        />
                        <label htmlFor="file-input" className="upload-label glass-hover">
                            {uploading ? (
                                <>
                                    <Loader size={24} className="animate-spin" />
                                    <span>Uploading...</span>
                                </>
                            ) : (
                                <>
                                    <Upload size={24} />
                                    <span>Upload Document</span>
                                    <span className="upload-hint">.txt, .pdf, .docx</span>
                                </>
                            )}
                        </label>
                    </div>

                    {documents.length > 0 && (
                        <div className="documents-list">
                            {documents.map((doc) => (
                                <div key={doc.id} className="document-item glass-hover">
                                    <FileText size={16} />
                                    <div className="document-info">
                                        <div className="document-name">{doc.filename}</div>
                                        <div className="document-date">
                                            {new Date(doc.uploaded_at).toLocaleDateString()}
                                        </div>
                                    </div>
                                    <button
                                        className="delete-doc-btn btn-ghost"
                                        onClick={() => handleDelete(doc.id)}
                                    >
                                        <X size={14} />
                                    </button>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}

export default FileUpload;
