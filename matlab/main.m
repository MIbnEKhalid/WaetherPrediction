%% Weather Prediction Project with Holdout Validation 
clc;
clear;
close all;

%% 1. Load and Prepare Data
data = readtable('data.csv', 'VariableNamingRule', 'preserve');

% Extract year from period for trend analysis
years = zeros(height(data), 1);
for i = 1:height(data)
    period = data.Period{i};
    year_str = regexp(period, '1980|1981|1982|\d{4}', 'match');
    years(i) = str2double(year_str{1});
end

% Add year as a feature
data.Year = years;

% Extract week number (assuming data is already in weekly format)
data.WeekNumber = (1:height(data))';

% Display first few rows
head(data)

%% 2. Visualize Historical Data
figure;
subplot(2,2,1);
plot(data.Year, data.MaxTemperature, 'r-');
title('Max Temperature Trend');
xlabel('Year'); ylabel('°C');

subplot(2,2,2);
plot(data.Year, data.MinTemperature, 'b-');
title('Min Temperature Trend');
xlabel('Year'); ylabel('°C');

subplot(2,2,3);
plot(data.Year, data.Humidity, 'g-');
title('Humidity Trend');
xlabel('Year'); ylabel('%');

subplot(2,2,4);
plot(data.Year, data.Precipitation, 'k-');
title('Precipitation Trend');
xlabel('Year'); ylabel('mm');

sgtitle('Historical Weather Data Trends');

%% 3. Prepare Data for Modeling with Holdout Validation
% Select features and target variables
features = {'Year', 'WeekNumber'}; % Only using temporal features initially
targets = {'MaxTemperature', 'MinTemperature', 'Humidity', 'Pressure', 'Precipitation', 'WindSpeed'};

% Keep as tables for proper indexing
X = data(:, features);
y = data(:, targets);

% Hold out the last week for final validation
X_train = X(1:end-1, :);
y_train = y(1:end-1, :);
X_last_week = X(end, :);
y_last_week_actual = table2array(y(end, :));

% Also create a standard validation set (80-20 split of remaining data)
rng(42); % For reproducibility
split_ratio = 0.8;
split_point = floor(split_ratio * height(X_train));

X_train_main = X_train(1:split_point, :);
y_train_main = y_train(1:split_point, :);
X_val = X_train(split_point+1:end, :);
y_val = y_train(split_point+1:end, :);

% Convert to arrays for modeling
X_train_main_array = table2array(X_train_main);
y_train_main_array = table2array(y_train_main);
X_val_array = table2array(X_val);
y_val_array = table2array(y_val);

%% 4. Train Multiple Linear Regression Models
num_targets = size(y_train_main_array, 2);
models = cell(num_targets, 1);
predictions_val = zeros(size(y_val_array));
predictions_train = zeros(size(y_train_main_array));

for i = 1:num_targets
    % Train model on main training set
    models{i} = fitlm(X_train_main_array, y_train_main_array(:, i));
    
    % Make predictions on validation set
    predictions_val(:, i) = predict(models{i}, X_val_array);
    predictions_train(:, i) = predict(models{i}, X_train_main_array);
    
    % Display model summary
    fprintf('\nModel for %s:\n', targets{i});
    disp(models{i});
end

%% 5. Evaluate Model Performance on Validation Set
% Calculate RMSE for each target
rmse_val = zeros(num_targets, 1);
rmse_train = zeros(num_targets, 1);

for i = 1:num_targets
    rmse_val(i) = sqrt(mean((y_val_array(:, i) - predictions_val(:, i)).^2));
    rmse_train(i) = sqrt(mean((y_train_main_array(:, i) - predictions_train(:, i)).^2));
    
    fprintf('\n%s - Training RMSE: %.2f, Validation RMSE: %.2f\n', ...
            targets{i}, rmse_train(i), rmse_val(i));
end

%% 6. Retrain Models on All Available Data (except last week)
% Convert all training data to arrays
X_train_array = table2array(X_train);
y_train_array = table2array(y_train);

% Now train final models on all data except the held-out last week
final_models = cell(num_targets, 1);
for i = 1:num_targets
    final_models{i} = fitlm(X_train_array, y_train_array(:, i));
end

%% 7. Predict the Held-Out Last Week
% Prepare input features for last week prediction
X_last_week_input = X_train(end, :); % Features from previous week (as table)
X_last_week_input.WeekNumber = X_last_week_input.WeekNumber + 1; % Increment week number

% Convert to array for prediction
X_last_week_input_array = table2array(X_last_week_input);

% Predict last week's weather
last_week_pred = zeros(1, num_targets);
for i = 1:num_targets
    last_week_pred(i) = predict(final_models{i}, X_last_week_input_array);
end

%% 8. Compare Predictions with Actual Values
% Create comparison table
comparison_table = table();
comparison_table.Metric = targets';
comparison_table.Actual = y_last_week_actual';
comparison_table.Predicted = last_week_pred';
comparison_table.Error = comparison_table.Actual - comparison_table.Predicted;
comparison_table.PercentageError = abs(comparison_table.Error ./ comparison_table.Actual) * 100;

% Display comparison
disp('Comparison of Predictions vs Actual Values for Last Week:');
disp(comparison_table);

% Calculate overall RMSE for last week prediction
last_week_rmse = sqrt(mean((y_last_week_actual - last_week_pred).^2));
fprintf('\nOverall RMSE for last week prediction: %.2f\n', last_week_rmse);

%% 9. Visualize Last Week Prediction
figure;
for i = 1:num_targets
    subplot(3, 2, i);
    bar([y_last_week_actual(i), last_week_pred(i)]);
    set(gca, 'XTickLabel', {'Actual', 'Predicted'});
    title(targets{i});
    ylabel(GetYLabel(targets{i}));
    
    % Add error text
    error_val = y_last_week_actual(i) - last_week_pred(i);
    text(1:2, [y_last_week_actual(i), last_week_pred(i)], ...
        {sprintf('%.2f', y_last_week_actual(i)), sprintf('%.2f\n(Error: %.2f)', ...
        last_week_pred(i), error_val)}, ...
        'VerticalAlignment', 'bottom', 'HorizontalAlignment', 'center');
end
sgtitle('Actual vs Predicted Values for Held-Out Last Week');

%% 10. Now Predict Next Week (Future Prediction)
% Prepare input features for next week prediction
next_week_input = X_last_week; % Features from last actual week (as table)
next_week_input.WeekNumber = next_week_input.WeekNumber + 1; % Increment week number
if mod(next_week_input.WeekNumber, 52) == 0    % Simple year increment logic
    next_week_input.Year = next_week_input.Year + 1;
end

% Convert to array for prediction
next_week_input_array = table2array(next_week_input);

% Predict next week's weather
next_week_pred = zeros(1, num_targets);
for i = 1:num_targets
    next_week_pred(i) = predict(final_models{i}, next_week_input_array);
end

% Display predictions
fprintf('\nWeather Predictions for Next Week:\n');
for i = 1:num_targets
    fprintf('%s: %.2f %s\n', targets{i}, next_week_pred(i), GetUnits(targets{i}));
end

%% 11. Save Models for Future Use
save('weather_prediction_models.mat', 'final_models', 'features', 'targets');

%% Helper Functions
function ylabel_text = GetYLabel(target)
    switch target
        case {'MaxTemperature', 'MinTemperature'}
            ylabel_text = '°C';
        case 'Humidity'
            ylabel_text = '%';
        case 'Pressure'
            ylabel_text = 'hPa';
        case 'Precipitation'
            ylabel_text = 'mm';
        case 'WindSpeed'
            ylabel_text = 'km/h';
        otherwise
            ylabel_text = '';
    end
end

function units = GetUnits(target)
    switch target
        case {'MaxTemperature', 'MinTemperature'}
            units = '°C';
        case 'Humidity'
            units = '%';
        case 'Pressure'
            units = 'hPa';
        case 'Precipitation'
            units = 'mm';
        case 'WindSpeed'
            units = 'km/h';
        otherwise
            units = '';
    end
end