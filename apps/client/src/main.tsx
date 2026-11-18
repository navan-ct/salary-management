import { lazy, StrictMode, Suspense } from "react";
import { createRoot } from "react-dom/client";

import { App } from "./app/App";
import "./shared/styles/theme.css";

const root = document.getElementById("root");
const Preview = import.meta.env.DEV && window.location.pathname === "/design-system"
  ? lazy(() => import("./app/routes/DesignSystemPreview"))
  : null;

if (root === null) {
  throw new Error("The application root element is missing.");
}

createRoot(root).render(
  <StrictMode>
    {Preview ? <Suspense fallback={null}><Preview /></Suspense> : <App />}
  </StrictMode>,
);
