const API_KEY = "a1aa435f89b1f58779c0e2ca8fbb02ad";
const BASE_URL = 'https://api.openweathermap.org/data/2.5/'

const sectionEl = document.querySelector('section')
const navList = document.querySelector('nav > ul')
const navButtons = document.querySelectorAll('nav > ul > li > button')

markupHomePage()

let favorites = JSON.parse(localStorage.getItem('cities')) || []


let container;
let input;
let btn ;

getElementsOnHomePage();

navList.addEventListener('click', onNavClick)

function onActionClick ({target}) {
    const {name} = target.dataset
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
          const result = await getDataByCityName(input.value.trim())
  container.innerHTML = createCityMarkup(result)
  const moreInfoBtn = container.querySelector('.more-info');
  const actionBtn = container.querySelector('.action-btn')

  actionBtn.addEventListener('click', onActionClick)

 

  moreInfoContainer = document.querySelector('.more-info-container')
  moreInfoBtn.addEventListener('click', onSevenDaysClick)

  input.value = ''
    } catch (error) {
        container.innerHTML = '<p class="error">We couldnt find weather at this city</p>'    }

}

async function onSevenDaysClick (e) {
 const city = e.target.dataset.name;
  if (!city) return alert("Enter a city");

  try {
    const res = await fetch(
      `${BASE_URL}forecast?q=${city}&units=metric&appid=${API_KEY}`
    );
    if (!res.ok) throw new Error("City not found");
    const data = await res.json();

    // Pick first entry of each day
    const dailyEntry = [];
    const dates = new Set();
    data.list.forEach((item) => {
      const date = new Date(item.dt * 1000).toLocaleDateString();
      if (!dates.has(date)) {
        dates.add(date);
        dailyEntry.push(item);
      }
    });

    moreInfoContainer.innerHTML = `
         <h2 class='week-list-subtitle'>Weather forecast for 7 days:</h2>
      <div class="forecast-container">
        ${dailyEntry
          .slice(0, 7)
          .map((day) => {
            const date = new Date(day.dt * 1000).toLocaleDateString("en-GB", {
              weekday: "short",
              day: "numeric",
              month: "short",
            });
            const icon = `https://openweathermap.org/img/wn/${day.weather[0].icon}@2x.png`;
            return `
            <div class="day-card">
              <p>${date}</p>
              <img src="${icon}" alt="${day.weather[0].description}">
              <p>${Math.round(day.main.temp)}°C</p>
              <p>${day.weather[0].description}</p>
              <p>💨 ${Math.round(day.wind.speed)} km/h</p>
            </div>
          `;
          })
          .join("")}
      </div>
    `;
    const moreInfoBtn = container.querySelector('.more-info');
    moreInfoBtn.remove()
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

    const currentTime = getCurrentDate(el.dt, el.timezone)


    
    return `<li class=${el.name}>
    <div class='title-info'>
    <img src='https://openweathermap.org/img/wn/${el.weather[0].icon}.png' alt=${el.name} />
    <h2>${el.name}</h2> 
    </div>
        <p>${el.main.temp} &degC</p>
        <p>${currentTime[1]}</p>
        <button class='delete-btn' data-name='${el.name}'>✖</button>
        </li>`}).join('') + '</ul>' + '</div>'

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
    const elForDeleting = document.querySelector(`.${name}`)
    elForDeleting.remove();
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
    const promises = [];
favorites.forEach((el) => {
    promises.push(fetch(`${BASE_URL}weather?q=${el}&appid=${API_KEY}&units=metric`).then(data => data.json()))
})

return (await Promise.allSettled(promises)).map(resp => resp.value)
}

function getElementsOnHomePage () {
 container = document.querySelector(".result");
 input = document.getElementById("city-input");
 btn = document.getElementById("city-input-btn");

btn.addEventListener("click", onGetWeatherClick);
}


async function getDataByCityName(name) {
    const response = await fetch(`${BASE_URL}weather?q=${name}&units=metric&appid=${API_KEY}`);
    if(!response.ok)  throw new Error("City not found")
    const result = await response.json()
    return result

}


function createCityMarkup (city) {
    const isFavorite = favorites.some(el => el === city.name)
    const currentTime = getCurrentDate(city.dt, city.timezone)







  return `
  <div class='city-card'>
  <h1 class='city-title'>${city.name}</h1>
    <div class='city-info'>
        <div class='temp-info'>
         <img src='https://openweathermap.org/img/wn/${city.weather[0].icon}.png' alt=${city.name} />
        <p>${city.main.temp} &degC</p>
        </div>
        <div class='city-info-btn-list'>
        <button class='action-btn' data-name=${city.name}>${isFavorite ? '✖' : '♡'}</button>
        <button class='more-info' data-name=${city.name} >More info</button>
        </div>
        </div>
        <div class='time-container'>
            <p>${currentTime[1]}</p>
            <p>${currentTime[0]}</p>

        </div>
        <div class='more-info-container'></div>
        </div>`
}


function getCurrentDate (dt, timezone) {
const utcDate = dt * 1000; 
const timezoneOffset = timezone * 1000; 
const localDate = new Date(utcDate + timezoneOffset - (1000 * 60 * 60 * 3));

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



