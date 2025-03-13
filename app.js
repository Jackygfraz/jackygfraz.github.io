const key = "AIzaSyDqIDKm8thRmlpdB9R4GK1AmABlXcBeiEc"
// Your Weather API URL (this should be dynamically adjusted as needed)
let strLocationURL = "";
let objGoogleAPIReturn = "";

document.querySelector("#btnGetLocation").addEventListener("click", function () {
    event.preventDefault()
    fetchLocation()
    getWeather();

})

// base URL for the weather API
let strURL = "https://api.open-meteo.com/v1/forecast?latitude=36.1628&longitude=-85.5016&current=temperature_2m,relative_humidity_2m,apparent_temperature,is_day,precipitation,rain,showers,snowfall,weather_code,wind_speed_10m&temperature_unit=fahrenheit&wind_speed_unit=mph&precipitation_unit=inch&timezone=America%2FChicago";

// Function to dynamically update the weather URL based on coordinates
function updateWeatherURL(lat, lon) {
    strURL = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current=temperature_2m,relative_humidity_2m,apparent_temperature,is_day,precipitation,rain,showers,snowfall,weather_code,wind_speed_10m&temperature_unit=fahrenheit&wind_speed_unit=mph&precipitation_unit=inch&timezone=America%2FChicago`;
    console.log("Updated Weather API URL:", strURL);
}

// Function to fetch location data and update URL
async function fetchLocation() {
    const lastTimestamp = sessionStorage.getItem("lastTimestamp");
    const lastAddress = sessionStorage.getItem("lastAddress");
    const lastCoords = sessionStorage.getItem("lastCoords");
    const currentTime = Date.now();

    // Check if data exists and it's within 1 minute, if so then do not fetch new api data
    if (lastAddress && lastCoords && (currentTime - lastTimestamp < 60000)) {
        // Use stored data
        document.querySelector("#hdrAddress").innerHTML = lastAddress;
        const storedCoords = JSON.parse(lastCoords);
        document.querySelector("#demo").innerHTML = `Latitude: ${storedCoords.lat}<br>Longitude: ${storedCoords.lon}`;
        hideButton();
        return;
    }

    // Get new location if geolocation is supported
    if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(async (position) => {
           
            // Store current coordinates and timestamp in session storage
            const objCoordinates = {lat: position.coords.latitude,lon: position.coords.longitude};
            sessionStorage.setItem("lastTimestamp", currentTime);
            sessionStorage.setItem("lastCoords", JSON.stringify(objCoordinates));

            // Display coordinates
            document.querySelector("#demo").innerHTML = `Latitude: ${position.coords.latitude}<br>Longitude: ${position.coords.longitude}`;

            // Fetch address using Google API if 5 minutes or more have passed
            if (currentTime - lastTimestamp >= 300000 || !lastAddress) {
                try {
                    const strLocationURL = `https://maps.googleapis.com/maps/api/geocode/json?latlng=${position.coords.latitude},${position.coords.longitude}&key=${key}`;
                    const objResponse = await fetch(strLocationURL);
                    const responseText = await objResponse.text(); // Get raw response for debugging

                    try {
                        const objData = JSON.parse(responseText);
                        const address = objData.results?.[0]?.formatted_address || "Address not found";
                        sessionStorage.setItem("lastAddress", address);
                        document.querySelector("#hdrAddress").innerHTML = address;
                    } catch (jsonError) {
                        console.error("Error parsing JSON:", jsonError);
                        console.error("Received response:", responseText);
                        document.querySelector("#hdrAddress").innerHTML = "Error retrieving address.";
                    }
                } catch (error) {
                    console.error("Error fetching data:", error);
                    document.querySelector("#hdrAddress").innerHTML = "Error retrieving address.";
                }
            }

            // Update the weather URL based on current position
            updateWeatherURL(position.coords.latitude, position.coords.longitude);
            hideButton();
        }, (error) => {
            console.log("Geolocation error:", error);
            document.querySelector("#demo").innerHTML = "Geolocation error: " + error.message;

            // Use default values if geolocation fails
            updateWeatherURL(36.1628, -85.5016);  // Default values
        });
    } else {
        console.log("Geolocation is not supported by this browser.");
        document.querySelector("#demo").innerHTML = "Geolocation is not supported by this browser.";

        // Use default values if geolocation is not supported
        updateWeatherURL(36.1628, -85.5016);  // Default values
    }
}

// Function to hide the button
function hideButton() {
    const button = document.querySelector("#btnGetLocation");
    if (button) {
        button.style.display = "none"; // Hide the button
    }
    document.querySelector("#artSectionLocation").style.display = ""
    document.querySelector("#artSectionDetails").style.display = ""
    document.querySelector("#artSectionConditions").style.display = ""


}


//********************************************************************************
async function getWeather() {
    try {
        const objResponse = await fetch(strURL);

        if (!objResponse.ok) {
            throw new Error(`HTTP error status: ${objResponse.status}`);
        }

        const objData = await objResponse.json();

        // Display Temperature
        document.querySelector("#hdrTemp").innerHTML += objData.current.temperature_2m + "°F";
        document.querySelector("#hdrTemp").ariaLabel = "Current Temperature of " + objData.current.temperature_2m + " degrees Fahrenheit.";

        // Display Humidity
        document.querySelector("#hdrHumidity").innerHTML = "Humidity: " + objData.current.relative_humidity_2m + '%';
        document.querySelector("#hdrHumidity").ariaLabel = "Humidity is about " + objData.current.relative_humidity_2m + " percent.";

        // Display Wind Speed
        document.querySelector("#hdrWindSpeed").innerHTML = "Wind Speed: " + objData.current.wind_speed_10m + " mph";
        document.querySelector("#hdrWindSpeed").ariaLabel = "Wind Speed of " + objData.current.wind_speed_10m + " miles per hour.";

        // Wind speed indicator
        if (objData.current.wind_speed_10m <= 7) {
            document.querySelector("#imgCurrentWind").className += " bi bi-sun"
        } else if (objData.current.wind_speed_10m > 7 && objData.current.wind_speed_10m < 30) {
            document.querySelector("#imgCurrentWind").className += " bi bi-cloud-haze2"
        } else if (objData.current.wind_speed_10m >= 30) {
            document.querySelector("#imgCurrentWind").className += " bi bi-wind"
        } else {
            document.querySelector("#imgCurrentWind").className += " bi bi-cloud"
        }

        // Display type of precipitation
        let strRainType = objData.current.precipitation;
        if (objData.current.precipitation <= 0.5) {
            strRainType = 'Clear';
        } else if (objData.current.rain > 0.5) {
            strRainType = 'Rain';
        } else if (objData.current.snowfall > 0) {
            strRainType = "Snow";
        } else if (objData.current.showers > 0) {
            strRainType = "Light Rain";
        } else {
            strRainType = "Precipitation";
        }
        document.querySelector("#hdrType").innerHTML += strRainType;

        // Weather icon update based on weather code
        let intWeatherCode = objData.current.weather_code;
        let imgCurrentWeather = document.querySelector("#imgCurrentWeather");

        if (intWeatherCode <= 0) {
            imgCurrentWeather.className = "card-img-top bi bi-sun-fill fs-0";
        } else if (intWeatherCode < 20) {
            imgCurrentWeather.className = "card-img-top bi bi-cloud fs-0";
        } else if (intWeatherCode < 29) {
            imgCurrentWeather.className = "card-img-top bi bi-cloud-fill fs-0";
        } else if (intWeatherCode < 50 || intWeatherCode >= 90) {
            imgCurrentWeather.className = "card-img-top bi bi-cloud-lightning-rain-fill";
        } else if (intWeatherCode < 70) {
            imgCurrentWeather.className = "card-img-top bi bi-cloud-drizzle-fill";
        } else if (intWeatherCode < 80) {
            imgCurrentWeather.className = "card-img-top bi bi-cloud-fill";
        } else {
            imgCurrentWeather.className = "card-img-top bi bi-cloud-fill fs-0";
        }

        return objData;
    } catch (objError) {
        console.error('Error fetching data:', objError);
    }
}
