// スタイル定義
const styles = {
  popup: {
    position: 'absolute',
    zIndex: '10000',
    backgroundColor: 'white',
    border: '1px solid #ccc',
    borderRadius: '5px',
    padding: '10px',
    boxShadow: '0 2px 5px rgba(0, 0, 0, 0.2)',
    maxWidth: '400px',
    maxHeight: '300px',
    overflowY: 'auto',
    fontSize: '14px',
    fontFamily: 'Arial, sans-serif',
    color: '#333'
  },
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    marginBottom: '5px'
  },
  title: {
    fontWeight: 'bold'
  },
  closeBtn: {
    border: 'none',
    background: 'none',
    cursor: 'pointer',
    fontSize: '16px',
    padding: '0 5px',
    color: '#333'
  },
  content: {
    margin: '5px 0',
    whiteSpace: 'pre-wrap',
    wordBreak: 'break-word',
    padding: '8px',
    borderRadius: '4px'
  },
  normalContent: {
    color: '#000',
    backgroundColor: '#f8f8f8'
  },
  errorContent: {
    fontFamily: 'monospace',
    backgroundColor: '#fff0f0',
    color: '#d32f2f'
  },
  copyBtn: {
    padding: '5px 10px',
    backgroundColor: '#f0f0f0',
    border: '1px solid #ccc',
    borderRadius: '3px',
    cursor: 'pointer',
    marginTop: '5px',
    color: '#333'
  },
  tweetTranslation: {
    marginTop: '8px',
    padding: '8px 12px',
    backgroundColor: '#46627e',
    borderRadius: '8px',
    fontSize: '14px',
    color: '#FFF',
    whiteSpace: 'pre-wrap',
    wordBreak: 'break-word',
    lineHeight: '1.4'
  },
  tweetTranslationError: {
    backgroundColor: '#fff0f0',
    color: '#d32f2f'
  }
};

// スタイルをエレメントに適用する関数
function applyStyles(element, styleObj) {
  Object.keys(styleObj).forEach(key => {
    element.style[key] = styleObj[key];
  });
}

export { styles, applyStyles };