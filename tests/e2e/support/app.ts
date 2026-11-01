import type { Page, Route } from '@playwright/test';
import type { MenuNode } from '@platform/shared';

export const user = {
  id: 'user-1',
  b2cOid: '',
  email: 'admin@example.test',
  displayName: 'Ada Admin',
  globalRoles: ['Global Administrator'],
};

export const organisation = {
  id: 'org-1',
  name: 'Global Organisation',
  slug: 'global',
  status: 'active',
  membership: 'Owner',
};

const products = [
  { id: 'product-1', code: 'external-module', name: 'External module', description: 'External module configuration', isActive: true },
];

export const emailDeliveryLog = {
  id: 'email-log-1',
  orgId: organisation.id,
  module: 'External module',
  eventType: 'System notification',
  referenceId: 'reference-1',
  recipientName: 'Ada Admin',
  recipientEmail: user.email,
  subject: 'System notification',
  status: 'Sent',
  smtpConfigurationId: 'smtp-1',
  smtpConfigurationName: 'Global SMTP',
  providerMessageId: 'message-1',
  errorMessage: null,
  initiatedBy: user.id,
  sentAt: '2026-09-02T00:00:01.000Z',
  createdAt: '2026-09-02T00:00:00.000Z',
};

const emailTemplate = {
  id: 'template-1',
  productId: 'product-1',
  productCode: 'external-module',
  productName: 'External module',
  eventKey: 'system-notification',
  eventName: 'System Notification',
  subjectTemplate: 'Notice {{referenceId}}',
  bodyTemplate: 'Hello {{recipientName}}, reference {{referenceId}}.',
  availablePlaceholders: ['recipientName', 'referenceId'],
  updatedAt: '2026-09-02T00:00:00.000Z',
};

const profile = {
  id: user.id,
  firstName: 'Ada',
  lastName: 'Admin',
  displayName: user.displayName,
  email: user.email,
  username: 'ada.admin',
  hasPassword: true,
};

const settings = {
  id: 'settings-1',
  defaultOrgId: organisation.id,
  sessionTimeoutMinutes: 30,
  headerColor: '#ffffff',
  headerTextColor: '#0f172a',
  bannerEnabled: false,
  bannerBgColor: '#1e3a8a',
  bannerTextColor: '#ffffff',
  bannerContent: '',
};

function json(route: Route, body: unknown, status = 200) {
  return route.fulfill({ status, contentType: 'application/json', body: JSON.stringify(body) });
}

function bodyFor(url: URL, method: string): unknown {
  const path = url.pathname.replace(/^\/api/, '');

  if (path === '/settings/banner') return { enabled: false, bgColor: '#1e3a8a', textColor: '#ffffff', content: null };
  if (path === '/account/theme') return { mode: 'light', preset: 'slate', radius: 6, brandColor: '#2563eb' };
  if (path === '/account') return profile;
  if (path === '/organisations/mine') return [organisation];
  if (path === '/organisations') return [];
  if (path === '/products') return products;
  if (path === '/menus/mine' || path === '/menus') return [];
  if (path === '/notifications/email-logs') return [emailDeliveryLog];
  if (path === '/notifications/email-templates') return [emailTemplate];
  if (/\/products\/[^/]+\/connection$/.test(path)) return null;
  if (/\/modules\/[^/]+\/projects$/.test(path)) {
    return { projectRequired: false, lastProjectId: null, projects: [] };
  }
  if (/\/project-modules$/.test(path)) return { modules: [], projects: [], allocations: [] };
  if (/\/team-projects$/.test(path)) return { projects: [], assignments: [] };
  if (/\/available-users$/.test(path) || /\/team$/.test(path)) return [];
  if (/\/teams$/.test(path)) return { teams: [], members: [], modules: [] };
  if (path === '/settings') return settings;
  if (path === '/roles' || path.endsWith('/menus') || path === '/users/roles') return [];
  if (path === '/projects' || path === '/projects/managers') return [];
  if (path === '/users') return [];
  if (/\/users\/[^/]+\/settings$/.test(path)) return null;
  if (path === '/sessions' && method === 'GET') return [];
  if (path === '/sessions' || path === '/sessions/administration') return { id: 'session-1' };
  if (path.includes('/heartbeat')) return {};
  return {};
}

export async function mockApp(page: Page, options: { menus?: MenuNode[] } = {}) {
  await page.route('**/api/**', (route) => {
    const url = new URL(route.request().url());
    if (url.pathname.replace(/^\/api/, '') === '/menus/mine' && options.menus) {
      return json(route, options.menus);
    }
    return json(route, bodyFor(url, route.request().method()));
  });
}

export async function authenticate(page: Page, currentUser = user) {
  await page.addInitScript(({ currentUser, currentOrg }) => {
    const payload = btoa(JSON.stringify({ exp: Math.floor(Date.now() / 1000) + 3600 }));
    localStorage.setItem('platformAuthToken', `header.${payload}.signature`);
    localStorage.setItem('platformAuthUser', JSON.stringify(currentUser));
    localStorage.setItem('selectedOrgId', JSON.stringify(currentOrg));
  }, { currentUser, currentOrg: organisation });
}

export async function setupAuthenticatedApp(page: Page, options: { menus?: MenuNode[]; currentUser?: typeof user } = {}) {
  await authenticate(page, options.currentUser);
  await mockApp(page, options);
}
