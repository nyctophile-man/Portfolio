import { useEffect, useState } from 'react';



const FILE_LIKE = /\.[a-z0-9]+$/i;

export function currentPath() {
  const p = window.location.pathname.replace(/\/+$/, '');
  return p === '' ? '/' : p;
}

export function navigate(path) {
  if (currentPath() === path) return;
  window.history.pushState({}, '', path);
  window.dispatchEvent(new Event('app:navigate'));
}

export function useRoute() {
  const [path, setPath] = useState(currentPath);

  useEffect(() => {
    const update = () => setPath(currentPath());
    window.addEventListener('popstate', update);
    window.addEventListener('app:navigate', update);
    return () => {
      window.removeEventListener('popstate', update);
      window.removeEventListener('app:navigate', update);
    };
  }, []);

  return path;
}


export function useLinkInterceptor() {
  useEffect(() => {
    const onClick = (e) => {
      if (e.defaultPrevented || e.button !== 0) return;
      if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;

      const a = e.target instanceof Element ? e.target.closest('a[href]') : null;
      if (!a || a.target === '_blank' || a.hasAttribute('download')) return;

      let url;
      try {
        url = new URL(a.getAttribute('href'), window.location.href);
      } catch (err) {
        return; // malformed href -> browser ko khud handle karne do
      }

      if (url.origin !== window.location.origin) return; // external link
      if (url.search || url.hash) return; // query/anchor links chhod do
      if (FILE_LIKE.test(url.pathname)) return; // files jaise /cv.pdf

      e.preventDefault();
      navigate(url.pathname);
    };

    document.addEventListener('click', onClick);
    return () => document.removeEventListener('click', onClick);
  }, []);
}
