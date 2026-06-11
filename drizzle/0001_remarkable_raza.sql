CREATE TABLE "equipment" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"code" text NOT NULL,
	"name" text NOT NULL,
	"category_id" uuid NOT NULL,
	"location_id" uuid,
	"brand" text DEFAULT '' NOT NULL,
	"model" text DEFAULT '' NOT NULL,
	"serial_number" text,
	"status" text DEFAULT 'ready' NOT NULL,
	"condition_note" text DEFAULT '' NOT NULL,
	"specification_note" text DEFAULT '' NOT NULL,
	"notes" text DEFAULT '' NOT NULL,
	"last_inspection_at" timestamp with time zone,
	"next_inspection_at" timestamp with time zone,
	"last_status_change_at" timestamp with time zone,
	"metadata" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "equipment_categories" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"key" text NOT NULL,
	"name" text NOT NULL,
	"description" text,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "equipment_documents" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"equipment_id" uuid NOT NULL,
	"kind" text DEFAULT 'document' NOT NULL,
	"title" text NOT NULL,
	"file_name" text NOT NULL,
	"mime_type" text,
	"storage_key" text NOT NULL,
	"storage_url" text,
	"note" text,
	"created_by_user_id" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "equipment_location_logs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"equipment_id" uuid NOT NULL,
	"from_location_id" uuid,
	"to_location_id" uuid,
	"note" text,
	"changed_by_user_id" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "equipment_locations" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"code" text NOT NULL,
	"name" text NOT NULL,
	"description" text,
	"parent_location_id" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "equipment_status_logs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"equipment_id" uuid NOT NULL,
	"status" text NOT NULL,
	"note" text,
	"changed_by_user_id" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "equipment" ADD CONSTRAINT "equipment_category_id_equipment_categories_id_fk" FOREIGN KEY ("category_id") REFERENCES "public"."equipment_categories"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "equipment" ADD CONSTRAINT "equipment_location_id_equipment_locations_id_fk" FOREIGN KEY ("location_id") REFERENCES "public"."equipment_locations"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "equipment_documents" ADD CONSTRAINT "equipment_documents_equipment_id_equipment_id_fk" FOREIGN KEY ("equipment_id") REFERENCES "public"."equipment"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "equipment_documents" ADD CONSTRAINT "equipment_documents_created_by_user_id_users_id_fk" FOREIGN KEY ("created_by_user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "equipment_location_logs" ADD CONSTRAINT "equipment_location_logs_equipment_id_equipment_id_fk" FOREIGN KEY ("equipment_id") REFERENCES "public"."equipment"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "equipment_location_logs" ADD CONSTRAINT "equipment_location_logs_from_location_id_equipment_locations_id_fk" FOREIGN KEY ("from_location_id") REFERENCES "public"."equipment_locations"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "equipment_location_logs" ADD CONSTRAINT "equipment_location_logs_to_location_id_equipment_locations_id_fk" FOREIGN KEY ("to_location_id") REFERENCES "public"."equipment_locations"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "equipment_location_logs" ADD CONSTRAINT "equipment_location_logs_changed_by_user_id_users_id_fk" FOREIGN KEY ("changed_by_user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "equipment_locations" ADD CONSTRAINT "equipment_locations_parent_location_id_equipment_locations_id_fk" FOREIGN KEY ("parent_location_id") REFERENCES "public"."equipment_locations"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "equipment_status_logs" ADD CONSTRAINT "equipment_status_logs_equipment_id_equipment_id_fk" FOREIGN KEY ("equipment_id") REFERENCES "public"."equipment"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "equipment_status_logs" ADD CONSTRAINT "equipment_status_logs_changed_by_user_id_users_id_fk" FOREIGN KEY ("changed_by_user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "equipment_code_unique" ON "equipment" USING btree ("code");--> statement-breakpoint
CREATE UNIQUE INDEX "equipment_serial_number_unique" ON "equipment" USING btree ("serial_number");--> statement-breakpoint
CREATE INDEX "equipment_category_id_idx" ON "equipment" USING btree ("category_id");--> statement-breakpoint
CREATE INDEX "equipment_location_id_idx" ON "equipment" USING btree ("location_id");--> statement-breakpoint
CREATE INDEX "equipment_status_idx" ON "equipment" USING btree ("status");--> statement-breakpoint
CREATE INDEX "equipment_created_at_idx" ON "equipment" USING btree ("created_at");--> statement-breakpoint
CREATE UNIQUE INDEX "equipment_categories_key_unique" ON "equipment_categories" USING btree ("key");--> statement-breakpoint
CREATE INDEX "equipment_categories_sort_order_idx" ON "equipment_categories" USING btree ("sort_order");--> statement-breakpoint
CREATE INDEX "equipment_documents_equipment_id_idx" ON "equipment_documents" USING btree ("equipment_id");--> statement-breakpoint
CREATE INDEX "equipment_documents_created_at_idx" ON "equipment_documents" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "equipment_location_logs_equipment_id_idx" ON "equipment_location_logs" USING btree ("equipment_id");--> statement-breakpoint
CREATE INDEX "equipment_location_logs_created_at_idx" ON "equipment_location_logs" USING btree ("created_at");--> statement-breakpoint
CREATE UNIQUE INDEX "equipment_locations_code_unique" ON "equipment_locations" USING btree ("code");--> statement-breakpoint
CREATE INDEX "equipment_locations_parent_location_id_idx" ON "equipment_locations" USING btree ("parent_location_id");--> statement-breakpoint
CREATE INDEX "equipment_status_logs_equipment_id_idx" ON "equipment_status_logs" USING btree ("equipment_id");--> statement-breakpoint
CREATE INDEX "equipment_status_logs_created_at_idx" ON "equipment_status_logs" USING btree ("created_at");