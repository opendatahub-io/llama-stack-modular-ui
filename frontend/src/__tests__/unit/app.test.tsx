import * as React from 'react';
import '@testing-library/jest-dom';
import { act, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import App from '@app/index';

// Mock the auth service
jest.mock('../../app/services/authService.ts', () => ({
  authService: {
    isAuthenticated: jest.fn(() => false),
    handleAuthenticationCheck: jest.fn(() => Promise.resolve(true)), // Mock OAuth as disabled (immediate access)
    loadConfig: jest.fn(() => Promise.resolve({ oauthEnabled: false })),
    getToken: jest.fn(() => null),
    clearToken: jest.fn(),
    addAuthListener: jest.fn(() => jest.fn()), // Return a mock unsubscribe function
  },
}));

describe('App tests', () => {
  beforeAll(() => {
    global.XMLHttpRequest = jest.fn(() => ({
      open: jest.fn(),
      send: jest.fn(),
      setRequestHeader: jest.fn(),
      abort: jest.fn(),
      readyState: 4,
      status: 200,
      responseText: JSON.stringify({}),
      onreadystatechange: null,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    })) as any;

    window.HTMLElement.prototype.scrollIntoView = jest.fn();
  });

  test('should render default App component', async () => {
    let component;

    await act(async () => {
      component = render(<App />);
    });

    // Wait for async operations to complete
    await waitFor(() => {
      expect(screen.getByRole('button', { name: 'Global navigation' })).toBeInTheDocument();
    });

    expect(component.asFragment()).toMatchSnapshot();
  }, 7000);

  it('should render a nav-toggle button', async () => {
    await act(async () => {
      render(<App />);
    });

    // Wait for async operations to complete
    await waitFor(() => {
      expect(screen.getByRole('button', { name: 'Global navigation' })).toBeVisible();
    });
  });

  // I'm fairly sure that this test not going to work properly no matter what we do since JSDOM doesn't actually
  // draw anything. We could potentially make something work, likely using a different test environment, but
  // using Cypress for this kind of test would be more efficient.
  it.skip('should hide the sidebar on smaller viewports', () => {
    Object.defineProperty(window, 'innerWidth', { writable: true, configurable: true, value: 600 });

    render(<App />);

    window.dispatchEvent(new Event('resize'));

    expect(screen.queryByRole('link', { name: 'Chatbot' })).not.toBeInTheDocument();
  });

  it('should expand the sidebar on larger viewports', async () => {
    await act(async () => {
      render(<App />);
    });

    // Wait for async operations to complete first
    await waitFor(() => {
      expect(screen.getByRole('button', { name: 'Global navigation' })).toBeInTheDocument();
    });

    await act(async () => {
      window.dispatchEvent(new Event('resize'));
      // eslint-disable-next-line no-promise-executor-return
      await new Promise((r) => setTimeout(r, 0)); // ensure full state flush
    });

    expect(screen.getByRole('link', { name: 'Chatbot' })).toBeVisible();
  });

  it('should hide the sidebar when clicking the nav-toggle button', async () => {
    const user = userEvent.setup();

    await act(async () => {
      render(<App />);
    });

    // Wait for async operations to complete first
    await waitFor(() => {
      expect(screen.getByRole('button', { name: 'Global navigation' })).toBeInTheDocument();
    });

    await act(async () => {
      window.dispatchEvent(new Event('resize'));
      // eslint-disable-next-line no-promise-executor-return
      await new Promise((resolve) => setTimeout(resolve, 0)); // allow React to process layout updates
    });

    const button = screen.getByRole('button', { name: 'Global navigation' });

    expect(screen.getByRole('link', { name: 'Chatbot' })).toBeVisible();

    await user.click(button);

    expect(screen.queryByRole('link', { name: 'Chatbot' })).not.toBeInTheDocument();
  });
});
