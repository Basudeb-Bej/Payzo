// frontend/src/components/navbar.jsx
import { useEffect, useRef, useState } from "react";
import logo from "../assets/image2.png";

const NAV = [
  ["Home", "#home"],
  ["Features", "#features"],
  ["How it works", "#how"],
  ["Security", "#security"],
  ["FAQ", "#faq"],
];

const ICONS = {
  menu: "M4 6h16M4 12h16M4 18h16",
  x: "M6 6l12 12M18 6L6 18",
};

function Icon({ name, className = "h-5 w-5" }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
    >
      <path d={ICONS[name]} />
    </svg>
  );
}

function Logo() {
  return (
    <img
      src={logo}
      alt="Payzo Logo"
      className="h-9 w-36 object-contain object-left sm:h-10 sm:w-44 lg:h-11 lg:w-44"
    />
  );
}

export default function Navbar({ onLogin, onRegister }) {
  const [menuOpen, setMenuOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [activeHash, setActiveHash] = useState("#home");

  const triggerRef = useRef(null);
  const dialogRef = useRef(null);
  const closeButtonRef = useRef(null);

  // Track scroll position for header elevation & active section highlight
  useEffect(() => {
    const onScroll = () => {
      setScrolled(window.scrollY > 12);

      const sections = NAV.map(([, href]) => document.querySelector(href)).filter(Boolean);
      const offset = window.scrollY + 140;
      let current = "#home";
      for (const sec of sections) {
        if (sec.offsetTop <= offset) {
          current = `#${sec.id}`;
        }
      }
      setActiveHash(current);
    };

    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  // Lock background scrolling while the mobile menu is open
  useEffect(() => {
    const previousOverflow = document.body.style.overflow;
    if (menuOpen) document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [menuOpen]);

  // Focus trap and Escape handling for mobile drawer
  useEffect(() => {
    if (!menuOpen) return undefined;

    closeButtonRef.current?.focus();

    const handleKeyDown = (event) => {
      if (event.key === "Escape") {
        event.preventDefault();
        setMenuOpen(false);
        return;
      }

      if (event.key !== "Tab") return;

      const dialog = dialogRef.current;
      if (!dialog) return;

      const focusable = dialog.querySelectorAll(
        'a[href], button:not([disabled]), [tabindex]:not([tabindex="-1"])'
      );
      const items = Array.from(focusable).filter((item) => item.offsetParent !== null);
      if (!items.length) return;

      const first = items[0];
      const last = items[items.length - 1];

      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      triggerRef.current?.focus();
    };
  }, [menuOpen]);

  const closeMenu = () => setMenuOpen(false);

  const handleLogin = () => {
    closeMenu();
    onLogin?.();
  };

  const handleRegister = () => {
    closeMenu();
    onRegister?.();
  };

  return (
    <>
      <header
        className={`sticky top-0 z-40 border-b transition-colors duration-200 backdrop-blur-xl ${
          scrolled
            ? "border-white/15 bg-[#071225]/95 shadow-lg shadow-black/20"
            : "border-white/10 bg-[#071225]/85"
        }`}
      >
        <nav
          className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-4 py-3 sm:px-6 sm:py-3.5 lg:px-10"
          aria-label="Main navigation"
        >
          <a href="#home" className="flex shrink-0 items-center" aria-label="Payzo home">
            <Logo />
          </a>

          {/* Desktop navigation */}
          <div className="hidden items-center gap-6 text-sm lg:flex xl:gap-8">
            {NAV.map(([label, href]) => {
              const isActive = activeHash === href;
              return (
                <a
                  key={href}
                  href={href}
                  className={`whitespace-nowrap font-medium transition ${
                    isActive ? "text-blue-400" : "text-slate-300 hover:text-white"
                  }`}
                >
                  {label}
                </a>
              );
            })}
          </div>

          {/* Desktop CTA buttons */}
          <div className="hidden shrink-0 items-center gap-2 lg:flex">
            <button
              type="button"
              onClick={onLogin}
              className="min-h-10 rounded-full px-4 py-2 text-sm font-semibold text-slate-200 transition hover:bg-white/10 hover:text-white dark:hover:bg-slate-800/10"
            >
              Sign in
            </button>

            <button
              type="button"
              onClick={onRegister}
              className="min-h-10 rounded-full bg-blue-600 px-5 py-2 text-sm font-semibold text-white shadow-lg shadow-blue-600/25 transition hover:-translate-y-0.5 hover:bg-blue-500"
            >
              Get Started →
            </button>
          </div>

          {/* Mobile and tablet menu button */}
          <button
            ref={triggerRef}
            type="button"
            onClick={() => setMenuOpen((open) => !open)}
            className="flex h-11 w-11 items-center justify-center rounded-xl border border-white/10 text-white transition hover:bg-white/10 lg:hidden dark:hover:bg-slate-800/10"
            aria-label={menuOpen ? "Close menu" : "Open menu"}
            aria-expanded={menuOpen}
            aria-controls="payzo-mobile-menu"
          >
            <Icon name={menuOpen ? "x" : "menu"} className="h-6 w-6" />
          </button>
        </nav>
      </header>

      {/* Mobile and tablet navigation drawer */}
      {menuOpen && (
        <div
          ref={dialogRef}
          id="payzo-mobile-menu"
          className="fixed inset-0 z-50 lg:hidden"
          role="dialog"
          aria-modal="true"
          aria-label="Payzo navigation menu"
        >
          <button
            type="button"
            className="absolute inset-0 h-full w-full cursor-default bg-black/70 backdrop-blur-sm"
            aria-label="Close navigation menu"
            onClick={closeMenu}
          />

          <div className="absolute right-0 top-0 flex h-full w-[88%] max-w-sm flex-col border-l border-white/10 bg-[#0b1a30] p-5 shadow-2xl sm:w-[75%]">
            <div className="mb-8 flex items-center justify-between">
              <a href="#home" onClick={closeMenu} aria-label="Payzo home">
                <Logo />
              </a>

              <button
                ref={closeButtonRef}
                type="button"
                onClick={closeMenu}
                aria-label="Close menu"
                className="flex h-11 w-11 items-center justify-center rounded-xl border border-white/10 text-white transition hover:bg-white/10 dark:hover:bg-slate-800/10"
              >
                <Icon name="x" className="h-5 w-5" />
              </button>
            </div>

            <nav className="grid gap-1.5" aria-label="Page sections">
              {NAV.map(([label, href]) => {
                const isActive = activeHash === href;
                return (
                  <a
                    key={href}
                    href={href}
                    onClick={closeMenu}
                    className={`flex min-h-12 items-center rounded-xl px-4 py-3 text-base font-medium transition ${
                      isActive
                        ? "bg-blue-500/15 text-blue-300"
                        : "text-slate-200 hover:bg-white/5 hover:text-white dark:hover:bg-slate-800/5"
                    }`}
                  >
                    {label}
                  </a>
                );
              })}
            </nav>

            <div className="mt-auto grid gap-3 pb-[max(0.5rem,env(safe-area-inset-bottom))]">
              <button
                type="button"
                onClick={handleRegister}
                className="min-h-12 rounded-full bg-blue-600 py-3 text-sm font-semibold text-white shadow-lg shadow-blue-600/30 transition hover:bg-blue-500"
              >
                Create Account
              </button>

              <button
                type="button"
                onClick={handleLogin}
                className="min-h-12 rounded-full border border-white/20 py-3 text-sm font-semibold text-white transition hover:bg-white/10 dark:hover:bg-slate-800/10"
              >
                Sign in
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}










// // frontend/src/components/navbar.jsx
// import { useEffect, useRef, useState } from "react";
// import logo from "../assets/image2.png";

// const NAV = [
//     ["Home", "#home"],
//     ["Features", "#features"],
//     ["How it works", "#how"],
//     ["Security", "#security"],
//     ["FAQ", "#faq"],
// ];

// const ICONS = {
//     menu: "M4 6h16M4 12h16M4 18h16",
//     x: "M6 6l12 12M18 6L6 18",
// };

// function Icon({ name, className = "h-5 w-5" }) {
//     return (
//         <svg
//             viewBox="0 0 24 24"
//             fill="none"
//             stroke="currentColor"
//             strokeWidth="1.8"
//             strokeLinecap="round"
//             strokeLinejoin="round"
//             className={className}
//             aria-hidden="true"
//         >
//             <path d={ICONS[name]} />
//         </svg>
//     );
// }

// function Logo() {
//     return (
//         <img
//             src={logo}
//             alt="Payzo Logo"
//             className="h-9 w-36 object-contain object-left sm:h-10 sm:w-44 lg:h-12 lg:w-48"
//         />
//     );
// }

// export default function Navbar({ onLogin, onRegister }) {
//     const [menuOpen, setMenuOpen] = useState(false);
//     const triggerRef = useRef(null);
//     const dialogRef = useRef(null);
//     const closeButtonRef = useRef(null);

//     // Lock background scrolling while the mobile menu is open.
//     useEffect(() => {
//         const previousOverflow = document.body.style.overflow;

//         if (menuOpen) {
//             document.body.style.overflow = "hidden";
//         }

//         return () => {
//             document.body.style.overflow = previousOverflow;
//         };
//     }, [menuOpen]);

//     // Focus management and keyboard navigation.
//     useEffect(() => {
//         if (!menuOpen) return undefined;

//         closeButtonRef.current?.focus();

//         const handleKeyDown = (event) => {
//             if (event.key === "Escape") {
//                 event.preventDefault();
//                 setMenuOpen(false);
//                 return;
//             }

//             if (event.key !== "Tab") return;

//             const dialog = dialogRef.current;
//             if (!dialog) return;

//             const focusable = dialog.querySelectorAll(
//                 'a[href], button:not([disabled]), [tabindex]:not([tabindex="-1"])'
//             );

//             const items = Array.from(focusable).filter(
//                 (item) => item.offsetParent !== null
//             );

//             if (!items.length) return;

//             const first = items[0];
//             const last = items[items.length - 1];

//             if (event.shiftKey && document.activeElement === first) {
//                 event.preventDefault();
//                 last.focus();
//             } else if (
//                 !event.shiftKey &&
//                 document.activeElement === last
//             ) {
//                 event.preventDefault();
//                 first.focus();
//             }
//         };

//         document.addEventListener("keydown", handleKeyDown);

//         return () => {
//             document.removeEventListener("keydown", handleKeyDown);
//             triggerRef.current?.focus();
//         };
//     }, [menuOpen]);

//     const closeMenu = () => setMenuOpen(false);

//     const handleLogin = () => {
//         closeMenu();
//         onLogin?.();
//     };

//     const handleRegister = () => {
//         closeMenu();
//         onRegister?.();
//     };

//     return (
//         <>
//             <header className="sticky top-0 z-40 border-b border-white/10 bg-[#071225]/95 backdrop-blur-xl">
//                 <nav
//                     className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-4 py-3 sm:px-6 sm:py-4 lg:px-10"
//                     aria-label="Main navigation"
//                 >
//                     <a
//                         href="#home"
//                         className="flex shrink-0 items-center"
//                         aria-label="Payzo home"
//                     >
//                         <Logo />
//                     </a>

//                     {/* Desktop navigation */}
//                     <div className="hidden items-center gap-6 text-sm text-slate-300 xl:gap-8 lg:flex">
//                         {NAV.map(([label, href]) => (
//                             <a
//                                 key={href}
//                                 href={href}
//                                 className="whitespace-nowrap transition hover:text-blue-400"
//                             >
//                                 {label}
//                             </a>
//                         ))}
//                     </div>

//                     {/* Desktop buttons */}
//                     <div className="hidden shrink-0 items-center gap-2 lg:flex">
//                         <button
//                             type="button"
//                             onClick={onLogin}
//                             className="min-h-11 rounded-full px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-white/10"
//                         >
//                             Login
//                         </button>

//                         <button
//                             type="button"
//                             onClick={onRegister}
//                             className="min-h-11 rounded-full bg-blue-600 px-5 py-2.5 text-sm font-semibold shadow-lg shadow-blue-600/30 transition hover:-translate-y-0.5 hover:bg-blue-500"
//                         >
//                             Get Started →
//                         </button>
//                     </div>

//                     {/* Mobile and tablet menu button */}
//                     <button
//                         ref={triggerRef}
//                         type="button"
//                         onClick={() => setMenuOpen((open) => !open)}
//                         className="flex h-11 w-11 items-center justify-center rounded-xl border border-white/10 text-white transition hover:bg-white/10 lg:hidden"
//                         aria-label={menuOpen ? "Close menu" : "Open menu"}
//                         aria-expanded={menuOpen}
//                         aria-controls="payzo-mobile-menu"
//                     >
//                         <Icon
//                             name={menuOpen ? "x" : "menu"}
//                             className="h-6 w-6"
//                         />
//                     </button>
//                 </nav>
//             </header>

//             {/* Mobile and tablet navigation drawer */}
//             {menuOpen && (
//                 <div
//                     ref={dialogRef}
//                     id="payzo-mobile-menu"
//                     className="fixed inset-0 z-50 lg:hidden"
//                     role="dialog"
//                     aria-modal="true"
//                     aria-label="Payzo navigation menu"
//                 >
//                     {/* Background overlay */}
//                     <button
//                         type="button"
//                         className="absolute inset-0 h-full w-full cursor-default bg-black/70"
//                         aria-label="Close navigation menu"
//                         onClick={closeMenu}
//                     />

//                     {/* Drawer */}
//                     <div className="absolute right-0 top-0 flex h-full w-[88%] max-w-sm flex-col border-l border-white/10 bg-[#0b1a30] p-5 shadow-2xl sm:w-[75%]">
//                         <div className="mb-8 flex items-center justify-between">
//                             <a
//                                 href="#home"
//                                 onClick={closeMenu}
//                                 aria-label="Payzo home"
//                             >
//                                 <Logo />
//                             </a>

//                             <button
//                                 ref={closeButtonRef}
//                                 type="button"
//                                 onClick={closeMenu}
//                                 aria-label="Close menu"
//                                 className="flex h-11 w-11 items-center justify-center rounded-xl border border-white/10 transition hover:bg-white/10"
//                             >
//                                 <Icon name="x" className="h-5 w-5" />
//                             </button>
//                         </div>

//                         <nav
//                             className="grid gap-2"
//                             aria-label="Page sections"
//                         >
//                             {NAV.map(([label, href]) => (
//                                 <a
//                                     key={href}
//                                     href={href}
//                                     onClick={closeMenu}
//                                     className="flex min-h-12 items-center rounded-xl px-4 py-3 text-base font-medium text-slate-200 transition hover:bg-blue-500/10 hover:text-blue-300"
//                                 >
//                                     {label}
//                                 </a>
//                             ))}
//                         </nav>

//                         <div className="mt-auto grid gap-3 pb-[max(0.5rem,env(safe-area-inset-bottom))]">
//                             <button
//                                 type="button"
//                                 onClick={handleRegister}
//                                 className="min-h-12 rounded-full bg-blue-600 py-3 font-semibold shadow-lg shadow-blue-600/30 transition hover:bg-blue-500"
//                             >
//                                 Create Account
//                             </button>

//                             <button
//                                 type="button"
//                                 onClick={handleLogin}
//                                 className="min-h-12 rounded-full border border-white/20 py-3 font-semibold transition hover:bg-white/10"
//                             >
//                                 Login
//                             </button>
//                         </div>
//                     </div>
//                 </div>
//             )}
//         </>
//     );
// }
