document.addEventListener('DOMContentLoaded', function() {
    if (!window.chartData) return;

    // Common chart options
    const chartOptions = {
        responsive: true,
        maintainAspectRatio: false,
        scales: {
            x: {
                ticks: {
                    autoSkip: true,
                    maxRotation: 45,
                    minRotation: 45
                }
            }
        },
        plugins: {
            tooltip: {
                callbacks: {
                    label: function(context) {
                        return context.dataset.label + ': ' + context.parsed.y.toFixed(1);
                    }
                }
            }
        }
    };

    // Temperature Chart
    new Chart(
        document.getElementById('temperatureChart'),
        {
            type: window.chartData.viewType === 'daily' ? 'line' : 'bar',
            data: {
                labels: window.chartData.labels,
                datasets: [
                    {
                        label: 'Max Temp (°C)',
                        data: window.chartData.temperatureMax,
                        borderColor: 'rgba(255, 99, 132, 1)',
                        backgroundColor: 'rgba(255, 99, 132, 0.7)',
                        tension: 0.1
                    },
                    {
                        label: 'Min Temp (°C)',
                        data: window.chartData.temperatureMin,
                        borderColor: 'rgba(54, 162, 235, 1)',
                        backgroundColor: 'rgba(54, 162, 235, 0.7)',
                        tension: 0.1
                    }
                ]
            },
            options: {
                ...chartOptions,
                plugins: {
                    ...chartOptions.plugins,
                    title: {
                        display: true,
                        text: 'Temperature Trends'
                    }
                }
            }
        }
    );

    // Precipitation Chart
    new Chart(
        document.getElementById('precipitationChart'),
        {
            type: 'bar',
            data: {
                labels: window.chartData.labels,
                datasets: [
                    {
                        label: 'Precipitation (mm)',
                        data: window.chartData.precipitation,
                        backgroundColor: 'rgba(75, 192, 192, 0.7)'
                    }
                ]
            },
            options: {
                ...chartOptions,
                plugins: {
                    ...chartOptions.plugins,
                    title: {
                        display: true,
                        text: 'Precipitation'
                    }
                }
            }
        }
    );

    // Humidity Chart
    new Chart(
        document.getElementById('humidityChart'),
        {
            type: window.chartData.viewType === 'daily' ? 'line' : 'bar',
            data: {
                labels: window.chartData.labels,
                datasets: [
                    {
                        label: 'Humidity (%)',
                        data: window.chartData.humidity,
                        borderColor: 'rgba(153, 102, 255, 1)',
                        backgroundColor: 'rgba(153, 102, 255, 0.7)',
                        tension: 0.1
                    }
                ]
            },
            options: {
                ...chartOptions,
                plugins: {
                    ...chartOptions.plugins,
                    title: {
                        display: true,
                        text: 'Humidity'
                    }
                }
            }
        }
    );

    // Wind Speed Chart
    new Chart(
        document.getElementById('windSpeedChart'),
        {
            type: window.chartData.viewType === 'daily' ? 'line' : 'bar',
            data: {
                labels: window.chartData.labels,
                datasets: [
                    {
                        label: 'Wind Speed (km/h)',
                        data: window.chartData.windSpeed,
                        borderColor: 'rgba(255, 159, 64, 1)',
                        backgroundColor: 'rgba(255, 159, 64, 0.7)',
                        tension: 0.1
                    }
                ]
            },
            options: {
                ...chartOptions,
                plugins: {
                    ...chartOptions.plugins,
                    title: {
                        display: true,
                        text: 'Wind Speed'
                    }
                }
            }
        }
    );
});