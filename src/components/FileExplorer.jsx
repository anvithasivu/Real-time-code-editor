import React, { useState } from 'react';

const FileExplorer = ({ files, activeFileId, onFileSelect, onCreateFile, onDeleteFile, userRole }) => {
  const [newFileName, setNewFileName] = useState('');
  const [isCreating, setIsCreating] = useState(false);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (newFileName.trim()) {
      onCreateFile(newFileName.trim());
      setNewFileName('');
      setIsCreating(false);
    }
  };

  return (
    <div className="file-explorer" style={{
      width: '200px',
      backgroundColor: '#1e1e1e',
      borderRight: '1px solid #333',
      display: 'flex',
      flexDirection: 'column',
      color: '#ccc'
    }}>
      <div style={{ padding: '10px', fontSize: '0.8rem', fontWeight: 'bold', borderBottom: '1px solid #333', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <span>FILES</span>
        {userRole !== 'viewer' && (
          <button 
            onClick={() => setIsCreating(true)}
            style={{ background: 'none', border: 'none', color: 'var(--accent-color)', cursor: 'pointer', fontSize: '1.2rem' }}
          >
            +
          </button>
        )}
      </div>

      <div style={{ flex: 1, overflowY: 'auto', padding: '5px' }}>
        {isCreating && (
          <form onSubmit={handleSubmit} style={{ padding: '5px' }}>
            <input
              autoFocus
              type="text"
              value={newFileName}
              onChange={(e) => setNewFileName(e.target.value)}
              onBlur={() => !newFileName && setIsCreating(false)}
              placeholder="filename..."
              style={{
                width: '100%',
                backgroundColor: '#333',
                color: 'white',
                border: '1px solid var(--accent-color)',
                borderRadius: '2px',
                fontSize: '0.8rem',
                padding: '2px 5px'
              }}
            />
          </form>
        )}

        {files.map(file => (
          <div 
            key={file.id}
            onClick={() => onFileSelect(file)}
            className={`file-item ${activeFileId === file.id ? 'active' : ''}`}
            style={{
              padding: '6px 10px',
              fontSize: '0.9rem',
              cursor: 'pointer',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              backgroundColor: activeFileId === file.id ? '#333' : 'transparent',
              borderRadius: '4px',
              margin: '2px 0'
            }}
          >
            <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {file.name}
            </span>
            {activeFileId === file.id && userRole === 'owner' && files.length > 1 && (
              <button 
                onClick={(e) => { e.stopPropagation(); onDeleteFile(file.id); }}
                style={{ background: 'none', border: 'none', color: '#ff4444', fontSize: '0.7rem', cursor: 'pointer' }}
              >
                ✕
              </button>
            )}
          </div>
        ))}
      </div>
      <style>{`
        .file-item:hover { background-color: #2a2a2a !important; }
        .file-item.active { border-left: 2px solid var(--accent-color); }
      `}</style>
    </div>
  );
};

export default FileExplorer;
