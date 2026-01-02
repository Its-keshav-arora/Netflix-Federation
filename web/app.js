const ROUTER_URL = 'http://localhost:4000/graphql';
const SERVICES = {
    users: 'http://localhost:4001/graphql',
    movies: 'http://localhost:4002/graphql',
    reviews: 'http://localhost:4003/graphql',
    router: 'http://localhost:4000/graphql'
};

// Predefined queries
const QUERIES = {
    'cross-service': `{
  users {
    id
    username
    email
    reviews {
      rating
      comment
      movie {
        title
        releaseYear
        averageRating
      }
    }
  }
}`,
    'movies': `{
  movies {
    title
    releaseYear
    genre
    averageRating
    reviews {
      rating
      comment
      author {
        username
      }
    }
  }
}`,
    'users': `{
  users {
    id
    username
    email
    reviews {
      rating
      comment
      movie {
        title
        releaseYear
      }
    }
  }
}`,
    'custom': ''
};

// Initialize
document.addEventListener('DOMContentLoaded', () => {
    initializeTabs();
    initializeQueryTabs();
    initializeDataTabs();
    checkServiceStatus();
    setInterval(checkServiceStatus, 10000); // Check every 10 seconds
});

// Query Tabs
function initializeQueryTabs() {
    const tabs = document.querySelectorAll('.query-tabs .tab');
    const editor = document.getElementById('query-editor');
    
    tabs.forEach(tab => {
        tab.addEventListener('click', () => {
            tabs.forEach(t => t.classList.remove('active'));
            tab.classList.add('active');
            
            const queryType = tab.dataset.query;
            editor.value = QUERIES[queryType] || '';
            
            if (queryType === 'custom') {
                editor.focus();
            }
        });
    });
    
    // Execute button
    document.getElementById('execute-query').addEventListener('click', executeQuery);
    document.getElementById('explain-query').addEventListener('click', explainQuery);
    
    // Allow Ctrl+Enter to execute
    editor.addEventListener('keydown', (e) => {
        if (e.ctrlKey && e.key === 'Enter') {
            executeQuery();
        }
    });
}

// Data Tabs
function initializeDataTabs() {
    const tabs = document.querySelectorAll('.data-tabs .data-tab');
    
    tabs.forEach(tab => {
        tab.addEventListener('click', () => {
            tabs.forEach(t => t.classList.remove('active'));
            tab.classList.add('active');
            
            const view = tab.dataset.view;
            loadDataView(view);
        });
    });
    
    // Load initial view
    loadDataView('users');
}

// Regular tabs (if any)
function initializeTabs() {
    // Placeholder for future tab functionality
}

// Check Service Status
async function checkServiceStatus() {
    const services = ['users', 'movies', 'reviews', 'router'];
    
    for (const service of services) {
        const statusEl = document.getElementById(`${service}-status`);
        if (!statusEl) continue;
        
        try {
            const url = service === 'router' ? SERVICES.router : SERVICES[service];
            const response = await fetch(url, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    query: service === 'router' 
                        ? 'query { __typename }'
                        : `query { ${service === 'users' ? 'users { id }' : service === 'movies' ? 'movies { id }' : 'recentReviews(limit: 1) { id }' } }`
                })
            });
            
            if (response.ok) {
                statusEl.innerHTML = '<span class="status-badge online">Online</span>';
            } else {
                throw new Error('Service not responding');
            }
        } catch (error) {
            statusEl.innerHTML = '<span class="status-badge offline">Offline</span>';
        }
    }
}

// Execute Query
async function executeQuery() {
    const editor = document.getElementById('query-editor');
    const query = editor.value.trim();
    const resultsEl = document.getElementById('query-results');
    const infoEl = document.getElementById('execution-info');
    
    if (!query) {
        showError('Please enter a query');
        return;
    }
    
    resultsEl.innerHTML = '<div class="results-placeholder"><div class="loading"></div><p>Executing query...</p></div>';
    infoEl.textContent = '';
    
    const startTime = performance.now();
    
    try {
        const response = await fetch(ROUTER_URL, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ query })
        });
        
        const endTime = performance.now();
        const duration = ((endTime - startTime) / 1000).toFixed(2);
        
        const data = await response.json();
        
        if (data.errors) {
            showError(data.errors[0].message);
            return;
        }
        
        infoEl.textContent = `Executed in ${duration}s`;
        
        // Highlight which services were called
        const servicesCalled = detectServicesInQuery(query);
        if (servicesCalled.length > 0) {
            infoEl.textContent += ` • Services: ${servicesCalled.join(', ')}`;
        }
        
        resultsEl.innerHTML = `<pre><code>${syntaxHighlight(JSON.stringify(data.data, null, 2))}</code></pre>`;
        
        // Animate service cards
        animateServiceCards(servicesCalled);
        
    } catch (error) {
        showError(`Failed to execute query: ${error.message}`);
    }
}

// Explain Query
function explainQuery() {
    const editor = document.getElementById('query-editor');
    const query = editor.value.trim();
    
    if (!query) {
        alert('Please enter a query first');
        return;
    }
    
    const servicesCalled = detectServicesInQuery(query);
    const explanation = generateExplanation(query, servicesCalled);
    
    alert(explanation);
}

// Detect which services are called in a query
function detectServicesInQuery(query) {
    const services = [];
    const lowerQuery = query.toLowerCase();
    
    if (lowerQuery.includes('user') || lowerQuery.includes('me')) {
        services.push('Users');
    }
    if (lowerQuery.includes('movie')) {
        services.push('Movies');
    }
    if (lowerQuery.includes('review')) {
        services.push('Reviews');
    }
    
    return services.length > 0 ? services : ['Multiple Services'];
}

// Generate explanation
function generateExplanation(query, services) {
    return `This query will be executed across ${services.length} service(s):

${services.map(s => `• ${s} Service`).join('\n')}

The Apollo Router will:
1. Parse the query
2. Split it into sub-queries for each service
3. Execute them in parallel when possible
4. Stitch the results together
5. Return a unified response

This is the power of GraphQL Federation!`;
}

// Animate service cards
function animateServiceCards(services) {
    const serviceCards = document.querySelectorAll('.service-card');
    
    serviceCards.forEach(card => {
        const serviceName = card.querySelector('h4').textContent;
        const isCalled = services.some(s => serviceName.includes(s.replace(' Service', '')));
        
        if (isCalled) {
            card.style.animation = 'pulse 0.5s ease-in-out';
            setTimeout(() => {
                card.style.animation = '';
            }, 500);
        }
    });
}

// Load Data View
async function loadDataView(view) {
    const contentEl = document.getElementById('data-content');
    contentEl.innerHTML = '<div class="results-placeholder"><div class="loading"></div><p>Loading data...</p></div>';
    
    try {
        let query, dataPath;
        
        switch(view) {
            case 'users':
                query = '{ users { id username email createdAt } }';
                dataPath = 'users';
                break;
            case 'movies':
                query = '{ movies { id title releaseYear genre duration } }';
                dataPath = 'movies';
                break;
            case 'reviews':
                query = '{ recentReviews(limit: 10) { id rating comment createdAt } }';
                dataPath = 'recentReviews';
                break;
        }
        
        const response = await fetch(ROUTER_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ query })
        });
        
        const result = await response.json();
        
        if (result.errors) {
            contentEl.innerHTML = `<p style="color: var(--error)">Error: ${result.errors[0].message}</p>`;
            return;
        }
        
        const items = result.data[dataPath];
        renderDataItems(items, view);
        
    } catch (error) {
        contentEl.innerHTML = `<p style="color: var(--error)">Failed to load data: ${error.message}</p>`;
    }
}

// Render Data Items
function renderDataItems(items, view) {
    const contentEl = document.getElementById('data-content');
    
    if (!items || items.length === 0) {
        contentEl.innerHTML = '<p>No data available</p>';
        return;
    }
    
    const grid = document.createElement('div');
    grid.className = 'data-grid';
    
    items.forEach(item => {
        const itemEl = document.createElement('div');
        itemEl.className = 'data-item';
        
        let html = '';
        
        if (view === 'users') {
            html = `
                <h5>${item.username}</h5>
                <p><span class="data-label">ID:</span> ${item.id}</p>
                <p><span class="data-label">Email:</span> ${item.email}</p>
                <p><span class="data-label">Created:</span> ${item.createdAt}</p>
            `;
        } else if (view === 'movies') {
            html = `
                <h5>${item.title}</h5>
                <p><span class="data-label">ID:</span> ${item.id}</p>
                <p><span class="data-label">Year:</span> ${item.releaseYear}</p>
                <p><span class="data-label">Genre:</span> ${item.genre}</p>
                <p><span class="data-label">Duration:</span> ${item.duration} min</p>
            `;
        } else if (view === 'reviews') {
            html = `
                <h5>Review ${item.id}</h5>
                <p><span class="data-label">Rating:</span> ${'⭐'.repeat(item.rating)}</p>
                <p><span class="data-label">Comment:</span> ${item.comment || 'No comment'}</p>
                <p><span class="data-label">Created:</span> ${item.createdAt}</p>
            `;
        }
        
        itemEl.innerHTML = html;
        grid.appendChild(itemEl);
    });
    
    contentEl.innerHTML = '';
    contentEl.appendChild(grid);
}

// Syntax Highlight JSON
function syntaxHighlight(json) {
    json = json.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
    return json.replace(/("(\\u[a-zA-Z0-9]{4}|\\[^u]|[^\\"])*"(\s*:)?|\b(true|false|null)\b|-?\d+(?:\.\d*)?(?:[eE][+\-]?\d+)?)/g, (match) => {
        let cls = 'json-number';
        if (/^"/.test(match)) {
            if (/:$/.test(match)) {
                cls = 'json-key';
            } else {
                cls = 'json-string';
            }
        } else if (/true|false/.test(match)) {
            cls = 'json-boolean';
        } else if (/null/.test(match)) {
            cls = 'json-null';
        }
        return '<span class="' + cls + '">' + match + '</span>';
    });
}

// Show Error
function showError(message) {
    const resultsEl = document.getElementById('query-results');
    resultsEl.innerHTML = `<div class="results-placeholder"><div style="color: var(--error); font-size: 3rem;">⚠️</div><p style="color: var(--error)">${message}</p></div>`;
}

