<?php
/**
 * The base configurations of the WordPress.
 *
 * This file has the following configurations: MySQL settings, Table Prefix,
 * Secret Keys, and ABSPATH. You can find more information by visiting
 * {@link https://codex.wordpress.org/Editing_wp-config.php Editing wp-config.php}
 * Codex page. You can get the MySQL settings from your web host.
 *
 * This file is used by the wp-config.php creation script during the
 * installation. You don't have to use the web site, you can just copy this file
 * to "wp-config.php" and fill in the values.
 *
 * @package WordPress
 */

// ** MySQL settings - You can get this info from your web host ** //
/** The name of the database for WordPress */
define('DB_NAME', 'littlebigagency');

/** MySQL database username */
define('DB_USER', 'root');

/** MySQL database password */
define('DB_PASSWORD', 'root');

/** MySQL hostname */
define('DB_HOST', 'localhost');

/** Database Charset to use in creating database tables. */
define('DB_CHARSET', 'utf8mb4');

/** The Database Collate type. Don't change this if in doubt. */
define('DB_COLLATE', '');

/**#@+
 * Authentication Unique Keys and Salts.
 *
 * Change these to different unique phrases!
 * You can generate these using the {@link https://api.wordpress.org/secret-key/1.1/salt/ WordPress.org secret-key service}
 * You can change these at any point in time to invalidate all existing cookies. This will force all users to have to log in again.
 *
 * @since 2.6.0
 */
define('AUTH_KEY',         'Mg>?jff-}Lf6Int!12)*y7qbI2fGUisNgC}Htw3t!-IM^1`RCOt<=R%KURz&jqfz');
define('SECURE_AUTH_KEY',  'Z6+8,|R,_w9%<roDGVroB#3dsyCf-<Eqsdb5BEukG^sIjoBH]9rYq9Q:8R|}dGlw');
define('LOGGED_IN_KEY',    'y>y!,jw6]SbR%wupc#V2C~#C|qfOLm&=ul&YD&q`.C^9T:1xe;inZFYwlp7HHm|)');
define('NONCE_KEY',        'jDH:MJ=|pv|/;@.ntw)U.8-NA>4]WOQ XB(Xa=@1~L=V|l(`H0!_ |Q!~Ex^yLX6');
define('AUTH_SALT',        '24}Tu[cok84fvO,BR7F9YbgdSJH3tYmb(a>Mif+wUb+,Q|fDO<Uoq^kLHS+-;eR+');
define('SECURE_AUTH_SALT', 'Z[C|r>:O<35Pgs!F@%a6K}5oa{[zx4}z^^)|9[T=sVT@kc9AP8!x5?T2Cb+FHnF&');
define('LOGGED_IN_SALT',   'u2J|se}K]t;O318/+nDD`T+/T>6Na)r%-s1,2d=<oZb-pYp3N#u4h;s=:aB KzGZ');
define('NONCE_SALT',       'i-@XKj]%/-4wKl=sd{6DD<4df=~bhfg{)(kw*)mQ-4wt+l}|Hx{Oh-S!O+RqQ9.#');

/**#@-*/

/**
 * WordPress Database Table prefix.
 *
 * You can have multiple installations in one database if you give each a unique
 * prefix. Only numbers, letters, and underscores please!
 */
$table_prefix  = 'lba_';

/**
 * For developers: WordPress debugging mode.
 *
 * Change this to true to enable the display of notices during development.
 * It is strongly recommended that plugin and theme developers use WP_DEBUG
 * in their development environments.
 */
define('WP_DEBUG', false);

/* That's all, stop editing! Happy blogging. */

/** Absolute path to the WordPress directory. */
if ( !defined('ABSPATH') )
	define('ABSPATH', dirname(__FILE__) . '/');

/** Sets up WordPress vars and included files. */
require_once(ABSPATH . 'wp-settings.php');
