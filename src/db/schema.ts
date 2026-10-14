import { sqliteTable, text } from 'drizzle-orm/sqlite-core';
import { relations } from 'drizzle-orm';

export const users = sqliteTable('users', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  email: text('email').notNull().unique(),
  password: text('password').notNull(),
  avatar: text('avatar'),
  preferences: text('preferences'), // JSON string: { notifications, defaults, theme }
  twoFactorSecret: text('two_factor_secret'),
  createdAt: text('created_at').notNull().$defaultFn(() => new Date().toISOString()),
});

export const companies = sqliteTable('companies', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  timezone: text('timezone').notNull().default('UTC'),
  industry: text('industry'),
  size: text('size'),
  logo: text('logo'),
  website: text('website'),
  ownerId: text('owner_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  createdAt: text('created_at').notNull().$defaultFn(() => new Date().toISOString()),
  updatedAt: text('updated_at').notNull().$defaultFn(() => new Date().toISOString()),
});

export const companyMembers = sqliteTable('company_members', {
  id: text('id').primaryKey(),
  companyId: text('company_id').notNull().references(() => companies.id, { onDelete: 'cascade' }),
  userId: text('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  role: text('role').notNull().default('member'), // owner | admin | member
  jobTitle: text('job_title'),
  createdAt: text('created_at').notNull().$defaultFn(() => new Date().toISOString()),
});

export const projects = sqliteTable('projects', {
  id: text('id').primaryKey(),
  companyId: text('company_id').notNull().references(() => companies.id, { onDelete: 'cascade' }),
  name: text('name').notNull(),
  description: text('description'),
  color: text('color').notNull().default('#6366f1'),
  createdAt: text('created_at').notNull().$defaultFn(() => new Date().toISOString()),
});

export const tasks = sqliteTable('tasks', {
  id: text('id').primaryKey(),
  projectId: text('project_id').notNull().references(() => projects.id, { onDelete: 'cascade' }),
  title: text('title').notNull(),
  description: text('description'),
  priority: text('priority').notNull().default('medium'), // low | medium | high | urgent
  status: text('status').notNull().default('todo'), // todo | in_progress | review | done
  assignedTo: text('assigned_to').references(() => users.id, { onDelete: 'set null' }),
  dueDate: text('due_date'),
  createdAt: text('created_at').notNull().$defaultFn(() => new Date().toISOString()),
  updatedAt: text('updated_at').notNull().$defaultFn(() => new Date().toISOString()),
});

export const comments = sqliteTable('comments', {
  id: text('id').primaryKey(),
  taskId: text('task_id').notNull().references(() => tasks.id, { onDelete: 'cascade' }),
  userId: text('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  message: text('message').notNull(),
  createdAt: text('created_at').notNull().$defaultFn(() => new Date().toISOString()),
});

export const auditLog = sqliteTable('audit_log', {
  id: text('id').primaryKey(),
  companyId: text('company_id')
    .notNull()
    .references(() => companies.id, { onDelete: 'cascade' }),
  userId: text('user_id')
    .notNull()
    .references(() => users.id, { onDelete: 'cascade' }),
  // Category of change: 'task' | 'project' | 'company' | 'member' | 'comment'
  entityType: text('entity_type').notNull(),
  // ID of the row that changed (e.g. task id, project id)
  entityId: text('entity_id').notNull(),
  // Human-friendly name at time of change (e.g. task title)
  entityName: text('entity_name'),
  // 'create' | 'update' | 'delete'
  action: text('action').notNull(),
  // JSON string with before/after values for updates
  changes: text('changes'),
  createdAt: text('created_at').notNull().$defaultFn(() => new Date().toISOString()),
});

// Backward-compatibility exports during migration
export const workspaces = companies;
export const workspaceMembers = companyMembers;

// Relations
export const usersRelations = relations(users, ({ many }) => ({
  ownedCompanies: many(companies),
  companyMemberships: many(companyMembers),
  assignedTasks: many(tasks),
  comments: many(comments),
  auditEntries: many(auditLog),
}));

export const companiesRelations = relations(companies, ({ one, many }) => ({
  owner: one(users, {
    fields: [companies.ownerId],
    references: [users.id],
  }),
  members: many(companyMembers),
  projects: many(projects),
  auditEntries: many(auditLog),
}));

export const companyMembersRelations = relations(companyMembers, ({ one }) => ({
  company: one(companies, {
    fields: [companyMembers.companyId],
    references: [companies.id],
  }),
  user: one(users, {
    fields: [companyMembers.userId],
    references: [users.id],
  }),
}));

export const projectsRelations = relations(projects, ({ one, many }) => ({
  company: one(companies, {
    fields: [projects.companyId],
    references: [companies.id],
  }),
  tasks: many(tasks),
}));

export const tasksRelations = relations(tasks, ({ one, many }) => ({
  project: one(projects, {
    fields: [tasks.projectId],
    references: [projects.id],
  }),
  assignee: one(users, {
    fields: [tasks.assignedTo],
    references: [users.id],
  }),
  comments: many(comments),
}));

export const commentsRelations = relations(comments, ({ one }) => ({
  task: one(tasks, {
    fields: [comments.taskId],
    references: [tasks.id],
  }),
  user: one(users, {
    fields: [comments.userId],
    references: [users.id],
  }),
}));

export const auditLogRelations = relations(auditLog, ({ one }) => ({
  company: one(companies, {
    fields: [auditLog.companyId],
    references: [companies.id],
  }),
  user: one(users, {
    fields: [auditLog.userId],
    references: [users.id],
  }),
}));

