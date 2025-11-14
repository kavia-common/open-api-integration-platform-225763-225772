import { render, screen } from '@testing-library/react';
import App from './App';

test('renders Ocean News header and tabs', () => {
  render(<App />);
  expect(screen.getByText(/Ocean News/i)).toBeInTheDocument();
  expect(screen.getByRole('button', { name: /Top Headlines/i })).toBeInTheDocument();
  expect(screen.getByRole('button', { name: /Search/i })).toBeInTheDocument();
});
