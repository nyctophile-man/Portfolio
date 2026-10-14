import { useEffect } from 'react';
import './App.css';
import About from './comp/About';
import Contact from './comp/Contact';
import Journey from './comp/Journey';
import Nav from './comp/Nav';
import NotFound from './comp/NotFound';
import { useLinkInterceptor, useRoute } from './router';

const TITLES = {
  '/': 'Ayushman — Student & Web Developer',
  '/journey': 'Journey — Ayushman',
  '/contact': 'Contact — Ayushman',
};

function App() {
  const path = useRoute();
  useLinkInterceptor();

  // route change -> upar scroll + title update
  useEffect(() => {
    window.scrollTo({ top: 0, left: 0, behavior: 'instant' });
    document.title = TITLES[path] || '404 — Page not found';
  }, [path]);

  let page;
  if (path === '/') page = <About />;
  else if (path === '/journey') page = <Journey />;
  else if (path === '/contact') page = <Contact />;
  else page = <NotFound />;

  return (
    <div className="App">
      {/* contact page has its own full-screen 3D world — no nav bar there */}
      {path !== '/contact' && <Nav />}
      {/* key -> page change par naya mount + halka fade-in */}
      <main className="page" key={path}>
        {page}
      </main>
    </div>
  );
}

export default App;

