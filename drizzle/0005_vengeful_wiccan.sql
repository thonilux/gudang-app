CREATE TABLE "equipment_inspection_results" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"inspection_id" uuid NOT NULL,
	"checklist_index" integer NOT NULL,
	"label" text NOT NULL,
	"required" boolean DEFAULT false NOT NULL,
	"result" text NOT NULL,
	"note" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "equipment_inspection_templates" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"category_id" uuid NOT NULL,
	"name" text NOT NULL,
	"description" text,
	"checklist" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "equipment_inspections" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"equipment_id" uuid NOT NULL,
	"template_id" uuid,
	"template_name_snapshot" text DEFAULT '' NOT NULL,
	"result_status" text DEFAULT 'pass' NOT NULL,
	"note" text,
	"checklist_snapshot" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"summary" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"inspected_by_user_id" uuid,
	"inspected_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "equipment_inspection_results" ADD CONSTRAINT "equipment_inspection_results_inspection_id_equipment_inspections_id_fk" FOREIGN KEY ("inspection_id") REFERENCES "public"."equipment_inspections"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "equipment_inspection_templates" ADD CONSTRAINT "equipment_inspection_templates_category_id_equipment_categories_id_fk" FOREIGN KEY ("category_id") REFERENCES "public"."equipment_categories"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "equipment_inspections" ADD CONSTRAINT "equipment_inspections_equipment_id_equipment_id_fk" FOREIGN KEY ("equipment_id") REFERENCES "public"."equipment"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "equipment_inspections" ADD CONSTRAINT "equipment_inspections_template_id_equipment_inspection_templates_id_fk" FOREIGN KEY ("template_id") REFERENCES "public"."equipment_inspection_templates"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "equipment_inspections" ADD CONSTRAINT "equipment_inspections_inspected_by_user_id_users_id_fk" FOREIGN KEY ("inspected_by_user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "equipment_inspection_results_inspection_id_idx" ON "equipment_inspection_results" USING btree ("inspection_id");--> statement-breakpoint
CREATE INDEX "equipment_inspection_results_checklist_index_idx" ON "equipment_inspection_results" USING btree ("checklist_index");--> statement-breakpoint
CREATE INDEX "equipment_inspection_templates_category_id_idx" ON "equipment_inspection_templates" USING btree ("category_id");--> statement-breakpoint
CREATE INDEX "equipment_inspection_templates_is_active_idx" ON "equipment_inspection_templates" USING btree ("is_active");--> statement-breakpoint
CREATE INDEX "equipment_inspection_templates_sort_order_idx" ON "equipment_inspection_templates" USING btree ("sort_order");--> statement-breakpoint
CREATE INDEX "equipment_inspections_equipment_id_idx" ON "equipment_inspections" USING btree ("equipment_id");--> statement-breakpoint
CREATE INDEX "equipment_inspections_template_id_idx" ON "equipment_inspections" USING btree ("template_id");--> statement-breakpoint
CREATE INDEX "equipment_inspections_result_status_idx" ON "equipment_inspections" USING btree ("result_status");--> statement-breakpoint
CREATE INDEX "equipment_inspections_created_at_idx" ON "equipment_inspections" USING btree ("created_at");