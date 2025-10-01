import React from 'react';
import { TenantManager } from '../components/TenantManager';
import { TenantAwareDocumentCreator } from '../components/TenantAwareDocumentCreator';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/tabs';
import { Building2, FileText, Settings } from 'lucide-react';

export function TenantPage() {
  return (
    <div className="container mx-auto py-8 px-4">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">Multi-Tenant Management</h1>
        <p className="text-muted-foreground">
          Manage your tenant settings and create tenant-aware documents with Row Level Security (RLS).
        </p>
      </div>

      <Tabs defaultValue="tenant" className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="tenant" className="flex items-center gap-2">
            <Building2 className="h-4 w-4" />
            Tenant Management
          </TabsTrigger>
          <TabsTrigger value="documents" className="flex items-center gap-2">
            <FileText className="h-4 w-4" />
            Create Documents
          </TabsTrigger>
          <TabsTrigger value="settings" className="flex items-center gap-2">
            <Settings className="h-4 w-4" />
            Settings
          </TabsTrigger>
        </TabsList>

        <TabsContent value="tenant" className="mt-6">
          <TenantManager />
        </TabsContent>

        <TabsContent value="documents" className="mt-6">
          <TenantAwareDocumentCreator />
        </TabsContent>

        <TabsContent value="settings" className="mt-6">
          <div className="w-full max-w-2xl mx-auto">
            <div className="bg-muted/50 p-6 rounded-lg">
              <h3 className="text-lg font-semibold mb-4">Multi-Tenant Architecture</h3>
              <div className="space-y-4 text-sm">
                <div>
                  <h4 className="font-medium mb-2">Features:</h4>
                  <ul className="list-disc list-inside space-y-1 text-muted-foreground">
                    <li>Row Level Security (RLS) for data isolation</li>
                    <li>Tenant-based document management</li>
                    <li>Automatic tenant provisioning</li>
                    <li>Secure API endpoints with JWT authentication</li>
                  </ul>
                </div>
                <div>
                  <h4 className="font-medium mb-2">Security:</h4>
                  <ul className="list-disc list-inside space-y-1 text-muted-foreground">
                    <li>Users can only access their own tenant's data</li>
                    <li>All database operations are tenant-scoped</li>
                    <li>Service role key protected on backend</li>
                    <li>Frontend uses anon key with RLS policies</li>
                  </ul>
                </div>
              </div>
            </div>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
