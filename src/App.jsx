import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { pagesConfig } from './pages.config';
import PageNotFound from './lib/PageNotFound';

const { Pages, mainPage } = pagesConfig;
const MainPage = mainPage ? Pages[mainPage] : Object.values(Pages)[0];

export default function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<MainPage />} />
        {Object.entries(Pages).map(([key, Component]) => (
          <Route key={key} path={`/${key}`} element={<Component />} />
        ))}
        <Route path="*" element={<PageNotFound />} />
      </Routes>
    </Router>
  );
}
