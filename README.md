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
   ┌───────┬─────────┬
   │       │         │
┌──▼───┐ ┌─▼────┐ ┌──▼────┐
│Users │ │Movies│ │Reviews│
│ :4001│ │ :4002│ │ :4003 │
└──────┘ └──────┘ └───────┘
```

**How it works:**
- Each microservice (Users, Movies, Reviews) runs independently
- Apollo Router acts as the gateway, composing queries across services
- Clients send queries to the Router (port 4000)
- Router intelligently routes requests to appropriate subgraphs
- Results are stitched together and returned as a unified response

## 📋 Prerequisites

- **Node.js** 20+ LTS
- **Apollo Rover CLI**: `npm install -g @apollo/rover`
- **Apollo Router**: Download from [Apollo Router Github](https://github.com/apollographql/router/releases)

### Installing Apollo Rover CLI

```bash
npm install -g @apollo/rover
```

### Installing Apollo Router

Download the Apollo Router binary for your platform from [GitHub Releases](https://github.com/apollographql/router/releases).

**Windows:**
- Download `router-windows-x86_64.exe` and rename it to `router.exe`
- Place it in the project root directory

**Linux/Mac:**
- Download the appropriate binary for your platform
- Make it executable: `chmod +x router`
- Place it in the project root directory

## 🚀 Getting Started

### Step 1: Install Dependencies

Install dependencies for the root project and all subgraphs:

```bash
npm run install:all
```

This will install dependencies for:
- Root project
- Users subgraph
- Movies subgraph
- Reviews subgraph

### Step 2: Start the Services

Open **4 separate terminals** and start each service:

**Terminal 1 - Users Service:**
```bash
npm run start:users
```
Service starts at: http://localhost:4001/

**Terminal 2 - Movies Service:**
```bash
npm run start:movies
```
Service starts at: http://localhost:4002/

**Terminal 3 - Reviews Service:**
```bash
npm run start:reviews
```
Service starts at: http://localhost:4003/

**Terminal 4 - Apollo Router:**
```bash
# First, compose the supergraph schema
npm run compose

# Then start the router
# Windows:
.\router.exe --config router.yaml --supergraph supergraph.graphql

# Linux/Mac:
./router --config router.yaml --supergraph supergraph.graphql
```
Router starts at: http://localhost:4000

## 🧪 Testing Individual Services

Each service can be tested independently using Apollo Sandbox (opens automatically when you visit the GraphQL endpoint in a browser).

### Testing Users Service (Port 4001)

Open http://localhost:4001/ in your browser.

**Query all users:**
```graphql
{
  users {
    id
    username
    email
    createdAt
  }
}
```

**Query a specific user:**
```graphql
{
  user(id: "1") {
    id
    username
    email
    createdAt
  }
}
```

**Query current user:**
```graphql
{
  me {
    id
    username
    email
    createdAt
  }
}
```

### Testing Movies Service (Port 4002)

Open http://localhost:4002/ in your browser.

**Query all movies:**
```graphql
{
  movies {
    id
    title
    releaseYear
    genre
    duration
    description
  }
}
```

**Query a specific movie:**
```graphql
{
  movie(id: "101") {
    id
    title
    releaseYear
    genre
    duration
    description
  }
}
```

**Query top movies:**
```graphql
{
  topMovies(limit: 5) {
    id
    title
    releaseYear
    genre
  }
}
```

### Testing Reviews Service (Port 4003)

Open http://localhost:4003/ in your browser.

**Query recent reviews:**
```graphql
{
  recentReviews(limit: 5) {
    id
    rating
    comment
    createdAt
  }
}
```

**Query a specific review:**
```graphql
{
  review(id: "r1") {
    id
    rating
    comment
    createdAt
  }
}
```

**Create a new review (Mutation):**
```graphql
mutation {
  createReview(input: {
    movieId: "101"
    rating: 5
    comment: "Amazing movie! Highly recommended."
  }) {
    id
    rating
    comment
    createdAt
  }
}
```

## 🔗 Testing the Federated Graph (Apollo Router)

Once all services are running and the router is started, open http://localhost:4000 in your browser.

### Cross-Service Query Example

This query demonstrates the power of federation - it hits **all three services** in a single request:

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
        genre
        averageRating
      }
    }
  }
}
```

**What happens behind the scenes:**
1. Router receives the query
2. Calls Users service for user data
3. Calls Reviews service for reviews (with user IDs)
4. Reviews service returns reviews + movie references
5. Router calls Movies service for movie details
6. Router stitches everything together
7. Client receives unified response

### Movies with Reviews Query

```graphql
{
  movies {
    id
    title
    releaseYear
    genre
    averageRating
    reviews {
      rating
      comment
      author {
        username
        email
      }
    }
  }
}
```

This query demonstrates:
- Movies from Movies service
- Reviews and averageRating from Reviews service
- User details (author) from Users service

### Users with Their Reviews

```graphql
{
  users {
    id
    username
    email
    reviews {
      id
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

## 📁 Project Structure

```
Netflix-Federation/
├── subgraphs/
│   ├── users/              # Users microservice
│   │   ├── index.js        # Server implementation
│   │   ├── schema.graphql  # GraphQL schema
│   │   └── package.json
│   ├── movies/             # Movies microservice
│   │   ├── index.js
│   │   ├── schema.graphql
│   │   └── package.json
│   └── reviews/            # Reviews microservice
│       ├── index.js
│       ├── schema.graphql
│       └── package.json
├── supergraph.yaml         # Rover composition configuration
├── router.yaml             # Apollo Router configuration
├── supergraph.graphql      # Generated supergraph schema (don't edit)
├── package.json
└── README.md
```

## 🔑 Key Federation Concepts

### @key Directive
Identifies entities that can be referenced across services. Example:
```graphql
type User @key(fields: "id") {
  id: ID!
  username: String!
}
```

### Entity Resolution (__resolveReference)
When one service references an entity from another service, the router calls `__resolveReference` to fetch the full entity:
```javascript
User: {
  __resolveReference: (reference) => {
    return users.find(u => u.id === reference.id);
  }
}
```

### Entity Extension
Services can extend entities owned by other services. The Reviews service extends User and Movie:
```graphql
type User @key(fields: "id") {
  id: ID!
  reviews: [Review!]!  # Added by Reviews service
}
```

### Supergraph Composition
Rover CLI combines all subgraph schemas into a single supergraph schema that the router uses.

## 🛠️ Tech Stack

- **Apollo Server 4** - GraphQL server for each subgraph
- **Apollo Federation 2.7** - Federation standard (@apollo/subgraph)
- **Apollo Router** - High-performance router written in Rust
- **Rover CLI** - Schema composition tool
- **Node.js** - Runtime environment

## 📚 Common Commands

```bash
# Install all dependencies
npm run install:all

# Start individual services
npm run start:users
npm run start:movies
npm run start:reviews

# Compose supergraph schema
npm run compose

# Start Apollo Router (after composition)
# Windows:
.\router.exe --config router.yaml --supergraph supergraph.graphql

# Linux/Mac:
./router --config router.yaml --supergraph supergraph.graphql
```

## 🐛 Troubleshooting

### Service won't start
- Check if the port is already in use (4001, 4002, 4003, 4000)
- Verify all dependencies are installed: `npm run install:all`
- Check Node.js version: `node --version` (should be 20+)

### Router won't start
- Ensure `supergraph.graphql` exists (run `npm run compose`)
- Verify Apollo Router is downloaded and executable
- Check that all three subgraph services are running
- Review router logs for specific errors

### Supergraph composition fails
- Ensure Rover CLI is installed: `rover --version`
- Verify all three subgraph services are running
- Check that schema files exist in subgraphs directories
- Review composition errors in the output

### Queries fail in Router
- Verify all subgraph services are running
- Check that services are accessible at their URLs
- Ensure supergraph was composed after any schema changes
- Review router logs for routing errors

## 🎯 What This Demonstrates

✅ GraphQL Federation 2.0 patterns  
✅ Multi-service query execution  
✅ Entity references and resolution  
✅ Service decoupling and independence  
✅ Schema composition with Rover  
✅ Production-ready architecture patterns  

## 📝 Notes

- All services use in-memory data for simplicity
- Services can be stopped/started independently
- Schema changes require re-composition (`npm run compose`)
- Router must be restarted after re-composition
- For production, configure CORS, authentication, and error handling appropriately

---

Built with ❤️ for **Bytemonk**
