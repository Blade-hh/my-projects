const express = require('express');
const axios = require('axios');
const { Pool } = require('pg');
const helmet = require('helmet');

// Initialize Express
const app = express();

// Apply helmet middleware for general security
app.use(helmet());

// Configure Content Security Policy (CSP) with helmet
app.use(helmet.contentSecurityPolicy({
    directives: {
        defaultSrc: ["'self'"],
        connectSrc: ["'self'", 'http://localhost:3000'],
        scriptSrc: ["'self'"],
        styleSrc: ["'self'"],
    }
}));

app.use(express.static('public'));

// Set up PostgreSQL connection
const pool = new Pool({
    user: 'postgres', // Replace with your PostgreSQL username
    host: 'localhost', // Replace with your PostgreSQL host if different
    database: 'postgres', // Replace with your PostgreSQL database name
    password: 'Blade', // Replace with your PostgreSQL password
    port: 5432, // Default PostgreSQL port
});

// Check database connection
pool.connect((err, client, release) => {
    if (err) {
        console.error('Error acquiring PostgreSQL client:', err.stack);
        return;
    }
    console.log('Database connected successfully');
    release(); // Release the client back to the pool
});

app.get('/', (req, res) => {
    res.send('Root route');
});

// Route to fetch data from WazirX API, insert it into PostgreSQL, and return a message
app.get('/fetch-data', async (req, res) => {
    try {
        // Fetch data from WazirX API
        const response = await axios.get('https://api.wazirx.com/api/v2/tickers');
        const apiData = response.data;

        console.log('Data fetched from API:', Object.keys(apiData)); // Log the keys of API response

        if (!apiData || Object.keys(apiData).length === 0) {
            console.error('Empty data received from API');
            return res.status(500).send('No data received from the API');
        }

        // Insert the fetched data into PostgreSQL
        const queryText = `
            INSERT INTO tickers (name, last, buy, sell, volume, base_unit)
            VALUES ($1, $2, $3, $4, $5, $6)
            ON CONFLICT (name) DO UPDATE
            SET last = $2, buy = $3, sell = $4, volume = $5, base_unit = $6;
        `;

        // Loop through the API data and insert into the database
        for (const [key, value] of Object.entries(apiData)) {
            const values = [
                key,
                value.last,
                value.buy,
                value.sell,
                value.volume,
                value.base_unit,
            ];

            try {
                // Log each insert attempt
                console.log(`Inserting data for ${key}:`, values);
                await pool.query(queryText, values);
            } catch (dbErr) {
                console.error(`Error inserting data for ${key}:`, dbErr.message);
                return res.status(500).send(`Error inserting data for ${key}`);
            }
        }

        console.log('Data inserted successfully into the database');
        res.send('Data fetched and stored in the database successfully');

    } catch (apiErr) {
        console.error('Error fetching data from API:', apiErr.message);
        res.status(500).send('Error fetching data from API');
    }
});

// Route to get data from PostgreSQL and return it as JSON
app.get('/get-data', async (req, res) => {
    try {
        console.log('Attempting to retrieve data from database...');
        const result = await pool.query('SELECT * FROM tickers');
        
        if (result.rows.length === 0) {
            console.error('No data found in the database');
            return res.status(404).send('No data available');
        }

        res.json(result.rows);
    } catch (dbErr) {
        console.error('Error retrieving data from database:', dbErr.message);
        res.status(500).send('Error retrieving data from the database');
    }
});

// Global error handler to catch unhandled promise rejections or errors
process.on('unhandledRejection', (reason, promise) => {
    console.error('Unhandled Rejection at:', promise, 'reason:', reason);
    process.exit(1); // Exit the process to prevent unhandled errors from persisting
});

// Start the server
app.listen(3000, () => {
    console.log('Server is running on port 3000');
});
