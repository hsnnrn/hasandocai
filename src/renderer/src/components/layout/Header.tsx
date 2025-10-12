import React, { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { Menu, Sun, Moon, LogIn, LogOut } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useAppStore } from '@/store/appStore'
import { useToast } from '@/hooks/use-toast'

declare global {
  interface Window {
    supabaseAPI: {
      getAuthStatus: () => Promise<any>;
      logoutSupabase: () => Promise<any>;
    };
  }
}

export function Header() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { theme, setTheme, sidebarOpen, setSidebarOpen } = useAppStore()
  const [userInfo, setUserInfo] = useState<any>(null);
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  useEffect(() => {
    checkAuth();

    // Listen for login changes
    const handleLoginChange = (event: any) => {
      const { detail } = event as CustomEvent;
      if (detail?.isLoggedIn && detail?.userInfo) {
        setUserInfo(detail.userInfo);
      } else {
        setUserInfo(null);
      }
    };

    window.addEventListener('supabase-login-changed', handleLoginChange);
    return () => {
      window.removeEventListener('supabase-login-changed', handleLoginChange);
    };
  }, []);

  const checkAuth = async () => {
    try {
      // First check localStorage
      const storedLogin = localStorage.getItem('supabase-login');
      if (storedLogin) {
        const loginData = JSON.parse(storedLogin);
        if (loginData.user && loginData.selectedProject) {
          setUserInfo(loginData);
          return;
        }
      }

      // Then check via API
      const status = await window.supabaseAPI.getAuthStatus();
      if (status.ok && status.authenticated) {
        setUserInfo(status);
      }
    } catch (error) {
      console.error('Auth check failed:', error);
    }
  };

  const handleLogout = async () => {
    try {
      setIsLoggingOut(true);
      
      const result = await window.supabaseAPI.logoutSupabase();
      if (result.ok) {
        setUserInfo(null);
        localStorage.removeItem('supabase-login');
        
        toast({
          title: 'Çıkış yapıldı',
          description: 'Başarıyla çıkış yaptınız.',
        });

        window.dispatchEvent(new CustomEvent('supabase-login-changed', {
          detail: { isLoggedIn: false, userInfo: null }
        }));
      }
    } catch (error) {
      console.error('Logout failed:', error);
      toast({
        title: 'Hata',
        description: 'Çıkış yapılamadı.',
        variant: 'destructive',
      });
    } finally {
      setIsLoggingOut(false);
    }
  };

  const toggleTheme = () => {
    setTheme(theme === 'light' ? 'dark' : 'light')
  }

  return (
    <header className="h-14 border-b border-border bg-card px-6 flex items-center justify-between">
      <div className="flex items-center space-x-4">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => setSidebarOpen(!sidebarOpen)}
        >
          <Menu className="h-5 w-5" />
        </Button>
        <h2 className="text-sm font-medium text-muted-foreground">
          Document Processing Workspace
        </h2>
      </div>

      <div className="flex items-center space-x-2">
        {userInfo ? (
          <Button
            variant="ghost"
            size="sm"
            onClick={handleLogout}
            disabled={isLoggingOut}
          >
            <LogOut className="h-4 w-4 mr-1" />
            Çıkış
          </Button>
        ) : (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => navigate('/login')}
          >
            <LogIn className="h-4 w-4 mr-1" />
            Giriş
          </Button>
        )}
        
        <Button
          variant="ghost"
          size="icon"
          onClick={toggleTheme}
        >
          {theme === 'light' ? (
            <Moon className="h-4 w-4" />
          ) : (
            <Sun className="h-4 w-4" />
          )}
        </Button>
      </div>
    </header>
  )
}
