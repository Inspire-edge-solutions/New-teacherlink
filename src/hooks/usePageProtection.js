
import { useEffect } from 'react';
import { initPageProtection } from '../utils/Security/pageProtection';

export const usePageProtection = () => {
  useEffect(() => {
    const cleanup = initPageProtection();
    return cleanup;
  }, []);
};
