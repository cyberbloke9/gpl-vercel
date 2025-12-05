/**
 * OAuth 2.1 Authentication Helper for GPL MCP Server
 *
 * Handles token validation and user-scoped Supabase access
 */

import { createClient, SupabaseClient, User } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.GPL_SUPABASE_URL || process.env.SUPABASE_URL || '';
const SUPABASE_ANON_KEY = process.env.GPL_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY || '';

export interface AuthContext {
  user: User | null;
  scopes: string[];
  client: SupabaseClient;
}

/**
 * Available OAuth scopes for GPL MCP Server
 */
export const GPL_SCOPES = {
  // Standard OIDC scopes
  OPENID: 'openid',
  PROFILE: 'profile',
  EMAIL: 'email',

  // GPL-specific scopes
  READ: 'gpl:read', // Read plant data (logs, checklists, issues)
  WRITE: 'gpl:write', // Create/update logs and issues
  ADMIN: 'gpl:admin', // Full administrative access
} as const;

/**
 * Check if a scope is present in the token
 */
export function hasScope(scopes: string[], required: string): boolean {
  return scopes.includes(required) || scopes.includes(GPL_SCOPES.ADMIN);
}

/**
 * Check if all required scopes are present
 */
export function hasAllScopes(scopes: string[], required: string[]): boolean {
  return required.every((s) => hasScope(scopes, s));
}

/**
 * Check if any of the required scopes are present
 */
export function hasAnyScope(scopes: string[], required: string[]): boolean {
  return required.some((s) => hasScope(scopes, s));
}

/**
 * Create an authenticated Supabase client from an access token
 */
export async function createAuthenticatedClient(accessToken: string): Promise<AuthContext> {
  // Create client with the user's access token
  const client = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    global: {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    },
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });

  // Get user from token
  const {
    data: { user },
    error,
  } = await client.auth.getUser(accessToken);

  if (error || !user) {
    throw new Error('Invalid or expired access token');
  }

  // Extract scopes from token (stored in app_metadata or as custom claim)
  const scopes = extractScopes(accessToken);

  return {
    user,
    scopes,
    client,
  };
}

/**
 * Extract scopes from JWT token
 */
function extractScopes(token: string): string[] {
  try {
    // Decode JWT payload (base64)
    const parts = token.split('.');
    if (parts.length !== 3) {
      return [];
    }

    const payload = JSON.parse(Buffer.from(parts[1], 'base64').toString());

    // Scopes might be in different places depending on Supabase config
    const scopes =
      payload.scope?.split(' ') || // OAuth standard
      payload.scopes || // Array format
      payload.app_metadata?.scopes || // Supabase custom
      [];

    return Array.isArray(scopes) ? scopes : [];
  } catch {
    return [];
  }
}

/**
 * Validate that the request has required permissions
 */
export function requireScopes(context: AuthContext, required: string[]): void {
  if (!hasAllScopes(context.scopes, required)) {
    throw new Error(
      `Insufficient permissions. Required scopes: ${required.join(', ')}. ` +
        `Available scopes: ${context.scopes.join(', ') || 'none'}`
    );
  }
}

/**
 * Get scope requirements for each tool
 */
export const TOOL_SCOPES: Record<string, string[]> = {
  get_plant_status: [GPL_SCOPES.READ],
  get_generator_logs: [GPL_SCOPES.READ],
  get_transformer_logs: [GPL_SCOPES.READ],
  get_checklists: [GPL_SCOPES.READ],
  get_issues: [GPL_SCOPES.READ],
  flag_issue: [GPL_SCOPES.WRITE],
  get_statistics: [GPL_SCOPES.READ],
};

/**
 * Check if a tool can be executed with the given scopes
 */
export function canExecuteTool(toolName: string, scopes: string[]): boolean {
  const required = TOOL_SCOPES[toolName];
  if (!required) {
    return true; // Unknown tools allowed by default
  }
  return hasAllScopes(scopes, required);
}
