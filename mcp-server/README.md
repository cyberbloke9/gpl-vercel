# GPL MCP Server

Model Context Protocol (MCP) server for accessing Gayatri Power Plant monitoring data. Enables AI agents (like Claude) to query plant status, logs, and flag issues.

## Features

- **Real-time Plant Status**: Get current operational status of the 2.2 MW hydroelectric plant
- **Generator Logs**: Query hourly readings (temperatures, electrical parameters, cooling systems)
- **Transformer Logs**: Access PTR and LTAC feeder data
- **Checklist Access**: View daily inspection checklist status
- **Issue Management**: Query and create issue flags
- **Statistics**: Get performance metrics over time

## Quick Start

### 1. Install Dependencies

```bash
cd mcp-server
npm install
```

### 2. Build

```bash
npm run build
```

### 3. Configure Environment

```bash
cp .env.example .env
# Edit .env with your Supabase credentials
```

### 4. Test with MCP Inspector

```bash
npm run inspect
```

## Claude Desktop Integration

Add to your Claude Desktop config (`%APPDATA%\Claude\claude_desktop_config.json` on Windows):

```json
{
  "mcpServers": {
    "gpl-plant-data": {
      "command": "node",
      "args": ["C:/path/to/gpl-vercel/mcp-server/dist/index.js"],
      "env": {
        "GPL_SUPABASE_URL": "https://your-project.supabase.co",
        "GPL_SUPABASE_SERVICE_KEY": "your-service-role-key"
      }
    }
  }
}
```

## Available Tools

### `get_plant_status`
Get current operational status including active units, generation, and issues.

**Example Response:**
```json
{
  "plant": {
    "name": "Gayatri Power Private Limited",
    "capacity_mw": 2.2,
    "units": [
      { "id": 1, "capacity_mw": 1.5, "type": "Hydro" },
      { "id": 2, "capacity_mw": 0.7, "type": "Hydro" }
    ]
  },
  "current_readings": {
    "power_kw": 1850,
    "frequency_hz": 50.02,
    "power_factor": 0.95
  },
  "open_issues_count": 3
}
```

### `get_generator_logs`
Query hourly generator readings.

**Parameters:**
- `date` (optional): Date in YYYY-MM-DD format (default: today)
- `hour` (optional): Specific hour 0-23
- `fields` (optional): Array of specific fields to return

**Available Fields:**
- Winding temps: `winding_temp_r1`, `winding_temp_r2`, `winding_temp_y1`, `winding_temp_y2`, `winding_temp_b1`, `winding_temp_b2`
- Bearing temps: `bearing_g_de_brg_main_ch7`, `bearing_thrust_1_ch9`, etc.
- Electrical: `gen_current_r/y/b`, `gen_voltage_ry/yb/br`, `gen_kw`, `gen_kvar`, `gen_kva`, `gen_frequency`, `gen_power_factor`
- System: `intake_water_level`, `topu_oil_pressure`, `cooling_main_pressure`

### `get_transformer_logs`
Query hourly transformer readings.

**Parameters:**
- `date` (optional): Date in YYYY-MM-DD format
- `hour` (optional): Specific hour 0-23
- `transformer_number` (optional): Transformer ID (default: 1)

### `get_checklists`
Get daily inspection checklist data.

**Parameters:**
- `date` (optional): Date in YYYY-MM-DD format
- `include_module_data` (optional): Include full module data (default: false)

### `get_issues`
Query flagged issues.

**Parameters:**
- `status`: `open`, `in_progress`, `resolved`, `closed`, or `all`
- `severity`: `low`, `medium`, `high`, `critical`, or `all`
- `limit`: Number of results (1-100, default: 20)

### `flag_issue`
Create a new issue flag.

**Parameters (required):**
- `module`: Module name (e.g., "Module 1", "Generator")
- `section`: Section within module
- `item`: Specific item with issue
- `description`: Detailed description
- `severity`: `low`, `medium`, `high`, or `critical`

**Optional:**
- `unit`: Unit identifier

### `get_statistics`
Get performance statistics.

**Parameters:**
- `period`: `today`, `week`, or `month`

## Available Resources

| URI | Description |
|-----|-------------|
| `gpl://plant/status` | Current plant status |
| `gpl://logs/generator/today` | Today's generator logs |
| `gpl://logs/transformer/today` | Today's transformer logs |
| `gpl://issues/open` | All open issues |

## OAuth 2.1 Integration

For user-authenticated access, the server supports Supabase OAuth 2.1:

1. **Enable OAuth 2.1** in Supabase Dashboard → Authentication → OAuth Server
2. **Register an OAuth Client** for your AI agent
3. **Use Authorization Code Flow with PKCE**

The consent flow redirects to `https://your-app.vercel.app/oauth/consent`

## Security

- Uses Supabase Row Level Security (RLS)
- Service role key provides full access (for trusted server environments)
- OAuth tokens provide scoped user access
- All data stays within your Supabase project

## Development

```bash
# Run in development mode with hot reload
npm run dev

# Build for production
npm run build

# Start production server
npm start
```

## License

Private - Gayatri Power Private Limited
