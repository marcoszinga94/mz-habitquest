CREATE TABLE "reto_checkins" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"reto_id" uuid NOT NULL,
	"user_id" uuid NOT NULL,
	"day" date NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "reto_checkins" ADD CONSTRAINT "reto_checkins_reto_id_retos_id_fk" FOREIGN KEY ("reto_id") REFERENCES "public"."retos"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "reto_checkins" ADD CONSTRAINT "reto_checkins_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "reto_checkins_reto_idx" ON "reto_checkins" USING btree ("reto_id");--> statement-breakpoint
CREATE INDEX "reto_checkins_user_idx" ON "reto_checkins" USING btree ("user_id");--> statement-breakpoint
CREATE UNIQUE INDEX "reto_checkin_unique_idx" ON "reto_checkins" USING btree ("reto_id","user_id","day");