import { Inter } from "next/font/google";
import "./globals.css";
import AuthProvider from "./components/AuthProvider";
import { Toaster } from "react-hot-toast";

const inter = Inter({ subsets: ["latin"] });

export const metadata = {
  title: "Email Automation Platform",
  description: "Serverless email automation system",
};

export default function RootLayout({ children }) {
  const zoom = 0.85; // 75%

  return (
    <html lang="en">
      <body className={inter.className}>
        <AuthProvider>
          {/* Zoom Wrapper */}
          <div
            style={{
              transform: `scale(${zoom})`,
              transformOrigin: "0 0",
              width: `${100 / zoom}%`,
              minHeight: `${100 / zoom}vh`,
            }}
          >
            {children}
          </div>

          {/* Toasts stay unscaled */}
          <Toaster position="top-right" />
        </AuthProvider>
      </body>
    </html>
  );
}
