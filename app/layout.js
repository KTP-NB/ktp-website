import { Inter } from "next/font/google";
import "./globals.css";
import Header from "./components/header";
import Footer from "./components/footer";
import { AuthProvider } from "./components/authprovider"; // Fixed: lowercase filename

const inter = Inter({ subsets: ["latin"] });

export const metadata = {
  title: "KTP - New Brunswick",
  description: "New Brunswick&apos;s First Technology Fraternity",
  icons: { icon: "/ktp.png" },
};

export default function RootLayout({ children }) {
  return (
    <html lang="en" className={inter.className}>
      <body className="min-h-screen flex flex-col bg-gray-900 text-white">
        <AuthProvider>
          <Header />
          <main className="flex-grow">{children}</main>
          <Footer />
        </AuthProvider>
      </body>
    </html>
  );
}
