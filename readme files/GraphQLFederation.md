# Apollo Federation 2 Tutorial Guide: Building Netflix-Style APIs

**production-ready Federation 2 patterns.** Apollo Router v2.x has fully replaced the JavaScript Gateway with 10x better performance, and Federation 2.7+ introduces progressive migration capabilities. This comprehensive guide covers everything needed for a 15-20 minute hands-on video building a Users, Movies, Reviews federated API.

---

## Essential setup for Federation 2 subgraphs

Every Federation 2 subgraph requires the `@apollo/subgraph` package (current version **2.12.1**) and must declare Federation 2 at the top of its schema via the `@link` directive—without this declaration, schemas default to Federation 1 behavior.

**Installation:**
```bash
npm install @apollo/server @apollo/subgraph graphql graphql-tag
```

**Critical schema header (required for Fed 2):**
```graphql
extend schema
  @link(
    url: "https://specs.apollo.dev/federation/v2.7"
    import: ["@key", "@shareable", "@external", "@requires", "@provides"]
  )
```

The `buildSubgraphSchema()` function transforms schemas into federation-ready subgraphs. A common beginner mistake is forgetting this function and passing `typeDefs` and `resolvers` directly to ApolloServer.

**Correct subgraph server setup:**
```typescript
import { ApolloServer } from '@apollo/server';
import { startStandaloneServer } from '@apollo/server/standalone';
import { buildSubgraphSchema } from '@apollo/subgraph';
import gql from 'graphql-tag';

const server = new ApolloServer({
  schema: buildSubgraphSchema({ typeDefs, resolvers }),
});

const { url } = await startStandaloneServer(server, { listen: { port: 4001 } });
```

---

## Federation 2 directives with practical examples

### @key — Entity identification
The `@key` directive designates a type as an entity and specifies the fields that uniquely identify it across the supergraph.

```graphql
# Simple key
type User @key(fields: "id") {
  id: ID!
  username: String!
}

# Compound key (multiple fields)
type Review @key(fields: "movieId authorId") {
  movieId: ID!
  authorId: ID!
  rating: Int!
}

# Multiple keys (for different lookup patterns)
type Movie @key(fields: "id") @key(fields: "slug") {
  id: ID!
  slug: String!
  title: String!
}

# Non-resolvable key (entity stub pattern)
type Movie @key(fields: "id", resolvable: false) {
  id: ID!
}
```

### @shareable — Multiple resolvers for same field
Federation 2 changed a key default: fields can only be resolved by one subgraph unless explicitly marked `@shareable`. This catches accidental field collisions but requires intentional marking for shared value types.

```graphql
# Type-level (applies to all fields)
type GeoCoordinates @shareable {
  latitude: Float!
  longitude: Float!
}

# Field-level
type Position {
  x: Int! @shareable
  y: Int! @shareable
}
```

**Key fields (`id` in `@key(fields: "id")`) are automatically shareable**—no directive needed.

### @external, @requires, @provides — Cross-subgraph field access
```graphql
# @requires - Computed field needing data from another subgraph
type Product @key(fields: "id") {
  id: ID!
  price: Float! @external
  weight: Int! @external
  shippingEstimate: Float! @requires(fields: "price weight")
}

# @provides - Hint that a field CAN be resolved at a specific path
type Review @key(fields: "id") {
  id: ID!
  product: Product @provides(fields: "name")
}
```

### @override — Field migration between subgraphs
Federation 2.7 introduced progressive override for zero-downtime migrations:

```graphql
# Migrate 25% of traffic to new subgraph
type Product @key(fields: "id") {
  id: ID!
  inventory: Int! @override(from: "Products", label: "percent(25)")
}
```

---

## Entity reference resolvers demystified

Every entity that contributes fields needs a `__resolveReference` resolver. This is called **only when the router needs to fetch entity fields across subgraph boundaries**—not when querying the entity's home subgraph directly.

**Implementation pattern:**
```typescript
const resolvers = {
  User: {
    // representation contains { __typename: "User", id: "123" }
    __resolveReference(representation, context) {
      return context.dataSources.users.findById(representation.id);
    },
  },
  // For entities you reference but don't own, return stubs:
  Review: {
    author: (review) => ({ __typename: 'User', id: review.authorId }),
    movie: (review) => ({ __typename: 'Movie', id: review.movieId }),
  },
};
```

**Testing entity resolution directly:**
```graphql
query {
  _entities(representations: [{ __typename: "User", id: "1" }]) {
    ... on User {
      id
      username
    }
  }
}
```

---

## Apollo Router installation and configuration

Apollo Router (written in Rust) replaced the JavaScript Gateway with **10x faster query planning**, **60% less CPU consumption**, and **~13% memory usage**. Router v1.60+ no longer supports Federation 1 supergraphs.

**Installation:**
```bash
# Download latest binary
curl -sSL https://router.apollo.dev/download/nix/latest | sh

# Or specific version for CI stability
curl -sSL https://router.apollo.dev/download/nix/v2.9.0 | sh
```

**Development router.yaml:**
```yaml
supergraph:
  listen: 127.0.0.1:4000
  introspection: true

sandbox:
  enabled: true

homepage:
  enabled: false

include_subgraph_errors:
  all: true  # Show errors in development

cors:
  allow_any_origin: true  # Only for development!

health_check:
  listen: 127.0.0.1:8088
```

**Production differences:** Set `introspection: false`, `sandbox.enabled: false`, specify explicit CORS origins, and set `include_subgraph_errors.all: false`.

---

## Rover CLI for schema composition

Rover (current version **v0.37+**) handles local supergraph composition and GraphOS integration.

**Installation:**
```bash
curl -sSL https://rover.apollo.dev/nix/latest | sh
# Or via npm
npm i -g @apollo/rover
```

**supergraph.yaml for local composition:**
```yaml
federation_version: =2.7.0

subgraphs:
  users:
    routing_url: http://localhost:4001/graphql
    schema:
      file: ./subgraphs/users/schema.graphql
  movies:
    routing_url: http://localhost:4002/graphql
    schema:
      file: ./subgraphs/movies/schema.graphql
  reviews:
    routing_url: http://localhost:4003/graphql
    schema:
      file: ./subgraphs/reviews/schema.graphql
```

**Local development workflow:**
```bash
# 1. Start subgraph services (separate terminals)
cd subgraphs/users && npm start    # Port 4001
cd subgraphs/movies && npm start   # Port 4002
cd subgraphs/reviews && npm start  # Port 4003

# 2. Compose supergraph schema
rover supergraph compose --config ./supergraph.yaml > supergraph.graphql

# 3. Start router with hot reload
./router --dev --config router.yaml --supergraph supergraph.graphql --hot-reload

# OR use rover dev (all-in-one with auto-recomposition)
rover dev --supergraph-config ./supergraph.yaml --router-config ./router.yaml
```

---

## Netflix-style project structure for tutorials

**Recommended monorepo layout:**
```
netflix-api/
├── supergraph.yaml          # Subgraph composition config
├── router.yaml              # Router configuration
├── supergraph.graphql       # Generated (don't commit)
├── subgraphs/
│   ├── users/
│   │   ├── src/
│   │   │   ├── index.ts     # Server entry
│   │   │   ├── schema.graphql
│   │   │   ├── resolvers.ts
│   │   │   └── data.ts      # Mock data
│   │   └── package.json
│   ├── movies/
│   │   └── (same structure)
│   └── reviews/
│       └── (same structure)
└── package.json             # Workspace root
```

---

## Complete example schemas for your tutorial

### Users subgraph (owns User)
```graphql
extend schema @link(
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

### Movies subgraph (owns Movie)
```graphql
extend schema @link(
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
  topMovies(limit: Int = 10): [Movie!]!
}
```

### Reviews subgraph (owns Review, extends User and Movie)
```graphql
extend schema @link(
  url: "https://specs.apollo.dev/federation/v2.7"
  import: ["@key"]
)

# Entity stubs - minimal definitions
type User @key(fields: "id") {
  id: ID!
  reviews: [Review!]!  # Field contributed by this subgraph
}

type Movie @key(fields: "id") {
  id: ID!
  reviews: [Review!]!
  averageRating: Float
}

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

---

## In-memory data patterns for demos

**reviews/resolvers.ts:**
```typescript
export const resolvers = {
  Query: {
    review: (_, { id }) => findReviewById(id),
    recentReviews: (_, { limit }) => reviews.slice(0, limit),
  },
  Review: {
    __resolveReference: ({ id }) => findReviewById(id),
    // Return entity references - router resolves full objects
    author: (review) => ({ __typename: 'User', id: review.authorId }),
    movie: (review) => ({ __typename: 'Movie', id: review.movieId }),
  },
  // Extend User with reviews field
  User: {
    reviews: (user) => reviews.filter(r => r.authorId === user.id),
  },
  // Extend Movie with reviews and computed averageRating
  Movie: {
    reviews: (movie) => reviews.filter(r => r.movieId === movie.id),
    averageRating: (movie) => {
      const movieReviews = reviews.filter(r => r.movieId === movie.id);
      if (!movieReviews.length) return null;
      return movieReviews.reduce((sum, r) => sum + r.rating, 0) / movieReviews.length;
    },
  },
};
```

---

## Top 10 beginner mistakes to cover

1. **Missing `@link` directive** — Schema silently uses Federation 1 semantics
2. **Forgetting `buildSubgraphSchema()`** — Subgraph doesn't expose `_entities` field
3. **Using `@apollo/federation` instead of `@apollo/subgraph`** — Wrong package for Fed 2
4. **INVALID_FIELD_SHARING error** — Forgot `@shareable` on fields resolved by multiple subgraphs
5. **Not implementing `__resolveReference`** — Entity resolution fails silently
6. **Returning wrong data from `__resolveReference`** — Should return full entity, not just ID
7. **Using `extend type` unnecessarily** — Federation 2 doesn't require `extend` for entity stubs
8. **Marking `@key` fields as `@external`** — Not needed in Federation 2
9. **CORS configuration panic** — Can't combine `allow_any_origin: true` with `allow_credentials: true`
10. **Wrong `federation_version` format** — Use `=2.7.0` (exact) not `2.7.0` (minimum)

---

## Key differences from Federation 1

| Federation 1 | Federation 2 |
|--------------|--------------|
| No schema declaration needed | `@link` directive required |
| `extend type Product @key(...)` | `type Product @key(...)` (no extend) |
| `id: ID! @external` for key fields | Key fields don't need `@external` |
| All value types automatically shared | `@shareable` required for shared fields |
| No field migration support | `@override` with progressive rollout |

---

## Recent 2024-2025 updates worth mentioning

**Federation v2.9 (August 2024):** Demand control with `@cost` and `@listSize` directives for query complexity analysis.

**Federation v2.10 (February 2025):** Apollo Connectors with `@connect` and `@source` directives—enables REST API integration directly in schema without resolver code.

**Router v2.x:** Native Rust query planner replaces JavaScript, delivering **10x median performance improvement** and **7x better p99 latency**.

**Critical deprecation:** Router v1.60+ **no longer supports Federation 1 supergraphs**. All new projects should use Federation 2.

---

## Quick debugging checklist

When schema won't compose:
- Verify `@link` directive at top of each subgraph
- Check `@shareable` on shared fields
- Run `rover supergraph compose` for detailed errors

When entity resolution fails:
- Test `_entities` query directly on subgraph
- Log `__resolveReference` input and output
- Verify `@key` fields match between subgraphs

When router won't start:
- Validate YAML syntax
- Check port 4000 availability
- Verify supergraph.graphql path

**Enable query plan debugging:**
```yaml
# router.yaml
plugins:
  experimental.expose_query_plan: true
```
Then add header `Apollo-Expose-Query-Plan: true` to see execution plans.

---

## Recommended versions for your tutorial

| Component | Version |
|-----------|---------|
| Node.js | 20+ LTS |
| TypeScript | 5.x |
| @apollo/server | 4.x |
| @apollo/subgraph | 2.12.x |
| Apollo Router | 2.9.x |
| Rover CLI | 0.37+ |
| Federation spec | v2.7 |

This stack represents current best practices as of December 2025 and ensures viewers learn patterns that will remain relevant.