# SC2 Telemetry Tester

This project simulates the Raspberry Pi CAN bus reader for testing the SC2 mobile app.

## Architecture

```
Real System:          Firmware → Raspberry Pi (CAN) → Supabase → Mobile App
This Tester:          CSV/Fake Data → Parser → Supabase → Mobile App
```

## Setup

1. **Install dependencies:**
   ```bash
   npm install
   ```

2. **Configure environment variables:**
   
   Create a `.env` file or set environment variables:
   ```bash
   export SUPABASE_URL="https://your-project.supabase.co"
   export SUPABASE_ANON_KEY="your-anon-key"
   ```

3. **Set up Supabase database:**
   
   Run the SQL schema in `sql/create_tables.sql` in your Supabase SQL Editor.

## Usage

### Stream Mode (Real-time simulation)
Uploads data row by row with 1-second intervals, simulating real-time telemetry:
```bash
npm start
# or
node src/upload_telemetry.js stream
```

### Batch Mode (Historical data)
Uploads all data at once:
```bash
npm run batch
# or
node src/upload_telemetry.js batch
```

### Generate Test Data
Creates new test data with all 140+ signals:
```bash
npm run generate
```

### Test Connection
Verify Supabase connection:
```bash
npm test
```

## File Structure

```
sc2-telemetry-tester/
├── data/
│   ├── data_format.json      # Official firmware data format (shared)
│   └── test_telemetry.csv    # Test data for simulation
├── src/
│   ├── upload_telemetry.js   # Main upload script
│   ├── generate_test_data.js # Generate realistic test data
│   └── test_connection.js    # Test Supabase connection
├── sql/
│   └── create_tables.sql     # Supabase schema
└── package.json
```

## Data Format

The `data_format.json` contains the official firmware data format with 140+ signals:
```json
{
  "signal_name": [num_bytes, "data_type", "units", nominal_min, nominal_max, "Category;Subsystem"]
}
```

Categories:
- **MCC** - Motor Controller Computer
- **High Voltage** - Shutdown, MPS
- **Battery** - BMS CAN, BMS, Supplemental
- **Main IO** - Sensors, Lights, Firmware
- **Solar Array** - MPPT, Sensors
- **Software** - Timestamp, GPS, Lap Counter
- **Race Strategy** - Model Outputs

## Mobile App Integration

The mobile app should ONLY read from Supabase. This tester handles:
1. Reading data from CSV or generating fake data
2. Parsing to match the official data format
3. Uploading to Supabase `telemetry_latest` table
4. The mobile app subscribes to real-time updates

## Sharing Data Format

The `data_format.json` should be identical across:
- This tester project
- The mobile app project
- The firmware project

Consider using a git submodule or npm package for the shared format.
