import React from 'react';
import { usePageProtection } from '../../hooks/usePageProtection';

const PageProtection = ({ children }) => {
  usePageProtection();
  return <>{children}</>;
};

export default PageProtection;
