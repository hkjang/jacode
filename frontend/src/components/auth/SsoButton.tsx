'use client';

import { useState, useEffect } from 'react';
import { Loader2, Key } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { api } from '@/lib/api';

interface SsoConfig {
  keycloak: {
    enabled: boolean;
    realm: string;
  };
}

export function SsoButton() {
  const [config, setConfig] = useState<SsoConfig | null>(null);
  const [loading, setLoading] = useState(true);
  const [ssoLoading, setSsoLoading] = useState(false);

  useEffect(() => {
    loadConfig();
  }, []);

  const loadConfig = async () => {
    try {
      const res = await api.get('/api/auth/sso/config');
      setConfig(res.data);
    } catch (error) {
      console.error('Failed to load SSO config:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSsoLogin = () => {
    setSsoLoading(true);
    // Redirect to SSO authorization
    window.location.href = '/api/auth/sso/authorize';
  };

  if (loading) {
    return (
      <div className="flex justify-center py-4">
        <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!config?.keycloak?.enabled) {
    return null;
  }

  return (
    <div className="space-y-3">
      <div className="relative">
        <div className="absolute inset-0 flex items-center">
          <span className="w-full border-t" />
        </div>
        <div className="relative flex justify-center text-xs uppercase">
          <span className="bg-background px-2 text-muted-foreground">또는</span>
        </div>
      </div>

      <Button
        variant="outline"
        className="w-full"
        onClick={handleSsoLogin}
        disabled={ssoLoading}
      >
        {ssoLoading ? (
          <Loader2 className="h-4 w-4 animate-spin mr-2" />
        ) : (
          <Key className="h-4 w-4 mr-2" />
        )}
        SSO로 로그인 (Keycloak)
      </Button>
    </div>
  );
}

export default SsoButton;
