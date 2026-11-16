CREATE TYPE "public"."order_status" AS ENUM('in_progress', 'ready', 'delivered');--> statement-breakpoint
ALTER TABLE "orders" ADD COLUMN "status" "order_status" DEFAULT 'in_progress' NOT NULL;--> statement-breakpoint
CREATE INDEX "customers_last_order_at_idx" ON "customers" USING btree ("last_order_at");--> statement-breakpoint
CREATE INDEX "expenses_spent_on_idx" ON "expenses" USING btree ("spent_on","created_at");--> statement-breakpoint
CREATE INDEX "order_items_order_id_idx" ON "order_items" USING btree ("order_id");--> statement-breakpoint
CREATE INDEX "orders_status_placed_idx" ON "orders" USING btree ("status","placed_at");--> statement-breakpoint
CREATE INDEX "orders_business_date_bill_idx" ON "orders" USING btree ("business_date","bill_no");--> statement-breakpoint
CREATE INDEX "orders_customer_phone_placed_idx" ON "orders" USING btree ("customer_phone","placed_at");--> statement-breakpoint
CREATE INDEX "orders_placed_at_idx" ON "orders" USING btree ("placed_at");--> statement-breakpoint
CREATE INDEX "payments_order_id_idx" ON "payments" USING btree ("order_id");