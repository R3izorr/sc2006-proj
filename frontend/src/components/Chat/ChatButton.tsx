import React from "react";

interface ChatButtonProps {
  onClick: () => void;
}

export default function ChatButton({ onClick }: ChatButtonProps) {
  return (
    <button
      onClick={onClick}
      style={{
        position: 'fixed',
        bottom: '310px', // Above the Heat Map button (which is at 200px) with more spacing
        right: '10px',
        zIndex: 1000,
        width: '32px',
        height: '32px',
        borderRadius: '4px',
        background: 'linear-gradient(135deg, #7c3aed 0%, #9333ea 100%)',
        border: '1px solid #7c3aed',
        color: 'white',
        boxShadow: '0 2px 6px rgba(124, 58, 237, 0.3)',
        cursor: 'pointer',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        transition: 'all 0.2s ease',
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.transform = 'scale(1.05)';
        e.currentTarget.style.boxShadow = '0 4px 8px rgba(124, 58, 237, 0.4)';
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.transform = 'scale(1)';
        e.currentTarget.style.boxShadow = '0 2px 6px rgba(124, 58, 237, 0.3)';
      }}
      title="AI Chat Assistant"
      aria-label="Open AI Chat"
    >
      <svg
        width="18"
        height="18"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
      </svg>
      <span
        style={{
          position: 'absolute',
          top: '-3px',
          right: '-3px',
          width: '10px',
          height: '10px',
          backgroundColor: '#10b981',
          borderRadius: '50%',
          border: '2px solid white',
        }}
      />
    </button>
  );
}

