import React, { useEffect, useRef } from 'react';
import AceEditor from 'react-ace';
import 'ace-builds/src-noconflict/mode-javascript';
import 'ace-builds/src-noconflict/mode-python';
import 'ace-builds/src-noconflict/theme-monokai';
import 'ace-builds/src-noconflict/theme-github';
import 'ace-builds/src-noconflict/theme-twilight';
import 'ace-builds/src-noconflict/theme-xcode';

export type AceTheme = 'monokai' | 'github' | 'twilight' | 'xcode';

interface AceCodeEditorProps {
  value: string;
  onChange: (value: string) => void;
  language: 'javascript' | 'python';
  theme: AceTheme;
  className?: string;
  onFocus?: () => void;
  onEditorLoad?: (editor: any) => void;
}

const AceCodeEditor: React.FC<AceCodeEditorProps> = ({
  value,
  onChange,
  language,
  theme,
  className = '',
  onFocus,
  onEditorLoad
}) => {
  const editorRef = useRef<any>(null);

  useEffect(() => {
    if (editorRef.current && onEditorLoad) {
      onEditorLoad(editorRef.current);
    }
  }, [onEditorLoad]);

  return (
    <div className={`ace-editor-container ${className}`}>
      <AceEditor
        ref={editorRef}
        mode={language}
        theme={theme}
        value={value}
        onChange={onChange}
        onFocus={onFocus}
        name="code-editor"
        editorProps={{ $blockScrolling: true }}
        setOptions={{
          enableBasicAutocompletion: true,
          enableLiveAutocompletion: true,
          enableSnippets: true,
          showLineNumbers: true,
          tabSize: 2,
          fontSize: 14,
          fontFamily: 'Monaco, Menlo, "Ubuntu Mono", monospace',
          showGutter: true,
          highlightActiveLine: true,
          wrap: true,
          autoScrollEditorIntoView: true,
          minLines: 21,
          maxLines: 21  
        }}
        style={{
          width: '100%',
          height:'100%',
          minHeight: '300px'
        }}
      />
    </div>
  );
};

export default AceCodeEditor;

