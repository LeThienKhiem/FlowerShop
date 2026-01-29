-- Add status column to orders table
-- Run this SQL in your Supabase SQL Editor

-- Check if orders table exists, if not create it
CREATE TABLE IF NOT EXISTS orders (
  id BIGSERIAL PRIMARY KEY,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  total_amount NUMERIC(10, 2) NOT NULL,
  email TEXT,
  first_name TEXT,
  last_name TEXT,
  customer_details JSONB,
  status TEXT DEFAULT 'Pending'
);

-- Add status column if it doesn't exist
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'orders' AND column_name = 'status'
  ) THEN
    ALTER TABLE orders ADD COLUMN status TEXT DEFAULT 'Pending';
    RAISE NOTICE 'Added status column to orders table';
  ELSE
    RAISE NOTICE 'status column already exists';
  END IF;
END $$;

-- Create an index on status for better query performance
CREATE INDEX IF NOT EXISTS idx_orders_status ON orders(status);

-- Create an index on created_at for sorting
CREATE INDEX IF NOT EXISTS idx_orders_created_at ON orders(created_at DESC);

-- Add a check constraint to ensure status is one of the valid values
ALTER TABLE orders DROP CONSTRAINT IF EXISTS orders_status_check;
ALTER TABLE orders ADD CONSTRAINT orders_status_check 
  CHECK (status IN ('Pending', 'Processing', 'Shipped', 'Delivered', 'Cancelled'));

-- Optional: Add a comment to the column
COMMENT ON COLUMN orders.status IS 'Order status: Pending, Processing, Shipped, Delivered, or Cancelled';

-- Update any existing orders without a status to 'Pending'
UPDATE orders SET status = 'Pending' WHERE status IS NULL;

-- Verify the setup
SELECT 
  column_name, 
  data_type, 
  column_default,
  is_nullable
FROM information_schema.columns 
WHERE table_name = 'orders' 
  AND column_name = 'status';
