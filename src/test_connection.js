/**
 * Test Supabase Connection
 * 
 * Verifies the connection to Supabase and checks table access.
 */

const SUPABASE_URL = process.env.SUPABASE_URL || 'YOUR_SUPABASE_URL';
const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY || 'YOUR_SUPABASE_ANON_KEY';

async function testConnection() {
  console.log('🔌 SC2 Telemetry - Connection Test');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  
  // Check configuration
  if (SUPABASE_URL === 'YOUR_SUPABASE_URL' || SUPABASE_ANON_KEY === 'YOUR_SUPABASE_ANON_KEY') {
    console.error('❌ Error: Please configure Supabase credentials!');
    console.log('\nSet environment variables:');
    console.log('  export SUPABASE_URL="https://your-project.supabase.co"');
    console.log('  export SUPABASE_ANON_KEY="your-anon-key"\n');
    process.exit(1);
  }
  
  console.log(`🌐 URL: ${SUPABASE_URL}`);
  console.log(`🔑 Key: ${SUPABASE_ANON_KEY.substring(0, 20)}...`);
  console.log('');
  
  // Test 1: Basic connection
  console.log('Test 1: Basic Connection...');
  try {
    const response = await fetch(`${SUPABASE_URL}/rest/v1/`, {
      headers: {
        'apikey': SUPABASE_ANON_KEY,
        'Authorization': `Bearer ${SUPABASE_ANON_KEY}`
      }
    });
    
    if (response.ok) {
      console.log('  ✅ Connected to Supabase API');
    } else {
      console.log(`  ❌ Connection failed: ${response.status}`);
    }
  } catch (error) {
    console.log(`  ❌ Connection error: ${error.message}`);
  }
  
  // Test 2: Check telemetry_latest table
  console.log('\nTest 2: telemetry_latest Table...');
  try {
    const response = await fetch(`${SUPABASE_URL}/rest/v1/telemetry_latest?limit=1`, {
      headers: {
        'apikey': SUPABASE_ANON_KEY,
        'Authorization': `Bearer ${SUPABASE_ANON_KEY}`
      }
    });
    
    if (response.ok) {
      const data = await response.json();
      console.log(`  ✅ Table accessible, ${data.length} record(s) found`);
      if (data.length > 0) {
        console.log(`  📊 Last update: ${data[0].updated_at || 'N/A'}`);
      }
    } else if (response.status === 404) {
      console.log('  ⚠️  Table not found. Run SQL schema first.');
    } else {
      const error = await response.text();
      console.log(`  ❌ Table error: ${response.status} - ${error}`);
    }
  } catch (error) {
    console.log(`  ❌ Error: ${error.message}`);
  }
  
  // Test 3: Check telemetry table (historical)
  console.log('\nTest 3: telemetry Table (historical)...');
  try {
    const response = await fetch(`${SUPABASE_URL}/rest/v1/telemetry?limit=1`, {
      headers: {
        'apikey': SUPABASE_ANON_KEY,
        'Authorization': `Bearer ${SUPABASE_ANON_KEY}`
      }
    });
    
    if (response.ok) {
      const data = await response.json();
      console.log(`  ✅ Table accessible, ${data.length} record(s) found`);
    } else if (response.status === 404) {
      console.log('  ⚠️  Table not found. Run SQL schema first.');
    } else {
      console.log(`  ❌ Table error: ${response.status}`);
    }
  } catch (error) {
    console.log(`  ❌ Error: ${error.message}`);
  }
  
  // Test 4: Write test
  console.log('\nTest 4: Write Permission...');
  try {
    const testRecord = {
      id: 'connection_test',
      timestamp: Date.now(),
      speed: 0,
      soc: 100,
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
      body: JSON.stringify(testRecord)
    });
    
    if (response.ok) {
      console.log('  ✅ Write permission OK');
    } else {
      const error = await response.text();
      console.log(`  ❌ Write failed: ${response.status} - ${error}`);
    }
  } catch (error) {
    console.log(`  ❌ Error: ${error.message}`);
  }
  
  console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('Connection test complete!');
}

testConnection();
