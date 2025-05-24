# WaetherPrediction

## Overview

**WaetherPrediction** is a machine learning project focused on forecasting weather conditions using historical data. It incorporates data preprocessing, feature engineering, and multiple predictive models to estimate temperature, precipitation, and other weather metrics.

## Features

- Automated data collection and cleaning
- Exploratory data analysis and visualization
- Model training, evaluation, and comparison
- Prediction visualization and export

## Installation

1. Clone the repository:
    ```bash
    git clone https://github.com/yourusername/WaetherPrediction.git
    ```

## Usage

The project consists of two main components: a `Node.js` web application for data extraction and cleaning, and a `MATLAB` module for model training.

### Node.js Web Application

1. Install dependencies:
    ```bash
    npm install
    ```
2. Start the application:
    ```bash
    npm start
    ```

Available routes:
- `/` or `/weather`: Access the web interface to download data.
- `/api/weather`: Get weather data as a JSON response (requires query parameters).
- `/weather/download`: Download cleaned data as a CSV file.

### MATLAB Module

Use the MATLAB scripts provided in the repository to train and evaluate predictive models on the cleaned data.