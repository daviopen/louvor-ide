import React from 'react';

const TestPage: React.FC = () => {
  return (
    <div style={{ padding: '20px', background: 'white', color: 'black' }}>
      <h1>🎵 Teste Louvor IDE</h1>
      <p>Se você vê esta mensagem, o React está funcionando!</p>
      <div style={{ background: '#f0f0f0', padding: '10px', margin: '10px 0' }}>
        <h2>Informações do Sistema:</h2>
        <ul>
          <li>Frontend: React + Vite</li>
          <li>Backend: Node.js + Express</li>
          <li>Database: Firestore</li>
          <li>Status: ✅ Online</li>
        </ul>
      </div>
      <button 
        style={{ padding: '10px 20px', background: '#007bff', color: 'white', border: 'none', borderRadius: '5px' }}
        onClick={() => alert('React está funcionando!')}
      >
        Testar Clique
      </button>
    </div>
  );
};

export default TestPage;
