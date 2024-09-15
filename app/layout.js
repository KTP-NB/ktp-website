import { Inter } from "next/font/google";
import "./globals.css";
import Header from "./components/header";
import Footer from "./components/footer";

const inter = Inter({ subsets: ["latin"] });

export const metadata = {
  title: "KTP - New Brunswick",
  description: "New Brunswick's First Technology Fraternity",
  icon: "/ktp.png",
};


export default function Layout({ children }) {
  return (
    <html lang="en">
      <head>
        <title>Your Application</title>
        <meta charSet="UTF-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/tailwindcss/2.2.19/tailwind.min.css" />
      </head>
      <body className="min-h-screen flex flex-col bg-gray-900 text-white">
        <Header />
        <main className="flex-grow">{children}</main>
        <Footer />
      </body>
    </html>
  )
}
