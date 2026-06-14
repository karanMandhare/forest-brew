const { Client } = require('pg');

const regions = [
  'ap-south-1',
  'ap-southeast-1',
  'ap-southeast-2',
  'ap-northeast-1',
  'ap-northeast-2',
  'us-east-1',
  'us-east-2',
  'us-west-1',
  'us-west-2',
  'eu-central-1',
  'eu-west-1',
  'eu-west-2',
  'eu-west-3',
  'sa-east-1',
  'ca-central-1'
];

async function testRegion(region) {
  const host = `aws-0-${region}.pooler.supabase.com`;
  const connectionString = `postgresql://postgres.ayytnwixykclrypemhrj:Karan%2628%231004@${host}:5432/postgres`;
  
  const client = new Client({
    connectionString,
    ssl: { rejectUnauthorized: false },
    connectionTimeoutMillis: 3000
  });

  try {
    await client.connect();
    console.log(`✅ Success in region: ${region}`);
    const res = await client.query('SELECT version();');
    console.log('Database version:', res.rows[0].version);
    await client.end();
    return true;
  } catch (err) {
    console.log(`❌ Failed in region ${region}: ${err.message}`);
    try { await client.end(); } catch (e) {}
    return false;
  }
}

async function main() {
  console.log('Testing regions for tenant ayytnwixykclrypemhrj...');
  for (const region of regions) {
    const success = await testRegion(region);
    if (success) {
      console.log(`🎉 Found correct region! Host: aws-0-${region}.pooler.supabase.com`);
      break;
    }
  }
}

main();
