#!/usr/bin/env node
'use strict';

/**
 * Hotfix runner for the guarded song-catalog migration.
 *
 * v1 selected the correct canonical survivor but generated delete operations
 * from `group.slice(1)`. When the best survivor was not the first element of
 * the original group, the migration could schedule the survivor itself for
 * deletion and leave a legacy variant behind.
 *
 * Keep the audited v1 source intact for rollback reproducibility and patch the
 * single faulty expression in-memory for v2. The guard below deliberately
 * fails if the audited source changes and the patch no longer matches exactly.
 */
const fs = require('fs');
const path = require('path');
const Module = require('module');

const filename = path.resolve(__dirname, 'migrate-song-catalog.cjs');
const buggy = 'for(const loser of group.slice(1)){';
const fixed = 'for(const loser of ranked.filter(item=>item.id!==survivor.id)){';

const source = fs.readFileSync(filename, 'utf8');
const occurrences = source.split(buggy).length - 1;
if (occurrences !== 1) {
  throw new Error(`Expected exactly one audited v1 delete-loop occurrence, found ${occurrences}.`);
}

const patched = source.replace(buggy, fixed);
const migrationModule = new Module(filename, module);
migrationModule.filename = filename;
migrationModule.paths = Module._nodeModulePaths(path.dirname(filename));
migrationModule._compile(patched, filename);
