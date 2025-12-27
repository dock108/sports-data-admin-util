"""
Centralized structlog configuration for the bets scraper service.

Provides JSON-formatted logs consistent with other dock108 services.
Logs include environment context for better filtering in production.
"""

from __future__ import annotations

import structlog

from .config import settings


def configure_logging() -> None:
    """
    Configure structlog with JSON output.
    
    Uses the same processor chain as the API service for consistency.
    All logs are output as JSON to stdout for easy aggregation.
    """
    structlog.configure(
        processors=[
            structlog.processors.TimeStamper(fmt="iso"),  # ISO 8601 timestamps
            structlog.processors.add_log_level,
            structlog.processors.StackInfoRenderer(),
            structlog.processors.format_exc_info,  # Exception formatting
            structlog.processors.JSONRenderer(),  # JSON output
        ],
        wrapper_class=structlog.make_filtering_bound_logger(10),  # DEBUG level for troubleshooting
        context_class=dict,
        logger_factory=structlog.PrintLoggerFactory(),
    )


# Configure logging at module import time
configure_logging()

# Global logger instance with service context
logger = structlog.get_logger("bets-scraper", environment=settings.environment)

