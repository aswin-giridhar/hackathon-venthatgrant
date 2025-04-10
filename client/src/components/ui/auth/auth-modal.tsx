import { useState, ReactNode } from "react";
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle 
} from "@/components/ui/dialog";
import { LoginForm } from "./login-form";
import { RegisterForm } from "./register-form";
import { X } from "lucide-react";
import { Button } from "@/components/ui/button";

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  defaultTab?: "login" | "register";
}

export function AuthModal({ isOpen, onClose, defaultTab = "login" }: AuthModalProps) {
  const [activeTab, setActiveTab] = useState<"login" | "register">(defaultTab);

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader className="flex justify-between items-center mb-4">
          <DialogTitle>
            {activeTab === "login" ? "Sign In" : "Create an account"}
          </DialogTitle>
          <Button 
            variant="ghost" 
            size="icon" 
            onClick={onClose}
            className="absolute right-4 top-4"
          >
            <X className="h-4 w-4" />
            <span className="sr-only">Close</span>
          </Button>
        </DialogHeader>
        
        {activeTab === "login" ? (
          <LoginForm 
            onSuccess={onClose}
            onRegisterClick={() => setActiveTab("register")}
          />
        ) : (
          <RegisterForm 
            onSuccess={onClose}
            onLoginClick={() => setActiveTab("login")}
          />
        )}
      </DialogContent>
    </Dialog>
  );
}
