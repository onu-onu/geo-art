// グローバル変数
let map;
let currentMarker;
let facilityMarkers = [];
let currentLat, currentLon;
let panelVisible = true;

// 天気コード対応表
const weatherCodes = {
  0: '晴天',
  1: '晴れ',
  2: '曇り',
  3: '曇り',
  45: '霧',
  48: '霧',
  51: '小雨',
  53: '小雨',
  55: '小雨',
  61: '雨',
  63: '雨',
  65: '大雨',
  71: '小雪',
  73: '小雪',
  75: '雪',
  77: '雪粒',
  80: 'スコール',
  81: 'スコール',
  82: 'スコール',
  85: 'みぞれ',
  86: 'みぞれ'
};

// 施設タイプのアイコン
const facilityIcons = {
  'restaurant': '🍽️',
  'cafe': '☕',
  'bar': '🍺',
  'fast_food': '🍔',
  'shop': '🏪',
  'supermarket': '🛒',
  'bakery': '🥐',
  'bank': '🏦',
  'post_office': '📮',
  'library': '📚',
  'hospital': '🏥',
  'pharmacy': '💊',
  'park': '🌳',
  'parking': '🅿️'
};

// マップ初期化
function initMap() {
  map = L.map('map').setView([35.6762, 139.6503], 13);
  
  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution: '© OpenStreetMap contributors',
    maxZoom: 19
  }).addTo(map);
}

// 位置情報取得
function getCurrentLocation() {
  showMessage('位置情報を取得中...', 'info');
  
  if (!navigator.geolocation) {
    showError('ブラウザがGeolocation APIに対応していません');
    return;
  }
  
  navigator.geolocation.getCurrentPosition(
    (position) => {
      currentLat = position.coords.latitude;
      currentLon = position.coords.longitude;
      
      console.log(`位置情報: ${currentLat}, ${currentLon}`);
      
      // マップ中心を移動
      map.setView([currentLat, currentLon], 14);
      
      // 現在地マーカーを設置
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
      currentMarker.bindPopup('📍 現在地').openPopup();
      
      // データ取得開始
      fetchAllData();
    },
    (error) => {
      console.error('位置情報エラー:', error);
      showError(`位置情報の取得に失敗しました: ${error.message}`);
      // フォールバック
      fetchAllData();
    },
    {
      enableHighAccuracy: true,
      timeout: 10000,
      maximumAge: 0
    }
  );
}

// 全てのデータ取得
async function fetchAllData() {
  if (!currentLat || !currentLon) {
    showError('位置情報が利用できません');
    return;
  }
  
  try {
    await Promise.all([
      fetchAddress(),
      fetchWeather(),
      fetchFacilities()
    ]);
  } catch (error) {
    console.error('データ取得エラー:', error);
    showError(`データ取得中にエラーが発生しました: ${error.message}`);
  }
}

// Nominatim - 住所取得
async function fetchAddress() {
  try {
    const response = await fetch(
      `https://nominatim.openstreetmap.org/reverse?format=json&lat=${currentLat}&lon=${currentLon}&zoom=10&addressdetails=1`,
      { headers: { 'Accept': 'application/json' } }
    );
    
    if (!response.ok) throw new Error('Nominatim API error');
    
    const data = await response.json();
    const address = data.address;
    
    const displayAddress = `${address.city || address.town || address.village || '不明'}, ${address.prefecture || address.state || ''}`;
    
    document.getElementById('address').textContent = displayAddress;
    document.getElementById('coordinates').textContent = `座標: ${currentLat.toFixed(4)}, ${currentLon.toFixed(4)}`;
    
    console.log('住所:', displayAddress);
  } catch (error) {
    console.error('Nominatim エラー:', error);
    document.getElementById('address').textContent = '住所取得失敗';
  }
}

// Open-Meteo - 天気取得
async function fetchWeather() {
  try {
    const response = await fetch(
      `https://api.open-meteo.com/v1/forecast?latitude=${currentLat}&longitude=${currentLon}&current=temperature_2m,weather_code,wind_speed_10m,relative_humidity_2m&timezone=Asia/Tokyo`
    );
    
    if (!response.ok) throw new Error('Open-Meteo API error');
    
    const data = await response.json();
    const current = data.current;
    
    const temp = current.temperature_2m;
    const weatherCode = current.weather_code;
    const windSpeed = current.wind_speed_10m;
    const humidity = current.relative_humidity_2m;
    const weatherDesc = weatherCodes[weatherCode] || '不明';
    
    document.getElementById('temperature').textContent = `気温: ${temp}°C`;
    document.getElementById('wind-speed').textContent = `風速: ${windSpeed} m/s`;
    document.getElementById('weather-description').textContent = `天気: ${weatherDesc} (湿度: ${humidity}%)`;
    
    console.log('天気:', { temp, weatherDesc, windSpeed, humidity });
  } catch (error) {
    console.error('Open-Meteo エラー:', error);
    document.getElementById('temperature').textContent = '天気取得失敗';
  }
}

// Overpass - 周辺施設取得
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
    
    console.log('取得した施設数:', elements.length);
    
    // 既存マーカーを削除
    facilityMarkers.forEach(marker => map.removeLayer(marker));
    facilityMarkers = [];
    
    // 施設リストをクリア
    const facilitiesList = document.getElementById('facilities-list');
    facilitiesList.innerHTML = '';
    
    // 最大20個の施設を表示
    const displayElements = elements.slice(0, 20);
    
    displayElements.forEach((element) => {
      if (!element.lat || !element.lon) return;
      
      const tags = element.tags || {};
      const name = tags.name || tags.shop || tags.amenity || '施設';
      const type = tags.amenity || tags.shop || 'unknown';
      const icon = facilityIcons[type] || '📍';
      
      // マーカーを追加
      const marker = L.marker([element.lat, element.lon], {
        icon: L.divIcon({
          className: 'facility-marker',
          html: `<div style="font-size: 20px;">${icon}</div>`,
          iconSize: [30, 30],
          iconAnchor: [15, 15]
        })
      }).addTo(map);
      
      marker.bindPopup(`<b>${name}</b><br>タイプ: ${type}`);
      facilityMarkers.push(marker);
      
      // リストに追加
      const item = document.createElement('div');
      item.className = 'facility-item';
      item.innerHTML = `<div class="name">${icon} ${name}</div><div class="type">${type}</div>`;
      facilitiesList.appendChild(item);
    });
    
    if (displayElements.length === 0) {
      facilitiesList.innerHTML = '<p>周辺に施設が見つかりません</p>';
    }
  } catch (error) {
    console.error('Overpass エラー:', error);
    document.getElementById('facilities-list').innerHTML = '<p>施設取得失敗</p>';
  }
}

// 情報パネルの表示/非表示
function togglePanel() {
  const panel = document.getElementById('info-panel');
  panelVisible = !panelVisible;
  panel.style.display = panelVisible ? 'block' : 'none';
}

// データを更新
function refreshData() {
  console.log('データを更新中...');
  getCurrentLocation();
}

// エラーメッセージ表示
function showError(message) {
  console.error(message);
  const errorDiv = document.getElementById('error-message');
  errorDiv.textContent = message;
  errorDiv.style.display = 'block';
  setTimeout(() => {
    errorDiv.style.display = 'none';
  }, 5000);
}

// メッセージ表示（コンソール用）
function showMessage(message, type = 'info') {
  console.log(`[${type.toUpperCase()}] ${message}`);
}

// 初期化
window.addEventListener('load', () => {
  console.log('アプリを初期化中...');
  initMap();
  getCurrentLocation();
});