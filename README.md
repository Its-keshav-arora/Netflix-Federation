# Bytemonk GraphQL Federation Demo

> Netflix-Style Federated GraphQL Architecture

This project demonstrates GraphQL Federation 2.0 using Apollo Router and three microservices - exactly like Netflix does it. Built for **Bytemonk** to showcase modern distributed system architecture.

## 🏗️ Architecture

```
┌─────────────┐
│   Apollo    │
│   Router    │  (Port 4000)
└──────┬──────┘
       │
   ┌───┴───┬─────────┬──────────┐
   │       │         │          │
┌──▼───┐ ┌─▼────┐ ┌──▼────┐  ┌─▼─────┐
│Users │ │Movies│ │Reviews│  │  Web  │
│ :4001│ │ :4002│ │ :4003 │  │ :3000 │
└──────┘ └──────┘ └───────┘  └───────┘
```

## 🚀 Quick Start

### Prerequisites

- Node.js 20+ LTS
- Apollo Rover CLI: `npm install -g @apollo/rover`
- Apollo Router: Download from [router.apollo.dev](https://router.apollo.dev/download)

### Installation

1. **Install all dependencies:**
   ```bash
   npm run install:all
   ```

2. **Download Apollo Router:**
   ```bash
   # Linux/Mac
   curl -sSL https://router.apollo.dev/download/nix/latest | sh
   
   # Windows (PowerShell)
   Invoke-WebRequest -Uri "https://router.apollo.dev/download/windows/latest" -OutFile "router.exe"
   ```

3. **Start all services:**
   ```bash
   npm run dev
   ```
   
   Or start manually:
   - Terminal 1: `npm run start:users`
   - Terminal 2: `npm run start:movies`
   - Terminal 3: `npm run start:reviews`
   - Terminal 4: `npm run compose && npm run router`
   - Terminal 5: `npm run start:web`

### Access Points

- **Web Interface:** http://localhost:3000
- **Apollo Router:** http://localhost:4000
- **Users Service:** http://localhost:4001/graphql
- **Movies Service:** http://localhost:4002/graphql
- **Reviews Service:** http://localhost:4003/graphql

## 📝 Example Queries

### Cross-Service Query (The "Aha!" Moment)

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

This single query hits **all three services**:
1. Users service → user data
2. Reviews service → reviews and averageRating
3. Movies service → movie details

### Movies with Reviews

```graphql
{
  movies {
    title
    averageRating
    reviews {
      rating
      comment
      author {
        username
      }
    }
  }
}
```

## 🛠️ Tech Stack

- **Apollo Server 4** - GraphQL server
- **Apollo Federation 2** - Federation standard
- **Apollo Router** - High-performance router (Rust)
- **Rover CLI** - Schema composition
- **Node.js** - Runtime

## 📚 Key Concepts

- **@key directive** - Entity identification across services
- **__resolveReference** - Entity resolution resolver
- **Entity Extension** - Adding fields to entities from other services
- **Supergraph Composition** - Combining subgraph schemas

## 🎯 What This Demonstrates

✅ Federation 2.0 patterns  
✅ Multi-service query execution  
✅ Entity references and resolution  
✅ Service decoupling  
✅ Production-ready architecture  

Built with ❤️ for **Bytemonk**

