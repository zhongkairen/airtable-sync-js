import { expect } from 'chai';
import sinon from 'sinon';
import GitHubGqlClient from '../src/github/graphql-client.js';
import { GraphQLClient } from 'graphql-request';

describe('GitHubGqlClient', () => {
  let token;
  let mock;
  let client;

  before(() => {
    process.env.NODE_ENV = 'test';
  });

  beforeEach(() => {
    token = 'test-token';
    mock = {
      loadGql: sinon.stub(),
      gqlClient: sinon.createStubInstance(GraphQLClient),
    };
    client = new GitHubGqlClient(token, mock);
  });

  it('should make a GraphQL request with the given query and variables', async () => {
    const queryName = 'testQuery';
    const variables = { test: 'variable' };
    const gqlQuery = 'query { test }';
    const response = { data: 'testData' };

    mock.loadGql.withArgs(queryName).returns(gqlQuery);
    mock.gqlClient.request.withArgs(gqlQuery, variables).resolves(response);

    const result = await client.query(queryName, variables);

    expect(result).to.equal(response);
    expect(mock.loadGql.calledOnceWith(queryName)).to.be.true;
    expect(mock.gqlClient.request.calledOnceWith(gqlQuery, variables)).to.be.true;
  });

  it('should cache the loaded query', async () => {
    const queryName = 'testQuery';
    const variables = { test: 'variable' };
    const gqlQuery = 'query { test }';
    const response = { data: 'testData' };

    mock.loadGql.withArgs(queryName).returns(gqlQuery);
    mock.gqlClient.request.withArgs(gqlQuery, variables).resolves(response);

    await client.query(queryName, variables);
    await client.query(queryName, variables);

    expect(mock.loadGql.calledOnceWith(queryName)).to.be.true;
    expect(mock.gqlClient.request.calledTwice).to.be.true;
  });
});
