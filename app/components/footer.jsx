import { FaInstagram, FaLinkedin, FaFacebook, FaTwitter } from 'react-icons/fa';

export default function Footer() {
    return (
        <footer className="text-gray-400 bg-gray-900 body-font">
            <div className="container px-5 py-8 mx-auto flex items-center sm:flex-row flex-col">
                <a className="flex title-font font-medium items-center md:justify-start justify-center text-white">
                    <span className="ml-3 text-xl">Kappa Theta Pi</span>
                </a>
                <p className="text-sm text-gray-400 sm:ml-4 sm:pl-4 sm:border-l-2 sm:border-gray-800 sm:py-2 sm:mt-0 mt-4">© 2025 KTP - Alpha Beta —
                    <a href="" className="text-gray-500 ml-1" target="_blank" rel="noopener noreferrer">@KTP</a>
                </p>
                <span className="inline-flex sm:ml-auto sm:mt-0 mt-4 justify-center sm:justify-start">
                    <a href="https://www.instagram.com" className="text-gray-400" target="_blank" rel="noopener noreferrer">
                        <FaInstagram className="w-5 h-5" />
                    </a>
                    <a href="https://www.linkedin.com" className="ml-3 text-gray-400" target="_blank" rel="noopener noreferrer">
                        <FaLinkedin className="w-5 h-5" />
                    </a>
                    <a href="https://www.facebook.com" className="ml-3 text-gray-400" target="_blank" rel="noopener noreferrer">
                        <FaFacebook className="w-5 h-5" />
                    </a>
                    <a href="https://twitter.com" className="ml-3 text-gray-400" target="_blank" rel="noopener noreferrer">
                        <FaTwitter className="w-5 h-5" />
                    </a>
                </span>
            </div>
        </footer>
    );
}
