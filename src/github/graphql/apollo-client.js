import { ApolloClient, InMemoryCache, HttpLink } from '@apollo/client';

class ApolloClientWrapper {
  constructor(token, uri) {
    const httpLink = new HttpLink({
      uri,
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });
    this._client = new ApolloClient({
      link: httpLink,
      cache: new InMemoryCache(),
    });
  }

  get client() {
    return this._client;
  }
}

export default ApolloClientWrapper;
