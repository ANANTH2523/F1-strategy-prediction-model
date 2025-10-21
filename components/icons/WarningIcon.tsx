import React from 'react';

export const WarningIcon: React.FC<React.SVGProps<SVGSVGElement>> = (props) => (
  <svg 
    xmlns="http://www.w3.org/2000/svg" 
    viewBox="0 0 20 20" 
    fill="currentColor" 
    {...props}
  >
    <path 
      fillRule="evenodd" 
      d="M8.485 2.495c.646-1.133 2.384-1.133 3.03 0l6.28 11.02a1.75 1.75 0 01-1.515 2.485H3.72a1.75 1.75 0 01-1.515-2.485l6.28-11.02zM10 15a1 1 0 110-2 1 1 0 010 2zm-1-4a1 1 0 011-1h.01a1 1 0 110 2H10a1 1 0 01-1-1z" 
      clipRule="evenodd" 
    />
  </svg>
);