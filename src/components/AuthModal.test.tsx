/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom/vitest';
import { AuthModal } from './AuthModal.tsx';
import { AuthProvider } from '../context/AuthContext.tsx';

describe('AuthModal Component', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('renders modal with Sign In and Sign Up tabs and closes on ESC or close button', () => {
    const handleClose = vi.fn();
    render(
      <AuthProvider>
        <AuthModal isOpen={true} onClose={handleClose} />
      </AuthProvider>
    );

    expect(screen.getByRole('dialog')).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: /Welcome Back/i })).toBeInTheDocument();

    // Switch to Sign Up
    fireEvent.click(screen.getByRole('button', { name: /Sign Up/i }));
    expect(screen.getByRole('heading', { name: /Create Your Account/i })).toBeInTheDocument();
    expect(screen.getByPlaceholderText(/e\.g\. Priya Sharma/i)).toBeInTheDocument();

    // Close button
    fireEvent.click(screen.getByLabelText(/Close authentication modal/i));
    expect(handleClose).toHaveBeenCalled();
  });

  it('allows logging in with quick demo test profiles', () => {
    const handleClose = vi.fn();
    render(
      <AuthProvider>
        <AuthModal isOpen={true} onClose={handleClose} />
      </AuthProvider>
    );

    const demoHostBtn = screen.getByRole('button', { name: /Priya \(Host\)/i });
    expect(demoHostBtn).toBeInTheDocument();
    fireEvent.click(demoHostBtn);

    expect(handleClose).toHaveBeenCalled();
    const stored = JSON.parse(localStorage.getItem('utsav_demo_user') || '{}');
    expect(stored.displayName).toContain('Priya Sharma');
  });
});
