import { expect } from 'chai';
import sinon from 'sinon';
import { GraphQLClient } from 'graphql-request';
import fs from 'fs';
import path from 'path';
import { getPath, PathName } from '../src/path-util.js';
import mock from 'mock-require';

const GraphQLClient_request_stub = sinon.stub().returns('mocked result');
mock('graphql-request', { request: GraphQLClient_request_stub });

const loadGql_stub = sinon.stub().returns('mocked result');
mock('./graphql-loader.js', { loadGql: loadGql_stub });

import GitHubGqlClient from '../src/github/graphql-client.js';

// wip - play around with the mocks, test the class

describe('GitHubGqlClient', () => {
  let uut;
  const token = 'test-token';
  const queryName = '$$test-query';
  const variables = { test: 'variable' };
  const queryResult = { data: 'test' };
  const queryString = 'query { test }';
  const gqlFilePath = getPath(PathName.GRAPHQL, `${queryName}.graphql`);

  // before(() => {
  //   fs.writeFileSync(gqlFilePath, queryString);
  // });

  // after(() => {
  //   fs.unlinkSync(gqlFilePath);
  // });

  beforeEach(() => {
    uut = new GitHubGqlClient(token);
  });

  // describe('constructor', () => {
  //   it('c0 - should initialize with correct headers', () => {
  //     expect(uut._gqlClient).to.be.instanceOf(GraphQLClient);
  //     expect(uut._gqlClient.requestConfig.headers.Authorization).to.equal(`Bearer ${token}`);
  //   });
  // });

  describe('_loadQuery && _getQuery', () => {
    it('a1 - should load query from file', () => {
      const readFileSyncStub = sinon.stub().returns(queryString);

      const uut = new GitHubGqlClient(token, readFileSyncStub);
      const gqlQuery = uut._loadQuery(queryName);
      expect(readFileSyncStub.calledOnceWith(gqlFilePath)).to.be.true;
      expect(gqlQuery.loc.source.body.trim()).to.equal(queryString);
    });

    it('a2 - should cache loaded queries', () => {
      const loadQueryStub = sinon.stub(uut, '_loadQuery').returns(queryString);
      const firstCall = uut._getQuery(queryName);
      const secondCall = uut._getQuery(queryName);
      expect(loadQueryStub.calledOnce).to.be.true;
      expect(firstCall).to.equal(secondCall);
      loadQueryStub.restore();
    });
  });

  describe('query', () => {
    it('b1 - should send a query request and return data', async () => {
      const requestStub = sinon.stub(uut._gqlClient, 'request').resolves(queryResult);
      const result = await uut.query(queryName, variables);
      expect(requestStub.calledOnceWith(sinon.match.any, variables)).to.be.true;
      expect(result).to.equal(queryResult);
      requestStub.restore();
    });
  });
});
