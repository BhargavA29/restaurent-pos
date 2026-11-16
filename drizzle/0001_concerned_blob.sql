CREATE TABLE "customers" (
	"phone" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"order_count" integer DEFAULT 1 NOT NULL,
	"total_spent" integer DEFAULT 0 NOT NULL,
	"last_order_at" timestamp with time zone DEFAULT now() NOT NULL
);
