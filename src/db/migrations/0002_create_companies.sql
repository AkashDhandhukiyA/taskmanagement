CREATE TABLE `companies` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`timezone` text DEFAULT 'UTC' NOT NULL,
	`industry` text,
	`size` text,
	`logo` text,
	`website` text,
	`owner_id` text NOT NULL,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL,
	FOREIGN KEY (`owner_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `company_members` (
	`id` text PRIMARY KEY NOT NULL,
	`company_id` text NOT NULL,
	`user_id` text NOT NULL,
	`role` text DEFAULT 'member' NOT NULL,
	`job_title` text,
	`created_at` text NOT NULL,
	FOREIGN KEY (`company_id`) REFERENCES `companies`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
INSERT OR IGNORE INTO `companies` (`id`, `name`, `timezone`, `industry`, `size`, `logo`, `website`, `owner_id`, `created_at`, `updated_at`)
SELECT `id`, `name`, 'UTC', 'Technology', '1-10', NULL, NULL, `owner_id`, `created_at`, `created_at`
FROM `workspaces`;
--> statement-breakpoint
INSERT OR IGNORE INTO `company_members` (`id`, `company_id`, `user_id`, `role`, `job_title`, `created_at`)
SELECT `id`, `workspace_id`, `user_id`, `role`, 'Team Member', datetime('now')
FROM `workspace_members`;
--> statement-breakpoint
ALTER TABLE `projects` ADD COLUMN `company_id` text REFERENCES `companies`(`id`) ON DELETE cascade;
--> statement-breakpoint
UPDATE `projects` SET `company_id` = `workspace_id` WHERE `company_id` IS NULL;
--> statement-breakpoint
ALTER TABLE `audit_log` ADD COLUMN `company_id` text REFERENCES `companies`(`id`) ON DELETE cascade;
--> statement-breakpoint
UPDATE `audit_log` SET `company_id` = `workspace_id` WHERE `company_id` IS NULL;
