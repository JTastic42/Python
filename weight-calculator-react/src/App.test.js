import { render, screen } from '@testing-library/react';
import App from './App';

test('renders gym plate calculator', () => {
  render(<App />);
  const headingElement = screen.getByText(/gym plate calculator/i);
  expect(headingElement).toBeInTheDocument();
});
