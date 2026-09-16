CREATE TABLE `automationTasks` (
	`id` int AUTO_INCREMENT NOT NULL,
	`leadId` int NOT NULL,
	`type` varchar(80) NOT NULL,
	`status` enum('pending','sent','cancelled','failed') NOT NULL DEFAULT 'pending',
	`sendAt` timestamp NOT NULL,
	`payload` text,
	`attempts` int NOT NULL DEFAULT 0,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `automationTasks_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `webhookSources` (
	`id` int AUTO_INCREMENT NOT NULL,
	`ownerOpenId` varchar(64) NOT NULL,
	`name` varchar(120) NOT NULL,
	`source` varchar(80) NOT NULL DEFAULT 'Form webhook',
	`tokenHash` varchar(128) NOT NULL,
	`enabled` boolean NOT NULL DEFAULT true,
	`lastReceivedAt` timestamp,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `webhookSources_id` PRIMARY KEY(`id`),
	CONSTRAINT `webhookSources_tokenHash_unique` UNIQUE(`tokenHash`)
);
--> statement-breakpoint
ALTER TABLE `leads` ADD `instagramHandle` varchar(120);--> statement-breakpoint
ALTER TABLE `leads` ADD `consentAt` timestamp;