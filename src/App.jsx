import { Toaster } from "@/components/ui/toaster"
import { QueryClientProvider } from '@tanstack/react-query'
import { queryClientInstance } from '@/lib/query-client'
import NavigationTracker from '@/lib/NavigationTracker'
import { pagesConfig } from './pages.config'
import { BrowserRouter as Router, Route, Routes } from 'react-router-dom';
import PageNotFound from './lib/PageNotFound';
import { AuthProvider, useAuth } from '@/lib/AuthContext';
import UserNotRegisteredError from '@/components/UserNotRegisteredError';

const { Pages, Layout, mainPage } = pagesConfig;
const MainPage = mainPage ? Pages[mainPage] : Object.values(Pages)[0];

const LayoutWrapper = ({ children }) => Layout ? <Layout>{children}</Layout> : <>{children}</>;

const AuthenticatedApp = () => {
  const { isLoadingAuth, isLoadingPublicSettings, authError } = useAuth();

  if (isLoadingPublicSettings || isLoadingAuth) {
    return <div className="h-screen flex items-center justify-center text-xl bg-zinc-950 text-white">Loading SignPDF...</div>;
  }

  if (authError) return <UserNotRegisteredError />;

  return (
    <QueryClientProvider client={queryClientInstance}>
      <Toaster />
      <NavigationTracker />
      <Router>
        <Routes>
          <Route path="/" element={<MainPage />} />
          {Object.entries(Pages).map(([key, Component]) => (
            <Route key={key} path={`/${key}`} element={<Component />} />
          ))}
          <Route path="*" element={<PageNotFound />} />
        </Routes>
      </Router>
    </QueryClientProvider>
  );
};

const App = () => (
  <AuthProvider>
    <AuthenticatedApp />
  </AuthProvider>
);

export default App;
