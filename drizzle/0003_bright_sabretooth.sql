CREATE TABLE "warehouse_serial_item_movements" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"serial_item_id" uuid NOT NULL,
	"from_location_id" uuid,
	"to_location_id" uuid,
	"note" text,
	"changed_by_user_id" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "warehouse_serial_items" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"serial_number" text NOT NULL,
	"name" text NOT NULL,
	"category" text DEFAULT '' NOT NULL,
	"location_id" uuid,
	"status" text DEFAULT 'ready' NOT NULL,
	"notes" text DEFAULT '' NOT NULL,
	"metadata" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "warehouse_serial_item_movements" ADD CONSTRAINT "warehouse_serial_item_movements_serial_item_id_warehouse_serial_items_id_fk" FOREIGN KEY ("serial_item_id") REFERENCES "public"."warehouse_serial_items"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "warehouse_serial_item_movements" ADD CONSTRAINT "warehouse_serial_item_movements_from_location_id_warehouse_locations_id_fk" FOREIGN KEY ("from_location_id") REFERENCES "public"."warehouse_locations"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "warehouse_serial_item_movements" ADD CONSTRAINT "warehouse_serial_item_movements_to_location_id_warehouse_locations_id_fk" FOREIGN KEY ("to_location_id") REFERENCES "public"."warehouse_locations"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "warehouse_serial_item_movements" ADD CONSTRAINT "warehouse_serial_item_movements_changed_by_user_id_users_id_fk" FOREIGN KEY ("changed_by_user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "warehouse_serial_items" ADD CONSTRAINT "warehouse_serial_items_location_id_warehouse_locations_id_fk" FOREIGN KEY ("location_id") REFERENCES "public"."warehouse_locations"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "warehouse_serial_item_movements_serial_item_id_idx" ON "warehouse_serial_item_movements" USING btree ("serial_item_id");--> statement-breakpoint
CREATE INDEX "warehouse_serial_item_movements_created_at_idx" ON "warehouse_serial_item_movements" USING btree ("created_at");--> statement-breakpoint
CREATE UNIQUE INDEX "warehouse_serial_items_serial_number_unique" ON "warehouse_serial_items" USING btree ("serial_number");--> statement-breakpoint
CREATE INDEX "warehouse_serial_items_location_id_idx" ON "warehouse_serial_items" USING btree ("location_id");--> statement-breakpoint
CREATE INDEX "warehouse_serial_items_status_idx" ON "warehouse_serial_items" USING btree ("status");--> statement-breakpoint
CREATE INDEX "warehouse_serial_items_created_at_idx" ON "warehouse_serial_items" USING btree ("created_at");