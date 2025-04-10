import { ReactNode } from "react";
import { Header } from "./header";
import { Sidebar } from "./sidebar";

interface MainLayoutProps {
  children: ReactNode;
}

export function MainLayout({ children }: MainLayoutProps) {
  return (
    <div className="min-h-screen flex flex-col">
      <div className="flex flex-1">
        <div className="hidden lg:block w-64 flex-shrink-0">
          <Sidebar className="fixed top-0 bottom-0 left-0 w-64 z-30" />
        </div>
        
        <div className="flex-1 flex flex-col min-w-0">
          <Header />
          <main className="flex-1 py-6 px-4 md:px-6 lg:px-8">
            {children}
          </main>
          
          <footer className="py-6 px-4 md:px-6 border-t">
            <div className="container mx-auto flex flex-col md:flex-row justify-between items-center">
              <p className="text-sm text-muted-foreground">
                &copy; {new Date().getFullYear()} VenThatGrant. All rights reserved.
              </p>
              <div className="flex gap-4 mt-2 md:mt-0">
                <a href="#" className="text-sm text-muted-foreground hover:text-foreground">
                  Privacy Policy
                </a>
                <a href="#" className="text-sm text-muted-foreground hover:text-foreground">
                  Terms of Service
                </a>
                <a href="#" className="text-sm text-muted-foreground hover:text-foreground">
                  Contact
                </a>
              </div>
            </div>
          </footer>
        </div>
      </div>
    </div>
  );
}
