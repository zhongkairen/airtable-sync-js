import { expect } from 'chai';
import path from 'path';
import { homedir } from 'os';
import { fileURLToPath } from 'url';
import { PathUtil, $path } from '../src/path-util.js';
import exp from 'constants';

describe('PathUtil', () => {
  const testDir = path.dirname(fileURLToPath(import.meta.url));
  const makePath = (relativePath = '') => path.join(testDir, '..', relativePath);

  describe('expandHomeDir', () => {
    it('should expand ~ to home directory', () => {
      const inputPath = '~/test';
      const expectedPath = path.join(homedir(), 'test');
      expect(PathUtil.expandHomeDir(inputPath)).to.equal(expectedPath);
    });

    it('should return the same path if it does not start with ~', () => {
      const inputPath = '/test/path';
      expect(PathUtil.expandHomeDir(inputPath)).to.equal(inputPath);
    });

    it('should throw TypeError if input is not a string', () => {
      expect(() => PathUtil.expandHomeDir(123)).to.throw(TypeError, 'Input must be a string');
    });
  });

  describe('get dir', () => {
    it('should return home directory for "home"', () => {
      expect(PathUtil.dir.home).to.equal(homedir());
    });

    it('should return root directory for "packageRoot"', () => {
      const expectedPath = makePath();
      expect(PathUtil.dir.packageRoot).to.equal(expectedPath);
    });

    it('should return test directory for "test"', () => {
      const expectedPath = makePath('test');
      expect(PathUtil.dir.test).to.equal(expectedPath);
    });

    it('should return graphql directory for "graphql"', () => {
      const expectedPath = makePath('src/github/graphql');
      expect(PathUtil.dir.graphql).to.equal(expectedPath);
    });

    it('should return graphql directory for "cwd"', () => {
      const expectedPath = process.cwd();
      expect(PathUtil.dir.cwd).to.equal(expectedPath);
    });
  });

  describe('path', () => {
    it('should return path with trailer for known pathName', () => {
      const expectedPath = path.join(homedir(), 'trailer');
      expect($path`home/trailer`).to.equal(expectedPath);
    });

    it('should return root path with file name with extension', () => {
      const expectedPath = path.join(testDir, '../config.json');
      expect($path`packageRoot/config.json`).to.equal(expectedPath);
    });

    it('should return home path with variable filename', () => {
      const expectedPath = path.join(homedir(), 'myfile.txt');
      const myfile = 'myfile.txt';
      expect($path`home${myfile}`).to.equal(expectedPath);
    });

    it('should return path with named dir, variable and file extension', () => {
      const expectedPath = makePath('src/github/graphql/myfile.graphql');
      const myfile = 'myfile';
      expect($path`graphql/${myfile}.graphql`).to.equal(expectedPath);
    });
  });

  describe('file', () => {
    it('should have correct config.json', () => {
      const expectedPath = makePath('config.json');
      expect(PathUtil.file.configJson).to.equal(expectedPath);
    });
  });

  describe('findFirstExistingFile', () => {
    it('should return the first existing', () => {
      const dirs = ['path/to/dir1', 'path/to/dir2', 'path/to/dir3'];
      const fsMock = {
        existsSync: (fullPath) => fullPath === 'path/to/dir2/file.txt',
      };

      expect(PathUtil.findFirstExistingFile(dirs, 'file.txt', fsMock)).to.equal(
        'path/to/dir2/file.txt'
      );
    });

    it('should return the first existing when put last', () => {
      const dirs = ['path/to/dir1', 'path/to/dir2', 'path/to/dir3'];
      const fsMock = {
        existsSync: (fullPath) => fullPath === 'path/to/dir3/file.txt',
      };

      expect(PathUtil.findFirstExistingFile(dirs, 'file.txt', fsMock)).to.equal(
        'path/to/dir3/file.txt'
      );
    });

    it('should return the first existing when all exists', () => {
      const dirs = ['path/to/dir1', 'path/to/dir2', 'path/to/dir3'];
      const fsMock = {
        existsSync: (fullPath) => true,
      };

      expect(PathUtil.findFirstExistingFile(dirs, 'file.txt', fsMock)).to.equal(
        'path/to/dir1/file.txt'
      );
    });

    it('should return the undefined if none exists', () => {
      const dirs = ['path/to/dir1', 'path/to/dir2', 'path/to/dir3'];
      const fsMock = {
        existsSync: () => false,
      };

      expect(PathUtil.findFirstExistingFile(dirs, 'file.txt', fsMock)).to.be.undefined;
    });
  });
});
