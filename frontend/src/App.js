import "@/App.css";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { SignedIn, SignedOut, ClerkLoading, ClerkLoaded } from "@clerk/clerk-react";
import { Loader2 } from "lucide-react";
import { Toaster } from "@/components/ui/sonner";
import { Navbar } from "@/components/Navbar";
import { Footer } from "@/components/Footer";
import SignInPage from "@/pages/SignInPage";
import Dashboard from "@/pages/Dashboard";
import ProjectDetail from "@/pages/ProjectDetail";
import { Privacy, Terms, Security } from "@/pages/Legal";

function AppShell({ children }) {
  return (
    <div className="flex min-h-screen flex-col bg-background">
      <Navbar />
      <main className="mx-auto w-full max-w-6xl flex-1 px-6 py-10 md:px-8 md:py-14">
        {children}
      </main>
      <Footer />
    </div>
  );
}

function AuthedApp() {
  return (
    <>
      <ClerkLoading>
        <div className="flex min-h-screen items-center justify-center bg-background">
          <Loader2 className="h-6 w-6 animate-spin text-orange-600" />
        </div>
      </ClerkLoading>
      <ClerkLoaded>
        <SignedOut>
          <SignInPage />
        </SignedOut>
        <SignedIn>
          <AppShell>
            <Routes>
              <Route path="/" element={<Dashboard />} />
              <Route path="/projects/:id" element={<ProjectDetail />} />
              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </AppShell>
        </SignedIn>
      </ClerkLoaded>
    </>
  );
}

function App() {
  return (
    <div className="App">
      <BrowserRouter>
        <Routes>
          <Route path="/privacy" element={<Privacy />} />
          <Route path="/terms" element={<Terms />} />
          <Route path="/security" element={<Security />} />
          <Route path="/*" element={<AuthedApp />} />
        </Routes>
      </BrowserRouter>
      <Toaster position="bottom-right" richColors />
    </div>
  );
}

export default App;
