import { engine } from 'express-handlebars';
import express from 'express';
import Handlebars from 'handlebars';
import axios from 'axios';
import { stringify } from 'csv-stringify/sync';
import fs from 'fs';

const app = express();
const PORT = 3000;

// Handlebars engine setup
app.engine('handlebars', engine({
    helpers: {
        formatDate: (date) => new Date(date).toLocaleDateString(),
        json: (context) => JSON.stringify(context),
        formatNumber: (number, decimals) => {
            if (typeof number !== 'number') return number;
            return number.toFixed(decimals);
        },
        eq: (a, b) => a === b,
        max: (arr) => Math.max(...arr),
        min: (arr) => Math.min(...arr),
        sum: (arr) => arr.reduce((a, b) => a + b, 0),
        pluck: function (array, property) {
            return array.map(function (item) {
                return item[property];
            });
        },
        currentYear: () => new Date().getFullYear()
    }
}));
Handlebars.registerHelper('max', function (arr) {
    return Math.max(...arr);
});

Handlebars.registerHelper('min', function (arr) {
    return Math.min(...arr);
});

Handlebars.registerHelper('formatNumber', function (value, decimals) {
    return parseFloat(value).toFixed(decimals);
});
Handlebars.registerHelper('sum', function (arr) {
    return arr.reduce((a, b) => a + b, 0);
});
app.set('view engine', 'handlebars');
app.set('views', './views');

// Middleware
app.use(express.json());
app.use(express.static('public'));

// Date range calculation
const calculateDateRange = (offsetDays, offsetMonths, offsetYears) => {
    const today = new Date();
    const endDate = new Date(today);
    const startDate = new Date(today);

    if (offsetDays) endDate.setDate(endDate.getDate() + offsetDays);
    if (offsetMonths) startDate.setMonth(startDate.getMonth() + offsetMonths);
    if (offsetYears) startDate.setFullYear(startDate.getFullYear() + offsetYears);

    return { startDate, endDate };
};

const formatDate = (date) => date.toISOString().slice(0, 10);

// Query parsing middleware
const parseQueryWithDefaults = (defaultRange) => (req, res, next) => {
    const { startDate, endDate } = calculateDateRange(...defaultRange);
    req.query.start_date = req.query.start_date || formatDate(startDate);
    req.query.end_date = req.query.end_date || formatDate(endDate);
    next();
};

// Apply query parsing middleware
app.use('/api/weather', parseQueryWithDefaults([-2, -2, 0]));
app.use('/weather', parseQueryWithDefaults([-2, -2, 0]));
app.use('/weather/download', parseQueryWithDefaults([-2, -2, 0]));

// Weather page route
app.get(['/weather', '/'], async (req, res) => {
    try {
        const { start_date, end_date, view } = req.query;
        const weatherData = await fetchWeatherData(start_date, end_date);
        const processedData = processDataForView(weatherData.weatherData, view);

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
            chartData,
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

// Weather data API
app.get('/api/weather', async (req, res) => {
    try {
        const { start_date, end_date } = req.query;
        const weatherData = await fetchWeatherData(start_date, end_date);
        res.json(weatherData);
    } catch (error) {
        res.status(500).json({
            error: 'Failed to fetch weather data',
            details: error.message
        });
    }
});

// Download weather data as CSV
app.get('/weather/download', async (req, res) => {
    try {
        const { start_date, end_date, view } = req.query;
        const weatherData = await fetchWeatherData(start_date, end_date);
        const processedData = processDataForView(weatherData.weatherData, view);
        const csvData = convertFilteredDataToCSV(processedData, view);

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

// Data processing helpers
function processDataForView(data, view) {
    switch (view) {
        case 'daily':
            return data.map(day => ({
                label: day.date,
                ...day
            }));
        case 'weekly':
            return getWeeklyData(data);
        case 'monthly':
            return getMonthlyData(data);
        case 'yearly':
            return getYearlyData(data);
        default:
            return data;
    }
}

function getWeeklyData(data) {
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
}

function getMonthlyData(data) {
    const monthlyData = [];
    const months = {};
    data.forEach(day => {
        const monthKey = day.date.substring(0, 7);
        if (!months[monthKey]) months[monthKey] = [];
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
}

function getYearlyData(data) {
    const yearlyData = [];
    const years = {};
    data.forEach(day => {
        const yearKey = day.date.substring(0, 4);
        if (!years[yearKey]) years[yearKey] = [];
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

// Convert data to CSV
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

// Fetch and format weather data
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

// Start server
app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
});
