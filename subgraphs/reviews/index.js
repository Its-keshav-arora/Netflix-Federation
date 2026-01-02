const { ApolloServer } = require('@apollo/server');
const { startStandaloneServer } = require('@apollo/server/standalone');
const { buildSubgraphSchema } = require('@apollo/subgraph');
const { readFileSync } = require('fs');
const gql = require('graphql-tag');
const path = require('path');

const reviews = [
  { id: 'r1', rating: 5, comment: 'Mind-bending masterpiece! The concept is incredible.', authorId: '1', movieId: '101', createdAt: '2024-06-01' },
  { id: 'r2', rating: 5, comment: 'Best superhero movie ever made. Heath Ledger was phenomenal.', authorId: '2', movieId: '102', createdAt: '2024-06-05' },
  { id: 'r3', rating: 4, comment: 'Visually stunning and emotionally powerful. A journey through space and time.', authorId: '1', movieId: '103', createdAt: '2024-06-10' },
  { id: 'r4', rating: 5, comment: 'A classic that aged perfectly. Tarantino at his finest.', authorId: '3', movieId: '104', createdAt: '2024-06-15' },
  { id: 'r5', rating: 4, comment: 'Changed cinema forever. The visual effects still hold up.', authorId: '2', movieId: '105', createdAt: '2024-06-20' },
  { id: 'r6', rating: 4, comment: 'Great rewatch value. Every viewing reveals something new.', authorId: '3', movieId: '101', createdAt: '2024-06-25' },
  { id: 'r7', rating: 5, comment: 'An absolute classic. The plot twists are mind-blowing.', authorId: '4', movieId: '106', createdAt: '2024-07-01' },
  { id: 'r8', rating: 5, comment: 'One of the greatest films ever made. Powerful storytelling.', authorId: '5', movieId: '107', createdAt: '2024-07-05' },
  { id: 'r9', rating: 5, comment: 'The Godfather of all crime films. Masterful direction.', authorId: '1', movieId: '108', createdAt: '2024-07-10' },
  { id: 'r10', rating: 4, comment: 'Dark and thought-provoking. A must-watch for film lovers.', authorId: '2', movieId: '106', createdAt: '2024-07-15' },
];

const typeDefs = gql(readFileSync(path.join(__dirname, 'schema.graphql'), 'utf-8'));

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
    author: (review) => ({ __typename: 'User', id: review.authorId }),
    movie: (review) => ({ __typename: 'Movie', id: review.movieId }),
  },
  User: {
    reviews: (user) => reviews.filter(r => r.authorId === user.id),
  },
  Movie: {
    reviews: (movie) => reviews.filter(r => r.movieId === movie.id),
    averageRating: (movie) => {
      const movieReviews = reviews.filter(r => r.movieId === movie.id);
      if (movieReviews.length === 0) return null;
      const sum = movieReviews.reduce((acc, r) => acc + r.rating, 0);
      return parseFloat((sum / movieReviews.length).toFixed(2));
    },
  },
};

const server = new ApolloServer({
  schema: buildSubgraphSchema({ typeDefs, resolvers }),
});

startStandaloneServer(server, { listen: { port: 4003 } })
  .then(({ url }) => console.log(`⭐ Reviews service ready at ${url}`))
  .catch((err) => {
    console.error('Failed to start Reviews service:', err);
    process.exit(1);
  });

