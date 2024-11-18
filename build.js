import esbuild from 'esbuild';
import { glob } from 'glob';
import { execSync } from 'child_process';
import fs from 'fs/promises';
import path from 'path';
import process from 'process';

async function copyFileEnsureDir(srcFile, destFile) {
  const destDirPath = path.dirname(destFile);
  // Ensure the destination directory exists
  await fs.mkdir(destDirPath, { recursive: true });
  // Copy the file
  await fs.copyFile(srcFile, destFile);
}

async function copyFiles(srcFiles, destDir) {
  const copyPromises = srcFiles.map(async (srcFile) => {
    const stripDir = srcFile.startsWith('src') ? 'src' : '.';
    const relPath = path.relative(stripDir, srcFile);
    const dstFile = path.join(destDir, relPath);
    await copyFileEnsureDir(srcFile, dstFile);
  });

  // Wait for all file copies to complete concurrently
  await Promise.all(copyPromises);
}

// Create a wrapper function to use async/await
async function build(buildDir) {
  console.log('Building...');
  await fs.rm(buildDir, { recursive: true, force: true });
  await fs.mkdir(buildDir, { recursive: true });
  console.log(`Cleaned '${buildDir}' folder.`);

  // Get all .js files in src directory asynchronously
  const jsFiles = await glob('src/**/*.js');

  console.log('Building JS files...', jsFiles);

  if (jsFiles.length === 0) {
    console.log('No .js files found.');
    process.exit(1);
  }

  console.log('Original size:');
  console.log(execSync('du -sh src').toString());

  // Run esbuild with all files found by glob
  await esbuild.build({
    entryPoints: jsFiles,
    outdir: buildDir,
    minify: true,
    sourcemap: false, // no map files, thank you
  });

  // Copy other files
  const graphqlFiles = await glob('src/**/graphql/*.graphql');
  const docFiles = await glob('doc/*.md');
  const packageFiles = ['package.json', 'README.md', 'CHANGELOG.md', 'example.config.json'];
  const otherFiles = [...graphqlFiles, ...packageFiles, ...docFiles];
  await copyFiles(otherFiles, buildDir);
  console.log('Copying other files...', otherFiles);

  console.log('Build completed successfully.');
  console.log(execSync(`du -sh ${buildDir}`).toString());
}

const args = process.argv.slice(2); // Skip the first two elements (node and script name)
const buildDir = args[0] || 'build';
build(buildDir);
