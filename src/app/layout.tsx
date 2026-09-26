import type { Metadata } from "next";
import { JetBrains_Mono, Plus_Jakarta_Sans } from "next/font/google";
import { ClickLoader } from "@/components/click-loader";
import { ThemeProvider } from "@/components/theme-provider";
import "./globals.css";

const body = Plus_Jakarta_Sans({
  subsets: ["latin"],
  variable: "--font-body",
});

const mono = JetBrains_Mono({
  subsets: ["latin"],
  variable: "--font-mono",
});

export const metadata: Metadata = {
  title: {
    default: "myDomain",
    template: "%s · myDomain",
  },
  description: "Find a domain, buy it, and launch hosting, simple like Namecheap, built for your business.",
};

const themeInitScript = `(function(){try{var t=localStorage.getItem("mydomain-theme");if(t!=="light"&&t!=="dark")t="dark";document.documentElement.setAttribute("data-theme",t);}catch(e){document.documentElement.setAttribute("data-theme","dark");}})();`;

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeInitScript }} />
      </head>
      <body className={`${body.variable} ${mono.variable} antialiased`}>
        <ThemeProvider>
          <ClickLoader />
          {children}
        </ThemeProvider>
      </body>
    </html>
  );
}
