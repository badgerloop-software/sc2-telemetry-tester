/**
 * CSV to InfluxDB Upload Script
 *
 * Simulates what the Raspberry Pi does:
 *   1. Read telemetry data from CSV (or CAN bus in production)
 *   2. Parse it into key-value pairs
 *   3. Write to InfluxDB Cloud using the Line Protocol HTTP API
 *
 * Usage:
 *   1. Copy .env.example to .env and fill in your InfluxDB credentials
 *   2. Run: node src/upload_telemetry.js [stream|batch]
 *
 * Environment variables:
 *   INFLUX_URL    — e.g. https://us-east-1-1.aws.cloud2.influxdata.com
 *   INFLUX_TOKEN  — All-Access API token from InfluxDB dashboard
 *   INFLUX_ORG    — Organisation ID (hex string from your org URL)
 *   INFLUX_BUCKET — Bucket name (e.g. sc2-telemetry)
 */

require('dotenv').config();
const fs   = require('fs');
const path = require('path');

// ── InfluxDB configuration ────────────────────────────────────────────────────
const INFLUX_URL    = process.env.INFLUX_URL    || 'https://us-east-1-1.aws.cloud2.influxdata.com';
const INFLUX_TOKEN  = process.env.INFLUX_TOKEN  || '';
const INFLUX_ORG    = process.env.INFLUX_ORG    || '307f8812c3d9b017';
const INFLUX_BUCKET = process.env.INFLUX_BUCKET || 'sc2-telemetry';

/** InfluxDB measurement name — must match what the mobile app queries */
const MEASUREMENT = 'sc2_telemetry';

// CSV file path
const CSV_FILE = path.join(__dirname, '../data/test_telemetry.csv');

// ── CSV parser ────────────────────────────────────────────────────────────────
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
      const parsed = parseFloat(value);
      row[header.trim()] = isNaN(parsed) ? value : parsed;
    });
    data.push(row);
  }
  return data;
}

// ── InfluxDB Line Protocol helpers ────────────────────────────────────────────

/**
 * Escapes special characters in InfluxDB Line Protocol tag/field keys and values.
 */
const escapeLP = (str) => String(str).replace(/,/g, '\\,').replace(/ /g, '\\ ').replace(/=/g, '\\=');

/**
 * Converts a telemetry record object into a single InfluxDB Line Protocol string.
 *
 * Line Protocol format:
 *   <measurement>[,<tag_key>=<tag_value>] <field_key>=<field_value>[,…] [<timestamp>]
 *
 * Example:
 *   telemetry speed=42.3,soc=87.1,motor_temp=45.2 1710000000000000000
 */
function toLineProtocol(record, timestampNs) {
  const fields = [];

  for (const [key, value] of Object.entries(record)) {
    if (key === 'timestamp') continue; // handled separately
    if (value === null || value === undefined || value === '') continue;

    const escapedKey = escapeLP(key);

    if (typeof value === 'boolean') {
      fields.push(`${escapedKey}=${value ? 'true' : 'false'}`);
    } else if (typeof value === 'number' && !isNaN(value)) {
      // Always write as float — avoids InfluxDB schema conflicts between
      // integer and float types across different records in the same field
      fields.push(`${escapedKey}=${value}`);
    } else {
      // String value — wrap in double quotes
      const escaped = String(value).replace(/"/g, '\\"');
      fields.push(`${escapedKey}="${escaped}"`);
    }
  }

  if (fields.length === 0) return null;

  return `${MEASUREMENT} ${fields.join(',')} ${timestampNs}`;
}

/**
 * Writes one or more Line Protocol lines to InfluxDB via the /api/v2/write endpoint.
 */
async function writeToInflux(lines) {
  const body = Array.isArray(lines) ? lines.join('\n') : lines;

  const response = await fetch(
    `${INFLUX_URL}/api/v2/write?org=${INFLUX_ORG}&bucket=${INFLUX_BUCKET}&precision=ns`,
    {
      method: 'POST',
      headers: {
        'Authorization': `Token ${INFLUX_TOKEN}`,
        'Content-Type': 'text/plain; charset=utf-8',
      },
      body,
    }
  );

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`InfluxDB write failed (${response.status}): ${error}`);
  }

  return true;
}

// ── Stream mode ───────────────────────────────────────────────────────────────

async function simulateRealTimeStream(data, intervalMs = 1000) {
  console.log(`\n🚗 SC2 Telemetry Tester — Stream Mode`);
  console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
  console.log(`📊 Records : ${data.length}`);
  console.log(`⏱️  Interval: ${intervalMs}ms`);
  console.log(`🗄️  Bucket  : ${INFLUX_BUCKET}`);
  console.log(`\nStarting stream... Press Ctrl+C to stop.\n`);

  let index = 0;

  const interval = setInterval(async () => {
    if (index >= data.length) {
      console.log('🔄 All records uploaded. Looping...\n');
      index = 0;
    }

    const record = { ...data[index] };
    // Use current time as the timestamp (nanosecond precision)
    const timestampNs = BigInt(Date.now()) * 1_000_000n;
    record.timestamp = Date.now();

    try {
      const line = toLineProtocol(record, timestampNs);
      if (line) {
        await writeToInflux(line);
        console.log(`[${new Date().toISOString()}] ✅ Record ${index + 1}/${data.length} | Speed: ${record.speed?.toFixed(1) ?? 0} mph | SOC: ${record.soc?.toFixed(1) ?? 0}%`);
      }
      index++;
    } catch (error) {
      console.error(`[${new Date().toISOString()}] ❌ Error: ${error.message}`);
    }
  }, intervalMs);

  process.on('SIGINT', () => {
    clearInterval(interval);
    console.log('\n\n👋 Stopped data stream.');
    process.exit(0);
  });
}

// ── Batch mode ────────────────────────────────────────────────────────────────

async function batchUpload(data) {
  console.log(`\n🚗 SC2 Telemetry Tester — Batch Mode`);
  console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
  console.log(`📊 Uploading ${data.length} historical records...\n`);

  // Build all lines with evenly-spaced timestamps going back in time
  const now = BigInt(Date.now()) * 1_000_000n;
  const stepNs = 1_000_000_000n; // 1 second apart

  const lines = [];
  for (let i = 0; i < data.length; i++) {
    const timestampNs = now - BigInt(data.length - i) * stepNs;
    const line = toLineProtocol(data[i], timestampNs);
    if (line) lines.push(line);
  }

  // Send in chunks of 500 to stay under HTTP body limits
  const CHUNK_SIZE = 500;
  let success = 0;
  let failed = 0;

  for (let i = 0; i < lines.length; i += CHUNK_SIZE) {
    const chunk = lines.slice(i, i + CHUNK_SIZE);
    try {
      await writeToInflux(chunk);
      success += chunk.length;
      console.log(`✅ Uploaded ${Math.min(i + CHUNK_SIZE, lines.length)}/${lines.length}`);
    } catch (error) {
      failed += chunk.length;
      console.error(`❌ Error uploading chunk ${i}–${i + CHUNK_SIZE}: ${error.message}`);
    }
  }

  console.log(`\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
  console.log(`✅ Success: ${success} | ❌ Failed: ${failed}`);
  console.log(`Batch upload complete!`);
}

// ── Main ──────────────────────────────────────────────────────────────────────

async function main() {
  const mode = process.argv[2] || 'stream';

  // Check credentials
  if (!INFLUX_TOKEN) {
    console.error('❌ Error: INFLUX_TOKEN is not set!');
    console.log('\nCreate a .env file with:');
    console.log('  INFLUX_TOKEN=your_token_here');
    console.log('  INFLUX_BUCKET=sc2-telemetry\n');
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

