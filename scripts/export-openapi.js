const fs = require('fs');
const path = require('path');

async function exportOpenAPI() {
  const port = process.env.PORT || process.argv[2] || '8000';
  const baseUrl = process.env.API_URL || `http://localhost:${port}`;
  
  try {
    console.log(`🔄 Fetching OpenAPI spec from ${baseUrl}/api-json...`);
    
    const fetch = (await import('node-fetch')).default;
    const response = await fetch(`${baseUrl}/api-json`);
    
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }
    
    const openApiSpec = await response.json();
    
    // Ensure output directory exists
    const outputDir = path.join(__dirname, '..', 'dist');
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
    }
    
    const outputPath = path.join(outputDir, 'openapi.json');
    fs.writeFileSync(outputPath, JSON.stringify(openApiSpec, null, 2));
    
    console.log(`✅ OpenAPI spec exported to: ${outputPath}`);
    console.log(`📋 Copy this file to your frontend project for client generation`);
    
    // Also create a copy in the root for convenience
    const rootPath = path.join(__dirname, '..', 'openapi.json');
    fs.writeFileSync(rootPath, JSON.stringify(openApiSpec, null, 2));
    console.log(`📋 Also saved to: ${rootPath}`);
    
  } catch (error) {
    console.error('❌ Failed to export OpenAPI spec:', error.message);
    console.error('💡 Make sure the server is running on', baseUrl);
    process.exit(1);
  }
}

exportOpenAPI();