"""URL configuration for methane_watcher project."""
from django.urls import path, include

urlpatterns = [
    path("api/", include("plume_api.urls")),
]
