import React, { useState } from 'react';
import Editor from '@monaco-editor/react';

const CodeEditor = () => {
  const [language, setLanguage] = useState('javascript');
  
  const handleLanguageChange = (e) => {
    setLanguage(e.target.value);
  };

  return (
    <div className="editor-container">
      <div className="editor-header">
        <h2 className="editor-title">Collaborative Code Editor</h2>
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
          defaultValue="// Start coding..."
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
