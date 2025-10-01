import React, { useState, useEffect } from 'react';
import { tenant, tenantData, auth } from '../lib/supabase';
import { Button } from './ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Textarea } from './ui/textarea';
import { Loader2, FileText, Plus, AlertCircle } from 'lucide-react';
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

interface DocumentFormData {
  filename: string;
  title: string;
  file_type: 'pdf' | 'docx' | 'excel' | 'powerpoint';
  page_count: number;
  user_id: string;
}

export function TenantAwareDocumentCreator() {
  const [currentTenant, setCurrentTenant] = useState<Tenant | null>(null);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [user, setUser] = useState<any>(null);
  
  // Form state
  const [formData, setFormData] = useState<DocumentFormData>({
    filename: '',
    title: '',
    file_type: 'pdf',
    page_count: 1,
    user_id: ''
  });

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

      if (user) {
        setFormData(prev => ({
          ...prev,
          user_id: user.id
        }));
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!currentTenant) {
      toast({
        title: "Error",
        description: "No tenant found. Please create a tenant first.",
        variant: "destructive",
      });
      return;
    }

    if (!formData.filename.trim() || !formData.title.trim()) {
      toast({
        title: "Error",
        description: "Please fill in all required fields",
        variant: "destructive",
      });
      return;
    }

    try {
      setCreating(true);
      
      const documentData = {
        filename: formData.filename,
        title: formData.title,
        file_type: formData.file_type,
        page_count: formData.page_count,
        user_id: formData.user_id
      };

      const newDocument = await tenantData.createDocument(documentData, currentTenant.id);
      
      toast({
        title: "Success",
        description: `Document "${newDocument.title}" created successfully in tenant "${currentTenant.name}"`,
      });

      // Reset form
      setFormData({
        filename: '',
        title: '',
        file_type: 'pdf',
        page_count: 1,
        user_id: formData.user_id
      });
    } catch (error: any) {
      console.error('Error creating document:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to create document",
        variant: "destructive",
      });
    } finally {
      setCreating(false);
    }
  };

  const handleInputChange = (field: keyof DocumentFormData, value: string | number) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
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

  if (!currentTenant) {
    return (
      <Card className="w-full max-w-2xl mx-auto">
        <CardContent className="flex items-center justify-center py-8">
          <div className="text-center">
            <AlertCircle className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-semibold mb-2">No Tenant Found</h3>
            <p className="text-muted-foreground mb-4">
              You need to create a tenant before you can create documents.
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="w-full max-w-2xl mx-auto">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <FileText className="h-5 w-5" />
          Create Document
        </CardTitle>
        <CardDescription>
          Create a new document in tenant "{currentTenant.name}"
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="filename">Filename *</Label>
              <Input
                id="filename"
                value={formData.filename}
                onChange={(e) => handleInputChange('filename', e.target.value)}
                placeholder="document.pdf"
                required
              />
            </div>
            <div>
              <Label htmlFor="file_type">File Type *</Label>
              <select
                id="file_type"
                value={formData.file_type}
                onChange={(e) => handleInputChange('file_type', e.target.value)}
                className="w-full px-3 py-2 border border-input bg-background rounded-md text-sm"
                required
              >
                <option value="pdf">PDF</option>
                <option value="docx">Word Document</option>
                <option value="excel">Excel</option>
                <option value="powerpoint">PowerPoint</option>
              </select>
            </div>
          </div>

          <div>
            <Label htmlFor="title">Document Title *</Label>
            <Input
              id="title"
              value={formData.title}
              onChange={(e) => handleInputChange('title', e.target.value)}
              placeholder="Enter document title"
              required
            />
          </div>

          <div>
            <Label htmlFor="page_count">Page Count</Label>
            <Input
              id="page_count"
              type="number"
              min="1"
              value={formData.page_count}
              onChange={(e) => handleInputChange('page_count', parseInt(e.target.value) || 1)}
              placeholder="1"
            />
          </div>

          <div className="flex justify-end pt-4">
            <Button
              type="submit"
              disabled={creating || !formData.filename.trim() || !formData.title.trim()}
              className="flex items-center gap-2"
            >
              {creating && <Loader2 className="h-4 w-4 animate-spin" />}
              <Plus className="h-4 w-4" />
              Create Document
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
