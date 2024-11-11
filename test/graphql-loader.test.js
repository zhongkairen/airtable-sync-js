import { expect } from 'chai';
import sinon from 'sinon';
import { GqlLoader } from '../src/github/graphql-loader.js';
import { PathUtil } from '../src/path-util.js';
import fs from 'fs';
import gql from 'graphql-tag';
import mock from 'mock-require';

describe('GqlLoader', () => {
  let mock;
  let uut;

  before(() => {
    process.env.NODE_ENV = 'test';
  });

  beforeEach(() => {
    process.env.NODE_ENV = 'test';
    mock = {
      readFileSync: sinon.stub(),
      $path: sinon.stub(),
    };
  });

  afterEach(() => {
    sinon.restore();
  });

  it('should not throw an error if mock is provided in test environment', () => {
    expect(() => new GqlLoader('testQuery', {})).to.not.throw();
  });

  it('should throw an error if mock is provided in production environment implicit', () => {
    process.env.NODE_ENV = undefined;
    expect(() => new GqlLoader('testQuery', {})).to.throw();
  });

  it('should throw an error if mock is provided in production environment explicit', () => {
    process.env.NODE_ENV = 'production';
    expect(() => new GqlLoader('testQuery', {})).to.throw();
  });

  it('should load the query from the file system', () => {
    // Given a query file
    const mockQuery = 'query { test }';
    mock.$path.returns('/path/to/testQuery.graphql');
    mock.readFileSync.returns(mockQuery);

    // When loading the query
    uut = new GqlLoader('testQuery', mock);
    const query = uut.qglQuery;

    expect(mock.$path.calledOnce).to.be.true;
    expect(mock.readFileSync.calledOnceWithExactly('/path/to/testQuery.graphql', 'utf8')).to.be
      .true;
    expect(query).to.deep.equal(gql`
      ${mockQuery}
    `);
  });
});
