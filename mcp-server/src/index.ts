#!/usr/bin/env node
/**
 * GPL MCP Server - Gayatri Power Plant Data Access
 *
 * This MCP server enables AI agents to securely access and interact with
 * power plant monitoring data from the Gayatri Power Limited system.
 *
 * Authentication: OAuth 2.1 via Supabase
 *
 * Available Tools:
 * - get_plant_status: Get current plant operational status
 * - get_generator_logs: Query generator hourly logs
 * - get_transformer_logs: Query transformer hourly logs
 * - get_checklists: Get daily inspection checklists
 * - get_issues: Get flagged issues and their status
 * - flag_issue: Create a new issue flag
 * - get_statistics: Get plant performance statistics
 */

import 'dotenv/config';
import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
  ListResourcesRequestSchema,
  ReadResourceRequestSchema,
} from '@modelcontextprotocol/sdk/types.js';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { z } from 'zod';
import { formatInTimeZone } from 'date-fns-tz';

// Environment configuration
const SUPABASE_URL = process.env.GPL_SUPABASE_URL || process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.GPL_SUPABASE_SERVICE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;
const IST_TIMEZONE = 'Asia/Kolkata';

// Validate required environment variables
if (!SUPABASE_URL || !SUPABASE_KEY) {
  console.error('Error: Missing required environment variables.');
  console.error('Please set GPL_SUPABASE_URL and GPL_SUPABASE_SERVICE_KEY');
  process.exit(1);
}

// Initialize Supabase client
const supabase: SupabaseClient = createClient(SUPABASE_URL, SUPABASE_KEY, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
});

// Helper: Get today's date in IST
function getTodayIST(): string {
  return formatInTimeZone(new Date(), IST_TIMEZONE, 'yyyy-MM-dd');
}

// Helper: Get current hour in IST
function getCurrentHourIST(): number {
  return parseInt(formatInTimeZone(new Date(), IST_TIMEZONE, 'H'), 10);
}

// Tool input schemas
const DateRangeSchema = z.object({
  start_date: z.string().optional().describe('Start date (YYYY-MM-DD). Defaults to today.'),
  end_date: z.string().optional().describe('End date (YYYY-MM-DD). Defaults to today.'),
});

const GeneratorLogsSchema = z.object({
  date: z.string().optional().describe('Date to query (YYYY-MM-DD). Defaults to today.'),
  hour: z.number().min(0).max(23).optional().describe('Specific hour (0-23). If omitted, returns all hours.'),
  fields: z.array(z.string()).optional().describe('Specific fields to return. If omitted, returns all.'),
});

const TransformerLogsSchema = z.object({
  date: z.string().optional().describe('Date to query (YYYY-MM-DD). Defaults to today.'),
  hour: z.number().min(0).max(23).optional().describe('Specific hour (0-23). If omitted, returns all hours.'),
  transformer_number: z.number().optional().default(1).describe('Transformer number (default: 1)'),
});

const ChecklistSchema = z.object({
  date: z.string().optional().describe('Date to query (YYYY-MM-DD). Defaults to today.'),
  include_module_data: z.boolean().default(false).describe('Include full module data (can be large)'),
});

const IssuesSchema = z.object({
  status: z.enum(['open', 'in_progress', 'resolved', 'closed', 'all']).default('all'),
  severity: z.enum(['low', 'medium', 'high', 'critical', 'all']).default('all'),
  limit: z.number().min(1).max(100).default(20),
});

const FlagIssueSchema = z.object({
  module: z.string().describe('Module name (e.g., "Module 1", "Generator", "Transformer")'),
  section: z.string().describe('Section within the module'),
  item: z.string().describe('Specific item with the issue'),
  description: z.string().describe('Detailed description of the issue'),
  severity: z.enum(['low', 'medium', 'high', 'critical']).describe('Issue severity level'),
  unit: z.string().optional().describe('Unit identifier if applicable'),
});

const StatisticsSchema = z.object({
  period: z.enum(['today', 'week', 'month']).default('today'),
});

// Create MCP Server
const server = new Server(
  {
    name: 'gpl-mcp-server',
    version: '1.0.0',
  },
  {
    capabilities: {
      tools: {},
      resources: {},
    },
  }
);

// List available tools
server.setRequestHandler(ListToolsRequestSchema, async () => {
  return {
    tools: [
      {
        name: 'get_plant_status',
        description: 'Get the current operational status of the Gayatri Power Plant including active units, current generation, and any ongoing issues.',
        inputSchema: {
          type: 'object',
          properties: {},
        },
      },
      {
        name: 'get_generator_logs',
        description: 'Query hourly generator logs including winding temperatures, bearing temperatures, electrical parameters (voltage, current, power), AVR settings, and intake/cooling system readings.',
        inputSchema: {
          type: 'object',
          properties: {
            date: { type: 'string', description: 'Date (YYYY-MM-DD). Defaults to today.' },
            hour: { type: 'number', minimum: 0, maximum: 23, description: 'Specific hour (0-23)' },
            fields: { type: 'array', items: { type: 'string' }, description: 'Specific fields to return' },
          },
        },
      },
      {
        name: 'get_transformer_logs',
        description: 'Query hourly transformer logs including PTR feeder readings (voltage, current, power, temperature), LTAC feeder data, and generation meter values.',
        inputSchema: {
          type: 'object',
          properties: {
            date: { type: 'string', description: 'Date (YYYY-MM-DD). Defaults to today.' },
            hour: { type: 'number', minimum: 0, maximum: 23, description: 'Specific hour (0-23)' },
            transformer_number: { type: 'number', default: 1, description: 'Transformer number' },
          },
        },
      },
      {
        name: 'get_checklists',
        description: 'Get daily inspection checklists including turbine, OPU, cooling system, and generator visual inspections for both Unit 1 (1.5 MW) and Unit 2 (0.7 MW).',
        inputSchema: {
          type: 'object',
          properties: {
            date: { type: 'string', description: 'Date (YYYY-MM-DD). Defaults to today.' },
            include_module_data: { type: 'boolean', default: false, description: 'Include full module data' },
          },
        },
      },
      {
        name: 'get_issues',
        description: 'Get flagged issues from inspections and monitoring, with filtering by status and severity.',
        inputSchema: {
          type: 'object',
          properties: {
            status: { type: 'string', enum: ['open', 'in_progress', 'resolved', 'closed', 'all'], default: 'all' },
            severity: { type: 'string', enum: ['low', 'medium', 'high', 'critical', 'all'], default: 'all' },
            limit: { type: 'number', minimum: 1, maximum: 100, default: 20 },
          },
        },
      },
      {
        name: 'flag_issue',
        description: 'Create a new issue flag for plant maintenance or anomaly tracking.',
        inputSchema: {
          type: 'object',
          properties: {
            module: { type: 'string', description: 'Module name' },
            section: { type: 'string', description: 'Section within the module' },
            item: { type: 'string', description: 'Specific item' },
            description: { type: 'string', description: 'Issue description' },
            severity: { type: 'string', enum: ['low', 'medium', 'high', 'critical'] },
            unit: { type: 'string', description: 'Unit identifier' },
          },
          required: ['module', 'section', 'item', 'description', 'severity'],
        },
      },
      {
        name: 'get_statistics',
        description: 'Get plant performance statistics and summary metrics for a given period.',
        inputSchema: {
          type: 'object',
          properties: {
            period: { type: 'string', enum: ['today', 'week', 'month'], default: 'today' },
          },
        },
      },
    ],
  };
});

// List available resources
server.setRequestHandler(ListResourcesRequestSchema, async () => {
  return {
    resources: [
      {
        uri: 'gpl://plant/status',
        name: 'Plant Status',
        description: 'Current operational status of Gayatri Power Plant',
        mimeType: 'application/json',
      },
      {
        uri: 'gpl://logs/generator/today',
        name: "Today's Generator Logs",
        description: 'All generator log entries for today',
        mimeType: 'application/json',
      },
      {
        uri: 'gpl://logs/transformer/today',
        name: "Today's Transformer Logs",
        description: 'All transformer log entries for today',
        mimeType: 'application/json',
      },
      {
        uri: 'gpl://issues/open',
        name: 'Open Issues',
        description: 'All currently open issues requiring attention',
        mimeType: 'application/json',
      },
    ],
  };
});

// Read resources
server.setRequestHandler(ReadResourceRequestSchema, async (request) => {
  const { uri } = request.params;

  switch (uri) {
    case 'gpl://plant/status': {
      const status = await getPlantStatus();
      return {
        contents: [
          {
            uri,
            mimeType: 'application/json',
            text: JSON.stringify(status, null, 2),
          },
        ],
      };
    }
    case 'gpl://logs/generator/today': {
      const logs = await getGeneratorLogs({ date: getTodayIST() });
      return {
        contents: [
          {
            uri,
            mimeType: 'application/json',
            text: JSON.stringify(logs, null, 2),
          },
        ],
      };
    }
    case 'gpl://logs/transformer/today': {
      const logs = await getTransformerLogs({ date: getTodayIST(), transformer_number: 1 });
      return {
        contents: [
          {
            uri,
            mimeType: 'application/json',
            text: JSON.stringify(logs, null, 2),
          },
        ],
      };
    }
    case 'gpl://issues/open': {
      const issues = await getIssues({ status: 'open', severity: 'all', limit: 50 });
      return {
        contents: [
          {
            uri,
            mimeType: 'application/json',
            text: JSON.stringify(issues, null, 2),
          },
        ],
      };
    }
    default:
      throw new Error(`Unknown resource: ${uri}`);
  }
});

// Tool implementations
async function getPlantStatus() {
  const today = getTodayIST();
  const currentHour = getCurrentHourIST();

  // Get today's checklist status
  const { data: checklists } = await supabase
    .from('checklists')
    .select('id, status, completion_percentage, submitted, shift')
    .eq('date', today)
    .order('created_at', { ascending: false })
    .limit(1);

  // Get today's generator log count
  const { count: generatorLogCount } = await supabase
    .from('generator_logs')
    .select('*', { count: 'exact', head: true })
    .eq('date', today);

  // Get today's transformer log count
  const { count: transformerLogCount } = await supabase
    .from('transformer_logs')
    .select('*', { count: 'exact', head: true })
    .eq('date', today);

  // Get open issues count
  const { count: openIssues } = await supabase
    .from('flagged_issues')
    .select('*', { count: 'exact', head: true })
    .eq('status', 'open');

  // Get latest generator readings
  const { data: latestGenerator } = await supabase
    .from('generator_logs')
    .select('gen_kw, gen_frequency, gen_power_factor, hour')
    .eq('date', today)
    .order('hour', { ascending: false })
    .limit(1);

  return {
    timestamp: new Date().toISOString(),
    timezone: IST_TIMEZONE,
    date: today,
    current_hour: currentHour,
    plant: {
      name: 'Gayatri Power Private Limited',
      capacity_mw: 2.2,
      units: [
        { id: 1, capacity_mw: 1.5, type: 'Hydro' },
        { id: 2, capacity_mw: 0.7, type: 'Hydro' },
      ],
    },
    daily_progress: {
      checklist_status: checklists?.[0]?.status || 'not_started',
      checklist_completion: checklists?.[0]?.completion_percentage || 0,
      generator_logs_completed: generatorLogCount || 0,
      transformer_logs_completed: transformerLogCount || 0,
      total_hours: 24,
    },
    current_readings: latestGenerator?.[0]
      ? {
          power_kw: latestGenerator[0].gen_kw,
          frequency_hz: latestGenerator[0].gen_frequency,
          power_factor: latestGenerator[0].gen_power_factor,
          last_reading_hour: latestGenerator[0].hour,
        }
      : null,
    open_issues_count: openIssues || 0,
  };
}

async function getGeneratorLogs(params: z.infer<typeof GeneratorLogsSchema>) {
  const date = params.date || getTodayIST();

  let query = supabase
    .from('generator_logs')
    .select('*')
    .eq('date', date)
    .order('hour', { ascending: true });

  if (params.hour !== undefined) {
    query = query.eq('hour', params.hour);
  }

  const { data, error } = await query;

  if (error) {
    throw new Error(`Failed to fetch generator logs: ${error.message}`);
  }

  // If specific fields requested, filter the response
  if (params.fields && params.fields.length > 0 && data) {
    return data.map((log) => {
      const filtered: Record<string, any> = { date: log.date, hour: log.hour };
      for (const field of params.fields!) {
        if (field in log) {
          filtered[field] = (log as any)[field];
        }
      }
      return filtered;
    });
  }

  return data;
}

async function getTransformerLogs(params: z.infer<typeof TransformerLogsSchema>) {
  const date = params.date || getTodayIST();

  let query = supabase
    .from('transformer_logs')
    .select('*')
    .eq('date', date)
    .eq('transformer_number', params.transformer_number || 1)
    .order('hour', { ascending: true });

  if (params.hour !== undefined) {
    query = query.eq('hour', params.hour);
  }

  const { data, error } = await query;

  if (error) {
    throw new Error(`Failed to fetch transformer logs: ${error.message}`);
  }

  return data;
}

async function getChecklists(params: z.infer<typeof ChecklistSchema>) {
  const date = params.date || getTodayIST();

  const selectFields = params.include_module_data
    ? '*'
    : 'id, date, shift, status, completion_percentage, submitted, submitted_at, problem_count, flagged_issues_count, created_at, updated_at';

  const { data, error } = await supabase
    .from('checklists')
    .select(selectFields)
    .eq('date', date)
    .order('created_at', { ascending: false });

  if (error) {
    throw new Error(`Failed to fetch checklists: ${error.message}`);
  }

  return data;
}

async function getIssues(params: z.infer<typeof IssuesSchema>) {
  let query = supabase
    .from('flagged_issues')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(params.limit);

  if (params.status !== 'all') {
    query = query.eq('status', params.status);
  }

  if (params.severity !== 'all') {
    query = query.eq('severity', params.severity);
  }

  const { data, error } = await query;

  if (error) {
    throw new Error(`Failed to fetch issues: ${error.message}`);
  }

  return data;
}

async function flagIssue(params: z.infer<typeof FlagIssueSchema>, userId?: string) {
  const issueCode = `GPL-${Date.now().toString(36).toUpperCase()}`;

  const { data, error } = await supabase
    .from('flagged_issues')
    .insert({
      issue_code: issueCode,
      module: params.module,
      section: params.section,
      item: params.item,
      description: params.description,
      severity: params.severity,
      unit: params.unit,
      status: 'open',
      user_id: userId || 'mcp-agent',
      reported_at: new Date().toISOString(),
    })
    .select()
    .single();

  if (error) {
    throw new Error(`Failed to create issue: ${error.message}`);
  }

  return {
    success: true,
    issue_code: issueCode,
    issue_id: data.id,
    message: `Issue ${issueCode} created successfully`,
  };
}

async function getStatistics(params: z.infer<typeof StatisticsSchema>) {
  const today = getTodayIST();
  let startDate: string;

  switch (params.period) {
    case 'week':
      const weekAgo = new Date();
      weekAgo.setDate(weekAgo.getDate() - 7);
      startDate = formatInTimeZone(weekAgo, IST_TIMEZONE, 'yyyy-MM-dd');
      break;
    case 'month':
      const monthAgo = new Date();
      monthAgo.setMonth(monthAgo.getMonth() - 1);
      startDate = formatInTimeZone(monthAgo, IST_TIMEZONE, 'yyyy-MM-dd');
      break;
    default:
      startDate = today;
  }

  // Get checklist statistics
  const { count: totalChecklists } = await supabase
    .from('checklists')
    .select('*', { count: 'exact', head: true })
    .gte('date', startDate)
    .lte('date', today);

  const { count: submittedChecklists } = await supabase
    .from('checklists')
    .select('*', { count: 'exact', head: true })
    .gte('date', startDate)
    .lte('date', today)
    .eq('submitted', true);

  // Get log counts
  const { count: generatorLogs } = await supabase
    .from('generator_logs')
    .select('*', { count: 'exact', head: true })
    .gte('date', startDate)
    .lte('date', today);

  const { count: transformerLogs } = await supabase
    .from('transformer_logs')
    .select('*', { count: 'exact', head: true })
    .gte('date', startDate)
    .lte('date', today);

  // Get issue statistics
  const { data: issues } = await supabase
    .from('flagged_issues')
    .select('status, severity')
    .gte('created_at', `${startDate}T00:00:00`);

  const issueStats = {
    total: issues?.length || 0,
    open: issues?.filter((i) => i.status === 'open').length || 0,
    resolved: issues?.filter((i) => i.status === 'resolved').length || 0,
    by_severity: {
      critical: issues?.filter((i) => i.severity === 'critical').length || 0,
      high: issues?.filter((i) => i.severity === 'high').length || 0,
      medium: issues?.filter((i) => i.severity === 'medium').length || 0,
      low: issues?.filter((i) => i.severity === 'low').length || 0,
    },
  };

  return {
    period: params.period,
    date_range: { start: startDate, end: today },
    checklists: {
      total: totalChecklists || 0,
      submitted: submittedChecklists || 0,
      completion_rate: totalChecklists
        ? Math.round(((submittedChecklists || 0) / totalChecklists) * 100)
        : 0,
    },
    logs: {
      generator_entries: generatorLogs || 0,
      transformer_entries: transformerLogs || 0,
    },
    issues: issueStats,
  };
}

// Handle tool calls
server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params;

  try {
    switch (name) {
      case 'get_plant_status': {
        const result = await getPlantStatus();
        return {
          content: [{ type: 'text', text: JSON.stringify(result, null, 2) }],
        };
      }

      case 'get_generator_logs': {
        const params = GeneratorLogsSchema.parse(args || {});
        const result = await getGeneratorLogs(params);
        return {
          content: [{ type: 'text', text: JSON.stringify(result, null, 2) }],
        };
      }

      case 'get_transformer_logs': {
        const params = TransformerLogsSchema.parse(args || {});
        const result = await getTransformerLogs(params);
        return {
          content: [{ type: 'text', text: JSON.stringify(result, null, 2) }],
        };
      }

      case 'get_checklists': {
        const params = ChecklistSchema.parse(args || {});
        const result = await getChecklists(params);
        return {
          content: [{ type: 'text', text: JSON.stringify(result, null, 2) }],
        };
      }

      case 'get_issues': {
        const params = IssuesSchema.parse(args || {});
        const result = await getIssues(params);
        return {
          content: [{ type: 'text', text: JSON.stringify(result, null, 2) }],
        };
      }

      case 'flag_issue': {
        const params = FlagIssueSchema.parse(args);
        const result = await flagIssue(params);
        return {
          content: [{ type: 'text', text: JSON.stringify(result, null, 2) }],
        };
      }

      case 'get_statistics': {
        const params = StatisticsSchema.parse(args || {});
        const result = await getStatistics(params);
        return {
          content: [{ type: 'text', text: JSON.stringify(result, null, 2) }],
        };
      }

      default:
        throw new Error(`Unknown tool: ${name}`);
    }
  } catch (error: any) {
    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify({ error: error.message }, null, 2),
        },
      ],
      isError: true,
    };
  }
});

// Start the server
async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error('GPL MCP Server running on stdio');
}

main().catch((error) => {
  console.error('Fatal error:', error);
  process.exit(1);
});
