CREATE TABLE "event_checklist_items" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"checklist_id" uuid NOT NULL,
	"label" text NOT NULL,
	"item_type" text DEFAULT 'check' NOT NULL,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"is_required" integer DEFAULT 1 NOT NULL,
	"status" text DEFAULT 'pending' NOT NULL,
	"note" text DEFAULT '' NOT NULL,
	"metadata" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "event_checklists" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"event_id" uuid NOT NULL,
	"stage" text DEFAULT 'loading' NOT NULL,
	"status" text DEFAULT 'draft' NOT NULL,
	"checked_by_user_id" uuid,
	"checked_at" timestamp with time zone,
	"note" text DEFAULT '' NOT NULL,
	"metadata" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "event_equipment" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"event_id" uuid NOT NULL,
	"equipment_id" uuid NOT NULL,
	"booking_status" text DEFAULT 'requested' NOT NULL,
	"packing_status" text DEFAULT 'pending' NOT NULL,
	"loading_status" text DEFAULT 'pending' NOT NULL,
	"return_status" text DEFAULT 'pending' NOT NULL,
	"note" text DEFAULT '' NOT NULL,
	"checked_out_at" timestamp with time zone,
	"returned_at" timestamp with time zone,
	"metadata" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "events" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"event_number" text NOT NULL,
	"name" text NOT NULL,
	"client_name" text DEFAULT '' NOT NULL,
	"venue_name" text DEFAULT '' NOT NULL,
	"status" text DEFAULT 'draft' NOT NULL,
	"start_at" timestamp with time zone,
	"end_at" timestamp with time zone,
	"notes" text DEFAULT '' NOT NULL,
	"approved_by_user_id" uuid,
	"created_by_user_id" uuid,
	"metadata" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "event_checklist_items" ADD CONSTRAINT "event_checklist_items_checklist_id_event_checklists_id_fk" FOREIGN KEY ("checklist_id") REFERENCES "public"."event_checklists"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "event_checklists" ADD CONSTRAINT "event_checklists_event_id_events_id_fk" FOREIGN KEY ("event_id") REFERENCES "public"."events"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "event_checklists" ADD CONSTRAINT "event_checklists_checked_by_user_id_users_id_fk" FOREIGN KEY ("checked_by_user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "event_equipment" ADD CONSTRAINT "event_equipment_event_id_events_id_fk" FOREIGN KEY ("event_id") REFERENCES "public"."events"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "event_equipment" ADD CONSTRAINT "event_equipment_equipment_id_equipment_id_fk" FOREIGN KEY ("equipment_id") REFERENCES "public"."equipment"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "events" ADD CONSTRAINT "events_approved_by_user_id_users_id_fk" FOREIGN KEY ("approved_by_user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "events" ADD CONSTRAINT "events_created_by_user_id_users_id_fk" FOREIGN KEY ("created_by_user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "event_checklist_items_checklist_id_idx" ON "event_checklist_items" USING btree ("checklist_id");--> statement-breakpoint
CREATE INDEX "event_checklist_items_sort_order_idx" ON "event_checklist_items" USING btree ("sort_order");--> statement-breakpoint
CREATE INDEX "event_checklist_items_status_idx" ON "event_checklist_items" USING btree ("status");--> statement-breakpoint
CREATE INDEX "event_checklists_event_id_idx" ON "event_checklists" USING btree ("event_id");--> statement-breakpoint
CREATE INDEX "event_checklists_stage_idx" ON "event_checklists" USING btree ("stage");--> statement-breakpoint
CREATE INDEX "event_checklists_status_idx" ON "event_checklists" USING btree ("status");--> statement-breakpoint
CREATE INDEX "event_equipment_event_id_idx" ON "event_equipment" USING btree ("event_id");--> statement-breakpoint
CREATE INDEX "event_equipment_equipment_id_idx" ON "event_equipment" USING btree ("equipment_id");--> statement-breakpoint
CREATE INDEX "event_equipment_booking_status_idx" ON "event_equipment" USING btree ("booking_status");--> statement-breakpoint
CREATE UNIQUE INDEX "events_event_number_unique" ON "events" USING btree ("event_number");--> statement-breakpoint
CREATE INDEX "events_status_idx" ON "events" USING btree ("status");--> statement-breakpoint
CREATE INDEX "events_start_at_idx" ON "events" USING btree ("start_at");--> statement-breakpoint
CREATE INDEX "events_created_at_idx" ON "events" USING btree ("created_at");