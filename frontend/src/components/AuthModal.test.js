import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import AuthModal from './AuthModal';
import { AuthProvider } from '../context/AuthContext';
import api from '../services/api';

jest.mock('../services/api');

const renderWithAuth = async (ui) => {
  api.get.mockRejectedValue({ response: { status: 401 } });
  let rendered;
  await React.act(async () => {
    rendered = render(
      <AuthProvider>
        {ui}
      </AuthProvider>
    );
  });
  return rendered;
};

describe('AuthModal Component', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('renders in Sign In mode by default', async () => {
    await renderWithAuth(
      <AuthModal isOpen={true} onClose={jest.fn()} />
    );

    expect(screen.getByText('Continue with Google')).toBeInTheDocument();
    expect(screen.getByLabelText(/Email Address/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/Password/i)).toBeInTheDocument();
    expect(screen.getByTestId('auth-submit-btn')).toHaveTextContent(/Sign In/i);
  });

  test('switches to Create Account mode and shows name and min 8 chars hint', async () => {
    await renderWithAuth(
      <AuthModal isOpen={true} onClose={jest.fn()} />
    );

    const createAccountTab = screen.getByTestId('auth-mode-signup');
    fireEvent.click(createAccountTab);

    expect(screen.getByLabelText(/Full Name/i)).toBeInTheDocument();
    expect(screen.getByText(/Min. 8 characters/i)).toBeInTheDocument();
    expect(screen.getByTestId('auth-submit-btn')).toHaveTextContent(/Create Account/i);
  });

  test('displays validation error if email is invalid', async () => {
    await renderWithAuth(
      <AuthModal isOpen={true} onClose={jest.fn()} />
    );

    const emailInput = screen.getByLabelText(/Email Address/i);
    const passwordInput = screen.getByLabelText(/Password/i);
    const submitBtn = screen.getByTestId('auth-submit-btn');

    fireEvent.change(emailInput, { target: { value: 'invalid-email' } });
    fireEvent.change(passwordInput, { target: { value: '12345678' } });
    fireEvent.click(submitBtn);

    expect(await screen.findByText(/Please enter a valid email address/i)).toBeInTheDocument();
  });

  test('displays validation error if password is less than 8 chars on signup', async () => {
    await renderWithAuth(
      <AuthModal isOpen={true} onClose={jest.fn()} />
    );

    fireEvent.click(screen.getByTestId('auth-mode-signup'));

    const emailInput = screen.getByLabelText(/Email Address/i);
    const passwordInput = screen.getByLabelText(/Password/i);
    const submitBtn = screen.getByTestId('auth-submit-btn');

    fireEvent.change(emailInput, { target: { value: 'test@example.com' } });
    fireEvent.change(passwordInput, { target: { value: 'short' } });
    fireEvent.click(submitBtn);

    expect(await screen.findByText(/Password must be at least 8 characters long/i)).toBeInTheDocument();
  });

  test('closes on Escape key press', async () => {
    const handleClose = jest.fn();
    await renderWithAuth(
      <AuthModal isOpen={true} onClose={handleClose} />
    );

    fireEvent.keyDown(window, { key: 'Escape' });
    expect(handleClose).toHaveBeenCalled();
  });

  test('displays contextual title and subtitle when provided', async () => {
    await renderWithAuth(
      <AuthModal
        isOpen={true}
        onClose={jest.fn()}
        title="Custom Save Title"
        subtitle="Custom Save Subtitle"
      />
    );

    expect(screen.getByText('Custom Save Title')).toBeInTheDocument();
    expect(screen.getByText('Custom Save Subtitle')).toBeInTheDocument();
  });
});
