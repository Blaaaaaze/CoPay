from django.contrib import admin
from django.contrib.auth.admin import UserAdmin as BaseUserAdmin

from .models import AdhocCalculation, Expense, Room, RoomActivity, Settlement, User


@admin.register(User)
class UserAdmin(BaseUserAdmin):
    ordering = ("username",)
    list_display = ("username", "first_name", "email", "is_staff")


@admin.register(Room)
class RoomAdmin(admin.ModelAdmin):
    list_display = ("name", "created_by", "id")


@admin.register(Expense)
class ExpenseAdmin(admin.ModelAdmin):
    list_display = ("title", "amount", "room", "payer")


@admin.register(Settlement)
class SettlementAdmin(admin.ModelAdmin):
    list_display = ("room", "from_user", "to_user", "amount", "created_at")


@admin.register(RoomActivity)
class RoomActivityAdmin(admin.ModelAdmin):
    list_display = ("room", "kind", "actor", "created_at")


@admin.register(AdhocCalculation)
class AdhocAdmin(admin.ModelAdmin):
    list_display = ("public_id", "payer", "amount", "created_at")
