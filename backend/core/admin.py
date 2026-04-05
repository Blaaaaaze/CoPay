from django.contrib import admin
from django.contrib.auth.admin import UserAdmin as BaseUserAdmin

from .models import AdhocCalculation, Expense, Room, User


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


@admin.register(AdhocCalculation)
class AdhocAdmin(admin.ModelAdmin):
    list_display = ("public_id", "payer", "amount", "created_at")
