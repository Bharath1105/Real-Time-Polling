// Global variables
let currentUser = null;
let authToken = null;
let socket = null;
let currentPollId = null;

// Initialize the application
document.addEventListener('DOMContentLoaded', function() {
    // Check if user is already logged in
    const savedToken = localStorage.getItem('authToken');
    const savedUser = localStorage.getItem('currentUser');
    
    if (savedToken && savedUser) {
        authToken = savedToken;
        currentUser = JSON.parse(savedUser);
        console.log('Page loaded with saved user:', currentUser);
        console.log('User name from saved data:', currentUser.name);
        showPollsSection();
        loadPolls();
        connectWebSocket();
    }
});

// Authentication functions
async function login() {
    const email = document.getElementById('loginEmail').value;
    const password = document.getElementById('loginPassword').value;
    
    if (!email || !password) {
        showError('Please fill in all fields');
        return;
    }
    
    try {
        const response = await fetch('/api/users/login', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ email, password })
        });
        
        const data = await response.json();
        
        if (response.ok) {
            authToken = data.token;
            currentUser = data.user;
            
            // Debug logging
            console.log('Login successful, user data:', currentUser);
            console.log('User name:', currentUser.name);
            
            // Save to localStorage
            localStorage.setItem('authToken', authToken);
            localStorage.setItem('currentUser', JSON.stringify(currentUser));
            
            showPollsSection();
            loadPolls();
            connectWebSocket();
            showSuccess('Login successful!');
        } else {
            showError(data.error || 'Login failed');
        }
    } catch (error) {
        showError('Network error. Please try again.');
    }
}

async function register() {
    const name = document.getElementById('registerName').value;
    const email = document.getElementById('registerEmail').value;
    const password = document.getElementById('registerPassword').value;
    
    if (!name || !email || !password) {
        showError('Please fill in all fields');
        return;
    }
    
    try {
        const response = await fetch('/api/users', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ name, email, password })
        });
        
        const data = await response.json();
        
        if (response.ok) {
            showSuccess('Account created successfully! Please login.');
            showLoginForm();
            // Clear registration form
            clearRegistrationForm();
        } else {
            showError(data.error || 'Registration failed');
        }
    } catch (error) {
        showError('Network error. Please try again.');
    }
}

function logout() {
    console.log('Logging out...');
    
    // Clear global variables
    authToken = null;
    currentUser = null;
    
    // Clear localStorage
    localStorage.removeItem('authToken');
    localStorage.removeItem('currentUser');
    
    // Disconnect WebSocket
    if (socket) {
        socket.disconnect();
        socket = null;
    }
    
    // Clear all user displays
    clearUserDisplays();
    
    // Show auth section
    showAuthSection();
    showLoginForm();
    
    console.log('Logout complete');
}

function clearUserDisplays() {
    // Clear header user info
    const headerUserInfo = document.getElementById('headerUserInfo');
    if (headerUserInfo) {
        headerUserInfo.style.display = 'none';
    }
    
    // Clear auth section user info
    const authUserInfo = document.getElementById('pollsUserInfo');
    if (authUserInfo) {
        authUserInfo.style.display = 'none';
    }
    
    // Clear user name text
    const headerUserName = document.getElementById('headerUserName');
    if (headerUserName) {
        headerUserName.textContent = '';
    }
    
    const pollsUserName = document.getElementById('pollsUserName');
    if (pollsUserName) {
        pollsUserName.textContent = '';
    }
    
    // Clear all form fields
    clearLoginForm();
    clearRegistrationForm();
}

function clearLoginForm() {
    const loginEmail = document.getElementById('loginEmail');
    if (loginEmail) {
        loginEmail.value = '';
    }
    
    const loginPassword = document.getElementById('loginPassword');
    if (loginPassword) {
        loginPassword.value = '';
    }
}

function clearRegistrationForm() {
    const registerName = document.getElementById('registerName');
    if (registerName) {
        registerName.value = '';
    }
    
    const registerEmail = document.getElementById('registerEmail');
    if (registerEmail) {
        registerEmail.value = '';
    }
    
    const registerPassword = document.getElementById('registerPassword');
    if (registerPassword) {
        registerPassword.value = '';
    }
}

function showLoginForm() {
    document.getElementById('loginForm').style.display = 'block';
    document.getElementById('registerForm').style.display = 'none';
    // Clear registration form when showing login
    clearRegistrationForm();
}

function showRegisterForm() {
    document.getElementById('loginForm').style.display = 'none';
    document.getElementById('registerForm').style.display = 'block';
    // Clear login form when showing registration
    clearLoginForm();
}

function showAuthSection() {
    document.getElementById('authSection').classList.add('active');
    document.getElementById('pollsSection').classList.remove('active');
    document.getElementById('realTimeIndicator').classList.remove('active');
    
    // Clear all user displays
    clearUserDisplays();
}

function showPollsSection() {
    document.getElementById('authSection').classList.remove('active');
    document.getElementById('pollsSection').classList.add('active');
    
    // Show user info in polls section
    const userInfo = document.getElementById('pollsUserInfo');
    if (userInfo) {
        userInfo.style.display = 'block';
        const userName = document.getElementById('pollsUserName');
        if (userName && currentUser) {
            userName.textContent = currentUser.name;
        }
    }
    
    // Show user info in header
    const headerUserInfo = document.getElementById('headerUserInfo');
    if (headerUserInfo) {
        headerUserInfo.style.display = 'block';
        const headerUserName = document.getElementById('headerUserName');
        console.log('Header user name element:', headerUserName);
        console.log('Current user:', currentUser);
        if (headerUserName && currentUser) {
            console.log('Setting header user name to:', currentUser.name);
            headerUserName.textContent = currentUser.name;
        } else if (headerUserName) {
            // Fallback: try to get user from localStorage
            const savedUser = localStorage.getItem('currentUser');
            if (savedUser) {
                const user = JSON.parse(savedUser);
                console.log('Using fallback user data:', user);
                headerUserName.textContent = user.name;
            }
        }
    }
    
    // Also show the real-time indicator
    document.getElementById('realTimeIndicator').classList.add('active');
}

// Poll functions
async function createPoll() {
    const question = document.getElementById('pollQuestion').value;
    const options = Array.from(document.querySelectorAll('.poll-option'))
        .map(input => input.value.trim())
        .filter(value => value !== '');
    
    if (!question || options.length < 2) {
        showError('Please enter a question and at least 2 options');
        return;
    }
    
    try {
        const response = await fetch('/api/polls', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${authToken}`
            },
            body: JSON.stringify({ question, options })
        });
        
        const data = await response.json();
        
        if (response.ok) {
            showSuccess('Poll created successfully!');
            loadPolls();
            clearPollForm();
        } else {
            showError(data.error || 'Failed to create poll');
        }
    } catch (error) {
        showError('Network error. Please try again.');
    }
}

async function publishPoll() {
    const question = document.getElementById('pollQuestion').value;
    const options = Array.from(document.querySelectorAll('.poll-option'))
        .map(input => input.value.trim())
        .filter(value => value !== '');
    
    if (!question || options.length < 2) {
        showError('Please enter a question and at least 2 options');
        return;
    }
    
    try {
        // First create the poll
        const createResponse = await fetch('/api/polls', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${authToken}`
            },
            body: JSON.stringify({ question, options })
        });
        
        const pollData = await createResponse.json();
        
        if (createResponse.ok) {
            // Then publish it
            const publishResponse = await fetch(`/api/polls/${pollData.id}/publish`, {
                method: 'PATCH',
                headers: {
                    'Authorization': `Bearer ${authToken}`
                }
            });
            
            if (publishResponse.ok) {
                showSuccess('Poll created and published successfully!');
                loadPolls();
                clearPollForm();
            } else {
                showError('Poll created but failed to publish');
            }
        } else {
            showError(pollData.error || 'Failed to create poll');
        }
    } catch (error) {
        showError('Network error. Please try again.');
    }
}

async function loadPolls() {
    try {
        const response = await fetch('/api/polls');
        const polls = await response.json();
        
        displayPolls(polls);
    } catch (error) {
        showError('Failed to load polls');
    }
}

function displayPolls(polls) {
    const pollsList = document.getElementById('pollsList');
    
    if (polls.length === 0) {
        pollsList.innerHTML = '<div class="loading">No polls available. Create one above!</div>';
        return;
    }
    
    pollsList.innerHTML = polls.map(poll => `
        <div class="poll-card" data-poll-id="${poll.id}">
            <div class="poll-question">${poll.question}</div>
            <div class="poll-options">
                ${poll.options.map(option => `
                    <div class="option" onclick="vote('${option.id}', '${poll.id}')">
                        <input type="radio" name="poll-${poll.id}" value="${option.id}">
                        <span class="option-text">${option.text}</span>
                        <span class="vote-count" id="votes-${option.id}">${option._count.votes}</span>
                    </div>
                `).join('')}
            </div>
            <div class="poll-meta">
                <span>Created by: ${poll.creator.name}</span>
                <span class="status-badge ${poll.isPublished ? 'status-published' : 'status-draft'}">
                    ${poll.isPublished ? 'Published' : 'Draft'}
                </span>
                <span>${new Date(poll.createdAt).toLocaleDateString()}</span>
            </div>
        </div>
    `).join('');
}

async function vote(optionId, pollId) {
    if (!authToken) {
        showError('Please login to vote');
        return;
    }
    
    try {
        const response = await fetch('/api/votes', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${authToken}`
            },
            body: JSON.stringify({ pollOptionId: optionId })
        });
        
        const data = await response.json();
        
        if (response.ok) {
            showSuccess('Vote submitted successfully!');
            // The WebSocket will handle real-time updates
        } else {
            showError(data.error || 'Failed to submit vote');
        }
    } catch (error) {
        showError('Network error. Please try again.');
    }
}

// WebSocket functions
function connectWebSocket() {
    socket = io();
    
    socket.on('connect', () => {
        console.log('Connected to WebSocket server');
        document.getElementById('realTimeIndicator').classList.add('active');

        
        // Identify user to server
        if (currentUser && currentUser.id) {
            socket.emit('identifyUser', currentUser.id);
        }
    });
    
    socket.on('disconnect', () => {
        console.log('Disconnected from WebSocket server');
        document.getElementById('realTimeIndicator').classList.remove('active');
    });
    
    socket.on('pollResults', (data) => {
        console.log('Received real-time poll results:', data);
        updatePollResults(data);
    });
}

function updatePollResults(data) {
    // Update vote counts for the specific poll
    data.results.forEach(result => {
        const voteCountElement = document.getElementById(`votes-${result.id}`);
        if (voteCountElement) {
            voteCountElement.textContent = result.voteCount;
        }
    });
    
    // Show a subtle notification
    showSuccess('Poll results updated in real-time!');
}

// Utility functions
function addOption() {
    const optionsContainer = document.getElementById('pollOptions');
    const optionCount = optionsContainer.children.length;
    
    const optionDiv = document.createElement('div');
    optionDiv.className = 'option-input';
    optionDiv.innerHTML = `
        <input type="text" placeholder="Option ${optionCount + 1}" class="poll-option">
        <button class="remove-option" onclick="removeOption(this)">×</button>
    `;
    
    optionsContainer.appendChild(optionDiv);
}

function removeOption(button) {
    const optionsContainer = document.getElementById('pollOptions');
    if (optionsContainer.children.length > 2) {
        button.parentElement.remove();
    } else {
        showError('A poll must have at least 2 options');
    }
}

function clearPollForm() {
    document.getElementById('pollQuestion').value = '';
    const options = document.querySelectorAll('.poll-option');
    options.forEach((input, index) => {
        input.value = '';
        if (index >= 2) {
            input.parentElement.remove();
        }
    });
}

function showError(message) {
    const errorDiv = document.createElement('div');
    errorDiv.className = 'error';
    errorDiv.innerHTML = `<i class="fas fa-exclamation-triangle"></i> ${message}`;
    
    const mainContent = document.querySelector('.main-content');
    mainContent.insertBefore(errorDiv, mainContent.firstChild);
    
    setTimeout(() => {
        errorDiv.remove();
    }, 5000);
}

function showSuccess(message) {
    const successDiv = document.createElement('div');
    successDiv.className = 'success';
    successDiv.innerHTML = `<i class="fas fa-check-circle"></i> ${message}`;
    
    const mainContent = document.querySelector('.main-content');
    mainContent.insertBefore(successDiv, mainContent.firstChild);
    
    setTimeout(() => {
        successDiv.remove();
    }, 3000);
}
