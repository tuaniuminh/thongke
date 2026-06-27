// Fetch thời tiết Hà Nội từ Open-Meteo và hiển thị (luôn cập nhật mới mỗi lần mở app/vào trang chủ)
export async function updateHomeWeather() {
    try {
        const response = await fetch('https://api.open-meteo.com/v1/forecast?latitude=21.0285&longitude=105.8542&current=temperature_2m,weather_code');
        if (response.ok) {
            const data = await response.json();
            if (data && data.current) {
                const weatherData = {
                    temp: Math.round(data.current.temperature_2m),
                    code: data.current.weather_code
                };
                renderWeatherWidget(weatherData);
            }
        }
    } catch (error) {
        console.error('Lỗi khi tải thời tiết Hà Nội:', error);
        renderWeatherWidget(null);
    }
}

function renderWeatherWidget(weatherData) {
    const weatherContainer = document.getElementById('weatherRow');
    if (!weatherContainer) return;
    
    let tempText = '--°C';
    let iconName = 'cloud-sun';
    let descText = 'Thời tiết Hà Nội';
    let shortDesc = 'Ngoại tuyến';
    
    if (weatherData) {
        tempText = `${weatherData.temp}°C`;
        const code = weatherData.code;
        
        if (code === 0) {
            iconName = 'sun';
            descText = 'Hà Nội: Trời quang';
            shortDesc = 'Trời quang';
        } else if (code === 1) {
            iconName = 'cloud-sun';
            descText = 'Hà Nội: Ít mây';
            shortDesc = 'Ít mây';
        } else if (code === 2) {
            iconName = 'cloud-sun';
            descText = 'Hà Nội: Mây rải rác';
            shortDesc = 'Mây rải rác';
        } else if (code === 3) {
            iconName = 'cloud-sun';
            descText = 'Hà Nội: Nhiều mây';
            shortDesc = 'Nhiều mây';
        } else if (code === 45 || code === 48) {
            iconName = 'cloud-fog';
            descText = 'Hà Nội: Sương mù';
            shortDesc = 'Sương mù';
        } else if (code >= 51 && code <= 55) {
            iconName = 'cloud-drizzle';
            descText = 'Hà Nội: Mưa phùn';
            shortDesc = 'Mưa phùn';
        } else if (code >= 61 && code <= 65) {
            iconName = 'cloud-rain';
            descText = 'Hà Nội: Mưa';
            shortDesc = 'Mưa';
        } else if (code >= 80 && code <= 82) {
            iconName = 'cloud-rain';
            descText = 'Hà Nội: Mưa rào';
            shortDesc = 'Mưa rào';
        } else if (code >= 95 && code <= 99) {
            iconName = 'cloud-lightning';
            descText = 'Hà Nội: Dông bão';
            shortDesc = 'Dông bão';
        } else {
            iconName = 'cloud';
            descText = 'Hà Nội: Nhiều mây';
            shortDesc = 'Nhiều mây';
        }
    }
    
    weatherContainer.innerHTML = `
        <i data-lucide="${iconName}"></i>
        <span class="weather-desktop" title="${descText}">${tempText} tại Hà Nội</span>
        <span class="weather-mobile" title="${descText}" style="display: none;">${tempText} - ${shortDesc}</span>
    `;
    
    if (typeof lucide !== 'undefined') {
        lucide.createIcons();
    }
}
