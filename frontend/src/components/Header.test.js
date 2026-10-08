import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import Header from './Header';
import { AuthProvider } from '../context/AuthContext';
import api from '../services/api';

jest.mock('../services/api');

describe('Header Component Authentication UX', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('renders anonymous navigation and Sign In CTA when not logged in', async () => {
    api.get.mockRejectedValueOnce({ response: { status: 401 } });

    render(
      <AuthProvider>
        <Header navigate={jest.fn()} isDark={false} toggleTheme={jest.fn()} showNavigation={true} />
      </AuthProvider>
    );

    await waitFor(() => {
      expect(screen.getByText('Sign In')).toBeInTheDocument();
    });

    expect(screen.getByText('Get Started')).toBeInTheDocument();
    expect(screen.getByText('Dashboard')).toBeInTheDocument();
    expect(screen.getByText('My Plans')).toBeInTheDocument();
  });

  test('renders authenticated controls with user name and dropdown when logged in', async () => {
    api.get.mockResolvedValueOnce({
      data: {
        success: true,
        data: {
          user: { id: 'usr-123', email: 'founder@silicon.io', name: 'Ada Lovelace' }
        }
      }
    });

    render(
      <AuthProvider>
        <Header navigate={jest.fn()} isDark={false} toggleTheme={jest.fn()} showNavigation={true} />
      </AuthProvider>
    );

    await waitFor(() => {
      expect(screen.getByText('Ada Lovelace')).toBeInTheDocument();
    });

    expect(screen.getByText('New Plan')).toBeInTheDocument();
    expect(screen.queryByText(/^Sign In$/i)).not.toBeInTheDocument();

    // Open user dropdown
    fireEvent.click(screen.getByText('Ada Lovelace'));
    expect(screen.getByText('Sign Out')).toBeInTheDocument();
  });

  test('signs out user when Sign Out is clicked', async () => {
    api.get.mockResolvedValueOnce({
      data: {
        success: true,
        data: {
          user: { id: 'usr-123', email: 'founder@silicon.io', name: 'Ada Lovelace' }
        }
      }
    });
    api.post.mockResolvedValueOnce({ data: { success: true } });

    render(
      <AuthProvider>
        <Header navigate={jest.fn()} isDark={false} toggleTheme={jest.fn()} showNavigation={true} />
      </AuthProvider>
    );

    await waitFor(() => {
      expect(screen.getByText('Ada Lovelace')).toBeInTheDocument();
    });

    // Open dropdown and click Sign Out
    fireEvent.click(screen.getByText('Ada Lovelace'));
    fireEvent.click(screen.getByText('Sign Out'));

    await waitFor(() => {
      expect(screen.getByText('Sign In')).toBeInTheDocument();
    });
    expect(api.post).toHaveBeenCalledWith('/api/auth/logout');
  });
});
