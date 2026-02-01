/**
 * CSV to Supabase Upload Script
 * 
 * This script simulates what the Raspberry Pi would do:
 * 1. Read telemetry data from CSV (or CAN bus in production)
 * 2. Parse it into key-value pairs
 * 3. Upload to Supabase for the mobile app to consume
 * 
 * Usage:
 *   1. Set up environment variables (SUPABASE_URL, SUPABASE_ANON_KEY)
 *   2. Run: node src/upload_telemetry.js [stream|batch]
 */

const fs = require('fs');
const path = require('path');

// Supabase configuration - SET THESE VALUES
const SUPABASE_URL = process.env.SUPABASE_URL || 'YOUR_SUPABASE_URL';
const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY || 'YOUR_SUPABASE_ANON_KEY';

// CSV file path
const CSV_FILE = path.join(__dirname, '../data/test_telemetry.csv');

// Parse CSV file
function parseCSV(filePath) {
  const content = fs.readFileSync(filePath, 'utf-8');
  const lines = content.trim().split('\n');
  const headers = lines[0].split(',');
  
  const data = [];
  for (let i = 1; i < lines.length; i++) {
    const values = lines[i].split(',');
    const row = {};
    headers.forEach((header, index) => {
      const value = values[index];
      // Try to parse as number, otherwise keep as string
      const parsed = parseFloat(value);
      row[header.trim()] = isNaN(parsed) ? value : parsed;
    });
    data.push(row);
  }
  
  return data;
}

// Upload single telemetry record to Supabase
async function uploadToSupabase(telemetryRecord) {
  const response = await fetch(`${SUPABASE_URL}/rest/v1/telemetry`, {
    method: 'POST',
    headers: {
      'apikey': SUPABASE_ANON_KEY,
      'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
      'Content-Type': 'application/json',
      'Prefer': 'return=minimal'
    },
    body: JSON.stringify(telemetryRecord)
  });
  
  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Upload failed: ${response.status} - ${error}`);
  }
  
  return true;
}

// Upload latest telemetry (upsert - update if exists)
async function upsertLatestTelemetry(telemetryRecord) {
  // Add a fixed ID for "latest" record so we can upsert
  const record = {
    id: 'latest',
    ...telemetryRecord,
    updated_at: new Date().toISOString()
  };
  
  const response = await fetch(`${SUPABASE_URL}/rest/v1/telemetry_latest`, {
    method: 'POST',
    headers: {
      'apikey': SUPABASE_ANON_KEY,
      'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
      'Content-Type': 'application/json',
      'Prefer': 'resolution=merge-duplicates,return=minimal'
    },
    body: JSON.stringify(record)
  });
  
  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Upsert failed: ${response.status} - ${error}`);
  }
  
  return true;
}

// Simulate real-time data streaming
async function simulateRealTimeStream(data, intervalMs = 1000) {
  console.log(`\n🚗 SC2 Telemetry Tester - Stream Mode`);
  console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
  console.log(`📊 Records: ${data.length}`);
  console.log(`⏱️  Interval: ${intervalMs}ms`);
  console.log(`🌐 Supabase: ${SUPABASE_URL.substring(0, 30)}...`);
  console.log(`\nStarting stream... Press Ctrl+C to stop.\n`);
  
  let index = 0;
  
  const interval = setInterval(async () => {
    if (index >= data.length) {
      console.log('🔄 All records uploaded. Looping...\n');
      index = 0;
    }
    
    const record = data[index];
    try {
      // Update the timestamp to current time for realistic simulation
      record.timestamp = Date.now();
      
      await upsertLatestTelemetry(record);
      console.log(`[${new Date().toISOString()}] ✅ Record ${index + 1}/${data.length} | Speed: ${record.speed?.toFixed(1) || 0} mph | SOC: ${record.soc?.toFixed(1) || 0}%`);
      index++;
    } catch (error) {
      console.error(`[${new Date().toISOString()}] ❌ Error: ${error.message}`);
    }
  }, intervalMs);
  
  // Handle graceful shutdown
  process.on('SIGINT', () => {
    clearInterval(interval);
    console.log('\n\n👋 Stopped data stream.');
    process.exit(0);
  });
}

// Batch upload all records (for historical data)
async function batchUpload(data) {
  console.log(`\n🚗 SC2 Telemetry Tester - Batch Mode`);
  console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
  console.log(`📊 Uploading ${data.length} historical records...\n`);
  
  let success = 0;
  let failed = 0;
  
  for (let i = 0; i < data.length; i++) {
    try {
      await uploadToSupabase(data[i]);
      console.log(`✅ Uploaded ${i + 1}/${data.length}`);
      success++;
    } catch (error) {
      console.error(`❌ Error uploading record ${i}: ${error.message}`);
      failed++;
    }
  }
  
  console.log(`\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
  console.log(`✅ Success: ${success} | ❌ Failed: ${failed}`);
  console.log(`Batch upload complete!`);
}

// Main function
async function main() {
  const args = process.argv.slice(2);
  const mode = args[0] || 'stream'; // 'stream' or 'batch'
  
  // Check configuration
  if (SUPABASE_URL === 'YOUR_SUPABASE_URL' || SUPABASE_ANON_KEY === 'YOUR_SUPABASE_ANON_KEY') {
    console.error('❌ Error: Please configure Supabase credentials!');
    console.log('\nSet environment variables:');
    console.log('  export SUPABASE_URL="https://your-project.supabase.co"');
    console.log('  export SUPABASE_ANON_KEY="your-anon-key"\n');
    process.exit(1);
  }
  
  // Check CSV file exists
  if (!fs.existsSync(CSV_FILE)) {
    console.error(`❌ Error: CSV file not found: ${CSV_FILE}`);
    console.log('\nRun: npm run generate  to create test data.\n');
    process.exit(1);
  }
  
  console.log(`📁 Loading data from: ${path.basename(CSV_FILE)}`);
  const data = parseCSV(CSV_FILE);
  console.log(`✅ Loaded ${data.length} records`);
  
  if (mode === 'batch') {
    await batchUpload(data);
  } else {
    await simulateRealTimeStream(data, 1000);
  }
}

main();
