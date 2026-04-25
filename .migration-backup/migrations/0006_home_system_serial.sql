-- Migration: Add serial_number column to home_systems table
ALTER TABLE "home_systems" ADD COLUMN IF NOT EXISTS "serial_number" text;
