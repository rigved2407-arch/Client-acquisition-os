CREATE TABLE `followUpSequences` (
	`id` int AUTO_INCREMENT NOT NULL,
	`ownerOpenId` varchar(64) NOT NULL,
	`name` varchar(160) NOT NULL,
	`trigger` varchar(80) NOT NULL DEFAULT 'qualified',
	`enabled` boolean NOT NULL DEFAULT true,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `followUpSequences_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `followUpSteps` (
	`id` int AUTO_INCREMENT NOT NULL,
	`sequenceId` int NOT NULL,
	`position` int NOT NULL,
	`delayMinutes` int NOT NULL DEFAULT 0,
	`channel` enum('email','sms','task') NOT NULL DEFAULT 'email',
	`subject` varchar(220),
	`body` text NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `followUpSteps_id` PRIMARY KEY(`id`)
);
