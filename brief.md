You are a senior software engineer and system architect helping me design a web-based information system for a rental business that handles sound system, video broadcast, lighting, and event equipment.

Project context:

- The system is for internal operational use, not just accounting.
- The main priority is equipment condition, service history, inspection, maintenance cost, and readiness for events.
- Asset purchase value and depreciation are secondary.
- The system should be maintenance-centric and engineer-friendly.

Planned deployment:

- Frontend/app deployed on Vercel.
- SQL database hosted on my own server.
- Server access exposed securely via Cloudflare Tunnel / cloudflared.
- File storage should not rely on Vercel local storage.
- Prefer object storage such as Cloudflare R2 or MinIO.
- Tech stack candidate:
  - Next.js
  - TypeScript
  - PostgreSQL
  - Drizzle ORM
  - Tailwind CSS
  - shadcn/ui
  - React Hook Form
  - Zod
  - TanStack Table
  - Recharts or ECharts for charts
  - Auth with role-based permission

Main product direction:
Build a scalable web information system for:

1. Equipment management
2. Warehouse location tracking
3. Event/job equipment booking
4. Loading and return checklist
5. Inspection
6. Maintenance/service history
7. Spare part usage
8. Direct measurement for speaker health using Smaart ASCII export

Important design philosophy:
Do not make the system inventory-first.
Make it equipment-health-first.

The core question for each equipment item should be:

- Is this equipment ready for the next event?
- When was it last inspected?
- What problems has it had before?
- What parts were replaced?
- How much has been spent on servicing it?
- Is it still worth keeping?
- Is its measured performance still close to baseline?

Core modules:

1. Dashboard
   Focus on:

- Ready equipment
- Need inspection
- Under maintenance
- Critical equipment
- Recently serviced equipment
- Upcoming inspection due
- Top problematic equipment
- Maintenance cost this month/year

2. Equipment
   Each equipment item should have:

- Equipment code
- Name
- Category
- Brand
- Model
- Serial number
- Status
- Current warehouse location
- Condition/health score
- QR code
- Photo
- Documents/manuals
- Inspection history
- Maintenance history
- Measurement history
- Event usage history

3. Warehouse
   Use this only as supporting module, not the center of the system.
   Features:

- Location hierarchy
- Rack/bin/area
- Equipment movement
- Stock opname
- Non-serialized stock for cables, clamps, adapters, batteries, consumables

4. Events / Jobs
   Features:

- Event creation
- Equipment booking
- Availability check
- Packing list
- Loading checklist using QR scan
- Return checklist using QR scan
- Auto-create inspection or maintenance ticket if returned damaged

5. Inspection
   Preventive check before equipment is declared ready.
   Inspection checklist should be category-based.
   Examples:
   Speaker:

- Cabinet condition
- Grill condition
- Driver test
- Noise/distortion check
- Fan check
- Input/output check

Mixer:

- Input/output test
- Fader test
- Encoder test
- Display test
- Scene recall
- Network/AES50/USB test

Wireless:

- RF test
- Battery contact
- Antenna
- Capsule
- Frequency label

6. Maintenance / Service
   Maintenance ticket should include:

- Ticket code
- Equipment
- Complaint
- Severity
- Category: electrical, mechanical, audio quality, RF, network, calibration, cosmetic
- Diagnosis
- Action taken
- Spare parts used
- Service cost
- Technician
- Status: open, diagnosing, waiting part, repaired, tested, closed
- Before/after photos
- Final test result

7. Spare Parts
   Track:

- Part name
- Quantity
- Used for which equipment
- Cost
- Supplier/vendor
- Usage history

8. Direct Measurement / Smaart ASCII Viewer
   This is important but should stay simple.
   Do not build a complex venue calibration module.

Concept:

- Direct measurement in warehouse/workshop only.
- Fixed SOP:
  - Speaker placed in fixed position
  - Measurement mic at fixed distance, e.g. 1 meter
  - On-axis
  - Fixed level
  - Same test signal
  - Same room/workshop condition as much as possible

- Goal is not venue tuning.
- Goal is equipment health comparison against baseline.

Smaart ASCII export format example:
Columns:

- Frequency (Hz)
- Magnitude (dB)
- Phase (degrees)
- Coherence

Measurement feature requirements:

- Upload raw ASCII file
- Parse frequency, magnitude, phase, coherence
- Save raw file
- Save parsed JSON
- Render magnitude response graph
- Render coherence graph
- Phase graph should be advanced/optional
- Compare current measurement vs baseline
- Calculate simple summary:
  - Average coherence
  - Valid frequency range
  - Peak response
  - Deepest dip
  - HF trend
  - Result: Pass / Warning / Fail

- Store engineer notes

Do not overcomplicate:

- No multi-point venue measurement
- No complex room map
- No auto-tuning
- No advanced acoustic diagnosis in MVP
- No phase unwrap in MVP

Suggested database entities:

- users
- roles
- equipment
- equipment_categories
- equipment_locations
- equipment_status_logs
- stock_items
- stock_movements
- events
- event_equipment
- inspections
- inspection_templates
- inspection_results
- maintenance_tickets
- maintenance_actions
- spare_parts
- spare_part_usage
- equipment_measurements
- measurement_files
- documents
- audit_logs

Measurement table idea:
equipment_measurements:

- id
- equipment_id
- measurement_date
- method
- distance_meter
- axis
- raw_file_url
- parsed_json
- avg_coherence
- health_score
- result_status
- engineer_note
- created_by
- created_at

Parsed JSON example:
{
"frequency": [82.03, 83.49, 84.96],
"magnitude": [-2.78, -3.08, -2.59],
"phase": [175.76, 149.35, 119.20],
"coherence": [0.67, 0.76, 0.79]
}

UI direction:
Use a clean admin dashboard style.
Use tabs in equipment detail:

- Overview
- Inspection
- Maintenance
- Measurement
- Documents
- Event History

Measurement tab should show:

- Last measurement date
- Result status
- Health score
- Magnitude response chart
- Coherence chart
- Baseline vs current comparison
- Raw file download
- Engineer notes

Please help me draft the initial architecture, folder structure, database schema, and implementation plan for this system. Do not write full production code yet. Start with a clear technical blueprint and MVP breakdown.
