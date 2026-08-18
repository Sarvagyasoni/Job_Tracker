"""Shared slowapi Limiter instance.

Lives in its own module (not main.py or routers/auth.py) so both can import
it without a circular import: main.py needs it to register the app-level
exception handler, and routers/auth.py needs it to decorate individual
endpoints.
"""

from slowapi import Limiter
from slowapi.util import get_remote_address

limiter = Limiter(key_func=get_remote_address)