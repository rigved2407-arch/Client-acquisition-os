CREATE TABLE `appointments` (
	`id` int AUTO_INCREMENT NOT NULL,
	`leadId` int NOT NULL,
	`ownerOpenId` varchar(64) NOT NULL,
	`provider` varchar(40) NOT NULL DEFAULT 'google',
	`providerEventId` varchar(320) NOT NULL,
	`startsAt` timestamp NOT NULL,
	`endsAt` timestamp NOT NULL,
	`inviteeName` varchar(160) NOT NULL,
	`inviteeEmail` varchar(320) NOT NULL,
	`status` enum('confirmed','cancelled') NOT NULL DEFAULT 'confirmed',
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `appointments_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `calendarConnections` (
	`id` int AUTO_INCREMENT NOT NULL,
	`ownerOpenId` varchar(64) NOT NULL,
	`provider` varchar(40) NOT NULL DEFAULT 'google',
	`calendarId` varchar(320) NOT NULL DEFAULT 'primary',
	`calendarName` varchar(180),
	`accessToken` text NOT NULL,
	`refreshToken` text NOT NULL,
	`tokenExpiresAt` timestamp NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `calendarConnections_id` PRIMARY KEY(`id`),
	CONSTRAINT `calendarConnections_ownerOpenId_unique` UNIQUE(`ownerOpenId`)
);
