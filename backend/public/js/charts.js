document.addEventListener('DOMContentLoaded', function () {
    if (!window.chartData) return;

    // Common chart options
    // Common chart options
    const chartOptions = {
        responsive: true,
        maintainAspectRatio: false,
        interaction: {
            mode: 'index',
            intersect: false,
        },
        scales: {
            x: {
                grid: {
                    display: false,
                    color: 'rgba(255,255,255,0.1)'
                },
                ticks: {
                    autoSkip: true,
                    maxRotation: 45,
                    minRotation: 45,
                    padding: 10,
                    color: '#aaa'
                }
            },
            y: {
                grid: {
                    color: 'rgba(255,255,255,0.1)'
                },
                ticks: {
                    padding: 10,
                    color: '#aaa'
                }
            }
        },
        plugins: {
            legend: {
                position: 'top',
                labels: {
                    usePointStyle: true,
                    padding: 20,
                    color: '#e0e0e0'
                }
            },
            tooltip: {
                backgroundColor: 'rgba(30,30,30,0.9)',
                titleFont: {
                    size: 14,
                    weight: 'bold'
                },
                bodyFont: {
                    size: 12
                },
                padding: 12,
                usePointStyle: true,
                callbacks: {
                    label: function (context) {
                        return context.dataset.label + ': ' + context.parsed.y.toFixed(1);
                    }
                }
            }
        },
        elements: {
            line: {
                tension: 0.4,
                borderWidth: 2,
                fill: false
            },
            point: {
                radius: 3,
                hoverRadius: 6
            },
            bar: {
                borderRadius: 4
            }
        }
    };

    // Temperature Chart
    const tempCtx = document.getElementById('temperatureChart').getContext('2d');
    new Chart(tempCtx, {
        type: window.chartData.viewType === 'daily' ? 'line' : 'bar',
        data: {
            labels: window.chartData.labels,
            datasets: [
                {
                    label: 'Max Temp (°C)',
                    data: window.chartData.temperatureMax,
                    borderColor: 'rgba(231, 76, 60, 1)',
                    backgroundColor: 'rgba(231, 76, 60, 0.7)',
                    pointBackgroundColor: 'rgba(231, 76, 60, 1)'
                },
                {
                    label: 'Min Temp (°C)',
                    data: window.chartData.temperatureMin,
                    borderColor: 'rgba(52, 152, 219, 1)',
                    backgroundColor: 'rgba(52, 152, 219, 0.7)',
                    pointBackgroundColor: 'rgba(52, 152, 219, 1)'
                }
            ]
        },
        options: {
            ...chartOptions,
            plugins: {
                ...chartOptions.plugins,
                title: {
                    display: false
                }
            }
        }
    });

    // Precipitation Chart
    const precipCtx = document.getElementById('precipitationChart').getContext('2d');
    new Chart(precipCtx, {
        type: 'bar',
        data: {
            labels: window.chartData.labels,
            datasets: [
                {
                    label: 'Precipitation (mm)',
                    data: window.chartData.precipitation,
                    backgroundColor: 'rgba(46, 204, 113, 0.7)',
                    borderColor: 'rgba(46, 204, 113, 1)',
                    borderWidth: 1
                }
            ]
        },
        options: {
            ...chartOptions,
            plugins: {
                ...chartOptions.plugins,
                title: {
                    display: false
                }
            }
        }
    });

    // Humidity Chart
    const humidityCtx = document.getElementById('humidityChart').getContext('2d');
    new Chart(humidityCtx, {
        type: window.chartData.viewType === 'daily' ? 'line' : 'bar',
        data: {
            labels: window.chartData.labels,
            datasets: [
                {
                    label: 'Humidity (%)',
                    data: window.chartData.humidity,
                    borderColor: 'rgba(155, 89, 182, 1)',
                    backgroundColor: 'rgba(155, 89, 182, 0.7)',
                    pointBackgroundColor: 'rgba(155, 89, 182, 1)'
                }
            ]
        },
        options: {
            ...chartOptions,
            plugins: {
                ...chartOptions.plugins,
                title: {
                    display: false
                }
            }
        }
    });

    // Wind Speed Chart
    const windCtx = document.getElementById('windSpeedChart').getContext('2d');
    new Chart(windCtx, {
        type: window.chartData.viewType === 'daily' ? 'line' : 'bar',
        data: {
            labels: window.chartData.labels,
            datasets: [
                {
                    label: 'Wind Speed (km/h)',
                    data: window.chartData.windSpeed,
                    borderColor: 'rgba(241, 196, 15, 1)',
                    backgroundColor: 'rgba(241, 196, 15, 0.7)',
                    pointBackgroundColor: 'rgba(241, 196, 15, 1)'
                }
            ]
        },
        options: {
            ...chartOptions,
            plugins: {
                ...chartOptions.plugins,
                title: {
                    display: false
                }
            }
        }
    });

    // Hide loading overlay when charts are rendered
    document.getElementById('loading-overlay').style.display = 'none';
});