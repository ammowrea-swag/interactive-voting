/**
 * Geocode polling locations using OpenStreetMap Nominatim API
 * Run with: node scripts/geocode-locations.js
 */

import fs from 'fs';
import https from 'https';

// Raw polling location addresses organized by county
const rawLocations = [
  // Bell County
  { name: "VFW Post 1820", address: "3302 Airport Road, Temple, TX", county: "Bell" },
  { name: "Northside Church of Christ", address: "3401 N. Third St., Temple, TX", county: "Bell" },
  { name: "Cross Church on Birdcreek", address: "2202 Birdcreek Drive, Temple, TX", county: "Bell" },
  { name: "Immanuel Baptist Church", address: "1401 W. Central Ave., Temple, TX", county: "Bell" },
  { name: "Temple ISD Admin Building", address: "401 Santa Fe Way, Temple, TX", county: "Bell" },
  { name: "Temple College", address: "130 E Marvin R Felder Drive, Temple, TX", county: "Bell" },
  { name: "Meredith-Dunbar Early Childhood Academy", address: "1717 E. Ave. J, Temple, TX", county: "Bell" },
  { name: "First Baptist Church of Moffat", address: "13929 Moffat Road, Temple, TX", county: "Bell" },
  { name: "First Church of the Nazarene", address: "5000 S 31st St., Temple, TX", county: "Bell" },
  { name: "Belton Nazarene Church", address: "1701 Sparta Road, Belton, TX", county: "Bell" },
  { name: "North Belton Annex", address: "1605 N. Main St., Belton, TX", county: "Bell" },
  { name: "Belton Senior Center", address: "842 S. Mitchell St., Belton, TX", county: "Bell" },
  { name: "Belton Annex", address: "550 E. Second Ave., Belton, TX", county: "Bell" },
  { name: "Lakeview Baptist Church", address: "7717 State Highway 317, Belton, TX", county: "Bell" },
  { name: "Bartlett City Hall", address: "140 W. Clark St., Bartlett, TX", county: "Bell" },
  { name: "Holland Community Center", address: "107 W. Travis St., Holland, TX", county: "Bell" },
  { name: "St. Joseph Catholic Church Fellowship Hall", address: "20220 FM 485, Burlington, TX", county: "Bell" },
  { name: "St. Matthews Catholic Church", address: "14051 E. U.S. Highway 190, Rogers, TX", county: "Bell" },
  { name: "Troy Community Center", address: "201 E. Main St., Troy, TX", county: "Bell" },
  { name: "Morgan's Point Event Center", address: "60 Morgan's Point Blvd., Morgan's Point Resort, TX", county: "Bell" },
  { name: "Little River's Freedom Road Fellowship", address: "1406 W. Church St., Little River-Academy, TX", county: "Bell" },
  { name: "Salado Annex", address: "11057 Event Drive, Salado, TX", county: "Bell" },
  { name: "Liberty Christian Center", address: "4107 Westcliff Road, Killeen, TX", county: "Bell" },
  { name: "Christian House of Prayer", address: "3300 E. Stan Schlueter Loop, Killeen, TX", county: "Bell" },
  { name: "Jackson Professional Learning Center", address: "902 Rev. R.A. Ambercrombie Drive, Killeen, TX", county: "Bell" },
  { name: "Killeen Senior Center at Lions Club Park", address: "1700 E. Stan Schleuter Loop, Killeen, TX", county: "Bell" },
  { name: "Charis Church", address: "1401 E. Elms Road, Killeen, TX", county: "Bell" },
  { name: "First Baptist Church of Trimmier", address: "6405 Chaparral Road, Killeen, TX", county: "Bell" },
  { name: "True Deliverance Ministries", address: "709 W. Dean Ave., Killeen, TX", county: "Bell" },
  { name: "Robert M. Shoemaker High School", address: "3302 Clear Creek Road, Killeen, TX", county: "Bell" },
  { name: "Skyline Baptist Church", address: "906 Trimmier Road, Killeen, TX", county: "Bell" },
  { name: "Westside Baptist Church", address: "711 Stagecoach Road, Killeen, TX", county: "Bell" },
  { name: "Killeen Utilities Department", address: "210 W. Ave. C, Killeen, TX", county: "Bell" },
  { name: "The Journey Church", address: "5300 Bunny Trail, Killeen, TX", county: "Bell" },
  { name: "Pershing Park Baptist Church", address: "1200 FM Old 440 Road, Killeen, TX", county: "Bell" },
  { name: "Triple 7 Fire Station", address: "258 Triple 7 Trial, Killeen, TX", county: "Bell" },
  { name: "St. Paul Chong Hasang Catholic Church", address: "1000 E. FM 2410, Harker Heights, TX", county: "Bell" },
  { name: "VFW Post 3892", address: "201 VFW Drive, Harker Heights, TX", county: "Bell" },
  { name: "Harker Heights Parks & Recreation Center", address: "307 Millers Crossing, Harker Heights, TX", county: "Bell" },
  { name: "Nolanville City Hall", address: "101 N. Fifth St., Nolanville, TX", county: "Bell" },
  { name: "Boys Ranch Road", address: "3275 Boys Ranch Road, Kempner, TX", county: "Bell" },
  
  // Coryell County
  { name: "Copperas Cove Civic Center", address: "1206 W. Ave. B, Copperas Cove, TX", county: "Coryell" },
  { name: "Holy Family Catholic Church", address: "1001 Georgetown Road., Copperas Cove, TX", county: "Coryell" },
  { name: "Eastside Baptist Church", address: "1202 ML King Jr. Blvd., Copperas Cove, TX", county: "Coryell" },
  { name: "Gatesville Civic Center", address: "303 Veterans Memorial Loop, Gatesville, TX", county: "Coryell" },
  { name: "Turnersville Community Center", address: "8115 FM 182, Gatesville, TX", county: "Coryell" },
  { name: "Evant City Hall", address: "598 E. Highway 84, Evant, TX", county: "Coryell" },
  { name: "Flat Community Center", address: "159 CR 334, Flat, TX", county: "Coryell" },
  { name: "Oglesby Community Center", address: "118 Main St., Oglesby, TX", county: "Coryell" },
  
  // Lampasas County
  { name: "New Covenant Church", address: "1604 Central Texas Expressway, Lampasas, TX", county: "Lampasas" },
  { name: "Kempner Fire Dept. Training", address: "315 S. Pecan, Kempner, TX", county: "Lampasas" },
  { name: "Clear Creek Baptist", address: "3350 FM 2657, Kempner, TX", county: "Lampasas" },
  { name: "Lometa City Hall", address: "100 E. San Saba St., Lometa, TX", county: "Lampasas" },
  { name: "Adamsville Community Center", address: "174 CR 3750, Adamsville, TX", county: "Lampasas" },
  
  // Milam County
  { name: "Cameron Housing Authority", address: "704 W. Sixth St., Cameron, TX", county: "Milam" },
  { name: "Cameron Family Life Center", address: "112 N. Travis Ave., Cameron, TX", county: "Milam" },
  { name: "George Hill Patterson Center", address: "609 Mill St., Rockdale, TX", county: "Milam" },
  { name: "Buckholts Community Center", address: "110 W. Main, Buckholts, TX", county: "Milam" },
  { name: "Thorndale Area Chamber of Commerce", address: "120 S. Main, Thorndale, TX", county: "Milam" },
  { name: "Milano VFD", address: "305 E. Ave. C, Milano, TX", county: "Milam" },
  { name: "Gause VFD", address: "116 E. Gause Blvd., Gause, TX", county: "Milam" }
];

// Helper to make geocoding request with delay
function geocodeAddress(address) {
  return new Promise((resolve, reject) => {
    const encodedAddress = encodeURIComponent(address);
    const url = `https://nominatim.openstreetmap.org/search?q=${encodedAddress}&format=json&limit=1&addressdetails=1`;
    
    https.get(url, {
      headers: {
        'User-Agent': 'PollingLocationFinder/1.0'
      }
    }, (res) => {
      let data = '';
      
      res.on('data', (chunk) => {
        data += chunk;
      });
      
      res.on('end', () => {
        try {
          const json = JSON.parse(data);
          if (json.length > 0) {
            resolve({
              lat: parseFloat(json[0].lat),
              lng: parseFloat(json[0].lon),
              zipCode: json[0].address?.postcode || ''
            });
          } else {
            resolve(null);
          }
        } catch (err) {
          reject(err);
        }
      });
    }).on('error', reject);
  });
}

// Sleep helper for rate limiting
function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// Main geocoding function
async function geocodeAllLocations() {
  const results = [];
  
  console.log(`Starting geocoding for ${rawLocations.length} locations...`);
  
  for (let i = 0; i < rawLocations.length; i++) {
    const location = rawLocations[i];
    console.log(`[${i + 1}/${rawLocations.length}] Geocoding: ${location.name}`);
    
    try {
      const geoData = await geocodeAddress(location.address);
      
      if (geoData) {
        results.push({
          name: location.name,
          address: location.address,
          county: location.county,
          zipCode: geoData.zipCode,
          lat: geoData.lat,
          lng: geoData.lng
        });
        console.log(`  ✓ Success: ${geoData.zipCode} (${geoData.lat}, ${geoData.lng})`);
      } else {
        console.log(`  ✗ Failed: No results found`);
        // Still add location without coordinates
        results.push({
          name: location.name,
          address: location.address,
          county: location.county,
          zipCode: '',
          lat: null,
          lng: null
        });
      }
    } catch (err) {
      console.log(`  ✗ Error: ${err.message}`);
      results.push({
        name: location.name,
        address: location.address,
        county: location.county,
        zipCode: '',
        lat: null,
        lng: null
      });
    }
    
    // Rate limiting: wait 1.1 seconds between requests
    if (i < rawLocations.length - 1) {
      await sleep(1100);
    }
  }
  
  return results;
}

// Run the geocoding and save results
(async () => {
  try {
    const locations = await geocodeAllLocations();
    
    // Ensure the data directory exists
    const dataDir = './static/data';
    if (!fs.existsSync(dataDir)) {
      fs.mkdirSync(dataDir, { recursive: true });
    }
    
    // Write to JSON file
    const outputPath = `${dataDir}/polling-locations.json`;
    fs.writeFileSync(outputPath, JSON.stringify(locations, null, 2));
    
    console.log(`\n✓ Successfully geocoded ${locations.length} locations`);
    console.log(`✓ Data saved to ${outputPath}`);
    
    // Count successful geocodes
    const successful = locations.filter(loc => loc.lat !== null).length;
    const failed = locations.length - successful;
    console.log(`\nResults: ${successful} successful, ${failed} failed`);
    
  } catch (err) {
    console.error('Error:', err);
    process.exit(1);
  }
})();
