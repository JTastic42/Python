import { render, screen, waitFor } from '@testing-library/react';
import App from './App';

test('renders gym plate calculator', async () => {
  render(<App />);
  
  // Wait for the app to finish loading
  await waitFor(() => {
    const headingElement = screen.getByText(/gym plate calculator/i);
    expect(headingElement).toBeInTheDocument();
  }, { timeout: 3000 });
});
