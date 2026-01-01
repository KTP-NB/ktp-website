'use client';

import { FaInstagram, FaLinkedin } from 'react-icons/fa';

export default function Footer() {
  return (
    <footer className="body-font backdrop-blur-md bg-white/5 border-t border-white/10">
      <div className="container px-5 py-8 mx-auto flex items-center sm:flex-row flex-col">
        
        {/* Logo / Name */}
        <div className="flex title-font font-medium items-center md:justify-start justify-center text-foreground">
          <span className="ml-3 text-xl">Kappa Theta Pi</span>
        </div>

        {/* Copyright */}
        <p className="text-sm text-muted-foreground sm:ml-4 sm:pl-4 sm:border-l sm:border-white/10 sm:py-2 sm:mt-0 mt-4">
          © 2025 KTP – Alpha Beta
        </p>

        {/* Social Icons */}
        <span className="inline-flex sm:ml-auto sm:mt-0 mt-4 justify-center sm:justify-start">
          <a
            href="https://www.instagram.com/ktpnewbrunswick/"
            target="_blank"
            rel="noopener noreferrer"
            className="text-muted-foreground hover:text-foreground transition-colors"
          >
            <FaInstagram className="w-5 h-5" />
          </a>

          <a
            href="https://www.linkedin.com/company/kappa-theta-pi-new-brunswick/"
            target="_blank"
            rel="noopener noreferrer"
            className="ml-4 text-muted-foreground hover:text-foreground transition-colors"
          >
            <FaLinkedin className="w-5 h-5" />
          </a>
        </span>
      </div>
    </footer>
  );
}
