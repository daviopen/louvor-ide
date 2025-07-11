import React from 'react';

const SimpleTest: React.FC = () => {
  return (
    <div className="p-8">
      <h1 className="text-3xl font-bold text-blue-600 mb-4">
        🎵 Louvor IDE - Teste Simples
      </h1>
      <div className="bg-white p-6 rounded-lg shadow-md">
        <h2 className="text-xl font-semibold mb-2">Frontend está funcionando!</h2>
        <p className="text-gray-600 mb-4">
          Se você está vendo esta mensagem, o React está renderizando corretamente.
        </p>
        <div className="space-y-2">
          <p>✅ React: Funcionando</p>
          <p>✅ Vite: Funcionando</p>
          <p>✅ Tailwind CSS: Funcionando</p>
          <p>✅ TypeScript: Funcionando</p>
        </div>
      </div>
    </div>
  );
};

export default SimpleTest;
