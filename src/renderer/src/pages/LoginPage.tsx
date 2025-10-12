import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Loader2, LogIn, Database } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

declare global {
  interface Window {
    supabaseAPI: {
      startSupabaseAuth: (options: { method?: 'local' | 'custom'; preferExternal?: boolean }) => Promise<any>;
      getAuthStatus: () => Promise<any>;
      fetchProjects: () => Promise<any>;
      fetchUserInfo: () => Promise<any>;
    };
  }
}

export function LoginPage() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const [isCheckingAuth, setIsCheckingAuth] = useState(true);
  const [authStatus, setAuthStatus] = useState<any>(null);
  const [projects, setProjects] = useState<any[]>([]);
  const [selectedProject, setSelectedProject] = useState<any>(null);

  useEffect(() => {
    checkAuthStatus();
  }, []);

  const checkAuthStatus = async () => {
    try {
      setIsCheckingAuth(true);
      const status = await window.supabaseAPI.getAuthStatus();
      
      if (status.ok && status.authenticated) {
        setAuthStatus(status);
        
        // Projeleri yükle
        const projectsResponse = await window.supabaseAPI.fetchProjects();
        if (projectsResponse.ok && projectsResponse.projects) {
          setProjects(projectsResponse.projects);
          
          // Eğer daha önce seçilmiş bir proje varsa onu seç
          const storedLogin = localStorage.getItem('supabase-login');
          if (storedLogin) {
            const loginData = JSON.parse(storedLogin);
            if (loginData.selectedProject) {
              const project = projectsResponse.projects.find(
                (p: any) => p.id === loginData.selectedProject.id
              );
              if (project) {
                setSelectedProject(project);
              }
            }
          }
        }
      }
    } catch (error) {
      console.error('Auth status check failed:', error);
    } finally {
      setIsCheckingAuth(false);
    }
  };

  const handleLogin = async () => {
    try {
      setIsLoading(true);
      
      toast({
        title: 'Giriş yapılıyor...',
        description: 'Tarayıcı penceresi açılacak, lütfen bekleyin.',
      });

      const result = await window.supabaseAPI.startSupabaseAuth({
        method: 'local',
        preferExternal: false,
      });

      console.log('🔍 Login result:', result);

      if (result.ok) {
        // Handler zaten user ve projects bilgisini dönüyor
        if (result.user) {
          setAuthStatus(result);
        }

        if (result.projects && result.projects.length > 0) {
          setProjects(result.projects);
          
          toast({
            title: 'Giriş başarılı!',
            description: `${result.projects.length} proje bulundu.`,
          });
        } else {
          // Projeler yoksa API'den tekrar dene
          toast({
            title: 'Giriş başarılı!',
            description: 'Projeler yükleniyor...',
          });

          const projectsResponse = await window.supabaseAPI.fetchProjects();
          if (projectsResponse.ok && projectsResponse.projects) {
            setProjects(projectsResponse.projects);
            
            toast({
              title: 'Projeler yüklendi',
              description: `${projectsResponse.projects.length} proje bulundu.`,
            });
          } else {
            toast({
              title: 'Uyarı',
              description: 'Proje bulunamadı. Supabase Dashboard\'dan proje oluşturabilirsiniz.',
            });
          }
        }
      } else {
        toast({
          title: 'Giriş başarısız',
          description: result.error || 'Bilinmeyen bir hata oluştu.',
          variant: 'destructive',
        });
      }
    } catch (error) {
      console.error('Login failed:', error);
      toast({
        title: 'Hata',
        description: error instanceof Error ? error.message : 'Giriş yapılamadı.',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleProjectSelect = (project: any) => {
    setSelectedProject(project);
    
    // LocalStorage'a kaydet
    const loginData = {
      authenticated: true,
      selectedProject: project,
      timestamp: Date.now(),
    };
    localStorage.setItem('supabase-login', JSON.stringify(loginData));
    
    toast({
      title: 'Proje seçildi',
      description: `${project.name} projesi seçildi.`,
    });

    // Ana sayfaya yönlendir
    setTimeout(() => {
      navigate('/');
    }, 1000);
  };

  if (isCheckingAuth) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4" />
          <p className="text-sm text-muted-foreground">Kontrol ediliyor...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex items-center justify-center min-h-screen bg-background p-4">
      <Card className="w-full max-w-2xl">
        <CardHeader className="text-center">
          <Database className="h-12 w-12 mx-auto mb-4 text-primary" />
          <CardTitle className="text-2xl">Supabase Giriş</CardTitle>
          <CardDescription>
            Projenize erişmek için Supabase hesabınızla giriş yapın
          </CardDescription>
        </CardHeader>
        <CardContent>
          {!authStatus ? (
            <div className="space-y-4">
              <Button
                onClick={handleLogin}
                disabled={isLoading}
                className="w-full"
                size="lg"
              >
                {isLoading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Giriş yapılıyor...
                  </>
                ) : (
                  <>
                    <LogIn className="mr-2 h-4 w-4" />
                    Supabase ile Giriş Yap
                  </>
                )}
              </Button>
              
              <div className="text-center text-sm text-muted-foreground">
                <p>Supabase OAuth ile güvenli giriş</p>
                <p className="mt-2">Tarayıcı penceresi açılacak ve giriş yapmanız istenecek</p>
              </div>
            </div>
          ) : projects.length === 0 ? (
            <div className="text-center py-8">
              <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4" />
              <p>Projeler yükleniyor...</p>
            </div>
          ) : (
            <div className="space-y-4">
              <div>
                <h3 className="text-lg font-semibold mb-2">Bir proje seçin:</h3>
                <p className="text-sm text-muted-foreground mb-4">
                  {projects.length} proje bulundu
                </p>
              </div>

              <div className="grid gap-2 max-h-96 overflow-y-auto">
                {projects.map((project) => (
                  <Card
                    key={project.id}
                    className={`cursor-pointer transition-colors hover:bg-accent ${
                      selectedProject?.id === project.id ? 'border-primary' : ''
                    }`}
                    onClick={() => handleProjectSelect(project)}
                  >
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between">
                        <div>
                          <h4 className="font-semibold">{project.name}</h4>
                          <p className="text-sm text-muted-foreground">{project.ref}</p>
                          {project.organization_name && (
                            <p className="text-xs text-muted-foreground mt-1">
                              Organizasyon: {project.organization_name}
                            </p>
                          )}
                        </div>
                        <div className="text-right">
                          <span className="text-xs px-2 py-1 rounded bg-secondary">
                            {project.status}
                          </span>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>

              <Button
                variant="outline"
                className="w-full"
                onClick={() => navigate('/')}
              >
                İptal
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

