import React, { useState, useEffect, useRef } from 'react';
import Editor from '@monaco-editor/react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';

const USER_COLORS = ['#F44336', '#E91E63', '#9C27B0', '#673AB7', '#3F51B5', '#2196F3', '#03A9F4', '#00BCD4', '#009688', '#4CAF50'];

const SUPPORTED_LANGUAGES = [
  { id: 'javascript', name: 'JavaScript' },
  { id: 'python', name: 'Python' },
  { id: 'sql', name: 'SQL' },
  { id: 'html', name: 'HTML' },
  { id: 'css', name: 'CSS' }
];

const getLanguageFromFilename = (filename) => {
  const ext = filename.split('.').pop().toLowerCase();
  switch (ext) {
    case 'js': return 'javascript';
    case 'py': return 'python';
    case 'sql': return 'sql';
    case 'html': return 'html';
    case 'css': return 'css';
    default: return 'javascript';
  }
};

const CodeEditor = ({ socket, roomId, fileId, initialCode, fileName, userRole, onToggleAI, onSaveVersion }) => {
  const navigate = useNavigate();
  const [code, setCode] = useState(initialCode || '');
  const [output, setOutput] = useState('');
  const [isRunning, setIsRunning] = useState(false);
  const [selectedLanguage, setSelectedLanguage] = useState(getLanguageFromFilename(fileName));
  
  const editorRef = useRef(null);
  const isSettingCode = useRef(false);
  const saveTimeoutRef = useRef(null);
  const typingTimeoutRef = useRef(null);
  const decorationsRef = useRef({}); 

  useEffect(() => {
    isSettingCode.current = true;
    setCode(initialCode);
    setSelectedLanguage(getLanguageFromFilename(fileName));
    setOutput('');
  }, [fileId, initialCode, fileName]);

  useEffect(() => {
    if (!socket) return;

    socket.on('code-change', ({ fileId: changedFileId, code: newCode }) => {
      if (changedFileId === fileId) {
        isSettingCode.current = true;
        setCode(newCode);
      }
    });

    socket.on('cursor-move', ({ userId, username, cursor, fileId: cursorFileId }) => {
      if (!editorRef.current || userId === parseInt(localStorage.getItem('userId')) || cursorFileId !== fileId) return;
      updateUserDecorations(userId, username, cursor);
    });

    socket.on('remote-change-highlight', ({ userId, range, fileId: highlightFileId }) => {
      if (!editorRef.current || userId === parseInt(localStorage.getItem('userId')) || highlightFileId !== fileId) return;
      applyTemporaryHighlight(userId, range);
    });

    return () => {
      socket.off('code-change');
      socket.off('cursor-move');
      socket.off('remote-change-highlight');
    };
  }, [socket, fileId]);

  const getUserColor = (userId) => {
    return USER_COLORS[userId % USER_COLORS.length];
  };

  const updateUserDecorations = (userId, username, cursor) => {
    const editor = editorRef.current;
    if (!editor) return;
    const color = getUserColor(userId);
    const uniqueClass = `cursor-${userId}`;

    if (!document.getElementById(uniqueClass)) {
      const style = document.createElement('style');
      style.id = uniqueClass;
      style.innerHTML = `
        .${uniqueClass} { background-color: ${color}; width: 2px !important; }
        .${uniqueClass}-label {
          background-color: ${color}; color: white; font-size: 10px;
          padding: 2px 4px; border-radius: 2px; position: absolute;
          top: -15px; white-space: nowrap; z-index: 10;
        }
      `;
      document.head.appendChild(style);
    }

    const newDecorations = [
      {
        range: new window.monaco.Range(cursor.lineNumber, cursor.column, cursor.lineNumber, cursor.column + 1),
        options: {
          className: uniqueClass,
          afterContentClassName: `${uniqueClass}-label`,
          after: { content: username }
        }
      }
    ];

    const oldDecorations = decorationsRef.current[userId] || [];
    decorationsRef.current[userId] = editor.deltaDecorations(oldDecorations, newDecorations);
  };

  const applyTemporaryHighlight = (userId, range) => {
    const editor = editorRef.current;
    if (!editor) return;
    const color = getUserColor(userId);
    const highlightClass = `highlight-${userId}-${Date.now()}`;

    const style = document.createElement('style');
    style.innerHTML = `.${highlightClass} { background-color: ${color}44; }`;
    document.head.appendChild(style);

    const decoration = [
      {
        range: new window.monaco.Range(range.startLineNumber, range.startColumn, range.endLineNumber, range.endColumn),
        options: { className: highlightClass, isWholeLine: false }
      }
    ];

    const ids = editor.deltaDecorations([], decoration);
    setTimeout(() => {
      if (editorRef.current) editor.deltaDecorations(ids, []);
      style.remove();
    }, 2000);
  };

  const saveFileToDB = async (currentCode) => {
    try {
      const token = localStorage.getItem('token');
      await axios.post('http://localhost:5000/code/save-file', 
        { fileId, content: currentCode, roomId },
        { headers: { Authorization: `Bearer ${token}` } }
      );
    } catch (err) {
      console.error('Failed to save file:', err);
    }
  };

  const handleEditorChange = (value, event) => {
    if (isSettingCode.current) {
      isSettingCode.current = false;
      return;
    }

    setCode(value);
    socket.emit('code-change', { roomId, fileId, code: value });

    if (event.changes && event.changes.length > 0) {
      const change = event.changes[0];
      socket.emit('remote-change-highlight', { 
        roomId, fileId,
        userId: parseInt(localStorage.getItem('userId')),
        range: change.range 
      });

      socket.emit('activity-update', {
        roomId,
        message: `${localStorage.getItem('username')} edited ${fileName} at line ${change.range.startLineNumber}`
      });
    }

    socket.emit('typing', { roomId, username: localStorage.getItem('username') });
    if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
    typingTimeoutRef.current = setTimeout(() => {
      socket.emit('stop-typing', { roomId });
    }, 1500);

    if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
    saveTimeoutRef.current = setTimeout(() => {
      saveFileToDB(value);
    }, 2000);
  };

  const handleRunCode = async () => {
    if (selectedLanguage === 'html' || selectedLanguage === 'css') {
      setOutput(code);
      return;
    }

    setIsRunning(true);
    setOutput('Running...');
    try {
      const token = localStorage.getItem('token');
      const response = await axios.post('http://localhost:5000/code/run', 
        { code, language: selectedLanguage },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      
      const { stdout, stderr, compile_output } = response.data;
      setOutput(compile_output || stderr || stdout || 'Code executed successfully with no output.');
    } catch (err) {
      setOutput(err.response?.data?.error || 'Execution failed.');
    } finally {
      setIsRunning(false);
    }
  };

  const handleEditorDidMount = (editor, monaco) => {
    editorRef.current = editor;
    window.monaco = monaco;

    editor.onDidChangeCursorPosition((e) => {
      socket.emit('cursor-move', {
        roomId, fileId,
        userId: parseInt(localStorage.getItem('userId')),
        username: localStorage.getItem('username'),
        cursor: {
          lineNumber: e.position.lineNumber,
          column: e.position.column
        }
      });
    });
  };

  return (
    <div className="editor-container" style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      <div className="editor-header" style={{ padding: '10px 20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#14141c', borderBottom: '1px solid #333' }}>
        <div style={{display: 'flex', alignItems: 'center', gap: '15px', flexShrink: 0}}>
          <div style={{ backgroundColor: 'rgba(255,255,255,0.05)', padding: '4px 12px', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.1)' }}>
            <span style={{ fontSize: '0.7rem', color: '#888', marginRight: '6px', textTransform: 'uppercase' }}>Room</span>
            <span style={{ fontSize: '0.9rem', color: 'var(--accent-secondary)', fontWeight: 'bold' }}>{roomId}</span>
          </div>
          <h2 className="editor-title" style={{ fontSize: '1.1rem', color: '#e0e0e0', margin: 0 }}>{fileName}</h2>
          <span style={{fontSize: '0.75rem', backgroundColor: '#2a2a2a', padding: '2px 8px', borderRadius: '4px', color: '#888'}}>
            {userRole.toUpperCase()}
          </span>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '15px', flexWrap: 'nowrap' }}>
          {/* AI Button */}
          <button 
            onClick={onToggleAI}
            style={{
              backgroundColor: 'var(--accent-primary)',
              color: 'white',
              border: 'none',
              padding: '8px 16px',
              borderRadius: '8px',
              cursor: 'pointer',
              fontSize: '0.85rem',
              fontWeight: '600',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              boxShadow: '0 4px 15px rgba(124, 77, 255, 0.3)'
            }}
          >
            ✨ AI Assistant
          </button>

          {/* Language Selector */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ fontSize: '0.7rem', color: '#666', textTransform: 'uppercase' }}>Language</span>
            <select 
              value={selectedLanguage}
              onChange={(e) => setSelectedLanguage(e.target.value)}
              style={{
                backgroundColor: '#1a1a1a',
                color: 'white',
                border: '1px solid #333',
                padding: '6px 12px',
                borderRadius: '8px',
                fontSize: '0.85rem',
                outline: 'none',
                cursor: 'pointer'
              }}
            >
              {SUPPORTED_LANGUAGES.map(lang => (
                <option key={lang.id} value={lang.id}>{lang.name}</option>
              ))}
            </select>
          </div>

          <div style={{ width: '1px', height: '24px', backgroundColor: '#333', margin: '0 5px' }}></div>

          {/* Run Button - More Visible */}
          <button 
            onClick={handleRunCode} 
            disabled={isRunning}
            style={{
              padding: '8px 25px',
              backgroundColor: isRunning ? '#444' : '#00e5ff',
              color: '#000',
              border: 'none',
              borderRadius: '8px',
              cursor: isRunning ? 'not-allowed' : 'pointer',
              fontWeight: '800',
              fontSize: '0.9rem',
              textTransform: 'uppercase',
              letterSpacing: '1px',
              boxShadow: isRunning ? 'none' : '0 0 20px rgba(0, 229, 255, 0.4)',
              transition: 'all 0.3s'
            }}
          >
            {isRunning ? '...' : '▶ RUN'}
          </button>

          {/* Save & Exit Buttons */}
          <div style={{ display: 'flex', gap: '8px' }}>
            {userRole !== 'viewer' && (
              <button 
                onClick={onSaveVersion}
                className="icon-btn-text"
                style={{ padding: '6px 12px', color: '#888', background: 'transparent', border: '1px solid #333', borderRadius: '8px', fontSize: '0.8rem', cursor: 'pointer' }}
              >
                💾 Save
              </button>
            )}
            <button 
              onClick={() => navigate('/dashboard')}
              style={{ padding: '6px 12px', color: '#888', background: 'transparent', border: '1px solid #333', borderRadius: '8px', fontSize: '0.8rem', cursor: 'pointer' }}
            >
              Exit
            </button>
          </div>
        </div>
      </div>

      <div className="editor-wrapper" style={{ flex: 2, position: 'relative' }}>
        <Editor
          height="100%"
          language={selectedLanguage}
          theme="vs-dark"
          value={code}
          onChange={handleEditorChange}
          onMount={handleEditorDidMount}
          options={{
            readOnly: userRole === 'viewer',
            minimap: { enabled: false },
            fontSize: 16,
            wordWrap: 'on',
            automaticLayout: true,
            padding: { top: 16 }
          }}
        />
      </div>
      
      <div className="output-console" style={{
        flex: 1, backgroundColor: '#1e1e1e', borderTop: '2px solid #333',
        padding: '10px', display: 'flex', flexDirection: 'column', overflow: 'hidden'
      }}>
        <div style={{ color: '#888', marginBottom: '5px', fontWeight: 'bold', fontSize: '0.75rem', letterSpacing: '1px' }}>
          {selectedLanguage === 'html' || selectedLanguage === 'css' ? 'LIVE PREVIEW' : 'CONSOLE OUTPUT'}
        </div>
        
        {selectedLanguage === 'html' || selectedLanguage === 'css' ? (
          <iframe title="preview" srcDoc={output || code} style={{ flex: 1, width: '100%', backgroundColor: 'white', border: 'none', borderRadius: '4px' }} />
        ) : (
          <pre style={{ flex: 1, margin: 0, padding: '10px', backgroundColor: '#000', color: '#00ff00', overflowY: 'auto', fontFamily: 'monospace', borderRadius: '4px', whiteSpace: 'pre-wrap', fontSize: '0.85rem', border: '1px solid #222' }}>
            {output || 'No output to show... Click RUN to execute your code.'}
          </pre>
        )}
      </div>
    </div>
  );
};

export default CodeEditor;
