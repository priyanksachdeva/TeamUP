"""Simple RQ helper to enqueue background jobs.

Usage:
  from tasks_queue import enqueue_task
  enqueue_task('send_email', kwargs={...})

Start a worker in production/dev with:
  rq worker --with-scheduler default

Requires Redis URL in `REDIS_URL` env var (default: redis://localhost:6379)
"""
import os
import logging
from rq import Queue
from redis import Redis

logger = logging.getLogger("tasks_queue")
_redis_client = None


def _redis_conn():
  global _redis_client
  if _redis_client is not None:
    return _redis_client
  url = os.environ.get("REDIS_URL", "redis://localhost:6379")
  try:
    _redis_client = Redis.from_url(url)
    return _redis_client
  except Exception:
    logger.exception("Failed to create Redis connection")
    raise


def enqueue_task(func_name: str, kwargs: dict = None, queue_name: str = "default"):
    """Enqueue a task by callable path `module.func` or registered function name.

    This project uses simple string-based enqueueing; the worker environment should import
    the same modules so the function name resolves.
    """
    if kwargs is None:
        kwargs = {}
    try:
      conn = _redis_conn()
      q = Queue(queue_name, connection=conn)
      # Use enqueuing by string name; worker must import actual functions and provide them to registry
      job = q.enqueue_call(func=func_name, kwargs=kwargs, result_ttl=3600)
      logger.info("Enqueued job %s id=%s", func_name, job.id)
      return job
    except Exception:
      logger.exception("Failed to enqueue task func_name=%s queue_name=%s kwargs=%s", func_name, queue_name, kwargs)
      return None
