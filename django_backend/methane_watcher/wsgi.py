"""WSGI config for methane_watcher project."""
import os
from django.core.wsgi import get_wsgi_application

os.environ.setdefault("DJANGO_SETTINGS_MODULE", "methane_watcher.settings")
application = get_wsgi_application()
