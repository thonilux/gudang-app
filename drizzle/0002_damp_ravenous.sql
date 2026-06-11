CREATE TABLE "warehouse_locations" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"code" text NOT NULL,
	"name" text NOT NULL,
	"description" text,
	"parent_location_id" uuid,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "warehouse_stock_count_lines" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"count_id" uuid NOT NULL,
	"stock_item_id" uuid NOT NULL,
	"system_quantity" integer NOT NULL,
	"counted_quantity" integer NOT NULL,
	"difference" integer NOT NULL,
	"note" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "warehouse_stock_counts" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"location_id" uuid,
	"counted_by_user_id" uuid,
	"status" text DEFAULT 'completed' NOT NULL,
	"note" text,
	"counted_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "warehouse_stock_items" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"sku" text NOT NULL,
	"name" text NOT NULL,
	"unit" text DEFAULT 'pcs' NOT NULL,
	"category" text DEFAULT '' NOT NULL,
	"location_id" uuid,
	"current_quantity" integer DEFAULT 0 NOT NULL,
	"minimum_quantity" integer DEFAULT 0 NOT NULL,
	"status" text DEFAULT 'available' NOT NULL,
	"notes" text DEFAULT '' NOT NULL,
	"metadata" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "warehouse_stock_movements" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"stock_item_id" uuid NOT NULL,
	"movement_type" text NOT NULL,
	"quantity" integer NOT NULL,
	"from_location_id" uuid,
	"to_location_id" uuid,
	"note" text,
	"reference_type" text,
	"reference_id" text,
	"changed_by_user_id" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "warehouse_locations" ADD CONSTRAINT "warehouse_locations_parent_location_id_warehouse_locations_id_fk" FOREIGN KEY ("parent_location_id") REFERENCES "public"."warehouse_locations"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "warehouse_stock_count_lines" ADD CONSTRAINT "warehouse_stock_count_lines_count_id_warehouse_stock_counts_id_fk" FOREIGN KEY ("count_id") REFERENCES "public"."warehouse_stock_counts"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "warehouse_stock_count_lines" ADD CONSTRAINT "warehouse_stock_count_lines_stock_item_id_warehouse_stock_items_id_fk" FOREIGN KEY ("stock_item_id") REFERENCES "public"."warehouse_stock_items"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "warehouse_stock_counts" ADD CONSTRAINT "warehouse_stock_counts_location_id_warehouse_locations_id_fk" FOREIGN KEY ("location_id") REFERENCES "public"."warehouse_locations"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "warehouse_stock_counts" ADD CONSTRAINT "warehouse_stock_counts_counted_by_user_id_users_id_fk" FOREIGN KEY ("counted_by_user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "warehouse_stock_items" ADD CONSTRAINT "warehouse_stock_items_location_id_warehouse_locations_id_fk" FOREIGN KEY ("location_id") REFERENCES "public"."warehouse_locations"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "warehouse_stock_movements" ADD CONSTRAINT "warehouse_stock_movements_stock_item_id_warehouse_stock_items_id_fk" FOREIGN KEY ("stock_item_id") REFERENCES "public"."warehouse_stock_items"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "warehouse_stock_movements" ADD CONSTRAINT "warehouse_stock_movements_from_location_id_warehouse_locations_id_fk" FOREIGN KEY ("from_location_id") REFERENCES "public"."warehouse_locations"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "warehouse_stock_movements" ADD CONSTRAINT "warehouse_stock_movements_to_location_id_warehouse_locations_id_fk" FOREIGN KEY ("to_location_id") REFERENCES "public"."warehouse_locations"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "warehouse_stock_movements" ADD CONSTRAINT "warehouse_stock_movements_changed_by_user_id_users_id_fk" FOREIGN KEY ("changed_by_user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "warehouse_locations_code_unique" ON "warehouse_locations" USING btree ("code");--> statement-breakpoint
CREATE INDEX "warehouse_locations_parent_location_id_idx" ON "warehouse_locations" USING btree ("parent_location_id");--> statement-breakpoint
CREATE INDEX "warehouse_locations_sort_order_idx" ON "warehouse_locations" USING btree ("sort_order");--> statement-breakpoint
CREATE INDEX "warehouse_stock_count_lines_count_id_idx" ON "warehouse_stock_count_lines" USING btree ("count_id");--> statement-breakpoint
CREATE INDEX "warehouse_stock_count_lines_stock_item_id_idx" ON "warehouse_stock_count_lines" USING btree ("stock_item_id");--> statement-breakpoint
CREATE INDEX "warehouse_stock_counts_location_id_idx" ON "warehouse_stock_counts" USING btree ("location_id");--> statement-breakpoint
CREATE INDEX "warehouse_stock_counts_created_at_idx" ON "warehouse_stock_counts" USING btree ("created_at");--> statement-breakpoint
CREATE UNIQUE INDEX "warehouse_stock_items_sku_unique" ON "warehouse_stock_items" USING btree ("sku");--> statement-breakpoint
CREATE INDEX "warehouse_stock_items_location_id_idx" ON "warehouse_stock_items" USING btree ("location_id");--> statement-breakpoint
CREATE INDEX "warehouse_stock_items_status_idx" ON "warehouse_stock_items" USING btree ("status");--> statement-breakpoint
CREATE INDEX "warehouse_stock_items_created_at_idx" ON "warehouse_stock_items" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "warehouse_stock_movements_stock_item_id_idx" ON "warehouse_stock_movements" USING btree ("stock_item_id");--> statement-breakpoint
CREATE INDEX "warehouse_stock_movements_movement_type_idx" ON "warehouse_stock_movements" USING btree ("movement_type");--> statement-breakpoint
CREATE INDEX "warehouse_stock_movements_created_at_idx" ON "warehouse_stock_movements" USING btree ("created_at");