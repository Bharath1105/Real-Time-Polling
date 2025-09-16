function loadStats() {
    fetch('https://real-time-polling.onrender.com/api/stats')
        .then(response => response.json())
        .then(data => {
            updateStats(data);
            updateUsersTable(data.activeUsers);
        })
        .catch(error => {
            console.error('Error loading stats:', error);
            document.getElementById('usersTable').innerHTML = 
                '<div class="loading">Error loading data. Please try again.</div>';
        });
}

function updateStats(data) {
    document.getElementById('totalActiveUsers').textContent = data.totalActiveUsers;
    document.getElementById('totalSessions').textContent = data.totalSessions;
    
    const uptimeMinutes = Math.floor((data.currentTime ? (new Date(data.currentTime).getTime()) : Date.now()) / 1000 / 60);
    document.getElementById('serverUptime').textContent = uptimeMinutes;
}

function updateUsersTable(users) {
    const tableContent = document.getElementById('usersTable');
    
    if (!users || users.length === 0) {
        tableContent.innerHTML = '<div class="loading">No active users</div>';
        return;
    }

    const headerRow = `
        <div class="user-row" style="font-weight: bold; background: #e9ecef;">
            <div>Name</div>
            <div>Email</div>
            <div>Login Time</div>
            <div>Session Duration</div>
            <div>Status</div>
        </div>
    `;

    const userRows = users.map(user => {
        const loginTime = new Date(user.loginTime).toLocaleString();
        const duration = formatDuration(user.sessionDuration || 0);
        
        return `
            <div class="user-row">
                <div>${user.name}</div>
                <div>${user.email}</div>
                <div>${loginTime}</div>
                <div>${duration}</div>
                <div>
                    <span class="status-indicator status-online"></span>
                    Online
                </div>
            </div>
        `;
    }).join('');

    tableContent.innerHTML = headerRow + userRows;
}

function formatDuration(seconds) {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    
    if (hours > 0) {
        return `${hours}h ${minutes}m ${secs}s`;
    } else if (minutes > 0) {
        return `${minutes}m ${secs}s`;
    } else {
        return `${secs}s`;
    }
}

document.addEventListener('DOMContentLoaded', function() {
    loadStats();
    setInterval(loadStats, 5000);
});


