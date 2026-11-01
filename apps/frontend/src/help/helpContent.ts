export type HelpCategory = 'Get started' | 'Organisation administration' | 'Global administration';

export interface HelpSection {
  title: string;
  content: string;
  steps?: string[];
  note?: string;
}

export interface HelpTopic {
  id: string;
  category: HelpCategory;
  title: string;
  summary: string;
  sections: HelpSection[];
}

export const helpTopics: HelpTopic[] = [
  {
    id: 'getting-started', category: 'Get started', title: 'Getting started', summary: 'Sign in, select an organisation, and understand the workspace.',
    sections: [
      { title: 'Sign in', content: 'Use the authentication option provided by your organisation. Local sign-in can remember your email address, but never stores your password.' },
      { title: 'Choose your organisation', content: 'Your selected organisation controls the administration data and screens you can access.', steps: ['If you belong to one organisation, it is selected automatically.', 'If you belong to several, choose one before entering the workspace.', 'Use the organisation selector in the header to switch context.'] },
      { title: 'Use the workspace', content: 'The header provides contextual Help, theme controls, language, and organisation selection. The sidebar contains the administration screens granted by your roles.' },
    ],
  },
  {
    id: 'account-settings', category: 'Get started', title: 'Account and preferences', summary: 'Maintain your profile, password, and personal appearance.',
    sections: [
      { title: 'Profile', content: 'Account Settings lets you update your name and other personal profile fields.' },
      { title: 'Password', content: 'Local accounts can change their password. Externally managed identities follow their identity provider process.' },
      { title: 'Appearance', content: 'Use the palette button in the header to change mode, color preset, brand color, and corner radius for your account.' },
      { title: 'Delete account', content: 'Account deletion is permanent and should be used only when organisational and audit obligations permit it.', note: 'Contact an administrator when retained business records still reference your account.' },
    ],
  },
  {
    id: 'organisation-administration', category: 'Organisation administration', title: 'Organisation administration', summary: 'Manage members, teams, projects, and organisation context.',
    sections: [
      { title: 'Members', content: 'Add existing platform users to the organisation, set Owner/Admin/Member authority, control active status, and assign projects.' },
      { title: 'Teams', content: 'Create teams, select active organisation members, and associate product modules when access should be team-restricted.' },
      { title: 'Projects', content: 'Allocate licensed product seats to organisation projects. Project-scoped products require a valid allocation before users can open them.' },
      { title: 'Settings', content: 'Review and maintain the selected organisation’s details where your membership permits it.' },
    ],
  },
  {
    id: 'global-users-access', category: 'Global administration', title: 'Users, roles, and access', summary: 'Create identities and grant least-privilege application access.',
    sections: [
      { title: 'Global Users', content: 'Create and maintain local identities. Creating an account does not itself grant product access.' },
      { title: 'User Assignments', content: 'Assign global or product roles and manage status. Organisation membership, module allocation, and product role are separate access controls.' },
      { title: 'Roles', content: 'Define roles and assign menu access modes. Menu visibility improves navigation but backend authorization remains the security boundary.' },
      { title: 'User Settings', content: 'Inspect profile, notification preferences, effective organisations, roles, modules, projects, teams, and recent sessions.' },
    ],
  },
  {
    id: 'global-platform', category: 'Global administration', title: 'Platform configuration', summary: 'Manage organisations, projects, modules, connections, sessions, and site settings.',
    sections: [
      { title: 'Organisations and projects', content: 'Maintain the global tenant and project catalogs before assigning members or product capacity.' },
      { title: 'Module Assignments', content: 'Assign products and licensed seat counts to organisations. Allocation controls availability and concurrent use.' },
      { title: 'Product Connections', content: 'Configure each product database connection. Passwords are encrypted and are not returned after save.' },
      { title: 'Sessions', content: 'Monitor active administration and product leases. Use session information to investigate occupied seats.' },
      { title: 'Site Settings', content: 'Configure defaults, session timeout, branding, banners, and ordered SMTP profiles.' },
    ],
  },
  {
    id: 'global-email', category: 'Global administration', title: 'Email templates and delivery', summary: 'Configure event messages and investigate delivery failures.',
    sections: [
      { title: 'Email Templates', content: 'Select a product event, edit its subject and body, and insert only the placeholders listed for that event. Unknown placeholders are rejected.' },
      { title: 'SMTP', content: 'Site Settings supports a primary SMTP profile and ordered fallbacks. Test and secure transport settings according to company policy.' },
      { title: 'Delivery Logs', content: 'Filter sent and failed attempts by module and status. Failed attempts can be retried without changing the original business event.', note: 'A retry sends the originally rendered message and does not apply later template edits.' },
    ],
  },
];

const contextualTopics: Array<{ matches: (path: string) => boolean; topicId: string }> = [
  { matches: (path) => path === '/account/settings', topicId: 'account-settings' },
  { matches: (path) => path.startsWith('/org/'), topicId: 'organisation-administration' },
  { matches: (path) => ['/admin/users', '/admin/user-assignments', '/admin/user-settings', '/admin/roles'].includes(path), topicId: 'global-users-access' },
  { matches: (path) => ['/admin/email-templates', '/admin/email-logs'].includes(path), topicId: 'global-email' },
  { matches: (path) => path.startsWith('/admin/'), topicId: 'global-platform' },
];

export function getContextualHelpTopic(pathname: string) {
  return contextualTopics.find(({ matches }) => matches(pathname))?.topicId ?? 'getting-started';
}