"""Celery tasks for triggering scrape runs."""

from __future__ import annotations

from celery import shared_task

from ..logging import logger
from ..models import IngestionConfig
from ..services.run_manager import ScrapeRunManager

manager = ScrapeRunManager()


@shared_task(name="run_scrape_job")
def run_scrape_job(run_id: int, config_payload: dict) -> dict:
    logger.info("scrape_job_started", run_id=run_id)
    config = IngestionConfig(**config_payload)
    result = manager.run(run_id, config)
    logger.info("scrape_job_completed", run_id=run_id, result=result)
    return result


