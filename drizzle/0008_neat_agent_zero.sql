ALTER TABLE `leads` ADD `phone` varchar(40);--> statement-breakpoint
ALTER TABLE `leads` ADD `consentSource` varchar(120);--> statement-breakpoint
ALTER TABLE `leads` ADD `consentText` text;--> statement-breakpoint
ALTER TABLE `leads` ADD `unsubscribedAt` timestamp;