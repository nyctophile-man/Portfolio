import React, { useState } from 'react';
import { useRoute } from '../router';

const ease = 'cubic-bezier(0.4, 0, 0.2, 1)';

function NavLink({ href, active, dark, children }) {
  const [hover, setHover] = useState(false);
  const on = hover || active;

  // theme: light (default) vs dark-gold (contact page)
  const fg = dark ? '#efe5cf' : '#1a1a1a';
  const accent = dark ? '#e0b66a' : '#1a1a1a';

  return (
    <a
      href={href}
      className="nv-link"
      aria-current={active ? 'page' : undefined}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      style={{
        position: 'relative',
        textDecoration: 'none',
        color: fg,
        fontWeight: 400,
        letterSpacing: '0.2px',
        whiteSpace: 'nowrap',
        padding: '8px 0',
        opacity: on ? 1 : 0.75,
        transition: `opacity 0.3s ${ease}`,
      }}
    >
      {children}

      <span
        style={{
          position: 'absolute',
          left: 0,
          bottom: 2,
          height: '1.5px',
          width: '100%',
          background: accent,
          transform: on ? 'scaleX(1)' : 'scaleX(0)',
          transformOrigin: 'left',
          transition: `transform 0.35s ${ease}`,
        }}
      />
    </a>
  );
}

export default function Nav() {
  const [open, setOpen] = useState(true);
  const path = useRoute();

  // match the nav to the contact page's dark-gold body
  const dark = path === '/contact';
  const pillBg = dark ? 'rgba(12, 10, 8, 0.6)' : 'rgba(255, 255, 255, 0.35)';
  const pillBorder = dark ? 'rgba(224, 182, 106, 0.3)' : 'rgba(255, 255, 255, 0.6)';
  const pillShadow = dark
    ? '0 8px 24px rgba(0,0,0,0.45), inset 0 1px 1px rgba(255,255,255,0.06)'
    : '0 8px 24px rgba(0,0,0,0.12), inset 0 1px 1px rgba(255,255,255,0.7)';
  const btnBg = dark ? '#e0b66a' : '#111';
  const btnIcon = dark ? '#0a0908' : '#ffffff';

  return (
    <div
      style={{
        position: 'sticky',
        top: 0,
        zIndex: 50,
        pointerEvents: 'none',
        fontFamily: 'Poppins, "Segoe UI", Arial, sans-serif',
      }}
    >
      {/* mobile / tablet ke liye compact nav — inline styles ko media query se override kiya */}
      <style>{`
        .nv-nav { padding: 24px 40px; }
        .nv-pill { padding: 6px; }
        .nv-links { gap: 48px; box-sizing: border-box; }
        .nv-links.nv-open { padding: 0 36px 0 44px; }
        .nv-link { font-size: 17px; }
        .nv-btn { width: 48px; height: 48px; }

        @media (max-width: 900px) {
          .nv-nav { padding: 16px 20px; }
          .nv-links.nv-open { gap: 28px; padding: 0 20px 0 24px; }
        }
        @media (max-width: 600px) {
          .nv-nav {
            padding: 12px max(14px, env(safe-area-inset-right)) max(12px, env(safe-area-inset-bottom)) max(14px, env(safe-area-inset-left));
            justify-content: center;
          }
          .nv-pill { padding: 5px; }
          .nv-links.nv-open { gap: 18px; padding: 0 12px 0 16px; }
          .nv-link { font-size: 15px; padding: 10px 0; }
          .nv-btn { width: 42px; height: 42px; }
        }
        @media (max-width: 380px) {
          .nv-links.nv-open { gap: 13px; padding: 0 10px 0 12px; }
          .nv-link { font-size: 14px; }
        }
      `}</style>
      <nav
        className="nv-nav"
        style={{
          display: 'flex',
          justifyContent: 'flex-end',
        }}
      >

        <div
          className="nv-pill"
          style={{
            display: 'flex',
            alignItems: 'center',
            borderRadius: '999px',
            background: pillBg,
            border: `1px solid ${pillBorder}`,
            backdropFilter: 'blur(14px)',
            WebkitBackdropFilter: 'blur(14px)',
            boxShadow: pillShadow,
            pointerEvents: 'auto',
          }}
        >

          <div
            className={open ? 'nv-links nv-open' : 'nv-links'}
            style={{
              display: 'flex',
              alignItems: 'center',
              overflow: 'hidden',
              maxWidth: open ? '600px' : '0px',
              opacity: open ? 1 : 0,
              transform: open ? 'translateX(0)' : 'translateX(30px)',
              transition: `all 0.5s ${ease}`,
              pointerEvents: open ? 'auto' : 'none',
            }}
          >
            <NavLink href="/" active={path === '/'} dark={dark}>About me</NavLink>
            <NavLink href="/journey" active={path === '/journey'} dark={dark}>Journey</NavLink>
            <NavLink href="/contact" active={path === '/contact'} dark={dark}>Contact</NavLink>
          </div>


          <button
            className="nv-btn"
            onClick={() => setOpen(!open)}
            aria-label="Toggle menu"
            style={{
              borderRadius: '50%',
              border: 'none',
              background: btnBg,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0,
              transition: `transform 0.5s ${ease}`,
              transform: open ? 'rotate(0deg)' : 'rotate(180deg)',
            }}
          >
            <svg
              width="20"
              height="20"
              viewBox="0 0 24 24"
              fill="none"
              stroke={btnIcon}
              strokeWidth="2"
              strokeLinecap="round"
            >
              {open ? (
                <>
                  <line x1="6" y1="6" x2="18" y2="18" />
                  <line x1="18" y1="6" x2="6" y2="18" />
                </>
              ) : (
                <>
                  <line x1="4" y1="8" x2="20" y2="8" />
                  <line x1="4" y1="12" x2="20" y2="12" />
                  <line x1="4" y1="16" x2="20" y2="16" />
                </>
              )}
            </svg>
          </button>
        </div>
      </nav>
    </div>
  );
}