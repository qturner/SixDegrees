console.log("[DEBUG] main.tsx entry point reached");
import { createRoot } from "react-dom/client";
import App from "./App";
import "./index.css?v=noir";

createRoot(document.getElementById("root")!).render(<App />);
