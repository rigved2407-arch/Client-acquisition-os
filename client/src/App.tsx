import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/NotFound";
import Apply from "@/pages/Apply";
import Chat from "@/pages/Chat";
import Calendar from "@/pages/Calendar";
import Book from "@/pages/Book";
import Automations from "@/pages/Automations";
import LeadDetail from "@/pages/LeadDetail";
import ChatHistory from "@/pages/ChatHistory";
import { Route, Switch } from "wouter";
import ErrorBoundary from "./components/ErrorBoundary";
import { ThemeProvider } from "./contexts/ThemeContext";
import Home from "./pages/Home";

function Router() {
  return (
    <Switch>
      <Route path="/" component={Home} />
      <Route path="/apply" component={Apply} />
      <Route path="/chat" component={Chat} />
      <Route path="/calendar" component={Calendar} />
      <Route path="/book" component={Book} />
      <Route path="/automations" component={Automations} />
      <Route path="/leads/:id" component={LeadDetail} />
      <Route path="/chat-history" component={ChatHistory} />
      <Route path="/404" component={NotFound} />
      <Route component={NotFound} />
    </Switch>
  );
}

export default function App() {
  return (
    <ErrorBoundary>
      <ThemeProvider defaultTheme="light">
        <TooltipProvider>
          <Toaster />
          <Router />
        </TooltipProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );
}
