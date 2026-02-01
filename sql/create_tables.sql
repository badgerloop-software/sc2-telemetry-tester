-- SC2 Telemetry Database Schema
-- Run this in your Supabase SQL Editor

-- =====================================================
-- Table: telemetry_latest (single row for current state)
-- =====================================================
CREATE TABLE IF NOT EXISTS telemetry_latest (
  id TEXT PRIMARY KEY DEFAULT 'latest',
  timestamp BIGINT,
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- MCC (Motor Controller Computer)
  accelerator_pedal REAL,
  speed REAL,
  mcc_state SMALLINT,
  fr_telem BOOLEAN,
  crz_pwr_mode BOOLEAN,
  crz_spd_mode BOOLEAN,
  crz_pwr_setpt REAL,
  crz_spd_setpt REAL,
  eco BOOLEAN,
  main_telem BOOLEAN,
  foot_brake BOOLEAN,
  regen_brake REAL,
  motor_current REAL,
  motor_power REAL,
  mc_status SMALLINT,
  
  -- High Voltage - Shutdown
  driver_eStop BOOLEAN,
  external_eStop BOOLEAN,
  crash BOOLEAN,
  discharge_enable BOOLEAN,
  discharge_enabled BOOLEAN,
  charge_enable BOOLEAN,
  charge_enabled BOOLEAN,
  isolation BOOLEAN,
  mcu_hv_en BOOLEAN,
  mcu_stat_fdbk BOOLEAN,
  
  -- High Voltage - MPS
  mppt_contactor BOOLEAN,
  motor_controller_contactor BOOLEAN,
  low_contactor BOOLEAN,
  dcdc_current REAL,
  dcdc_deg BOOLEAN,
  use_dcdc BOOLEAN,
  use_supp BOOLEAN,
  bms_mpio1 BOOLEAN,
  
  -- Battery - Supplemental
  supplemental_current REAL,
  supplemental_voltage REAL,
  supplemental_deg BOOLEAN,
  est_supplemental_soc REAL,
  
  -- Main IO - Sensors
  park_brake BOOLEAN,
  air_temp REAL,
  brake_temp REAL,
  dcdc_temp REAL,
  mainIO_temp REAL,
  motor_controller_temp REAL,
  motor_temp REAL,
  road_temp REAL,
  main_5V_bus REAL,
  main_12V_bus REAL,
  main_24V_bus REAL,
  main_5V_current REAL,
  main_12V_current REAL,
  main_24V_current REAL,
  
  -- Main IO - Lights
  l_turn_led_en BOOLEAN,
  r_turn_led_en BOOLEAN,
  brake_led_en BOOLEAN,
  headlights_led_en BOOLEAN,
  hazards BOOLEAN,
  
  -- Main IO - Firmware (Heartbeats)
  bms_can_heartbeat BOOLEAN,
  hv_can_heartbeat BOOLEAN,
  mainIO_heartbeat BOOLEAN,
  mcc_can_heartbeat BOOLEAN,
  mppt_can_heartbeat BOOLEAN,
  
  -- Solar Array - MPPT
  mppt_mode BOOLEAN,
  mppt_current_out REAL,
  mppt_power_out REAL,
  string1_temp REAL,
  string2_temp REAL,
  string3_temp REAL,
  string1_V_in REAL,
  string2_V_in REAL,
  string3_V_in REAL,
  string1_I_in REAL,
  string2_I_in REAL,
  string3_I_in REAL,
  
  -- Battery - BMS CAN
  pack_temp REAL,
  pack_internal_temp REAL,
  pack_current REAL,
  pack_voltage REAL,
  pack_power REAL,
  populated_cells SMALLINT,
  soc REAL,
  soh REAL,
  pack_amphours REAL,
  adaptive_total_capacity REAL,
  fan_speed SMALLINT,
  pack_resistance REAL,
  bms_input_voltage REAL,
  
  -- Battery - BMS Faults/Failsafes
  bps_fault BOOLEAN,
  voltage_failsafe BOOLEAN,
  current_failsafe BOOLEAN,
  relay_failsafe BOOLEAN,
  cell_balancing_active BOOLEAN,
  charge_interlock_failsafe BOOLEAN,
  thermistor_b_value_table_invalid BOOLEAN,
  input_power_supply_failsafe BOOLEAN,
  discharge_limit_enforcement_fault BOOLEAN,
  charger_safety_relay_fault BOOLEAN,
  internal_hardware_fault BOOLEAN,
  internal_heatsink_fault BOOLEAN,
  internal_software_fault BOOLEAN,
  highest_cell_voltage_too_high_fault BOOLEAN,
  lowest_cell_voltage_too_low_fault BOOLEAN,
  pack_too_hot_fault BOOLEAN,
  high_voltage_interlock_signal_fault BOOLEAN,
  precharge_circuit_malfunction BOOLEAN,
  abnormal_state_of_charge_behavior BOOLEAN,
  internal_communication_fault BOOLEAN,
  cell_balancing_stuck_off_fault BOOLEAN,
  weak_cell_fault BOOLEAN,
  low_cell_voltage_fault BOOLEAN,
  open_wiring_fault BOOLEAN,
  current_sensor_fault BOOLEAN,
  highest_cell_voltage_over_5V_fault BOOLEAN,
  cell_asic_fault BOOLEAN,
  weak_pack_fault BOOLEAN,
  fan_monitor_fault BOOLEAN,
  thermistor_fault BOOLEAN,
  external_communication_fault BOOLEAN,
  redundant_power_supply_fault BOOLEAN,
  high_voltage_isolation_fault BOOLEAN,
  input_power_supply_fault BOOLEAN,
  charge_limit_enforcement_fault BOOLEAN,
  
  -- Battery - Cell Group Voltages (31 groups)
  cell_group1_voltage REAL,
  cell_group2_voltage REAL,
  cell_group3_voltage REAL,
  cell_group4_voltage REAL,
  cell_group5_voltage REAL,
  cell_group6_voltage REAL,
  cell_group7_voltage REAL,
  cell_group8_voltage REAL,
  cell_group9_voltage REAL,
  cell_group10_voltage REAL,
  cell_group11_voltage REAL,
  cell_group12_voltage REAL,
  cell_group13_voltage REAL,
  cell_group14_voltage REAL,
  cell_group15_voltage REAL,
  cell_group16_voltage REAL,
  cell_group17_voltage REAL,
  cell_group18_voltage REAL,
  cell_group19_voltage REAL,
  cell_group20_voltage REAL,
  cell_group21_voltage REAL,
  cell_group22_voltage REAL,
  cell_group23_voltage REAL,
  cell_group24_voltage REAL,
  cell_group25_voltage REAL,
  cell_group26_voltage REAL,
  cell_group27_voltage REAL,
  cell_group28_voltage REAL,
  cell_group29_voltage REAL,
  cell_group30_voltage REAL,
  cell_group31_voltage REAL,
  
  -- Software - Timestamp
  tstamp_ms SMALLINT,
  tstamp_sc SMALLINT,
  tstamp_mn SMALLINT,
  tstamp_hr SMALLINT,
  tstamp_unix BIGINT,
  
  -- Software - GPS
  lat REAL,
  lon REAL,
  elev REAL,
  
  -- Software - Lap Counter
  lap_count INTEGER,
  current_section INTEGER,
  lap_duration INTEGER,
  
  -- Race Strategy - Model Outputs
  optimized_target_power REAL,
  maximum_distance_traveled REAL
);

-- =====================================================
-- Table: telemetry (historical data - time series)
-- =====================================================
CREATE TABLE IF NOT EXISTS telemetry (
  id BIGSERIAL PRIMARY KEY,
  timestamp BIGINT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- Same columns as telemetry_latest (abbreviated for space)
  -- Copy all columns from above except 'id' and 'updated_at'
  speed REAL,
  soc REAL,
  pack_voltage REAL,
  pack_current REAL,
  pack_power REAL,
  motor_power REAL,
  lat REAL,
  lon REAL,
  elev REAL
  -- Add more columns as needed for historical analysis
);

-- Create index for time-based queries
CREATE INDEX IF NOT EXISTS idx_telemetry_timestamp ON telemetry(timestamp DESC);

-- =====================================================
-- Row Level Security (RLS)
-- =====================================================

-- Enable RLS
ALTER TABLE telemetry_latest ENABLE ROW LEVEL SECURITY;
ALTER TABLE telemetry ENABLE ROW LEVEL SECURITY;

-- Allow anonymous read access
CREATE POLICY "Allow anonymous read" ON telemetry_latest
  FOR SELECT USING (true);

CREATE POLICY "Allow anonymous read" ON telemetry
  FOR SELECT USING (true);

-- Allow anonymous insert/update (for the tester)
-- In production, you'd want to restrict this with a service role
CREATE POLICY "Allow anonymous insert" ON telemetry_latest
  FOR INSERT WITH CHECK (true);

CREATE POLICY "Allow anonymous update" ON telemetry_latest
  FOR UPDATE USING (true);

CREATE POLICY "Allow anonymous insert" ON telemetry
  FOR INSERT WITH CHECK (true);

-- =====================================================
-- Enable Realtime
-- =====================================================
ALTER PUBLICATION supabase_realtime ADD TABLE telemetry_latest;

-- =====================================================
-- Insert initial row
-- =====================================================
INSERT INTO telemetry_latest (id, timestamp, speed, soc, pack_voltage)
VALUES ('latest', 0, 0, 100, 105)
ON CONFLICT (id) DO NOTHING;
