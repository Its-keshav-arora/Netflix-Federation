# Building GraphQL Federation from Scratch — Netflix-Style Architecture

## VIDEO TUTORIAL SCRIPT (Voice-Over Ready)
**Duration:** ~18 minutes
**Style:** Hands-on coding tutorial, conversational peer teaching
**Prerequisite:** Viewers watched "Netflix's GraphQL Secret" explainer video

---

## HOOK & INTRO [0:00 - 1:30]

In my last video, we explored how Netflix uses GraphQL Federation to handle billions of requests with over 70 microservices behind a single, unified API.

[Pause]

A lot of you asked: "That's cool, but how do I actually build this myself?"

So today, we're doing exactly that. We're going to build a federated GraphQL API from scratch. Three services. One unified graph. Just like Netflix does it — minus the billions of users.

[Pause]

By the end of this video, you'll have a working federated API running on your machine. You'll understand how the `@key` directive stitches entities across services. And you'll see that "aha!" moment when a single query spans three different microservices and just... works.

Let's build it.

---

## WHAT WE'RE BUILDING [1:30 - 2:30]

Here's our architecture. Simple, but it demonstrates all the core Federation concepts.

**Users Service** — owns everything about users: IDs, usernames, emails.

**Movies Service** — owns everything about movies: titles, release years, genres.

**Reviews Service** — owns reviews, but here's the interesting part — it references both Users AND Movies. A review has an author and a movie it's about.

[Pause]

And sitting in front of all these? The Apollo Router. It's the traffic cop that takes incoming queries, figures out which services to call, in what order, and stitches everything together.

Quick note on Federation versions: We're using **Federation 2**, which is the current standard. The main difference from v1? You need to explicitly declare Federation 2 at the top of your schema, and there are some new directives like `@shareable`. I'll point these out as we go.

Alright, let's set up our project.

---

## PROJECT SETUP [2:30 - 4:30]

I'm starting with an empty folder. Let's call it `netflix-federation`.

```bash
mkdir netflix-federation
cd netflix-federation
```

We're going to create a monorepo structure. Each subgraph lives in its own folder with its own `package.json`. This mimics how real teams operate — each service is independent.

```bash
mkdir -p subgraphs/users subgraphs/movies subgraphs/reviews
```

Now let me show you the folder structure we're aiming for:

```
netflix-federation/
├── supergraph.yaml          # Tells Rover how to compose our graph
├── router.yaml              # Apollo Router config
├── subgraphs/
│   ├── users/
│   │   ├── index.js
│   │   ├── schema.graphql
│   │   └── package.json
│   ├── movies/
│   │   └── (same structure)
│   └── reviews/
│       └── (same structure)
└── package.json             # Root workspace
```

Let's start with the Users service. This is the simplest one, and it'll teach us the core concepts.

```bash
cd subgraphs/users
npm init -y
```

We need two packages: `@apollo/server` for running our GraphQL server, and `@apollo/subgraph` for Federation 2 support.

```bash
npm install @apollo/server @apollo/subgraph graphql graphql-tag
```

[Pause]

A quick note here: If you've seen older tutorials, they might use `@apollo/federation`. That's the old package for Federation 1. We want `@apollo/subgraph` for Federation 2. Important distinction.

---

## BUILDING THE USERS SUBGRAPH [4:30 - 8:00]

Let me create the schema first. This is where the magic happens.

**subgraphs/users/schema.graphql:**

```graphql
extend schema
  @link(
    url: "https://specs.apollo.dev/federation/v2.7"
    import: ["@key"]
  )

type User @key(fields: "id") {
  id: ID!
  username: String!
  email: String!
  createdAt: String!
}

type Query {
  me: User
  user(id: ID!): User
  users: [User!]!
}
```

[Pause]

Let me explain what's happening here.

That `extend schema @link` block at the top? This is how you tell Apollo: "Hey, this is a Federation 2 subgraph." Without this, your schema defaults to Federation 1 behavior, and you'll hit some confusing errors.

Now, see that `@key` directive on the User type? This is the heart of Federation.

```graphql
type User @key(fields: "id") {
```

This tells the Router: "You can uniquely identify a User by its `id` field." Think of it like a primary key in a database. When another service — like Reviews — needs to reference a User, it just needs to provide the `id`, and the Router knows to fetch the full User from this service.

[Pause]

Now let's write the server code.

**subgraphs/users/index.js:**

```javascript
const { ApolloServer } = require('@apollo/server');
const { startStandaloneServer } = require('@apollo/server/standalone');
const { buildSubgraphSchema } = require('@apollo/subgraph');
const { readFileSync } = require('fs');
const gql = require('graphql-tag');

// In-memory data — no database complexity for this tutorial
const users = [
  { id: '1', username: 'alice', email: 'alice@netflix.com', createdAt: '2024-01-15' },
  { id: '2', username: 'bob', email: 'bob@netflix.com', createdAt: '2024-02-20' },
  { id: '3', username: 'charlie', email: 'charlie@netflix.com', createdAt: '2024-03-10' },
];

const typeDefs = gql(readFileSync('./schema.graphql', 'utf-8'));

const resolvers = {
  Query: {
    me: () => users[0],
    user: (_, { id }) => users.find(u => u.id === id),
    users: () => users,
  },
  User: {
    __resolveReference: (reference) => {
      // This is called when another service references a User
      return users.find(u => u.id === reference.id);
    },
  },
};

const server = new ApolloServer({
  schema: buildSubgraphSchema({ typeDefs, resolvers }),
});

startStandaloneServer(server, { listen: { port: 4001 } })
  .then(({ url }) => console.log(`🚀 Users service ready at ${url}`));
```

[Pause]

Here's the key thing I want you to notice: that `__resolveReference` function.

```javascript
User: {
  __resolveReference: (reference) => {
    return users.find(u => u.id === reference.id);
  },
},
```

This is Federation's secret sauce. When the Reviews service says "this review was written by User with id 2", the Router calls this function with `{ __typename: 'User', id: '2' }`. Our job is to return the full User object.

[Pause]

Also notice we're using `buildSubgraphSchema` instead of just passing `typeDefs` and `resolvers` directly to Apollo Server. This is a common mistake beginners make. If you skip `buildSubgraphSchema`, your subgraph won't expose the special `_entities` field that the Router needs.

Let's test it:

```bash
node index.js
```

You should see: `🚀 Users service ready at http://localhost:4001`

Open that URL in your browser, and you'll get Apollo's Sandbox. Try this query:

```graphql
{
  users {
    id
    username
    email
  }
}
```

You should get back our three users. Users service: done.

---

## BUILDING THE MOVIES SUBGRAPH [8:00 - 10:30]

Same pattern, different data. Let's move fast here.

```bash
cd ../movies
npm init -y
npm install @apollo/server @apollo/subgraph graphql graphql-tag
```

**subgraphs/movies/schema.graphql:**

```graphql
extend schema
  @link(
    url: "https://specs.apollo.dev/federation/v2.7"
    import: ["@key"]
  )

type Movie @key(fields: "id") {
  id: ID!
  title: String!
  releaseYear: Int!
  genre: String!
  duration: Int!
}

type Query {
  movie(id: ID!): Movie
  movies: [Movie!]!
  topMovies(limit: Int = 5): [Movie!]!
}
```

**subgraphs/movies/index.js:**

```javascript
const { ApolloServer } = require('@apollo/server');
const { startStandaloneServer } = require('@apollo/server/standalone');
const { buildSubgraphSchema } = require('@apollo/subgraph');
const { readFileSync } = require('fs');
const gql = require('graphql-tag');

const movies = [
  { id: '101', title: 'Inception', releaseYear: 2010, genre: 'Sci-Fi', duration: 148 },
  { id: '102', title: 'The Dark Knight', releaseYear: 2008, genre: 'Action', duration: 152 },
  { id: '103', title: 'Interstellar', releaseYear: 2014, genre: 'Sci-Fi', duration: 169 },
  { id: '104', title: 'Pulp Fiction', releaseYear: 1994, genre: 'Crime', duration: 154 },
  { id: '105', title: 'The Matrix', releaseYear: 1999, genre: 'Sci-Fi', duration: 136 },
];

const typeDefs = gql(readFileSync('./schema.graphql', 'utf-8'));

const resolvers = {
  Query: {
    movie: (_, { id }) => movies.find(m => m.id === id),
    movies: () => movies,
    topMovies: (_, { limit }) => movies.slice(0, limit),
  },
  Movie: {
    __resolveReference: (reference) => {
      return movies.find(m => m.id === reference.id);
    },
  },
};

const server = new ApolloServer({
  schema: buildSubgraphSchema({ typeDefs, resolvers }),
});

startStandaloneServer(server, { listen: { port: 4002 } })
  .then(({ url }) => console.log(`🎬 Movies service ready at ${url}`));
```

Start it up:

```bash
node index.js
```

Port 4002. Movies service running. Now for the interesting one.

---

## BUILDING THE REVIEWS SUBGRAPH [10:30 - 14:00]

This is where Federation really shines. The Reviews service needs to reference both Users and Movies — entities it doesn't own.

```bash
cd ../reviews
npm init -y
npm install @apollo/server @apollo/subgraph graphql graphql-tag
```

**subgraphs/reviews/schema.graphql:**

```graphql
extend schema
  @link(
    url: "https://specs.apollo.dev/federation/v2.7"
    import: ["@key"]
  )

# Entity stubs — we reference these but don't own them
type User @key(fields: "id") {
  id: ID!
  reviews: [Review!]!
}

type Movie @key(fields: "id") {
  id: ID!
  reviews: [Review!]!
  averageRating: Float
}

# This is OUR entity
type Review @key(fields: "id") {
  id: ID!
  rating: Int!
  comment: String
  author: User!
  movie: Movie!
  createdAt: String!
}

type Query {
  review(id: ID!): Review
  recentReviews(limit: Int = 10): [Review!]!
}

type Mutation {
  createReview(input: CreateReviewInput!): Review!
}

input CreateReviewInput {
  movieId: ID!
  rating: Int!
  comment: String
}
```

[Pause]

Look at what we're doing here. We're defining User and Movie types again, but we're only including the fields we need: the `id` for identification, plus the fields we're *adding* — `reviews` and `averageRating`.

```graphql
type User @key(fields: "id") {
  id: ID!
  reviews: [Review!]!  # We're adding this field
}
```

We're saying: "The Reviews service contributes a `reviews` field to the User type." When you query a User and ask for their reviews, the Router knows to call our service for that field.

[Pause]

This is called **entity extension**. In Federation 2, you don't need the `extend` keyword — just define the type with `@key` and add your fields.

Now the resolver:

**subgraphs/reviews/index.js:**

```javascript
const { ApolloServer } = require('@apollo/server');
const { startStandaloneServer } = require('@apollo/server/standalone');
const { buildSubgraphSchema } = require('@apollo/subgraph');
const { readFileSync } = require('fs');
const gql = require('graphql-tag');

const reviews = [
  { id: 'r1', rating: 5, comment: 'Mind-bending masterpiece!', authorId: '1', movieId: '101', createdAt: '2024-06-01' },
  { id: 'r2', rating: 5, comment: 'Best superhero movie ever', authorId: '2', movieId: '102', createdAt: '2024-06-05' },
  { id: 'r3', rating: 4, comment: 'Visually stunning', authorId: '1', movieId: '103', createdAt: '2024-06-10' },
  { id: 'r4', rating: 5, comment: 'A classic that aged perfectly', authorId: '3', movieId: '104', createdAt: '2024-06-15' },
  { id: 'r5', rating: 4, comment: 'Changed cinema forever', authorId: '2', movieId: '105', createdAt: '2024-06-20' },
  { id: 'r6', rating: 4, comment: 'Great rewatch value', authorId: '3', movieId: '101', createdAt: '2024-06-25' },
];

const typeDefs = gql(readFileSync('./schema.graphql', 'utf-8'));

const resolvers = {
  Query: {
    review: (_, { id }) => reviews.find(r => r.id === id),
    recentReviews: (_, { limit }) => reviews.slice(0, limit),
  },
  Mutation: {
    createReview: (_, { input }) => {
      const newReview = {
        id: `r${reviews.length + 1}`,
        ...input,
        authorId: '1', // Hardcoded for demo — normally from auth context
        createdAt: new Date().toISOString().split('T')[0],
      };
      reviews.push(newReview);
      return newReview;
    },
  },
  Review: {
    __resolveReference: (reference) => {
      return reviews.find(r => r.id === reference.id);
    },
    // Return entity references — Router resolves the full objects
    author: (review) => ({ __typename: 'User', id: review.authorId }),
    movie: (review) => ({ __typename: 'Movie', id: review.movieId }),
  },
  // Extend User with reviews
  User: {
    reviews: (user) => reviews.filter(r => r.authorId === user.id),
  },
  // Extend Movie with reviews and averageRating
  Movie: {
    reviews: (movie) => reviews.filter(r => r.movieId === movie.id),
    averageRating: (movie) => {
      const movieReviews = reviews.filter(r => r.movieId === movie.id);
      if (movieReviews.length === 0) return null;
      const sum = movieReviews.reduce((acc, r) => acc + r.rating, 0);
      return sum / movieReviews.length;
    },
  },
};

const server = new ApolloServer({
  schema: buildSubgraphSchema({ typeDefs, resolvers }),
});

startStandaloneServer(server, { listen: { port: 4003 } })
  .then(({ url }) => console.log(`⭐ Reviews service ready at ${url}`));
```

[Pause]

Here's the clever part. Look at the `author` resolver:

```javascript
author: (review) => ({ __typename: 'User', id: review.authorId }),
```

We're not fetching the full User. We're just returning an **entity reference** — a tiny object with `__typename` and the key field. The Router sees this and says: "Oh, I need the full User? Let me call the Users service."

This is the decoupling that makes Federation powerful. The Reviews service doesn't need to know anything about usernames or emails. It just knows "this review was written by user ID 2." Period.

Start the service:

```bash
node index.js
```

Port 4003. All three subgraphs are running.

---

## SETTING UP APOLLO ROUTER [14:00 - 16:00]

Now we need to stitch these together. We'll use the Apollo Router — it's written in Rust, it's fast, and it's what Netflix uses in production.

First, we need Rover CLI to compose our supergraph schema:

```bash
npm install -g @apollo/rover
```

Create the composition config in your root folder:

**supergraph.yaml:**

```yaml
federation_version: =2.7.0

subgraphs:
  users:
    routing_url: http://localhost:4001
    schema:
      file: ./subgraphs/users/schema.graphql
  movies:
    routing_url: http://localhost:4002
    schema:
      file: ./subgraphs/movies/schema.graphql
  reviews:
    routing_url: http://localhost:4003
    schema:
      file: ./subgraphs/reviews/schema.graphql
```

Now compose the supergraph:

```bash
rover supergraph compose --config ./supergraph.yaml > supergraph.graphql
```

This creates a `supergraph.graphql` file — the combined schema with routing instructions.

[Pause]

Now download the Router:

```bash
curl -sSL https://router.apollo.dev/download/nix/latest | sh
```

Create a minimal router config:

**router.yaml:**

```yaml
supergraph:
  listen: 127.0.0.1:4000
  introspection: true

sandbox:
  enabled: true

include_subgraph_errors:
  all: true

cors:
  allow_any_origin: true
```

Start the Router:

```bash
./router --config router.yaml --supergraph supergraph.graphql
```

[Pause]

Open `http://localhost:4000` in your browser. You'll see Apollo Sandbox with your complete, unified schema.

---

## THE "AHA!" MOMENT [16:00 - 17:30]

Here's where it gets good. Try this query:

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

[Pause]

Look at what just happened.

One query. But it hit three different services:
1. **Users service** — for `id`, `username`, `email`
2. **Reviews service** — for `reviews`, `rating`, `comment`, and `averageRating`
3. **Movies service** — for `title` and `releaseYear`

The client has no idea this is three services. It's one graph. One query. One response.

[Pause]

Let me show you something even cooler. Try this:

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

Movies → Reviews → Users. The Router figured out the execution order, made the calls, and stitched it all together.

This is Federation. This is what Netflix does at scale.

---

## COMMON MISTAKE CALLOUT [17:30 - 18:00]

Before I wrap up, here's a mistake I see beginners make all the time:

Forgetting to use `buildSubgraphSchema`.

```javascript
// ❌ WRONG
const server = new ApolloServer({
  typeDefs,
  resolvers,
});

// ✅ CORRECT
const server = new ApolloServer({
  schema: buildSubgraphSchema({ typeDefs, resolvers }),
});
```

Without `buildSubgraphSchema`, your subgraph doesn't expose the `_entities` field, and the Router can't do entity resolution. Your queries will fail with cryptic errors. Don't skip this.

---

## WRAP-UP & NEXT STEPS [18:00 - 18:30]

That's it. You now have a working federated GraphQL API.

The full code is on GitHub — link in the description. Clone it, run `npm install && npm start`, and you're up in seconds.

[Pause]

In Part 2, we'll add a real database, implement DataLoader to solve the N+1 problem, and talk about authentication across services. That's where things get really interesting.

If this helped, smash that like button, subscribe, and I'll see you in the next one.

---

## PRODUCTION NOTES

### Visuals & Animations

**[0:00 - 1:30] Hook**
- Brief flash of Netflix architecture diagram from previous video (callback)
- Text overlay: "Part 2: Hands-On Tutorial"
- Show final running demo briefly (teaser)

**[1:30 - 2:30] Architecture Overview**
- Simple 3-box diagram: Users, Movies, Reviews
- Arrows showing relationships
- Apollo Router in the center as traffic cop

**[2:30 - 4:30] Project Setup**
- Screen recording of terminal commands
- Show folder structure building out
- Highlight key files as they're created

**[4:30 - 8:00] Users Subgraph**
- Code editor with syntax highlighting
- Highlight `@link` directive (call out Federation 2)
- Highlight `@key` directive with annotation
- Highlight `__resolveReference` with explanation callout
- Show Apollo Sandbox query execution

**[10:30 - 14:00] Reviews Subgraph**
- Split screen: schema on left, resolver on right
- Animate entity reference flow (Review → { __typename, id } → Router → Users service)
- This is the key educational moment — take time here

**[16:00 - 17:30] The "Aha!" Moment**
- Show query in Sandbox
- Animate execution flow across services
- Maybe a simple sequence diagram showing Router calls

**[17:30 - 18:00] Common Mistake**
- Red X on wrong code, green checkmark on correct
- Keep it quick — don't dwell

### Pacing Notes
- **4:30 - 8:00**: This section teaches core concepts. Don't rush. Let pauses breathe.
- **8:00 - 10:30**: Movies is similar to Users — move faster, reference that it's the same pattern.
- **10:30 - 14:00**: Reviews is the meat. This is where Federation clicks. Take time on entity references.
- **16:00 - 17:30**: This is the payoff. Build excitement. The "one query, three services" moment should feel magical.

### B-Roll Suggestions
- Terminal commands executing
- Code appearing character-by-character (subtle typing effect)
- Sandbox queries running
- Architecture diagrams animating

---

## GITHUB REPO STRUCTURE

```
netflix-federation/
├── README.md
├── package.json
├── supergraph.yaml
├── router.yaml
├── start.sh                 # Script to start all services
├── subgraphs/
│   ├── users/
│   │   ├── index.js
│   │   ├── schema.graphql
│   │   └── package.json
│   ├── movies/
│   │   ├── index.js
│   │   ├── schema.graphql
│   │   └── package.json
│   └── reviews/
│       ├── index.js
│       ├── schema.graphql
│       └── package.json
└── .gitignore
```

**start.sh:**
```bash
#!/bin/bash
echo "Starting Users service..."
(cd subgraphs/users && node index.js) &

echo "Starting Movies service..."
(cd subgraphs/movies && node index.js) &

echo "Starting Reviews service..."
(cd subgraphs/reviews && node index.js) &

sleep 2

echo "Composing supergraph..."
rover supergraph compose --config ./supergraph.yaml > supergraph.graphql

echo "Starting Apollo Router..."
./router --config router.yaml --supergraph supergraph.graphql
```

**README.md should include:**
- Prerequisites (Node.js 20+, Rover CLI)
- Quick start: `./start.sh`
- Example queries to try
- Link to YouTube video
- Part 2 teaser

---

## YOUTUBE METADATA

### Title Options
1. "Build GraphQL Federation from Scratch — Netflix-Style Architecture (Hands-On Tutorial)"
2. "GraphQL Federation Tutorial: Build a Netflix-Style API in 18 Minutes"
3. "How to Build GraphQL Federation — The Netflix Way (Practical Guide)"

### Description
```
🔥 Build a federated GraphQL API from scratch — the same architecture Netflix uses to serve billions of requests.

This is Part 2 of my Netflix GraphQL series. In Part 1, we explored the concepts. Now we're building it ourselves.

📚 What You'll Learn:
• Setting up Federation 2 subgraphs with Apollo Server
• Understanding the @key directive and entity references
• How __resolveReference works across services
• Composing subgraphs with Rover CLI
• Running Apollo Router locally
• Writing queries that span multiple services

⏱️ Timestamps:
0:00 - Intro & What We're Building
1:30 - Architecture Overview
2:30 - Project Setup
4:30 - Building Users Subgraph (@key explained)
8:00 - Building Movies Subgraph
10:30 - Building Reviews Subgraph (entity references)
14:00 - Setting Up Apollo Router
16:00 - The "Aha!" Moment — Cross-Service Queries
17:30 - Common Mistake to Avoid
18:00 - Wrap-up & Next Steps

🔗 Resources:
• GitHub Repo: [LINK]
• Part 1 — Netflix GraphQL Explainer: [LINK]
• Apollo Federation Docs: https://www.apollographql.com/docs/federation/

💻 Tech Stack:
• Apollo Server 4
• Apollo Federation 2 (@apollo/subgraph)
• Apollo Router (Rust-based)
• Rover CLI
• Node.js / JavaScript

📺 Coming in Part 2:
• Adding PostgreSQL
• DataLoader & the N+1 Problem
• Authentication Across Services

👍 If this helped, like & subscribe for more system design content!

#GraphQL #Federation #Apollo #SystemDesign #Netflix #Backend #Microservices
```

### Tags
```
graphql, graphql federation, apollo federation, apollo router, apollo server, microservices, system design, netflix architecture, api design, backend development, nodejs, javascript, rover cli, graphql tutorial, federated graphql, entity resolution, subgraph, supergraph, graphql schema, distributed systems, api gateway
```

### Timestamps (for YouTube chapter markers)
```
0:00 - Intro & What We're Building
1:30 - Architecture Overview
2:30 - Project Setup
4:30 - Building Users Subgraph
8:00 - Building Movies Subgraph  
10:30 - Building Reviews Subgraph
14:00 - Setting Up Apollo Router
16:00 - Cross-Service Queries Demo
17:30 - Common Mistake to Avoid
18:00 - Wrap-up & Next Steps
```
