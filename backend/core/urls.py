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
    path("rooms", views.rooms),
    path("rooms/<uuid:room_id>/members", views.room_add_member),
    path("rooms/<uuid:room_id>/expenses/<uuid:expense_id>/dispute", views.expense_dispute),
    path("rooms/<uuid:room_id>/expenses/<uuid:expense_id>", views.expense_detail),
    path("rooms/<uuid:room_id>/expenses", views.room_expenses),
    path("rooms/<uuid:room_id>/balance", views.room_balance),
    path("rooms/<uuid:room_id>/activities", views.room_activities),
    path("rooms/<uuid:room_id>/settlements/full", views.room_settlement_full),
    path("rooms/<uuid:room_id>/settlements/received", views.room_settlement_received),
    path("rooms/<uuid:room_id>/settlements", views.room_settlement),
    path("rooms/<uuid:room_id>", views.room_detail),
    path("adhoc/split", views.adhoc_split),
    path("adhoc/<str:public_id>", views.adhoc_get),
    path("receipts/mock-parse", views.mock_parse_receipt),
]
