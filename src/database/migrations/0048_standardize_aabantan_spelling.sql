-- Migration 0048: Standardize Hindi spelling from 'आवंटन' / 'आवंटित' to 'आबंटन' / 'आबंटित'
SET NAMES utf8mb4;

UPDATE categories
SET description_hi = REPLACE(REPLACE(description_hi, 'आवंटन', 'आबंटन'), 'आवंटित', 'आबंटित')
WHERE description_hi LIKE '%आवंट%';

UPDATE notices
SET text_hi = REPLACE(REPLACE(text_hi, 'आवंटन', 'आबंटन'), 'आवंटित', 'आबंटित')
WHERE text_hi LIKE '%आवंट%';
