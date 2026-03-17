-- phpMyAdmin SQL Dump
-- version 5.2.1
-- https://www.phpmyadmin.net/
--
-- Host: localhost:3306
-- Generation Time: Mar 16, 2026 at 08:32 PM
-- Server version: 5.7.23-23
-- PHP Version: 8.1.34

SET SQL_MODE = "NO_AUTO_VALUE_ON_ZERO";
START TRANSACTION;
SET time_zone = "+00:00";


/*!40101 SET @OLD_CHARACTER_SET_CLIENT=@@CHARACTER_SET_CLIENT */;
/*!40101 SET @OLD_CHARACTER_SET_RESULTS=@@CHARACTER_SET_RESULTS */;
/*!40101 SET @OLD_COLLATION_CONNECTION=@@COLLATION_CONNECTION */;
/*!40101 SET NAMES utf8mb4 */;

--
-- Database: `alanchat_the_mortgage_professionals`
--

-- --------------------------------------------------------

--
-- Table structure for table `admin_section_controls`
--

CREATE TABLE `admin_section_controls` (
  `id` int(11) NOT NULL,
  `tenant_id` int(11) NOT NULL DEFAULT '1',
  `section_id` varchar(100) COLLATE utf8mb4_unicode_ci NOT NULL COMMENT 'Matches the id field in the sidebar menu items',
  `is_disabled` tinyint(1) NOT NULL DEFAULT '0',
  `tooltip_message` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'Coming Soon',
  `created_at` datetime DEFAULT CURRENT_TIMESTAMP,
  `updated_at` datetime DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='Controls which admin sidebar sections are disabled and their tooltip messages';

--
-- Dumping data for table `admin_section_controls`
--

INSERT INTO `admin_section_controls` (`id`, `tenant_id`, `section_id`, `is_disabled`, `tooltip_message`, `created_at`, `updated_at`) VALUES
(1, 2, 'dashboard', 0, 'Coming Soon', '2026-02-28 17:35:37', '2026-03-16 19:05:47'),
(2, 2, 'pipeline', 0, 'Coming Soon', '2026-02-28 17:35:37', '2026-03-16 19:05:47'),
(3, 2, 'clients', 0, 'Coming Soon', '2026-02-28 17:35:37', '2026-03-16 19:05:47'),
(4, 2, 'tasks', 0, 'Coming Soon', '2026-02-28 17:35:37', '2026-03-16 19:05:47'),
(5, 2, 'documents', 0, 'Coming Soon', '2026-02-28 17:35:37', '2026-03-16 19:05:47'),
(6, 2, 'communication-templates', 0, 'Coming Soon', '2026-02-28 17:35:37', '2026-03-16 19:05:47'),
(7, 2, 'reminder-flows', 0, 'Coming Soon', '2026-02-28 17:35:37', '2026-03-16 19:05:47'),
(8, 2, 'conversations', 0, 'Coming Soon', '2026-02-28 17:35:37', '2026-03-16 19:05:47'),
(9, 2, 'reports', 0, 'Coming Soon', '2026-02-28 17:35:37', '2026-03-16 19:05:47'),
(10, 2, 'brokers', 0, 'Coming Soon', '2026-02-28 17:35:37', '2026-03-16 19:05:47'),
(11, 2, 'settings', 0, 'Coming Soon', '2026-02-28 17:35:37', '2026-03-16 19:05:47');

-- --------------------------------------------------------

--
-- Table structure for table `application_status_history`
--

CREATE TABLE `application_status_history` (
  `id` int(11) NOT NULL,
  `tenant_id` int(11) NOT NULL DEFAULT '1',
  `application_id` int(11) NOT NULL,
  `from_status` varchar(100) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `to_status` varchar(100) COLLATE utf8mb4_unicode_ci NOT NULL,
  `changed_by_broker_id` int(11) DEFAULT NULL,
  `notes` text COLLATE utf8mb4_unicode_ci,
  `created_at` datetime DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Table structure for table `audit_logs`
--

CREATE TABLE `audit_logs` (
  `id` int(11) NOT NULL,
  `tenant_id` int(11) DEFAULT NULL,
  `user_id` int(11) DEFAULT NULL,
  `broker_id` int(11) DEFAULT NULL,
  `actor_type` enum('user','broker') COLLATE utf8mb4_unicode_ci NOT NULL,
  `action` varchar(100) COLLATE utf8mb4_unicode_ci NOT NULL,
  `entity_type` varchar(50) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `entity_id` int(11) DEFAULT NULL,
  `changes` json DEFAULT NULL,
  `status` enum('success','failure','warning') COLLATE utf8mb4_unicode_ci DEFAULT 'success',
  `error_message` text COLLATE utf8mb4_unicode_ci,
  `request_id` varchar(100) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `duration_ms` int(11) DEFAULT NULL COMMENT 'Request duration in milliseconds',
  `ip_address` varchar(45) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `user_agent` varchar(500) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `created_at` datetime DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Dumping data for table `audit_logs`
--

INSERT INTO `audit_logs` (`id`, `tenant_id`, `user_id`, `broker_id`, `actor_type`, `action`, `entity_type`, `entity_id`, `changes`, `status`, `error_message`, `request_id`, `duration_ms`, `ip_address`, `user_agent`, `created_at`) VALUES
(213, 2, NULL, 1, 'broker', 'view_audit_logs', NULL, NULL, NULL, 'success', NULL, NULL, NULL, '::1', 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/146.0.0.0 Safari/537.36', '2026-03-16 19:23:37');

-- --------------------------------------------------------

--
-- Table structure for table `brokers`
--

CREATE TABLE `brokers` (
  `id` int(11) NOT NULL,
  `tenant_id` int(11) NOT NULL DEFAULT '1',
  `email` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `first_name` varchar(100) COLLATE utf8mb4_unicode_ci NOT NULL,
  `last_name` varchar(100) COLLATE utf8mb4_unicode_ci NOT NULL,
  `phone` varchar(20) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `role` enum('broker','admin') COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'broker',
  `status` enum('active','inactive','suspended') COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'active',
  `email_verified` tinyint(1) DEFAULT '0',
  `last_login` datetime DEFAULT NULL,
  `license_number` varchar(100) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `specializations` json DEFAULT NULL,
  `public_token` varchar(36) COLLATE utf8mb4_unicode_ci NOT NULL COMMENT 'UUID token for public broker share link',
  `created_at` datetime DEFAULT CURRENT_TIMESTAMP,
  `updated_at` datetime DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `created_by_broker_id` int(11) DEFAULT NULL COMMENT 'The admin/Mortgage Banker who created this partner broker'
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Dumping data for table `brokers`
--

INSERT INTO `brokers` (`id`, `tenant_id`, `email`, `first_name`, `last_name`, `phone`, `role`, `status`, `email_verified`, `last_login`, `license_number`, `specializations`, `public_token`, `created_at`, `updated_at`, `created_by_broker_id`) VALUES
(1, 2, 'axgoomez@gmail.com', 'Alex', 'Gomez', NULL, 'admin', 'active', 1, '2026-03-16 19:22:38', NULL, '[\"FHA Loans\"]', '9b99af09-11e1-11f1-83cc-525400bd6b5d', '2026-01-20 18:56:12', '2026-03-16 19:22:38', NULL),
(7, 2, 'hebert@trueduplora.com', 'Hebert', 'Montecinos', NULL, 'admin', 'active', 0, '2026-02-13 00:04:37', NULL, NULL, '9b99c5ad-11e1-11f1-83cc-525400bd6b5d', '2026-02-03 14:59:53', '2026-02-24 18:33:30', NULL),
(13, 2, 'tonatiuh.gom@gmail.com', 'Alex', 'Partner', NULL, 'broker', 'active', 0, NULL, NULL, NULL, '14ebb381-21a8-11f1-896f-525400bd6b5d', '2026-03-16 20:22:01', '2026-03-16 20:22:01', 1);

-- --------------------------------------------------------

--
-- Table structure for table `broker_monthly_metrics`
--

CREATE TABLE `broker_monthly_metrics` (
  `id` int(11) NOT NULL,
  `tenant_id` int(11) NOT NULL DEFAULT '1',
  `broker_id` int(11) DEFAULT NULL COMMENT 'NULL = admin/global goals row; set for partner-scoped manual actuals',
  `year` int(4) NOT NULL,
  `month` int(2) NOT NULL,
  `lead_to_credit_goal` decimal(5,2) DEFAULT '70.00',
  `credit_to_preapp_goal` decimal(5,2) DEFAULT '50.00',
  `lead_to_closing_goal` decimal(5,2) DEFAULT '25.00',
  `leads_goal` int(11) DEFAULT '40',
  `credit_pulls_goal` int(11) DEFAULT '28',
  `closings_goal` int(11) DEFAULT '10',
  `credit_pulls_actual` int(11) NOT NULL DEFAULT '0',
  `prev_year_leads` int(11) DEFAULT NULL,
  `prev_year_closings` int(11) DEFAULT NULL,
  `created_at` datetime DEFAULT CURRENT_TIMESTAMP,
  `updated_at` datetime DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='Monthly broker performance goals (admin, broker_id IS NULL) and per-partner manual actuals';

-- --------------------------------------------------------

--
-- Table structure for table `broker_profiles`
--

CREATE TABLE `broker_profiles` (
  `id` int(11) NOT NULL,
  `broker_id` int(11) NOT NULL,
  `bio` text COLLATE utf8mb4_unicode_ci,
  `office_address` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `office_city` varchar(100) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `office_state` varchar(50) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `office_zip` varchar(10) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `facebook_url` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `instagram_url` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `linkedin_url` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `twitter_url` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `youtube_url` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `website_url` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `avatar_url` mediumtext COLLATE utf8mb4_unicode_ci,
  `years_experience` int(11) DEFAULT NULL,
  `total_loans_closed` int(11) DEFAULT '0',
  `created_at` datetime DEFAULT CURRENT_TIMESTAMP,
  `updated_at` datetime DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Dumping data for table `broker_profiles`
--

INSERT INTO `broker_profiles` (`id`, `broker_id`, `bio`, `office_address`, `office_city`, `office_state`, `office_zip`, `facebook_url`, `instagram_url`, `linkedin_url`, `twitter_url`, `youtube_url`, `website_url`, `avatar_url`, `years_experience`, `total_loans_closed`, `created_at`, `updated_at`) VALUES
(1, 1, NULL, '3301 Lyon St', 'San Francisco', 'CA', '94123', NULL, 'https://www.instagram.com/tonatiuhgbr/', NULL, NULL, NULL, NULL, 'https://disruptinglabs.com/data/api/data/encore-profiles/profile-1/main_image/69a6138f45544_1772491663.png', 50, 0, '2026-02-24 20:53:50', '2026-03-05 18:08:40'),
(10, 13, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 'https://disruptinglabs.com/data/api/data/themortgageprofessionals-profiles/profile-13/main_image/69b8bae1a4274_1773714145.jpg', NULL, 0, '2026-03-16 20:22:25', '2026-03-16 20:22:25');

-- --------------------------------------------------------

--
-- Table structure for table `broker_sessions`
--

CREATE TABLE `broker_sessions` (
  `id` int(11) NOT NULL,
  `broker_id` int(11) NOT NULL,
  `session_code` int(6) NOT NULL,
  `is_active` tinyint(1) NOT NULL DEFAULT '1',
  `ip_address` varchar(45) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `user_agent` varchar(500) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `expires_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Dumping data for table `broker_sessions`
--

INSERT INTO `broker_sessions` (`id`, `broker_id`, `session_code`, `is_active`, `ip_address`, `user_agent`, `expires_at`, `created_at`) VALUES
(132, 1, 271148, 1, NULL, NULL, '2026-03-17 01:37:21', '2026-03-17 01:22:21');

-- --------------------------------------------------------

--
-- Table structure for table `campaigns`
--

CREATE TABLE `campaigns` (
  `id` int(11) NOT NULL,
  `tenant_id` int(11) NOT NULL DEFAULT '1',
  `name` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `description` text COLLATE utf8mb4_unicode_ci,
  `campaign_type` enum('email','sms','whatsapp','mixed') COLLATE utf8mb4_unicode_ci NOT NULL,
  `status` enum('draft','scheduled','active','paused','completed') COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'draft',
  `target_audience` json DEFAULT NULL,
  `template_id` int(11) DEFAULT NULL,
  `scheduled_start` datetime DEFAULT NULL,
  `scheduled_end` datetime DEFAULT NULL,
  `created_by_broker_id` int(11) DEFAULT NULL,
  `created_at` datetime DEFAULT CURRENT_TIMESTAMP,
  `updated_at` datetime DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Table structure for table `campaign_recipients`
--

CREATE TABLE `campaign_recipients` (
  `id` int(11) NOT NULL,
  `campaign_id` int(11) NOT NULL,
  `user_id` int(11) DEFAULT NULL,
  `lead_id` int(11) DEFAULT NULL,
  `email` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `phone` varchar(20) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `status` enum('pending','sent','delivered','opened','clicked','bounced','unsubscribed') COLLATE utf8mb4_unicode_ci DEFAULT 'pending',
  `sent_at` datetime DEFAULT NULL,
  `opened_at` datetime DEFAULT NULL,
  `clicked_at` datetime DEFAULT NULL,
  `created_at` datetime DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Table structure for table `clients`
--

CREATE TABLE `clients` (
  `id` int(11) NOT NULL,
  `tenant_id` int(11) NOT NULL DEFAULT '1',
  `email` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `password_hash` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `first_name` varchar(100) COLLATE utf8mb4_unicode_ci NOT NULL,
  `last_name` varchar(100) COLLATE utf8mb4_unicode_ci NOT NULL,
  `phone` varchar(20) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `alternate_phone` varchar(20) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `date_of_birth` date DEFAULT NULL,
  `ssn_encrypted` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `address_street` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `address_city` varchar(100) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `address_state` varchar(50) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `address_zip` varchar(10) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `employment_status` varchar(50) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `income_type` enum('W-2','1099','Self-Employed','Investor','Mixed') COLLATE utf8mb4_unicode_ci NOT NULL,
  `annual_income` decimal(15,2) DEFAULT NULL,
  `credit_score` int(11) DEFAULT NULL,
  `citizenship_status` enum('us_citizen','permanent_resident','non_resident','other') COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT 'Client citizenship/immigration status',
  `status` enum('active','inactive','suspended') COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'active',
  `email_verified` tinyint(1) DEFAULT '0',
  `phone_verified` tinyint(1) DEFAULT '0',
  `last_login` datetime DEFAULT NULL,
  `assigned_broker_id` int(11) DEFAULT NULL,
  `source` varchar(100) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `referral_code` varchar(50) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `created_at` datetime DEFAULT CURRENT_TIMESTAMP,
  `updated_at` datetime DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Dumping data for table `clients`
--

INSERT INTO `clients` (`id`, `tenant_id`, `email`, `password_hash`, `first_name`, `last_name`, `phone`, `alternate_phone`, `date_of_birth`, `ssn_encrypted`, `address_street`, `address_city`, `address_state`, `address_zip`, `employment_status`, `income_type`, `annual_income`, `credit_score`, `citizenship_status`, `status`, `email_verified`, `phone_verified`, `last_login`, `assigned_broker_id`, `source`, `referral_code`, `created_at`, `updated_at`) VALUES
(31, 2, 'tonatiuh.gom@gmail.com', '', 'Lionel', 'Messi', '(555) 123-4567', NULL, NULL, NULL, '789 Elm Street', 'Los Angeles', 'CA', '90001', 'employed', 'W-2', 120000.00, 740, 'us_citizen', 'active', 0, 0, '2026-03-16 20:25:48', 1, 'public_wizard', NULL, '2026-03-16 20:24:38', '2026-03-16 20:25:48');

-- --------------------------------------------------------

--
-- Table structure for table `communications`
--

CREATE TABLE `communications` (
  `id` int(11) NOT NULL,
  `tenant_id` int(11) NOT NULL DEFAULT '1',
  `application_id` int(11) DEFAULT NULL,
  `lead_id` int(11) DEFAULT NULL,
  `from_user_id` int(11) DEFAULT NULL,
  `from_broker_id` int(11) DEFAULT NULL,
  `to_user_id` int(11) DEFAULT NULL,
  `to_broker_id` int(11) DEFAULT NULL,
  `communication_type` enum('email','sms','whatsapp','call','internal_note') COLLATE utf8mb4_unicode_ci NOT NULL,
  `direction` enum('inbound','outbound') COLLATE utf8mb4_unicode_ci NOT NULL,
  `subject` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `body` text COLLATE utf8mb4_unicode_ci,
  `status` enum('pending','sent','delivered','failed','read') COLLATE utf8mb4_unicode_ci DEFAULT 'pending',
  `external_id` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `conversation_id` varchar(100) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `thread_id` varchar(100) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `reply_to_id` int(11) DEFAULT NULL,
  `message_type` enum('text','image','document','audio','video','template') COLLATE utf8mb4_unicode_ci DEFAULT 'text',
  `template_id` int(11) DEFAULT NULL,
  `delivery_status` enum('pending','sent','delivered','read','failed','rejected') COLLATE utf8mb4_unicode_ci DEFAULT 'pending',
  `delivery_timestamp` datetime DEFAULT NULL,
  `read_timestamp` datetime DEFAULT NULL,
  `error_code` varchar(50) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `error_message` text COLLATE utf8mb4_unicode_ci,
  `cost` decimal(10,4) DEFAULT NULL COMMENT 'Cost in USD for SMS/WhatsApp messages',
  `provider_response` json DEFAULT NULL COMMENT 'Full provider response for debugging',
  `metadata` json DEFAULT NULL,
  `scheduled_at` datetime DEFAULT NULL,
  `sent_at` datetime DEFAULT NULL,
  `created_at` datetime DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Triggers `communications`
--
DELIMITER $$
CREATE TRIGGER `update_conversation_thread` AFTER INSERT ON `communications` FOR EACH ROW BEGIN
    DECLARE client_name_var VARCHAR(255) DEFAULT NULL;
    DECLARE client_phone_var VARCHAR(20) DEFAULT NULL;
    DECLARE client_email_var VARCHAR(255) DEFAULT NULL;
    
    -- Get client information
    IF NEW.to_user_id IS NOT NULL THEN
        SELECT CONCAT(first_name, ' ', last_name), phone_number, email
        INTO client_name_var, client_phone_var, client_email_var
        FROM clients WHERE id = NEW.to_user_id;
    ELSEIF NEW.from_user_id IS NOT NULL THEN
        SELECT CONCAT(first_name, ' ', last_name), phone_number, email
        INTO client_name_var, client_phone_var, client_email_var
        FROM clients WHERE id = NEW.from_user_id;
    END IF;
    
    -- Upsert conversation thread
    INSERT INTO conversation_threads (
        tenant_id, conversation_id, application_id, lead_id, client_id, broker_id,
        client_name, client_phone, client_email, last_message_at, 
        last_message_preview, last_message_type, message_count, unread_count
    ) VALUES (
        NEW.tenant_id,
        COALESCE(NEW.conversation_id, CONCAT('conv_', NEW.id)),
        NEW.application_id,
        NEW.lead_id,
        COALESCE(NEW.to_user_id, NEW.from_user_id),
        COALESCE(NEW.from_broker_id, NEW.to_broker_id),
        client_name_var,
        client_phone_var,
        client_email_var,
        NEW.created_at,
        LEFT(NEW.body, 200),
        NEW.communication_type,
        1,
        CASE WHEN NEW.direction = 'inbound' THEN 1 ELSE 0 END
    ) ON DUPLICATE KEY UPDATE
        last_message_at = NEW.created_at,
        last_message_preview = LEFT(NEW.body, 200),
        last_message_type = NEW.communication_type,
        message_count = message_count + 1,
        unread_count = unread_count + CASE WHEN NEW.direction = 'inbound' THEN 1 ELSE 0 END,
        updated_at = NOW();
END
$$
DELIMITER ;

-- --------------------------------------------------------

--
-- Table structure for table `compliance_checklists`
--

CREATE TABLE `compliance_checklists` (
  `id` int(11) NOT NULL,
  `tenant_id` int(11) NOT NULL DEFAULT '1',
  `application_id` int(11) NOT NULL,
  `checklist_name` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `is_completed` tinyint(1) DEFAULT '0',
  `completed_by_broker_id` int(11) DEFAULT NULL,
  `completed_at` datetime DEFAULT NULL,
  `created_at` datetime DEFAULT CURRENT_TIMESTAMP,
  `updated_at` datetime DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Table structure for table `compliance_checklist_items`
--

CREATE TABLE `compliance_checklist_items` (
  `id` int(11) NOT NULL,
  `checklist_id` int(11) NOT NULL,
  `item_name` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `item_description` text COLLATE utf8mb4_unicode_ci,
  `is_required` tinyint(1) DEFAULT '1',
  `is_completed` tinyint(1) DEFAULT '0',
  `completed_by_broker_id` int(11) DEFAULT NULL,
  `completed_at` datetime DEFAULT NULL,
  `notes` text COLLATE utf8mb4_unicode_ci
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Table structure for table `contact_submissions`
--

CREATE TABLE `contact_submissions` (
  `id` int(11) NOT NULL,
  `tenant_id` int(11) NOT NULL DEFAULT '1',
  `name` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `email` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `phone` varchar(30) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `subject` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `message` text COLLATE utf8mb4_unicode_ci NOT NULL,
  `is_read` tinyint(1) NOT NULL DEFAULT '0',
  `read_by_broker_id` int(11) DEFAULT NULL,
  `read_at` datetime DEFAULT NULL,
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Table structure for table `conversation_threads`
--

CREATE TABLE `conversation_threads` (
  `id` int(11) NOT NULL,
  `tenant_id` int(11) NOT NULL DEFAULT '1',
  `conversation_id` varchar(100) COLLATE utf8mb4_unicode_ci NOT NULL,
  `application_id` int(11) DEFAULT NULL,
  `lead_id` int(11) DEFAULT NULL,
  `client_id` int(11) DEFAULT NULL,
  `broker_id` int(11) NOT NULL,
  `client_name` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `client_phone` varchar(20) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `client_email` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `last_message_at` datetime NOT NULL,
  `last_message_preview` text COLLATE utf8mb4_unicode_ci,
  `last_message_type` enum('email','sms','whatsapp','call','internal_note') COLLATE utf8mb4_unicode_ci NOT NULL,
  `message_count` int(11) DEFAULT '0',
  `unread_count` int(11) DEFAULT '0',
  `priority` enum('low','normal','high','urgent') COLLATE utf8mb4_unicode_ci DEFAULT 'normal',
  `status` enum('active','archived','closed') COLLATE utf8mb4_unicode_ci DEFAULT 'active',
  `tags` json DEFAULT NULL,
  `created_at` datetime DEFAULT CURRENT_TIMESTAMP,
  `updated_at` datetime DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Table structure for table `documents`
--

CREATE TABLE `documents` (
  `id` int(11) NOT NULL,
  `tenant_id` int(11) NOT NULL DEFAULT '1',
  `application_id` int(11) DEFAULT NULL,
  `uploaded_by_user_id` int(11) DEFAULT NULL,
  `uploaded_by_broker_id` int(11) DEFAULT NULL,
  `document_type` enum('id_verification','income_verification','bank_statement','tax_return','pay_stub','employment_letter','credit_report','property_appraisal','purchase_agreement','title_report','insurance','other') COLLATE utf8mb4_unicode_ci NOT NULL,
  `document_name` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `file_path` varchar(500) COLLATE utf8mb4_unicode_ci NOT NULL,
  `file_size_bytes` int(11) DEFAULT NULL,
  `mime_type` varchar(100) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `status` enum('pending_review','approved','rejected','expired') COLLATE utf8mb4_unicode_ci DEFAULT 'pending_review',
  `is_required` tinyint(1) DEFAULT '0',
  `reviewed_by_broker_id` int(11) DEFAULT NULL,
  `reviewed_at` datetime DEFAULT NULL,
  `review_notes` text COLLATE utf8mb4_unicode_ci,
  `expiration_date` date DEFAULT NULL,
  `created_at` datetime DEFAULT CURRENT_TIMESTAMP,
  `updated_at` datetime DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Table structure for table `environment_keys`
--

CREATE TABLE `environment_keys` (
  `id` int(10) UNSIGNED NOT NULL,
  `title` varchar(100) COLLATE utf8mb4_unicode_ci NOT NULL COMMENT 'Service name, e.g. stripe',
  `type` varchar(50) COLLATE utf8mb4_unicode_ci NOT NULL COMMENT 'Key type: publishable | secret | webhook',
  `key_string` text COLLATE utf8mb4_unicode_ci NOT NULL COMMENT 'The actual key value',
  `is_test` tinyint(1) NOT NULL DEFAULT '1' COMMENT '1 = test/sandbox, 0 = live/production',
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Dumping data for table `environment_keys`
--

INSERT INTO `environment_keys` (`id`, `title`, `type`, `key_string`, `is_test`, `created_at`, `updated_at`) VALUES
(1, 'stripe', 'publishable', '', 1, '2026-02-23 23:50:30', '2026-02-26 23:43:35'),
(2, 'stripe', 'secret', '', 1, '2026-02-23 23:50:30', '2026-02-26 23:43:31'),
(3, 'stripe', 'publishable', '', 0, '2026-02-23 23:50:30', '2026-02-23 23:50:30'),
(4, 'stripe', 'secret', '', 0, '2026-02-23 23:50:30', '2026-02-23 23:50:30');

-- --------------------------------------------------------

--
-- Table structure for table `leads`
--

CREATE TABLE `leads` (
  `id` int(11) NOT NULL,
  `tenant_id` int(11) NOT NULL DEFAULT '1',
  `source` enum('website','referral','social_media','cold_call','event','other') COLLATE utf8mb4_unicode_ci NOT NULL,
  `source_details` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `source_category` enum('current_client_referral','past_client','past_client_referral','personal_friend','realtor','advertisement','business_partner','builder','other') COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT 'Broker-specific lead source category for metrics tracking',
  `first_name` varchar(100) COLLATE utf8mb4_unicode_ci NOT NULL,
  `last_name` varchar(100) COLLATE utf8mb4_unicode_ci NOT NULL,
  `email` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `phone` varchar(20) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `interest_type` enum('purchase','refinance','home_equity','commercial','other') COLLATE utf8mb4_unicode_ci NOT NULL,
  `estimated_loan_amount` decimal(12,2) DEFAULT NULL,
  `property_type` enum('single_family','condo','multi_family','commercial','land','other') COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `status` enum('new','contacted','qualified','unqualified','converted','lost') COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'new',
  `assigned_broker_id` int(11) DEFAULT NULL,
  `notes` text COLLATE utf8mb4_unicode_ci,
  `created_at` datetime DEFAULT CURRENT_TIMESTAMP,
  `updated_at` datetime DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `converted_to_client_id` int(11) DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Table structure for table `lead_activities`
--

CREATE TABLE `lead_activities` (
  `id` int(11) NOT NULL,
  `lead_id` int(11) NOT NULL,
  `activity_type` enum('call','email','sms','meeting','note','status_change') COLLATE utf8mb4_unicode_ci NOT NULL,
  `subject` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `description` text COLLATE utf8mb4_unicode_ci,
  `performed_by_broker_id` int(11) DEFAULT NULL,
  `scheduled_at` datetime DEFAULT NULL,
  `completed_at` datetime DEFAULT NULL,
  `created_at` datetime DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Table structure for table `loan_applications`
--

CREATE TABLE `loan_applications` (
  `id` int(11) NOT NULL,
  `tenant_id` int(11) NOT NULL DEFAULT '1',
  `application_number` varchar(50) COLLATE utf8mb4_unicode_ci NOT NULL,
  `client_user_id` int(11) NOT NULL,
  `broker_user_id` int(11) DEFAULT NULL,
  `partner_broker_id` int(11) DEFAULT NULL COMMENT 'Realtor partner broker manually assigned to this loan application',
  `loan_type` enum('purchase','refinance') COLLATE utf8mb4_unicode_ci NOT NULL,
  `loan_amount` decimal(12,2) NOT NULL,
  `property_value` decimal(12,2) DEFAULT NULL,
  `property_address` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `property_city` varchar(100) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `property_state` varchar(50) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `property_zip` varchar(10) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `property_type` enum('single_family','condo','multi_family','commercial','land','other') COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `down_payment` decimal(12,2) DEFAULT NULL,
  `loan_purpose` text COLLATE utf8mb4_unicode_ci,
  `status` enum('app_sent','application_received','prequalified','preapproved','under_contract_loan_setup','submitted_to_underwriting','approved_with_conditions','clear_to_close','docs_out','loan_funded') COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'app_sent',
  `current_step` int(11) DEFAULT '1',
  `total_steps` int(11) DEFAULT '8',
  `priority` enum('low','medium','high','urgent') COLLATE utf8mb4_unicode_ci DEFAULT 'medium',
  `estimated_close_date` date DEFAULT NULL,
  `actual_close_date` date DEFAULT NULL,
  `interest_rate` decimal(5,3) DEFAULT NULL,
  `loan_term_months` int(11) DEFAULT NULL,
  `notes` text COLLATE utf8mb4_unicode_ci,
  `broker_token` varchar(36) COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT 'Broker public_token used when client submitted via share link',
  `created_at` datetime DEFAULT CURRENT_TIMESTAMP,
  `updated_at` datetime DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `submitted_at` datetime DEFAULT NULL,
  `citizenship_status` enum('us_citizen','permanent_resident','non_resident','other') COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT 'Applicant citizenship/immigration status at time of application'
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Dumping data for table `loan_applications`
--

INSERT INTO `loan_applications` (`id`, `tenant_id`, `application_number`, `client_user_id`, `broker_user_id`, `partner_broker_id`, `loan_type`, `loan_amount`, `property_value`, `property_address`, `property_city`, `property_state`, `property_zip`, `property_type`, `down_payment`, `loan_purpose`, `status`, `current_step`, `total_steps`, `priority`, `estimated_close_date`, `actual_close_date`, `interest_rate`, `loan_term_months`, `notes`, `broker_token`, `created_at`, `updated_at`, `submitted_at`, `citizenship_status`) VALUES
(34, 2, 'LA14278503', 31, 1, 13, 'purchase', 440000.00, 550000.00, '123 Oak Avenue', 'San Francisco', 'CA', '94102', 'single_family', 110000.00, 'Primary residence purchase for development testing', 'application_received', 1, 8, 'medium', NULL, NULL, NULL, NULL, 'Public wizard submission. Employment: employed, Employer: Acme Corp, Years employed: 5', '14ebb381-21a8-11f1-896f-525400bd6b5d', '2026-03-16 20:24:38', '2026-03-16 20:24:38', '2026-03-16 20:24:38', 'us_citizen');

-- --------------------------------------------------------

--
-- Table structure for table `notifications`
--

CREATE TABLE `notifications` (
  `id` int(11) NOT NULL,
  `tenant_id` int(11) NOT NULL DEFAULT '1',
  `user_id` int(11) NOT NULL,
  `title` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `message` text COLLATE utf8mb4_unicode_ci NOT NULL,
  `notification_type` enum('info','success','warning','error') COLLATE utf8mb4_unicode_ci DEFAULT 'info',
  `is_read` tinyint(1) DEFAULT '0',
  `action_url` varchar(500) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `created_at` datetime DEFAULT CURRENT_TIMESTAMP,
  `read_at` datetime DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Dumping data for table `notifications`
--

INSERT INTO `notifications` (`id`, `tenant_id`, `user_id`, `title`, `message`, `notification_type`, `is_read`, `action_url`, `created_at`, `read_at`) VALUES
(104, 2, 31, 'Application Received', 'Your loan application LA14278503 has been received. A loan officer will be in touch shortly.', 'info', 0, '/portal', '2026-03-16 20:24:39', NULL);

-- --------------------------------------------------------

--
-- Table structure for table `pipeline_step_templates`
--

CREATE TABLE `pipeline_step_templates` (
  `id` int(11) NOT NULL,
  `tenant_id` int(11) NOT NULL DEFAULT '1',
  `pipeline_step` enum('app_sent','application_received','prequalified','preapproved','under_contract_loan_setup','submitted_to_underwriting','approved_with_conditions','clear_to_close','docs_out','loan_funded') COLLATE utf8mb4_unicode_ci NOT NULL,
  `communication_type` enum('email','sms','whatsapp') COLLATE utf8mb4_unicode_ci NOT NULL,
  `template_id` int(11) NOT NULL,
  `is_active` tinyint(1) DEFAULT '1',
  `created_by_broker_id` int(11) DEFAULT NULL,
  `created_at` datetime DEFAULT CURRENT_TIMESTAMP,
  `updated_at` datetime DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Table structure for table `pre_approval_letters`
--

CREATE TABLE `pre_approval_letters` (
  `id` int(11) NOT NULL,
  `tenant_id` int(11) NOT NULL DEFAULT '1',
  `application_id` int(11) NOT NULL COMMENT 'FK to loan_applications.id',
  `approved_amount` decimal(12,2) NOT NULL COMMENT 'Current pre-approved amount shown on letter (can be edited up to max_approved_amount)',
  `max_approved_amount` decimal(12,2) NOT NULL COMMENT 'Maximum pre-approval ceiling — set only by admin brokers, cannot be exceeded',
  `html_content` longtext COLLATE utf8mb4_unicode_ci NOT NULL COMMENT 'Fully customizable HTML body of the letter',
  `letter_date` date NOT NULL COMMENT 'Date shown on the letter',
  `expires_at` date DEFAULT NULL COMMENT 'Optional expiration date for the pre-approval',
  `loan_type` varchar(50) COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT 'Loan type shown on the letter: FHA, Conventional, USDA, VA, Non-QM',
  `fico_score` smallint(6) DEFAULT NULL COMMENT 'FICO credit score shown on the letter',
  `is_active` tinyint(1) NOT NULL DEFAULT '1' COMMENT '1 = active/enabled, 0 = disabled',
  `created_by_broker_id` int(11) NOT NULL COMMENT 'Broker who issued the letter',
  `updated_by_broker_id` int(11) DEFAULT NULL COMMENT 'Broker who last edited the letter',
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='Pre-approval letters attached to loan applications. One letter per loan, customizable HTML content.';

-- --------------------------------------------------------

--
-- Table structure for table `reminder_flows`
--

CREATE TABLE `reminder_flows` (
  `id` int(11) NOT NULL,
  `tenant_id` int(11) NOT NULL DEFAULT '1',
  `name` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `description` text COLLATE utf8mb4_unicode_ci,
  `trigger_event` enum('app_sent','application_received','prequalified','preapproved','under_contract_loan_setup','submitted_to_underwriting','approved_with_conditions','clear_to_close','docs_out','loan_funded','task_pending','task_in_progress','task_overdue','no_activity','manual') COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'app_sent',
  `trigger_delay_days` int(11) NOT NULL DEFAULT '0' COMMENT 'Days after trigger event to start flow',
  `is_active` tinyint(1) NOT NULL DEFAULT '1',
  `apply_to_all_loans` tinyint(1) NOT NULL DEFAULT '1' COMMENT 'When true, applies to all current and future loans',
  `loan_type_filter` enum('all','purchase','refinance') COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'all' COMMENT 'Restrict this flow to a specific loan type or all',
  `created_by_broker_id` int(11) DEFAULT NULL,
  `created_at` datetime DEFAULT CURRENT_TIMESTAMP,
  `updated_at` datetime DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Table structure for table `reminder_flow_connections`
--

CREATE TABLE `reminder_flow_connections` (
  `id` int(11) NOT NULL,
  `flow_id` int(11) NOT NULL,
  `edge_key` varchar(100) COLLATE utf8mb4_unicode_ci NOT NULL COMMENT 'Unique key within flow for React Flow edge id',
  `source_step_key` varchar(100) COLLATE utf8mb4_unicode_ci NOT NULL,
  `target_step_key` varchar(100) COLLATE utf8mb4_unicode_ci NOT NULL,
  `label` varchar(100) COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT 'Edge label e.g. Yes / No for conditions',
  `edge_type` enum('default','condition_yes','condition_no','loan_type_purchase','loan_type_refinance','no_response','responded') COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'default',
  `created_at` datetime DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Table structure for table `reminder_flow_executions`
--

CREATE TABLE `reminder_flow_executions` (
  `id` int(11) NOT NULL,
  `tenant_id` int(11) NOT NULL DEFAULT '1',
  `flow_id` int(11) NOT NULL,
  `loan_application_id` int(11) DEFAULT NULL,
  `client_id` int(11) DEFAULT NULL,
  `current_step_key` varchar(100) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `status` enum('active','paused','completed','cancelled','failed') COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'active',
  `next_execution_at` datetime DEFAULT NULL COMMENT 'When the next step should execute',
  `completed_steps` json DEFAULT NULL COMMENT 'Array of completed step keys',
  `context_data` json DEFAULT NULL COMMENT 'Runtime context: loan_type, client info, application status, etc.',
  `last_step_started_at` datetime DEFAULT NULL COMMENT 'Timestamp when current step execution began (used for no_response timeout)',
  `responded_at` datetime DEFAULT NULL COMMENT 'Set when client responds; triggers responded edge on wait_for_response steps',
  `started_at` datetime DEFAULT CURRENT_TIMESTAMP,
  `completed_at` datetime DEFAULT NULL,
  `created_at` datetime DEFAULT CURRENT_TIMESTAMP,
  `updated_at` datetime DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Table structure for table `reminder_flow_steps`
--

CREATE TABLE `reminder_flow_steps` (
  `id` int(11) NOT NULL,
  `flow_id` int(11) NOT NULL,
  `step_key` varchar(100) COLLATE utf8mb4_unicode_ci NOT NULL COMMENT 'Unique key within flow for React Flow node id',
  `step_type` enum('trigger','wait','send_notification','send_email','send_sms','send_whatsapp','condition','branch','wait_for_response','end') COLLATE utf8mb4_unicode_ci NOT NULL,
  `label` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `description` text COLLATE utf8mb4_unicode_ci,
  `config` json DEFAULT NULL COMMENT 'Step-specific configuration (message, delay hours/days, condition type, etc.)',
  `position_x` float NOT NULL DEFAULT '0' COMMENT 'X position on the flow canvas',
  `position_y` float NOT NULL DEFAULT '0' COMMENT 'Y position on the flow canvas',
  `created_at` datetime DEFAULT CURRENT_TIMESTAMP,
  `updated_at` datetime DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Table structure for table `system_settings`
--

CREATE TABLE `system_settings` (
  `id` int(11) NOT NULL,
  `tenant_id` int(11) DEFAULT NULL,
  `setting_key` varchar(100) COLLATE utf8mb4_unicode_ci NOT NULL,
  `setting_value` text COLLATE utf8mb4_unicode_ci,
  `setting_type` enum('string','number','boolean','json') COLLATE utf8mb4_unicode_ci DEFAULT 'string',
  `description` text COLLATE utf8mb4_unicode_ci,
  `updated_at` datetime DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Dumping data for table `system_settings`
--

INSERT INTO `system_settings` (`id`, `tenant_id`, `setting_key`, `setting_value`, `setting_type`, `description`, `updated_at`) VALUES
(1, 2, 'company_name', 'The Mortgage Professionals', 'string', 'Company name', '2026-03-16 19:08:20'),
(2, 2, 'support_email', 'support@example.com', 'string', 'Support email address', '2026-03-16 18:52:11'),
(3, 2, 'max_file_upload_mb', '10', 'number', 'Maximum file upload size in MB', '2026-03-16 18:52:11'),
(4, 2, 'enable_sms', 'true', 'boolean', 'Enable SMS notifications', '2026-03-16 18:52:11'),
(5, 2, 'enable_email', 'true', 'boolean', 'Enable email notifications', '2026-03-16 18:52:11'),
(6, 2, 'company_logo_url', '', 'string', 'URL to company logo displayed in pre-approval letters', '2026-03-16 18:52:11'),
(7, 2, 'company_address', '', 'string', 'Company address displayed in pre-approval letters', '2026-03-16 18:52:11'),
(8, 2, 'company_phone', '5623370000', 'string', 'Company phone displayed in pre-approval letters', '2026-03-16 18:52:11'),
(9, 2, 'company_nmls', '1105497', 'string', 'Company NMLS license number for pre-approval letters', '2026-03-16 18:52:11'),
(11, 2, 'pre_approval_default_template', '<div style=\"font-family: Arial, Helvetica, sans-serif; max-width: 750px; margin: 0 auto; padding: 48px; background: #fff; color: #222;\">\r\n\r\n  <table style=\"width: 100%; margin-bottom: 20px; border-collapse: collapse;\">\r\n    <tr>\r\n      <td style=\"vertical-align: top; width: 55%;\">{{COMPANY_LOGO}}</td>\r\n      <td style=\"vertical-align: top; text-align: right; font-size: 13px; color: #333; line-height: 1.8;\">\r\n        <strong>{{COMPANY_NAME}}</strong><br>P. {{COMPANY_PHONE}}<br>NMLS# {{COMPANY_NMLS}}\r\n      </td>\r\n    </tr>\r\n  </table>\r\n\r\n  <hr style=\"border: none; border-top: 1px solid #ccc; margin-bottom: 20px;\">\r\n\r\n  <table style=\"width: 100%; margin-bottom: 20px; border-collapse: collapse;\">\r\n    <tr>\r\n      <td style=\"font-size: 13px;\">Date: {{LETTER_DATE}}</td>\r\n      <td style=\"font-size: 13px; text-align: right;\">Expires: {{EXPIRES_SHORT}}</td>\r\n    </tr>\r\n  </table>\r\n\r\n  <p style=\"margin: 0 0 20px; font-size: 13px;\">Re: {{CLIENT_FULL_NAME}}</p>\r\n  <hr style=\"border: none; border-top: 1px solid #ccc; margin-bottom: 20px;\">\r\n\r\n  <p style=\"margin: 0 0 16px; font-size: 13px; line-height: 1.7;\">This letter shall serve as a pre-approval for a loan in connection with the purchase transaction for the above referenced buyer(s). Based on preliminary information, a pre-approval is herein granted with the following terms:</p>\r\n\r\n  <p style=\"margin: 0 0 5px; font-size: 13px;\">Purchase Price: {{APPROVED_AMOUNT}}</p>\r\n  <p style=\"margin: 0 0 5px; font-size: 13px;\">Loan Type: </p>\r\n  <p style=\"margin: 0 0 5px; font-size: 13px;\">Term: 30 years</p>\r\n  <p style=\"margin: 0 0 5px; font-size: 13px;\">FICO Score: </p>\r\n  <p style=\"margin: 0 0 20px; font-size: 13px;\">Property Address: {{PROPERTY_ADDRESS}}</p>\r\n\r\n  <p style=\"margin: 0 0 8px; font-size: 13px;\"><strong>We have reviewed the following:</strong></p>\r\n  <ul style=\"margin: 0 0 20px; padding-left: 24px; font-size: 13px; line-height: 1.9;\">\r\n    <li>Reviewed applicant&#39;s credit report and credit score</li>\r\n    <li>Verified applicant&#39;s income documentation and debt to income ratio</li>\r\n    <li>Verified applicant&#39;s assets documentation</li>\r\n  </ul>\r\n\r\n  <p style=\"margin: 0 0 20px; font-size: 13px; line-height: 1.7;\">Disclaimer: <strong>Loan Contingency.</strong> Even though a buyer may hold a pre-approval letter, further investigations concerning the property or the borrower could result in a loan denial. We suggest the buyer consider a loan contingency requirement in the purchase contract (to protect earnest money deposit) in accordance with applicable state law.</p>\r\n\r\n  <p style=\"margin: 0 0 32px; font-size: 13px;\">Realtor Partner: </p>\r\n\r\n  <table style=\"width: 100%; border-collapse: collapse;\">\r\n    <tr>\r\n      <td style=\"vertical-align: top; width: 100px;\">{{BROKER_PHOTO}}</td>\r\n      <td style=\"vertical-align: top; padding-left: 16px; font-size: 13px; line-height: 1.7;\">\r\n        <p style=\"margin: 0 0 3px;\"><strong>{{BROKER_FULL_NAME}}</strong></p>\r\n        <p style=\"margin: 0 0 3px; color: #444;\">Mortgage Banker</p>\r\n        <p style=\"margin: 0 0 3px; color: #444;\">{{BROKER_LICENSE}}</p>\r\n        <p style=\"margin: 0 0 3px; color: #444;\">{{COMPANY_NAME}}</p>\r\n        <p style=\"margin: 0 0 3px; color: #444;\">{{BROKER_PHONE}}</p>\r\n        <p style=\"margin: 0; color: #444;\">{{BROKER_EMAIL}}</p>\r\n      </td>\r\n    </tr>\r\n  </table>\r\n\r\n</div>', 'string', 'Default HTML template for pre-approval letters — matches Encore Mortgage letter format', '2026-03-16 18:52:11'),
(12, 2, 'pre_approval_require_all_tasks', 'false', 'string', NULL, '2026-03-16 18:52:11');

-- --------------------------------------------------------

--
-- Table structure for table `tasks`
--

CREATE TABLE `tasks` (
  `id` int(11) NOT NULL,
  `tenant_id` int(11) NOT NULL DEFAULT '1',
  `template_id` int(11) DEFAULT NULL COMMENT 'References task_template if created from template',
  `order_index` int(11) DEFAULT '0' COMMENT 'Order in loan workflow (copied from template)',
  `application_id` int(11) DEFAULT NULL,
  `title` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `description` text COLLATE utf8mb4_unicode_ci,
  `task_type` varchar(100) COLLATE utf8mb4_unicode_ci NOT NULL COMMENT 'Matches task_template.task_type',
  `status` enum('pending','in_progress','completed','pending_approval','approved','reopened','cancelled','overdue') COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'pending',
  `priority` enum('low','medium','high','urgent') COLLATE utf8mb4_unicode_ci DEFAULT 'medium',
  `assigned_to_user_id` int(11) DEFAULT NULL,
  `assigned_to_broker_id` int(11) DEFAULT NULL,
  `created_by_broker_id` int(11) DEFAULT NULL,
  `due_date` datetime DEFAULT NULL,
  `completed_at` datetime DEFAULT NULL,
  `created_at` datetime DEFAULT CURRENT_TIMESTAMP,
  `updated_at` datetime DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `form_completed` tinyint(1) DEFAULT '0' COMMENT 'Whether custom form is completed',
  `form_completed_at` datetime DEFAULT NULL COMMENT 'When form was completed',
  `documents_uploaded` tinyint(1) DEFAULT '0' COMMENT 'Whether required documents are uploaded',
  `documents_verified` tinyint(1) DEFAULT '0' COMMENT 'Whether uploaded documents are verified by broker',
  `approval_status` enum('pending','approved','rejected') COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT 'Approval status by broker/admin',
  `approved_by_broker_id` int(11) DEFAULT NULL COMMENT 'Broker who approved the task',
  `approved_at` datetime DEFAULT NULL COMMENT 'When task was approved',
  `reopened_by_broker_id` int(11) DEFAULT NULL COMMENT 'Broker who reopened the task',
  `reopened_at` datetime DEFAULT NULL COMMENT 'When task was reopened',
  `reopen_reason` text COLLATE utf8mb4_unicode_ci COMMENT 'Reason for reopening task',
  `status_change_reason` text COLLATE utf8mb4_unicode_ci COMMENT 'Reason/comment for manual status changes',
  `status_changed_by_broker_id` int(11) DEFAULT NULL COMMENT 'Broker who manually changed status',
  `status_changed_at` datetime DEFAULT NULL COMMENT 'When status was manually changed'
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Dumping data for table `tasks`
--

INSERT INTO `tasks` (`id`, `tenant_id`, `template_id`, `order_index`, `application_id`, `title`, `description`, `task_type`, `status`, `priority`, `assigned_to_user_id`, `assigned_to_broker_id`, `created_by_broker_id`, `due_date`, `completed_at`, `created_at`, `updated_at`, `form_completed`, `form_completed_at`, `documents_uploaded`, `documents_verified`, `approval_status`, `approved_by_broker_id`, `approved_at`, `reopened_by_broker_id`, `reopened_at`, `reopen_reason`, `status_change_reason`, `status_changed_by_broker_id`, `status_changed_at`) VALUES
(115, 2, 34, 0, 34, 'Government-Issued ID', 'Provide a valid government-issued photo identification.', 'document_verification', 'in_progress', 'high', 31, NULL, NULL, '2026-03-23 20:24:39', NULL, '2026-03-16 20:24:38', '2026-03-16 20:30:38', 0, NULL, 0, 0, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL),
(116, 2, 37, 0, 34, 'Social Security Card (SSN)', 'Provide your Social Security card issued by the Social Security Administration (SSA).', 'document_verification', 'pending', 'high', 31, NULL, NULL, '2026-03-23 20:24:39', NULL, '2026-03-16 20:24:38', '2026-03-16 20:24:38', 0, NULL, 0, 0, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL),
(117, 2, 40, 0, 34, 'W-2 Form', 'Provide your W-2 form(s) for the most recent tax year.', 'document_verification', 'pending', 'high', 31, NULL, NULL, '2026-03-30 20:24:39', NULL, '2026-03-16 20:24:38', '2026-03-16 20:24:38', 0, NULL, 0, 0, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL),
(118, 2, 56, 0, 34, 'Existing Lease Agreements', 'Provide copies of all current lease agreements for the rental units.', 'document_verification', 'pending', 'medium', 31, NULL, NULL, '2026-03-30 20:24:39', NULL, '2026-03-16 20:24:38', '2026-03-16 20:24:38', 0, NULL, 0, 0, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL),
(119, 2, 58, 0, 34, '2 Months Bank Statements', 'Provide your last two months of bank statements for all accounts.', 'document_verification', 'pending', 'medium', 31, NULL, NULL, '2026-03-30 20:24:39', NULL, '2026-03-16 20:24:38', '2026-03-16 20:24:38', 0, NULL, 0, 0, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL),
(120, 2, 59, 0, 34, 'Most Recent Pay-Stubs (1 Month)', 'Provide your most recent one month of consecutive pay stubs from your employer.', 'document_verification', 'pending', 'high', 31, NULL, NULL, '2026-03-26 20:24:39', NULL, '2026-03-16 20:24:39', '2026-03-16 20:24:39', 0, NULL, 0, 0, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL),
(121, 2, 60, 0, 34, 'Federal Tax Returns (Last 2 Years) or Schedule C (Last 2 Years)', 'Provide your federal income tax returns or Schedule C for the last two tax years.', 'document_verification', 'pending', 'high', 31, NULL, NULL, '2026-03-30 20:24:39', NULL, '2026-03-16 20:24:39', '2026-03-16 20:24:39', 0, NULL, 0, 0, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL),
(122, 2, 61, 0, 34, 'Mortgage Statement', 'Provide the most recent mortgage statement for the subject property.', 'document_verification', 'pending', 'medium', 31, NULL, NULL, '2026-03-26 20:24:39', NULL, '2026-03-16 20:24:39', '2026-03-16 20:24:39', 0, NULL, 0, 0, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL),
(123, 2, 62, 0, 34, 'Insurance Policy', 'Provide the current homeowners or property insurance policy for the subject property.', 'document_verification', 'pending', 'medium', 31, NULL, NULL, '2026-03-30 20:24:39', NULL, '2026-03-16 20:24:39', '2026-03-16 20:24:39', 0, NULL, 0, 0, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL);

-- --------------------------------------------------------

--
-- Table structure for table `task_documents`
--

CREATE TABLE `task_documents` (
  `id` int(11) NOT NULL,
  `task_id` int(11) NOT NULL,
  `field_id` int(11) DEFAULT NULL COMMENT 'Associated form field if uploaded via form',
  `document_type` enum('pdf','image') COLLATE utf8mb4_unicode_ci NOT NULL,
  `filename` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `original_filename` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `file_path` varchar(500) COLLATE utf8mb4_unicode_ci NOT NULL COMMENT 'Path on external server',
  `file_size` bigint(20) DEFAULT NULL COMMENT 'File size in bytes',
  `uploaded_by_user_id` int(11) DEFAULT NULL,
  `uploaded_by_broker_id` int(11) DEFAULT NULL,
  `uploaded_at` datetime DEFAULT CURRENT_TIMESTAMP,
  `notes` text COLLATE utf8mb4_unicode_ci
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='Document attachments for tasks';

-- --------------------------------------------------------

--
-- Table structure for table `task_form_fields`
--

CREATE TABLE `task_form_fields` (
  `id` int(11) NOT NULL,
  `task_template_id` int(11) NOT NULL,
  `field_name` varchar(100) COLLATE utf8mb4_unicode_ci NOT NULL COMMENT 'Field name (e.g., license_number)',
  `field_label` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL COMMENT 'Display label',
  `field_type` enum('text','number','email','phone','date','textarea','file_pdf','file_image','select','checkbox') COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'text',
  `field_options` json DEFAULT NULL COMMENT 'Options for select fields',
  `is_required` tinyint(1) DEFAULT '1',
  `placeholder` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `validation_rules` json DEFAULT NULL COMMENT 'Validation rules (min, max, pattern, etc)',
  `order_index` int(11) DEFAULT '0',
  `help_text` text COLLATE utf8mb4_unicode_ci COMMENT 'Helper text shown below field',
  `created_at` datetime DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='Custom form fields for task templates';

--
-- Dumping data for table `task_form_fields`
--

INSERT INTO `task_form_fields` (`id`, `task_template_id`, `field_name`, `field_label`, `field_type`, `field_options`, `is_required`, `placeholder`, `validation_rules`, `order_index`, `help_text`, `created_at`) VALUES
(35, 34, 'document_upload', 'Attach Document', 'file_pdf', NULL, 1, NULL, NULL, 0, 'Attach a clear photo or scan of your valid government-issued ID (passport, driver license, state ID, etc.).', '2026-02-26 18:03:40'),
(36, 35, 'document_upload', 'Attach Document', 'file_pdf', NULL, 1, NULL, NULL, 0, 'Attach a clear photo or scan of your valid driver\'s license (front and back).', '2026-02-26 18:03:40'),
(37, 36, 'document_upload', 'Attach Document', 'file_pdf', NULL, 1, NULL, NULL, 0, 'Attach a clear photo or scan of your valid Green Card (front and back).', '2026-02-26 18:03:40'),
(38, 37, 'document_upload', 'Attach Document', 'file_pdf', NULL, 1, NULL, NULL, 0, 'Attach a clear photo or scan of your Social Security card. Make sure the number is clearly visible.', '2026-02-26 18:03:40'),
(39, 38, 'document_upload', 'Attach Document', 'file_pdf', NULL, 1, NULL, NULL, 0, 'Attach the last two months of bank or mortgage statements. They must clearly show the account holder name, partial account number, and housing payment transactions.', '2026-02-26 18:03:40'),
(40, 39, 'document_upload', 'Attach Document', 'file_pdf', NULL, 1, NULL, NULL, 0, 'Attach the active homeowner\'s insurance policy. It must include the policy number, coverage details, insured name, and effective dates.', '2026-02-26 18:03:40'),
(41, 40, 'document_upload', 'Attach Document', 'file_pdf', NULL, 1, NULL, NULL, 0, 'Attach all W-2 forms from the most recent tax year. If you have multiple employers, include the W-2 from each one.', '2026-02-26 18:03:40'),
(42, 41, 'document_upload', 'Attach Document', 'file_pdf', NULL, 1, NULL, NULL, 0, 'Attach all 1099 forms (1099-MISC, 1099-NEC, 1099-INT, etc.) for the last two tax years. Include all issuers.', '2026-02-26 18:03:40'),
(43, 42, 'document_upload', 'Attach Document', 'file_pdf', NULL, 1, NULL, NULL, 0, 'Attach complete and signed IRS Form 1040 with all schedules (Schedule C, E, etc.) for the last two tax years.', '2026-02-26 18:03:40'),
(44, 43, 'document_upload', 'Attach Document', 'file_pdf', NULL, 1, NULL, NULL, 0, 'Attach a copy of your valid business license, DBA registration, or LLC/corporation certificate.', '2026-02-26 18:03:40'),
(45, 44, 'document_upload', 'Attach Document', 'file_pdf', NULL, 1, NULL, NULL, 0, 'Attach a YTD profit & loss statement prepared by a CPA or bookkeeper. Must include revenue, expenses, and net income.', '2026-02-26 18:03:40'),
(46, 45, 'document_upload', 'Attach Document', 'file_pdf', NULL, 1, NULL, NULL, 0, 'Attach the last 3 months of all business bank statements. Must show account holder name, account number (partial), and all transactions.', '2026-02-26 18:03:40'),
(47, 46, 'document_upload', 'Attach Document', 'file_pdf', NULL, 1, NULL, NULL, 0, 'Attach the last 2 months of all investment, brokerage, or retirement account statements (401k, IRA, etc.).', '2026-02-26 18:03:40'),
(48, 47, 'document_upload', 'Attach Document', 'file_pdf', NULL, 1, NULL, NULL, 0, 'Attach the most recent pension or retirement award/benefit letter. It must show the monthly payment amount and the issuing organization.', '2026-02-26 18:03:40'),
(49, 48, 'document_upload', 'Attach Document', 'file_pdf', NULL, 1, NULL, NULL, 0, 'Attach your most recent Social Security award letter showing your monthly benefit amount. You can obtain it from ssa.gov.', '2026-02-26 18:03:40'),
(50, 49, 'document_upload', 'Attach Document', 'file_pdf', NULL, 1, NULL, NULL, 0, 'Attach a clear copy of your valid visa, I-94 Arrival/Departure Record, Employment Authorization Document (EAD), or other immigration status document.', '2026-02-26 18:03:40'),
(51, 50, 'document_upload', 'Attach Document', 'file_pdf', NULL, 1, NULL, NULL, 0, 'Attach your IRS ITIN assignment letter (Notice CP565) showing your Individual Taxpayer Identification Number.', '2026-02-26 18:03:40'),
(52, 51, 'document_upload', 'Attach Document', 'file_pdf', NULL, 1, NULL, NULL, 0, 'Attach your most recent mortgage statement showing the current balance, monthly payment, and lender information.', '2026-02-26 18:03:40'),
(53, 52, 'document_upload', 'Attach Document', 'file_pdf', NULL, 1, NULL, NULL, 0, 'Attach the most recent property tax assessment or bill from your county/city assessor.', '2026-02-26 18:03:40'),
(54, 53, 'document_upload', 'Attach Document', 'file_pdf', NULL, 1, NULL, NULL, 0, 'Attach the signed purchase agreement (sales contract) including all addenda and counteroffers.', '2026-02-26 18:03:40'),
(55, 54, 'document_upload', 'Attach Document', 'file_pdf', NULL, 1, NULL, NULL, 0, 'Attach the architectural/engineering plans for the construction project and the signed builder contract including total cost breakdown.', '2026-02-26 18:03:40'),
(56, 55, 'document_upload', 'Attach Document', 'file_pdf', NULL, 1, NULL, NULL, 0, 'Attach the current HOA dues statement and the master/blanket insurance policy (hazard + liability) for the condo association.', '2026-02-26 18:03:40'),
(57, 56, 'document_upload', 'Attach Document', 'file_pdf', NULL, 1, NULL, NULL, 0, 'Attach all signed lease agreements currently in effect for each rental unit in the property. Include lease start/end dates and monthly rent amounts.', '2026-02-26 18:03:40'),
(58, 57, 'document_upload', 'Attach Document', 'file_pdf', NULL, 1, NULL, NULL, 0, 'Attach the last 2 years of income statements and balance sheets for the business operating at or owning the commercial property. CPA-prepared preferred.', '2026-02-26 18:03:40'),
(66, 58, 'document_upload', 'Attach Document', 'file_pdf', NULL, 1, NULL, NULL, 0, 'Attach the last two months of all bank account statements. Must show account holder name, partial account number, and all transactions.', '2026-03-04 20:24:14'),
(67, 59, 'document_upload', 'Attach Document', 'file_pdf', NULL, 1, NULL, NULL, 0, 'Attach your most recent consecutive pay stubs covering at least one month. Must show employer name, gross pay, deductions, and year-to-date totals.', '2026-03-04 20:24:14'),
(68, 60, 'document_upload', 'Attach Document', 'file_pdf', NULL, 1, NULL, NULL, 0, 'Attach your complete and signed federal tax returns (Form 1040) or Schedule C for the last two tax years. Include all schedules and attachments.', '2026-03-04 20:24:14'),
(69, 61, 'document_upload', 'Attach Document', 'file_pdf', NULL, 1, NULL, NULL, 0, 'Attach your most recent mortgage statement showing outstanding balance, monthly payment, lender name, and property address.', '2026-03-04 20:24:14'),
(70, 62, 'document_upload', 'Attach Document', 'file_pdf', NULL, 1, NULL, NULL, 0, 'Attach the current insurance policy (declaration page). Must include policy number, coverage amounts, property address, named insured, and effective dates.', '2026-03-04 20:24:14'),
(71, 63, 'document_upload', 'Attach Document', 'file_pdf', NULL, 1, NULL, NULL, 0, 'Attach your most recent mortgage statement or an official payoff letter from your lender. Must show current balance, monthly payment, and lender contact information.', '2026-03-04 20:24:14');

-- --------------------------------------------------------

--
-- Table structure for table `task_form_responses`
--

CREATE TABLE `task_form_responses` (
  `id` int(11) NOT NULL,
  `task_id` int(11) NOT NULL,
  `field_id` int(11) NOT NULL,
  `field_value` text COLLATE utf8mb4_unicode_ci COMMENT 'Text value for non-file fields',
  `submitted_by_user_id` int(11) DEFAULT NULL,
  `submitted_by_broker_id` int(11) DEFAULT NULL,
  `submitted_at` datetime DEFAULT CURRENT_TIMESTAMP,
  `updated_at` datetime DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='Submitted responses for task form fields';

-- --------------------------------------------------------

--
-- Table structure for table `task_signatures`
--

CREATE TABLE `task_signatures` (
  `id` int(11) NOT NULL,
  `tenant_id` int(11) NOT NULL DEFAULT '1',
  `task_id` int(11) NOT NULL COMMENT 'References tasks.id (task instance)',
  `sign_document_id` int(11) NOT NULL COMMENT 'References task_sign_documents.id',
  `zone_id` varchar(100) COLLATE utf8mb4_unicode_ci NOT NULL COMMENT 'Zone identifier from signature_zones JSON',
  `signature_data` longtext COLLATE utf8mb4_unicode_ci NOT NULL COMMENT 'Base64 encoded PNG from signature canvas',
  `signed_by_user_id` int(11) DEFAULT NULL COMMENT 'Client user who signed',
  `signed_at` datetime DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='Client signature responses for document signing tasks';

-- --------------------------------------------------------

--
-- Table structure for table `task_sign_documents`
--

CREATE TABLE `task_sign_documents` (
  `id` int(11) NOT NULL,
  `tenant_id` int(11) NOT NULL DEFAULT '1',
  `task_template_id` int(11) NOT NULL COMMENT 'References task_templates.id',
  `file_path` varchar(500) COLLATE utf8mb4_unicode_ci NOT NULL COMMENT 'Full URL or path on external server (disruptinglabs)',
  `original_filename` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `file_size` bigint(20) DEFAULT NULL COMMENT 'File size in bytes',
  `signature_zones` json DEFAULT NULL COMMENT 'Array of zone objects [{id, page, x, y, width, height, label}]',
  `uploaded_by_broker_id` int(11) NOT NULL,
  `created_at` datetime DEFAULT CURRENT_TIMESTAMP,
  `updated_at` datetime DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='PDF documents with signature zone definitions for signing task templates';

-- --------------------------------------------------------

--
-- Table structure for table `task_templates`
--

CREATE TABLE `task_templates` (
  `id` int(11) NOT NULL,
  `tenant_id` int(11) NOT NULL DEFAULT '1',
  `title` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `description` text COLLATE utf8mb4_unicode_ci,
  `task_type` varchar(100) COLLATE utf8mb4_unicode_ci NOT NULL COMMENT 'Custom task type from wizard',
  `priority` enum('low','medium','high','urgent') COLLATE utf8mb4_unicode_ci DEFAULT 'medium',
  `default_due_days` int(11) DEFAULT NULL COMMENT 'Days after loan creation to set as due date (NULL = no due date)',
  `order_index` int(11) DEFAULT '0' COMMENT 'Order in the loan workflow (lower = earlier in process)',
  `is_active` tinyint(1) DEFAULT '1' COMMENT 'Only active templates are used for new loans',
  `created_by_broker_id` int(11) NOT NULL COMMENT 'Broker who created this template',
  `created_at` datetime DEFAULT CURRENT_TIMESTAMP,
  `updated_at` datetime DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `requires_documents` tinyint(1) DEFAULT '0' COMMENT 'Whether this task requires document uploads',
  `document_instructions` text COLLATE utf8mb4_unicode_ci COMMENT 'Instructions for required documents',
  `has_custom_form` tinyint(1) DEFAULT '0' COMMENT 'Whether this task has custom form fields',
  `has_signing` tinyint(1) DEFAULT '0' COMMENT 'Whether this task requires document signing (has signing zones)'
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='Reusable task templates for loan workflows';

--
-- Dumping data for table `task_templates`
--

INSERT INTO `task_templates` (`id`, `tenant_id`, `title`, `description`, `task_type`, `priority`, `default_due_days`, `order_index`, `is_active`, `created_by_broker_id`, `created_at`, `updated_at`, `requires_documents`, `document_instructions`, `has_custom_form`, `has_signing`) VALUES
(34, 2, 'Government-Issued ID', 'Provide a valid government-issued photo identification.', 'document_verification', 'high', 7, 10, 1, 1, '2026-02-25 20:23:05', '2026-03-16 18:51:11', 1, 'Attach a clear photo or scan of your valid government-issued ID (passport, driver license, state ID, etc.).', 0, 0),
(35, 2, 'Driver\'s License', 'Provide your valid driver\'s license as a form of identification.', 'document_verification', 'high', 7, 11, 1, 1, '2026-02-25 20:23:05', '2026-03-16 18:51:11', 1, 'Attach a clear photo or scan of your valid driver\'s license (front and back).', 0, 0),
(36, 2, 'Green Card (Permanent Resident Card)', 'Provide your valid Permanent Resident Card (Form I-551).', 'document_verification', 'high', 7, 12, 1, 1, '2026-02-25 20:23:05', '2026-03-16 18:51:11', 1, 'Attach a clear photo or scan of your valid Green Card (front and back).', 0, 0),
(37, 2, 'Social Security Card (SSN)', 'Provide your Social Security card issued by the Social Security Administration (SSA).', 'document_verification', 'high', 7, 13, 1, 1, '2026-02-25 20:23:05', '2026-03-16 18:51:11', 1, 'Attach a clear photo or scan of your Social Security card. Make sure the number is clearly visible.', 0, 0),
(38, 2, 'Housing Payment Statement (2 Months)', 'Provide the last two months of bank or mortgage statements showing your housing payment.', 'document_verification', 'medium', 14, 14, 1, 1, '2026-02-25 20:23:05', '2026-03-16 18:51:11', 1, 'Attach the last two months of bank or mortgage statements. They must clearly show the account holder name, partial account number, and housing payment transactions.', 0, 0),
(39, 2, 'Homeowner\'s Insurance Policy', 'Provide the current homeowner\'s insurance policy for the property.', 'document_verification', 'medium', 14, 15, 1, 1, '2026-02-25 20:23:05', '2026-03-16 18:51:11', 1, 'Attach the active homeowner\'s insurance policy. It must include the policy number, coverage details, insured name, and effective dates.', 0, 0),
(40, 2, 'W-2 Form', 'Provide your W-2 form(s) for the most recent tax year.', 'document_verification', 'high', 14, 16, 1, 1, '2026-02-25 20:23:05', '2026-03-16 18:51:11', 1, 'Attach all W-2 forms from the most recent tax year. If you have multiple employers, include the W-2 from each one.', 0, 0),
(41, 2, '1099 Forms (Last 2 Years)', 'Provide all 1099 forms received in the last two tax years.', 'document_verification', 'high', 14, 20, 1, 1, '2026-02-25 21:40:00', '2026-03-16 18:51:11', 1, 'Attach all 1099 forms (1099-MISC, 1099-NEC, 1099-INT, etc.) for the last two tax years. Include all issuers.', 0, 0),
(42, 2, 'Federal Tax Returns Last 2 Years Including Business Tax Returns', 'Provide signed federal tax returns (Form 1040) for the last two years, including all business tax returns (Schedule C, 1120-S, 1065, etc.) and all schedules.', 'document_verification', 'high', 14, 21, 1, 1, '2026-02-25 21:40:00', '2026-03-16 18:51:11', 1, 'Attach complete and signed IRS Form 1040 with all business tax returns (Schedule C, 1120-S, 1065, etc.) for the last two tax years.', 0, 0),
(43, 2, 'Business License', 'Provide a copy of your current business license or registration.', 'document_verification', 'medium', 10, 22, 1, 1, '2026-02-25 21:40:00', '2026-03-16 18:51:11', 1, 'Attach a copy of your valid business license, DBA registration, or LLC/corporation certificate.', 0, 0),
(44, 2, 'Profit & Loss Statement (Current Year)', 'Provide a year-to-date profit & loss statement for your business.', 'document_verification', 'high', 10, 23, 1, 1, '2026-02-25 21:40:00', '2026-03-16 18:51:11', 1, 'Attach a YTD profit & loss statement prepared by a CPA or bookkeeper. Must include revenue, expenses, and net income.', 0, 0),
(45, 2, 'Business Bank Statements (3 Months)', 'Provide the last 3 months of business bank statements.', 'document_verification', 'high', 14, 24, 1, 1, '2026-02-25 21:40:00', '2026-03-16 18:51:11', 1, 'Attach the last 3 months of all business bank statements. Must show account holder name, account number (partial), and all transactions.', 0, 0),
(46, 2, 'Investment / Brokerage Account Statements (2 Months)', 'Provide the last 2 months of investment or brokerage account statements.', 'document_verification', 'medium', 14, 25, 1, 1, '2026-02-25 21:40:00', '2026-03-16 18:51:11', 1, 'Attach the last 2 months of all investment, brokerage, or retirement account statements (401k, IRA, etc.).', 0, 0),
(47, 2, 'Pension / Retirement Award Letter', 'Provide a pension or retirement benefit award letter showing monthly income.', 'document_verification', 'medium', 14, 26, 1, 1, '2026-02-25 21:40:00', '2026-03-16 18:51:11', 1, 'Attach the most recent pension or retirement award/benefit letter. It must show the monthly payment amount and the issuing organization.', 0, 0),
(48, 2, 'Social Security Award Letter', 'Provide the most recent Social Security benefits award letter.', 'document_verification', 'medium', 14, 27, 1, 1, '2026-02-25 21:40:00', '2026-03-16 18:51:11', 1, 'Attach your most recent Social Security award letter showing your monthly benefit amount. You can obtain it from ssa.gov.', 0, 0),
(49, 2, 'Visa / Work Authorization Document', 'Provide a copy of your current visa or work authorization document (I-94, EAD, H-1B, etc.).', 'document_verification', 'high', 7, 28, 1, 1, '2026-02-25 21:40:00', '2026-03-16 18:51:11', 1, 'Attach a clear copy of your valid visa, I-94 Arrival/Departure Record, Employment Authorization Document (EAD), or other immigration status document.', 0, 0),
(50, 2, 'ITIN Assignment Letter', 'Provide the IRS ITIN assignment letter (CP565 notice).', 'document_verification', 'medium', 7, 29, 1, 1, '2026-02-25 21:40:00', '2026-03-16 18:51:11', 1, 'Attach your IRS ITIN assignment letter (Notice CP565) showing your Individual Taxpayer Identification Number.', 0, 0),
(51, 2, 'Current Mortgage Statement', 'Provide the most recent monthly mortgage statement for the property being refinanced.', 'document_verification', 'high', 7, 30, 1, 1, '2026-02-25 21:40:00', '2026-03-16 18:51:11', 1, 'Attach your most recent mortgage statement showing the current balance, monthly payment, and lender information.', 0, 0),
(52, 2, 'Most Recent Property Tax Bill', 'Provide the most recent property tax bill for the subject property.', 'document_verification', 'medium', 14, 31, 1, 1, '2026-02-25 21:40:00', '2026-03-16 18:51:11', 1, 'Attach the most recent property tax assessment or bill from your county/city assessor.', 0, 0),
(53, 2, 'Purchase Agreement / Offer Letter', 'Provide a fully executed purchase agreement or offer letter for the property.', 'document_verification', 'high', 5, 32, 1, 1, '2026-02-25 21:40:00', '2026-03-16 18:51:11', 1, 'Attach the signed purchase agreement (sales contract) including all addenda and counteroffers.', 0, 0),
(54, 2, 'Construction Plans & Builder Contract', 'Provide the construction plans and a signed contract with your builder.', 'document_verification', 'high', 10, 33, 1, 1, '2026-02-25 21:40:00', '2026-03-16 18:51:11', 1, 'Attach the architectural/engineering plans for the construction project and the signed builder contract including total cost breakdown.', 0, 0),
(55, 2, 'HOA Statement & Master Insurance Policy', 'Provide the current HOA statement and the master insurance policy for the condo community.', 'document_verification', 'medium', 14, 34, 1, 1, '2026-02-25 21:40:00', '2026-03-16 18:51:11', 1, 'Attach the current HOA dues statement and the master/blanket insurance policy (hazard + liability) for the condo association.', 0, 0),
(56, 2, 'Existing Lease Agreements', 'Provide copies of all current lease agreements for the rental units.', 'document_verification', 'medium', 14, 35, 1, 1, '2026-02-25 21:40:00', '2026-03-16 18:51:11', 1, 'Attach all signed lease agreements currently in effect for each rental unit in the property. Include lease start/end dates and monthly rent amounts.', 0, 0),
(57, 2, 'Business Financial Statements', 'Provide the last 2 years of business financial statements (income statement & balance sheet).', 'document_verification', 'high', 14, 36, 1, 1, '2026-02-25 21:40:00', '2026-03-16 18:51:11', 1, 'Attach the last 2 years of income statements and balance sheets for the business operating at or owning the commercial property. CPA-prepared preferred.', 0, 0),
(58, 2, '2 Months Bank Statements', 'Provide your last two months of bank statements for all accounts.', 'document_verification', 'medium', 14, 14, 1, 1, '2026-03-04 20:24:13', '2026-03-16 18:51:11', 1, 'Attach the last two months of all bank account statements. Must show account holder name, partial account number, and all transactions.', 0, 0),
(59, 2, 'Most Recent Pay-Stubs (1 Month)', 'Provide your most recent one month of consecutive pay stubs from your employer.', 'document_verification', 'high', 10, 17, 1, 1, '2026-03-04 20:24:13', '2026-03-16 18:51:11', 1, 'Attach your most recent consecutive pay stubs covering at least one month. Must show employer name, gross pay, deductions, and year-to-date totals.', 0, 0),
(60, 2, 'Federal Tax Returns (Last 2 Years) or Schedule C (Last 2 Years)', 'Provide your federal income tax returns or Schedule C for the last two tax years.', 'document_verification', 'high', 14, 22, 1, 1, '2026-03-04 20:24:13', '2026-03-16 18:51:11', 1, 'Attach your complete and signed federal tax returns (Form 1040) or Schedule C for the last two tax years. Include all schedules and attachments.', 0, 0),
(61, 2, 'Mortgage Statement', 'Provide the most recent mortgage statement for the subject property.', 'document_verification', 'medium', 10, 31, 1, 1, '2026-03-04 20:24:13', '2026-03-16 18:51:11', 1, 'Attach your most recent mortgage statement showing outstanding balance, monthly payment, lender name, and property address.', 0, 0),
(62, 2, 'Insurance Policy', 'Provide the current homeowners or property insurance policy for the subject property.', 'document_verification', 'medium', 14, 32, 1, 1, '2026-03-04 20:24:13', '2026-03-16 18:51:11', 1, 'Attach the current insurance policy (declaration page). Must include policy number, coverage amounts, property address, named insured, and effective dates.', 0, 0),
(63, 2, 'Current Mortgage Statement / Payoff Letter', 'Provide the most recent mortgage statement or an official payoff letter for the property being refinanced.', 'document_verification', 'high', 7, 33, 1, 1, '2026-03-04 20:24:13', '2026-03-16 18:51:11', 1, 'Attach your most recent mortgage statement or an official payoff letter from your lender. Must show current balance, monthly payment, and lender contact information.', 0, 0);

-- --------------------------------------------------------

--
-- Table structure for table `templates`
--

CREATE TABLE `templates` (
  `id` int(11) NOT NULL,
  `tenant_id` int(11) NOT NULL DEFAULT '1',
  `name` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `description` text COLLATE utf8mb4_unicode_ci,
  `template_type` enum('email','sms','whatsapp') COLLATE utf8mb4_unicode_ci NOT NULL,
  `category` enum('welcome','reminder','update','follow_up','marketing','system') COLLATE utf8mb4_unicode_ci DEFAULT 'system',
  `subject` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT 'For email templates',
  `body` text COLLATE utf8mb4_unicode_ci NOT NULL,
  `variables` json DEFAULT NULL COMMENT 'Available template variables',
  `is_active` tinyint(1) DEFAULT '1',
  `usage_count` int(11) DEFAULT '0',
  `created_by_broker_id` int(11) NOT NULL,
  `created_at` datetime DEFAULT CURRENT_TIMESTAMP,
  `updated_at` datetime DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Table structure for table `tenants`
--

CREATE TABLE `tenants` (
  `id` int(11) NOT NULL,
  `slug` varchar(100) COLLATE utf8mb4_unicode_ci NOT NULL COMMENT 'URL-friendly identifier (e.g., encore, acme)',
  `name` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL COMMENT 'Display name of tenant',
  `domain` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT 'Custom domain (optional)',
  `status` enum('active','inactive','suspended') COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'active',
  `is_default` tinyint(1) DEFAULT '0' COMMENT 'Default tenant for root domain access',
  `logo_url` varchar(500) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `favicon_url` varchar(500) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `primary_color` varchar(7) COLLATE utf8mb4_unicode_ci DEFAULT '#667eea' COMMENT 'Hex color code',
  `secondary_color` varchar(7) COLLATE utf8mb4_unicode_ci DEFAULT '#764ba2' COMMENT 'Hex color code',
  `accent_color` varchar(7) COLLATE utf8mb4_unicode_ci DEFAULT '#f59e0b' COMMENT 'Hex color code',
  `background_color` varchar(7) COLLATE utf8mb4_unicode_ci DEFAULT '#ffffff' COMMENT 'Hex color code',
  `text_color` varchar(7) COLLATE utf8mb4_unicode_ci DEFAULT '#1f2937' COMMENT 'Hex color code',
  `font_family` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT 'Inter, sans-serif',
  `font_size_base` varchar(10) COLLATE utf8mb4_unicode_ci DEFAULT '16px',
  `font_weight_normal` varchar(10) COLLATE utf8mb4_unicode_ci DEFAULT '400',
  `font_weight_bold` varchar(10) COLLATE utf8mb4_unicode_ci DEFAULT '600',
  `border_radius` varchar(10) COLLATE utf8mb4_unicode_ci DEFAULT '8px',
  `border_width` varchar(10) COLLATE utf8mb4_unicode_ci DEFAULT '1px',
  `shadow_sm` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT '0 1px 2px 0 rgb(0 0 0 / 0.05)',
  `shadow_md` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT '0 4px 6px -1px rgb(0 0 0 / 0.1)',
  `shadow_lg` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT '0 10px 15px -3px rgb(0 0 0 / 0.1)',
  `company_name` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `contact_email` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `contact_phone` varchar(20) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `address` text COLLATE utf8mb4_unicode_ci,
  `custom_css` text COLLATE utf8mb4_unicode_ci,
  `custom_js` text COLLATE utf8mb4_unicode_ci,
  `settings` json DEFAULT NULL COMMENT 'Additional tenant-specific settings',
  `created_at` datetime DEFAULT CURRENT_TIMESTAMP,
  `updated_at` datetime DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Dumping data for table `tenants`
--

INSERT INTO `tenants` (`id`, `slug`, `name`, `domain`, `status`, `is_default`, `logo_url`, `favicon_url`, `primary_color`, `secondary_color`, `accent_color`, `background_color`, `text_color`, `font_family`, `font_size_base`, `font_weight_normal`, `font_weight_bold`, `border_radius`, `border_width`, `shadow_sm`, `shadow_md`, `shadow_lg`, `company_name`, `contact_email`, `contact_phone`, `address`, `custom_css`, `custom_js`, `settings`, `created_at`, `updated_at`) VALUES
(1, 'encore', 'Encore Mortgage', 'https://real-state-one-omega.vercel.app/', 'active', 1, 'https://disruptinglabs.com/data/encore/assets/images/logo.png', 'https://disruptinglabs.com/data/encore/assets/images/favicon/favicon.ico', '#D32F2F', '#000000', '#D32F2F', '#F9F9F9', '#222222', 'Inter, sans-serif', '16px', '400', '600', '8px', '1px', '0 1px 2px 0 rgb(0 0 0 / 0.05)', '0 4px 6px -1px rgb(0 0 0 / 0.1)', '0 10px 15px -3px rgb(0 0 0 / 0.1)', 'Encore Mortgage', 'contact@encoremortgage.org', NULL, NULL, NULL, NULL, NULL, '2026-02-02 14:24:21', '2026-02-02 17:43:16'),
(2, 'themortgageprofessionals', 'The Mortgage Professionals', 'themortgageprofessionals.net', 'active', 0, 'https://disruptinglabs.com/data/themortgageprofessionals/assets/images/logo.png', 'https://disruptinglabs.com/data/themortgageprofessionals/assets/images/favicon/favicon.ico', '#1e40af', '#3b82f6', '#f59e0b', '#ffffff', '#1f2937', 'Inter, sans-serif', '16px', '400', '600', '8px', '1px', '0 1px 2px 0 rgb(0 0 0 / 0.05)', '0 4px 6px -1px rgb(0 0 0 / 0.1)', '0 10px 15px -3px rgb(0 0 0 / 0.1)', 'The Mortgage Professionals', 'contact@themortgageprofessionals.net', NULL, NULL, NULL, NULL, NULL, '2026-02-02 17:09:27', '2026-02-02 17:18:20');

-- --------------------------------------------------------

--
-- Table structure for table `user_profiles`
--

CREATE TABLE `user_profiles` (
  `id` int(11) NOT NULL,
  `user_id` int(11) NOT NULL,
  `date_of_birth` date DEFAULT NULL,
  `ssn_last_four` varchar(4) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `address_line1` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `address_line2` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `city` varchar(100) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `state` varchar(50) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `zip_code` varchar(10) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `country` varchar(100) COLLATE utf8mb4_unicode_ci DEFAULT 'USA',
  `employment_status` enum('employed','self_employed','unemployed','retired','retired_with_pension') COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `employer_name` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `annual_income` decimal(12,2) DEFAULT NULL,
  `credit_score` int(11) DEFAULT NULL,
  `avatar_url` varchar(500) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `created_at` datetime DEFAULT CURRENT_TIMESTAMP,
  `updated_at` datetime DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Table structure for table `user_sessions`
--

CREATE TABLE `user_sessions` (
  `id` int(11) NOT NULL,
  `user_id` int(11) NOT NULL,
  `session_code` int(6) NOT NULL,
  `is_active` tinyint(1) NOT NULL DEFAULT '1',
  `ip_address` varchar(45) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `user_agent` varchar(500) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `expires_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Dumping data for table `user_sessions`
--

INSERT INTO `user_sessions` (`id`, `user_id`, `session_code`, `is_active`, `ip_address`, `user_agent`, `expires_at`, `created_at`) VALUES
(20, 31, 408640, 1, NULL, NULL, '2026-03-17 02:40:31', '2026-03-17 02:25:31');

--
-- Indexes for dumped tables
--

--
-- Indexes for table `admin_section_controls`
--
ALTER TABLE `admin_section_controls`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `uq_tenant_section` (`tenant_id`,`section_id`);

--
-- Indexes for table `application_status_history`
--
ALTER TABLE `application_status_history`
  ADD PRIMARY KEY (`id`),
  ADD KEY `changed_by_broker_id` (`changed_by_broker_id`),
  ADD KEY `idx_application_id` (`application_id`),
  ADD KEY `idx_created_at` (`created_at`),
  ADD KEY `tenant_id` (`tenant_id`);

--
-- Indexes for table `audit_logs`
--
ALTER TABLE `audit_logs`
  ADD PRIMARY KEY (`id`),
  ADD KEY `idx_user_id` (`user_id`),
  ADD KEY `idx_broker_id` (`broker_id`),
  ADD KEY `idx_entity` (`entity_type`,`entity_id`),
  ADD KEY `idx_created_at` (`created_at`),
  ADD KEY `idx_actor_type` (`actor_type`),
  ADD KEY `idx_action` (`action`),
  ADD KEY `idx_entity_type` (`entity_type`),
  ADD KEY `idx_status` (`status`),
  ADD KEY `idx_request_id` (`request_id`),
  ADD KEY `tenant_id` (`tenant_id`);

--
-- Indexes for table `brokers`
--
ALTER TABLE `brokers`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `unique_tenant_email` (`tenant_id`,`email`),
  ADD UNIQUE KEY `uk_brokers_public_token` (`public_token`),
  ADD KEY `idx_email` (`email`),
  ADD KEY `idx_role` (`role`),
  ADD KEY `idx_status` (`status`),
  ADD KEY `tenant_id` (`tenant_id`),
  ADD KEY `idx_brokers_created_by` (`created_by_broker_id`);

--
-- Indexes for table `broker_monthly_metrics`
--
ALTER TABLE `broker_monthly_metrics`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `uq_tenant_broker_year_month` (`tenant_id`,`broker_id`,`year`,`month`),
  ADD KEY `idx_tenant_id` (`tenant_id`),
  ADD KEY `idx_broker_id` (`broker_id`);

--
-- Indexes for table `broker_profiles`
--
ALTER TABLE `broker_profiles`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `broker_id` (`broker_id`);

--
-- Indexes for table `broker_sessions`
--
ALTER TABLE `broker_sessions`
  ADD PRIMARY KEY (`id`),
  ADD KEY `idx_broker_id` (`broker_id`),
  ADD KEY `idx_session_code` (`session_code`),
  ADD KEY `idx_is_active` (`is_active`),
  ADD KEY `idx_expires_at` (`expires_at`);

--
-- Indexes for table `campaigns`
--
ALTER TABLE `campaigns`
  ADD PRIMARY KEY (`id`),
  ADD KEY `created_by_broker_id` (`created_by_broker_id`),
  ADD KEY `idx_status` (`status`),
  ADD KEY `idx_campaign_type` (`campaign_type`),
  ADD KEY `tenant_id` (`tenant_id`),
  ADD KEY `idx_template_id` (`template_id`);

--
-- Indexes for table `campaign_recipients`
--
ALTER TABLE `campaign_recipients`
  ADD PRIMARY KEY (`id`),
  ADD KEY `user_id` (`user_id`),
  ADD KEY `lead_id` (`lead_id`),
  ADD KEY `idx_campaign_id` (`campaign_id`),
  ADD KEY `idx_status` (`status`);

--
-- Indexes for table `clients`
--
ALTER TABLE `clients`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `unique_tenant_email` (`tenant_id`,`email`),
  ADD KEY `idx_email` (`email`),
  ADD KEY `idx_status` (`status`),
  ADD KEY `idx_assigned_broker` (`assigned_broker_id`),
  ADD KEY `idx_income_type` (`income_type`),
  ADD KEY `tenant_id` (`tenant_id`),
  ADD KEY `idx_clients_citizenship` (`citizenship_status`);

--
-- Indexes for table `communications`
--
ALTER TABLE `communications`
  ADD PRIMARY KEY (`id`),
  ADD KEY `from_user_id` (`from_user_id`),
  ADD KEY `from_broker_id` (`from_broker_id`),
  ADD KEY `to_user_id` (`to_user_id`),
  ADD KEY `to_broker_id` (`to_broker_id`),
  ADD KEY `idx_application_id` (`application_id`),
  ADD KEY `idx_lead_id` (`lead_id`),
  ADD KEY `idx_communication_type` (`communication_type`),
  ADD KEY `idx_created_at` (`created_at`),
  ADD KEY `tenant_id` (`tenant_id`),
  ADD KEY `idx_conversation_id` (`conversation_id`),
  ADD KEY `idx_thread_id` (`thread_id`),
  ADD KEY `idx_reply_to_id` (`reply_to_id`),
  ADD KEY `idx_message_type` (`message_type`),
  ADD KEY `idx_delivery_status` (`delivery_status`),
  ADD KEY `idx_delivery_timestamp` (`delivery_timestamp`),
  ADD KEY `idx_communications_conversation` (`conversation_id`,`tenant_id`),
  ADD KEY `idx_communications_type` (`communication_type`,`tenant_id`),
  ADD KEY `idx_communications_status` (`status`,`delivery_status`),
  ADD KEY `idx_communications_created` (`created_at`);

--
-- Indexes for table `compliance_checklists`
--
ALTER TABLE `compliance_checklists`
  ADD PRIMARY KEY (`id`),
  ADD KEY `completed_by_broker_id` (`completed_by_broker_id`),
  ADD KEY `idx_application_id` (`application_id`),
  ADD KEY `tenant_id` (`tenant_id`);

--
-- Indexes for table `compliance_checklist_items`
--
ALTER TABLE `compliance_checklist_items`
  ADD PRIMARY KEY (`id`),
  ADD KEY `completed_by_broker_id` (`completed_by_broker_id`),
  ADD KEY `idx_checklist_id` (`checklist_id`);

--
-- Indexes for table `contact_submissions`
--
ALTER TABLE `contact_submissions`
  ADD PRIMARY KEY (`id`),
  ADD KEY `idx_contact_tenant` (`tenant_id`),
  ADD KEY `idx_contact_is_read` (`is_read`),
  ADD KEY `idx_contact_created_at` (`created_at`);

--
-- Indexes for table `conversation_threads`
--
ALTER TABLE `conversation_threads`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `idx_conversation_id` (`conversation_id`),
  ADD KEY `idx_tenant_application` (`tenant_id`,`application_id`),
  ADD KEY `idx_tenant_lead` (`tenant_id`,`lead_id`),
  ADD KEY `idx_tenant_client` (`tenant_id`,`client_id`),
  ADD KEY `idx_broker_id` (`broker_id`),
  ADD KEY `idx_last_message_at` (`last_message_at`),
  ADD KEY `idx_status` (`status`),
  ADD KEY `idx_priority` (`priority`),
  ADD KEY `fk_conversation_threads_application` (`application_id`),
  ADD KEY `fk_conversation_threads_lead` (`lead_id`),
  ADD KEY `fk_conversation_threads_client` (`client_id`),
  ADD KEY `idx_conversations_tenant_broker` (`tenant_id`,`broker_id`),
  ADD KEY `idx_conversations_status` (`status`,`tenant_id`),
  ADD KEY `idx_conversations_priority` (`priority`,`tenant_id`),
  ADD KEY `idx_conversations_last_message` (`last_message_at`);

--
-- Indexes for table `documents`
--
ALTER TABLE `documents`
  ADD PRIMARY KEY (`id`),
  ADD KEY `uploaded_by_user_id` (`uploaded_by_user_id`),
  ADD KEY `uploaded_by_broker_id` (`uploaded_by_broker_id`),
  ADD KEY `reviewed_by_broker_id` (`reviewed_by_broker_id`),
  ADD KEY `idx_application_id` (`application_id`),
  ADD KEY `idx_document_type` (`document_type`),
  ADD KEY `idx_status` (`status`),
  ADD KEY `tenant_id` (`tenant_id`);

--
-- Indexes for table `environment_keys`
--
ALTER TABLE `environment_keys`
  ADD PRIMARY KEY (`id`);

--
-- Indexes for table `leads`
--
ALTER TABLE `leads`
  ADD PRIMARY KEY (`id`),
  ADD KEY `idx_status` (`status`),
  ADD KEY `idx_assigned_broker` (`assigned_broker_id`),
  ADD KEY `idx_created_at` (`created_at`),
  ADD KEY `tenant_id` (`tenant_id`);

--
-- Indexes for table `lead_activities`
--
ALTER TABLE `lead_activities`
  ADD PRIMARY KEY (`id`),
  ADD KEY `performed_by_broker_id` (`performed_by_broker_id`),
  ADD KEY `idx_lead_id` (`lead_id`),
  ADD KEY `idx_activity_type` (`activity_type`),
  ADD KEY `idx_scheduled_at` (`scheduled_at`);

--
-- Indexes for table `loan_applications`
--
ALTER TABLE `loan_applications`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `application_number` (`application_number`),
  ADD KEY `idx_application_number` (`application_number`),
  ADD KEY `idx_client` (`client_user_id`),
  ADD KEY `idx_broker` (`broker_user_id`),
  ADD KEY `idx_status` (`status`),
  ADD KEY `idx_created_at` (`created_at`),
  ADD KEY `tenant_id` (`tenant_id`),
  ADD KEY `idx_loan_applications_broker_token` (`broker_token`),
  ADD KEY `idx_loan_apps_citizenship` (`citizenship_status`),
  ADD KEY `idx_partner_broker` (`partner_broker_id`);

--
-- Indexes for table `notifications`
--
ALTER TABLE `notifications`
  ADD PRIMARY KEY (`id`),
  ADD KEY `idx_user_id` (`user_id`),
  ADD KEY `idx_is_read` (`is_read`),
  ADD KEY `idx_created_at` (`created_at`),
  ADD KEY `tenant_id` (`tenant_id`);

--
-- Indexes for table `pipeline_step_templates`
--
ALTER TABLE `pipeline_step_templates`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `unique_tenant_step_channel` (`tenant_id`,`pipeline_step`,`communication_type`),
  ADD KEY `idx_pipeline_step_templates_tenant` (`tenant_id`),
  ADD KEY `idx_pipeline_step_templates_step` (`pipeline_step`),
  ADD KEY `fk_pst_template` (`template_id`);

--
-- Indexes for table `pre_approval_letters`
--
ALTER TABLE `pre_approval_letters`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `uq_pre_approval_per_loan` (`application_id`,`tenant_id`) COMMENT 'One active letter per loan per tenant',
  ADD KEY `idx_pre_approval_tenant` (`tenant_id`),
  ADD KEY `idx_pre_approval_application` (`application_id`),
  ADD KEY `idx_pre_approval_created_by` (`created_by_broker_id`);

--
-- Indexes for table `reminder_flows`
--
ALTER TABLE `reminder_flows`
  ADD PRIMARY KEY (`id`),
  ADD KEY `idx_reminder_flows_tenant` (`tenant_id`),
  ADD KEY `idx_reminder_flows_active` (`is_active`),
  ADD KEY `fk_reminder_flows_broker` (`created_by_broker_id`),
  ADD KEY `idx_reminder_flows_trigger_loantype` (`trigger_event`,`loan_type_filter`,`is_active`);

--
-- Indexes for table `reminder_flow_connections`
--
ALTER TABLE `reminder_flow_connections`
  ADD PRIMARY KEY (`id`),
  ADD KEY `idx_flow_connections_flow` (`flow_id`);

--
-- Indexes for table `reminder_flow_executions`
--
ALTER TABLE `reminder_flow_executions`
  ADD PRIMARY KEY (`id`),
  ADD KEY `idx_executions_flow` (`flow_id`),
  ADD KEY `idx_executions_loan` (`loan_application_id`),
  ADD KEY `idx_executions_client` (`client_id`),
  ADD KEY `idx_executions_status` (`status`),
  ADD KEY `idx_executions_next_exec` (`next_execution_at`),
  ADD KEY `idx_executions_responded` (`responded_at`);

--
-- Indexes for table `reminder_flow_steps`
--
ALTER TABLE `reminder_flow_steps`
  ADD PRIMARY KEY (`id`),
  ADD KEY `idx_flow_steps_flow` (`flow_id`);

--
-- Indexes for table `system_settings`
--
ALTER TABLE `system_settings`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `setting_key` (`setting_key`),
  ADD KEY `tenant_id` (`tenant_id`);

--
-- Indexes for table `tasks`
--
ALTER TABLE `tasks`
  ADD PRIMARY KEY (`id`),
  ADD KEY `created_by_broker_id` (`created_by_broker_id`),
  ADD KEY `idx_application_id` (`application_id`),
  ADD KEY `idx_assigned_to_user` (`assigned_to_user_id`),
  ADD KEY `idx_assigned_to_broker` (`assigned_to_broker_id`),
  ADD KEY `idx_status` (`status`),
  ADD KEY `idx_due_date` (`due_date`),
  ADD KEY `idx_template` (`template_id`),
  ADD KEY `idx_application_status` (`application_id`,`status`),
  ADD KEY `idx_tasks_form_completed` (`form_completed`),
  ADD KEY `idx_tasks_documents_uploaded` (`documents_uploaded`),
  ADD KEY `fk_tasks_approved_by` (`approved_by_broker_id`),
  ADD KEY `fk_tasks_reopened_by` (`reopened_by_broker_id`),
  ADD KEY `tenant_id` (`tenant_id`),
  ADD KEY `fk_tasks_status_changed_by_broker` (`status_changed_by_broker_id`),
  ADD KEY `idx_tasks_status_changes` (`status_changed_at`,`status_changed_by_broker_id`),
  ADD KEY `idx_tasks_audit_tracking` (`status`,`status_changed_at`,`application_id`);

--
-- Indexes for table `task_documents`
--
ALTER TABLE `task_documents`
  ADD PRIMARY KEY (`id`),
  ADD KEY `idx_task_id` (`task_id`),
  ADD KEY `idx_field_id` (`field_id`),
  ADD KEY `idx_uploaded_at` (`uploaded_at`);

--
-- Indexes for table `task_form_fields`
--
ALTER TABLE `task_form_fields`
  ADD PRIMARY KEY (`id`),
  ADD KEY `idx_task_template_id` (`task_template_id`),
  ADD KEY `idx_order_index` (`order_index`);

--
-- Indexes for table `task_form_responses`
--
ALTER TABLE `task_form_responses`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `unique_task_field_response` (`task_id`,`field_id`),
  ADD KEY `idx_task_id` (`task_id`),
  ADD KEY `idx_field_id` (`field_id`);

--
-- Indexes for table `task_signatures`
--
ALTER TABLE `task_signatures`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `unique_task_zone` (`task_id`,`zone_id`),
  ADD KEY `idx_task_id` (`task_id`),
  ADD KEY `idx_sign_document_id` (`sign_document_id`),
  ADD KEY `idx_tenant_id` (`tenant_id`);

--
-- Indexes for table `task_sign_documents`
--
ALTER TABLE `task_sign_documents`
  ADD PRIMARY KEY (`id`),
  ADD KEY `idx_task_template_id` (`task_template_id`),
  ADD KEY `idx_tenant_id` (`tenant_id`);

--
-- Indexes for table `task_templates`
--
ALTER TABLE `task_templates`
  ADD PRIMARY KEY (`id`),
  ADD KEY `idx_created_by_broker` (`created_by_broker_id`),
  ADD KEY `idx_active_order` (`is_active`,`order_index`),
  ADD KEY `idx_task_templates_requires_documents` (`requires_documents`),
  ADD KEY `idx_task_templates_has_custom_form` (`has_custom_form`),
  ADD KEY `idx_task_templates_tenant` (`tenant_id`),
  ADD KEY `idx_task_templates_has_signing` (`has_signing`);

--
-- Indexes for table `templates`
--
ALTER TABLE `templates`
  ADD PRIMARY KEY (`id`),
  ADD KEY `idx_tenant_type` (`tenant_id`,`template_type`),
  ADD KEY `idx_category` (`category`),
  ADD KEY `idx_active` (`is_active`),
  ADD KEY `idx_created_by` (`created_by_broker_id`),
  ADD KEY `idx_templates_type` (`template_type`,`tenant_id`),
  ADD KEY `idx_templates_active` (`is_active`,`tenant_id`),
  ADD KEY `idx_templates_category` (`category`,`tenant_id`);

--
-- Indexes for table `tenants`
--
ALTER TABLE `tenants`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `slug` (`slug`),
  ADD UNIQUE KEY `domain` (`domain`),
  ADD KEY `status` (`status`);

--
-- Indexes for table `user_profiles`
--
ALTER TABLE `user_profiles`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `user_id` (`user_id`);

--
-- Indexes for table `user_sessions`
--
ALTER TABLE `user_sessions`
  ADD PRIMARY KEY (`id`),
  ADD KEY `idx_user_id` (`user_id`),
  ADD KEY `idx_session_code` (`session_code`),
  ADD KEY `idx_is_active` (`is_active`),
  ADD KEY `idx_expires_at` (`expires_at`);

--
-- AUTO_INCREMENT for dumped tables
--

--
-- AUTO_INCREMENT for table `admin_section_controls`
--
ALTER TABLE `admin_section_controls`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=12;

--
-- AUTO_INCREMENT for table `application_status_history`
--
ALTER TABLE `application_status_history`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=127;

--
-- AUTO_INCREMENT for table `audit_logs`
--
ALTER TABLE `audit_logs`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=214;

--
-- AUTO_INCREMENT for table `brokers`
--
ALTER TABLE `brokers`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=14;

--
-- AUTO_INCREMENT for table `broker_monthly_metrics`
--
ALTER TABLE `broker_monthly_metrics`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `broker_profiles`
--
ALTER TABLE `broker_profiles`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=11;

--
-- AUTO_INCREMENT for table `broker_sessions`
--
ALTER TABLE `broker_sessions`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=133;

--
-- AUTO_INCREMENT for table `campaigns`
--
ALTER TABLE `campaigns`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `campaign_recipients`
--
ALTER TABLE `campaign_recipients`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `clients`
--
ALTER TABLE `clients`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=32;

--
-- AUTO_INCREMENT for table `communications`
--
ALTER TABLE `communications`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `compliance_checklists`
--
ALTER TABLE `compliance_checklists`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `compliance_checklist_items`
--
ALTER TABLE `compliance_checklist_items`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `contact_submissions`
--
ALTER TABLE `contact_submissions`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `conversation_threads`
--
ALTER TABLE `conversation_threads`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `documents`
--
ALTER TABLE `documents`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=22;

--
-- AUTO_INCREMENT for table `environment_keys`
--
ALTER TABLE `environment_keys`
  MODIFY `id` int(10) UNSIGNED NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=5;

--
-- AUTO_INCREMENT for table `leads`
--
ALTER TABLE `leads`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `lead_activities`
--
ALTER TABLE `lead_activities`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `loan_applications`
--
ALTER TABLE `loan_applications`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=35;

--
-- AUTO_INCREMENT for table `notifications`
--
ALTER TABLE `notifications`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=105;

--
-- AUTO_INCREMENT for table `pipeline_step_templates`
--
ALTER TABLE `pipeline_step_templates`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `pre_approval_letters`
--
ALTER TABLE `pre_approval_letters`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=22;

--
-- AUTO_INCREMENT for table `reminder_flows`
--
ALTER TABLE `reminder_flows`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=11;

--
-- AUTO_INCREMENT for table `reminder_flow_connections`
--
ALTER TABLE `reminder_flow_connections`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=242;

--
-- AUTO_INCREMENT for table `reminder_flow_executions`
--
ALTER TABLE `reminder_flow_executions`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `reminder_flow_steps`
--
ALTER TABLE `reminder_flow_steps`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=246;

--
-- AUTO_INCREMENT for table `system_settings`
--
ALTER TABLE `system_settings`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=13;

--
-- AUTO_INCREMENT for table `tasks`
--
ALTER TABLE `tasks`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=124;

--
-- AUTO_INCREMENT for table `task_documents`
--
ALTER TABLE `task_documents`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=72;

--
-- AUTO_INCREMENT for table `task_form_fields`
--
ALTER TABLE `task_form_fields`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=72;

--
-- AUTO_INCREMENT for table `task_form_responses`
--
ALTER TABLE `task_form_responses`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `task_signatures`
--
ALTER TABLE `task_signatures`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=4;

--
-- AUTO_INCREMENT for table `task_sign_documents`
--
ALTER TABLE `task_sign_documents`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=3;

--
-- AUTO_INCREMENT for table `task_templates`
--
ALTER TABLE `task_templates`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=64;

--
-- AUTO_INCREMENT for table `templates`
--
ALTER TABLE `templates`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=93;

--
-- AUTO_INCREMENT for table `tenants`
--
ALTER TABLE `tenants`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=3;

--
-- AUTO_INCREMENT for table `user_profiles`
--
ALTER TABLE `user_profiles`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `user_sessions`
--
ALTER TABLE `user_sessions`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=21;

--
-- Constraints for dumped tables
--

--
-- Constraints for table `application_status_history`
--
ALTER TABLE `application_status_history`
  ADD CONSTRAINT `application_status_history_ibfk_1` FOREIGN KEY (`application_id`) REFERENCES `loan_applications` (`id`) ON DELETE CASCADE,
  ADD CONSTRAINT `application_status_history_ibfk_2` FOREIGN KEY (`changed_by_broker_id`) REFERENCES `brokers` (`id`) ON DELETE SET NULL,
  ADD CONSTRAINT `fk_application_status_history_tenant` FOREIGN KEY (`tenant_id`) REFERENCES `tenants` (`id`) ON DELETE CASCADE;

--
-- Constraints for table `audit_logs`
--
ALTER TABLE `audit_logs`
  ADD CONSTRAINT `audit_logs_ibfk_1` FOREIGN KEY (`user_id`) REFERENCES `clients` (`id`) ON DELETE SET NULL,
  ADD CONSTRAINT `audit_logs_ibfk_2` FOREIGN KEY (`broker_id`) REFERENCES `brokers` (`id`) ON DELETE SET NULL,
  ADD CONSTRAINT `fk_audit_logs_tenant` FOREIGN KEY (`tenant_id`) REFERENCES `tenants` (`id`) ON DELETE SET NULL;

--
-- Constraints for table `brokers`
--
ALTER TABLE `brokers`
  ADD CONSTRAINT `fk_brokers_created_by` FOREIGN KEY (`created_by_broker_id`) REFERENCES `brokers` (`id`) ON DELETE SET NULL,
  ADD CONSTRAINT `fk_brokers_tenant` FOREIGN KEY (`tenant_id`) REFERENCES `tenants` (`id`) ON DELETE CASCADE;

--
-- Constraints for table `broker_profiles`
--
ALTER TABLE `broker_profiles`
  ADD CONSTRAINT `broker_profiles_ibfk_1` FOREIGN KEY (`broker_id`) REFERENCES `brokers` (`id`) ON DELETE CASCADE;

--
-- Constraints for table `broker_sessions`
--
ALTER TABLE `broker_sessions`
  ADD CONSTRAINT `broker_sessions_ibfk_1` FOREIGN KEY (`broker_id`) REFERENCES `brokers` (`id`) ON DELETE CASCADE;

--
-- Constraints for table `campaigns`
--
ALTER TABLE `campaigns`
  ADD CONSTRAINT `campaigns_ibfk_3` FOREIGN KEY (`created_by_broker_id`) REFERENCES `brokers` (`id`) ON DELETE SET NULL,
  ADD CONSTRAINT `fk_campaigns_template` FOREIGN KEY (`template_id`) REFERENCES `templates` (`id`) ON DELETE SET NULL,
  ADD CONSTRAINT `fk_campaigns_tenant` FOREIGN KEY (`tenant_id`) REFERENCES `tenants` (`id`) ON DELETE CASCADE;

--
-- Constraints for table `campaign_recipients`
--
ALTER TABLE `campaign_recipients`
  ADD CONSTRAINT `campaign_recipients_ibfk_1` FOREIGN KEY (`campaign_id`) REFERENCES `campaigns` (`id`) ON DELETE CASCADE,
  ADD CONSTRAINT `campaign_recipients_ibfk_2` FOREIGN KEY (`user_id`) REFERENCES `clients` (`id`) ON DELETE SET NULL,
  ADD CONSTRAINT `campaign_recipients_ibfk_3` FOREIGN KEY (`lead_id`) REFERENCES `leads` (`id`) ON DELETE SET NULL;

--
-- Constraints for table `clients`
--
ALTER TABLE `clients`
  ADD CONSTRAINT `fk_clients_tenant` FOREIGN KEY (`tenant_id`) REFERENCES `tenants` (`id`) ON DELETE CASCADE;

--
-- Constraints for table `communications`
--
ALTER TABLE `communications`
  ADD CONSTRAINT `communications_ibfk_1` FOREIGN KEY (`application_id`) REFERENCES `loan_applications` (`id`) ON DELETE SET NULL,
  ADD CONSTRAINT `communications_ibfk_2` FOREIGN KEY (`lead_id`) REFERENCES `leads` (`id`) ON DELETE SET NULL,
  ADD CONSTRAINT `communications_ibfk_3` FOREIGN KEY (`from_user_id`) REFERENCES `clients` (`id`) ON DELETE SET NULL,
  ADD CONSTRAINT `communications_ibfk_4` FOREIGN KEY (`from_broker_id`) REFERENCES `brokers` (`id`) ON DELETE SET NULL,
  ADD CONSTRAINT `communications_ibfk_5` FOREIGN KEY (`to_user_id`) REFERENCES `clients` (`id`) ON DELETE SET NULL,
  ADD CONSTRAINT `communications_ibfk_6` FOREIGN KEY (`to_broker_id`) REFERENCES `brokers` (`id`) ON DELETE SET NULL,
  ADD CONSTRAINT `fk_communications_reply_to` FOREIGN KEY (`reply_to_id`) REFERENCES `communications` (`id`) ON DELETE SET NULL,
  ADD CONSTRAINT `fk_communications_tenant` FOREIGN KEY (`tenant_id`) REFERENCES `tenants` (`id`) ON DELETE CASCADE;

--
-- Constraints for table `compliance_checklists`
--
ALTER TABLE `compliance_checklists`
  ADD CONSTRAINT `compliance_checklists_ibfk_1` FOREIGN KEY (`application_id`) REFERENCES `loan_applications` (`id`) ON DELETE CASCADE,
  ADD CONSTRAINT `compliance_checklists_ibfk_2` FOREIGN KEY (`completed_by_broker_id`) REFERENCES `brokers` (`id`) ON DELETE SET NULL,
  ADD CONSTRAINT `fk_compliance_checklists_tenant` FOREIGN KEY (`tenant_id`) REFERENCES `tenants` (`id`) ON DELETE CASCADE;

--
-- Constraints for table `compliance_checklist_items`
--
ALTER TABLE `compliance_checklist_items`
  ADD CONSTRAINT `compliance_checklist_items_ibfk_1` FOREIGN KEY (`checklist_id`) REFERENCES `compliance_checklists` (`id`) ON DELETE CASCADE,
  ADD CONSTRAINT `compliance_checklist_items_ibfk_2` FOREIGN KEY (`completed_by_broker_id`) REFERENCES `brokers` (`id`) ON DELETE SET NULL;

--
-- Constraints for table `conversation_threads`
--
ALTER TABLE `conversation_threads`
  ADD CONSTRAINT `fk_conversation_threads_application` FOREIGN KEY (`application_id`) REFERENCES `loan_applications` (`id`) ON DELETE SET NULL,
  ADD CONSTRAINT `fk_conversation_threads_broker` FOREIGN KEY (`broker_id`) REFERENCES `brokers` (`id`) ON DELETE CASCADE,
  ADD CONSTRAINT `fk_conversation_threads_client` FOREIGN KEY (`client_id`) REFERENCES `clients` (`id`) ON DELETE SET NULL,
  ADD CONSTRAINT `fk_conversation_threads_lead` FOREIGN KEY (`lead_id`) REFERENCES `leads` (`id`) ON DELETE SET NULL,
  ADD CONSTRAINT `fk_conversation_threads_tenant` FOREIGN KEY (`tenant_id`) REFERENCES `tenants` (`id`) ON DELETE CASCADE;

--
-- Constraints for table `documents`
--
ALTER TABLE `documents`
  ADD CONSTRAINT `documents_ibfk_1` FOREIGN KEY (`application_id`) REFERENCES `loan_applications` (`id`) ON DELETE CASCADE,
  ADD CONSTRAINT `documents_ibfk_2` FOREIGN KEY (`uploaded_by_user_id`) REFERENCES `clients` (`id`) ON DELETE CASCADE,
  ADD CONSTRAINT `documents_ibfk_3` FOREIGN KEY (`uploaded_by_broker_id`) REFERENCES `brokers` (`id`) ON DELETE CASCADE,
  ADD CONSTRAINT `documents_ibfk_4` FOREIGN KEY (`reviewed_by_broker_id`) REFERENCES `brokers` (`id`) ON DELETE SET NULL,
  ADD CONSTRAINT `fk_documents_tenant` FOREIGN KEY (`tenant_id`) REFERENCES `tenants` (`id`) ON DELETE CASCADE;

--
-- Constraints for table `leads`
--
ALTER TABLE `leads`
  ADD CONSTRAINT `fk_leads_tenant` FOREIGN KEY (`tenant_id`) REFERENCES `tenants` (`id`) ON DELETE CASCADE,
  ADD CONSTRAINT `leads_ibfk_1` FOREIGN KEY (`assigned_broker_id`) REFERENCES `brokers` (`id`) ON DELETE SET NULL;

--
-- Constraints for table `lead_activities`
--
ALTER TABLE `lead_activities`
  ADD CONSTRAINT `lead_activities_ibfk_1` FOREIGN KEY (`lead_id`) REFERENCES `leads` (`id`) ON DELETE CASCADE,
  ADD CONSTRAINT `lead_activities_ibfk_2` FOREIGN KEY (`performed_by_broker_id`) REFERENCES `brokers` (`id`) ON DELETE SET NULL;

--
-- Constraints for table `loan_applications`
--
ALTER TABLE `loan_applications`
  ADD CONSTRAINT `fk_loan_applications_tenant` FOREIGN KEY (`tenant_id`) REFERENCES `tenants` (`id`) ON DELETE CASCADE,
  ADD CONSTRAINT `loan_applications_ibfk_1` FOREIGN KEY (`client_user_id`) REFERENCES `clients` (`id`) ON DELETE CASCADE,
  ADD CONSTRAINT `loan_applications_ibfk_2` FOREIGN KEY (`broker_user_id`) REFERENCES `brokers` (`id`) ON DELETE SET NULL,
  ADD CONSTRAINT `loan_applications_partner_ibfk` FOREIGN KEY (`partner_broker_id`) REFERENCES `brokers` (`id`) ON DELETE SET NULL;

--
-- Constraints for table `notifications`
--
ALTER TABLE `notifications`
  ADD CONSTRAINT `fk_notifications_tenant` FOREIGN KEY (`tenant_id`) REFERENCES `tenants` (`id`) ON DELETE CASCADE,
  ADD CONSTRAINT `notifications_ibfk_1` FOREIGN KEY (`user_id`) REFERENCES `clients` (`id`) ON DELETE CASCADE;

--
-- Constraints for table `pipeline_step_templates`
--
ALTER TABLE `pipeline_step_templates`
  ADD CONSTRAINT `fk_pst_template` FOREIGN KEY (`template_id`) REFERENCES `templates` (`id`) ON DELETE CASCADE;

--
-- Constraints for table `reminder_flow_connections`
--
ALTER TABLE `reminder_flow_connections`
  ADD CONSTRAINT `fk_flow_connections_flow` FOREIGN KEY (`flow_id`) REFERENCES `reminder_flows` (`id`) ON DELETE CASCADE;

--
-- Constraints for table `reminder_flow_executions`
--
ALTER TABLE `reminder_flow_executions`
  ADD CONSTRAINT `fk_executions_flow` FOREIGN KEY (`flow_id`) REFERENCES `reminder_flows` (`id`) ON DELETE CASCADE;

--
-- Constraints for table `reminder_flow_steps`
--
ALTER TABLE `reminder_flow_steps`
  ADD CONSTRAINT `fk_flow_steps_flow` FOREIGN KEY (`flow_id`) REFERENCES `reminder_flows` (`id`) ON DELETE CASCADE;

--
-- Constraints for table `system_settings`
--
ALTER TABLE `system_settings`
  ADD CONSTRAINT `fk_system_settings_tenant` FOREIGN KEY (`tenant_id`) REFERENCES `tenants` (`id`) ON DELETE CASCADE;

--
-- Constraints for table `tasks`
--
ALTER TABLE `tasks`
  ADD CONSTRAINT `fk_task_template` FOREIGN KEY (`template_id`) REFERENCES `task_templates` (`id`) ON DELETE SET NULL,
  ADD CONSTRAINT `fk_tasks_approved_by` FOREIGN KEY (`approved_by_broker_id`) REFERENCES `brokers` (`id`) ON DELETE SET NULL,
  ADD CONSTRAINT `fk_tasks_reopened_by` FOREIGN KEY (`reopened_by_broker_id`) REFERENCES `brokers` (`id`) ON DELETE SET NULL,
  ADD CONSTRAINT `fk_tasks_status_changed_by_broker` FOREIGN KEY (`status_changed_by_broker_id`) REFERENCES `brokers` (`id`) ON DELETE SET NULL,
  ADD CONSTRAINT `fk_tasks_tenant` FOREIGN KEY (`tenant_id`) REFERENCES `tenants` (`id`) ON DELETE CASCADE,
  ADD CONSTRAINT `tasks_ibfk_1` FOREIGN KEY (`application_id`) REFERENCES `loan_applications` (`id`) ON DELETE CASCADE,
  ADD CONSTRAINT `tasks_ibfk_3` FOREIGN KEY (`assigned_to_user_id`) REFERENCES `clients` (`id`) ON DELETE SET NULL,
  ADD CONSTRAINT `tasks_ibfk_4` FOREIGN KEY (`assigned_to_broker_id`) REFERENCES `brokers` (`id`) ON DELETE SET NULL,
  ADD CONSTRAINT `tasks_ibfk_5` FOREIGN KEY (`created_by_broker_id`) REFERENCES `brokers` (`id`) ON DELETE SET NULL;

--
-- Constraints for table `task_documents`
--
ALTER TABLE `task_documents`
  ADD CONSTRAINT `fk_task_documents_field` FOREIGN KEY (`field_id`) REFERENCES `task_form_fields` (`id`) ON DELETE SET NULL,
  ADD CONSTRAINT `fk_task_documents_task` FOREIGN KEY (`task_id`) REFERENCES `tasks` (`id`) ON DELETE CASCADE;

--
-- Constraints for table `task_form_fields`
--
ALTER TABLE `task_form_fields`
  ADD CONSTRAINT `fk_task_form_fields_template` FOREIGN KEY (`task_template_id`) REFERENCES `task_templates` (`id`) ON DELETE CASCADE;

--
-- Constraints for table `task_form_responses`
--
ALTER TABLE `task_form_responses`
  ADD CONSTRAINT `fk_task_form_responses_field` FOREIGN KEY (`field_id`) REFERENCES `task_form_fields` (`id`) ON DELETE CASCADE,
  ADD CONSTRAINT `fk_task_form_responses_task` FOREIGN KEY (`task_id`) REFERENCES `tasks` (`id`) ON DELETE CASCADE;

--
-- Constraints for table `task_templates`
--
ALTER TABLE `task_templates`
  ADD CONSTRAINT `fk_task_template_broker` FOREIGN KEY (`created_by_broker_id`) REFERENCES `brokers` (`id`) ON DELETE CASCADE,
  ADD CONSTRAINT `fk_task_templates_tenant` FOREIGN KEY (`tenant_id`) REFERENCES `tenants` (`id`) ON DELETE CASCADE ON UPDATE CASCADE;

--
-- Constraints for table `templates`
--
ALTER TABLE `templates`
  ADD CONSTRAINT `fk_templates_broker` FOREIGN KEY (`created_by_broker_id`) REFERENCES `brokers` (`id`) ON DELETE CASCADE,
  ADD CONSTRAINT `fk_templates_tenant` FOREIGN KEY (`tenant_id`) REFERENCES `tenants` (`id`) ON DELETE CASCADE;

--
-- Constraints for table `user_profiles`
--
ALTER TABLE `user_profiles`
  ADD CONSTRAINT `user_profiles_ibfk_1` FOREIGN KEY (`user_id`) REFERENCES `clients` (`id`) ON DELETE CASCADE;

--
-- Constraints for table `user_sessions`
--
ALTER TABLE `user_sessions`
  ADD CONSTRAINT `user_sessions_ibfk_1` FOREIGN KEY (`user_id`) REFERENCES `clients` (`id`) ON DELETE CASCADE;
COMMIT;

/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
