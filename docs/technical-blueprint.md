# Initial Technical Blueprint

## Product Positioning

Gudang is an internal operational system for a rental business handling sound system, video broadcast, lighting, and event equipment.

The system should treat warehouse inventory as supporting context. The primary object is equipment health: readiness, inspection state, maintenance history, measurement comparison, and service cost.

Core questions for every serialized equipment item:

- Is this equipment ready for the next event?
- When was it last inspected?
- What problems has it had before?
- What parts were replaced?
- How much has been spent on servicing it?
- Is it still worth keeping?
- Is measured performance still close to baseline?

## Recommended Stack

- App framework: Next.js App Router
- Language: TypeScript
- Database: PostgreSQL
- ORM and migrations: Drizzle ORM
- Validation: Zod
- Forms: React Hook Form
- Tables: TanStack Table
- Charts: Recharts for MVP, ECharts later if measurement graph interaction becomes heavier
- UI: Tailwind CSS plus shadcn/ui
- Auth: session-based auth with role-based permissions
- File storage: Cloudflare R2 or MinIO, never Vercel local filesystem
- Deployment: Vercel for app, PostgreSQL on own server through Cloudflare Tunnel

## Architecture

```text
Browser
  |
  v
Next.js on Vercel
  |-- Server Actions / Route Handlers
  |-- RBAC checks
  |-- Zod validation
  |
  +--> PostgreSQL on private server via Cloudflare Tunnel
  |
  +--> Object storage: R2 or MinIO
  |
  +--> Audit logging for sensitive operations
```

Use Next.js as the main application boundary. Keep business logic in server-side service modules, not directly inside React components. UI components should stay focused on display and interaction.

## Folder Structure

```text
src/
  app/
    (auth)/
    (dashboard)/
      dashboard/
      equipment/
      warehouse/
      events/
      inspections/
      maintenance/
      spare-parts/
      measurements/
      settings/
    api/
      files/
      measurements/
  components/
    layout/
    ui/
    equipment/
    warehouse/
    events/
    inspections/
    maintenance/
    measurements/
  db/
    schema/
      auth.ts
      equipment.ts
      warehouse.ts
      events.ts
      inspections.ts
      maintenance.ts
      spare-parts.ts
      measurements.ts
      files.ts
      audit.ts
    index.ts
  features/
    equipment/
      actions.ts
      queries.ts
      validators.ts
      permissions.ts
    warehouse/
    events/
    inspections/
    maintenance/
    spare-parts/
    measurements/
      parser.ts
      scoring.ts
      actions.ts
      queries.ts
      validators.ts
  lib/
    auth/
    files/
    rbac.ts
    dates.ts
    ids.ts
  server/
    services/
    storage/
  styles/
```

Keep feature logic close to the feature. Shared infrastructure belongs in `lib`, `server`, and `db`.

## Core Domain Model

### Users And Permissions

- `users`
- `roles`
- `permissions`
- `user_roles`
- `audit_logs`

Initial roles:

- Admin: full access
- Manager: event, equipment, reporting, approval
- Engineer: inspection, maintenance, measurement
- Warehouse: movement, loading, return, stock opname
- Viewer: read-only operational visibility

### Equipment

Serialized equipment is the center of the system.

Main entities:

- `equipment`
- `equipment_categories`
- `equipment_documents`
- `equipment_status_logs`
- `equipment_location_logs`

Important equipment fields:

- `code`
- `name`
- `category_id`
- `brand`
- `model`
- `serial_number`
- `status`
- `condition_score`
- `current_location_id`
- `qr_code`
- `photo_file_id`
- `purchase_date`
- `purchase_cost`
- `retirement_status`
- `created_at`
- `updated_at`

Suggested statuses:

- `ready`
- `needs_inspection`
- `booked`
- `out_on_event`
- `returned_pending_check`
- `under_maintenance`
- `retired`
- `lost`

### Warehouse

Warehouse is supporting context, not the core product identity.

Main entities:

- `equipment_locations`
- `stock_items`
- `stock_movements`
- `stock_opnames`
- `stock_opname_lines`

Location hierarchy should support:

- Warehouse
- Area
- Rack
- Shelf
- Bin

Non-serialized stock examples:

- Cables
- Clamps
- Adapters
- Batteries
- Consumables

### Events / Jobs

Main entities:

- `events`
- `event_equipment`
- `event_checklists`
- `event_checklist_items`

Event equipment flow:

1. Book requested equipment.
2. Check availability and readiness.
3. Generate packing list.
4. Scan QR during loading.
5. Scan QR during return.
6. If returned damaged, create inspection or maintenance ticket automatically.

### Inspection

Main entities:

- `inspection_templates`
- `inspection_template_items`
- `inspections`
- `inspection_results`

Templates should be category-based. A speaker, mixer, wireless unit, lighting fixture, and video device should not share one generic checklist.

Operational split:

- Inspection is the fast field checklist used before or after equipment leaves the warehouse.
- Measurement is the deeper workshop/gudang verification path, especially for Smaart or similar technical analysis.
- Keep inspection lightweight and decision-oriented.
- Keep measurement file-heavy and analysis-oriented.

Suggested inspection scope:

- cabinet or body condition
- visible damage
- basic function test
- connectors and cables
- readiness decision
- optional notes for follow-up measurement

Inspection result should update equipment readiness only when all required checks pass or an authorized user explicitly overrides with notes.

### Maintenance / Service

Main entities:

- `maintenance_tickets`
- `maintenance_actions`
- `maintenance_photos`
- `spare_part_usage`

Ticket statuses:

- `open`
- `diagnosing`
- `waiting_part`
- `repaired`
- `tested`
- `closed`

Maintenance should feed the equipment health score and total service cost.

### Spare Parts

Main entities:

- `spare_parts`
- `spare_part_movements`
- `spare_part_usage`
- `vendors`

Spare part usage should always connect back to a maintenance ticket and, when applicable, a specific equipment item.

### Measurement / Smaart ASCII

Main entities:

- `equipment_measurements`
- `measurement_files`
- `measurement_baselines`

MVP behavior:

- Upload raw ASCII file.
- Store raw file in object storage.
- Parse frequency, magnitude, phase, and coherence.
- Save parsed JSON.
- Render magnitude response and coherence charts.
- Compare current result against baseline.
- Store engineer notes.
- Calculate summary values.

Measurement should live alongside inspection, not inside it:

- An inspection can point the user toward a later measurement.
- A measurement can be recorded after inspection reveals a technical symptom.
- One equipment item can have many inspections and many measurements over time.

Do not implement venue calibration, room maps, auto-tuning, or advanced acoustic diagnosis in MVP.

## Database Schema Outline

This is intentionally schema-level, not final Drizzle code.

```text
equipment
  id uuid pk
  code text unique not null
  name text not null
  category_id uuid fk equipment_categories.id
  brand text
  model text
  serial_number text
  status equipment_status not null
  condition_score int
  current_location_id uuid fk equipment_locations.id
  photo_file_id uuid fk files.id
  purchase_date date
  purchase_cost numeric
  retirement_status text
  created_at timestamp
  updated_at timestamp

equipment_locations
  id uuid pk
  parent_id uuid fk equipment_locations.id
  type location_type not null
  name text not null
  code text unique
  is_active boolean

inspections
  id uuid pk
  equipment_id uuid fk equipment.id
  template_id uuid fk inspection_templates.id
  event_id uuid nullable fk events.id
  status inspection_status
  inspected_by uuid fk users.id
  inspected_at timestamp
  result inspection_result_status
  notes text

maintenance_tickets
  id uuid pk
  ticket_code text unique not null
  equipment_id uuid fk equipment.id
  event_id uuid nullable fk events.id
  complaint text not null
  severity severity_level
  category maintenance_category
  diagnosis text
  action_taken text
  service_cost numeric
  technician_id uuid fk users.id
  status maintenance_status
  opened_at timestamp
  closed_at timestamp

equipment_measurements
  id uuid pk
  equipment_id uuid fk equipment.id
  measurement_date timestamp not null
  method text
  distance_meter numeric
  axis text
  raw_file_id uuid fk files.id
  parsed_json jsonb
  avg_coherence numeric
  valid_frequency_min numeric
  valid_frequency_max numeric
  peak_response_db numeric
  deepest_dip_db numeric
  hf_trend_db numeric
  health_score int
  result_status measurement_result_status
  engineer_note text
  created_by uuid fk users.id
  created_at timestamp
```

## Measurement Parser Rules

The parser should accept a simple ASCII table containing:

- Frequency in Hz
- Magnitude in dB
- Phase in degrees
- Coherence

MVP parser behavior:

- Ignore blank lines.
- Ignore comment/header rows that do not start with a number.
- Accept comma, tab, or whitespace separated columns.
- Require at least frequency and magnitude.
- Treat phase and coherence as optional only if the export does not include them.
- Reject files with too few valid data rows.

Summary calculation:

- Average coherence: mean of valid coherence values.
- Valid frequency range: min and max frequency where coherence is above threshold.
- Peak response: maximum magnitude.
- Deepest dip: minimum magnitude.
- HF trend: average high-frequency magnitude minus mid-band magnitude.
- Result:
  - Pass: good coherence and response close to baseline.
  - Warning: moderate deviation or partial coherence issue.
  - Fail: major deviation, severe dip, or poor coherence.

Thresholds should be configurable later. Use conservative defaults for MVP.

## MVP Breakdown

### MVP 1: Operational Core

Goal: know what equipment exists, where it is, and whether it is ready.

Includes:

- Auth and RBAC foundation
- Equipment categories
- Equipment CRUD
- Equipment detail tabs
- Location hierarchy
- Equipment movement log
- Basic dashboard counts
- Documents and photos through object storage

Excludes:

- Event workflow automation
- Advanced reports
- Measurement comparison

### MVP 2: Inspection And Maintenance

Goal: make readiness depend on real checks and service history.

Includes:

- Category-based inspection templates
- Inspection execution
- Maintenance tickets
- Maintenance actions
- Spare parts usage
- Status transitions from inspection and maintenance
- Recent service and inspection due dashboard widgets

### MVP 3: Events And QR Workflow

Goal: control equipment before it leaves and when it returns.

Includes:

- Event/job creation
- Equipment booking
- Availability and readiness checks
- Packing list
- Loading checklist with QR scan
- Return checklist with QR scan
- Auto-create inspection or maintenance ticket for damaged return

### MVP 4: Smaart Measurement

Goal: compare speaker measurements against baseline.

Includes:

- ASCII upload
- Raw file storage
- Parser
- Parsed JSON storage
- Magnitude chart
- Coherence chart
- Baseline vs current comparison
- Simple pass/warning/fail result
- Engineer notes

## Initial Screens

Dashboard:

- Ready equipment
- Need inspection
- Under maintenance
- Critical equipment
- Recently serviced equipment
- Upcoming inspection due
- Top problematic equipment
- Maintenance cost this month/year

Equipment list:

- Code
- Name
- Category
- Status
- Current location
- Health score
- Last inspection
- Last service

Equipment detail tabs:

- Overview
- Inspection
- Maintenance
- Measurement
- Documents
- Event History

Maintenance ticket detail:

- Complaint
- Severity
- Diagnosis
- Action taken
- Parts used
- Cost
- Technician
- Before/after photos
- Final test result

Measurement tab:

- Last measurement date
- Result status
- Health score
- Magnitude response chart
- Coherence chart
- Baseline vs current comparison
- Raw file download
- Engineer notes

## Implementation Order

1. Scaffold Next.js, TypeScript, Tailwind, shadcn/ui, Drizzle, PostgreSQL config.
2. Add database schema and migrations for auth, equipment, locations, files, and audit logs.
3. Build auth and RBAC middleware.
4. Build dashboard shell and navigation.
5. Build equipment category and equipment CRUD.
6. Build location hierarchy and equipment movement.
7. Add object storage abstraction and file upload.
8. Build inspection templates and inspection execution.
9. Build maintenance tickets and spare part usage.
10. Build event booking, loading, and return workflow.
11. Build Smaart ASCII parser and measurement charts.
12. Add reporting, exports, and operational refinements.

## Engineering Notes

- Keep status transitions explicit and auditable.
- Avoid hiding important equipment state inside free-text notes.
- Do not let warehouse stock logic dominate serialized equipment workflows.
- Prefer boring relational data for core operations and JSON only for flexible measurement payloads.
- Store raw measurement files even after parsing so engineers can reprocess them later.
- Keep health score explainable. A user should be able to see why a unit is marked warning or fail.
- Treat QR scanning as an input method, not a separate business process.
