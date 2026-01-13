import React from "react";
import "./App.css";
import { useRoutes } from "react-router-dom";
import Router from "./router/Router";
import { ToastContainer } from "react-toastify";
import { AuthProvider } from './Context/AuthContext';
import ErrorBoundary from "./utils/Logger/ErrorBoundary";
import ScrollToTop from "./components/common/ScrollTop";
import ScrollTopBehaviour from "./components/common/ScrollTopBehaviour";
import PageProtection from "./components/common/PageProtection";

function App() {
  const routing = useRoutes(Router);
  return (
    <PageProtection>
      <div className="App">
        <ErrorBoundary>
          <ScrollToTop />
          <ScrollTopBehaviour />
        <AuthProvider>
        <ToastContainer
          position="top-right"
          autoClose={5000}
          hideProgressBar={false}
          newestOnTop={false}
          closeOnClick
          rtl={false}
          pauseOnFocusLoss
          draggable
          pauseOnHover
        />

        {routing}
        </AuthProvider>
        </ErrorBoundary>
      </div>
    </PageProtection>
  );
}

export default App;
