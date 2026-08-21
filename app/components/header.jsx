'use client';

import { useState, useMemo } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { Dialog } from '@headlessui/react';
import { Bars3Icon, XMarkIcon } from '@heroicons/react/24/outline';
import Link from 'next/link';
import Image from 'next/image';
import { useAuth } from '@/components/authprovider';

export default function Header() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [accountMenuOpen, setAccountMenuOpen] = useState(false);
  const { user, loading, signOut, displayName, hasAdminAccess } = useAuth();
  const router = useRouter();
  const pathname = usePathname();

  const navLinks = useMemo(
    () => [
      { name: 'Home', href: '/' },
      { name: 'About Us', href: '/about' },
      { name: 'Rush', href: '/rush' },
      { name: 'Spotlight', href: '/spotlight' },
      { name: 'Members', href: '/members' },
      { name: 'Contact us', href: '/contact' },
      { name: 'Gallery', href: '/gallery' },
    ],
    []
  );

  const authRequiredLinks = useMemo(
    () => [
      { name: 'Study Tools', href: '/study-tools' },
      { name: 'CodeRank', href: '/coderank' },
      ...(hasAdminAccess ? [{ name: 'Admin Portal', href: '/admin' }] : []),
      { name: 'Member Account', href: '/profile' },
    ],
    [hasAdminAccess]
  );

  const authLinks = !loading && user ? [] : [{ name: 'Login', href: '/login' }];

  const handleNavigation = () => {
    setMobileMenuOpen(false);
    setAccountMenuOpen(false);
  };

  return (
    <header className="absolute inset-x-0 top-0 z-50 bg-transparent">
      <nav aria-label="Global" className="grid grid-cols-3 items-center p-6 lg:px-8">
        <div className="flex items-center">
          <Link href="/" onClick={handleNavigation} className="flex items-center gap-4 group transition-all">
            {/* Logo Circle */}
            <div className="relative h-12 w-12 rounded-full bg-white/10 backdrop-blur-md border border-white/20 flex items-center justify-center overflow-hidden transition-transform group-hover:scale-110">
                <Image 
                    src="/ktp-icon.png" 
                    alt="KTP Logo" 
                    width={48} 
                    height={48} 
                    className="block" 
                />
            </div>
            
            {/* Logo Text Stack */}
            <div className="flex flex-col">
              <span className="text-[10px] font-bold tracking-[0.2em] text-white uppercase leading-none mb-1">
                Alpha Beta Chapter
              </span>
              <span className="text-xl font-extrabold text-white tracking-tight leading-none">
                <span className="text-blue-300">K</span>appa <span className="text-blue-300">T</span>heta <span className="text-blue-300">P</span>i
              </span>
            </div>
          </Link>
        </div>

        <div className="hidden lg:flex justify-center gap-x-2">
          {navLinks.map((item) => {
            const isActive = pathname === item.href;
            return (
              <Link
                key={item.name}
                href={item.href}
                onClick={(e) => {
                  e.preventDefault();
                  router.push(item.href);
                }}
                className={`text-base font-bold leading-6 transition-all duration-300 px-6 py-2.5 rounded-full whitespace-nowrap pointer-events-auto relative z-50 ${
                  isActive 
                    ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/30' 
                    : 'text-white hover:bg-white/10 hover:text-blue-200'
                }`}
              >
                {item.name}
              </Link>
            );
          })}
        </div>

        <div className="hidden lg:flex justify-end items-center gap-x-2">
          {!loading && user ? (
            <>
              <span className="max-w-[140px] truncate text-sm font-semibold opacity-90" title={displayName}>
                {displayName}
              </span>
              <div className="relative">
                <button
                  type="button"
                  onClick={() => setAccountMenuOpen((open) => !open)}
                  className="inline-flex h-11 w-11 items-center justify-center rounded-full border border-white/25 text-white transition hover:bg-white/10"
                  aria-label="Open member menu"
                  aria-expanded={accountMenuOpen}
                >
                  <Bars3Icon aria-hidden="true" className="h-6 w-6" />
                </button>

                {accountMenuOpen && (
                  <div className="absolute right-0 mt-3 w-52 overflow-hidden rounded-2xl border border-white/15 bg-slate-900/95 p-2 shadow-2xl backdrop-blur-xl">
                    {authRequiredLinks.map((item) => {
                      const isActive = pathname === item.href;
                      return (
                        <Link
                          key={item.name}
                          href={item.href}
                          onClick={handleNavigation}
                          className={`block rounded-xl px-4 py-3 text-sm font-bold transition ${
                            isActive
                              ? 'bg-blue-600 text-white'
                              : 'text-white hover:bg-white/10 hover:text-blue-200'
                          }`}
                        >
                          {item.name}
                        </Link>
                      );
                    })}
                    <button
                      onClick={async () => {
                        setAccountMenuOpen(false);
                        await signOut();
                        window.location.href = '/';
                      }}
                      className="mt-1 block w-full rounded-xl px-4 py-3 text-left text-sm font-bold text-white transition hover:bg-white/10 hover:text-blue-200"
                    >
                      Sign out
                    </button>
                  </div>
                )}
              </div>
            </>
          ) : (
            authLinks.map((item) => (
              <Link
                key={item.name}
                href={item.href}
                className="text-base font-bold leading-6 text-white hover:bg-white/10 px-8 py-3 rounded-full border border-white/30 whitespace-nowrap transition-all"
              >
                {item.name}
              </Link>
            ))
          )}
        </div>

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

      {mobileMenuOpen && (
        <Dialog as="div" open={mobileMenuOpen} onClose={setMobileMenuOpen} className="lg:hidden">
          <div className="fixed inset-0 z-50" />
          <Dialog.Panel className="fixed inset-y-0 right-0 z-50 w-full overflow-y-auto bg-gray-800 px-6 py-6 sm:max-w-sm sm:ring-1 sm:ring-gray-700">
          <div className="flex items-center justify-between">
            <Link href="/" onClick={handleNavigation} className="-m-1.5 p-1.5 flex items-center">
              <span className="sr-only">KTP</span>
              <Image src="/ktp-icon.png" alt="KTP Logo" width={48} height={48} className="block" />
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
              <div className="space-y-2 py-6">
                {navLinks.map((item) => {
                  const isActive = pathname === item.href;
                  return (
                    <Link
                      key={item.name}
                      href={item.href}
                      onClick={handleNavigation}
                      className={`-mx-3 block rounded-full px-4 py-3 text-base font-bold leading-7 whitespace-nowrap relative z-50 transition-all ${
                        isActive
                          ? 'bg-blue-600 text-white'
                          : 'text-white hover:bg-white/10'
                      }`}
                    >
                      {item.name}
                    </Link>
                  );
                })}
              </div>

              <div className="py-6 space-y-2">
                {!loading && user ? (
                  <>
                    <div className="px-3 py-2 text-base font-medium text-white/80">
                      {displayName}
                    </div>
                    {authRequiredLinks.map((item) => {
                      const isActive = pathname === item.href;
                      return (
                        <Link
                          key={item.name}
                          href={item.href}
                          onClick={handleNavigation}
                          className={`-mx-3 block rounded-full px-4 py-3 text-base font-bold leading-7 whitespace-nowrap transition-all ${
                            isActive
                              ? 'bg-blue-600 text-white'
                              : 'text-white hover:bg-white/10'
                          }`}
                        >
                          {item.name}
                        </Link>
                      );
                    })}
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
                      className="-mx-3 block rounded-lg px-3 py-2 text-base font-semibold leading-7 text-white hover:bg-gray-700 hover:text-indigo-300 whitespace-nowrap relative z-50"
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
      )}
    </header>
  );
}
