import { useState } from "react";
import { useLocation } from "wouter";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Shield, Users, LogIn } from "lucide-react";

interface LoginModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function LoginModal({ open, onOpenChange }: LoginModalProps) {
  const [_, setLocation] = useLocation();

  const handleAdminLogin = () => {
    onOpenChange(false);
    setLocation("/admin-login");
  };

  const handleUserLogin = () => {
    onOpenChange(false);
    // Redirect to Google OAuth
    window.location.href = "/api/auth/google";
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 justify-center">
            <LogIn className="h-5 w-5" />
            Choose Login Type
          </DialogTitle>
          <DialogDescription className="text-center">
            Select how you'd like to access the platform
          </DialogDescription>
        </DialogHeader>
        
        <div className="grid gap-4 py-4">
          <Card className="cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors" onClick={handleUserLogin}>
            <CardContent className="p-6 text-center">
              <Users className="h-8 w-8 mx-auto mb-3 text-blue-600" />
              <h3 className="font-semibold mb-2">User Login</h3>
              <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
                Sign in with Google to save your progress and access your stats
              </p>
              <Button 
                className="w-full" 
                data-testid="button-user-login"
                onClick={(e) => {
                  e.stopPropagation();
                  handleUserLogin();
                }}
              >
                Sign in with Google
              </Button>
            </CardContent>
          </Card>
          
          <Card className="cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors" onClick={handleAdminLogin}>
            <CardContent className="p-6 text-center">
              <Shield className="h-8 w-8 mx-auto mb-3 text-orange-600" />
              <h3 className="font-semibold mb-2">Admin Login</h3>
              <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
                Access the admin panel to manage challenges and view analytics
              </p>
              <Button 
                variant="outline" 
                className="w-full"
                data-testid="button-admin-login"
                onClick={(e) => {
                  e.stopPropagation();
                  handleAdminLogin();
                }}
              >
                Admin Panel
              </Button>
            </CardContent>
          </Card>
        </div>
      </DialogContent>
    </Dialog>
  );
}