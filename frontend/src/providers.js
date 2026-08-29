import { ThemeProvider, useTheme } from "next-themes";
import { ClerkProvider } from "@clerk/clerk-react";

const PUBLISHABLE_KEY = process.env.REACT_APP_CLERK_PUBLISHABLE_KEY;

if (!PUBLISHABLE_KEY) {
  throw new Error("Missing REACT_APP_CLERK_PUBLISHABLE_KEY");
}

function ClerkWithTheme({ children }) {
  const { resolvedTheme } = useTheme();
  const isDark = resolvedTheme === "dark";

  const appearance = {
    variables: {
      colorPrimary: "#EA580C",
      colorBackground: isDark ? "#171717" : "#FFFFFF",
      colorText: isDark ? "#F5F5F5" : "#1C1917",
      colorTextSecondary: isDark ? "#A3A3A3" : "#78716C",
      colorInputBackground: isDark ? "#0A0A0A" : "#FAFAF9",
      colorInputText: isDark ? "#F5F5F5" : "#1C1917",
      borderRadius: "0.6rem",
      fontFamily: "Satoshi, system-ui, sans-serif",
    },
    elements: {
      card: "shadow-none border border-border",
      formButtonPrimary:
        "bg-orange-600 hover:bg-orange-700 text-white normal-case",
    },
  };

  return (
    <ClerkProvider publishableKey={PUBLISHABLE_KEY} appearance={appearance}>
      {children}
    </ClerkProvider>
  );
}

export function Providers({ children }) {
  return (
    <ThemeProvider attribute="class" defaultTheme="light" enableSystem={false}>
      <ClerkWithTheme>{children}</ClerkWithTheme>
    </ThemeProvider>
  );
}
