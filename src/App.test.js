import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import App from './App';

test('renders landing page headline', () => {
  render(
    <MemoryRouter>
      <App />
    </MemoryRouter>,
  );
  const heading = screen.getByText(/Discover Better Investment Opportunities/i);
  expect(heading).toBeInTheDocument();
});
