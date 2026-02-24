"""Application configuration from environment."""
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_prefix="", env_file=".env", extra="ignore")

    table_name: str = ""
    api_base_path: str = "/api/v1"
    cors_origins: str = "*"
    log_level: str = "INFO"
    rate_limit_requests: int = 100
    rate_limit_window_sec: int = 60
    razorpay_webhook_secret: str = ""
    razorpay_key_id: str = ""
    razorpay_key_secret: str = ""
    cognito_user_pool_id: str = ""
    super_admin_bypass: bool = False  # When True, allow super-admin routes without group check (dev only)

    def get_cors_origins_list(self) -> list[str]:
        if not self.cors_origins or self.cors_origins == "*":
            return ["*"]
        return [o.strip() for o in self.cors_origins.split(",") if o.strip()]


settings = Settings()
