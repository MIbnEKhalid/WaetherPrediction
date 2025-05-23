import { engine } from 'express-handlebars';
import express from 'express';
import axios from 'axios';
import { stringify } from 'csv-stringify/sync';
import fs from 'fs';

const app = express();
const PORT = 3000;

// Middleware to parse JSON requests
app.engine('handlebars', engine({
    helpers: {
        formatDate: (date) => new Date(date).toLocaleDateString(),
        json: (context) => JSON.stringify(context),
        formatNumber: (number, decimals) => {
            if (typeof number !== 'number') return number;
            return number.toFixed(decimals);
        },
        eq: function (a, b) {
            return a === b;
        },
    }
})); app.set('view engine', 'handlebars');
app.set('views', './views');

// Middleware
app.use(express.json());
app.use(express.static('public')); // for serving static files like CSS, JS



app.get('/weather', async (req, res) => {
    try {
        const today = new Date();
        const endDateObj = new Date(today);
        endDateObj.setDate(endDateObj.getDate() - 1);

        const startDateObj = new Date(today);
        startDateObj.setFullYear(startDateObj.getFullYear() - 1); // Default to 1 year data

        const formatDate = (date) => date.toISOString().slice(0, 10);

        const query = {
            start_date: formatDate(startDateObj),
            end_date: formatDate(endDateObj),
            view: 'monthly' // default view
        };

        const { start_date, end_date, view } = { ...query, ...req.query };
        const weatherData = await fetchWeatherData(start_date, end_date);

        // Process data based on view type
        const processedData = processDataForView(weatherData.weatherData, view);

        // Prepare chart data
        const chartData = {
            labels: processedData.map(item => item.label),
            temperatureMax: processedData.map(item => item.temperature_max),
            temperatureMin: processedData.map(item => item.temperature_min),
            humidity: processedData.map(item => item.humidity),
            precipitation: processedData.map(item => item.precipitation),
            windSpeed: processedData.map(item => item.wind_speed),
            viewType: view
        };

        res.render('weather', {
            title: 'Islamabad Weather Data',
            metadata: weatherData.metadata,
            weatherData: processedData,
            chartData: chartData,
            currentView: view,
            startDate: start_date,
            endDate: end_date
        });

    } catch (error) {
        res.status(500).render('error', {
            message: 'Failed to fetch weather data',
            error: error.message
        });
    }
});

app.get('/api/weather/daterange', async (req, res) => {
    try {
        const today = new Date();
        const earliestDate = new Date();
        earliestDate.setFullYear(earliestDate.getFullYear() - 10); // 10 years back
        
        res.json({
            minDate: earliestDate.toISOString().split('T')[0],
            maxDate: today.toISOString().split('T')[0]
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Data processing helper
function processDataForView(data, view) {
    switch (view) {
        case 'daily':
            return data.map(day => ({
                label: day.date,
                ...day
            }));

        case 'weekly':
            const weeklyData = [];
            for (let i = 0; i < data.length; i += 7) {
                const weekSlice = data.slice(i, i + 7);
                weeklyData.push({
                    label: `Week ${Math.floor(i / 7) + 1} (${weekSlice[0].date} - ${weekSlice[weekSlice.length - 1].date})`,
                    temperature_max: average(weekSlice.map(d => d.temperature_max)),
                    temperature_min: average(weekSlice.map(d => d.temperature_min)),
                    humidity: average(weekSlice.map(d => d.humidity)),
                    pressure: average(weekSlice.map(d => d.pressure)),
                    precipitation: sum(weekSlice.map(d => d.precipitation)),
                    wind_speed: max(weekSlice.map(d => d.wind_speed))
                });
            }
            return weeklyData;

        case 'monthly':
            const monthlyData = [];
            const months = {};

            data.forEach(day => {
                const monthKey = day.date.substring(0, 7); // YYYY-MM
                if (!months[monthKey]) {
                    months[monthKey] = [];
                }
                months[monthKey].push(day);
            });

            for (const [month, days] of Object.entries(months)) {
                monthlyData.push({
                    label: new Date(`${month}-01`).toLocaleString('default', { month: 'long', year: 'numeric' }),
                    temperature_max: average(days.map(d => d.temperature_max)),
                    temperature_min: average(days.map(d => d.temperature_min)),
                    humidity: average(days.map(d => d.humidity)),
                    pressure: average(days.map(d => d.pressure)),
                    precipitation: sum(days.map(d => d.precipitation)),
                    wind_speed: max(days.map(d => d.wind_speed))
                });
            }
            return monthlyData;

        case 'yearly':
            const yearlyData = [];
            const years = {};

            data.forEach(day => {
                const yearKey = day.date.substring(0, 4); // YYYY
                if (!years[yearKey]) {
                    years[yearKey] = [];
                }
                years[yearKey].push(day);
            });

            for (const [year, days] of Object.entries(years)) {
                yearlyData.push({
                    label: year,
                    temperature_max: average(days.map(d => d.temperature_max)),
                    temperature_min: average(days.map(d => d.temperature_min)),
                    humidity: average(days.map(d => d.humidity)),
                    pressure: average(days.map(d => d.pressure)),
                    precipitation: sum(days.map(d => d.precipitation)),
                    wind_speed: max(days.map(d => d.wind_speed))
                });
            }
            return yearlyData;

        default:
            return data;
    }
}

// Math helpers
function average(arr) {
    return arr.reduce((a, b) => a + b, 0) / arr.length;
}

function sum(arr) {
    return arr.reduce((a, b) => a + b, 0);
}

function max(arr) {
    return Math.max(...arr);
}


/**
 * Route to get weather data in JSON format
 * GET /api/weather?start_date=YYYY-MM-DD&end_date=YYYY-MM-DD
 */
app.get('/api/weather', async (req, res) => {
    try {
        const today = new Date();
        const endDateObj = new Date(today);
        endDateObj.setDate(endDateObj.getDate() - 2);

        const startDateObj = new Date(today);
        startDateObj.setMonth(startDateObj.getMonth() - 2);

        const formatDate = (date) => date.toISOString().slice(0, 10);

        const query = {
            start_date: formatDate(startDateObj),
            end_date: formatDate(endDateObj)
        };
        const { start_date, end_date } = { ...query, ...req.query };
        console.log('Query parameters:', req.query);

        const weatherData = await fetchWeatherData(start_date, end_date);
        res.json(weatherData);
        console.log('Weather data fetched successfully:');
    } catch (error) {
        res.status(500).json({
            error: 'Failed to fetch weather data',
            details: error.message
        });
    }
});

/**
 * Route to download weather data in CSV or JSON format
 * GET /api/weather/download?start_date=YYYY-MM-DD&end_date=YYYY-MM-DD&format=csv|json
 */

app.get('/weather/download', async (req, res) => {
    try {
        const today = new Date();
        const endDateObj = new Date(today);
        endDateObj.setDate(endDateObj.getDate() - 2);

        const startDateObj = new Date(today);
        startDateObj.setMonth(startDateObj.getMonth() - 2);

        const formatDate = (date) => date.toISOString().slice(0, 10);

        const query = {
            start_date: formatDate(startDateObj),
            end_date: formatDate(endDateObj)
        };
        const { start_date, end_date, view } = { ...query, ...req.query };
        console.log('Query parameters:', req.query);

        const weatherData = await fetchWeatherData(start_date, end_date);

        // Process data based on view type (same as the display route)
        const processedData = processDataForView(weatherData.weatherData, view);

        // Convert to CSV format
        const csvData = convertFilteredDataToCSV(processedData, view);

        // Set headers for download
        res.setHeader('Content-Type', 'text/csv');
        res.setHeader('Content-Disposition', `attachment; filename=weather_${view}_${start_date}_to_${end_date}.csv`);
        res.send(csvData);

    } catch (error) {
        res.status(500).render('error', {
            message: 'Failed to generate CSV download',
            error: error.message
        });
    }
});


// Helper function to convert filtered data to CSV
function convertFilteredDataToCSV(data, viewType) {
    const headers = [
        'Period',
        'Max Temperature (°C)',
        'Min Temperature (°C)',
        'Humidity (%)',
        'Pressure (hPa)',
        'Precipitation (mm)',
        'Wind Speed (km/h)'
    ];

    const rows = data.map(item => [
        item.label,
        item.temperature_max.toFixed(1),
        item.temperature_min.toFixed(1),
        item.humidity.toFixed(1),
        item.pressure ? item.pressure.toFixed(1) : 'N/A',
        item.precipitation.toFixed(1),
        item.wind_speed.toFixed(1)
    ]);

    return stringify([headers, ...rows]);
}

// Start the server
app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
});

// Helper functions
async function fetchWeatherData(start_date, end_date) {
    const url = "https://archive-api.open-meteo.com/v1/archive";
    const params = {
        latitude: 33.6995,
        longitude: 73.0363,
        start_date,
        end_date,
        daily: "temperature_2m_max,temperature_2m_min,precipitation_sum,relative_humidity_2m_mean,pressure_msl_mean,wind_speed_10m_max",
        timezone: "auto"
    };

    const response = await axios.get(url, { params });
    return formatWeatherData(response.data);
}

function formatWeatherData(rawData) {
    return {
        metadata: {
            location: "Islamabad, Pakistan",
            coordinates: {
                latitude: rawData.latitude,
                longitude: rawData.longitude
            },
            elevation: rawData.elevation,
            timezone: rawData.timezone,
            dateRange: {
                start: rawData.daily.time[0],
                end: rawData.daily.time[rawData.daily.time.length - 1]
            }
        },
        weatherData: rawData.daily.time.map((date, index) => ({
            date,
            temperature_max: rawData.daily.temperature_2m_max[index],
            temperature_min: rawData.daily.temperature_2m_min[index],
            humidity: rawData.daily.relative_humidity_2m_mean[index],
            pressure: rawData.daily.pressure_msl_mean[index],
            precipitation: rawData.daily.precipitation_sum[index],
            wind_speed: rawData.daily.wind_speed_10m_max[index]
        }))
    };
}
