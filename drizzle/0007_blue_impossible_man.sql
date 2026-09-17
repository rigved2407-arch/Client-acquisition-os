ALTER TABLE `leads` ADD `replyAt` timestamp;--> statement-breakpoint
ALTER TABLE `leads` ADD `automationPaused` boolean DEFAULT false NOT NULL;