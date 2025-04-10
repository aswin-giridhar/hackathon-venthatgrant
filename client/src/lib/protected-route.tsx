import { useAuth } from "@/hooks/use-auth";
import { Loader2 } from "lucide-react";
import { Route, useLocation } from "wouter";
import React from "react";

type ComponentType = React.ComponentType<any> | (() => React.ReactNode);

export function ProtectedRoute({
  path,
  component: Component,
}: {
  path: string;
  component: ComponentType;
}) {
  const { user, isLoading } = useAuth();
  const [, setLocation] = useLocation();
  
  if (isLoading) {
    return (
      <Route path={path}>
        <div className="flex items-center justify-center min-h-screen">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </Route>
    );
  }

  if (!user) {
    return (
      <Route path={path}>
        {() => {
          setLocation("/auth");
          return null;
        }}
      </Route>
    );
  }

  return (
    <Route path={path}>
      {(params) => <Component {...params} />}
    </Route>
  );
}
