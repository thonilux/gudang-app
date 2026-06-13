CREATE TABLE "event_packing_list_items" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"packing_list_id" uuid NOT NULL,
	"event_equipment_id" uuid,
	"equipment_id" uuid NOT NULL,
	"equipment_code" text NOT NULL,
	"equipment_name" text NOT NULL,
	"equipment_category_name" text,
	"equipment_location_label" text,
	"equipment_brand" text DEFAULT '' NOT NULL,
	"equipment_model" text DEFAULT '' NOT NULL,
	"equipment_serial_number" text,
	"note" text DEFAULT '' NOT NULL,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"status" text DEFAULT 'pending' NOT NULL,
	"checked_at" timestamp with time zone,
	"metadata" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "event_packing_lists" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"event_id" uuid NOT NULL,
	"status" text DEFAULT 'generated' NOT NULL,
	"generated_by_user_id" uuid,
	"generated_at" timestamp with time zone,
	"note" text DEFAULT '' NOT NULL,
	"metadata" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "event_packing_list_items" ADD CONSTRAINT "event_packing_list_items_packing_list_id_event_packing_lists_id_fk" FOREIGN KEY ("packing_list_id") REFERENCES "public"."event_packing_lists"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "event_packing_list_items" ADD CONSTRAINT "event_packing_list_items_event_equipment_id_event_equipment_id_fk" FOREIGN KEY ("event_equipment_id") REFERENCES "public"."event_equipment"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "event_packing_list_items" ADD CONSTRAINT "event_packing_list_items_equipment_id_equipment_id_fk" FOREIGN KEY ("equipment_id") REFERENCES "public"."equipment"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "event_packing_lists" ADD CONSTRAINT "event_packing_lists_event_id_events_id_fk" FOREIGN KEY ("event_id") REFERENCES "public"."events"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "event_packing_lists" ADD CONSTRAINT "event_packing_lists_generated_by_user_id_users_id_fk" FOREIGN KEY ("generated_by_user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "event_packing_list_items_packing_list_id_idx" ON "event_packing_list_items" USING btree ("packing_list_id");--> statement-breakpoint
CREATE INDEX "event_packing_list_items_event_equipment_id_idx" ON "event_packing_list_items" USING btree ("event_equipment_id");--> statement-breakpoint
CREATE INDEX "event_packing_list_items_sort_order_idx" ON "event_packing_list_items" USING btree ("sort_order");--> statement-breakpoint
CREATE UNIQUE INDEX "event_packing_list_items_unique_per_list" ON "event_packing_list_items" USING btree ("packing_list_id","equipment_id");--> statement-breakpoint
CREATE UNIQUE INDEX "event_packing_lists_event_id_unique" ON "event_packing_lists" USING btree ("event_id");--> statement-breakpoint
CREATE INDEX "event_packing_lists_status_idx" ON "event_packing_lists" USING btree ("status");