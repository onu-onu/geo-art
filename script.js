// Global variables
let map;
let currentMarker;
let facilityMarkers = [];
let currentLat, currentLon;
let panelVisible = true;
let currentWeatherData = {};
let currentTime = new Date();

// Amenity to Hue mapping (HSL color space)
const amenityHueMap = {
  'restaurant': 0,      // Red
  'cafe': 30,           // Orange
  'bar': 60,            // Yellow
  'fast_food': 90,      // Green-yellow
  'shop': 120,          // Green
  'supermarket': 150,   // Cyan-green
  'bakery': 180,        // Cyan
  'bank': 210,          // Blue
  'post_office': 240,   // Indigo
  'library': 270,       // Violet
  'hospital': 300,      // Magenta
  'pharmacy': 330,      // Rose
  'park': 120,          // Green
  'parking': 60         // Yellow
};

// Map initialization
function initMap() {
  map = L.map('map').setView([35.6762, 139.6503], 13);
  
  // Dark monochrome tile layer (CartoDB Positron Dark)
  L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
    attribution: '© OpenStreetMap contributors, © CartoDB',
    maxZoom: 19,
    subdomains: 'abcd'
  }).addTo(map);
}

// Get current location
function getCurrentLocation() {
  showMessage('Fetching location...', 'info');
  
  if (!navigator.geolocation) {
    showError('Geolocation API not supported by this browser');
    return;
  }
  
  navigator.geolocation.getCurrentPosition(
    (position) => {
      currentLat = position.coords.latitude;
      currentLon = position.coords.longitude;
      
      console.log(`Location: ${currentLat}, ${currentLon}`);
      
      // Move map center
      map.setView([currentLat, currentLon], 14);
      
      // Set current location marker
      if (currentMarker) {
        map.removeLayer(currentMarker);
      }
      currentMarker = L.marker([currentLat, currentLon], {
        icon: L.icon({
          iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-blue.png',
          shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/0.7.7/images/marker-shadow.png',
          iconSize: [25, 41],
          iconAnchor: [12, 41],
          popupAnchor: [1, -34],
          shadowSize: [41, 41]
        })
      }).addTo(map);
      currentMarker.bindPopup('📍 Current Location').openPopup();
      
      // Start data fetching
      currentTime = new Date();
      fetchAllData();
    },
    (error) => {
      console.error('Geolocation error:', error);
      showError(`Failed to get location: ${error.message}`);
      // Fallback
      fetchAllData();
    },
    {
      enableHighAccuracy: true,
      timeout: 10000,
      maximumAge: 0
    }
  );
}

// Fetch all data
async function fetchAllData() {
  if (!currentLat || !currentLon) {
    showError('Location data not available');
    return;
  }
  
  try {
    await Promise.all([
      fetchAddress(),
      fetchWeather(),
      fetchFacilities()
    ]);
  } catch (error) {
    console.error('Data fetch error:', error);
    showError(`Error fetching data: ${error.message}`);
  }
}

// Nominatim - Fetch address (English)
async function fetchAddress() {
  try {
    const response = await fetch(
      `https://nominatim.openstreetmap.org/reverse?format=json&lat=${currentLat}&lon=${currentLon}&zoom=10&addressdetails=1&accept-language=en`,
      { headers: { 'Accept': 'application/json' } }
    );
    
    if (!response.ok) throw new Error('Nominatim API error');
    
    const data = await response.json();
    const address = data.address;
    
    const displayAddress = `${address.city || address.town || address.village || 'Unknown'}, ${address.state || address.country || ''}`;
    
    // Display address at bottom with rotating characters
    displayRotatingAddress(displayAddress);
    document.getElementById('coordinates').textContent = `Coordinates: ${currentLat.toFixed(4)}, ${currentLon.toFixed(4)}`;
    
    console.log('Address:', displayAddress);
  } catch (error) {
    console.error('Nominatim error:', error);
    document.getElementById('address').textContent = 'Address fetch failed';
  }
}

// Display address with rotating characters
function displayRotatingAddress(address) {
  const addressElement = document.getElementById('address');
  addressElement.innerHTML = '';
  
  // Remove spaces and convert to array of characters
  const chars = address.split('');
  
  chars.forEach((char, index) => {
    const span = document.createElement('span');
    span.textContent = char;
    span.className = 'address-char';
    
    // Random rotation for each character
    const randomRotation = (Math.random() - 0.5) * 360;
    span.style.setProperty('--rotation', `${randomRotation}deg`);
    
    addressElement.appendChild(span);
  });
}

// Open-Meteo - Fetch weather
async function fetchWeather() {
  try {
    const response = await fetch(
      `https://api.open-meteo.com/v1/forecast?latitude=${currentLat}&longitude=${currentLon}&current=temperature_2m,weather_code,wind_speed_10m,relative_humidity_2m&timezone=auto`
    );
    
    if (!response.ok) throw new Error('Open-Meteo API error');
    
    const data = await response.json();
    const current = data.current;
    
    currentWeatherData = current;
    
    const temp = current.temperature_2m;
    const windSpeed = current.wind_speed_10m;
    const humidity = current.relative_humidity_2m;
    
    document.getElementById('temperature').textContent = `Temperature: ${temp}°C`;
    document.getElementById('wind-speed').textContent = `Wind Speed: ${windSpeed} m/s`;
    document.getElementById('weather-description').textContent = `Humidity: ${humidity}%`;
    
    console.log('Weather:', { temp, windSpeed, humidity });
  } catch (error) {
    console.error('Open-Meteo error:', error);
    document.getElementById('temperature').textContent = 'Weather fetch failed';
  }
}

// Overpass - Fetch nearby facilities
async function fetchFacilities() {
  try {
    const query = `[out:json][timeout:25];
(
  node["shop"](around:1000,${currentLat},${currentLon});
  node["amenity"](around:1000,${currentLat},${currentLon});
  way["shop"](around:1000,${currentLat},${currentLon});
  way["amenity"](around:1000,${currentLat},${currentLon});
);
out center 50;
`;
    
    const response = await fetch('https://overpass-api.de/api/interpreter', {
      method: 'POST',
      body: query
    });
    
    if (!response.ok) throw new Error('Overpass API error');
    
    const data = await response.json();
    const elements = data.elements || [];
    
    console.log('Fetched facilities:', elements.length);
    
    // Remove existing markers
    facilityMarkers.forEach(marker => map.removeLayer(marker));
    facilityMarkers = [];
    
    // Clear facilities list
    const facilitiesList = document.getElementById('facilities-list');
    facilitiesList.innerHTML = '';
    
    // Display up to 50 facilities
    const displayElements = elements.slice(0, 50);
    
    displayElements.forEach((element) => {
      if (!element.lat || !element.lon) return;
      
      const tags = element.tags || {};
      const name = tags.name || tags.shop || tags.amenity || 'Facility';
      const type = tags.amenity || tags.shop || 'unknown';
      const openingHours = tags.opening_hours || '';
      
      // Calculate color based on amenity type and opening hours
      const hue = amenityHueMap[type] || 0;
      const saturation = 85; // Fixed at 0.85
      const lightness = calculateLightness(openingHours);
      
      const color = `hsl(${hue}, ${saturation}%, ${lightness}%)`;
      
      // Create small circle marker
      const circleMarker = L.circleMarker([element.lat, element.lon], {
        radius: 5,
        fillColor: color,
        color: color,
        weight: 1,
        opacity: 0.8,
        fillOpacity: 0.7
      }).addTo(map);
      
      circleMarker.bindPopup(`<b>${name}</b><br>Type: ${type}`);
      facilityMarkers.push(circleMarker);
      
      // Add to list
      const item = document.createElement('div');
      item.className = 'facility-item';
      item.innerHTML = `<div class="name" style="color: ${color};">● ${name}</div><div class="type">${type}</div>`;
      facilitiesList.appendChild(item);
    });
    
    if (displayElements.length === 0) {
      facilitiesList.innerHTML = '<p>No facilities found nearby</p>';
    }
  } catch (error) {
    console.error('Overpass error:', error);
    document.getElementById('facilities-list').innerHTML = '<p>Facility fetch failed</p>';
  }
}

// Calculate lightness based on opening hours vs current time
function calculateLightness(openingHoursStr) {
  if (!openingHoursStr) return 50; // Default to 50% if no opening hours
  
  try {
    // Try to parse opening hours and calculate time until closing/opening
    // For simplicity, using a fixed calculation
    // This is a placeholder - more complex parsing would be needed for full OSM format
    
    const hour = currentTime.getHours();
    
    // Simple heuristic: facilities typically open 9-22
    const isOpen = hour >= 9 && hour <= 22;
    
    if (isOpen) {
      // Normalize hour to 0-1 range during open hours
      const normalizedTime = (hour - 9) / 13; // 9-22 = 13 hours
      const lightness = 30 + (normalizedTime * 40); // Range 30-70%
      return Math.round(lightness);
    } else {
      // Closed - use darker values
      return 20;
    }
  } catch (error) {
    return 50;
  }
}

// Toggle info panel
function togglePanel() {
  const panel = document.getElementById('info-panel');
  panelVisible = !panelVisible;
  panel.style.display = panelVisible ? 'block' : 'none';
}

// Refresh data
function refreshData() {
  console.log('Refreshing data...');
  getCurrentLocation();
}

// Show error message
function showError(message) {
  console.error(message);
  const errorDiv = document.getElementById('error-message');
  errorDiv.textContent = message;
  errorDiv.style.display = 'block';
  setTimeout(() => {
    errorDiv.style.display = 'none';
  }, 5000);
}

// Show message (for console)
function showMessage(message, type = 'info') {
  console.log(`[${type.toUpperCase()}] ${message}`);
}

// Initialize
window.addEventListener('load', () => {
  console.log('Initializing app...');
  initMap();
  getCurrentLocation();
});