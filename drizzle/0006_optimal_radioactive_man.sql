CREATE TABLE "maintenance_actions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"ticket_id" uuid NOT NULL,
	"action_type" text DEFAULT 'note' NOT NULL,
	"description" text NOT NULL,
	"cost" integer DEFAULT 0 NOT NULL,
	"performed_by_user_id" uuid,
	"performed_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "maintenance_attachments" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"ticket_id" uuid NOT NULL,
	"kind" text DEFAULT 'photo' NOT NULL,
	"stage" text DEFAULT 'before' NOT NULL,
	"title" text NOT NULL,
	"file_name" text NOT NULL,
	"storage_url" text,
	"note" text,
	"created_by_user_id" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "maintenance_part_catalog" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"code" text NOT NULL,
	"name" text NOT NULL,
	"unit" text DEFAULT 'pcs' NOT NULL,
	"notes" text DEFAULT '' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "maintenance_part_usages" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"ticket_id" uuid NOT NULL,
	"part_id" uuid,
	"part_name_snapshot" text NOT NULL,
	"quantity" integer DEFAULT 1 NOT NULL,
	"unit_cost" integer DEFAULT 0 NOT NULL,
	"note" text,
	"created_by_user_id" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "maintenance_tickets" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"ticket_number" text NOT NULL,
	"equipment_id" uuid NOT NULL,
	"vendor_id" uuid,
	"subject" text NOT NULL,
	"complaint" text NOT NULL,
	"diagnosis" text DEFAULT '' NOT NULL,
	"action_plan" text DEFAULT '' NOT NULL,
	"status" text DEFAULT 'open' NOT NULL,
	"priority" text DEFAULT 'normal' NOT NULL,
	"opened_by_user_id" uuid,
	"assigned_to_user_id" uuid,
	"opened_at" timestamp with time zone DEFAULT now() NOT NULL,
	"due_at" timestamp with time zone,
	"closed_at" timestamp with time zone,
	"estimated_cost" integer DEFAULT 0 NOT NULL,
	"actual_cost" integer DEFAULT 0 NOT NULL,
	"metadata" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "maintenance_vendors" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"code" text NOT NULL,
	"name" text NOT NULL,
	"contact_name" text,
	"phone" text,
	"email" text,
	"notes" text DEFAULT '' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "maintenance_actions" ADD CONSTRAINT "maintenance_actions_ticket_id_maintenance_tickets_id_fk" FOREIGN KEY ("ticket_id") REFERENCES "public"."maintenance_tickets"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "maintenance_actions" ADD CONSTRAINT "maintenance_actions_performed_by_user_id_users_id_fk" FOREIGN KEY ("performed_by_user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "maintenance_attachments" ADD CONSTRAINT "maintenance_attachments_ticket_id_maintenance_tickets_id_fk" FOREIGN KEY ("ticket_id") REFERENCES "public"."maintenance_tickets"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "maintenance_attachments" ADD CONSTRAINT "maintenance_attachments_created_by_user_id_users_id_fk" FOREIGN KEY ("created_by_user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "maintenance_part_usages" ADD CONSTRAINT "maintenance_part_usages_ticket_id_maintenance_tickets_id_fk" FOREIGN KEY ("ticket_id") REFERENCES "public"."maintenance_tickets"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "maintenance_part_usages" ADD CONSTRAINT "maintenance_part_usages_part_id_maintenance_part_catalog_id_fk" FOREIGN KEY ("part_id") REFERENCES "public"."maintenance_part_catalog"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "maintenance_part_usages" ADD CONSTRAINT "maintenance_part_usages_created_by_user_id_users_id_fk" FOREIGN KEY ("created_by_user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "maintenance_tickets" ADD CONSTRAINT "maintenance_tickets_equipment_id_equipment_id_fk" FOREIGN KEY ("equipment_id") REFERENCES "public"."equipment"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "maintenance_tickets" ADD CONSTRAINT "maintenance_tickets_vendor_id_maintenance_vendors_id_fk" FOREIGN KEY ("vendor_id") REFERENCES "public"."maintenance_vendors"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "maintenance_tickets" ADD CONSTRAINT "maintenance_tickets_opened_by_user_id_users_id_fk" FOREIGN KEY ("opened_by_user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "maintenance_tickets" ADD CONSTRAINT "maintenance_tickets_assigned_to_user_id_users_id_fk" FOREIGN KEY ("assigned_to_user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "maintenance_actions_ticket_id_idx" ON "maintenance_actions" USING btree ("ticket_id");--> statement-breakpoint
CREATE INDEX "maintenance_actions_performed_at_idx" ON "maintenance_actions" USING btree ("performed_at");--> statement-breakpoint
CREATE INDEX "maintenance_attachments_ticket_id_idx" ON "maintenance_attachments" USING btree ("ticket_id");--> statement-breakpoint
CREATE INDEX "maintenance_attachments_created_at_idx" ON "maintenance_attachments" USING btree ("created_at");--> statement-breakpoint
CREATE UNIQUE INDEX "maintenance_part_catalog_code_unique" ON "maintenance_part_catalog" USING btree ("code");--> statement-breakpoint
CREATE INDEX "maintenance_part_catalog_name_idx" ON "maintenance_part_catalog" USING btree ("name");--> statement-breakpoint
CREATE INDEX "maintenance_part_usages_ticket_id_idx" ON "maintenance_part_usages" USING btree ("ticket_id");--> statement-breakpoint
CREATE INDEX "maintenance_part_usages_created_at_idx" ON "maintenance_part_usages" USING btree ("created_at");--> statement-breakpoint
CREATE UNIQUE INDEX "maintenance_tickets_ticket_number_unique" ON "maintenance_tickets" USING btree ("ticket_number");--> statement-breakpoint
CREATE INDEX "maintenance_tickets_equipment_id_idx" ON "maintenance_tickets" USING btree ("equipment_id");--> statement-breakpoint
CREATE INDEX "maintenance_tickets_status_idx" ON "maintenance_tickets" USING btree ("status");--> statement-breakpoint
CREATE INDEX "maintenance_tickets_opened_at_idx" ON "maintenance_tickets" USING btree ("opened_at");--> statement-breakpoint
CREATE UNIQUE INDEX "maintenance_vendors_code_unique" ON "maintenance_vendors" USING btree ("code");--> statement-breakpoint
CREATE INDEX "maintenance_vendors_name_idx" ON "maintenance_vendors" USING btree ("name");