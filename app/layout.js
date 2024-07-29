import { Inter } from "next/font/google";
import "./globals.css";
import Header from "./components/header";
import RushPage from "@/app/pages/rush";
import MembersPage from "@/app/pages/members";

const inter = Inter({ subsets: ["latin"] });

export const metadata = {
  title: "KTP - New Brunswick",
  description: "New Brunswick's First Technology Fraternity",
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
      </body>
    </html>
  )
}
