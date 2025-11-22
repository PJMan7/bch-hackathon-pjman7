// components/EventMint.tsx
import React from 'react';

const buttonClasses = "px-8 py-4 rounded-xl font-bold text-white text-lg shadow-lg transition-all bg-[#0AC18E] hover:bg-[#0a9f6e] active:scale-95 hover:shadow-xl focus:outline-none focus:ring-4 focus:ring-green-300";

const EventMint: React.FC = () => {
  const handleMint = () => {
    alert('Mint button clicked! Ready for real minting logic');
  };

  return (
    <button
      onClick={handleMint}
      className={buttonClasses}
    >
      Mint
    </button>
  );
};

export default EventMint;
