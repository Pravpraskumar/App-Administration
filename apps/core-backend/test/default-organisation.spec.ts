import assert from 'node:assert/strict';
import test from 'node:test';
import { ConflictException, NotFoundException } from '@nestjs/common';
import {
  assertOrganisationMembershipCanBeRemoved,
  GLOBAL_ORGANISATION_SLUG,
  resolveDefaultOrganisationId,
} from '../src/organisations/organisation-policy';

test('uses the configured default organisation and falls back to Global Organisation', () => {
  assert.equal(resolveDefaultOrganisationId('configured-org', 'global-org'), 'configured-org');
  assert.equal(resolveDefaultOrganisationId(null, 'global-org'), 'global-org');
});

test('requires a configured or seeded Global Organisation', () => {
  assert.throws(() => resolveDefaultOrganisationId(null, null), NotFoundException);
});

test('protects Global Organisation membership from unlinking', () => {
  assert.throws(
    () => assertOrganisationMembershipCanBeRemoved(GLOBAL_ORGANISATION_SLUG),
    ConflictException,
  );
  assert.doesNotThrow(() => assertOrganisationMembershipCanBeRemoved('another-org'));
});