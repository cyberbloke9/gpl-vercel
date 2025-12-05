import { useEffect, useState } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { CheckCircle2, XCircle, Shield, Zap, Database, AlertTriangle } from 'lucide-react';
import logo from '@/assets/logo.png';

interface OAuthClient {
  id: string;
  name: string;
  icon_url?: string;
}

interface AuthorizationDetails {
  client: OAuthClient;
  scopes: string[];
  redirect_uri: string;
  state?: string;
}

// Scope descriptions for user-friendly display
const SCOPE_INFO: Record<string, { label: string; description: string; icon: React.ReactNode }> = {
  openid: {
    label: 'OpenID Connect',
    description: 'Verify your identity',
    icon: <Shield className="h-4 w-4" />,
  },
  profile: {
    label: 'Profile',
    description: 'Access your name and basic profile information',
    icon: <CheckCircle2 className="h-4 w-4" />,
  },
  email: {
    label: 'Email',
    description: 'Access your email address',
    icon: <CheckCircle2 className="h-4 w-4" />,
  },
  'gpl:read': {
    label: 'Read Plant Data',
    description: 'View checklists, generator logs, and transformer logs',
    icon: <Database className="h-4 w-4" />,
  },
  'gpl:write': {
    label: 'Write Plant Data',
    description: 'Create and update logs and flag issues',
    icon: <Zap className="h-4 w-4" />,
  },
  'gpl:admin': {
    label: 'Admin Access',
    description: 'Full administrative access to plant data',
    icon: <AlertTriangle className="h-4 w-4 text-amber-500" />,
  },
};

export default function OAuthConsent() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();

  const [details, setDetails] = useState<AuthorizationDetails | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [processing, setProcessing] = useState(false);

  const authorizationId = searchParams.get('authorization_id');

  // Redirect to login if not authenticated
  useEffect(() => {
    if (!authLoading && !user) {
      // Store the current URL to redirect back after login
      const returnUrl = window.location.pathname + window.location.search;
      sessionStorage.setItem('oauth_return_url', returnUrl);
      navigate('/auth?redirect=oauth');
    }
  }, [user, authLoading, navigate]);

  // Fetch authorization details
  useEffect(() => {
    if (!authorizationId || !user) return;

    const fetchDetails = async () => {
      try {
        setLoading(true);
        setError(null);

        // Call Supabase OAuth API to get authorization details
        const { data, error: apiError } = await supabase.auth.oauth.getAuthorizationDetails(authorizationId);

        if (apiError) {
          throw apiError;
        }

        if (!data) {
          throw new Error('No authorization details found');
        }

        setDetails(data as unknown as AuthorizationDetails);
      } catch (err: any) {
        console.error('Failed to fetch authorization details:', err);
        setError(err.message || 'Failed to load authorization request');
      } finally {
        setLoading(false);
      }
    };

    fetchDetails();
  }, [authorizationId, user]);

  const handleApprove = async () => {
    if (!authorizationId) return;

    try {
      setProcessing(true);
      setError(null);

      const { data, error: approveError } = await supabase.auth.oauth.approveAuthorization(authorizationId);

      if (approveError) {
        throw approveError;
      }

      // The API should return a redirect URL
      if (data?.redirect_uri) {
        window.location.href = data.redirect_uri;
      }
    } catch (err: any) {
      console.error('Failed to approve authorization:', err);
      setError(err.message || 'Failed to approve authorization');
      setProcessing(false);
    }
  };

  const handleDeny = async () => {
    if (!authorizationId) return;

    try {
      setProcessing(true);
      setError(null);

      const { data, error: denyError } = await supabase.auth.oauth.denyAuthorization(authorizationId);

      if (denyError) {
        throw denyError;
      }

      // Redirect back to client with error
      if (data?.redirect_uri) {
        window.location.href = data.redirect_uri;
      } else {
        navigate('/');
      }
    } catch (err: any) {
      console.error('Failed to deny authorization:', err);
      setError(err.message || 'Failed to deny authorization');
      setProcessing(false);
    }
  };

  // Loading state
  if (authLoading || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background to-muted p-4">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <Skeleton className="h-16 w-16 rounded-full mx-auto mb-4" />
            <Skeleton className="h-6 w-48 mx-auto mb-2" />
            <Skeleton className="h-4 w-64 mx-auto" />
          </CardHeader>
          <CardContent className="space-y-3">
            <Skeleton className="h-12 w-full" />
            <Skeleton className="h-12 w-full" />
            <Skeleton className="h-12 w-full" />
          </CardContent>
          <CardFooter className="flex gap-3">
            <Skeleton className="h-10 flex-1" />
            <Skeleton className="h-10 flex-1" />
          </CardFooter>
        </Card>
      </div>
    );
  }

  // Error state - no authorization ID
  if (!authorizationId) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background to-muted p-4">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <XCircle className="h-16 w-16 text-destructive mx-auto mb-4" />
            <CardTitle>Invalid Request</CardTitle>
            <CardDescription>
              No authorization request found. Please try again from the application.
            </CardDescription>
          </CardHeader>
          <CardFooter>
            <Button onClick={() => navigate('/')} className="w-full">
              Return to Dashboard
            </Button>
          </CardFooter>
        </Card>
      </div>
    );
  }

  // Error state - failed to load
  if (error && !details) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background to-muted p-4">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <XCircle className="h-16 w-16 text-destructive mx-auto mb-4" />
            <CardTitle>Authorization Failed</CardTitle>
            <CardDescription>{error}</CardDescription>
          </CardHeader>
          <CardFooter>
            <Button onClick={() => navigate('/')} className="w-full">
              Return to Dashboard
            </Button>
          </CardFooter>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background to-muted p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          {/* App Logo */}
          <div className="flex justify-center mb-4">
            <img src={logo} alt="GPL Logo" className="h-16 w-16 object-contain" />
          </div>

          <CardTitle className="text-xl">Authorize Application</CardTitle>
          <CardDescription>
            <span className="font-semibold text-foreground">{details?.client?.name || 'An application'}</span>
            {' '}wants to access your Gayatri Power account
          </CardDescription>
        </CardHeader>

        <CardContent className="space-y-4">
          {/* User info */}
          <div className="bg-muted/50 rounded-lg p-3 text-center">
            <p className="text-sm text-muted-foreground">Signed in as</p>
            <p className="font-medium truncate">{user?.email}</p>
          </div>

          {/* Requested permissions */}
          <div>
            <p className="text-sm font-medium mb-3">This will allow the application to:</p>
            <div className="space-y-2">
              {details?.scopes?.map((scope) => {
                const info = SCOPE_INFO[scope] || {
                  label: scope,
                  description: `Access to ${scope}`,
                  icon: <CheckCircle2 className="h-4 w-4" />,
                };

                return (
                  <div
                    key={scope}
                    className="flex items-start gap-3 p-3 rounded-lg border bg-card"
                  >
                    <div className="mt-0.5 text-primary">{info.icon}</div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="font-medium text-sm">{info.label}</p>
                        {scope.includes('admin') && (
                          <Badge variant="outline" className="text-xs">Sensitive</Badge>
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground">{info.description}</p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Error message */}
          {error && (
            <Alert variant="destructive">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {/* Security note */}
          <p className="text-xs text-muted-foreground text-center">
            Make sure you trust this application before authorizing.
            You can revoke access at any time from your account settings.
          </p>
        </CardContent>

        <CardFooter className="flex gap-3">
          <Button
            variant="outline"
            onClick={handleDeny}
            disabled={processing}
            className="flex-1"
          >
            <XCircle className="h-4 w-4 mr-2" />
            Deny
          </Button>
          <Button
            onClick={handleApprove}
            disabled={processing}
            className="flex-1"
          >
            {processing ? (
              'Processing...'
            ) : (
              <>
                <CheckCircle2 className="h-4 w-4 mr-2" />
                Authorize
              </>
            )}
          </Button>
        </CardFooter>
      </Card>
    </div>
  );
}
