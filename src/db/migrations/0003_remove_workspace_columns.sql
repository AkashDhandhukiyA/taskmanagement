PRAGMA foreign_keys=OFF;
--> statement-breakpoint
CREATE TABLE `__new_projects` (
	`id` text PRIMARY KEY NOT NULL,
	`company_id` text NOT NULL,
	`name` text NOT NULL,
	`description` text,
	`color` text DEFAULT '#6366f1' NOT NULL,
	`created_at` text NOT NULL,
	FOREIGN KEY (`company_id`) REFERENCES `companies`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
INSERT INTO `__new_projects` (`id`, `company_id`, `name`, `description`, `color`, `created_at`)
SELECT `id`, COALESCE(`company_id`, `workspace_id`), `name`, `description`, `color`, `created_at`
FROM `projects`;
--> statement-breakpoint
DROP TABLE `projects`;
--> statement-breakpoint
ALTER TABLE `__new_projects` RENAME TO `projects`;
--> statement-breakpoint
CREATE TABLE `__new_audit_log` (
	`id` text PRIMARY KEY NOT NULL,
	`company_id` text NOT NULL,
	`user_id` text NOT NULL,
	`entity_type` text NOT NULL,
	`entity_id` text NOT NULL,
	`entity_name` text,
	`action` text NOT NULL,
	`changes` text,
	`created_at` text NOT NULL,
	FOREIGN KEY (`company_id`) REFERENCES `companies`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
INSERT INTO `__new_audit_log` (`id`, `company_id`, `user_id`, `entity_type`, `entity_id`, `entity_name`, `action`, `changes`, `created_at`)
SELECT `id`, COALESCE(`company_id`, `workspace_id`), `user_id`, `entity_type`, `entity_id`, `entity_name`, `action`, `changes`, `created_at`
FROM `audit_log`;
--> statement-breakpoint
DROP TABLE `audit_log`;
--> statement-breakpoint
ALTER TABLE `__new_audit_log` RENAME TO `audit_log`;
--> statement-breakpoint
PRAGMA foreign_keys=ON;
