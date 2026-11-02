package com.clinicflow.config;

import com.zaxxer.hikari.HikariConfig;
import com.zaxxer.hikari.HikariDataSource;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.boot.autoconfigure.jdbc.DataSourceProperties;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.context.annotation.Primary;
import org.springframework.core.env.Environment;

import javax.sql.DataSource;
import java.net.URI;
import java.sql.Connection;
import java.sql.DriverManager;
import java.sql.Statement;

@Configuration
public class DatabaseConfig {

    private static final Logger log = LoggerFactory.getLogger(DatabaseConfig.class);

    @Bean
    @Primary
    public DataSource dataSource(DataSourceProperties properties, Environment env) {
        String customUrl = env.getProperty("DATABASE_URL");
        if (customUrl == null || customUrl.isBlank()) {
            customUrl = env.getProperty("MYSQL_URL");
        }

        String host = env.getProperty("DB_HOST", "localhost");
        int port = Integer.parseInt(env.getProperty("DB_PORT", "3306"));
        String dbName = env.getProperty("DB_NAME", "clinicflow");
        String username = properties.getUsername() != null && !properties.getUsername().isBlank()
                ? properties.getUsername()
                : env.getProperty("DB_USER", "root");
        String password = properties.getPassword() != null && !properties.getPassword().isBlank()
                ? properties.getPassword()
                : env.getProperty("DB_PASSWORD", "");
        boolean useSsl = Boolean.parseBoolean(env.getProperty("DB_SSL", "false"));

        if (customUrl != null && (customUrl.startsWith("mysql://") || customUrl.startsWith("mariadb://"))) {
            try {
                URI uri = new URI(customUrl);
                host = uri.getHost();
                port = uri.getPort() == -1 ? 3306 : uri.getPort();
                String path = uri.getPath();
                dbName = (path != null && path.length() > 1) ? path.substring(1) : "clinicflow";

                String userInfo = uri.getUserInfo();
                if (userInfo != null && userInfo.contains(":")) {
                    String[] parts = userInfo.split(":", 2);
                    username = parts[0];
                    password = parts[1];
                }
            } catch (Exception ex) {
                log.warn("Failed to parse DATABASE_URL/MYSQL_URL, using default properties", ex);
            }
        }

        // 1. Proactively attempt to create the database if it does not exist
        ensureDatabaseExists(host, port, dbName, username, password, useSsl);

        // 2. Build HikariDataSource with createDatabaseIfNotExist=true and proper SSL
        String sslParam = "useSSL=" + useSsl;
        String jdbcUrl = "jdbc:mysql://" + host + ":" + port + "/" + dbName
                + "?createDatabaseIfNotExist=true&" + sslParam
                + "&allowPublicKeyRetrieval=true&characterEncoding=utf8&connectionTimeZone=LOCAL";

        HikariConfig config = new HikariConfig();
        config.setJdbcUrl(jdbcUrl);
        config.setUsername(username);
        config.setPassword(password);
        config.setMaximumPoolSize(10);
        log.info("Configured DataSource for database '{}' on {}:{}", dbName, host, port);
        return new HikariDataSource(config);
    }

    private void ensureDatabaseExists(String host, int port, String dbName, String username, String password, boolean useSsl) {
        if (dbName == null || dbName.isBlank() || "mysql".equalsIgnoreCase(dbName) || "sys".equalsIgnoreCase(dbName)) {
            return;
        }
        String serverUrl = "jdbc:mysql://" + host + ":" + port + "/?useSSL=" + useSsl
                + "&allowPublicKeyRetrieval=true&characterEncoding=utf8&connectionTimeZone=LOCAL";
        try (Connection conn = DriverManager.getConnection(serverUrl, username, password);
             Statement stmt = conn.createStatement()) {
            stmt.executeUpdate("CREATE DATABASE IF NOT EXISTS `" + dbName + "` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci");
            log.info("Successfully verified/created database '{}' on {}:{}", dbName, host, port);
        } catch (Exception e) {
            log.info("Direct server CREATE DATABASE attempt note (createDatabaseIfNotExist parameter will also apply): {}", e.getMessage());
        }
    }
}
