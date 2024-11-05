import { expect } from 'chai';
import path from 'path';
import { homedir } from 'os';
import { fileURLToPath } from 'url';
import { PathName, expandHomeDir, getDirPath, getPath, PathUtil } from '../src/path-util.js';

describe('PathUtil', () => {
  describe('expandHomeDir', () => {
    it('should expand ~ to home directory', () => {
      const inputPath = '~/test';
      const expectedPath = path.join(homedir(), 'test');
      expect(expandHomeDir(inputPath)).to.equal(expectedPath);
    });

    it('should return the same path if it does not start with ~', () => {
      const inputPath = '/test/path';
      expect(expandHomeDir(inputPath)).to.equal(inputPath);
    });

    it('should throw TypeError if input is not a string', () => {
      expect(() => expandHomeDir(123)).to.throw(TypeError, 'Input must be a string');
    });
  });

  describe('getDirPath', () => {
    it('should return home directory for "home"', () => {
      expect(getDirPath('home')).to.equal(homedir());
    });

    it('should return root directory for "root"', () => {
      const expectedPath = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
      expect(getDirPath('root')).to.equal(expectedPath);
    });

    it('should return test directory for "test"', () => {
      const expectedPath = path.join(path.dirname(fileURLToPath(import.meta.url)), '../test');
      expect(getDirPath('test')).to.equal(expectedPath);
    });

    it('should return graphql directory for "graphql"', () => {
      const expectedPath = path.join(
        path.dirname(fileURLToPath(import.meta.url)),
        '../src/github/graphql'
      );
      expect(getDirPath('graphql')).to.equal(expectedPath);
    });

    it('should return empty string for unknown pathName', () => {
      expect(getDirPath('unknown')).to.equal('');
    });
  });

  describe('getPath', () => {
    it('should return path with trailer for known pathName', () => {
      const expectedPath = path.join(homedir(), 'trailer');
      expect(getPath('home', 'trailer')).to.equal(expectedPath);
    });

    it('should return root path with trailer if pathName is null', () => {
      const expectedPath = path.join(
        path.dirname(fileURLToPath(import.meta.url)),
        '..',
        'config.json'
      );
      expect(getPath(null, 'config.json')).to.equal(expectedPath);
    });

    it('should return path without trailer if not provided', () => {
      const expectedPath = homedir();
      expect(getPath('home')).to.equal(expectedPath);
    });
  });

  describe('PathUtil constants', () => {
    it('should have correct CONFIG_FILE_PATH', () => {
      const expectedPath = path.join(
        path.dirname(fileURLToPath(import.meta.url)),
        '..',
        'config.json'
      );
      expect(PathUtil.CONFIG_FILE_PATH).to.equal(expectedPath);
    });
  });
});
