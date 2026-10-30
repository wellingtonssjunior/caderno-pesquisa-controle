import { sqliteTable, text, integer } from 'drizzle-orm/sqlite-core';
export const entries = sqliteTable('entries', { id: text('id').primaryKey(), value: text('value').notNull(), updatedAt: text('updated_at').notNull() });
export const authSessions = sqliteTable('auth_sessions', {id:text('id').primaryKey(),expiresAt:integer('expires_at').notNull(),credentialVersion:text('credential_version').notNull()});
export const authAttempts = sqliteTable('auth_attempts', {id:text('id').primaryKey(),attempts:integer('attempts').notNull(),resetAt:integer('reset_at').notNull()});
