import { Switch, Route, Router as WouterRouter } from "wouter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { ThemeProvider } from "next-themes";
import { WalletProvider } from "@/context/WalletContext";
import { AuthProvider, useAuth } from "@/context/AuthContext";
import { Layout } from "@/components/layout";
import { useEffect } from "react";
import { useLocation, Redirect } from "wouter";

import Home from "@/pages/home";
import Dashboard from "@/pages/dashboard";
import Faucet from "@/pages/faucet";
import Transfer from "@/pages/transfer";
import Transactions from "@/pages/transactions";
import Admin from "@/pages/admin";
import Flash from "@/pages/flash";
import Guide from "@/pages/guide";
import NotFound from "@/pages/not-found";

const queryClient = new QueryClient();

function Router() {
  const { user, isLoading } = useAuth();
  const [location] = useLocation();
  useEffect(() => {
    queryClient.clear();
  }, [user?.id]);

  if (isLoading) {
    return <div className="min-h-[60vh] flex items-center justify-center text-muted-foreground">Loading your account…</div>;
  }
  if (!user && location !== "/") return <Redirect to="/" />;

  return (
    <Switch>
      <Route path="/" component={Home} />
      <Route path="/dashboard" component={Dashboard} />
      <Route path="/faucet" component={Faucet} />
      <Route path="/transfer" component={Transfer} />
      <Route path="/transactions" component={Transactions} />
      <Route path="/admin" component={Admin} />
      <Route path="/flash" component={Flash} />
      <Route path="/guide" component={Guide} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <ThemeProvider attribute="class" defaultTheme="dark" enableSystem={false}>
      <QueryClientProvider client={queryClient}>
        <TooltipProvider>
          <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, "")}>
            <AuthProvider>
              <WalletProvider>
                <Layout>
                  <Router />
                </Layout>
              </WalletProvider>
            </AuthProvider>
          </WouterRouter>
          <Toaster />
        </TooltipProvider>
      </QueryClientProvider>
    </ThemeProvider>
  );
}

export default App;
