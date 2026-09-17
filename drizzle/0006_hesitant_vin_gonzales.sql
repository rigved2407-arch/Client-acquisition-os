CREATE TABLE `deliverySettings` (
	`id` int AUTO_INCREMENT NOT NULL,
	`ownerOpenId` varchar(64) NOT NULL,
	`provider` enum('none','resend','gmail') NOT NULL DEFAULT 'none',
	`fromEmail` varchar(320),
	`enabled` boolean NOT NULL DEFAULT false,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `deliverySettings_id` PRIMARY KEY(`id`),
	CONSTRAINT `deliverySettings_ownerOpenId_unique` UNIQUE(`ownerOpenId`)
);
--> statement-breakpoint
ALTER TABLE `automationTasks` MODIFY COLUMN `status` enum('pending','sent','blocked','cancelled','failed') NOT NULL DEFAULT 'pending';--> statement-breakpoint
ALTER TABLE `automationTasks` ADD `lastError` text;--> statement-breakpoint
ALTER TABLE `automationTasks` ADD `deliveredAt` timestamp;--> statement-breakpoint
ALTER TABLE `automationTasks` ADD `providerMessageId` varchar(320);