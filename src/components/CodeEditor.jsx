import React, { useState, useEffect, useRef } from 'react';
import Editor from '@monaco-editor/react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';

const CodeEditor = ({ socket, roomId }) => {
  const navigate = useNavigate();
  const [language, setLanguage] = useState('javascript');
  const [code, setCode] = useState('// Start coding...');
  const [output, setOutput] = useState('');
  const [isRunning, setIsRunning] = useState(false);
  const isSettingCode = useRef(false);
  const saveTimeoutRef = useRef(null);

  useEffect(() => {
    const loadCode = async () => {
      try {
        const token = localStorage.getItem('token');
        const response = await axios.get(`http://localhost:5000/code/load/${roomId}`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        isSettingCode.current = true;
        setCode(response.data.code);
        setLanguage(response.data.language);
      } catch (err) {
        console.error('Failed to load code from DB:', err);
      }
    };
    loadCode();
  }, [roomId]);

  useEffect(() => {
    if (!socket) return;

    socket.on('code-change', (newCode) => {
      isSettingCode.current = true;
      setCode(newCode);
    });

    return () => {
      socket.off('code-change');
    };
  }, [socket]);

  const saveCodeToDB = async (currentCode, currentLang) => {
    try {
      const token = localStorage.getItem('token');
      await axios.post('http://localhost:5000/code/save', 
        { roomId, code: currentCode, language: currentLang },
        { headers: { Authorization: `Bearer ${token}` } }
      );
    } catch (err) {
      console.error('Failed to save code:', err);
    }
  };

  const handleLanguageChange = (e) => {
    const newLang = e.target.value;
    setLanguage(newLang);
    saveCodeToDB(code, newLang);
  };

  const handleEditorChange = (value) => {
    if (isSettingCode.current) {
      isSettingCode.current = false;
      return;
    }

    setCode(value);
    socket.emit('code-change', { roomId, code: value });

    if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
    saveTimeoutRef.current = setTimeout(() => {
      saveCodeToDB(value, language);
    }, 2000);
  };

  const handleRunCode = async () => {
    if (language === 'html') {
      setOutput(code); // For HTML, we just update the preview
      return;
    }

    setIsRunning(true);
    setOutput('Running...');
    try {
      const token = localStorage.getItem('token');
      const response = await axios.post('http://localhost:5000/code/run', 
        { code, language },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      
      const { stdout, stderr, compile_output } = response.data;
      const finalOutput = compile_output || stderr || stdout || 'Code executed successfully with no output.';
      setOutput(finalOutput);
    } catch (err) {
      setOutput(err.response?.data?.error || 'Execution failed. Please try again.');
    } finally {
      setIsRunning(false);
    }
  };

  const handleEditorDidMount = (editor, monaco) => {
    editor.onDidChangeCursorPosition((e) => {
      socket.emit('cursor-move', {
        roomId,
        cursor: {
          lineNumber: e.position.lineNumber,
          column: e.position.column
        }
      });
    });
  };

  return (
    <div className="editor-container" style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      <div className="editor-header">
        <div style={{display: 'flex', alignItems: 'center', gap: '15px'}}>
          <h2 className="editor-title">Collaborative Code Editor</h2>
          <span style={{fontSize: '0.9rem', color: '#4caf50', display: 'flex', alignItems: 'center', gap: '5px'}}>
            <div style={{width: '8px', height: '8px', backgroundColor: '#4caf50', borderRadius: '50%'}}></div>
            Room: {roomId}
          </span>
        </div>
        <div style={{display: 'flex', gap: '10px', alignItems: 'center'}}>
          <button 
            onClick={() => navigate('/dashboard')}
            style={{
              padding: '6px 12px',
              backgroundColor: '#333',
              color: 'white',
              border: '1px solid #555',
              borderRadius: '4px',
              cursor: 'pointer',
              marginRight: '10px'
            }}
          >
            Dashboard
          </button>
          <select 
            className="language-selector" 
            value={language} 
            onChange={handleLanguageChange}
          >
            <option value="javascript">JavaScript</option>
            <option value="python">Python</option>
            <option value="sql">SQL</option>
            <option value="html">HTML/CSS</option>
          </select>
          <button 
            onClick={handleRunCode} 
            disabled={isRunning}
            style={{
              padding: '6px 16px',
              backgroundColor: isRunning ? '#555' : 'var(--accent-color)',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              cursor: isRunning ? 'not-allowed' : 'pointer',
              fontWeight: 'bold'
            }}
          >
            {isRunning ? 'Running...' : (language === 'html' ? 'Refresh Preview' : 'Run Code')}
          </button>
        </div>
      </div>
      <div className="editor-wrapper" style={{ flex: 2, position: 'relative' }}>
        <Editor
          height="100%"
          language={language === 'html' ? 'html' : language}
          theme="vs-dark"
          value={code}
          onChange={handleEditorChange}
          onMount={handleEditorDidMount}
          options={{
            minimap: { enabled: false },
            fontSize: 16,
            wordWrap: 'on',
            automaticLayout: true,
            padding: { top: 16 }
          }}
        />
      </div>
      
      <div className="output-console" style={{
        flex: 1,
        backgroundColor: '#1e1e1e',
        borderTop: '2px solid #333',
        padding: '10px',
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden'
      }}>
        <div style={{ color: '#888', marginBottom: '5px', fontWeight: 'bold' }}>
          {language === 'html' ? 'Live Preview' : 'Output Console'}
        </div>
        
        {language === 'html' ? (
          <iframe
            title="preview"
            srcDoc={output || code}
            style={{
              flex: 1,
              width: '100%',
              backgroundColor: 'white',
              border: 'none',
              borderRadius: '4px'
            }}
          />
        ) : (
          <pre style={{
            flex: 1,
            margin: 0,
            padding: '10px',
            backgroundColor: '#000',
            color: '#00ff00',
            overflowY: 'auto',
            fontFamily: 'monospace',
            borderRadius: '4px',
            whiteSpace: 'pre-wrap'
          }}>
            {output || (language === 'sql' ? 'Write SQL queries to see results...' : 'Click "Run Code" to see output here...')}
          </pre>
        )}
      </div>
    </div>
  );
};

export default CodeEditor;
