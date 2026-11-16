ALTER TABLE "owners" RENAME COLUMN "email" TO "username";--> statement-breakpoint
ALTER TABLE "owners" RENAME CONSTRAINT "owners_email_unique" TO "owners_username_unique";--> statement-breakpoint
UPDATE "owners" SET "username" = lower(split_part("username", '@', 1)) WHERE "username" LIKE '%@%';
