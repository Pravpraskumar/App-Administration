import { ConflictException, NotFoundException } from '@nestjs/common';

export const GLOBAL_ORGANISATION_NAME = 'Global Organisation';
export const GLOBAL_ORGANISATION_SLUG = 'global';

export function resolveDefaultOrganisationId(configuredOrgId: string | null, globalOrgId: string | null): string {
  const orgId = configuredOrgId ?? globalOrgId;
  if (!orgId) throw new NotFoundException('Global Organisation is not configured');
  return orgId;
}

export function assertOrganisationMembershipCanBeRemoved(orgSlug: string): void {
  if (orgSlug === GLOBAL_ORGANISATION_SLUG) {
    throw new ConflictException('Global Organisation membership cannot be removed; delete the user to remove this assignment');
  }
}