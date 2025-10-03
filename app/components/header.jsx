'use client';

import { useState, useMemo } from 'react';
import { Dialog } from '@headlessui/react';
import { Bars3Icon, XMarkIcon } from '@heroicons/react/24/outline';
import Link from 'next/link';
import Image from 'next/image';
import { useAuth } from '@/components/authprovider'; // <-- make sure this path/casing matches your file

export default function Header() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const { user, loading, signOut } = useAuth();

  const navLinks = useMemo(
    () => [
      { name: 'About Us', href: '/about' },
      { name: 'Rush', href: '/rush' },
      { name: 'Members', href: '/members' },
      { name: 'Contact us', href: '/contact' },
    ],
    []
  );

  const authLinks = !loading && user
    ? []
    : [
        { name: 'Login', href: '/login' },
        { name: 'Signup', href: '/signup' },
      ];

  const handleNavigation = () => setMobileMenuOpen(false);

  return (
    <header className="absolute inset-x-0 top-0 z-50 bg-transparent">
      {/* DESKTOP HEADER (grid keeps center truly centered) */}
      <nav aria-label="Global" className="grid grid-cols-3 items-center p-6 lg:px-8">
        {/* Left: Logo (fixed area) */}
        <div className="flex">
          <Link href="/" onClick={handleNavigation} className="-m-1.5 p-1.5">
            <span className="sr-only">KTP</span>
            <Image src="/ktp.png" alt="KTP Logo" width={48} height={48} className="pb-2" />
          </Link>
        </div>

        {/* Center: main nav (only on lg+) */}
        <div className="hidden lg:flex justify-center gap-x-12">
          {navLinks.map((item) => (
            <Link
              key={item.name}
              href={item.href}
              className="text-sm font-semibold leading-6 text-white hover:bg-white hover:text-blue-950 px-3 py-2 rounded-md"
            >
              {item.name}
            </Link>
          ))}
        </div>

        {/* Right: auth area (only on lg+) */}
        <div className="hidden lg:flex justify-end items-center gap-x-6">
          {!loading && user ? (
            <>
              <span className="text-sm opacity-80">{user.email}</span>
              <button
                onClick={async () => { await signOut(); window.location.href = '/'; }}
                className="text-sm font-semibold leading-6 text-white px-3 py-2 rounded-md border border-white/20 hover:bg-white hover:text-blue-950"
              >
                Sign out
              </button>
            </>
          ) : (
            authLinks.map((item) => (
              <Link
                key={item.name}
                href={item.href}
                className="text-sm font-semibold leading-6 text-white hover:bg-white hover:text-blue-950 px-3 py-2 rounded-md"
              >
                {item.name}
              </Link>
            ))
          )}
        </div>

        {/* Mobile: hamburger button (right side) */}
        <div className="flex lg:hidden col-start-3 justify-end">
          <button
            type="button"
            onClick={() => setMobileMenuOpen(true)}
            className="-m-2.5 inline-flex items-center justify-center rounded-md p-2.5 text-gray-400"
          >
            <span className="sr-only">Open main menu</span>
            <Bars3Icon aria-hidden="true" className="h-6 w-6" />
          </button>
        </div>
      </nav>

      {/* MOBILE DRAWER */}
      <Dialog as="div" open={mobileMenuOpen} onClose={setMobileMenuOpen} className="lg:hidden">
        <div className="fixed inset-0 z-50" />
        <Dialog.Panel className="fixed inset-y-0 right-0 z-50 w-full overflow-y-auto bg-gray-800 px-6 py-6 sm:max-w-sm sm:ring-1 sm:ring-gray-700">
          <div className="flex items-center justify-between">
            <Link href="/" onClick={handleNavigation} className="-m-1.5 p-1.5">
              <span className="sr-only">KTP</span>
              <Image src="/ktp.png" alt="KTP Logo" width={32} height={32} className="pb-2" />
            </Link>
            <button
              type="button"
              onClick={() => setMobileMenuOpen(false)}
              className="-m-2.5 rounded-md p-2.5 text-gray-400"
            >
              <span className="sr-only">Close menu</span>
              <XMarkIcon aria-hidden="true" className="h-6 w-6" />
            </button>
          </div>

          <div className="mt-6 flow-root">
            <div className="-my-6 divide-y divide-gray-700">
              {/* Main nav */}
              <div className="space-y-2 py-6">
                {navLinks.map((item) => (
                  <Link
                    key={item.name}
                    href={item.href}
                    onClick={handleNavigation}
                    className="-mx-3 block rounded-lg px-3 py-2 text-base font-semibold leading-7 text-white hover:bg-gray-700 hover:text-indigo-300"
                  >
                    {item.name}
                  </Link>
                ))}
              </div>

              {/* Auth area */}
              <div className="py-6 space-y-2">
                {!loading && user ? (
                  <>
                    <div className="px-3 py-2 text-base font-medium text-white/80">
                      {user.email}
                    </div>
                    <button
                      onClick={async () => { await signOut(); setMobileMenuOpen(false); window.location.href = '/'; }}
                      className="-mx-3 block w-full text-left rounded-lg px-3 py-2 text-base font-semibold leading-7 text-white hover:bg-gray-700 hover:text-indigo-300"
                    >
                      Sign out
                    </button>
                  </>
                ) : (
                  authLinks.map((item) => (
                    <Link
                      key={item.name}
                      href={item.href}
                      onClick={handleNavigation}
                      className="-mx-3 block rounded-lg px-3 py-2 text-base font-semibold leading-7 text-white hover:bg-gray-700 hover:text-indigo-300"
                    >
                      {item.name}
                    </Link>
                  ))
                )}
              </div>
            </div>
          </div>
        </Dialog.Panel>
      </Dialog>
    </header>
  );
}
