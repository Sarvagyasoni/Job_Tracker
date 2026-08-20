import { createContext } from 'react';
import type { ToastContextType } from './Toast';

export const ToastContext = createContext<ToastContextType | undefined>(undefined);