import React from 'react';

/**
 * Creates a key-value updater function for React state objects.
 * Reduces repetitive `setState(prev => ({ ...prev, [key]: value }))` patterns.
 * 
 * @param setter - React setState function
 * @returns Function that takes (key, value) and updates the object state
 */
export const updateByKey = <T extends object>(
  setter: React.Dispatch<React.SetStateAction<T>>,
) => <K extends keyof T>(key: K, value: T[K]) =>
  setter(prev => ({ ...prev, [key]: value }));