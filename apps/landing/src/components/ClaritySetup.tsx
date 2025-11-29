'use client';

import { useEffect } from 'react';
import Clarity from '@microsoft/clarity';

const ClaritySetup = () => {
  useEffect(() => {
    const projectId = process.env.NEXT_PUBLIC_CLARITY_PROJECT_ID;

    if (projectId) {
      Clarity.init(projectId);
    } else {
      console.warn("Clarity Project ID is not defined. Clarity will not be initialized.");
    }
  }, []);

  return null;
};

export default ClaritySetup;