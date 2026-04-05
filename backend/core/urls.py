from django.urls import path

from . import views

urlpatterns = [
    path("health", views.health),
    path("auth/register", views.register),
    path("auth/login", views.login_view),
    path("me", views.me),
    path("me/avatar", views.me_avatar),
    path("i18n", views.i18n_strings),
    path("users/search", views.user_search),
]
