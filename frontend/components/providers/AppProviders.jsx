'use client';

import React from 'react';
import { AppDataProvider } from '../../src/context/AppDataContext';

export default function AppProviders({ children }) {
  return <AppDataProvider>{children}</AppDataProvider>;
}
