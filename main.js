// ...existing code...
const BASE_GEOCODING = 'https://geocoding-api.open-meteo.com/v1/search'
const BASE_FORECAST = 'https://api.open-meteo.com/v1/forecast'

const sectionEl = document.querySelector('section')
const navList = document.querySelector('nav > ul')
const navButtons = document.querySelectorAll('nav > ul > li > button')

markupHomePage()

let favorites = JSON.parse(localStorage.getItem('cities')) || []

let container;
let input;
let btn ;
let moreInfoContainer;

getElementsOnHomePage();

navList.addEventListener('click', onNavClick)

function onActionClick ({target}) {
    const {name} = target.dataset
    if (!name) return;
    if (favorites.some(el => el === name)) {
        favorites = favorites.filter(el => name !== el)
        target.textContent = '♡';
    } else {
        favorites.push(name)
        target.innerHTML = '✖';
    }
    localStorage.setItem('cities', JSON.stringify(favorites))
}

async function onGetWeatherClick() {
    try {
        const cityName = input.value.trim()
        if (!cityName) return;

        const geo = await geocodeCity(cityName)
        if (!geo) throw new Error('City not found')

        const weatherData = await getWeather(geo.latitude, geo.longitude)

        container.innerHTML = createCityMarkup({
            displayName: geo.name || cityName,
            lat: geo.latitude,
            lon: geo.longitude,
            current: weatherData.current_weather,
            daily: weatherData.daily,
            timezone: weatherData.timezone
        })

        const moreInfoBtn = container.querySelector('.more-info');
        const actionBtn = container.querySelector('.action-btn')

        actionBtn.addEventListener('click', onActionClick)

        moreInfoContainer = document.querySelector('.more-info-container')
        moreInfoBtn.addEventListener('click', onSevenDaysClick)

        input.value = ''
    } catch (error) {
        container.innerHTML = '<p class="error">We couldn\'t find weather for this city</p>'
    }
}

async function onSevenDaysClick (e) {
    const target = e.target
    const name = target.dataset.name
    const lat = target.dataset.lat
    const lon = target.dataset.lon
    if (!name || !lat || !lon) return alert("Enter a city");

    try {
        const res = await fetch(`${BASE_FORECAST}?latitude=${lat}&longitude=${lon}&daily=temperature_2m_max,temperature_2m_min,weathercode&timezone=auto&forecast_days=7`)
        if (!res.ok) throw new Error("Forecast not found");
        const data = await res.json();

        const days = data.daily.time.map((d, i) => ({
            date: d,
            max: Math.round(data.daily.temperature_2m_max[i]),
            min: Math.round(data.daily.temperature_2m_min[i]),
            weathercode: data.daily.weathercode[i]
        }))

        moreInfoContainer.innerHTML = `
            <h2 class='week-list-subtitle'>Weather forecast for 7 days:</h2>
            <div class="forecast-container">
                ${days.map(day => {
                    const dateLabel = new Date(day.date).toLocaleDateString("en-GB", {
                        weekday: "short",
                        day: "numeric",
                        month: "short",
                    })
                    const icon = weatherCodeToEmoji(day.weathercode)
                    return `
                    <div class="day-card">
                      <p>${dateLabel}</p>
                      <p style="font-size:36px">${icon}</p>
                      <p>${day.max}°C / ${day.min}°C</p>
                      <p>${weatherCodeToDescription(day.weathercode)}</p>
                    </div>`
                }).join('')}
            </div>
        `
        const moreInfoBtn = container.querySelector('.more-info');
        if (moreInfoBtn) moreInfoBtn.remove()
    } catch (err) {
        alert(err.message);
    }
}

function markupHomePage () {
sectionEl.innerHTML = `
<div class="container">
        <div class='form-container'>
          <input type="text" autocomplete=off id="city-input" placeholder="Enter city name" />
          <button id="city-input-btn">🔎</button>
        </div>
        <div class="result"></div>
      </div>
`
}

function createFavoritesMarkup  (arr) {
    if (arr.length > 0) {
      return '<div class="container">' + '<ul class="favorites-list">' +  arr.map(el => {
        const nameKey = el.displayName.replace(/\s+/g,'-')
        const currentTime = getCurrentDate(el.current.time)
        return `<li class="${nameKey}">
            <div class='title-info'>
              <p style="font-size:28px;margin:0">${weatherCodeToEmoji(el.current.weathercode)}</p>
              <h2 style="margin-left:8px">${el.displayName}</h2> 
            </div>
            <p>${Math.round(el.current.temperature)} &deg;C</p>
            <p>${currentTime[1]}</p>
            <button class='delete-btn' data-name='${el.displayName}'>✖</button>
        </li>`
      }).join('') + '</ul>' + '</div>'
    } else {
        return '<div class="container"><h2 class="empty-list">You havent any favorites cities</h2></div>'
    }
}

function onNavClick({target}) {
    if (target.nodeName !== 'BUTTON' || target.classList.contains('active')) return;
   
    changeActive(target)

    const {id} = target.dataset
    if (id === 'favorites' ) {
        addFavoritesMarkup()
    } else {
        markupHomePage()
        getElementsOnHomePage()
    }
}

function onDeleteClick(e) {
    const {name} = e.target.dataset;

    favorites = favorites.filter(el => el !== name)
    localStorage.setItem('cities', JSON.stringify(favorites))

    if(favorites.length === 0) {
        sectionEl.innerHTML =  '<div class="container"><h2>You havent any favorites cities</h2></div>'
    } else {
        const elForDeleting = document.querySelector(`.${name.replace(/\s+/g,'-')}`)
        if (elForDeleting) elForDeleting.remove();
    }
}

async function addFavoritesMarkup () {
    sectionEl.innerHTML = '<div class="container"><p class="loading"><span class="loader"></span></p></div>'
    try {
        const data = await getFavoritesData();
        const markup = createFavoritesMarkup(data)
        sectionEl.innerHTML = markup
        const deleteBtnsList = document.querySelectorAll('.delete-btn');
        deleteBtnsList.forEach(el => {
            el.addEventListener('click', onDeleteClick)
        })
    } catch (error) {
        sectionEl.innerHTML = '<p>Oops.... Something went wrong</p>'
        console.log('error :>> ', error);
    } 
}

function changeActive (target) {
 navButtons.forEach(btn => btn === target ? btn.classList.add('active') : btn.classList.remove('active'))
}

async function getFavoritesData () {
    const promises = favorites.map(async (cityName) => {
        try {
            const geo = await geocodeCity(cityName)
            if (!geo) return null
            const weather = await getWeather(geo.latitude, geo.longitude)
            return {
                displayName: geo.name || cityName,
                lat: geo.latitude,
                lon: geo.longitude,
                current: weather.current_weather,
                daily: weather.daily,
                timezone: weather.timezone
            }
        } catch (err) {
            return null
        }
    })

    const results = await Promise.all(promises)
    return results.filter(Boolean)
}

function getElementsOnHomePage () {
 container = document.querySelector(".result");
 input = document.getElementById("city-input");
 btn = document.getElementById("city-input-btn");

btn.addEventListener("click", onGetWeatherClick);
}

async function geocodeCity(name) {
    const res = await fetch(`${BASE_GEOCODING}?name=${encodeURIComponent(name)}&count=1`)
    if (!res.ok) return null
    const data = await res.json()
    if (!data.results || data.results.length === 0) return null
    // choose first match
    const r = data.results[0]
    return { latitude: r.latitude, longitude: r.longitude, name: r.name + (r.country ? ', ' + r.country : '') }
}

async function getWeather(lat, lon) {
    const res = await fetch(`${BASE_FORECAST}?latitude=${lat}&longitude=${lon}&current_weather=true&daily=temperature_2m_max,temperature_2m_min,weathercode&timezone=auto&forecast_days=7`)
    if (!res.ok) throw new Error('Weather fetch failed')
    return res.json()
}

function createCityMarkup (data) {
    const isFavorite = favorites.some(el => el === data.displayName)
    const current = data.current
    const currentTime = getCurrentDate(current.time)

  return `
  <div class='city-card'>
  <h1 class='city-title'>${data.displayName}</h1>
    <div class='city-info'>
        <div class='temp-info'>
         <p style="font-size:36px;margin:0">${weatherCodeToEmoji(current.weathercode)}</p>
        <p>${Math.round(current.temperature)} &deg;C</p>
        </div>
        <div class='city-info-btn-list'>
        <button class='action-btn' data-name="${data.displayName}">${isFavorite ? '✖' : '♡'}</button>
        <button class='more-info' data-name="${data.displayName}" data-lat="${data.lat}" data-lon="${data.lon}">More info</button>
        </div>
        </div>
        <div class='time-container'>
            <p>${currentTime[1]}</p>
            <p>${currentTime[0]}</p>
        </div>
        <div class='more-info-container'></div>
        </div>`
}

function getCurrentDate (isoString) {
    const localDate = new Date(isoString)
    const time = localDate.toLocaleTimeString("en-GB", {
      hour: "2-digit",
      minute: "2-digit",
    });
    
    const date = localDate.toLocaleDateString('en-GB', {
                day: 'numeric',
                month: 'long',
                year: 'numeric'
              });
    
    return [date, time]
}

function weatherCodeToEmoji(code) {
    // simplified mapping based on Open-Meteo weather codes
    if (code === 0) return '☀️'
    if (code === 1 || code === 2) return '🌤️'
    if (code === 3) return '☁️'
    if (code === 45 || code === 48) return '🌫️'
    if (code >= 51 && code <= 67) return '🌧️'
    if (code >= 71 && code <= 77) return '❄️'
    if (code >= 80 && code <= 82) return '🌦️'
    if (code >= 95 && code <= 99) return '⛈️'
    return '🌈'
}

function weatherCodeToDescription(code) {
    const map = {
        0: 'Clear sky',
        1: 'Mainly clear',
        2: 'Partly cloudy',
        3: 'Overcast',
        45: 'Fog',
        48: 'Depositing rime fog',
        51: 'Light drizzle',
        53: 'Moderate drizzle',
        55: 'Dense drizzle',
        61: 'Slight rain',
        63: 'Moderate rain',
        65: 'Heavy rain',
        71: 'Light snow',
        73: 'Moderate snow',
        75: 'Heavy snow',
        80: 'Slight rain showers',
        81: 'Moderate rain showers',
        82: 'Violent rain showers',
        95: 'Thunderstorm',
        96: 'Thunderstorm with slight hail',
        99: 'Thunderstorm with heavy hail'
    }
    return map[code] || 'Weather'
}