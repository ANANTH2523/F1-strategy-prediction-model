import React from 'react';

export const VscIcon: React.FC<React.SVGProps<SVGSVGElement>> = (props) => (
  <svg 
    xmlns="http://www.w3.org/2000/svg" 
    viewBox="0 0 20 20" 
    fill="currentColor" 
    {...props}
  >
    <path 
      fillRule="evenodd" 
      d="M2 3a1 1 0 011-1h14a1 1 0 011 1v14a1 1 0 01-1 1H3a1 1 0 01-1-1V3zm2 3a.75.75 0 01.75-.75h4.5a.75.75 0 010 1.5h-3.75v1.5h3.75a.75.75 0 010 1.5h-3.75v1.5h3.75a.75.75 0 010 1.5h-4.5a.75.75 0 01-.75-.75V6zm9.25 0a.75.75 0 00-1.5 0v5.5a.75.75 0 001.5 0V6zM12 6a.75.75 0 01.75-.75h.01a.75.75 0 01.75.75v.01a.75.75 0 01-.75.75h-.01a.75.75 0 01-.75-.75V6z" 
      clipRule="evenodd" 
    />
  </svg>
);