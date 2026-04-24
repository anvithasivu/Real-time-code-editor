import React, { useState, useEffect, useRef } from 'react';
import Editor from '@monaco-editor/react';

const CodeEditor = ({ socket, roomId }) => {
  const [language, setLanguage] = useState('javascript');
  const [code, setCode] = useState('// Start coding...');
  const isSettingCode = useRef(false);

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

  const handleLanguageChange = (e) => {
    setLanguage(e.target.value);
  };

  const handleEditorChange = (value) => {
    if (isSettingCode.current) {
      isSettingCode.current = false;
      return;
    }

    setCode(value);
    socket.emit('code-change', { roomId, code: value });
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
    <div className="editor-container">
      <div className="editor-header">
        <div style={{display: 'flex', alignItems: 'center', gap: '15px'}}>
          <h2 className="editor-title">Collaborative Code Editor</h2>
          <span style={{fontSize: '0.9rem', color: '#4caf50', display: 'flex', alignItems: 'center', gap: '5px'}}>
            <div style={{width: '8px', height: '8px', backgroundColor: '#4caf50', borderRadius: '50%'}}></div>
            Room: {roomId}
          </span>
        </div>
        <select 
          className="language-selector" 
          value={language} 
          onChange={handleLanguageChange}
        >
          <option value="javascript">JavaScript</option>
          <option value="python">Python</option>
          <option value="cpp">C++</option>
        </select>
      </div>
      <div className="editor-wrapper">
        <Editor
          height="100%"
          language={language}
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
    </div>
  );
};

export default CodeEditor;
