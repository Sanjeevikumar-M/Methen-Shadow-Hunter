from django.urls import path
from . import views

urlpatterns = [
    path('model/status', views.get_model_status, name='model_status'),
    path('production/status', views.get_production_status, name='production_status'),
    path('forecasts/history', views.get_forecast_history, name='forecast_history'),
    path('forecasts/pending', views.get_forecast_pending, name='forecast_pending'),
    path('forecasts/validated', views.get_forecast_validated, name='forecast_validated'),
    path('forecasts/metrics', views.get_forecast_metrics, name='forecast_metrics'),
    path('forecasts/latest', views.get_forecast_latest, name='forecast_latest'),
    path('forecasts/performance', views.get_forecast_performance, name='forecast_performance'),
    path('forecasts/uncertainty', views.get_forecast_uncertainty, name='forecast_uncertainty'),
    path('forecasts/distribution-shift', views.get_forecast_distribution_shift, name='forecast_distribution_shift'),
    path('predict', views.predict_plume, name='predict_plume'),
]
