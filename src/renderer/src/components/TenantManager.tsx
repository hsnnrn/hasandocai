import React, { useState, useEffect } from 'react';
import { tenant, auth } from '../lib/supabase';
import { Button } from './ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Badge } from './ui/badge';
import { Loader2, Building2, Users, FileText, Settings } from 'lucide-react';
import { toast } from '../hooks/use-toast';

interface Tenant {
  id: string;
  owner_id: string;
  name: string;
  plan: string;
  settings: any;
  created_at: string;
  updated_at: string;
}

interface TenantStats {
  tenant_id: string;
  document_count: number;
  text_sections_count: number;
  created_at: string;
  plan: string;
}

export function TenantManager() {
  const [currentTenant, setCurrentTenant] = useState<Tenant | null>(null);
  const [tenantStats, setTenantStats] = useState<TenantStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [updating, setUpdating] = useState(false);
  const [user, setUser] = useState<any>(null);
  
  // Form state for creating/updating tenant
  const [tenantName, setTenantName] = useState('');
  const [tenantPlan, setTenantPlan] = useState('free');

  useEffect(() => {
    loadTenantData();
  }, []);

  const loadTenantData = async () => {
    try {
      setLoading(true);
      
      // Get current user
      const { user, error: userError } = await auth.getUser();
      if (userError) throw userError;
      setUser(user);

      // Get current tenant
      const tenantResponse = await tenant.getCurrentTenant();
      setCurrentTenant(tenantResponse?.tenant || null);

      if (tenantResponse?.tenant) {
        // Get tenant stats
        const statsResponse = await tenant.getTenantStats(tenantResponse.tenant.id);
        setTenantStats(statsResponse);
        
        // Set form values
        setTenantName(tenantResponse.tenant.name);
        setTenantPlan(tenantResponse.tenant.plan);
      }
    } catch (error) {
      console.error('Error loading tenant data:', error);
      toast({
        title: "Error",
        description: "Failed to load tenant information",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleCreateTenant = async () => {
    if (!tenantName.trim()) {
      toast({
        title: "Error",
        description: "Please enter a tenant name",
        variant: "destructive",
      });
      return;
    }

    try {
      setCreating(true);
      const response = await tenant.createTenant(tenantName, tenantPlan);
      setCurrentTenant(response.tenant);
      
      toast({
        title: "Success",
        description: `Tenant "${response.tenant.name}" created successfully`,
      });
      
      // Reload tenant data
      await loadTenantData();
    } catch (error: any) {
      console.error('Error creating tenant:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to create tenant",
        variant: "destructive",
      });
    } finally {
      setCreating(false);
    }
  };

  const handleUpdateTenant = async () => {
    if (!currentTenant || !tenantName.trim()) {
      toast({
        title: "Error",
        description: "Please enter a tenant name",
        variant: "destructive",
      });
      return;
    }

    try {
      setUpdating(true);
      const response = await tenant.updateTenant(currentTenant.id, {
        name: tenantName,
        plan: tenantPlan
      });
      setCurrentTenant(response.tenant);
      
      toast({
        title: "Success",
        description: "Tenant updated successfully",
      });
    } catch (error: any) {
      console.error('Error updating tenant:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to update tenant",
        variant: "destructive",
      });
    } finally {
      setUpdating(false);
    }
  };

  if (loading) {
    return (
      <Card className="w-full max-w-2xl mx-auto">
        <CardContent className="flex items-center justify-center py-8">
          <Loader2 className="h-8 w-8 animate-spin" />
          <span className="ml-2">Loading tenant information...</span>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="w-full max-w-4xl mx-auto space-y-6">
      {/* Current User Info */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            Current User
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label className="text-sm font-medium text-muted-foreground">Email</Label>
              <p className="text-sm">{user?.email || 'Not available'}</p>
            </div>
            <div>
              <Label className="text-sm font-medium text-muted-foreground">User ID</Label>
              <p className="text-sm font-mono text-xs">{user?.id || 'Not available'}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Tenant Information */}
      {currentTenant ? (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Building2 className="h-5 w-5" />
              Current Tenant
            </CardTitle>
            <CardDescription>
              Manage your tenant settings and view statistics
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Tenant Details */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label className="text-sm font-medium text-muted-foreground">Tenant Name</Label>
                <Input
                  value={tenantName}
                  onChange={(e) => setTenantName(e.target.value)}
                  placeholder="Enter tenant name"
                />
              </div>
              <div>
                <Label className="text-sm font-medium text-muted-foreground">Plan</Label>
                <select
                  value={tenantPlan}
                  onChange={(e) => setTenantPlan(e.target.value)}
                  className="w-full px-3 py-2 border border-input bg-background rounded-md text-sm"
                >
                  <option value="free">Free</option>
                  <option value="pro">Pro</option>
                  <option value="enterprise">Enterprise</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label className="text-sm font-medium text-muted-foreground">Tenant ID</Label>
                <p className="text-sm font-mono text-xs">{currentTenant.id}</p>
              </div>
              <div>
                <Label className="text-sm font-medium text-muted-foreground">Created</Label>
                <p className="text-sm">{new Date(currentTenant.created_at).toLocaleDateString()}</p>
              </div>
            </div>

            {/* Tenant Statistics */}
            {tenantStats && (
              <div className="border-t pt-4">
                <h4 className="font-medium mb-3 flex items-center gap-2">
                  <FileText className="h-4 w-4" />
                  Tenant Statistics
                </h4>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="text-center">
                    <div className="text-2xl font-bold">{tenantStats.document_count}</div>
                    <div className="text-sm text-muted-foreground">Documents</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold">{tenantStats.text_sections_count}</div>
                    <div className="text-sm text-muted-foreground">Text Sections</div>
                  </div>
                  <div className="text-center">
                    <Badge variant={tenantStats.plan === 'free' ? 'secondary' : 'default'}>
                      {tenantStats.plan}
                    </Badge>
                    <div className="text-sm text-muted-foreground mt-1">Plan</div>
                  </div>
                </div>
              </div>
            )}

            {/* Update Button */}
            <div className="flex justify-end">
              <Button
                onClick={handleUpdateTenant}
                disabled={updating}
                className="flex items-center gap-2"
              >
                {updating && <Loader2 className="h-4 w-4 animate-spin" />}
                <Settings className="h-4 w-4" />
                Update Tenant
              </Button>
            </div>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Building2 className="h-5 w-5" />
              Create Tenant
            </CardTitle>
            <CardDescription>
              Create a new tenant to start using the multi-tenant features
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="tenant-name">Tenant Name</Label>
                <Input
                  id="tenant-name"
                  value={tenantName}
                  onChange={(e) => setTenantName(e.target.value)}
                  placeholder="Enter tenant name"
                />
              </div>
              <div>
                <Label htmlFor="tenant-plan">Plan</Label>
                <select
                  id="tenant-plan"
                  value={tenantPlan}
                  onChange={(e) => setTenantPlan(e.target.value)}
                  className="w-full px-3 py-2 border border-input bg-background rounded-md text-sm"
                >
                  <option value="free">Free</option>
                  <option value="pro">Pro</option>
                  <option value="enterprise">Enterprise</option>
                </select>
              </div>
            </div>

            <div className="flex justify-end">
              <Button
                onClick={handleCreateTenant}
                disabled={creating || !tenantName.trim()}
                className="flex items-center gap-2"
              >
                {creating && <Loader2 className="h-4 w-4 animate-spin" />}
                <Building2 className="h-4 w-4" />
                Create Tenant
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
