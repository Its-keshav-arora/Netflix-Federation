# Bytemonk Federation - Quick Start Guide

## 🚀 Getting Started

### Step 1: Install Dependencies

Install all Node.js packages:
```bash
npm run install:all
```

Or manually:
```bash
npm install
cd subgraphs/users && npm install && cd ../..
cd subgraphs/movies && npm install && cd ../..
cd subgraphs/reviews && npm install && cd ../..
```

### Step 2: Install Apollo Rover CLI

Rover is needed to compose the supergraph schema:

```bash
npm install -g @apollo/rover
```

Or using curl (Linux/Mac):
```bash
curl -sSL https://rover.apollo.dev/nix/latest | sh
```

### Step 3: Download Apollo Router

**Windows:**
```powershell
Invoke-WebRequest -Uri "https://router.apollo.dev/download/windows/latest" -OutFile "router.exe"
```

**Linux/Mac:**
```bash
curl -sSL https://router.apollo.dev/download/nix/latest | sh
```

### Step 4: Start the System

#### Option A: Windows (PowerShell)
```powershell
npm run start:win
```

Or manually:
```powershell
powershell -ExecutionPolicy Bypass -File scripts/start-services.ps1
```

#### Option B: Manual Start (All Platforms)

1. **Start Users Service** (Terminal 1):
   ```bash
   npm run start:users
   ```

2. **Start Movies Service** (Terminal 2):
   ```bash
   npm run start:movies
   ```

3. **Start Reviews Service** (Terminal 3):
   ```bash
   npm run start:reviews
   ```

4. **Compose Supergraph** (Terminal 4):
   ```bash
   npm run compose
   ```

5. **Start Apollo Router** (Terminal 4):
   ```bash
   npm run router
   ```
   
   Or on Windows:
   ```powershell
   .\router.exe --config router.yaml --supergraph supergraph.graphql
   ```

6. **Start Web Interface** (Terminal 5):
   ```bash
   npm run start:web
   ```

### Step 5: Access the System

- **Web Interface:** http://localhost:3000
- **Apollo Router (Sandbox):** http://localhost:4000
- **Users Service:** http://localhost:4001/graphql
- **Movies Service:** http://localhost:4002/graphql
- **Reviews Service:** http://localhost:4003/graphql

## 🧪 Test the System

### Try a Cross-Service Query

Open the web interface at http://localhost:3000 and click "Execute Query" on the default cross-service query, or use Apollo Sandbox at http://localhost:4000:

```graphql
{
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
}
```

This single query hits all three services behind the scenes!

## 🔧 Troubleshooting

### Services won't start
- Make sure ports 4001, 4002, 4003, and 4000 are not in use
- Check that all dependencies are installed: `npm run install:all`

### Router won't start
- Verify Apollo Router is downloaded and executable
- On Windows, make sure `router.exe` exists in the project root
- Check that `supergraph.graphql` was generated successfully

### Supergraph composition fails
- Ensure Rover CLI is installed: `rover --version`
- Check that all three subgraph services are running
- Verify schema files are in the correct locations

### Web interface can't connect
- Ensure Apollo Router is running on port 4000
- Check browser console for CORS errors
- Verify all services are running

## 📚 Next Steps

- Explore the web interface to see live query execution
- Try different queries from the query tabs
- Check the "Live Data Preview" section
- Experiment with custom queries

Enjoy exploring GraphQL Federation! 🎉

