CREATE TABLE "friend_requests" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"from_user_id" uuid NOT NULL,
	"to_user_id" uuid NOT NULL,
	"status" varchar(10) DEFAULT 'pending' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "friend_requests" ADD CONSTRAINT "friend_requests_from_user_id_users_id_fk" FOREIGN KEY ("from_user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "friend_requests" ADD CONSTRAINT "friend_requests_to_user_id_users_id_fk" FOREIGN KEY ("to_user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "friend_requests_from_idx" ON "friend_requests" USING btree ("from_user_id");--> statement-breakpoint
CREATE INDEX "friend_requests_to_idx" ON "friend_requests" USING btree ("to_user_id");--> statement-breakpoint
CREATE UNIQUE INDEX "friend_request_unique_idx" ON "friend_requests" USING btree ("from_user_id","to_user_id");--> statement-breakpoint
ALTER TABLE "habits" DROP COLUMN "difficulty";