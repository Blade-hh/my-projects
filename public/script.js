async function fetchTickers() {
    try {
      const response = await fetch('http://localhost:3000/get-data');
      const data = await response.json();

       // Limit to top 10 records
       const topTenData = data.slice(0, 10);

      // Display data in the table
      const tableBody = document.querySelector('#tickerTable tbody');
      tableBody.innerHTML = ''; // Clear existing rows

      topTenData.forEach(ticker => {
        const row = document.createElement('tr');
        row.innerHTML = `
          <td>${ticker.name}</td>
          <td>${ticker.last}</td>
          <td>${ticker.buy}</td>
          <td>${ticker.sell}</td>
          <td>${ticker.volume}</td>
          <td>${ticker.base_unit}</td>
        `;
        tableBody.appendChild(row);
      });
    } catch (err) {
      console.error('Error fetching tickers:', err);
    }
  }

  // Fetch the tickers when the page loads
  window.onload = fetchTickers;