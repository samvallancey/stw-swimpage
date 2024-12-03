        // Create the map and center it on the Isle of Wight
        const map = L.map('map').setView([50.6938, -1.3034], 10); // Coordinates for Isle of Wight

        // Add a tile layer (e.g., OpenStreetMap)
        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
            attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        }).addTo(map);
        // Example beach data
        const beaches = [
            { name: "Cowes", coords: [50.7631, -1.2972], tide: "High Tide: 6:45 AM, Low Tide: 12:50 PM" },
            { name: "Sandown", coords: [50.6554, -1.1515], tide: "High Tide: 7:05 AM, Low Tide: 1:15 PM" },
            { name: "Ventnor", coords: [50.5956, -1.2062], tide: "High Tide: 7:30 AM, Low Tide: 1:40 PM" }
        ];
        
        // Add markers to the map
        beaches.forEach(beach => {
            const marker = L.marker(beach.coords).addTo(map);
            marker.bindPopup(`<b>${beach.name}</b><br>${beach.tide}`);
        });
        const legend = L.control({ position: 'bottomright' });

legend.onAdd = function () {
    const div = L.DomUtil.create('div', 'info legend');
    div.innerHTML = `<h4>Tide Levels</h4>
                     <div><span style="background-color:blue;"></span>Low</div>
                     <div><span style="background-color:orange;"></span>Medium</div>
                     <div><span style="background-color:red;"></span>High</div>`;
    return div;
};

legend.addTo(map);