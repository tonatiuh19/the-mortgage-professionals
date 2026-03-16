-- phpMyAdmin SQL Dump
-- version 5.2.1
-- https://www.phpmyadmin.net/
--
-- Host: localhost:3306
-- Generation Time: Feb 19, 2026 at 06:40 PM
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
-- Database: `alanchat_encore_m`
--

-- --------------------------------------------------------

--
-- Table structure for table `application_status_history`
--

CREATE TABLE `application_status_history` (
  `id` int(11) NOT NULL,
  `tenant_id` int(11) NOT NULL DEFAULT '1',
  `application_id` int(11) NOT NULL,
  `from_status` varchar(50) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `to_status` varchar(50) COLLATE utf8mb4_unicode_ci NOT NULL,
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
(1, 1, NULL, 1, 'broker', 'view_audit_logs', NULL, NULL, NULL, 'success', NULL, NULL, NULL, '::1', 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/142.0.0.0 Safari/537.36', '2026-01-21 20:51:03'),
(2, 1, NULL, 1, 'broker', 'view_audit_logs', NULL, NULL, NULL, 'success', NULL, NULL, NULL, '::1', 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/142.0.0.0 Safari/537.36', '2026-01-21 20:58:08'),
(3, 1, NULL, 1, 'broker', 'view_audit_logs', NULL, NULL, NULL, 'success', NULL, NULL, NULL, '::1', 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/142.0.0.0 Safari/537.36', '2026-01-21 21:02:06'),
(4, 1, NULL, 1, 'broker', 'view_audit_logs', NULL, NULL, NULL, 'success', NULL, NULL, NULL, '::1', 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/142.0.0.0 Safari/537.36', '2026-01-21 21:02:42'),
(5, 1, NULL, 1, 'broker', 'view_audit_logs', NULL, NULL, NULL, 'success', NULL, NULL, NULL, '::1', 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/142.0.0.0 Safari/537.36', '2026-01-21 21:05:12'),
(6, 1, NULL, 1, 'broker', 'view_audit_logs', NULL, NULL, NULL, 'success', NULL, NULL, NULL, '::1', 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/142.0.0.0 Safari/537.36', '2026-01-21 21:05:20'),
(7, 1, NULL, 1, 'broker', 'view_audit_logs', NULL, NULL, NULL, 'success', NULL, NULL, NULL, '::1', 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/142.0.0.0 Safari/537.36', '2026-01-21 21:06:07'),
(8, 1, NULL, 1, 'broker', 'view_audit_logs', NULL, NULL, NULL, 'success', NULL, NULL, NULL, '::1', 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/142.0.0.0 Safari/537.36', '2026-01-21 21:06:55'),
(9, 1, NULL, 1, 'broker', 'view_audit_logs', NULL, NULL, NULL, 'success', NULL, NULL, NULL, '::1', 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/142.0.0.0 Safari/537.36', '2026-01-21 21:17:11'),
(10, 1, NULL, 1, 'broker', 'view_audit_logs', NULL, NULL, NULL, 'success', NULL, NULL, NULL, '::1', 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/142.0.0.0 Safari/537.36', '2026-01-21 21:47:34'),
(11, 1, NULL, 1, 'broker', 'view_audit_logs', NULL, NULL, NULL, 'success', NULL, NULL, NULL, '::1', 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/142.0.0.0 Safari/537.36', '2026-01-21 21:47:57'),
(12, 1, NULL, 1, 'broker', 'view_audit_logs', NULL, NULL, NULL, 'success', NULL, NULL, NULL, '::1', 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/142.0.0.0 Safari/537.36', '2026-01-21 21:48:09'),
(13, 1, NULL, 1, 'broker', 'view_audit_logs', NULL, NULL, NULL, 'success', NULL, NULL, NULL, '::1', 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/142.0.0.0 Safari/537.36', '2026-01-21 21:48:29'),
(14, 1, NULL, 1, 'broker', 'approve_task', 'task', 17, '{\"status\": \"approved\", \"approved_at\": \"2026-01-28T05:12:41.478Z\"}', 'success', NULL, NULL, NULL, NULL, NULL, '2026-01-27 23:12:41'),
(15, 1, NULL, 1, 'broker', 'approve_task', 'task', 18, '{\"status\": \"approved\", \"approved_at\": \"2026-01-28T20:59:44.042Z\"}', 'success', NULL, NULL, NULL, NULL, NULL, '2026-01-28 14:59:44'),
(16, 1, NULL, 1, 'broker', 'generate_mismo', 'loan_application', 10, '{\"filename\": \"MISMO_LA33836272_2026-01-28.xml\", \"generated_at\": \"2026-01-28T20:59:48.158Z\"}', 'success', NULL, NULL, NULL, NULL, NULL, '2026-01-28 14:59:48'),
(17, 1, NULL, 1, 'broker', 'approve_task', 'task', 19, '{\"status\": \"approved\", \"approved_at\": \"2026-01-28T21:07:46.718Z\"}', 'success', NULL, NULL, NULL, NULL, NULL, '2026-01-28 15:07:46'),
(18, 1, NULL, 1, 'broker', 'generate_mismo', 'loan_application', 11, '{\"filename\": \"MISMO_LA34345831_2026-01-28.xml\", \"generated_at\": \"2026-01-28T21:07:57.184Z\"}', 'success', NULL, NULL, NULL, NULL, NULL, '2026-01-28 15:07:57'),
(19, 1, NULL, 4, 'broker', 'view_audit_logs', NULL, NULL, NULL, 'success', NULL, NULL, NULL, '127.0.0.1', 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/143.0.0.0 Safari/537.36', '2026-01-28 23:55:48'),
(20, 1, NULL, 4, 'broker', 'generate_mismo', 'loan_application', 11, '{\"filename\": \"MISMO_LA34345831_2026-01-29.xml\", \"generated_at\": \"2026-01-29T06:01:01.966Z\"}', 'success', NULL, NULL, NULL, NULL, NULL, '2026-01-29 00:01:01'),
(21, 1, NULL, 4, 'broker', 'view_audit_logs', NULL, NULL, NULL, 'success', NULL, NULL, NULL, '127.0.0.1', 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/143.0.0.0 Safari/537.36', '2026-01-29 00:03:05'),
(22, 1, NULL, 4, 'broker', 'view_audit_logs', NULL, NULL, NULL, 'success', NULL, NULL, NULL, '127.0.0.1', 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/143.0.0.0 Safari/537.36', '2026-01-29 00:03:38'),
(23, 1, NULL, 1, 'broker', 'view_audit_logs', NULL, NULL, NULL, 'success', NULL, NULL, NULL, '127.0.0.1', 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/144.0.0.0 Safari/537.36', '2026-01-31 00:30:18'),
(24, NULL, NULL, 1, 'broker', 'view_audit_logs', NULL, NULL, NULL, 'success', NULL, NULL, NULL, '::1', 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/144.0.0.0 Safari/537.36', '2026-02-02 15:57:02'),
(25, NULL, NULL, 1, 'broker', 'view_audit_logs', NULL, NULL, NULL, 'success', NULL, NULL, NULL, '::1', 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/144.0.0.0 Safari/537.36', '2026-02-02 15:57:28'),
(26, NULL, NULL, 1, 'broker', 'view_audit_logs', NULL, NULL, NULL, 'success', NULL, NULL, NULL, '::1', 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/144.0.0.0 Safari/537.36', '2026-02-02 15:58:03'),
(27, NULL, NULL, 1, 'broker', 'view_audit_logs', NULL, NULL, NULL, 'success', NULL, NULL, NULL, '::1', 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/144.0.0.0 Safari/537.36', '2026-02-02 15:59:00'),
(28, 2, NULL, 7, 'broker', 'view_audit_logs', NULL, NULL, NULL, 'success', NULL, NULL, NULL, '127.0.0.1', 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/143.0.0.0 Safari/537.36', '2026-02-03 17:36:50'),
(29, 2, NULL, 7, 'broker', 'view_audit_logs', NULL, NULL, NULL, 'success', NULL, NULL, NULL, '127.0.0.1', 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/143.0.0.0 Safari/537.36', '2026-02-03 17:36:59'),
(30, 2, NULL, 7, 'broker', 'view_audit_logs', NULL, NULL, NULL, 'success', NULL, NULL, NULL, '127.0.0.1', 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/144.0.0.0 Safari/537.36', '2026-02-05 18:37:39'),
(31, 2, NULL, 6, 'broker', 'update_task_form_field', 'task_form_field', 28, '{\"field_name\": {\"to\": \"ine_frontt\", \"from\": \"document_front\"}, \"field_type\": {\"to\": \"file_pdf\", \"from\": \"file_pdf\"}, \"field_label\": {\"to\": \"INE FRONTT\", \"from\": \"Document - Front\"}, \"task_template_id\": \"29\"}', 'success', NULL, NULL, NULL, NULL, NULL, '2026-02-11 20:55:11'),
(32, 2, NULL, 6, 'broker', 'update_task_form_field', 'task_form_field', 29, '{\"field_name\": {\"to\": \"ine_back\", \"from\": \"document_back\"}, \"field_type\": {\"to\": \"file_pdf\", \"from\": \"file_pdf\"}, \"field_label\": {\"to\": \"INE BACK\", \"from\": \"Document - Back\"}, \"task_template_id\": \"29\"}', 'success', NULL, NULL, NULL, NULL, NULL, '2026-02-11 20:55:11'),
(33, 2, NULL, 6, 'broker', 'update_task_form_field', 'task_form_field', 28, '{\"field_name\": {\"to\": \"ine_front\", \"from\": \"ine_frontt\"}, \"field_type\": {\"to\": \"file_pdf\", \"from\": \"file_pdf\"}, \"field_label\": {\"to\": \"INE Front\", \"from\": \"INE FRONTT\"}, \"task_template_id\": \"29\"}', 'success', NULL, NULL, NULL, NULL, NULL, '2026-02-11 20:56:14'),
(34, 2, NULL, 6, 'broker', 'update_task_form_field', 'task_form_field', 29, '{\"field_name\": {\"to\": \"ine_back\", \"from\": \"ine_back\"}, \"field_type\": {\"to\": \"file_pdf\", \"from\": \"file_pdf\"}, \"field_label\": {\"to\": \"INE Back\", \"from\": \"INE BACK\"}, \"task_template_id\": \"29\"}', 'success', NULL, NULL, NULL, NULL, NULL, '2026-02-11 20:56:14'),
(35, 1, NULL, 1, 'broker', 'system_migration', 'conversation_system', NULL, '{\"date\": \"2026-02-11\", \"version\": \"1.0\", \"migration\": \"conversation_system_setup\"}', 'success', NULL, NULL, NULL, NULL, NULL, '2026-02-11 23:04:12'),
(36, 2, NULL, 7, 'broker', 'system_migration', 'conversation_system', NULL, '{\"date\": \"2026-02-11\", \"version\": \"1.0\", \"migration\": \"conversation_system_setup\"}', 'success', NULL, NULL, NULL, NULL, NULL, '2026-02-11 23:04:12'),
(37, 1, NULL, NULL, 'user', 'delete_corrupted_templates', 'template', NULL, '{\"action\": \"Deleted all templates to fix JSON corruption\"}', 'success', 'Deleted all template data due to JSON corruption, will recreate with proper format', NULL, NULL, NULL, NULL, '2026-02-12 18:18:21'),
(38, NULL, NULL, NULL, 'user', 'recreate_templates_clean', 'template', NULL, '{\"count\": \"12\", \"action\": \"Recreated all templates with proper JSON format\"}', 'success', 'Successfully recreated all template data with proper JSON arrays', NULL, NULL, NULL, NULL, '2026-02-12 18:18:21'),
(39, 2, NULL, NULL, 'user', 'fix_corrupted_json', 'template', 10, '{\"new\": \"[\\\"client_name\\\", \\\"application_id\\\", \\\"broker_name\\\"]\", \"old\": \"client_name,application_id,broker_name\"}', 'success', 'Fixed corrupted JSON for template 10', NULL, NULL, NULL, NULL, '2026-02-12 18:21:04'),
(40, 2, NULL, NULL, 'user', 'fix_corrupted_json', 'template', 11, '{\"new\": \"[\\\"client_name\\\", \\\"broker_name\\\", \\\"document_count\\\"]\", \"old\": \"client_name,broker_name,document_count\"}', 'success', 'Fixed corrupted JSON for template 11', NULL, NULL, NULL, NULL, '2026-02-12 18:21:04'),
(41, 2, NULL, NULL, 'user', 'fix_corrupted_json', 'template', 12, '{\"new\": \"[\\\"client_name\\\", \\\"status\\\", \\\"additional_notes\\\", \\\"next_steps\\\", \\\"broker_name\\\"]\", \"old\": \"client_name,status,additional_notes,next_steps,broker_name\"}', 'success', 'Fixed corrupted JSON for template 12', NULL, NULL, NULL, NULL, '2026-02-12 18:21:04'),
(42, 2, NULL, 7, 'broker', 'view_audit_logs', NULL, NULL, NULL, 'success', NULL, NULL, NULL, '127.0.0.1', 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/144.0.0.0 Safari/537.36', '2026-02-13 00:04:49'),
(43, 2, NULL, 7, 'broker', 'view_audit_logs', NULL, NULL, NULL, 'success', NULL, NULL, NULL, '127.0.0.1', 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/144.0.0.0 Safari/537.36', '2026-02-13 13:13:18'),
(44, 1, NULL, 4, 'broker', 'view_audit_logs', NULL, NULL, NULL, 'success', NULL, NULL, NULL, '127.0.0.1', 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/144.0.0.0 Safari/537.36', '2026-02-13 23:51:37'),
(45, 1, NULL, 4, 'broker', 'view_audit_logs', NULL, NULL, NULL, 'success', NULL, NULL, NULL, '127.0.0.1', 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/144.0.0.0 Safari/537.36', '2026-02-13 23:54:45'),
(46, 1, NULL, 4, 'broker', 'view_audit_logs', NULL, NULL, NULL, 'success', NULL, NULL, NULL, '127.0.0.1', 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/144.0.0.0 Safari/537.36', '2026-02-19 10:59:23'),
(47, 1, NULL, 4, 'broker', 'view_audit_logs', NULL, NULL, NULL, 'success', NULL, NULL, NULL, '127.0.0.1', 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/144.0.0.0 Safari/537.36', '2026-02-19 10:59:50');

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
  `created_at` datetime DEFAULT CURRENT_TIMESTAMP,
  `updated_at` datetime DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Dumping data for table `brokers`
--

INSERT INTO `brokers` (`id`, `tenant_id`, `email`, `first_name`, `last_name`, `phone`, `role`, `status`, `email_verified`, `last_login`, `license_number`, `specializations`, `created_at`, `updated_at`) VALUES
(1, 1, 'axgoomez@gmail.com', 'Alex', 'Gomez', NULL, 'admin', 'active', 1, '2026-02-04 15:07:13', NULL, NULL, '2026-01-20 18:56:12', '2026-02-04 15:07:13'),
(2, 1, 'tonatiuh.gom@gmail.com', 'Tonatiuh', 'Gomez', '4741400363', 'admin', 'active', 0, '2026-01-21 00:14:12', '123457890', '[\"First-Time Home Buyers\"]', '2026-01-20 23:10:11', '2026-01-21 00:14:12'),
(3, 1, 'teamdc@encoremortgage.org', 'Encore', 'Admin', NULL, 'admin', 'active', 0, '2026-01-21 11:06:11', NULL, NULL, '2026-01-21 00:08:17', '2026-01-21 11:06:11'),
(4, 1, 'hebert@trueduplora.com', 'Hebert', 'Montecinos', NULL, 'admin', 'active', 0, '2026-02-19 10:59:14', NULL, '[\"Investment Properties\", \"Refinancing\"]', '2026-01-21 00:08:54', '2026-02-19 10:59:14'),
(6, 2, 'axgoomez@gmail.com', 'Alex', 'Gomez', NULL, 'admin', 'active', 1, '2026-02-12 18:14:25', NULL, NULL, '2026-01-20 18:56:12', '2026-02-12 18:14:25'),
(7, 2, 'hebert@trueduplora.com', 'Hebert', 'Montecinos', NULL, 'admin', 'active', 0, '2026-02-13 00:04:37', NULL, NULL, '2026-02-03 14:59:53', '2026-02-13 00:04:37');

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
  `avatar_url` varchar(500) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `years_experience` int(11) DEFAULT NULL,
  `total_loans_closed` int(11) DEFAULT '0',
  `created_at` datetime DEFAULT CURRENT_TIMESTAMP,
  `updated_at` datetime DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

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
(9, 3, 761666, 1, NULL, NULL, '2026-01-21 23:20:38', '2026-01-21 17:05:37'),
(44, 2, 510149, 1, NULL, NULL, '2026-02-03 06:39:20', '2026-02-03 08:24:20'),
(59, 1, 547747, 1, NULL, NULL, '2026-02-04 21:21:59', '2026-02-04 21:06:59'),
(63, 6, 303837, 1, NULL, NULL, '2026-02-13 00:29:10', '2026-02-13 00:14:10'),
(66, 4, 607001, 1, NULL, NULL, '2026-02-19 17:13:49', '2026-02-19 16:58:49');

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

INSERT INTO `clients` (`id`, `tenant_id`, `email`, `password_hash`, `first_name`, `last_name`, `phone`, `alternate_phone`, `date_of_birth`, `ssn_encrypted`, `address_street`, `address_city`, `address_state`, `address_zip`, `employment_status`, `income_type`, `annual_income`, `credit_score`, `status`, `email_verified`, `phone_verified`, `last_login`, `assigned_broker_id`, `source`, `referral_code`, `created_at`, `updated_at`) VALUES
(10, 1, 'tonatiuh.gom@gmail.com', '', 'Tonatiuh', 'Gomez', '(555) 123-4567', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 'W-2', NULL, NULL, 'active', 0, 0, '2026-02-03 13:07:47', 1, 'broker_created', NULL, '2026-01-28 15:05:45', '2026-02-03 13:07:47'),
(14, 2, 'tonatiuh.gom@gmail.com', '', 'Tonatiuh', 'Gomez', '(555) 123-4567', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 'W-2', NULL, NULL, 'active', 0, 0, NULL, 6, 'broker_created', NULL, '2026-02-11 21:03:41', '2026-02-11 21:03:41');

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
-- Table structure for table `leads`
--

CREATE TABLE `leads` (
  `id` int(11) NOT NULL,
  `tenant_id` int(11) NOT NULL DEFAULT '1',
  `source` enum('website','referral','social_media','cold_call','event','other') COLLATE utf8mb4_unicode_ci NOT NULL,
  `source_details` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
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
  `loan_type` enum('purchase','refinance','home_equity','commercial','construction','other') COLLATE utf8mb4_unicode_ci NOT NULL,
  `loan_amount` decimal(12,2) NOT NULL,
  `property_value` decimal(12,2) DEFAULT NULL,
  `property_address` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `property_city` varchar(100) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `property_state` varchar(50) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `property_zip` varchar(10) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `property_type` enum('single_family','condo','multi_family','commercial','land','other') COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `down_payment` decimal(12,2) DEFAULT NULL,
  `loan_purpose` text COLLATE utf8mb4_unicode_ci,
  `status` enum('draft','submitted','under_review','documents_pending','underwriting','conditional_approval','approved','denied','closed','cancelled') COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'draft',
  `current_step` int(11) DEFAULT '1',
  `total_steps` int(11) DEFAULT '8',
  `priority` enum('low','medium','high','urgent') COLLATE utf8mb4_unicode_ci DEFAULT 'medium',
  `estimated_close_date` date DEFAULT NULL,
  `actual_close_date` date DEFAULT NULL,
  `interest_rate` decimal(5,3) DEFAULT NULL,
  `loan_term_months` int(11) DEFAULT NULL,
  `notes` text COLLATE utf8mb4_unicode_ci,
  `created_at` datetime DEFAULT CURRENT_TIMESTAMP,
  `updated_at` datetime DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `submitted_at` datetime DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Dumping data for table `loan_applications`
--

INSERT INTO `loan_applications` (`id`, `tenant_id`, `application_number`, `client_user_id`, `broker_user_id`, `loan_type`, `loan_amount`, `property_value`, `property_address`, `property_city`, `property_state`, `property_zip`, `property_type`, `down_payment`, `loan_purpose`, `status`, `current_step`, `total_steps`, `priority`, `estimated_close_date`, `actual_close_date`, `interest_rate`, `loan_term_months`, `notes`, `created_at`, `updated_at`, `submitted_at`) VALUES
(11, 1, 'LA34345831', 10, 1, 'purchase', 350000.00, 450000.00, '123 Main Street', 'San Francisco', 'CA', '94102', 'single_family', 100000.00, 'Primary residence purchase', 'submitted', 1, 8, 'medium', '2026-03-15', NULL, NULL, NULL, 'Test loan application for development', '2026-01-28 15:05:46', '2026-01-28 15:05:46', '2026-01-28 15:05:46'),
(15, 2, 'LA65421662', 14, 6, 'purchase', 350000.00, 450000.00, '123 Main Street', 'San Francisco', 'CA', '94102', 'single_family', 100000.00, 'Primary residence purchase', 'submitted', 1, 8, 'medium', '2026-03-15', NULL, NULL, NULL, 'Test loan application for development', '2026-02-11 21:03:41', '2026-02-11 21:03:41', '2026-02-11 21:03:41');

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
(13, 1, 10, 'New Loan Application Created', 'Your loan application LA34345831 has been created. Please complete the assigned tasks.', 'info', 0, '/portal', '2026-01-28 15:05:46', NULL),
(14, 1, 10, 'Task Approved', 'Your task \"INE Verification\" has been approved. Great job!', 'success', 0, '/portal', '2026-01-28 15:07:46', NULL),
(18, 2, 14, 'New Loan Application Created', 'Your loan application LA65421662 has been created. Please complete the assigned tasks.', 'info', 0, '/portal', '2026-02-11 21:03:42', NULL);

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
(1, 1, 'company_name', 'Loan Broker Pro', 'string', 'Company name', '2026-02-02 14:24:22'),
(2, 1, 'support_email', 'support@example.com', 'string', 'Support email address', '2026-02-02 14:24:22'),
(3, 1, 'max_file_upload_mb', '10', 'number', 'Maximum file upload size in MB', '2026-02-02 14:24:22'),
(4, 1, 'enable_sms', 'true', 'boolean', 'Enable SMS notifications', '2026-02-02 14:24:22'),
(5, 1, 'enable_email', 'true', 'boolean', 'Enable email notifications', '2026-02-02 14:24:22');

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
(19, 1, 22, 0, 11, 'INE Verification', 'Need the INE', 'document_verification', 'approved', 'medium', 10, NULL, 1, '2026-02-07 15:05:46', '2026-01-28 15:07:15', '2026-01-28 15:05:46', '2026-01-28 15:07:46', 1, '2026-01-28 15:07:14', 1, 0, 'approved', 1, '2026-01-28 15:07:46', NULL, NULL, NULL, NULL, NULL, NULL),
(23, 2, 29, 0, 15, 'INE Document Verification', '', 'document_verification', 'pending', 'medium', 14, NULL, 6, '2026-02-14 21:03:42', NULL, '2026-02-11 21:03:41', '2026-02-11 21:03:41', 0, NULL, 0, 0, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL);

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

--
-- Dumping data for table `task_documents`
--

INSERT INTO `task_documents` (`id`, `task_id`, `field_id`, `document_type`, `filename`, `original_filename`, `file_path`, `file_size`, `uploaded_by_user_id`, `uploaded_by_broker_id`, `uploaded_at`, `notes`) VALUES
(7, 19, NULL, 'pdf', 'adquiramexico_com_mx_multipagos_portal_payment_voucher_tr_YXgeVjQzpFmulnzaMCJhdBUeEEAmulava_dp_ZmFsc2U_3D_697a7a8217f64.pdf', 'adquiramexico.com.mx_multipagos_portal_payment_voucher_tr=YXgeVjQzpFmulnzaMCJhdBUeEEAmulava&dp=ZmFsc2U%3D.pdf', '/data/encore/19/pdfs/adquiramexico_com_mx_multipagos_portal_payment_voucher_tr_YXgeVjQzpFmulnzaMCJhdBUeEEAmulava_dp_ZmFsc2U_3D_697a7a8217f64.pdf', 93081, NULL, NULL, '2026-01-28 15:07:14', NULL),
(8, 19, NULL, 'pdf', 'adquiramexico_com_mx_multipagos_portal_payment_voucher_tr_YXgeVjQzpFmulnzaMCJhdBUeEEAmulava_dp_ZmFsc2U_3D_697a7a821838c.pdf', 'adquiramexico.com.mx_multipagos_portal_payment_voucher_tr=YXgeVjQzpFmulnzaMCJhdBUeEEAmulava&dp=ZmFsc2U%3D.pdf', '/data/encore/19/pdfs/adquiramexico_com_mx_multipagos_portal_payment_voucher_tr_YXgeVjQzpFmulnzaMCJhdBUeEEAmulava_dp_ZmFsc2U_3D_697a7a821838c.pdf', 93081, NULL, NULL, '2026-01-28 15:07:14', NULL);

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
(7, 22, 'front', 'Front', 'file_pdf', NULL, 1, NULL, NULL, 0, NULL, '2026-01-23 22:40:43'),
(8, 22, 'back', 'Back', 'file_pdf', NULL, 1, NULL, NULL, 1, NULL, '2026-01-23 22:40:43'),
(9, 22, 'enter_license_number', 'Enter License Number', 'text', NULL, 1, 'Enter License Number', NULL, 2, NULL, '2026-01-23 22:40:43'),
(28, 29, 'ine_front', 'INE Front', 'file_pdf', NULL, 1, NULL, NULL, 0, NULL, '2026-02-11 20:55:10'),
(29, 29, 'ine_back', 'INE Back', 'file_pdf', NULL, 1, NULL, NULL, 1, NULL, '2026-02-11 20:55:10');

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

--
-- Dumping data for table `task_form_responses`
--

INSERT INTO `task_form_responses` (`id`, `task_id`, `field_id`, `field_value`, `submitted_by_user_id`, `submitted_by_broker_id`, `submitted_at`, `updated_at`) VALUES
(5, 19, 9, NULL, NULL, NULL, '2026-01-28 15:07:14', '2026-01-28 15:07:14');

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
  `has_custom_form` tinyint(1) DEFAULT '0' COMMENT 'Whether this task has custom form fields'
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='Reusable task templates for loan workflows';

--
-- Dumping data for table `task_templates`
--

INSERT INTO `task_templates` (`id`, `tenant_id`, `title`, `description`, `task_type`, `priority`, `default_due_days`, `order_index`, `is_active`, `created_by_broker_id`, `created_at`, `updated_at`, `requires_documents`, `document_instructions`, `has_custom_form`) VALUES
(22, 1, 'INE Verification', 'Need the INE', 'document_verification', 'medium', 10, 1, 1, 1, '2026-01-23 22:40:43', '2026-01-23 22:40:43', 1, 'Please upload the INE', 1),
(29, 2, 'INE Document Verification', NULL, 'document_verification', 'medium', NULL, 1, 1, 6, '2026-02-11 20:55:10', '2026-02-11 20:56:13', 1, NULL, 0);

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

--
-- Dumping data for table `templates`
--

INSERT INTO `templates` (`id`, `tenant_id`, `name`, `description`, `template_type`, `category`, `subject`, `body`, `variables`, `is_active`, `usage_count`, `created_by_broker_id`, `created_at`, `updated_at`) VALUES
(1, 1, 'Welcome Email', 'Welcome new clients to the loan process', 'email', 'welcome', 'Welcome to Encore Mortgage - Your Loan Application', 'Dear {{client_name}},\n\nWelcome to Encore Mortgage! We\'re excited to help you with your loan application.\n\nYour application ID is: {{application_id}}\n\nNext steps:\n1. Complete all required documents\n2. Schedule your initial consultation\n3. We\'ll review your application within 24-48 hours\n\nIf you have any questions, please don\'t hesitate to contact us.\n\nBest regards,\n{{broker_name}}\nEncore Mortgage', '[\"client_name\", \"application_id\", \"broker_name\"]', 1, 0, 1, '2026-02-04 15:11:33', '2026-02-04 15:11:33'),
(2, 1, 'Document Reminder SMS', 'Remind clients about pending documents', 'sms', 'reminder', NULL, 'Hi {{client_name}}, this is {{broker_name}} from Encore Mortgage. You have {{document_count}} pending documents for your loan application. Please upload them at your earliest convenience. Reply STOP to opt out.', '[\"client_name\", \"broker_name\", \"document_count\"]', 1, 0, 1, '2026-02-04 15:11:33', '2026-02-04 15:11:33'),
(3, 1, 'Application Update WhatsApp', 'Update clients on application status via WhatsApp', 'whatsapp', 'update', NULL, 'Hi {{client_name}} 👋\n\nGreat news! Your loan application status has been updated to: *{{status}}*\n\n{{additional_notes}}\n\nNext steps: {{next_steps}}\n\nFeel free to reply with any questions!\n\n- {{broker_name}} at Encore Mortgage', '[\"client_name\", \"status\", \"additional_notes\", \"next_steps\", \"broker_name\"]', 1, 0, 1, '2026-02-04 15:11:33', '2026-02-04 15:11:33'),
(4, 1, 'Loan Approved Email', 'Congratulate clients on loan approval', 'email', 'update', 'Congratulations! Your Loan Has Been Approved', 'Dear {{client_name}},\n\nCongratulations! 🎉\n\nWe\'re thrilled to inform you that your loan application #{{application_id}} has been APPROVED!\n\nLoan Details:\n- Loan Amount: ${{loan_amount}}\n- Interest Rate: {{interest_rate}}%\n- Closing Date: {{closing_date}}\n\nNext Steps:\n1. Review the loan documents we\'ll send shortly\n2. Schedule your closing appointment\n3. Prepare for your new home!\n\nThank you for choosing Encore Mortgage. We\'re excited to be part of your homeownership journey!\n\nBest regards,\n{{broker_name}}\nEncore Mortgage', '[\"client_name\", \"application_id\", \"loan_amount\", \"interest_rate\", \"closing_date\", \"broker_name\"]', 1, 0, 1, '2026-02-04 15:11:33', '2026-02-04 15:11:33'),
(5, 1, 'Quick Update SMS', 'Send quick status updates via SMS', 'sms', 'update', NULL, 'Hi {{client_name}}! Quick update on your loan app #{{application_id}}: {{status_message}}. Questions? Call us! - {{broker_name}} at Encore Mortgage', '[\"client_name\", \"application_id\", \"status_message\", \"broker_name\"]', 1, 0, 1, '2026-02-04 15:11:33', '2026-02-04 15:11:33'),
(6, 1, 'Document Upload Reminder WhatsApp', 'Friendly WhatsApp reminder for documents', 'whatsapp', 'reminder', NULL, 'Hi {{client_name}} 👋\n\nFriendly reminder: We\'re still waiting for {{missing_documents}} for your loan application.\n\nYou can upload them easily through your client portal: {{portal_link}}\n\nNeed help? Just reply here and I\'ll assist you right away!\n\n📋 Missing: {{missing_documents}}\n⏰ Needed by: {{due_date}}\n\nThanks!\n{{broker_name}} 🏠', '[\"client_name\", \"missing_documents\", \"portal_link\", \"due_date\", \"broker_name\"]', 1, 0, 1, '2026-02-04 15:11:33', '2026-02-04 15:11:33');

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
  `employment_status` enum('employed','self_employed','unemployed','retired') COLLATE utf8mb4_unicode_ci DEFAULT NULL,
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
-- Indexes for dumped tables
--

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
  ADD KEY `idx_email` (`email`),
  ADD KEY `idx_role` (`role`),
  ADD KEY `idx_status` (`status`),
  ADD KEY `tenant_id` (`tenant_id`);

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
  ADD KEY `tenant_id` (`tenant_id`);

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
  ADD KEY `tenant_id` (`tenant_id`);

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
-- Indexes for table `task_templates`
--
ALTER TABLE `task_templates`
  ADD PRIMARY KEY (`id`),
  ADD KEY `idx_created_by_broker` (`created_by_broker_id`),
  ADD KEY `idx_active_order` (`is_active`,`order_index`),
  ADD KEY `idx_task_templates_requires_documents` (`requires_documents`),
  ADD KEY `idx_task_templates_has_custom_form` (`has_custom_form`),
  ADD KEY `idx_task_templates_tenant` (`tenant_id`);

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
-- AUTO_INCREMENT for table `application_status_history`
--
ALTER TABLE `application_status_history`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `audit_logs`
--
ALTER TABLE `audit_logs`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=48;

--
-- AUTO_INCREMENT for table `brokers`
--
ALTER TABLE `brokers`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=8;

--
-- AUTO_INCREMENT for table `broker_profiles`
--
ALTER TABLE `broker_profiles`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `broker_sessions`
--
ALTER TABLE `broker_sessions`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=67;

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
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=15;

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
-- AUTO_INCREMENT for table `conversation_threads`
--
ALTER TABLE `conversation_threads`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `documents`
--
ALTER TABLE `documents`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT;

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
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=16;

--
-- AUTO_INCREMENT for table `notifications`
--
ALTER TABLE `notifications`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=19;

--
-- AUTO_INCREMENT for table `system_settings`
--
ALTER TABLE `system_settings`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=6;

--
-- AUTO_INCREMENT for table `tasks`
--
ALTER TABLE `tasks`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=24;

--
-- AUTO_INCREMENT for table `task_documents`
--
ALTER TABLE `task_documents`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=9;

--
-- AUTO_INCREMENT for table `task_form_fields`
--
ALTER TABLE `task_form_fields`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=30;

--
-- AUTO_INCREMENT for table `task_form_responses`
--
ALTER TABLE `task_form_responses`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=6;

--
-- AUTO_INCREMENT for table `task_templates`
--
ALTER TABLE `task_templates`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=30;

--
-- AUTO_INCREMENT for table `templates`
--
ALTER TABLE `templates`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=13;

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
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=18;

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
  ADD CONSTRAINT `loan_applications_ibfk_2` FOREIGN KEY (`broker_user_id`) REFERENCES `brokers` (`id`) ON DELETE SET NULL;

--
-- Constraints for table `notifications`
--
ALTER TABLE `notifications`
  ADD CONSTRAINT `fk_notifications_tenant` FOREIGN KEY (`tenant_id`) REFERENCES `tenants` (`id`) ON DELETE CASCADE,
  ADD CONSTRAINT `notifications_ibfk_1` FOREIGN KEY (`user_id`) REFERENCES `clients` (`id`) ON DELETE CASCADE;

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
