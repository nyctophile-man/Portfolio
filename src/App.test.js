import { render, screen, fireEvent } from '@testing-library/react';
import App from './App';

/* About ka 3D TV-head scene (Three.js + WebGL + canvas) jsdom mein
   chal nahi sakta, isliye us page ko mock kar diya — routing baaki
   poore App par asli components ke saath test hoti hai. */
jest.mock('./comp/About', () => () => <div data-testid="about-page" />);

beforeEach(() => {
  Object.defineProperty(window, 'scrollTo', { writable: true, value: jest.fn() });
  window.history.pushState({}, '', '/');
  document.title = '';
});

test('home route par About page aur nav ke teeno links dikhte hain', () => {
  render(<App />);
  expect(screen.getByTestId('about-page')).toBeInTheDocument();
  expect(screen.getByText('About me')).toBeInTheDocument();
  expect(screen.getByText('Journey')).toBeInTheDocument();
  expect(screen.getByText('Contact')).toBeInTheDocument();
  expect(document.title).toBe('Ayushman — Student & Web Developer');
});

test('nav link click se page reload ke bagair Journey page khulta hai', () => {
  render(<App />);
  fireEvent.click(screen.getByText('Journey'));
  expect(document.querySelector('.jr')).toBeInTheDocument();
  expect(window.location.pathname).toBe('/journey');
  expect(document.title).toBe('Journey — Ayushman');
});

test('contact page ka form validation aur success state', () => {
  render(<App />);
  fireEvent.click(screen.getByText('Contact'));
  expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('something good.');

  // khali submit -> error
  fireEvent.click(screen.getByRole('button', { name: /send message/i }));
  expect(screen.getByRole('alert')).toHaveTextContent('Pehle saare fields bhar do.');

  // galat email -> error
  fireEvent.change(screen.getByLabelText('Name'), { target: { value: 'Ayushman' } });
  fireEvent.change(screen.getByLabelText('Email'), { target: { value: 'not-an-email' } });
  fireEvent.change(screen.getByLabelText('Message'), { target: { value: 'Hello!' } });
  fireEvent.click(screen.getByRole('button', { name: /send message/i }));
  expect(screen.getByRole('alert')).toHaveTextContent('Email thoda ajeeb');

  // sahi email -> success
  fireEvent.change(screen.getByLabelText('Email'), { target: { value: 'ayu@example.com' } });
  fireEvent.click(screen.getByRole('button', { name: /send message/i }));
  expect(screen.getByRole('heading', { name: /message received/i })).toBeInTheDocument();
  expect(screen.getByRole('button', { name: /send another/i })).toBeInTheDocument();
});

test('unknown route par 404 page dikhta hai', () => {
  window.history.pushState({}, '', '/kuch-bhi');
  render(<App />);
  expect(screen.getByRole('heading', { level: 1, name: '404' })).toBeInTheDocument();
  expect(document.title).toBe('404 — Page not found');
});

