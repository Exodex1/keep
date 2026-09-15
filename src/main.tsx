import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { Toaster } from "sonner";
import { KeepApp } from "@/components/keep/app";
import { TooltipProvider } from "@/components/ui/tooltip";
import "./styles.css";

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <TooltipProvider delayDuration={250}>
      <KeepApp />
    </TooltipProvider>
    <Toaster
      theme="dark"
      position="bottom-center"
      toastOptions={{
        className: "bg-card text-foreground shadow-[var(--shadow-float)] border-0 font-sans",
      }}
    />
  </StrictMode>,
);
