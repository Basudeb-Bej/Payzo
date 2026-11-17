// frontend/src/components/footer.jsx
import logo from "../assets/image2.png";

const NAV = [
  ["Home", "#home"],
  ["Features", "#features"],
  ["How it works", "#how"],
  ["Security", "#security"],
  ["FAQ", "#faq"],
];

function Logo() {
  return (
    <img
      src={logo}
      alt="Payzo Logo"
      className="h-10 w-auto max-w-40 object-contain object-left"
    />
  );
}

export default function Footer({ onLogin, onRegister }) {
  return (
    <footer className="border-t border-white/10 bg-[#050e1d] px-5 pb-24 pt-14 sm:px-6 md:px-10 lg:pb-12">
      <div className="mx-auto max-w-7xl">
        <div className="grid gap-10 sm:grid-cols-2 lg:grid-cols-4">
          {/* Brand & Status */}
          <div className="lg:col-span-2">
            <a href="#home" aria-label="Payzo home" className="inline-block">
              <Logo />
            </a>

            <p className="mt-4 max-w-sm text-sm leading-relaxed text-slate-400">
              A modern digital wallet built for fast INR transfers, transparent tracking,
              and PIN-verified security.
            </p>

            <div className="mt-5 inline-flex items-center gap-2 rounded-full border border-emerald-500/20 bg-emerald-500/10 px-3 py-1 text-xs font-medium text-emerald-300">
              <span className="h-2 w-2 rounded-full bg-emerald-400" />
              All wallet services operational
            </div>
          </div>

          {/* Navigation links */}
          <div>
            <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-300">
              Explore
            </h3>

            <nav className="mt-4 flex flex-col gap-2.5" aria-label="Footer navigation">
              {NAV.map(([label, href]) => (
                <a
                  key={href}
                  href={href}
                  className="w-fit text-sm text-slate-400 transition hover:text-blue-400"
                >
                  {label}
                </a>
              ))}
            </nav>
          </div>

          {/* Account actions */}
          <div>
            <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-300">
              Account
            </h3>

            <div className="mt-4 flex flex-col items-start gap-2.5">
              <button
                type="button"
                onClick={onLogin}
                className="text-sm text-slate-400 transition hover:text-blue-400"
              >
                Sign in
              </button>

              <button
                type="button"
                onClick={onRegister}
                className="text-sm text-slate-400 transition hover:text-blue-400"
              >
                Create Account
              </button>

              <a
                href="#security"
                className="text-sm text-slate-400 transition hover:text-blue-400"
              >
                Security &amp; Privacy
              </a>
            </div>
          </div>
        </div>

        {/* Bottom Copyright Bar */}
        <div className="mt-12 flex flex-col gap-3 border-t border-white/10 pt-6 text-center sm:flex-row sm:items-center sm:justify-between sm:text-left">
          <p className="text-xs text-slate-500 dark:text-slate-400">
            © {new Date().getFullYear()} Payzo. All rights reserved.
          </p>

          <a
            href="#home"
            className="text-xs font-medium text-slate-400 transition hover:text-blue-400"
          >
            Back to top ↑
          </a>
        </div>
      </div>
    </footer>
  );
}









// // frontend/src/components/footer.jsx

// import logo from "../assets/image2.png";

// const NAV = [
//     ["Home", "#home"],
//     ["Features", "#features"],
//     ["How it works", "#how"],
//     ["Security", "#security"],
//     ["FAQ", "#faq"],
// ];

// function Logo() {
//     return (
//         <img
//             src={logo}
//             alt="Payzo Logo"
//             className="h-11 w-auto max-w-40 object-contain object-left"
//         />
//     );
// }

// export default function Footer({ onLogin, onRegister }) {
//     return (
//         <footer className="border-t border-white/10 bg-[#050e1d] px-5 pb-28 pt-12 sm:px-6 md:px-10 md:pb-10">
//             <div className="mx-auto max-w-7xl">
//                 <div className="grid gap-10 sm:grid-cols-2 lg:grid-cols-3">
//                     {/* Brand */}
//                     <div>
//                         <a href="#home" aria-label="Payzo home">
//                             <Logo />
//                         </a>

//                         <p className="mt-4 max-w-sm text-sm leading-7 text-slate-400">
//                             A simple digital wallet experience to manage your
//                             balance and transactions.
//                         </p>
//                     </div>

//                     {/* Navigation links */}
//                     <div>
//                         <h3 className="text-sm font-bold text-white">
//                             Explore
//                         </h3>

//                         <nav
//                             className="mt-4 grid grid-cols-2 gap-x-4 gap-y-3"
//                             aria-label="Footer navigation"
//                         >
//                             {NAV.map(([label, href]) => (
//                                 <a
//                                     key={href}
//                                     href={href}
//                                     className="text-sm text-slate-400 transition hover:text-blue-400"
//                                 >
//                                     {label}
//                                 </a>
//                             ))}
//                         </nav>
//                     </div>

//                     {/* Account buttons */}
//                     <div>
//                         <h3 className="text-sm font-bold text-white">
//                             Your Account
//                         </h3>

//                         <div className="mt-4 flex flex-col items-start gap-3">
//                             <button
//                                 type="button"
//                                 onClick={onLogin}
//                                 className="text-sm text-slate-400 transition hover:text-blue-400"
//                             >
//                                 Login
//                             </button>

//                             <button
//                                 type="button"
//                                 onClick={onRegister}
//                                 className="text-sm text-slate-400 transition hover:text-blue-400"
//                             >
//                                 Create Account
//                             </button>
//                         </div>
//                     </div>
//                 </div>

//                 {/* Copyright */}
//                 <div className="mt-10 flex flex-col gap-3 border-t border-white/10 pt-6 text-center sm:flex-row sm:items-center sm:justify-between sm:text-left">
//                     <p className="text-xs text-slate-500">
//                         © {new Date().getFullYear()} Payzo. All rights reserved.
//                     </p>

//                     <a
//                         href="#home"
//                         className="text-xs text-slate-500 transition hover:text-blue-400"
//                     >
//                         Back to top ↑
//                     </a>
//                 </div>
//             </div>
//         </footer>
//     );
// }
