const { ApolloServer } = require('@apollo/server');
const { startStandaloneServer } = require('@apollo/server/standalone');
const { buildSubgraphSchema } = require('@apollo/subgraph');
const { readFileSync } = require('fs');
const gql = require('graphql-tag');
const path = require('path');

// In-memory data
const users = [
  { id: '1', username: 'alice', email: 'alice@bytemonk.com', createdAt: '2024-01-15' },
  { id: '2', username: 'bob', email: 'bob@bytemonk.com', createdAt: '2024-02-20' },
  { id: '3', username: 'charlie', email: 'charlie@bytemonk.com', createdAt: '2024-03-10' },
  { id: '4', username: 'diana', email: 'diana@bytemonk.com', createdAt: '2024-04-05' },
  { id: '5', username: 'eve', email: 'eve@bytemonk.com', createdAt: '2024-05-12' },
];

const typeDefs = gql(readFileSync(path.join(__dirname, 'schema.graphql'), 'utf-8'));

const resolvers = {
  Query: {
    me: () => users[0],
    user: (_, { id }) => users.find(u => u.id === id),
    users: () => users,
  },
  User: {
    __resolveReference: (reference) => {
      return users.find(u => u.id === reference.id);
    },
  },
};

const server = new ApolloServer({
  schema: buildSubgraphSchema({ typeDefs, resolvers }),
});

startStandaloneServer(server, { listen: { port: 4001 } })
  .then(({ url }) => console.log(`🚀 Users service ready at ${url}`))
  .catch((err) => {
    console.error('Failed to start Users service:', err);
    process.exit(1);
  });

