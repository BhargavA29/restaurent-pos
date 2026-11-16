import { sql } from "drizzle-orm";
import {
  boolean,
  date,
  index,
  integer,
  jsonb,
  pgEnum,
  pgTable,
  primaryKey,
  text,
  timestamp,
  uuid,
} from "drizzle-orm/pg-core";

// All money is stored as whole rupees (integers).

export const orderType = pgEnum("order_type", ["takeaway", "pickup"]);
export const orderStatus = pgEnum("order_status", ["in_progress", "ready", "delivered"]);
export const paymentMode = pgEnum("payment_mode", ["cash", "upi", "card"]);
export const orderLineKind = pgEnum("order_line_kind", ["item", "combo"]);

export const owners = pgTable("owners", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: text("name").notNull(),
  username: text("username").notNull().unique(),
  passwordHash: text("password_hash").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const categories = pgTable("categories", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: text("name").notNull(),
  sort: integer("sort").notNull().default(0),
  active: boolean("active").notNull().default(true),
});

export const items = pgTable("items", {
  id: uuid("id").primaryKey().defaultRandom(),
  categoryId: uuid("category_id")
    .notNull()
    .references(() => categories.id, { onDelete: "restrict" }),
  name: text("name").notNull(),
  // Base price, used when the item has no variants.
  price: integer("price").notNull(),
  soldOut: boolean("sold_out").notNull().default(false),
  active: boolean("active").notNull().default(true),
  sort: integer("sort").notNull().default(0),
});

export const itemVariants = pgTable("item_variants", {
  id: uuid("id").primaryKey().defaultRandom(),
  itemId: uuid("item_id")
    .notNull()
    .references(() => items.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  price: integer("price").notNull(),
  sort: integer("sort").notNull().default(0),
});

export const addons = pgTable("addons", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: text("name").notNull(),
  price: integer("price").notNull(),
  active: boolean("active").notNull().default(true),
});

export const itemAddons = pgTable(
  "item_addons",
  {
    itemId: uuid("item_id")
      .notNull()
      .references(() => items.id, { onDelete: "cascade" }),
    addonId: uuid("addon_id")
      .notNull()
      .references(() => addons.id, { onDelete: "cascade" }),
  },
  (t) => [primaryKey({ columns: [t.itemId, t.addonId] })],
);

export const combos = pgTable("combos", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: text("name").notNull(),
  price: integer("price").notNull(),
  soldOut: boolean("sold_out").notNull().default(false),
  active: boolean("active").notNull().default(true),
  sort: integer("sort").notNull().default(0),
});

export const comboItems = pgTable(
  "combo_items",
  {
    comboId: uuid("combo_id")
      .notNull()
      .references(() => combos.id, { onDelete: "cascade" }),
    itemId: uuid("item_id")
      .notNull()
      .references(() => items.id, { onDelete: "restrict" }),
    qty: integer("qty").notNull().default(1),
  },
  (t) => [primaryKey({ columns: [t.comboId, t.itemId] })],
);

export const orders = pgTable(
  "orders",
  {
    // Generated on the device so a retried sync can never create a second bill.
    id: uuid("id").primaryKey(),
    // Sequential bill number assigned by the database.
    billNo: integer("bill_no").generatedAlwaysAsIdentity().notNull().unique(),
    type: orderType("type").notNull(),
    status: orderStatus("status").notNull().default("in_progress"),
    customerName: text("customer_name"),
    customerPhone: text("customer_phone"),
    subtotal: integer("subtotal").notNull(),
    discountTotal: integer("discount_total").notNull().default(0),
    total: integer("total").notNull(),
    // Business day the order belongs to (Asia/Kolkata), used by the dashboard.
    businessDate: date("business_date").notNull(),
    // When the order was taken on the device, which can be earlier than sync time.
    placedAt: timestamp("placed_at", { withTimezone: true }).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    createdBy: uuid("created_by").references(() => owners.id),
  },
  (t) => [
    index("orders_status_placed_idx").on(t.status, t.placedAt),
    index("orders_business_date_bill_idx").on(t.businessDate, t.billNo),
    index("orders_customer_phone_placed_idx").on(t.customerPhone, t.placedAt),
    index("orders_placed_at_idx").on(t.placedAt),
  ],
);

export type OrderAddonSnapshot = { name: string; price: number };

export const orderItems = pgTable(
  "order_items",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    orderId: uuid("order_id")
      .notNull()
      .references(() => orders.id, { onDelete: "cascade" }),
    kind: orderLineKind("kind").notNull().default("item"),
    // Names and prices are copied so later menu edits never change old bills.
    name: text("name").notNull(),
    variantName: text("variant_name"),
    unitPrice: integer("unit_price").notNull(),
    addons: jsonb("addons")
      .$type<OrderAddonSnapshot[]>()
      .notNull()
      .default(sql`'[]'::jsonb`),
    qty: integer("qty").notNull(),
    discount: integer("discount").notNull().default(0),
    complimentary: boolean("complimentary").notNull().default(false),
    lineTotal: integer("line_total").notNull(),
  },
  (t) => [index("order_items_order_id_idx").on(t.orderId)],
);

export const payments = pgTable(
  "payments",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    orderId: uuid("order_id")
      .notNull()
      .references(() => orders.id, { onDelete: "cascade" }),
    mode: paymentMode("mode").notNull(),
    amount: integer("amount").notNull(),
  },
  (t) => [index("payments_order_id_idx").on(t.orderId)],
);

export const expenses = pgTable(
  "expenses",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    spentOn: date("spent_on").notNull(),
    description: text("description").notNull(),
    amount: integer("amount").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    createdBy: uuid("created_by").references(() => owners.id),
  },
  (t) => [index("expenses_spent_on_idx").on(t.spentOn, t.createdAt)],
);

export const customers = pgTable(
  "customers",
  {
    phone: text("phone").primaryKey(),
    name: text("name").notNull(),
    orderCount: integer("order_count").notNull().default(1),
    totalSpent: integer("total_spent").notNull().default(0),
    lastOrderAt: timestamp("last_order_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index("customers_last_order_at_idx").on(t.lastOrderAt)],
);
