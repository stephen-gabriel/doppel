"use client";

import { useEffect, useState, type ReactNode } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";

const NAV = [
  { href: "/", label: "Check an address" },
  { href: "/recipients", label: "Address book" },
  { href: "/prepare", label: "Test a payment" },
  { href: "/monitor", label: "Monitor" },
  { href: "/method", label: "How it works" },
];

export function Shell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  useEffect(() => { setOpen(false); }, [pathname]);

  return (
    <div className="min-h-screen bg-midnight text-text">
      <a href="#main-content" className="sr-only focus:not-sr-only focus:absolute focus:z-50 focus:bg-iris focus:p-3 focus:text-on-iris">Skip to content</a>
      <header className="border-b border-line px-4 py-4 sm:px-5 md:px-8">
        <div className="mx-auto flex max-w-[1120px] items-center justify-between gap-4">
          <Link href="/" className="flex items-center gap-3">
            <img src="/doppel-logo.svg" alt="" width={32} height={32} />
            <span className="text-[20px] font-medium">Doppel</span>
          </Link>
          <nav aria-label="Primary" className="hidden gap-5 sm:flex">
            {NAV.map((item) => (
              <Link key={item.href} href={item.href} className="text-muted hover:text-text">
                {item.label}
              </Link>
            ))}
          </nav>
          <p className="hidden text-right text-sm text-muted lg:block">Checks never move money</p>
          <button
            type="button"
            onClick={() => setOpen((value) => !value)}
            aria-expanded={open}
            aria-controls="primary-menu"
            className="inline-flex min-h-11 min-w-11 items-center justify-center rounded-[12px] border border-line-strong bg-raised text-text sm:hidden"
          >
            <span className="sr-only">{open ? "Close menu" : "Open menu"}</span>
            <span aria-hidden="true" className="flex flex-col gap-[5px]">
              <span className={`block h-[2px] w-5 rounded bg-current transition-transform ${open ? "translate-y-[7px] rotate-45" : ""}`} />
              <span className={`block h-[2px] w-5 rounded bg-current transition-opacity ${open ? "opacity-0" : ""}`} />
              <span className={`block h-[2px] w-5 rounded bg-current transition-transform ${open ? "-translate-y-[7px] -rotate-45" : ""}`} />
            </span>
          </button>
        </div>
        <nav
          id="primary-menu"
          aria-label="Mobile"
          hidden={!open}
          className="mx-auto mt-3 flex max-w-[1120px] flex-col gap-1 sm:hidden"
        >
          {NAV.map((item) => (
            <Link key={item.href} href={item.href} className="rounded-[12px] px-3 py-3 text-muted">
              {item.label}
            </Link>
          ))}
        </nav>
      </header>
      <main id="main-content" tabIndex={-1} className="mx-auto max-w-[1120px] px-4 py-6 sm:px-5 sm:py-8 md:px-8">{children}</main>
      <footer className="border-t border-line px-4 py-6 text-sm text-muted sm:px-5 md:px-8">
        <p className="mx-auto max-w-[1120px]">
          Doppel compares the address you plan to pay with your saved recipient and looks for suspicious lookalikes.
          It does not verify who owns an address or guarantee safety.
        </p>
      </footer>
    </div>
  );
}
