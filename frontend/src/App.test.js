import { render, screen, waitFor } from '@testing-library/react';
import App from './App';

test('renders StartupAI application and brand', async () => {
  render(<App />);
  await waitFor(() => {
    const brandElements = screen.getAllByText(/StartupAI/i);
    expect(brandElements.length).toBeGreaterThan(0);
  });
});
