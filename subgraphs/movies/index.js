const { ApolloServer } = require('@apollo/server');
const { startStandaloneServer } = require('@apollo/server/standalone');
const { buildSubgraphSchema } = require('@apollo/subgraph');
const { readFileSync } = require('fs');
const gql = require('graphql-tag');
const path = require('path');

const movies = [
  { 
    id: '101', 
    title: 'Inception', 
    releaseYear: 2010, 
    genre: 'Sci-Fi', 
    duration: 148,
    poster: 'https://images.unsplash.com/photo-1489599849927-2ee91cede3ba?w=300',
    description: 'A mind-bending heist thriller about entering people\'s dreams.'
  },
  { 
    id: '102', 
    title: 'The Dark Knight', 
    releaseYear: 2008, 
    genre: 'Action', 
    duration: 152,
    poster: 'https://images.unsplash.com/photo-1534447677768-be436bb09401?w=300',
    description: 'Batman faces the Joker in this epic crime thriller.'
  },
  { 
    id: '103', 
    title: 'Interstellar', 
    releaseYear: 2014, 
    genre: 'Sci-Fi', 
    duration: 169,
    poster: 'https://images.unsplash.com/photo-1446776877081-d282a0f896e2?w=300',
    description: 'A team of explorers travel through a wormhole in space.'
  },
  { 
    id: '104', 
    title: 'Pulp Fiction', 
    releaseYear: 1994, 
    genre: 'Crime', 
    duration: 154,
    poster: 'https://images.unsplash.com/photo-1489599849927-2ee91cede3ba?w=300',
    description: 'The lives of two mob hitmen, a boxer, and others intertwine.'
  },
  { 
    id: '105', 
    title: 'The Matrix', 
    releaseYear: 1999, 
    genre: 'Sci-Fi', 
    duration: 136,
    poster: 'https://images.unsplash.com/photo-1534447677768-be436bb09401?w=300',
    description: 'A computer hacker learns about the true nature of reality.'
  },
  { 
    id: '106', 
    title: 'Fight Club', 
    releaseYear: 1999, 
    genre: 'Drama', 
    duration: 139,
    poster: 'https://images.unsplash.com/photo-1489599849927-2ee91cede3ba?w=300',
    description: 'An insomniac office worker and a devil-may-care soapmaker form an underground fight club.'
  },
  { 
    id: '107', 
    title: 'The Shawshank Redemption', 
    releaseYear: 1994, 
    genre: 'Drama', 
    duration: 142,
    poster: 'https://images.unsplash.com/photo-1534447677768-be436bb09401?w=300',
    description: 'Two imprisoned men bond over a number of years, finding solace and eventual redemption.'
  },
  { 
    id: '108', 
    title: 'The Godfather', 
    releaseYear: 1972, 
    genre: 'Crime', 
    duration: 175,
    poster: 'https://images.unsplash.com/photo-1446776877081-d282a0f896e2?w=300',
    description: 'The aging patriarch of an organized crime dynasty transfers control to his reluctant son.'
  },
];

const typeDefs = gql(readFileSync(path.join(__dirname, 'schema.graphql'), 'utf-8'));

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
  .then(({ url }) => console.log(`🎬 Movies service ready at ${url}`))
  .catch((err) => {
    console.error('Failed to start Movies service:', err);
    process.exit(1);
  });

