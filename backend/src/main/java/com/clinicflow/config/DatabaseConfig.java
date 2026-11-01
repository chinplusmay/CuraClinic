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

        if (customUrl != null && (customUrl.startsWith("mysql://") || customUrl.startsWith("mariadb://"))) {
            try {
                URI uri = new URI(customUrl);
                String host = uri.getHost();
                int port = uri.getPort() == -1 ? 3306 : uri.getPort();
                String path = uri.getPath();
                String dbName = (path != null && path.length() > 1) ? path.substring(1) : "clinicflow";

                String userInfo = uri.getUserInfo();
                String username = properties.getUsername();
                String password = properties.getPassword();
                if (userInfo != null && userInfo.contains(":")) {
                    String[] parts = userInfo.split(":", 2);
                    username = parts[0];
                    password = parts[1];
                }

                String sslParam = "useSSL=" + env.getProperty("DB_SSL", "false");
                String jdbcUrl = "jdbc:mysql://" + host + ":" + port + "/" + dbName
                        + "?" + sslParam + "&allowPublicKeyRetrieval=true&characterEncoding=utf8&connectionTimeZone=LOCAL";

                HikariConfig config = new HikariConfig();
                config.setJdbcUrl(jdbcUrl);
                config.setUsername(username);
                config.setPassword(password);
                config.setMaximumPoolSize(10);
                log.info("Configured DataSource from DATABASE_URL/MYSQL_URL: jdbc:mysql://{}:{}/{}", host, port, dbName);
                return new HikariDataSource(config);
            } catch (Exception ex) {
                log.warn("Failed to parse DATABASE_URL/MYSQL_URL, falling back to standard datasource properties", ex);
            }
        }

        return properties.initializeDataSourceBuilder().build();
    }
}

